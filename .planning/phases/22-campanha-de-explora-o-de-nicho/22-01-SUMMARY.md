---
phase: 22-campanha-de-explora-o-de-nicho
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, server-actions, better-sqlite3]

# Dependency graph
requires:
  - phase: 13-despivo-generico
    provides: "nichos (sqliteTable('subnichos')) e o padrão de divergência nome-lógico/nome-físico (D-01)"
  - phase: 11-metricas-e-motivos-perda
    provides: "molde de Server Action com ActionState homogêneo + nichoExists/isForeignKeyViolation em lead-actions.ts"
provides:
  - "tabela `campanhas` viva em data/crm.db (nicho + oferta + janela + meta + estado)"
  - "coluna `leads.campanhaId` nullable (FK set null)"
  - "tipos Campanha/NewCampanha"
  - "campanhaSchema/campanhaUpdateSchema (Zod, refine de janela)"
  - "createCampanha/updateCampanha/softDeleteCampanha (Server Actions)"
affects: ["22-02 (UI de listagem/criação)", "22-03 (vínculo lead→campanha)", "23 (diagnóstico de IA)", "24 (veredito e Mapa de Nichos)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migração manual .cjs idempotente via better-sqlite3 (nunca drizzle-kit push/generate) para tabela nova + ALTER TABLE ADD COLUMN"
    - "Server Action com nichoExists + isForeignKeyViolation como defesa em profundidade contra FK forjada"

key-files:
  created:
    - src/actions/campanha-actions.ts
    - scripts/migrate-campanhas.cjs
  modified:
    - src/db/schema.ts
    - src/types/index.ts
    - src/lib/validations.ts
    - scripts/verify-schema.cjs
    - package.json

key-decisions:
  - "metaConversao é texto livre (não numérico) — '3 leads fechados' e '10% de resposta' são ambos formatos válidos"
  - "estado não entra em nenhum dos 2 schemas Zod — nasce sempre 'explorando' (default físico), a transição é escopo da Fase 24"
  - "softDeleteCampanha não checa leads vinculados antes de remover — onDelete:set null só age em hard-delete real (nunca disparado), mesmo comportamento já aceito para nichos/motivosPerda"

patterns-established:
  - "campanhaBaseSchema (objeto puro) + .refine de janela (janelaFim > janelaInicio), campanhaUpdateSchema deriva via .extend — nunca cópia paralela de campos"

requirements-completed: [CAMPANHA-01, CAMPANHA-02, CAMPANHA-04]

# Metrics
duration: 15min
completed: 2026-09-05
---

# Phase 22 Plan 01: Contratos e Fundação de Dados da Campanha Summary

**Tabela `campanhas` (nicho + oferta + janela ~90 dias + meta + estado) viva em `data/crm.db` via migração manual idempotente, com tipos, Zod e as 3 Server Actions de CRUD (createCampanha/updateCampanha/softDeleteCampanha).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05T13:20:15Z
- **Completed:** 2026-09-05T13:25:27Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments
- Tabela `campanhas` declarada em `src/db/schema.ts` (nichoId FK restrict, oferta, metaConversao, janelaInicio/janelaFim, estado enum de 4 valores default "explorando", soft-delete, 3 índices), com coluna opcional `leads.campanhaId` (FK set null) + índice
- Migração real `scripts/migrate-campanhas.cjs` rodada 2x contra `data/crm.db` (idempotência confirmada) — 44 leads intactos antes/depois, backup com `wal_checkpoint(TRUNCATE)`, DDL bruto referenciando a tabela física `subnichos` (D-01)
- `scripts/verify-schema.cjs` estendido com conjunto estrito de colunas de `campanhas` + presença de `leads.campanha_id`, exit 0
- 3 Server Actions (`createCampanha`/`updateCampanha`/`softDeleteCampanha`) validando com Zod `safeParse` antes de qualquer escrita, com `nichoExists` + `isForeignKeyViolation` como defesa contra FK forjada

## Task Commits

Each task was committed atomically:

1. **Task 1: Contratos — tabela `campanhas`, coluna `leads.campanhaId`, tipos e Zod** - `912c92a` (feat)
2. **Task 2: [BLOCKING] Migração real de `campanhas` contra data/crm.db + extensão do gate verify-schema** - `211564a` (feat)
3. **Task 3: Server Actions de campanha** - `6ba6df6` (feat)

_Nenhum ciclo TDD — tarefas de tipo `auto` puro (schema/migração/server actions), sem tdd="true" no plano._

## Files Created/Modified
- `src/db/schema.ts` - tabela `campanhas` + coluna `leads.campanhaId` + índice `leads_campanha_id_idx`
- `src/types/index.ts` - tipos `Campanha`/`NewCampanha`
- `src/lib/validations.ts` - `campanhaBaseSchema`/`campanhaSchema`/`campanhaUpdateSchema` + `CampanhaFormValues`
- `scripts/migrate-campanhas.cjs` - migração manual idempotente (CREATE TABLE + ALTER TABLE), rodada de verdade contra `data/crm.db`
- `scripts/verify-schema.cjs` - gate estendido para `campanhas` + `leads.campanha_id`
- `package.json` - script `migrate:campanhas`
- `src/actions/campanha-actions.ts` - `createCampanha`/`updateCampanha`/`softDeleteCampanha`

## Decisions Made
- `metaConversao` como texto livre (não numérico) — decisão já explícita no PLAN.md, preservada sem desvio
- `estado` fora dos schemas Zod de criação/edição — a IA/veredito (Fase 23/24) que vão mudar o estado, não este plano
- Nenhuma decisão nova fora do que o plano já especificava — execução seguiu o contrato `<interfaces>` literalmente (molde de `tarefa-actions.ts`/`lead-actions.ts`)

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `campanhas` está viva em `data/crm.db`, tipada, validada e com Server Actions prontas para consumo
- Plano 22-02 (UI de listagem/criação) e 22-03 (vínculo lead→campanha) podem consumir `createCampanha`/`updateCampanha`/`softDeleteCampanha` e os tipos `Campanha`/`CampanhaFormValues` sem retrabalho de schema
- Nenhum bloqueio conhecido

---
*Phase: 22-campanha-de-explora-o-de-nicho*
*Completed: 2026-09-05*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 3 task commit hashes (912c92a, 211564a, 6ba6df6) confirmed in git log.
