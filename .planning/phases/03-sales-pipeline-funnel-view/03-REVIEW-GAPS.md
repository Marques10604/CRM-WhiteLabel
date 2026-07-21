---
phase: 03-sales-pipeline-funnel-view
reviewed: 2026-07-21T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - src/actions/lead-actions.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 03-sales-pipeline-funnel-view: Code Review Report

**Reviewed:** 2026-07-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `src/actions/lead-actions.ts` after the 03-04 gap-closure patch, which added (1) a `revalidatePath("/pipeline")` + `revalidatePath("/")` pair to `createLead`/`updateLead`/`updateLeadStage`, and (2) a SELECT-then-compare in `updateLead` (mirroring `updateLeadStage`) so `stageChangedAt` is only bumped on a real stage transition.

The two targeted changes are implemented correctly in isolation: the new SELECT in `updateLead` correctly reuses `and(eq(leads.id, id), isNull(leads.deletedAt))`, so the soft-delete guard is preserved and a soft-deleted lead still resolves to "Lead inválido." on edit, matching the pre-existing `updateLeadStage` behavior. The `revalidatePath` calls are present on both success return paths, and correctly absent from every early-return error path (validation failure, missing sub-nicho, FK-violation catch, "Lead inválido.") — no premature cache invalidation on failure.

However, the underlying SELECT-then-UPDATE pattern that now exists in *two* places (`updateLead` and `updateLeadStage`) is not transactional, which opens a real (if narrow) race window between the existence/stage read and the guarded write. There's also no check that the UPDATE actually affected a row, so the race can produce a silent no-op that is still reported to the caller as success. Neither of these is new to this specific diff (the pattern already existed in `updateLeadStage`), but the diff doubles the number of call sites exposed to it, so it's flagged here.

## Warnings

### WR-01: SELECT-then-UPDATE race window (TOCTOU) shared by `updateLead` and `updateLeadStage`

**File:** `src/actions/lead-actions.ts:91-108` (also `139-158`)
**Issue:** Both `updateLead` and `updateLeadStage` read `current.stage` in one `await db.select(...)`, then decide `stageChanged` from that snapshot, then perform a separate `await db.update(...)` later. Between the two awaits, Node's event loop can interleave another concurrent Server Action invocation for the *same lead id* (e.g., a drag-and-drop `updateLeadStage` call from the pipeline board racing with an `updateLead` form submit from a stale edit dialog open in another tab). Whichever write lands second wins and can silently clobber the other's stage/soft-delete state, and the `stageChanged` flag for the losing write is computed against already-superseded data — so `stageChangedAt` can be left stale (not bumped) or bumped incorrectly depending on interleaving order. This is a genuine correctness gap, not merely a performance concern, because it can produce a wrong "cooling" timestamp used for pipeline staleness highlighting (`app/pipeline/page.tsx`).
**Fix:** Wrap the read + write in a single `db.transaction(...)` (drizzle-orm/better-sqlite3 supports synchronous transactions) so the compare-and-swap is atomic:
```ts
const result = db.transaction((tx) => {
  const [current] = tx
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .all();
  if (!current) return null;

  const stageChanged = current.stage !== parsed.data.stage;
  return tx
    .update(leads)
    .set({ ...parsed.data, ...(stageChanged ? { stageChangedAt: new Date() } : {}) })
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
    .run();
});
if (!result) return { errors: { id: ["Lead inválido."] } };
```

### WR-02: UPDATE result is never checked — a raced-out no-op is reported as success

**File:** `src/actions/lead-actions.ts:101-115` (also `149-158`)
**Issue:** After the existence check, both functions run `db.update(leads).set(...).where(and(eq(leads.id, id), isNull(leads.deletedAt)))` and then unconditionally `return { success: true }`. If the lead is soft-deleted (or otherwise loses the `isNull(deletedAt)` match) in the window between the SELECT and the UPDATE, the UPDATE matches zero rows — but nothing checks the result, so the caller/UI still shows "Lead salvo com sucesso." even though no row was actually changed. This turns the WR-01 race into a silent data-loss-from-the-user's-perspective bug: the admin believes the edit/stage-move was saved when it was not.
**Fix:** Capture the `RunResult` from the better-sqlite3 driver and verify it actually touched a row before returning success:
```ts
const result = await db
  .update(leads)
  .set({ ...parsed.data, ...(stageChanged ? { stageChangedAt: new Date() } : {}) })
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
if (result.changes === 0) {
  return { errors: { id: ["Lead inválido."] } };
}
```
(Best combined with WR-01's transaction so the check and the write are atomic together.)

## Info

### IN-01: Duplicated SELECT-then-compare stage logic between `updateLead` and `updateLeadStage`

**File:** `src/actions/lead-actions.ts:91-99` and `139-147`
**Issue:** The two functions now contain near-identical blocks (`select stage where id+isNull(deletedAt)` → `current` guard → `stageChanged` boolean). Duplicating this logic means any future fix to the guard (e.g., the WR-01/WR-02 fixes above) has to be applied twice and can drift out of sync.
**Fix:** Extract a small shared helper, e.g. `getLeadStageForUpdate(id): Promise<{ stage: Lead["stage"] } | undefined>`, and reuse it from both `updateLead` and `updateLeadStage`.

### IN-02: `updatedAt` is never bumped on any write path in this file (pre-existing, not part of the 03-04 diff)

**File:** `src/actions/lead-actions.ts:51, 102-107, 149-157`; column defined at `src/db/schema.ts:35`
**Issue:** `leads.updatedAt` has an insert-time default (`unixepoch()`) but none of `createLead`'s insert, `updateLead`'s `.set()`, or `updateLeadStage`'s `.set()` ever assigns it, so the column silently freezes at creation time forever. It isn't read anywhere else in the app today (no sort/filter depends on it), so it's currently harmless, but it's a latent trap if a future feature (e.g., "recently edited leads") starts relying on it.
**Fix:** Either drop the column if it will never be needed, or add `updatedAt: new Date()` to every `.set()` call (or switch to Drizzle's `.$onUpdateFn(() => new Date())` on the column definition so callers don't have to remember it).

---

_Reviewed: 2026-07-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
