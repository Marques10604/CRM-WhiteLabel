---
phase: 19-marca-e-identidade-visual
verified: 2026-09-03T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  note: "Verificação inicial — sem VERIFICATION.md anterior"
deferred: []
---

# Phase 19: Marca e Identidade Visual — Verification Report

**Phase Goal:** O CRM tem cara de produto — nome próprio definido e registrado, paleta e tipografia escolhidas pelo usuário via `/brand-design` e aplicadas em light + dark, e "CRM de Leads" renomeado em toda superfície visível, sem nenhuma regressão visual nas telas existentes.

**Verified:** 2026-09-03
**Status:** passed
**Re-verification:** No — verificação inicial

## Goal Achievement

### Observable Truths (Success Criteria da ROADMAP §Phase 19)

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | App tem nome de produto definido ("SOLO"), decisão + racional em `brand.md` na raiz | ✓ VERIFIED | `brand.md` L7-18 §"Nome — SOLO" com racional D-01 (uma palavra, vira verbo, positioning "quem trabalha sozinho", alternativas exploradas). `verify:brand-md` checa "seção Nome + string SOLO" e "ressalva de colisão D-02" — 9/9 OK (rodado por mim, exit 0) |
| 2 | `/brand-design` rodado — ~6 paletas em preview HTML, usuário escolheu, aplicada como shadcn CSS vars (light + dark) em `globals.css` | ✓ VERIFIED | `19-02-SUMMARY` documenta 6 candidatas + preview HTML estático (`.brand-preview/`, seguro no host 4GB) + rodada 2 de refino + escolha "Corrente Funda · Sóbria". `globals.css` L61-108 (`:root`) e L110-156 (`.dark`) contêm o token set completo OKLCH da paleta. `check:contrast` 30/30 pares WCAG AA em `:root` **e** `.dark` (rodado por mim, exit 0) |
| 3 | Tipografia ligada via `next/font` | ✓ VERIFIED | `layout.tsx` L2 `import { Geist, Geist_Mono } from "next/font/google"`; L7-15 instancia com `variable: "--font-geist-sans"` / `"--font-geist-mono"`; L31 aplica as variáveis no `<html>`. `globals.css` L10-12 `@theme inline` faz a ponte `--font-sans: var(--font-geist-sans)`. Geist mantida conscientemente (D-18); wiring `--font-geist-*` + ponte `@theme` é o padrão provado do projeto (`.planning/debug/resolved/font-sans-self-reference.md`) — não é gap |
| 4 | `brand.md` documenta paleta/tipografia/tom-voz; "CRM de Leads" renomeado em `layout.tsx` (title+description), `app-sidebar.tsx` e onde mais aparece | ✓ VERIFIED | `brand.md` tem §Paleta, §Tipografia, §Tom e Voz, §Usage dos and don'ts. Rename: `layout.tsx` L18 `title: "SOLO"` + L19-20 description; `app-sidebar.tsx` L42 ícone "S" + L45 `SOLO`; `package.json` L2 `"name": "solo"`; `README.md` L1 `# SOLO`. `verify:brand` (parte B) varre `src/` + `package.json` por nome antigo — 83 arquivos, 0 achados (rodado por mim, exit 0). `git grep "CRM de Leads\|CRM LEADS" -- src/` → sem resultado |
| 5 | Verificação no navegador confirma que nenhuma tela regrediu visualmente (layout, contraste, dark mode, legibilidade) | ✓ VERIFIED (code+data) | Método code+data por design da fase (D-19 + D-17 + precedente explícito Fase 18 — host 4GB não roda `dev`+Chrome+sessão do agente). `19-HUMAN-UAT.md` `status: complete-code-data`, `blocking: false`, 26/26 cenários (20 rotas + 6 dialogs) `pass`, 0 `pending`. Evidências: (a) `check:contrast` 30/30 AA em ambos os modos — único critério objetivo do D-19; (b) `build` exit 0, 13 rotas prerender; (c) leitura da superfície — classes de layout críticas intactas (`w-[240px]`, `truncate`, `flex min-w-[200px] flex-1`, `overflow-x-auto`), tipografia Geist inalterada anula risco de reflow. Confirmação puramente visual (animações, toasts, digitação real) diferida — não-bloqueante por design |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `brand.md` (raiz) | Nome+racional+colisão, Paleta, Tipografia, Tom/Voz, dos/don'ts | ✓ VERIFIED | 232 linhas; todas as seções presentes; `verify:brand-md` 9/9 |
| `src/app/globals.css` | Paleta OKLCH em `:root` + `.dark`, escala `--status-*`, `--sidebar-*` alinhados | ✓ VERIFIED | Paleta "Corrente Funda · Sóbria" L61-156; 10+10 tokens `--status-*` (D-08, não derivados da marca); `--sidebar-*` derivam de `--card`/`--accent` |
| `src/app/layout.tsx` | metadata "SOLO", `next/font` ligado, `bg-white` removido do `<body>` | ✓ VERIFIED | `title: "SOLO"`; `<body className="min-h-full flex">` (sem `bg-white`, herda `bg-background` do `@layer base`) |
| `src/components/app-sidebar.tsx` | header "SOLO", ícone "S", tokens `--sidebar-*` | ✓ VERIFIED | L42 "S" · L45 "SOLO" · `bg-sidebar`, `bg-sidebar-accent`, `text-sidebar-foreground` — zero cor hardcoded |
| `src/app/icon.svg` | favicon próprio "S", SVG estático sem `<script>`/externo | ✓ VERIFIED | `<rect>` + `<text>S</text>`, cores hex literais `#197076`/`#fbfefe` (cópia de `--primary`), sem `<script>`/`<foreignObject>`/`href="http"`; `favicon.ico` placeholder removido; rota `○ /icon.svg` no build |
| `scripts/check-contrast.cjs` | Gate WCAG AA sobre `:root` + `.dark` | ✓ VERIFIED | 30 pares, exit 0; matemática OKLCH→sRGB validada no 19-REVIEW |
| `scripts/verify-no-hardcoded-colors.cjs` | grep-guard cor + nome antigo | ✓ VERIFIED | `verify:brand`, exit 0, 83 arquivos |
| `scripts/verify-brand-md.cjs` | Gate de estrutura do `brand.md` | ✓ VERIFIED | `verify:brand-md`, 9/9, exit 0 |
| `README.md` | Renomeado para SOLO | ✓ VERIFIED | `# SOLO` + subtítulo + stack + como rodar |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `layout.tsx` | `next/font/google` | `import { Geist, Geist_Mono }` + `.variable` no `<html>` | ✓ WIRED | Fontes instanciadas e aplicadas; `@theme inline` faz a ponte para `--font-sans`/`--font-mono` |
| componentes `src/` | paleta da marca | classes de token shadcn (`bg-primary`, `text-muted-foreground`, `bg-status-*`) | ✓ WIRED | 83 arquivos varridos, 0 cor hardcoded; `@theme inline` mapeia todos os `--color-*` para as CSS vars de `:root`/`.dark` |
| `globals.css` `.dark` | render dark mode | `@custom-variant dark (&:is(.dark *))` | ✓ WIRED (sem toggle — D-16 deliberado) | Tokens `.dark` internamente consistentes (contraste 30/30). Sem `ThemeProvider` por design do milestone v1.5 ("zero feature nova") |
| `app-sidebar.tsx` | rotas do app | `NAV_ITEMS` → `<Link>` | ✓ WIRED | 10 rotas, todas geradas no build (13/13 static pages) |

### Data-Flow Trace (Level 4)

Fase de refactor de cor + marca — sem novas fontes de dados dinâmicos. Os tokens de cor fluem de `globals.css` (`:root`/`.dark`) → `@theme inline` → classes utilitárias nos componentes. `check:contrast` confirma que os valores nas duas pontas produzem contraste real (não placeholders). N/A para trace de DB/API.

### Behavioral Spot-Checks / Probe Execution — Portão de 12 Sensores

Rodado por mim do zero (`rm -rf .next` primeiro, sem processos node órfãos), na árvore de trabalho atual:

| # | Comando | Result | Status |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit` | exit 0, sem erros de tipo | ✓ PASS |
| 2 | `npm run lint` | exit 0, 0 errors, 4 warnings `react-hooks/incompatible-library` pré-existentes (deferidos Fase 17) | ✓ PASS |
| 3 | `rm -rf .next && npm run build` | exit 0, Turbopack, 13 rotas, `Generating static pages (13/13)`, rota `○ /icon.svg` presente | ✓ PASS |
| 4 | `npm run verify:brand` | exit 0, 83 arquivos, 0 cor hardcoded / 0 nome antigo | ✓ PASS |
| 5 | `npm run verify:brand-md` | exit 0, 9/9 checagens | ✓ PASS |
| 6 | `npm run check:contrast` | exit 0, 30 pares OK / 0 falhas (menor UI 5.22, menor texto 5.54) | ✓ PASS |
| 7 | `npm run guard:no-hard-delete` | exit 0 | ✓ PASS |
| 8 | `npm run verify:schema` | exit 0 | ✓ PASS |
| 9 | `npm run test:lead-actions` | exit 0, todas as asserções | ✓ PASS |
| 10 | `npm run test:tarefa-actions` | exit 0, 7 casos | ✓ PASS |
| 11 | `npm run test:motivo-perda-actions` | exit 0, 7 casos | ✓ PASS |
| 12 | `npm run test:group-by-urgency` | exit 0 | ✓ PASS |

**12/12 verde na mesma árvore de trabalho.** Reprodução independente confirma os números do `19-HUMAN-UAT.md` / `19-06-SUMMARY`.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| BRAND-01 | 19-01, 19-02, 19-06 | Nome de produto definido, decisão + racional em `brand.md` | ✓ SATISFIED | `brand.md` §Nome — SOLO (racional D-01 + colisão D-02 verbatim); `verify:brand-md` valida a presença |
| BRAND-02 | 19-01..19-06 | `/brand-design` rodado, ~6 paletas em preview, escolha aplicada como shadcn CSS vars light+dark em `globals.css`, tipografia via `next/font` | ✓ SATISFIED | `19-02-SUMMARY` (processo do skill); `globals.css` (paleta OKLCH `:root`+`.dark`); ~190 ocorrências de cor hardcoded → tokens (`verify:brand` 0); `layout.tsx` `next/font/google` |
| BRAND-03 | 19-03..19-06 | `brand.md` (paleta/tipografia/tom-voz); "CRM de Leads" renomeado em `layout.tsx`, `app-sidebar.tsx` e onde mais aparece; nenhuma regressão visual | ✓ SATISFIED | Rename em `layout.tsx`/`app-sidebar.tsx`/`package.json`/`README.md`; `verify:brand` parte B verde; não-regressão D-19 registrada code+data (26/26 pass, blocking:false, precedente Fase 18) |

Nenhum requisito órfão — REQUIREMENTS.md mapeia BRAND-01/02/03 → Fase 19, todos cobertos pelos planos.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `package-lock.json` | 2, 8 | `"name": "crm-leads"` ainda presente | ℹ️ Info | Não é superfície visível; `package.json` já é `solo`; atualiza sozinho no próximo `npm install`. Fora do escopo do rename (D-04/D-05) |
| `CLAUDE.md` | 4 | "CRM de Leads — Área da Saúde" | ℹ️ Info | Doc de projeto, não superfície de UI; D-04 limita o rename a superfícies visíveis + `package.json` + README |
| `src/app/globals.css` | 81-85, 130-134 | `--chart-1..5` continuam em greyscale (não alinhados à marca) | ℹ️ Info | Nenhum Success Criterion menciona charts; `/relatorios` usa tokens `--status-*`, não `--chart-*`. Sem impacto no goal |

Nenhum debt marker (`TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`/`TBD`) nos arquivos modificados pela fase. Nenhum stub. Nenhum blocker.

**Code review (19-REVIEW.md):** 0 critical, 4 warnings, 3 info. WR-01 (borda "esfriando" invisível) e WR-02 (CTA WhatsApp pálido) **corrigidos** no commit `c7acae5` — confirmado no código atual (`pipeline-lead-card.tsx:63` `border-status-warning-foreground`; `lead-table.tsx:258` `bg-status-success-foreground text-status-success`). WR-03/WR-04 (cobertura dos scripts de gate) e IN-01..03 aceitos como endurecimento futuro — não são defeitos de runtime.

### Human Verification Required

Nenhum item **bloqueante**. Por design da fase (D-19 / D-17 / precedente Fase 18 documentado no `19-VERIFICATION.md` da Fase 18 promovido a `passed` sem navegador ao vivo — host 4GB), o gate bloqueante é o portão de 12 sensores automatizados, todos verdes.

**Diferido para uma futura sessão com navegador (NÃO bloqueia o fechamento):**

### 1. Confirmação visual pura das telas em light + `.dark` forçado

**Test:** `npm run dev`, abrir cada rota do `NAV_ITEMS` em modo claro; depois forçar `<html class="dark">` via devtools e repassar. Conferir contra a definição operacional D-19 (layout quebrado, texto ilegível, elemento cortado, header do sidebar em 2 linhas, scroll horizontal no pipeline, badge quebrando linha).
**Expected:** Nenhuma quebra estrutural. Mudança de cor NÃO conta como regressão (é o objetivo da fase).
**Why human:** Julgamento visual de "layout quebrado / elemento cortado" e suavidade de animações (fade-in de overlay, `transition-colors` no hover de coluna), toasts do `sonner`, ciclo de digitação real nos formulários — não verificável por grep. Contraste (o critério objetivo) já está coberto por `check:contrast` 30/30.

### 2. Filtro de etapa da toolbar + 3 cabeçalhos do dashboard (IN-01)

**Test:** Em `/leads`, abrir o filtro de etapa da toolbar e confirmar as 5 opções na ordem novo→contatado→negociação→fechado→perdido. Em `/`, conferir os cabeçalhos Vencidos / Hoje / Próximos 7 dias com cor de status distinta.
**Expected:** 5 opções na ordem correta; 3 cabeçalhos legíveis e distinguíveis.
**Why human:** O diff do 19-03 nesses 2 arquivos excedeu "só className" (partiu `STAGE_CONFIG` em 2 mapas; trocou `style={{color}}` inline por herança via `headerClass`). Comportamento equivalente confirmado na leitura de código (`STAGE_OPTIONS` deriva de `Object.keys(STAGE_LABEL)` com ordem preservada; herança de `color` em CSS é válida), mas o reviewer pediu olho humano.

### Gaps Summary

Nenhum gap. Os 5 Success Criteria estão cumpridos:

- **Nome + `brand.md`** (SC#1, BRAND-01): "SOLO" definido com racional e ressalva de colisão verbatim.
- **`/brand-design` + paleta light/dark** (SC#2, BRAND-02): skill rodado com 6 candidatas em preview estático + rodada de refino, escolha "Corrente Funda · Sóbria" aplicada em `:root` e `.dark`, contraste 30/30 AA.
- **Tipografia via `next/font`** (SC#3): Geist/Geist_Mono ligadas via `next/font/google` em `layout.tsx` (mantida conscientemente — D-18).
- **`brand.md` documentado + rename** (SC#4, BRAND-03): todas as superfícies visíveis renomeadas para SOLO (`layout.tsx`, `app-sidebar.tsx`, `package.json`, `README.md`, favicon "S"); `verify:brand` parte B verde.
- **Não-regressão visual** (SC#5): registrada por code+data conforme design explícito da fase (D-19/D-17) e precedente documentado da Fase 18; nenhuma quebra estrutural na leitura da superfície; contraste objetivo 30/30 em ambos os modos; tipografia inalterada anula risco de reflow.

O refactor de cor está **completo** — 83 arquivos varridos, zero cor hardcoded fora da allowlist, e a escala `--status-*` dedicada (D-08) preserva a legibilidade do funil. As 4 warnings do code review não bloqueiam (2 corrigidas, 2 são endurecimento de gate para o futuro).

A confirmação puramente visual no navegador fica diferida como item humano **não-bloqueante**, alinhada ao precedente da Fase 18 e à estratégia de validação aprovada (`19-VALIDATION.md` §Manual-Only).

---

_Verified: 2026-09-03_
_Verifier: Claude (gsd-verifier)_
