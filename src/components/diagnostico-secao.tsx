import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";

import { db } from "@/db/client";
import { diagnosticos } from "@/db/schema";
import { diagnosticoSchema, type Diagnostico } from "@/lib/ai/diagnostico-schema";
import { DiagnosticoResultado } from "@/components/diagnostico-resultado";
import { GerarDiagnosticoButton } from "@/app/campanhas/[id]/_components/gerar-diagnostico-button";

/**
 * Seção "Diagnóstico de IA" da página de detalhe da campanha (Fase 23).
 * Server Component: consulta TODAS as gerações da campanha (ordem `criadoEm`
 * decrescente), decide entre 3 estados e expõe o histórico.
 *
 * DIAGNOSTICO-01: nada é gerado ao renderizar — só o clique no botão dispara.
 * DIAGNOSTICO-10: cada geração (ok OU falhou) é uma linha; o histórico read-only
 * mostra todas, custo à vista. Sem cache.
 *
 * D-23-07: a decisão RESULTADO × ERRO olha SOMENTE `status` (e o `safeParse` do
 * payload). A coluna `aviso` é ressalva de geração válida — viaja como prop para
 * o `DiagnosticoResultado`, nunca entra na condicional de estado.
 *
 * Pitfall 11: o `payload` lido do banco é re-validado com `diagnosticoSchema`
 * antes de renderizar — um payload gravado sob schema antigo cai no bloco de
 * erro em vez de quebrar a página.
 */

type LinhaDiagnostico = typeof diagnosticos.$inferSelect;

const VEREDITO_RESUMO: Record<string, string> = {
  aprofundar: "aprofundar",
  mudar_angulo: "mudar o ângulo",
  abandonar: "abandonar",
};

function resumoVeredito(payload: Diagnostico | null): string {
  const decisao = payload?.veredito_sugerido?.decisao;
  return (decisao && VEREDITO_RESUMO[decisao]) || "ok";
}

function HistoricoDisclosure({
  anteriores,
}: {
  anteriores: LinhaDiagnostico[];
}) {
  if (anteriores.length === 0) return null;
  return (
    <details className="flex flex-col gap-2">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Ver gerações anteriores ({anteriores.length})
      </summary>
      <div className="flex flex-col gap-1 pt-2">
        {anteriores.map((linha) => (
          <span
            key={linha.id}
            className="font-mono text-xs text-muted-foreground"
          >
            {format(linha.criadoEm, "dd/MM/yyyy HH:mm")} ·{" "}
            {linha.status === "falhou"
              ? "falhou"
              : resumoVeredito(linha.payload)}{" "}
            · {linha.fontes?.length ?? 0} fontes · {linha.inputTokens ?? "—"}+
            {linha.outputTokens ?? "—"} tokens
          </span>
        ))}
      </div>
    </details>
  );
}

export async function DiagnosticoSecao({
  campanhaId,
}: {
  campanhaId: number;
}) {
  const linhas = await db
    .select()
    .from(diagnosticos)
    .where(eq(diagnosticos.campanhaId, campanhaId))
    .orderBy(desc(diagnosticos.criadoEm));

  const ultima = linhas[0];
  const anteriores = linhas.slice(1);

  const titulo = (
    <h2 id="diagnostico-secao-titulo" className="text-xl font-semibold">
      Diagnóstico de IA
    </h2>
  );

  // ESTADO VAZIO — nenhuma geração ainda
  if (!ultima) {
    return (
      <section className="flex flex-col gap-4">
        {titulo}
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <h3 className="text-[20px] font-semibold leading-tight">
            Nenhum diagnóstico gerado ainda
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            O diagnóstico pesquisa a web, conta concorrentes diretos, mapeia
            gatilhos de dor e objeções do nicho, estima ticket médio e sugere um
            veredito. Faz buscas reais e custa uma chamada de API — leva de 30 a
            90 segundos.
          </p>
          <GerarDiagnosticoButton
            campanhaId={campanhaId}
            jaExisteDiagnostico={false}
          />
        </div>
      </section>
    );
  }

  const parsed =
    ultima.status === "ok"
      ? diagnosticoSchema.safeParse(ultima.payload)
      : null;

  // ESTADO RESULTADO — status "ok" e payload re-valida
  if (ultima.status === "ok" && parsed?.success) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {titulo}
          <GerarDiagnosticoButton campanhaId={campanhaId} jaExisteDiagnostico />
        </div>
        <DiagnosticoResultado
          diagnostico={parsed.data}
          fontes={ultima.fontes ?? []}
          criadoEm={ultima.criadoEm}
          inputTokens={ultima.inputTokens}
          outputTokens={ultima.outputTokens}
          buscas={ultima.buscas}
          aviso={ultima.aviso}
        />
        <HistoricoDisclosure anteriores={anteriores} />
      </section>
    );
  }

  // ESTADO ERRO — status "falhou" OU payload que não re-valida
  const motivo =
    ultima.status === "falhou"
      ? (ultima.erro ?? "Falha desconhecida.")
      : "O diagnóstico salvo não pôde ser lido (formato antigo). Gere um novo.";

  return (
    <section className="flex flex-col gap-4">
      {titulo}
      <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <h3 className="text-base font-semibold">Diagnóstico não gerado</h3>
        <p className="text-sm">{motivo}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {format(ultima.criadoEm, "dd/MM/yyyy HH:mm")}
        </p>
        <GerarDiagnosticoButton
          campanhaId={campanhaId}
          jaExisteDiagnostico
          rotulo="Tentar de novo"
        />
      </div>
      <HistoricoDisclosure anteriores={anteriores} />
    </section>
  );
}
