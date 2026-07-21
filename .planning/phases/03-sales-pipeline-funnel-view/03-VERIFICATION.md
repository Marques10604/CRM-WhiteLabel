---
phase: 03-sales-pipeline-funnel-view
verified: 2026-07-21T00:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/9
  gaps_closed:
    - "Admin sees a board with 5 fixed stages and a live count of leads in each (cross-page cache invalidation)"
    - "Leads stuck in Contatado without recent activity are visually flagged as esfriando (stageChangedAt bump via form-edit path)"
  gaps_remaining: []
  regressions: []
---

# Phase 3: Sales Pipeline & Funnel View Verification Report

**Phase Goal:** Admin sees and manages the sales funnel at a glance, moving leads through stages as deals progress, without deals silently going cold
**Verified:** 2026-07-21
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 03-04)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Board shows 5 fixed stages (Novo/Contatado/Negociação/Fechado/Perdido) with a live count per column, live regardless of which page/action triggered the mutation (PIPE-01) | ✓ VERIFIED (gap closed) | `src/actions/lead-actions.ts`: `createLead` (lines 62-63), `updateLead` (lines 117-118), and `updateLeadStage` (lines 160-161) each now call **both** `revalidatePath("/")` and `revalidatePath("/pipeline")`. Confirmed by direct read of the file (not SUMMARY claim) — all 3 actions revalidate both paths (`grep -c 'revalidatePath("/pipeline")'` = 3, `grep -c 'revalidatePath("/")'` = 3). Board-originated create/edit (via the same `LeadFormDialog`) and list-originated create/edit both now keep `/pipeline`'s counts live. |
| 2 | Admin can drag-and-drop a lead card between stages; dropping on Perdido optionally captures `motivoPerda` without blocking the move (PIPE-02) | ✓ VERIFIED (regression check — unchanged) | `pipeline-board.tsx`: `DndContext` + `PointerSensor(activationConstraint: {distance:8})` + `useOptimistic` + `startTransition` calling `updateLeadStage` (confirmed present, file untouched by 03-04 diff). `motivo-perda-dialog.tsx` unchanged, still wired. |
| 3 | Leads stuck 5+ days in Contatado are flagged "esfriando" regardless of which UI path changed the stage, so they don't silently go cold (PIPE-03) | ✓ VERIFIED (gap closed) | `updateLead` (lines 91-108 of `lead-actions.ts`) now does a `SELECT stage FROM leads WHERE id=? AND deletedAt IS NULL` before the write, computes `stageChanged = current.stage !== parsed.data.stage`, and conditionally sets `stageChangedAt: new Date()` in the same `.set()` call — mirroring `updateLeadStage`'s existing correct pattern exactly. Confirmed by direct code read: `grep -c 'select({ stage: leads.stage })'` = 2 (present in both `updateLead` and `updateLeadStage`), `grep -c 'stageChangedAt: new Date()'` = 2. A lead moved to "Contatado" via the form dropdown now has its clock started and will be flagged after 5+ days by `page.tsx`'s existing `differenceInDays` + `stageChangedAt != null` guard (unchanged, still present at `src/app/pipeline/page.tsx:29-30`). |
| 4 | Existing `fechado_perdido` leads backfilled to `fechado`; all leads have `stage_changed_at` populated | ✓ VERIFIED (regression check) | Direct query against `./data/crm.db`: `PRAGMA table_info(leads)` confirms `motivo_perda`/`stage_changed_at` columns exist; 0 rows with `stage_changed_at IS NULL`; 0 rows with `stage = 'fechado_perdido'`; stage distribution `{fechado: 2}` (both pre-existing leads migrated, unaffected by the 03-04 diff since it never touched schema/migrations). |
| 5 | Edit-lead modal offers all 5 stage options + conditional "Motivo da perda" field when stage = Perdido | ✓ VERIFIED (regression check) | `lead-form-dialog.tsx` unchanged by 03-04: `STAGE_OPTIONS` (line 54), `form.watch("stage") === "perdido"` conditional block (line 289) with `Textarea` registered via `form.register("motivoPerda")` (line 296) all present. |
| 6 | Pipeline card shows only name/sub-nicho/follow-up (no stage badge, no value); empty column shows muted text, no button | ✓ VERIFIED (regression check) | `pipeline-lead-card.tsx` and `pipeline-column.tsx` unchanged by 03-04 diff; `min-w-[288px]`, `shrink-0`, `Nenhum lead nessa etapa`, `Clock` icon, amber border all confirmed present via grep. |
| 7 | Board scrolls horizontally without shrinking columns when 5 columns exceed viewport | ✓ VERIFIED (regression check) | `pipeline-column.tsx` line 29: `min-w-[288px] shrink-0`; board root retains `overflow-x-auto` (file untouched by 03-04). |
| 8 | Card move is optimistic (instant) and reverts automatically if the Server Action fails | ✓ VERIFIED (regression check) | `useOptimistic` reducer intact in `pipeline-board.tsx` (line 58); base `leads` prop still only refreshed via `revalidatePath` on success — untouched by the gap-closure diff, which only modified `lead-actions.ts`. |
| 9 | Clicking (not dragging) a card still opens the edit modal — drag doesn't swallow the click | ✓ VERIFIED (regression check) | `PointerSensor` with `activationConstraint: { distance: 8 }` (line 65) and `onClick` handler preserved in `pipeline-lead-card.tsx` (line 42) — both files untouched by 03-04. |

**Score:** 9/9 truths verified (both previously-reported gaps confirmed closed; no regressions found in the 7 previously-passing truths)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/actions/lead-actions.ts` | `createLead`/`updateLead`/`updateLeadStage` revalidate both `/` and `/pipeline`; `updateLead` gates `stageChangedAt` via SELECT-then-compare | ✓ VERIFIED | Read in full. All 3 actions revalidate both paths (lines 62-63, 117-118, 160-161). `updateLead` SELECT-then-compare at lines 91-108, identical pattern to `updateLeadStage` (lines 139-158). Soft-delete guard (`isNull(leads.deletedAt)`) preserved in both the new SELECT and the existing UPDATE/WHERE clauses. FK backstop (`isForeignKeyViolation`) untouched. |
| `src/db/schema.ts`, `src/lib/validations.ts`, `src/components/etapa-badge.tsx` | 5-value stage enum, `motivoPerda`/`stageChangedAt` columns, `stageUpdateSchema` | ✓ VERIFIED (regression check) | Unchanged by 03-04 diff (`git diff --name-only` between pre/post gap-closure commits shows only `lead-actions.ts` touched). |
| `src/app/pipeline/page.tsx`, `pipeline-board.tsx`, `pipeline-column.tsx`, `pipeline-lead-card.tsx`, `motivo-perda-dialog.tsx`, `app-sidebar.tsx` | Full read-only + drag-and-drop board | ✓ VERIFIED (regression check) | All files present, unmodified by 03-04, wiring confirmed via grep (DndContext/useOptimistic/useDroppable/useDraggable/Clock/onClick all present). |
| `./data/crm.db` | Migrated with 5-stage backfill, `stage_changed_at` populated | ✓ VERIFIED | Direct query: columns exist, 0 null `stage_changed_at`, 0 `fechado_perdido` rows. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `createLead`/`updateLead`/`updateLeadStage` | `/` cache | `revalidatePath("/")` | ✓ WIRED | Confirmed in all 3 actions (previously only 2 of 3). |
| `createLead`/`updateLead`/`updateLeadStage` | `/pipeline` cache | `revalidatePath("/pipeline")` | ✓ WIRED | Confirmed in all 3 actions (previously only 1 of 3 — this closes gap #1). |
| `updateLead` | `leads.stageChangedAt` | SELECT-then-compare conditional bump | ✓ WIRED | Confirmed — mirrors `updateLeadStage`'s pre-existing correct pattern exactly (this closes gap #2). |
| `pipeline-board.tsx` | `lead-actions.ts` (`updateLeadStage`) | `onDragEnd → startTransition → await updateLeadStage` | ✓ WIRED | Regression check — unchanged. |
| `pipeline-lead-card.tsx` | `@dnd-kit/core` `useDraggable` | listeners/attributes + `activationConstraint` | ✓ WIRED | Regression check — unchanged. |
| `pipeline-column.tsx` | `@dnd-kit/core` `useDroppable` | `setNodeRef` with `id = stage` | ✓ WIRED | Regression check — unchanged. |
| `src/app/pipeline/page.tsx` | esfriando computation | `differenceInDays >= 5` guarded by `stageChangedAt != null` | ✓ WIRED | Regression check — unchanged; now correctly fed by both write paths (drag-and-drop and form-edit). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `pipeline-board.tsx` (columns/cards) | `optimisticLeads` / `esfriandoSet` | `page.tsx` → `db.select().from(leads).where(isNull(deletedAt))` + `differenceInDays` | Yes — real DB query | ✓ FLOWING |
| `pipeline-column.tsx` header count | `count` | Derived from grouped `optimisticLeads` by stage | Yes | ✓ FLOWING |
| `updateLead` write path | `stageChangedAt` | Now correctly conditionally written from SELECT-then-compare, feeding the same `stageChangedAt` column `page.tsx` reads | Yes — verified end-to-end: form-dropdown stage change → `updateLead` bump → `page.tsx` read → esfriando flag | ✓ FLOWING (previously ✗ DISCONNECTED — this was gap #2) |

### Independent Build/Type Verification

| Check | Command | Result |
|-------|---------|--------|
| Type check | `npx tsc --noEmit` | ✓ PASS — clean, no errors (verified independently in this session, not taken from SUMMARY claim) |
| Production build | `npm run build` | ✓ PASS — compiled successfully, `/pipeline` route present in output (verified independently in this session) |
| Gap-closure diff scope | `git diff --name-only e8158e4~1 3836578` | ✓ Only `src/actions/lead-actions.ts` changed — confirms surgical, no-regression-risk scope as claimed |
| Grep acceptance criteria (03-04-PLAN.md) | `revalidatePath("/pipeline")` count, `revalidatePath("/")` count, `stageChangedAt: new Date()` count, `select({ stage: leads.stage })` count | ✓ 3, 3, 2, 2 respectively — matches plan's exact acceptance thresholds |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| PIPE-01 | 03-01, 03-02, 03-04 | Board com 5 etapas fixas + contagem por etapa | ✓ SATISFIED | Board renders correctly; cache invalidation gap closed — count is live regardless of trigger page. |
| PIPE-02 | 03-03 | Drag-and-drop entre etapas | ✓ SATISFIED | Verified via code (DndContext/useDraggable/useDroppable/useOptimistic/updateLeadStage), unchanged since previous verification. |
| PIPE-03 | 03-02, 03-04 | Flag "esfriando" para leads parados | ✓ SATISFIED | `stageChangedAt` now correctly maintained by both the drag path and the form-edit path — gap closed. |

No orphaned requirements: REQUIREMENTS.md traces PIPE-01/02/03 to Phase 3 only, and all three are declared across the phase's plans (03-01, 03-02, 03-03, 03-04).

**Note — REQUIREMENTS.md bookkeeping inconsistency (not a code gap):** `.planning/REQUIREMENTS.md` still shows `PIPE-02` as `[ ]` (unchecked) and "Pending" in the traceability table, even though PIPE-02 (drag-and-drop) was completed and verified working in 03-03 and remains so in this re-verification. Commit `b582134` ("mark PIPE-01/PIPE-03 requirements complete") updated PIPE-01/03 checkboxes but appears to have missed PIPE-02, which should have already been checked off after 03-03. This is a documentation/tracking gap, not a functional defect — the code fully satisfies PIPE-02. Recommend updating REQUIREMENTS.md's PIPE-02 row to `[x]`/"Complete" as a trivial doc fix; not blocking phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/actions/lead-actions.ts` | 91-108, 139-158 | SELECT-then-UPDATE race window (TOCTOU), not wrapped in a transaction; UPDATE result not checked for `changes === 0` | ℹ️ Info (per 03-REVIEW-GAPS.md, 2 advisory warnings, non-blocking) | Theoretical race for a solo-admin, single-concurrent-user local tool — accepted as non-blocking per code review (`03-REVIEW-GAPS.md`, 0 critical/blocker findings). Confirmed independently: no `db.transaction` wrapping, no `.changes` check, in both `updateLead` and `updateLeadStage`. |
| `.planning/REQUIREMENTS.md` | 27, 91 | PIPE-02 checkbox/table not updated to complete despite functional completion in 03-03 | ℹ️ Info | Documentation-only inconsistency, does not affect code/goal achievement — see Requirements Coverage note above. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in `src/actions/lead-actions.ts` (re-checked directly).

### Human Verification Required

None required to reach `passed` status — all must-haves are independently verifiable via direct code read, grep, `tsc`/`build`, and direct SQLite query in this session. The following remain **recommended** (not blocking, carried forward from the prior verification and 03-04-SUMMARY.md as good practice before considering the phase visually polished), consistent with the phase's `human_verify_mode=end-of-phase` deferred checks:

### 1. Board-originated create/edit live-update walkthrough

**Test:** On `/pipeline`, click "Novo lead" and save — confirm the card appears and the column count increments without a page reload. Click a card, change its stage via the dropdown, save — confirm the card moves column and counts update without reload. Edit a lead on `/` then navigate to `/pipeline` (and vice versa) — confirm the other page shows the updated state.
**Expected:** All three interactions reflect immediately, matching the "live count" promise.
**Why human:** Real Next.js cache-revalidation behavior across client navigation and a live browser session cannot be fully confirmed by static code analysis — the code-level wiring (`revalidatePath` calls present on both paths) has been independently verified as correct, but the end-user-visible timing/behavior benefits from a live check.

### 2. Esfriando-after-form-edit walkthrough

**Test:** Move a lead into "Contatado" via the edit-modal dropdown (not drag-and-drop). Using Drizzle Studio, set that lead's `stage_changed_at` to 6+ days in the past. Reload `/pipeline` and confirm the amber border + "Esfriando" label appears.
**Expected:** The lead is flagged, proving the gap-2 fix works end-to-end in a live browser/DB session.
**Why human:** Requires a live DB mutation + browser render cycle; the code-level logic (SELECT-then-compare bump, `page.tsx`'s null-guarded `differenceInDays` filter) has been independently verified by direct code read in this session.

### Gaps Summary

Both previously-reported BLOCKER gaps are closed, confirmed by independent code inspection (not by trusting SUMMARY.md or 03-REVIEW-GAPS.md claims):

1. **Cache invalidation (gap #1, PIPE-01)** — `createLead`, `updateLead`, and `updateLeadStage` now each call both `revalidatePath("/")` and `revalidatePath("/pipeline")`. Verified by reading `src/actions/lead-actions.ts` directly (lines 62-63, 117-118, 160-161) and by grep count (3/3 for each path).

2. **stageChangedAt on form-edit path (gap #2, PIPE-03)** — `updateLead` now performs the same SELECT-then-compare pattern as `updateLeadStage` before its write, conditionally bumping `stageChangedAt` only on a real stage transition. Verified by reading the code directly (lines 91-108) and confirming it mirrors the pre-existing correct `updateLeadStage` logic exactly (lines 139-158).

No regressions found in the 7 previously-passing truths — the gap-closure diff is confirmed (via `git diff --name-only` between the pre-fix and post-fix commits) to have touched only `src/actions/lead-actions.ts`, leaving all pipeline UI components, schema, migrations, and the read-side esfriando computation untouched.

`npx tsc --noEmit` and `npm run build` both pass cleanly, independently re-run in this verification session (not taken on faith from SUMMARY.md).

One non-blocking documentation inconsistency noted (REQUIREMENTS.md PIPE-02 checkbox stale) — does not affect phase goal achievement, recommend a trivial doc fix.

Phase goal **"Admin sees and manages the sales funnel at a glance, moving leads through stages as deals progress, without deals silently going cold"** is achieved: the board is visible and live from any mutation path (PIPE-01), leads move between stages via drag-and-drop with persistence (PIPE-02), and the esfriando clock is now accurate regardless of which UI path changed the stage (PIPE-03) — closing the exact "silently going cold" failure mode the phase goal names.

---

_Verified: 2026-07-21_
_Verifier: Claude (gsd-verifier)_
