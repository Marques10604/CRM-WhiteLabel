"use client";

import { startTransition, useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  gerarDiagnosticoAction,
  type DiagnosticoActionState,
} from "@/actions/diagnostico-actions";

/**
 * Botão de geração do diagnóstico (DIAGNOSTICO-01). `useActionState` sobre a
 * Server Action, no idioma de `campanha-form-dialog.tsx` (envio dentro de
 * `startTransition`, `useEffect` reagindo a `state` com toast sonner).
 *
 * DIAGNOSTICO-01: o ÚNICO caminho de disparo é o clique. Nenhum `useEffect`
 * chama a action ao montar.
 *
 * D-23-06: durante o pending mostramos só o spinner + aviso de custo. As
 * consultas de busca reais são renderizadas DEPOIS, pelo `DiagnosticoResultado`
 * (plano 23-05) — não simulamos busca ao vivo aqui.
 *
 * T-23-01: este Client Component importa apenas a Server Action, nunca
 * `@/lib/ai/*` (que é `server-only`).
 */

type GerarDiagnosticoButtonProps = {
  campanhaId: number;
  jaExisteDiagnostico: boolean;
  /** Sobrescreve o rótulo padrão — o estado de erro usa "Tentar de novo". */
  rotulo?: string;
};

export function GerarDiagnosticoButton({
  campanhaId,
  jaExisteDiagnostico,
  rotulo,
}: GerarDiagnosticoButtonProps) {
  const [state, formAction, pending] = useActionState<
    DiagnosticoActionState,
    FormData
  >(gerarDiagnosticoAction, undefined);

  useEffect(() => {
    if (state && state.success) {
      toast.success("Diagnóstico gerado.");
      document
        .getElementById("diagnostico-secao-titulo")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (state && !state.success) {
      toast.error("A geração falhou. Veja o motivo abaixo.");
    }
  }, [state]);

  function handleGerar() {
    const formData = new FormData();
    formData.set("campanhaId", String(campanhaId));
    startTransition(() => {
      formAction(formData);
    });
  }

  const rotuloPadrao = jaExisteDiagnostico
    ? "Gerar novo diagnóstico"
    : "Gerar diagnóstico";

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant={jaExisteDiagnostico ? "outline" : "default"}
          disabled={pending}
          onClick={handleGerar}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Gerando diagnóstico…
            </>
          ) : (
            (rotulo ?? rotuloPadrao)
          )}
        </Button>
      </div>

      {jaExisteDiagnostico && !pending ? (
        <p className="text-xs text-muted-foreground">
          Cada geração é uma chamada nova e paga. A anterior fica no histórico.
        </p>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="animate-spin" />
            Gerando diagnóstico…
          </div>
          <p className="text-xs text-muted-foreground">
            Isto faz buscas na web e custa uma chamada de API. Não feche a página.
          </p>
        </div>
      ) : null}
    </div>
  );
}
