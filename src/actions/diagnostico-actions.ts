"use server";

/**
 * Server Action do Diagnóstico de IA da Campanha (DIAGNOSTICO-01/02/10, Fase 23).
 *
 * Molde EXATO de `src/actions/campanha-actions.ts`: cabeçalho `"use server"`,
 * helper `isForeignKeyViolation` DUPLICADO (nunca importado — o projeto duplica
 * esse helper em cada arquivo de actions, precedente aceito), `safeParse` ANTES
 * de qualquer acesso ao banco, guarda de FK forjada via SELECT da entidade +
 * `isForeignKeyViolation` como backstop no `catch` do insert (janela de corrida
 * check-then-write).
 *
 * DIVERGÊNCIA DE SHAPE consciente (D-23-03): retorna
 * `{ success: true; diagnosticoId } | { success: false; erro } | undefined`
 * (um erro operacional único) em vez do `{ errors: Record<string,string[]> }`
 * do projeto — esta action não tem campos editáveis, só um `campanhaId`.
 *
 * SEM CACHE (DIAGNOSTICO-10): nenhuma checagem "já existe diagnóstico pra essa
 * campanha", nenhum SELECT em `diagnosticos` antes de gerar. Cada invocação é
 * uma chamada de API nova e UMA linha nova — inclusive quando falha (a linha
 * `status:"falhou"` é evento visível e persistido no histórico, nunca um
 * resultado parcial). A única leitura anterior à geração é a da própria
 * `campanhas` (guarda de FK forjada).
 *
 * Localização (D-23-02): `src/actions/diagnostico-actions.ts`, NÃO co-locada em
 * `src/app/campanhas/[id]/actions.ts` — consistência com os outros arquivos de
 * actions e com o padrão dos harnesses `test-*-actions.cjs`.
 *
 * A separação `erro` × `aviso` da tabela `diagnosticos` (D-23-07) é honrada
 * aqui: `aviso` recebe a ressalva NÃO-FATAL (`avisoCrossCheck`) de uma geração
 * VÁLIDA; `erro` é exclusiva de falha fatal com `status:"falhou"` e `payload`
 * NULL. Reusar `erro` para os dois casos faria a UI (plano 23-07) renderizar
 * uma geração boa dentro do bloco de erro.
 *
 * A mensagem devolvida ao usuário em caso de falha é `err.message` — nunca
 * stack trace nem conteúdo de `process.env` (mitigação T-23-08).
 */

import { differenceInCalendarDays } from "date-fns";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { campanhas, diagnosticos, nichos } from "@/db/schema";
import { gerarDiagnostico } from "@/lib/ai/gerar-diagnostico";

export type DiagnosticoActionState =
  | { success: true; diagnosticoId: number }
  | { success: false; erro: string }
  | undefined;

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  );
}

/**
 * Schema local de entrada — só `campanhaId`. Mesmo idioma de coerção de
 * `src/lib/validations.ts` (`z.coerce.number().int().positive()`): o valor chega
 * do `FormData` como string e é totalmente controlável pelo cliente (T-23-05).
 */
const entradaSchema = z.object({
  campanhaId: z.coerce.number().int().positive(),
});

export async function gerarDiagnosticoAction(
  _prev: DiagnosticoActionState,
  formData: FormData,
): Promise<DiagnosticoActionState> {
  // 1. Validação ANTES de qualquer acesso ao banco.
  const parsed = entradaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, erro: "Campanha inválida." };
  }
  const { campanhaId } = parsed.data;

  // 2. Guarda de campanha (FK forjada) — SELECT com leftJoin em `nichos` para o
  //    nome do nicho, mesma técnica de `nichoExists` em `campanha-actions.ts` e
  //    o idioma de leftJoin de `campanhas/[id]/page.tsx`.
  const [campanha] = await db
    .select({
      oferta: campanhas.oferta,
      metaConversao: campanhas.metaConversao,
      janelaInicio: campanhas.janelaInicio,
      janelaFim: campanhas.janelaFim,
      deletedAt: campanhas.deletedAt,
      nichoNome: nichos.nome,
    })
    .from(campanhas)
    .leftJoin(nichos, eq(campanhas.nichoId, nichos.id))
    .where(eq(campanhas.id, campanhaId));

  if (!campanha || campanha.deletedAt) {
    return { success: false, erro: "Campanha não encontrada." };
  }

  // 3. Janela em dias derivada das datas da campanha.
  const janelaDias = differenceInCalendarDays(
    campanha.janelaFim,
    campanha.janelaInicio,
  );

  // 4. Geração + persistência. UMA linha por clique, ok OU falhou.
  try {
    const r = await gerarDiagnostico({
      nicho: campanha.nichoNome ?? "",
      oferta: campanha.oferta,
      janelaDias,
      meta: campanha.metaConversao,
    });

    const [inserida] = await db.insert(diagnosticos).values({
      campanhaId,
      payload: r.diagnostico,
      fontes: r.fontes,
      buscas: r.buscas,
      status: "ok",
      erro: null,
      // Ressalva NÃO-FATAL de geração válida → coluna `aviso`, NUNCA `erro`
      // (D-23-07). Objetos JS entram direto — Drizzle serializa (`mode: "json"`).
      aviso: r.avisoCrossCheck ?? null,
      inputTokens: r.uso.inputTokens,
      outputTokens: r.uso.outputTokens,
    }).returning({ id: diagnosticos.id });

    revalidatePath(`/campanhas/${campanhaId}`);
    return { success: true, diagnosticoId: inserida.id };
  } catch (err) {
    // Backstop de FK: campanha apagada ENTRE a pré-checagem e este insert.
    if (isForeignKeyViolation(err)) {
      return { success: false, erro: "Campanha não encontrada." };
    }

    const erro = err instanceof Error ? err.message : "Falha desconhecida.";

    // DIAGNOSTICO-10: a falha também é evento persistido e visível. `payload`
    // fica NULL; `aviso` fica NULL (ressalva é exclusiva de geração válida).
    await db.insert(diagnosticos).values({
      campanhaId,
      status: "falhou",
      erro,
      aviso: null,
    });

    revalidatePath(`/campanhas/${campanhaId}`);
    return { success: false, erro };
  }
}
