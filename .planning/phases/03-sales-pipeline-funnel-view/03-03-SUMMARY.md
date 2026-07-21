---
phase: 03-sales-pipeline-funnel-view
plan: 03
subsystem: ui
tags: [dnd-kit, react-19, use-optimistic, server-action, kanban]

# Dependency graph
requires:
  - phase: 03-sales-pipeline-funnel-view (plan 01)
    provides: stageUpdateSchema, stage enum de 5 valores, motivoPerda/stageChangedAt
  - phase: 03-sales-pipeline-funnel-view (plan 02)
    provides: rota /pipeline, pipeline-board.tsx/pipeline-column.tsx/pipeline-lead-card.tsx somente-leitura
provides:
  - updateLeadStage (Server Action) em src/actions/lead-actions.ts
  - drag-and-drop persistente entre as 5 colunas do board (@dnd-kit/core)
  - movimento otimista (useOptimistic) com reversão automática em falha
  - modal opcional/não-bloqueante de motivoPerda ao soltar em Perdido
affects: []

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0 (instalado por decisão de stack travada; SortableContext não usado nesta fase, apenas DndContext/useDraggable/useDroppable)"
  patterns:
    - "PointerSensor com activationConstraint: { distance: 8 } para disambiguar clique-para-editar de início de drag"
    - "useOptimistic + startTransition async com Promise pendente até decisão do modal de motivoPerda — mantém o card visualmente movido enquanto aguarda Pular/Salvar, chamando updateLeadStage uma única vez"

key-files:
  created:
    - src/components/motivo-perda-dialog.tsx
  modified:
    - package.json
    - package-lock.json
    - src/actions/lead-actions.ts
    - src/components/pipeline-board.tsx
    - src/components/pipeline-column.tsx
    - src/components/pipeline-lead-card.tsx

key-decisions:
  - "updateLeadStage é função async de argumentos posicionais (id, stage, motivoPerda?), NÃO ligada a useActionState — chamada direto do startTransition do onDragEnd (RESEARCH.md Open Question 1)"
  - "Ao soltar em Perdido, a transição do useOptimistic fica PENDENTE (Promise não resolvida) até o admin clicar Pular/Salvar motivo no modal — evita chamar updateLeadStage duas vezes e mantém o card visualmente em Perdido durante a espera, sem violar a semântica de revert-on-settle do useOptimistic"

patterns-established:
  - "Promise-resolver-ref (motivoResolverRef) para pausar uma transição React aguardando uma decisão de UI assíncrona (modal), mantendo uma única chamada de Server Action por interação"

requirements-completed: [PIPE-02]

# Metrics
duration: 35min
completed: 2026-07-21
---

# Phase 3 Plan 03: Drag-and-Drop Persistente Summary

**Board Kanban ganha drag-and-drop real via `@dnd-kit/core`: cards se movem entre as 5 colunas de forma otimista (instantânea) e persistem no banco via nova Server Action `updateLeadStage`, com reversão automática em falha, modal opcional de motivo da perda ao soltar em "Perdido", e preservação do clique-para-editar existente — fecha PIPE-02 e completa o valor central da Fase 3.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-21T12:40:00-03:00 (aprox.)
- **Completed:** 2026-07-21T13:15:00-03:00 (aprox.)
- **Tasks:** 2/2
- **Files modified:** 7 (1 novo + 6 modificados)

## Accomplishments
- Checkpoint de legitimidade de pacote (`@dnd-kit/core`/`@dnd-kit/sortable`) já aprovado pelo humano na conversa orquestradora — instalação executada sem re-perguntar, versões `6.3.1`/`10.0.0` confirmadas em `package.json`.
- `updateLeadStage(id, stage, motivoPerda?)` nova em `src/actions/lead-actions.ts`: valida via `stageUpdateSchema`, faz `SELECT` do `stage` atual (guard `isNull(deletedAt)`) antes do `UPDATE`, só grava `stageChangedAt` quando `previousStage !== newStage` (Pitfall 3), grava `motivoPerda` apenas quando presente, `revalidatePath("/pipeline")`.
- `pipeline-column.tsx` ganhou `useDroppable({ id: stage })`; `pipeline-lead-card.tsx` ganhou `useDraggable({ id: lead.id })` mantendo o `onClick` de edição intacto.
- `pipeline-board.tsx`: `DndContext` com `PointerSensor` (`activationConstraint: { distance: 8 }`, Pitfall 4) envolve as colunas; `useOptimistic` mantém uma cópia otimista dos leads; `handleDragEnd` roda dentro de um único `startTransition` async que move o card visualmente, e — quando o destino é "Perdido" — abre `MotivoPerdaDialog` e aguarda (via `Promise` resolvida pelos botões do modal) antes de chamar `updateLeadStage` uma única vez com o motivo (ou `undefined` se "Pular").
- `motivo-perda-dialog.tsx` novo: modal opcional/não-bloqueante (D-04), título "Mover para Perdido", corpo com nome do lead, textarea com placeholder, botões "Pular" (outline) / "Salvar motivo" (teal).
- Toasts de sucesso (`Lead movido para {etapa}.`) e erro (`Não foi possível mover o lead. Tente novamente.`) via `sonner`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Instalar @dnd-kit + Server Action updateLeadStage** - `db412e9` (feat)
2. **Task 2: Wiring de drag-and-drop otimista no board + modal opcional de motivoPerda** - `d30199c` (feat)

## Files Created/Modified
- `package.json` / `package-lock.json` - `@dnd-kit/core@6.3.1` e `@dnd-kit/sortable@10.0.0` em `dependencies`
- `src/actions/lead-actions.ts` - nova `updateLeadStage`, contrato `stageUpdateSchema`, bump condicional de `stageChangedAt`, `revalidatePath("/pipeline")`
- `src/components/pipeline-column.tsx` - `useDroppable({ id: stage })`, highlight leve `isOver`
- `src/components/pipeline-lead-card.tsx` - `useDraggable({ id: lead.id })`, `transform`/`isDragging` para feedback visual, `onClick` de edição preservado
- `src/components/pipeline-board.tsx` - `DndContext`/`PointerSensor`/`useOptimistic`/`startTransition`, orquestração do modal de motivoPerda via promise pendente
- `src/components/motivo-perda-dialog.tsx` (novo) - modal opcional de motivo da perda

## Decisions Made
- **Wiring do modal de motivoPerda via Promise pendente dentro da mesma transição do `useOptimistic`** (não explicitamente descrito assim no plano, mas necessário para a semântica correta do React 19): o plano descrevia "chamar `updateLeadStage` a partir de `onSave`/`onSkip` do modal", o que — se implementado como duas transições separadas (uma só para `setOptimisticStage`, outra disparada pelo clique do modal) — faria o React reverter o card otimista assim que a primeira transição (síncrona) assentasse, ANTES do modal ser respondido, causando um "flash" de volta à coluna original enquanto o modal ainda está aberto. Resolvido mantendo tudo dentro de UM único `startTransition` async: o card move-se otimisticamente, a mesma transição fica pendente aguardando uma `Promise` resolvida pelos botões "Pular"/"Salvar motivo" do modal, e só então `updateLeadStage` é chamado (uma única vez). Efeito observável idêntico ao especificado (card move-se instantaneamente, modal opcional, uma única chamada de persistência), só a mecânica interna de `useOptimistic` foi ajustada para evitar o flash. Documentado aqui como uma correção de comportamento (Regra 1 — bug de UX que o plano não antecipou), não uma mudança arquitetural.
- Reaproveitado `STAGE_OPTIONS`/labels de `etapa-badge.tsx` para o texto do toast de sucesso (`Lead movido para {etapa}.`), evitando uma quarta cópia dos nomes de etapa.

## Deviations from Plan

### Auto-fixed Issues

**1. [Ambiente de execução — sem Rule específica, documentado por transparência] node_modules e `./data/crm.db` ausentes no worktree isolado**
- **Found during:** Setup, antes da Task 1
- **Issue:** Mesmo padrão já documentado em `03-01-SUMMARY.md`/`03-02-SUMMARY.md` — worktree paralelo sem `node_modules/` nem `data/crm.db` (ambos gitignored).
- **Fix:** `npm install` rodado no worktree (instala também `@dnd-kit/core`/`@dnd-kit/sortable` após o checkpoint aprovado); `data/crm.db` copiado (não movido) do repositório principal — já continha as migrações 0001/0002 de 03-01 aplicadas (2 leads em `fechado`, confirmado via leitura direta antes de prosseguir).
- **Files modified:** nenhum arquivo de código; apenas ambiente local do worktree (gitignored, não commitado).
- **Verification:** `npx tsc --noEmit`, `npm run build` e `npx eslint` passaram limpos contra os arquivos novos/modificados; script headless temporário (`scripts/test-update-lead-stage.cjs`, apagado após uso) validou as 11 asserções do bloco `<behavior>` da Task 1 (move válido, stage inválido, id inexistente, soft-delete, gate de `stageChangedAt`, preservação/gravação de `motivoPerda`) contra um SQLite temporário isolado (não tocou `./data/crm.db`).
- **Committed in:** N/A (ambiente, não código-fonte versionado)

**2. [Rule 1 - Bug de UX, ver "Decisions Made" acima] Wiring do modal de motivoPerda ajustado para uma única transição pendente**
- **Found during:** Task 2, implementação do `handleDragEnd`
- **Issue:** A leitura literal do plano ("chamar updateLeadStage a partir de onSave/onSkip do modal") sugeria duas transições separadas, o que causaria reversão prematura do card otimista (flash) antes do modal ser respondido, por causa da semântica de revert-on-settle do `useOptimistic` do React 19.
- **Fix:** Uma única `startTransition` async cobre o movimento otimista + a espera (via `Promise`/ref-resolver) pela decisão do modal + a chamada final de `updateLeadStage` — efeito observável idêntico ao especificado, sem o flash.
- **Files modified:** `src/components/pipeline-board.tsx`
- **Verification:** `npx tsc --noEmit` + `npm run build` limpos; grep confirma `updateLeadStage` chamado dentro de `startTransition` (critério de aceitação do plano) — satisfeito por essa única chamada.
- **Committed in:** `d30199c`

---

**Total deviations:** 2 (1 ambiente de execução sem impacto no código; 1 ajuste de mecânica interna do useOptimistic, mesmo comportamento observável especificado)
**Impact on plan:** Nenhum no comportamento final entregue — todos os `must_haves`/`acceptance_criteria` do plano foram satisfeitos.

## Issues Encountered
Nenhum além dos itens documentados acima em "Deviations from Plan".

## User Setup Required

None - nenhuma configuração de serviço externo necessária. O checkpoint de legitimidade de pacote já havia sido aprovado pelo humano antes da execução desta plan (ver nota no topo do prompt do executor).

**Atenção operacional (herdada, não nova):** o `./data/crm.db` real do checkout principal (fora deste worktree) precisa ter as migrações `0001`/`0002` de 03-01 aplicadas antes de usar o app com o board completo — já sinalizado em `03-01-SUMMARY.md`/`03-02-SUMMARY.md`; nenhuma ação nova pendente desta plan.

## Next Phase Readiness
- PIPE-02 concluído: drag-and-drop funcional com persistência, otimista, reversão automática em falha, modal de motivoPerda opcional, clique-para-editar preservado.
- Fase 3 (sales-pipeline-funnel-view) está funcionalmente completa nas 3 plans (03-01 split de etapa, 03-02 board somente-leitura, 03-03 drag-and-drop) — PIPE-01, PIPE-02 e PIPE-03 todos cobertos.
- `<human-check>` de clique-e-arrasto real em navegador NÃO executado por este executor headless (sem acesso a browser) — substituído por `tsc`+`build`+`eslint`+grep de aceitação+script headless de comportamento contra SQLite temporário isolado, mesmo padrão já usado em 03-01/03-02. Um `npm run dev` com teste manual de arrastar cards entre colunas (incluindo o caso de soltar em Perdido e confirmar o modal opcional, e o caso de falha simulada revertendo o card) ainda é recomendado antes de considerar a fase visualmente polida — nenhum bloqueio técnico conhecido, apenas verificação visual pendente.

---
*Phase: 03-sales-pipeline-funnel-view*
*Completed: 2026-07-21*

## Self-Check: PASSED

All 6 claimed files verified present (`src/components/motivo-perda-dialog.tsx`, `src/actions/lead-actions.ts`, `src/components/pipeline-board.tsx`, `src/components/pipeline-column.tsx`, `src/components/pipeline-lead-card.tsx`, this SUMMARY.md). All 3 commits (`db412e9`, `d30199c`, `f2d061e`) confirmed present via `git log --oneline --all` on this worktree branch.
