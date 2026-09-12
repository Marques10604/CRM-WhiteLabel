"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registrarVeredito } from "@/actions/campanha-actions";
import type { VereditoFinal } from "@/lib/validations";

/**
 * Formulário client de registro do veredito do operador (VEREDITO-01/02,
 * Fase 24, plano 24-03). Molde de `GerarDiagnosticoButton`: `useActionState`
 * sobre a Server Action, envio dentro de `startTransition`, `useEffect`
 * reagindo a `state` com toast sonner.
 *
 * D-24-03: este componente NUNCA recebe a sugestão da IA — só o veredito JÁ
 * REGISTRADO do usuário (`vereditoAtual`), de propósito. Pré-selecionar a
 * sugestão da IA transformaria um insumo não vinculante (DIAGNOSTICO-09) num
 * default silencioso, o que é ativamente perigoso dada a variância de
 * veredito entre execuções idênticas (dívida técnica nº 1 da Fase 23,
 * STATE.md). Sem veredito registrado, o `Select` nasce vazio com o
 * placeholder "Escolha o veredito".
 */

const VEREDITO_OPCOES: { value: VereditoFinal; label: string }[] = [
  { value: "aprofundar", label: "Aprofundar" },
  { value: "mudar_angulo", label: "Mudar o ângulo" },
  { value: "abandonar", label: "Abandonar" },
];

export function VereditoForm({
  campanhaId,
  vereditoAtual,
}: {
  campanhaId: number;
  vereditoAtual: VereditoFinal | null;
}) {
  const [decisao, setDecisao] = useState<string>(vereditoAtual ?? "");

  const [state, formAction, pending] = useActionState<
    | { success: true }
    | { errors: Record<string, string[] | undefined> }
    | undefined,
    FormData
  >(registrarVeredito, undefined);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Veredito registrado.");
    } else if (state && "errors" in state) {
      const primeiraMensagem = Object.values(state.errors)
        .flat()
        .find((m): m is string => !!m);
      toast.error(primeiraMensagem ?? "Não foi possível registrar o veredito.");
    }
  }, [state]);

  function handleRegistrar() {
    const formData = new FormData();
    formData.set("campanhaId", String(campanhaId));
    formData.set("vereditoFinal", decisao);
    startTransition(() => {
      formAction(formData);
    });
  }

  const errors = state && "errors" in state ? state.errors : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={!!errors?.vereditoFinal}>
        <FieldLabel htmlFor="veredito-final">Seu veredito</FieldLabel>
        <FieldContent>
          <Select value={decisao || null} onValueChange={(value) => setDecisao(value ?? "")}>
            <SelectTrigger id="veredito-final" aria-invalid={!!errors?.vereditoFinal} className="w-full">
              <SelectValue placeholder="Escolha o veredito" />
            </SelectTrigger>
            <SelectContent>
              {VEREDITO_OPCOES.map((opcao) => (
                <SelectItem key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Registrar o veredito só grava a sua decisão e a data — não arquiva leads, não muda
            etapa de ninguém, não dispara nada.
          </FieldDescription>
          <FieldError errors={[{ message: errors?.vereditoFinal?.[0] }, { message: errors?.campanhaId?.[0] }]} />
        </FieldContent>
      </Field>

      <div>
        <Button
          type="button"
          disabled={decisao === "" || pending}
          onClick={handleRegistrar}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Registrando…
            </>
          ) : vereditoAtual === null ? (
            "Registrar veredito"
          ) : (
            "Atualizar veredito"
          )}
        </Button>
      </div>
    </div>
  );
}
