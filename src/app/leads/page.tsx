import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { campanhas, leads, motivosPerda, nichos, templates } from "@/db/schema";
import { getConfiguracoes } from "@/db/queries";
import { buildLimitesPorEtapa, computeTemperaturaPorLead } from "@/lib/lead-temperatura";
import { LeadTable } from "@/components/lead-table";

/**
 * Rota `/leads` (D-01) — lista completa de leads ativos, movida da raiz `/`
 * para dar lugar ao dashboard de follow-ups. Comportamento/dados idênticos
 * ao antigo `Home`: ordenação padrão por follow-up mais próximo primeiro.
 * `templates` alimenta o auto-gatilho de preview de 1º contato (WA-04, D-19)
 * disparado pelo `LeadFormDialog` ao criar um lead manualmente aqui.
 *
 * Temperatura (quick task 260912-omq, TEMP-01/02/03): calculada NO SERVIDOR
 * com a MESMA função `computeTemperaturaPorLead` e a MESMA configuração de
 * `/pipeline`, então as duas telas nunca podem divergir — e propositalmente
 * no servidor, para não haver mismatch de hidratação por causa do relógio
 * do cliente.
 */
export default async function LeadsPage() {
  const [activeLeads, allNichos, allMotivosPerda, allTemplates, allCampanhas, config] =
    await Promise.all([
      db
        .select()
        .from(leads)
        .where(isNull(leads.deletedAt))
        .orderBy(asc(leads.followUpDate)),
      // Sem filtro de deletedAt de propósito: este array serve de mapa
      // id -> nome para exibir o nicho de leads antigos (LeadTable), então
      // filtrar removidos aqui quebraria o nome exibido para leads apontando
      // para um nicho removido. O filtro de seleção fica só no combobox e
      // no dropdown da toolbar (quick task 260725-lai).
      db.select().from(nichos),
      // Sem filtro de deletedAt: mesmo motivo do array de nichos acima — o
      // <MotivoPerdaCombobox> precisa poder exibir o motivo de um lead perdido
      // cujo motivo foi removido (filtro `deletedAt === null || id === value`).
      db.select().from(motivosPerda),
      db.select().from(templates),
      // Sem filtro de deletedAt: mesmo motivo dos arrays de nichos/motivosPerda
      // acima — serve de mapa id→rótulo e precisa exibir a campanha de um lead
      // cujo vínculo aponta para uma campanha removida; o filtro de seleção mora
      // no <CampanhaCombobox>.
      db.select().from(campanhas),
      getConfiguracoes(),
    ]);

  const temperaturaPorLead = computeTemperaturaPorLead(activeLeads, buildLimitesPorEtapa(config));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Leads</h1>
      <LeadTable
        leads={activeLeads}
        nichos={allNichos}
        motivosPerda={allMotivosPerda}
        campanhas={allCampanhas}
        templates={allTemplates}
        temperaturaPorLead={temperaturaPorLead}
      />
    </div>
  );
}
