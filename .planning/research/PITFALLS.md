# Pitfalls Research

**Domain:** Adding stage-mutating side effects to an existing `<a href="wa.me/...">` outreach flow (auto-advance, attempt counter, per-stage stale-config) in a solo-admin Next.js/Drizzle/SQLite CRM
**Researched:** 2026-07-30
**Confidence:** HIGH (all findings verified directly against this project's own source — `src/components/whatsapp-preview-dialog.tsx`, `src/components/pipeline-board.tsx`, `src/actions/lead-actions.ts`, `src/db/schema.ts`, `src/app/pipeline/page.tsx` — not generic web-dev advice)

## Codebase Facts That Change the Shape of This Work

Before the pitfalls: two facts from reading the actual code correct assumptions implicit in the milestone brief and should drive how the roadmap phases this work.

1. **There is only ONE "Abrir WhatsApp" anchor in the whole app**, not four. `pipeline-board.tsx`, `followup-dashboard.tsx`, `lead-table.tsx`, and `post-import-lead-list.tsx` each keep their own local `PreviewState` (which lead/which subnicho is being previewed), but all four render the *same* `<WhatsAppPreviewDialog>` component, and the actual `<a href={waHref}>` element with the `onClick` that fires when the message is actually sent lives in exactly one place: `src/components/whatsapp-preview-dialog.tsx` lines 165-178. This is good news — the auto-advance/counter logic belongs in that one file, not duplicated four times — but it is also the single biggest risk: if an implementer instruments the wrong click handler (see Pitfall 1 below), the bug is instantly system-wide across all four surfaces.

2. **The CSV batch-import flow does NOT auto-open the WhatsApp dialog.** `src/app/importar/[batchId]/page.tsx` and `post-import-lead-list.tsx` explicitly say "nunca dispara modais automaticamente em sequência" (D-13) — every send after a bulk import is a manual click. Only the **single manual lead-creation flow** (`LeadFormDialog` → `useFirstContactTrigger`) auto-opens the dialog, and only after `createLead` returns success (`lead-form-dialog.tsx` lines 121-134). The milestone brief's "auto-opens right after lead creation/import" conflates these two flows — plan and test them as two distinct cases, not one.

## Critical Pitfalls

### Pitfall 1: Instrumenting the wrong click handler — the per-surface "send" button only *opens* the dialog, it doesn't send anything

**What goes wrong:**
Every surface has its own onClick that opens the preview dialog — `onSendWhatsApp` in `pipeline-board.tsx`, the icon-button `onClick` in `followup-dashboard.tsx`/`post-import-lead-list.tsx` (via `WhatsAppSendButton`), and the named button in `lead-table.tsx`. It's natural, when told "increment on every click of the WhatsApp button" or "auto-advance when the admin contacts via WhatsApp," to hook these four `onClick`s. That's wrong: clicking these only opens the editable preview textarea — no message has been sent, no WhatsApp tab has opened, and the admin can still change the template type or cancel. The actual "the admin contacted this lead" moment is a single anchor click deeper inside `WhatsAppPreviewDialog`, at `whatsapp-preview-dialog.tsx:165-178`.

**Why it happens:**
The four surface-level handlers are literally named `onSendWhatsApp` / labelled "Enviar WhatsApp" / "WhatsApp" — the naming in the existing codebase itself invites confusion between "open the compose dialog" and "send." Cross-referencing spec language ("a todo clique em Abrir WhatsApp") against the actual button labels ("Enviar WhatsApp") makes it easy to instrument the outer button by mistake.

**How to avoid:**
Add the mutation call (stage-advance + counter) exclusively inside `WhatsAppPreviewDialog`'s existing `<a href={waHref} onClick={...}>` (the branch that renders when `waHref` is truthy), never in the four callers. This is also why fact #1 above matters for phase-sizing: this is a one-file change to the shared dialog, not four parallel changes.

**Warning signs:**
Counter increments the moment the dialog opens (before the admin ever sees the message text); a lead auto-advances to "Contatado" the instant `LeadFormDialog`'s auto-trigger opens the dialog on creation, even if the admin immediately hits Cancel.

**Phase to address:**
The phase implementing auto-advance + counter (single task: modify `whatsapp-preview-dialog.tsx` only).

---

### Pitfall 2: `preventDefault()` + await-then-`window.open()` breaks the anchor and triggers popup blockers

**What goes wrong:**
The current "Abrir WhatsApp" element is a real `<a href={waHref} target="_blank">` — `waHref` is already computed synchronously on every render from the live `texto` state (see the component's own doc comment, line 56-57: "o `href`... nunca memoizado do texto original"). The natural-looking way to "run a server mutation before sending" is `onClick={async (e) => { e.preventDefault(); await advanceStage(...); window.open(waHref) }}`. This breaks silently for the admin: because `window.open()` is no longer inside the synchronous call stack of the click event (there's an `await` in between), browsers treat it as a non-user-initiated popup and block it — the admin clicks the button and nothing happens, with no error surfaced anywhere in this app (there's no popup-blocked toast today).

**Why it happens:**
It feels safer to "confirm the mutation succeeded before opening WhatsApp," but that safety assumption is backwards for this feature: the anchor's `href` navigation and the server mutation are independent outcomes, and the app cannot know or control whether the admin actually sends the WhatsApp message anyway (per the milestone framing — "no way to know whether the admin actually sent the message in WhatsApp afterward"). Blocking navigation on the mutation buys no real correctness, only breaks the working link.

**How to avoid:**
Keep the anchor a real `<a href>` with no `preventDefault()`. Fire the Server Action as a non-blocking side effect in the *same* `onClick` (`startTransition(() => { void advanceContact(...) })` or equivalent), and let the browser's native anchor navigation proceed on its own synchronous path exactly as it does today (the dialog already closes via `onOpenChange(false)` in the same handler without blocking navigation — follow that existing precedent). If the mutation fails, surface it via a toast *after* the tab has already opened, don't gate the open on it.

**Warning signs:**
"Abrir WhatsApp" silently does nothing on some clicks but works on others (classic popup-blocker symptom); works when devtools/network throttling is off but fails under slow network (mutation takes longer, exceeding the browser's synchronous-gesture window).

**Phase to address:**
The phase implementing auto-advance + counter — mark as an explicit non-goal in the plan ("no preventDefault, no await-before-open") so the plan-checker/reviewer catches an implementation that violates it.

---

### Pitfall 3: Gating on the wrong "template type" — `defaultTipo` prop vs. live `tipo` state

**What goes wrong:**
`WhatsAppPreviewDialog` receives a `defaultTipo` prop from its caller (`"primeiro_contato"` from pipeline/lead-table/post-import, `"follow_up"` from the dashboard) but the admin can change the actual type via the "Tipo de mensagem" `<Select>` before clicking send — `tipo` is separate `useState`, reinitialized from `defaultTipo` only on open (lines 68, 75-87). Gating auto-advance on the `defaultTipo` *prop* rather than the live `tipo` *state* produces two wrong behaviors: (a) a lead opened from the dashboard (`defaultTipo="follow_up"`) where the admin manually switches to "1º contato" and sends would NOT auto-advance, even though the spec gates on template type alone, surface-agnostic ("todas as telas onde o botão aparece"); (b) a lead opened from the pipeline (`defaultTipo="primeiro_contato"`) where the admin switches to "Follow-up" before sending WOULD incorrectly auto-advance, because the prop still says primeiro_contato even though the rendered/sent message is a follow-up.

**Why it happens:**
`defaultTipo` is the value available at the call site (easy to read from the parent component's own state), while `tipo` only exists inside the dialog's internals — a developer wiring the gate from outside the dialog (e.g., in the parent's `onOpenChange` or based on the prop passed in) will reach for the more visible value.

**How to avoid:**
Gate exclusively on the dialog's own live `tipo` state, read at the moment of the "Abrir WhatsApp" click (`tipo === "primeiro_contato"`), never on the `defaultTipo` prop. This resolves the milestone's open question directly: **click-time selected type, not dialog-open-time default.**

**Warning signs:**
A lead contacted with a "1º contato" message from the dashboard doesn't advance; a lead contacted with a "Follow-up" message from the pipeline board advances anyway.

**Phase to address:**
Same phase — this is a one-line condition inside the same `onClick`, but needs an explicit test case covering "type switched away from surface default" in both directions.

---

### Pitfall 4: Auto-advance gate must be re-checked server-side, atomically, immediately before the write — never trust the client's `lead.stage`

**What goes wrong:**
The dialog receives `lead: Lead` as a prop, captured at the moment `setPreviewState({ lead, ... })` ran in the parent. If the gate check ("only advance when currently in Novo") is done client-side against this prop (`lead.stage === "novo"`), it can be stale: the lead could have been dragged to a different column (via the pipeline board's optimistic drag-and-drop) in the seconds between the dialog opening and the admin clicking send, or another browser tab/window could have changed it. A stale-read gate could incorrectly auto-advance a lead that's actually already in Negociação, or skip advancing one that raced back into Novo.

**Why it happens:**
The `lead` prop looks authoritative because it came from the server-rendered page originally, but by click time it's just cached client state — exactly the same class of bug the project already hit and fixed once for `updateLeadStage` (SELECT-then-compare pattern, `lead-actions.ts` lines 113-121, explicitly commented "PIPE-03, gap #2").

**How to avoid:**
Do the "is this lead currently in Novo" check inside the new Server Action itself, via a fresh `SELECT stage FROM leads WHERE id = ? AND deletedAt IS NULL` immediately before the conditional `UPDATE` — reuse the exact SELECT-then-compare shape already established in `updateLeadStage`. Never gate on the client-held `lead.stage`.

**Warning signs:**
A lead dragged to Negociação seconds before the admin sends a queued-up "1º contato" message gets silently bounced back toward Contatado logic, or a stage regression/re-advance the milestone explicitly forbids ("sem regredir/re-avançar leads já além de Contatado") slips through under race timing.

**Phase to address:**
The phase implementing the new Server Action — success criteria should include "gate check reads current DB state, not a prop," verifiable by code review of the action, not just UI testing.

---

### Pitfall 5: Same-lead race between the new WhatsApp-triggered stage mutation and the existing drag-and-drop optimistic-update-with-revert path

**What goes wrong:**
`PipelineBoard` already has one documented, still-open race in this project's own deferred UAT ("race condition de 'Perdido' em sequência"). Adding a *second* independent path that can call a stage-mutating Server Action for the same lead (the WhatsApp dialog's auto-advance, which is NOT wired into `useOptimistic`/`startTransition` in `pipeline-board.tsx` at all) creates a second, structurally similar race: if the admin drags a card to a new column and, within the same window, also opens that card's WhatsApp dialog and clicks send (or vice versa — the auto-triggered post-creation dialog fires while the admin is mid-drag), two independent `SELECT-then-UPDATE` calls race against the same row with no locking. Whichever `UPDATE` commits last wins outright, silently discarding the other mutation's intent — and because the drag path is *optimistic* (the card already visually moved before the server confirms), the admin has no way to tell afterward which mutation "won."

**Why it happens:**
The WhatsApp-triggered mutation is a brand-new, separate code path that has no reason to know about `PipelineBoard`'s `useOptimistic` state — they're different components entirely (the dialog is shared/global, the board is one specific surface) — so there's no natural place where "wait, is a drag already in flight for this lead?" gets checked.

**How to avoid:**
Don't try to add cross-component locking (out of proportion for a solo single-tab-at-a-time admin tool). Instead, contain the blast radius: the new auto-advance action should be a narrow, conditional, single-column transition (`novo → contatado` only, gated per Pitfall 4), so the worst case of a lost update is "a lead that should have shown as Contatado still shows Novo" — recoverable by the admin re-opening and re-sending, or via the existing manual stage dropdown — rather than clobbering a `Negociação`/`Perdido`/`Fechado` state the admin explicitly set by hand. Flag this as a known, accepted limitation (same posture as the existing unresolved "Perdido em sequência" race) rather than attempting to fix it in this milestone — fixing both properly would mean serializing writes per-lead (e.g. a DB-level `UPDATE ... WHERE stage = current AND id = ?` with an affected-rows check), which is a larger change than this milestone's scope.

**Warning signs:**
A lead the admin explicitly dragged to Negociação right after auto-creating it (fast workflow: create → drag → the auto-trigger dialog is still open in the background → admin clicks send) ends up back in "Contatado" after both requests settle.

**Phase to address:**
The phase implementing auto-advance — document the accepted risk explicitly in the phase's plan/CONTEXT (not silently), and add it as a known limitation next to the existing "Perdido em sequência" one in STATE.md's deferred items if not fully closed by this milestone's UAT.

---

### Pitfall 6: Counter increment and stage-advance as two separate Server Action calls — partial failure leaves inconsistent state

**What goes wrong:**
If the same click fires two independent `"use server"` calls (`incrementContactAttempts(leadId)` and `updateLeadStage(leadId, "contatado")`), a failure of the second call after the first succeeds (or vice versa) leaves the lead with an incremented counter but no stage change, or an advanced stage with an uncounted attempt — and because the click also always opens a real `wa.me` tab regardless of server outcome (Pitfall 2), the admin has no visual cue that anything server-side went wrong at all.

**Why it happens:**
The counter ("increments on every click, any template") and the stage-advance ("only Novo, only primeiro_contato") have different gating conditions, which makes it tempting to implement them as two separate, independently-testable actions/calls fired together from the same `onClick`.

**How to avoid:**
Implement one new Server Action (e.g. `registerWhatsAppContact(leadId, tipo)`) that, in a single DB transaction, always increments the attempt counter and conditionally (re-checking current stage server-side per Pitfall 4) advances the stage — one round trip, one atomic write, one success/failure outcome. Note the driver-specific gotcha if this touches `better-sqlite3` (current local driver per STACK.md): its Drizzle `db.transaction(fn)` callback must be **synchronous** (no `await` inside), unlike the `@libsql/client`/Turso driver mentioned as this project's documented future-hosting path, whose transactions are async — if/when the project migrates to Turso later, this transaction code needs re-checking, not just a driver-string swap.

**Warning signs:**
Contact-attempt count for a lead is higher than the number of times its stage actually reflects contact; support/debug sessions where "the counter went up but the card never moved" with no error toast shown.

**Phase to address:**
The phase implementing the new Server Action — success criteria should require "one Server Action call per click," not "one call per concern."

---

### Pitfall 7: Attempt counter over/under-counts around the existing auto-open first-contact dialog

**What goes wrong:**
The existing `useFirstContactTrigger` (`lead-form-dialog.tsx`) auto-opens `WhatsAppPreviewDialog` right after a lead is manually created — but merely *opening* the dialog is not a contact attempt (see codebase fact #2 above: CSV import never auto-opens at all, so this only applies to the single-create flow). Two distinct wrong implementations are easy to reach for: (a) incrementing inside `useFirstContactTrigger.trigger()` or wherever `setPreviewState`/`firstContact.trigger()` is called — this counts every auto-open and every manual re-open as an "attempt" even if the admin closes without sending; (b) incrementing only when the dialog is dismissed via any path (treating "dialog was shown" as "attempt made"), which over-counts admins who close without ever intending to contact.

**How to avoid:**
The counter increment lives exclusively inside the same `onClick` on the "Abrir WhatsApp" anchor as the stage-advance (Pitfall 1/6) — never in `useFirstContactTrigger`, never in any `setPreviewState`/`onOpenChange` handler. Closing the auto-opened (or manually opened) dialog via Cancel/Escape/outside-click must leave the counter untouched. This also means: a lead can be auto-created, the dialog can auto-open, the admin can close it immediately, and `contactAttempts` correctly stays `0` — write this as an explicit test case, since it's the one most likely to be silently skipped (nothing about the auto-open UI hints that "no counter increment happened" needs verifying).

**Warning signs:**
Freshly-imported or freshly-created leads the admin has never actually messaged show `contactAttempts: 1` on the pipeline card.

**Phase to address:**
Same phase as Pitfall 1/6 — cover explicitly in the phase's UAT/verification checklist ("create a lead, close the auto-opened dialog without sending, confirm counter is 0").

---

### Pitfall 8: Per-stage settings table with no seeded defaults silently disables the "esfriando" (stale) flag instead of erroring

**What goes wrong:**
Today the stale threshold is a single hardcoded literal (`differenceInDays(new Date(), lead.stageChangedAt) >= 5`, `contatado` only) computed inline in `src/app/pipeline/page.tsx`. Generalizing this into a settings table read at request time introduces a new failure mode the hardcoded version couldn't have: if the settings table has no row (migration didn't seed it, or a specific stage's row is missing because the config UI only ever wrote rows for stages the admin actually visited), a naive read (`settings.find(s => s.stage === lead.stage)?.dias`) returns `undefined`. `differenceInDays(...) >= undefined` evaluates to `false` in JS, not an error — every lead in that stage silently stops being flagged as stale, with no console error, no failed request, nothing visibly broken. This is worse than the original `stageChangedAt` nullable-backfill bug (already guarded against in this codebase) precisely because it fails *quiet*, not loud.

**Why it happens:**
A settings table modeled as "one row per stage, created on first save from `/configuracoes`" (the natural CRUD instinct) has no rows at all until the admin visits that page and saves — but the pipeline page reads settings on every load starting the moment this feature ships, long before the admin necessarily visits `/configuracoes` even once.

**How to avoid:**
Make the migration itself self-seeding: `CREATE TABLE` with `NOT NULL DEFAULT <current hardcoded value>` per stage column (or an `INSERT` of the singleton/three rows in the same migration file that adds the table), so there is no separate "seed step" an admin or deploy process can forget to run. Additionally, keep a defensive fallback constant in the read path (e.g. `const FALLBACK = { novo: 3, contatado: 5, negociacao: 7 }`) used only if a row is unexpectedly missing, so a missing-row bug degrades to "uses a reasonable default" rather than "silently flags nothing."

**Warning signs:**
Right after deploying this feature, the pipeline board shows zero "esfriando" badges anywhere, including on leads that were flagged yesterday under the old hardcoded rule.

**Phase to address:**
The phase implementing `/configuracoes` — plan should explicitly require the migration to seed defaults matching the current hardcoded `5` for Contatado (no behavior change on day one), not just create an empty table.

---

### Pitfall 9: A configured threshold of `0` days flags every lead in that stage the instant it enters it

**What goes wrong:**
`differenceInDays(now, stageChangedAt) >= N` with `N = 0` is true for a lead that changed stage one second ago (same calendar day → `differenceInDays` returns `0`, and `0 >= 0`). If the new `/configuracoes` form accepts `0` (or doesn't validate at all — e.g., an empty/NaN input coerced to `0`), every lead sitting in that stage — including ones the admin just moved there — immediately renders as "stale/esfriando," which is very likely not what "0 dias parado" intuitively means to a non-technical admin filling out the settings form.

**Why it happens:**
`0` looks like a safe/valid default for a numeric "days" input, and a Zod schema copy-pasted from elsewhere in the app might only check `z.number().int()` without a `.min(1)`, especially since nothing about the existing hardcoded `5` establishes a precedent for what the floor should be.

**How to avoid:**
Validate the `/configuracoes` form input with `.int().min(1)` (or whatever floor makes sense — even `1` still has the "created this morning, flagged as parado by evening" edge case worth surfacing in the UI copy) and reject `0`/negative/non-numeric input with a clear inline error, rather than letting it silently persist and produce an all-cards-flagged pipeline.

**Warning signs:**
Admin sets one stage's threshold low while testing the new settings page and the entire pipeline board turns "esfriando" red/yellow instantly, with no indication whether that's the new config working correctly or a bug.

**Phase to address:**
Same phase as Pitfall 8 — add to the phase's form-validation success criteria explicitly, not left implicit in "add Zod validation."

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| Two separate Server Action calls (counter, stage) instead of one transaction | Each function stays small/independently testable | Partial-failure inconsistent state (Pitfall 6) with no user-visible error surface | Never for this feature — the anchor-click pattern has no retry/confirmation UI to recover from partial failure |
| Client-side gate check on `lead.stage`/`defaultTipo` prop instead of server-side re-read | Avoids one extra `SELECT`, feels "instant" | Stale-read races (Pitfall 3, 4) that silently violate the "never regress/re-advance" rule | Never — this rule is a hard invariant per the milestone spec, not a UX nicety |
| Settings table with no migration-seeded defaults, seeded only via first `/configuracoes` save | Simpler migration, less to test on day one | Silent stale-flag disablement for any stage never explicitly saved (Pitfall 8) | Never — self-seeding in the migration costs one extra `INSERT`/`DEFAULT` clause |
| Accepting `useOptimistic` divergence between the pipeline board and the WhatsApp-triggered auto-advance | Ships without touching `pipeline-board.tsx`'s dnd/optimistic code at all | Same-lead race with drag-and-drop (Pitfall 5) stays open, mirrors the already-known "Perdido em sequência" gap | Acceptable for this milestone if explicitly documented as a known/accepted limitation, given the narrow blast radius (novo→contatado only) |

## Integration Gotchas

Not a third-party API integration in the usual sense (per project constraints, `wa.me` is a static link, not a JS-callable API), but the anchor-navigation pattern has its own gotchas worth treating the same way:

| Integration | Common Mistake | Correct Approach |
|-------------|------------------|--------------------|
| `wa.me` anchor + server mutation | `preventDefault()` + `await mutation()` + `window.open()` to "confirm success first" | Keep native `<a href>` navigation untouched; fire the mutation as a non-blocking side effect in the same handler (Pitfall 2) |
| `better-sqlite3` transaction (local dev driver) | Writing `await`-based async logic inside `db.transaction(fn)`, which works fine on `@libsql/client`/Turso but throws or silently misbehaves on `better-sqlite3`'s synchronous transaction API | Keep the transaction callback fully synchronous when targeting `better-sqlite3`; re-audit if/when this project migrates to Turso (documented future path in STACK.md) |
| `revalidatePath` after the new Server Action | Assuming all 4 surfaces re-render instantly and consistently after a WhatsApp-triggered stage change, without accounting for a concurrent optimistic drag already in flight on `/pipeline` | Call `revalidatePath("/pipeline")`, `revalidatePath("/")`, `revalidatePath("/leads")` exactly like `updateLeadStage` already does — but don't treat this as a substitute for the server-side re-check in Pitfall 4; revalidation reflects final DB state, it doesn't prevent races |

## Performance Traps

Scale is a non-issue here (solo admin, a few thousand leads, SQLite) — no performance traps expected from these 3 features at this project's scale. Not populating this section with speculative entries.

## Security Mistakes

No new attack surface — no new external inputs, no new auth boundary (solo local-first tool). The one item worth a mention:

| Mistake | Risk | Prevention |
|---------|------|------------|
| `/configuracoes` days-per-stage inputs accepted without server-side Zod validation (only client-side form validation) | A malformed/negative/huge value written directly via a forged request could produce nonsensical pipeline UI (not a security breach given single-admin/no-auth scope, but worth the same server-side validation discipline as `leadSchema`/`stageUpdateSchema` already establish) | Validate with a Zod schema on the Server Action itself, same pattern as `stageUpdateSchema`, not just via the form's `react-hook-form` resolver |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| No toast/feedback when the new auto-advance Server Action fails after the WhatsApp tab already opened | Admin has already switched to the WhatsApp tab and sent the message by the time (or without ever knowing) the stage-advance silently failed server-side — they'll trust the pipeline board's stage that never actually happened | Fire the existing `toast.success`/`toast.error` pattern (already used by `handleDragEnd` in `pipeline-board.tsx`) from the new action's result, even though it fires after the tab has opened — better late feedback than none, consistent with the milestone's explicit requirement for a confirmation toast |
| Threshold of `0`/very low days makes the whole board look "on fire" the first time the admin tries the new settings page | Admin loses trust in the "esfriando" signal entirely after one bad experiment | Validate the floor (Pitfall 9) and consider showing a live preview count ("X leads would show as parado with this value") on the `/configuracoes` form before saving |
| Counter shown on the pipeline card with no distinction between "attempt via 1º contato" vs "attempt via follow-up/prova de valor" | Admin can't tell from the number alone whether a lead has been genuinely worked or just repeatedly nudged with the same follow-up template | Out of this milestone's stated scope (spec says a single number, any template) — but worth flagging as a likely v1.3 follow-up rather than silently deciding it away |

## "Looks Done But Isn't" Checklist

- [ ] **Auto-advance gate:** Often implemented by checking the `defaultTipo` prop or a stale client-held `lead.stage` — verify the gate reads the dialog's live `tipo` state AND a fresh server-side `SELECT` of current stage, not either alone (Pitfalls 3, 4)
- [ ] **Contact-attempt counter:** Often wired to the surface-level "open dialog" button or `useFirstContactTrigger` — verify it only fires from the shared `WhatsAppPreviewDialog`'s "Abrir WhatsApp" anchor click, and that closing an auto-opened dialog without sending leaves the count at 0 (Pitfalls 1, 7)
- [ ] **Stage-advance + counter atomicity:** Often built as two separate Server Action calls — verify it's one transaction, one round trip, with the driver's sync/async transaction constraint respected for `better-sqlite3` (Pitfall 6)
- [ ] **Settings table defaults:** Often only seeded by the admin's first save on `/configuracoes` — verify the migration itself inserts/defaults all 3 stage rows (or DEFAULTs), matching the current hardcoded `5` for Contatado so day-one behavior doesn't silently regress (Pitfall 8)
- [ ] **Settings validation floor:** Often left at `.int()` with no `.min()` — verify `0`/negative values are rejected server-side, not just discouraged client-side (Pitfall 9)
- [ ] **Popup-blocker safety:** Often "fixed" later by someone adding `preventDefault()` to "make it more reliable" — verify no code path between the anchor render and click adds `preventDefault()` + async-before-`window.open()` (Pitfall 2)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| Counter over/under-counted for some leads after a bad deploy (Pitfall 1 or 7) | LOW | `contactAttempts` is a simple integer column — a one-off UPDATE/migration script can zero it out or recompute a best-effort value; no cascading data loss since nothing else derives from it |
| Settings table missing rows silently disabled staleness flags (Pitfall 8) | LOW | Ship a follow-up migration that inserts the missing default rows; no data was lost, only a UI signal was dark for a period |
| Lost-update race between drag-and-drop and WhatsApp auto-advance clobbered a manual stage change (Pitfall 5) | LOW–MEDIUM | Admin can always manually reset the lead's stage via the existing `LeadFormDialog` edit form (stage dropdown) — no destructive/irreversible state, same recovery path as any other stage mistake today |
| Popup-blocker silently ate a click (Pitfall 2) | LOW | No server state is corrupted (mutation still fires independently of navigation per the fix); admin just re-clicks "Abrir WhatsApp" — but until the code is fixed, this looks like a recurring "the button doesn't work" complaint, worth catching in code review before shipping rather than relying on this being "cheap to recover from" in production |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| 1. Wrong click handler instrumented (surface button vs. dialog's send anchor) | Auto-advance + counter phase | Code review confirms all new logic lives inside `whatsapp-preview-dialog.tsx`'s anchor `onClick`, not in the 4 callers |
| 2. `preventDefault` + await + `window.open` breaks popup | Auto-advance + counter phase | Manual test: click "Abrir WhatsApp" repeatedly under normal network conditions and with Chrome DevTools network throttled to "Slow 3G" — tab must open every time |
| 3. Gate on `defaultTipo` prop vs. live `tipo` state | Auto-advance + counter phase | Test case: open dialog from dashboard (`defaultTipo="follow_up"`), switch type to "1º contato", send — must advance; open from pipeline (`defaultTipo="primeiro_contato"`), switch to "Follow-up", send — must NOT advance |
| 4. Client-side stale `lead.stage` gate instead of server re-check | Auto-advance + counter phase | Code review of the new Server Action confirms a fresh `SELECT` immediately precedes the conditional `UPDATE`, mirroring `updateLeadStage`'s existing pattern |
| 5. Drag-and-drop vs. WhatsApp-auto-advance same-lead race | Auto-advance + counter phase | Documented as accepted/known limitation in the phase's CONTEXT/plan (not silently left out); optionally added to STATE.md deferred items alongside "Perdido em sequência" |
| 6. Two separate Server Action calls, partial-failure risk | Auto-advance + counter phase | Code review confirms one Server Action, one DB transaction, for both counter increment and conditional stage-advance |
| 7. Counter double/under-counts around auto-open dialog | Auto-advance + counter phase | UAT case: create a lead manually, let the dialog auto-open, close without sending — `contactAttempts` must remain 0 |
| 8. Settings table missing seeded defaults | `/configuracoes` phase | Migration review confirms `NOT NULL DEFAULT`/seed `INSERT` for all 3 stages in the same migration that creates the table; smoke test immediately after migration shows identical "esfriando" badges to the pre-migration hardcoded behavior |
| 9. `0`-day threshold flags everything instantly | `/configuracoes` phase | Form + Server Action both reject `0`/negative input with a visible inline error; no client-only validation |

## Sources

- `src/components/whatsapp-preview-dialog.tsx` (this project, read directly) — single shared anchor, `tipo`/`texto` live state, existing doc comments on `href` recomputation and dialog-mount precedent — HIGH confidence
- `src/components/pipeline-board.tsx` (this project, read directly) — existing `useOptimistic`/`startTransition` drag-and-drop pattern, existing "Perdido em sequência" queueing fix (CR-02) as the closest precedent for same-lead races — HIGH confidence
- `src/actions/lead-actions.ts` (this project, read directly) — existing `updateLeadStage` SELECT-then-compare pattern, existing `stageChangedAt` nullable-backfill precedent referenced (not re-flagged) per instructions — HIGH confidence
- `src/app/pipeline/page.tsx`, `src/db/schema.ts` (this project, read directly) — current hardcoded `esfriando` threshold (`contatado`, `>= 5` dias) that Feature 3 must generalize and preserve on day one — HIGH confidence
- `src/hooks/use-first-contact-trigger.ts`, `src/components/lead-form-dialog.tsx`, `src/app/importar/[batchId]/page.tsx`, `src/components/post-import-lead-list.tsx` (this project, read directly) — confirms auto-open exists only for manual single-lead creation, not CSV batch import — HIGH confidence
- `.planning/STATE.md` deferred items (this project) — exact wording of the still-open "race condition de 'Perdido' em sequência" and 7-day boundary UAT gaps used as precedent framing for Pitfall 5 — HIGH confidence
- General knowledge: browser popup-blocker behavior requiring `window.open()` to remain in the synchronous user-gesture call stack; `better-sqlite3` vs. `@libsql/client` sync/async transaction API difference (cross-checked against this project's own STACK.md, which documents the Turso migration path) — MEDIUM-HIGH confidence (well-established browser/driver behavior, not independently re-verified against current docs this session, but consistent with training-data knowledge and this project's own documented driver choices)

---
*Pitfalls research for: auto-advance-on-WhatsApp-contact + contact-attempt counter + per-stage stale-config settings (v1.2 milestone)*
*Researched: 2026-07-30*
