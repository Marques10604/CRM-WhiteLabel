# Feature Research

**Domain:** CRM pipeline automation — auto-advance on outreach, contact-attempt counters, configurable stale-in-stage alerts (v1.2 milestone, solo lead-tracking CRM)
**Researched:** 2026-07-30
**Confidence:** MEDIUM (commercial CRM patterns verified across multiple sources; scope/sizing judgment is project-specific and grounded in the existing codebase, not externally sourced)

> Scope note: this file covers ONLY the three v1.2 milestone features (auto-advance on WhatsApp contact, contact-attempt counter, configurable stale-in-stage settings). It supersedes the v1.0 FEATURES.md (2026-07-19), which covered the full original app scope (CSV import, pipeline, templates, etc.) — those features are now shipped and validated; see `.planning/PROJECT.md` "Validated" section.

## Feature Landscape

### Table Stakes (Users Expect These)

Features expected once a pipeline board with WhatsApp outreach already exists — without these, the board still requires the exact manual bookkeeping this milestone exists to remove.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auto-advance stage on first-outreach action | Mainstream pipeline CRMs (Pipedrive, HubSpot, Zoho) treat a genuine first-contact activity as a stage-advancing signal, via native activity sync or a one-click workflow rule — manually dragging a card after every WhatsApp click is exactly the "esquecimento" friction this milestone targets | LOW–MEDIUM | Already scoped tightly in PROJECT.md: only `novo`→`contatado`, only on `templates.tipo === "primeiro_contato"` clicks, never regresses/re-advances leads already past `contatado`. This one-directional, single-transition scope is a smart cut versus general "any activity moves any stage" automation, which is genuinely harder to get right (see Anti-Features) |
| Per-stage "days stuck" / stale badge | Pipedrive's "Rotting" feature (per-stage configurable day threshold, red-tinted card, timer resets on activity) is the direct commercial analogue and is considered baseline pipeline hygiene in 2026 CRMs — Freshworks ("staling age") and Zoho ("Idle Deal Alert") ship equivalent concepts | LOW | The project already has this at v1.0 scale: a hardcoded 5-day, `contatado`-only "esfriando" badge computed server-side in `src/app/pipeline/page.tsx`. This milestone's job is to *generalize* the threshold to 3 stages and move the constant into admin-editable settings — not invent new visual language |
| Visible attempt/touch count on the card | Outbound sales tooling (Outreach.io, Salesloft, Apollo cadences) universally exposes a "touch N of M" or attempt count per contact — reps rely on it to answer "have I already tried enough." For a solo admin manually clicking WhatsApp, a simple integer badge answers "did I already try this lead, and how many times" without opening the lead detail | LOW | A plain numeric badge (e.g. "3x") on the pipeline card is sufficient — see Anti-Features for what NOT to build around it (no color escalation, no auto "give up" logic, no channel breakdown) |
| Settings surface to edit thresholds without a code change | Every CRM offering a rotting/staleness feature (Pipedrive, Zoho, Freshworks) exposes the threshold as an admin-configurable number, not a hardcoded constant, because "what counts as stuck" is domain- and admin-specific | LOW | Matches what's already scoped: one `/configuracoes` page, one row per stage (Novo/Contatado/Negociação), one integer input each. No need for per-lead overrides, multiple thresholds per stage, or per-subnicho variants — that granularity targets teams, not a solo admin |

### Differentiators (Competitive Advantage)

None of these three features are meant to differentiate this milestone — PROJECT.md frames them explicitly as catching the app up to CRM baseline ("o sistema acompanha... sozinho, avisando... em vez de depender só da memória do admin"). The one place a solo tool legitimately differs from enterprise CRMs — and where this project should keep differing — is doing all three with near-zero configuration ceremony (no workflow-builder UI, no rule engine), unlike Pipedrive/HubSpot/Zoho's heavier automation-builder UX built for teams.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Toast confirmation on auto-advance ("Lead movido para Contatado") | Silent background stage changes erode trust in the board and push users back to manually re-checking everything — defeating the automation's purpose. Already named in PROJECT.md Active requirements | LOW | Reuses the existing `sonner` toast pattern already used elsewhere in the app (e.g. import confirmations) — no new library or pattern needed |

### Anti-Features (Commonly Requested, Often Problematic)

Extensions that look like natural next steps for these three features but would be over-engineering for a 1-person tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Auto-advance on *any* WhatsApp click (not just `primeiro_contato`), or on *any* lead activity (notes, edits, calls) | "Why only the first-contact template? Any contact is progress" — mirrors how Pipedrive/HubSpot reset rotting timers on almost any activity | Broadens the trigger surface exactly where false positives matter most: a `follow_up` or `prova_valor` template click on a lead already in `negociacao` should not silently move it sideways or backward into `contatado`. PROJECT.md already correctly scopes this out ("sem regredir/re-avançar leads já além de Contatado") — keep it that way | Keep auto-advance scoped to `novo`→`contatado` on `primeiro_contato` clicks only, exactly as decided |
| Treating "wa.me link clicked" as proof the message was actually sent (e.g. auto-logging a confirmed "contact made" fact, or auto-completing the lead's follow-up) | Feels like "the system already knows I clicked, why ask again" | This is the classic CRM automation false-positive: a link click is not delivery, not read, not reply. `wa.me` opens WhatsApp Web/app with the message pre-filled — the admin can still close the tab, edit the message into nonsense, or never actually hit send inside WhatsApp. Because there is no WhatsApp Business API integration (explicitly out of scope per CLAUDE.md), the CRM has zero delivery confirmation and never will in this architecture | Auto-advance the pipeline *stage* only — a soft, reversible signal the admin can drag back if it fired wrongly. Never auto-write irreversible facts (e.g. a "contacted = true" log, or auto-clearing the follow-up date) off a click alone |
| Contact-attempt counter that escalates color (e.g. turns red after 3 attempts) or implies a "give up" threshold | Cadence tools (Outreach, Salesloft) use attempt counts to trigger "remove from sequence" logic, so escalation feels like the natural next step | For a solo admin with no automated cadence engine behind it, an escalating counter invents a decision nobody asked for ("should I stop trying?") without any real logic backing the color change — it becomes noise. Auto-resetting it on stage change would also silently destroy history the admin may want later ("I called this lead 6 times over 2 months before they went cold") | Keep it a simple, permanent, monotonically increasing integer badge — no color escalation, no reset on stage change. It's a memory aid, not a workflow trigger |
| Per-lead or per-subnicho override of stale-in-stage thresholds | "Different sub-nichos convert at different speeds, so thresholds should vary per subnicho too" — enterprise tools like Zoho's Idle Deal Alert support multiple timeout tiers | Multiplies the config surface (3 stages × N subnichos) for a tool with one admin and a still-growing subnicho list — the milestone scope explicitly says "cada [etapa] com seu N configurável," not per-subnicho | Ship per-stage-only thresholds (3 rows on `/configuracoes`); revisit per-subnicho only if real usage shows the single threshold is wrong for a specific niche |
| Notification/email/push alert when a lead goes stale | Pipedrive, Zoho, Freshworks all layer notification/digest systems on top of the visual badge | New infrastructure (delivery, digest scheduling, unsubscribe) for a single user who already opens the app daily by design — redundant with the follow-up dashboard-as-homepage pattern already validated in v1.0 | Extend the existing dashboard/badge visual pattern to reflect the new per-stage thresholds; no new notification channel |
| Auto-advance on WhatsApp click for leads already past `contatado` (e.g. jump `negociacao`→`fechado` on some hypothetical "closing" template) | Natural-feeling extension once `novo`→`contatado` works — "why not automate the whole pipeline" | Later stages represent business *outcomes* (a deal won or lost), not contact-attempt facts. Collapsing "I clicked a WhatsApp template" into "I closed the deal" is a much higher-stakes false positive than a stage nudge into `contatado`. The project's own decision (D-01 in `03-CONTEXT.md`, splitting Fechado/Perdido as distinct, deliberate outcomes) reinforces treating later transitions as admin-confirmed, not inferred | Auto-advance stays confined to the single `novo`→`contatado` transition; all later transitions remain manual drag-and-drop |

## Feature Dependencies

```
Auto-advance Novo→Contatado on WhatsApp click
    └──requires──> Existing WhatsApp send trigger points (WhatsAppSendButton/WhatsAppPreviewDialog,
                    used on dashboard, pipeline cards, lead list, post-import list)
    └──requires──> templates.tipo === "primeiro_contato" (already in schema)
    └──requires──> leads.stage + leads.stageChangedAt (already in schema, already written by the
                    drag-and-drop stage-change path)
    └──requires──> Toast pattern (sonner, already used elsewhere in the app)

Contact-attempt counter
    └──requires──> NEW leads.contactAttempts column (not in current schema — needs a migration)
    └──requires──> Same WhatsApp send trigger points as auto-advance, but fires for ANY template
                    (not gated to primeiro_contato or to stage===novo)
    └──enhances──> Pipeline card UI (pipeline-lead-card.tsx already renders the stage +
                    "esfriando" badge; counter is an additional badge alongside it)

Configurable stale-in-stage settings (/configuracoes)
    └──requires──> NEW settings storage (today's threshold is a hardcoded literal `5` in
                    src/app/pipeline/page.tsx — no settings table/row exists yet)
    └──replaces──> Hardcoded esfriandoLeadIds logic in src/app/pipeline/page.tsx
                    (currently: stage === "contatado" && diff >= 5, single stage only)
    └──enhances──> PipelineBoard / pipeline-lead-card badge rendering (extends "esfriando"
                    from 1 stage to 3: Novo / Contatado / Negociação)

Auto-advance ──shares-trigger-surface-with──> Contact-attempt counter
    (both fire off the same physical action — clicking "Abrir WhatsApp" — but with different
     scope: auto-advance only fires for primeiro_contato + stage===novo; the counter increments
     for ANY template click regardless of current stage)
```

### Dependency Notes

- **Auto-advance requires centralizing the existing WhatsApp trigger points, not adding new ones.** The milestone requires this to work on "todas as telas" — dashboard, pipeline cards, lead list, post-import list all currently render `WhatsAppSendButton`/`WhatsAppPreviewDialog` independently. The advance (and the counter increment) logic must live in one shared place — e.g. the Server Action invoked by the send/confirm flow — rather than being duplicated per screen, or some screens will silently be missed. The existing "first contact auto-trigger" (auto-opens the WhatsApp dialog right after lead creation/import) is a UX precedent for the app acting on a WhatsApp-related event without an extra click, but it is a *different* trigger (creation-time, not click-time) — do not conflate the two code paths.
- **Contact-attempt counter requires a new schema column.** Nothing in `src/db/schema.ts`'s `leads` table currently tracks attempt count — this is new persisted state requiring a Drizzle migration, not a UI-only feature.
- **Configurable stale-in-stage requires new settings persistence before `/configuracoes` can read/write anything.** Today's 5-day/`contatado`-only threshold is a literal `5` in `src/app/pipeline/page.tsx` (~line 32), not a database value. This milestone must introduce some persistence for 3 admin-editable integers (a small `configuracoes`/settings table, or a reused key-value pattern) as a prerequisite.
- **Configurable stale-in-stage replaces, not duplicates, existing logic.** The `esfriandoLeadIds` computation in `pipeline/page.tsx` is the single place that generalizes from (1 stage, fixed 5) to (3 stages, each with its own configurable N) — treat this as a refactor of existing server-side logic, not new logic added alongside the old.
- **Auto-advance and the counter share a trigger surface but must stay decoupled in scope.** Both listen to the same "open WhatsApp" click, but the counter increments unconditionally (any template, any stage) while auto-advance only fires under narrow conditions (`primeiro_contato` + `stage===novo`). Implementing them as one handler with two independent effects (rather than one feature gating the other) avoids a bug class where fixing one condition accidentally breaks the other's.

## MVP Definition

### Launch With (v1.2 — this milestone, per PROJECT.md Active)

- [ ] Auto-advance Novo→Contatado on `primeiro_contato` WhatsApp click, all screens, one-directional (never regresses/re-advances leads past Contatado), toast confirmation — core "system remembers so I don't have to" value prop for this milestone
- [ ] Contact-attempt counter (increments on any WhatsApp click, any template), visible on the pipeline card as a plain badge — cheap (one column, one increment, one badge) and directly answers "have I already tried this lead"
- [ ] `/configuracoes` page with 3 integer inputs (days-stuck threshold per stage: Novo/Contatado/Negociação), replacing the hardcoded 5-day/`contatado`-only constant

### Add After Validation (v1.x)

- [ ] Escalated/staged stale badge treatment (e.g. lighter warning at N days, stronger red past 2N) — only if the admin reports the single-threshold badge doesn't give enough early warning in real use
- [ ] Attempt counter broken down by channel (WhatsApp vs Instagram) — only relevant once Instagram-side tracking exists at all (currently the app only tracks WhatsApp send actions, not Instagram outreach)

### Future Consideration (v2+)

- [ ] Escalated follow-up sequencing tied to attempt count — already flagged in PROJECT.md as "sequência de follow-up escalonada," explicitly deferred to v1.3+
- [ ] Any notification/email/push layer on top of staleness — the dashboard-as-homepage pattern already serves this need; defer indefinitely unless the admin stops checking the dashboard daily

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Auto-advance Novo→Contatado on first-contact WhatsApp click | HIGH | MEDIUM (centralizing the trigger across 4 screens + toast + guarding against regressing later stages is the fiddly part, not the DB write) | P1 |
| Contact-attempt counter (plain badge, any template click) | MEDIUM | LOW (one column, one increment on the existing click handler, one badge render) | P1 |
| Configurable stale-in-stage thresholds (`/configuracoes`, 3 stages) | HIGH | LOW–MEDIUM (new settings persistence + refactor of the existing hardcoded `esfriandoLeadIds` logic to read 3 configurable values instead of 1 constant) | P1 |
| Escalating counter/badge colors, per-subnicho thresholds, notifications | LOW (for a solo user checking the app daily) | MEDIUM–HIGH | P3 |

## Competitor Feature Analysis

| Feature | Pipedrive | Zoho CRM | Our Approach |
|---------|-----------|----------|--------------|
| Stage auto-advance on activity | Advances via workflow-automation rules tied to activity/email sync (requires configuring a rule) | Similar rule-builder requirement via workflow rules | No rule builder — hardcode the single narrow rule (primeiro_contato click → novo→contatado) directly in application code; a solo admin doesn't need a general-purpose rule engine for one rule |
| Stale/rotting deal indicator | "Rotting" feature: per-stage configurable days, red-tinted card, timer resets on almost any activity (notes, emails, edits) | "Idle Deal Alert": configurable timeout durations, can alert at multiple day-milestones per stage (e.g. 5th/10th/15th day) | Simpler than both: per-stage single threshold (no multi-milestone alerts), badge resets only when the admin manually advances the stage — matches the project's existing `esfriando` semantics (tied to `stageChangedAt`, not "last touched anything") |
| Attempt/touch counter | Not a native single-field concept (tracked implicitly via activity history) | Not a native single-field concept either | Purpose-built simple integer field — right-sized for this project rather than an ill-fitting enterprise activity-log pattern |

## Sources

- [Pipedrive — The Rotting Feature (support.pipedrive.com)](https://support.pipedrive.com/en/article/the-rotting-feature) — HIGH confidence, official docs (fetched directly); confirms per-stage config via a "Rotting in (days)" toggle per stage, red-tile visual, timer reset on activities/notes/emails/edits, next-activity-date explicitly excluded from resetting the timer
- WebSearch: "CRM 'deal rotting' OR 'stale deal' alert kanban days in stage configurable per stage" — MEDIUM confidence; corroborates Pipedrive Rotting, and surfaces Zoho CRM's "Idle Deal Alert" (multi-tier per-stage timeout alerts) and Freshworks' "staling age" concept as parallel commercial patterns
- WebSearch: "CRM pipeline auto advance deal stage when email sent OR call logged automation trigger" — MEDIUM confidence, converging pattern across multiple 2026 CRM-automation articles that activity-triggered stage advancement is standard practice, but always via an explicit configured rule/trigger, never fully implicit
- WebSearch: "sales cadence tool call attempts counter increments automatically" (Outreach, Salesloft, Apollo territory) — MEDIUM confidence; confirms the general convention of visible attempt/touch counts in outbound cadence tooling, though no single source details exact visual/reset treatment
- WebSearch: "CRM automation 'mark as contacted' automatically when link clicked false positive risk" — LOW-MEDIUM confidence; results were adjacent (phishing-simulation false-click literature, general CRM automation-mistake write-ups) rather than a WhatsApp-specific precedent, but the underlying principle (a link click is not confirmed delivery/action) is well established and directly informed the Anti-Features conclusion that auto-advance must stay a soft/reversible stage nudge, never an irreversible "contacted" fact
- Internal source (read directly): `src/db/schema.ts`, `src/app/pipeline/page.tsx`, `src/components/whatsapp-send-button.tsx` — HIGH confidence; grounds all "requires new column / requires refactor" dependency claims in the actual current codebase rather than assumption. Confirms: `leads` has no `contactAttempts` field; `templates.tipo` enum includes `primeiro_contato`; the "esfriando" threshold is a hardcoded literal `5` scoped to `stage === "contatado"` only, computed in `pipeline/page.tsx`, not stored anywhere

---
*Feature research for: CRM pipeline automation (solo lead-tracking tool) — v1.2 milestone*
*Researched: 2026-07-30*
