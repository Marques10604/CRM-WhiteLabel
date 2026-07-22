---
phase: 04-follow-up-dashboard-whatsapp-outreach
reviewed: 2026-07-21T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src/actions/lead-actions.ts
  - src/actions/template-actions.ts
  - src/app/leads/page.tsx
  - src/app/page.tsx
  - src/app/pipeline/page.tsx
  - src/app/templates/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/delete-template-dialog.tsx
  - src/components/followup-dashboard.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table.tsx
  - src/components/pipeline-board.tsx
  - src/components/pipeline-lead-card.tsx
  - src/components/template-form-dialog.tsx
  - src/components/template-list.tsx
  - src/components/whatsapp-preview-dialog.tsx
  - src/components/whatsapp-send-button.tsx
  - src/db/queries.ts
  - src/db/schema.ts
  - src/hooks/use-first-contact-trigger.ts
  - src/lib/validations.ts
  - src/lib/whatsapp.ts
  - src/types/index.ts
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the follow-up dashboard, WhatsApp outreach (template CRUD, preview modal, `wa.me` link builder), and the pipeline drag-and-drop code that this phase touches. The server-action layer (`lead-actions.ts`, `template-actions.ts`) is generally careful — FK backstops, `isNull(deletedAt)` guards, and `stageChanged` comparisons before touching `stageChangedAt` are all done correctly and defensively. However, two real correctness bugs were found: an off-by-one in the "Próximos 7 dias" urgency grouping that silently drops leads due exactly 7 days out from every dashboard bucket (contradicting the function's own doc comment), and a shared-ref race condition in the pipeline board's "mover para Perdido" flow that can permanently strand a stage-change promise (and thus lose a persisted stage transition) if two leads are dragged to "Perdido" before the first confirmation modal is dismissed. Also flagged: `stageChangedAt` is never populated on lead creation (silently breaking the "esfriando" indicator for leads created directly in "Contatado"), `motivoPerda` is never cleared when a lead leaves the "Perdido" stage, an un-awaited `db.transaction()` call that only works by accident of the current (synchronous) SQLite driver and will silently misbehave under the Turso/libSQL variant this project's own stack docs recommend, and a `WhatsAppPreviewDialog` that unmounts its own `<Dialog>` instead of letting it animate closed, inconsistent with every other dialog in the codebase.

## Critical Issues

### CR-01: "Próximos 7 dias" silently drops leads due exactly 7 days out

**File:** `src/db/queries.ts:34-53`
**Issue:** `groupLeadsByUrgency` computes `in7Days = addDays(today, 7)` and buckets with `isBefore(lead.followUpDate, in7Days)`, which is a **strict** `<`. A lead whose `followUpDate` is exactly `today + 7` fails all three branches (`isBefore(date, today)` false, `isToday(date)` false, `isBefore(date, today+7)` false) and is pushed into **no bucket at all** — it simply disappears from the dashboard for that day. This directly contradicts the function's own doc comment: `"Leads com follow-up 8+ dias no futuro não aparecem em nenhum grupo"` — which implies day 7 *should* appear, but it does not. Concretely: today = Jul 21 → `in7Days` = Jul 28; a lead due Jul 28 is excluded from "Vencidos", "Hoje", and "Próximos 7 dias" alike. Given this phase's stated core value ("nunca mais perder um follow-up"), a lead can silently vanish from the one screen designed to surface it.
**Fix:**
```ts
// widen the exclusive upper bound by one day so "today + 7" is included
const in7Days = addDays(today, 8);
```
or equivalently switch the comparison to be inclusive of day 7 (e.g. `!isAfter(lead.followUpDate, addDays(today, 7))`).

### CR-02: Concurrent "mover para Perdido" drags can permanently drop a stage update

**File:** `src/components/pipeline-board.tsx:63, 100-134`
**Issue:** `motivoResolverRef` is a single `useRef` shared across all in-flight drag transitions. When a lead is dropped on "Perdido", `handleDragEnd` opens `MotivoPerdaDialog` and blocks on `await new Promise((resolve) => { motivoResolverRef.current = resolve; })`. If a **second** lead is dragged to "Perdido" before the admin dismisses the first modal, `motivoResolverRef.current` is overwritten with the second promise's `resolve`. The first lead's `startTransition` callback is now awaiting a promise whose `resolve` reference has been discarded — it can never settle, so `updateLeadStage` is **never called** for the first lead. The UI has already moved that card optimistically (via `setOptimisticStage`), so the admin sees it sitting in "Perdido", but the change was never persisted to the DB; a page refresh (or any other state churn) will silently revert it. This is a real data-loss/race condition, not just a UI glitch, and is easy to trigger by triaging a few dead leads quickly.
**Fix:** Key the pending resolvers by lead id (or queue them) instead of using a single shared ref, and/or block starting a second "move to Perdido" drag while a `MotivoPerdaDialog` is already pending:
```ts
const motivoResolversRef = useRef<Map<number, (motivo: string | undefined) => void>>(new Map());

// on drag to "perdido":
motivoResolversRef.current.set(leadId, resolve);

// resolveMotivoPerda now needs to know which leadId the open dialog belongs to
function resolveMotivoPerda(leadId: number, motivo: string | undefined) {
  motivoResolversRef.current.get(leadId)?.(motivo);
  motivoResolversRef.current.delete(leadId);
}
```
(`MotivoPerdaDialog`'s state would need to carry `leadId` alongside `leadNome` to route the resolution correctly.)

## Warnings

### WR-01: `stageChangedAt` never set on lead creation — breaks "esfriando" for leads created directly in "Contatado"

**File:** `src/actions/lead-actions.ts:37-67` (`createLead`)
**Issue:** `createLead` inserts `parsed.data` as-is and never sets `stageChangedAt`. The pipeline page's "esfriando" calculation (`src/app/pipeline/page.tsx:27-34`) explicitly requires `lead.stageChangedAt != null`. A lead created via `LeadFormDialog` with `stage` set directly to `"contatado"` (the form allows picking any stage at creation time) will have `stageChangedAt = null` forever — it can never be flagged "esfriando" unless its stage is later changed away and back through `updateLead`/`updateLeadStage`. The doc comment on the pipeline page describes this null-guard as covering *legacy* leads predating the feature, but this gap also affects brand-new leads created today.
**Fix:** Stamp `stageChangedAt` on creation so the invariant holds for every lead going forward:
```ts
const [inserted] = await db
  .insert(leads)
  .values({ ...parsed.data, stageChangedAt: new Date() })
  .returning();
```

### WR-02: `motivoPerda` is never cleared when a lead leaves the "Perdido" stage

**File:** `src/actions/lead-actions.ts:101-117` (`updateLead`), `:149-160` (`updateLeadStage`); `src/components/lead-form-dialog.tsx:312-327`
**Issue:** In `LeadFormDialog`, the "Motivo da perda" field is only rendered (and thus only submitted in `FormData`) when `form.watch("stage") === "perdido"`. When editing a lead and moving it out of "Perdido" to another stage, the field disappears from the DOM, so `motivoPerda` is absent from `FormData` → absent from `parsed.data` → omitted from the `.set({...parsed.data, ...})` call in `updateLead`, leaving the old value untouched in the DB. Symmetrically, `updateLeadStage` only includes `motivoPerda` in its `.set()` when the caller explicitly passes one (`parsed.data.motivoPerda !== undefined`), and the pipeline board only ever passes a value when dropping *into* "Perdido" — dragging a previously-lost lead back to another stage never clears it either. A reactivated lead silently retains its old "motivo da perda" text indefinitely.
**Fix:** Explicitly clear `motivoPerda` whenever the target stage isn't `"perdido"`:
```ts
.set({
  ...parsed.data,
  motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
  ...(stageChanged ? { stageChangedAt: new Date() } : {}),
})
```
(and the equivalent in `updateLeadStage`, clearing when `stage !== "perdido"` regardless of whether the caller passed a value).

### WR-03: Un-awaited `db.transaction()` in `applyDefaultTemplate` only works by accident of the synchronous SQLite driver

**File:** `src/actions/template-actions.ts:20-28` (definition), call sites at lines 47, 75, 106
**Issue:** `applyDefaultTemplate` is a non-`async` function that calls `db.transaction((tx) => {...})` and is itself called without `await` from `createTemplate`, `updateTemplate`, and `setDefaultTemplate`. This currently "works" only because `drizzle-orm/better-sqlite3` transactions execute synchronously. This project's own CLAUDE.md documents the Turso/libSQL hosted variant as "the recommended default" and states the Drizzle schema/query code is meant to be identical across both drivers — but `drizzle-orm/libsql` transactions are asynchronous. Under that driver, this becomes a fire-and-forget call: `revalidatePath` (and the response returned to the client) would race ahead of the actual commit, so a freshly-created default template could intermittently fail to appear as default after the page revalidates.
**Fix:** Make `applyDefaultTemplate` async and await it at every call site so the code is portable across both documented driver variants:
```ts
async function applyDefaultTemplate(id: number, tipo: Template["tipo"]) {
  await db.transaction(async (tx) => {
    await tx.update(templates).set({ isDefault: false })
      .where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true)));
    await tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id));
  });
}
// ...
if (isDefault) {
  await applyDefaultTemplate(inserted.id, parsed.data.tipo);
}
```

### WR-04: `WhatsAppPreviewDialog` unmounts its own `<Dialog>` instead of animating closed

**File:** `src/components/whatsapp-preview-dialog.tsx:102`
**Issue:** The component does `if (!lead) return null;` after all hooks, which is fine for hook-ordering, but the effect is that the entire `<Dialog>` tree unmounts the instant `lead` becomes `undefined`. Callers (`followup-dashboard.tsx:219-228`, `pipeline-board.tsx:202-211`) close the preview via `setPreviewState({ open: false })`, which clears `open` **and** `lead` in the same state update — so on close, `open` and `lead` become falsy/undefined in the same render, and the component returns `null` immediately rather than rendering `<Dialog open={false}>`. This yanks the Radix Dialog out of the tree before it gets a chance to run its own close transition, unlike every other dialog in this codebase (`LeadFormDialog`, `TemplateFormDialog`, `DeleteTemplateDialog`), which always render `<Dialog open={...}>` regardless of content state.
**Fix:** Keep the `<Dialog>` mounted and guard only the content, e.g. compute `tel`/`waHref` defensively and skip rendering the body when there's no lead, or fall back to the last-known lead for the closing frame:
```tsx
return (
  <Dialog open={open && !!lead} onOpenChange={onOpenChange}>
    <DialogContent>
      {lead ? ( /* existing body */ ) : null}
    </DialogContent>
  </Dialog>
);
```

## Info

### IN-01: `useFirstContactTrigger` returns an unused `template` field

**File:** `src/hooks/use-first-contact-trigger.ts:21`
**Issue:** The hook returns `template: defaultTemplate`, but no caller (`LeadFormDialog` is the only consumer) reads `firstContact.template` — it always re-derives the template via `pickTemplate()` inside `WhatsAppPreviewDialog` instead. Dead code.
**Fix:** Remove the unused `template` field from the returned object, or wire it in if it was meant to skip the auto-open when no template exists.

### IN-02: Dialog `key` computation forces an unnecessary remount when closing after an edit

**File:** `src/components/followup-dashboard.tsx:208`, `src/components/lead-table.tsx:184`, `src/components/pipeline-board.tsx:181`
**Issue:** `key={dialogState.mode === "edit" ? \`edit-${dialogState.lead.id}\` : "create"}` collapses both `"closed"` and `"create"` to the same key `"create"`. When a lead is edited and saved, `dialogState` transitions `{mode:"edit", lead}` → `{mode:"closed"}`, so the key changes from `edit-<id>` to `create`, forcing React to unmount and remount the whole `LeadFormDialog` (and its internal hooks/state) purely because it's closing. Harmless today since the dialog is invisible at that point, but it's an accidental side effect rather than an intentional key strategy.
**Fix:** Use a stable key independent of the closed/create distinction, e.g. `key={dialogState.mode === "edit" ? \`edit-${dialogState.lead.id}\` : "create-or-closed"}`, or only remount on the `lead.id` actually changing.

### IN-03: `DialogState` + `firstContactTemplate` + dialog-key logic duplicated across three components

**File:** `src/components/followup-dashboard.tsx`, `src/components/lead-table.tsx`, `src/components/pipeline-board.tsx`
**Issue:** All three components independently define the identical `DialogState` union, the identical `firstContactTemplate` `useMemo` (`templates.find(t => t.tipo === "primeiro_contato" && t.isDefault)`), and the identical dialog `key`/`open`/`onOpenChange` wiring for `LeadFormDialog`. Any future change to this pattern (e.g. fixing IN-02) needs to be applied in three places and will drift if missed in one.
**Fix:** Extract a small shared hook, e.g. `useLeadDialogState(templates)` returning `{ dialogState, setDialogState, dialogLead, dialogKey, firstContactTemplate }`, and reuse it in all three components.

### IN-04: Template delete confirmation doesn't disable its own action while pending

**File:** `src/components/delete-template-dialog.tsx:43-45`, `src/components/template-list.tsx:111-123`
**Issue:** `TemplateList.handleDeleteConfirm` wraps `deleteTemplate` in `startTransition` and tracks `isPending`, but `DeleteTemplateDialog`'s "Excluir" button is never wired to that pending state (`onConfirm={handleDeleteConfirm}` with no `disabled`). A rapid double-click can fire `deleteTemplate` twice for the same id before the dialog closes (harmless no-op on the second call today, but sloppy and would matter if `deleteTemplate` ever gained side effects).
**Fix:** Pass `isPending` down and disable the confirm button while pending, consistent with how `LeadFormDialog`/`TemplateFormDialog` disable their submit buttons during `pending`.

---

_Reviewed: 2026-07-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
