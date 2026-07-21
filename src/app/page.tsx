import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { LeadTable } from "@/components/lead-table";

/**
 * Rota raiz `/` (D-14) — lista de leads ativos diretamente, sem tela de
 * boas-vindas separada. Ordenação padrão: follow-up mais próximo primeiro.
 */
export default async function Home() {
  const [activeLeads, allSubnichos] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Leads</h1>
      <LeadTable leads={activeLeads} subnichos={allSubnichos} />
    </div>
  );
}
