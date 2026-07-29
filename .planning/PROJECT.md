# CRM de Leads — Área da Saúde

## Current Milestone: v1.1 Importação Inteligente

**Goal:** O CSV de prospecção gerado pela skill que o admin roda no cowork desktop (com colunas de inteligência: score, sinal_dor, trecho_dor, observacao) entra no CRM sem perder o sinal de priorização, mantendo tudo local (sem hospedagem na nuvem).

**Target features:**
- Wizard de importação passa a aceitar mapear MÚLTIPLAS colunas de origem concatenadas automaticamente em notas (formatado e legível), além do mapeamento 1-pra-1 já existente
- Mapeamento categoria→sub-nicho continua funcionando como hoje (sem mudança)

**Fora de escopo neste milestone:** conectar a landing page pública (Vercel) ao CRM — adiado para quando houver tráfego pago e a migração planejada para VPS própria com domínio; demais itens do backlog (sequência de follow-up escalonada, contador de tentativas, tela de dias-parado configurável, porta de entrada local para IA) ficam para v1.2+.

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
- ✓ Admin pode importar uma lista de leads via CSV do cowork, com mapeamento de colunas, preview e detecção automática de separador/codificação — v1.0 (Fase 2)
- ✓ Cada lead tem um sub-nicho da área da saúde numa lista administrável e extensível, com remoção reversível (soft-delete) — v1.0 (Fase 1 + quick task 260725-lai)
- ✓ Admin pode cadastrar novos sub-nichos livremente — v1.0 (Fase 1)
- ✓ Admin pode filtrar/organizar leads por sub-nicho — v1.0 (Fase 1)
- ✓ Cada lead registra notas, data de follow-up, canal, origem, valor estimado — v1.0 (Fase 1)
- ✓ Admin recebe destaque visual de follow-up vencido/próximo, via dashboard agrupado por urgência como tela inicial — v1.0 (Fase 4)
- ✓ Admin pode cadastrar templates de WhatsApp com variáveis — v1.0 (Fase 4)
- ✓ Ao criar/importar um lead novo, o sistema sugere abrir o WhatsApp com o template de primeiro contato preenchido — v1.0 (Fase 4)
- ✓ Dashboard e pipeline oferecem botão inline "Enviar WhatsApp" com preview editável, disparo sempre por clique manual — v1.0 (Fase 4)

### Active

Escopo do milestone v1.1 em andamento (ver `Current Milestone` acima):

- [ ] Wizard de importação aceita mapear múltiplas colunas de origem (score/sinal_dor/trecho_dor/observação) concatenadas em notas, sem perder a inteligência de priorização do CSV do cowork

Candidatos levantados numa sessão de ideias (2026-07-25), ainda não formalizados em fases — ficam para v1.2+:

- [ ] Sequência de follow-up escalonada (intervalos crescentes configuráveis) com templates de reforço de valor/prova social
- [ ] Auto-avançar etapa Novo→Contatado ao clicar em "Abrir WhatsApp" de verdade (hoje é só preview)
- [ ] Contador de tentativas de contato por lead (`contactAttempts`/`lastContactedAt`)
- [ ] Tela de configuração de dias-parado por etapa (customizável, hoje é hardcoded)
- [ ] Porta de entrada local (sem auth, só localhost) para uma IA cadastrar leads automaticamente
- [ ] Conectar a landing page pública (Vercel) ao CRM — adiado deliberadamente pelo usuário (2026-07-29) até haver tráfego pago; quando chegar a hora, será junto da migração de todos os projetos dele para uma VPS própria com domínio, não uma integração isolada

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
- **Estado pós-v1.0 (2026-07-29):** app rodando localmente (`localhost:3000`), ~7.300 linhas TS/TSX em `src/`, Next.js 16 + Drizzle/SQLite + shadcn-on-Base-UI. Usuário já começou a prospectar de verdade a partir de 2026-07-27, mas a captura de leads ainda não conecta automaticamente ao CRM (cadastro manual por enquanto — ver Active acima). Débito conhecido: Fases 1 e 2 nunca tiveram checagem manual no navegador; Fase 4 tem 7 cenários de UAT ainda não confirmados no navegador (ver `STATE.md` Deferred Items).

## Constraints

- **Escopo de uso**: Ferramenta solo (um único admin), sem necessidade de autenticação multi-usuário — evita complexidade desnecessária de contas/permissões
- **Plataforma**: Acesso via navegador no computador — não é necessário app mobile nativo
- **WhatsApp**: Sem integração com API oficial de envio — usar link wa.me com mensagem pré-preenchida, evitando custo e burocracia de conta WhatsApp Business API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Templates fixos de WhatsApp (não IA generativa) no v1 | Mais simples e rápido de construir; IA personalizada por lead considerada mas adiada para reduzir complexidade inicial | ✓ Good — shipado na Fase 4, IA segue em v2 |
| Link wa.me pré-preenchido em vez de envio automático via API | Evita custo e burocracia de conta WhatsApp Business API; usuário confirma e envia manualmente | ✓ Good — shipado na Fase 4 |
| Sub-nichos como lista extensível (não fixa) | Usuário atende diferentes sub-nichos da área da saúde e espera que a lista cresça com o tempo | ✓ Good — shipado na Fase 1, remoção soft-delete adicionada depois |
| Instalação do GSD local por projeto (não global) | Preferência do usuário por manter cada projeto isolado e explícito | ✓ Good |
| Nunca hard-delete — soft-delete (`deletedAt`) é o padrão do projeto para toda entidade removível | Recuperação sempre possível, guard automatizado (`npm run guard:no-hard-delete`) impede regressão | ✓ Good — aplicado a leads (LEAD-04) e sub-nichos (quick 260725-lai) |
| Host de desenvolvimento com 4GB de RAM — comandos de verificação sempre sequenciais, nunca em paralelo/background | Builds/dev-server simultâneos já causaram OOM e crash de worktrees isolados mais de uma vez durante o v1.0 | ✓ Good — seguido à risca desde então |

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
*Last updated: 2026-07-29 — v1.1 milestone started*
