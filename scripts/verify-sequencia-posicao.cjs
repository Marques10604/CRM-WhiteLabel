#!/usr/bin/env node
"use strict";

/**
 * Guarda de regressão permanente do avanço/reset de `leads.sequenciaPosicao`
 * (Fase 10, plano 10-02, SEQ-02).
 *
 * Duas partes, cada uma somando no mesmo contador de falhas:
 *
 * PARTE A — tabela-verdade comportamental num banco `:memory:` (nunca o
 * banco de produção em disco), reproduzindo em miniatura a tabela `leads` e o MESMO
 * idioma de escrita das Server Actions reais (`registerWhatsAppContact`,
 * `updateLeadStage`, `updateLead` em `src/actions/lead-actions.ts`):
 *   - applyClick: incrementa contact_attempts sempre; incrementa
 *     sequencia_posicao só quando tipo === "follow_up".
 *   - applyStage: grava stage; zera sequencia_posicao só quando
 *     stage === "novo".
 * Prova que o avanço é ortogonal à etapa/gate de auto-avanço de etapa, que
 * acumula (não satura), que o reset por "novo" funciona e é idempotente, e
 * que qualquer outro destino preserva a posição.
 *
 * PARTE B — checagens estruturais no fonte real de
 * `src/actions/lead-actions.ts` (mesmo idioma de
 * `scripts/test-lead-actions.cjs`, fatiando por `indexOf("export async
 * function ...")`), tolerantes a espaçamento variável (`\s*` entre tokens,
 * mesma lição da reescrita de `verify-origem-tipo.cjs`, quick task
 * 260807-uit). Prova que os dois incrementos de sequenciaPosicao em
 * registerWhatsAppContact continuam presentes, que origemTipo nunca é lido
 * ali (Pitfall 4 do RESEARCH.md), e que updateLead/updateLeadStage
 * continuam resetando por valor-alvo (não por stageChanged).
 *
 * Rodar via: node scripts/verify-sequencia-posicao.cjs
 * (ou npm run verify:sequencia)
 * Exit 0 = todas as asserções passaram. Exit != 0 = alguma violação, com
 * mensagem descritiva impressa e o total de falhas ao final.
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

// ============================================================
// PARTE A — tabela-verdade comportamental em :memory:
// ============================================================
function runBehaviorTruthTable() {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE leads (
      id INTEGER PRIMARY KEY,
      stage TEXT NOT NULL,
      contact_attempts INTEGER NOT NULL DEFAULT 0,
      sequencia_posicao INTEGER NOT NULL DEFAULT 0
    );
  `);

  const TIPOS = ["primeiro_contato", "follow_up", "prova_valor"];
  const ETAPAS = ["novo", "contatado", "negociacao", "fechado", "perdido"];

  /**
   * Mesmo idioma de escrita de registerWhatsAppContact: incremento
   * incondicional de contact_attempts, incremento condicional (só
   * follow_up) de sequencia_posicao.
   */
  function applyClick(db, leadId, tipo) {
    const inc = tipo === "follow_up" ? 1 : 0;
    db.prepare(
      "UPDATE leads SET contact_attempts = contact_attempts + 1, sequencia_posicao = sequencia_posicao + ? WHERE id = ?"
    ).run(inc, leadId);
  }

  /**
   * Mesmo idioma de escrita de updateLeadStage/updateLead: grava stage;
   * zera sequencia_posicao só quando o DESTINO é "novo" (condicional por
   * valor-alvo, não por mudança).
   */
  function applyStage(db, leadId, stage) {
    if (stage === "novo") {
      db.prepare("UPDATE leads SET stage = ?, sequencia_posicao = 0 WHERE id = ?").run(stage, leadId);
    } else {
      db.prepare("UPDATE leads SET stage = ? WHERE id = ?").run(stage, leadId);
    }
  }

  // Cada cenário usa um id NOVO e ÚNICO em vez de limpar/reinserir a mesma
  // linha entre iterações — evita qualquer SQL de remoção de linhas da
  // tabela leads neste arquivo, que faria o guard-no-hard-delete.cjs
  // acusar (falso-positivo) este harness de teste como hard-delete real
  // da tabela (LEAD-04).
  let nextId = 1;
  function freshLead(stage, sequenciaPosicao = 0) {
    const id = nextId++;
    db.prepare("INSERT INTO leads (id, stage, sequencia_posicao) VALUES (?, ?, ?)").run(id, stage, sequenciaPosicao);
    return id;
  }

  // 1) 15 pares tipo x etapa: sequencia_posicao incrementa em exatamente os
  //    5 pares de follow_up, intacta nos outros 10.
  let incrementedCount = 0;
  let intactCount = 0;
  for (const tipo of TIPOS) {
    for (const stage of ETAPAS) {
      const id = freshLead(stage);
      applyClick(db, id, tipo);
      const row = db.prepare("SELECT sequencia_posicao FROM leads WHERE id = ?").get(id);
      const expectedIncrement = tipo === "follow_up";
      if (expectedIncrement) {
        if (row.sequencia_posicao === 1) incrementedCount++;
      } else {
        if (row.sequencia_posicao === 0) intactCount++;
      }
    }
  }
  check(
    incrementedCount === 5,
    `tabela-verdade 15 pares: sequencia_posicao incrementa em exatamente 5/15 (follow_up, qualquer etapa) — encontrado ${incrementedCount}`
  );
  check(
    intactCount === 10,
    `tabela-verdade 15 pares: sequencia_posicao intacta nos outros 10/15 (primeiro_contato/prova_valor) — encontrado ${intactCount}`
  );

  // 2) Três cliques de follow_up seguidos: acumula 0 -> 3 (não satura).
  const id2 = freshLead("contatado");
  applyClick(db, id2, "follow_up");
  applyClick(db, id2, "follow_up");
  applyClick(db, id2, "follow_up");
  let row = db.prepare("SELECT sequencia_posicao FROM leads WHERE id = ?").get(id2);
  check(row.sequencia_posicao === 3, `3 cliques follow_up seguidos: sequencia_posicao acumula para 3 (got ${row.sequencia_posicao})`);

  // 3) applyStage(..., "novo") após os 3 cliques: reset para 0 (mesmo lead).
  applyStage(db, id2, "novo");
  row = db.prepare("SELECT sequencia_posicao FROM leads WHERE id = ?").get(id2);
  check(row.sequencia_posicao === 0, `applyStage(novo) após 3 cliques: reseta sequencia_posicao para 0 (got ${row.sequencia_posicao})`);

  // 4) applyStage para contatado/negociacao/fechado/perdido preserva a
  //    posição (4 asserções) — cada destino usa seu próprio lead fresco com
  //    posição inicial 3.
  for (const destino of ["contatado", "negociacao", "fechado", "perdido"]) {
    const id = freshLead("contatado", 3);
    applyStage(db, id, destino);
    row = db.prepare("SELECT sequencia_posicao FROM leads WHERE id = ?").get(id);
    check(row.sequencia_posicao === 3, `applyStage(${destino}): preserva sequencia_posicao=3 (got ${row.sequencia_posicao})`);
  }

  // 5) applyStage(..., "novo") sobre lead com posição já 0: idempotência.
  const id5 = freshLead("novo", 0);
  applyStage(db, id5, "novo");
  row = db.prepare("SELECT sequencia_posicao FROM leads WHERE id = ?").get(id5);
  check(row.sequencia_posicao === 0, `applyStage(novo) sobre posição já 0: idempotente, continua 0 (got ${row.sequencia_posicao})`);

  db.close();
}

// ============================================================
// PARTE B — checagens estruturais no fonte real
// ============================================================
function runStaticSourceChecks(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");

  const rwIdx = source.indexOf("export async function registerWhatsAppContact");
  const ulIdx = source.indexOf("export async function updateLead(");
  const ulsIdx = source.indexOf("export async function updateLeadStage");
  const softDeleteIdx = source.indexOf("export async function softDeleteLead");

  check(rwIdx !== -1 && ulIdx !== -1 && ulsIdx !== -1, "as três funções (updateLead, updateLeadStage, registerWhatsAppContact) foram encontradas no fonte");

  if (rwIdx === -1 || ulIdx === -1 || ulsIdx === -1) return;

  // registerWhatsAppContact vai até softDeleteLead (ou fim do arquivo)
  const rwBody = source.slice(rwIdx, softDeleteIdx !== -1 ? softDeleteIdx : source.length);

  const incrementPattern = /sequenciaPosicao\s*:\s*sql`\s*\$\{leads\.sequenciaPosicao\}\s*\+\s*1\s*`/g;
  const incCount = (rwBody.match(incrementPattern) || []).length;
  check(incCount === 2, `registerWhatsAppContact: 2 ocorrências do incremento sequenciaPosicao (branch principal + fallback de corrida) — encontrado ${incCount}`);

  check(!/origemTipo/.test(rwBody), "registerWhatsAppContact: NÃO contém a string origemTipo (Pitfall 4 — gate Inbound é de leitura, nunca de escrita)");

  const resetPattern = /\.\.\.\(\s*parsed\.data\.stage\s*===\s*"novo"\s*\?\s*\{\s*sequenciaPosicao\s*:\s*0\s*\}\s*:\s*\{\s*\}\s*\)/;

  const updateLeadBody = source.slice(ulIdx, ulsIdx);
  check(resetPattern.test(updateLeadBody), "updateLead: contém o spread de reset ...(parsed.data.stage === \"novo\" ? { sequenciaPosicao: 0 } : {})");

  const updateLeadStageBody = source.slice(ulsIdx, rwIdx);
  check(resetPattern.test(updateLeadStageBody), "updateLeadStage: contém o spread de reset ...(parsed.data.stage === \"novo\" ? { sequenciaPosicao: 0 } : {})");

  const changedConditionalPattern = /stageChanged\s*\?\s*\{\s*sequenciaPosicao/;
  check(!changedConditionalPattern.test(updateLeadBody), "updateLead: reset NÃO amarrado a stageChanged (idioma condicional-por-mudança é o errado aqui)");
  check(!changedConditionalPattern.test(updateLeadStageBody), "updateLeadStage: reset NÃO amarrado a stageChanged (idioma condicional-por-mudança é o errado aqui)");
  check(!changedConditionalPattern.test(rwBody), "registerWhatsAppContact: reset NÃO amarrado a stageChanged");
}

(function main() {
  runBehaviorTruthTable();
  runStaticSourceChecks(path.join(__dirname, "..", "src", "actions", "lead-actions.ts"));

  if (failed > 0) {
    console.error(`\n[verify-sequencia-posicao] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[verify-sequencia-posicao] OK: todas as asserções passaram.");
  process.exit(0);
})();
