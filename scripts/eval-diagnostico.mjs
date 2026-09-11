// Eval on-demand do Diagnóstico de IA da Campanha (Fase 23, plano 23-06).
//
// USO — executado À MÃO, NUNCA em CI, com os outros processos node fechados
// (host de 4GB):
//
//     node scripts/eval-diagnostico.mjs               # roda todos os casos de test/nichos-referencia.json
//     node scripts/eval-diagnostico.mjs --gold         # roda só os 3 casos gold (gate manual de merge)
//     node scripts/eval-diagnostico.mjs --niche "<id ou nicho>"   # roda 1 caso só
//     node scripts/eval-diagnostico.mjs --help         # imprime o uso e sai sem chamar a API
//
// O harness estrutural (scripts/test-diagnostico-estrutural.cjs, plano 23-01) prova a
// FORMA sobre fixtures escritas à mão. Este eval prova o que importa de verdade: chama
// gerarDiagnostico() de VERDADE contra os nichos de referência, aplica os mesmos
// portões estruturais sobre a saída REAL, submete as dimensões subjetivas a um
// LLM-judge hand-rolled, e escreve um relatório markdown datado.
//
// CUSTO REAL: cada caso é 1 geração (gerarDiagnostico, ~US$0,20-0,30) + 1 chamada de
// juiz (generateText sem tools, mais barata). Execução SEMPRE sequencial — nunca em
// paralelo — o host de 4GB não aguenta, e cada geração leva 30 a 90s.
//
// Ao final escreve test/reports/<YYYY-MM-DD>-eval-diagnostico.md, COMMITADO (D-23-05)
// — a evidência comparável entre execuções que o 23-AI-SPEC §5 pede.
//
// process.exit(1) se qualquer caso gold divergir do veredito_esperado (ou não tiver
// gerado resultado) OU se qualquer portão estrutural falhar sobre a saída real — o
// eval serve de gate manual de merge.
//
// CARREGAMENTO DO .env.local: manual, via process.loadEnvFile() (nativo do Node 24),
// mesma técnica do scripts/spike-modelo-diagnostico.mjs (plano 23-04). O Next carrega
// .env.local sozinho em runtime; um script solto não.
//
// LOADERS (mesma técnica do spike):
//   - ts-alias-loader.mjs resolve o alias "@/" para src/*.ts
//   - test-support/server-only-stub-loader.mjs neutraliza `import "server-only"` de
//     @/lib/ai/gerar-diagnostico (sem esse pacote em node_modules fora do Next)

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = path.join(SCRIPTS_DIR, "..");

register("./ts-alias-loader.mjs", pathToFileURL(SCRIPTS_DIR + "/"));
register(
  "./test-support/server-only-stub-loader.mjs",
  pathToFileURL(SCRIPTS_DIR + "/"),
);

const USO = `Uso:
  node scripts/eval-diagnostico.mjs                          Roda todos os casos de test/nichos-referencia.json
  node scripts/eval-diagnostico.mjs --gold                   Roda só os 3 casos gold (gate manual de merge)
  node scripts/eval-diagnostico.mjs --niche "<id ou nicho>"  Roda um caso só
  node scripts/eval-diagnostico.mjs --help                   Mostra esta mensagem e sai sem chamar a API

Cada caso custa dinheiro real (1 geração + 1 chamada de juiz, ~US$0,30/caso gold).
Roda À MÃO, sozinho (feche outros processos node — host de 4GB), NUNCA em CI.
Escreve um relatório datado em test/reports/, commitado no fim da execução.`;

const MAX_USES = 6; // teto de buscas travado em webSearch_20250305({ maxUses: 6 })
const DECISOES_VALIDAS = ["aprofundar", "mudar_angulo", "abandonar"];
// 3ª categoria "relato_qualitativo" (ajuste estrutural 23-06, commit f621c51):
// um relato real de 1 fonte identificável que não é contagem/preço medido nem
// copy de venda do concorrente.
const TIPOS_ACHADO_VALIDOS = [
  "dado_quantificavel",
  "relato_qualitativo",
  "alegacao_marketing",
];

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(USO);
  process.exit(0);
}

const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[eval-diagnostico] ANTHROPIC_API_KEY ausente — crie .env.local na raiz do projeto com ANTHROPIC_API_KEY=sk-ant-...\n",
  );
  console.error(USO);
  process.exit(1);
}

const { gerarDiagnostico } = await import("@/lib/ai/gerar-diagnostico");
const { diagnosticoSchema, urlSegura } = await import(
  "@/lib/ai/diagnostico-schema"
);
const { generateText, Output } = await import("ai");
const { anthropic } = await import("@ai-sdk/anthropic");
const { z } = await import("zod");

// ---------- Dataset ----------
const DATASET_PATH = path.join(ROOT, "test", "nichos-referencia.json");
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));

function selecionarCasos() {
  if (args.includes("--gold")) {
    return dataset.filter((c) => c.categoria === "gold");
  }
  const nicheIdx = args.indexOf("--niche");
  if (nicheIdx !== -1) {
    const alvo = args[nicheIdx + 1];
    if (!alvo) {
      console.error(
        '[eval-diagnostico] --niche precisa de um valor (id ou nicho). Ex.: --niche "costureira-sob-medida"',
      );
      process.exit(1);
    }
    const encontrado = dataset.filter(
      (c) => c.id === alvo || c.nicho === alvo,
    );
    if (encontrado.length === 0) {
      console.error(
        `[eval-diagnostico] nenhum caso encontrado para "${alvo}" em test/nichos-referencia.json.`,
      );
      process.exit(1);
    }
    return encontrado;
  }
  return dataset;
}

const casos = selecionarCasos();

// ---------- Schema local do LLM-judge (dimensões subjetivas 3/4/6/7/8) ----------
const judgeDimensaoSchema = z.object({
  veredicto: z.enum(["PASS", "FAIL"]),
  nota: z.number().int().min(1).max(5),
  razao: z.string().min(5).max(400),
});

const judgeSchema = z.object({
  especificidade_gatilhos: judgeDimensaoSchema, // dim 3
  leitura_saturacao: judgeDimensaoSchema, // dim 4
  separacao_dado_marketing: judgeDimensaoSchema, // dim 6
  logica_veredito: judgeDimensaoSchema, // dim 7
  qualidade_rascunho: judgeDimensaoSchema, // dim 8
});

const RUBRICA_JUIZ = `Você é um consultor experiente de go-to-market avaliando, no papel de segunda opinião, um diagnóstico de exploração de nicho gerado por IA para um operador solo brasileiro (motoboy/prestador de serviço que constrói o próprio negócio, sem time de marketing). Avalie as 5 dimensões abaixo sobre o diagnóstico recebido. Para cada uma, dê um veredicto PASS ou FAIL, uma nota de 1 a 5 e uma razão curta em PT-BR.

1. especificidade_gatilhos — PASS: cada gatilho de dor descreve uma situação concreta e observável do nicho (quem, quando, frequência/severidade), ligada a uma fonte real. FAIL: dor que caberia em qualquer serviço ("precisa de mais clientes", "concorrência acirrada"), ou inferida sem fonte que a sustente.
2. leitura_saturacao — PASS: distingue "há muitos concorrentes" de "o mercado não comporta mais um entrante lucrativamente"; conta concorrentes diretos no ângulo específico da oferta, não o setor inteiro. FAIL: trata a contagem de concorrentes como veredito automático, ou define concorrência larga demais (viés de sobrevivência incluso).
3. separacao_dado_marketing — PASS: achados marcados "dado_quantificavel" são contagens/preços realmente observados; achados marcados "alegacao_marketing" são copy de venda do concorrente sobre si mesmo, e NUNCA são usados para derivar saturação, ticket ou veredito. FAIL: mistura os dois com o mesmo peso, ou a tag está objetivamente errada para o conteúdo da afirmação.
4. logica_veredito — PASS: a justificativa do veredito reconstrói o raciocínio a partir dos achados apresentados (saturação + força dos gatilhos + ticket versus esforço), de um jeito que um humano consegue refazer o caminho. FAIL: o veredito não decorre dos dados, ou a justificativa apenas repete os achados sem pesá-los.
5. qualidade_rascunho — PASS: o rascunho de primeira mensagem abre pelo gatilho de dor mais forte, em linguagem que o próprio prospect usaria, com uma oferta concreta e um próximo passo pequeno; o operador reconheceria "é assim que eu falaria". FAIL: template genérico de prospecção que serviria para qualquer nicho.

Responda somente com o objeto estruturado pedido.`;

async function rodarJuiz(diagnostico) {
  const res = await generateText({
    model: anthropic("claude-sonnet-5"),
    temperature: 0,
    system: RUBRICA_JUIZ,
    prompt: `Diagnóstico a avaliar (JSON completo):\n${JSON.stringify(diagnostico, null, 2)}`,
    output: Output.object({ schema: judgeSchema }),
  });
  return { julgamento: res.output, uso: res.usage };
}

// ---------- Portões estruturais aplicados sobre a saída REAL (dims 1, 2, 5, 6, 9) ----------
function aplicarPortoesEstruturais(diagnostico, fontesReais, buscas) {
  const falhas = [];

  const parse = diagnosticoSchema.safeParse(diagnostico);
  if (!parse.success) falhas.push("schema Zod inválido sobre a saída real");

  const nMaisForte = diagnostico.gatilhos_dor.filter(
    (g) => g.mais_forte === true,
  ).length;
  if (nMaisForte !== 1) {
    falhas.push(
      `gatilhos_dor: ${nMaisForte} marcado(s) mais_forte (esperado exatamente 1)`,
    );
  }

  if (diagnostico.achados.length < 3) {
    falhas.push(`achados: ${diagnostico.achados.length} item(ns) (esperado >= 3)`);
  }
  if (!diagnostico.achados.every((a) => TIPOS_ACHADO_VALIDOS.includes(a.tipo))) {
    falhas.push("achados: algum item com tipo fora do enum dado/marketing");
  }

  const nObj = diagnostico.objecoes.length;
  if (nObj < 2 || nObj > 3) {
    falhas.push(`objecoes: ${nObj} item(ns) (esperado 2-3)`);
  }

  if (!(diagnostico.ticket_medio.valor_estimado_brl > 0)) {
    falhas.push("ticket_medio.valor_estimado_brl não é positivo");
  }

  if (!DECISOES_VALIDAS.includes(diagnostico.veredito_sugerido.decisao)) {
    falhas.push("veredito_sugerido.decisao fora do enum");
  }

  if (fontesReais.length < 1) {
    falhas.push("fontes reais: 0 (o gate de zero-fontes deveria ter rejeitado antes)");
  }

  const urlsReais = new Set(fontesReais.map((f) => f.url));
  const urlsCitadas = [
    ...diagnostico.achados.map((a) => a.fonte_url),
    diagnostico.ticket_medio.fonte_url,
    ...diagnostico.gatilhos_dor.map((g) => g.observavel_em),
    ...diagnostico.indice_saturacao.fontes,
  ];
  const foraDasFontes = urlsCitadas.filter((u) => !urlsReais.has(u));
  if (foraDasFontes.length > 0) {
    falhas.push(
      `cross-check: ${foraDasFontes.length} URL(s) citada(s) no objeto não constam nas fontes reais`,
    );
  }

  const urlsRenderaveis = [...new Set([...urlsCitadas, ...urlsReais])];
  const urlsInseguras = urlsRenderaveis.filter((u) => !urlSegura(u));
  if (urlsInseguras.length > 0) {
    falhas.push(
      `urlSegura: ${urlsInseguras.length} URL(s) com esquema inseguro entre as renderizáveis`,
    );
  }

  if (buscas.length > MAX_USES) {
    falhas.push(`buscas: ${buscas.length} (teto ${MAX_USES})`);
  }

  return falhas;
}

// ---------- Execução SEMPRE sequencial — nunca duas gerações ao mesmo tempo ----------
async function main() {
  const resultados = [];

  console.log(
    `[eval-diagnostico] ${casos.length} caso(s) a rodar, um de cada vez (host de 4GB).\n`,
  );

  for (const caso of casos) {
    console.log(`--- ${caso.id} (${caso.categoria}) ---`);
    const t0 = Date.now();
    let telemetria = null;

    try {
      const r = await gerarDiagnostico(
        {
          nicho: caso.nicho,
          oferta: caso.oferta,
          janelaDias: caso.janelaDias,
          meta: caso.meta,
        },
        {
          onTelemetria: (dados) => {
            telemetria = dados;
          },
        },
      );
      const duracaoS = (Date.now() - t0) / 1000;

      const falhasEstruturais = aplicarPortoesEstruturais(
        r.diagnostico,
        r.fontes,
        r.buscas,
      );

      let vereditoResultado = null;
      if (caso.categoria === "gold") {
        vereditoResultado =
          r.diagnostico.veredito_sugerido.decisao === caso.veredito_esperado
            ? "PASS"
            : "REGRESSAO";
      }

      console.log(
        `  geração OK em ${duracaoS.toFixed(1)}s — veredito: ${r.diagnostico.veredito_sugerido.decisao}`,
      );
      if (falhasEstruturais.length > 0) {
        console.log(`  PORTOES ESTRUTURAIS: ${falhasEstruturais.length} falha(s)`);
        falhasEstruturais.forEach((f) => console.log(`    FAIL ${f}`));
      } else {
        console.log("  portões estruturais: OK");
      }

      // O juiz é um custo SEPARADO da geração. Se ele falhar (ex.: o próprio
      // juiz não emitiu um objeto válido), isso NÃO pode derrubar o resultado
      // da geração que já teve sucesso — o caso ainda vira uma linha "ok" no
      // relatório, só sem notas de juiz (Rule 1 - bug corrigido no plano
      // 23-06: um catch único em volta de geração+juiz perdia o veredito real
      // de casos cujo juiz falhasse).
      console.log("  chamando o juiz (2º custo por caso)...");
      let julgamento = null;
      let usoJuiz = null;
      let juizErro = null;
      try {
        const resJuiz = await rodarJuiz(r.diagnostico);
        julgamento = resJuiz.julgamento;
        usoJuiz = resJuiz.uso;
        console.log("  juiz OK");
      } catch (errJuiz) {
        juizErro = errJuiz instanceof Error ? errJuiz.message : String(errJuiz);
        console.error(`  juiz LANÇOU (não derruba o resultado da geração): ${juizErro}`);
      }

      resultados.push({
        caso,
        status: "ok",
        diagnostico: r.diagnostico,
        fontes: r.fontes,
        buscas: r.buscas,
        duracaoS,
        uso: r.uso,
        finishReason: telemetria?.finishReason ?? null,
        avisoCrossCheck: r.avisoCrossCheck,
        falhasEstruturais,
        vereditoResultado,
        julgamento,
        usoJuiz,
        juizErro,
      });
    } catch (err) {
      const duracaoS = (Date.now() - t0) / 1000;
      const mensagem = err instanceof Error ? err.message : String(err);
      console.error(`  LANÇOU: ${mensagem}`);
      resultados.push({
        caso,
        status: "erro",
        erro: mensagem,
        duracaoS,
      });
    }
    console.log("");
  }

  return resultados;
}

// ---------- Custo estimado ----------
// Preços do Claude Sonnet 5 medidos no 23-RESEARCH.md (US$2/1M input, US$10/1M output)
// + web search US$10/1.000 buscas. Estimativa, não fatura oficial.
function estimarCusto(resultado) {
  if (resultado.status !== "ok") return 0;
  const custoBuscas = resultado.buscas.length * 0.01;
  const custoGeracao =
    (resultado.uso.inputTokens / 1e6) * 2 + (resultado.uso.outputTokens / 1e6) * 10;
  const custoJuiz = resultado.usoJuiz
    ? ((resultado.usoJuiz.inputTokens ?? 0) / 1e6) * 2 +
      ((resultado.usoJuiz.outputTokens ?? 0) / 1e6) * 10
    : 0;
  return custoBuscas + custoGeracao + custoJuiz;
}

// ---------- Relatório markdown datado (D-23-05: COMMITADO, evidência comparável) ----------
function montarRelatorio(resultados, escopo) {
  const agora = new Date();
  const dataISO = agora.toISOString().slice(0, 10);
  const linhas = [];

  linhas.push(`# Relatório de Eval — Diagnóstico de IA da Campanha`);
  linhas.push("");
  linhas.push(`**Data:** ${agora.toISOString()}`);
  linhas.push(`**Escopo:** ${escopo}`);
  linhas.push(`**Casos rodados:** ${resultados.length}`);
  linhas.push("");

  linhas.push("## Resumo por caso");
  linhas.push("");
  linhas.push(
    "| id | categoria | veredito esperado | veredito obtido | resultado | portões | fontes | buscas | tokens in/out | duração |",
  );
  linhas.push(
    "|----|-----------|--------------------|-------------------|-----------|---------|--------|--------|----------------|---------|",
  );
  for (const r of resultados) {
    if (r.status === "ok") {
      const portoes =
        r.falhasEstruturais.length === 0
          ? "OK"
          : `FAIL (${r.falhasEstruturais.length})`;
      linhas.push(
        `| ${r.caso.id} | ${r.caso.categoria} | ${r.caso.veredito_esperado ?? "—"} | ${r.diagnostico.veredito_sugerido.decisao} | ${r.vereditoResultado ?? "N/A"} | ${portoes} | ${r.fontes.length} | ${r.buscas.length} | ${r.uso.inputTokens}/${r.uso.outputTokens} | ${r.duracaoS.toFixed(1)}s |`,
      );
    } else {
      linhas.push(
        `| ${r.caso.id} | ${r.caso.categoria} | ${r.caso.veredito_esperado ?? "—"} | ERRO | ${r.caso.categoria === "gold" ? "REGRESSAO" : "N/A"} | — | — | — | — | ${r.duracaoS.toFixed(1)}s |`,
      );
    }
  }
  linhas.push("");

  linhas.push("## Detalhe por caso");
  linhas.push("");
  for (const r of resultados) {
    linhas.push(`### ${r.caso.id} (${r.caso.categoria})`);
    linhas.push("");
    linhas.push(`**Nota do dataset:** ${r.caso.nota}`);
    linhas.push("");
    if (r.status === "erro") {
      linhas.push(`**RESULTADO: ERRO** — \`${r.erro}\``);
      linhas.push("");
      continue;
    }
    linhas.push(`**Veredito sugerido:** \`${r.diagnostico.veredito_sugerido.decisao}\``);
    linhas.push("");
    linhas.push(`**Justificativa:** ${r.diagnostico.veredito_sugerido.justificativa}`);
    linhas.push("");
    // Contagem por categoria (ajuste estrutural 23-06): visibilidade direta de
    // quantos achados/gatilhos caíram em cada categoria de evidência — é o que
    // a REGRA DE ESCOLHA DO VEREDITO (diagnostico-prompt.ts) agora usa.
    {
      const porTipo = { dado_quantificavel: 0, relato_qualitativo: 0, alegacao_marketing: 0 };
      r.diagnostico.achados.forEach((a) => {
        porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
      });
      const porEvidencia = { padrao_confirmado: 0, relato_isolado: 0 };
      r.diagnostico.gatilhos_dor.forEach((g) => {
        porEvidencia[g.evidencia] = (porEvidencia[g.evidencia] ?? 0) + 1;
      });
      const gatilhoMaisForte = r.diagnostico.gatilhos_dor.find((g) => g.mais_forte);
      linhas.push(
        `**Achados por categoria:** dado_quantificavel=${porTipo.dado_quantificavel}, relato_qualitativo=${porTipo.relato_qualitativo}, alegacao_marketing=${porTipo.alegacao_marketing}`,
      );
      linhas.push(
        `**Gatilhos por evidência:** padrao_confirmado=${porEvidencia.padrao_confirmado}, relato_isolado=${porEvidencia.relato_isolado} — gatilho mais_forte tem evidencia \`${gatilhoMaisForte?.evidencia ?? "N/A"}\``,
      );
      linhas.push("");
    }
    if (r.falhasEstruturais.length > 0) {
      linhas.push("**Falhas de portão estrutural:**");
      r.falhasEstruturais.forEach((f) => linhas.push(`- FAIL ${f}`));
      linhas.push("");
    }
    if (r.avisoCrossCheck) {
      linhas.push(`**Aviso de cross-check (não bloqueia):** ${r.avisoCrossCheck}`);
      linhas.push("");
    }
    if (r.julgamento) {
      linhas.push("**Notas do juiz (dimensões subjetivas):**");
      linhas.push("");
      linhas.push("| dimensão | veredicto | nota | razão |");
      linhas.push("|----------|-----------|------|-------|");
      for (const [chave, valor] of Object.entries(r.julgamento)) {
        linhas.push(`| ${chave} | ${valor.veredicto} | ${valor.nota}/5 | ${valor.razao} |`);
      }
      linhas.push("");
    } else {
      linhas.push(
        `**Notas do juiz: INDISPONÍVEIS** — a chamada do juiz falhou (\`${r.juizErro}\`), mas o veredito e os portões estruturais acima vêm da geração real, que teve sucesso.`,
      );
      linhas.push("");
    }
    linhas.push(
      `**Fontes coletadas (${r.fontes.length}):** ${r.fontes.map((f) => f.url).join(", ")}`,
    );
    linhas.push("");
    linhas.push(`**Buscas efetivas (${r.buscas.length}):** ${r.buscas.join(" · ") || "(nenhuma capturada)"}`);
    linhas.push("");
  }

  linhas.push("## Discriminação nos 3 gold");
  linhas.push("");
  const goldResultados = resultados.filter((r) => r.caso.categoria === "gold");
  if (goldResultados.length < 3) {
    linhas.push(
      `Esta execução rodou só ${goldResultados.length}/3 caso(s) gold (\`--niche\` ou dataset parcial) — a checagem de discriminação exige os 3 (rodar com \`--gold\` ou sem argumento).`,
    );
  } else {
    const vereditos = goldResultados.map((r) =>
      r.status === "ok" ? r.diagnostico.veredito_sugerido.decisao : "ERRO",
    );
    const semErro = !vereditos.includes("ERRO");
    const discriminado = semErro && new Set(vereditos).size === vereditos.length;
    linhas.push(
      `| id | veredito esperado | veredito obtido |\n|----|--------------------|-------------------|`,
    );
    goldResultados.forEach((r) => {
      const obtido = r.status === "ok" ? r.diagnostico.veredito_sugerido.decisao : "ERRO";
      linhas.push(`| ${r.caso.id} | ${r.caso.veredito_esperado} | ${obtido} |`);
    });
    linhas.push("");
    if (discriminado) {
      linhas.push(
        "**DISCRIMINADOS:** os 3 vereditos vieram diferentes entre si — o teste-mestre da dimensão 7 passou (o mesmo diagnóstico não serviria para dois nichos diferentes).",
      );
    } else {
      linhas.push(
        "**NÃO DISCRIMINADOS — FALHA CRÍTICA da dimensão 7:** dois ou mais vereditos vieram iguais (ou algum caso gold não gerou resultado). Isso é falha crítica independente do resto do relatório — a rubrica anti-genérico em `src/lib/ai/diagnostico-prompt.ts` precisa ser reforçada, com re-execução e comparação dos dois relatórios.",
      );
    }
  }
  linhas.push("");

  linhas.push("## Custo total estimado");
  linhas.push("");
  const custoTotal = resultados.reduce((soma, r) => soma + estimarCusto(r), 0);
  linhas.push(
    `Estimativa (Sonnet 5 US$2/1M input + US$10/1M output + US$10/1.000 buscas web, geração + juiz): **US$${custoTotal.toFixed(2)}** para ${resultados.length} caso(s).`,
  );
  linhas.push("");
  linhas.push(
    "_Estimativa aproximada a partir de `usage` do AI SDK — não é a fatura oficial da Anthropic._",
  );
  linhas.push("");

  // Nunca sobrescrever silenciosamente um relatório do mesmo dia — é comum
  // rodar o eval 2x no mesmo dia (ex.: baseline + re-execução após reforçar a
  // rubrica) e cada execução é evidência comparável (D-23-05). Se o nome-base
  // já existir, incrementa um sufixo numérico até achar um nome livre.
  const relatorioDir = path.join(ROOT, "test/reports");
  fs.mkdirSync(relatorioDir, { recursive: true });
  let nomeArquivo = `${dataISO}-eval-diagnostico.md`;
  let sufixo = 2;
  while (fs.existsSync(path.join(relatorioDir, nomeArquivo))) {
    nomeArquivo = `${dataISO}-eval-diagnostico-${sufixo}.md`;
    sufixo += 1;
  }
  const caminhoCompleto = path.join(relatorioDir, nomeArquivo);
  fs.writeFileSync(caminhoCompleto, linhas.join("\n") + "\n", "utf8");

  return { caminhoCompleto, custoTotal };
}

// ---------- Execução ----------
const escopo = args.includes("--gold")
  ? "--gold (3 casos gold)"
  : args.includes("--niche")
    ? `--niche "${args[args.indexOf("--niche") + 1]}"`
    : "todos os casos de test/nichos-referencia.json";

const resultados = await main();

const { caminhoCompleto, custoTotal } = montarRelatorio(resultados, escopo);

console.log(`[eval-diagnostico] relatório escrito em ${caminhoCompleto}`);
console.log(`[eval-diagnostico] custo total estimado: US$${custoTotal.toFixed(2)}`);

// ---------- Gate de saída: veredito gold divergente OU portão estrutural falho ----------
const goldFalhou = resultados
  .filter((r) => r.caso.categoria === "gold")
  .some((r) => r.status !== "ok" || r.vereditoResultado === "REGRESSAO");
const portaoFalhou = resultados.some(
  (r) => r.status === "ok" && r.falhasEstruturais.length > 0,
);

if (goldFalhou || portaoFalhou) {
  console.error(
    "\n[eval-diagnostico] FALHOU — divergência de veredito gold e/ou portão estrutural em FAIL. Veja o relatório.",
  );
  process.exit(1);
}

console.log("\n[eval-diagnostico] OK — todos os portões estruturais passaram e os gold rodados bateram com o esperado.");
process.exit(0);
