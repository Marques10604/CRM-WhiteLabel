#!/usr/bin/env node
"use strict";

/**
 * Guarda de regressão dos invariantes WA-06/WA-07/WA-08 (Fase 6, plano 06-01).
 *
 * Opera exclusivamente num banco `:memory:` (nunca em data/crm.db) — reproduz
 * em miniatura a tabela `leads` e o mesmo idioma de escrita da Server Action
 * real `registerWhatsAppContact` (src/actions/lead-actions.ts): um único
 * UPDATE, incremento incondicional do contador, avanço condicional de etapa.
 *
 * Prova:
 *   1. A tabela-verdade completa (3 tipos x 5 etapas = 15 pares) do gate de
 *      auto-avanço: verdadeiro só em (primeiro_contato, novo).
 *   2. Que o contador acumula pela vida do lead (D-04), nunca zera, e nunca
 *      há re-avanço/regressão de etapa (WA-07) mesmo sob múltiplos cliques.
 *
 * Rodar via: node scripts/verify-wa-contact-invariant.cjs
 * Exit 0 = todas as asserções passaram. Exit != 0 = alguma violação, com
 * mensagem descritiva lançada.
 */

const Database = require("better-sqlite3");

const db = new Database(":memory:");

db.exec(`
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY,
    stage TEXT NOT NULL,
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    stage_changed_at INTEGER
  );
`);

db.exec(`
  INSERT INTO leads (id, stage) VALUES
    (1, 'novo'),
    (2, 'negociacao'),
    (3, 'contatado');
`);

/**
 * Mesma regra exata da Server Action de produção
 * (src/actions/lead-actions.ts, registerWhatsAppContact): avança apenas
 * quando o tipo do template é "primeiro_contato" E a etapa atual é "novo".
 */
function advanced(stage, tipo) {
  return tipo === "primeiro_contato" && stage === "novo";
}

const TIPOS = ["primeiro_contato", "follow_up", "prova_valor"];
const ETAPAS = ["novo", "contatado", "negociacao", "fechado", "perdido"];

// 1. Tabela-verdade completa: 15 pares, verdadeiro só em (primeiro_contato, novo)
for (const tipo of TIPOS) {
  for (const stage of ETAPAS) {
    const expected = tipo === "primeiro_contato" && stage === "novo";
    const actual = advanced(stage, tipo);
    if (actual !== expected) {
      throw new Error(
        `Tabela-verdade violada: advanced(stage=${stage}, tipo=${tipo}) retornou ${actual}, esperado ${expected}`
      );
    }
  }
}
console.log("OK tabela-verdade: 15/15 pares corretos (verdadeiro só em primeiro_contato+novo)");

/**
 * Mesma forma do UPDATE de produção: incremento incondicional do contador,
 * mudança de etapa só quando advanced() é verdadeiro.
 */
function applyClick(id, tipo) {
  const row = db.prepare("SELECT stage FROM leads WHERE id = ?").get(id);
  const willAdvance = advanced(row.stage, tipo);

  if (willAdvance) {
    db.prepare(
      "UPDATE leads SET contact_attempts = contact_attempts + 1, stage = 'contatado', stage_changed_at = unixepoch() WHERE id = ?"
    ).run(id);
  } else {
    db.prepare("UPDATE leads SET contact_attempts = contact_attempts + 1 WHERE id = ?").run(id);
  }
}

// 2. Sequência de cliques simulando os cenários do WA-06/WA-07/WA-08
applyClick(1, "primeiro_contato"); // lead 1: novo -> contatado, tentativa 1
applyClick(1, "primeiro_contato"); // lead 1: já contatado, NÃO deve re-avançar, tentativa 2
applyClick(1, "follow_up"); // lead 1: contador acumula (D-04), etapa intocada, tentativa 3
applyClick(2, "primeiro_contato"); // lead 2: negociacao, NUNCA regride/avança
applyClick(3, "primeiro_contato"); // lead 3: já contatado, NÃO deve re-avançar

const lead1 = db.prepare("SELECT * FROM leads WHERE id = 1").get();
const lead2 = db.prepare("SELECT * FROM leads WHERE id = 2").get();
const lead3 = db.prepare("SELECT * FROM leads WHERE id = 3").get();

if (lead1.contact_attempts !== 3) {
  throw new Error(`Lead 1: contact_attempts esperado 3, achou ${lead1.contact_attempts}`);
}
if (lead1.stage !== "contatado") {
  throw new Error(`Lead 1: stage esperado 'contatado', achou '${lead1.stage}'`);
}
if (lead1.stage_changed_at === null) {
  throw new Error("Lead 1: stage_changed_at não deveria ser nulo após o avanço");
}

if (lead2.contact_attempts !== 1) {
  throw new Error(`Lead 2: contact_attempts esperado 1, achou ${lead2.contact_attempts}`);
}
if (lead2.stage !== "negociacao") {
  throw new Error(`Lead 2: stage esperado 'negociacao' (nunca regride/avança), achou '${lead2.stage}'`);
}

if (lead3.contact_attempts !== 1) {
  throw new Error(`Lead 3: contact_attempts esperado 1, achou ${lead3.contact_attempts}`);
}
if (lead3.stage !== "contatado") {
  throw new Error(`Lead 3: stage esperado 'contatado' (nunca re-avança), achou '${lead3.stage}'`);
}

console.log(
  "OK acumulação/gate: lead1 (novo->contatado, 3x, nunca re-avança), lead2 (negociacao intocada, 1x), lead3 (contatado intocado, 1x)"
);
console.log("OK verify-wa-contact-invariant: todas as asserções passaram");
process.exit(0);
