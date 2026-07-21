---
phase: 03-sales-pipeline-funnel-view
verified: 2026-07-21T00:00:00Z
status: gaps_found
score: 7/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Admin sees a board with 5 fixed stages (Novo, Contatado, Negociação, Fechado, Perdido) and a live count of leads in each"
    status: partial
    reason: "Board renders correctly on initial load and reflects drag-and-drop moves (updateLeadStage revalidates /pipeline). But createLead/updateLead (used by the pipeline page's own 'Novo lead' button and card-click-to-edit, via the shared LeadFormDialog) only revalidatePath('/'), never '/pipeline'. Creating or editing a lead from the pipeline board itself leaves the board's counts and card list stale until a manual reload or navigation away/back — the count is not actually 'live' for those two interactions."
    artifacts:
      - path: "src/actions/lead-actions.ts"
        issue: "createLead (line 62) and updateLead (line 99) call revalidatePath(\"/\") only; updateLeadStage (line 141) calls revalidatePath(\"/pipeline\") only. No action revalidates both paths that consume it."
    missing:
      - "createLead and updateLead should also revalidatePath(\"/pipeline\"), and updateLeadStage should also revalidatePath(\"/\"), so both pages stay live regardless of which page triggered the mutation."
  - truth: "Leads stuck in 'Contatado' without recent activity (5+ days since last stage change) are visually flagged as 'esfriando,' so they don't silently go cold"
    status: failed
    reason: "stageChangedAt (the clock driving the esfriando flag) is only ever written by updateLeadStage (the drag-and-drop path). The edit-lead modal's stage <Select> (submitted through updateLead) never touches stageChangedAt: parsed.data comes from leadSchema, which has no stageChangedAt field, so db.update(leads).set(parsed.data) silently leaves the column at its previous value. Any lead whose stage was set to 'contatado' via the form dropdown (a fully supported, prominent UI path — the same LeadFormDialog is reused on both / and /pipeline) will have stageChangedAt stuck (frequently null) forever. PipelinePage explicitly excludes stageChangedAt == null leads from the esfriando calculation (src/app/pipeline/page.tsx:29), so that lead can sit in Contatado indefinitely without ever being flagged — exactly the failure mode ('deals silently going cold') this success criterion exists to prevent. Verified independently by reading the code (not just trusting 03-REVIEW.md's characterization): confirmed leadSchema has no stageChangedAt field, confirmed updateLead's .set(parsed.data) call has no conditional stageChangedAt bump, confirmed the page-level null-guard exists."
    artifacts:
      - path: "src/actions/lead-actions.ts"
        issue: "updateLead's db.update(leads).set(parsed.data) (line 89) never includes stageChangedAt, unlike updateLeadStage (lines 130-139) which conditionally bumps it only on a real stage change."
      - path: "src/lib/validations.ts"
        issue: "leadSchema (used by the edit form's stage dropdown) has no stageChangedAt field, and updateLead does no SELECT of the previous stage before writing, so there is no signal available to gate a stageChangedAt bump."
    missing:
      - "updateLead must SELECT the lead's current stage before updating (same pattern already used in updateLeadStage) and set stageChangedAt = now() whenever the submitted stage differs from the stored one, so the esfriando clock stays accurate no matter which UI path changed the stage."
---

# Phase 3: Sales Pipeline & Funnel View Verification Report

**Phase Goal:** Admin sees and manages the sales funnel at a glance, moving leads through stages as deals progress, without deals silently going cold
**Verified:** 2026-07-21
**Status:** gaps_found
**Re-verification:** No — initial verification

## Process Note: Roadmap "Mode: mvp" / Goal Format Mismatch

Phase 3 (and Phases 1, 2, 4) are marked `**Mode:** mvp` in ROADMAP.md, but the phase goal ("Admin sees and manages the sales funnel at a glance...") is not in the `As a [role], I want to [capability], so that [outcome].` format required for the MVP-mode User-Flow-Coverage framing (`gsd-sdk query user-story.validate` returns `valid: false` for this goal text). This is a project-wide/systemic metadata gap, not something introduced by this phase's execution, and it affects Phases 1/2/4 equally. Per `references/verify-mvp-mode.md`, the correct action is to surface this discrepancy and recommend running `/gsd mvp-phase 3` (and the other phases) to reformat the goal — but since the orchestrating agent explicitly supplied a concrete, well-formed goal + 3 ROADMAP Success Criteria for this run, standard (non-MVP-narrowed) goal-backward verification was performed against those, as documented below. This mismatch is **not** counted as a phase-3 gap; it is flagged here for awareness only.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Board shows 5 fixed stages (Novo/Contatado/Negociação/Fechado/Perdido) with a live count per column (PIPE-01) | ⚠️ PARTIAL (gap) | `src/app/pipeline/page.tsx` + `pipeline-board.tsx`/`pipeline-column.tsx` render 5 columns from `STAGE_OPTIONS` with `{label} · {count}`. Counts are correct on load and after drag-and-drop (`updateLeadStage` → `revalidatePath("/pipeline")`), but stale after create/edit from the board's own controls (`createLead`/`updateLead` → `revalidatePath("/")` only). See gap #1. |
| 2 | Admin can drag-and-drop a lead card between stages; dropping on Perdido optionally captures `motivoPerda` without blocking the move (PIPE-02) | ✓ VERIFIED | `pipeline-board.tsx`: `DndContext` + `PointerSensor(activationConstraint: {distance: 8})` + `useOptimistic` + `startTransition` calling `updateLeadStage`; `motivo-perda-dialog.tsx` opens only when `newStage === "perdido"`, "Pular" resolves with `undefined` (no block), "Salvar motivo" resolves with the text — card already moved optimistically before the modal opens. `updateLeadStage` (`lead-actions.ts:110-143`) validates via `stageUpdateSchema`, guards soft-delete, revalidates `/pipeline`. |
| 3 | Leads stuck 5+ days in Contatado are flagged "esfriando" so they don't silently go cold (PIPE-03) | ✗ FAILED (gap) | `page.tsx` correctly computes `esfriandoLeadIds` via `differenceInDays(...) >= 5` guarded by `stageChangedAt != null` — this part works for leads whose stage was changed via drag-and-drop. But `updateLead` (the edit-modal stage dropdown, same modal reused everywhere including on `/pipeline`) never sets `stageChangedAt` at all. Independently confirmed: `leadSchema` (validations.ts:9-41) has no `stageChangedAt` field; `updateLead` (`lead-actions.ts:66-101`) does `.set(parsed.data)` with no SELECT-then-compare gating, unlike `updateLeadStage`. See gap #2. |
| 4 | Existing `fechado_perdido` leads backfilled to `fechado`; all leads have `stage_changed_at` populated | ✓ VERIFIED | Direct DB query against `./data/crm.db`: `PRAGMA table_info(leads)` confirms `motivo_perda`/`stage_changed_at` columns exist; `SELECT count(*) WHERE stage_changed_at IS NULL` = 0; `SELECT count(*) WHERE stage = 'fechado_perdido'` = 0; stage counts = `{fechado: 2}` (both pre-existing leads migrated). |
| 5 | Edit-lead modal offers all 5 stage options + conditional "Motivo da perda" field when stage = Perdido | ✓ VERIFIED | `lead-form-dialog.tsx:54-60` (`STAGE_OPTIONS` 5 values), `:289-304` (`form.watch("stage") === "perdido"` conditional Field for `motivoPerda`, registered via `form.register("motivoPerda")`). |
| 6 | Pipeline card shows only name/sub-nicho/follow-up (no stage badge, no value); empty column shows muted text, no button | ✓ VERIFIED | `pipeline-lead-card.tsx` renders `lead.nome`, `subnichoNome`, `format(lead.followUpDate, ...)` only — no `EtapaBadge`, no `valorEstimado`. `pipeline-column.tsx:40-46` renders `"Nenhum lead nessa etapa"` with no `<Button>` when `hasCards` is false. |
| 7 | Board scrolls horizontally without shrinking columns when 5 columns exceed viewport | ✓ VERIFIED | `pipeline-board.tsx:136` (`overflow-x-auto` on root flex row); `pipeline-column.tsx:29` (`min-w-[288px] shrink-0`). |
| 8 | Card move is optimistic (instant) and reverts automatically if the Server Action fails | ✓ VERIFIED (code-level) | `useOptimistic` reducer in `pipeline-board.tsx:58-62`; base `leads` prop is only refreshed via `revalidatePath` on success, so a failed `updateLeadStage` leaves the base state untouched and React reverts the optimistic copy when the transition settles (standard React 19 `useOptimistic` semantics). Recommend a live browser test (drag + simulated failure) before considering fully proven — see Human Verification section. |
| 9 | Clicking (not dragging) a card still opens the edit modal — drag doesn't swallow the click | ✓ VERIFIED | `PointerSensor` configured with `activationConstraint: { distance: 8 }` (`pipeline-board.tsx:64-66`); `onClick` handler preserved and untouched in `pipeline-lead-card.tsx:42` alongside `useDraggable` listeners/attributes. |

**Score:** 7/9 truths verified (2 gaps — see below)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | 5-value `stage` enum + `motivoPerda`/`stageChangedAt` nullable columns | ✓ VERIFIED | Enum widened to `["novo","contatado","negociacao","fechado","perdido"]`; both new columns nullable, no `.default()` on either. |
| `src/lib/validations.ts` | `leadSchema` 5-value enum + `motivoPerda`; `stageUpdateSchema` exported | ✓ VERIFIED | Both present exactly as specified. |
| `src/components/etapa-badge.tsx` | `STAGE_CONFIG` with `fechado`/`perdido` entries | ✓ VERIFIED | Green (`#DCFCE7`/`#15803D`) and red (`#FEE2E2`/`#B91C1C`) entries present. |
| `src/db/migrations/` | ADD COLUMN migration + custom backfill migration | ✓ VERIFIED | `0001_grey_xavin.sql`, `0002_backfill-fechado-perdido-split.sql` present; applied to `./data/crm.db` (confirmed via direct query, not just script claim). |
| `src/app/pipeline/page.tsx` | Server Component: fetch + esfriando computation | ✓ VERIFIED | `isNull(leads.deletedAt)`, `differenceInDays` + null guard present; no stage/subnicho filter (unfiltered board, D-12). |
| `src/components/pipeline-board.tsx` | Client Component: 5 columns + dialog orchestration + DnD | ✓ VERIFIED (182 lines) | `DndContext`, `useOptimistic`, `startTransition`, dialog-state pattern, `MotivoPerdaDialog` wiring all present. |
| `src/components/pipeline-column.tsx` | Column: header + empty state + `useDroppable` | ✓ VERIFIED (50 lines) | `min-w-[288px]`, `shrink-0`, empty-state text, `useDroppable({id: stage})`. |
| `src/components/pipeline-lead-card.tsx` | Card: name/sub-nicho/follow-up + esfriando + `useDraggable` | ✓ VERIFIED (74 lines) | `Clock` icon, amber border, `useDraggable({id: lead.id})`, `onClick` preserved. |
| `src/components/app-sidebar.tsx` | Nav item "Pipeline" → `/pipeline` | ✓ VERIFIED | `{ href: "/pipeline", label: "Pipeline" }` present in `NAV_ITEMS`. |
| `src/actions/lead-actions.ts` | `updateLeadStage` Server Action | ✓ VERIFIED (structurally) — ⚠️ see gaps | Validates via `stageUpdateSchema`, guards soft-delete, conditional `stageChangedAt` bump — correct in isolation, but the sibling `updateLead` action does not mirror this logic (gap #2), and cross-path cache revalidation is incomplete (gap #1). |
| `src/components/motivo-perda-dialog.tsx` | Optional non-blocking motivoPerda modal | ✓ VERIFIED (79 lines) | "Mover para Perdido" title, "Pular"/"Salvar motivo" buttons present and wired. |
| `package.json` | `@dnd-kit/core`/`@dnd-kit/sortable` deps | ✓ VERIFIED | `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0` present in `dependencies`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/db/migrations` (custom 0002) | `leads.stage` | `UPDATE fechado_perdido -> fechado` | ✓ WIRED | Confirmed applied against real `./data/crm.db` (0 rows remain `fechado_perdido`). |
| `lead-form-dialog.tsx` | `motivoPerda` field render | `form.watch("stage") === "perdido"` | ✓ WIRED | Conditional block present at line 289. |
| `src/app/pipeline/page.tsx` | `pipeline-board.tsx` | props `leads`/`subnichos`/`esfriandoLeadIds` | ✓ WIRED | Confirmed prop names match exactly. |
| `pipeline-lead-card.tsx` | `LeadFormDialog` (via `pipeline-board.tsx`) | `onClick` → `setDialogState({mode:"edit"})` | ✓ WIRED | Confirmed. |
| `app-sidebar.tsx` | `/pipeline` | `NAV_ITEMS` entry | ✓ WIRED | Confirmed, generic render logic unchanged. |
| `pipeline-board.tsx` | `lead-actions.ts` (`updateLeadStage`) | `onDragEnd → startTransition → await updateLeadStage` | ✓ WIRED | Confirmed at `pipeline-board.tsx:95-115`. |
| `pipeline-lead-card.tsx` | `@dnd-kit/core` `useDraggable` | listeners/attributes + `activationConstraint` | ✓ WIRED | Confirmed. |
| `pipeline-column.tsx` | `@dnd-kit/core` `useDroppable` | `setNodeRef` with `id = stage` | ✓ WIRED | Confirmed. |
| `updateLeadStage` | `leads.stageChangedAt` | conditional bump on real stage change | ✓ WIRED (for this action only) | Correct in `updateLeadStage`; **not mirrored in `updateLead`** — see gap #2, this is the root cause of the PIPE-03 failure. |
| `createLead`/`updateLead` | `/pipeline` cache | `revalidatePath` | ✗ NOT WIRED | Neither action revalidates `/pipeline`; only `/`. Root cause of gap #1. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `pipeline-board.tsx` (columns/cards) | `optimisticLeads` / `esfriandoSet` | `page.tsx` → `db.select().from(leads).where(isNull(deletedAt))` + `differenceInDays` computation | Yes — real DB query, not static/empty | ✓ FLOWING |
| `pipeline-column.tsx` header count | `count` prop | Derived from grouped `optimisticLeads` by stage | Yes | ✓ FLOWING |

The data-flow pipeline itself is sound (no hollow props, no static stubs); the defect is in the **upstream write path** (`updateLead` never populates the field that downstream code correctly reads), which is why it surfaces as a truth-level gap rather than a Level-4 data-flow issue.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| PIPE-01 | 03-01, 03-02 | Board com 5 etapas fixas + contagem por etapa | ⚠️ PARTIAL | Board and counts render correctly; count is not reliably "live" for board-originated create/edit actions (gap #1). |
| PIPE-02 | 03-03 | Drag-and-drop entre etapas | ✓ SATISFIED | Verified via code (DndContext/useDraggable/useDroppable/useOptimistic/updateLeadStage), see Truth #2. |
| PIPE-03 | 03-02 | Flag "esfriando" para leads parados | ✗ BLOCKED | Clock (`stageChangedAt`) is only reliably maintained by the drag path; the equally-valid form-edit path breaks the guarantee (gap #2). |

No orphaned requirements: REQUIREMENTS.md traces PIPE-01/02/03 to Phase 3 only, and all three are declared across the phase's three plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/actions/lead-actions.ts` | 62, 99, 141 | Cache-invalidation gap: `createLead`/`updateLead` revalidate `/` only, `updateLeadStage` revalidates `/pipeline` only | 🛑 Blocker (gap #1) | Stale board/list depending on which page triggered the mutation |
| `src/actions/lead-actions.ts` | 66-101 | `updateLead` never sets `stageChangedAt` on stage change | 🛑 Blocker (gap #2) | Breaks PIPE-03 "esfriando" guarantee for form-changed leads |
| `src/db/migrations/0002_backfill-fechado-perdido-split.sql` | 1 | Backfill unconditionally maps all historical `fechado_perdido` → `fechado` (won), permanently losing which of those were actually lost deals, with no audit trail | ⚠️ Warning | Corrupts historical won/lost reporting for pre-migration leads (currently 2 rows in this dataset) |
| `src/components/pipeline-board.tsx` | 88-116 | `handleDragEnd` doesn't short-circuit when `newStage === lead.stage` (drop back in same column) | ⚠️ Warning | Unnecessary write + misleading success toast when nothing moved |
| `src/actions/lead-actions.ts` | 130-139 | `motivoPerda` never cleared when a lead moves out of "Perdido" | ⚠️ Warning | Stale loss-reason text can resurface if the lead is later moved back to "Perdido" |
| `src/actions/lead-actions.ts` | 110-143 | `updateLeadStage` has no try/catch around the DB write (unlike `createLead`/`updateLead`) | ⚠️ Warning | An unexpected DB error surfaces as an unhandled rejection instead of the intended `{errors}` → toast path |
| `src/components/pipeline-board.tsx` | 56, 102-122 | Single shared `motivoResolverRef` has no re-entrancy guard | ℹ️ Info | Latent bug if two "drop on Perdido" transitions could overlap; currently mitigated by the modal blocking background interaction |
| `package.json` | 14 | `@dnd-kit/sortable` installed but unused (no `SortableContext` anywhere) | ℹ️ Info | Dead dependency |
| `src/components/pipeline-board.tsx` | 64-66 | Drag-and-drop is mouse/touch-only, no `KeyboardSensor` | ℹ️ Info | Acceptable given single-admin, mouse-driven usage (documented in review as accepted limitation) |
| `scripts/verify-pipeline-migration.cjs` | 10-20 | `fail()` calls `process.exit(1)` without an explicit `return`/`throw` after | ℹ️ Info | Relies on exit timing rather than explicit control flow; script-only, not shipped code |

No unresolved `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any file modified by this phase (grep across `src/` — all matches were legitimate input `placeholder=` attributes or unrelated comments).

### Human Verification Required

### 1. Visual/interactive board walkthrough

**Test:** Open `/pipeline` via the sidebar; confirm 5 columns in order Novo→Perdido with correct counts; confirm cards show name/sub-nicho/date; confirm a lead 5+ days in Contatado shows the amber border + "Esfriando" label; click a card (without dragging) to confirm the edit modal opens pre-filled; confirm an empty column shows "Nenhum lead nessa etapa" with no button; narrow the window to confirm horizontal scroll without column shrinkage.
**Expected:** All of the above render/behave as described.
**Why human:** Visual styling, real browser rendering, and viewport-resize behavior can't be confirmed by static code analysis alone. (Deferred from 03-02-PLAN.md Task 1/Task 2 `<human-check>` blocks — never executed by the headless executor per both 03-02-SUMMARY.md and this session.)

### 2. Drag-and-drop end-to-end walkthrough

**Test:** Drag a card between columns and confirm it persists after a page reload; drop a card on "Perdido" and confirm the "Mover para Perdido" modal opens — "Pular" keeps the move without saving a reason, "Salvar motivo" saves the typed reason; click (without dragging) a card to confirm edit-modal still opens; simulate a failure (e.g., stop the dev server mid-drag or throw inside `updateLeadStage`) and confirm the card visually reverts to its original column.
**Expected:** All behaviors match as described, including the optimistic-revert-on-failure case.
**Why human:** Real pointer drag gestures, network/process failure simulation, and visual revert timing require a live browser session. (Deferred from 03-03-PLAN.md Task 2 `<human-check>` block — never executed per 03-03-SUMMARY.md.)

### Gaps Summary

Two BLOCKER-level gaps were found, both are real, verified defects in `src/actions/lead-actions.ts` (not hypothetical, not merely "the review says so" — independently re-derived by reading `leadSchema`, `updateLead`, and `updateLeadStage` directly):

1. **Cache invalidation is one-directional per action** — `createLead`/`updateLead` only refresh `/`, `updateLeadStage` only refreshes `/pipeline`. Any lead created or edited *from the pipeline board itself* (the board reuses the same `LeadFormDialog`/`createLead`/`updateLead` as the leads list) will not show up or update on the board without a manual reload — directly undermining the "live count... at a glance" promise in Success Criterion 1.

2. **The "esfriando" clock is only maintained by one of two ways a lead's stage can change** — `updateLeadStage` (drag-and-drop) correctly bumps `stageChangedAt` on a real stage change, but `updateLead` (the edit-modal's stage dropdown) never touches it at all. Since both paths are fully supported, user-facing ways to move a lead into "Contatado," any lead whose stage was last changed via the form will never be flagged "esfriando" no matter how long it sits — directly contradicting Success Criterion 3's stated purpose ("so they don't silently go cold").

Both gaps are narrow, well-understood, single-file fixes (mirroring logic that already exists correctly in `updateLeadStage`), not structural rework. Recommend routing to `/gsd-plan-phase --gaps` for a focused closure plan before Phase 3 is considered fully done.

---

_Verified: 2026-07-21_
_Verifier: Claude (gsd-verifier)_
