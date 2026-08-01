---
created: 2026-07-21T03:14:14.823Z
title: Sequência de follow-up escalonada com templates de valor
area: general
resolves_phase: 10
files:
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table-toolbar.tsx
---

## Problem

Hoje o campo `followUpDate` do lead é uma data única, sem noção de cadência.
O admin sugeriu (durante uso do formulário na fase 01) que seria útil ter uma
lógica de **reabordagem escalonada por dias**: se o lead não respondeu no 1º
follow-up, sugerir um novo contato em +4 dias; se não respondeu de novo,
sugerir o próximo em +10 dias; e assim por diante, com intervalos crescentes
configuráveis.

Junto disso, o admin quer **templates de mensagem de follow-up** que reforcem
valor/prova social (ex: "veja quanto uma empresa/cliente lucrou com nossa
automação/serviço") para usar nessas reabordagens.

## Solution

TBD — ideias de abordagem a validar num /gsd-discuss-phase futuro:
- Uma sequência de intervalos configurável (ex: [4, 10, ...] dias) associada
  ao lead ou ao sub-nicho, calculando automaticamente o próximo
  `followUpDate` sugerido após cada tentativa sem resposta.
- Isso continua sendo uma **sugestão/lembrete manual** — o admin decide e
  envia via link wa.me. Projeto não usa API paga do WhatsApp (ver
  CLAUDE.md), então não há envio automático nem agendamento de disparo real.
- Templates de mensagem com placeholders de "prova de valor" (ex:
  estatística de resultado) podem reaproveitar o sistema de templates de
  mensagem já previsto no roadmap para abordagem via Instagram/WhatsApp.

Escopo maior que uma quick task — precisa virar fase própria no roadmap
quando chegar a vez (provavelmente relacionado à fase de templates de
mensagem).

## Priority Note (2026-08-01)

Marcado como item **#3 de prioridade** entre os 6 itens "ALTO VALOR" da
varredura de ideias externa de 2026-08-01 (ver `C:\Users\Vencedor\Desktop\Ideias.txt`),
depois de [[2026-08-01-separa-o-inbound-x-outbound]] e
[[2026-08-01-timeline-de-intera-es-por-lead]].
