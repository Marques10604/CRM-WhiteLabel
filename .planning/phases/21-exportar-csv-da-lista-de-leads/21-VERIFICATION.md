---
phase: 21-exportar-csv-da-lista-de-leads
verified: 2026-09-04T02:00:00Z
status: passed
score: 4/4 must-haves verificados (método code+data)
method: code+data
overrides_applied: 0
re_verification:
  previous_status: none
  note: "Verificação inicial. Feita inline pelo orquestrador (fase pequena + gestão de limite de sessão). Portão code+data reverificado independentemente: test:lead-csv-export 0, tsc 0, lint 0, DOM-free confirmado."
deferred:
  - "Download real do arquivo + abertura no Excel/Google Sheets pt-BR (acentos, colunas separadas, formula injection, filtro que zera resultado) — UAT humano NÃO-BLOQUEANTE, host 4GB (D-21-08, precedente Fases 18/19/20)"
---

# Fase 21: Exportar CSV da Lista de Leads — Verification Report

**Phase Goal:** O admin baixa a lista de leads de `/leads` como um arquivo CSV que reflete exatamente os filtros e a ordenação ativos na tabela naquele momento, com colunas legíveis por humano.

**Verified:** 2026-09-04
**Status:** passed
**Método:** code+data (leitura da superfície + `npm run test:lead-csv-export` com 2 testes de mutação + `tsc` + `lint` + `build`). O host de 4GB não roda `dev` + Chrome + sessão do agente juntos.

## Goal Achievement

### Observable Truths (Success Criteria da ROADMAP §Phase 21)

| # | Truth | Status | Evidência (code+data) |
| --- | --- | --- | --- |
| 1 | Botão "Exportar CSV" na toolbar de `/leads`; clicá-lo baixa um `.csv` chamado `leads-AAAA-MM-DD.csv` | ✓ VERIFIED | `lead-table-toolbar.tsx` L199-202: `<Button variant="outline" size="sm" onClick={handleExport}><Download/>Exportar CSV</Button>` logo antes de "Limpar filtros". `handleExport` (L99-107) → `downloadCsv(leadsCsvFilename(), buildLeadsCsv(rows))`. `leadsCsvFilename()` (`lead-csv-export.ts`) → `` `leads-${format(now, "yyyy-MM-dd")}.csv` `` (harness: `leadsCsvFilename(2026-09-04)` → `"leads-2026-09-04.csv"` OK). `downloadCsv` (L31-39) cria `Blob` + `URL.createObjectURL` + `<a download>` + `URL.revokeObjectURL`. O download real em si é o item de UAT não-bloqueante. |
| 2 | Com filtros (nicho/etapa/follow-up) e/ou ordenação ativos, o CSV contém só as linhas visíveis — não a base inteira | ✓ VERIFIED | `handleExport` L102: `table.getSortedRowModel().rows.map((row) => row.original)`. No pipeline do TanStack v8 o sorted model é downstream do filtered (`core → filtered → sorted → paginated`); `getSortedRowModel().rows` = filtradas + ordenadas, **pré-paginação**. Os 3 `setFilterValue` da toolbar (`nichoNome`/`stage`/`followUpDate`) alimentam `columnFilters` → `getFilteredRowModel` (confirmado ligado em `lead-table.tsx` L134-135). **Nota (Concern 1 do plan-checker):** "linhas visíveis" = TODAS as filtradas (todas as páginas), não só a página de 25 renderizada — escolha deliberada (D-21-01), enquadrada no toast "N leads exportados". |
| 3 | Cada lead = 1 linha; nicho e motivo de perda como NOME (não id); datas `dd/MM/yyyy`; valor em reais | ✓ VERIFIED | `LeadRow` ganhou `motivoPerdaNome` (Task 1 — `lead-table-columns.tsx` L9; `lead-table.tsx` `motivoPerdaNomeById` Map + `data` useMemo, `""` quando ausente). `leadRowToCsvRecord` (`lead-csv-export.ts`): `Nicho: row.nichoNome`, `"Motivo de perda": row.motivoPerdaNome`, datas via `format(d, "dd/MM/yyyy")`, `brl(centavos)` → `"R$ 1234,56"` (vírgula decimal). 14 colunas legíveis, sem ids crus. `npm run test:lead-csv-export` → **exit 0, 38 asserções** (ordem das colunas, nicho/motivo por nome, valor R$, data dd/MM/yyyy, interesse null→vazio, rótulos de etapa/canal/tipo). |
| 4 | Abre em Excel / Google Sheets pt-BR — acentos preservados (UTF-8 + BOM), colunas separadas (`;`) | ✓ VERIFIED | `buildLeadsCsv`: `"﻿" + Papa.unparse({ fields, data }, { delimiter: ";" })`. `downloadCsv`: `Blob([csv], { type: "text/csv;charset=utf-8;" })`. **Teste de mutação 1**: trocar `"﻿" +` por `"" +` → `test:lead-csv-export` sai 1 nomeando a falha do BOM → restaurado → exit 0. A abertura ocular no Excel é o item de UAT não-bloqueante; o mecanismo está correto. |

**Score:** 4/4 truths verificados

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/lib/lead-csv-export.ts` | Funções puras DOM-free (`buildLeadsCsv`, `leadRowToCsvRecord`, `sanitizeCsvCell`, `leadsCsvFilename`, `LEAD_CSV_COLUMNS`) | ✓ VERIFIED | `import type { LeadRow }` (elidido no runtime); `Papa.unparse`; `"﻿"`; `delimiter: ";"`; 14 colunas. `grep -nE 'Blob\|document\.\|URL\.'` → **0 linhas** (DOM-free confirmado). |
| `scripts/test-lead-csv-export.cjs` + `test:lead-csv-export` | Harness code+data de SC#3/SC#4 | ✓ VERIFIED | `npm run test:lead-csv-export` exit 0, 38 asserções. 2 testes de mutação (BOM, `sanitizeCsvCell`) mordem. `import Papa from "papaparse"` (UMD) funcionou sob o `ts-alias-loader.mjs` sem ajuste (Concern 3 — resolvido). |
| `src/components/lead-table-columns.tsx` | `LeadRow` estendido com `motivoPerdaNome` | ✓ VERIFIED | `export type LeadRow = Lead & { nichoNome: string; motivoPerdaNome: string }`. Column defs intactos (motivo não vira coluna filtrável). |
| `src/components/lead-table.tsx` | `motivoPerdaNome` resolvido por nome no `data` useMemo | ✓ VERIFIED | `motivoPerdaNomeById` Map de `motivosPerda` (prop já recebida) + `motivoPerdaNome:` no `leads.map`, `""` quando `motivoPerdaId` null. |
| `src/components/lead-table-toolbar.tsx` | Botão "Exportar CSV" + trigger de download via Blob | ✓ VERIFIED | Botão presente; `downloadCsv` (único código DOM da fase) no escopo do módulo; `handleExport` lê `getSortedRowModel().rows`; toast de sucesso; os 3 `setFilterValue` intactos. |
| `package.json` | +1 script, nenhuma dependência | ✓ VERIFIED | `"test:lead-csv-export"` adicionado. `git diff package-lock.json` → 0 linhas. |

### Portão code+data (reverificado pelo orquestrador)

| Comando | Exit | Nota |
| --- | --- | --- |
| `npm run test:lead-csv-export` | **0** | 38 asserções OK |
| Mutação 1 (remover BOM) | 1 → restaurado | harness morde |
| Mutação 2 (neutralizar `sanitizeCsvCell`) | 1 → restaurado | harness morde nos casos de CSV injection |
| `npx tsc --noEmit` | **0** | — |
| `npm run lint` | **0** | 0 errors; 4 warnings `react-hooks/incompatible-library` pré-existentes (TanStack, deferidos Fase 17) |
| `npm run build` | **0** | 13 rotas (Turbopack) — reportado pelo executor |
| `git diff -- package-lock.json` | 0 linhas | nenhuma dependência instalada |
| `grep -nE 'Blob\|document\.\|URL\.' src/lib/lead-csv-export.ts` | 0 linhas | módulo DOM-free |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| `lead-table-toolbar.tsx` | `lead-csv-export.ts` (`buildLeadsCsv`) | `handleExport` monta `rows` e chama `buildLeadsCsv` | ✓ WIRED |
| `lead-table-toolbar.tsx` | `@tanstack/react-table` (filtradas + ordenadas) | `table.getSortedRowModel().rows.map(r => r.original)` | ✓ WIRED |
| `lead-table.tsx` | `motivosPerda` (prop) → `LeadRow.motivoPerdaNome` | Map id→nome + `data` useMemo | ✓ WIRED |
| `lead-csv-export.ts` | arquivo aberto no Excel/Sheets pt-BR | prefixo BOM `﻿` + `Papa.unparse` `delimiter: ";"` | ✓ WIRED |

### Requisitos

EXPORT-01, EXPORT-02, EXPORT-03 — todos no campo `requirements:` do 21-01-PLAN.md, todos `Complete` na traceability. 3/3.

## Deviations

Nenhum desvio de implementação. Nota (não é desvio): o BOM precisou ser corrigido de caractere literal U+FEFF para o escape `"﻿"` no fonte, por edição byte-a-byte.

## Concerns do plan-checker (registrados no 21-01-SUMMARY.md)

1. **"linhas visíveis" = todas as filtradas** (todas as páginas), não a página de 25 — escolha certa (D-21-01), enquadrada no toast.
2. **`sanitizeCsvCell` prefixa `'`** em telefone com `+` e notas com `-`/`@`/`=` — oculto no Excel/Sheets, visível em editor de texto puro. Trade-off OWASP aceito (D-21-04).
3. **`import Papa` (UMD) sob o loader do harness** — funcionou de primeira, sem ajuste.

## Deferred (não-bloqueante)

Download real do `.csv` e abertura no Excel pt-BR e no Google Sheets (acentos, separador `;`, datas, nicho/motivo por nome); teste de formula injection com um lead nomeado `=1+1`; filtro que zera o resultado → CSV só com cabeçalho. Mecanismo verificado por código + harness; falta a confirmação ocular numa sessão com navegador.
