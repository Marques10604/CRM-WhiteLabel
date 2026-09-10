// Spike de MEDIÇÃO da configuração real do Claude Sonnet 5 para o Diagnóstico de
// IA da Campanha (Fase 23, plano 23-04 Task 3 / Open Question 1 do 23-RESEARCH).
//
// USO — executado UMA VEZ, à mão, com os outros processos node fechados (host
// 4GB):
//
//     node scripts/spike-modelo-diagnostico.mjs
//
// NÃO tem (nem deve ganhar) entrada em `package.json`: não é CI, faz uma chamada
// paga (~US$0,15–0,25) e precisa da `ANTHROPIC_API_KEY`. Ele fica no repo como
// instrumento de RE-medição quando o snapshot do modelo mudar.
//
// O QUE MEDE E IMPRIME (tudo que a pesquisa de fase deixou MEDIUM confidence):
//   1. duração total em segundos
//   2. inputTokens / outputTokens
//   3. finishReason  (se == "length" → maxOutputTokens apertado, Pitfall 9)
//   4. nº de buscas capturadas + o texto de cada uma; se vier 0, o JSON bruto
//      do 1º toolCall (assumption A5 — nome do campo da query != "query")
//   5. nº de fontes coletadas de res.sources (prova de Web Search habilitada)
//   6. o valor de avisoCrossCheck (null ou a ressalva)
//
// CARREGAMENTO DO .env.local: manual, via `process.loadEnvFile()` (nativo do
// Node 24). O Next carrega `.env.local` sozinho em runtime; um script solto não.
// Alternativa equivalente: `node --env-file=.env.local scripts/spike-...mjs`.
//
// LOADERS:
//   - `ts-alias-loader.mjs` resolve o alias "@/" para src/*.ts
//   - `test-support/server-only-stub-loader.mjs` neutraliza `import "server-only"`
//     de `@/lib/ai/gerar-diagnostico` (sem esse pacote em node_modules)

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = path.join(SCRIPTS_DIR, "..");

register("./ts-alias-loader.mjs", pathToFileURL(SCRIPTS_DIR + "/"));
register(
  "./test-support/server-only-stub-loader.mjs",
  pathToFileURL(SCRIPTS_DIR + "/"),
);

process.loadEnvFile(path.join(ROOT, ".env.local"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[spike] ANTHROPIC_API_KEY ausente — crie .env.local na raiz do projeto.");
  process.exit(1);
}

const { gerarDiagnostico } = await import("@/lib/ai/gerar-diagnostico");

// Nicho-gold do dataset da fase — costureira → veredito esperado "mudar_angulo".
const INPUT = {
  nicho: "costureira sob medida",
  oferta:
    "Ajustes e reformas de roupa com retirada e devolução em domicílio na zona sul de São Paulo",
  janelaDias: 90,
  meta: "3 clientes recorrentes fechados em 90 dias",
};

let telemetria = null;

const t0 = Date.now();
let resultado;
try {
  resultado = await gerarDiagnostico(INPUT, {
    onTelemetria: (dados) => {
      telemetria = dados;
    },
  });
} catch (err) {
  console.error("\n[spike] gerarDiagnostico LANÇOU — nada foi persistido:");
  console.error(err);
  process.exit(1);
}
const duracaoS = (Date.now() - t0) / 1000;

const finishReason = telemetria?.finishReason ?? "(sem telemetria)";

console.log("\n===== SPIKE — CONFIG DO CLAUDE SONNET 5 (medição real) =====");
console.log(`nicho de teste...........: ${INPUT.nicho}`);
console.log(`duração total............: ${duracaoS.toFixed(1)} s`);
console.log(`inputTokens..............: ${resultado.uso.inputTokens}`);
console.log(`outputTokens.............: ${resultado.uso.outputTokens}`);
console.log(`finishReason.............: ${finishReason}`);
console.log(`steps....................: ${telemetria?.steps ?? "?"}`);
console.log(`buscas capturadas........: ${resultado.buscas.length}`);
resultado.buscas.forEach((q, i) => console.log(`  busca[${i}]: ${q}`));
console.log(`fontes coletadas.........: ${resultado.fontes.length}`);
resultado.fontes.forEach((f, i) =>
  console.log(`  fonte[${i}]: ${f.url}${f.title ? ` — ${f.title}` : ""}`),
);
console.log(`avisoCrossCheck..........: ${resultado.avisoCrossCheck ?? "null"}`);
console.log(
  `veredito sugerido........: ${resultado.diagnostico.veredito_sugerido.decisao}`,
);

if (resultado.buscas.length === 0) {
  console.log(
    "\n[spike] buscas VAZIO — o nome do campo da query != 'query' (assumption A5).",
  );
  console.log("[spike] toolCalls brutos do 1º step (para achar o nome real):");
  console.log(JSON.stringify(telemetria?.toolCallsBrutos ?? [], null, 2));
}

if (finishReason === "length") {
  console.log(
    "\n[spike] ATENÇÃO: finishReason='length' — maxOutputTokens apertado. Subir e re-rodar UMA vez.",
  );
}

console.log(
  "\n[spike] OK (exit 0). Ajustar src/lib/ai/gerar-diagnostico.ts a partir dos números acima e registrar como D-23-04.",
);
process.exit(0);
