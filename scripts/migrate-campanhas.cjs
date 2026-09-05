// Migração manual idempotente da campanha de exploração de nicho (Fase 22,
// CAMPANHA-01/02/04): cria a tabela `campanhas` (nicho + oferta + janela de
// tempo + meta + estado) e adiciona a coluna FK nullable `leads.campanha_id`.
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit push/generate.
// Dois incidentes destrutivos documentados neste repositório neste mesmo
// padrão (Fases 06-01 e 07-01: "data-loss statement" + prompt de TTY antes do
// ADD COLUMN) e o snapshot do drizzle-kit está divergente do banco real desde
// a Fase 4. Molde bloco-a-bloco: scripts/migrate-motivos-perda.cjs (backup +
// CREATE TABLE idempotente) + scripts/migrate-tarefas.cjs (contagem de leads
// como testemunha de não-regressão).
//
// ATENÇÃO: a tabela FÍSICA de nichos é `subnichos`, NUNCA `nichos` (D-01 da
// Fase 13, ver doc-comment de src/db/schema.ts) — a REFERENCES do DDL bruto
// abaixo aponta para `subnichos(id)`.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-campanhas] FALHOU: ${message}`);
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
console.log(`[migrate-campanhas] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

// 2) Contagem de referência ANTES de qualquer escrita — testemunha de que
//    esta migração não toca linhas de `leads`.
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) CREATE TABLE idempotente — guarda via sqlite_master (tabela, não coluna).
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='campanhas'")
  .get();

if (!tableExists) {
  db.exec(
    "CREATE TABLE campanhas (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "nicho_id INTEGER NOT NULL REFERENCES subnichos(id), " +
      "oferta TEXT NOT NULL, " +
      "meta_conversao TEXT NOT NULL, " +
      "janela_inicio INTEGER NOT NULL, " +
      "janela_fim INTEGER NOT NULL, " +
      "estado TEXT NOT NULL DEFAULT 'explorando', " +
      "deleted_at INTEGER, " +
      "created_at INTEGER NOT NULL DEFAULT (unixepoch()), " +
      "updated_at INTEGER NOT NULL DEFAULT (unixepoch())" +
      ");"
  );
  db.exec("CREATE INDEX campanhas_nicho_id_idx ON campanhas (nicho_id);");
  db.exec("CREATE INDEX campanhas_deleted_at_idx ON campanhas (deleted_at);");
  db.exec("CREATE INDEX campanhas_estado_idx ON campanhas (estado);");
  console.log("[migrate-campanhas] tabela campanhas criada (+ 3 índices)");
} else {
  console.log("[migrate-campanhas] tabela campanhas já existe — pulando CREATE (idempotência)");
}

// 4) ADD COLUMN idempotente — leads.campanha_id (nullable, FK). Guarda via
//    PRAGMA table_info (coluna, não tabela). Nullable e SEM DEFAULT (SQLite
//    não exige default para ADD COLUMN nullable, mesmo padrão de
//    motivo_perda_id/interesse). try/catch tolera "duplicate column name"
//    como corrida benigna (mesmo padrão de migrate-interesse.cjs).
const hasCampanhaId = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "campanha_id");

if (!hasCampanhaId) {
  try {
    db.exec("ALTER TABLE `leads` ADD `campanha_id` integer REFERENCES `campanhas`(`id`);");
    console.log("[migrate-campanhas] coluna leads.campanha_id adicionada (nullable, FK -> campanhas.id)");
  } catch (err) {
    if (!/duplicate column name/i.test(err.message)) {
      fail(`ALTER TABLE leads ADD campanha_id falhou: ${err.message}`);
    }
    console.log("[migrate-campanhas] leads.campanha_id já existe (corrida benigna) — pulando ALTER TABLE");
  }
} else {
  console.log("[migrate-campanhas] leads.campanha_id já existe — pulando ALTER TABLE (idempotência)");
}

db.exec("CREATE INDEX IF NOT EXISTS leads_campanha_id_idx ON leads (campanha_id);");

// 5) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const campanhasTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='campanhas'")
  .get();
if (!campanhasTable) {
  fail("tabela campanhas ausente após a migração");
}

const cols = db.prepare("PRAGMA table_info(campanhas)").all().map((c) => c.name);
const EXPECTED_COLUMNS = [
  "id",
  "nicho_id",
  "oferta",
  "meta_conversao",
  "janela_inicio",
  "janela_fim",
  "estado",
  "deleted_at",
  "created_at",
  "updated_at",
];
for (const expected of EXPECTED_COLUMNS) {
  if (!cols.includes(expected)) fail(`coluna campanhas.${expected} ausente`);
}
const extraCols = cols.filter((c) => !EXPECTED_COLUMNS.includes(c));
if (extraCols.length > 0) {
  fail(`campanhas tem coluna(s) inesperada(s): ${extraCols.join(", ")}`);
}

const campanhasIdxNames = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='campanhas'")
  .all()
  .map((r) => r.name);
for (const i of ["campanhas_nicho_id_idx", "campanhas_deleted_at_idx", "campanhas_estado_idx"]) {
  if (!campanhasIdxNames.includes(i)) fail(`índice ${i} ausente`);
}

const leadsIdxNames = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='leads'")
  .all()
  .map((r) => r.name);
if (!leadsIdxNames.includes("leads_campanha_id_idx")) {
  fail("índice leads_campanha_id_idx ausente");
}

const campanhasFkList = db.prepare("PRAGMA foreign_key_list(campanhas)").all();
const hasNichoFk = campanhasFkList.some(
  (fk) => fk.table === "subnichos" && fk.from === "nicho_id"
);
if (!hasNichoFk) {
  fail("PRAGMA foreign_key_list(campanhas) não contém FK nicho_id -> subnichos");
}

const leadsFkList = db.prepare("PRAGMA foreign_key_list(leads)").all();
const hasCampanhaFk = leadsFkList.some(
  (fk) => fk.table === "campanhas" && fk.from === "campanha_id"
);
if (!hasCampanhaFk) {
  fail("PRAGMA foreign_key_list(leads) não contém FK campanha_id -> campanhas");
}

console.log(
  `[migrate-campanhas] OK: tabela campanhas com ${cols.length} colunas e 3 índices, coluna leads.campanha_id + índice confirmados, ${afterLeads} leads intactos (antes=${beforeLeads})`
);

db.close();
process.exit(0);
