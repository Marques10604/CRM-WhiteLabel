"use server";

/**
 * Convenção LEAD-04: nenhum código em src/ ou scripts/ pode fazer hard-delete
 * de leads/subnichos (chamar o delete() do Drizzle direto nessas tabelas) e
 * nenhuma migração pode conter DELETE FROM/DROP TABLE — exclusão é sempre
 * soft-delete (deletedAt). Verificar com `npm run guard:no-hard-delete`.
 */

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { interacoes, leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema, whatsappContactSchema } from "@/lib/validations";
import type { Lead, Template } from "@/types";

type ActionState =
  | { success: true; lead?: Lead }
  | { errors: Record<string, string[] | undefined> }
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
 * Checagem de existência real do subnichoId no banco — cobre sub-nicho
 * apagado/id forjado que passaria pela validação de forma (inteiro positivo)
 * do Zod, mas não existe de fato.
 *
 * Propositalmente indiferente a `deletedAt` (soft-delete de sub-nicho,
 * quick task 260725-lai): se filtrasse por `isNull(deletedAt)`, editar e
 * salvar um lead cujo sub-nicho foi removido passaria a falhar com
 * "Selecione um sub-nicho.", mesmo sem o usuário trocar nada no formulário.
 */
async function subnichoExists(subnichoId: number): Promise<boolean> {
  const existing = await db
    .select({ id: subnichos.id })
    .from(subnichos)
    .where(eq(subnichos.id, subnichoId));
  return existing.length > 0;
}

export async function createLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await subnichoExists(parsed.data.subnichoId))) {
    return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
  }

  let inserted: Lead;
  try {
    // Stampa stageChangedAt na criação (WR-01): sem isso, um lead criado
    // diretamente em "contatado" (o form permite escolher a etapa inicial)
    // ficaria com stageChangedAt nulo para sempre, nunca podendo ser
    // sinalizado como "esfriando" até que sua etapa mudasse e voltasse via
    // updateLead/updateLeadStage.
    [inserted] = await db
      .insert(leads)
      .values({ ...parsed.data, stageChangedAt: new Date() })
      .returning();
  } catch (err) {
    // Backstop de FK: sub-nicho apagado ENTRE a pré-checagem acima e este
    // insert (janela de corrida check-then-write). onDelete:"restrict" no
    // schema faz o SQLite lançar SQLITE_CONSTRAINT_FOREIGNKEY nesse caso.
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { success: true, lead: inserted };
}

export async function updateLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await subnichoExists(parsed.data.subnichoId))) {
    return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
  }

  // Guard isNull(deletedAt): impede editar um lead soft-deletado via
  // chamada direta — leads na Lixeira só podem ser restaurados (01-04).
  // SELECT-then-compare (mesmo padrão de updateLeadStage): só grava
  // stageChangedAt quando a etapa submetida pelo dropdown do formulário
  // realmente difere da etapa armazenada — preserva o relógio de
  // "esfriando" em edições que não mexem na etapa (PIPE-03, gap #2).
  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  try {
    await db
      .update(leads)
      .set({
        ...parsed.data,
        // WR-02: quando a etapa submetida não é "perdido", o campo
        // "Motivo da perda" nem chega a ser renderizado no form (some do
        // DOM), então não vem em parsed.data — sem isto, o valor antigo
        // ficaria preso no banco indefinidamente ao reativar um lead.
        motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
        // D-02/D-12 (SEQ-02): reset de sequenciaPosicao para 0 sempre que o
        // DESTINO da edição é "novo" — o ciclo de reabordagem reinicia
        // porque o lead esfriou e voltou ao início do funil, seja por drag
        // no board ou por edição manual da etapa no formulário (a
        // justificativa de produto é o destino, não o mecanismo). Idioma
        // condicional-por-VALOR-ALVO (igual motivoPerda acima), não
        // condicional-por-MUDANÇA (stageChanged, usado por stageChangedAt
        // abaixo): resetar um lead que já está em "novo" é um no-op
        // idempotente e seguro. Posicionado DEPOIS de ...parsed.data para
        // nunca ser sobrescrito por ele. NÃO há reset ao fechar/perder
        // (D-02): fora do funil ativo a posição simplesmente para de ser
        // lida por computeSequenciaSugestao.
        ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}),
        ...(stageChanged ? { stageChangedAt: new Date() } : {}),
      })
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
  } catch (err) {
    // Mesmo backstop de FK do createLead.
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}

/**
 * Mudança de etapa via drag-and-drop no board (03-03, PIPE-02). Chamada
 * diretamente do onDragEnd (função de argumentos posicionais, NÃO
 * (_prevState, formData) — não é ligada a useActionState). Só grava
 * stageChangedAt quando a etapa realmente muda (Pitfall 3 do RESEARCH.md),
 * preservando o relógio de "esfriando" em edições que não mudam a etapa.
 */
export async function updateLeadStage(
  id: number,
  stage: Lead["stage"],
  motivoPerda?: string
): Promise<ActionState> {
  const parsed = stageUpdateSchema.safeParse({ id, stage, motivoPerda });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  await db
    .update(leads)
    .set({
      stage: parsed.data.stage,
      // WR-02: limpa motivoPerda sempre que o destino não é "perdido" —
      // antes só era sobrescrito quando o chamador passava um valor
      // explicitamente, então mover um lead de volta para "Perdido" para
      // outra etapa via drag nunca limpava o motivo antigo.
      motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
      // D-02/D-12 (SEQ-02): mesmo reset de updateLead acima, aplicado ao
      // gesto de arrastar no board — condicional-por-VALOR-ALVO (destino
      // "novo"), não condicional-por-MUDANÇA. Vale tanto para drag quanto
      // para edição manual porque a justificativa de produto é o destino,
      // não o mecanismo. Sem reset ao fechar/perder (D-02).
      ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}),
      ...(stageChanged ? { stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));

  revalidatePath("/pipeline");
  revalidatePath("/");
  return { success: true };
}

/**
 * Registra um clique real em "Abrir WhatsApp" (WA-08) e, condicionalmente,
 * avança a etapa novo → contatado (WA-06/WA-07). Função dedicada — não uma
 * extensão de updateLeadStage — porque essa recebe uma etapa-alvo explícita
 * do chamador e carrega semântica de motivoPerda amarrada a movimentos
 * arbitrários, enquanto este avanço é estritamente unidirecional e
 * condicional, com a guarda pertencendo ao servidor.
 *
 * Retorna { advanced } em vez de ActionState porque o chamador é
 * fire-and-forget (a aba do WhatsApp já abriu antes da resposta chegar) e só
 * precisa saber se deve exibir o toast de auto-avanço — erros nunca são
 * exibidos ao admin nesse fluxo.
 *
 * O SELECT fresco abaixo é o que satisfaz SC#4 do ROADMAP: o lead pode ter
 * sido arrastado para outra coluna do board segundos antes deste clique, e a
 * decisão de avançar nunca pode confiar em estado vindo do cliente.
 *
 * Limitação aceita (Pitfall 5 do RESEARCH): esta mutação não participa do
 * useOptimistic/startTransition do board — uma corrida rara entre um drag e
 * um clique quase simultâneos no mesmo lead pode perder uma escrita. O gate
 * de etapa "novo" é reverificado dentro do próprio WHERE da escrita
 * transacional (não só no SELECT anterior) — se um updateLeadStage
 * concorrente mudar o stage entre o SELECT e o UPDATE, o .returning() volta
 * vazio e `advanced` é corrigido para false antes do retorno, então esta
 * função nunca sobrescreve negociacao/fechado/perdido definidos manualmente
 * (WR-01, 09-REVIEW.md).
 *
 * TIMELINE-01: desde a Fase 9, além do contador/avanço, esta função também
 * grava a linha correspondente em `interacoes` — as duas escritas (update de
 * `leads` e insert em `interacoes`) acontecem dentro de `db.transaction()`
 * (mesmo precedente de `applyDefaultTemplate` em `template-actions.ts`,
 * Pitfall 3 do RESEARCH.md) para nunca incrementar o contador sem gravar o
 * evento correspondente na timeline, mesmo sob falha parcial de I/O. O
 * insert é incondicional (irmão do update, fora do `advanced ? {} : {}`) —
 * follow_up e prova_valor também viram linha de timeline, não só
 * primeiro_contato (Pitfall 4 do RESEARCH.md). `texto` agora é obrigatório
 * (`whatsappContactSchema.texto`, D-04): uma caixa de mensagem vazia falha o
 * safeParse e não grava tentativa nem interação, por design.
 *
 * SEQ-02 (D-01): além do avanço de etapa acima, `sequenciaPosicao` avança um
 * degrau só quando `tipo === "follow_up"` — `avancaSequencia` é uma variável
 * DELIBERADAMENTE independente de `advanced`: o auto-avanço de etapa
 * (primeiro contato → "contatado") e o avanço da sequência escalonada
 * (reabordagem programada) são regras diferentes que só por acaso
 * compartilham o mesmo clique. `primeiro_contato` inaugura a relação e não é
 * reabordagem; `prova_valor` é material de apoio, não um degrau da cadência
 * — só `follow_up` avança a posição. O gate Inbound (ORIGEM-03) NÃO mora
 * aqui: é de LEITURA e vive só em `computeSequenciaSugestao` (Pitfall 4 do
 * RESEARCH.md) — incrementar a posição de um lead Inbound aqui é inofensivo
 * porque esse valor nunca é lido para exibição desse tipo de lead.
 */
export async function registerWhatsAppContact(
  leadId: number,
  tipo: Template["tipo"],
  texto: string
): Promise<{ advanced: boolean }> {
  const parsed = whatsappContactSchema.safeParse({ leadId, tipo, texto });
  if (!parsed.success) {
    return { advanced: false };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
  if (!current) {
    return { advanced: false };
  }

  let advanced = parsed.data.tipo === "primeiro_contato" && current.stage === "novo";
  const avancaSequencia = parsed.data.tipo === "follow_up";

  await db.transaction(async (tx) => {
    const stageGuard = advanced ? [eq(leads.stage, "novo")] : [];
    const updated = await tx
      .update(leads)
      .set({
        contactAttempts: sql`${leads.contactAttempts} + 1`,
        ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
        ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
      })
      .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt), ...stageGuard))
      .returning({ id: leads.id });

    if (advanced && updated.length === 0) {
      // Stage mudou concorrentemente (ex.: drag-and-drop) entre o SELECT
      // acima e este UPDATE — a guarda barrou o avanço automático. Registra
      // só a tentativa (sem a mudança de stage), sem sobrescrever o stage
      // manual definido pela corrida. O avanço de sequenciaPosicao é
      // repetido aqui pelo mesmo motivo de contactAttempts já ser repetido:
      // nenhuma tentativa de follow-up pode ser perdida sob corrida (T-10-07).
      advanced = false;
      await tx
        .update(leads)
        .set({
          contactAttempts: sql`${leads.contactAttempts} + 1`,
          ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
        })
        .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
    }

    await tx.insert(interacoes).values({
      leadId: parsed.data.leadId,
      tipo: parsed.data.tipo,
      texto: parsed.data.texto,
    });
  });

  revalidatePath("/");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return { advanced };
}

/**
 * Soft-delete de lead (LEAD-04, D-05) — NUNCA hard-delete na tabela leads. Idempotente:
 * o where restringe a linhas ainda ativas (isNull(deletedAt)), então excluir
 * um lead já excluído é um no-op seguro (não sobrescreve o deletedAt original
 * nem lança erro). Revalida todas as rotas que listam leads ativos (D-14/D-01
 * de 04-04: "/" é o dashboard, "/leads" a lista completa, "/pipeline" o board)
 * mais "/lixeira", onde o lead passa a aparecer.
 */
export async function softDeleteLead(leadId: number): Promise<ActionState> {
  await db
    .update(leads)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/lixeira");
  return { success: true };
}

/**
 * Restaura lead da Lixeira (D-17) — instantâneo, sem confirmação (ação
 * segura/não-destrutiva). Idempotente: o where restringe a linhas na lixeira
 * (isNotNull(deletedAt)), então restaurar um lead já ativo é um no-op seguro.
 */
export async function restoreLead(leadId: number): Promise<ActionState> {
  await db
    .update(leads)
    .set({ deletedAt: null })
    .where(and(eq(leads.id, leadId), isNotNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/lixeira");
  return { success: true };
}
