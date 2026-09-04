---
phase: 20-tema-dark-mode
plan: 01
subsystem: ui
tags: [next-themes, dark-mode, theming, react, tailwind-v4, shadcn]

requires:
  - phase: 19-marca-e-identidade-visual
    provides: "tokens .dark (30/30 pares WCAG AA) + @custom-variant dark em globals.css + next-themes ^0.4.6 já em package.json"
provides:
  - "ThemeProvider client (wrapper next-themes) montado na raiz do app"
  - "ThemeToggle sol/lua no rodapé da sidebar, visível em toda rota"
  - "Persistência de tema via localStorage (chave `theme`, 100% next-themes)"
  - "defaultTheme=system + enableSystem → 1º acesso segue o SO"
  - "Anti-FOUC: suppressHydrationWarning + script pré-paint do next-themes + disableTransitionOnChange"
  - "Guarda estrutural scripts/verify-theme.cjs + script npm verify:theme"
affects: [qualquer fase futura de UI que adicione superfície visível; dark mode agora é contrato]

tech-stack:
  added: []
  patterns:
    - "next-themes: ThemeProvider client wrapper em src/components/theme-provider.tsx, montado DENTRO do <body> na raiz"
    - "Guard de hidratação `mounted` para componentes que leem resolvedTheme; placeholder reserva a altura final para não dar nudge de layout"
    - "Guarda estrutural .cjs code+data para fiação multi-arquivo (mesmo molde de verify-brand-md.cjs / verify-origem-tipo.cjs)"

key-files:
  created:
    - src/components/theme-provider.tsx
    - src/components/theme-toggle.tsx
    - scripts/verify-theme.cjs
  modified:
    - src/app/layout.tsx
    - src/components/app-sidebar.tsx
    - package.json

key-decisions:
  - "D-20-01: constraint D-16 da Fase 19 (sem ThemeProvider / sem toggle) SUSPENSA por decisão do milestone v1.6 — esta fase adiciona exatamente isso"
  - "D-20-02: toggle alterna só light↔dark explícitos; `system` é o defaultTheme (1º acesso), sem 3º estado no botão (YAGNI)"
  - "D-20-03: persistência (THEME-02) é 100% next-themes (localStorage chave `theme`); zero código de persistência no projeto"
  - "D-20-04: verificação por code+data (host 4GB não roda dev + navegador + sessão); 5 cenários visuais como UAT humano NÃO-BLOQUEANTE"
  - "D-20-05: ship por push direto na main (sem PR — projeto solo), consistente com Fases 16-19"

patterns-established:
  - "Guard `mounted` + placeholder de altura reservada para qualquer botão que dependa de resolvedTheme"
  - "verify:theme como sensor permanente da fiação de tema (4 arquivos amarrados)"

requirements-completed: [THEME-01, THEME-02, THEME-03, THEME-04]

duration: 7min
completed: 2026-09-04
---

# Fase 20 Plano 01: Tema / Dark Mode Summary

**Dark mode ligado sobre os tokens `.dark` prontos da Fase 19: ThemeProvider do next-themes na raiz, toggle sol/lua no rodapé da sidebar, persistência via localStorage, 1º acesso segue o SO e anti-FOUC por script pré-paint.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-04T00:58:45Z
- **Completed:** 2026-09-04T01:05:34Z
- **Tasks:** 3
- **Files modified:** 6 (3 criados, 3 modificados)

## Accomplishments

- `ThemeProvider` client (wrapper fino do next-themes) montado dentro do `<body>` na raiz com `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`; `suppressHydrationWarning` no `<html>`.
- `ThemeToggle` sol/lua no rodapé da sidebar (`mt-auto`), visível em toda rota, com guard de hidratação `mounted`, `aria-label`/`title` dinâmicos e alternância `light`↔`dark`.
- `scripts/verify-theme.cjs` + `npm run verify:theme` — guarda estrutural code+data dos 4 arquivos da fiação; teste de mutação confirma que morde.
- Portão sequencial (host 4GB) verde: `verify:theme` OK, `tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit 0. `package-lock.json` e `globals.css` intactos.

## Task Commits

1. **Task 1: ThemeProvider wrapper + fiação no layout raiz** — `f5bb212` (feat)
2. **Task 2: Componente ThemeToggle + rodapé da sidebar** — `8935ded` (feat)
3. **Task 3: Guarda estrutural verify:theme + portão code+data** — `2408e40` (chore)

## Files Created/Modified

- `src/components/theme-provider.tsx` (criado) — wrapper client `"use client"` que só repassa props/children para o `NextThemesProvider`, tipado com `React.ComponentProps<typeof NextThemesProvider>`.
- `src/components/theme-toggle.tsx` (criado) — botão sol/lua; enquanto `!mounted` renderiza placeholder `disabled aria-hidden` com spacer de ícone `h-[18px] w-[18px]` + `<span className="opacity-0">Tema claro</span>` (reserva a altura final); montado: `Sun`/`Moon` + rótulo + `onClick={() => setTheme(isDark ? "light" : "dark")}`. Reusa o idioma de classe do item de nav da sidebar.
- `scripts/verify-theme.cjs` (criado) — Node puro, remove linhas de comentário antes de casar, acumula falhas e `process.exit(1)` nomeando cada uma; senão imprime "verify:theme OK".
- `src/app/layout.tsx` (modificado) — `import { ThemeProvider }`, `suppressHydrationWarning` no `<html>`, `<ThemeProvider>` envolvendo `<AppSidebar />` + `<main>` + `<Toaster />` dentro do `<body>`. Fontes Geist e `metadata` intactas.
- `src/components/app-sidebar.tsx` (modificado) — `import { ThemeToggle }`; `<div className="mt-auto px-[14px] pt-3 pb-5"><ThemeToggle /></div>` após o `</nav>`. `NAV_ITEMS` e header do selo intactos.
- `package.json` (modificado) — +1 linha: `"verify:theme": "node scripts/verify-theme.cjs"` após `"check:contrast"`. Nenhuma dependência; lockfile inalterado.

## Decisions Made

- **D-20-01**: A constraint D-16 da Fase 19 ("sem ThemeProvider / sem toggle de tema") está **SUSPENSA** por decisão do milestone v1.6. Esta fase adiciona exatamente o ThemeProvider e o toggle.
- **D-20-02**: O toggle alterna só entre `light` e `dark` explícitos. `system` é o `defaultTheme` (1º acesso), coberto por `enableSystem` — sem 3º estado no botão (YAGNI; "Agendamento de tema" está fora de escopo).
- **D-20-03**: Persistência (THEME-02) é 100% do próprio `next-themes` (chave `localStorage` `theme`). Zero código de persistência no projeto.
- **D-20-04**: Verificação por **code+data** (host 4GB não roda `dev` + navegador + sessão — precedente Fases 18/19). Os 5 cenários puramente visuais ficam como UAT humano **não-bloqueante**.
- **D-20-05**: Ship por push direto na `main` (sem PR — projeto solo), consistente com Fases 16-19.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `eslint-disable` documentado para `react-hooks/set-state-in-effect` no guard `mounted`**
- **Found during:** Task 3 (portão — `npm run lint`)
- **Issue:** `npm run lint` saiu com exit 1: o `useEffect(() => setMounted(true), [])` — o guard de hidratação documentado do próprio next-themes — dispara o erro `react-hooks/set-state-in-effect` do React Compiler (mesmo falso-positivo já conhecido e aceito no projeto: STATE.md decisão 07-02; já aplicado em `lead-timeline-dialog.tsx`, `whatsapp-preview-dialog.tsx`, `configuracoes-form.tsx`).
- **Fix:** `// eslint-disable-next-line react-hooks/set-state-in-effect` com comentário de 4 linhas explicando o porquê (padrão do next-themes, precedente do projeto). Zero mudança de comportamento.
- **Files modified:** `src/components/theme-toggle.tsx`
- **Verification:** `npm run lint` volta a exit 0 (restam só os 4 warnings pré-existentes `react-hooks/incompatible-library` em `lead-table.tsx`/`lixeira-table.tsx` — aceitos/deferidos por SC).
- **Committed in:** `2408e40` (parte do commit da Task 3)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** O `eslint-disable` era necessário para o portão `lint` exit 0 e segue um padrão já estabelecido no projeto para o mesmo falso-positivo. Sem scope creep.

## Issues Encountered

- **C3 do plan-checker (rotas com layout aninhado escondendo a sidebar):** `Glob src/app/**/layout.tsx` retorna **só** `src/app/layout.tsx` (o layout raiz). Nenhuma rota tem `layout.tsx` próprio → o `<AppSidebar />` (e portanto o `<ThemeToggle />` no rodapé) é renderizado em toda tela. Não-bloqueante, sem ação necessária.
- `globals.css` **não foi tocado** (`git diff --stat` não lista o arquivo) — os tokens `.dark` e o `@custom-variant dark` da Fase 19 já estavam prontos.
- `package-lock.json` **intacto** (`git diff --stat` vazio) — nenhum `npm install`.

## Portão code+data (resultado)

| Passo | Resultado |
|-------|-----------|
| `npm run verify:theme` | exit 0 — "verify:theme OK" |
| Teste de mutação (remover `suppressHydrationWarning`) | verify:theme exit 1 nomeando a falha; restaurado → exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (4 warnings pré-existentes `react-hooks/incompatible-library`, deferidos) |
| `npm run build` | exit 0 (13 rotas geradas) |
| `git diff package-lock.json` | 0 linhas |
| `git diff globals.css` | 0 linhas |

## UAT humano — NÃO-BLOQUEANTE (diferido para sessão com navegador — D-20-04)

Cenários puramente visuais/runtime que o host 4GB não roda junto com a sessão do agente:

1. Clicar o toggle no rodapé da sidebar troca a interface inteira claro↔escuro na hora (THEME-01, SC#1).
2. Escolher escuro, dar refresh (F5) → continua escuro. Fechar e reabrir o navegador → continua escuro (THEME-02, SC#2).
3. Limpar `localStorage` (`theme`), setar o SO em modo escuro, abrir o app → abre escuro; SO em claro → abre claro (THEME-03, SC#3).
4. Hard reload (Ctrl+Shift+R) com tema escuro salvo → a página já pinta escura, sem flash branco (THEME-04, SC#4).
5. Ícone: sol quando claro está ativo, lua quando escuro está ativo (SC#5).

## User Setup Required

None - nenhuma configuração de serviço externo.

## Next Phase Readiness

- Fase 21 (Exportar CSV) é independente da Fase 20 — sem bloqueio.
- Dark mode agora é contrato: `verify:theme` guarda a fiação; qualquer superfície de UI nova deve funcionar nos dois temas (tokens shadcn já cobrem via `verify:brand`).

## Self-Check: PASSED

- Arquivos criados: 3/3 encontrados em disco.
- Commits de task: 3/3 presentes no git log (`f5bb212`, `8935ded`, `2408e40`).
- SUMMARY.md presente.

---
*Phase: 20-tema-dark-mode*
*Completed: 2026-09-04*
