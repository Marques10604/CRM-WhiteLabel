"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubnichoCombobox } from "@/components/subnicho-combobox";
import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
import { WhatsAppPreviewDialog } from "@/components/whatsapp-preview-dialog";
import { createLead, updateLead } from "@/actions/lead-actions";
import { leadSchema, type LeadFormValues } from "@/lib/validations";
import { formatCentsToBRL } from "@/lib/money";
import { useFirstContactTrigger } from "@/hooks/use-first-contact-trigger";
import type { Lead, Subnicho, Template } from "@/types";

type LeadFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subnichos: Subnicho[];
  /** Presença de `lead` decide o modo: undefined = criar, definido = editar (D-07). */
  lead?: Lead;
  /** Template padrão de 1º contato, usado pelo auto-gatilho WA-04 (D-19). */
  firstContactTemplate?: Template;
  /** Lista completa de templates, repassada ao preview auto-aberto de 1º contato. */
  templates?: Template[];
};

const CANAL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

const ORIGEM_TIPO_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const;

const STAGE_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
] as const;

type ActionState =
  | { success: true; lead?: Lead }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Modal de criar/editar lead (D-01/D-02) — 3 seções sem tabs: "Contato",
 * "Negócio", "Acompanhamento". CONTRATO DE VALOR: o campo de valor é texto
 * livre em pt-BR; a conversão para centavos acontece no server via
 * `parseBRLToCents` dentro de `leadSchema` (Task 1) — este componente NUNCA
 * reenvia o valor já convertido pelo client (ver `onSubmit`, que monta o
 * FormData a partir do DOM bruto do <form>, não dos dados já transformados
 * pelo resolver do react-hook-form, evitando dupla-conversão de centavos).
 */
export function LeadFormDialog({
  open,
  onOpenChange,
  subnichos,
  lead,
  firstContactTemplate,
  templates,
}: LeadFormDialogProps) {
  const isEditMode = Boolean(lead);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEditMode ? updateLead : createLead,
    undefined
  );
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const firstContact = useFirstContactTrigger(firstContactTemplate);

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      nome: lead?.nome ?? "",
      telefone: lead?.telefone ?? "",
      canal: lead?.canal,
      origem: lead?.origem ?? "",
      origemTipo: lead?.origemTipo,
      // Reexibição do valor armazenado (centavos) via formatCentsToBRL (D-02 contrato de valor).
      valorEstimado: lead ? formatCentsToBRL(lead.valorEstimado) : "",
      notas: lead?.notas ?? "",
      // Modo criação (lead undefined) precisa de um valor real, não undefined:
      // o Calendar só destaca "hoje" visualmente (classe `today`, bg sutil) —
      // isso NÃO é uma seleção de fato (`data-selected-single`, bg forte). Sem
      // este default, o admin vê o destaque de "hoje", assume que já há uma
      // data escolhida, clica Salvar sem tocar no calendário, e o zodResolver
      // barra o submit com "Invalid input: expected date, received Date"
      // porque followUpDate chega undefined em leadSchema (z.coerce.date()).
      followUpDate: lead?.followUpDate ?? startOfDay(new Date()),
      subnichoId: lead?.subnichoId,
      stage: lead?.stage ?? "novo",
      motivoPerda: lead?.motivoPerda ?? "",
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Lead salvo com sucesso.");
      form.reset();
      onOpenChange(false);
      // Auto-gatilho WA-04 (D-18/D-19/D-21): só na criação manual (nunca em
      // edição), e só quando o server devolveu o lead recém-criado. Fechar
      // o preview NÃO desfaz a criação — o lead já está persistido (D-20).
      if (!isEditMode && state.lead) {
        firstContact.trigger(
          state.lead,
          subnichoNameById.get(state.lead.subnichoId) ?? "—"
        );
      }
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar o lead. Tente novamente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function closeWithDiscardGuard(nextOpen: boolean, eventDetails?: { cancel: () => void }) {
    if (!nextOpen && form.formState.isDirty) {
      eventDetails?.cancel();
      setShowDiscardDialog(true);
      return;
    }
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleDiscard() {
    setShowDiscardDialog(false);
    form.reset();
    onOpenChange(false);
  }

  function onSubmit() {
    if (!formRef.current) return;
    // Submete o FormData BRUTO do DOM (valor/telefone ainda em pt-BR/formatado
    // como digitado) — a normalização/parse autoritativa acontece no server
    // dentro de `leadSchema` (createLead/updateLead), nunca aqui no client.
    const formData = new FormData(formRef.current);
    // Envolve a chamada de formAction numa transition para o React 19 não
    // acusar "called outside of a transition" e para `pending` atualizar
    // corretamente durante o submit.
    startTransition(() => {
      formAction(formData);
    });
  }

  const errors = form.formState.errors;

  return (
    <>
      <Dialog open={open} onOpenChange={closeWithDiscardGuard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar lead" : "Novo lead"}</DialogTitle>
          </DialogHeader>

          <form
            ref={formRef}
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {isEditMode && lead ? (
              <input type="hidden" name="id" value={lead.id} readOnly />
            ) : null}

            <div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">
              <h3 className="text-[20px] leading-tight font-semibold">Contato</h3>

              <Field data-invalid={!!errors.nome}>
                <FieldLabel htmlFor="nome">Nome</FieldLabel>
                <FieldContent>
                  <Input id="nome" aria-invalid={!!errors.nome} {...form.register("nome")} />
                  <FieldError errors={[errors.nome]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.telefone}>
                <FieldLabel htmlFor="telefone">Telefone</FieldLabel>
                <FieldContent>
                  <Input
                    id="telefone"
                    placeholder="(11) 91234-5678"
                    aria-invalid={!!errors.telefone}
                    {...form.register("telefone")}
                  />
                  <FieldDescription>Com DDD.</FieldDescription>
                  <FieldError errors={[errors.telefone]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.canal}>
                <FieldLabel htmlFor="canal">Canal</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="canal"
                    render={({ field }) => (
                      <Select
                        name="canal"
                        items={CANAL_OPTIONS as unknown as { value: string; label: string }[]}
                        value={(field.value as string | undefined) ?? null}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger id="canal" aria-invalid={!!errors.canal} className="w-full">
                          <SelectValue placeholder="Selecione o canal" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANAL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>
                    Por onde você vai abordar esse lead (Instagram ou WhatsApp).
                  </FieldDescription>
                  <FieldError errors={[errors.canal]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.origem}>
                <FieldLabel htmlFor="origem">Origem</FieldLabel>
                <FieldContent>
                  <Input id="origem" aria-invalid={!!errors.origem} {...form.register("origem")} />
                  <FieldDescription>
                    De onde esse lead veio — ex: indicação, anúncio, evento, parceria com o cowork.
                  </FieldDescription>
                  <FieldError errors={[errors.origem]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.origemTipo}>
                <FieldLabel htmlFor="origemTipo">Tipo de origem</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="origemTipo"
                    render={({ field }) => (
                      <Select
                        name="origemTipo"
                        items={ORIGEM_TIPO_OPTIONS as unknown as { value: string; label: string }[]}
                        value={(field.value as string | undefined) ?? null}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger
                          id="origemTipo"
                          aria-invalid={!!errors.origemTipo}
                          className="w-full"
                        >
                          <SelectValue placeholder="Selecione o tipo de origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {ORIGEM_TIPO_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>
                    Inbound = o lead procurou você (anúncio, formulário, indicação). Outbound = você
                    iniciou o contato (prospecção fria).
                  </FieldDescription>
                  <FieldError errors={[errors.origemTipo]} />
                </FieldContent>
              </Field>
            </div>

            <div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">
              <h3 className="text-[20px] leading-tight font-semibold">Negócio</h3>

              <Field data-invalid={!!errors.subnichoId}>
                <FieldLabel htmlFor="subnichoId">Sub-nicho</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="subnichoId"
                    render={({ field }) => (
                      <SubnichoCombobox
                        subnichos={subnichos}
                        value={(field.value as number | null | undefined) ?? null}
                        onValueChange={(id) => field.onChange(id)}
                        invalid={!!errors.subnichoId}
                      />
                    )}
                  />
                  <FieldDescription>
                    Categoria do lead (ex: nutricionista, terapeuta).
                  </FieldDescription>
                  <FieldError errors={[errors.subnichoId]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.stage}>
                <FieldLabel htmlFor="stage">Etapa</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <Select
                        name="stage"
                        items={STAGE_OPTIONS as unknown as { value: string; label: string }[]}
                        value={(field.value as string | undefined) ?? "novo"}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger id="stage" className="w-full">
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>Onde esse lead está no funil de vendas.</FieldDescription>
                  <FieldError errors={[errors.stage]} />
                </FieldContent>
              </Field>

              {form.watch("stage") === "perdido" ? (
                <Field data-invalid={!!errors.motivoPerda}>
                  <FieldLabel htmlFor="motivoPerda">Motivo da perda</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="motivoPerda"
                      aria-invalid={!!errors.motivoPerda}
                      {...form.register("motivoPerda")}
                    />
                    <FieldDescription>
                      Opcional — por que esse lead foi perdido (ex: sem orçamento, escolheu concorrente).
                    </FieldDescription>
                    <FieldError errors={[errors.motivoPerda]} />
                  </FieldContent>
                </Field>
              ) : null}

              <Field data-invalid={!!errors.valorEstimado}>
                <FieldLabel htmlFor="valorEstimado">Valor estimado</FieldLabel>
                <FieldContent>
                  <Input
                    id="valorEstimado"
                    placeholder="1.234,56"
                    aria-invalid={!!errors.valorEstimado}
                    {...form.register("valorEstimado")}
                  />
                  <FieldDescription>
                    Quanto esse negócio pode valer em R$ se fechar — ajuda a ter noção do funil.
                  </FieldDescription>
                  <FieldError errors={[errors.valorEstimado]} />
                </FieldContent>
              </Field>
            </div>

            <div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">
              <h3 className="text-[20px] leading-tight font-semibold">Acompanhamento</h3>

              <Field data-invalid={!!errors.notas}>
                <FieldLabel htmlFor="notas">Notas</FieldLabel>
                <FieldContent>
                  <Textarea id="notas" aria-invalid={!!errors.notas} {...form.register("notas")} />
                  <FieldDescription>Anotações livres sobre esse lead.</FieldDescription>
                  <FieldError errors={[errors.notas]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.followUpDate}>
                <FieldLabel>Follow-up</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="followUpDate"
                    render={({ field }) => {
                      const selected = field.value as Date | undefined;
                      return (
                        <>
                          <Calendar
                            mode="single"
                            selected={selected}
                            // Normaliza para meia-noite LOCAL antes de submeter (Pitfall 6) —
                            // evita o lead "pular" de dia perto da virada de fuso.
                            onSelect={(date) => field.onChange(date ? startOfDay(date) : undefined)}
                          />
                          <input
                            type="hidden"
                            name="followUpDate"
                            value={selected ? selected.toISOString() : ""}
                            readOnly
                          />
                        </>
                      );
                    }}
                  />
                  <FieldDescription>Data do próximo contato com esse lead.</FieldDescription>
                  <FieldError errors={[errors.followUpDate]} />
                </FieldContent>
              </Field>
            </div>

            <DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeWithDiscardGuard(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onDiscard={handleDiscard}
      />

      <WhatsAppPreviewDialog
        open={firstContact.open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) firstContact.close();
        }}
        lead={firstContact.lead}
        subnichoNome={firstContact.subnichoNome ?? "—"}
        templates={templates ?? []}
        defaultTipo="primeiro_contato"
        subtitulo={`Sugestão: enviar mensagem de primeiro contato para ${firstContact.lead?.nome ?? ""}.`}
      />
    </>
  );
}
