---
phase: 09-timeline-de-intera-es
verified: 2026-08-09T00:26:05Z
status: passed
score: 23/23 must-haves verified (code + live gates)
overrides_applied: 0
human_verification:
  - test: "Abrir /leads, clicar no ícone de histórico (relógio) de um lead"
    expected: "Abre 'Histórico de {nome}' com o composer no topo; digitar uma nota e salvar mostra toast 'Nota registrada.' e a nota aparece no topo da lista com badge 'Nota manual'"
    why_human: "Requer clique real no navegador — sem acesso a browser nesta sessão de execução/verificação"
  - test: "Na timeline aberta, editar a nota (lápis) e salvar; depois excluir (lixeira) e confirmar"
    expected: "Toast 'Nota atualizada.' ao salvar edição; toast 'Nota removida da timeline.' e a entrada some da lista ao excluir"
    why_human: "Comportamento de UI dependente de interação real; grep/tsc não confirmam o resultado visual/toast"
  - test: "Fechar a timeline, clicar em 'WhatsApp' no mesmo lead, editar o texto da mensagem e clicar 'Abrir WhatsApp'; reabrir o histórico"
    expected: "Existe uma entrada nova com o badge do tipo escolhido e o TEXTO EDITADO integral; essa entrada NÃO tem ícones de editar/excluir"
    why_human: "Fluxo depende de abrir uma nova aba (wa.me) e do texto vivo da textarea no momento do clique — não reproduzível por grep estático"
  - test: "Repetir o clique de WhatsApp escolhendo 'Follow-up' e depois 'Prova de valor'"
    expected: "As duas escolhas também geram entrada na timeline (não só primeiro_contato)"
    why_human: "Mesma razão acima — comportamento de clique real no navegador"
  - test: "Em /pipeline, clicar no ícone de histórico de um card"
    expected: "Abre a timeline do lead certo, sem arrastar o card e sem abrir o modal de edição; arrastar o card para outra coluna continua funcionando"
    why_human: "Interação de drag-and-drop e clique não é verificável estaticamente"
  - test: "Abrir o modal de editar lead"
    expected: "Rodapé mostra 'Ver histórico' (some ao criar lead novo); clicar abre a mesma timeline; as 3 seções e o campo de notas do formulário continuam idênticos"
    why_human: "Confirmação visual de layout/comportamento do modal"
---

# Phase 9: Timeline de Interações Verification Report

**Phase Goal:** O admin deixa de depender só do contador de tentativas — cada evento de contato com um lead vira um registro na linha do tempo, com data e resumo, consultável a qualquer momento
**Verified:** 2026-08-09T00:26:05Z
**Status:** passed *(promovido — ver § Promoção de status)*
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Todo clique em "Abrir WhatsApp" (qualquer template/tela) gera automaticamente um registro na timeline, com data/hora e tipo, sem ação manual extra | ✓ VERIFIED | `registerWhatsAppContact` (src/actions/lead-actions.ts:229-269) wraps `tx.update(leads)` + `tx.insert(interacoes)` in `db.transaction()`; insert is an unconditional sibling statement (not nested in the `advanced` ternary) — confirmed by direct code read. `npm run test:interacao-actions` (20/20 assertions, exit 0) proves the same shape at runtime for all 3 template types, atomicity/rollback, and immutability. Browser-click confirmation still pending (see Human Verification). |
| 2 | Admin consegue registrar uma nota manual na timeline de um lead, independente de qualquer clique de WhatsApp | ✓ VERIFIED | `createInteracaoManual` (src/actions/interacao-actions.ts:54-79) inserts `tipo: "nota_manual"` after validating via `interacaoManualSchema`; wired into `LeadTimelineDialog` composer (`lead-timeline-dialog.tsx:164-194`) which calls `createInteracaoManual(lead.id, values.texto)` on submit |
| 3 | Ao abrir a tela/modal de um lead, admin visualiza o histórico completo em ordem cronológica, incluindo eventos de WhatsApp e notas manuais | ✓ VERIFIED | `getInteracoesByLead` orders `desc(createdAt), desc(id)`, filters `isNull(deletedAt)` (interacao-actions.ts:37-47); `LeadTimelineDialog` renders both types with distinct icon/badge (`MessageCircle` vs `StickyNote`), wired to 3 entry points (see Key Link Verification) |

**Score:** 3/3 roadmap success criteria verified at code level (browser click flow itself not yet human-confirmed)

### Observable Truths (Plan-level must_haves, merged from 09-01..09-04 frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 4 | Tabela `interacoes` existe no banco vivo (data/crm.db) com 7 colunas e 2 índices | ✓ VERIFIED | Live query: `PRAGMA table_info(interacoes)` → `id,lead_id,tipo,texto,created_at,updated_at,deleted_at` (7 cols); `sqlite_master` lists `interacoes_lead_id_idx`, `interacoes_deleted_at_idx` |
| 5 | Soft-delete de linha com tipo != "nota_manual" é no-op silencioso (0 linhas) | ✓ VERIFIED | `softDeleteInteracaoManual` WHERE includes `eq(interacoes.tipo, "nota_manual")`; `test:interacao-actions` runtime assertion confirms `changes === 0` for WhatsApp row |
| 6 | Edição de linha com tipo != "nota_manual" é no-op silencioso (0 linhas) | ✓ VERIFIED | `updateInteracaoManual` same WHERE guard; harness confirms `changes === 0` and byte-identical original text |
| 7 | `npm run guard:no-hard-delete` reprova hard-delete/DROP contra `interacoes` | ✓ VERIFIED | `guard-no-hard-delete.cjs` contains `.delete(interacoes` code pattern + `DELETE FROM`/`DROP TABLE interacoes` SQL patterns; `npm run guard:no-hard-delete` → exit 0, "OK: nenhum hard-delete encontrado" |
| 8 | Leitura da timeline devolve apenas linhas ativas, mais recentes primeiro, ordenação estável | ✓ VERIFIED | `orderBy(desc(createdAt), desc(id))` + `isNull(deletedAt)` filter in `getInteracoesByLead`; harness proves deterministic tie-break for same-second rows |
| 9 | Incremento de `contactAttempts` e registro da interação acontecem juntos ou nenhum (transação única) | ✓ VERIFIED | `db.transaction(async (tx) => {...})` wraps both writes in `registerWhatsAppContact`; harness proves rollback on FK violation leaves `contact_attempts` unchanged |
| 10 | Registro acontece também para `follow_up` e `prova_valor`, não só `primeiro_contato` | ✓ VERIFIED | `tx.insert(interacoes)` is unconditional (sibling of the update, not inside the `advanced` spread); harness asserts exactly 1 row per type for all 3 |
| 11 | Auto-avanço novo→contatado continua funcionando (WA-06/WA-07 sem regressão) | ✓ VERIFIED | `advanced = parsed.data.tipo === "primeiro_contato" && current.stage === "novo"` byte-identical to pre-phase; `node scripts/verify-wa-contact-invariant.cjs` → 15/15 truth-table pairs, exit 0 |
| 12 | Tentativa de apagar/editar linha de WhatsApp é provada no-op por script automatizado | ✓ VERIFIED | `npm run test:interacao-actions` exit 0, includes explicit assertions for both mutation types against a WhatsApp-typed row |
| 13 | Ao abrir a superfície, admin vê todas interações ativas, mais recentes primeiro | ✓ VERIFIED | `LeadTimelineDialog` renders `interacoes` state populated by `getInteracoesByLead`, no client-side re-sort (server order preserved) |
| 14 | Estado vazio explicativo quando não há interação, e ainda assim registra a primeira nota | ✓ VERIFIED | Code contains literal strings "Nenhuma interação registrada ainda" / explanatory body; composer renders above list, unconditionally visible |
| 15 | Admin registra nota manual sem sair da superfície, aparece imediatamente no topo | ✓ VERIFIED | `onSubmit` → `createInteracaoManual` → `recarregar()` re-fetches and re-renders list in the same dialog instance |
| 16 | Admin edita/exclui nota manual sua; entradas automáticas não oferecem controle | ✓ VERIFIED | Pencil/Trash2 buttons rendered only inside `interacao.tipo === "nota_manual" ? (...) : null` block |
| 17 | Texto integral exibido sem truncamento, preservando quebras de linha | ✓ VERIFIED | `<p className="... whitespace-pre-wrap ...">{interacao.texto}</p>`; no `truncate`/`line-clamp`/`.slice(0,` in file |
| 18 | Na lista /leads, admin abre histórico por ícone dedicado sem abrir modal de edição | ✓ VERIFIED | `History` icon button between WhatsApp/Pencil in `lead-table.tsx`; `onClick` calls `event.stopPropagation()` before `setTimelineState`, row's own edit `onClick` not triggered |
| 19 | No board /pipeline, admin abre histórico por ícone no card sem arrastar nem abrir edição | ✓ VERIFIED | `History` button placed inside the pre-existing `onPointerDown`/`onClick` stopPropagation wrapper in `pipeline-lead-card.tsx` (alongside `WhatsAppSendButton`) |
| 20 | No modal de editar lead, admin abre histórico por botão "Ver histórico" no rodapé, só em modo edição | ✓ VERIFIED | `{isEditMode && lead ? (<Button ...>Ver histórico</Button>) : null}` in `DialogFooter`, before "Cancelar" |
| 21 | Os três pontos de entrada abrem a MESMA superfície de timeline, para o lead correto | ✓ VERIFIED | All three mount `<LeadTimelineDialog lead={...} />` passing the specific lead from local state (`timelineState.lead` / `lead` prop) |
| 22 | As 3 seções do modal (Contato/Negócio/Acompanhamento) e o campo `notas` continuam exatamente como antes (D-01) | ✓ VERIFIED | grep confirms headings "Contato"/"Negócio"/"Acompanhamento" and `notas` field (`FieldLabel htmlFor="notas"`, `form.register("notas")`) unchanged in `lead-form-dialog.tsx` |
| 23 | Harness `npm run test:interacao-actions` existe e reprova a remoção do insert transacional | ✓ VERIFIED | Script exists, ran live with exit 0 and 20 `OK` assertion lines (static + runtime); SUMMARY documents a mutation test (removing `tx.insert(interacoes)` → exit 1, reverted) which was not independently re-run by this verifier but is consistent with the static assertion present in the harness code |

**Score:** 20/20 plan-level truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | `interacoes` table definition | ✓ VERIFIED | Present with all 7 columns, FK `restrict`, 2 indexes; matches live DB schema exactly |
| `src/types/index.ts` | `Interacao`/`NewInteracao` types | ✓ VERIFIED | Both exported, `InferSelectModel`/`InferInsertModel` |
| `src/lib/validations.ts` | Zod contracts | ✓ VERIFIED | `notaManualTextoSchema`, `interacaoManualSchema`, `interacaoManualUpdateSchema` present; `whatsappContactSchema.texto` required |
| `src/actions/interacao-actions.ts` | 4 Server Actions | ✓ VERIFIED | `getInteracoesByLead`, `createInteracaoManual`, `updateInteracaoManual`, `softDeleteInteracaoManual` all exported, all guard mutations with `eq(interacoes.tipo, "nota_manual")` |
| `scripts/guard-no-hard-delete.cjs` | Covers `interacoes` | ✓ VERIFIED | 1 code pattern + 2 SQL patterns added, comment scope updated |
| `scripts/verify-schema.cjs` | Covers `interacoes` | ✓ VERIFIED | `requiredTables`, `requiredIndexes`, column-shape check via `PRAGMA table_info` |
| `src/actions/lead-actions.ts` | Transactional `registerWhatsAppContact` | ✓ VERIFIED | 3-param signature, `db.transaction`, unconditional `tx.insert(interacoes)` |
| `src/components/whatsapp-preview-dialog.tsx` | Passes live `texto` | ✓ VERIFIED | `registerWhatsAppContact(leadId, tipo, texto)` literal call present |
| `scripts/test-interacao-actions.cjs` | Permanent invariant harness | ✓ VERIFIED | Exists, runs, 20/20 assertions pass |
| `src/components/lead-timeline-dialog.tsx` | `LeadTimelineDialog` | ✓ VERIFIED | 298 lines, exports component, list/composer/edit/delete all present and substantive (not a stub) |
| `src/components/delete-nota-dialog.tsx` | `DeleteNotaDialog` | ✓ VERIFIED | Exports component, mirrors `delete-lead-dialog.tsx` pattern |
| `src/components/lead-table.tsx` | History icon + dialog mount | ✓ VERIFIED | `LeadTimelineDialog` imported/mounted, `TimelineState`, `onViewTimeline` wired |
| `src/components/pipeline-board.tsx` | History wiring for board | ✓ VERIFIED | `LeadTimelineDialog` mounted, `TimelineState`, `onViewHistory` passed to every card |
| `src/components/lead-form-dialog.tsx` | "Ver histórico" footer button | ✓ VERIFIED | Present, gated by `isEditMode && lead`, dialog mounted outside `<form>` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `interacao-actions.ts` | `schema.ts (interacoes)` | `db.insert/update/select` guarded by `eq(interacoes.tipo, "nota_manual")` | ✓ WIRED | Pattern present ≥2 times (update + softDelete); confirmed by grep and by `test:interacao-actions` static assertion |
| `schema.ts (interacoes.leadId)` | `schema.ts (leads.id)` | `references(() => leads.id, {onDelete:"restrict"})` | ✓ WIRED | Confirmed live via `PRAGMA foreign_key_list(interacoes)` → table `leads`, `on_delete: RESTRICT` |
| `whatsapp-preview-dialog.tsx` | `lead-actions.ts (registerWhatsAppContact)` | `onClick` fire-and-forget anchor | ✓ WIRED | `registerWhatsAppContact(leadId, tipo, texto)` literal call found |
| `lead-actions.ts` | `schema.ts (interacoes)` | `tx.insert(interacoes)` inside same transaction as `tx.update(leads)` | ✓ WIRED | Confirmed by direct code read; insert is unconditional sibling, not nested in `advanced` branch |
| `lead-timeline-dialog.tsx` | `interacao-actions.ts` | Imperative calls (`useEffect`/`startTransition`) | ✓ WIRED | `getInteracoesByLead`, `createInteracaoManual`, `updateInteracaoManual`, `softDeleteInteracaoManual` all imported and called |
| `lead-timeline-dialog.tsx` | `validations.ts (notaManualTextoSchema)` | `zodResolver` | ✓ WIRED | `zodResolver(notaManualTextoSchema)` present |
| `lead-table.tsx` | `lead-timeline-dialog.tsx` | `TimelineState` + render | ✓ WIRED | `<LeadTimelineDialog open={...} lead={...} />` mounted, state set by `History` button click |
| `pipeline-lead-card.tsx` | `pipeline-board.tsx` | `onViewHistory` prop through stopPropagation wrapper | ✓ WIRED | `onViewHistory` prop declared, invoked, passed from board to every card |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `LeadTimelineDialog` | `interacoes` (useState) | `getInteracoesByLead(lead.id)` → `db.select().from(interacoes)...` | Yes — real Drizzle query against live SQLite table, not a static/empty return | ✓ FLOWING |
| `registerWhatsAppContact` | `interacoes` row insert | `tx.insert(interacoes).values({leadId, tipo, texto})` from live form state (`texto` param sourced from the WhatsApp preview textarea) | Yes — parametrized insert, verified to actually reach `data/crm.db` (schema/FK/indexes present live) | ✓ FLOWING |

Live DB check: `SELECT COUNT(*) FROM interacoes` → 0 (expected — no real browser clicks were made during this automated build/verify session, consistent with SUMMARY's own disclosure). `SELECT COUNT(*) FROM leads` → 37, unchanged from the pre-phase baseline recorded in 09-01-SUMMARY.md — no data loss.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live `interacoes` table shape matches schema | `PRAGMA table_info(interacoes)` via node script | 7 columns, matches expected set exactly | ✓ PASS |
| FK to `leads` present | `PRAGMA foreign_key_list(interacoes)` | `{table: "leads", on_delete: "RESTRICT"}` | ✓ PASS |
| Indexes present | `sqlite_master` query | `interacoes_lead_id_idx`, `interacoes_deleted_at_idx` both present | ✓ PASS |
| TypeScript compiles | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Hard-delete guard | `npm run guard:no-hard-delete` | exit 0, "OK: nenhum hard-delete encontrado" | ✓ PASS |
| Schema gate | `npm run verify:schema` | exit 0, cites `interacoes` | ✓ PASS |
| Timeline invariants harness | `npm run test:interacao-actions` | exit 0, 20/20 `OK` assertions | ✓ PASS |
| WhatsApp contact invariant | `node scripts/verify-wa-contact-invariant.cjs` | exit 0, 15/15 truth-table pairs | ✓ PASS |
| Lead actions regression | `npm run test:lead-actions` | exit 0, all assertions pass | ✓ PASS |
| Origem-tipo wiring (Phase 8 regression) | `npm run verify:origem-tipo` | exit 0, 5 wiring links intact | ✓ PASS |
| ESLint (scoped to phase files) | `npx eslint <12 phase files>` | exit 0, 2 pre-existing `react-hooks/incompatible-library` warnings only, no errors | ✓ PASS |

`npm run build` was not re-run by this verifier (long-running, high memory cost on the documented 4GB host); SUMMARY documents it ran with exit 0 producing 11 routes. All other 10 gates were independently re-executed live during this verification and match the SUMMARY's claims.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TIMELINE-01 | 09-01, 09-02, 09-03 | Cada evento de contato com um lead é registrado numa linha do tempo, com data e tipo/resumo | ✓ SATISFIED | `interacoes` table + `getInteracoesByLead`/`createInteracaoManual` + transactional `registerWhatsAppContact` all confirmed live |
| TIMELINE-02 | 09-01, 09-03, 09-04 | Admin visualiza o histórico completo de interações de um lead, em ordem cronológica, na tela/modal do lead | ✓ SATISFIED | `LeadTimelineDialog` + 3 wired entry points confirmed |

No orphaned requirements: REQUIREMENTS.md maps only TIMELINE-01/02 to Phase 9, and both are declared across the phase's plans.

### Anti-Patterns Found

None. Scanned all files modified across the phase (schema, types, validations, actions, guard/verify scripts, all 7 UI components) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub-shaped patterns (`return null`, hardcoded empty arrays/objects flowing to render, `dangerouslySetInnerHTML`) — no matches. The one grep hit for the string "placeholder" is the legitimate JSX `placeholder="Registrar uma nota sobre este lead..."` attribute on the note composer's `Textarea`, not a stub marker.

### Human Verification Required

The phase's own plan (09-04-PLAN.md, Task 3) declares an explicit `<human-check>` block that the SUMMARY confirms was **not executed** ("sem acesso a navegador nesta sessão"). All automated/static/live-DB evidence strongly supports the implementation being correct and complete, but the actual click-through user flow in a browser has never been exercised. Per the phase's own acceptance criteria this is a documented, deliberate deferral (consistent with the project's "no browser access in this environment" constraint across prior phases), not a code gap — but it must still be surfaced for developer/human confirmation before the timeline is considered production-ready for real prospecting use.

### 1. Registrar nota manual pela lista /leads

**Test:** Abrir `/leads`, clicar no ícone de histórico (relógio) de um lead, digitar uma nota no composer e salvar
**Expected:** Abre "Histórico de {nome}"; toast "Nota registrada."; a nota aparece no topo da lista com badge "Nota manual"
**Why human:** Requer interação real de clique/digitação no navegador

### 2. Editar e excluir nota manual

**Test:** Na timeline aberta, clicar no lápis de uma nota, editar o texto e salvar; depois clicar na lixeira e confirmar a exclusão
**Expected:** Toast "Nota atualizada." ao salvar; toast "Nota removida da timeline." e a entrada some da lista ao excluir
**Why human:** Feedback visual (toast) e atualização de lista dependem de execução real no browser

### 3. Captura automática no clique de WhatsApp (todos os 3 tipos)

**Test:** Fechar a timeline, clicar em "WhatsApp" no mesmo lead, editar o texto da mensagem e clicar "Abrir WhatsApp"; repetir escolhendo "Follow-up" e "Prova de valor"; reabrir o histórico
**Expected:** Cada clique gera uma entrada nova com o badge do tipo escolhido e o texto editado integral; nenhuma dessas entradas tem ícones de editar/excluir
**Why human:** Depende da textarea viva no diálogo de preview e da abertura real do link wa.me — não reproduzível por grep estático

### 4. Ponto de entrada no board /pipeline

**Test:** Em `/pipeline`, clicar no ícone de histórico de um card
**Expected:** Abre a timeline do lead certo, sem arrastar o card e sem abrir o modal de edição; arrastar o card para outra coluna continua funcionando normalmente
**Why human:** Comportamento de drag-and-drop (`useDraggable`) só é observável em interação real

### 5. Ponto de entrada no modal de editar lead

**Test:** Abrir o modal de editar um lead existente
**Expected:** Rodapé mostra "Ver histórico" (ausente ao criar um lead novo); clicar abre a mesma timeline; as 3 seções (Contato/Negócio/Acompanhamento) e o campo de notas do formulário permanecem idênticos
**Why human:** Confirmação visual de layout e comportamento condicional do modal

### Gaps Summary

No code-level gaps found. Every observable truth derived from the ROADMAP success criteria and from each plan's `must_haves` was independently checked against the live codebase (not just SUMMARY claims): schema/FK/index confirmed against the actual `data/crm.db` file, all Server Action guards confirmed by direct source read, all 10 automatable gates re-executed live with exit 0, and all 3 UI entry points confirmed wired with correct event isolation (stopPropagation). The only outstanding item is the browser click-through walkthrough that the executor itself flagged as un-run in 09-03-SUMMARY.md and 09-04-SUMMARY.md due to lack of browser access in this environment — this routes the phase to `human_needed` rather than `passed`, per the verification decision tree (human items always take priority over score).

---

*Verified: 2026-08-09T00:26:05Z*
*Verifier: Claude (gsd-verifier)*

## Promoção de status (close-phase)

Status promovido de `human_needed` para `passed` em 2026-08-11.
Evidência: UAT automatizado via navegador (Claude in Chrome, a pedido explícito do usuário) concluído — 09-HUMAN-UAT.md em `complete`, 5/5 testes `pass`, 0 issues, 0 pending. Não foi clique humano literal; o usuário pediu que o agente executasse o UAT pelo navegador.
