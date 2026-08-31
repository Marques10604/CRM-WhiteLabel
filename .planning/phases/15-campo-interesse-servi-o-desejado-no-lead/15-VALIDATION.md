---
phase: 15
slug: campo-interesse-servi-o-desejado-no-lead
status: reconciled
nyquist_compliant: true
wave_0_complete: false  # validação inline — os casos novos são adicionados ao script .cjs existente na task que os consome (15-01-03 / 15-02-02)
created: 2026-08-31
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstruído em State B (sem VALIDATION.md prévio) a partir de `15-01-PLAN.md`/`15-02-PLAN.md` + `15-01-SUMMARY.md`/`15-02-SUMMARY.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Nenhum framework de teste (jest/vitest) — convenção do projeto: scripts `node scripts/*.cjs` com harness `check(condition, message)` |
| **Config file** | Nenhum — cada script é standalone, registrado em `package.json` `scripts` |
| **Quick run command** | `npm run test:lead-actions` (cobre `createLead`/`updateLead`/`bulkImportLeads`/`mapCsvRows` — Casos 13-19 são de `interesse`) |
| **Full suite command** | `npm run verify:schema && npm run test:lead-actions && npx tsc --noEmit` (sequencial — host 4GB RAM, nunca `&&` paralelo) |
| **Estimated runtime** | ~40 segundos (sequencial; `tsc` domina) |

---

## Sampling Rate

- **After every task commit:** rodar o script relevante à mudança (`npm run test:lead-actions` após tocar em `lead-actions.ts`/`validations.ts`/`csv-import.ts`/`import-actions.ts`; `npm run verify:schema` após a migração)
- **After every plan wave:** full suite sequencial listada acima
- **Before `/gsd-verify-work`:** full suite verde + `npx tsc --noEmit` limpo (`npm run build` completo é conhecidamente lento/instável neste host de 4GB — ver STATE.md; ambos os SUMMARY registram `build` exit 0 na execução)
- **Max feedback latency:** ~40 segundos

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 15-01 | 1 | LEAD-06 | T-15-02 | `leadBaseSchema.interesse` = `z.preprocess(""→undefined)` + `z.string().trim().max(500, "…500…")` opcional; propaga p/ `leadSchema` e `csvRowSchema` (fora do `.omit()`) | unit (Zod) + `tsc` | `npm run test:lead-actions` (Casos 15-16) + `npx tsc --noEmit` | ✅ | ✅ green |
| 15-01-02 | 15-01 | 1 | LEAD-06 | T-15-04 / T-15-05 | `[BLOCKING]` migração aditiva idempotente: backup + `wal_checkpoint(TRUNCATE)` antes de escrever, `PRAGMA table_info` guard, DDL literal estático, contagem antes/depois com `fail()`; `verify-schema.cjs` ganha gate de presença de `leads.interesse` | structural (`PRAGMA table_info`) | `npm run verify:schema` | ✅ (escopo estendido) | ✅ green |
| 15-01-03 | 15-01 | 1 | LEAD-06 | T-15-01 / T-15-03 | `createLead`/`updateLead` = `leadSchema.safeParse(Object.fromEntries(formData))` (allowlist) → grava `interesse: parsed.data.interesse ?? null` explícito; editar apagando o texto → `NULL` | integration (`:memory:` + banco temp) | `npm run test:lead-actions` (Casos 13-14) | ✅ | ✅ green |
| 15-02-01 | 15-02 | 2 | LEAD-06 | T-15-07 | `"interesse"` novo `CsvFieldKey`; `mapCsvRows` faz `readMapped(row,"interesse").slice(0,500)` ANTES da validação (célula gigante nunca reprova a linha); `FIELD_CONFIGS` ganha entrada `required:false`; `EMPTY_MAPPING` ganha `interesse:null` | unit (`mapCsvRows`) + `tsc` | `npm run test:lead-actions` (Caso 19) + `npx tsc --noEmit` | ✅ | ✅ green |
| 15-02-02 | 15-02 | 2 | LEAD-06 | T-15-09 / T-15-10 | `bulkImportLeads` valida cada linha com `csvRowSchema.safeParse` (allowlist, aborta o lote) e insere campo-a-campo `interesse: row.interesse ?? null` (Drizzle parametriza); `csv-import-preview-table` carrega `interesse: r.interesse` | integration (`:memory:` + banco temp) | `npm run test:lead-actions` (Casos 17-18) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Todos os comandos rodados em 2026-08-31 durante esta auditoria — `npm run test:lead-actions` (19 casos, Casos 13-19 de `interesse`) exit 0; `npm run verify:schema` exit 0 (confirma coluna `interesse`); `npx tsc --noEmit` exit 0.*

---

## Wave 0 Requirements

> **Não há Wave 0 formal nesta fase.** Fase pequena aditiva (2 planos, 2 ondas, 5 tasks). Nenhum script `.cjs` novo — os 7 casos de `interesse` (Casos 13-19) foram adicionados ao `scripts/test-lead-actions.cjs` existente, e o gate de coluna ao `scripts/verify-schema.cjs` existente, cada um na task que o consome. `gsd-plan-checker` aprovou (0 bloqueadores; 1 aviso não-bloqueante: sem RESEARCH.md — ok p/ fase aditiva).

- [x] `scripts/test-lead-actions.cjs` — **estendido em 15-01-03 (Casos 13-16) e 15-02-02 (Casos 17-19)** — persistência no form, limpeza p/ `NULL`, limite 500 c/ mensagem PT-BR, `csvRowSchema` sem `interesse`, persistência via import, `NULL` sem mapear, truncamento de `mapCsvRows`
- [x] `scripts/verify-schema.cjs` — **estendido em 15-01-02** — gate de presença de `leads.interesse` (mesmo idioma de `motivo_perda_id`/`sequencia_posicao`)
- [x] `scripts/migrate-interesse.cjs` — **criado em 15-01-02** — não é teste, mas é o artefato verificado por `verify:schema` + auditoria de runtime (`15-SECURITY.md` T-15-05)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Campo `<Input>` "Interesse" aparece no form de criar/editar lead, abaixo do campo Nicho, seção "Negócio" | LEAD-06 | Presença/posição de elemento de UI — o projeto não tem infra de teste de componente (jest-dom/RTL); consistente com todas as 15 fases | `/leads` → "Novo lead" → confirmar o input "Interesse" abaixo de "Nicho"; preencher, salvar, reabrir em edição → valor aparece; criar outro deixando vazio → salva sem erro; editar apagando → salva e campo volta vazio (coberto em `15-HUMAN-UAT.md`) |
| Passo de mapeamento do wizard de CSV lista "Interesse" como campo opcional, com opção "— nenhuma —" | LEAD-06 | Render condicional de `<Select>` a partir de `FIELD_CONFIGS` — sem infra de teste de componente | `/importar` → subir CSV com coluna livre → passo de mapeamento → confirmar "Interesse" na lista com "— nenhuma —"; mapear → confirmar import → abrir lead importado e ver o valor (coberto em `15-HUMAN-UAT.md`) |

*A camada de comportamento por trás desses dois itens (persistência, truncamento, `NULL`, limite) está 100% coberta por `test:lead-actions`. O que resta manual é apenas a existência/posição do widget na tela.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — cada task tem `<automated>` (`tsc` / `verify:schema` / `test:lead-actions`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — 5/5 tasks com verify automatizado
- [x] Wave 0 covers all MISSING references — n/a (nenhum MISSING; validação inline nos scripts existentes)
- [x] No watch-mode flags — nenhum `--watch`
- [x] Feedback latency < 40s — suíte sequencial ~40s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** reconstruído e auditado 2026-08-31 (State B). 0 gaps automatizados — todos os comportamentos de LEAD-06 têm verificação automatizada verde (Casos 13-19 + `verify:schema`). 2 verificações manual-only (presença de widget de UI), já cobertas por `15-HUMAN-UAT.md`.
