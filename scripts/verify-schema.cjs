// Verifica que o banco SQLite real (./data/crm.db) contém as tabelas e o
// índice único case-insensitive esperados após `drizzle-kit generate` + `migrate`.
// Usado pela Task 3 do plano 01-01 como gate obrigatório de sync de schema
// (build/tsc passam sem banco vivo — este script evita esse falso-positivo).
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[verify-schema] FALHOU: ${message}`);
  process.exit(1);
}

let db;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (err) {
  fail(`não foi possível abrir o banco em ${DB_PATH}: ${err.message}`);
}

const rows = db
  .prepare("SELECT type, name FROM sqlite_master WHERE type IN ('table', 'index')")
  .all();

const tableNames = new Set(rows.filter((r) => r.type === "table").map((r) => r.name));
const indexNames = new Set(rows.filter((r) => r.type === "index").map((r) => r.name));

const requiredTables = ["leads", "subnichos", "interacoes", "motivos_perda"];
const requiredIndexes = [
  "subnicho_nome_unique_idx",
  "interacoes_lead_id_idx",
  "interacoes_deleted_at_idx",
  "motivo_perda_nome_unique_idx",
];

const missingTables = requiredTables.filter((t) => !tableNames.has(t));
const missingIndexes = requiredIndexes.filter((i) => !indexNames.has(i));

if (missingTables.length > 0) {
  fail(`tabelas ausentes em sqlite_master: ${missingTables.join(", ")}`);
}
if (missingIndexes.length > 0) {
  fail(`índices ausentes em sqlite_master: ${missingIndexes.join(", ")}`);
}

// Gate de sync de schema para a tabela interacoes (Fase 9, TIMELINE-01/02):
// exige exatamente o conjunto de colunas físicas, nem a mais nem a menos.
const REQUIRED_INTERACOES_COLUMNS = [
  "id",
  "lead_id",
  "tipo",
  "texto",
  "created_at",
  "updated_at",
  "deleted_at",
];

if (tableNames.has("interacoes")) {
  const interacoesColumns = db
    .prepare("PRAGMA table_info(interacoes)")
    .all()
    .map((c) => c.name);
  const columnSet = new Set(interacoesColumns);
  const requiredSet = new Set(REQUIRED_INTERACOES_COLUMNS);

  const missingColumns = REQUIRED_INTERACOES_COLUMNS.filter((c) => !columnSet.has(c));
  const extraColumns = interacoesColumns.filter((c) => !requiredSet.has(c));

  if (missingColumns.length > 0 || extraColumns.length > 0) {
    fail(
      `colunas de 'interacoes' divergentes — faltando: [${missingColumns.join(", ")}], extras: [${extraColumns.join(", ")}]`
    );
  }
}

// Gate permanente de PRESENÇA para as duas colunas da Sequência de
// Follow-up Escalonada (Fase 10, SEQ-01/SEQ-02). Deliberadamente checagem de
// PRESENÇA, não de conjunto estrito (diferente do bloco de 'interacoes'
// acima) — 'leads' acumula colunas a cada fase (origem_tipo, contact_attempts,
// import_batch_id, e agora sequencia_posicao) e um conjunto estrito viraria
// manutenção obrigatória em toda fase futura que tocar essa tabela.
if (tableNames.has("leads")) {
  const leadsColumns = new Set(db.prepare("PRAGMA table_info(leads)").all().map((c) => c.name));
  if (!leadsColumns.has("sequencia_posicao")) {
    fail("coluna ausente: leads.sequencia_posicao (Fase 10, SEQ-02)");
  }
  if (!leadsColumns.has("motivo_perda_id")) {
    fail("coluna ausente: leads.motivo_perda_id (Fase 11, PERDA-01)");
  }
}

if (tableNames.has("configuracoes")) {
  const configColumns = new Set(db.prepare("PRAGMA table_info(configuracoes)").all().map((c) => c.name));
  if (!configColumns.has("sequencia_intervalos_dias")) {
    fail("coluna ausente: configuracoes.sequencia_intervalos_dias (Fase 10, SEQ-01)");
  }
}

db.close();
console.log(
  "[verify-schema] OK: tabelas 'leads'/'subnichos'/'interacoes'/'motivos_perda' e índices esperados presentes, colunas 'sequencia_posicao'/'sequencia_intervalos_dias'/'motivo_perda_id' presentes em",
  DB_PATH
);
process.exit(0);
