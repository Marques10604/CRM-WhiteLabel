"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { MessageCircle, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { createInteracaoManual, getInteracoesByLead } from "@/actions/interacao-actions";
import { notaManualTextoSchema, type NotaManualFormValues } from "@/lib/validations";
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
  const [pending, startTransition] = useTransition();
  // Guarda contra respostas fora de ordem: sempre que uma nova busca começa
  // (efeito ou recarregar() pós-mutação), o id "em voo" é atualizado; uma
  // resposta cujo leadId não bate mais com o id em voo é descartada.
  const leadIdEmVooRef = useRef<number | undefined>(undefined);

  const form = useForm<NotaManualFormValues>({
    resolver: zodResolver(notaManualTextoSchema),
    defaultValues: { texto: "" },
  });

  const recarregar = useCallback(async () => {
    if (!lead) return;
    const leadId = lead.id;
    leadIdEmVooRef.current = leadId;
    const resultado = await getInteracoesByLead(leadId);
    if (leadIdEmVooRef.current !== leadId) return;
    setInteracoes(resultado);
  }, [lead]);

  // Reinicializa a lista e o composer sempre que o dialog abre para um lead
  // novo — a instância é única e reutilizada, não remontada por item (WR-04).
  useEffect(() => {
    if (!open || !lead) {
      /* Mesmo falso-positivo pré-existente documentado para
         whatsapp-preview-dialog.tsx (STATE.md/deferred-items.md): sincroniza
         `interacoes`/`carregando` com a prop `open`/`lead` ao fechar ou trocar
         de lead — não é estado derivável sem efeito (a lista vem de uma
         Server Action assíncrona). */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInteracoes([]);
      setCarregando(false);
      return;
    }
    form.reset({ texto: "" });
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  function onSubmit(values: NotaManualFormValues) {
    if (!lead) return;
    const leadId = lead.id;
    startTransition(async () => {
      const resultado = await createInteracaoManual(leadId, values.texto);
      if ("errors" in resultado) {
        toast.error("Não foi possível salvar a nota. Tente novamente.");
        return;
      }
      toast.success("Nota registrada.");
      form.reset({ texto: "" });
      await recarregar();
    });
  }

  return (
    <Dialog open={open && !!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {lead ? (
          <>
            <DialogHeader>
              <DialogTitle>{`Histórico de ${lead.nome}`}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <form
                /* eslint-disable-next-line react-hooks/refs -- mesmo padrão de
                   TemplateFormDialog/configuracoes-form.tsx (decisão 07-02 em
                   STATE.md): `form.handleSubmit(onSubmit)` lê o ref interno do
                   react-hook-form só dentro do handler de submit real (nunca
                   durante o render); a regra do React Compiler não consegue
                   provar isso estaticamente, mesmo falso-positivo pré-existente
                   no analog, mesmo sem formRef próprio neste composer. */
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-2"
              >
                <Field data-invalid={!!form.formState.errors.texto}>
                  <FieldContent>
                    <Textarea
                      placeholder="Registrar uma nota sobre este lead..."
                      aria-invalid={!!form.formState.errors.texto}
                      {...form.register("texto")}
                    />
                    <FieldError errors={[form.formState.errors.texto]} />
                  </FieldContent>
                </Field>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
                    disabled={pending}
                  >
                    {pending ? "Salvando..." : "Salvar nota"}
                  </Button>
                </div>
              </form>

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
