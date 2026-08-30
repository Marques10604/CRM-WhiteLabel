# Requirements: CRM de Leads

**Defined:** 2026-08-30
**Milestone:** v1.4 CRM Genérico Multi-Nicho (despivô)
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.4 Requirements

Escopo do milestone v1.4 — despivotar o CRM de "área da saúde" para uma ferramenta que serve leads de qualquer nicho. É rename + reframe + 2 adições pequenas, sobre padrões que já existem no código.

### Nicho

- [ ] **NICHO-01**: O campo hoje chamado "sub-nicho" passa a se chamar "nicho" em todo o sistema — coluna do banco, tipos, filtro da lista de leads, formulário de lead, wizard de importação CSV e relatórios — como lista plana, sem hierarquia nicho-pai/nicho-filho
- [ ] **NICHO-02**: A rota `/subnichos` passa a ser `/nichos`, mantendo o CRUD atual: criar, renomear, remover com soft-delete e reativar por nome; o item do menu lateral acompanha

### Copy

- [ ] **COPY-01**: Nenhum label, placeholder, texto de ajuda, exemplo ou estado vazio visível no app menciona "área da saúde", usa "nutricionista"/"terapeuta" como categoria fixa, ou pressupõe um nicho-pai — a copy serve qualquer nicho

### Relatórios

- [ ] **METRICAS-03**: Em `/relatorios`, o admin pode informar um intervalo de datas customizado (data de início e data de fim) além dos presets 30d/90d/tudo, e as três seções (leads por origem, leads por nicho, motivos de perda) respeitam esse intervalo

### Lead

- [ ] **LEAD-06**: Cada lead tem um campo opcional "interesse" (o que o lead quer / serviço desejado, texto livre), editável no formulário de lead e mapeável como coluna no wizard de importação CSV

## Future Requirements

Reconhecidos, não neste milestone.

### Handoff Prospector → CRM

- **HANDOFF-01**: Rota de entrada (API local) para o Prospector Inteligente AI cadastrar leads automaticamente
- **HANDOFF-02**: Deduplicação de lead por telefone na entrada automática
- **HANDOFF-03**: Handoff rico — o lead entra em "Contatado" já com as interações do Prospector na timeline

*Gatilho: o Prospector existir + a decisão de VPS único (resolve o conflito local-vs-público, Gap 4).*

### Teste de nicho formal

- **CAMPANHA-01**: Entidade "campanha / janela de teste" (nicho + data início/fim + meta de conversão + notas) com conversão agregada por janela no relatório

*Gatilho: depois de rodar alguns testes de nicho reais, se o nicho plano + filtro de intervalo (METRICAS-03) não bastar.*

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migração hierárquica nicho > sub-nicho (2 níveis) | Sem hierarquia natural entre nichos irmãos ("dentista", "e-commerce", "academia"); 2 níveis = migração a mais + 2ª tela de gestão + complexidade em todo filtro, sem ganho pra ferramenta solo |
| Rebranding visual / novo nome de app | O app já se chama "CRM LEADS" (genérico); nenhum trabalho de marca necessário |
| Duração de janela de teste embutida no produto (90d/45d fixo) | Decisão de negócio do admin, muda por experimento; o filtro de intervalo (METRICAS-03) deixa ele escolher qualquer janela |
| Handoff rico Prospector→CRM neste milestone | O Prospector ainda não existe; construir contra um consumidor inexistente é trabalho especulativo (ver Future: HANDOFF-01..03) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NICHO-01 | Phase 13 | Pending |
| NICHO-02 | Phase 13 | Pending |
| COPY-01 | Phase 13 | Pending |
| METRICAS-03 | Phase 14 | Pending |
| LEAD-06 | Phase 15 | Pending |

**Coverage:**
- v1.4 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-30*
*Last updated: 2026-08-30 after initial definition (milestone v1.4)*
