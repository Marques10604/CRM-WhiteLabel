// Migração manual idempotente do Diagnóstico de IA da campanha (Fase 23,
// DIAGNOSTICO-01/10): cria a tabela APPEND-ONLY `diagnosticos` (payload JSON
// do objeto validado + fontes + buscas + tokens + status + erro/aviso), com
// FK `campanha_id -> campanhas(id)` e 3 índices.
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit push/generate.
// Dois incidentes destrutivos documentados neste repositório neste mesmo
// padrão (Fases 06-01 e 07-01) e o snapshot do drizzle-kit está divergente do
// banco real desde a Fase 4. Molde bloco-a-bloco: scripts/migrate-campanhas.cjs
// (backup + CREATE TABLE idempotente + verificação pós) e
// scripts/migrate-tarefas.cjs (tabela nova sem ALTER em `leads`).
//
// D-23-01: `criado_em` é INTEGER timestamp com DEFAULT (unixepoch()), NÃO ISO
// string — idioma de todo timestamp do schema.ts (campanhas.created_at etc.).
// D-23-07: `erro` e `aviso` são colunas SEPARADAS — `erro` só com
// status='falhou', `aviso` só com status='ok'.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-diagnosticos] FALHOU: ${message}`);
  process.exit(1);
}

// 1) BACKUP ANTES DE QUALQUER ESCRITA — checkpoint do WAL primeiro (o
//    src/db/client.ts roda em journal_mode=WAL), senão a cópia do arquivo
//    principal pode não conter escritas ainda pendentes no -wal.
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}
console.log(`[migrate-diagnosticos] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

// 2) Contagens-testemunha de não-regressão ANTES de qualquer escrita — esta
//    migração não pode tocar nenhuma linha existente de `campanhas` nem de
//    `leads`.
const beforeCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) CREATE TABLE idempotente — guarda via sqlite_master (tabela, não coluna).
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='diagnosticos'")
  .get();

if (!tableExists) {
  db.exec(
    "CREATE TABLE diagnosticos (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "campanha_id INTEGER NOT NULL REFERENCES campanhas(id), " +
      "payload TEXT, " +          // JSON do objeto validado; NULL quando status='falhou'
      "fontes TEXT, " +           // JSON [{url,title}]
      "buscas TEXT, " +           // JSON string[] (queries de onStepFinish)
      "status TEXT NOT NULL, " +  // 'ok' | 'falhou'
      "erro TEXT, " +             // nullable — só com status='falhou' (D-23-07)
      "aviso TEXT, " +            // nullable — só com status='ok' (D-23-07)
      "input_tokens INTEGER, " +
      "output_tokens INTEGER, " +
      "criado_em INTEGER NOT NULL DEFAULT (unixepoch())" +
      ");"
  );
  db.exec("CREATE INDEX diagnosticos_campanha_id_idx ON diagnosticos (campanha_id);");
  db.exec("CREATE INDEX diagnosticos_criado_em_idx ON diagnosticos (criado_em);");
  db.exec("CREATE INDEX diagnosticos_status_idx ON diagnosticos (status);");
  console.log("[migrate-diagnosticos] tabela diagnosticos criada (+ 3 índices)");
} else {
  console.log("[migrate-diagnosticos] tabela diagnosticos já existe — pulando CREATE (idempotência)");
}

// 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeCampanhas !== afterCampanhas) {
  fail(`contagem de linhas de campanhas mudou: antes=${beforeCampanhas} depois=${afterCampanhas}`);
}
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const diagnosticosTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='diagnosticos'")
  .get();
if (!diagnosticosTable) {
  fail("tabela diagnosticos ausente após a migração");
}

const cols = db.prepare("PRAGMA table_info(diagnosticos)").all().map((c) => c.name);
const EXPECTED_COLUMNS = [
  "id",
  "campanha_id",
  "payload",
  "fontes",
  "buscas",
  "status",
  "erro",
  "aviso",
  "input_tokens",
  "output_tokens",
  "criado_em",
];
for (const expected of EXPECTED_COLUMNS) {
  if (!cols.includes(expected)) fail(`coluna diagnosticos.${expected} ausente`);
}
const extraCols = cols.filter((c) => !EXPECTED_COLUMNS.includes(c));
if (extraCols.length > 0) {
  fail(`diagnosticos tem coluna(s) inesperada(s): ${extraCols.join(", ")}`);
}

const diagnosticosIdxNames = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='diagnosticos'")
  .all()
  .map((r) => r.name);
for (const i of [
  "diagnosticos_campanha_id_idx",
  "diagnosticos_criado_em_idx",
  "diagnosticos_status_idx",
]) {
  if (!diagnosticosIdxNames.includes(i)) fail(`índice ${i} ausente`);
}

const diagnosticosFkList = db.prepare("PRAGMA foreign_key_list(diagnosticos)").all();
const hasCampanhaFk = diagnosticosFkList.some(
  (fk) => fk.table === "campanhas" && fk.from === "campanha_id"
);
if (!hasCampanhaFk) {
  fail("PRAGMA foreign_key_list(diagnosticos) não contém FK campanha_id -> campanhas");
}

console.log(
  `[migrate-diagnosticos] OK: tabela diagnosticos com ${cols.length} colunas e 3 índices, FK campanha_id -> campanhas confirmada, ${afterCampanhas} campanhas e ${afterLeads} leads intactos (antes: ${beforeCampanhas}/${beforeLeads})`
);

db.close();
process.exit(0);
