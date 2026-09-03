---
phase: 19-marca-e-identidade-visual
plan: 01
subsystem: infra
tags: [design-tokens, wcag, oklch, grep-guard, shadcn, tailwind-v4, brand, verification]

requires:
  - phase: 17-limpeza-de-lint-do-repo
    provides: "override eslint scripts/**/*.cjs (no-require-imports off) — os 3 gates passam no lint"
  - phase: 18-auditoria-retroativa-no-navegador
    provides: "precedente code+data para UAT sem navegador no host de 4GB"
provides:
  - "scripts/verify-no-hardcoded-colors.cjs — grep-guard de cor hardcoded + nome antigo (npm run verify:brand)"
  - "scripts/verify-brand-md.cjs — gate de estrutura do brand.md (npm run verify:brand-md)"
  - "scripts/check-contrast.cjs — gate WCAG AA sobre :root e .dark com conversão OKLCH->sRGB real (npm run check:contrast)"
  - ".gitignore cobre /.brand-preview/ e *.css.bak antes de o skill /brand-design rodar"
  - "19-HUMAN-UAT.md — checklist D-19 das 10 rotas x (claro + .dark) + 6 dialogs, não-bloqueante"
affects: [19-02, 19-03, 19-04, 19-05, 19-06]

tech-stack:
  added: []
  patterns:
    - "check-contrast.cjs: OKLCH->OKLab->LMS->linear sRGB (matriz inversa padrão) -> clamp -> gama -> luminância WCAG; token ausente = falha explícita, nunca pulado"
    - "grep-guard com arg de CLI opcional que troca o alvo src/ por um dir (prova de fixture limpa nas duas direções)"

key-files:
  created:
    - scripts/verify-no-hardcoded-colors.cjs
    - scripts/verify-brand-md.cjs
    - scripts/check-contrast.cjs
    - .planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "verify-brand-md.cjs aceita variable: --font-(sans|mono|serif|heading) — heading incluído porque D-18 pode materializar --font-heading no layout"
  - "check-contrast: clamp linear -> gama sRGB -> re-linearize WCAG (round-trip) para respeitar o clip de gamut sem perder precisão"
  - "PARTE B do grep-guard (package.json) só roda no modo default — a prova de fixture não pode depender do estado do repo"
  - "campo package.json name preservado como crm-leads — o rename para solo é da Task 3 do plano 19-05 (D-04), onde a PARTE B precisa ficar limpa"

patterns-established:
  - "Sensor RED-por-construção: os 3 gates saem exit 1 de propósito na Onda 0 (estado RED do Nyquist); ficam verdes ao longo das ondas 2-6"
  - "check(cond, msg) + contador failed/total para gates multi-assert que precisam reportar TODAS as falhas antes de sair"

requirements-completed: [BRAND-01, BRAND-02, BRAND-03]

duration: 30min
completed: 2026-09-03
---

# Phase 19 Plan 01: Wave 0 — Sensores de Marca e Checklist D-19 Summary

**Três gates automatizados sem navegador (grep-guard de cor hardcoded + nome antigo, gate de estrutura do brand.md, gate WCAG AA com conversão OKLCH->sRGB real sobre :root e .dark), o .gitignore que blinda os artefatos do /brand-design, e o checklist D-19 das 10 rotas — todos os sensores VERMELHOS por construção, como esperado.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-03T01:00:00Z (aprox.)
- **Completed:** 2026-09-03T01:30:00Z (aprox.)
- **Tasks:** 3
- **Files modified:** 6 (4 criados, 2 modificados)

## Accomplishments

- `scripts/verify-no-hardcoded-colors.cjs`: varre `src/**/*.{ts,tsx}` + `package.json` com 6 padrões (OLD_NAME, INLINE_STYLE_COLOR, ARBITRARY, HEX, NEUTRAL_SCALE, NAMED_SCALE). Estado atual: **121 findings / 32 arquivos, exit 1**. Prova de fixture limpa: exit 0.
- `scripts/check-contrast.cjs`: conversão OKLCH->sRGB de verdade (sem aproximação por L), extração de `:root`/`.dark` por chaves balanceadas, resolução de `var(--x)` até 3 níveis. Valida 15 pares × 2 blocos = 30 checagens. Estado atual: **20 tokens `--status-*` ausentes reportados explicitamente, exit 1**; os pares core `--foreground` sobre `--background` passam (19.79 / 18.96).
- `scripts/verify-brand-md.cjs`: 9 checagens (brand.md + seções Paleta/Tipografia/Tom-Voz/Nome-SOLO/colisão, backup `.bak`, wiring `next/font`). Estado atual: **8 de 9 falham, exit 1**, sem exceção não-tratada.
- `.gitignore`: `/.brand-preview/` e `*.css.bak` — `git check-ignore` confirma os dois antes de o skill 19-02 rodar.
- `19-HUMAN-UAT.md`: 20 cenários de rota + 6 de dialog, definição D-19 verbatim, plano B `code+data` para o host de 4GB, **não-bloqueante**.
- Os 3 gates registrados em `package.json` como `verify:brand` / `verify:brand-md` / `check:contrast`.

## Task Commits

1. **Task 1: grep-guard verify-no-hardcoded-colors.cjs** - `56c9553` (feat)
2. **Task 2: verify-brand-md.cjs + check-contrast.cjs** - `c94a508` (feat)
3. **Task 3: npm scripts + .gitignore + 19-HUMAN-UAT.md** - `1bc8584` (feat)

**Plan metadata:** _(este commit)_ (docs: complete plan)

## Files Created/Modified

- `scripts/verify-no-hardcoded-colors.cjs` - grep-guard de cor hardcoded + nome antigo; arg de CLI opcional para fixture
- `scripts/verify-brand-md.cjs` - gate de existência/estrutura do brand.md (BRAND-01) + backup + next/font
- `scripts/check-contrast.cjs` - gate WCAG AA sobre :root e .dark, OKLCH->sRGB real, token ausente = falha
- `.planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md` - checklist D-19, não-bloqueante
- `package.json` - +3 npm scripts (verify:brand, verify:brand-md, check:contrast); campo `name` intocado
- `.gitignore` - +bloco brand-design (`/.brand-preview/`, `*.css.bak`)

## Decisions Made

- `verify-brand-md.cjs` aceita `variable: "--font-(sans|mono|serif|heading)"` — `heading` incluído porque D-18 pode materializar `--font-heading` no `layout.tsx`.
- `check-contrast.cjs` faz round-trip linear -> gama sRGB -> re-linearize WCAG para respeitar o clip de gamut mantendo precisão (segue os passos do plano à risca).
- PARTE B do grep-guard (checagem de `package.json`) só roda no modo default — a prova de fixture não pode depender do estado do repo.
- `package.json` `"name"` preservado como `"crm-leads"` — o rename é da Task 3 do plano 19-05 (D-04).
- `check-contrast` reporta cada token ausente individualmente (10 por bloco), não por par — casa com o critério de aceite "exatamente 10 `--status-*` ausentes em `:root` e 10 em `.dark`".

## Deviations from Plan

None - plan executed exactly as written.

O `#[0-9a-fA-F]{3,8}\b` do docblock foi reescrito em prosa ("os arquivos .ts / .tsx de src/") apenas para evitar a sequência `*` + `/` fechando o bloco de comentário JSDoc — ajuste cosmético dentro da Task 1, sem efeito no comportamento.

## Issues Encountered

- **`SyntaxError: Unexpected token '*'` na Task 1:** o texto `src/**/*.{ts,tsx}` no docblock JSDoc continha a sequência `*` seguida de `/`, que fecha o comentário de bloco prematuramente. Resolvido reescrevendo a linha em prosa. Nenhum impacto no restante do script.

## Known Stubs

Nenhum stub. Os 3 sensores estão VERMELHOS **por construção** — é o estado RED do Nyquist exigido pelo plano (`<objective>`: "Estado esperado ao fim deste plano: os 3 sensores saem VERMELHOS (exit 1)"). Ficam verdes ao longo dos planos 19-02 a 19-06:

- `verify:brand` (grep-guard) → verde no plano 19-05 T3 (refactor completo + rename)
- `verify:brand-md` → verde no plano 19-02 T3 (brand.md escrito + backup)
- `check:contrast` → verde no plano 19-03 T1 (escala `--status-*` criada + `--sidebar-*` alinhados)

Contraste de nota: `--muted-foreground` sobre `--muted` em `:root` já mede 4.34 (< 4.5) — é o valor real do default shadcn, não um bug do script; o plano 19-03 ajusta esse token ao aplicar a paleta.

## Threat Flags

Nenhuma superfície de segurança nova. Os 3 scripts usam só `node:fs`/`node:path`, leem `.css`/`.tsx`/`.json` como texto e não importam módulos de `src/`. Nenhum pacote instalado (T-19-SC: accept). T-19-02 (Information Disclosure de `.brand-preview/` e `*.css.bak`) foi **mitigado** — `git check-ignore` confirma ambos ignorados antes de o skill rodar.

## Self-Check: PASSED

**Arquivos criados:**
- FOUND: scripts/verify-no-hardcoded-colors.cjs
- FOUND: scripts/verify-brand-md.cjs
- FOUND: scripts/check-contrast.cjs
- FOUND: .planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md

**Commits:**
- FOUND: 56c9553 (Task 1)
- FOUND: c94a508 (Task 2)
- FOUND: 1bc8584 (Task 3)

**Verificação do plano (8/8):**
1. `verify-no-hardcoded-colors.cjs` → exit 1, 121 findings, 32 arquivos ✓
2. fixture limpa → exit 0 ✓
3. `verify-brand-md.cjs` → exit 1, primeira falha cita `brand.md` ✓
4. `check-contrast.cjs` → exit 1, 20 `--status-*` ausentes, pares core OK ✓
5. `npm run verify:brand && verify:brand-md && check:contrast` → todos executáveis ✓
6. `git check-ignore` `.brand-preview/index.html` + `globals.css.bak` → exit 0 ✓
7. `npx eslint` nos 3 scripts → exit 0 ✓
8. `npm run lint` da raiz → 0 errors (4 warnings pré-existentes deferidos) ✓

## Next Phase Readiness

- **Wave 0 completa.** Os 5 artefatos que o `19-VALIDATION.md` marcava como `❌ W0` existem no disco. `wave_0_complete` pode virar `true`.
- Plano **19-02** (`/brand-design` + `brand.md`) está desbloqueado: o `.gitignore` já cobre `.brand-preview/` e `*.css.bak`, e `verify:brand-md` já é o gate de aceite dele.
- Nenhum blocker.

---
*Phase: 19-marca-e-identidade-visual*
*Completed: 2026-09-03*
