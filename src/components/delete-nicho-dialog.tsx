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

type DeleteNichoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nichoNome: string;
  onConfirm: () => void;
};

/**
 * Confirmação de remoção de nicho (quick task 260725-lai), espelhando
 * delete-lead-dialog.tsx. Confirmar dispara `softDeleteNicho` (soft-delete,
 * LEAD-04) — o nicho deixa de aparecer nas opções de seleção, mas os
 * leads já cadastrados nele continuam intactos e visíveis.
 */
export function DeleteNichoDialog({
  open,
  onOpenChange,
  nichoNome,
  onConfirm,
}: DeleteNichoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remover nicho</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja remover ${nichoNome}? Ele deixa de aparecer nas opções de novos leads e nos filtros. Os leads já cadastrados nesse nicho continuam intactos.`}
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
