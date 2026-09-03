#!/usr/bin/env node
"use strict";

/**
 * Gate WCAG AA sobre os blocos :root e .dark de src/app/globals.css (BRAND-02)
 * — script Node puro (só fs/path nativos, sem loader TS, sem dependência
 * externa), exposto como `npm run check:contrast`.
 *
 * MOTIVO (Fase 19): o `/brand-design` reescreve as CSS variables e auto-ajusta
 * contraste na geração — mas o projeto tem tokens que o skill NÃO conhece (a
 * escala --status-* de D-08, os --sidebar-*), e o refactor D-06 passa a
 * DEPENDER desses tokens em light E dark. Este gate é a rede de segurança:
 * para cada par foreground/background que aparece na tela, mede o contraste
 * real e falha se ficar abaixo de WCAG AA (4.5 para texto, 3.0 para
 * componente de UI). Token ausente é FALHA explícita — nunca "pulado".
 *
 * Método:
 *   1. Lê globals.css como texto; extrai o corpo de `:root { ... }` e
 *      `.dark { ... }` por varredura de chaves balanceada.
 *   2. Parseia `--token: <valor>;` de cada bloco para um Map.
 *   3. Resolve indireção `var(--x)` no mesmo bloco, com fallback para :root,
 *      até 3 níveis (ciclo / não-resolvido = falha).
 *   4. Converte oklch(L C H [/ A]) para sRGB de verdade: OKLCH -> OKLab ->
 *      LMS' -> LMS -> linear sRGB (matriz inversa padrão) -> clamp [0,1] ->
 *      gama sRGB. Alfa é ignorado (nenhum par testado usa).
 *   5. Luminância relativa WCAG + razão (L1 + 0.05) / (L2 + 0.05).
 *   6. Valida 15 pares em :root E em .dark (30 checagens).
 *
 * Exit 0 = todos os pares passam. Exit 1 = algum par < mínimo, ou token
 * ausente / não-resolvível.
 *
 * ESTADO ESPERADO na Onda 0 da Fase 19: VERMELHO (exit 1) — a escala
 * --status-* só nasce no plano 19-03; este gate reporta os 10 tokens ausentes
 * em cada bloco. Fica verde no plano 19-03.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CSS_PATH = path.join(ROOT, "src", "app", "globals.css");

let failed = 0;
let passed = 0;

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  failed += 1;
}
function ok(msg) {
  console.log(`OK    ${msg}`);
  passed += 1;
}

// --- 1. extrair blocos por chaves balanceadas ---------------------------------

function extractBlock(css, selectorRe) {
  const m = selectorRe.exec(css);
  if (!m) return null;
  const open = css.indexOf("{", m.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

// --- 2. parse de declarações --------------------------------------------------

function parseDecls(blockBody) {
  const map = new Map();
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(blockBody)) !== null) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

// --- 3. resolver var(--x) ----------------------------------------------------

function resolveValue(value, blockMap, rootMap, depth) {
  const v = String(value).trim();
  const m = /^var\(\s*--([\w-]+)\s*\)$/.exec(v);
  if (!m) return v;
  if (depth >= 3) return null;
  const target = m[1];
  const next = blockMap.has(target)
    ? blockMap.get(target)
    : rootMap.has(target)
      ? rootMap.get(target)
      : null;
  if (next == null) return null;
  return resolveValue(next, blockMap, rootMap, depth + 1);
}

// --- 4. OKLCH -> sRGB -------------------------------------------------------

function parseOklch(str) {
  const m =
    /oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([-0-9.]+)(?:\s*\/\s*[0-9.]+%?)?\s*\)/i.exec(
      str
    );
  if (!m) return null;
  const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const C = m[2].endsWith("%") ? (parseFloat(m[2]) / 100) * 0.4 : parseFloat(m[2]);
  const H = parseFloat(m[3]);
  if (![L, C, H].every(Number.isFinite)) return null;
  return { L, C, H };
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

// linear -> sRGB gama
function gammaEncode(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
// sRGB gama -> linear (WCAG)
function gammaDecode(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function oklchToLinearSrgb({ L, C, H }) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function relativeLuminance(oklch) {
  const linear = oklchToLinearSrgb(oklch);
  // clamp [0,1] -> gama sRGB -> re-linearize (WCAG) para respeitar o clip de gamut
  const [r, g, b] = linear
    .map(clamp01)
    .map(gammaEncode)
    .map(clamp01)
    .map(gammaDecode);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// --- 5/6. pares a validar --------------------------------------------------

// [foregroundToken, backgroundToken, minRatio]
const TEXT_MIN = 4.5;
const UI_MIN = 3.0;

const PAIRS = [
  ["foreground", "background", TEXT_MIN],
  ["card-foreground", "card", TEXT_MIN],
  ["popover-foreground", "popover", TEXT_MIN],
  ["primary-foreground", "primary", TEXT_MIN],
  ["secondary-foreground", "secondary", TEXT_MIN],
  ["muted-foreground", "muted", TEXT_MIN],
  ["accent-foreground", "accent", TEXT_MIN],
  ["sidebar-foreground", "sidebar", TEXT_MIN],
  ["sidebar-accent-foreground", "sidebar-accent", TEXT_MIN],
  ["status-neutral-foreground", "status-neutral", TEXT_MIN],
  ["status-info-foreground", "status-info", TEXT_MIN],
  ["status-warning-foreground", "status-warning", TEXT_MIN],
  ["status-success-foreground", "status-success", TEXT_MIN],
  ["status-danger-foreground", "status-danger", TEXT_MIN],
  ["destructive", "background", UI_MIN],
];

function resolveColor(token, blockName, blockMap, rootMap) {
  if (!blockMap.has(token) && !rootMap.has(token)) {
    const hint = token.startsWith("status-")
      ? " — a escala --status-* é criada no plano 19-03"
      : "";
    fail(`AUSENTE --${token} em ${blockName}${hint}`);
    return null;
  }
  const raw = blockMap.has(token) ? blockMap.get(token) : rootMap.get(token);
  const resolved = resolveValue(raw, blockMap, rootMap, 0);
  if (resolved == null) {
    fail(`token --${token} em ${blockName} não resolve para uma cor (var() em ciclo ou alvo ausente)`);
    return null;
  }
  const oklch = parseOklch(resolved);
  if (!oklch) {
    fail(`token --${token} em ${blockName} não é oklch() parseável: "${resolved}"`);
    return null;
  }
  return relativeLuminance(oklch);
}

function checkBlock(blockName, blockMap, rootMap) {
  for (const [fg, bg, min] of PAIRS) {
    const lFg = resolveColor(fg, blockName, blockMap, rootMap);
    const lBg = resolveColor(bg, blockName, blockMap, rootMap);
    if (lFg == null || lBg == null) continue;
    const ratio = contrastRatio(lFg, lBg);
    const line = `${blockName}  --${fg} sobre --${bg} = ${ratio.toFixed(2)} (min ${min})`;
    if (ratio >= min) ok(line);
    else fail(line);
  }
}

// --- main -----------------------------------------------------------------

let css;
try {
  css = fs.readFileSync(CSS_PATH, "utf8");
} catch (err) {
  console.error(`[check-contrast] FALHOU: não foi possível ler ${CSS_PATH}: ${err.message}`);
  process.exit(1);
}

const rootBody = extractBlock(css, /(^|[\s}])(:root)\s*\{/);
const darkBody = extractBlock(css, /(^|[\s}])(\.dark)\s*\{/);

if (rootBody == null) {
  console.error("[check-contrast] FALHOU: bloco :root não encontrado em globals.css");
  process.exit(1);
}
if (darkBody == null) {
  console.error("[check-contrast] FALHOU: bloco .dark não encontrado em globals.css");
  process.exit(1);
}

const rootMap = parseDecls(rootBody);
const darkMap = parseDecls(darkBody);

checkBlock(":root", rootMap, rootMap);
checkBlock(".dark", darkMap, rootMap);

const summary = `\n[check-contrast] ${passed} par(es) OK, ${failed} falha(s) (WCAG AA: 4.5 texto / 3.0 UI)`;
if (failed > 0) {
  console.error(summary);
  process.exit(1);
}
console.log(summary);
process.exit(0);
