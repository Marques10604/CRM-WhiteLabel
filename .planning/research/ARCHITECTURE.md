# Architecture Research

**Domain:** Feature integration into an existing Next.js 16 Server-Actions-only CRM (v1.2 milestone)
**Researched:** 2026-07-30
**Confidence:** HIGH (all findings verified by reading the actual source files listed below, not inferred from the milestone description alone)

> This file supersedes the v1.0-era architecture research below for the purposes of the current milestone. It focuses ONLY on integration points for the 3 v1.2 features: (1) auto-advance pipeline stage on WhatsApp contact, (2) contact-attempt counter, (3) `/configuracoes` stale-in-stage settings. For the original general CRM architecture survey (Kanban/CSV/wa.me shape, prior to any code existing), see git history of this file at commit `1a4b400` or earlier.

## Standard Architecture

### System Overview — where the 3 new features attach

```
┌───────────────────────────────────────────────────────────────────────────┐
│  5 mount points that open WhatsAppPreviewDialog                             │
│  ┌───────────────┐ ┌──────────────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │pipeline-board  │ │followup-dashboard│ │lead-table │ │post-import-lead- │ │
│  │.tsx            │ │.tsx              │ │.tsx       │ │list.tsx          │ │
│  └───────┬────────┘ └────────┬─────────┘ └─────┬─────┘ └────────┬─────────┘ │
│          │                   │                  │                │          │
│          │        ┌──────────────────────┐      │                │          │
│          └───────►│ lead-form-dialog.tsx │◄─────┴────────────────┘          │
│                   │ (auto-trigger after   │  all 5 just call                │
│                   │  create, WA-04)       │  setPreviewState({open:true...})│
│                   └──────────┬────────────┘                                 │
├──────────────────────────────┼───────────────────────────────────────────── │
│                    ONE SHARED COMPONENT                                     │
│         ┌──────────────────────────────────────────┐                       │
│         │  WhatsAppPreviewDialog                    │                       │
│         │  (src/components/whatsapp-preview-dialog. │  ◄── Feature 1 + 2   │
│         │   tsx)                                    │      integration     │
│         │  <a href={waHref} target=_blank            │      point (single) │
│         │     onClick={...}>Abrir WhatsApp</a>       │                       │
│         └──────────────────┬───────────────────────┘                       │
├────────────────────────────┼───────────────────────────────────────────────│
│                  NEW: registerWhatsAppContact(leadId, tipo)                 │
│         (src/actions/lead-actions.ts, "use server")                        │
│         — increments contactAttempts + lastContactedAt (always)             │
│         — conditionally advances stage novo→contatado (Feature 1)           │
├───────────────────────────────────────────────────────────────────────────┤
│                              leads table                                    │
│         + contact_attempts INTEGER NOT NULL DEFAULT 0                       │
│         + last_contacted_at INTEGER (nullable)                              │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  Separate, unrelated data path (drag-and-drop stage change)                 │
│  pipeline-board.tsx onDragEnd → updateLeadStage(id, stage, motivoPerda)     │
│  (existing, unmodified — different transition semantics, see below)         │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  Feature 3 — fully independent new vertical slice                           │
│  NEW /configuracoes page → stage-settings-form.tsx → updateStageSettings()  │
│         ↓ writes                                                            │
│  NEW pipeline_stage_settings table (1 row per configurable stage)           │
│         ↓ read by                                                           │
│  src/app/pipeline/page.tsx — replaces hardcoded "contatado, 5 days" filter  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `WhatsAppPreviewDialog` (`src/components/whatsapp-preview-dialog.tsx`) | Renders the real `<a href={waHref}>` that is the ONLY place a wa.me link is actually opened across the whole app | **Modify** — add `onClick` side-effect |
| `registerWhatsAppContact` (new, `src/actions/lead-actions.ts`) | Single Server Action: unconditionally increments `contactAttempts`/`lastContactedAt`, conditionally advances `stage` novo→contatado | **New** |
| `updateLeadStage` (existing, `src/actions/lead-actions.ts`) | Arbitrary any-stage-to-any-stage move from drag-and-drop, with `motivoPerda` handling | **Unmodified** — do not conflate with the above |
| `PipelineLeadCard` (`src/components/pipeline-lead-card.tsx`) | Displays `lead.contactAttempts` on the card | **Modify** — add a small counter/badge, no new prop needed (`lead: Lead` already carries the column once it's in schema) |
| `pipeline_stage_settings` (new table) | Holds one row per configurable stage (`novo`/`contatado`/`negociacao`) with its `staleDays` threshold | **New** |
| `src/app/configuracoes/page.tsx` (new) | Server component: fetches the 3 settings rows, renders the form | **New** |
| `stage-settings-form.tsx` (new) | Client form (react-hook-form + zod), 3 number inputs, one submit → `updateStageSettings` | **New** |
| `updateStageSettings` (new, `src/actions/settings-actions.ts`) | Validates and writes the 3 rows in one call | **New** |
| `src/app/pipeline/page.tsx` | Computes `esfriandoLeadIds` | **Modify** — replace hardcoded `stage==="contatado" && diff>=5` with a lookup against the settings rows |
| `app-sidebar.tsx` | Nav | **Modify** — add `/configuracoes` entry |

## Recommended Project Structure (delta only — new/changed files)

```
src/
├── db/
│   └── schema.ts                       # MODIFY: add 2 columns to `leads`, add `pipelineStageSettings` table
├── actions/
│   ├── lead-actions.ts                 # MODIFY: add `registerWhatsAppContact`
│   └── settings-actions.ts             # NEW: `updateStageSettings`
├── db/
│   └── queries.ts                      # MODIFY (recommended): extract `getEsfriandoLeadIds` pure helper,
│                                        #   mirroring the existing `groupLeadsByUrgency` pattern
├── components/
│   ├── whatsapp-preview-dialog.tsx     # MODIFY: onClick on the "Abrir WhatsApp" <a>
│   ├── pipeline-lead-card.tsx          # MODIFY: render contactAttempts
│   └── stage-settings-form.tsx         # NEW
├── app/
│   ├── pipeline/page.tsx               # MODIFY: read staleDays from DB instead of literal `5`/`"contatado"`
│   └── configuracoes/page.tsx          # NEW
└── lib/
    └── validations.ts                  # MODIFY: add `stageSettingsSchema` (zod)
```

### Structure Rationale

- No new top-level folders. Every new file slots into an existing convention already used 4+ times in this codebase (`actions/*-actions.ts` per domain, `app/<route>/page.tsx` server component + one client form component, `db/schema.ts` single source of truth for tables).
- `registerWhatsAppContact` lives in `lead-actions.ts` next to `updateLeadStage`/`updateLead`, not in a new file — it operates on the same `leads` table and reuses the same SELECT-then-conditional-write idiom already established there (see Pattern 1 below), so co-locating keeps that idiom visible in one place instead of forking it.
- `settings-actions.ts` is a new file (not appended to an existing one) because it is the first action touching a genuinely new table with no relation to `leads`/`subnichos`/`templates` — matches the existing 1-table-per-actions-file convention (`subnicho-actions.ts`, `template-actions.ts`).

## Architectural Patterns

### Pattern 1: Single shared "send" choke point instead of per-surface wiring

**What:** All 5 mount points (`pipeline-board.tsx`, `followup-dashboard.tsx`, `lead-table.tsx`, `post-import-lead-list.tsx`, and the auto-trigger inside `lead-form-dialog.tsx`) only ever call `setPreviewState({ open: true, lead, subnichoNome })` — none of them render an `<a href="wa.me/...">` themselves. That anchor exists in exactly one place: `WhatsAppPreviewDialog`'s footer (`whatsapp-preview-dialog.tsx:165-178`). The dialog is the only React tree node that both (a) has the live `lead` object and (b) fires the actual outbound click.

**When to use:** Any time N surfaces converge on 1 shared dialog/modal component for the actual "commit" action — put commit-time side effects (server action calls, counters, analytics) on the component that owns the commit UI element, not on the N callers that merely open it.

**Trade-offs:** Pro — zero duplication, "all 4 surfaces get it for free" as the question asked, and any 6th future surface (e.g. a bulk-send screen) inherits the behavior automatically just by reusing `WhatsAppPreviewDialog`. Con — `WhatsAppPreviewDialog` now knows about business rules (auto-advance, counting) beyond rendering a preview; acceptable here because the rules are inseparable from "a WhatsApp message was actually sent," which only this component can observe.

**Example (the only change needed to satisfy Features 1 and 2 together):**
```tsx
// src/components/whatsapp-preview-dialog.tsx
import { toast } from "sonner";
import { registerWhatsAppContact } from "@/actions/lead-actions";

// ...inside the component, replace the existing onClick:
<a
  href={waHref}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => {
    onOpenChange(false); // unchanged — closes dialog immediately, never blocks
    if (lead) {
      // Fire-and-forget: no `await`, no `preventDefault()`. The browser's
      // native <a target="_blank"> navigation proceeds synchronously and
      // independently of this promise.
      registerWhatsAppContact(lead.id, tipo)
        .then((result) => {
          if (result.advanced) {
            toast.success(`${lead.nome} movido para Contatado.`);
          }
        })
        .catch(() => {
          // Silent by design: a failed counter/advance write must never
          // surface an error over a WhatsApp tab that already opened.
        });
    }
  }}
  className={cn(buttonVariants(), "gap-1.5 bg-[#0D9488] text-white hover:bg-[#0D9488]/90")}
>
  <MessageCircle />
  Abrir WhatsApp
</a>
```
Note `tipo` is the dialog's **live Select state** (`const [tipo, setTipo] = useState(...)`), not the `defaultTipo` prop — a lead can be opened from `followup-dashboard.tsx` (`defaultTipo="follow_up"`) and still get auto-advanced if the admin manually switches the type selector to "1º contato" before sending. Using live state (not the prop) is what makes the rule "advance only when the template of first contact is used" correct regardless of which of the 5 surfaces opened the dialog.

Why calling the Server Action directly (no `startTransition`) is correct here: there is no pending UI to coordinate (unlike `pipeline-board.tsx`'s drag-and-drop, which uses `useOptimistic` + `startTransition` to show an instant card move and revert on failure). This click has no local optimistic state to manage — it's a background write the admin never needs to watch — so a bare `.then()/.catch()` keeps it fully decoupled from React's transition scheduling and from the anchor's native default action.

### Pattern 2: One combined action, not two, and not a fork of `updateLeadStage`

**What:** `registerWhatsAppContact(leadId, tipo)` does the counter increment AND the conditional stage advance in a single `UPDATE` (one query, one network round trip from the click), rather than two separate Server Actions or two separate calls.

**When to use:** Whenever a single user gesture logically produces two related writes to the same row — combine them into one action/one query instead of sequencing two round trips from the client, which would double network latency for zero benefit and create a window where one write could succeed and the other fail independently.

**Trade-offs:** Pro — atomic from the app's perspective, one `revalidatePath` batch, one place to reason about. Con — the function now has two responsibilities (counting + advancing) instead of one; acceptable because they share the exact same trigger (a WhatsApp send click) and the same guard (lead must exist, not soft-deleted) — splitting them would not remove any real coupling, only add a second network call.

**Why NOT reuse/extend `updateLeadStage`:** `updateLeadStage(id, stage, motivoPerda)` takes an **explicit target stage** supplied by the drag-and-drop destination column, and owns `motivoPerda` clear/set semantics tied to arbitrary any-to-any moves. The WhatsApp-click transition is different in kind: it is a narrow, one-directional `novo → contatado` advance that must **never fire for other stages** ("sem regredir/re-avançar leads já além de Contatado" — a lead already in `negociacao`/`fechado`/`perdido` must be left untouched even if the admin re-sends a "1º contato" template to it). Forcing this into `updateLeadStage`'s signature would mean a caller-supplied conditional ("only pass 'contatado' if current stage is 'novo'") duplicated at the call site anyway — the guard belongs server-side, in a dedicated function, not client-computed.

**Example:**
```ts
// src/actions/lead-actions.ts — new export, same file as updateLeadStage/updateLead
export async function registerWhatsAppContact(
  leadId: number,
  tipo: Template["tipo"]
): Promise<{ advanced: boolean }> {
  // Same SELECT-then-conditional-write idiom already used by updateLead
  // (line ~113) and updateLeadStage (line ~166) — current stage decides
  // whether the write also advances the pipeline.
  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  if (!current) {
    // Lead soft-deleted or removed between render and click — rare race,
    // never surface an error here (see Pattern 1: this call is fire-and-forget).
    return { advanced: false };
  }

  const advanced = tipo === "primeiro_contato" && current.stage === "novo";

  await db
    .update(leads)
    .set({
      contactAttempts: sql`${leads.contactAttempts} + 1`, // atomic increment, not read-then-write
      lastContactedAt: new Date(),
      ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return { advanced };
}
```

### Pattern 3: Typed one-row-per-key settings table instead of a JSON blob

**What:** `pipelineStageSettings` is a normal Drizzle table with a `stage` primary key column and a `staleDays` integer column — one row per configurable stage — not a single settings row with a JSON column.

**When to use:** Small, fixed, enumerable configuration sets (here: exactly 3 possible stages, never more without a code change anyway, since `STAGE_OPTIONS` in `etapa-badge.tsx` is a hardcoded array) in a Drizzle+SQLite project that already has zero JSON columns anywhere in `schema.ts` and explicitly values Drizzle Studio as a GUI for a non-developer admin to inspect/edit data directly (per `CLAUDE.md`: "Lets the non-technical founder actually look at/edit raw lead data in a GUI without writing SQL").

**Trade-offs:** Pro — every row is independently readable/editable in Drizzle Studio with zero decoding; Zod validation is a plain per-field integer bound instead of validating a loosely-typed JSON shape; consistent with the rest of the schema's style (all typed columns, no blobs). Con — adding a 4th configurable dimension later (hypothetically) means a new migration to widen the table rather than "just add a JSON key" — acceptable trade for a project whose explicit philosophy (`CLAUDE.md` STACK.md rationale for choosing Drizzle over Prisma) is "transparent and debuggable" over "flexible."

**Example:**
```ts
// src/db/schema.ts — new table
export const pipelineStageSettings = sqliteTable("pipeline_stage_settings", {
  stage: text("stage", { enum: ["novo", "contatado", "negociacao"] }).primaryKey(),
  staleDays: integer("stale_days").notNull(),
});
```
Seed migration (generated file, custom INSERT appended — same pattern as `0002_backfill-fechado-perdido-split.sql`):
```sql
-- src/db/migrations/000X_pipeline-stage-settings.sql
INSERT INTO pipeline_stage_settings (stage, stale_days) VALUES
  ('novo', 5),
  ('contatado', 5),
  ('negociacao', 5);
```
Seeding all 3 at `5` days preserves today's implicit-only-`contatado` behavior as the day-one default (the admin then adjusts per stage from `/configuracoes`), rather than silently changing existing behavior on deploy.

## Data Flow

### Feature 1 + 2 flow (click to persisted write)

```
Admin clicks "Abrir WhatsApp" in WhatsAppPreviewDialog
    ↓ (synchronous, not blocking)
Browser's native <a target="_blank"> opens wa.me in a new tab
    ↓ (in parallel, async, fire-and-forget)
registerWhatsAppContact(lead.id, tipo)  [Server Action, POST under the hood]
    ↓
SELECT current stage (guard: not soft-deleted)
    ↓
UPDATE leads SET contact_attempts = contact_attempts + 1, last_contacted_at = now
       [+ stage = 'contatado', stage_changed_at = now]  ← only if tipo==="primeiro_contato" && stage==="novo"
    ↓
revalidatePath("/"), ("/pipeline"), ("/leads")
    ↓
.then() on client: if advanced → toast.success("Lead movido para Contatado.")
```

### Feature 3 flow (settings → pipeline board)

```
Admin edits 3 number inputs on /configuracoes → submit
    ↓
updateStageSettings(formData)  [Server Action, validates via stageSettingsSchema]
    ↓
UPDATE pipeline_stage_settings SET stale_days = ? WHERE stage = ?   (×3, or one UPSERT per row)
    ↓
revalidatePath("/pipeline")
    ↓
Next visit to /pipeline: PipelinePage fetches pipelineStageSettings alongside leads/subnichos/templates
    ↓
esfriandoLeadIds computed from a Map<stage, staleDays> lookup instead of the literal `stage==="contatado" && 5`
```

### Key Data Flows

1. **WhatsApp send → counter + auto-advance:** single Server Action call from one shared component, fire-and-forget, never blocks the native anchor navigation. No new page load, no `revalidatePath` visible to the admin until they next navigate (consistent with how `updateLeadStage`/`softDeleteLead` already work).
2. **Settings → pipeline "esfriando" computation:** classic server-component read-then-render — `PipelinePage` already does 3 parallel `Promise.all` queries (leads/subnichos/templates); this becomes a 4th parallel query, no architecture change, just one more `db.select()`.

## Scaling Considerations

Not relevant at this project's scale (single admin, SQLite, a few thousand leads) — explicitly out of scope per `CLAUDE.md`. No table included here; none of these 3 features introduce a query that isn't already `O(active leads)` like the rest of `/pipeline`.

## Anti-Patterns

### Anti-Pattern 1: Wiring the auto-advance/counter logic into each of the 5 call sites individually

**What people do:** Add an `onSend` callback prop to `WhatsAppSendButton` and have each of `pipeline-board.tsx`, `followup-dashboard.tsx`, `lead-table.tsx`, `post-import-lead-list.tsx` call `registerWhatsAppContact` themselves right before/after opening the preview dialog.
**Why it's wrong:** `WhatsAppSendButton`'s click only **opens the dialog** — it happens before the admin has edited the message or even confirmed they want to send. Counting/advancing at that point would count "opened the preview" as "sent a message," which is not true, and would in fact create the exact double-counting risk the question worried about (the auto-trigger in `lead-form-dialog.tsx` opens the dialog programmatically after every create/import — if opening counted, every single created lead would silently get 1 phantom contact attempt and an unwanted auto-advance to `contatado`, even for leads the admin never actually messaged).
**Instead:** Count/advance only at the true commit point — the `<a href="wa.me/...">` click inside `WhatsAppPreviewDialog` — exactly once, regardless of which surface opened the dialog. (Confirmed safe: opening the dialog and clicking "Abrir WhatsApp" are two separate, decoupled events in the current code — `firstContact.trigger(...)` only sets React state to render the dialog open; it never touches `leads.contactAttempts` or `leads.stage`.)

### Anti-Pattern 2: `event.preventDefault()` + programmatic `window.open()` to "make the click awaitable"

**What people do:** To guarantee the Server Action finishes before the WhatsApp tab opens, call `event.preventDefault()`, `await registerWhatsAppContact(...)`, then `window.open(waHref, "_blank")`.
**Why it's wrong:** This is exactly the "blocks the click" failure mode the milestone explicitly rules out, and it also reintroduces a popup-blocker risk — `window.open()` called asynchronously (after an `await`) outside the original click's synchronous call stack is flagged as a popup by most browsers, unlike a real `<a target="_blank">` click, which is always allowed. The existing code deliberately avoids `window.open`/`onClick`-driven send for this reason (see `whatsapp-preview-dialog.tsx` comment: "não é uma... onClick de disparo — polymorphic `render=` prop... não foi verificada como segura").
**Instead:** Keep the real `<a href>` untouched (no `preventDefault`), fire the Server Action as an un-awaited side effect in the same synchronous `onClick`, as shown in Pattern 1.

### Anti-Pattern 3: Storing stage-stale-day settings as a JSON blob in a single "app_settings" row

**What people do:** `CREATE TABLE app_settings (id INTEGER PRIMARY KEY, data TEXT)` with a single row holding `{"staleDays": {"novo": 5, "contatado": 5, "negociacao": 5}}`, on the theory that "it's just config, one row is simpler."
**Why it's wrong:** Opaque in Drizzle Studio (shows as a raw JSON string, not editable fields) — directly conflicts with this project's stated reason for choosing Drizzle Studio at all (GUI editing for a non-developer admin). Also loses Drizzle's/TypeScript's compile-time column-name safety; a typo'd JSON key (`"contatad"`) silently falls back to `undefined` at runtime instead of failing a migration/type-check.
**Instead:** One row per stage, typed columns (Pattern 3 above).

## Integration Points

### External Services

None — all 3 features are entirely internal (DB schema + Server Actions + pages), matching the existing "no REST API layer, Server Actions only" architecture. No new external service touches this milestone.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `WhatsAppPreviewDialog` ↔ `registerWhatsAppContact` | Direct async function call (Server Action import), fire-and-forget | The ONE new coupling for Features 1+2. Never `await`ed before the anchor's default navigation. |
| `pipeline-board.tsx` (drag-and-drop) ↔ `updateLeadStage` | Direct async function call inside `startTransition` + `useOptimistic` | **Unchanged.** Verified no overlap needed with `registerWhatsAppContact` — different trigger, different transition rule, different failure UX (drag shows a blocking error toast + reverts optimistic move; WhatsApp click fails silently). |
| `pipeline/page.tsx` ↔ `pipeline_stage_settings` table | Server component `db.select()`, 4th entry in existing `Promise.all` | Additive only — does not change the shape of `esfriandoLeadIds`, only its data source. |
| `configuracoes/page.tsx` ↔ `updateStageSettings` | Server Action bound to a form (matches `subnicho-actions.ts`/`template-actions.ts` convention: `useActionState` or a plain async submit handler) | New, isolated — no dependency on `leads` table at all. |
| `PipelineLeadCard` ↔ `leads.contactAttempts` | Prop already flows through (`lead: Lead` — the inferred Drizzle type picks up the new column automatically once added to `schema.ts`, `src/types/index.ts` needs no manual edit since `Lead = InferSelectModel<typeof leads>`) | Zero new prop plumbing needed beyond the schema change itself. |

## Suggested Build Order

1. **Phase A — Features 1 + 2 together (auto-advance + contact counter).** These are architecturally inseparable: same migration (`contactAttempts`/`lastContactedAt` columns on `leads`), same new Server Action (`registerWhatsAppContact`), same single `onClick` edit in `WhatsAppPreviewDialog`, same `PipelineLeadCard` display change. Splitting them into two phases would mean touching the exact same lines of code twice for no isolation benefit — build and ship as one unit.
   - Migration: add `contact_attempts INTEGER NOT NULL DEFAULT 0` + `last_contacted_at INTEGER` to `leads` (no backfill script needed — `DEFAULT 0` and `NULL` are the correct semantics for pre-existing rows, unlike the earlier `stageChangedAt` column which needed a custom backfill).
   - This phase also validates the riskiest shared surface in the app (all 5 WhatsApp-send mount points) early, which matters given `PROJECT.md`'s noted debt that Fase 4's WhatsApp UAT scenarios were never confirmed in-browser.

2. **Phase B — Feature 3 (`/configuracoes` + generalized stale-day logic).** Fully independent of Phase A — no shared files, no shared migration, no shared Server Action. Can be built before, after, or in parallel with Phase A with zero merge risk. Suggested to go **second** only because it's lower-urgency (a config screen vs. the core "never forget a follow-up" click path) and because `pipeline/page.tsx`'s `esfriandoLeadIds` filter is easiest to review as its own small, self-contained diff once Phase A's schema/action changes have already landed and `git diff` noise from the two phases doesn't overlap.

## Sources

- Direct source inspection (HIGH confidence — this is a codebase read, not a web search):
  - `C:\Users\Vencedor\Desktop\crm-leads\src\components\whatsapp-preview-dialog.tsx` — confirms single-anchor choke point, live `tipo` state, existing `onClick={() => onOpenChange(false)}` to extend
  - `C:\Users\Vencedor\Desktop\crm-leads\src\components\whatsapp-send-button.tsx`, `pipeline-board.tsx`, `followup-dashboard.tsx`, `lead-table.tsx`, `post-import-lead-list.tsx`, `lead-form-dialog.tsx`, `hooks/use-first-contact-trigger.ts` — confirms all 5 mount points only ever open the dialog, never send directly; confirms open ≠ send (no double-count risk)
  - `C:\Users\Vencedor\Desktop\crm-leads\src\actions\lead-actions.ts` — confirms `updateLeadStage`/`updateLead`'s existing SELECT-then-conditional-write idiom, reused by the new `registerWhatsAppContact`
  - `C:\Users\Vencedor\Desktop\crm-leads\src\db\schema.ts` — confirms zero existing JSON columns (supports Pattern 3's typed-table recommendation), confirms `stageChangedAt`'s nullable-no-default precedent
  - `C:\Users\Vencedor\Desktop\crm-leads\src\app\pipeline\page.tsx` — confirms exact hardcoded logic to replace (`stage === "contatado" && differenceInDays(...) >= 5`)
  - `C:\Users\Vencedor\Desktop\crm-leads\src\db\migrations\0002_backfill-fechado-perdido-split.sql` — precedent for a custom-SQL data migration (used as the model for seeding `pipeline_stage_settings`)
  - `C:\Users\Vencedor\Desktop\crm-leads\src\db\queries.ts` — precedent for extracting a pure, testable helper (`groupLeadsByUrgency`) alongside a DB-fetch function, model for the recommended `getEsfriandoLeadIds` extraction
  - `C:\Users\Vencedor\Desktop\crm-leads\package.json`, `git ls-files src/db/migrations` — confirms migrations ARE tracked in git via `drizzle-kit generate` (contradicts the milestone brief's "not migrations-tracked" note; verified directly rather than trusted at face value, per this agent's verification discipline)
- `C:\Users\Vencedor\Desktop\crm-leads\CLAUDE.md` — Drizzle-over-Prisma rationale ("transparent and debuggable... Claude Code... reasoning around"), Drizzle Studio rationale ("non-technical founder... GUI without writing SQL") — both directly inform Pattern 3's table-over-JSON recommendation

---
*Architecture research for: auto-advance stage on WhatsApp click + contact-attempt counter + configurable stale-in-stage settings (CRM de Leads v1.2 milestone)*
*Researched: 2026-07-30*
