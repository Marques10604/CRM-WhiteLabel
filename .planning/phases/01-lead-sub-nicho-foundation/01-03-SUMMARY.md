---
phase: 01-lead-sub-nicho-foundation
plan: 03
subsystem: lead-list-filters
tags: [tanstack-table, base-ui, date-fns, popover, react]

# Dependency graph
requires: [01-02]
provides:
  - "lead-table.tsx totalmente interativo: sort por coluna, filtro (sub-nicho/etapa/intervalo de follow-up) e paginação 25/página, tudo client-side via @tanstack/react-table"
  - "lead-table-toolbar.tsx: toolbar fixa de filtros (D-11) sempre visível acima da tabela"
  - "src/components/ui/popover.tsx: primitivo Base UI Popover, escrito à mão (registry shadcn indisponível neste host por falta de memória)"
  - "STAGE_OPTIONS exportado de etapa-badge.tsx — fonte única de labels de etapa reaproveitável por futuros filtros/formulários"
affects: [01-04-soft-delete-lixeira, phase-3-pipeline-board, phase-4-followup-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "filterFn customizada por coluna (@tanstack/react-table) em vez de Array.filter manual — subnichoNome filtra por row.original.subnichoId (id, não texto), stage por igualdade, followUpDate por intervalo [inicio, fim] com date-fns startOfDay/endOfDay (Pitfall 6, fuso horário)"
    - "DEFAULT_SORTING e FollowUpDateRange centralizados em lead-table-columns.tsx (não em lead-table.tsx) para lead-table-toolbar.tsx poder importá-los sem criar import circular com lead-table.tsx"
    - "Popover Base UI controlado (open/onOpenChange) fechando automaticamente após seleção de data no date-picker de intervalo"
    - "Toda mudança de filtro chama table.setPageIndex(0) no mesmo handler que chama column.setFilterValue — nunca via useEffect implícito"
    - "createTable (API headless do @tanstack/react-table) usado em scripts tsx temporários para verificar sort/filtro/paginação sem precisar de browser — mesmo padrão de 'verificação direta contra a lógica real' do plano 01-02, adaptado para lógica client-side em vez de Server Actions"

key-files:
  created:
    - src/components/lead-table-toolbar.tsx
    - src/components/ui/popover.tsx
  modified:
    - src/components/lead-table.tsx
    - src/components/lead-table-columns.tsx
    - src/components/etapa-badge.tsx

key-decisions:
  - "npx shadcn add popover causou OOM neste host (mesma restrição de memória documentada no contexto da sessão) — popover.tsx foi escrito à mão seguindo exatamente o padrão de dialog.tsx/select.tsx já presentes no repo (Base UI Popover primitives: Root/Trigger/Portal/Positioner/Popup), não uma composição Popover+Command improvisada."
  - "Filtro de sub-nicho compara por subnichoId (número), não por subnichoNome (string) — evita qualquer ambiguidade futura mesmo com o índice único case-insensitive de nome já garantindo unicidade; a coluna usada para setFilterValue continua sendo 'subnichoNome' (é a coluna visível na tabela), mas a filterFn olha row.original.subnichoId."
  - "sortUndefined: 'last' adicionado à coluna followUpDate como código defensivo/forward-looking (Fase 2/CSV) — não é um requisito testável da Fase 1, já que followUpDate é sempre presente (NOT NULL + formulário obrigatório), conforme a Nota de resolução travada no topo do 01-03-PLAN.md."
  - "Botão 'Limpar filtros' sempre visível (não condicionado a haver filtro ativo) — simplifica o estado de UI e facilita verificação/uso, sem contradizer nenhum must_have do plano."

patterns-established:
  - "Column filterFn pode inspecionar row.original inteiro, não só o valor da própria coluna — usado para filtrar por subnichoId a partir da coluna subnichoNome, evitando duplicar uma coluna 'oculta' só para o id."
  - "Verificação headless de lógica @tanstack/react-table via createTable + scripts tsx temporários (apagados após uso) como substituto de human-check de browser para comportamento client-side puro."

requirements-completed: [REMIND-02]

# Metrics
duration: "~25min (Task 1 -> Task 2 commit, sessão contínua)"
completed: 2026-07-21
---

# Phase 1 Plan 3: Lead List Sort, Filters & Pagination Summary

**Tabela de leads totalmente interativa: sort por coluna (default follow-up mais próximo), toolbar fixa com filtro de sub-nicho/etapa/intervalo de follow-up (inclusivo nas duas pontas, resistente a fuso horário) e paginação clássica 25/página — REMIND-02 completo.**

## Performance

- **Duration:** ~25 min de execução ativa (Task 1 → Task 2, sessão única e contínua, sem interrupção por limite de gasto desta vez).
- **Completed:** 2026-07-21
- **Tasks:** 2/2 (Task 1 `728163f`; Task 2 `82b18ae`)
- **Files modified:** 3 modificados (`lead-table.tsx`, `lead-table-columns.tsx`, `etapa-badge.tsx`) + 2 criados (`lead-table-toolbar.tsx`, `ui/popover.tsx`)

## Accomplishments

- **Sort por coluna** (`lead-table.tsx`/`lead-table-columns.tsx`): `getSortedRowModel()` adicionado ao `useReactTable`; cabeçalhos de Nome, Sub-nicho, Etapa e Follow-up são clicáveis via `column.getToggleSortingHandler()`, alternando asc/desc com ícone indicador (`ArrowUp`/`ArrowDown`/`ArrowUpDown`); Telefone permanece não-ordenável (`enableSorting: false`). Sort default (sem interação) é `followUpDate` ascendente — topo da lista é sempre o follow-up mais próximo, conforme must_have do plano.
- **Paginação clássica 25/página** (D-12): `getPaginationRowModel()` + `initialState.pagination.pageSize: 25`; controles "Anterior"/"Próximo" ligados a `table.previousPage()`/`table.nextPage()`, desabilitados nos limites via `getCanPreviousPage()`/`getCanNextPage()`; indicador de página (Label 14px) mostra "Página X de Y".
- **Toolbar fixa de filtros** (`lead-table-toolbar.tsx`, D-11): sempre visível acima da tabela (não colapsável), com três controles ligados a `column.setFilterValue` via a instância `table` recebida por prop:
  - Sub-nicho: `<Select>` single-select populado de `subnichos`, filtrando por `subnichoId` (comparação numérica, não por texto exibido).
  - Etapa: `<Select>` single-select com as 4 etapas fixas, labels vindos de `STAGE_OPTIONS` (agora exportado de `etapa-badge.tsx` — única fonte de verdade para os labels de etapa).
  - Follow-up: dois `<Calendar>` (início/fim) dentro de um novo `<Popover>` (Base UI) cada, com `filterFn` customizada em `followUpDate` que normaliza as bordas com date-fns `startOfDay(início)`/`endOfDay(fim)` antes de comparar — intervalo inclusivo nas duas pontas (`>=` início, `<=` fim), protegendo contra o bug de fuso horário na virada do dia (Pitfall 6).
- **Reset de paginação ao trocar filtro**: cada handler de mudança de filtro (sub-nicho, etapa, início, fim) chama `table.setPageIndex(0)` no mesmo lugar que chama `setFilterValue` — nunca fica preso numa página vazia fora do range após filtrar.
- **Botão "Limpar filtros"**: chama `table.resetColumnFilters()`, zera o estado local dos dois date-pickers, restaura o sort default via `table.setSorting(DEFAULT_SORTING)` (constante compartilhada, movida para `lead-table-columns.tsx` para evitar import circular entre `lead-table.tsx` e `lead-table-toolbar.tsx`) e reseta a página.
- **`ui/popover.tsx` escrito à mão**: `npx shadcn add popover` causou um crash por falta de memória (Fatal Error: Zone Allocation failed) neste host — o componente foi implementado diretamente a partir de `@base-ui/react/popover`, seguindo fielmente o mesmo padrão estrutural de `dialog.tsx`/`select.tsx` já existentes no repo (Root/Trigger/Portal/Positioner/Popup, `data-slot` attrs, mesmas classes de animação `data-open:animate-in`/`data-closed:animate-out`).
- **Estado vazio pós-filtro**: quando os filtros não retornam nenhum lead (mas existem leads cadastrados), a tabela mostra uma linha "Nenhum lead encontrado com os filtros aplicados." em vez de um `<tbody>` vazio — pequena adição de UX (Rule 2) não coberta explicitamente pelo plano, mas necessária para a tabela não parecer quebrada.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sorting + paginação (25/página) na lead-table** — `728163f` (feat)
2. **Task 2: Toolbar fixa de filtros (sub-nicho, etapa, intervalo de follow-up)** — `82b18ae` (feat)

**Checkpoints intermediários de STATE.md** (crash-recovery, não fazem parte da entrega): `3974b6a` (após Task 1), `fc17f42` (após Task 2).

## Files Created/Modified

- `src/components/lead-table.tsx` — adicionado `getSortedRowModel`/`getFilteredRowModel`/`getPaginationRowModel`, estados `sorting`/`columnFilters`, renderiza `<LeadTableToolbar>` e os controles de paginação
- `src/components/lead-table-columns.tsx` — cabeçalhos ordenáveis (`SortableColumnHeader`), `filterFn` por coluna (subnichoNome/stage/followUpDate), `DEFAULT_SORTING` e `FollowUpDateRange` exportados
- `src/components/lead-table-toolbar.tsx` (novo) — toolbar de filtros D-11 completa
- `src/components/ui/popover.tsx` (novo) — primitivo Base UI Popover escrito à mão
- `src/components/etapa-badge.tsx` — `STAGE_OPTIONS`/`Stage` exportados para reuso pela toolbar

## Decisions Made

- **`npx shadcn add popover` indisponível (OOM neste host)** — `popover.tsx` escrito manualmente a partir de `@base-ui/react/popover`, replicando o padrão visual/estrutural dos demais primitivos `ui/*` já gerados pelo CLI em fases anteriores (sem divergência de convenção).
- **Filtro de sub-nicho por id, não por nome exibido** — mais robusto e explícito do que comparar strings, mesmo com o índice único de nome já garantindo unicidade.
- **`DEFAULT_SORTING`/`FollowUpDateRange` movidos para `lead-table-columns.tsx`** — evita import circular entre `lead-table.tsx` (consome a toolbar) e `lead-table-toolbar.tsx` (precisa do sort default para o botão "Limpar filtros").
- **`sortUndefined: 'last'`** adicionado como código defensivo forward-looking (Fase 2/CSV) — não testado nesta fase, conforme a Nota de resolução do próprio plano (`followUpDate` sempre presente na Fase 1).

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de Rule 1-4 durante a execução — o plano foi seguido como escrito, sem bugs a corrigir, sem funcionalidade crítica faltando (além do popover, que é infraestrutura de UI necessária para cumprir literalmente o `<action>` do plano, não uma mudança de escopo) e sem decisão arquitetural em aberto.

### Substituições do `<human-check>` (mesmo padrão já estabelecido em 01-01-SUMMARY.md/01-02-SUMMARY.md)

**Task 1 e Task 2 — `<human-check>` requer `npm run dev` + clique no browser, indisponível para este executor headless.**
- **Substituto:** além do `tsc --noEmit`+`npm run build` (ambos limpos, cobrindo o `<automated>` explícito de cada task), escrevi dois scripts `tsx` temporários (`scripts/tmp-verify-01-03-task1.ts` e `...task2.ts`, nenhum commitado) que usam a API headless `createTable` do próprio `@tanstack/react-table` diretamente contra o `leadTableColumns` real (o mesmo módulo que `lead-table.tsx` importa), com datasets sintéticos:
  - **Task 1** (30 leads sintéticos, ordem de `followUpDate` embaralhada): confirmou página 1 = 25 linhas em ordem ascendente com o follow-up mais próximo no topo, `getPageCount()===2`, página 2 com os 5 leads restantes, `getCanPreviousPage`/`getCanNextPage` corretos nos limites, toggle de sort em Nome produzindo ordens asc/desc diferentes, e coluna Telefone não-ordenável.
  - **Task 2** (10 leads sintéticos, 2 sub-nichos, 4 etapas, 10 dias consecutivos): confirmou filtro de sub-nicho isolado, combinação AND de sub-nicho+etapa, intervalo de follow-up inclusivo nas duas pontas (lead exatamente na data-início e na data-fim ambos entram), resistência a hora tardia do dia via `endOfDay`, intervalo aberto (só início), e "Limpar filtros" restaurando os 10 leads + sort default.
  - Todas as ~35 asserções entre os dois scripts passaram; ambos os arquivos foram apagados logo após a execução (não fazem parte do plano).
- **Recomendação:** um clique-through real em `npm run dev` (abrir `/`, testar os três filtros isoladamente e combinados na UI, arrastar entre páginas, clicar nos cabeçalhos, testar o date-picker de intervalo visualmente, clicar "Limpar filtros") ainda é recomendado antes de considerar a UI polida — as verificações acima cobrem a lógica de dados por trás dos filtros/sort/paginação (a mesma `filterFn`/config que a UI usa), mas não o *rendering* real dos componentes Base UI (Select/Popover/Calendar) no browser.

---

**Total deviations:** 0 auto-fixed (Rule 1-4). 2 human-check substitutions (mesmo padrão dos planos 01-01/01-02), documentadas acima.
**Impact on plan:** Nenhum — plano executado conforme escrito em ambas as tasks; a única adição não-literal (estado vazio pós-filtro) é uma melhoria de UX de baixo risco (Rule 2), não uma mudança de escopo.

## Issues Encountered

- `npx shadcn add popover` travou com "FATAL ERROR: Zone Allocation failed - process out of memory" — consistente com a restrição de memória do host já documentada no contexto desta sessão (motivo de não usar worktrees isolados). Resolvido escrevendo `popover.tsx` manualmente a partir de `@base-ui/react/popover`, sem tentar reinstalar ou usar um pacote alternativo.
- Nenhum outro problema — `npx tsc --noEmit` e `npm run build` passaram limpos na primeira tentativa em ambas as tasks.

## User Setup Required

Nenhum — segue rodando localmente (`npm run dev`), dado em `./data/crm.db` (gitignored).

## Next Phase Readiness

- **Ready:** Lista de leads totalmente operável — criar/editar (01-02), sort/filtro/paginação (01-03). REMIND-02 completo e utilizável fim-a-fim.
- Plano 01-04 (soft-delete/lixeira) pode reaproveitar `EtapaBadge`, `LeadFormDialog` e a mesma configuração de `useReactTable` (`lixeira-table.tsx` reusa o padrão de `lead-table.tsx` com dado filtrado por `isNotNull(deletedAt)`, conforme já mapeado em `01-PATTERNS.md`).
- **Recomendado antes de considerar a UI polida:** um clique-through real em `npm run dev` (ver seção de Deviations acima) — nenhuma execução deste plano teve acesso a browser.
- Nenhum blocker para o plano 01-04.

---
*Phase: 01-lead-sub-nicho-foundation*
*Completed: 2026-07-21*

## Self-Check: PASSED

All 6 claimed files confirmed present on disk (`src/components/lead-table.tsx`, `src/components/lead-table-columns.tsx`, `src/components/lead-table-toolbar.tsx`, `src/components/ui/popover.tsx`, `src/components/etapa-badge.tsx`, this SUMMARY.md). All 4 claimed commit hashes (`728163f`, `82b18ae`, `3974b6a`, `fc17f42`) confirmed present in `git log --oneline --all`.
