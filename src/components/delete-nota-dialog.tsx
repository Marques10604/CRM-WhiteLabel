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

type DeleteNotaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Desabilita o botão "Excluir" e troca o texto enquanto a exclusão está em voo (IN-01, 09-REVIEW.md). */
  pending?: boolean;
};

/**
 * Confirmação de exclusão de nota manual (D-06/D-07), espelhando
 * `delete-lead-dialog.tsx` estrutura por estrutura. Copy literal do UI-SPEC —
 * deliberadamente NÃO promete restauração: não existe superfície de
 * recuperação de notas manuais nesta fase (soft-delete apenas no banco,
 * `deletedAt`, recuperável manualmente via Drizzle Studio).
 */
export function DeleteNotaDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
}: DeleteNotaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Excluir nota</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta nota? Ela deixará de aparecer na timeline.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
