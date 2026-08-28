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
import { LeadTimelineDialog } from "@/components/lead-timeline-dialog";
import { updateLeadStage } from "@/actions/lead-actions";
import type { Lead, MotivoPerda, Subnicho, Template } from "@/types";

type PipelineBoardProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  motivosPerda: MotivoPerda[];
  esfriandoLeadIds: number[];
  templates: Template[];
  sugestaoPorLead: { leadId: number; data: Date }[];
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

/** Estado da timeline de interações (D-03), mesma forma de `PreviewState`. */
type TimelineState = { open: false } | { open: true; lead: Lead };

const STAGE_LABEL_BY_VALUE = new Map(
  STAGE_OPTIONS.map((option) => [option.value, option.label])
);

/**
 * Board com drag-and-drop persistente (03-03, PIPE-02). `DndContext` no
 * root; `PointerSensor` com `activationConstraint: { distance: 8 }` evita
 * que o drag engula o clique-para-editar (Pitfall 4). `useOptimistic` move
 * o card instantaneamente; se `updateLeadStage` falhar, o estado base nunca
 * muda e o React reverte o otimista sozinho ao assentar a transição
 * (RESEARCH.md Pattern 2).
 *
 * Soltar em "Perdido" abre um modal OBRIGATÓRIO de motivo da perda (D-04).
 * O modal NÃO é aberto de dentro de uma transição async: fazer
 * `setMotivoPerdaState({open:true})` dentro de `startTransition(async () =>
 * await new Promise(...))` prende o update na transição suspensa e o modal
 * nunca renderiza — deadlock que congela o renderer (bug do UAT da Fase 11,
 * quick 260828-gna). Em vez disso: o drop para "Perdido" só enfileira o lead
 * e abre o modal com update urgente, SEM mover o card. Só "Salvar motivo"
 * dispara `startTransition(async () => { setOptimisticStage(...);
 * updateLeadStage(id, "perdido", motivoPerdaId) })` — aí o card move (otimista)
 * e persiste numa transição normal. "Cancelar" apenas descarta o item da fila:
 * o card nunca chegou a mover, então não há nada a reverter.
 */
export function PipelineBoard({
  leads,
  subnichos,
  motivosPerda,
  esfriandoLeadIds,
  templates,
  sugestaoPorLead,
}: PipelineBoardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [motivoPerdaState, setMotivoPerdaState] = useState<MotivoPerdaState>({
    open: false,
  });
  const [previewState, setPreviewState] = useState<PreviewState>({ open: false });
  const [timelineState, setTimelineState] = useState<TimelineState>({ open: false });
  // Fila de leads soltos em "Perdido" aguardando motivo (CR-02): se um segundo
  // card é solto em "Perdido" antes do primeiro modal ser resolvido, ele entra
  // na fila; o modal exibe um lead por vez e avança para o próximo pendente ao
  // resolver o atual. Sem função `resolve` — o modal não é mais dirigido por
  // uma Promise dentro de uma transição (ver doc-comment do componente).
  const motivoQueueRef = useRef<{ leadId: number; leadNome: string }[]>([]);

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

  const firstContactTemplate = useMemo(
    () => templates.find((template) => template.tipo === "primeiro_contato" && template.isDefault),
    [templates]
  );

  const esfriandoSet = useMemo(() => new Set(esfriandoLeadIds), [esfriandoLeadIds]);

  const sugestaoPorLeadId = useMemo(() => new Map(sugestaoPorLead.map((s) => [s.leadId, s.data])), [sugestaoPorLead]);

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

  /** Move o card (otimista) e persiste numa transição normal — sem Promise presa. */
  function commitStageChange(
    leadId: number,
    newStage: Lead["stage"],
    motivoPerdaId?: number
  ) {
    startTransition(async () => {
      setOptimisticStage({ id: leadId, stage: newStage });
      const result = await updateLeadStage(leadId, newStage, motivoPerdaId);
      if (result && "errors" in result) {
        toast.error("Não foi possível mover o lead. Tente novamente.");
        return;
      }
      const label = STAGE_LABEL_BY_VALUE.get(newStage) ?? newStage;
      toast.success(`Lead movido para ${label}.`);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const leadId = Number(event.active.id);
    const newStage = event.over?.id as Lead["stage"] | undefined;
    if (!newStage) return; // soltou fora de qualquer coluna — no-op

    const lead = optimisticLeads.find((l) => l.id === leadId);
    if (lead && lead.stage === newStage) return; // soltou na própria coluna — no-op

    if (newStage === "perdido") {
      // Modal OBRIGATÓRIO (D-04). NÃO move o card e NÃO entra numa transição
      // async: só enfileira o lead (CR-02, dedupe por id) e abre o modal com
      // update urgente. O card só se move em `resolveMotivoPerda` ("Salvar").
      if (!motivoQueueRef.current.some((q) => q.leadId === leadId)) {
        motivoQueueRef.current.push({ leadId, leadNome: lead?.nome ?? "" });
      }
      const head = motivoQueueRef.current[0];
      setMotivoPerdaState({ open: true, leadNome: head?.leadNome ?? "" });
      return;
    }

    commitStageChange(leadId, newStage);
  }

  function advanceMotivoQueue() {
    const next = motivoQueueRef.current[0];
    setMotivoPerdaState(
      next ? { open: true, leadNome: next.leadNome } : { open: false }
    );
  }

  /** "Salvar motivo": agora sim move o card para "Perdido" e persiste com o motivo. */
  function resolveMotivoPerda(motivoPerdaId: number) {
    const current = motivoQueueRef.current.shift();
    if (current) {
      commitStageChange(current.leadId, "perdido", motivoPerdaId);
    }
    advanceMotivoQueue();
  }

  /** "Cancelar" / dismiss: descarta o item da fila. O card nunca moveu — nada a reverter. */
  function cancelMotivoPerda() {
    motivoQueueRef.current.shift();
    advanceMotivoQueue();
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
                    sugestao={sugestaoPorLeadId.get(lead.id)}
                    onClick={() => setDialogState({ mode: "edit", lead })}
                    onSendWhatsApp={() =>
                      setPreviewState({
                        open: true,
                        lead,
                        subnichoNome: subnichoNameById.get(lead.subnichoId) ?? "—",
                      })
                    }
                    onViewHistory={() => setTimelineState({ open: true, lead })}
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
        motivosPerda={motivosPerda}
        lead={dialogLead}
        templates={templates}
        firstContactTemplate={firstContactTemplate}
      />

      <MotivoPerdaDialog
        open={motivoPerdaState.open}
        leadNome={motivoPerdaState.open ? motivoPerdaState.leadNome : ""}
        motivosPerda={motivosPerda}
        onOpenChange={(open) => {
          if (!open) cancelMotivoPerda();
        }}
        onCancel={cancelMotivoPerda}
        onSave={(motivoPerdaId) => resolveMotivoPerda(motivoPerdaId)}
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

      <LeadTimelineDialog
        open={timelineState.open}
        onOpenChange={(open) => {
          if (!open) setTimelineState({ open: false });
        }}
        lead={timelineState.open ? timelineState.lead : undefined}
      />
    </div>
  );
}
