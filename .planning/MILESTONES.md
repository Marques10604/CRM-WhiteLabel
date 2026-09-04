# Milestones

## v1.6 Dark Mode + Exportar CSV (Shipped: 2026-09-04)

**Phases completed:** 2 phases (20-21), 2 plans, 6 tasks · 25 commits · 2026-09-03 → 2026-09-04

**Delivered:** dois utilitários pequenos que faltavam — o admin escolhe claro/escuro e leva os
leads pra fora do sistema em CSV. Milestone deliberadamente pequeno; zero mudança de schema,
zero feature estrutural, nenhuma dependência nova.

**Key accomplishments:**

- **Fase 20 — toggle de dark mode.** `ThemeProvider` (next-themes, já era dependência via `sonner`) na raiz + switch sol/lua no rodapé da sidebar, visível em toda tela. Persiste em `localStorage` (100% da lib), 1º acesso segue o esquema do SO, sem flash de cor errada (`suppressHydrationWarning` + script pré-paint + guard `mounted`). Os tokens `.dark` já vinham prontos e verificados WCAG AA 30/30 da Fase 19 — a constraint D-16 daquela fase foi suspensa. Bônus: o `<Toaster />` do `sonner` já chamava `useTheme()` e passou a receber o tema real.
- **Fase 21 — exportar CSV da lista de leads.** Botão "Exportar CSV" na toolbar de `/leads` que baixa `table.getSortedRowModel().rows` (todas as linhas filtradas + ordenadas, todas as páginas — não só a página de 25). Módulo puro `src/lib/lead-csv-export.ts` (DOM-free, testável): BOM UTF-8 + delimitador `;` para abrir certo no Excel pt-BR, guard OWASP de formula injection (prefixa `'` em `= + - @`), 14 colunas legíveis (nicho e motivo de perda por nome, valor em reais, datas `dd/MM/yyyy`). 100% client-side via PapaParse já instalado — nenhuma API route nova (o CRM continua "só Server Actions"). Harness `.cjs` com 38 asserções + 2 testes de mutação.

**Known deferred items at close:** 22 (see STATE.md Deferred Items) — os mesmos do v1.5: 12 quick_tasks (falso positivo do checker), 5 todos de backlog PME, 2 seeds dormentes, 3 uat_gaps já resolvidos (Fases 05/07/19, 0 cenários abertos). Nenhum é bug real. Sem `v1.6-MILESTONE-AUDIT.md` — dispensado (milestone pequeno, ambas as fases verificadas por code+data).

**Débito técnico incorrido:** nenhum novo. Herdado que continua: WR-03/WR-04 da Fase 19 (2 gates `.cjs` frouxos), 8 quick tasks de UI, confirmação puramente visual das Fases 19/20/21 (host 4GB não roda dev + navegador + sessão).

**Processo:** as 2 fases foram para `main` por push direto (sem PR — projeto solo, code review roda como etapa do GSD). Modo enxuto (sem discuss/research/UI-SPEC/Nyquist/pattern-mapper) — escolha do usuário para um milestone pequeno. Tag `v1.6`. A Fase 20 teve o executor batendo no limite de sessão DEPOIS de commitar as 3 tasks — o orquestrador fechou o tracking e reverificou o portão.

---

## v1.5 Quitação de Débito e Auditoria Retroativa (Shipped: 2026-09-03)

**Phases completed:** 4 phases (16-19), 15 plans, 28 tasks · 98 commits · 2026-09-01 → 2026-09-03

**Delivered:** o CRM foi de "funciona, acho" para "auditado, polido, tem nome" — sem uma
única feature funcional nova. Débito de code review e de lint quitado, comportamento shipado
de 5 fases antigas verificado, e o produto ganhou nome ("SOLO"), paleta e favicon próprios.

**Key accomplishments:**

- **Fase 16 — 5 achados do `15-REVIEW.md` fechados.** `interesse` só-espaços grava `NULL` (não `''`) no create e no update (trim dentro do `z.preprocess`); a prévia do CSV mostra a coluna "Interesse" com badge de truncamento. Code review pegou 1 blocker (CR-01): o fix do `info` IN-02 podia abortar o import inteiro de uma célula com muitos emoji — corrigido, mudando o limite de 500 de code units para code points nos dois lados.
- **Fase 17 — `npm run lint` da raiz volta a exit 0.** Dos 457 erros pré-existentes (débito desde a Fase 8), ~98% era ruído de ferramental: `.claude/**` entrou no `globalIgnores`, `scripts/**/*.cjs` ganhou override de `no-require-imports`, o worktree órfão foi removido, e os 4 erros reais de `src/` (falsos-positivos do React Compiler) receberam `eslint-disable` documentado. Zero runtime tocado.
- **Fase 18 — comportamento shipado das Fases 1/2/4/6/8 verificado.** UAT ao vivo no navegador bloqueado pelo host de 4GB (dev + Chrome + sessão do agente não cabem) → pivô para **code+data**: leitura da superfície + query só-SELECT no `data/crm.db` + os 12 harnesses `test:*`/`verify:*`. `01/02-HUMAN-UAT.md` autorados do zero (20 + 15 cenários); os 5 `VERIFICATION.md` → `passed`. **0 issues de runtime.**
- **Fase 19 — o CRM virou "SOLO".** Nome + ressalva de colisão em `brand.md`, paleta "Corrente Funda · Sóbria" (navy + teal, OKLCH light+dark) escolhida via `/brand-design`, favicon próprio (`icon.svg` "S"). 33 arquivos migrados de cor hardcoded → token shadcn; escala semântica `--status-*` criada à parte da marca. Portão de 12 sensores verde. Code review: 2 warnings de UX corrigidos (`c7acae5`), 2 de gate frouxo aceitos como débito. Security 0 threats open. Verification passed 5/5 (code+data).

**Known deferred items at close:** 22 (see STATE.md Deferred Items) — 12 quick_tasks (falso positivo de checker), 5 todos de backlog PME, 2 seeds dormentes, 3 uat_gaps já resolvidos. Nenhum é bug real. Sem `v1.5-MILESTONE-AUDIT.md` — dispensado por decisão do usuário (milestone de quitação, 4/4 fases verificadas, Fase 18 já auditou retroativo).

**Débito técnico incorrido:** WR-03/WR-04 da Fase 19 (2 gates `.cjs` com checagem frouxa — `check-contrast` não cobre pares fg-sobre-card; `verify-brand-md` casa substrings). Não-bloqueante, fechável num `/gsd-quick`. Confirmação puramente visual da Fase 19 (animações, toasts, digitação real) diferida para sessão com navegador.

**Processo:** as 4 fases foram para `main` por push direto (sem PR — projeto solo, sem revisor), diferente das Fases ≤15. Tag `v1.5`.

---

## v1.4 CRM Genérico Multi-Nicho — despivô (Shipped: 2026-08-31)

**Phases completed:** 3 phases, 7 plans, 10 tasks

**Key accomplishments:**

- O vocabulário `subnicho`/`Subnicho` sai do código de schema, tipos, validação, queries, contrato de CSV e Server Actions — vira `nicho`/`Nicho`. Os nomes FÍSICOS do banco (`subnichos`, `subnicho_id`, 3 índices) ficam intocados por D-01: rename só na camada de código, sem migração, sem backup, sem esbarrar no snapshot divergente do drizzle-kit. Um doc-comment no `schema.ts` registra a divergência.
- Os 3 últimos pontos que mencionavam "área da saúde"/"nutricionista" foram neutralizados. O gate de grep COPY-01 passa: nenhuma string visível ao usuário em `src/` diz "sub-nicho", "área da saúde", "nutricionista" ou "terapeuta" — só sobra o doc-comment do `schema.ts` que explica a divergência lógico↔físico (D-01) e os nomes físicos de banco. Fase 13 completa.
- Função pura `resolvePeriodoRelatorios` transforma `period`/`from`/`to` crus da querystring em `PeriodRange` concreto + flag de rejeição (nunca lança), e `/relatorios` já recalcula as 3 seções para um intervalo arbitrário digitado direto na URL, com faixa de aviso quando as datas são inválidas.
- O `<Select>` de período de `/relatorios` ganhou a 4ª opção "Intervalo personalizado", que revela 2 date pickers (Popover + Calendar, cópia do padrão de `lead-table-toolbar.tsx`); ao preencher início E fim a tela recalcula sozinha navegando para `?period=custom&from=…&to=…`, e o intervalo sobrevive a refresh com o Select e os campos pré-preenchidos da URL.
- Coluna `leads.interesse` TEXT nullable migrada no banco real + campo opcional `interesse` (trim, max 500) em `leadBaseSchema` propagando para `leadSchema`/`csvRowSchema` + `<Input>` "Interesse" no form de lead com persistência null-explícita em `createLead`/`updateLead`.
- `"interesse"` vira `CsvFieldKey` opcional no wizard de CSV — `mapCsvRows` trunca em 500 chars antes de validar, e o valor mapeado carrega por `MappedCsvRow` -> `ConfirmedImportRow` até o insert campo-a-campo de `bulkImportLeads` (`interesse: row.interesse ?? null`).

---

## v1.3 Qualificação e Histórico de Leads (Shipped: 2026-08-30)

**Phases completed:** 5 fases (Fase 8–12), 20 planos, ~62 tasks
**Git:** `824ac48` (contexto Fase 8, 2026-08-01) → PR #3 mergeado (`a61ab0b`, 2026-08-30) · ~29 dias · 57 arquivos em `src/`+`scripts/`, ~6.7k inserções
**PRs mergeados nesta milestone:** #1 (Fase 9), #2 (Fases 10–11), #3 (Fase 12)

**Key accomplishments:**

- **Fase 8 — Origem governada (Inbound × Outbound):** campo dedicado `origemTipo` (enum) separado do texto livre `origem`, aplicado em produção via ALTER TABLE manual idempotente com backfill uniforme dos 33 leads existentes; exposto no modal de lead (sem pré-seleção na criação) e persistido como `outbound` em todo lote importado via CSV; guarda permanente `verify-origem-tipo.cjs` provada por teste de mutação.
- **Fase 9 — Timeline de interações:** tabela `interacoes` (guarda anti hard-delete estendida), todo clique de WhatsApp + toda nota manual vira registro cronológico visível na tela do lead via `LeadTimelineDialog` (3 pontos de entrada: `/leads`, `/pipeline`, rodapé do modal); eventos automáticos imutáveis no WHERE do servidor, notas manuais editáveis/apagáveis; `registerWhatsAppContact` grava contador + interação numa única transação atômica.
- **Fase 10 — Sequência de follow-up escalonada:** intervalos crescentes configuráveis em `/configuracoes` (lista dinâmica), `leads.sequenciaPosicao` avança sozinho a cada clique real de template `follow_up` e reseta ao voltar para "novo"; sugestão da próxima reabordagem ("Sugestão: dd/MM") calculada inteiramente na leitura de cada request (nunca agendada, nunca persistida) e exibida no card do pipeline e na linha do dashboard; leads Inbound ficam de fora da automação.
- **Fase 11 — Painel de métricas + relatório de motivos de perda:** tela `/relatorios` (Server Component, seletor de período por querystring sem scroll) com leads/conversão por origem, por sub-nicho ("A categorizar" como linha normal), e contagem de perdidos por motivo; captura de motivo de perda migrou de texto livre opcional para **seleção obrigatória de uma lista governada** (`/motivos-perda`, soft-delete + reativação-por-nome), com a obrigatoriedade reforçada no servidor via `.refine` condicional do Zod nas 2 superfícies (form de edição + modal de drag). 6 funções de query provadas por `test:relatorios` (38 checagens) antes de qualquer pixel.
- **Fase 12 — Agenda / tarefas soltas:** tabela `tarefas` totalmente desacoplada (sem FK, sem `deletedAt`); tarefa avulsa com data + descrição, sem vínculo a lead, intercalada por data com os follow-ups de lead dentro das 3 seções de urgência do dashboard `/` (mesma régua, sem tela nova); `deleteTarefa` é o único hard-delete legítimo do `src/` (D-08, exceção cirúrgica na ALLOWLIST do guard).
- **Processo:** `npm run build` (Next 16.2 Turbopack) voltou a ser gate normal desde a Fase 10 (débito "build nunca rodou" das Fases 06–11 quitado); UAT de navegador via extensão Claude no Chrome nas Fases 9/11/12; fluxo completo `/gsd-secure-phase` → `/close-phase` → PR exercitado pela 1ª vez nesta milestone (Fase 12: `12-SECURITY.md` 23/23 threats closed, verificação promovida pela ponte UAT).

**Known deferred items at close:** itens pré-existentes reconhecidos e mantidos como débito (ver STATE.md §Deferred Items) — 5 uat_gaps + 3 verification_gaps das Fases 1/2/4 (nunca tiveram browser/verify formal no v1.0), 5 todos PME fora do roadmap, 2 seeds (SEED-001/002), e o Teste 14 da UAT da Fase 12 (estado vazio, não testável sem banco sem leads — cópia+ramo verificados no código/build). Os 12 quick_tasks marcados "missing" pelo audit são falso-positivo conhecido (todos têm SUMMARY.md; o checker procura um campo `status:` que quick tasks fora de `--validate` não preenchem).

---

## v1.0 MVP (Shipped: 2026-07-29)

**Phases completed:** 4 phases, 15 plans, 38 tasks

**Key accomplishments:**

- Next.js 16 + Drizzle/SQLite + shadcn-on-Base-UI scaffold with a fully working sub-nicho CRUD vertical slice (create + inline rename, case-insensitive exact-dedupe, near-duplicates allowed) proving the whole stack end-to-end.
- Modal de lead com 9 campos em 3 seções (react-hook-form + Zod + Server Actions), badge de etapa e aviso de descarte, servindo a rota `/` com a lista de leads ativos ordenada por follow-up — LEAD-01 e LEAD-03 utilizáveis fim-a-fim.
- Tabela de leads totalmente interativa: sort por coluna (default follow-up mais próximo), toolbar fixa com filtro de sub-nicho/etapa/intervalo de follow-up (inclusivo nas duas pontas, resistente a fuso horário) e paginação clássica 25/página — REMIND-02 completo.
- Wizard de 3 passos completo em `/importar`: upload com drag-and-drop e detecção automática de separador/codificação, mapeamento de colunas para os campos do lead, e prévia com flags de duplicado/sub-nicho novo/sub-nicho bloqueado antes de confirmar a importação real no banco.
- Fecha o loop D-13/D-14 da Fase 2: confirmar uma importação leva o admin direto a `/importar/[batchId]`, uma tela dedicada por lote com o botão "Enviar WhatsApp" já reaproveitado da Fase 4 em cada lead — nenhum auto-disparo em sequência, sempre clique-por-clique.
- Dashboard de follow-ups em `/` agrupado por urgência (Vencidos/Hoje/Próximos 7 dias) via query pura testável, substituindo a lista de leads como tela inicial (lista movida para `/leads`).
- CRUD completo de templates de WhatsApp (tabela `templates`, Server Actions, tela `/templates`) com invariante "um padrão por tipo" garantido atomicamente via `db.transaction()` no servidor.
- Vertical slice de envio de WhatsApp: `renderTemplate()`/`buildWaLink()` puros, botão ícone `WhatsAppSendButton`, e modal `WhatsAppPreviewDialog` (seletor de tipo + textarea editável) ligados no dashboard de follow-ups e nos cards do pipeline, completando D-14/D-15/D-16/D-17.
- Ao criar manualmente um lead em qualquer superfície (`/`, `/leads`, `/pipeline`), `createLead` agora retorna o lead inserido via `.returning()` e um novo hook compartilhado `useFirstContactTrigger` abre automaticamente o modal de preview de WhatsApp com o template padrão de 1º contato e o subtítulo mandatório da UI-SPEC, sem bloquear a criação nem exigir opt-in — fechando o loop WA-04.

---

## v1.1 Importação Inteligente (Shipped: 2026-07-30)

**Phases completed:** 1 fase (Fase 5), 2 planos

**Key accomplishments:**

- `buildNotasText`/`mapCsvRows` estendidos em `src/lib/csv-import.ts` para concatenar múltiplas colunas de origem do CSV do cowork (score/sinal_dor/trecho_dor/observacao) num único campo `notas` formatado e legível, com o fallback padrão aplicado sobre o resultado final concatenado — corrigindo a regressão em que o texto genérico "Importado via CSV." podia se misturar com colunas reais.
- Wizard de importação ganhou a seção "Colunas extras para notas (opcional)" em `csv-column-mapper.tsx`, com checkboxes das colunas ainda não mapeadas e resumo ao vivo da ordem de concatenação (ordem do arquivo, não de clique) — totalmente compatível com o mapeamento 1-pra-1 já existente (IMPORT-04/IMPORT-05).
- Todos os 7 passos do `<human-check>` originalmente planejado foram confirmados por teste real de navegador (`gsd-browser`) nesta sessão de fechamento — algo inédito no projeto até aqui (fases anteriores nunca tiveram acesso a navegador). O próprio teste revelou e corrigiu 3 problemas reais: WR-01 (resumo ao vivo desatualizado após remapear coluna), CR-01 (prévia travava indefinidamente se a busca de dados de apoio falhasse) e um achado novo (quebra de linha na coluna Notas da prévia colapsada pelo CSS padrão da tabela).

---

## v1.2 Follow-up Automático (Shipped: 2026-08-01)

**Phases completed:** 2 fases (Fase 6, Fase 7), 4 planos

**Key accomplishments:**

- Fase 6 — Auto-avanço de etapa Novo→Contatado ao clicar em "Abrir WhatsApp" com o template de primeiro contato, em qualquer tela onde o botão aparece, com guarda server-side (nunca regride/re-avança leads além de Contatado); contador de tentativas de contato (`contactAttempts`) incrementado a todo clique de WhatsApp, visível no card do pipeline.
- Fase 7 — Tela `/configuracoes` generaliza o "esfriando" antes hardcoded (só Contatado, 5 dias fixo) para as 3 primeiras etapas do funil (Novo/Contatado/Negociação), cada uma com seu próprio limite configurável via tabela singleton `configuracoes`. Paridade pré-save confirmada em runtime (D-04): comportamento idêntico ao pré-deploy até o admin salvar novos valores.
- UAT humano interativo via browser real (Claude in Chrome) rodado nesta sessão de fechamento — 6/6 testes, 1 issue real encontrada (validação HTML5 nativa escondia a mensagem de erro customizada do Zod) e corrigida no mesmo ciclo (quick task 260801-ij4, `noValidate` no form).
- Primeiro push do projeto pro GitHub (`github.com/Marques10604/CRM-WhiteLabel`, branch `main`) — repositório criado pelo usuário nesta sessão, histórico completo de 276 commits publicado diretamente como `main` (repo estava vazio, não havia branch base pra abrir PR).
- Fechamento formal via `/close-phase`: `07-LEARNINGS.md` extraído, `07-VERIFICATION.md` promovido de `human_needed` para `passed` com evidência do UAT registrada.

---
