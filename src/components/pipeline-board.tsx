"use client";

import { useMemo, useRef, useState, startTransition, useOptimistic } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { STAGE_OPTIONS } from "@/components/etapa-badge";
import { PipelineColumn } from "@/components/pipeline-column";
import { PipelineLeadCard } from "@/components/pipeline-lead-card";
import { MotivoPerdaDialog } from "@/components/motivo-perda-dialog";
import { WhatsAppPreviewDialog } from "@/components/whatsapp-preview-dialog";
import { updateLeadStage } from "@/actions/lead-actions";
import type { Lead, Subnicho, Template } from "@/types";

type PipelineBoardProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  esfriandoLeadIds: number[];
  templates: Template[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

type MotivoPerdaState =
  | { open: false }
  | { open: true; leadNome: string };

type PreviewState =
  | { open: false }
  | { open: true; lead: Lead; subnichoNome: string };

const STAGE_LABEL_BY_VALUE = new Map(
  STAGE_OPTIONS.map((option) => [option.value, option.label])
);

/**
 * Board com drag-and-drop persistente (03-03, PIPE-02). `DndContext` no
 * root; `PointerSensor` com `activationConstraint: { distance: 8 }` evita
 * que o drag engula o clique-para-editar (Pitfall 4). `useOptimistic` move
 * o card instantaneamente; se `updateLeadStage` falhar, o estado base nunca
 * muda e o React reverte o otimista sozinho ao assentar a transição
 * (RESEARCH.md Pattern 2). Soltar em "Perdido" abre um modal opcional e
 * não-bloqueante de motivo da perda (D-04): o card já se moveu de forma
 * otimista e a mesma transição fica pendente aguardando a decisão do modal
 * (Pular/Salvar motivo) antes de chamar `updateLeadStage` uma única vez.
 */
export function PipelineBoard({ leads, subnichos, esfriandoLeadIds, templates }: PipelineBoardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [motivoPerdaState, setMotivoPerdaState] = useState<MotivoPerdaState>({
    open: false,
  });
  const [previewState, setPreviewState] = useState<PreviewState>({ open: false });
  const motivoResolverRef = useRef<((motivo: string | undefined) => void) | null>(null);

  const [optimisticLeads, setOptimisticStage] = useOptimistic(
    leads,
    (state, { id, stage }: { id: number; stage: Lead["stage"] }) =>
      state.map((lead) => (lead.id === id ? { ...lead, stage } : lead))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
    for (const lead of optimisticLeads) {
      grouped.get(lead.stage)?.push(lead);
    }
    return grouped;
  }, [optimisticLeads]);

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;

  function handleDragEnd(event: DragEndEvent) {
    const leadId = Number(event.active.id);
    const newStage = event.over?.id as Lead["stage"] | undefined;
    if (!newStage) return; // soltou fora de qualquer coluna — no-op

    const lead = optimisticLeads.find((l) => l.id === leadId);

    startTransition(async () => {
      setOptimisticStage({ id: leadId, stage: newStage });

      let motivoPerda: string | undefined;
      if (newStage === "perdido") {
        // Modal opcional/não-bloqueante (D-04): o card já se moveu acima.
        // A transição fica pendente até o admin clicar Pular/Salvar motivo.
        setMotivoPerdaState({ open: true, leadNome: lead?.nome ?? "" });
        motivoPerda = await new Promise<string | undefined>((resolve) => {
          motivoResolverRef.current = resolve;
        });
      }

      const result = await updateLeadStage(leadId, newStage, motivoPerda);
      if (result && "errors" in result) {
        toast.error("Não foi possível mover o lead. Tente novamente.");
        return;
      }
      const label = STAGE_LABEL_BY_VALUE.get(newStage) ?? newStage;
      toast.success(`Lead movido para ${label}.`);
    });
  }

  function resolveMotivoPerda(motivo: string | undefined) {
    setMotivoPerdaState({ open: false });
    motivoResolverRef.current?.(motivo);
    motivoResolverRef.current = null;
  }

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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-8">
          {STAGE_OPTIONS.map((option) => {
            const columnLeads = leadsByStage.get(option.value) ?? [];
            return (
              <PipelineColumn
                key={option.value}
                stage={option.value}
                label={option.label}
                count={columnLeads.length}
              >
                {columnLeads.map((lead) => (
                  <PipelineLeadCard
                    key={lead.id}
                    lead={lead}
                    subnichoNome={subnichoNameById.get(lead.subnichoId) ?? "—"}
                    isEsfriando={esfriandoSet.has(lead.id)}
                    onClick={() => setDialogState({ mode: "edit", lead })}
                    onSendWhatsApp={() =>
                      setPreviewState({
                        open: true,
                        lead,
                        subnichoNome: subnichoNameById.get(lead.subnichoId) ?? "—",
                      })
                    }
                  />
                ))}
              </PipelineColumn>
            );
          })}
        </div>
      </DndContext>

      <LeadFormDialog
        key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        subnichos={subnichos}
        lead={dialogLead}
      />

      <MotivoPerdaDialog
        open={motivoPerdaState.open}
        leadNome={motivoPerdaState.open ? motivoPerdaState.leadNome : ""}
        onOpenChange={(open) => {
          if (!open) resolveMotivoPerda(undefined);
        }}
        onSkip={() => resolveMotivoPerda(undefined)}
        onSave={(motivo) => resolveMotivoPerda(motivo)}
      />

      <WhatsAppPreviewDialog
        open={previewState.open}
        onOpenChange={(open) => {
          if (!open) setPreviewState({ open: false });
        }}
        lead={previewState.open ? previewState.lead : undefined}
        subnichoNome={previewState.open ? previewState.subnichoNome : ""}
        templates={templates}
        defaultTipo="primeiro_contato"
      />
    </div>
  );
}
