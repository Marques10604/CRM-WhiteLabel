import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { SubnichoManager } from "@/components/subnicho-manager";

export default async function SubnichosPage() {
  // Esta página existe só para gerenciar/selecionar sub-nichos (não exibe
  // leads), então aqui o filtro de deletedAt é feito no nível da query.
  const items = await db
    .select()
    .from(subnichos)
    .where(isNull(subnichos.deletedAt))
    .orderBy(asc(subnichos.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Sub-nichos</h1>
      <SubnichoManager subnichos={items} />
    </div>
  );
}
