# Phase 4: Follow-up Dashboard & WhatsApp Outreach - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 16 (10 new, 6 modified)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/page.tsx` (MODIFIED → new dashboard) | route (Server Component) | CRUD (read + grouping) | `src/app/pipeline/page.tsx` | exact |
| `src/app/leads/page.tsx` (NEW, literal move) | route (Server Component) | CRUD | `src/app/page.tsx` (current content, pre-move) | exact |
| `src/app/templates/page.tsx` (NEW) | route (Server Component) | CRUD | `src/app/subnichos/page.tsx` | exact |
| `src/actions/lead-actions.ts` (MODIFIED — `createLead` returns created `Lead`) | server action | CRUD | itself (existing `createLead`/`updateLead`) | exact |
| `src/actions/template-actions.ts` (NEW) | server action | CRUD | `src/actions/subnicho-actions.ts` (CRUD+uniqueness) + `updateLeadStage` in `lead-actions.ts` (SELECT-then-compare/transaction shape) | exact |
| `src/db/schema.ts` (MODIFIED + `templates` table) | model | CRUD | itself (`subnichos` table definition) | exact |
| `src/db/queries.ts` (NEW, implied — Pitfall 5 shared query helper) | model / query helper | CRUD | `src/app/pipeline/page.tsx` (inline active-leads query, to be extracted) | role-match |
| `src/lib/whatsapp.ts` (NEW) | utility | transform | `src/lib/phone.ts` + `src/lib/money.ts` | role-match |
| `src/lib/validations.ts` (MODIFIED + `templateSchema`) | utility / schema | request-response validation | itself (`leadSchema`/`subnichoSchema`) | exact |
| `src/hooks/use-first-contact-trigger.ts` (NEW) | hook | event-driven | `pipeline-board.tsx`'s local dialog-state pattern (`useState<DialogState>`/`useState<MotivoPerdaState>`) | partial (no prior `hooks/` dir exists) |
| `src/components/whatsapp-preview-dialog.tsx` (NEW) | component (dialog) | request-response (client-only, no mutation) | `src/components/motivo-perda-dialog.tsx` | exact |
| `src/components/whatsapp-send-button.tsx` (NEW) | component | request-response | icon-only button in `src/components/subnicho-manager.tsx` (Pencil, `h-9 w-9`) | role-match |
| `src/components/followup-dashboard.tsx` (NEW) | component | CRUD (display, grouped sections) | `src/components/pipeline-column.tsx` + `src/components/pipeline-board.tsx` | role-match |
| `src/components/template-form-dialog.tsx` (NEW) | component (form dialog) | CRUD | `src/components/lead-form-dialog.tsx` | exact |
| `src/components/template-list.tsx` (NEW, implied — `/templates` needs a list/manager component) | component | CRUD | `src/components/subnicho-manager.tsx` | exact |
| `src/components/delete-template-dialog.tsx` (NEW, implied — D-13 hard-delete confirmation) | component (confirm dialog) | request-response | `src/components/discard-changes-dialog.tsx` | role-match |
| `src/components/app-sidebar.tsx` (MODIFIED — relabel `/`, add `/leads` + `/templates`) | component (nav) | request-response | itself | exact |

---

## Pattern Assignments

### `src/app/page.tsx` (route, CRUD — new dashboard)

**Analog:** `src/app/pipeline/page.tsx` (lines 1-45) and current `src/app/page.tsx` (lines 1-27, to be replaced)

**Imports pattern** (`pipeline/page.tsx` lines 1-5):
```typescript
import { asc, isNull } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { PipelineBoard } from "@/components/pipeline-board";
```
Swap `differenceInDays` for `isBefore`/`isToday`/`startOfDay`/`addDays` (D-02 grouping, see Code Examples in RESEARCH.md lines 369-382).

**Core Server Component pattern** (`pipeline/page.tsx` lines 15-44):
```typescript
export default async function PipelinePage() {
  const [activeLeads, allSubnichos] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
  ]);
  // ...server-side computed derived set (esfriandoLeadIds) passed as plain props...
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Pipeline</h1>
      <PipelineBoard leads={activeLeads} subnichos={allSubnichos} esfriandoLeadIds={esfriandoLeadIds} />
    </div>
  );
}
```
Dashboard `page.tsx` should follow this exact shape: fetch via `Promise.all`, compute grouping server-side (D-02: Vencidos/Hoje/Próximos 7 dias, using `getActiveDashboardLeads()` from the new `src/db/queries.ts` — see Pitfall 5), pass plain grouped arrays as props to `<FollowupDashboard>`. Title becomes "Follow-ups" per `04-UI-SPEC.md` line 64/117 (Display size, `text-[28px] font-semibold leading-tight` — identical class string already used in both `page.tsx` and `pipeline/page.tsx`).

**Additional stage-exclusion filter needed (D-04):** current codebase has no existing example of excluding `fechado`/`perdido` in a query — this is new logic (`notInArray(leads.stage, ["fechado", "perdido"])` from `drizzle-orm`, combined with the existing `isNull(leads.deletedAt)` filter already used everywhere).

---

### `src/app/leads/page.tsx` (route, CRUD — literal move)

**Analog:** current `src/app/page.tsx` (lines 1-27, full file)
```typescript
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { LeadTable } from "@/components/lead-table";

export default async function Home() {
  const [activeLeads, allSubnichos] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
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
This is a pure file move per RESEARCH.md Summary point 4 — copy verbatim to `src/app/leads/page.tsx` (rename the function if desired, e.g. `LeadsPage`), delete the old `src/app/page.tsx` content (replaced by the dashboard). No logic changes needed for WA-05's Open Question 1 — do not add a send-WhatsApp button here (planner should scope it to dashboard + pipeline only, per RESEARCH.md Open Question 1 recommendation, line 426).

---

### `src/app/templates/page.tsx` (route, CRUD)

**Analog:** `src/app/subnichos/page.tsx` (full file, lines 1-16)
```typescript
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { SubnichoManager } from "@/components/subnicho-manager";

export default async function SubnichosPage() {
  const items = await db.select().from(subnichos).orderBy(asc(subnichos.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Sub-nichos</h1>
      <SubnichoManager subnichos={items} />
    </div>
  );
}
```
Direct structural analog: fetch all rows (no soft-delete/pagination — D-13 templates have no lixeira), pass to a manager/list component. Templates additionally need grouping by `tipo` (per RESEARCH.md architecture diagram line 179: "SELECT * FROM templates, grouped by tipo") — group in the page component the same way the dashboard groups leads, or inside `template-list.tsx`.

---

### `src/actions/lead-actions.ts` (server action, CRUD — MODIFIED)

**Analog:** itself — `createLead` (lines 37-65)

**Imports pattern** (lines 1-8):
```typescript
"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema } from "@/lib/validations";
import type { Lead } from "@/types";
```

**ActionState + core CRUD pattern** (lines 10-13, 37-65):
```typescript
type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

export async function createLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // ...FK existence check...
  try {
    await db.insert(leads).values(parsed.data);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}
```

**Required change (RESEARCH.md Pattern 2, lines 258-267):** extend `ActionState`'s success variant to `{ success: true; lead: Lead }`, change `db.insert(leads).values(parsed.data)` to `const [inserted] = await db.insert(leads).values(parsed.data).returning();` and `return { success: true, lead: inserted };`. Also add `revalidatePath("/leads")` (dashboard is now at `/`, the old `/` revalidate must become `/leads` in addition — per Pitfall 2, RESEARCH.md line 345, every lead-mutating action must revalidate `/`, `/leads`, and `/pipeline`).

---

### `src/actions/template-actions.ts` (server action, CRUD — NEW)

**Analog 1:** `src/actions/subnicho-actions.ts` (full file, lines 1-77) — CRUD + uniqueness-style validation shape.
```typescript
"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { subnichoSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: { nome: string[] } }
  | undefined;

export async function createSubnicho(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = subnichoSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  // ...
  await db.insert(subnichos).values({ nome });
  revalidatePath("/subnichos");
  revalidatePath("/");
  return { success: true };
}
```
Use this shape for `createTemplate`/`updateTemplate`/`deleteTemplate`. `deleteTemplate` is a genuinely new shape in this codebase (no prior hard-delete action exists — `lead-actions.ts` only ever soft-deletes/updates); model it as a plain `db.delete(templates).where(eq(templates.id, id))` following the same `ActionState`/`revalidatePath` wrapper.

**Analog 2 (transaction/SELECT-then-compare shape):** `updateLeadStage` in `src/actions/lead-actions.ts` (lines 129-163) — closest existing precedent for "conditionally update based on current DB state," even though it doesn't use an explicit `db.transaction()`. RESEARCH.md Pattern 3 (lines 300-316) is the authoritative code example for `setDefaultTemplate`:
```typescript
export async function setDefaultTemplate(id: number, tipo: Template["tipo"]) {
  db.transaction((tx) => {
    tx.update(templates).set({ isDefault: false }).where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true))).run();
    tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id)).run();
  });
  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
}
```

**Required `revalidatePath` set per Pitfall 2 (RESEARCH.md line 345):** every template-mutating action (`createTemplate`, `updateTemplate`, `deleteTemplate`, `setDefaultTemplate`) must call `revalidatePath("/templates")`, `revalidatePath("/")`, `revalidatePath("/pipeline")` — and `revalidatePath("/leads")` if send buttons end up there (they should not, per Open Question 1).

---

### `src/db/schema.ts` (model, CRUD — MODIFIED)

**Analog:** `subnichos` table definition (lines 4-14) — simple table, no FK, `uniqueIndex` example.
```typescript
export const subnichos = sqliteTable(
  "subnichos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("subnicho_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
  ]
);
```
Column-builder conventions confirmed against `leads` table (lines 16-43) too: `integer(...).primaryKey({ autoIncrement: true })`, `text(col, { enum: [...] }).notNull()`, `integer(col, { mode: "boolean" }).notNull().default(false)`, `integer(col, { mode: "timestamp" }).notNull().default(sql\`(unixepoch())\`)`, and `index("name_idx").on(table.col)` inside the third-argument array. RESEARCH.md's exact `templates` schema (lines 386-401) follows this convention precisely — use it verbatim as the target shape. **Do not** use a partial `uniqueIndex().where(...)` for the default-per-type invariant (Pitfall 3/Anti-Patterns, RESEARCH.md lines 319, 348-352) — enforce via the `db.transaction()` shown above instead.

---

### `src/db/queries.ts` (model/query helper, CRUD — NEW, implied)

**Analog:** inline query in `src/app/pipeline/page.tsx` (lines 16-23), to be extracted per Pitfall 5 (RESEARCH.md lines 360-364).
```typescript
const [activeLeads, allSubnichos] = await Promise.all([
  db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
  db.select().from(subnichos),
]);
```
Extract a `getActiveDashboardLeads()` function combining `isNull(leads.deletedAt)` with a `notInArray(leads.stage, ["fechado", "perdido"])` filter (D-04), called from `src/app/page.tsx`. This avoids duplicating the exclusion list between the dashboard and any future query that needs "active pipeline leads" (explicit pitfall warning tied to the pending `2026-07-21-separar-fechado-perdido.md` todo).

---

### `src/lib/whatsapp.ts` (utility, transform — NEW)

**Analog:** `src/lib/phone.ts` (full file, lines 1-24) — pure function, JSDoc contract comment, no side effects.
```typescript
/**
 * Contrato de telefone do CRM: normaliza qualquer formatação...
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  // ...
}
```
Also see `src/lib/money.ts` (`parseBRLToCents`/`formatCentsToBRL`, referenced from `validations.ts` line 2 and `lead-form-dialog.tsx` line 38) for the same "pure transform utility, imported into both a Zod schema and a component" pattern. RESEARCH.md Pattern 1 (lines 219-250) gives the exact target implementation for `renderTemplate()`/`buildWaLink()` — follow that code verbatim, importing `normalizePhone` from `src/lib/phone.ts` per the "Don't Hand-Roll" table (RESEARCH.md line 329) rather than reimplementing phone cleanup.

---

### `src/lib/validations.ts` (utility/schema, request-response — MODIFIED)

**Analog:** itself — `subnichoSchema` (lines 5-7) for a minimal-field schema shape; `leadSchema` (lines 9-41) for the fuller pattern including `z.enum` and PT-BR error messages.
```typescript
export const subnichoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});
```
```typescript
canal: z.enum(["instagram", "whatsapp"], {
  error: "Selecione um canal de contato.",
}),
```
New `templateSchema` should mirror this: `tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"], { error: "Selecione um tipo." })`, `nome: z.string().trim().min(1, "Nome é obrigatório.")`, `corpo: z.string().trim().min(1, "Mensagem é obrigatória.")`, `isDefault: z.coerce.boolean().default(false)` — matching the exact PT-BR error copy from `04-UI-SPEC.md` line 139 ("Nome é obrigatório.", "Mensagem é obrigatória.", "Selecione um tipo.").

---

### `src/hooks/use-first-contact-trigger.ts` (hook, event-driven — NEW)

**Analog (partial):** local dialog-state pattern already used twice in `pipeline-board.tsx` (lines 27-34, 52-56):
```typescript
type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

type MotivoPerdaState =
  | { open: false }
  | { open: true; leadNome: string };

const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
const [motivoPerdaState, setMotivoPerdaState] = useState<MotivoPerdaState>({ open: false });
```
No `src/hooks/` directory exists yet in this codebase — this is the first custom hook. RESEARCH.md Pattern 2 (lines 269-281) gives the exact target shape:
```typescript
export function useFirstContactTrigger(defaultTemplate: Template | undefined) {
  const [target, setTarget] = useState<{ lead: Lead; subnichoNome: string } | null>(null);
  return {
    open: target !== null,
    template: defaultTemplate,
    lead: target?.lead,
    trigger: (lead: Lead, subnichoNome: string) => setTarget({ lead, subnichoNome }),
    close: () => setTarget(null),
  };
}
```
Follow the discriminated-union-over-boolean-flags convention shown in `pipeline-board.tsx` for internal state shape consistency with the rest of the codebase.

---

### `src/components/whatsapp-preview-dialog.tsx` (component/dialog, request-response — NEW)

**Analog:** `src/components/motivo-perda-dialog.tsx` (full file, lines 1-79) — local `useState` for editable text, `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` structure, two-button footer (secondary "skip"-style + primary accent action), reset-on-close.
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function MotivoPerdaDialog({ open, onOpenChange, leadNome, onSkip, onSave }: MotivoPerdaDialogProps) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setMotivo(""); onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para Perdido</DialogTitle>
          <DialogDescription>{`Por que "${leadNome}" foi perdido? (opcional)`}</DialogDescription>
        </DialogHeader>
        <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="..." />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setMotivo(""); onSkip(); }}>Pular</Button>
          <Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={() => { onSave(motivo); setMotivo(""); }}>
            Salvar motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
**Critical wiring detail (Pitfall 4, RESEARCH.md lines 354-358):** the `<a href>`/`buildWaLink()` call inside this dialog MUST read from the live editable-textarea `useState` value (mirror the `motivo` state var above), never from the original `renderTemplate()` output captured once at open time — otherwise admin edits to the message are silently discarded before sending. Add a `Select` (type selector, D-15) above the textarea using the same `Controller`-free plain-`Select` pattern seen in `lead-form-dialog.tsx` lines 191-213 (Select wired via local state, not react-hook-form, since this is not a persisted form).

---

### `src/components/whatsapp-send-button.tsx` (component, request-response — NEW)

**Analog:** icon-only action button in `src/components/subnicho-manager.tsx` (lines 37-44):
```typescript
<button
  type="button"
  aria-label={`Renomear ${subnicho.nome}`}
  onClick={() => setIsEditing(true)}
  className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:text-[#0D9488]"
>
  <Pencil className="h-4 w-4" />
</button>
```
`04-UI-SPEC.md` (line 46) explicitly calls out reusing this exact `h-9 w-9`/36px touch-target precedent instead of the smaller default `size="icon"` (32px) button variant. Prefer wiring through `src/components/ui/button.tsx`'s `variant="ghost" size="icon-lg"` (confirmed `size-9` class, `button.tsx` line 33) rather than a raw `<button>`, since `Button` is the established primitive elsewhere — `subnicho-manager.tsx`'s raw `<button>` predates the shared `Button` component's icon-size variants. Disabled state (D-17, invalid phone) should use the standard `disabled` prop + native `title` attribute for the tooltip warning ("Telefone inválido — edite o lead"), matching `Button`'s existing `disabled:opacity-50 disabled:pointer-events-none` styling (`button.tsx` line 7).

---

### `src/components/followup-dashboard.tsx` (component, CRUD/display — NEW)

**Analog 1 (grouped-section-with-header-count shape):** `src/components/pipeline-column.tsx` (full file, lines 1-50):
```typescript
export function PipelineColumn({ stage, label, count, children }: PipelineColumnProps) {
  const hasCards = Boolean(count > 0);
  return (
    <div className="...">
      <div className="sticky top-0 flex items-baseline gap-2 rounded-md bg-[#F4F4F5] px-2 py-2">
        <h2 className="text-[20px] leading-tight font-semibold">{label}</h2>
        <span className="text-[14px] leading-normal text-muted-foreground">· {count}</span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto px-1 pb-1">
        {hasCards ? children : (
          <p className="py-12 text-center text-[14px] text-muted-foreground">Nenhum lead nessa etapa</p>
        )}
      </div>
    </div>
  );
}
```
Matches `04-UI-SPEC.md`'s "Nome · contagem" header format (line 125) exactly. Per copywriting contract (line 127), unlike `PipelineColumn` the dashboard should **omit** an empty section entirely (no header at all) rather than showing an empty-state message per section — only show the top-level "Tudo em dia!" empty state (analog below) when **all** sections are empty.

**Analog 2 (top-level empty state with CTA):** `src/components/lead-table.tsx` (lines 89-103):
```typescript
{leads.length === 0 ? (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
    <h2 className="text-[20px] leading-tight font-semibold">Nenhum lead cadastrado ainda</h2>
    <p className="max-w-sm text-sm text-muted-foreground">Comece adicionando seu primeiro lead...</p>
    <Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={() => setDialogState({ mode: "create" })}>
      Novo lead
    </Button>
  </div>
) : ( /* ... */ )}
```
Reuse this exact empty-state shell for D-03's "Tudo em dia!" message, but with **two** buttons per `04-UI-SPEC.md` line 126 ("Ver todos os leads" outline → `/leads`, "Novo lead" accent).

**Analog 3 (item click → reopen `LeadFormDialog`, D-05):** `src/components/lead-table.tsx` lines 76, 137, 177-185, and `pipeline-lead-card.tsx`'s `onClick` prop wiring (lines 25-30, 42-47) — same `DialogState` discriminated-union + `onClick={() => setDialogState({ mode: "edit", lead })}` pattern applies to each dashboard item.

**Stage badge reuse (D-08):** import `EtapaBadge` from `src/components/etapa-badge.tsx` (full file, lines 1-36) directly, no modification — `<EtapaBadge stage={lead.stage} />`.

---

### `src/components/template-form-dialog.tsx` (component/form dialog, CRUD — NEW)

**Analog:** `src/components/lead-form-dialog.tsx` (full file, lines 1-393) — the canonical `useActionState` + `react-hook-form` + Zod resolver + Dialog form pattern in this codebase.

**Imports pattern** (lines 1-39):
```typescript
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
```

**Create/edit mode-switch pattern** (lines 76-105):
```typescript
export function LeadFormDialog({ open, onOpenChange, subnichos, lead }: LeadFormDialogProps) {
  const isEditMode = Boolean(lead);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEditMode ? updateLead : createLead,
    undefined
  );
  // form = useForm({ resolver: zodResolver(leadSchema), defaultValues: {...} })
```

**Success/error effect pattern** (lines 107-116):
```typescript
useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("Lead salvo com sucesso.");
    form.reset();
    onOpenChange(false);
  } else if (state && "errors" in state) {
    toast.error("Não foi possível salvar o lead. Tente novamente.");
  }
}, [state]);
```

**Select-field-via-Controller pattern** (lines 191-213) — use for the `tipo` dropdown:
```typescript
<Controller
  control={form.control}
  name="canal"
  render={({ field }) => (
    <Select name="canal" items={CANAL_OPTIONS} value={field.value ?? null} onValueChange={field.onChange}>
      <SelectTrigger id="canal" aria-invalid={!!errors.canal} className="w-full">
        <SelectValue placeholder="Selecione o canal" />
      </SelectTrigger>
      <SelectContent>
        {CANAL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )}
/>
```

**Field + error pattern** (lines 166-172) — use for `nome`/`corpo`:
```typescript
<Field data-invalid={!!errors.nome}>
  <FieldLabel htmlFor="nome">Nome</FieldLabel>
  <FieldContent>
    <Input id="nome" aria-invalid={!!errors.nome} {...form.register("nome")} />
    <FieldError errors={[errors.nome]} />
  </FieldContent>
</Field>
```
Add a checkbox/switch for `isDefault` ("Marcar como padrão para este tipo" per `04-UI-SPEC.md` line 137) — no existing checkbox analog in the codebase; use `form.register("isDefault")` bound to a native `<input type="checkbox">` or add the shadcn `Checkbox` primitive if not present (check `src/components/ui/` first — not currently installed, would need `npx shadcn add checkbox` if the planner decides a checkbox is the right control, though `04-RESEARCH.md` claims zero new registry items needed, implying `Select` with a boolean-as-string workaround or a plain `<input type="checkbox">` styled ad hoc is preferred to avoid adding a new primitive).

**Discard-guard pattern** (lines 118-134, `DiscardChangesDialog` full file lines 1-49) — reuse if the template form should warn on unsaved-changes close; optional per phase scope, but consistent if included.

---

### `src/components/template-list.tsx` (component, CRUD — NEW, implied)

**Analog:** `src/components/subnicho-manager.tsx` (full file, lines 1-153) — list + inline "add" toggle + per-row edit toggle, `useActionState` per row.
```typescript
export function SubnichoManager({ subnichos }: { subnichos: Subnicho[] }) {
  const [isAdding, setIsAdding] = useState(false);
  // ...
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-md border border-[#F4F4F5]">
        {subnichos.map((subnicho) => <SubnichoRow key={subnicho.id} subnicho={subnicho} />)}
      </div>
      {/* inline add form or "+ Adicionar" trigger button */}
    </div>
  );
}
```
Adapt for templates: group rows by `tipo` (3 sections: 1º contato / Follow-up / Prova de valor per `04-UI-SPEC.md` line 129), each row shows nome + "Padrão" badge (D-12, `Check` icon per UI-SPEC line 98) + edit/delete icon buttons (`Pencil`/`Trash2`, same 36px pattern as `whatsapp-send-button.tsx` above) + "Tornar padrão" ghost link for non-default rows (UI-SPEC line 131). Unlike `SubnichoManager`'s inline-edit-in-place, templates should open `template-form-dialog.tsx` in a modal (UI-SPEC line 73: "o formulário de criação/edição abre em modal ... mesma convenção de subnicho-manager.tsx/lead-form-dialog.tsx" — actually specifies modal, not inline, so follow `lead-table.tsx`'s `DialogState` pattern instead of `subnicho-manager.tsx`'s inline-row-edit for the edit trigger, but keep `subnicho-manager.tsx`'s empty-state/toast/list-container structure).

---

### `src/components/delete-template-dialog.tsx` (component/confirm dialog, request-response — NEW, implied)

**Analog:** `src/components/discard-changes-dialog.tsx` (full file, lines 1-49) — simplest two-button confirm dialog in the codebase.
```typescript
export function DiscardChangesDialog({ open, onOpenChange, onDiscard }: DiscardChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Descartar alterações?</DialogTitle>
          <DialogDescription>Você tem alterações não salvas que serão perdidas.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Continuar editando</Button>
          <Button variant="destructive" onClick={onDiscard}>Descartar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Copy this shape exactly for template deletion, substituting copy per `04-UI-SPEC.md` line 142: Title "Excluir template", Body `Tem certeza que deseja excluir o template "{nome}"? Essa ação não pode ser desfeita.`, buttons "Cancelar"/"Excluir" (`variant="destructive"` — already the correct existing variant, confirmed in `button.tsx` line 18-19).

---

### `src/components/app-sidebar.tsx` (component/nav, request-response — MODIFIED)

**Analog:** itself (full file, lines 1-46).
```typescript
const NAV_ITEMS = [
  { href: "/", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;
```
Change to (D-06/D-11, order per `04-UI-SPEC.md` implied grouping — Follow-ups first as the new home):
```typescript
const NAV_ITEMS = [
  { href: "/", label: "Follow-ups" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/templates", label: "Templates" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;
```
The active-state logic (lines 24-25) already handles a new `/leads` entry correctly with **zero changes**, per RESEARCH.md Summary point 4 (line 87): `item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)` — `/leads` and `/templates` both `startsWith` their own href and never collide with `/`.

---

## Shared Patterns

### `ActionState` + `useActionState` (Server Action success/error handoff)
**Source:** `src/actions/lead-actions.ts` lines 10-13, `src/components/lead-form-dialog.tsx` lines 62-65, 83-86, 107-116
**Apply to:** `template-actions.ts` (all CRUD actions), `template-form-dialog.tsx`, `template-list.tsx`
```typescript
type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

const [state, formAction, pending] = useActionState<ActionState, FormData>(actionFn, undefined);

useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("...");
  } else if (state && "errors" in state) {
    toast.error("...");
  }
}, [state]);
```
Note the type is re-declared per-file rather than shared/exported (Pitfall 1, RESEARCH.md lines 336-340) — this is a pre-existing, tolerated duplication in the codebase; the planner may keep following it or consolidate, but should not introduce a *new* divergent shape.

### `revalidatePath` — multi-route invalidation
**Source:** `src/actions/lead-actions.ts` lines 62-64, 117-119, 160-162; `src/actions/subnicho-actions.ts` lines 39-41, 74-76
**Apply to:** every Server Action in `lead-actions.ts` and `template-actions.ts`
```typescript
revalidatePath("/");
revalidatePath("/pipeline");
```
**Phase 4 change required (Pitfall 2):** the invalidation set must grow. Lead-mutating actions: `/`, `/leads`, `/pipeline`. Template-mutating actions: `/templates`, `/`, `/pipeline` (send-button default-template state depends on it).

### Accent color / primary CTA button styling
**Source:** `src/components/pipeline-board.tsx` line 128, `src/components/lead-table.tsx` lines 98, 82, `src/components/motivo-perda-dialog.tsx` line 67
**Apply to:** all new primary-action buttons ("Novo template", "Salvar template", "Abrir WhatsApp")
```typescript
<Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={...}>
  Novo lead
</Button>
```

### Stage badge reuse (D-08)
**Source:** `src/components/etapa-badge.tsx` (full file)
**Apply to:** `followup-dashboard.tsx` item rows
```typescript
import { EtapaBadge } from "@/components/etapa-badge";
// <EtapaBadge stage={lead.stage} />
```

### Dialog structural shell
**Source:** `src/components/motivo-perda-dialog.tsx`, `src/components/discard-changes-dialog.tsx`, `src/components/lead-form-dialog.tsx`
**Apply to:** `whatsapp-preview-dialog.tsx`, `template-form-dialog.tsx`, `delete-template-dialog.tsx`
```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter>
      <Button variant="outline" onClick={...}>Cancelar</Button>
      <Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={...}>Ação primária</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### `DialogState` discriminated union for open/create/edit modals
**Source:** `src/components/lead-table.tsx` lines 34-37, `src/components/pipeline-board.tsx` lines 27-30
**Apply to:** `template-list.tsx` (template create/edit dialog state), `followup-dashboard.tsx` (lead edit dialog state, D-05)
```typescript
type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };
```

### date-fns urgency grouping (D-02)
**Source:** RESEARCH.md Code Examples (lines 369-382), pattern already partially present via `differenceInDays` in `pipeline/page.tsx` line 2, 30
**Apply to:** `src/app/page.tsx` and/or `src/db/queries.ts`
```typescript
import { isBefore, isToday, startOfDay, addDays } from "date-fns";
const today = startOfDay(new Date());
const in7Days = addDays(today, 7);
const vencidos = activeLeads.filter((l) => isBefore(l.followUpDate, today));
const hoje = activeLeads.filter((l) => isToday(l.followUpDate));
const proximos7Dias = activeLeads.filter(
  (l) => !isBefore(l.followUpDate, today) && !isToday(l.followUpDate) && isBefore(l.followUpDate, in7Days)
);
```

---

## No Analog Found

None — every file in this phase's scope has at least a role-match analog already in the codebase. The weakest matches (flagged "partial" above) are:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/hooks/use-first-contact-trigger.ts` | hook | event-driven | No `src/hooks/` directory or custom hook precedent exists yet in this codebase (all cross-component state so far lives inline in components like `pipeline-board.tsx`) — RESEARCH.md Pattern 2 (lines 269-281) is the primary source of truth for this file's shape instead of a codebase analog. |

## Metadata

**Analog search scope:** `src/app/`, `src/actions/`, `src/components/`, `src/lib/`, `src/db/`, `src/types/` (full read of all 25 non-`ui/` source files plus `ui/button.tsx`)
**Files scanned:** 20 (all app routes, all action files, all non-primitive components, schema, validations, phone/money libs, types)
**Pattern extraction date:** 2026-07-21
