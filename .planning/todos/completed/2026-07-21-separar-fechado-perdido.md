---
created: 2026-07-21T03:30:00.000Z
title: Separar Fechado e Perdido em duas etapas distintas
area: general
files:
  - .planning/phases/01-lead-sub-nicho-foundation/01-CONTEXT.md
  - .planning/ROADMAP.md
---

## Problem

O admin pediu (durante uso do app na fase 01) para separar a etapa combinada
"Fechado/Perdido" em duas etapas distintas — "Fechado" (ganho) e "Perdido"
(perda) — para ter uma noção melhor de quantos leads realmente fecharam
negócio vs. quantos foram perdidos, em vez de um valor único genérico.

**Atenção — conflita com decisão já travada:** a decisão `D-10` em
`01-CONTEXT.md` diz explicitamente: *"Fechado/Perdido remains a single etapa
value, exactly as locked in SPEC.md/ROADMAP.md — not split into two separate
stages."* O ROADMAP.md (Fase 1 e Fase 3) também descreve o pipeline como "4
fixed stages (Novo, Contatado, Negociação, Fechado/Perdido)". Ou seja, isso
não é só uma feature nova — é uma mudança que desfaz uma decisão já
implementada (enum do banco, badges, filtros, board da Fase 3).

## Solution

TBD — precisa de uma decisão explícita do admin antes de implementar, porque:
- Muda o enum `stage` no schema Drizzle (migração de dados dos leads já
  cadastrados com `fechado_perdido`).
- Afeta `etapa-badge.tsx` (STAGE_OPTIONS), filtros da lead-table-toolbar,
  e o board de Kanban da Fase 3 (que hoje assume 4 colunas fixas).
- Se aprovado, o ROADMAP.md e o `01-CONTEXT.md` (D-10) precisam ser
  atualizados para refletir 5 etapas em vez de 4.

Levantar essa decisão explicitamente ao planejar/discutir a Fase 3 (board
Kanban), já que ela toca diretamente as colunas do board.
