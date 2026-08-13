import { db } from "@/db/client";
import { subnichos, templates } from "@/db/schema";
import {
  computeSequenciaSugestao,
  getActiveDashboardLeads,
  getConfiguracoes,
  getUltimaInteracaoWhatsAppPorLead,
  groupLeadsByUrgency,
} from "@/db/queries";
import { FollowupDashboard } from "@/components/followup-dashboard";

/**
 * Rota raiz `/` (REMIND-01, D-01/D-02/D-03) — dashboard de follow-ups
 * agrupado por urgência (Vencidos/Hoje/Próximos 7 dias), sem filtro manual.
 * A lista completa de leads foi movida para `/leads`. Agrupamento é
 * computado no servidor via `groupLeadsByUrgency` (função pura, testável).
 * `templates` alimenta o botão inline "Enviar WhatsApp" (WA-05) — modal de
 * preview com tipo pré-selecionado "Follow-up" (D-15).
 *
 * SEQ-02/D-05/D-06: a sugestão de próxima reabordagem é derivada aqui, na
 * leitura de cada request — nunca persistida, nunca agendada. Ela acompanha
 * `followUpDate` como indicador informativo, sem jamais sobrescrevê-lo.
 */
export default async function Home() {
  const [activeLeads, allSubnichos, allTemplates, config, ultimaInteracaoPorLead] =
    await Promise.all([
      getActiveDashboardLeads(),
      db.select().from(subnichos),
      db.select().from(templates),
      getConfiguracoes(),
      getUltimaInteracaoWhatsAppPorLead(),
    ]);

  const { vencidos, hoje, proximos7Dias } = groupLeadsByUrgency(activeLeads);

  const sugestaoPorLead = activeLeads
    .map((lead) => ({
      leadId: lead.id,
      data: computeSequenciaSugestao(
        lead,
        ultimaInteracaoPorLead.get(lead.id),
        config.sequenciaIntervalosDias
      ),
    }))
    .filter((s): s is { leadId: number; data: Date } => s.data !== undefined);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Follow-ups</h1>
      <FollowupDashboard
        vencidos={vencidos}
        hoje={hoje}
        proximos7Dias={proximos7Dias}
        subnichos={allSubnichos}
        templates={allTemplates}
        sugestaoPorLead={sugestaoPorLead}
      />
    </div>
  );
}
