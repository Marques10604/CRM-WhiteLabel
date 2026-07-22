---
phase: 04-follow-up-dashboard-whatsapp-outreach
plan: 03
subsystem: ui
tags: [whatsapp, wa.me, dnd-kit, base-ui, react]

# Dependency graph
requires:
  - phase: 04-01
    provides: FollowupDashboard component with DialogState pattern, /page.tsx dashboard fetch shape
  - phase: 04-02
    provides: templates table, Template type, /templates CRUD (isDefault per tipo invariant)
provides:
  - src/lib/whatsapp.ts (pure renderTemplate/buildWaLink, reused by 04-04's auto-trigger)
  - src/components/whatsapp-send-button.tsx (shared inline icon button, dashboard + pipeline)
  - src/components/whatsapp-preview-dialog.tsx (shared editable preview modal, dashboard + pipeline)
  - Inline "Enviar WhatsApp" surface wired into both / (dashboard) and /pipeline (cards)
affects: [04-04-auto-trigger]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared WhatsAppPreviewDialog instance per page, controlled by a discriminated PreviewState union ({open:false} | {open:true; lead; subnichoNome}), reset via useEffect keyed on [open, lead?.id] rather than remounting per-item"
    - "buttonVariants() used to style a raw <a href> for the wa.me link instead of an unverified Button render/asChild prop, matching 04-01's precedent for polymorphic Link composition"
    - "stopPropagation on both onPointerDown and onClick of the send-button wrapper to defeat both @dnd-kit's useDraggable listeners and the card's own onClick edit-trigger"

key-files:
  created:
    - src/lib/whatsapp.ts
    - src/components/whatsapp-send-button.tsx
    - src/components/whatsapp-preview-dialog.tsx
  modified:
    - src/app/page.tsx
    - src/components/followup-dashboard.tsx
    - src/app/pipeline/page.tsx
    - src/components/pipeline-board.tsx
    - src/components/pipeline-lead-card.tsx

key-decisions:
  - "waHref in whatsapp-preview-dialog.tsx is recomputed every render straight from the live `texto` textarea state, never memoized from the initial renderTemplate() output (Pitfall 4) — admin edits always reach the link before it opens"
  - "\"Abrir WhatsApp\" is rendered as a plain <a> styled with exported buttonVariants(), not nested inside <Button render={...}>, following the same avoid-unverified-polymorphic-API precedent set in 04-01-SUMMARY.md for Link+Button composition in this Base UI component library"
  - "pipeline-lead-card.tsx wraps the send-button in a div with both onPointerDown and onClick stopPropagation — onPointerDown alone was insufficient because useDraggable's own onClick-adjacent handlers and the card's onClick edit-trigger both needed to be defeated independently"

patterns-established:
  - "Template selection for preview defaults to the isDefault template of the selected tipo, falling back to the first template of that tipo (pickTemplate helper), recomputed on both dialog-open and tipo-select-change"

requirements-completed: [WA-02, WA-03, WA-05]

# Metrics
duration: ~40min
completed: 2026-07-22
---

# Phase 04 Plan 03: WhatsApp Send Button + Preview Modal Summary

**Vertical slice de envio de WhatsApp: `renderTemplate()`/`buildWaLink()` puros, botão ícone `WhatsAppSendButton`, e modal `WhatsAppPreviewDialog` (seletor de tipo + textarea editável) ligados no dashboard de follow-ups e nos cards do pipeline, completando D-14/D-15/D-16/D-17.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-22 (session resumed from 04-02 completion)
- **Completed:** 2026-07-22T02:31:43Z
- **Tasks:** 3/3 completed
- **Files modified:** 8 total (3 created, 5 modified)

## Accomplishments
- `src/lib/whatsapp.ts` — pure `renderTemplate()`/`buildWaLink()`, verified against accent/emoji/`\n`→`%0A` encoding via a headless script (no test framework needed, matches `phone.ts`/`money.ts` precedent)
- `WhatsAppSendButton` — shared icon-only button (36px touch target, teal accent, `title` tooltip when phone invalid per D-17) used identically in both surfaces
- `WhatsAppPreviewDialog` — shared editable preview modal with a message-type selector (1º contato/Follow-up/Prova de valor), live-edit textarea, and a `wa.me` link that always reflects the current textarea content (never the original template render)
- Dashboard (`/`) and Pipeline (`/pipeline`) both now expose the inline "Enviar WhatsApp" button per D-14/D-16 — dashboard defaults the preview to "Follow-up" (D-15 contextual default), pipeline defaults to "1º contato"
- Pipeline card's send-button click no longer starts a drag or opens the edit modal — verified via `stopPropagation` on both `onPointerDown` and `onClick`

## Task Commits

Each task was committed atomically:

1. **Task 1: Módulo whatsapp.ts + botão + modal de preview** - `9ed8750` (feat)
2. **Task 2: Ligar botão + preview no dashboard de follow-ups** - `56c0b3f` (feat)
3. **Task 3: Ligar botão + preview nos cards do pipeline** - `9b4ce52` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/lib/whatsapp.ts` - `renderTemplate()` (`.replaceAll` for `{nome}`/`{subnicho}`/`{origem}`) and `buildWaLink()` (`https://wa.me/<tel>?text=<encoded>`) — pure, no phone cleanup (reuses `normalizePhone` from the caller)
- `src/components/whatsapp-send-button.tsx` - Icon-only `Button` (`variant="ghost" size="icon-lg"`), `MessageCircle` icon in teal, `aria-label`/`title` per D-17
- `src/components/whatsapp-preview-dialog.tsx` - `Dialog` with `Select` (tipo) + `Textarea` (editable message) + conditional `<a>`/`<Button disabled>` footer action; `useEffect` resets `tipo`/`texto` on `[open, lead?.id]`
- `src/app/page.tsx` - Added `templates` to the `Promise.all` fetch, passed to `FollowupDashboard`
- `src/components/followup-dashboard.tsx` - Added `templates` prop, `PreviewState` union, per-item `WhatsAppSendButton` (wrapped in a `stopPropagation` div), single `WhatsAppPreviewDialog` with `defaultTipo="follow_up"`
- `src/app/pipeline/page.tsx` - Added `templates` to the `Promise.all` fetch, passed to `PipelineBoard`
- `src/components/pipeline-board.tsx` - Added `templates` prop, `PreviewState` union, single `WhatsAppPreviewDialog` with `defaultTipo="primeiro_contato"`, `onSendWhatsApp` handler passed to each card
- `src/components/pipeline-lead-card.tsx` - Added `onSendWhatsApp` prop, renders `WhatsAppSendButton` inside a `stopPropagation` wrapper (both `onPointerDown` and `onClick`) to avoid colliding with `useDraggable`'s listeners and the card's own edit `onClick`

## Decisions Made
- Kept the "Abrir WhatsApp" primary action as a raw `<a>` styled via the exported `buttonVariants()` helper rather than composing it inside `<Button render={...}>` — 04-01-SUMMARY.md already flagged that this Base UI-based `Button` primitive's polymorphic `render`/`asChild` composition is unverified in this codebase, and `DialogPrimitive.Close` (a different primitive) using `render={<Button/>}` is not evidence that `Button` itself supports rendering *as* another element. Reusing the established `buttonVariants()`-on-`<a>` pattern avoids introducing an unverified API.
- `stopPropagation` needed on both `onPointerDown` and `onClick` of the send-button's wrapper `div` in `pipeline-lead-card.tsx` — `onPointerDown` alone stops `@dnd-kit`'s `useDraggable` listeners (spread on the card wrapper) from initiating a drag, but the card's own `onClick={onClick}` (edit-trigger) is a separate React synthetic event that also needed its own `stopPropagation` to avoid opening `LeadFormDialog` when the admin only meant to open the WhatsApp preview.
- `WhatsAppPreviewDialog` is instantiated once per page (not once per lead/item) and driven by a `PreviewState` discriminated union; state reset on lead-switch is handled by an explicit `useEffect` keyed on `[open, lead?.id]` rather than relying on component remount — matches the `DialogState`/single-instance pattern already used for `LeadFormDialog` in both `followup-dashboard.tsx` and `pipeline-board.tsx`.

## Deviations from Plan

None - plan executed exactly as written. All three tasks followed the plan's `<action>` steps and `04-PATTERNS.md` analogs directly (`motivo-perda-dialog.tsx` for the Dialog shell, `lead-form-dialog.tsx` lines 191-213 for the Select-via-Controller-free-state pattern, `subnicho-manager.tsx`'s `h-9 w-9` icon-button precedent for `WhatsAppSendButton`).

## Issues Encountered
- `npm run build` OOM'd mid-run on its first attempt (`FATAL ERROR: Zone Allocation failed - process out of memory`, worker exited with code 134) on this 4GB-RAM host — consistent with the known constraint already documented in `04-01-SUMMARY.md` and project memory. Unlike the 04-01 precedent (where the build completed despite a transient OOM log line), this run's TypeScript-checking worker crashed before producing the route table. Retried with `NODE_OPTIONS="--max-old-space-size=3072" npm run build`, which completed cleanly (`✓ Compiled successfully`, `Finished TypeScript`, all 7 routes including `/` and `/pipeline` listed as prerendered static content). `npx tsc --noEmit` (run separately, without the memory-constrained Next.js build pipeline) was clean on both attempts, confirming the OOM was a build-worker memory issue, not a type error.
- `<human-check>` browser click-throughs for Task 2 (`/`: button per follow-up, preview opens with follow-up pre-selected, textarea edit changes the link, disabled state for invalid phone, item click still opens edit) and Task 3 (`/pipeline`: button per card, preview opens without starting drag/edit, drag still works, disabled state for invalid phone) were **NOT run** — no browser access in this headless executor, consistent with the caveat flagged in every prior phase's summaries (01-02, 01-03, 03-*, 04-01, 04-02). Substituted with `tsc --noEmit` + `npm run build` + the automated `renderTemplate`/`buildWaLink` encoding test + grep checks confirming `rel="noopener noreferrer"`, `normalizePhone`, `buildWaLink`, and `stopPropagation` are present at the required call sites. A real `npm run dev` click-through of both surfaces is still recommended before considering the WhatsApp send flow polished.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/lib/whatsapp.ts` (`renderTemplate`/`buildWaLink`) and `WhatsAppPreviewDialog`'s `pickTemplate()` default-selection logic are both directly reusable by 04-04's auto-trigger (WA-04) — the auto-open-after-create-lead flow can reuse the same dialog with `defaultTipo="primeiro_contato"` and a different `open`-source (create-lead success instead of a button click).
- Both required surfaces (dashboard item + pipeline card) now expose the inline WhatsApp button per D-14; WA-05 requirement fully satisfied at the UI level.
- No blockers identified for 04-04.

---
*Phase: 04-follow-up-dashboard-whatsapp-outreach*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/lib/whatsapp.ts
- FOUND: src/components/whatsapp-send-button.tsx
- FOUND: src/components/whatsapp-preview-dialog.tsx
- FOUND: src/app/page.tsx
- FOUND: src/components/followup-dashboard.tsx
- FOUND: src/app/pipeline/page.tsx
- FOUND: src/components/pipeline-board.tsx
- FOUND: src/components/pipeline-lead-card.tsx
- FOUND: commit 9ed8750
- FOUND: commit 56c0b3f
- FOUND: commit 9b4ce52
