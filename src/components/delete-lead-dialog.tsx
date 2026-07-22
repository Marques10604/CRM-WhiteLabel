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

type DeleteLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNome: string;
  onConfirm: () => void;
};

/**
 * Confirmação de exclusão de lead (D-05) — copy literal do contrato de UI
 * (01-UI-SPEC.md linha 121), interpolando o nome real do lead. Confirmar
 * dispara `softDeleteLead` (soft-delete, LEAD-04) — o lead vai para a
 * Lixeira e pode ser restaurado depois, nunca é apagado de verdade.
 */
export function DeleteLeadDialog({
  open,
  onOpenChange,
  leadNome,
  onConfirm,
}: DeleteLeadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Excluir lead</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja excluir ${leadNome}? O lead será movido para a Lixeira e pode ser restaurado depois.`}
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
