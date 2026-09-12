---
phase: 24-veredito-e-mapa-de-nichos
reviewed: 2026-09-12T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - scripts/migrate-veredito.cjs
  - scripts/test-relatorios-queries.cjs
  - scripts/test-veredito-actions.cjs
  - scripts/verify-schema.cjs
  - src/actions/campanha-actions.ts
  - src/app/campanhas/[id]/_components/veredito-form.tsx
  - src/app/campanhas/[id]/page.tsx
  - src/app/mapa-de-nichos/page.tsx
  - src/app/relatorios/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/mapa-de-nichos-table.tsx
  - src/components/resultado-campanha-painel.tsx
  - src/components/veredito-secao.tsx
  - src/db/queries.ts
  - src/db/schema.ts
  - src/lib/utils.ts
  - src/lib/validations.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-09-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed the Veredito + Mapa de Nichos feature set (migration script, two new
Server Actions/queries, three new UI surfaces, and the supporting schema/test
changes). The migration script (`migrate-veredito.cjs`) is careful and
idempotent, the new query functions (`getResultadoPorCampanha`,
`getVereditoIAPorCampanha`) are well-documented and match their test coverage,
and the Zod/schema changes are additive and nullable as intended.

The most important finding is a cache-invalidation gap: `createCampanha`,
`updateCampanha`, and `softDeleteCampanha` (in `src/actions/campanha-actions.ts`)
never revalidate the new `/mapa-de-nichos` route that this same phase
introduces, while `registrarVeredito` does. Because `/mapa-de-nichos` has no
dynamic APIs (no `searchParams`, no `cookies()`/`headers()`), Next.js is free
to treat it as a statically cached route segment, so a freshly created,
edited, or soft-deleted campanha will not appear/disappear from the Mapa de
Nichos list in a production build until some *other* action happens to
revalidate that path (today, only `registrarVeredito` does). This directly
undermines PAINEL-02/03, the deliverable this phase ships.

Two secondary Warnings (a non-deterministic tie-break in "most recent
diagnóstico" selection, and a silent no-op risk in `registrarVeredito`'s
update) and two Info-level notes (accessibility wiring, an implicit "no
period" sentinel) round out the findings.

## Critical Issues

### CR-01: `/mapa-de-nichos` is never revalidated on campanha create/update/delete

**File:** `src/actions/campanha-actions.ts:50-53, 81, 112, 128`
**Issue:** `revalidateCampanhaRoutes()` (used by `createCampanha`,
`updateCampanha`, and `softDeleteCampanha`) only calls
`revalidatePath("/campanhas")` and, conditionally,
`revalidatePath(\`/campanhas/${id}\`)`. It never revalidates
`/mapa-de-nichos`. That route (`src/app/mapa-de-nichos/page.tsx`), added in
this same phase, reads the full `campanhas` table directly via `db.select()`
with no `searchParams`/dynamic-function usage, so Next.js can statically
render and cache it. The ONLY code path in the whole diff that busts that
cache is `registrarVeredito` (`campanha-actions.ts:194`,
`revalidatePath("/mapa-de-nichos")`).

Concretely: create a new campanha, or edit one's `oferta`/`nichoId`, or
soft-delete one from `/campanhas` — none of these paths touch
`/mapa-de-nichos`'s cache. In a production build (`next build && next start`,
or the Vercel variant this project's own CLAUDE.md recommends as the default
deployment), the Mapa de Nichos table can show a stale list (missing new
campanhas, showing deleted ones, or displaying an old `oferta`/`nichoId`)
until some unrelated campanha happens to get a veredito registered.

**Fix:**
```ts
function revalidateCampanhaRoutes(id?: number) {
  revalidatePath("/campanhas");
  if (id) revalidatePath(`/campanhas/${id}`);
  revalidatePath("/mapa-de-nichos");
}
```
This also lets `registrarVeredito` drop its now-redundant explicit
`revalidatePath("/mapa-de-nichos")` call, keeping a single source of truth for
"which routes does a campanha mutation affect."

## Warnings

### WR-01: `getVereditoIAPorCampanha` has no tie-breaker for same-timestamp diagnósticos

**File:** `src/db/queries.ts:678-709` (query at line 694: `.orderBy(desc(diagnosticos.criadoEm))`)
**Issue:** "Most recent OK generation" is determined purely by
`ORDER BY criado_em DESC`. `criadoEm` has second-level resolution
(`unixepoch()`). If two `diagnosticos` rows for the same campanha are inserted
within the same second (e.g., the user clicks "Gerar diagnóstico" for two
different campanhas around the same time, or a script/backfill inserts rows
in a tight loop — as the test harness itself does with `ago(1)`/`ago(0)`
which are still one full second apart, so the tests don't currently exercise
the exact-tie case), SQLite's tie-break order for equal `ORDER BY` keys is
unspecified. The "most recent" veredito shown to the operator could then flip
between the two candidates depending on physical row order, contradicting the
D-24-08 guarantee ("a geração OK mais recente, nunca uma penúltima válida
escondida").
**Fix:** Add a deterministic secondary sort key, e.g.:
```ts
.orderBy(desc(diagnosticos.criadoEm), desc(diagnosticos.id));
```
`id` is monotonically increasing (autoincrement), so it correctly
disambiguates same-second inserts by insertion order.

### WR-02: `registrarVeredito` reports success even when the UPDATE affects zero rows

**File:** `src/actions/campanha-actions.ts:168-196`
**Issue:** `campanhaAtivaExists(campanhaId)` (lines 139-145) checks
`isNull(deletedAt)` before the write, but the subsequent
`db.update(campanhas).set(...).where(and(eq(id), isNull(deletedAt)))` (lines
183-191) re-checks `deletedAt` independently. If the campanha is soft-deleted
in the window between the check and the write (however small a window, in a
single-user tool), the `UPDATE` silently matches zero rows — Drizzle/
better-sqlite3 does not throw for a no-op update — and the function still
returns `{ success: true }` unconditionally (line 195). The operator would
see a "Veredito registrado." toast even though nothing was persisted.
**Fix:** Check the write result before declaring success, e.g. capture
`const result = await db.update(...).where(...);` and verify
`result.changes > 0` (better-sqlite3's `RunResult.changes`) before returning
`{ success: true }`; otherwise return the same
`{ errors: { campanhaId: ["Campanha inválida."] } }` used for the pre-check
failure.

## Info

### IN-01: New sections' headings aren't wired to their landmark via `aria-labelledby`

**File:** `src/components/resultado-campanha-painel.tsx:46-48`,
`src/components/veredito-secao.tsx:39-40`
**Issue:** Both new `<section>` elements have a heading with an `id`
(`resultado-campanha-titulo`, `veredito-secao-titulo`) that is never
referenced — the `<section>` itself has no `aria-labelledby`, so screen
readers announce these as unlabeled regions instead of "Resultado real" /
"Veredito".
**Fix:**
```tsx
<section aria-labelledby="resultado-campanha-titulo" className="...">
```
(and the equivalent for `veredito-secao-titulo`).

### IN-02: `resolvePeriodRange(undefined)` used as an implicit "no period filter" sentinel

**File:** `src/components/resultado-campanha-painel.tsx:34`
**Issue:** `getContagemPorMotivoPerda(resolvePeriodRange(undefined), campanhaId)`
relies on the reader knowing that `resolvePeriodRange(undefined)` falls
through to the `"tudo"` branch (`start: new Date(0)`) inside
`resolvePeriodRange` — a behavior documented for the `/relatorios` querystring
use case, not for "I want no period filter at all." It works today, but it's
an indirect way to express "no filter" and is one accidental edit to
`resolvePeriodRange`'s fallback branch away from silently breaking D-24-07
("sem recorte de período" for the campaign panel).
**Fix:** Consider a named constant/helper, e.g. `const SEM_RECORTE: PeriodRange
= { start: new Date(0), end: new Date() };` or a small
`resolvePeriodoTudo()` export, so the intent at the call site doesn't depend
on an implicit fallback path of an unrelated function.

---

_Reviewed: 2026-09-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
