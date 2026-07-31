import { asc, isNull } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "@/db/client";
import { leads, subnichos, templates } from "@/db/schema";
import { getConfiguracoes } from "@/db/queries";
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
 */
export default async function PipelinePage() {
  const [activeLeads, allSubnichos, allTemplates, config] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
    db.select().from(templates),
    getConfiguracoes(),
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Pipeline</h1>
      <PipelineBoard
        leads={activeLeads}
        subnichos={allSubnichos}
        esfriandoLeadIds={esfriandoLeadIds}
        templates={allTemplates}
      />
    </div>
  );
}
