# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (shipado 2026-08-31) — `.planning/milestones/v1.4-ROADMAP.md`
- ✅ **v1.5 Quitação de Débito e Auditoria Retroativa** — Fases 16-19 (shipado 2026-09-03) — `.planning/milestones/v1.5-ROADMAP.md`
- ✅ **v1.6 Dark Mode + Exportar CSV** — Fases 20-21 (shipado 2026-09-04) — `.planning/milestones/v1.6-ROADMAP.md`
- ✅ **v1.7 Exploração de Nicho** — Fases 22-25 (shipado 2026-09-12) — `.planning/milestones/v1.7-ROADMAP.md`

## Phases

<details>
<summary>✅ v1.0 MVP (Fases 1-4) — SHIPADO 2026-07-29</summary>

- [x] Fase 1: Lead & Sub-nicho Foundation (4/4 planos) — 2026-07-22
- [x] Fase 2: CSV Bulk Import (3/3 planos) — 2026-07-24
- [x] Fase 3: Sales Pipeline & Funnel View (4/4 planos) — 2026-07-21
- [x] Fase 4: Follow-up Dashboard & WhatsApp Outreach (4/4 planos) — 2026-07-22

Detalhes: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Importação Inteligente (Fase 5) — SHIPADO 2026-07-30</summary>

- [x] Fase 5: Notas Enriquecidas na Importação CSV (2/2 planos) — 2026-07-30

Detalhes: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Follow-up Automático (Fases 6-7) — SHIPADO 2026-08-01</summary>

- [x] Fase 6: Auto-avanço de Etapa + Contador de Tentativas (2/2 planos) — 2026-07-30
- [x] Fase 7: Configuração de Dias-Parado por Etapa (2/2 planos) — 2026-07-31

</details>

<details>
<summary>✅ v1.3 Qualificação e Histórico de Leads (Fases 8-12) — SHIPADO 2026-08-30</summary>

**Meta:** Qualificar leads por origem e dar visibilidade ao histórico de interação e ao resultado do funil.

- [x] Fase 8: Origem Governada + Separação Inbound × Outbound (3/3 planos) — 2026-08-07
- [x] Fase 9: Timeline de Interações (4/4 planos) — 2026-08-09
- [x] Fase 10: Sequência de Follow-up Escalonada (4/4 planos) — 2026-08-13
- [x] Fase 11: Painel de Métricas e Relatório de Motivos de Perda (5/5 planos) — 2026-08-29
- [x] Fase 12: Agenda / Tarefas Soltas (4/4 planos) — 2026-08-30

Detalhes completos: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 CRM Genérico Multi-Nicho — despivô (Fases 13-15) — SHIPADO 2026-08-31</summary>

**Meta:** Tirar o CRM da amarra "área da saúde" — o admin usa a mesma ferramenta pra leads de qualquer nicho, e o relatório responde "esse nicho converteu na janela que testei?". Rename + reframe + 2 adições pequenas, não rebuild.

- [x] Fase 13: Rename `sub-nicho → nicho` + reframe (3/3 planos) — 2026-08-30 — NICHO-01, NICHO-02, COPY-01 · UAT 8/8, security 9/9, verification passed
- [x] Fase 14: Filtro de intervalo customizado em `/relatorios` (2/2 planos) — 2026-08-30 — METRICAS-03 · UAT 11/11, code review 10/10, security 10/10 · PR #4
- [x] Fase 15: Campo "interesse / serviço desejado" no lead (2/2 planos) — 2026-08-31 — LEAD-06 · UAT 5/5, code review 0 critical, security 0 threats · PR #5

Detalhes completos: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Quitação de Débito e Auditoria Retroativa (Fases 16-19) — SHIPADO 2026-09-03</summary>

**Meta:** Levar o CRM a "auditado, polido, não mexo mais" — verificar no navegador o que nunca foi verificado, fechar os achados de code review em aberto, limpar o lint do repo e dar identidade visual ao produto. **Zero feature funcional nova.**

- [x] Fase 16: Correções de Code Review da Fase 15 (2/2 planos) — 2026-09-01 — FIX-01/02/03 · code review 1 blocker (CR-01) corrigido, security 0 threats, verification passed
- [x] Fase 17: Limpeza de Lint do Repo (1/1 plano) — 2026-09-02 — LINT-01 · `npm run lint` da raiz exit 0 (de 457 erros, ~98% ruído de ferramental), verification passed
- [x] Fase 18: Auditoria Retroativa no Navegador (6/6 planos) — 2026-09-02 — AUDIT-01..05 · método code+data (host 4GB bloqueou o navegador); 5 `VERIFICATION.md` passed, 0 issues de runtime
- [x] Fase 19: Marca e Identidade Visual (6/6 planos) — 2026-09-03 — BRAND-01/02/03 · nome "SOLO", paleta "Corrente Funda · Sóbria" (OKLCH light+dark), 33 arquivos cor→token, favicon próprio · code review 2 WR corrigidos, security 0 threats, verification passed 5/5 (code+data)

Detalhes completos: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Dark Mode + Exportar CSV (Fases 20-21) — SHIPADO 2026-09-04</summary>

**Meta:** Dois utilitários pequenos que faltavam — o admin escolhe claro/escuro e leva os leads pra fora do sistema em CSV. Nada estrutural, zero mudança de schema.

- [x] Fase 20: Tema / Dark Mode (1/1 plano) — 2026-09-04 — THEME-01..04 · `ThemeProvider` (next-themes) + toggle sol/lua no rodapé da sidebar, persiste, sem FOUC · security 0 threats, verification passed 5/5 (code+data)
- [x] Fase 21: Exportar CSV da Lista de Leads (1/1 plano) — 2026-09-04 — EXPORT-01..03 · botão na toolbar → `getSortedRowModel().rows`, módulo puro `lead-csv-export.ts` (BOM UTF-8 + `;` + guard de CSV injection), harness 38 asserções · plan-checker PASS, security 0 threats, verification passed 4/4 (code+data)

Detalhes completos: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.7 Exploração de Nicho (Fases 22-25) — SHIPADO 2026-09-12</summary>

**Meta:** Dar ao CRM o objeto de 1ª classe que é o diferencial real do produto — a campanha de exploração de nicho, com diagnóstico de IA anti-genérico, veredito registrado pelo usuário e o loop de resultado real fechando com o que `/relatorios` já calcula. Zero WhatsApp, zero VPS, zero infra nova.

- [x] Fase 22: Campanha de Exploração de Nicho (3/3 planos) — 2026-09-05 — CAMPANHA-01..04 · CAMPANHA-03/SC3 fechado por gap closure (22-03), re-verificação 4/4
- [x] Fase 23: Diagnóstico de IA da Campanha (7/7 planos em 5 ondas) — 2026-09-11 — DIAGNOSTICO-01..10 · 1ª integração de IA do projeto (Vercel AI SDK + Claude Sonnet 5 + web search); eval on-demand discriminou os 3 nichos-gold na 3ª rodada; `23-VERIFICATION.md` human_needed (UAT visual pendente, falta crédito de API)
- [x] Fase 24: Veredito e Mapa de Nichos (4/4 planos em 2 ondas) — 2026-09-12 — VEREDITO-01..03, PAINEL-01..03 · painel de resultado real + tela `/mapa-de-nichos`; `24-VERIFICATION.md` human_needed (UAT visual pendente)
- [x] Fase 25: Tour Guiado do CRM (2/2 planos em 2 ondas) — 2026-09-12 — TUTORIAL-01..05 · React Joyride ancorado na sidebar, checkpoint humano de legitimidade de pacote aprovado diretamente pelo usuário; `25-VERIFICATION.md` human_needed (UAT visual pendente)

Detalhes completos: `.planning/milestones/v1.7-ROADMAP.md`

</details>

## Progress

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| v1.4 CRM Genérico Multi-Nicho | 13-15 | 7 | ✅ 2026-08-31 |
| v1.5 Quitação de Débito e Auditoria Retroativa | 16-19 | 15 | ✅ 2026-09-03 |
| v1.6 Dark Mode + Exportar CSV | 20-21 | 2 | ✅ 2026-09-04 |
| v1.7 Exploração de Nicho | 22-25 | 16 | ✅ 2026-09-12 |
