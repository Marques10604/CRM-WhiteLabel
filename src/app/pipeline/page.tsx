import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { campanhas, leads, motivosPerda, nichos, templates } from "@/db/schema";
import {
  computeSequenciaSugestao,
  getConfiguracoes,
  getUltimaInteracaoWhatsAppPorLead,
} from "@/db/queries";
import { buildLimitesPorEtapa, computeTemperaturaPorLead } from "@/lib/lead-temperatura";
import { PipelineBoard } from "@/components/pipeline-board";

/**
 * Rota `/pipeline` (PIPE-01) — board somente-leitura nesta fase (03-02); o
 * drag-and-drop entra em 03-03. Busca leads ativos NÃO-filtrados (D-12) e
 * computa server-side a temperatura de cada lead (quick task 260912-omq,
 * TEMP-01/02/03) a partir dos limites de dias-parado por etapa configurados
 * em `/configuracoes` (CONFIG-02): cada etapa Novo/Contatado/Negociação tem
 * seu próprio N, lido de `getConfiguracoes()`. O antigo conjunto booleano
 * "esfriando" virou classificação de 3 faixas (Quente/Morno/Frio) — a regra
 * de exclusão de `fechado`/`perdido` e de `stageChangedAt` nulo agora mora
 * em `buildLimitesPorEtapa`/`computeTemperatura` (`@/lib/lead-temperatura`,
 * fonte única compartilhada com `/leads`), e a faixa "frio" é exatamente o
 * antigo "esfriando" (mesma condição `dias >= limite`). `templates` alimenta
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
    allNichos,
    allMotivosPerda,
    allTemplates,
    allCampanhas,
    config,
    ultimaInteracaoPorLead,
  ] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(nichos),
    db.select().from(motivosPerda),
    db.select().from(templates),
    // Sem filtro de deletedAt (mesmo motivo de nichos/motivosPerda) — mapa
    // id→rótulo; o filtro de seleção mora no <CampanhaCombobox>.
    db.select().from(campanhas),
    getConfiguracoes(),
    getUltimaInteracaoWhatsAppPorLead(),
  ]);

  const temperaturaPorLead = computeTemperaturaPorLead(activeLeads, buildLimitesPorEtapa(config));

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
        nichos={allNichos}
        motivosPerda={allMotivosPerda}
        campanhas={allCampanhas}
        temperaturaPorLead={temperaturaPorLead}
        templates={allTemplates}
        sugestaoPorLead={sugestaoPorLead}
      />
    </div>
  );
}
