---
phase: 22-campanha-de-explora-o-de-nicho
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/actions/campanha-actions.ts
  - src/db/schema.ts
  - src/types/index.ts
  - src/lib/validations.ts
  - scripts/migrate-campanhas.cjs
  - scripts/verify-schema.cjs
  - scripts/test-lead-actions.cjs
  - src/components/campanha-form-dialog.tsx
  - src/components/campanha-estado-badge.tsx
  - src/components/campanha-list.tsx
  - src/app/campanhas/page.tsx
  - src/app/campanhas/[id]/page.tsx
  - src/components/app-sidebar.tsx
  - package.json
findings:
  critical: 0
  warning: 4
  info: 9
  total: 13
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 22 adds the `campanhas` table, its FK to `subnichos`, an optional `leads.campanha_id`
FK, three Server Actions (create/update/softDelete), and the `/campanhas` list + `/campanhas/[id]`
detail UI plus sidebar link. The migration is hand-written and idempotent, `verify-schema.cjs`
and `migrate-campanhas.cjs` have solid post-conditions, and the regression fix to
`test-lead-actions.cjs` (adding the `campanhas` DDL + `campanha_id` ALTER to the harness's
`manualAlters`) is correct and consistent with the real migration.

No blockers. The main concerns: (1) the physical schema does **not** carry the `ON DELETE`
actions that `schema.ts` and the `campanha-actions.ts` doc comments claim, (2) `updateCampanha`
reports success on a zero-row update, (3) server-returned field errors are dropped by the
create dialog, and (4) `campanha-actions.ts` ships with a bespoke FK-violation backstop but no
test harness, unlike every other action module in the repo.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: Schema declares `onDelete` actions the physical DB never gets

**File:** `src/db/schema.ts:114` (`campanhas.nichoId` → `{ onDelete: "restrict" }`), `src/db/schema.ts:177` (`leads.campanhaId` → `{ onDelete: "set null" }`) vs `scripts/migrate-campanhas.cjs:58` and `:89`
**Issue:** `schema.ts` declares `onDelete: "restrict"` for `campanhas.nicho_id` and `onDelete: "set null"` for `leads.campanha_id`, but the migration DDL that actually builds the tables emits bare `REFERENCES subnichos(id)` and `REFERENCES campanhas(id)` with **no `ON DELETE` clause**, so the real DB uses `NO ACTION`. The `test-lead-actions.cjs` harness DDL (lines 125–126) mirrors the migration, so it inherits the same divergence. This directly contradicts the doc comment in `campanha-actions.ts:72-74` ("onDelete:\"restrict\" no schema faz o SQLite lançar SQLITE_CONSTRAINT_FOREIGNKEY") and the `leads.campanhaId` comment at `schema.ts:173-176` ("`onDelete: \"set null\"` — ... o lead não trava, só desvincula"). In practice `NO ACTION` still rejects a parent delete that would orphan children, and all deletes in this app are soft-deletes, so behavior is not broken today — but a hard delete via Drizzle Studio would be *rejected* on `leads.campanha_id`, not null it out as the comment promises. `verify-schema.cjs` and `migrate-campanhas.cjs` only assert FK *presence*, never the on-delete action, so nothing catches this.
**Fix:** Make the DDL match the schema:
```js
// migrate-campanhas.cjs
"nicho_id INTEGER NOT NULL REFERENCES subnichos(id) ON DELETE RESTRICT, " +
// ...
db.exec("ALTER TABLE `leads` ADD `campanha_id` integer REFERENCES `campanhas`(`id`) ON DELETE SET NULL;");
```
Apply the same to the `test-lead-actions.cjs` `manualAlters` block. If keeping `NO ACTION` is a
deliberate call, update the three doc comments to stop claiming `restrict`/`set null` semantics.

#### WR-02: `updateCampanha` returns `{ success: true }` for a non-existent or soft-deleted id

**File:** `src/actions/campanha-actions.ts:99-114`
**Issue:** The `WHERE id = ? AND deleted_at IS NULL` update affects zero rows when the campaign
does not exist or was already soft-deleted, but the action still returns `{ success: true }`.
A future edit UI (Phase 24 will enrich this same page) or a stale tab would silently "save"
into the void and show a success toast. The Zod `safeParse` and `nichoExists` checks all pass,
so nothing else guards this.
**Fix:** Inspect the mutation result and 404/return an error when nothing matched:
```ts
const res = await db.update(campanhas).set({ ...rest, updatedAt: sql`(unixepoch())` })
  .where(and(eq(campanhas.id, id), isNull(campanhas.deletedAt)));
if (res.changes === 0) return { errors: { id: ["Campanha não encontrada."] } };
```
(`better-sqlite3` exposes `.changes` on the run result.) Same reasoning applies to
`softDeleteCampanha` if a "not found" signal is ever needed there.

#### WR-03: Create dialog silently drops server-side field errors

**File:** `src/components/campanha-form-dialog.tsx:151-160`
**Issue:** When `createCampanha` returns `{ errors: { nichoId: [...] } }` (the `nichoExists`
race backstop, `campanha-actions.ts:64-66` / `75-77`), the dialog only fires a generic
`toast.error("Não foi possível criar a campanha. Tente novamente.")`. The structured
`state.errors` is never merged into `form` state, so the user gets no field-level indication
and retrying with the same (stale) niche selection fails again. Reachability is low today
(only a hard-deleted niche triggers it, and niches are soft-deleted only), but the pattern is
wrong and Phase 24 adds more server-authoritative validation to this form family.
**Fix:** In the `useEffect`, map returned errors onto the form:
```ts
} else if (state && "errors" in state) {
  for (const [field, msgs] of Object.entries(state.errors)) {
    if (msgs?.length) form.setError(field as keyof CampanhaFormValues, { message: msgs[0] });
  }
  toast.error("Não foi possível criar a campanha. Tente novamente.");
}
```

#### WR-04: No test harness for `campanha-actions.ts`

**File:** `src/actions/campanha-actions.ts` (whole file); `package.json:11-30`
**Issue:** `lead-actions`, `tarefa-actions`, `motivo-perda-actions` and `interacao-actions`
each have a dedicated `scripts/test-*.cjs` + `test:*` npm script. `campanha-actions.ts`
introduces its own `isForeignKeyViolation` backstop, a check-then-write race window, the
`janelaFim > janelaInicio` refine, and the idempotent `isNull(deletedAt)` soft-delete — none
of which are exercised by any test. `test-lead-actions.cjs` was touched this phase only to
stop `db.select().from(leads)` from breaking; it asserts nothing about campaigns.
**Fix:** Add `scripts/test-campanha-actions.cjs` (mould of `test-tarefa-actions.cjs`) covering:
valid create inserts one row; `janelaFim <= janelaInicio` rejected with the PT-BR message;
`nichoId` absent/invalid rejected; direct `db.insert(campanhas)` with a bogus `nicho_id`
throws `SQLITE_CONSTRAINT_FOREIGNKEY`; `softDeleteCampanha` twice is a no-op that preserves
the original `deleted_at`. Wire a `test:campanha-actions` script.

### Info

#### IN-01: `updateCampanha` / `softDeleteCampanha` exported but unwired

**File:** `src/actions/campanha-actions.ts:85-130`
**Issue:** No component imports either action; the only UI is create + read. Phase 22
requirements in scope are CAMPANHA-01/02/04 (no edit/delete). This is speculative code that
ships untested and unused.
**Fix:** Acceptable if Phase 24 consumes them imminently; otherwise defer them to the phase
that needs them so they land with their call sites and tests.

#### IN-02: `ActionState` type duplicated verbatim

**File:** `src/actions/campanha-actions.ts:25-28` and `src/components/campanha-form-dialog.tsx:41-44`
**Issue:** The union is copy-pasted and must be hand-synced (same latent drift risk as the
tarefa pair). If `createCampanha`'s return shape changes, the dialog's local type won't.
**Fix:** Export the type from the action module and import it in the dialog.

#### IN-03: Loose `id` parsing in the detail route

**File:** `src/app/campanhas/[id]/page.tsx:25-29`
**Issue:** `Number(id)` accepts `"0x10"` (→16), `"1e3"` (→1000), and whitespace-padded values,
so `/campanhas/0x10` resolves to campaign 16. Not a security issue (query is parameterized),
but the URL contract is sloppy.
**Fix:** `const campanhaId = /^\d+$/.test(id) ? Number(id) : NaN;` before the `Number.isInteger`
guard.

#### IN-04: Local-midnight date persisted, then formatted with server timezone

**File:** `src/components/campanha-form-dialog.tsx:95,104` and `src/app/campanhas/[id]/page.tsx:60-61` / `src/components/campanha-list.tsx:70-71`
**Issue:** `startOfDay(date)` produces browser-local midnight; `.toISOString()` serializes it to
UTC; the list/detail pages are Server Components and `format()` runs with the *server's*
timezone. When server TZ ≠ browser TZ the displayed day can be off by one. Not triggered for
the current setup (UTC-3 user on a local or UTC server), and it mirrors the pre-existing
`tarefa-form-dialog.tsx` pattern, so this is a latent consistency risk, not an active bug.
**Fix:** Persist a date-only string (`format(date, "yyyy-MM-dd")`) or normalize to UTC midnight
before `toISOString()`, and format without TZ dependence.

#### IN-05: Zero-length window rejected

**File:** `src/lib/validations.ts:297,305`
**Issue:** `d.janelaFim > d.janelaInicio` rejects a start == end window with "A data de fim deve
ser depois da data de início." A one-day exploration window is impossible to express.
**Fix:** Use `>=` if a single-day window should be allowed; otherwise document the decision.

#### IN-06: `CampanhaEstadoBadge` has no fallback for out-of-enum `estado`

**File:** `src/components/campanha-estado-badge.tsx:31-40`
**Issue:** The migration DDL (`estado TEXT NOT NULL DEFAULT 'explorando'`) has no `CHECK`
constraint, so a value written directly via Drizzle Studio would make `ESTADO_LABEL[estado]`
and `ESTADO_TOKEN[estado]` `undefined`, rendering an empty, unstyled badge.
**Fix:** `ESTADO_LABEL[estado] ?? estado` and a neutral default token class.

#### IN-07: Duplicate "Nova campanha" button in empty state

**File:** `src/components/campanha-list.tsx:38-56`
**Issue:** When `campanhas.length === 0`, both the top-bar button and the empty-state CTA render
simultaneously — two identical buttons on screen.
**Fix:** Hide the top-bar button when the list is empty (the empty-state CTA covers it), or vice
versa.

#### IN-08: Default window dates captured once at mount

**File:** `src/components/campanha-form-dialog.tsx:142-149,169`
**Issue:** `defaultValues` evaluates `new Date()` once when the component mounts. The dialog is
always rendered (controlled by parent state) and `form.reset()` returns to those frozen values,
so in a long-lived session the "~90 days from today" default drifts to "90 days from whenever
the page was first loaded."
**Fix:** Recompute defaults on open (`form.reset({...})` in an `open`-watching effect) instead
of relying on mount-time `defaultValues`.

#### IN-09: `JanelaField` label not associated with its control

**File:** `src/components/campanha-form-dialog.tsx:68-69`
**Issue:** `<FieldLabel>{label}</FieldLabel>` has no `htmlFor`, and the `PopoverTrigger` button
has no `id`, unlike the sibling `oferta`/`metaConversao` fields. Clicking the label does
nothing and screen readers don't associate them.
**Fix:** Give the trigger button an `id` and set `<FieldLabel htmlFor={id}>`.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
