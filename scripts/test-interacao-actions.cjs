#!/usr/bin/env node
"use strict";

/**
 * Harness permanente dos invariantes da timeline de interações (TIMELINE-01,
 * Fase 9 plano 09-02). Node puro + better-sqlite3, SEM ORM — reproduz em
 * miniatura o idioma de escrita de produção (registerWhatsAppContact em
 * src/actions/lead-actions.ts, já transacional após a Task 1 desta plan)
 * contra um banco `:memory:` (nunca data/crm.db), no mesmo estilo de
 * scripts/verify-wa-contact-invariant.cjs.
 *
 * Prova os invariantes que os testes de leitura de código não pegam
 * (Pitfalls 2, 3 e 4 do 09-RESEARCH.md):
 *   1. Cobertura por tipo — os 3 tipos de template geram linha de timeline,
 *      não só primeiro_contato (Pitfall 4).
 *   2. Atomicidade — contador e linhas de interacoes sempre em paridade;
 *      falha parcial (violação de FK) não deixa o contador incrementado sem
 *      a interação correspondente (Pitfall 3).
 *   3. Imutabilidade — eventos de WhatsApp nunca são soft-deletáveis nem
 *      editáveis via o mesmo WHERE usado para nota_manual (Pitfall 2).
 *   4. Leitura cronológica estável — desempate por id, exclusão de linhas
 *      soft-deletadas.
 *   5-6. Checagens estáticas (grep tolerante a reformatação) sobre o
 *      código-fonte real de lead-actions.ts e interacao-actions.ts.
 *
 * Este script NUNCA imprime o conteúdo da coluna `texto` — só contagens,
 * tipos e `changes` (disciplina de não vazar conteúdo de mensagem nos logs).
 *
 * Rodar via: npm run test:interacao-actions
 * Exit 0 = todas as asserções passaram. Exit 1 = alguma falhou (ver linhas
 * FAIL no output).
 */

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

/** Mesmo shape físico das tabelas reais (leads em miniatura + interacoes). */
function buildDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE leads (
      id INTEGER PRIMARY KEY,
      stage TEXT NOT NULL,
      contact_attempts INTEGER NOT NULL DEFAULT 0,
      stage_changed_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE interacoes (
      id INTEGER PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      tipo TEXT NOT NULL,
      texto TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER,
      deleted_at INTEGER
    );
  `);
  return db;
}

/**
 * Mesmo idioma de escrita de produção (registerWhatsAppContact): update
 * incondicional do contador + insert incondicional em interacoes, ambos
 * dentro de uma única transação — nunca dentro do bloco condicional de
 * avanço de etapa.
 */
function applyClick(db, leadId, tipo, texto) {
  const tx = db.transaction((leadId, tipo, texto) => {
    db.prepare("UPDATE leads SET contact_attempts = contact_attempts + 1 WHERE id = ?").run(leadId);
    db.prepare("INSERT INTO interacoes (lead_id, tipo, texto) VALUES (?, ?, ?)").run(leadId, tipo, texto);
  });
  tx(leadId, tipo, texto);
}

// ============================================================
// Asserção 1: cobertura por tipo (Pitfall 4)
// ============================================================
{
  const db = buildDb();
  db.prepare("INSERT INTO leads (id, stage) VALUES (1, 'novo')").run();

  applyClick(db, 1, "primeiro_contato", "mensagem 1");
  applyClick(db, 1, "follow_up", "mensagem 2");
  applyClick(db, 1, "prova_valor", "mensagem 3");

  const total = db.prepare("SELECT COUNT(*) AS n FROM interacoes").get().n;
  check(total === 3, `cobertura por tipo: 3 cliques (primeiro_contato/follow_up/prova_valor) geram 3 linhas em interacoes (got ${total})`);

  for (const tipo of ["primeiro_contato", "follow_up", "prova_valor"]) {
    const n = db.prepare("SELECT COUNT(*) AS n FROM interacoes WHERE tipo = ?").get(tipo).n;
    check(n === 1, `cobertura por tipo: exatamente 1 linha de tipo "${tipo}"`);
  }

  db.close();
}

// ============================================================
// Asserção 2: atomicidade / paridade + prova de rollback (Pitfall 3)
// ============================================================
{
  const db = buildDb();
  db.prepare("INSERT INTO leads (id, stage) VALUES (1, 'novo')").run();

  applyClick(db, 1, "primeiro_contato", "a");
  applyClick(db, 1, "follow_up", "b");
  applyClick(db, 1, "follow_up", "c");
  applyClick(db, 1, "prova_valor", "d");

  const lead = db.prepare("SELECT contact_attempts FROM leads WHERE id = 1").get();
  const interacaoCount = db
    .prepare("SELECT COUNT(*) AS n FROM interacoes WHERE lead_id = 1 AND tipo != 'nota_manual'")
    .get().n;
  check(
    lead.contact_attempts === interacaoCount,
    `atomicidade: contact_attempts (${lead.contact_attempts}) === linhas de interacoes nao-nota_manual (${interacaoCount})`
  );

  // Rollback: UPDATE do contador seguido de INSERT que viola a FK (lead_id
  // inexistente) dentro da MESMA transação — nenhuma das duas escritas pode
  // persistir.
  const beforeAttempts = db.prepare("SELECT contact_attempts FROM leads WHERE id = 1").get().contact_attempts;
  let rollbackErr = null;
  try {
    const badTx = db.transaction(() => {
      db.prepare("UPDATE leads SET contact_attempts = contact_attempts + 1 WHERE id = ?").run(1);
      db.prepare("INSERT INTO interacoes (lead_id, tipo, texto) VALUES (?, ?, ?)").run(999999, "follow_up", "x");
    });
    badTx();
  } catch (err) {
    rollbackErr = err;
  }
  check(rollbackErr !== null, "atomicidade: transacao com INSERT que viola FK lanca erro");
  const afterAttempts = db.prepare("SELECT contact_attempts FROM leads WHERE id = 1").get().contact_attempts;
  check(
    afterAttempts === beforeAttempts,
    `atomicidade: rollback preserva contact_attempts (antes=${beforeAttempts}, depois=${afterAttempts}, sem escrita parcial)`
  );

  db.close();
}

// ============================================================
// Asserção 3: imutabilidade — soft-delete (Pitfall 2)
// ============================================================
{
  const db = buildDb();
  db.prepare("INSERT INTO leads (id, stage) VALUES (1, 'novo')").run();

  const waId = db
    .prepare("INSERT INTO interacoes (lead_id, tipo, texto) VALUES (1, 'primeiro_contato', 'wa')")
    .run().lastInsertRowid;
  const notaId = db
    .prepare("INSERT INTO interacoes (lead_id, tipo, texto) VALUES (1, 'nota_manual', 'nota')")
    .run().lastInsertRowid;

  const softDeleteStmt = db.prepare(
    "UPDATE interacoes SET deleted_at = unixepoch() WHERE id = ? AND tipo = 'nota_manual' AND deleted_at IS NULL"
  );

  const resultWa = softDeleteStmt.run(waId);
  check(resultWa.changes === 0, `imutabilidade soft-delete: linha de WhatsApp retorna changes === 0 (got ${resultWa.changes})`);
  const waRow = db.prepare("SELECT deleted_at FROM interacoes WHERE id = ?").get(waId);
  check(waRow.deleted_at === null, "imutabilidade soft-delete: linha de WhatsApp continua com deleted_at IS NULL");

  const resultNota = softDeleteStmt.run(notaId);
  check(resultNota.changes === 1, `imutabilidade soft-delete: nota_manual retorna changes === 1 (got ${resultNota.changes})`);

  const resultNotaRepeat = softDeleteStmt.run(notaId);
  check(
    resultNotaRepeat.changes === 0,
    `imutabilidade soft-delete: repetir contra nota ja apagada retorna changes === 0 (idempotencia) (got ${resultNotaRepeat.changes})`
  );

  db.close();
}

// ============================================================
// Asserção 4: imutabilidade — edição
// ============================================================
{
  const db = buildDb();
  db.prepare("INSERT INTO leads (id, stage) VALUES (1, 'novo')").run();

  const waId = db
    .prepare("INSERT INTO interacoes (lead_id, tipo, texto) VALUES (1, 'follow_up', 'original')")
    .run().lastInsertRowid;

  const originalTexto = db.prepare("SELECT texto FROM interacoes WHERE id = ?").get(waId).texto;

  const updateStmt = db.prepare(
    "UPDATE interacoes SET texto = ?, updated_at = unixepoch() WHERE id = ? AND tipo = 'nota_manual' AND deleted_at IS NULL"
  );
  const result = updateStmt.run("tentativa de edicao", waId);
  check(result.changes === 0, `imutabilidade edicao: linha de WhatsApp retorna changes === 0 (got ${result.changes})`);

  const afterTexto = db.prepare("SELECT texto FROM interacoes WHERE id = ?").get(waId).texto;
  check(afterTexto === originalTexto, "imutabilidade edicao: texto original permanece byte-identico");

  db.close();
}

// ============================================================
// Asserção 5: leitura cronológica estável
// ============================================================
{
  const db = buildDb();
  db.prepare("INSERT INTO leads (id, stage) VALUES (1, 'novo')").run();

  const sameTimestamp = 1700000000;
  const insertStmt = db.prepare(
    "INSERT INTO interacoes (lead_id, tipo, texto, created_at, deleted_at) VALUES (1, 'follow_up', 'x', ?, ?)"
  );
  const id1 = insertStmt.run(sameTimestamp, null).lastInsertRowid;
  const id2 = insertStmt.run(sameTimestamp, null).lastInsertRowid;
  const id3 = insertStmt.run(sameTimestamp, null).lastInsertRowid;
  const idDeleted = insertStmt.run(sameTimestamp, sameTimestamp).lastInsertRowid;

  const rows = db
    .prepare("SELECT id FROM interacoes WHERE lead_id = 1 AND deleted_at IS NULL ORDER BY created_at DESC, id DESC")
    .all();
  const ids = rows.map((r) => r.id);
  const expected = [id3, id2, id1];
  check(
    JSON.stringify(ids) === JSON.stringify(expected),
    `leitura cronologica: ORDER BY created_at DESC, id DESC devolve ordem deterministica com mesmo created_at (esperado ${JSON.stringify(expected)}, got ${JSON.stringify(ids)})`
  );
  check(!ids.includes(idDeleted), "leitura cronologica: linha soft-deletada fica fora do resultado");

  db.close();
}

// ============================================================
// Asserções 6-7: checagens estáticas (grep tolerante a reformatação)
// ============================================================
{
  const leadActionsSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "actions", "lead-actions.ts"),
    "utf8"
  );
  const fnIdx = leadActionsSource.indexOf("export async function registerWhatsAppContact");
  const nextFnIdx = leadActionsSource.indexOf("export async function softDeleteLead");
  const corpo = fnIdx > -1 && nextFnIdx > -1 ? leadActionsSource.slice(fnIdx, nextFnIdx) : "";

  check(/db\.transaction\(/.test(corpo), "estatica: registerWhatsAppContact contem db.transaction(");
  check(/tx\.insert\(interacoes\)/.test(corpo), "estatica: registerWhatsAppContact contem tx.insert(interacoes)");

  const insertIdx = corpo.indexOf("tx.insert(interacoes)");
  const braceBalance = (s) => (s.match(/{/g) || []).length - (s.match(/}/g) || []).length;

  const ternaryIdx = corpo.indexOf("advanced ?");
  const nestedInTernary =
    ternaryIdx > -1 && insertIdx > ternaryIdx && braceBalance(corpo.slice(ternaryIdx, insertIdx)) > 0;

  const ifAdvancedIdx = corpo.indexOf("if (advanced");
  const nestedInIfBlock =
    ifAdvancedIdx > -1 && insertIdx > ifAdvancedIdx && braceBalance(corpo.slice(ifAdvancedIdx, insertIdx)) > 0;

  check(
    insertIdx > -1 && !nestedInTernary && !nestedInIfBlock,
    "estatica: tx.insert(interacoes) e irmao incondicional do update, fora do bloco/spread condicional de avanco (if (advanced ...) ou ...(advanced ? {} : {}))"
  );

  const interacaoActionsSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "actions", "interacao-actions.ts"),
    "utf8"
  );
  const guardMatches = interacaoActionsSource.match(/eq\(interacoes\.tipo,\s*"nota_manual"\)/g) || [];
  check(
    guardMatches.length >= 2,
    `estatica: interacao-actions.ts contem eq(interacoes.tipo, "nota_manual") pelo menos 2x (got ${guardMatches.length})`
  );
  check(!/\.delete\(/.test(interacaoActionsSource), "estatica: interacao-actions.ts nao contem .delete( (sem hard-delete)");
}

// ============================================================
if (failed > 0) {
  console.error(`\n${failed} asserção(ões) falharam.`);
  process.exit(1);
}
console.log("\nOK test-interacao-actions: todas as asserções passaram");
process.exit(0);
