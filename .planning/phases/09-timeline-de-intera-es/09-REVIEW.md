---
phase: 09-timeline-de-intera-es
reviewed: 2026-08-08T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - scripts/guard-no-hard-delete.cjs
  - scripts/test-interacao-actions.cjs
  - scripts/verify-schema.cjs
  - src/actions/interacao-actions.ts
  - src/actions/lead-actions.ts
  - src/components/delete-nota-dialog.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table-columns.tsx
  - src/components/lead-table.tsx
  - src/components/lead-timeline-dialog.tsx
  - src/components/pipeline-board.tsx
  - src/components/pipeline-lead-card.tsx
  - src/components/whatsapp-preview-dialog.tsx
  - src/db/schema.ts
  - src/lib/validations.ts
  - src/types/index.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-08-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the timeline-de-interações delivery: the new `interacoes` table/Server Actions, the `LeadTimelineDialog` UI, the "Ver histórico" entry points added to `lead-table`, `pipeline-board`/`pipeline-lead-card`, `lead-form-dialog`, and the transactional change to `registerWhatsAppContact` (now writes the WhatsApp click both to `leads.contact_attempts` and to `interacoes` inside `db.transaction()`).

The soft-delete/immutability guarantees for `interacoes` are solid: `updateInteracaoManual` and `softDeleteInteracaoManual` both gate on `eq(interacoes.tipo, "nota_manual")` in the `WHERE` clause (server-enforced, not just UI-hidden), `guard-no-hard-delete.cjs` was correctly extended to the new table and passes clean (`node scripts/guard-no-hard-delete.cjs` → exit 0), the new `scripts/test-interacao-actions.cjs` harness passes all 19 assertions against a real `:memory:` SQLite DB (atomicity/rollback, type coverage, immutability, deterministic ordering), `tsc --noEmit` is clean, and `eslint` on the changed files shows only two pre-existing, unrelated `react-hooks/incompatible-library` warnings (react-hook-form's `watch()`, TanStack's `useReactTable()`) that predate this phase.

One correctness issue survives from tracing the modified `registerWhatsAppContact` transaction against a concurrent stage change (see WR-01) — the function's own docstring claims a guarantee ("nunca sobrescreve negociacao/fechado/perdido definidos manualmente") that the code as written does not actually enforce. One minor consistency gap is noted in Info.

## Warnings

### WR-01: `registerWhatsAppContact` can silently revert a manually-set stage back to "contatado" under a race with `updateLeadStage`

**File:** `src/actions/lead-actions.ts:239-263`
**Issue:** `advanced` is computed from a `SELECT` (`current.stage === "novo"`, line 247) that runs *before* `db.transaction()` opens. The transactional `UPDATE` that follows (lines 250-256) does **not** re-check `stage` in its `WHERE` clause — it only filters on `id` and `isNull(deletedAt)`:
```ts
await tx
  .update(leads)
  .set({
    contactAttempts: sql`${leads.contactAttempts} + 1`,
    ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
```
If a concurrent `updateLeadStage` (e.g. a drag-and-drop move to "perdido"/"negociacao"/"fechado") commits between the pre-transaction `SELECT` and this `UPDATE`, `advanced` is still `true` from the stale read, so this transaction unconditionally writes `stage: "contatado"` and overwrites the manually-set stage — exactly the scenario the docstring above the function claims can never happen: *"nunca sobrescreve negociacao/fechado/perdido definidos manualmente, porque o gate exige etapa atual 'novo'"*. The gate is checked, but not atomically with the write it authorizes — classic check-then-act (TOCTOU). This is realistic in normal single-admin usage too, not just multi-tab: `registerWhatsAppContact` is fired fire-and-forget from the WhatsApp anchor's `onClick` (see `whatsapp-preview-dialog.tsx:194`) while the tab is already opening, so a fast drag of the same card immediately after clicking "Abrir WhatsApp" lands squarely in this window. Phase 9 touched this exact function (wrapped it in `db.transaction()` for the `interacoes` insert) but did not close the pre-existing race, and the new transaction wrapping was the natural point to fix it.
**Fix:** Re-verify the stage inside the same atomic write instead of trusting the pre-transaction read, e.g.:
```ts
const stageGuard = advanced ? [eq(leads.stage, "novo")] : [];
const updateResult = await tx
  .update(leads)
  .set({
    contactAttempts: sql`${leads.contactAttempts} + 1`,
    ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt), ...stageGuard))
  .returning({ id: leads.id });

// If advanced was requested but the guarded UPDATE matched 0 rows, the
// stage changed concurrently — retry the write without the stage/advance
// portion (still record the contact attempt + interacao) and report
// advanced:false to the caller.
```
(Or move the `SELECT` inside the transaction so both read and write share the same atomic scope.) Without this, the code comment's safety claim is false under concurrency and should either be fixed or the comment corrected to disclose the residual race.

## Info

### IN-01: Delete-note confirmation has no in-flight guard, unlike the sibling create/edit flows

**File:** `src/components/lead-timeline-dialog.tsx:140-151`, `src/components/delete-nota-dialog.tsx:40-42`
**Issue:** `onSubmit` (create) uses `useTransition`'s `pending` to disable the submit button, and `handleSalvarEdicao` (edit) tracks `salvandoEdicaoId` to disable the Save button while in flight. `handleConfirmarExclusao`, by contrast, awaits `softDeleteInteracaoManual(id)` with no pending flag, and `DeleteNotaDialog`'s "Excluir" button (`delete-nota-dialog.tsx:40`) is never disabled while the request is outstanding. A fast double-click fires `softDeleteInteracaoManual` twice concurrently before the dialog closes. This is harmless today only because the action happens to be idempotent (`WHERE ... AND deleted_at IS NULL`, verified by the test harness), but it's an inconsistency with the rest of the file's own pattern and would stop being harmless if the action's idempotency ever changed.
**Fix:** Add a local pending flag (mirroring `salvandoEdicaoId`) and pass `disabled={pending}` into `DeleteNotaDialog`'s confirm button, or wrap the call in the same `useTransition` already declared in the component.

---

_Reviewed: 2026-08-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
