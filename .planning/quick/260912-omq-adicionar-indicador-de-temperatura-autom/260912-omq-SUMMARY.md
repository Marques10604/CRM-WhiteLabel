---
phase: quick-260912-omq
plan: 01
subsystem: ui
tags: [date-fns, lucide-react, drizzle, pipeline, leads, temperatura]

# Dependency graph
requires:
  - phase: quick-260807-uit / 07-configuracao-de-dias-parado-por-etapa
    provides: configuracoes.diasParadoNovo/Contatado/Negociacao + getConfiguracoes()
provides:
  - "src/lib/lead-temperatura.ts: classificação pura de temperatura em 3 faixas (Temperatura, buildLimitesPorEtapa, computeTemperatura, computeTemperaturaPorLead)"
  - "src/components/temperatura-indicator.tsx: componente visual único (ícone + cor --status-*) reusado por /leads e /pipeline"
  - "/pipeline e /leads exibindo a mesma temperatura calculada no servidor"
affects: [pipeline, leads, relatorios]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Função pura + harness .cjs no molde de lead-csv-export.ts/test-lead-csv-export.cjs (zero DOM, tipo Stage espelhado localmente para não quebrar o loader .cjs)"
    - "Componente de apresentação puro (sem 'use client') com Record<Temperatura,...> separados para rótulo/cor/ícone, mesmo idioma de STAGE_LABEL/STAGE_TOKEN em etapa-badge.tsx"

key-files:
  created:
    - src/lib/lead-temperatura.ts
    - scripts/test-lead-temperatura.cjs
    - src/components/temperatura-indicator.tsx
  modified:
    - package.json
    - src/app/pipeline/page.tsx
    - src/components/pipeline-board.tsx
    - src/components/pipeline-lead-card.tsx
    - src/app/leads/page.tsx
    - src/components/lead-table.tsx

key-decisions:
  - "Borda de 2px do card em 'frio' migrou de status-warning para status-danger, para casar com a cor do TemperaturaIndicator na faixa fria (mudança deliberada de tom, mesmo comportamento estrutural)"
  - "Doc-comment de lead-temperatura.ts reescrito para não citar o identificador literal 'esfriandoLeadIds' (o gate `grep -c esfriandoLeadIds|isEsfriando` da Task 2 não distingue comentário de código)"

patterns-established:
  - "Temperatura é sempre calculada NO SERVIDOR (Server Component) a partir da mesma função pura + mesma config, nunca no cliente, para /leads e /pipeline nunca divergirem e para não haver mismatch de hidratação por causa do relógio do cliente"

requirements-completed: [TEMP-01, TEMP-02, TEMP-03]

# Metrics
duration: 35min
completed: 2026-09-12
---

# Quick Task 260912-omq: Indicador de Temperatura Automático Summary

**Sinal booleano "esfriando" (só existia no /pipeline) virou classificação de 3 faixas (Quente/Morno/Frio), consumida por um único componente visual (`TemperaturaIndicator`) e exibida em `/pipeline` E `/leads` a partir da mesma função pura `computeTemperaturaPorLead`.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-12T21:01:22Z
- **Tasks:** 3/3 completas
- **Files modified:** 8 (3 criados, 5 modificados)

## Accomplishments
- Módulo puro `src/lib/lead-temperatura.ts` (zero DOM/React/`@/db`) com harness `.cjs` cobrindo fronteiras 0/40/50/90/100%, as 3 exclusões (`fechado`, `perdido`, `stageChangedAt` nulo), bordas (futuro, limite=1) e loop de paridade N=0..15 contra a fórmula booleana antiga — provado por teste de mutação (troca `>=`→`>` derruba 4 asserções, revertido em seguida)
- `TemperaturaIndicator`: fonte única de ícone (Flame/Thermometer/Snowflake)/cor (`--status-success/warning/danger`)/rótulo das 3 faixas, com versão `compact` (só ícone + `title`/`aria-label`) para colunas estreitas
- `/pipeline`: board substitui o booleano `esfriandoLeadIds` pela escala de 3 faixas; borda de 2px do card na faixa "frio" (era "Esfriando" âmbar)
- `/leads`: MESMO cálculo server-side (mesma função + mesma config de `/pipeline`) exibido como ícone compacto ao lado do `EtapaBadge`

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Função pura de temperatura em 3 faixas + harness .cjs** - `e33a4d3` (feat)
2. **Task 2: Componente TemperaturaIndicator + upgrade do /pipeline (boolean -> 3 faixas)** - `39f55ec` (feat)
3. **Task 3: Indicador na lista /leads (mesma função, versão compacta)** - `85f9765` (feat)

**Plan metadata:** commit de docs feito pelo orquestrador após este SUMMARY.

## Files Created/Modified
- `src/lib/lead-temperatura.ts` - Classificação pura de temperatura (Temperatura, LIMIAR_MORNO, buildLimitesPorEtapa, computeTemperatura, computeTemperaturaPorLead)
- `scripts/test-lead-temperatura.cjs` - Harness `.cjs` com 22 asserções (fronteiras, exclusões, bordas, paridade)
- `src/components/temperatura-indicator.tsx` - Componente visual único (ícone + cor + rótulo), versão compact e não-compact
- `package.json` - Registra `test:lead-temperatura`
- `src/app/pipeline/page.tsx` - Substitui `limitesPorEtapa`/`esfriandoLeadIds` inline por `computeTemperaturaPorLead(activeLeads, buildLimitesPorEtapa(config))`
- `src/components/pipeline-board.tsx` - Prop `esfriandoLeadIds: number[]` → `temperaturaPorLead: {leadId, temperatura}[]`, mapa `temperaturaPorLeadId`
- `src/components/pipeline-lead-card.tsx` - Prop `isEsfriando: boolean` → `temperatura?: Temperatura`; borda 2px em "frio"; renderiza `<TemperaturaIndicator>` no lugar do bloco `Clock`/"Esfriando"
- `src/app/leads/page.tsx` - Adiciona `getConfiguracoes()` ao `Promise.all` + `computeTemperaturaPorLead` passado ao `LeadTable`
- `src/components/lead-table.tsx` - Prop `temperaturaPorLead`, mapa `temperaturaPorLeadId`, célula de etapa renderiza `<TemperaturaIndicator compact>` ao lado do `EtapaBadge`

## Decisions Made
- A borda de 2px do card do pipeline na faixa "frio" mudou de `border-status-warning-foreground` para `border-status-danger-foreground`, para acompanhar a cor vermelha do ícone/rótulo "Frio" — mudança de tom deliberada e documentada no plano (o comportamento estrutural — borda de 2px só na faixa antes chamada "Esfriando" — permanece idêntico)
- `Stage` é declarado como união literal local em `lead-temperatura.ts` (não importado de `etapa-badge.tsx`), mesmo padrão já usado em `lead-csv-export.ts`, porque importar de um `.tsx` quebraria o harness `.cjs`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Doc-comment de `lead-temperatura.ts` referenciava o identificador literal antigo `esfriandoLeadIds`, quebrando o gate automatizado da Task 2**
- **Found during:** Task 2 (verificação `grep -c "esfriandoLeadIds\|isEsfriando" src/`)
- **Issue:** O gate da Task 2 exige zero ocorrências (código OU comentário) de `esfriandoLeadIds`/`isEsfriando` em `src/`. O doc-comment de `computeTemperatura` (escrito na Task 1) citava `esfriandoLeadIds` para explicar a paridade com o comportamento antigo, e o `grep` do gate só filtra linhas `//`, não bloco JSDoc `*`.
- **Fix:** Reescrita do doc-comment para descrever a paridade sem citar o identificador literal ("conjunto booleano de leads 'esfriando' do `/pipeline`" em vez de `` `esfriandoLeadIds` ``).
- **Files modified:** `src/lib/lead-temperatura.ts`
- **Verification:** `grep -rn "esfriandoLeadIds|isEsfriando" src/` → nenhuma ocorrência; `npm run test:lead-temperatura` continuou exit 0.
- **Committed in:** `39f55ec` (parte do commit da Task 2, já que o arquivo tocado pertence à Task 1 mas o gate que falhou é da Task 2)

---

**Total deviations:** 1 auto-fixed (1 bug/gate compliance)
**Impact on plan:** Correção cosmética em doc-comment, zero mudança de comportamento/lógica. Sem scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/pipeline` e `/leads` mostram a mesma temperatura, calculada no servidor pela mesma função pura — nenhuma dívida nova aberta
- Zero coluna nova, zero migração, zero dependência nova, zero Server Action nova (100% leitura + apresentação, conforme threat model T-omq-04)
- UAT visual (não-bloqueante) descrito no PLAN.md ainda não executado — dark mode + drag-and-drop + fluxo completo de `/configuracoes` → `/pipeline` → `/leads`

## Self-Check: PASSED

Arquivos criados confirmados em disco:
- FOUND: src/lib/lead-temperatura.ts
- FOUND: scripts/test-lead-temperatura.cjs
- FOUND: src/components/temperatura-indicator.tsx

Commits confirmados em `git log --oneline --all`:
- FOUND: e33a4d3
- FOUND: 39f55ec
- FOUND: 85f9765

---
*Phase: quick-260912-omq*
*Completed: 2026-09-12*
