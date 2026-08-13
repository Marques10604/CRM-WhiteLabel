#!/usr/bin/env node
"use strict";

/**
 * Guarda de regressão para `computeSequenciaSugestao` (src/db/queries.ts),
 * Fase 10, plano 10-01 (consumida pelo plano 10-04).
 *
 * A função é PURA (sem I/O) mas mora em `src/db/queries.ts`, que importa
 * `@/db/client` no nível de módulo. Para não abrir/tocar o banco de produção
 * (`data/crm.db`) só por causa desse import, `DB_FILE_NAME` é setado para
 * ":memory:" ANTES do import dinâmico — nenhuma query real é executada aqui,
 * só chamadas síncronas à função pura com objetos `lead` fake.
 *
 * Cobre os 4 gates, na ordem documentada no doc-comment da função:
 *   a. ORIGEM-03 — origemTipo !== "outbound" (gate BLOQUEANTE, checado
 *      primeiro mesmo quando todos os outros insumos seriam válidos)
 *   b. etapas terminais (fechado/perdido)
 *   c. D-09 — sem interação-base
 *   d. D-10 — índice fora dos intervalos configurados (sequência esgotada)
 * ...e o caminho feliz (retorno = addDays(ultimaInteracaoWhatsApp, intervalo)).
 *
 * Rodar via: node scripts/test-compute-sequencia-sugestao.cjs
 * (ou npm run test:compute-sequencia)
 * Exit 0 = todas as asserções passaram. Exit != 0 = alguma violação, com
 * mensagem descritiva impressa e o total de falhas ao final.
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

process.env.DB_FILE_NAME = ":memory:";

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

function sameDate(a, b) {
  return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
}

(async () => {
  const { computeSequenciaSugestao } = await import("@/db/queries");
  const { addDays } = await import("date-fns");

  const INTERVALOS = [4, 10, 20];
  const INTERACAO_BASE = new Date("2026-08-01T00:00:00.000Z");

  function lead(overrides = {}) {
    return {
      origemTipo: "outbound",
      stage: "contatado",
      sequenciaPosicao: 0,
      ...overrides,
    };
  }

  // 1) ORIGEM-03 — inbound NUNCA recebe sugestão, mesmo com todo o resto
  //    válido (interação presente, posição válida, etapa não-terminal).
  //    Regra BLOQUEANTE — é o caso mais crítico da fase.
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "inbound", stage: "contatado", sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    check(
      result === undefined,
      `ORIGEM-03: lead inbound com interação válida e posição 0 devolve undefined (got ${result})`
    );
  }

  // 1b) ORIGEM-03 também deve vencer qualquer outro valor de origemTipo que
  //     não seja literalmente "outbound" (não é uma allowlist de "inbound").
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "qualquer-outra-coisa", stage: "novo", sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    check(
      result === undefined,
      `ORIGEM-03: origemTipo diferente de "outbound" (não literalmente "inbound") devolve undefined (got ${result})`
    );
  }

  // 2) Etapa terminal "fechado" -> undefined, mesmo outbound + interação + posição válida.
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "fechado", sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    check(result === undefined, `stage "fechado": devolve undefined (got ${result})`);
  }

  // 3) Etapa terminal "perdido" -> undefined.
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "perdido", sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    check(result === undefined, `stage "perdido": devolve undefined (got ${result})`);
  }

  // 4) D-09 — sem interação-base (ultimaInteracaoWhatsApp === undefined) ->
  //    undefined, mesmo outbound + etapa ativa + posição válida.
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "novo", sequenciaPosicao: 0 }),
      undefined,
      INTERVALOS
    );
    check(result === undefined, `sem ultimaInteracaoWhatsApp (D-09): devolve undefined (got ${result})`);
  }

  // 5) D-10 — posição fora do array de intervalos (esgotamento) -> undefined.
  //    INTERVALOS tem 3 itens (índices 0-2); posição 3 é o primeiro índice inexistente.
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "novo", sequenciaPosicao: 3 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    check(
      result === undefined,
      `sequenciaPosicao=3 fora de intervalosDias.length=3 (D-10): devolve undefined (got ${result})`
    );
  }

  // 5b) D-10 também cobre uma lista de intervalos vazia (esgotamento total).
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "novo", sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      []
    );
    check(result === undefined, `intervalosDias=[] (D-10): devolve undefined (got ${result})`);
  }

  // 6) Caminho feliz — outbound, sequenciaPosicao=0, interação conhecida,
  //    intervalos [4,10,20] -> addDays(interação, 4). Testado nas 3 etapas
  //    ativas (novo/contatado/negociacao) para provar que nenhuma delas é
  //    tratada como terminal por engano.
  for (const stage of ["novo", "contatado", "negociacao"]) {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage, sequenciaPosicao: 0 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    const expected = addDays(INTERACAO_BASE, 4);
    check(
      sameDate(result, expected),
      `stage="${stage}", posição 0, intervalos [4,10,20]: devolve addDays(base, 4) = ${expected.toISOString()} (got ${result instanceof Date ? result.toISOString() : result})`
    );
  }

  // 7) Caminho feliz — sequenciaPosicao=1 usa intervalosDias[1] (10 dias), não
  //    o mesmo degrau repetido indefinidamente (prova que o índice avança
  //    corretamente e não fica "preso" no primeiro degrau).
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "contatado", sequenciaPosicao: 1 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    const expected = addDays(INTERACAO_BASE, 10);
    check(
      sameDate(result, expected),
      `posição 1, intervalos [4,10,20]: devolve addDays(base, 10) = ${expected.toISOString()} (got ${result instanceof Date ? result.toISOString() : result})`
    );
  }

  // 7b) Caminho feliz — sequenciaPosicao=2 usa intervalosDias[2] (20 dias) —
  //     confirma que o último degrau configurado ainda produz sugestão (a
  //     borda oposta ao esgotamento do caso 5).
  {
    const result = computeSequenciaSugestao(
      lead({ origemTipo: "outbound", stage: "contatado", sequenciaPosicao: 2 }),
      INTERACAO_BASE,
      INTERVALOS
    );
    const expected = addDays(INTERACAO_BASE, 20);
    check(
      sameDate(result, expected),
      `posição 2 (último degrau), intervalos [4,10,20]: devolve addDays(base, 20) = ${expected.toISOString()} (got ${result instanceof Date ? result.toISOString() : result})`
    );
  }

  if (failed > 0) {
    console.error(`\n[test-compute-sequencia-sugestao] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-compute-sequencia-sugestao] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-compute-sequencia-sugestao] ERRO:", err.stack || err);
  process.exit(1);
});
