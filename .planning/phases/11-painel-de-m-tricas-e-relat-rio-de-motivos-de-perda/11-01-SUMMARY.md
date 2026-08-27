---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
plan: 01
status: complete
completed: 2026-08-27
tasks_total: 3
tasks_completed: 3
---

# 11-01 — Fundação de dados: `motivos_perda` + FK `leads.motivoPerdaId`

> SUMMARY escrito pelo orquestrador após o executor ser interrompido por limite de sessão
> (429, reset 15:10 São Paulo). As 3 tasks já estavam commitadas; faltava só este arquivo
> e a marcação de progresso no ROADMAP.

## O que foi construído

| Task | Commit | Entregou |
|------|--------|----------|
| 1 — Contratos de schema | `9d7661f` | `motivosPerda` (tabela Drizzle: `id`, `nome`, `deletedAt`) + índice único `motivo_perda_nome_unique_idx` + FK `leads.motivoPerdaId` (`integer`, nullable, `references(() => motivosPerda.id, { onDelete: "restrict" })`) + índice `leads_motivo_perda_id_idx`. `leads.motivoPerda` (texto) **mantida** na declaração (coluna morta — removida só na 11-03, D-decisão de RESEARCH). Tipos `MotivoPerda`/`NewMotivoPerda` em `src/types/index.ts`. `motivoPerdaSchema` em `src/lib/validations.ts` (espelho de `subnichoSchema`). `scripts/guard-no-hard-delete.cjs` estendido: `motivos_perda` no escopo protegido. |
| 2 — Migração `[BLOCKING]` | `3adaf93` | `scripts/migrate-motivos-perda.cjs` (131 linhas): backup WAL-checkpoint de `data/crm.db` → guarda de idempotência via `PRAGMA table_info` → `CREATE TABLE motivos_perda` + índice + `ALTER TABLE leads ADD COLUMN motivo_perda_id` → seed dos 6 motivos de D-02 → verificação de contagem. Rodou no banco real. |
| 3 — Gate de schema | `2a24f9c` | `scripts/verify-schema.cjs` estendido: `motivos_perda` em `requiredTables`, `motivo_perda_nome_unique_idx` em `requiredIndexes`, checagem de `leads.motivo_perda_id`. |

## Estado verificado no banco real (`data/crm.db`)

```
motivos_perda: 6 linhas — Preço | Sem retorno do lead | Concorrente | Sem verba/orçamento | Timing (não é prioridade agora) | Outro
leads.motivo_perda_id: coluna presente (nullable)
```

## Gates

- ✅ `npx tsc --noEmit` — exit 0
- ✅ `npm run guard:no-hard-delete` — OK (escopo protegido: leads, subnichos, interacoes, **motivos_perda**)
- ✅ `node scripts/verify-schema.cjs` — OK
- ⏭️ `npm run build` — não rodado (host 4GB, instável; `tsc` isolado é o gate de tipos, precedente Fases 06–10)

## Self-Check: PASSED

## Decisões / desvios

- Nenhum desvio do plano. A coluna física `leads.motivo_perda` foi mantida (decisão de RESEARCH "coluna morta"); sua remoção da declaração Drizzle acontece na 11-03 após a troca FK estar completa.
- D-01 (lista governada), D-02 (6 seeds) cobertos.

## Para a próxima onda (11-02)

A tabela e a FK já existem no banco real. 11-02 pode construir as Server Actions (`createMotivoPerda` retornando `{ success, id }`), a tela `/motivos-perda` e o item de menu diretamente sobre este schema.
