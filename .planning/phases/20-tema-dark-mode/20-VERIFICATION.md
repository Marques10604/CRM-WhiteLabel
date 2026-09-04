---
phase: 20-tema-dark-mode
verified: 2026-09-04T01:00:00Z
status: passed
score: 5/5 must-haves verificados (método code+data)
method: code+data
overrides_applied: 0
re_verification:
  previous_status: none
  note: "Verificação inicial — sem VERIFICATION.md anterior. Feita inline pelo orquestrador (não subagente) por ser fase minúscula + limite de sessão ativo."
deferred:
  - "Confirmação puramente visual dos 5 cenários (troca ao vivo, sem flash em hard reload, preferência do SO, estado do ícone) — UAT humano NÃO-BLOQUEANTE, host 4GB não roda dev+navegador+sessão (D-20-04, precedente Fases 18/19)"
---

# Fase 20: Tema / Dark Mode — Verification Report

**Phase Goal:** O admin passa a escolher entre tema claro e escuro por um controle no rodapé da sidebar; a escolha é lembrada entre sessões, o primeiro acesso segue a preferência do sistema operacional, e nada disso causa flash de cor errada no carregamento.

**Verified:** 2026-09-04
**Status:** passed
**Método:** code+data (leitura da superfície + `verify:theme` + `tsc` + `lint` + `build`) — o host de 4GB não roda `npm run dev` + Chrome + sessão do agente juntos (precedente Fases 18/19). A confirmação puramente visual fica como UAT humano não-bloqueante.

## Goal Achievement

### Observable Truths (Success Criteria da ROADMAP §Phase 20)

| # | Truth | Status | Evidência (code+data) |
| --- | --- | --- | --- |
| 1 | Controle sol/lua no rodapé da sidebar em qualquer rota; acioná-lo troca a interface na hora | ✓ VERIFIED | `theme-toggle.tsx` L44-59: `<button onClick={() => setTheme(isDark ? "light" : "dark")}>` com `<Sun/>`/`<Moon/>`. `app-sidebar.tsx` L76-77: `<div className="mt-auto px-[14px] pt-3 pb-5"><ThemeToggle /></div>` logo após `</nav>`. `find src/app -name layout.tsx` → **só** `src/app/layout.tsx` (sem layout aninhado que esconda a sidebar), então o toggle aparece em todas as 13 rotas. `attribute="class"` + `setTheme` = next-themes troca a classe `.dark` no `<html>` sincronamente. A troca visual "na hora" é o item de UAT não-bloqueante. |
| 2 | O tema escolhido persiste após refresh e ao fechar/reabrir o navegador | ✓ VERIFIED | `layout.tsx` L37-42: `<ThemeProvider>` sem `storageKey` → next-themes persiste em `localStorage` chave `theme` por default (D-20-03, zero código de persistência no projeto). Comportamento documentado do next-themes ^0.4.6. |
| 3 | Sem escolha salva → esquema do sistema operacional | ✓ VERIFIED | `layout.tsx` L39-40: `defaultTheme="system"` + `enableSystem`. |
| 4 | Qualquer página carrega já na cor final — sem flash | ✓ VERIFIED (mecanismo) | `layout.tsx` L34: `suppressHydrationWarning` no `<html>`; `<ThemeProvider attribute="class">` → next-themes injeta o script inline pré-paint automaticamente; L41 `disableTransitionOnChange`. `theme-toggle.tsx` L18-24: guard `mounted` (placeholder que **reserva a altura final** — spacer de ícone `h-[18px] w-[18px]` + `<span className="opacity-0">Tema claro</span>`) evita mismatch de hidratação e nudge de layout. A ausência de flash em hard reload é o item de UAT não-bloqueante; o mecanismo está correto e completo. |
| 5 | O controle indica o tema ativo (sol=claro, lua=escuro) | ✓ VERIFIED | `theme-toggle.tsx` L52-56: `{isDark ? <Moon/> : <Sun/>}` + rótulo `{isDark ? "Tema escuro" : "Tema claro"}` + `aria-label`/`title` dinâmicos. |

**Score:** 5/5 truths verificados

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/components/theme-provider.tsx` | Wrapper client do next-themes | ✓ VERIFIED | 11 linhas; `"use client"`, `React.ComponentProps<typeof NextThemesProvider>`, só repassa props/children |
| `src/components/theme-toggle.tsx` | Botão sol/lua com guard de hidratação | ✓ VERIFIED | 62 linhas; `"use client"`, `useTheme()` → `resolvedTheme`/`setTheme`, guard `mounted`, placeholder de altura reservada, `Sun`/`Moon` de lucide-react, `aria-label` dinâmico. Reusa o idioma de classe do item de nav |
| `src/app/layout.tsx` | ThemeProvider na raiz + `suppressHydrationWarning` | ✓ VERIFIED | `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` envolvendo `<AppSidebar/>` + `<main>` + `<Toaster/>` dentro do `<body>`; `suppressHydrationWarning` no `<html>`. Fontes Geist e `metadata` intactas |
| `src/components/app-sidebar.tsx` | `<ThemeToggle/>` no rodapé (`mt-auto`) | ✓ VERIFIED | `import { ThemeToggle }` (L6); `<div className="mt-auto ...">` após `</nav>` (L76-78). `NAV_ITEMS` e header do selo "S"/"SOLO" intactos |
| `scripts/verify-theme.cjs` + `verify:theme` | Guarda estrutural code+data | ✓ VERIFIED | `npm run verify:theme` → exit 0 ("verify:theme OK"). Node puro, remove comentários antes de casar, acumula falhas. Teste de mutação (executor): remover `suppressHydrationWarning` → exit 1 nomeando a falha |
| `package.json` | +1 script, nenhuma dependência | ✓ VERIFIED | `"verify:theme": "node scripts/verify-theme.cjs"`. `next-themes ^0.4.6` já estava presente. `package-lock.json` intacto (0 linhas de diff) |

### Portão code+data (reverificado pelo orquestrador)

| Comando | Exit | Nota |
| --- | --- | --- |
| `npm run verify:theme` | **0** | "verify:theme OK" |
| `npx tsc --noEmit` | **0** | sem erros de tipo |
| `npm run lint` | **0** | 0 errors; 4 warnings pré-existentes `react-hooks/incompatible-library` (TanStack `useReactTable` em `lead-table.tsx`/`lixeira-table.tsx` — deferidos na Fase 17) + 1 `eslint-disable` documentado novo no guard `mounted` (mesmo falso-positivo do React Compiler já aceito no projeto, STATE.md decisão 07-02) |
| `rm -rf .next && npm run build` | **0** | 13 rotas geradas (Turbopack) |
| `git diff src/app/globals.css` | 0 linhas | tokens `.dark` da Fase 19 intocados |
| `git diff package-lock.json` | 0 linhas | nenhum `npm install` |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| `layout.tsx` | `next-themes` | `<ThemeProvider attribute="class" enableSystem defaultTheme="system">` | ✓ WIRED |
| `app-sidebar.tsx` | `theme-toggle.tsx` | `<ThemeToggle/>` dentro de `<div className="mt-auto ...">` | ✓ WIRED |
| `theme-toggle.tsx` | `next-themes` | `useTheme()` → `setTheme(resolvedTheme === "dark" ? "light" : "dark")` | ✓ WIRED |
| `sonner.tsx` | `next-themes` | `useTheme()` já existente — agora recebe valores reais (antes retornava default sem provider ancestral) | ✓ WIRED (melhoria de brinde, sem regressão) |

### Requisitos

THEME-01, THEME-02, THEME-03, THEME-04 — todos no campo `requirements:` do 20-01-PLAN.md, todos cobertos (ver tabela de truths). 4/4.

## Deviations

1 auto-fix registrado no SUMMARY: `eslint-disable-next-line react-hooks/set-state-in-effect` no `useEffect(() => setMounted(true), [])` — guard de hidratação documentado do next-themes, mesmo falso-positivo do React Compiler já aceito 3× no projeto. Zero mudança de comportamento. Sem scope creep.

## Deferred (não-bloqueante)

Confirmação puramente visual (host 4GB não roda navegador + sessão): a troca claro↔escuro ao vivo ao clicar; ausência de flash branco em hard reload (Ctrl+Shift+R) com tema escuro salvo; abertura no esquema do SO após limpar o `localStorage`; ícone sol/lua acompanhando o tema ativo. Mecanismo verificado por código; falta só a confirmação ocular numa sessão com navegador.
