---
quick_id: 260828-gna
slug: corrigir-deadlock-drag-perdido
created: 2026-08-28
status: complete
relates_to: Fase 11 (11-HUMAN-UAT.md Teste 5)
---

# Quick 260828-gna: Corrigir deadlock ao arrastar card para "Perdido"

## Problema (confirmado no UAT da Fase 11 — Teste 5)

Em `src/components/pipeline-board.tsx`, `handleDragEnd` abre o modal de motivo
da perda com `setMotivoPerdaState({open:true})` DENTRO de
`startTransition(async () => { setOptimisticStage(...); await new Promise(resolve => { ...; setMotivoPerdaState({open:true}) }) })`.

No React 19 esse `setState` de abrir o modal fica preso na transição async
suspensa que aguarda a `Promise` do modal → **deadlock**: o modal não renderiza
(update preso na transição) → o usuário não responde → a Promise não resolve →
a transição não assenta → **o renderer congela ~30s**. O card fica encalhado em
"Perdido" de forma otimista, sem persistir nem reverter (só reload resolve).

Verificado ao vivo (drag real + MutationObserver): o `<MotivoPerdaDialog open>`
nunca entra no DOM. O caminho `/leads` (Etapa → Perdido) funciona porque usa
render condicional síncrono.

## Fix

Tirar a abertura do modal de dentro da transição async. Novo fluxo para
`newStage === "perdido"`:

1. `handleDragEnd`: NÃO move o card, NÃO entra em `startTransition`. Enfileira
   `{ leadId, leadNome }` em `motivoQueueRef` (dedupe por leadId) e abre o modal
   com update urgente (`setMotivoPerdaState({ open: true, leadNome })`).
2. "Salvar motivo" (`resolveMotivoPerda(motivoPerdaId)`): shift da fila e, para
   o item atual, dispara UMA NOVA `startTransition(async () => { setOptimisticStage({id, stage:"perdido"}); await updateLeadStage(id, "perdido", motivoPerdaId); toast })`.
   Aí sim o card move (otimista) e persiste — sem `await new Promise`, sem deadlock.
   Depois avança a fila (próximo pendente abre o modal, ou fecha).
3. "Cancelar" / Esc / clique-fora (`cancelMotivoPerda`): shift da fila (descarta
   o atual) e avança. O card NUNCA moveu → nada a reverter, sem toast.

Preservado:
- Modal não-dispensável (`MotivoPerdaDialog` já intercepta Esc/clique-fora).
- Fila para múltiplos drags para "Perdido" (CR-02) — agora sem `resolve` fn.
- `toast.success` no sucesso; `toast.error` na falha.
- Drags para etapas != perdido: caminho `startTransition(async)` inalterado.

Mudança de comportamento aceita: o card só aparece em "Perdido" DEPOIS de
"Salvar motivo" (antes aparecia otimista já no drop). É mais seguro — elimina o
risco de card órfão.

## Task 1 — reescrever o fluxo de "Perdido" em pipeline-board.tsx

- files: `src/components/pipeline-board.tsx`
- action:
  - `motivoQueueRef` type → `{ leadId: number; leadNome: string }[]` (sem `resolve`).
  - `handleDragEnd`: adicionar guard `if (lead && lead.stage === newStage) return;`;
    ramo `newStage === "perdido"` → enfileira + abre modal (urgente), `return`;
    ramo geral inalterado (`startTransition(async)` + `setOptimisticStage` + `updateLeadStage(leadId, newStage)` + toast).
  - `resolveMotivoPerda(motivoPerdaId: number)`: shift da fila; para o item,
    `startTransition(async () => { setOptimisticStage({id, stage:"perdido"}); const r = await updateLeadStage(id,"perdido",motivoPerdaId); if (r && "errors" in r) toast.error(...); else toast.success("Lead movido para Perdido."); })`; depois `advanceMotivoQueue()`.
  - `cancelMotivoPerda()`: shift da fila; `advanceMotivoQueue()`.
  - `advanceMotivoQueue()`: `const next = motivoQueueRef.current[0]; setMotivoPerdaState(next ? { open: true, leadNome: next.leadNome } : { open: false });`
  - Atualizar o doc-comment do componente (o parágrafo que descreve o antigo
    fluxo "card move otimista + await Promise").
- verify: `npx tsc --noEmit` limpo; `npm run dev` + drag real no navegador —
  modal "Mover para Perdido" abre, "Cancelar" não move o card, escolher motivo +
  "Salvar motivo" move o card para Perdido e persiste, SEM congelar; drag para
  Contatado/Negociação/Fechado continua funcionando.
- done: arrastar para "Perdido" abre o modal obrigatório e o fluxo save/cancel
  funciona sem deadlock.
