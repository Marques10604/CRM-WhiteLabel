---
phase: 23-diagn-stico-de-ia-da-campanha
reviewed: 2026-09-11T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - scripts/eval-diagnostico.mjs
  - scripts/migrate-diagnosticos.cjs
  - scripts/test-diagnostico-estrutural.cjs
  - scripts/verify-schema.cjs
  - src/actions/diagnostico-actions.ts
  - src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx
  - src/app/campanhas/[id]/_components/rascunho-mensagem.tsx
  - src/app/campanhas/[id]/page.tsx
  - src/components/achado-tipo-badge.tsx
  - src/components/diagnostico-resultado.tsx
  - src/components/diagnostico-secao.tsx
  - src/components/veredito-sugerido-chip.tsx
  - src/db/schema.ts
  - src/lib/ai/diagnostico-prompt.ts
  - src/lib/ai/diagnostico-schema.ts
  - src/lib/ai/gerar-diagnostico.ts
  - test/fixtures/diagnostico/adversarial-so-marketing.json
  - test/fixtures/diagnostico/bad-achados-sem-tipo.json
  - test/fixtures/diagnostico/bad-dois-mais-forte.json
  - test/fixtures/diagnostico/bad-enum-veredito.json
  - test/fixtures/diagnostico/bad-mais-forte-relato-isolado.json
  - test/fixtures/diagnostico/bad-truncado.json
  - test/fixtures/diagnostico/bad-zero-mais-forte.json
  - test/fixtures/diagnostico/ok-costureira.json
  - test/fixtures/diagnostico/ok-estetica.json
  - test/fixtures/diagnostico/ok-motoboy.json
  - test/nichos-referencia.json
  - test/reports/2026-09-11-eval-diagnostico-2.md
  - test/reports/2026-09-11-eval-diagnostico-3.md
  - test/reports/2026-09-11-eval-diagnostico.md
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-09-11
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Reviewed the Diagnóstico de IA da Campanha feature end to end: Zod contract (`diagnostico-schema.ts`), system/user prompt (`diagnostico-prompt.ts`), the generation core (`gerar-diagnostico.ts`), the persisting Server Action (`diagnostico-actions.ts`), the rendering components, the migration/verify scripts, and every committed test fixture + eval report. The prompt/schema contract itself is well-engineered (explicit anti-generic rubric, `.refine()` cross-field validation, URL-scheme allowlisting, source-of-truth gating on `res.sources` instead of model-authored URLs) and the fixtures are internally consistent with the 3-category `tipoAchado` enum added in D-23-06.

However, two real defects were found that ship with this phase:

1. The recent structural schema change (2-category → 3-category `tipoAchado`, adding `relato_qualitativo`) was **not propagated to `src/components/achado-tipo-badge.tsx`**. The component's three lookup maps are still keyed on only 2 of the 3 enum values. This is not a hypothetical — `npx tsc --noEmit` was run against the repo and this is the **only** compile error in the entire codebase, and the real eval reports committed in this same phase show `relato_qualitativo` achados are produced on essentially every real generation (see `test/reports/2026-09-11-eval-diagnostico-3.md`, which shows `relato_qualitativo=1` in all 3 gold cases). This will crash `/campanhas/[id]` the moment a real diagnostic renders in the browser (in addition to failing `next build`/`tsc`).
2. `gerarDiagnostico()`'s local `buscas` telemetry array is declared once, outside the manual retry loop, and is never reset between retry attempts — a failed first attempt's search queries leak into the second attempt's persisted result, corrupting the append-only `diagnosticos.buscas` audit trail that DIAGNOSTICO-10 explicitly exists to keep accurate, and can also trip the eval script's `MAX_USES` structural gate with a false positive.

Additionally, the phase's own eval evidence file (`test/reports/2026-09-11-eval-diagnostico-3.md`), which is committed as part of this phase's deliverable, shows the eval script's own documented merge gate would have exited non-zero: 2 of 3 gold cases regressed against `veredito_esperado`, and all 3 cases failed the cross-check structural portal (citations not present in the real search results). This is flagged below as a quality/process warning since it directly contradicts the "structural fix resolved discrimination" framing this phase was reviewed under.

## Critical Issues

### CR-01: `AchadoTipoBadge` lookup maps are missing the `relato_qualitativo` enum value — compile error and runtime crash

**File:** `src/components/achado-tipo-badge.tsx:22-35`
**Issue:** D-23-06 added a 3rd value, `"relato_qualitativo"`, to `tipoAchado` in `diagnostico-schema.ts`, and `AchadoTipo` is derived directly from that Zod enum (`Diagnostico["achados"][number]["tipo"]`). But `TIPO_LABEL`, `TIPO_TOKEN`, and `TIPO_ICON` are still declared as `Record<AchadoTipo, ...>` with only `dado_quantificavel` and `alegacao_marketing` keys. This was confirmed by running `npx tsc --noEmit -p tsconfig.json`, which reports exactly 3 errors — all in this file, and no other file in the repo has a type error:
```
src/components/achado-tipo-badge.tsx(22,7): error TS2741: Property 'relato_qualitativo' is missing in type '{ dado_quantificavel: string; alegacao_marketing: string; }' but required in type 'Record<"dado_quantificavel" | "relato_qualitativo" | "alegacao_marketing", string>'.
src/components/achado-tipo-badge.tsx(27,7): error TS2741: ... (same, for TIPO_TOKEN)
src/components/achado-tipo-badge.tsx(32,7): error TS2741: ... (same, for TIPO_ICON)
```
Beyond the build break, if this were bypassed (e.g. `as any`), rendering a real diagnostic with a `relato_qualitativo` achado — which the committed eval reports show happens on essentially every real generation post-D-23-06 — would evaluate `TIPO_ICON[tipo]` to `undefined` and React would throw "Element type is invalid" when rendering `<Icon .../>` in `AchadoTipoBadge`, crashing the whole `/campanhas/[id]` page (it's rendered inside a Server Component tree via `DiagnosticoResultado`).
**Fix:**
```tsx
const TIPO_LABEL: Record<AchadoTipo, string> = {
  dado_quantificavel: "Dado quantificável",
  relato_qualitativo: "Relato isolado",
  alegacao_marketing: "Alegação de concorrente",
};

const TIPO_TOKEN: Record<AchadoTipo, string> = {
  dado_quantificavel: "bg-status-info text-status-info-foreground",
  relato_qualitativo: "bg-status-neutral text-status-neutral-foreground",
  alegacao_marketing: "bg-status-warning text-status-warning-foreground",
};

const TIPO_ICON: Record<AchadoTipo, typeof Hash> = {
  dado_quantificavel: Hash,
  relato_qualitativo: MessageCircle, // or another distinct lucide icon
  alegacao_marketing: Megaphone,
};
```
Also update the doc-comment above (currently says "DIAGNOSTICO-07 ... em 3 eixos" but only documents 2 values), and update `src/components/diagnostico-resultado.tsx:203-212`'s italic/muted text treatment, which currently only special-cases `alegacao_marketing` — decide deliberately whether `relato_qualitativo` should render like `dado_quantificavel` (full-weight text) or get its own visual treatment, since the whole point of the 3-category split (per the file's own doc-comment) was to stop giving `relato_qualitativo` the same visual weight as `dado_quantificavel`.

### CR-02: `buscas` telemetry array is shared and never reset across retry attempts, corrupting the persisted audit trail

**File:** `src/lib/ai/gerar-diagnostico.ts:84-135, 180`
**Issue:** `const buscas: string[] = [];` (line 84) is declared once, above the `for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; ...)` retry loop. Inside the loop, `onStepFinish` (lines 120-135) pushes every `web_search` query onto this same array — including on attempts that are later discarded via `continue` (lines 193, 197) after a `NoObjectGeneratedError` or `DiagnosticoSemFonteError`. Since `buscas` is never cleared at the top of each `tentativa` iteration, a successful 2nd attempt's returned `buscas` (line 180) silently includes every search query from the failed 1st attempt as well.

This is a real correctness bug, not a hypothetical: `MAX_TENTATIVAS = 2` and `REFORCO_RETRY` exist specifically because retries are expected to happen in production. Consequences:
- `diagnosticos.buscas` (an append-only, audit-trail column per the table's own doc-comment, existing specifically so "o custo sempre visível" — DIAGNOSTICO-10) permanently persists an inflated, wrong search count/list for any generation that needed a retry.
- The UI (`DiagnosticoResultado`, section 2 "Consultas executadas") shows the user search queries that were never part of the successful, returned diagnostic.
- `scripts/eval-diagnostico.mjs`'s own structural gate (`if (buscas.length > MAX_USES) falhas.push(...)`) can now fail with a false positive purely because a retry happened, even though each individual `generateText` call respected `webSearch_20250305({ maxUses: 6 })`.
**Fix:** Reset the accumulator at the start of every attempt so only the winning attempt's searches are returned:
```ts
for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
  const buscasTentativa: string[] = []; // reset per attempt
  try {
    const res = await generateText({
      ...
      onStepFinish: (step) => {
        for (const chamada of step.toolCalls) {
          if (chamada.toolName === "web_search" && ...) {
            buscasTentativa.push(String((chamada.input as { query: unknown }).query));
          }
        }
      },
    });
    ...
    return { ..., buscas: buscasTentativa, ... };
  } catch (err) {
    ultimoErro = err;
    ...
  }
}
```
(Move the declaration inside the loop body and drop the outer `const buscas: string[] = [];` at line 84.)

## Warnings

### WR-01: Committed eval evidence shows the eval's own merge gate failed after the D-23-06 fix it was meant to validate

**File:** `test/reports/2026-09-11-eval-diagnostico-3.md:9-13, 99-107`
**Issue:** `scripts/eval-diagnostico.mjs` documents itself as "gate manual de merge" and exits `process.exit(1)` when `goldFalhou || portaoFalhou` (lines 543-559 of the script). Reading the most recent committed report (`-3.md`, the latest of the three same-day reports):
- `costureira-sob-medida`: esperado `mudar_angulo`, obtido `abandonar` → `REGRESSAO`
- `estetica-beleza`: esperado `abandonar`, obtido `mudar_angulo` → `REGRESSAO`
- All 3 gold cases show `FAIL (1)` on the structural "portões" column, specifically the cross-check gate (9, 11, and 6 cited URLs respectively that don't appear in the real `res.sources` for that generation).

By the script's own documented exit logic, this run would have returned exit code 1 ("FALHOU"). This is evidence, committed inside this same phase, that the D-23-06 structural fix did not actually resolve gold-set discrimination reliably (2/3 gold verdicts still wrong on this run) and that source-grounding is weak (a large fraction of individual claim-level citations are not backed by real search results, even though the top-level DIAGNOSTICO-02 "at least 1 real source" gate passes). Since the review's framing describes this as "ending in a structural schema fix ... committed," it's worth flagging explicitly that the fix's own validation run did not pass — this should be re-run and either the rubric tightened further or the merge-gate expectation in the phase notes corrected.
**Fix:** Re-run `node scripts/eval-diagnostico.mjs --gold` until the gate passes (script exit 0) before treating D-23-06 as closed, or explicitly document in the phase record that the gate is currently red and why that's accepted.

### WR-02: `RascunhoMensagem.handleCopiar` has no error handling around `navigator.clipboard.writeText`

**File:** `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx:33-42`
**Issue:** `handleCopiar` is an `async function` passed directly to `onClick`. If `navigator.clipboard.writeText(texto)` rejects (denied permission, non-secure context/HTTP, or an iframe without the `clipboard-write` permission policy — all realistic in a solo-admin deployment that might not always be served over HTTPS locally), the promise rejects with no `.catch`, producing an unhandled promise rejection and leaving the user with silent failure: `copiado` never flips to `true`/back, and there is no toast or fallback telling the operator the copy didn't happen.
**Fix:**
```tsx
async function handleCopiar() {
  try {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiado(false), 2000);
  } catch {
    toast.error("Não foi possível copiar. Selecione o texto manualmente.");
  }
}
```

### WR-03: `assertTemFonte`/`DIAGNOSTICO_SEM_FONTE_MSG` are exported as "the" DIAGNOSTICO-02 gate but the real call site duplicates the check inline instead of calling them

**File:** `src/lib/ai/diagnostico-schema.ts:58-60, 174-178`; `src/lib/ai/gerar-diagnostico.ts:149-150`
**Issue:** The doc-comment on `DIAGNOSTICO_SEM_FONTE_MSG` (line 58) says "ver `assertTemFonte`", and `assertTemFonte` is documented as the gate that "lança `Error` quando o diagnóstico não tem nenhuma fonte". But the only production call site, `gerar-diagnostico.ts:149-150`, does not call `assertTemFonte` — it reimplements the same check inline (`if (fontes.length === 0) throw new DiagnosticoSemFonteError();`) with a different error class/message than `DIAGNOSTICO_SEM_FONTE_MSG`. `assertTemFonte` and `DIAGNOSTICO_SEM_FONTE_MSG` are today only exercised by `scripts/test-diagnostico-estrutural.cjs` (Grupo D), never by the app. This is dead production code masquerading as "the" gate, and the duplicated logic can silently drift (e.g. if one copy's message/threshold is updated and the other isn't).
**Fix:** Either call `assertTemFonte(fontes)` from `gerar-diagnostico.ts` and catch the generic `Error` there (mapping it to `DiagnosticoSemFonteError` if the distinct class matters), or delete `assertTemFonte`/`DIAGNOSTICO_SEM_FONTE_MSG` from the schema module and keep the check only where it's actually used, updating the harness accordingly.

### WR-04: Cross-check on hallucinated citations is advisory-only, and observed hallucination rates are high

**File:** `src/lib/ai/gerar-diagnostico.ts:154-171`; `src/actions/diagnostico-actions.ts:126`
**Issue:** The FM2 cross-check counts URLs cited inside the model's structured object that don't appear in the real `res.sources`, but this only ever produces a non-blocking `aviso` string — it can never fail the generation or force a retry, no matter how large the mismatch. The real eval data committed in this phase (see WR-01) shows this is not a rare edge case: 9, 11, and 6 mismatched citations respectively across the 3 gold cases, against total citation counts in roughly the same range — i.e. a large share (in some cases apparently most) of individual claim-level "fonte_url" citations in a "passing" diagnostic (`status: "ok"`, rendered to the user with full visual weight and clickable links) are not backed by the actual web search performed. This materially undermines DIAGNOSTICO-02/07's stated goal ("toda afirmação de peso carrega a URL que a sustenta ... nunca fabrique") since the UI has no visual distinction between a well-grounded and a hallucinated-citation achado — both render identically once `status: "ok"`.
**Fix:** Consider promoting the cross-check from advisory to a hard threshold (e.g. reject/retry when hallucinated-citation ratio exceeds some percentage, not just when zero real sources exist), or at minimum surface per-item grounding status in the UI (e.g. flag individual achados/gatilhos whose `fonte_url` isn't in `res.sources`) rather than only a single aggregate footnote.

## Info

### IN-01: Verdict label duplicated across two independent maps

**File:** `src/components/diagnostico-secao.tsx:30-34`; `src/components/veredito-sugerido-chip.tsx:16-20`
**Issue:** `VEREDITO_RESUMO` (`"aprofundar" | "mudar_angulo" | "abandonar"` → short label) and `VEREDITO_LABEL` in `veredito-sugerido-chip.tsx` both hardcode human-readable copy for the same 3-value enum, with slightly different wording ("mudar o ângulo" vs "Mudar o ângulo"). Any future 4th verdict value would need updating in two places with no compiler-enforced link between them beyond both using `Record<VereditoDecisao/string, ...>`.
**Fix:** Export `VEREDITO_LABEL` from `veredito-sugerido-chip.tsx` and reuse it (lower-cased) in `resumoVeredito`, or centralize both maps in one shared module.

### IN-02: `err.cause` logged verbatim on `NoObjectGeneratedError`

**File:** `src/lib/ai/gerar-diagnostico.ts:186-192`
**Issue:** The file's own doc-comment (lines 17-19) states the logging policy is an explicit allowlist of fields with no full request/response object. `cause` is included in that allowlist and is logged as-is (`cause: err.cause`) without knowing its shape — depending on the AI SDK's internals, `cause` could carry a larger nested object (e.g. the raw provider response) than intended by "allowlist of fields". This is server-only `console.error` output (not client-visible) so the risk is low, but worth a quick check that `err.cause` from `NoObjectGeneratedError` doesn't include the full request body/system prompt in server logs beyond what's needed for debugging.
**Fix:** If feasible, narrow the logged `cause` to its `message`/`name` rather than the whole value, or confirm via the AI SDK's type for `NoObjectGeneratedError.cause` that it's already a small, safe value.

---

_Reviewed: 2026-09-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
