#!/usr/bin/env node
"use strict";

/**
 * Guarda permanente anti hard-delete (LEAD-04) — script Node puro (só
 * módulos nativos fs/path, sem grep/shell), portável entre Git Bash /
 * PowerShell / npm.cmd neste projeto Windows. Roda idêntico em qualquer OS
 * via `node scripts/guard-no-hard-delete.cjs` (também exposto como
 * `npm run guard:no-hard-delete`).
 *
 * Varre recursivamente:
 *   - src/ + scripts/ (código: .ts/.tsx/.js/.cjs/.mjs) atrás de hard-delete de
 *     leads/subnichos/interacoes especificamente: .delete(leads ...),
 *     .delete(subnichos ...), .delete(interacoes ...) (escopo LEAD-04
 *     estendido pela Fase 9 — outras tabelas, ex. `templates`, podem
 *     legitimamente ter hard-delete próprio, ver D-13 em 04-01; não é escopo
 *     desta guarda), E TAMBÉM SQL cru destrutivo contra essas tabelas escrito
 *     dentro de código (ex.: db.run(sql`DELETE FROM leads...`), .exec("DROP
 *     TABLE leads")) — sem isso, SQL raw em .ts/.js escapava da guarda mesmo
 *     sendo o hard-delete que LEAD-04 proíbe (achado da auditoria de
 *     segurança da Fase 1, T-01-11)
 *   - src/db/migrations/ (.sql) atrás de SQL destrutivo: DELETE FROM, DROP TABLE
 *
 * Convenção (ver comentário espelhado em src/actions/lead-actions.ts):
 * exclusão de lead/subnicho/interação é SEMPRE soft-delete/restrict — nunca
 * hard-delete.
 *
 * Exit 0 = árvore limpa. Exit 1 = achou hard-delete/SQL destrutivo (imprime
 * "<arquivo>:<linha>: <trecho>" em stderr para cada ocorrência).
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCAN_ROOTS = ["src", "scripts"]; // src/db/migrations já está dentro de src/
const IGNORED_DIR_NAMES = new Set(["node_modules", ".next", "dist"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".cjs", ".mjs"]);
const SQL_MIGRATIONS_DIR = path.join("src", "db", "migrations");

// Caminhos relativos (à raiz do projeto, separador nativo do path.join) que
// nunca são reportados mesmo se casarem com os padrões abaixo. Hoje só o
// próprio guard, que contém os padrões como string-literal para procurá-los
// e, sem esta allowlist, se auto-acusaria como falso-positivo. Futuras
// exceções legítimas (ex.: uma migração de schema específica) entram aqui.
const ALLOWLIST = [path.join("scripts", "guard-no-hard-delete.cjs")];

// Escopo LEAD-04 (estendido pela Fase 9 a `interacoes`): hard-delete de
// leads/subnichos/interacoes especificamente — NÃO um bloqueio genérico a
// qualquer `db.delete(...)` do repositório. Outras tabelas (ex. `templates`,
// D-13 de 04-01) podem ter hard-delete legítimo e intencional fora da
// garantia de soft-delete que este guard protege.
const CODE_PATTERNS = [
  /\.delete\(\s*leads\b/,
  /\.delete\(\s*subnichos\b/,
  /\.delete\(\s*interacoes\b/,
];

// SQL cru destrutivo contra leads/subnichos/interacoes escrito dentro de
// código (não só migrações) — ex.: db.run(sql`DELETE FROM leads WHERE ...`),
// sqlite.exec("DROP TABLE subnichos"). Escopado a essas três tabelas (mesma
// filosofia de CODE_PATTERNS, não um banimento genérico de DELETE FROM/DROP
// TABLE em qualquer código).
const CODE_SQL_PATTERNS = [
  /\bDELETE\s+FROM\s+[`"']?leads\b/i,
  /\bDELETE\s+FROM\s+[`"']?subnichos\b/i,
  /\bDROP\s+TABLE\s+[`"']?leads\b/i,
  /\bDROP\s+TABLE\s+[`"']?subnichos\b/i,
  /\bDELETE\s+FROM\s+[`"']?interacoes\b/i,
  /\bDROP\s+TABLE\s+[`"']?interacoes\b/i,
];

const SQL_PATTERNS = [/\bDELETE\s+FROM\b/i, /\bDROP\s+TABLE\b/i];

/** @type {{ file: string, line: number, text: string }[]} */
const findings = [];

function toRelative(absPath) {
  return path.relative(ROOT, absPath);
}

function isAllowlisted(relPath) {
  return ALLOWLIST.includes(relPath);
}

function scanFile(absPath, relPath, patterns) {
  let content;
  try {
    content = fs.readFileSync(absPath, "utf8");
  } catch {
    return; // arquivo ilegível/removido entre readdir e read — ignora
  }

  const lines = content.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const pattern of patterns) {
      if (pattern.test(lineText)) {
        findings.push({ file: relPath, line: index + 1, text: lineText.trim() });
        break; // uma ocorrência por linha já basta para reportar essa linha
      }
    }
  });
}

function walk(dirAbsPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbsPath, { withFileTypes: true });
  } catch {
    return; // pasta não existe (ex.: scripts/ ausente em algum ambiente) — ok
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // arquivos/diretórios ocultos

    const entryAbsPath = path.join(dirAbsPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      walk(entryAbsPath);
      continue;
    }

    if (!entry.isFile()) continue;

    const relPath = toRelative(entryAbsPath);
    if (isAllowlisted(relPath)) continue;

    const ext = path.extname(entry.name);
    const isSqlMigration = ext === ".sql" && relPath.startsWith(SQL_MIGRATIONS_DIR + path.sep);

    if (CODE_EXTENSIONS.has(ext)) {
      scanFile(entryAbsPath, relPath, [...CODE_PATTERNS, ...CODE_SQL_PATTERNS]);
    } else if (isSqlMigration) {
      scanFile(entryAbsPath, relPath, SQL_PATTERNS);
    }
  }
}

for (const root of SCAN_ROOTS) {
  walk(path.join(ROOT, root));
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  console.error(
    `\n[guard-no-hard-delete] FALHOU: ${findings.length} ocorrência(s) de hard-delete/SQL destrutivo encontrada(s) em src/ + scripts/ (LEAD-04 exige soft-delete via deletedAt).`
  );
  process.exit(1);
}

console.log("OK: nenhum hard-delete encontrado em src/ + scripts/ + migrações");
process.exit(0);
