---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Qualificação e Histórico de Leads
status: shipped
last_updated: "2026-08-30T01:40:00.000Z"
last_activity: 2026-08-30
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 28
  completed_plans: 28
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-01)

**Core value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.
**Current focus:** Phase 12 — agenda-tarefas-soltas

## Current Position

Phase: 12 (agenda-tarefas-soltas) — FECHADA E SHIPADA (PR #3)
Plan: 4 of 4 — todos executados, commitados e mergeados no branch
Status: fase completa. 12-VERIFICATION.md `passed`, 12-SECURITY.md 23/23 closed, 12-LEARNINGS.md extraído, 12-UAT.md `complete` (14/15). PR #3 aberto: https://github.com/Marques10604/CRM-WhiteLabel/pull/3 (branch `worktree-agent-ad346cc0697623e0c` → `main`). **Última fase do v1.3** — falta só aprovar/mergear o PR e rodar `/gsd-complete-milestone`.
Last activity: 2026-08-30

Progress: [██████████] 100% (código) · UAT pendente

## Performance Metrics

**Velocity:**

- Total plans completed: 13
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 4 | - | - |
| 05 | 2 | - | - |
| 06 | 2 | - | - |
| 11 | 5 | - | - |

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
| Phase 08 P01 | 15min | 3 tasks | 3 files |
| Phase 08 P02 | 18min | 2 tasks | 3 files |
| Phase 08 P03 | ~25min | 3 tasks | 4 files |
| Phase 08 P03 | 35min | 3 tasks | 3 files |
| Phase 09 P01 | 10min | 3 tasks | 7 files |
| Phase 09-timeline-de-intera-es P02 | 8min | 2 tasks | 4 files |
| Phase 09 P03 | 15min | 3 tasks | 2 files |
| Phase 09 P04 | ~15min | 3 tasks | 6 files |
| Phase 10 P01 | 10min | 3 tasks | 6 files |
| Phase 10 P02 | 10min | 3 tasks | 3 files |
| Phase 10 P03 | 12min | 2 tasks | 2 files |
| Phase 10 P04 | 55min | 3 tasks | 5 files |
| Phase 11 P02 | 30min | 2 tasks | 9 files |
| Phase 11 P03 | 45min | 3 tasks | 15 files |
| Phase 11 P04 | ~25min | 3 tasks | 3 files |
| Phase 11 P05 | 20min | 3 tasks | 3 files |
| Phase 12 P01 | 12min | 3 tasks | 7 files |
| Phase 12 P02 | 16min | 3 tasks | 5 files |
| Phase 12 P03 | ~20min | 2 tasks | 3 files |
| Phase 12 P04 | ~15min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap v1.3: 5 fases (8-12), não 6 como o `research/SUMMARY.md` sugeriu — Painel de Métricas (METRICAS-01/02) e Relatório de Motivos de Perda (PERDA-01) combinados numa única Phase 11, por compartilharem a mesma infraestrutura de página `/relatorios` e por `config.json` pedir granularidade `coarse` (3-5 fases)
- Roadmap v1.3: ORIGEM-03 (gate Inbound não recebe sugestão de sequência) mapeado para Phase 10 (Sequência), não Phase 8 (Origem) — o comportamento observável só existe quando a própria sequência escalonada existe; Phase 10 depende de Phase 8 por causa disso
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
- [Phase ?]: [Phase 08-01]: origemTipo posicionado imediatamente apos origem em schema.ts e validations.ts (D-02); default apenas na coluna Drizzle/fisica e em csvRowSchema, leadSchema fica sem default (D-04, formulario forca escolha consciente)
- [Phase ?]: [Phase 08-01]: backfill uniforme confirmado em producao - todos os 33 leads (22 ativos + 11 soft-deletados, incluindo os 5 com origem insta/Teste) receberam origemTipo=outbound via ALTER TABLE manual idempotente, sem drizzle-kit
- [Phase ?]: [Phase 08-02]: origemTipo posicionado imediatamente apos origem no modal de lead (D-02), espelhando estrutura por estrutura o campo canal (D-03); defaultValues.origemTipo sem fallback garante placeholder vazio na criacao (D-04)
- [Phase ?]: [Phase 08-02]: CSV_DEFAULTS.origemTipo eh documentacao/paridade visual; aplicacao real do default outbound continua no .default() do csvRowSchema (08-01) -- origemTipo nao vira CsvFieldKey mapeavel, wizard sem passo de UI novo
- [Phase 08-03]: Bootstrap pre-existente de test-lead-actions.cjs consertado deliberadamente na fase (opcao a), nao adiado - Casos 9/10 provam obrigatoriedade/persistencia de origemTipo
- [Phase 08-03]: Guarda verify-origem-tipo.cjs provada por teste de mutacao que nunca escreve o arquivo-fonte real (copia em os.tmpdir()) - elimina risco de interrupcao deixar import-actions.ts quebrado em disco
- [Phase 08-03]: npx eslint sem escopo revelou 413 problemas pre-existentes (.claude/get-shit-done, worktree orfao, scripts .cjs pre-existentes) nao relacionados a origemTipo - documentado em deferred-items.md, fora de escopo, nao bloqueia fechamento da Fase 8
- [Quick 260807-uit]: WR-02 executado antes de WR-01 (ordem obrigatoria) - a guarda verify-origem-tipo.cjs precisava aceitar as duas formas do default (.default("outbound") ou .default(CSV_DEFAULTS.origemTipo)) antes da Task 2 trocar a forma real, senao quebraria no meio da tarefa
- [Quick 260807-uit]: IN-01 e IN-02 do 08-REVIEW.md permanecem deliberadamente intocados - sao "info", nao "warning", fora do escopo desta tarefa
- [Phase ?]: [Phase 09-01]: Coluna unica tipo (4 valores, incluindo nota_manual) em interacoes, sem segunda dimensao de categorizacao
- [Phase ?]: [Phase 09-01]: whatsappContactSchema.texto obrigatorio desde 09-01, mas registerWhatsAppContact so passa a enviar texto na 09-02 - janela intencional, executar 09-02 antes de considerar a Fase 9 pronta para uso real do botao WhatsApp
- [Phase ?]: [Phase 09-01]: drizzle-kit push recriou subnicho_nome_unique_idx (DROP+CREATE identico) por drift de snapshot ja conhecido - sem perda de dado, subnichos com 9 linhas intactas
- [Phase 09-02]: registerWhatsAppContact grava contador e interacao numa unica db.transaction(); insert incondicional fora do bloco de avanco cobre os 3 tipos de template
- [Phase 09-02]: Harness test-interacao-actions.cjs roda sem ORM/sem import de TS (:memory: puro), seguindo o precedente de verify-wa-contact-invariant.cjs, para nao depender de bootstrap de migracoes de uma tabela sem .sql versionado
- [Phase 09-03]: eslint-disable documentado para 2 falsos-positivos ja conhecidos (react-hooks/set-state-in-effect no reset do efeito, react-hooks/refs em form.handleSubmit) - mesmo padrao ja aceito para whatsapp-preview-dialog.tsx/template-form-dialog.tsx/configuracoes-form.tsx (STATE.md decisao 07-02)
- [Phase 09-03]: DeleteNotaDialog renderizado como irmao do Dialog da timeline (fragment no retorno do componente), nao aninhado dentro do DialogContent - segue instrucao literal do plano e precedente de lead-table.tsx
- [Phase 09-04]: Icone History sempre inserido DENTRO de wrappers de stopPropagation ja existentes (lead-table.tsx linha inteira, pipeline-lead-card.tsx wrapper do WhatsAppSendButton), nunca em um novo wrapper irmao
- [Phase 09-04]: eslint-disable-next-line react-hooks/set-state-in-effect adicionado em whatsapp-preview-dialog.tsx (setTipo dentro do efeito de reset) para destravar o gate eslint escopado da Task 3 — mesmo padrao ja aceito no projeto (STATE.md decisao 07-02), ja aplicado em lead-timeline-dialog.tsx (09-03) para o mesmo falso-positivo do React Compiler
- [Phase 10-01]: D-11: semente de configuracoes.sequenciaIntervalosDias e [4,10,20], nao [] - lista vazia bloquearia o salvamento dos 3 campos de dias-parado ja existentes por causa da validacao min(1) do 10-UI-SPEC.md
- [Phase 10-01]: D-12: reset de sequenciaPosicao para 0 ao voltar para stage=novo vale tanto para updateLeadStage quanto para updateLead (implementado no plano 10-02); motivoPerda ja segue esse padrao hoje
- [Phase 10-01]: computeSequenciaSugestao ganhou um 4o gate (stage terminal) alem dos 3 esbocados em 10-RESEARCH.md, exigido pelo 10-UI-SPEC.md - amplitude deliberada, nao divergencia acidental
- [Phase ?]: [Phase 10-02]: avancaSequencia em registerWhatsAppContact e independente de advanced - so follow_up avanca sequenciaPosicao, primeiro_contato/prova_valor nunca alteram
- [Phase ?]: [Phase 10-02]: reset de sequenciaPosicao usa idioma condicional-por-valor-alvo (stage===novo), nao condicional-por-mudanca - aplicado em updateLead e updateLeadStage
- [Phase ?]: [Phase 10-02]: guardas .cjs em :memory: que testam SQL de leads devem usar ids unicos por cenario (freshLead), nunca DELETE FROM leads - guard-no-hard-delete.cjs faz match de linha e nao distingue producao de teste, nem codigo de comentario
- [Phase 10-03]: saveConfiguracoes le a lista dinamica via formData.getAll (nao mais Object.fromEntries), configuracoesServerSchema como contrato autoritativo
- [Phase 10-03]: Ids de linha da lista dinamica: indice do array na carga inicial, contador em useRef (seeded pelo tamanho inicial) para linhas novas, so lido/escrito em event handlers para evitar falso-positivo react-hooks/refs do React Compiler
- [Phase 10-04]: Gate de build (npm run build) documentado como pendencia de infraestrutura (host 4GB RAM), nao defeito de codigo - npx tsc --noEmit isolado passou limpo 2x, 9/10 gates automatizados verdes
- [Phase 11-02]: createMotivoPerda/renameMotivoPerda/softDeleteMotivoPerda devolvem shape homogêneo { success: true; id }; rename/softDelete ecoam o id recebido, só o combobox criável de 11-03 consome o id
- [Phase 11-02]: harnesses de teste ganham stub no-op de next/cache (scripts/test-support/) para asserir o retorno de Server Actions fora do runtime do Next; molde test-lead-actions.cjs só tolerava o throw de revalidatePath
- [Phase 11-02]: revalidatePath('/relatorios') ja disparado por todas as mutacoes de motivo antes da rota existir (no-op seguro) para nao reabrir motivo-perda-actions.ts no plano 11-05
- [Phase ?]: [Phase 11-03]: leadSchema = leadBaseSchema (objeto puro) + .refine condicional D-04; mensagem verbatim compartilhada com stageUpdateSchema; motivoPerdaId usa z.preprocess('' -> undefined) porque o input oculto do combobox emite string vazia
- [Phase ?]: [Phase 11-03]: motivoPerdaExists tambem em updateLeadStage (T-11-13, sem try/catch de FK ali); prop motivosPerda threadada pelas 4 superficies do LeadFormDialog
- [Phase ?]: [Phase 11-04]: getContagemPorMotivoPerda tipa retorno como motivoPerdaId number|null — Drizzle nao estreita coluna da tabela-base em innerJoin; tipagem honesta em vez de assercao
- [Phase ?]: [Phase 11-04]: teste de integracao de query monta schema por DDL cru em os.tmpdir() (so as 3 tabelas + colunas que as queries tocam), nao replay das migrations
- [Phase ?]: [Phase 11-05]: PeriodoSelector recebe value já normalizado pela página; servidor decide default (30d ausente) e fallback (tudo inválido), cliente é só o router.push
- [Phase ?]: [Phase 11-05]: gate verify:motivos-perda-schema do PLAN.md não existe — Onda 1 estendeu verify-schema.cjs; cobertura dentro de verify:schema
- [Phase 12-01]: tabela `tarefas` totalmente desacoplada — sem FK, sem `deletedAt`; `concluida_em` nullable e SEM default físico (NULL = pendente, D-01), mesmo idioma de interacoes.updatedAt / leads.stageChangedAt
- [Phase 12-01]: `tarefas` é a PRIMEIRA e única entrada na ALLOWLIST do guard-no-hard-delete (D-08) — oposto das extensões de bloqueio das Fases 9/11; CODE_PATTERNS/CODE_SQL_PATTERNS ficam intocados, então DELETE FROM leads segue bloqueado inclusive dentro de tarefa-actions.ts
- [Phase 12-01]: verify:schema usa conjunto ESTRITO de colunas para `tarefas` (molde de interacoes, não de leads) — tabela nova não acumula colunas por fase; mutação provada (gate falha sem a tabela)
- [Phase 12-01]: migração `scripts/migrate-tarefas.cjs` rodada 2x contra data/crm.db — tabela criada, 37 leads intactos, idempotência confirmada; zero comandos drizzle-kit
- [Phase ?]: [Phase 12-02]: groupByUrgency<T> genérico; groupLeadsByUrgency vira wrapper de 1 linha — call-sites preservados
- [Phase ?]: [Phase 12-02]: updateTarefa não filtra isNull(concluidaEm) no WHERE (D-07 edita tarefa concluída); concluirTarefa idempotente via isNull, desfazer via isNotNull
- [Phase ?]: [Phase 12-02]: buildDashboardItems mora em queries.ts e é pura — ordenar cada bucket por date ASC materializa D-04 (lead+tarefa intercalados)
- [Phase ?]: [Phase 12-02]: 1ª cobertura automatizada da régua de urgência (lacuna de groupLeadsByUrgency fechada); hard-delete D-08 provado por ausência da linha + teste de mutação

### Pending Todos

Backlog registrado em 2026-08-01 a partir de uma varredura de ideias externa (`C:\Users\Vencedor\Desktop\Ideias.txt`) — os 6 itens de alto valor abaixo agora têm requisito (REQUIREMENTS.md) e fase mapeada em ROADMAP.md (Fases 8-12); os arquivos de todo continuam em `pending/` até a fase correspondente ser executada e fechada.

**Alto valor (agora mapeados em fases do roadmap v1.3):**

1. [Separação Inbound x Outbound](.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md) → Phase 8 (ORIGEM-01/02) + Phase 10 (ORIGEM-03)
2. [Timeline de interações por lead](.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md) → Phase 9 (TIMELINE-01/02)
3. [Sequência de follow-up escalonada com templates de valor](.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md) → Phase 10 (SEQ-01/02/03) — pendência original de 2026-07-21
4. [Painel de métricas por origem e sub-nicho](.planning/todos/pending/2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho.md) → Phase 11 (METRICAS-01/02)
5. [Relatório de motivos de perda](.planning/todos/pending/2026-08-01-relat-rio-de-motivos-de-perda.md) → Phase 11 (PERDA-01)
6. [Agenda/tarefas soltas](.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md) → Phase 12 (TAREFA-01/02)

**PME (avaliar prioridade, não urgente, fora do roadmap v1.3):** [tags livres](.planning/todos/pending/2026-08-01-tags-livres-por-lead.md), [temperatura automática](.planning/todos/pending/2026-08-01-temperatura-autom-tica-do-lead.md), [busca global](.planning/todos/pending/2026-08-01-busca-global.md), [exportar CSV](.planning/todos/pending/2026-08-01-exportar-dados-em-csv.md), [anexo por lead](.planning/todos/pending/2026-08-01-anexo-simples-por-lead.md), [campo vendedor no banco](.planning/todos/pending/2026-08-01-campo-de-vendedor-respons-vel-no-banco.md), [meta mensal](.planning/todos/pending/2026-08-01-meta-mensal-com-barra-de-progresso.md)

**Herdadas de sessões anteriores:** [Conectar captura de leads da prospecção ao CRM](.planning/todos/completed/2026-07-29-conectar-captura-de-leads-da-prospec-o-ao-crm.md) — status `completed` no disco mas **não resolvida de fato**: o gargalo real (CSV do cowork) foi coberto pela Fase 5, mas a conexão landing-page↔CRM em si segue TBD (mesmo conflito local-vs-público, ver IMPORT-V2-02 em `REQUIREMENTS.md`)

**Seeds (gatilho futuro, surgem em `/gsd-new-milestone`):** [SEED-001](.planning/seeds/SEED-001-roadmap-p-s-cliente-pagante.md) (proposta/catálogo/pós-venda, gatilho: 1º cliente pagante), [SEED-002](.planning/seeds/SEED-002-infra-white-label.md) (multi-tenant/white label, mesmo gatilho, tratado como outro produto)

### Blockers/Concerns

Resolvidos no v1.0, limpos no fechamento do milestone:

- ~~Phase 2 (CSV Import): no real cowork CSV sample available yet~~ — resolvido: um CSV real do cowork foi usado em prospecção ao vivo e revelou os bugs corrigidos em `cbfb1bc`/`fc684c6`/`0fb70fd` (telefone com DDI estrangeiro, sub-nicho ausente)
- ~~[Phase 3 gap-closure] Decision Coverage Gate falso positivo~~ — resolvido e documentado no `RETROSPECTIVE.md` como padrão recorrente de falso-positivo em checkers baseados em grep

Aberto, carregado para o v1.3:

- Cross-cutting: continuar vigiando scope creep para auth/multi-usuário/mobile/WhatsApp Business API em toda fase nova — explicitamente fora de escopo por `PROJECT.md`.
- Phase 8: backup de `data/crm.db` antes de qualquer `drizzle-kit push` que altere a tabela `leads` (dados reais de `origem` já sujos — `"Importação CSV"`, `"Teste"`, `"insta"`, confirmado por query direta em `research/SUMMARY.md`).
- Phase 9/Phase 12: `interacoes` e `tarefas` precisam entrar em `scripts/guard-no-hard-delete.cjs` no mesmo commit que as cria, com decisão explícita de soft-delete (default recomendado: sem `deletedAt`, YAGNI) documentada como D-XX no momento da fase.
- Phase 10: reset de `sequenciaPosicao` (ao fechar/perder lead vs. voltar para "novo") é decisão de produto em aberto — resolver em `/gsd-discuss-phase` da própria Phase 10, não travar em pesquisa adicional.
- Phase 11: governança de `motivoPerda` (enum vs. normalização leve) é decisão explícita em aberto — resolver na discussão da própria Phase 11.
- ~~Fase 10 (10-04): npm run build esgota memoria no host 4GB~~ — **RESOLVIDO 2026-08-29**: `npm run build` passou limpo (exit 0). O Next 16.2 usa **Turbopack** no `next build` (não mais webpack) — muito mais leve, a fase "Running TypeScript" que dava OOM passou em 33s. 13 páginas geradas. `next build` volta a ser gate normal das próximas fases. (Ainda ajuda fechar processos node antes.)

### Direção de infraestrutura / operação (definida 2026-08-27)

**Plano:** CRM + o produto novo "Prospector Inteligente AI" (topo de funil, pasta `C:\Users\Vencedor\Desktop\Prospector Inteligente AI`) rodam num **VPS único** quando prontos.

- Motivo principal é do Prospector (precisa rodar 24/7; WhatsApp não-oficial não roda serverless), o CRM pega carona.
- **Resolve o Gap 4** (impasse "CRM local × prospecção pública") que trava a todo `Conectar captura de leads da prospecção ao CRM` — com os dois no mesmo VPS o handoff vira export/import de CSV (o CRM já importa CSV) ou API interna.
- **Ordem:** Prospector sobe primeiro; CRM migra depois, sem pressa. Nenhuma ação necessária no v1.3 do CRM agora.
- Ao migrar o CRM: ativar gate de senha no middleware (já previsto no `CLAUDE.md`, "Stack Patterns by Variant"), Litestream do `data/crm.db` pra backup, Caddy/Coolify pra HTTPS. Continua SQLite; Postgres só quando houver multi-tenant real.
- Detalhes completos: `IDEIA.md` seção 6 na pasta do Prospector.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260720-x41 | Corrigir dialog/modal de preenchimento maior que a tela - adicionar max-h e overflow-y-auto | 2026-07-21 | c00c8cb | [260720-x41-corrigir-dialog-modal-de-preenchimento-n](./quick/260720-x41-corrigir-dialog-modal-de-preenchimento-n/) |
| 260721-0cl | Adicionar texto de ajuda/descrição abaixo do label de cada campo do formulário de lead | 2026-07-21 | 689b168 | [260721-0cl-adicionar-texto-de-ajuda-descri-o-abaixo](./quick/260721-0cl-adicionar-texto-de-ajuda-descri-o-abaixo/) |
| 260725-219 | Implementar no sidebar real (app-sidebar.tsx) as decisões dos sketches 001/004: brand header selo discreto, rótulo "Principal", ícones lucide, espaçamento e fundo teal suave no item ativo | 2026-07-25 | abaaba7 | [260725-219-implementar-no-sidebar-real-do-app-src-c](./quick/260725-219-implementar-no-sidebar-real-do-app-src-c/) |
| 260725-gzb | Implementar na lista real de leads (/leads) as decisões dos sketches 002/003: linhas híbridas em flex + botão WhatsApp nomeado | 2026-07-25 | 7deff3b | [260725-gzb-implementar-na-tela-real-de-leads-lead-t](./quick/260725-gzb-implementar-na-tela-real-de-leads-lead-t/) |
| 260725-lai | Botão de remoção (soft-delete) de sub-nicho em /subnichos: coluna deletedAt, softDeleteSubnicho, reativação por nome, filtro nas superfícies de seleção (combobox + toolbar) | 2026-07-29 | 59a27c6, 2c7a1ba, fa7a778 | [260725-lai-adicionar-botao-de-remocao-soft-delete-d](./quick/260725-lai-adicionar-botao-de-remocao-soft-delete-d/) |
| 260801-ij4 | Fix do gap item 3 do UAT da Fase 07: noValidate no `<form>` de configuracoes-form.tsx para o zodResolver assumir a validação (HTML5 nativo min=1 interceptava o submit antes do react-hook-form e escondia a mensagem "Mínimo de 1 dia.") | 2026-08-01 | 7e9e5e5, 9aecf6a | [260801-ij4-corrigir-configuracoes-form-tsx-adiciona](./quick/260801-ij4-corrigir-configuracoes-form-tsx-adiciona/) |
| 260807-uit | Fechar os 3 warnings do code review da Fase 8 (`08-REVIEW.md`): WR-02 (verify-origem-tipo.cjs reescrito com checagens estruturais tolerantes a reformatação), WR-01 (csvRowSchema.origemTipo consome CSV_DEFAULTS.origemTipo como fonte única), WR-03 (Casos 11/12 de cobertura comportamental de bulkImportLeads em test-lead-actions.cjs) | 2026-08-08 | 39be18a, d60b3ee, 2cbbd8a | [260807-uit-corrigir-os-3-warnings-do-code-review-da](./quick/260807-uit-corrigir-os-3-warnings-do-code-review-da/) |
| 260811-pb1 | Corrigir WR-01 do 09-REVIEW.md: race condition em registerWhatsAppContact — reverificar stage no WHERE atômico da transação em vez de confiar num SELECT pré-transação | 2026-08-11 | 73b43b2 | [260811-pb1-corrigir-wr-01-race-condition-em-registe](./quick/260811-pb1-corrigir-wr-01-race-condition-em-registe/) |
| 260811-ro5 | Corrigir IN-01 do 09-REVIEW.md: guard de in-flight no botão de excluir nota manual (mesmo padrão de salvandoEdicaoId) | 2026-08-11 | 5798a58 | [260811-ro5-corrigir-in-01-guard-de-in-flight-no-bot](./quick/260811-ro5-corrigir-in-01-guard-de-in-flight-no-bot/) |
| 260808-h5i | Corrigir warning React 19 em lead-form-dialog.tsx: formAction (useActionState) chamado fora de startTransition — envolvido em startTransition(() => {...}), FormData montado antes a partir do DOM bruto (contrato da Phase 01 preservado). Efeito colateral positivo: botão "Salvando..."/disabled=pending passa a funcionar de verdade. Verificado ao vivo no navegador (warning sumiu do console, botão mostrou "Salvando...") | 2026-08-08 | 1b7dc04 | [260808-h5i-corrigir-warning-react-19-useactionstate](./quick/260808-h5i-corrigir-warning-react-19-useactionstate/) |
| 260828-flg | Corrigir rótulo do seletor de período em /relatorios: PeriodoSelector passa `items` ao Select (Base UI) para o gatilho fechado exibir "Últimos 30 dias"/"Últimos 90 dias"/"Tudo" em vez do token cru (30d/90d/tudo). Mesmo idioma dos selects canal/origemTipo/stage. Fecha os 3 itens `issue` do UAT da Fase 11 (Testes 1/3/4). tsc limpo, verificado por SSR. | 2026-08-28 | 5ae841b | [260828-flg-corrigir-rotulo-do-seletor-de-periodo](./quick/260828-flg-corrigir-rotulo-do-seletor-de-periodo/) |
| 260828-gna | Corrigir deadlock ao arrastar card para "Perdido" no /pipeline (bug do UAT da Fase 11, Teste 5): setMotivoPerdaState({open:true}) saiu de dentro de startTransition(async → await new Promise); agora o drop para Perdido só enfileira + abre o modal (urgente), e "Salvar motivo" dispara uma nova transição normal que move+persiste. "Cancelar" só descarta (card nunca moveu). +MotivoPerdaDialog só bloqueia dismiss Esc/clique-fora, +dedup da fila. Verificado ao vivo (janela visível): modal abre sem freeze, card não move no drop, Cancelar fecha limpo. | 2026-08-28 | fbf7abd..1dd794b | [260828-gna-corrigir-deadlock-drag-perdido](./quick/260828-gna-corrigir-deadlock-drag-perdido/) |
| 2026-08-29 | fast | Kanban do /pipeline cabe as 5 colunas na tela sem rolar pro lado: colunas flex-1 min-w-[200px] + gap-3, linha de badges do card com flex-wrap, <main> com min-w-0. Verificado no navegador (5 colunas visíveis, 0 scroll horizontal). | ✅ 5b52ffa |
| 2026-08-29 | fast | Nome do lead no card do pipeline em 1 linha com reticências (truncate + title no hover), em vez de quebrar linha. | ✅ 0a72800 |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| uat_gap | Fase 04 (04-HUMAN-UAT.md) — 7 cenários pendentes: dashboard 3 seções, CRUD de templates, botão WhatsApp (preview/link ao vivo/anti-conflito com drag), auto-trigger de 1º contato nas 3 superfícies, boundary de 7 dias, race condition de "Perdido" em sequência, stageChangedAt/motivoPerda | partial — nunca testado no navegador (sem acesso a browser em nenhuma sessão até agora) | 2026-07-29 (fechamento v1.0) |
| verification_gap | Fase 04 (04-VERIFICATION.md) | human_needed — mesmo motivo do uat_gap acima | 2026-07-29 (fechamento v1.0) |
| todo | [Conectar captura de leads da prospecção ao CRM](.planning/todos/pending/2026-07-29-conectar-captura-de-leads-da-prospec-o-ao-crm.md) | pending — conflito local vs. público (Gap 4) não resolvido | 2026-07-29 (fechamento v1.0) |
| verification_gap | Fases 1 e 2 **nunca tiveram `/gsd-verify-work` formal rodado** — nenhum `VERIFICATION.md` existe pra elas (só a Fase 3 tem, `passed`). Múltiplos `SUMMARY.md` (01-02, 01-03, 01-04, 02-02, 02-03) registram "sem acesso a navegador nesta sessão, clique real recomendado antes de considerar pronto pra uso real" | nunca verificado no navegador, apenas por leitura de código/`tsc`/`build` | 2026-07-29 (fechamento v1.0) |

Nota: a auditoria pré-fechamento também sinalizou os 5 quick tasks como "missing" — falso positivo verificado manualmente (todas as 5 pastas têm SUMMARY.md; o checker procura um campo `status:` no frontmatter que quick tasks fora do modo `--validate` não preenchem). Não são débito real, não listados acima.

## Session Continuity

### ▶ COMEÇA AQUI (próxima sessão) — 2026-08-30

Fase 12 (agenda/tarefas soltas): **código + gates + UAT de navegador 100% feitos**. Faltam 2 passos pra fechar o milestone v1.3:

1. `/gsd-secure-phase 12` — não existe `12-SECURITY.md` e `security_enforcement: true`. Os threat models T-12-01..T-12-SC já estão nos 4 PLANs; é só verificar as mitigações no código.
2. `/close-phase 12` — extract-learnings → bridge do verification gate → PR. Promove TAREFA-01/02 pra Done. **Fecha o v1.3.**

Working tree limpo (só `.planning/config.json` M e `.claude/` untracked, ambos pré-existentes/irrelevantes). Branch `worktree-agent-ad346cc0697623e0c`. Nenhum processo node ativo. Último commit: `eabf81f`.

---

Last session: 2026-08-29→30 (resume + execução + UAT) — Fase 12 retomada de plano interrompido, LEVADA ATÉ O FIM e com UAT de navegador concluída.

**O que foi feito nesta sessão:**
- **12-03 concluído**: Task 1 (`delete-tarefa-dialog.tsx` + `tarefa-form-dialog.tsx`) estava no working tree sem commit — verificada (`tsc` 0, adicionado `eslint-disable react-hooks/refs` documentado), commit `3211dcf`. Task 2 (`tarefa-card.tsx`) construída do zero — commit `9528807`. Docs `d1dfcab`. `12-03-SUMMARY.md` criado.
- **12-04 concluído**: `page.tsx` (`getTarefasPendentes` + `buildDashboardItems`) + `followup-dashboard.tsx` (7 mudanças: props `DashboardItem[]`, `.map` ramifica por `item.kind`, botão "Nova tarefa", estado vazio, `TarefaFormDialog` irmão) — commit `42efb8d`. `12-04-SUMMARY.md` criado.
- **Suíte de gates 100% verde** (rodada em sequência, dev server parado): `tsc --noEmit`, `eslint` (10 arquivos), `verify:schema`, `guard:no-hard-delete`, `test:tarefa-actions` (7), `test:group-by-urgency`, `test:compute-sequencia`, `test:lead-actions`, `test:relatorios` (38), **`npm run build` exit 0** (Turbopack, 47s compile + 28.5s TS, 13 páginas, rota `/`).

**UAT da Fase 12 — FEITA (2026-08-30, automação de navegador):** `12-UAT.md` `status: complete`, 14/15 pass, 0 issues, 1 skip (estado vazio — precisa banco sem leads, cópia+ramo verificados no código/build). Todos os comportamentos observáveis confirmados: criar/editar/concluir/excluir tarefa, intercalação por data nas 3 seções, contagem somada, distinção visual do card, hard-delete provado no banco (D-08), sem rota nova. Extensão do Chrome teve instabilidades de screenshot (mesmo sintoma da Fase 11) — contornadas, sem afetar resultados.

**Pendências da Fase 12:**
1. `/gsd-secure-phase 12` — `workflow.security_enforcement: true` e não existe `12-SECURITY.md`. Requerido antes de fechar. (Threat models T-12-* já estão nos PLANs.)
2. `/close-phase 12` (extract-learnings → bridge do verification gate → PR). Fecha o milestone v1.3.

REQUIREMENTS.md: TAREFA-01/02 ainda `Pending` no disco — `/close-phase` promove após o gate.

Branch: `worktree-agent-ad346cc0697623e0c`. Dev server: nenhum processo node ativo. Working tree limpo após os commits de docs.

---

Sessão anterior: 2026-08-29T20:33:56.297Z

**Estado da Fase 11 — EXECUÇÃO COMPLETA, UAT HUMANO PENDENTE:**

- **5/5 planos executados e commitados** (11-01…11-05), todos sequenciais inline (sem worktree — host 4GB). Commits das ondas 3–5 nesta sessão:
  - 11-03 (motivo de perda obrigatório, `MotivoPerdaCombobox` criável, `.refine` server-side): `975ebc7` `fc2ef31` `74c0f13` `aebe9d3` — 5 deviations, todas auto-fixed.
  - 11-04 (3 agregações SQL `GROUP BY` + funções puras em `src/db/queries.ts`): `1193dea` `ac6acea` `dddbb36` `c27a1e9` `cdb8c56` — 0 deviations de comportamento.
  - 11-05 (tela `/relatorios` + `periodo-selector` + item na sidebar): `8097aca` `403642c` `ef5a395` `9e6d455`.
- **gsd-verifier: `human_needed`** — 3/3 success criteria satisfeitas na camada de código e de dados. Todos os gates exit 0 (`tsc --noEmit`, `verify:schema`, `verify:motivo-perda`, `test:relatorios` 38 checagens, `test:motivo-perda-actions` 7, `guard:no-hard-delete`). `11-VERIFICATION.md` commitado. Banco real inspecionado: 6 motivos-semente verbatim, FK presente, 37 leads intactos, backup datado em disco.
- **`11-HUMAN-UAT.md` criado e commitado (`d967c8f`)** — 8 itens pendentes (`status: partial`): render de `/relatorios`, taxa "0%" nunca "NaN%", seletor de período em tempo real (scroll:false), fallback `?period=xyz`, fluxo drag→modal obrigatório→reversão no Cancelar, combobox criável, end-to-end captura→agregação, posição dos itens no menu.
- STATE `status: ready_for_uat` (`74fedaf`). ROADMAP já marcava Fase 11 `[x]` (executor marcou cedo) — só fecha de verdade após o UAT passar.

**2 WARNINGS do verificador (não bloqueiam o goal — candidatos a gap-closure):**

1. `scripts/verify-motivos-perda-schema.cjs` **nunca foi criado** (estava nos must_haves de 11-01). A cobertura foi "folded" em `verify-schema.cjs`, que só checa tabela/índice/coluna — NÃO checa FK, colunas exatas, 6 seeds, nullability nem órfãos. Verificado à mão nesta sessão, mas sem gate automático de regressão.
2. **Drift FK schema↔banco**: `leads.motivo_perda_id` está `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` no `schema.ts` (a DDL da migração de 11-01 omitiu `ON DELETE RESTRICT`). 2ª barreira anti-remoção-destrutiva inativa; a primária (`guard-no-hard-delete`) está verde e há 0 referências hoje.

**Config de execução ativa** (`.planning/config.json`): `parallelization: false`, `workflow.use_worktrees: false`. Execução SEQUENCIAL inline no working tree (host 4GB — [[feedback_4gb_ram_avoid_parallel]]).

**Como retomar:**

1. `/gsd-verify-work 11` — rodar os 8 itens de UAT no navegador (precisa `npm run dev` — porta 3000/3001; nenhum processo node ativo agora). Atualizar `11-HUMAN-UAT.md` com os resultados.
2. Se UAT passar: `/close-phase 11` (extract-learnings → PR).
3. Alternativa pros 2 warnings: `/gsd-plan-phase 11 --gaps` cria planos de gap-closure (script de schema + regenerar a FK com a cláusula certa).
4. Ainda pendente do pedido do usuário: **revisão cross-AI do código** — `/gsd-code-review 11` + `/gsd-review --phase 11` (Codex + Gemini via CLI; na Fase 8 só o Codex respondeu — checar `which codex gemini` antes).

**Pendências abertas do usuário nesta sessão (fora da Fase 11):**

- Produto novo "Prospector Inteligente AI" — pasta `C:\Users\Vencedor\Desktop\Prospector Inteligente AI` com `IDEIA.md` commitado. Usuário vai abrir sessão nova lá e rodar `/gsd-new-project @IDEIA.md`. Decisões já fechadas: híbrido/SaaS-ready desde o dia 1, VPS único hospeda CRM + Prospector. Ver memória `project_prospector_inteligente_ai`.

Branch: `worktree-agent-ad346cc0697623e0c` (branching_strategy=none — trabalho da Fase 11 todo aqui). Servidor de dev: nenhum processo node ativo. Working tree limpo (só `.claude/` untracked, pré-existente).

### Retomada exata da Fase 8 (`/go-and-do 8`)

**O que já está pronto e commitado** em `.planning/phases/08-origem-governada-separa-o-inbound-outbound/`:

- `08-SPEC.md`, `08-CONTEXT.md`, `08-DISCUSSION-LOG.md` — gerados via `--auto`
- `08-INTENT-REVIEW.md` — frontmatter `intent_review: needs_decision` (ciclo 1 rodou: Codex sozinho, `gpt-5.6-terra`; agy falhou — `revisor-gsd` não instalado neste host, rota legada negada em modo headless; degradação registrada em `sinos`). Achados confirmados: 6; descartados: 5; pausas de negócio: 2 (`q1-backfill-teste-insta`, `q2-csv-default-permanente`)
- `08-DECISOES.md` — decisão da orquestração pra `q2` (manter `origemTipo="outbound"` fixo em todo import CSV, sem seletor de UI novo)
- `08-RUN-LOG.jsonl` — telemetria da rodada até a interrupção

**O que NÃO ficou resolvido:** a resposta do usuário pra `q1-backfill-teste-insta` foi dada no chat ("Todos outbound (Recomendado)" — os 5 leads soft-deletados com origem "insta"/"Teste" viram `origemTipo=outbound` no backfill, igual ao resto do lote), mas o subagente de intenção **morreu por limite de sessão antes de gravar essa resposta no `08-INTENT-REVIEW.md`** e finalizar o ciclo. `intent_review` ainda está `needs_decision` no frontmatter, não `done`.

**Como retomar:** rodar `/go-and-do 8` numa sessão nova. Pela Sub-rotina H (retomada cross-sessão), a Etapa 0-B vai redespachar o subagente de intenção do zero (não dá pra continuar o subagente antigo entre sessões) — ele vai ler o `08-INTENT-REVIEW.md` existente e retomar cirúrgico. **Ao chegar em `q1-backfill-teste-insta`, a resposta já está decidida — não precisa perguntar de novo ao usuário:** todos os 33 leads (incluindo os 5 "insta"/"Teste" soft-deletados) recebem `origemTipo=outbound` no backfill.

Também vale registrar, se ainda não estiver claro pro subagente novo: `q2-csv-default-permanente` já foi decidida (ver `08-DECISOES.md`) — manter default fixo, sem seletor de UI.

**Nota técnica desta rodada:** `gsd-tools.cjs` não existe neste host — usar `gsd-sdk` (instalado globalmente, mesmos handlers) como equivalente em qualquer `gsd_run query ...` que os prompts da skill pedirem.

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

- Rodar `/gsd-plan-phase 8` para detalhar o(s) plano(s) da Phase 8 (Origem Governada + Separação Inbound × Outbound) — ORIGEM-01/02, decisão de schema (`origemTipo` coluna nova) já resolvida, backfill precisa de query real contra `data/crm.db` (valores sujos conhecidos: `"Importação CSV"`, `"Teste"`, `"insta"`).
- Considerar `/gsd-discuss-phase 8` antes do plano, dado que a fase mexe em dado real de produção via `drizzle-kit push` sem migration history versionado (mesmo padrão de risco já visto na Fase 6/7).
- Fases 9 (Timeline) e 12 (Tarefas) não têm dependência técnica dura de Phase 8 e podem ser planejadas/executadas em paralelo ou adiantadas, se preferir por ordem de valor de negócio (ver `PROJECT.md` "Target features").
