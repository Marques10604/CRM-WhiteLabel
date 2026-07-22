import { db } from "@/db/client";
import { subnichos, templates } from "@/db/schema";
import { getActiveDashboardLeads, groupLeadsByUrgency } from "@/db/queries";
import { FollowupDashboard } from "@/components/followup-dashboard";

/**
 * Rota raiz `/` (REMIND-01, D-01/D-02/D-03) — dashboard de follow-ups
 * agrupado por urgência (Vencidos/Hoje/Próximos 7 dias), sem filtro manual.
 * A lista completa de leads foi movida para `/leads`. Agrupamento é
 * computado no servidor via `groupLeadsByUrgency` (função pura, testável).
 * `templates` alimenta o botão inline "Enviar WhatsApp" (WA-05) — modal de
 * preview com tipo pré-selecionado "Follow-up" (D-15).
 */
export default async function Home() {
  const [activeLeads, allSubnichos, allTemplates] = await Promise.all([
    getActiveDashboardLeads(),
    db.select().from(subnichos),
    db.select().from(templates),
  ]);

  const { vencidos, hoje, proximos7Dias } = groupLeadsByUrgency(activeLeads);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Follow-ups</h1>
      <FollowupDashboard
        vencidos={vencidos}
        hoje={hoje}
        proximos7Dias={proximos7Dias}
        subnichos={allSubnichos}
        templates={allTemplates}
      />
    </div>
  );
}
