// Migração manual idempotente do veredito do operador (Fase 24, VEREDITO-01/
// VEREDITO-02, D-24-01/D-24-02): adiciona DUAS colunas ADITIVAS NULLABLE em
// `campanhas` — `veredito_final` (TEXT) e `veredito_decidido_em` (INTEGER).
//
// Aplica DDL diretamente via better-sqlite3 — NUNCA drizzle-kit push/generate.
// Dois incidentes destrutivos documentados neste repositório neste mesmo
// padrão (Fases 06-01 e 07-01: "data-loss statement" + prompt de TTY antes do
// ADD COLUMN) e o snapshot do drizzle-kit está divergente do banco real desde
// a Fase 4. Molde bloco-a-bloco: scripts/migrate-interesse.cjs (PRAGMA
// table_info -> backup só quando vai escrever -> wal_checkpoint(TRUNCATE) ->
// reabrir com fileMustExist -> ALTER em try/catch tolerando "duplicate column
// name" -> verificação pós-migração).
//
// DUAS colunas, não uma: SQLite não aceita duas colunas num único ADD COLUMN,
// então o check de idempotência e o ALTER rodam em blocos separados, um por
// coluna, cada um só quando a coluna correspondente ainda não existe.
//
// SEM NOT NULL, SEM DEFAULT nas duas: coluna nullable dispensa a exigência de
// DEFAULT do SQLite que forçou `origem_tipo`/`sequencia_posicao` a terem um.
// Campanha sem veredito registrado fica com as duas NULL (D-24-01/D-24-02).
//
// [BLOCKING]: `tsc`/`next build` derivam tipos de `schema.ts` e passariam
// mesmo com o banco desatualizado (falso-positivo). As telas da Onda 2 desta
// fase (painel da campanha, Mapa de Nichos) não têm o que ler/escrever sem
// esta migração rodada contra data/crm.db.
//
// PREMISSA OPERACIONAL: pare a app Next (dev/start) antes de rodar. O
// src/db/client.ts abre o banco em journal_mode=WAL; com a app no ar, escritas
// concorrentes podem ficar no `-wal` fora da cópia do arquivo principal e o
// backup sairia incompleto. O script faz `wal_checkpoint(TRUNCATE)` antes de
// copiar, mas não consegue impedir uma escrita concorrente durante a cópia.
//
// VETO EXPLÍCITO: nenhum comando `drizzle-kit push`/`generate` é usado aqui —
// dois incidentes destrutivos já documentados nas Fases 06-01/07-01.
//
// IDEMPOTÊNCIA: quando as DUAS colunas já existem, o script não escreve nada
// (só PRAGMA/SELECT de verificação) e por isso NÃO cria backup novo — evita a
// pasta data/ acumular um backup a cada execução.
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-veredito] FALHOU: ${message}`);
  process.exit(1);
}

// 1) Abrir UMA conexão e checar se as colunas já existem ANTES de decidir por
//    backup — guarda via PRAGMA table_info (coluna, não tabela).
let db = new Database(DB_PATH, { fileMustExist: true });

const columnsBefore = db.prepare("PRAGMA table_info(campanhas)").all();
const hasVereditoFinal = columnsBefore.some((c) => c.name === "veredito_final");
const hasVereditoDecididoEm = columnsBefore.some((c) => c.name === "veredito_decidido_em");
const bothExist = hasVereditoFinal && hasVereditoDecididoEm;

// 2) Contagem de referência ANTES de qualquer escrita — de `campanhas` E de
//    `leads` (provar que esta migração não toca leads, D-24-01/VEREDITO-03).
const beforeCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) BACKUP + ALTER só quando ALGUMA das duas colunas ainda não existe.
//    Execução idempotente (as duas já presentes) não escreve nada, logo NÃO
//    cria backup novo — checkpoint do WAL primeiro (src/db/client.ts roda em
//    journal_mode=WAL), senão a cópia do arquivo principal pode não conter
//    escritas ainda pendentes no -wal. SQLite lança "duplicate column name"
//    se um ALTER específico rodar 2x.
if (!bothExist) {
  const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
    fs.copyFileSync(DB_PATH, backupPath);
  } catch (err) {
    fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
  }
  console.log(`[migrate-veredito] backup criado em ${backupPath}`);
  // Reabrir com `fileMustExist: true` — sem isso, se `DB_PATH` sumisse entre
  // o `close()` e este reopen, `better-sqlite3` criaria um banco VAZIO em
  // silêncio e a verificação seguinte falharia com "no such table" mascarando
  // a causa (mesmo cuidado de migrate-interesse.cjs).
  db = new Database(DB_PATH, { fileMustExist: true });

  if (!hasVereditoFinal) {
    try {
      db.exec("ALTER TABLE `campanhas` ADD `veredito_final` text;");
      console.log(
        "[migrate-veredito] coluna campanhas.veredito_final adicionada (nullable, sem default)"
      );
    } catch (err) {
      if (String(err.message).includes("duplicate column name")) {
        console.log(
          "[migrate-veredito] coluna veredito_final já existe (corrida entre o check e o ALTER) — seguindo"
        );
      } else {
        fail(`ALTER TABLE (veredito_final) falhou: ${err.message} (backup preservado em ${backupPath})`);
      }
    }
  }

  if (!hasVereditoDecididoEm) {
    try {
      db.exec("ALTER TABLE `campanhas` ADD `veredito_decidido_em` integer;");
      console.log(
        "[migrate-veredito] coluna campanhas.veredito_decidido_em adicionada (nullable, sem default)"
      );
    } catch (err) {
      if (String(err.message).includes("duplicate column name")) {
        console.log(
          "[migrate-veredito] coluna veredito_decidido_em já existe (corrida entre o check e o ALTER) — seguindo"
        );
      } else {
        fail(
          `ALTER TABLE (veredito_decidido_em) falhou: ${err.message} (backup preservado em ${backupPath})`
        );
      }
    }
  }
} else {
  console.log(
    "[migrate-veredito] colunas veredito_final/veredito_decidido_em já existem — nada a migrar, nenhum backup criado (idempotência)"
  );
}

// 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
const afterCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeCampanhas !== afterCampanhas) {
  fail(`contagem de linhas de campanhas mudou: antes=${beforeCampanhas} depois=${afterCampanhas}`);
}
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads} (VEREDITO-03: esta migração não pode tocar leads)`);
}

const colsAfter = db.prepare("PRAGMA table_info(campanhas)").all();
const finalCol = colsAfter.find((c) => c.name === "veredito_final");
const decididoCol = colsAfter.find((c) => c.name === "veredito_decidido_em");

if (!finalCol) fail("coluna campanhas.veredito_final ausente após a migração");
if (!decididoCol) fail("coluna campanhas.veredito_decidido_em ausente após a migração");

if (String(finalCol.type).toUpperCase() !== "TEXT") {
  fail(`campanhas.veredito_final tipo inesperado: ${finalCol.type} (esperado TEXT)`);
}
if (finalCol.notnull !== 0) fail("campanhas.veredito_final deveria ser nullable (notnull=0)");

if (String(decididoCol.type).toUpperCase() !== "INTEGER") {
  fail(`campanhas.veredito_decidido_em tipo inesperado: ${decididoCol.type} (esperado INTEGER)`);
}
if (decididoCol.notnull !== 0) fail("campanhas.veredito_decidido_em deveria ser nullable (notnull=0)");

db.prepare("SELECT veredito_final, veredito_decidido_em FROM campanhas LIMIT 1").get(); // deve rodar sem lançar

console.log(
  `[migrate-veredito] OK: ${afterCampanhas} campanhas intactas (antes=${beforeCampanhas}), ${afterLeads} leads intactos (antes=${beforeLeads}), colunas veredito_final TEXT nullable e veredito_decidido_em INTEGER nullable presentes`
);

db.close();
process.exit(0);
