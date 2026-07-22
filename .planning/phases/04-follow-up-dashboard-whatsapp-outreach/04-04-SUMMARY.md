---
phase: 04-follow-up-dashboard-whatsapp-outreach
plan: 04
subsystem: whatsapp-auto-trigger
tags: [server-actions, react-hooks, whatsapp, drizzle-orm]

# Dependency graph
requires:
  - phase: 04-02
    provides: templates table, Template type, isDefault-per-tipo invariant
  - phase: 04-03
    provides: WhatsAppPreviewDialog (shared editable preview modal), src/lib/whatsapp.ts
provides:
  - createLead returns the inserted Lead ({ success: true; lead? })
  - src/hooks/use-first-contact-trigger.ts (useFirstContactTrigger) — reusable trigger hook for Phase 2 CSV import
  - Auto-opened WhatsApp 1st-contact preview after manual lead creation, wired into all 3 creation surfaces (/, /leads, /pipeline)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First custom hook in the project (src/hooks/) — useFirstContactTrigger follows the same discriminated-state-over-boolean-flags convention used inline elsewhere (DialogState/PreviewState)"
    - "ActionState.success variant carries an optional `lead?: Lead` so updateLead (no lead) stays type-compatible with createLead (has lead) without a second union type"

key-files:
  created:
    - src/hooks/use-first-contact-trigger.ts
  modified:
    - src/actions/lead-actions.ts
    - src/components/lead-form-dialog.tsx
    - src/components/whatsapp-preview-dialog.tsx
    - src/components/lead-table.tsx
    - src/components/followup-dashboard.tsx
    - src/components/pipeline-board.tsx
    - src/app/leads/page.tsx

key-decisions:
  - "ActionState's success variant extended to { success: true; lead?: Lead } (optional, not a second discriminated variant) to keep updateLead's existing return shape valid without touching its call sites (Pitfall 1 from 04-RESEARCH.md)"
  - "WhatsAppPreviewDialog gained an optional `subtitulo?: string` prop with fallback to the existing 'Mensagem para {nome}' — preserves the 04-03 manual-send subtitle unchanged while letting the auto-trigger flow inject the UI-SPEC-mandated copy"
  - "firstContactTemplate resolved once per creation surface (lead-table.tsx, followup-dashboard.tsx, pipeline-board.tsx) via templates.find(tipo==='primeiro_contato' && isDefault), not inside LeadFormDialog itself, keeping LeadFormDialog a pure prop-consumer like the rest of the codebase's dialog components"

requirements-completed: [WA-04]

# Metrics
duration: ~35min
completed: 2026-07-22
---

# Phase 04 Plan 04: Auto-Trigger de WhatsApp de 1º Contato ao Criar Lead Summary

**Ao criar manualmente um lead em qualquer superfície (`/`, `/leads`, `/pipeline`), `createLead` agora retorna o lead inserido via `.returning()` e um novo hook compartilhado `useFirstContactTrigger` abre automaticamente o modal de preview de WhatsApp com o template padrão de 1º contato e o subtítulo mandatório da UI-SPEC, sem bloquear a criação nem exigir opt-in — fechando o loop WA-04.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-22
- **Completed:** 2026-07-22T02:44:31Z
- **Tasks:** 2/2 completed
- **Files modified:** 8 total (1 created, 7 modified)

## Accomplishments

- `createLead` returns `{ success: true, lead: Lead }` via `.returning()`, verified against the live SQLite DB (insert + returning + cleanup, id/nome/subnichoId round-tripped correctly)
- `updateLead`'s existing `{ success: true }` return (no `lead`) remains fully type-compatible — zero call-site breakage, confirmed by `npx tsc --noEmit`
- New `src/hooks/use-first-contact-trigger.ts` — the project's first custom hook, explicitly designed for reuse by the future CSV import (Phase 2) per D-18
- `LeadFormDialog` auto-triggers the WhatsApp preview only on manual creation (`!isEditMode && state.lead`), never on edit — verified by code inspection of the guard condition (edit mode's `updateLead` never populates `state.lead`, so the check is doubly safe)
- The auto-opened preview shows the UI-SPEC-mandated subtitle "Sugestão: enviar mensagem de primeiro contato para {nome}." (04-UI-SPEC.md line 152), distinct from the existing manual-send subtitle "Mensagem para {nome}" which is preserved unchanged
- All 3 lead-creation surfaces (`/` dashboard, `/leads` table, `/pipeline` board) now pass `templates` + `firstContactTemplate` to `LeadFormDialog`
- Closing the auto-opened preview without sending does not undo the lead creation (D-20) — the lead is already persisted by `createLead` before the preview ever opens

## Task Commits

Each task was committed atomically:

1. **Task 1: createLead retorna o lead + hook useFirstContactTrigger** - `e6c56f2` (feat)
2. **Task 2: Auto-abrir preview de 1º contato após criar lead (todas as superfícies)** - `1a1c021` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/actions/lead-actions.ts` - `ActionState` success variant extended to `{ success: true; lead?: Lead }`; `createLead` uses `db.insert(leads).values(parsed.data).returning()` and returns the inserted row; added `revalidatePath("/leads")` alongside the existing `/` and `/pipeline` calls
- `src/hooks/use-first-contact-trigger.ts` - New: `useFirstContactTrigger(defaultTemplate)` returns `{ open, template, lead, subnichoNome, trigger(lead, subnichoNome), close() }`, backed by a single `useState<{lead, subnichoNome} | null>`
- `src/components/lead-form-dialog.tsx` - New props `firstContactTemplate?`/`templates?`; local `ActionState` type also extended with `lead?: Lead` (this file re-declares the type per existing codebase convention, per 04-PATTERNS.md); success effect calls `firstContact.trigger(...)` after `onOpenChange(false)` when `!isEditMode && state.lead`; renders `WhatsAppPreviewDialog` driven by the hook's `open`/`lead`/`subnichoNome`, with `defaultTipo="primeiro_contato"` and the mandatory UI-SPEC subtitle
- `src/components/whatsapp-preview-dialog.tsx` - New optional prop `subtitulo?: string`; `DialogDescription` renders `subtitulo ?? "Mensagem para {nome}"`, preserving the 04-03 manual-send behavior when the prop is omitted
- `src/components/lead-table.tsx` - New `templates: Template[]` prop; derives `firstContactTemplate` and passes both to `LeadFormDialog`
- `src/components/followup-dashboard.tsx` - Derives `firstContactTemplate` from its existing `templates` prop (already received since 04-03) and passes it + `templates` to `LeadFormDialog`
- `src/components/pipeline-board.tsx` - Same as `followup-dashboard.tsx` — derives `firstContactTemplate` from its existing `templates` prop and passes it + `templates` to `LeadFormDialog`
- `src/app/leads/page.tsx` - Added `db.select().from(templates)` to the `Promise.all` fetch, passed to `<LeadTable templates={...}>`

## Decisions Made

- Kept `ActionState`'s success variant as a single shape with an *optional* `lead?: Lead` field rather than introducing a second discriminated success variant — this is the minimal-risk change that satisfies the plan's explicit instruction (Pitfall 1) to avoid breaking any existing `"success" in state` / `state.lead` call sites across the codebase (`updateLeadStage` in the same file, and every `useActionState` consumer).
- `firstContactTemplate` resolution (`templates.find(t => t.tipo === "primeiro_contato" && t.isDefault)`) is computed once per creation surface (`lead-table.tsx`, `followup-dashboard.tsx`, `pipeline-board.tsx`), not inside `LeadFormDialog` — matches the existing pattern where `LeadFormDialog` is a pure consumer of props (`subnichos`, `lead`) and surfaces own the data-shaping logic (mirrors how `subnichoNameById` maps are built in each surface, not inside the dialog).
- `WhatsAppPreviewDialog`'s new `subtitulo` prop is optional with a fallback, not a required prop with a call-site update at every existing usage — this is the least-invasive way to satisfy the plan's explicit requirement that "o uso manual do 04-03" (dashboard/pipeline send-button flows) must be preserved unchanged.

## Deviations from Plan

None — plan executed exactly as written. The only necessary addition beyond the plan's literal text was extending `lead-form-dialog.tsx`'s own locally-redeclared `ActionState` type (a pre-existing per-file duplication pattern flagged in 04-PATTERNS.md's "Shared Patterns" section) to also carry `lead?: Lead` — without this, `tsc --noEmit` failed because the component's local type shadowed the one exported from `lead-actions.ts`. This is a direct, mechanical consequence of the plan's own Task 1 action step ("Rode grep de todos os call sites... `tsc --noEmit` é a checklist final") rather than a deviation from intent.

## Issues Encountered

- `npm run build` was run with `NODE_OPTIONS="--max-old-space-size=3072"` proactively, following the OOM precedent already documented in `04-01-SUMMARY.md`/`04-03-SUMMARY.md` for this 4GB-RAM host — completed cleanly on the first attempt this time (`✓ Compiled successfully`, all 7 routes listed, no OOM).
- `<human-check>` browser click-through (create a lead via `/`, `/leads`, and `/pipeline` with a default 1º-contato template registered; confirm the preview auto-opens with the mandatory subtitle in all 3 cases; confirm closing without sending keeps the lead; confirm editing an existing lead never opens the preview) was **NOT run** — no browser access in this headless executor, consistent with every prior plan in this phase (04-01/02/03) and prior phases (01-02/01-03/03-*). Substituted with: `npx tsc --noEmit` (clean), `npm run build` (clean, all routes prerendered), the plan's own grep-based verification script (confirmed `.returning()`, `revalidatePath("/leads")`, `useFirstContactTrigger`, `defaultTipo="primeiro_contato"`, and the literal "Sugest" substring of the mandatory subtitle), and a headless `tsx` script that inserted a row via `db.insert(leads).values(...).returning()` against the real `./data/crm.db`, asserted the returned row's shape, then deleted the test row and the script itself. A real `npm run dev` click-through of the 3 creation surfaces is still recommended before considering the WA-04 flow fully polished — same caveat carried forward from every prior plan in this phase.

## User Setup Required

None — no external service configuration required. For the auto-trigger to show a pre-filled message (rather than an empty textarea), the admin should have at least one template of `tipo="primeiro_contato"` marked as `isDefault` in `/templates` (created in 04-02); if none exists, the preview still opens per D-19 but with an empty message body (existing `WhatsAppPreviewDialog`/`pickTemplate()` fallback behavior from 04-03, unchanged here).

## Next Phase Readiness

- WA-04 is the last requirement of Phase 4 (`follow-up-dashboard-whatsapp-outreach`) — this is the final plan (04-04) of the phase. All 4 plans (04-01 dashboard, 04-02 templates, 04-03 send button/preview, 04-04 auto-trigger) are now complete.
- `useFirstContactTrigger` is explicitly designed to be called once per imported row by the future CSV import feature (Phase 2 backlog item) without modification — it takes a `Lead` + `subnichoNome` and manages its own open/close state, decoupled from `LeadFormDialog`.
- No blockers identified for milestone completion or the next phase.

---
*Phase: 04-follow-up-dashboard-whatsapp-outreach*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/hooks/use-first-contact-trigger.ts
- FOUND: src/actions/lead-actions.ts
- FOUND: src/components/lead-form-dialog.tsx
- FOUND: src/components/whatsapp-preview-dialog.tsx
- FOUND: src/components/lead-table.tsx
- FOUND: src/components/followup-dashboard.tsx
- FOUND: src/components/pipeline-board.tsx
- FOUND: src/app/leads/page.tsx
- FOUND: commit e6c56f2
- FOUND: commit 1a1c021
