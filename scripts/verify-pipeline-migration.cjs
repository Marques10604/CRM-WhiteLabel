// Verifica que o banco SQLite real (./data/crm.db) recebeu a migração do
// split de etapa (Fase 3, plano 03-01): colunas motivo_perda/stage_changed_at
// presentes, nenhum lead remanescente em "fechado_perdido", e stage_changed_at
// preenchido em todas as linhas. Molde: scripts/verify-schema.cjs (01-01).
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[verify-pipeline-migration] FALHOU: ${message}`);
  process.exit(1);
}

let db;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (err) {
  fail(`não foi possível abrir o banco em ${DB_PATH}: ${err.message}`);
}

const columns = db.prepare("PRAGMA table_info(leads)").all().map((c) => c.name);

if (!columns.includes("motivo_perda")) {
  fail("coluna 'motivo_perda' ausente na tabela 'leads'");
}
if (!columns.includes("stage_changed_at")) {
  fail("coluna 'stage_changed_at' ausente na tabela 'leads'");
}

const remainingCombined = db
  .prepare("SELECT count(*) AS c FROM leads WHERE stage = 'fechado_perdido'")
  .get().c;
if (remainingCombined !== 0) {
  fail(`${remainingCombined} lead(s) ainda em 'fechado_perdido' (backfill não aplicado)`);
}

const fechadoCount = db.prepare("SELECT count(*) AS c FROM leads WHERE stage = 'fechado'").get().c;
if (fechadoCount === 0) {
  console.warn(
    "[verify-pipeline-migration] AVISO: nenhum lead em 'fechado' — esperado ao menos 1 nos dados de produção conhecidos, mas não é um erro de migração em si."
  );
}

const nullStageChangedAt = db
  .prepare("SELECT count(*) AS c FROM leads WHERE stage_changed_at IS NULL")
  .get().c;
if (nullStageChangedAt !== 0) {
  fail(`${nullStageChangedAt} lead(s) com stage_changed_at IS NULL (backfill incompleto)`);
}

db.close();
console.log(
  "[verify-pipeline-migration] OK: colunas motivo_perda/stage_changed_at presentes, 0 leads em 'fechado_perdido', 0 stage_changed_at nulos em",
  DB_PATH
);
process.exit(0);
