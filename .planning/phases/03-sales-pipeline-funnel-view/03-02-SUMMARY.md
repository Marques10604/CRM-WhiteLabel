---
phase: 03-sales-pipeline-funnel-view
plan: 02
subsystem: ui
tags: [nextjs, server-component, react, kanban, date-fns, drizzle]

# Dependency graph
requires:
  - phase: 03-sales-pipeline-funnel-view (plan 01)
    provides: stage enum de 5 valores, colunas motivoPerda/stageChangedAt, stageUpdateSchema, etapa-badge.tsx com 5 cores, lead-form-dialog.tsx com campo motivoPerda
provides:
  - rota /pipeline (Server Component) com fetch de leads ativos + esfriandoLeadIds computado server-side
  - pipeline-board.tsx / pipeline-column.tsx / pipeline-lead-card.tsx (board somente-leitura, 5 colunas, sem @dnd-kit)
  - item de navegação "Pipeline" na sidebar
affects: [03-03-drag-and-drop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Esfriando computado no Server Component (differenceInDays + guard stageChangedAt != null), passado como array de ids para o Client Component — evita recomputar Date.now() no client"
    - "Agrupamento de leads por etapa em memória (Map), sem GROUP BY SQL, usando STAGE_OPTIONS como fonte única de ordem/labels das colunas"

key-files:
  created:
    - src/app/pipeline/page.tsx
    - src/components/pipeline-board.tsx
    - src/components/pipeline-column.tsx
    - src/components/pipeline-lead-card.tsx
  modified:
    - src/components/app-sidebar.tsx

key-decisions:
  - "Board reutiliza STAGE_OPTIONS de etapa-badge.tsx (não duplica labels/ordem das etapas pela terceira vez)"
  - "Card usa role=button + onKeyDown (Enter/Espaço) além de onClick, antecipando acessibilidade de teclado que o drag-and-drop (03-03) vai precisar de qualquer forma"

patterns-established:
  - "Componentes do board (board/column/card) deixados sem qualquer import de @dnd-kit nesta fase, prontos para 03-03 anexar DndContext/useDroppable/useDraggable sem reestruturação"

requirements-completed: [PIPE-01, PIPE-03]

# Metrics
duration: 25min
completed: 2026-07-21
---

# Phase 3 Plan 02: Board Kanban Somente-Leitura Summary

**Rota `/pipeline` com board de 5 colunas fixas (Novo/Contatado/Negociação/Fechado/Perdido), contagem por etapa, indicador "Esfriando" (borda âmbar + ícone Clock) para leads parados 5+ dias em Contatado, e clique-no-card que reabre o modal de edição existente — sem drag-and-drop (03-03).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-21T12:10:00-03:00 (aprox.)
- **Completed:** 2026-07-21T12:35:31-03:00
- **Tasks:** 2/2
- **Files modified:** 5 (4 novos + 1 modificado)

## Accomplishments
- `src/app/pipeline/page.tsx`: Server Component busca leads ativos não-filtrados (`isNull(leads.deletedAt)`, sem filtro de stage/subnicho por D-12) e sub-nichos, computa `esfriandoLeadIds` server-side com `date-fns` `differenceInDays` + guard explícito `stageChangedAt != null` (leads sem stageChangedAt nunca são flagados nem quebram o cálculo).
- Sidebar (`app-sidebar.tsx`) ganha o item "Pipeline" logo após "Leads", sem qualquer mudança na lógica de render genérica existente.
- `pipeline-board.tsx`/`pipeline-column.tsx`/`pipeline-lead-card.tsx`: board completo com 5 colunas derivadas de `STAGE_OPTIONS`, cabeçalho "{etapa} · {contagem}", cards com nome/sub-nicho/follow-up (sem badge de etapa, D-09), indicador "Esfriando" (borda âmbar 2px + ícone `Clock` + texto), coluna vazia com texto muted sem CTA (D-14), rolagem horizontal sem encolher colunas (`min-w-[288px] shrink-0` + `overflow-x-auto`, D-15), clique no card reabre `LeadFormDialog` pré-preenchido reusando o padrão `DialogState` verbatim de `lead-table.tsx`.
- Nenhum `@dnd-kit`/`DndContext`/`useDroppable`/`useDraggable` introduzido — confirmado via grep, drag-and-drop fica inteiramente para 03-03.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rota /pipeline (Server Component) + computação de esfriando server-side + item de nav na sidebar** - `910dfd4` (feat)
2. **Task 2: Componentes do board somente-leitura — PipelineBoard + PipelineColumn + PipelineLeadCard** - `7c92f69` (feat)

## Files Created/Modified
- `src/app/pipeline/page.tsx` - Server Component: fetch leads ativos + sub-nichos, computa `esfriandoLeadIds`, renderiza título "Pipeline" + `PipelineBoard`
- `src/components/pipeline-board.tsx` - Client Component: dialog-state (create/edit), agrupamento por etapa via `STAGE_OPTIONS`, CTA "Novo lead", `LeadFormDialog`
- `src/components/pipeline-column.tsx` - Coluna com cabeçalho `sticky top-0` "{label} · {count}", estado vazio sem CTA, `min-w-[288px] shrink-0`
- `src/components/pipeline-lead-card.tsx` - Card com nome/sub-nicho/follow-up, indicador "Esfriando" condicional (borda âmbar + `Clock`), `onClick` de edição
- `src/components/app-sidebar.tsx` - Item de navegação "Pipeline" adicionado a `NAV_ITEMS`

## Decisions Made
- Card do board recebeu `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Espaço) além do `onClick` simples do plano — pequena adição de acessibilidade de teclado (Rule 2, correção de funcionalidade básica: um card interativo sem suporte a teclado é uma lacuna de acessibilidade), consistente com o fato de que 03-03 (drag-and-drop) vai precisar de foco/teclado de qualquer forma.
- `STAGE_OPTIONS` de `etapa-badge.tsx` usado como única fonte de nomes/ordem das 5 colunas, evitando uma quarta cópia dos labels de etapa no board (já havia uma duplicação conhecida entre `etapa-badge.tsx` e `lead-form-dialog.tsx`, documentada em 03-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] node_modules ausente no worktree isolado**
- **Found during:** Setup, antes da Task 1 (verificação `npx tsc --noEmit`)
- **Issue:** O worktree paralelo não tinha `node_modules/` (gitignored, não veio no `git worktree add`) — `tsc`/`npm run build` não podiam rodar.
- **Fix:** `npm install` rodado dentro do próprio worktree, isolado do repositório principal.
- **Files modified:** nenhum arquivo de código (apenas `node_modules/` local, gitignored).
- **Verification:** `npx tsc --noEmit` e `npm run build` passaram limpos após a instalação.
- **Committed in:** N/A (ambiente, não código-fonte versionado)

**2. [Rule 3 - Blocking] data/crm.db ausente no worktree isolado**
- **Found during:** Task 2, `npm run build` (falhou com "Cannot open database because the directory does not exist" ao coletar dados de `/pipeline` e `/subnichos`)
- **Issue:** `./data/crm.db` é gitignored e não veio no worktree; o build do Next.js executa os Server Components (incluindo `db.select()`) durante a coleta de dados de página, exigindo um banco real presente.
- **Fix:** Copiado (não movido) `data/crm.db` do repositório principal (`C:/Users/Vencedor/Desktop/crm-leads/data/crm.db`) para dentro do worktree — essa cópia já tinha as migrações 0001/0002 de 03-01 aplicadas (confirmado via `PRAGMA table_info` + `SELECT` antes de prosseguir), então nenhuma migração precisou ser rodada novamente.
- **Files modified:** nenhum arquivo de código (apenas `data/crm.db` local do worktree, gitignored, não commitado).
- **Verification:** `npm run build` gerou as 5 rotas estáticas (`/`, `/lixeira`, `/pipeline`, `/subnichos`, `/_not-found`) sem erro; script headless temporário (`scripts/test-pipeline-board.ts`, apagado após uso) confirmou contra o DB real: 2 leads ativos, ambos em `fechado` (0 em `contatado`, portanto 0 esfriando neste dataset), soma das 5 colunas bate com o total de leads ativos.
- **Committed in:** N/A (ambiente, não código-fonte versionado)

---

**Total deviations:** 2 (ambos ambiente de execução do worktree isolado, sem impacto no código entregue)
**Impact on plan:** Nenhum — ambos os itens são pré-requisitos de ambiente (gitignored, não versionados) já documentados como padrão esperado em worktrees isolados (ver nota similar em 03-01-SUMMARY.md). O código entregue é idêntico ao que rodaria no checkout principal.

## Issues Encountered
None além dos 2 itens de ambiente documentados acima em "Deviations from Plan".

## User Setup Required

None - nenhuma configuração de serviço externo necessária. O `./data/crm.db` do checkout principal já está migrado (confirmado nesta sessão via leitura direta do arquivo copiado) — nenhuma ação pendente herdada de 03-01.

## Next Phase Readiness
- Board somente-leitura completo e verificado (`tsc`, `build`, greps de aceitação, script headless contra dados reais) — pronto para 03-03 anexar `DndContext`/`useDroppable`/`useDraggable` a `pipeline-board.tsx`/`pipeline-column.tsx`/`pipeline-lead-card.tsx` sem reestruturação de layout.
- `<human-check>` de clique-em-navegador (item "Pipeline" ativo/teal na sidebar, board renderizado, esfriando visual) NÃO executado por este executor headless (sem acesso a browser) — substituído por `tsc`+`build`+grep+script de dados reais, mesmo padrão já usado em 01-02/01-03/03-01. Um `npm run dev` com clique real na UI ainda é recomendado antes de considerar a fase visualmente polida.
- Nenhum bloqueio conhecido para 03-03.

---
*Phase: 03-sales-pipeline-funnel-view*
*Completed: 2026-07-21*
