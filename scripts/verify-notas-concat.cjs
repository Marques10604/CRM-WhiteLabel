#!/usr/bin/env node
"use strict";

/**
 * Harness de verificação comportamental (10 cenários D-05..D-11 + Pitfalls
 * 1/4/5, ver 05-RESEARCH.md/05-CONTEXT.md da Fase 5) rodando contra o
 * CÓDIGO-FONTE REAL de src/lib/csv-import.ts — não uma cópia. Sem dependência
 * nova: usa só `fs`/`path` (nativos) e o pacote `typescript` já presente em
 * devDependencies (transpileModule). Precedente de estilo:
 * scripts/guard-no-hard-delete.cjs (script .cjs puro, process.exit(1) em
 * falha, sem test runner externo — o projeto não tem um).
 *
 * Uso: node scripts/verify-notas-concat.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "src", "lib", "csv-import.ts");

/**
 * Lê src/lib/csv-import.ts como texto, substitui a ÚNICA linha de import
 * (o alias "@/" não resolve fora do bundler Next.js) por um stub local
 * equivalente, transpila com typescript.transpileModule e avalia o JS
 * gerado via `new Function`. Isso testa o código-fonte REAL — se a linha de
 * import mudar (arquivo refatorado), falha explicitamente em vez de seguir
 * em silêncio testando um stub desatualizado.
 */
function loadCsvImportModule() {
  const raw = fs.readFileSync(SOURCE_PATH, "utf8");

  const IMPORT_LINE = 'import { normalizePhone } from "@/lib/phone";';
  if (!raw.includes(IMPORT_LINE)) {
    throw new Error(
      "import de @/lib/phone nao encontrado em src/lib/csv-import.ts — harness desatualizado, ajuste IMPORT_LINE"
    );
  }
  // Comportamento exato de normalizePhone não importa aqui — nenhum dos 10
  // cenários testa telefoneNormalizado, só o campo `notas`.
  const STUB =
    'function normalizePhone(v) { var d = String(v == null ? "" : v).replace(/\\D/g, ""); return d.length > 0 ? d : null; }';
  const patched = raw.replace(IMPORT_LINE, STUB);

  const { outputText } = ts.transpileModule(patched, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });

  const moduleObj = { exports: {} };
  const fn = new Function("module", "exports", "require", outputText);
  fn(moduleObj, moduleObj.exports, require);
  return moduleObj.exports;
}

const { buildNotasText, mapCsvRows, CSV_DEFAULTS } = loadCsvImportModule();

let failures = 0;

function assertEqual(scenario, actual, expected, note) {
  if (actual !== expected) {
    failures++;
    console.error(`FALHOU ${scenario}${note ? " — " + note : ""}`);
    console.error(`  esperado: ${JSON.stringify(expected)}`);
    console.error(`  recebido: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(scenario, condition, note) {
  if (!condition) {
    failures++;
    console.error(`FALHOU ${scenario}${note ? " — " + note : ""}`);
  }
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// FIXTURE base: ordem de colunas no arquivo = nome, score, telefone,
// sinal_dor, trecho_dor, observacao — só nome/telefone mapeados por padrão.
const BASE_MAPPING = {
  nome: "nome",
  telefone: "telefone",
  subnichoNome: null,
  canal: null,
  origem: null,
  valorEstimado: null,
  notas: null,
};

function makeRow(overrides) {
  return {
    nome: "Fulano",
    score: "4",
    telefone: "5511999999999",
    sinal_dor: "dor_confirmada",
    trecho_dor: "trecho de exemplo",
    observacao: "texto livre",
    ...overrides,
  };
}

// S1 (IMPORT-05/D-11): CSV simples 1-pra-1 — mesmo texto de hoje, sem rótulo, sem sufixo.
{
  const mapping = { ...BASE_MAPPING, notas: "observacao" };
  const rows = [makeRow({})];
  const result = mapCsvRows(rows, mapping, []);
  assertEqual(
    "S1",
    result[0].notas,
    "texto livre",
    "IMPORT-05/D-11: mapeamento 1-pra-1 simples deve produzir exatamente o mesmo texto de hoje"
  );
}

// S2 (D-11): nada mapeado nem marcado -> default existente, comportamento inalterado.
{
  const mapping = { ...BASE_MAPPING, notas: null };
  const rows = [makeRow({})];
  const result = mapCsvRows(rows, mapping, []);
  assertEqual("S2", result[0].notas, CSV_DEFAULTS.notas, "D-11: sem notas mapeada nem extras, deve cair no default");
}

// S3 (D-10/D-05/D-06): notas 1-pra-1 + extras concatenados, notas primeiro sem rótulo.
{
  const mapping = { ...BASE_MAPPING, notas: "observacao" };
  const rows = [makeRow({})];
  const result = mapCsvRows(rows, mapping, ["score", "sinal_dor"]);
  assertEqual(
    "S3",
    result[0].notas,
    "texto livre\nscore: 4\nsinal_dor: dor_confirmada",
    "D-10/D-05/D-06: notas 1-pra-1 primeiro sem rótulo, extras com rótulo exato, junção por \\n"
  );
}

// S4 (Pitfall 1 — REGRESSÃO CRÍTICA): notas 1-pra-1 vazia + extras preenchidas -> NUNCA o default no meio.
{
  const mapping = { ...BASE_MAPPING, notas: "observacao" };
  const rows = [makeRow({ observacao: "" })];
  const result = mapCsvRows(rows, mapping, ["score", "sinal_dor"]);
  assertTrue(
    "S4",
    !result[0].notas.includes(CSV_DEFAULTS.notas),
    "Pitfall 1: o fallback nunca pode aparecer misturado com colunas extras reais"
  );
  assertEqual(
    "S4",
    result[0].notas,
    "score: 4\nsinal_dor: dor_confirmada",
    "Pitfall 1: resultado exato esperado, sem o texto padrão"
  );
}

// S5 (D-08): ordem de clique invertida -> saída sempre na ordem do arquivo.
{
  const mapping = { ...BASE_MAPPING, notas: null };
  const rows = [makeRow({})];
  const result = mapCsvRows(rows, mapping, ["observacao", "sinal_dor", "score"]);
  assertEqual(
    "S5",
    result[0].notas,
    "score: 4\nsinal_dor: dor_confirmada\nobservacao: texto livre",
    "D-08: ordem de concatenação = ordem do arquivo, nunca ordem de clique do admin"
  );
}

// S6 (D-07): célula vazia numa coluna extra omite a linha inteira (nunca "header: " vazio).
{
  const mapping = { ...BASE_MAPPING, notas: null };
  const rows = [makeRow({ sinal_dor: "" })];
  const result = mapCsvRows(rows, mapping, ["score", "sinal_dor", "trecho_dor"]);
  assertTrue("S6", !result[0].notas.includes("sinal_dor"), "D-07: header de célula vazia não deve aparecer nem como rótulo");
  assertTrue("S6", !result[0].notas.includes(": \n"), "D-07: nunca deve haver rótulo vazio seguido de quebra de linha");
  assertTrue("S6", !result[0].notas.endsWith(": "), "D-07: nunca deve terminar com rótulo vazio");
}

// S7 (Pitfall 5): colunas extras marcadas globalmente mas TODAS as células vazias -> default.
{
  const mapping = { ...BASE_MAPPING, notas: "observacao" };
  const rows = [makeRow({ observacao: "", score: "", sinal_dor: "", trecho_dor: "" })];
  const result = mapCsvRows(rows, mapping, ["score", "sinal_dor", "trecho_dor"]);
  assertEqual(
    "S7",
    result[0].notas,
    CSV_DEFAULTS.notas,
    "Pitfall 5: linha com tudo vazio deve cair no default, nunca violar csvRowSchema.notas.min(1)"
  );
}

// S8 (Pitfall 4): header usado em campo fixo (origem) E marcado como extra -> aparece 1x, nunca duplicado.
{
  const mapping = { ...BASE_MAPPING, notas: null, origem: "observacao" };
  const rows = [makeRow({ observacao: "observacao" })];
  const result = mapCsvRows(rows, mapping, ["observacao", "score"]);
  const combined = `${result[0].origem}\n${result[0].notas}`;
  assertEqual(
    "S8",
    countOccurrences(combined, "observacao"),
    1,
    "Pitfall 4: coluna já usada em campo fixo nunca é concatenada de novo como extra"
  );
}

// S9 (Assumption A1): mapCsvRows com 2 argumentos continua funcionando (compatibilidade).
{
  const mappingWithNotas = { ...BASE_MAPPING, notas: "observacao" };
  const rowsWithNotas = [makeRow({})];
  let resultWithNotas;
  try {
    resultWithNotas = mapCsvRows(rowsWithNotas, mappingWithNotas);
  } catch (err) {
    failures++;
    console.error(`FALHOU S9 — mapCsvRows(rows, mapping) com 2 argumentos lançou: ${err.message}`);
  }
  if (resultWithNotas) {
    assertEqual(
      "S9",
      resultWithNotas[0].notas,
      "texto livre",
      "Assumption A1: 2 argumentos deve produzir o mesmo comportamento de hoje (coluna mapeada)"
    );
  }

  const mappingDefault = { ...BASE_MAPPING, notas: null };
  const rowsDefault = [makeRow({})];
  let resultDefault;
  try {
    resultDefault = mapCsvRows(rowsDefault, mappingDefault);
  } catch (err) {
    failures++;
    console.error(`FALHOU S9 — mapCsvRows(rows, mapping) com 2 argumentos lançou (caso default): ${err.message}`);
  }
  if (resultDefault) {
    assertEqual(
      "S9",
      resultDefault[0].notas,
      CSV_DEFAULTS.notas,
      "Assumption A1: 2 argumentos deve produzir o default de hoje quando nada mapeado"
    );
  }
}

// S10 (D-08 + Pitfall 3): csvHeaderOrder com header ausente na linha não lança, só ignora.
{
  const mapping = { ...BASE_MAPPING, notas: null };
  const row = makeRow({});
  const csvHeaderOrder = ["nome", "score", "telefone", "sinal_dor", "trecho_dor", "observacao", "coluna_fantasma"];
  let result;
  try {
    result = buildNotasText(row, mapping, ["coluna_fantasma", "score"], csvHeaderOrder);
  } catch (err) {
    failures++;
    console.error(`FALHOU S10 — buildNotasText lançou com header ausente na linha: ${err.message}`);
  }
  if (result !== undefined) {
    assertEqual("S10", result, "score: 4", "Pitfall 3: header ausente na linha deve ser ignorado silenciosamente");
  }
}

if (failures > 0) {
  console.error(`\n${failures} cenario(s) falharam.`);
  process.exit(1);
}

console.log("OK: 10 cenarios de concatenacao de notas");
process.exit(0);
