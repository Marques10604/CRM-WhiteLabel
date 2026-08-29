"use client";

import { startTransition } from "react";
import { format } from "date-fns";
import { Circle, CircleCheck, ListTodo } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { concluirTarefa } from "@/actions/tarefa-actions";
import type { Tarefa } from "@/types";

type TarefaCardProps = {
  tarefa: Tarefa;
  /** Cor da data — vem de `section.dateClassName` do dashboard, igual ao follow-up de lead (D-04). */
  dateClassName: string;
  onEdit: (tarefa: Tarefa) => void;
};

/**
 * Card enxuto de tarefa (TAREFA-02, D-03) — MESMO container do card de lead do
 * dashboard de propósito: a distinção vem da SUBTRAÇÃO (sem categoria de lead,
 * sem selo de etapa, sem botão de WhatsApp, sem linha de sugestão de sequência)
 * mais o ícone `ListTodo` à esquerda, nunca de cor/borda/fundo diferente.
 *
 * Clicar no corpo abre a edição (`onEdit`, D-07). O botão-ícone de concluir
 * fica dentro de um wrapper com `stopPropagation` (mesmo idioma do wrapper do
 * botão inline em `followup-dashboard.tsx`) para NÃO abrir o dialog.
 * Conclusão é reversível pelo toast "Desfazer" — sem dialog de confirmação
 * (só a exclusão confirma, D-08).
 */
export function TarefaCard({ tarefa, dateClassName, onEdit }: TarefaCardProps) {
  function handleConcluir() {
    const id = tarefa.id;
    startTransition(() => {
      void concluirTarefa(id);
    });
    toast.success("Tarefa concluída.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          startTransition(() => {
            void concluirTarefa(id, { desfazer: true });
          });
          toast.success("Tarefa reaberta.");
        },
      },
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(tarefa)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(tarefa);
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <ListTodo className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className="min-w-0 truncate text-[16px] leading-normal font-normal text-foreground"
            title={tarefa.descricao}
          >
            {tarefa.descricao}
          </span>
          <span className={cn("text-[14px] leading-normal", dateClassName)}>
            {format(tarefa.data, "dd/MM/yyyy")}
          </span>
        </div>
      </div>

      {/* stopPropagation: a ação rápida de concluir não deve abrir o dialog de edição (D-07) */}
      <div
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="group"
          aria-label={"Concluir tarefa: " + tarefa.descricao}
          title="Concluir tarefa"
          onClick={handleConcluir}
        >
          {/* Repouso: Circle cinza calmo. Hover/foco por teclado: CircleCheck em teal. */}
          <Circle className="size-4 text-muted-foreground group-hover:hidden group-focus-visible:hidden" />
          <CircleCheck className="hidden size-4 text-[#0D9488] group-hover:block group-focus-visible:block" />
        </Button>
      </div>
    </div>
  );
}
