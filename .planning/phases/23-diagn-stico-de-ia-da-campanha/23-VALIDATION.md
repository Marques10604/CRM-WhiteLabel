---
phase: 23
slug: diagn-stico-de-ia-da-campanha
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-05
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node scripts sob medida (molde `scripts/test-*.cjs` do repo) — sem framework de teste externo |
| **Config file** | none — `ts-alias-loader.mjs` já existe no repo |
| **Quick run command** | `npm run test:diagnostico-estrutural` |
| **Full suite command** | `npm run lint && npx tsc --noEmit && npm run verify:schema && npm run test:diagnostico-estrutural` |
| **Estimated runtime** | ~30 segundos (nenhuma chamada de API — só fixtures) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:diagnostico-estrutural` (ou o gate do repo se a task não tocar IA)
- **After every plan wave:** Run the full suite command above
- **Before `/gsd-verify-work`:** Full suite green + `node scripts/eval-diagnostico.mjs` rodado à mão (precisa de `ANTHROPIC_API_KEY`)
- **Max feedback latency:** 30 segundos (harness estrutural); a avaliação de qualidade real (`eval-diagnostico.mjs`) é on-demand e fora do CI

---

## Per-Task Verification Map

> Preenchido pelo gsd-planner a partir dos PLAN.md. Cada task de lógica (schema, gate de fontes, migração, harness) mapeia para uma asserção do `scripts/test-diagnostico-estrutural.cjs` sobre fixtures. Tasks de UI e de geração real são Manual-Only (host 4GB sem navegador; geração precisa de chave + web search habilitada).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(planner preenche)_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Preenchido pelo gsd-planner. Esperado: fixtures de diagnóstico (`test/fixtures/diagnostico/*.json` — bons e ruins, incl. os 3 gold + 4 casos difíceis do 23-AI-SPEC §5) + esqueleto do `scripts/test-diagnostico-estrutural.cjs` + extensão do `scripts/verify-schema.cjs` com o bloco estrito de colunas de `diagnosticos`.

*Se nenhum: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Geração de diagnóstico real ponta a ponta (busca web, fontes citadas, objeto válido) | DIAGNOSTICO-01..07,09 | Precisa de `ANTHROPIC_API_KEY` + Web Search habilitada no Console Anthropic; custa dinheiro; 30-90s | `node scripts/eval-diagnostico.mjs` nos 3 nichos-gold — vereditos discriminados (costureira→mudar_angulo, motoboy→aprofundar, estética→abandonar) |
| Fluxo React da seção de diagnóstico em `/campanhas/[id]` (botão, pending, resultado, estado de rejeição, histórico) | DIAGNOSTICO-01,02,08,10 | Fluxo de UI React não verificável por grep; host 4GB não roda navegador + sessão de agente | UAT humano: abrir campanha, gerar, ver resultado com tags dado/marketing distintas, regenerar, ver custo/histórico |
| Rascunho de 1ª mensagem editável e copiável, nunca enviado | DIAGNOSTICO-08 | Interação de `<Textarea>` + clipboard | UAT humano: editar o rascunho, copiar, confirmar que não há botão de envio |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
