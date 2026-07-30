---
phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
reviewed: 2026-07-30T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/db/schema.ts
  - src/lib/validations.ts
  - src/actions/lead-actions.ts
  - scripts/verify-wa-contact-invariant.cjs
  - src/components/whatsapp-preview-dialog.tsx
  - src/components/pipeline-lead-card.tsx
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the WA-06/07/08 "auto-advance stage + contact attempts counter" feature: the new `registerWhatsAppContact` server action, its Zod contract, the `contactAttempts` schema column, the new regression-guard script, and the two UI components that wire the click-to-WhatsApp flow. The core gate logic (`tipo === "primeiro_contato" && stage === "novo"`) is correctly implemented and matches the documented invariant table, and the counter increment correctly uses an atomic SQL expression rather than JS read-modify-write.

However, I found one deployment-breaking defect: the committed Drizzle migrations, when applied to a fresh database, do **not** produce the schema declared in `src/db/schema.ts` — the `templates` table and several `leads` columns (including this phase's new `contactAttempts`) are missing entirely. I verified this directly by applying all three committed `.sql` migration files to a fresh SQLite file. Any fresh install, CI run, or new environment following the documented migration path will crash on the very first leads query.

I also found a real (if narrow) TOCTOU race in `registerWhatsAppContact` that can overwrite a manually-set stage under concurrent writes — contradicting the function's own docstring — plus reliability gaps in the new regression-guard script (not wired into any npm script/CI, and it re-implements rather than exercises the real gate logic), and a pre-existing fragility in how `motivoPerda` is cleared that this phase's files also touch.

## Critical Issues

### CR-01: Committed migrations do not produce the schema declared in `schema.ts` — fresh deploys will crash (missing `contact_attempts`, `templates`, others)

**File:** `src/db/schema.ts` (declares `contactAttempts`); `src/db/migrations/*.sql` (does not contain it)

**Issue:** `src/db/schema.ts` declares `leads.contactAttempts` (`NOT NULL DEFAULT 0`) — this phase's new column, used by `registerWhatsAppContact` and rendered by `PipelineLeadCard`. The column was applied to the local `data/crm.db` via a hand-run `ALTER TABLE` (per `06-01-SUMMARY.md`, to work around a `drizzle-kit push` safety-gate bug), but **no corresponding `.sql` migration file was generated or committed**. I verified this is not just a theoretical gap by applying the three committed migrations (`0000_gifted_slapstick.sql`, `0001_grey_xavin.sql`, `0002_backfill-fechado-perdido-split.sql`) to a brand-new SQLite file:

```
TABLES: [ 'leads', 'sqlite_sequence', 'subnichos' ]
LEADS COLS: [ 'id','nome','telefone','canal','origem','valor_estimado_centavos',
  'notas','follow_up_date','subnicho_id','stage','deleted_at','created_at',
  'updated_at','motivo_perda','stage_changed_at' ]
```

The resulting schema is missing the entire `templates` table and the `leads.import_batch_id` and `leads.contact_attempts` columns. Any fresh clone, CI pipeline, or new deployment that runs `npx drizzle-kit migrate` (the project's documented workflow) ends up with a database that cannot satisfy `src/db/schema.ts` — every query that touches `leads` (via Drizzle's `select`/`insert`/`update`, all of which reference the full column set) will fail at runtime with `SQLITE_ERROR: no such column: contact_attempts` (or `no such table: templates`), i.e. the app is non-functional out of the box.

This is documented as known, accumulating debt in `06-01-SUMMARY.md`/`06-01-PLAN.md` ("snapshot diverge do banco real... débito herdado... ampliado por este plano"), but the debt is real, growing, and now directly blocks this phase's own feature on any environment other than the one developer machine where the manual `ALTER TABLE` was run.

**Fix:** Reconcile `src/db/migrations/` with the actual schema before shipping — either hand-write a migration (or a short sequence of them) that adds `templates`, `leads.import_batch_id`, `subnichos.deleted_at`, and `leads.contact_attempts` to match `schema.ts`, or regenerate the migration history from a fresh `drizzle-kit introspect`/squash against the real `data/crm.db`, and commit the result. Do not treat a single developer's locally-patched `data/crm.db` as the source of truth for schema state.

## Warnings

### WR-01: `registerWhatsAppContact`'s stage write is not conditioned on stage at write time (TOCTOU) — contradicts its own docstring guarantee

**File:** `src/actions/lead-actions.ts:217-248`

**Issue:** The function reads `current.stage` in a separate `SELECT`, computes `advanced` in JS, and then issues an `UPDATE` whose `WHERE` clause only filters by `id`/`deletedAt` — not by `stage`. The docstring explicitly claims this "nunca sobrescreve negociacao/fechado/perdido definidos manualmente, porque o gate exige etapa atual 'novo'", but that guarantee is not actually enforced atomically: if the lead's stage changes between the `SELECT` and the `UPDATE` (e.g. a concurrent drag-and-drop stage change, or the admin re-opening the WhatsApp dialog and clicking "Abrir WhatsApp" again for the same lead while an earlier in-flight request hasn't resolved yet), this `UPDATE` will still unconditionally write `stage: "contatado"`, silently clobbering whatever the concurrent write set. `06-RESEARCH.md` (Pitfall 5) explicitly accepts this class of race for the drag-vs-click cross-component case, but the docstring's absolute wording ("nunca sobrescreve") overstates what the code actually guarantees, and the same mechanism also produces a duplicate "avançou para Contatado" toast on the client for the second in-flight call.

**Fix:** Make the write self-conditioning so the guarantee is actually atomic, e.g.:
```ts
await db
  .update(leads)
  .set({
    contactAttempts: sql`${leads.contactAttempts} + 1`,
    stage: sql`CASE WHEN ${leads.stage} = 'novo' THEN 'contatado' ELSE ${leads.stage} END`,
    stageChangedAt: sql`CASE WHEN ${leads.stage} = 'novo' THEN ${Math.floor(Date.now() / 1000)} ELSE ${leads.stage_changed_at} END`,
  })
  .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
```
or, at minimum, add `eq(leads.stage, "novo")` as an additional `WHERE` condition on a second conditional update, and derive `advanced` from the update's affected-row count rather than the earlier `SELECT`. If the team decides the current narrow risk is acceptable (consistent with the already-accepted Pitfall 5), at least correct the docstring to describe the real (accepted) limitation instead of asserting an absolute guarantee.

### WR-02: `verify-wa-contact-invariant.cjs` is not wired into any npm script or CI — the "regression guard" never runs automatically

**File:** `scripts/verify-wa-contact-invariant.cjs`

**Issue:** `package.json` only registers `guard:no-hard-delete` as an npm script; there is no entry for this new script, and the repository has no `.github/workflows` (or other CI) that invokes it. The script's own header comment describes it as a "guarda de regressão" for the WA-06/07/08 invariants, but as committed it only runs if a developer remembers to type `node scripts/verify-wa-contact-invariant.cjs` manually — it currently provides zero automated protection against regressions.

**Fix:** Add an npm script mirroring the existing pattern, e.g. `"guard:wa-contact-invariant": "node scripts/verify-wa-contact-invariant.cjs"`, and wire it into whatever pre-commit/CI check already runs `guard:no-hard-delete`.

### WR-03: `verify-wa-contact-invariant.cjs` re-implements the gate logic instead of exercising the real server action

**File:** `scripts/verify-wa-contact-invariant.cjs:48-50`

**Issue:** The guard hand-rolls its own copy of the gate predicate:
```js
function advanced(stage, tipo) {
  return tipo === "primeiro_contato" && stage === "novo";
}
```
instead of importing and exercising `registerWhatsAppContact` from `src/actions/lead-actions.ts`. If the production implementation ever diverges from this mirrored logic (e.g. a future edit tweaks the condition, drops the `isNull(deletedAt)` filter, or changes the SQL increment expression), this script will keep passing — it validates its own re-implementation, not the shipped code — giving false confidence that the invariant still holds in production.

**Fix:** Refactor `registerWhatsAppContact` to delegate its gate decision to a small, exported pure function (e.g. `shouldAdvance(stage, tipo)`) that both the server action and this script import, or have the script call the real server action against an injected/in-memory `db` client so it exercises actual production code paths.

### WR-04: `motivoPerda` write can silently no-op when re-entering "perdido" without a reason, due to Drizzle's `undefined`-filtering in `.set()`

**File:** `src/actions/lead-actions.ts:132`, `src/actions/lead-actions.ts:184`

**Issue:** Both `updateLead` and `updateLeadStage` compute:
```ts
motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
```
`stageUpdateSchema.motivoPerda` is `z.string().trim().optional()`, and the "Pular" button in `MotivoPerdaDialog` resolves the drag-and-drop flow with `motivoPerda = undefined` (see `pipeline-board.tsx`'s `onSkip={() => resolveMotivoPerda(undefined)}`). When the target stage is `"perdido"` and no reason is given, the ternary evaluates to `undefined`. Drizzle's `mapUpdateSet` (`node_modules/drizzle-orm/utils.js:84`) filters out any key whose value is `undefined` before building the `SET` clause — so this key is silently dropped from the `UPDATE` rather than being written as `NULL`. In the currently-reachable paths this is harmless by coincidence (every exit from `"perdido"` explicitly writes `null`, so there's never stale non-null data left lying around before a fresh entry into `"perdido"`), but it is a latent, undocumented fragility: dropping a lead that's already `"perdido"` with a real reason back onto the `"perdido"` column again and clicking "Pular" will silently retain the old reason instead of clearing/replacing it, with no code comment acknowledging this is intentional (WR-02 in the code comments only documents the "leaving perdido" clearing case, not this one).

**Fix:** Use `parsed.data.motivoPerda ?? null` instead of relying on the implicit `undefined`-skip behavior of `.set()`, so the intended semantics (always write the column, clearing it when no reason is supplied) hold regardless of Drizzle's internals.

## Info

### IN-01: Double type-assertion through `unknown` defeats type safety on the tipo `Select`

**File:** `src/components/whatsapp-preview-dialog.tsx:128`

**Issue:** `items={TIPO_OPTIONS as unknown as { value: string; label: string }[]}` casts through `unknown`, which suppresses TypeScript's structural check entirely — if `TIPO_OPTIONS` or the `Select` component's expected item shape changes, this line won't produce a compile error even though it should.

**Fix:** If the `Select` component's generic item type is too strict for a `readonly` literal tuple, prefer a narrower assertion (`as { value: string; label: string }[]`) or adjust `TIPO_OPTIONS`'s declared type instead of casting through `unknown`, which is the most permissive escape hatch available and should be avoided per the "unsafe deserialization"-adjacent type-safety concerns TypeScript projects generally guard against.

---

_Reviewed: 2026-07-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
