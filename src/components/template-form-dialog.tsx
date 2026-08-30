"use client";

import { useActionState, useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { createTemplate, updateTemplate } from "@/actions/template-actions";
import { templateSchema, type TemplateFormValues } from "@/lib/validations";
import type { Template } from "@/types";

type TemplateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presença de `template` decide o modo: undefined = criar, definido = editar. */
  template?: Template;
};

const TIPO_OPTIONS = [
  { value: "primeiro_contato", label: "1º contato" },
  { value: "follow_up", label: "Follow-up" },
  { value: "prova_valor", label: "Prova de valor" },
] as const;

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Modal de criar/editar template de WhatsApp (WA-01, D-09/D-10/D-12).
 * Segue o mesmo padrão de submissão do lead-form-dialog: o form nativo
 * submete o FormData BRUTO do DOM (não os valores já parseados pelo
 * react-hook-form), com a validação autoritativa acontecendo no server
 * dentro de `templateSchema` (createTemplate/updateTemplate).
 */
export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: TemplateFormDialogProps) {
  const isEditMode = Boolean(template);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEditMode ? updateTemplate : createTemplate,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      tipo: template?.tipo,
      nome: template?.nome ?? "",
      corpo: template?.corpo ?? "",
      isDefault: template?.isDefault ?? false,
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Template salvo com sucesso.");
      form.reset();
      onOpenChange(false);
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar o template. Tente novamente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function onSubmit() {
    if (!formRef.current) return;
    formAction(new FormData(formRef.current));
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {isEditMode && template ? (
            <input type="hidden" name="id" value={template.id} readOnly />
          ) : null}

          <Field data-invalid={!!errors.nome}>
            <FieldLabel htmlFor="nome">Nome</FieldLabel>
            <FieldContent>
              <Input
                id="nome"
                placeholder="Ex: Primeiro contato — nutricionista"
                aria-invalid={!!errors.nome}
                {...form.register("nome")}
              />
              <FieldError errors={[errors.nome]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.tipo}>
            <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <Select
                    name="tipo"
                    items={TIPO_OPTIONS as unknown as { value: string; label: string }[]}
                    value={(field.value as string | undefined) ?? null}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id="tipo" aria-invalid={!!errors.tipo} className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.tipo]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.corpo}>
            <FieldLabel htmlFor="corpo">Mensagem</FieldLabel>
            <FieldContent>
              <Textarea id="corpo" aria-invalid={!!errors.corpo} {...form.register("corpo")} />
              <FieldDescription>
                Use {"{nome}"}, {"{nicho}"} ou {"{origem}"} para personalizar automaticamente.
              </FieldDescription>
              <FieldError errors={[errors.corpo]} />
            </FieldContent>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isDefault")} className="h-4 w-4" />
            Marcar como padrão para este tipo
          </label>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
              disabled={pending}
            >
              {pending ? "Salvando..." : "Salvar template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
