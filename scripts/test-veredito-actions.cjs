#!/usr/bin/env node
"use strict";

/**
 * Cobertura comportamental de `registrarVeredito` (VEREDITO-01/02/03,
 * CAMPANHA-02, D-24-01, D-24-02, Fase 24) — molde de
 * `scripts/test-motivo-perda-actions.cjs`: banco SQLite TEMPORÁRIO e isolado
 * em `os.tmpdir()` (NUNCA toca ./data/crm.db), `DB_FILE_NAME` setado ANTES de
 * qualquer `await import("@/...")`, `register("./ts-alias-loader.mjs", ...)`
 * seguido de `register("./test-support/next-cache-stub-loader.mjs", ...)`,
 * harness `check(condition, message)` com contador `failed` e
 * `process.exit(failed > 0 ? 1 : 0)`.
 *
 * DDL cru de `subnichos`/`campanhas`/`leads` (colunas usadas pelo repo, mais
 * as 2 colunas novas `veredito_final`/`veredito_decidido_em` em `campanhas`) —
 * DELIBERADAMENTE SEM a tabela `diagnosticos`: prova estrutural de que
 * `registrarVeredito` nunca lê o veredito sugerido pela IA (caso 4).
 *
 * Nenhum caso usa `DELETE FROM` para limpar estado entre cenários (o guard
 * `guard:no-hard-delete` varre `scripts/`) — a limpeza final é
 * `fs.unlinkSync` do arquivo `.db` inteiro em `os.tmpdir()`.
 *
 * Rodar via: node scripts/test-veredito-actions.cjs  (npm run test:veredito-actions)
 * Exit 0 = todas as asserções passaram. Exit 1 = alguma falhou.
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

// Ordem importa: o stub-loader é registrado por último para executar
// primeiro e curto-circuitar "next/cache" antes do ts-alias-loader.
register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));
register("./test-support/next-cache-stub-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

function fd(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const SCHEMA_DDL = `
  CREATE TABLE subnichos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE campanhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nicho_id INTEGER NOT NULL REFERENCES subnichos(id),
    oferta TEXT NOT NULL,
    meta_conversao TEXT NOT NULL,
    janela_inicio INTEGER NOT NULL,
    janela_fim INTEGER NOT NULL,
    estado TEXT NOT NULL DEFAULT 'explorando',
    veredito_final TEXT,
    veredito_decidido_em INTEGER,
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
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
    motivo_perda_id INTEGER,
    stage_changed_at INTEGER,
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    sequencia_posicao INTEGER NOT NULL DEFAULT 0,
    import_batch_id TEXT,
    campanha_id INTEGER REFERENCES campanhas(id),
    deleted_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

async function main() {
  const tmpDb = path.join(
    os.tmpdir(),
    `crm-leads-test-veredito-actions-${Date.now()}-${process.pid}.db`
  );
  process.env.DB_FILE_NAME = tmpDb;

  const setupDb = new Database(tmpDb);
  setupDb.pragma("foreign_keys = ON");
  setupDb.exec(SCHEMA_DDL);

  const nichoId = setupDb
    .prepare("INSERT INTO subnichos (nome) VALUES ('Nicho de teste') RETURNING id")
    .get().id;

  const janelaInicio = Math.floor(Date.now() / 1000);
  const janelaFim = janelaInicio + 60 * 60 * 24 * 90;

  const alvoId = setupDb
    .prepare(
      "INSERT INTO campanhas (nicho_id, oferta, meta_conversao, janela_inicio, janela_fim) VALUES (?, 'Oferta alvo', '10 leads', ?, ?) RETURNING id"
    )
    .get(nichoId, janelaInicio, janelaFim).id;

  const testemunhaId = setupDb
    .prepare(
      "INSERT INTO campanhas (nicho_id, oferta, meta_conversao, janela_inicio, janela_fim) VALUES (?, 'Oferta testemunha', '5 leads', ?, ?) RETURNING id"
    )
    .get(nichoId, janelaInicio, janelaFim).id;

  setupDb
    .prepare(
      "INSERT INTO leads (nome, telefone, canal, origem, subnicho_id, campanha_id) VALUES (?, ?, 'whatsapp', 'teste', ?, ?)"
    )
    .run("Lead 1", "5511900000001", nichoId, alvoId);
  setupDb
    .prepare(
      "INSERT INTO leads (nome, telefone, canal, origem, subnicho_id, campanha_id) VALUES (?, ?, 'whatsapp', 'teste', ?, ?)"
    )
    .run("Lead 2", "5511900000002", nichoId, alvoId);

  setupDb.close();

  // Importado DEPOIS de DB_FILE_NAME estar setado — src/db/client.ts abre a
  // conexão no primeiro import e a cacheia.
  const { registrarVeredito } = await import("@/actions/campanha-actions");

  const raw = new Database(tmpDb);
  raw.pragma("foreign_keys = ON");

  const rowById = (id) => raw.prepare("SELECT * FROM campanhas WHERE id = ?").get(id);
  const leadsSnapshot = () =>
    JSON.stringify(raw.prepare("SELECT * FROM leads ORDER BY id").all());

  // Prova estrutural, independente dos casos abaixo: o banco temporário NÃO
  // tem a tabela `diagnosticos` — se `registrarVeredito` tentasse consultá-la,
  // qualquer caso bem-sucedido explodiria com "no such table".
  const hasDiagnosticos = raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='diagnosticos'")
    .get();
  check(
    !hasDiagnosticos,
    "Pré-condição: o banco temporário NÃO tem a tabela diagnosticos (prova estrutural do gate)"
  );

  // --- Caso 1 (VEREDITO-01) ---
  {
    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(alvoId), vereditoFinal: "abandonar" })
    );
    check(
      res && "success" in res && res.success === true,
      `VEREDITO-01: registrarVeredito com "abandonar" devolve { success: true } (got ${JSON.stringify(res)})`
    );
    const row = rowById(alvoId);
    check(
      row.veredito_final === "abandonar",
      `VEREDITO-01: linha da campanha alvo passa a ter veredito_final = 'abandonar' (got ${row.veredito_final})`
    );

    // --- Caso 2 (VEREDITO-02) ---
    const nowEpoch = Math.floor(Date.now() / 1000);
    check(
      row.veredito_decidido_em !== null && Math.abs(row.veredito_decidido_em - nowEpoch) <= 5,
      `VEREDITO-02: veredito_decidido_em é não-nulo e está a até 5s do unixepoch() atual (got ${row.veredito_decidido_em}, agora=${nowEpoch})`
    );

    // --- Caso 3 (CAMPANHA-02 / D-24-01) ---
    check(
      row.estado === "veredito_registrado",
      `CAMPANHA-02/D-24-01: estado da campanha alvo é 'veredito_registrado' após o veredito (got ${row.estado})`
    );
  }

  // --- Caso 4 (VEREDITO-01, divergência — sem consultar diagnosticos) ---
  {
    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(alvoId), vereditoFinal: "aprofundar" })
    );
    check(
      res && "success" in res && res.success === true,
      `VEREDITO-01 (divergência): registrar "aprofundar" é aceito sem checagem contra a IA, mesmo sem a tabela diagnosticos existir (got ${JSON.stringify(res)})`
    );
    check(
      rowById(alvoId).veredito_final === "aprofundar",
      "VEREDITO-01 (divergência): veredito_final foi atualizado para 'aprofundar'"
    );
  }

  // --- Caso 5 (entrada inválida — enum) ---
  {
    const before = rowById(alvoId).veredito_final;
    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(alvoId), vereditoFinal: "vender_mais" })
    );
    check(
      res && "errors" in res,
      `Entrada inválida: vereditoFinal="vender_mais" devolve objeto com errors (got ${JSON.stringify(res)})`
    );
    check(
      rowById(alvoId).veredito_final === before,
      `Entrada inválida: veredito_final permanece com o valor anterior (esperado ${before}, got ${rowById(alvoId).veredito_final})`
    );
  }

  // --- Caso 6 (entrada inválida — campanhaId) ---
  {
    for (const badId of ["abc", "0", "-1"]) {
      const res = await registrarVeredito(
        undefined,
        fd({ campanhaId: badId, vereditoFinal: "aprofundar" })
      );
      check(
        res && "errors" in res,
        `Entrada inválida: campanhaId="${badId}" devolve errors (got ${JSON.stringify(res)})`
      );
    }
  }

  // --- Caso 7 (campanha soft-deletada) ---
  {
    raw.prepare("UPDATE campanhas SET deleted_at = ? WHERE id = ?").run(
      Math.floor(Date.now() / 1000),
      testemunhaId
    );
    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(testemunhaId), vereditoFinal: "aprofundar" })
    );
    check(
      res && "errors" in res,
      `Campanha soft-deletada: registrarVeredito devolve errors (got ${JSON.stringify(res)})`
    );
    check(
      rowById(testemunhaId).veredito_final === null,
      "Campanha soft-deletada: a linha continua com veredito_final NULL"
    );
  }

  // --- Caso 8 (VEREDITO-03 — gate de não-interferência) ---
  {
    const testemunhaBefore = rowById(testemunhaId);
    const leadsBefore = leadsSnapshot();

    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(alvoId), vereditoFinal: "mudar_angulo" })
    );
    check(
      res && "success" in res && res.success === true,
      `VEREDITO-03 (setup): chamada de sucesso antes do snapshot comparativo (got ${JSON.stringify(res)})`
    );

    const leadsAfter = leadsSnapshot();
    check(
      leadsAfter === leadsBefore,
      "VEREDITO-03: snapshot de 'SELECT * FROM leads ORDER BY id' é EXATAMENTE igual antes/depois de um registro bem-sucedido"
    );

    const testemunhaAfter = rowById(testemunhaId);
    check(
      testemunhaAfter.estado === testemunhaBefore.estado &&
        testemunhaAfter.updated_at === testemunhaBefore.updated_at &&
        testemunhaAfter.veredito_final === null,
      `VEREDITO-03: a linha da campanha TESTEMUNHA está byte a byte idêntica (mesmo estado, mesmo updated_at, veredito_final NULL) (before=${JSON.stringify(testemunhaBefore)}, after=${JSON.stringify(testemunhaAfter)})`
    );
  }

  // --- Caso 9 (D-24-02 — re-registro sobrescreve) ---
  {
    raw.prepare("UPDATE campanhas SET veredito_decidido_em = 1000000000 WHERE id = ?").run(alvoId);
    const before = rowById(alvoId);
    // `before.veredito_final` é "mudar_angulo" (Caso 8) — registrar um valor
    // DIFERENTE aqui ("abandonar") é o que torna a mudança de vereditoFinal
    // uma prova de fato, não uma coincidência de reescrever o mesmo valor.
    const res = await registrarVeredito(
      undefined,
      fd({ campanhaId: String(alvoId), vereditoFinal: "abandonar" })
    );
    check(
      res && "success" in res && res.success === true,
      `D-24-02: re-registro devolve { success: true } (got ${JSON.stringify(res)})`
    );

    const after = rowById(alvoId);
    check(
      after.veredito_final === "abandonar" && after.veredito_final !== before.veredito_final,
      `D-24-02: veredito_final mudou no re-registro (before=${before.veredito_final}, after=${after.veredito_final})`
    );
    check(
      after.veredito_decidido_em > 1000000000,
      `D-24-02: veredito_decidido_em é MAIOR que o sentinela forçado por SQL cru (before=1000000000, after=${after.veredito_decidido_em})`
    );
  }

  raw.close();

  for (const suffix of ["", "-shm", "-wal"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* best-effort */
    }
  }
}

main()
  .then(() => {
    if (failed > 0) {
      console.error(`\n[test-veredito-actions] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log(
      "\n[test-veredito-actions] OK: 9 casos, todas as asserções passaram."
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("[test-veredito-actions] ERRO:", err.stack || err);
    process.exit(1);
  });
