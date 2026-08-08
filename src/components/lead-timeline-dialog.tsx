"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getInteracoesByLead } from "@/actions/interacao-actions";
import type { Interacao, Lead } from "@/types";

type LeadTimelineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | undefined;
};

/** Rótulos de tipo (copy literal do UI-SPEC §Copywriting Contract). */
const TIPO_LABELS: Record<Interacao["tipo"], string> = {
  primeiro_contato: "1º contato",
  follow_up: "Follow-up",
  prova_valor: "Prova de valor",
  nota_manual: "Nota manual",
};

/**
 * Superfície dedicada da timeline de interações (D-02, TIMELINE-01/02) — lista
 * cronológica decrescente das interações ativas de um lead, com composer de
 * nota manual fixo no topo (Task 2) e edição/exclusão só de notas manuais
 * (Task 3). Instância única reutilizada pelo pai (mesmo padrão de
 * `whatsapp-preview-dialog.tsx`), nunca remontada por item.
 */
export function LeadTimelineDialog({ open, onOpenChange, lead }: LeadTimelineDialogProps) {
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  // Guarda contra respostas fora de ordem: sempre que uma nova busca começa
  // (efeito ou recarregar() pós-mutação), o id "em voo" é atualizado; uma
  // resposta cujo leadId não bate mais com o id em voo é descartada.
  const leadIdEmVooRef = useRef<number | undefined>(undefined);

  const recarregar = useCallback(async () => {
    if (!lead) return;
    const leadId = lead.id;
    leadIdEmVooRef.current = leadId;
    const resultado = await getInteracoesByLead(leadId);
    if (leadIdEmVooRef.current !== leadId) return;
    setInteracoes(resultado);
  }, [lead]);

  // Reinicializa a lista sempre que o dialog abre para um lead novo — a
  // instância é única e reutilizada, não remontada por item (WR-04).
  useEffect(() => {
    if (!open || !lead) {
      setInteracoes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  return (
    <Dialog open={open && !!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {lead ? (
          <>
            <DialogHeader>
              <DialogTitle>{`Histórico de ${lead.nome}`}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {interacoes.length === 0 && !carregando ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <p className="text-[16px] font-semibold text-foreground">
                    Nenhuma interação registrada ainda
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Cliques em &quot;Abrir WhatsApp&quot; e notas manuais aparecem aqui, em ordem
                    cronológica.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {interacoes.map((interacao) => (
                    <div
                      key={interacao.id}
                      className="flex flex-col gap-1 border-b border-zinc-200 py-4 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        {interacao.tipo === "nota_manual" ? (
                          <StickyNote className="size-4 text-muted-foreground" />
                        ) : (
                          <MessageCircle className="size-4 text-[#0D9488]" />
                        )}
                        <Badge variant="outline">{TIPO_LABELS[interacao.tipo]}</Badge>
                        <span className="text-[14px] text-muted-foreground">
                          {format(interacao.createdAt, "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      <p className="text-[16px] leading-normal whitespace-pre-wrap text-foreground">
                        {interacao.texto}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
