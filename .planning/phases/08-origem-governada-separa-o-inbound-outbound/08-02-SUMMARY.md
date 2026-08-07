---
phase: 08-origem-governada-separa-o-inbound-outbound
plan: 02
subsystem: ui
tags: [react-hook-form, zod, drizzle, csv-import, server-actions]

# Dependency graph
requires:
  - phase: 08-01
    provides: "leadSchema.origemTipo obrigatório sem default (Zod), csvRowSchema.origemTipo com default('outbound'), coluna origem_tipo já backfillada em produção"
provides:
  - "Campo 'Tipo de origem' no modal de lead (criação + edição), posicionado após 'Origem', sem pré-seleção na criação"
  - "CSV_DEFAULTS documentando origemTipo='outbound' como default fixo e permanente"
  - "bulkImportLeads persistindo origemTipo no insert explícito de leads importados via CSV"
affects: [08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Campo Select controlado (Controller + Select/SelectTrigger/SelectContent) sem valor default em defaultValues quando a UX exige escolha consciente do admin (mesmo padrão de canal, agora repetido em origemTipo)"

key-files:
  created: []
  modified:
    - src/components/lead-form-dialog.tsx
    - src/lib/csv-import.ts
    - src/actions/import-actions.ts

key-decisions:
  - "origemTipo posicionado imediatamente após origem no modal de lead (D-02), espelhando estrutura por estrutura o campo canal (D-03), sem componente novo"
  - "defaultValues.origemTipo usa lead?.origemTipo SEM fallback (?? ), garantindo placeholder vazio na criação (D-04) — mesmo padrão já usado por canal"
  - "CSV_DEFAULTS.origemTipo é documentação/paridade visual; a aplicação real do default 'outbound' continua sendo o .default() do csvRowSchema (08-01) — origemTipo não vira um CsvFieldKey mapeável, wizard não ganha nenhum passo de UI novo"

patterns-established: []

requirements-completed: [ORIGEM-01, ORIGEM-02]

# Metrics
duration: 18min
completed: 2026-08-07
---

# Phase 8 Plan 2: Origem Governada — Formulário + Import CSV Summary

**Campo "Tipo de origem" (Inbound/Outbound) exposto no modal de lead sem pré-seleção na criação, e `bulkImportLeads` agora persiste `origemTipo="outbound"` em todo lote importado via CSV, sem nenhum passo de UI novo no wizard.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-07T15:33:00Z
- **Completed:** 2026-08-07T15:50:26Z
- **Tasks:** 2/2 completed
- **Files modified:** 3

## Accomplishments
- `ORIGEM_TIPO_OPTIONS` declarada logo após `CANAL_OPTIONS`, com rótulos "Inbound"/"Outbound" em inglês (D-01)
- Bloco `Field`/`Controller`/`Select` de `origemTipo` inserido imediatamente após o campo "Origem" no modal (D-02), espelhando estrutura por estrutura o campo `canal` (D-03), com `FieldDescription` explicando o conceito de negócio
- `defaultValues.origemTipo` usa `lead?.origemTipo` sem fallback — placeholder vazio na criação, valor do lead pré-carregado na edição (D-04)
- `CSV_DEFAULTS` em `csv-import.ts` documenta `origemTipo: "outbound"` como default fixo/permanente, com JSDoc explicando que a aplicação real continua no `.default("outbound")` do `csvRowSchema`
- `bulkImportLeads` (`import-actions.ts`) agora inclui `origemTipo: row.origemTipo` no insert explícito de `tx.insert(leads).values({...})`, imediatamente após `origem: row.origem` — sem essa linha, o valor validado nunca chegaria ao banco (Pitfall 3 do 08-RESEARCH.md)
- Nenhum arquivo do wizard (`csv-import-wizard.tsx`, `csv-import-preview-table.tsx`) foi tocado; `ConfirmedImportRow` permanece sem o campo `origemTipo`

## Task Commits

Each task was committed atomically:

1. **Task 1: Campo obrigatório "Tipo de origem" no modal de lead** - `5551fb3` (feat)
2. **Task 2: Persistir origemTipo="outbound" no fluxo de import CSV em lote** - `3ecab19` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/components/lead-form-dialog.tsx` - constante `ORIGEM_TIPO_OPTIONS`, `defaultValues.origemTipo` sem fallback, bloco `Field`/`Controller`/`Select` após "Origem"
- `src/lib/csv-import.ts` - `CSV_DEFAULTS.origemTipo` (documentação/paridade), JSDoc estendido explicando o default fixo
- `src/actions/import-actions.ts` - `bulkImportLeads` persiste `origemTipo: row.origemTipo` no insert explícito

## Decisions Made
- Nenhuma decisão nova além das já travadas em `08-CONTEXT.md` (D-01 a D-05) e `08-DECISOES.md` (q2 — default outbound fixo, sem seletor de UI no import). Este plano só implementou o que já estava decidido.

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de código (Regras 1-3). Um único ajuste de redação em comentário, sem impacto funcional:

**1. [Ajuste de verificação — falso positivo de check automatizado] Reescrita de comentário em `CSV_DEFAULTS`**
- **Found during:** Task 2 (asserção estática `notAFieldKey`)
- **Issue:** O comentário JSDoc originalmente citado no plano usava o texto literal `` `CsvFieldKey` `` próximo de `origemTipo`, o que disparava falso positivo no regex `notAFieldKey:!/CsvFieldKey[\s\S]{0,400}origemTipo/` (a checagem estática do próprio `08-02-PLAN.md`) — não é um erro de código, é o comentário de documentação citando o nome do tipo perto demais do campo.
- **Fix:** Reescrita a frase para "não é um campo mapeável de coluna do arquivo" em vez de citar `CsvFieldKey` literalmente, preservando o mesmo significado.
- **Files modified:** `src/lib/csv-import.ts`
- **Verification:** Reexecução da asserção estática — `notAFieldKey: true`
- **Committed in:** `3ecab19` (Task 2 commit)

---

**Total deviations:** 1 ajuste de redação (nenhuma regra de deviation de código aplicada — plano executado exatamente como escrito em termos de comportamento).
**Impact on plan:** Zero impacto funcional; apenas reformulação de um comentário para não disparar um falso positivo do próprio checker do plano.

## Issues Encountered

- **Falso positivo confirmado em `confirmedRowUntouched` (asserção estática da Task 2):** o regex `!/ConfirmedImportRow = \{[\s\S]*?origemTipo[\s\S]*?\};/` do próprio `08-02-PLAN.md` retorna `false` mesmo com `ConfirmedImportRow` intacto. Causa: como `origemTipo` não aparece dentro do bloco do tipo (linhas 67-75 de `import-actions.ts`), o motor de regex faz backtracking do `[\s\S]*?` não-guloso PARA ALÉM do primeiro `};` (fechamento real do tipo), encontra `origemTipo` mais adiante no arquivo (dentro de `tx.insert(leads).values({...})`) e casa com um `};` bem mais distante (o `return { success: true, ... };` no fim do arquivo) — um bug clássico de regex não-gulosa cruzando limites de bloco, mesmo padrão de falso-positivo em checkers baseados em grep já documentado no `RETROSPECTIVE.md` do projeto (referenciado em `STATE.md` como "Decision Coverage Gate falso positivo").
  - **Verificação manual (autoritativa):** leitura direta de `src/actions/import-actions.ts` linhas 67-75 confirma que `ConfirmedImportRow` contém exatamente `nome`, `telefone`, `canal`, `origem`, `valorEstimado`, `notas`, `subnichoNome` — **sem** `origemTipo`, exatamente como o `acceptance_criteria` do plano exige.
  - Nenhuma correção de código foi feita para "satisfazer" esse regex — o código já está correto; documentado aqui para auditoria futura.

## User Setup Required

None - no external service configuration required.

## Verificação

- `npx tsc --noEmit` — exit 0 (rodado após cada task)
- `npx eslint src/components/lead-form-dialog.tsx` — exit 0
- `npx eslint src/lib/csv-import.ts src/actions/import-actions.ts` — exit 0
- Asserções estáticas (`node -e`) da Task 1 — todas `true`
- Asserções estáticas (`node -e`) da Task 2 — `csvDefault`, `notAFieldKey`, `insertLine`, `afterOrigem` = `true`; `confirmedRowUntouched` = falso positivo do checker (ver "Issues Encountered" acima), verificado manualmente como correto
- `git diff --diff-filter=D` após cada commit — nenhuma deleção acidental
- `git diff --name-only` limitado aos arquivos esperados em cada task

### `<human-check>` — NÃO executado nesta sessão

Sem acesso a navegador nesta sessão headless (mesmo caveat registrado em praticamente todos os SUMMARYs anteriores do projeto, incluindo `02-02-SUMMARY.md`/`02-03-SUMMARY.md`). Os 7 passos de human-check da Task 1 (placeholder vazio, exatamente duas opções, bloqueio de submit sem escolha, query direta pós-criação, "Outbound" pré-selecionado na edição de lead backfillado) e os 2 passos da Task 2 (import real de CSV de teste + query de `origem_tipo` pós-import) **ficam pendentes de verificação manual no navegador** antes de considerar este plano pronto para uso real. Nenhum `import_batch_id` de teste foi gerado nesta sessão — nenhum import ao vivo foi executado.

**Recomendação para o usuário:** rodar `npm run dev`, abrir `http://localhost:3000/leads`, seguir os passos de `<human-check>` da Task 1 e Task 2 do `08-02-PLAN.md`, e parar o dev server ao final (host de 4GB, evitar processos duplicados).

## Next Phase Readiness
- `origemTipo` agora é capturado tanto na criação/edição manual quanto no import CSV — todo lead novo (de qualquer origem de criação) recebe uma classificação Inbound/Outbound explícita
- Nenhum bloqueio técnico identificado para o plano 08-03
- Débito pendente: verificação humana via navegador (ver seção acima) — recomendado antes de considerar a Fase 8 pronta para uso real em prospecção

---
*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Completed: 2026-08-07*
