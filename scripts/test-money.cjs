// Verifica o contrato monetário de src/lib/money.ts (Task 1 do plano 01-02):
// parseBRLToCents (pt-BR string -> integer centavos, round-half-up, pré-validação
// estrita) e formatCentsToBRL (centavos -> "R$ 1.234,56"). Importa o módulo .ts
// real via scripts/ts-alias-loader.mjs (sem duplicar a lógica).
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

const VALID_CASES = [
  // [input, centavos esperados]
  ["1.234,56", 123456], // ponto = milhar, vírgula = decimal
  ["R$ 1.234,56", 123456], // prefixo R$ + espaço tolerados
  ["0,99", 99], // só centavos
  ["5", 500], // inteiro sem decimal = reais
  ["1000", 100000],
  ["1.000", 100000],
  ["1,235", 124], // round-half-up no 3º dígito decimal (123,5 -> 124)
  ["1,234", 123], // round-half-down descarta (123,4 -> 123)
  ["0", 0], // valor zero explícito é válido
  ["0,00", 0],
];

// Vazio ou com caractere inválido embutido -> NaN (rejeitado pela pré-validação
// estrita, nunca reduzido silenciosamente a um número parcial).
const NAN_CASES = ["", "   ", "abc", "abc1", "1abc", "12x34"];

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

import("@/lib/money")
  .then(({ parseBRLToCents, formatCentsToBRL }) => {
    for (const [input, expected] of VALID_CASES) {
      const actual = parseBRLToCents(input);
      check(
        actual === expected,
        `parseBRLToCents(${JSON.stringify(input)}) === ${expected} (got ${actual})`
      );
    }

    for (const input of NAN_CASES) {
      const actual = parseBRLToCents(input);
      check(
        Number.isNaN(actual),
        `parseBRLToCents(${JSON.stringify(input)}) is NaN (got ${actual})`
      );
    }

    // Intl.NumberFormat('pt-BR', ...) usa U+00A0 (espaço não separável) entre
    // "R$" e o valor, não um espaço comum — normalizar antes de comparar com
    // a string literal do contrato ("R$ 1.234,56").
    const normalizeNbsp = (s) => s.replace(/ /g, " ");

    const formatted = formatCentsToBRL(123456);
    check(
      normalizeNbsp(formatted) === "R$ 1.234,56",
      `formatCentsToBRL(123456) === "R$ 1.234,56" (got ${JSON.stringify(formatted)})`
    );

    const formattedZero = formatCentsToBRL(0);
    check(
      normalizeNbsp(formattedZero) === "R$ 0,00",
      `formatCentsToBRL(0) === "R$ 0,00" (got ${JSON.stringify(formattedZero)})`
    );

    if (failed > 0) {
      console.error(`\n[test-money] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log(`\n[test-money] OK: ${VALID_CASES.length + NAN_CASES.length + 2} asserções passaram.`);
  })
  .catch((err) => {
    console.error("[test-money] ERRO AO IMPORTAR:", err.stack || err);
    process.exit(1);
  });
