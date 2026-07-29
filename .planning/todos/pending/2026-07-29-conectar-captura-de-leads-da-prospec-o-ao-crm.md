---
created: 2026-07-29T14:39:49.576Z
title: Conectar captura de leads da prospecção ao CRM
area: general
files: []
---

## Problem

Usuário já começou a prospectar de verdade (a partir de 2026-07-27), mas os
leads captados ainda não caem automaticamente no CRM — segue sendo cadastro
manual por enquanto.

Isso é o mesmo "Gap 4" mapeado na sessão de planejamento de 2026-07-25 (ver
`.planning/STATE.md`, seção "Session Continuity"): o usuário tem uma landing
page no Vercel, mas ela hoje só manda a pessoa pro WhatsApp dele, sem
webhook/API nenhuma configurada. Conflito ainda não resolvido: a landing é
pública (Vercel) e o CRM roda local (`localhost`) — não se alcançam sem o CRM
ganhar algum endereço público, o que esbarra na decisão de manter o CRM
"local only" (ver Gap 3 da mesma sessão).

## Solution

TBD — usuário disse que vai conectar depois. Opções já levantadas na sessão
de 2026-07-25, a validar num `/gsd-discuss-phase` futuro:

- (a) manter tudo local e a landing continua só mandando pro WhatsApp por
  enquanto (sem integração real);
- (b) expor só uma rota de captura pública (ex: Vercel + Turso só pra essa
  rota/DB), sem publicar o resto do CRM;
- (c) revisitar o Gap 3 (porta de entrada local pra IA cadastrar leads) junto
  e publicar o CRM inteiro.

Relacionado ao pending todo já existente sobre follow-up escalonado e ao Gap
3 (endpoint local sem auth) — todos vêm da mesma sessão de ideias.
