---
phase: 15-campo-interesse-servi-o-desejado-no-lead
plan: 02
subsystem: api
tags: [csv-import, papaparse, zod, server-actions, drizzle, react-table]

requires:
  - phase: 15-01
    provides: coluna leads.interesse nullable no banco + interesse opcional em leadBaseSchema/csvRowSchema/leadSchema
  - phase: 05-notas-enriquecidas-na-importa-o-csv
    provides: contrato CsvFieldKey/CsvColumnMapping/MappedCsvRow/FIELD_CONFIGS/EMPTY_MAPPING + mapCsvRows/readMapped
provides:
  - "interesse" como CsvFieldKey opcional — mapeável no passo 2 do wizard de importação CSV (com opção "— nenhuma —")
  - Truncamento de interesse em 500 chars em mapCsvRows ANTES da validação (célula gigante nunca reprova a linha)
  - Propagação de interesse por MappedCsvRow -> ConfirmedImportRow -> insert de bulkImportLeads (interesse: row.interesse ?? null)
  - 3 casos automatizados novos em test-lead-actions.cjs (persistência via import, NULL sem mapear, truncamento de mapCsvRows)
affects: [fase futura de handoff Prospector->CRM (serviço desejado preenchido em lote)]

tech-stack:
  added: []
  patterns:
    - "Campo CSV mapeável opcional = novo CsvFieldKey + entrada em FIELD_CONFIGS (required:false) + chave em EMPTY_MAPPING + leitura via readMapped em mapCsvRows + carregamento campo-a-campo até o insert de bulkImportLeads (3ª ocorrência, após notas/origem)"
    - "Defesa contra célula gigante de CSV: .slice(0, 500) em mapCsvRows ANTES de csvRowSchema.safeParse — a linha importa truncada, o .max(500) do Zod só morde no formulário manual (D-10)"

key-files:
  created: []
  modified:
    - src/lib/csv-import.ts
    - src/components/csv-column-mapper.tsx
    - src/components/csv-import-wizard.tsx
    - src/actions/import-actions.ts
    - src/components/csv-import-preview-table.tsx
    - scripts/test-lead-actions.cjs

key-decisions:
  - "interesse NÃO entra em CSV_DEFAULTS (D-11) — vazio/não-mapeado = \"\" -> vira NULL no insert; sem participação em buildNotasText/extraNotasColumns"
  - "Truncamento em 500 em mapCsvRows, não no schema — célula gigante do cowork nunca aborta o lote (D-10)"
  - "bulkImportLeads insere interesse campo-a-campo (não spread) com interesse: row.interesse ?? null — idioma undefined-do-Zod -> null explícito, igual origemTipo/motivoPerdaId"

patterns-established:
  - "Campo CSV mapeável opcional: 6 pontos de toque (CsvFieldKey, MappedCsvRow, mapCsvRows, FIELD_CONFIGS, EMPTY_MAPPING, ConfirmedImportRow+insert) + preview-table"

requirements-completed: [LEAD-06]

duration: 20min
completed: 2026-08-31
---

# Fase 15 Plano 02: Campo "interesse" mapeável no wizard de importação CSV Summary

**`"interesse"` vira `CsvFieldKey` opcional no wizard de CSV — `mapCsvRows` trunca em 500 chars antes de validar, e o valor mapeado carrega por `MappedCsvRow` -> `ConfirmedImportRow` até o insert campo-a-campo de `bulkImportLeads` (`interesse: row.interesse ?? null`).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-31T14:20Z (aprox.)
- **Completed:** 2026-08-31T14:40Z
- **Tasks:** 2 de 2
- **Files modified:** 6

## Accomplishments

- `CsvFieldKey` e `MappedCsvRow` ganham `interesse` (D-08); `CsvColumnMapping` auto-estende por ser `Record<CsvFieldKey, ...>`
- `mapCsvRows` calcula `const interesse = readMapped(row, "interesse").slice(0, 500)` ANTES de qualquer validação (D-10) e devolve no objeto da linha — sem entrada em `CSV_DEFAULTS` (D-11)
- `FIELD_CONFIGS` do `csv-column-mapper.tsx` lista `{ key: "interesse", label: "Interesse", required: false }` após `notas` — o `.map` já renderiza o `<Select>` com "— nenhuma —" para todo campo opcional (D-09), nenhuma outra mudança no componente
- `EMPTY_MAPPING` do `csv-import-wizard.tsx` ganha `interesse: null` (o literal é escrito à mão, `tsc` exige a chave)
- `ConfirmedImportRow` ganha `interesse: string`; `bulkImportLeads` insere `interesse: row.interesse ?? null` no `.values({...})` campo-a-campo (após `notas`)
- `csv-import-preview-table.tsx` monta `interesse: r.interesse` no `confirmedRows.push({...})` de `handleConfirm`
- 3 casos automatizados novos em `test-lead-actions.cjs` (Casos 17-19): persistência via `bulkImportLeads` com interesse mapeado, `NULL` sem mapear, `mapCsvRows` truncando célula de 600 chars em 500

## Task Commits

1. **Task 1: interesse como campo mapeável (tipos + column-mapper + wizard)** - `435b860` (feat)
2. **Task 2: interesse carregado até o insert do import + cobertura** - `f49639a` (feat)

## Files Created/Modified

- `src/lib/csv-import.ts` - `interesse` em `CsvFieldKey` + `MappedCsvRow` (com doc-comment); truncamento `.slice(0, 500)` em `mapCsvRows` antes da validação
- `src/components/csv-column-mapper.tsx` - entrada `{ key: "interesse", label: "Interesse", required: false }` em `FIELD_CONFIGS`
- `src/components/csv-import-wizard.tsx` - `interesse: null` em `EMPTY_MAPPING`
- `src/actions/import-actions.ts` - `interesse: string` em `ConfirmedImportRow` + `interesse: row.interesse ?? null` no insert de `bulkImportLeads`
- `src/components/csv-import-preview-table.tsx` - `interesse: r.interesse` no `confirmedRows.push` de `handleConfirm`
- `scripts/test-lead-actions.cjs` - import dinâmico de `mapCsvRows` + Casos 17-19 (import com/sem interesse + truncamento)

## Decisions Made

- **`interesse` fora de `CSV_DEFAULTS`** (D-11) — coluna não-mapeada ou célula vazia resulta em `""`, que a Server Action materializa como `NULL`. Não participa de `buildNotasText`/`extraNotasColumns` — é campo próprio, não coluna extra de notas.
- **Truncamento em `mapCsvRows`, não no Zod** (D-10) — `readMapped(row, "interesse").slice(0, 500)` roda antes de `csvRowSchema.safeParse`; uma célula gigante do CSV do cowork nunca reprova o lote, o lead importa com o valor cortado. O `.max(500)` do `leadBaseSchema` só dispara no caminho do formulário manual.
- **Insert campo-a-campo** — `bulkImportLeads` não usa spread; `interesse: row.interesse ?? null` segue o idioma `undefined`-do-Zod → `null` explícito já usado em `origemTipo`/`motivoPerdaId`.

## Deviations from Plan

None - plano executado exatamente como escrito.

## Issues Encountered

- **`npm run lint` (repo inteiro) sai com exit 1** — 457 erros pré-existentes não relacionados a esta fase (documentado desde a Fase 8 em `deferred-items.md`). Lint com escopo nos 5 arquivos `.ts`/`.tsx` desta wave: **0 erros, 3 warnings pré-existentes** (`react-hooks/incompatible-library` no `useReactTable` de `csv-import-preview-table.tsx`; 2 `Unused eslint-disable directive` em `csv-import-wizard.tsx`) — nenhum em linha que esta wave tocou, nenhuma regressão introduzida.

## Deferred Issues

- Lint global do repo (exit 1) — pré-existente, fora de escopo. Nenhum novo erro introduzido.
- Os 2 `Unused eslint-disable directive` em `csv-import-wizard.tsx` (linhas 154/190) são warnings antigos do React Compiler — não introduzidos aqui, candidatos a limpeza numa quick task.

## Known Stubs

Nenhum. O campo `interesse` do CSV está totalmente conectado: `<Select>` do column-mapper → `mapping.interesse` → `readMapped` em `mapCsvRows` → `MappedCsvRow.interesse` → prévia → `ConfirmedImportRow.interesse` → `bulkImportLeads` `tx.insert(leads).values({ interesse: row.interesse ?? null })` → `data/crm.db`.

## Threat Flags

Nenhuma superfície nova além da já registrada no `<threat_model>` do plano (T-15-07..10, todas `mitigate`): `mapCsvRows` trunca em 500 (DoS de célula gigante), React escapa o `<Input>` de edição (Stored XSS), `csvRowSchema.safeParse` por linha (campo extra do client), Drizzle parametriza o insert (SQL injection).

## Gates

Todos verdes (rodados em sequência, sem dev server, host 4GB):

- `npx tsc --noEmit` — exit 0
- `npm run test:lead-actions` — exit 0, Casos 17-19 novos `OK` (persistência via import, NULL sem mapear, truncamento de `mapCsvRows`)
- `npm run build` — exit 0 (Turbopack, 33.8s compile + 41s TS, 12 rotas)
- `npx eslint` nos 5 arquivos `.ts`/`.tsx` da wave — 0 erros (3 warnings pré-existentes)
- `npm run lint` global — exit 1 (pré-existente, ver Issues Encountered)

## Next Phase Readiness

- **LEAD-06 completo** — as duas metades entregues: formulário (15-01) + wizard de CSV (15-02). O 4º Success Criteria do ROADMAP ("wizard permite mapear uma coluna para Interesse, e o valor entra no lead importado") está satisfeito na camada de código/dados.
- **Human-check pendente** (`human_verify_mode: end-of-phase`): em `/importar`, subir um CSV com coluna livre → mapear para "Interesse" → confirmar → abrir lead importado e ver o valor; repetir sem mapear → leads com `interesse` nulo, sem regressão.
- Fecha a milestone v1.4 (despivô) na camada de execução — falta `/gsd-secure-phase 15` + `/close-phase 15` + `/gsd-complete-milestone`.

## Self-Check: PASSED

- Arquivos modificados: todos presentes em disco (6/6)
- Commits `435b860` / `f49639a`: presentes em `git log`

---
*Phase: 15-campo-interesse-servi-o-desejado-no-lead*
*Completed: 2026-08-31*
