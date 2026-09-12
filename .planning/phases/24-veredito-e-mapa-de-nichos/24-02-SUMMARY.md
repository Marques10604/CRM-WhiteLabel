---
phase: 24-veredito-e-mapa-de-nichos
plan: 02
subsystem: database
tags: [drizzle, sqlite, zod, relatorios, campanhas, diagnostico]

# Dependency graph
requires:
  - phase: 24-01
    provides: colunas campanhas.veredito_final/veredito_decidido_em, vereditoSchema, registrarVeredito
  - phase: 23-02
    provides: tabela diagnosticos (append-only, payload JSON, status ok/falhou)
  - phase: 22-01
    provides: tabela campanhas, leads.campanhaId
provides:
  - getResultadoPorCampanha(campanhaId?) — Map<campanhaId, {total, fechados, perdidos, ticketMedioCentavos}>
  - getVereditoIAPorCampanha(campanhaId?) — Map<campanhaId, decisao> da geração OK mais recente, revalidada via Zod
  - getContagemPorMotivoPerda com 2º parâmetro opcional campanhaId (reaproveitada, não duplicada)
  - formatarTaxaConversao exportado de @/lib/utils (único formatador de taxa do projeto)
affects: [24-03, 24-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agregação por campanha via .groupBy(leads.campanhaId) com WHERE condicional (and() descarta undefined) — mesmo SQL serve para 'uma campanha' e 'todas'"
    - "avg(case when stage='fechado' then valor end) SEM else — SQLite ignora NULL no avg, zero fechados vira NULL (nunca 0)"
    - "Leitura de payload JSON sempre revalidada com o mesmo Zod schema usado na escrita (fronteira de confiança do banco)"

key-files:
  created: []
  modified:
    - src/db/queries.ts
    - src/lib/utils.ts
    - src/app/relatorios/page.tsx
    - scripts/test-relatorios-queries.cjs

key-decisions:
  - "D-24-04: ticket médio da campanha = média de valorEstimado só dos leads fechado (ticket REALIZADO); zero fechados = null, nunca 0"
  - "D-24-07: resultado real da campanha considera TODOS os leads vinculados, sem filtro de período (vínculo é gesto explícito do operador)"
  - "D-24-08: veredito de IA exibido é o da geração status=ok MAIS RECENTE, sempre revalidado com diagnosticoSchema.safeParse; payload inválido = ausência silenciosa no Map"
  - "D-24-09: getContagemPorMotivoPerda ganha campanhaId opcional em vez de função irmã — /relatorios continua chamando com 1 argumento"

patterns-established:
  - "Pattern: leitura por campanha sempre com parâmetro opcional + and() condicional, nunca uma segunda função duplicada"

requirements-completed: [PAINEL-01, PAINEL-02]

# Metrics
duration: ~30min
completed: 2026-09-12
---

# Phase 24 Plan 02: Camada de leitura do resultado real e veredito de IA por campanha Summary

**Três novas funções de leitura em `queries.ts` (resultado real agregado por campanha, veredito de IA da geração mais recente, motivos de perda filtráveis por campanha) mais um formatador de taxa compartilhado, cobertos por 14 novas asserções contra SQLite temporário — zero duplicação de lógica com `/relatorios`.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-12T02:07:13Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `getResultadoPorCampanha(campanhaId?)` — agregação SQL única (`count`/`sum(case)`/`avg(case)`) que serve tanto uma campanha quanto todas, com ticket médio REALIZADO (D-24-04) e leads da Lixeira sempre excluídos (T-24-08).
- `getVereditoIAPorCampanha(campanhaId?)` — veredito sugerido pela IA da geração `status='ok'` MAIS RECENTE por campanha, sempre revalidado com `diagnosticoSchema.safeParse` antes de entrar no Map (T-24-06); payload de schema antigo/inválido simplesmente não aparece, nunca lança.
- `getContagemPorMotivoPerda` ganhou o parâmetro opcional `campanhaId` (D-24-09) em vez de virar uma segunda função — `/relatorios` continua chamando com 1 argumento só, comportamento intocado.
- `formatarTaxaConversao` centralizado em `src/lib/utils.ts`, consumido por `/relatorios` (helper local `formatarTaxa` removido) — pronto para os planos 24-03/24-04 reusarem sem duplicar.
- Harness `test:relatorios` estendido com PARTE C: 2 campanhas, leads distribuídos (fechados/perdido/novo/soft-deletado/sem-campanha) e 4 gerações de diagnóstico (ok antiga, ok mais recente, falha mais recente, ok com payload inválido) — 14 asserções novas, 71 no total (antes 57).

## Task Commits

Each task was committed atomically:

1. **Task 1: Agregações de resultado real e veredito de IA por campanha** - `a2834f6` (feat)
2. **Task 2: Formatador de taxa compartilhado** - `8cce4ba` (refactor)
3. **Task 3: Cobertura automatizada das agregações por campanha** - `88422eb` (test)

**Plan metadata:** commit deste SUMMARY (docs)

## Files Created/Modified

- `src/db/queries.ts` — `ResultadoCampanha`, `getResultadoPorCampanha`, `getVereditoIAPorCampanha`, `getContagemPorMotivoPerda(range, campanhaId?)`
- `src/lib/utils.ts` — `formatarTaxaConversao` exportado
- `src/app/relatorios/page.tsx` — importa `formatarTaxaConversao` de `@/lib/utils`, helper local removido
- `scripts/test-relatorios-queries.cjs` — `SCHEMA_DDL` com `leads.campanha_id` + tabelas `campanhas`/`diagnosticos`; PARTE C com 14 casos

## Decisions Made

Nenhuma decisão nova além das já registradas no PLAN.md (D-24-04, D-24-07, D-24-08, D-24-09) — todas seguidas exatamente como especificado.

## Deviations from Plan

None - plan executado exatamente como escrito. Os únicos ajustes foram de redação em 2 doc-comments (Task 1) para não colidir com os `grep -c` das próprias acceptance criteria — não são desvios de comportamento, só evitam que a citação textual do padrão dentro do comentário se auto-conte no grep:

- `groupBy(leads.campanhaId)` citado em prosa reescrito para não repetir a string exata da chamada real (grep tinha que dar 1, não 2).
- `diagnosticoSchema.safeParse(payload)` citado em prosa reescrito pelo mesmo motivo.

## Issues Encountered

- Teste de mutação obrigatório da Task 3 executado manualmente: troquei `avg(case when stage = 'fechado' then valor_estimado_centavos end)` por `avg(valor_estimado_centavos)` em `queries.ts`, rodei `npm run test:relatorios` (2 falhas, exit 1 — casos 2 e 3 do PAINEL-01/D-24-04 quebraram como esperado), revertei a mutação e reconfirmei exit 0 com as 71 checagens passando. `git diff` confirmou que `queries.ts` voltou ao estado exatamente commitado na Task 1.
- Acceptance criteria da Task 3 pede `grep -c "data/crm.db" scripts/test-relatorios-queries.cjs` === 0 "fora de comentários"; o grep literal retorna 1 (linha 15, doc-comment pré-existente da Fase 14: "NUNCA toca ./data/crm.db"). Confirmado via `git show HEAD~2` que essa linha já existia antes deste plano (commit `7a33620`, Fase 14) — não é uma referência de código nova, é a garantia documentada de que o harness usa banco temporário. Não bloqueante; documentado aqui para rastreabilidade.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Camada de leitura pronta para os planos 24-03 (painel da campanha) e 24-04 (Mapa de Nichos) consumirem diretamente: `getResultadoPorCampanha`, `getVereditoIAPorCampanha` e `getContagemPorMotivoPerda(range, campanhaId)` já retornam os shapes exatos que as duas telas precisam, e `formatarTaxaConversao` já está em `@/lib/utils` para ambas importarem sem duplicar.
- Nenhum bloqueio conhecido.

---
*Phase: 24-veredito-e-mapa-de-nichos*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: `.planning/phases/24-veredito-e-mapa-de-nichos/24-02-SUMMARY.md`
- FOUND: commit `a2834f6` (Task 1)
- FOUND: commit `8cce4ba` (Task 2)
- FOUND: commit `88422eb` (Task 3)
