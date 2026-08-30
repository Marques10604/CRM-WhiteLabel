---
phase: 13-rename-sub-nicho-nicho-reframe
verified: 2026-08-30T16:05:00Z
status: passed
status_history:
  - status: human_needed
    at: 2026-08-30T16:05:00Z
    note: "verificação inline goal-backward — itens humanos existentes, aguardando ponte da UAT"
  - status: passed
    at: 2026-08-30T16:20:00Z
    note: "promovido pelo /close-phase — 13-UAT.md status: complete, 8/8 pass, 0 issues, 0 skips (predicado phase uat-passed → CLEAN). Itens de verificação humana todos cobertos pela UAT de navegador."
score: 3/3 must-haves verified (code + build + UAT)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
deferred: []
decision_coverage:
  honored: 9
  total: 9
  not_honored: []
---

# Phase 13 — Verification: Rename `sub-nicho → nicho` + reframe

**Goal (ROADMAP):** O admin usa o CRM sem ver nenhuma referência a "sub-nicho" ou "área da saúde" — o campo se chama "nicho" em toda tela e a ferramenta se apresenta como agnóstica de nicho, sem perder a categorização dos leads existentes.

**Verdict:** `passed` — 3/3 must-haves verificados na camada de código, build, teste automatizado e UAT de navegador. Fase é user-facing → itens de verificação humana existiam; **todos cobertos pela UAT** (`13-UAT.md` `status: complete`, 8/8 pass, 0 issues, 0 skips). Promovido de `human_needed` pelo `/close-phase` — UAT limpa pelo predicado `phase uat-passed`.

---

## Goal Achievement (Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | Em toda tela onde antes aparecia "sub-nicho" agora aparece "nicho" | ✓ VERIFIED | `sed` em massa sobre ~30 consumidores + rename dos 4 componentes + rota. `grep -rn "subnichoId\|Subnicho\|SubnichoCombobox\|@/actions/subnicho" src/` → vazio. UAT Testes 1/4/5/6/7: menu "Nichos", label "Nicho" no form, coluna+filtro "Nicho" em `/leads`, seção "Leads por nicho" em `/relatorios`, campo "Nicho" no wizard de CSV. |
| 2 | Rota `/nichos` gerencia a lista (CRUD) + item no menu + `/subnichos` → redirect 301 | ✓ VERIFIED | `src/app/nichos/page.tsx` (`NichoManager` via `nicho-actions.ts`); `next.config.ts` `redirects()` `permanent: true`; `app-sidebar.tsx` `{ href: "/nichos", label: "Nichos" }`. UAT Teste 2 (redirect confirmado) + Teste 3 (criar/renomear/soft-delete/reativar-por-nome, todos os toasts "Nicho"). `npm run build` lista `/nichos`, não `/subnichos`. |
| 3 | Leads existentes mantêm sua categorização — o rename (só de código) não toca nenhum dado | ✓ VERIFIED | D-01: Drizzle mapeia `nichos = sqliteTable("subnichos")` / `nichoId: integer("subnicho_id")` — nenhuma migração, nenhum backup. `git diff --stat 17e3b03..b3885fb -- src/db/migrations/ package.json` → vazio. **Prova no banco (UAT):** `SELECT id,nome,deleted_at FROM subnichos` → tabela física `subnichos` intacta, 3 nichos reais (`nutricionista`/`odonto`/`A categorizar`) com `deleted_at: null`, os 37 leads mantêm `subnicho_id`. `npm run verify:schema` exit 0 SEM edição do script. |
| 4 | Nenhum label/placeholder/ajuda/exemplo/estado-vazio menciona "área da saúde", "nutricionista/terapeuta" fixo, ou nicho-pai | ✓ VERIFIED | 3 pontos "saúde" neutralizados (metadata `layout.tsx`, help text do form → "ex: dentista, e-commerce de roupa, academia", placeholder de template). Gate de grep `grep -rniE "sub-?nicho\|área da saúde\|nutricionista\|terapeuta" src/` filtrado → vazio (só o doc-comment do `schema.ts:11` que explica a divergência D-01). UAT Teste 8. |
| 5 | Importar CSV mapeando coluna para "nicho" cria os leads com o nicho certo | ✓ VERIFIED | `csv-column-mapper.tsx:20` `{ key: "nichoNome", label: "Nicho", required: false }`; `csvRowSchema.nichoNome` msg "Nicho é obrigatório."; wizard usa `nichos`/`nichoNome`/`nichoOverrideId`. `npm run test:lead-actions` (inclui casos de `bulkImportLeads` com `nichoNome`) exit 0. `npm run build` compila o wizard. UAT Teste 7 (label verificado por fonte + build + harness; upload de CSV real não dirigido — dev server lento). |

**Score: 3/3 must-haves** (NICHO-01, NICHO-02, COPY-01).

---

## Artifact Verification

| Artifact | Exists | Substantive | Wired | Status |
|----------|--------|-------------|-------|--------|
| `src/db/schema.ts` (`nichos` lógico / `subnichos` físico + doc-comment) | ✓ | ✓ | ✓ (`verify:schema` exit 0) | ✓ VERIFIED |
| `src/types/index.ts` (`Nicho`/`NewNicho`) | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/lib/validations.ts` (`nichoSchema`, `nichoId`, `nichoNome`) | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/db/queries.ts` (`getContagemPorNicho`) | ✓ | ✓ | ✓ (importado por `relatorios/page.tsx`) | ✓ VERIFIED |
| `src/lib/csv-import.ts` (`CsvFieldKey "nichoNome"`) | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/actions/nicho-actions.ts` (`createNicho`/`softDeleteNicho`/`renameNicho`) | ✓ | ✓ | ✓ (git mv; importado por `nicho-manager`/`nicho-combobox`) | ✓ VERIFIED |
| `src/app/nichos/page.tsx` | ✓ | ✓ | ✓ (rota gerada no build) | ✓ VERIFIED |
| `next.config.ts` (redirect `/subnichos`→`/nichos`) | ✓ | ✓ | ✓ (UAT Teste 2) | ✓ VERIFIED |
| `src/components/nicho-combobox.tsx` / `nicho-manager.tsx` / `delete-nicho-dialog.tsx` | ✓ | ✓ | ✓ (montados no form / rota) | ✓ VERIFIED |
| `scripts/guard-no-hard-delete.cjs` (CODE_PATTERN `.delete(nichos)`) | ✓ | ✓ | ✓ (`guard:no-hard-delete` exit 0) | ✓ VERIFIED |

Nenhum órfão. `src/app/subnichos/`, `src/components/subnicho-*.tsx`, `src/actions/subnicho-actions.ts` — todos removidos (git mv).

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `app-sidebar.tsx` | `/nichos` | `{ href: "/nichos", label: "Nichos" }` | ✓ WIRED |
| `next.config.ts` | `/nichos` | `redirects() { source: "/subnichos", permanent: true }` | ✓ WIRED (UAT Teste 2) |
| `nichos/page.tsx` | `nicho-manager.tsx` | `<NichoManager nichos={items} />` | ✓ WIRED |
| `nicho-manager.tsx` | `nicho-actions.ts` | `createNicho`/`renameNicho`/`softDeleteNicho` | ✓ WIRED (UAT Teste 3) |
| `lead-form-dialog.tsx` | `nicho-combobox.tsx` | `<NichoCombobox nichos={nichos} />` | ✓ WIRED (UAT Teste 4) |
| `relatorios/page.tsx` | `queries.ts` | `getContagemPorNicho` | ✓ WIRED (UAT Teste 6) |
| `schema.ts` (leads) | `schema.ts` (nichos) | `nichoId.references(() => nichos.id, { onDelete: "restrict" })` | ✓ WIRED |

Todas verificadas por `npm run build` exit 0 + UAT ponta a ponta.

---

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| NICHO-01 (campo "nicho" em todo sistema) | ✓ SATISFIED | Success Criteria 1/3/5 + UAT Testes 1/4/5/6/7 |
| NICHO-02 (rota `/nichos` CRUD + redirect) | ✓ SATISFIED | Success Criterion 2 + UAT Testes 2/3 |
| COPY-01 (sem "área da saúde"/nicho-pai) | ✓ SATISFIED | Success Criterion 4 + UAT Teste 8 + gate de grep |

*REQUIREMENTS.md será promovido de `Pending` → `Done` pelo `/close-phase`.*

---

## Behavioral Verification

| Check | Result | Detail |
|-------|--------|--------|
| `npm run build` | ✓ | exit 0 (2×: fim da Wave 2 e da Wave 3), rota `/nichos`, sem `/subnichos` |
| `npm run verify:schema` | ✓ | exit 0 SEM edição do script (banco físico intacto) |
| `npm run guard:no-hard-delete` | ✓ | exit 0 — protege `nichos` (CODE_PATTERN), mantém `DELETE FROM subnichos` (SQL físico) |
| `npm run test:lead-actions` | ✓ | exit 0 |
| `npm run test:relatorios` | ✓ | exit 0 (38 checagens) |
| `npm run test:tarefa-actions` / `test:group-by-urgency` / `test:compute-sequencia` / `test:interacao-actions` | ✓ | exit 0 — regressão, nenhum toca nicho |
| Gate de grep COPY-01 | ✓ | vazio (só o doc-comment do schema) |

*`npx tsc --noEmit` isolado dá timeout de 2min neste host — coberto pelo passo "Running TypeScript" do `npm run build` (exit 0).*

---

## Anti-Pattern Scan

| Pattern | Resultado |
|---------|-----------|
| TBD / FIXME / XXX / TODO / HACK | nenhum introduzido pela fase |
| placeholder / coming soon | 1 falso-positivo pré-existente (`placeholder=` HTML no `<Input>`) |
| `dangerouslySetInnerHTML` | nenhum |
| identificador `subnicho` órfão em `src/` | nenhum (só nomes físicos de banco + doc-comment) |

---

## Decision Coverage (#2492 — non-blocking)

9/9 decisões do `13-CONTEXT.md` (D-01 a D-09) rastreadas — tabela completa em `13-03-SUMMARY.md` §"D-01 a D-09 — rastro" e `13-SECURITY.md`. Nenhuma decisão abandonada.

---

## Human Verification

Fase user-facing → itens de verificação humana existem. **Todos executados na UAT de navegador** (`13-UAT.md`, `status: complete`): menu "Nichos", redirect `/subnichos`→`/nichos`, CRUD em `/nichos` (criar/renomear/soft-delete/reativar), campo "Nicho" + help text genérico no form, coluna/filtro "Nicho" em `/leads` (filtro funcional), seção "Leads por nicho" em `/relatorios`, campo mapeável "Nicho" no wizard de CSV, ausência total de "sub-nicho"/"área da saúde".

**Resultado: 8/8 pass, 0 issues.** Uma cosmética pré-existente da Fase 1 anotada (o gatilho do filtro de nicho mostra o id em vez do nome — não é regressão da Fase 13).

---

## Gaps Summary

Nenhum gap. Nenhum plano de correção necessário.

---

## Metadata

- Verificação conduzida inline (contexto completo da sessão de execução + UAT), sem subagente.
- Registro de ameaças: `13-SECURITY.md` — 9/9 closed, 0 open.
- Método: goal-backward contra os 3 Success Criteria do ROADMAP + must_haves dos 3 PLANs.
- Fase 13 commitada direto em `main` (`branching_strategy: none`), já pushada em `origin/main` — sem PR próprio (deviation do padrão branch-por-lote das Fases 10-12, aceitável por `branching_strategy: none`).
