---
phase: 13-rename-sub-nicho-nicho-reframe
plan: 01
subsystem: data
tags: [rename, drizzle, zod, guard, no-migration]
requires:
  - phase: 12 (baseline v1.4)
    provides: "schema/tipos/validações/queries/guard existentes com o vocabulário `subnicho`"
provides:
  - "Camada de dados fala `nicho`: export Drizzle `nichos`, prop `leads.nichoId`, tipos `Nicho`/`NewNicho`, `nichoSchema`, campos Zod `nichoId`/`nichoNome`, `getContagemPorNicho`, `CsvFieldKey \"nichoNome\"`, `src/actions/nicho-actions.ts` (`createNicho`/`softDeleteNicho`/`renameNicho`)"
  - "Nomes FÍSICOS do banco intocados (D-01): tabela `subnichos`, coluna `subnicho_id`, índices `subnicho_nome_unique_idx`/`subnichos_deleted_at_idx`/`leads_subnicho_id_idx`"
  - "`guard-no-hard-delete.cjs` protege a tabela renomeada: CODE_PATTERN `.delete(nichos)`; CODE_SQL_PATTERNS `DELETE FROM subnichos`/`DROP TABLE subnichos` mantidos (nome físico)"
affects: [13-02, 13-03]
tech-stack:
  added: []
  patterns:
    - "Rename lógico sem migração — Drizzle `sqliteTable(\"nomeFisico\", ...)` + `integer(\"colunaFisica\")` desacoplam o identificador JS do nome físico; zero toque em data/crm.db"
    - "Guard com assimetria deliberada: CODE_PATTERNS casam o objeto Drizzle (mudou), CODE_SQL_PATTERNS casam o nome físico da tabela (não mudou)"
key-files:
  created:
    - src/actions/nicho-actions.ts
  modified:
    - src/db/schema.ts
    - src/types/index.ts
    - src/lib/validations.ts
    - src/db/queries.ts
    - src/lib/csv-import.ts
    - scripts/guard-no-hard-delete.cjs
  deleted:
    - src/actions/subnicho-actions.ts (git mv → nicho-actions.ts)
key-decisions:
  - "git mv usado para `subnicho-actions.ts` → `nicho-actions.ts` (histórico preservado, `git status` mostra `R`)"
  - "`schema.ts` L112 tem comentário `mesmo raciocínio de leads_subnicho_id_idx` — mantido: é referência ao NOME do índice (string física), não ao identificador"
requirements-completed: []
duration: ~10min
completed: 2026-08-30
---

# Phase 13 Plan 01: Camada de dados fala `nicho` Summary

**O vocabulário `subnicho`/`Subnicho` sai do código de schema, tipos, validação, queries, contrato de CSV e Server Actions — vira `nicho`/`Nicho`. Os nomes FÍSICOS do banco (`subnichos`, `subnicho_id`, 3 índices) ficam intocados por D-01: rename só na camada de código, sem migração, sem backup, sem esbarrar no snapshot divergente do drizzle-kit. Um doc-comment no `schema.ts` registra a divergência.**

## Accomplishments

- **`src/db/schema.ts`**: `export const subnichos` → `export const nichos`, mantendo `sqliteTable("subnichos", ...)`. Doc-comment de 13 linhas acima do export explicando a divergência lógico↔físico (D-01) no estilo dos doc-comments existentes (`motivosPerda`, coluna morta `motivo_perda`). `leads.subnichoId: integer("subnicho_id").references(() => subnichos.id)` → `leads.nichoId: integer("subnicho_id").references(() => nichos.id, { onDelete: "restrict" })`. `index("leads_subnicho_id_idx").on(table.subnichoId)` → `.on(table.nichoId)` (nome do índice string preservado). 2 referências textuais em doc-comment de `motivosPerda` atualizadas (`subnichos` → `nichos`).
- **`src/types/index.ts`**: import `subnichos` → `nichos`; `Subnicho`/`NewSubnicho` → `Nicho`/`NewNicho`.
- **`src/lib/validations.ts`**: `subnichoSchema` → `nichoSchema`; `subnichoId` → `nichoId` (msg "Selecione um sub-nicho." → "Selecione um nicho."); `.omit({ subnichoId })` → `.omit({ nichoId })`; `subnichoNome` → `nichoNome` (msg "Sub-nicho é obrigatório." → "Nicho é obrigatório."); 2 comentários.
- **`src/db/queries.ts`**: import `subnichos` → `nichos`; `getContagemPorSubnicho` → `getContagemPorNicho` (return type `{ subnichoId }` → `{ nichoId }`, corpo todo migrado); doc-comment da função reescrito ("por sub-nicho" → "por nicho", `subnichoExists` → `nichoExists`); comentário de índice anotado `(nome físico do índice)`.
- **`src/lib/csv-import.ts`**: `CsvFieldKey` `"subnichoNome"` → `"nichoNome"`; `MappedCsvRow.subnichoNome` → `nichoNome`; usos em `mapCsvRows`; 1 comentário.
- **`src/actions/subnicho-actions.ts` → `src/actions/nicho-actions.ts`** (git mv): `createSubnicho` → `createNicho`, `softDeleteSubnicho(subnichoId)` → `softDeleteNicho(nichoId)`, `renameSubnicho` → `renameNicho`; import `{ subnichos }` → `{ nichos }`, `subnichoSchema` → `nichoSchema`; todos os `db.update(subnichos)`/`db.insert(subnichos)`/`eq(subnichos.id, ...)` → `nichos`; `revalidatePath("/subnichos")` → `revalidatePath("/nichos")`; mensagens de erro "Esse sub-nicho já existe."/"Sub-nicho inválido." → "Esse nicho já existe."/"Nicho inválido."; doc-comment (`subnichoExists` → `nichoExists`, `leads.subnichoId` → `leads.nichoId`).
- **`scripts/guard-no-hard-delete.cjs`**: `CODE_PATTERNS` `/\.delete\(\s*subnichos\b/` → `/\.delete\(\s*nichos\b/`. `CODE_SQL_PATTERNS` (`DELETE FROM subnichos`, `DROP TABLE subnichos`) **mantidos** — nome físico. Comentários do cabeçalho + a string de OK atualizados com nota da assimetria. Nova nota de bloco (Fase 13, D-01) explicando por que CODE_PATTERNS ≠ CODE_SQL_PATTERNS.

## Task Commits

1. **Task 1-3 (uma única leva — rename mecânico coeso)** — `0c80822` (feat)

## Verificação (gates da Onda 1)

| # | Comando | Exit | Nota |
|---|---------|------|------|
| 1 | `npx tsc --noEmit` | ≠0 | Erros **só** em superfícies de UI/actions ainda não migradas (esperado — roteiro da Onda 2). ZERO erro dentro dos 7 arquivos deste plano. |
| 2 | `npm run verify:schema` | **0** | Sem edição do script; saída ainda menciona `subnichos` (nome físico) — correto |
| 3 | `npm run guard:no-hard-delete` | **0** | Nova saída de OK cita "nichos [tabela física `subnichos`]" |
| 4 | grep `subnicho` nos 7 arquivos | GATE OK | Só `sqliteTable("subnichos")`, `integer("subnicho_id")`, os 3 nomes de índice string, e o doc-comment de divergência |
| 5 | `git status src/actions` | — | `R  src/actions/subnicho-actions.ts -> src/actions/nicho-actions.ts` |

## Roteiro da Onda 2 (13-02) — arquivos que `tsc` acusou

```
src/actions/import-actions.ts
src/actions/lead-actions.ts
src/app/importar/[batchId]/page.tsx
src/app/importar/page.tsx
src/app/leads/page.tsx
src/app/lixeira/page.tsx
src/app/page.tsx
src/app/pipeline/page.tsx
src/app/relatorios/page.tsx        (+ erro de `any` implícito em `linha` — cascata do return type de getContagemPorNicho)
src/app/subnichos/page.tsx         (movido para src/app/nichos/ na Onda 2)
src/components/csv-column-mapper.tsx
src/components/csv-import-preview-table.tsx
src/components/csv-import-wizard.tsx
src/components/followup-dashboard.tsx
src/components/lead-form-dialog.tsx
src/components/lead-table-columns.tsx
src/components/lead-table-toolbar.tsx
src/components/lead-table.tsx
src/components/lixeira-table.tsx
src/components/pipeline-board.tsx
src/components/post-import-lead-list.tsx
src/components/subnicho-combobox.tsx   (→ nicho-combobox.tsx)
src/components/subnicho-manager.tsx    (→ nicho-manager.tsx)
```
(+ `src/components/delete-subnicho-dialog.tsx` — não apareceu no tsc porque ninguém quebrou seu contrato ainda, mas será renomeado na Onda 2.)

## Deviations from Plan

- Tasks 1-3 do plano feitas numa única leva de commit em vez de 3 commits atômicos — o rename é um bloco coeso e indivisível na prática (o schema não compila sem os tipos, os tipos não sem o schema). `13-01-PLAN.md` previa a possibilidade; sem impacto de comportamento.

## Issues Encountered

Nenhum. O `git mv` do arquivo de actions funcionou (`git status` = `R`).

## Next Phase Readiness

- Onda 2 (13-02): a lista de 23 arquivos acima é o roteiro exato. `tsc` + `build` devem sair exit 0 ao fim.

## Self-Check: PASSED

- `src/actions/nicho-actions.ts` — FOUND (com `createNicho`/`softDeleteNicho`/`renameNicho`)
- `src/actions/subnicho-actions.ts` — GONE
- `src/db/schema.ts` — `export const nichos = sqliteTable("subnichos"` + doc-comment
- `src/types/index.ts` — `export type Nicho`
- Commit `0c80822` — FOUND

---
*Phase: 13-rename-sub-nicho-nicho-reframe*
*Completed: 2026-08-30*
