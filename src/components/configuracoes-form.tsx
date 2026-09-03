"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
  sequenciaIntervalosSchema,
  type ConfiguracoesFormValues,
} from "@/lib/validations";
import type { Configuracoes } from "@/db/queries";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/** Linha da lista dinâmica de intervalos — `id` é um contador estável, NUNCA
 * o índice do array (10-UI-SPEC.md), para que remover uma linha do meio não
 * embaralhe o foco/valor das linhas seguintes ao usar `key`. */
type IntervaloRow = { id: number; valor: string };

/**
 * Formulário de `/configuracoes` (CONFIG-01, SEQ-01, D-01/D-02/D-03/D-04).
 * Segue a mesma mecânica de submissão do `TemplateFormDialog` — o `<form>`
 * nativo submete o FormData BRUTO do DOM via `useActionState` para
 * `saveConfiguracoes`, cujo `safeParse` server-side é a validação
 * autoritativa (T-07-06). O `zodResolver` client-side é só feedback
 * antecipado.
 *
 * D-02: ao salvar com sucesso, os campos permanecem visíveis com os valores
 * recém-salvos — nunca resetar o formulário nem navegar para outra tela.
 *
 * O atributo booleano na tag de abertura do form existe para que a
 * constraint validation nativa do HTML5 (dos `min={1}` dos inputs) não
 * intercepte o submit antes do `react-hook-form` rodar — sem ele a
 * mensagem Zod "Mínimo de 1 dia." nunca renderiza (gap do item 3 de
 * `07-HUMAN-UAT.md`). A autoridade real de validação continua sendo o
 * `safeParse` server-side de `saveConfiguracoes` (T-07-06/T-07-01), então
 * remover esse atributo no futuro só devolve o bug de UX — não remover.
 *
 * SEQ-01: a seção "Sequência de reabordagem" abaixo vive DENTRO do mesmo
 * `<form>` nativo — os inputs repetidos `name="intervaloDias"` entram no
 * mesmo `FormData` submetido por `onSubmit`, e o servidor os lê via
 * `formData.getAll("intervaloDias")` (10-03, Task 1). A lista NÃO é
 * registrada no `react-hook-form` (`useForm` continua tipado só pelos 3
 * campos escalares via `configuracoesSchema`) — registrá-la ali sem um
 * campo de fato controlado pelo RHF faria `form.handleSubmit` reprovar o
 * submit para sempre. Por isso a lista tem sua própria validação client
 * (`sequenciaIntervalosSchema.safeParse`, rodada dentro de `onSubmit` DEPOIS
 * do RHF aprovar os 3 escalares) e seu próprio estado local de erro.
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

  // Contador de ids estáveis por linha (nunca o índice do array, ver
  // `IntervaloRow`). Semeado com a quantidade de linhas iniciais para que
  // as próximas linhas adicionadas via `handleAdicionarIntervalo` nunca
  // colidam com os ids das linhas carregadas de `config`. Só é lido/escrito
  // dentro de event handlers (nunca durante o render) — ler `ref.current`
  // dentro do inicializador de `useState` dispara o falso-positivo
  // `react-hooks/refs` do React Compiler.
  const rowIdCounter = useRef(config.sequenciaIntervalosDias.length);
  function novoRowId() {
    rowIdCounter.current += 1;
    return rowIdCounter.current;
  }

  const [intervalos, setIntervalos] = useState<IntervaloRow[]>(() =>
    config.sequenciaIntervalosDias.map((valor, index) => ({
      id: index,
      valor: String(valor),
    }))
  );
  const [intervalosErro, setIntervalosErro] = useState<string | null>(null);
  const pendingFocusIdRef = useRef<number | null>(null);
  const inputRefs = useRef(new Map<number, HTMLInputElement | null>());

  useEffect(() => {
    if (pendingFocusIdRef.current !== null) {
      inputRefs.current.get(pendingFocusIdRef.current)?.focus();
      pendingFocusIdRef.current = null;
    }
  }, [intervalos]);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Configurações salvas.");
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar as configurações. Tente novamente.");
    }
  }, [state]);

  function handleAdicionarIntervalo() {
    const novaLinha: IntervaloRow = { id: novoRowId(), valor: "" };
    setIntervalos((prev) => [...prev, novaLinha]);
    pendingFocusIdRef.current = novaLinha.id;
  }

  function handleRemoverIntervalo(id: number) {
    setIntervalos((prev) => prev.filter((row) => row.id !== id));
  }

  function handleAlterarIntervalo(id: number, valor: string) {
    setIntervalos((prev) =>
      prev.map((row) => (row.id === id ? { ...row, valor } : row))
    );
  }

  function onSubmit() {
    if (!formRef.current) return;

    // Validação client da lista dinâmica (feedback antecipado — a
    // autoridade real é configuracoesServerSchema no servidor, Task 1).
    // Roda DEPOIS do RHF já ter aprovado os 3 campos escalares.
    const parsedIntervalos = sequenciaIntervalosSchema.safeParse(
      intervalos.map((row) => row.valor)
    );
    if (!parsedIntervalos.success) {
      setIntervalosErro(
        parsedIntervalos.error.issues[0]?.message ?? "Intervalo inválido."
      );
      return;
    }
    setIntervalosErro(null);

    formAction(new FormData(formRef.current));
  }

  const errors = form.formState.errors;

  return (
    <form
      ref={formRef}
      /* eslint-disable-next-line react-hooks/refs -- mesmo padrão de TemplateFormDialog:
         `onSubmit` só lê `formRef.current` dentro do handler de submit real (nunca durante
         o render); a regra do React Compiler não consegue provar isso estaticamente para
         `form.handleSubmit(onSubmit)`, mesmo falso-positivo pré-existente no analog. */
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <div className="rounded-lg border bg-card p-6 max-w-md">
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
      </div>

      <div className="rounded-lg border bg-card p-6 max-w-md">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-semibold leading-tight">
            Sequência de reabordagem
          </h2>
          <p className="text-[14px] text-muted-foreground">
            Intervalos crescentes, em dias, para sugerir quando reabordar um lead frio (Outbound). Leads Inbound nunca recebem esta sugestão.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {intervalos.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">
              Nenhum intervalo configurado.
            </p>
          ) : (
            intervalos.map((row, index) => (
              <div key={row.id} className="flex items-center gap-2">
                <FieldLabel htmlFor={`intervaloDias-${row.id}`}>
                  Intervalo {index + 1} (dias)
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={`intervaloDias-${row.id}`}
                    ref={(el) => {
                      inputRefs.current.set(row.id, el);
                    }}
                    name="intervaloDias"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    aria-invalid={!!intervalosErro}
                    value={row.valor}
                    onChange={(event) =>
                      handleAlterarIntervalo(row.id, event.target.value)
                    }
                  />
                  <FieldDescription>
                    Dias após a última interação de WhatsApp para sugerir esta reabordagem.
                  </FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remover intervalo ${index + 1}`}
                  title="Remover intervalo"
                  onClick={() => handleRemoverIntervalo(row.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        <FieldError errors={intervalosErro ? [{ message: intervalosErro }] : []} />

        <div className="mt-4">
          <Button type="button" variant="outline" onClick={handleAdicionarIntervalo}>
            <Plus className="size-4" />
            Adicionar intervalo
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
