import { and, asc, eq, gte, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { addDays, endOfDay, isBefore, isToday, isValid, parseISO, startOfDay, subDays } from "date-fns";
import { db } from "@/db/client";
import { configuracoes, interacoes, leads, motivosPerda, nichos, tarefas } from "@/db/schema";
import type { Lead, Tarefa } from "@/types";

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
 * Agrupamento puro por urgência (D-02) — GENÉRICO sobre qualquer item que
 * exponha uma data via `getDate`. Sem I/O, `now` injetável para testes.
 *
 * Usa `startOfDay` para normalizar "hoje" e `addDays(today, 8)` como limite
 * superior (EXCLUSIVO) de "Próximos 7 dias", de forma que um item com data em
 * `today + 7` (o 7º dia futuro) ainda seja incluído no grupo. Itens com data
 * 8+ dias no futuro não aparecem em nenhum grupo.
 *
 * `groupLeadsByUrgency` é preservada como wrapper fino (call-sites atuais
 * intocados); `buildDashboardItems` reusa esta função para fundir a régua de
 * urgência de follow-ups de lead e tarefas soltas (D-04).
 */
export function groupByUrgency<T>(
  items: T[],
  getDate: (item: T) => Date,
  now?: Date
): { vencidos: T[]; hoje: T[]; proximos7Dias: T[] } {
  const today = startOfDay(now ?? new Date());
  const in7Days = addDays(today, 8);

  const vencidos: T[] = [];
  const hoje: T[] = [];
  const proximos7Dias: T[] = [];

  for (const item of items) {
    const d = getDate(item);
    if (isBefore(d, today)) {
      vencidos.push(item);
    } else if (isToday(d)) {
      hoje.push(item);
    } else if (isBefore(d, in7Days)) {
      proximos7Dias.push(item);
    }
  }

  return { vencidos, hoje, proximos7Dias };
}

/**
 * Wrapper fino de `groupByUrgency` para leads (D-02) — a assinatura pública e
 * o tipo `LeadsByUrgency` permanecem intocados para não quebrar nenhum
 * call-site existente.
 */
export function groupLeadsByUrgency(activeLeads: Lead[], now?: Date): LeadsByUrgency {
  return groupByUrgency(activeLeads, (lead) => lead.followUpDate, now);
}

/**
 * Tarefas pendentes para o dashboard de follow-up (TAREFA-02, D-02) — o
 * filtro `concluida_em IS NULL` implementa "tarefa concluída some do
 * dashboard na hora". Encapsulado aqui (e não inline em `src/app/page.tsx`)
 * pelo mesmo motivo já documentado em `getActiveDashboardLeads`: não vazar
 * SQL para a página nem deixar o escopo divergir entre superfícies.
 */
export async function getTarefasPendentes(): Promise<Tarefa[]> {
  return db
    .select()
    .from(tarefas)
    .where(isNull(tarefas.concluidaEm))
    .orderBy(asc(tarefas.data));
}

/**
 * Item unificado do dashboard de follow-up (D-04) — união discriminada por
 * `kind`, com `date` já normalizado, para intercalar follow-ups de lead e
 * tarefas soltas por ordem cronológica DENTRO de cada seção de urgência.
 */
export type DashboardItem =
  | { kind: "lead"; date: Date; lead: Lead }
  | { kind: "tarefa"; date: Date; tarefa: Tarefa };

export type DashboardItemsByUrgency = {
  vencidos: DashboardItem[];
  hoje: DashboardItem[];
  proximos7Dias: DashboardItem[];
};

/**
 * Funde leads ativos + tarefas pendentes numa única lista de `DashboardItem`,
 * bucketiza pela MESMA régua de urgência (`groupByUrgency`) e ordena CADA
 * bucket por `date` ascendente. É essa ordenação que materializa D-04:
 * tarefas e follow-ups aparecem intercalados por data, nunca em blocos
 * separados. Função PURA — sem I/O, `now` injetável.
 */
export function buildDashboardItems(
  activeLeads: Lead[],
  tarefasPendentes: Tarefa[],
  now?: Date
): DashboardItemsByUrgency {
  const items: DashboardItem[] = [
    ...activeLeads.map(
      (lead): DashboardItem => ({ kind: "lead", date: lead.followUpDate, lead })
    ),
    ...tarefasPendentes.map(
      (tarefa): DashboardItem => ({ kind: "tarefa", date: tarefa.data, tarefa })
    ),
  ];

  const grouped = groupByUrgency(items, (item) => item.date, now);
  const byDateAsc = (a: DashboardItem, b: DashboardItem) =>
    a.date.getTime() - b.date.getTime();

  return {
    vencidos: [...grouped.vencidos].sort(byDateAsc),
    hoje: [...grouped.hoje].sort(byDateAsc),
    proximos7Dias: [...grouped.proximos7Dias].sort(byDateAsc),
  };
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
 * Forma de retorno de `resolvePeriodoRelatorios` — o preset resolvido (para o
 * `value` do `<PeriodoSelector>`), o `PeriodRange` concreto (para as 3
 * agregações), a flag de "o intervalo custom foi rejeitado" (para a faixa de
 * aviso da página, D-07) e — só quando `preset === "custom"` e válido — as
 * strings `from`/`to` originais `yyyy-MM-dd` (o 14-02 pré-preenche os date
 * pickers com elas).
 */
export type PeriodoRelatoriosResolvido = {
  preset: "30d" | "90d" | "tudo" | "custom";
  range: PeriodRange;
  customInvalido: boolean;
  from?: string;
  to?: string;
};

/** Guarda de formato ISO `yyyy-MM-dd` — 1ª barreira antes de `parseISO`/`isValid`. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve o período da tela `/relatorios` a partir dos 3 parâmetros CRUS da
 * querystring (`period`, `from`, `to`) — função PURA, sem I/O, `now` injetável,
 * **NUNCA lança** (nenhum caminho joga exceção, nenhum gera 500).
 *
 * Os três parâmetros vêm de `searchParams` — território não-confiável: podem ser
 * `undefined`, strings adulteradas, payloads de SQLi, datas absurdas. `from`/`to`
 * são guardados por regex `^\d{4}-\d{2}-\d{2}$` + `isValid` e convertidos para
 * `Date` AQUI, antes de virarem parâmetro `?` do Drizzle (`gte`/`lte`) nas 3
 * agregações — nunca interpolados em SQL (mitigação de T-14-01 SQLi / T-14-02
 * DoS, herdando o modelo de `resolvePeriodRange` para `period`, T-11-19/T-11-20).
 *
 * `customInvalido` distingue DOIS cenários que caem no mesmo fallback `30d`:
 *   • `true`  → o usuário PEDIU `period=custom` e errou as datas (fim antes do
 *     início, só uma data, data ilegível/impossível). A página mostra a faixa de
 *     aviso server-rendered (D-04/D-05/D-07).
 *   • `false` com `period` adulterado (ex: `"'; DROP"`) → fallback SILENCIOSO
 *     para `"tudo"`, idêntico ao que a página já fazia hoje (T-11-19). Sem faixa.
 *
 * Datas no FUTURO NÃO invalidam (D-06): são APARADAS para hoje
 * (`from` futuro → `startOfDay(now)`, `to` futuro → `endOfDay(now)`). Se depois
 * de aparar `start > end`, aí sim cai no fallback `30d` + `customInvalido: true`.
 *
 * `from` = `startOfDay` / `to` = `endOfDay` (D-09/D-10 — o intervalo inclui o
 * dia inteiro das duas pontas), sempre via `date-fns`, nunca aritmética de ms.
 */
export function resolvePeriodoRelatorios(
  params: { period?: string; from?: string; to?: string },
  now: Date = new Date()
): PeriodoRelatoriosResolvido {
  const { period, from, to } = params;

  // 1. `period` ausente → default de primeiro acesso (inalterado da Fase 11)
  if (period === undefined) {
    return { preset: "30d", range: resolvePeriodRange("30d", now), customInvalido: false };
  }

  // 2. presets clássicos → delega para `resolvePeriodRange`
  if (period === "30d" || period === "90d" || period === "tudo") {
    return { preset: period, range: resolvePeriodRange(period, now), customInvalido: false };
  }

  // 3. intervalo personalizado
  if (period === "custom") {
    const fallback30: PeriodoRelatoriosResolvido = {
      preset: "30d",
      range: resolvePeriodRange("30d", now),
      customInvalido: true,
    };

    // a. guarda de formato + presença — qualquer falha → fallback (D-05)
    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !ISO_DATE_RE.test(from) ||
      !ISO_DATE_RE.test(to)
    ) {
      return fallback30;
    }

    // parse "à prova de exceção": `parseISO` de string ilegível/impossível
    // devolve Invalid Date (não lança); `isValid` pega isso. O try/catch é
    // barreira extra, não o mecanismo principal.
    let fromDate: Date;
    let toDate: Date;
    try {
      fromDate = startOfDay(parseISO(from));
      toDate = endOfDay(parseISO(to));
    } catch {
      return fallback30;
    }
    if (!isValid(fromDate) || !isValid(toDate)) {
      return fallback30;
    }

    // b. clamp de data futura (D-06) — apara, não invalida
    const inicioHoje = startOfDay(now);
    const fimHoje = endOfDay(now);
    if (fromDate.getTime() > inicioHoje.getTime()) fromDate = inicioHoje;
    if (toDate.getTime() > fimHoje.getTime()) toDate = fimHoje;

    // c. inconsistente mesmo após o clamp (cobre "to antes de from") → fallback
    if (fromDate.getTime() > toDate.getTime()) {
      return fallback30;
    }

    // d. ok — `from`/`to` são as strings ORIGINAIS (não clampadas): o 14-02
    //    pré-preenche o picker com elas; se a data foi clampada, o próximo
    //    submit do picker corrige.
    return {
      preset: "custom",
      range: { start: fromDate, end: toDate },
      customInvalido: false,
      from,
      to,
    };
  }

  // 4. qualquer outro valor de `period` (adulterado) → fallback SILENCIOSO
  //    "tudo", idêntico ao comportamento atual da página. NÃO é `customInvalido`.
  return { preset: "tudo", range: resolvePeriodRange("tudo", now), customInvalido: false };
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
 * diferente de nicho/motivo, que são listas abertas onde o `GROUP BY`
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
// `leads_stage_idx`/`leads_subnicho_id_idx` (nome físico do índice)/`leads_motivo_perda_id_idx` já
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
 * Contagem de leads por nicho, no período (METRICAS-02).
 *
 * Filtro de período por `leads.createdAt` (D-09), igual à seção de origem.
 * Ordenado por total DESC, desempate por nome ASC (11-UI-SPEC.md linha 171).
 *
 * D-12: "A categorizar" NÃO recebe nenhum tratamento especial — é uma linha
 * normal da tabela `nichos` e aparece misturada com os nichos de
 * negócio, ordenada só pela sua contagem. Não há nenhum filtro nem destaque por
 * nome de nicho aqui de propósito.
 *
 * `nichos.deletedAt` NÃO é filtrado: um nicho removido que ainda tem
 * leads históricos precisa continuar aparecendo no relatório (mesmo raciocínio
 * de `nichoExists` em lead-actions.ts).
 */
export async function getContagemPorNicho(
  range: PeriodRange
): Promise<{ nichoId: number; nome: string; total: number }[]> {
  return db
    .select({
      nichoId: leads.nichoId,
      nome: nichos.nome,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .innerJoin(nichos, eq(leads.nichoId, nichos.id))
    .where(
      and(
        isNull(leads.deletedAt),
        gte(leads.createdAt, range.start),
        lte(leads.createdAt, range.end)
      )
    )
    .groupBy(leads.nichoId, nichos.nome)
    .orderBy(sql`count(*) desc`, asc(nichos.nome));
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
 * contando (mesmo raciocínio do `innerJoin` de nicho acima).
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
