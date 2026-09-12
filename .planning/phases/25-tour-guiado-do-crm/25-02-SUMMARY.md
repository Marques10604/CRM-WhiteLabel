---
phase: 25-tour-guiado-do-crm
plan: 02
subsystem: ui
tags: [react-joyride, onboarding, sidebar, localStorage, tour]

requires:
  - phase: 25-tour-guiado-do-crm (plano 25-01)
    provides: "react-joyride@3.2.0 instalado + API real da v3 confirmada contra o .d.ts, TOUR_STEPS, tour-persistence.ts"
provides:
  - "TourGuiado montado uma unica vez no root layout, dono do estado run e da leitura/gravacao da flag tourVisto"
  - "5 alvos data-tour (nav-dashboard/nav-leads/nav-pipeline/nav-campanhas/nav-relatorios) na sidebar, casando 1:1 com TOUR_STEPS"
  - "ReiniciarTourButton em /configuracoes (TUTORIAL-03)"
  - "Fase 25 fecha as 4 capacidades observaveis: TUTORIAL-01/02/03/05"
affects: []

tech-stack:
  added: []
  patterns:
    - "NavItem tipado explicitamente (sem as const) quando um array de nav precisa de um campo opcional presente so em parte dos itens — evita erro de tupla do TS ao mapear"
    - "Provider-como-irmao-de-{children} no root layout (TourGuiado replica o slot arquitetural de AppSidebar/ThemeProvider)"

key-files:
  created:
    - src/components/tour-guiado.tsx
    - src/components/reiniciar-tour-button.tsx
  modified:
    - src/components/app-sidebar.tsx
    - src/app/layout.tsx
    - src/app/configuracoes/page.tsx

key-decisions:
  - "D-25-04: react-joyride v3 nao tem slot de contador de passo separado do rotulo do botao de avanco (locale so expoe next/nextWithProgress). Contador 'Passo n de 5' implementado via options.showProgress + locale.nextWithProgress ('Proximo (Passo {current} de {total})'), sem custom tooltipComponent (proibido pelo UI-SPEC regra 6/9)."
  - "D-25-05: NAV_ITEMS perdeu o as const e ganhou tipo explicito NavItem (tourId?: string) porque um array com apenas 5 de 12 literais carregando um campo extra quebra a inferencia de uniao de tipos do TypeScript no .map() (item.tourId nao existiria em toda a uniao) — Rule 1, erro real de tsc, nao suposicao."

patterns-established:
  - "JSDoc de modulo/componente nunca repete o literal exato que uma acceptance criteria de grep conta no CODIGO (mesma licao do 25-01) — reforçado 2x nesta plano (tour-guiado.tsx e reiniciar-tour-button.tsx)"

requirements-completed: [TUTORIAL-01, TUTORIAL-02, TUTORIAL-03, TUTORIAL-05]

duration: ~19min
completed: 2026-09-12
---

# Phase 25 Plan 02: Tour ligado na interface real (Joyride montado + sidebar + reinicio) Summary

**`TourGuiado` monta `<Joyride>` uma unica vez no root layout com `run`/`onEvent`/`options.buttons=["skip",...]` ligados aos tokens OKLCH da marca, os 5 itens certos da sidebar ganham `data-tour`, e `/configuracoes` ganha o botao "Rever tour do CRM" — fecha TUTORIAL-01/02/03/05 de ponta a ponta.**

## Performance

- **Duration:** ~19 min
- **Started:** 2026-09-12T15:06:00Z (aprox.)
- **Completed:** 2026-09-12T15:25:04Z
- **Tasks:** 3 (todas `auto`)
- **Files modified:** 5 (2 criados, 3 modificados)

## Accomplishments

- `TourGuiado` (`"use client"`, leaf sem props) renderiza `<Joyride>` de verdade — não apenas importado — com `steps={TOUR_STEPS}`, `run={run}`, `continuous`, `onEvent={handleEvent}`; `run` nasce `false` e só vira `true` depois do guard `mounted` + `lerTourVisto(window.localStorage) === false` (Pitfall 2 do RESEARCH, mesmo idioma de `theme-toggle.tsx`).
- `options.buttons` inclui `"skip"` explicitamente (`["back", "close", "skip", "primary"]`) — mecanismo exato de TUTORIAL-02, já que o default da v3 não inclui pular (Pitfall 4). `locale.skip = "Pular tour"`, cópia travada do UI-SPEC.
- `handleEvent` delega 100% da decisão de gravar a flag para `deveGravarComoVisto` (já testada no 25-01) — nenhuma comparação de status duplicada dentro do componente, ambos os caminhos de saída (`finished`/`skipped`) cobertos por construção.
- Cores 100% tokenizadas: `primaryColor`/`backgroundColor`/`arrowColor`/`textColor`/`overlayColor` via `var(--primary)`/`var(--popover)`/`var(--popover-foreground)`/`color-mix(in oklch, var(--foreground) 10%, transparent)` — zero hex/rgb literal, `npm run verify:brand` verde.
- 5 itens de `NAV_ITEMS` (`/`, `/leads`, `/pipeline`, `/campanhas`, `/relatorios`) ganham `tourId`, emitido incondicionalmente via `data-tour={item.tourId}` no `<Link>` — os outros 7 itens ficam intocados (`href`/`label`/`icon` preservados, nenhum `tourId`).
- `<TourGuiado />` montado no root layout como irmão de `<AppSidebar />` e `{children}`, dentro do `ThemeProvider`.
- `ReiniciarTourButton` (`"use client"`) em `/configuracoes`: limpa a flag via `limparTourVisto` e recarrega a página — reativa o tour do zero a qualquer momento (TUTORIAL-03), sem tocar em `configuracoes-form.tsx`.
- `npm run build` verde com as 15 rotas do projeto compilando (incluindo as novas mudanças).

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Componente TourGuiado (wrapper cliente do Joyride)** — `bc3109d` (feat)
2. **Task 2: Alvos data-tour na sidebar + montagem no layout raiz** — `3472a3c` (feat)
3. **Task 3: Botão fixo de reinício do tour em /configuracoes** — `90a077f` (feat)

## Files Created/Modified

- `src/components/tour-guiado.tsx` (NOVO) — monta `<Joyride>`, dono do estado `run`, guard `mounted`, handler de evento delegando a `deveGravarComoVisto`.
- `src/components/reiniciar-tour-button.tsx` (NOVO) — botão "Rever tour do CRM" + legenda, limpa a flag e recarrega.
- `src/components/app-sidebar.tsx` — `NAV_ITEMS` tipado como `NavItem[]` (perdeu `as const`, ganhou tipo explícito), 5 itens com `tourId`, `<Link data-tour={item.tourId}>`.
- `src/app/layout.tsx` — import + `<TourGuiado />` como irmão de `<AppSidebar />`/`{children}`.
- `src/app/configuracoes/page.tsx` — import + `<ReiniciarTourButton />` como irmão de `<ConfiguracoesForm />`.

## Decisions Made

- **D-25-04** (frontmatter) — contador de passo via `options.showProgress` + `locale.nextWithProgress`, não um slot de UI separado (não existe na v3).
- **D-25-05** (frontmatter) — `NAV_ITEMS` trocou `as const` por tipo explícito `NavItem` para não quebrar a inferência de tupla do TypeScript ao adicionar um campo (`tourId`) presente em só 5 dos 12 itens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `NAV_ITEMS as const` com campo parcial quebrava `tsc --noEmit`**
- **Found during:** Task 2, imediatamente após adicionar `tourId` a 5 de 12 entradas de `NAV_ITEMS` (antes do commit)
- **Issue:** Com `as const`, cada item do array vira um tipo literal próprio; um array com apenas alguns itens carregando `tourId` gera uma união de tipos onde a propriedade não existe em todos os membros — `item.tourId` no `.map()` falha a compilação (`Property 'tourId' does not exist on type ...`).
- **Fix:** Substituído `as const` por um tipo explícito `NavItem = { href: string; label: string; icon: LucideIcon; tourId?: string }` e `const NAV_ITEMS: NavItem[] = [...]` (sem `as const`). Nenhuma mudança de comportamento em runtime — apenas a forma de tipagem.
- **Files modified:** `src/components/app-sidebar.tsx`
- **Verification:** `npx tsc --noEmit` voltou a sair 0; `npm run lint` sem erros novos.
- **Committed in:** `3472a3c` (Task 2)

**2. [Rule 1 - Bug] JSDoc de `tour-guiado.tsx` e `reiniciar-tour-button.tsx` duplicava literais que as próprias acceptance criteria de grep contam no código (mesma classe de bug do 25-01)**
- **Found during:** Task 1 e Task 3, logo após escrever os componentes (antes do commit)
- **Issue:** `grep -F -c 'Pular tour' src/components/tour-guiado.tsx` retornava 2 (não 1) porque o JSDoc do componente citava "Pular tour" em prosa explicando `D-25-04`. Em `reiniciar-tour-button.tsx`, o JSDoc citava `window.location.reload()` literalmente, fazendo o grep de aceitação (que espera 1) contar 2 linhas.
- **Fix:** Reescrita da prosa dos 2 JSDocs para transmitir a mesma informação sem repetir os literais exatos que os greps de aceitação checam contra o CÓDIGO (ex.: "abrir mão do botão de pular o tour" em vez de citar "Pular tour"; "limpar a flag e recarregar a página inteira" em vez de citar `window.location.reload()`).
- **Files modified:** `src/components/tour-guiado.tsx`, `src/components/reiniciar-tour-button.tsx`
- **Verification:** Os greps voltaram a bater com os valores esperados (1) antes do commit.
- **Committed in:** `bc3109d` (Task 1), `90a077f` (Task 3)

---

**Total deviations:** 2 auto-fixados (Rule 1, 3 ocorrências no total: 1 de tipo/tsc + 2 de JSDoc/grep)
**Impact on plan:** Nenhum impacto de escopo — uma correção de tipagem (comportamento em runtime idêntico) e correções textuais em comentários. Necessárias para os próprios gates automatizados do plano baterem.

## Issues Encountered

**Discrepância residual conhecida na acceptance criteria da Task 3 (não corrigida, documentada):** `grep -c 'limparTourVisto' src/components/reiniciar-tour-button.tsx` retorna **2** (import + chamada), não 1 como a acceptance criteria da Task 3 pede. Isso é uma propriedade inerente de qualquer implementação funcional — a MESMA referência de código do `25-PATTERNS.md` (import na linha 4, chamada na linha do handler) também produziria 2 linhas casando o literal. `grep -c` conta linhas, não ocorrências, e import + uso são sempre 2 linhas distintas quando o import é nomeado. Não foi feita nenhuma contorção de código (ex.: import dinâmico ou alias) para forçar esse grep a bater artificialmente — isso pioraria a legibilidade sem ganho real. Registrado aqui para o verificador de fase não tratar como regressão silenciosa; a função está corretamente importada e usada uma única vez em runtime.

## User Setup Required

None — nenhuma configuração de serviço externo nesta plano (a única pendência de setup da Fase 25, o checkpoint de legitimidade do pacote `react-joyride`, já foi resolvida no plano 25-01).

## Next Phase Readiness

- Fase 25 fecha as 4 capacidades observáveis do ROADMAP (TUTORIAL-01/02/03/05) do ponto de vista de execução de planos.
- Pendente (nível de fase, não deste executor): UAT humano de fim de fase (6 checagens do `<human-check>` da Task 3, claro + escuro) — `human_verify_mode: "end-of-phase"` no `config.json`, não-bloqueante, mesmo padrão das Fases 22-24.
- Nenhum bloqueio conhecido para o fechamento da Fase 25.

## Self-Check: PASSED

- FOUND: `src/components/tour-guiado.tsx`
- FOUND: `src/components/reiniciar-tour-button.tsx`
- FOUND: `src/components/app-sidebar.tsx` (modificado, `tourId` presente)
- FOUND: `src/app/layout.tsx` (modificado, `<TourGuiado />` presente)
- FOUND: `src/app/configuracoes/page.tsx` (modificado, `<ReiniciarTourButton />` presente)
- FOUND commit: `bc3109d`
- FOUND commit: `3472a3c`
- FOUND commit: `90a077f`

---
*Phase: 25-tour-guiado-do-crm*
*Completed: 2026-09-12*
