#!/usr/bin/env node
"use strict";

/**
 * Guarda estrutural do contrato da sidebar (Quick 260912-nmw) — script Node
 * puro (só fs/path nativos), exposto como `npm run verify:sidebar`.
 *
 * MOTIVO: reorganizar os 12 itens da sidebar em seções agrupadas é uma
 * operação de "copiar objetos existentes para dentro de outra estrutura" —
 * exatamente o tipo de refactor mecânico que silenciosamente derruba/renomeia
 * um `tourId` ou apaga um `href` sem quebrar o build. Este gate lê os dois
 * arquivos-fonte como texto (nunca importa/executa TypeScript) e cruza 3
 * contratos: os 5 seletores do tour guiado (Fase 25), o inventário fechado
 * dos 12 hrefs reais, e a existência dos 4 grupos rotulados.
 *
 * Comentários são removidos ANTES de qualquer asserção — sem isso, prosa de
 * cabeçalho mencionando "Principal" ou "nav-dashboard" auto-validaria a
 * guarda mesmo sem o código real presente.
 *
 * Override de caminho: SIDEBAR_NAV_PATH aponta o elo da sidebar para uma
 * CÓPIA temporária — existe só para viabilizar teste de mutação sem nunca
 * escrever no arquivo real (mesmo idioma de
 * ORIGEM_TIPO_IMPORT_ACTIONS_PATH em scripts/verify-origem-tipo.cjs).
 *
 * Exit 0 = todas as asserções passaram. Exit 1 = alguma falhou (lista de
 * violações impressa em stderr).
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SIDEBAR_PATH =
  process.env.SIDEBAR_NAV_PATH ?? path.join(ROOT, "src", "components", "app-sidebar.tsx");
const TOUR_STEPS_PATH = path.join(ROOT, "src", "lib", "tour-steps.ts");

// Inventário fechado dos 12 hrefs reais — hardcoded deliberadamente (não lido
// de nenhum outro arquivo) para travar contra item sumido E contra tela
// inventada nesta reorganização.
const EXPECTED_HREFS = [
  "/",
  "/leads",
  "/importar",
  "/pipeline",
  "/campanhas",
  "/mapa-de-nichos",
  "/relatorios",
  "/templates",
  "/nichos",
  "/motivos-perda",
  "/lixeira",
  "/configuracoes",
];

const EXPECTED_GROUP_LABELS = ["Principal", "Prospecção", "Operação", "Configuração"];

const violations = [];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function readSource(label, filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    violations.push(`${label}: não foi possível ler ${filePath} (${err.message})`);
    return "";
  }
  return stripComments(raw);
}

function countOccurrences(source, substring) {
  if (substring === "") return 0;
  let count = 0;
  let idx = 0;
  while ((idx = source.indexOf(substring, idx)) !== -1) {
    count += 1;
    idx += substring.length;
  }
  return count;
}

const sidebarSource = readSource("app-sidebar.tsx", SIDEBAR_PATH);
const tourStepsSource = readSource("tour-steps.ts", TOUR_STEPS_PATH);

// --- Asserção 1: contrato do tour (a mais importante) ---
const tourTargets = [...tourStepsSource.matchAll(/\[data-tour="([^"]+)"\]/g)].map((m) => m[1]);
if (tourTargets.length !== 5) {
  violations.push(
    `tour-steps.ts: esperava exatamente 5 seletores [data-tour="..."], achou ${tourTargets.length} (${
      tourTargets.join(", ") || "nenhum"
    })`
  );
}
for (const tourId of tourTargets) {
  const needle = `tourId: "${tourId}"`;
  const count = countOccurrences(sidebarSource, needle);
  if (count !== 1) {
    violations.push(
      `app-sidebar.tsx: esperava exatamente 1 ocorrência de \`${needle}\`, achou ${count}`
    );
  }
}

// --- Asserção 2: fiação do atributo data-tour ---
if (!sidebarSource.includes("data-tour={item.tourId}")) {
  violations.push(
    'app-sidebar.tsx: falta "data-tour={item.tourId}" — o atributo não é mais emitido a partir do campo tourId'
  );
}

// --- Asserção 3: inventário fechado de 12 itens ---
for (const href of EXPECTED_HREFS) {
  const needle = `href: "${href}"`;
  const count = countOccurrences(sidebarSource, needle);
  if (count !== 1) {
    violations.push(`app-sidebar.tsx: esperava exatamente 1 ocorrência de \`${needle}\`, achou ${count}`);
  }
}
const totalHrefCount = countOccurrences(sidebarSource, 'href: "');
if (totalHrefCount !== EXPECTED_HREFS.length) {
  violations.push(
    `app-sidebar.tsx: esperava exatamente ${EXPECTED_HREFS.length} ocorrências de \`href: "\`, achou ${totalHrefCount} (item sumido ou tela inventada)`
  );
}

// --- Asserção 4: grupos ---
for (const label of EXPECTED_GROUP_LABELS) {
  if (!sidebarSource.includes(`"${label}"`)) {
    violations.push(`app-sidebar.tsx: rótulo de grupo "${label}" não encontrado como string literal`);
  }
}
if (!sidebarSource.includes("NAV_GROUPS")) {
  violations.push("app-sidebar.tsx: identificador NAV_GROUPS não encontrado");
}

// --- Asserção 5: preservações de rodapé/marca ---
if (!sidebarSource.includes("<ThemeToggle")) {
  violations.push("app-sidebar.tsx: <ThemeToggle não encontrado");
}
if (!sidebarSource.includes("mt-auto")) {
  violations.push("app-sidebar.tsx: mt-auto não encontrado");
}
if (!sidebarSource.includes("SOLO")) {
  violations.push('app-sidebar.tsx: texto "SOLO" não encontrado');
}

if (violations.length > 0) {
  console.error("[verify-sidebar-nav] FALHOU:");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(
  `[verify-sidebar-nav] OK: 5 tourIds cruzados com tour-steps.ts, ${EXPECTED_HREFS.length} hrefs íntegros, 4 grupos presentes, rodapé/marca preservados.`
);
process.exit(0);
