---
phase: 24-veredito-e-mapa-de-nichos
plan: 04
subsystem: ui
tags: [server-components, client-components, next-router, campanha, veredito, mapa-de-nichos]

# Dependency graph
requires:
  - phase: 24-01
    provides: colunas campanhas.vereditoFinal/vereditoDecididoEm
  - phase: 24-02
    provides: getResultadoPorCampanha, getVereditoIAPorCampanha, computeTaxaConversao, formatarTaxaConversao
  - phase: 23 (veredito-sugerido-chip)
    provides: VereditoSugeridoChip (rótulos canônicos aprofundar/mudar_angulo/abandonar)
provides:
  - MapaDeNichosTable (src/components/mapa-de-nichos-table.tsx) — tabela client com filtro por veredito/nicho e 4 ordenações (PAINEL-03)
  - /mapa-de-nichos (src/app/mapa-de-nichos/page.tsx) — visão consolidada de todas as campanhas (PAINEL-02)
  - Item de navegação "Mapa de Nichos" na barra lateral
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filtro/ordenação 100% client-side via useState + useMemo sobre array recebido por prop — sem querystring, sem @tanstack/react-table, sem paginação (D-24-06)"
    - "Página consolidadora sem searchParams: 1 Promise.all com 4 leituras (campanhas ativas, nichos, getResultadoPorCampanha() e getVereditoIAPorCampanha() SEM argumento) — zero N+1"

key-files:
  created:
    - src/components/mapa-de-nichos-table.tsx
    - src/app/mapa-de-nichos/page.tsx
  modified:
    - src/components/app-sidebar.tsx

key-decisions:
  - "D-24-06, D-24-11, D-24-05, D-24-07 (já travadas no PLAN.md) seguidas à risca — nenhuma decisão nova precisou ser tomada durante a execução."

requirements-completed: [PAINEL-02, PAINEL-03]

# Metrics
duration: ~15min
completed: 2026-09-12
---

# Phase 24 Plan 04: Mapa de Nichos Summary

**Tela `/mapa-de-nichos` consolidando todas as campanhas — nicho, veredito da IA, veredito final do usuário e resultado real — com filtro (incluindo "sem veredito") e 4 ordenações inteiramente client-side, zero N+1 no servidor.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-12T02:32:24Z
- **Tasks:** 2/2
- **Files modified:** 3 (2 criados, 1 modificado)

## Accomplishments

- `MapaDeNichosTable` (Client Component): tipo `MapaLinha` exportado como o contrato consumido por `page.tsx`; filtro por veredito final (`todos`/`aprofundar`/`mudar_angulo`/`abandonar`/`sem_veredito`, D-24-11) e por nicho (opções derivadas das próprias linhas, nunca hardcoded); 4 ordenações (`nicho`/`veredito`/`leads`/`taxa`) num único `useMemo`, sempre ordenando uma cópia (`[...]`) do array recebido por prop, nunca `linhas.sort()` in-place (D-24-06).
- Tabela com 8 colunas (Nicho+oferta linkado para `/campanhas/{id}`, Estado, Veredito da IA, Veredito final + data, Leads, Fechados, Conversão, Ticket médio), reusando `CampanhaEstadoBadge` e `VereditoSugeridoChip` sem componente novo (D-24-05); dois estados vazios distintos (nenhuma campanha vs. filtro sem resultado).
- `/mapa-de-nichos` (Server Component): 1 único `Promise.all` com campanhas ativas (`isNull(deletedAt)`), todos os nichos (mapa id→nome, sem filtro de `deletedAt`), `getResultadoPorCampanha()` e `getVereditoIAPorCampanha()` — as duas últimas SEM argumento, trazendo o mapa inteiro numa consulta só; `taxa` calculada no servidor via `computeTaxaConversao`, o client só formata.
- Item "Mapa de Nichos" (ícone `Map` de `lucide-react`, importado como `MapIcon` para não colidir com o tipo global `Map`) adicionado imediatamente após "Campanhas" na barra lateral.
- `npm run build` sobe de 14 para **15 rotas** — `/mapa-de-nichos` presente na listagem, confirmando a nova rota compilada.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tabela client do Mapa de Nichos com filtros e ordenação** - `7e3db3e` (feat)
2. **Task 2: Rota /mapa-de-nichos e item de navegação** - `6ea6107` (feat)

**Plan metadata:** commit deste SUMMARY (docs)

## Files Created/Modified

- `src/components/mapa-de-nichos-table.tsx` - tabela client com filtro/ordenação e 2 estados vazios
- `src/app/mapa-de-nichos/page.tsx` - Server Component que monta `MapaLinha[]` a partir de `queries.ts`
- `src/components/app-sidebar.tsx` - item de navegação `/mapa-de-nichos`

## Decisions Made

Nenhuma decisão nova além das já travadas no PLAN.md (D-24-05, D-24-06, D-24-07, D-24-11) — todas seguidas exatamente como especificado.

## Deviations from Plan

### Notas de acceptance criteria (não-bloqueantes)

- **Task 2**: as acceptance criteria `grep -c "getResultadoPorCampanha()"` e `grep -c "getVereditoIAPorCampanha()"` esperavam `1`, mas retornam `2` cada — o import nomeado (`import { getResultadoPorCampanha, ... }`) e a chamada real dentro do `Promise.all` casam os dois com o mesmo grep literal. Mesmo padrão já documentado como não-bloqueante no SUMMARY do plano 24-03 (linha idêntica com `VereditoSugeridoChip`). O intuito real do critério — cada função chamada exatamente 1 vez, sem argumento, fora de qualquer `.map()`/loop — está satisfeito; confirmado por leitura direta do código (linhas 31-32 de `page.tsx`).
- Os demais greps de Task 2 (`await` → 1, `mapa-de-nichos` no sidebar → 1, `searchParams` → 0) bateram exatamente com o esperado após reescrever 2 trechos de doc-comment que citavam as palavras "await"/"searchParams" em prosa (mesmo cuidado já usado no plano 24-02) — evita que a citação textual do padrão dentro do comentário se auto-conte no grep, sem mudança de comportamento.

Nenhum desvio de comportamento — plano executado exatamente como escrito.

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Human Verification Pending (end-of-phase, per workflow.human_verify_mode)

O bloco `<human-check>` da Task 2 (clicar em "Mapa de Nichos" na sidebar claro/escuro, conferir nicho/resumo batendo com `/campanhas/{id}`, filtrar por "Sem veredito" e por nicho específico, trocar "Ordenar por", clicar numa linha e cair no detalhe certo) não foi executado nesta sessão — mesmo precedente das Fases 18/19/21/23/24-03 (host de 4GB não roda `dev` + Chrome + sessão do agente ao mesmo tempo; `human_verify_mode` do projeto é `end-of-phase`, não por plano). Verificação nesta sessão foi por code+data: `tsc`, `lint`, `verify:brand`, `verify:theme` e `build` (15 rotas, `/mapa-de-nichos` nova) todos verdes; leitura de código confirma o fluxo de dados ponta a ponta (`getResultadoPorCampanha()`/`getVereditoIAPorCampanha()` sem argumento → `MapaLinha[]` → `MapaDeNichosTable` filtra/ordena em memória → `Link` para `/campanhas/{id}`).

## Next Phase Readiness

- Fase 24 (Veredito e Mapa de Nichos) tem seus 4 planos completos: 24-01 (fundação de dados), 24-02 (camada de leitura), 24-03 (painel + veredito na página da campanha), 24-04 (Mapa de Nichos). Nenhuma dependência pendente entre eles.
- Próximo passo é de nível de fase: rodar os gates pós-execução (`gsd-code-review`, regression/schema-drift, `gsd-verifier`) e a passada visual humana de fim de fase (Fase 23 + Fase 24, ambas com verificação puramente visual diferida).
- Nenhum bloqueio conhecido para o fechamento do milestone v1.7.

## Self-Check: PASSED

- FOUND: `src/components/mapa-de-nichos-table.tsx`
- FOUND: `src/app/mapa-de-nichos/page.tsx`
- FOUND: `src/components/app-sidebar.tsx` (modificado)
- FOUND: commit `7e3db3e` (Task 1)
- FOUND: commit `6ea6107` (Task 2)

---
*Phase: 24-veredito-e-mapa-de-nichos*
*Completed: 2026-09-12*
