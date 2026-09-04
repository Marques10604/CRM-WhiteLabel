# Project Retrospective

*Documento vivo, atualizado após cada milestone. As lições alimentam o planejamento seguinte.*

## Milestone: v1.0 — MVP

**Shipado:** 2026-07-29
**Fases:** 4 | **Planos:** 15 | **Sessões:** múltiplas, entre 2026-07-19 e 2026-07-29 (10 dias)

### O que foi construído
- Fundação de leads + sub-nichos: CRUD completo, lista filtrável/ordenável/paginada, soft-delete recuperável (Fase 1)
- Importação de CSV em lote do cowork: detecção automática de separador/codificação pt-BR, mapeamento de colunas, prévia com flags de duplicado, tela pós-importação por lote (Fase 2)
- Funil de vendas Kanban: 5 etapas, drag-and-drop, destaque de leads "esfriando" (Fase 3)
- Dashboard de follow-ups por urgência como tela inicial + templates de WhatsApp com envio via link `wa.me` e auto-sugestão no primeiro contato (Fase 4)

### O que funcionou bem
- Padrão de soft-delete (`deletedAt` nullable + guard automatizado `npm run guard:no-hard-delete`) aplicado de forma consistente em leads (Fase 1) e depois reaproveitado sem retrabalho em sub-nichos (quick task 260725-lai)
- Corrigir bugs reais descobertos em uso ao vivo (telefone com DDI estrangeiro, sub-nicho ausente no CSV real) direto no código, sem o pipeline completo de planner/executor, quando a mudança era pequena e bem entendida — resolveu bloqueios reais de prospecção rapidamente
- Recuperar trabalho de worktrees órfãos/interrompidos (processo morto por OOM) revisando linha a linha antes de mesclar, em vez de descartar o progresso

### O que foi ineficiente
- Host de desenvolvimento com 4GB de RAM causou múltiplos crashes por falta de memória (build + dev server simultâneos, executores isolados em worktree) — custou tempo real de sessão recuperando trabalho interrompido pelo menos duas vezes (recuperação 02-02, quick task 260725-lai)
- O `<human-check>` de clique real no navegador foi pulado em praticamente todo plano das 4 fases por falta de acesso a browser no executor headless — só a Fase 3 chegou a ter verificação formal (`03-VERIFICATION.md`, `passed`, verificável só por código). Fases 1 e 2 nunca tiveram `/gsd-verify-work` rodado; a Fase 4 fechou com 7 cenários de UAT ainda pendentes. Esse débito se acumulou fase a fase em vez de ser resolvido cedo.
- Uma mesma classe de falso-positivo (checkers baseados em grep ingênuo) apareceu pelo menos 3 vezes neste milestone: o Decision Coverage Gate (forma `(D-05)` vs. `D-05:` com dois-pontos), o `guard:no-hard-delete` (comentário citando a string proibida como texto), e a auditoria de fechamento de milestone (`audit-open` sinalizando quick tasks como incompletos por falta de um campo `status:` que quick tasks normais nunca preenchem)

### Padrões estabelecidos
- Soft-delete via coluna `deletedAt` nullable + guard de script, aplicado a toda entidade removível — nunca hard-delete
- Execução sempre sequencial (nunca paralela/background) neste host específico, por causa da RAM limitada — inclui desligar `workflow.use_worktrees`
- Ao esconder registros removidos, filtrar só nas superfícies de SELEÇÃO (combobox, dropdown de filtro), nunca nas queries de listagem/exibição que resolvem o mapa id→nome de registros já existentes

### Lições principais
1. Em hosts com pouca memória, desligar o isolamento de worktree (`workflow.use_worktrees: false`) proativamente, em vez de descobrir o OOM na marra
2. Quando um checker baseado em grep (guard, decision coverage, audit-open) sinaliza um problema, verificar manualmente antes de confiar — falsos positivos de correspondência ingênua de string já se repetiram várias vezes neste projeto
3. Dados do mundo real (um CSV de verdade do cowork, uma sessão de prospecção ao vivo) revelam casos extremos (telefone com DDI estrangeiro, coluna de sub-nicho ausente) que nenhum planejamento antecipa sozinho — vale manter um caminho rápido pra fixes pontuais e bem entendidos sem abandonar a disciplina de planejamento para mudanças maiores
4. A verificação via navegador (`<human-check>`/UAT) foi adiada em quase todo plano por falta de acesso a browser no ambiente de execução — esse débito precisa de uma resolução deliberada (browser real, `/gsd-verify-work` dedicado) antes que cresça mais do que dá pra recuperar manualmente depois

### Observações de custo
- Mix de modelo: não medido diretamente nesta sessão (sem telemetria de tokens coletada ao longo do milestone)
- Sessões: múltiplas, ao longo de 10 dias corridos (2026-07-19 → 2026-07-29)
- Notável: os 3 fixes pontuais de CSV import (telefone/sub-nicho) foram feitos deliberadamente fora do pipeline completo (sem gsd-planner/gsd-executor) para economizar tokens em mudanças pequenas já bem compreendidas — trade-off consciente entre rigor e velocidade

---

## Milestone: v1.3 — Qualificação e Histórico de Leads

**Shipado:** 2026-08-30
**Fases:** 5 (Fase 8–12) | **Planos:** 20 | **Sessões:** múltiplas, entre 2026-08-01 e 2026-08-30 (~29 dias) | **PRs:** #1 (Fase 9), #2 (Fases 10–11), #3 (Fase 12), todos mergeados em `main`

*(Nota: v1.1 e v1.2 shipparam sem entrada de retrospectiva — este é o 2º registro formal do documento.)*

### O que foi construído
- **Fase 8** — `origemTipo` (Inbound/Outbound) como coluna enum dedicada, separada do texto livre `origem` já sujo; backfill uniforme dos 33 leads via ALTER TABLE manual idempotente; guarda `verify-origem-tipo.cjs`
- **Fase 9** — tabela `interacoes`; timeline cronológica por lead (`LeadTimelineDialog`) em 3 pontos de entrada; eventos automáticos de WhatsApp imutáveis no WHERE do servidor, notas manuais editáveis/apagáveis; `registerWhatsAppContact` grava contador + interação em uma transação
- **Fase 10** — sequência escalonada configurável (`/configuracoes` lista dinâmica), `sequenciaPosicao` autônomo por clique de template `follow_up`, sugestão da próxima data calculada na leitura (nunca agendada); leads Inbound de fora
- **Fase 11** — `/relatorios` (leads/conversão por origem e sub-nicho + perdidos por motivo, seletor de período por querystring); motivo de perda migrou de texto livre opcional para lista governada obrigatória (`/motivos-perda`)
- **Fase 12** — tabela `tarefas` desacoplada (sem FK, sem `deletedAt`); tarefa avulsa intercalada por data com follow-ups no dashboard; único hard-delete legítimo do `src/` (exceção D-08)

### O que funcionou bem
- **`npm run build` deixou de ser um problema** — o Next 16.2 passou a usar Turbopack no `next build`, e a fase "Running TypeScript" que dava OOM com webpack no host de 4GB passou a rodar em ~30s. Débito "build nunca rodou" das Fases 06-11 quitado de vez na Fase 10; a partir daí `build` foi gate normal e barato.
- **UAT de navegador real virou rotina** — a extensão Claude no Chrome funcionou nas Fases 9/11/12; a Fase 12 rodou os 15 checks com Claude dirigindo o navegador (criar/editar/concluir/excluir tarefa, prova de hard-delete no banco). Antes do v1.2 o projeto nunca tinha tido acesso a browser.
- **Generalização de função pura + wrapper** (`groupByUrgency<T>` com `groupLeadsByUrgency` virando delegação de 1 linha) integrou um 2º tipo de item (tarefa) na régua de urgência sem tocar nenhum call-site existente. Padrão replicável.
- **Migração manual via `.cjs` com backup + idempotência por `sqlite_master`** — usada nas Fases 8/9/10/12 contra `data/crm.db` de produção sem perder um lead, contornando bugs conhecidos do `drizzle-kit push` (default 0 tratado como ausente, DROP+CREATE de índice por drift de snapshot).
- **Fluxo de fechamento completo exercitado** — Fase 12 foi a 1ª a passar por `/gsd-secure-phase` (23/23 threats verificados contra o código) → `/close-phase` (learnings + ponte de promoção da verificação) → PR → merge, num encadeamento só.

### O que foi ineficiente
- **A extensão do Chrome é instável** — screenshots davam timeout (`CDP Page.captureScreenshot timed out`) ou `viewport 0x0`, um tab fechou sozinho no meio da UAT da Fase 12 (mesmo sintoma já visto na Fase 11). Contornado com `read_page`/`get_page_text`/`zoom` + reloads, mas custou idas e vindas.
- **Retomada de plano interrompido** — a Fase 12-03 começou a sessão com a Task 1 no working tree sem commit e a Task 2 nem iniciada (sem `HANDOFF.json`, sem `.continue-here`). Recuperável em ~20 min graças a commits atômicos por task, mas exigiu re-verificação manual do que já estava feito.
- **Débito de UAT do v1.0 nunca foi pago** — 5 uat_gaps + 3 verification_gaps das Fases 1/2/4 seguem abertos, carregados pelo 3º milestone seguido. O `audit-open` do fechamento os listou de novo.
- **Contadores do `milestone.complete` saíram errados** — o CLI reportou "8 fases, 26 planos, 62 tasks" (cumulativo) e 19 accomplishments que vazavam Fases 6/7 na entrada do MILESTONES.md; teve que ser reescrito à mão para 5 fases / 20 planos / 6 accomplishments de v1.3.
- **Um teste de UAT ficou skipped** — Teste 14 da Fase 12 (estado vazio do dashboard) não é testável sem zerar os 23 leads reais; aceito no fechamento com cópia+ramo verificados só no código/build.

### Padrões estabelecidos
- Generalização de função pura: extrair `fn<T>(items, getDate, now?)` e reescrever a original como wrapper que injeta o seletor de campo — zero mudança de call-site
- Migração de schema em produção: script `.cjs` com `wal_checkpoint(TRUNCATE)` + `copyFileSync` de backup + `CREATE`/`ALTER` guardado por `sqlite_master`, nunca `drizzle-kit push` para colunas com default ou quando o snapshot já divergiu
- Imutabilidade de dado histórico garantida no WHERE do servidor (não só na UI) — eventos automáticos vs. registros editáveis pelo usuário
- Cálculo derivado (sugestão de data, agregações de relatório) feito na leitura de cada request, função pura testável, nunca persistido nem agendado
- Botão-ícone de ação binária reversível como `Button variant="ghost"` com troca de ícone por `group-hover:`/`group-focus-visible:` — alternativa ao `<Checkbox>` quando o primitivo não está instalado
- `eslint-disable-next-line react-hooks/refs` documentado no par `onSubmit={form.handleSubmit(onSubmit)}` + `formRef.current` — falso-positivo recorrente do React Compiler, já aceito em 5 componentes

### Lições principais
1. **Turbopack mudou o cálculo de custo do `build`** — depois que `next build` ficou barato (Fase 10), não há mais desculpa pra fechar fase sem rodá-lo. O débito "build nunca rodou" só se acumulou porque ninguém revisitou a premissa quando a ferramenta mudou.
2. **Commits atômicos por task pagam na retomada** — a Fase 12-03 foi retomada de uma interrupção sem nenhum artefato de handoff, e o `safe_resume_gate` (nenhum commit `12-03` no histórico) foi suficiente pra confirmar que dava pra continuar sem risco de duplicar trabalho.
3. **Não confiar nos contadores do `milestone.complete`** — o CLI escaneia todos os `*-SUMMARY.md`, não só os do milestone; conferir e reescrever a entrada do MILESTONES.md à mão.
4. **Automação de navegador é frágil mas viável** — não depender só de `screenshot`; `read_page`/`find`/`get_page_text` são resilientes a instabilidade da extensão e suficientes pra asserções funcionais.
5. **Débito de UAT precisa ser pago ou explicitamente descartado, não carregado** — 3 milestones depois, os gaps das Fases 1/2/4 ainda aparecem em toda auditoria de fechamento. Ou roda `/gsd-verify-work` retroativo, ou move formalmente pra "aceito como está".

### Observações de custo
- Mix de modelo: não medido (sem telemetria de tokens coletada ao longo do milestone)
- Sessões: múltiplas, ~29 dias corridos (2026-08-01 → 2026-08-30)
- Notável: a Fase 12 inteira (retomada de interrupção → 2 planos → UAT de navegador → secure → close → PR → merge → complete-milestone) rodou numa única sessão longa, com o orquestrador segurando contexto o tempo todo em vez de delegar a subagentes (host 4GB, `parallelization: false`)

---

## Milestone: v1.4 — CRM Genérico Multi-Nicho (despivô)

**Shipado:** 2026-08-31
**Fases:** 3 (Fase 13–15) | **Planos:** 7 | **Sessões:** entre 2026-08-30 e 2026-08-31 (~2 dias) | **PRs:** #4 (Fase 14), #5 (Fases 13+15), ambos mergeados em `main`

### O que foi construído
- **Fase 13** — rename `sub-nicho → nicho` em toda a camada de código (schema, tipos, Zod, queries, `subnicho-actions.ts` → `nicho-actions.ts`), com a divergência lógico↔físico deliberada (D-01): `nichos = sqliteTable("subnichos")`, banco intocado, sem migração; rota `/subnichos` → `/nichos` com redirect 301; varredura de copy neutralizou os 3 últimos pontos "área da saúde" (gate de grep COPY-01)
- **Fase 14** — função pura `resolvePeriodoRelatorios({period,from,to})` que nunca lança (valida, apara data futura, flag de rejeição); `/relatorios` ganhou a 4ª opção "Intervalo personalizado" com 2 date pickers, navegação automática ao ter as 2 datas, intervalo sobrevive a refresh via querystring
- **Fase 15** — coluna `leads.interesse` TEXT nullable (migração aditiva idempotente `.cjs` no banco real); campo opcional no formulário de lead + mapeável no wizard de CSV; `mapCsvRows` trunca em 500 chars **antes** da validação (D-10) pra célula gigante do cowork não abortar o lote

### O que funcionou bem
- **Fases pequenas e bem escopadas executam sem desvio** — 13 (3 planos), 14 (2), 15 (2), todas "None - plano executado exatamente como escrito" nos SUMMARYs; 35min + 20min na Fase 15. O trabalho de spec/discuss pagou.
- **Reuso de precedente exato** — `interesse` copiou o idioma completo de campo opcional de `motivoPerdaId` (Fase 11): nullable + `z.preprocess` vazio→undefined + `?? null` na Server Action + gate em `verify-schema.cjs`. 2ª ocorrência do padrão, zero bug de "grava `''` em vez de NULL" (exceto o caso só-espaços, WR-01).
- **Rename só-de-código (D-01)** — evitou migração, backup e o snapshot divergente do drizzle-kit que já tinha mordido nas Fases 8/9/10. O valor do rename era a copy que o usuário vê, não o nome da coluna.
- **UAT de navegador em nível DOM + verdade no banco** — com `next dev` (Turbopack) + Chrome estourando a RAM do host de 4GB (sem screenshot), a Fase 15 rodou os 5 cenários via `javascript_tool` + `SELECT` direto no `data/crm.db`. 5/5 pass com evidência forte.

### O que foi ineficiente
- **Trabalho commitado direto na `main` local** — as 23 commits da Fase 15 (+ spec + análise de concorrente) foram parar na `main` local sem branch nem PR; o fechamento teve que criar o branch `phase-15-*` retroativamente, resetar a `main` e abrir o PR de lá. Fase 13 provavelmente pegou carona no PR #4 sem PR próprio.
- **`go-and-do` / `close-phase` foram escritas pro OpenGSD; este repo roda o `get-shit-done` antigo** — o shim de `gsd-tools` (`gsd-core/bin/…`) não bate com o layout local (`.claude/get-shit-done/bin/…`), e o subcomando `query init.phase-op` não existe (é `init phase-op`). O fechamento rodou adaptando cada chamada à mão.
- **Débito de UAT/verificação de milestones antigos continua aparecendo** — o `audit-open` do fecho do v1.4 listou de novo os gaps das Fases 04/06/08 (v1.0/v1.2/v1.3). 4º milestone seguido carregando o mesmo débito.
- **`npm run lint` global segue vermelho** (457 erros pré-existentes desde a Fase 8) — cada fase roda o lint com escopo nos arquivos tocados; o global nunca foi pago.

### Padrões estabelecidos
- **Rename de vocabulário só na camada de código**: Drizzle mapeia o nome novo pro nome físico antigo (`sqliteTable("nome_antigo")`), doc-comment registra a divergência, zero toque em dados — quando o valor é a copy, não o schema
- **Defesa contra célula gigante de CSV**: `.slice(0, N)` no `mapCsvRows` antes do `safeParse` — a linha importa truncada em vez de reprovar o lote; o `.max(N)` do Zod fica só pro input manual
- **Campo CSV mapeável opcional = 6 pontos de toque fixos**: `CsvFieldKey` → `MappedCsvRow` → `mapCsvRows` → `FIELD_CONFIGS` → `EMPTY_MAPPING` → `ConfirmedImportRow`+insert (+ preview-table). `tsc` obriga cada um. 3ª ocorrência (após notas, origem) — vira checklist.
- **Função de resolução de querystring que nunca lança**: recebe entrada crua não confiável, devolve `{valor concreto, flag de rejeição}`, a tela renderiza aviso em vez de quebrar

### Lições principais
1. **Milestone de "rename + adições pequenas" é barato e previsível** — 3 fases, 7 planos, ~2 dias, zero desvio de execução. Escopar como "não rebuild" desde o PROJECT.md manteve a disciplina.
2. **Committar direto na `main` sem branch quebra o fluxo de PR** — a próxima fase deve cortar o branch ANTES do primeiro commit de código, não depois.
3. **`go-and-do`/`close-phase` precisam de OpenGSD** — ou migrar este repo pro `@opengsd/gsd-core`, ou aceitar adaptar as chamadas de `gsd-tools` à mão em todo fechamento.
4. **Débito de UAT de 4 milestones atrás não vai se pagar sozinho** — decidir formalmente: rodar `/gsd-verify-work` retroativo nas Fases 04/06/08, ou movê-las para "aceito como está" e parar de re-listar.

### Observações de custo
- Mix de modelo: não medido
- Sessões: ~2 dias corridos (2026-08-30 → 2026-08-31); a Fase 15 + fechamento + complete-milestone numa sessão só
- Notável: o fechamento do v1.4 rodou via `/go-and-do` → `/close-phase` → `/gsd:complete-milestone` encadeados, com o orquestrador adaptando os comandos ao `get-shit-done` antigo

---

## Milestone: v1.5 — Quitação de Débito e Auditoria Retroativa

**Shipado:** 2026-09-03
**Fases:** 4 (Fase 16–19) | **Planos:** 15 | **Commits:** 98 | **Sessões:** 2026-09-01 → 2026-09-03 (~3 dias) | **Ship:** push direto para `main` (sem PR — projeto solo), tag `v1.5`

### O que foi construído
- **Fase 16** — os 5 achados do `15-REVIEW.md` fechados. WR-01 (o `interesse` só-espaços que ainda gravava `''` desde o v1.4) resolvido movendo o trim para dentro do `z.preprocess`. Code review pegou 1 blocker (CR-01): o fix do `info` IN-02 (corte por code point) podia abortar o import de uma célula com muitos emoji porque `.max(500)` contava code units — o limite virou code points nos dois lados.
- **Fase 17** — `npm run lint` da raiz volta a exit 0. Dos 457 erros pré-existentes, ~98% era ruído de ferramental: `.claude/**` no `globalIgnores`, override `no-require-imports` para `scripts/**/*.cjs`, worktree órfão removido, 4 `eslint-disable` documentados nos falsos-positivos do React Compiler em `src/`. Zero runtime tocado.
- **Fase 18** — auditoria retroativa das Fases 1/2/4/6/8. UAT ao vivo no navegador bloqueado pelo host de 4GB → pivô para **code+data**: leitura da superfície (componente + Server Action + schema) + query só-SELECT no `data/crm.db` + os 12 harnesses `test:*`/`verify:*`. `01/02-HUMAN-UAT.md` autorados do zero (20 + 15 cenários); os 5 `VERIFICATION.md` → `passed`; 0 issues de runtime.
- **Fase 19** — marca. Nome "SOLO" + ressalva de colisão em `brand.md`, paleta "Corrente Funda · Sóbria" (navy + teal, OKLCH light+dark) via `/brand-design` rodado inline, favicon `icon.svg` próprio. 33 arquivos migrados de cor hardcoded → token shadcn em 3 ondas; escala `--status-*` semântica criada à parte da marca (D-08); portão de 12 sensores verde.

### O que funcionou bem
- **`/brand-design` rodado inline com o usuário no loop** — o executor gsd não conduz o preview interativo. Preview HTML **estático** (`.brand-preview/*.html` sem dev server) foi o jeito de mostrar 6 paletas no host de 4GB. Rodada 2 de refino ("mais como a 4, teal mais sóbrio") convergiu rápido.
- **Refactor mecânico cor→token disciplinado** — cada plano passou ao seguinte uma **lista fechada de arquivos + ocorrências**; cada task exigia `git diff` só com linhas de `className`. 33 arquivos, alguns com lógica sensível (transação de WhatsApp, `startTransition`, `stopPropagation`), zero regressão de comportamento.
- **Sensor RED-por-construção** — os 3 gates de marca (`verify:brand`, `verify:brand-md`, `check:contrast`) foram escritos vermelhos de propósito na Onda 0 e fechados pelas ondas seguintes (121 → 88 → 47 → 0 findings). Estado RED do Nyquist na prática.
- **Pivô para code+data foi a decisão certa** — em vez de travar a Fase 18 num `human_needed` eterno, uma verificação incompleta mas **honesta** (método declarado em cada `VERIFICATION.md`) destravou o milestone. 0 issues de runtime encontradas.
- **Fases 16/17 minúsculas e previsíveis** — 17 foi 1 plano, config-only, `VERIFICATION.md` nasceu `passed` (sem UI, sem UAT).

### O que foi ineficiente
- **Débito de UAT de milestones antigos finalmente pago — mas custou um milestone inteiro** — a Fase 18 existe só porque as Fases 1/2/4/6/8 nunca tiveram verificação formal. 4 milestones re-listaram esse débito no `audit-open` antes de alguém escopar uma fase pra ele.
- **O host de 4GB agora bloqueia o navegador de vez** — a partir da Fase 18, `dev` + Chrome + sessão do agente = OOM garantido. Toda a auditoria e a não-regressão visual da Fase 19 foram por code+data; a confirmação puramente visual (animações, toasts, digitação) fica diferida sem data.
- **Code review achou 4 warnings numa fase "puramente mecânica"** — 2 eram regressões de UX reais: tokens de *fundo de badge* (`--status-warning`/`-success`, quase brancos) usados onde a cor precisava de peso visual (borda "esfriando", CTA de WhatsApp). O diff era perfeito; o **julgamento de qual token** estava errado.
- **`audit-open` de novo com 22 itens no fecho** — 12 quick_tasks "missing" (falso positivo conhecido, 5º milestone seguido), 3 uat_gaps já resolvidos, 5 todos, 2 seeds. O checker nunca foi ajustado.
- **`milestone.complete` CLI gerou uma lista de accomplishments suja** — fragmentos de SUMMARY cortados no meio ("47 ocorrências / 14 arquivos", "`npm run lint` da raiz volta a exit 0 — `.claude/"). Teve que ser reescrita à mão.

### Padrões estabelecidos
- **Verificação por code+data**: quando o host não roda navegador + sessão, cada cenário é provado por 3 evidências — leitura da superfície (`.tsx` + Server Action + schema), `build` exit 0, e o harness/`SELECT` relevante. O método fica declarado numa seção `## Método de Verificação` do `VERIFICATION.md`, nunca implícito.
- **Escala de cor semântica separada da marca**: `--status-*` (status de funil) e `--sidebar-*` (chrome) são definidos à parte da paleta core; `--sidebar-*` viram *alias* (`var(--card)` etc.), não cópia de valores.
- **Portão de fecho de fase visual = 12 sensores verdes no mesmo commit** (`tsc` + `lint` + `build` + 3 gates de marca + 2 guards + 4 harnesses), tabela `Comando | Exit | Observação` com números reais no `HUMAN-UAT.md`.
- **Favicon da marca = `src/app/icon.svg` estático** (convenção App Router), cores hex literais copiadas de `globals.css`, zero conteúdo executável/externo. `favicon.ico` placeholder removido com `git rm`.
- **`<Button>` primário: deletar a `className` de cor, não traduzir** — a variante default já cobre; mesmo idioma para `<a className={cn(buttonVariants(), ...)}>`.

### Lições principais
1. **Débito de verificação não se paga sozinho — precisa virar fase.** As Fases 1/2/4/6/8 só foram auditadas quando o usuário escopou um milestone inteiro pra isso. "Re-listar no `audit-open`" nunca resolveu.
2. **Refactor mecânico ainda tem espaço pra erro de design.** "Só troca de `className`" com diff perfeito passou 2 regressões de UX — a escolha de *qual* token é a decisão, e o code review pós-refactor é onde ela é pega.
3. **Verificação honesta e incompleta > `human_needed` eterno.** Declarar "verifiquei por code+data, a confirmação visual fica diferida" destrava o trabalho sem mentir sobre o que foi conferido.
4. **`/brand-design` é interativo — precisa do orquestrador no loop com o usuário**, não de um subagente. Preview estático resolve o host de 4GB.
5. **Projeto solo não precisa de PR.** Push direto pra `main` com o code review rodando como etapa do GSD foi consistente e sem atrito nas 4 fases — o PR era cerimônia.

### Observações de custo
- Mix de modelo: não medido
- Sessões: ~3 dias corridos (2026-09-01 → 2026-09-03); Fases 16/17 numa recuperação/close-out, 18 num pivô de método, 19 + fechamento + complete-milestone numa sessão só
- Notável: as skills de fechamento (`/go-and-do`, `/close-phase`, `/gsd-complete-milestone`) seguem assumindo OpenGSD; o `gsd-sdk` local faz a ponte, mas `phase complete` / `milestone` caem em fallback para o `gsd-tools.cjs` antigo — cada fechamento ainda adapta chamadas à mão

---

## Milestone: v1.6 — Dark Mode + Exportar CSV

**Shipado:** 2026-09-04
**Fases:** 2 (Fase 20-21) | **Planos:** 2 | **Commits:** 25 | **Sessões:** ~1 dia (2026-09-03 → 2026-09-04) | **Ship:** push direto para `main` (sem PR), tag `v1.6`

### O que foi construído
- **Fase 20** — toggle de dark mode. `ThemeProvider` (next-themes, já era dependência via `sonner`) na raiz + switch sol/lua no rodapé da sidebar. Persiste em `localStorage` (100% da lib), 1º acesso segue o SO, sem flash de cor errada (`suppressHydrationWarning` + script pré-paint + `disableTransitionOnChange` + guard `mounted` com placeholder de altura reservada). Os tokens `.dark` já vinham prontos e verificados WCAG AA 30/30 da Fase 19 — D-16 daquela fase foi suspensa. `verify-theme.cjs` guarda a fiação dos 4 arquivos.
- **Fase 21** — exportar CSV da lista de leads. Módulo puro `src/lib/lead-csv-export.ts` (DOM-free, testável por harness `.cjs`): BOM UTF-8 + delimitador `;` para Excel pt-BR, guard OWASP de formula injection (prefixa `'` em `= + - @`), 14 colunas legíveis (nicho/motivo por nome, valor em reais, datas `dd/MM/yyyy`). Botão na toolbar → `table.getSortedRowModel().rows` (todas as filtradas+ordenadas, todas as páginas). `downloadCsv` (Blob + `<a>`) na toolbar, único código DOM. `LeadRow` ganhou `motivoPerdaNome`. Harness com 38 asserções + 2 testes de mutação. **Zero API route** — o CRM continua "só Server Actions".

### O que funcionou bem
- **Modo enxuto foi a decisão certa.** O usuário pediu "milestone pequeno" e escolheu pular discuss/research/UI-SPEC/Nyquist/pattern-mapper nas 2 fases. As fases eram genuinamente pequenas (2-3 arquivos, deps já instaladas, padrões conhecidos) — o pipeline completo teria sido cerimônia. Manteve threat model + planner + plan-checker, que são baratos e pegaram coisa real.
- **Plan-checker pagou nas 2 fases.** Fase 20: 2 concerns reais (rótulo `tdd` sem red-first; placeholder de hidratação sem altura reservada → nudge de layout). Fase 21: 3 concerns (todos "documentar no SUMMARY", mas úteis). Nenhum bloqueou, mas todos melhoraram o resultado.
- **Módulo puro + trigger DOM separado (Fase 21).** `lead-csv-export.ts` DOM-free → testável por harness `.cjs` em Node sem navegador. É o que tornou a verificação code+data possível para uma feature de UI. 38 asserções + 2 testes de mutação (BOM, `sanitizeCsvCell`).
- **`next-themes` "meio instalado" há meses.** Estava em `package.json` desde o scaffold do shadcn (o `sonner` importa `useTheme`), mas sem `ThemeProvider`. A Fase 20 só ativou o que já estava lá — zero `npm install`. E o `check:contrast` da Fase 19 já tinha verificado os tokens `.dark` sabendo que um dia seriam ligados.
- **Recuperação de rate-limit da Fase 20.** O executor bateu no limite de sessão (429) DEPOIS de commitar as 3 tasks atômicas. O orquestrador fechou SUMMARY/STATE/ROADMAP e reverificou o portão por conta própria. Commits atômicos por task = fase resiliente a interrupção sem handoff.

### O que foi inineficiente
- **O CLI `milestone.complete` contou o repo inteiro** — reportou "21 fases / 65 planos / 144 tasks" para um milestone de 2 fases, e gerou uma entrada de MILESTONES.md com accomplishments de TODAS as fases (16-21 e antigas). Teve que ser reescrita à mão. 2º milestone seguido que o CLI erra a entrada (no v1.5 gerou fragmentos cortados; no v1.6 contou tudo).
- **Ordem errada no `/gsd-complete-milestone`** — reorganizei o ROADMAP.md ANTES de chamar o CLI, então o archive `v1.6-ROADMAP.md` pegou o roadmap já colapsado (sem o detalhe das fases 20/21). Tive que acrescentar o detalhe no fim do archive à mão. O workflow diz "CLI archives as-is, THEN reorganize" — segui invertido.
- **EXPORT-02 do REQUIREMENTS estava errado** — falava de "filtros (nicho, etapa, **origem**) e a **busca**", mas a `/leads` não tem busca textual nem filtro de origem. Só se descobriu ao ler o código da toolbar antes de planejar. Corrigido (honestidade, não scope change), mas mostra que o requisito foi escrito sem olhar a tela real.

### Padrões estabelecidos
- **Wrapper client fino de lib de terceiros**: `"use client"` + `React.ComponentProps<typeof Lib>` + passthrough puro. Isola o `"use client"` num arquivo de ~10 linhas; o `layout.tsx` (server) só importa.
- **Guard `mounted` + placeholder de altura reservada**: para qualquer botão/indicador que dependa de estado só-cliente num layout de dimensão fixa — o placeholder usa a MESMA className base + spacer de ícone + `<span opacity-0>` para reservar a linha de texto.
- **Export de tabela client-side = módulo puro + trigger DOM separado**: `lib/*-export.ts` (funções puras) + `downloadCsv(filename, text)` no componente do botão. A pureza é o que torna o teste code+data possível sem navegador.
- **`getSortedRowModel().rows` para "exportar o que está filtrado"**: no TanStack v8 é core → filtered → sorted, pré-paginação — o modelo certo para "tudo que passa nos filtros, na ordem atual" (`getRowModel()` daria só a página visível).
- **Nome de FK no `LeadRow` via Map no `data` useMemo**: `new Map(entidades.map(e => [e.id, e.nome]))` + `.get(fk) ?? fallback`. A prop vem SEM filtro de `deletedAt` (pra resolver FK apontando pra linha soft-deletada). 2ª ocorrência (após `nichoNome`) — vira padrão.

### Lições principais
1. **Milestone pequeno + modo enxuto funciona** — 2 fases, 2 planos, ~1 dia, plan-checker mantido. Escopar como "só 2 utilitários" desde o PROJECT.md e pular research/UI-SPEC foi proporcional.
2. **O CLI `milestone.complete` não é confiável neste repo** — sempre reescrever a entrada do MILESTONES.md à mão, e chamar o CLI ANTES de reorganizar o ROADMAP.
3. **Ler o código da tela antes de planejar pega requisito errado** — o EXPORT-02 falava de filtros que não existem. 5 minutos de leitura de `lead-table-toolbar.tsx` economizaram um plano com premissa furada.
4. **Verificação code+data cobre lógica de biblioteca bem documentada** — o plan-checker validou o pipeline do TanStack lendo a doc, sem rodar o app. O que fica pro navegador é só a confirmação ocular (baixa? abre no Excel? troca o tema ao vivo?).
5. **Dependência "meio instalada" é dívida silenciosa útil** — o `next-themes` sem provider por meses não custou nada e a Fase 19 já tinha verificado os tokens `.dark` de olho no futuro. Preparar o terreno numa fase e ligar noutra funcionou.

### Observações de custo
- Mix de modelo: planner Opus, executor + plan-checker Sonnet; não medido em %
- Sessões: ~1 dia; a Fase 20 teve rate-limit no executor (429, recuperado); a Fase 21 rodou limpa em ~17 min
- Notável: o fechamento do milestone (`/gsd-complete-milestone`) exigiu 2 correções manuais pós-CLI (entrada do MILESTONES.md + detalhe do archive)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessões | Fases | Mudança-chave |
|-----------|---------|-------|----------------|
| v1.0 | múltiplas (10 dias) | 4 | Primeiro milestone — estabeleceu soft-delete, execução sequencial (host 4GB) e o padrão de filtro só-em-seleção |
| v1.1–v1.2 | não registrado | 3 | Shipparam sem entrada de retrospectiva; primeiro push pro GitHub (`main`), primeiro UAP humano via browser real (Fase 7) |
| v1.3 | múltiplas (~29 dias) | 5 | `npm run build` virou gate normal (Turbopack); UAT de navegador via extensão Claude virou rotina (Fases 9/11/12); 1º fluxo completo secure→close→PR→merge; 3 PRs mergeados |
| v1.4 | ~2 dias | 3 | Milestone de "rename + adições pequenas" — zero desvio de execução; fechamento via `/go-and-do`→`/close-phase`→`/gsd:complete-milestone` encadeados (adaptados ao `get-shit-done` antigo); 2 PRs mergeados; débito de UAT das Fases 04/06/08 re-reconhecido |
| v1.5 | ~3 dias | 4 | Milestone de quitação de débito (zero feature nova); débito de UAT das Fases 1/2/4/6/8 **finalmente pago** (Fase 18, método code+data); `npm run lint` da raiz volta a exit 0 (Fase 17); marca "SOLO" + paleta OKLCH (Fase 19); host de 4GB bloqueia navegador de vez → verificação code+data vira padrão; **push direto pra `main`, sem PR** |
| v1.6 | ~1 dia | 2 | Milestone pequeno de propósito (2 utilitários) em modo enxuto (sem discuss/research/UI-SPEC/Nyquist); dark mode via next-themes (D-16 da Fase 19 suspensa) + export CSV client-side (módulo puro + harness); plan-checker mantido e pagou nas 2 fases; CLI `milestone.complete` errou a contagem (repo inteiro) 2º milestone seguido |

### Cumulative Quality

| Milestone | Testes | Cobertura | Zero-Dep Additions |
|-----------|--------|-----------|---------------------|
| v1.0 | 0 (sem suíte automatizada formal) | — | 0 pacotes novos além do scaffold inicial |
| v1.3 | 5+ harnesses `.cjs` (`test:tarefa-actions`, `test:group-by-urgency`, `test:relatorios` 38 checagens, `test:interacao-actions`, `test:compute-sequencia`) + guardas de regressão provadas por mutação | régua de urgência, agregações de relatório, Server Actions de tarefa/interação, cálculo de sequência — todos com cobertura comportamental | 0 pacotes npm novos em todo o milestone; 0 blocos novos do registry shadcn |
| v1.5 | +3 gates de marca (`verify:brand` grep-guard de cor+nome, `verify:brand-md` estrutura, `check:contrast` WCAG AA OKLCH→sRGB real 30 pares); `npm run lint` da raiz volta a exit 0; 5 `VERIFICATION.md` retroativos (Fases 1/2/4/6/8) por code+data | cor da UI 100% tokenizada (gate); contraste AA verificado light+dark; comportamento shipado de 5 fases antigas auditado | 0 pacotes npm novos; toda a Fase 19 é CSS + classes + 3 scripts `node:fs` |
| v1.6 | +`verify:theme` (guarda a fiação de 4 arquivos do dark mode); +`test:lead-csv-export` (38 asserções + 2 testes de mutação para a serialização CSV) | fiação de tema guardada; serialização CSV (colunas legíveis, BOM, guard de injection) com cobertura comportamental | 0 pacotes npm novos (next-themes e PapaParse já instalados) |

### Top Lessons (Verified Across Milestones)

1. Em host de 4GB, execução sequencial e worktrees desligados evitam OOM — confirmado repetidamente no v1.0, v1.3 **e v1.4** (`next dev` + Chrome estoura a RAM; UAT roda em nível DOM + `SELECT` no banco)
2. Checkers baseados em grep ingênuo geram falsos positivos com frequência neste projeto — sempre verificar manualmente antes de agir sobre o alerta (o `audit-open` marcou os 12 quick_tasks como "missing" de novo no fechamento do v1.3)
3. Quando a ferramenta muda (webpack → Turbopack no `next build`), revisitar as premissas que dependiam do comportamento antigo — o débito "build nunca rodou" só se acumulou por 5 fases porque ninguém rechecou
4. Commits atômicos por task tornam qualquer plano retomável de uma interrupção sem artefato de handoff — provado na retomada da Fase 12-03
5. Cortar o branch da fase ANTES do primeiro commit de código — no v1.4 a Fase 15 foi toda pra `main` local e o branch/PR teve que ser reconstruído retroativamente no fechamento. **Revisado no v1.5:** para um projeto solo sem revisor, push direto pra `main` (com o code review como etapa do GSD) foi mais simples e sem atrito — o PR era cerimônia
6. As skills de fechamento novas (`/go-and-do`, `/close-phase`) assumem OpenGSD (`@opengsd/gsd-core`); este repo roda o `get-shit-done` antigo — os comandos `gsd-tools` divergem e cada fechamento adapta à mão (confirmado de novo no v1.5: `phase complete` e `milestone` caem em fallback)
7. **Débito de verificação vira fase ou nunca se paga** — 4 milestones re-listaram os gaps das Fases 1/2/4/6/8 no `audit-open` antes do v1.5 escopar a Fase 18 pra isso (confirmado no v1.5)
8. **Refactor mecânico ("só `className`") ainda carrega erro de julgamento de design** — no v1.5 a Fase 19 passou 2 regressões de UX com diff perfeito; a escolha de qual token é a decisão, pega só no code review pós-refactor
