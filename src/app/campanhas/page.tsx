import { desc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { campanhas, nichos } from "@/db/schema";
import { getVereditoIAPorCampanha } from "@/db/queries";
import { CampanhaList } from "@/components/campanha-list";

/**
 * Rota `/campanhas` (CAMPANHA-01/04, Fase 22) — lista as campanhas de
 * exploração de nicho ativas e permite criar novas.
 *
 * A lista de nichos vem SEM filtro de `deletedAt` (mesmo idioma de
 * `leads/page.tsx`): serve de mapa id→nome; filtrar removidos aqui quebraria
 * o nome exibido de uma campanha que aponta para um nicho já removido.
 */
export default async function CampanhasPage() {
  const [campanhasAtivas, todosNichos, vereditoIAPorCampanha] = await Promise.all([
    db
      .select()
      .from(campanhas)
      .where(isNull(campanhas.deletedAt))
      .orderBy(desc(campanhas.createdAt)),
    db.select().from(nichos),
    getVereditoIAPorCampanha(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Campanhas</h1>
      <CampanhaList
        campanhas={campanhasAtivas}
        nichos={todosNichos}
        vereditoIAPorCampanha={Object.fromEntries(vereditoIAPorCampanha)}
      />
    </div>
  );
}
