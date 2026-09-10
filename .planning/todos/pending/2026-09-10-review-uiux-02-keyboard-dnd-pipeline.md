---
created: 2026-09-10T21:20:00.000Z
title: "Pipeline: drag-and-drop acessível por teclado"
area: pipeline
priority: "Revisão ui-ux-pro-max item 2 — acessibilidade, fase dedicada (mexe em interação testada)"
files:
  - src/components/pipeline-board.tsx
---

## Problem

`pipeline-board.tsx` registra só `PointerSensor` no `DndContext`. Mover um lead
de etapa pelo teclado só é possível abrindo o dialog de edição (campo `stage`
Select). Não há caminho de teclado no próprio board. A revisão ui-ux-pro-max
marca isso como acessibilidade (`gesture-alternative` / keyboard-alternative
for drag-and-drop).

## Solution

TBD. Padrão `@dnd-kit`: adicionar `KeyboardSensor` (com
`coordinateGetter: sortableKeyboardCoordinates` do `@dnd-kit/sortable`, que já é
dep do projeto) ao `useSensors`. Cuidado alto: o board teve o bug de deadlock ao
soltar em "Perdido" (quick 260828-gna) — o fluxo de teclado precisa passar pelo
mesmo caminho "enfileira + abre modal, não move o card" quando o destino é
"Perdido". Precisa de UAT no navegador (o host de 4GB não roda navegador +
agente juntos — verificação humana). Fase dedicada, não quick.
