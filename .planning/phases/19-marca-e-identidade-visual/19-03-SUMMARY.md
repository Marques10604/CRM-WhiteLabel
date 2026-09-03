---
phase: 19-marca-e-identidade-visual
plan: 03
subsystem: ui
tags: [tailwind-v4, shadcn-tokens, oklch, wcag-aa, design-system, css-variables]

requires:
  - phase: 19-01
    provides: "sensores check:contrast (30 pares WCAG) e verify:brand (grep-guard de cor)"
  - phase: 19-02
    provides: "paleta 'Corrente Funda · Sóbria' aplicada em globals.css (:root + .dark); --sidebar-*/--chart-* deixados intactos de propósito"
provides:
  - "escala semântica --status-* (neutral/info/warning/success/danger + -foreground) em :root e .dark"
  - "10 mapeamentos --color-status-* no @theme inline (habilita utilitários bg-status-*/text-status-*/border-status-*)"
  - "8 --sidebar-* aliasados aos tokens core nos 2 blocos (leftover azul-roxo do default shadcn eliminado)"
  - "4 arquivos de maior densidade de cor de status 100% migrados para token: etapa-badge, csv-import-preview-table, followup-dashboard, relatorios/page"
  - "gate check:contrast VERDE pela primeira vez (30/30 pares, menor razão 5.22)"
affects: [19-04, 19-05, 19-06]

tech-stack:
  added: []
  patterns:
    - "Mapa semântico Record<Stage,string> de classe utilitária (STAGE_TOKEN) separado do mapa de rótulo (STAGE_LABEL) — cor nunca acopla export consumido por outra superfície"
    - "headerClass: string único no lugar de par headerBg/headerText hex + style inline"
    - "faixa de aviso transitório usa bg-status-warning (responde ao .dark), não escala amber-* default do Tailwind"

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/etapa-badge.tsx
    - src/components/csv-import-preview-table.tsx
    - src/components/followup-dashboard.tsx
    - src/app/relatorios/page.tsx

key-decisions:
  - "--status-warning-foreground e --status-success-foreground em :root escurecidos de L0.48/L0.48 para L0.44/L0.45 vs. o ponto de partida do 19-RESEARCH — margem extra de AA (não afrouxou o gate)"
  - "dateClassName do dashboard usa os tokens -foreground (text-status-danger-foreground / -warning-foreground) conforme o PLAN, não os tokens base sugeridos no 19-PATTERNS"
  - "--sidebar-* aliasados via var(--card)/var(--primary)/var(--accent)/var(--border)/var(--ring) — 1 nível de indireção, dentro do limite do check-contrast"

patterns-established:
  - "STAGE_TOKEN/STAGE_LABEL: rótulo e cor em mapas Record<Stage,string> distintos"
  - "headerClass único aplicado via cn() em vez de style inline por campo"

requirements-completed: [BRAND-02]

duration: 22min
completed: 2026-09-03
---

# Phase 19 Plano 03: Escala semântica --status-* + alias --sidebar- Summary

**Criada a escala `--status-*` (5 famílias × light/dark, todas WCAG AA), os `--sidebar-*` passaram a seguir a paleta nova nos dois modos, e os 4 arquivos de maior densidade de cor de status migraram por completo de hex/style inline para classe utilitária de token.**

## Performance

- **Duration:** ~22 min
- **Completed:** 2026-09-03
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- **Escala `--status-*` (D-08)** existe nos 3 lugares: `@theme inline` (10 `--color-status-*`), `:root` (10 pares) e `.dark` (10 pares). As 5 famílias têm matizes distintos (`:root` H = 25/85/155/255, gaps ≥ 60) e continuam mutuamente distinguíveis.
- **`check:contrast` VERDE pela primeira vez** — 30/30 pares passam AA (15 pares × `:root`/`.dark`), menor razão medida = **5.22** (`--destructive` sobre `--background` em `:root`, min 3.0); menor razão de par de status = **5.66** (`--status-danger-foreground` sobre `--status-danger` em `:root`).
- **`--sidebar-*` alinhados** — os 8 tokens viram alias de `--card`/`--card-foreground`/`--primary`/`--primary-foreground`/`--accent`/`--accent-foreground`/`--border`/`--ring` em `:root` E `.dark`. O leftover `oklch(0.488 0.243 264.376)` do `.dark --sidebar-primary` sumiu (Pitfall 3 / T-19-09).
- **4 arquivos 100% em token** — zero `style` inline de cor, zero hex, zero `zinc-*`/`amber-*` em `etapa-badge.tsx`, `csv-import-preview-table.tsx`, `followup-dashboard.tsx`, `relatorios/page.tsx`. Saíram da lista do `verify:brand` (que caiu de 121 findings/32 arq. → 88/28).
- **`STAGE_OPTIONS` intacto** — dividido `STAGE_CONFIG` em `STAGE_LABEL` + `STAGE_TOKEN`; export e assinatura `{ value, label }[]` inalterados, `tsc` confirma `lead-table-toolbar.tsx` não quebrou.
- Os 2 botões "Novo lead" do dashboard e o "Confirmar importação" voltaram ao `<Button>` default (sem `className` de cor).

## Valores OKLCH finais dos tokens `--status-*` (para 19-04 / 19-05 reusarem sem redefinir)

### `:root`
| Token | Base | Foreground |
|---|---|---|
| neutral | `oklch(0.97 0 0)` | `oklch(0.37 0 0)` |
| info    | `oklch(0.93 0.05 255)` | `oklch(0.45 0.16 255)` |
| warning | `oklch(0.94 0.06 85)` | `oklch(0.44 0.11 65)` |
| success | `oklch(0.94 0.06 155)` | `oklch(0.45 0.13 155)` |
| danger  | `oklch(0.93 0.05 25)` | `oklch(0.48 0.19 25)` |

### `.dark`
| Token | Base | Foreground |
|---|---|---|
| neutral | `oklch(0.27 0 0)` | `oklch(0.87 0 0)` |
| info    | `oklch(0.30 0.06 255)` | `oklch(0.85 0.10 255)` |
| warning | `oklch(0.32 0.06 70)` | `oklch(0.87 0.10 85)` |
| success | `oklch(0.30 0.07 155)` | `oklch(0.87 0.12 155)` |
| danger  | `oklch(0.30 0.08 25)` | `oklch(0.87 0.12 25)` |

Razões AA medidas (`-foreground` sobre base): `:root` neutral 9.56 / info 6.07 / warning 6.69 / success 5.86 / danger 5.66 · `.dark` neutral 10.17 / info 8.51 / warning 8.63 / success 9.35 / danger 8.35.

## Task Commits

1. **Task 1: escala --status-* + alias --sidebar-* em globals.css** — `ce0874e` (feat)
2. **Task 2: refatorar etapa-badge.tsx e csv-import-preview-table.tsx** — `fe88376` (feat)
3. **Task 3: refatorar followup-dashboard.tsx e relatorios/page.tsx** — `eb0d440` (feat)

## Files Created/Modified

- `src/app/globals.css` — 10 `--color-status-*` no `@theme inline`; 10 pares `--status-*` em `:root` e `.dark` sob comentário D-08; 8 `--sidebar-*` aliasados nos 2 blocos.
- `src/components/etapa-badge.tsx` — `STAGE_CONFIG` → `STAGE_LABEL` + `STAGE_TOKEN`; `<Badge>` por `cn("border-transparent", STAGE_TOKEN[stage])`; import de `cn`.
- `src/components/csv-import-preview-table.tsx` — 5 badges (4 flags + "Cortado em 500") por `bg-status-*`/`text-status-*-foreground`; checkbox `accent-[#0D9488]` → `accent-primary`; `bg-[#F4F4F5]` → `bg-muted`; botão "Confirmar importação" → `<Button>` default.
- `src/components/followup-dashboard.tsx` — `headerBg`/`headerText` → `headerClass` único aplicado via `cn()`; 3 `style` inline removidos; `dateClassName` por token; `bg-[#F4F4F5]` → `bg-muted`; card `border-zinc-200 bg-white ring-[#0D9488]` → `border bg-card ring-ring`; 2 botões "Novo lead" → `<Button>` default; import de `cn`.
- `src/app/relatorios/page.tsx` — faixa de intervalo inválido `border-amber-200 bg-amber-50 text-amber-900` → `border-status-warning bg-status-warning text-status-warning-foreground`; 3 `<section>` `border-zinc-200 bg-white` → `border bg-card`.

## Decisions Made

- **Foreground de warning/success em `:root` escurecido** de `L0.48` (ponto de partida do 19-RESEARCH) para `L0.44`/`L0.45` — o par passava, mas a margem ficava justa; escurecer o foreground (mantendo o matiz) é a manobra sancionada pelo plano. Nunca se tocou no limiar do script.
- **`dateClassName` usa os tokens `-foreground`** (`text-status-danger-foreground`, `text-status-warning-foreground`) conforme instrução literal do PLAN Task 3A, não os tokens base (`text-status-danger`) que o 19-PATTERNS esboçava.
- **`--sidebar-*` como alias `var(--*)`** em vez de copiar os valores OKLCH — 1 nível de indireção, resolve dentro do limite de 3 do `check-contrast`, e mantém o sidebar automaticamente sincronizado se a paleta core mudar.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Todos os gates passaram na primeira execução após cada task (`check:contrast` 30/30, `tsc` 0, `lint` 0 com os 4 warnings `incompatible-library` pré-existentes/deferidos, `test:group-by-urgency` 0, `npm run build` 0 com 13 páginas).

## Estado dos gates após este plano

| Gate | Exit | Nota |
|---|---|---|
| `npm run check:contrast` | **0** (30/30) | ✅ verde pela 1ª vez — este plano tornou verde |
| `npm run verify:brand` | 1 (88 findings / 28 arq.) | ✅ RED esperado até 19-05; os 4 arquivos deste plano saíram da lista |
| `npm run verify:brand-md` | 0 (9/9) | ✅ (inalterado desde 19-02) |
| `npx tsc --noEmit` | 0 | ✅ |
| `npm run lint` | 0 | ✅ 4 warnings `incompatible-library` pré-existentes (deferidos na Fase 17) |
| `npm run test:group-by-urgency` | 0 | ✅ régua de urgência não tocada |
| `rm -rf .next && npm run build` | 0 | ✅ 13 páginas (Turbopack, ~57s compile + 22s TS) |

## Next Phase Readiness

- **19-04** (refactor cor→token de ~14 arquivos: pipeline, lista de leads, wizard CSV) e **19-05** (13 arquivos restantes + rename → "SOLO" + `bg-white` do `<body>`) reusam os tokens `--status-*` e `--sidebar-*` já definidos aqui — não redefinir.
- Os utilitários `bg-status-*` / `text-status-*-foreground` / `border-status-*` já estão disponíveis no Tailwind v4 via `@theme inline`.
- `verify:brand` fica verde só no 19-05 (quando o último arquivo de cor for migrado + o rename do `package.json`).
- `pipeline-lead-card.tsx`, `pipeline-column.tsx`, `lead-table.tsx` (botão WhatsApp verde) ainda usam hex de status — alvos do 19-04, mesmo idioma `STAGE_TOKEN`/`headerClass` estabelecido aqui.

## Self-Check: PASSED

- `src/app/globals.css` — FOUND, `--color-status-*` = 10, `--status-danger-foreground:` = 2, leftover azul-roxo = 0
- `src/components/etapa-badge.tsx` — FOUND, `bg-status-` = 5, `style={{` = 0, `STAGE_OPTIONS` exportado
- `src/components/csv-import-preview-table.tsx` — FOUND, `accent-primary` = 1, `accent-[` = 0, `style={{` = 0
- `src/components/followup-dashboard.tsx` — FOUND, `headerClass` = 5, `headerBg|headerText` = 0, `style={{` = 0, `bg-[#0D9488]` = 0
- `src/app/relatorios/page.tsx` — FOUND, `amber` = 0
- Commits `ce0874e`, `fe88376`, `eb0d440` — todos FOUND em `git log`

---
*Phase: 19-marca-e-identidade-visual*
*Completed: 2026-09-03*
