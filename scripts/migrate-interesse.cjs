// Migração manual idempotente do campo "interesse / serviço desejado" do lead
// (Fase 15, LEAD-06, D-06/D-07): adiciona a coluna aditiva NULLABLE
// `leads.interesse` (texto livre, opcional).
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit push/generate.
// Dois incidentes destrutivos documentados neste repositório neste mesmo
// padrão (Fases 06-01 e 07-01: "data-loss statement" + prompt de TTY antes do
// ADD COLUMN) e o snapshot do drizzle-kit está divergente do banco real desde
// a Fase 4. Molde bloco-a-bloco: scripts/backfill-origem-tipo.cjs (ADD COLUMN
// idempotente via PRAGMA table_info) + scripts/migrate-motivos-perda.cjs
// (backup + checkpoint WAL + verificação pós-migração).
//
// NÃO faz backfill (sem UPDATE ... SET interesse): D-06 — a migração é aditiva
// e não toca dado existente; leads criados antes desta migração ficam com
// `interesse = NULL` de propósito. Coluna NULLABLE dispensa a exigência de
// DEFAULT do SQLite que forçou `origem_tipo`/`sequencia_posicao` a terem um.
//
// [BLOCKING]: `tsc`/`next build` derivam tipos de `schema.ts` e passariam
// mesmo com o banco desatualizado (falso-positivo). Nenhum plano posterior da
// Fase 15 (15-02, CSV) pode rodar sem a coluna viva em data/crm.db.
//
// PREMISSA OPERACIONAL (IN-03): pare a app Next (dev/start) antes de rodar. O
// src/db/client.ts abre o banco em journal_mode=WAL; com a app no ar, escritas
// concorrentes podem ficar no `-wal` fora da cópia do arquivo principal e o
// backup sairia incompleto. O script faz `wal_checkpoint(TRUNCATE)` antes de
// copiar, mas não consegue impedir uma escrita concorrente durante a cópia.
//
// IDEMPOTÊNCIA (IN-03): quando a coluna `interesse` já existe, o script não
// escreve nada (só `PRAGMA`/`SELECT` de verificação) e por isso NÃO cria
// backup novo — evita a pasta data/ acumular um backup a cada execução.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-interesse] FALHOU: ${message}`);
  process.exit(1);
}

// 1) Abrir UMA conexão e checar se a coluna já existe ANTES de decidir por
//    backup — guarda via PRAGMA table_info (coluna, não tabela). SEM DEFAULT,
//    SEM NOT NULL: coluna nullable, leads antigos ficam NULL (D-06).
let db = new Database(DB_PATH, { fileMustExist: true });

const hasColumn = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "interesse");

// 2) Contagem de referência ANTES de qualquer escrita.
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) BACKUP + ALTER só quando a coluna ainda não existe. Execução idempotente
//    (coluna presente) não escreve nada, logo NÃO cria backup novo (IN-03) —
//    checkpoint do WAL primeiro (o src/db/client.ts roda em journal_mode=WAL),
//    senão a cópia do arquivo principal pode não conter escritas ainda
//    pendentes no -wal. SQLite lança "duplicate column name" se o ALTER rodar 2x.
if (!hasColumn) {
  const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
    fs.copyFileSync(DB_PATH, backupPath);
  } catch (err) {
    fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
  }
  console.log(`[migrate-interesse] backup criado em ${backupPath}`);
  db = new Database(DB_PATH);
  db.exec("ALTER TABLE `leads` ADD `interesse` text;");
  console.log("[migrate-interesse] coluna leads.interesse adicionada (nullable, sem default)");
} else {
  console.log(
    "[migrate-interesse] coluna interesse já existe — nada a migrar, nenhum backup criado (idempotência)"
  );
}

// 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}

const cols = db.prepare("PRAGMA table_info(leads)").all();
const interesseCol = cols.find((c) => c.name === "interesse");
if (!interesseCol) fail("coluna leads.interesse ausente após a migração");
if (String(interesseCol.type).toUpperCase() !== "TEXT") {
  fail(`leads.interesse tipo inesperado: ${interesseCol.type} (esperado TEXT)`);
}
if (interesseCol.notnull !== 0) fail("leads.interesse deveria ser nullable (notnull=0)");
db.prepare("SELECT interesse FROM leads LIMIT 1").get(); // deve rodar sem lançar

console.log(
  `[migrate-interesse] OK: ${afterLeads} leads intactos (antes=${beforeLeads}), coluna interesse TEXT nullable presente`
);

db.close();
process.exit(0);
