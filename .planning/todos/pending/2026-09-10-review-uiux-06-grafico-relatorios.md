---
created: 2026-09-10T21:23:00.000Z
title: "/relatorios: visualização (gráfico) além das tabelas numéricas"
area: relatorios
priority: "Revisão ui-ux-pro-max item 6 — é feature, entra num milestone"
files:
  - src/app/relatorios/page.tsx
---

## Problem

`/relatorios` é 100% tabela numérica. O core value do CRM é *"enxergar o funil de
vendas de relance"* — e uma tabela de números não é "de relance". Uma barra
horizontal para "leads por nicho" ou uma barra-funil (Novo → Contatado →
Negociação → Fechado) entregaria o olhar rápido que a tabela não dá.

O `@tanstack/react-table` está no stack recomendado (CLAUDE.md) mas sem uso; os
tokens `--chart-1..5` existem no `globals.css` (escala de cinza) sem uso.

## Solution

TBD — é feature, não fix. Decisões abertas:
- **Lib de chart:** nenhuma instalada. Candidatos: Recharts, ou SVG/CSS na mão
  (barras horizontais simples não precisam de lib e evitam bundle + dep nova —
  alinhado com "low-maintenance / solo"). O `dataviz` skill tem guidance.
- **O que visualizar:** funil de etapas (mais alinhado ao core value), conversão
  por nicho, ou leads por origem ao longo do tempo.
- **Acessibilidade:** manter a tabela como alternativa textual (a11y — chart não
  é screen-reader friendly sozinho); cor não pode ser o único indicador.
- Respeitar `prefers-reduced-motion` (já global após quick 260910-p6x) —
  animação de entrada do chart opcional.
Entra num milestone de UI/relatórios, não num quick.
