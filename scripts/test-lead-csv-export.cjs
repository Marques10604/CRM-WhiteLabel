#!/usr/bin/env node
"use strict";

/**
 * Guarda code+data da serialização CSV da lista de leads (Fase 21, plano 21-01,
 * EXPORT-01/02/03 — SC#3/SC#4).
 *
 * O host de 4GB não roda `dev` + navegador + sessão do agente junto (precedente
 * Fases 18/19/20), então o download real e o "abre no Excel" ficam como UAT
 * humano NÃO-BLOQUEANTE. Este harness exercita as funções PURAS de
 * `src/lib/lead-csv-export.ts` (zero DOM) com fixtures de `LeadRow`.
 *
 * Cobre:
 *   - ordem/contagem de LEAD_CSV_COLUMNS (14)
 *   - leadRowToCsvRecord: chaves == LEAD_CSV_COLUMNS, cada mapeamento de valor
 *     (nicho/motivo por NOME, etapa/canal/tipo-origem rotulados, datas
 *     dd/MM/yyyy, valor em reais com vírgula, interesse null -> vazio)
 *   - sanitizeCsvCell: prefixo apóstrofo nas 6 formas + passthrough
 *   - buildLeadsCsv: prefixo BOM ﻿, linha de cabeçalho, caso vazio
 *     (D-21-03), quoting RFC4180 de `;` pelo Papa
 *   - leadsCsvFilename: leads-AAAA-MM-DD.csv
 *
 * Rodar via: node scripts/test-lead-csv-export.cjs  (ou npm run test:lead-csv-export)
 * Exit 0 = tudo passou. Exit 1 = alguma violação (mensagem descritiva + total).
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

(async () => {
  const m = await import("@/lib/lead-csv-export");
  const {
    LEAD_CSV_COLUMNS,
    leadRowToCsvRecord,
    sanitizeCsvCell,
    buildLeadsCsv,
    leadsCsvFilename,
  } = m;

  /** Fixture plana de `LeadRow` — `import type` é apagado no runtime, é só um objeto JS. */
  function leadRow(overrides = {}) {
    return {
      id: 1,
      nome: "Ana Paula",
      telefone: "11999998888",
      canal: "whatsapp",
      origem: "Instagram",
      origemTipo: "outbound",
      valorEstimado: 123456,
      notas: "sem observações",
      followUpDate: new Date(2026, 8, 4),
      nichoId: 1,
      interesse: null,
      stage: "novo",
      motivoPerdaId: null,
      stageChangedAt: null,
      sequenciaPosicao: 0,
      contactAttempts: 3,
      createdAt: new Date(2026, 8, 4),
      updatedAt: new Date(2026, 8, 4),
      deletedAt: null,
      importBatchId: null,
      nichoNome: "Nutricionista",
      motivoPerdaNome: "",
      ...overrides,
    };
  }

  const EXPECTED_COLUMNS = [
    "Nome",
    "Telefone",
    "Canal",
    "Nicho",
    "Etapa",
    "Follow-up",
    "Origem",
    "Tipo de origem",
    "Interesse",
    "Valor estimado",
    "Motivo de perda",
    "Tentativas de contato",
    "Notas",
    "Criado em",
  ];

  // --- LEAD_CSV_COLUMNS: 14 colunas na ordem exata ---
  check(
    Array.isArray(LEAD_CSV_COLUMNS) && LEAD_CSV_COLUMNS.length === 14,
    `14 colunas na ordem (got length ${LEAD_CSV_COLUMNS && LEAD_CSV_COLUMNS.length})`
  );
  check(
    JSON.stringify([...LEAD_CSV_COLUMNS]) === JSON.stringify(EXPECTED_COLUMNS),
    `LEAD_CSV_COLUMNS bate rótulo a rótulo (got ${JSON.stringify([...LEAD_CSV_COLUMNS])})`
  );

  // --- leadRowToCsvRecord: record só com as chaves de LEAD_CSV_COLUMNS ---
  {
    const rec = leadRowToCsvRecord(leadRow());
    check(
      JSON.stringify(Object.keys(rec)) === JSON.stringify([...LEAD_CSV_COLUMNS]),
      `record só com as chaves de LEAD_CSV_COLUMNS (got ${JSON.stringify(Object.keys(rec))})`
    );
  }

  // --- nicho/motivo por nome (nunca id) ---
  {
    const rec = leadRowToCsvRecord(
      leadRow({ nichoNome: "Terapeuta", stage: "perdido", motivoPerdaId: 7, motivoPerdaNome: "Preço" })
    );
    check(rec["Nicho"] === "Terapeuta", `nicho por nome (got ${JSON.stringify(rec["Nicho"])})`);
    check(rec["Motivo de perda"] === "Preço", `motivo por nome (got ${JSON.stringify(rec["Motivo de perda"])})`);
  }
  {
    const rec = leadRowToCsvRecord(leadRow({ motivoPerdaNome: "" }));
    check(rec["Motivo de perda"] === "", `motivo vazio quando motivoPerdaNome === "" (got ${JSON.stringify(rec["Motivo de perda"])})`);
  }

  // --- etapa: Record local (perdido -> Perdido, negociacao -> Negociação) ---
  {
    check(leadRowToCsvRecord(leadRow({ stage: "perdido" }))["Etapa"] === "Perdido", `etapa perdido -> "Perdido"`);
    check(leadRowToCsvRecord(leadRow({ stage: "negociacao" }))["Etapa"] === "Negociação", `etapa negociacao -> "Negociação"`);
    check(leadRowToCsvRecord(leadRow({ stage: "novo" }))["Etapa"] === "Novo", `etapa novo -> "Novo"`);
  }

  // --- canal ---
  {
    check(leadRowToCsvRecord(leadRow({ canal: "whatsapp" }))["Canal"] === "WhatsApp", `canal whatsapp -> "WhatsApp"`);
    check(leadRowToCsvRecord(leadRow({ canal: "instagram" }))["Canal"] === "Instagram", `canal instagram -> "Instagram"`);
  }

  // --- tipo de origem ---
  {
    check(leadRowToCsvRecord(leadRow({ origemTipo: "inbound" }))["Tipo de origem"] === "Inbound", `origemTipo inbound -> "Inbound"`);
    check(leadRowToCsvRecord(leadRow({ origemTipo: "outbound" }))["Tipo de origem"] === "Outbound", `origemTipo outbound -> "Outbound"`);
  }

  // --- datas dd/MM/yyyy ---
  {
    const rec = leadRowToCsvRecord(
      leadRow({ followUpDate: new Date(2026, 8, 4), createdAt: new Date(2025, 0, 31) })
    );
    check(rec["Follow-up"] === "04/09/2026", `data dd/MM/yyyy follow-up (got ${JSON.stringify(rec["Follow-up"])})`);
    check(rec["Criado em"] === "31/01/2025", `data dd/MM/yyyy criado em (got ${JSON.stringify(rec["Criado em"])})`);
  }

  // --- valor estimado (centavos -> R$ com vírgula decimal) ---
  {
    check(leadRowToCsvRecord(leadRow({ valorEstimado: 123456 }))["Valor estimado"] === "R$ 1234,56", `valor R$ 1234,56`);
    check(leadRowToCsvRecord(leadRow({ valorEstimado: 0 }))["Valor estimado"] === "R$ 0,00", `valor R$ 0,00`);
  }

  // --- interesse null -> vazio ---
  {
    check(leadRowToCsvRecord(leadRow({ interesse: null }))["Interesse"] === "", `interesse null -> vazio`);
    check(
      leadRowToCsvRecord(leadRow({ interesse: "emagrecimento" }))["Interesse"] === "emagrecimento",
      `interesse texto preservado`
    );
  }

  // --- tentativas de contato ---
  check(leadRowToCsvRecord(leadRow({ contactAttempts: 3 }))["Tentativas de contato"] === "3", `tentativas 3 -> "3"`);

  // --- sanitizeCsvCell: prefixo apóstrofo nas 6 formas + passthrough ---
  check(sanitizeCsvCell("=SUM(A1)") === "'=SUM(A1)", `sanitizeCsvCell '=' -> apóstrofo`);
  check(sanitizeCsvCell("+55 11") === "'+55 11", `sanitizeCsvCell '+' -> apóstrofo`);
  check(sanitizeCsvCell("-desconto") === "'-desconto", `sanitizeCsvCell '-' -> apóstrofo`);
  check(sanitizeCsvCell("@handle") === "'@handle", `sanitizeCsvCell '@' -> apóstrofo`);
  check(sanitizeCsvCell("\ttab") === "'\ttab", `sanitizeCsvCell TAB -> apóstrofo`);
  check(sanitizeCsvCell("\rcr") === "'\rcr", `sanitizeCsvCell CR -> apóstrofo`);
  check(sanitizeCsvCell("Ana Paula") === "Ana Paula", `sanitizeCsvCell passthrough (inalterado)`);
  check(sanitizeCsvCell("") === "", `sanitizeCsvCell string vazia -> vazia`);

  // --- CSV injection aplicado dentro de leadRowToCsvRecord ---
  {
    const rec = leadRowToCsvRecord(leadRow({ nome: "=1+1", notas: "@somebody" }));
    check(rec["Nome"] === "'=1+1", `leadRowToCsvRecord neutraliza fórmula no Nome (got ${JSON.stringify(rec["Nome"])})`);
    check(rec["Notas"] === "'@somebody", `leadRowToCsvRecord neutraliza @ nas Notas (got ${JSON.stringify(rec["Notas"])})`);
  }

  // --- buildLeadsCsv: BOM ---
  {
    const csv = buildLeadsCsv([leadRow()]);
    check(csv.charCodeAt(0) === 0xfeff, `BOM \\uFEFF no início (got charCode ${csv.charCodeAt(0).toString(16)})`);
  }

  // --- buildLeadsCsv: linha de cabeçalho ---
  {
    const csv = buildLeadsCsv([leadRow()]);
    const lines = csv.slice(1).split("\r\n").filter((l) => l.length > 0);
    check(lines[0] === EXPECTED_COLUMNS.join(";"), `1ª linha (após BOM) é o cabeçalho separado por ';' (got ${JSON.stringify(lines[0])})`);
    check(lines.length === 2, `1 row -> 2 linhas de conteúdo (got ${lines.length})`);
  }

  // --- buildLeadsCsv([]) -> só cabeçalho (D-21-03) ---
  {
    const csv = buildLeadsCsv([]);
    check(csv.charCodeAt(0) === 0xfeff, `buildLeadsCsv([]) ainda começa com BOM`);
    const lines = csv.slice(1).split("\r\n").filter((l) => l.length > 0);
    check(lines.length === 1 && lines[0] === EXPECTED_COLUMNS.join(";"), `buildLeadsCsv([]) só cabeçalho (got ${JSON.stringify(lines)})`);
  }

  // --- quoting RFC4180 de ';' pelo Papa ---
  {
    const csv = buildLeadsCsv([leadRow({ nome: "Silva; Souza" })]);
    check(csv.includes('"Silva; Souza"'), `valor com ';' sai entre aspas (quoting do Papa)`);
  }

  // --- leadsCsvFilename ---
  check(
    leadsCsvFilename(new Date(2026, 8, 4)) === "leads-2026-09-04.csv",
    `leadsCsvFilename(2026-09-04) -> "leads-2026-09-04.csv" (got ${JSON.stringify(leadsCsvFilename(new Date(2026, 8, 4)))})`
  );

  if (failed > 0) {
    console.error(`\n[test-lead-csv-export] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-lead-csv-export] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-lead-csv-export] ERRO:", err.stack || err);
  process.exit(1);
});
