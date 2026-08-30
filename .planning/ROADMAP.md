# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- 🚧 **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (em andamento)

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

### 🚧 v1.4 CRM Genérico Multi-Nicho — despivô (Em Andamento)

**Meta do milestone:** Tirar o CRM da amarra "área da saúde" — o admin usa a mesma ferramenta pra leads de qualquer nicho (empresa de serviços de automação/IA, nichos rotativos), e o relatório responde "esse nicho converteu na janela que testei?". É rename + reframe + 2 adições pequenas, não rebuild.

- [ ] **Fase 13: Rename `sub-nicho → nicho` + reframe** — NICHO-01, NICHO-02, COPY-01
- [ ] **Fase 14: Filtro de intervalo customizado em `/relatorios`** — METRICAS-03
- [ ] **Fase 15: Campo "interesse / serviço desejado" no lead** — LEAD-06

## Phase Details

### Phase 13: Rename `sub-nicho → nicho` + reframe

**Goal**: O admin usa o CRM sem ver nenhuma referência a "sub-nicho" ou "área da saúde" — o campo se chama "nicho" em toda tela e a ferramenta se apresenta como agnóstica de nicho, sem perder a categorização dos leads existentes.
**Depends on**: Nada (rename mecânico sobre a estrutura da Fase 1; a coluna `sub_nicho` já é lista livre extensível). Backup de `data/crm.db` antes da migração de coluna.
**Requirements**: NICHO-01, NICHO-02, COPY-01
**Success Criteria** (o que precisa ser verdade):

  1. Em toda tela onde antes aparecia "sub-nicho" (formulário de lead, filtro/coluna da lista `/leads`, seção do `/relatorios`, passo de mapeamento do wizard de importação), agora aparece "nicho"
  2. A rota `/nichos` gerencia a lista (criar, renomear, remover com soft-delete, reativar por nome) e tem item no menu lateral; `/subnichos` deixa de existir (ou redireciona para `/nichos`)
  3. Todos os leads existentes mantêm sua categorização — a migração da coluna não perde nem embaralha nenhum valor de nicho
  4. Nenhum label, placeholder, texto de ajuda, exemplo ou estado vazio visível no app menciona "área da saúde", usa "nutricionista"/"terapeuta" como categoria fixa, ou pressupõe um nicho-pai
  5. Importar um CSV mapeando uma coluna para "nicho" cria os leads com o nicho certo, igual ao que funcionava para "sub-nicho"

**Plans**: 2-3 planos (coarse) — provável: (a) migração de coluna `sub_nicho → nicho` + tipos + Zod + queries + guard/verify-schema; (b) varredura das superfícies de UI (form, lista, filtro, `/relatorios`, wizard) + rota `/nichos`; (c) varredura de copy + estados vazios + PROJECT-facing strings

**UI hint**: yes

### Phase 14: Filtro de intervalo customizado em `/relatorios`

**Goal**: O admin avalia a performance de um nicho (ou origem, ou motivo de perda) em qualquer janela de tempo que ele escolher, informando data de início e data de fim — o produto não impõe duração de janela.
**Depends on**: Phase 11 (shipada — estende `/relatorios`, o `PeriodoSelector` e as 3 funções de agregação em `src/db/queries.ts`)
**Requirements**: METRICAS-03
**Success Criteria** (o que precisa ser verdade):

  1. Em `/relatorios`, além dos presets 30d/90d/tudo, o admin pode escolher "intervalo personalizado" e informar data de início e data de fim
  2. As três seções (leads por origem, leads por nicho, motivos de perda) recalculam para o intervalo informado
  3. Um intervalo inválido (fim antes do início, campo vazio, data no futuro) não quebra a tela — cai num fallback claro (ex: volta ao preset padrão) com aviso
  4. O intervalo selecionado sobrevive a um refresh da página (querystring, mesmo padrão dos presets atuais, `scroll: false`)

**Plans**: 1-2 planos (coarse) — provável: (a) as 3 funções de query aceitam `{ from, to }` além do preset + resolução/validação do intervalo; (b) `PeriodoSelector` ganha o modo intervalo (2 date inputs) + página lê da querystring

**UI hint**: yes

### Phase 15: Campo "interesse / serviço desejado" no lead

**Goal**: O admin registra o que cada lead quer (qual serviço ou automação), pra saber com quem está falando antes de abordar — opcional, sem atrito no cadastro.
**Depends on**: Phase 1 (formulário de lead) e Phase 2 (wizard de importação CSV) — ambas shipadas; campo aditivo, sem migração destrutiva
**Requirements**: LEAD-06
**Success Criteria** (o que precisa ser verdade):

  1. O formulário de lead tem um campo opcional "Interesse" (texto livre) que salva e persiste
  2. O campo aparece na tela de detalhe/edição do lead com o valor salvo
  3. Criar ou editar um lead sem preencher o campo funciona normalmente — é opcional, nunca bloqueia o submit
  4. O wizard de importação CSV permite mapear uma coluna para "Interesse", e o valor entra no lead importado

**Plans**: 1-2 planos (coarse) — provável: (a) coluna `interesse` nullable + Zod + form de lead; (b) opção de mapeamento no wizard + `CsvFieldKey`

**UI hint**: yes

## Progress

**Execution Order:** 13 → 14 → 15 (numérica; 14 e 15 são independentes entre si, 13 vem primeiro por conta do rename tocar tudo)

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| **v1.4 CRM Genérico Multi-Nicho** | **13-15** | **~5** | 🚧 em andamento |

| Fase | Milestone | Planos | Status | Concluída |
|------|-----------|--------|--------|-----------|
| 13. Rename `sub-nicho → nicho` + reframe | v1.4 | 0/? | Not started | — |
| 14. Filtro de intervalo em `/relatorios` | v1.4 | 0/? | Not started | — |
| 15. Campo "interesse" no lead | v1.4 | 0/? | Not started | — |
