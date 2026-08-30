---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
plan: 02
subsystem: ui
tags: [next, client-component, date-fns, react-day-picker, popover, searchparams, relatorios]

# Dependency graph
requires:
  - phase: 14-01
    provides: "resolvePeriodoRelatorios → { preset, range, customInvalido, from?, to? }; from/to são strings yyyy-MM-dd já validadas/clampadas quando preset === 'custom'"
  - phase: 11-painel-de-metricas-e-relatorio-de-motivos-de-perda
    provides: "PeriodoSelector base (só o gesto, router.push com scroll:false), tela /relatorios, padrão ACCENT_FOCUS_RING"
provides:
  - "PeriodoSelector com 4ª opção 'Intervalo personalizado' (value='custom') no <Select>"
  - "2 date pickers condicionais (Popover + Calendar mode='single') — só aparecem no modo custom, visual copiado 1:1 de lead-table-toolbar.tsx"
  - "Navegação automática para ?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD quando as 2 datas estão preenchidas; escolher preset remove from/to (D-03)"
  - "Intervalo custom sobrevive a refresh: <Select> mostra 'Intervalo personalizado' e os 2 campos vêm pré-preenchidos da URL (D-16)"
affects: [15-campo-interesse-servico-desejado]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client component 'só o gesto' que também gerencia estado local de UI (modo + 2 datas) mas continua sem resolver range / sem decidir default / sem decidir fallback — tudo isso mora no servidor (D-17)"
    - "Closure de 'os 2 campos preenchidos': computar const prox = date ?? estadoAtual antes de checar os dois locais (mesmo idioma de applyDateRange em lead-table-toolbar.tsx), porque setState não atualiza a variável no mesmo tick"

key-files:
  created: []
  modified:
    - "src/components/periodo-selector.tsx - reescrito: props from?/to?, OPCOES ganha { value: 'custom', label: 'Intervalo personalizado' }, estado customMode/dataInicio/dataFim/inicioPopoverOpen/fimPopoverOpen, handlers navegarPreset/navegarCustom/handleSelectChange/handleInicioChange/handleFimChange, 2 blocos Popover+Calendar condicionais"
    - "src/app/relatorios/page.tsx - desestrutura from/to de resolvePeriodoRelatorios; <PeriodoSelector value={preset} from={from} to={to} />"

key-decisions:
  - "parseDataInicial(iso): helper local que faz parseISO + isValid e normaliza Invalid Date → undefined (defesa extra além da validação do servidor 14-01)"
  - "Doc-comment reescrito para NÃO citar os nomes 'resolvePeriodRange'/'resolvePeriodoRelatorios' literalmente — a verificação D-17 do plano faz grep exato e exige o arquivo VAZIO desses termos; o comentário agora diz 'sem resolver o range'"
  - "navegarPreset (novo) substitui o handleChange antigo: além de params.set('period', next), faz params.delete('from') e params.delete('to') (D-03)"
  - "Layout: wrapper externo virou flex flex-wrap items-center gap-2; cada date picker é um <div className='flex items-center gap-1.5'> com rótulo 'Início'/'Fim' em text-[14px] text-muted-foreground antes do Popover"

patterns-established:
  - "navegarCustom só é chamado dentro dos event handlers de onSelect/onValueChange — nunca em useEffect nem no corpo do render (T-14-07, sem risco de loop de navegação)"

requirements-completed: [METRICAS-03]

# Metrics
duration: ~15min
completed: 2026-08-30
---

# Phase 14 Plan 02: PeriodoSelector — modo Intervalo personalizado + 2 date pickers Summary

**O `<Select>` de período de `/relatorios` ganhou a 4ª opção "Intervalo personalizado", que revela 2 date pickers (Popover + Calendar, cópia do padrão de `lead-table-toolbar.tsx`); ao preencher início E fim a tela recalcula sozinha navegando para `?period=custom&from=…&to=…`, e o intervalo sobrevive a refresh com o Select e os campos pré-preenchidos da URL.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-30
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `PeriodoSelector` reescrito: props novas `from?`/`to?`; `OPCOES` com 4ª entrada `{ value: "custom", label: "Intervalo personalizado" }`; o `<Select>` exibe `customMode ? "custom" : value`.
- Estado local: `customMode` (init `value === "custom"`), `dataInicio`/`dataFim` (init de `from`/`to` via `parseISO` + `isValid`), `inicioPopoverOpen`/`fimPopoverOpen`.
- 2 date pickers (`Popover` + `PopoverTrigger` render `Button variant="outline"` + `CalendarIcon` + `format(d, "dd/MM/yyyy")` ou "Selecionar" + `ACCENT_FOCUS_RING` + `<Calendar mode="single">`) — renderizam só quando `customMode`, some nos presets. Rótulos "Início"/"Fim" em `text-[14px] text-muted-foreground`.
- `navegarCustom(inicio, fim)`: monta `?period=custom&from=` `format(inicio,"yyyy-MM-dd")` `&to=` `format(fim,"yyyy-MM-dd")`, `router.push(..., { scroll: false })`.
- `navegarPreset(next)`: `params.set("period", next)` + `params.delete("from")` + `params.delete("to")` (D-03).
- `handleInicioChange`/`handleFimChange`: setam o estado local, fecham o popover, e se `const prox = date ?? estadoAtual` + o outro local estiverem os dois preenchidos → `navegarCustom`.
- `/relatorios` desestrutura `from`/`to` de `resolvePeriodoRelatorios` e passa `<PeriodoSelector value={preset} from={from} to={to} />`. Nenhuma outra mudança na página.
- Cliente continua "só o gesto": sem resolver range, sem decidir default (`30d`) nem fallback (`tudo`/`customInvalido`) — tudo no servidor (D-17). Grep de `resolvePeriodRange`/`resolvePeriodoRelatorios` no componente = vazio.

## Task Commits

1. **Task 1: PeriodoSelector ganha modo "Intervalo personalizado" + 2 date pickers** - `e9bee9a` (feat)
2. **Task 2: /relatorios passa from/to para o PeriodoSelector** - `573647b` (feat)

## Files Created/Modified

- `src/components/periodo-selector.tsx` - Reescrito. Imports novos: `useState`; `format`/`isValid`/`parseISO` de `date-fns`; `CalendarIcon` de `lucide-react`; `Button`, `Calendar`, `Popover`/`PopoverContent`/`PopoverTrigger`. Doc-comment atualizado (gerencia modo custom + 2 datas locais, mas não resolve range / não decide default / não decide fallback). Helper `parseDataInicial`.
- `src/app/relatorios/page.tsx` - `const { preset, range, customInvalido, from, to } = resolvePeriodoRelatorios({...})`; `<PeriodoSelector value={preset} from={from} to={to} />`.

## Forma final do estado local do PeriodoSelector

| Estado | Tipo | Init |
|--------|------|------|
| `customMode` | `boolean` | `value === "custom"` |
| `dataInicio` | `Date \| undefined` | `parseDataInicial(from)` (parseISO + isValid, senão undefined) |
| `dataFim` | `Date \| undefined` | `parseDataInicial(to)` |
| `inicioPopoverOpen` | `boolean` | `false` |
| `fimPopoverOpen` | `boolean` | `false` |

Closure de "os 2 preenchidos": em `handleInicioChange(date)` → `const proxInicio = date ?? dataInicio; if (proxInicio && dataFim) navegarCustom(proxInicio, dataFim)`. Simétrico em `handleFimChange` com `proxFim = date ?? dataFim`. O `??` cobre o caso de o `onSelect` do Calendar entregar `undefined` (desmarcar) — aí cai no valor de estado atual e não navega se o resultado for `undefined`.

## Layout / classes dos 2 date pickers

- Wrapper externo: `<div className="flex flex-wrap items-center gap-2">` (era `flex items-center gap-2`; ganhou `flex-wrap` para os 2 campos extras não estourarem a linha do header).
- Cada picker: `<div className="flex items-center gap-1.5">` com `<span className="text-[14px] text-muted-foreground">Início</span>` (ou "Fim") + `Popover`.
- `Button variant="outline"` com `className={\`justify-start gap-1.5 font-normal ${ACCENT_FOCUS_RING}\`}` — literal idêntico ao de `lead-table-toolbar.tsx`.
- `CalendarIcon className="size-3.5"` + `format(d, "dd/MM/yyyy")` ou `"Selecionar"`.
- `<Calendar mode="single" selected={data...} onSelect={handle...Change} />` dentro de `PopoverContent`.

## Ajuste no doc-comment

O doc-comment do arquivo foi reescrito para (a) documentar que o componente agora gerencia o modo custom e as 2 datas locais, (b) manter explícito que ele continua sem resolver range / sem decidir default / sem decidir fallback (D-17), (c) documentar a mitigação T-14-07 (navegação só em event handlers, nunca em effect/render). Os nomes das funções de servidor foram removidos do texto para o grep de D-17 do plano dar vazio.

## Decisions Made

- **`parseDataInicial` helper com `isValid`** — o servidor (14-01) só passa `from`/`to` quando o custom é válido, mas o `useState` initializer ganhou uma guarda barata contra `Invalid Date` de qualquer forma.
- **Doc-comment sem citar `resolvePeriodRange`/`resolvePeriodoRelatorios`** — necessário porque a verificação D-17 do plano é um `grep` exato exigindo o arquivo VAZIO desses termos. O comentário original da Fase 11 os citava; reescrito para "sem resolver o range".
- **`navegarPreset` como função nova** (não o `handleChange` renomeado) — o comportamento mudou (agora deleta `from`/`to`), então virou uma função com nome próprio; `navegarCustom` é a irmã dela.

## Deviations from Plan

None - plano executado exatamente como escrito. (O ajuste no doc-comment para o grep de D-17 estava previsto no próprio plano: "Manter `"use client"` e o doc-comment atualizado".)

## Issues Encountered

Nenhum. `npx tsc --noEmit` exit 0; `npm run build` exit 0 (Turbopack, ~21s compile + ~22s TS, 13 páginas, `/relatorios` presente como rota dinâmica `ƒ`); `npm run test:relatorios` exit 0 (50/50 — nada de servidor mudou neste plano). Nenhum processo `node`/`dev` ativo durante o build (host 4GB).

## Threat surface scan

Nenhuma superfície nova fora do `<threat_model>` do plano.
- T-14-06 (URL adulterada): o cliente só monta URLs bem-formadas via `format(d, "yyyy-MM-dd")`; validação real é do servidor (14-01), intocada.
- T-14-07 (loop de navegação): `navegarCustom` só nos event handlers `handleInicioChange`/`handleFimChange`/`handleSelectChange`; zero `useEffect`, zero navegação no corpo do render. Confirmado.
- T-14-08 (dessincronização `customMode` vs URL): `<Select>` exibe `customMode ? "custom" : value`; `customMode` init de `value === "custom"`; ao escolher preset `setCustomMode(false)` + `navegarPreset` juntos.
- T-14-SC: zero dependência nova — `Popover`/`Calendar`/`Button` já no repo, `date-fns`/`lucide-react` já usados.

## `<human-check>` — PENDENTE (precisa `/gsd-verify-work 14` com navegador)

- [ ] `/relatorios`: o `<Select>` de período tem "Intervalo personalizado" como 4ª opção
- [ ] Escolher "Intervalo personalizado" → aparecem 2 date pickers ("Início" / "Fim"); nos presets eles somem
- [ ] Escolher início E fim → as 3 seções (origem, nicho, motivos de perda) recalculam pro intervalo; a URL vira `?period=custom&from=…&to=…`
- [ ] Escolher só uma das 2 datas → nada recalcula ainda
- [ ] Refresh da página com `?period=custom&from&to` → o Select mostra "Intervalo personalizado" e os campos vêm preenchidos
- [ ] Voltar pra "Últimos 30 dias" → `from`/`to` somem da URL, dados voltam pra 30d
- [ ] Informar fim antes do início → a página mostra a faixa "Intervalo inválido — mostrando os últimos 30 dias." e dados de 30d
- [ ] Informar uma data no futuro no fim → o relatório trata como "até hoje" (sem faixa de erro)

## Next Phase Readiness

- **Fase 14 pronta para verificação:** camada de servidor (14-01) + gesto no cliente (14-02) completos. `METRICAS-03` coberto ponta a ponta. Próximo: `/gsd-verify-work 14` (os 8 itens acima no navegador) → `/gsd-secure-phase 14` (T-14-01..08) → `/close-phase 14`.
- Sem migração, sem schema, sem Server Action nova.
- Fase 15 (campo "interesse / serviço desejado" no lead, LEAD-06) independente desta.

## Self-Check: PASSED

- `src/components/periodo-selector.tsx` — FOUND
- `src/app/relatorios/page.tsx` — FOUND
- Commit `e9bee9a` — FOUND
- Commit `573647b` — FOUND
- `grep "Intervalo personalizado\|customMode\|navegarCustom" src/components/periodo-selector.tsx` — presente
- `grep "resolvePeriodRange\|resolvePeriodoRelatorios" src/components/periodo-selector.tsx` — VAZIO (D-17)
- `grep "from={from} to={to}" src/app/relatorios/page.tsx` — presente
- Gates: `npx tsc --noEmit` exit 0 · `npm run build` exit 0 · `npm run test:relatorios` exit 0 (50/50)

---
*Phase: 14-filtro-de-intervalo-customizado-em-relatorios*
*Completed: 2026-08-30*
