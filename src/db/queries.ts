import { and, asc, isNull, notInArray } from "drizzle-orm";
import { addDays, isBefore, isToday, startOfDay } from "date-fns";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
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
 * `addDays(today, 7)` como limite superior de "Próximos 7 dias" (exclusivo).
 * Leads com follow-up 8+ dias no futuro não aparecem em nenhum grupo.
 */
export function groupLeadsByUrgency(activeLeads: Lead[], now?: Date): LeadsByUrgency {
  const today = startOfDay(now ?? new Date());
  const in7Days = addDays(today, 7);

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
