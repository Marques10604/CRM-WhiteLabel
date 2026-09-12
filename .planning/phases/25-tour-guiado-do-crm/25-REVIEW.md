---
phase: 25-tour-guiado-do-crm
reviewed: 2026-09-12T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - scripts/test-tour-persistence.cjs
  - src/app/configuracoes/page.tsx
  - src/app/layout.tsx
  - src/components/app-sidebar.tsx
  - src/components/reiniciar-tour-button.tsx
  - src/components/tour-guiado.tsx
  - src/lib/tour-persistence.ts
  - src/lib/tour-steps.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-09-12
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the react-joyride v3 integration (`tour-guiado.tsx`, `tour-steps.ts`, `tour-persistence.ts`), its consumers (`reiniciar-tour-button.tsx`, `app-sidebar.tsx`, `configuracoes/page.tsx`, `layout.tsx`), and the pure-logic test harness (`scripts/test-tour-persistence.cjs`).

Verified against the installed `react-joyride@3.2.0` type definitions (`node_modules/react-joyride/dist/index.d.cts`):
- `Joyride` is imported as a named export (correct for v3).
- `onEvent` receives `EventData` (not the v2-era `CallBackProps`) — correct.
- Per-step `skipBeacon` (not `disableBeacon`) is used in `tour-steps.ts` — correct.
- `options.borderRadius` does not exist in v3's `Options` interface; the code correctly moves this to `styles.tooltip.borderRadius` — correct.
- `TOUR_STEPS` content is 100% static string literals with no interpolation and no `dangerouslySetInnerHTML`, matching the T-25-01 invariant and matching `25-UI-SPEC.md`'s "Copywriting Contract" character-for-character.
- `npx eslint` and `npx tsc --noEmit` both pass clean on all 8 files; `node scripts/test-tour-persistence.cjs` passes 11/11 assertions.

No blocking bugs or security issues found. The main gaps are: a spec-mandated visual affordance that was silently dropped without a documented decision, and a lack of defensive error handling around `localStorage` calls that are invoked unconditionally on every mount/event (unlike the rest of the persistence layer, which is otherwise carefully reasoned about in its own doc comments).

## Warnings

### WR-01: Spec-mandated spotlight accent ring silently dropped, no decision recorded

**File:** `src/components/tour-guiado.tsx:67-79`
**Issue:** `25-UI-SPEC.md` (lines 100-102) reserves the `--primary` accent color for exactly two uses: the primary "Next/Finish" button, **and** "o anel de destaque (spotlight) em volta do item da sidebar sob foco" (`spotlightPadding`/`options.spotlightShadow` custom com `var(--ring)`). The shipped `options` object only sets `spotlightPadding: 4` — there is no `styles.spotlight` override (the real v3 mechanism for coloring the spotlight cutout via `SVGAttributes<SVGPathElement>`, confirmed in `Styles.spotlight` in the installed `.d.cts`) and no equivalent replacement. `25-02-SUMMARY.md` documents the other 3 API divergences that were corrected (payload type, `skipBeacon`, `borderRadius` relocation) but contains no mention of this UI requirement being dropped or substituted. As shipped, the highlighted sidebar item during the tour has no accent-colored ring — only the default un-styled spotlight cutout — which is a genuine gap against a UI-SPEC requirement listed as non-optional (unlike the tooltip shadow on line 116, which the spec explicitly marks "não é um requisito bloqueante").
**Fix:**
```tsx
styles={{
  tooltip: { borderRadius: 10, padding: 16 },
  spotlight: { stroke: "var(--ring)", strokeWidth: 2 },
}}
```
Or, if this was in fact intentionally dropped as out of scope, record that decision in `25-02-SUMMARY.md` so a future reader doesn't mistake it for an oversight.

### WR-02: No error handling around `localStorage` access in the tour lifecycle

**File:** `src/components/tour-guiado.tsx:41,47-48`; `src/components/reiniciar-tour-button.tsx:18`
**Issue:** `window.localStorage.getItem/setItem/removeItem` are called directly with no `try/catch`, in three places that are all reachable during normal use: the mount effect (`lerTourVisto`), the tour completion/skip handler (`gravarTourVisto`), and the "Rever tour do CRM" button (`limparTourVisto` immediately followed by `window.location.reload()`). If storage access throws (quota exceeded, browser storage disabled by policy, third-party-storage restrictions, Safari private-mode edge cases), the effect body throws mid-execution — in `TourGuiado`'s mount effect this happens *after* `setMounted(true)` has already been scheduled but before `setRun(true)` runs, and in `ReiniciarTourButton` the throw happens *before* `window.location.reload()`, so the button silently does nothing instead of reloading. This is a narrow edge case (`T-25-02`'s threat model already accepts that the flag itself is user-tamperable), but the *access itself* failing was not considered, and an uncaught exception inside a React event handler / effect is a real user-visible failure mode (broken reload button, or an uncaught error surfacing to the nearest error boundary) rather than a graceful no-op.
**Fix:** Wrap the storage calls in `tour-persistence.ts` (not the call sites) so both consumers benefit automatically:
```ts
export function limparTourVisto(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // localStorage indisponível (quota/política do navegador) — falha
    // silenciosa é aceitável aqui: pior caso é o tour reaparecer.
  }
}
```
Apply the same pattern to `lerTourVisto` (fail to `false`) and `gravarTourVisto`.

### WR-03: `handleEvent` allocates a new function identity on every render

**File:** `src/components/tour-guiado.tsx:46-51`
**Issue:** `handleEvent` is a plain function declaration inside the component body, recreated on every render and passed as `onEvent` to `<Joyride>`. This isn't a correctness bug (Joyride doesn't rely on reference stability for `onEvent` across renders in the same way it might for a memoized child), but it is inconsistent with the project's general pattern of hoisting stable event handlers, and since `TourGuiado` re-renders whenever `run` changes (which happens right before this prop is read on the same render), it's cheap to make deliberate. Flagged as a minor quality nit, not required to fix.
**Fix:** Optional — wrap with `useCallback` if the team wants prop-identity stability documented as intentional:
```tsx
const handleEvent = useCallback((data: EventData) => {
  if (deveGravarComoVisto(data.status)) {
    gravarTourVisto(window.localStorage);
    setRun(false);
  }
}, []);
```

## Info

### IN-01: `NavItem.tourId` is a loosely-typed free-form string, not validated against `TOUR_STEPS` targets

**File:** `src/components/app-sidebar.tsx:32-37`; `src/lib/tour-steps.ts:27-63`
**Issue:** The five `tourId` values in `NAV_ITEMS` (`"nav-dashboard"`, `"nav-leads"`, `"nav-pipeline"`, `"nav-campanhas"`, `"nav-relatorios"`) and the five `target: '[data-tour="nav-*"]'` selectors in `TOUR_STEPS` are hand-duplicated string literals in two separate files with no shared constant and no compile-time or test-time check that they stay in sync. They currently match correctly, but a future rename of either side (e.g. renaming a nav item's `tourId`) would silently break the tour (Joyride would just fail to find the target — accepted per `T-25-04`, but still a maintainability trap for a currently-tested set of 5 items) without any lint/type error surfacing it.
**Fix:** Low priority given the small, stable list, but consider a shared const map (e.g. `TOUR_TARGET_IDS`) imported by both `app-sidebar.tsx` and `tour-steps.ts`, or extend `scripts/test-tour-persistence.cjs` (or a new harness) to assert `TOUR_STEPS.every(s => NAV_TOUR_IDS.includes(...))`.

---

_Reviewed: 2026-09-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
