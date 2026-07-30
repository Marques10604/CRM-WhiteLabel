# Roadmap: CRM de Leads — Área da Saúde

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — ver `.planning/milestones/v1.0-ROADMAP.md`
- 🚧 **v1.1 Importação Inteligente** — Phase 5 (em andamento)

## Phases

<details>
<summary>✅ v1.0 MVP (Fases 1-4) — SHIPADO 2026-07-29</summary>

- [x] Fase 1: Lead & Sub-nicho Foundation (4/4 planos) — completa 2026-07-22
- [x] Fase 2: CSV Bulk Import (3/3 planos) — completa 2026-07-24
- [x] Fase 3: Sales Pipeline & Funnel View (4/4 planos) — completa 2026-07-21
- [x] Fase 4: Follow-up Dashboard & WhatsApp Outreach (4/4 planos) — completa 2026-07-22

Detalhes completos (goals, success criteria, plano-a-plano) arquivados em
`.planning/milestones/v1.0-ROADMAP.md`.

</details>

### 🚧 v1.1 Importação Inteligente (Em Andamento)

**Meta do milestone:** O CSV de prospecção gerado pela skill que o admin roda no cowork desktop (com colunas de inteligência: score, sinal_dor, trecho_dor, observacao) entra no CRM sem perder o sinal de priorização, mantendo tudo local (sem hospedagem na nuvem).

- [ ] **Phase 5: Notas Enriquecidas na Importação CSV** - Wizard de importação passa a aceitar mapear múltiplas colunas de inteligência do CSV do cowork, concatenadas automaticamente em um campo de notas formatado e legível, mantendo total compatibilidade com o mapeamento simples já existente

## Phase Details

### Phase 5: Notas Enriquecidas na Importação CSV

**Goal**: Admin importa o CSV de prospecção do cowork (com colunas de inteligência score/sinal_dor/trecho_dor/observacao) sem perder o sinal de priorização — essas colunas passam a ser concatenadas automaticamente em um único campo de notas formatado e legível no lead importado, sem exigir nada extra quando o CSV é simples
**Depends on**: Phase 2 (CSV Bulk Import — estende o motor de mapeamento e o wizard já existentes em `src/lib/csv-import.ts` e `src/components/csv-import-wizard.tsx`)
**Requirements**: IMPORT-04, IMPORT-05
**Success Criteria** (o que precisa ser verdade):

  1. No passo de mapeamento do wizard, o admin consegue marcar múltiplas colunas de origem do CSV (ex: `score`, `sinal_dor`, `trecho_dor`, `observacao`) para irem juntas para notas, além do mapeamento 1-pra-1 de uma única coluna de notas já existente
  2. Ao confirmar a importação, o lead criado tem um campo de notas formatado e legível contendo todas as colunas mapeadas, sem perder nenhuma coluna selecionada
  3. Um CSV simples que mapeia só uma coluna de notas continua sendo importado exatamente como hoje, sem exigir nenhuma configuração extra do admin
  4. O passo de mapeamento mostra ao admin, antes de confirmar, quais colunas serão concatenadas e em que ordem, para conferência

**Plans:** 1/2 plans executed

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Motor de concatenação em csv-import.ts (CsvExtraNotasColumns, buildNotasText, fallback sobre o resultado final) + harness de 10 cenários

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 05-02-PLAN.md — Seção de checkboxes "Colunas extras para notas (opcional)" + resumo ao vivo no wizard, estado extraNotasColumns até mapCsvRows

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Lead & Sub-nicho Foundation | v1.0 | 4/4 | Complete | 2026-07-22 |
| 2. CSV Bulk Import | v1.0 | 3/3 | Complete | 2026-07-24 |
| 3. Sales Pipeline & Funnel View | v1.0 | 4/4 | Complete | 2026-07-21 |
| 4. Follow-up Dashboard & WhatsApp Outreach | v1.0 | 4/4 | Complete | 2026-07-22 |
| 5. Notas Enriquecidas na Importação CSV | v1.1 | 1/2 | In Progress|  |
