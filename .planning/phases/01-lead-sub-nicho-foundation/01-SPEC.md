# Phase 1: Lead & Sub-nicho Foundation — Specification

**Created:** 2026-07-19
**Ambiguity score:** 0.08 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

Admin can fully manage leads (create, edit, list, filter, sort, soft-delete, restore) and an extensible sub-nicho taxonomy by hand, through a browser UI backed by a real database — replacing the Google Sheets workflow as the base data layer.

## Background

The `crm-leads` repo is greenfield: no application code exists yet, only planning artifacts (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`) and a stack decision already recorded in `CLAUDE.md` (Next.js 16 App Router, Drizzle ORM, SQLite via better-sqlite3, shadcn/ui, react-hook-form + Zod, @tanstack/react-table). Phase 1 builds the first vertical slice: the lead and sub-nicho data model plus the CRUD/list UI. No CSV import (Phase 2), no pipeline board (Phase 3), and no WhatsApp features (Phase 4) exist yet or are touched by this phase.

## Requirements

1. **Lead CRUD**: Admin can create and edit a lead with all required fields.
   - Current: No lead entity, table, or UI exists.
   - Target: A form creates/edits a lead with: nome, telefone, canal de contato (Instagram/WhatsApp), origem (texto livre), valor estimado (decimal R$), notas (texto único, sobrescrevível), data de follow-up (qualquer data, passada ou futura), sub-nicho (selecionado de lista existente), etapa (Novo/Contatado/Negociação/Fechado-Perdido, default "Novo"). All fields are required; the form blocks save with inline errors until every field is filled.
   - Acceptance: Submitting the form with any field empty shows an inline error and does not persist a row; submitting with all fields filled creates/updates a row with the entered values.

2. **Sub-nicho management**: Admin can create and rename sub-nichos in a dedicated management screen.
   - Current: No sub-nicho entity or management UI exists.
   - Target: A dedicated screen lists all sub-nichos with add and rename actions. Deleting/deactivating an existing sub-nicho is NOT included (v2 — LEAD-V2-01).
   - Acceptance: Creating a sub-nicho adds it to the list and makes it selectable on the lead form; renaming updates the name everywhere it's referenced; no delete/deactivate control exists on this screen.

3. **Sub-nicho duplicate prevention**: Exact case-insensitive duplicate names are blocked.
   - Current: No validation exists.
   - Target: Creating a sub-nicho whose name matches an existing one case-insensitively (ignoring leading/trailing whitespace) is rejected with an inline error. Near-duplicates with different spelling (e.g., "Nutri" vs "nutricionista") are NOT blocked or flagged — admin judgment only.
   - Acceptance: Attempting to create "nutricionista" when "Nutricionista" already exists is rejected; creating "Nutri" when "nutricionista" exists succeeds.

4. **Lead-to-sub-nicho assignment**: Each lead belongs to exactly one sub-nicho from the administrable list.
   - Current: No relationship exists.
   - Target: The lead form's sub-nicho field is a required single-select populated from the sub-nicho management list; free text is not allowed.
   - Acceptance: A lead cannot be saved without a sub-nicho selected from the existing list; the lead record stores a reference to exactly one sub-nicho.

5. **Soft-delete with confirmation**: Deleting a lead requires confirmation and never permanently destroys data.
   - Current: No delete mechanism exists.
   - Target: A delete action on a lead opens a confirmation modal ("Tem certeza que deseja excluir este lead?"); confirming marks the lead as deleted (soft-delete) and removes it from the active list. No hard-delete path exists in this phase.
   - Acceptance: Clicking delete without confirming leaves the lead in the active list; confirming removes it from the active list but the row still exists in the database with a deleted flag/timestamp set.

6. **Trash / restore**: Soft-deleted leads are recoverable through the UI.
   - Current: No trash view exists.
   - Target: A separate "Lixeira" page lists only soft-deleted leads, each with a restore action that clears the deleted flag and returns the lead to the active list.
   - Acceptance: A soft-deleted lead appears on the Lixeira page and not on the active list; clicking restore moves it back to the active list and off the Lixeira page.

7. **Filterable, sortable lead list**: Admin can view all active leads filtered and sorted by sub-nicho, etapa, and follow-up date.
   - Current: No list view exists.
   - Target: The active-leads list supports: single-select filter by sub-nicho, single-select filter by etapa, a date-range filter (start/end) on data de follow-up, and column sorting. Default view (no filters applied) is sorted by data de follow-up ascending (soonest first).
   - Acceptance: Applying a sub-nicho filter shows only leads with that sub-nicho; applying an etapa filter shows only leads in that etapa; applying a follow-up date range shows only leads with a follow-up date inside that range; with no filters applied, the topmost lead has the earliest (or no) follow-up date among all active leads.

8. **Etapa field without board**: Lead records carry a pipeline stage even though the visual board ships in Phase 3.
   - Current: No etapa field exists.
   - Target: The lead form includes an etapa select with the 4 fixed values (Novo, Contatado, Negociação, Fechado/Perdido), defaulting to "Novo" on creation. No drag-and-drop board UI is built in this phase.
   - Acceptance: A newly created lead has etapa = "Novo" unless changed; etapa can be changed via the form's select; no board/kanban view exists anywhere in the app after this phase.

9. **No duplicate-phone checking in manual entry**: Manual lead creation does not check for duplicate phone numbers.
   - Current: N/A (no lead creation exists).
   - Target: Saving a lead via the manual form never checks or warns about an existing lead with the same telefone. Duplicate detection is scoped entirely to the CSV import flow (Phase 2, IMPORT-02).
   - Acceptance: Creating two leads with an identical telefone value via the manual form succeeds for both, with no warning or block.

## Boundaries

**In scope:**
- Lead data model (Drizzle schema) and CRUD via Server Actions
- Lead form (create/edit) with all 9 fields listed above, full required-field validation
- Sub-nicho data model, management screen (create + rename only), case-insensitive exact-duplicate blocking
- Active leads list: table view, single-select filters (sub-nicho, etapa), date-range filter (follow-up), column sorting, default sort by soonest follow-up
- Soft-delete with confirmation modal
- Lixeira (trash) page listing soft-deleted leads with restore action

**Out of scope:**
- CSV import and duplicate-phone detection — Phase 2 (IMPORT-01/02/03, LEAD-05)
- Pipeline board / drag-and-drop / "esfriando" stale-lead flagging — Phase 3 (PIPE-01/02/03)
- Follow-up dashboard, WhatsApp templates, wa.me links — Phase 4 (REMIND-01, WA-01..05)
- Sub-nicho delete/deactivate/merge — v2 (LEAD-V2-01)
- Notes history with per-entry timestamps — v2 (PIPE-V2-02); Phase 1 notas is a single overwritable text field
- Fuzzy/similarity duplicate detection for sub-nicho names — admin judgment only in v1
- Multi-user auth, mobile app, cloud hosting — explicitly out of scope per PROJECT.md

## Constraints

- Stack is already locked in `CLAUDE.md`/research: Next.js 16 (Server Actions, no separate API layer), Drizzle ORM, SQLite (better-sqlite3 local file), Zod validation, react-hook-form, @tanstack/react-table, shadcn/ui. This phase must use that stack, not introduce alternatives.
- Valor estimado is stored/validated as a decimal number, displayed formatted as Brazilian Real (R$).
- All 9 lead fields are required at save time — no partial/draft leads are persisted.
- No performance constraints beyond standard local-SQLite usage (single admin, low volume).

## Acceptance Criteria

- [ ] Lead form creates a lead only when all 9 fields (nome, telefone, canal, origem, valor, notas, follow-up date, sub-nicho, etapa) are filled; any empty required field blocks save with an inline error
- [ ] Sub-nicho management screen supports create and rename, with no delete/deactivate control
- [ ] Creating a sub-nicho with a case-insensitive duplicate name is rejected
- [ ] Lead form's sub-nicho field only accepts a value from the existing sub-nicho list (single selection)
- [ ] Deleting a lead requires modal confirmation before it leaves the active list
- [ ] A dedicated Lixeira page lists soft-deleted leads and can restore them back to the active list
- [ ] Active leads list can be filtered by sub-nicho (single-select), by etapa (single-select), and by follow-up date range, independently or combined
- [ ] With no filters applied, the active leads list defaults to soonest-follow-up-first ordering
- [ ] A new lead defaults to etapa "Novo"; no pipeline board/kanban UI exists in the app
- [ ] Manual lead creation never blocks or warns on duplicate telefone values

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                        |
|---------------------|-------|------|--------|---------------------------------------------------------------|
| Goal Clarity        | 0.90  | 0.75 | ✓      | All 9 fields, defaults, and etapa scope confirmed             |
| Boundary Clarity    | 0.90  | 0.70 | ✓      | Explicit in/out-of-scope list; sub-nicho delete excluded      |
| Constraint Clarity  | 0.82  | 0.65 | ✓      | Field requiredness, value format, stack all confirmed         |
| Acceptance Criteria | 0.90  | 0.70 | ✓      | 10 pass/fail criteria, all falsifiable                        |
| **Ambiguity**       | 0.08  | ≤0.20| ✓      |                                                                 |

## Interview Log

| Round | Perspective     | Question summary                                              | Decision locked                                                        |
|-------|------------------|-----------------------------------------------------------------|--------------------------------------------------------------------------|
| 1     | Researcher/Boundary | Etapa field in Phase 1 form? Trash UI needed? Sub-nicho dedup level? | Etapa select yes (no board); trash/restore UI required; exact case-insensitive dedup only |
| 2     | Simplifier/Constraint | Required fields? Valor format? Filter selection type? | All 9 fields required; valor = decimal R$; filters are single-select |
| 3     | Boundary Keeper  | Validation-fail behavior? Default sort? Duplicate-phone scope? | Block save on empty required field; default sort = soonest follow-up first; no dup-phone check in manual entry (Phase 2 only) |
| 4     | Boundary Keeper  | Canal de contato list? Origem list? Follow-up date filter type? | Canal = fixed Instagram/WhatsApp select; origem = free text; date filter = range |
| 5     | Seed Closer      | Sub-nicho creation location? Delete confirmation? Trash page location? | Dedicated sub-nicho screen only (no inline shortcut); confirm modal before delete; separate Lixeira page |
| 6     | Seed Closer      | Notas history? Follow-up date restriction? Sub-nicho delete allowed? | Notas = single overwritable field; any date allowed (past/future); sub-nicho delete/merge deferred to v2 |

---

*Phase: 01-lead-sub-nicho-foundation*
*Spec created: 2026-07-19*
*Next step: /gsd-discuss-phase 1 — implementation decisions (form layout, table component wiring, DB schema field types, etc.)*
