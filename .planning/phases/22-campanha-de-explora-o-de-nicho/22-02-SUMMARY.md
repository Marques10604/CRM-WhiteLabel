---
phase: 22-campanha-de-explora-o-de-nicho
plan: 02
subsystem: ui
tags: [next-app-router, server-components, react-hook-form, zod, base-ui, drizzle]

# Dependency graph
requires:
  - phase: 22-campanha-de-explora-o-de-nicho
    plan: 01
    provides: "tabela campanhas + tipos Campanha/NewCampanha + campanhaSchema/CampanhaFormValues + createCampanha/updateCampanha/softDeleteCampanha"
  - phase: 13-despivo-generico
    provides: "NichoCombobox + nichos (sqliteTable('subnichos'))"
  - phase: 19-marca-e-tokens
    provides: "escala --status-* (info/warning/success/danger) reaproveitada pelo badge de estado"
provides:
  - "rota /campanhas (listagem + criação, estado vazio com CTA)"
  - "rota /campanhas/[id] (detalhe: nicho+oferta, estado, meta, janela) — âncora para as Fases 23/24"
  - "CampanhaFormDialog (criação: nicho/oferta/meta/janela ~90d)"
  - "CampanhaEstadoBadge (ESTADO_LABEL/ESTADO_TOKEN dos 4 estados)"
  - "item de navegação 'Campanhas' na sidebar"
affects: ["23 (diagnóstico de IA adiciona seção a /campanhas/[id])", "24 (veredito/painel adicionam seções a /campanhas/[id] + Mapa de Nichos)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Badge por enum no idioma de etapa-badge.tsx: ESTADO_LABEL + ESTADO_TOKEN separados, Badge variant=outline + border-transparent"
    - "Dialog de criação-apenas (sem modo edição) — poda do molde tarefa-form-dialog.tsx: useActionState(createCampanha) + FormData bruto do DOM em startTransition"
    - "Sub-componente JanelaField (Popover+Calendar+input hidden ISO) renderizado 2x com estado de Popover próprio por instância — evita duplicar o bloco de data"
    - "Rota de detalhe Next 16: params como Promise<{ id: string }>, guard de inteiro positivo + notFound() antes da query (T-22-07), notFound() também para soft-deletada (T-22-08)"

key-files:
  created:
    - src/components/campanha-estado-badge.tsx
    - src/components/campanha-form-dialog.tsx
    - src/components/campanha-list.tsx
    - src/app/campanhas/page.tsx
    - src/app/campanhas/[id]/page.tsx
  modified:
    - src/components/app-sidebar.tsx

key-decisions:
  - "CampanhaFormDialog é criação-apenas: CAMPANHA-01 só pede criar; edição de campanha não é requisito do plano 22-02 (o updateCampanha do 22-01 fica sem consumidor de UI até a Fase 24)"
  - "Bloco de data extraído para o sub-componente JanelaField (usado 2x) em vez de dois Controllers inline idênticos — cada instância mantém o próprio useState de Popover, satisfazendo 'dois campos independentes'"
  - "Detalhe usa leftJoin (não innerJoin) com nichos — se o nicho da campanha foi soft-deletado, o join ainda retorna a linha e o nome cai no fallback travessão"
  - "/campanhas/[id] minimalista de propósito — Fases 23/24 ADICIONAM seções nesta mesma página, sem retrabalho"

patterns-established:
  - "Estado vazio de lista = borda tracejada + título + parágrafo mutado + CTA repetido (idioma de lead-table.tsx), nunca silêncio"

requirements-completed: [CAMPANHA-01, CAMPANHA-02, CAMPANHA-04]

# Metrics
duration: 8min
completed: 2026-09-05
---

# Phase 22 Plan 02: Interface de Criação e Listagem de Campanhas Summary

**Rota `/campanhas` navegável pela sidebar: cria campanha (nicho + oferta + meta + janela default ~90 dias) via dialog, lista as campanhas com estado visível e estado vazio com CTA, e navega até `/campanhas/[id]` — a âncora minimalista que as Fases 23/24 vão enriquecer.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-05T13:31:30Z
- **Completed:** 2026-09-05T13:39:07Z
- **Tasks:** 2/2
- **Files modified:** 6 (5 criados, 1 modificado)

## Accomplishments
- `CampanhaEstadoBadge` — 4 estados (`explorando`/`veredito_registrado`/`em_escala`/`abandonada`) mapeados para a escala `--status-*` da Fase 19 (info/warning/success/danger), rótulo e cor em mapas separados (molde `etapa-badge.tsx`, server-safe, sem `"use client"`)
- `CampanhaFormDialog` — criação de campanha: `NichoCombobox` existente (não recriado), `Textarea` de oferta, `Input` de meta, dois campos de janela via `Popover`+`Calendar` (default `startOfDay(new Date())` e `startOfDay(addDays(new Date(), 90))`), `useActionState(createCampanha)` + `useForm`/`zodResolver(campanhaSchema)`, `FormData` bruto do DOM dentro de `startTransition` (React 19), guard de descarte quando o form está dirty, toasts de sucesso/erro
- `CampanhaList` — botão "Nova campanha" (ícone `Plus`), estado vazio com título "Nenhuma campanha criada ainda" + parágrafo mutado + CTA, senão lista de `Link` para `/campanhas/{id}` como cards (nicho+oferta truncados, janela `dd/MM/yyyy`, `CampanhaEstadoBadge` à direita); mapa `nichoNameById` via `useMemo`
- `/campanhas` — server component: campanhas ativas (`isNull(deletedAt)`, ordem `createdAt` desc) + nichos SEM filtro de `deletedAt` (mapa id→nome, mesmo idioma de `leads/page.tsx`)
- `/campanhas/[id]` — server component: `params` como `Promise`, guard de inteiro positivo + `notFound()` (T-22-07), `notFound()` para campanha soft-deletada (T-22-08), `leftJoin` com nichos, cabeçalho (nicho+oferta + badge de estado) + bloco com "Meta de conversão" e "Janela de tempo"
- `app-sidebar.tsx` — item "Campanhas" (ícone `Target` do lucide) entre "Pipeline" e "Relatórios"

## Task Commits

Cada tarefa foi commitada atomicamente:

1. **Task 1: Dialog de criação de campanha + badge de estado** - `a235686` (feat)
2. **Task 2: Listagem, detalhe e navegação** - `bfac3be` (feat)

_Nenhum ciclo TDD — tarefas de tipo `auto` puro (UI/rotas), sem `tdd="true"` no plano._

## Files Created/Modified
- `src/components/campanha-estado-badge.tsx` - badge dos 4 estados (`ESTADO_LABEL`/`ESTADO_TOKEN`)
- `src/components/campanha-form-dialog.tsx` - dialog de criação (nicho/oferta/meta/janela) + sub-componente `JanelaField`
- `src/components/campanha-list.tsx` - listagem + botão "Nova campanha" + estado vazio
- `src/app/campanhas/page.tsx` - rota `/campanhas`
- `src/app/campanhas/[id]/page.tsx` - rota de detalhe `/campanhas/[id]`
- `src/components/app-sidebar.tsx` - entrada "Campanhas" em `NAV_ITEMS`

## Decisions Made
- **Criação-apenas no dialog** — CAMPANHA-01 só pede criar; a edição de campanha não é requisito desta fase. `updateCampanha` (22-01) fica sem consumidor de UI até a Fase 24 (VEREDITO), como o próprio 22-01-SUMMARY antecipou.
- **`JanelaField` como sub-componente** (usado 2x) em vez de dois blocos `Controller` inline idênticos — cada instância tem o próprio `useState` de Popover, satisfazendo "dois campos independentes" do plano sem duplicação. O `grep -c "PopoverTrigger"` do acceptance dá 3 (import + abertura + fechamento da tag única), não 2 — divergência cosmética do heurístico; a intenção (dois date-pickers independentes com estado próprio) está atendida e o gate real (`npx tsc --noEmit`) passa limpo.
- **`leftJoin` (não `innerJoin`) no detalhe** — campanha cujo nicho foi soft-deletado ainda aparece; nome cai no fallback travessão.
- **`/campanhas/[id]` minimalista** — Fases 23/24 adicionam seções nesta mesma página; nada aqui será retrabalhado.

## Deviations from Plan

### Ajustes cosméticos (não são desvios de comportamento)

**1. [Estrutural] Bloco de data extraído para `JanelaField`**
- **Onde:** Task 1
- **Plano pedia:** dois campos `Controller` independentes, cada um com seu `useState` de Popover
- **Feito:** um sub-componente `JanelaField` renderizado 2x, cada instância com `useState` de Popover próprio — mesmo comportamento observável, sem duplicar ~35 linhas
- **Efeito no acceptance:** `grep -c "PopoverTrigger" src/components/campanha-form-dialog.tsx` retorna 3 (import + tag) em vez de 2. `npx tsc --noEmit` (verify automatizado real) passa limpo.
- **Arquivos:** `src/components/campanha-form-dialog.tsx`
- **Commit:** `a235686`

## Issues Encountered

None.

## Verification Evidence

1. `npx tsc --noEmit` — exit 0 (rodado após cada task)
2. `npm run lint` — exit 0 (4 warnings pré-existentes em `lead-table.tsx`/`lixeira-table.tsx`, `react-hooks/incompatible-library` do TanStack Table — nenhum nos arquivos novos)
3. `npm run build` — exit 0 (Turbopack, 50s compile + 24s TS); saída do Next lista `○ /campanhas` e `ƒ /campanhas/[id]`
4. Roundtrip direto em `data/crm.db` via `better-sqlite3`: INSERT de campanha de teste (nicho_id real) + SELECT confirmado (`estado` nasce `"explorando"`) + DELETE de housekeeping — 0 linhas de teste remanescentes, dado real intacto
5. **UAT humano (abrir `/campanhas` no navegador, criar campanha, navegar até o detalhe) — PENDENTE, não-bloqueante** (host 4GB, precedente das Fases 18-21). Registrado para uma sessão com navegador.

## User Setup Required

None.

## Next Phase Readiness

- `/campanhas` e `/campanhas/[id]` estão navegáveis e funcionais; `CampanhaFormDialog` cria campanhas de verdade via `createCampanha`
- Fase 23 (Diagnóstico de IA) pode adicionar um botão + seção em `/campanhas/[id]` sem tocar no layout atual
- Fase 24 (Veredito e Mapa de Nichos) pode: (a) adicionar seção de veredito/painel em `/campanhas/[id]`, (b) evoluir `CampanhaList` para o "Mapa de Nichos" (já é a tela que lista campanhas), (c) finalmente dar um consumidor de UI ao `updateCampanha`
- Nenhum bloqueio conhecido

---
*Phase: 22-campanha-de-explora-o-de-nicho*
*Completed: 2026-09-05*

## Self-Check: PASSED

Arquivos criados/modificados confirmados em disco; os 2 hashes de commit (a235686, bfac3be) confirmados no git log.
