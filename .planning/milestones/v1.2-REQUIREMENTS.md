# Requirements: CRM de Leads — Área da Saúde

**Defined:** 2026-07-30
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.2 Requirements

Requisitos para o milestone v1.2 (Follow-up Automático). Cada um mapeia para uma fase do roadmap.

### WhatsApp / Contato

- [x] **WA-06**: Ao clicar em "Abrir WhatsApp" com o template de primeiro contato, um lead na etapa "Novo" avança automaticamente para "Contatado", com toast de confirmação — vale em todas as telas onde o botão de WhatsApp aparece (dashboard, pipeline, lista de leads, pós-importação)
- [x] **WA-07**: O auto-avanço nunca regride nem re-avança um lead que já passou de "Contatado" — só dispara a partir da etapa "Novo"
- [x] **WA-08**: Todo clique em "Abrir WhatsApp" (qualquer template, em qualquer etapa do lead) incrementa um contador de tentativas de contato por lead, visível no card do pipeline

### Configurações

- [x] **CONFIG-01**: Admin acessa uma tela `/configuracoes` para definir quantos dias um lead pode ficar parado em cada etapa (Novo, Contatado, Negociação) antes de ser destacado como "esfriando"
- [x] **CONFIG-02**: A configuração substitui o valor hardcoded atual (5 dias, só etapa Contatado) sem mudar o comportamento no dia do deploy — o valor de Contatado nasce pré-preenchido com 5

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Backlog (sessão de ideias 2026-07-25)

- **FOLLOWUP-01**: Sequência de follow-up escalonada (intervalos crescentes configuráveis) com templates de reforço de valor/prova social
- **LEAD-05**: Porta de entrada local (sem auth, só localhost) para uma IA cadastrar leads automaticamente
- **IMPORT-V2-02**: Conectar a landing page pública (Vercel) ao CRM via uma rota de captura — depende da migração futura do usuário para uma VPS própria com domínio
- **IMPORT-V2-01**: Campo de prioridade/score dedicado no lead (visível na lista e no pipeline), não apenas texto solto em notas

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-avanço em qualquer clique de template (não só primeiro_contato) | Decisão explícita do usuário (2026-07-30) — só o primeiro contato representa "contatar" o lead pela primeira vez |
| Tratar clique no link wa.me como confirmação de mensagem enviada | Não há integração com WhatsApp Business API (fora de escopo do projeto todo) — clique só prova que o link foi aberto, nunca que a mensagem foi enviada. Pesquisa (PITFALLS.md) confirma: gate deve ficar restrito a Novo→Contatado, nunca tratado como fato irreversível |
| Escalonamento visual/lógico do contador de tentativas (cores, "desistir automaticamente") | Anti-feature identificado em FEATURES.md — um admin solo não precisa que o contador tome decisões por ele, só que mostre o número |
| Thresholds de dias-parado por sub-nicho | Fora do escopo — configuração é só por etapa do pipeline, não por sub-nicho |
| Notificações/e-mail sobre lead esfriando | Fora do escopo — o destaque visual no pipeline já é o mecanismo de aviso |
| Auto-avanço além da etapa Contatado (Negociação→Fechado, etc.) | Fora do escopo — só o gargalo Novo→Contatado (primeiro contato) foi endereçado neste milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WA-06 | Phase 6 | Complete |
| WA-07 | Phase 6 | Complete |
| WA-08 | Phase 6 | Complete |
| CONFIG-01 | Phase 7 | Complete |
| CONFIG-02 | Phase 7 | Complete |

**Coverage:**
- v1.2 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-30*
*Last updated: 2026-07-30 after v1.2 requirements definition*
