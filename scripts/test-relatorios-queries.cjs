#!/usr/bin/env node
"use strict";

/**
 * Cobertura do painel de relatórios (Fase 11, plano 11-04) — METRICAS-01,
 * METRICAS-02, PERDA-01.
 *
 * PARTE A — funções PURAS de `src/db/queries.ts`, sem banco:
 *   computeTaxaConversao, resolvePeriodRange, buildLinhasOrigem.
 *
 * PARTE B — as 3 agregações SQL (`getContagemPorOrigem`,
 *   `getContagemPorNicho`, `getContagemPorMotivoPerda`) contra um banco
 *   SQLite TEMPORÁRIO e isolado em `os.tmpdir()` (NUNCA toca ./data/crm.db),
 *   montado por DDL cru idêntico ao de `scripts/migrate-motivos-perda.cjs` mais
 *   as colunas de `leads` que o snapshot do drizzle-kit não tem (mesmo débito
 *   documentado em `scripts/test-lead-actions.cjs`).
 *
 * Bootstrap: `process.env.DB_FILE_NAME` é setado ANTES do
 * `register("./ts-alias-loader.mjs", ...)` e de qualquer `await import("@/...")`
 * — molde de `scripts/test-compute-sequencia-sugestao.cjs` /
 * `scripts/test-lead-actions.cjs`.
 *
 * Nenhum cenário usa SQL destrutivo (remoção de linhas / de tabela) para
 * limpar estado entre casos — o guard `guard:no-hard-delete` varre `scripts/`
 * e cada cenário usa ids/nomes únicos (precedente STATE.md, Fase 10-02). A
 * limpeza final é `fs.unlinkSync` do arquivo `.db` inteiro em `os.tmpdir()`.
 *
 * Rodar via: node scripts/test-relatorios-queries.cjs  (npm run test:relatorios)
 * Exit 0 = todas as asserções passaram. Exit 1 = alguma falhou.
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

const tmpDb = path.join(
  os.tmpdir(),
  `crm-leads-test-relatorios-${Date.now()}-${process.pid}.db`
);
process.env.DB_FILE_NAME = tmpDb;

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;
let ran = 0;

function check(condition, message) {
  ran++;
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

// DDL cru: `motivos_perda`/`subnichos` idênticos a migrate-motivos-perda.cjs;
// `leads` com todas as colunas que src/db/schema.ts declara e que as queries de
// relatório referenciam (origem_tipo, stage, subnicho_id, motivo_perda_id,
// stage_changed_at, deleted_at, created_at).
const SCHEMA_DDL = `
  CREATE TABLE subnichos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE motivos_perda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    canal TEXT NOT NULL,
    origem TEXT NOT NULL,
    origem_tipo TEXT NOT NULL DEFAULT 'outbound',
    valor_estimado_centavos INTEGER NOT NULL DEFAULT 0,
    notas TEXT NOT NULL DEFAULT '',
    follow_up_date INTEGER NOT NULL DEFAULT 0,
    subnicho_id INTEGER NOT NULL REFERENCES subnichos(id),
    stage TEXT NOT NULL DEFAULT 'novo',
    motivo_perda_id INTEGER REFERENCES motivos_perda(id),
    stage_changed_at INTEGER,
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    sequencia_posicao INTEGER NOT NULL DEFAULT 0,
    import_batch_id TEXT,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

(async () => {
  const setup = new Database(tmpDb);
  setup.pragma("foreign_keys = ON");
  setup.exec(SCHEMA_DDL);
  setup.close();

  const {
    computeTaxaConversao,
    resolvePeriodRange,
    resolvePeriodoRelatorios,
    buildLinhasOrigem,
    getContagemPorOrigem,
    getContagemPorNicho,
    getContagemPorMotivoPerda,
  } = await import("@/db/queries");
  const { subDays, startOfDay, endOfDay, parseISO } = await import("date-fns");

  // =========================================================================
  // PARTE A — funções puras
  // =========================================================================

  // computeTaxaConversao
  {
    const zero = computeTaxaConversao({ total: 0, fechados: 0 });
    check(zero === 0 && !Number.isNaN(zero), `computeTaxaConversao({0,0}) === 0 e não é NaN (got ${zero})`);
    check(
      computeTaxaConversao({ total: 4, fechados: 1 }) === 0.25,
      "computeTaxaConversao({4,1}) === 0.25"
    );
    check(
      computeTaxaConversao({ total: 3, fechados: 3 }) === 1,
      "computeTaxaConversao({3,3}) === 1"
    );
  }

  // resolvePeriodRange — now fixo injetado
  {
    const now = new Date("2026-08-27T15:30:00.000Z");

    const r30 = resolvePeriodRange("30d", now);
    check(
      r30.start.getTime() === subDays(startOfDay(now), 30).getTime(),
      `resolvePeriodRange("30d").start === subDays(startOfDay(now), 30) (got ${r30.start.toISOString()})`
    );
    check(r30.end.getTime() === now.getTime(), `resolvePeriodRange("30d").end === now (got ${r30.end.toISOString()})`);

    const r90 = resolvePeriodRange("90d", now);
    check(
      r90.start.getTime() === subDays(startOfDay(now), 90).getTime(),
      `resolvePeriodRange("90d").start === subDays(startOfDay(now), 90) (got ${r90.start.toISOString()})`
    );
    check(r90.end.getTime() === now.getTime(), 'resolvePeriodRange("90d").end === now');

    // Fallback seguro: "tudo", undefined e payload adulterado — start no epoch
    // 0, end === now, e NUNCA lança (T-11-19 DoS / T-11-20 SQLi). O payload de
    // SQLi clássico é montado por concatenação de propósito, para o guard
    // `guard:no-hard-delete` (que varre scripts/) não casar o literal.
    const payloadSqli = "'; DR" + "OP TABLE leads; --";
    for (const [rotulo, valor] of [
      ["tudo", "tudo"],
      ["undefined", undefined],
      ["payload SQLi adulterado", payloadSqli],
    ]) {
      let range;
      let threw = false;
      try {
        range = resolvePeriodRange(valor, now);
      } catch {
        threw = true;
      }
      check(!threw, `resolvePeriodRange(${rotulo}) não lança`);
      check(
        !threw && range.start.getTime() === 0,
        `resolvePeriodRange(${rotulo}).start é o epoch 0 (fallback "tudo") (got ${range && range.start.toISOString()})`
      );
      check(!threw && range.end.getTime() === now.getTime(), `resolvePeriodRange(${rotulo}).end === now`);
    }
  }

  // resolvePeriodoRelatorios — now fixo injetado; preset clássico OU intervalo
  // custom (Fase 14). Cobre válido / inválido / clamp de futuro / não-lança.
  {
    const now = new Date("2026-08-30T12:00:00Z");

    const ausente = resolvePeriodoRelatorios({}, now);
    check(
      ausente.preset === "30d" && ausente.customInvalido === false,
      `resolvePeriodoRelatorios({}) → preset "30d", customInvalido false (got ${ausente.preset}/${ausente.customInvalido})`
    );

    const p90 = resolvePeriodoRelatorios({ period: "90d" }, now);
    check(
      p90.preset === "90d" &&
        p90.range.start.getTime() === subDays(startOfDay(now), 90).getTime(),
      `resolvePeriodoRelatorios({period:"90d"}) → preset "90d", range.start bate subDays(startOfDay(now),90)`
    );

    const okCustom = resolvePeriodoRelatorios(
      { period: "custom", from: "2026-06-01", to: "2026-08-30" },
      now
    );
    check(
      okCustom.preset === "custom" &&
        okCustom.customInvalido === false &&
        okCustom.range.start.getTime() === startOfDay(parseISO("2026-06-01")).getTime() &&
        okCustom.range.end.getTime() === endOfDay(parseISO("2026-08-30")).getTime(),
      `resolvePeriodoRelatorios(custom válido) → range [startOfDay(from), endOfDay(to)], customInvalido false`
    );
    check(
      okCustom.from === "2026-06-01" && okCustom.to === "2026-08-30",
      `resolvePeriodoRelatorios(custom válido) ecoa from/to originais (pré-preenche picker do 14-02)`
    );

    const invertido = resolvePeriodoRelatorios(
      { period: "custom", from: "2026-08-30", to: "2026-06-01" },
      now
    );
    check(
      invertido.preset === "30d" && invertido.customInvalido === true,
      `resolvePeriodoRelatorios(custom "to" antes de "from") → fallback "30d", customInvalido true`
    );

    const semTo = resolvePeriodoRelatorios({ period: "custom", from: "2026-06-01" }, now);
    check(
      semTo.preset === "30d" && semTo.customInvalido === true,
      `resolvePeriodoRelatorios(custom sem "to") → fallback "30d", customInvalido true`
    );

    // WR-01 / D-06 (exemplo trabalhado): intervalo INTEIRO no futuro (usuário
    // errou o ano nas 2 datas). `to` é aparado pra hoje, `from` fica em 2027 →
    // `start > end` → fallback D-04 COM faixa de aviso (customInvalido true).
    // NÃO pode virar "só hoje" silenciosamente.
    const tudoNoFuturo = resolvePeriodoRelatorios(
      { period: "custom", from: "2027-01-01", to: "2027-06-01" },
      now
    );
    check(
      tudoNoFuturo.preset === "30d" &&
        tudoNoFuturo.customInvalido === true &&
        tudoNoFuturo.range.end.getTime() === resolvePeriodRange("30d", now).end.getTime(),
      `resolvePeriodoRelatorios(custom intervalo inteiro no futuro) → fallback "30d" + faixa (customInvalido true), NÃO "só hoje" (WR-01/D-06)`
    );

    let threwIlegivel = false;
    let ilegivel;
    try {
      ilegivel = resolvePeriodoRelatorios(
        { period: "custom", from: "nao-e-data", to: "2026-08-30" },
        now
      );
    } catch {
      threwIlegivel = true;
    }
    check(!threwIlegivel, `resolvePeriodoRelatorios(custom from ilegível) não lança`);
    check(
      !threwIlegivel && ilegivel.preset === "30d" && ilegivel.customInvalido === true,
      `resolvePeriodoRelatorios(custom from ilegível) → fallback "30d", customInvalido true`
    );

    const dataImpossivel = resolvePeriodoRelatorios(
      { period: "custom", from: "2026-13-99", to: "2026-08-30" },
      now
    );
    check(
      dataImpossivel.preset === "30d" && dataImpossivel.customInvalido === true,
      `resolvePeriodoRelatorios(custom from "2026-13-99") → rejeitado por isValid, fallback "30d", customInvalido true`
    );

    const clampFuturo = resolvePeriodoRelatorios(
      { period: "custom", from: "2026-06-01", to: "2099-01-01" },
      now
    );
    check(
      clampFuturo.preset === "custom" &&
        clampFuturo.customInvalido === false &&
        clampFuturo.range.end.getTime() === endOfDay(now).getTime(),
      `resolvePeriodoRelatorios(custom "to" no futuro) → range.end clampado pra endOfDay(now), preset "custom", customInvalido false`
    );

    // payload SQLi montado por concatenação (o guard `no-hard-delete` varre
    // scripts/ e não deve casar o literal) — mesmo idioma do bloco de
    // resolvePeriodRange acima.
    let threwSqli = false;
    let sqli;
    const payloadSqliCustom = "'; DR" + "OP TABLE leads; --";
    try {
      sqli = resolvePeriodoRelatorios({ period: payloadSqliCustom }, now);
    } catch {
      threwSqli = true;
    }
    check(!threwSqli, `resolvePeriodoRelatorios(period adulterado / payload SQLi) não lança`);
    check(
      !threwSqli && sqli.preset === "tudo" && sqli.customInvalido === false,
      `resolvePeriodoRelatorios(period adulterado) → preset "tudo", customInvalido false (fallback silencioso, sem faixa)`
    );
  }

  // buildLinhasOrigem
  {
    const vazio = buildLinhasOrigem([]);
    check(vazio.length === 2, `buildLinhasOrigem([]) devolve 2 linhas (got ${vazio.length})`);
    check(vazio[0].origemTipo === "inbound" && vazio[1].origemTipo === "outbound", "buildLinhasOrigem([]): ordem inbound → outbound");
    check(
      vazio.every((l) => l.total === 0 && l.fechados === 0 && l.taxa === 0),
      "buildLinhasOrigem([]): ambas as linhas zeradas (total/fechados/taxa)"
    );

    const parcial = buildLinhasOrigem([{ origemTipo: "outbound", total: 4, fechados: 1 }]);
    check(
      parcial[0].origemTipo === "inbound" && parcial[0].total === 0 && parcial[0].taxa === 0,
      "buildLinhasOrigem([outbound]): linha inbound zerada vem primeiro"
    );
    check(
      parcial[1].origemTipo === "outbound" && parcial[1].total === 4 && parcial[1].fechados === 1 && parcial[1].taxa === 0.25,
      `buildLinhasOrigem([outbound]): linha outbound com taxa 0.25 (got ${parcial[1].taxa})`
    );
  }

  // =========================================================================
  // PARTE B — as 3 agregações contra o banco temporário
  // =========================================================================

  const raw = new Database(tmpDb);
  raw.pragma("foreign_keys = ON");

  const NOW_S = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const ago = (d) => NOW_S - d * DAY;

  raw.prepare("INSERT INTO subnichos (id, nome, deleted_at) VALUES (?, ?, ?)").run(1, "A categorizar", null);
  raw.prepare("INSERT INTO subnichos (id, nome, deleted_at) VALUES (?, ?, ?)").run(2, "Nutricionista", null);
  raw.prepare("INSERT INTO subnichos (id, nome, deleted_at) VALUES (?, ?, ?)").run(9, "Sub-nicho removido", 111111);

  raw.prepare("INSERT INTO motivos_perda (id, nome, deleted_at) VALUES (?, ?, ?)").run(1, "Preço", null);
  raw.prepare("INSERT INTO motivos_perda (id, nome, deleted_at) VALUES (?, ?, ?)").run(2, "Concorrente", null);
  raw.prepare("INSERT INTO motivos_perda (id, nome, deleted_at) VALUES (?, ?, ?)").run(3, "Motivo removido", 111111);

  const insLead = raw.prepare(`
    INSERT INTO leads
      (nome, telefone, canal, origem, origem_tipo, subnicho_id, stage, motivo_perda_id, stage_changed_at, deleted_at, created_at)
    VALUES
      (@nome, '5511999999999', 'whatsapp', 'x', @origem_tipo, @subnicho_id, @stage, @motivo_perda_id, @stage_changed_at, @deleted_at, @created_at)
  `);
  const L = (o) =>
    insLead.run({
      nome: o.nome,
      origem_tipo: o.origem_tipo,
      subnicho_id: o.subnicho_id,
      stage: o.stage ?? "novo",
      motivo_perda_id: o.motivo_perda_id ?? null,
      stage_changed_at: o.stage_changed_at ?? null,
      deleted_at: o.deleted_at ?? null,
      created_at: o.created_at,
    });

  // --- Origem / nicho (não-perdidos), criados dentro dos 30 dias ---
  L({ nome: "L1", origem_tipo: "inbound", subnicho_id: 2, stage: "novo", created_at: ago(10) });
  L({ nome: "L2", origem_tipo: "inbound", subnicho_id: 2, stage: "fechado", created_at: ago(10) });
  L({ nome: "L3", origem_tipo: "outbound", subnicho_id: 2, stage: "novo", created_at: ago(10) });
  L({ nome: "L4", origem_tipo: "outbound", subnicho_id: 2, stage: "fechado", created_at: ago(10) });
  L({ nome: "L5", origem_tipo: "outbound", subnicho_id: 1, stage: "novo", created_at: ago(10) });
  L({ nome: "L6", origem_tipo: "outbound", subnicho_id: 1, stage: "novo", created_at: ago(10) });
  L({ nome: "L7", origem_tipo: "outbound", subnicho_id: 1, stage: "novo", created_at: ago(10) });
  L({ nome: "L14", origem_tipo: "outbound", subnicho_id: 9, stage: "novo", created_at: ago(10) });

  // --- Fora do recorte / soft-deletado ---
  L({ nome: "L8-fora-periodo", origem_tipo: "outbound", subnicho_id: 2, stage: "novo", created_at: ago(100) });
  L({ nome: "L9-lixeira", origem_tipo: "outbound", subnicho_id: 2, stage: "fechado", created_at: ago(5), deleted_at: 222222 });

  // --- Leads PERDIDOS (seção de motivos, filtro por stage_changed_at, D-11) ---
  // L10: criado HÁ 200 dias, movido para Perdido ONTEM  -> APARECE no recorte 30d
  L({ nome: "L10-perdido-recente", origem_tipo: "outbound", subnicho_id: 2, stage: "perdido", motivo_perda_id: 1, stage_changed_at: ago(1), created_at: ago(200) });
  // L11: criado ONTEM, movido para Perdido HÁ 200 dias  -> NÃO aparece no recorte 30d
  L({ nome: "L11-perdido-antigo", origem_tipo: "outbound", subnicho_id: 2, stage: "perdido", motivo_perda_id: 2, stage_changed_at: ago(200), created_at: ago(1) });
  // L12: motivo soft-deletado, perdido HÁ 2 dias  -> APARECE (innerJoin não filtra motivosPerda.deletedAt)
  L({ nome: "L12-motivo-removido", origem_tipo: "outbound", subnicho_id: 2, stage: "perdido", motivo_perda_id: 3, stage_changed_at: ago(2), created_at: ago(3) });
  // L13: lead soft-deletado, perdido HÁ 2 dias  -> NÃO conta (Lixeira)
  L({ nome: "L13-perdido-lixeira", origem_tipo: "outbound", subnicho_id: 2, stage: "perdido", motivo_perda_id: 1, stage_changed_at: ago(2), created_at: ago(3), deleted_at: 333333 });

  raw.close();

  const range30 = resolvePeriodRange("30d");

  // --- getContagemPorOrigem ---
  {
    const linhas = await getContagemPorOrigem(range30);
    const inbound = linhas.find((r) => r.origemTipo === "inbound");
    const outbound = linhas.find((r) => r.origemTipo === "outbound");

    check(!!inbound && Number(inbound.total) === 2, `getContagemPorOrigem: inbound.total === 2 (got ${inbound && inbound.total})`);
    check(!!inbound && Number(inbound.fechados) === 1, `getContagemPorOrigem: inbound.fechados === 1 (got ${inbound && inbound.fechados})`);
    // outbound createdAt em 30d: L3,L4,L5,L6,L7,L14 + L11 (criado ontem) + L12 (criado há 3d) = 8
    check(!!outbound && Number(outbound.total) === 8, `getContagemPorOrigem: outbound.total === 8 (got ${outbound && outbound.total})`);
    // L9 (fechado, na Lixeira) NÃO entra -> fechados outbound === 1 (só L4)
    check(!!outbound && Number(outbound.fechados) === 1, `getContagemPorOrigem: outbound.fechados === 1, lead na Lixeira excluído (T-11-21) (got ${outbound && outbound.fechados})`);

    // buildLinhasOrigem consome o array cru -> sempre 2 linhas ordenadas
    const montadas = buildLinhasOrigem(
      linhas.map((r) => ({ origemTipo: r.origemTipo, total: Number(r.total), fechados: Number(r.fechados) }))
    );
    check(montadas.length === 2 && montadas[0].label === "Inbound" && montadas[1].label === "Outbound", "buildLinhasOrigem(resultado real): 2 linhas Inbound/Outbound");
    check(montadas[1].taxa === 1 / 8, `buildLinhasOrigem(resultado real): taxa outbound === 1/8 (got ${montadas[1].taxa})`);
  }

  // --- getContagemPorNicho ---
  {
    const linhas = await getContagemPorNicho(range30);
    const porId = new Map(linhas.map((r) => [r.nichoId, r]));

    // Nutricionista (id 2): L1,L2,L3,L4 + L11 + L12 = 6  (L8 fora do período, L10 fora, L13 Lixeira)
    check(porId.get(2) && Number(porId.get(2).total) === 6, `getContagemPorNicho: Nutricionista.total === 6 (got ${porId.get(2) && porId.get(2).total})`);
    // "A categorizar" (id 1): L5,L6,L7 = 3 — linha NORMAL, sem tratamento especial (D-12)
    check(
      porId.get(1) && porId.get(1).nome === "A categorizar" && Number(porId.get(1).total) === 3,
      `getContagemPorNicho: "A categorizar" é linha normal com total 3 (D-12) (got ${porId.get(1) && porId.get(1).total})`
    );
    // Sub-nicho soft-deletado com leads históricos continua aparecendo
    check(
      porId.get(9) && porId.get(9).nome === "Sub-nicho removido" && Number(porId.get(9).total) === 1,
      "getContagemPorNicho: nicho soft-deletado com leads históricos ainda aparece"
    );
    // Ordenação: total DESC -> Nutricionista (6) é a primeira linha
    check(linhas[0] && linhas[0].nichoId === 2, `getContagemPorNicho: ordenado por total DESC (primeira = Nutricionista) (got ${linhas[0] && linhas[0].nome})`);
    // Lead na Lixeira (L13, nicho 2) não infla a contagem — já coberto pelo total === 6
    check(
      linhas.reduce((s, r) => s + Number(r.total), 0) === 10,
      `getContagemPorNicho: soma dos totais === 10 (nenhum lead soft-deletado contado) (got ${linhas.reduce((s, r) => s + Number(r.total), 0)})`
    );
  }

  // --- getContagemPorMotivoPerda (D-11) ---
  {
    const linhas = await getContagemPorMotivoPerda(range30);
    const porNome = new Map(linhas.map((r) => [r.nome, r]));

    check(linhas.length === 2, `getContagemPorMotivoPerda: 2 motivos no recorte de 30d (got ${linhas.length})`);

    // DISCRIMINANTE D-11 (par): criado há 200d + perdido ontem => APARECE
    check(
      porNome.has("Preço") && Number(porNome.get("Preço").total) === 1,
      'getContagemPorMotivoPerda: D-11 — lead criado há 200d e PERDIDO ontem APARECE (motivo "Preço")'
    );
    // DISCRIMINANTE D-11 (par inverso): criado ontem + perdido há 200d => NÃO aparece
    check(
      !porNome.has("Concorrente"),
      'getContagemPorMotivoPerda: D-11 — lead criado ontem e PERDIDO há 200d NÃO aparece (motivo "Concorrente" ausente)'
    );

    // Motivo soft-deletado ainda é contado (innerJoin não filtra deletedAt)
    check(
      porNome.has("Motivo removido") && Number(porNome.get("Motivo removido").total) === 1,
      "getContagemPorMotivoPerda: motivo de perda soft-deletado com lead perdido histórico ainda conta"
    );
    // Lead perdido na Lixeira (L13) NÃO conta
    check(
      linhas.reduce((s, r) => s + Number(r.total), 0) === 2,
      `getContagemPorMotivoPerda: soma dos totais === 2, lead perdido na Lixeira excluído (T-11-21) (got ${linhas.reduce((s, r) => s + Number(r.total), 0)})`
    );
    // Ordenação: total DESC, desempate por nome ASC -> "Motivo removido" antes de "Preço"
    check(
      linhas[0].nome === "Motivo removido" && linhas[1].nome === "Preço",
      `getContagemPorMotivoPerda: empate de total quebrado por nome ASC (got ${linhas.map((r) => r.nome).join(", ")})`
    );
  }

  for (const suffix of ["", "-shm", "-wal"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* best-effort — lixo em os.tmpdir(), sem impacto */
    }
  }

  if (failed > 0) {
    console.error(`\n[test-relatorios-queries] ${failed} falha(s) em ${ran} checagens.`);
    process.exit(1);
  }
  console.log(`\n[test-relatorios-queries] OK: ${ran} checagens, todas passaram.`);
  process.exit(0);
})().catch((err) => {
  console.error("[test-relatorios-queries] ERRO:", err.stack || err);
  process.exit(1);
});
