---
created: 2026-08-01T18:48:32.927Z
title: "Separação Inbound x Outbound (fila/tratamento diferente por origem do lead)"
area: general
priority: "ALTO VALOR — item 1 de 6 (varredura 2026-08-01)"
resolves_phase: 8
files: []
---

## Problem

Hoje o CRM trata todo lead igual: chega, entra na etapa "Novo", recebe o mesmo
tratamento (mesma automação de auto-avanço, mesma lógica de "esfriando").

Mas leads têm origens diferentes com expectativas diferentes: um lead de
tráfego pago (inbound — anúncio, formulário) já chega "quente" — a pessoa
mandou mensagem porque quer atenção humana rápida, e uma automação de
follow-up frio em cima dele pode até atrapalhar. Já um lead de prospecção
fria (outbound — abordagem iniciada pelo admin) pode e deve ser tocado por
automação, porque ninguém está esperando resposta imediata.

Sem essa separação, quando o usuário começar a fazer tráfego pago de verdade
(plano já mencionado por ele), o sistema vai tratar lead quente como frio —
o que custa venda perdida, um tipo de bug silencioso (não dá erro, só perde
oportunidade).

## Solution

TBD — precisa virar fase própria no roadmap. Ideias iniciais da sessão de
varredura (2026-08-01):
- Campo de origem/tipo (inbound vs outbound) no lead, provavelmente já
  parcialmente coberto pelo campo `origem` existente — avaliar se precisa
  de um campo novo ou só uma classificação sobre o existente
- Comportamento condicional: automações (auto-avanço, "esfriando", futura
  sequência escalonada) podem precisar de regras diferentes por tipo

## Priority Note (2026-08-01)

Marcado como item **#1 de prioridade** entre os 6 itens "ALTO VALOR" da
varredura de ideias externa de 2026-08-01 (ver `C:\Users\Vencedor\Desktop\Ideias.txt`).
Razão dada: muda o *comportamento* do sistema, não só adiciona uma tela —
por isso vem antes dos demais itens dessa lista.
