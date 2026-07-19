# Project Research Summary

**Project:** crm-leads (solo-admin CRM / lead tracker)
**Domain:** Solo-admin CRM for health-niche leads — CSV bulk import, sales pipeline (kanban), follow-up reminders, WhatsApp click-to-chat templates
**Researched:** 2026-07-19
**Confidence:** HIGH

## Executive Summary

This is a browser-based, single-admin CRM replacing a Google Sheets workflow for tracking health-niche leads. Experts building this class of tool (solo-user "mini-CRM," no multi-tenant auth, no background infrastructure) converge on a simple, well-understood shape: a full-stack Next.js app with Server Actions (no separate REST API), a real relational database (SQLite/Turso via Drizzle ORM — never localStorage), a thin service layer separating business logic from UI, and purely derived/computed state (overdue follow-ups, funnel counts) rather than stored flags or notification infrastructure. The three named core value props — CSV import to escape re-typing, a visual pipeline (Novo -> Contatado -> Negociacao -> Fechado/Perdido), and one-click WhatsApp outreach via `wa.me` template links — are all well-documented, low-risk patterns with verified, stable technical formats (wa.me URL structure, CSV parse-validate-dedupe-commit pipeline).

The recommended approach is Next.js 16 (App Router) + React 19 + TypeScript 5.9.x + Drizzle ORM + SQLite (local file, or Turso if hosted) + Tailwind/shadcn for UI, with PapaParse for CSV, Zod + react-hook-form for validation, and no auth system beyond an optional simple passcode gate if publicly hosted. Feature scope should center on the MVP defined in FEATURES.md: lead data model, extensible sub-niche field (with governance from day one), CSV import wizard, pipeline view (dropdown stage-change is sufficient for v1), overdue/due-soon dashboard, and WhatsApp template CRUD + link generation — explicitly deferring drag-and-drop, AI-personalized messages, analytics dashboards, and anything resembling multi-user auth or WhatsApp Business API integration.

The key risks are almost entirely data-quality and "silent failure" risks rather than architectural ones: Brazilian Excel-exported CSVs use semicolon delimiters and Windows-1252/BOM encoding that will silently corrupt imports if not handled explicitly; Brazilian phone numbers have inconsistent 9th-digit/country-code formatting that will break `wa.me` links if not normalized at import time; and a reminder system that isn't the literal first thing the admin sees on load defeats the entire point of the tool (recreating the exact "forgotten follow-up" problem it's meant to solve). A secondary, easy-to-miss risk is architectural passivity: because this is the sole system of record once adopted, hard-deletes and import-without-batch-tracking have no recovery path — soft-delete and import-batch tagging must be designed in from the start, not retrofitted after a real data loss.

## Key Findings

### Recommended Stack

Next.js (App Router) with Server Actions is the clear choice over a separate frontend/backend split — there is exactly one consumer of the API (the admin's own browser), so a hand-rolled REST layer is pure overhead. Drizzle ORM over SQLite (local file for pure-local use, or Turso/libSQL if hosted on Vercel) gives transparent, debuggable SQL-shaped code — important since this codebase is AI-agent maintained — and both local and hosted variants share identical schema/query code, so the deployment story can change later without a rewrite. WhatsApp integration requires no library at all: it's a client-side `wa.me` URL built from a normalized phone number and a URL-encoded, variable-substituted message string.

**Core technologies:**
- Next.js 16.2.10 (App Router, Server Actions) — full-stack framework, eliminates a separate API layer for a single-client internal tool
- React 19.2.7 — required peer of Next.js 16, stable Server/Client Component model
- TypeScript 5.9.x — stay off TS 7.0/7.1 until tooling (ESLint, editor integrations) catches up to the new native compiler
- Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 — type-safe, transparent SQL queries and migrations; avoids Prisma's opaque codegen layer
- better-sqlite3 (local) / @libsql/client + Turso (hosted) — zero-config relational store sized correctly for a few thousand leads; same code either way
- PapaParse 5.5.4 — standard browser CSV parser with delimiter-sniffing and streaming support, essential for messy real-world Excel exports
- Zod 4.4.0 + react-hook-form 7.82.0 — Server Action input validation and form handling
- Tailwind CSS 4.4.3 + shadcn/ui — fast, AI-agent-editable admin UI; shadcn components are copied into the repo, not an opaque dependency
- @tanstack/react-table, @dnd-kit (optional kanban drag), date-fns, sonner — supporting libraries for table views, drag-and-drop, date math, and toasts

**Explicitly avoid:** WhatsApp Business API/Twilio (out of scope, adds cost/bureaucracy for zero benefit), Moment.js (legacy), react-beautiful-dnd (archived), full auth providers (NextAuth/Clerk) for a single admin, and building a speculative REST API "for future-proofing."

### Expected Features

**Must have (table stakes) - v1/MVP:**
- Lead data model: name, phone, sub-niche, channel, source, estimated value, notes, follow-up date, stage
- Sub-niche as an extensible field **with a basic admin list from day one** (not pure free-text) — prevents tag-sprawl fragmentation
- CSV import with column mapping, preview, and duplicate detection (by phone/email)
- Pipeline/kanban view (4 fixed stages) with per-column counts; dropdown-based stage change is sufficient for v1
- List view with filter (sub-niche, stage) and sort (follow-up date)
- Follow-up date field + an overdue/due-soon dashboard that is the **default landing view**, not a filter the admin must apply
- WhatsApp template CRUD with `{variable}` substitution + `wa.me` link generation
- Post-import prompt to send the first-contact template (closes the loop between import and outreach)

**Should have (differentiators, v1.x):**
- Inline `wa.me` button on the overdue/due-soon list itself (merge reminder + action)
- Pipeline value roll-up per stage (sum of estimated value)
- Multiple templates per purpose (first contact / follow-up / re-engagement)
- Sub-niche merge/deactivate management
- Template message preview/edit before opening WhatsApp

**Defer (v2+):** Kanban drag-and-drop (dropdown already satisfies the requirement), "days in stage"/stalled-lead indicator, timestamped note history, AI-personalized messages (explicitly deferred in PROJECT.md), any analytics/reporting beyond stage counts + value. **Never build:** multi-user auth/roles, native mobile app, WhatsApp Business API automation, generic multi-tag system, marketing-automation drip sequences.

### Architecture Approach

The system is a thin client UI over a small framework-agnostic service layer (`leadService`, `importService`, `templateService`, `waLinkService`) sitting on a conventional relational schema (`leads`, `subniches`, `templates`, optional `activity_log`). There is no background infrastructure of any kind: "overdue," "due soon," and funnel counts are all derived queries re-run at render/load time, not stored flags or push notifications. Pipeline stages are a plain enum with a small allowed-transitions check — not a generic state-machine engine — while sub-niches and templates are true database tables with CRUD, since those are the pieces the requirements explicitly demand be extensible.

**Major components:**
1. **Lead Service** — CRUD, stage transitions, filters, funnel counts; the single source of truth every other feature depends on
2. **Import Service** — three-step CSV pipeline (parse -> validate/dedupe -> commit as one transaction); isolated so it can be extended without touching pipeline logic
3. **Template Service + waLinkService** — `{variable}` substitution and pure-function `wa.me` URL construction; this seam is where v2 AI-personalized messaging would later plug in
4. **Reminder/Due-Date Query** — read-only derived query against `leads.follow_up_date`/`stage`, no separate reminder table, always consistent with source data

### Critical Pitfalls

1. **Brazilian CSV delimiter/encoding mismatch** — Excel pt-BR exports use `;` delimiters and Windows-1252/BOM encoding, not comma/UTF-8; auto-detect delimiter, normalize encoding, and always show a preview before commit — must be solved in the CSV import phase before anything else is testable with real data.
2. **Broken `wa.me` links from Brazilian phone formatting** — inconsistent 9th-digit, country-code, and leading-zero conventions; build one normalization function (strip non-digits, canonical `55` prefix), unit-test against real-shaped number fixtures, never silently guess.
3. **Un-encoded message text corrupts the WhatsApp draft** — line breaks, accents, emoji, and special characters must go through proper URL-encoding after variable substitution, not string concatenation.
4. **Invisible follow-up reminders defeat the core value prop** — since there's no push/notification channel, overdue/due-today items must be the literal first thing visible on app load, not a filter or a flat "has a date" badge.
5. **The 4-stage pipeline hides "gone cold" leads** — most leads get stuck in "Contatado" with no forcing function to mark them "Perdido"; track last-activity-date independently of stage and surface a stale-lead signal, and make "Perdido" a one-click action.
6. **No safety net for data loss** — once this replaces the spreadsheet, hard deletes and untracked imports are unrecoverable; build soft-delete and import-batch tagging in from the start.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Foundation - Data Model and Core CRUD
**Rationale:** Every other feature (CSV import, pipeline, templates, reminders) depends on the lead/sub-niche/template schema existing first — this is a strict prerequisite, not parallel work (per FEATURES.md dependency graph).
**Delivers:** Next.js + Drizzle + SQLite scaffold; `leads`, `subniches`, `templates` tables and migrations; lead list view with manual create/edit; sub-niche admin list (add/rename) shipped alongside the field, not deferred.
**Addresses:** Lead data model, sub-niche extensible field + basic admin (FEATURES.md P1 items).
**Avoids:** Anti-Pattern 2 (hardcoding sub-niches as constants) and Pitfall 6's near-duplicate sub-niche fragmentation, by building governance in from day one.

### Phase 2: CSV Import Pipeline
**Rationale:** This is the actual pain point driving the migration off Sheets and the highest-risk feature technically (Pitfall 1 delimiter/encoding, Pitfall 8 data-loss safety) — best tackled early with real fixture data before other features assume clean data exists.
**Delivers:** Three-step import wizard (upload -> map/preview -> confirm/commit) with delimiter/encoding auto-detection, phone-number normalization at import time, duplicate detection by phone/email, and import-batch tagging for reversibility.
**Uses:** PapaParse, Zod validation, Drizzle transactional insert.
**Avoids:** Pitfall 1 (delimiter/encoding), Pitfall 6 (missing name fields), Pitfall 8 (no recovery path) — test fixtures must include a real Excel pt-BR export, not a hand-typed clean CSV.

### Phase 3: Pipeline / Kanban View
**Rationale:** Depends on the lead data model (Phase 1) and benefits from having real imported data (Phase 2) to validate against; the funnel view is one of the two named core value props.
**Delivers:** Kanban board (4 fixed stages, dropdown-based stage change is sufficient for v1), per-column counts, a "stale lead" / no-recent-activity signal alongside the funnel (not deferred to later), one-click move-to-"Perdido."
**Implements:** Lead Service stage-transition logic (plain enum, not a state-machine engine per Anti-Pattern 1).
**Avoids:** Pitfall 5 (pipeline hiding cold leads) — build the stale signal in this phase, not as a v2 add-on.

### Phase 4: Follow-Up Reminders and Dashboard
**Rationale:** Depends on the follow-up date field existing (Phase 1) and is the second named core value prop; research strongly flags this as a design-quality risk, not just a data field, so it deserves a dedicated phase rather than being bundled as "just a column."
**Delivers:** Derived overdue/due-today/due-soon query set as the default landing/home view (not a filter the admin must apply), with distinct visual urgency treatment.
**Avoids:** Pitfall 4 (invisible reminders) — verify persistence across browser close/reopen and confirm this view, not a generic lead list, is what the admin sees first.

### Phase 5: WhatsApp Templates and wa.me Link Generation
**Rationale:** Depends on the full lead data model (variables to substitute) and benefits from reminders (Phase 4) and pipeline (Phase 3) existing so template links can be surfaced inline in those views, per FEATURES.md's dependency chain.
**Delivers:** Template CRUD with `{variable}` placeholders, phone/message normalization + URL-encoding, "send first contact" prompt post-import (tie-in to Phase 2), inline wa.me buttons in the reminder list (tie-in to Phase 4) and lead detail view.
**Uses:** waLinkService pure function (STACK.md's client-side `buildWhatsAppLink` pattern).
**Avoids:** Pitfall 2 (phone format breakage), Pitfall 3 (encoding breakage) — unit test against fixture numbers/messages with accents, emoji, line breaks before considering this phase done.

### Phase Ordering Rationale

- Data model must exist before CSV import (column mapping is meaningless without target fields) and before pipeline/reminders/templates (all read from the same lead record) — this drives Phase 1 first, confirmed by FEATURES.md's explicit dependency graph.
- CSV import is placed early (Phase 2) rather than last because it is both the primary migration driver and the highest-risk technical surface (delimiter/encoding/dedup) — better to surface and fix these risks with real data before building views on top of assumed-clean data.
- Pipeline and reminders (Phases 3-4) are the two named core value props and are independent of each other technically, but reminders is placed after pipeline since the "stale lead" signal in Phase 3 reuses the same derived-query mechanism reminders will need in Phase 4 — building it once, reusing it, per ARCHITECTURE.md's Pattern 3.
- WhatsApp templates go last (Phase 5) because the highest-value version of this feature is contextual (inline buttons in the pipeline and reminder views) — building the surfaces it plugs into first avoids rework.
- Pitfall 7 (scope creep into auth/mobile/API-sending) and Pitfall 8 (data-loss safety) are cross-cutting and should be a standing checklist item across all phases, not a dedicated phase — every phase review should confirm no `users`/`roles`/`tenant_id` concept, no mobile-specific work, and no hard-delete-without-recovery has crept in.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (CSV Import):** Needs a `--research-phase` pass specifically on Brazilian phone-number normalization edge cases and Excel pt-BR encoding fixtures — the general pattern is well-documented, but the specific fixture set (real-shaped numbers/CSVs) should be validated against actual sample data from the cowork partner if available.
- **Phase 5 (WhatsApp Templates):** Confirm current `wa.me` URL length/behavior limits across WhatsApp Web/Desktop/mobile handoff before finalizing template length constraints — sources note "no hard documented limit" but flag it as a smell worth re-checking.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard Next.js + Drizzle + SQLite scaffold, extensively documented, HIGH confidence.
- **Phase 3 (Pipeline):** Kanban/pipeline patterns are well-established across CRM research; dropdown-based stage change is a simple CRUD operation.
- **Phase 4 (Reminders):** Derived-query reminder pattern is simple and well-documented; the risk here is UX/design discipline, not technical complexity.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core versions verified live against npm registry (2026-07-19); only TypeScript 7.x tooling-maturity timing is a soft judgment call, clearly flagged with a safe fallback (stay on 5.9.x) |
| Features | MEDIUM-HIGH | Cross-verified across multiple independent CRM vendors, CSV-import tooling vendors, and WhatsApp click-to-chat documentation; no single-source claims used for core recommendations |
| Architecture | HIGH | Patterns are well-established for this app class; wa.me link format and CSV pipeline conventions verified against current external sources; some small-app architecture conventions are training-data-derived (flagged MEDIUM within the doc) but low-risk given domain simplicity |
| Pitfalls | MEDIUM-HIGH | wa.me formatting and CSV encoding issues verified against current external sources (GitHub issues, telecom docs, Microsoft community); pipeline/UX/scope-creep pitfalls verified across multiple independent sources; some domain-specific judgment applied for this project's unusual shape (single-user, no API, growing taxonomy) |

**Overall confidence:** HIGH

### Gaps to Address

- **Real cowork CSV sample not yet available:** All CSV-format risk mitigations (delimiter, encoding, phone formats) are based on well-documented general Brazilian/Excel patterns, not an actual sample file from the project's specific data source — validate assumptions against a real file as early as possible in Phase 2, and adjust the import wizard's auto-detection/preview if the actual data shape differs.
- **Hosting decision (local-only vs. Vercel+Turso) not yet finalized:** STACK.md presents both as viable with identical Drizzle code; this should be an explicit early decision (likely during Phase 1 setup) since it affects whether a passcode gate is needed, not a blocker to starting.
- **TypeScript 7.x migration timing:** Recommendation is to stay on 5.9.x for now and revisit 7.1 once stable — no action needed now, but worth a periodic check during longer-running phases since it's a "drop-in bump," not an architecture change.

## Sources

### Primary (HIGH confidence)
- npm registry live queries (2026-07-19) for all core package versions (next, react, typescript, drizzle-orm, drizzle-kit, better-sqlite3, papaparse, zod, react-hook-form, tailwindcss, shadcn, etc.)
- devblogs.microsoft.com/typescript/announcing-typescript-7-0 — TypeScript 7.0 GA and tooling-gap confirmation
- WhatsApp `wa.me` click-to-chat URL format — cross-verified across Qualimero, Whatsform, SendApp, Gowalink, Quadlayers guides, matching WhatsApp's own documented convention
- GitHub: Brazilian phone number 9th-digit WhatsApp inconsistency (openclaw/openclaw#20187); Gupshup support article on Brazil/Mexico number normalization
- Microsoft Community Hub — Excel CSV semicolon delimiter export behavior

### Secondary (MEDIUM confidence)
- OnePageCRM, Systeme.io, monday.com, Capsule CRM — pipeline/kanban and follow-up reminder UI patterns across CRM vendors
- CSVBox, ImportCSV, Dromo, Flatfile — CSV import UX (map -> preview -> validate -> commit) pattern, consistent across specialized import-tooling vendors
- AccessAlly — CRM tag-sprawl failure pattern; Supportbench — taxonomy design categories vs tags
- RxDB — localStorage/IndexedDB limits article — supports anti-pattern against localStorage as primary store
- Leadfeeder — sales pipeline mistakes; Prospeo — CRM funnel stage benchmarks

### Tertiary (LOW confidence)
- Turso pricing/free-tier limits (turso.tech/pricing) — pricing pages change over time, verify at signup
- Training-data-derived small-app architecture conventions (service-layer separation, derived-state reminders) — not independently web-verified but low-risk given domain simplicity

---
*Research completed: 2026-07-19*
*Ready for roadmap: yes*
