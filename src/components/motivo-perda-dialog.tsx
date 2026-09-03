"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MotivoPerdaCombobox } from "@/components/motivo-perda-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MotivoPerda } from "@/types";

type MotivoPerdaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNome: string;
  motivosPerda: MotivoPerda[];
  /** Cancela: reverte o drag (o card volta à etapa anterior, updateLeadStage NÃO é chamado). */
  onCancel: () => void;
  onSave: (motivoPerdaId: number) => void;
};

/**
 * Modal OBRIGATÓRIO (D-04) exibido quando um card é solto na coluna Perdido —
 * o card já se moveu de forma otimista ANTES deste modal abrir (ver
 * pipeline-board.tsx). Não há mais atalho para ignorar o motivo: ou o admin
 * escolhe/cria um motivo da lista governada e clica "Salvar motivo", ou clica
 * "Cancelar" e o drag é revertido.
 *
 * O modal NÃO é dispensável por clique fora / Esc sem uma decisão explícita
 * (`showCloseButton={false}` + `onOpenChange` interceptado com
 * `eventDetails.cancel()`, mesmo idioma de `lead-form-dialog.tsx`) — sem isso
 * um drag ficaria "órfão" (etapa mudou visualmente mas nunca persistiu nem
 * reverteu).
 */
export function MotivoPerdaDialog({
  open,
  onOpenChange,
  leadNome,
  motivosPerda,
  onCancel,
  onSave,
}: MotivoPerdaDialogProps) {
  const [motivoPerdaId, setMotivoPerdaId] = useState<number | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(
        next: boolean,
        eventDetails?: { reason?: string; cancel: () => void }
      ) => {
        if (!next) {
          // Bloqueia SÓ o dismiss por gesto (Esc / clique fora). Um
          // `eventDetails.cancel()` incondicional dessincroniza o Base UI
          // quando o pai fecha o modal via prop `open` (reason "none") —
          // o modal fica preso aberto. "Cancelar"/"Salvar motivo" fecham
          // mudando o estado no pai (onCancel/onSave), não por aqui.
          const reason = eventDetails?.reason;
          if (reason === "escape-key" || reason === "outside-press") {
            eventDetails?.cancel();
          }
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Mover para Perdido</DialogTitle>
          <DialogDescription>{`Por que "${leadNome}" foi perdido?`}</DialogDescription>
        </DialogHeader>
        <MotivoPerdaCombobox
          motivosPerda={motivosPerda}
          value={motivoPerdaId}
          onValueChange={setMotivoPerdaId}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setMotivoPerdaId(null);
              onCancel();
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={motivoPerdaId == null}
            onClick={() => {
              if (motivoPerdaId == null) return;
              onSave(motivoPerdaId);
              setMotivoPerdaId(null);
            }}
          >
            Salvar motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
