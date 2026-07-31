# Phase 7 — UI Review

**Audited:** 2026-07-31
**Baseline:** `.planning/phases/07-configura-o-de-dias-parado-por-etapa/07-UI-SPEC.md` (approved design contract)
**Screenshots:** captured (desktop 1440x900, tablet 1024x768, mobile 375x812, plus 0ms/200ms/1500ms/3000ms load-timing sequence) — `.planning/ui-reviews/07-20260731-195600/`

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every declared string (labels, descriptions, CTA states, toasts, error message) matches the contract exactly |
| 2. Visuals | 3/4 | Layout/hierarchy matches contract precisely, but the 3 inputs render visibly empty for ~0.2–3s after navigation, contradicting the "pré-preenchido" contract |
| 3. Color | 4/4 | Teal accent strictly confined to CTA/focus ring/active sidebar item; no new hardcoded colors introduced |
| 4. Typography | 4/4 | Exactly matches the declared Display/Label/Body inventory (28px/600, 14px/500, 14px/400) |
| 5. Spacing | 4/4 | Every spacing value (p-6, gap-6, gap-4, gap-5, gap-2) traces to a declared or explicitly-permitted token in 07-UI-SPEC.md |
| 6. Experience Design | 2/4 | Loading/error/toast states are well implemented, but the same flash-of-unfilled-content bug is a verified functional/data-integrity risk, not just cosmetic |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Flash-of-unfilled-content on `/configuracoes` load** — user impact: the admin's first view of a page contractually specced to be "pré-preenchido" (Contatado=5, Novo/Negociação=999999) shows 3 blank number fields; if the admin starts typing during that window, react-hook-form's post-mount `ref.value = defaultValue` assignment can silently overwrite what was just typed — concrete fix: pass `defaultValue={config.diasParadoNovo}` (and the other two) explicitly on each `<Input>` in `src/components/configuracoes-form.tsx` alongside `{...form.register(...)}`, so the value is present in the very first paint instead of waiting on a post-mount ref effect.

2. **Number inputs are vulnerable to the mouse-wheel-scroll footgun** — user impact: `<input type="number">` in Chromium silently increments/decrements its value when the mouse wheel scrolls while the field has focus; with a sentinel value like `999999` sitting in "Novo"/"Negociação," a non-technical admin scrolling the page while that field happens to be focused could shift the persisted limit by a few days without noticing — concrete fix: add `onWheel={(e) => e.currentTarget.blur()}` (or a project-wide utility) to the 3 inputs in `configuracoes-form.tsx`, same pattern worth adding to any other numeric input in the app.

3. **"999999" sentinel value has no in-UI explanation** — user impact: the FieldDescription copy ("Dias parado nesta etapa antes de o lead ser destacado como esfriando.") never tells the admin that six 9's specifically means "nunca esfria ainda," so a first-time viewer may assume it's a bug and "correct" it without understanding the consequence (leads in that stage would immediately start being flagged) — concrete fix: append a short conditional hint under Novo/Negociação, e.g. "Valor alto (999999) = esta etapa ainda não destaca leads como esfriando," shown only while the field holds the sentinel default.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Verified by direct grep against `src/components/configuracoes-form.tsx`:
- `"Dias parado nesta etapa antes de o lead ser destacado como esfriando."` — exactly 3 occurrences (one per field), matches contract.
- `"Mínimo de 1 dia."` — exactly 3 occurrences in `src/lib/validations.ts:94-96`, matches contract's error-state copy verbatim.
- CTA states `"Salvar configurações"` / `"Salvando..."` present verbatim (`configuracoes-form.tsx:148`).
- Toast copy `"Configurações salvas."` (success) and `"Não foi possível salvar as configurações. Tente novamente."` (error) present verbatim (`configuracoes-form.tsx:58,60`) and rendered via a globally-mounted `<Toaster />` (confirmed in `src/app/layout.tsx`), so toasts will actually appear — not just be called.
- No "Cancelar" button exists (grep confirmed absent), matching the contract's explicit prohibition.
- No generic labels ("Submit", "OK", "Click Here") found in the audited files.

No deductions. Note (not scored, see Priority Fix #3): the raw sentinel `999999` is technically spec-mandated but is a real residual UX gap the contract itself never addressed with explanatory copy.

### Pillar 2: Visuals (3/4)

Confirmed via Playwright screenshots at four wait intervals (0ms/default, 200ms, 1500ms, 3000ms) on `http://localhost:3000/configuracoes`:
- **0ms and 200ms screenshots: all 3 number inputs render completely empty** (`Novo`, `Contatado`, `Negociação` fields show blank white boxes).
- **1500ms and 3000ms screenshots: fields correctly show `999999` / `5` / `999999`.**
- `curl http://localhost:3000/configuracoes` (raw SSR HTML, no JS) confirms zero `value` attribute on any of the 3 `<input>` elements — the Server Component fetches `config` correctly (`src/app/configuracoes/page.tsx:5`) but the value never reaches the initial markup; `react-hook-form`'s `register()` only sets `element.value` imperatively after mount via ref, which is invisible to both SSR output and the first client paint.
- Layout otherwise matches the contract precisely: single card (`rounded-lg border border-zinc-200 bg-white p-6 max-w-md`), fields stacked Novo → Contatado → Negociação, CTA right-aligned below the fields, no Cancel button, clear single focal point on the page.
- Sidebar active-state styling (`bg-[#0D9488]/10 font-semibold text-[#0D9488]`) renders correctly and is visually obvious (confirmed in screenshot).
- No icon-only buttons introduced by this phase (the `Settings` sidebar icon has an adjacent text label, not icon-only).

Deduction: -1 for the confirmed flash-of-unfilled-content, since it is a real, reproducible visual defect on every single page load, not a one-off.

### Pillar 3: Color (4/4)

Grep of `src/components/configuracoes-form.tsx`, `src/app/configuracoes/page.tsx`, `src/components/app-sidebar.tsx`:
- `#0D9488` (teal accent) appears exactly where the contract allows: CTA background (`configuracoes-form.tsx:145`), sidebar logo mark, and sidebar active-item background/text (`app-sidebar.tsx:35,61,62`) — all pre-existing, none of it in body text, icons, or card backgrounds.
- `#F4F4F5` (sidebar background) and `border-zinc-200` (card border) match the declared Secondary(30%) role.
- No new hardcoded colors were introduced beyond the design system's already-documented tokens; the destructive token (`aria-invalid`/`FieldError`) comes from the shared `--destructive` CSS variable, not a new hex literal.
- 60/30/10 balance holds: white dominant card/content area, zinc-100 sidebar as secondary, teal confined to ~2 small elements (button + active nav state) as accent.

No deductions.

### Pillar 4: Typography (4/4)

- `<h1 className="text-[28px] font-semibold leading-tight">Configurações</h1>` (`page.tsx:9`) — exact match to the contract's Display token (28px/600/1.2).
- `FieldLabel` renders via the shared `Label` primitive at `text-sm ... font-medium` (14px/500) — matches the contract's Label token, including the pre-approved exception that this weight isn't one of the 2 base body weights.
- `FieldDescription`/`FieldError` render at `text-sm ... font-normal` (14px/400) — matches the Body token.
- No additional font sizes or weights were introduced by this phase's files.

No deductions.

### Pillar 5: Spacing (4/4)

- Card: `p-6` (24px) — matches the Layout section's explicit instruction (this supersedes the looser "md/16" example in the general Spacing Scale table, since the Layout section is the binding, more specific instruction for this exact element).
- Page wrapper: `gap-6` (24px) between `<h1>` and the card — matches the contract's explicit `lg` token usage for this exact relationship.
- Form's own wrapper (`flex flex-col gap-4`, `configuracoes-form.tsx:81`): 16px between `FieldGroup` and the button row — matches `md`.
- `FieldGroup`'s inherited default (`gap-5`, 20px) is explicitly sanctioned by the UI-SPEC Layout section text ("usando `FieldGroup` (`gap-4`/`gap-5`)"), so this is not a deviation despite 20px falling outside the general 8-point token list.
- `Field`'s inherited `gap-2` (8px) between label/input/description matches the `sm` token.
- No arbitrary/off-scale spacing values found in the audited files (`grep` for `\[.*px\]`/`\[.*rem\]` returned only the already-accounted-for `text-[28px]` typography token, not a spacing value).

No deductions.

### Pillar 6: Experience Design (2/4)

Positive coverage confirmed by code inspection:
- Pending/loading state: submit button shows `"Salvando..."` and is `disabled={pending}` while the Server Action is in flight (`configuracoes-form.tsx:146-148`).
- Field-level error state: `FieldError` renders per-field server-validated messages via `aria-invalid` + `data-invalid` wiring.
- Toast error state: `"Não foi possível salvar as configurações. Tente novamente."` on any validation failure.
- No false-positive "success": the Server Action (`src/actions/configuracoes-actions.ts`) uses `insert(...).onConflictDoUpdate(...)` instead of a bare `update`, specifically to avoid reporting `{ success: true }` on a write that silently affected 0 rows — good defensive engineering, verified in code and confirmed by the plan's own runtime tests (07-01/07-02 SUMMARY.md).
- Empty state: correctly not applicable — the form always has a persisted config row (getOrCreate), matches contract.

Deductions (-2):
- **Flash-of-unfilled-content is a functional risk, not just cosmetic** (see Priority Fix #1): during the ~0.2–3s window before hydration populates the fields, an admin who starts typing risks having their input clobbered by the delayed `ref.value` assignment, and an admin who submits during that window (e.g. hits Enter quickly) would submit empty/invalid FormData rather than the intended edit. This exact scenario is not covered by any of the plan's verify scripts, all of which check persisted DB state via Node scripts or `curl`/HTTP status, never an actual rendered/hydrated browser state — an automated screenshot-timing check would have caught this before merge.
- **No scroll-wheel guard on the 3 number inputs** (see Priority Fix #2): native `<input type="number">` changes value on mouse-wheel scroll while focused; combined with the huge sentinel value (999999), an inadvertent scroll while a field has focus is a plausible, hard-to-notice way to corrupt the persisted config for a non-technical solo admin (the project's own stated persona).
- `npm run build` has not been run for this phase (documented by the executor in `07-02-SUMMARY.md`, deferred due to the host's 4GB RAM / prior OOM precedent while the dev server is active) — noted here as an open production-readiness gap, not scored, since it is explicitly a deferred/flagged item rather than a silent omission.

---

## Registry Safety

`components.json` exists (shadcn initialized), but `07-UI-SPEC.md`'s Registry Safety table lists only `shadcn official` blocks (`field`, `input`, `button`, `sonner`, all pre-existing) and explicitly states no third-party registry is declared or required for this phase. Per the audit protocol, the third-party registry scan only runs when a third-party registry is declared.

Registry audit: 0 third-party blocks checked, no flags.

---

## Files Audited

- `src/components/configuracoes-form.tsx`
- `src/app/configuracoes/page.tsx`
- `src/components/app-sidebar.tsx`
- `src/app/pipeline/page.tsx`
- `src/actions/configuracoes-actions.ts`
- `src/db/queries.ts` (getConfiguracoes, code inspection only)
- `src/db/schema.ts` (configuracoes table, code inspection only)
- `src/lib/validations.ts` (configuracoesSchema)
- `src/components/ui/field.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/pipeline-lead-card.tsx` (reused, unmodified — confirmed via `git log` on the file)
- `src/app/globals.css` (color token verification)
- Live screenshots: `http://localhost:3000/configuracoes` (desktop/tablet/mobile + 0ms/200ms/1500ms/3000ms load-timing sequence), `http://localhost:3000/pipeline` (desktop, full page)
- Live DB inspection: `./data/crm.db` `configuracoes` table (via `better-sqlite3`, read-only)
