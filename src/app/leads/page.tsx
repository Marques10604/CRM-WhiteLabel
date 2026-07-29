import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos, templates } from "@/db/schema";
import { LeadTable } from "@/components/lead-table";

/**
 * Rota `/leads` (D-01) — lista completa de leads ativos, movida da raiz `/`
 * para dar lugar ao dashboard de follow-ups. Comportamento/dados idênticos
 * ao antigo `Home`: ordenação padrão por follow-up mais próximo primeiro.
 * `templates` alimenta o auto-gatilho de preview de 1º contato (WA-04, D-19)
 * disparado pelo `LeadFormDialog` ao criar um lead manualmente aqui.
 */
export default async function LeadsPage() {
  const [activeLeads, allSubnichos, allTemplates] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    // Sem filtro de deletedAt de propósito: este array serve de mapa
    // id -> nome para exibir o sub-nicho de leads antigos (LeadTable), então
    // filtrar removidos aqui quebraria o nome exibido para leads apontando
    // para um sub-nicho removido. O filtro de seleção fica só no combobox e
    // no dropdown da toolbar (quick task 260725-lai).
    db.select().from(subnichos),
    db.select().from(templates),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Leads</h1>
      <LeadTable leads={activeLeads} subnichos={allSubnichos} templates={allTemplates} />
    </div>
  );
}
