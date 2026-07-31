---
phase: 07-configura-o-de-dias-parado-por-etapa
reviewed: 2026-07-31T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/actions/configuracoes-actions.ts
  - src/app/configuracoes/page.tsx
  - src/app/pipeline/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/configuracoes-form.tsx
  - src/db/queries.ts
  - src/db/schema.ts
  - src/lib/validations.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-07-31T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the CONFIG-01/CONFIG-02 "dias parado por etapa" feature: the `configuracoes` singleton table/schema, the `getConfiguracoes`/`saveConfiguracoes` read/write path, the settings form, and the pipeline page's server-side "esfriando" computation that consumes the configured thresholds.

The core logic is sound: `saveConfiguracoes` correctly uses an `insert().onConflictDoUpdate()` upsert (avoiding the "UPDATE affects 0 rows but returns success" trap called out in its own doc comment), Zod validation is authoritative server-side with client-side `zodResolver` as a UX layer only, and `pipeline/page.tsx` correctly excludes terminal stages (`fechado`/`perdido`) from the "esfriando" map and guards against leads with a null `stageChangedAt`. No hardcoded secrets, injection vectors, or XSS were found.

One real concurrency bug was found in the singleton-seeding logic in `getConfiguracoes()` (this is the one path in the reviewed set that does NOT use `onConflictDoUpdate`/`onConflictDoNothing`, unlike `saveConfiguracoes`, which explicitly documents why it avoids exactly this class of bug). The remaining findings are lower-severity maintainability/defensive-coding notes.

## Warnings

### WR-01: Unhandled race condition when seeding the `configuracoes` singleton row

**File:** `src/db/queries.ts:68-76`

**Issue:** `getConfiguracoes()` does a plain `SELECT ... WHERE id = 1`, and if no row exists, does a plain `db.insert(configuracoes).values({ id: 1 }).returning()` with no `onConflictDoNothing()`/`onConflictDoUpdate()`. If two calls to `getConfiguracoes()` race before the row is ever seeded, both `SELECT`s can return empty and both attempt `INSERT ... id=1`; the second throws an unhandled `UNIQUE constraint failed: configuracoes.id` (verified against `better-sqlite3` directly — a second insert with a duplicate primary key throws synchronously). This is not a purely theoretical race: `getConfiguracoes()` is called both from `/pipeline` and from `/configuracoes` (`src/app/pipeline/page.tsx:29`, `src/app/configuracoes/page.tsx:5`), both of which are linked from `AppSidebar` (`src/components/app-sidebar.tsx`) rendered on every route. Next.js App Router's default `<Link>` prefetching fetches the RSC payload for visible sidebar links shortly after any page mounts, so on the very first app boot (before the singleton row is ever seeded) it's plausible for both routes' `getConfiguracoes()` calls to fire concurrently.

Contrast with `saveConfiguracoes` in the same feature (`src/actions/configuracoes-actions.ts:37-43`), whose doc comment explicitly explains why it uses an upsert instead of a plain write to avoid exactly this class of "first call before any read" ordering bug — the same reasoning was not applied to the read-path seed.

**Fix:**
```ts
export async function getConfiguracoes(): Promise<Configuracoes> {
  const [existing] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(configuracoes)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  // Lost the race: another concurrent call already seeded the row — read it back.
  const [seeded] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  return seeded;
}
```

## Info

### IN-01: "Esfriando" threshold logic is inline in the Server Component, not an extractable/testable pure function

**File:** `src/app/pipeline/page.tsx:32-50`

**Issue:** The `limitesPorEtapa` map + `esfriandoLeadIds` filter (the core CONFIG-02 business rule: "is this lead's time-in-stage over its configured threshold?") is written directly inside the `PipelinePage` async component body, coupled to `Promise.all` DB calls. This is the same category of date-threshold classification as `groupLeadsByUrgency` in `src/db/queries.ts:36-55`, which was deliberately extracted as a pure, injectable-`now` function specifically "sem I/O, testável isoladamente" per its doc comment. The pipeline version has no equivalent extraction, so it cannot be unit tested without rendering the full page and standing up the DB calls.

**Fix:** Extract to a pure function alongside `groupLeadsByUrgency`, e.g. in `src/db/queries.ts`:
```ts
export function computeEsfriandoLeadIds(
  activeLeads: Lead[],
  config: Configuracoes,
  now?: Date
): number[] {
  const limitesPorEtapa: Partial<Record<Lead["stage"], number>> = {
    novo: config.diasParadoNovo,
    contatado: config.diasParadoContatado,
    negociacao: config.diasParadoNegociacao,
  };
  return activeLeads
    .filter((lead) => {
      const limite = limitesPorEtapa[lead.stage];
      return (
        limite != null &&
        lead.stageChangedAt != null &&
        differenceInDays(now ?? new Date(), lead.stageChangedAt) >= limite
      );
    })
    .map((lead) => lead.id);
}
```

### IN-02: No sanity upper-bound on `dias_parado_*`, letting the column silently store a `REAL` instead of an `INTEGER`

**File:** `src/lib/validations.ts:93-97`, `src/db/schema.ts:85-87`

**Issue:** `configuracoesSchema` only enforces `.int().min(1)` with no maximum, per the deliberate D-03 "sem teto máximo" business decision. However, `Number.isInteger()` returns `true` even for values far beyond `Number.MAX_SAFE_INTEGER` (e.g. `Number.isInteger(Number("99999999999999999999")) === true`), so a fat-fingered extra digit passes Zod validation. Verified empirically: inserting such a value into a `better-sqlite3` `INTEGER` column does not throw, but SQLite silently stores it with `typeof(v) = 'real'` instead of an integer, which is a quiet type/precision drift from the declared schema (`integer("dias_parado_novo")`). It does not crash and, given the huge value, happens to still behave as "never flags as esfriando" — but it is a latent inconsistency between the declared column type and what actually gets persisted.

**Fix:** Add a generous but bounded ceiling that only guards against unsafe integers, independent of the "no business max" decision, e.g. `.max(3650, "Valor muito alto.")` or `.max(Number.MAX_SAFE_INTEGER)`.

### IN-03: No generated migration for the new `configuracoes` columns

**File:** `src/db/schema.ts:83-89`

**Issue:** `src/db/migrations/` only contains three migrations (`0000_gifted_slapstick`, `0001_grey_xavin`, `0002_backfill-fechado-perdido-split`), none of which create the `configuracoes` table or its `dias_parado_*` columns. This mirrors an existing gap in the repo (the `templates` table and several `leads` columns — `contact_attempts`, `import_batch_id` — are also absent from any committed migration), so this is consistent with how prior phases shipped schema changes via `drizzle-kit push` rather than a committed migration. Flagging for visibility: if this project is ever deployed against a hosted DB (Turso, per `CLAUDE.md`'s documented variant) using `drizzle-kit migrate` instead of `push`, the `configuracoes` table will not exist in that environment and every read/write in this phase will fail at runtime.

**Fix:** If the deployment story ever moves off "run `drizzle-kit push` against the target DB by hand," generate a migration for this table (`npx drizzle-kit generate`) before shipping.

---

_Reviewed: 2026-07-31T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
