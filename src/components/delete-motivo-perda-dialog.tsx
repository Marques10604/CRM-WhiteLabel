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

type DeleteMotivoPerdaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivoPerdaNome: string;
  onConfirm: () => void;
};

/**
 * Confirmação de remoção de motivo de perda (Fase 11, PERDA-01, D-05),
 * espelhando delete-subnicho-dialog.tsx. Confirmar dispara
 * `softDeleteMotivoPerda` (soft-delete, LEAD-04) — o motivo deixa de aparecer
 * nas opções ao mover um lead para Perdido, mas os leads já perdidos com esse
 * motivo continuam intactos (FK `onDelete: "restrict"`).
 */
export function DeleteMotivoPerdaDialog({
  open,
  onOpenChange,
  motivoPerdaNome,
  onConfirm,
}: DeleteMotivoPerdaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remover motivo de perda</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja remover ${motivoPerdaNome}? Ele deixa de aparecer nas opções ao mover um lead para Perdido. Os leads já perdidos com esse motivo continuam intactos.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
