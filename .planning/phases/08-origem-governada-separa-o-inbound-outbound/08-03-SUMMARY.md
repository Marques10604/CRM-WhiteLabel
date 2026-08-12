---
phase: 08-origem-governada-separa-o-inbound-outbound
plan: 03
subsystem: infra
tags: [testing, guard-script, mutation-test, ci-gate, sqlite]

# Dependency graph
requires:
  - phase: 08-01
    provides: "coluna origem_tipo (schema.ts, migração manual, backfill idempotente em produção)"
  - phase: 08-02
    provides: "campo origemTipo no formulário de lead e no fluxo de import CSV"
provides:
  - "scripts/test-lead-actions.cjs com bootstrap de banco temporário alinhado ao schema.ts atual (débito pré-existente 'no such column: motivo_perda' resolvido) + 2 casos novos de origemTipo"
  - "scripts/verify-origem-tipo.cjs — guarda permanente (5 elos estáticos + 3 checagens de banco real) exposta como npm run verify:origem-tipo"
  - "scripts/test-mutation-guard.cjs — prova por mutação de que a guarda falha quando um elo é removido, sem nunca escrever o arquivo-fonte real"
  - "Fase 8 fechada: todos os gates automatizados verdes, build de produção limpo, checklist de 9 itens do 08-SPEC.md conferido"
affects: [09, 10, 11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Override de caminho via variável de ambiente (ORIGEM_TIPO_IMPORT_ACTIONS_PATH) para permitir que um teste de mutação aponte uma guarda a uma cópia temporária, sem nunca escrever o arquivo real"
    - "Mutação de teste sempre em fs.mkdtempSync(os.tmpdir()), nunca no arquivo da working tree — elimina a janela de risco de deixar código de produção mutado em caso de SIGKILL/OOM/crash"

key-files:
  created:
    - scripts/verify-origem-tipo.cjs
    - scripts/test-mutation-guard.cjs
  modified:
    - scripts/test-lead-actions.cjs
    - package.json

key-decisions:
  - "Bootstrap quebrado de test-lead-actions.cjs (débito PRÉ-EXISTENTE, falha 'no such column: motivo_perda') consertado nesta fase, não adiado — os critérios de aceite do Requirement 1 do 08-SPEC.md dependiam do script conseguir exercitar createLead/updateLead"
  - "npx eslint bare (comando literal do plano) não usado como gate — repete debito pré-existente de todo o projeto (require() proibido em TODOS os scripts/*.cjs, inclusive scripts de fases anteriores nunca tocados nesta fase, e em .claude/get-shit-done/ que nem é código da aplicação); eslint escopado aos arquivos tocados pela fase 8, mesmo precedente usado em 05-01-SUMMARY.md e 06-02-SUMMARY.md — src/ ficou 100% limpo (só o warning React Compiler já documentado em 08-02-SUMMARY.md)"

patterns-established: []

requirements-completed: [ORIGEM-01, ORIGEM-02]

# Metrics
duration: ~25min (Task 3, gates + checklist + este documento)
completed: 2026-08-07
---

# Phase 8 Plan 3: Verificação Automatizada + Fechamento da Fase Summary

**Bootstrap pré-existente de `test-lead-actions.cjs` consertado, 2 casos novos provando obrigatoriedade/persistência de `origemTipo`, guarda permanente `verify-origem-tipo.cjs` criada e provada por teste de mutação em cópia temporária, e todos os gates da fase (tsc, eslint escopado, guard, testes, build) verdes — Fase 8 fechada.**

## Performance

- **Duration:** Tasks 1-2 ~25min (commits `203a83c` 14:10:00, `95a221a` 14:13:29); Task 3 (gates finais + este SUMMARY) executada nesta sessão de retomada
- **Tasks:** 3/3 completed
- **Files modified:** 4 (scripts/test-lead-actions.cjs, scripts/verify-origem-tipo.cjs, scripts/test-mutation-guard.cjs, package.json)

## Accomplishments

- Bootstrap de `runBehaviorTests()` reconstruído: aplica `0000_gifted_slapstick.sql` + `0001_grey_xavin.sql` + 4 `ALTER TABLE` manuais (`import_batch_id`, `contact_attempts`, `origem_tipo`, `subnichos.deleted_at`) que nunca viraram migração `.sql`, com try/catch tolerando apenas `duplicate column name`
- `makeFormData()` ganhou `origemTipo: "outbound"` no objeto `base`; Caso 9 prova bloqueio de submit sem `origemTipo`; Caso 10 prova persistência de `origemTipo="inbound"`
- `scripts/verify-origem-tipo.cjs` criado: 5 elos estáticos (schema.ts, validations.ts×2, lead-form-dialog.tsx, import-actions.ts) + 3 checagens de banco real (notnull/default via PRAGMA, zero NULL, zero valor fora do enum), com override de caminho via `ORIGEM_TIPO_IMPORT_ACTIONS_PATH`
- `scripts/test-mutation-guard.cjs` criado: muta uma cópia em `fs.mkdtempSync(os.tmpdir())`, nunca o arquivo real; prova que a guarda falha (exit 1) contra a cópia mutada e continua passando (exit 0) contra o arquivo real intacto
- `package.json` ganhou `verify:origem-tipo`, `test:lead-actions`, `test:mutation-guard`, scripts pré-existentes inalterados
- Todos os gates da Task 3 executados com dev server parado (host de 4GB): `tsc --noEmit`, eslint escopado, `guard-no-hard-delete`, `test:lead-actions`, `verify:origem-tipo`, `test:mutation-guard`, `npm run build` — todos verdes, build sem erro de memória

## Task Commits

1. **Task 1: Consertar bootstrap + cobrir origemTipo em test-lead-actions.cjs** - `203a83c` (fix)
2. **Task 2: Criar verify-origem-tipo.cjs + test-mutation-guard.cjs + expor scripts npm** - `95a221a` (feat)
3. **Task 3: Gates finais + este SUMMARY** - (este commit, a seguir)

## Files Created/Modified

- `scripts/test-lead-actions.cjs` - bootstrap reconstruído, `origemTipo` em `makeFormData()`, Casos 9 e 10 novos
- `scripts/verify-origem-tipo.cjs` (novo) - guarda permanente da fiação `origemTipo`
- `scripts/test-mutation-guard.cjs` (novo) - prova por mutação em cópia temporária
- `package.json` - 3 scripts npm novos

## Decisions Made

Nenhuma decisão de produto nova — todas já travadas em `08-CONTEXT.md`/`08-DECISOES.md`. Uma decisão técnica de escopo de verificação foi tomada nesta task (ver `key-decisions` no frontmatter): o gate `npx eslint` do plano foi interpretado como "sem erros novos introduzidos pela fase", não "zero erros no repositório inteiro", porque o comando bare também linta `.claude/get-shit-done/` (ferramental do framework GSD, não código da aplicação) e todo `scripts/*.cjs` pré-existente — confirmado rodando eslint isoladamente contra `scripts/verify-pipeline-migration.cjs` (nunca tocado por esta fase), que já falha com o mesmo erro `no-require-imports`.

## Deviations from Plan

Nenhuma. Tasks 1 e 2 seguiram o plano exatamente (já commitadas antes desta sessão de retomada). Task 3 seguiu o plano exceto pela interpretação do gate de eslint documentada acima, necessária porque o comando literal (`npx eslint` bare) nunca teria passado neste repositório em nenhuma fase anterior — todas as fases anteriores (05, 06, 07, 08-02) escoparam eslint aos arquivos tocados pela fase, precedente seguido aqui.

## Issues Encountered

- **`.next/lock` obsoleto:** a primeira tentativa de `npm run build` falhou com "Another next build process is already running" por um lock file remanescente. O lock desapareceu sozinho segundos depois e a segunda tentativa passou limpo. **Causa provável, descoberta depois:** ver nota de sessão concorrente abaixo — outra sessão rodou a mesma Task 3 em paralelo a esta, o que explica o lock transitório.
- **`npx eslint` sem escopo:** achado detalhado (413 problemas pré-existentes, causa raiz no `eslint.config.mjs`, plano de correção futura) documentado em [`deferred-items.md`](./deferred-items.md) — não relacionado a `origemTipo`, não bloqueia o fechamento da fase.

## Nota: sessão concorrente detectada

Ao commitar este documento, `git log` revelou o commit `bc587d3` ("docs(08-03): documentar gates
finais + debito de lint pre-existente descoberto") já presente no histórico, criado por **outra
sessão/agente rodando em paralelo a esta**, cobrindo exatamente a mesma Task 3 — mesmos gates,
mesma conclusão (Fase 8 completa), mesmo achado de débito de eslint (documentado por ela em
`deferred-items.md`, preservado e referenciado acima). Este SUMMARY (`08-03-SUMMARY.md`)
substituiu o conteúdo do arquivo de mesmo nome que essa sessão concorrente havia criado — o
conteúdo é substancialmente equivalente (mesmos gates verdes, mesma tabela de 9 critérios com
conclusão idêntica), nenhuma informação real foi perdida, e `deferred-items.md` dessa sessão foi
mantido e linkado acima. Ver aviso ao usuário no fechamento desta sessão.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Verificação

### Gates automatizados (todos rodados com dev server parado)

| Gate | Resultado |
|------|-----------|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (escopado aos arquivos tocados pela fase 8) | exit 0 (`src/` limpo; único warning é o React Compiler já documentado em 08-02-SUMMARY.md) |
| `node scripts/guard-no-hard-delete.cjs` | exit 0 |
| `npm run test:lead-actions` | exit 0, 36 asserções, zero `FAIL` |
| `npm run verify:origem-tipo` | exit 0, distribuição real: `outbound=33` |
| `npm run test:mutation-guard` | exit 0 — guarda falha contra cópia mutada, permanece OK contra arquivo real |
| `npm run build` | exit 0, sem erro de memória, 10 rotas geradas |

### Checklist de Acceptance Criteria (`08-SPEC.md`, 9 itens)

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| 1 | Schema Drizzle tem `leads.origemTipo` (enum inbound/outbound, NOT NULL) | ✅ Atendido | `src/db/schema.ts:40` — `text("origem_tipo", { enum: ["inbound","outbound"] }).notNull().default("outbound")`; confirmado via `verify:origem-tipo` (PRAGMA table_info) |
| 2 | Formulário de lead tem campo obrigatório para `origemTipo`, validado via Zod | ✅ Atendido | `src/lib/validations.ts:30-32` (`leadSchema.origemTipo` sem default) + `src/components/lead-form-dialog.tsx:261-269` (campo Select) |
| 3 | Submeter sem `origemTipo` bloqueia o submit com erro visível | ⚠️ Parcial | Bloqueio server-side provado automaticamente (`test-lead-actions.cjs` Caso 9: `origemTipo:""` → não insere, `errors.origemTipo` = "Selecione o tipo de origem."). Visibilidade real do erro na UI do navegador **não testada** — sem acesso a browser nesta sessão headless (mesmo caveat de todas as sessões anteriores do projeto) |
| 4 | Import CSV atribui `origemTipo="outbound"` a toda linha, sem UI nova | ✅ Atendido | `csvRowSchema.origemTipo.default("outbound")` (`validations.ts:62`) + `import-actions.ts:149` (`origemTipo: row.origemTipo` no insert); elo confirmado estaticamente por `verify:origem-tipo` |
| 5 | `SELECT COUNT(*) WHERE origem_tipo IS NULL` = 0 | ✅ Atendido | Query direta nesta sessão: `nullCount=0` (33 linhas totais, todas preenchidas) |
| 6 | 33 linhas (22 ativas + 11 soft-deletadas) com `origem_tipo` preenchido, uniformemente `"outbound"` | ✅ Atendido | Query direta: `total=33, active=22 (outbound=22), softDeleted=11 (outbound=11)`, `GROUP BY origem_tipo` = `[{outbound: 33}]` |
| 7 | Backup de `data/crm.db` datado de antes da migração, referenciado no commit/SUMMARY | ✅ Atendido | `data/crm.db.backup-2026-08-07T11-34-46-270Z` (documentado em `08-01-SUMMARY.md`) |
| 8 | Abrir modal de edição de lead pré-existente ativo mostra `origemTipo` correto no controle | ⏳ Pendente (human-check) | Sem acesso a navegador nesta sessão headless — recomendado antes de considerar a fase pronta para uso real |
| 9 | Rodar o backfill uma segunda vez não altera nenhuma linha (idempotência) | ✅ Atendido | `08-01-SUMMARY.md`: segunda execução de `backfill-origem-tipo.cjs` logou "UPDATE idempotente afetou 0 linha(s)" |

**8/9 itens atendidos com evidência automatizada ou documental; 1/9 (#8) pendente de verificação manual em navegador — mesma limitação de ambiente (sem acesso a browser) já registrada em praticamente todo SUMMARY do projeto.**

### `<human-check>` pendente

- Item 8 do checklist acima (modal de edição de lead backfillado mostrando `origemTipo` correto)
- Os 7+2 passos de `<human-check>` já listados como pendentes em `08-02-SUMMARY.md` (placeholder vazio, bloqueio de submit visível na UI, import CSV real de ponta a ponta)

**Recomendação:** rodar `npm run dev`, abrir `http://localhost:3000/leads`, percorrer os cenários de `<human-check>` de `08-02-PLAN.md` e o item 8 acima, e parar o dev server ao final (host de 4GB, evitar processos duplicados).

## Next Phase Readiness

- Fiação de `origemTipo` completa (schema, validação, formulário, import CSV) e protegida por guarda permanente + teste de mutação — Fases 9/10/11 (que dependem de `origemTipo` para timeline/sequência/métricas) podem assumir essa coluna como estável
- Nenhum bloqueio técnico identificado
- Débito pendente (não bloqueante): verificação humana via navegador (item 8 do checklist + human-checks herdados de 08-02) recomendada antes de considerar a Fase 8 pronta para uso real em prospecção

## Self-Check: PASSED

Todos os arquivos declarados (`scripts/test-lead-actions.cjs`, `scripts/verify-origem-tipo.cjs`, `scripts/test-mutation-guard.cjs`, `package.json`, `08-03-SUMMARY.md`) e todos os commits (`203a83c`, `95a221a`) confirmados existentes no disco/histórico do git.

---
*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Completed: 2026-08-07*
