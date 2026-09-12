"use client";

import { useCallback, useEffect, useState } from "react";
import { Joyride } from "react-joyride";
import type { EventData } from "react-joyride";

import { TOUR_STEPS } from "@/lib/tour-steps";
import {
  deveGravarComoVisto,
  gravarTourVisto,
  lerTourVisto,
} from "@/lib/tour-persistence";

/**
 * Wrapper cliente do `react-joyride` (Fase 25, TUTORIAL-01/02/03/05).
 *
 * Montado uma única vez no layout raiz, irmão de `{children}`. Dono do
 * estado `run` e da leitura/gravação da flag `tourVisto` em `localStorage`
 * (via `src/lib/tour-persistence.ts`, nunca tocando `window` diretamente
 * fora deste componente cliente).
 *
 * D-25-04: `react-joyride` v3 não expõe um slot de texto separado para o
 * contador "Passo {n} de 5" — `locale` só tem `next`/`nextWithProgress`
 * (rótulo do botão de avanço, com placeholders `{current}`/`{total}`).
 * Sem reimplementar o tooltip (proibido pelo UI-SPEC regra 6/9), o contador
 * é embutido no próprio rótulo do botão via `options.showProgress` +
 * `locale.nextWithProgress`, preservando a informação de progresso da
 * TUTORIAL-01 sem inventar prop nem abrir mão do botão de pular o tour.
 */
export function TourGuiado() {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState(false);

  // Guard de hidratação: o servidor não conhece a flag `tourVisto` de
  // localStorage, então o tour só pode nascer `run=true` depois de montar
  // no cliente. Mesmo falso-positivo do React Compiler já aceito no projeto
  // (STATE.md decisão 07-02; theme-toggle.tsx).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (!lerTourVisto(window.localStorage)) setRun(true);
  }, []);

  const handleEvent = useCallback((data: EventData) => {
    if (deveGravarComoVisto(data.status)) {
      gravarTourVisto(window.localStorage);
      setRun(false);
    }
  }, []);

  if (!mounted) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        nextWithProgress: "Próximo (Passo {current} de {total})",
        skip: "Pular tour",
      }}
      options={{
        buttons: ["back", "close", "skip", "primary"],
        showProgress: true,
        spotlightPadding: 4,
        primaryColor: "var(--primary)",
        backgroundColor: "var(--popover)",
        arrowColor: "var(--popover)",
        textColor: "var(--popover-foreground)",
        overlayColor: "color-mix(in oklch, var(--foreground) 10%, transparent)",
      }}
      styles={{
        tooltip: { borderRadius: 10, padding: 16 },
        spotlight: { stroke: "var(--ring)", strokeWidth: 2 },
      }}
    />
  );
}
