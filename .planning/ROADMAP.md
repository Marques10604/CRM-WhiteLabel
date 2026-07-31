# Roadmap: CRM de Leads — Área da Saúde

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — ver `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30)
- 🚧 **v1.2 Follow-up Automático** — Fases 6-7 (em andamento)

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

### ✅ v1.1 Importação Inteligente (Shipado 2026-07-30)

**Meta do milestone:** O CSV de prospecção gerado pela skill que o admin roda no cowork desktop (com colunas de inteligência: score, sinal_dor, trecho_dor, observacao) entra no CRM sem perder o sinal de priorização, mantendo tudo local (sem hospedagem na nuvem).

- [x] **Phase 5: Notas Enriquecidas na Importação CSV** - Wizard de importação passa a aceitar mapear múltiplas colunas de inteligência do CSV do cowork, concatenadas automaticamente em um campo de notas formatado e legível, mantendo total compatibilidade com o mapeamento simples já existente (completed 2026-07-30)

### 🚧 v1.2 Follow-up Automático (Em Andamento)

**Meta do milestone:** Reduzir a manutenção manual do pipeline — o sistema acompanha contato e tempo parado sozinho, avisando quando algo precisa de atenção, em vez de depender só da memória do admin.

- [x] **Phase 6: Auto-avanço de Etapa + Contador de Tentativas** - Clicar em "Abrir WhatsApp" com o template de primeiro contato avança automaticamente um lead "Novo" para "Contatado" (com toast de confirmação), e todo clique de WhatsApp incrementa um contador de tentativas de contato visível no pipeline (completed 2026-07-30)
- [ ] **Phase 7: Configuração de Dias-Parado por Etapa** - Tela `/configuracoes` generaliza o "esfriando" hoje hardcoded (5 dias, só Contatado) para as 3 primeiras etapas do funil, cada uma com seu próprio limite configurável

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

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Motor de concatenação em csv-import.ts (CsvExtraNotasColumns, buildNotasText, fallback sobre o resultado final) + harness de 10 cenários

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Seção de checkboxes "Colunas extras para notas (opcional)" + resumo ao vivo no wizard, estado extraNotasColumns até mapCsvRows

**UI hint**: yes

### Phase 6: Auto-avanço de Etapa + Contador de Tentativas

**Goal**: Ao contatar um lead pelo WhatsApp, o sistema acompanha automaticamente o progresso da etapa e o esforço de contato — sem o admin precisar atualizar isso manualmente em nenhuma das telas onde o botão de WhatsApp aparece
**Depends on**: Phase 4 (Follow-up Dashboard & WhatsApp Outreach — estende `WhatsAppPreviewDialog`, o único ponto do app que renderiza o link wa.me real, e o card do pipeline da Fase 3)
**Requirements**: WA-06, WA-07, WA-08
**Success Criteria** (o que precisa ser verdade):

  1. Ao clicar em "Abrir WhatsApp" com o template de primeiro contato num lead na etapa "Novo", o lead avança automaticamente para "Contatado" e um toast confirma a mudança — em qualquer tela onde o botão aparece (dashboard, pipeline, lista de leads, pós-importação)
  2. Um lead que já está em "Contatado" ou além nunca regride nem "re-avança" de etapa ao clicar em "Abrir WhatsApp" novamente, mesmo reabrindo o diálogo com o template de primeiro contato
  3. Todo clique em "Abrir WhatsApp" — qualquer template, em qualquer etapa do lead — incrementa um contador de tentativas de contato daquele lead, visível no card do pipeline
  4. O auto-avanço e o contador continuam corretos mesmo se o lead foi movido de etapa via drag-and-drop no board pouco antes do clique em WhatsApp (checagem sempre re-lida no servidor, nunca confiando em estado desatualizado do cliente)

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Coluna `contact_attempts`, `whatsappContactSchema` e a Server Action `registerWhatsAppContact` (gate server-side de auto-avanço + incremento atômico), aplicação no banco real e guarda automatizada do invariante

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Disparo fire-and-forget da mutação no anchor "Abrir WhatsApp" com toast de auto-avanço + indicador do contador no card do pipeline

**UI hint**: yes

### Phase 7: Configuração de Dias-Parado por Etapa

**Goal**: Admin define e ajusta, sem depender de código, quantos dias um lead pode ficar parado em cada etapa do funil antes de ser destacado como "esfriando"
**Depends on**: Phase 3 (Sales Pipeline & Funnel View — generaliza o literal hardcoded de "esfriando" hoje restrito à etapa Contatado em `src/app/pipeline/page.tsx`)
**Requirements**: CONFIG-01, CONFIG-02
**Success Criteria** (o que precisa ser verdade):

  1. Admin acessa uma tela `/configuracoes` com um formulário de dias-parado, um campo numérico por etapa (Novo, Contatado, Negociação)
  2. Ao salvar novos valores, o board do pipeline passa a destacar leads "esfriando" usando os novos limites configurados, para as 3 etapas — não só Contatado
  3. No primeiro acesso à tela, antes de qualquer alteração do admin, o campo de Contatado já aparece pré-preenchido com 5, e o destaque de "esfriando" no pipeline se comporta exatamente como antes do deploy dessa fase

**Plans:** 1/2 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Camada de dados: tabela singleton `configuracoes`, `configuracoesSchema` (mín. 1 dia), `getConfiguracoes()` com semeadura idempotente (Contatado=5) e Server Action `saveConfiguracoes`, aplicada ao banco vivo via `drizzle-kit push`

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 07-02-PLAN.md — Tela `/configuracoes` (form de 3 campos + toast, sem sair da página), item "Configurações" no sidebar e generalização do cálculo de "esfriando" no board por mapa etapa→limite

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Lead & Sub-nicho Foundation | v1.0 | 4/4 | Complete | 2026-07-22 |
| 2. CSV Bulk Import | v1.0 | 3/3 | Complete | 2026-07-24 |
| 3. Sales Pipeline & Funnel View | v1.0 | 4/4 | Complete | 2026-07-21 |
| 4. Follow-up Dashboard & WhatsApp Outreach | v1.0 | 4/4 | Complete | 2026-07-22 |
| 5. Notas Enriquecidas na Importação CSV | v1.1 | 2/2 | Complete | 2026-07-30 |
| 6. Auto-avanço de Etapa + Contador de Tentativas | v1.2 | 2/2 | Complete    | 2026-07-30 |
| 7. Configuração de Dias-Parado por Etapa | v1.2 | 1/2 | In Progress|  |
