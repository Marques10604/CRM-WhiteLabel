---
phase: 19
slug: marca-e-identidade-visual
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-02
---

# Phase 19 — Validation Strategy

> Contrato de validação por fase para amostragem de feedback durante a execução.
> Derivado de `19-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Nenhum framework de teste de UI. Harnesses `.cjs` artesanais (`node scripts/*.cjs`), padrão do projeto. Sem Jest/Vitest/Playwright. |
| **Config file** | none — scripts standalone via `package.json` `scripts` |
| **Quick run command** | `npx tsc --noEmit && npm run lint` |
| **Full suite command** | `rm -rf .next && npm run build` + `node scripts/check-contrast.cjs && node scripts/verify-no-hardcoded-colors.cjs && node scripts/verify-brand-md.cjs` |
| **Estimated runtime** | ~60–90 s (build Turbopack domina; os 3 scripts novos são < 2 s cada) |

---

## Sampling Rate

- **After every task commit:** `npx tsc --noEmit && npm run lint`
- **After every plan wave:** `node scripts/check-contrast.cjs && node scripts/verify-no-hardcoded-colors.cjs && node scripts/verify-brand-md.cjs`
- **Before `/gsd-verify-work`:** `rm -rf .next && npm run build` verde + os 3 scripts verdes + `19-HUMAN-UAT.md` autorado (executado ao vivo se houver RAM, senão registro `code+data`/diferido — precedente Fase 18)
- **Max feedback latency:** ~90 s

---

## Per-Task Verification Map

> Task IDs reais dos 6 planos. Mapa de comportamentos → task que entrega → comando que prova.

| Requirement | Behavior verificável | Plano · Task | Test Type | Automated Command | File Exists |
|-------------|----------------------|--------------|-----------|-------------------|-------------|
| BRAND-02/03 | Existe um grep-guard que falha com cor hardcoded ou nome antigo | 19-01 · T1 | grep-guard | `node scripts/verify-no-hardcoded-colors.cjs` (RED esperado nesta onda) | ❌ W0 |
| BRAND-01 | Existe um gate de estrutura do `brand.md` | 19-01 · T2 | script | `node scripts/verify-brand-md.cjs` (RED esperado) | ❌ W0 |
| BRAND-02 | Existe um gate WCAG AA sobre `:root` e `.dark` | 19-01 · T2 | script | `node scripts/check-contrast.cjs` (RED esperado) | ❌ W0 |
| BRAND-01/02/03 | Os 3 gates são invocáveis por npm script; `.brand-preview/` e `*.css.bak` são ignorados pelo git; checklist D-19 escrito | 19-01 · T3 | script/file | `npm run verify:brand && npm run verify:brand-md && npm run check:contrast` (executáveis) + `git check-ignore -q .brand-preview/index.html` | ❌ W0 |
| BRAND-02 | Paleta não-grayscale aplicada em `:root` + `.dark`; `globals.css.bak` criado pelo skill | 19-02 · T1 | file/script | `test -f src/app/globals.css.bak && node scripts/check-contrast.cjs` | ✅ (W0 do 19-01) |
| BRAND-02 | Tipografia via `next/font/google` ligada em `layout.tsx` + `--font-heading` materializado (D-18) | 19-02 · T2 | grep/typecheck | `npx tsc --noEmit && grep -qE 'variable:\s*"--font-(sans\|mono\|serif)"' src/app/layout.tsx && test -f brand.md` | ✅ |
| BRAND-01 | `brand.md` com Paleta, Tipografia, Tom/Voz **e Nome/racional/colisão**; README criado | 19-02 · T3 | script | `npm run verify:brand-md` → exit 0 (9 checagens) | ✅ (W0 do 19-01) |
| BRAND-02 | Escala `--status-*` criada e `--sidebar-*` alinhados; 30 checagens de contraste passam | 19-03 · T1 | script | `npm run check:contrast && npx tsc --noEmit` | ✅ (W0 do 19-01) |
| BRAND-02 | `etapa-badge` e `csv-import-preview-table` sem cor hardcoded | 19-03 · T2 | grep-guard | `npx tsc --noEmit && npm run lint && node scripts/verify-no-hardcoded-colors.cjs 2>&1 \| grep -cE 'etapa-badge\|csv-import-preview-table'` → `0` | ✅ |
| BRAND-02 | `followup-dashboard` e `relatorios/page` sem cor hardcoded | 19-03 · T3 | grep-guard | idem, filtrando `followup-dashboard\|relatorios` → `0` | ✅ |
| BRAND-02 | Board do pipeline e tabela de leads em tokens | 19-04 · T1 | grep-guard | idem, filtrando `pipeline-*\|lead-table` → `0` | ✅ |
| BRAND-02 | Toolbar, colunas, dialogs de lead e lixeira em tokens | 19-04 · T2 | grep-guard | idem, filtrando `lead-table-toolbar\|...\|lixeira-table` → `0` | ✅ |
| BRAND-02 | Wizard de importação e superfícies de WhatsApp em tokens; app compila | 19-04 · T3 | build | `npx tsc --noEmit && npm run lint && rm -rf .next && npm run build` | ✅ |
| BRAND-02/03 | Sidebar em `--sidebar-*`, `<body>` sem cor cravada, nome "SOLO" na aba e no header, ícone "S" | 19-05 · T1 | grep/typecheck | `npx tsc --noEmit && npm run lint && ! git grep -qE "CRM de Leads\|CRM LEADS\|CRM Leads" -- src/` | ✅ |
| BRAND-02 | Templates, nichos, configurações e período em tokens | 19-05 · T2 | grep-guard | `node scripts/verify-no-hardcoded-colors.cjs 2>&1 \| grep -cE 'template-list\|...\|periodo-selector'` → `0` | ✅ |
| BRAND-02/03 | Refactor COMPLETO (zero cor hardcoded fora da allowlist) **e** `package.json` `"name": "solo"` — o grep-guard sai `0` pela 1ª vez, destravando a cadeia inteira do gate | 19-05 · T3 | grep-guard + build | `npm run verify:brand && npm run check:contrast && npx tsc --noEmit && npm run lint && rm -rf .next && npm run build` | ✅ |
| BRAND-03 | Favicon próprio (`src/app/icon.svg` com "S"), placeholder `favicon.ico` removido, sem `<script>`/`href="http"` no SVG | 19-06 · T1 | file/grep | `test -f src/app/icon.svg && test ! -f src/app/favicon.ico && ! grep -qE '<script\|<foreignObject\|href="http' src/app/icon.svg && npm run verify:brand && npm run verify:brand-md` | ✅ |
| BRAND-01/02/03 | Os 12 sensores da fase verdes simultaneamente, na mesma árvore de trabalho | 19-06 · T2 | portão completo | `rm -rf .next && npx tsc --noEmit && npm run lint && npm run build && npm run verify:brand && npm run verify:brand-md && npm run check:contrast && npm run guard:no-hard-delete && npm run verify:schema && npm run test:lead-actions && npm run test:tarefa-actions && npm run test:motivo-perda-actions && npm run test:group-by-urgency` | ✅ |
| BRAND-03 | Nenhuma regressão visual real (D-19) nas 10 rotas + 6 dialogs | 19-06 · T3 | manual/checklist | `19-HUMAN-UAT.md` sem `pending` (guard `node -e`) — **não-bloqueante**, ao vivo se houver RAM (precedente Fase 18) | ✅ (W0 do 19-01) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ❌ W0 = artefato criado na Wave 0 (plano 19-01)*

---

## Wave 0 Requirements

- [ ] `scripts/check-contrast.cjs` — parseia `:root` e `.dark` de `globals.css`, converte OKLCH→sRGB, valida os 15 pares WCAG AA em light **e** dark (30 checagens). Cobre BRAND-02. → 19-01 · T2
- [ ] `scripts/verify-no-hardcoded-colors.cjs` — grep-guard: falha se `#hex`, `-[#…]`, ou escala neutra Tailwind (`(bg|text|border|ring)-(zinc|slate|gray|neutral|white|black)`) aparece em `src/**/*.{ts,tsx}` fora da allowlist; PARTE B também falha se "CRM de Leads"/"CRM LEADS" ou `"name": "crm-leads"` persiste no `package.json`. Registrar como `verify:brand`. Cobre BRAND-02 + BRAND-03. → 19-01 · T1
- [ ] `scripts/verify-brand-md.cjs` — `brand.md` existe + tem seções Paleta / Tipografia / Tom-voz / **Nome-racional-colisão**; `globals.css.bak` existe; `layout.tsx` importa de `next/font/google`. Cobre BRAND-01. → 19-01 · T2
- [ ] `19-HUMAN-UAT.md` — checklist das 10 rotas + dialogs com a definição operacional D-19 (abaixo), para execução ao vivo (se RAM) ou registro `code+data`/diferido. → 19-01 · T3
- [ ] `.gitignore` — adicionar `.brand-preview/` e `*.css.bak` (hoje só `/.next/`). → 19-01 · T3
- Framework install: **nenhum** — tudo Node built-in.

> `wave_0_complete` só vira `true` quando o plano 19-01 for executado — os 5 artefatos acima ainda
> não existem no disco. Nenhum plano dependente (19-02 a 19-06) roda antes disso: a Wave 0 é o
> único ancestral comum na cadeia `depends_on`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Não-regressão visual real nas telas existentes | BRAND-03 / SC#5 | Julgamento de "layout quebrado / texto ilegível / elemento cortado" precisa de olho humano no navegador; contraste medido é automatizado, o resto não | Abrir cada rota do `NAV_ITEMS` em light e com `.dark` forçado via devtools; conferir contra a definição D-19. Não-bloqueante — se o host de 4GB não permitir dev server + Chrome, registrar `code+data` e diferir a inspeção visual pura (precedente Fase 18). |

### Definição operacional de "regressão visual" (D-19)

**Conta como regressão (bloqueia):** layout quebrado (elementos sobrepostos / empurrados pra fora), texto ilegível, contraste medido < WCAG AA, dark mode bugado **quando `.dark` é forçado** (texto invisível, superfície branca cravada), elemento sumido / cortado / truncado errado, sidebar header quebrando em 2 linhas, colunas do pipeline com scroll horizontal, badge de etapa quebrando linha.

**NÃO conta (nunca bloqueia):** "a cor mudou", "não gostei da combinação", "o teal sumiu", "ficou escuro demais", qualquer julgamento estético. Mudança de cor é o objetivo declarado da fase.

### Rotas a cobrir (NAV_ITEMS + dialogs), cada uma em light + `.dark` forçado

`/` (follow-ups + tarefas) · `/leads` (+ LeadFormDialog, LeadTimelineDialog, WhatsAppPreviewDialog, delete dialog) · `/importar` (+ `/importar/[batchId]`; wizard upload → column-mapper → preview-table → post-import) · `/pipeline` (+ drag entre colunas, MotivoPerdaDialog no drop pra "Perdido", pipeline-lead-card) · `/relatorios` (+ faixa de intervalo inválido, PeriodoSelector) · `/templates` (+ TemplateFormDialog) · `/nichos` (+ NichoManager criável) · `/motivos-perda` (+ MotivoPerdaManager, MotivoPerdaCombobox criável) · `/lixeira` (LixeiraTable) · `/configuracoes` (ConfiguracoesForm)

---

## Validation Sign-Off

- [x] Todas as tasks têm `<automated>` verify ou dependência de Wave 0 — as 18 tasks dos 6 planos estão mapeadas acima; a única verificação humana (19-06 · T3) tem `<automated>` de guard sobre o `19-HUMAN-UAT.md` e é explicitamente não-bloqueante
- [x] Continuidade de amostragem: sem 3 tasks seguidas sem verify automatizado — toda task de refactor fecha com `tsc + lint + grep-guard`; toda onda fecha com um gate de script
- [x] Wave 0 cobre todas as referências MISSING (3 scripts `.cjs` + `19-HUMAN-UAT.md` + `.gitignore`) e roda antes de qualquer dependente (19-01 é o único plano com `depends_on: []`)
- [x] Sem flags de watch-mode — todos os comandos são one-shot com exit code explícito
- [x] Feedback latency < 90 s — documentada em §Sampling Rate (build Turbopack domina; os 3 scripts < 2 s cada)
- [x] `nyquist_compliant: true` setado no frontmatter
- [ ] `wave_0_complete: true` — pendente até a execução do plano 19-01 (esperado; não bloqueia a aprovação da estratégia)

**Approval:** approved 2026-09-02
