# Requirements: CRM de Leads — Área da Saúde

**Defined:** 2026-07-29
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.1 Requirements

Requisitos para o milestone v1.1 (Importação Inteligente). Cada um mapeia para uma fase do roadmap.

### Importação CSV

- [ ] **IMPORT-04**: Admin pode mapear múltiplas colunas de origem do CSV (ex: `score`, `sinal_dor`, `trecho_dor`, `observacao` — colunas de inteligência geradas pela skill de prospecção do cowork) para serem concatenadas automaticamente em um único campo de notas formatado e legível no lead importado, sem perder nenhuma coluna mapeada
- [ ] **IMPORT-05**: O mapeamento de colunas múltiplas para notas é opcional e compatível com o mapeamento 1-pra-1 já existente — CSVs simples (uma coluna de notas só) continuam funcionando exatamente como hoje

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Importação / Prospecção

- **IMPORT-V2-01**: Campo de prioridade/score dedicado no lead (visível na lista e no pipeline), não apenas texto solto em notas
- **IMPORT-V2-02**: Conectar a landing page pública (Vercel) ao CRM via uma rota de captura — depende da migração futura do usuário para uma VPS própria com domínio

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hospedagem na nuvem / rota pública de captura para a landing page | Adiado deliberadamente pelo usuário (2026-07-29) até haver tráfego pago; será parte da migração futura de todos os projetos dele para uma VPS própria com domínio, não uma integração isolada agora — mantém a restrição "sem hospedagem na nuvem" do `PROJECT.md` |
| Sequência de follow-up escalonada, contador de tentativas de contato, tela de dias-parado configurável, porta de entrada local para IA cadastrar leads | Candidatos válidos da sessão de ideias de 2026-07-25, mas fora do escopo deste milestone por decisão explícita do usuário — ficam para v1.2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMPORT-04 | TBD | Pending |
| IMPORT-05 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 2 total
- Mapped to phases: 0
- Unmapped: 2 ⚠️ (roadmap not yet created)

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-29 after initial v1.1 definition*
