// Migração manual idempotente da governança de motivos de perda (Fase 11,
// PERDA-01, D-01/D-02): cria a tabela `motivos_perda` (réplica estrutural de
// `subnichos`), semeia os 6 motivos padrão de D-02 e adiciona a coluna FK
// nullable `leads.motivo_perda_id`.
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit push/generate.
// Dois incidentes destrutivos documentados neste repositório neste mesmo
// padrão (Fases 06-01 e 07-01: "data-loss statement" + prompt de TTY antes do
// ADD COLUMN) e o snapshot do drizzle-kit está divergente do banco real desde
// a Fase 4 (11-RESEARCH.md Pitfall 5). Molde bloco-a-bloco:
// scripts/migrate-sequencia-followup.cjs + scripts/backfill-origem-tipo.cjs.
//
// NÃO faz conversão de dado da coluna antiga `leads.motivo_perda` (texto
// livre): há 23 leads reais e ZERO em stage='perdido' (11-CONTEXT.md), não
// existe texto a migrar. Ainda assim faz backup e é idempotente porque roda
// contra dado real de produção.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

// Rótulos-semente de D-02 — VERBATIM e nesta ordem.
const SEEDS = [
  "Preço",
  "Sem retorno do lead",
  "Concorrente",
  "Sem verba/orçamento",
  "Timing (não é prioridade agora)",
  "Outro",
];

function fail(message) {
  console.error(`[migrate-motivos-perda] FALHOU: ${message}`);
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
console.log(`[migrate-motivos-perda] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

// 2) Contagem de referência ANTES de qualquer escrita.
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) CREATE TABLE idempotente — guarda via sqlite_master (tabela, não coluna).
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='motivos_perda'")
  .get();

let tableJustCreated = false;
if (!tableExists) {
  db.exec(
    "CREATE TABLE motivos_perda (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));"
  );
  db.exec("CREATE UNIQUE INDEX motivo_perda_nome_unique_idx ON motivos_perda (lower(trim(nome)));");
  db.exec("CREATE INDEX motivos_perda_deleted_at_idx ON motivos_perda (deleted_at);");
  tableJustCreated = true;
  console.log("[migrate-motivos-perda] tabela motivos_perda criada (+ 2 índices)");
} else {
  console.log("[migrate-motivos-perda] tabela motivos_perda já existe — pulando CREATE (idempotência)");
}

// 4) SEED D-02 — SOMENTE quando a tabela acabou de ser criada nesta execução.
//    Nunca re-semeia tabela pré-existente.
if (tableJustCreated) {
  const insert = db.prepare("INSERT INTO motivos_perda (nome) VALUES (?)");
  const insertMany = db.transaction((nomes) => {
    for (const nome of nomes) insert.run(nome);
  });
  insertMany(SEEDS);
  console.log(`[migrate-motivos-perda] ${SEEDS.length} motivos de D-02 semeados`);
} else {
  console.log("[migrate-motivos-perda] seed D-02 pulado — tabela não foi criada nesta execução (idempotência)");
}

// 5) ADD COLUMN idempotente — leads.motivo_perda_id (nullable, FK).
//    Guarda via PRAGMA table_info (coluna, não tabela). Nullable e sem NOT
//    NULL: o SQLite exige DEFAULT NULL para coluna com REFERENCES adicionada
//    via ALTER TABLE, e a obrigatoriedade condicional (D-04) mora no Zod.
const hasMotivoPerdaId = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "motivo_perda_id");

if (!hasMotivoPerdaId) {
  db.exec("ALTER TABLE `leads` ADD `motivo_perda_id` integer REFERENCES `motivos_perda`(`id`);");
  console.log("[migrate-motivos-perda] coluna leads.motivo_perda_id adicionada (nullable, FK -> motivos_perda.id)");
} else {
  console.log("[migrate-motivos-perda] leads.motivo_perda_id já existe — pulando ALTER TABLE (idempotência)");
}

// 6) Índice de cobertura do GROUP BY da Seção 3 do relatório.
db.exec("CREATE INDEX IF NOT EXISTS leads_motivo_perda_id_idx ON leads (motivo_perda_id);");

// 7) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const motivosCount = db.prepare("SELECT count(*) AS c FROM motivos_perda").get().c;
if (motivosCount < 6) {
  fail(`motivos_perda tem ${motivosCount} linha(s), esperado >= 6 (seeds de D-02)`);
}

const fkList = db.prepare("PRAGMA foreign_key_list(leads)").all();
const hasFk = fkList.some((fk) => fk.table === "motivos_perda" && fk.from === "motivo_perda_id");
if (!hasFk) {
  fail("PRAGMA foreign_key_list(leads) não contém FK motivo_perda_id -> motivos_perda");
}

console.log(
  `[migrate-motivos-perda] OK: ${afterLeads} leads intactos (antes=${beforeLeads}), ${motivosCount} motivos presentes, FK motivo_perda_id confirmada`
);

db.close();
process.exit(0);
