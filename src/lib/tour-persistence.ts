/**
 * Lógica PURA de persistência do tour guiado (Fase 25, TUTORIAL-02/TUTORIAL-05).
 *
 * Zero DOM assumido: `lerTourVisto`/`gravarTourVisto`/`limparTourVisto` recebem
 * o storage como PARÂMETRO (`Pick<Storage, ...>`), nunca leem `window`/
 * `globalThis` por dentro — isso é o que permite ao harness `.cjs`
 * (`scripts/test-tour-persistence.cjs`) passar um objeto em memória e rodar
 * sob Node puro, sem jsdom, sem browser (host de 4GB de RAM, sem framework de
 * teste de DOM no projeto). Quem passa o `localStorage` real do navegador é o
 * componente cliente `TourGuiado` (plano 25-02), sempre depois do guard de
 * montagem client-side (nunca durante SSR).
 *
 * `deveGravarComoVisto` decide, a partir do `status` literal emitido pelo
 * evento `onEvent` do `react-joyride` v3 (confirmado em
 * `node_modules/react-joyride/dist/index.d.cts`, Task 2 do 25-01-PLAN.md:
 * `STATUS.FINISHED === "finished"`, `STATUS.SKIPPED === "skipped"`), se a
 * flag "já visto" deve ser gravada. Recebe `string` (não o tipo do pacote)
 * de propósito, para o harness poder chamá-la sem importar `react-joyride`.
 *
 * T-25-02 (disposição: accept, `25-01-PLAN.md` threat_model): a flag em
 * `localStorage` é adulterável pelo próprio usuário via DevTools. Risco
 * ACEITO — ferramenta solo, sem multiusuário e sem autenticação por design
 * (CLAUDE.md); pior caso é o tour reaparecer ou deixar de aparecer para quem
 * já tem acesso total à máquina. Esta chave nunca deve virar controle de
 * acesso a dado nenhum.
 */

/** Chave única usada em `localStorage` para a flag "já viu o tour". */
export const TOUR_STORAGE_KEY = "tourVisto";

/**
 * `true` só para os dois status de saída do Joyride que TUTORIAL-02 exige
 * cobrir: conclusão (`"finished"`) e pulo (`"skipped"`). Qualquer outro
 * status (`"running"`, `"paused"`, vazio, desconhecido) retorna `false`.
 */
export function deveGravarComoVisto(status: string): boolean {
  return status === "finished" || status === "skipped";
}

/** Lê a flag "já viu o tour". Ausência da chave (ou storage vazio) = `false`. */
export function lerTourVisto(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(TOUR_STORAGE_KEY) !== null;
}

/** Grava a flag "já viu o tour" — sempre a string literal `"true"` (T-25-03). */
export function gravarTourVisto(storage: Pick<Storage, "setItem">): void {
  storage.setItem(TOUR_STORAGE_KEY, "true");
}

/** Remove a flag — usado pelo botão "Rever tour do CRM" em `/configuracoes` (TUTORIAL-03). */
export function limparTourVisto(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(TOUR_STORAGE_KEY);
}
