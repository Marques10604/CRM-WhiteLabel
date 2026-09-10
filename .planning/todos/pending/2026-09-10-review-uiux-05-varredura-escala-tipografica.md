---
created: 2026-09-10T21:22:00.000Z
title: "Varredura: text-[NNpx] arbitrário → escala tipográfica"
area: geral
priority: "Revisão ui-ux-pro-max item 5 — consistência, fase pequena (diff mecânico em ~34 arquivos)"
files: []
---

## Problem

75 ocorrências de `text-[NNpx]` arbitrário em 34 arquivos, contornando a escala
do Tailwind. Principais: `text-[14px]` (=`text-sm`, 32×), `text-[20px]`
(≈`text-xl`, 18×), `text-[28px]` (h1 de página, 14×), `text-[16px]` (=`text-base`,
7×). O sidebar também usa `px-[14px]`, `px-[18px]`, `gap-[3px]` fora da grade de
4px. Renderiza igual hoje, mas "a escala não é escala" — não dá pra ajustar o
tamanho-base do app depois, e `verify:brand` já reprova `text-[..px]` em código
novo (padrão `ARBITRARY`), então é dívida que só cresce.

## Solution

TBD. Varredura mecânica:
- `text-[14px]` → `text-sm`, `text-[16px]` → `text-base`, `text-[20px]` → `text-xl`,
  `text-[11px]`/`text-[10px]`/`text-[13px]` → decidir (`text-xs` ou token novo).
- `text-[28px]` da h1 de página: se o tamanho é intencional, criar um token
  (`--text-page-title` / classe utilitária) em vez de espalhar o valor.
- Sidebar: `px-[14px]`/`px-[18px]`/`gap-[3px]` → steps da grade (`px-3.5`/`px-4`/`gap-0.5`)
  ou aceitar como exceção documentada de micro-tipografia do nav.
Rodar `verify:brand` + `check:contrast` + `build` + inspeção visual (claro/escuro)
no fim. Fase pequena — baixo risco, diff grande.
