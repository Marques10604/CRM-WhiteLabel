---
phase: 04-follow-up-dashboard-whatsapp-outreach
fixed_at: 2026-07-22T03:26:23Z
review_path: .planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-22T03:26:23Z
**Source review:** .planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 critical, 4 warning — `fix_scope: critical_warning`, Info findings IN-01..IN-04 excluded)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: "Próximos 7 dias" silently drops leads due exactly 7 days out

**Files modified:** `src/db/queries.ts`
**Commit:** cbf8546
**Applied fix:** Widened the exclusive upper bound in `groupLeadsByUrgency` from `addDays(today, 7)` to `addDays(today, 8)` so a lead due exactly `today + 7` now falls into "Próximos 7 dias" instead of vanishing from every bucket. Updated the function's doc comment to describe the corrected boundary.
**Verification note:** This is a logic/boundary-condition fix (off-by-one). Marked `fixed: requires human verification` — please spot-check the dashboard with a lead due exactly 7 days out to confirm it now appears under "Próximos 7 dias".

### CR-02: Concurrent "mover para Perdido" drags can permanently drop a stage update

**Files modified:** `src/components/pipeline-board.tsx`
**Commit:** 2d93719
**Applied fix:** Replaced the single shared `motivoResolverRef` with a `motivoQueueRef` queue of `{ leadId, leadNome, resolve }` entries. Each drag-to-"Perdido" now enqueues its own resolver instead of overwriting a shared ref; the `MotivoPerdaDialog` shows one lead at a time and `resolveMotivoPerda` advances to the next queued lead (if any) instead of just closing, so no in-flight `updateLeadStage` call can be stranded when multiple leads are dragged to "Perdido" in quick succession.
**Verification note:** Concurrency/state-handling fix. Marked `fixed: requires human verification` — please manually verify by dragging two leads to "Perdido" back-to-back before dismissing the first modal, confirming both stage changes persist after a page refresh.

### WR-01: `stageChangedAt` never set on lead creation

**Files modified:** `src/actions/lead-actions.ts`
**Commit:** 5e8871e
**Applied fix:** `createLead` now inserts `{ ...parsed.data, stageChangedAt: new Date() }` instead of `parsed.data` as-is, so every newly created lead (regardless of its initial stage) has a valid `stageChangedAt` and can be correctly flagged "esfriando" going forward.
**Verification note:** State-initialization fix affecting the "esfriando" invariant. Marked `fixed: requires human verification` — please confirm a lead created directly in "Contatado" now becomes eligible for the "esfriando" flag after the configured threshold.

### WR-02: `motivoPerda` never cleared when a lead leaves "Perdido"

**Files modified:** `src/actions/lead-actions.ts`
**Commit:** 24accae
**Applied fix:** Both `updateLead` and `updateLeadStage` now explicitly set `motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null` in their `.set()` calls, clearing the stored reason whenever the target stage isn't `"perdido"` (previously the field was only overwritten when a value was explicitly present/passed, so reactivating a lead left the old reason in the DB indefinitely).
**Verification note:** State-handling fix touching two call sites. Marked `fixed: requires human verification` — please confirm reactivating a previously-"Perdido" lead (via form edit and via pipeline drag) clears "Motivo da perda" in the DB.

### WR-03: Un-awaited `db.transaction()` in `applyDefaultTemplate`

**Files modified:** `src/actions/template-actions.ts`
**Commit:** 8fc30da
**Applied fix:** Made `applyDefaultTemplate` `async` and awaited its internal `db.transaction()` and both `tx.update()` calls; added `await` at all three call sites (`createTemplate`, `updateTemplate`, `setDefaultTemplate`). This makes the "one default template per type" invariant hold correctly under both the synchronous `better-sqlite3` driver and the async `drizzle-orm/libsql` (Turso) driver this project's own stack docs recommend.
**Verification note:** Mechanical async/await correctness fix, verified by full-project `tsc --noEmit` (0 errors). Marked `fixed` (standard).

### WR-04: `WhatsAppPreviewDialog` unmounts its own `<Dialog>` instead of animating closed

**Files modified:** `src/components/whatsapp-preview-dialog.tsx`
**Commit:** 9c14ea9
**Applied fix:** Removed the early `if (!lead) return null` that unmounted the whole Radix `<Dialog>` tree. `<Dialog open={open && !!lead}>` and `<DialogContent>` now always render; the lead-dependent body (header, fields, footer) is guarded by `{lead ? (...) : null}` inside `DialogContent`, and `tel`/`waHref` are computed defensively (`lead ? ... : undefined`). This matches the mount pattern used by every other dialog in the codebase (`LeadFormDialog`, `TemplateFormDialog`, `DeleteTemplateDialog`).
**Verification note:** Structural JSX rewrite verified by full-project `tsc --noEmit` (0 errors) and matches the reviewer's exact suggested pattern. Marked `fixed` (standard) — a quick visual smoke-test of opening/closing the WhatsApp preview from both the dashboard and pipeline board is still recommended.

## Skipped Issues

None — all 6 in-scope findings (critical + warning) were fixed.

---

_Fixed: 2026-07-22T03:26:23Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
