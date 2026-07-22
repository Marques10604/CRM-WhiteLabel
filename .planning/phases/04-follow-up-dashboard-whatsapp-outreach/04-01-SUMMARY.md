---
phase: 04-follow-up-dashboard-whatsapp-outreach
plan: 01
subsystem: ui
tags: [nextjs, server-components, drizzle-orm, date-fns, dashboard]

# Dependency graph
requires:
  - phase: 03-sales-pipeline-funnel-view
    provides: EtapaBadge component, LeadFormDialog with DialogState pattern, stage enum (novo/contatado/negociacao/fechado/perdido)
provides:
  - Follow-up dashboard at `/` grouped by urgency (Vencidos/Hoje/Próximos 7 dias)
  - `src/db/queries.ts` shared query/grouping helpers (getActiveDashboardLeads, groupLeadsByUrgency)
  - `/leads` route hosting the full lead list (moved from `/`)
  - 6-item sidebar nav (Follow-ups/Leads/Pipeline/Templates/Sub-nichos/Lixeira)
affects: [04-02-templates, 04-03-whatsapp-send, 04-04-auto-trigger]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared query helpers extracted to src/db/queries.ts instead of inline Promise.all in each route (avoids scope divergence between active-lead queries)"
    - "Pure grouping function (groupLeadsByUrgency) with injectable `now` param, computed server-side, arrays passed as plain props to client component"

key-files:
  created:
    - src/app/leads/page.tsx
    - src/db/queries.ts
    - src/components/followup-dashboard.tsx
  modified:
    - src/app/page.tsx
    - src/components/app-sidebar.tsx

key-decisions:
  - "Dashboard scope excludes fechado/perdido leads via notInArray(leads.stage, [...]) centralized in getActiveDashboardLeads() to avoid duplicating the exclusion list in future queries (D-04)"
  - "Empty urgency sections are omitted entirely (no header/body) rather than showing a per-section empty message, matching 04-UI-SPEC copywriting contract"
  - "'Novo lead' button on dashboard opens LeadFormDialog in create mode locally (DialogState union) instead of navigating to /leads, per D-03 — this is the surface 04-04's auto-trigger (WA-04) will hook into"
  - "'Ver todos os leads' link styled via exported buttonVariants({variant:'outline'}) instead of Button asChild/render prop, since Base UI's Button primitive precedent for polymorphic Link composition doesn't exist elsewhere in the codebase"

patterns-established:
  - "Urgency section shape: { key, label, leads, headerBg, headerText, dateClassName } array filtered by leads.length > 0 before render"

requirements-completed: [REMIND-01]

# Metrics
duration: ~45min (Task 2 portion of a resumed session; Task 1 committed in a prior session)
completed: 2026-07-21
---

# Phase 04 Plan 01: Follow-up Dashboard Foundation Summary

**Dashboard de follow-ups em `/` agrupado por urgência (Vencidos/Hoje/Próximos 7 dias) via query pura testável, substituindo a lista de leads como tela inicial (lista movida para `/leads`).**

## Performance

- **Duration:** Task 1 executed in a prior session (committed `db87beb`); Task 2 executed in this resumed session (~45 min including verification)
- **Started:** 2026-07-21 (Task 1); resumed same day for Task 2
- **Completed:** 2026-07-21T22:37:33-03:00
- **Tasks:** 2/2 completed
- **Files modified:** 5 total across both tasks (`src/app/leads/page.tsx`, `src/db/queries.ts`, `src/components/app-sidebar.tsx` in Task 1; `src/app/page.tsx`, `src/components/followup-dashboard.tsx` in Task 2)

## Accomplishments
- `/` now renders a follow-ups dashboard grouped by urgency by default — no filter needed to see what's overdue (REMIND-01, core value of the project)
- Urgency grouping logic (`groupLeadsByUrgency`) is a pure, independently-testable function, verified against ontem/hoje/+3d/+8d boundary cases
- Full lead list preserved with zero behavior change at `/leads`
- Sidebar restructured to 6 items with "Follow-ups" as the new home

## Task Commits

Each task was committed atomically:

1. **Task 1: Roteamento + navegação + camada de query do dashboard** - `db87beb` (feat) — committed in a prior session, verified (not redone) at the start of this session
2. **Task 2: Página dashboard + componente FollowupDashboard** - `e486690` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/db/queries.ts` - `getActiveDashboardLeads()` (excludes soft-deleted + fechado/perdido) and pure `groupLeadsByUrgency()` (Task 1)
- `src/app/leads/page.tsx` - Full lead list, moved verbatim from old `/` (Task 1)
- `src/components/app-sidebar.tsx` - `NAV_ITEMS` restructured to 6 entries (Task 1)
- `src/app/page.tsx` - Rewritten as dashboard Server Component: fetches active leads, groups by urgency, renders `<FollowupDashboard>` (Task 2)
- `src/components/followup-dashboard.tsx` - New client component: 3 urgency sections (empty ones omitted), item click reopens `LeadFormDialog` in edit mode, "Novo lead" opens it in create mode locally, global empty state "Tudo em dia!" with two CTAs (Task 2)

## Decisions Made
- Reused `buttonVariants` (exported from `src/components/ui/button.tsx`) to style the `<Link href="/leads">` "Ver todos os leads" CTA as an outline button, since no existing polymorphic Button+Link composition pattern exists in this Base UI-based component library — avoids guessing at an unverified `asChild`/`render` API.
- Kept urgency-section color mapping inline as a `sections` array (`headerBg`/`headerText`/`dateClassName` per section) rather than extracting a separate config module — matches the scale of `pipeline-column.tsx`'s single-purpose header pattern, no over-abstraction for 3 fixed sections.

## Deviations from Plan

None - plan executed exactly as written. Task 1 was pre-existing (verified against plan's acceptance criteria: `/leads` exists with `LeadTable`+`isNull(leads.deletedAt)`, `queries.ts` exports both functions with `notInArray`, `NAV_ITEMS` has exactly 6 entries in the specified order). Task 2 followed the plan's action steps and PATTERNS.md analogs directly (Server Component shape from `pipeline/page.tsx`, grouped-section shape from `pipeline-column.tsx`, empty-state shape from `lead-table.tsx`, `DialogState` union from `lead-table.tsx`/`pipeline-board.tsx`).

## Issues Encountered
- The plan's automated verification command for `groupLeadsByUrgency` (`node --experimental-strip-types -e "import('./src/db/queries.ts')..."`) failed with `ERR_MODULE_NOT_FOUND` because Node's native ESM loader cannot resolve the `@/` path alias used inside `queries.ts` (it imports `@/db/client`). Per the plan's own documented fallback (`|| node -e "console.log('strip-types indisponível...')"`), substituted with an equivalent `npx tsx` script (tsx is already a project dependency and resolves `tsconfig.json` path aliases) placed temporarily inside the project root, run, and deleted — same substitution pattern used in prior 01-02/01-03 plans for headless verification without browser access. Result: `OK grouping` — all 4 boundary cases (ontem→vencidos, hoje→hoje, +3d→proximos7Dias, +8d→nenhum grupo) passed.
- `npm run build` printed a `FATAL ERROR: Zone Allocation failed - process out of memory` line mid-run from a Turbopack worker process (this is the known 4GB-RAM-host memory constraint noted elsewhere in project history — see STATE.md's `shadcn add popover` OOM precedent), but the build still completed successfully afterward (`✓ Compiled successfully`, all 6 routes including `/` and `/leads` listed as prerendered static content). Treated as a transient worker crash, not a build failure, since the final build output and route table were produced correctly.
- `<human-check>` browser click-through (confirm 3 sections render, item click opens edit modal, empty state shows "Tudo em dia!", "Novo lead" opens create modal without navigating) was NOT run — no browser access in this headless executor, consistent with the caveat already flagged in every prior phase's summaries (01-02, 01-03, 03-*). Substituted with `tsc --noEmit` + `npm run build` + the grouping unit test above. A real `npm run dev` click-through is still recommended before considering the dashboard UI polished.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `getActiveDashboardLeads()`/`groupLeadsByUrgency()` in `src/db/queries.ts` and the `FollowupDashboard`'s local `DialogState` create-mode surface are both explicitly designed to be reused by 04-04's auto-trigger (WA-04), per the plan's interface contract.
- 04-02 (Templates) can add its own nav-linked route (`/templates`) without further changes to `app-sidebar.tsx` — already present in `NAV_ITEMS`.
- 04-03 (WhatsApp send button) will modify `followup-dashboard.tsx` again to add an inline "Enviar WhatsApp" button per item — no send-button code was added in this plan (explicitly out of scope per Task 2's action notes).
- No blockers identified for downstream plans in this phase.

---
*Phase: 04-follow-up-dashboard-whatsapp-outreach*
*Completed: 2026-07-21*

## Self-Check: PASSED

- FOUND: src/db/queries.ts
- FOUND: src/app/leads/page.tsx
- FOUND: src/components/followup-dashboard.tsx
- FOUND: src/app/page.tsx
- FOUND: commit db87beb
- FOUND: commit e486690
