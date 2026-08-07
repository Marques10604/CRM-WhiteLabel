---
phase: 08-origem-governada-separa-o-inbound-outbound
plan: 03
subsystem: testing
tags: [better-sqlite3, guard-script, mutation-test, ci-gate, drizzle]

# Dependency graph
requires:
  - phase: 08-01
    provides: "leadSchema.origemTipo obrigatório sem default, csvRowSchema.origemTipo com default('outbound'), coluna origem_tipo em produção"
  - phase: 08-02
    provides: "Campo origemTipo no modal de lead, bulkImportLeads persistindo origemTipo no import CSV"
provides:
  - "scripts/test-lead-actions.cjs com bootstrap alinhado ao schema.ts atual (débito pré-existente resolvido) + 2 casos automatizados de origemTipo"
  - "scripts/verify-origem-tipo.cjs — guarda permanente da fiação de origemTipo (5 elos estáticos + banco real)"
  - "scripts/test-mutation-guard.cjs — prova de mutação da guarda, sem nunca escrever o arquivo-fonte real"
  - "package.json scripts: verify:origem-tipo, test:lead-actions, test:mutation-guard"
affects: [10, 11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bootstrap de banco temporário reconstrói colunas manuais (nunca viraram .sql) via lista de ALTER TABLE tolerante a duplicate column name"
    - "Guarda de fiação (verify-*.cjs) com override de caminho via env var (ORIGEM_TIPO_IMPORT_ACTIONS_PATH) só para permitir teste de mutação apontar a uma cópia temporária, nunca ao arquivo real"
    - "Teste de mutação que nunca escreve o arquivo-fonte real: cópia em fs.mkdtempSync(os.tmpdir()), pré-condição + pós-condição de contagem de linha exata em SOURCE"

key-files:
  created:
    - scripts/verify-origem-tipo.cjs
    - scripts/test-mutation-guard.cjs
    - .planning/phases/08-origem-governada-separa-o-inbound-outbound/deferred-items.md
  modified:
    - scripts/test-lead-actions.cjs
    - package.json

key-decisions:
  - "Débito pré-existente do bootstrap de test-lead-actions.cjs (SqliteError no such column motivo_perda) CONSERTADO nesta fase (decisão explícita 'opção a' do 08-03-PLAN.md), não adiado — os critérios de aceite do Requirement 1 dependiam do script conseguir rodar"
  - "npx eslint sem escopo revelou 413 problemas pré-existentes (não relacionados a origemTipo, principalmente .claude/get-shit-done/** e scripts/*.cjs pré-existentes) — documentado em deferred-items.md, fora de escopo desta fase, não bloqueia fechamento (Scope Boundary do executor)"

patterns-established:
  - "Guarda de fiação com teste de mutação em cópia temporária isolada (nunca no arquivo real) — modelo reutilizável para futuras guardas permanentes de contrato entre schema/validação/UI/persistência"

requirements-completed: [ORIGEM-01, ORIGEM-02]

# Metrics
duration: ~35min (Task 1+2 em sessão anterior interrompida, Task 3 nesta sessão de retomada)
completed: 2026-08-07
---

# Phase 8 Plan 3: Origem Governada — Gates Finais e Guarda Permanente Summary

**Débito pré-existente do bootstrap de `test-lead-actions.cjs` consertado, guarda permanente `verify-origem-tipo.cjs` criada e provada por teste de mutação em cópia temporária, e todos os gates finais da Fase 8 (tsc, build, guardas) executados de verdade contra o código e o banco reais — fecha a Fase 8 inteira.**

## Nota de retomada desta sessão

Esta plan foi executada em DUAS sessões. A primeira sessão completou as Tasks 1 e 2 e foi
interrompida por limite de sessão antes de rodar a Task 3 e escrever este SUMMARY. Esta sessão de
retomada **verificou** as Tasks 1 e 2 já commitadas (leitura completa de `git show --stat` dos dois
commits, leitura integral dos 3 arquivos que elas produziram/alteraram, conferência de cada
`acceptance_criteria` do plano) e as encontrou corretas e completas — nenhum código foi refeito ou
alterado. Esta sessão executou exclusivamente a Task 3 (gates finais) e este fechamento.

## Performance

- **Duration:** Task 1 ~3min + Task 2 ~4min (sessão anterior, 14:10–14:14 -03:00) + Task 3 e
  fechamento ~30min (esta sessão)
- **Tasks:** 3/3 completed
- **Files modified:** 2 (Task 1+2, sessão anterior) + 1 arquivo de documentação novo (`deferred-items.md`, esta sessão) — Task 3 não modificou nenhum arquivo de código, conforme escopo do plano

## Accomplishments

- **Task 1** (commit `203a83c`, sessão anterior): bootstrap de `scripts/test-lead-actions.cjs`
  consertado — aplica `0000_gifted_slapstick.sql` + `0001_grey_xavin.sql` + 4 `ALTER TABLE`
  manuais (`import_batch_id`, `contact_attempts`, `origem_tipo`, `subnichos.deleted_at`), tolerante
  a `duplicate column name`. Casos 9 e 10 novos provam obrigatoriedade e persistência de
  `origemTipo` em `createLead`.
- **Task 2** (commit `95a221a`, sessão anterior): `scripts/verify-origem-tipo.cjs` criado — guarda
  estática dos 5 elos (`schema.ts`, `validations.ts` x2, `lead-form-dialog.tsx`,
  `import-actions.ts`) + guarda de banco real (`PRAGMA table_info`, `origem_tipo IS NULL`,
  `origem_tipo` fora do enum). `scripts/test-mutation-guard.cjs` criado — prova a guarda mutando
  SOMENTE uma cópia temporária em `os.tmpdir()`, nunca `import-actions.ts` real. 3 scripts npm
  novos expostos em `package.json`.
- **Task 3** (esta sessão, sem commit de código — só execução de gates): todos os gates rodados de
  ponta a ponta contra o código e o banco reais (ver tabela de evidência abaixo). Descoberto e
  documentado (não corrigido, fora de escopo) um débito pré-existente de configuração de lint
  (413 problemas em `.claude/get-shit-done/**`, worktree órfão, e scripts `.cjs` pré-existentes —
  nenhum relacionado a `origemTipo`).

## Task Commits

1. **Task 1: Consertar o bootstrap do banco temporário e cobrir origemTipo em test-lead-actions.cjs** - `203a83c` (fix) — sessão anterior
2. **Task 2: Criar scripts/verify-origem-tipo.cjs e expor as guardas em package.json** - `95a221a` (feat) — sessão anterior
3. **Task 3: Gates finais da fase** - sem commit de código (execução pura de gates, nenhum arquivo modificado conforme o plano)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified

- `scripts/test-lead-actions.cjs` (Task 1) - bootstrap completo + Casos 9/10 de `origemTipo`
- `scripts/verify-origem-tipo.cjs` (Task 2, novo) - guarda permanente de 5 elos + banco real
- `scripts/test-mutation-guard.cjs` (Task 2, novo) - teste de mutação em cópia temporária
- `package.json` (Task 2) - scripts `verify:origem-tipo`, `test:lead-actions`, `test:mutation-guard`
- `.planning/phases/08-origem-governada-separa-o-inbound-outbound/deferred-items.md` (Task 3, novo) - registro do débito de lint pré-existente descoberto

## Gates Finais (Task 3) — Evidência

| # | Gate | Comando | Resultado | Evidência |
|---|------|---------|-----------|-----------|
| 1 | TypeScript | `npx tsc --noEmit` | ✅ exit 0 | Sem output (limpo) |
| 2 | ESLint | `npx eslint` | ❌ exit 1 — **pré-existente, fora de escopo** | 413 problemas (413 erros + 75 avisos), quase todos em `.claude/get-shit-done/**` (ferramental interno, não é código do produto), worktree órfão `.claude/worktrees/agent-ab2be3f82c3c9c30d/**`, e scripts `.cjs` pré-existentes (idioma `require()` já estabelecido, regra `@typescript-eslint/no-require-imports` nunca teve `overrides`/`ignores` para esse caso). Nenhum erro novo em arquivo tocado por esta fase. Detalhe completo em `deferred-items.md`. |
| 3 | Guard anti-hard-delete | `node scripts/guard-no-hard-delete.cjs` | ✅ exit 0 | `OK: nenhum hard-delete encontrado em src/ + scripts/ + migrações` |
| 4 | Harness lead-actions | `npm run test:lead-actions` | ✅ exit 0 | 32 asserções `OK`, zero `FAIL`, incluindo os 2 casos novos de `origemTipo` |
| 5 | Guarda de fiação | `npm run verify:origem-tipo` | ✅ exit 0 | `[verify-origem-tipo] OK: 5 elos da fiação íntegros ... distribuição no banco real: outbound=33` |
| 6 | Teste de mutação | `npm run test:mutation-guard` | ✅ exit 0 | `[test-mutation-guard] OK: guarda falha (exit 1) contra cópia temporária mutada em os.tmpdir() e permanece passando (exit 0) contra o arquivo real, que nunca foi escrito.` |
| 7 | Build de produção | `npm run build` | ✅ exit 0 | Dev server confirmado parado (nenhum listener na porta 3000) antes do build. `✓ Compiled successfully in 118s`, `Finished TypeScript in 44s`, 11/11 páginas geradas, sem erro de OOM/worker morto. |

**Query final independente contra `data/crm.db` (não confiando só no log das guardas):**
```json
{"nullCount":0,"invalidCount":0,"total":33,"dist":[{"origem_tipo":"outbound","c":33}]}
```

**`git status --porcelain` após Task 3:** nenhuma alteração de arquivo de código (só
`deferred-items.md`, novo, e `08-RUN-LOG.jsonl`, já modificado antes desta plan por telemetria de
rodada anterior — não tocado por esta task).

## Saída completa do teste de mutação (Task 2, reproduzida aqui conforme exigido pelo `<output>` do plano)

```
> crm-leads@0.1.0 test:mutation-guard
> node scripts/test-mutation-guard.cjs

[test-mutation-guard] OK: guarda falha (exit 1) contra cópia temporária mutada em os.tmpdir() e permanece passando (exit 0) contra o arquivo real, que nunca foi escrito.
```

O script prova, numa única execução: (a) cópia de `import-actions.ts` criada em
`fs.mkdtempSync(os.tmpdir())`; (b) `verify:origem-tipo` com `ORIGEM_TIPO_IMPORT_ACTIONS_PATH`
apontando para a cópia mutada sai com status 1; (c) a mesma guarda, sem a env var (arquivo real),
sai com status 0; (d) diretório temporário removido no `finally`; (e) pós-condição confirma
exatamente 1 ocorrência de `origemTipo: row.origemTipo,` em `src/actions/import-actions.ts` real.

## Nome do arquivo de backup pré-migração (rastreabilidade do backfill, plano 08-01)

`data/crm.db.backup-2026-08-07T11-34-46-270Z` — criado antes da primeira escrita do
`scripts/backfill-origem-tipo.cjs`, referenciado em `08-01-SUMMARY.md`.

## Nota sobre o conserto do débito pré-existente (Task 1)

O bootstrap quebrado de `scripts/test-lead-actions.cjs` (`SqliteError: no such column:
"motivo_perda"`) foi confirmado por execução real em 2026-08-06, ANTES desta fase, e documentado
como débito pré-existente em `08-01-SUMMARY.md` §"Débito Técnico Conhecido". A decisão explícita
"opção a" do `08-03-PLAN.md` foi consertá-lo NESTA fase (não adiar), porque os critérios de aceite
do Requirement 1 do `08-SPEC.md` dependiam desse harness conseguir exercitar
`createLead`/`updateLead` de ponta a ponta. Escopo do conserto mantido estritamente ao bootstrap do
banco temporário — nenhuma outra correção de débito técnico entrou nesta fase.

## Tabela de Conferência — Acceptance Criteria do 08-SPEC.md (9 itens, contados na fonte)

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| 1 | Schema Drizzle tem `leads.origemTipo` (enum `"inbound" \| "outbound"`, `NOT NULL`) | ✅ Atendido | `scripts/verify-origem-tipo.cjs` elo 1 confirma `text("origem_tipo", { enum: [...] }).notNull().default("outbound")` em `schema.ts`; `PRAGMA table_info(leads)` real: `notnull=1`, `dflt_value='outbound'` |
| 2 | Formulário de lead (criação e edição) tem campo obrigatório para `origemTipo`, validado via Zod | ✅ Atendido (automatizado) / ⚠️ não clicado no navegador | `verify-origem-tipo.cjs` elo 4 confirma `ORIGEM_TIPO_OPTIONS`/`name="origemTipo"` em `lead-form-dialog.tsx`; `leadSchema.origemTipo` sem default confirmado (elo 2); Caso 9/10 de `test-lead-actions.cjs` provam a validação server-side. Clique real no navegador NÃO executado nesta sessão headless (mesmo caveat de todas as sessões anteriores do projeto). |
| 3 | Submeter o formulário de criação sem `origemTipo` bloqueia o submit com erro visível | ✅ Atendido (automatizado, camada servidor) / ⚠️ mensagem visível na tela não clicada | Caso 9 de `test-lead-actions.cjs`: `createLead` com `origemTipo:""` retorna `errors.origemTipo: ["Selecione o tipo de origem."]` e não insere. A renderização visual do erro no formulário (react-hook-form + Zod resolver) não foi verificada em navegador nesta sessão. |
| 4 | Import CSV em lote atribui `origemTipo` a toda linha importada, sem passo de UI adicional, valor sempre `"outbound"` | ✅ Atendido | `verify-origem-tipo.cjs` elo 3 (`csvRowSchema.origemTipo` com `.default("outbound")`) e elo 5 (`import-actions.ts` contém `origemTipo: row.origemTipo,` no insert de `bulkImportLeads`) — ambos confirmados por leitura estática desta execução |
| 5 | `SELECT COUNT(*) FROM leads WHERE origem_tipo IS NULL` retorna 0 após o backfill | ✅ Atendido | Query direta desta sessão: `nullCount: 0` (33 linhas totais) |
| 6 | As 33 linhas existentes (22 ativas + 11 soft-deletadas) têm `origem_tipo` preenchido, uniformemente `"outbound"` | ✅ Atendido | Query direta desta sessão: `{"total":33,"dist":[{"origem_tipo":"outbound","c":33}]}` — igual ao resultado documentado em `08-01-SUMMARY.md` (`activeCount: 22`) |
| 7 | Existe backup de `data/crm.db` datado de antes da migração, referenciado no commit/SUMMARY | ✅ Atendido | `data/crm.db.backup-2026-08-07T11-34-46-270Z`, referenciado em `08-01-SUMMARY.md` §"Evidência da Migração" |
| 8 | Abrir o modal de edição de um lead pré-existente ativo (backfillado) mostra o `origemTipo` correto no controle do formulário | ⚠️ Pendente — sem acesso a navegador nesta sessão | `defaultValues.origemTipo` usa `lead?.origemTipo` sem fallback (confirmado por leitura de código em `08-02-SUMMARY.md`), e todo lead ativo tem `origemTipo="outbound"` no banco (item 6) — a inferência lógica é forte, mas o clique real no modal de edição não foi executado. Recomendado antes de considerar a Fase 8 pronta para uso real. |
| 9 | Rodar o script de backfill uma segunda vez não altera nenhuma linha já classificada (idempotência) | ✅ Atendido | Documentado em `08-01-SUMMARY.md`: segunda execução de `backfill-origem-tipo.cjs` — `UPDATE idempotente afetou 0 linha(s)`, `33 linhas totais, 0 NULL, 33 outbound` (idêntico à primeira execução) |

**Resumo:** 7/9 itens atendidos com evidência automatizada/query direta desta sessão ou de sessão
anterior já documentada. 2/9 itens (2 e 8, parcialmente também o 3) dependem de clique real em
navegador — **não executado em nenhuma sessão headless deste projeto até agora**, mesmo caveat
recorrente em praticamente todos os `SUMMARY.md` anteriores (`02-02`, `02-03`, `04-*`, `08-02`).

## Decisions Made

Nenhuma decisão nova nesta sessão além de: (1) tratar o conserto do bootstrap de
`test-lead-actions.cjs` como débito pré-existente resolvido deliberadamente (já decidido no próprio
`08-03-PLAN.md`, apenas verificado e confirmado correto nesta sessão); (2) tratar o achado de 413
problemas de `npx eslint` sem escopo como débito de configuração pré-existente e fora de escopo,
documentado em `deferred-items.md` em vez de corrigido (Scope Boundary do executor — 413 problemas
em dezenas de arquivos não tocados pela Fase 8 não é um "bug direto causado pela task atual").

## Deviations from Plan

Nenhum desvio de código nas Tasks 1/2 (já commitadas e verificadas corretas nesta sessão). Task 3
não modificou código, conforme escopo do plano.

**Desvio documental (não é Regra 1-4, é achado fora de escopo do gate):**

**1. `npx eslint` falha por débito pré-existente de configuração (413 problemas)**
- **Found during:** Task 3, gate 2 (`npx eslint`)
- **Issue:** `eslint.config.mjs` não tem `ignores` para `.claude/**` nem `overrides` para
  `scripts/*.cjs` (idioma CommonJS estabelecido do projeto) — a regra
  `@typescript-eslint/no-require-imports` do preset do Next.js dispara em todo o repositório,
  incluindo ferramental interno do GSD e um worktree órfão já sinalizado em `STATE.md`
- **Fix:** NÃO corrigido nesta task (fora de escopo — nenhum dos 413 problemas foi causado pelas
  Tasks 1-3 desta fase; correção exigiria mudança de configuração de projeto, decisão arquitetural
  fora do escopo de `origemTipo`)
- **Files modified:** Nenhum (só documentado em `deferred-items.md`)
- **Verification:** `npx tsc --noEmit`, `npm run build`, e todas as guardas específicas de
  `origemTipo` passam limpos — o código funcional da Fase 8 está correto; só o gate de lint
  irrestrito falha por débito alheio
- **Status:** deferred, registrado em `deferred-items.md` com recomendação de correção futura

**Total deviations:** 1 achado documental fora de escopo (não é bug introduzido por esta fase).

## Issues Encountered

Nenhum bloqueio na execução real das Tasks 1/2 (já commitadas). Nesta sessão: nenhum
`npm run dev` ativo confirmado antes do build (porta 3000 sem listener) — build de produção
completou sem erro de memória, ao contrário do precedente documentado em `STATE.md` de sessões
anteriores.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Known Stubs

Nenhum. Esta plan não introduz nenhuma superfície de UI nova — Tasks 1/2/3 são exclusivamente
testes/guardas/gates, sem componente novo renderizando dado vazio/placeholder.

## Threat Flags

Nenhuma superfície de segurança nova além da já mapeada no `<threat_model>` do próprio
`08-03-PLAN.md` (T-08-07 a T-08-11, T-08-SC). Nenhum achado adicional durante a execução dos gates.

## Next Phase Readiness

- `origemTipo` está totalmente coberto por: schema físico (08-01), formulário + import CSV (08-02),
  e testes automatizados + guarda permanente + teste de mutação (08-03) — a fiação completa
  (schema → validação → UI → persistência → banco real) tem prova automatizada de ponta a ponta
- `scripts/verify-origem-tipo.cjs` fica disponível como guarda permanente (`npm run verify:origem-tipo`)
  para qualquer fase futura que dependa de `origemTipo` (Fase 10, Fase 11) detectar regressão da
  fiação
- Débito pendente registrado, não bloqueante: (a) verificação humana via navegador dos itens 2/3/8
  do Acceptance Criteria (mesmo caveat recorrente do projeto); (b) `deferred-items.md` — 413
  problemas de `npx eslint` sem escopo, débito de configuração pré-existente não relacionado a
  `origemTipo`
- **Fase 8 (Origem Governada — Separação Inbound × Outbound) está COMPLETA** — ORIGEM-01 e
  ORIGEM-02 implementados e verificados; ORIGEM-03 permanece mapeado para a Fase 10 (Sequência),
  conforme decisão já registrada em `STATE.md`

## Self-Check

Verificação dos arquivos e commits declarados neste SUMMARY:

- FOUND: `scripts/test-lead-actions.cjs`
- FOUND: `scripts/verify-origem-tipo.cjs`
- FOUND: `scripts/test-mutation-guard.cjs`
- FOUND: `.planning/phases/08-origem-governada-separa-o-inbound-outbound/deferred-items.md`
- FOUND: `.planning/phases/08-origem-governada-separa-o-inbound-outbound/08-03-SUMMARY.md`
- FOUND commit: `203a83c`
- FOUND commit: `95a221a`

## Self-Check: PASSED

---
*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Completed: 2026-08-07*
