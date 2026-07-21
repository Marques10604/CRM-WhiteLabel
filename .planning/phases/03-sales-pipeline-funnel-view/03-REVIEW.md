---
phase: 03-sales-pipeline-funnel-view
reviewed: 2026-07-21T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/db/schema.ts
  - src/lib/validations.ts
  - src/components/etapa-badge.tsx
  - src/components/lead-form-dialog.tsx
  - src/db/migrations/0001_grey_xavin.sql
  - src/db/migrations/0002_backfill-fechado-perdido-split.sql
  - scripts/verify-pipeline-migration.cjs
  - src/app/pipeline/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/pipeline-board.tsx
  - src/components/pipeline-column.tsx
  - src/components/pipeline-lead-card.tsx
  - src/actions/lead-actions.ts
  - src/components/motivo-perda-dialog.tsx
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-07-21
**Depth:** standard
**Files Reviewed:** 14 (package.json inspected as dependency manifest, not counted as source logic)
**Status:** issues_found

## Summary

Reviewed the data-layer split of the combined `fechado_perdido` stage into distinct `fechado`/`perdido` stages, the new read-only-turned-drag-and-drop Kanban board at `/pipeline`, and the `updateLeadStage` Server Action. The ADD COLUMN migration (0001) correctly avoids a non-constant DEFAULT on a non-empty table, and `updateLeadStage` correctly guards both the SELECT and UPDATE with `isNull(leads.deletedAt)` and only bumps `stageChangedAt` when the stage actually changes — the three areas the task flagged as high-risk are handled correctly in isolation.

However, tracing the Server Actions across the two pages that both mutate `leads` (`/` and `/pipeline`) surfaces a real cache-invalidation gap: `createLead`/`updateLead` only revalidate `/`, while `updateLeadStage` only revalidates `/pipeline` — but the pipeline board itself uses `createLead`/`updateLead` (via the shared `LeadFormDialog`) for its own "Novo lead" button and edit-on-click flow. The board's own create/edit path does not refresh the board it runs on. Separately, the `stage_changed_at` "esfriando" clock is only ever written by `updateLeadStage` (drag-and-drop); the edit-form path (`updateLead`), which also lets the admin change `stage` via a dropdown, never touches `stageChangedAt`, silently breaking the cooling-off feature for any lead whose stage is only ever changed through the form. The 0002 backfill migration also makes an unrecoverable, undocumented data decision: every historical `fechado_perdido` lead is mapped to `fechado` (won), permanently mislabeling any lead that was actually lost — directly undermining the funnel-accuracy value proposition this CRM exists for.

## Critical Issues

### CR-01: Pipeline board's own create/edit actions don't revalidate `/pipeline`

**File:** `src/actions/lead-actions.ts:62`, `src/actions/lead-actions.ts:99`, `src/actions/lead-actions.ts:141`

**Issue:** `createLead` and `updateLead` call `revalidatePath("/")` only. `updateLeadStage` calls `revalidatePath("/pipeline")` only. But `PipelineBoard` (`src/components/pipeline-board.tsx:129-133,161-169`) reuses `LeadFormDialog` — which calls `createLead`/`updateLead` — for its own "Novo lead" button and for editing a lead via card click. This means creating a lead or editing a lead's fields (including changing `stage` via the form's dropdown) **from the pipeline page itself** never revalidates `/pipeline`. The new lead or the edited stage will not appear on the board until the admin manually reloads the page, even though a toast reports success. Conversely, dragging a card on the board (`updateLeadStage`) never revalidates `/`, so the leads list can show a stale stage after a drag until the admin navigates away and back or reloads.

**Fix:** Revalidate both paths from every mutation that can be triggered from either page:
```ts
// createLead / updateLead
revalidatePath("/");
revalidatePath("/pipeline");

// updateLeadStage
revalidatePath("/pipeline");
revalidatePath("/");
```

### CR-02: `updateLead` (edit form) never sets `stageChangedAt`, silently breaking the "esfriando" feature

**File:** `src/actions/lead-actions.ts:66-101` (compare to `updateLeadStage`, lines 110-143)

**Issue:** The edit-lead dialog (`lead-form-dialog.tsx:258-287`) lets the admin change a lead's `stage` via a `<Select>`, and this is submitted through `updateLead`, which does `db.update(leads).set(parsed.data)` — `parsed.data` comes from `leadSchema`, which has no `stageChangedAt` field. Only `updateLeadStage` (the drag-and-drop path) ever writes `stageChangedAt`. Concretely:
- A lead created directly with `stage: "contatado"`, or moved into `contatado` via the **edit form** rather than a drag, will have `stageChangedAt = null` forever (unless later dragged at least once on the board).
- `PipelinePage` explicitly excludes leads with `stageChangedAt == null` from the "esfriando" (cooling-off) calculation (`src/app/pipeline/page.tsx:26-31`), so such a lead can sit in `contatado` indefinitely — weeks or months — and will *never* be flagged as cooling off, defeating D-06/D-07, one of this phase's headline features.
- This also means the "esfriando" clock is inconsistent depending on which UI path the admin used to change stage, which is a correctness/data-integrity bug, not just a cosmetic gap.

**Fix:** Detect a stage change inside `updateLead` the same way `updateLeadStage` does, and set `stageChangedAt` accordingly:
```ts
const [current] = await db
  .select({ stage: leads.stage })
  .from(leads)
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)));

const stageChanged = current && current.stage !== parsed.data.stage;

await db
  .update(leads)
  .set({
    ...parsed.data,
    ...(stageChanged ? { stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
```

### CR-03: Backfill migration silently reclassifies all historical "lost" leads as "won"

**File:** `src/db/migrations/0002_backfill-fechado-perdido-split.sql:1`

**Issue:** `UPDATE leads SET stage = 'fechado' WHERE stage = 'fechado_perdido';` maps **every** lead that was previously in the combined `fechado_perdido` stage to `fechado` (closed-won), with no way to distinguish which of those were actually lost deals — that information did not exist in the pre-split schema and is not recoverable. This is an unconditional, silent business-data decision baked into a migration with zero comment explaining the choice or its irreversibility, and no mitigation (e.g., no flag left on the row, `motivoPerda` stays `null` for all of them so there's no way to later manually re-triage). For a CRM whose stated core value is "enxergar o funil de vendas de relance", this permanently corrupts historical won/lost reporting for every lead closed before this migration ran — any lead that was actually lost will now show up as won in all pipeline analytics/exports.

**Fix:** At minimum, document the tradeoff explicitly in the migration and confirm with the admin which default is intended (e.g., defaulting to `perdido` might be equally wrong, but doing it silently either way is the real problem). If any signal survives elsewhere (e.g., a notes/timeline field mentioning "perdido"), use it to split the backfill instead of a single blanket UPDATE. If truly unrecoverable, at least add a one-time flag/audit note (e.g., set `motivoPerda = '[migrado automaticamente de fechado_perdido — verificar]'` on affected rows) so historical data is auditable rather than silently mislabeled as won.

## Warnings

### WR-01: Dropping a card back in its own column still writes to the DB and shows a misleading toast

**File:** `src/components/pipeline-board.tsx:88-116`

**Issue:** `handleDragEnd` never checks whether `newStage` actually differs from the lead's current stage before calling `setOptimisticStage` and `updateLeadStage`. `updateLeadStage` correctly no-ops the `stageChangedAt` bump when the stage is unchanged, but the round trip still happens and, more visibly, `toast.success(\`Lead movido para ${label}.\`)` fires even when the card was dropped back into the same column it came from, misleading the admin into thinking something changed.

**Fix:**
```ts
if (!newStage || newStage === lead?.stage) return;
```

### WR-02: `motivoPerda` is never cleared when a lead moves out of "Perdido"

**File:** `src/actions/lead-actions.ts:130-139`, `src/components/pipeline-board.tsx:96-106`

**Issue:** `motivoPerda` is only included in the `updateLeadStage` SET clause `if (parsed.data.motivoPerda !== undefined)`. Since `motivoPerda` is only ever populated when dropping onto "Perdido" (`pipeline-board.tsx:99-106`), moving a lead back out of "Perdido" (e.g., reopened to `negociacao`) leaves the old lost-reason text in the database. If that same lead is later moved to "Perdido" again, the stale reason from the previous loss cycle can resurface in the edit form (`lead-form-dialog.tsx:289-304` reads `lead?.motivoPerda` as the default value), which is confusing for the admin.

**Fix:** Explicitly clear `motivoPerda` when the new stage isn't `"perdido"`:
```ts
...(parsed.data.stage === "perdido"
  ? parsed.data.motivoPerda !== undefined ? { motivoPerda: parsed.data.motivoPerda } : {}
  : { motivoPerda: null }),
```

### WR-03: `updateLeadStage` has no try/catch around the write, unlike `createLead`/`updateLead`

**File:** `src/actions/lead-actions.ts:110-143`

**Issue:** `createLead` and `updateLead` both wrap their `db.insert`/`db.update` calls in try/catch to convert `SQLITE_CONSTRAINT_FOREIGNKEY` into a friendly field error. `updateLeadStage` has no such guard around its `db.update` call. While `stage` itself has no FK, any other unexpected DB failure (disk error, lock contention, etc.) will throw inside the `startTransition(async () => {...})` callback in `pipeline-board.tsx:95-115` instead of returning a graceful `{ errors }` state, which is inconsistent error-handling coverage between the two mutation paths and will surface as an unhandled rejection / nearest error boundary rather than the "Não foi possível mover o lead" toast the UI is designed to show.

**Fix:** Wrap the update in try/catch and return a generic error state on failure, mirroring the other actions:
```ts
try {
  await db.update(leads).set({ ... }).where(...);
} catch {
  return { errors: { id: ["Não foi possível mover o lead."] } };
}
```

### WR-04: Duplicate, hand-maintained `STAGE_OPTIONS` in `lead-form-dialog.tsx`

**File:** `src/components/lead-form-dialog.tsx:54-60`

**Issue:** `etapa-badge.tsx` already exports a canonical `STAGE_OPTIONS` (derived from `STAGE_CONFIG`, `src/components/etapa-badge.tsx:19-22`) that `pipeline-board.tsx` imports and uses for the column order/labels. `lead-form-dialog.tsx` instead hand-declares its own literal copy of the same five `{value, label}` pairs. Two sources of truth for stage labels/order will drift the next time a stage is renamed, reordered, or added (e.g., if a "Reativado" stage is introduced later, only one of the two lists might get updated).

**Fix:** Import and reuse the existing export:
```ts
import { STAGE_OPTIONS } from "@/components/etapa-badge";
```

### WR-05: Single shared `motivoResolverRef` can silently drop a pending stage transition

**File:** `src/components/pipeline-board.tsx:56, 102-106, 118-122`

**Issue:** `motivoResolverRef` is a single ref holding at most one pending Promise resolver for the "motivo da perda" modal. If a second `handleDragEnd` transition that targets `"perdido"` starts before the first one's modal has been resolved, `motivoResolverRef.current` is overwritten and the first Promise is orphaned — its `startTransition` callback awaits forever, so `updateLeadStage` is never called for that first drag, and the card silently reverts (or worse, never settles) with no error surfaced to the admin. In current usage this is largely mitigated because the modal (`base-ui` Dialog, `fixed inset-0` backdrop) blocks background pointer interaction while open, so a second drag can't normally start mid-modal — but the code has no explicit guard against re-entrancy, so this becomes a latent bug the moment the dialog's blocking behavior changes or a non-pointer interaction path is added.

**Fix:** Guard against re-entrancy explicitly, e.g. resolve/reject any existing pending resolver before assigning a new one, or disable drag interactions while `motivoPerdaState.open` is true.

## Info

### IN-01: `@dnd-kit/sortable` is an unused dependency

**File:** `package.json:14`

**Issue:** `@dnd-kit/sortable` (`^10.0.0`) is installed but never imported anywhere in the codebase — only `@dnd-kit/core` primitives (`DndContext`, `useDraggable`, `useDroppable`, `PointerSensor`) are used, and no sortable/reorderable list is implemented within a column.

**Fix:** Remove the unused dependency, or note in a comment why it was installed ahead of need (e.g., planned future in-column reordering).

### IN-02: Drag-and-drop is mouse/touch-only — no keyboard sensor

**File:** `src/components/pipeline-board.tsx:64-66`

**Issue:** Only `PointerSensor` is registered. `PipelineLeadCard` has `role="button" tabIndex={0}` and an `onKeyDown` handler for opening the edit dialog, giving the appearance of keyboard support, but there is no way for a keyboard-only user to actually change a lead's stage (the primary interaction the board exists for) — only the click-to-edit fallback works via keyboard, and that requires manually picking the new stage in the form.

**Fix:** If keyboard accessibility matters for this project, add `@dnd-kit/core`'s `KeyboardSensor`; otherwise document this as an accepted limitation given the single-admin, mouse-driven usage context.

### IN-03: `verify-pipeline-migration.cjs`'s `fail()` doesn't guarantee halted execution

**File:** `scripts/verify-pipeline-migration.cjs:10-20`

**Issue:** `fail()` calls `console.error` + `process.exit(1)` but the calling code does not `return`/`throw` after invoking it (e.g., in the `catch` block at lines 16-20, execution falls through to `db.prepare("PRAGMA table_info(leads)")` on line 22 with `db` potentially still `undefined`). `process.exit()` schedules process termination but is not guaranteed to synchronously unwind the current call stack before subsequent statements execute, so this relies on an implementation detail rather than explicit control flow.

**Fix:** `throw` or `return` immediately after calling `fail()`, or have `fail()` itself throw and catch at the top level:
```js
} catch (err) {
  fail(`não foi possível abrir o banco em ${DB_PATH}: ${err.message}`);
  return; // or: throw new Error(...)
}
```

### IN-04: Esfriando border/badge can lag one round-trip behind an optimistic stage move

**File:** `src/components/pipeline-board.tsx:73, 80-84`

**Issue:** `esfriandoSet` is derived from the `esfriandoLeadIds` prop (computed server-side in `page.tsx` from the pre-drag `activeLeads`), not from `optimisticLeads`. During the window between an optimistic drag (e.g., moving a lead out of `contatado`) and the subsequent `revalidatePath("/pipeline")` re-render, a card that was flagged "Esfriando" can still show the amber border/label in its new column until the server round-trip completes.

**Fix:** Low priority given the short window involved; if desired, recompute the esfriando flag client-side from `optimisticLeads` + a client-captured "now" instead of trusting the server-provided id list across the transition.

---

_Reviewed: 2026-07-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
