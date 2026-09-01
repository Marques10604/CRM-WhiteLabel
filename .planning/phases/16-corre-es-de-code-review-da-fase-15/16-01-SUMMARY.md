---
phase: 16-corre-es-de-code-review-da-fase-15
plan: 01
subsystem: database
tags: [zod, validation, csv-import, drizzle, sqlite, test-harness]

# Dependency graph
requires:
  - phase: 15-campo-interesse-servi-o-desejado-no-lead
    provides: "coluna leads.interesse, preprocess de interesse em leadBaseSchema, truncamento .slice(0,500) em mapCsvRows, harness test-lead-actions.cjs (19 casos)"
provides:
  - "trim de `interesse` dentro do z.preprocess — só-espaços grava NULL no create e no update (fecha WR-01/FIX-01)"
  - "2 casos automatizados novos em test-lead-actions.cjs cobrindo whitespace-only (create + update)"
  - "corte de `interesse` do CSV por code point (Array.from) em mapCsvRows — não parte par surrogate (fecha IN-02)"
  - "comentário de csv-column-mapper.tsx corrigido para 8 campos fixos (fecha IN-01)"
affects: [16-02, csv-import, lead-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "z.preprocess de string livre nullable faz trim ANTES de decidir vazio->undefined (idioma D-04 'vazio grava NULL, nunca \"\"')"
    - "truncamento defensivo de texto de CSV corta por code point (Array.from().slice().join()), schema server-side segue contando code units (assimetria aceita, D-09)"

key-files:
  created: []
  modified:
    - src/lib/validations.ts
    - scripts/test-lead-actions.cjs
    - src/lib/csv-import.ts
    - src/components/csv-column-mapper.tsx

key-decisions:
  - "Diff de validations.ts mantido mínimo: só o corpo do preprocess de `interesse` mudou; comentário de contrato (linhas 33-40), `.max(500)`, mensagem PT-BR e preprocess de `motivoPerdaId` intocados"
  - "Casos novos do harness numerados 14a/14b (não renumeração dos seguintes) — o harness só imprime a string do check"
  - "Caso 14b cria um lead fresco com `interesse` preenchido antes do update (caminho 'a' do 16-PATTERNS) em vez de reusar interesseLeadId já zerado pelo Caso 14"

patterns-established:
  - "Preprocess de campo opcional de texto livre: trim dentro do preprocess, nunca só no z.string().trim() interno (que não converte '' em undefined)"

requirements-completed: [FIX-01, FIX-03]

# Metrics
duration: 18min
completed: 2026-09-01
---

# Phase 16 Plan 01: Correções de Code Review da Fase 15 (interesse só-espaços + corte CSV) Summary

**O campo `interesse` só-espaços agora grava NULL no create e no update (trim dentro do `z.preprocess`), o truncamento defensivo do CSV corta por code point, e o harness ganhou 2 casos automatizados de whitespace-only.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-01T12:45:00Z (aprox.)
- **Completed:** 2026-09-01T13:03:24Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- **FIX-01 / WR-01 fechado:** `interesse` com entrada só-espaços (`"   "`) agora normaliza para `undefined` no preprocess e a Server Action materializa `null` — nunca mais string vazia no banco, honrando o contrato D-04 repetido ~4× no código. Coberto por 2 casos automatizados (create + update).
- **FIX-03 / IN-02 fechado:** `mapCsvRows` corta `interesse` com `Array.from(...).slice(0, 500).join("")` — corte por code point, nunca parte um par surrogate / emoji na fronteira 499/500. `csvRowSchema.max(500)` (defesa em profundidade server-side) intacto (D-09).
- **FIX-03 / IN-01 fechado:** comentário "7 campos fixos" → "8 campos fixos" em `csv-column-mapper.tsx` (`FIELD_CONFIGS` já tinha 8 entradas; só o comentário mentia).

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Trim dentro do z.preprocess de `interesse`** - `cc3d44c` (fix)
2. **Task 2: Dois casos de whitespace-only em test-lead-actions.cjs** - `8fbca7a` (test)
3. **Task 3: Corte por code point no CSV + comentários "8 campos fixos"** - `17acb77` (fix)

**Plan metadata:** (commit de docs a seguir)

## Files Created/Modified
- `src/lib/validations.ts` - preprocess de `interesse` faz `const s = typeof v === "string" ? v.trim() : v` antes de mapear `"" | null | undefined → undefined`
- `scripts/test-lead-actions.cjs` - Casos 14a (createLead com `"   "` → NULL, ainda cria linha) e 14b (updateLead limpando valor existente com `"   "` → NULL)
- `src/lib/csv-import.ts` - `mapCsvRows`: `interesse` truncado por code point; comentário D-08 adicionado ao bloco D-10
- `src/components/csv-column-mapper.tsx` - comentário: "nenhum dos 7 campos fixos" → "8"

## Decisions Made
- Diff de `validations.ts` limitado ao corpo do preprocess (verificação #4 do plano) — comentário de contrato não reescrito.
- Casos do harness nomeados 14a/14b para não perturbar a numeração dos Casos 15-19.
- Caso 14b usa lead fresco com `interesse` preenchido (caminho robusto "a" do 16-PATTERNS).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `git status` mostrou `.planning/STATE.md` modificado antes do início das tasks (mudança do orquestrador marcando "execution started") — deixado fora dos commits de task, tratado no passo de state updates.
- `grep -c 'Array.from' src/lib/csv-import.ts` retorna 2 (uma ocorrência no comentário novo + uma no código) — esperado, não é regressão.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. Zero dependência nova, zero migração de schema.

## Next Phase Readiness
- Gates automatizados verdes: `npx tsc --noEmit` exit 0, `npm run test:lead-actions` exit 0 (21 casos de comportamento, os 2 novos verdes, Caso 19 intacto), `npm run verify:schema` exit 0.
- `npm run build` deliberadamente fora deste plano — fechado no plano 16-02 (Task 3), junto com WR-02 (coluna `interesse` na prévia do CSV) e IN-03 (backup do `migrate-interesse.cjs`).
- Nenhum blocker.

## Self-Check: PASSED

- FOUND: src/lib/validations.ts (preprocess com `v.trim() : v`)
- FOUND: scripts/test-lead-actions.cjs (Casos 14a/14b, `grep -c '"   "'` = 6)
- FOUND: src/lib/csv-import.ts (`Array.from(readMapped(row, "interesse")).slice(0, 500).join("")`)
- FOUND: src/components/csv-column-mapper.tsx ("8 campos fixos", 0 ocorrências de "7 campos fixos")
- FOUND: commit cc3d44c
- FOUND: commit 8fbca7a
- FOUND: commit 17acb77

---
*Phase: 16-corre-es-de-code-review-da-fase-15*
*Completed: 2026-09-01*
