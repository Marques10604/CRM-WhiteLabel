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

type DeleteSubnichoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subnichoNome: string;
  onConfirm: () => void;
};

/**
 * Confirmação de remoção de sub-nicho (quick task 260725-lai), espelhando
 * delete-lead-dialog.tsx. Confirmar dispara `softDeleteSubnicho` (soft-delete,
 * LEAD-04) — o sub-nicho deixa de aparecer nas opções de seleção, mas os
 * leads já cadastrados nele continuam intactos e visíveis.
 */
export function DeleteSubnichoDialog({
  open,
  onOpenChange,
  subnichoNome,
  onConfirm,
}: DeleteSubnichoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remover sub-nicho</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja remover ${subnichoNome}? Ele deixa de aparecer nas opções de novos leads e nos filtros. Os leads já cadastrados nesse sub-nicho continuam intactos.`}
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
