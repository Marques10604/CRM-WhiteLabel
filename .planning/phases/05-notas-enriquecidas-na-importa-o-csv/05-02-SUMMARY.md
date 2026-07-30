---
phase: 05-notas-enriquecidas-na-importa-o-csv
plan: 02
subsystem: ui
tags: [react, wizard, csv, controlled-components]

# Dependency graph
requires:
  - phase: 05-01
    provides: "CsvExtraNotasColumns e mapCsvRows(rows, mapping, extraNotasColumns?) em src/lib/csv-import.ts, retrocompatíveis"
provides:
  - "Seção 'Colunas extras para notas (opcional)' no passo 2 do wizard (src/components/csv-column-mapper.tsx), 100% controlada por props"
  - "Resumo ao vivo 'Serão concatenadas: a → b → c' derivado de headers.filter(...) (ordem do arquivo, D-08)"
  - "extraNotasColumns transportado pelo WizardState (mapping e preview) em src/components/csv-import-wizard.tsx, sobrevivendo a 'Voltar ao mapeamento'"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derivação de unmappedHeaders/mappedHeaders recalculada a cada render (sem useMemo) para refletir mudanças de Select instantaneamente (Pitfall 4)"

key-files:
  created: []
  modified:
    - src/components/csv-column-mapper.tsx
    - src/components/csv-import-wizard.tsx

key-decisions:
  - "handleToggleExtraColumn espelha handleFieldChange byte a byte — nenhum useState interno introduzido, componente segue 100% controlado"
  - "Resumo ao vivo usa headers.filter(h => extraNotasColumns.includes(h)).join(' → '), nunca extraNotasColumns.join/map — ordem do arquivo, não ordem de clique (D-08)"

patterns-established:
  - "Seção condicional 'hide quando vazio' (unmappedHeaders.length > 0) sem heading próprio, reaproveitando o container rounded-lg bg-[#F4F4F5] p-6 já existente"

requirements-completed: [IMPORT-04, IMPORT-05]

# Metrics
duration: 25min
completed: 2026-07-30
---

# Phase 5 Plan 2: UI de Colunas Extras no Wizard de Importação Summary

**Seção de checkboxes "Colunas extras para notas (opcional)" com resumo ao vivo na ordem do arquivo CSV, adicionada ao passo 2 do wizard (`csv-column-mapper.tsx`) e transportada pelo `WizardState` (`csv-import-wizard.tsx`) até `mapCsvRows` de 3 parâmetros do plano 05-01 — fechando IMPORT-04/IMPORT-05 ponta a ponta (motor + UI).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-30T01:04:00Z (aprox.)
- **Completed:** 2026-07-30T01:24:32Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- `csv-column-mapper.tsx` ganhou a seção opcional de checkboxes (D-01 a D-04) listando toda coluna do CSV ainda não usada em nenhum dos 7 campos fixos, com resumo ao vivo "Serão concatenadas: ..." (D-08/D-09), sem heading próprio e sem mensagem de vazio (D-03)
- `csv-import-wizard.tsx` transporta `extraNotasColumns` pelos passos `mapping`/`preview` do `WizardState`, passa para `mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns)` e preserva a seleção explicitamente em `handleBackToMapping`
- `canContinue` do mapper e a coluna "Notas" da tabela de prévia permanecem intocados — CSV simples continua funcionando sem nenhuma interação nova (SC #3/IMPORT-05)
- Escopo da fase inteira (05-01 + 05-02) verificado contido em exatamente 4 arquivos de código (`src/lib/csv-import.ts`, `scripts/verify-notas-concat.cjs`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-wizard.tsx`)
- `npm run build` limpo com a rota `/importar` presente; dev server religado em `http://localhost:3000` para a checagem humana

## Task Commits

Each task was committed atomically:

1. **Task 1: Seção de checkboxes + resumo ao vivo no mapper e estado no wizard** - `4f84520` (feat)
2. **Task 2: Guardas de regressão de escopo + verificação integrada da fase** - sem código novo (task puramente de verificação — harness/escopo/build confirmados, nenhum arquivo alterado, nada para commitar)

**Plan metadata:** _pendente — commit final desta etapa_

## Files Created/Modified
- `src/components/csv-column-mapper.tsx` - adiciona props `extraNotasColumns`/`onExtraNotasColumnsChange`, deriva `unmappedHeaders` a cada render, renderiza a seção de checkboxes + resumo ao vivo
- `src/components/csv-import-wizard.tsx` - adiciona `EMPTY_EXTRA_NOTAS_COLUMNS`, campo `extraNotasColumns` em `WizardState` (mapping/preview), `handleExtraNotasColumnsChange`, e passa o 3º parâmetro para `mapCsvRows`

## Decisions Made
- `handleToggleExtraColumn` espelha `handleFieldChange` (mesmo idioma de toggle imutável), sem `useState` interno — componente segue 100% controlado pelo wizard, igual ao `mapping` já existente
- Resumo ao vivo deriva SEMPRE de `headers.filter(h => extraNotasColumns.includes(h))`, nunca de `extraNotasColumns.join/map` — garante ordem do arquivo CSV mesmo se o admin marcar checkboxes fora de ordem (D-08)
- Nenhuma mudança em `csv-import-preview-table.tsx` — a coluna "Notas" continua só renderizando `row.notas` via `accessorKey`, sem recomputar nada (invariante do 05-PATTERNS.md preservado)

## Deviations from Plan

None - plan executado exatamente como escrito.

### Itens documentados (não corrigidos, fora de escopo)

**1. `npm run lint` continua falhando por regras pré-existentes, não relacionadas a este plano**
- **Encontrado durante:** verify da Task 1 (`npm run lint`)
- **Descrição:** mesmo padrão já documentado em `05-01-SUMMARY.md` — 476 problemas pré-existentes espalhados por `subnicho-manager.tsx`, `template-form-dialog.tsx`, `whatsapp-preview-dialog.tsx` (regras `react-hooks/set-state-in-effect`/`react-hooks/refs`), nenhum deles nos 2 arquivos desta task. `npx eslint src/components/csv-column-mapper.tsx src/components/csv-import-wizard.tsx` isolado retorna apenas 2 warnings pré-existentes ("Unused eslint-disable directive") no `csv-import-wizard.tsx`, ambos já presentes antes desta task (blocos `useEffect`/`useMemo` não tocados por este plano).
- **Ação:** nenhuma — fora de escopo (Rule "scope boundary": não corrigir pré-existente não relacionado à task atual).
- **Impacto:** nenhum nos critérios de aceite deste plano (`npx tsc --noEmit` e as asserções de fonte, que são as garantias reais de correção aqui, saem limpos).

---

**Total deviations:** 0 auto-fixed; 1 item documentado como pré-existente/fora de escopo (lint, mesmo item já registrado em 05-01)
**Impact on plan:** Nenhum — `tsc`, harness de 10 cenários, guarda de escopo e `npm run build` todos verdes.

## Issues Encontrados
Nenhum. `tsc --noEmit` limpo na primeira tentativa; o harness `verify-notas-concat.cjs` do 05-01 continuou verde sem nenhuma mudança no motor.

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- IMPORT-04 e IMPORT-05 marcados como concluídos em `REQUIREMENTS.md` — motor (05-01) e UI (05-02) entregues ponta a ponta
- `<human-check>` da Task 2 (7 passos: seção de checkboxes, resumo ao vivo, prévia com notas concatenadas, "Voltar ao mapeamento" preservando seleção, convivência com mapeamento 1-pra-1, CSV simples, seção sumindo quando tudo mapeado) **não foi executado nesta sessão** — sem acesso a navegador, mesma limitação de todas as sessões anteriores deste projeto (ver `STATE.md` Deferred Items). Dev server está rodando em `http://localhost:3000/importar`, pronto para o admin percorrer os 7 passos descritos na Task 2 do `05-02-PLAN.md` antes de considerar a Fase 5 pronta para uso real com o CSV do cowork.
- Fase 5 (IMPORT-04/IMPORT-05) está com código completo e verificado por build/tsc/harness; falta apenas a confirmação visual do admin no navegador.

---
*Phase: 05-notas-enriquecidas-na-importa-o-csv*
*Completed: 2026-07-30*

## Self-Check: PASSED

- FOUND: src/components/csv-column-mapper.tsx
- FOUND: src/components/csv-import-wizard.tsx
- FOUND: .planning/phases/05-notas-enriquecidas-na-importa-o-csv/05-02-SUMMARY.md
- FOUND: commit 4f84520 (Task 1)
