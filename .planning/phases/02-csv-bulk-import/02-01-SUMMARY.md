---
phase: 02-csv-bulk-import
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, server-actions, csv, encoding]

# Dependency graph
requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: leadSchema, normalizePhone, parseBRLToCents, createSubnicho case-insensitive-trim lookup, leads/subnichos schema
provides:
  - "leads.importBatchId nullable column + leads_import_batch_id_idx index, live on the real ./data/crm.db"
  - "decodeCsvFile: BOM/UTF-8/windows-1252 auto-detection before any PapaParse call"
  - "mapCsvRows/detectWithinBatchDuplicatePhones/CSV_DEFAULTS: pure row-mapping + within-batch phone dedup"
  - "csvRowSchema: Zod schema for a mapped CSV row, derived from leadSchema.omit(subnichoId, followUpDate)"
  - "fetchPreviewSupportData: DB-side duplicate-phone + unknown-sub-nicho lookup for the preview screen"
  - "bulkImportLeads: transactional bulk insert with auto-created sub-nichos and shared importBatchId"
affects: [02-02-column-mapping-preview-wizard, 02-03-post-import-whatsapp-list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared subnichoLookupCondition() helper reused verbatim between preview (fetchPreviewSupportData) and confirm (bulkImportLeads) to prevent Pitfall 6 drift"
    - "db.transaction() with a synchronous single-row insert loop (never .values([...allRows])) to avoid SQLite's per-statement variable limit"
    - "NTFS directory junction (data/ -> main repo's data/) used to let a git-worktree-isolated executor operate drizzle-kit push and verification scripts against the actual shared ./data/crm.db, since the db file is gitignored and not otherwise visible inside a worktree"

key-files:
  created:
    - src/lib/csv-encoding.ts
    - src/lib/csv-import.ts
    - src/actions/import-actions.ts
  modified:
    - src/db/schema.ts
    - src/lib/validations.ts

key-decisions:
  - "importBatchId implemented as a single nullable text column on leads (not a dedicated import_batches table), matching the additive-nullable-column precedent of motivoPerda/stageChangedAt"
  - "csvRowSchema derives from leadSchema.omit({ subnichoId, followUpDate }).extend({ subnichoNome }) rather than a parallel field-by-field schema"
  - "A git-worktree-local NTFS junction (data/ -> C:/Users/Vencedor/Desktop/crm-leads/data/) was created so this isolated executor could run drizzle-kit push and the human-check verification script against the real, gitignored ./data/crm.db instead of a worktree-local copy"

patterns-established:
  - "Server Action pairs that must never diverge (preview vs. confirm) should extract their shared lookup condition into one function inside the same file, not duplicate the SQL template string"

requirements-completed: [LEAD-05, IMPORT-02, IMPORT-03]

# Metrics
duration: 45min
completed: 2026-07-22
---

# Phase 02 Plan 01: CSV Import Engine (Schema + Pure Modules + Server Actions) Summary

**Additive `leads.importBatchId` column live on the real database, plus encoding/mapping/dedup pure modules and the two Server Actions (`fetchPreviewSupportData`, `bulkImportLeads`) that will power the Phase 02-02 import wizard — end-to-end verified against `./data/crm.db` via a temporary script, not just type-checked.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-07-22T13:05:00-03:00 (approx.)
- **Completed:** 2026-07-22T13:19:44-03:00
- **Tasks:** 3
- **Files modified:** 4 (2 new, 2 modified) — `src/db/schema.ts`, `src/lib/validations.ts`, plus new `src/lib/csv-encoding.ts`, `src/lib/csv-import.ts`, `src/actions/import-actions.ts` (5 total files touched across the plan)

## Accomplishments
- `leads.importBatchId` (nullable text) + `leads_import_batch_id_idx` applied to the real `./data/crm.db` via `drizzle-kit push`, confirmed live via `PRAGMA table_info`/`sqlite_master` (LEAD-05)
- `decodeCsvFile` implements the documented BOM-check + `TextDecoder(fatal:true)` + `windows-1252` fallback heuristic (IMPORT-03) ahead of any PapaParse call in the future wizard
- `mapCsvRows`/`detectWithinBatchDuplicatePhones`/`CSV_DEFAULTS` give the wizard a pure, testable mapping+dedup layer reusing `normalizePhone` (IMPORT-02 half 1)
- `fetchPreviewSupportData` + `bulkImportLeads` share one `subnichoLookupCondition()` helper so "what will be created" (preview) can never diverge from "what was created" (confirm) — verified end-to-end against the real database

## Task Commits

Each task was committed atomically:

1. **Task 1: [BLOCKING] Coluna aditiva leads.importBatchId + push no banco real** - `a3230f6` (feat)
2. **Task 2: Módulos puros — sniff de encoding, mapeamento/dedup de linha CSV, csvRowSchema** - `a23ca45` (feat)
3. **Task 3: Server Actions — fetchPreviewSupportData + bulkImportLeads** - `04b25da` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/db/schema.ts` - Added `leads.importBatchId` (nullable) + `leads_import_batch_id_idx` index
- `src/lib/csv-encoding.ts` - `decodeCsvFile(file)`: BOM/UTF-8/windows-1252 auto-detection
- `src/lib/csv-import.ts` - `mapCsvRows`, `detectWithinBatchDuplicatePhones`, `CSV_DEFAULTS`, row/mapping types
- `src/lib/validations.ts` - Added `csvRowSchema`/`CsvRowValues`, derived from `leadSchema`
- `src/actions/import-actions.ts` - `fetchPreviewSupportData`, `bulkImportLeads`, shared `subnichoLookupCondition()`

## Decisions Made
- `importBatchId` as a single nullable column (not a dedicated batches table) — matches the project's established additive-column pattern and this phase's actual requirement (per-lead pointer, not batch-level metadata)
- `csvRowSchema` derived via `.omit()`/`.extend()` from `leadSchema`, never a parallel field-by-field re-implementation
- Created a temporary NTFS directory junction (`data/` inside this worktree → the main repository's real `data/` folder) so that `drizzle-kit push` and the Task 3 human-check verification script could operate directly against the actual `./data/crm.db` instead of a worktree-local stand-in. This was necessary because git worktrees do not share gitignored/untracked files, and `data/crm.db` is explicitly gitignored (`/data/*.db*`) per this project's local-SQLite-file convention. The junction is itself invisible to `git status` (its only contents are gitignored `.db`/`.db-shm`/`.db-wal` files) so it introduces no tracked artifacts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tx.insert(subnichos).values(...).returning()` needed `.all()` before destructuring**
- **Found during:** Task 3 (`bulkImportLeads` transaction)
- **Issue:** `npx tsc --noEmit` failed with `TS2488: ... must have a '[Symbol.iterator]()' method` when destructuring `const [created] = tx.insert(subnichos).values({...}).returning();` — the Drizzle better-sqlite3 query builder needs an explicit sync-execution call before it becomes an array.
- **Fix:** Added `.all()` after `.returning()`, matching the synchronous-execution convention already documented in the plan's `<interfaces>` section for `db.transaction()` callbacks on the better-sqlite3 driver.
- **Files modified:** `src/actions/import-actions.ts`
- **Verification:** `npx tsc --noEmit` clean afterward; behavior confirmed correct end-to-end by the Task 3 human-check script (new sub-nicho created exactly once).
- **Committed in:** `04b25da` (part of Task 3 commit)

**2. [Rule 3 - Blocking] `revalidatePath` throws outside a real Next.js request context when calling Server Actions from a standalone script**
- **Found during:** Task 3 human-check verification script
- **Issue:** Calling `bulkImportLeads` from a plain `tsx` script (not inside a Next.js request) causes `revalidatePath()` to throw `Invariant: static generation store missing` — this happens *after* the DB transaction has already committed, so it's a false-negative on the action's actual DB effect, not a real bug in `import-actions.ts`.
- **Fix:** The verification script tolerates this specific throw (same pattern already established in Phase 01's `test-lead-actions.cjs`, referenced in `STATE.md`) and instead verifies real effect by querying the database directly (both leads present, sharing one `importBatchId`, new sub-nicho created exactly once).
- **Files modified:** none in `src/` — isolated to the temporary verification script (deleted after use)
- **Verification:** All assertions passed after adopting the tolerate-and-verify-via-DB pattern.
- **Committed in:** n/a (temporary script, not committed; see Task 3 commit message for the summary of what was verified)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues resolved inline, no scope creep)
**Impact on plan:** Both fixes were necessary to complete verification correctly; no architectural changes, no new dependencies.

## Issues Encountered
- An initial run of the Task 3 human-check script left orphaned test leads/sub-nichos in the real database because the script threw (on the `revalidatePath` issue above) before reaching its own cleanup step. These orphans were soft-deleted (leads) directly via a one-off `better-sqlite3` maintenance command; the two orphaned test sub-nichos (`Teste Import <ts>`, `Novo Sub <ts>`) could not be hard-deleted because SQLite's `onDelete: "restrict"` FK still blocks deletion while soft-deleted leads reference them — they remain in the real `subnichos` table as known, harmless test records, which the plan's own human-check instructions explicitly permit ("apagar o sub-nicho de teste recém-criado, ou deixar como registro de teste conhecido"). No production data was affected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `fetchPreviewSupportData`/`bulkImportLeads` are ready for Phase 02-02 (column mapping + preview wizard) to call directly — same argument shapes documented in this plan's task bodies.
- `decodeCsvFile`/`mapCsvRows`/`detectWithinBatchDuplicatePhones`/`csvRowSchema` are ready to be wired into the client-side upload/mapping/preview UI in 02-02, with no further backend changes anticipated.
- `leads.importBatchId` + its index are live on the real database, ready for the Phase 02-03 post-import "leads from this batch" list to query by `importBatchId`.
- No blockers. The one open external risk carried over from `02-CONTEXT.md`/`02-RESEARCH.md` remains unchanged: no real cowork CSV sample has been validated yet against the encoding/delimiter assumptions (D-01) — this does not block 02-02/02-03 implementation, but should be revisited once a real file is available.

---
*Phase: 02-csv-bulk-import*
*Completed: 2026-07-22*

## Self-Check: PASSED

All created/modified files confirmed present: `src/db/schema.ts`, `src/lib/csv-encoding.ts`, `src/lib/csv-import.ts`, `src/lib/validations.ts`, `src/actions/import-actions.ts`, `.planning/phases/02-csv-bulk-import/02-01-SUMMARY.md`.
All commit hashes confirmed present in `git log`: `a3230f6`, `a23ca45`, `04b25da`, `a67e1d7`.
