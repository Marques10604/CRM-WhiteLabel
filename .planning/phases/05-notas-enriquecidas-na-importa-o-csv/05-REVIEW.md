---
phase: 05-notas-enriquecidas-na-importa-o-csv
reviewed: 2026-07-29T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/lib/csv-import.ts
  - scripts/verify-notas-concat.cjs
  - src/components/csv-column-mapper.tsx
  - src/components/csv-import-wizard.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the "notas enriquecidas na importação CSV" feature: the concatenation
contract (`src/lib/csv-import.ts`), its behavioral test harness
(`scripts/verify-notas-concat.cjs`), the column-mapping UI
(`src/components/csv-column-mapper.tsx`), and the wizard orchestrating all
three import steps (`src/components/csv-import-wizard.tsx`).

The core concatenation logic (`buildNotasText`/`mapCsvRows`) is solid: all 10
scenarios in the verification harness pass (`node
scripts/verify-notas-concat.cjs` → `OK`), `tsc --noEmit` is clean, and the
D-05..D-11 decisions documented in `05-RESEARCH.md` are correctly implemented
in the data layer, including the Pitfall-4 defensive filter (`fixedHeaders`)
that prevents a column from being concatenated twice.

However, the review found one ship-blocking gap in error handling for the
preview-data fetch (the import wizard has no recovery path if that fetch
fails — the admin gets stuck indefinitely), plus several warnings: the
mapping step's live "Serão concatenadas" summary can display stale/incorrect
column names in an edge case that the project's own research doc explicitly
called out as a required invariant, an unvalidated type assertion on the CSV
`canal` value, silently-discarded Papa.parse row errors, and no guard against
mapping the same CSV column to two different fixed fields.

## Critical Issues

### CR-01: No error handling for preview-support-data fetch — wizard can get stuck indefinitely

**File:** `src/components/csv-import-wizard.tsx:121-140` (fetch) and `:324-326` (render)

**Issue:** The `useEffect` that loads duplicate/unknown-subnicho support data
for the preview step calls the server action without a `.catch`:

```ts
fetchPreviewSupportData(normalizedPhones, subnichoNamesTrimmed).then((data) => {
  if (!cancelled) setPreviewSupportData(data);
});
```

If `fetchPreviewSupportData` rejects (DB error, network blip, server action
throwing), `previewSupportData` is never set. Downstream, the wizard's render
branch is:

```tsx
if (!previewRows) {
  return <p className="text-sm text-muted-foreground">Carregando prévia...</p>;
}
```

`previewRows` stays `null` forever in this failure case (it's a `useMemo`
gated on `previewSupportData` being non-null), and there is no button, link,
or timeout on this screen to go back or retry — `handleBackToMapping` is only
wired to `CsvImportPreviewTable`, which never renders. The admin is left on
an infinite "Carregando prévia..." message with the only recovery being a
full page reload, which discards the entire upload/mapping work for that
CSV batch. For a solo-admin tool whose whole point is fast, no-friction CSV
import, this is a hard dead end triggered by an ordinary transient failure
(this is a real Server Action making DB calls, not a pure-client operation).

**Fix:**
```tsx
useEffect(() => {
  if (!mappedRows) return;
  let cancelled = false;
  setPreviewError(false);
  const normalizedPhones = /* ... */;
  const subnichoNamesTrimmed = /* ... */;

  fetchPreviewSupportData(normalizedPhones, subnichoNamesTrimmed)
    .then((data) => {
      if (!cancelled) setPreviewSupportData(data);
    })
    .catch(() => {
      if (!cancelled) setPreviewError(true);
    });

  return () => { cancelled = true; };
}, [mappedRows]);

// render:
if (previewError) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-destructive">
        Não foi possível carregar a prévia. Tente novamente.
      </p>
      <Button onClick={handleBackToMapping}>Voltar ao mapeamento</Button>
    </div>
  );
}
if (!previewRows) {
  return <p className="text-sm text-muted-foreground">Carregando prévia...</p>;
}
```

## Warnings

### WR-01: Live "Serão concatenadas" summary can show a column that will NOT actually be concatenated

**File:** `src/components/csv-column-mapper.tsx:148-153` (root cause: `:59-61`)

**Issue:** `05-RESEARCH.md` (Pitfall 4, line 341) explicitly states: *"Aplicar
essa mesma regra tanto em `buildNotasText` (Pattern 2) quanto no resumo ao
vivo do wizard (D-09) — os dois precisam concordar."* `buildNotasText`
correctly excludes any header already used by a fixed field
(`fixedHeaders`/`extraSet`, `src/lib/csv-import.ts:87-88`). The live summary
does not apply the same exclusion:

```tsx
{extraNotasColumns.length > 0 && (
  <p className="text-sm text-muted-foreground">
    Serão concatenadas: {headers.filter((h) => extraNotasColumns.includes(h)).join(" → ")}
  </p>
)}
```

Repro: (1) admin checks header `score` as an extra notas column
(`extraNotasColumns = ["score"]`); (2) admin then maps a different fixed
field (e.g. "Origem") to that same header `score`. The checkbox for `score`
correctly disappears (`unmappedHeaders` excludes it), but `extraNotasColumns`
state is never cleaned up — `handleFieldChange` only updates `mapping`, never
`extraNotasColumns`. The summary paragraph still reads `extraNotasColumns`
directly (not filtered against `mappedHeaders`), so it keeps showing "Serão
concatenadas: score" even though `buildNotasText`'s defensive filter will
silently drop it. The final saved `notas` text is correct (protected by the
`fixedHeaders` filter in `csv-import.ts`), but the on-screen promise the
admin sees before confirming is wrong — exactly the divergence the phase's
own research doc says must not happen.

**Fix:** Reuse the `mappedHeaders` set already computed in this component
(line 67) to filter both the checklist and the summary consistently, and fix
the render guard too:

```tsx
function handleFieldChange(key: CsvFieldKey, value: string) {
  const nextValue = value === NONE_VALUE ? null : value;
  onMappingChange({ ...mapping, [key]: nextValue });
  if (nextValue !== null && extraNotasColumns.includes(nextValue)) {
    onExtraNotasColumnsChange(extraNotasColumns.filter((h) => h !== nextValue));
  }
}

// ...
const visibleExtraColumns = extraNotasColumns.filter((h) => !mappedHeaders.has(h));
// ...
{visibleExtraColumns.length > 0 && (
  <p className="text-sm text-muted-foreground">
    Serão concatenadas: {headers.filter((h) => visibleExtraColumns.includes(h)).join(" → ")}
  </p>
)}
```

### WR-02: Unvalidated CSV text force-cast to the `canal` union type

**File:** `src/lib/csv-import.ts:120`

**Issue:**
```ts
const canal = (readMapped(row, "canal") || CSV_DEFAULTS.canal) as "instagram" | "whatsapp";
```
When the "canal" column is mapped but a cell contains anything other than the
literal strings `"instagram"`/`"whatsapp"` (e.g. `"WhatsApp"`, `"wpp"`,
`"Instagram "` with trailing text, or any messy real-world value — the exact
kind of input this project's own stack docs flag CSVs from a partner cowork
as producing), the `as` assertion lies to the type system: `canal` is typed
as the 2-value union but at runtime holds arbitrary text. `csvRowSchema`
(`src/lib/validations.ts:26`) does reject this server-side with
`z.enum(["instagram","whatsapp"])`, but only at final confirm, and
`bulkImportLeads` aborts the **entire batch** transactionally on the first
invalid row (`src/actions/import-actions.ts:90-101`) — so one messy cell in a
500-row CSV blocks the whole import with a message identifying only the
first bad row. The preview screen's `RowFlags` system flags
`duplicadoDb`/`duplicadoLote`/`subnichoNovo`/`subnichoBloqueado`/`telefoneInvalido`
but has no equivalent for an invalid `canal` value, so nothing in the preview
warns the admin before they hit "Importar" and get the whole-batch failure.

**Fix:** Validate instead of blindly casting, so an unexpected value falls
back to the documented default rather than becoming an invalid literal:
```ts
const rawCanal = readMapped(row, "canal");
const canal: "instagram" | "whatsapp" =
  rawCanal === "instagram" || rawCanal === "whatsapp" ? rawCanal : CSV_DEFAULTS.canal;
```

### WR-03: PapaParse row-level errors are silently discarded

**File:** `src/components/csv-import-wizard.tsx:201-212`

**Issue:**
```ts
result = Papa.parse<ParsedCsvRow>(decoded, {
  header: true,
  skipEmptyLines: true,
  delimiter: "",
  transformHeader: (h) => h.trim(),
});
```
`result.errors` (PapaParse's per-row parse issues — e.g. `TooFewFields`/
`TooManyFields` for ragged rows in a malformed CSV) is never inspected. Only
`result.data`/`result.data.length` is checked. A CSV with structural problems
partway through (a common real-world case for CSVs exported/hand-edited by a
non-technical partner) parses "successfully" with silently truncated or
misaligned rows and no signal to the admin that anything was off.

**Fix:** Surface a non-blocking warning when `result.errors.length > 0`
(e.g. a toast: `"${result.errors.length} linha(s) tiveram problemas de
formatação e podem estar incompletas"`), without necessarily blocking the
import — matches the project's existing "review before commit" pattern used
elsewhere in this wizard (duplicate/invalid-phone flags).

### WR-04: No guard against mapping the same CSV column to two different fixed fields

**File:** `src/components/csv-column-mapper.tsx:92-125`

**Issue:** Each `FIELD_CONFIGS` entry builds its `Select` items independently
from the full `headers` array, with no cross-check against the other six
fields' current selections:
```ts
const items = config.required
  ? headers.map((header) => ({ value: header, label: header }))
  : [{ value: NONE_VALUE, label: "— nenhuma —" }, ...headers.map((header) => ({ value: header, label: header }))];
```
Nothing stops an admin from mapping, e.g., the "Telefone" column to both the
`telefone` field and the `origem` field — `origem` would then literally hold
the raw phone-number text for every imported lead, with no warning anywhere
in the mapping or preview steps. (The "extra notas columns" section does
correctly exclude already-mapped headers via `unmappedHeaders` — the fixed
fields have no equivalent protection against each other.)

**Fix:** At minimum, disable/gray-out header options already selected by
another fixed field within each `Select`'s item list, mirroring the
`unmappedHeaders` exclusion already used for the extra-columns checkboxes.

## Info

### IN-01: Unused `eslint-disable` directives (dead suppression comments)

**File:** `src/components/csv-import-wizard.tsx:139, 175`

**Issue:** `npx eslint` reports both `// eslint-disable-next-line
react-hooks/exhaustive-deps` comments as unused — the dependency arrays they
guard (`[mappedRows]` and `[mappedRows, previewSupportData,
duplicatePhonesSet, unknownSubnichoNamesSet, duplicateRowIndexesInBatch]`)
already satisfy the rule (all outer-scope reactive values referenced inside
are listed; the imported action and stable setState functions are correctly
not required). These comments no longer suppress anything and are dead
noise.

**Fix:** Remove both `eslint-disable-next-line` comments; re-run `npx eslint`
to confirm no new warnings appear.

### IN-02: `require()` imports trigger lint errors in the new test harness

**File:** `scripts/verify-notas-concat.cjs:16-18`

**Issue:** `npx eslint scripts/verify-notas-concat.cjs` fails with 3×
`@typescript-eslint/no-require-imports` errors for the `require("node:fs")`,
`require("node:path")`, `require("typescript")` lines. This matches the
project's existing precedent (`scripts/guard-no-hard-delete.cjs` has the
identical two errors already), so it's not a new pattern introduced here,
but it does mean `npm run lint` (if it includes `scripts/`) fails on this
file too.

**Fix:** Either exclude `scripts/**/*.cjs` from the TS-aware ESLint config
(`eslint.config.mjs`) project-wide, or add a scoped
`/* eslint-disable @typescript-eslint/no-require-imports */` at the top of
both `.cjs` scripts — low priority, matches existing precedent.

### IN-03: "Nenhuma linha válida" error path loses the already-known file name

**File:** `src/components/csv-import-wizard.tsx:246-254`

**Issue:**
```ts
function handleContinueToPreview() {
  if (state.step !== "mapping") return;
  const rows = mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns);
  const hasAnyValidRow = rows.some((row) => row.nome !== "" && row.telefone !== "");
  if (!hasAnyValidRow) {
    setState({ step: "upload", error: ERROR_NO_VALID_ROWS });
    return;
  }
  ...
}
```
`state.fileName` is available (guaranteed by the `"mapping"` step's type) but
is not passed into the reset `setState`, unlike the equivalent reset in
`handleFileSelected` (`:180-189`, which does include `fileName: file.name`).
The dropzone loses the "arquivo selecionado" context for no reason on this
particular error path.

**Fix:** `setState({ step: "upload", fileName: state.fileName, error: ERROR_NO_VALID_ROWS });`

### IN-04: No way back to the upload step from the mapping step

**File:** `src/components/csv-column-mapper.tsx` (whole component), `src/components/csv-import-wizard.tsx:309-322`

**Issue:** `CsvColumnMapper` only renders a forward "Ver prévia" action (line
156-165); there is no back/cancel button wired to return to the `"upload"`
step. `handleReset` in the wizard is only passed to `CsvUploadDropzone`. If
an admin realizes mid-mapping that they picked the wrong file, the only
recovery is a full page reload, discarding the parsed data. This looks like
pre-existing wizard-shell behavior rather than something introduced by this
phase's changes, but it is visible in the file under review and worth
tracking.

**Fix:** Add a "Cancelar" / "Escolher outro arquivo" button in
`CsvColumnMapper` that calls a new `onCancel` prop wired to `handleReset` in
the wizard.

---

_Reviewed: 2026-07-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
