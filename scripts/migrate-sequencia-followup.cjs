// Migração manual idempotente das duas colunas novas da Sequência de
// Follow-up Escalonada (Fase 10, SEQ-01/SEQ-02): leads.sequencia_posicao e
// configuracoes.sequencia_intervalos_dias. Aplica ALTER TABLE diretamente
// via better-sqlite3 (nunca drizzle-kit push/generate — leads tem 30+ linhas
// reais e configuracoes já está semeada desde a Fase 7; este projeto já
// sofreu o bug de "data-loss statement"/prompt de TTY duas vezes, Fases
// 06-01 e 07-01, exatamente neste padrão). Molde: scripts/backfill-origem-tipo.cjs
// (Fase 8) + 10-PATTERNS.md §scripts/migrate-sequencia-followup.cjs.
//
// O script NÃO faz backfill de dado — as duas colunas nascem preenchidas
// pelos DEFAULTs físicos (0 e '[4,10,20]'). Só DDL guardado por idempotência
// + verificação pós-migração.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-sequencia-followup] FALHOU: ${message}`);
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
console.log(`[migrate-sequencia-followup] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) GUARDA DE IDEMPOTÊNCIA DO DDL — leads.sequencia_posicao
const hasSequenciaPosicao = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "sequencia_posicao");

if (!hasSequenciaPosicao) {
  db.exec("ALTER TABLE `leads` ADD `sequencia_posicao` integer DEFAULT 0 NOT NULL;");
  console.log("[migrate-sequencia-followup] coluna leads.sequencia_posicao adicionada");
} else {
  console.log("[migrate-sequencia-followup] leads.sequencia_posicao já existe — pulando (idempotência)");
}

// 2b) GUARDA DE IDEMPOTÊNCIA DO DDL — configuracoes.sequencia_intervalos_dias
const hasIntervalos = db
  .prepare("PRAGMA table_info(configuracoes)")
  .all()
  .some((c) => c.name === "sequencia_intervalos_dias");

if (!hasIntervalos) {
  db.exec("ALTER TABLE `configuracoes` ADD `sequencia_intervalos_dias` text DEFAULT '[4,10,20]' NOT NULL;");
  console.log("[migrate-sequencia-followup] coluna configuracoes.sequencia_intervalos_dias adicionada");
} else {
  console.log(
    "[migrate-sequencia-followup] configuracoes.sequencia_intervalos_dias já existe — pulando (idempotência)"
  );
}

// 3) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const nullPosicaoCount = db.prepare("SELECT count(*) AS c FROM leads WHERE sequencia_posicao IS NULL").get().c;
if (nullPosicaoCount !== 0) {
  fail(`${nullPosicaoCount} linha(s) de leads com sequencia_posicao NULL após a migração`);
}

const nullIntervalosCount = db
  .prepare("SELECT count(*) AS c FROM configuracoes WHERE sequencia_intervalos_dias IS NULL")
  .get().c;
if (nullIntervalosCount !== 0) {
  fail(`${nullIntervalosCount} linha(s) de configuracoes com sequencia_intervalos_dias NULL após a migração`);
}

// Para cada linha existente de configuracoes (0 ou 1 — a linha singleton
// id=1 é semeada em getConfiguracoes(), não por esta migração), o valor
// precisa ser um JSON válido de array de inteiros >= 1.
const configRows = db.prepare("SELECT id, sequencia_intervalos_dias AS raw FROM configuracoes").all();
for (const row of configRows) {
  let parsed;
  try {
    parsed = JSON.parse(row.raw);
  } catch (err) {
    fail(`configuracoes.id=${row.id}: sequencia_intervalos_dias não é JSON válido (${row.raw}): ${err.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((n) => Number.isInteger(n) && n >= 1)) {
    fail(
      `configuracoes.id=${row.id}: sequencia_intervalos_dias não é um array de inteiros >= 1 (got ${JSON.stringify(parsed)})`
    );
  }
}

console.log(
  `[migrate-sequencia-followup] OK: ${afterLeads} leads, 0 NULL em sequencia_posicao; ${configRows.length} linha(s) de configuracoes verificada(s), 0 NULL em sequencia_intervalos_dias`
);

db.close();
process.exit(0);
