---
phase: 19-marca-e-identidade-visual
reviewed: 2026-09-03T15:43:50Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - scripts/check-contrast.cjs
  - scripts/verify-brand-md.cjs
  - scripts/verify-no-hardcoded-colors.cjs
  - src/app/globals.css
  - src/app/icon.svg
  - src/app/layout.tsx
  - src/app/relatorios/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/configuracoes-form.tsx
  - src/components/csv-column-mapper.tsx
  - src/components/csv-import-preview-table.tsx
  - src/components/csv-upload-dropzone.tsx
  - src/components/etapa-badge.tsx
  - src/components/followup-dashboard.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table-columns.tsx
  - src/components/lead-table-toolbar.tsx
  - src/components/lead-table.tsx
  - src/components/lead-timeline-dialog.tsx
  - src/components/lixeira-table.tsx
  - src/components/motivo-perda-combobox.tsx
  - src/components/motivo-perda-dialog.tsx
  - src/components/motivo-perda-manager.tsx
  - src/components/nicho-manager.tsx
  - src/components/periodo-selector.tsx
  - src/components/pipeline-board.tsx
  - src/components/pipeline-column.tsx
  - src/components/pipeline-lead-card.tsx
  - src/components/post-import-lead-list.tsx
  - src/components/tarefa-card.tsx
  - src/components/tarefa-form-dialog.tsx
  - src/components/template-form-dialog.tsx
  - src/components/template-list.tsx
  - src/components/ui/dialog.tsx
  - src/components/whatsapp-preview-dialog.tsx
  - src/components/whatsapp-send-button.tsx
  - package.json
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-09-03T15:43:50Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Fase 19 é majoritariamente refatoração mecânica de cor (hex/`bg-[#...]`/escala `zinc-*`/`style` inline → tokens shadcn), mais nova paleta OKLCH em `globals.css`, rename "CRM de Leads" → "SOLO", `icon.svg` novo e 3 scripts `.cjs` de gate.

Verificações positivas:

- **`icon.svg`** — SVG estático (`<rect>` + `<text>`), sem `<script>`, sem `foreignObject`, sem `href`/`xlink:href` externo, sem `<image>`. Limpo.
- **`check-contrast.cjs`** — matemática OKLCH→OKLab→LMS→sRGB linear→clamp de gamut→luminância WCAG está correta (coeficientes padrão; near-black/near-white dá 17.66, plausível). Roda e sai 0: 30/30 pares passam AA.
- **`verify-brand-md.cjs`** e **`verify-no-hardcoded-colors.cjs`** — rodam e saem 0 no estado atual.
- **`globals.css`** — sem auto-referência de CSS var (`--sidebar: var(--card)` etc. resolvem); `--font-heading: var(--font-sans)` → `--font-geist-*` é o wiring intencional do projeto (não reportado). Todos os `--status-*` presentes em `:root` E `.dark`.
- **`layout.tsx`** — metadata renomeada, `bg-white` do `<body>` removido (agora herda `bg-background` do `@layer base`). OK.
- Regressão comportamental nos 34 componentes: tracei os diffs não-triviais (`etapa-badge`, `followup-dashboard`, `csv-import-preview-table`, `whatsapp-preview-dialog`). Nenhuma quebra de lógica/props/handlers/ordem de render. Dois deles excedem o contrato "só className" (ver IN-01).

As 4 WARNINGs são: 2 regressões de UX por escolher token de *fundo de badge* onde a cor precisa ter peso visual, e 2 gates novos com checagem frouxa demais que dá falsa confiança.

## Warnings

### WR-01: Borda "esfriando" some no modo claro — `border-status-warning` é quase branco

**File:** `src/components/pipeline-lead-card.tsx:62`
**Issue:** O diff troca `isEsfriando ? "border-2 border-[#F59E0B]"` (âmbar vívido) por `"border-2 border-status-warning"`. `--status-warning` em `:root` é `oklch(0.94 0.06 85)` — um amarelo pálido de *fundo de badge*. Sobre o card `bg-card` (`oklch(1)`) essa borda de 2px fica praticamente invisível no modo claro, anulando a pista visual de card esfriando (METRICAS/pipeline). O texto logo abaixo usa `text-status-warning-foreground` (escuro, `oklch(0.44)`) — inconsistente com a borda.
**Fix:**
```tsx
isEsfriando ? "border-2 border-status-warning-foreground" : "border",
```
(ou introduzir um token de borda dedicado). `--status-warning-foreground` já está registrado em `@theme inline`.

### WR-02: Botão CTA de WhatsApp vira pálido e sem hover — uso semântico errado de `--status-*`

**File:** `src/components/lead-table.tsx:258`
**Issue:** O botão principal de enviar WhatsApp passou de `bg-[#22C55E] ... hover:bg-[#16A34A]` (verde sólido, feedback de hover claro) para `bg-status-success font-semibold text-status-success-foreground ... hover:bg-status-success/90`. `--status-success` é `oklch(0.94 0.06 155)` — token de *fundo de badge*, muito claro. Resultado: CTA proeminente vira um botão verde-água lavado, e `hover:bg-status-success/90` (90% de opacidade de uma cor já pálida) quase não dá retorno visual. Além disso é inconsistente com `whatsapp-preview-dialog.tsx:217`, onde a ação equivalente "Abrir WhatsApp" foi mapeada para o botão `primary` padrão (teal). Duas ações de WhatsApp, dois tratamentos diferentes.
**Fix:** Alinhar as duas ações de WhatsApp ao mesmo tratamento. Se o verde é intencional para diferenciar do teal da marca, usar um par com peso real (ex.: `bg-status-success-foreground text-status-success` ou um token de acento dedicado), não o par fundo-de-badge. Se não, usar o botão `primary` padrão como no dialog.

### WR-03: `check-contrast.cjs` não cobre os pares que o refactor realmente coloca na tela

**File:** `scripts/check-contrast.cjs:174-190`
**Issue:** O cabeçalho do script promete medir "para cada par foreground/background que aparece na tela". Mas `PAIRS` só valida `--status-*-foreground` sobre `--status-*` da mesma família. O refactor D-06 passa a renderizar `text-status-*-foreground` sobre `bg-card`/`bg-muted` (texto "Esfriando" em `pipeline-lead-card.tsx:104`, datas do dashboard em `followup-dashboard.tsx:216`) e `border-status-warning` sobre `bg-card` (WR-01) — nenhum desses pares é checado. Os valores atuais passam AA na prática, mas o gate dá falsa confiança para edições futuras de paleta (justamente o cenário que o comentário do script diz proteger: "o /brand-design reescreve as CSS variables").
**Fix:** Adicionar a `PAIRS` os pares reais de tela, no mínimo:
```js
["status-danger-foreground", "card", TEXT_MIN],
["status-warning-foreground", "card", TEXT_MIN],
["status-warning-foreground", "muted", TEXT_MIN],
["muted-foreground", "card", TEXT_MIN],
```

### WR-04: Gates de conteúdo do `verify-brand-md.cjs` casam substrings acidentais

**File:** `scripts/verify-brand-md.cjs:72,78`
**Issue:** `check(/tom|voz/i.test(brand), ...)` — `tom` casa "custom", "átomo", "bottom", "sintoma"; `voz` casa "vozes". `check(/colis|descart|SoloCRM|Salesboom|gosolo/i.test(brand), ...)` — `descart` casa "descartar"/"descartável" em qualquer frase. Um `brand.md` gerado pelo skill pode passar as duas checagens sem ter de fato uma seção "Tom / Voz" nem a ressalva de colisão de nome (D-02) — que é exatamente o "augment manual" que o script existe para forçar. Gate frouxo = falso verde.
**Fix:** Ancorar em heading e/ou exigir a frase específica:
```js
check(/^#{2,3}\s+.*(tom|voz)/im.test(brand), "brand.md tem seção Tom / Voz");
check(/colis[aã]o|colidem|SoloCRM|Salesboom|gosolo\.io/i.test(brand),
      "brand.md registra a ressalva de colisão do nome (D-02)");
```

## Info

### IN-01: `etapa-badge.tsx` e `followup-dashboard.tsx` excedem o contrato "só className"

**File:** `src/components/etapa-badge.tsx:19-45`, `src/components/followup-dashboard.tsx:43-48,92-113,164-176`
**Issue:** O plano prometeu diff só de `className`. Estes dois vão além:
- `etapa-badge.tsx`: `STAGE_CONFIG` (um `Record` com `label/bg/text`) foi partido em `STAGE_LABEL` + `STAGE_TOKEN`, novo import `cn`, e `STAGE_OPTIONS` agora deriva de `Object.keys(STAGE_LABEL)` em vez de `STAGE_CONFIG`. Comportamento equivalente (ordem `novo→contatado→negociacao→fechado→perdido` preservada, labels idênticos), mas o export `STAGE_OPTIONS` (consumido pelo filtro de etapa da toolbar) agora depende da ordem de chaves de outro objeto.
- `followup-dashboard.tsx`: o `type UrgencySection` mudou de forma (`headerBg`/`headerText` → `headerClass`); os `style={{ color }}` inline no `<h2>`/`<span>` foram removidos, passando a depender de herança de `color` a partir do `headerClass` no `<div>` pai (herança de `color` é válida em CSS, então funciona).
**Fix:** Nenhuma mudança de código exigida — mas pedir teste manual do filtro de etapa da toolbar e dos 3 cabeçalhos do dashboard (Vencidos/Hoje/Próximos 7 dias) na UAT, já que o diff não é troca pura de cor.

### IN-02: `verify-no-hardcoded-colors.cjs` — `OLD_NAME` case-sensitive e scan root sem validação

**File:** `scripts/verify-no-hardcoded-colors.cjs:62,49-50,146`
**Issue:**
- `OLD_NAME` regex é `/CRM de Leads|CRM LEADS|CRM Leads/` (sem flag `i`). Variantes como `CRM DE LEADS`, `crm de leads` ou `Crm De Leads` passariam batido.
- `process.argv[2]` (scan root customizado, usado para a fixture) é passado direto a `path.resolve(ROOT, root)` e `walk()` sem validação. `node scripts/verify-no-hardcoded-colors.cjs ../../algum-dir` faria o walk sair da raiz do repo. Impacto baixo (script de dev, só lê `.ts/.tsx` e faz grep), mas vale restringir a subdiretório de `ROOT`.
**Fix:** Adicionar flag `i` ao `OLD_NAME` (cuidado com falsos positivos em identificadores — testar); e após `path.resolve`, checar `resolved.startsWith(ROOT)` antes do walk.

### IN-03: Guard de cor não detecta `rgb()/rgba()/hsl()/oklch()` literais fora de `style={{}}`

**File:** `scripts/verify-no-hardcoded-colors.cjs:61-77`
**Issue:** `CODE_PATTERNS` cobre `#hex`, `-[#hex]`, escalas Tailwind, nome antigo e `style={{ backgroundColor/color/borderColor: }}`. Não cobre uma string de cor funcional solta, ex. `const c = "rgba(13,148,136,0.1)"` ou `oklch(...)` num `.ts`. O `rgba()` que estava em `template-list.tsx` só foi pego porque estava dentro de `style={{}}`. Um literal equivalente atribuído a variável e usado depois passaria.
**Fix:** Adicionar padrão `{ id: "FN_COLOR", re: /\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(\s*[\d.]/i }` (com allowlist para comentários/CSS-in-JS legítimo se aparecer).

---

_Reviewed: 2026-09-03T15:43:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
