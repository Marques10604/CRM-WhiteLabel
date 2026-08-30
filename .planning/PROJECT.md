# CRM de Leads

## Current Milestone: v1.4 CRM Genérico Multi-Nicho (despivô)

**Goal:** Tirar o CRM da amarra "área da saúde" — o admin usa a mesma ferramenta pra leads de qualquer nicho (empresa de serviços de automação/IA, nichos rotativos vindos do futuro Prospector), e o relatório responde "esse nicho converteu na janela que testei?".

**Target features:**
- Renomear `sub-nicho → nicho` (lista plana, sem hierarquia) — migração de coluna + tipos + Zod + `/subnichos` → `/nichos` + varredura de toda a copy que menciona "saúde"
- Filtro de intervalo customizado (início–fim arbitrário) em `/relatorios`, além dos presets rolantes — pra avaliar qualquer janela de teste de nicho (45d, 90d, o que for), sem o produto impor duração
- Campo "interesse / serviço desejado" no lead — opcional no cadastro, útil no uso manual hoje para uma empresa de serviços, e já pronto pro Prospector preencher depois

**Key context:**
- É **rename + reframe + 2 adições pequenas, não rebuild**. O modelo de dados já é agnóstico de nicho (constraint permanente de nomenclatura): `sub-nicho` já era lista livre, pipeline/origem/follow-up/motivo de perda/templates já são genéricos. O que é "de saúde" é raso: moldura do PROJECT.md, o nome do campo, a copy da UI, os seeds.
- **Fora deste milestone:** handoff rico Prospector→CRM (rota de API, dedup por telefone) — o Prospector ainda não existe e o conflito local-vs-público resolve na migração pro VPS único; entidade "campanha/janela de teste" formal — o nicho plano + filtro de intervalo cobre a necessidade real, revisitar se depois de rodar testes reais faltar registrar a janela com meta/notas.

## Current State

**Shipado:** v1.3 Qualificação e Histórico de Leads (2026-08-30) — Fases 8-12, 20 planos. PRs #1/#2/#3 mergeados em `main`.

**O que o v1.3 entregou:**
- **Origem governada** — cada lead tem um campo dedicado `origemTipo` (Inbound/Outbound) separado do texto livre `origem`; a automação de sequência não trata lead quente (tráfego pago) como frio.
- **Timeline de interações** — todo clique de WhatsApp e toda nota manual viram registro cronológico visível na tela do lead; eventos automáticos imutáveis, notas manuais editáveis.
- **Sequência de follow-up escalonada** — intervalos crescentes configuráveis, `sequenciaPosicao` anda sozinho por clique de template `follow_up`, sugestão da próxima data calculada na leitura (nunca agendada); leads Inbound de fora.
- **Painel `/relatorios`** — leads/conversão por origem e sub-nicho + contagem de perdidos por motivo; motivo de perda virou lista governada obrigatória (`/motivos-perda`), não mais texto livre.
- **Agenda / tarefas soltas** — tarefa avulsa com data e descrição, sem vínculo a lead, intercalada por data com os follow-ups no dashboard.

**Próximo milestone:** a definir via `/gsd-new-milestone`. Candidato principal registrado: **despivô saúde → CRM pessoal genérico multi-nicho** (o modelo de dados já é agnóstico de nicho por constraint permanente). Backlog PME em `.planning/todos/pending/`.

<details>
<summary>Milestones anteriores</summary>

- **v1.0 MVP** (2026-07-29, Fases 1-4) — pipeline Kanban, import CSV, dashboard de follow-up por urgência, templates de WhatsApp com wa.me.
- **v1.1 Importação Inteligente** (2026-07-30, Fase 5) — wizard aceita mapear múltiplas colunas de inteligência do CSV do cowork concatenadas em notas.
- **v1.2 Follow-up Automático** (2026-08-01, Fases 6-7) — auto-avanço Novo→Contatado ao abrir WhatsApp, contador de tentativas, `/configuracoes` de dias-parado por etapa.

</details>

## What This Is

CRM pessoal para um único usuário (o admin) organizar leads da área da saúde, recebidos em lote via CSV de um cowork parceiro. Os leads são categorizados por sub-nicho (nutricionista, terapeuta, etc.), classificados por origem (Inbound/Outbound), e avançam por um pipeline de vendas simples até o fechamento. O admin aborda os leads pelo Instagram e WhatsApp usando templates prontos; cada abordagem fica registrada numa timeline por lead. Uma sequência de follow-up escalonada sugere quando reabordar, e uma tela de relatórios mostra de onde vêm as vendas e as perdas.

## Core Value

Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets que hoje causa desorganização e esquecimento de contatos.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Cada lead segue um pipeline com etapas: Novo → Contatado → Negociação → Fechado / Perdido — v1.0 (Fase 3)
- Admin pode mover um lead entre etapas do pipeline (drag-and-drop, reversão automática em falha) — v1.0 (Fase 3)
- Admin visualiza o funil de vendas de forma rápida (board Kanban `/pipeline`, contagem ao vivo) — v1.0 (Fase 3)
- ✓ Admin pode importar leads via CSV do cowork, com mapeamento de colunas, preview e detecção de separador/codificação — v1.0 (Fase 2)
- ✓ Cada lead tem um sub-nicho numa lista administrável e extensível, com remoção reversível — v1.0 (Fase 1 + quick 260725-lai)
- ✓ Admin pode cadastrar/filtrar/organizar por sub-nicho — v1.0 (Fase 1)
- ✓ Cada lead registra notas, data de follow-up, canal, origem, valor estimado — v1.0 (Fase 1)
- ✓ Dashboard agrupado por urgência como tela inicial, com destaque de follow-up vencido/próximo — v1.0 (Fase 4)
- ✓ Templates de WhatsApp com variáveis; sugestão de primeiro contato ao criar/importar lead; botão inline "Enviar WhatsApp" com preview editável e disparo por clique manual — v1.0 (Fase 4)
- ✓ Wizard de importação aceita mapear múltiplas colunas de inteligência do CSV concatenadas em notas — v1.1 (Fase 5)
- ✓ Auto-avançar Novo→Contatado ao abrir WhatsApp com o template de primeiro contato, sem regredir/re-avançar leads além de Contatado — v1.2 (Fase 6)
- ✓ Contador de tentativas de contato por lead, exibido no card do pipeline — v1.2 (Fase 6)
- ✓ Tela `/configuracoes` para dias-parado por etapa (Novo/Contatado/Negociação) — v1.2 (Fase 7)
- ✓ Campo dedicado `origemTipo` (Inbound/Outbound) governado, separado do texto livre `origem`, com backfill dos leads existentes; exposto no modal de lead e persistido em todo import CSV — v1.3 (Fase 8), ORIGEM-01/02
- ✓ Timeline de interações por lead — todo clique de WhatsApp e nota manual viram registro cronológico visível; eventos automáticos imutáveis, notas manuais editáveis/apagáveis — v1.3 (Fase 9), TIMELINE-01/02
- ✓ Sequência de follow-up escalonada — intervalos crescentes configuráveis, `sequenciaPosicao` avança por clique de template `follow_up`, sugestão da próxima reabordagem calculada na leitura (nunca agendada); leads Inbound de fora — v1.3 (Fase 10), SEQ-01/02/03 + ORIGEM-03
- ✓ Painel `/relatorios` — leads/conversão por origem e por sub-nicho, contagem de perdidos por motivo, seletor de período por querystring — v1.3 (Fase 11), METRICAS-01/02
- ✓ Motivo de perda como lista governada obrigatória (`/motivos-perda`, soft-delete + reativação-por-nome), reforçado no servidor via `.refine` do Zod — v1.3 (Fase 11), PERDA-01
- ✓ Agenda / tarefas soltas — tarefa avulsa com data e descrição sem vínculo a lead, intercalada por data com os follow-ups no dashboard, na mesma régua de urgência — v1.3 (Fase 12), TAREFA-01/02

### Active

Escopo do milestone v1.4 (despivô — ver `Current Milestone` acima), Fases 13-15:

- [ ] Renomear `sub-nicho → nicho` em todo o sistema (schema, tipos, rotas, UI, copy)
- [ ] Varrer e neutralizar a copy "área da saúde" da UI e dos textos de ajuda
- [ ] Filtro de intervalo de datas customizado (início–fim) em `/relatorios`
- [ ] Campo "interesse / serviço desejado" no lead (opcional)

**Backlog registrado (2026-08-01, `C:\Users\Vencedor\Desktop\Ideias.txt`), fora do milestone v1.4:**

*Ideias PME — avaliar prioridade:* tags livres, temperatura automática do lead, busca global, exportar dados em CSV, anexo simples por lead, campo de vendedor responsável (só coluna no banco), meta mensal com barra de progresso — individuais em `.planning/todos/pending/2026-08-01-*.md`

*Herdadas de sessões anteriores:*
- [ ] Porta de entrada local (sem auth, só localhost) para uma IA cadastrar leads — decisão: só local, sem deploy
- [ ] Conectar a landing page pública (Vercel) ao CRM — adiado até haver tráfego pago; será junto da migração de todos os projetos do usuário para uma VPS própria (IMPORT-V2-02), não uma integração isolada

*Adiado com gatilho explícito (seeds, surgem em `/gsd-new-milestone`):*
- Roadmap pós-cliente-pagante (proposta/orçamento, catálogo, pós-venda) — [SEED-001](.planning/seeds/SEED-001-roadmap-p-s-cliente-pagante.md)
- Infra white label / multi-tenant — [SEED-002](.planning/seeds/SEED-002-infra-white-label.md), tratado como **outro produto**

### Out of Scope

- Envio automático de WhatsApp via API (Business API/Twilio) sem clique manual — link pronto wa.me é mais simples e sem custo/burocracia
- Mensagem gerada por IA em tempo real personalizada por lead — começou com templates fixos; usuário quer eventualmente que a IA rascunhe as mensagens de WhatsApp (não é v1.3, sem milestone ainda)
- Múltiplos usuários/equipe — ferramenta pessoal de um único admin
- Uso mobile nativo — uso previsto é via navegador no computador
- Sistema de tarefas completo (subtarefas, prioridade, recorrência) — TAREFA-01/02 cobrem a necessidade real (tarefa solta com data); o resto é overkill de PM tool pra 1 usuário

## Context

- Usuário é o próprio profissional (admin) da área da saúde, atendendo diferentes sub-nichos
- Leads chegam em lote via CSV entregue por um cowork parceiro; abordagem via Instagram e WhatsApp
- Hoje os leads eram organizados em planilha do Google Sheets — processo desorganizado, esquecimento frequente de follow-up
- **Estado pós-v1.3 (2026-08-30):** app roda localmente (`localhost:3000`), ~11.100 linhas TS/TSX em `src/`. Stack: Next.js 16.2 (Turbopack) + Drizzle/SQLite (`data/crm.db`) + shadcn-on-Base-UI + Zod + react-hook-form. `npm run build` voltou a ser gate normal desde a Fase 10 (Turbopack resolveu o OOM que travava webpack no host de 4GB). Repo publicado em `github.com/Marques10604/CRM-WhiteLabel`, branch `main`.
- **Fluxo GSD maduro nesta milestone:** `/gsd-secure-phase` → `/close-phase` → PR exercitado pela 1ª vez (Fase 12); UAT de navegador real via extensão Claude no Chrome (Fases 9/11/12) — antes disso o projeto nunca tinha acesso a navegador.
- **Débito conhecido (herdado do v1.0, ainda aberto):** Fases 1/2/4 nunca tiveram `/gsd-verify-work` formal / checagem manual no navegador; 5 cenários de UAT da Fase 4 e 3 verification_gaps seguem em `STATE.md` §Deferred Items. Teste 14 da UAT da Fase 12 (estado vazio) pulado — não testável sem banco sem leads.
- **Direção de infraestrutura (definida 2026-08-27):** CRM + o produto novo "Prospector Inteligente AI" (topo de funil, pasta própria) rodam num VPS único quando prontos. O Prospector sobe primeiro; o CRM migra depois, ativando gate de senha no middleware + Litestream. Continua SQLite; Postgres só com multi-tenant real.

## Constraints

- **Escopo de uso**: Ferramenta solo (um único admin), sem autenticação multi-usuário
- **Plataforma**: Acesso via navegador no computador — sem app mobile nativo
- **WhatsApp**: Sem API oficial de envio — link wa.me com mensagem pré-preenchida
- **Nomenclatura de schema**: Nunca cravar termos do nicho de saúde (ex. "paciente", "consulta") em nomes de tabela/coluna — usar nomes genéricos ("lead", "contato"). Custo de seguir é zero agora; custo de não seguir é reescrita de banco se virar white label ([[SEED-002]]) ou CRM genérico. Regra permanente.
- **Host de desenvolvimento 4GB RAM**: comandos de verificação sempre sequenciais, nunca em paralelo/background — builds/dev-server simultâneos já causaram OOM e crash de worktrees isolados.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Templates fixos de WhatsApp (não IA generativa) no v1 | Mais simples e rápido; IA personalizada adiada | ✓ Good — shipado na Fase 4; usuário quer IA de rascunho eventualmente |
| Link wa.me pré-preenchido em vez de envio automático via API | Evita custo e burocracia de WhatsApp Business API | ✓ Good — Fase 4 |
| Sub-nichos como lista extensível (não fixa) | Lista cresce com o tempo | ✓ Good — Fase 1 + soft-delete |
| GSD local por projeto (não global) | Isolamento explícito | ✓ Good |
| Soft-delete (`deletedAt`) como padrão para toda entidade removível, guard automatizado | Recuperação sempre possível | ✓ Good — leads, sub-nichos, motivos de perda. **Exceção deliberada:** `tarefas` (Fase 12, D-08) — descartável por natureza, hard-delete real, exceção cirúrgica na ALLOWLIST do guard |
| Host 4GB RAM → verificação sempre sequencial | OOM/crash recorrentes no v1.0 | ✓ Good — seguido à risca; `npm run build` voltou a ser barato com Turbopack (Fase 10) |
| `origemTipo` como coluna enum dedicada, não parse do texto livre `origem` | `origem` já estava suja ("insta", "Teste", "Importação CSV"); classificação precisa ser confiável para a automação diferenciar Inbound/Outbound | ✓ Good — Fase 8, backfill uniforme dos 33 leads |
| Eventos de interação automáticos (WhatsApp) imutáveis; só notas manuais editáveis/apagáveis | Timeline é histórico de fato, não rascunho; imutabilidade garantida no WHERE do servidor, não só na UI | ✓ Good — Fase 9 |
| Sugestão de próxima reabordagem calculada na leitura de cada request, nunca persistida nem agendada | Sem job scheduler, sem estado a sincronizar; `followUpDate` continua sendo a fonte oficial | ✓ Good — Fase 10 |
| Motivo de perda: lista governada obrigatória em vez de texto livre opcional | Relatório de perdas exige valores normalizados; obrigatoriedade reforçada no servidor via `.refine` condicional do Zod | ✓ Good — Fase 11 |
| `buildDashboardItems` / `groupByUrgency<T>` — generalização de função pura + wrapper preservado | Tarefas e follow-ups precisam da mesma régua de urgência sem regredir call-sites existentes | ✓ Good — Fase 12 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:** requisitos invalidados → Out of Scope; validados → Validated com ref de fase; novos → Active; decisões → Key Decisions; "What This Is" ainda preciso?

**After each milestone:** revisão completa; Core Value ainda é a prioridade certa?; auditar Out of Scope; atualizar Context.

---
*Last updated: 2026-08-30 — milestone v1.4 (CRM Genérico Multi-Nicho / despivô) iniciado via /gsd-new-milestone*
