---
phase: 16-corre-es-de-code-review-da-fase-15
plan: 02
subsystem: csv-import
tags: [csv-import, preview-table, migration, sqlite, code-review-fix, gates]

# Dependency graph
requires:
  - phase: 15-campo-interesse-servi-o-desejado-no-lead
    provides: "coluna leads.interesse, MappedCsvRow.interesse, truncamento .slice(0,500) em mapCsvRows, previewColumns em csv-import-preview-table.tsx"
  - phase: 16-corre-es-de-code-review-da-fase-15
    plan: 01
    provides: "trim de interesse no preprocess, corte por code point no CSV, harness com casos de whitespace/truncamento"
provides:
  - "coluna 'Interesse' na prévia da importação de CSV, no molde da coluna 'notas' (fecha WR-02/FIX-02)"
  - "badge amarelo 'Cortado em 500 caracteres' na própria célula quando interesse.length === 500 — torna o truncamento D-10 observável antes do admin confirmar (D-05/D-06)"
  - "migrate-interesse.cjs: backup só quando de fato vai escrever — execução idempotente não acumula backup (fecha IN-03/FIX-03)"
  - "migrate-interesse.cjs: header documenta a premissa operacional 'pare a app Next antes de rodar' (WAL)"
  - "gate SC#5 do ROADMAP verde sobre a fase inteira (tsc + build + test:lead-actions + verify:schema + guard:no-hard-delete)"
affects: [csv-import, phase-16-close]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "coluna de prévia de CSV com aviso condicional na célula (flex flex-col gap-1: valor + <Badge> amarelo), fora do sistema RowFlags/StatusBadges (D-06)"
    - "script de migração .cjs: checar hasColumn via PRAGMA table_info ANTES de fs.copyFileSync; backup + ALTER só no ramo !hasColumn; verificação pós-migração roda nos dois ramos"

key-files:
  created: []
  modified:
    - src/components/csv-import-preview-table.tsx
    - scripts/migrate-interesse.cjs

key-decisions:
  - "Badge de truncamento usa o mesmo esquema visual dos avisos amarelos já no arquivo (#FEF3C7/#B45309, variant outline, ícone TriangleAlert size-3) — TriangleAlert já estava importado, zero import novo"
  - "Guard hasColumn reusa UMA conexão better-sqlite3: abre, checa PRAGMA, e só no ramo !hasColumn faz checkpoint + close + copyFileSync + reabre para o ALTER — nunca duas conexões simultâneas ao mesmo arquivo"
  - "Nenhum outro migrate-*.cjs tocado (D-11) — dívida de padrão deferida; os 13 backups históricos em data/ preservados"

patterns-established:
  - "Prévia de importação de CSV mostra TODA coluna mapeável, com o valor exato que será gravado (truncado inclusive), e sinaliza na célula quando o valor foi cortado"

requirements-completed: [FIX-02, FIX-03]

# Metrics
duration: ~25min (inclui recuperação: tasks 1-2 commitadas em sessão anterior sem SUMMARY)
completed: 2026-09-01
---

# Phase 16 Plan 02: Coluna Interesse na prévia do CSV + migração idempotente + gate SC#5 Summary

**A prévia da importação de CSV agora mostra a coluna "Interesse" (molde de `notas`) com um badge amarelo de "Cortado em 500 caracteres" na célula quando o valor foi truncado; `migrate-interesse.cjs` só cria backup quando vai de fato escrever e documenta "pare a app Next antes de rodar"; os 5 gates do SC#5 saem todos em exit 0.**

## Performance

- **Duration:** ~25 min (Tasks 1 e 2 já commitadas — `bb4b36a`, `dded053` — numa sessão anterior interrompida antes do SUMMARY; esta sessão fechou a Task 3 e o SUMMARY via recuperação `close-out manually`)
- **Completed:** 2026-09-01
- **Tasks:** 3
- **Files modified:** 2 (neste plano) / 6 (fase inteira)

## Accomplishments

- **FIX-02 / WR-02 fechado:** nova entrada em `previewColumns` logo após `notas`, `accessorKey: "interesse"` / `header: "Interesse"`. O `cell` empilha, num `flex flex-col gap-1`: (1) `<span className="block max-w-xs whitespace-pre-line">{row.original.interesse || "—"}</span>` — mesmo idioma da coluna `notas`, `"—"` quando vazio (D-04); (2) condicional em `row.original.interesse?.length === 500`, um `<Badge>` amarelo "Cortado em 500 caracteres" (D-05). O badge mora **na célula**, fora de `RowFlags`/`StatusBadges` (D-06). `handleConfirm` e o resumo textual intocados.
- **FIX-03 / IN-03 fechado:** `migrate-interesse.cjs` reordenado — abre uma conexão, avalia `hasColumn` via `PRAGMA table_info(leads)`, e só no ramo `!hasColumn` faz `wal_checkpoint(TRUNCATE)` + `close` + `fs.copyFileSync` + reabre + `ALTER TABLE`. Execução idempotente (coluna presente) não escreve nada e **não cria backup** — a pasta `data/` deixa de acumular um backup por execução (parou em 13). A verificação pós-migração (contagem de leads, tipo `TEXT`, `notnull === 0`, `SELECT ... LIMIT 1`) roda nos dois ramos. Header ganhou bloco `PREMISSA OPERACIONAL (IN-03)`: pare a app Next antes de rodar, porque o `journal_mode=WAL` do `src/db/client.ts` pode deixar escritas concorrentes fora da cópia.
- **SC#5 (Task 3) verde:** os 3 gates do ROADMAP mais os 2 guards de regressão baratos, rodados em série no host de 4GB.

## Task Commits

1. **Task 1: Coluna "Interesse" na prévia do CSV + badge de truncamento** — `bb4b36a` (feat)
2. **Task 2: migrate-interesse.cjs — doc "pare a app" + sem backup em execução idempotente** — `dded053` (fix)
3. **Task 3: Gate SC#5** — sem commit de código (nenhuma regressão a corrigir); resultados registrados abaixo.

**Plan metadata:** commit de docs a seguir (este SUMMARY + STATE.md + ROADMAP.md).

## Files Created/Modified

- `src/components/csv-import-preview-table.tsx` — +27 linhas: entrada `interesse` em `previewColumns` com `cell` de valor + badge condicional. `TriangleAlert` já importado (linha 10). `RowFlags`/`StatusBadges`/`handleConfirm`/resumo byte-idênticos.
- `scripts/migrate-interesse.cjs` — header com bloco `PREMISSA OPERACIONAL` + `IDEMPOTÊNCIA`; guard `hasColumn` movido para antes do backup; `backup + ALTER` dentro de `if (!hasColumn)`; log do ramo idempotente diz explicitamente "nenhum backup criado".

## Gate SC#5 — exit codes (Task 3)

| Comando | Exit | Nota |
|---------|------|------|
| `npx tsc --noEmit` | **0** | ~110s no host de 4GB (estoura timeout de 2min do shell; não é defeito) |
| `npm run build` | **0** | Turbopack: compiled 90s, TypeScript 56s, 13 páginas geradas |
| `npm run test:lead-actions` | **0** | inclui os casos de `interesse` (create/update/vazio/só-espaços/501 chars/CSV mapeado/CSV sem mapear/mapCsvRows 600→500); > 19 casos da Fase 15, zero falhas |
| `npm run verify:schema` | **0** | coluna `interesse` TEXT nullable confirmada em `data/crm.db` |
| `npm run guard:no-hard-delete` | **0** | escopo protegido intacto |

**Migração idempotente:** `ls data/crm.db.backup-*` = 13 antes e 13 depois de `npm run migrate:interesse` (exit 0). Saída: "coluna interesse já existe — nada a migrar, nenhum backup criado (idempotência)" + "OK: 44 leads intactos".

**Diff da fase inteira:** exatamente 6 arquivos modificados, 0 criados, 0 removidos —
`scripts/migrate-interesse.cjs`, `scripts/test-lead-actions.cjs`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-preview-table.tsx`, `src/lib/csv-import.ts`, `src/lib/validations.ts`. Nenhuma migração de schema nova.

## Decisions Made

- Badge reusa o esquema visual amarelo já presente no arquivo; `TriangleAlert` já importado → zero import novo.
- Uma única conexão better-sqlite3 no script; fecha antes de reabrir para o `ALTER` (padrão que o script já usava com `dbForCheckpoint`).
- `migrate-motivos-perda.cjs` / `migrate-tarefas.cjs` / demais `migrate-*.cjs` **não** tocados (D-11) — dívida de padrão deferida.

## Deviations from Plan

- **Recuperação, não deviation de escopo:** as Tasks 1 e 2 foram commitadas numa sessão anterior (`bb4b36a`, `dded053`) que terminou antes de escrever o `16-02-SUMMARY.md`. Esta sessão retomou pelo caminho `close-out manually` do `safe_resume_gate`: inspeção dos dois commits (batem com o plano), execução da Task 3 (gates), escrita deste SUMMARY, atualização de STATE/ROADMAP. Nenhum código reescrito.
- Contagem de leads em `data/crm.db` subiu de 37 (docs da Fase 15) para 44 — uso real do admin, esperado.

## Issues Encountered

- `npx tsc --noEmit` e `npm run build` estouram o timeout padrão de 2min do shell neste host de 4GB; rodados com timeout estendido, ambos exit 0. Consistente com a nota de 2026-08-29 no STATE.md.
- Nenhum processo `node` órfão para encerrar antes do build.

## User Setup Required

None — zero dependência nova, zero migração de schema, nenhuma configuração de serviço externo.

## Next Phase Readiness

- **FIX-01, FIX-02, FIX-03 — todos fechados.** Os 5 achados do `15-REVIEW.md` (WR-01, WR-02, IN-01, IN-02, IN-03) estão resolvidos entre 16-01 e 16-02.
- SC#1–SC#5 do ROADMAP para a Fase 16 satisfeitos.
- `human_verify_mode: end-of-phase` → resta o `<human-check>` da Task 1 (subir CSV real, mapear coluna → Interesse, conferir prévia + badge em célula > 500 chars) para o UAT de fim de fase.
- `security_enforcement: true` → threat model T-16-01..09 + T-16-SC está inline nos dois PLANs; `/gsd-secure-phase 16` antes do fechamento formal.
- `npm run lint` do repo inteiro segue saindo 1 (457 erros pré-existentes) — trabalho da **Fase 17**, não bloqueia a Fase 16.
- Próximo: `/gsd-verify-work 16` (ou `/gsd-secure-phase 16` → UAT → `/close-phase 16`).

## Self-Check: PASSED

- FOUND: `src/components/csv-import-preview-table.tsx` — `accessorKey: "interesse"` (1×), `header: "Interesse"` (1×), `row.original.interesse || "—"`, `interesse?.length === 500`, `whitespace-pre-line` (2×)
- FOUND: `scripts/migrate-interesse.cjs` — "pare a app" no header, `PRAGMA table_info` antes de `fs.copyFileSync`, `copyFileSync` dentro de `if (!hasColumn)`
- FOUND: commit `bb4b36a`
- FOUND: commit `dded053`
- VERIFIED: gate SC#5 5/5 exit 0; backups 13→13 na migração idempotente; 6 arquivos modificados na fase, 0 criados/removidos

---
*Phase: 16-corre-es-de-code-review-da-fase-15*
*Completed: 2026-09-01*
