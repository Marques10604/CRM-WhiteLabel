# Phase 2: CSV Bulk Import - Research

**Researched:** 2026-07-22
**Domain:** Client-side CSV parsing (delimiter/encoding auto-detection) + Next.js Server Actions bulk-insert + Drizzle/SQLite schema for batch tracking
**Confidence:** MEDIUM-HIGH (stack/API mechanics verified against official docs; Brazilian-export assumptions remain unvalidated against a real cowork file per D-01)

## Summary

This phase adds a single new runtime dependency (PapaParse, already pre-approved in `CLAUDE.md`'s recommended stack) and one additive schema column. The core technical finding is that **PapaParse solves delimiter auto-detection natively but does NOT solve encoding auto-detection** — its own config docs state `encoding` must be explicitly specified if used at all; there is no `detectEncoding` option. This means Phase 2 needs a small companion encoding-sniffing step (BOM check + UTF-8 validity probe via `TextDecoder(..., {fatal:true})`, falling back to `windows-1252`) sitting in front of PapaParse, not a library omission to patch later.

The existing codebase already contains the exact reuse seam this phase needs for D-14 (post-import WhatsApp list): `followup-dashboard.tsx` demonstrates the precise pattern — a single `WhatsAppPreviewDialog` instance driven by one `previewState` object, with N `WhatsAppSendButton`s (one per row) each calling `setPreviewState({ open: true, lead, subnichoNome })`. The post-import screen should copy this pattern verbatim (swap `defaultTipo="follow_up"` for `"primeiro_contato"`), not build a new mechanism. `useFirstContactTrigger` (the Phase-4 hook explicitly built anticipating this reuse) is a viable alternative to hand-rolled `useState<PreviewState>`, but its 1-argument `trigger(lead, subnichoNome)` API is literally the same shape already used inline — either is fine, inline `useState` matches more existing precedent (3 of 4 current surfaces use raw `useState`, not the hook).

For the Server Action / bulk-insert split: Next.js Server Actions have a **default 1MB request body limit** (configurable via `experimental.serverActions.bodySizeLimit` in `next.config.ts`, not yet set in this repo), and SQLite has a **999-variable-per-statement limit** (older SQLite versions; newer default 32766, but better-sqlite3's bundled SQLite version should not be assumed to be the higher figure) that Drizzle does not currently auto-chunk around. Given the `leads` table has ~13 insertable columns, a single multi-row `.values([...])` insert becomes unsafe above roughly 75 rows per statement on the conservative 999 limit. The safest, simplest fix — and the one that best matches this codebase's existing style (small, explicit, no new abstraction) — is a `db.transaction()` wrapping a `for` loop of single-row inserts, which sidesteps the variable-limit question entirely while keeping the transactional atomicity the codebase already leans on elsewhere.

**Primary recommendation:** Parse and preview entirely client-side with PapaParse (`worker: true`, `preview` unset for full parse since row counts are expected to be in the low hundreds, not the file is discarded after preview confirm), sniff encoding manually before handing the raw bytes to PapaParse, submit the confirmed/mapped rows as a plain-object array argument to a single Server Action (not FormData), and insert via a `db.transaction()` loop — never a single giant multi-row `.values([...])` call.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File selection (drag-and-drop / picker) | Browser / Client | — | Native `<input type="file">` / File API, no server round-trip needed until confirm |
| Encoding detection + decode to UTF-8 string | Browser / Client | — | Must happen before parsing; PapaParse operates on already-decoded text/File, doesn't sniff bytes itself |
| Delimiter detection + CSV → row objects | Browser / Client | — | PapaParse's native `delimiter: ""` auto-detect; keeps the raw file off the server until the admin confirms |
| Column mapping UI | Browser / Client | — | Pure UI state, no persistence needed until confirm |
| Duplicate-phone detection (within-batch) | Browser / Client | — | Compares rows already in memory client-side; no DB round-trip needed for this half of D-07 |
| Duplicate-phone detection (against DB) | API / Backend | Browser / Client (invocation) | Needs a DB read; exposed as a Server Action the client calls during preview build, before confirm |
| Sub-nicho existing-name lookup (for "unknown → auto-create" flagging) | API / Backend | Browser / Client (invocation) | Needs the current `subnichos` table; same Server Action round-trip as duplicate check, ideally combined into one preview-support endpoint |
| Preview screen render (flags, editable mapping) | Browser / Client | — | All flagging computed above is passed in as data; this tier just renders it |
| Bulk insert (leads + auto-created sub-nichos) | API / Backend | Database / Storage | Server Action wrapping `db.transaction()`; must be atomic and revalidate the same paths as `createLead` |
| Batch-tracking persistence (LEAD-05) | Database / Storage | API / Backend | New additive column on `leads`, written at insert time by the same Server Action |
| Post-import WhatsApp send (D-14) | Browser / Client | API / Backend (link generation only) | Reuses existing client-side `WhatsAppPreviewDialog`/`buildWaLink`; no new backend surface |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01:** No real cowork CSV sample exists at discussion time. Proceed on assumptions below; validate against a real file as early as possible once the cowork sends one (carried-forward blocker from STATE.md).
- **D-02:** Auto-detect delimiter (comma vs semicolon) rather than assuming one fixed format. The admin uses Google Sheets (comma+UTF-8 default), distinct from Excel BR (semicolon+variable-encoding). Auto-detection (PapaParse supports this natively) covers both.
- **D-03:** Auto-detect file encoding (do not assume UTF-8 fixed) — protects against Windows-1252/Latin-1 exports corrupting accented characters (é/ã/ç).
- **D-04:** Only `nome` + `telefone` are guaranteed columns. All other fields (sub-nicho, origem, canal, valor, notas) are optional/mappable manually in the preview screen — column format is not fixed/template-driven.
- **D-05:** A row whose phone matches an existing active lead is flagged in the preview screen; the admin decides per-row (Skip / Import anyway) — no auto-skip, no all-or-nothing block.
- **D-06:** Duplicate comparison uses the existing `normalizePhone()` (digits-only, DDI 55) — not raw text comparison.
- **D-07:** Duplicate detection checks **both directions**: against leads already in the database, AND between rows within the same CSV batch being imported right now.
- **D-08:** Confirming "import anyway" on a flagged duplicate **always creates a new, separate lead** — never updates/merges into the existing one. Merge-on-import deferred to v2.
- **D-09:** A sub-nicho name in the CSV that doesn't match any existing sub-nicho (same case-insensitive/trim exact-match rule as LEAD-02) is **created automatically**.
- **D-10:** Newly-created sub-nichos are **highlighted in the preview screen** before the admin confirms.
- **D-11:** No fuzzy/similarity detection for batch-import — same rule as Phase 1 (exact case-insensitive/trim match only).
- **D-12:** A blank/empty sub-nicho cell **blocks that row** — the preview screen requires the admin to manually pick an existing sub-nicho before it can be confirmed (`subnichoId` is `NOT NULL`).
- **D-13:** Batch import **never** auto-triggers the Phase-4 `useFirstContactTrigger` modal per lead — that auto-open behavior stays exclusive to manual single-lead creation.
- **D-14:** After a successful import, a screen/list shows the newly-imported leads, each with its own "Enviar WhatsApp" button already in place (reusing the Phase 4 preview-before-send component, defaulting to "primeiro contato" template type).

### Claude's Discretion

- Exact schema shape for import-batch tracking (LEAD-05) — e.g. a single `importBatchId` column vs. a dedicated `import_batches` table.
- Exact route/page structure for upload → mapping → preview → post-import screen, and whether column mapping is a separate step or folded into the preview screen.
- Whether the post-import send screen (D-14) is a dedicated route or a filtered view of `/leads`/dashboard.
- Visual treatment of flagged rows (duplicate / new-sub-nicho / blocked-empty-subnicho) in the preview table.
- AI-generated personalized outreach messages: explicitly out of scope for v1 (deferred idea, not this phase).
- "Automatic" bulk sending without a manual click per lead is not achievable within the no-WhatsApp-Business-API constraint — in-scope equivalent is D-14.

### Deferred Ideas (OUT OF SCOPE)

- **Mensagens de prospecção personalizadas por IA** — v2 candidate, not this phase.
- **Envio de WhatsApp verdadeiramente automático/em massa (sem clique manual)** — not achievable within the project's constraints; D-14 is the in-scope equivalent.
- Todo `2026-07-21-sequencia-follow-up-escalonada.md` — matched by keyword only, not CSV-import scope; not folded in.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPORT-01 | Admin pode importar leads via arquivo CSV com mapeamento de colunas e preview antes de confirmar | See "Architecture Patterns" (upload → parse → map → preview → confirm flow), "Code Examples" (PapaParse config), payload-limit findings in Summary |
| IMPORT-02 | Sistema detecta e avisa sobre leads duplicados (por telefone) antes de confirmar a importação | See "Don't Hand-Roll" (reuse `normalizePhone`), duplicate-check Server Action pattern in "Architecture Patterns" |
| IMPORT-03 | Sistema detecta automaticamente delimitador (vírgula/ponto-e-vírgula) e codificação de exportações CSV brasileiras (Excel pt-BR) | See "Common Pitfalls" (BOM, Windows-1252, PapaParse encoding gap) and "Code Examples" (encoding-sniff snippet) |
| LEAD-05 | Cada lead importado é rastreado com o lote (batch) de importação de origem | See "Recommended Schema Shape" in Architecture Patterns |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No separate API routes for internal CRUD** — bulk-insert must be a Server Action, matching every existing mutation (`createLead`, `createSubnicho`, `updateLeadStage`).
- **PapaParse 5.5.4 is the pre-approved CSV library** — already named explicitly in `CLAUDE.md`'s Supporting Libraries table; do not evaluate alternatives (`csv-parse`, etc.) except as documented fallback.
- **Zod 4.x for row validation** — CSV row validation should reuse/extend the existing `leadSchema` shape in `src/lib/validations.ts`, not a parallel schema.
- **No WhatsApp Business API / no automatic bulk send** — reinforced by D-13/D-14; the post-import screen must remain click-per-lead.
- **Drizzle + drizzle-kit push, additive-only migrations** — LEAD-05's new column must be nullable or defaulted, never a breaking change (same pattern as `motivoPerda`, `stageChangedAt` in Phase 1/3).
- **No hard-delete** — `npm run guard:no-hard-delete` convention applies; import rollback (if ever added) must use `deletedAt`, not `DELETE FROM`. Not explicitly required this phase (no rollback UI in scope) but must not violate the guard script.
- **Solo-admin, browser-only, no auth** — no additional gating needed for the import route.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| papaparse | 5.5.4 [VERIFIED: npm registry] | CSV parsing (delimiter auto-detect, streaming, File API support) | De facto standard browser CSV parser; already named in `CLAUDE.md`; 11+ years old, no postinstall script, canonical GitHub repo `mholt/PapaParse` |
| zod | 4.4.3 (installed; `CLAUDE.md` names 4.4.0 — both fine) [VERIFIED: package.json] | Row-level validation for mapped CSV rows before insert | Already the project's validation library; reuse `leadSchema`-derived shape for consistency with manual lead creation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto.randomUUID()` (Node/browser built-in, no package) | Node 24.x runtime confirmed on this host [VERIFIED: `node --version`] | Generating a batch identifier (LEAD-05) | Available natively in both the browser (`window.crypto.randomUUID`) and Node ≥14.17/browser Server Action runtime — no `uuid` package needed, avoids an unnecessary new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual BOM+TextDecoder encoding sniff (hand-written, ~15 lines) | `chardet` / `jschardet` npm packages | Those packages are general-purpose multi-encoding statistical detectors (dozens of KB, built for arbitrary text). This phase only needs to distinguish 2 realistic cases (UTF-8 vs Windows-1252/Latin-1, per D-02/D-03's own framing) — a BOM check + `TextDecoder('utf-8',{fatal:true})` trial-decode is deterministic, zero-dependency, and covers exactly the documented Google-Sheets-vs-Excel-BR scenario. Only reach for a detection library if a real cowork sample later surfaces a 3rd encoding this heuristic can't resolve (D-01 revalidation trigger). |
| `importBatchId` column on `leads` | Dedicated `import_batches` table | See "Recommended Schema Shape" below — column is recommended for this project's scale; table documented as the alternative for when batch-level metadata (e.g., original filename, row count, undo-batch feature) becomes a real requirement. |
| `db.transaction()` + row-by-row insert loop | Chunked multi-row `.values([...])` inserts (e.g., 50 rows per statement) | Chunking is a valid alternative and marginally faster for very large batches (1000+ rows), but requires the caller to compute a safe chunk size against SQLite's variable limit and the exact column count — an easy off-by-one source of bugs. Given this CRM's realistic batch sizes (cowork sends "whatever," but a healthcare-niche lead-gen partner batch is very unlikely to exceed a few hundred rows), the simplicity of a single-row-per-iteration transaction outweighs the marginal insert-speed difference. Revisit only if real-world batches are observed to exceed ~1000 rows. |

**Installation:**
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

**Version verification:** `npm view papaparse version` → `5.5.4`, published under `mholt/PapaParse` on GitHub, confirmed 2026-07-22. `@types/papaparse` should be verified separately at install time (`npm view @types/papaparse version`) since it's a DefinitelyTyped package versioned independently of the runtime library.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| papaparse | npm | ~11.7 yrs (first published 2014-11-19) | very high (millions/week class; de facto standard, not independently re-verified this session) | github.com/mholt/PapaParse | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

`slopcheck install papaparse` was run live this session (`python -m slopcheck install papaparse`) and returned `[OK] papaparse (npm)` before a downstream `npm install` subprocess step failed for an unrelated environment reason (Windows subprocess spawn error on this host, unrelated to package legitimacy) — the legitimacy scan itself completed successfully and package.json was NOT modified by the failed install attempt (confirmed via `git status`). No postinstall script present (`npm view papaparse scripts.postinstall` returned empty).

`@types/papaparse` was not separately slopchecked this session — it is a well-known DefinitelyTyped package; the planner should either run `slopcheck install @types/papaparse` at execution time or treat it as `[ASSUMED]` pending that check (low risk: dev-only, types-only, no runtime code).

## Architecture Patterns

### System Architecture Diagram

```
[Admin selects CSV file]
        │
        ▼
[Browser: read File as ArrayBuffer]
        │
        ▼
[Browser: encoding sniff — BOM check, then TextDecoder('utf-8',{fatal:true}) trial]
        │                                   │
        │ valid UTF-8 (or BOM present)      │ throws → not valid UTF-8
        ▼                                   ▼
  [decode as UTF-8]                [decode as windows-1252]
        │                                   │
        └───────────────┬───────────────────┘
                         ▼
        [Papa.parse(text, { header:true, delimiter:"", skipEmptyLines:true })]
                         │
                         ▼
        [Column mapping UI — admin maps CSV headers → nome/telefone/canal/origem/valor/notas/subnicho]
                         │
                         ▼
        [Client-side: normalizePhone() each row; within-batch duplicate detection (D-07 half 1)]
                         │
                         ▼
        [Server Action: fetchPreviewSupportData(phones[], subnichoNames[])
           → returns existing-lead-phone matches (D-07 half 2) + which sub-nicho names are unknown (D-09/D-10)]
                         │
                         ▼
        [Preview screen: table with flags — duplicate (DB/batch), new-sub-nicho, blocked-empty-subnicho (D-12)]
                         │  admin: per-row Skip/Import anyway (D-05), fixes blocked rows
                         ▼
        [Server Action: bulkImportLeads(rows[], batchId)
           → db.transaction(): auto-create unknown sub-nichos (reuse createSubnicho logic, D-09)
                              → insert each confirmed row into leads with importBatchId=batchId
           → revalidatePath("/", "/leads", "/pipeline")]
                         │
                         ▼
        [Post-import screen: list of newly-imported leads (WHERE importBatchId = batchId)
           each row: WhatsAppSendButton → shared WhatsAppPreviewDialog (defaultTipo="primeiro_contato")]
                         │  admin clicks through leads one at a time (D-14)
                         ▼
                  [wa.me link opens per click — no auto-trigger, no bulk send]
```

### Recommended Project Structure

```
src/
├── app/
│   └── importar/                    # new route (Claude's Discretion on exact path)
│       └── page.tsx                 # orchestrates upload → mapping → preview → post-import states
├── actions/
│   └── import-actions.ts            # new: fetchPreviewSupportData(), bulkImportLeads()
├── lib/
│   ├── csv-encoding.ts              # new: sniffEncoding(buffer) → 'utf-8' | 'windows-1252', decode helper
│   └── csv-import.ts                # new: row-mapping types, client-side within-batch dup detection
├── components/
│   ├── csv-upload-dropzone.tsx      # new: file picker/drag-and-drop
│   ├── csv-column-mapper.tsx        # new: map CSV headers → lead fields
│   ├── csv-import-preview-table.tsx # new: preview table with flags, uses @tanstack/react-table like lead-table.tsx
│   └── post-import-lead-list.tsx    # new: reuses WhatsAppSendButton + WhatsAppPreviewDialog exactly like followup-dashboard.tsx
└── db/
    └── schema.ts                    # additive: leads.importBatchId column
```

### Pattern 1: Encoding sniff before PapaParse (D-03, IMPORT-03)

**What:** PapaParse's own documented config has no encoding auto-detection — `encoding: ""` in its config docs is described as "The encoding to use when opening local files. If specified, it must be a value supported by the FileReader API," meaning the caller must already know the encoding. [CITED: papaparse.com/docs — config option `encoding`]

**When to use:** Always, before calling `Papa.parse()` on the raw uploaded file, since D-03 requires auto-detection rather than a fixed assumption.

**Example:**
```typescript
// src/lib/csv-encoding.ts
// Source: MDN TextDecoder docs (CITED: developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
// combined with the documented PapaParse encoding-config gap above.
export async function decodeCsvFile(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  // 1. BOM check — 100%-confidence signal when present (EF BB BF = UTF-8 BOM).
  const hasUtf8Bom = buffer.length >= 3 &&
    buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
  if (hasUtf8Bom) {
    // TextDecoder('utf-8') strips the BOM automatically.
    return new TextDecoder("utf-8").decode(buffer);
  }

  // 2. Strict UTF-8 validity probe: {fatal: true} throws on any byte sequence
  //    that isn't valid UTF-8 (e.g. a lone 0xE9 for "é" in Windows-1252/Latin-1).
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // 3. Fallback: Excel pt-BR's common export encoding.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
```

**Note on PapaParse's known UTF-8-BOM quirk:** a documented PapaParse issue (mholt/PapaParse#840) shows that when a UTF-8-BOM file is parsed *without* first stripping the BOM, the first header column name can come back incorrectly quoted/prefixed. Decoding via `TextDecoder("utf-8")` (not `"utf-8", {fatal:true}` in this branch) already strips the BOM before the string reaches `Papa.parse`, which avoids this entirely — do not skip step 1 above even though step 2's fatal decode would also technically succeed on BOM'd UTF-8.

### Pattern 2: PapaParse delimiter auto-detect + preview parse (D-02, IMPORT-01)

**What:** Leave `delimiter` unset (empty string default) to trigger PapaParse's built-in auto-detection across the most common delimiters. [CITED: papaparse.com/docs — `delimiter: "" // auto-detect"`, `"Leave blank to auto-detect from a list of most common delimiters, or any values passed in through delimitersToGuess."`]

**Example:**
```typescript
// Source: papaparse.com/docs (config reference)
import Papa from "papaparse";

const decoded = await decodeCsvFile(file); // Pattern 1
const result = Papa.parse<Record<string, string>>(decoded, {
  header: true,          // first row → object keys, needed for column-mapping UI
  skipEmptyLines: true,  // tolerant of trailing blank rows common in Sheets/Excel exports
  delimiter: "",         // "" = auto-detect (comma vs semicolon, D-02)
  transformHeader: (h) => h.trim(),
});
// result.data: Record<string,string>[]
// result.meta.delimiter: the delimiter PapaParse actually detected — surface this
// in the UI (e.g. "Detectado: ponto-e-vírgula") so the admin can sanity-check it.
```

Since the file is already fully decoded to a string client-side and batch sizes are expected to be modest (a cowork lead-gen partner export, not a 100k-row dump), parsing the full string synchronously (no `worker: true`, no `preview` truncation) is appropriate — the admin needs to see and map/flag *every* row before confirming, not a sample.

### Pattern 3: Reusing the Phase 4 WhatsApp send seam for D-14

**What:** `followup-dashboard.tsx` already implements the exact per-row-button + single-shared-dialog pattern this phase needs.

**When to use:** Post-import lead list screen (D-14).

**Example:**
```typescript
// Source: existing src/components/followup-dashboard.tsx (verified in this repo)
type PreviewState = { open: false } | { open: true; lead: Lead; subnichoNome: string };
const [previewState, setPreviewState] = useState<PreviewState>({ open: false });

// per row:
<WhatsAppSendButton
  nome={lead.nome}
  disabled={normalizePhone(lead.telefone) === null}
  onClick={() => setPreviewState({ open: true, lead, subnichoNome })}
/>

// once, at the bottom of the list:
<WhatsAppPreviewDialog
  open={previewState.open}
  onOpenChange={(open) => { if (!open) setPreviewState({ open: false }); }}
  lead={previewState.open ? previewState.lead : undefined}
  subnichoNome={previewState.open ? previewState.subnichoNome : ""}
  templates={templates}
  defaultTipo="primeiro_contato"  // ← the only meaningful diff from followup-dashboard.tsx's "follow_up"
/>
```
No changes to `WhatsAppPreviewDialog` or `WhatsAppSendButton` are needed — both already accept the props this reuse requires. `useFirstContactTrigger` (the Phase-4-built hook explicitly anticipating this reuse) is functionally equivalent to the inline `useState<PreviewState>` shown above; either satisfies D-14, but 3 of 4 existing call sites (dashboard, pipeline board's non-auto paths) use the inline pattern rather than the hook, so following that majority precedent is slightly more consistent. The hook remains the right choice specifically for the *auto-trigger* case (D-13 forbids that here), which is why D-13 explicitly rules it out for this phase's bulk path.

### Recommended Schema Shape (LEAD-05)

**Recommendation: a single nullable `importBatchId` text column on `leads`, not a dedicated `import_batches` table.**

```typescript
// Additive change to src/db/schema.ts
export const leads = sqliteTable(
  "leads",
  {
    // ...existing columns unchanged...
    importBatchId: text("import_batch_id"), // nullable = manually-created lead (LEAD-05)
    // ...
  },
  (table) => [
    // ...existing indexes...
    index("leads_import_batch_id_idx").on(table.importBatchId), // supports "leads from batch X" queries (post-import screen, D-14)
  ]
);
```

**Rationale:**
- Matches this project's established additive-nullable-column pattern exactly (`motivoPerda`, `stageChangedAt` — both nullable, both added via `drizzle-kit push`, no data migration needed for existing rows since `NULL` is a valid "not applicable" state for manually-created leads).
- LEAD-05's actual requirement ("cada lead importado é rastreado com o lote de origem") only needs a per-lead pointer to *which* batch, not batch-level metadata (row count, original filename, undo capability) — none of which are in this phase's success criteria or CONTEXT.md decisions. A dedicated `import_batches` table would be pure speculative generality for requirements this phase doesn't have (echoes `CLAUDE.md`'s own "don't build a REST API for future-proofing" philosophy, applied here to schema).
- A `text` column (not `integer` FK) using a `crypto.randomUUID()` string generated once per import Server Action call is simpler than auto-incrementing a separate table and gives every batch a collision-free identifier without an extra insert-then-reference round trip inside the transaction.
- If a future phase needs batch-level metadata (e.g., "undo this whole batch," "show original filename"), promoting `importBatchId` into a real FK against a new `import_batches` table is a straightforward additive migration later — this shape doesn't foreclose that option, it just doesn't build it prematurely.
- **Interaction with soft-delete (`deletedAt`):** no special handling needed — imported leads use the exact same `deletedAt`/`isNull(deletedAt)` soft-delete convention as manually-created leads (confirmed in CONTEXT.md's Integration Points: "imported leads are regular leads, no special deletion handling"). The post-import list query should still filter `isNull(deletedAt)` for consistency, even though a freshly-imported lead can't yet be deleted within the same request.

### Anti-Patterns to Avoid

- **Sending the raw File object to a Server Action:** Server Actions can technically accept `FormData` containing a `File`, but there's no reason to ship the whole file to the server here — D-04's column-mapping and D-05/D-07's duplicate flagging are explicitly preview-before-confirm UX, meaning the admin needs to see and edit mapped rows *before* anything touches the server. Parse fully client-side; only send the final, admin-confirmed row array.
- **One giant multi-row `db.insert(leads).values([...allRows])`:** risks the SQLite variable-limit error on larger batches and provides no meaningful speed benefit at this project's realistic batch sizes over a `db.transaction()` loop (see Standard Stack → Alternatives Considered).
- **Auto-creating sub-nichos outside a transaction with the bulk insert:** if sub-nicho auto-creation (D-09) and the lead inserts aren't in the same `db.transaction()`, a failure partway through a large batch could leave orphan sub-nichos with zero leads, or leads referencing a sub-nicho that got rolled back. Wrap both in one transaction.
- **Re-deriving phone normalization or sub-nicho uniqueness logic for the CSV path:** reuse `normalizePhone()` (`src/lib/phone.ts`) and the existing `createSubnicho`-style case-insensitive-trim check (`src/actions/subnicho-actions.ts`) exactly as-is — do not write parallel logic for the bulk path, per D-06/D-09 and this codebase's established "reuse, don't reimplement" convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| CSV delimiter detection | A custom "count commas vs semicolons in first line" heuristic | PapaParse's built-in `delimiter: ""` auto-detect | Already handles edge cases (quoted fields containing the delimiter character, `delimitersToGuess` list) that a naive heuristic would miss |
| CSV field escaping/quoting (embedded commas, quotes, newlines in cell values) | A regex-based CSV splitter | PapaParse's RFC4180-aware parser | This is exactly the class of "deceptively complex" text-parsing problem PapaParse exists to solve; a hand-rolled splitter will break the first time a lead's `notas` field contains a comma inside quotes |
| Phone normalization for duplicate matching | A new phone-parsing function for the CSV path | `normalizePhone()` (`src/lib/phone.ts`) | Already handles DDI-55 prefixing, digit-only normalization, and length validation identically to the manual-entry path (D-06 explicitly requires this) |
| Sub-nicho dedup-on-create | A separate case-insensitive-trim check for CSV-sourced names | The same logic backing `createSubnicho` (`src/actions/subnicho-actions.ts`) | D-09 explicitly requires the same exact-match rule as LEAD-02; two implementations of the same uniqueness rule is a guaranteed future-divergence bug |
| Encoding detection for arbitrary/many encodings | A full statistical charset detector (chardet-style) | The 2-branch BOM+TextDecoder heuristic (Pattern 1) | This phase's own decisions (D-02/D-03) frame the realistic input space as exactly two cases (Google Sheets UTF-8 vs Excel BR Windows-1252) — building or importing a general N-encoding detector is solving a broader problem than what's in scope |

**Key insight:** Every "don't hand-roll" item above already has a concrete, working implementation elsewhere in this same repository (Phase 1 for phone/sub-nicho, PapaParse's own long-established parser for CSV mechanics) — this phase's job is almost entirely wiring existing pieces together with one new library and one new column, not building new parsing/validation primitives.

## Common Pitfalls

### Pitfall 1: Assuming PapaParse auto-detects encoding because it auto-detects delimiter
**What goes wrong:** A developer reads that PapaParse "auto-detects" CSV structure and assumes encoding is included, then ships a UTF-8-only assumption that corrupts every accented character (nome, notas) in an Excel pt-BR export.
**Why it happens:** PapaParse's delimiter auto-detection is genuinely automatic and well-advertised; its encoding config option looks similar in the docs table but behaves completely differently (manual-only).
**How to avoid:** Implement Pattern 1 (BOM check + `TextDecoder(..., {fatal:true})` probe) before any `Papa.parse()` call; never pass a raw un-decoded `File`/`ArrayBuffer` straight into PapaParse's file-mode parsing (which resolves to browser-default encoding, usually UTF-8, if unspecified).
**Warning signs:** Accented names (Renée, José, Andréa) or the classic `Ã©`/`â€™` mojibake artifacts appearing in imported lead names/notes.

### Pitfall 2: UTF-8 BOM causing a mangled first header name
**What goes wrong:** If a UTF-8-with-BOM file's raw bytes reach PapaParse without the BOM stripped, the first column header can be parsed with a stray character/incorrect quoting, breaking the column-mapping UI's header-matching for just the first column. [CITED: github.com/mholt/PapaParse/issues/840]
**Why it happens:** The BOM (`EF BB BF`) is technically part of the raw byte stream, not "real" text; PapaParse (a text/string parser, not a byte-stream parser in header mode) doesn't universally strip it internally.
**How to avoid:** Always decode via `new TextDecoder("utf-8").decode(buffer)` (JS's built-in `TextDecoder` strips the BOM automatically when present) before handing the string to `Papa.parse()`, per Pattern 1's step 1.
**Warning signs:** The very first CSV column's mapped header looks subtly wrong (extra character, or fails to auto-match despite looking identical to the eye) while all other columns map fine.

### Pitfall 3: SQLite "too many SQL variables" on larger batches
**What goes wrong:** A single `db.insert(leads).values(allConfirmedRows)` call throws `SQLITE_ERROR: too many SQL variables` once a batch × column-count crosses SQLite's per-statement parameter limit (999 in many builds; some newer SQLite builds raise this to 32766, but the exact limit depends on the SQLite version bundled by `better-sqlite3`, which should not be assumed without checking). [CITED: sqlite.org variable-limit documentation, cross-referenced via multiple GitHub issue threads]
**Why it happens:** Drizzle currently does not auto-chunk multi-row inserts against this SQLite-specific limit; a batch of even ~80 rows × 13 columns already approaches 999 in the conservative case.
**How to avoid:** Use `db.transaction()` wrapping a loop of single-row inserts (this project's realistic batch sizes make this simplicity trade-off cheap; see Standard Stack → Alternatives Considered), or chunk explicit batches well under the limit if a future need for larger-scale imports arises.
**Warning signs:** Import works fine in testing with 5-10 synthetic rows but fails on a real cowork batch of 100+.

### Pitfall 4: Server Action 1MB body limit on large batches
**What goes wrong:** Submitting a very large parsed-row array (e.g., 1000+ rows with all fields, especially long `notas` text) as a Server Action argument can exceed Next.js's default 1MB request body cap, causing a hard failure with no partial-progress feedback. [CITED: nextjs.org/docs — serverActions.bodySizeLimit, verified against Next.js 16.2.11 docs]
**Why it happens:** The 1MB default is a DDoS/resource-consumption safeguard that applies uniformly to all Server Action invocations, including plain-argument (non-FormData) calls.
**How to avoid:** For this project's realistic batch sizes (a cowork healthcare lead-gen partner export), 1MB is very unlikely to be hit, but if real-world batches turn out larger, raise `experimental.serverActions.bodySizeLimit` in `next.config.ts` (e.g., `'3mb'`) rather than silently failing. Recommend surfacing a clear "batch too large" admin-facing error rather than a raw 413/parse crash either way.
**Warning signs:** Import silently fails or throws an opaque network error specifically on the admin's largest real batches, not on test data.

### Pitfall 5: Within-batch duplicate detection accidentally comparing raw strings instead of normalized phones
**What goes wrong:** Two rows in the same CSV with the same phone number formatted differently (`(11) 91234-5678` vs `11912345678`) aren't flagged as duplicates because the within-batch check compares raw CSV cell text instead of `normalizePhone()` output.
**Why it happens:** It's tempting to do a quick `Set` dedup on the raw column value during initial client-side row processing, before normalization is applied — especially since within-batch dedup (D-07 half 1) doesn't require a DB round-trip and might get implemented as a separate, earlier step than the against-DB half.
**How to avoid:** Normalize every row's phone via `normalizePhone()` as the very first step of row processing (before any duplicate-detection logic runs), then key both the within-batch `Set`/`Map` and the against-DB lookup off the normalized value — exactly per D-06's explicit instruction.
**Warning signs:** A real cowork export known to contain a re-exported duplicate lead (mentioned in D-07's own rationale — "cowork spreadsheets sometimes re-export the same lead twice") isn't flagged in testing.

### Pitfall 6: Auto-created sub-nichos not visible/highlighted before the DB write commits
**What goes wrong:** If sub-nicho auto-creation (D-09) happens inside the same transaction as the final bulk-insert confirm, but the "N sub-nichos novos serão criados" list (D-10) is computed from a separate, earlier client-side pass, a race (or a stale snapshot) could mean the admin confirms based on a sub-nicho list that doesn't exactly match what actually gets created.
**Why it happens:** Two different code paths — one for preview computation (before confirm), one for the actual insert (after confirm) — deriving "which sub-nicho names are unknown" independently risks drift if either the DB state changes between preview and confirm (e.g., admin has the tab open a while) or the two implementations diverge.
**How to avoid:** The preview-support Server Action (`fetchPreviewSupportData`) and the final bulk-insert Server Action should use the identical case-insensitive-trim lookup query against `subnichos`, ideally sharing one helper function, so "what will be created" (preview) and "what actually got created" (confirm) can never disagree except for the narrow race of another change happening in between — which is an acceptable, rare edge case for a solo-admin tool.
**Warning signs:** Preview says "2 novos sub-nichos" but the confirmed import creates a different count.

## Code Examples

### Server Action: bulk-insert with batch tracking (pattern, not final code)

```typescript
// Source: pattern derived from existing src/actions/lead-actions.ts (createLead)
// and src/actions/subnicho-actions.ts (createSubnicho), combined per this phase's D-08/D-09.
"use server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { revalidatePath } from "next/cache";

type ConfirmedRow = {
  nome: string;
  telefone: string;       // already normalized client-side, but re-validate server-side
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: number;  // centavos
  notas: string;
  followUpDate: Date;
  subnichoNome: string;   // resolved to subnichoId inside the transaction
};

export async function bulkImportLeads(rows: ConfirmedRow[]) {
  const batchId = randomUUID();

  const inserted = db.transaction((tx) => {
    // Resolve/create sub-nichos first (D-09), same case-insensitive-trim rule as createSubnicho.
    const subnichoIdByNome = new Map<string, number>();
    for (const nome of new Set(rows.map((r) => r.subnichoNome.trim().toLowerCase()))) {
      const existing = tx
        .select()
        .from(subnichos)
        .where(sql`lower(trim(${subnichos.nome})) = ${nome}`)
        .all()[0];
      if (existing) {
        subnichoIdByNome.set(nome, existing.id);
      } else {
        const [created] = tx.insert(subnichos).values({ nome }).returning();
        subnichoIdByNome.set(nome, created.id);
      }
    }

    // Single-row-per-iteration insert loop (Pitfall 3) — never one giant .values([...]).
    const results = [];
    for (const row of rows) {
      const [row_] = tx
        .insert(leads)
        .values({
          ...row,
          subnichoId: subnichoIdByNome.get(row.subnichoNome.trim().toLowerCase())!,
          importBatchId: batchId,
          stageChangedAt: new Date(),
        })
        .returning();
      results.push(row_);
    }
    return results;
  });

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { success: true, batchId, leads: inserted };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| react-beautiful-dnd for drag-drop (irrelevant here but noted in CLAUDE.md) | @dnd-kit | Already reflected in this project's stack | Not directly relevant to Phase 2 (no drag-drop in CSV import), noted only because CLAUDE.md already documents this transition |
| Server Actions `experimental.serverActions.bodySizeLimit` still under `experimental` namespace | Confirmed still `experimental` as of Next.js 16.2.11 docs (2026-07-22 check) | N/A — not deprecated, just still experimental-flagged despite Server Actions themselves being stable since v14 | Config key name (`experimental.serverActions.bodySizeLimit`) should not be assumed to have moved to a stable top-level key; verify against the live docs again at execution time in case it changes between research and implementation |

**Deprecated/outdated:** None specific to this phase's stack found during this research pass.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Real cowork CSV exports will only ever be one of two encodings: UTF-8 (Google Sheets) or Windows-1252 (Excel pt-BR) | Pattern 1, Don't Hand-Roll | If the cowork's actual export tool uses a third encoding (e.g., ISO-8859-1 with different byte-range specifics, or UTF-16), the 2-branch heuristic could silently produce mojibake instead of correctly-decoded text. Flagged in D-01 as needing revalidation against a real sample; the encoding-sniff approach here is deliberately narrow-scoped to the two documented realistic cases. |
| A2 | Realistic batch sizes stay well under ~1000 rows, making a single-row-insert-loop transaction and the default 1MB Server Action body limit both safe without extra chunking/config changes | Standard Stack (Alternatives), Pitfalls 3 & 4 | If the cowork ever sends dramatically larger batches (e.g., thousands of leads in one file), both the SQLite variable-limit assumption and the Server Action body-size default could actually bind and need explicit handling (chunked inserts, raised `bodySizeLimit`) that this research doesn't detail beyond flagging the mitigation path. |
| A3 | `better-sqlite3`'s bundled SQLite build uses the conservative 999-variable limit, not the newer 32766 figure | Pitfall 3 | If the bundled SQLite is actually a newer build with the higher limit, the "row-by-row loop" recommendation is still safe (just more conservative than strictly necessary) — this assumption only affects whether a future chunked-insert optimization has more headroom than assumed, not correctness. |
| A4 | `@types/papaparse` is a legitimate, current DefinitelyTyped package | Package Legitimacy Audit | Not independently slopchecked this session; low risk since it's dev-only/types-only with no runtime execution, but the planner should verify before install per the Package Legitimacy Gate protocol. |

## Open Questions

1. **Exact real-world CSV column set from the cowork partner**
   - What we know: D-04 establishes only `nome`+`telefone` as guaranteed; everything else is admin-mappable per D-04's "cowork sends whatever I ask for."
   - What's unclear: Whether the cowork's actual export includes a sub-nicho-like column at all, or whether the admin will always end up manually assigning sub-nicho per-row for every real import (making D-12's "blocks the row" behavior the common case rather than the exception).
   - Recommendation: Build the mapping/preview UI to handle "no sub-nicho column present at all" as gracefully as "column present but some cells blank" — both funnel into the same D-12 blocking behavior per-row.

2. **Whether the post-import screen should be a dedicated route or persist across a page navigation**
   - What we know: D-14 requires the list to exist and have working per-row send buttons; CONTEXT.md leaves the route structure to Claude's Discretion.
   - What's unclear: Whether the admin might navigate away and need to return to "leads from batch X" later (favoring a real route with `importBatchId` in the URL/query, backed by the new index) vs. a purely in-memory post-confirm view that's lost on refresh.
   - Recommendation: Given the new `leads_import_batch_id_idx` index already recommended for LEAD-05, a dedicated route like `/importar/[batchId]` (or a query-param filtered view of `/leads`) costs little extra and survives a refresh — recommended over a purely client-state-only post-import view.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | Server Actions runtime, `crypto.randomUUID()` | ✓ | v24.12.0 | — |
| npm | Package install | ✓ | 11.6.2 | — |
| better-sqlite3 (already installed) | DB layer | ✓ | 12.11.1 (per package.json) | — |
| papaparse | CSV parsing | ✗ (not yet installed) | target 5.5.4 | None needed — `npm install papaparse` is a standard, low-risk addition; no viable in-repo alternative exists (would otherwise require hand-rolling CSV parsing, explicitly against Don't-Hand-Roll guidance) |
| Python + pip (for slopcheck, research-time only) | Package legitimacy audit | ✓ (via `python -m pip`, not bare `pip`) | slopcheck 0.6.1 | Not a runtime dependency of the app; irrelevant to execution |

**Missing dependencies with no fallback:** none blocking.
**Missing dependencies with fallback:** none — `papaparse` itself has no fallback but is a standard, pre-approved, one-command install with no environment obstacle observed.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | Solo-admin, no-auth tool per explicit project scope; out of scope by design |
| V3 Session Management | No | Same as above |
| V4 Access Control | No | Single actor, no roles/permissions to enforce |
| V5 Input Validation | Yes | Zod validation of every mapped CSV row server-side before insert (reuse/extend `leadSchema`), even though the client already validates during preview — never trust client-side validation alone for a Server Action's actual insert path, same convention `createLead`/`updateLead` already follow |
| V6 Cryptography | No (n/a) | No secrets, tokens, or crypto beyond `crypto.randomUUID()` for a non-security-sensitive batch identifier (not a session token, not a permission gate) |
| V12 File and Resources | Yes | CSV file content should be size-bounded client-side before parsing (e.g., reject/warn on absurdly large files before attempting to decode+parse in the browser) to avoid a pathological huge-file freezing the admin's own browser tab; this is a UX/robustness control more than a strict security boundary given the solo-admin, no-external-upload-surface context |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Malformed/adversarial CSV content (e.g., CSV injection payloads like `=cmd|'/c calc'!A1` in a `nome`/`notas` cell) | Tampering | Not directly exploitable server-side here (values are stored as plain SQLite text and rendered as React text, not re-exported to a spreadsheet or `eval`'d) — the classic "CSV injection" risk model applies to *exporting* data that's later opened in Excel/Sheets, which is out of scope for this import-only phase. Still worth a defensive note: if a future phase adds CSV *export*, formula-injection-prefix stripping (leading `=`,`+`,`-`,`@`) would need to be added then, not now. |
| Oversized/malicious file causing browser-tab hang during client-side parse | Denial of Service (client-side, self-inflicted) | Soft file-size guard before parsing (e.g., warn above ~5-10MB, since a solo-admin's realistic lead batch is tiny text data, not remotely close to that size) |
| Server Action argument tampering (a crafted request bypassing the client-side preview/validation entirely) | Tampering | Server-side Zod re-validation of every row inside `bulkImportLeads` (V5 above) — the client-side preview is a UX convenience, not the security boundary; this matches the existing `createLead`/`updateLead` pattern of never trusting `FormData`/argument shape without a `safeParse` |

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs — serverActions config reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) — fetched live, confirmed Next.js 16.2.11 docs, `bodySizeLimit` default 1MB, still under `experimental.serverActions`
- [papaparse.com/docs](https://www.papaparse.com/docs) — fetched live, confirmed `encoding` is manual-only (no auto-detect), `delimiter: ""` auto-detects, `preview`/`header`/`worker`/`dynamicTyping` config semantics
- `npm view papaparse version` / `time.created` / `repository` / `scripts.postinstall` — run live this session, confirmed 5.5.4, published 2014-11-19, `github.com/mholt/PapaParse`, no postinstall script
- `python -m slopcheck install papaparse` — run live this session, returned `[OK]`
- Direct codebase reads: `src/db/schema.ts`, `src/lib/phone.ts`, `src/actions/lead-actions.ts`, `src/actions/subnicho-actions.ts`, `src/components/followup-dashboard.tsx`, `src/components/whatsapp-preview-dialog.tsx`, `src/components/whatsapp-send-button.tsx`, `src/hooks/use-first-contact-trigger.ts`, `src/lib/validations.ts`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/phases/02-csv-bulk-import/02-CONTEXT.md` — all read directly this session

### Secondary (MEDIUM confidence)
- [github.com/mholt/PapaParse/issues/840](https://github.com/mholt/PapaParse/issues/840) — UTF-8-BOM header-quoting quirk, single GitHub issue but directly on the official repo, cross-checked against general BOM-handling knowledge
- WebSearch on SQLite variable limits, cross-referenced across multiple GitHub issue threads (drizzle-team, simonw/sqlite-utils, simolus3/drift) converging on the 999-vs-32766 distinction — no single canonical sqlite.org page was directly fetched this session, so treated as MEDIUM not HIGH
- WebSearch on Next.js Server Actions 1MB default limit, corroborated by both the official docs fetch above and multiple community threads (Vercel GitHub discussions #57973, #60270, #53989)

### Tertiary (LOW confidence)
- General browser-encoding-detection blog posts (dev.to, various encoding-tool sites) — used only to corroborate the BOM-first/UTF-8-validation-second heuristic ordering, not as the basis for any specific claim; the actual recommended implementation (Pattern 1) is derived from `TextDecoder`'s documented `fatal` option behavior (MDN), not from these blog posts
- `better-sqlite3`'s exact bundled SQLite version and its exact variable-limit build flag were not independently verified this session (see Assumption A3) — flagged as LOW confidence, doesn't change the recommended mitigation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — papaparse version/registry facts directly verified; already pre-approved in CLAUDE.md
- Architecture (Server Action split, schema shape, WhatsApp reuse pattern): HIGH — directly grounded in this repo's existing, working code (followup-dashboard.tsx, lead-actions.ts, schema.ts), not speculative
- Encoding/delimiter mechanics: MEDIUM-HIGH — PapaParse docs fetched live and confirmed; the specific 2-encoding heuristic is a reasoned design choice (not itself independently benchmarked against a real Brazilian export) pending D-01's real-sample validation
- Pitfalls (SQLite variable limit, Server Action body limit): MEDIUM — corroborated across official docs + multiple community sources, but exact bundled-SQLite-version specifics (A3) not independently pinned down
- Security domain: MEDIUM — ASVS categories reasoned from project's own no-auth/solo-admin scope (already established fact from CLAUDE.md), not a fresh threat-model exercise

**Research date:** 2026-07-22
**Valid until:** 30 days for the Next.js/PapaParse version-specific facts (fast-moving ecosystem, though Server Actions body-limit config has been stable since v14); indefinite for the codebase-grounded architecture findings (followup-dashboard.tsx pattern, schema conventions) until those files themselves change. **Hard revalidation trigger regardless of date:** as soon as a real cowork CSV sample becomes available (D-01), the encoding/delimiter assumptions in this document must be re-checked against it before the planner's recommendations here are treated as final.
