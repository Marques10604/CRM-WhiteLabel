"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NichoCombobox } from "@/components/nicho-combobox";
import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
import { createCampanha } from "@/actions/campanha-actions";
import { campanhaSchema, type CampanhaFormValues } from "@/lib/validations";
import type { Campanha, Nicho } from "@/types";

type CampanhaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nichos: Nicho[];
};

type ActionState =
  | { success: true; campanha?: Campanha }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Campo de data da janela (início ou fim) — Popover + Calendar no molde EXATO
 * de `lead-table-toolbar.tsx`, com input hidden ISO alimentando o FormData
 * bruto do submit. Cada instância gerencia o próprio estado de abertura do
 * Popover (o dialog renderiza dois: início + fim, independentes).
 */
function JanelaField({
  control,
  name,
  label,
  description,
  hasError,
}: {
  control: Control<CampanhaFormValues>;
  name: "janelaInicio" | "janelaFim";
  label: string;
  description: string;
  hasError: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Controller
          control={control}
          name={name}
          render={({ field, fieldState }) => {
            const selected = field.value as Date | undefined;
            return (
              <>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="justify-start gap-1.5 font-normal"
                      />
                    }
                  >
                    <CalendarIcon className="size-3.5" />
                    {selected ? format(selected, "dd/MM/yyyy") : "Selecionar"}
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={selected}
                      onSelect={(date) => {
                        field.onChange(date ? startOfDay(date) : undefined);
                        setPopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="hidden"
                  name={name}
                  value={selected ? selected.toISOString() : ""}
                  readOnly
                />
                <FieldDescription>{description}</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </>
            );
          }}
        />
      </FieldContent>
    </Field>
  );
}

/**
 * Modal de CRIAÇÃO de campanha de exploração de nicho (CAMPANHA-01, Fase 22).
 * Sem modo edição nesta fase — CAMPANHA-01 só pede criar; a edição de campanha
 * não é requisito do plano 22-02.
 *
 * CONTRATO (mesmo idioma de `tarefa-form-dialog.tsx` / `lead-form-dialog.tsx`):
 * o client NUNCA reenvia os valores já transformados pelo resolver — `onSubmit`
 * monta `new FormData(formRef.current)` do DOM bruto e a validação autoritativa
 * roda no server dentro de `campanhaSchema` (`createCampanha`). A chamada de
 * `formAction` vai dentro de `startTransition` (React 19 exige).
 *
 * Janela de tempo: default de ~90 dias (CAMPANHA-01), editável nos 2 campos de
 * data (Popover + Calendar), cada um com o próprio input hidden ISO.
 */
export function CampanhaFormDialog({ open, onOpenChange, nichos }: CampanhaFormDialogProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCampanha,
    undefined
  );
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<CampanhaFormValues>({
    resolver: zodResolver(campanhaSchema),
    mode: "onBlur",
    defaultValues: {
      nichoId: undefined,
      oferta: "",
      metaConversao: "",
      janelaInicio: startOfDay(new Date()),
      janelaFim: startOfDay(addDays(new Date(), 90)),
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Campanha criada.");
      form.reset();
      onOpenChange(false);
    } else if (state && "errors" in state) {
      toast.error("Não foi possível criar a campanha. Tente novamente.");
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
    // FormData BRUTO do DOM — normalização/parse autoritativa é no server
    // dentro de `campanhaSchema`, nunca aqui no client.
    const formData = new FormData(formRef.current);
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
            <DialogTitle>Nova campanha</DialogTitle>
          </DialogHeader>

          <form
            ref={formRef}
            /* eslint-disable-next-line react-hooks/refs -- mesmo padrão de tarefa-form-dialog.tsx
               / configuracoes-form.tsx (decisão 07-02/09-03 em STATE.md): `onSubmit` só lê
               `formRef.current` dentro do handler de submit real (nunca durante o render); a
               regra do React Compiler não consegue provar isso estaticamente para
               `form.handleSubmit(onSubmit)`, mesmo falso-positivo pré-existente no analog. */
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
            noValidate
          >
            <Field data-invalid={!!errors.nichoId}>
              <FieldLabel htmlFor="nichoId">Nicho</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="nichoId"
                  render={({ field }) => (
                    <NichoCombobox
                      nichos={nichos}
                      value={(field.value as number | null | undefined) ?? null}
                      onValueChange={(id) => field.onChange(id)}
                      invalid={!!errors.nichoId}
                    />
                  )}
                />
                <FieldDescription>
                  O nicho que essa campanha vai explorar.
                </FieldDescription>
                <FieldError errors={[errors.nichoId]} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.oferta}>
              <FieldLabel htmlFor="oferta">Oferta</FieldLabel>
              <FieldContent>
                <Textarea
                  id="oferta"
                  placeholder="Ex: Automação de agendamento por WhatsApp para clínicas"
                  aria-invalid={!!errors.oferta}
                  {...form.register("oferta")}
                />
                <FieldDescription>
                  O que você pretende vender nesse nicho.
                </FieldDescription>
                <FieldError errors={[errors.oferta]} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.metaConversao}>
              <FieldLabel htmlFor="metaConversao">Meta de conversão</FieldLabel>
              <FieldContent>
                <Input
                  id="metaConversao"
                  placeholder="Ex: 3 leads fechados, 10% de resposta..."
                  aria-invalid={!!errors.metaConversao}
                  {...form.register("metaConversao")}
                />
                <FieldDescription>
                  O resultado que define se vale a pena escalar esse nicho.
                </FieldDescription>
                <FieldError errors={[errors.metaConversao]} />
              </FieldContent>
            </Field>

            <JanelaField
              control={form.control}
              name="janelaInicio"
              label="Início da janela"
              description="Quando a exploração começa."
              hasError={!!errors.janelaInicio}
            />

            <JanelaField
              control={form.control}
              name="janelaFim"
              label="Fim da janela"
              description="Default de ~90 dias a partir de hoje — editável."
              hasError={!!errors.janelaFim}
            />

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
    </>
  );
}
