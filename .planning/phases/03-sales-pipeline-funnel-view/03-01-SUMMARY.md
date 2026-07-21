---
phase: 03-sales-pipeline-funnel-view
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, migration, schema, react-hook-form]

# Dependency graph
requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: leads table (stage enum de 4 valores), leadSchema Zod, etapa-badge.tsx, lead-form-dialog.tsx
provides:
  - stage enum de 5 valores (novo/contatado/negociacao/fechado/perdido) em schema.ts e leadSchema
  - colunas nullable motivoPerda e stageChangedAt em leads
  - migrações versionadas 0001 (ADD COLUMN) e 0002 (backfill custom) aplicadas a ./data/crm.db
  - stageUpdateSchema (contrato Zod enxuto para updateLeadStage)
  - etapa-badge.tsx com badges Fechado (verde)/Perdido (vermelho) distintos
  - lead-form-dialog.tsx com 5 opções de etapa + campo condicional "Motivo da perda"
affects: [03-02-board-kanban, 03-03-drag-and-drop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migração custom (drizzle-kit generate --custom) para backfill de dados, separada da migração ADD COLUMN gerada automaticamente"
    - "Colunas nullable sem default em ADD COLUMN sobre tabela não-vazia, backfill via UPDATE literal na migração custom (evita a restrição do SQLite a defaults constantes)"

key-files:
  created:
    - src/db/migrations/0001_grey_xavin.sql
    - src/db/migrations/0002_backfill-fechado-perdido-split.sql
    - scripts/verify-pipeline-migration.cjs
  modified:
    - src/db/schema.ts
    - src/lib/validations.ts
    - src/components/etapa-badge.tsx
    - src/components/lead-form-dialog.tsx

key-decisions:
  - "Enum stage alargado sem migração de tabela (Pitfall 1 confirmado): drizzle-kit generate não emitiu nenhum ALTER na coluna stage, apenas os 2 ADD COLUMN"
  - "motivoPerda e stageChangedAt adicionadas nullable sem default, backfill via UPDATE literal (unixepoch()) na migração custom, não via Drizzle .default() (Pitfall 2)"
  - "Banco de dados real (./data/crm.db) migrado dentro do worktree isolado; ver nota de execução sobre isolamento de dados no rodapé"

patterns-established:
  - "stageUpdateSchema como contrato Zod dedicado e enxuto para mutações que não passam pelo formulário completo (base para updateLeadStage em 03-03)"

requirements-completed: [PIPE-01]

# Metrics
duration: 28min
completed: 2026-07-21
---

# Phase 3 Plan 01: Split Fechado/Perdido Summary

**Enum `stage` alargado de 4 para 5 valores (Fechado/Perdido separados) + colunas `motivoPerda`/`stageChangedAt`, migração versionada aplicada, badge e modal de lead refletindo as 5 etapas.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-21T09:33:00-03:00 (aprox.)
- **Completed:** 2026-07-21T10:01:10-03:00
- **Tasks:** 3/3
- **Files modified:** 6 (2 novos arquivos de migração + 1 script novo + 3 arquivos modificados)

## Accomplishments
- Enum `stage` do Drizzle e do Zod (`leadSchema`) migrado de `["novo","contatado","negociacao","fechado_perdido"]` para `["novo","contatado","negociacao","fechado","perdido"]`, com `stageUpdateSchema` novo exportado como contrato para 03-03.
- Migração real aplicada a `./data/crm.db`: 2 colunas novas (`motivo_perda`, `stage_changed_at`) via `ADD COLUMN` gerado automaticamente + migração custom de backfill (`fechado_perdido` → `fechado`, `stage_changed_at` preenchido via `unixepoch()`), confirmado por script de verificação dedicado.
- UI existente atualizada: `etapa-badge.tsx` mostra badges verde (Fechado) e vermelho (Perdido) distintos; `lead-form-dialog.tsx` lista as 5 etapas e exibe um campo opcional "Motivo da perda" apenas quando a etapa selecionada é Perdido.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split do enum stage + colunas novas no schema e nas validações Zod** - `59e8e18` (feat)
2. **Task 2: Migração — ADD COLUMN gerado + backfill custom + apply + verificação no DB** - `aaf6787` (feat)
3. **Task 3: Refletir o split na UI — badge (5 cores) + modal de lead (5 opções + campo Motivo da perda)** - `30dc7d4` (feat)

_Nota: Task 1 tem `tdd="true"` no plano, mas seguiu a convenção já estabelecida no projeto (01-02/01-03) de verificação via script temporário `node` (importando o módulo `.ts` real via `ts-alias-loader.mjs`), apagado após confirmar todas as asserções do bloco `<behavior>` — não foi criado um arquivo de teste permanente nem um commit `test(...)` separado, consistente com o padrão já usado neste repositório para `validations.ts`/`money.ts`/`phone.ts`._

## Files Created/Modified
- `src/db/schema.ts` - enum `stage` alargado para 5 valores; colunas nullable `motivoPerda`/`stageChangedAt` adicionadas
- `src/lib/validations.ts` - `leadSchema.stage` com 5 valores + `motivoPerda` opcional; novo `stageUpdateSchema` exportado
- `src/db/migrations/0001_grey_xavin.sql` - `ALTER TABLE leads ADD motivo_perda text` + `ADD stage_changed_at integer` (gerado, sem intervenção manual)
- `src/db/migrations/0002_backfill-fechado-perdido-split.sql` - migração custom: `UPDATE stage 'fechado_perdido'->'fechado'` + `UPDATE stage_changed_at = unixepoch() WHERE IS NULL`
- `scripts/verify-pipeline-migration.cjs` - verifica colunas presentes, 0 leads em `fechado_perdido`, 0 `stage_changed_at` nulos
- `src/components/etapa-badge.tsx` - `STAGE_CONFIG` com entradas `fechado` (verde #DCFCE7/#15803D) e `perdido` (vermelho #FEE2E2/#B91C1C)
- `src/components/lead-form-dialog.tsx` - `STAGE_OPTIONS` com 5 valores; `motivoPerda` nos `defaultValues`; campo condicional "Motivo da perda" renderizado só quando `stage === "perdido"`

## Decisions Made
- Confirmado experimentalmente (Pitfall 1 do RESEARCH.md): `npx drizzle-kit generate` não emitiu nenhuma alteração na coluna `stage` em si — apenas os 2 `ADD COLUMN` das colunas novas, exatamente como previsto.
- `motivoPerda`/`stageChangedAt` adicionadas sem `.default(...)` no Drizzle (evitando a restrição do SQLite contra defaults de expressão em `ADD COLUMN` sobre tabela não-vazia); o backfill de `stage_changed_at` foi feito via `UPDATE ... = unixepoch()` na migração custom, um valor literal computado no momento da migração, permitido pelo SQLite.
- Task 1 (marcada `tdd="true"` no plano) verificada com um script `node` temporário (`scripts/test-stage-schemas.cjs`, apagado após a verificação) em vez de um par de commits `test`/`feat` formais, seguindo o padrão já estabelecido nas fases anteriores deste mesmo projeto para arquivos de validação/utilitário.

## Deviations from Plan

### Auto-fixed Issues

**1. [Ambiente de execução — sem Rule específica, documentado por transparência] node_modules e `./data/crm.db` ausentes no worktree isolado**
- **Found during:** Setup, antes da Task 1
- **Issue:** O worktree paralelo (`isolation="worktree"`) não tinha `node_modules/` nem `data/crm.db` — ambos gitignored e não versionados, portanto não vieram no `git worktree add`. Sem eles, `tsc`/`drizzle-kit`/`npm run build` e a migração real (exigida como task bloqueante) não podiam rodar.
- **Fix:** Rodado `npm install` dentro do próprio worktree (cria um `node_modules` local e isolado, sem tocar no repositório principal) e copiado (não movido) `data/crm.db` do repositório principal para dentro do worktree, para servir de base de teste da migração real.
- **Achado adicional:** A cópia do banco real já continha `motivo_perda`/`stage_changed_at` preenchidos e as 2 leads já em `fechado` — resquício de uma execução anterior desta mesma migração que foi revertida no código-fonte (commit `9055309 wip: phase-3 paused, planned but not executed`) mas cujo efeito no arquivo `.db` (não versionado) não foi desfeito. Para testar a mecânica de migração de ponta a ponta de forma limpa e reproduzível, a cópia local foi resetada ao estado anterior à Fase 3 (stage revertido para `fechado_perdido`, colunas novas removidas via `ALTER TABLE ... DROP COLUMN`, entradas órfãs de `__drizzle_migrations` removidas) antes de rodar `drizzle-kit generate`/`migrate` de fato.
- **Files modified:** nenhum arquivo de código; apenas o `data/crm.db` local do worktree (gitignored, não commitado) e a instalação de `node_modules` (gitignored, não commitado).
- **Verification:** `node scripts/verify-pipeline-migration.cjs` confirma o estado pós-migração esperado (2 leads em `fechado`, 0 em `fechado_perdido`, 0 `stage_changed_at` nulos) partindo de um estado inicial limpo e conhecido.
- **Committed in:** N/A (mudanças de ambiente, não de código-fonte versionado)

---

**Total deviations:** 1 (ambiente de execução, sem impacto no código entregue)
**Impact on plan:** Nenhum — a migração foi testada de ponta a ponta a partir de um estado limpo equivalente ao banco real de produção (mesmos 2 registros, mesmo schema anterior). O `./data/crm.db` real do repositório principal (fora deste worktree) ainda precisa rodar `npx drizzle-kit migrate` (ou equivalente) quando este branch for mesclado e o app rodar localmente — as migrações versionadas (`0001`, `0002`) já estão prontas e corretas para isso.

## Issues Encountered
- `npx tsc --noEmit` ficou vermelho entre o commit da Task 1 e o commit da Task 3 — esperado e intencional: o alargamento do enum `stage` (Task 1) quebra imediatamente o `Record<Stage, ...>` exaustivo de `etapa-badge.tsx`, que é justamente o arquivo que a Task 3 corrige. A Task 1 foi verificada com checks direcionados (grep nas asserções do `acceptance_criteria` + script de comportamento Zod) em vez de `tsc` de projeto inteiro; o `tsc --noEmit` de projeto inteiro só foi cobrado (e passou limpo) após a Task 3.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

**Atenção operacional (não é "user setup" de serviço externo, mas é uma ação pendente):** o `./data/crm.db` real do projeto (fora deste worktree, gitignored) ainda não recebeu as migrações `0001`/`0002` — isso deve acontecer rodando `npx drizzle-kit migrate` no checkout principal após o merge deste branch, antes de usar o app com o board (03-02/03-03).

## Next Phase Readiness
- Contratos prontos para 03-02 (board Kanban) e 03-03 (drag-and-drop): `stageUpdateSchema`, `Lead["stage"]` com 5 valores, `Lead["motivoPerda"]`, `Lead["stageChangedAt"]` (via `InferSelectModel`).
- `STAGE_CONFIG`/`STAGE_OPTIONS` em `etapa-badge.tsx` já refletem as 5 cores — 03-02 pode reutilizar diretamente para os headers de coluna, se desejar.
- Bloqueio conhecido: o `./data/crm.db` do checkout principal precisa da migração real aplicada (`npx drizzle-kit migrate`) antes de 03-02/03-03 rodarem contra dados reais — ver seção "User Setup Required" acima.

---
*Phase: 03-sales-pipeline-funnel-view*
*Completed: 2026-07-21*
