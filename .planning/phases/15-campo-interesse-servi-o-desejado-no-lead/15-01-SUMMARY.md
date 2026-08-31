---
phase: 15-campo-interesse-servi-o-desejado-no-lead
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, react-hook-form, server-actions, migration, better-sqlite3]

requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: lead-form-dialog.tsx (form de criar/editar lead), leadBaseSchema, createLead/updateLead
  - phase: 11
    provides: motivoPerdaId — precedente de campo opcional nullable (preprocess vazio->undefined, undefined->null explícito)
provides:
  - Coluna leads.interesse TEXT nullable no schema Drizzle e no banco real (data/crm.db)
  - Campo interesse opcional em leadBaseSchema (trim, max 500 PT-BR, preprocess vazio->undefined), propagando para leadSchema e csvRowSchema
  - scripts/migrate-interesse.cjs — migração aditiva idempotente com backup + WAL checkpoint + verificação de contagem
  - Input "Interesse" opcional no lead-form-dialog.tsx (abaixo do campo Nicho, seção "Negócio")
  - Persistência de interesse em createLead/updateLead (undefined -> null; editar apagando o texto zera para NULL)
  - Gate de presença de leads.interesse em verify-schema.cjs
  - 4 casos automatizados novos em test-lead-actions.cjs
affects: [15-02 (CSV — interesse mapeável no wizard), fase futura de handoff Prospector->CRM]

tech-stack:
  added: []
  patterns:
    - "Campo opcional no lead = nullable no banco + z.preprocess vazio->undefined no Zod + undefined->null explícito na Server Action (2ª ocorrência, após motivoPerdaId)"
    - "Migração aditiva de coluna nullable: ALTER TABLE ADD sem DEFAULT/NOT NULL via script .cjs manual (sem a exigência de DEFAULT que forçou origem_tipo/sequencia_posicao)"

key-files:
  created:
    - scripts/migrate-interesse.cjs
  modified:
    - src/db/schema.ts
    - src/lib/validations.ts
    - src/components/lead-form-dialog.tsx
    - src/actions/lead-actions.ts
    - scripts/verify-schema.cjs
    - scripts/test-lead-actions.cjs
    - package.json

key-decisions:
  - "interesse posicionado logo após nichoId no schema.ts e logo abaixo do campo Nicho no form (D-01/D-07)"
  - "Coluna nullable dispensa DEFAULT no ALTER TABLE — diferente de origem_tipo/sequencia_posicao (D-06)"
  - "LEAD-06 NÃO marcado como Done — a metade CSV do requisito é entregue no plano 15-02"

patterns-established:
  - "Campo de texto livre opcional no lead: schema nullable + preprocess Zod + gravação null explícita + gate em verify-schema.cjs"

requirements-completed: []

duration: 35min
completed: 2026-08-31
---

# Fase 15 Plano 01: Campo "interesse" no lead (formulário + banco) Summary

**Coluna `leads.interesse` TEXT nullable migrada no banco real + campo opcional `interesse` (trim, max 500) em `leadBaseSchema` propagando para `leadSchema`/`csvRowSchema` + `<Input>` "Interesse" no form de lead com persistência null-explícita em `createLead`/`updateLead`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-31T13:58Z (aprox.)
- **Completed:** 2026-08-31T14:05Z
- **Tasks:** 3 de 3
- **Files modified:** 7 (1 criado, 6 modificados)

## Accomplishments

- Coluna `interesse` declarada no schema Drizzle (nullable, sem default, sem índice) com doc-comment de decisão (D-06/D-07)
- Campo `interesse` opcional em `leadBaseSchema` — `z.preprocess` mapeia `""`/`null`/`undefined` para `undefined`, depois `z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()`; propaga automático para `leadSchema` e `csvRowSchema` (fica fora do `.omit()`)
- `scripts/migrate-interesse.cjs` criado e rodado 2x contra `data/crm.db` — 37 leads intactos, coluna TEXT nullable confirmada, idempotência via `PRAGMA table_info`, backup datado em `data/`
- `verify-schema.cjs` cobre a nova coluna (gate de presença, mesmo idioma de `motivo_perda_id`)
- `<Input>` "Interesse" (linha única, nunca `<Textarea>`) abaixo do campo Nicho no `lead-form-dialog.tsx`; `defaultValues.interesse = lead?.interesse ?? ""`
- `createLead`/`updateLead` gravam `interesse: parsed.data.interesse ?? null` — editar apagando o texto materializa `interesse = NULL`
- 4 casos automatizados novos em `test-lead-actions.cjs` (persistência, limpeza para NULL, limite 500 com mensagem PT-BR, `csvRowSchema` sem `interesse`)

## Task Commits

1. **Task 1: Coluna interesse no schema Drizzle + campo no contrato Zod** - `300e176` (feat)
2. **Task 2: [BLOCKING] Script de migração aditiva + gate de schema** - `d3441ce` (feat)
3. **Task 3: Input Interesse no form + persistência nas Server Actions + cobertura** - `fd1c0aa` (feat)

## Files Created/Modified

- `scripts/migrate-interesse.cjs` (novo) - Migração aditiva idempotente `ALTER TABLE leads ADD interesse text`, backup + WAL checkpoint + verificação de contagem antes/depois
- `src/db/schema.ts` - Coluna `interesse: text("interesse")` nullable após `nichoId` + doc-comment de decisão
- `src/lib/validations.ts` - Campo `interesse` opcional em `leadBaseSchema` + doc-comment estendido
- `src/components/lead-form-dialog.tsx` - `<Input id="interesse">` opcional na seção "Negócio" + `defaultValues.interesse`
- `src/actions/lead-actions.ts` - `interesse: parsed.data.interesse ?? null` em `createLead` `.values` e `updateLead` `.set`
- `scripts/verify-schema.cjs` - Gate de presença `leads.interesse` (Fase 15, LEAD-06)
- `scripts/test-lead-actions.cjs` - `ALTER TABLE leads ADD interesse` no bootstrap + Casos 13-16
- `package.json` - Script `migrate:interesse`

## Decisions Made

- **`interesse` posicionado após `nichoId`** no `schema.ts` e **abaixo do campo Nicho** no form — segue D-01/D-07 literalmente.
- **Migração sem `DEFAULT`** — coluna nullable dispensa a exigência do SQLite que forçou `origem_tipo`/`sequencia_posicao` a terem default físico (D-06).
- **`LEAD-06` não marcado como Done** — o requisito inclui "mapeável como coluna no wizard de importação CSV", entregue apenas no plano 15-02. A promoção do requisito fica para 15-02 / `/close-phase`.

## Deviations from Plan

None - plano executado exatamente como escrito.

## Issues Encountered

- **`npm run lint` (repo inteiro) sai com exit 1** — 457 erros pré-existentes não relacionados a esta fase (`@typescript-eslint/no-require-imports` em todos os scripts `.cjs`, `.claude/get-shit-done/`, worktree órfão, falsos-positivos de `react-hooks/refs` em `template-form-dialog.tsx`). Documentado desde a Fase 8 (`deferred-items.md`). Lint com escopo nos arquivos `.ts`/`.tsx` desta fase: **0 erros**. `migrate-interesse.cjs` segue o padrão `require()` idêntico de `migrate-motivos-perda.cjs`/`migrate-tarefas.cjs`/`backfill-origem-tipo.cjs`. Sem regressão introduzida.

## Deferred Issues

- Lint global do repo (exit 1) — pré-existente, fora de escopo (ver acima). Nenhum novo erro introduzido pelos arquivos desta fase.

## Known Stubs

Nenhum. O campo `interesse` está totalmente conectado: form -> `FormData` -> `leadSchema.safeParse` -> insert/update -> banco -> `defaultValues` na reabertura.

## Gates

Todos verdes (rodados em sequência, sem dev server, host 4GB):

- `npx tsc --noEmit` — exit 0
- `npm run verify:schema` — exit 0 (cobre `leads.interesse`)
- `npm run test:lead-actions` — exit 0, 4 casos novos `OK`
- `npm run build` — exit 0 (Turbopack, 44s compile + 25.7s TS, 13 rotas)
- `npx eslint` nos arquivos `.ts`/`.tsx` da fase — 0 erros
- `npm run lint` global — exit 1 (pré-existente, ver Issues Encountered)

## Next Phase Readiness

- Plano 15-02 (CSV) pode rodar: coluna viva em `data/crm.db`, `interesse` já flui para `csvRowSchema`, `mapCsvRows`/`FIELD_CONFIGS`/`EMPTY_MAPPING`/`bulkImportLeads` ainda intocados (escopo do 15-02).
- Human-check (`human_verify_mode: end-of-phase`) pendente: criar/editar lead com "Interesse" preenchido e vazio no navegador.

## Self-Check: PASSED

- Arquivos criados/modificados: todos presentes em disco
- Commits `300e176` / `d3441ce` / `fd1c0aa`: presentes em `git log`

---
*Phase: 15-campo-interesse-servi-o-desejado-no-lead*
*Completed: 2026-08-31*
