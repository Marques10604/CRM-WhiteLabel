"use client";

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

type PipelineLeadCardProps = {
  lead: Lead;
  subnichoNome: string;
  isEsfriando: boolean;
  onClick: () => void;
};

/**
 * Card de lead do board (D-09) — Nome (Body, mais proeminente) + Sub-nicho +
 * data de follow-up (Label). SEM `EtapaBadge` (a etapa já é implícita pela
 * coluna). Quando `isEsfriando`, borda âmbar de 2px + rótulo "Esfriando" com
 * ícone `Clock` (D-08). `onClick` reabre o modal de edição (D-10). Arrastável
 * via `useDraggable` (id = lead.id) — a disambiguação clique-vs-drag vem do
 * `PointerSensor` com `activationConstraint` configurado no board pai
 * (Pitfall 4), não da remoção deste `onClick`.
 */
export function PipelineLeadCard({
  lead,
  subnichoNome,
  isEsfriando,
  onClick,
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
        "flex cursor-pointer flex-col gap-1 rounded-lg bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
        isEsfriando ? "border-2 border-[#F59E0B]" : "border border-zinc-200",
        isDragging ? "z-10 opacity-70" : null
      )}
    >
      <span className="text-[16px] leading-normal font-normal text-foreground">
        {lead.nome}
      </span>
      <span className="text-[14px] leading-normal text-muted-foreground">
        {subnichoNome}
      </span>
      <div className="flex items-center gap-1 text-[14px] leading-normal text-muted-foreground">
        <span>{format(lead.followUpDate, "dd/MM/yyyy")}</span>
        {isEsfriando ? (
          <span className="flex items-center gap-1 text-[#B45309]">
            <Clock className="size-3.5" /> Esfriando
          </span>
        ) : null}
      </div>
    </div>
  );
}
