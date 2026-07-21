# CRM de Leads — Área da Saúde

## What This Is

CRM pessoal para um único usuário (o admin) organizar leads da área da saúde, recebidos em lote via CSV de um cowork parceiro. Os leads são categorizados por sub-nicho (nutricionista, terapeuta, etc.) e avançam por um pipeline de vendas simples até o fechamento. O admin aborda os leads pelo Instagram e WhatsApp, usando templates de mensagem prontos para agilizar o contato.

## Core Value

Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets que hoje causa desorganização e esquecimento de contatos.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Cada lead segue um pipeline com etapas: Novo → Contatado → Negociação → Fechado / Perdido (Validado na Fase 3 — etapa combinada desmembrada em Fechado e Perdido distintos, decisão D-01 em `03-CONTEXT.md`)
- Admin pode mover um lead entre etapas do pipeline (Validado na Fase 3 — drag-and-drop com @dnd-kit e reversão automática em falha)
- Admin visualiza o funil de vendas (quantos leads em cada etapa) de forma rápida (Validado na Fase 3 — board Kanban em `/pipeline`, contagem ao vivo por coluna)

### Active

- [ ] Admin pode importar uma lista de leads via arquivo CSV (entregue pelo cowork)
- [ ] Cada lead tem um sub-nicho da área da saúde (nutricionista, terapeuta, etc.)
- [ ] Admin pode cadastrar novos sub-nichos livremente (lista cresce com o tempo, não é fixa)
- [ ] Admin pode filtrar/organizar leads por sub-nicho
- [ ] Cada lead registra: notas livres, data do próximo follow-up, canal de contato (Instagram/WhatsApp), origem, valor estimado do negócio
- [ ] Admin recebe algum destaque/lembrete visual de leads com follow-up vencido ou próximo (nota: leads "esfriando" por etapa parada já implementado na Fase 3; alerta específico de follow-up vencido/próximo ainda pendente — Fase 4)
- [ ] Admin pode cadastrar templates fixos de mensagem de WhatsApp com variáveis (ex: {nome}, sub-nicho/contexto)
- [ ] Ao importar um lead novo, o sistema sugere abrir o WhatsApp com o template de primeiro contato preenchido (link pronto, envio manual — sem API de envio automático)
- [ ] O dashboard de follow-ups lista os leads com follow-up vencido/próximo e oferece um botão inline "Enviar WhatsApp" que o admin clica para abrir o WhatsApp com o template de follow-up preenchido (link pronto, envio manual — dashboard mostra o que está pendente e o disparo é sempre por clique do admin, sem gatilho automático por data)

### Out of Scope

- Envio automático de WhatsApp via API (Business API/Twilio) sem clique manual — usuário decidiu por link pronto (wa.me) em vez de envio automatizado, mais simples e sem custo/burocracia de API oficial
- Mensagem gerada por IA em tempo real personalizada por lead — usuário considerou, mas decidiu começar com templates fixos no v1; IA fica como possível v2
- Múltiplos usuários/equipe — é uma ferramenta pessoal de um único admin, sem necessidade de contas/permissões de time
- Uso mobile nativo — uso previsto é via navegador no computador

## Context

- Usuário é o próprio profissional (admin) que atua na área da saúde, atendendo diferentes sub-nichos (nutricionista, terapeuta, e outros que podem surgir)
- Hoje os leads são organizados manualmente em planilha do Google Sheets — processo desorganizado, com esquecimento frequente de follow-up
- Leads chegam em lote via CSV, entregues por um cowork parceiro
- Abordagem dos leads acontece via Instagram e WhatsApp
- Usuário quer aumentar produtividade substituindo a planilha por uma ferramenta dedicada

## Constraints

- **Escopo de uso**: Ferramenta solo (um único admin), sem necessidade de autenticação multi-usuário — evita complexidade desnecessária de contas/permissões
- **Plataforma**: Acesso via navegador no computador — não é necessário app mobile nativo
- **WhatsApp**: Sem integração com API oficial de envio — usar link wa.me com mensagem pré-preenchida, evitando custo e burocracia de conta WhatsApp Business API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Templates fixos de WhatsApp (não IA generativa) no v1 | Mais simples e rápido de construir; IA personalizada por lead considerada mas adiada para reduzir complexidade inicial | — Pending |
| Link wa.me pré-preenchido em vez de envio automático via API | Evita custo e burocracia de conta WhatsApp Business API; usuário confirma e envia manualmente | — Pending |
| Sub-nichos como lista extensível (não fixa) | Usuário atende diferentes sub-nichos da área da saúde e espera que a lista cresça com o tempo | — Pending |
| Instalação do GSD local por projeto (não global) | Preferência do usuário por manter cada projeto isolado e explícito | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-21 after Phase 3 (Sales Pipeline & Funnel View) completion*
