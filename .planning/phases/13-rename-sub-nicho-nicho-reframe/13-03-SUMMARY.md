---
phase: 13-rename-sub-nicho-nicho-reframe
plan: 03
subsystem: ui
tags: [rename, copy, reframe, grep-gate]
requires:
  - phase: 13-rename-sub-nicho-nicho-reframe (plano 02)
    provides: "superfícies de UI falando `nicho`; copy dos componentes `nicho-*` já limpa"
provides:
  - "COPY-01 satisfeito: nenhuma string de UI menciona \"sub-nicho\"/\"área da saúde\"/\"nutricionista\"/\"terapeuta\""
  - "Texto de ajuda do campo de nicho com exemplo genérico (D-04): \"Nicho do lead (ex: dentista, e-commerce de roupa, academia).\""
  - "Metadata do app sem nicho específico (D-05)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Gate de grep como prova de COPY-01: `grep -rniE 'sub-?nicho|área da saúde|nutricionista|terapeuta' src/` filtrado só pelos nomes físicos + doc-comment"
key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/components/lead-form-dialog.tsx
    - src/components/template-form-dialog.tsx
key-decisions:
  - "3 mudanças de copy só — a Onda 2 já havia limpado toda a copy \"Sub-nicho\" das superfícies (labels de tabela, filtro, wizard, `<h2>` de `/relatorios`, componentes de gestão) via o `sed` em massa"
  - "`layout.tsx` `description` → \"CRM pessoal para organizar leads e o funil de vendas.\" (sem nicho específico); `title` \"CRM de Leads\" já era genérico"
  - "O doc-comment `schema.ts:11` (\"o rename `sub-nicho → nicho` ... acontece SÓ na camada de código\") FICA — é explicação da divergência D-01, não string de UI; o gate de grep o exclui explicitamente"
patterns-established: []
requirements-completed: [NICHO-01, NICHO-02, COPY-01]
duration: ~8min
completed: 2026-08-30
---

# Phase 13 Plan 03: Varredura de copy Summary

**Os 3 últimos pontos que mencionavam "área da saúde"/"nutricionista" foram neutralizados. O gate de grep COPY-01 passa: nenhuma string visível ao usuário em `src/` diz "sub-nicho", "área da saúde", "nutricionista" ou "terapeuta" — só sobra o doc-comment do `schema.ts` que explica a divergência lógico↔físico (D-01) e os nomes físicos de banco. Fase 13 completa.**

## Accomplishments

- **`src/app/layout.tsx`**: `description: "CRM pessoal para organizar leads da área da saúde"` → `"CRM pessoal para organizar leads e o funil de vendas."` (D-05). `title: "CRM de Leads"` já era genérico — mantido.
- **`src/components/lead-form-dialog.tsx`**: `<FieldDescription>Categoria do lead (ex: nutricionista, terapeuta).</FieldDescription>` → `<FieldDescription>Nicho do lead (ex: dentista, e-commerce de roupa, academia).</FieldDescription>` (D-04 — exemplo genérico, 3 setores bem diferentes). O `<FieldLabel>` já dizia "Nicho" (Onda 2).
- **`src/components/template-form-dialog.tsx`**: `placeholder="Ex: Primeiro contato — nutricionista"` → `placeholder="Ex: Primeiro contato — dentista"` (mantém o formato, exemplo genérico).

## Task Commits

1. **Task 1-3 (uma leva)** — `2733b10` (feat)

## Verificação (suíte completa da Fase 13)

| # | Comando | Exit | Nota |
|---|---------|------|------|
| 1 | `npm run build` | **0** | "Compiled successfully in 78s", "Finished TypeScript in 112s", 13 páginas, `○ /nichos` (sem `/subnichos`) |
| 2 | `npm run verify:schema` | **0** | banco físico intacto (D-01 — sem migração) |
| 3 | `npm run guard:no-hard-delete` | **0** | protege `nichos` (CODE_PATTERN), mantém `DELETE FROM subnichos` (físico) |
| 4 | `npm run test:lead-actions` | **0** | |
| 5 | `npm run test:relatorios` | **0** | 38 checagens |
| 6 | `npm run test:tarefa-actions` | **0** | regressão |
| 7 | `npm run test:group-by-urgency` | **0** | regressão |
| 8 | `npm run test:compute-sequencia` | **0** | regressão |
| 9 | **Gate de grep COPY-01** | **VAZIO** | `grep -rniE "sub-?nicho\|área da saúde\|nutricionista\|terapeuta" src/` filtrado (excl. `subnicho_id`, nomes de índice, `"subnichos"`, `migrations/`, `schema.ts:11`) → nenhuma linha |

## Evidência dos 3 Success Criteria (ROADMAP Fase 13)

1. **NICHO-01 — o campo se chama "nicho" em todo código e toda tela** — Onda 1 (schema/tipos/Zod/queries/actions), Onda 2 (rota + 4 componentes + ~25 consumidores + sidebar + harnesses). `grep -rn "subnichoId\|Subnicho\|SubnichoCombobox\|getContagemPorSubnicho\|@/actions/subnicho" src/` → VAZIO. `build` exit 0.
2. **NICHO-02 — rota `/nichos` gerencia a lista + redirect 301** — `src/app/nichos/page.tsx` com `NichoManager` (criar/renomear/soft-delete/reativar via `nicho-actions.ts`, comportamento idêntico ao antigo `/subnichos`); `next.config.ts` redirect `permanent: true`; sidebar `{ href: "/nichos", label: "Nichos" }`. `build` lista `/nichos`, não `/subnichos`.
3. **COPY-01 — nenhuma referência a "área da saúde"/nicho-pai** — gate de grep vazio (item 9 acima). Texto de ajuda genérico. Metadata neutra.

**Leads existentes intocados:** D-01 (rename só de código) → o `data/crm.db` não foi tocado; `verify:schema` verde sem mudança no script; os 37 leads mantêm `subnicho_id` (coluna física) → categorização preservada 100%.

## D-01 a D-09 — rastro

| Decisão | Onde vive |
|---------|-----------|
| D-01 (rename só de código, banco intocado) | `schema.ts` `nichos = sqliteTable("subnichos")` + doc-comment; nenhuma migração/backup em nenhuma onda; `verify:schema` sem edição |
| D-02 (`/subnichos` → redirect 301) | `next.config.ts` `redirects()` |
| D-03/D-04/D-05 (varredura ampla + exemplo genérico + metadata) | Onda 2 (todas as labels/`<h2>`/wizard) + Onda 3 (3 pontos "saúde") |
| D-06 (`SEM_SUBNICHO_FALLBACK` só nome muda) | `csv-import-preview-table.tsx` `SEM_NICHO_FALLBACK` (valor "A categorizar" mantido) |
| D-07 (Onda 1 = dados) | commit `0c80822` |
| D-08 (Onda 2 = UI, `tsc`/`build` verdes) | commit `f30bd18` |
| D-09 (Onda 3 = copy + gate de grep) | commit `2733b10` |

## `<human-check>` — NÃO rodado nesta sessão

Os 8 itens do bloco `<human-check>` do `13-03-PLAN.md` (navegador: menu "Nichos", redirect `/subnichos`, CRUD em `/nichos`, campo no form de lead, coluna/filtro em `/leads`, seção "Leads por nicho" em `/relatorios`, wizard de CSV, ausência de "saúde") pendentes — precisam de `/gsd-verify-work 13` numa sessão com navegador. A camada de código está 100% verificada (build + 8 harnesses + grep gate).

## Deviations from Plan

- Task 2/3 do plano (varredura de "Sub-nicho" visível + harnesses) já tinham sido feitas na Onda 2 (o `sed` em massa pegou labels e o commit da Onda 2 já migrou os `.cjs`). A Onda 3 ficou só com os 3 pontos "saúde" da Task 1. Sem impacto — o gate de grep final é o mesmo.

## Issues Encountered

Nenhum.

## Self-Check: PASSED

- Gate de grep COPY-01 → VAZIO
- `src/components/lead-form-dialog.tsx` contém `e-commerce de roupa` e `academia`
- `src/app/layout.tsx` `description` sem "saúde"
- Commit `2733b10` — FOUND
- `npm run build` exit 0

---
*Phase: 13-rename-sub-nicho-nicho-reframe*
*Completed: 2026-08-30*
