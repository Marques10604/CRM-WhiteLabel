---
phase: 04-follow-up-dashboard-whatsapp-outreach
plan: 02
subsystem: templates
tags: [drizzle-orm, sqlite, server-actions, react-hook-form, zod, transactions]

# Dependency graph
requires:
  - phase: 04-01
    provides: sidebar nav item "Templates" already pointing to /templates; DialogState create-mode pattern reused for form dialog
provides:
  - templates table in schema.ts and live SQLite DB (tipo enum, nome, corpo, isDefault, timestamps)
  - Template/NewTemplate types, templateSchema (Zod)
  - CRUD Server Actions (createTemplate/updateTemplate/deleteTemplate/setDefaultTemplate) with "one default per type" transaction invariant (D-12)
  - /templates route with grouped-by-type list, create/edit modal, delete confirmation
affects: [04-03-whatsapp-send, 04-04-auto-trigger]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "db.transaction() desmarca-entao-marca atomico for 'exactly one default per type' invariant, avoiding a partial uniqueIndex().where() (SQLite drizzle-kit generates incorrect partial index SQL for this shape)"
    - "isDefault checkbox as a plain native <input type=checkbox> registered via form.register, not a new shadcn primitive (zero new registry items per UI-SPEC)"

key-files:
  created:
    - src/actions/template-actions.ts
    - src/app/templates/page.tsx
    - src/components/template-list.tsx
    - src/components/template-form-dialog.tsx
    - src/components/delete-template-dialog.tsx
  modified:
    - src/db/schema.ts
    - src/types/index.ts
    - src/lib/validations.ts

key-decisions:
  - "revalidatePath('/templates')/('/')/('/pipeline') calls are duplicated inline in each of the 4 actions rather than factored into a shared helper, to match the plan's literal automated verification grep (counts >=2 occurrences of revalidatePath(\"/pipeline\") across the file) — a shared-helper refactor is functionally equivalent but was reverted to satisfy the plan's own verify command"
  - "setDefaultTemplate/deleteTemplate are called directly from the client component (not through useActionState/form action, since they take positional args id/tipo, not (_prevState, formData)) — wrapped in useTransition for pending state and error toasts"

patterns-established:
  - "Template list groups rows into 3 fixed sections (1º contato / Follow-up / Prova de valor) by filtering client-side rather than relying on SQL ORDER BY tipo, since the enum's alphabetical order (follow_up < primeiro_contato < prova_valor) does not match the desired display order"

requirements-completed: [WA-01]

# Metrics
duration: ~50min
completed: 2026-07-22
---

# Phase 04 Plan 02: WhatsApp Template CRUD Summary

**CRUD completo de templates de WhatsApp (tabela `templates`, Server Actions, tela `/templates`) com invariante "um padrão por tipo" garantido atomicamente via `db.transaction()` no servidor.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-07-22
- **Tasks:** 3/3 completed
- **Files modified:** 8 (3 modified, 5 created)

## Accomplishments
- `templates` table added to `src/db/schema.ts` and applied to the live SQLite database via `npx drizzle-kit push` (BLOCKING task — confirmed via direct `sqlite_master`/`PRAGMA table_info` query, not just `tsc`)
- Full CRUD (`createTemplate`/`updateTemplate`/`deleteTemplate`/`setDefaultTemplate`) with hard delete (D-13) and an atomic "exactly one default per type" invariant enforced via `db.transaction()` (D-12), verified with a real desmarca-então-marca SQL transaction against the live DB
- `/templates` route: list grouped into 3 sections by type, "Padrão" badge, "Tornar padrão" ghost action, edit/delete icon actions, create/edit modal (react-hook-form + Zod), delete confirmation modal
- Zero new npm dependencies, zero new shadcn registry items (isDefault uses a plain native checkbox, per 04-UI-SPEC/04-RESEARCH constraint)

## Task Commits

Each task was committed atomically:

1. **Task 1: Contratos — tabela templates + tipo + templateSchema** - `4729b1e` (feat)
2. **Task 2: [BLOCKING] Aplicar schema no banco (drizzle-kit push)** - no commit (see below)
3. **Task 3: Server Actions CRUD + tela /templates** - `3e348d3` (feat)

**Plan metadata:** pending (this commit)

### Note on Task 2 (no commit)

`npx drizzle-kit push` was executed and is **confirmed applied** to the live database (`./data/crm.db`) — verified directly via a `better-sqlite3` query against `sqlite_master` and `PRAGMA table_info(templates)`, returning all 7 expected columns (`id, tipo, nome, corpo, is_default, created_at, updated_at`). This task produced **no git-trackable file changes**: `data/crm.db` is intentionally gitignored (`.gitignore:44 /data/*.db*`, "local data, not versioned"), and `drizzle-kit push` (unlike `drizzle-kit generate`) applies the diff directly without writing migration SQL files to `src/db/migrations/`. There is therefore nothing to commit for this task beyond what Task 1 (schema.ts) and Task 3 (actions that depend on the live table) already commit — the live-DB state itself is the artifact, and it was verified at execution time per the BLOCKING requirement.

## Files Created/Modified
- `src/db/schema.ts` - `templates` table (tipo enum, nome, corpo, isDefault boolean default false, timestamps, `templates_tipo_idx`); explicitly NOT using a partial `uniqueIndex().where(...)` per Pitfall 3
- `src/types/index.ts` - `Template`/`NewTemplate` types
- `src/lib/validations.ts` - `templateSchema` (Zod, PT-BR messages) + `TemplateFormValues`
- `src/actions/template-actions.ts` - CRUD actions; `applyDefaultTemplate()` shared transaction helper used by both create/update (when isDefault=true) and `setDefaultTemplate`
- `src/app/templates/page.tsx` - Server Component, fetches all templates ordered by tipo/nome, renders `TemplateList`
- `src/components/template-list.tsx` - Client component: DialogState union (closed/create/edit), grouped sections, row actions, empty state
- `src/components/template-form-dialog.tsx` - react-hook-form + zodResolver + useActionState, raw-DOM FormData submission (same pattern as lead-form-dialog)
- `src/components/delete-template-dialog.tsx` - Confirmation modal, same shape as discard-changes-dialog

## Decisions Made
- Kept `revalidatePath` calls inline (duplicated 3x per action) rather than factoring into a shared helper — a first-draft helper-function refactor passed `tsc`/`build` but failed the plan's own grep-based verify command (which counts literal `revalidatePath("/pipeline")` occurrences across the file, expecting ≥2). Reverted to inline calls to satisfy the plan's explicit verification contract.
- `setDefaultTemplate`/`deleteTemplate` are called directly as async functions from the client component (positional args, not `(_prevState, formData)`), wrapped in `useTransition` for pending state — they are not bound to a `<form>`/`useActionState`, matching the plan's action signatures exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reverted a shared `revalidateTemplateRoutes()` helper back to inline calls**
- **Found during:** Task 3 verification
- **Issue:** First implementation factored the 3 `revalidatePath` calls into a shared helper function called once per action. This is functionally identical (every mutating action still revalidates `/templates`, `/`, `/pipeline`) but broke the plan's automated verify command, which does a literal string-count of `revalidatePath("/pipeline")` occurrences in the file (expects ≥2, a helper collapses it to 1).
- **Fix:** Inlined the 3 `revalidatePath` calls at the end of each of the 4 actions.
- **Files modified:** `src/actions/template-actions.ts`
- **Commit:** `3e348d3`

## Issues Encountered
- Attempted a deeper headless functional test by importing `createTemplate`/`updateTemplate`/`deleteTemplate`/`setDefaultTemplate` directly via `npx tsx` outside the Next.js runtime. This failed with `Invariant: static generation store missing in revalidatePath /templates` — `revalidatePath` requires an active Next.js request/build context and cannot be called from a bare Node/tsx script. One row (`TESTE A`) was inserted into the live DB before the throw (the DB write itself succeeded; only the subsequent `revalidatePath` call threw) — this leftover test row was detected and deleted immediately after, and the live `templates` table was confirmed empty (0 rows) before finishing. Fell back to (a) `npm run build` (which exercises the full Next.js build/type pipeline including `/templates`), (b) the plan's own raw-SQL desmarca-então-marca transaction test against the live DB (mirrors `applyDefaultTemplate`'s exact logic), and (c) `tsc --noEmit` — consistent with the no-browser-access substitution pattern already established in 01-02/01-03/04-01.
- `<human-check>` browser click-through (create one template of each type with `{nome}`/`{subnicho}`/`{origem}` in the body, mark one as default, create a second of the same type and mark it default — confirming the first loses its badge, edit, delete with confirmation) was **NOT run** — no browser access in this headless executor, same caveat flagged in every prior phase's summaries. A real `npm run dev` click-through of `/templates` is still recommended before considering the UI polished.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- `templates` table, types, and full CRUD are live and ready for 04-03 (WhatsApp send button + preview modal) to query `db.select().from(templates).where(eq(templates.isDefault, true))` per type.
- `setDefaultTemplate`'s atomic transaction pattern (`applyDefaultTemplate`) is reusable if a future plan needs to programmatically flip a default (e.g., seeding).
- No blockers identified for downstream plans in this phase.

---
*Phase: 04-follow-up-dashboard-whatsapp-outreach*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/db/schema.ts
- FOUND: src/actions/template-actions.ts
- FOUND: src/app/templates/page.tsx
- FOUND: src/components/template-list.tsx
- FOUND: src/components/template-form-dialog.tsx
- FOUND: src/components/delete-template-dialog.tsx
- FOUND: commit 4729b1e
- FOUND: commit 3e348d3
