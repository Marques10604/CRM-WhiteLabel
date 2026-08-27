---
phase: 11
slug: painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
status: reconciled
nyquist_compliant: true
wave_0_complete: false  # validação inline substitui Wave 0 formal — cada script .cjs é criado na task/onda que o consome (11-01/11-02/11-03/11-04)
created: 2026-08-14
reconciled: 2026-08-27  # mapa por-tarefa alinhado aos PLAN.md finais após gsd-plan-checker (0 bloqueadores)
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
| 11-01-01 | 11-01 | 1 | Schema / PERDA-01 | — | Tabela `motivos_perda` + coluna `leads.motivo_perda_id` declaradas no schema Drizzle | source assertion + `tsc` | `npx tsc --noEmit` | criado na task | ⬜ pending |
| 11-01-02 | 11-01 | 1 | PERDA-01 (governança) | T-11-SC | Migração `[BLOCKING]` manual via better-sqlite3: backup WAL + guarda idempotência + DDL cru + seed dos 6 motivos (D-02) + verificação de contagem | structural (`PRAGMA table_info`) | `node scripts/migrate-motivos-perda.cjs && node scripts/verify-motivos-perda-schema.cjs` | criado na task | ⬜ pending |
| 11-01-03 | 11-01 | 1 | PERDA-01 (governança) | T-11-SQLi | `motivos_perda` entra em `guard-no-hard-delete.cjs`; `verify:schema` estendido | static/structural | `npm run guard:no-hard-delete && npm run verify:schema` | ✅ (escopo estendido) | ⬜ pending |
| 11-02-01 | 11-02 | 2 | PERDA-01 (governança) | T-11-12/13 | `createMotivoPerda` reativa nome soft-deletado; `rename`/`softDelete` espelham `subnicho-actions.ts` | integration (`:memory:`) | `node scripts/test-motivo-perda-actions.cjs` | criado na task | ⬜ pending |
| 11-02-02 | 11-02 | 2 | PERDA-01 (governança) | — | Tela `/motivos-perda` + item de menu, espelhando `/subnichos` (D-05) | source assertion + `tsc` | `npx tsc --noEmit` | criado na task | ⬜ pending |
| 11-03-01 | 11-03 | 3 | D-03 | T-11-13 | `MotivoPerdaCombobox` com criação-na-hora (consome `createMotivoPerda`) | source assertion + `tsc` | `npx tsc --noEmit` | criado na task | ⬜ pending |
| 11-03-02 | 11-03 | 3 | D-04 | T-11-12 | `lead-form-dialog.tsx`: `<Textarea motivoPerda>` → `MotivoPerdaCombobox name="motivoPerdaId"`; `.refine` condicional em `leadSchema` (janela de `tsc` intencional, fechada na task 03) | source assertion | (par atômico com 11-03-03) | criado na task | ⬜ pending |
| 11-03-03 | 11-03 | 3 | D-04 | T-11-12 | `motivo-perda-dialog.tsx` (drag no pipeline): combobox obrigatório + "Cancelar" que reverte o drag otimista; `updateLeadStage`/`updateLead` rejeitam `perdido` sem `motivoPerdaId` | structural/behavioral | `npx tsc --noEmit && node scripts/verify-motivo-perda-obrigatorio.cjs && npm run verify:motivo-perda` | criado na task | ⬜ pending |
| 11-04-01 | 11-04 | 4 | METRICAS-01 | — | `computeTaxaConversao({total,fechados})` → `fechados/total`, e `0` quando `total=0` (Pitfall 3); `resolvePeriodRange`/`buildLinhasOrigem` puras | unit (função pura) | `node scripts/test-relatorios-queries.cjs` | criado na task | ⬜ pending |
| 11-04-02 | 11-04 | 4 | METRICAS-01/02 | T-11-21/26 | `getContagemPorOrigem`/`getContagemPorSubnicho` via SQL `GROUP BY`, `isNull(deletedAt)`, filtro por `createdAt` (D-09); "A categorizar" como grupo normal (D-12) | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | criado na task | ⬜ pending |
| 11-04-03 | 11-04 | 4 | PERDA-01 | T-11-21/26 | `getContagemPorMotivoPerda` filtra por `stageChangedAt` (D-11), não `createdAt` | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | criado na task | ⬜ pending |
| 11-05-01 | 11-05 | 5 | METRICAS-01/02, PERDA-01 | T-11-19/24 | `periodo-selector.tsx` por querystring (`?period=`), fallback silencioso sem `throw` para valor inválido (D-08/D-10) | source assertion + `tsc` | `npx tsc --noEmit` | criado na task | ⬜ pending |
| 11-05-02 | 11-05 | 5 | METRICAS-01/02, PERDA-01 | — | Tela `/relatorios` — 3 seções (origem+conversão, sub-nicho, motivos de perda), cálculo server-side | source assertion + `tsc` | `npx tsc --noEmit` | criado na task | ⬜ pending |
| 11-05-03 | 11-05 | 5 | METRICAS-01/02, PERDA-01 | — | Item de menu "Relatórios" + suíte completa de gates sequenciais + human-check | full suite | `npm run guard:no-hard-delete && npm run verify:schema && npm run verify:motivo-perda && node scripts/test-relatorios-queries.cjs && npx tsc --noEmit` | criado na task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Mapa reconciliado 2026-08-27 contra os 5 PLAN.md finais (task IDs posicionais `{plano}-{NN}`). Wave 0 formal não se aplica — cada script `.cjs` é criado na task/onda que o consome; o `gsd-plan-checker` confirmou: nenhuma janela de 3 tasks consecutivas sem `<automated>` verify, sem watch-mode, suíte ~30s.*

---

## Wave 0 Requirements

> **Não há Wave 0 formal nesta fase.** Cada script abaixo é criado *dentro* da task/onda que primeiro o consome (decisão do planner, confirmada pelo `gsd-plan-checker` — não há janela de 3 tasks consecutivas sem verify automatizado). A lista serve como rastreabilidade dos artefatos de teste, não como pré-requisito bloqueante.

- [ ] `scripts/migrate-motivos-perda.cjs` — **criado em 11-01-02** — migração (backup WAL-checkpoint + guarda idempotência via `PRAGMA table_info` + `CREATE TABLE`/`ALTER TABLE` cru + seed dos 6 motivos + verificação pós-migração)
- [ ] `scripts/verify-motivos-perda-schema.cjs` — **criado em 11-01-02** — integridade semântica da migração (seeds, FK, nullability, órfãos)
- [ ] Extensão de `scripts/guard-no-hard-delete.cjs` + `scripts/verify-schema.cjs` — **em 11-01-03** — `motivos_perda` em `CODE_PATTERNS`/`CODE_SQL_PATTERNS` (padrão da extensão feita para `interacoes` na Fase 9)
- [ ] `scripts/test-motivo-perda-actions.cjs` — **criado em 11-02-01** — cobre `createMotivoPerda`/`renameMotivoPerda`/`softDeleteMotivoPerda` (reativação por nome)
- [ ] `scripts/verify-motivo-perda-obrigatorio.cjs` + gate `verify:motivo-perda` — **criado em 11-03-03** — cobre D-04 (obrigatoriedade condicional), mirror de `verify-sequencia-posicao.cjs` Parte B
- [ ] `scripts/test-relatorios-queries.cjs` — **criado em 11-04-01** — cobre `computeTaxaConversao`, `resolvePeriodRange`, `buildLinhasOrigem` e as 3 queries `GROUP BY` (via `:memory:` com schema real, padrão de `test-compute-sequencia-sugestao.cjs`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Layout visual da tela `/relatorios` (cards, tipografia, hierarquia) | METRICAS-01/02, PERDA-01 | Julgamento visual — coberto por UI-SPEC.md + UAT, não por script `.cjs` | Rodar `/gsd-ui-phase 11`, depois validar via UAT com browser automation |
| Filtro de período muda os números exibidos na tela em tempo real | METRICAS-01/02, PERDA-01 | Interação de UI (dropdown/select + navegação) mais fácil de confirmar visualmente do que via script | Selecionar cada preset (30d/90d/Tudo) na tela `/relatorios` e conferir que os números mudam de forma consistente com os dados reais |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — confirmado pelo `gsd-plan-checker` (toda `<task>` tem comando `<automated>` no `<verify>`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — confirmado pelo `gsd-plan-checker`
- [x] Wave 0 covers all MISSING references — n/a (validação inline; cada script criado na onda que o consome)
- [x] No watch-mode flags — confirmado (nenhum `--watchAll`/`--watch`)
- [x] Feedback latency < 30s — suíte sequencial ~30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** reconciliado 2026-08-27 após `gsd-plan-checker` (0 bloqueadores; aviso [nyquist_compliance] fechado por esta reconciliação).
