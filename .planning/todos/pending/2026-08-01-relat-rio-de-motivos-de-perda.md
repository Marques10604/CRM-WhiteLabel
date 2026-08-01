---
created: 2026-08-01T18:48:32.927Z
title: "Relatório de motivos de perda"
area: general
priority: "ALTO VALOR — item 5 de 6 (varredura 2026-08-01)"
resolves_phase: 11
files:
  - src/db/schema.ts (leads.motivoPerda, já existe desde a Fase 3, sem relatório agregado)
---

## Problem

O campo `motivoPerda` já existe desde a Fase 3 (capturado ao mover um lead
pra "Perdido"), mas não existe nenhuma tela/relatório que agregue esses
motivos para o admin entender padrões de perda.

## Solution

TBD — precisa virar fase própria. Ideia inicial: contagem/agrupamento de
`motivoPerda` em `/leads` "Perdido" ou numa tela de relatórios dedicada.

## Priority Note (2026-08-01)

Item **#5 de prioridade** entre os 6 "ALTO VALOR" da varredura de ideias
externa de 2026-08-01 (`C:\Users\Vencedor\Desktop\Ideias.txt`) — junto com
[[2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho]], é decorrência dos
itens #1/#2 (só faz sentido com dado de origem/histórico já entrando bem).
