---
phase: quick-260725-lai
plan: 01
subsystem: crm
tags: [drizzle, sqlite, soft-delete, next-server-actions, subnicho]

requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: "LEAD-04 (convenção de soft-delete de leads via deletedAt), guard:no-hard-delete, padrão DeleteLeadDialog/softDeleteLead"
provides:
  - "Coluna deletedAt (nullable) + índice subnichos_deleted_at_idx na tabela subnichos, aplicados via drizzle-kit push"
  - "softDeleteSubnicho: soft-delete idempotente de sub-nicho, nunca hard-delete"
  - "Reativação por nome: recriar (form) ou importar (CSV) um nome removido reativa o registro em vez de erro de duplicata"
  - "Botão de remover + diálogo de confirmação por linha em /subnichos, com estado vazio"
  - "Filtro de removidos nas superfícies de seleção: combobox de lead/CSV e dropdown de filtro da toolbar de /leads"
affects: [subnichos, leads, csv-import, pipeline, dashboard]

tech-stack:
  added: []
  patterns:
    - "Filtrar deletedAt só nas superfícies de SELEÇÃO (combobox, dropdown de filtro), nunca nas queries de LISTAGEM de leads (que usam o array de subnichos como mapa id->nome)"
    - "Reativação por nome em vez de bloqueio de duplicata: createSubnicho e bulkImportLeads regravam deletedAt=null quando o nome já existe removido"

key-files:
  created:
    - src/components/delete-subnicho-dialog.tsx
  modified:
    - src/db/schema.ts
    - src/actions/subnicho-actions.ts
    - src/actions/import-actions.ts
    - src/actions/lead-actions.ts (só comentário)
    - src/components/subnicho-manager.tsx
    - src/app/subnichos/page.tsx
    - src/components/subnicho-combobox.tsx
    - src/components/lead-table-toolbar.tsx
    - src/app/leads/page.tsx (só comentário)

key-decisions:
  - "Filtrar deletedAt só nas superfícies de seleção (combobox + dropdown da toolbar), nunca nas queries de /, /leads, /pipeline, /lixeira, /importar — essas continuam buscando TODOS os subnichos para não quebrar o mapa id->nome de leads antigos"
  - "Reativar por nome em createSubnicho/bulkImportLeads em vez de erro de duplicata, já que o uniqueIndex de nome é global (inclui removidos)"
  - "subnichoExists (lead-actions.ts) permanece indiferente a deletedAt de propósito, para não quebrar edição/salvamento de leads cujo sub-nicho foi removido"

patterns-established:
  - "SubnichoCombobox preserva o valor já selecionado mesmo se removido (filtro deletedAt === null || id === value), evitando forçar troca de sub-nicho ao editar lead antigo"

requirements-completed: [SUBNICHO-DEL-01, LEAD-04]

duration: ~25min (retomada de sessão anterior interrompida antes da Task 1)
completed: 2026-07-29
---

# Quick Task 260725-lai: Botão de remoção (soft-delete) de sub-nicho Summary

**Soft-delete de sub-nicho via coluna `deletedAt` (drizzle-kit push), botão de lixeira + diálogo de confirmação em `/subnichos`, e filtro de removidos restrito às superfícies de seleção (combobox de lead/CSV e dropdown de filtro de `/leads`) para não quebrar o nome exibido de leads antigos.**

## Performance

- **Duração:** ~25 min (retomada — a sessão anterior parou antes de completar a Task 1 por erro de ferramenta; nenhuma task havia sido commitada, working tree estava limpo ao retomar)
- **Completado:** 2026-07-29
- **Tasks:** 3/3 automatizadas completas; `<human-check>` da Task 3 (smoke test no navegador) fica PENDENTE para o usuário
- **Arquivos modificados/criados:** 9

## Accomplishments

- Coluna `deleted_at` (nullable) + índice `subnichos_deleted_at_idx` aplicados na tabela `subnichos` do banco vivo via `npx drizzle-kit push` (sem prompt interativo, sem precisar de `--force`)
- `softDeleteSubnicho(subnichoId)` — soft-delete idempotente (guard `isNull(deletedAt)` no `where`), nunca `.delete(subnichos...)` — `npm run guard:no-hard-delete` passa
- `createSubnicho` e `bulkImportLeads` reativam um sub-nicho removido em vez de bloquear com "Esse sub-nicho já existe."
- Botão de lixeira por linha em `/subnichos`, diálogo `DeleteSubnichoDialog` (espelha `DeleteLeadDialog`), toast "Sub-nicho removido.", estado vazio "Nenhum sub-nicho cadastrado."
- `SubnichoCombobox` (usado por `lead-form-dialog.tsx` e `csv-import-preview-table.tsx`) e o dropdown "Sub-nicho" da toolbar de `/leads` deixam de listar sub-nichos removidos, preservando a seleção atual se ela já apontar para um removido

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Coluna deletedAt em subnichos + softDeleteSubnicho + reativação por nome** — `59a27c6` (feat)
2. **Task 2: Diálogo de confirmação + botão de remover em /subnichos** — `2c7a1ba` (feat)
3. **Task 3: Esconder sub-nichos removidos das superfícies de seleção** — `fa7a778` (feat)

**Plan metadata:** commit deste SUMMARY/STATE feito separadamente pelo orquestrador.

## Files Created/Modified

- `src/db/schema.ts` — coluna `deletedAt` + índice `subnichos_deleted_at_idx` em `subnichos`
- `src/actions/subnicho-actions.ts` — `softDeleteSubnicho`; `createSubnicho` reativa nome removido
- `src/actions/import-actions.ts` — `bulkImportLeads` reativa sub-nicho removido ao encontrá-lo pelo nome do CSV; comentário em `fetchPreviewSupportData` confirmando comportamento inalterado
- `src/actions/lead-actions.ts` — só comentário documentando `subnichoExists` indiferente a `deletedAt`
- `src/components/delete-subnicho-dialog.tsx` — novo, diálogo de confirmação
- `src/components/subnicho-manager.tsx` — botão de lixeira, `startTransition` + toast, estado vazio
- `src/app/subnichos/page.tsx` — query filtra `isNull(subnichos.deletedAt)`
- `src/components/subnicho-combobox.tsx` — filtro `deletedAt === null || id === value`
- `src/components/lead-table-toolbar.tsx` — dropdown de filtro só lista ativos
- `src/app/leads/page.tsx` — só comentário confirmando ausência de filtro (mapa id->nome)

## Evidência do PRAGMA (banco vivo, `./data/crm.db`)

Coluna aplicada via `drizzle-kit push` — **não há diff em `src/db/migrations/`** (mesma nota da decisão 04-02: push não gera arquivo `.sql`; verificação foi feita direto no banco vivo):

```
table_info(subnichos): id, nome, created_at, deleted_at
index(subnichos): subnichos_deleted_at_idx, subnicho_nome_unique_idx
```

## Decisions Made

- **Filtrar só nas superfícies de seleção, nunca nas queries de listagem de leads.** O array de `subnichos` que `/`, `/leads`, `/pipeline`, `/lixeira` e `/importar` passam para seus componentes serve de mapa `id -> nome` para exibir o sub-nicho de cada lead. Filtrar `deletedAt` nessas queries quebraria esse mapa para leads antigos apontando a um sub-nicho removido. Por isso o filtro fica restrito a `SubnichoCombobox` (formulário de lead + prévia de CSV) e ao dropdown "Sub-nicho" da toolbar de `/leads` — as duas únicas superfícies onde o usuário efetivamente *seleciona* um sub-nicho.
- **Reativar por nome em vez de erro de duplicata.** O `uniqueIndex` de nome em `subnichos` é global (inclui linhas removidas) — sem essa decisão, recriar ou importar um nome já removido seria um beco sem saída ("Esse sub-nicho já existe."). `createSubnicho` e o loop de resolução de sub-nichos em `bulkImportLeads` agora checam `deletedAt` da linha existente e, se removida, regravam `deletedAt: null` (e o nome, no caso do form) em vez de bloquear.
- **`subnichoExists` (lead-actions.ts) permanece indiferente a `deletedAt`.** Se passasse a filtrar `isNull(deletedAt)`, editar e salvar um lead cujo sub-nicho foi removido passaria a falhar com "Selecione um sub-nicho.", mesmo sem o usuário trocar nada no formulário — comportamento documentado via comentário na função.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Comentário do soft-delete disparava falso-positivo no guard:no-hard-delete**
- **Found during:** Task 1, ao rodar `npm run guard:no-hard-delete`
- **Issue:** O comentário de topo de `softDeleteSubnicho` continha a substring literal `.delete(subnichos` (citando o padrão que o guard proíbe), e o guard é um grep ingênuo linha-a-linha sem exclusão de comentários — mesma classe de falso-positivo já registrada em sessão anterior (STATE.md, recovery 02-02, com a substring `useReducer`).
- **Fix:** Reescrito o comentário para descrever a proibição sem reproduzir o padrão regex literal (`.delete(\s*subnichos`).
- **Files modified:** `src/actions/subnicho-actions.ts`
- **Verification:** `npm run guard:no-hard-delete` passa (exit 0)
- **Committed in:** `59a27c6` (parte do commit da Task 1)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Correção pontual de comentário, sem impacto em comportamento. Nenhum scope creep.

## Issues Encountered

- **`npm run lint` reporta erros pré-existentes, fora do escopo desta task.** A regra ESLint `react-compiler` ("Calling setState synchronously within an effect can trigger cascading renders") já falhava, antes desta quick task, em pelo menos 8 arquivos do projeto — incluindo dois blocos de `useEffect` em `src/components/subnicho-manager.tsx` que este plano **não tocou** (handlers de sucesso de `renameSubnicho`/`createSubnicho`, já existentes). Confirmado por leitura que o código NOVO desta task (`delete-subnicho-dialog.tsx`, botão de lixeira, `handleDeleteConfirm` via `startTransition`) não introduz nenhuma ocorrência nova da regra. Documentado em `.planning/quick/260725-lai-adicionar-botao-de-remocao-soft-delete-d/deferred-items.md`, não corrigido aqui (fora do escopo direto das mudanças desta task, presente em código pré-existente espalhado pelo projeto).

## `<human-check>` da Task 3 — PENDENTE

Esta sessão não tem acesso a navegador. As verificações automatizadas da Task 3 (`node -e` de filtro deletedAt, `npm run build`) passaram, mas o smoke test manual descrito no `<human-check>` do PLAN.md **não foi executado** e continua pendente para o usuário rodar em `http://localhost:3000` (servidor de dev já rodando, PID 1496):

1. Criar sub-nicho descartável em `/subnichos`, confirmar que aparece na lista.
2. Clicar na lixeira -> diálogo "Remover sub-nicho" abre citando o nome -> "Cancelar" não muda nada.
3. Lixeira -> "Remover" -> toast "Sub-nicho removido." e linha some sem reload.
4. `/leads` -> "Novo lead" -> combobox de sub-nicho: o removido NÃO aparece.
5. `/leads` -> dropdown "Sub-nicho": o removido NÃO aparece.
6. Remover "nutricionista" (sub-nicho do lead de teste real "hion") -> confirmar que o lead "hion" continua listado em `/leads`/`/pipeline`/`/` com o nome "nutricionista" ainda visível, e que editar/salvar esse lead funciona sem erro "Selecione um sub-nicho."
7. Recriar "nutricionista" em `/subnichos` -> deve reativar (sucesso), não dar erro de duplicata; deve voltar a aparecer no combobox.
8. Limpar sub-nichos de teste, deixando só os reais.

**Status:** NÃO executado nesta sessão — nenhuma alegação de teste em navegador foi feita. Marcar como pendente até o usuário confirmar manualmente.

## User Setup Required

None - nenhuma configuração de serviço externo necessária. Nenhuma dependência nova instalada.

## Next Phase Readiness

- Tasks 1-3 automatizadas completas e commitadas; funcionalidade de soft-delete de sub-nicho está pronta no código e no banco vivo (`drizzle-kit push` aplicado).
- Bloqueador para considerar esta quick task 100% fechada: rodar o `<human-check>` da Task 3 manualmente no navegador (ver seção acima) antes do uso real de prospecção previsto para o CRM.
- Item de limpeza técnica (não bloqueante, não desta task): erros pré-existentes da regra `react-compiler` do ESLint em 8 arquivos, ver `deferred-items.md`.

---
*Quick task: 260725-lai*
*Completed: 2026-07-29*

## Self-Check: PASSED

Todos os 10 arquivos citados (9 de código + `deferred-items.md`) encontrados no disco; os 3 commits de task (`59a27c6`, `2c7a1ba`, `fa7a778`) encontrados em `git log`.
