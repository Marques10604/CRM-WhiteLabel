---
phase: 24-veredito-e-mapa-de-nichos
fixed_at: 2026-09-12T12:30:00Z
review_path: .planning/phases/24-veredito-e-mapa-de-nichos/24-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-09-12T12:30:00Z
**Source review:** .planning/phases/24-veredito-e-mapa-de-nichos/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (CR-01 critical, WR-01/WR-02 warnings; IN-01/IN-02 out of scope per `fix_scope: critical_warning`)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: `/mapa-de-nichos` is never revalidated on campanha create/update/delete

**Files modified:** `src/actions/campanha-actions.ts`
**Commit:** `46f4349`
**Applied fix:** Moved `revalidatePath("/mapa-de-nichos")` into the shared `revalidateCampanhaRoutes()` helper so `createCampanha`, `updateCampanha`, and `softDeleteCampanha` all bust the Mapa de Nichos cache, not just `registrarVeredito`. Dropped the now-redundant explicit `revalidatePath("/mapa-de-nichos")` call at the end of `registrarVeredito`, keeping a single source of truth for which routes a campanha mutation affects. Matches the fix suggested in REVIEW.md exactly; code state at the cited lines matched the review's description.

### WR-01: `getVereditoIAPorCampanha` has no tie-breaker for same-timestamp diagnósticos

**Files modified:** `src/db/queries.ts`
**Commit:** `caada0f`
**Applied fix:** Added `desc(diagnosticos.id)` as a secondary sort key after `desc(diagnosticos.criadoEm)` in the query's `.orderBy(...)`. Confirmed `diagnosticos.id` is an autoincrement primary key in `src/db/schema.ts`, so it deterministically disambiguates same-second inserts by insertion order (D-24-08 guarantee).

### WR-02: `registrarVeredito` reports success even when the UPDATE affects zero rows

**Files modified:** `src/actions/campanha-actions.ts`
**Commit:** `e4dcfce`
**Applied fix:** Captured the `RunResult` from the `db.update(campanhas)...` call and added a check for `result.changes === 0` — confirmed via `src/db/client.ts` that the project uses `drizzle-orm/better-sqlite3`, so `RunResult.changes` is the correct property. When the UPDATE matches zero rows (e.g. the campanha was soft-deleted in the race window between the pre-check and the write), the action now returns the same `{ errors: { campanhaId: ["Campanha inválida."] } }` used for the pre-check failure, instead of silently returning `{ success: true }`.

## Skipped Issues

None — all in-scope findings were fixed.

**Out of scope (not attempted, per `fix_scope: critical_warning`):**
- IN-01: New sections' headings aren't wired to their landmark via `aria-labelledby` (`src/components/resultado-campanha-painel.tsx`, `src/components/veredito-secao.tsx`)
- IN-02: `resolvePeriodRange(undefined)` used as an implicit "no period filter" sentinel (`src/components/resultado-campanha-painel.tsx`)

These remain for a future `--all` pass.

## Verification Notes

All three fixes were verified via Tier 1 (re-read modified file section, confirmed fix text present and surrounding code intact). Tier 2 (TypeScript syntax check via `tsc --noEmit`) was attempted but unavailable in the isolated fix worktree — `node_modules` is gitignored and not present in a fresh `git worktree add` checkout, and symlinking it from the main repo failed (`ln: failed to create symbolic link ... File too large`, a Windows filesystem limitation for directory symlinks with this many entries). Per the verification strategy's Tier 3 fallback, Tier 1 was accepted as sufficient for all three fixes; none are logic-shape changes beyond what REVIEW.md explicitly prescribed (an added `revalidatePath` call, an added `ORDER BY` tie-break column, and a zero-rows-affected guard using the driver's own documented `RunResult.changes` field), so none require the "fixed: requires human verification" flag.

---

_Fixed: 2026-09-12T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
