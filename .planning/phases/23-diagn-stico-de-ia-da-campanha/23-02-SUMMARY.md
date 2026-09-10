---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 02
subsystem: data-layer
tags: [drizzle, sqlite, migration, schema, verify-schema, append-only, diagnostico]

requires:
  - phase: 23-diagn-stico-de-ia-da-campanha
    plan: 01
    provides: "type Diagnostico (para o .$type<> da coluna payload)"
  - phase: 22-campanha-de-explora-o-de-nicho
    provides: "tabela campanhas (alvo da FK campanha_id)"
provides:
  - "Tabela Drizzle `diagnosticos` (11 colunas, 3 índices, FK campanha_id onDelete restrict)"
  - "Tabela física `diagnosticos` viva em data/crm.db (migração .cjs idempotente)"
  - "Gate estrito `verify:schema` para as 11 colunas de `diagnosticos` + 3 índices"
affects: [23-03 (gerar-diagnostico devolve o shape), 23-04 (Server Action INSERT em diagnosticos), 23-05/23-07 (leitura na UI, re-valida payload)]

tech-stack:
  added: []
  patterns:
    - "Migração .cjs manual idempotente (backup wal_checkpoint + contagem-testemunha + CREATE guardado por sqlite_master + verificação pós), NUNCA drizzle-kit"
    - "Coluna JSON: text(col, { mode: 'json' }).$type<T>() — payload/fontes/buscas"
    - "import type { Diagnostico } em schema.ts — sem efeito colateral de import"
    - "verify-schema.cjs conjunto ESTRITO (missing E extra) para tabela nova + mutação provada por DROP numa cópia"

key-files:
  created:
    - scripts/migrate-diagnosticos.cjs
  modified:
    - src/db/schema.ts
    - scripts/verify-schema.cjs

key-decisions:
  - "D-23-01 aplicado: criado_em = integer({ mode: 'timestamp' }) + default (unixepoch()), NÃO ISO string (o 23-AI-SPEC §4 está errado)"
  - "D-23-07 aplicado: erro e aviso são colunas SEPARADAS — erro só com status='falhou' (payload NULL), aviso só com status='ok' (ressalva não-fatal)"
  - "diagnosticos FORA da ALLOWLIST de guard-no-hard-delete.cjs — append-only, sem soft-delete, nenhuma superfície remove linha"
  - "DIAGNOSTICO-01/10 mantidos Pending — este plano entrega só a fundação de dados; a behavior observável (botão gera / regenera) só fecha com 23-03..23-05"

requirements-completed: []

duration: 12min
completed: 2026-09-10
---

# Phase 23 Plan 02: Tabela `diagnosticos` (schema + migração + gate) Summary

**Tabela append-only `diagnosticos` viva em `data/crm.db` — 11 colunas, 3 índices, FK `campanha_id` onDelete restrict — no schema Drizzle, via migração `.cjs` manual idempotente (rodada 2x, zero linha de `campanhas`/`leads` tocada) e coberta por gate estrito em `verify:schema` com mutação provada.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-09-10
- **Tasks:** 3
- **Files:** 3 (1 criado, 2 modificados)

## Accomplishments

- **`src/db/schema.ts`**: `export const diagnosticos` declarada logo após `campanhas`. 11 colunas com nomes físicos exatos (`id`, `campanha_id`, `payload`, `fontes`, `buscas`, `status`, `erro`, `aviso`, `input_tokens`, `output_tokens`, `criado_em`), 3 índices (`diagnosticos_campanha_id_idx`, `diagnosticos_criado_em_idx`, `diagnosticos_status_idx`), FK `campanha_id → campanhas.id` com `onDelete: "restrict"`. `payload`/`fontes`/`buscas` em `text({ mode: "json" }).$type<…>()`; `payload` tipado com `Diagnostico` via `import type` (sem efeito colateral em `schema.ts`, que é importado por todo o app). Doc-comment em PT-BR registra append-only, ausência de soft-delete, semântica `erro` × `aviso` (D-23-07) coluna a coluna, `criado_em` como timestamp inteiro (D-23-01), e migração sempre via `.cjs`.
- **`scripts/migrate-diagnosticos.cjs`** (novo, ~155 linhas): molde bloco-a-bloco de `migrate-campanhas.cjs`. Backup com `wal_checkpoint(TRUNCATE)` + `copyFileSync` antes de qualquer escrita; contagens-testemunha de `campanhas` E `leads` antes/depois; `CREATE TABLE` + 3 `CREATE INDEX` guardados por `sqlite_master`; verificação pós-migração (contagens inalteradas, conjunto estrito de 11 colunas sem faltas nem extras, 3 índices presentes, `PRAGMA foreign_key_list` contém `campanha_id → campanhas`). Zero `drizzle-kit`.
- **Migração executada de verdade contra `data/crm.db`, 2x consecutivas** — ambas exit 0. 2ª execução provou idempotência ("tabela diagnosticos já existe — pulando CREATE").
- **`scripts/verify-schema.cjs`**: `diagnosticos` em `requiredTables`; os 3 índices em `requiredIndexes`; novo bloco `REQUIRED_DIAGNOSTICOS_COLUMNS` (conjunto estrito, `missing` E `extra`) guardado por `if (tableNames.has("diagnosticos"))`; `console.log` final atualizado. Mutação provada: cópia de `data/crm.db` → `DROP TABLE diagnosticos` → `DB_FILE_NAME=<copia> node scripts/verify-schema.cjs` saiu **exit 1** com `tabelas ausentes em sqlite_master: diagnosticos`. Cópia removida; `git status` não mostra `.db` novo.

## Contagens-testemunha (não-regressão)

| Tabela | Antes | Depois (2 execuções) |
|--------|-------|----------------------|
| campanhas | 0 | 0 |
| leads | 44 | 44 |

(`campanhas` está vazia — nenhuma campanha foi criada ainda; a tabela existe desde a Fase 22.)

## Task Commits

1. **Task 1: Tabela `diagnosticos` no schema Drizzle** — `75cdeda` (feat)
2. **Task 2: Migração `.cjs` idempotente rodada contra `data/crm.db`** — `7984a56` (feat)
3. **Task 3: Gate estrito em `verify-schema.cjs` + mutação provada** — `cecc0ba` (feat)

## Verification

| Gate | Resultado |
|------|-----------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (4 warnings pré-existentes: `csv-import-preview-table.tsx`, `lead-form-dialog.tsx`, `lead-table.tsx`, `lixeira-table.tsx` — `react-hooks/incompatible-library`, fora de escopo) |
| `npm run guard:no-hard-delete` | exit 0 |
| `npm run verify:schema` | exit 0, menciona `diagnosticos` |
| `npm run migrate:diagnosticos` (2x) | exit 0 nas duas |
| `npm run test:diagnostico-estrutural` | verde (harness do 23-01 segue passando) |
| Mutação `verify:schema` (DROP numa cópia) | exit 1 ✓ |

## Deviations from Plan

Nenhuma — plano executado exatamente como escrito. Nota de escopo: a doc `23-PATTERNS.md` (linhas 255-258) listava 10 colunas para `REQUIRED_DIAGNOSTICOS_COLUMNS` (sem `aviso`), pré-datando a decisão D-23-07; o corpo da Task 3 do PLAN.md já pede as 11 colunas com `erro` E `aviso` — segui o PLAN.md.

## Requisitos

- **DIAGNOSTICO-01 / DIAGNOSTICO-10** permanecem **Pending** em `REQUIREMENTS.md`. Este plano entrega a fundação de dados (tabela append-only, sem cache, custo persistível) que é condição necessária dos dois, mas a behavior observável ("o usuário gera sob demanda", "o usuário regenera, custo visível") só fecha quando 23-03 (geração), 23-04 (Server Action) e 23-05 (UI) aterrissarem. Marcar como Complete agora seria falso-positivo.

## Known Stubs

Nenhum. A tabela é infraestrutura pura — sem UI, sem dados hardcoded, sem placeholder.

## Next Phase Readiness

- Tabela `diagnosticos` pronta para o `INSERT` da Server Action do plano 23-04 (`status`, `payload` JSON, `fontes` JSON, `buscas` JSON, `erro`/`aviso`, `input_tokens`, `output_tokens`).
- `diagnosticoSchema.safeParse(row.payload)` na leitura (23-05/23-07) — fronteira de confiança do DB — habilitado pelo `.$type<Diagnostico>()`.
- Onda 2 (23-03) precisa do setup do usuário: `.env.local` com `ANTHROPIC_API_KEY` + Web Search habilitada no Console da organização Anthropic.

## Self-Check: PASSED

- `src/db/schema.ts` contém `export const diagnosticos` (1) e `import type { Diagnostico }` (1) — conferido.
- `scripts/migrate-diagnosticos.cjs` existe em disco — conferido.
- `scripts/verify-schema.cjs` contém `REQUIRED_DIAGNOSTICOS_COLUMNS` (3 ocorrências) — conferido.
- Commits `75cdeda`, `7984a56`, `cecc0ba` presentes em `git log` — conferido.
- Tabela `diagnosticos` presente em `data/crm.db` com as 11 colunas na ordem esperada — conferido via `PRAGMA table_info`.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-10*
