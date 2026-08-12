# Phase 9: Timeline de Interações - Pattern Map

**Mapped:** 2026-08-08
**Files analyzed:** 10 (new + modified)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/db/schema.ts` (+ `interacoes` table) | model | CRUD | `src/db/schema.ts` (`templates`/`leads` table defs, same file) | exact |
| `src/types/index.ts` (+ `Interacao`/`NewInteracao`) | model | transform | `src/types/index.ts` (`Template`/`NewTemplate`, same file) | exact |
| `src/lib/validations.ts` (+ `interacaoManualSchema`, extend `whatsappContactSchema`) | utility | request-response | `src/lib/validations.ts` (`templateSchema`, `whatsappContactSchema`, same file) | exact |
| `src/actions/interacao-actions.ts` (new) | service | CRUD | `src/actions/template-actions.ts` | exact (create/update/soft-delete + read shape) |
| `src/actions/lead-actions.ts` (`registerWhatsAppContact` extended) | service | event-driven / CRUD | `src/actions/template-actions.ts` (`applyDefaultTemplate`, `db.transaction`) | exact (transaction pattern) |
| `src/components/lead-timeline-dialog.tsx` (new) | component | request-response | `src/components/whatsapp-preview-dialog.tsx` (dialog fed by live/local state + fire-and-forget action) | role-match |
| `src/components/whatsapp-preview-dialog.tsx` (modified — pass `texto`) | component | event-driven | same file (existing `onClick` handler) | exact |
| `src/components/lead-table.tsx` / `lead-table-columns.tsx` (+ History icon) | component | request-response | `src/components/lead-table-columns.tsx` (`acoes` column, Pencil/Trash2 buttons) | exact |
| `src/components/pipeline-lead-card.tsx` (+ History icon) | component | request-response | same file (`WhatsAppSendButton` stopPropagation wrapper) | exact |
| `src/components/lead-form-dialog.tsx` (+ "Ver histórico" button) | component | request-response | same file (`DialogFooter` button pattern) | exact |
| `scripts/guard-no-hard-delete.cjs` (extend patterns) | config/test (dev tooling) | batch | same file (`CODE_PATTERNS`/`CODE_SQL_PATTERNS` arrays) | exact |
| New test script (e.g. `scripts/test-interacao-actions.cjs` or extend `verify-wa-contact-invariant.cjs`) | test | batch | `scripts/verify-wa-contact-invariant.cjs` (in-memory better-sqlite3 invariant test) | exact |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** same file, `templates` and `leads` table definitions (lines 18-30, 32-65)

**Core pattern** — table with enum column, FK, soft-delete-nullable column, indexes:
```typescript
// templates (lines 18-30) — enum "tipo", createdAt/updatedAt with sql`(unixepoch())` default
export const templates = sqliteTable(
  "templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo", { enum: ["primeiro_contato", "follow_up", "prova_valor"] }).notNull(),
    nome: text("nome").notNull(),
    corpo: text("corpo").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("templates_tipo_idx").on(table.tipo)]
);

// leads (lines 32-65) — FK with onDelete restrict, nullable deletedAt = "active" convention
subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
```

**Apply to `interacoes`:** Combine both idioms exactly as RESEARCH.md's Code Examples section already drafted (verbatim, already project-idiomatic) — `tipo` enum reusing `templates.tipo` vocabulary + `"nota_manual"`, `leadId` FK `onDelete: "restrict"`, `deletedAt` nullable (only touched for `tipo="nota_manual"`), plus `index(...).on(table.leadId)` and `index(...).on(table.deletedAt)` following `leads_deleted_at_idx`/`leads_subnicho_id_idx` naming (`<table>_<column>_idx`).

---

### `src/types/index.ts` (model, transform)

**Analog:** same file (entire file, 12 lines)

**Pattern** (exact, copy verbatim shape):
```typescript
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { leads, subnichos, templates } from "@/db/schema";

export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;
```
**Apply to:** add `interacoes` to the schema import and append `export type Interacao = InferSelectModel<typeof interacoes>;` / `export type NewInteracao = InferInsertModel<typeof interacoes>;` — no other file defines these types; this is the single source of truth for all Drizzle-inferred row types in the project.

---

### `src/lib/validations.ts` (utility, request-response)

**Analog:** same file — `whatsappContactSchema` (lines 78-86) and `templateSchema` (lines 88-95)

**Core pattern:**
```typescript
export const whatsappContactSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]),
});

export const templateSchema = z.object({
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"], { error: "Selecione um tipo." }),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  corpo: z.string().trim().min(1, "Mensagem é obrigatória."),
  isDefault: z.coerce.boolean().default(false),
});
```
**Apply to:**
- Extend `whatsappContactSchema` with `texto: z.string().trim().min(1, "Mensagem vazia.")` (D-04/D-05 — no `.max()`, no truncation).
- Add `interacaoManualSchema = z.object({ leadId: z.coerce.number().int().positive(), texto: z.string().trim().min(1, "Nota vazia.") })` for create; an edit variant needs `id: z.coerce.number().int().positive()` added, same idiom as `stageUpdateSchema` (line 72-76) which layers `id` on top of a base shape.

---

### `src/actions/interacao-actions.ts` (service, CRUD) — NEW FILE

**Analog:** `src/actions/template-actions.ts` (full file, 116 lines) — closest role/data-flow match: a dedicated actions file for a secondary entity with create/update/delete + a "protected subset" mutation concept (`applyDefaultTemplate` restricting by `tipo`/`isDefault`, mirrored here by restricting by `tipo = "nota_manual"`).

**Imports pattern** (lines 1-8 of `template-actions.ts`):
```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { templateSchema } from "@/lib/validations";
import type { Template } from "@/types";
```

**Create pattern** (lines 33-57, adapt for `createInteracaoManual`):
```typescript
export async function createTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const [inserted] = await db.insert(templates).values({ ...rest, isDefault }).returning({ id: templates.id });
  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}
```
Note: `lead-timeline-dialog.tsx` calls this action imperatively (not via `useActionState`/`<form action>`), so `createInteracaoManual`/`updateInteracaoManual`/`softDeleteInteracaoManual` should take positional args like `registerWhatsAppContact`/`softDeleteLead` (`lead-actions.ts` lines 217-287), not `(_prevState, formData)` — RESEARCH.md's Architectural Responsibility Map confirms the dialog is a client component calling `"use server"` functions imperatively (`useEffect`/`startTransition`), same idiom already established for `registerWhatsAppContact`/`softDeleteLead`.

**Soft-delete-with-type-guard pattern** — this is the load-bearing pattern for D-06 immutability, copy directly from `src/actions/lead-actions.ts:258-269` (`softDeleteLead`) and extend the `where` with `eq(interacoes.tipo, "nota_manual")`:
```typescript
// src/actions/lead-actions.ts:258-269
export async function softDeleteLead(leadId: number): Promise<ActionState> {
  await db
    .update(leads)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/lixeira");
  return { success: true };
}
```
→ `softDeleteInteracaoManual(id)`: `where(and(eq(interacoes.id, id), eq(interacoes.tipo, "nota_manual"), isNull(interacoes.deletedAt)))` — the `eq(interacoes.tipo, "nota_manual")` clause is what makes a WhatsApp-event delete attempt a silent no-op (mirrors the idempotent-no-op idiom already used for delete-of-already-deleted). Same guard clause goes in `updateInteracaoManual`'s `where`.

**Read pattern** (`getInteracoesByLead`) — closest analog is `src/db/queries.ts:14-20` (`getActiveDashboardLeads`, a plain `"use server"`-adjacent async read function, not a Server Action but same query-builder idiom):
```typescript
export async function getActiveDashboardLeads(): Promise<Lead[]> {
  return db
    .select()
    .from(leads)
    .where(and(isNull(leads.deletedAt), notInArray(leads.stage, ["fechado", "perdido"])))
    .orderBy(asc(leads.followUpDate));
}
```
→ `getInteracoesByLead(leadId)`: `db.select().from(interacoes).where(and(eq(interacoes.leadId, leadId), isNull(interacoes.deletedAt))).orderBy(desc(interacoes.createdAt))` — filters soft-deleted manual notes out (A3 in RESEARCH.md: no trash/recovery UI for notes), orders newest-first (A2 assumption, trivial to flip). Decide whether this lives in `interacao-actions.ts` (marked `"use server"`, called imperatively like `registerWhatsAppContact`) or `db/queries.ts` (Server Component style) — since the timeline dialog is a client component with no Server Component ancestor doing prefetch, RESEARCH.md recommends colocating it in `interacao-actions.ts` as a `"use server"` export, consistent with the file being the single home for all `interacoes` mutations+reads.

---

### `src/actions/lead-actions.ts` (`registerWhatsAppContact`, service, event-driven)

**Analog for the transaction wrap:** `src/actions/template-actions.ts:23-31` (`applyDefaultTemplate`)
```typescript
async function applyDefaultTemplate(id: number, tipo: Template["tipo"]) {
  await db.transaction(async (tx) => {
    await tx
      .update(templates)
      .set({ isDefault: false })
      .where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true)));
    await tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id));
  });
}
```

**Function being extended** (`src/actions/lead-actions.ts:217-248`, current code — the insert into `interacoes` must be added inside a `db.transaction()` wrapping both writes, per Pitfall 3 in RESEARCH.md):
```typescript
export async function registerWhatsAppContact(
  leadId: number,
  tipo: Template["tipo"]
): Promise<{ advanced: boolean }> {
  const parsed = whatsappContactSchema.safeParse({ leadId, tipo });
  if (!parsed.success) {
    return { advanced: false };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
  if (!current) {
    return { advanced: false };
  }

  const advanced = parsed.data.tipo === "primeiro_contato" && current.stage === "novo";

  await db
    .update(leads)
    .set({
      contactAttempts: sql`${leads.contactAttempts} + 1`,
      ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return { advanced };
}
```
**Required change:** add `texto` param, extend `whatsappContactSchema.safeParse({ leadId, tipo, texto })`, wrap the `db.update(leads)...` and a new `tx.insert(interacoes).values({ leadId, tipo, texto })` inside `await db.transaction(async (tx) => {...})` — the insert must sit at the same unconditional level as the `contactAttempts` increment, NOT nested inside the `advanced ? {...} : {}` spread (Pitfall 4 in RESEARCH.md).

---

### `src/components/lead-timeline-dialog.tsx` (component, request-response) — NEW FILE

**Analog:** `src/components/whatsapp-preview-dialog.tsx` (full file, 217 lines) — closest match for "a `Dialog` fed by an imperative `"use server"` call keyed on an open/lead pair, not a `useActionState`-bound form".

**Imports + state-reset-on-open pattern** (lines 1-29, 61-90):
```typescript
"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
// ...
import { registerWhatsAppContact } from "@/actions/lead-actions";
import type { Lead, Template } from "@/types";

export function WhatsAppPreviewDialog({ open, onOpenChange, lead, ... }: WhatsAppPreviewDialogProps) {
  const [tipo, setTipo] = useState<Template["tipo"]>(defaultTipo);
  const [texto, setTexto] = useState("");

  // Reinicializa tipo/texto sempre que o modal abre para um lead novo —
  // um único WhatsAppPreviewDialog é reutilizado (controlado por
  // PreviewState), não remontado por item, então o reset precisa ser
  // explícito aqui em vez de depender de useState(initialValue).
  useEffect(() => {
    if (!open || !lead) return;
    // ... fetch/derive on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);
```
**Apply to `lead-timeline-dialog.tsx`:** same `open`/`lead` prop shape (single shared dialog instance, controlled from parent state, mirrors `PreviewState` pattern used by `lead-table.tsx`/`pipeline-board.tsx`), `useEffect` on `[open, lead?.id]` triggers `getInteracoesByLead(lead.id)` and stores the result in local `useState<Interacao[]>([])`, exactly analogous to how the preview dialog derives `texto` on open. The "always-mounted, guard content not the Dialog" comment at lines 104-109 also applies (avoid `if (!lead) return null` unmounting the whole Radix tree).

**Dialog scaffold + footer/fire-and-forget-action pattern** (lines 113-216, especially the `<a onClick>` fire-and-forget block at 175-203):
```typescript
<Dialog open={open && !!lead} onOpenChange={onOpenChange}>
  <DialogContent>
    {lead ? (
      <>
        <DialogHeader>
          <DialogTitle>Pré-visualizar mensagem</DialogTitle>
          <DialogDescription>{subtitulo ?? `Mensagem para ${lead.nome}`}</DialogDescription>
        </DialogHeader>
        {/* ... */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </>
    ) : null}
  </DialogContent>
</Dialog>
```
Use `className="max-w-lg"` or larger on `DialogContent` (per `template-form-dialog.tsx:110`) since the list can be long (D-02's stated reason for a dedicated surface) — no `Sheet`/`Drawer` primitive exists in `src/components/ui/`, RESEARCH.md's Alternatives Considered confirms `Dialog` with wider `max-w` is the correct in-repo primitive, not a new one.

**Manual-note form (create/edit) sub-pattern:** `src/components/template-form-dialog.tsx` (full file) — react-hook-form + `zodResolver(interacaoManualSchema)`, raw-`FormData`-from-DOM submit via `formRef`, same `useActionState` + `useEffect` success/error toast idiom (lines 67-104 of that file). Row-level Pencil/Trash2 icon buttons for `tipo === "nota_manual"` rows only — copy `lead-table-columns.tsx:141-168`'s icon-button-with-`stopPropagation` shape (list context differs — no parent-row `onClick` here, so `stopPropagation` may not be strictly required, but keep the `aria-label` + `size="icon-lg"` + `variant="ghost"` idiom).

---

### `src/components/whatsapp-preview-dialog.tsx` (modified, event-driven)

**Analog:** same file, the existing `onClick` handler (lines 180-195) — this is the exact call site to extend, not copy elsewhere:
```typescript
onClick={() => {
  onOpenChange(false);
  if (!lead) return;
  const leadId = lead.id;
  const nome = lead.nome;
  registerWhatsAppContact(leadId, tipo)
    .then((result) => {
      if (result.advanced) {
        toast.success(`${nome} avançou para Contatado.`);
      }
    })
    .catch(() => {
      // Silencioso por design: a aba do WhatsApp já abriu,
      // exibir erro sobre ela confundiria o admin.
    });
}}
```
**Required change:** pass `texto` (already in scope as component state, lines 71/152-154) as the 3rd argument: `registerWhatsAppContact(leadId, tipo, texto)`. No new plumbing — `texto` is already a closure variable at this exact point (D-04 explicitly calls this out as a non-issue).

---

### `src/components/lead-table.tsx` / `lead-table-columns.tsx` (component, request-response)

**Analog:** `src/components/lead-table-columns.tsx:131-169` (the `acoes` column cell) — exact shape for a 3rd icon button:
```typescript
cell: ({ row, table }) => (
  <div className="flex items-center gap-1">
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={`Editar ${row.original.nome}`}
      onClick={(event) => {
        event.stopPropagation();
        table.options.meta?.onEditLead?.(row.original);
      }}
    >
      <Pencil className="size-4" />
    </Button>
    {/* Trash2 button follows same shape */}
  </div>
),
```
**Apply to:** add a `History` icon button (lucide-react, confirmed installed) before/after Pencil following the identical `size="icon-lg"` + `variant="ghost"` + `stopPropagation` + `aria-label` shape; extend the `TableMeta` declaration (lines 17-23) with `onViewTimeline?: (lead: LeadRow) => void`. Note `lead-table.tsx` itself (lines 250-297) has a second, hand-rolled copy of this same row-actions markup (not driven by `leadTableColumns`, per the file's own comment at columns.tsx:76-83 — "o corpo da lista de /leads é renderizado por markup customizado") — the History icon must be added in **both** places: `lead-table.tsx:250-297`'s inline `<Button>` group (analog: the `Pencil`/`Trash2` buttons at lines 273-296) AND `lead-table-columns.tsx` (kept as the sort/filter source of truth even though not rendered — verify whether it's actually dead code for `acoes` or still used elsewhere before touching both).

---

### `src/components/pipeline-lead-card.tsx` (component, request-response)

**Analog:** same file, the `WhatsAppSendButton` wrapper (lines 62-77) — this is the load-bearing pattern for Pitfall 5 in RESEARCH.md:
```typescript
<div className="flex items-start justify-between gap-2">
  <span className="text-[16px] leading-normal font-normal text-foreground">{lead.nome}</span>
  {/* stopPropagation em pointerdown/click: impede que o botão vire drag-handle
      (useDraggable listeners no wrapper) ou dispare o onClick de edição do card. */}
  <div
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => event.stopPropagation()}
  >
    <WhatsAppSendButton
      nome={lead.nome}
      disabled={normalizePhone(lead.telefone) === null}
      onClick={onSendWhatsApp}
    />
  </div>
</div>
```
**Apply to:** add a `History` icon button inside the same (or a sibling) `onPointerDown`/`onClick`-`stopPropagation` wrapper — the card's outer `<div>` has `{...listeners} {...attributes}` from `useDraggable` (line 35-37) plus its own `onClick` (line 46), so any new interactive element needs this exact double-stopPropagation treatment or it becomes a drag-handle / triggers card edit (Pitfall 5, explicitly documented in RESEARCH.md). Add a new `onViewHistory: () => void` prop to `PipelineLeadCardProps` (line 11-17), same shape as existing `onSendWhatsApp`.

---

### `src/components/lead-form-dialog.tsx` (component, request-response)

**Analog:** same file, `DialogFooter` (lines 448-460):
```typescript
<DialogFooter className="mx-0 mb-0 rounded-none border-t-0 bg-transparent p-0">
  <Button type="button" variant="outline" onClick={() => closeWithDiscardGuard(false)} disabled={pending}>
    Cancelar
  </Button>
  <Button type="submit" disabled={pending}>
    {pending ? "Salvando..." : "Salvar"}
  </Button>
</DialogFooter>
```
**Apply to:** insert a `variant="outline"` "Ver histórico" button before "Cancelar", gated by `isEditMode` (per RESEARCH.md's Open Question #1 recommendation — footer placement, only in edit mode since a not-yet-created lead has no history) — `onClick` opens local timeline-dialog state (`lead` already in scope as the `lead` prop, line 91). This does not touch the 3 existing sections (D-01 requirement that "Acompanhamento"/`notas` stays untouched).

---

### `scripts/guard-no-hard-delete.cjs` (config/dev-tooling, batch)

**Analog:** same file — `CODE_PATTERNS` (line 49) and `CODE_SQL_PATTERNS` (lines 55-60), which are hardcoded per-table (not generic), exactly as flagged in CONTEXT.md/RESEARCH.md Pitfall 1:
```javascript
const CODE_PATTERNS = [/\.delete\(\s*leads\b/, /\.delete\(\s*subnichos\b/];

const CODE_SQL_PATTERNS = [
  /\bDELETE\s+FROM\s+[`"']?leads\b/i,
  /\bDELETE\s+FROM\s+[`"']?subnichos\b/i,
  /\bDROP\s+TABLE\s+[`"']?leads\b/i,
  /\bDROP\s+TABLE\s+[`"']?subnichos\b/i,
];
```
**Required change (same commit that adds `interacoes` to `schema.ts` — STATE.md §Blockers explicitly requires this):**
```javascript
const CODE_PATTERNS = [
  /\.delete\(\s*leads\b/,
  /\.delete\(\s*subnichos\b/,
  /\.delete\(\s*interacoes\b/,
];

const CODE_SQL_PATTERNS = [
  /\bDELETE\s+FROM\s+[`"']?leads\b/i,
  /\bDELETE\s+FROM\s+[`"']?subnichos\b/i,
  /\bDROP\s+TABLE\s+[`"']?leads\b/i,
  /\bDROP\s+TABLE\s+[`"']?subnichos\b/i,
  /\bDELETE\s+FROM\s+[`"']?interacoes\b/i,
  /\bDROP\s+TABLE\s+[`"']?interacoes\b/i,
];
```
Note this deliberately does NOT block `interacoes.tipo = "nota_manual"` soft-deletes (those use `.update(interacoes)...set({ deletedAt: ... })`, not `.delete(interacoes...)`) — same distinction the guard already makes for `leads`/`subnichos`.

---

### Test script (new, e.g. `scripts/test-interacao-actions.cjs`) (test, batch)

**Analog:** `scripts/verify-wa-contact-invariant.cjs` (full file, 126 lines) — in-memory `better-sqlite3` reproduction of production write logic, no ORM, pure assertion script run via `node scripts/....cjs`.

**Core pattern:**
```javascript
const Database = require("better-sqlite3");
const db = new Database(":memory:");

db.exec(`CREATE TABLE leads (...); CREATE TABLE interacoes (...);`);
db.exec(`INSERT INTO leads (...) VALUES (...);`);

// mirror the exact WHERE-guard logic from production (Pattern 2 in RESEARCH.md)
function softDeleteInteracaoManual(id) {
  return db.prepare(
    "UPDATE interacoes SET deleted_at = unixepoch() WHERE id = ? AND tipo = 'nota_manual' AND deleted_at IS NULL"
  ).run(id).changes;
}

// assert: attempting to soft-delete a WhatsApp-event row is a silent no-op (changes === 0)
```
**Apply to:** cover Pitfall 2 (immutability bypass attempt on a `tipo != "nota_manual"` row must be a no-op) and Pitfall 4 (interaction recorded for `follow_up`/`prova_valor`, not just `primeiro_contato`) explicitly — both are named as "Warning signs" requiring exactly this kind of test in RESEARCH.md. Also see `scripts/test-lead-actions.cjs` for the pattern of testing against a real (temp-copy) SQLite file rather than a hand-built in-memory schema, if `interacoes`' FK-to-`leads` makes the in-memory reproduction too heavy — the 08-03 commit (`criar guarda permanente verify-origem-tipo + teste de mutacao em copia temporaria`, per git log) is a recent precedent for that "temp copy of real db" style if needed.

---

## Shared Patterns

### Soft-delete via `deletedAt` (D-06/D-07)
**Source:** `src/actions/lead-actions.ts:258-269` (`softDeleteLead`)
**Apply to:** `softDeleteInteracaoManual` in `interacao-actions.ts` — same `sql\`(unixepoch())\`` set + idempotent `where` restricted to still-active rows, PLUS an additional `eq(interacoes.tipo, "nota_manual")` clause (the type-guard is unique to this fase's asymmetric-mutability requirement, D-06).
```typescript
.update(leads)
.set({ deletedAt: sql`(unixepoch())` })
.where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));
```

### `"use server"` mutation shape (Zod parse → conditional SELECT → write → revalidatePath)
**Source:** `src/actions/lead-actions.ts` (all exports), `src/actions/template-actions.ts` (all exports)
**Apply to:** every new function in `interacao-actions.ts`. Positional-args style (not `(_prevState, formData)`) for imperatively-called actions (`registerWhatsAppContact`, `softDeleteLead` are the model — used from `onClick`/`useEffect`, not `<form action>`).

### Atomic multi-write via `db.transaction()`
**Source:** `src/actions/template-actions.ts:23-31` (`applyDefaultTemplate`)
**Apply to:** `registerWhatsAppContact`'s extended body (lead update + interacoes insert must commit together).

### `revalidatePath` fan-out
**Source:** every action in `lead-actions.ts`/`template-actions.ts` (e.g. lines 244-247, 264-267, 282-286)
**Apply to:** all `interacao-actions.ts` writes should revalidate `"/"`, `"/leads"`, `"/pipeline"` (the 3 surfaces per D-03 that show the History icon/button) — no dedicated `/interacoes` route exists, so no route-specific revalidation is needed beyond the 3 existing surfaces plus wherever the lead-form-dialog is mounted.

### Icon-button-with-`stopPropagation` in list/card row context
**Source:** `src/components/lead-table-columns.tsx:141-168`, `src/components/pipeline-lead-card.tsx:62-77`
**Apply to:** the `History` icon at all 3 D-03 entry points — `variant="ghost"`, `size="icon-lg"`, `aria-label` with lead name, `event.stopPropagation()` on click (and `onPointerDown` too, specifically in `pipeline-lead-card.tsx` due to `useDraggable`).

### Conditional indicator ("only show if relevant")
**Source:** `src/components/pipeline-lead-card.tsx:84-97` (`isEsfriando`/`contactAttempts > 0` conditional rendering)
**Apply to:** CONTEXT.md flags this as an open question for the History icon (always visible vs. only when ≥1 event exists) — RESEARCH.md doesn't resolve it; planner should decide, but the codebase's established idiom is "hide indicator/count when zero, but always show the action button itself" (e.g. the WhatsApp send button is always shown regardless of `contactAttempts`) — suggests the History icon itself should likely always render (consistent access point per D-03), independent of whether any interactions exist yet.

## No Analog Found

None — every file in scope has a direct or role-matched analog already in the codebase; this phase is explicitly additive within established idioms (RESEARCH.md: "nenhuma tecnologia nova entra no projeto").

## Metadata

**Analog search scope:** `src/db/schema.ts`, `src/types/index.ts`, `src/lib/validations.ts`, `src/actions/*.ts`, `src/components/*.tsx`, `src/db/queries.ts`, `scripts/*.cjs`
**Files scanned:** 16 (schema.ts, lead-actions.ts, template-actions.ts, validations.ts, types/index.ts, whatsapp-preview-dialog.tsx, template-form-dialog.tsx, pipeline-lead-card.tsx, lead-table.tsx, lead-table-columns.tsx, lead-form-dialog.tsx, delete-lead-dialog.tsx, db/queries.ts, guard-no-hard-delete.cjs, verify-wa-contact-invariant.cjs, directory listings of src/actions + src/components + scripts)
**Pattern extraction date:** 2026-08-08
