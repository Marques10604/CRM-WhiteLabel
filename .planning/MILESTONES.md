# Milestones

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
