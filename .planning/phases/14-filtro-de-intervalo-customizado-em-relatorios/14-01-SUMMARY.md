---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
plan: 01
subsystem: api
tags: [next, server-components, date-fns, drizzle, searchparams, relatorios]

# Dependency graph
requires:
  - phase: 11-painel-de-metricas-e-relatorio-de-motivos-de-perda
    provides: "PeriodRange, resolvePeriodRange, as 3 agregações SQL (getContagemPorOrigem/Nicho/MotivoPerda), PeriodoSelector, harness test-relatorios-queries.cjs"
provides:
  - "Função pura resolvePeriodoRelatorios({ period?, from?, to? }, now?) → { preset, range, customInvalido, from?, to? } — nunca lança"
  - "/relatorios aceita ?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD ponta a ponta pela URL (sobrevive a refresh)"
  - "Faixa de aviso server-rendered quando o intervalo custom é rejeitado (fallback 30d)"
  - "Clamp de data futura para hoje (D-06) em vez de rejeitar"
affects: [14-02 (PeriodoSelector modo custom + 2 date pickers consome preset/from/to)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Função pura de resolução de searchParams não-confiável → tipo concreto + flag, nunca lança (extensão do idioma de resolvePeriodRange)"
    - "Distinção customInvalido: true (usuário pediu custom e errou → faixa) vs false (valor adulterado → fallback silencioso)"

key-files:
  created: []
  modified:
    - "src/db/queries.ts - + type PeriodoRelatoriosResolvido, const ISO_DATE_RE, função resolvePeriodoRelatorios; import date-fns ganhou endOfDay/isValid/parseISO"
    - "src/app/relatorios/page.tsx - searchParams lê period+from+to; 1 chamada a resolvePeriodoRelatorios substitui presetNormalizado/resolvePeriodRange; faixa de aviso âmbar condicional; removido PRESETS_VALIDOS"
    - "scripts/test-relatorios-queries.cjs - +12 asserções na PARTE A (import de resolvePeriodoRelatorios + endOfDay/parseISO)"

key-decisions:
  - "Nome final da função: resolvePeriodoRelatorios (função irmã de resolvePeriodRange, não extensão) — resolvePeriodRange fica intacta e é reusada internamente para os presets e o fallback"
  - "Tipo de retorno exportado como PeriodoRelatoriosResolvido: { preset: '30d'|'90d'|'tudo'|'custom'; range: PeriodRange; customInvalido: boolean; from?: string; to?: string }"
  - "Faixa de aviso: <p> com classes amber-* (border-amber-200 bg-amber-50 text-amber-900) — amber disponível (Tailwind v4 default palette intacta, @import 'tailwindcss' sem override de cores; #F59E0B já usado em pipeline-lead-card)"
  - "from/to no retorno são as strings ORIGINAIS não clampadas (só quando preset==='custom' e válido) — o 14-02 pré-preenche o picker; se a data foi clampada, o próximo submit corrige"

patterns-established:
  - "Guarda de data crua da querystring: regex ^\\d{4}-\\d{2}-\\d{2}$ + parseISO + isValid + try/catch antes de virar Date/parâmetro do Drizzle"

requirements-completed: [METRICAS-03]

# Metrics
duration: ~20min
completed: 2026-08-30
---

# Phase 14 Plan 01: Camada de servidor do intervalo customizado em /relatorios Summary

**Função pura `resolvePeriodoRelatorios` transforma `period`/`from`/`to` crus da querystring em `PeriodRange` concreto + flag de rejeição (nunca lança), e `/relatorios` já recalcula as 3 seções para um intervalo arbitrário digitado direto na URL, com faixa de aviso quando as datas são inválidas.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-30
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `resolvePeriodoRelatorios({ period?, from?, to? }, now?)` em `src/db/queries.ts` — função PURA, `now` injetável, **nunca lança**: guarda de formato por regex `^\d{4}-\d{2}-\d{2}$`, `parseISO` + `isValid`, `try/catch` de reforço. Regras na ordem: `period` ausente → `30d`; preset clássico → delega `resolvePeriodRange`; `custom` válido → `[startOfDay(from), endOfDay(to)]`; `custom` inválido → fallback `30d` + `customInvalido: true`; `period` adulterado → fallback silencioso `tudo` sem flag.
- Clamp de data futura (D-06): `from` futuro → `startOfDay(now)`, `to` futuro → `endOfDay(now)`; só cai no fallback se `start > end` após o clamp.
- `/relatorios` troca `presetNormalizado` + `resolvePeriodRange(...)` por **uma** chamada a `resolvePeriodoRelatorios`; passa o `range` resolvido para as 3 agregações — que **não** mudaram de assinatura nem de corpo (T-14-04/T-14-05).
- Faixa de aviso server-rendered (D-07): `<p>` âmbar discreto acima da Seção 1, renderizado só quando `customInvalido === true`, texto *"Intervalo inválido — mostrando os últimos 30 dias."*.
- `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` funciona ponta a ponta pela URL e sobrevive a refresh (é só querystring).
- +12 asserções no harness `test-relatorios-queries.cjs` (38 → 50), cobrindo válido / inválido / clamp de futuro / não-lança.

## Task Commits

1. **Task 1: função pura de resolução do período** - `51807fa` (feat)
2. **Task 2: /relatorios usa a função nova + faixa de aviso** - `8ff0a05` (feat)
3. **Task 3: cobertura da resolução de intervalo no harness** - `8b03070` (test)

## Files Created/Modified

- `src/db/queries.ts` - Novo `type PeriodoRelatoriosResolvido`, `const ISO_DATE_RE`, função `resolvePeriodoRelatorios` logo abaixo de `resolvePeriodRange`; import de `date-fns` ganhou `endOfDay`, `isValid`, `parseISO`. As 3 agregações intactas.
- `src/app/relatorios/page.tsx` - `searchParams: Promise<{ period?; from?; to? }>`; normalização de período delegada 100% à função nova; faixa de aviso âmbar condicional; `<PeriodoSelector value={preset} />` (sem props novas); `PRESETS_VALIDOS` removido (não mais usado).
- `scripts/test-relatorios-queries.cjs` - PARTE A: import de `resolvePeriodoRelatorios` + `endOfDay`/`parseISO`; bloco novo com `now` fixo `2026-08-30T12:00:00Z` e 12 checagens.

## Lista de asserções novas no harness

1. `resolvePeriodoRelatorios({})` → preset `"30d"`, `customInvalido` false
2. `{period:"90d"}` → preset `"90d"`, `range.start` bate `subDays(startOfDay(now),90)`
3. custom válido (`2026-06-01`..`2026-08-30`) → range `[startOfDay(from), endOfDay(to)]`, `customInvalido` false
4. custom válido ecoa `from`/`to` originais no retorno
5. custom `to` antes de `from` → fallback `"30d"`, `customInvalido` true
6. custom sem `to` → fallback `"30d"`, `customInvalido` true
7. custom `from` ilegível (`"nao-e-data"`) → **não lança**
8. custom `from` ilegível → fallback `"30d"`, `customInvalido` true
9. custom `from` impossível (`"2026-13-99"`) → rejeitado por `isValid`, fallback `"30d"`, `customInvalido` true
10. custom `to` no futuro (`"2099-01-01"`) → `range.end` clampado para `endOfDay(now)`, preset `"custom"`, `customInvalido` false
11. `period` adulterado / payload SQLi → **não lança**
12. `period` adulterado → preset `"tudo"`, `customInvalido` false (fallback silencioso, sem faixa)

## Decisions Made

- **Função irmã, não extensão** — `resolvePeriodRange` fica intacta e é chamada internamente por `resolvePeriodoRelatorios` para os presets clássicos e para todos os caminhos de fallback. Mantém a superfície da Fase 11 estável e o novo comportamento isolado.
- **`amber-*` confirmado disponível** — `src/app/globals.css` faz `@import "tailwindcss"` sem `@theme` que sobrescreva a paleta; `zinc-*` já é usado em todo o projeto e `#F59E0B` (amber-500) já aparece em `pipeline-lead-card.tsx`. Classe final da faixa: `rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-[14px] text-amber-900`.
- **`from`/`to` originais no retorno** (não clampados) — o 14-02 pré-preenche os date pickers com eles; se a data tiver sido clampada, o próximo submit do picker corrige.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npm run build` (Turbopack, ~25s compile + ~22s TS, 13 páginas, `/relatorios` presente), `npm run test:relatorios` (50/50), `npm run guard:no-hard-delete` e `npm run verify:schema` todos exit 0. Nenhum processo `node`/`dev` ativo durante o build (host 4GB).

## Threat surface scan

Nenhuma superfície nova fora do `<threat_model>` do plano. `from`/`to` são o único vetor novo e são exatamente T-14-01/T-14-02: guardados por regex + `isValid`, viram `Date` antes de qualquer uso, nunca interpolados em SQL. As 3 agregações não mudaram → `isNull(leads.deletedAt)` intacto (7 ocorrências em `queries.ts`, T-11-21/T-14-04). `getContagemPorMotivoPerda` continua filtrando por `stageChangedAt` (T-14-05).

## Next Phase Readiness

- **14-02 destravado:** `resolvePeriodoRelatorios` exporta `preset` (para o `value` do `<Select>`), `from`/`to` validados/clampados (para pré-preencher os 2 date pickers) e `customInvalido`. O 14-02 só precisa adicionar o gesto no `PeriodoSelector` (4ª opção "Intervalo personalizado" + `Popover`/`Calendar` + navegação automática quando as 2 datas estão preenchidas) e threadar `from`/`to` como props novas da página para o componente.
- Sem migração, sem schema, sem Server Action nova — inalterado.

## Self-Check: PASSED

- Arquivos criados/modificados: todos presentes (`queries.ts`, `page.tsx`, `test-relatorios-queries.cjs`, `14-01-SUMMARY.md`)
- Commits verificados no git log: `51807fa`, `8ff0a05`, `8b03070`, `8bf2877`, `850a1aa`
- Gates: `npm run build` exit 0 (`/relatorios` presente) · `npm run test:relatorios` exit 0 (50/50) · `npm run guard:no-hard-delete` exit 0 · `npm run verify:schema` exit 0
- `grep resolvePeriodoRelatorios` presente em `page.tsx` e `queries.ts`; `isNull(leads.deletedAt)` = 7 ocorrências (≥3, T-11-21 intacto)

---
*Phase: 14-filtro-de-intervalo-customizado-em-relatorios*
*Completed: 2026-08-30*
