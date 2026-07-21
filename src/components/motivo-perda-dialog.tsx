"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MotivoPerdaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNome: string;
  onSkip: () => void;
  onSave: (motivo: string) => void;
};

/**
 * Modal opcional/não-bloqueante (D-04) exibido quando um card é solto na
 * coluna Perdido — o movimento já ocorreu de forma otimista ANTES deste
 * modal abrir (ver pipeline-board.tsx). "Pular" apenas fecha sem gravar
 * motivo (não reverte o drag); "Salvar motivo" grava o texto livre.
 */
export function MotivoPerdaDialog({
  open,
  onOpenChange,
  leadNome,
  onSkip,
  onSave,
}: MotivoPerdaDialogProps) {
  const [motivo, setMotivo] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMotivo("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Perdido</DialogTitle>
          <DialogDescription>{`Por que "${leadNome}" foi perdido? (opcional)`}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ex: sem orçamento, escolheu concorrente, não respondeu mais..."
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setMotivo("");
              onSkip();
            }}
          >
            Pular
          </Button>
          <Button
            className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
            onClick={() => {
              onSave(motivo);
              setMotivo("");
            }}
          >
            Salvar motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
