---
phase: 19-marca-e-identidade-visual
plan: 04
subsystem: ui
tags: [tailwind-v4, shadcn-tokens, design-system, refactor, pipeline, csv-import, whatsapp]

requires:
  - phase: 19-03
    provides: "escala semântica --status-* (neutral/info/warning/success/danger + -foreground) e utilitários bg-|text-|border-status-*; padrão STAGE_TOKEN/headerClass"
provides:
  - "14 arquivos do pipeline, da lista de leads e do wizard de CSV 100% em token shadcn (zero #hex, zero -[#...], zero zinc-*, zero style inline de cor)"
  - "borda 'esfriando' do card do pipeline em border-status-warning (2px preservado); label em text-status-warning-foreground"
  - "botão WhatsApp da tabela de leads em bg-status-success / text-status-success-foreground (verde semântico, não cor de marca — decisão travada Open Question 4)"
  - "estado isOver do drop e hover de linha da tabela em bg-accent; superfícies internas em bg-muted; cards elevados em bg-card"
  - "mensagens de telefone inválido do preview de WhatsApp em text-destructive (erro de validação, não status de funil)"
  - "checkbox nativo do mapeador de CSV em accent-primary (Pitfall 6 — nunca accent-[var(--primary)])"
affects: [19-05, 19-06]

tech-stack:
  added: []
  patterns:
    - "Refactor mecânico cor→token: só strings de className, zero mudança de lógica/props/exports/handlers/efeitos/supressões de lint"
    - "<Button> primário sem className de cor — a variante default (bg-primary text-primary-foreground hover:bg-primary/80) já cobre; mesmo idioma para <a className={cn(buttonVariants(), ...)}>"
    - "hover/isOver de superfície interativa = bg-accent; superfície em repouso = bg-muted (idioma herdado de pipeline-column)"

key-files:
  created: []
  modified:
    - src/components/pipeline-lead-card.tsx
    - src/components/pipeline-column.tsx
    - src/components/pipeline-board.tsx
    - src/components/lead-table.tsx
    - src/components/lead-table-toolbar.tsx
    - src/components/lead-table-columns.tsx
    - src/components/lead-form-dialog.tsx
    - src/components/lead-timeline-dialog.tsx
    - src/components/lixeira-table.tsx
    - src/components/csv-upload-dropzone.tsx
    - src/components/csv-column-mapper.tsx
    - src/components/post-import-lead-list.tsx
    - src/components/whatsapp-preview-dialog.tsx
    - src/components/whatsapp-send-button.tsx

key-decisions:
  - "hover:bg-[#F4F4F5] de linha da tabela e do dropzone → hover:bg-accent (highlight interativo), não hover:bg-muted — alinha com o idioma isOver→bg-accent estabelecido em pipeline-column no 19-03"
  - "whatsapp-send-button.tsx: o ícone usava teal de MARCA (#0D9488), não o verde de WhatsApp (#22C55E) — migrou para text-primary conforme a regra da task ('se for cor de marca, seguir a tabela de-para normal')"
  - "csv-upload-dropzone: estado de repouso em border-input, drag-over em border-ring + bg-accent (bg-muted no wrapper base preservado)"

patterns-established:
  - "cor de marca em ícone/avatar/badge = text-primary / bg-primary/10 text-primary; nunca hex"
  - "erro de validação inline = text-destructive; status de funil = escala --status-*"

requirements-completed: [BRAND-02]

duration: 18min
completed: 2026-09-03
---

# Phase 19 Plano 04: Refactor cor→token do pipeline, lista de leads e wizard de CSV Summary

**Os 14 arquivos do board do pipeline, da lista de leads e do wizard de importação de CSV migraram por completo de cor hardcoded (hex, `-[#...]`, `zinc-*`, `style` inline) para token shadcn — 41 ocorrências trocadas com zero mudança de comportamento; a semântica sobreviveu (esfriando = `status-warning`, WhatsApp = `status-success`, telefone inválido = `destructive`, drop-target = `accent`).**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-09-03
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- **Task 1 — board do pipeline + tabela de leads (4 arquivos, 15 ocorrências):**
  - `pipeline-lead-card`: `bg-card`, `focus-visible:ring-ring`, `isEsfriando ? "border-2 border-status-warning" : "border"` (espessura 2px preservada), label "Esfriando" em `text-status-warning-foreground`. `truncate` + `title` no nome intactos.
  - `pipeline-column`: coluna e header sticky em `bg-muted`, `isOver` em `bg-accent`. `min-w-[200px] flex-1 gap-3` e `transition-colors` preservados — as 5 colunas continuam cabendo sem scroll horizontal.
  - `pipeline-board` + `lead-table`: os 3 botões "Novo lead" voltaram ao `<Button>` default (sem `className` de cor).
  - `lead-table`: botão WhatsApp → `bg-status-success text-status-success-foreground hover:bg-status-success/90` (mantendo `gap-1.5`/`font-semibold`/`shadow-sm`); avatar → `bg-primary/10 text-primary`; wrapper da tabela → `bg-card`; header → `bg-muted`; hover de linha → `hover:bg-accent`; `focus-visible:ring-ring`; ícone excluir → `text-destructive`. Handlers de `stopPropagation` e ícone `History` intocados.
- **Task 2 — toolbar, colunas, dialogs de lead, lixeira (5 arquivos, 12 ocorrências):**
  - `lead-table-toolbar`: painel em `bg-muted`, `ACCENT_FOCUS_RING` → `focus-visible:border-ring focus-visible:ring-ring/50`. `STAGE_OPTIONS`/`DEFAULT_SORTING`/`FollowUpDateRange` intocados.
  - `lead-table-columns` + `lead-timeline-dialog` + `lixeira-table`: ícones em `text-destructive` (excluir) / `text-primary` (restaurar, ícone de interação WhatsApp).
  - `lead-form-dialog`: 3 seções `bg-[#F4F4F5] p-6` → `bg-muted p-6`. `startTransition` do `formAction` e `eslint-disable react-hooks/refs` intocados.
  - `lead-timeline-dialog`: botões "Salvar nota"/"Salvar edição" → `<Button>` default; `border-b border-zinc-200` → `border-b` (cor vem de `@layer base`). `eslint-disable react-hooks/set-state-in-effect` e `DeleteNotaDialog` irmão preservados.
- **Task 3 — wizard de CSV + superfícies de WhatsApp (5 arquivos, 14 ocorrências):**
  - `csv-upload-dropzone`: `bg-muted` no wrapper, `isDragOver ? "border-ring bg-accent" : "border-input"`, `border-dashed`/`transition-colors` preservados; ícones em `text-destructive`/`text-primary`.
  - `csv-column-mapper`: 2 seções `bg-muted p-6`, checkbox nativo `accent-[#0D9488]` → `accent-primary` (Pitfall 6), botão "Ver prévia" → `<Button>` default. Comentário "8 campos fixos" e `handleToggleExtraColumn` preservados.
  - `post-import-lead-list`: `border border-zinc-200 bg-white` → `border bg-card`.
  - `whatsapp-preview-dialog`: as 2 mensagens de telefone/mensagem inválida → `text-destructive`; "Abrir WhatsApp" (`<a>`) → `cn(buttonVariants(), "gap-1.5")`; fallback disabled → `className="gap-1.5"`. `waHref` recomputado a cada render, `registerWhatsAppContact` fire-and-forget e `eslint-disable` preservados.
  - `whatsapp-send-button`: ícone `text-[#0D9488]` (teal de marca) → `text-primary`.

## Task Commits

1. **Task 1: Refatorar o board do pipeline e a tabela de leads** — `9be038d` (refactor)
2. **Task 2: Refatorar toolbar, colunas, dialogs de lead e lixeira** — `4fa3e00` (refactor)
3. **Task 3: Refatorar o wizard de importação e as superfícies de WhatsApp** — `4bf3761` (refactor)

## Files Created/Modified

Ver `key-files.modified` no frontmatter — 14 arquivos, todos `src/components/*.tsx`. Diff total do plano: **14 arquivos, +39 / -57 linhas**, exclusivamente strings de `className` (e remoção de `className` de cor em `<Button>`/`<a>`).

## Decisions Made

- **`hover:bg-[#F4F4F5]` → `hover:bg-accent`** (linha de tabela em `lead-table.tsx`, dropzone). A tabela de-para mapeia o literal `bg-[#F4F4F5]` para `bg-muted`, mas o `hover:` de uma superfície interativa é um realce (mesma família semântica do `isOver → bg-accent` travado no 19-03). Optei por `bg-accent` para o realce e mantive `bg-muted` só nas superfícies em repouso (header, painel de toolbar, seções de form).
- **`whatsapp-send-button.tsx` usava teal de MARCA, não o verde de WhatsApp.** O `read_first` do plano descreve esse arquivo como contendo `registerWhatsAppContact` + `<a>` + `buttonVariants()` (na verdade isso está em `whatsapp-preview-dialog.tsx`). O arquivo real é um `<Button variant="ghost" size="icon-lg">` simples com 1 ocorrência: `<MessageCircle className="text-[#0D9488]" />`. Como é cor de marca (não `#22C55E`), migrou para `text-primary` conforme a instrução da task ("se for cor de marca, seguir a tabela de-para normal").
- **`csv-upload-dropzone` repouso → `border-input`**, drag-over → `border-ring bg-accent`, conforme instrução literal da Task 3.

## Deviations from Plan

Nenhum desvio de implementação (nenhuma Regra 1-4 acionada). Refactor puramente mecânico.

**Nota sobre acceptance criteria com premissa incorreta (não é desvio de execução):**

- **`grep -c 'registerWhatsAppContact' src/components/whatsapp-send-button.tsx` ≥ 1** (Task 3): o critério parte de uma descrição incorreta do arquivo no `read_first` do plano. O arquivo real nunca conteve `registerWhatsAppContact` nem `buttonVariants()` — essa lógica vive em `whatsapp-preview-dialog.tsx`, onde permanece intacta (`registerWhatsAppContact` = 3 ocorrências, `waHref` = 3, `buttonVariants` = 2). A intenção do critério ("não tocar na lógica de registro de contato de WhatsApp") **está satisfeita**.
- **`node scripts/verify-no-hardcoded-colors.cjs` reporta ≤ 45 findings restantes** (Task 3): o valor real é **47** (não ≤ 45). O plano estimou 41 ocorrências nos arquivos deste plano; foram removidas exatamente 41 (88 → 47). A diferença de 2 é erro de estimativa do plano, não trabalho faltante. O critério estrutural mais importante — **nenhum arquivo dos planos 19-03/19-04 na lista** — passa.

**Impacto no plano:** nenhum. Escopo respeitado à risca (só `className`).

## Issues Encountered

Nenhum. Todos os gates passaram na primeira execução após cada task.

## Estado dos gates após este plano

| Gate | Exit | Nota |
|---|---|---|
| `npm run verify:brand` | **1** (47 findings / 14 arq.) | ✅ RED esperado até 19-05; **zero linhas dos 14 arquivos deste plano** e dos 4 do 19-03 |
| `npm run check:contrast` | 0 (30/30, menor razão 5.46) | ✅ inalterado |
| `npx tsc --noEmit` | 0 | ✅ |
| `npm run lint` | 0 | ✅ 4 warnings `incompatible-library` pré-existentes (deferidos na Fase 17) |
| `rm -rf .next && npm run build` | 0 | ✅ 13 páginas (Turbopack, 43s compile + 25s TS) |
| `npm run test:lead-actions` | 0 | ✅ nenhuma lógica de Server Action tocada |
| `npm run test:interacao-actions` | 0 | ✅ |

## Findings restantes do `verify-no-hardcoded-colors.cjs` — lista fechada do plano 19-05

**47 ocorrências / 14 arquivos** (todos no escopo do 19-05 + o rename):

| Arquivo | Ocorrências (linhas aprox.) |
|---|---|
| `src/app/layout.tsx` | 2 — `title: "CRM de Leads"` (OLD_NAME, linha 18), `<body className="... bg-white">` (linha 32) |
| `src/components/app-sidebar.tsx` | 7 — `bg-[#F4F4F5]` (36), `bg-[#0D9488] text-white` ícone (39), `text-zinc-500` (44), `CRM LEADS` OLD_NAME (45), `text-zinc-400` (48), `bg-[#0D9488]/10 text-[#0D9488]` ativo (65), `text-zinc-700 hover:bg-zinc-200/60 hover:text-[#0D9488]` (66) |
| `src/components/template-list.tsx` | 8 — `hover:bg-[#F4F4F5]` (45), `style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}` (52), `hover:text-[#0D9488]` (62), `text-zinc-500 hover:text-[#0D9488]` (73), `text-zinc-500 hover:text-[#DC2626]` (81), 2× `<Button className="bg-[#0D9488] ...">` (129, 140), `border-[#F4F4F5]` (155) |
| `src/components/nicho-manager.tsx` | 7 — `hover:bg-[#F4F4F5]` (47), `text-zinc-500 hover:text-[#0D9488]` (54), `text-zinc-500 hover:text-[#DC2626]` (63), 2× `text-[#DC2626]` (106, 174), `border-[#F4F4F5]` (134), `text-[#0D9488]` (181) |
| `src/components/motivo-perda-manager.tsx` | 7 — mesma forma do `nicho-manager` (57, 64, 73, 116, 148, 188, 195) |
| `src/components/configuracoes-form.tsx` | 4 — 2× `border-zinc-200 bg-white` (170, 231), `text-[#DC2626]` (281), `<Button className="bg-[#0D9488] ...">` (301) |
| `src/components/motivo-perda-combobox.tsx` | 3 — `text-[#0D9488]` (147), `text-[#0D9488]` (148), `text-[#DC2626]` (158) |
| `src/components/tarefa-card.tsx` | 2 — `border-zinc-200 bg-white` (62), `text-[#0D9488]` (95) |
| `src/components/tarefa-form-dialog.tsx` | 2 — comentário com `bg-[#F4F4F5] p-6` (53), `<Button className="bg-[#0D9488] ...">` (272) |
| `src/components/motivo-perda-dialog.tsx` | 1 — `<Button className="bg-[#0D9488] ...">` (92) |
| `src/components/template-form-dialog.tsx` | 1 — `<Button className="bg-[#0D9488] ...">` (199) |
| `src/components/periodo-selector.tsx` | 1 — `focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50` (44) |
| `src/components/ui/dialog.tsx` | 1 — `bg-black/10` do overlay (34) — 19-05 troca para `bg-foreground/10` |
| `package.json` | 1 — `"name": "crm-leads"` (linha 2, PARTE B do guard) |

`verify:brand` fica **verde** só quando o 19-05 fechar essa lista inteira (inclusive o rename em `layout.tsx`/`app-sidebar.tsx`/`package.json`).

## Next Phase Readiness

- **19-05** herda a lista fechada acima (14 arquivos + `package.json`). Os utilitários `bg-|text-|border-status-*`, `bg-accent`, `bg-muted`, `bg-card`, `border-input`, `ring-ring` já estão exercidos em produção por este plano — o 19-05 aplica o mesmo idioma.
- Nenhum dos 14 arquivos deste plano é reaberto em plano posterior da fase (D-06 — refactor completo, não parcial).
- Layout do pipeline (5 colunas sem scroll, nome truncado) e toda a lógica sensível (`stopPropagation`, `startTransition`, `waHref`, `registerWhatsAppContact`, `buttonVariants`, supressões de lint) confirmados intactos por `git diff` (0 linhas dessas em todo o diff do plano).

## Self-Check: PASSED

- `src/components/pipeline-lead-card.tsx` — FOUND, `border-status-warning` = 1, `border-2` = 1, `transition-all` = 0
- `src/components/pipeline-column.tsx` — FOUND, `min-w-[200px]` = 1, `transition-colors` = 1
- `src/components/lead-table.tsx` — FOUND, `bg-status-success` = 1, `22C55E|16A34A` = 0, `git diff` sem `stopPropagation`
- `src/components/csv-column-mapper.tsx` — FOUND, `accent-primary` = 1, `accent-[` = 0, `8 campos fixos` = 1
- `src/components/whatsapp-preview-dialog.tsx` — FOUND, `text-destructive` = 2, `B91C1C` = 0, `registerWhatsAppContact` = 3, `waHref` = 3
- Grep-guard dos 14 arquivos deste plano: `0` linhas
- Commits `9be038d`, `4fa3e00`, `4bf3761` — todos FOUND em `git log`
- `tsc` 0 · `lint` 0 · `check:contrast` 0 · `build` 0 (13 páginas) · `test:lead-actions` 0 · `test:interacao-actions` 0

---
*Phase: 19-marca-e-identidade-visual*
*Completed: 2026-09-03*
