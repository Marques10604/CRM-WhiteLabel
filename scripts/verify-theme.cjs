#!/usr/bin/env node
"use strict";

/**
 * Guarda estrutural code+data da fiação de tema (THEME-01..04) — script Node
 * puro (só fs/path nativos), exposto como `npm run verify:theme`.
 *
 * MOTIVO (Fase 20): o dark mode depende de 4 arquivos amarrados entre si
 * (provider, toggle, layout raiz, sidebar). Uma regressão silenciosa em
 * qualquer um deles — remover `suppressHydrationWarning`, tirar o
 * `attribute="class"`, o toggle sair do rodapé — quebra o recurso sem
 * quebrar o build. Este gate faz asserções estruturais tolerantes a
 * reformatação (ignora linhas de comentário).
 *
 * Exit 0 = todas passaram ("verify:theme OK"). Exit 1 = alguma falhou.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const failures = [];

function readSource(relPath) {
  const abs = path.join(ROOT, relPath);
  let raw;
  try {
    raw = fs.readFileSync(abs, "utf8");
  } catch {
    failures.push(`${relPath}: arquivo não encontrado`);
    return "";
  }
  return raw
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

function assertContains(relPath, source, needle, descricao) {
  const ok =
    needle instanceof RegExp ? needle.test(source) : source.includes(needle);
  if (!ok) {
    failures.push(`${relPath}: ${descricao}`);
  }
}

// 1. theme-provider.tsx
const provider = readSource("src/components/theme-provider.tsx");
assertContains("src/components/theme-provider.tsx", provider, '"use client"', 'falta "use client"');
assertContains("src/components/theme-provider.tsx", provider, 'from "next-themes"', 'falta import de next-themes');

// 2. layout.tsx
const layout = readSource("src/app/layout.tsx");
assertContains("src/app/layout.tsx", layout, "suppressHydrationWarning", "falta suppressHydrationWarning no <html>");
assertContains("src/app/layout.tsx", layout, 'attribute="class"', 'falta attribute="class" no ThemeProvider');
assertContains("src/app/layout.tsx", layout, 'defaultTheme="system"', 'falta defaultTheme="system"');
assertContains("src/app/layout.tsx", layout, "enableSystem", "falta enableSystem");
assertContains("src/app/layout.tsx", layout, "disableTransitionOnChange", "falta disableTransitionOnChange");
assertContains("src/app/layout.tsx", layout, "import { ThemeProvider }", "falta import de ThemeProvider");

// 3. app-sidebar.tsx
const sidebar = readSource("src/components/app-sidebar.tsx");
assertContains("src/components/app-sidebar.tsx", sidebar, "import { ThemeToggle }", "falta import de ThemeToggle");
assertContains("src/components/app-sidebar.tsx", sidebar, "<ThemeToggle", "falta renderização de <ThemeToggle />");
assertContains("src/components/app-sidebar.tsx", sidebar, "mt-auto", "falta container mt-auto no rodapé");

// 4. theme-toggle.tsx
const toggle = readSource("src/components/theme-toggle.tsx");
assertContains("src/components/theme-toggle.tsx", toggle, '"use client"', 'falta "use client"');
assertContains("src/components/theme-toggle.tsx", toggle, "resolvedTheme", "falta leitura de resolvedTheme");
assertContains("src/components/theme-toggle.tsx", toggle, "mounted", "falta guard de hidratação (mounted)");
assertContains("src/components/theme-toggle.tsx", toggle, "Sun", "falta ícone Sun");
assertContains("src/components/theme-toggle.tsx", toggle, "Moon", "falta ícone Moon");
assertContains("src/components/theme-toggle.tsx", toggle, "aria-label", "falta aria-label");
assertContains("src/components/theme-toggle.tsx", toggle, "setTheme(", "falta chamada setTheme(");

if (failures.length > 0) {
  console.error("verify:theme FALHOU:");
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log("verify:theme OK");
process.exit(0);
