---
phase: quick-260807-uit
plan: 01
subsystem: testing
tags: [zod, drizzle, sqlite, csv-import, code-review, verificacao]

# Dependency graph
requires:
  - phase: 08-origem-governada-separa-o-inbound-outbound
    provides: coluna origemTipo (schema + validacoes + formulario + import CSV) e os 3 warnings do code review (08-REVIEW.md)
provides:
  - Guarda estatica verify-origem-tipo.cjs tolerante a reformatacao (sem janelas de regex por contagem de caracteres)
  - Fonte unica real para o default de origemTipo no import CSV (CSV_DEFAULTS.origemTipo)
  - Cobertura comportamental (nao so grep estatico) do caminho bulkImportLeads para origemTipo
affects: [09-timeline-de-interacoes, 10-sequencia-de-follow-up-escalonada]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guardas estaticas baseadas em forma canonica (comentarios removidos + todo espaco em branco removido) em vez de janelas de regex limitadas por contagem de caracteres"

key-files:
  created: []
  modified:
    - scripts/verify-origem-tipo.cjs
    - src/lib/validations.ts
    - src/lib/csv-import.ts
    - scripts/test-lead-actions.cjs

key-decisions:
  - "WR-02 executado ANTES de WR-01 (ordem obrigatoria do plano): a guarda precisava aceitar as duas formas do default (literal ou CSV_DEFAULTS.origemTipo) antes da Task 2 trocar a forma real, senao a propria guarda quebraria no meio da tarefa"
  - "IN-01 (comentario longo em schema.ts) e IN-02 (DDL duplicada entre backfill-origem-tipo.cjs e test-lead-actions.cjs) deliberadamente NAO tocados - sao 'info' no code review, nao 'warning', fora do escopo desta tarefa"

requirements-completed: [ORIGEM-01, ORIGEM-02]

# Metrics
duration: 25min
completed: 2026-08-08
---

# Quick Task 260807-uit: Fechar os 3 warnings do code review da Fase 8

**Guarda de verificação reescrita com checagens estruturais tolerantes a reformatação, default de `origemTipo` no import CSV unificado em `CSV_DEFAULTS`, e cobertura comportamental real de `bulkImportLeads` adicionada a `test-lead-actions.cjs`.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-08 (retomada de trabalho já iniciado em 2026-08-07, Task 1 encontrada no working tree ainda não commitada)
- **Completed:** 2026-08-08T11:05:47Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments

- WR-02 fechado: `scripts/verify-origem-tipo.cjs` não depende mais de `{0,N}` nem de indentação fixa — usa `dense()` (forma canônica sem espaço em branco) + `declarationSlice()` (recorte sem limite de tamanho)
- WR-01 fechado: `csvRowSchema.origemTipo` consome `CSV_DEFAULTS.origemTipo` diretamente — não existe mais um literal `"outbound"` duplicado entre `csv-import.ts` e `validations.ts`
- WR-03 fechado: `scripts/test-lead-actions.cjs` ganhou Caso 11 (prova que o default vem do Zod, não do SQLite) e Caso 12 (prova de ponta a ponta via `bulkImportLeads` real contra banco temporário)

## Task Commits

Each task was committed atomically:

1. **Task 1 (WR-02): checagens estruturais em verify-origem-tipo.cjs** - `39be18a` (refactor)
2. **Task 2 (WR-01): csvRowSchema consome CSV_DEFAULTS.origemTipo** - `d60b3ee` (refactor)
3. **Task 3 (WR-03): Casos 11/12 em test-lead-actions.cjs** - `2cbbd8a` (test)

_Nenhum commit de metadados de plano separado — este é um quick task, não uma fase completa._

## Files Created/Modified

- `scripts/verify-origem-tipo.cjs` - Guarda dos 5 elos reescrita com `dense()`/`declarationSlice()`, imune a reformatação
- `src/lib/validations.ts` - `csvRowSchema.origemTipo` agora `.default(CSV_DEFAULTS.origemTipo)`, importa `CSV_DEFAULTS` de `@/lib/csv-import`
- `src/lib/csv-import.ts` - Comentário de `CSV_DEFAULTS.origemTipo` atualizado (deixa de ser "só documentação", passa a ser fonte única real)
- `scripts/test-lead-actions.cjs` - Casos 11 e 12 novos + helper `makeImportRow()` + imports dinâmicos de `bulkImportLeads`/`csvRowSchema`

## Tabela WR-01 / WR-02 / WR-03 — arquivo alterado → evidência

| Warning | Arquivo alterado | Evidência (comando + resultado) |
|---------|-------------------|----------------------------------|
| WR-01 | `src/lib/validations.ts`, `src/lib/csv-import.ts` | `npx tsc --noEmit` exit 0; `npm run verify:origem-tipo` → `[verify-origem-tipo] OK: 5 elos da fiação íntegros ... distribuição no banco real: outbound=33`; script de verificação inline confirmou `importa/usaFonteUnica/semLiteralNoCsvSchema/leadSemDefault/constantePresente` todos `true` |
| WR-02 | `scripts/verify-origem-tipo.cjs` | `npm run verify:origem-tipo` exit 0; `npm run test:mutation-guard` exit 0; script de verificação inline confirmou `semJanelaFixa/semIndent2/dense/declSlice/aceitaCsvDefaults` todos `true` (nenhum `{0,N}` nem indentação fixa `\n\s{2}` restante fora de comentários) |
| WR-03 | `scripts/test-lead-actions.cjs` | `node scripts/test-lead-actions.cjs` exit 0, `[test-lead-actions] OK: todas as asserções passaram.`, incluindo Casos 11 e 12 novos (ver saída completa abaixo) |

## Saída de `npm run test:mutation-guard` (prova de que a Task 1 não enfraqueceu a guarda)

```
> crm-leads@0.1.0 test:mutation-guard
> node scripts/test-mutation-guard.cjs

[test-mutation-guard] OK: guarda falha (exit 1) contra cópia temporária mutada em os.tmpdir() e permanece passando (exit 0) contra o arquivo real, que nunca foi escrito.
```

Rodado duas vezes durante a execução (logo após Task 1, e novamente na sequência final de verificação) — mesmo resultado nas duas vezes.

## Saída dos Casos 11 e 12 novos de `test-lead-actions.cjs`

```
OK csvRowSchema.safeParse(linha sem origemTipo): success === true
OK csvRowSchema.safeParse(linha sem origemTipo): data.origemTipo === "outbound" (got outbound)
  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)
OK bulkImportLeads(linha sem origemTipo): insere exatamente 1 linha (antes=3, depois=4)
OK bulkImportLeads(linha sem origemTipo): linha persistida com origemTipo === "outbound" (got outbound)
OK bulkImportLeads(linha sem origemTipo): linha persistida com importBatchId não-nulo (got b0843262-2b1a-409a-abbd-ad78f6c58fc1)

[test-lead-actions] OK: todas as asserções passaram.
```

Todos os 12 casos (1-12) passaram, zero linhas `FAIL`.

## Nota sobre IN-01 e IN-02

`IN-01` (comentário inline de ~400 caracteres em `src/db/schema.ts:42`) e `IN-02` (DDL duplicada entre `scripts/backfill-origem-tipo.cjs` e `scripts/test-lead-actions.cjs`) são classificados como `info` (não `warning`) no `08-REVIEW.md` e foram **deliberadamente deixados de fora** desta tarefa, conforme o objetivo do plano. Nenhum dos dois arquivos relacionados a esses itens (`src/db/schema.ts`, `scripts/backfill-origem-tipo.cjs`) foi tocado.

## Decisions Made

- Ordem das tasks respeitada estritamente (WR-02 antes de WR-01) — a guarda precisava aceitar `.default(CSV_DEFAULTS.origemTipo)` como forma válida antes da Task 2 introduzir essa forma no código real, senão `npm run verify:origem-tipo` quebraria entre as duas tasks.
- Task 3 usa try/catch específico para tolerar `revalidatePath` lançando fora do contexto Next (mesmo padrão já usado por `callToleratingRevalidate` nos Casos 1/8/10), reutilizando a mesma regra de mensagem (`/revalidatePath|static generation store/i`) em vez de importar o helper (ele está definido como função local dentro do IIFE de setup, fora do escopo do bloco de Caso 12).

## Deviations from Plan

None - plan executado exatamente como escrito. Task 1 já estava presente no working tree ao iniciar esta sessão (trabalho de uma sessão anterior interrompida, nunca commitado); foi lida integralmente, comparada linha a linha contra a especificação da Task 1 do plano, confirmada correta, verificada com os gates do plano, e commitada como parte desta execução — nenhuma reescrita foi necessária.

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- Os 3 warnings do code review da Fase 8 (`08-REVIEW.md`) estão fechados; a Fase 8 fica sem débito de manutenibilidade/cobertura pendente antes de Fases 10/11 (que dependem de `origemTipo`) começarem a mexer nesse código.
- Nenhuma mudança de comportamento observável no CRM (mesmos defaults, mesma validação, mesma UI) — confirmado por `npm run build` limpo e pelos 12 casos de `test-lead-actions.cjs` passando, incluindo os 4 casos pré-existentes de `origemTipo` (Casos 9/10) e os 2 novos (11/12).
- `IN-01`/`IN-02` continuam como itens `info` em aberto em `08-REVIEW.md`, não bloqueantes, para avaliação futura se algum dev tocar em `schema.ts` ou nos scripts de backfill/teste novamente.

---
*Phase: quick-260807-uit*
*Completed: 2026-08-08*

## Self-Check: PASSED

Todos os 5 arquivos verificados existem no disco (`scripts/verify-origem-tipo.cjs`, `src/lib/validations.ts`, `src/lib/csv-import.ts`, `scripts/test-lead-actions.cjs`, este SUMMARY.md), e os 3 commits de task (`39be18a`, `d60b3ee`, `2cbbd8a`) estão presentes em `git log --oneline --all`.
