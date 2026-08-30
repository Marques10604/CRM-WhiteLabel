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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessões | Fases | Mudança-chave |
|-----------|---------|-------|----------------|
| v1.0 | múltiplas (10 dias) | 4 | Primeiro milestone — estabeleceu soft-delete, execução sequencial (host 4GB) e o padrão de filtro só-em-seleção |
| v1.1–v1.2 | não registrado | 3 | Shipparam sem entrada de retrospectiva; primeiro push pro GitHub (`main`), primeiro UAP humano via browser real (Fase 7) |
| v1.3 | múltiplas (~29 dias) | 5 | `npm run build` virou gate normal (Turbopack); UAT de navegador via extensão Claude virou rotina (Fases 9/11/12); 1º fluxo completo secure→close→PR→merge; 3 PRs mergeados |

### Cumulative Quality

| Milestone | Testes | Cobertura | Zero-Dep Additions |
|-----------|--------|-----------|---------------------|
| v1.0 | 0 (sem suíte automatizada formal) | — | 0 pacotes novos além do scaffold inicial |
| v1.3 | 5+ harnesses `.cjs` (`test:tarefa-actions`, `test:group-by-urgency`, `test:relatorios` 38 checagens, `test:interacao-actions`, `test:compute-sequencia`) + guardas de regressão provadas por mutação | régua de urgência, agregações de relatório, Server Actions de tarefa/interação, cálculo de sequência — todos com cobertura comportamental | 0 pacotes npm novos em todo o milestone; 0 blocos novos do registry shadcn |

### Top Lessons (Verified Across Milestones)

1. Em host de 4GB, execução sequencial e worktrees desligados evitam OOM — confirmado repetidamente no v1.0 **e no v1.3**
2. Checkers baseados em grep ingênuo geram falsos positivos com frequência neste projeto — sempre verificar manualmente antes de agir sobre o alerta (o `audit-open` marcou os 12 quick_tasks como "missing" de novo no fechamento do v1.3)
3. Quando a ferramenta muda (webpack → Turbopack no `next build`), revisitar as premissas que dependiam do comportamento antigo — o débito "build nunca rodou" só se acumulou por 5 fases porque ninguém rechecou
4. Commits atômicos por task tornam qualquer plano retomável de uma interrupção sem artefato de handoff — provado na retomada da Fase 12-03
