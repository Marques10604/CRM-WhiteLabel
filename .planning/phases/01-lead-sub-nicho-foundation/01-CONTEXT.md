# Phase 1: Lead & Sub-nicho Foundation - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can fully manage leads (create, edit, list, filter, sort, soft-delete, restore) and an extensible sub-nicho taxonomy by hand, through a browser UI backed by a real database — replacing the Google Sheets workflow as the base data layer. Greenfield build: no application code exists yet in this repo.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `01-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `01-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Lead data model (Drizzle schema) and CRUD via Server Actions
- Lead form (create/edit) with all 9 fields, full required-field validation
- Sub-nicho data model, management screen (create + rename only), case-insensitive exact-duplicate blocking
- Active leads list: table view, single-select filters (sub-nicho, etapa), date-range filter (follow-up), column sorting, default sort by soonest follow-up
- Soft-delete with confirmation modal
- Lixeira (trash) page listing soft-deleted leads with restore action

**Out of scope (from SPEC.md):**
- CSV import and duplicate-phone detection — Phase 2
- Pipeline board / drag-and-drop / "esfriando" flagging — Phase 3
- Follow-up dashboard, WhatsApp templates, wa.me links — Phase 4
- Sub-nicho delete/deactivate/merge — v2 (LEAD-V2-01)
- Notes history with per-entry timestamps — v2 (PIPE-V2-02); notas is a single overwritable field
- Fuzzy/similarity duplicate detection for sub-nicho names — admin judgment only
- Multi-user auth, mobile app, cloud hosting — out of scope per PROJECT.md

</spec_lock>

<decisions>
## Implementation Decisions

### Lead form
- **D-01:** Form opens as a modal/dialog over the list (not a dedicated page) — used for both create and edit.
- **D-02:** The 9 fields are grouped into visual sections within the same modal (no tabs/steps): "Contato" (nome, telefone, canal, origem), "Negócio" (sub-nicho, etapa, valor), "Acompanhamento" (notas, follow-up).
- **D-03:** Sub-nicho field is a searchable combobox (not a plain select) — anticipates the sub-nicho list growing over time.
- **D-04:** Closing the modal with unsaved changes shows a "Descartar alterações?" warning before discarding.
- **D-05:** Delete confirmation modal must include the specific lead's name in the message (e.g., "Tem certeza que deseja excluir [Nome]?"), not a generic message.

### Leads list
- **D-06:** Default visible table columns: Nome, Sub-nicho, Etapa, Follow-up, Telefone. Valor, canal, origem, and notas are only visible inside the edit modal.
- **D-07:** Clicking a row opens the same edit modal used for creation, pre-filled with that lead's data.
- **D-08:** Row-level actions (edit, delete) are direct icon buttons on the row, not hidden behind a "…" menu.
- **D-09:** Etapa is displayed as a colored badge in the list (e.g., cinza=Novo, azul=Contatado, amarelo=Negociação, verde/vermelho=Fechado/Perdido) — anticipates reuse by the Phase 3 board.
- **D-10 (SUPERSEDED by Phase 3 D-01):** "Fechado/Perdido" remains a single etapa value, exactly as locked in SPEC.md/ROADMAP.md — not split into two separate stages. *Revisited and reversed during Phase 3 discussion (2026-07-21): the admin asked to split this into "Fechado" and "Perdido" for clearer win/loss visibility. See `.planning/phases/03-sales-pipeline-funnel-view/03-CONTEXT.md` D-01 through D-05 for the new decision and migration plan. This D-10 entry is kept for history — Phase 1's implementation still uses the combined value until Phase 3 executes the schema migration.*
- **D-11:** Filters (sub-nicho, etapa, follow-up date range) live in a fixed toolbar always visible above the table, not a collapsible panel.
- **D-12:** Pagination is classic (prev/next controls), 25 leads per page — using `@tanstack/react-table`'s built-in pagination.
- **D-13:** Empty state (no leads yet) shows explanatory text plus a "Novo lead" call-to-action button, in addition to the always-visible "Novo lead" button elsewhere on the screen.
- **D-14:** Root route `/` shows the leads list directly (with default sort/filter state) — no separate welcome screen. This becomes the eventual home for the Phase 4 follow-up dashboard.

### Sub-nicho management
- **D-15:** Dedicated management screen (not inline creation from the lead form's combobox) — matches SPEC.md boundary (create + rename only, no delete).
- **D-16:** Editing is inline within the list — a pencil icon turns the name into an editable field directly; "+ Adicionar" adds a new row. No separate modal for sub-nicho CRUD.

### Lixeira (trash)
- **D-17:** Restoring a lead from the Lixeira is instantaneous (no confirmation modal) — restoring is a safe, non-destructive action, unlike deleting.

### Navigation
- **D-18:** Fixed sidebar navigation with links to Leads, Sub-nichos, and Lixeira — not nested under a settings menu. Sets up the structure Phase 3 (board) and Phase 4 (dashboard) will extend.

### Claude's Discretion
- Exact badge colors per etapa, toast/notification wording (sonner), form field ordering within each section, and loading/submitting-state UI are left to implementation — no founder preference expressed beyond the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/phases/01-lead-sub-nicho-foundation/01-SPEC.md` — Locked requirements — MUST read before planning
- `.planning/REQUIREMENTS.md` — Full v1/v2 requirement list and traceability (LEAD-01..05, REMIND-02 map to this phase)
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependencies

### Stack & Architecture
- `.planning/research/STACK.md` — Locked stack: Next.js 16 (Server Actions, no separate API), Drizzle ORM, SQLite (better-sqlite3), Zod, react-hook-form, @tanstack/react-table, @dnd-kit (Phase 3), shadcn/ui, date-fns
- `.planning/research/ARCHITECTURE.md` — Data model and architecture guidance for the lead/sub-nicho schema
- `.planning/research/PITFALLS.md` — Known pitfalls to avoid (validation, form state, schema design)
- `CLAUDE.md` — Project stack/constraints summary (sourced from the above research docs)

[No other external specs/ADRs referenced during this discussion.]

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
None — repository is greenfield, no application code exists yet. This phase creates the first components, schema, and Server Actions.

### Established Patterns
None yet established (per `CLAUDE.md` Conventions/Architecture sections — both explicitly "not yet populated").

### Integration Points
N/A for this phase — Phase 1 IS the integration point subsequent phases (CSV import, pipeline board, WhatsApp outreach) will build on.

</code_context>

<specifics>
## Specific Ideas

- Etapa badges should use distinguishable colors per stage since Phase 3's board will visually reuse this same stage vocabulary.
- Sidebar navigation structure (Leads / Sub-nichos / Lixeira) is intentionally set up to leave room for Phase 3's board and Phase 4's dashboard as additional nav items later.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No scope-creep suggestions came up during this session.

</deferred>

---

*Phase: 01-lead-sub-nicho-foundation*
*Context gathered: 2026-07-19*
