---
phase: quick-260912-nmw
plan: 01
subsystem: ui
tags: [nextjs, react, tailwind, sidebar, navigation, a11y]

# Dependency graph
requires:
  - phase: 25-tutorial-guiado
    provides: "5 seletores [data-tour=\"nav-*\"] em src/lib/tour-steps.ts que a sidebar precisa continuar expondo"
provides:
  - "Sidebar reorganizada em 4 seções rotuladas (Principal, Prospecção, Operação, Configuração) sobre os mesmos 12 itens"
  - "npm run verify:sidebar — guarda permanente do contrato tourId/href/grupos da sidebar"
affects: [app-sidebar, tour-guiado, verify-scripts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NAV_GROUPS: NavGroup[] (array de { label, items }) no lugar de uma lista plana NAV_ITEMS, mesmo NavItem inalterado"
    - "Guarda .cjs provada por teste de mutação em cópia temporária (os.tmpdir()) com override de caminho via env var — mesmo idioma de scripts/verify-origem-tipo.cjs"

key-files:
  created: [scripts/verify-sidebar-nav.cjs]
  modified: [package.json, src/components/app-sidebar.tsx]

key-decisions:
  - "Container de cada grupo (<div aria-labelledby>) envolve o rótulo <p> E os links, com className flex flex-col gap-[3px] único — plano pedia um único container por grupo, não um wrapper aninhado extra só para os links"
  - "Id do grupo derivado via slugifyGroupLabel (normalize NFD + remove diacríticos + lowercase), nunca exibido, só para o par id/aria-labelledby"

patterns-established:
  - "Guardas .cjs de contrato de UI aceitam override de caminho via env var (ex.: SIDEBAR_NAV_PATH) para viabilizar teste de mutação sem nunca escrever no arquivo real"

requirements-completed: [QUICK-260912-nmw]

# Metrics
duration: ~13min
completed: 2026-09-12
---

# Quick Task 260912-nmw: Reorganizar sidebar em seções Summary

**Sidebar do CRM reagrupada de 12 itens em lista corrida para 4 seções rotuladas (Principal/Prospecção/Operação/Configuração), com guarda automatizada `verify:sidebar` que trava os 5 seletores do tour guiado e o inventário fechado de 12 hrefs.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-09-12T20:00:46Z (aprox.)
- **Completed:** 2026-09-12T20:13:18Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Sidebar navegável por 4 seções de intenção em vez de 12 itens soltos no mesmo nível
- Guarda permanente (`npm run verify:sidebar`) que reprova qualquer regressão futura nos 5 `tourId` do tour guiado (Fase 25) ou no inventário de 12 hrefs
- Zero item perdido, zero tela inventada, zero pacote novo, zero cor hardcoded nova

## Task Commits

Each task was committed atomically:

1. **Task 1: Sensor do contrato da sidebar (nasce VERMELHO por construção)** - `160d44b` (test)
2. **Task 2: Agrupar os 12 itens em 4 seções na sidebar** - `395f64e` (feat)

**Plan metadata:** commit final feito pelo orquestrador (fora do escopo deste executor)

## Files Created/Modified
- `scripts/verify-sidebar-nav.cjs` - Guarda estrutural: cruza os 5 seletores de `tour-steps.ts` com os `tourId` da sidebar, trava os 12 hrefs esperados (contagem exata), checa os 4 rótulos de grupo e as preservações de rodapé/marca (`<ThemeToggle`, `mt-auto`, `SOLO`)
- `package.json` - Script `verify:sidebar` registrado
- `src/components/app-sidebar.tsx` - `NAV_ITEMS` (lista plana) virou `NAV_GROUPS: NavGroup[]` (4 grupos); rótulo de seção movido para dentro do `<nav>`, um `<p id=...>` por grupo com container `aria-labelledby` correspondente; lógica de item ativo, ícones, `data-tour`, header de marca e `ThemeToggle` do rodapé inalterados

## Decisions Made
- Container de grupo único (`<div aria-labelledby>` com `flex flex-col gap-[3px]`) envolve rótulo + links, seguindo a instrução literal do plano, em vez de um wrapper aninhado extra só para os links
- Id do grupo (`nav-group-<slug>`) derivado de `label.normalize("NFD")` + remoção de diacríticos + lowercase — determinístico, nunca exibido
- Guarda `verify-sidebar-nav.cjs` aceita override de caminho via `SIDEBAR_NAV_PATH` (mesmo idioma de `ORIGEM_TIPO_IMPORT_ACTIONS_PATH` em `verify-origem-tipo.cjs`) para o teste de mutação nunca escrever no arquivo real

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

None.

## Verification Executada

- `npm run verify:sidebar` → exit 0 (RED confirmado na Task 1 só com violações de grupo; GREEN confirmado na Task 2 com os 3 contratos + grupos)
- Teste de mutação: cópia de `app-sidebar.tsx` em `os.tmpdir()` com `tourId: "nav-pipeline"` removido → guarda reprova (exit 1) contra a cópia via `SIDEBAR_NAV_PATH`, e continua passando (exit 1 só por grupo ausente, esperado na Task 1) contra o arquivo real intacto — confirmado por `git status --short` não listar `app-sidebar.tsx` como modificado até a Task 2
- `npm run verify:theme` → exit 0
- `npm run verify:brand` → exit 0 (112 arquivos varridos, zero cor hardcoded nova)
- `npx tsc --noEmit` → limpo
- `npm run lint` → exit 0 (4 warnings pré-existentes de React Compiler em `csv-import-preview-table.tsx`/`lead-form-dialog.tsx`/`lead-table.tsx`/`lixeira-table.tsx`, não relacionados a esta mudança, fora de escopo)
- `grep -c 'href: "' src/components/app-sidebar.tsx` → `12`
- Verificação visual: `npm run dev` subiu limpo, HTML renderizado no servidor confirmado via `curl` contendo os 4 rótulos de grupo e os 5 `data-tour="nav-*"` esperados; servidor encerrado logo em seguida (host 4GB RAM, evitar processo residual)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Sidebar agrupada e guarda automatizada prontas. Nenhum bloqueio para as próximas quick tasks da fila (surfacing de timeline/veredito, temperatura de lead, busca global).

---
*Phase: quick-260912-nmw*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: scripts/verify-sidebar-nav.cjs
- FOUND: src/components/app-sidebar.tsx
- FOUND: verify:sidebar script em package.json
- FOUND: commit 160d44b
- FOUND: commit 395f64e
