# Requirements: CRM de Leads — Área da Saúde

**Defined:** 2026-08-01
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets que hoje causa desorganização e esquecimento de contatos.

## v1.3 Requirements

Requisitos para o milestone v1.3 (Qualificação e Histórico de Leads). Cada um mapeia para uma fase do roadmap.

### Origem e Segmentação

- [ ] **ORIGEM-01**: Admin classifica cada lead com um tipo de origem (Inbound ou Outbound) via campo dedicado (`origemTipo`, enum fechado) — sem depender do texto livre existente em `origem`
- [ ] **ORIGEM-02**: Leads existentes recebem uma classificação padrão via backfill explícito e documentado, ao aplicar a mudança de schema
- [ ] **ORIGEM-03**: Leads classificados como Inbound não recebem sugestão automática da sequência de follow-up escalonada — a automação de reabordagem fria não roda sobre lead que já chegou "quente"

### Timeline de Interações

- [ ] **TIMELINE-01**: Cada evento de contato com um lead (clique de WhatsApp, nota manual) é registrado numa linha do tempo, com data e tipo/resumo
- [ ] **TIMELINE-02**: Admin visualiza o histórico completo de interações de um lead, em ordem cronológica, na tela/modal do lead

### Sequência de Follow-up Escalonada

- [ ] **SEQ-01**: Admin configura uma sequência de intervalos crescentes (em dias) entre tentativas de reabordagem
- [ ] **SEQ-02**: O sistema sugere a próxima data de follow-up com base na posição do lead na sequência — cálculo feito na leitura, nunca um disparo automático agendado (sem cron/scheduler)
- [ ] **SEQ-03**: Templates de mensagem de reforço de valor/prova social ficam disponíveis para uso nessas reabordagens

### Painel de Métricas

- [ ] **METRICAS-01**: Admin visualiza contagem/taxa de conversão de leads agrupados por tipo de origem (Inbound/Outbound)
- [ ] **METRICAS-02**: Admin visualiza contagem de leads agrupados por sub-nicho

### Relatório de Motivos de Perda

- [ ] **PERDA-01**: Admin visualiza a contagem de leads perdidos agrupada por motivo de perda (`motivoPerda`)

### Agenda / Tarefas Soltas

- [ ] **TAREFA-01**: Admin cria uma tarefa com data e descrição, sem vínculo a nenhum lead
- [ ] **TAREFA-02**: Tarefas aparecem no dashboard de follow-up, agrupadas por urgência — mesmo padrão já usado para follow-ups de lead

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Qualificação (fast-follow, v1.4)

- **TEMP-01**: Temperatura automática do lead (quente/morno/frio) — campo derivado (não tabela nova) calculado a partir de `origemTipo` + dias parado + tentativas de contato, na leitura. Adiado não por complexidade técnica, mas para calibrar a regra com dado real de `origemTipo` já em produção (ver `.planning/research/FEATURES.md`).
- **TEMP-02**: Override manual de temperatura — só se a regra derivada (TEMP-01) errar com frequência perceptível no uso real.

### Ideias PME (avaliar prioridade)

Ver `.planning/todos/pending/2026-08-01-*.md`: tags livres por lead, busca global, exportar dados em CSV, anexo simples por lead, campo de vendedor responsável (schema-only), meta mensal com barra de progresso.

### Backlog anterior (v1.2, ainda não construído)

- **LEAD-05**: Porta de entrada local (sem auth, só localhost) para uma IA cadastrar leads automaticamente
- **IMPORT-V2-02**: Conectar a landing page pública (Vercel) ao CRM via uma rota de captura — depende da migração futura do usuário para uma VPS própria com domínio

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Lead scoring por IA/ML | Anti-feature confirmada pela pesquisa (FEATURES.md) — complexidade desproporcional pra um admin único; regra determinística (TEMP-01) já cobre a necessidade real |
| Envio automático real da sequência de follow-up (sem clique) | Contradiz a decisão de projeto de nunca automatizar envio de WhatsApp (ver `CLAUDE.md`/PROJECT.md Constraints) — SEQ-02 só sugere a data, o envio continua manual via wa.me |
| Atribuição/leaderboard por vendedor | Não há time — ferramenta é single-admin |
| Sistema de tarefas completo (subtarefas, prioridade, recorrência) | TAREFA-01/02 cobrem a necessidade real (tarefa solta com data); o resto é overkill de PM tool pra 1 usuário |
| Cadência de follow-up configurável por lead individual | SEQ-01 é uma sequência global — configuração por lead é complexidade que ninguém pediu ainda |
| Dashboard de BI completo (gráficos avançados, drill-down) | METRICAS-01/02 usam tabela/números — lib de gráfico (`recharts`) fica adiável pra quando o admin sentir falta na prática (ver STACK.md) |
| Tabela `origens` governada substituindo `leads.origem` | Considerada (ver `.planning/research/SUMMARY.md` Gaps) e descartada em favor da coluna `origemTipo` mais simples — `origem` livre continua em uso como variável `{origem}` nos templates de WhatsApp |
| Governança formal de `motivoPerda` (enum) | Mesma classe de problema do `origem`, mas adiada pra decisão explícita na Fase 5 (relatório de motivos de perda) — pode virar normalização leve (trim/lower) em vez de campo governado, dependendo do quanto o texto livre fragmentar o relatório na prática |

## Traceability

Preenchido pelo roadmapper na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORIGEM-01 | TBD | Pending |
| ORIGEM-02 | TBD | Pending |
| ORIGEM-03 | TBD | Pending |
| TIMELINE-01 | TBD | Pending |
| TIMELINE-02 | TBD | Pending |
| SEQ-01 | TBD | Pending |
| SEQ-02 | TBD | Pending |
| SEQ-03 | TBD | Pending |
| METRICAS-01 | TBD | Pending |
| METRICAS-02 | TBD | Pending |
| PERDA-01 | TBD | Pending |
| TAREFA-01 | TBD | Pending |
| TAREFA-02 | TBD | Pending |

**Coverage:**
- v1.3 requirements: 13 total
- Mapped to phases: 0 (roadmap pendente)
- Unmapped: 13 ⚠️ (normal antes da criação do roadmap)

---
*Requirements defined: 2026-08-01*
*Last updated: 2026-08-01 after research + requirement scoping (milestone v1.3)*
