# Phase 3: Sales Pipeline & Funnel View - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin sees a Kanban-style board of all active leads grouped by pipeline stage, can drag a lead card from one stage to another to update it, and gets a visual flag on leads that have gone cold ("esfriando") in "Contatado" without progressing. Board lives on its own route, reusing the existing lead data model and edit modal.

</domain>

<decisions>
## Implementation Decisions

### Etapas do board (supersedes 01-CONTEXT.md D-10)
- **D-01:** The combined "Fechado/Perdido" stage is split into two distinct stages: **Fechado** and **Perdido**. The board has **5 columns**: Novo, Contatado, Negociação, Fechado, Perdido. This explicitly reverses `D-10` in `01-CONTEXT.md` ("Fechado/Perdido remains a single etapa value... not split") and requires updating the `stage` enum in `src/db/schema.ts` (`["novo", "contatado", "negociacao", "fechado", "perdido"]`), plus a migration for existing rows.
- **D-02:** Migration default: the 2 existing leads currently in `fechado_perdido` (confirmed via live DB query at discussion time) are migrated to **Fechado** by default. Admin manually re-assigns to Perdido if any were actually losses — trivial at this volume.
- **D-03:** A new dedicated schema field `motivoPerda` (text, nullable) is added to the lead model to capture why a deal was lost.
- **D-04:** When a lead is dragged into the **Perdido** column, a small modal/inline field prompts for `motivoPerda`. The field is **optional** — the admin can confirm the move without filling it in (does not block the drag).
- **D-05:** Column/badge colors follow the existing badge convention (green=Fechado, red=Perdido) — consistent with the palette already used in `etapa-badge.tsx`. Exact column ordering/spacing left to implementation.
- **Downstream doc updates required:** `ROADMAP.md` (Phase 1 and Phase 3 success criteria mentioning "4 etapas fixas"), `REQUIREMENTS.md` (PIPE-01), and `01-CONTEXT.md` (D-10) have been updated by the orchestrator alongside this CONTEXT.md to reflect the 5-stage model — see those files directly, not just this note.

### Critério de "esfriando" (PIPE-03)
- **D-06:** "Esfriando" is computed from **time since the last stage change** (not last edit/notes update) — simpler, uses the existing stage-entry timestamp, no new activity-tracking field needed.
- **D-07:** Threshold: **5 days** stuck in "Contatado" without a stage change triggers the "esfriando" flag. Applies only to the Contatado column (Novo/Negociação/Fechado/Perdido are not flagged).
- **D-08:** Visual indicator: a colored border/highlight (alert tone, e.g. yellow/orange) on the whole card — no separate icon+text required, though implementation may add one if it's cheap.

### Conteúdo do card no board
- **D-09:** Each draggable card shows: **Nome + Sub-nicho + Follow-up date**. Valor estimado stays modal-only, consistent with the existing list view convention (`01-CONTEXT.md` D-06).
- **D-10 (phase-3):** Clicking a card (not dragging) opens the **same lead edit modal** used by the list (`lead-form-dialog.tsx`), consistent with `01-CONTEXT.md` D-07 — no new modal/component needed.

### Contagem por etapa
- **D-11:** Each column header shows **only the lead count** — no sum of estimated value. Value roll-up per stage remains out of v1 scope (tracked as `PIPE-V2-01` in `REQUIREMENTS.md`, not pulled forward).

### Filtros no board
- **D-12:** The board shows **all active leads grouped by stage, unfiltered** — no sub-nicho/follow-up filter controls on this view for v1. Filtering remains the list view's job.

### Onde o board vive
- **D-13:** New dedicated route (e.g. `/pipeline`), with its own item in the fixed sidebar nav alongside Leads, Sub-nichos, and Lixeira — matches `01-CONTEXT.md` D-18, which explicitly reserved sidebar space for this.

### Coluna vazia / responsividade
- **D-14:** An empty column shows a discreet muted message (e.g. "Nenhum lead nessa etapa") with **no call-to-action button** — distinct from the list's empty state (`01-CONTEXT.md` D-13), which does have a "Novo lead" CTA because the list is the primary entry point.
- **D-15:** The 5 columns keep a fixed minimum width and the board scrolls **horizontally** on smaller screens, rather than shrinking columns to fit.

### Claude's Discretion
- Exact column widths/spacing, precise shade of the "esfriando" highlight color, exact wa.me-independent card micro-layout (icon choices, spacing), and the `motivoPerda` modal's exact copy/wording are left to implementation.

### Folded Todos
- **`.planning/todos/pending/2026-07-21-separar-fechado-perdido.md`** — "Separar Fechado e Perdido em duas etapas distintas." Originally captured as a backlog idea with an explicit warning that it conflicted with locked `D-10`. Discussed and folded into this phase's scope as D-01 through D-05 above (see Etapas do board section). This todo file should be marked resolved/moved once Phase 3 plans are executed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, dependencies (updated alongside this CONTEXT.md to reflect the 5-stage decision)
- `.planning/REQUIREMENTS.md` — PIPE-01, PIPE-02, PIPE-03 (PIPE-01 updated to describe 5 stages); PIPE-V2-01 (value roll-up, explicitly NOT pulled into this phase per D-11)
- `.planning/phases/01-lead-sub-nicho-foundation/01-CONTEXT.md` — D-06 (value modal-only), D-07 (row click opens modal), D-09 (badge colors anticipate Phase 3 reuse), D-10 (**superseded** by this phase's D-01), D-13 (list empty-state CTA, contrast with D-14 above), D-18 (sidebar reserved for Phase 3 nav item)
- `.planning/todos/pending/2026-07-21-separar-fechado-perdido.md` — folded todo, source of the stage-split decision

### Stack & Architecture
- `.planning/research/STACK.md` — locked stack recommends `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (**not yet installed** — confirmed via `package.json` at discussion time; researcher/planner must account for adding this dependency)
- `CLAUDE.md` — project stack/constraints summary

### Existing Schema/Code (see also `<code_context>` below)
- `src/db/schema.ts` — current `stage` enum (`novo`, `contatado`, `negociacao`, `fechado_perdido`) needs migration to the 5-value enum per D-01
- `src/components/etapa-badge.tsx` — `STAGE_OPTIONS`, single source of truth for stage labels/colors, needs a Fechado/Perdido split entry
- `src/components/lead-form-dialog.tsx` — reused as-is for card click (D-10 phase-3), will need the new `motivoPerda` field added somewhere sensible (implementation's call — likely alongside Etapa in the "Negócio" section)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lead-form-dialog.tsx` — the create/edit modal, reused unmodified in structure for card-click editing (D-10); needs `motivoPerda` field added.
- `etapa-badge.tsx` — `STAGE_OPTIONS` already centralizes stage labels/colors (built in Phase 1 specifically anticipating this reuse, per `01-CONTEXT.md` D-09) — extend with Fechado/Perdido split entries instead of the current combined one.
- `lead-table-toolbar.tsx` / `lead-table-columns.tsx` — existing sub-nicho/etapa/follow-up filter logic exists here but is explicitly NOT reused on the board per D-12 (board is unfiltered).

### Established Patterns
- Server Actions (not API routes) for all mutations — `createLead`/`updateLead` pattern in `src/actions/lead-actions.ts` should be followed for a new `updateLeadStage` (or similar) action handling drag-and-drop stage changes + optional `motivoPerda`.
- Soft-delete convention (`isNull(leads.deletedAt)`) — board query must filter out soft-deleted leads same as the list.

### Integration Points
- Board reuses the same `leads` table and Drizzle schema as the list (Phase 1) — only additive schema changes (enum split, new nullable `motivoPerda` column), no new tables.
- Sidebar nav component (Phase 1, D-18) gets a new "Pipeline" entry pointing at the new route.

</code_context>

<specifics>
## Specific Ideas

- Live DB check during discussion confirmed only 2 leads currently exist in `fechado_perdido` — migration risk is negligible at this data volume, which is why "Fechado (default) + manual reassignment" was chosen over a more complex migration UI.
- The `motivoPerda` prompt-on-drag pattern (optional field, non-blocking) mirrors how `01-CONTEXT.md` D-05 handled delete confirmation — specific-name copy, not generic — so the modal copy for this should similarly reference the lead by name if reasonable.

</specifics>

<deferred>
## Deferred Ideas

- **Soma de valor por etapa (roll-up)** — stays as `PIPE-V2-01` in REQUIREMENTS.md, explicitly not pulled into this phase (D-11).
- **Filtros no board (sub-nicho/follow-up)** — considered and explicitly deferred (D-12); board stays unfiltered for v1. Revisit if the admin finds the unfiltered board too noisy once real data volume grows.

### Reviewed Todos (not folded)
- **`.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`** — "Sequência de follow-up escalonada com templates de valor." Matched this phase by keyword search (`lead`, `data`, `admin`) but is out of scope for the pipeline/funnel board — belongs with Phase 4 (Follow-up Dashboard & WhatsApp Outreach). Left pending, not folded.

</deferred>

---

*Phase: 03-sales-pipeline-funnel-view*
*Context gathered: 2026-07-21*
