# Roadmap: CRM de Leads — Área da Saúde

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — ver `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30)
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- 🚧 **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (em andamento)

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

### ✅ v1.2 Follow-up Automático (Shipado 2026-08-01)

**Meta do milestone:** Reduzir a manutenção manual do pipeline — o sistema acompanha contato e tempo parado sozinho, avisando quando algo precisa de atenção, em vez de depender só da memória do admin.

- [x] **Phase 6: Auto-avanço de Etapa + Contador de Tentativas** - Clicar em "Abrir WhatsApp" com o template de primeiro contato avança automaticamente um lead "Novo" para "Contatado" (com toast de confirmação), e todo clique de WhatsApp incrementa um contador de tentativas de contato visível no pipeline (completed 2026-07-30)
- [x] **Phase 7: Configuração de Dias-Parado por Etapa** - Tela `/configuracoes` generaliza o "esfriando" hoje hardcoded (5 dias, só Contatado) para as 3 primeiras etapas do funil, cada uma com seu próprio limite configurável (completed 2026-07-31)

### 🚧 v1.3 Qualificação e Histórico de Leads (Em Andamento)

**Meta do milestone:** Qualificar leads por origem e dar visibilidade ao histórico de interação e ao resultado do funil — tráfego pago (quente) e prospecção fria deixam de receber o mesmo tratamento automático, e o admin passa a enxergar de onde vêm as vendas (e as perdas).

- [x] **Phase 8: Origem Governada + Separação Inbound × Outbound** - Cada lead ganha um campo dedicado (`origemTipo`) para classificação Inbound/Outbound, com backfill explícito dos leads existentes, sem depender do texto livre de `origem` (completed 2026-08-07)
- [x] **Phase 9: Timeline de Interações** - Todo clique de WhatsApp e nota manual vira um registro cronológico visível na tela do lead — histórico completo, não só o contador atual (completed 2026-08-09)
- [x] **Phase 10: Sequência de Follow-up Escalonada** - Admin configura intervalos crescentes de reabordagem com templates de reforço de valor, o sistema sugere a próxima data (cálculo na leitura, nunca agendado), e leads Inbound ficam de fora dessa automação (completed 2026-08-13)
- [ ] **Phase 11: Painel de Métricas e Relatório de Motivos de Perda** - Tela de relatórios com contagem/conversão por origem e sub-nicho, e contagem de leads perdidos por motivo
- [ ] **Phase 12: Agenda / Tarefas Soltas** - Tarefa avulsa com data e descrição, sem vínculo a lead, aparecendo no dashboard de follow-up junto com os leads

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

**Plans:** 2/2 plans complete

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Camada de dados: tabela singleton `configuracoes`, `configuracoesSchema` (mín. 1 dia), `getConfiguracoes()` com semeadura idempotente (Contatado=5) e Server Action `saveConfiguracoes`, aplicada ao banco vivo via `drizzle-kit push`

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Tela `/configuracoes` (form de 3 campos + toast, sem sair da página), item "Configurações" no sidebar e generalização do cálculo de "esfriando" no board por mapa etapa→limite

**UI hint**: yes

### Phase 8: Origem Governada + Separação Inbound × Outbound

**Goal**: Cada lead tem uma classificação de origem confiável (Inbound ou Outbound) via campo dedicado, sem depender de interpretar texto livre — base técnica para o painel de métricas (Phase 11) e para a automação condicional da sequência de follow-up (Phase 10)
**Depends on**: Nothing novo neste milestone (estende `leads` — schema já em produção desde a Fase 1)
**Requirements**: ORIGEM-01, ORIGEM-02
**Success Criteria** (o que precisa ser verdade):

  1. Admin classifica um lead (na criação ou na edição) com um tipo de origem explícito — Inbound ou Outbound — via campo dedicado (`origemTipo`, enum fechado) no formulário do lead, sem depender de interpretar o texto livre já existente em `origem`
  2. Todo lead que já existia antes da mudança de schema recebe uma classificação padrão via backfill explícito e documentado — nenhum lead ativo fica com `origemTipo` vazio/nulo após a migração
  3. A classificação de origem (Inbound/Outbound) fica visível em pelo menos uma tela de consulta do lead (formulário, lista ou pipeline), para o admin conferir o resultado do backfill e de novas classificações

**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Contratos de `origemTipo` (coluna Drizzle + schemas Zod) e migração `ALTER TABLE` + backfill idempotente das 33 linhas de `data/crm.db`, com backup prévio

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-02-PLAN.md — Campo obrigatório "Tipo de origem" no modal de lead (padrão do campo `canal`, sem pré-seleção) + default `outbound` persistido no import CSV em lote

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-03-PLAN.md — Bootstrap de `test-lead-actions.cjs` consertado + casos de `origemTipo` + guarda permanente `verify:origem-tipo` + gates finais (tsc/eslint/build)

**UI hint**: yes

### Phase 9: Timeline de Interações

**Goal**: O admin deixa de depender só do contador de tentativas — cada evento de contato com um lead vira um registro na linha do tempo, com data e resumo, consultável a qualquer momento
**Depends on**: Nothing novo (independente de Phase 8; toca a mesma superfície de código de `registerWhatsAppContact`/`LeadFormDialog` já existente desde a Fase 6, sem dependência técnica dura)
**Requirements**: TIMELINE-01, TIMELINE-02
**Success Criteria** (o que precisa ser verdade):

  1. Todo clique em "Abrir WhatsApp" (qualquer template, em qualquer tela) gera automaticamente um registro na timeline do lead, com data/hora e tipo/resumo do evento, sem exigir nenhuma ação manual extra do admin
  2. Admin consegue registrar uma nota manual na timeline de um lead, independente de qualquer clique de WhatsApp
  3. Ao abrir a tela/modal de um lead, o admin visualiza o histórico completo de interações em ordem cronológica, incluindo tanto os eventos automáticos de WhatsApp quanto as notas manuais

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Camada de dados: tabela `interacoes` (schema + tipos + contratos Zod), extensão da guarda anti hard-delete no mesmo commit, `drizzle-kit push` no banco vivo e as 4 Server Actions com guarda de imutabilidade no WHERE

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-02-PLAN.md — Captura automática: `registerWhatsAppContact(leadId, tipo, texto)` grava contador e interação numa única transação (qualquer template), preview passa o texto vivo, e harness permanente `test:interacao-actions`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-03-PLAN.md — Superfície dedicada `LeadTimelineDialog` (D-02): lista cronológica com texto integral, composer de nota manual no topo, edição inline e exclusão confirmada só para notas manuais (D-06)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 09-04-PLAN.md — Os 3 pontos de entrada de D-03 (ícone na lista `/leads`, ícone no card do pipeline, botão "Ver histórico" no rodapé do modal) + bateria de 9 gates sequenciais

**UI hint**: yes

### Phase 10: Sequência de Follow-up Escalonada

**Goal**: Reabordagem fria segue um roteiro de intervalos crescentes com templates de reforço de valor, calculado sempre na leitura (nunca por disparo agendado) — e nunca se aplica a um lead que já chegou quente (Inbound)
**Depends on**: Phase 8 (precisa de `origemTipo` populado para o gate Inbound); reutiliza o mesmo ponto de extensão de `registerWhatsAppContact` já mexido na Phase 9 (sem dependência técnica dura dela)
**Requirements**: SEQ-01, SEQ-02, SEQ-03, ORIGEM-03
**Success Criteria** (o que precisa ser verdade):

  1. Admin configura, numa tela dedicada, uma sequência de intervalos crescentes (em dias) entre tentativas de reabordagem
  2. Ao visualizar um lead Outbound com posição registrada na sequência, o sistema mostra a próxima data de follow-up sugerida — calculada na leitura a partir da posição do lead na sequência, nunca por um job/disparo agendado (sem cron/scheduler neste app)
  3. Um lead classificado como Inbound (Phase 8) nunca recebe essa sugestão automática de próxima data de reabordagem — a automação de reabordagem fria não roda sobre lead que já chegou "quente"
  4. Templates de mensagem de reforço de valor/prova social ficam disponíveis para o admin usar ao reabordar um lead que está na sequência

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Colunas `leads.sequenciaPosicao` e `configuracoes.sequenciaIntervalosDias` + contratos Zod + migração manual [BLOCKING] via better-sqlite3 + cálculo puro `computeSequenciaSugestao` com os gates ORIGEM-03/D-09/D-10

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — Avanço automático da posição em `registerWhatsAppContact` (template follow_up) e reset ao voltar para "Novo", com guarda de regressão `verify:sequencia`
- [x] 10-03-PLAN.md — Seção "Sequência de reabordagem" em `/configuracoes` com lista dinâmica de intervalos + `saveConfiguracoes` lendo N valores via `formData.getAll`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-04-PLAN.md — Indicador "Sugestão: dd/MM" no dashboard e no card do pipeline (cálculo server-side) + gates finais e verificação humana ponta a ponta

**UI hint**: yes

### Phase 11: Painel de Métricas e Relatório de Motivos de Perda

**Goal**: Admin enxerga de onde vêm as vendas (origem, sub-nicho) e por que perde negócios (motivo de perda), numa única tela de relatórios, sem precisar cruzar dados manualmente na planilha antiga
**Depends on**: Phase 8 (bloqueio técnico duro — precisa de `origemTipo` já populado para agrupar por Inbound/Outbound); sequenciada com o relatório de motivo de perda por compartilhar a mesma infraestrutura de página (`/relatorios`)
**Requirements**: METRICAS-01, METRICAS-02, PERDA-01
**Success Criteria** (o que precisa ser verdade):

  1. Admin visualiza, numa tela de relatórios, a contagem e a taxa de conversão de leads agrupados por tipo de origem (Inbound/Outbound)
  2. Admin visualiza, na mesma tela, a contagem de leads agrupados por sub-nicho
  3. Admin visualiza a contagem de leads perdidos agrupada por motivo de perda (`motivoPerda`), com o campo normalizado/governado o suficiente para não fragmentar o relatório em variações de texto livre equivalentes

**Plans:** 4/5 plans executed

Plans:
**Wave 1**

- [x] 11-01-PLAN.md — Tabela `motivos_perda` + FK `leads.motivoPerdaId` + tipos/contrato Zod base, migração manual [BLOCKING] via better-sqlite3 com seed dos 6 motivos de D-02, guard e gates de schema estendidos

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 11-02-PLAN.md — Server Actions de CRUD governado (criar/renomear/soft-delete com reativação-por-nome) e tela `/motivos-perda` espelhando `/subnichos`, com item novo no menu lateral

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 11-03-PLAN.md — Captura obrigatória do motivo (D-04) nas duas superfícies: `MotivoPerdaCombobox` com criação-na-hora (D-03), contratos Zod condicionais, servidor autoritativo e modal de drag com Cancelar que reverte

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 11-04-PLAN.md — Três agregações SQL `GROUP BY` (origem/sub-nicho/motivo) com os filtros de período de D-09 e D-11, mais as funções puras `resolvePeriodRange`/`computeTaxaConversao`/`buildLinhasOrigem` e o gate `test:relatorios`

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 11-05-PLAN.md — Tela `/relatorios` com as 3 seções empilhadas, seletor de período por querystring, item novo no menu lateral e suíte completa de gates + verificação humana ponta a ponta

**UI hint**: yes

### Phase 12: Agenda / Tarefas Soltas

**Goal**: Admin registra um compromisso ou lembrete que não está amarrado a nenhum lead (ex: ligar pro cowork, preparar material) e ainda assim recebe destaque de urgência igual aos follow-ups de lead
**Depends on**: Nothing (tabela nova sem FK para `leads`, totalmente desacoplada das demais fases deste milestone)
**Requirements**: TAREFA-01, TAREFA-02
**Success Criteria** (o que precisa ser verdade):

  1. Admin cria uma tarefa avulsa com data e descrição, sem precisar vincular a nenhum lead
  2. Tarefas aparecem no dashboard de follow-up, agrupadas por urgência (Vencidas/Hoje/Próximos 7 dias) — mesmo padrão já usado para follow-ups de lead
  3. Tarefas soltas ficam visualmente distinguíveis dos follow-ups de lead dentro do mesmo agrupamento por urgência, sem exigir uma tela/rota separada para o admin achar o que precisa fazer hoje

**Plans**: TBD

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Lead & Sub-nicho Foundation | v1.0 | 4/4 | Complete | 2026-07-22 |
| 2. CSV Bulk Import | v1.0 | 3/3 | Complete | 2026-07-24 |
| 3. Sales Pipeline & Funnel View | v1.0 | 4/4 | Complete | 2026-07-21 |
| 4. Follow-up Dashboard & WhatsApp Outreach | v1.0 | 4/4 | Complete | 2026-07-22 |
| 5. Notas Enriquecidas na Importação CSV | v1.1 | 2/2 | Complete | 2026-07-30 |
| 6. Auto-avanço de Etapa + Contador de Tentativas | v1.2 | 2/2 | Complete    | 2026-07-30 |
| 7. Configuração de Dias-Parado por Etapa | v1.2 | 2/2 | Complete   | 2026-07-31 |
| 8. Origem Governada + Separação Inbound × Outbound | v1.3 | 3/3 | Complete   | 2026-08-07 |
| 9. Timeline de Interações | v1.3 | 4/4 | Complete   | 2026-08-09 |
| 10. Sequência de Follow-up Escalonada | v1.3 | 4/4 | Complete   | 2026-08-13 |
| 11. Painel de Métricas e Relatório de Motivos de Perda | v1.3 | 4/5 | In Progress|  |
| 12. Agenda / Tarefas Soltas | v1.3 | 0/TBD | Not started | - |
