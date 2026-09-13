---
created: 2026-08-01T18:48:32.927Z
title: "Temperatura automática do lead (quente/morno/frio)"
area: general
priority: "NOVAS IDEIAS PME — avaliar prioridade, não urgente (varredura 2026-08-01)"
files: []
---

## Problem

Não existe hoje uma classificação automática de "temperatura" do lead
(quente/morno/frio) — só a etapa do pipeline.

## Solution

TBD — motivo de incluir vem também do lado comercial: é o tipo de coisa que
aparece bem num print pra Instagram, ajuda a vender o próprio produto (não
é feature técnica pura). Considerar depois de [[2026-08-01-separa-o-inbound-x-outbound]],
já que "temperatura" provavelmente deriva de origem + tempo parado.

## Resolvido

Implementado na quick task `260912-omq` (2026-09-12): classificação em 3 faixas (Quente/Morno/Frio) derivada de etapa + tempo parado (mesma config de dias-parado da Fase 7), exibida em `/pipeline` e `/leads`. Ver `.planning/quick/260912-omq-adicionar-indicador-de-temperatura-autom/`.
