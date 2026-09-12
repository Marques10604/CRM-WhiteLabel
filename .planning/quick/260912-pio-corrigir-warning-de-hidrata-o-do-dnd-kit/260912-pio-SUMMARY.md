---
phase: quick-260912-pio
plan: 01
subsystem: ui
tags: [dnd-kit, hydration, react, pipeline]

# Dependency graph
requires:
  - phase: 03 (pipeline-board com drag-and-drop)
    provides: DndContext raiz de /pipeline com sensors + handleDragEnd já implementados
provides:
  - id literal estável no DndContext raiz de /pipeline, eliminando a fonte de divergência SSR/cliente do aria-describedby gerado pelo dnd-kit
affects: [pipeline-board.tsx, futuras mudanças na tela /pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/components/pipeline-board.tsx

key-decisions:
  - "id=\"pipeline-board\" como string literal hardcoded (não useId/contador/random), conforme fix documentado pelo próprio dnd-kit para esta classe de warning de hidratação"

patterns-established: []

requirements-completed: [HYDR-01]

# Metrics
duration: ~10min
completed: 2026-09-12
---

# Quick Task 260912-pio: Corrigir warning de hidratação do dnd-kit em /pipeline Summary

**Adicionado `id="pipeline-board"` literal ao `<DndContext>` raiz de `/pipeline`, eliminando a divergência SSR/cliente no `aria-describedby` gerado internamente pelo `useUniqueId` do `@dnd-kit/core`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-12 (sessão de quick task)
- **Completed:** 2026-09-12T21:28:15Z
- **Tasks:** 1 completa
- **Files modified:** 1

## Accomplishments
- `<DndContext>` de `src/components/pipeline-board.tsx` agora recebe `id="pipeline-board"`, string literal, estabilizando a geração de ids de acessibilidade do dnd-kit entre o render do servidor e a hidratação do cliente.
- Doc-comment do componente atualizado com a justificativa do `id` (obrigatório e literal), sem reescrever o histórico do deadlock do modal de "Perdido" já documentado.
- Zero mudança de comportamento: `sensors`, `onDragEnd`, `handleDragEnd`, `commitStageChange`, `useOptimistic`, a fila de motivo-perda e os 4 diálogos (`LeadFormDialog`, `MotivoPerdaDialog`, `WhatsAppPreviewDialog`, `LeadTimelineDialog`) permanecem intocados.

## Task Commits

Each task was committed atomically:

1. **Task 1: id estável no DndContext de /pipeline** - `76efac1` (fix)

**Plan metadata:** commit de documentação a cargo do orquestrador (SUMMARY.md/STATE.md não commitados por este executor)

## Files Created/Modified
- `src/components/pipeline-board.tsx` - `<DndContext>` recebeu `id="pipeline-board"` literal; doc-comment do componente ganhou frase explicando o motivo do id fixo

## Decisions Made
- `id="pipeline-board"` escolhido como string literal hardcoded, não `useId()` do React nem qualquer valor derivado — conforme regra rígida do plano (regra a), o valor precisa ser constante e visível via grep de verificação.

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

Nenhum. `npx tsc --noEmit` limpo, `npm run lint` passou com exit 0 (4 warnings pré-existentes de `react-hooks/incompatible-library` em arquivos não relacionados: `csv-import-preview-table.tsx`, `lead-form-dialog.tsx`, `lead-table.tsx`, `lixeira-table.tsx` — dívida técnica já conhecida, fora do escopo desta tarefa), `npm run build` concluiu com sucesso (15 rotas, Turbopack). Grep filtrado de comentários confirmou `id="pipeline-board"` presente (1 ocorrência) e `onDragEnd={handleDragEnd}` preservado (1 ocorrência). `git diff --name-only` confirmou que apenas `src/components/pipeline-board.tsx` foi alterado (6 inserções, 1 deleção).

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Verificação humana — Concluída (parcial)

Orquestrador conectou o navegador (Claude in Chrome) contra `npm run dev` real:

1. Restaurou temporariamente o lead 17 (único jeito de ter um card real em `/pipeline` pra montar o `DndContext` com um item arrastável) — revertido pra Lixeira logo depois.
2. Navegou pra `/pipeline` duas vezes (força reload/hidratação real) e leu o console via `read_console_messages` com padrão amplo (`.`).
3. **Resultado: 12 mensagens de console capturadas, nenhuma de erro/warning de hidratação** — só logs normais de dev (`[HMR] connected`, `[Fast Refresh] rebuilding/done`, aviso padrão do React DevTools). Nenhuma menção a `aria-describedby`, `DndDescribedBy` ou "hydrated but some attributes...". ✅ Confirmado que o fix resolveu o warning.
4. **Não testado nesta passada:** arrastar um card entre colunas (incluindo pra "Perdido") — captura de screenshot ficou instável na sessão (erros de CDP timeout/0-width), então a confirmação visual do drag-and-drop em si fica como dívida residual mínima. Risco muito baixo: a mudança foi só a prop `id`, `onDragEnd`/`sensors` intocados e confirmados via grep.

## Next Phase Readiness

Correção pontual e isolada; nenhum bloqueio para trabalho futuro em `/pipeline`. Fila de quick tasks avulsas continua (sidebar reorganizado, surfacing de timeline/veredito, busca global).

---
*Phase: quick-260912-pio*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: src/components/pipeline-board.tsx
- FOUND: 76efac1
- FOUND: SUMMARY.md
