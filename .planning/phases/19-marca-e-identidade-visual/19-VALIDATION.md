---
phase: 19
slug: marca-e-identidade-visual
status: draft
nyquist_compliant: false
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

> Preenchido pelo planner com os Task IDs reais. Mapa de comportamentos → comando abaixo.

| Requirement | Behavior verificável | Test Type | Automated Command | File Exists |
|-------------|----------------------|-----------|-------------------|-------------|
| BRAND-01 | `brand.md` na raiz com seções Paleta, Tipografia, Tom/voz **e Nome/racional/colisão** | file/grep | `node scripts/verify-brand-md.cjs` | ❌ W0 |
| BRAND-02 | `:root` e `.dark` de `globals.css` com paleta não-grayscale aplicada (chroma ≠ 0 em `--primary`, ≠ default) | grep/script | `node scripts/verify-brand-md.cjs` | ❌ W0 |
| BRAND-02 | Tipografia via `next/font/google` ligada em `layout.tsx` (par escolhido ou Geist mantido conscientemente) | grep | `node scripts/verify-brand-md.cjs` (checa import `next/font/google` + `variable: "--font-*"`) | ❌ W0 |
| BRAND-02 | `src/app/globals.css.bak` criado (backup do skill antes de sobrescrever) | file | `test -f src/app/globals.css.bak` | ❌ W0 |
| BRAND-02 | Tokens contrastam WCAG AA em light **e** dark (~13 pares de `contrast-rules.md`) | script | `node scripts/check-contrast.cjs` | ❌ W0 |
| BRAND-02/03 | Refactor completo — zero cor hardcoded em `src/**/*.{ts,tsx}` fora da allowlist | grep-guard | `node scripts/verify-no-hardcoded-colors.cjs` | ❌ W0 |
| BRAND-03 | "CRM de Leads" / "CRM LEADS" / "CRM Leads" ausente de `src/` e `package.json` | grep-guard | `! git grep -nE "CRM de Leads\|CRM LEADS\|CRM Leads" -- src/ package.json` (dobrado no script acima) | ❌ W0 |
| BRAND-03 | Ícone do sidebar é "S" (não "I") | grep | `grep -A2 'aria-hidden' src/components/app-sidebar.tsx` | ✅ (grep nativo) |
| BRAND-02/03 | App compila e todas as rotas geram (13+ páginas) | build | `rm -rf .next && npm run build` exit 0 | ✅ (`npm run build`) |
| BRAND-02/03 | Sem erro de tipo introduzido pelo refactor | typecheck | `npx tsc --noEmit` | ✅ |
| BRAND-03 | Nenhuma regressão visual real (D-19) nas 10 rotas + dialogs | manual/checklist | `19-HUMAN-UAT.md` — não-bloqueante, ao vivo se houver RAM (precedente Fase 18) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-contrast.cjs` — parseia `:root` e `.dark` de `globals.css`, aproxima sRGB a partir de OKLCH, valida os ~13 pares WCAG AA de `contrast-rules.md` em light **e** dark. Cobre BRAND-02.
- [ ] `scripts/verify-no-hardcoded-colors.cjs` — grep-guard: falha se `#hex`, `-[#…]`, ou escala neutra Tailwind (`(bg|text|border|ring)-(zinc|slate|gray|neutral|white|black)`) aparece em `src/**/*.{ts,tsx}` fora da allowlist; também falha se "CRM de Leads"/"CRM LEADS" persiste. Registrar como `verify:brand` em `package.json`. Cobre BRAND-02 + BRAND-03.
- [ ] `scripts/verify-brand-md.cjs` — `brand.md` existe + tem seções Paleta / Tipografia / Tom-voz / **Nome-racional-colisão**; `globals.css.bak` existe; `layout.tsx` importa de `next/font/google`. Cobre BRAND-01.
- [ ] `19-HUMAN-UAT.md` — checklist das 10 rotas + dialogs com a definição operacional D-19 (abaixo), para execução ao vivo (se RAM) ou registro `code+data`/diferido.
- [ ] `.gitignore` — adicionar `.brand-preview/` e `*.css.bak` (hoje só `/.next/`).
- Framework install: **nenhum** — tudo Node built-in.

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

- [ ] Todas as tasks têm `<automated>` verify ou dependência de Wave 0
- [ ] Continuidade de amostragem: sem 3 tasks seguidas sem verify automatizado
- [ ] Wave 0 cobre todas as referências MISSING (3 scripts `.cjs` + `19-HUMAN-UAT.md` + `.gitignore`)
- [ ] Sem flags de watch-mode
- [ ] Feedback latency < 90 s
- [ ] `nyquist_compliant: true` setado no frontmatter

**Approval:** pending
