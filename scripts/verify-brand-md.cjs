#!/usr/bin/env node
"use strict";

/**
 * Gate de existência e estrutura do brand.md (BRAND-01) — script Node puro
 * (só fs/path nativos, sem loader TS, sem async), exposto como
 * `npm run verify:brand-md`.
 *
 * MOTIVO (Fase 19): o skill `/brand-design` gera um brand.md com Paleta,
 * Tipografia, Gradientes, Tom/Voz e Dos-and-don'ts — mas NÃO escreve seção de
 * nome de produto, racional da escolha nem a ressalva de colisão (D-02). Se o
 * planner assumir "rodei o skill, logo BRAND-01 pronto", BRAND-01 fica sem
 * cumprir. Este gate exige tanto o que o skill escreve quanto o augment
 * manual (seção Nome — SOLO + colisão), mais o backup do tema e o wiring de
 * `next/font` em `layout.tsx`.
 *
 * Checagens (contador `check(cond, msg)`, sem lançar exceção):
 *   1. brand.md existe na raiz do repo
 *   2. seção Paleta
 *   3. seção Tipografia
 *   4. menção a Tom / Voz
 *   5. seção Nome + a string "SOLO" (BRAND-01 / D-01)
 *   6. ressalva de colisão (D-02): "colis" / "descart" / SoloCRM / Salesboom / gosolo
 *   7. src/app/globals.css.bak — backup que o skill cria no Passo 5 (não-negociável)
 *   8. src/app/layout.tsx importa de next/font/google
 *   9. src/app/layout.tsx registra uma fonte do next/font numa CSS variable
 *      (`variable: "--font-..."`) — aceita tanto os nomes normalizados
 *      (`--font-sans|mono|serif|heading`) quanto o wiring provado do projeto
 *      (`--font-geist-sans|--font-geist-mono`), que a ponte `@theme inline` de
 *      globals.css já resolve. Ver `.planning/debug/resolved/font-sans-self-reference.md`:
 *      apontar o next/font direto para `--font-sans` recria um bug de auto-referência.
 *
 * Exit 0 = todas passaram. Exit 1 = alguma falhou.
 *
 * ESTADO ESPERADO na Onda 0 da Fase 19: VERMELHO (exit 1) — brand.md e o
 * backup ainda não existem. Fica verde no plano 19-02.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

let failed = 0;
let total = 0;

function check(cond, msg) {
  total += 1;
  if (cond) {
    console.log(`OK    ${msg}`);
  } else {
    console.error(`FAIL  ${msg}`);
    failed += 1;
  }
}

function readIfExists(relPath) {
  const abs = path.join(ROOT, relPath);
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

const brand = readIfExists("brand.md");
check(brand !== null, "brand.md existe na raiz do repo");

if (brand !== null) {
  check(/##\s+.*paleta/i.test(brand), "brand.md tem seção Paleta");
  check(/##\s+.*tipografia/i.test(brand), "brand.md tem seção Tipografia");
  check(/tom|voz/i.test(brand), "brand.md menciona Tom / Voz");
  check(
    /##\s+.*nome/i.test(brand) && /SOLO/.test(brand),
    'brand.md tem seção Nome + a string "SOLO" (BRAND-01 / D-01)'
  );
  check(
    /colis|descart|SoloCRM|Salesboom|gosolo/i.test(brand),
    "brand.md registra a ressalva de colisão do nome (D-02)"
  );
} else {
  // Sem brand.md, as 4 checagens de conteúdo contam como falha explícita
  // (sem lançar exceção — apenas registra).
  check(false, "brand.md tem seção Paleta");
  check(false, "brand.md tem seção Tipografia");
  check(false, "brand.md menciona Tom / Voz");
  check(false, 'brand.md tem seção Nome + a string "SOLO" (BRAND-01 / D-01)');
  check(false, "brand.md registra a ressalva de colisão do nome (D-02)");
}

check(
  fs.existsSync(path.join(ROOT, "src", "app", "globals.css.bak")),
  "src/app/globals.css.bak (backup do /brand-design, Passo 5) existe"
);

const layout = readIfExists(path.join("src", "app", "layout.tsx")) ?? "";
check(/next\/font\/google/.test(layout), "layout.tsx importa de next/font/google");
check(
  /variable:\s*["']--font-(sans|mono|serif|heading|geist-sans|geist-mono)["']/.test(layout),
  'layout.tsx registra uma fonte do next/font numa CSS variable (--font-sans|mono|serif|heading ou --font-geist-sans|geist-mono)'
);

const summary = `\n[verify-brand-md] ${failed} de ${total} checagens falharam`;
if (failed > 0) {
  console.error(summary);
  process.exit(1);
}
console.log(summary);
process.exit(0);
