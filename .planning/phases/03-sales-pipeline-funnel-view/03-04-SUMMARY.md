---
phase: 03-sales-pipeline-funnel-view
plan: 04
subsystem: api
tags: [server-actions, drizzle-orm, next-cache, revalidatePath]

# Dependency graph
requires:
  - phase: 03-sales-pipeline-funnel-view (plan 01)
    provides: "stage enum de 5 valores, motivoPerda/stageChangedAt colunas, stageUpdateSchema"
  - phase: 03-sales-pipeline-funnel-view (plan 03)
    provides: "updateLeadStage com o padrão SELECT-then-compare correto (drag-and-drop), espelhado por este plano em updateLead"
provides:
  - "createLead, updateLead e updateLeadStage revalidam AMBOS '/' e '/pipeline' — contagem do board fica ao vivo independente de qual página disparou a mutação"
  - "updateLead grava stageChangedAt via SELECT-then-compare (mesmo padrão de updateLeadStage) — o dropdown de etapa do modal de edição agora aciona o relógio de esfriando, igual ao drag-and-drop"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SELECT-then-compare gating (SELECT stage atual → compara com o novo valor → grava stageChangedAt condicionalmente) replicado em toda action que pode mudar `stage`, não apenas na action dedicada de drag-and-drop"

key-files:
  created: []
  modified:
    - src/actions/lead-actions.ts

key-decisions:
  - "Correção dividida em 2 commits atômicos (um por task do plano), apesar de ambos tocarem a mesma função updateLead — Task 1 aplicou só as revalidatePath adicionais (nenhuma outra lógica), Task 2 aplicou o SELECT-then-compare por cima, preservando granularidade de commit por task mesmo com sobreposição textual"

patterns-established: []

requirements-completed: [PIPE-01, PIPE-03]

# Metrics
duration: 25min
completed: 2026-07-21
---

# Phase 3 Plan 04: Gap Closure (PIPE-01 cache invalidation + PIPE-03 stageChangedAt) Summary

**`src/actions/lead-actions.ts` corrigido: todas as 3 Server Actions de lead agora revalidam `/` e `/pipeline`, e `updateLead` passa a gravar `stageChangedAt` via SELECT-then-compare, fechando os 2 gaps bloqueadores do verificador da Fase 3.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-21 (aprox.)
- **Completed:** 2026-07-21 (aprox.)
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments
- **Gap 1 (PIPE-01) fechado:** `createLead` e `updateLead` agora chamam `revalidatePath("/pipeline")` além de `revalidatePath("/")`; `updateLeadStage` agora chama `revalidatePath("/")` além de `revalidatePath("/pipeline")`. Criar/editar um lead a partir do próprio board (`/pipeline`) — ou da lista (`/`) — atualiza a contagem e os cards da outra tela sem reload manual.
- **Gap 2 (PIPE-03) fechado:** `updateLead` agora faz `SELECT stage FROM leads WHERE id = ? AND deletedAt IS NULL` antes do update (mesmo guard de soft-delete usado no write), compara com `parsed.data.stage`, e só grava `stageChangedAt: new Date()` quando a etapa realmente muda — idêntico ao padrão já correto em `updateLeadStage`. Editar um lead sem mudar a etapa (ex.: só notas) não reinicia o relógio.
- Guard `isNull(deletedAt)` e backstop de FK (`isForeignKeyViolation`) preservados intactos em ambas as actions; `src/lib/validations.ts` não foi tocado, confirmando que `parsed.data.stage` (já existente via `leadSchema`) era suficiente para a comparação.
- Escopo cirúrgico respeitado: `git diff --name-only` entre o commit-base do plano e o HEAD final mostra **apenas** `src/actions/lead-actions.ts` alterado.

## Task Commits

Each task was committed atomically:

1. **Task 1: Revalidar ambos '/' e '/pipeline' em todas as três Server Actions (Gap 1 / PIPE-01)** - `e8158e4` (fix)
2. **Task 2: Persistir stageChangedAt no caminho de edição por formulário (Gap 2 / PIPE-03)** - `3836578` (fix)

## Files Created/Modified
- `src/actions/lead-actions.ts` - `createLead`/`updateLead`/`updateLeadStage` revalidam `/` e `/pipeline`; `updateLead` ganhou SELECT-then-compare para gravar `stageChangedAt` condicionalmente, espelhando `updateLeadStage`

## Decisions Made
- Task 1 e Task 2 tocam a mesma função (`updateLead`), mas foram implementadas e commitadas como dois diffs sequenciais e não sobrepostos (primeiro só as `revalidatePath`, depois só o SELECT-then-compare por cima), para manter um commit por task mesmo havendo proximidade textual — nenhuma mudança de arquitetura, só ordenação de edição.

## Deviations from Plan

None - plan executado exatamente como escrito. Os dois gaps foram fechados espelhando literalmente o padrão já existente em `updateLeadStage`, sem nenhuma mudança de schema, migração ou UI.

## Issues Encountered

- **Ambiente do worktree (herdado, sem impacto no código):** `node_modules/` ausente (gitignored) — resolvido com `npm install` (654 pacotes, ~3min). `./data/crm.db` ausente (gitignored) — copiado do checkout principal para rodar `npm run build` contra dados reais, sem modificar o arquivo original.
- **`revalidatePath` fora de contexto Next.js:** ao escrever um script headless temporário para validar o comportamento de `updateLead` (SELECT-then-compare) contra um SQLite isolado, `revalidatePath()` lança `Invariant: static generation store missing` quando chamado fora de uma requisição real do Next.js. Como essa chamada só ocorre **depois** do `db.update(...)` já ter sido persistido, o script tratou especificamente esse erro (sem mascarar nenhum outro) para poder inspecionar o estado do banco após a chamada. Não é um bug de produção — é uma limitação conhecida de testar Server Actions fora do runtime do Next.js, documentada aqui por transparência. O script (8 asserções: edição sem mudar etapa preserva `stageChangedAt`; edição mudando a etapa atualiza `stageChangedAt` para agora; id inexistente retorna erro; lead soft-deletado retorna erro) passou 100% e foi apagado após o uso, junto com o arquivo SQLite temporário (fora de `./data/`, nunca tocou o banco real).

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- PIPE-01 e PIPE-03 restaurados — Fase 3 (sales-pipeline-funnel-view) agora tem os 3 requisitos (PIPE-01, PIPE-02, PIPE-03) totalmente cobertos, incluindo os 2 gaps bloqueadores encontrados por `03-VERIFICATION.md`.
- `npx tsc --noEmit` limpo e `npm run build` (Next 16, Turbopack) concluído sem erro contra `./data/crm.db` real (copiado do checkout principal para este worktree).
- `<human-check>` do `03-04-PLAN.md` (5 passos de verificação visual/comportamental no navegador) NÃO executado por este executor headless (sem acesso a browser) — substituído por: `tsc`+`build` limpos, greps de aceitação (`revalidatePath("/pipeline")` ×3, `revalidatePath("/")` ×3, `stageChangedAt: new Date()` ×2, `select({ stage: leads.stage })` ×2), e um script headless de comportamento (8 asserções, ver "Issues Encountered") contra SQLite isolado cobrindo especificamente os pontos 4 e 5 do `<human-check>` (Contatado via dropdown fica elegível para "esfriando"; edição sem mudar etapa não altera o relógio). Um `npm run dev` com clique-através real no navegador (pontos 1-3 do `<human-check>`: criar/editar lead no board sem reload, mudar etapa pelo dropdown do modal sem reload, ida-e-volta entre `/` e `/pipeline`) ainda é recomendado antes de considerar a Fase 3 visualmente polida — mesmo padrão de caveat já registrado em 03-01/02/03-SUMMARY.md, nenhum bloqueio técnico conhecido.
- Recomendação do verificador (`03-VERIFICATION.md`) seguida: gaps fechados como plano de gap-closure cirúrgico single-file, não retrabalho estrutural.

---
*Phase: 03-sales-pipeline-funnel-view*
*Completed: 2026-07-21*
