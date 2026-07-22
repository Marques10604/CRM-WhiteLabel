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

type DeleteTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateNome: string;
  onConfirm: () => void;
};

/**
 * Confirmação leve de exclusão de template (D-13) — hard delete direto, mas
 * ainda com um passo de confirmação por ser uma ação irreversível.
 */
export function DeleteTemplateDialog({
  open,
  onOpenChange,
  templateNome,
  onConfirm,
}: DeleteTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Excluir template</DialogTitle>
          <DialogDescription>
            {`Tem certeza que deseja excluir o template "${templateNome}"? Essa ação não pode ser desfeita.`}
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
