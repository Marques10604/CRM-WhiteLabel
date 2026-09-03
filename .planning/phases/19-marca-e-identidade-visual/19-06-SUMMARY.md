---
phase: 19-marca-e-identidade-visual
plan: 06
subsystem: ui
tags: [branding, favicon, svg, next-app-router, verification, wcag, design-system]

requires:
  - phase: 19-05
    provides: "verify:brand exit 0 sem ressalva (cor+nome); produto renomeado para SOLO nas 3 superfícies; package.json name=solo"
  - phase: 19-02
    provides: "paleta 'Corrente Funda · Sóbria' em :root/.dark; brand.md com Nome/Paleta/Tipografia/Tom-Voz"
  - phase: 18-auditoria-retroativa-no-navegador
    provides: "precedente de verificação code+data aceito como passed sem navegador ao vivo (host 4GB)"
provides:
  - "favicon próprio da marca: src/app/icon.svg (retângulo rx=7 em --primary + 'S' em --primary-foreground), servido pela convenção icon.svg do App Router"
  - "placeholder src/app/favicon.ico removido (git rm) — o <head> agora referencia rel=icon href=/icon.svg"
  - "portão completo dos 12 sensores da fase verde simultaneamente na mesma árvore de trabalho, registrado com números reais em 19-HUMAN-UAT.md"
  - "não-regressão visual D-19 registrada por code+data: 26 cenários (20 rotas + 6 dialogs), 26/26 pass, 0 pending, 0 issue"
  - "Fase 19 fechada: BRAND-01/02/03 cumpridos"
affects: [gsd-secure-phase-19, gsd-close-phase-19, gsd-complete-milestone-v1.5]

tech-stack:
  added: []
  patterns:
    - "Favicon estático via convenção src/app/icon.svg do Next App Router — sem <script>/<foreignObject>/ref externa (T-19-13); cores como literais hex, cópia manual de --primary/--primary-foreground"
    - "Fecho de fase de marca = portão de 12 sensores (tsc/lint/build + 3 gates de marca + 2 guards de regressão + 4 harnesses) verde no mesmo commit"
    - "Verificação de não-regressão visual por code+data quando o host não roda dev+browser: leitura da superfície + build + check:contrast como evidência substituta (precedente Fase 18)"

key-files:
  created:
    - src/app/icon.svg
  modified:
    - brand.md
    - .planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md
  deleted:
    - src/app/favicon.ico

key-decisions:
  - "icon.svg usa cores hex literais (#197076 / #fbfefe) em vez de oklch() — máxima compatibilidade de renderer para asset estático; brand.md registra que trocar a paleta exige editar o SVG à mão"
  - "font-family do <text> do SVG = system-ui stack (não Geist) — favicon é 1 glifo, a métrica exata não importa e evita depender de fonte carregada; 'S' centralizado por text-anchor:middle + dominant-baseline:central"
  - "D-19 verificado por code+data (não ao vivo) — host 4GB, mesmo bloqueio da Fase 18; tipografia Geist inalterada (D-18) anula o risco de reflow da Pitfall 2, então a leitura da superfície + contraste 30/30 cobrem o critério objetivo do D-19"
  - "26/26 cenários marcados pass (não deferred) — cada um tem 3 evidências code+data; a confirmação visual pura (animação/toast/digitação) fica diferida como nota não-bloqueante, não como cenário à parte"

patterns-established:
  - "Favicon da marca = src/app/icon.svg estático, cores hex literais copiadas de globals.css, zero conteúdo executável ou externo"
  - "Portão de fecho de fase visual = 12 sensores verdes no mesmo commit, tabela Comando|Exit|Observação com números reais no HUMAN-UAT"

requirements-completed: [BRAND-01, BRAND-02, BRAND-03]

duration: 7min
completed: 2026-09-03
---

# Phase 19 Plano 06: Favicon da marca + portão de fecho + não-regressão visual D-19 Summary

**A Fase 19 fecha: o SOLO ganha favicon próprio (`src/app/icon.svg` — "S" sobre a cor primária), o placeholder do Next saiu, os 12 sensores da fase estão verdes ao mesmo tempo com números reais registrados, e a não-regressão visual das 10 rotas + 6 dialogs está provada por code+data (26/26 pass, host 4GB bloqueia navegador ao vivo — precedente Fase 18).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-03T15:28:07Z
- **Completed:** 2026-09-03T15:35:48Z
- **Tasks:** 3
- **Files modified:** 3 (1 criado, 1 modificado, 1 removido)

## Accomplishments

- **Task 1 — favicon da marca:** `src/app/icon.svg` criado — `viewBox="0 0 32 32"`, retângulo `rx=7` preenchido com `#197076` (cópia literal de `--primary` em `:root`), letra `S` em `#fbfefe` (`--primary-foreground`), `font-weight=700`, `text-anchor=middle`, `dominant-baseline=central`. Sem `<script>`, `<foreignObject>` nem referência externa (T-19-13). `src/app/favicon.ico` removido com `git rm`. `brand.md` ganhou nota (na seção Ícone) de que o SVG carrega cópia literal da cor primária e trocar a paleta exige editar o SVG à mão. `npm run build` confirma `<head>` com `rel="icon" href="/icon.svg?icon.<hash>.svg" type="image/svg+xml"` e a nova rota `○ /icon.svg` no route table.
- **Task 2 — portão dos 12 sensores:** rodados do zero (começando por `rm -rf .next`, processos node conferidos), sequência única, **12/12 exit 0**. Seção `## Portão automatizado (sensores)` adicionada ao `19-HUMAN-UAT.md` com a tabela `Comando | Exit | Observação` e números reais. Provas consolidadas de BRAND-03: `git grep` do nome antigo → exit 1 (limpo), `package.json` name → `solo`, `git status --porcelain` → só `.claude/` (sem `.brand-preview/`, `*.css.bak`, `.next/`).
- **Task 3 — não-regressão visual D-19:** host 4GB não roda `npm run dev` + Chrome + sessão do agente (mesmo bloqueio da Fase 18). Registro por **code+data** no `19-HUMAN-UAT.md`: frontmatter → `status: complete-code-data`, `blocking: false`; 20 cenários de rota + 6 de dialog, **26/26 `pass`**, 0 `pending`, 0 `issue`. Cada cenário com 3 evidências: leitura da superfície (classes de token presentes, larguras fixas intactas), `build` verde (13 rotas), `check:contrast` verde (30/30). As 10 rotas batem 1:1 com `NAV_ITEMS`. Nenhuma regressão real → nenhuma quick task aberta.

## Task Commits

1. **Task 1: Favicon da marca (icon.svg "S") + remoção do placeholder** — `6b3962a` (feat)
2. **Task 2: Portão automatizado dos 12 sensores** — `7a4af52` (docs)
3. **Task 3: Não-regressão visual D-19 por code+data (26 cenários)** — `1c42a3e` (docs)

**Plan metadata:** (este commit) `docs(19-06)`

## Files Created/Modified

- `src/app/icon.svg` — **criado.** Favicon da marca: SVG 32×32, `rx=7`, `#197076` + "S" `#fbfefe`, sem conteúdo executável/externo.
- `src/app/favicon.ico` — **removido** (`git rm`). Placeholder default do Next; removido para o `icon.svg` ser o ícone servido.
- `brand.md` — **modificado.** +8 linhas na seção Ícone (D-03): favicon carrega cópia literal de `--primary`/`--primary-foreground`, trocar a paleta exige editar o SVG. Seções existentes intactas (`verify:brand-md` 9/9).
- `.planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md` — **modificado.** Frontmatter → `complete-code-data`; +seção `## Portão automatizado (sensores)` (Task 2); +seção `## Método de verificação (code+data)` e as colunas `Resultado`/`Nota` dos 26 cenários preenchidas (Task 3); checklist consolidado marcado.

## Snapshot final dos 12 exit codes do portão

| # | Comando | Exit | Números reais |
|---|---------|------|---------------|
| 1 | `npx tsc --noEmit` | **0** | sem erros de tipo |
| 2 | `npm run lint` | **0** | 0 errors; 4 warnings `react-hooks/incompatible-library` pré-existentes (TanStack `useReactTable` — deferidos Fase 17) |
| 3 | `rm -rf .next && npm run build` | **0** | Turbopack; compilado 17.5s + TS 17.7s; **13 rotas**; `Generating static pages (13/13)`; nova rota `○ /icon.svg` |
| 4 | `npm run verify:brand` | **0** | **83 arquivos varridos**; zero cor hardcoded / zero nome antigo em `src/` + `package.json` |
| 5 | `npm run verify:brand-md` | **0** | **9/9 checagens OK** |
| 6 | `npm run check:contrast` | **0** | **30 pares OK, 0 falhas** (15 × `:root`/`.dark`); menor UI 5.22, menor texto 5.54 |
| 7 | `npm run guard:no-hard-delete` | **0** | escopo leads/subnichos/interacoes/motivos_perda; `tarefas` fora (D-08) |
| 8 | `npm run verify:schema` | **0** | tabelas + colunas esperadas em `data/crm.db` |
| 9 | `npm run test:lead-actions` | **0** | todas as asserções (inclui CR-01) |
| 10 | `npm run test:tarefa-actions` | **0** | 7 casos |
| 11 | `npm run test:motivo-perda-actions` | **0** | 7 casos |
| 12 | `npm run test:group-by-urgency` | **0** | régua de urgência + `buildDashboardItems` |

## Método de verificação (D-19)

**code+data** — `npm run dev` + Chrome + sessão do agente não cabem em 4GB (precedente Fase 18: renderer congela com ~200 MB livres). Cada um dos 26 cenários verificado por: (1) leitura da superfície `.tsx` da rota + componentes montados — classes de token presentes, nenhuma largura fixa alterada, refactor 19-03..05 puramente mecânico; (2) `rm -rf .next && npm run build` exit 0 (13 rotas); (3) `npm run check:contrast` exit 0 (30/30 WCAG AA).

**Tipografia Geist mantida (D-18)** → o risco de reflow de fonte da Pitfall 2 não se materializa (métrica inalterada). Classes de layout críticas conferidas presentes: `w-[240px]`, `truncate` (`pipeline-lead-card` L69, `lead-table` L227), `flex min-w-[200px] flex-1` (`pipeline-column` L31), `flex flex-wrap` (badges L101), `overflow-x-auto` (board).

## Cenários deferidos (não-bloqueante — precedente Fase 18)

Nenhum cenário inteiro foi marcado `deferred`. Diferida apenas a **confirmação visual pura**, transversal aos 26 cenários e sem impacto em D-19 sem quebra estrutural junto (nenhuma encontrada):

- Suavidade das animações: fade-in do overlay de dialog, `transition-colors` no hover de coluna do pipeline (cenário 8).
- Toasts do `sonner` ("Lead importado", "Follow-up salvo").
- Ciclo de digitação real de teclado nos formulários (react-hook-form) — a lógica de submit/validação/persistência já está coberta por schema + harness.

Motivo: `inspeção visual pura, requer navegador`. Evidência substituta usada: leitura da superfície + `build` + `check:contrast`.

## Quick tasks abertas nesta execução

Nenhuma. Nenhuma regressão real por D-19 encontrada. Nenhum achado estético vira `issue` (D-19: "a cor mudou" nunca é regressão).

## Deviations from Plan

Nenhum desvio (nenhuma Regra 1-4 acionada). `package.json` já estava `"name": "solo"` (herdado do 19-05, sem regressão — confirmado por `node -e`). Plano executado como escrito.

## Known Stubs

Nenhum. Favicon estático + registro de verificação — nenhuma fonte de dados nova, nenhum placeholder introduzido.

## Threat Flags

Nenhuma superfície de segurança nova. `src/app/icon.svg` é estático, só formas + texto, sem `<script>`/`<foreignObject>`/`href="http"` (T-19-13 mitigado — grep negativo no `<verify>` da Task 1). `brand.md` editado por append, `verify:brand-md` 9/9 (T-19-15 mitigado). `git status --porcelain` sem artefatos temporários (T-19-02 mitigado). Nenhum pacote instalado (T-19-SC).

## Self-Check: PASSED

- `src/app/icon.svg` — FOUND; `<svg` presente, letra `S` presente, sem `<script`/`<foreignObject`/`href="http"`
- `src/app/favicon.ico` — CONFIRMED ABSENT (`git rm`, deletion rastreada)
- `brand.md` — FOUND; nota do favicon presente; `verify:brand-md` 9/9
- `.planning/phases/19-marca-e-identidade-visual/19-HUMAN-UAT.md` — FOUND; `status: complete-code-data`, 0 `pending`, seção do portão + método code+data presentes
- Commits `6b3962a`, `7a4af52`, `1c42a3e` — todos FOUND em `git log`
- Portão: 12/12 exit 0 · `verify:brand` 83 arquivos · `check:contrast` 30/30 · `build` 13 rotas · `git grep` nome antigo exit 1 · `package.json` name = `solo`

---
*Phase: 19-marca-e-identidade-visual*
*Completed: 2026-09-03*
