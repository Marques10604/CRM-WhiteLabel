# Phase 4: Follow-up Dashboard & WhatsApp Outreach - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin never misses a follow-up and can reach out via WhatsApp in one click, using ready-made templates, right from the dashboard, the reminders list, and the pipeline. This phase delivers: (1) a new default home view showing overdue/upcoming follow-ups, (2) a WhatsApp template management system with variable substitution, and (3) inline "send WhatsApp" buttons with a preview-before-send flow, wired into the follow-up dashboard, the pipeline board, and lead creation.

**Known cross-phase dependency gap:** Phase 4's roadmap depends partly on Phase 2 (CSV Bulk Import), which has not been built yet — same deliberate phase-reordering pattern as Phase 3 before Phase 1's 01-04. WA-04 ("ao importar um lead, sistema sugere WhatsApp") cannot literally trigger on import yet. See D-16/D-17 below for how this phase handles that gap without blocking on Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Dashboard vs lista atual (REMIND-01)
- **D-01:** The new follow-up dashboard **replaces** the current lead list at `/`. The full, filterable/sortable lead list (built in Phase 1 as REMIND-02) moves to a new dedicated route: **`/leads`**.
- **D-02:** Dashboard groups leads into **3 sections by urgency**: Vencidos (red, top) / Hoje / Próximos 7 dias.
- **D-03:** Empty state (no pending follow-ups) shows a positive message (e.g. "Tudo em dia! Nenhum follow-up pendente") with a CTA/shortcut to view all leads or create a new one.
- **D-04:** Dashboard scope is **active leads only** — excludes `fechado`/`perdido` stages, same `isNull(deletedAt)` + terminal-stage-exclusion pattern already used elsewhere in the codebase.
- **D-05:** Clicking a dashboard item opens the existing lead edit modal (`LeadFormDialog`) — same pattern as the lead list and pipeline board, for consistency.
- **D-06:** Sidebar nav: the item currently pointing to `/` is renamed to **"Follow-ups"** (now the home/dashboard); a new **"Leads"** item is added pointing to `/leads`, alongside Pipeline/Sub-nichos/Lixeira.
- **D-07:** No pagination/limit on the dashboard — shows all matching leads in each section. This is a personal CRM with low lead volume; simplicity wins over a "ver mais" pattern here.
- **D-08:** Each dashboard item shows the lead's stage badge (reuses `EtapaBadge`/`STAGE_OPTIONS` from Phase 3) for quick context without opening the modal.

### Sistema de templates (WA-01, WA-02, WA-03)
- **D-09:** **3 template types**: 1º contato, follow-up, prova de valor (this last type folds in the pending todo `2026-07-21-sequencia-follow-up-escalonada.md`'s "templates com prova social" request — the escalating-cadence *scheduling logic* from that todo is explicitly **not** part of this phase, see Deferred Ideas below).
- **D-10:** Supported variables: **`{nome}` + `{subnicho}` + `{origem}`**.
- **D-11:** Templates are managed on a new dedicated route: **`/templates`** (CRUD), with its own sidebar nav item — same pattern as `/subnichos`.
- **D-12:** When multiple templates of the same type exist, the admin marks **one as "padrão" per type**. The system uses that default automatically when suggesting/opening WhatsApp, but the admin can switch to a different template of the same type manually at send time (see D-14).
- **D-13:** Templates support **direct hard deletion**, no soft-delete/lixeira pattern. Templates are just reusable text with no sent-message history to preserve — deleting is safe and simple, unlike leads.

### Botão de enviar inline + preview (WA-03, WA-05)
- **D-14:** Inline "Enviar WhatsApp" button appears in **both** the follow-up dashboard items and the pipeline cards (satisfies WA-05 literally). Clicking it opens a **preview modal first** (WA-03) — never skips straight to `wa.me`.
- **D-15:** The preview modal shows the message with variables already filled in, in an **editable textarea** — admin can tweak the text for this one send without changing the saved template. The modal also includes a **type selector** (dropdown: 1º contato / follow-up / prova de valor) defaulting to the context-appropriate type (e.g., follow-up when opened from the dashboard) but switchable before sending.
- **D-16:** The send button is shown **regardless of the lead's `canal` field** (Instagram/WhatsApp) — `canal` represents the primary approach preference, not an exclusivity gate; admin may still want to WhatsApp an Instagram-tagged lead.
- **D-17:** If `normalizePhone()` returns `null` for the lead's phone (invalid/incomplete), the send button is **disabled with a tooltip warning** (e.g. "Telefone inválido — edite o lead") rather than hidden or silently broken.

### Gatilho de 1º contato sem Fase 2 pronta (WA-04)
- **D-18:** Since CSV import (Phase 2) doesn't exist yet, this phase builds the auto-suggestion trigger **on manual lead creation** instead (via the existing "Novo lead" form flow) rather than deferring it entirely. When Phase 2 ships later, the same trigger mechanism is expected to be reused for import — this phase should build it in a way that doesn't hard-couple to the manual-creation code path specifically (Claude's discretion on exact reuse shape, see below).
- **D-19:** After saving a new lead, the **1º contato preview modal opens automatically** (not just a toast/notification) — using the admin's default 1º contato template.
- **D-20:** Closing the auto-opened preview without sending does **not** undo lead creation — the lead is already saved; the preview is purely a suggestion layered on top.
- **D-21:** This auto-trigger fires **every time** a lead is manually created, with no configurable opt-out/checkbox for this phase — kept simple and predictable.

### Claude's Discretion
- Exact reuse mechanism connecting the manual-creation trigger (D-18) to a future import-triggered flow (Phase 2) — the planner/researcher should design this as a shared, reusable trigger function/hook rather than something inlined only in the manual-create path, so Phase 2 can wire into it later without a rewrite. Not user-specified beyond "don't hard-couple it."
- Exact wa.me URL encoding details (accents, emoji, line breaks per WA-02) — technical implementation, not a user decision.
- Visual styling specifics (colors beyond what's already established via EtapaBadge/existing UI conventions, spacing, exact component structure) — follow existing UI-SPEC conventions from Phases 1 and 3 unless a dedicated `/gsd-ui-phase 4` is run.

### Folded Todos
- **`2026-07-21-sequencia-follow-up-escalonada.md`** ("Sequência de follow-up escalonada com templates de valor") — only the **template-with-value-proof** part is folded into this phase (D-09, third template type). The escalating-cadence auto-scheduling logic (suggesting the next follow-up date automatically at +4/+10 day intervals after no response) is explicitly deferred — see Deferred Ideas.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing infrastructure this phase builds on
- `src/lib/phone.ts` — `normalizePhone()` already normalizes any phone format to digits-only with DDI 55, explicitly documented as "pronto para uso em wa.me (Fase 4)". Use this directly for wa.me link construction; do not reimplement.
- `src/db/schema.ts` — `leads.canal` enum (`instagram`/`whatsapp`) already exists; per D-16, do not gate the WhatsApp button on this field.
- `.planning/phases/03-sales-pipeline-funnel-view/03-CONTEXT.md`, `03-01-SUMMARY.md` — the 5-stage enum (`novo/contatado/negociacao/fechado/perdido`) and `EtapaBadge`/`STAGE_OPTIONS` this phase's dashboard reuses for D-08.
- `.planning/phases/01-lead-sub-nicho-foundation/01-CONTEXT.md` — original lead list/modal conventions (`LeadFormDialog`, empty states, soft-delete pattern) this phase should stay consistent with.

### Related backlog
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — origin of the "prova de valor" template type decision (D-09); the cadence-scheduling part remains here, unfolded.

No external specs/ADRs beyond the above — requirements are otherwise fully captured in decisions above and in `.planning/REQUIREMENTS.md` (WA-01 through WA-05, REMIND-01).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `normalizePhone()` (`src/lib/phone.ts`) — direct input to wa.me link construction, already DDI-55-normalized.
- `EtapaBadge` / `STAGE_OPTIONS` (`src/components/etapa-badge.tsx`) — reuse for dashboard item stage badges (D-08).
- `LeadFormDialog` — reuse unchanged for dashboard-item click-to-edit (D-05); this is where the D-18/D-19 auto-trigger hooks in after a successful create.
- Sidebar nav pattern (`src/components/app-sidebar.tsx`, `NAV_ITEMS`) — same pattern used in Phase 3 for adding `/pipeline`; apply identically for `/leads` and `/templates` (D-06, D-11).
- `discard-changes-dialog.tsx` / existing Dialog conventions — likely analog for the send-preview modal's structure (D-15).

### Established Patterns
- Soft-delete (`isNull(deletedAt)`) + terminal-stage exclusion — reuse for dashboard scope (D-04), do NOT apply to templates (D-13 explicitly opts out of soft-delete for templates).
- Server Action conventions (`createLead`/`updateLead` in `src/actions/lead-actions.ts`) — new template CRUD actions and the send-preview flow should follow the same `ActionState` / Zod-validation / `revalidatePath` conventions already established (including the Phase 3 gap-closure lesson: revalidate every route that displays the affected data).

### Integration Points
- New `/leads` route: move (not duplicate) the existing lead-table logic currently at `/`.
- New `/` route: new dashboard component, reads active leads grouped by follow-up urgency.
- New `/templates` route: new CRUD UI + new `templates` DB table (schema addition — flag for schema-push gate in planning).
- Pipeline cards (`pipeline-lead-card.tsx`, Phase 3) and dashboard items both need the new inline send-WhatsApp button + shared preview modal component.
- Lead creation flow (`createLead` success path) needs the new auto-trigger hook (D-18/D-19).

</code_context>

<specifics>
## Specific Ideas

- "Tudo em dia!" style copy for the dashboard empty state (D-03) — admin specifically wants a positive, encouraging tone, not a neutral/clinical empty state.
- Template preview should feel like a lightweight confirm-before-send step, not a heavyweight separate compose experience — editable textarea, not a full rich-text editor.

</specifics>

<deferred>
## Deferred Ideas

- **Escalating follow-up cadence (auto-scheduling)** — from `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`: automatically suggesting the next follow-up date at increasing intervals (+4 days, +10 days, ...) after no response. This is materially more complex than Phase 4's current scope (date-suggestion logic, configurable intervals per lead/sub-nicho) and was explicitly deferred by the admin to a future phase. The todo remains in `.planning/todos/pending/` (not folded, not closed).
- **Phase 2 (CSV Bulk Import) itself** — remains unbuilt. Once it exists, its import flow should call into the same auto-trigger mechanism built here for manual creation (per Claude's Discretion note above), rather than requiring a separate WA-04 implementation.

### Reviewed Todos (not folded)
- `2026-07-21-sequencia-follow-up-escalonada.md` — reviewed; only its template-with-value-proof aspect was folded (D-09/Folded Todos above), the cadence-scheduling aspect stays deferred as noted above.

</deferred>

---

*Phase: 4-follow-up-dashboard-whatsapp-outreach*
*Context gathered: 2026-07-21*
