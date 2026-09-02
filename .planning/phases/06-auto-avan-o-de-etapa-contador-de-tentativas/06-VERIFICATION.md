---
phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
verified: 2026-09-02
status: passed
score: 4/4 must-haves (código) + 10/11 cenários de UAT pass + 1 skipped (layout visual) — 0 issues
overrides_applied: 0
human_verification: []
method: "código (verificação inicial 2026-07-30) + code+data (Fase 18 / AUDIT-04, 2026-09-02 — navegador bloqueado por hardware)"
---

# Phase 6: Auto-avanço de Etapa + Contador de Tentativas — Verification Report

**Phase Goal:** Ao contatar um lead pelo WhatsApp, o sistema acompanha automaticamente o progresso da etapa e o esforço de contato — sem o admin precisar atualizar isso manualmente em nenhuma das telas onde o botão de WhatsApp aparece.
**Verified:** 2026-07-30 (código) → promovido a `passed` em 2026-09-02 (Fase 18, AUDIT-04)
**Status:** passed
**Re-verification:** Sim — promoção `human_needed` → `passed` pela auditoria retroativa da Fase 18.

## Promoção de status (Fase 18 — AUDIT-04, 2026-09-02)

A verificação inicial (2026-07-30) fechou 4/4 must-haves no nível de código e deixou 11
verificações humanas pendentes (frontmatter, agora `human_verification: []`). A Fase 18
executou os 11 cenários de `06-HUMAN-UAT.md` por **code+data** (navegador bloqueado por
hardware — host 4GB). Resultado: **10 pass** por code+data, **1 skipped** (cenário 11 —
layout "esfriando + contador na mesma linha sem quebra", puramente visual, diferido). 0 issues.
`06-HUMAN-UAT.md` está `complete`.

Provas centrais:
- `verify-wa-contact-invariant.cjs` (exit 0): tabela-verdade 15/15 — avanço só em
  `primeiro_contato + novo`, contador acumula, nunca re-avança/regride.
- `test:interacao-actions` (exit 0): insert incondicional em `interacoes` por clique.
- `data/crm.db`: leads 18/19 (`novo → contatado`, `1x`), lead 17 (`negociacao`, `3x`, nunca
  regrediu), 20 leads com `contact_attempts = 0` — o comportamento já rodou em produção nos
  3 caminhos.

O caveat WR-01 do `06-REVIEW.md` (TOCTOU estreito) foi FECHADO pela quick 260811-pb1
(reverificação de stage no `WHERE` atômico da transação — `lead-actions.ts:354,362`).

## Método de Verificação (Fase 18)

- **code+data:** leitura de `registerWhatsAppContact` + `whatsapp-preview-dialog.tsx` +
  `pipeline-lead-card.tsx` + as 4 superfícies; harnesses `verify-wa-contact-invariant`,
  `test:interacao-actions`; query no `data/crm.db`.
- **O que um pass de navegador ainda acrescentaria:** o toast sonner renderizado, a migração
  visual do card entre colunas do board, os pixels do indicador `1x` no card e o layout do
  cenário 11.

## Goal Achievement (verificação inicial — 2026-07-30)

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ao clicar "Abrir WhatsApp" com template de 1º contato num lead "Novo", o lead avança para "Contatado" com toast, em qualquer tela onde o botão aparece | ✓ VERIFIED (code-level) | `registerWhatsAppContact` (src/actions/lead-actions.ts:217-248) sets `advanced = tipo === "primeiro_contato" && current.stage === "novo"`, writes `stage: "contatado"` when true, returns `{advanced}`. `whatsapp-preview-dialog.tsx:185-194` calls it in the anchor `onClick` and shows `toast.success(\`${nome} avançou para Contatado.\`)` when `result.advanced`. Confirmed the dialog is the single shared component rendered from 6 call sites (`lead-table.tsx`, `post-import-lead-list.tsx`, `importar/[batchId]/page.tsx`, `pipeline-board.tsx`, `lead-form-dialog.tsx`, `followup-dashboard.tsx`) — one instrumentation point covers all surfaces. Browser click-through not run (see Human Verification). |
| 2 | Lead já em "Contatado" ou além nunca regride nem re-avança, mesmo reabrindo o diálogo com template de 1º contato | ✓ VERIFIED (code-level) | Gate is `current.stage === "novo"` — any other stage (`contatado`, `negociacao`, `fechado`, `perdido`) yields `advanced=false`, and the UPDATE only sets `stage`/`stageChangedAt` conditionally. `scripts/verify-wa-contact-invariant.cjs` proves the full 15-pair (3 tipos × 5 etapas) truth table and a simulated re-click sequence — executed live during this verification, exit 0, "OK tabela-verdade: 15/15 pares corretos". |
| 3 | Todo clique em "Abrir WhatsApp" — qualquer template, qualquer etapa — incrementa o contador, visível no card do pipeline | ✓ VERIFIED (code-level) | UPDATE always includes `contactAttempts: sql\`${leads.contactAttempts} + 1\`` unconditionally (line 239), regardless of `advanced`. `pipeline-lead-card.tsx:89-97` renders `<MessageCircle/>` + `{lead.contactAttempts}x` only when `lead.contactAttempts > 0`. Data-flow traced: `/pipeline` page does `db.select().from(leads).where(isNull(leads.deletedAt))` (real query, not static), so `contactAttempts` flowing to the card is live DB data. |
| 4 | Auto-avanço e contador continuam corretos mesmo se o lead foi movido via drag-and-drop pouco antes do clique (checagem sempre re-lida no servidor) | ✓ VERIFIED (code-level, with a documented narrow caveat) | `registerWhatsAppContact` does a fresh `SELECT {stage}` immediately before the `UPDATE`, inside the same server action invocation — never trusts client-supplied stage. This satisfies the literal "moved shortly before the click" (sequential) scenario. **Caveat (WR-01 from code review, accepted in RESEARCH Pitfall 5):** the final `UPDATE`'s `WHERE` clause does not re-condition on `stage = 'novo'` at write time, so a genuinely *concurrent* (same-instant, not "before") drag-and-drop write racing the same UPDATE could theoretically be clobbered. This is a narrower case than SC#4's literal wording and is documented as an accepted limitation in both `06-01-PLAN.md` and the `registerWhatsAppContact` docstring. Flagged as WARNING, not a truth failure. |

**Score:** 4/4 truths verified at the code/static-analysis level. All 4 require browser click-through to close out — see Human Verification Required.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | `contactAttempts` column, `.notNull().default(0)` | ✓ VERIFIED | Line 49: `contactAttempts: integer("contact_attempts").notNull().default(0)` |
| `src/lib/validations.ts` | `whatsappContactSchema` (leadId + tipo) | ✓ VERIFIED | Lines 71-74, exported, `leadId: z.coerce.number().int().positive()`, `tipo: z.enum([...])` |
| `src/actions/lead-actions.ts` | `registerWhatsAppContact(leadId, tipo) => {advanced}` | ✓ VERIFIED | Lines 217-248, exported, matches contract exactly |
| `scripts/verify-wa-contact-invariant.cjs` | Automated truth-table + accumulation guard | ✓ VERIFIED | Exists, runs standalone (`:memory:` SQLite), exit 0 confirmed live during this verification |
| `src/components/whatsapp-preview-dialog.tsx` | Fire-and-forget dispatch + toast | ✓ VERIFIED | Lines 180-195 |
| `src/components/pipeline-lead-card.tsx` | Conditional counter indicator | ✓ VERIFIED | Lines 89-97 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `lead-actions.ts` | `validations.ts` (`whatsappContactSchema`) | `safeParse` at top of action | ✓ WIRED | Line 221 |
| `lead-actions.ts` | `leads.contact_attempts` | Atomic SQL increment in UPDATE | ✓ WIRED | Line 239: `sql\`${leads.contactAttempts} + 1\`` |
| `lead-actions.ts` | `/`, `/pipeline`, `/leads` | `revalidatePath` | ✓ WIRED | Lines 244-246 |
| `whatsapp-preview-dialog.tsx` | `lead-actions.ts` (`registerWhatsAppContact`) | `onClick` of `<a href={waHref}>`, no await/preventDefault | ✓ WIRED | Line 185, confirmed no `preventDefault`/`window.open`/`await registerWhatsAppContact` in file |
| `whatsapp-preview-dialog.tsx` | sonner `toast` | `.then((result) => result.advanced && toast.success(...))` | ✓ WIRED | Lines 186-190 |
| `pipeline-lead-card.tsx` | `lead.contactAttempts` | Conditional render `> 0` | ✓ WIRED | Line 89 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `pipeline-lead-card.tsx` | `lead.contactAttempts` | `src/app/pipeline/page.tsx`: `db.select().from(leads).where(isNull(leads.deletedAt))` | Yes — real Drizzle query against `data/crm.db`, no static/empty fallback | ✓ FLOWING |
| `registerWhatsAppContact` | `current.stage` | Fresh `SELECT {stage} FROM leads WHERE id = ... AND deletedAt IS NULL` inside the action | Yes — direct DB read, not client state | ✓ FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| WA-06 | 06-01, 06-02 | Auto-avanço Novo→Contatado com toast em todas as telas | ✓ SATISFIED (code-level) | Gate + dispatch + toast all present and wired; awaiting human click-through |
| WA-07 | 06-01 | Nunca regride/re-avança lead além de Novo | ✓ SATISFIED | Gate is `stage === "novo"` only; invariant script proves full truth table live |
| WA-08 | 06-01, 06-02 | Todo clique incrementa contador, visível no card | ✓ SATISFIED (code-level) | Unconditional atomic increment + conditional card render confirmed; awaiting human click-through |

No orphaned requirements — REQUIREMENTS.md traceability table maps WA-06/07/08 exclusively to Phase 6, all three declared in `06-01-PLAN.md` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER found in any of the 6 phase-modified files | — | Clean |

No blocking anti-patterns in the phase's own diff. Two pre-existing findings from `06-REVIEW.md` are relevant to note (see Gaps Summary below) but are not phase-authored debt markers and were explicitly scoped as out-of-bounds for this verification per the orchestrator's instructions unless they break an SC.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| WA invariant guard (truth table + accumulation) | `node scripts/verify-wa-contact-invariant.cjs` | `OK tabela-verdade: 15/15 pares corretos` / `OK acumulação/gate: lead1 (novo->contatado, 3x, nunca re-avança), lead2 (negociacao intocada, 1x), lead3 (contatado intocado, 1x)` / exit 0 | ✓ PASS |
| Live DB has `contact_attempts` column, NOT NULL DEFAULT 0 | `node -e "... pragma table_info(leads) ..."` | `{"cid":16,"name":"contact_attempts","type":"INTEGER","notnull":1,"dflt_value":"0","pk":0}`, 33/33 leads non-null | ✓ PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | No output (clean) | ✓ PASS |
| Lint on phase-modified files | `npx eslint <6 files>` | 1 pre-existing error in `whatsapp-preview-dialog.tsx:80` (`react-hooks/set-state-in-effect`), confirmed pre-existing by SUMMARY's `git stash` test, not introduced by this phase | ✓ PASS (no new errors) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this project; `scripts/verify-wa-contact-invariant.cjs` is the phase's declared automated guard and was executed above (Step 7b / Behavioral Spot-Checks), not a probe-named script.

### Human Verification Required

**RESOLVIDO na Fase 18 (AUDIT-04, 2026-09-02).** Os 11 cenários foram executados por
**code+data** (navegador bloqueado por hardware — host 4GB) e registrados em `06-HUMAN-UAT.md`
(`status: complete`): 10 pass, 1 skipped (cenário 11 — layout puramente visual, diferido),
0 issues. Ver "Promoção de status" no topo. `human_verification` no frontmatter agora é `[]`.

## Gaps Summary

No FAILED truths — all 4 ROADMAP success criteria and all PLAN-frontmatter must-haves are structurally verified against actual code (not SUMMARY.md claims): correct gate logic, atomic increment, correct wiring in the single shared dialog component reaching 6 UI call sites, real (non-static) data flow from DB to card, and a live-executed regression guard proving the truth table.

**Two WARNING-level items surfaced by `06-REVIEW.md`, independently confirmed during this verification, that do not fail any of the 4 success criteria as literally worded but are relevant to deployment/production readiness and should be tracked:**

- **CR-01 (Critical per code review, but not a phase-goal failure):** The three committed Drizzle migration `.sql` files, when applied to a fresh database, do **not** reproduce `src/db/schema.ts` — missing the `templates` table and `leads.import_batch_id`/`leads.contact_attempts` columns. Confirmed directly: `ls src/db/migrations/*.sql` still shows only 3 files (no new migration was generated), and the live `data/crm.db` was patched via a hand-run `ALTER TABLE` (per `06-01-SUMMARY.md`, working around a genuine `drizzle-kit push` safety-gate bug that would have run `DELETE FROM leads` before the `ADD COLUMN`). The running app and the one developer machine's DB work correctly (verified: column present, NOT NULL DEFAULT 0, 33/33 leads at 0), so none of the 4 success criteria fail today — but any fresh clone/CI/new environment following the documented `generate`+`migrate` workflow would crash on the first `leads` query. This is pre-existing, growing debt (also affects `templates`/`import_batch_id` from earlier phases), not newly introduced scope failure, but it should be reconciled before any deployment beyond the current single-admin local machine.
- **WR-01 (narrow TOCTOU race, accepted in RESEARCH Pitfall 5):** `registerWhatsAppContact`'s final `UPDATE` does not re-condition `stage = 'novo'` in its `WHERE` clause, so a genuinely concurrent (same-instant) drag-and-drop write racing the WA-click write could theoretically be overwritten. This is narrower than what SC#4 literally requires (which is about state read "shortly before" the click, a scenario the fresh `SELECT` correctly handles) and is a documented, accepted limitation for this solo single-tab tool — not a functional failure of SC#4 as written.

Neither item blocks the phase goal from being observably true in the codebase.

**Atualização Fase 18 (AUDIT-04, 2026-09-02):** WR-01 (TOCTOU estreito) foi FECHADO pela quick
260811-pb1 — `registerWhatsAppContact` passou a reverificar `stage = 'novo'` no `WHERE` atômico
da transação (`lead-actions.ts:354` `stageGuard`, linha 362), com o segundo `UPDATE` de
fallback para não perder o contador sob corrida. CR-01 (migrações `.sql` divergentes do schema)
continua sendo débito de infraestrutura pré-existente e cross-fase (documentado em
`deferred-items.md`) — não é achado desta fase e não bloqueia o goal para o uso solo-local
atual. Status promovido a `passed` com base na UAT code+data (10/11 pass, 1 skipped visual).

---

_Verified: 2026-07-30 (código) → 2026-09-02 (promovido a passed pela Fase 18 / AUDIT-04, code+data)_
_Verifier: Claude (gsd-verifier + Fase 18 auditoria retroativa)_
