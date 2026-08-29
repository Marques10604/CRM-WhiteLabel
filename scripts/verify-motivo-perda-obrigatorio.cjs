#!/usr/bin/env node
"use strict";

/**
 * Gate permanente de D-04 (PERDA-01) — motivo de perda obrigatório e
 * governado ao mover/salvar um lead como "perdido".
 *
 * Molde: `scripts/verify-sequencia-posicao.cjs` (duas partes somando no mesmo
 * contador de falhas; regex tolerante a espaçamento; fatiamento do fonte real
 * por `indexOf("export async function ...")`).
 *
 * PARTE A — comportamental, Zod puro (sem banco): prova que o `.refine`
 * condicional de `stageUpdateSchema` e `leadSchema` reprova "perdido" sem
 * `motivoPerdaId`, com a issue no path certo e a mensagem VERBATIM de D-04.
 *
 * PARTE B — estática no fonte real: prova que `src/actions/lead-actions.ts`
 * grava `motivoPerdaId` no idioma condicional-por-valor-alvo em `updateLead`
 * e `updateLeadStage`, que `motivoPerdaExists` existe, que
 * `motivo-perda-dialog.tsx` não tem mais `Textarea`/`onSkip`/`Pular` (sinal
 * de alerta do Pitfall 1 do 11-RESEARCH.md), e que nenhum `.motivoPerda`
 * (texto livre legado) sobrou em `src/`.
 *
 * Rodar via: node scripts/verify-motivo-perda-obrigatorio.cjs
 * (ou npm run verify:motivo-perda). Exit 0 = tudo passou.
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const path = require("node:path");

// `:memory:` antes do register — PARTE A só toca Zod, mas mantém o mesmo
// bootstrap defensivo dos demais harnesses (nunca abre data/crm.db).
process.env.DB_FILE_NAME = ":memory:";
register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

const SRC = path.join(__dirname, "..", "src");
const MSG = "Selecione o motivo da perda.";

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
// PARTE A — comportamental (Zod puro)
// ============================================================
async function runBehaviorChecks() {
  const { stageUpdateSchema, leadSchema } = await import("@/lib/validations");

  const validLead = {
    nome: "Lead Teste",
    telefone: "(11) 91234-5678",
    canal: "whatsapp",
    origem: "Instagram",
    origemTipo: "outbound",
    valorEstimado: "1.000,00",
    notas: "nota qualquer",
    followUpDate: "2026-08-01",
    subnichoId: "1",
    stage: "perdido",
  };

  for (const [label, schema, base] of [
    ["stageUpdateSchema", stageUpdateSchema, { id: 1, stage: "perdido" }],
    ["leadSchema", leadSchema, validLead],
  ]) {
    // (a)/(e) perdido SEM motivoPerdaId -> reprova no path motivoPerdaId
    const semMotivo = schema.safeParse(base);
    check(
      semMotivo.success === false,
      `${label}: "perdido" sem motivoPerdaId reprova`
    );
    const issue = semMotivo.success
      ? undefined
      : semMotivo.error.issues.find(
          (i) => Array.isArray(i.path) && i.path[0] === "motivoPerdaId"
        );
    check(
      issue !== undefined,
      `${label}: a issue está no path ["motivoPerdaId"]`
    );
    // (d) mensagem VERBATIM de D-04
    check(
      issue?.message === MSG,
      `${label}: mensagem === "${MSG}" (got ${JSON.stringify(issue?.message)})`
    );

    // (b) perdido COM motivoPerdaId válido -> aprova
    const comMotivo = schema.safeParse({ ...base, motivoPerdaId: 3 });
    check(comMotivo.success === true, `${label}: "perdido" com motivoPerdaId=3 aprova`);

    // (c) etapa não-terminal sem motivoPerdaId -> aprova
    const naoPerdido = schema.safeParse({ ...base, stage: "contatado" });
    check(
      naoPerdido.success === true,
      `${label}: "contatado" sem motivoPerdaId aprova`
    );
  }

  // string vazia (o input oculto do combobox emite "" quando nada é
  // selecionado) tem que ser tratada como ausência, não como 0.
  const vazio = leadSchema.safeParse({ ...validLead, motivoPerdaId: "" });
  const vazioIssue = vazio.success
    ? undefined
    : vazio.error.issues.find((i) => i.path[0] === "motivoPerdaId");
  check(
    vazio.success === false && vazioIssue?.message === MSG,
    `leadSchema: motivoPerdaId "" (combobox vazio) cai na mesma mensagem de D-04`
  );
}

// ============================================================
// PARTE B — estática no fonte real
// ============================================================
function runStaticChecks() {
  const leadActions = fs.readFileSync(
    path.join(SRC, "actions", "lead-actions.ts"),
    "utf8"
  );

  const ulIdx = leadActions.indexOf("export async function updateLead(");
  const ulsIdx = leadActions.indexOf("export async function updateLeadStage");
  const rwIdx = leadActions.indexOf(
    "export async function registerWhatsAppContact"
  );
  check(
    ulIdx !== -1 && ulsIdx !== -1 && rwIdx !== -1,
    "lead-actions.ts: updateLead / updateLeadStage / registerWhatsAppContact encontradas"
  );

  // (f) idioma condicional-por-valor-alvo (tolerante a espaçamento/quebra de linha)
  const targetIdiom =
    /motivoPerdaId\s*:\s*parsed\.data\.stage\s*===\s*"perdido"\s*\?\s*parsed\.data\.motivoPerdaId\s*\?\?\s*null\s*:\s*null/;
  if (ulIdx !== -1 && ulsIdx !== -1 && rwIdx !== -1) {
    check(
      targetIdiom.test(leadActions.slice(ulIdx, ulsIdx)),
      "updateLead: grava motivoPerdaId condicional-por-valor-alvo (null no ramo não-perdido)"
    );
    check(
      targetIdiom.test(leadActions.slice(ulsIdx, rwIdx)),
      "updateLeadStage: grava motivoPerdaId condicional-por-valor-alvo (null no ramo não-perdido)"
    );
  }

  // (g) motivoPerdaExists presente
  check(
    /async function motivoPerdaExists\s*\(/.test(leadActions),
    "lead-actions.ts: define motivoPerdaExists()"
  );
  check(
    !/parsed\.data\.motivoPerda\b/.test(leadActions),
    "lead-actions.ts: nenhuma referência a parsed.data.motivoPerda (texto livre legado)"
  );

  // (h) grep negativo no modal de drag
  const dialog = fs.readFileSync(
    path.join(SRC, "components", "motivo-perda-dialog.tsx"),
    "utf8"
  );
  for (const forbidden of ["Textarea", "onSkip", "Pular"]) {
    check(
      !dialog.includes(forbidden),
      `motivo-perda-dialog.tsx: NÃO contém "${forbidden}" (D-04 removeu o texto livre / o botão Pular)`
    );
  }
  check(
    dialog.includes("showCloseButton={false}") &&
      dialog.includes("MotivoPerdaCombobox") &&
      dialog.includes("onCancel"),
    "motivo-perda-dialog.tsx: modal não-dispensável + combobox + onCancel"
  );

  // (i) grep negativo recursivo: nenhum .motivoPerda (sem Id) em src/, fora de comentário
  const offenders = [];
  walkTsFiles(SRC, (file, content) => {
    content.split(/\r?\n/).forEach((line, idx) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      ) {
        return;
      }
      if (/\.motivoPerda\b/.test(line)) {
        offenders.push(`${path.relative(SRC, file)}:${idx + 1}: ${trimmed}`);
      }
    });
  });
  check(
    offenders.length === 0,
    `src/: zero ocorrências de .motivoPerda (sem Id) fora de comentário${
      offenders.length ? "\n  " + offenders.join("\n  ") : ""
    }`
  );
}

function walkTsFiles(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, visit);
    } else if (/\.tsx?$/.test(entry.name)) {
      visit(full, fs.readFileSync(full, "utf8"));
    }
  }
}

(async () => {
  await runBehaviorChecks();
  runStaticChecks();

  if (failed > 0) {
    console.error(`\n[verify-motivo-perda-obrigatorio] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log(
    "\n[verify-motivo-perda-obrigatorio] OK: todas as asserções passaram."
  );
  process.exit(0);
})().catch((err) => {
  console.error("[verify-motivo-perda-obrigatorio] ERRO:", err.stack || err);
  process.exit(1);
});
