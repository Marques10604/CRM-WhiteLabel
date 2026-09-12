"use client";

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { CalendarClock, History, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { WhatsAppSendButton } from "@/components/whatsapp-send-button";
import { TemperaturaIndicator } from "@/components/temperatura-indicator";
import type { Temperatura } from "@/lib/lead-temperatura";
import type { Lead } from "@/types";

type PipelineLeadCardProps = {
  lead: Lead;
  nichoNome: string;
  temperatura?: Temperatura;
  sugestao?: Date;
  onClick: () => void;
  onSendWhatsApp: () => void;
  onViewHistory: () => void;
};

/**
 * Card de lead do board (D-09) — Nome (Body, mais proeminente) + Nicho +
 * data de follow-up (Label). SEM `EtapaBadge` (a etapa já é implícita pela
 * coluna). Quando `temperatura === "frio"` (quick task 260912-omq — antigo
 * booleano "esfriando"), borda de 2px + `TemperaturaIndicator` na linha de
 * metadados. `onClick` reabre o modal de edição (D-10). Arrastável via
 * `useDraggable` (id = lead.id) — a disambiguação clique-vs-drag vem do
 * `PointerSensor` com `activationConstraint` configurado no board pai
 * (Pitfall 4), não da remoção deste `onClick`.
 */
export function PipelineLeadCard({
  lead,
  nichoNome,
  temperatura,
  sugestao,
  onClick,
  onSendWhatsApp,
  onViewHistory,
}: PipelineLeadCardProps) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-lg bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        temperatura === "frio" ? "border-2 border-status-danger-foreground" : "border",
        isDragging ? "z-10 opacity-70" : null
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="min-w-0 flex-1 truncate text-[16px] leading-normal font-normal text-foreground"
          title={lead.nome}
        >
          {lead.nome}
        </span>
        {/* stopPropagation em pointerdown/click: impede que os botões virem drag-handle
            (useDraggable listeners no wrapper) ou disparem o onClick de edição do card. */}
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="flex items-center gap-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Ver histórico de ${lead.nome}`}
            title="Ver histórico"
            onClick={onViewHistory}
          >
            <History className="size-4" />
          </Button>
          <WhatsAppSendButton
            nome={lead.nome}
            disabled={normalizePhone(lead.telefone) === null}
            onClick={onSendWhatsApp}
          />
        </div>
      </div>
      <span className="text-[14px] leading-normal text-muted-foreground">
        {nichoNome}
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] leading-normal text-muted-foreground">
        <span>{format(lead.followUpDate, "dd/MM/yyyy")}</span>
        {temperatura ? <TemperaturaIndicator temperatura={temperatura} /> : null}
        {lead.contactAttempts > 0 ? (
          <span
            className="flex items-center gap-1"
            aria-label={`${lead.contactAttempts} tentativas de contato`}
          >
            <MessageCircle className="size-3.5" />
            {lead.contactAttempts}x
          </span>
        ) : null}
        {sugestao ? (
          <span
            className="flex items-center gap-1"
            aria-label={`Próxima reabordagem sugerida em ${format(sugestao, "dd/MM/yyyy")}`}
            title="Sugestão calculada a partir da última interação registrada. Não altera a data de follow-up real — o campo Follow-up continua sendo a fonte oficial."
          >
            <CalendarClock className="size-3.5" />
            Sugestão: {format(sugestao, "dd/MM")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
