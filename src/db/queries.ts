import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { addDays, isBefore, isToday, startOfDay } from "date-fns";
import { db } from "@/db/client";
import { configuracoes, leads } from "@/db/schema";
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
