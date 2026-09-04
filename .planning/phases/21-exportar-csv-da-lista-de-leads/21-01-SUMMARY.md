---
phase: 21-exportar-csv-da-lista-de-leads
plan: 01
subsystem: ui
tags: [csv, papaparse, export, date-fns, tanstack-table, react]

# Dependency graph
requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: "lead-table.tsx / lead-table-columns.tsx / lead-table-toolbar.tsx (tabela de /leads, LeadRow, toolbar de filtros)"
  - phase: 11
    provides: "prop motivosPerda de LeadTable (lista governada, sem filtro de deletedAt)"
  - phase: 02
    provides: "papaparse ^5.5.4 já na árvore (import CSV) + idioma de encoding csv-encoding.ts"
provides:
  - "Botão 'Exportar CSV' na toolbar de /leads — baixa leads-AAAA-MM-DD.csv com as linhas filtradas + ordenadas"
  - "src/lib/lead-csv-export.ts — serialização pura de LeadRow[] para texto CSV (BOM UTF-8, delimitador ;, guard de CSV injection)"
  - "LeadRow.motivoPerdaNome — nome do motivo de perda resolvido client-side (join por Map)"
  - "scripts/test-lead-csv-export.cjs + npm run test:lead-csv-export — harness code+data da serialização"
affects: [exportação, relatórios, handoff-prospector-crm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Serialização de arquivo = módulo puro DOM-free (testável no harness .cjs); trigger de download (Blob/<a download>) isolado no componente cliente"
    - "Rótulo de enum espelhado num Record local quando o módulo-fonte é .tsx e não pode entrar no grafo de runtime do harness .cjs"

key-files:
  created:
    - "src/lib/lead-csv-export.ts"
    - "scripts/test-lead-csv-export.cjs"
    - ".planning/phases/21-exportar-csv-da-lista-de-leads/21-01-SUMMARY.md"
  modified:
    - "src/components/lead-table-columns.tsx"
    - "src/components/lead-table.tsx"
    - "src/components/lead-table-toolbar.tsx"
    - "package.json"

key-decisions:
  - "D-21-01: exportação 100% client-side a partir de table.getSortedRowModel().rows; sem Server Action / rota de API"
  - "D-21-02: motivo de perda sai como NOME via Map em lead-table.tsx (mesmo padrão do nichoNome); '' quando ausente"
  - "D-21-03: botão sempre habilitado; 0 linhas visíveis -> CSV só com cabeçalho"
  - "D-21-04: CSV/formula injection mitigado — sanitizeCsvCell prefixa ' quando 1º char é = + - @ TAB CR"
  - "D-21-05: BOM UTF-8 ('\\uFEFF') + delimitador ';' para o locale pt-BR do Excel"
  - "D-21-06: 14 colunas legíveis, ids crus e ruído (id, nichoId, deletedAt, ...) fora"
  - "D-21-07: nome do arquivo leads-AAAA-MM-DD.csv (format(now, 'yyyy-MM-dd'))"
  - "D-21-08: verificação por code+data (host 4GB); download real + abrir no Excel = UAT humano não-bloqueante; ship por push direto na main"

patterns-established:
  - "Módulo de serialização puro (zero DOM/React) + função de download DOM no componente cliente"
  - "Record<Stage,string> / Record<canal,string> local em lead-csv-export.ts espelhando etapa-badge.tsx (não importável — .tsx)"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-03]

# Metrics
duration: 17min
completed: 2026-09-04
---

# Phase 21 Plan 01: Exportar CSV da Lista de Leads Summary

**Botão "Exportar CSV" na toolbar de /leads que baixa `leads-AAAA-MM-DD.csv` com exatamente as linhas filtradas + ordenadas (via `table.getSortedRowModel()`), colunas legíveis (nicho e motivo de perda por nome, datas `dd/MM/yyyy`, valor em reais), BOM UTF-8 + delimitador `;` para o Excel pt-BR, e guard OWASP de formula injection — tudo client-side via PapaParse já instalado.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-09-04T11:37:04Z
- **Completed:** 2026-09-04T11:54:27Z
- **Tasks:** 3
- **Files modified:** 4 (2 criados, 2 modificados) + package.json

## Accomplishments

- `src/lib/lead-csv-export.ts` — funções puras `LEAD_CSV_COLUMNS`, `leadRowToCsvRecord`, `sanitizeCsvCell`, `buildLeadsCsv`, `leadsCsvFilename`; DOM-free, 100% testável.
- `LeadRow` ganhou `motivoPerdaNome` (join client-side por `Map`, mesmo padrão do `nichoNome`) — motivo de perda sai como nome no CSV.
- Botão "Exportar CSV" (ícone `Download`, `variant="outline"`) na toolbar, ao lado de "Limpar filtros"; `handleExport` lê `table.getSortedRowModel().rows` (reflete os 3 filtros + ordenação), gera o CSV e dá `toast` de sucesso.
- `scripts/test-lead-csv-export.cjs` + `npm run test:lead-csv-export` — 38 asserções code+data (SC#3/SC#4); 2 testes de mutação (BOM, sanitizeCsvCell) confirmados mordendo.

## Task Commits

1. **Task 1: Estender LeadRow com motivoPerdaNome** - `36cc498` (feat)
2. **Task 2: Módulo puro lead-csv-export.ts + harness (RED)** - `c568ef2` (test)
3. **Task 2: Módulo puro lead-csv-export.ts (GREEN)** - `b4195ae` (feat)
4. **Task 3: Botão "Exportar CSV" na toolbar + trigger de download** - `2bb45f7` (feat)

**Plan metadata:** _(commit docs final — ver STATE.md / ROADMAP.md)_

## Files Created/Modified

- `src/lib/lead-csv-export.ts` (novo) — serialização pura de `LeadRow[]` para texto CSV.
- `scripts/test-lead-csv-export.cjs` (novo) — harness code+data da serialização.
- `src/components/lead-table-columns.tsx` — `LeadRow` estende com `motivoPerdaNome: string`.
- `src/components/lead-table.tsx` — `motivoPerdaNomeById` (Map) + `motivoPerdaNome` no `data` useMemo.
- `src/components/lead-table-toolbar.tsx` — `downloadCsv()` (único código DOM), `handleExport()`, botão "Exportar CSV".
- `package.json` — script `test:lead-csv-export` (nenhuma dependência nova; `package-lock.json` intacto).

## Decisions Made

Seguiu o plano exatamente. D-21-01 a D-21-08 aplicadas como especificado (ver frontmatter `key-decisions`).

## Deviations from Plan

None - plan executed exactly as written.

Nota de implementação (não é desvio): o BOM foi gravado como escape `"﻿"` no fonte (o editor inicialmente materializou o caractere literal U+FEFF; corrigido por edição byte-a-byte para bater com a asserção de superfície e o `grep` do plano).

## Issues Encountered

- **`npm run lint` estourou o timeout de 2 min na 1ª tentativa** (host 4GB, eslint full-project lento). Repetido com timeout maior → exit 0. Não é defeito de código.
- Nenhum outro. `npx tsc --noEmit`, `npm run lint`, `npm run build` todos exit 0.

## Portão code+data (D-21-08 — host 4GB, sequencial, nunca paralelo)

| # | Gate | Resultado |
|---|------|-----------|
| 1 | `npm run test:lead-csv-export` | exit 0 — 38 asserções OK (14 colunas na ordem, record só com as chaves de LEAD_CSV_COLUMNS, nicho/motivo por nome, valor `R$ 1234,56`, data `dd/MM/yyyy`, interesse null→vazio, sanitizeCsvCell nas 6 formas + passthrough, BOM `﻿`, `buildLeadsCsv([])` só cabeçalho, quoting de `;`, `leadsCsvFilename`) |
| 2 | Mutação 1 — remover o BOM (`"﻿" +` → `"" +`) | harness sai **1** nomeando "FAIL BOM ﻿ no início" + 3 correlatas → restaurado |
| 3 | Mutação 2 — neutralizar `sanitizeCsvCell` (`return value`) | harness sai **1** nos 6 casos de sanitize + 2 de `leadRowToCsvRecord` (CSV injection) → restaurado |
| 4 | `npx tsc --noEmit` | exit 0 |
| 5 | `npm run lint` | exit 0 — 4 warnings `react-hooks/incompatible-library` **pré-existentes** (`lead-table.tsx`, `lixeira-table.tsx`, etc. — TanStack `useReactTable`), aceitos/deferidos (precedente Fase 17) |
| 6 | `npm run build` | exit 0 — Turbopack, 13 rotas, TypeScript 39s |
| 7 | `git diff package-lock.json` | 0 linhas — nenhuma dependência instalada |
| — | `src/lib/lead-csv-export.ts` DOM-free | `grep -nE 'Blob|document\.|URL\.'` → 0 linhas ✓ |

## Concerns do plan-checker (registrados — plan-checker: PASS, 3 concerns menores)

**Concern 1 — "linhas visíveis" = TODAS as linhas filtradas, não a página de 25.**
`handleExport` usa `table.getSortedRowModel().rows` = todas as linhas que passam nos filtros de nicho/etapa/intervalo de follow-up e na ordenação ativa, **atravessando todas as páginas** (a paginação de 25 é só de exibição). É a escolha certa (D-21-01). No cenário 1 da UAT humana, "linhas visíveis" deve ser lido como "todas as que passam nos filtros", não "a página atual".

**Concern 2 — `sanitizeCsvCell` prefixa `'` e o Excel/Sheets oculta esse `'`.**
Telefone com `+` (`+5511...` → `'+5511...`) e notas/interesse começando com `-`/`@`/`=` recebem o apóstrofo de guard (D-21-04, OWASP). No Excel/Google Sheets o `'` fica **oculto** (marcador de texto), mas **visível** se o arquivo for aberto num editor de texto puro. Trade-off padrão aceito em D-21-04 — não é bug. Registrar na UAT humana para não ser reportado como defeito.

**Concern 3 (info) — `import Papa from "papaparse"` (UMD) sob o `ts-alias-loader.mjs` do harness `.cjs`.**
Ponto não exercitado por precedente (os precedentes usam `better-sqlite3`/`date-fns`/`drizzle-orm`). **Resultado: funcionou de primeira** — `npm run test:lead-csv-export` importou o Papa sem ajuste (Node 24, mesmo pacote/versão do `csv-import-wizard.tsx`). Nenhuma injeção de `unparse` fino nem troca `require` foi necessária.

## UAT humano — NÃO-BLOQUEANTE (diferido para sessão com navegador — D-21-08)

Os 6 cenários visuais/de download ficam para uma sessão com navegador (host 4GB não roda `dev` + navegador + sessão):

1. Em `/leads`, sem filtros, clicar "Exportar CSV" → baixa `leads-AAAA-MM-DD.csv` com **todas as linhas que passam nos filtros** (todas as páginas), não só a página de 25 (EXPORT-01, SC#1 — ver Concern 1).
2. Filtrar por etapa "Perdido" + nicho X, exportar → CSV só com os leads perdidos daquele nicho (EXPORT-02, SC#2).
3. Ordenar por "Nome" (asc) e exportar → linhas do CSV em ordem alfabética de nome.
4. Abrir o CSV no Excel pt-BR e no Google Sheets → colunas separadas, acentos ("Negociação", nomes com ç/ã) intactos, datas legíveis, nicho e motivo como nome (EXPORT-03 / SC#3 / SC#4).
5. Criar um lead com nome `=1+1` (ou notas começando com `=`/`@`), exportar, abrir no Excel → célula mostra o texto literal, não fórmula avaliada; o `'` de guard fica oculto na planilha (D-21-04 — ver Concern 2).
6. Aplicar um filtro que zera o resultado e exportar → baixa um CSV só com a linha de cabeçalho (D-21-03).

## Known Stubs

Nenhum. Todas as funções têm origem de dados real (`row.original` da tabela que o admin já vê).

## Next Phase Readiness

- EXPORT-01/02/03 fechados por code+data. Fase 21 é a última do milestone v1.6 (Fase 20 já shipada).
- Pronto para `/gsd-secure-phase` / `/close-phase` do v1.6.
- `lead-csv-export.ts` é reusável por um futuro export em `/relatorios` ou pelo handoff Prospector→CRM.

## Self-Check: PASSED

- `src/lib/lead-csv-export.ts` — FOUND
- `scripts/test-lead-csv-export.cjs` — FOUND
- `.planning/phases/21-exportar-csv-da-lista-de-leads/21-01-SUMMARY.md` — FOUND
- Commit `36cc498` — FOUND
- Commit `c568ef2` — FOUND
- Commit `b4195ae` — FOUND
- Commit `2bb45f7` — FOUND

---
*Phase: 21-exportar-csv-da-lista-de-leads*
*Completed: 2026-09-04*
