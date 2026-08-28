---
quick_id: 260828-gna
slug: corrigir-deadlock-drag-perdido
date: 2026-08-28
status: complete
relates_to: Fase 11 (11-HUMAN-UAT.md Teste 5)
---

# Quick 260828-gna — SUMMARY

## O que foi feito

`src/components/pipeline-board.tsx` reescrito para o fluxo de "Perdido":

1. **Nova função `commitStageChange(leadId, newStage, motivoPerdaId?)`** — encapsula
   `startTransition(async () => { setOptimisticStage(...); await updateLeadStage(...); toast })`.
   É a única `startTransition(async)` do componente e só aguarda `updateLeadStage`
   (server action que sempre resolve).

2. **`handleDragEnd`**:
   - Guard novo: `if (lead && lead.stage === newStage) return;` (soltar na própria coluna = no-op).
   - Ramo `newStage === "perdido"`: **não move o card, não entra em transição**. Só
     enfileira `{ leadId, leadNome }` em `motivoQueueRef` (dedupe por id) e abre o modal
     com `setMotivoPerdaState({ open: true, leadNome })` — update **urgente**, fora de
     qualquer transição. `return`.
   - Ramo geral (novo/contatado/negociacao/fechado): `commitStageChange(leadId, newStage)`.

3. **`resolveMotivoPerda(motivoPerdaId)`** ("Salvar motivo"): `shift` da fila e, para o
   item, `commitStageChange(current.leadId, "perdido", motivoPerdaId)` — **aqui** o card
   move (otimista) e persiste. Depois `advanceMotivoQueue()`.

4. **`cancelMotivoPerda()`** ("Cancelar"/Esc/clique-fora): `shift` da fila e
   `advanceMotivoQueue()`. O card nunca moveu → nada a reverter, sem toast.

5. **`advanceMotivoQueue()`**: abre o modal para o próximo pendente da fila, ou fecha.

6. `motivoQueueRef` type: `{ leadId, leadNome }[]` (removido o `resolve` fn).

7. Doc-comment do componente atualizado explicando por que o modal NÃO é aberto de
   dentro de uma transição async (deadlock).

## Por que isso corrige o deadlock

Antes: `setMotivoPerdaState({open:true})` dentro de
`startTransition(async () => { setOptimisticStage(...); await new Promise(nunca_resolve_até_o_modal) })`.
No React 19 o update de abrir o modal ficava preso na transição suspensa → o modal
nunca renderizava → o usuário não respondia → a Promise não resolvia → renderer congelava.

Agora não existe nenhum caminho onde uma transição aguarda algo que depende de um render
bloqueado por essa própria transição. A abertura do modal é um `setState` urgente síncrono
num event handler comum. O deadlock é estruturalmente impossível.

Efeito colateral positivo: o card só aparece em "Perdido" DEPOIS de "Salvar motivo"
(antes aparecia otimista já no drop, com risco de ficar órfão). Mais seguro.

## Verificação

- `npx tsc --noEmit` — exit 0 (limpo).
- Bundle do cliente (`fetch` dos chunks servidos pelo `npm run dev`): `commitStageChange`
  presente, padrão antigo `motivoPerdaId = await new Promise` **ausente** → o novo código
  está sendo servido.
- **Drag ao vivo NÃO re-testado nesta sessão**: a captura de tela da extensão de navegador
  quebrou no meio da sessão (`CDP clip.scale` + viewport 0x0), impedindo interação por
  coordenadas. O `/leads` (Etapa → Perdido) já provou o modal + combobox + persistência
  na rodada anterior do UAT. **Recomendado: 1 drag manual humano para confirmar** que o
  modal abre, Cancelar não move o card, Salvar move+persiste, sem freeze.

## Arquivos

- `src/components/pipeline-board.tsx` (~+40 −45)
