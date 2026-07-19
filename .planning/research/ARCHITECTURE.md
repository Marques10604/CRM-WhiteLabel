# Architecture Research

**Domain:** Solo-admin CRM / lead-tracker web app (health-niche leads, CSV import, sales pipeline, WhatsApp templates)
**Researched:** 2026-07-19
**Confidence:** HIGH (patterns are well-established for this class of app; verified wa.me link format and CSV pipeline conventions against current sources)

## Standard Architecture

Solo-user, browser-only CRMs of this shape (see Airtable-style personal trackers, "mini-CRM" side projects, Notion-replacement tools) converge on the same shape regardless of framework choice: a **thin client-side UI**, a **conventional relational data layer** (even for one user — because the value is structured querying/filtering, not documents), and **zero background infrastructure** (no queues, no cron, no push notifications, no multi-tenant auth). Almost everything that looks like "real-time" (overdue follow-up highlighting, funnel counts) is actually just a query re-run on page load/navigation — there is no need for scheduled jobs because there's only one user looking at one screen when they choose to look at it.

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (UI Layer)                          │
├───────────────┬───────────────┬───────────────┬─────────────────────┤
│  Pipeline/     │  Lead Detail  │  CSV Import   │  Template Manager   │
│  Kanban Board  │  Panel        │  Wizard       │  + wa.me Link Gen   │
└───────┬────────┴───────┬───────┴───────┬───────┴──────────┬──────────┘
        │                │               │                  │
        ▼                ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPLICATION / SERVICE LAYER                     │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────────┐    │
│  │ Lead Service   │ │ Import Service  │ │ Template/Link Engine  │    │
│  │ (CRUD, stage   │ │ (parse→validate │ │ ({var} substitution,  │    │
│  │  transitions,  │ │  →dedupe→map    │ │  wa.me URL builder)   │    │
│  │  filters)      │ │  →insert)       │ │                       │    │
│  └───────┬────────┘ └────────┬───────┘ └───────────┬───────────┘    │
│          │                   │                     │                │
│  ┌───────┴───────────────────┴─────────────────────┴───────────┐   │
│  │              Reminder/Due-Date Query (derived, not stored)   │   │
│  └───────────────────────────────┬───────────────────────────────┘   │
├───────────────────────────────────┴───────────────────────────────────┤
│                          DATA LAYER (single store)                    │
│  ┌──────────┐   ┌────────────┐   ┌───────────┐   ┌────────────────┐  │
│  │  leads    │   │ subniches  │   │ templates │   │ lead_activity  │  │
│  │  (table)  │   │  (table)   │   │  (table)  │   │ (log, table)   │  │
│  └──────────┘   └────────────┘   └───────────┘   └────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Pipeline/Kanban Board | Renders leads grouped by stage; drag-or-click stage transitions; funnel counts | Client component reading from Lead Service; stage is a plain enum column, not a separate state machine engine |
| Lead Detail Panel | Shows/edits one lead: notes, follow-up date, channel, source, value, sub-niche | Form bound to Lead Service; single-record CRUD |
| CSV Import Wizard | Upload → preview → column mapping → validate → dedupe → commit | Client-side parse (Papa Parse or equivalent) + server-side validation/insert if a backend exists; three-step wizard is the norm, not a single "upload and pray" action |
| Template Manager + Link Engine | CRUD for message templates; substitutes `{nome}`, `{subnicho}` etc.; builds `https://wa.me/<phone>?text=<url-encoded message>` | Pure function: `(template, lead) => wa.me URL`; no external API call, purely client-side string building |
| Lead Service | Business rules: stage transitions, filtering by sub-niche/stage/search, computing funnel counts | Backend service module or, if fully client-side, a data-access module wrapping the local DB |
| Import Service | Parsing, header mapping, per-row validation, duplicate detection (by phone/email), transactional insert | Same layer as Lead Service; CSV-specific logic isolated so it can be replaced/extended without touching pipeline logic |
| Reminder/Due-Date Query | "Overdue" and "due soon" are computed by comparing `follow_up_date` to today at render time — never a stored/notified state | Derived query (`WHERE follow_up_date <= today`), re-evaluated every page load; sorted to the top or badge-highlighted |
| Data Layer | Single source of truth: leads, sub-niches, templates, and (optionally) an activity/history log | SQLite (file-based) or Postgres table set; sub-niches and templates are their own tables (not hardcoded enums) so admin can extend them freely |

## Recommended Project Structure

```
src/
├── db/                       # Data layer
│   ├── schema.ts             # Table definitions: leads, subniches, templates, activity_log
│   ├── migrations/           # Versioned schema changes (even solo apps benefit from this)
│   └── client.ts             # DB connection/instance (SQLite file or Postgres pool)
├── services/                 # Application/service layer — framework-agnostic business logic
│   ├── leadService.ts        # CRUD, stage transitions, filters, funnel counts
│   ├── importService.ts      # CSV parse → validate → dedupe → insert pipeline
│   ├── templateService.ts    # Template CRUD + {variable} substitution
│   └── waLinkService.ts      # Pure function: template + lead → wa.me URL
├── features/ (or app/ routes) # UI layer, grouped by feature not by type
│   ├── pipeline/              # Kanban board, stage columns, funnel summary
│   ├── leads/                 # Lead list/detail/edit forms
│   ├── import/                # CSV upload wizard (steps: upload, map, preview, confirm)
│   ├── templates/              # Template CRUD screens + "send via WhatsApp" button
│   └── subniches/               # Simple CRUD for the extensible sub-niche list
├── lib/
│   ├── csv.ts                 # CSV parsing wrapper (e.g. Papa Parse config)
│   └── dates.ts                # Overdue/due-soon calculation helpers
└── shared/
    └── types.ts                # Lead, Subniche, Template, PipelineStage shared types
```

### Structure Rationale

- **`db/` isolated from `services/`:** even though there's one user, keeping schema/migrations separate from business logic means swapping SQLite for Postgres later (e.g., if deployed to a host without persistent disk) touches only `db/`, not feature code.
- **`services/` as a framework-agnostic layer:** this is the single most important boundary in a small app. If UI framework changes (or a v2 rewrite happens), the service layer — which encodes "what a lead is" and "how the pipeline works" — survives untouched.
- **`features/` organized by domain, not by technical type:** at this scale, grouping by feature (pipeline, leads, import, templates) rather than by type (all components/, all hooks/) keeps related UI, forms, and validation together and matches how a solo developer will actually navigate the codebase over time.
- **`waLinkService.ts` isolated as a pure function:** this is the seam where v2 AI-personalized messaging plugs in later — it can be swapped for an async function that calls an LLM instead of doing static substitution, without touching the template CRUD or the pipeline UI at all.

## Architectural Patterns

### Pattern 1: Service Layer / Data-Access Layer separation from UI

**What:** All reads/writes to leads, templates, and sub-niches go through a small set of service functions (`leadService.moveStage()`, `leadService.listByFilter()`, etc.) rather than components querying the database directly.
**When to use:** Always, even for a solo app — it's the cheapest insurance against a UI framework rewrite and the thing that makes CSV import, pipeline view, and reminders all share one consistent notion of "a lead."
**Trade-offs:** Slightly more boilerplate than direct queries in components; pays off the moment you add a second view (e.g., a reporting/analytics screen) that needs the same filters.

**Example:**
```typescript
// services/leadService.ts
export function moveStage(leadId: string, toStage: PipelineStage) {
  db.update('leads').set({ stage: toStage, updated_at: now() }).where({ id: leadId });
  logActivity(leadId, `stage_changed:${toStage}`);
}

export function listOverdue(today: Date) {
  return db.select('leads').where('follow_up_date', '<=', today).where('stage', 'not in', ['Fechado', 'Perdido']);
}
```

### Pattern 2: Three-step CSV import pipeline (parse → validate/dedupe → commit)

**What:** CSV import is never a single blind insert. Standard shape: (1) parse into rows, (2) map columns + validate types + detect duplicates against existing leads (typically by phone number, since that's the WhatsApp contact key), (3) show a preview/summary and commit as one transaction.
**When to use:** Any bulk-import feature, including this project's "leads arrive as a CSV batch from a partner cowork."
**Trade-offs:** A single-step "upload and insert" is faster to build but produces silent duplicate leads and unrecoverable bad rows — for a CRM whose whole value proposition is "never lose track of a lead again," the extra validate/preview step is worth the build cost.

**Example:**
```typescript
// services/importService.ts
export async function importCsv(file: File) {
  const rows = await parseCsv(file);                 // 1. parse
  const { valid, duplicates, errors } = validateAndDedupe(rows, existingLeads); // 2. validate/dedupe
  return { preview: valid, duplicates, errors };       // shown to admin before commit
}

export function commitImport(rows: ValidLeadRow[]) {
  db.transaction(() => rows.forEach(r => leadService.create(r))); // 3. commit
}
```

### Pattern 3: Derived reminders, not a notification system

**What:** "Overdue" / "due today" / "due soon" states are computed on every render by comparing `follow_up_date` to the current date — there is no stored `is_overdue` flag, no scheduled job, no push/email notification.
**When to use:** Any single-user, browser-only tool where the user checks the app manually rather than needing to be paged. This matches the project constraint (no mobile, no multi-user).
**Trade-offs:** Won't alert the admin if they don't open the app (acceptable per stated constraints — this replaces a spreadsheet, not a paging system). If proactive alerts are ever wanted, that's an explicit, isolated future addition (e.g., a daily email digest), not a core architectural requirement now.

## Data Flow

### CSV Import Flow

```
Admin selects CSV file
    ↓
[Import Wizard] → parseCsv() → raw rows
    ↓
[Import Service] → validate rows (required fields, phone format) + dedupe (match existing leads by phone)
    ↓
[Import Wizard] shows preview: N new, M duplicates, K errors
    ↓
Admin confirms → commitImport() → transactional insert into `leads` table
    ↓
New leads appear on Pipeline Board at stage "Novo"
    ↓
(Optional, per requirement) Wizard offers to open wa.me link with first-contact template for each/first new lead
```

### Pipeline / Kanban Flow

```
[Pipeline Board] loads → leadService.listByFilter(subnicho?, search?) → grouped by stage
    ↓
Admin drags/clicks lead to new stage → leadService.moveStage(id, newStage)
    ↓
DB updated + activity_log entry appended
    ↓
Board re-queries → funnel counts recompute
```

### Template + wa.me Link Flow

```
Admin opens lead detail → selects template (e.g., "Primeiro contato")
    ↓
[Template Service] substitutes {nome}, {subnicho}, etc. from lead record into template string
    ↓
[waLinkService] builds https://wa.me/<phone digits>?text=<url-encoded message>
    ↓
Admin clicks generated link → opens WhatsApp Web/app with prefilled message → admin reviews and sends manually
```

### Reminder Flow

```
Any page load involving lead list → query: follow_up_date <= today AND stage not in (Fechado, Perdido)
    ↓
Results rendered with visual badge/highlight (e.g., red for overdue, amber for due today)
    ↓
No background process — recomputed fresh every time the admin opens the app
```

## Scaling Considerations

This app will not scale in the traditional sense (one user, a few thousand leads at most over years). The "scaling" axis that actually matters is **data volume per import batch** and **years of accumulated leads**, not concurrent users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Hundreds–low thousands of leads (realistic lifetime volume) | Simple relational table, no indexing beyond primary key + an index on `follow_up_date` and `stage` for the board/reminder queries. Any mainstream stack (SQLite file, or a small managed Postgres) handles this instantly. |
| CSV batches of 1k–10k rows | Client-side parsing is fine; do validation/dedupe in-memory before a single transactional insert rather than row-by-row inserts (avoids partial-import states and is dramatically faster). |
| Multi-year archive of "Perdido" leads | Add a simple archive/filter (default view excludes closed-out leads older than N months) rather than any infrastructure change — this is a query/UI concern, not an architectural one. |

### Scaling Priorities

1. **First (and likely only) bottleneck:** CSV imports with malformed rows (missing phone numbers, inconsistent sub-niche names) causing bad data — mitigated by the validate/preview step in Pattern 2, not by infrastructure.
2. **Second, low-probability bottleneck:** Growing sub-niche list creating pipeline/filter UI clutter over time — mitigated by treating sub-niches as a managed table with archive/deactivate capability, not a hard delete-only list.

## Anti-Patterns

### Anti-Pattern 1: Building a generic workflow/state-machine engine for the pipeline

**What people do:** Over-engineer the Novo → Contatado → Negociação → Fechado/Perdido pipeline as a configurable state-machine library with transition guards, hooks, and event emitters.
**Why it's wrong:** For four fixed stages with no complex branching logic, this adds abstraction with no payoff — it slows down the very features (drag lead to next stage) that should be one-line updates.
**Do this instead:** Model `stage` as a plain enum column with a small allowed-transitions list validated in `leadService.moveStage()`. If a fifth stage is ever needed, it's a one-line enum change.

### Anti-Pattern 2: Treating sub-niches (or pipeline stages, or templates) as hardcoded constants

**What people do:** Bake `['nutricionista', 'terapeuta', ...]` into an enum/constant file because "it's just a small list."
**Why it's wrong:** The project explicitly requires the sub-niche list to be admin-extensible and growing — hardcoding it means every new sub-niche requires a code deploy, defeating the stated requirement.
**Do this instead:** Sub-niches (and, similarly, message templates) live in their own table with simple CRUD UI. Pipeline stages, by contrast, genuinely are fixed per the requirements (Novo → Contatado → Negociação → Fechado/Perdido) and are safe to keep as a small enum — don't over-generalize everything symmetrically.

### Anti-Pattern 3: Wiring up push notifications / background jobs for follow-up reminders

**What people do:** Assume "reminder" implies notification infrastructure (cron jobs, email/push services, service workers).
**Why it's wrong:** The project is single-user, browser-only, no mobile — the admin already has to open the app to work leads. Notification infrastructure here is unused complexity that also drags in scheduling, delivery reliability, and (for email) a transactional email provider dependency.
**Do this instead:** Compute overdue/due-soon status as a derived query at render time (Pattern 3). If proactive alerting becomes a real need later, it's a small, isolated addition (e.g., a scheduled email digest), never a prerequisite for the reminder feature itself.

### Anti-Pattern 4: LocalStorage/IndexedDB as the primary data store for structured lead data

**What people do:** Reach for `localStorage` because "it's just one user, no need for a real database."
**Why it's wrong:** localStorage is a ~5MB string-only key-value store with no query capability — every filter (by sub-niche, by stage, by overdue date) would require loading and scanning the entire dataset in JS. It also has no schema/migration story as the data model evolves (e.g., adding `estimated_value` later).
**Do this instead:** Use a real relational store (SQLite file for a fully local/self-hosted setup, or a small managed Postgres if deployed to a platform without persistent disk) even though there's only one user — the value here is structured querying and long-term data integrity, not concurrency.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| WhatsApp (wa.me) | Client-side URL construction only: `https://wa.me/<international phone, digits only>?text=<url-encoded message>` opened via `window.open()` / `<a href>` | No API key, no account setup, no server round-trip. Verified current/stable format per WhatsApp's own click-to-chat convention. Must strip non-digit characters and include country code in phone before building the link. |
| CSV source (partner cowork) | One-way, manual file upload — no live integration, no webhook, no scheduled fetch | Treat it as an arbitrary user-uploaded file; do not assume a fixed column order/naming — column mapping step in the import wizard handles variance. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI (Pipeline/Lead/Import/Template screens) ↔ Service layer | Direct function calls (same process, no network hop needed for a solo local-first or simple full-stack app) | Keep this a clean function-call boundary even if UI and services live in the same process — it's what allows a later framework swap without rewriting business logic. |
| Import Service ↔ Lead Service | Import Service calls `leadService.create()` per validated row inside one transaction | Avoids duplicating "what is a valid lead" validation logic in two places. |
| Template Service ↔ waLinkService | Template Service resolves `{variable}` substitution and hands the final string to waLinkService, which only knows how to build a wa.me URL | This seam is intentionally where v2 AI-personalized messaging would be inserted later — swap the substitution step for an LLM call without touching link-building or pipeline code. |
| Reminder Query ↔ Lead table | Read-only query against `leads.follow_up_date` and `leads.stage`, no separate reminder table/service | Keeps reminders trivially always-consistent with the source of truth — nothing to keep in sync. |

## Sources

- [Data Pipeline Design: From Messy CSV to Clean Database](https://blog.elunari.uk/data-pipeline-csv-to-clean) — confirms parse → validate/transform → load as the standard CSV import shape (MEDIUM confidence, community source, consistent with established ETL practice)
- [Data Pipeline Architecture: From Messy CSVs to Clean Database](https://dev.to/n3x1s/data-pipeline-architecture-from-messy-csvs-to-clean-database-285a) — corroborates dedupe-by-key and validate-before-load pattern (MEDIUM confidence)
- [Top 7 open source CSV import libraries — Flatfile](https://flatfile.com/blog/top-7-open-source-csv-import-libraries/) — confirms client-side parse + map + validate as the norm for CSV import UX (MEDIUM confidence)
- [RxDB: LocalStorage vs IndexedDB vs Cookies vs OPFS vs WASM-SQLite](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html) — confirms localStorage's ~5MB/string-only limits and lack of query capability, supporting the anti-pattern recommendation against it for structured CRM data (MEDIUM confidence, cross-checked against known localStorage spec limits — HIGH confidence on the underlying facts)
- WhatsApp click-to-chat / wa.me link format — `https://wa.me/<phone digits with country code>?text=<url-encoded message>` — cross-verified across multiple independent guides (Qualimero, Quadlayers, Gowalink, Whatsform) all describing the same stable, official format (HIGH confidence)
- Training-data-derived architectural conventions for solo/small CRUD apps (service-layer separation, derived-state reminders, avoiding premature state-machine abstraction) — consistent with widely-documented small-app architecture practice; flagged MEDIUM confidence where not independently web-verified, but low-risk given the simplicity of the domain

---
*Architecture research for: Solo-admin health-lead CRM (CSV import, pipeline, WhatsApp templates)*
*Researched: 2026-07-19*
