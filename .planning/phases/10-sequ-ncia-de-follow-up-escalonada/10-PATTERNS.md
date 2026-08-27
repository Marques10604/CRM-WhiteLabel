# Phase 10: Sequência de Follow-up Escalonada - Pattern Map

**Mapped:** 2026-08-12
**Files analyzed:** 10 (2 new, 8 modified)
**Analogs found:** 10 / 10 (all in-repo — this phase is 100% pattern extension, no new libraries)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema.ts` (add `configuracoes.sequenciaIntervalosDias`, `leads.sequenciaPosicao`) | model | CRUD | `src/db/schema.ts` (existing `configuracoes`/`leads` definitions, same file) | exact |
| `scripts/migrate-sequencia-followup.cjs` (new) | migration | batch (one-shot DDL) | `scripts/backfill-origem-tipo.cjs` | exact |
| `src/db/queries.ts` (+ `getUltimaInteracaoWhatsAppPorLead`, `computeSequenciaSugestao`) | service (pure/query) | CRUD (aggregate read) + transform (pure fn) | `src/db/queries.ts` (`groupLeadsByUrgency`, `getConfiguracoes`, same file) | exact |
| `src/lib/validations.ts` (extend `configuracoesSchema`) | utility (schema) | transform | `src/lib/validations.ts` (`configuracoesSchema`, same file) | exact |
| `src/actions/lead-actions.ts` (`registerWhatsAppContact` + avanço; `updateLeadStage`/`updateLead` + reset) | service (Server Action) | request-response (mutation) | `src/actions/lead-actions.ts` (same functions, same file) | exact |
| `src/actions/configuracoes-actions.ts` (`saveConfiguracoes` + `formData.getAll`) | service (Server Action) | request-response (mutation) | `src/actions/configuracoes-actions.ts` (same function, same file) | exact |
| `src/app/page.tsx` (+ compute sugestão Map) | route (Server Component) | request-response (read) | `src/app/pipeline/page.tsx` (`esfriandoLeadIds` computation pattern) | exact |
| `src/app/pipeline/page.tsx` (+ compute sugestão Map) | route (Server Component) | request-response (read) | `src/app/pipeline/page.tsx` (same file, `limitesPorEtapa`/`esfriandoLeadIds`) | exact |
| `src/components/configuracoes-form.tsx` (+ seção lista dinâmica) | component (form) | request-response (client form) | `src/components/configuracoes-form.tsx` (same file, existing 3 fixed fields) | exact |
| `src/components/pipeline-lead-card.tsx` (+ indicador `CalendarClock`) | component (presentational) | request-response (render prop) | `src/components/pipeline-lead-card.tsx` (same file, `Clock`/"Esfriando" + `MessageCircle`/tentativas) | exact |
| `src/components/followup-dashboard.tsx` (+ indicador) | component (presentational) | request-response (render prop) | `src/components/pipeline-lead-card.tsx` indicator pattern (cross-component reuse) | role-match |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** same file, existing `configuracoes` (lines 120-126) and `leads` (lines 32-65) table defs.

**JSON column pattern for `configuracoes.sequenciaIntervalosDias`** (model on `configuracoes` lines 120-126):
```typescript
export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(),
  diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
  // NOVO (SEQ-01):
  sequenciaIntervalosDias: text("sequencia_intervalos_dias", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

**Integer position column for `leads.sequenciaPosicao`** (model on `leads`, follow the comment style of `origemTipo`/`contactAttempts` at lines 40-52):
```typescript
contactAttempts: integer("contact_attempts").notNull().default(0), // WA-08/D-04: acumula pela vida do lead, nunca zera ao mudar de etapa
sequenciaPosicao: integer("sequencia_posicao").notNull().default(0), // NOVO (D-01/D-02/SEQ-02): índice do próximo degrau da sequência, avança em registerWhatsAppContact, reseta em updateLeadStage/updateLead ao voltar para "novo"
```

**Doc-comment convention:** every table/column addition in this codebase carries an inline comment explaining the *why* (see `origemTipo` comment lines 40-42, and the `configuracoes` block comment lines 101-119) — new columns must follow this, referencing the requirement ID (SEQ-01/02, D-01/D-02) and the exact ADR-style reasoning (e.g. "espelha o DEFAULT físico OBRIGATÓRIO exigido pelo SQLite").

---

### `scripts/migrate-sequencia-followup.cjs` (migration, batch)

**Analog:** `scripts/backfill-origem-tipo.cjs` (full file read, 81 lines) — use as literal mold, per RESEARCH.md explicit instruction.

**Full pattern to copy (backup → idempotent ALTER TABLE → idempotent data guard → post-check)**:
```javascript
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-sequencia-followup] FALHOU: ${message}`);
  process.exit(1);
}

// 1) BACKUP ANTES DE QUALQUER ESCRITA (wal_checkpoint(TRUNCATE) primeiro)
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}
console.log(`[migrate-sequencia-followup] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) GUARDA DE IDEMPOTÊNCIA DO DDL — leads.sequencia_posicao
const hasSequenciaPosicao = db.prepare("PRAGMA table_info(leads)").all()
  .some((c) => c.name === "sequencia_posicao");
if (!hasSequenciaPosicao) {
  db.exec("ALTER TABLE `leads` ADD `sequencia_posicao` integer DEFAULT 0 NOT NULL;");
  console.log("[migrate-sequencia-followup] coluna leads.sequencia_posicao adicionada");
} else {
  console.log("[migrate-sequencia-followup] leads.sequencia_posicao já existe — pulando (idempotência)");
}

// 2b) GUARDA DE IDEMPOTÊNCIA DO DDL — configuracoes.sequencia_intervalos_dias
const hasIntervalos = db.prepare("PRAGMA table_info(configuracoes)").all()
  .some((c) => c.name === "sequencia_intervalos_dias");
if (!hasIntervalos) {
  db.exec("ALTER TABLE `configuracoes` ADD `sequencia_intervalos_dias` text DEFAULT '[]' NOT NULL;");
  console.log("[migrate-sequencia-followup] coluna configuracoes.sequencia_intervalos_dias adicionada");
} else {
  console.log("[migrate-sequencia-followup] configuracoes.sequencia_intervalos_dias já existe — pulando (idempotência)");
}

// 3) VERIFICAÇÃO PÓS-MIGRAÇÃO (contagem de linhas + 0 NULLs)
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}
const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE sequencia_posicao IS NULL").get().c;
if (nullCount !== 0) {
  fail(`${nullCount} linha(s) com sequencia_posicao NULL após a migração`);
}

console.log(`[migrate-sequencia-followup] OK: ${afterLeads} leads, 0 NULL em sequencia_posicao`);
db.close();
process.exit(0);
```

**Critical constraint (Pitfall 1/2 in RESEARCH.md):** NEVER use `drizzle-kit push`/`generate` for these two columns — `leads` has 30+ real rows and triggers the documented data-loss-statement/TTY-prompt bug (incidents in Fases 06-01/07-01). Always this manual `better-sqlite3` script, committed (per Fase 08-01 precedent, not the older "applied inline" style of 06-01/07-01).

---

### `src/db/queries.ts` (service/pure function, CRUD + transform)

**Analog:** same file — `getConfiguracoes` (lines 68-76, getOrCreate singleton pattern) and `groupLeadsByUrgency` (lines 36-55, pure/testable function pattern).

**Imports pattern** (lines 1-5):
```typescript
import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { addDays, isBefore, isToday, startOfDay } from "date-fns";
import { db } from "@/db/client";
import { configuracoes, leads } from "@/db/schema";
import type { Lead } from "@/types";
```

**Aggregate query pattern** (new function, follow `getActiveDashboardLeads` shape at lines 14-20, extend imports with `interacoes`, `ne`, `isNull`, `sql`):
```typescript
export async function getUltimaInteracaoWhatsAppPorLead(): Promise<Map<number, Date>> {
  const rows = await db
    .select({
      leadId: interacoes.leadId,
      ultima: sql<number>`max(${interacoes.createdAt})`,
    })
    .from(interacoes)
    .where(and(ne(interacoes.tipo, "nota_manual"), isNull(interacoes.deletedAt)))
    .groupBy(interacoes.leadId);

  return new Map(rows.map((r) => [r.leadId, new Date(r.ultima * 1000)]));
}
```

**Pure/testable calculation function pattern** — copy `groupLeadsByUrgency`'s doc-comment style ("Agrupamento puro por urgência... sem I/O, testável isoladamente") and signature shape:
```typescript
export function computeSequenciaSugestao(
  lead: Pick<Lead, "origemTipo" | "sequenciaPosicao">,
  ultimaInteracaoWhatsApp: Date | undefined,
  intervalosDias: number[]
): Date | undefined {
  if (lead.origemTipo !== "outbound") return undefined; // ORIGEM-03
  if (!ultimaInteracaoWhatsApp) return undefined; // D-09
  const intervalo = intervalosDias[lead.sequenciaPosicao];
  if (intervalo === undefined) return undefined; // D-10
  return addDays(ultimaInteracaoWhatsApp, intervalo);
}
```

**Extend `Configuracoes` type / `getConfiguracoes`:** no code change needed beyond the schema — `Configuracoes = typeof configuracoes.$inferSelect` (line 57) auto-picks up `sequenciaIntervalosDias` once schema.ts is updated.

---

### `src/lib/validations.ts` (utility/schema, transform)

**Analog:** same file, `configuracoesSchema` (lines 132-136).

**Current pattern:**
```typescript
export const configuracoesSchema = z.object({
  diasParadoNovo: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoContatado: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoNegociacao: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
});
```

**Extension pattern** (array field validation, mirrors RESEARCH.md Pattern 1's Zod recommendation):
```typescript
export const configuracoesSchema = z.object({
  diasParadoNovo: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoContatado: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoNegociacao: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  sequenciaIntervalosDias: z
    .array(z.coerce.number().int().min(1, "Mínimo de 1 dia."))
    .min(1, "Adicione ao menos um intervalo."),
});
```
Doc-comment convention (lines 126-131 above it) must be extended to mention SEQ-01 alongside CONFIG-01/02.

---

### `src/actions/lead-actions.ts` (service/Server Action, request-response mutation)

**Analog:** same file — `registerWhatsAppContact` (lines 233-287) for D-01, `updateLeadStage` (lines 156-192) and `updateLead` (lines 89-147) for D-02.

**Imports pattern** (lines 1-15, unchanged — `sql` already imported):
```typescript
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { interacoes, leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema, whatsappContactSchema } from "@/lib/validations";
import type { Lead, Template } from "@/types";
```

**D-01 avanço pattern — inside `registerWhatsAppContact`'s `db.transaction()`** (extend lines 253-281, same conditional-spread idiom already used for `advanced`):
```typescript
const avancaSequencia = parsed.data.tipo === "follow_up";

await db.transaction(async (tx) => {
  const stageGuard = advanced ? [eq(leads.stage, "novo")] : [];
  const updated = await tx
    .update(leads)
    .set({
      contactAttempts: sql`${leads.contactAttempts} + 1`,
      ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
      ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt), ...stageGuard))
    .returning({ id: leads.id });

  if (advanced && updated.length === 0) {
    advanced = false;
    await tx
      .update(leads)
      .set({
        contactAttempts: sql`${leads.contactAttempts} + 1`,
        ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}), // repetir no fallback branch (linhas 270-273 atuais)
      })
      .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
  }

  await tx.insert(interacoes).values({ /* unchanged */ });
});
```
**Do not** add `origemTipo` reads/gates here (Pitfall 4 — gate belongs only to `computeSequenciaSugestao`).

**D-02 reset pattern — `updateLeadStage`** (extend `.set()` block, lines 176-187), mirrors the value-target-conditional idiom already used for `motivoPerda` (line 184), NOT the changed-conditional idiom used for `stageChangedAt` (line 185):
```typescript
await db
  .update(leads)
  .set({
    stage: parsed.data.stage,
    motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
    ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}), // NOVO (D-02)
    ...(stageChanged ? { stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
```
Same pattern applies to `updateLead`'s `.set()` block (lines 126-134) — see RESEARCH.md Assumption A2 on whether this also applies to `updateLead` (planner should confirm scope with user if ambiguous, per Open Question 2).

---

### `src/actions/configuracoes-actions.ts` (service/Server Action, request-response mutation)

**Analog:** same file, `saveConfiguracoes` (full file, 49 lines).

**Current pattern** (lines 28-48):
```typescript
export async function saveConfiguracoes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = configuracoesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .insert(configuracoes)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: configuracoes.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/configuracoes");
  revalidatePath("/pipeline");
  return { success: true };
}
```

**Critical fix required (Pitfall 3 — `Object.fromEntries` drops repeated `FormData` keys):**
```typescript
export async function saveConfiguracoes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData); // continua correto para os 3 campos escalares
  const intervalos = formData.getAll("intervaloDias"); // string[], 1 por linha da lista dinâmica
  const parsed = configuracoesSchema.safeParse({ ...raw, sequenciaIntervalosDias: intervalos });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .insert(configuracoes)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: configuracoes.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/configuracoes");
  revalidatePath("/pipeline");
  revalidatePath("/"); // NOVO — sugestão também aparece no dashboard (D-05)
  return { success: true };
}
```
Note: `revalidatePath("/")` addition needed because D-05 says the suggested date also appears on the dashboard, unlike the current `saveConfiguracoes` which only revalidates `/configuracoes` and `/pipeline`.

---

### `src/app/page.tsx` and `src/app/pipeline/page.tsx` (route/Server Component, request-response read)

**Analog:** `src/app/pipeline/page.tsx` full file (63 lines) — `esfriandoLeadIds` server-side computation is the direct template for the new sugestão Map.

**Core pattern to replicate** (from `pipeline/page.tsx` lines 20-51, `limitesPorEtapa`/`esfriandoLeadIds`):
```typescript
export default async function PipelinePage() {
  const [activeLeads, allSubnichos, allTemplates, config, ultimaInteracaoPorLead] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
    db.select().from(templates),
    getConfiguracoes(),
    getUltimaInteracaoWhatsAppPorLead(),
  ]);

  // ... existing esfriandoLeadIds computation unchanged ...

  const sugestaoPorLeadId = new Map(
    activeLeads
      .map((lead) => [
        lead.id,
        computeSequenciaSugestao(
          lead,
          ultimaInteracaoPorLead.get(lead.id),
          config.sequenciaIntervalosDias
        ),
      ] as const)
      .filter(([, data]) => data !== undefined)
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Pipeline</h1>
      <PipelineBoard
        leads={activeLeads}
        subnichos={allSubnichos}
        esfriandoLeadIds={esfriandoLeadIds}
        templates={allTemplates}
        sugestaoPorLeadId={sugestaoPorLeadId} // NOVO — passa como prop já computada
      />
    </div>
  );
}
```
Same shape applies to `src/app/page.tsx` (`Home`), adding `getConfiguracoes()` and `getUltimaInteracaoWhatsAppPorLead()` to the existing `Promise.all` (lines 15-19) and passing `sugestaoPorLeadId` down through `FollowupDashboard`. **Never compute the suggestion in a Client Component** — this is the load-bearing convention across both analogs (UI-SPEC.md: "Cálculo sempre no servidor").

---

### `src/components/configuracoes-form.tsx` (component/form, request-response client)

**Analog:** same file, full component (163 lines) — existing 3 fixed-field pattern (`Field`/`FieldContent`/`FieldLabel`/`FieldDescription`/`FieldError` + `Input type="number" min={1}`).

**Imports pattern** (lines 1-23, unchanged shape, add `useState`, `Plus`, `Trash2` from `lucide-react`):
```typescript
"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveConfiguracoes } from "@/actions/configuracoes-actions";
import { configuracoesSchema, type ConfiguracoesFormValues } from "@/lib/validations";
import type { Configuracoes } from "@/db/queries";
```

**Fixed-field pattern to mirror per dynamic row** (lines 92-110, one of the three existing `Field` blocks):
```typescript
<Field data-invalid={!!errors.diasParadoNovo}>
  <FieldLabel htmlFor="diasParadoNovo">Novo</FieldLabel>
  <FieldContent>
    <Input
      id="diasParadoNovo"
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      aria-invalid={!!errors.diasParadoNovo}
      {...form.register("diasParadoNovo")}
    />
    <FieldDescription>
      Dias parado nesta etapa antes de o lead ser destacado como esfriando.
    </FieldDescription>
    <FieldError errors={[errors.diasParadoNovo]} />
  </FieldContent>
</Field>
```
New dynamic-list section uses local `useState<number[]>` array (per UI-SPEC.md, `useState`, not `useFieldArray`) — each row renders `name="intervaloDias"` (same repeated name, consumed via `formData.getAll` server-side) + `Trash2` icon-button (`variant="ghost" size="icon-lg"`, same as `History`/`Pencil` icon-buttons elsewhere in the codebase, e.g. `pipeline-lead-card.tsx` lines 76-85). Submission mechanic (`formRef`/`onSubmit`/`useActionState`) at lines 48-76 stays unchanged — the whole native `<form>` (fixed fields + dynamic rows) submits together via the same `formAction(new FormData(formRef.current))`.

**Second card wrapper pattern** (per UI-SPEC.md §Layout: new card stacked below, same visual container as lines 81-91):
```typescript
<div className="rounded-lg border border-zinc-200 bg-white p-6 max-w-md">
  {/* new "Sequência de reabordagem" section, inside the SAME <form> per UI-SPEC.md
      "um único botão no rodapé... salva tanto os 3 campos... quanto a sequência" */}
</div>
```

---

### `src/components/pipeline-lead-card.tsx` and `src/components/followup-dashboard.tsx` (component/presentational, request-response render)

**Analog:** `pipeline-lead-card.tsx` full file (115 lines) — `Clock`/"Esfriando" (lines 98-102) and `MessageCircle`/tentativas (lines 103-111) are the direct templates for the new `CalendarClock`/"Sugestão" indicator.

**Imports pattern** (lines 1-10, add `CalendarClock`):
```typescript
"use client";
import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { CalendarClock, Clock, History, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { WhatsAppSendButton } from "@/components/whatsapp-send-button";
import type { Lead } from "@/types";
```

**Indicator pattern to copy** (lines 96-112, the metadata row — append after existing elements, per UI-SPEC.md "sempre por último"):
```typescript
<div className="flex items-center gap-1 text-[14px] leading-normal text-muted-foreground">
  <span>{format(lead.followUpDate, "dd/MM/yyyy")}</span>
  {isEsfriando ? (
    <span className="flex items-center gap-1 text-[#B45309]">
      <Clock className="size-3.5" /> Esfriando
    </span>
  ) : null}
  {lead.contactAttempts > 0 ? (
    <span className="flex items-center gap-1" aria-label={`${lead.contactAttempts} tentativas de contato`}>
      <MessageCircle className="size-3.5" />
      {lead.contactAttempts}x
    </span>
  ) : null}
  {sugestao ? ( // NOVO prop, já computada no servidor — nunca calculada aqui
    <span
      className="flex items-center gap-1"
      aria-label={`Próxima reabordagem sugerida em ${format(sugestao, "dd/MM/yyyy")}`}
      title="Sugestão calculada a partir da última interação registrada. Não altera a data de follow-up real — o campo Follow-up continua sendo a fonte oficial."
    >
      <CalendarClock className="size-3.5" />
      Sugestão: {format(sugestao, "dd/MM")}
    </span>
  ) : null}
</div>
```
Note: `text-muted-foreground` (neutral) for the whole indicator — critically NOT teal accent, NOT amber (UI-SPEC.md §Color, D-06 "crítico"). Prop `sugestao?: Date` added to `PipelineLeadCardProps` type (lines 12-19), threaded from `pipeline-board.tsx` → `pipeline/page.tsx`'s `sugestaoPorLeadId` Map (same threading pattern as `isEsfriando`/`esfriandoSet`).

**`followup-dashboard.tsx` reuse:** same indicator JSX/props pattern, inserted into the per-lead metadata row at lines 173-180 (after `followUpDate`, per UI-SPEC.md "acrescentado após o followUpDate já exibido").

---

## Shared Patterns

### Doc-comment convention (load-bearing across all files)
**Source:** every file read in this phase (`schema.ts`, `queries.ts`, `lead-actions.ts`, `configuracoes-actions.ts`)
**Apply to:** every new/modified function, table, column
This codebase writes dense inline comments justifying *why* a design choice was made, citing decision IDs (D-01, SEQ-02, ORIGEM-03) and prior incidents (e.g. "Pitfall 5 do RESEARCH"). New code in this phase must follow the same density — planner should instruct implementers to cite the relevant CONTEXT.md/RESEARCH.md decision ID in comments, not just describe the mechanic.

### Server-only derived-state computation (never client)
**Source:** `src/app/pipeline/page.tsx` lines 32-50 (`limitesPorEtapa`/`esfriandoLeadIds`)
**Apply to:** `src/app/page.tsx`, `src/app/pipeline/page.tsx` (sugestão Map computation)
All conditional/derived display state (esfriando, contador, and now sugestão) is computed once in the Server Component and passed down as already-resolved props (`Date | undefined`, `boolean`, `number`) — Client Components (`pipeline-lead-card.tsx`, `followup-dashboard.tsx`) never recompute, they only render.

### Value-target-conditional write idiom (not changed-conditional)
**Source:** `src/actions/lead-actions.ts` lines 132, 184 (`motivoPerda: stage === "perdido" ? ... : null`)
**Apply to:** `sequenciaPosicao` reset in `updateLeadStage`/`updateLead`
Fields that should reset based on the TARGET value (not whether it changed) use `condition ? {value} : {resetValue}` inline in `.set()`, always safe to run twice (idempotent no-op). Contrast with `stageChangedAt`'s changed-conditional idiom (`stageChanged ? {...} : {}`), which is NOT the right template for `sequenciaPosicao`.

### `db.transaction()` for coupled writes
**Source:** `src/actions/lead-actions.ts` lines 253-281 (`registerWhatsAppContact`)
**Apply to:** `registerWhatsAppContact`'s extension for `sequenciaPosicao` increment
Any write that must never partially succeed (increment counter without recording the timeline event, or vice versa) goes inside the existing `db.transaction()` block — do not add a second transaction or a separate `db.update()` outside it.

### Server Action validation: `safeParse` + fresh SELECT gate
**Source:** all four Server Action files read (`lead-actions.ts`, `configuracoes-actions.ts`, `interacao-actions.ts`)
**Apply to:** all mutation entry points touched by this phase
Every Server Action: (1) `schema.safeParse(...)` first, return `{errors}` on failure, (2) fresh `SELECT` from DB when a conditional gate depends on current state (never trust client-passed state — race-condition guard, see `registerWhatsAppContact`'s SELECT-then-transactional-guard), (3) `db.update`/`db.insert`, (4) `revalidatePath(...)` for every route that displays the mutated data.

### Migration script mold
**Source:** `scripts/backfill-origem-tipo.cjs` (full file)
**Apply to:** `scripts/migrate-sequencia-followup.cjs`
Backup (`wal_checkpoint(TRUNCATE)` + `fs.copyFileSync`) → idempotent DDL guard (`PRAGMA table_info` check before `ALTER TABLE`) → idempotent data guard if needed → post-migration verification (row count unchanged, 0 NULLs) → `fail()`/`process.exit(1)` on any check failure. Never `drizzle-kit push` for populated tables.

## No Analog Found

None — every file in this phase has a direct or role-match analog in the existing codebase (confirmed by RESEARCH.md: "Nenhuma biblioteca nova é necessária nesta fase").

## Metadata

**Analog search scope:** `src/db/`, `src/actions/`, `src/lib/`, `src/app/`, `src/components/`, `scripts/`
**Files scanned:** `schema.ts`, `queries.ts`, `client.ts` (referenced only); `lead-actions.ts`, `configuracoes-actions.ts`, `interacao-actions.ts`; `validations.ts`; `page.tsx`, `pipeline/page.tsx`; `configuracoes-form.tsx`, `pipeline-lead-card.tsx`, `followup-dashboard.tsx`, `pipeline-board.tsx`, `whatsapp-preview-dialog.tsx`; `backfill-origem-tipo.cjs`, `verify-schema.cjs`
**Pattern extraction date:** 2026-08-12
