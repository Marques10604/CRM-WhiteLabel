import { differenceInDays } from "date-fns";

/**
 * Classificação PURA de temperatura de um lead em 3 faixas (Quente / Morno /
 * Frio), derivada em tempo de LEITURA de `leads.stageChangedAt` +
 * `configuracoes.diasParado*` — NUNCA persistida (zero coluna nova no banco).
 *
 * Este módulo substitui o booleano "esfriando" que hoje só existe no
 * `/pipeline` (ver `pipeline/page.tsx` pré-fase) por uma escala de 3 faixas
 * consumida IGUALMENTE por `/pipeline` e `/leads` — mesma função, mesmo
 * `LimitesPorEtapa`, garantindo que as duas telas nunca divirjam.
 *
 * Zero DOM, zero React, zero import de `@/db` — só `date-fns`, no mesmo
 * molde de `src/lib/lead-csv-export.ts` (importar de um `.tsx` quebra o
 * harness `.cjs`).
 */

/** Espelho de `Lead["stage"]` — local para não importar de um `.tsx` (quebraria o harness `.cjs`). */
type Stage = "novo" | "contatado" | "negociacao" | "fechado" | "perdido";

export type Temperatura = "quente" | "morno" | "frio";

export type LimitesPorEtapa = Partial<Record<Stage, number>>;

/**
 * Fração do limite de dias-parado a partir da qual o lead deixa de ser
 * "quente" e passa a ser "morno" (fronteira INCLUSIVA em morno). Único
 * número mágico do módulo — o harness `.cjs` asserta em cima dele.
 */
export const LIMIAR_MORNO = 0.5;

/**
 * Monta o mapa de limites por etapa a partir de `configuracoes`. Etapas
 * terminais (`fechado`/`perdido`) ficam de fora do mapa DE PROPÓSITO: sem
 * entrada aqui, `limites[lead.stage]` resolve para `undefined` e
 * `computeTemperatura` retorna `null` para elas — a ausência no mapa (e
 * não um `if` extra) é o que exclui as etapas terminais.
 */
export function buildLimitesPorEtapa(config: {
  diasParadoNovo: number;
  diasParadoContatado: number;
  diasParadoNegociacao: number;
}): LimitesPorEtapa {
  return {
    novo: config.diasParadoNovo,
    contatado: config.diasParadoContatado,
    negociacao: config.diasParadoNegociacao,
  };
}

/**
 * Classifica um único lead em `"quente" | "morno" | "frio" | null`.
 *
 * Ordem exata das guardas (não reordenar — o passo 4 é literalmente a
 * condição do antigo conjunto booleano de leads "esfriando" do `/pipeline`,
 * é isso que garante que a faixa "frio" nunca divirja do comportamento
 * anterior):
 *   1. Sem limite configurado para a etapa (inclui `fechado`/`perdido`) -> null
 *   2. `stageChangedAt` nulo -> null
 *   3. Calcula dias parados na etapa atual
 *   4. `dias >= limite` -> "frio" (paridade com o booleano de "esfriando" de antes)
 *   5. `dias >= limite * LIMIAR_MORNO` -> "morno"
 *   6. Caso contrário -> "quente"
 */
export function computeTemperatura(
  lead: { stage: Stage; stageChangedAt: Date | null },
  limites: LimitesPorEtapa,
  agora: Date = new Date()
): Temperatura | null {
  const limite = limites[lead.stage];
  if (limite == null) return null;
  if (lead.stageChangedAt == null) return null;

  const dias = differenceInDays(agora, lead.stageChangedAt);

  if (dias >= limite) return "frio";
  if (dias >= limite * LIMIAR_MORNO) return "morno";
  return "quente";
}

/**
 * Aplica `computeTemperatura` a uma lista de leads, devolvendo UMA entrada
 * por lead COM temperatura, omitindo os `null` — mesmo idioma do
 * `sugestaoPorLead` já existente em `pipeline/page.tsx`. Genérico em `T`
 * para aceitar tanto `Lead` quanto `LeadRow` sem cast.
 */
export function computeTemperaturaPorLead<
  T extends { id: number; stage: Stage; stageChangedAt: Date | null },
>(
  leads: T[],
  limites: LimitesPorEtapa,
  agora: Date = new Date()
): { leadId: number; temperatura: Temperatura }[] {
  return leads
    .map((lead) => ({ leadId: lead.id, temperatura: computeTemperatura(lead, limites, agora) }))
    .filter(
      (item): item is { leadId: number; temperatura: Temperatura } => item.temperatura !== null
    );
}
