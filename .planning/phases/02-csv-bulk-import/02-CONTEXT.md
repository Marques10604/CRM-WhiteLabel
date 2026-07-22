# Phase 2: CSV Bulk Import - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can import a batch of leads from a cowork-delivered CSV file end-to-end: upload → column mapping → preview (with duplicate-phone flags and unknown-sub-nicho flags) → confirm → bulk insert, each imported lead tagged with its originating batch. No real sample CSV exists yet from the cowork partner — this phase proceeds on documented assumptions (validated against auto-detection, not a fixed format) and must be revalidated against a real file as soon as one is available.

</domain>

<decisions>
## Implementation Decisions

### Formato do CSV (sem amostra real ainda)
- **D-01:** No real cowork CSV sample exists at discussion time. Proceed on assumptions below; validate against a real file as early as possible once the cowork sends one (carried-forward blocker from STATE.md).
- **D-02:** Auto-detect delimiter (comma vs semicolon) rather than assuming one fixed format. Relevant signal: the admin himself uses **Google Sheets**, not Excel, for spreadsheets (free tool) — Google Sheets CSV export defaults to comma+UTF-8, distinct from Excel BR locale's semicolon+variable-encoding convention. Auto-detection (PapaParse supports this natively) covers both.
- **D-03:** Auto-detect file encoding (do not assume UTF-8 fixed) — protects against Windows-1252/Latin-1 exports corrupting accented characters (é/ã/ç).
- **D-04:** Only `nome` + `telefone` are treated as guaranteed columns. All other fields (sub-nicho, origem, canal, valor, notas) are optional/mappable manually in the preview screen — the admin confirmed the cowork sends "whatever I ask for," i.e., column format is not fixed/template-driven.

### Duplicados por telefone (IMPORT-02)
- **D-05:** A row whose phone matches an existing active lead is flagged in the preview screen; the admin decides per-row (Skip / Import anyway) — no auto-skip, no all-or-nothing block.
- **D-06:** Duplicate comparison uses the existing `normalizePhone()` (digits-only, DDI 55) — not raw text comparison — so differently-formatted phones that resolve to the same number are still caught.
- **D-07:** Duplicate detection checks **both directions**: against leads already in the database, AND between rows within the same CSV batch being imported right now (cowork spreadsheets sometimes re-export the same lead twice).
- **D-08:** Confirming "import anyway" on a flagged duplicate **always creates a new, separate lead** — never updates/merges into the existing one. Merge-on-import is explicitly deferred to v2 if ever needed.

### Sub-nicho desconhecido no CSV
- **D-09:** A sub-nicho name in the CSV that doesn't match any existing sub-nicho (same case-insensitive/trim exact-match rule as LEAD-02) is **created automatically** — sub-nichos are already an extensible list by design.
- **D-10:** Newly-created sub-nichos are **highlighted in the preview screen** before the admin confirms ("N sub-nichos novos serão criados: [...]") — gives the admin a chance to catch near-duplicates (e.g. "nutri" vs "nutricionista") by editing the CSV cell before confirming.
- **D-11:** No fuzzy/similarity detection is added for the batch-import case — same rule as Phase 1 (exact case-insensitive/trim match only, admin judgment for near-duplicates). Consistency over cleverness.
- **D-12:** A blank/empty sub-nicho cell **blocks that row** — the preview screen requires the admin to manually pick an existing sub-nicho for that row before it can be confirmed (`subnichoId` is `NOT NULL`, LEAD-03: every lead belongs to exactly one sub-nicho).

### Gatilho de 1º contato em lote (WA-04)
- **D-13:** Batch import **never** auto-triggers the Phase-4 `useFirstContactTrigger` modal per lead — that auto-open behavior stays exclusive to manual single-lead creation (Phase 4 D-18/D-19). Opening N modals in sequence for a 10+ lead batch would be unusable.
- **D-14:** After a successful import, a screen/list shows the newly-imported leads, **each with its own "Enviar WhatsApp" button already in place** (reusing the Phase 4 preview-before-send component, defaulting to the "primeiro contato" template type). The admin clicks through the list one lead at a time, at their own pace — this matches how the admin says they'll operate at first ("no começo eu vou fazer manualmente").

### Claude's Discretion
- Exact schema shape for import-batch tracking (LEAD-05) — e.g. a single `importBatchId` (uuid/timestamp string) column on `leads` vs. a dedicated `import_batches` table — left to research/planning; no admin preference expressed beyond "each imported lead is tagged with its batch."
- Exact route/page structure for upload → mapping → preview → post-import screen, and whether column mapping is a separate step or folded into the preview screen.
- Whether the post-import send screen (D-14) is a dedicated route or a filtered view of `/leads`/dashboard — implementation's call, as long as each recently-imported lead has an inline WhatsApp send button.
- Visual treatment of flagged rows (duplicate / new-sub-nicho / blocked-empty-subnicho) in the preview table.

### Claude's Discretion — scope clarifications (see Deferred Ideas)
- AI-generated, per-lead-personalized outreach messages (researching the niche, adapting text per client) were raised during this discussion but are **explicitly out of scope for v1** per `PROJECT.md` ("Mensagem gerada por IA em tempo real personalizada por lead ... IA fica como possível v2"). Not implemented in this phase — captured as a deferred idea below.
- "Automatic" bulk sending without a manual click per lead is not achievable within the project's no-WhatsApp-Business-API constraint (`CLAUDE.md`) — the in-scope equivalent is D-14 (one-click-per-lead on a post-import list), not a true one-click-send-all.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — IMPORT-01, IMPORT-02, IMPORT-03, LEAD-05
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependencies
- `.planning/PROJECT.md` — Out of Scope section: confirms AI-personalized messaging and WhatsApp Business API/automatic send are explicitly v1-excluded (relevant to D-13/D-14 and the Deferred Ideas below)
- `CLAUDE.md` — WhatsApp constraint (`wa.me` link only, no paid API) driving D-14's design

### Cross-phase dependency (Phase 4 reuse)
- `.planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-CONTEXT.md` — D-18 (manual-creation trigger built to be reusable by future CSV import without a rewrite) and its Deferred Ideas section ("Phase 2 ... its import flow should call into the same auto-trigger mechanism built here for manual creation") — this phase fulfills that expectation, but per D-13 the reuse shape is a per-lead send button on a post-import list, NOT the auto-opening modal itself
- `src/hooks/use-first-contact-trigger.ts` — the reusable hook built in Phase 4 anticipating this phase; researcher must confirm whether this hook (as-is, one-target-at-a-time state) or the underlying `WhatsAppPreviewDialog` component is the better reuse point for D-14's per-row button, since D-13 rules out driving the hook automatically for N leads at once
- `.planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-04-SUMMARY.md` — implementation notes on how the manual-creation trigger was wired, useful precedent for wiring D-14

### Sub-nicho rules (Phase 1)
- `.planning/phases/01-lead-sub-nicho-foundation/01-CONTEXT.md` — D-15/D-16 (sub-nicho management conventions), case-insensitive exact-match dedup rule (LEAD-02) reused as-is by D-09/D-11
- `src/actions/subnicho-actions.ts` — existing `createSubnicho` logic (uniqueIndex + safeParse) to reuse for auto-creating sub-nichos from CSV rows (D-09)

### Stack & existing utilities
- `.planning/research/STACK.md` — PapaParse already the recommended CSV parsing library (client-side, streaming, delimiter auto-detection) — confirms D-02's approach is supported out of the box; not yet installed (`package.json` has no `papaparse` entry as of this discussion)
- `src/lib/phone.ts` — `normalizePhone()`, reused as-is for duplicate comparison (D-06)
- `src/db/schema.ts` — current `leads` table has no batch-tracking column yet; needs additive schema change for LEAD-05 (flag for schema-push gate in planning, same as Phase 3/4's additive migrations)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `normalizePhone()` (`src/lib/phone.ts`) — direct reuse for duplicate-phone comparison (D-06), no reimplementation needed.
- `src/hooks/use-first-contact-trigger.ts` + `WhatsAppPreviewDialog` (Phase 4) — the underlying preview-before-send modal is the right reuse target for D-14's per-row "Enviar WhatsApp" button; the hook's current one-target-at-a-time shape may need a per-row invocation pattern rather than the single auto-trigger it was built for.
- `createSubnicho` (`src/actions/subnicho-actions.ts`) — same Zod-validated, case-insensitive-unique-constrained creation logic should back D-09's auto-create-on-import path, not a parallel implementation.
- `app-sidebar.tsx` `NAV_ITEMS` pattern — same pattern used for `/pipeline`, `/leads`, `/templates` in prior phases; a new import entry point likely needs its own nav item (exact placement is Claude's Discretion).

### Established Patterns
- Server Actions (not API routes) for all mutations — bulk-insert action should follow the same `ActionState`/Zod-validation/`revalidatePath` convention as `createLead`/`createSubnicho`, batched across all confirmed rows in one transaction.
- Soft-delete / `isNull(deletedAt)` conventions from Phase 1 apply unchanged — imported leads are regular leads, no special deletion handling.
- Additive-only schema changes (Phase 3/4 precedent) — LEAD-05's batch-tracking column should follow the same nullable-or-defaulted, no-breaking-migration pattern already used for `motivoPerda`/`stageChangedAt`/`templates`.

### Integration Points
- New upload/mapping/preview UI needs its own route (exact path Claude's Discretion, e.g. `/importar`).
- Bulk-insert Server Action writes into the existing `leads` table (normalized phone/value via existing utilities), plus the new batch-tracking column.
- Sub-nicho auto-creation during import calls the same `createSubnicho`-backing logic already used by `/subnichos`.
- Post-import screen (D-14) reuses the Phase 4 send-WhatsApp button + preview dialog component already used on the dashboard and pipeline cards — not a new send mechanism.

</code_context>

<specifics>
## Specific Ideas

- The admin uses Google Sheets (not Excel) for his own spreadsheet work, specifically to avoid paying for software — a relevant signal that comma+UTF-8 CSV exports are at least as likely a real-world input as Excel BR's semicolon+variable-encoding convention. Auto-detection (D-02/D-03) is the reason this doesn't need to be a hard fork in the implementation.
- The admin's own description of the first-contact message: "a primeira mensagem é sempre uma apresentação e um convite" (introducing himself as a professional, describing his work) — this maps directly onto the existing "primeiro contato" template type from Phase 4 (WA-01/D-09 there); no new template type is needed for this phase.

</specifics>

<deferred>
## Deferred Ideas

- **Mensagens de prospecção personalizadas por IA** — the admin wants, in the future, an AI that researches the lead's niche and personalizes the outreach message per client, as an alternative to writing/selecting a fixed template himself. Explicitly out of scope for v1 (already documented in `PROJECT.md`'s Out of Scope section); the admin re-raised interest in this during this discussion, strengthening it as a v2 candidate. Not folded into Phase 2 or any current-milestone phase.
- **Envio de WhatsApp verdadeiramente automático/em massa (sem clique manual)** — not achievable within the project's no-WhatsApp-Business-API constraint. The in-scope equivalent that was captured instead is D-14 (post-import list with a one-click send button per lead, still admin-clicked, not auto-fired).

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — "Sequência de follow-up escalonada com templates de valor." Matched this phase by generic keyword (`lead`, `admin`) but is not CSV-import scope. Its template-with-value-proof aspect was already folded into Phase 4 (D-09 there, "prova_valor" template type); the escalating-cadence auto-scheduling aspect remains deferred, unrelated to import.

</deferred>

---

*Phase: 02-csv-bulk-import*
*Context gathered: 2026-07-22*
