---
phase: 05-notas-enriquecidas-na-importa-o-csv
plan: 01
subsystem: import
tags: [csv, papaparse, typescript, pure-function]

# Dependency graph
requires:
  - phase: 02-csv-bulk-import
    provides: "mapCsvRows/CsvColumnMapping/CSV_DEFAULTS em src/lib/csv-import.ts, motor de mapeamento client-side"
provides:
  - "CsvExtraNotasColumns (tipo irmão de CsvColumnMapping) exportado de src/lib/csv-import.ts"
  - "buildNotasText() — função pura de concatenação de notas (D-05 a D-10) exportada e testável isoladamente"
  - "mapCsvRows() com 3º parâmetro opcional extraNotasColumns (default []), retrocompatível"
  - "scripts/verify-notas-concat.cjs — harness repetível de 10 cenários comportamentais contra o código real"
affects: [05-02-wizard-checkboxes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Harness .cjs que transpila e avalia o TypeScript real via typescript.transpileModule + new Function (sem test runner, sem dependência nova)"
    - "Fallback de default aplicado sobre o RESULTADO FINAL concatenado, nunca sobre um valor intermediário isolado"

key-files:
  created:
    - scripts/verify-notas-concat.cjs
  modified:
    - src/lib/csv-import.ts

key-decisions:
  - "Fallback CSV_DEFAULTS.notas aplicado depois de buildNotasText(), nunca antes (evita a regressão do Pitfall 1)"
  - "csvHeaderOrder derivado internamente de Object.keys(rows[0] ?? {}) dentro de mapCsvRows — nunca recebido como parâmetro externo (Pitfall 3)"
  - "S8 do harness usa uma célula cujo valor é o próprio nome do header ('observacao') para contar ocorrências e provar dedup, já que o header deduplicado nunca aparece como rótulo no texto de notas"

patterns-established:
  - "buildNotasText(row, mapping, extraColumns, csvHeaderOrder): string — função pura sem throw, string vazia é retorno válido"

requirements-completed: [IMPORT-04, IMPORT-05]

# Metrics
duration: 35min
completed: 2026-07-30
---

# Phase 5 Plan 1: Motor de Concatenação de Notas Summary

**Função pura `buildNotasText` + `mapCsvRows` de 3 parâmetros em `csv-import.ts`, com o fallback `CSV_DEFAULTS.notas` movido para depois da concatenação (corrigindo a regressão do Pitfall 1) e provado por um harness `.cjs` de 10 cenários rodando contra o código-fonte real via `typescript.transpileModule`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-30T00:59:16Z
- **Completed:** 2026-07-30T01:10:08Z
- **Tasks:** 2/2
- **Files modified:** 2 (+ 1 doc de itens fora de escopo)

## Accomplishments
- `src/lib/csv-import.ts` ganhou o tipo `CsvExtraNotasColumns`, a função pura `buildNotasText` (D-05 a D-10) e `mapCsvRows` de 3 parâmetros com fallback aplicado sobre o resultado final — o motor está pronto para o plano 05-02 (wizard + checkboxes) consumir
- `scripts/verify-notas-concat.cjs` prova os 10 cenários (D-05 a D-11 + Pitfalls 1/4/5) num único comando repetível (`node scripts/verify-notas-concat.cjs`), sem instalar nenhuma dependência nova e sem criar cópia da lógica — carrega o arquivo real

## Task Commits

Each task was committed atomically:

1. **Task 1: Tipo CsvExtraNotasColumns + buildNotasText + mapCsvRows de 3 parâmetros** - `73c8431` (feat)
2. **Task 2: Harness de verificação comportamental (10 cenários) contra o código real** - `e34b889` (test)

**Plan metadata:** _pendente — commit final desta etapa_

## Files Created/Modified
- `src/lib/csv-import.ts` - adiciona `CsvExtraNotasColumns`, `buildNotasText`, e estende `mapCsvRows` para 3 parâmetros com fallback corrigido
- `scripts/verify-notas-concat.cjs` - harness de 10 cenários comportamentais (S1-S10) rodando contra o código real via `typescript.transpileModule`

## Decisions Made
- Fallback `CSV_DEFAULTS.notas` aplicado sobre `concatenatedNotas` (resultado de `buildNotasText`), nunca sobre o valor bruto de `readMapped(row, "notas")` — elimina a regressão central identificada no Pitfall 1 do `05-RESEARCH.md`
- `csvHeaderOrder` calculado uma única vez, internamente, a partir de `Object.keys(rows[0] ?? {})` dentro de `mapCsvRows` — nenhuma segunda fonte de ordem de colunas foi introduzida (Pitfall 3)
- Cenário S8 do harness usa uma célula cujo VALOR é literalmente o nome do header (`observacao`) e conta ocorrências da string no resultado combinado (`origem + notas`) — expõe a duplicação de forma binária (1 = dedup correto, 2 = bug) em vez de depender de `.includes()`, que não distinguiria os dois casos

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio Rule 1-3 durante a implementação em si — o código de `buildNotasText`/`mapCsvRows` seguiu o Pattern 2 do `05-RESEARCH.md` linha a linha e todos os 10 cenários do harness passaram na primeira execução.

### Itens documentados (não corrigidos, fora de escopo)

**1. `npm run lint` falha por regras pré-existentes, não relacionadas a este plano**
- **Encontrado durante:** verify final da Task 2 (`npm run lint`)
- **Descrição:** O comando varre o repositório inteiro (sem ignores em `eslint.config.mjs` para `scripts/**`/`.claude/**`) e já falhava antes deste plano por: (a) o diretório `.claude/get-shit-done/` (ferramenta GSD, não código do projeto) cheio de `require()` CommonJS; (b) a regra `@typescript-eslint/no-require-imports` já falhando em scripts `.cjs` pré-existentes, incluindo `scripts/guard-no-hard-delete.cjs` — o próprio precedente de estilo que este plano foi instruído a seguir; (c) regras `react-hooks/set-state-in-effect`/`react-hooks/refs` já documentadas como pré-existentes em `.planning/quick/260725-lai-.../deferred-items.md`
- **Ação:** `scripts/verify-notas-concat.cjs` segue o MESMO padrão `require()` do precedente — 3 ocorrências da mesma regra pré-existente, nenhuma categoria nova de erro. `src/lib/csv-import.ts` (único arquivo de produção tocado) foi verificado isoladamente (`npx eslint src/lib/csv-import.ts`) e está limpo.
- **Detalhes completos:** ver `.planning/phases/05-notas-enriquecidas-na-importa-o-csv/deferred-items.md`

---

**Total deviations:** 0 auto-fixed; 1 item documentado como pré-existente/fora de escopo (lint)
**Impact on plan:** Nenhum — `npx tsc --noEmit`, o harness de 10 cenários e as asserções de fonte (regressão do Pitfall 1 impossível de reintroduzir sem quebrar S4) passam limpos. `npm run lint` nunca esteve limpo neste repositório antes deste plano.

## Issues Encountered
Nenhum — todos os 10 cenários do harness passaram já na primeira execução, confirmando que o trace manual da lógica de `buildNotasText` (feito durante a escrita do harness) estava correto.

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- `CsvExtraNotasColumns` e `mapCsvRows(rows, mapping, extraNotasColumns?)` estão prontos e retrocompatíveis para o plano 05-02 (wizard + seção de checkboxes + resumo ao vivo D-09) consumir sem alterações de assinatura
- Nenhum bloqueio conhecido; `git diff --stat` desta plano toca exatamente `src/lib/csv-import.ts` e `scripts/verify-notas-concat.cjs`, como exigido pela seção `<verification>` do plano
- `npm run build` continua reservado para o 05-02 (dev server ativo em `localhost:3000` neste host de 4GB, conforme nota de ambiente do plano)
- **IMPORT-04/IMPORT-05 permanecem `Pending` em `REQUIREMENTS.md`** (não marcados como concluídos por este plano) — o próprio 05-01-PLAN.md rotula seus success criteria como "metade motor"; o 05-02-PLAN.md declara os MESMOS dois IDs no frontmatter para a metade UI (checkboxes + resumo ao vivo). Marcar as checkboxes de `REQUIREMENTS.md` fica para o executor de 05-02, quando o admin efetivamente conseguir usar a funcionalidade fim-a-fim.

---
*Phase: 05-notas-enriquecidas-na-importa-o-csv*
*Completed: 2026-07-30*

## Self-Check: PASSED

- FOUND: src/lib/csv-import.ts
- FOUND: scripts/verify-notas-concat.cjs
- FOUND: .planning/phases/05-notas-enriquecidas-na-importa-o-csv/05-01-SUMMARY.md
- FOUND: commit 73c8431 (Task 1)
- FOUND: commit e34b889 (Task 2)
