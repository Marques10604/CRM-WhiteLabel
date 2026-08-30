---
phase: 13-rename-sub-nicho-nicho-reframe
plan: 02
subsystem: ui
tags: [rename, route, next-redirect, components, sed]
requires:
  - phase: 13-rename-sub-nicho-nicho-reframe (plano 01)
    provides: "camada de dados com o vocabulário `nicho` (nichos/nichoId/Nicho/nichoSchema/nichoNome/getContagemPorNicho/nicho-actions)"
provides:
  - "Rota `/nichos` (movida de `src/app/subnichos/`) + redirect 301 `/subnichos`→`/nichos` no `next.config.ts` (D-02)"
  - "3 componentes dedicados renomeados: `nicho-combobox.tsx` (`NichoCombobox`), `nicho-manager.tsx` (`NichoManager`), `delete-nicho-dialog.tsx` (`DeleteNichoDialog`)"
  - "Item do sidebar: `{ href: \"/nichos\", label: \"Nichos\" }`"
  - "~25 consumidores importam os nomes novos; `npx tsc`/`npm run build` exit 0"
affects: [13-03]
tech-stack:
  added: []
  patterns:
    - "`next.config.ts` `redirects()` como rede de segurança de rename de rota (permanent: true)"
    - "Rename mecânico em massa via `sed` sobre lista de arquivos derivada do `tsc` (roteiro no 13-01-SUMMARY)"
key-files:
  created:
    - src/app/nichos/page.tsx
  modified:
    - next.config.ts
    - src/components/app-sidebar.tsx
    - "~27 consumidores (actions, pages, componentes) — ver Task Commits"
    - scripts/test-lead-actions.cjs
    - scripts/test-relatorios-queries.cjs
  renamed:
    - src/app/subnichos/ → src/app/nichos/ (git mv)
    - src/components/subnicho-combobox.tsx → src/components/nicho-combobox.tsx
    - src/components/subnicho-manager.tsx → src/components/nicho-manager.tsx
    - src/components/delete-subnicho-dialog.tsx → src/components/delete-nicho-dialog.tsx
key-decisions:
  - "Rename em massa via `sed` (Sub-nichos/sub-nichos/Sub-nicho/sub-nicho/SUBNICHO/Subnicho/subnicho → nicho/Nicho/NICHO) sobre os ~30 arquivos consumidores — pega identificador E copy de uma vez; os nomes FÍSICOS (`subnichos`, `subnicho_id`, índices) não têm forma camelCase nem hífen, então sobrevivem intactos"
  - "A copy dos 3 componentes `nicho-*` (toasts \"Nicho criado/renomeado/removido\", placeholder \"Nome do nicho\", estado vazio \"Nenhum nicho cadastrado\", corpo do dialog de remoção) foi feita nesta onda ao reescrever os arquivos — não sobrou pra Onda 3"
  - "Harnesses `.cjs`: identificadores JS migrados (`getContagemPorNicho`, `nichoId`, `nichoNome`, `nichoInsert`); SQL de setup (`CREATE TABLE subnichos`, `INSERT INTO subnichos`, `subnicho_id`, `REFERENCES subnichos(id)`, `ALTER TABLE subnichos`) MANTIDO — nome físico"
patterns-established: []
requirements-completed: []
duration: ~25min
completed: 2026-08-30
---

# Phase 13 Plan 02: Superfícies de UI falam `nicho` Summary

**A rota `/subnichos` virou `/nichos` (com redirect 301), os 3 componentes dedicados foram renomeados `subnicho-*` → `nicho-*`, o sidebar diz "Nichos", e os ~25 arquivos que consomem os símbolos da Onda 1 importam os nomes novos. `npm run build` sai exit 0 com a rota `/nichos` (e sem `/subnichos`); todos os 5 harnesses `.cjs` verdes.**

## Accomplishments

- **Rota**: `src/app/subnichos/page.tsx` → `src/app/nichos/page.tsx` (git mv do diretório), reescrito: `NichosPage`, import `{ nichos }`, `<h1>Nichos</h1>`, `<NichoManager nichos={items} />`.
- **Redirect**: `next.config.ts` ganhou `async redirects()` retornando `{ source: "/subnichos", destination: "/nichos", permanent: true }` — com comentário citando D-02. `turbopack.root` preservado.
- **3 componentes** (git mv + reescrita):
  - `nicho-combobox.tsx` — `NichoCombobox`, props `nichos`/`nichoId`, `name="nichoId"`, placeholder "Selecione um nicho", empty "Nenhum nicho encontrado.", import `@/... ` sem alteração de lógica (o filtro de soft-delete + exceção do valor selecionado é idêntico).
  - `nicho-manager.tsx` — `NichoManager`/`NichoRow`, `createNicho`/`renameNicho`/`softDeleteNicho` de `@/actions/nicho-actions`, `DeleteNichoDialog`, toasts "Nicho criado."/"Nicho renomeado."/"Nicho removido.", placeholder "Nome do nicho", estado vazio "Nenhum nicho cadastrado.".
  - `delete-nicho-dialog.tsx` — `DeleteNichoDialog`, prop `nichoNome`, título "Remover nicho", corpo "...remover {nichoNome}? ... Os leads já cadastrados nesse nicho continuam intactos.".
- **Sidebar**: `app-sidebar.tsx` — item `{ href: "/nichos", label: "Nichos", icon: Tag }`.
- **~25 consumidores** migrados por `sed` (lista derivada do `13-01-SUMMARY.md`): `import-actions.ts`, `lead-actions.ts`, `motivo-perda-actions.ts`, `tarefa-actions.ts`, `app/{importar,importar/[batchId],leads,lixeira,page,pipeline,relatorios,motivos-perda}/page.tsx`, `csv-{column-mapper,import-preview-table,import-wizard}.tsx`, `followup-dashboard.tsx`, `lead-form-dialog.tsx`, `lead-table{,-columns,-toolbar}.tsx`, `lixeira-table.tsx`, `pipeline-{board,lead-card}.tsx`, `post-import-lead-list.tsx`, `whatsapp-preview-dialog.tsx`, `motivo-perda-{combobox,manager}.tsx`, `template-{list,form-dialog}.tsx`, `use-first-contact-trigger.ts`, `lib/whatsapp.ts`. Também: `delete-motivo-perda-dialog.tsx` (comentário `delete-subnicho-dialog.tsx` → `delete-nicho-dialog.tsx`), `queries.ts` (2 comentários `sub-nicho` que sobraram da Onda 1).
- **Harnesses**: `test-lead-actions.cjs` e `test-relatorios-queries.cjs` — `getContagemPorSubnicho` → `getContagemPorNicho`, `subnichoId` (JS) → `nichoId`, `subnichoNome` → `nichoNome`, `subnichoInsert` → `nichoInsert`, msg "Selecione um sub-nicho." → "Selecione um nicho.", comentários. SQL de setup preservado.

## Task Commits

1. **Task 1-2 (uma leva)** — `f30bd18` (feat)

## Verificação (gates da Onda 2)

| # | Comando | Exit | Nota |
|---|---------|------|------|
| 1 | `npm run build` (após `rm -rf .next`) | **0** | "Compiled successfully", "Finished TypeScript in 2.3min", log lista `○ /nichos`, NÃO lista `/subnichos` |
| 2 | `npm run verify:schema` | **0** | |
| 3 | `npm run guard:no-hard-delete` | **0** | |
| 4 | `npm run test:lead-actions` | **0** | "todas as asserções passaram" |
| 5 | `npm run test:relatorios` | **0** | 38 checagens |
| 6 | `npm run test:tarefa-actions` / `test:group-by-urgency` / `test:compute-sequencia` / `test:interacao-actions` | **0** | regressão — nenhum tocou nicho, intocados |
| 7 | grep `subnicho`/`Subnicho` em `src/` | — | só sobra `sqliteTable("subnichos")`, `integer("subnicho_id")`, 3 nomes de índice string, doc-comment do schema, e os 3 pontos "saúde" (Onda 3) |

`npx tsc --noEmit` isolado dá timeout de 2min neste host — coberto pelo passo "Running TypeScript" do `npm run build` (2.3min, exit 0).

## Deviations from Plan

- 13-02 previa "não tocar copy além do necessário pra compilar — isso é a Onda 3". Na prática, a reescrita dos 3 componentes `nicho-*` incluiu a copy deles (toasts, placeholder, estado vazio, dialog) — é o mesmo arquivo, separar seria artificial. A Onda 3 só precisa dos 3 pontos "área da saúde" + o gate de grep.
- `stale .next/types/validator.ts` acusava `src/app/subnichos/page.js` — resolvido com `rm -rf .next` antes do build (regenera os tipos de rota).

## Issues Encountered

- Primeiro `npm run test:lead-actions` falhou com `NOT NULL constraint failed: leads.subnicho_id` + `getContagemPorSubnicho is not a function` — os harnesses ainda usavam os nomes antigos. Corrigido no mesmo commit (identificadores JS → nicho, SQL físico mantido).

## Next Phase Readiness

- Onda 3 (13-03): só os 3 pontos "saúde" (`layout.tsx`, `lead-form-dialog.tsx` help text, `template-form-dialog.tsx` placeholder) + o gate de grep COPY-01. Nenhuma string "Sub-nicho" de UI sobrou.

## Self-Check: PASSED

- `src/app/nichos/page.tsx` — FOUND · `src/app/subnichos/` — GONE
- `next.config.ts` — contém `source: "/subnichos"`, `permanent: true`
- `src/components/nicho-{combobox,manager}.tsx` + `delete-nicho-dialog.tsx` — FOUND · `subnicho-*` — GONE
- `npm run build` exit 0, `/nichos` route
- Commit `f30bd18` — FOUND

---
*Phase: 13-rename-sub-nicho-nicho-reframe*
*Completed: 2026-08-30*
