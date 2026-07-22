---
phase: 04-follow-up-dashboard-whatsapp-outreach
verified: 2026-07-22T03:41:08Z
status: human_needed
score: 21/21 must-haves verified (code-level)
overrides_applied: 0
human_verification:
  - test: "Abrir `npm run dev`, ir para `/`: confirmar 3 seções por urgência (Vencidos em vermelho, Hoje em âmbar, Próximos 7 dias em cinza), item clicável abre o modal de edição, estado 'Tudo em dia!' aparece quando não há follow-ups, e 'Novo lead' abre o LeadFormDialog em modo criação sem navegar para /leads."
    expected: "Dashboard renderiza corretamente com as 3 seções, estado vazio e criação local funcionando como especificado."
    why_human: "Renderização visual e fluxo de clique não são verificáveis por grep/análise estática — nenhum navegador foi usado pelo executor (confirmado nas 4 SUMMARY.md)."
  - test: "Em `/templates`: criar um template de cada tipo com {nome}/{subnicho}/{origem} no corpo, marcar um como padrão, criar um segundo do mesmo tipo e marcá-lo padrão (o primeiro deve perder o badge 'Padrão'), editar um template existente, excluir com confirmação."
    expected: "CRUD completo funciona; exatamente um template permanece marcado como padrão por tipo após a segunda marcação."
    why_human: "Fluxo de UI multi-etapa (form modal, toasts, badge condicional) não coberto por teste automatizado — apenas testado via SQL bruto equivalente à lógica do servidor, não via UI real."
  - test: "Em `/` e em `/pipeline`: clicar no botão de WhatsApp de um item/card, confirmar que o preview abre com a mensagem já preenchida (tipo padrão pré-selecionado), editar a textarea e confirmar que o link 'Abrir WhatsApp' muda ao vivo; testar um lead com telefone inválido e confirmar botão desabilitado com tooltip; no pipeline, confirmar que clicar no botão NÃO inicia um drag nem abre a edição do card, e que arrastar o card continua funcionando normalmente."
    expected: "Botão e preview funcionam nas duas superfícies sem colidir com drag-and-drop ou edição do item."
    why_human: "Interação de ponteiro (stopPropagation vs. dnd-kit listeners) e link ao vivo dependem de comportamento de runtime no navegador, não verificável estaticamente com certeza total."
  - test: "Criar um lead novo (com template padrão de 1º contato cadastrado) a partir de `/`, `/leads` e `/pipeline`. Em cada caso, confirmar que o preview de 1º contato abre automaticamente após salvar, com o subtítulo 'Sugestão: enviar mensagem de primeiro contato para {nome}.' e mensagem preenchida; fechar sem enviar e confirmar que o lead permanece salvo; editar um lead existente e confirmar que o preview NÃO abre."
    expected: "Auto-gatilho WA-04 dispara nas 3 superfícies de criação, nunca na edição."
    why_human: "Fluxo end-to-end (criação → efeito de sucesso → preview auto-aberto) depende de sequenciamento de estado em runtime, não verificável apenas por leitura de código com 100% de confiança."
  - test: "(04-REVIEW-FIX CR-01) Criar/editar um lead com follow-up exatamente 7 dias no futuro (hoje + 7) e confirmar que ele aparece em 'Próximos 7 dias' no dashboard, não desaparecendo de todos os grupos."
    expected: "Lead aparece em 'Próximos 7 dias'."
    why_human: "Correção de boundary condition (off-by-one) sinalizada pelo próprio 04-REVIEW-FIX.md como 'requires human verification'."
  - test: "(04-REVIEW-FIX CR-02) No `/pipeline`, arrastar dois leads diferentes para 'Perdido' em sequência rápida, antes de dispensar o primeiro modal de motivo da perda. Confirmar que ambas as mudanças de etapa persistem após um refresh da página."
    expected: "Nenhuma transição de etapa é perdida; a fila de resolução do modal processa ambos os leads."
    why_human: "Correção de condição de corrida sinalizada pelo próprio 04-REVIEW-FIX.md como 'requires human verification'."
  - test: "(04-REVIEW-FIX WR-01/WR-02) Criar um lead diretamente em 'Contatado' e confirmar que ele fica elegível para o indicador 'esfriando' após o prazo configurado; reativar um lead antes 'Perdido' (via edição de formulário e via drag no pipeline) e confirmar que o campo 'Motivo da perda' é limpo no banco."
    expected: "stageChangedAt é preenchido na criação; motivoPerda é limpo ao sair de 'Perdido'."
    why_human: "Ambas as correções foram sinalizadas pelo próprio 04-REVIEW-FIX.md como 'requires human verification'."
---

# Phase 4: Follow-up Dashboard & WhatsApp Outreach Verification Report

**Phase Goal:** Admin never misses a follow-up and can reach out via WhatsApp in one click, using ready-made templates, right from the dashboard, the reminders list, and the pipeline
**Verified:** 2026-07-22T03:41:08Z
**Status:** human_needed
**Re-verification:** No — initial verification

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

See YAML frontmatter `human_verification` list. Summary: every plan's `<human-check>` browser click-through was explicitly **not run** by the executor (headless environment, no browser access — documented consistently in all 4 SUMMARY.md files), and 04-REVIEW-FIX.md itself marks 4 of its 6 applied fixes (CR-01, CR-02, WR-01, WR-02) as `requires human verification`. Code-level tracing gives high confidence these are correct (all fix logic was read and confirmed present and structurally sound), but per verification policy, runtime/browser-rendered behavior — especially the pointer-event disambiguation (drag vs. click), dialog close animation, and multi-surface auto-trigger sequencing — still requires a human `npm run dev` walkthrough before this phase is considered fully polished.

### Gaps Summary

No code-level gaps found. All 21 must-have truths across the phase's 4 plans are backed by real, wired, non-stub implementation, and all 6 review findings (2 critical + 4 warning) from `04-REVIEW.md` were confirmed fixed by direct code inspection (not just trusting `04-REVIEW-FIX.md`'s claims — each fix's diff was independently re-read against the review's described bug). `npx tsc --noEmit` and `npm run build` both pass cleanly with all expected routes present. The `templates` table was independently confirmed live in `./data/crm.db` via direct SQLite query (not just trusted from SUMMARY.md).

The phase is blocked from `passed` status only because of the standing human-verification backlog — a substantial set of browser-dependent interaction/UX checks (drag-and-drop race condition fix, dialog animation fix, 3-surface auto-trigger flow, template CRUD click-through) that no prior plan in this phase was ever able to execute in its headless environment. This is a process gap (no browser access during execution), not an implementation gap — recommend a human runs `npm run dev` and walks the flows in the frontmatter `human_verification` list before closing the phase.

Additionally, ROADMAP.md's Phase 4 goal is declared `mode: mvp` but written in prose rather than User Story format — recommend running `/gsd mvp-phase 4` to align (informational, non-blocking).

---

*Verified: 2026-07-22T03:41:08Z*
*Verifier: Claude (gsd-verifier)*
