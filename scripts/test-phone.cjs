// Verifica o contrato de src/lib/phone.ts (Task 1 do plano 01-02): normalizePhone
// formatação -> dígitos-only E.164-like com DDI 55, retornando null se inválido.
// Importa o módulo .ts real via scripts/ts-alias-loader.mjs (sem duplicar lógica).
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

const VALID_CASES = [
  ["(11) 91234-5678", "5511912345678"], // móvel: 55 + DDD 11 + 9 dígitos
  ["11 3123-4567", "551131234567"], // fixo: 55 + DDD 11 + 8 dígitos
  ["+55 (11) 91234-5678", "5511912345678"], // já tem DDI, não duplica
  ["5511912345678", "5511912345678"], // já normalizado, idempotente
];

const NULL_CASES = [
  "1234", // dígitos insuficientes
  "11abc91234", // após tirar não-dígitos sobram "1191234" = curto demais
];

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

import("@/lib/phone")
  .then(({ normalizePhone }) => {
    for (const [input, expected] of VALID_CASES) {
      const actual = normalizePhone(input);
      check(
        actual === expected,
        `normalizePhone(${JSON.stringify(input)}) === ${JSON.stringify(expected)} (got ${JSON.stringify(actual)})`
      );
    }

    for (const input of NULL_CASES) {
      const actual = normalizePhone(input);
      check(
        actual === null,
        `normalizePhone(${JSON.stringify(input)}) === null (got ${JSON.stringify(actual)})`
      );
    }

    if (failed > 0) {
      console.error(`\n[test-phone] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log(`\n[test-phone] OK: ${VALID_CASES.length + NULL_CASES.length} asserções passaram.`);
  })
  .catch((err) => {
    console.error("[test-phone] ERRO AO IMPORTAR:", err.stack || err);
    process.exit(1);
  });
