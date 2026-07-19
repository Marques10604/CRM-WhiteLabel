# Feature Research

**Domain:** Solo-admin lead-tracking CRM (health-niche leads, CSV import, WhatsApp click-to-chat)
**Researched:** 2026-07-19
**Confidence:** MEDIUM-HIGH (patterns cross-verified across multiple CRM vendors, CSV-import tooling vendors, and WhatsApp click-to-chat documentation; no single-source claims used for core recommendations)

## Feature Landscape

### Table Stakes (Users Expect These)

Features a solo user migrating off Google Sheets will assume exist. Missing these makes the tool feel like a downgrade from the spreadsheet.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CSV import with column mapping | Leads arrive in bulk from the cowork partner; re-typing them is a non-starter — this is the #1 reason to abandon Sheets | MEDIUM | Needs: file select → header preview → map columns to fields → validate → confirm. Don't require exact header names; auto-match common variants (nome/name, telefone/phone, email) and let user fix mismatches. |
| Duplicate detection on import | Same cowork batch or re-import of an updated list will otherwise create dupes silently, which is exactly the mess Sheets already has | MEDIUM | Match on phone number and/or email (best unique keys available in this domain). Show count of "N new / M possible duplicates" before committing, don't silently skip or silently overwrite. |
| Import preview before commit | Users need to catch a wrong delimiter/encoding/mis-mapped column before hundreds of bad rows land in the database | LOW-MEDIUM | Show first 3-5 rows mapped to fields; require explicit "Confirm import" step. |
| List view of all leads with sort/filter | Baseline replacement for scrolling a spreadsheet | LOW | Sort by name, stage, follow-up date, value. Filter by sub-niche, stage, channel. |
| Pipeline/kanban board view (Novo → Contatado → Negociação → Fechado/Perdido) | This is the core value prop stated in PROJECT.md — "see the funnel at a glance" | MEDIUM | Drag-and-drop card between columns, or simpler click/dropdown to change stage (drag-and-drop is nicer but not mandatory for v1 — a stage-select dropdown on the card is a legitimate lower-complexity substitute). Column headers show count per stage. |
| Free-text notes per lead | Directly named in requirements; every simple CRM has this, it's the substitute for scattered spreadsheet comment cells | LOW | Single growing text field is enough; timestamped note history is a differentiator, not table stakes, for a solo user. |
| Follow-up date field per lead | Directly named in requirements — this is the #2 core value prop ("never lose track of a follow-up") | LOW | Just a date field is table stakes; the reminder/highlight behavior (below) is what makes it valuable. |
| Visual overdue/due-soon follow-up highlighting | Users expect the system to surface what Sheets couldn't — a color-coded overdue list is the pattern used across CRMs from OnePageCRM to Capsule | MEDIUM | Simplest correct version: a "Follow-ups" view or dashboard widget listing leads with follow-up date <= today (overdue, red) and next 1-3 days (due soon, yellow). No push notifications/email needed for solo browser-only use — a glanceable list on load is sufficient. |
| Contact channel field (Instagram/WhatsApp) | Named in requirements; needed to know how to reach out and for the wa.me flow to apply only when relevant | LOW | Simple select field. |
| Lead source field | Named in requirements — track that leads came from "cowork" vs future sources | LOW | Free text or select; keep extensible like sub-niche. |
| Estimated deal value field | Named in requirements, standard CRM field, needed for "funil de vendas" to be meaningful (not just counts but pipeline value) | LOW | Numeric field; sum-per-stage display is a natural, cheap enhancement (see differentiators). |
| Editable lead detail view | Users need to correct/update any field post-import (phone typos, notes, stage) | LOW | Standard form-based edit. |
| Sub-niche as an extensible list (not hardcoded) | Named explicitly in requirements — user's business already has a growing set of niches, and hardcoding forces a code deploy to add "psicólogo" next month | LOW-MEDIUM | This is really a tagging/category system — see dedicated dependency note below. Must support "type new value" not just "pick from dropdown of fixed options." |
| Filter/segment leads by sub-niche | Named in requirements; needed once >1 sub-niche exists, which is immediate | LOW | Standard filter control once sub-niche exists as a field. |
| WhatsApp template with variable substitution | Named in requirements as the mechanism to speed up outreach — core to the "aumentar produtividade" value prop | MEDIUM | Store templates with placeholders (`{nome}`, `{subnicho}`, etc.); render by substituting from lead fields before building the wa.me link. |
| One-click "open WhatsApp with pre-filled message" (wa.me link) | Named in requirements as the delivery mechanism; this is the entire point of having templates | LOW-MEDIUM | `https://wa.me/<countrycode+number, digits only>?text=<url-encoded message>`. No API, no auth, just link construction + `window.open`. Verified pattern, HIGH confidence — this is the standard, documented WhatsApp click-to-chat mechanism (used by every "WhatsApp link generator" tool and widely documented). |

### Differentiators (Competitive Advantage / High-Value Nice-to-Haves)

Not required to feel "complete," but directly reinforce the stated Core Value (never miss a follow-up, see the funnel at a glance) and are cheap enough to be worth doing given the small scope.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-trigger "send first-contact template" prompt right after CSV import | Turns import from a passive data-entry event into an action queue — directly named in requirements ("system suggests opening WhatsApp with first-contact template") | MEDIUM | E.g., after import, land on a "leads awaiting first contact" list, each row with a one-click wa.me button pre-filled. |
| Auto-surface "send follow-up template" prompt on the follow-up date | Same mechanism as above applied to the follow-up date — this closes the loop between "reminder" and "action," which most generic CRMs treat as two separate disconnected features (a reminder, and separately a click-to-chat button) | MEDIUM | The dashboard's "due today/overdue" list should have the wa.me button inline, not just a bare reminder — removes a navigation step. |
| Pipeline value roll-up per stage (sum of estimated value) | Turns the "kanban" from a count-only funnel into a real sales-forecast view; trivial to add given value field already exists | LOW | Sum + count in each column header, e.g. "Negociação (4) — R$ 12.400". |
| Multiple templates per stage/purpose (first contact, follow-up 1, follow-up 2, re-engagement, closing) | Sheets forces one canned message copy-pasted from a note; a small library of purpose-specific templates is a real productivity multiplier with low added cost once the template+substitution engine exists | LOW-MEDIUM | Simple: templates list with a "type/purpose" label; user manually picks the right one contextually (no need for automatic selection logic). |
| Template variable preview before sending | Reduces the "oops sent {nome} literally" failure mode | LOW | Show rendered message text before generating the link, ideally editable at the last second (user may want to tweak per-lead before opening WhatsApp). |
| Manage sub-niche list explicitly (rename, merge, deactivate) | Prevents the classic tag-sprawl problem ("nutricionista" vs "Nutricionista" vs "nutri") that plagues freeform tagging systems in every CRM researched | LOW-MEDIUM | A small admin screen listing existing sub-niches with rename/merge; still simpler than a generic tag system since this is single-select-per-lead, not multi-tag. |
| Kanban drag-and-drop (vs. dropdown-only stage change) | Nicer, faster interaction once a board view is being built anyway; purely a UX polish over the table-stakes dropdown approach | MEDIUM | Optional upgrade after MVP validates the flow — the dropdown/select version already satisfies the core requirement. |
| "Days in current stage" / stalled-lead indicator | Natural extension of pipeline visibility — surfaces leads stuck in "Negociação" for weeks, a common blind spot in spreadsheets | LOW | Just a computed field from stage-change timestamp; needs stage-change history to be timestamped (minor addition when moving leads). |
| Notes as a timestamped log (not a single blob) | More useful than one free-text field for reconstructing "what happened when" with a lead over months | LOW-MEDIUM | Append-only list of dated notes vs. overwritten single field. |
| Simple full-text search across leads | Faster than filters when the list grows into the hundreds | LOW | Search name/phone/notes. |

### Anti-Features (Commonly Requested, Often Problematic)

Things that look appealing but would add disproportionate complexity or actively work against this project's explicit constraints (solo, browser-only, no API sending).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| WhatsApp Business API / automated sending | "Wouldn't it be nice if it sent automatically?" | Explicitly out of scope per PROJECT.md — requires official WhatsApp Business API account, Meta approval/verification, per-message cost, webhook infrastructure; total mismatch for a solo, zero-budget internal tool | wa.me link + manual click-to-send (already the chosen approach) |
| AI-generated personalized messages per lead | Feels "smarter" than fixed templates | Explicitly deferred in PROJECT.md; requires an LLM API integration, cost per generation, and prompt/quality management — disproportionate for v1 when fixed templates with variable substitution already solve 90% of the "customize per lead" need | Fixed templates with `{variable}` substitution (already the v1 plan); revisit AI as v2 once template approach is validated |
| Multi-user accounts / roles / permissions | "Might add an assistant later" | Explicitly out of scope; adds auth, session management, permission checks, and audit-trail complexity with no current user | Single implicit admin session (or even no login at all if locally hosted/single deployment) — revisit only if a second person actually joins |
| Native mobile app | "Nice to check leads on the go" | Explicitly out of scope; browser-on-computer is the stated usage pattern — building/maintaining a separate mobile client is pure overhead | Responsive web layout is enough if occasional phone browser access happens; no dedicated app |
| Free-form multi-tag system (arbitrary tags per lead, tag clouds, tag analytics) | Tags feel more "flexible" than a single sub-niche field | Research shows freeform tagging without governance reliably fragments into near-duplicate variants ("nutricionista"/"Nutri"/"NUTRICIONISTA") within months, especially with only one person maintaining it inconsistently over time — the requirement is a single categorical field (sub-niche) per lead, not open multi-tagging | A single, extensible (but centrally managed) sub-niche field with an admin list (add/rename/merge) — governance without the multi-tag complexity |
| Full marketing-automation follow-up sequences (auto-scheduled multi-step drip cadences) | Common in "grown-up" CRMs (HubSpot-style workflows) | Way beyond a solo user's needs and beyond "manual click-to-send" constraint — automation implies scheduled/triggered sending, which conflicts with the explicit manual-send requirement | Manual follow-up date + one click to open the pre-filled wa.me link when the user chooses to act |
| Email/calendar sync, call logging, VOIP integration | Standard "grown-up" CRM feature bundle (Pipedrive/Salesforce-style) | Not part of the stated workflow (Instagram/WhatsApp contact only); adds OAuth integrations, sync jobs, and UI surface for channels not used | Keep the channel field simple (Instagram/WhatsApp) with no live integration to either |
| Reporting/analytics dashboards with charts, forecasting, conversion-rate trends | Feels "complete" like enterprise CRMs | Disproportionate for a single admin who can eyeball a kanban board with 4 stages; adds significant build cost for a vanity feature at this scale | The per-stage count + value roll-up (a differentiator above) already gives 90% of the insight a solo user needs |
| Import from other sources (API integrations, form connectors, Zapier) | "Future-proofing" | Only one input source exists today (CSV from cowork) — building generic import infrastructure now is speculative work with no current requirement | CSV import only; revisit if the source channel changes |

## Feature Dependencies

```
CSV Import (with column mapping + duplicate detection)
    └──requires──> Lead data model (name, phone, sub-niche, channel, source, value, stage, follow-up date, notes)
                       └──requires──> Sub-niche field defined (extensible list)

Pipeline / Kanban View
    └──requires──> Lead data model (stage field)
    └──enhances──> Pipeline value roll-up per stage (needs value field too)

Sub-niche filter/segmentation
    └──requires──> Sub-niche field on lead
    └──requires──> Sub-niche admin list (add/rename/merge) [differentiator, but should exist before sub-niche count grows past a handful]

WhatsApp template + variable substitution
    └──requires──> Lead data model (fields to substitute: {nome}, {subnicho}, etc.)
    └──requires──> Template storage (CRUD for templates)
                       └──enables──> wa.me link generation (click-to-chat)
                                          └──enables──> Auto-prompt "send first contact" after import
                                          └──enables──> Auto-prompt "send follow-up" on due date

Follow-up date field
    └──enables──> Overdue/due-soon dashboard highlighting
                       └──enhances──> Auto-prompt "send follow-up" template (wa.me button inline in the reminder list)

Stage-change tracking (timestamp on stage transition)
    └──enables──> "Days in current stage" / stalled-lead indicator [differentiator]

Freeform multi-tag system ──conflicts──> Single-select sub-niche field
    (the project explicitly wants one categorical, extensible sub-niche per lead — not open multi-tagging;
     these are two different data models and should not both be built)
```

### Dependency Notes

- **CSV Import requires the full lead data model to exist first:** column mapping is meaningless without target fields defined (sub-niche, channel, source, value, stage, follow-up date, notes) — the data model is a prerequisite phase, not parallel work.
- **Sub-niche as extensible list requires an admin list, not just a free-text field, once past 2-3 values:** a pure free-text input on every lead-edit screen will fragment into typos/casing variants (the exact anti-pattern research surfaced repeatedly for freeform tagging). A small "manage sub-niches" screen (even just add/rename) should ship alongside the field, not be deferred — this is cheap and prevents the single biggest classic mistake in this feature area.
- **wa.me link generation requires the template + variable system, which requires the lead data model:** the whole click-to-chat flow is downstream of having lead fields to substitute into a stored template string.
- **Auto-prompt behaviors (post-import first-contact, follow-up-due) enhance but do not require anything beyond the base wa.me mechanism** — they're a UI/flow layer (which list you land on, whether the button is inline) on top of the already-required primitives. Cheap to add once the primitives exist, so bias toward including them in an early phase rather than treating them as a distant v2.
- **Freeform multi-tag system conflicts with the sub-niche field:** don't build both a generic tagging engine and a dedicated sub-niche select — pick the single-field extensible-list approach (matches the actual requirement and avoids duplicate/competing categorization UIs).
- **Kanban drag-and-drop enhances but does not require the base pipeline view:** a dropdown-based stage-change control is a legitimate, much lower-complexity substitute that satisfies "move a lead between stages" — drag-and-drop is a nice upgrade, not a blocker for the funnel view.

## MVP Definition

### Launch With (v1)

Minimum viable product — enough to fully replace the Google Sheets workflow and validate the core value prop (never lose a follow-up, see the funnel at a glance).

- [ ] Lead data model: name, phone, sub-niche, channel, source, estimated value, notes, follow-up date, stage — the foundation every other feature depends on
- [ ] Sub-niche as an extensible field with a basic admin list (add new value inline or via a small management screen) — required immediately since 2+ sub-niches exist from day one
- [ ] CSV import with column mapping, preview, and duplicate detection (by phone/email) — this is the actual pain point being solved; without it users keep using Sheets to receive the batch and manually re-enter
- [ ] Pipeline view (columns = Novo/Contatado/Negociação/Fechado/Perdido) with per-column counts, and a way to move a lead between stages (dropdown is sufficient for v1)
- [ ] List view with filter by sub-niche/stage and sort by follow-up date — needed to actually work the list, not just look at the board
- [ ] Follow-up date field + a dashboard/list of overdue and due-soon leads — this is the second named core value prop, must ship in v1
- [ ] WhatsApp template CRUD with `{variable}` substitution + wa.me link generation, usable from the lead detail view — the third named core requirement
- [ ] Post-import prompt to send the first-contact template (even as simple as a "pending first contact" filtered view with an inline wa.me button) — closes the loop between import and outreach, explicitly requested

### Add After Validation (v1.x)

Add once the core loop (import → work pipeline → follow up → send message) is in daily use and proven.

- [ ] Follow-up-due inline wa.me button (merge the reminder list and the send-action into one click) — trigger: user finds themselves navigating reminder → lead detail → template every time
- [ ] Pipeline value roll-up per stage — trigger: user starts asking "what's my pipeline worth" manually
- [ ] Multiple templates per purpose (first contact / follow-up N / re-engagement) — trigger: user finds one template insufficient for different situations
- [ ] Sub-niche management upgrades (merge/deactivate, not just add) — trigger: sub-niche list actually starts accumulating duplicates/unused entries
- [ ] Template message preview/edit before opening WhatsApp — trigger: user reports sending mis-substituted or awkward messages

### Future Consideration (v2+)

Defer until the core tool has been used long enough to know if these are actually wanted.

- [ ] Kanban drag-and-drop — defer because the dropdown-based stage change already satisfies the requirement; drag-and-drop is pure polish
- [ ] "Days in stage" / stalled-lead indicator — defer until stage-change history exists and the user reports leads going stale unnoticed
- [ ] Timestamped note history (vs. single note blob) — defer until single-note-field is reported as insufficient
- [ ] AI-personalized messages — explicitly deferred in PROJECT.md pending template-based approach validation
- [ ] Any reporting/analytics beyond stage counts + value — defer indefinitely unless a specific decision need arises

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Lead data model (all fields) | HIGH | MEDIUM | P1 |
| CSV import (map, preview, dedupe) | HIGH | MEDIUM | P1 |
| Sub-niche extensible field + basic admin | HIGH | LOW | P1 |
| Pipeline/kanban view (dropdown stage-change) | HIGH | MEDIUM | P1 |
| List view with filter/sort | MEDIUM | LOW | P1 |
| Follow-up date + overdue/due-soon dashboard | HIGH | MEDIUM | P1 |
| WhatsApp template CRUD + variable substitution | HIGH | MEDIUM | P1 |
| wa.me link generation | HIGH | LOW | P1 |
| Post-import "send first contact" prompt | MEDIUM | LOW | P1 |
| Follow-up-due inline wa.me button | MEDIUM | LOW | P2 |
| Pipeline value roll-up per stage | MEDIUM | LOW | P2 |
| Multiple templates per purpose | MEDIUM | LOW | P2 |
| Sub-niche merge/deactivate management | LOW-MEDIUM | LOW | P2 |
| Template preview/edit before send | MEDIUM | LOW | P2 |
| Kanban drag-and-drop | LOW-MEDIUM | MEDIUM | P3 |
| Stalled-lead / days-in-stage indicator | LOW | LOW | P3 |
| Timestamped note log | LOW | LOW | P3 |
| Full-text search | LOW | LOW | P3 |
| AI-generated personalized messages | MEDIUM | HIGH | P3 (explicitly deferred) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Generic full CRM (Pipedrive/OnePageCRM/Nutshell) | Google Sheets (current state) | Our Approach |
|---------|---------------------------------------------------|-------------------------------|--------------|
| Pipeline view | Kanban with drag-and-drop, WIP-limit styling, automation rules | None — manual row grouping/color coding, no visual funnel | Simple kanban with stage counts; dropdown-based stage change (drag-and-drop optional later) |
| CSV import | Wizard-style mapping, often with API import too | N/A (data is typed/pasted directly, no structured import step) | Wizard-style mapping + duplicate detection, CSV-only (no API import needed) |
| Categorization | Flexible custom fields + tags + smart lists, often overbuilt for one user | An extra spreadsheet column, freely (and inconsistently) typed | Single extensible sub-niche field with a lightweight admin list — enough structure to avoid typos, not so much it becomes tag-sprawl |
| Follow-up reminders | Task/activity system integrated with calendar, email nudges, sometimes AI "best time to follow up" | A "next contact" column the user must remember to check manually | An overdue/due-soon list surfaced on load — no email/push needed since it's a solo, browser-only tool used daily |
| WhatsApp outreach | Often full Business API integration with auto-send, chatbots, campaign attribution | Copy-paste message from a doc into WhatsApp Web manually, retype phone number each time | Stored templates with variable substitution + one-click wa.me link (pre-filled, phone auto-inserted) — same manual-send safety as Sheets copy-paste, but far less friction |
| Multi-user/permissions | Standard in nearly all commercial CRMs | N/A (shared spreadsheet, no real permission model) | Explicitly out of scope — single implicit admin |

## Sources

- [OnePageCRM — Lead Management](https://www.onepagecrm.com/crm-solution/lead-management/) — kanban stage tracking pattern for lead management, MEDIUM confidence (vendor marketing content, cross-checked against other CRMs)
- [OnePageCRM — Best lead tracking tools 2026](https://www.onepagecrm.com/blog/lead-tracking-tools/)
- [Systeme.io — CRM Pipelines](https://systeme.io/crm-pipelines) — kanban drag-and-drop card pattern, confirms standard pipeline UI
- [monday.com — Lead Tracking Software](https://monday.com/blog/crm-and-sales/lead-tracking-software/)
- [CSVBox Blog — Handle duplicate rows in uploaded spreadsheets](https://blog.csvbox.io/csv-handle-duplicates/) — duplicate detection via unique identifier requirement, MEDIUM-HIGH confidence (specialized CSV-import tooling vendor, consistent with other sources)
- [CSVBox Blog — CSV import column mapping UI](https://appmaster.io/blog/csv-import-column-mapping-ui)
- [ImportCSV — Data import UX: designing spreadsheet imports users don't hate](https://www.importcsv.com/blog/data-import-ux) — File → Map → Validate → Submit flow pattern, confirmed across multiple import-tooling vendors (MEDIUM-HIGH confidence)
- [Dromo — 5 Best Practices to Streamline Your CSV Import Process](https://dromo.io/blog/5-best-practices-to-streamline-your-csv-import-process)
- [WhatsForm — How to Create a WhatsApp Link with Pre-Filled Message](https://whatsform.com/blog/whatsapp-link-pre-filled-message/) — wa.me URL structure (`https://wa.me/<number>?text=<encoded message>`), HIGH confidence, matches WhatsApp's own documented click-to-chat mechanism, cross-verified across multiple independent sources
- [Qualimero — How to Create a WhatsApp Link (wa.me Guide)](https://qualimero.com/en/blog/create-whatsapp-link)
- [Chatarmin — Click to Chat for WhatsApp](https://chatarmin.com/en/blog/click-to-chat-for-whatsapp) — source-tracking-via-distinct-prefilled-message pattern
- [Capsule CRM — How to follow up on leads more effectively](https://capsulecrm.com/blog/how-to-follow-up-more-effectively-in-capsule-crm/) — overdue/color-coded follow-up list pattern
- [Chrysale — Automated follow-up reminders in simple CRM inbox](https://www.chrysales.com/post/automated-follow-up-reminders-simple-crm)
- [Supportbench — Portal taxonomy design: categories vs tags vs custom fields](https://www.supportbench.com/portal-taxonomy-design-categories-vs-tags-vs-custom-fields/) — tags-vs-structured-field distinction, informs the "single extensible field over freeform tags" recommendation
- [AccessAlly — The Ultimate Guide to CRM Tags](https://accessally.com/blog/ultimate-guide-crm-tags/) — documents the tag-sprawl failure mode ("hot lead"/"HOT"/"Hot-VIP" duplication) used to justify the anti-feature recommendation, MEDIUM confidence (vendor content, but the failure pattern is widely corroborated)
- [Fluid CRM — Excel CRM Alternatives for Sales Teams](https://fluidcrm.io/blog/excel-crm-alternatives-sales-teams/) — spreadsheet-CRM pain points (manual maintenance, no reminders/automation) that motivate this project's core value prop
- [Ungrind — Excel as CRM Alternative for Solopreneurs](https://ungrind.ai/compare/excel-crm/)

---
*Feature research for: solo-admin health-niche lead CRM*
*Researched: 2026-07-19*
