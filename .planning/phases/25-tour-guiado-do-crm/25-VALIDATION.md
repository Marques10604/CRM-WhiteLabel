---
phase: 25
slug: tour-guiado-do-crm
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-12
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Harness Node `.cjs` customizado (sem Jest/Vitest/Playwright no projeto), padrão já usado em `scripts/test-*.cjs` |
| **Config file** | nenhum framework formal — cada harness é um script standalone (ver `scripts/test-lead-csv-export.cjs`) |
| **Quick run command** | `npx tsc --noEmit && npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30-60s (tsc+lint), ~2-3min (build, host 4GB) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npm run lint`
- **After every plan wave:** Run `npm run build` (isolado, sem outros processos pesados em paralelo — host 4GB)
- **Before `/gsd-verify-work`:** Full suite must be green + harness de persistência (se extraído) verde
- **Max feedback latency:** ~180 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | TUTORIAL-04 | — | só `react-joyride` como dependência de tour | structural | `npm ls react-joyride` | ✅ | ⬜ pending |
| 25-01-02 | 01 | 1 | TUTORIAL-02/05 | T-25-01 | `deveGravarComoVisto(status)` pura, sem XSS via content dinâmico | unit | `node scripts/test-tour-persistence.cjs` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 2 | TUTORIAL-01/03 | — | tour renderiza 5 passos ancorado na sidebar | manual-only | — (UAT navegador) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-tour-persistence.cjs` — cobre TUTORIAL-02/05, exige extrair a lógica de gravar/ler a flag "já visto" para uma função pura em `src/lib/tour-persistence.ts` (ex.: `deveGravarComoVisto(status)`, `lerTourVisto()/gravarTourVisto()`) mockável sem `window`/DOM real
- [ ] Nenhum framework de teste de DOM/browser será instalado — fora de orçamento (host 4GB); UAT humano cobre o comportamento visual/interativo real do Joyride

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tour aparece na 1ª visita com 5 passos cobrindo dashboard/leads/pipeline/relatórios/campanhas | TUTORIAL-01 | Joyride manipula DOM/portal real; harness `.cjs` sem browser não renderiza | Abrir o app sem `tourVisto` no localStorage (ou limpar), navegar pra `/`, confirmar que o tour inicia sozinho e cada passo aponta pro item certo da sidebar |
| Pular/fechar a qualquer passo sem forçar conclusão | TUTORIAL-02 | Interação real de clique nos botões do Joyride | Iniciar o tour, clicar "Pular" no passo 2, confirmar que fecha e não reabre sozinho ao recarregar |
| Reiniciar o tour por um ponto de acesso fixo | TUTORIAL-03 | Clique real + observar reaparecimento visual do tour | Ir em `/configuracoes`, clicar "Rever tour do CRM" (ou nome equivalente), confirmar que o tour reinicia do passo 1 |
| Tema claro/escuro do tooltip do Joyride | — (qualidade visual) | Inspeção visual de cores/contraste, não verificável por grep | Alternar tema claro/escuro com o tour aberto, confirmar legibilidade e uso dos tokens OKLCH da marca |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
