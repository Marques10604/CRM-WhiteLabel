# Phase 25: Tour Guiado do CRM - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 9 (5 new, 4 modified)
**Analogs found:** 7 / 9 (2 have no direct analog — greenfield in this codebase, noted below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/tour-steps.ts` | config (static data) | transform | `src/components/app-sidebar.tsx` (`NAV_ITEMS` const array) | role-match |
| `src/lib/tour-persistence.ts` | utility (pure fn) | CRUD (read/write client storage) | `src/lib/lead-csv-export.ts` (pure-module structure/JSDoc) + `next-themes` (conceptual precedent, no code to copy) | partial (no localStorage precedent exists in `src/`) |
| `src/components/tour-guiado.tsx` | provider/component (client) | event-driven | `src/components/theme-toggle.tsx` + `src/components/theme-provider.tsx` | role-match (composite) |
| `src/components/reiniciar-tour-button.tsx` | component (client) | request-response | `src/components/configuracoes-form.tsx` (Button usage pattern) | role-match |
| `src/components/app-sidebar.tsx` | component (modified) | transform | itself (add `data-tour` attrs to existing `NAV_ITEMS`/`<Link>`) | exact (self-edit) |
| `src/app/layout.tsx` | root layout (modified) | composition | itself (add `<TourGuiado />` sibling of `{children}`, same slot as `ThemeProvider`) | exact (self-edit) |
| `src/app/configuracoes/page.tsx` / `src/components/configuracoes-form.tsx` | route + client form (modified) | request-response | itself + `configuracoes-form.tsx` Button pattern | exact (self-edit) |
| `scripts/test-tour-persistence.cjs` | test (harness) | transform (pure-fn assertions) | `scripts/test-lead-csv-export.cjs` | exact |
| `package.json` (scripts + dependency, modified) | config | — | existing `test:*` script block | exact (self-edit) |

## Pattern Assignments

### `src/lib/tour-steps.ts` (config, static data)

**Analog:** `src/components/app-sidebar.tsx` (`NAV_ITEMS`, lines 22-35) — this project's established convention for a typed `as const` array of nav metadata. Reuse the same literal-array-with-`as const` shape for `TOUR_STEPS`, but typed against `react-joyride`'s `Step`.

**Pattern to copy** (`src/components/app-sidebar.tsx:22-35`):
```typescript
const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/campanhas", label: "Campanhas", icon: Target },
  { href: "/mapa-de-nichos", label: "Mapa de Nichos", icon: MapIcon },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/nichos", label: "Nichos", icon: Tag },
  { href: "/motivos-perda", label: "Motivos de Perda", icon: ListX },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;
```

**Concretely, `NAV_ITEMS` must gain a `tourId` field on the 5 targeted items** (per RESEARCH.md Pattern 1 — do not rename existing `href`/`label`/`icon` keys, only add):
```tsx
const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock, tourId: "nav-dashboard" },
  { href: "/leads", label: "Leads", icon: Users, tourId: "nav-leads" },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, tourId: "nav-pipeline" },
  { href: "/campanhas", label: "Campanhas", icon: Target, tourId: "nav-campanhas" },
  { href: "/mapa-de-nichos", label: "Mapa de Nichos", icon: MapIcon },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, tourId: "nav-relatorios" },
  // ...resto inalterado (Importar, Mapa de Nichos, Templates, Nichos, Motivos de Perda, Lixeira, Configurações ficam sem tourId)
] as const;
```
Then in the `<Link>` render (`app-sidebar.tsx:61-75`), add `data-tour={item.tourId}` conditionally (or unconditionally — `undefined` renders no attribute, which is safe and simpler).

**Copy for `tour-steps.ts` itself** — exact copy already vetted in `25-UI-SPEC.md` Copywriting Contract (titles/body text are LOCKED, do not rephrase) and `25-RESEARCH.md` Code Examples:
```typescript
// src/lib/tour-steps.ts
import type { Step } from "react-joyride";

export const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Follow-ups",
    content:
      "Aqui ficam os follow-ups vencidos, de hoje e dos próximos 7 dias — o painel que evita esquecer um lead.",
    placement: "right",
    disableBeacon: true, // confirmar nome exato do campo contra o .d.ts instalado (Open Question 1)
  },
  {
    target: '[data-tour="nav-leads"]',
    title: "Leads",
    content: "A lista completa de leads, com filtros por nicho, etapa e origem.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-pipeline"]',
    title: "Pipeline",
    content:
      "O funil de vendas em quadro — arraste um lead entre as etapas conforme ele avança.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-campanhas"]',
    title: "Campanhas de nicho",
    content:
      "Organize a exploração de um nicho novo: oferta, janela de tempo, diagnóstico de IA e veredito final.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-relatorios"]',
    title: "Relatórios",
    content: "Métricas do funil: conversão, motivos de perda e origem dos leads no período.",
    placement: "right",
    disableBeacon: true,
  },
];
```
No error handling / validation needed — 100% static data, no I/O (per Security Domain in RESEARCH.md: no dynamic interpolation, ever).

---

### `src/lib/tour-persistence.ts` (utility, pure functions — testable per Wave 0 gap)

**No direct analog exists in `src/`** — confirmed via `Grep("localStorage", path: "src")` returning zero matches. `next-themes` is the only conceptual precedent for "client-only preference persisted in the browser," but it is a third-party package (no project code to copy). Use `src/lib/lead-csv-export.ts` as the **structural** analog for how this project writes a small, pure, side-effect-isolated module with a JSDoc header explaining *why* it is pure (so a `.cjs` harness can import it without a DOM).

**Imports/JSDoc header pattern to copy** (`src/lib/lead-csv-export.ts:1-19`):
```typescript
import Papa from "papaparse";
import { format } from "date-fns";

import type { LeadRow } from "@/components/lead-table-columns";

/**
 * Serialização PURA de `LeadRow[]` para o texto de um arquivo CSV [...]
 *
 * Zero DOM, zero React — o trigger de download do arquivo mora em
 * `lead-table-toolbar.tsx`, não aqui, para este módulo ficar 100% testável
 * pelo harness `.cjs` (`scripts/test-lead-csv-export.cjs`).
 */
```

**Core pattern to write** (mirroring that structure, adapted for the tour — keep `localStorage` access isolated in thin functions so the harness can monkey-patch/mock `globalThis.localStorage` before importing):
```typescript
// src/lib/tour-persistence.ts
/**
 * Lógica PURA de persistência do tour guiado (Fase 25, TUTORIAL-02/05).
 * Zero DOM assumido nas funções de decisão — só `lerTourVisto`/`gravarTourVisto`
 * tocam `window.localStorage`, e só são chamadas depois do guard `mounted` em
 * `TourGuiado` (nunca durante SSR). Isolado para o harness `.cjs`
 * (`scripts/test-tour-persistence.cjs`) poder mockar localStorage sem DOM real.
 */

export const TOUR_STORAGE_KEY = "tourVisto";

/** Decide, a partir do status emitido pelo Joyride, se a flag "já visto" deve ser gravada. */
export function deveGravarComoVisto(status: string): boolean {
  return status === "finished" || status === "skipped";
}

export function lerTourVisto(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(TOUR_STORAGE_KEY) !== null;
}

export function gravarTourVisto(storage: Pick<Storage, "setItem">): void {
  storage.setItem(TOUR_STORAGE_KEY, "true");
}

export function limparTourVisto(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(TOUR_STORAGE_KEY);
}
```
**Why the `Pick<Storage, ...>` param:** lets the `.cjs` harness pass a plain in-memory object (`{ getItem, setItem, removeItem }`) instead of needing a real `window`/`localStorage`/jsdom — same "keep DOM out of the pure function" discipline as `lead-csv-export.ts`.

**Error handling:** none needed — `localStorage` calls are synchronous and, per RESEARCH.md Security Domain, the worst case if the user tampers with the key manually is a cosmetic replay of the tour (not a functional error to catch).

---

### `src/components/tour-guiado.tsx` (client provider/component, event-driven)

**Analog:** `src/components/theme-toggle.tsx` (mount guard pattern) + `src/components/theme-provider.tsx` (provider-as-layout-sibling pattern).

**Mount guard pattern to copy** (`src/components/theme-toggle.tsx:1-24`):
```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Guard de hidratação documentado do next-themes: o servidor não conhece o
  // tema resolvido, então o botão só renderiza o estado real após montar no
  // cliente. Mesmo falso-positivo do React Compiler já aceito no projeto
  // (STATE.md decisão 07-02; lead-timeline-dialog.tsx, whatsapp-preview-dialog.tsx).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return ( /* ... skeleton/hidden fallback ... */ );
  }
  // ...
}
```
Adapt directly for `TourGuiado`: same `mounted` guard shape, same `eslint-disable-next-line react-hooks/set-state-in-effect` comment citing the same precedent (`STATE.md` decisão 07-02), but instead of a visible skeleton, `return null` while `!mounted` (per `25-UI-SPEC.md` Estados e Interação #1 and RESEARCH.md's recommended guard). Add a second `useEffect`-driven read of `tour-persistence.ts`'s `lerTourVisto`/`window.localStorage` to decide the initial `run` state.

**Provider-as-layout-sibling pattern** (`src/components/theme-provider.tsx`, full file, 12 lines):
```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```
`TourGuiado` does not wrap `{children}` (it has no children to wrap — it is a leaf sibling, per the System Architecture Diagram in RESEARCH.md and the Layout section of UI-SPEC.md), so this is only a **structural/mounting** precedent (where in the tree it sits — sibling of `AppSidebar`/`{children}`, inside `ThemeProvider`), not a wrapping-children pattern to literally copy.

**Core event-driven pattern** — from `25-RESEARCH.md` Code Examples (already reconciled against `25-UI-SPEC.md`'s locked copy/tokens/button order):
```tsx
"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, type CallBackProps } from "react-joyride"; // CONFIRMAR contra node_modules/react-joyride .d.ts antes de codar (Assumption A2)
import { TOUR_STEPS } from "@/lib/tour-steps";
import { deveGravarComoVisto, gravarTourVisto, lerTourVisto } from "@/lib/tour-persistence";

export function TourGuiado() {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mesmo precedente aceito (STATE.md decisão 07-02), ver theme-toggle.tsx
  useEffect(() => {
    setMounted(true);
    if (!lerTourVisto(window.localStorage)) setRun(true);
  }, []);

  if (!mounted) return null;

  function handleEvent(data: CallBackProps) {
    if (deveGravarComoVisto(data.status)) {
      gravarTourVisto(window.localStorage);
      setRun(false);
    }
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        buttons: ["skip", "back", "close", "primary"], // ordem/valores a reconferir no .d.ts
        primaryColor: "var(--primary)",
        backgroundColor: "var(--popover)",
        textColor: "var(--popover-foreground)",
        overlayColor: "color-mix(in oklch, var(--foreground) 10%, transparent)", // 25-UI-SPEC.md Color: 10%, não os 40% do rascunho do RESEARCH
        borderRadius: 10, // rounded-lg / --radius-lg equivalente, per 25-UI-SPEC.md Color table
      }}
    />
  );
}
```
**Error handling:** none — Joyride manages its own internal state/portal; the only "error" surface is a missing `data-tour` target, which per UI-SPEC.md is explicitly out of scope for this phase's 5 targets (always present in the sidebar DOM).

---

### `src/components/reiniciar-tour-button.tsx` (client component, request-response)

**Analog:** `src/components/configuracoes-form.tsx` — `Button` usage/import pattern (not the whole form's react-hook-form machinery, just the `Button` import + `variant`/`onClick` idiom).

**Pattern to copy** (`src/components/configuracoes-form.tsx:9`, `:291-294`):
```tsx
import { Button } from "@/components/ui/button";
// ...
<Button type="button" variant="outline" onClick={handleAdicionarIntervalo}>
  <Plus className="size-4" />
  Adicionar intervalo
</Button>
```
Confirmed available variant: `outline` — `src/components/ui/button.tsx:12-13` (`bg-background hover:bg-muted ...`), matching `25-UI-SPEC.md`'s explicit choice of `variant="outline"` for this button.

**Core pattern to write** (copy locked, from `25-UI-SPEC.md` Copywriting Contract — "Rever tour do CRM" + caption below, `text-xs text-muted-foreground` per Typography table):
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { limparTourVisto } from "@/lib/tour-persistence";

export function ReiniciarTourButton() {
  function handleClick() {
    limparTourVisto(window.localStorage);
    window.location.reload(); // opção simples aceita por 25-RESEARCH.md — evita Context/estado global
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={handleClick}>
        Rever tour do CRM
      </Button>
      <p className="text-xs text-muted-foreground">
        Reapresenta as 5 telas principais do CRM. Você pode pular a qualquer momento.
      </p>
    </div>
  );
}
```
**Placement:** `25-UI-SPEC.md` Layout diagram nests this under `ConfiguracoesForm` inside `/configuracoes/page.tsx`. The planner must choose one concrete insertion point — either (a) add `<ReiniciarTourButton />` as a new block inside `configuracoes-form.tsx`'s returned JSX (consistent with that file already owning all of `/configuracoes`'s interactive UI, see the `rounded-lg border bg-card p-6` card pattern at lines 170/231 for a 3rd card), or (b) render it as a sibling of `<ConfiguracoesForm config={config} />` directly in `src/app/configuracoes/page.tsx` (simpler diff, no need to touch the RHF-heavy form file at all). Option (b) is lower-risk (zero coupling to the form's `useActionState`/RHF logic) and is RECOMMENDED.

---

### `src/components/app-sidebar.tsx` (modified — add `data-tour`)

**This file is its own analog** — see `tour-steps.ts` section above for the exact `NAV_ITEMS`/`<Link>` diff. No new import needed beyond what already exists; only `tourId` fields + one `data-tour={item.tourId}` prop on the existing `<Link>` (`app-sidebar.tsx:61-75`).

---

### `src/app/layout.tsx` (modified — mount `<TourGuiado />`)

**This file is its own analog.** Current structure (`src/app/layout.tsx:42-53`):
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  <AppSidebar />
  <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-8 py-8">
    {children}
  </main>
  <Toaster />
</ThemeProvider>
```
Add `<TourGuiado />` as a sibling, matching the System Architecture Diagram in `25-RESEARCH.md` (irmão de `{children}`, dentro de `ThemeProvider` para poder usar `var(--primary)` etc. já resolvidos, embora `TourGuiado` não dependa de `useTheme` diretamente — só dos tokens CSS):
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  <AppSidebar />
  <TourGuiado />
  <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-8 py-8">
    {children}
  </main>
  <Toaster />
</ThemeProvider>
```
Add `import { TourGuiado } from "@/components/tour-guiado";` alongside the existing `AppSidebar`/`ThemeProvider` imports (`layout.tsx:4-5`).

---

### `src/app/configuracoes/page.tsx` (modified — render `<ReiniciarTourButton />`)

**This file is its own analog.** Current (full file, 13 lines):
```tsx
import { getConfiguracoes } from "@/db/queries";
import { ConfiguracoesForm } from "@/components/configuracoes-form";

export default async function ConfiguracoesPage() {
  const config = await getConfiguracoes();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Configurações</h1>
      <ConfiguracoesForm config={config} />
    </div>
  );
}
```
Recommended edit (Option b from `reiniciar-tour-button.tsx` section — sibling in the same `flex flex-col gap-6` column, no changes to `ConfiguracoesForm`'s props/logic):
```tsx
import { getConfiguracoes } from "@/db/queries";
import { ConfiguracoesForm } from "@/components/configuracoes-form";
import { ReiniciarTourButton } from "@/components/reiniciar-tour-button";

export default async function ConfiguracoesPage() {
  const config = await getConfiguracoes();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Configurações</h1>
      <ConfiguracoesForm config={config} />
      <ReiniciarTourButton />
    </div>
  );
}
```
This page stays a Server Component — `ReiniciarTourButton` is a small `"use client"` leaf, same pattern already used for `ThemeToggle` inside the (client) `AppSidebar`.

---

### `scripts/test-tour-persistence.cjs` (test harness, pure-fn assertions)

**Analog:** `scripts/test-lead-csv-export.cjs` (full structure: shebang, `register` of the TS-alias loader, `check()` helper, dynamic `import()`, exit codes).

**Boilerplate to copy verbatim** (`scripts/test-lead-csv-export.cjs:1-41`):
```javascript
#!/usr/bin/env node
"use strict";

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

(async () => {
  const m = await import("@/lib/tour-persistence");
  const { TOUR_STORAGE_KEY, deveGravarComoVisto, lerTourVisto, gravarTourVisto, limparTourVisto } = m;

  // --- deveGravarComoVisto: finished/skipped => true, tudo mais => false ---
  check(deveGravarComoVisto("finished") === true, `deveGravarComoVisto("finished") -> true`);
  check(deveGravarComoVisto("skipped") === true, `deveGravarComoVisto("skipped") -> true`);
  check(deveGravarComoVisto("running") === false, `deveGravarComoVisto("running") -> false`);
  check(deveGravarComoVisto("paused") === false, `deveGravarComoVisto("paused") -> false`);

  // --- lerTourVisto / gravarTourVisto / limparTourVisto contra um localStorage mockado ---
  {
    const store = new Map();
    const mockStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    };

    check(lerTourVisto(mockStorage) === false, `lerTourVisto: chave ausente -> false`);
    gravarTourVisto(mockStorage);
    check(store.get(TOUR_STORAGE_KEY) === "true", `gravarTourVisto grava "true" na chave ${TOUR_STORAGE_KEY}`);
    check(lerTourVisto(mockStorage) === true, `lerTourVisto: chave presente -> true`);
    limparTourVisto(mockStorage);
    check(lerTourVisto(mockStorage) === false, `limparTourVisto remove a chave -> lerTourVisto volta a false`);
  }

  if (failed > 0) {
    console.error(`\n[test-tour-persistence] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-tour-persistence] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-tour-persistence] ERRO:", err.stack || err);
  process.exit(1);
});
```
**Register in `package.json`** (`package.json:24-34` pattern — add one line to the `scripts` block, same convention as every other `test:*` entry):
```json
"test:tour-persistence": "node scripts/test-tour-persistence.cjs"
```

## Shared Patterns

### Client-only mount guard (hydration-safe localStorage/browser API access)
**Source:** `src/components/theme-toggle.tsx` lines 13-24
**Apply to:** `src/components/tour-guiado.tsx` (mandatory — Joyride/`localStorage` must never touch SSR render)
```tsx
const [mounted, setMounted] = useState(false);
// eslint-disable-next-line react-hooks/set-state-in-effect -- mesmo precedente aceito (STATE.md decisão 07-02)
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### Provider mounted as layout sibling (not wrapping `{children}`)
**Source:** `src/app/layout.tsx` lines 42-53 (`ThemeProvider` wraps `AppSidebar` + `{children}` + `Toaster`; `AppSidebar` itself is a sibling of `{children}`, not a wrapper)
**Apply to:** `<TourGuiado />` placement in `layout.tsx` — sibling of `<AppSidebar />` and `{children}`, mounted once, persists across all routes (this is the entire architectural justification in RESEARCH.md for why a sidebar-anchored tour needs zero `router.push`).

### `Button` primitive usage (`variant`/`size` conventions)
**Source:** `src/components/configuracoes-form.tsx` line 291, `src/components/ui/button.tsx` lines 10-21
**Apply to:** `ReiniciarTourButton` — use `variant="outline"` (locked by `25-UI-SPEC.md`), `type="button"` (never submit-type for a non-form action).

### Pure-module-with-JSDoc-rationale (testable without DOM/browser)
**Source:** `src/lib/lead-csv-export.ts` lines 1-19 (module-level JSDoc explaining *why* the module has zero DOM/React so a `.cjs` harness can import it directly)
**Apply to:** `src/lib/tour-persistence.ts` and `src/lib/tour-steps.ts` — both must stay free of JSX/DOM/`window` access at the module top level so `scripts/test-tour-persistence.cjs` can `import()` them under plain Node via the existing `ts-alias-loader.mjs` registration.

### `.cjs` test harness skeleton (`register` + `check()` + dynamic import + exit codes)
**Source:** `scripts/test-lead-csv-export.cjs` lines 1-41, 228-237
**Apply to:** `scripts/test-tour-persistence.cjs` (copy verbatim, only swap the imported module/fixtures — see full excerpt above). Register the new script in `package.json`'s `scripts` block under the existing `test:*` naming convention (`package.json` lines 24-34).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/tour-persistence.ts` (the `localStorage` read/write itself, not the module-structure convention) | utility | CRUD | `Grep("localStorage", path: "src")` returns zero matches — no prior project code touches `localStorage` directly (the only precedent, `next-themes`, is a black-box npm package, not project source to copy from). Use RESEARCH.md's Code Examples (`TourGuiado`/`ReiniciarTourButton` skeletons) as the primary source for this specific mechanic; the pure-module/JSDoc *structure* still comes from `lead-csv-export.ts` (see Pattern Assignments above). |
| `react-joyride` API surface itself (`Joyride`, `STATUS`, `CallBackProps`, `options`/`Step` shape) | third-party library usage | event-driven | Brand new dependency in this codebase (`npm ls react-joyride` confirms absence today) — no in-repo analog exists or can exist. RESEARCH.md flags the exact API (v3, `onEvent` not `callback`) as MEDIUM confidence and instructs the executor to reconfirm against `node_modules/react-joyride`'s shipped `.d.ts` before coding (Assumptions Log A2, Open Question 1) — this is a planner/executor task, not something a pattern map can resolve by reading existing code. |

## Metadata

**Analog search scope:** `src/components/`, `src/lib/`, `src/hooks/`, `src/app/`, `scripts/`, `src/components/ui/`, `package.json`
**Files scanned:** `theme-toggle.tsx`, `theme-provider.tsx`, `app-sidebar.tsx`, `layout.tsx`, `configuracoes/page.tsx`, `configuracoes-form.tsx`, `lead-csv-export.ts`, `test-lead-csv-export.cjs`, `use-first-contact-trigger.ts` (checked, not used — no `localStorage`), `button.tsx`, `package.json` scripts block. Grep confirmed zero existing `localStorage` usage in `src/`.
**Pattern extraction date:** 2026-09-12
