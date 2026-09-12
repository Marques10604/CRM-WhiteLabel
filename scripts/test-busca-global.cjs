#!/usr/bin/env node
"use strict";

/**
 * Harness Node puro do módulo `src/lib/busca-global.ts` (quick task
 * 260912-pzc, BUSCA-03/BUSCA-04). Sem DOM, sem banco, sem React — exercita
 * só as funções puras de normalização/escape/gate.
 *
 * Rodar via: node scripts/test-busca-global.cjs (ou npm run test:busca-global)
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
  const m = await import("@/lib/busca-global");
  const {
    TAMANHO_MINIMO_BUSCA,
    LIMITE_POR_GRUPO,
    normalizarTermo,
    deveBuscar,
    escaparLike,
    padraoContem,
    somenteDigitos,
    deveBuscarPorTelefone,
  } = m;

  // --- constantes ---
  check(TAMANHO_MINIMO_BUSCA === 2, `TAMANHO_MINIMO_BUSCA === 2 (got ${TAMANHO_MINIMO_BUSCA})`);
  check(LIMITE_POR_GRUPO === 5, `LIMITE_POR_GRUPO === 5 (got ${LIMITE_POR_GRUPO})`);

  // --- normalizarTermo ---
  check(
    normalizarTermo("  ana   maria  ") === "ana maria",
    `normalizarTermo colapsa espaços e faz trim (got ${JSON.stringify(normalizarTermo("  ana   maria  "))})`
  );

  // --- deveBuscar ---
  check(deveBuscar("") === false, `deveBuscar("") === false`);
  check(deveBuscar("a") === false, `deveBuscar("a") === false`);
  check(deveBuscar("   a   ") === false, `deveBuscar("   a   ") === false`);
  check(deveBuscar("an") === true, `deveBuscar("an") === true`);
  check(deveBuscar(" ana ") === true, `deveBuscar(" ana ") === true`);

  // --- escaparLike ---
  check(escaparLike("ana") === "ana", `escaparLike("ana") === "ana" (termo comum intacto)`);
  check(
    escaparLike("100%") === "100\\%",
    `escaparLike("100%") === "100\\\\%" (got ${JSON.stringify(escaparLike("100%"))})`
  );
  check(
    escaparLike("a_b") === "a\\_b",
    `escaparLike("a_b") === "a\\\\_b" (got ${JSON.stringify(escaparLike("a_b"))})`
  );
  check(
    escaparLike("c\\d") === "c\\\\d",
    `escaparLike("c\\\\d") === "c\\\\\\\\d" (contrabarra escapada) (got ${JSON.stringify(escaparLike("c\\d"))})`
  );
  check(
    escaparLike("%\\_") === "\\%\\\\\\_",
    `escaparLike("%\\\\_") prova que a contrabarra é escapada PRIMEIRO (got ${JSON.stringify(escaparLike("%\\_"))})`
  );

  // --- padraoContem ---
  check(padraoContem("Ana") === "%ana%", `padraoContem("Ana") === "%ana%" (got ${JSON.stringify(padraoContem("Ana"))})`);
  check(
    padraoContem("50%") === "%50\\%%",
    `padraoContem("50%") === "%50\\\\%%" — só os % de envelope são curinga (got ${JSON.stringify(padraoContem("50%"))})`
  );

  // --- somenteDigitos ---
  check(
    somenteDigitos("(11) 98765-4321") === "11987654321",
    `somenteDigitos extrai só dígitos (got ${JSON.stringify(somenteDigitos("(11) 98765-4321"))})`
  );
  check(somenteDigitos("ana") === "", `somenteDigitos("ana") === "" (got ${JSON.stringify(somenteDigitos("ana"))})`);

  // --- deveBuscarPorTelefone ---
  check(deveBuscarPorTelefone("ana") === false, `deveBuscarPorTelefone("ana") === false`);
  check(deveBuscarPorTelefone("11") === true, `deveBuscarPorTelefone("11") === true`);
  check(deveBuscarPorTelefone("(1)") === false, `deveBuscarPorTelefone("(1)") === false (só 1 dígito)`);

  if (failed > 0) {
    console.error(`\n[test-busca-global] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-busca-global] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-busca-global] ERRO:", err.stack || err);
  process.exit(1);
});
