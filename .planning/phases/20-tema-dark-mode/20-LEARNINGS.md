---
phase: 20
phase_name: "tema-dark-mode"
project: "CRM de Leads"
generated: "2026-09-04"
counts:
  decisions: 5
  lessons: 4
  patterns: 3
  surprises: 3
missing_artifacts: []
---

# Phase 20 Learnings: tema-dark-mode

## Decisions

### D-16 da Fase 19 suspensa
A constraint "sem ThemeProvider / sem toggle de tema" (Fase 19, D-16) foi explicitamente suspensa por decisão do milestone v1.6.

**Rationale:** Os tokens `.dark` já existiam e estavam verificados WCAG AA 30/30 desde a Fase 19; faltava só o mecanismo de alternância. O milestone v1.6 é justamente "ligar o dark mode + export CSV".
**Source:** 20-01-PLAN.md, 20-01-SUMMARY.md

### Toggle alterna só `light`↔`dark`, sem 3º estado
O botão não tem um estado `system`. `system` é o `defaultTheme` (1º acesso), coberto por `enableSystem`.

**Rationale:** YAGNI para 1 usuário. "Agendamento de tema" já está em Out of Scope no REQUIREMENTS.md.
**Source:** 20-01-PLAN.md (D-20-02)

### Persistência = 100% `next-themes`, zero código no projeto
THEME-02 (persistência entre sessões) é resolvido inteiramente pela chave `localStorage` `theme` do `next-themes`.

**Rationale:** Não reimplementar o que a lib já faz. Sem `storageKey` override → default.
**Source:** 20-01-PLAN.md (D-20-03)

### Verificação por code+data
Os 5 cenários puramente visuais (troca ao vivo, sem flash em hard reload, preferência do SO, ícone) ficam como UAT humano NÃO-BLOQUEANTE.

**Rationale:** Host 4GB não roda `dev` + Chrome + sessão do agente juntos (precedente Fases 18/19). O mecanismo é verificável por código (`suppressHydrationWarning`, `attribute="class"`, script pré-paint); a confirmação ocular fica diferida.
**Source:** 20-01-PLAN.md (D-20-04), 20-VERIFICATION.md

### Ship por push direto na `main`
Sem PR — consistente com as Fases 16-19 (projeto solo, sem revisor).
**Source:** 20-01-PLAN.md (D-20-05)

---

## Lessons

### Executor bateu no limite de sessão DEPOIS de commitar todo o trabalho
O `gsd-executor` (Sonnet) completou as 3 tasks e commitou (`f5bb212`/`8935ded`/`2408e40`) antes do 429 (limite de sessão). Só faltou fechar o tracking (SUMMARY/STATE/ROADMAP).

**Context:** O commit atômico por task salvou o trabalho — o orquestrador recuperou fechando o tracking e reverificando o portão por conta própria. Lição: commits atômicos por task tornam a fase resiliente a interrupção sem handoff, e o orquestrador pode fechar o que o executor não conseguiu.
**Source:** task notification (429), 20-01-SUMMARY.md §Performance

### O `useEffect(() => setMounted(true), [])` do `next-themes` dispara o falso-positivo do React Compiler
`npm run lint` saiu exit 1 no portão — `react-hooks/set-state-in-effect` no guard `mounted` (padrão documentado do `next-themes`).

**Context:** Mesmo falso-positivo já aceito 3× no projeto (STATE.md decisão 07-02; `lead-timeline-dialog.tsx`, `whatsapp-preview-dialog.tsx`, `configuracoes-form.tsx`). O executor auto-corrigiu com `eslint-disable-next-line` documentado. 4ª ocorrência do mesmo padrão — já é rotina.
**Source:** 20-01-SUMMARY.md §Deviations

### O placeholder de hidratação precisa reservar a altura final explicitamente
O plan-checker (C2) pegou: um placeholder "sem ícone" colapsa pra ~metade da altura e o rodapé da sidebar dá um nudge vertical quando `mounted` vira `true`.

**Context:** A `className` base do botão não basta — sem conteúdo, a line-box colapsa. Solução: spacer de ícone (`h-[18px] w-[18px]`) + `<span className="opacity-0">Tema claro</span>` para reservar a linha de texto.
**Source:** 20-REVIEW (plan-checker C2), 20-01-SUMMARY.md

### `sonner.tsx` já consumia `useTheme()` sem provider ancestral
Antes da Fase 20, o `<Toaster />` chamava `useTheme()` e recebia o default (`"system"`) porque não havia `ThemeProvider` na árvore.

**Context:** Ao montar o `ThemeProvider` envolvendo o `<Toaster />`, o toast passa a receber o tema real — melhoria de brinde, sem regressão. Vale checar consumidores existentes de uma API antes de assumir que ela está "morta".
**Source:** 20-VERIFICATION.md §Key Link Verification

---

## Patterns

### Wrapper client fino de lib de terceiros
`theme-provider.tsx` = `"use client"` + `React.ComponentProps<typeof NextThemesProvider>` + passthrough puro (`<NextThemesProvider {...props}>{children}</NextThemesProvider>`).

**When to use:** Qualquer lib que exige um provider client-side num app com Server Components — isola o `"use client"` num arquivo de 11 linhas, o `layout.tsx` (server) só importa e usa.
**Source:** 20-01-SUMMARY.md, src/components/theme-provider.tsx

### Guard `mounted` + placeholder de altura reservada
Componente que lê `resolvedTheme` (ou qualquer valor que o servidor não conhece): `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`. Enquanto `!mounted`, renderizar um placeholder com a MESMA className base e conteúdo que reserva a altura final (spacer + texto `opacity-0`).

**When to use:** Qualquer botão/indicador que dependa de estado só-cliente e viva num layout de largura/altura fixa. Evita mismatch de hidratação E layout shift.
**Source:** src/components/theme-toggle.tsx

### Guarda estrutural `.cjs` para fiação multi-arquivo
`scripts/verify-theme.cjs` (Node puro, remove comentários antes de casar, acumula falhas, `process.exit(1)` nomeando cada uma) amarra os 4 arquivos da fiação de tema. Registrado como `npm run verify:theme`, provado por teste de mutação.

**When to use:** Feature cujo funcionamento depende de várias peças em arquivos diferentes estarem alinhadas (aqui: `suppressHydrationWarning` no layout + `attribute="class"` no provider + `<ThemeToggle>` na sidebar + `verify:theme` no package.json). Mesmo molde de `verify-brand-md.cjs` / `verify-origem-tipo.cjs`.
**Source:** 20-01-SUMMARY.md §patterns-established

---

## Surprises

### A fase inteira executou em ~7 minutos
3 tasks, 6 arquivos (3 criados), portão code+data completo.

**Impact:** Nenhum. Fase genuinamente pequena + `next-themes` já instalado + tokens `.dark` prontos = quase nada de trabalho novo. O custo real foi o planejamento (planner + plan-checker) e a recuperação do rate-limit.
**Source:** 20-01-SUMMARY.md §Performance

### `npm run build` demorou muito mais que o normal no host
O build (Turbopack, 13 rotas) estourou o timeout de 120s da ferramenta e teve que ir pra background.

**Impact:** Nenhum no resultado (exit 0), mas confirma que o host de 4GB está no limite mesmo para um build que a Fase 19 rodava em ~40-57s. Fechar processos node antes ajuda.
**Source:** execução do portão de verificação

### `next-themes` já era dependência há tempos, sem provider
`next-themes ^0.4.6` estava em `package.json` desde o scaffold do shadcn (o `sonner` do shadcn importa `useTheme`), mas nunca teve um `ThemeProvider` — ficou "meio instalado" por meses.

**Impact:** A Fase 20 não instalou nada — só ativou o que já estava lá. `check:contrast` da Fase 19 tinha até verificado os tokens `.dark` sabendo que um dia isso seria ligado.
**Source:** 20-01-SUMMARY.md, package.json
