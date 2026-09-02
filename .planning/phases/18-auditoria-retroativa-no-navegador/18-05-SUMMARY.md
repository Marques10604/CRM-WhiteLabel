---
phase: 18-auditoria-retroativa-no-navegador
plan: 05
subsystem: verification
tags: [uat, audit, code-data, fase-6, auto-avanco]
status: complete

requires:
  - phase: 18-auditoria-retroativa-no-navegador
    plan: 04
    provides: "04-HUMAN-UAT.md complete + 04-VERIFICATION.md passed"
provides:
  - "06-HUMAN-UAT.md complete — 10/11 pass (code+data), 1 skipped (cenário 11 layout visual), 0 issues"
  - "06-VERIFICATION.md human_needed -> passed (human_verification: [])"
affects: [18-06]

key-files:
  modified:
    - .planning/phases/06-auto-avan-o-de-etapa-contador-de-tentativas/06-HUMAN-UAT.md
    - .planning/phases/06-auto-avan-o-de-etapa-contador-de-tentativas/06-VERIFICATION.md

key-decisions:
  - "D-01 revisado: code+data. verify-wa-contact-invariant.cjs (tabela-verdade 15/15) + data/crm.db (leads reais 17/18/19 que já avançaram) são a prova central."
  - "Cenário 11 (esfriando + contador na mesma linha sem quebra de layout) marcado SKIPPED — puramente visual, não reproduzível sem navegador nem dados que combinem os dois estados"
  - "WR-01 do 06-REVIEW (TOCTOU estreito) registrado como FECHADO pela quick 260811-pb1"

requirements-completed: [AUDIT-04]

duration: incluído na sessão de auditoria da Fase 18
completed: 2026-09-02
---

# Phase 18 Plan 05: Fase 6 — Auto-avanço de Etapa + Contador de Tentativas (code+data)

**Os 11 cenários de `06-HUMAN-UAT.md` executados por code+data: 10 `pass`, 1 `skipped`
(cenário 11, layout puramente visual). `06-HUMAN-UAT.md` → `complete`. `06-VERIFICATION.md`
promovido a `passed`.**

## Accomplishments

- **10 cenários `pass (code+data)`** — gate `advanced = tipo === "primeiro_contato" &&
  current.stage === "novo"`; incremento incondicional de `contact_attempts`; toast literal
  `${nome} avançou para Contatado.`; tipo VIVO do Select prevalece sobre `defaultTipo`;
  `avancaSequencia = tipo === "follow_up"` avança `sequencia_posicao`; as 3 superfícies (`/`,
  `/leads`, `/importar/[batchId]`) + `/pipeline` usam o mesmo `<WhatsAppPreviewDialog>`.
  - Harness `verify-wa-contact-invariant.cjs` (exit 0): "tabela-verdade: 15/15 pares corretos",
    "acumulação/gate: lead1 (novo->contatado, 3x, nunca re-avança)".
  - Harness `test:interacao-actions` (exit 0): insert incondicional em `interacoes`.
  - `data/crm.db`: `clinicainovecambe`/`jamilasilva` (novo→contatado, 1x),
    `dentista_juliaxavier` (negociacao, 3x, nunca regrediu), 20 leads com `contact_attempts = 0`.
- **1 cenário `skipped`** — cenário 11 (esfriando + contador na mesma linha sem quebra de
  layout, cores distintas). Reforço por código: mesmo container `flex flex-wrap`, âmbar
  `#B45309` vs. neutro `text-muted-foreground`. "Sem quebra de layout" só é observável
  renderizando.
- **`06-VERIFICATION.md` → `passed`** — `human_verification: []`, seções "Promoção de status"
  e "Método de Verificação"; WR-01 marcado como fechado pela quick 260811-pb1; header
  duplicado "## Goal Achievement" corrigido.

## Issues Encontradas

Nenhuma. A auditoria code+data de `registerWhatsAppContact` e das superfícies de contador não
encontrou defeito de runtime. O caveat WR-01 do `06-REVIEW.md` (o `WHERE` da escrita final não
reverificava `stage = 'novo'`) foi FECHADO pela quick 260811-pb1 —
`registerWhatsAppContact` agora tem `stageGuard` no `WHERE` atômico da transação + um segundo
`UPDATE` de fallback que preserva o contador sob corrida (`lead-actions.ts:353-380`). O CR-01
do `06-REVIEW.md` (migrações `.sql` divergentes do schema) continua sendo débito de
infraestrutura pré-existente cross-fase (`deferred-items.md`), não achado desta fase.

## Next Phase Readiness

- AUDIT-04 fechado. Plano 18-06 (Fase 8 + limpeza do STATE) pode prosseguir.

---
*Phase: 18-auditoria-retroativa-no-navegador — Plan 05*
*Completed: 2026-09-02 (code+data)*
