#!/usr/bin/env node
"use strict";

/**
 * Guarda code+data da persistência pura do tour guiado (Fase 25, plano 25-01,
 * TUTORIAL-02/TUTORIAL-05).
 *
 * O host de 4GB não roda `dev` + navegador + sessão do agente junto
 * (precedente Fases 18-20), então o comportamento visual real do Joyride fica
 * como UAT humano NÃO-BLOQUEANTE (25-02). Este harness exercita as funções
 * PURAS de `src/lib/tour-persistence.ts` (zero DOM) com um `localStorage`
 * mockado em memória.
 *
 * Cobre:
 *   - deveGravarComoVisto: "finished"/"skipped" -> true, "running"/"paused"/
 *     vazio/desconhecido -> false (Pitfall 4 — esquecer "skipped" reabre o
 *     tour do zero, violando TUTORIAL-05)
 *   - TOUR_STORAGE_KEY === "tourVisto"
 *   - lerTourVisto/gravarTourVisto/limparTourVisto contra um storage mockado
 *     (getItem/setItem/removeItem sobre um Map, sem window/jsdom)
 *
 * Rodar via: node scripts/test-tour-persistence.cjs (ou npm run test:tour-persistence)
 * Exit 0 = tudo passou. Exit 1 = alguma violação (mensagem descritiva + total).
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

(async () => {
  const m = await import("@/lib/tour-persistence");
  const { TOUR_STORAGE_KEY, deveGravarComoVisto, lerTourVisto, gravarTourVisto, limparTourVisto } =
    m;

  // --- TOUR_STORAGE_KEY ---
  check(TOUR_STORAGE_KEY === "tourVisto", `TOUR_STORAGE_KEY === "tourVisto" (got ${JSON.stringify(TOUR_STORAGE_KEY)})`);

  // --- deveGravarComoVisto: finished/skipped => true, tudo mais => false ---
  check(deveGravarComoVisto("finished") === true, `deveGravarComoVisto("finished") -> true`);
  check(deveGravarComoVisto("skipped") === true, `deveGravarComoVisto("skipped") -> true`);
  check(deveGravarComoVisto("running") === false, `deveGravarComoVisto("running") -> false`);
  check(deveGravarComoVisto("paused") === false, `deveGravarComoVisto("paused") -> false`);
  check(deveGravarComoVisto("") === false, `deveGravarComoVisto("") -> false`);
  check(deveGravarComoVisto("status-desconhecido") === false, `deveGravarComoVisto("status-desconhecido") -> false`);

  // --- lerTourVisto / gravarTourVisto / limparTourVisto contra um localStorage mockado ---
  {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    };

    check(lerTourVisto(mockStorage) === false, `lerTourVisto: chave ausente -> false`);
    gravarTourVisto(mockStorage);
    check(
      store.get(TOUR_STORAGE_KEY) === "true",
      `gravarTourVisto grava "true" na chave ${TOUR_STORAGE_KEY}`
    );
    check(lerTourVisto(mockStorage) === true, `lerTourVisto: chave presente -> true`);
    limparTourVisto(mockStorage);
    check(lerTourVisto(mockStorage) === false, `limparTourVisto remove a chave -> lerTourVisto volta a false`);
  }

  if (failed > 0) {
    console.error(`\n[test-tour-persistence] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-tour-persistence] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-tour-persistence] ERRO:", err.stack || err);
  process.exit(1);
});
