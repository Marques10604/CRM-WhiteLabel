import { desc, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { LixeiraTable } from "@/components/lixeira-table";

/**
 * Rota `/lixeira` (D-17) — lista leads soft-deletados (`isNotNull(deletedAt)`),
 * ordenados por data de exclusão mais recente primeiro (excluído mais
 * recentemente no topo). Única ação disponível é Restaurar (instantâneo, sem
 * confirmação) — sem edição/exclusão nesta tela, ver `lixeira-table.tsx`.
 */
export default async function LixeiraPage() {
  const [deletedLeads, allSubnichos] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNotNull(leads.deletedAt))
      .orderBy(desc(leads.deletedAt)),
    db.select().from(subnichos),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">Lixeira</h1>
      <LixeiraTable leads={deletedLeads} subnichos={allSubnichos} />
    </div>
  );
}
