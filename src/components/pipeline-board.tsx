"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { STAGE_OPTIONS } from "@/components/etapa-badge";
import { PipelineColumn } from "@/components/pipeline-column";
import { PipelineLeadCard } from "@/components/pipeline-lead-card";
import type { Lead, Subnicho } from "@/types";

type PipelineBoardProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  esfriandoLeadIds: number[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

/**
 * Board somente-leitura (03-02) — 5 colunas fixas derivadas de `STAGE_OPTIONS`
 * (fonte única de nomes/ordem das etapas, `etapa-badge.tsx`). Reusa VERBATIM o
 * padrão de dialog-state de `lead-table.tsx` para o clique-abre-modal (D-10).
 * NENHUM `@dnd-kit` nesta fase — apenas render + clique; 03-03 vai envolver
 * este layout de colunas/cards com `DndContext` sem reestruturação.
 */
export function PipelineBoard({ leads, subnichos, esfriandoLeadIds }: PipelineBoardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  const esfriandoSet = useMemo(() => new Set(esfriandoLeadIds), [esfriandoLeadIds]);

  const leadsByStage = useMemo(() => {
    const grouped = new Map<Lead["stage"], Lead[]>();
    for (const option of STAGE_OPTIONS) {
      grouped.set(option.value, []);
    }
    for (const lead of leads) {
      grouped.get(lead.stage)?.push(lead);
    }
    return grouped;
  }, [leads]);

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          onClick={() => setDialogState({ mode: "create" })}
        >
          Novo lead
        </Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8">
        {STAGE_OPTIONS.map((option) => {
          const columnLeads = leadsByStage.get(option.value) ?? [];
          return (
            <PipelineColumn key={option.value} label={option.label} count={columnLeads.length}>
              {columnLeads.map((lead) => (
                <PipelineLeadCard
                  key={lead.id}
                  lead={lead}
                  subnichoNome={subnichoNameById.get(lead.subnichoId) ?? "—"}
                  isEsfriando={esfriandoSet.has(lead.id)}
                  onClick={() => setDialogState({ mode: "edit", lead })}
                />
              ))}
            </PipelineColumn>
          );
        })}
      </div>

      <LeadFormDialog
        key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        subnichos={subnichos}
        lead={dialogLead}
      />
    </div>
  );
}
