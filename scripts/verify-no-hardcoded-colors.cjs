#!/usr/bin/env node
"use strict";

/**
 * Grep-guard de cor hardcoded + nome antigo (BRAND-02 / BRAND-03) — script
 * Node puro (só módulos nativos fs/path, sem grep/shell), portável entre Git
 * Bash / PowerShell / npm.cmd neste projeto Windows. Roda idêntico em qualquer
 * OS via `node scripts/verify-no-hardcoded-colors.cjs` (exposto como
 * `npm run verify:brand`).
 *
 * MOTIVO (Fase 19, Marca e Identidade Visual): o `/brand-design` só reescreve
 * as CSS variables de `globals.css`. Sem migrar TODA cor hardcoded de `src/`
 * para token shadcn (`bg-primary`, `bg-muted`, `text-muted-foreground`,
 * `bg-status-*`, ...), a paleta nova aplica só nos `<Button>` default e o
 * resto do app fica com a cor velha (D-06 / D-07). Este guard é o gate
 * mecânico desse refactor — e do rename "CRM de Leads" → "SOLO" (D-04).
 *
 * PARTE A — varre os arquivos .ts / .tsx de src/ atrás de:
 *   HEX                — `#rgb`..`#rrggbbaa` literal
 *   ARBITRARY          — valor arbitrário Tailwind com hex: `-[#0D9488]`
 *   NEUTRAL_SCALE      — escala neutra Tailwind (`bg-zinc-200`, `text-white`, ...)
 *   NAMED_SCALE        — escala de cor nomeada Tailwind (`bg-amber-50`, ...)
 *   INLINE_STYLE_COLOR — `style={{ backgroundColor: ... }}` / `color:` / `borderColor:`
 *   OLD_NAME           — o nome antigo do produto ("CRM de Leads" / "CRM LEADS")
 *
 * PARTE B — checa `package.json` na raiz (o walk não cobre a raiz): falha se
 *   `"name": "crm-leads"` ou o nome antigo do produto persistem. PARTE B só
 *   roda no modo default (sem argumento de CLI).
 *
 * USO: aceita um argumento opcional (`process.argv[2]`) que substitui o alvo
 *   `src/` por esse único diretório — serve para provar, com uma fixture
 *   limpa, que o guard sai 0 quando não há nada a reportar.
 *
 * Exit 0 = árvore limpa. Exit 1 = achou cor hardcoded / nome antigo (imprime
 * "<arquivo>:<linha>  [<id>]  <trecho>" em stderr para cada ocorrência).
 *
 * ESTADO ESPERADO na Onda 0 da Fase 19: VERMELHO (exit 1) — o refactor ainda
 * não aconteceu. O guard fica verde ao longo das ondas 2–6.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_SCAN_ROOTS = ["src"];
const IGNORED_DIR_NAMES = new Set(["node_modules", ".next", "dist"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

const customRoot = process.argv[2];
const SCAN_ROOTS = customRoot ? [customRoot] : DEFAULT_SCAN_ROOTS;

// Caminhos relativos (à raiz do projeto) nunca reportados mesmo se casarem.
// `src/lib/csv-encoding.ts` casa `#840` — que é o code point do quirk
// PapaParse #840 citado num comentário, NÃO uma cor. `ui/dialog.tsx` NÃO
// entra: o overlay `bg-black/10` vira `bg-foreground/10` no plano 19-05.
const ALLOWLIST = [path.join("src", "lib", "csv-encoding.ts")];

// Ordem: do mais específico para o mais genérico. Uma ocorrência por linha
// já basta para apontar a linha (break após o primeiro match), como no
// precedente `guard-no-hard-delete.cjs`.
const CODE_PATTERNS = [
  { id: "OLD_NAME", re: /CRM de Leads|CRM LEADS|CRM Leads/ },
  {
    id: "INLINE_STYLE_COLOR",
    re: /style=\{\{[^}]*\b(backgroundColor|color|borderColor)\s*:/,
  },
  { id: "ARBITRARY", re: /-\[#[0-9a-fA-F]{3,8}\]/ },
  { id: "HEX", re: /#[0-9a-fA-F]{3,8}\b/ },
  {
    id: "NEUTRAL_SCALE",
    re: /\b(bg|text|border|ring|from|via|to|accent|fill|stroke|shadow|outline|divide|ring-offset)-(zinc|slate|gray|neutral|stone|white|black)(-\d{2,3})?\b/,
  },
  {
    id: "NAMED_SCALE",
    re: /\b(bg|text|border|ring|from|via|to|fill|stroke)-(amber|blue|green|red|emerald|yellow|orange|rose|violet|indigo|sky|teal|cyan|lime|fuchsia|pink|purple)-\d{2,3}\b/,
  },
];

const PACKAGE_JSON_PATTERNS = [
  { id: "OLD_NAME", re: /"name"\s*:\s*"crm-leads"/ },
  { id: "OLD_NAME", re: /CRM de Leads|CRM LEADS|CRM Leads/ },
];

/** @type {{ file: string, line: number, id: string, text: string }[]} */
const findings = [];
let filesScanned = 0;

function toRelative(absPath) {
  return path.relative(ROOT, absPath);
}

function scanText(relPath, content, patterns) {
  const lines = content.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const pattern of patterns) {
      if (pattern.re.test(lineText)) {
        findings.push({
          file: relPath,
          line: index + 1,
          id: pattern.id,
          text: lineText.trim().slice(0, 120),
        });
        break;
      }
    }
  });
}

function walk(dirAbsPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbsPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryAbsPath = path.join(dirAbsPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      walk(entryAbsPath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!CODE_EXTENSIONS.has(path.extname(entry.name))) continue;

    const relPath = toRelative(entryAbsPath);
    if (ALLOWLIST.includes(relPath)) continue;

    let content;
    try {
      content = fs.readFileSync(entryAbsPath, "utf8");
    } catch {
      continue;
    }
    filesScanned++;
    scanText(relPath, content, CODE_PATTERNS);
  }
}

for (const root of SCAN_ROOTS) {
  walk(path.resolve(ROOT, root));
}

// PARTE B — package.json (só no modo default; a fixture não deve depender do repo)
if (!customRoot) {
  const pkgAbs = path.join(ROOT, "package.json");
  try {
    const pkg = fs.readFileSync(pkgAbs, "utf8");
    const lines = pkg.split(/\r?\n/);
    lines.forEach((lineText, index) => {
      for (const pattern of PACKAGE_JSON_PATTERNS) {
        if (pattern.re.test(lineText)) {
          findings.push({
            file: "package.json",
            line: index + 1,
            id: pattern.id,
            text: lineText.trim().slice(0, 120),
          });
          break;
        }
      }
    });
  } catch {
    // package.json ilegível — não é o escopo deste guard
  }
}

if (findings.length > 0) {
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.id}]  ${f.text}`);
  }
  const fileCount = new Set(findings.map((f) => f.file)).size;
  console.error(
    `\n[verify-brand] FALHOU: ${findings.length} ocorrência(s) de cor hardcoded / nome antigo em ${fileCount} arquivo(s). Migre para tokens shadcn (bg-primary, bg-muted, bg-status-*, ...) e renomeie para "SOLO".`
  );
  process.exit(1);
}

console.log(
  `OK: nenhuma cor hardcoded nem nome antigo em src/ (${filesScanned} arquivos varridos)`
);
process.exit(0);
