// Migração + backfill idempotente de leads.origem_tipo (Fase 8, ORIGEM-01/02).
// Aplica ALTER TABLE `leads` ADD `origem_tipo` diretamente via better-sqlite3
// (nunca drizzle-kit push/generate — Pitfall 1 do 08-RESEARCH.md, dois
// precedentes reais de comportamento destrutivo/não-confiável neste
// repositório, Fases 06-01 e 07-01). Molde: scripts/verify-pipeline-migration.cjs
// (DB_PATH, fail(), PRAGMA table_info) + Pattern 2 do 08-RESEARCH.md.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[backfill-origem-tipo] FALHOU: ${message}`);
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
console.log(`[backfill-origem-tipo] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

const before = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) GUARDA DE IDEMPOTÊNCIA DO DDL — SQLite lança "duplicate column name" se
//    o ALTER TABLE rodar 2x. Checagem via PRAGMA table_info evita esse erro.
const hasColumn = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "origem_tipo");

if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;");
  console.log(
    "[backfill-origem-tipo] coluna origem_tipo adicionada (DEFAULT 'outbound' já backfillou todas as linhas existentes)"
  );
} else {
  console.log("[backfill-origem-tipo] coluna origem_tipo já existe — pulando ALTER TABLE (idempotência)");
}

// 3) GUARDA DE IDEMPOTÊNCIA DO DADO — sempre condicional a IS NULL (nunca
//    incondicional), para nunca sobrescrever uma linha já reclassificada
//    manualmente para "inbound" pelo admin (Constraint do 08-SPEC.md).
const result = db.prepare("UPDATE leads SET origem_tipo = 'outbound' WHERE origem_tipo IS NULL").run();
console.log(
  `[backfill-origem-tipo] UPDATE idempotente afetou ${result.changes} linha(s) (esperado: 0 se a coluna já existia)`
);

// 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
const after = db.prepare("SELECT count(*) AS c FROM leads").get().c;
const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo IS NULL").get().c;
const outboundCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo = 'outbound'").get().c;
const inboundCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo = 'inbound'").get().c;

if (before !== after) {
  fail(`contagem de linhas mudou: antes=${before} depois=${after}`);
}
if (nullCount !== 0) {
  fail(`${nullCount} linha(s) com origem_tipo NULL após o backfill`);
}

console.log(
  `[backfill-origem-tipo] OK: ${after} linhas totais, 0 NULL, ${outboundCount} outbound, ${inboundCount} inbound`
);

db.close();
process.exit(0);
