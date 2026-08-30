---
phase: 12-agenda-tarefas-soltas
plan: 02
subsystem: api
tags: [server-actions, drizzle, zod, date-fns, hard-delete, pure-function, testing]

requires:
  - phase: 12-agenda-tarefas-soltas (plano 01)
    provides: "tabela `tarefas` viva em data/crm.db; tipos `Tarefa`/`NewTarefa`; `tarefaSchema`/`tarefaUpdateSchema`; ALLOWLIST do guard-no-hard-delete pré-autorizando `src/actions/tarefa-actions.ts`"
  - phase: 04-follow-up-dashboard-whatsapp-outreach
    provides: "`groupLeadsByUrgency` — a régua de urgência (Vencidos/Hoje/Próximos 7 dias) que este plano generaliza"
  - phase: 11-painel-de-metricas
    provides: "molde de Server Actions (`motivo-perda-actions.ts`) e de harness (`test-motivo-perda-actions.cjs` / `test-compute-sequencia-sugestao.cjs`)"
provides:
  - "`src/actions/tarefa-actions.ts` — 4 Server Actions: `createTarefa`/`updateTarefa` (prevState, formData) + `concluirTarefa`/`deleteTarefa` (id posicional), `ActionState` homogêneo"
  - "`deleteTarefa` é a ÚNICA linha `db.delete(...)` legítima de todo o `src/` (D-08), passa no guard via ALLOWLIST"
  - "`concluirTarefa` idempotente via `isNull(concluidaEm)` no WHERE; `opts.desfazer` reabre via `isNotNull`"
  - "`groupByUrgency<T>(items, getDate, now?)` genérico em `src/db/queries.ts`; `groupLeadsByUrgency` preservado como wrapper fino"
  - "`getTarefasPendentes()` — filtra `concluida_em IS NULL`, ordena por data ASC"
  - "`buildDashboardItems(activeLeads, tarefasPendentes, now?)` — funde lead+tarefa, bucketiza e ordena cada bucket por data ASC (D-04); tipos `DashboardItem`/`DashboardItemsByUrgency`"
  - "2 harnesses `.cjs`: `test:tarefa-actions` (7 casos) e `test:group-by-urgency` (fronteiras + intercalação + regressão)"
affects: [12-03, 12-04]

tech-stack:
  added: []
  patterns:
    - "Função pura genérica (`groupByUrgency<T>`) com wrapper de compatibilidade preservado — generalização sem quebra de call-site"
    - "1ª cobertura automatizada da régua de urgência do projeto (a lacuna histórica de `groupLeadsByUrgency` foi fechada)"
    - "Hard-delete testado por asserção de AUSÊNCIA da linha + teste de mutação (db.delete → update no-op faz o caso falhar)"

key-files:
  created:
    - src/actions/tarefa-actions.ts
    - scripts/test-tarefa-actions.cjs
    - scripts/test-group-by-urgency.cjs
  modified:
    - src/db/queries.ts
    - package.json

key-decisions:
  - "`ActionState` de tarefa carrega `tarefa?` opcional (não uma 2ª variante) — mesmo idioma de `lead-actions.ts`, compatível com `useActionState`"
  - "`updateTarefa` NÃO filtra por `isNull(concluidaEm)` no WHERE — o dialog de edição (D-07) pode editar uma tarefa já concluída (D-02); o único guard é o id"
  - "`concluirTarefa` idempotente por `isNull(concluidaEm)` no WHERE (não sobrescreve o carimbo original); caminho `desfazer` usa `isNotNull` — espelho de `softDeleteMotivoPerda`"
  - "`groupByUrgency<T>` é a função genérica; `groupLeadsByUrgency` vira wrapper de 1 linha — assinatura pública e `LeadsByUrgency` intocados"
  - "`buildDashboardItems` mora em `queries.ts` (não em page.tsx) e é PURA — a ordenação por `date` ASC de cada bucket é o que materializa D-04"
  - "`isToday` de date-fns compara com o relógio REAL, não com o `now` injetado — quirk herdado de `groupLeadsByUrgency`, documentado no harness (o único caso de bucket 'hoje' usa a data real de hoje)"

patterns-established:
  - "Generalização de função pura: extrair `fn<T>(items, getDate, now?)` e reescrever a original como wrapper delegando o seletor de campo"
  - "Teste de mutação inline seguro: editar o fonte, rodar 1 harness, reverter com `git checkout -- <arquivo>` numa única invocação"

requirements-completed: []

duration: 16min
completed: 2026-08-29
---

# Phase 12 Plan 02: Camada de Servidor da Agenda de Tarefas Soltas Summary

**4 Server Actions de tarefa (`createTarefa`/`updateTarefa`/`concluirTarefa`/`deleteTarefa`) com o único hard-delete legítimo do `src/` (D-08), a régua de urgência generalizada em `groupByUrgency<T>` com `groupLeadsByUrgency` preservado como wrapper, e `buildDashboardItems` fundindo lead+tarefa intercalados por data (D-04) — tudo coberto por 2 harnesses `.cjs` automatizados.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-08-29T18:46:35Z
- **Completed:** 2026-08-29T19:02:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 criados, 2 modificados)

## Accomplishments

- `src/actions/tarefa-actions.ts` criado com `"use server"` e doc-comment de cabeçalho declarando a DIVERGÊNCIA de política (espelho invertido de LEAD-04): exclusão de tarefa é hard-delete (D-08), `tarefas` está na ALLOWLIST do guard, e um `db.delete(leads)` acidental aqui dentro continua bloqueado.
  - `createTarefa` / `updateTarefa`: `safeParse(Object.fromEntries(formData))` → `{ errors: fieldErrors }` SEM tocar o banco em falha; sucesso via `db.insert(...).returning()` / `db.update(...).set({ ...rest, updatedAt: sql\`(unixepoch())\` })`.
  - `concluirTarefa(id, opts?)`: guard inteiro `Number.isInteger(id) && id > 0`; conclusão com `isNull(concluidaEm)` no WHERE (idempotente); `opts.desfazer` volta `concluidaEm` a NULL com `isNotNull` no WHERE.
  - `deleteTarefa(id)`: mesmo guard de id; `db.delete(tarefas).where(eq(tarefas.id, id))` — comentário inline citando D-08.
  - Toda mutação bem-sucedida chama `revalidateTarefaRoutes()` (só `revalidatePath("/")`).
- `src/db/queries.ts` estendido: `groupByUrgency<T>(items, getDate, now?)` genérico (corpo idêntico à régua antiga: `startOfDay`, limite exclusivo `addDays(today, 8)`, ordem `isBefore`→`isToday`→`isBefore`); `groupLeadsByUrgency` reescrito como wrapper de 1 linha; `getTarefasPendentes()` (`isNull(tarefas.concluidaEm)` + `asc(tarefas.data)`); tipos `DashboardItem`/`DashboardItemsByUrgency` + `buildDashboardItems()` puro que funde as duas listas, chama `groupByUrgency` e ordena cada bucket por `date` ascendente (D-04).
- `scripts/test-tarefa-actions.cjs` (319 linhas): 7 casos contra banco temporário em `os.tmpdir()`, DDL crua idêntica à de `migrate-tarefas.cjs`. Caso 7 prova o hard-delete de D-08 por ausência da linha (`rowById(id) === undefined`); Caso 5 prova idempotência com valor sentinela `111111`.
- `scripts/test-group-by-urgency.cjs`: 4 fronteiras de data (`today-1`, `today` com hora ≠ 00:00, `today+7`, `today+8`), lista vazia, intercalação de D-04 (`[X,Y,A,B]` = `[tarefa,tarefa,lead,lead]` — tarefa de `day+1` antes de lead de `day+3`), e regressão provando que o wrapper devolve exatamente o mesmo que `groupByUrgency` direto.
- `package.json`: scripts `test:tarefa-actions` e `test:group-by-urgency`.

## Task Commits

Cada task committada atomicamente:

1. **Task 1: 4 Server Actions de tarefa** - `c34ae72` (feat)
2. **Task 2: harness de comportamento das 4 Server Actions** - `c0a5e53` (test)
3. **Task 3: `groupByUrgency<T>` genérico + `getTarefasPendentes` + `buildDashboardItems` + teste** - `9d6f9d9` (feat)

**Plan metadata:** _(este commit)_

_Nota: a Task 1 tinha `tdd="true"` mas o plano estrutura a cobertura na Task 2 (o `<verify>` da Task 1 diz "MISSING — criado na Task 2"). Seguido conforme escrito: Task 1 = ação + `tsc`/guard, Task 2 = harness. `tdd_mode: false` no `config.json`, sem gate MVP+TDD._

## Files Created/Modified

- `src/actions/tarefa-actions.ts` (novo) - 4 Server Actions, `ActionState` homogêneo, hard-delete D-08
- `src/db/queries.ts` - `groupByUrgency<T>` genérico, `groupLeadsByUrgency` wrapper, `getTarefasPendentes`, `buildDashboardItems`, tipos `DashboardItem`/`DashboardItemsByUrgency`
- `scripts/test-tarefa-actions.cjs` (novo) - harness dos 7 comportamentos das Server Actions
- `scripts/test-group-by-urgency.cjs` (novo) - harness da régua de urgência (fronteiras + D-04 + regressão)
- `package.json` - scripts `test:tarefa-actions`, `test:group-by-urgency`

## Registro dos harnesses (exigido pelo `<output>` do plano)

**`npm run test:tarefa-actions` → exit 0:**
```
OK Caso 1..7 — 27 asserções
[test-tarefa-actions] OK: 7 casos, todas as asserções passaram.
```

**Teste de mutação do Caso 7 (hard-delete):** trocando `await db.delete(tarefas).where(eq(tarefas.id, id));` por um `db.update(...).set({ updatedAt: ... })` no-op na cópia em disco de `src/actions/tarefa-actions.ts`, `npm run test:tarefa-actions` saiu **exit 1** com 2 falhas:
```
FAIL Caso 7: contagem decrementa em 1 (antes=4, depois=4)
FAIL Caso 7: a linha SOME do banco (rowById devolve undefined) — prova do hard-delete de D-08
[test-tarefa-actions] 2 falha(s).
```
Fonte revertida com `git checkout -- src/actions/tarefa-actions.ts` na mesma invocação; `git status` confirmou working tree limpo depois.

**`npm run test:group-by-urgency` → exit 0:**
```
OK groupByUrgency: today-1 / today+7 / today+8 / hoje (isToday) / lista vazia
OK buildDashboardItems: proximos7Dias = [X,Y,A,B] = [tarefa,tarefa,lead,lead] (D-04)
OK buildDashboardItems: vencidos = [C,Z] intercalados
OK groupLeadsByUrgency: wrapper === groupByUrgency direto
[test-group-by-urgency] OK: todas as asserções passaram.
```

## Verificação

Todos os gates rodados em SEQUÊNCIA (host 4GB, dev server parado), exit 0:

1. `npx tsc --noEmit` → exit 0 (call-sites de `groupLeadsByUrgency` intactos)
2. `npm run test:tarefa-actions` → exit 0, 7 casos
3. `npm run test:group-by-urgency` → exit 0
4. `npm run test:compute-sequencia` → exit 0 (regressão — nenhuma outra função pura de `queries.ts` afetada)
5. `npm run guard:no-hard-delete` → exit 0 (a linha `db.delete(tarefas)` presente e permitida via ALLOWLIST)
6. `npm run verify:schema` → exit 0, saída menciona `tarefas`
7. `data/crm.db` NÃO tocado pelos harnesses (usam `os.tmpdir()` / `:memory:`) — nenhum backup novo

## Decisions Made

Nenhuma além das registradas no frontmatter `key-decisions` — plano executado conforme escrito. As decisões de "discretion" do plano foram resolvidas assim:
- `groupByUrgency` genérica + wrapper (não generalizar `groupLeadsByUrgency` in-place).
- `concluirTarefa`: idempotência via `isNull` no WHERE no caminho de conclusão, `isNotNull` no caminho `desfazer`.
- `buildDashboardItems` mora em `queries.ts` (não em `page.tsx`), pura.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **`isToday` vs `now` injetado:** `groupByUrgency` usa `isToday(d)` de date-fns, que compara com o relógio REAL — não com o `now` injetado. Isso significa que o bucket "hoje" não é 100% determinístico para um `now` histórico (quirk herdado de `groupLeadsByUrgency`). Resolvido no harness usando `new Date()` real só no caso do bucket "hoje"; os demais casos usam `now` fixo. Documentado no doc-comment do teste. Não é defeito introduzido por este plano.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **12-03 / 12-04** (UI: `TarefaFormDialog`, `TarefaCard`, `followup-dashboard.tsx`, `page.tsx`) desbloqueados: os 4 contratos de Server Action (`ActionState` homogêneo), `getTarefasPendentes()`, `buildDashboardItems()` e os tipos `DashboardItem`/`DashboardItemsByUrgency` estão prontos e testados. Os planos de UI consomem exatamente esses shapes sem explorar o codebase.
- **TAREFA-01 / TAREFA-02 permanecem `Pending` em REQUIREMENTS.md** — o comportamento observável ("admin cria uma tarefa", "tarefas aparecem no dashboard") só existe após a UI de 12-03/12-04. Este plano entregou a metade de servidor. `requirements-completed: []` no frontmatter de propósito.
- Nenhum blocker.

## Self-Check: PASSED

- `src/actions/tarefa-actions.ts` — FOUND
- `scripts/test-tarefa-actions.cjs` — FOUND
- `scripts/test-group-by-urgency.cjs` — FOUND
- `src/db/queries.ts` — contém `export function groupByUrgency` / `groupLeadsByUrgency` / `getTarefasPendentes` / `buildDashboardItems` / `isNull(tarefas.concluidaEm)`
- Commit `c34ae72` — FOUND
- Commit `c0a5e53` — FOUND
- Commit `9d6f9d9` — FOUND

---
*Phase: 12-agenda-tarefas-soltas*
*Completed: 2026-08-29*
