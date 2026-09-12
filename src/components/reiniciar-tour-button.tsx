"use client";

import { Button } from "@/components/ui/button";
import { limparTourVisto } from "@/lib/tour-persistence";

/**
 * Ponto de acesso fixo para reiniciar o tour guiado (Fase 25, TUTORIAL-03).
 *
 * Limpar a flag e recarregar a página inteira é a estratégia aprovada pelo
 * `25-RESEARCH.md` (Open Question 3): como `TourGuiado` mora no layout raiz
 * e este botão mora em `/configuracoes`, remontar a árvore inteira é mais
 * simples e mais robusto do que introduzir um Context global só para
 * sincronizar um booleano. É uma ação rara e intencional — perder posição
 * de scroll é aceitável.
 */
export function ReiniciarTourButton() {
  function handleClick() {
    limparTourVisto(window.localStorage);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={handleClick}>
        Rever tour do CRM
      </Button>
      <p className="text-xs text-muted-foreground">
        Reapresenta as 5 telas principais do CRM. Você pode pular a qualquer momento.
      </p>
    </div>
  );
}
