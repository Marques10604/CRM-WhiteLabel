---
phase: 24-veredito-e-mapa-de-nichos
plan: 03
subsystem: ui
tags: [server-components, client-components, server-actions, campanha, veredito, painel]

# Dependency graph
requires:
  - phase: 24-01
    provides: colunas campanhas.vereditoFinal/vereditoDecididoEm, vereditoSchema, registrarVeredito
  - phase: 24-02
    provides: getResultadoPorCampanha, getVereditoIAPorCampanha, getContagemPorMotivoPerda(range, campanhaId?), formatarTaxaConversao
provides:
  - ResultadoCampanhaPainel (src/components/resultado-campanha-painel.tsx) — painel de resultado real da campanha (PAINEL-01)
  - VereditoForm (src/app/campanhas/[id]/_components/veredito-form.tsx) — formulário client de registro do veredito
  - VereditoSecao (src/components/veredito-secao.tsx) — sugestão da IA + decisão do usuário lado a lado
  - /campanhas/[id] estendida com as 3 seções na ordem D-24-10
affects: [24-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Painel de campanha Server Component: Promise.all de getResultadoPorCampanha + getContagemPorMotivoPerda(resolvePeriodRange(undefined), campanhaId) — mesmo idioma de agregação de /relatorios, sem filtro de período"
    - "VereditoForm: Select controlado (useState) nunca pré-preenchido pela sugestão da IA (D-24-03) — só o veredito JÁ registrado do usuário"
    - "VereditoSugeridoChip reusado para os 2 vereditos (IA e usuário) — rótulo do container distingue, sem componente novo (D-24-05)"

key-files:
  created:
    - src/components/resultado-campanha-painel.tsx
    - src/app/campanhas/[id]/_components/veredito-form.tsx
    - src/components/veredito-secao.tsx
  modified:
    - src/app/campanhas/[id]/page.tsx

key-decisions:
  - "D-24-03, D-24-05, D-24-07, D-24-10 (já travadas no PLAN.md) seguidas à risca — nenhuma decisão nova precisou ser tomada durante a execução."

requirements-completed: [VEREDITO-01, VEREDITO-02, PAINEL-01]

# Metrics
duration: ~20min
completed: 2026-09-12
---

# Phase 24 Plan 03: Painel de Resultado Real e Veredito na Página da Campanha Summary

**As duas seções que fecham o loop da campanha em `/campanhas/[id]` — painel de resultado real agregado (PAINEL-01) e veredito do operador lado a lado com a sugestão da IA (VEREDITO-01/02) — consumindo só as funções de `@/db/queries` e a Server Action já provadas nos planos 24-01/24-02.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-12T02:23:29Z
- **Tasks:** 3/3
- **Files modified:** 4 (3 criados, 1 modificado)

## Accomplishments

- `ResultadoCampanhaPainel` (Server Component): agrega `getResultadoPorCampanha` + `getContagemPorMotivoPerda(resolvePeriodRange(undefined), campanhaId)` num único `Promise.all`; estado vazio explicativo quando a campanha não tem lead vinculado (nunca tabela em branco); fallback "—" + legenda quando `ticketMedioCentavos` é `null` (nunca "R$ 0,00").
- `VereditoForm` (Client Component): `useActionState` sobre `registrarVeredito`, molde exato de `GerarDiagnosticoButton` (`startTransition` + toast sonner). O `Select` nasce vazio (placeholder "Escolha o veredito") ou com o veredito JÁ registrado do usuário — nunca recebe nem pré-seleciona a sugestão da IA (D-24-03), decisão reforçada pela dívida técnica de variância de veredito entre execuções idênticas (STATE.md).
- `VereditoSecao` (Server Component): busca `getVereditoIAPorCampanha`, mostra "Sugestão da IA (não vinculante)" e "Sua decisão" lado a lado reusando `VereditoSugeridoChip` para os dois vereditos (D-24-05, sem componente novo); linha de apoio em tom neutro quando os dois vereditos existem e divergem, tratando a divergência como esperada, não como erro.
- `/campanhas/[id]` estendida na ordem narrativa de D-24-10: dados da campanha → `ResultadoCampanhaPainel` → `DiagnosticoSecao` (intacta) → `VereditoSecao`. Guards de `id`/`notFound()`/`maxDuration` das Fases 22/23 preservados sem alteração de comportamento.

## Task Commits

Each task was committed atomically:

1. **Task 1: Painel de resultado real da campanha** - `9df7006` (feat)
2. **Task 2: Formulário client de registro do veredito** - `03ece90` (feat)
3. **Task 3: Seção de veredito e fiação das duas seções na página da campanha** - `f6b8c89` (feat)

## Files Created/Modified

- `src/components/resultado-campanha-painel.tsx` - painel de resultado real (métricas + tabela de motivos de perda + estados vazio/fallback)
- `src/app/campanhas/[id]/_components/veredito-form.tsx` - formulário client controlado de registro do veredito
- `src/components/veredito-secao.tsx` - seção de veredito (IA + usuário lado a lado + divergência + formulário)
- `src/app/campanhas/[id]/page.tsx` - importa e renderiza as 2 seções novas na ordem D-24-10; doc-comment atualizado

## Decisions Made

Nenhuma decisão nova além das já travadas no PLAN.md (D-24-03, D-24-05, D-24-07, D-24-10) — todas seguidas exatamente como especificado.

## Deviations from Plan

### Notas de acceptance criteria (não-bloqueantes)

- **Task 1**: a acceptance criterion `grep -c "getResultadoPorCampanha\|getContagemPorMotivoPerda" ... retorna 2` na prática retorna 4, porque cada nome aparece em 2 linhas (import multi-linha + chamada dentro do `Promise.all`), no mesmo estilo de formatação multi-linha já usado em `/relatorios/page.tsx`. O intuito real do critério — nenhuma query SQL escrita direto no componente — está satisfeito (0 ocorrências de SQL cru); o número exato de linhas casadas pelo grep é uma estimativa do plano que não previu o import multi-linha.
- **Task 3**: a acceptance criterion `grep -c "VereditoSugeridoChip" src/components/veredito-secao.tsx retorna >= 2` retorna 4 (import + 2 usos JSX + comentário de doc mencionando o componente) — consistente com "o mesmo chip serve aos dois vereditos", sem componente novo, que é o que o critério verifica de fato.

Nenhum desvio de comportamento — plano executado exatamente como escrito.

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Human Verification Pending (end-of-phase, per workflow.human_verify_mode)

O bloco `<human-check>` da Task 3 (fluxo visual: métricas batendo com `/leads` filtrados, registrar "Abandonar" com toast + chip + data, recarregar e conferir persistência, linha de divergência sem parecer erro, estado vazio de campanha nova, claro E escuro) não foi executado nesta sessão — segue o mesmo precedente das Fases 18/19/21/23 (host de 4GB não roda `dev` + Chrome + sessão do agente ao mesmo tempo; `human_verify_mode` do projeto é `end-of-phase`, não por plano). Verificação nesta sessão foi por code+data: `tsc`, `lint`, `verify:brand`, `verify:theme` e `build` (14 rotas, nenhuma nova) todos verdes; leitura de código confirma o fluxo de dados ponta a ponta (`registrarVeredito` grava `vereditoFinal`/`vereditoDecididoEm`/`estado`, `page.tsx` os lê de volta e repassa para `VereditoSecao`/`VereditoForm`).

## Next Phase Readiness

- `/campanhas/[id]` agora expõe as 3 capacidades do milestone que faltavam nesta tela: resultado real, diagnóstico de IA e veredito — sem retrabalhar nenhuma das seções já existentes.
- Plano 24-04 (Mapa de Nichos) pode seguir em paralelo/depois: zero sobreposição de arquivos com este plano, e já pode reusar `getResultadoPorCampanha`/`getVereditoIAPorCampanha`/`formatarTaxaConversao` do plano 24-02 e `VereditoSugeridoChip` da Fase 23 do mesmo jeito que este plano fez.
- Nenhum bloqueio conhecido.

## Self-Check: PASSED

- FOUND: `src/components/resultado-campanha-painel.tsx`
- FOUND: `src/app/campanhas/[id]/_components/veredito-form.tsx`
- FOUND: `src/components/veredito-secao.tsx`
- FOUND: `src/app/campanhas/[id]/page.tsx` (modificado)
- FOUND: commit `9df7006` (Task 1)
- FOUND: commit `03ece90` (Task 2)
- FOUND: commit `f6b8c89` (Task 3)

---
*Phase: 24-veredito-e-mapa-de-nichos*
*Completed: 2026-09-12*
