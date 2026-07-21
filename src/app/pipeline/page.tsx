import { asc, isNull } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { PipelineBoard } from "@/components/pipeline-board";

/**
 * Rota `/pipeline` (PIPE-01) — board somente-leitura nesta fase (03-02); o
 * drag-and-drop entra em 03-03. Busca leads ativos NÃO-filtrados (D-12) e
 * computa server-side o conjunto de ids "esfriando" (D-06/D-07): leads em
 * `contatado` com 5+ dias desde a última mudança de etapa. Leads sem
 * `stageChangedAt` (criados antes de qualquer `updateLeadStage`) nunca são
 * flagados — guard explícito abaixo evita quebrar o cálculo com `null`.
 */
export default async function PipelinePage() {
  const [activeLeads, allSubnichos] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
  ]);

  const esfriandoLeadIds = activeLeads
    .filter(
      (lead) =>
        lead.stage === "contatado" &&
        lead.stageChangedAt != null &&
        differenceInDays(new Date(), lead.stageChangedAt) >= 5
    )
    .map((lead) => lead.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Pipeline</h1>
      <PipelineBoard
        leads={activeLeads}
        subnichos={allSubnichos}
        esfriandoLeadIds={esfriandoLeadIds}
      />
    </div>
  );
}
