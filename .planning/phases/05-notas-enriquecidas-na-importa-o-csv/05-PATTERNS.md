# Phase 5: Notas Enriquecidas na Importação CSV - Pattern Map

**Mapped:** 2026-07-29
**Files analyzed:** 4 (3 modified, 1 referenced/no-change)
**Analogs found:** 4 / 4 — all analogs are the files' own current versions (this is an additive extension of an existing feature, not a new surface). No external/different-module analog search was needed; RESEARCH.md already confirms 100% of target files were read directly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `src/lib/csv-import.ts` | utility (pure transform functions) | transform (row → row) | itself, current `mapCsvRows`/`CSV_DEFAULTS` (same file, prior wave) | exact — extend in place, same file/module |
| `src/components/csv-column-mapper.tsx` | component (controlled form step) | transform (derives UI list + summary string from `mapping`/`headers` props, no fetch/mutation) | itself, current `FIELD_CONFIGS` + `Select` pattern (same file, prior wave) | exact — add a new section using the same declarative-config + controlled-input style |
| `src/components/csv-import-wizard.tsx` | component (client-side state machine) | transform / event-driven (discriminated-union `useState`, driven by user actions across 3 steps) | itself, current `WizardState` + `handleMappingChange`/`handleBackToMapping` (same file, prior wave) | exact — extend `WizardState` shape and handlers in place |
| `src/components/csv-import-preview-table.tsx` | component (read-only render + confirm action) | request-response (renders `row.notas`, calls `bulkImportLeads` Server Action on confirm) | itself — **no code change expected** per RESEARCH.md; included here only because it renders the final `notas` value and its "only renders, never recomputes" comment is the invariant the other 3 files must respect | exact (no-op) |

No files require searching outside these four — the phase is purely additive to an already-implemented, already-read feature (Phase 2's CSV import wizard). No "no analog found" section is needed.

## Pattern Assignments

### `src/lib/csv-import.ts` (utility, transform)

**Analog:** itself — current `mapCsvRows` (lines 54-83) and `CSV_DEFAULTS` (lines 47-52)

**Imports pattern** (lines 1-11):
```typescript
/**
 * Contrato de mapeamento/dedup de CSV do CRM (IMPORT-02 metade 1, D-04, D-06,
 * D-07 metade 1): tipos de coluna mapeável, defaults concretos para colunas
 * opcionais não mapeadas/em branco, e detecção de telefone duplicado DENTRO
 * do mesmo lote...
 */
import { normalizePhone } from "@/lib/phone";
```
Follow the same header-comment convention: state which decisions (D-xx) this block implements, in Portuguese, before the type/function.

**Type pattern to extend (not replace)** (lines 13-38):
```typescript
export type CsvFieldKey =
  | "nome"
  | "telefone"
  | "subnichoNome"
  | "canal"
  | "origem"
  | "valorEstimado"
  | "notas";

/** Valor = nome do header do CSV mapeado para esse campo; null = não mapeado. */
export type CsvColumnMapping = Record<CsvFieldKey, string | null>;

export type ParsedCsvRow = Record<string, string>;

export type MappedCsvRow = {
  rowIndex: number;
  nome: string;
  telefone: string;
  telefoneNormalizado: string | null;
  subnichoNome: string;
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: string;
  notas: string;
};
```
Per CONTEXT.md Claude's Discretion + RESEARCH.md Pattern 1, add a **sibling type**, not a new `CsvFieldKey` member — `CsvColumnMapping` stays a closed `Record` over the 7 known fields:
```typescript
export type CsvExtraNotasColumns = string[];
```

**Core transform pattern — where the fallback bug lives** (lines 54-69, THE critical excerpt):
```typescript
export function mapCsvRows(rows: ParsedCsvRow[], mapping: CsvColumnMapping): MappedCsvRow[] {
  function readMapped(row: ParsedCsvRow, field: CsvFieldKey): string {
    const header = mapping[field];
    if (header === null || !(header in row)) return "";
    return (row[header] ?? "").trim();
  }

  return rows.map((row, rowIndex) => {
    const nome = readMapped(row, "nome");
    const telefone = readMapped(row, "telefone");
    const subnichoNome = readMapped(row, "subnichoNome");

    const canal = (readMapped(row, "canal") || CSV_DEFAULTS.canal) as "instagram" | "whatsapp";
    const origem = readMapped(row, "origem") || CSV_DEFAULTS.origem;
    const notas = readMapped(row, "notas") || CSV_DEFAULTS.notas;   // ← line to replace
    const valorEstimado = readMapped(row, "valorEstimado") || CSV_DEFAULTS.valorEstimado;

    return { rowIndex, nome, telefone, telefoneNormalizado: normalizePhone(telefone),
              subnichoNome, canal, origem, valorEstimado, notas };
  });
}
```
**Copy `readMapped` verbatim** (closure pattern, not exported) — the new `buildNotasText` function must use the *same* row-access idiom (`(row[header] ?? "").trim()`), not a new helper. Replace only the `notas` line with a call to the new function, applying `|| CSV_DEFAULTS.notas` on the *final concatenated result* — see RESEARCH.md Pattern 2 for the exact replacement (`buildNotasText(row, mapping, extraNotasColumns, csvHeaderOrder)` then `concatenatedNotas || CSV_DEFAULTS.notas`). This is Pitfall 1 in RESEARCH.md — do not reorder.

**"Fixed headers must never duplicate into extras" pattern** (RESEARCH.md Pattern 2, lines 235-236 of the research doc — copy this exact dedup idiom, it is already validated against Pitfall 4):
```typescript
const fixedHeaders = new Set(Object.values(mapping).filter((v): v is string => v !== null));
const extraSet = new Set(extraColumns.filter((h) => !fixedHeaders.has(h)));
```

**Second exported function for reference (dedup helper, same file)** (lines 91-110):
```typescript
export function detectWithinBatchDuplicatePhones(rows: MappedCsvRow[]): Set<number> {
  const rowIndexesByPhone = new Map<string, number[]>();
  for (const row of rows) {
    if (row.telefoneNormalizado === null) continue;
    const existing = rowIndexesByPhone.get(row.telefoneNormalizado);
    if (existing) { existing.push(row.rowIndex); }
    else { rowIndexesByPhone.set(row.telefoneNormalizado, [row.rowIndex]); }
  }
  const duplicateRowIndexes = new Set<number>();
  for (const rowIndexes of rowIndexesByPhone.values()) {
    if (rowIndexes.length > 1) { for (const rowIndex of rowIndexes) duplicateRowIndexes.add(rowIndex); }
  }
  return duplicateRowIndexes;
}
```
Shows the project's convention for a second pure exported function living in the same file, operating on `MappedCsvRow[]` — same shape/style to follow if `buildNotasText` needs to be exported for unit testing.

**Error handling:** None in this file — it's pure data transformation with no I/O, no throws. `buildNotasText` should follow the same no-throw, always-return-a-string contract (empty-string is a valid, expected return value, per D-07/Pitfall 5).

**Validation:** Not this file's job — `csvRowSchema` in `src/lib/validations.ts` (line 34: `notas: z.string().trim().min(1, "Notas são obrigatórias.")`) validates the final string server-side. No new validation code needed here; just ensure the fallback (`CSV_DEFAULTS.notas`) guarantees non-empty output per row, matching Pitfall 5.

---

### `src/components/csv-column-mapper.tsx` (component, transform)

**Analog:** itself — current `FIELD_CONFIGS` declarative loop (lines 17-25, 73-106)

**Imports pattern** (lines 1-12):
```typescript
"use client";

import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CsvColumnMapping, CsvFieldKey } from "@/lib/csv-import";
```
The new section needs one more type import: `CsvExtraNotasColumns` from the same `@/lib/csv-import` path — same import line, no new module.

**Declarative config pattern to mirror (not reuse directly — new section is checkboxes, not Selects)** (lines 14-25):
```typescript
type FieldConfig = { key: CsvFieldKey; label: string; required: boolean };

const FIELD_CONFIGS: FieldConfig[] = [
  { key: "nome", label: "Nome *", required: true },
  { key: "telefone", label: "Telefone *", required: true },
  { key: "subnichoNome", label: "Sub-nicho", required: false },
  { key: "canal", label: "Canal", required: false },
  { key: "origem", label: "Origem", required: false },
  { key: "valorEstimado", label: "Valor estimado", required: false },
  { key: "notas", label: "Notas", required: false },
];
```

**Controlled-input core pattern (props in, callback out — no internal state)** (lines 44-57):
```typescript
export function CsvColumnMapper({
  headers, mapping, onMappingChange, detectedDelimiter, detectedEncoding, onContinue,
}: CsvColumnMapperProps) {
  const delimiterLabel = detectedDelimiter === ";" ? "ponto-e-vírgula" : "vírgula";
  const canContinue = Boolean(mapping.nome && mapping.telefone);

  function handleFieldChange(key: CsvFieldKey, value: string) {
    onMappingChange({ ...mapping, [key]: value === NONE_VALUE ? null : value });
  }
  ...
```
The new checkbox section follows the **identical shape**: new props `extraNotasColumns: CsvExtraNotasColumns` and `onExtraNotasColumnsChange: (columns: CsvExtraNotasColumns) => void` added to `CsvColumnMapperProps`, with a local `handleToggleExtraColumn(header)` mirroring `handleFieldChange` (no internal `useState` — component stays fully controlled by the wizard, same as today).

**Section container pattern to copy for the new "Colunas extras" block** (lines 72-107, the `<div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">` wrapper around `FIELD_CONFIGS.map`) — reuse the exact `rounded-lg bg-[#F4F4F5] p-6` container styling for the new section, placed as a sibling `<div>` below this block (per D-01, "abaixo dele no mesmo passo").

**Checkbox idiom to copy verbatim** (sourced from `src/components/csv-import-preview-table.tsx` lines 143-151, the project's only two checkbox precedents — no `shadcn/ui` `Checkbox` primitive exists in `src/components/ui/`):
```tsx
<label className="flex items-center gap-2 text-sm text-foreground">
  <input
    type="checkbox"
    className="size-4 accent-[#0D9488]"
    checked={override.importarMesmoAssim}
    onChange={() => table.options.meta?.onToggleImportAnyway?.(r.rowIndex)}
  />
  Importar mesmo assim
</label>
```
Second precedent (`src/components/template-form-dialog.tsx` line 179, react-hook-form registered variant — not applicable here since this wizard has no form library, but confirms the `size-4`/`h-4 w-4` + `accent-[#0D9488]` styling convention is consistent project-wide):
```tsx
<label className="flex items-center gap-2 text-sm">
  <input type="checkbox" {...form.register("isDefault")} className="h-4 w-4" />
  Marcar como padrão para este tipo
</label>
```
**Do not run `npx shadcn add checkbox`** — RESEARCH.md explicitly flags this as a repeat of a prior OOM failure on this 4GB host (`popover.tsx` had to be hand-written after `shadcn add popover` crashed). Use the native `<input type="checkbox">` idiom above.

**Section heading + button pattern for consistency** (lines 60-70, 109-118) — copy the `<h2 className="text-[20px] leading-tight font-semibold">` / `<p className="text-sm text-muted-foreground">` idiom for the new section's label ("Colunas extras para notas (opcional)", D-04) and for the live summary text (D-09).

---

### `src/components/csv-import-wizard.tsx` (component, state machine)

**Analog:** itself — current `WizardState` discriminated union + step-preserving handlers

**Imports pattern** (lines 1-23) — unchanged, no new imports needed beyond the `CsvExtraNotasColumns` type already exported from `@/lib/csv-import` (already imported as a type-only group in the existing `import { ... } from "@/lib/csv-import"` block, lines 8-14).

**State shape pattern — add sibling field to 2 of 3 union members** (lines 55-73):
```typescript
type WizardState =
  | { step: "upload"; fileName?: string; error?: CsvUploadError }
  | {
      step: "mapping";
      fileName: string;
      parsedRows: ParsedCsvRow[];
      detectedDelimiter: string;
      detectedEncoding: "UTF-8" | "Windows-1252";
      mapping: CsvColumnMapping;
      // extraNotasColumns: CsvExtraNotasColumns;  ← ADD
    }
  | {
      step: "preview";
      fileName: string;
      parsedRows: ParsedCsvRow[];
      detectedDelimiter: string;
      detectedEncoding: "UTF-8" | "Windows-1252";
      mapping: CsvColumnMapping;
      // extraNotasColumns: CsvExtraNotasColumns;  ← ADD
      mappedRows: MappedCsvRow[];
    };
```

**Default-value constant pattern** (line 28-36, `EMPTY_MAPPING`):
```typescript
const EMPTY_MAPPING: CsvColumnMapping = {
  nome: null, telefone: null, subnichoNome: null, canal: null,
  origem: null, valorEstimado: null, notas: null,
};
```
Add sibling constant `const EMPTY_EXTRA_NOTAS_COLUMNS: CsvExtraNotasColumns = [];` right below it, same naming convention (`EMPTY_*`).

**State-transition handler pattern to mirror exactly** (lines 229-259, the three handlers that touch `mapping`):
```typescript
function handleMappingChange(mapping: CsvColumnMapping) {
  if (state.step !== "mapping") return;
  setState({ ...state, mapping });
}

function handleContinueToPreview() {
  if (state.step !== "mapping") return;
  const rows = mapCsvRows(state.parsedRows, state.mapping);
  const hasAnyValidRow = rows.some((row) => row.nome !== "" && row.telefone !== "");
  if (!hasAnyValidRow) {
    setState({ step: "upload", error: ERROR_NO_VALID_ROWS });
    return;
  }
  setPreviewSupportData(null);
  setOverrides(new Map());
  setState({ ...state, step: "preview", mappedRows: rows });
}

function handleBackToMapping() {
  if (state.step !== "preview") return;
  setState({
    step: "mapping",
    fileName: state.fileName,
    parsedRows: state.parsedRows,
    detectedDelimiter: state.detectedDelimiter,
    detectedEncoding: state.detectedEncoding,
    mapping: state.mapping,
  });
}
```
Add `handleExtraNotasColumnsChange` mirroring `handleMappingChange` exactly (same `if (state.step !== "mapping") return;` guard idiom used throughout this file). Extend `handleContinueToPreview`'s call to `mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns)` and thread `extraNotasColumns: state.extraNotasColumns` through both the `setState({...state, step: "preview", ...})` call and `handleBackToMapping`'s explicit field list (this file never spreads `...state` when going back to `"mapping"` — it lists every field explicitly, so the new field must be added to that explicit list, not assumed via spread).

**Initial-state-on-upload pattern** (lines 213-222) — where `EMPTY_MAPPING` is spread in today:
```typescript
setPreviewSupportData(null);
setOverrides(new Map());
setState({
  step: "mapping",
  fileName: file.name,
  parsedRows: result.data,
  detectedDelimiter: result.meta.delimiter,
  detectedEncoding,
  mapping: { ...EMPTY_MAPPING },
});
```
Add `extraNotasColumns: [...EMPTY_EXTRA_NOTAS_COLUMNS]` (or just `[]`) alongside `mapping: { ...EMPTY_MAPPING }` here.

**Render/prop-passing pattern** (lines 296-306, where `CsvColumnMapper` is invoked):
```tsx
if (state.step === "mapping") {
  return (
    <CsvColumnMapper
      headers={Object.keys(state.parsedRows[0] ?? {})}
      mapping={state.mapping}
      onMappingChange={handleMappingChange}
      detectedDelimiter={state.detectedDelimiter}
      detectedEncoding={state.detectedEncoding}
      onContinue={handleContinueToPreview}
    />
  );
}
```
This is also the canonical source of `csvHeaderOrder` (`Object.keys(state.parsedRows[0] ?? {})`) — RESEARCH.md Pitfall 3 requires this exact same derivation to be used inside `mapCsvRows`/`buildNotasText` in `csv-import.ts` (derived from `rows[0]`, the function's own first parameter — never a second independently-computed header list). Add `extraNotasColumns={state.extraNotasColumns}` and `onExtraNotasColumnsChange={handleExtraNotasColumnsChange}` to this JSX call.

**Error handling:** None specific to this file beyond the existing `CsvUploadError` heading/body pattern (lines 38-46) — no new error states are introduced by this phase (extra-columns selection cannot fail; it's a pure UI toggle).

---

### `src/components/csv-import-preview-table.tsx` (component, request-response) — NO CODE CHANGE EXPECTED

**Analog:** itself. Included only as the downstream consumer whose invariant must not be broken.

**The invariant to preserve** (comment at lines 28-30):
```typescript
/** Flags por linha (D-05/D-10/D-12), computadas no wizard a partir de
 * `fetchPreviewSupportData` (contra o banco) + `detectWithinBatchDuplicatePhones`
 * (dentro do lote) — este componente só renderiza, nunca recalcula. */
```
The `notas` column is rendered via `{ accessorKey: "notas", header: "Notas" }` (line 121) inside `previewColumns` — it displays `row.original.notas` as plain text through `@tanstack/react-table`'s `flexRender`, which passes through React's default JSX escaping. **No `dangerouslySetInnerHTML` anywhere in this file** — confirmed safe for the multi-line concatenated notas text (newlines render fine inside a `<TableCell>` since CSS `white-space` is not overridden to `nowrap` here; if multi-line notas look cramped in the preview cell, that is a display-only concern, not a data-safety one, and is not decided by this PATTERNS.md — leave to planner/implementer discretion per CONTEXT.md's "Claude's Discretion" scope).

---

## Shared Patterns

### "Only renders, never recomputes" boundary
**Source:** `src/components/csv-import-preview-table.tsx` lines 28-30 (comment)
**Apply to:** `src/lib/csv-import.ts` (owns all computation) vs. `src/components/csv-import-preview-table.tsx` (owns zero computation). The new `buildNotasText` function must live in `csv-import.ts`, never be duplicated or partially recomputed inside the preview table component.

### Discriminated-union `useState` wizard, no reducer
**Source:** `src/components/csv-import-wizard.tsx` lines 55-73 (comment: "convenção do projeto, 02-PATTERNS.md seção 10")
**Apply to:** Any new wizard state must be added as a field on the existing `"mapping"`/`"preview"` union members — do not introduce a second `useState`/reducer for `extraNotasColumns`; it must travel inside the same `WizardState` object exactly like `mapping` does.

### Header-comment convention citing decision IDs
**Source:** `src/lib/csv-import.ts` lines 1-10, `src/components/csv-column-mapper.tsx` lines 39-43
**Apply to:** All new/modified blocks in this phase — prefix new functions/sections with a short Portuguese comment citing the relevant `D-xx` decision IDs from `05-CONTEXT.md`, matching the existing style (e.g., "// D-08: ordem do CSV, não ordem de clique").

### Native HTML checkbox, never `shadcn add checkbox`
**Source:** `src/components/csv-import-preview-table.tsx` lines 143-151; `src/components/template-form-dialog.tsx` lines 178-181
**Apply to:** `src/components/csv-column-mapper.tsx` new "Colunas extras para notas" section — `<input type="checkbox" className="size-4 accent-[#0D9488]" />` wrapped in a `<label className="flex items-center gap-2 text-sm ...">`. Do not attempt to install a new shadcn primitive on this 4GB host (documented OOM history with `popover`).

### `#F4F4F5` rounded container for step sections
**Source:** `src/components/csv-column-mapper.tsx` line 72 (`rounded-lg bg-[#F4F4F5] p-6`)
**Apply to:** The new checkboxes section (D-01–D-04) and, optionally, its live-summary text (D-09) — reuse the same container class for visual consistency with the existing field-mapping block on the same wizard step.

### Server-side validation stays untouched
**Source:** `src/lib/validations.ts` line 34 (`csvRowSchema`, `notas: z.string().trim().min(1, "Notas são obrigatórias.")`), `src/actions/import-actions.ts` (`bulkImportLeads`)
**Apply to:** No changes needed to the Server Action or Zod schema — the concatenated `notas` string produced client-side by `buildNotasText`/`mapCsvRows` flows through the exact same `ConfirmedImportRow.notas: string` field and validation path that the 1-to-1 `notas` mapping already uses today. This is why Pitfall 5 (empty concatenated result on a per-row basis) matters: an unguarded empty string would surface as a confusing server-side "Notas são obrigatórias" validation failure instead of the expected `CSV_DEFAULTS.notas` fallback.

## No Analog Found

None — all 4 files in scope are themselves the analog (this phase modifies existing, already-read files rather than creating new ones in an unfamiliar area of the codebase).

## Metadata

**Analog search scope:** `src/lib/csv-import.ts`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-wizard.tsx`, `src/components/csv-import-preview-table.tsx`, `src/lib/validations.ts` (validation reference only), `src/components/template-form-dialog.tsx` (second checkbox precedent only)
**Files scanned:** 6 (4 primary target files + 2 supporting-pattern files)
**Pattern extraction date:** 2026-07-29

---

*Phase: 05-notas-enriquecidas-na-importa-o-csv*
*Patterns mapped: 2026-07-29*
