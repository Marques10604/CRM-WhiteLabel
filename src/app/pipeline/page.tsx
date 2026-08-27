import { asc, isNull } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "@/db/client";
import { leads, motivosPerda, subnichos, templates } from "@/db/schema";
import {
  computeSequenciaSugestao,
  getConfiguracoes,
  getUltimaInteracaoWhatsAppPorLead,
} from "@/db/queries";
import { PipelineBoard } from "@/components/pipeline-board";

/**
 * Rota `/pipeline` (PIPE-01) — board somente-leitura nesta fase (03-02); o
 * drag-and-drop entra em 03-03. Busca leads ativos NÃO-filtrados (D-12) e
 * computa server-side o conjunto de ids "esfriando" (D-06/D-07) a partir dos
 * limites de dias-parado por etapa configurados em `/configuracoes`
 * (CONFIG-02): cada etapa Novo/Contatado/Negociação tem seu próprio N,
 * lido de `getConfiguracoes()`. Fechado/Perdido ficam de fora do mapa de
 * limites por definição — nunca "esfriam". Leads sem `stageChangedAt`
 * (criados antes de qualquer `updateLeadStage`) nunca são flagados — guard
 * explícito abaixo evita quebrar o cálculo com `null`. `templates` alimenta
 * o botão inline "Enviar WhatsApp" (WA-05) de cada card.
 *
 * SEQ-02/D-05/D-06: a sugestão de próxima reabordagem é derivada aqui, na
 * leitura de cada request — nunca persistida, nunca agendada. Não filtramos
 * `fechado`/`perdido` ao montar `activeLeads` (o board precisa das 5 etapas);
 * o gate de etapa terminal para a sugestão já mora em `computeSequenciaSugestao`
 * (plano 10-01), evitando duas fontes de verdade divergentes.
 */
export default async function PipelinePage() {
  const [
    activeLeads,
    allSubnichos,
    allMotivosPerda,
    allTemplates,
    config,
    ultimaInteracaoPorLead,
  ] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
    db.select().from(motivosPerda),
    db.select().from(templates),
    getConfiguracoes(),
    getUltimaInteracaoWhatsAppPorLead(),
  ]);

  const limitesPorEtapa: Partial<Record<(typeof activeLeads)[number]["stage"], number>> = {
    novo: config.diasParadoNovo,
    contatado: config.diasParadoContatado,
    negociacao: config.diasParadoNegociacao,
    // As duas etapas terminais do funil ficam de fora deste mapa de
    // propósito: sem entrada aqui, `limitesPorEtapa[lead.stage]` resolve
    // para `undefined` e o filtro abaixo nunca as destaca como esfriando.
  };

  const esfriandoLeadIds = activeLeads
    .filter((lead) => {
      const limite = limitesPorEtapa[lead.stage];
      return (
        limite != null &&
        lead.stageChangedAt != null &&
        differenceInDays(new Date(), lead.stageChangedAt) >= limite
      );
    })
    .map((lead) => lead.id);

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
      <h1 className="text-[28px] font-semibold leading-tight">Pipeline</h1>
      <PipelineBoard
        leads={activeLeads}
        subnichos={allSubnichos}
        motivosPerda={allMotivosPerda}
        esfriandoLeadIds={esfriandoLeadIds}
        templates={allTemplates}
        sugestaoPorLead={sugestaoPorLead}
      />
    </div>
  );
}
