# CRM de Leads

## Current Milestone

Nenhum em andamento — v1.7 acabou de ser shipado (2026-09-12). Próximo milestone a definir via `/gsd-new-milestone`.

## Current State

**Shipado:** v1.7 Exploração de Nicho (2026-09-12) — Fases 22-25, 16 planos, 130 commits, 8 dias (2026-09-05 → 09-12). Push direto para `main` (sem PR — projeto solo). Tag `v1.7`.

**O que o v1.7 entregou (1º degrau rumo a "Prospector embutido no CRM", sem WhatsApp/VPS/disparo):**
- **Campanha de exploração de nicho** (Fase 22) — entidade própria: nicho + oferta + janela (~90d) + meta de conversão + estado; leads podem se vincular a uma campanha além do nicho geral; `/campanhas` lista, `/campanhas/[id]` é a âncora que as fases seguintes enriquecem.
- **Diagnóstico de IA sob demanda** (Fase 23, 1ª integração de IA do projeto) — Vercel AI SDK + Claude Sonnet 5 com web search real, schema anti-genérico (saturação numérica, até 3 gatilhos de dor, 2-3 objeções, ticket médio com fonte, achados marcados dado/relato/alegação de marketing em 3 categorias, rascunho de 1ª mensagem editável, veredito sugerido não vinculante), gate de zero-fontes, sem cache, custo sempre visível. Eval on-demand com gold-set de 3 nichos.
- **Veredito do usuário + loop de resultado real** (Fase 24) — o operador registra a decisão final (pode divergir da IA), painel da campanha agrega os leads vinculados dela (contagem, conversão, motivos de perda, ticket médio) reaproveitando `/relatorios`, e a tela nova `/mapa-de-nichos` consolida todas as campanhas com filtro/ordenação.
- **Tour guiado do CRM** (Fase 25) — React Joyride ancorado na sidebar (zero navegação real entre passos), 5 telas explicadas, pulável a qualquer momento, reiniciável em `/configuracoes`, persistência via `localStorage`.
- Código: ~15.700 linhas TS/TSX em `src/` (+~3.900 desde o v1.6), 15 rotas.
- Pendências não-bloqueantes: UAT visual no navegador das Fases 23/24/25 (host sem browser disponível nas sessões de verificação — mesmo padrão desde a Fase 18); geração real de diagnóstico ainda não vista rodando por um humano (falta de crédito de API na sessão); 26 itens de débito pré-existente reconhecidos e deferidos em `STATE.md` no fechamento (a maioria de julho/agosto, anterior ao v1.7).

**Próximo milestone:** a definir via `/gsd-new-milestone`.

<details>
<summary>Milestones anteriores</summary>

- **v1.0 MVP** (2026-07-29, Fases 1-4) — pipeline Kanban, import CSV, dashboard de follow-up por urgência, templates de WhatsApp com wa.me.
- **v1.1 Importação Inteligente** (2026-07-30, Fase 5) — wizard aceita mapear múltiplas colunas de inteligência do CSV do cowork concatenadas em notas.
- **v1.2 Follow-up Automático** (2026-08-01, Fases 6-7) — auto-avanço Novo→Contatado ao abrir WhatsApp, contador de tentativas, `/configuracoes` de dias-parado por etapa.
- **v1.3 Qualificação e Histórico de Leads** (2026-08-30, Fases 8-12) — origem governada, timeline de interações, sequência de follow-up escalonada, painel `/relatorios`, agenda / tarefas soltas.
- **v1.4 CRM Genérico Multi-Nicho — despivô** (2026-08-31, Fases 13-15) — `sub-nicho → nicho` em toda a camada de código (nomes físicos do banco intocados, D-01), copy da UI neutralizada, filtro de intervalo customizado em `/relatorios`, campo "interesse / serviço desejado" no lead.
- **v1.5 Quitação de Débito e Auditoria Retroativa** (2026-09-03, Fases 16-19) — code review da Fase 15 fechado, `npm run lint` da raiz → 0, Fases 1/2/4/6/8 auditadas por code+data, marca "SOLO" + paleta OKLCH + favicon.
- **v1.6 Dark Mode + Exportar CSV** (2026-09-04, Fases 20-21) — toggle claro/escuro persistido, exportar `/leads` pra CSV 100% client-side.

</details>

## What This Is

CRM pessoal para um único usuário (o admin) organizar leads de qualquer nicho, recebidos em lote via CSV de um cowork parceiro. Os leads são categorizados por nicho (lista plana administrável), classificados por origem (Inbound/Outbound), registram o interesse / serviço desejado, e avançam por um pipeline de vendas simples até o fechamento. O admin aborda os leads pelo Instagram e WhatsApp usando templates prontos; cada abordagem fica registrada numa timeline por lead. Uma sequência de follow-up escalonada sugere quando reabordar, e uma tela de relatórios mostra de onde vêm as vendas e as perdas, em qualquer janela de tempo escolhida.

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
- ✓ `sub-nicho → nicho` renomeado em toda a camada de código (schema, tipos, Zod, queries, CSV, Server Actions); nomes físicos do banco preservados (rename só de código, D-01); `/subnichos` → `/nichos` com redirect 301 — v1.4 (Fase 13), NICHO-01/02
- ✓ Copy da UI neutralizada — nenhum label, placeholder, ajuda, exemplo ou estado vazio menciona "área da saúde" / "nutricionista" / "terapeuta" / nicho-pai; gate de grep COPY-01 — v1.4 (Fase 13), COPY-01
- ✓ Filtro de intervalo de datas customizado (início–fim arbitrário) em `/relatorios`, além dos presets; as 3 seções respeitam o intervalo; inválido cai em fallback com aviso; sobrevive a refresh via querystring — v1.4 (Fase 14), METRICAS-03
- ✓ Campo opcional "interesse / serviço desejado" no lead (texto livre, max 500), no formulário e mapeável no wizard de importação CSV com truncamento defensivo — v1.4 (Fase 15), LEAD-06
- ✓ Marca e identidade visual — nome de produto "SOLO" (`brand.md` com racional + ressalva de colisão), paleta "Corrente Funda · Sóbria" (shadcn CSS vars OKLCH light+dark) via `/brand-design`, tipografia Geist via `next/font`, favicon próprio, "CRM de Leads" renomeado em toda superfície visível — v1.5 (Fase 19), BRAND-01/02/03
- ✓ Escala de cor semântica `--status-*` (neutral/info/warning/success/danger, light+dark, WCAG AA) separada da paleta de marca; 33 arquivos migrados de cor hardcoded → token shadcn — v1.5 (Fase 19), D-08
- ✓ Comportamento shipado das Fases 1/2/4/6/8 verificado (método code+data); `npm run lint` da raiz volta a exit 0 — v1.5 (Fases 17-18), AUDIT-01..05 / LINT-01
- ✓ Toggle de dark mode (claro / escuro / segue o sistema) no rodapé da sidebar, persistido em `localStorage`, sem flash de cor errada no carregamento — v1.6 (Fase 20), THEME-01..04
- ✓ Exportar a lista de leads (filtrada + ordenada) para CSV legível — botão na toolbar de `/leads`, geração client-side, BOM UTF-8 + `;` para Excel pt-BR, nicho e motivo de perda por nome — v1.6 (Fase 21), EXPORT-01..03
- ✓ Campanha de exploração de nicho — nicho + oferta + janela (~90d) + meta + estado; lead pode se vincular a uma campanha além do nicho geral; listagem/navegação — v1.7 (Fase 22), CAMPANHA-01..04
- ✓ Diagnóstico de IA sob demanda por campanha — saturação numérica, até 3 gatilhos de dor, 2-3 objeções, ticket médio com fonte, achados dado/relato/marketing, rascunho de 1ª mensagem editável, veredito sugerido não vinculante, zero fonte = rejeitado, sem cache — v1.7 (Fase 23), DIAGNOSTICO-01..10
- ✓ Veredito final registrado pelo usuário (pode divergir da IA), com data, sem efeito colateral em outros dados — v1.7 (Fase 24), VEREDITO-01..03
- ✓ Painel de resultado real por campanha (reaproveitando `/relatorios`) e tela "Mapa de Nichos" filtrável/ordenável por veredito e nicho — v1.7 (Fase 24), PAINEL-01..03
- ✓ Tour guiado do CRM (React Joyride) apresentando as telas principais, pulável, reiniciável em `/configuracoes`, estado "já viu" persistente — v1.7 (Fase 25), TUTORIAL-01..05

### Active

Nenhum requisito ativo — v1.7 fechado, próximo milestone ainda não escopado. Rodar `/gsd-new-milestone` para definir os próximos requisitos.

Candidatos adiados: backlog PME (tags livres, busca global, temperatura automática, anexo por lead, campo de vendedor, meta mensal), handoff Prospector→CRM (HANDOFF-01..03, quando o Prospector existir), mapa de nichos agregado entre usuários (NICHO-AGG-01, precisa de tração — dezenas de workspaces). Direção de fundo do usuário: fundir Prospector + CRM — v1.7 foi o primeiro degrau seguro rumo a isso (só a parte "nicho como objeto de 1ª classe", sem disparo).

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
- Garimpo de empresas / scraping de leads novos dentro do CRM — a campanha organiza leads que já entram pelo fluxo normal (manual ou CSV); garimpo é território do Prospector, sistema separado por firewall legal (CNPJ próprio) — v1.7
- Multi-tenant / múltiplos usuários no Mapa de Nichos — v1.7 entrega a régua pessoal (1 usuário); agregação entre usuários é NICHO-AGG-01, gatilho de tração real
- Motor de disparo automático (WhatsApp em massa, mesmo via API oficial com opt-in) embutido no CRM — mantém o firewall legal do Prospector (CNPJ separado); mesmo com Coexistence + templates pré-aprovados (avaliado 2026-09-11), o requisito de opt-in do destinatário não muda — cold outreach continua sendo o mesmo risco de compliance, então o disparo fica fora do CRM por decisão persistente, não só técnica

## Context

- Usuário é o próprio profissional (admin), atendendo leads de diferentes nichos (hoje: empresa de serviços de automação/IA; nichos rotativos vindos do futuro Prospector)
- Leads chegam em lote via CSV entregue por um cowork parceiro; abordagem via Instagram e WhatsApp
- Hoje os leads eram organizados em planilha do Google Sheets — processo desorganizado, esquecimento frequente de follow-up
- **Estado pós-v1.7 (2026-09-12):** app roda localmente (`localhost:3000`), ~15.700 linhas TS/TSX em `src/`, 15 rotas. Stack: Next.js 16.2 (Turbopack) + Drizzle/SQLite (`data/crm.db`) + shadcn-on-Base-UI + Zod + react-hook-form + `next-themes` (dark mode) + PapaParse (import + export CSV) + **Vercel AI SDK (`ai@7.0.93` + `@ai-sdk/anthropic@4.0.49`) — 1ª integração de IA do projeto (Fase 23)** + **`react-joyride@3.2.0` — 1ª dependência de tour (Fase 25)**. Repo `github.com/Marques10604/CRM-WhiteLabel`, branch `main`, tag `v1.7`. Marca "SOLO"; paleta OKLCH `:root` + `.dark` alternável pela UI. Toda cor da UI vem de token shadcn (`verify:brand`); contraste WCAG AA por `check:contrast` (30/30). Fases 16-25 foram para `main` por push direto (sem PR — projeto solo).
- **Discussão estratégica Prospector vs. CRM reaberta (2026-09-11):** usuário questionou de novo fundir tudo/embutir disparo no CRM; reafirmado que a fronteira legal (CNPJ separado) continua correta mesmo com WhatsApp Coexistence (real, lançado 2025/2026, Brasil entre 1ºs países) — Coexistence resolve fricção de adoção (cliente não perde o app), mas o requisito de opt-in pro 1º contato frio não muda. Ideia registrada como possível feature futura de nutrição pós-opt-in, não muda a arquitetura atual. Ver Out of Scope.
- **Divergência lógico↔físico deliberada (D-01, Fase 13):** o Drizzle mapeia `nichos = sqliteTable("subnichos")` / `nichoId: integer("subnicho_id")` — o código diz "nicho", o banco continua "subnicho". Doc-comment no `schema.ts` registra. Uma migração de rename físico fica para quando/se houver outro motivo pra tocar o schema.
- **Fluxo GSD maduro:** `/gsd-secure-phase` → `/close-phase` → PR desde a Fase 12; UAT de navegador real (extensão Claude no Chrome, nível DOM + verdade no `data/crm.db`) nas Fases 9/11/12/13/14/15. **A partir da Fase 18, o host de 4GB deixou de rodar `dev` + Chrome + sessão do agente junto** — a verificação passou a ser por **code+data** (leitura de superfície + query só-SELECT no `data/crm.db` + harnesses `test:*`/`verify:*`); a confirmação puramente visual fica diferida para uma sessão com navegador.
- **Débito conhecido resolvido no v1.5:** as Fases 1/2/4/6/8 foram auditadas retroativamente (Fase 18) — os 5 `VERIFICATION.md` agora `passed`, 0 issues de runtime. `npm run lint` da raiz volta a exit 0 (Fase 17).
- **Débito conhecido ainda aberto:** WR-03/WR-04 da Fase 19 (2 gates `.cjs` frouxos — `19-REVIEW.md`); confirmação puramente visual da Fase 19 (animações/toasts/digitação, host 4GB); Fase 12 Teste 14 (estado vazio do dashboard, skipped); 8 quick tasks de UI/warnings acumuladas v1.0–v1.3, fora de milestone.
- **`npm run lint` global — RESOLVIDO na Fase 17 (LINT-01, 2026-09-01).** Saía com exit 1 desde a Fase 8 (457 erros pré-existentes: `no-require-imports` nos `.cjs`, worktree órfão, falsos-positivos de `react-hooks`). Quitado com `.claude/**` no `globalIgnores`, override escopado de `scripts/**/*.cjs`, remoção do worktree órfão e `eslint-disable-next-line` documentado nos 4 falsos-positivos de `src/`. `npm run lint` da raiz volta a sair 0.
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
| Rename `sub-nicho → nicho` só na camada de código; nomes físicos do banco intocados (D-01) | Evita migração, backup e o snapshot divergente do drizzle-kit; o valor do rename é a copy que o usuário vê, não o nome da coluna | ✓ Good — Fase 13, zero toque em dados |
| Sugestão de intervalo em `/relatorios` resolvida por função pura `resolvePeriodoRelatorios` que nunca lança (valida + apara data futura + flag de rejeição) | Querystring é entrada não confiável; a tela não pode quebrar com `?from=banana` | ✓ Good — Fase 14 |
| Truncamento de `interesse` do CSV em `mapCsvRows` (`.slice(0,500)`) antes do Zod, não no schema | Célula gigante do CSV do cowork nunca reprova a linha nem aborta o lote; `.max(500)` do Zod fica só para o input manual | ✓ Good — Fase 15, D-10 |
| Campo opcional de texto livre = nullable + `z.preprocess` vazio→undefined + `?? null` explícito na Server Action + gate em `verify-schema.cjs` | Padrão reusado de `motivoPerdaId` (Fase 11); elimina a classe de bug "campo opcional grava `''` em vez de NULL" | ✓ Good — Fase 15 (2ª ocorrência); WR-01 (só-espaços grava `''`) **resolvido na Fase 16**: trim movido para dentro do `z.preprocess` |
| Verificação por **code+data** quando o host não roda navegador + sessão (leitura de superfície + query só-SELECT no `data/crm.db` + harnesses) | Host de 4GB: `dev` + Chrome + sessão do agente = OOM. Uma verificação incompleta mas honesta > um `human_needed` eterno | ✓ Good — Fases 18 e 19; 0 issues de runtime; confirmação puramente visual fica diferida e declarada |
| Nome do produto = "SOLO", registrado como **descartável** em `brand.md` (ressalva de colisão verbatim: Salesboom Solo CRM / SoloCRM / gosolo.io) | Nome curto que vira verbo, casa com o app solo; a colisão é real, então a decisão vem com data de validade explícita | — Pendente — trocar antes de qualquer movimento de produto real |
| Escala `--status-*` (cor de status de funil) definida **à parte** da paleta de marca (D-08) | Status precisa ser mutuamente distinguível e estável; a marca é trocável. Acoplar os dois travaria um ou outro | ✓ Good — Fase 19; 5 famílias light+dark, todas WCAG AA |
| Refactor mecânico cor→token = **só strings de `className`**, `git diff` auditável linha a linha | 33 arquivos, alguns com lógica sensível (transação de WhatsApp, `startTransition`, `stopPropagation`); a disciplina é o que torna o code review viável | ⚠️ Revisit — o diff perfeito não impede erro de **julgamento de design**: 2 warnings de UX (token de fundo-de-badge onde precisava de peso) passaram e foram pegos só no code review |
| Fases 16-21 para `main` por **push direto**, sem PR | Projeto solo, sem revisor — PR é cerimônia. O code review roda como etapa do GSD, não como review de PR | ✓ Good — consistente do v1.5 ao v1.6; tags `v1.5`/`v1.6` |
| Dark mode via `next-themes` (`attribute="class"` + `defaultTheme="system"`) — a constraint D-16 da Fase 19 ("sem ThemeProvider/toggle") foi suspensa pelo v1.6 | Os tokens `.dark` já estavam prontos e verificados (Fase 19); ligar o toggle é `ThemeProvider` + 1 componente, não feature estrutural. `next-themes` já era dependência (via `sonner`) | ✓ Good — Fase 20; persistência 100% da lib, zero código de estado no projeto |
| Export de CSV 100% client-side (`table.getSortedRowModel().rows` → módulo puro → `Blob` download) — nenhuma API route | Os dados já estão na tabela; o CRM continua "só Server Actions". Módulo puro DOM-free = testável por harness `.cjs` sem navegador | ✓ Good — Fase 21; harness com 38 asserções + 2 testes de mutação |
| `sanitizeCsvCell` mitiga CSV/formula injection prefixando `'` em células que começam com `= + - @` | Parte dos dados (nome, notas) vem de CSV de um parceiro, não só do admin. Trade-off: o `'` fica visível em editor de texto puro (oculto no Excel/Sheets) | ✓ Good — Fase 21, D-21-04 |
| D-23-06: schema de achado do diagnóstico (`diagnosticoSchema.achados[].tipo`) passa de 2 para 3 categorias (`dado_quantificavel` / `relato_qualitativo` / `alegacao_marketing`), com campo `evidencia` (`padrao_confirmado`/`relato_isolado`) em `gatilhos_dor` amarrando a força do gatilho à confiabilidade real da fonte | 2 rodadas de reforço de prompt (rubrica anti-genérico + REGRA DE ESCOLHA DO VEREDITO) não resolveram a não-discriminação entre os 3 nichos-gold do eval — causa raiz era uma dicotomia falsa no schema (um relato anedótico único, não sendo copy de venda, só tinha `dado_quantificavel` como casa possível), não uma rubrica frouxa | ✓ Good — Fase 23 (plano 23-06); rodada 3 do eval produziu os 3 vereditos gold discriminados entre si pela 1ª vez, zero FAIL do juiz na dimensão dado×marketing nos casos julgados |
| Framework de IA: Vercel AI SDK (`generateText` + `Output.object` + tool `web_search`), não `generateObject` | `generateObject` não aceita tools; precisava de busca real + saída estruturada validada por Zod no mesmo call | ✓ Good — Fase 23, gate de fontes lê `res.sources` real, nunca URL auto-declarada pelo modelo |
| Variância de veredito da IA entre execuções idênticas — aceita como comportamento ESPERADO, não bug | Busca adaptativa (cada execução acha fatos diferentes) + LLM não-determinístico mesmo com `effort:"low"` | ✓ Good (aceito) — implicação de produto permanente: o veredito da IA é sempre sugestão de 1 execução, o operador sempre valida (Fase 24 já foi desenhada em cima dessa premissa) |
| `registrarVeredito` só transiciona `campanhas.estado` pra `veredito_registrado`, nunca `em_escala`/`abandonada` (que ficam no enum mas inalcançáveis nesta fase) | Nenhum requisito do v1.7 mandava essas 2 transições; adicioná-las seria escopo não pedido | ✓ Good — Fase 24, doc-comment do schema corrigido pra não prometer mais do que a fase entrega |
| Persistência do tour ("já viu") via `localStorage` (`next-themes`-style), não a tabela `configuracoes` | Ferramenta solo sem multiuso real; evita acoplamento de schema pra uma preferência de UI pura | ✓ Good — Fase 25, mesmo padrão do dark mode (Fase 20) |
| Execução sequencial sem worktree (`parallelization:false`, `use_worktrees:false`) mantida em todo o v1.7, mesmo em fases com 2 planos independentes por onda | Host 4GB — precedente de crash confirmado em milestones anteriores | ✓ Good — zero OOM/crash de worktree no v1.7 inteiro (22-25), custo é onda mais lenta, não falha |
| `gsd-plan-checker` com 1 rodada de revisão obrigatória antes de executar (Fases 24 e 25) | Achou bugs reais e não-óbvios antes do código existir: 3 critérios de aceitação com contagem de grep desatualizada (Fase 24) e um critério que um stub vazio passaria sem provar TUTORIAL-02 de verdade (Fase 25) | ✓ Good — as duas rodadas de revisão evitaram planos que pareciam prontos mas tinham gates furados |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:** requisitos invalidados → Out of Scope; validados → Validated com ref de fase; novos → Active; decisões → Key Decisions; "What This Is" ainda preciso?

**After each milestone:** revisão completa; Core Value ainda é a prioridade certa?; auditar Out of Scope; atualizar Context.

---
*Last updated: 2026-09-12 after v1.7 (Exploração de Nicho) milestone*
