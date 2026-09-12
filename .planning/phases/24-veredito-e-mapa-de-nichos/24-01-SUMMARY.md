---
phase: 24-veredito-e-mapa-de-nichos
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, server-actions, veredito]

# Dependency graph
requires:
  - phase: 22-campanha-de-exploracao-de-nicho
    provides: tabela campanhas (nicho + oferta + janela + meta + estado), Server Actions de CRUD
  - phase: 23-diagnostico-de-ia-da-campanha
    provides: enum veredito_sugerido.decisao (aprofundar/mudar_angulo/abandonar) espelhado por este plano
provides:
  - colunas campanhas.veredito_final (TEXT nullable, enum 3 valores) e campanhas.veredito_decidido_em (INTEGER timestamp nullable)
  - Server Action registrarVeredito (contrato Zod vereditoSchema + gate de não-interferência provado)
  - transição de estado explorando -> veredito_registrado implementada (CAMPANHA-02)
affects: [24-02, 24-03, 24-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migração manual .cjs idempotente com 2 ALTER TABLE separados (SQLite não aceita 2 colunas num único ADD COLUMN)"
    - "Server Action com pré-checagem de existência ATIVA (isNull(deletedAt)) espelhada no WHERE do UPDATE, sem isForeignKeyViolation (nenhuma FK escrita)"
    - "Gate de não-interferência provado por snapshot JSON.stringify de outra tabela/linha antes e depois de uma chamada bem-sucedida"

key-files:
  created:
    - scripts/migrate-veredito.cjs
    - scripts/test-veredito-actions.cjs
  modified:
    - src/db/schema.ts
    - scripts/verify-schema.cjs
    - src/lib/validations.ts
    - src/actions/campanha-actions.ts
    - package.json

key-decisions:
  - "D-24-01: registrarVeredito escreve EXATAMENTE 4 colunas (vereditoFinal, vereditoDecididoEm, estado, updatedAt) de 1 linha de campanhas; veredito_registrado é a ÚNICA transição de estado implementada nesta fase, para qualquer um dos 3 vereditos"
  - "D-24-02: a data da decisão é gravada pelo servidor (sql\`(unixepoch())\`), nunca enviada pelo cliente; re-registrar sobrescreve as duas colunas, sem histórico"
  - "D-24-07: nenhum pacote novo instalado nesta fase"

patterns-established:
  - "campanhaAtivaExists (isNull(deletedAt) na própria checagem) documentado como DIFERENTE de nichoExists/campanhaExists (indiferentes a deletedAt de propósito) — próxima fase que reusar este molde deve escolher conscientemente qual dos dois"

requirements-completed: [VEREDITO-01, VEREDITO-02, VEREDITO-03]

# Metrics
duration: 25min
completed: 2026-09-12
---

# Phase 24 Plan 01: Fundação de Dados do Veredito Summary

**Colunas aditivas `campanhas.veredito_final`/`veredito_decidido_em` migradas contra `data/crm.db` real + Server Action `registrarVeredito` provada por harness a não tocar `leads` nem outras campanhas (VEREDITO-03).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-12T01:36:00Z
- **Completed:** 2026-09-12T01:46:42Z
- **Tasks:** 3/3
- **Files modified:** 6 (2 criados, 4 modificados)

## Accomplishments
- `campanhas.veredito_final` (TEXT nullable, enum `aprofundar`/`mudar_angulo`/`abandonar`) e `campanhas.veredito_decidido_em` (INTEGER timestamp nullable) migradas contra o banco real via `scripts/migrate-veredito.cjs`, rodada 2x (idempotência confirmada: 2ª execução não cria backup novo), 1 campanha + 44 leads intactos.
- `registrarVeredito` exportada em `src/actions/campanha-actions.ts`: valida com `vereditoSchema.safeParse` antes de qualquer acesso ao banco, checa `campanhaAtivaExists`, e escreve um único `UPDATE` com as 4 colunas de D-24-01 — nenhuma outra tabela é tocada.
- Harness `scripts/test-veredito-actions.cjs` com 9 casos / 21 asserções `OK`, incluindo o gate de não-interferência VEREDITO-03 (snapshot byte-a-byte de `leads` e da campanha testemunha antes/depois de uma chamada bem-sucedida) e a prova estrutural de que o harness roda sem a tabela `diagnosticos` existir.

## Task Commits

Each task was committed atomically:

1. **Task 1: Colunas de veredito em campanhas — schema, migração idempotente e gate** - `14555de` (feat)
2. **Task 2: Contrato Zod do veredito e Server Action registrarVeredito** - `91203dc` (feat)
3. **Task 3: Harness comportamental de registrarVeredito e gate de não-interferência** - `ec0224c` (test)

## Files Created/Modified
- `src/db/schema.ts` - colunas `vereditoFinal`/`vereditoDecididoEm` em `campanhas`; doc-comment corrigido (só `veredito_registrado` é escopo da Fase 24)
- `scripts/migrate-veredito.cjs` - migração manual idempotente (2 ALTER TABLE separados), backup + wal_checkpoint, contagem de referência de `campanhas` E `leads`
- `scripts/verify-schema.cjs` - `REQUIRED_CAMPANHAS_COLUMNS` estendido com as 2 colunas novas (conjunto estrito)
- `src/lib/validations.ts` - `VEREDITO_VALORES` + `vereditoSchema` (campanhaId + vereditoFinal, sem data — D-24-02) + tipo `VereditoFinal`
- `src/actions/campanha-actions.ts` - `campanhaAtivaExists` + `registrarVeredito` exportada
- `package.json` - scripts `migrate:veredito` e `test:veredito-actions`

## Decisions Made
- D-24-01, D-24-02 e D-24-07 (já travadas no PLAN.md) seguidas à risca — nenhuma decisão nova precisou ser tomada durante a execução.
- Ajuste no Caso 9 do harness (não documentado como deviation por ser um erro de escrita do teste, corrigido antes do commit): o valor de re-registro precisou ser diferente do valor já vigente (`mudar_angulo` → `abandonar`, não `mudar_angulo` → `mudar_angulo`) para que a asserção "veredito_final mudou" fosse uma prova de fato, não uma coincidência.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- `registrarVeredito` está pronta para ser consumida por UI (planos 24-02/24-03: painel da campanha) e pela leitura client-side do Mapa de Nichos (plano 24-04).
- `revalidatePath("/mapa-de-nichos")` já disparado por `registrarVeredito` antes da rota existir (no-op seguro, mesmo precedente de `/relatorios` na Fase 11-02).
- Nenhum bloqueio conhecido para os planos seguintes desta fase.

## Self-Check: PASSED

Todos os arquivos citados (`scripts/migrate-veredito.cjs`, `scripts/test-veredito-actions.cjs`, `src/db/schema.ts`, `scripts/verify-schema.cjs`, `src/lib/validations.ts`, `src/actions/campanha-actions.ts`, `package.json`) existem em disco. Os 3 hashes de commit (`14555de`, `91203dc`, `ec0224c`) foram confirmados em `git log --oneline --all`.

---
*Phase: 24-veredito-e-mapa-de-nichos*
*Completed: 2026-09-12*
