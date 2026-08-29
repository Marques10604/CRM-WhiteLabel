---
phase: 12-agenda-tarefas-soltas
plan: 01
subsystem: database
tags: [drizzle, sqlite, better-sqlite3, zod, schema-migration]

requires:
  - phase: 09-timeline-de-interacoes
    provides: "molde de tabela sem-FK (`interacoes`) e de gate `verify:schema` com conjunto estrito de colunas"
  - phase: 11-painel-de-metricas
    provides: "molde de migração manual idempotente (`scripts/migrate-motivos-perda.cjs`) e de extensão do `guard-no-hard-delete.cjs`"
provides:
  - "Tabela `tarefas` viva em data/crm.db (6 colunas: id, descricao, data, concluida_em, created_at, updated_at + 2 índices), desacoplada de `leads` (sem FK, sem deletedAt)"
  - "Tipos `Tarefa` / `NewTarefa` exportados de `@/types`"
  - "`tarefaSchema` / `tarefaUpdateSchema` / `TarefaFormValues` exportados de `@/lib/validations`"
  - "`npm run migrate:tarefas` — migração manual idempotente [BLOCKING]"
  - "`verify:schema` cobre `tarefas` com conjunto estrito; `guard:no-hard-delete` permite hard-delete só em `src/actions/tarefa-actions.ts` (exceção D-08)"
affects: [12-02, 12-03, 12-04]

tech-stack:
  added: []
  patterns:
    - "Primeira PERMISSÃO (ALLOWLIST) do guard-no-hard-delete — oposto das extensões de bloqueio das Fases 9/11"
    - "Tabela de domínio totalmente desacoplada (sem FK) com hard-delete intencional documentado em D-08"

key-files:
  created:
    - scripts/migrate-tarefas.cjs
  modified:
    - src/db/schema.ts
    - src/types/index.ts
    - src/lib/validations.ts
    - scripts/guard-no-hard-delete.cjs
    - scripts/verify-schema.cjs
    - package.json

key-decisions:
  - "`concluida_em` nasce NULL e sem DEFAULT físico (NULL = pendente, D-01) — mesmo idioma de interacoes.updatedAt / leads.stageChangedAt"
  - "`tarefas` é a primeira e única tabela na ALLOWLIST do guard-no-hard-delete (D-08); CODE_PATTERNS/CODE_SQL_PATTERNS ficam intocados — hard-delete de leads segue bloqueado inclusive dentro de tarefa-actions.ts"
  - "verify:schema usa conjunto ESTRITO de colunas para `tarefas` (molde de interacoes, não de leads) — tabela nova não acumula colunas por fase"
  - "Migração manual via better-sqlite3, nunca drizzle-kit (snapshot divergente do banco real desde a Fase 4)"

patterns-established:
  - "Guard ALLOWLIST escopada a UM caminho de arquivo (nunca diretório nem padrão) para exceção de política de exclusão"

requirements-completed: [TAREFA-01]

duration: 12min
completed: 2026-08-29
---

# Phase 12 Plan 01: Fundação de Dados da Agenda de Tarefas Soltas Summary

**Tabela `tarefas` desacoplada de `leads` (sem FK, sem `deletedAt`) criada fisicamente em data/crm.db via migração manual idempotente, com tipos Drizzle, `tarefaSchema` Zod e os gates `verify:schema` (conjunto estrito) e `guard:no-hard-delete` (exceção D-08) cobrindo a nova tabela.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-29T18:38:28Z
- **Completed:** 2026-08-29T18:43:00Z
- **Tasks:** 3
- **Files modified:** 6 (1 criado, 5 modificados) + package.json

## Accomplishments

- Tabela `tarefas` declarada em Drizzle (`src/db/schema.ts`) entre `interacoes` e `configuracoes`: `id`, `descricao` (título, D-06), `data` (timestamp, só dia), `concluidaEm` (nullable sem default, NULL = pendente D-01), `createdAt`, `updatedAt`, mais os índices `tarefas_concluida_em_idx` e `tarefas_data_idx`. Sem FK, sem `deletedAt`, sem `uniqueIndex`.
- `scripts/migrate-tarefas.cjs` criado e **executado contra o banco real**: backup com `wal_checkpoint(TRUNCATE)`, contagem de referência de `leads` (37) antes/depois, `CREATE TABLE` guardado por `sqlite_master`, verificação pós-migração (conjunto estrito de 6 colunas + 2 índices). Idempotência provada em 2ª execução.
- Tipos `Tarefa` / `NewTarefa` (`src/types/index.ts`) e `tarefaSchema` / `tarefaUpdateSchema` / `TarefaFormValues` (`src/lib/validations.ts`) com as mensagens de erro verbatim do 12-UI-SPEC.md ("Descreva a tarefa." / "Escolha uma data.").
- `verify-schema.cjs` estende `requiredTables` / `requiredIndexes` e ganha bloco de conjunto ESTRITO de colunas de `tarefas` — mutação provada (o gate falha quando a tabela não existe).
- `guard-no-hard-delete.cjs` ganha `src/actions/tarefa-actions.ts` na ALLOWLIST com comentário citando D-08; doc-comment e mensagem de sucesso explicitam que `tarefas` está FORA do escopo protegido. `CODE_PATTERNS` / `CODE_SQL_PATTERNS` intocados.

## Task Commits

1. **Task 1: Declarar a tabela `tarefas` no schema, os tipos e o `tarefaSchema`** - `d498f97` (feat)
2. **Task 2 [BLOCKING]: Criar e RODAR `scripts/migrate-tarefas.cjs`** - `caee98e` (feat)
3. **Task 3: Estender `guard-no-hard-delete.cjs` (exceção D-08) e `verify-schema.cjs`** - `e32a78a` (feat)

**Plan metadata:** _(este commit)_

## Files Created/Modified

- `src/db/schema.ts` - Declaração Drizzle de `tarefas` (sem FK, sem deletedAt) + doc-comment citando D-01/D-06/D-08
- `scripts/migrate-tarefas.cjs` - Migração manual idempotente via better-sqlite3 (backup + wal_checkpoint + CREATE TABLE guardado + verificação estrita)
- `src/types/index.ts` - Tipos `Tarefa` / `NewTarefa`
- `src/lib/validations.ts` - `tarefaSchema` / `tarefaUpdateSchema` / `TarefaFormValues`
- `scripts/guard-no-hard-delete.cjs` - ALLOWLIST com exceção D-08 de `tarefas`
- `scripts/verify-schema.cjs` - Gate de conjunto estrito de colunas de `tarefas`
- `package.json` - Script `migrate:tarefas`

## Migração — registro de execução (exigido pelo `<output>` do plano)

**Arquivo de backup gerado (1ª execução):** `data/crm.db.backup-2026-08-29T18-40-55-511Z` (gitignored — `data/` fora do versionamento)
Backup adicional da 2ª execução: `data/crm.db.backup-2026-08-29T18-41-04-680Z`

**1ª execução (`npm run migrate:tarefas`):**
```
[migrate-tarefas] backup criado em ...data/crm.db.backup-2026-08-29T18-40-55-511Z
[migrate-tarefas] tabela tarefas criada (+ 2 índices)
[migrate-tarefas] OK: tabela tarefas com 6 colunas e 2 índices, 37 leads intactos (antes=37)
```

**2ª execução (prova de idempotência):**
```
[migrate-tarefas] backup criado em ...data/crm.db.backup-2026-08-29T18-41-04-680Z
[migrate-tarefas] tabela tarefas já existe — pulando CREATE (idempotência)
[migrate-tarefas] OK: tabela tarefas com 6 colunas e 2 índices, 37 leads intactos (antes=37)
```

**Confirmação: nenhum comando `drizzle-kit` (push/generate) foi usado.** Toda a DDL foi escrita à mão e aplicada via `better-sqlite3`, conforme a regra dura do projeto.

## Verificação

Todos os gates rodados em SEQUÊNCIA (host 4GB), exit 0:

1. `npx tsc --noEmit` → exit 0
2. `npm run migrate:tarefas` → exit 0 (2x, idempotência confirmada)
3. `npm run verify:schema` → exit 0, saída menciona `tarefas`
4. `npm run guard:no-hard-delete` → exit 0
5. Teste de mutação de `verify-schema` (banco temp sem `tarefas`) → gate falha corretamente ("OK: gate detecta ausencia de tarefas")
6. Checagem estrutural do guard: `tarefa-actions.ts` presente na ALLOWLIST, `tarefas` ausente de CODE_PATTERNS/CODE_SQL_PATTERNS
7. Checagem direta no banco: `concluida_em` nullable (`notnull=0`) e sem default (`dflt_value=null`)

## Decisions Made

None além das já registradas no frontmatter `key-decisions` — plano executado conforme escrito.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **12-02** (Server Actions + `groupByUrgency<T>` + harnesses) desbloqueado: a tabela `tarefas` está viva no banco, os tipos e schemas estão exportados, e `src/actions/tarefa-actions.ts` já está pré-autorizado na ALLOWLIST do guard para o hard-delete de D-08.
- Nenhum blocker.

## Self-Check: PASSED

- `src/db/schema.ts` — FOUND (contém `export const tarefas`)
- `scripts/migrate-tarefas.cjs` — FOUND
- `scripts/verify-schema.cjs` — FOUND (contém `tarefas`)
- `scripts/guard-no-hard-delete.cjs` — FOUND (contém `tarefa-actions.ts`)
- Commit `d498f97` — FOUND
- Commit `caee98e` — FOUND
- Commit `e32a78a` — FOUND
- Tabela `tarefas` em data/crm.db — FOUND (6 colunas, 2 índices, `concluida_em` nullable sem default)

---
*Phase: 12-agenda-tarefas-soltas*
*Completed: 2026-08-29*
