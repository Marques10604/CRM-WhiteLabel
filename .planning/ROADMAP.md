# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (shipado 2026-08-31) — `.planning/milestones/v1.4-ROADMAP.md`

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

## Progress

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| v1.4 CRM Genérico Multi-Nicho | 13-15 | 7 | ✅ 2026-08-31 |

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 13. Rename `sub-nicho → nicho` + reframe | v1.4 | 3/3 | ✅ Complete | 2026-08-30 |
| 14. Filtro de intervalo em `/relatorios` | v1.4 | 2/2 | ✅ Complete | 2026-08-30 |
| 15. Campo "interesse" no lead | v1.4 | 2/2 | ✅ Complete | 2026-08-31 |

---

_Próximo milestone: `/gsd-new-milestone`. Candidatos reconhecidos em `.planning/milestones/v1.4-REQUIREMENTS.md` (Future Requirements): handoff Prospector→CRM (HANDOFF-01..03), teste de nicho formal (CAMPANHA-01)._
