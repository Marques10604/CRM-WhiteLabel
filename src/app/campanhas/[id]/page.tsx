import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { db } from "@/db/client";
import { campanhas, nichos } from "@/db/schema";
import { CampanhaEstadoBadge } from "@/components/campanha-estado-badge";
import { DiagnosticoSecao } from "@/components/diagnostico-secao";

// A Server Action de diagnóstico (plano 23-04) leva de 30 a 90 segundos.
// Localmente `next dev`/`next start` não impõem limite; este valor documenta a
// expectativa e cobre um eventual deploy. `runtime` NÃO é declarado de propósito
// — o default Node é obrigatório (`better-sqlite3` não carrega em edge).
export const maxDuration = 120;

/**
 * Rota de detalhe `/campanhas/[id]` (CAMPANHA-01/02, Fase 22). Layout
 * deliberadamente minimalista — as Fases 23 (diagnóstico de IA) e 24
 * (veredito / painel de resultado) vão ADICIONAR seções a esta mesma página
 * em migrações futuras, sem retrabalhar o que está aqui.
 *
 * Segurança (T-22-07/T-22-08): `id` vem cru da URL — checagem de inteiro
 * positivo antes de qualquer query, e `notFound()` para campanha inexistente
 * OU soft-deletada (deletedAt preenchido).
 */
export default async function CampanhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campanhaId = Number(id);

  if (!Number.isInteger(campanhaId) || campanhaId <= 0) {
    notFound();
  }

  const [row] = await db
    .select({ campanha: campanhas, nichoNome: nichos.nome })
    .from(campanhas)
    .leftJoin(nichos, eq(campanhas.nichoId, nichos.id))
    .where(eq(campanhas.id, campanhaId));

  if (!row || row.campanha.deletedAt) {
    notFound();
  }

  const { campanha, nichoNome } = row;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold leading-tight">
          {(nichoNome ?? "—") + " — " + campanha.oferta}
        </h1>
        <CampanhaEstadoBadge estado={campanha.estado} />
      </div>

      <dl className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Meta de conversão</dt>
          <dd className="text-sm">{campanha.metaConversao}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Janela de tempo</dt>
          <dd className="text-sm">
            {format(campanha.janelaInicio, "dd/MM/yyyy")} até{" "}
            {format(campanha.janelaFim, "dd/MM/yyyy")}
          </dd>
        </div>
      </dl>

      <DiagnosticoSecao campanhaId={campanhaId} />
    </div>
  );
}
