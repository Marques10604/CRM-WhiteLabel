---
phase: 11
slug: painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-14
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Nenhum framework de teste (jest/vitest) — convenção do projeto: scripts `node scripts/*.cjs` com harness `check(condition, message)` |
| **Config file** | Nenhum — cada script é standalone, registrado em `package.json` `scripts` |
| **Quick run command** | `node scripts/test-relatorios-queries.cjs` (a criar — testa `computeTaxaConversao`/`resolvePeriodRange` puras) |
| **Full suite command** | `npm run guard:no-hard-delete && npm run verify:schema && npm run test:lead-actions && npm run test:compute-sequencia && node scripts/test-relatorios-queries.cjs && node scripts/verify-motivos-perda-schema.cjs` (sequencial — host 4GB RAM, nunca `&&` paralelo) |
| **Estimated runtime** | ~30 segundos (sequencial, host 4GB RAM) |

---

## Sampling Rate

- **After every task commit:** rodar o script `.cjs` relevante à mudança (ex.: `node scripts/test-relatorios-queries.cjs` após tocar em `queries.ts`)
- **After every plan wave:** full suite sequencial listada acima
- **Before `/gsd-verify-work`:** full suite verde + `npx tsc --noEmit` limpo (mesmo padrão das Fases 06-10; `npm run build` completo é conhecidamente instável neste host de 4GB RAM — ver STATE.md "Fase 10 (10-04)")
- **Max feedback latency:** ~30 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-XX-XX | TBD | 0 | METRICAS-01 | — | `computeTaxaConversao({total,fechados})` retorna `fechados/total`, e `0` quando `total=0` | unit (função pura) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | METRICAS-01 | — | `getContagemPorOrigem(range)` agrupa via SQL `GROUP BY origem_tipo`, respeitando `deletedAt`/período | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | METRICAS-02 | — | `getContagemPorSubnicho(range)` inclui "A categorizar" como grupo normal (D-12) | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | PERDA-01 | — | `getContagemPorMotivoPerda(range)` filtra por `stageChangedAt` (D-11), não `createdAt` | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | PERDA-01 (governança) | — | `createMotivoPerda` reativa nome soft-deletado em vez de bloquear/duplicar (mesmo comportamento de `createSubnicho`) | integration (`:memory:`) | `node scripts/test-motivo-perda-actions.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | PERDA-01 (governança) | T-11-SQLi | `motivos_perda` nunca sofre hard-delete (extensão do guard existente) | static/structural | `npm run guard:no-hard-delete` | ✅ (estender escopo) | ⬜ pending |
| 11-XX-XX | TBD | 0 | D-04 | — | `updateLeadStage`/`updateLead` rejeitam `stage==="perdido"` sem `motivoPerdaId` | structural/behavioral | `node scripts/verify-motivo-perda-obrigatorio.cjs` | ❌ Wave 0 | ⬜ pending |
| 11-XX-XX | TBD | 0 | Schema | — | Tabela `motivos_perda` + coluna `leads.motivo_perda_id` presentes no banco real após migração | structural (`PRAGMA table_info`) | `npm run verify:schema` (estender) | ✅ (estender) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs ficam `TBD` até o planner atribuir os PLAN.md — este mapa será refinado pelo `gsd-nyquist-auditor`/planner ao gerar os planos.*

---

## Wave 0 Requirements

- [ ] `scripts/test-relatorios-queries.cjs` — cobre `computeTaxaConversao`, `resolvePeriodRange`, e as 3 queries `GROUP BY` (via `:memory:` com schema real, mesmo padrão de `test-compute-sequencia-sugestao.cjs` usando `DB_FILE_NAME=":memory:"` + `ts-alias-loader.mjs`)
- [ ] `scripts/test-motivo-perda-actions.cjs` — cobre `createMotivoPerda`/`renameMotivoPerda`/`softDeleteMotivoPerda`
- [ ] `scripts/verify-motivo-perda-obrigatorio.cjs` — cobre D-04 (obrigatoriedade condicional), mirror de `verify-sequencia-posicao.cjs` Parte B
- [ ] `scripts/verify-motivos-perda-schema.cjs` ou extensão de `scripts/verify-schema.cjs` — tabela `motivos_perda` + coluna `leads.motivo_perda_id` presentes
- [ ] Extensão de `scripts/guard-no-hard-delete.cjs` — adicionar `motivos_perda` a `CODE_PATTERNS`/`CODE_SQL_PATTERNS` (mesmo padrão da extensão feita para `interacoes` na Fase 9)
- [ ] `scripts/migrate-motivos-perda.cjs` — script de migração em si (backup WAL-checkpoint + guarda idempotência via `PRAGMA table_info` + `ALTER TABLE`/`CREATE TABLE` cru + verificação pós-migração)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Layout visual da tela `/relatorios` (cards, tipografia, hierarquia) | METRICAS-01/02, PERDA-01 | Julgamento visual — coberto por UI-SPEC.md + UAT, não por script `.cjs` | Rodar `/gsd-ui-phase 11`, depois validar via UAT com browser automation |
| Filtro de período muda os números exibidos na tela em tempo real | METRICAS-01/02, PERDA-01 | Interação de UI (dropdown/select + navegação) mais fácil de confirmar visualmente do que via script | Selecionar cada preset (30d/90d/Tudo) na tela `/relatorios` e conferir que os números mudam de forma consistente com os dados reais |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
