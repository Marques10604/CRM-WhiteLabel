---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Qualificação e Histórico de Leads
status: planning
last_updated: "2026-08-01T19:16:50.336Z"
last_activity: 2026-08-01
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-01)

**Core value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.
**Current focus:** Milestone v1.3 (Qualificação e Histórico de Leads) — definindo requisitos e roadmap

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-08-01 — Milestone v1.3 started

## Performance Metrics

**Velocity:**

- Total plans completed: 8
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 4 | - | - |
| 05 | 2 | - | - |
| 06 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 70min | 4 tasks | 46 files |
| Phase 01 P02 | 45min | 3 tasks | 13 files |
| Phase 01-lead-sub-nicho-foundation P03 | 25min | 2 tasks | 5 files |
| Phase 04 P01 | 45min | 2 tasks | 5 files |
| Phase 04 P02 | 50min | 3 tasks | 8 files |
| Phase 04-follow-up-dashboard-whatsapp-outreach P03 | 40min | 3 tasks | 8 files |
| Phase 04-follow-up-dashboard-whatsapp-outreach P04 | 35min | 2 tasks | 8 files |
| Phase 05 P01 | 35min | 2 tasks | 2 files |
| Phase 05-notas-enriquecidas-na-importa-o-csv P02 | 25 min | 2 tasks | 2 files |
| Phase 06-auto-avan-o-de-etapa-contador-de-tentativas P01 | 15min | 3 tasks | 4 files |
| Phase 06 P02 | 20min | 2 tasks | 2 files |
| Phase 07 P01 | 25min | 3 tasks | 4 files |
| Phase 07-configura-o-de-dias-parado-por-etapa P02 | 20min | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap v1.1: Phase 5 única (não múltiplas fases) — escopo de IMPORT-04/IMPORT-05 é pequeno e contido, um plano de goal único (dividido em tasks se necessário) é mais apropriado que fases artificiais
- Roadmap: Templates fixos de WhatsApp (não IA generativa) no v1
- Roadmap: Link wa.me pré-preenchido em vez de envio automático via API
- Roadmap: Sub-nichos como lista extensível (não fixa), com governança desde o Phase 1
- [Phase 01]: shadcn init resolveu para Base UI (components.json style: base-nova) — confirma a suposição de confiança MEDIA do UI-SPEC
- [Phase 01]: Item de registro 'form' do shadcn não tem arquivos na versão atual (2026-07) baseada em Base UI; usados os primitivos 'field'+'label' no lugar
- [Phase 01]: turbopack.root adicionado ao next.config.ts para corrigir detecção incorreta de workspace root pelo Turbopack
- [Phase ?]: [Phase 01] Lead form submits raw DOM FormData (not react-hook-form parsed values) to avoid double-converting valorEstimado, since parseBRLToCents is not idempotent on its own centavos output
- [Phase ?]: [Phase 01] Base UI Dialog onOpenChange + eventDetails.cancel() used to intercept unsaved-changes close (D-04), no extra confirmation library needed
- [Phase 01-lead-sub-nicho-foundation]: npx shadcn add popover falhou por falta de memoria neste host; popover.tsx foi escrito a mao seguindo o padrao de dialog.tsx/select.tsx (Base UI Popover)
- [Phase 01-lead-sub-nicho-foundation]: Filtro de sub-nicho na lead-table compara por subnichoId (numero), nao por subnichoNome (texto exibido)
- [Phase 01-lead-sub-nicho-foundation]: DEFAULT_SORTING e FollowUpDateRange centralizados em lead-table-columns.tsx para evitar import circular entre lead-table.tsx e lead-table-toolbar.tsx
- [Phase ?]: Dashboard scope excludes fechado/perdido leads via notInArray centralized in getActiveDashboardLeads() to avoid duplicating the exclusion filter across future queries (D-04)
- [Phase ?]: Empty urgency sections are omitted entirely (no header/body) rather than showing a per-section empty message
- [Phase ?]: 'Novo lead' on the dashboard opens LeadFormDialog in create mode locally (DialogState union) instead of navigating to /leads, per D-03 -- this surface is reused by 04-04's auto-trigger (WA-04)
- [Phase 04-02]: 'templates' table applied via drizzle-kit push produces no git-trackable diff (data/crm.db is gitignored, push writes no migration SQL) — Task 2 verified live-DB state directly via better-sqlite3 query instead of committing a file
- [Phase 04-02]: 'one default per type' invariant (D-12) enforced via db.transaction() desmarca-entao-marca, not a partial uniqueIndex().where() (drizzle-kit generates incorrect SQL for that shape on SQLite)
- [Phase 04-03]: waHref no whatsapp-preview-dialog.tsx e recomputado a cada render a partir do texto vivo da textarea (Pitfall 4), nunca memoizado do renderTemplate() inicial
- [Phase 04-03]: 'Abrir WhatsApp' renderizado como <a> estilizado via buttonVariants() em vez de Button render={...} (API polimorfica nao verificada nesta lib Base UI, mesmo precedente do 04-01)
- [Phase 04-03]: pipeline-lead-card.tsx usa stopPropagation em onPointerDown E onClick no wrapper do botao de WhatsApp, pois useDraggable e o onClick de edicao do card exigem interceptacao separada
- [Phase 04-04]: ActionState.success carries optional lead? field (not a second variant) so updateLead stays type-compatible with createLead's returning()
- [Phase 04-04]: WhatsAppPreviewDialog gained optional subtitulo prop with fallback to preserve the 04-03 manual-send subtitle unchanged while the auto-trigger flow injects the UI-SPEC-mandated copy
- [Phase 04-04]: First custom hook in the project: src/hooks/use-first-contact-trigger.ts, designed for reuse by the future CSV import (Phase 2 backlog) per D-18
- [Phase 02-02]: @types/papaparse Task 1 gate aprovado por checagem direta em registry.npmjs.org (repository DefinitelyTyped/DefinitelyTyped, mantenedor types team da Microsoft) após recuperar trabalho de um worktree executor interrompido (host derrubou o processo)
- [Phase 02-02]: detectEncodingLabel() no csv-import-wizard.tsx duplica a heurística BOM+TextDecoder(fatal) de decodeCsvFile só para exibição do rótulo "Detectado: ..." — decodeCsvFile (02-01) não expõe qual branch escolheu
- [Phase ?]: [Quick 260725-lai]: Soft-delete de sub-nicho filtra deletedAt so nas superficies de selecao, nunca nas queries de listagem de leads (mapa id->nome)
- [Phase 05-01]: Fallback CSV_DEFAULTS.notas aplicado sobre o resultado FINAL de buildNotasText, nunca sobre o valor bruto da coluna Notas isolada (corrige Pitfall 1)
- [Phase 05-01]: csvHeaderOrder derivado internamente de Object.keys(rows[0] ?? {}) dentro de mapCsvRows, nunca recebido como parametro externo (evita Pitfall 3)
- [Phase 05-notas-enriquecidas-na-importa-o-csv]: handleToggleExtraColumn espelha handleFieldChange (nenhum useState interno) e resumo ao vivo deriva sempre de headers.filter(...), nunca de extraNotasColumns.join/map — Mantém csv-column-mapper.tsx 100% controlado pelo wizard e garante que a ordem de concatenação segue sempre a ordem do arquivo CSV (D-08), mesmo se o admin marcar checkboxes fora de ordem
- [Phase 06-01]: npx drizzle-kit push nao pode ser usado para adicionar coluna com default 0 -- bug de falsy-check trata DEFAULT 0 como ausente e prepara DELETE FROM antes do ADD COLUMN; ALTER TABLE aplicado diretamente via better-sqlite3 com a mesma DDL que o proprio conversor do drizzle-kit geraria
- [Phase 06-01]: registerWhatsAppContact e funcao dedicada (nao extensao de updateLeadStage) -- auto-avanco e unidirecional/condicional, guarda pertence ao servidor via SELECT fresco
- [Phase 06-02]: onClick do anchor Abrir WhatsApp dispara registerWhatsAppContact fire-and-forget (sem preventDefault/await/window.open); toast de auto-avanco usa nome do lead (D-07)
- [Phase 06-02]: Contador de tentativas no card do pipeline usa MessageCircle + {n}x em cor neutra (text-muted-foreground), so quando contactAttempts > 0 (D-05/D-06)
- [Phase ?]: Defaults nao simetricos por D-04: dias_parado_contatado nasce com 5 (paridade com hardcode pre-fase), dias_parado_novo/dias_parado_negociacao nascem com 999999 (nunca esfriam ate o admin salvar)
- [Phase ?]: saveConfiguracoes escreve via upsert (insert+onConflictDoUpdate), nunca update simples, para nunca reportar sucesso sem persistir quando a linha singleton nao foi semeada
- [Phase ?]: drizzle-kit push (nao generate) usado no Plano 07-01 - snapshot de migracoes ja divergente do banco real desde Fase 4/6, debito tecnico pre-existente nao resolvido aqui
- [Phase 07-02]: react-hooks/refs (eslint-config-next 16.2.10) sinaliza como erro o padrao onSubmit={form.handleSubmit(onSubmit)} + leitura de formRef.current, mesmo falso-positivo ja presente em template-form-dialog.tsx (analog mandatado); suprimido com eslint-disable-next-line documentado, sem mudar comportamento
- [Phase 07-02]: limitesPorEtapa em pipeline/page.tsx omite fechado/perdido por construcao (ausencia no mapa, nao condicional extra) - paridade pre-save (D-04) confirmada em runtime com lead real forcado 10 dias em novo

### Pending Todos

Backlog registrado em 2026-08-01 a partir de uma varredura de ideias externa (`C:\Users\Vencedor\Desktop\Ideias.txt`) — nada implementado, só registrado. Ver `PROJECT.md` seção Active para a lista completa com prioridade e links.

**Alto valor (ordem de prioridade):**

1. [Separação Inbound x Outbound](.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md)
2. [Timeline de interações por lead](.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md)
3. [Sequência de follow-up escalonada com templates de valor](.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md) — area: general (pendência original de 2026-07-21)
4. [Painel de métricas por origem e sub-nicho](.planning/todos/pending/2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho.md)
5. [Relatório de motivos de perda](.planning/todos/pending/2026-08-01-relat-rio-de-motivos-de-perda.md)
6. [Agenda/tarefas soltas](.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md)

**PME (avaliar prioridade, não urgente):** [tags livres](.planning/todos/pending/2026-08-01-tags-livres-por-lead.md), [temperatura automática](.planning/todos/pending/2026-08-01-temperatura-autom-tica-do-lead.md), [busca global](.planning/todos/pending/2026-08-01-busca-global.md), [exportar CSV](.planning/todos/pending/2026-08-01-exportar-dados-em-csv.md), [anexo por lead](.planning/todos/pending/2026-08-01-anexo-simples-por-lead.md), [campo vendedor no banco](.planning/todos/pending/2026-08-01-campo-de-vendedor-respons-vel-no-banco.md), [meta mensal](.planning/todos/pending/2026-08-01-meta-mensal-com-barra-de-progresso.md)

**Herdadas de sessões anteriores:** [Conectar captura de leads da prospecção ao CRM](.planning/todos/completed/2026-07-29-conectar-captura-de-leads-da-prospec-o-ao-crm.md) — status `completed` no disco mas **não resolvida de fato**: o gargalo real (CSV do cowork) foi coberto pela Fase 5, mas a conexão landing-page↔CRM em si segue TBD (mesmo conflito local-vs-público, ver IMPORT-V2-02 em `REQUIREMENTS.md`)

**Seeds (gatilho futuro, surgem em `/gsd-new-milestone`):** [SEED-001](.planning/seeds/SEED-001-roadmap-p-s-cliente-pagante.md) (proposta/catálogo/pós-venda, gatilho: 1º cliente pagante), [SEED-002](.planning/seeds/SEED-002-infra-white-label.md) (multi-tenant/white label, mesmo gatilho, tratado como outro produto)

### Blockers/Concerns

Resolvidos no v1.0, limpos no fechamento do milestone:

- ~~Phase 2 (CSV Import): no real cowork CSV sample available yet~~ — resolvido: um CSV real do cowork foi usado em prospecção ao vivo e revelou os bugs corrigidos em `cbfb1bc`/`fc684c6`/`0fb70fd` (telefone com DDI estrangeiro, sub-nicho ausente)
- ~~[Phase 3 gap-closure] Decision Coverage Gate falso positivo~~ — resolvido e documentado no `RETROSPECTIVE.md` como padrão recorrente de falso-positivo em checkers baseados em grep

Aberto, carregado para o próximo milestone:

- Cross-cutting: continuar vigiando scope creep para auth/multi-usuário/mobile/WhatsApp Business API em toda fase nova — explicitamente fora de escopo por `PROJECT.md`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260720-x41 | Corrigir dialog/modal de preenchimento maior que a tela - adicionar max-h e overflow-y-auto | 2026-07-21 | c00c8cb | [260720-x41-corrigir-dialog-modal-de-preenchimento-n](./quick/260720-x41-corrigir-dialog-modal-de-preenchimento-n/) |
| 260721-0cl | Adicionar texto de ajuda/descrição abaixo do label de cada campo do formulário de lead | 2026-07-21 | 689b168 | [260721-0cl-adicionar-texto-de-ajuda-descri-o-abaixo](./quick/260721-0cl-adicionar-texto-de-ajuda-descri-o-abaixo/) |
| 260725-219 | Implementar no sidebar real (app-sidebar.tsx) as decisões dos sketches 001/004: brand header selo discreto, rótulo "Principal", ícones lucide, espaçamento e fundo teal suave no item ativo | 2026-07-25 | abaaba7 | [260725-219-implementar-no-sidebar-real-do-app-src-c](./quick/260725-219-implementar-no-sidebar-real-do-app-src-c/) |
| 260725-gzb | Implementar na lista real de leads (/leads) as decisões dos sketches 002/003: linhas híbridas em flex + botão WhatsApp nomeado | 2026-07-25 | 7deff3b | [260725-gzb-implementar-na-tela-real-de-leads-lead-t](./quick/260725-gzb-implementar-na-tela-real-de-leads-lead-t/) |
| 260725-lai | Botão de remoção (soft-delete) de sub-nicho em /subnichos: coluna deletedAt, softDeleteSubnicho, reativação por nome, filtro nas superfícies de seleção (combobox + toolbar) | 2026-07-29 | 59a27c6, 2c7a1ba, fa7a778 | [260725-lai-adicionar-botao-de-remocao-soft-delete-d](./quick/260725-lai-adicionar-botao-de-remocao-soft-delete-d/) |
| 260801-ij4 | Fix do gap item 3 do UAT da Fase 07: noValidate no `<form>` de configuracoes-form.tsx para o zodResolver assumir a validação (HTML5 nativo min=1 interceptava o submit antes do react-hook-form e escondia a mensagem "Mínimo de 1 dia.") | 2026-08-01 | 7e9e5e5, 9aecf6a | [260801-ij4-corrigir-configuracoes-form-tsx-adiciona](./quick/260801-ij4-corrigir-configuracoes-form-tsx-adiciona/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| uat_gap | Fase 04 (04-HUMAN-UAT.md) — 7 cenários pendentes: dashboard 3 seções, CRUD de templates, botão WhatsApp (preview/link ao vivo/anti-conflito com drag), auto-trigger de 1º contato nas 3 superfícies, boundary de 7 dias, race condition de "Perdido" em sequência, stageChangedAt/motivoPerda | partial — nunca testado no navegador (sem acesso a browser em nenhuma sessão até agora) | 2026-07-29 (fechamento v1.0) |
| verification_gap | Fase 04 (04-VERIFICATION.md) | human_needed — mesmo motivo do uat_gap acima | 2026-07-29 (fechamento v1.0) |
| todo | [Sequência de follow-up escalonada com templates de valor](.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md) | pending | 2026-07-29 (fechamento v1.0) |
| todo | [Conectar captura de leads da prospecção ao CRM](.planning/todos/pending/2026-07-29-conectar-captura-de-leads-da-prospec-o-ao-crm.md) | pending — conflito local vs. público (Gap 4) não resolvido | 2026-07-29 (fechamento v1.0) |
| verification_gap | Fases 1 e 2 **nunca tiveram `/gsd-verify-work` formal rodado** — nenhum `VERIFICATION.md` existe pra elas (só a Fase 3 tem, `passed`). Múltiplos `SUMMARY.md` (01-02, 01-03, 01-04, 02-02, 02-03) registram "sem acesso a navegador nesta sessão, clique real recomendado antes de considerar pronto pra uso real" | nunca verificado no navegador, apenas por leitura de código/`tsc`/`build` | 2026-07-29 (fechamento v1.0) |

Nota: a auditoria pré-fechamento também sinalizou os 5 quick tasks como "missing" — falso positivo verificado manualmente (todas as 5 pastas têm SUMMARY.md; o checker procura um campo `status:` no frontmatter que quick tasks fora do modo `--validate` não preenchem). Não são débito real, não listados acima.

## Session Continuity

Last session: 2026-08-01T18:06:48.782Z
Stopped at: Fase 07 fechada e publicada. UAT humano 6/6 via browser real; fix do item 3 aplicado (quick 260801-ij4); VERIFICATION.md promovido para `passed`; LEARNINGS.md extraído; ROADMAP/STATE/handoffs reconciliados; repositório GitHub criado pelo usuário (https://github.com/Marques10604/CRM-WhiteLabel) e primeiro push feito — branch `worktree-agent-ad346cc0697623e0c` publicada como `main` (histórico completo de 276 commits, sem PR porque era a publicação inicial de um repo vazio; `master` local antiga, de 22 commits, ficou obsoleta e não foi tocada). `origin` configurado, `origin/HEAD` apontando para `main`.
Resume file: None
Próxima fase: nenhuma decidida ainda — milestone v1.2 (Follow-up Automático) está com as 3 fases previstas 100% completas. Rodar `/gsd-progress` ou `/gsd-new-milestone` para decidir o próximo passo.
Servidor de dev: RODANDO em `http://localhost:3000` (PID 6928) — não precisa reiniciar.

### 2026-07-29 (sessão anterior) — ideias de backlog + fixes pontuais de import

Sessão de planejamento de 6 novas tarefas a partir do arquivo de ideias (`C:\Users\Vencedor\Desktop\ideia do crm.txt`). Usuário decidiu **parar por hoje sem executar nada** naquela sessão (tokens acabando) — tudo abaixo estava **só planejado, nada construído**, exceto o item 0 que já tinha PLAN.md pronto (hoje concluído).

**Exceção — fixes pontuais construídos fora do plano naquela sessão, todos direto (sem gsd-planner/gsd-executor, pra economizar tokens em mudanças pequenas e já bem entendidas):**

- `cbfb1bc`: sub-nicho obrigatório travava "Confirmar importação" quando o CSV não tinha essa coluna (caso real dele — planilha do cowork via scraping de Instagram, sem essa info). Linha sem sub-nicho agora importa com fallback `"A categorizar"` em vez de bloquear. Combobox inline pra escolher o certo na hora continua disponível, só deixou de ser obrigatório.
- `fc684c6`: erro genérico "Não foi possível importar os leads" não dizia qual linha/campo falhava. Agora a mensagem do servidor inclui número da linha, nome e campo (ex: "Linha 2 (dralizethwedeformed): Telefone inválido... [telefone]").
- `0fb70fd`: usando o erro acima, achamos a causa real do bloqueio dele — telefone com DDI estrangeiro (colombiano) não normaliza, e isso abortava o LOTE INTEIRO (mesmo comportamento problemático do sub-nicho, só que pra telefone). Linha com telefone inválido agora é excluída automaticamente da importação (reportada por nome antes de confirmar e depois via toast), resto do lote segue normal.
- Essas 3 mudanças ficam em `src/components/csv-import-wizard.tsx`, `src/components/csv-import-preview-table.tsx`, `src/actions/import-actions.ts`. `tsc --noEmit` limpo nas 3. `npm run build` completo só rodou com sucesso no primeiro fix (`cbfb1bc`) — nos dois seguintes o worker do Next crashou por falta de memória (build de produção + dev server ativos ao mesmo tempo no host de 4GB), não relacionado ao código. **Rodar `npm run build` com o dev server parado antes de considerar isso testado em produção.**
- Nenhuma dessas mudanças substitui o Gap 5 (tela de configuração) nem a Task 1 pendente (botão de remoção de sub-nicho) do plano principal — só resolvem bloqueios reais de import descobertos ao vivo.

**Decisões já tomadas na discussão (não precisa perguntar de novo ao retomar):**

- Gap 3 (porta de entrada pra IA cadastrar leads): **só local, sem deploy** — form em localhost, sem autenticação, pra um agente rodando na própria máquina do usuário preencher.
- Gap 4 (captura automática via landing page): usuário **tem** uma landing page no Vercel, mas ainda não paga tráfego pra ela; hoje ela só manda a pessoa pro WhatsApp dele (sem webhook/API nenhuma configurada). Ele quer construir o endpoint agora mesmo assim. **Conflito não resolvido**: a landing (pública, Vercel) não alcança o CRM (local, localhost) — pra isso funcionar de verdade, o CRM precisaria de algum endereço público (ou ao menos essa uma rota), o que contradiz a escolha "local only" do Gap 3. Precisa decidir com o usuário antes de construir: (a) manter tudo local e a landing continua só mandando pro WhatsApp por enquanto, (b) expor só uma rota de captura pública (ex: Vercel + Turso só pra essa rota/DB), ou (c) revisitar o Gap 3 junto e publicar o CRM inteiro.
- Gap 5 (lembretes de lead parado): usuário quer a versão completa — **tela de configuração com dias customizáveis por etapa**, não só generalizar o hardcoded de 5 dias.
- Sub-nicho: usuário pediu (mensagem avulsa) um **botão de remoção de sub-nicho** na tela `/subnichos` — soft-delete, mesmo padrão de LEAD-04.
- `/gsd-sketch --wrap-up`: aprovado, só falta rodar.
- CSV real do cowork: **adiado de propósito** — "depois testamos".

**Itens da lista de tarefas daquela sessão (voltaram pra `pending`, todos ainda não construídos exceto o item 0):**

0. **Botão de remoção de sub-nicho** — CONCLUÍDO em 2026-07-29 (quick task `260725-lai`).
1. Gap 1: auto-avançar etapa Novo→Contatado ao clicar "Abrir WhatsApp" (envio real, não só abrir o preview). Não construído.
2. Gap 2: contador de tentativas de contato (`contactAttempts` + `lastContactedAt`). Não construído.
3. Gap 5: tela de configuração de dias-parado por etapa (versão completa, decisão acima). Não construído.
4. Gap 3: porta de entrada local pra IA cadastrar leads. Não construído.
5. Rodar `/gsd-sketch --wrap-up`. Não executado.
6. Gap 4: resolver o conflito de hospedagem (ver acima) antes de construir qualquer coisa.

**Nota técnica:** `workflow.use_worktrees` foi setado pra `false` em `.planning/config.json` — decisão deliberada porque este host de 4GB já teve um executor isolado em worktree morto por OOM numa sessão anterior. Manter `false`, não reverter.

**Gaps já existentes que NÃO precisam ser re-analisados** (ver memória `project_crm_new_ideas_gap_analysis`): normalização de telefone, link wa.me, funil Kanban, botão de WhatsApp de um clique, templates com variáveis, campo de notas — tudo isso já está pronto no código.

### 02-03 (last plan of Phase 2)

- Task 1: created `src/app/importar/[batchId]/page.tsx` (dynamic route, filters by importBatchId + isNull(deletedAt)) and `src/components/post-import-lead-list.tsx` (WhatsAppSendButton/WhatsAppPreviewDialog reused unmodified, defaultTipo="primeiro_contato", no useFirstContactTrigger per D-13). Committed `87a01fb`.
- Task 2: wizard now redirects to the batch page instead of resetting to upload. Deviation: the plan assumed the confirm handler lived in csv-import-wizard.tsx, but 02-02 put it in csv-import-preview-table.tsx — adapted by changing `onImported` to carry `batchId` instead of `count`. Committed `5e19fbf`.
- `02-03-SUMMARY.md` written and committed (`72e8bf2`). `npx tsc --noEmit` and `npm run build` clean throughout; `<human-check>` browser click-through not run (no browser access this session — same caveat as every prior plan).

### Known stale item (pre-existing, not touched this session)

- ROADMAP.md's top-level Phase 3 summary line historically said "gap closure 03-04 pending — verifier found 2 blockers" while Phase Details showed 03-04 complete; documented as a resolved false-positive (Decision Coverage Gate pattern-matching bug). Now moot — v1.0 is archived in `.planning/milestones/v1.0-ROADMAP.md` with the correct `[x]` state.

### 02-02 recovery + completion

- Found a session's `/gsd-resume-work` init check reported no interrupted agent, but a manual worktree audit found `.claude/worktrees/agent-afc46b10fd2a29240` locked by a dead process (pid 4124, no longer running — likely OOM on this 4GB host) with Task 2/3 of 02-02 fully written but never committed.
- Reviewed all 6 files line-by-line before touching anything, copied them into the main checkout, fixed 2 minor deviations (`@types/papaparse` was in `dependencies` instead of `devDependencies`; a comment containing the literal substring `useReducer` was tripping the plan's own naive-grep acceptance check), then verified: `npx tsc --noEmit` clean, `npm run build` clean (route `/importar` present), both plan `node -e` acceptance scripts pass.
- Task 1's blocking human-verify gate (`@types/papaparse` supply-chain legitimacy) was satisfied via direct `registry.npmjs.org` lookup: repository = `DefinitelyTyped/DefinitelyTyped`, maintainer = Microsoft's types team, installed version matches latest (5.5.2).
- Committed as `33e5715` (Task 2) and `dd690ed` (Task 3), docs in `016ced7`. Worktree unlocked, removed, and its branch deleted.
- `<human-check>` (real browser click-through of upload → mapping → preview → confirm) still NOT run — no browser access in this headless session, same caveat as every prior plan in this project. Recommended before treating Phase 2 as ready for daily use.
- Also found a second, unrelated orphaned worktree (`agent-ab2be3f82c3c9c30d`, uncommitted `etapa-badge.tsx`/`lead-form-dialog.tsx` changes from an old Phase 3 attempt, not merged into current history) — left untouched, flagged as cleanup candidate only.

02-02-PLAN.md is FULLY COMPLETE (Tasks 1-3: gate satisfied, `33e5715`, `dd690ed`, docs `016ced7`).

## Operator Next Steps

- Rodar `/gsd-plan-phase 6` para detalhar o(s) plano(s) da Phase 6 (Auto-avanço de Etapa + Contador de Tentativas) — WA-06/WA-07/WA-08, ponto de integração único em `whatsapp-preview-dialog.tsx`.
- Phase 7 (Configuração de Dias-Parado por Etapa — CONFIG-01/CONFIG-02) é independente de Phase 6 (sem arquivos/migração compartilhados) e pode ser planejada antes, depois ou em paralelo.
