---
created: 2026-09-10T21:21:00.000Z
title: "Desaninhar elementos interativos (cards clicáveis com botão dentro)"
area: geral
priority: "Revisão ui-ux-pro-max item 3 — acessibilidade, fase dedicada (código com UAT das Fases 9-12)"
files:
  - src/components/followup-dashboard.tsx
  - src/components/pipeline-lead-card.tsx
  - src/components/tarefa-card.tsx
---

## Problem

`followup-dashboard.tsx:198` — o card do lead é `role="button" tabIndex={0}`
(com `onClick`/`onKeyDown` para abrir a edição) e **contém** um `<button>` de
WhatsApp, isolado por um `<div onClick={stopPropagation}>`. HTML inválido
(elemento interativo dentro de elemento interativo) — leitor de tela e navegação
por Tab ficam ambíguos. Mesmo padrão provável em `pipeline-lead-card.tsx` e
`tarefa-card.tsx`.

## Solution

TBD. Opção limpa: o card deixa de ser `role="button"`; o **nome do lead** vira o
alvo clicável (um `<button className="text-left">` ou link que abre o dialog),
o resto do card é conteúdo, e o botão de WhatsApp/ações fica como irmão, não
descendente do alvo clicável. Remove os `stopPropagation`. Cuidado: essas telas
têm UAT das Fases 9-12 (dashboard de follow-up, timeline, sequência). Precisa
re-testar clique-para-editar + botão de WhatsApp + teclado. Fase dedicada.
