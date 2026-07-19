# Stack Research

**Domain:** Solo-admin CRM / lead-tracker web app (health-niche leads, CSV import, sales pipeline, WhatsApp deep-links)
**Researched:** 2026-07-19
**Confidence:** HIGH (core framework/DB/CSV choices verified against live npm registry + current ecosystem consensus) / MEDIUM (bleeding-edge items flagged individually)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (App Router) | 16.2.10 | Full-stack framework: UI, routing, server-side data layer | One framework does frontend + backend, eliminates the need for a separate Express/Fastify API. Server Actions give you type-safe form/mutation handling directly from React components — for a solo internal tool with a single consumer (your own UI), this is the current (2026) community consensus over hand-rolled REST API routes: less boilerplate, no fetch/JSON-serialization layer, no API client to maintain. Reserve API routes only for things outside your own UI (there are none here — no webhooks, no external clients). |
| React | 19.2.7 | UI library (ships with Next.js) | Required peer of Next.js 16; Server/Client Component model is stable and is what Claude Code and most current tutorials target. |
| TypeScript | 5.9.x (see note) | Type safety across schema, server actions, forms | TypeScript 7.0 reached GA on 2026-07-08 (native Go compiler, "Project Corsa", ~10x faster builds) but shipped **without a stable programmatic API**; full editor/tooling support (ESLint plugins, some framework integrations) is still catching up in 7.1 (in daily dev builds as of this research). For a project built and maintained by an AI coding agent, tooling compatibility matters more than raw compile speed at this scale (a CRM, not a monorepo). **Recommendation: start on TypeScript 5.9.x** (the last fully-tooled classic-compiler release) and revisit TS 7.1 once it's stable — the migration is a drop-in version bump later, not an architecture decision now. |
| Drizzle ORM | 0.45.2 (+ drizzle-kit 0.31.10) | Database schema + type-safe queries + migrations | SQL-shaped queries (no custom query DSL to learn), schema defined in plain TypeScript, migrations are just generated SQL files you can read and review. This matters specifically because your code is written by Claude Code: Drizzle's output is transparent and debuggable, versus Prisma's generated client (a build step + opaque binary engine) which adds a layer Claude Code has to reason around. Works identically against local SQLite and hosted libSQL/Turso — same code, easy to change deployment story later. |
| SQLite (via `better-sqlite3` for local, or Turso/libSQL for hosted) | better-sqlite3 12.11.1 / @libsql/client 0.17.4 | Database engine | A CRM for one admin with a few thousand leads, notes, and a growing category list is a textbook SQLite use case: zero-config, a single file, no separate DB server/process to run or pay for, trivial backups (copy the file). This directly serves "low-maintenance" and "solo, not enterprise." See Stack Patterns by Variant below for local-file vs. hosted-serverless tradeoffs — the schema and Drizzle code are identical either way. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PapaParse | 5.5.4 | CSV import parsing | The de facto standard for CSV in JavaScript, browser-first with streaming/worker support for large files, auto-detects delimiters, tolerant of messy real-world CSVs from a partner (cowork). Parse client-side (drag-and-drop file, preview rows, map columns) before submitting to a Server Action — gives the admin a preview/confirm step before 500 leads land in the DB. |
| Zod | 4.4.0 | Schema validation for lead forms, CSV row validation, and Server Action input | Validate parsed CSV rows (catch bad phone numbers/emails before insert) and validate/sanitize all Server Action inputs. Pairs natively with react-hook-form via `@hookform/resolvers`. |
| react-hook-form | 7.82.0 | Lead detail form, template editor form, category creation form | Minimal re-renders, works cleanly with Server Actions and Zod resolvers; standard choice for any non-trivial form (lead edit form has ~7 fields: notes, follow-up date, channel, source, value, stage, sub-niche). |
| @tanstack/react-table | 8.21.3 | Leads list view: sortable/filterable table by sub-niche, stage, follow-up date | Headless — pairs with shadcn/ui's `<Table>` primitives for a fast, good-looking data table without pulling in a heavy grid component (e.g. AG Grid, overkill here). |
| @dnd-kit/core + @dnd-kit/sortable | 6.3.1 / 10.0.0 | Drag-and-drop pipeline board (Novo → Contatado → Negociação → Fechado/Perdido) | Optional but high-value: a Kanban-style board where dragging a lead card between columns updates its stage is the natural UI for "ver o funil de relance." dnd-kit is the current maintained standard for React drag-and-drop (react-beautiful-dnd is dead/archived). |
| date-fns | 4.4.0 | Follow-up date math (overdue/due-soon highlighting), display formatting | Tree-shakeable, no timezone footguns like legacy Moment.js (Moment is in maintenance-only/legacy mode — see What NOT to Use). Use `isBefore`, `differenceInDays`, `formatDistanceToNow` for the "overdue/upcoming follow-up" visual flags. |
| Tailwind CSS | 4.4.3 | Styling | Fastest way for an AI coding agent to produce a clean admin UI without hand-writing CSS files; v4's CSS-first config (no `tailwind.config.js` needed for basics) simplifies setup further. |
| shadcn/ui (via `shadcn` CLI) | CLI 4.13.1 | Pre-built accessible UI primitives (table, dialog, dropdown, badge, form, calendar/date-picker, toast) | Components are copied into your repo as plain editable code (not an npm dependency black box) — ideal when Claude Code is the one maintaining the codebase, since it can read and modify every component directly. This is the dominant 2025/2026 choice for exactly this kind of internally-used admin/CRM UI. |
| lucide-react | 1.25.0 | Icons | Standard icon set paired with shadcn/ui; tree-shakeable. |
| sonner | 2.0.7 | Toast notifications ("Lead imported", "Follow-up saved") | Standard shadcn/ui-recommended toast library, replaces the older `react-hot-toast`/`react-toastify` pattern in current shadcn projects. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + `eslint-config-next` | Linting | Ships with `create-next-app`; keep default config, don't over-customize for a solo project. |
| Drizzle Studio (`npx drizzle-kit studio`) | Visual DB browser | Lets the non-technical founder actually look at/edit raw lead data in a GUI without writing SQL — valuable for a solo admin who isn't a developer. |
| Git + GitHub | Version control | Needed regardless of hosting choice; also enables Vercel's git-push-to-deploy if hosted (see variants below). |

## Installation

```bash
# Scaffold
npx create-next-app@latest crm-leads --typescript --tailwind --app --eslint

cd crm-leads

# Core data layer
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# CSV import + validation
npm install papaparse zod react-hook-form @hookform/resolvers
npm install -D @types/papaparse

# UI
npx shadcn@latest init
npm install @tanstack/react-table lucide-react sonner date-fns

# Optional: drag-and-drop pipeline board
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# If hosting on Turso instead of a local SQLite file:
npm install @libsql/client
```

No install needed for WhatsApp integration — it's a plain URL you construct client-side:

```typescript
function buildWhatsAppLink(phone: string, message: string): string {
  // phone: digits only, international format, no + / spaces / dashes
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
```
This opens WhatsApp Web (desktop) or the app (mobile) with the message pre-filled and unsent — matching the explicit requirement of manual send, no Business API. Always run the template string through variable substitution ({nome}, etc.) *before* `encodeURIComponent`, never after.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Next.js (Server Actions, no separate API) | Separate backend (Express/Fastify/NestJS) + separate frontend (Vite/React) | Only if you anticipate a second client consuming the same API (mobile app, third-party integration). Explicitly out of scope here — adding this split would be pure overhead for a solo browser tool. |
| Drizzle ORM | Prisma | If the founder later hires a developer more familiar with Prisma's ecosystem/docs, or wants Prisma's more polished migration UI. Prisma is fine technically, but its generated-client build step and larger abstraction surface add friction when an AI agent is the primary maintainer reading/writing the code directly. |
| SQLite (local file or Turso) | Postgres (Neon/Supabase) | If you expect >1 concurrent writer, need advanced relational features (window functions, full-text search at scale), or multi-user later. None apply to a solo CRM with a few thousand leads. |
| PapaParse | `csv-parse` (Node) | If CSV parsing must happen server-side only on very large files (>50MB) with strict RFC4180 edge-case handling. Your CSVs come in irregular batches from a cowork partner and are best previewed in-browser before import — PapaParse is built for exactly that. |
| date-fns | Day.js | Day.js is a fine, smaller alternative (2KB, Moment-like chainable API) — pick it if you prefer that API style. Functionally equivalent for this project's needs (date comparisons, "days until follow-up"). |
| @dnd-kit | react-beautiful-dnd | Never — react-beautiful-dnd is archived/unmaintained (see What NOT to Use). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| WhatsApp Business API / Twilio WhatsApp integration | Explicitly out of scope per project requirements — introduces per-message cost, Meta Business verification bureaucracy, and template-approval workflows that solve a problem this project doesn't have (no automated sending). | `wa.me` link construction, client-side, as shown above. |
| Moment.js | In official maintenance mode (legacy), large bundle, mutable-date footguns. Its own docs recommend migrating away. | date-fns or Day.js |
| react-beautiful-dnd | Archived by Atlassian, no longer maintained, incompatible with React 18/19 strict mode in places. | @dnd-kit |
| Prisma (as default) | Not "wrong," but adds a codegen step and an opaque query engine binary — extra layer of indirection when Claude Code is generating/debugging the data layer directly. Reasonable if you have a specific reason (see Alternatives). | Drizzle ORM |
| Full auth system (NextAuth/Clerk/Auth0) for a single admin | Explicit non-requirement — this is a solo tool, and pulling in a full auth provider (OAuth config, session management, user tables) is pure over-engineering for "only I use this." | If the app is hosted publicly (see Variants below) and needs any gate at all, use a single shared-passcode check in Next.js middleware (one env var, one cookie) — a few lines of code, no library. |
| Building a REST API layer "for future-proofing" | Speculative generality the requirements don't ask for; adds fetch/serialization boilerplate for zero present benefit. | Server Actions now; add a route handler later only if/when an actual second client appears. |
| A generic no-code CRM (Airtable, Notion, Google Sheets formulas) as the "real" build | The user is explicitly moving away from a spreadsheet because it doesn't model a pipeline/follow-up workflow well and this is a custom-code project with Claude Code as the builder — a no-code tool would fight the exact requirements (extensible category list, wa.me deep-link generation with template variables) rather than support them. | The custom stack above. |

## Stack Patterns by Variant

**If running strictly on the admin's own computer, never needing access from elsewhere:**
- Use `better-sqlite3` with a single local `.db` file (e.g., `./data/crm.db`), run the Next.js app in production mode locally (`npm run build && npm start`) or even just `npm run dev`.
- Zero hosting cost, zero external accounts, zero network dependency. Backup = copy one file.
- Tradeoff: the admin must have the app running (a terminal open, or a simple double-click start script) to use it, and it's only reachable from that one machine.

**If the admin wants it reachable from any browser without keeping a local process running (recommended default):**
- Deploy to Vercel (free tier is sufficient for one user) and use Turso (libSQL) instead of a local file — Turso's free tier (5GB storage, 500M row reads/month as of mid-2026) is far beyond what a solo lead CRM needs, and it's SQLite-compatible so the Drizzle schema/queries do not change.
- Add a lightweight passcode gate (Next.js middleware checking a cookie against an env-var secret) since the data is personal lead/PII data and a public Vercel URL is otherwise unauthenticated. This is a ~20-line middleware file, not a library — do not reach for NextAuth/Clerk for this.
- This is the recommended default: it removes the daily friction of "remember to start the server" for a non-technical founder, at the cost of one extra free-tier account (Turso) beyond Vercel/GitHub.

**If the lead list grows far beyond expectations (tens of thousands of leads, heavy reporting):**
- Migrate from SQLite/Turso to Postgres (Neon or Supabase) — Drizzle's schema layer makes this a driver swap, not a rewrite, provided you avoid SQLite-only SQL features up front.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.2.10 | react@19.2.7, react-dom@19.2.7 | Next.js 16 requires React 19; `create-next-app@latest` wires this up automatically. |
| drizzle-orm@0.45.2 | drizzle-kit@0.31.10 | Keep these two in lockstep (minor version bumps together) to avoid migration-generation mismatches. |
| drizzle-orm | better-sqlite3@12.x (local) OR @libsql/client@0.17.x (Turso) | Same Drizzle schema code works against either driver — only the `drizzle-orm/better-sqlite3` vs `drizzle-orm/libsql` import and connection setup differ. Decide local-vs-hosted per the Variants section above; switching later only touches the DB connection file. |
| tailwindcss@4.4.3 | shadcn CLI@4.13.1 | shadcn's current CLI generates Tailwind v4-compatible components by default; do not mix a Tailwind v3 project with the current shadcn CLI output without checking its v3 compat flag. |
| typescript@5.9.x | next@16.2.10, eslint-config-next | Fully supported today. TypeScript 7.0 (GA July 2026) is compatible with plain Next.js builds but some auxiliary tooling (certain ESLint/TS-language-service integrations) is still catching up pending 7.1's restored programmatic API — stay on 5.9.x until 7.1 stabilizes, then upgrade freely (it's a low-risk version bump, not a rewrite). |
| zod@4.4.0 | @hookform/resolvers (latest) | Confirm resolver package version supports Zod v4's changed error format if you pin an older `@hookform/resolvers` — use current `latest` to avoid mismatch. |

## Sources

- npm registry (`npm view <pkg> version`), queried live 2026-07-19 — HIGH confidence for all version numbers above (next, react, typescript, drizzle-orm, drizzle-kit, better-sqlite3, @libsql/client, papaparse, zod, react-hook-form, @tanstack/react-table, date-fns, tailwindcss, shadcn, lucide-react, sonner, @dnd-kit/core, @dnd-kit/sortable)
- [devblogs.microsoft.com/typescript/announcing-typescript-7-0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — TypeScript 7.0 GA confirmation (2026-07-08), programmatic API gap — HIGH confidence
- [turso.tech/pricing](https://turso.tech/pricing) and related 2026 coverage — Turso free tier limits (5GB storage, 500M row reads/month) — MEDIUM confidence (pricing pages change; verify at signup time)
- WebSearch: "Next.js 16 Server Actions vs API Routes 2026" (multiple 2026-dated articles, cross-referenced) — Server Actions as default for internal CRUD, API routes only for external/third-party consumers — MEDIUM-HIGH confidence (consistent across independent sources)
- WebSearch: "best CSV parsing library JavaScript 2026" (npm-compare.com, leanylabs.com benchmarks, oneschema.co) — PapaParse as browser-parsing standard — HIGH confidence (converging sources + it's the only major browser-oriented CSV parser)
- WebSearch: wa.me link construction pattern (whatsform.com, fullpress.it, multiple 2026 guides) — URL format and encodeURIComponent requirement — HIGH confidence (WhatsApp's own documented `wa.me`/`api.whatsapp.com/send` format, corroborated by every source)
- General ecosystem knowledge: react-beautiful-dnd archived status, Moment.js legacy status — HIGH confidence (well-established, long-standing facts, not time-sensitive)

---
*Stack research for: Solo-admin health-lead CRM (browser-based, CSV import, sales pipeline, WhatsApp deep-link templates)*
*Researched: 2026-07-19*
