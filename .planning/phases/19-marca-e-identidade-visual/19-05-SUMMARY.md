---
phase: 19-marca-e-identidade-visual
plan: 05
subsystem: ui
tags: [tailwind-v4, shadcn-tokens, design-system, refactor, branding, rename, sidebar, dialog]

requires:
  - phase: 19-03
    provides: "escala --status-* + alias --sidebar-* na paleta nova; utilitários bg-sidebar / bg-sidebar-accent / text-sidebar-foreground / text-sidebar-accent-foreground"
  - phase: 19-04
    provides: "lista fechada dos 47 findings restantes (13 arquivos + package.json); idioma <Button> default / bg-muted / bg-card / border-input / ring-ring já exercido"
provides:
  - "13 arquivos restantes 100% em token shadcn — verify:brand exit 0 SEM RESSALVA pela primeira vez na fase (PARTE A cor + PARTE B nome fechadas)"
  - "produto renomeado para SOLO nas 3 superfícies de nome: layout.tsx (title + description), app-sidebar.tsx (header + ícone S), package.json name"
  - "sidebar consumindo os 8 --sidebar-* (bg-sidebar / bg-sidebar-accent / text-sidebar-foreground / text-sidebar-accent-foreground) — responde à paleta e ao .dark forçado"
  - "overlay do dialog em bg-foreground/10 (antes bg-black/10) — escurece de forma consistente no .dark em vez de duplicar preto"
  - "<body> sem cor cravada (bg-white removido) — @layer base body { bg-background } assume (D-15)"
affects: [19-06]

tech-stack:
  added: []
  patterns:
    - "Refactor mecânico cor→token: só strings de className, zero mudança de lógica/props/exports/handlers/efeitos/supressões de lint"
    - "Rename de marca com escopo travado (D-05): só title/description/header/ícone/package.json name — pasta do repo, CI, imports e strings de path INTACTOS"
    - "Overlay de dialog em bg-foreground/10 (token), nunca bg-black — responde ao .dark"

key-files:
  created: []
  modified:
    - src/components/app-sidebar.tsx
    - src/app/layout.tsx
    - src/components/template-list.tsx
    - src/components/template-form-dialog.tsx
    - src/components/nicho-manager.tsx
    - src/components/configuracoes-form.tsx
    - src/components/periodo-selector.tsx
    - src/components/motivo-perda-manager.tsx
    - src/components/motivo-perda-combobox.tsx
    - src/components/motivo-perda-dialog.tsx
    - src/components/tarefa-card.tsx
    - src/components/tarefa-form-dialog.tsx
    - src/components/ui/dialog.tsx
    - package.json

key-decisions:
  - "template-list.tsx: o Badge 'Padrão' com style inline (rgba teal) virou className='border-transparent gap-1 bg-primary/10 text-primary' — style prop removida por completo (D-06)"
  - "tarefa-form-dialog.tsx: o literal bg-[#F4F4F5] p-6 num COMENTÁRIO de doc casava o grep-guard (ARBITRARY) — comentário reescrito para 'sem as 3 seções destacadas do form de lead', sem tocar código"
  - "package.json name renomeado APENAS na linha 2 (diff -U0 = 4 marcadores); nenhum outro campo de nome visível cita o nome antigo — description/productName ausentes"

patterns-established:
  - "sidebar chrome = tokens --sidebar-* (bg-sidebar / bg-sidebar-accent / text-sidebar-foreground / text-sidebar-accent-foreground); nunca zinc-* nem hex de marca"
  - "overlay/backdrop de dialog = bg-foreground/10; nunca bg-black/*"
  - "<Button> primário = variante default (bg-primary text-primary-foreground hover:bg-primary/80); deletar className de cor, não reescrever"

requirements-completed: [BRAND-02, BRAND-03]

duration: 16min
completed: 2026-09-03
---

# Phase 19 Plano 05: Fechamento do refactor cor→token + rename para SOLO Summary

**Os 13 arquivos restantes (sidebar, layout raiz, templates, nichos, configurações, seletor de período, motivos de perda, tarefas, overlay do dialog) migraram para token shadcn e o produto foi renomeado para SOLO nas 3 superfícies de nome — `npm run verify:brand` sai `0` SEM RESSALVA pela primeira vez na fase, com a cadeia inteira do gate (contraste 30/30 · tsc · lint · build 13 páginas) verde.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-09-03
- **Completed:** 2026-09-03
- **Tasks:** 3
- **Files modified:** 14 (13 `src/` + `package.json`)

## Accomplishments

- **Task 1 — sidebar + layout raiz + rename (2 arquivos):**
  - `app-sidebar.tsx`: `<aside>` `bg-[#F4F4F5]` → `bg-sidebar`; selo do ícone `bg-[#0D9488] text-white` → `bg-primary text-primary-foreground`; item de nav ativo `bg-[#0D9488]/10 text-[#0D9488]` → `bg-sidebar-accent text-sidebar-accent-foreground`; item inativo `text-zinc-700 hover:bg-zinc-200/60 hover:text-[#0D9488]` → `text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`; rótulos neutros → `text-muted-foreground`.
  - `app-sidebar.tsx` rename: ícone `I` → `S` (D-03), header `CRM LEADS` → `SOLO` (D-04). `NAV_ITEMS` (10 rotas), `usePathname`, `cn()`, `w-[240px]`, `text-[11px]`, `tracking-[0.08em]`, `transition-colors` intocados. "SOLO" cabe em 1 linha (mais curto que "CRM LEADS").
  - `layout.tsx`: `metadata.title` `"CRM de Leads"` → `"SOLO"`; `description` reescrita para "CRM pra quem trabalha sozinho: organiza leads, pipeline e follow-ups." (coerente com o positioning do `brand.md`); `<body className="min-h-full flex bg-white">` → `min-h-full flex` (D-15). Fontes / `className` do `<html>` intocados (resolvidos no 19-02).
- **Task 2 — templates, nichos, configurações, seletor de período (5 arquivos):**
  - `template-list.tsx`: `style={{ backgroundColor: rgba(13,148,136,0.1), color: #0D9488 }}` do `<Badge>` → `className="border-transparent gap-1 bg-primary/10 text-primary"` (style prop removida); `hover:bg-[#F4F4F5]` → `hover:bg-muted`; ícones `text-zinc-500 hover:text-[#0D9488]|#DC2626` → `text-muted-foreground hover:text-primary|destructive`; 2× `<Button className="bg-[#0D9488]...">` → `<Button>` default; `border border-[#F4F4F5]` → `border`.
  - `template-form-dialog.tsx`: `<Button type="submit">` sem className de cor. `eslint-disable react-hooks/refs` do `form.handleSubmit` intocado.
  - `nicho-manager.tsx`: `hover:bg-muted`, `border`, `text-muted-foreground hover:text-primary|destructive`, `text-destructive` no erro, `text-primary` no botão "+ Adicionar". Soft-delete de nicho (quick `260725-lai`) e os 2 `eslint-disable react-hooks/set-state-in-effect` intocados.
  - `configuracoes-form.tsx`: 2 cards `border border-zinc-200 bg-white p-6` → `border bg-card p-6`; `Trash2` `text-[#DC2626]` → `text-destructive`; `<Button type="submit">` default. `noValidate` (quick `260801-ij4`), a lista dinâmica em `useRef` e o `eslint-disable react-hooks/refs` intocados.
  - `periodo-selector.tsx`: `ACCENT_FOCUS_RING` `focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50` → `focus-visible:border-ring focus-visible:ring-ring/50`. `items=` do `<Select>` (quick `260828-flg`), `navegarCustom` (T-14-07) e o `eslint-disable` do efeito de ressync intocados.
- **Task 3 — motivos de perda, tarefas, overlay do dialog + rename do pacote (7 arquivos):**
  - `motivo-perda-manager.tsx`: réplica 1:1 do `nicho-manager` — mesmas 7 trocas.
  - `motivo-perda-combobox.tsx`: linha de ação `Criar "{query}"` (`Plus` + `<span>`) `text-[#0D9488]` → `text-primary`; erro de criação `text-[#DC2626]` → `text-destructive`. Contrato do `z.preprocess` (input oculto que emite string vazia) e o filtro anti-soft-delete intocados.
  - `motivo-perda-dialog.tsx`: `<Button>` "Salvar motivo" sem className de cor. Bloqueio de dismiss por Esc/clique-fora e dedup de fila (quick `260828-gna`) intocados.
  - `tarefa-card.tsx`: `border border-zinc-200 bg-white p-4 focus-visible:ring-[#0D9488]` → `border bg-card p-4 focus-visible:ring-ring`; `CircleCheck` `text-[#0D9488]` → `text-primary`. Wrapper de `stopPropagation` intocado.
  - `tarefa-form-dialog.tsx`: `<Button type="submit">` default; comentário de doc com o literal `bg-[#F4F4F5] p-6` reescrito (casava o grep-guard). `startTransition` do `formAction`, `noValidate` e o `eslint-disable react-hooks/refs` intocados.
  - `ui/dialog.tsx`: overlay `bg-black/10` → `bg-foreground/10` (converter, NÃO allowlistar — D travada). `font-heading` do `DialogTitle` (D-18) e a API dos primitivos Base UI intocados.
  - `package.json`: `"name": "crm-leads"` → `"name": "solo"` (D-04). Edição de 1 linha; `version`/`private`/`scripts`/deps intocados.

## Task Commits

1. **Task 1: Refatorar e renomear o sidebar e o layout raiz** — `8e111c9` (refactor)
2. **Task 2: Refatorar templates, nichos, configurações e seletor de período** — `e213a90` (refactor)
3. **Task 3: Refatorar motivos de perda, tarefas e o overlay do dialog + renomear o pacote** — `d4769c8` (refactor)

**Plan metadata:** (este commit) `docs(19-05)`

## Files Created/Modified

Ver `key-files.modified` no frontmatter — 14 arquivos.

### `git diff --stat` — fase de refactor completa (planos 19-03 + 19-04 + 19-05)

```
 package.json                                |  2 +-
 src/app/globals.css                         | 68 +++++++++++++++++++-------
 src/app/layout.tsx                          |  7 +--
 src/app/relatorios/page.tsx                 |  8 ++--
 src/components/app-sidebar.tsx              | 16 +++----
 src/components/configuracoes-form.tsx       | 12 ++---
 src/components/csv-column-mapper.tsx        |  7 ++-
 src/components/csv-import-preview-table.tsx | 42 +++++++++--------
 src/components/csv-upload-dropzone.tsx      |  8 ++--
 src/components/etapa-badge.tsx              | 46 ++++++++++--------
 src/components/followup-dashboard.tsx       | 47 +++++++-----------
 src/components/lead-form-dialog.tsx         |  6 +--
 src/components/lead-table-columns.tsx       |  2 +-
 src/components/lead-table-toolbar.tsx       |  4 +-
 src/components/lead-table.tsx               | 22 +++------
 src/components/lead-timeline-dialog.tsx     | 13 ++----
 src/components/lixeira-table.tsx            |  2 +-
 src/components/motivo-perda-combobox.tsx    |  6 +--
 src/components/motivo-perda-dialog.tsx      |  1 -
 src/components/motivo-perda-manager.tsx     | 14 +++---
 src/components/nicho-manager.tsx            | 14 +++---
 src/components/periodo-selector.tsx         |  2 +-
 src/components/pipeline-board.tsx           |  5 +--
 src/components/pipeline-column.tsx          |  6 +--
 src/components/pipeline-lead-card.tsx       |  6 +--
 src/components/post-import-lead-list.tsx    |  2 +-
 src/components/tarefa-card.tsx              |  4 +-
 src/components/tarefa-form-dialog.tsx       |  8 +---
 src/components/template-form-dialog.tsx     |  6 +--
 src/components/template-list.tsx            | 23 +++------
 src/components/ui/dialog.tsx                |  2 +-
 src/components/whatsapp-preview-dialog.tsx  | 11 ++---
 src/components/whatsapp-send-button.tsx     |  2 +-
 33 files changed, 212 insertions(+), 212 deletions(-)
```

(base: `42609f8` — handoff fim de sessão 19-01/19-02; HEAD: `d4769c8`)

### `package.json` — diff completo

```diff
@@ -1,5 +1,5 @@
 {
-  "name": "crm-leads",
+  "name": "solo",
   "version": "0.1.0",
   "private": true,
```

`git diff -U0 package.json | grep -c '^[+-]'` = **4** (só a linha `name` + marcadores). `package-lock.json` regenera o campo `name` na próxima instalação — cosmético, pacote é `private: true`, `npm install` não foi rodado.

## Decisions Made

- **`template-list.tsx` Badge `style` inline → `className`.** O `<Badge>` "Padrão" usava `style={{ backgroundColor: "rgba(13, 148, 136, 0.1)", color: "#0D9488" }}` (o único `INLINE_STYLE_COLOR` da lista). Virou `className="border-transparent gap-1 bg-primary/10 text-primary"` — `border-transparent gap-1` preservados, `style` prop removida por completo.
- **Comentário de doc no `tarefa-form-dialog.tsx` casava o grep-guard.** O JSDoc do componente dizia "sem as 3 seções `bg-[#F4F4F5] p-6` do form de lead" — o `-[#F4F4F5]` casava o padrão `ARBITRARY` do guard mesmo sendo comentário (o guard é regex por linha, não pula comentários). Reescrito para "sem as 3 seções destacadas do form de lead", zero mudança de código.
- **Overlay do dialog convertido, não allowlistado.** `bg-black/10` → `bg-foreground/10` conforme a decisão travada do `<interfaces>` — o overlay agora responde ao `.dark` (escurece com `--foreground` claro no dark em vez de sempre preto). O `ALLOWLIST` do guard fica só com `src/lib/csv-encoding.ts`.

## Deviations from Plan

Nenhum desvio de implementação (nenhuma Regra 1-4 acionada). Refactor puramente mecânico + rename com escopo travado.

**Nota (não é desvio):** o comentário de doc do `tarefa-form-dialog.tsx` teve o literal `bg-[#F4F4F5]` removido — o plano previa isso na descrição do `read_first` ("comentário com `bg-[#F4F4F5] p-6` (53)"). É trabalho previsto, não escopo novo.

## Issues Encountered

Nenhum. Todos os gates passaram na primeira execução após cada task.

## Estado dos gates após este plano

| Gate | Exit | Nota |
|---|---|---|
| `npm run verify:brand` | **0** | **VERDE SEM RESSALVA pela 1ª vez** — 83 arquivos varridos, zero cor hardcoded (PARTE A) + zero nome antigo em `src/` e `package.json` (PARTE B). `git grep -nE '#[0-9a-fA-F]{3,8}' -- 'src/**/*.tsx'` e `git grep -nE '(bg|text|border|ring)-(zinc\|slate\|gray\|neutral\|white\|black)' -- 'src/**/*.tsx'` → ambos sem resultado. |
| `npm run check:contrast` | 0 | 30/30 pares OK; menor razão `--destructive/--background` = 5.22 (light) / 5.46 (dark), min 3 |
| `npx tsc --noEmit` | 0 | — |
| `npm run lint` | 0 | 4 warnings `react-hooks/incompatible-library` pré-existentes (deferidos na Fase 17) — 0 errors |
| `rm -rf .next && npm run build` | 0 | 13 rotas geradas (Turbopack), static pages em 1.4s |
| `npm run test:lead-actions` | 0 | — |
| `npm run test:tarefa-actions` | 0 | — |
| `npm run test:motivo-perda-actions` | 0 | — |
| `npm run guard:no-hard-delete` | 0 | — |
| `npm run verify:schema` | 0 | — |

**`node -e "console.log(require('./package.json').name)"` → `solo`.**
**`node -e "const s=require('./package.json').scripts; ..."` → os 3 scripts do 19-01 (`verify:brand`, `verify:brand-md`, `check:contrast`) presentes.**

## Known Stubs

Nenhum. Refactor de estilo + rename — nenhuma fonte de dados nova, nenhum placeholder introduzido.

## Threat Flags

Nenhuma superfície de segurança nova. `layout.tsx` metadata são literais no bundle (sem input do usuário, T-19-11/T-19-12); `package.json` teve `JSON.parse` limpo confirmado e diff de 1 linha (T-19-06); nenhuma dependência adicionada (T-19-SC).

## Next Phase Readiness

- **19-06** herda o `verify:brand` VERDE. Falta: favicon `src/app/icon.svg` ("S"), portão dos 12 sensores, registro da não-regressão visual (`19-HUMAN-UAT.md`).
- `verify:brand` agora é gate normal — qualquer cor hardcoded ou reintrodução do nome antigo em `src/`/`package.json` quebra o build local.
- Nenhum dos 14 arquivos deste plano é reaberto em plano posterior da fase (D-06 — refactor completo).
- Dark mode: os tokens `.dark` estão completos e consistentes (30/30 contraste), mas o toggle continua fora de escopo (D-16).

## Self-Check: PASSED

- `src/components/app-sidebar.tsx` — FOUND; `SOLO` = 1, `bg-sidebar` = 1, `sidebar-accent` = 2, `w-[240px]` = 1, `tracking-[0.08em]` = 1, `NAV_ITEMS` = 2, `transition-all` = 0, ícone `S` presente
- `src/app/layout.tsx` — FOUND; `SOLO` = 1, `bg-white` = 0, `min-h-full flex` = 1
- `src/components/ui/dialog.tsx` — FOUND; `bg-foreground/10` = 1, `bg-black` = 0, `font-heading` = 1
- `package.json` — FOUND; `"name": "solo"` = 1, `"name": "crm-leads"` = 0, `JSON.parse` limpo, diff -U0 = 4 marcadores
- `git grep -nE "CRM de Leads|CRM LEADS|CRM Leads|crm-leads" -- src/ package.json` — sem resultado
- Commits `8e111c9`, `e213a90`, `d4769c8` — todos FOUND em `git log`
- `verify:brand` 0 · `check:contrast` 0 (30/30) · `tsc` 0 · `lint` 0 · `build` 0 (13 rotas) · `test:lead-actions` 0 · `test:tarefa-actions` 0 · `test:motivo-perda-actions` 0 · `guard:no-hard-delete` 0 · `verify:schema` 0

---
*Phase: 19-marca-e-identidade-visual*
*Completed: 2026-09-03*
