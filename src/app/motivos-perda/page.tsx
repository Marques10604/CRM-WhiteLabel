import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { motivosPerda } from "@/db/schema";
import { MotivoPerdaManager } from "@/components/motivo-perda-manager";

export default async function MotivosPerdaPage() {
  // Esta página existe só para gerenciar a lista governada de motivos de perda
  // (não exibe leads), então o filtro de deletedAt é feito no nível da query
  // — mesmo idioma de /subnichos.
  const items = await db
    .select()
    .from(motivosPerda)
    .where(isNull(motivosPerda.deletedAt))
    .orderBy(asc(motivosPerda.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Motivos de Perda</h1>
      <MotivoPerdaManager motivosPerda={items} />
    </div>
  );
}
