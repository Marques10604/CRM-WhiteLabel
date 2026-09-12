import { desc, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { campanhas, nichos } from "@/db/schema";
import { getResultadoPorCampanha, getVereditoIAPorCampanha, computeTaxaConversao } from "@/db/queries";
import { MapaDeNichosTable, type MapaLinha } from "@/components/mapa-de-nichos-table";

/**
 * Rota `/mapa-de-nichos` (PAINEL-02/PAINEL-03, Fase 24 plano 04) — a visão
 * consolidada de todas as campanhas já exploradas: nicho, veredito sugerido
 * pela IA (D-24-08: geração `status='ok'` mais recente, sempre revalidada
 * pelo Zod), veredito final do usuário e o resumo do resultado real.
 *
 * Sem parâmetro de busca da URL — o filtro/ordenação vive inteiramente no
 * client (D-24-06, `MapaDeNichosTable`), então a carga do servidor é uma
 * única leitura, sempre a mesma independente da query string.
 *
 * `getResultadoPorCampanha()`/`getVereditoIAPorCampanha()` são chamadas SEM
 * argumento (trazem o mapa inteiro numa consulta só, nunca uma leitura por
 * campanha em sequência) dentro do MESMO `Promise.all` da lista de
 * campanhas/nichos.
 */
export default async function MapaDeNichosPage() {
  const [campanhasAtivas, todosNichos, resultadoPorCampanha, vereditoPorCampanha] =
    await Promise.all([
      db
        .select()
        .from(campanhas)
        .where(isNull(campanhas.deletedAt))
        .orderBy(desc(campanhas.createdAt)),
      db.select().from(nichos),
      getResultadoPorCampanha(),
      getVereditoIAPorCampanha(),
    ]);

  const nichoNomeById = new Map<number, string>();
  for (const nicho of todosNichos) nichoNomeById.set(nicho.id, nicho.nome);

  const linhas: MapaLinha[] = campanhasAtivas.map((campanha) => {
    const resultado = resultadoPorCampanha.get(campanha.id) ?? {
      total: 0,
      fechados: 0,
      perdidos: 0,
      ticketMedioCentavos: null,
    };

    return {
      campanhaId: campanha.id,
      nichoNome: nichoNomeById.get(campanha.nichoId) ?? "—",
      oferta: campanha.oferta,
      estado: campanha.estado,
      vereditoIA: vereditoPorCampanha.get(campanha.id) ?? null,
      vereditoFinal: campanha.vereditoFinal,
      vereditoDecididoEm: campanha.vereditoDecididoEm,
      total: resultado.total,
      fechados: resultado.fechados,
      taxa: computeTaxaConversao({ total: resultado.total, fechados: resultado.fechados }),
      ticketMedioCentavos: resultado.ticketMedioCentavos,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Mapa de Nichos</h1>
      <p className="text-[14px] text-muted-foreground">
        Todas as campanhas de exploração já criadas — o nicho, o veredito sugerido pela IA, o
        veredito final registrado e o resultado real de cada uma.
      </p>
      <MapaDeNichosTable linhas={linhas} />
    </div>
  );
}
