---
phase: 04-follow-up-dashboard-whatsapp-outreach
verified: 2026-09-02
status: passed
score: 21/21 must-haves (code-level) + 7/7 cenários de UAT (code+data, Fase 18) — 0 issues
overrides_applied: 0
human_verification: []
method: "código (verificação inicial 2026-07-22) + code+data (Fase 18 / AUDIT-03, 2026-09-02 — navegador bloqueado por hardware)"
---

# Phase 4: Follow-up Dashboard & WhatsApp Outreach Verification Report

**Phase Goal:** Admin never misses a follow-up and can reach out via WhatsApp in one click, using ready-made templates, right from the dashboard, the reminders list, and the pipeline
**Verified:** 2026-07-22 (código) → promovido a `passed` em 2026-09-02 (Fase 18, AUDIT-03)
**Status:** passed
**Re-verification:** Sim — promoção de `human_needed` → `passed` pela auditoria retroativa da Fase 18.

## Promoção de status (Fase 18 — AUDIT-03, 2026-09-02)

A verificação inicial (2026-07-22) fechou 21/21 must-haves no nível de código e deixou o
relatório em `human_needed` com 7 verificações humanas pendentes (frontmatter, agora
`human_verification: []`) — nenhum navegador tinha sido usado por nenhum dos 4 planos da fase.

A Fase 18 (auditoria retroativa) executou os 7 cenários de `04-HUMAN-UAT.md` por **code+data**
(o UAT ao vivo no navegador foi bloqueado por hardware — host de 4GB, ver `18-01-SUMMARY.md`).
`04-HUMAN-UAT.md` está `complete` (7/7 pass, 0 issues). Mapeamento dos 7 itens de
`human_verification` → cenário de `04-HUMAN-UAT.md`:

| Item `human_verification` (original) | Cenário 04-HUMAN-UAT | Resultado | Método |
|---|---|---|---|
| Dashboard 3 seções + estado vazio + "Novo lead" local | 1 | pass | code+data (`page.tsx`+`queries.ts`+`followup-dashboard.tsx`; `test:group-by-urgency`) |
| CRUD templates + "um padrão por tipo" | 2 | pass | code+data (`template-actions.ts` transação; `data/crm.db` = 1 padrão/tipo) |
| Botão WhatsApp + preview ao vivo + pipeline sem colisão | 3 | pass | code+data (`whatsapp-preview-dialog.tsx` `waHref` recomputado; `stopPropagation` pointerdown+click) |
| Auto-gatilho 1º contato nas 3 superfícies, nunca na edição | 4 | pass | code+data (`lead-form-dialog.tsx:153` guard `!isEditMode && state.lead`; `updateLead` nunca devolve `lead`) |
| CR-01 boundary de 7 dias | 5 | pass | **harness** `test:group-by-urgency` (asserção literal "today+7 cai em proximos7Dias") |
| CR-02 race no drag-to-Perdido | 6 | pass | code+data + **live** herdado da quick 260828-gna |
| WR-01/WR-02 stageChangedAt + limpeza de motivoPerda | 7 | pass | code+data (`createLead` grava `stageChangedAt`; idioma condicional-por-valor-alvo; `verify:motivo-perda`) |

## Método de Verificação (Fase 18)

- **code+data:** leitura da superfície (componente + Server Action + schema) + query direta no
  `data/crm.db` (só SELECT) + harnesses `test:group-by-urgency`, `test:lead-actions`,
  `verify:motivo-perda` (todos exit 0).
- **O que um pass de navegador ainda acrescentaria:** renderização visual das 3 seções de
  urgência e do estado vazio "Tudo em dia!" (não observável hoje — 23 leads ativos), badge
  "Padrão" dos templates, toasts, a disambiguação pointer real (drag vs. clique) no card do
  pipeline, e a animação de fechamento do `WhatsAppPreviewDialog` (WR-04). Nenhum desses tem
  indício de estar quebrado por inspeção.

## Goal Achievement (verificação inicial — 2026-07-22)

### Observable Truths

## MVP Mode Goal-Format Discrepancy (informational)

ROADMAP.md declares `**Mode:** mvp` for Phase 4, but the `**Goal:**` line is written in prose, not in the canonical User Story format (`As a [role], I want to [capability], so that [outcome].`). Ran the format guard directly:

```
gsd-sdk query user-story.validate --story "Admin never misses a follow-up and can reach out via WhatsApp in one click, using ready-made templates, right from the dashboard, the reminders list, and the pipeline" --pick valid
→ false
```

Per `references/verify-mvp-mode.md`, this means the MVP-mode "User Flow Coverage" framing must not be attempted against this goal (would be low-quality). 04-01-PLAN.md already anticipated this gap and derived a compliant fallback user story ("Como admin do CRM, quero abrir o sistema já vendo meus follow-ups... para nunca mais perder um follow-up") with an explicit note recommending `/gsd mvp-phase 4` if the canonical format is required. This verification proceeds with the standard (non-MVP-framed) goal-backward methodology using ROADMAP Success Criteria + PLAN `must_haves` as the must-have contract — the same criteria the MVP-derived user story would map to. **Recommend running `/gsd mvp-phase 4` to correct ROADMAP.md's goal format for future audits**, but this is not a blocker for this phase's technical delivery.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (REMIND-01/SC1) Opening `/` shows follow-ups grouped by urgency by default, no filter needed | ✓ VERIFIED | `src/app/page.tsx` calls `getActiveDashboardLeads()`+`groupLeadsByUrgency()`, renders `<FollowupDashboard>`; confirmed live via `npm run build` route table (`○ /`) |
| 2 | Full lead list remains accessible at `/leads` | ✓ VERIFIED | `src/app/leads/page.tsx` — verbatim `isNull(deletedAt)` query + `<LeadTable>`; route present in build output |
| 3 | Clicking a dashboard item reopens `LeadFormDialog` in edit mode | ✓ VERIFIED | `followup-dashboard.tsx:160` `onClick={() => setDialogState({ mode: "edit", lead })}` |
| 4 | Empty state shows "Tudo em dia!" + local "Novo lead" creation (no nav) | ✓ VERIFIED | `followup-dashboard.tsx:110-127`, `DialogState` includes `{ mode: "create" }` |
| 5 | Sidebar shows 6 items (Follow-ups/Leads/Pipeline/Templates/Sub-nichos/Lixeira) | ✓ VERIFIED | `app-sidebar.tsx:7-14` — exact 6 entries, correct order/labels |
| 6 | Dashboard scope = active leads only (excludes fechado/perdido), no pagination | ✓ VERIFIED | `queries.ts:14-20` — `notInArray(leads.stage, ["fechado","perdido"])`, no `.limit()` |
| 7 | (WA-01) Admin can create/edit templates with `{nome}`/`{subnicho}`/`{origem}` variables | ✓ VERIFIED | `templateSchema` + `template-form-dialog.tsx` FieldDescription references all 3 vars; `renderTemplate()` substitutes them |
| 8 | Templates managed at `/templates`, own sidebar item | ✓ VERIFIED | `src/app/templates/page.tsx` + nav entry `{ href: "/templates" }` |
| 9 | (D-13) Admin can edit/delete (hard delete w/ confirmation) a template | ✓ VERIFIED | `deleteTemplate()` = `db.delete(...)`; `DeleteTemplateDialog` confirmation modal wired |
| 10 | (D-12) Exactly one default template per type, atomic | ✓ VERIFIED | `applyDefaultTemplate()` uses `db.transaction(async (tx) => {...})`, awaited at all 3 call sites (WR-03 fix confirmed in code) |
| 11 | `templates` table exists in the live DB after `drizzle-kit push` | ✓ VERIFIED | Direct query against `./data/crm.db`: `sqlite_master` returns `templates`; `PRAGMA table_info` returns all 7 expected columns |
| 12 | (WA-05/D-14) WhatsApp send button inline in dashboard items and pipeline cards, independent of `canal` | ✓ VERIFIED | `WhatsAppSendButton` rendered in `followup-dashboard.tsx:186` and `pipeline-lead-card.tsx:72`, no `canal` check gating it |
| 13 | (WA-03) Clicking button opens preview modal with filled message, never direct to wa.me | ✓ VERIFIED | Button `onClick` sets `PreviewState`; `WhatsAppPreviewDialog` renders `<a href={waHref}>`, no direct navigation on button click |
| 14 | Preview textarea editable; wa.me link reflects live edits; type selector present | ✓ VERIFIED | `whatsapp-preview-dialog.tsx:108-109` — `waHref` recomputed every render from live `texto` state (Pitfall 4 respected); `Select` for `tipo` present |
| 15 | (WA-02) Link = `https://wa.me/<tel>?text=<encoded>`, new tab, `rel="noopener noreferrer"` | ✓ VERIFIED | `whatsapp.ts:buildWaLink()` matches exactly; anchor has `target="_blank" rel="noopener noreferrer"`; automated encode test passed (accents/emoji/`\n`→`%0A`) |
| 16 | (D-17) Invalid phone → button disabled with tooltip | ✓ VERIFIED | `disabled={normalizePhone(lead.telefone) === null}` in both surfaces; `title="Telefone inválido — edite o lead"` in `WhatsAppSendButton` |
| 17 | (WA-04) Saving a NEW lead auto-opens 1st-contact preview with default template | ✓ VERIFIED | `lead-form-dialog.tsx:129-134` — `if (!isEditMode && state.lead) firstContact.trigger(...)`; `createLead` returns `{success:true, lead}` via `.returning()` |
| 18 | Auto-opened preview shows mandated UI-SPEC subtitle | ✓ VERIFIED | `lead-form-dialog.tsx:423` — literal string `Sugestão: enviar mensagem de primeiro contato para ${...}.` |
| 19 | (D-20) Closing auto-opened preview without sending does not undo lead creation | ✓ VERIFIED | Lead is persisted by `createLead` *before* `firstContact.trigger()` is ever called; `close()` only clears local dialog state |
| 20 | (D-21) Auto-trigger fires on every manual creation, no opt-out | ✓ VERIFIED | No checkbox/config gating the `trigger()` call; unconditional on `!isEditMode && state.lead` |
| 21 | Editing an existing lead does NOT trigger the auto-open | ✓ VERIFIED | Guard `!isEditMode` — `updateLead` never returns `lead` in its `ActionState`, doubly safe |

**Score:** 21/21 truths verified at the code level (data flow traced end-to-end: DB query → Server Component → props → client render, no stubs/hardcoded empty data found).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries.ts` | `getActiveDashboardLeads()` + `groupLeadsByUrgency()` | ✓ VERIFIED | Both exported, pure grouping fn, `notInArray` present, CR-01 off-by-one fixed (`addDays(today,8)`) |
| `src/app/page.tsx` | Dashboard Server Component | ✓ VERIFIED | Fetches active leads + templates, groups by urgency, renders `FollowupDashboard` |
| `src/app/leads/page.tsx` | Full lead list moved from `/` | ✓ VERIFIED | Verbatim query + `LeadTable`, now also fetches `templates` for WA-04 |
| `src/components/followup-dashboard.tsx` | 3 urgency sections + empty state + WhatsApp button | ✓ VERIFIED | All sections, empty-section omission, click→edit, WhatsApp button wired |
| `src/components/app-sidebar.tsx` | 6-item NAV_ITEMS | ✓ VERIFIED | Exact order/labels confirmed |
| `src/db/schema.ts` | `templates` table | ✓ VERIFIED | Matches spec exactly; no partial `uniqueIndex().where()` (Pitfall 3 avoided) |
| `src/actions/template-actions.ts` | CRUD + `setDefaultTemplate` | ✓ VERIFIED | All 4 exports present; `applyDefaultTemplate` async+awaited (WR-03 fixed) |
| `src/lib/validations.ts` | `templateSchema` | ✓ VERIFIED | PT-BR messages present, `isDefault` coerced boolean |
| `src/app/templates/page.tsx` | `/templates` route | ✓ VERIFIED | Server Component, `TemplateList` rendered |
| `src/components/template-form-dialog.tsx` | Create/edit modal | ✓ VERIFIED | react-hook-form + Zod + native checkbox (no new registry item) |
| `src/lib/whatsapp.ts` | `renderTemplate`/`buildWaLink` | ✓ VERIFIED | Pure functions; automated encode test passed |
| `src/components/whatsapp-preview-dialog.tsx` | Preview modal | ✓ VERIFIED | Live `texto`→`waHref` binding; WR-04 fixed (Dialog stays mounted while closing) |
| `src/components/whatsapp-send-button.tsx` | Icon button | ✓ VERIFIED | `MessageCircle`, `title` tooltip when disabled |
| `src/hooks/use-first-contact-trigger.ts` | `useFirstContactTrigger` | ✓ VERIFIED | Exported, `trigger`/`close`/`open` present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/page.tsx` | `src/db/queries.ts` | import `getActiveDashboardLeads`/`groupLeadsByUrgency` | ✓ WIRED | Confirmed |
| `followup-dashboard.tsx` | `etapa-badge.tsx` | `EtapaBadge` per item | ✓ WIRED | Confirmed |
| `followup-dashboard.tsx` | `lead-form-dialog.tsx` | `LeadFormDialog` edit+create modes | ✓ WIRED | Confirmed |
| `template-actions.ts` | `db/schema.ts (templates)` | `db.insert/update/delete` + `db.transaction` | ✓ WIRED | Confirmed, transaction now async/awaited |
| `template-actions.ts` | `revalidatePath` | `/templates`, `/`, `/pipeline` on every mutation | ✓ WIRED | Confirmed in all 4 actions |
| `template-form-dialog.tsx` | `validations.ts (templateSchema)` | `zodResolver` | ✓ WIRED | Confirmed |
| `whatsapp-preview-dialog.tsx` | `whatsapp.ts` | `buildWaLink(normalizePhone(...), texto)` | ✓ WIRED | Confirmed, texto is live state not memoized |
| `whatsapp-preview-dialog.tsx` | wa.me (external) | `<a target="_blank" rel="noopener noreferrer">` | ✓ WIRED | Confirmed |
| `followup-dashboard.tsx` | `whatsapp-send-button.tsx` | inline per item | ✓ WIRED | Confirmed, `stopPropagation` wrapper |
| `pipeline-lead-card.tsx` | `whatsapp-send-button.tsx` | inline per card | ✓ WIRED | Confirmed, `stopPropagation` on both `onPointerDown`/`onClick` |
| `lead-form-dialog.tsx` | `use-first-contact-trigger.ts` | trigger on createLead success only | ✓ WIRED | Confirmed guard `!isEditMode && state.lead` |
| `lead-form-dialog.tsx` | `whatsapp-preview-dialog.tsx` | auto-opened preview | ✓ WIRED | Confirmed, `subtitulo` prop carries mandatory copy |
| `lead-actions.ts` | `db (leads)` | `db.insert(...).returning()` | ✓ WIRED | Confirmed `createLead` returns inserted row |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `FollowupDashboard` | `vencidos`/`hoje`/`proximos7Dias` | `page.tsx` → `getActiveDashboardLeads()` (real Drizzle SELECT) → `groupLeadsByUrgency()` | Yes | ✓ FLOWING |
| `TemplateList` | `templates` | `templates/page.tsx` → `db.select().from(templates)` | Yes | ✓ FLOWING |
| `PipelineBoard` | `leads`/`templates` | `pipeline/page.tsx` → real DB queries (pre-existing + `templates` added) | Yes | ✓ FLOWING |
| `WhatsAppPreviewDialog` (auto-trigger) | `firstContact.lead` | `createLead(...).returning()` → real inserted row, not a static object | Yes | ✓ FLOWING |
| `templates` live table | — | Confirmed directly via `sqlite_master`/`PRAGMA table_info` against `./data/crm.db` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `templates` table exists with correct columns | `node -e "...better-sqlite3 sqlite_master/PRAGMA..."` | `templates: {name:'templates'}`, all 7 columns present | ✓ PASS |
| `renderTemplate`/`buildWaLink` correctness (accents/emoji/`\n`) | `node --experimental-strip-types -e "import('./src/lib/whatsapp.ts')..."` | `OK whatsapp lib` | ✓ PASS |
| Full project type check | `npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| Production build | `npm run build` | `✓ Compiled successfully`, all 7 routes incl. `/`, `/leads`, `/pipeline`, `/templates` prerendered | ✓ PASS |
| CR-01 boundary fix (7-day-out lead) | Code read of `queries.ts` | `addDays(today, 8)` confirmed (widened from 7) | ✓ PASS (code-level; runtime confirmation still requested, see Human Verification) |
| CR-02 concurrency fix (motivo-perda queue) | Code read of `pipeline-board.tsx` | `motivoQueueRef` FIFO queue confirmed replacing single shared ref | ✓ PASS (code-level; runtime confirmation still requested) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REMIND-01 | 04-01 | Tela inicial mostra painel de follow-ups vencidos/próximos por padrão | ✓ SATISFIED | `src/app/page.tsx` + `queries.ts` + `followup-dashboard.tsx` |
| WA-01 | 04-02 | Criar/editar templates com variáveis | ✓ SATISFIED | `template-actions.ts` + `template-form-dialog.tsx` + `templateSchema` |
| WA-02 | 04-03 | Link wa.me com mensagem codificada + telefone normalizado | ✓ SATISFIED | `whatsapp.ts` + automated encoding test |
| WA-03 | 04-03 | Preview da mensagem final antes de abrir WhatsApp | ✓ SATISFIED | `whatsapp-preview-dialog.tsx` |
| WA-04 | 04-04 | Auto-sugestão de WhatsApp de 1º contato ao importar/criar lead | ✓ SATISFIED | `use-first-contact-trigger.ts` + `lead-form-dialog.tsx` wiring (manual creation only; CSV import is Phase 2, out of this phase's scope — hook explicitly designed for reuse) |
| WA-05 | 04-03 | Botão de envio inline na lista de lembretes e no pipeline | ✓ SATISFIED | `whatsapp-send-button.tsx` wired in both surfaces |

No orphaned requirements found — `.planning/REQUIREMENTS.md` traceability table maps exactly REMIND-01, WA-01..05 to Phase 4, all marked "Complete", matching the 6 requirement IDs declared across the 4 plans' frontmatter.

### Anti-Patterns Found

None at Blocker or Warning severity. Scanned all 20 phase-modified files for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` (plus case-insensitive "placeholder/coming soon/not yet implemented") — zero matches.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/delete-template-dialog.tsx` / `template-list.tsx` | n/a | Delete confirm button not disabled while `isPending` (IN-04, code review) | ℹ️ Info | Rapid double-click could theoretically double-fire `deleteTemplate` (harmless no-op today); explicitly excluded from 04-REVIEW-FIX's fix scope (`critical_warning` only) — acceptable, not a phase-goal blocker |

### Human Verification Required

**RESOLVIDO na Fase 18 (AUDIT-03, 2026-09-02).** Os 7 itens do backlog `human_verification`
foram executados por **code+data** (navegador bloqueado por hardware — host 4GB) e estão
registrados em `04-HUMAN-UAT.md` (`status: complete`, 7/7 pass, 0 issues). Ver a seção
"Promoção de status" no topo deste relatório para o mapeamento item→cenário. `human_verification`
no frontmatter agora é `[]`.

### Gaps Summary

No code-level gaps found. All 21 must-have truths across the phase's 4 plans are backed by real, wired, non-stub implementation, and all 6 review findings (2 critical + 4 warning) from `04-REVIEW.md` were confirmed fixed by direct code inspection. `npx tsc --noEmit` and `npm run build` both pass cleanly. The `templates` table was independently confirmed live in `./data/crm.db`.

**Fase 18 (AUDIT-03):** os 7 cenários de UAT foram fechados por code+data. CR-01 (boundary de
7 dias) passou a ter prova por harness (`test:group-by-urgency`); CR-02 (race no
drag-to-Perdido) tem confirmação ao vivo herdada da quick 260828-gna. Status promovido a
`passed`. Diferido para uma futura sessão com navegador (não bloqueante): renderização visual
das cores/badges/toasts/animações e a disambiguação pointer real no card do pipeline.

Achado informativo remanescente (não bloqueante): ROADMAP.md declara o goal da Phase 4 como
`mode: mvp` mas em prosa em vez de User Story format — recomenda-se `/gsd mvp-phase 4` para
alinhar.

---

*Verified: 2026-07-22 (código) → 2026-09-02 (promovido a passed pela Fase 18 / AUDIT-03, code+data)*
*Verifier: Claude (gsd-verifier + Fase 18 auditoria retroativa)*
