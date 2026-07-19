# Requirements: CRM de Leads — Área da Saúde

**Defined:** 2026-07-19
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Leads & Sub-nichos

- [ ] **LEAD-01**: Admin pode cadastrar/editar um lead com nome, telefone, canal de contato, origem, valor estimado, notas, data de follow-up e etapa
- [ ] **LEAD-02**: Admin pode cadastrar e renomear sub-nichos numa lista administrável (evita duplicatas como "Nutri" e "nutricionista")
- [ ] **LEAD-03**: Cada lead pertence a exatamente um sub-nicho da lista administrável
- [ ] **LEAD-04**: Exclusão de lead é soft-delete — nunca apaga de forma definitiva, pode ser recuperado
- [ ] **LEAD-05**: Cada lead importado é rastreado com o lote (batch) de importação de origem

### Importação CSV

- [ ] **IMPORT-01**: Admin pode importar leads via arquivo CSV com mapeamento de colunas e preview antes de confirmar
- [ ] **IMPORT-02**: Sistema detecta e avisa sobre leads duplicados (por telefone) antes de confirmar a importação
- [ ] **IMPORT-03**: Sistema detecta automaticamente delimitador (vírgula/ponto-e-vírgula) e codificação de exportações CSV brasileiras (Excel pt-BR)

### Pipeline

- [ ] **PIPE-01**: Board com 4 etapas fixas (Novo, Contatado, Negociação, Fechado/Perdido) com contagem de leads por etapa
- [ ] **PIPE-02**: Admin pode mover um lead entre etapas via arrastar-e-soltar (drag-and-drop)
- [ ] **PIPE-03**: Sistema destaca leads "esfriando" — parados há muito tempo em "Contatado" sem atividade recente

### Lembretes de Follow-up

- [ ] **REMIND-01**: Tela inicial do CRM mostra painel de follow-ups vencidos/próximos como visão padrão ao abrir o sistema (não um filtro que precisa ser aplicado)
- [ ] **REMIND-02**: Admin pode ver lista de todos os leads, filtrável e ordenável por sub-nicho, etapa e data de follow-up

### Templates de WhatsApp

- [ ] **WA-01**: Admin pode criar e editar templates de mensagem do WhatsApp com variáveis (ex: {nome})
- [ ] **WA-02**: Sistema gera link wa.me com a mensagem do template preenchida e corretamente codificada (acentos, emojis, quebras de linha) e número de telefone brasileiro normalizado
- [ ] **WA-03**: Admin pode visualizar preview da mensagem final (variáveis já preenchidas) antes de abrir o WhatsApp
- [ ] **WA-04**: Ao importar um lead novo, sistema sugere automaticamente abrir o WhatsApp com o template de primeiro contato
- [ ] **WA-05**: Botão de enviar WhatsApp aparece inline na lista de lembretes e no card do pipeline

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Leads & Sub-nichos

- **LEAD-V2-01**: Admin pode mesclar/desativar sub-nichos já existentes

### Pipeline

- **PIPE-V2-01**: Soma de valor estimado por etapa (roll-up)
- **PIPE-V2-02**: Histórico de notas com timestamp por lead

### Mensageria

- **WA-V2-01**: Mensagem gerada por IA personalizada por lead (em vez de template fixo)

### Análise

- **STATS-V2-01**: Relatórios/analytics além de contagem por etapa e valor

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Envio automático de WhatsApp via API (Business API/Twilio) | Evita custo e burocracia de conta oficial; link wa.me com envio manual é suficiente |
| Mensagem gerada por IA em tempo real | Considerado, mas adiado para reduzir complexidade do v1 (ver v2) |
| Multi-usuário / autenticação de equipe | Ferramenta pessoal de um único admin, sem necessidade de contas/permissões |
| App mobile nativo | Uso previsto é via navegador no computador |
| Hospedagem na nuvem | Uso local no mesmo computador; evita custo/conta de hospedagem e necessidade de gate de acesso |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEAD-01 | TBD | Pending |
| LEAD-02 | TBD | Pending |
| LEAD-03 | TBD | Pending |
| LEAD-04 | TBD | Pending |
| LEAD-05 | TBD | Pending |
| IMPORT-01 | TBD | Pending |
| IMPORT-02 | TBD | Pending |
| IMPORT-03 | TBD | Pending |
| PIPE-01 | TBD | Pending |
| PIPE-02 | TBD | Pending |
| PIPE-03 | TBD | Pending |
| REMIND-01 | TBD | Pending |
| REMIND-02 | TBD | Pending |
| WA-01 | TBD | Pending |
| WA-02 | TBD | Pending |
| WA-03 | TBD | Pending |
| WA-04 | TBD | Pending |
| WA-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️ (roadmap not yet created)

---
*Requirements defined: 2026-07-19*
*Last updated: 2026-07-19 after initial definition*
