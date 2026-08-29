"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteTarefaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  descricao: string;
  onConfirm: () => void;
};

/**
 * Confirmação de exclusão de tarefa (Fase 12, TAREFA-02, D-08), espelhando
 * delete-motivo-perda-dialog.tsx. DIVERGÊNCIA DE POLÍTICA: aqui confirmar
 * dispara `deleteTarefa` — HARD-DELETE de verdade (a linha some do banco),
 * porque `tarefas` é descartável por natureza (lembrete cumprido ou
 * cancelado), NÃO tem `deletedAt` e NÃO tem Lixeira. Por isso o dialog é
 * não-dispensável pelo X (`showCloseButton={false}`) e a cópia avisa
 * explicitamente que a ação não pode ser desfeita.
 */
export function DeleteTarefaDialog({
  open,
  onOpenChange,
  descricao,
  onConfirm,
}: DeleteTarefaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Excluir tarefa</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja excluir a tarefa "${descricao}"? Essa ação não pode ser desfeita.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
