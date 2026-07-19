
# Pitfalls Research

**Domain:** Solo-admin CRM / lead-tracker for health-niche leads (CSV bulk import, sales pipeline, WhatsApp wa.me templates)
**Researched:** 2026-07-19
**Confidence:** MEDIUM-HIGH (wa.me formatting and CSV encoding verified against current external sources; pipeline/UX/scope-creep pitfalls verified against multiple independent sources; some domain-specific judgment applied where this project's shape is unusual — single-user, no API, growing taxonomy)

## Critical Pitfalls

### Pitfall 1: Brazilian CSV exports break on delimiter and encoding assumptions

**What goes wrong:**
The CSV delivered by the cowork partner is very likely exported from Excel with a `pt-BR` Windows locale. Excel in locales where the comma is the decimal separator (Brazil included) exports CSV with **semicolons (`;`)** as the field delimiter, not commas — even though the file is still called ".csv". A parser hardcoded to split on `,` will silently produce one giant garbled column instead of failing loudly. Separately, accented characters (ã, ç, é, í) frequently arrive as Windows-1252/Latin-1 encoded bytes, or as UTF-8 with a BOM prefix that shows up as a stray `ï»¿` on the first header name. Interpreting one encoding as another produces mojibake ("NutriÃ§Ã£o" instead of "Nutrição") that then leaks into every generated WhatsApp message.

**Why it happens:**
Developers test CSV import with a file they hand-crafted in a code editor (clean UTF-8, comma-delimited) and never test with an actual Excel-exported, pt-BR-locale file — which is the only kind of file this project will ever actually receive.

**How to avoid:**
- Auto-detect the delimiter (sniff first line for `;` vs `,` vs tab) instead of hardcoding one.
- Use a CSV parsing library that handles quoted fields, embedded delimiters/newlines, and BOM stripping — don't hand-roll `.split(',')`.
- Normalize incoming text to UTF-8 explicitly; strip BOM; if encoding is ambiguous, detect common Latin-1/Windows-1252 mis-decodes and offer a "does this look right?" preview before committing the import.
- Always show an import preview (first 5-10 parsed rows) so the admin visually confirms columns/accents look correct before committing — this catches encoding/delimiter problems even if auto-detection guesses wrong.

**Warning signs:**
Single-column imports, header row showing `ï»¿nome` or similar, accented names rendering with `Ã` sequences, all rows appearing to have only 1 field.

**Phase to address:**
CSV import phase (first phase touching data ingestion) — this must be solved before any other feature is testable with real data.

---

### Pitfall 2: wa.me links break silently due to Brazilian phone number formatting

**What goes wrong:**
`wa.me` requires the number as digits only, in international format, no `+`, no leading zero, no spaces/dashes/parentheses: `https://wa.me/<countrycode><number>`. Brazilian mobile numbers add a 9th digit (`9XXXX-XXXX`) that was rolled out unevenly by region and by carrier — some CSV sources include it, some don't, some include a leading `0`, some include the `+55`, some don't include the country code at all. If the app naively concatenates whatever string is in the CSV `phone` column with `55` prefixed, malformed numbers (double country code, missing/extra digit) produce a wa.me link that either opens WhatsApp Web with the wrong contact, or with "invalid number" — and the admin won't discover this until they're several sends deep into a WhatsApp Web session, at which point trust in the whole product erodes.

**Why it happens:**
Developers test wa.me generation with one clean, self-typed test number and never test against a batch of real numbers from a spreadsheet with mixed formats (some with country code, some without, some with 8-digit legacy mobile format, some with landline DDDs that never got a 9th digit).

**How to avoid:**
- Build a single phone-normalization function applied at import time (and re-run on manual edits): strip all non-digits, detect/strip a leading `55` and re-add it once, detect/strip a leading `0`, validate DDD (2-digit area code) is plausible, and store the normalized digits-only value as the canonical phone field — display formatted, store normalized.
- Do NOT try to "fix" the 9th-digit ambiguity by guessing — the correct move is to preserve exactly what's normalized-from-import and let the admin manually correct on the rare bad case, with an obvious inline "edit phone" affordance right next to the WhatsApp button.
- Test the link generator against a small fixture set of real-shaped numbers: with/without `+55`, with/without leading `0`, with/without the 9th digit, with spaces/dashes/parentheses as typically pasted from a spreadsheet.

**Warning signs:**
wa.me opens with "Não é possível confirmar se esse número está no WhatsApp" or opens a completely different/empty chat; QA only ever tested with the developer's own phone number.

**Phase to address:**
WhatsApp template/link generation phase — but the normalization function should be written and unit-tested independently of the UI, and reused by both the "new lead" first-contact link and the "follow-up" link.

---

### Pitfall 3: Message text isn't properly URL-encoded, corrupting the pre-filled wa.me draft

**What goes wrong:**
The `text=` query parameter of a wa.me link must be URL-encoded. Line breaks, accented characters, and special characters (`&`, `#`, `%`, emoji) inside a template or inside a substituted `{nome}` value, if concatenated into the URL raw instead of run through the platform's URL-encoding function, will either truncate the message at the first `&`/`#`, break the query string, or render broken characters in the pre-filled WhatsApp draft. This is especially likely to bite when templates include a line break between greeting and body ("Olá {nome},\n\nTudo bem?") — the raw `\n` needs `%0A`, not a literal newline character, in the URL.

**Why it happens:**
Developers build the URL via string concatenation ("wa.me/" + phone + "?text=" + message) instead of using the runtime's built-in URI-encoding function on the message portion only.

**How to avoid:**
- Always run the final rendered message (after variable substitution) through the standard URI component encoder before appending to the `text=` parameter — never hand-write percent-encoding.
- Test templates that include: line breaks, accented words, an emoji, and a lead name containing an apostrophe or hyphen (common in Portuguese names).
- Keep templates reasonably short — extremely long pre-filled text can behave inconsistently across WhatsApp Web/Desktop/mobile handoff; there's no hard documented limit, but very long encoded URLs are a smell.

**Warning signs:**
WhatsApp draft message cuts off mid-sentence at a special character, shows `%0A` literally instead of a line break, or the greeting shows "Olá ," when the lead's name is missing/empty in the data.

**Phase to address:**
WhatsApp template/link generation phase — pair with Pitfall 6 (missing variable data) since both surface in the same feature.

---

### Pitfall 4: Follow-up reminders are invisible unless the admin happens to open the app that day

**What goes wrong:**
This is a purely browser-based, no-notification-channel tool (per project constraints: no mobile app, no auth/backend push). If "reminder" only means "a badge appears when you load the page," and the admin doesn't open the CRM on the day a follow-up is due, that lead silently slips past its follow-up date with zero signal — recreating the exact problem (forgotten follow-ups) that this tool exists to solve. The original Google Sheets pain wasn't lack of a due-date column, it was lack of a forcing function to look at it.

**Why it happens:**
Solo-built tools default to "reminder = a color on a table row" because it's the cheapest thing to build, without accounting for the fact that a reminder nobody sees is not a reminder — it's just another field that gets ignored, same as the spreadsheet.

**How to avoid:**
- Make overdue/due-today follow-ups the FIRST thing visible on app load — not a filter the admin has to remember to apply, but the default landing view or a persistent, impossible-to-miss counter/section above the fold.
- Distinguish overdue (red/urgent) from "due today" from "due soon" (e.g., next 2 days) with distinct visual treatment — a flat "has a date" badge undersells urgency.
- Since there's no push/email channel in scope, be honest that the reminder system's entire job is to make the FIRST five seconds of opening the browser tab surface what's overdue — design the home/dashboard view around that, not around a generic lead list.
- Consider (as a cheap, no-infra addition) a browser tab title/favicon badge showing the overdue count, so even a backgrounded tab signals urgency without needing server-side push.

**Warning signs:**
The default view when opening the app is a generic "all leads" table with follow-up date as just another column; overdue leads have the same visual weight as everything else.

**Phase to address:**
Follow-up/reminder phase — should be treated as a dashboard/home-view design problem, not just a data field. Flag for extra care since this directly maps to the project's stated Core Value ("nunca mais perder um follow-up").

---

### Pitfall 5: The 4-stage pipeline hides "gone cold" leads instead of surfacing them

**What goes wrong:**
Novo → Contatado → Negociação → Fechado/Perdido looks clean, but real solo-sales behavior doesn't move in a straight line: most leads get a first message (Contatado) and then... nothing. No reply. They aren't "Negociação" (nothing is being negotiated) and nobody manually drags them to "Perdido" because marking something "lost" feels like admitting defeat and requires an active decision the admin has no forcing function to make. Result: a large silent pile of leads permanently parked in "Contatado," a funnel view that looks healthier than reality, and a pipeline that no longer tells the admin where to focus.

**Why it happens:**
Pipeline stages are usually designed around the desired forward path, not around the failure/limbo path, which is where most leads in a cold-outreach-heavy funnel (health niche via cowork-provided leads) actually spend their time.

**How to avoid:**
- Track "last activity/contact date" per lead independently of stage, and surface leads that have sat in "Contatado" or "Negociação" with no activity for N days (e.g., 14-30) as a distinct "needs attention / going cold" view — this reuses the same overdue-follow-up mechanism from Pitfall 4 rather than requiring a 5th pipeline stage.
- Don't over-solve this by adding many sub-stages (violates the "few stages, clear exit criteria" principle) — instead pair the existing 4 stages with a computed "stale" signal.
- Make moving a lead to "Perdido" a one-click, low-friction action (not a form) so there's no psychological/UI friction stopping the admin from doing routine funnel hygiene.

**Warning signs:**
Funnel view shows a large, growing "Contatado" bucket that never shrinks; admin says "I don't really trust this number" when looking at pipeline counts.

**Phase to address:**
Pipeline/funnel view phase — build the stale-lead signal alongside the funnel visualization, not as a later add-on.

---

### Pitfall 6: Missing/empty variable data silently breaks the message template, and near-duplicate sub-niches fragment the data

**What goes wrong:**
Two related data-quality issues compound each other. First: a CSV row missing a name (or having it in an unexpected column) produces a broken greeting ("Olá , tudo bem?") in the generated wa.me link with no warning at generation time. Second: because sub-niches are free-text and explicitly meant to grow, without any normalization the admin will end up with "Nutricionista", "nutricionista", "Nutrição", and "Nutricionista " (trailing space) as four different filter buckets referring to the same thing — silently fragmenting every filter, funnel-by-niche view, and report the admin relies on.

**Why it happens:**
Free-text fields are the fastest thing to build, but nobody adds duplicate-prevention (case-insensitive matching, trim whitespace, "did you mean X?" suggestion) until after the list is already polluted — and by then it's a manual cleanup job on production data.

**How to avoid:**
- Validate required template variables (at minimum: name) have a non-empty value before generating a link; if empty, either block generation with a clear message or fall back to a generic greeting.
- When creating a new sub-niche (whether via CSV import or manual entry), normalize for comparison (trim, case-fold) against the existing list and suggest the existing match instead of silently creating a near-duplicate; let the admin confirm before a genuinely new one is created.
- Store the canonical display casing once and reuse it everywhere, rather than trusting free-text casing per-row.

**Warning signs:**
Filter dropdown shows near-identical entries; generated messages contain double spaces or a blank where a name should be.

**Phase to address:**
CSV import phase for empty-field validation; sub-niche management phase for the near-duplicate normalization (likely the same phase that introduces "admin can register new sub-niches freely").

---

### Pitfall 7: Re-scoping in "solo tool" features that were explicitly cut

**What goes wrong:**
Even though PROJECT.md explicitly rules out multi-user auth, mobile app, and automated WhatsApp API sending, it's common for these to creep back in mid-build in disguised form: adding a generic `users` table with roles "just in case," building a responsive mobile layout "since it's easy with the framework," reaching for a WhatsApp Business API/Twilio integration mid-project to "make it more automatic," or building a permissions system around sub-niches (e.g., "what if someone else manages nutricionista leads later"). Each of these adds real implementation and testing surface area for a need that doesn't exist yet and may never exist, at direct cost to shipping the actual reminder/pipeline value.

**Why it happens:**
Developers (including solo ones) default to "build it generically so it's easy to extend later" — but for a single admin with no near-term plan for a team, this is pure speculative cost with no current payoff, and it's the single most common way solo CRM-building projects stall or bloat.

**How to avoid:**
- Treat every "Out of Scope" line in PROJECT.md as a hard boundary during implementation, not just during planning — if a phase's design starts requiring a `users`/`roles`/`permissions` concept, that's a signal scope has crept.
- No responsive/mobile-specific work — browser-on-computer only, per constraint. Don't invest in mobile breakpoints, touch gestures, etc.
- If WhatsApp API integration is raised again mid-build, treat it as a v2 decision requiring an explicit new decision-log entry, not something to "just add since we're in the code anyway."
- Prefer the simplest persistence approach adequate for one user and a few hundred/thousand leads (no need for horizontal scaling, multi-tenant data isolation, or role-based access control patterns).

**Warning signs:**
A pull/change touches auth, adds a `role` or `tenant_id` column, adds mobile-specific CSS, or introduces a third-party messaging API client.

**Phase to address:**
Applies across all phases — call out explicitly in roadmap as a standing constraint/checklist item, not a single phase.

---

### Pitfall 8: No safety net for accidental data loss on the single source of truth

**What goes wrong:**
Once this tool replaces the Google Sheet, it becomes the sole record of real business leads and their history — there is no "check the spreadsheet version history" fallback anymore. A misclick that deletes a lead, an import that overwrites existing data instead of appending, or a pipeline-stage bulk action gone wrong has no recovery path if there's no soft-delete/trash and no way to see/undo the last CSV import.

**Why it happens:**
Solo tools built to replace "just a spreadsheet" often don't get the safety nets a spreadsheet accidentally has for free (undo history, tab duplication before big changes) — hard deletes and destructive imports feel fine in a dev/test environment where the data doesn't matter yet.

**How to avoid:**
- Soft-delete leads (mark as removed/archived, keep recoverable for a period) instead of hard-deleting.
- Tag every CSV import with a batch identifier and timestamp so a bad import can be identified and reversed (e.g., bulk-remove/rollback "leads from import #7") without affecting leads from other imports.
- Before a bulk CSV import commits, always show the preview/confirmation step (ties back to Pitfall 1) — this doubles as the last line of defense against importing the wrong file or a duplicate re-import of the same batch.
- Consider basic duplicate detection on import (same normalized phone number already exists) and ask the admin whether to skip, update, or create a new lead — rather than silently creating duplicates on re-import of the same cowork CSV.

**Warning signs:**
No "trash" or "undo" concept anywhere in the design; re-running the same CSV import produces duplicate leads instead of a warning.

**Phase to address:**
CSV import phase (duplicate detection, import batch tracking) and a cross-cutting "data safety" concern that should be a checklist item in any phase touching delete/bulk-write operations.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding `,` as the only CSV delimiter | Faster to build the first import | Breaks on the very first real Excel/pt-BR export the admin uses | Never — this is the actual expected input, not an edge case |
| Storing phone number as raw imported string, formatting only at display/link time | Skips writing a normalizer up front | Every wa.me link generation re-derives formatting inconsistently; dedup becomes impossible | Only acceptable if a single normalization pass happens at import and the normalized value is what's stored/reused |
| Free-text sub-niche field with no duplicate-checking | Fastest way to satisfy "extensible list" requirement | Filter/report fragmentation over time (Pitfall 6) | Acceptable for a throwaway prototype only; not for the real tool given sub-niches are meant to accumulate over months |
| Hard-delete leads with no confirmation/trash | Simpler CRUD code | Irrecoverable loss of real business data | Never, for this project — it's the sole system of record |
| No import batch tracking (leads just get inserted) | Simpler import code | Can't identify/undo a bad or duplicate import later | Acceptable only in a throwaway prototype, not once real cowork CSVs are being imported regularly |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| wa.me link | Phone number includes `+`, spaces, leading zero, or is missing/duplicating the `55` country code | Normalize to digits-only, single `55` prefix, no formatting characters, before building the link |
| wa.me link | Message text concatenated raw into the query string | Always URL-encode the rendered message text (after variable substitution) before appending as `text=` |
| CSV parsing | Naive `split(',')` on raw file text | Use a real CSV parser that handles quoted fields, embedded delimiters/newlines in notes, and sniffs the actual delimiter used |
| CSV parsing | Assuming file is UTF-8 without BOM | Detect/strip BOM; handle common Latin-1/Windows-1252 fallback; show a preview before committing |
| WhatsApp Web handoff | Assuming `wa.me` link always opens directly into a chat | Some environments prompt to choose WhatsApp Web vs Desktop vs "keep me signed in" — no code fix needed, but don't assume zero-click delivery; the admin still manually reviews/sends |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering the entire lead table client-side with no pagination/virtualization | UI feels fine at first, then scroll/filter gets sluggish | Paginate or virtualize the lead list from the start; it's cheap to add early, expensive to retrofit | Once accumulated leads (across many CSV batches over months/years) reach roughly a few thousand rows in an unoptimized table |
| Recomputing "is this follow-up overdue" and stale-lead signals on every render instead of once per data load | Sluggish dashboard as lead count grows | Compute derived reminder/stale flags once when data loads or changes, not inline in every render pass | Noticeable once lead count is in the low thousands, depending on framework |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No auth at all combined with deploying the app on a publicly reachable URL | Anyone with the URL can view/edit personal lead data (names, phone numbers, health sub-niche categorization — sensitive personal data under Brazilian LGPD) | If deployed anywhere beyond localhost, add at minimum a simple shared password gate or restrict access (private hosting, VPN, IP allowlist) even though multi-user auth is out of scope — "no auth" should mean "no accounts," not "no access control at all" |
| Treating health-adjacent lead categorization (sub-niches like "terapeuta," "nutricionista") as non-sensitive because it's just a CRM field | Leaks about a person's engagement with health services are more sensitive than generic sales-lead data | Don't log this data to third-party analytics/error-tracking tools without scrubbing; keep exports/backups access-controlled the same as the live app |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Overdue and upcoming follow-ups shown with the same visual weight as everything else | Admin doesn't notice urgency, defeats the tool's core value | Distinct color/urgency treatment for overdue vs. due-today vs. due-soon, prioritized on the default/home view |
| Moving a lead through pipeline stages requires multiple clicks/menus | Admin avoids updating stage, pipeline view becomes stale/inaccurate | One-click or drag-and-drop stage transitions from the lead's row/card itself |
| CSV import commits immediately with no preview | Silent misimport (wrong columns, encoding garbage, duplicate batch) discovered only later, hard to reverse | Always show a parsed preview and explicit confirm step before writing to the database |
| No quick way to search/filter notes or lead history | Admin loses context on why a lead is at a given stage, re-reads everything manually | Simple text search across name/notes, plus visible follow-up/contact history per lead |
| WhatsApp template variable rendering not previewed before opening wa.me | Admin sends (or almost sends) a broken/blank-name message | Show the fully rendered message text in-app before generating/opening the wa.me link, so the admin catches empty variables |

## "Looks Done But Isn't" Checklist

- [ ] **CSV import:** Only tested with a clean, hand-made comma-delimited UTF-8 file — verify against an actual Excel export saved with a pt-BR/Brazilian locale (semicolon delimiter, possible BOM/Latin-1 encoding, accented characters).
- [ ] **wa.me link generation:** Only tested with one clean self-typed phone number — verify against a batch of real-shaped numbers (with/without `+55`, with/without leading `0`, with/without the 9th mobile digit, with spaces/dashes/parentheses as pasted from a spreadsheet).
- [ ] **Message templates:** Only tested with a simple one-line ASCII message — verify with line breaks, accented Portuguese text, an emoji, and a lead name containing an apostrophe/hyphen, confirming the encoded URL still opens a correctly formatted WhatsApp draft.
- [ ] **Follow-up reminders:** Only tested with the browser tab open and today's date — verify overdue calculation persists correctly after closing and reopening the browser the next day, and that the "needs attention" view is what the admin sees first, not a view they must navigate to.
- [ ] **Pipeline/funnel counts:** Only tested with a handful of manually created leads — verify counts stay accurate after a bulk CSV import, after filtering by sub-niche, and after leads sit unmoved for a long period (no double-counting, no leads invisible in every view).
- [ ] **Sub-niche management:** Only tested by adding a brand-new sub-niche — verify renaming or attempting to remove a sub-niche in use doesn't orphan or silently reassign existing leads.
- [ ] **Delete/bulk actions:** Only tested that deletion "works" — verify there's a recovery path (soft delete/trash) before treating this as done, since there is no external backup (spreadsheet) once this tool is adopted.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Bad/duplicate CSV import committed | MEDIUM | If imports are tagged with a batch ID, bulk-remove all leads from that batch ID and re-import correctly; without batch tagging, this becomes a manual, error-prone cleanup |
| Malformed phone number produces broken wa.me link | LOW | Manually edit the phone field on the lead; regenerate the link — cheap if the phone field is directly editable next to the WhatsApp action |
| Accidentally deleted lead(s), no trash implemented | HIGH | No recovery without a database backup/restore; this is exactly why soft-delete should be built in from the start rather than retrofitted after a real loss |
| Near-duplicate sub-niches polluting filters | MEDIUM | One-time manual merge/rename pass mapping duplicates to a canonical sub-niche, then add normalization going forward to prevent recurrence |
| Funnel showing stale/inflated "Contatado" bucket | LOW | Add the "last activity" stale-lead signal (Pitfall 5) after the fact and do a one-time manual sweep to mark genuinely dead leads as "Perdido" |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| CSV delimiter/encoding mismatch (Pitfall 1) | CSV import phase | Import a real Excel pt-BR-locale export as a test fixture; confirm accents and columns render correctly, with a preview step before commit |
| Broken wa.me links from phone formatting (Pitfall 2) | WhatsApp link generation phase | Unit-test the phone normalizer against a fixture list of real-shaped Brazilian numbers (with/without 9th digit, country code, leading zero) |
| Broken message encoding (Pitfall 3) | WhatsApp link generation phase | Generate a link from a template with line breaks + accents + emoji; confirm the resulting URL opens a correctly rendered WhatsApp draft |
| Invisible follow-up reminders (Pitfall 4) | Follow-up/reminder phase | Confirm the overdue/due-today view is the default landing state, not something requiring navigation or a filter to be applied |
| Pipeline hides cold/stale leads (Pitfall 5) | Pipeline/funnel view phase | Confirm a "no activity in N days" signal exists independent of stage, and moving a lead to "Perdido" is a one-click action |
| Missing template variables / near-duplicate sub-niches (Pitfall 6) | CSV import phase + sub-niche management phase | Import a CSV with a blank name field and confirm the app blocks/flags message generation; attempt to add a near-duplicate sub-niche and confirm it's caught |
| Scope creep into auth/multi-tenancy/mobile/API sending (Pitfall 7) | Cross-cutting, all phases | Roadmap/phase reviews explicitly check no phase introduces users/roles/tenant concepts, responsive/mobile work, or WhatsApp API clients |
| No recovery from accidental data loss (Pitfall 8) | CSV import phase (batch tracking, duplicate detection) + any phase adding delete/bulk actions | Confirm soft-delete exists before any hard-delete UI ships; confirm import batches are identifiable and reversible |

## Sources

- [How to Create a WhatsApp Link (wa.me Guide) - Qualimero](https://qualimero.com/en/blog/create-whatsapp-link)
- [wa.me link: what it is and how it works | SendApp](https://sendapp.live/en/glossary/wa-me-link/)
- [WhatsApp: Brazilian phone numbers not normalized (9th digit issue)](https://github.com/openclaw/openclaw/issues/20187)
- [A brief note on the inconsistencies for mobile numbers and WhatsApp IDs in Brazil (digit '9') & Mexico (digit '1') – Gupshup](https://support.gupshup.io/hc/en-us/articles/4407840924953-A-brief-note-on-the-inconsistencies-for-mobile-numbers-and-their-WhatsApp-IDs-in-Brazil-digit-9-Mexico-digit-1)
- [How To Normalize International Phone Numbers For WhatsApp | Wassenger](https://wassenger.com/blog/en/how-to-normalize-international-phone-numbers-for-whatsapp)
- [Telephone numbers in Brazil - Wikipedia](https://en.wikipedia.org/wiki/Telephone_numbers_in_Brazil)
- [CSV Encoding Issues: UTF-8, BOM, and Character Fixes Explained - Flipper File](https://flipperfile.com/text-guides/csv-encoding-issues/)
- [CSV Encoding Explained: UTF-8 vs Windows-1252 vs ISO-8859-1 - neatcsv](https://neatcsv.com/blog/csv-encoding-explained)
- [Semicolon column separator instead of comma when exporting CSV UTF-8 - Microsoft Community Hub](https://techcommunity.microsoft.com/discussions/excelgeneral/semi-colon--column-separator-instead-of-comma--when-we-export-as-csv-utf-8-file-/414983)
- [How to change Excel CSV delimiter to comma or semicolon - Ablebits](https://www.ablebits.com/office-addins-blog/change-excel-csv-delimiter/)
- [8 Common Sales Pipeline Mistakes to Avoid - Leadfeeder](https://www.leadfeeder.com/blog/conversion-optimization/sales-pipeline-mistakes/)
- [CRM Funnel Stages: Setup Guide + Benchmarks - Prospeo](https://prospeo.io/s/crm-funnel-stages)
- [Best Authentication Solutions for Indie Hackers - F³ Fund It](https://f3fundit.com/best-authentication-solutions-indie-hackers-2026/)
- [Never Miss an Important CRM Alert Again: Introducing Snooze - Inogic](https://www.inogic.com/blog/2025/04/never-miss-an-important-crm-alert-again-introducing-snooze-in-dynamics-365-notifications/)
- [Personal CRM Follow-Up Reminders That Actually Work - Relatable](https://www.bemorerelatable.com/blog/personal-crm-follow-up-reminders-that-work)
- Domain reasoning applied where general web sources don't cover this project's specific shape (single-user browser tool, no notification channel, extensible free-text taxonomy) — flagged inline where judgment rather than an external source is the basis.

---
*Pitfalls research for: Solo-admin health-niche lead CRM (CSV import, pipeline, wa.me templates)*
*Researched: 2026-07-19*
