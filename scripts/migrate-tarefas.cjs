// Migração manual idempotente da agenda de tarefas soltas (Fase 12,
// TAREFA-01, D-01/D-06/D-08): cria a tabela `tarefas` — totalmente
// DESACOPLADA de `leads` (sem FK) e SEM `deletedAt` (D-08: exclusão de
// tarefa é hard-delete, `tarefas` é a exceção documentada em
// scripts/guard-no-hard-delete.cjs).
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit
// push/generate. Dois incidentes destrutivos documentados neste repositório
// neste mesmo padrão (Fases 06-01 e 07-01) e o snapshot do drizzle-kit está
// divergente do banco real desde a Fase 4. Molde bloco-a-bloco:
// scripts/migrate-motivos-perda.cjs (removendo o SEED e o ALTER TABLE —
// `tarefas` nasce vazia e sem FK).
//
// [BLOCKING]: `tsc`/`next build` derivam tipos de `schema.ts` e passariam
// mesmo com o banco desatualizado (falso-positivo). Nenhum plano posterior
// da Fase 12 pode rodar sem a tabela viva em data/crm.db.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-tarefas] FALHOU: ${message}`);
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
console.log(`[migrate-tarefas] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

// 2) Contagem de referência ANTES de qualquer escrita — testemunha de que
//    esta migração não toca `leads`.
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) CREATE TABLE idempotente — guarda via sqlite_master (tabela, não coluna).
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tarefas'")
  .get();

if (!tableExists) {
  db.exec(
    "CREATE TABLE tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, data INTEGER NOT NULL, concluida_em INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));"
  );
  db.exec("CREATE INDEX tarefas_concluida_em_idx ON tarefas (concluida_em);");
  db.exec("CREATE INDEX tarefas_data_idx ON tarefas (data);");
  console.log("[migrate-tarefas] tabela tarefas criada (+ 2 índices)");
} else {
  console.log("[migrate-tarefas] tabela tarefas já existe — pulando CREATE (idempotência)");
}

// 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const tarefasTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tarefas'")
  .get();
if (!tarefasTable) {
  fail("tabela tarefas ausente após a migração");
}

const cols = db.prepare("PRAGMA table_info(tarefas)").all().map((c) => c.name);
const EXPECTED_COLUMNS = ["id", "descricao", "data", "concluida_em", "created_at", "updated_at"];
for (const expected of EXPECTED_COLUMNS) {
  if (!cols.includes(expected)) fail(`coluna tarefas.${expected} ausente`);
}
const extraCols = cols.filter((c) => !EXPECTED_COLUMNS.includes(c));
if (extraCols.length > 0) {
  fail(`tarefas tem coluna(s) inesperada(s): ${extraCols.join(", ")}`);
}

const idxNames = db
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tarefas'")
  .all()
  .map((r) => r.name);
for (const i of ["tarefas_concluida_em_idx", "tarefas_data_idx"]) {
  if (!idxNames.includes(i)) fail(`índice ${i} ausente`);
}

console.log(
  `[migrate-tarefas] OK: tabela tarefas com ${cols.length} colunas e 2 índices, ${afterLeads} leads intactos (antes=${beforeLeads})`
);

db.close();
process.exit(0);
