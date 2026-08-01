# CRM de Leads — Área da Saúde

## Current Milestone: v1.2 Follow-up Automático — ✅ CONCLUÍDO (2026-08-01)

**Goal:** Reduzir a manutenção manual do pipeline — o sistema acompanha contato e tempo parado sozinho, avisando quando algo precisa de atenção, em vez de depender só da memória do admin.

**Entregue (Fases 6 e 7):**
- Auto-avançar etapa Novo→Contatado ao clicar em "Abrir WhatsApp" com o template de primeiro contato (todas as telas, toast de confirmação, sem regredir/re-avançar leads já além de Contatado) — Fase 6
- Contador de tentativas de contato por lead — incrementa a todo clique em "Abrir WhatsApp" (qualquer template), visível no card do pipeline — Fase 6
- Configuração de dias-parado por etapa em `/configuracoes` — generaliza o "esfriando" antes hardcoded (só Contatado, 5 dias fixo) para Novo/Contatado/Negociação, cada uma com seu N configurável — Fase 7, UAT humano 6/6 via browser real em 2026-08-01

Publicado no GitHub (`github.com/Marques10604/CRM-WhiteLabel`, branch `main`) em 2026-08-01 — primeiro push do projeto.

**Próximo milestone (v1.3): ainda não iniciado.** Ver seção `Active` abaixo — backlog priorizado por uma varredura de ideias em 2026-08-01, aguardando `/gsd-new-milestone` pra formalizar escopo.

**Milestone anterior (v1.1 Importação Inteligente):** concluído em 2026-07-30, Fase 5 — wizard de importação passou a concatenar múltiplas colunas de origem do CSV do cowork em notas formatadas (IMPORT-04/IMPORT-05).

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
- ✓ Wizard de importação aceita mapear múltiplas colunas de origem (score/sinal_dor/trecho_dor/observação) concatenadas em notas, sem perder a inteligência de priorização do CSV do cowork — v1.1 (Fase 5), IMPORT-04/IMPORT-05, confirmado por teste real de navegador (todos os 7 passos do human-check)
- ✓ Auto-avançar etapa Novo→Contatado ao clicar em "Abrir WhatsApp" com o template de primeiro contato, em todas as telas com o botão, sem regredir/re-avançar leads já além de Contatado, com toast de confirmação — v1.2 (Fase 6)
- ✓ Contador de tentativas de contato por lead — incrementa a todo clique em "Abrir WhatsApp" (qualquer template), exibido no card do pipeline — v1.2 (Fase 6)
- ✓ Tela `/configuracoes` para definir dias-parado por etapa (Novo/Contatado/Negociação), generalizando o "esfriando" hardcoded (antes só Contatado, 5 dias fixo) — v1.2 (Fase 7), UAT humano 6/6 via browser real em 2026-08-01

### Active

Nenhum item de milestone em execução no momento (v1.2 concluído em 2026-08-01, v1.3 ainda não iniciado).

**Backlog priorizado — varredura de ideias de 2026-08-01** (`C:\Users\Vencedor\Desktop\Ideias.txt`, registrado em `.planning/todos/pending/` e `.planning/seeds/`; nada implementado ainda, só registrado):

*Alto valor — candidatos a próximas fases, em ordem de prioridade:*
1. [ ] Separação Inbound × Outbound (fila/tratamento diferente por origem do lead) — [todo](.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md)
2. [ ] Timeline de interações por lead — [todo](.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md)
3. [ ] Sequência de follow-up escalonada (intervalos crescentes configuráveis) com templates de reforço de valor/prova social — [todo](.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md) (pendência original de 2026-07-21, reordenada nesta varredura)
4. [ ] Painel de métricas por origem e sub-nicho — [todo](.planning/todos/pending/2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho.md)
5. [ ] Relatório de motivos de perda — [todo](.planning/todos/pending/2026-08-01-relat-rio-de-motivos-de-perda.md)
6. [ ] Agenda/tarefas soltas (não amarradas a um lead) — [todo](.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md)

*Ideias PME — avaliar prioridade, não urgentes:* tags livres, temperatura automática do lead, busca global, exportar dados em CSV, anexo simples por lead, campo de vendedor responsável (só coluna no banco, sem UI), meta mensal com barra de progresso — todos individuais em `.planning/todos/pending/2026-08-01-*.md`

*Fora do milestone atual, também herdadas de sessões anteriores:*
- [ ] Porta de entrada local (sem auth, só localhost) para uma IA cadastrar leads automaticamente — decisão já tomada: só local, sem deploy
- [ ] Conectar a landing page pública (Vercel) ao CRM — adiado deliberadamente pelo usuário até haver tráfego pago; quando chegar a hora, será junto da migração de todos os projetos dele para uma VPS própria com domínio, não uma integração isolada (IMPORT-V2-02)

*Adiado com gatilho explícito (seeds, surgem automaticamente em `/gsd-new-milestone`):*
- Roadmap pós-cliente-pagante (proposta/orçamento, catálogo de produtos, pós-venda) — [SEED-001](.planning/seeds/SEED-001-roadmap-p-s-cliente-pagante.md)
- Infra white label / multi-tenant (login, feature flags por nicho, nomenclatura dinâmica, theming, cobrança recorrente, agentes de IA por empresa) — [SEED-002](.planning/seeds/SEED-002-infra-white-label.md), tratado como **outro produto**, não como fase deste CRM

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
- **Nomenclatura de schema**: Nunca cravar termos específicos do nicho de saúde (ex. "paciente", "consulta") direto em nomes de tabela/coluna — usar nomes genéricos ("lead", "contato", etc.), mesmo o projeto sendo single-nicho hoje. Custo de seguir essa regra é zero agora; custo de não seguir é uma reescrita de banco inteira se um dia isso virar white label (ver [[SEED-002]]). Regra permanente, não um item de backlog a ser "concluído".

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
*Last updated: 2026-08-01 — v1.2 concluído e publicado no GitHub; backlog v1.3 registrado a partir de varredura de ideias externa*
