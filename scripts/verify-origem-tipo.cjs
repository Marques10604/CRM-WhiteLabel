// Guarda permanente da fiação de origemTipo (ORIGEM-01/02, Fase 8) — prova que
// os 5 elos entre schema/validação/formulário/import continuam presentes, e
// que o banco real nunca tem uma linha sem classificação (ou fora do enum).
// Idioma de guarda igual a scripts/verify-pipeline-migration.cjs: prefixo de
// log [verify-origem-tipo], fail() com process.exit(1), DB_PATH resolvido de
// DB_FILE_NAME (permite apontar para um banco temporário em testes).
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

// Override de caminho — existe só para scripts/test-mutation-guard.cjs poder
// apontar esta checagem específica para uma CÓPIA temporária de
// import-actions.ts, nunca para o arquivo real. Sem a env var, comportamento
// idêntico a um caminho fixo (lê o arquivo real do projeto).
const IMPORT_ACTIONS_PATH =
  process.env.ORIGEM_TIPO_IMPORT_ACTIONS_PATH ??
  path.join(__dirname, "..", "src", "actions", "import-actions.ts");

const SCHEMA_PATH = path.join(__dirname, "..", "src", "db", "schema.ts");
const VALIDATIONS_PATH = path.join(__dirname, "..", "src", "lib", "validations.ts");
const LEAD_FORM_DIALOG_PATH = path.join(__dirname, "..", "src", "components", "lead-form-dialog.tsx");

function fail(message) {
  console.error(`[verify-origem-tipo] FALHOU: ${message}`);
  process.exit(1);
}

// Remove comentários de bloco e de linha antes de qualquer checagem — os
// próprios arquivos-fonte mencionam "origemTipo"/".default(" em comentários
// explicativos (D-04 etc.), e uma busca solta pela palavra acertaria esses
// comentários em vez de sintaxe real. Nenhum dos arquivos lidos aqui tem
// literais de string contendo "//" (ex.: URLs), então a remoção é segura.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function readStripped(filePath) {
  return stripComments(fs.readFileSync(filePath, "utf8"));
}

const staticFailures = [];
function checkStatic(condition, message) {
  if (!condition) staticFailures.push(message);
}

// --- Elo 1: src/db/schema.ts — coluna Drizzle origemTipo ---
{
  const schemaSrc = readStripped(SCHEMA_PATH);
  const window = (schemaSrc.match(/origemTipo:\s*text\([\s\S]{0,220}?\)[\s\S]{0,80}?[,;]/) || [""])[0];
  checkStatic(
    /text\(\s*["']origem_tipo["']\s*,\s*\{\s*enum:\s*\[\s*["']inbound["']\s*,\s*["']outbound["']\s*\]\s*\}\s*\)/.test(window),
    "src/db/schema.ts: coluna origemTipo não declara text(\"origem_tipo\", { enum: [\"inbound\", \"outbound\"] })"
  );
  checkStatic(/\.notNull\(\)/.test(window), "src/db/schema.ts: coluna origemTipo sem .notNull() encadeado");
  checkStatic(
    /\.default\(\s*["']outbound["']\s*\)/.test(window),
    'src/db/schema.ts: coluna origemTipo sem .default("outbound") encadeado'
  );
}

// --- Elo 2 e 3: src/lib/validations.ts — leadSchema (sem default) e csvRowSchema (com default) ---
{
  const validationsSrc = readStripped(VALIDATIONS_PATH);
  const csvRowSchemaIdx = validationsSrc.indexOf("export const csvRowSchema");
  checkStatic(csvRowSchemaIdx !== -1, "src/lib/validations.ts: csvRowSchema não encontrado");

  const leadSchemaSrc = csvRowSchemaIdx === -1 ? validationsSrc : validationsSrc.slice(0, csvRowSchemaIdx);
  const csvRowSchemaSrc = csvRowSchemaIdx === -1 ? "" : validationsSrc.slice(csvRowSchemaIdx);

  const leadWindow = (leadSchemaSrc.match(/origemTipo:[\s\S]*?(?=\n\s{2}\w+:|\n\}\);)/) || [""])[0];
  checkStatic(
    /origemTipo:\s*z\.enum\(\s*\[\s*["']inbound["']\s*,\s*["']outbound["']\s*\]/.test(leadWindow),
    "src/lib/validations.ts: leadSchema.origemTipo não é z.enum([\"inbound\", \"outbound\"])"
  );
  checkStatic(
    leadWindow !== "" && !/\.default\(/.test(leadWindow),
    "src/lib/validations.ts: leadSchema.origemTipo ganhou um .default( — D-04 exige formulário manual sem pré-seleção"
  );

  checkStatic(
    /origemTipo:\s*z\.enum\(\s*\[\s*["']inbound["']\s*,\s*["']outbound["']\s*\]\s*\)\s*\.default\(\s*["']outbound["']\s*\)/.test(
      csvRowSchemaSrc
    ),
    'src/lib/validations.ts: csvRowSchema.origemTipo não é z.enum([...]).default("outbound")'
  );
}

// --- Elo 4: src/components/lead-form-dialog.tsx — select com as 2 opções ---
{
  const formSrc = readStripped(LEAD_FORM_DIALOG_PATH);
  checkStatic(
    /ORIGEM_TIPO_OPTIONS\s*=\s*\[[\s\S]{0,200}?\]/.test(formSrc),
    "src/components/lead-form-dialog.tsx: ORIGEM_TIPO_OPTIONS não encontrado"
  );
  checkStatic(
    /value:\s*["']inbound["']/.test(formSrc) && /value:\s*["']outbound["']/.test(formSrc),
    "src/components/lead-form-dialog.tsx: ORIGEM_TIPO_OPTIONS não contém os dois valores inbound/outbound"
  );
  checkStatic(/name="origemTipo"/.test(formSrc), 'src/components/lead-form-dialog.tsx: nenhum name="origemTipo" encontrado');
}

// --- Elo 5: src/actions/import-actions.ts — persistência no insert do import CSV ---
{
  let importActionsSrc;
  try {
    importActionsSrc = readStripped(IMPORT_ACTIONS_PATH);
  } catch (err) {
    checkStatic(false, `não foi possível ler ${IMPORT_ACTIONS_PATH}: ${err.message}`);
    importActionsSrc = "";
  }
  checkStatic(
    /origemTipo:\s*row\.origemTipo\s*,/.test(importActionsSrc),
    `${IMPORT_ACTIONS_PATH}: bulkImportLeads não persiste "origemTipo: row.origemTipo," no insert (Pitfall 3)`
  );
}

if (staticFailures.length > 0) {
  for (const message of staticFailures) {
    console.error(`[verify-origem-tipo] FALHOU: ${message}`);
  }
  console.error(`\n[verify-origem-tipo] ${staticFailures.length} elo(s) da fiação quebrado(s).`);
  process.exit(1);
}

// --- Metade de banco real — só roda se o arquivo existir (ambiente limpo é ok) ---
let dbSummary = "banco não verificado (arquivo ausente)";
if (fs.existsSync(DB_PATH)) {
  let db;
  try {
    db = new Database(DB_PATH, { fileMustExist: true });
  } catch (err) {
    fail(`não foi possível abrir o banco em ${DB_PATH}: ${err.message}`);
  }

  const columns = db.prepare("PRAGMA table_info(leads)").all();
  const origemTipoCol = columns.find((c) => c.name === "origem_tipo");
  if (!origemTipoCol) {
    fail(`coluna 'origem_tipo' ausente em PRAGMA table_info(leads) (${DB_PATH})`);
  }
  if (origemTipoCol.notnull !== 1) {
    fail(`coluna 'origem_tipo' não é NOT NULL (notnull=${origemTipoCol.notnull})`);
  }
  if (origemTipoCol.dflt_value !== "'outbound'") {
    fail(`coluna 'origem_tipo' com default inesperado (got ${origemTipoCol.dflt_value})`);
  }

  const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo IS NULL").get().c;
  if (nullCount !== 0) {
    fail(`${nullCount} lead(s) com origem_tipo IS NULL`);
  }

  const invalidCount = db
    .prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo NOT IN ('inbound','outbound')")
    .get().c;
  if (invalidCount !== 0) {
    fail(`${invalidCount} lead(s) com origem_tipo fora de ('inbound','outbound')`);
  }

  const distribution = db.prepare("SELECT origem_tipo, count(*) AS c FROM leads GROUP BY origem_tipo").all();
  dbSummary = distribution.map((r) => `${r.origem_tipo}=${r.c}`).join(", ") || "(tabela leads vazia)";
  db.close();
} else {
  console.warn(`[verify-origem-tipo] AVISO: banco ausente em ${DB_PATH} — pulando checagem de banco real.`);
}

console.log(
  `[verify-origem-tipo] OK: 5 elos da fiação íntegros (schema.ts, validations.ts x2, lead-form-dialog.tsx, import-actions.ts) — distribuição no banco real: ${dbSummary}`
);
process.exit(0);
