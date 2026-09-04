# CRM de Leads

## Current Milestone: a definir (v1.6)

**Último milestone shipado:** v1.5 Quitação de Débito e Auditoria Retroativa — 2026-09-03 (Fases 16-19).

Rodar `/gsd-new-milestone` para definir a direção e o roadmap do v1.6. Candidatos:
- **Dark mode toggle** — os tokens `.dark` já estão prontos e consistentes (Fase 19); falta o `ThemeProvider` + controle na UI (foi deixado fora do v1.5 como "feature nova", D-16)
- **Handoff Prospector→CRM** (HANDOFF-01..03) — quando o Prospector Inteligente AI existir
- **Teste de nicho formal** (CAMPANHA-01) — se o nicho plano + filtro de intervalo não bastar
- **Backlog PME** — tags livres, temperatura automática, busca global, exportar CSV, anexo por lead, campo de vendedor, meta mensal

## Current State

**Shipado:** v1.5 Quitação de Débito e Auditoria Retroativa (2026-09-03) — Fases 16-19, 15 planos, 98 commits. Push direto para `main` (sem PR — projeto solo). Tag `v1.5`.

**O que o v1.5 entregou (zero feature funcional nova — só quitação de débito + marca):**
- **Débito de code review quitado** (Fase 16) — os 5 achados do `15-REVIEW.md` fechados; `interesse` só-espaços agora grava `NULL` no create e no update (o `=== ""` era antes do trim — WR-01 do v1.4 finalmente resolvido). Code review pegou 1 blocker (CR-01): mudou o limite de 500 chars de code units para code points.
- **`npm run lint` da raiz volta a exit 0** (Fase 17) — dos 457 erros pré-existentes, ~98% era ruído de ferramental (`.claude/**` no `globalIgnores`, override `.cjs`, worktree órfão removido, 4 `eslint-disable` documentados em `src/`).
- **Comportamento shipado das Fases 1/2/4/6/8 verificado** (Fase 18) — UAT ao vivo bloqueado pelo host de 4GB → pivô para **code+data** (leitura de superfície + query só-SELECT no `data/crm.db` + 12 harnesses). `01/02-HUMAN-UAT.md` autorados do zero; os 5 `VERIFICATION.md` → `passed`; 0 issues de runtime.
- **O CRM virou "SOLO"** (Fase 19) — nome + ressalva de colisão em `brand.md`, paleta "Corrente Funda · Sóbria" (navy + teal, OKLCH light+dark) via `/brand-design`, favicon próprio. 33 arquivos migrados de cor hardcoded → token shadcn; escala `--status-*` semântica criada à parte da marca. Code review: 2 warnings de UX corrigidos, 2 de gate frouxo aceitos como débito.

**Próximo milestone:** a definir via `/gsd-new-milestone`.

<details>
<summary>Milestones anteriores</summary>

- **v1.0 MVP** (2026-07-29, Fases 1-4) — pipeline Kanban, import CSV, dashboard de follow-up por urgência, templates de WhatsApp com wa.me.
- **v1.1 Importação Inteligente** (2026-07-30, Fase 5) — wizard aceita mapear múltiplas colunas de inteligência do CSV do cowork concatenadas em notas.
- **v1.2 Follow-up Automático** (2026-08-01, Fases 6-7) — auto-avanço Novo→Contatado ao abrir WhatsApp, contador de tentativas, `/configuracoes` de dias-parado por etapa.
- **v1.3 Qualificação e Histórico de Leads** (2026-08-30, Fases 8-12) — origem governada, timeline de interações, sequência de follow-up escalonada, painel `/relatorios`, agenda / tarefas soltas.
- **v1.4 CRM Genérico Multi-Nicho — despivô** (2026-08-31, Fases 13-15) — `sub-nicho → nicho` em toda a camada de código (nomes físicos do banco intocados, D-01), copy da UI neutralizada, filtro de intervalo customizado em `/relatorios`, campo "interesse / serviço desejado" no lead.

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

### Active

**Nenhum milestone ativo.** Rodar `/gsd-new-milestone` para definir o v1.6.

Candidatos para o v1.6 (ver §Current Milestone acima): dark mode toggle, handoff Prospector→CRM (HANDOFF-01..03), teste de nicho formal (CAMPANHA-01), backlog PME.

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

- Usuário é o próprio profissional (admin), atendendo leads de diferentes nichos (hoje: empresa de serviços de automação/IA; nichos rotativos vindos do futuro Prospector)
- Leads chegam em lote via CSV entregue por um cowork parceiro; abordagem via Instagram e WhatsApp
- Hoje os leads eram organizados em planilha do Google Sheets — processo desorganizado, esquecimento frequente de follow-up
- **Estado pós-v1.5 (2026-09-03):** app roda localmente (`localhost:3000`), ~11.600 linhas TS/TSX em `src/`. Stack: Next.js 16.2 (Turbopack) + Drizzle/SQLite (`data/crm.db`) + shadcn-on-Base-UI + Zod + react-hook-form. Repo `github.com/Marques10604/CRM-WhiteLabel`, branch `main`. Marca: nome "SOLO" (`package.json` `name: solo`, `brand.md` na raiz), paleta OKLCH em `globals.css` (`:root` + `.dark`), favicon `src/app/icon.svg`. Toda cor da UI vem de token shadcn (gate `verify:brand`); contraste WCAG AA verificado por `check:contrast` (30/30). Fases 16-19 foram para `main` por push direto (sem PR — projeto solo).
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
| Fases 16-19 para `main` por **push direto**, sem PR | Projeto solo, sem revisor — PR é cerimônia. O code review roda como etapa do GSD, não como review de PR | ✓ Good — consistente nas 4 fases do v1.5; tag `v1.5` |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:** requisitos invalidados → Out of Scope; validados → Validated com ref de fase; novos → Active; decisões → Key Decisions; "What This Is" ainda preciso?

**After each milestone:** revisão completa; Core Value ainda é a prioridade certa?; auditar Out of Scope; atualizar Context.

---
*Last updated: 2026-09-03 after v1.5 milestone (Quitação de Débito e Auditoria Retroativa)*
