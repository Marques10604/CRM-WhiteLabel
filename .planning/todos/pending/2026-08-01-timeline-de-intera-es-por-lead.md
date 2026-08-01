---
created: 2026-08-01T18:48:32.927Z
title: "Timeline de interações por lead"
area: general
priority: "ALTO VALOR — item 2 de 6 (varredura 2026-08-01)"
resolves_phase: 9
files:
  - src/db/schema.ts (leads.contactAttempts, contador atual sem histórico)
---

## Problem

Hoje o CRM já registra um *contador* de tentativas de contato
(`contactAttempts`, Fase 6), mas não *o que aconteceu* em cada tentativa.

Reabrir um lead depois de semanas sem saber o que já foi dito é reconstruir
confiança do zero, ou pior, repetir uma pergunta que a pessoa já respondeu —
o que soa desorganizado pro cliente do outro lado (mesma lógica de por que
uma clínica não reescreve o prontuário do zero a cada consulta).

## Solution

TBD — precisa virar fase própria. Ideia inicial: tabela de interações
(lead_id, tipo, data, texto/resumo) alimentada manualmente pelo admin (ou
semi-automaticamente a cada clique de WhatsApp), exibida como linha do
tempo na tela do lead.

## Priority Note (2026-08-01)

Item **#2 de prioridade** entre os 6 "ALTO VALOR" da varredura de ideias
externa de 2026-08-01 (`C:\Users\Vencedor\Desktop\Ideias.txt`). Vem logo
depois da separação Inbound×Outbound porque ambos mudam o modelo de dados
central do lead, antes de qualquer coisa que dependa dele (métricas,
relatório de perda).
