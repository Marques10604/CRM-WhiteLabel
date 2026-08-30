import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { nichos } from "@/db/schema";
import { NichoManager } from "@/components/nicho-manager";

export default async function NichosPage() {
  // Esta página existe só para gerenciar/selecionar nichos (não exibe
  // leads), então aqui o filtro de deletedAt é feito no nível da query.
  const items = await db
    .select()
    .from(nichos)
    .where(isNull(nichos.deletedAt))
    .orderBy(asc(nichos.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Nichos</h1>
      <NichoManager nichos={items} />
    </div>
  );
}
