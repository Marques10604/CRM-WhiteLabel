"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveConfiguracoes } from "@/actions/configuracoes-actions";
import {
  configuracoesSchema,
  type ConfiguracoesFormValues,
} from "@/lib/validations";
import type { Configuracoes } from "@/db/queries";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Formulário de `/configuracoes` (CONFIG-01, D-01/D-02/D-03/D-04). Segue a
 * mesma mecânica de submissão do `TemplateFormDialog` — o `<form>` nativo
 * submete o FormData BRUTO do DOM via `useActionState` para `saveConfiguracoes`,
 * cujo `safeParse` server-side é a validação autoritativa (T-07-06). O
 * `zodResolver` client-side é só feedback antecipado.
 *
 * D-02: ao salvar com sucesso, os campos permanecem visíveis com os valores
 * recém-salvos — nunca resetar o formulário nem navegar para outra tela.
 */
export function ConfiguracoesForm({ config }: { config: Configuracoes }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveConfiguracoes,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ConfiguracoesFormValues>({
    resolver: zodResolver(configuracoesSchema),
    defaultValues: {
      diasParadoNovo: config.diasParadoNovo,
      diasParadoContatado: config.diasParadoContatado,
      diasParadoNegociacao: config.diasParadoNegociacao,
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Configurações salvas.");
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar as configurações. Tente novamente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onSubmit() {
    if (!formRef.current) return;
    formAction(new FormData(formRef.current));
  }

  const errors = form.formState.errors;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 max-w-md">
      <form
        ref={formRef}
        /* eslint-disable-next-line react-hooks/refs -- mesmo padrão de TemplateFormDialog:
           `onSubmit` só lê `formRef.current` dentro do handler de submit real (nunca durante
           o render); a regra do React Compiler não consegue provar isso estaticamente para
           `form.handleSubmit(onSubmit)`, mesmo falso-positivo pré-existente no analog. */
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <Field data-invalid={!!errors.diasParadoNovo}>
            <FieldLabel htmlFor="diasParadoNovo">Novo</FieldLabel>
            <FieldContent>
              <Input
                id="diasParadoNovo"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                aria-invalid={!!errors.diasParadoNovo}
                {...form.register("diasParadoNovo")}
              />
              <FieldDescription>
                Dias parado nesta etapa antes de o lead ser destacado como esfriando.
              </FieldDescription>
              <FieldError errors={[errors.diasParadoNovo]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.diasParadoContatado}>
            <FieldLabel htmlFor="diasParadoContatado">Contatado</FieldLabel>
            <FieldContent>
              <Input
                id="diasParadoContatado"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                aria-invalid={!!errors.diasParadoContatado}
                {...form.register("diasParadoContatado")}
              />
              <FieldDescription>
                Dias parado nesta etapa antes de o lead ser destacado como esfriando.
              </FieldDescription>
              <FieldError errors={[errors.diasParadoContatado]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.diasParadoNegociacao}>
            <FieldLabel htmlFor="diasParadoNegociacao">Negociação</FieldLabel>
            <FieldContent>
              <Input
                id="diasParadoNegociacao"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                aria-invalid={!!errors.diasParadoNegociacao}
                {...form.register("diasParadoNegociacao")}
              />
              <FieldDescription>
                Dias parado nesta etapa antes de o lead ser destacado como esfriando.
              </FieldDescription>
              <FieldError errors={[errors.diasParadoNegociacao]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
            disabled={pending}
          >
            {pending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
