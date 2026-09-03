"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { startOfDay } from "date-fns";
import { CircleCheck } from "lucide-react";

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
import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
import { DeleteTarefaDialog } from "@/components/delete-tarefa-dialog";
import {
  concluirTarefa,
  createTarefa,
  deleteTarefa,
  updateTarefa,
} from "@/actions/tarefa-actions";
import { tarefaSchema, type TarefaFormValues } from "@/lib/validations";
import type { Tarefa } from "@/types";

type TarefaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presença de `tarefa` decide o modo: undefined = criar, definido = editar (D-07). */
  tarefa?: Tarefa;
};

type ActionState =
  | { success: true; tarefa?: Tarefa }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Modal de criar/editar tarefa (TAREFA-01, D-05/D-06) — molde de
 * `lead-form-dialog.tsx` podado para os 2 únicos campos da tarefa
 * (`descricao` + `data`), sem as 3 seções destacadas do form de lead.
 *
 * CONTRATO: o client NUNCA reenvia os dados já transformados pelo resolver do
 * react-hook-form — `onSubmit` monta `new FormData(formRef.current)` do DOM
 * bruto e a validação autoritativa acontece no server dentro de
 * `tarefaSchema` (createTarefa/updateTarefa). A chamada de `formAction` vai
 * dentro de `startTransition` (React 19 exige, senão "called outside of a
 * transition" — regressão já corrigida no quick task 260808-h5i).
 *
 * O rodapé em modo edição oferece Excluir (hard-delete via `DeleteTarefaDialog`,
 * D-08), Cancelar, Concluir (marca `concluidaEm`, com "Desfazer" no toast) e
 * Salvar. Concluir é reversível pelo toast; só Excluir pede confirmação (D-08).
 */
export function TarefaFormDialog({ open, onOpenChange, tarefa }: TarefaFormDialogProps) {
  const isEditMode = Boolean(tarefa);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEditMode ? updateTarefa : createTarefa,
    undefined
  );
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<TarefaFormValues>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: {
      descricao: tarefa?.descricao ?? "",
      // Modo criação precisa de um Date real, não undefined — mesmo Pitfall
      // documentado em lead-form-dialog.tsx: o Calendar só destaca "hoje"
      // visualmente (não é seleção de fato); sem este default o zodResolver
      // barra o submit silenciosamente porque `data` chega undefined.
      data: tarefa?.data ?? startOfDay(new Date()),
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success(isEditMode ? "Tarefa salva." : "Tarefa criada.");
      form.reset();
      onOpenChange(false);
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar a tarefa. Tente novamente.");
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
    // FormData BRUTO do DOM — a normalização/parse autoritativa é no server
    // dentro de `tarefaSchema`, nunca aqui no client.
    const formData = new FormData(formRef.current);
    startTransition(() => {
      formAction(formData);
    });
  }

  function dispararToastConcluida(id: number) {
    toast.success("Tarefa concluída.", {
      action: {
        label: "Desfazer",
        onClick: () => {
          startTransition(() => {
            void concluirTarefa(id, { desfazer: true });
          });
          toast.success("Tarefa reaberta.");
        },
      },
    });
  }

  function handleConcluir() {
    if (!tarefa) return;
    const id = tarefa.id;
    startTransition(() => {
      void concluirTarefa(id);
    });
    onOpenChange(false);
    dispararToastConcluida(id);
  }

  function handleConfirmDelete() {
    if (!tarefa) return;
    const id = tarefa.id;
    startTransition(() => {
      void deleteTarefa(id);
    });
    setShowDeleteDialog(false);
    onOpenChange(false);
    toast.success("Tarefa excluída.");
  }

  const errors = form.formState.errors;

  return (
    <>
      <Dialog open={open} onOpenChange={closeWithDiscardGuard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>

          <form
            ref={formRef}
            /* eslint-disable-next-line react-hooks/refs -- mesmo padrão de configuracoes-form.tsx
               / lead-timeline-dialog.tsx (decisão 07-02/09-03 em STATE.md): `onSubmit` só lê
               `formRef.current` dentro do handler de submit real (nunca durante o render); a
               regra do React Compiler não consegue provar isso estaticamente para
               `form.handleSubmit(onSubmit)`, mesmo falso-positivo pré-existente no analog. */
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
            noValidate
          >
            {isEditMode && tarefa ? (
              <input type="hidden" name="id" value={tarefa.id} readOnly />
            ) : null}

            <Field data-invalid={!!errors.descricao}>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <FieldContent>
                <Input
                  id="descricao"
                  placeholder="Ex: Ligar pro cowork sobre o CSV de agosto"
                  aria-invalid={!!errors.descricao}
                  {...form.register("descricao")}
                />
                <FieldDescription>
                  O que precisa ser feito. Serve de título da tarefa.
                </FieldDescription>
                <FieldError errors={[errors.descricao]} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.data}>
              <FieldLabel>Data</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="data"
                  render={({ field }) => {
                    const selected = field.value as Date | undefined;
                    return (
                      <>
                        <Calendar
                          mode="single"
                          selected={selected}
                          // Normaliza para meia-noite LOCAL antes de submeter
                          // (Pitfall de fuso) — evita a tarefa "pular" de dia.
                          onSelect={(date) =>
                            field.onChange(date ? startOfDay(date) : undefined)
                          }
                        />
                        <input
                          type="hidden"
                          name="data"
                          value={selected ? selected.toISOString() : ""}
                          readOnly
                        />
                      </>
                    );
                  }}
                />
                <FieldDescription>
                  Dia em que essa tarefa precisa acontecer.
                </FieldDescription>
                <FieldError errors={[errors.data]} />
              </FieldContent>
            </Field>

            <DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
              {isEditMode && tarefa ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={pending}
                >
                  Excluir
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => closeWithDiscardGuard(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              {isEditMode && tarefa ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConcluir}
                  disabled={pending}
                >
                  <CircleCheck className="size-4" />
                  Concluir
                </Button>
              ) : null}
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

      {tarefa ? (
        <DeleteTarefaDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          descricao={tarefa.descricao}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </>
  );
}
