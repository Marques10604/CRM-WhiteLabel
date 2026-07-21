# Phase 3: Sales Pipeline & Funnel View - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 11 (2 modified, 9 new/created)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/db/schema.ts` (modify) | model | CRUD | itself (in-place enum widen + 2 new columns) | exact (self-modify) |
| `src/db/migrations/0001_*.sql` + custom data migration | migration | batch | `src/db/migrations/0000_gifted_slapstick.sql` + Drizzle custom-migration convention | role-match (no prior custom migration exists in repo, first one) |
| `src/lib/validations.ts` (modify — add `stageUpdateSchema`, extend `stage` enum, add `motivoPerda`) | utility | transform | itself, `leadSchema` in same file | exact (self-modify) |
| `src/actions/lead-actions.ts` (modify — add `updateLeadStage`) | service (Server Action) | CRUD / request-response | `updateLead` in same file | exact |
| `src/components/etapa-badge.tsx` (modify — split `fechado_perdido` → `fechado`/`perdido`) | component | transform | itself, `STAGE_CONFIG` map | exact (self-modify) |
| `src/app/pipeline/page.tsx` (new) | route (Server Component) | request-response | `src/app/page.tsx` | exact |
| `src/components/pipeline-board.tsx` (new) | component (client) | event-driven | `src/components/lead-table.tsx` | role-match (closest "root client component orchestrating dialog state + data" analog) |
| `src/components/pipeline-column.tsx` (new) | component | transform | `src/components/lead-table.tsx` (empty-state block) | partial (no droppable/column analog exists; empty-state copy pattern reused) |
| `src/components/pipeline-lead-card.tsx` (new) | component | transform | `src/components/lead-table-columns.tsx` (cell renderers) + `etapa-badge.tsx` | partial (no draggable-card analog exists; field display + badge-style patterns reused) |
| `src/components/motivo-perda-dialog.tsx` (new) | component (dialog) | event-driven | `src/components/discard-changes-dialog.tsx` | role-match (small confirm/optional-field dialog with Dialog primitives) |
| `src/components/app-sidebar.tsx` (modify — add "Pipeline" nav item) | component | transform | itself, `NAV_ITEMS` array | exact (self-modify) |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD) — modify in place

**Analog:** itself (current `leads` table definition), lines 16-41

**Current stage enum + column to widen** (lines 22-33):
```typescript
stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado_perdido"] })
  .notNull()
  .default("novo"),
deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
```

**Pattern to apply:**
1. Widen the enum in place: `enum: ["novo", "contatado", "negociacao", "fechado", "perdido"]`. Per RESEARCH.md Pitfall 1, this produces **zero SQL diff** on `drizzle-kit generate` — it's TS-only narrowing, no migration needed for this specific change.
2. Add two **new nullable** columns, following the existing nullable-timestamp convention already used for `deletedAt` (no `.default(...)`, no `.notNull()` — critical per Pitfall 2, do NOT copy the `createdAt`/`updatedAt` pattern with `sql\`(unixepoch())\`` default for these, since they're being added via `ADD COLUMN` to a non-empty table):
```typescript
motivoPerda: text("motivo_perda"), // nullable, D-03
stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, backfilled via custom migration
```
3. Existing index convention (lines 35-40) — no new index strictly required for `motivoPerda`/`stageChangedAt` per the phase scope (only `leads_stage_idx` already exists and remains valid).

---

### Migration: enum widen (no-op) + 2 new columns + custom data backfill

**Analog:** `src/db/migrations/0000_gifted_slapstick.sql` (only existing migration — establishes the project's raw-SQL style/convention) + Drizzle's `drizzle-kit generate --custom` workflow (no prior custom migration exists in this repo; this will be the first)

**Existing migration style** (full file, 27 lines) shows:
```sql
CREATE TABLE `leads` (
	...
	`stage` text DEFAULT 'novo' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	...
);
--> statement-breakpoint
CREATE INDEX `leads_deleted_at_idx` ON `leads` (`deleted_at`);--> statement-breakpoint
```
Note the `--> statement-breakpoint` separator convention drizzle-kit uses between statements — any hand-written custom migration SQL must follow this same separator so drizzle-kit's runner splits statements correctly.

**Steps for the new migration (per RESEARCH.md, verified against `sqlite.org/lang_altertable.html`):**
1. Run `npx drizzle-kit generate` after widening the `stage` enum + adding the two nullable columns in schema.ts. Expect it to emit **only**:
   ```sql
   ALTER TABLE `leads` ADD `motivo_perda` text;--> statement-breakpoint
   ALTER TABLE `leads` ADD `stage_changed_at` integer;
   ```
   (no `stage` column ALTER — confirms Pitfall 1).
2. Run `npx drizzle-kit generate --custom --name=backfill-fechado-perdido-split` to scaffold an empty custom migration file, then hand-write the data migration:
   ```sql
   UPDATE leads SET stage = 'fechado' WHERE stage = 'fechado_perdido';--> statement-breakpoint
   UPDATE leads SET stage_changed_at = unixepoch() WHERE stage_changed_at IS NULL;
   ```
   Do **not** add a column `DEFAULT (unixepoch())` — that fails on `ADD COLUMN` against the non-empty `leads` table (2 rows) per Pitfall 2; the literal-value `UPDATE` above is the safe substitute.
3. Order matters: the `ADD COLUMN` migration must run before the backfill `UPDATE` migration (drizzle-kit's `_journal.json` sequencing handles this automatically if generated in this order).

---

### `src/lib/validations.ts` (utility, transform) — modify

**Analog:** `leadSchema`, lines 9-40 (self)

**Current stage enum in Zod** (line 37-39):
```typescript
stage: z
  .enum(["novo", "contatado", "negociacao", "fechado_perdido"])
  .default("novo"),
```

**Pattern to apply:**
```typescript
stage: z
  .enum(["novo", "contatado", "negociacao", "fechado", "perdido"])
  .default("novo"),
motivoPerda: z.string().trim().optional(),
```
Plus a new lean schema for the drag-and-drop action (per RESEARCH.md Open Question 1 recommendation — small dedicated schema, not the full `leadSchema`):
```typescript
export const stageUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado", "perdido"]),
  motivoPerda: z.string().trim().optional(),
});
```

---

### `src/actions/lead-actions.ts` (service/Server Action, CRUD) — add `updateLeadStage`

**Analog:** `updateLead`, lines 65-100 (same file)

**Imports pattern** (lines 1-7, unchanged, already present):
```typescript
"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema } from "@/lib/validations";
```

**Core update pattern to follow** (from `updateLead`, lines 65-100):
```typescript
export async function updateLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // ... subnichoExists check, try/catch FK backstop, isNull(deletedAt) guard
  await db
    .update(leads)
    .set(parsed.data)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));

  revalidatePath("/");
  return { success: true };
}
```

**New `updateLeadStage` action must:**
1. Accept a plain object (not `FormData`) since it's called directly from `onDragEnd`, not a form submit — per RESEARCH.md Open Question 1, use `stageUpdateSchema` (not full `leadSchema`) and call it as a plain async function, not via `useActionState`.
2. Follow the same `isNull(leads.deletedAt)` soft-delete guard convention (line 89) — board must never move a soft-deleted lead.
3. **Only bump `stageChangedAt`** when `previousStage !== newStage` (RESEARCH.md Pitfall 3) — requires a `SELECT` of the current `stage` before the `UPDATE`, or a conditional `CASE` in the SQL update, to avoid resetting the esfriando clock on unrelated edits.
4. `revalidatePath("/pipeline")` (not `/`, per RESEARCH.md architecture diagram — this new route's own path).
5. Reuse the exact `isForeignKeyViolation` / try-catch shape is NOT needed here (no `subnichoId` involved in a stage-only update) — keep this action lean, no FK backstop needed.

Example shape (concrete, to hand to planner):
```typescript
export async function updateLeadStage(
  id: number,
  stage: Lead["stage"],
  motivoPerda?: string
): Promise<ActionState> {
  const parsed = stageUpdateSchema.safeParse({ id, stage, motivoPerda });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  await db
    .update(leads)
    .set({
      stage: parsed.data.stage,
      ...(parsed.data.motivoPerda !== undefined ? { motivoPerda: parsed.data.motivoPerda } : {}),
      ...(stageChanged ? { stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));

  revalidatePath("/pipeline");
  return { success: true };
}
```

---

### `src/components/etapa-badge.tsx` (component, transform) — modify

**Analog:** itself, `STAGE_CONFIG`, lines 12-22

**Current combined entry to split:**
```typescript
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo: { label: "Novo", bg: "#F4F4F5", text: "#3F3F46" },
  contatado: { label: "Contatado", bg: "#DBEAFE", text: "#1D4ED8" },
  negociacao: { label: "Negociação", bg: "#FEF3C7", text: "#B45309" },
  fechado_perdido: { label: "Fechado/Perdido", bg: "#E2E8F0", text: "#1E293B" },
};
```

**Replace with** (colors from `03-UI-SPEC.md` Color section, D-05):
```typescript
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo: { label: "Novo", bg: "#F4F4F5", text: "#3F3F46" },
  contatado: { label: "Contatado", bg: "#DBEAFE", text: "#1D4ED8" },
  negociacao: { label: "Negociação", bg: "#FEF3C7", text: "#B45309" },
  fechado: { label: "Fechado", bg: "#DCFCE7", text: "#15803D" },
  perdido: { label: "Perdido", bg: "#FEE2E2", text: "#B91C1C" },
};
```
`STAGE_OPTIONS` (lines 20-22) and the `EtapaBadge` component itself (lines 24-36) need **no changes** — they derive from `STAGE_CONFIG` generically. This file is also consumed by `lead-form-dialog.tsx`'s hardcoded `STAGE_OPTIONS` array (lines 54-59 of that file) and `lead-table-columns.tsx` (`cell: ({ row }) => <EtapaBadge stage={row.original.stage} />`, line 79) — both keep working unchanged since they just pass through the `Stage` type, but `lead-form-dialog.tsx`'s own duplicated `STAGE_OPTIONS` constant (see below) must be updated too.

---

### `src/components/lead-form-dialog.tsx` (modify — extend for `motivoPerda`, split stage options)

**Analog:** itself, lines 54-59 (`STAGE_OPTIONS`) and lines 256-285 (`stage` Field block)

**Current duplicated stage options** (lines 54-59 — separate from `etapa-badge.tsx`'s `STAGE_OPTIONS`, must be kept in sync manually, same as today):
```typescript
const STAGE_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado_perdido", label: "Fechado/Perdido" },
] as const;
```
Update to the 5-value list (`fechado`, `perdido` split) — same shape.

**Conditional field pattern to copy** — this codebase does not yet have a "field visible only when another field has value X" example, but the existing `Field`/`FieldContent`/`FieldError` structure (lines 256-285, the `stage` Field block) is the direct template for adding a conditionally-rendered `motivoPerda` Field right after it in the "Negócio" section:
```tsx
<Field data-invalid={!!errors.stage}>
  <FieldLabel htmlFor="stage">Etapa</FieldLabel>
  <FieldContent>
    <Controller
      control={form.control}
      name="stage"
      render={({ field }) => (
        <Select /* ...as today, with 5 STAGE_OPTIONS... */ />
      )}
    />
    <FieldDescription>Onde esse lead está no funil de vendas.</FieldDescription>
    <FieldError errors={[errors.stage]} />
  </FieldContent>
</Field>
```
Add immediately after, watching `form.watch("stage")` to conditionally render (per `03-UI-SPEC.md` Copywriting Contract: label "Motivo da perda", textarea, optional, shown only when stage === "perdido"), using the same `Textarea` + `Field` pattern already used for `notas` (lines 307-314).

---

### `src/app/pipeline/page.tsx` (route, Server Component, request-response) — new

**Analog:** `src/app/page.tsx` (full file, 27 lines)

**Full pattern to copy:**
```typescript
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { LeadTable } from "@/components/lead-table";

export default async function Home() {
  const [activeLeads, allSubnichos] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Leads</h1>
      <LeadTable leads={activeLeads} subnichos={allSubnichos} />
    </div>
  );
}
```

**Adapt for `/pipeline`:**
1. Same `db.select().from(leads).where(isNull(leads.deletedAt))` fetch — unfiltered per D-12 (no stage/subnicho filter clause needed, unlike the list).
2. Group fetched leads by `stage` in-memory (5 known keys) — dataset is tiny, no need for a SQL `GROUP BY`/`COUNT`.
3. Compute the "esfriando" flag server-side at this layer (RESEARCH.md Open Question 2 recommendation) using `date-fns` (`differenceInDays(new Date(), lead.stageChangedAt) >= 5`), only for leads where `stage === "contatado"`, and pass the boolean down as a prop into `PipelineBoard`/card data — do not push this computation into the client component.
4. Title changes from "Leads" (28px/600) to "Pipeline" per `03-UI-SPEC.md` Copywriting Contract — same heading style/class.
5. Also fetch `allSubnichos` the same way (needed by the reused `lead-form-dialog.tsx` on card click, D-10).

---

### `src/components/pipeline-board.tsx` (component, client, event-driven) — new

**Analog:** `src/components/lead-table.tsx` (full file, 189 lines) for dialog-state orchestration pattern; RESEARCH.md Pattern 1/2 for the `@dnd-kit`/`useOptimistic` wiring itself (no existing analog in this codebase for drag-and-drop — first such component)

**Dialog-state pattern to copy from `lead-table.tsx`** (lines 34-37, 44-45, 76, 177-185):
```typescript
type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

// ...
const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
// ...
const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;
// ...
<LeadFormDialog
  key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
  open={dialogState.mode !== "closed"}
  onOpenChange={(open) => { if (!open) setDialogState({ mode: "closed" }); }}
  subnichos={subnichos}
  lead={dialogLead}
/>
```
This is the exact mechanism `pipeline-board.tsx` reuses for D-10 (card click opens the same `LeadFormDialog` unmodified in structure) — a card's `onClick` (not drag) sets `dialogState` to `{ mode: "edit", lead }`, identical to the table row's `onClick` (line 137 of `lead-table.tsx`).

**"Novo lead" CTA pattern to copy** (lines 81-86):
```tsx
<Button
  className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
  onClick={() => setDialogState({ mode: "create" })}
>
  Novo lead
</Button>
```

**Drag-and-drop + optimistic pattern:** copy verbatim from RESEARCH.md Architecture Patterns section (Pattern 1 + Pattern 2) — `DndContext` at board root, `useOptimistic` wrapping the `initialLeads` prop, `startTransition` wrapping the `onDragEnd` handler that calls `updateLeadStage`. Configure `PointerSensor` with `activationConstraint: { distance: 8 }` (RESEARCH.md Pitfall 4) so click-to-edit and drag-to-move don't conflict.

**Toast pattern to copy** (same `sonner` convention as `lead-form-dialog.tsx` lines 106-112 / `subnicho-manager.tsx` lines 24-27):
```typescript
toast.success("Lead movido para {etapa}.");
// on error:
toast.error("Não foi possível mover o lead. Tente novamente.");
```

---

### `src/components/pipeline-column.tsx` (component, transform) — new

**Analog:** `src/components/lead-table.tsx` empty-state block (lines 89-103) for empty-state copy/structure convention; RESEARCH.md Pattern 1 for `useDroppable` wiring (no existing droppable-column analog in this codebase)

**Empty-state pattern to adapt** (from `lead-table.tsx`, contrast per D-14 — board's empty column has NO CTA button, unlike the list's empty state which has one):
```tsx
{leads.length === 0 ? (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
    <h2 className="text-[20px] leading-tight font-semibold">Nenhum lead cadastrado ainda</h2>
    <p className="max-w-sm text-sm text-muted-foreground">...</p>
    <Button ...>Novo lead</Button>  {/* <-- OMIT this button for pipeline-column per D-14 */}
  </div>
) : ( ... )}
```
Adapted for the column per `03-UI-SPEC.md`: muted, no button —
```tsx
{columnLeads.length === 0 ? (
  <p className="py-12 text-center text-[14px] text-muted-foreground">
    Nenhum lead nessa etapa
  </p>
) : ( /* cards */ )}
```

**Column structure** (new — `useDroppable` from `@dnd-kit/core`, per RESEARCH.md Pattern 1):
```tsx
const { setNodeRef, isOver } = useDroppable({ id: stage });
return (
  <div ref={setNodeRef} className="flex min-w-[288px] shrink-0 flex-col ...">
    <div className="sticky top-0 ...">{label} · {count}</div>
    <div className="overflow-y-auto ...">{/* cards or empty state */}</div>
  </div>
);
```
Header count copy per `03-UI-SPEC.md`: `"{Nome da etapa} · {contagem}"` (e.g. "Novo · 4"), Heading style (20px/600), count itself Label style (14px/400) — no value roll-up (D-11).

---

### `src/components/pipeline-lead-card.tsx` (component, transform) — new

**Analog:** `src/components/lead-table-columns.tsx` cell renderers (lines 60-100, esp. `followUpDate` cell at line 90: `format(row.original.followUpDate, "dd/MM/yyyy")`) for field-formatting convention; `etapa-badge.tsx` for the "colored indicator" visual pattern applied to the "esfriando" border/label

**Date formatting to reuse** (line 90 of `lead-table-columns.tsx`):
```typescript
format(row.original.followUpDate, "dd/MM/yyyy")
```

**Card fields per D-09:** Nome (Body, 16px/400, most prominent) + Sub-nicho (Label, 14px) + Follow-up date (Label, 14px) — no `EtapaBadge` on the card itself (stage is implied by column, per `03-UI-SPEC.md` note).

**"Esfriando" indicator (D-08, new pattern, colors from `03-UI-SPEC.md`):**
```tsx
<div
  className={cn(
    "rounded-lg border bg-white p-4",
    isEsfriando ? "border-2 border-[#F59E0B]" : "border border-zinc-200"
  )}
>
  {/* nome, subnicho */}
  <div className="flex items-center gap-1 text-[14px]">
    <span>{format(followUpDate, "dd/MM/yyyy")}</span>
    {isEsfriando ? (
      <span className="flex items-center gap-1 text-[#B45309]">
        <Clock className="size-3.5" /> Esfriando
      </span>
    ) : null}
  </div>
</div>
```
`isEsfriando` boolean is a prop passed down from the Server Component (`/pipeline/page.tsx`), not computed in this client component (per RESEARCH.md Open Question 2 recommendation).

**Draggable wiring** (new, from RESEARCH.md Pattern 1, with the click-vs-drag disambiguation from Pitfall 4):
```tsx
const { setNodeRef, listeners, attributes, transform } = useDraggable({ id: lead.id });
```
`onClick` handler (separate from `listeners`/drag events) opens `LeadFormDialog` per D-10, following the exact `onClick={() => setDialogState({ mode: "edit", lead: row.original })}` idiom from `lead-table.tsx` line 137.

---

### `src/components/motivo-perda-dialog.tsx` (component, dialog, event-driven) — new

**Analog:** `src/components/discard-changes-dialog.tsx` (full file, 49 lines) — closest structural match: a small, purpose-built confirmation dialog using the shared `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` primitives, triggered by a parent component's state, with two footer actions (skip/confirm)

**Full structural pattern to copy:**
```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MotivoPerdaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNome: string;
  onSkip: () => void;
  onSave: (motivo: string) => void;
};

export function MotivoPerdaDialog({ open, onOpenChange, leadNome, onSkip, onSave }: MotivoPerdaDialogProps) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Perdido</DialogTitle>
          <DialogDescription>{`Por que "${leadNome}" foi perdido? (opcional)`}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: sem orçamento, escolheu concorrente, não respondeu mais..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>Pular</Button>
          <Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={() => onSave(motivo)}>
            Salvar motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Difference from `discard-changes-dialog.tsx`: this dialog is **non-blocking/optional** (D-04) — the drag/stage-change already happened optimistically before this dialog opens; "Pular" just closes without setting `motivoPerda` (does not revert the drag), whereas `discard-changes-dialog.tsx`'s "Descartar" is a destructive confirm. Uses `variant="outline"` for skip (not `variant="destructive"`) since skipping isn't a destructive action, per `03-UI-SPEC.md`.

---

### `src/components/app-sidebar.tsx` (component, transform) — modify

**Analog:** itself, `NAV_ITEMS` array, lines 7-11

**Current array:**
```typescript
const NAV_ITEMS = [
  { href: "/", label: "Leads" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;
```

**Add one entry** (per D-13 — space already reserved per `01-CONTEXT.md` D-18):
```typescript
const NAV_ITEMS = [
  { href: "/", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;
```
No other changes needed — the `isActive`/`Link`/`cn` rendering logic (lines 22-40) is fully generic over `NAV_ITEMS` and already handles the `pathname.startsWith(item.href)` case correctly for the new route.

## Shared Patterns

### Server Actions (no API routes)
**Source:** `src/actions/lead-actions.ts` lines 36-100 (`createLead`, `updateLead`)
**Apply to:** `updateLeadStage` (new)
```typescript
"use server";
// ...
export async function updateLead(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  // parse with Zod -> subnichoExists guard -> try/catch FK backstop -> db.update(...).where(and(eq(id), isNull(deletedAt))) -> revalidatePath -> return { success: true }
}
```
`updateLeadStage` follows the same shape but is a plain async function (not `useActionState`-bound), called directly from a `startTransition` callback per RESEARCH.md Pattern 2.

### Soft-delete guard
**Source:** `src/actions/lead-actions.ts` line 89, `src/app/page.tsx` line 15
**Apply to:** `/pipeline/page.tsx` fetch query, `updateLeadStage` action
```typescript
.where(and(eq(leads.id, id), isNull(leads.deletedAt)))
// or, for a read-only fetch:
.where(isNull(leads.deletedAt))
```

### Toast notifications (sonner)
**Source:** `src/components/lead-form-dialog.tsx` lines 105-114, `src/components/subnicho-manager.tsx` lines 23-28
**Apply to:** `pipeline-board.tsx` drag success/error, `motivo-perda-dialog.tsx` save
```typescript
useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("Lead salvo com sucesso.");
  } else if (state && "errors" in state) {
    toast.error("Não foi possível salvar o lead. Tente novamente.");
  }
}, [state]);
```

### Teal accent CTA button styling
**Source:** `src/components/lead-table.tsx` lines 81-86, 97-101
**Apply to:** "Novo lead" button on `/pipeline`, "Salvar motivo" button in `motivo-perda-dialog.tsx`
```tsx
className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
```

### `EtapaBadge` / `STAGE_CONFIG` as single source of truth for stage labels/colors
**Source:** `src/components/etapa-badge.tsx` (full file)
**Apply to:** any place a stage label or color is needed outside the pipeline board card itself (board card intentionally omits the badge per D-09) — e.g. if a stage name string is needed anywhere, pull from `STAGE_CONFIG`/`STAGE_OPTIONS`, don't hardcode a third copy of the label strings (the codebase already has one duplication between `etapa-badge.tsx` and `lead-form-dialog.tsx`'s own `STAGE_OPTIONS` — don't add a third).

### Field/Textarea form primitives for optional fields
**Source:** `src/components/lead-form-dialog.tsx` lines 307-314 (`notas` Field, same optional-textarea shape needed for `motivoPerda`)
```tsx
<Field data-invalid={!!errors.notas}>
  <FieldLabel htmlFor="notas">Notas</FieldLabel>
  <FieldContent>
    <Textarea id="notas" aria-invalid={!!errors.notas} {...form.register("notas")} />
    <FieldDescription>Anotações livres sobre esse lead.</FieldDescription>
    <FieldError errors={[errors.notas]} />
  </FieldContent>
</Field>
```
**Apply to:** the conditionally-rendered "Motivo da perda" field in `lead-form-dialog.tsx` (D-10 phase-3).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `pipeline-board.tsx` (drag orchestration parts only — `DndContext`/`useOptimistic` wiring) | component | event-driven | No drag-and-drop or `useOptimistic` component exists yet in this codebase — first use of both. Use RESEARCH.md Architecture Patterns 1 & 2 directly (both cite official `@dnd-kit`/React docs verbatim) instead of a codebase analog. |
| `pipeline-column.tsx` (`useDroppable` wiring specifically) | component | transform | Same reason — no droppable-zone component precedent in this repo. |
| Custom SQL data-migration file | migration | batch | This repo has only one migration (`0000_gifted_slapstick.sql`, a `CREATE TABLE` migration) — no prior `drizzle-kit generate --custom` example exists to copy structure from. Follow Drizzle's own custom-migration convention (RESEARCH.md, `orm.drizzle.team/docs/kit-custom-migrations`) and match the `--> statement-breakpoint` separator style seen in `0000_gifted_slapstick.sql`.

## Metadata

**Analog search scope:** `src/app/`, `src/components/`, `src/actions/`, `src/db/`, `src/lib/`, `src/types/` (entire `src/` tree — small codebase, ~24 files, full scan was cheap)
**Files scanned:** 24 (all `.ts`/`.tsx` files under `src/`, plus `package.json`, `03-CONTEXT.md`, `03-RESEARCH.md`, `03-UI-SPEC.md`)
**Pattern extraction date:** 2026-07-21
