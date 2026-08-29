---
phase: 10
slug: sequ-ncia-de-follow-up-escalonada
status: verified
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-13
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | nenhum framework de teste (sem jest/vitest/pytest) — convenção do projeto: scripts node planos em `scripts/*.cjs`, registrados como `npm run test:*` / `verify:*`, com harness `check(condition, message)` + contador `failed` |
| **Config file** | none — convenção estabelecida desde a Fase 6, sem Wave 0 de instalação de framework |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npm run verify:schema && npm run verify:sequencia && npm run verify:origem-tipo && npm run guard:no-hard-delete && node scripts/verify-wa-contact-invariant.cjs && npm run test:lead-actions && npm run test:interacao-actions && npm run test:compute-sequencia && npm run build` |
| **Estimated runtime** | ~40s (host de 4GB RAM — rodar um comando de cada vez, `npm run dev` parado, nunca em paralelo) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run a cadeia completa de gates (full suite command acima)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~40s (build é o mais lento; scripts individuais rodam em segundos)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-T1 | 01 | 1 | SEQ-01, SEQ-02 | T-10-02 | Colunas Drizzle + Zod validam forma antes de escrever | unit/structural | `npx tsc --noEmit && npm run test:lead-actions` | ✅ | ✅ green |
| 10-01-T2 | 01 | 1 | SEQ-01 | T-10-01 | Migração manual idempotente, gate de schema permanente | integration | `node scripts/migrate-sequencia-followup.cjs && npm run verify:schema` | ✅ | ✅ green |
| 10-01-T3 | 01 | 1 | SEQ-02, ORIGEM-03 | T-10-03, T-10-04 | `computeSequenciaSugestao` — gates ORIGEM-03/D-09/D-10 e cálculo de data | unit | `npm run test:compute-sequencia` | ✅ (gap preenchido nesta sessão) | ✅ green |
| 10-02-T1 | 02 | 1 | SEQ-02 | T-10-07 | Avanço de `sequenciaPosicao` em `registerWhatsAppContact` (D-01) | unit/structural | `npm run test:lead-actions && npm run verify:sequencia` | ✅ | ✅ green |
| 10-02-T2 | 02 | 1 | SEQ-02 | — | Reset de `sequenciaPosicao` ao voltar para "novo" (D-02/D-12) | unit/structural | `npm run verify:sequencia` | ✅ | ✅ green |
| 10-02-T3 | 02 | 1 | SEQ-02 | T-10-10 | Guarda de regressão permanente (tabela-verdade + checagem estrutural) | unit | `npm run verify:sequencia` | ✅ | ✅ green |
| 10-03-T1 | 03 | 1 | SEQ-01 | T-10-11, T-10-12, T-10-14 | `saveConfiguracoes` lê lista repetida via `formData.getAll`, valida server-side | structural | `npx tsc --noEmit` + checagem inline (grep de padrões) | ✅ (thin — sem script persistido, comprovação comportamental pontual documentada no SUMMARY) | ✅ green |
| 10-03-T2 | 03 | 1 | SEQ-01 | — | Lista dinâmica de intervalos (adicionar/remover/renumerar) na UI | manual | — | ❌ | ⬜ manual-only |
| 10-04-T1 | 04 | 2 | SEQ-02, SEQ-03, ORIGEM-03 | T-10-15, T-10-16 | Cálculo server-side idêntico nas rotas `/` e `/pipeline` | structural | `npx tsc --noEmit && npm run verify:schema && npm run verify:sequencia && npm run verify:origem-tipo` | ✅ | ✅ green |
| 10-04-T2 | 04 | 2 | SEQ-02 | T-10-17 | Indicador "Sugestão: dd/MM" — cor neutra, rótulo, tooltip | manual | — | ❌ | ⬜ manual-only |
| 10-04-T3 | 04 | 2 | todos | todos | Gates finais + verificação ponta a ponta (10 comandos + human-check) | integration/manual | cadeia completa (full suite command acima) | ✅ (gates) / manual (human-check) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Único gap encontrado (`computeSequenciaSugestao` sem teste automatizado) foi preenchido nesta sessão de `/gsd-validate-phase` — `scripts/test-compute-sequencia-sugestao.cjs` criado, registrado como `npm run test:compute-sequencia`, 13 asserções, exit 0.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Lista dinâmica de intervalos: adicionar linha, remover linha do meio (renumeração 1,2,3), estado vazio bloqueado, valor 0 bloqueado | SEQ-01 | Sem framework de teste de componente/E2E no projeto; interação é puramente client-side (`useState` de lista) | `10-UAT.md` testes 2–7 (executados, 6/6 pass) |
| Indicador visual "Sugestão: dd/MM": cor neutra (nunca teal/âmbar), ícone de calendário, posição após contador de tentativas, tooltip explicativo | SEQ-02, D-06 | Correção visual/UX não é verificável por grep ou asserção de dados | `10-UAT.md` testes 9–10, 16–17 (executados, 4/4 pass) |
| Fluxo ponta a ponta real: clicar "Abrir WhatsApp" no navegador → sugestão muda/soma no pipeline e dashboard; Inbound nunca mostra; reset ao voltar pra "Novo"; esgotamento após o último degrau | SEQ-02, ORIGEM-03, D-10 | Depende de interação real de navegador (clique, drag, reload) — os gates de dados (`computeSequenciaSugestao`, `verify:sequencia`) são cobertos por unit test, mas o fluxo completo integrado só é provado rodando o app de verdade | `10-UAT.md` testes 11–15 (executados, 5/5 pass, incluindo o teste bloqueante 11 — ORIGEM-03) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (2 tasks são legitimamente manual-only — UI/UX pura, sem framework de componente no projeto)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (10-03-T2 e 10-04-T2 são intercalados por tasks com automação)
- [x] Wave 0 covers all MISSING references (o único MISSING — `computeSequenciaSugestao` — foi preenchido nesta sessão)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter — **não setado**: 2 de 11 tasks permanecem manual-only por natureza (UI dinâmica, indicador visual), não por gap de esforço. Todas as 3 áreas manuais já foram exercitadas e aprovadas na UAT completa (`10-UAT.md`, 17/17).

**Approval:** verified 2026-08-13 (partial automation — manual-only items justificados e já cobertos por UAT)
