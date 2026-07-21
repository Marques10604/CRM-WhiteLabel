# Phase 3: Sales Pipeline & Funnel View - Research

**Researched:** 2026-07-21
**Domain:** Kanban drag-and-drop UI (@dnd-kit) + SQLite/Drizzle additive schema migration + derived "stale lead" computation
**Confidence:** HIGH (schema/migration mechanics verified directly against this repo's actual `.sql`/snapshot files and official docs; dnd-kit/React patterns verified against official docs + npm registry)

## Summary

This phase is narrow and mostly mechanical: (1) extend the `stage` enum from 4 to 5 values, add two nullable columns (`motivoPerda`, `stageChangedAt`), (2) build a 5-column Kanban board with `@dnd-kit/core` + `@dnd-kit/sortable` (locked in `STACK.md`, not yet installed), and (3) compute an "esfriando" flag at render time from `stageChangedAt` — no new persistence machinery needed beyond the one new timestamp column.

The single most important finding, verified directly against this repo's `src/db/migrations/meta/0000_snapshot.json`: Drizzle's `text("stage", { enum: [...] })` is a **TypeScript-only** narrowing — the actual SQLite column is untyped `text`, and drizzle-kit's snapshot only records `"type": "text"` with no enum metadata. This means widening the enum from 4 to 5 values produces **zero SQL diff** when you run `drizzle-kit generate` — drizzle-kit will not emit any `ALTER TABLE` for the `stage` column itself. The real migration work is: a `--custom` migration for the one-time data UPDATE (2 rows: `fechado_perdido` → `fechado`), plus two `ADD COLUMN` statements for the new nullable columns. A second verified pitfall: SQLite forbids non-constant (expression) defaults — like the `sql\`(unixepoch())\`` pattern this codebase already uses for `createdAt`/`updatedAt` — on `ADD COLUMN` against a **non-empty** table (this repo has 2 rows), so `stageChangedAt` must be added nullable-with-no-default and backfilled via the same custom migration's `UPDATE` statement, not via a Drizzle column `.default(...)`.

**Primary recommendation:** Treat this as three small, independent tasks — (1) schema/migration (enum widen + `motivoPerda` + `stageChangedAt`, one custom SQL migration for the data backfill), (2) `updateLeadStage` Server Action (sets `stageChangedAt` only when stage actually changes, accepts optional `motivoPerda`), (3) `/pipeline` board with `@dnd-kit/core` `DndContext`/`useDraggable`/`useDroppable` + React 19 `useOptimistic` for instant card movement with automatic revert-on-failure.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Board layout, column rendering, empty states | Browser / Client (`"use client"` board component) | — | Drag interactivity requires client-side event handling; @dnd-kit is a client-only library |
| Drag gesture capture + optimistic card move | Browser / Client | — | `@dnd-kit` `DndContext`/`onDragEnd` + React 19 `useOptimistic`, both client-side |
| Initial board data (leads grouped by stage) | API / Backend (Server Component, direct DB read) | — | Same pattern as existing `src/app/page.tsx` — `db.select()` inside an `async` Server Component, no API route |
| Stage persistence + `motivoPerda` write + `stageChangedAt` bump | API / Backend (Server Action) | — | New `updateLeadStage` Server Action in `lead-actions.ts`, following `createLead`/`updateLead` conventions exactly |
| "Esfriando" flag computation | API / Backend (computed at Server Component render, passed down as a prop) OR Browser/Client (computed from `stageChangedAt` + `Date.now()` at render) | — | Pure derived value from `stageChangedAt` + a 5-day threshold; no dedicated column or cron job needed — compute wherever the board data is assembled, before it reaches the card component |
| Enum widening + new columns + data backfill | Database / Storage | — | Drizzle schema + one generated migration + one custom migration, per Common Pitfalls below |

## User Constraints

<user_constraints>

### Locked Decisions (from `03-CONTEXT.md`)
- **D-01/D-02:** 5-column board (Novo, Contatado, Negociação, Fechado, Perdido); the 2 existing `fechado_perdido` rows migrate to **Fechado** by default (confirmed via live query in this research: still exactly 2 rows, both `fechado_perdido`, 0 in any other terminal state).
- **D-03/D-04:** New nullable `motivoPerda` text column; optional, non-blocking prompt when a card is dragged into Perdido.
- **D-05:** Badge colors green=Fechado, red=Perdido (already specified with hex values in `03-UI-SPEC.md`).
- **D-06/D-07/D-08:** "Esfriando" = 5+ days since **last stage change** (not last edit), applies only to the Contatado column, shown as a 2px amber card border + "Esfriando" label+Clock icon.
- **D-09/D-10:** Card shows Nome + Sub-nicho + Follow-up date only; clicking (not dragging) a card opens the existing `lead-form-dialog.tsx` unmodified in structure.
- **D-11:** Column header shows count only, no value roll-up (deferred as `PIPE-V2-01`).
- **D-12:** Board is unfiltered — no sub-nicho/etapa/follow-up filters on this view.
- **D-13:** New `/pipeline` route + sidebar nav entry.
- **D-14/D-15:** Empty column = muted text, no CTA; columns have a fixed 288px min-width, board scrolls horizontally (never shrinks columns).
- **Stack (locked in `STACK.md`):** `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop — confirmed **not yet installed** (`package.json` has neither as of this research).

### Claude's Discretion
- Exact column widths/spacing beyond the 288px minimum, precise "esfriando" highlight shade (already pinned to specific hex values in `03-UI-SPEC.md`, so effectively resolved), card micro-layout/icon spacing, `motivoPerda` modal exact copy (already resolved in `03-UI-SPEC.md`'s Copywriting Contract).

### Deferred Ideas (OUT OF SCOPE)
- `PIPE-V2-01` — sum of estimated value per stage (roll-up). Do not build.
- Board-level filters (sub-nicho/follow-up) — explicitly deferred per D-12, list view remains the filtering surface.

</user_constraints>

## Phase Requirements

<phase_requirements>

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | Board with 5 fixed stages + live count per stage | Schema migration section (enum widen) + board Server Component pattern (group leads by stage, `COUNT` via `groupBy` in-memory since dataset is tiny) |
| PIPE-02 | Drag-and-drop lead between stages | `@dnd-kit/core` setup + `updateLeadStage` Server Action + `useOptimistic` pattern below |
| PIPE-03 | "Esfriando" flag for stale Contatado leads | `stageChangedAt` column + pitfall on ADD COLUMN defaults + derived-at-render computation pattern below |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | 6.3.1 `[VERIFIED: npm registry — npm view, published 2024-12-05, ~20.7M weekly downloads as of this research]` | `DndContext`, `useDraggable`, `useDroppable`, sensors | De facto React drag-and-drop standard since `react-beautiful-dnd` was archived; peer deps `react >=16.8.0` / `react-dom >=16.8.0` — compatible with React 19.2.7 already in this project `[VERIFIED: npm registry — npm view @dnd-kit/core peerDependencies]` |
| `@dnd-kit/sortable` | 10.0.0 `[VERIFIED: npm registry — npm view, ~20.3M weekly downloads]` | `SortableContext` (not strictly required for cross-column-only moves, but locked in `STACK.md`) | Peer dep `@dnd-kit/core ^6.3.0`, satisfied by the version above `[VERIFIED: npm registry — npm view @dnd-kit/sortable peerDependencies]` |

**Note on scope:** This phase's requirement (PIPE-02) is *move between fixed columns*, not *reorder within a column*. `DndContext` + `useDraggable` + `useDroppable` from `@dnd-kit/core` alone are sufficient for that. `@dnd-kit/sortable`'s `SortableContext` is for intra-list reordering — install it per the locked stack decision (zero extra cost, future-proofs for card reordering within a column later) but the board does not need to wire it up for this phase's requirements. `[ASSUMED — this scoping judgment is this researcher's interpretation of CONTEXT.md, not itself independently verified against a dnd-kit doc; flagged in Assumptions Log]`

### Supporting
No new supporting libraries. React 19's built-in `useOptimistic` (already available — ships with `react@19.2.7`, no install) handles the optimistic-UI-then-reconcile pattern; no extra state library needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit` | `react-beautiful-dnd` | Archived/unmaintained, explicitly listed in this project's `CLAUDE.md` "What NOT to Use" — never use |
| `@dnd-kit/sortable` for cross-column-only moves | Skip it, use only `@dnd-kit/core` | Valid, slightly smaller install; rejected here because the stack decision is already locked and the cost of the extra package is negligible |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

**Version verification:** Confirmed live via `npm view @dnd-kit/core version` → `6.3.1`, `npm view @dnd-kit/sortable version` → `10.0.0`, both matching `STACK.md`'s prior research exactly (no drift since that research was done).

## Package Legitimacy Audit

`slopcheck` could not be installed in this environment (`pip install slopcheck` produced no usable binary — `command -v slopcheck` failed after the install attempt). Per protocol, both packages below are tagged `[ASSUMED]` for the slopcheck dimension specifically, even though multiple independent registry signals are strongly positive. The planner should still gate the install behind a lightweight `checkpoint:human-verify` per protocol, though the risk here is very low given the evidence below.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `@dnd-kit/core` | npm | latest version (6.3.1) published 2024-12-05; package itself is multi-year (well-known, pre-dates this research) | 20.7M/week `[VERIFIED: npmjs.org downloads API]` | `github.com/clauderic/dnd-kit` `[VERIFIED: npm view repository.url]` | not run — `[ASSUMED]` | Approved, low risk (see note) |
| `@dnd-kit/sortable` | npm | same publish date, same repo | 20.3M/week `[VERIFIED: npmjs.org downloads API]` | `github.com/clauderic/dnd-kit` `[VERIFIED: npm view repository.url]` | not run — `[ASSUMED]` | Approved, low risk (see note) |

No `postinstall` script on either package (`npm view @dnd-kit/core scripts` shows only `start`/`build`/`test`/`lint`/`prepublish`; the equivalent check for `@dnd-kit/sortable` failed with an out-of-memory error in this constrained shell — a known host limitation already documented in `STATE.md` for `npx shadcn add popover`, not a package-legitimacy signal). `[VERIFIED: npm view, this session]` for `@dnd-kit/core`; `@dnd-kit/sortable`'s postinstall could not be checked due to host OOM — treat as unconfirmed, not suspicious (same registry org, same repo, same publish batch as `@dnd-kit/core`).

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none — but see `[ASSUMED]` disclaimer above; planner should still add a `checkpoint:human-verify` before `npm install` per protocol since slopcheck itself never ran.

## Architecture Patterns

### System Architecture Diagram

```
Server Component (/pipeline/page.tsx)
  │
  │  db.select().from(leads).where(isNull(deletedAt))   [same pattern as src/app/page.tsx]
  │  → group by stage, compute "esfriando" per Contatado lead (stageChangedAt + 5 days)
  ▼
PipelineBoard (Client Component, "use client")
  │
  │  useOptimistic(initialLeads, reducer)  — local optimistic copy of leads
  ▼
DndContext (from @dnd-kit/core)
  ├── Column "Novo"       ← useDroppable(id: "novo")
  ├── Column "Contatado"  ← useDroppable(id: "contatado")
  ├── Column "Negociação" ← useDroppable(id: "negociacao")
  ├── Column "Fechado"    ← useDroppable(id: "fechado")
  └── Column "Perdido"    ← useDroppable(id: "perdido")
        each contains LeadCard ← useDraggable(id: lead.id)
  │
  │  onDragEnd(event) → startTransition(async () => {
  │    setOptimisticLeads({ id, newStage })      // instant visual move
  │    if (newStage === "perdido") open motivoPerda modal (optional, non-blocking)
  │    await updateLeadStage(id, newStage, motivoPerda)   // Server Action
  │  })
  ▼
updateLeadStage (Server Action, src/actions/lead-actions.ts)
  │  - validates stage via Zod enum
  │  - only bumps stageChangedAt if stage actually changed
  │  - writes motivoPerda if provided
  │  - revalidatePath("/pipeline")
  ▼
SQLite (leads table) — same DB/table as Phase 1's list view
```

Card click (not drag) → opens `lead-form-dialog.tsx` in edit mode, unchanged flow from Phase 1 (D-10).

### Recommended Project Structure
```
src/
├── app/
│   └── pipeline/
│       └── page.tsx              # Server Component: fetch leads, group by stage, compute esfriando
├── components/
│   ├── pipeline-board.tsx        # Client Component: DndContext + useOptimistic + columns
│   ├── pipeline-column.tsx       # useDroppable column, header w/ count, empty state
│   ├── pipeline-lead-card.tsx    # useDraggable card (Nome/Sub-nicho/Follow-up/esfriando border)
│   └── motivo-perda-dialog.tsx   # small optional-field dialog shown on drop into Perdido
├── actions/
│   └── lead-actions.ts           # add updateLeadStage() alongside createLead/updateLead
└── db/
    └── schema.ts                 # extend stage enum, add motivoPerda + stageChangedAt columns
```

### Pattern 1: Minimal multi-column DndContext (core only, no sortable wiring needed)
**What:** One `DndContext` at board root; each column is a drop target via `useDroppable`; each card is a drag source via `useDraggable`. `onDragEnd` reads `event.active.id` (lead id) and `event.over.id` (column/stage id).
**When to use:** Fixed set of columns, moving items *between* columns without needing to reorder position *within* a column (this phase's exact requirement).
**Example:**
```tsx
// Source: https://docs.dndkit.com/api-documentation/context-provider (@dnd-kit/core official docs pattern, verified against installed peerDependencies)
"use client";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";

function PipelineColumn({ stage, children }: { stage: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return <div ref={setNodeRef} data-over={isOver}>{children}</div>;
}

function LeadCard({ id, children }: { id: number; children: React.ReactNode }) {
  const { setNodeRef, listeners, attributes, transform } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
    >
      {children}
    </div>
  );
}

function PipelineBoard() {
  function handleDragEnd(event: DragEndEvent) {
    const leadId = event.active.id as number;
    const newStage = event.over?.id as string | undefined;
    if (!newStage) return; // dropped outside any column — no-op
    // ...optimistic update + Server Action call, see Pattern 2
  }
  return <DndContext onDragEnd={handleDragEnd}>{/* columns */}</DndContext>;
}
```

### Pattern 2: Optimistic move with automatic revert on failure (React 19)
**What:** `useOptimistic` shows the card in its new column instantly; if the Server Action throws (or the DB write fails), React automatically reverts to the last real value once the transition settles — no manual snapshot/rollback code needed.
**When to use:** Any drag-and-drop or click action that calls a Server Action and needs instant visual feedback.
**Example:**
```tsx
// Source: https://react.dev/reference/react/useOptimistic (official docs, fetched this session)
"use client";
import { useOptimistic, startTransition } from "react";
import { updateLeadStage } from "@/actions/lead-actions";

function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [optimisticLeads, setOptimisticStage] = useOptimistic(
    initialLeads,
    (state, { id, stage }: { id: number; stage: string }) =>
      state.map((l) => (l.id === id ? { ...l, stage } : l))
  );

  function handleDragEnd(event: DragEndEvent) {
    const leadId = event.active.id as number;
    const newStage = event.over?.id as string | undefined;
    if (!newStage) return;

    startTransition(async () => {
      setOptimisticStage({ id: leadId, stage: newStage });
      const result = await updateLeadStage(leadId, newStage);
      if (result?.errors) {
        toast.error("Não foi possível mover o lead. Tente novamente.");
        // No manual revert needed: since the Server Component's `initialLeads`
        // prop is only refreshed via revalidatePath() on SUCCESS, a failure
        // means the base state never changed — React reverts optimisticLeads
        // to it automatically once this transition settles.
      }
    });
  }
  // ...render columns using optimisticLeads, not initialLeads
}
```
**Key caveat (verified against react.dev):** the revert is tied to the *transition settling*, not to whether you call `setOptimisticStage` again — on error, simply don't update the base state and don't call the setter again; the optimistic value disappears automatically when the `startTransition` callback's promise resolves/rejects.

### Anti-Patterns to Avoid
- **Calling `setOptimisticStage` outside `startTransition`:** React requires the optimistic setter to run inside a Transition (a `<form action>`, `useActionState`, or explicit `startTransition`) — calling it directly from `onDragEnd` without wrapping will throw or silently fail to revert correctly.
- **Persisting `stageChangedAt` via a Drizzle `.default(sql\`(unixepoch())\`)` added through `ALTER TABLE ADD COLUMN` on the existing non-empty table:** SQLite rejects non-constant defaults on `ADD COLUMN` for tables with rows (see Common Pitfalls) — this will fail migration, not silently succeed.
- **Building a global drag-and-drop "sensor" library from scratch (e.g., manual `mousedown`/`mousemove` tracking) instead of `@dnd-kit`'s sensors:** reinvents pointer/touch/keyboard accessibility handling `@dnd-kit` already solves.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag gesture detection (pointer/touch/keyboard) | Custom `mousedown`/`mousemove`/`touchstart` handlers | `@dnd-kit/core` sensors (`PointerSensor`, `KeyboardSensor`) | Handles activation thresholds, touch scrolling conflicts, and keyboard drag accessibility — all easy to get subtly wrong by hand |
| Optimistic-update-then-revert bookkeeping | Manual "snapshot before, restore on catch" state management | React 19 `useOptimistic` + `startTransition` | Built into React's rendering model; manual snapshotting is exactly the kind of stateful bug source (stale closures, race conditions between two rapid drags) this hook exists to eliminate |
| SQLite schema migration for existing non-empty tables | Hand-written `ALTER TABLE` scripts run outside drizzle-kit's tracked migration history | `drizzle-kit generate` (schema-only changes) + `drizzle-kit generate --custom` (data-only changes, e.g. the `fechado_perdido` → `fechado` backfill) | Keeps the migration history file-tracked and re-runnable; ad-hoc scripts outside `src/db/migrations/` won't be applied on a fresh machine/deploy |

**Key insight:** every piece of "custom logic" this phase might be tempted to hand-roll (drag detection, optimistic revert, migration bookkeeping) already has a battle-tested, already-adopted-by-this-project solution (`@dnd-kit`, React 19, drizzle-kit) — the only genuinely new code is the `updateLeadStage` Server Action and the esfriando date-math, both of which are a few lines using `date-fns` (already installed).

## Common Pitfalls

### Pitfall 1: Assuming the enum widen requires a full SQLite table rebuild
**What goes wrong:** Drizzle's SQLite dialect has no native `ENUM` type; a `text(..., { enum: [...] })` column is TypeScript-only sugar. Assuming otherwise, a planner might schedule a "12-step table rebuild" task (Drizzle's usual pattern for column type/constraint changes) that isn't actually needed here.
**Why it happens:** Other Drizzle dialects (Postgres) do have real SQL `ENUM` types that genuinely require rebuild-style migrations on change; it's easy to over-generalize that expectation to SQLite.
**How to avoid:** Verified directly in this repo: `src/db/migrations/meta/0000_snapshot.json`'s `stage` column entry is `{"type": "text", ...}` with no enum array recorded. Widening the enum in `schema.ts` and running `drizzle-kit generate` will produce **no SQL** for the `stage` column itself. `[VERIFIED: this repo's own migration snapshot, read directly this session]`
**Warning signs:** If `drizzle-kit generate` unexpectedly proposes an `ALTER TABLE ... RENAME TO ... ; CREATE TABLE ...` rebuild sequence for `leads` when only the enum changed, something else in the schema diff is triggering it — investigate before accepting.

### Pitfall 2: Adding `stageChangedAt` with a non-constant default on a non-empty table
**What goes wrong:** Following the existing `createdAt`/`updatedAt` pattern (`integer(...).notNull().default(sql\`(unixepoch())\`)`) for the *new* `stageChangedAt` column will make drizzle-kit emit `ALTER TABLE leads ADD COLUMN stage_changed_at integer NOT NULL DEFAULT (unixepoch())` — which SQLite **rejects** on a table that already has rows, because `(unixepoch())` is a parenthesized expression, not a constant, and SQLite's `ADD COLUMN` only allows constant defaults (or `NULL`) once a table is non-empty.
**Why it happens:** `createdAt`/`updatedAt` used this exact pattern safely — but only because they were part of the *original* `CREATE TABLE` statement (table was empty at creation time), not added later via `ADD COLUMN` to an already-populated table.
**How to avoid:** Add `stageChangedAt` as nullable with no default (`integer("stage_changed_at", { mode: "timestamp" })`, no `.notNull()`, no `.default(...)`), then in the same **custom** migration that backfills `fechado_perdido` → `fechado`, also run `UPDATE leads SET stage_changed_at = unixepoch() WHERE stage_changed_at IS NULL;` (a literal computed-at-migration-time value in an `UPDATE` statement is fine — the restriction is specifically on column `DEFAULT` clauses in `ADD COLUMN`, not on `UPDATE` statements). Enforce "always populated going forward" at the application layer (every `updateLeadStage` call sets it), not via a SQL `NOT NULL` constraint, to keep this migration simple at this data volume (2 rows).
**Warning signs:** `drizzle-kit migrate` (or manual `sqlite3` apply) throwing `Cannot add a NOT NULL column with default value NULL` or a syntax/constraint error mentioning the default expression. `[VERIFIED: sqlite.org/lang_altertable.html — "the column may not have a default value of CURRENT_TIME, CURRENT_DATE, CURRENT_TIMESTAMP, or an expression in parentheses" — for non-empty tables]`

### Pitfall 3: Forgetting to gate `stageChangedAt` updates on an actual stage change
**What goes wrong:** If `updateLeadStage` (or the general `updateLead` action, if stage edits are ever routed through it too) unconditionally sets `stageChangedAt = now()` on every save, editing unrelated fields (notas, follow-up date) from the reopened `lead-form-dialog.tsx` would reset the esfriando clock, defeating D-06 ("last stage change," not "last edit").
**Why it happens:** It's the path of least resistance to just always touch the timestamp in a generic update handler.
**How to avoid:** Compare `previousStage !== newStage` before touching `stageChangedAt`; only the dedicated drag-driven `updateLeadStage` action (or a stage-field change detected inside the generic `updateLead` action) should bump it.
**Warning signs:** A lead's esfriando border disappearing after the admin edits unrelated notes without actually moving it between columns.

### Pitfall 4: `@dnd-kit` drag handle covering the whole card and swallowing the click-to-edit interaction (D-10)
**What goes wrong:** `useDraggable`'s `listeners` (pointer/touch handlers) applied to the entire card element can intercept the click event needed to open `lead-form-dialog.tsx` on a plain click (no drag).
**Why it happens:** `@dnd-kit` distinguishes drag-vs-click via an activation distance/delay threshold on the sensor, not automatically — if not configured, a "click" and a "0px drag" can be ambiguous.
**How to avoid:** Configure a `PointerSensor` with an `activationConstraint: { distance: 8 }` (or similar) so small movements register as clicks, not drags; `@dnd-kit`'s own docs/examples note this exact card-click-vs-drag pattern for kanban boards. `[CITED: docs.dndkit.com sensor activation constraints — this is documented sensor configuration, standard for exactly this "clickable draggable card" scenario]`
**Warning signs:** Clicking a card (without moving the mouse) opens no modal, or opens it inconsistently depending on tiny mouse jitter.

## Code Examples

See Architecture Patterns section above for the two load-bearing examples (DndContext/useDroppable/useDraggable setup, and the `useOptimistic` + `startTransition` + Server Action integration). Both are the complete patterns needed; no additional snippets required for this narrow phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@dnd-kit/sortable`'s `SortableContext` is not required to satisfy PIPE-02 (cross-column move only, no intra-column reordering requirement) | Standard Stack / Pattern 1 | Low — if the planner decides intra-column ordering matters after all, `SortableContext` wiring is additive, not a rework; package is already being installed either way |
| A2 | Package legitimacy of `@dnd-kit/core`/`@dnd-kit/sortable` (slopcheck could not run in this environment) | Package Legitimacy Audit | Low — mitigated by 20M+/week downloads, matching official GitHub org (`clauderic/dnd-kit`), and prior independent verification in this project's own `STACK.md` (npm registry, 2026-07-19) |
| A3 | `PointerSensor` `activationConstraint: { distance: 8 }` is the right configuration to disambiguate card-click-to-edit from drag-start | Common Pitfall 4 | Low-Medium — exact distance value is a UX tuning detail, not a correctness risk; worst case the admin needs a slightly different threshold, easy to adjust post-implementation |

## Open Questions

1. **Should `updateLeadStage` be a separate Server Action, or should `updateLead` be extended to also accept a bare stage-only payload?**
   - What we know: `createLead`/`updateLead` in `lead-actions.ts` both take full `FormData` validated by the full `leadSchema` (nome, telefone, canal, etc. all required) — a drag-and-drop stage change has none of that data available, only `{ id, newStage, motivoPerda? }`.
   - What's unclear: Whether the planner should write a lean, separate action (recommended) or thread a "partial update" path through the existing one.
   - Recommendation: Add a small dedicated `updateLeadStage(id, stage, motivoPerda?)` Server Action with its own minimal Zod schema (`stageUpdateSchema`), called directly (not via `useActionState`/`formAction`, since it's triggered by a drag event, not a form submit) — keeps `updateLead`'s full-form validation untouched and matches the async-function-call pattern shown in Pattern 2 above.

2. **Where exactly does the "esfriando" 5-day check run — Server Component (baked into the initial payload) or Client Component (computed against `Date.now()` on each render)?**
   - What we know: D-06/D-07 only specify the rule (5+ days in Contatado since last stage change), not where to compute it.
   - What's unclear: A Server-Component-computed flag can go stale if the admin leaves the tab open for days without a refresh; a Client-Component computation re-evaluates on every render/navigation.
   - Recommendation: Compute in the Server Component at fetch time (simplest, matches existing `page.tsx` pattern of doing date logic server-side) — acceptable staleness risk since `revalidatePath` re-fetches on every mutation and the admin is expected to reload periodically; not worth client-side re-computation complexity for a solo internal tool.

## Sources

### Primary (HIGH confidence)
- `sqlite.org/lang_altertable.html` — official SQLite docs, `ADD COLUMN` default-value restrictions on non-empty tables
- `react.dev/reference/react/useOptimistic` — official React docs, fetched this session, confirms revert-on-transition-settle semantics
- `orm.drizzle.team/docs/kit-custom-migrations` — official Drizzle docs, `drizzle-kit generate --custom` for data-only migrations
- This repo directly: `src/db/schema.ts`, `src/db/migrations/0000_gifted_slapstick.sql`, `src/db/migrations/meta/0000_snapshot.json`, `src/actions/lead-actions.ts`, `src/components/etapa-badge.tsx`, `src/components/lead-form-dialog.tsx`, `package.json`, live query against `./data/crm.db` (confirmed 2 total leads, both `fechado_perdido`)
- `npm view @dnd-kit/core` / `npm view @dnd-kit/sortable` (version, peerDependencies, dependencies, repository.url, scripts) — run live this session

### Secondary (MEDIUM confidence)
- `api.npmjs.org/downloads/point/last-week/...` — live download counts for both `@dnd-kit` packages (20.7M and 20.3M/week respectively)

### Tertiary (LOW confidence)
- WebSearch results on general `@dnd-kit` kanban tutorials (LogRocket, dev.to, plaintext-engineering) — used only to corroborate the general `DndContext`/`useDraggable`/`useDroppable` shape, not relied on for any specific claim; the actual code pattern in this document is written directly from verified peer-dependency-confirmed API knowledge, not copied from any single tutorial
- `docs.dndkit.com` sensor `activationConstraint` citation (Pitfall 4) — not independently re-fetched this session, based on well-established training knowledge of dnd-kit's documented sensor API; flagged `[CITED]` rather than `[VERIFIED]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions/peer-deps/downloads all confirmed live via `npm view` and npmjs.org API this session
- Architecture (migration mechanics): HIGH — verified directly against this repo's own migration snapshot file and official SQLite/Drizzle/React docs
- Architecture (dnd-kit wiring): MEDIUM-HIGH — API shape confirmed via peer-dependency check and general knowledge; exact sensor tuning (Pitfall 4) is CITED not independently re-verified this session
- Pitfalls: HIGH — the two most consequential pitfalls (enum-widen no-op, ADD COLUMN default restriction) are both verified against this repo's actual files / official SQLite docs, not assumed

**Research date:** 2026-07-21
**Valid until:** 30 days (stable, mature libraries; SQLite/Drizzle mechanics don't change on this timescale)
