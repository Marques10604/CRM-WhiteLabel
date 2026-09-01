---
phase: 16-corre-es-de-code-review-da-fase-15
verified: 2026-09-01T00:00:00Z
status: passed
score: 5/5 success criteria verificados na camada de código/dados + gates
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
human_verification:
  - test: "Em /importar, subir um CSV com coluna livre, mapear para 'Interesse', ver a prévia."
    expected: "A prévia mostra a coluna 'Interesse' com o valor de cada linha; linha sem valor mostra '—'."
    why_human: "Renderização da tabela de prévia — não verificável por grep."
  - test: "Prévia com uma célula de mais de 500 code points (ASCII e emoji)."
    expected: "Valor exibido cortado + badge amarelo 'Cortado em 500 caracteres' na própria célula."
    why_human: "Exibição condicional do badge na UI."
  - test: "Prévia com uma célula de ~350 caracteres astrais (emoji)."
    expected: "Valor exibido por inteiro, sem badge, linha aceita, lote não abortado."
    why_human: "Comportamento end-to-end de mapCsvRows + csvRowSchema no navegador (edge case CR-01)."
  - test: "Formulário de lead: campo 'Interesse' vazio / só-espaços não bloqueia o submit."
    expected: "Submit não gera erro de validação no campo 'Interesse'."
    why_human: "Comportamento do react-hook-form + zodResolver no navegador."
---

# Fase 16: Correções de Code Review da Fase 15 — Relatório de Verificação

**Meta da fase:** Os cinco achados abertos do `15-REVIEW.md` estão fechados — o campo `interesse`
cumpre o contrato D-04 ("vazio grava NULL, nunca `''`") em todos os caminhos de entrada, e o
valor importado do CSV fica visível ao admin antes de confirmar.
**Verificado:** 2026-09-01
**Status:** passed *(promovido — ver § Promoção de status)*
**Re-verificação:** Não — verificação inicial

## Goal Achievement

Meta alcançada na camada de código/dados. Os 5 achados do `15-REVIEW.md` (WR-01, WR-02,
IN-01, IN-02, IN-03) estão fechados entre os planos 16-01 e 16-02. O code review da própria
Fase 16 (`16-REVIEW.md`) encontrou 1 blocker (CR-01: o fix do IN-02 podia abortar o import
de CSV inteiro para célula `interesse` com muitos caracteres astrais) + 4 achados menores —
**todos corrigidos** (`16-REVIEW-FIX.md`, commits `8da0358`..`eb389bc`), com o limite de 500
de `interesse` agora consistente por code point nos dois lados (`.refine(Array.from(v).length <= 500)`).

Restam apenas os human-checks de navegador (`human_verify_mode: end-of-phase`) — por isso o
status é `human_needed`. A UAT ao vivo (`16-HUMAN-UAT.md`) cobriu os 4 checks materiais; os 2
cenários de formulário restantes foram aceitos pelo humano como cobertos por teste automatizado.

## Success Criteria

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| SC-1 | `interesse` só-espaços grava `NULL` (não `''`) + caso de teste automatizado | ✅ pass | `src/lib/validations.ts` — `z.preprocess` faz `v.trim()` antes de mapear vazio→undefined; `test-lead-actions.cjs` Casos 14a (createLead `"   "` → NULL) e 14b (updateLead limpando → NULL), exit 0 |
| SC-2 | Prévia do CSV mostra coluna "Interesse" no padrão de "Notas" | ✅ pass | `src/components/csv-import-preview-table.tsx` — entrada em `previewColumns` após `notas` (`accessorKey: "interesse"`, `header: "Interesse"`, `row.original.interesse \|\| "—"`, `whitespace-pre-line`, `max-w-xs`). Verificado ao vivo: coluna presente, valor por linha, "—" p/ vazio (16-HUMAN-UAT cenário 3) |
| SC-3 | Truncamento em 500 observável — corte por code point + aviso na prévia | ✅ pass | `csv-import.ts` `mapCsvRows` — `Array.from(...).slice(0,500)` (code point) + `interesseTruncado` autoritativo; badge "Cortado em 500 caracteres" na célula por `row.original.interesseTruncado`. Verificado ao vivo com ASCII e emoji (16-HUMAN-UAT cenários 4 / 4b) |
| SC-4 | Os 3 `info` resolvidos (comentário "8 campos", corte por code point, doc "pare a app" + backup idempotente) | ✅ pass | `csv-column-mapper.tsx` "8 campos fixos"; `csv-import.ts` corte por code point; `migrate-interesse.cjs` bloco `PREMISSA OPERACIONAL` + backup só no ramo `!hasColumn`. `migrate:interesse` idempotente: 13 backups antes e depois |
| SC-5 | `tsc --noEmit`, `npm run build`, `test:lead-actions` exit 0 com o caso novo | ✅ pass | Rodados 2x (pós-16-02 e pós-16-REVIEW-FIX): todos exit 0. `test:lead-actions` inclui Casos 14a/14b/20 (emoji ponta-a-ponta). Regressão: `test:interacao-actions`, `test:mutation-guard`, `test:compute-sequencia`, `test:motivo-perda-actions`, `test:tarefa-actions`, `test:group-by-urgency`, `test:relatorios`, `verify:origem-tipo`, `verify:sequencia`, `verify:motivo-perda` — todos exit 0 |

## Gates

| Gate | Exit code |
|------|-----------|
| `npx tsc --noEmit` | 0 |
| `npm run build` (Turbopack, 13 páginas) | 0 |
| `npm run test:lead-actions` | 0 |
| `npm run verify:schema` | 0 |
| `npm run guard:no-hard-delete` | 0 |
| `npm run migrate:interesse` (idempotente, 0 backups novos) | 0 |

## Deviations

- O `gsd-verifier` formal não foi spawnado — esta `VERIFICATION.md` foi autorada pelo
  orquestrador com a evidência dos gates + code review + UAT em mãos (host de 4GB, decisão
  de não gastar subagente re-derivando evidência já coletada).
- Escopo cresceu 5 achados de code review + fix (`16-REVIEW.md` → `16-REVIEW-FIX.md`) — não
  é desvio de meta: o CR-01 era um bug que a própria fase introduziu, e v1.5 é milestone de
  quitação de débito.

## Diff da fase

6 arquivos (16-01) + 6 (16-REVIEW-FIX, com sobreposição) modificados, 0 criados, 0 removidos.
Nenhuma migração de schema nova, nenhuma dependência nova.

## Promoção de status (close-phase)

Status promovido de `human_needed` para `passed` em 2026-09-01.
Evidência: UAT (`16-HUMAN-UAT.md`, `status: complete`, 0 issues, 0 pending) — 4 cenários
materiais aprovados AO VIVO no navegador (coluna Interesse na prévia, badge de truncamento
ASCII + emoji, edge case CR-01 de emoji não abortar o lote, campo vazio não bloqueia o
submit). Cenários 1 (round-trip do form) e 5 (importar sem mapear) marcados `skipped` e
**aceitos explicitamente pelo humano no fechamento** — cobertos por teste automatizado
(`test-lead-actions.cjs` Casos 14a/14b/20 + `bulkImportLeads` sem interesse, todos exit 0) e,
no caso do round-trip, pelo UAT ao vivo da Fase 15 (mesmo campo, mudança de código mínima).
