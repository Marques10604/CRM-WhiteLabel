// Harness ESTRUTURAL anti-genérico do Diagnóstico de IA (Fase 23, plano 23-01).
//
// Molde: scripts/test-tarefa-actions.cjs (bootstrap + check() + process.exit).
//
// DIFERENÇAS CRÍTICAS em relação ao molde (23-PATTERNS.md, seção do harness):
//   - NÃO registra next-cache-stub-loader.mjs — nenhum módulo "use server" é
//     importado, só o schema puro @/lib/ai/diagnostico-schema.
//   - NÃO seta DB_FILE_NAME, NÃO cria temp DB, NÃO roda DELETE FROM — este
//     harness não toca banco nenhum. Roda sobre fixtures JSON versionadas em
//     test/fixtures/diagnostico/ e não precisa de ANTHROPIC_API_KEY.
//
// Cobre as dimensões automatizáveis 1 / 2 / 5 / 6 / 9 do 23-AI-SPEC §5:
//   Grupo A — Dim 1: conformidade estrutural (ok-* valida, bad-* falha)
//   Grupo B — Dim 1: asserções finas por fixture que valida (DIAGNOSTICO-03..09)
//   Grupo C — Dim 6: mix dado x marketing na fixture adversarial
//   Grupo D — Dim 2: gate de fontes (filtrarFontes/assertTemFonte) + cross-check
//   Grupo E — Dim 2: allowlist de esquema de URL (XSS T-23-02)
//   Grupo F — Dim 9: limiares de custo/latência sobre linhas simuladas
"use strict";

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const path = require("node:path");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

const FIXTURES_DIR = path.join(__dirname, "..", "test", "fixtures", "diagnostico");
const DECISOES_VALIDAS = ["aprofundar", "mudar_angulo", "abandonar"];
const TIPOS_ACHADO_VALIDOS = ["dado_quantificavel", "alegacao_marketing"];
const MAX_USES = 6; // teto de buscas travado em webSearch_20250305({ maxUses: 6 })

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

function lerFixture(nome) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, nome), "utf8"));
}

/** Toda URL citada dentro do objeto do diagnóstico (para o cross-check). */
function urlsCitadas(d) {
  return [
    ...d.indice_saturacao.fontes,
    d.ticket_medio.fonte_url,
    ...d.gatilhos_dor.map((g) => g.observavel_em),
    ...d.achados.map((a) => a.fonte_url),
  ];
}

async function main() {
  const { diagnosticoSchema, filtrarFontes, assertTemFonte, urlSegura } =
    await import("@/lib/ai/diagnostico-schema");

  const arquivos = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  check(arquivos.length === 9, `há 9 fixtures em test/fixtures/diagnostico (achei ${arquivos.length})`);

  // Uma fixture "valida" = prefixo ok- OU a adversarial (que também deve passar).
  const ehValida = (f) => f.startsWith("ok-") || f.startsWith("adversarial-");

  // ---- Grupo A — Dim 1: conformidade estrutural, varredura das fixtures ----
  const validas = [];
  for (const f of arquivos) {
    const data = lerFixture(f);
    const r = diagnosticoSchema.safeParse(data);
    if (ehValida(f)) {
      check(r.success === true, `Grupo A: ${f} valida contra diagnosticoSchema`);
      if (r.success) validas.push({ f, data, d: r.data });
    } else {
      check(r.success === false, `Grupo A: ${f} é rejeitada por diagnosticoSchema`);
    }
  }

  check(
    validas.some((v) => v.f === "adversarial-so-marketing.json"),
    "Grupo A: adversarial-so-marketing.json é tratada como caso válido",
  );

  // ---- Grupo B — Dim 1: asserções finas sobre cada fixture que valida ----
  for (const { f, d } of validas) {
    const cd = d.indice_saturacao.concorrentes_diretos;
    check(
      Number.isInteger(cd) && cd >= 0,
      `Grupo B [${f}]: indice_saturacao.concorrentes_diretos é inteiro >= 0 (DIAGNOSTICO-03)`,
    );

    const nGat = d.gatilhos_dor.length;
    const nMaisForte = d.gatilhos_dor.filter((g) => g.mais_forte === true).length;
    check(
      nGat >= 1 && nGat <= 3 && nMaisForte === 1,
      `Grupo B [${f}]: gatilhos_dor 1..3 com exatamente 1 mais_forte (DIAGNOSTICO-04)`,
    );

    const nObj = d.objecoes.length;
    const objComResposta = d.objecoes.every(
      (o) => typeof o.resposta_sugerida === "string" && o.resposta_sugerida.trim().length > 0,
    );
    check(
      nObj >= 2 && nObj <= 3 && objComResposta,
      `Grupo B [${f}]: objecoes 2..3 e toda objeção tem resposta_sugerida (DIAGNOSTICO-05)`,
    );

    check(
      d.ticket_medio.valor_estimado_brl > 0 &&
        typeof d.ticket_medio.fonte_url === "string" &&
        d.ticket_medio.fonte_url.length > 0,
      `Grupo B [${f}]: ticket_medio.valor_estimado_brl > 0 e fonte_url presente (DIAGNOSTICO-06)`,
    );

    check(
      d.achados.length >= 3 &&
        d.achados.every((a) => TIPOS_ACHADO_VALIDOS.includes(a.tipo)),
      `Grupo B [${f}]: achados >= 3 e todo achado tem tipo válido (DIAGNOSTICO-07)`,
    );

    const lenRascunho = d.rascunho_primeira_mensagem.length;
    check(
      lenRascunho >= 40 && lenRascunho <= 1200,
      `Grupo B [${f}]: rascunho_primeira_mensagem 40..1200 chars (DIAGNOSTICO-08)`,
    );

    check(
      DECISOES_VALIDAS.includes(d.veredito_sugerido.decisao),
      `Grupo B [${f}]: veredito_sugerido.decisao no enum (DIAGNOSTICO-09)`,
    );
  }

  // ---- Grupo C — Dim 6: mix dado x marketing na fixture adversarial ----
  {
    const adv = validas.find((v) => v.f === "adversarial-so-marketing.json").d;
    const nMarketing = adv.achados.filter((a) => a.tipo === "alegacao_marketing").length;
    const nDado = adv.achados.filter((a) => a.tipo === "dado_quantificavel").length;
    check(nMarketing >= 1, "Grupo C: adversarial tem >= 1 achado alegacao_marketing");
    check(nDado >= 1, "Grupo C: adversarial tem >= 1 achado dado_quantificavel");
  }

  // ---- Grupo D — Dim 2: gate de fontes (sem rede) + cross-check ----
  check(
    Array.isArray(filtrarFontes([])) && filtrarFontes([]).length === 0,
    "Grupo D: filtrarFontes([]) devolve array vazio",
  );
  {
    const fontes = filtrarFontes([
      { sourceType: "document" },
      { sourceType: "url", url: "https://a.com", title: "A" },
    ]);
    check(fontes.length === 1, "Grupo D: filtrarFontes descarta sourceType != 'url'");
    check(
      fontes.length === 1 && fontes[0].url === "https://a.com",
      "Grupo D: filtrarFontes mapeia o item de URL para { url, title }",
    );
  }
  {
    let lancou = false;
    try {
      assertTemFonte([]);
    } catch {
      lancou = true;
    }
    check(lancou, "Grupo D: assertTemFonte([]) lança");
  }
  {
    let lancou = false;
    try {
      assertTemFonte([{ url: "https://a.com" }]);
    } catch {
      lancou = true;
    }
    check(!lancou, "Grupo D: assertTemFonte([{ url }]) não lança");
  }
  for (const { f, data, d } of validas) {
    const src = new Set((data._sources || []).map((s) => s.url));
    const faltando = urlsCitadas(d).filter((u) => !src.has(u));
    check(
      faltando.length === 0,
      `Grupo D [${f}]: toda URL citada no objeto consta em _sources (faltando: ${JSON.stringify(faltando)})`,
    );
  }

  // ---- Grupo E — Dim 2: allowlist de esquema de URL (XSS T-23-02) ----
  check(urlSegura("https://exemplo.com.br") === true, "Grupo E: urlSegura aceita https:");
  check(urlSegura("http://exemplo.com.br") === true, "Grupo E: urlSegura aceita http:");
  check(urlSegura("javascript:alert(1)") === false, "Grupo E: urlSegura rejeita javascript:");
  check(urlSegura("data:text/html,<script>") === false, "Grupo E: urlSegura rejeita data:");
  check(urlSegura("nao-e-url") === false, "Grupo E: urlSegura rejeita string que não é URL");

  // ---- Grupo F — Dim 9: limiares de custo/latência (linhas simuladas) ----
  const linhasSimuladas = [
    { buscas: ["nicho costureira concorrentes", "preço ajuste vestido"], inputTokens: 32000, outputTokens: 3800, finishReason: "stop" },
    { buscas: ["motoboy clínica contrato", "logística consultório", "ticket entrega recorrente"], inputTokens: 41000, outputTokens: 4200, finishReason: "stop" },
  ];
  for (const [i, linha] of linhasSimuladas.entries()) {
    check(linha.buscas.length <= MAX_USES, `Grupo F [linha ${i}]: buscas.length <= ${MAX_USES}`);
    check(
      linha.inputTokens + linha.outputTokens > 0,
      `Grupo F [linha ${i}]: input + output tokens > 0`,
    );
    check(
      linha.finishReason !== "length",
      `Grupo F [linha ${i}]: finishReason != 'length' (sem truncamento)`,
    );
  }
}

main()
  .then(() => {
    if (failed > 0) {
      console.error(`\n[test-diagnostico-estrutural] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log("\n[test-diagnostico-estrutural] OK: todas as asserções passaram.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[test-diagnostico-estrutural] ERRO:", err.stack || err);
    process.exit(1);
  });
