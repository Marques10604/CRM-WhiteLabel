# Phase 4: Follow-up Dashboard & WhatsApp Outreach - Research

**Researched:** 2026-07-21
**Domain:** Next.js 16 App Router (Server Actions + Client Components), Drizzle/SQLite schema design, wa.me URL construction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard vs lista atual (REMIND-01)**
- **D-01:** The new follow-up dashboard **replaces** the current lead list at `/`. The full, filterable/sortable lead list (built in Phase 1 as REMIND-02) moves to a new dedicated route: **`/leads`**.
- **D-02:** Dashboard groups leads into **3 sections by urgency**: Vencidos (red, top) / Hoje / Próximos 7 dias.
- **D-03:** Empty state (no pending follow-ups) shows a positive message (e.g. "Tudo em dia! Nenhum follow-up pendente") with a CTA/shortcut to view all leads or create a new one.
- **D-04:** Dashboard scope is **active leads only** — excludes `fechado`/`perdido` stages, same `isNull(deletedAt)` + terminal-stage-exclusion pattern already used elsewhere in the codebase.
- **D-05:** Clicking a dashboard item opens the existing lead edit modal (`LeadFormDialog`) — same pattern as the lead list and pipeline board, for consistency.
- **D-06:** Sidebar nav: the item currently pointing to `/` is renamed to **"Follow-ups"** (now the home/dashboard); a new **"Leads"** item is added pointing to `/leads`, alongside Pipeline/Sub-nichos/Lixeira.
- **D-07:** No pagination/limit on the dashboard — shows all matching leads in each section. This is a personal CRM with low lead volume; simplicity wins over a "ver mais" pattern here.
- **D-08:** Each dashboard item shows the lead's stage badge (reuses `EtapaBadge`/`STAGE_OPTIONS` from Phase 3) for quick context without opening the modal.

**Sistema de templates (WA-01, WA-02, WA-03)**
- **D-09:** **3 template types**: 1º contato, follow-up, prova de valor (this last type folds in the pending todo `2026-07-21-sequencia-follow-up-escalonada.md`'s "templates com prova social" request — the escalating-cadence *scheduling logic* from that todo is explicitly **not** part of this phase, see Deferred Ideas below).
- **D-10:** Supported variables: **`{nome}` + `{subnicho}` + `{origem}`**.
- **D-11:** Templates are managed on a new dedicated route: **`/templates`** (CRUD), with its own sidebar nav item — same pattern as `/subnichos`.
- **D-12:** When multiple templates of the same type exist, the admin marks **one as "padrão" per type**. The system uses that default automatically when suggesting/opening WhatsApp, but the admin can switch to a different template of the same type manually at send time (see D-14).
- **D-13:** Templates support **direct hard deletion**, no soft-delete/lixeira pattern. Templates are just reusable text with no sent-message history to preserve — deleting is safe and simple, unlike leads.

**Botão de enviar inline + preview (WA-03, WA-05)**
- **D-14:** Inline "Enviar WhatsApp" button appears in **both** the follow-up dashboard items and the pipeline cards (satisfies WA-05 literally). Clicking it opens a **preview modal first** (WA-03) — never skips straight to `wa.me`.
- **D-15:** The preview modal shows the message with variables already filled in, in an **editable textarea** — admin can tweak the text for this one send without changing the saved template. The modal also includes a **type selector** (dropdown: 1º contato / follow-up / prova de valor) defaulting to the context-appropriate type (e.g., follow-up when opened from the dashboard) but switchable before sending.
- **D-16:** The send button is shown **regardless of the lead's `canal` field** (Instagram/WhatsApp) — `canal` represents the primary approach preference, not an exclusivity gate; admin may still want to WhatsApp an Instagram-tagged lead.
- **D-17:** If `normalizePhone()` returns `null` for the lead's phone (invalid/incomplete), the send button is **disabled with a tooltip warning** (e.g. "Telefone inválido — edite o lead") rather than hidden or silently broken.

**Gatilho de 1º contato sem Fase 2 pronta (WA-04)**
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

### Deferred Ideas (OUT OF SCOPE)
- **Escalating follow-up cadence (auto-scheduling)** — from `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`: automatically suggesting the next follow-up date at increasing intervals (+4 days, +10 days, ...) after no response. This is materially more complex than Phase 4's current scope (date-suggestion logic, configurable intervals per lead/sub-nicho) and was explicitly deferred by the admin to a future phase. The todo remains in `.planning/todos/pending/` (not folded, not closed).
- **Phase 2 (CSV Bulk Import) itself** — remains unbuilt. Once it exists, its import flow should call into the same auto-trigger mechanism built here for manual creation (per Claude's Discretion note above), rather than requiring a separate WA-04 implementation.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REMIND-01 | Tela inicial do CRM mostra painel de follow-ups vencidos/próximos como visão padrão ao abrir o sistema (não um filtro que precisa ser aplicado) | Architecture Patterns → dashboard Server Component grouping (D-02/D-04); Code Examples → date-fns grouping snippet; Pitfall 5 (shared query helper for active-lead scoping). |
| WA-01 | Admin pode criar e editar templates de mensagem do WhatsApp com variáveis (ex: {nome}) | Standard Stack (Zod + react-hook-form reuse); Code Examples → `templates` schema; Pattern 3 (default-per-type transaction) for `/templates` CRUD actions. |
| WA-02 | Sistema gera link wa.me com a mensagem do template preenchida e corretamente codificada (acentos, emojis, quebras de linha) e número de telefone brasileiro normalizado | Pattern 1 (`buildWaLink`/`renderTemplate` in `src/lib/whatsapp.ts`); Summary point 1 (encodeURIComponent verified sufficient for accents/emoji/`\n`); Don't Hand-Roll (`normalizePhone()` reuse). |
| WA-03 | Admin pode visualizar preview da mensagem final (variáveis já preenchidas) antes de abrir o WhatsApp | Pattern 2 (preview dialog, editable textarea); Pitfall 4 (textarea edits must be live-bound to the send href, not the original template). |
| WA-04 | Ao importar um lead novo, sistema sugere automaticamente abrir o WhatsApp com o template de primeiro contato | Pattern 2 (`useFirstContactTrigger` shared hook, D-18 discretion) — built now for manual creation, designed for Phase 2 reuse without rewrite. |
| WA-05 | Botão de enviar WhatsApp aparece inline na lista de lembretes e no card do pipeline | Architectural Responsibility Map (send button = Browser/Client tier component shared by both surfaces); Open Question 1 (scope clarification: dashboard + pipeline only, not `/leads`). |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Server Actions only, no API routes** — CLAUDE.md explicitly forbids "Building a REST API layer for future-proofing." This phase's template CRUD and the lead-creation auto-trigger must use Server Actions (`"use server"`), never a Route Handler — confirmed compatible with Pattern 2's design (wa.me opening needs no server round-trip at all, so no API route is needed there either).
- **No WhatsApp Business API / Twilio integration** — CLAUDE.md "What NOT to Use" table explicitly rules this out; this phase must only use `wa.me` link construction, matching WA-02's own wording.
- **Drizzle ORM, not Prisma** — new `templates` table must use the same `sqliteTable` builder conventions already in `src/db/schema.ts`.
- **No full auth system (NextAuth/Clerk/Auth0)** — this phase introduces no login/session concept; confirmed no ASVS V2/V3 controls apply (see Security Domain).
- **date-fns, not Moment.js/Day.js** — dashboard urgency grouping must use date-fns (already the project's date library).
- **shadcn/ui (Base UI variant) + Tailwind** — new dialogs/forms (template editor, preview modal) must reuse existing `Dialog`/`Field`/`Textarea`/`Select` primitives from `src/components/ui/`, not introduce a new UI kit.
- **PT-BR** — all UI copy, code comments, and commit messages in this phase's deliverables must be in Brazilian Portuguese, consistent with every prior phase's SUMMARY.md files read during this research.
- **GSD workflow enforcement** — file edits for this phase must flow through `/gsd-execute-phase` (not a direct ad-hoc edit), per CLAUDE.md's workflow section — not a research concern, but noted for the planner/executor handoff.

## Summary

This phase adds no new external dependencies — it is pure application code on top of the stack already installed in Phases 1-3 (Next.js 16 Server Components/Actions, Drizzle ORM + better-sqlite3, react-hook-form + Zod, date-fns, shadcn/ui Base UI primitives, sonner). The four open technical questions from the phase brief all resolve to "reuse the pattern already established in this codebase" rather than needing a new tool:

1. **wa.me construction** is native `encodeURIComponent()` on the rendered message text appended to `https://wa.me/<digits>?text=<encoded>` — no library needed, and no special-casing required for accents, emoji, or `\n` line breaks (all confirmed to encode correctly via UTF-8 percent-encoding, `\n` → `%0A`).
2. **Server Action → client "open wa.me" handoff** does not actually need a Server Action in the handoff path at all: opening WhatsApp is not a data mutation (D-13: templates have no sent-message history), so the send button can be a plain client-side `<a href={waLink} target="_blank" rel="noopener noreferrer">` computed from props already available in the Client Component (lead fields + selected template body). The *only* Server Actions this phase needs are template CRUD and reusing the existing `createLead`. The already-established `useActionState` + `useEffect(() => { if (state.success) {...} }, [state])` pattern (seen in `lead-form-dialog.tsx`) is the correct place to trigger the D-18/D-19 auto-open-preview behavior after `createLead` succeeds.
3. **"One default template per type"** should be enforced at the **application layer** via a `db.transaction()` (unset-then-set), mirroring this codebase's own established SELECT-then-compare pattern from `updateLead`/`updateLeadStage` — not via a SQLite partial unique index. Drizzle-kit has multiple open/recent GitHub issues around partial (`.where()`) unique indexes not generating correct SQL for the sqlite dialect, and this project has already been burned twice by drizzle-kit SQLite migration-generation gaps in Phase 3 (enum widening not emitting ALTER; ADD COLUMN default restrictions). Avoiding a third instance of that pitfall class is the safer, more idiomatic choice here.
4. **Moving `/` → `/leads`** is a plain file move (`src/app/page.tsx` → `src/app/leads/page.tsx`) plus writing a new `src/app/page.tsx` for the dashboard. Grep confirms nothing else in `src/` hardcodes `href="/"` or `router.push("/")`/`redirect("/")` pointing at "the lead list" specifically — the only place that needs an edit is `app-sidebar.tsx`'s `NAV_ITEMS` (relabel `/` to "Follow-ups", add a new `/leads` entry). The existing active-state logic in `app-sidebar.tsx` (`item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)`) already handles a `/leads` entry correctly without modification.

**Primary recommendation:** Build this phase with zero new npm installs. Add one new `templates` DB table (simple `CREATE TABLE`, not an `ALTER TABLE` — none of Phase 3's migration pitfalls apply). Centralize wa.me link construction and template-variable substitution in one new `src/lib/whatsapp.ts` module. Enforce "one default per type" via a Drizzle transaction, not a partial index.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Follow-up dashboard grouping (Vencidos/Hoje/Próximos 7 dias) | Frontend Server (Next.js Server Component) | Database | Same pattern as `/pipeline`'s `page.tsx`: fetch + group in the Server Component, pass plain props down. |
| Lead list at `/leads` | Frontend Server (Next.js Server Component) | Database | Direct move of existing `/` logic — no tier change. |
| Template CRUD (`/templates`) | API/Backend (Server Actions) | Database | Same `ActionState`/Zod/`revalidatePath` convention as `lead-actions.ts`. |
| "One default per type" enforcement | Database / API boundary | — | Transaction lives in the Server Action, but the invariant is a data-integrity concern, not a UI concern. |
| wa.me link construction + variable substitution | Browser/Client | — | Pure string transform of already-fetched data; no server round-trip needed, no mutation occurs. |
| Send-preview modal (editable textarea, type selector) | Browser/Client | — | Local component state (React `useState`), no persistence. |
| Auto-trigger 1º contato preview after manual creation | API/Backend (Server Action success) → Browser/Client (modal open) | — | `createLead` (API/Backend) returns the created lead; a Client Component effect (Browser/Client) opens the preview — matches existing `useActionState` handoff pattern. |
| Sidebar nav relabel + `/leads` entry | Browser/Client (Next.js Client Component) | — | `app-sidebar.tsx` is already `"use client"`. |

## Standard Stack

### Core
No new core libraries required. This phase is built entirely on the stack already installed:

| Library | Version (installed) | Purpose in this phase | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router, Server Actions) | 16.2.10 | New `/templates` CRUD actions, dashboard Server Component, moved `/leads` route | Same convention already used for `lead-actions.ts` / `/pipeline`. |
| Drizzle ORM + better-sqlite3 | 0.45.2 / 12.11.1 | New `templates` table, transaction for default-per-type | `db.transaction()` is natively supported and synchronous on the better-sqlite3 driver `[VERIFIED: npm registry]` (version confirmed installed in `package.json`). |
| Zod | 4.4.3 (installed; CLAUDE.md lists 4.4.0, minor drift, not a concern) | `templateSchema` for CRUD validation | Matches `leadSchema`/`stageUpdateSchema` convention already in `src/lib/validations.ts`. |
| react-hook-form + `@hookform/resolvers` | 7.82.0 / 5.4.0 | Template editor form, preview-modal editable textarea | Same pattern as `lead-form-dialog.tsx`. |
| date-fns | 4.4.0 | Grouping leads into Vencidos/Hoje/Próximos 7 dias (`isBefore`/`isToday`/`differenceInDays`, `startOfDay`) | Already used for "esfriando" computation in `/pipeline`; same tree-shakeable, no-timezone-footgun rationale applies here. |
| sonner | 2.0.7 | Toasts for template save/delete | Already the project's toast library. |
| lucide-react | 1.25.0 | Icon for the "Enviar WhatsApp" button (e.g. `MessageCircle`) | Already the project's icon set. |

### Supporting
No additional supporting libraries needed — `encodeURIComponent` (native JS, zero-dependency) fully covers WA-02's encoding requirement.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `encodeURIComponent` for wa.me text | A dedicated "whatsapp-link-generator" style npm package | Unnecessary — these packages are thin wrappers around `encodeURIComponent` + string concatenation; adding a dependency for ~3 lines of code contradicts the project's "solo tool, low-maintenance" constraint. Not recommended. |
| App-layer transaction for "one default per type" | SQLite partial unique index (`uniqueIndex().on(...).where(eq(...))`) | Partial indexes are the more "correct" relational-modeling answer in the abstract, but drizzle-kit has open GitHub issues about the sqlite dialect not respecting/generating the `WHERE` clause correctly for such indexes (see Pitfall 3 below) — matches this project's own precedent of Drizzle/SQLite migration-generation gaps. Revisit only if drizzle-kit's sqlite partial-index support is confirmed fixed in a future version bump. |
| Plain `<a href target="_blank">` for the send button | `window.open(url, "_blank")` imperative call | `<a>` is more accessible (announced as a link by screen readers, supports native "open in new tab"/"copy link" context-menu actions, works without JS if SSR'd) and is not subject to popup-blocker heuristics being stricter about synthetic `window.open` calls in some browsers. Use `<a>`; reserve `window.open` only if a click handler must also fire a non-navigational side effect first (not needed here, since sending is not a mutation). |

**Installation:**
```bash
# No installation required for Phase 4 — all dependencies already present in package.json.
```

**Version verification:** No new packages recommended; installed versions above were read directly from `package.json` in this session (not re-verified against the registry since nothing new is being added).

## Package Legitimacy Audit

**Not applicable this phase — no external packages are installed.** All functionality (wa.me construction, template variable substitution, "default per type" enforcement) is implemented with native JavaScript and libraries already present in `package.json` (audited and approved in Phases 1-3). `slopcheck`/registry verification is skipped because there is nothing new to verify.

## Architecture Patterns

### System Architecture Diagram

```
+-----------------------------------------------------------------------+
| Browser (Client Components)                                           |
|                                                                         |
|  Dashboard items / Pipeline cards                                      |
|        |  click "Enviar WhatsApp"                                      |
|        v                                                                |
|  <WhatsAppPreviewDialog>  -- type selector (1o contato/follow-up/      |
|        |                     prova de valor), editable textarea        |
|        |  renderTemplate(template.corpo, {nome, subnicho, origem})     |
|        v                                                                |
|  buildWaLink(normalizePhone(lead.telefone), editedText)                 |
|        |                                                                 |
|        v                                                                 |
|  <a href="https://wa.me/55.../?text=..." target="_blank">  ----------> WhatsApp (external, new tab)
|                                                                         |
|  -- separately --                                                       |
|  <LeadFormDialog> (create mode)                                        |
|        |  submit -> createLead (Server Action)                          |
|        |                                                                 |
|        v (useActionState effect on success)                             |
|  useFirstContactTrigger().trigger(createdLead)                          |
|        |                                                                 |
|        v                                                                 |
|  <WhatsAppPreviewDialog> auto-opens, defaultTemplate = "1o contato"      |
+-----------------------------------------------------------------------+
              | Server Actions (mutations only -- no action in the send path)
              v
+-----------------------------------------------------------------------+
| Next.js Server (Server Components + Server Actions)                    |
|                                                                         |
|  GET /            -> dashboard: SELECT leads WHERE deletedAt IS NULL   |
|                       AND stage NOT IN (fechado, perdido), grouped by  |
|                       followUpDate vs today (date-fns)                 |
|  GET /leads        -> moved lead-table logic (unchanged)                |
|  GET /templates    -> SELECT * FROM templates, grouped by tipo          |
|  createTemplate / updateTemplate / deleteTemplate / setDefaultTemplate |
|      (Server Actions) -> templates table                               |
|  createLead (existing, extended to return created Lead)                |
+-----------------------------------------------------------------------+
              |
              v
+-----------------------------------------------------------------------+
| SQLite (./data/crm.db via better-sqlite3 + Drizzle)                    |
|  leads (existing) -- templates (new table, 1 migration: CREATE TABLE)  |
+-----------------------------------------------------------------------+
```

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                    # NEW dashboard content (was lead list — moves out)
│   ├── leads/
│   │   └── page.tsx                # MOVED: exact content of old src/app/page.tsx
│   └── templates/
│       └── page.tsx                # NEW: Server Component, fetch templates grouped by tipo
├── actions/
│   ├── lead-actions.ts             # MODIFIED: createLead returns created Lead on success
│   └── template-actions.ts         # NEW: createTemplate/updateTemplate/deleteTemplate/setDefaultTemplate
├── lib/
│   ├── whatsapp.ts                 # NEW: buildWaLink(), renderTemplate()
│   └── validations.ts              # MODIFIED: + templateSchema
├── hooks/
│   └── use-first-contact-trigger.ts # NEW: shared reusable trigger (D-18 discretion)
├── components/
│   ├── whatsapp-preview-dialog.tsx # NEW: shared preview modal (dashboard + pipeline + auto-trigger)
│   ├── whatsapp-send-button.tsx    # NEW: inline button, shared by dashboard items + pipeline cards
│   ├── followup-dashboard.tsx      # NEW: 3-section grouped list (D-02)
│   ├── template-form-dialog.tsx    # NEW: template CRUD form
│   └── app-sidebar.tsx             # MODIFIED: relabel "/" → "Follow-ups", add "/leads"
└── db/
    └── schema.ts                    # MODIFIED: + templates table
```

### Pattern 1: wa.me link construction (`src/lib/whatsapp.ts`)
**What:** A single pure function builds the URL; a single pure function renders the template. No library, no server round-trip.
**When to use:** Every place a "Enviar WhatsApp" button/link is rendered (dashboard, pipeline card, preview modal, auto-trigger).
**Example:**
```typescript
// src/lib/whatsapp.ts
// Sources: encodeURIComponent behavior — MDN (developer.mozilla.org/.../encodeURIComponent),
// wa.me click-to-chat format — cross-verified across multiple 2026 guides (qualimero.com,
// green-api.com, saysimple.com) [CITED, MEDIUM confidence — no single official WhatsApp
// help-center page was fetchable in this session; format is long-stable and uncontested
// across independent sources].

export type TemplateVars = { nome: string; subnicho: string; origem: string };

/** Substitui {nome}/{subnicho}/{origem} por valores reais. Placeholder ausente vira "". */
export function renderTemplate(corpo: string, vars: TemplateVars): string {
  return corpo
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{subnicho}", vars.subnicho)
    .replaceAll("{origem}", vars.origem);
}

/**
 * `telefoneNormalizado` DEVE vir de `normalizePhone()` (dígitos DDI-55, sem
 * "+"/espaços) — nunca construir a partir de input de texto livre não
 * validado (evita qualquer risco de injeção na URL, já que o número nunca
 * contém caracteres fora de [0-9]).
 */
export function buildWaLink(telefoneNormalizado: string, message: string): string {
  return `https://wa.me/${telefoneNormalizado}?text=${encodeURIComponent(message)}`;
}
```
`encodeURIComponent` correctly percent-encodes accented characters (UTF-8 bytes), emoji (valid surrogate pairs → UTF-8 percent sequences), and literal `\n` (→ `%0A`) with no extra handling required. `[CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent]` — HIGH confidence, this is standard, stable JS platform behavior.

### Pattern 2: Server Action success → client-side WhatsApp open (no API route, no extra Server Action in the send path)
**What:** `createLead`'s existing `useActionState` handoff (already used for toast + dialog-close) is extended to also carry the created lead, and a client effect uses it to open the preview dialog. The actual "open wa.me" step is a plain anchor tag — never a Server Action.
**When to use:** D-18/D-19 auto-trigger on manual lead creation; same shape reusable later by Phase 2's CSV import (call the same hook per imported row instead of per dialog-submit).
**Example:**
```typescript
// src/actions/lead-actions.ts (extend, don't replace, existing createLead)
type ActionState =
  | { success: true; lead: Lead }   // ← lead added
  | { errors: Record<string, string[] | undefined> }
  | undefined;
// ...
  const [inserted] = await db.insert(leads).values(parsed.data).returning();
  revalidatePath("/"); revalidatePath("/pipeline"); revalidatePath("/leads");
  return { success: true, lead: inserted };
```
```typescript
// src/hooks/use-first-contact-trigger.ts — shared, reusable (D-18 discretion)
// Both the manual-create success effect AND (later) Phase 2's import-completion
// handler call `trigger(lead, subnichoNome)` — no hard-coupling to the dialog.
export function useFirstContactTrigger(defaultTemplate: Template | undefined) {
  const [target, setTarget] = useState<{ lead: Lead; subnichoNome: string } | null>(null);
  return {
    open: target !== null,
    template: defaultTemplate,
    lead: target?.lead,
    trigger: (lead: Lead, subnichoNome: string) => setTarget({ lead, subnichoNome }),
    close: () => setTarget(null),
  };
}
```
```typescript
// inside LeadFormDialog's existing useEffect watching `state`:
useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("Lead salvo com sucesso.");
    form.reset();
    onOpenChange(false);
    if (!isEditMode) {
      firstContactTrigger.trigger(state.lead, subnichoNomeFor(state.lead.subnichoId));
    }
  } else if (state && "errors" in state) {
    toast.error("Não foi possível salvar o lead. Tente novamente.");
  }
}, [state]);
```
Rationale: this sidesteps Open Question 2 entirely rather than "solving" it with an awkward extra API route — since opening wa.me is not a mutation, it was never actually a Server Action problem in the first place; only the *lead creation* needed the Server Action, and its existing success-handoff pattern (already shipped in Phase 1/3) already supports carrying arbitrary return data to the client. `[ASSUMED: architectural reasoning, not sourced from an external doc — flagged for planner confirmation since it changes createLead's return shape]`.

### Pattern 3: "One default template per type" via transaction, not partial index
**What:** When an admin marks a template as default, wrap the unset-then-set in one Drizzle transaction.
**When to use:** `setDefaultTemplate` Server Action.
**Example:**
```typescript
// src/actions/template-actions.ts
export async function setDefaultTemplate(id: number, tipo: Template["tipo"]) {
  db.transaction((tx) => {
    tx.update(templates).set({ isDefault: false }).where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true))).run();
    tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id)).run();
  });
  revalidatePath("/templates");
  revalidatePath("/");        // dashboard shows default-based send buttons
  revalidatePath("/pipeline"); // pipeline cards do too
}
```
`db.transaction()` on the `drizzle-orm/better-sqlite3` driver is synchronous (matches better-sqlite3's own sync transaction model) `[CITED: orm.drizzle.team/docs — SQLite transactions]` — MEDIUM-HIGH confidence, standard documented Drizzle capability, not independently re-fetched this session but consistent with training knowledge and the driver's well-known sync nature.

### Anti-Patterns to Avoid
- **Relying on a SQLite partial unique index for "one default per type":** drizzle-kit has multiple open GitHub issues (`drizzle-team/drizzle-orm#4688`: "push on D1 database or sqlite does not respect where part of partial index"; `#3349`/`drizzle-kit-mirror#461`: WHERE clause value not substituted, though that specific report was Postgres-dialect) showing the `.where()` modifier on `uniqueIndex()` is not reliably honored for the sqlite dialect across drizzle-kit's `generate`/`push` commands as of mid-2026. Combined with this project's own Phase 3 experience of drizzle-kit under/over-generating SQL for schema changes, treat any DB-level partial constraint as unverified until manually inspecting the generated migration SQL — prefer the transaction approach above.
- **Building a custom template engine (regex-based `{{...}}` mini-language, `eval`/`Function`-based interpolation):** WA-01/WA-02 only need 3 fixed placeholders (`{nome}`/`{subnicho}`/`{origem}`) — a simple `.replaceAll()` chain is correct and safe; do not reach for a templating library (Handlebars, mustache, etc.) for 3 static tokens.
- **`window.open()` without checking for popup blockers, or without `rel="noopener noreferrer"`:** if `window.open` is used anywhere instead of an `<a>` (e.g. if a synchronous confirm step is ever added before navigating), always pass `noopener,noreferrer` — otherwise the new tab (`wa.me`, and after redirect, `web.whatsapp.com` or the WhatsApp app) gets a live `window.opener` reference back to the CRM (tabnabbing-class issue). Prefer `<a target="_blank" rel="noopener noreferrer">` by default, which requires no extra flag.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Percent-encoding message text for the URL | Manual regex replacing spaces/accents/emoji/newlines | Native `encodeURIComponent()` | Already handles UTF-8 percent-encoding correctly for every character class WA-02 lists (accents, emoji, `\n`); a hand-rolled encoder is pure risk for zero benefit. |
| "Only one default per type" invariant | Ad-hoc client-side checkbox logic that just trusts the UI never renders two defaults | A `db.transaction()` unset-then-set in the Server Action | Client-only enforcement breaks the moment two browser tabs are open, or a future bulk-import path sets defaults directly — server-side atomicity is required regardless of how "simple" the UI looks. |
| Phone normalization for wa.me | A second/duplicate phone-cleaning function inside `whatsapp.ts` | `normalizePhone()` from `src/lib/phone.ts` (already built, already documented "pronto para uso em wa.me (Fase 4)") | Explicitly built for this exact purpose in Phase 1; reimplementing it risks divergent edge-case handling (e.g. 8 vs 9-digit mobile numbers). |
| Reuse mechanism for future CSV-import auto-trigger (D-18) | Inlining the preview-open logic directly inside `LeadFormDialog`'s submit handler with no extraction | A standalone hook/function (`useFirstContactTrigger` or equivalent plain function) called from both places | CONTEXT.md explicitly instructs "shared, reusable trigger function/hook... so Phase 2 can wire into it later without a rewrite" — this is a locked discretion note, not optional. |

**Key insight:** Every piece of "hard" functionality this phase seems to need (URL encoding, phone formatting, template variables) is either already built in this codebase or is a 1-line native JS call — the actual engineering risk in this phase is entirely in *sequencing* (making sure the Server Action → client handoff and the default-per-type transaction are atomic and race-free), not in finding the right library.

## Common Pitfalls

### Pitfall 1: Treating `createLead`'s return-shape change as a breaking change for existing callers
**What goes wrong:** `createLead` currently returns `{ success: true }` with no payload; adding `lead: Lead` to the success variant is additive but any code that does an exhaustive `switch`/type-narrows on the exact shape of `ActionState` (e.g. `"success" in state && state.success === true` without also expecting a `lead` field) still works, but any code that destructures `{ success }` only and ignores `lead` will silently not break — however if a *second* creation call site exists that expects the old return shape verbatim in a test/mock, it will need updating too.
**Why it happens:** `ActionState` is a discriminated union re-declared per-file (already duplicated between `lead-actions.ts` and `lead-form-dialog.tsx`) rather than imported from one shared location.
**How to avoid:** Grep all `"success" in state` / `ActionState` usages before changing the return shape; consider consolidating the type into one exported location if this phase touches it (optional — the existing duplication is a pre-existing pattern in the codebase, not introduced by this phase).
**Warning signs:** `tsc --noEmit` will catch any place destructuring `state.lead` where the type doesn't yet include it — treat that as the checklist.

### Pitfall 2: `revalidatePath` gaps for the new `/templates` and moved `/leads` routes
**What goes wrong:** Phase 3's gap-closure (03-04) already demonstrated this exact failure mode once: a Server Action mutates data but only revalidates the route it was called *from*, leaving other routes that display the same data stale until a manual reload.
**Why it happens:** Easy to add `revalidatePath("/templates")` in `createTemplate`/`updateTemplate` and forget that `/` (dashboard) and `/pipeline` also render "send WhatsApp" buttons whose behavior depends on which template is currently the type's default.
**How to avoid:** Every template-mutating Server Action (`createTemplate`, `updateTemplate`, `deleteTemplate`, `setDefaultTemplate`) must revalidate `/templates`, `/`, `/leads` (if send buttons appear there too — confirm against final dashboard scope), and `/pipeline`. Every lead-mutating action must now also revalidate `/leads` (renamed from `/`) in addition to `/` (now the dashboard) and `/pipeline`.
**Warning signs:** Grep count of `revalidatePath` calls per action — should be ≥3 for any action touching `templates` or `leads`.

### Pitfall 3: Drizzle-kit SQLite partial unique index unreliability
**What goes wrong:** A `uniqueIndex().on(templates.tipo, templates.isDefault).where(eq(templates.isDefault, true))` schema declaration may generate a migration whose `WHERE` clause is dropped, malformed, or not applied on `push`, silently leaving the DB *without* the intended constraint while the code appears correct.
**Why it happens:** Documented in `drizzle-team/drizzle-orm#4688` (sqlite/D1 push ignores partial-index `where`) — an open ecosystem-level gap as of this research date, not specific to this project's version pinning.
**How to avoid:** Don't rely on the DB constraint at all for this invariant (see Pattern 3 above); if a defense-in-depth index is still desired later, always manually inspect the generated `.sql` migration file (same discipline already established in 03-01-SUMMARY.md for the enum-widening pitfall) before trusting it.
**Warning signs:** Generated migration SQL for the new index shows no `WHERE` clause, or shows a clearly wrong one (e.g., a parameter placeholder like `$1` instead of a literal `1`/`true`).

### Pitfall 4: Preview-modal textarea edits silently discarded because "send" doesn't call a Server Action
**What goes wrong:** Since sending is client-only (Pattern 2), it's tempting to wire the "Enviar" button's `onClick` to just call `window.location.href = waLink` or similar without first reading the *current* (possibly edited) textarea value — especially if the href was memoized once at modal-open time from the *original* template text.
**Why it happens:** D-15 requires the textarea to be user-editable before sending; if the `<a href>` is computed once from `renderTemplate(template.corpo, vars)` and never recomputed from the textarea's live `useState` value, edits the admin makes are ignored.
**How to avoid:** Bind the `<a href>` (or the value passed to `buildWaLink`) directly to the textarea's controlled `useState` value, not to the original template prop — recompute on every keystroke (cheap, pure string ops) or at minimum on submit via `formRef.current.value`.
**Warning signs:** Manually edit the preview textarea in a click-through and confirm the opened wa.me link's `text=` param reflects the edit, not the original template.

### Pitfall 5: `/leads` and `/` both fetching similar-looking Server Components without a shared query builder
**What goes wrong:** Both new `/leads` (moved logic) and `/` (dashboard) query the `leads` table with `isNull(leads.deletedAt)` — the dashboard additionally excludes `fechado`/`perdido` (D-04) and groups by follow-up urgency. If the exclusion/grouping logic is written ad-hoc inline in `page.tsx` rather than as a small shared helper (e.g. `getActiveDashboardLeads()`), a future stage-enum change (there is already a pending, unresolved todo — `2026-07-21-separar-fechado-perdido.md` — about splitting stages further) risks updating one query and not the other.
**Why it happens:** Copy-paste between two similar Server Components is the path of least resistance.
**How to avoid:** Extract the "active leads, terminal-stage-excluded" query into one function in `src/db/queries.ts` (or similar) if it doesn't already exist, called from both `/` and anywhere else needing "active pipeline leads."
**Warning signs:** Grep for `isNull(leads.deletedAt)` combined with a stage-exclusion filter appearing in more than one file with slightly different stage lists.

## Code Examples

### Grouping leads by follow-up urgency (D-02)
```typescript
// src/app/page.tsx (new dashboard) — mirrors date math already used for
// "esfriando" in pipeline/page.tsx (differenceInDays), same date-fns import.
import { isBefore, isToday, startOfDay, addDays } from "date-fns";

const today = startOfDay(new Date());
const in7Days = addDays(today, 7);

const vencidos = activeLeads.filter((l) => isBefore(l.followUpDate, today));
const hoje = activeLeads.filter((l) => isToday(l.followUpDate));
const proximos7Dias = activeLeads.filter(
  (l) => !isBefore(l.followUpDate, today) && !isToday(l.followUpDate) && isBefore(l.followUpDate, in7Days)
);
```
`[CITED: date-fns docs — isBefore/isToday/addDays/startOfDay are all stable, long-existing date-fns v4 functions]` — HIGH confidence, same functions already imported elsewhere in this codebase (`startOfDay` in `lead-form-dialog.tsx`).

### `templates` schema addition
```typescript
// src/db/schema.ts
export const templates = sqliteTable(
  "templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo", { enum: ["primeiro_contato", "follow_up", "prova_valor"] }).notNull(),
    nome: text("nome").notNull(),
    corpo: text("corpo").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("templates_tipo_idx").on(table.tipo)]
);
```
This is a brand-new table (`CREATE TABLE`), not an `ALTER TABLE` on existing data — none of Phase 3's "ADD COLUMN on non-empty table" migration pitfalls apply here. `[VERIFIED: drizzle-orm sqlite-core column builders — integer/text/boolean mode, confirmed against schema.ts's existing usage of the same builders]`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WhatsApp Business API / Cloud API for automated sends | `wa.me` click-to-chat links for manual, admin-initiated sends | N/A — explicit project constraint, not an ecosystem shift | Zero cost, zero Meta Business verification, exactly matches CLAUDE.md's "What NOT to Use" guidance. |

**Deprecated/outdated:** Nothing in this phase's domain has changed recently — wa.me's click-to-chat URL format has been stable for years and is not a fast-moving target.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `createLead`'s `ActionState` can be safely extended to return `{ success: true; lead: Lead }` without breaking other call sites | Pattern 2 | Low — `tsc --noEmit` will catch any incompatible destructuring immediately; only 1-2 call sites exist today (`lead-form-dialog.tsx`, `pipeline-board.tsx`'s create path if any). Planner should grep `createLead(` call sites before committing to this shape. |
| A2 | wa.me URL format (`https://wa.me/<digits>?text=<encoded>`) is exactly correct with no additional required query params or headers | Pattern 1, Summary | Low-Medium — could not fetch WhatsApp's own help-center page directly in this session (fetch tool returned truncated/redirected content); the format is cross-verified by ~6 independent third-party guides and matches long-standing developer knowledge, but has not been confirmed against WhatsApp's primary source this session. |
| A3 | `db.transaction()` on `drizzle-orm/better-sqlite3` is synchronous and supports the unset-then-set pattern shown in Pattern 3 | Pattern 3, Don't Hand-Roll | Medium — if the transaction API shape differs from what's shown (e.g., requires `async`/`await` internally, or a different callback signature), the planner's task will need a quick Context7/docs check at plan-time; not independently re-verified via Context7 in this research session (Context7 MCP tools were not available in this environment). |
| A4 | Drizzle-kit's sqlite-dialect partial-unique-index bug (`#4688`) still applies to the installed `drizzle-kit@0.31.10` / `drizzle-orm@0.45.2` versions | Anti-Patterns, Pitfall 3 | Low — even if this specific bug has since been fixed, the *recommendation* (app-layer transaction over partial index) remains strictly safer and simpler for this project's scale; no downside to following it regardless of the bug's current status. |

## Open Questions (RESOLVED)

1. **Does the dashboard also need "Enviar WhatsApp" buttons, or only the pipeline+dashboard per D-14's literal wording?**
   - What we know: D-14 explicitly says "both the follow-up dashboard items and the pipeline cards."
   - What's unclear: Whether `/leads` (the plain list) also needs the button — CONTEXT.md doesn't mention `/leads` in D-14's scope.
   - Recommendation: Planner should scope the send button to dashboard (`/`) + pipeline (`/pipeline`) only, per D-14's literal text; do not add it to `/leads` unless a future context update says so.

2. **Exact set of fields available for `{origem}` when auto-triggering after manual creation**
   - What we know: `origem` is a required text field on `leads`, always present.
   - What's unclear: Nothing substantive — flagged only because it's the one variable not already displayed elsewhere in existing components (unlike `nome`/sub-nicho which are already rendered in `pipeline-lead-card.tsx`).
   - Recommendation: No action needed; `origem` is already `notNull()` on the schema, so it will always be populated by the time the trigger fires.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Explicit project constraint — solo local tool, no auth (CLAUDE.md "What NOT to Use"). |
| V3 Session Management | No | Same as above. |
| V4 Access Control | No | Single admin, local-only, no multi-tenant boundary. |
| V5 Input Validation | Yes | Zod (`templateSchema`, mirroring `leadSchema`) for all template CRUD Server Action inputs. |
| V6 Cryptography | No | No secrets/credentials introduced by this phase (no API keys — explicitly no WhatsApp Business API integration). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reflected content in the wa.me URL / preview modal (template body containing user-entered text rendered into a link) | Tampering / Information Disclosure | Message text goes into a `text=` query param via `encodeURIComponent`, never into `dangerouslySetInnerHTML` or an `eval`'d template engine — treat template bodies as plain text end-to-end. Do not add rich-text/HTML rendering to the preview textarea (D-15 already specifies plain editable textarea, not a rich-text editor — this is also the secure default). |
| Tabnabbing via `target="_blank"` on the wa.me anchor | Tampering (of the origin window via `window.opener`) | Always pair `target="_blank"` with `rel="noopener noreferrer"` (see Anti-Patterns above). Modern browsers default `rel="noopener"` for anchors without `rel="opener"` since Chrome 88/Firefox 79, but do not rely on browser defaults — set it explicitly for correctness across all supported browsers. `[CITED: developer.mozilla.org — target attribute / noopener security]`. |
| Constructing the wa.me phone segment from unvalidated free text | Tampering (malformed/injected URL) | Never build the URL from raw `lead.telefone` — always route through `normalizePhone()` first (already enforced at the schema level via `leadSchema`'s Zod transform, so `lead.telefone` as stored is already normalized digits-only; still, any client-side re-derivation of the link must reuse `normalizePhone()`, never re-parse ad hoc). |

## Sources

### Primary (HIGH confidence)
- `src/lib/phone.ts`, `src/db/schema.ts`, `src/actions/lead-actions.ts`, `src/components/lead-form-dialog.tsx`, `src/components/pipeline-lead-card.tsx`, `src/components/etapa-badge.tsx`, `src/components/app-sidebar.tsx`, `src/app/page.tsx` — direct codebase reads, this session.
- `.planning/phases/03-sales-pipeline-funnel-view/03-01-SUMMARY.md` through `03-04-SUMMARY.md` — direct reads, established patterns and prior pitfalls.
- `package.json` — direct read, installed dependency versions.
- MDN `encodeURIComponent` behavior — well-established, stable JS platform spec, HIGH confidence (training knowledge, consistent with WebSearch cross-verification this session).

### Secondary (MEDIUM confidence)
- WebSearch: "wa.me click to chat API documentation format" (qualimero.com, green-api.com, saysimple.com, chatarmin.com, markdowntowhatsapp.com — 5+ independent 2026-era guides, consistent format across all) — could not reach WhatsApp's own help-center page directly (fetch attempts to `faq.whatsapp.com` returned truncated content); format cross-verified as MEDIUM confidence, flagged as Assumption A2.
- GitHub `drizzle-team/drizzle-orm#4688` ("push on D1 database or sqlite does not respect where part of partial index") and `#3349`/`drizzle-kit-mirror#461` — read via WebFetch/WebSearch summary this session, confirms partial-unique-index unreliability for the sqlite dialect.

### Tertiary (LOW confidence)
- None — all findings above were either verified directly against this codebase or cross-referenced across multiple independent sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all versions read directly from `package.json`.
- Architecture: HIGH — directly extends patterns already shipped and verified in Phases 1-3 of this same codebase.
- Pitfalls: MEDIUM-HIGH — Pitfalls 1/2/4/5 are direct extrapolations from this codebase's own documented history (Phase 3 gap-closure); Pitfall 3 (drizzle-kit partial index) is sourced from external GitHub issues, not independently reproduced against this project's exact installed version.

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 days — stable domain, no fast-moving dependencies added)
