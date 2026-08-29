"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

type PipelineColumnProps = {
  stage: Lead["stage"];
  label: string;
  count: number;
  children: React.ReactNode;
};

/**
 * Coluna do board (D-11/D-14/D-15) — cabeçalho fixo (`sticky top-0`) com
 * "{label} · {count}" (apenas contagem, sem soma de valor). `flex-1` faz as
 * 5 colunas dividirem a largura disponível e caberem juntas na tela; abaixo
 * de `min-w-[200px]` por coluna o `overflow-x-auto` do board pai volta a
 * rolar horizontalmente (fallback para telas estreitas).
 * Estado vazio: texto muted, sem CTA (diferente da lista, D-13/01-CONTEXT).
 * `useDroppable` (id = stage) torna a coluna um alvo de drop (03-03).
 */
export function PipelineColumn({ stage, label, count, children }: PipelineColumnProps) {
  const hasCards = Boolean(count > 0);
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[200px] flex-1 flex-col gap-2 rounded-lg bg-[#F4F4F5] p-2 transition-colors",
        isOver ? "bg-[#E4E4E7]" : null
      )}
    >
      <div className="sticky top-0 flex items-baseline gap-2 rounded-md bg-[#F4F4F5] px-2 py-2">
        <h2 className="text-[20px] leading-tight font-semibold">{label}</h2>
        <span className="text-[14px] leading-normal text-muted-foreground">
          · {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto px-1 pb-1">
        {hasCards ? (
          children
        ) : (
          <p className="py-12 text-center text-[14px] text-muted-foreground">
            Nenhum lead nessa etapa
          </p>
        )}
      </div>
    </div>
  );
}
