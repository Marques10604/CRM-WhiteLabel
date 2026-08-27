import { and, asc, eq, gte, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { addDays, isBefore, isToday, startOfDay, subDays } from "date-fns";
import { db } from "@/db/client";
import { configuracoes, interacoes, leads, motivosPerda, subnichos } from "@/db/schema";
import type { Lead } from "@/types";

/**
 * Leads ativos para o dashboard de follow-ups (D-04) — exclui soft-deleted
 * (`isNull(leads.deletedAt)`) E etapas terminais (`fechado`/`perdido`).
 * Centralizado aqui (em vez de inline em `src/app/page.tsx`) para evitar que
 * o escopo "ativo" divirja entre o dashboard e futuras queries que precisem
 * do mesmo filtro (ex: pendência `separar-fechado-perdido`).
 */
export async function getActiveDashboardLeads(): Promise<Lead[]> {
  return db
    .select()
    .from(leads)
    .where(and(isNull(leads.deletedAt), notInArray(leads.stage, ["fechado", "perdido"])))
    .orderBy(asc(leads.followUpDate));
}

export type LeadsByUrgency = {
  vencidos: Lead[];
  hoje: Lead[];
  proximos7Dias: Lead[];
};

/**
 * Agrupamento puro por urgência (D-02) — sem I/O, testável isoladamente.
 * `now` é injetável para testes; usa `startOfDay` para normalizar "hoje" e
 * `addDays(today, 8)` como limite superior (exclusivo) de "Próximos 7 dias",
 * de forma que um lead com vencimento em `today + 7` (o 7º dia futuro) ainda
 * seja incluído no grupo. Leads com follow-up 8+ dias no futuro não aparecem
 * em nenhum grupo.
 */
export function groupLeadsByUrgency(activeLeads: Lead[], now?: Date): LeadsByUrgency {
  const today = startOfDay(now ?? new Date());
  const in7Days = addDays(today, 8);

  const vencidos: Lead[] = [];
  const hoje: Lead[] = [];
  const proximos7Dias: Lead[] = [];

  for (const lead of activeLeads) {
    if (isBefore(lead.followUpDate, today)) {
      vencidos.push(lead);
    } else if (isToday(lead.followUpDate)) {
      hoje.push(lead);
    } else if (isBefore(lead.followUpDate, in7Days)) {
      proximos7Dias.push(lead);
    }
  }

  return { vencidos, hoje, proximos7Dias };
}

export type Configuracoes = typeof configuracoes.$inferSelect;

/**
 * getOrCreate da linha singleton `configuracoes` (CONFIG-02/D-04) — seleciona
 * `id=1` e, se ausente, insere a linha padrão. Nenhum valor de dias é
 * hardcoded aqui: os defaults (Novo=999999, Contatado=5, Negociação=999999)
 * vêm inteiramente do schema (`src/db/schema.ts`), garantindo que Contatado
 * mantenha paridade com o hardcode pré-fase e que Novo/Negociação continuem
 * nunca esfriando até o admin salvar valores reais. A semeadura mora aqui —
 * e não em SQL de migração — porque `drizzle-kit push` nunca executa INSERT.
 */
export async function getConfiguracoes(): Promise<Configuracoes> {
  const [existing] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(configuracoes).values({ id: 1 }).returning();
  return created;
}

/**
 * Última interação de WhatsApp por lead (SEQ-02, D-09) — agregação em SQL
 * (`max(created_at) GROUP BY lead_id`), não "buscar tudo e reduzir em JS": a
 * timeline cresce com o histórico total de interações, não com o número de
 * leads ativos, e o índice `interacoes_lead_id_idx` já cobre este `GROUP BY`.
 * `ne(tipo, "nota_manual")` porque D-09 manda usar a última interação de
 * WHATSAPP (primeiro_contato/follow_up/prova_valor) como base do cálculo —
 * uma nota manual não é um contato real. `isNull(deletedAt)` exclui notas
 * manuais soft-deletadas (mesmo filtro já usado em outras leituras da
 * timeline). `* 1000` converte de volta para milissegundos porque
 * `interacoes.createdAt` é gravado em `unixepoch()`, ou seja, SEGUNDOS.
 */
export async function getUltimaInteracaoWhatsAppPorLead(): Promise<Map<number, Date>> {
  const rows = await db
    .select({
      leadId: interacoes.leadId,
      ultima: sql<number>`max(${interacoes.createdAt})`,
    })
    .from(interacoes)
    .where(and(ne(interacoes.tipo, "nota_manual"), isNull(interacoes.deletedAt)))
    .groupBy(interacoes.leadId);

  return new Map(rows.map((r) => [r.leadId, new Date(r.ultima * 1000)]));
}

/**
 * Cálculo puro da próxima data de reabordagem sugerida pela sequência de
 * follow-up escalonada (SEQ-02) — sem I/O, testável isoladamente, mesmo
 * espírito de `groupLeadsByUrgency` acima. A DATA nunca é persistida em
 * lugar nenhum: só o índice `sequenciaPosicao` é (SEQ-02, "cálculo na
 * leitura") — persistir a data faria ela congelar quando o admin editasse os
 * intervalos em `/configuracoes`.
 *
 * Quatro gates, nesta ordem, cada um retornando `undefined` (NUNCA lança
 * exceção, NUNCA loga — "sequência esgotada" é ausência silenciosa, não
 * erro):
 *
 *   a. `origemTipo !== "outbound"` → ORIGEM-03. Este é o ÚNICO ponto do
 *      sistema onde o gate Inbound existe para a sugestão de sequência — não
 *      duplicar em nenhum write-path (Pitfall 4 do 10-RESEARCH.md).
 *   b. `stage` em etapa terminal (`fechado`/`perdido`) → `10-UI-SPEC.md`:
 *      "Nunca mostrado para leads fechados/perdidos". Mora aqui, e não só na
 *      página, para que o board do pipeline (que lista as 5 etapas) não
 *      divirja do dashboard, que já exclui as terminais via
 *      `getActiveDashboardLeads`. Amplia deliberadamente a assinatura
 *      esboçada em 10-RESEARCH.md §Pattern 2 (que tinha só
 *      `origemTipo | sequenciaPosicao`) para incluir `stage` — reforço
 *      exigido pelo contrato de UI já aprovado, não uma divergência
 *      acidental.
 *   c. sem interação-base (`!ultimaInteracaoWhatsApp`) → D-09: sem
 *      interação de WhatsApp registrada não há cálculo possível; nunca usar
 *      `createdAt` do lead nem `followUpDate` como fallback.
 *   d. índice fora dos intervalos configurados
 *      (`intervalosDias[sequenciaPosicao] === undefined`) → D-10: sequência
 *      esgotada, ou o admin encurtou a lista depois que o lead já tinha
 *      avançado — os dois são cenários normais, não erros.
 */
export function computeSequenciaSugestao(
  lead: Pick<Lead, "origemTipo" | "sequenciaPosicao" | "stage">,
  ultimaInteracaoWhatsApp: Date | undefined,
  intervalosDias: number[]
): Date | undefined {
  if (lead.origemTipo !== "outbound") return undefined; // ORIGEM-03
  if (lead.stage === "fechado" || lead.stage === "perdido") return undefined; // 10-UI-SPEC.md: nunca mostrado em etapas terminais
  if (!ultimaInteracaoWhatsApp) return undefined; // D-09
  const intervalo = intervalosDias[lead.sequenciaPosicao];
  if (intervalo === undefined) return undefined; // D-10
  return addDays(ultimaInteracaoWhatsApp, intervalo);
}

// ---------------------------------------------------------------------------
// Painel de Relatórios (METRICAS-01, METRICAS-02, PERDA-01) — funções puras
// ---------------------------------------------------------------------------

/**
 * Intervalo de datas resolvido a partir do preset de período da tela
 * `/relatorios`. `end` é sempre "agora"; `start` recua conforme o preset.
 */
export type PeriodRange = { start: Date; end: Date };

/**
 * Preset de período (querystring `?period=`) → `PeriodRange` concreto —
 * função PURA, sem I/O, no espírito de `computeSequenciaSugestao`.
 *
 * DUAS distinções registradas aqui de propósito:
 *
 *   (1) O parâmetro é `string | undefined`, NÃO um union literal tipado
 *       (`"30d" | "90d" | "tudo"`). O valor vem de `searchParams` — território
 *       não confiável: pode ser `undefined`, `"tudo"`, uma string adulterada na
 *       URL, um payload de SQLi, qualquer coisa. QUALQUER valor fora de
 *       `"30d"`/`"90d"` resolve SILENCIOSAMENTE para
 *       `{ start: new Date(0), end: now }` ("tudo"). A função nunca lança, nunca
 *       gera 500 — é a mitigação de T-11-19 (DoS por valor inválido) e T-11-20
 *       (SQLi via `period`) de 11-RESEARCH.md §Security Domain: o valor jamais é
 *       interpolado em SQL, vira `Date` aqui antes de ser parâmetro do Drizzle.
 *
 *   (2) O DEFAULT de primeiro acesso da UI é `"30d"` (11-UI-SPEC.md linha 162) e
 *       mora no componente `PeriodoSelector`/na página — NÃO aqui. Esta função é
 *       só o fallback de valor inválido, que é `"tudo"` (11-UI-SPEC.md linha
 *       163). Confundir os dois é o erro esperado.
 *
 * `subDays`/`startOfDay` de date-fns evitam os bugs de fuso/horário de verão que
 * aritmética manual de milissegundos introduz.
 */
export function resolvePeriodRange(preset: string | undefined, now = new Date()): PeriodRange {
  if (preset === "90d") return { start: subDays(startOfDay(now), 90), end: now };
  if (preset === "30d") return { start: subDays(startOfDay(now), 30), end: now };
  return { start: new Date(0), end: now }; // "tudo" e QUALQUER valor inválido/adulterado (fallback seguro)
}

/**
 * Taxa de conversão de uma linha de origem (D-06) — `fechados / total`.
 *
 * Retorna `0` EXPLICITAMENTE quando `total === 0` (Pitfall 3 de 11-RESEARCH.md:
 * com os dados reais de hoje a maioria dos grupos tem `total` 0 — é o caso
 * normal, não uma borda rara; `0/0` daria `NaN` e `n/0` daria `Infinity`, os
 * dois renderizariam "NaN%" na tela).
 *
 * O denominador é o TOTAL de leads da origem, incluindo os ainda em aberto —
 * NUNCA `fechados / (fechados + perdidos)` (D-06, decisão explícita).
 */
export function computeTaxaConversao(row: { total: number; fechados: number }): number {
  if (row.total === 0) return 0;
  return row.fechados / row.total;
}

/**
 * Monta as linhas da Seção 1 do relatório (METRICAS-01) a partir do resultado
 * cru do `GROUP BY` por origem — função PURA.
 *
 * SEMPRE devolve exatamente 2 linhas, nesta ordem fixa: `inbound` (label
 * "Inbound"), depois `outbound` (label "Outbound"), preenchendo `total`/`fechados`
 * com 0 quando a origem não aparece no `GROUP BY`, e `taxa` via
 * `computeTaxaConversao`.
 *
 * `origemTipo` é um enum FECHADO de 2 valores (11-UI-SPEC.md linha 167),
 * diferente de sub-nicho/motivo, que são listas abertas onde o `GROUP BY`
 * naturalmente omite grupos vazios. Omitir a linha "Inbound" quando não há
 * nenhum lead inbound esconderia exatamente o dado que o admin mais precisa ver
 * hoje (23/23 leads são Outbound).
 */
export function buildLinhasOrigem(
  rows: { origemTipo: "inbound" | "outbound"; total: number; fechados: number }[]
): { origemTipo: "inbound" | "outbound"; label: string; total: number; fechados: number; taxa: number }[] {
  const ordemFixa = [
    { origemTipo: "inbound" as const, label: "Inbound" },
    { origemTipo: "outbound" as const, label: "Outbound" },
  ];
  return ordemFixa.map(({ origemTipo, label }) => {
    const encontrada = rows.find((r) => r.origemTipo === origemTipo);
    const total = encontrada?.total ?? 0;
    const fechados = encontrada?.fechados ?? 0;
    return { origemTipo, label, total, fechados, taxa: computeTaxaConversao({ total, fechados }) };
  });
}

// ---------------------------------------------------------------------------
// Painel de Relatórios — as três agregações SQL (GROUP BY)
// ---------------------------------------------------------------------------
//
// Todas seguem o padrão de `getUltimaInteracaoWhatsAppPorLead` acima:
// agregação em SQL via `.groupBy()` + `sql<number>`, NUNCA
// `db.select().from(leads)` seguido de `.reduce()` em JS — a base de leads
// cresce com o histórico, não com o número de leads ativos, e os índices
// `leads_stage_idx`/`leads_subnicho_id_idx`/`leads_motivo_perda_id_idx` já
// cobrem estes agrupamentos. Nenhuma delas formata porcentagem nem ordena em
// JS — formatação é responsabilidade da página `/relatorios`.

/**
 * Contagem e fechados por tipo de origem, no período (METRICAS-01).
 *
 * Filtro de período por `leads.createdAt` (D-09 — "quando o lead entrou no
 * funil"). `isNull(leads.deletedAt)` exclui a Lixeira (T-11-21). `fechados` é um
 * `sum(case ...)` no MESMO passo do `count(*)`, não uma segunda query.
 */
export async function getContagemPorOrigem(
  range: PeriodRange
): Promise<{ origemTipo: "inbound" | "outbound"; total: number; fechados: number }[]> {
  return db
    .select({
      origemTipo: leads.origemTipo,
      total: sql<number>`count(*)`,
      fechados: sql<number>`sum(case when ${leads.stage} = 'fechado' then 1 else 0 end)`,
    })
    .from(leads)
    .where(
      and(
        isNull(leads.deletedAt),
        gte(leads.createdAt, range.start),
        lte(leads.createdAt, range.end)
      )
    )
    .groupBy(leads.origemTipo);
}

/**
 * Contagem de leads por sub-nicho, no período (METRICAS-02).
 *
 * Filtro de período por `leads.createdAt` (D-09), igual à seção de origem.
 * Ordenado por total DESC, desempate por nome ASC (11-UI-SPEC.md linha 171).
 *
 * D-12: "A categorizar" NÃO recebe nenhum tratamento especial — é uma linha
 * normal da tabela `subnichos` e aparece misturada com os sub-nichos de
 * negócio, ordenada só pela sua contagem. Não há nenhum filtro nem destaque por
 * nome de sub-nicho aqui de propósito.
 *
 * `subnichos.deletedAt` NÃO é filtrado: um sub-nicho removido que ainda tem
 * leads históricos precisa continuar aparecendo no relatório (mesmo raciocínio
 * de `subnichoExists` em lead-actions.ts).
 */
export async function getContagemPorSubnicho(
  range: PeriodRange
): Promise<{ subnichoId: number; nome: string; total: number }[]> {
  return db
    .select({
      subnichoId: leads.subnichoId,
      nome: subnichos.nome,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .innerJoin(subnichos, eq(leads.subnichoId, subnichos.id))
    .where(
      and(
        isNull(leads.deletedAt),
        gte(leads.createdAt, range.start),
        lte(leads.createdAt, range.end)
      )
    )
    .groupBy(leads.subnichoId, subnichos.nome)
    .orderBy(sql`count(*) desc`, asc(subnichos.nome));
}

/**
 * Contagem de leads PERDIDOS por motivo de perda, no período (PERDA-01).
 *
 * D-11 — COMENTÁRIO-ÂNCORA: esta é a ÚNICA das três agregações que filtra por
 * `leads.stageChangedAt`, NUNCA por `leads.createdAt`. "Motivos de perda dos
 * últimos 30 dias" tem que significar leads que foram MOVIDOS PARA "perdido"
 * nesse período — não leads criados nesse período que por acaso foram perdidos
 * depois (Pitfall 4 de 11-RESEARCH.md). Copiar o filtro `createdAt` das outras
 * duas seções para cá é o erro esperado.
 *
 * Duas consequências DELIBERADAS deste desenho:
 *
 *   (1) Leads perdidos com `stageChangedAt` NULO (anteriores a qualquer
 *       `updateLeadStage`) ficam de fora de TODOS os períodos, inclusive
 *       "tudo" (`NULL >= <qualquer data>` é `NULL`/falso em SQL).
 *
 *   (2) O `innerJoin` exclui leads perdidos SEM `motivoPerdaId` — cenário
 *       impossível para leads perdidos depois de D-04 (motivo obrigatório), e
 *       hoje inexistente (zero leads em `stage='perdido'` no banco real).
 *
 * `isNull(leads.deletedAt)` exclui a Lixeira (T-11-21). Ordenado por total DESC,
 * desempate por nome ASC (11-UI-SPEC.md linha 175). `motivosPerda.deletedAt` NÃO
 * é filtrado — um motivo soft-deletado com leads perdidos históricos continua
 * contando (mesmo raciocínio do `innerJoin` de sub-nicho acima).
 */
export async function getContagemPorMotivoPerda(
  range: PeriodRange
): Promise<{ motivoPerdaId: number | null; nome: string; total: number }[]> {
  return db
    .select({
      motivoPerdaId: leads.motivoPerdaId,
      nome: motivosPerda.nome,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .innerJoin(motivosPerda, eq(leads.motivoPerdaId, motivosPerda.id))
    .where(
      and(
        isNull(leads.deletedAt),
        eq(leads.stage, "perdido"),
        gte(leads.stageChangedAt, range.start),
        lte(leads.stageChangedAt, range.end)
      )
    )
    .groupBy(leads.motivoPerdaId, motivosPerda.nome)
    .orderBy(sql`count(*) desc`, asc(motivosPerda.nome));
}
