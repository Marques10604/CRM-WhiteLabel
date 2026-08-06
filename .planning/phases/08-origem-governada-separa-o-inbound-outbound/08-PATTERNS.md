# Phase 8: Origem Governada + Separação Inbound × Outbound - Pattern Map

**Mapped:** 2026-08-06
**Files analyzed:** 7 (6 modified + 1 new standalone script)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/db/schema.ts` | model (Drizzle table def) | CRUD | same file, `canal`/`stage` columns (lines 38, 44-46) | exact (same file, same table) |
| `src/lib/validations.ts` | utility (Zod schema) | request-response (validation) | same file, `canal`/`csvRowSchema` (lines 26-28, 53-55) | exact (same file) |
| `src/components/lead-form-dialog.tsx` | component (form dialog) | request-response | same file, `canal` Field/Controller/Select (lines 211-242) | exact (same file, explicit precedent per D-03) |
| `src/lib/csv-import.ts` | utility (CSV row mapper) | transform/batch | same file, `CSV_DEFAULTS`/`mapCsvRows` origem default (lines 51-56, 120-121) | exact (same file) |
| `src/actions/import-actions.ts` | service (Server Action) | batch/CRUD | same file, `bulkImportLeads` explicit insert `.values({...})` (lines 143-157) | exact (same file) |
| `scripts/test-lead-actions.cjs` | test | request-response (integration) | same file, `makeFormData()` base object (lines 99-116) | exact (same file) |
| `scripts/backfill-origem-tipo.cjs` (new) | migration/script | batch (one-shot DDL + backfill) | `scripts/verify-pipeline-migration.cjs` (verification shape) + Fase 06-01/07-01 precedent (ALTER TABLE via `better-sqlite3`, documented only in `STATE.md`/SUMMARYs, no `.cjs` file existed for those) | role-match (no prior standalone migration `.cjs` exists in repo — closest structural analog is the verify script's PRAGMA/backup idiom) |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD)

**Analog:** same file — `canal` (line 38) and `stage` (lines 44-46) columns on the `leads` table.

**Existing enum-column pattern** (lines 32-46):
```typescript
export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }).notNull(),
    origem: text("origem").notNull(),
    valorEstimado: integer("valor_estimado_centavos").notNull(),
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado", "perdido"] })
      .notNull()
      .default("novo"),
    // ...
  },
  ...
);
```

**What to copy:** Insert `origemTipo` right after `origem` (D-02, semantic grouping mirrored in the schema too):
```typescript
origem: text("origem").notNull(),
origemTipo: text("origem_tipo", { enum: ["inbound", "outbound"] })
  .notNull()
  .default("outbound"), // mirrors the mandatory physical DEFAULT from ALTER TABLE (SQLite constraint, not a product choice — see backfill script) — never actually triggered by app flows since Zod always supplies the field
```

**Precedent for `.notNull().default(...)` on an added column with real data:** `contactAttempts: integer("contact_attempts").notNull().default(0)` (line 49) — same idiom, added in Phase 06-01 via manual `ALTER TABLE`, never through `drizzle-kit push`.

---

### `src/lib/validations.ts` (utility, request-response validation)

**Analog:** same file — `canal` field (lines 26-28) for the required-enum shape, `csvRowSchema` (lines 53-55) for the CSV-specific override pattern.

**leadSchema pattern to copy** (insert after `origem`, line 29):
```typescript
canal: z.enum(["instagram", "whatsapp"], {
  error: "Selecione um canal de contato.",
}),
origem: z.string().trim().min(1, "Origem é obrigatória."),
origemTipo: z.enum(["inbound", "outbound"], {
  error: "Selecione o tipo de origem.",
}), // NO .default() — D-04 requires the manual form to never pre-select
```

**csvRowSchema override pattern** (current, lines 53-55):
```typescript
export const csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
});
```
**What to copy:** extend this `.extend({...})` block with a default-bearing override so import CSV never needs the field from the client:
```typescript
export const csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
  origemTipo: z.enum(["inbound", "outbound"]).default("outbound"),
});
```

**Anti-pattern to avoid (explicit in RESEARCH.md):** do NOT add `.default("outbound")` to `origemTipo` inside `leadSchema` itself — that would break D-04 (form must force a conscious choice). The default belongs only in the Drizzle mirror and in the `csvRowSchema` override.

---

### `src/components/lead-form-dialog.tsx` (component, request-response)

**Analog:** same file — `CANAL_OPTIONS` (lines 55-58) + `canal` `Field`/`Controller`/`Select` block (lines 211-242).

**Options array pattern** (lines 55-58):
```typescript
const CANAL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;
```
**What to copy — new array (D-01, English labels, no PT-BR translation):**
```typescript
const ORIGEM_TIPO_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const;
```

**Controller + Select field pattern** (lines 211-242, `canal`):
```tsx
<Field data-invalid={!!errors.canal}>
  <FieldLabel htmlFor="canal">Canal</FieldLabel>
  <FieldContent>
    <Controller
      control={form.control}
      name="canal"
      render={({ field }) => (
        <Select
          name="canal"
          items={CANAL_OPTIONS as unknown as { value: string; label: string }[]}
          value={(field.value as string | undefined) ?? null}
          onValueChange={(value) => field.onChange(value)}
        >
          <SelectTrigger id="canal" aria-invalid={!!errors.canal} className="w-full">
            <SelectValue placeholder="Selecione o canal" />
          </SelectTrigger>
          <SelectContent>
            {CANAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
    <FieldDescription>
      Por onde você vai abordar esse lead (Instagram ou WhatsApp).
    </FieldDescription>
    <FieldError errors={[errors.canal]} />
  </FieldContent>
</Field>
```

**Placement (D-02):** insert a mirrored `Field` for `origemTipo` immediately after the existing `origem` `Field` (currently lines 244-253), still inside the "Contato" section (`<div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">`, opens line 186).

**defaultValues pattern to copy** (line 109, `canal: lead?.canal` — no fallback, `undefined` on create):
```typescript
canal: lead?.canal,
origem: lead?.origem ?? "",
origemTipo: lead?.origemTipo, // no fallback — D-04, placeholder stays empty on create
```

---

### `src/lib/csv-import.ts` (utility, transform/batch)

**Analog:** same file — `CSV_DEFAULTS` (lines 51-56) and its consumption inside `mapCsvRows` (line 121, `origem`).

**Current default constant:**
```typescript
export const CSV_DEFAULTS = {
  canal: "whatsapp",
  origem: "Importação CSV",
  notas: "Importado via CSV.",
  valorEstimado: "0",
} as const;
```
**What to copy:** add `origemTipo: "outbound"` for documentation/parity — NOT consumed inside `mapCsvRows`/`MappedCsvRow` because `origemTipo` is not a `CsvFieldKey` (never mappable from a CSV column, per SPEC Requirement 2). The actual enforcement point is `csvRowSchema.extend({ origemTipo: z.enum([...]).default("outbound") })` in `validations.ts` (see above) — this file only needs the constant added for consistency/documentation, no new logic branch, no new `CsvFieldKey` member, no change to `MappedCsvRow`/`ConfirmedImportRow` shape.

---

### `src/actions/import-actions.ts` (service, batch)

**Analog:** same file — `bulkImportLeads`'s explicit `.values({...})` insert (lines 143-157).

**Current explicit-field insert (deliberately not a spread — avoids leaking unexpected fields):**
```typescript
tx.insert(leads)
  .values({
    nome: row.nome,
    telefone: row.telefone,
    canal: row.canal,
    origem: row.origem,
    valorEstimado: row.valorEstimado,
    notas: row.notas,
    subnichoId: subnichoIdByNome.get(chave)!,
    stage: "novo",
    stageChangedAt: new Date(),
    followUpDate: new Date(),
    importBatchId: batchId,
  })
  .run();
```
**What to copy:** add `origemTipo: row.origemTipo,` to this list (right after `origem`) — `row` is `CsvRowValues`, which will carry `origemTipo` once `csvRowSchema` is extended. **Pitfall (from RESEARCH.md, confirmed real given the explicit-field style):** forgetting this line makes validation pass but the value silently never reaches the DB (SQLite's physical `DEFAULT 'outbound'` masks the bug until a CSV-sourced `inbound` lead is needed).

`ConfirmedImportRow` type (lines 67-75) does NOT need an `origemTipo` field — the wizard never collects it client-side (no new UI step, per SPEC Requirement 2); `csvRowSchema.safeParse(row)` fills it via `.default("outbound")` at line 91 (`csvRowSchema.safeParse(row)`).

---

### `scripts/backfill-origem-tipo.cjs` (new, migration/batch)

**No direct analog file exists** — Phases 06-01/07-01 applied their `ALTER TABLE` inline (via `node -e` one-liners / `drizzle-kit push`, documented only in `STATE.md`/SUMMARY.md, never as a committed `.cjs` script). The closest **structural** analogs are two different existing scripts, combined:

**Verification/PRAGMA idiom — `scripts/verify-pipeline-migration.cjs` (full file, 58 lines):**
```javascript
const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[verify-pipeline-migration] FALHOU: ${message}`);
  process.exit(1);
}

let db;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (err) {
  fail(`não foi possível abrir o banco em ${DB_PATH}: ${err.message}`);
}

const columns = db.prepare("PRAGMA table_info(leads)").all().map((c) => c.name);
if (!columns.includes("motivo_perda")) {
  fail("coluna 'motivo_perda' ausente na tabela 'leads'");
}
// ... more count-based checks, then db.close() + process.exit(0)
```
This is the pattern to copy for: `DB_PATH` resolution via `process.env.DB_FILE_NAME` fallback, `PRAGMA table_info(leads)` column-existence check, `fail()` helper with `process.exit(1)`, final `console.log("[script-name] OK: ...")` + `process.exit(0)`.

**Schema-check idiom — `scripts/verify-schema.cjs` (full file, 45 lines):** same `DB_PATH`/`fail()`/`sqlite_master` idiom, useful if the new script's verification half is split out.

**Full recommended script body:** already fully drafted and verified in `08-RESEARCH.md` Pattern 2 (lines 166-224 of that file) — includes backup-before-write (WAL checkpoint + file copy), idempotent `PRAGMA table_info` guard around the `ALTER TABLE`, and an idempotent `UPDATE ... WHERE origem_tipo IS NULL` guard. Reproduced here verbatim as the primary reference:
```javascript
// scripts/backfill-origem-tipo.cjs
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

// 1) Backup BEFORE touching the database — WAL checkpoint first (client.ts
//    runs in journal_mode=WAL), otherwise the file copy may miss recent
//    writes still sitting in -wal.
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
{
  const dbForCheckpoint = new Database(DB_PATH);
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
}
fs.copyFileSync(DB_PATH, backupPath);
console.log(`[backfill-origem-tipo] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);
const before = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) Idempotent ADD COLUMN guard (SQLite throws "duplicate column name" on re-run)
const hasColumn = db.prepare("PRAGMA table_info(leads)").all().some((c) => c.name === "origem_tipo");
if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;");
  console.log("[backfill-origem-tipo] coluna origem_tipo adicionada (DEFAULT já backfillou todas as linhas)");
} else {
  console.log("[backfill-origem-tipo] coluna origem_tipo já existe — pulando ALTER TABLE (idempotência)");
}

// 3) Explicit idempotent guard — never an unconditional UPDATE (SPEC.md Constraint)
const result = db.prepare("UPDATE leads SET origem_tipo = 'outbound' WHERE origem_tipo IS NULL").run();
console.log(`[backfill-origem-tipo] UPDATE idempotente afetou ${result.changes} linha(s)`);

const after = db.prepare("SELECT count(*) AS c FROM leads").get().c;
const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo IS NULL").get().c;
if (before !== after) throw new Error(`contagem de linhas mudou: antes=${before} depois=${after}`);
if (nullCount !== 0) throw new Error(`${nullCount} linha(s) com origem_tipo NULL após o backfill`);

console.log(`[backfill-origem-tipo] OK: ${after} linhas totais, 0 NULL`);
db.close();
```

**Anti-patterns confirmed by RESEARCH.md:** never use `drizzle-kit push` for this `ALTER TABLE` (Pitfall 1, two real precedents in this repo); never write an unconditional `UPDATE leads SET origem_tipo = 'outbound'` without the `WHERE origem_tipo IS NULL` guard; never attempt to remove the physical `DEFAULT 'outbound'` after backfill (SQLite has no `ALTER COLUMN`, would require a full table rebuild — not worth the risk given the `subnichos` FK).

---

### `scripts/test-lead-actions.cjs` (test, request-response integration)

**Analog:** same file — `makeFormData()` (lines 99-116).

**Current base object:**
```javascript
function makeFormData(overrides = {}) {
  const fd = new FormData();
  const base = {
    nome: "Joao Silva",
    telefone: "(11) 91234-5678",
    canal: "whatsapp",
    origem: "Instagram Ads",
    valorEstimado: "1.234,56",
    notas: "Lead quente, pediu retorno.",
    followUpDate: "2026-08-01",
    subnichoId: String(subnichoId),
    ...overrides,
  };
  ...
}
```
**What to copy:** add `origemTipo: "outbound",` to `base` (Pitfall 4 in RESEARCH.md) — without it, every test case expecting success (Caso 1, Caso 7) fails validation once `origemTipo` becomes required in `leadSchema`.

**The two direct `db.insert(leads).values({...})` calls (lines ~219-231 and ~256-266) do NOT need `origemTipo`** — they bypass `leadSchema` entirely (raw Drizzle insert) and the physical `DEFAULT 'outbound'` on the column covers the omission automatically, no error.

**CRITICAL — pre-existing, unrelated failure found in this file during pattern mapping (verified by running the script in this session):**
```
[test-lead-actions] ERRO: SqliteError: no such column: "motivo_perda" - should this be a string literal in single-quotes?
```
The script's temp-DB bootstrap (lines 81-90) only applies `src/db/migrations/0000_gifted_slapstick.sql` — it does **not** apply `0001_grey_xavin.sql` (`motivo_perda`/`stage_changed_at`) nor the manual `ALTER TABLE` statements added later for `contact_attempts` (Phase 06-01) or `import_batch_id`. The script currently fails at `countLeads()` (a plain `db.select().from(leads)`, which references every column declared in `schema.ts`) before it ever reaches `makeFormData()`. **This is a pre-existing gap, not introduced by Phase 8** — but it means the planner cannot rely on "the script currently passes, just needs `origemTipo` added to `makeFormData()`" (RESEARCH.md Pitfall 4's framing). Whoever executes this phase's plan should decide explicitly whether to (a) also fix the temp-DB bootstrap (apply `0001_grey_xavin.sql` + the missing manual `ALTER TABLE`s + the new `origem_tipo` one, so the whole script actually runs end-to-end) as part of this phase, or (b) leave it broken and flag it as separate technical debt in SUMMARY.md. Silently adding only `origemTipo: "outbound"` to `makeFormData()` will NOT make this script pass.

---

## Shared Patterns

### Enum-as-text-column (no CHECK constraint, app-layer-only enforcement)
**Source:** `src/db/schema.ts` (`canal`, `stage`), confirmed against `src/db/migrations/0000_gifted_slapstick.sql:5-9` (raw SQL is plain `text NOT NULL`, no `CHECK`).
**Apply to:** `origemTipo` column — the Drizzle `{ enum: [...] }` annotation is TypeScript-only; the actual enum closure is guaranteed exclusively by Zod in every Server Action write path (`createLead`, `updateLead`, `bulkImportLeads`). This is an accepted, pre-existing project posture (SPEC.md Constraints), not a new risk.

### Zod field required without `.default()` vs. `.default()` override in derived schema
**Source:** `src/lib/validations.ts` — `leadSchema` fields have no defaults (form must always submit real values); `csvRowSchema` (`.omit().extend()`) is the one place that legitimately adds `.default(...)` for fields the CSV flow doesn't collect.
**Apply to:** `origemTipo` — required+no-default in `leadSchema` (D-04), `.default("outbound")` only in the `csvRowSchema.extend({...})` override.

### Explicit-field `.values({...})` inserts (never spread)
**Source:** `src/actions/import-actions.ts` `bulkImportLeads` (lines 143-157), `src/actions/lead-actions.ts` `createLead`/`updateLead` (spread `...parsed.data`, but that's the form path — CSV path is deliberately explicit-field).
**Apply to:** `import-actions.ts` needs `origemTipo: row.origemTipo` added manually to the insert `.values({...})` list — the field will NOT reach the DB automatically just because it's now in `CsvRowValues`/validated. This is a real, previously-documented pitfall class in this file (explicit-field style trades convenience for leak-prevention).

### Manual `ALTER TABLE` via `better-sqlite3`, never `drizzle-kit push`, for `NOT NULL` columns on populated tables
**Source:** `STATE.md` §Accumulated Context (Phase 06-01, Phase 07-01) — no committed script exists for those, but the constraint and the exact DDL shape (`ALTER TABLE `leads` ADD `<col>` <type> DEFAULT <val> NOT NULL;`) is documented and cross-referenced in `08-RESEARCH.md` Pattern 1.
**Apply to:** `scripts/backfill-origem-tipo.cjs` — this is the first phase to actually commit a dedicated `.cjs` migration script (previous two phases applied inline); it should follow the `verify-*.cjs` idiom (`DB_PATH` resolution, `fail()`/exit-code convention) for consistency with the rest of `scripts/`.

## No Analog Found

None — every file in scope has at least a role-match analog (see table above). The only file without a *prior committed migration script* to copy verbatim is `scripts/backfill-origem-tipo.cjs`, but its content is already fully specified in `08-RESEARCH.md` Pattern 2 (reproduced above) and its shell/idiom is a direct match to `scripts/verify-pipeline-migration.cjs`/`scripts/verify-schema.cjs`.

## Metadata

**Analog search scope:** `src/db/schema.ts`, `src/lib/validations.ts`, `src/components/lead-form-dialog.tsx`, `src/lib/csv-import.ts`, `src/actions/import-actions.ts`, `src/actions/lead-actions.ts`, `scripts/*.cjs`, `src/db/migrations/*.sql`, `src/types/index.ts`
**Files scanned:** 13 (7 target files + 6 supporting/precedent files read for context)
**Pattern extraction date:** 2026-08-06
