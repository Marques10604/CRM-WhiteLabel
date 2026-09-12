---
phase: 25-tour-guiado-do-crm
verified: 2026-09-12T00:00:00Z
status: human_needed
score: 9/9 must-haves verificados por código/teste
overrides_applied: 0
human_verification:
  - test: "Limpar a chave `tourVisto` no DevTools (Application → Local Storage) e recarregar `/`"
    expected: "O tour abre sozinho no passo 1 (\"Follow-ups\"), sem exigir clique numa bolinha (beacon), com o realce (spotlight com anel `--ring`) caindo sobre o item certo da sidebar"
    why_human: "React Joyride manipula DOM/portal real (overlay, spotlight, tooltip posicionado via Floating UI) — não há framework de teste de DOM/browser no projeto (host 4GB, sem Jest/Vitest/Playwright), e este agente de verificação não tem navegador disponível nesta sessão"
  - test: "Avançar os 5 passos com \"Próximo\" e conferir a ordem Follow-ups → Leads → Pipeline → Campanhas de nicho → Relatórios, com o último passo mostrando \"Concluir\""
    expected: "Os 5 passos aparecem na ordem correta, apontando para os itens certos da sidebar, com o texto travado do 25-UI-SPEC.md"
    why_human: "Requer navegação real passo-a-passo no Joyride renderizado; grep só prova que o dado/config existe, não que o overlay resolve a posição/target corretamente em runtime"
  - test: "Clicar \"Pular tour\" no passo 2 e recarregar — confirmar que o tour NÃO reaparece"
    expected: "Tour fecha imediatamente sem forçar conclusão; ao recarregar, não reabre sozinho (mas o botão em /configuracoes continua disponível)"
    why_human: "Interação de clique real + reload real do navegador; a lógica pura (`deveGravarComoVisto`) já está testada por harness automatizado (11/11), mas o clique físico no botão e o efeito visual não são verificáveis sem navegador"
  - test: "Ir em /configuracoes, clicar \"Rever tour do CRM\", confirmar que a página recarrega e o tour reinicia do passo 1"
    expected: "Tour reaparece do zero após o clique"
    why_human: "Clique real + reload real; wiring de código já confirmado (`limparTourVisto` + `window.location.reload()` presentes e ligados ao onClick)"
  - test: "Repetir os passos acima nos temas claro e escuro (toggle no rodapé da sidebar) e confirmar contraste legível do tooltip, cor do botão de avanço e overlay suave"
    expected: "Tooltip legível em ambos os temas, usando os tokens OKLCH da marca (`var(--popover)`, `var(--popover-foreground)`, `var(--primary)`), sem cor hardcoded quebrando o contraste"
    why_human: "Qualidade visual/contraste é inerentemente uma checagem humana — grep já confirma ausência de hex/rgb literal e presença dos 4 tokens de cor, mas não confirma legibilidade real renderizada"
---

# Phase 25: Tour Guiado do CRM — Verification Report

**Phase Goal:** Um usuário (na 1ª visita ou quando quiser) recebe um tour guiado apresentando as telas principais do CRM — incluindo as novas telas de campanha/nicho — podendo pular a qualquer passo e reiniciar depois.
**Verified:** 2026-09-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Na 1ª visita, o usuário vê um tour guiado apresentando dashboard, leads, pipeline, relatórios e campanhas de nicho, explicando o que cada tela faz | ✓ VERIFIED (código+config) / pendente confirmação visual | `TOUR_STEPS` (`src/lib/tour-steps.ts`) tem exatamente 5 passos com a cópia travada do UI-SPEC, targets `[data-tour="nav-*"]` que casam 1:1 com os 5 `tourId` reais em `app-sidebar.tsx`; `TourGuiado` monta `<Joyride steps={TOUR_STEPS} run={run} .../>` de fato (não só importado) no `layout.tsx`, com `run` decidido por `lerTourVisto` após guard de montagem. Renderização visual real requer navegador — ver Human Verification #1/#2. |
| 2 | O tour pode ser pulado/fechado a qualquer passo, sem forçar o usuário a terminar | ✓ VERIFIED | `options.buttons: ["back","close","skip","primary"]` inclui `"skip"` explicitamente (default da v3 não inclui); `locale.skip = "Pular tour"` (cópia travada); `handleEvent` grava a flag via `deveGravarComoVisto(data.status)` para AMBOS `"finished"` e `"skipped"` — testado por harness automatizado (11/11 `OK`, rodado nesta sessão). |
| 3 | O usuário reinicia o tour quando quiser por um ponto de acesso fixo | ✓ VERIFIED | `ReiniciarTourButton` importado e renderizado em `src/app/configuracoes/page.tsx` (`grep` + leitura direta confirmam); `onClick` chama `limparTourVisto(window.localStorage)` + `window.location.reload()`. |
| 4 | Estado "já viu o tour" persiste entre acessos, mas fica sempre disponível pra reativação manual | ✓ VERIFIED | `gravarTourVisto`/`lerTourVisto`/`limparTourVisto` puras, testadas contra storage mockado — 11/11 asserções passam (rodado nesta sessão, não apenas confiado do SUMMARY); `try/catch` protege contra falha de storage (WR-02 corrigido, confirmado por leitura do código atual). |
| 5 | Implementação usa React Joyride — nenhuma lib concorrente, nenhum SaaS externo (TUTORIAL-04) | ✓ VERIFIED | `npm ls react-joyride` (rodado nesta sessão) → `react-joyride@3.2.0`, única entrada; `package.json` tem pin exato `"3.2.0"`, sem `^`/`~`. |
| 6 | API real da v3 (nomes de export/callback/campos) confirmada contra o `.d.ts` publicado, não presumida da v2 | ✓ VERIFIED | Confirmado por leitura direta de `node_modules/react-joyride/dist/index.d.cts`: `Joyride` (named export), `onEvent`/`EventData` (não `callback`/`CallBackProps`), `skipBeacon` (não `disableBeacon`), `styles.spotlight: SVGAttributes<SVGPathElement>` (campo real usado no fix WR-01), `Options.borderRadius` de fato não existe (código usa `styles.tooltip.borderRadius` corretamente). |
| 7 | Os 3 achados do code review (WR-01/02/03) foram de fato corrigidos no código, não apenas no REVIEW-FIX.md | ✓ VERIFIED | Leitura direta de `tour-guiado.tsx` (linha 79: `spotlight: { stroke: "var(--ring)", strokeWidth: 2 }`; linha 44: `useCallback`) e `tour-persistence.ts` (`try/catch` nas 3 funções de storage) confirma os fixes no código atual, commit `3524358`. |
| 8 | Gates automatizados realmente passam (não apenas alegados) | ✓ VERIFIED | Re-executados nesta sessão de verificação: `npx tsc --noEmit` limpo; `npm run lint` 0 erros (4 warnings pré-existentes de `lead-table.tsx`/`lixeira-table.tsx`, não relacionados à Fase 25); `node scripts/test-tour-persistence.cjs` 11/11 `OK`. `npm run build` não re-executado nesta sessão (custo alto em host 4GB) — aceito como já verde por instrução explícita do prompt de tarefa. |
| 9 | Cores 100% tokenizadas, zero hardcode (regra dura do projeto) | ✓ VERIFIED | `grep -Ec '#[0-9a-fA-F]{3,8}\|rgba?\('` em `tour-guiado.tsx` → 0; todas as cores usam `var(--primary)`, `var(--popover)`, `var(--popover-foreground)`, `var(--foreground)` (via `color-mix`), `var(--ring)`. |

**Score:** 9/9 truths verified (por código/teste automatizado; 5 delas ainda pedem confirmação visual humana — ver seção abaixo)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/tour-steps.ts` | Array `TOUR_STEPS`, 5 passos, cópia travada | ✓ VERIFIED | Existe, exporta `TOUR_STEPS: Step[]`, 5 entradas, cópia literal confirmada por leitura contra `25-UI-SPEC.md` |
| `src/lib/tour-persistence.ts` | 5 funções puras de persistência | ✓ VERIFIED | `TOUR_STORAGE_KEY`, `deveGravarComoVisto`, `lerTourVisto`, `gravarTourVisto`, `limparTourVisto` — todas presentes, testadas, com `try/catch` (WR-02 fix) |
| `src/components/tour-guiado.tsx` | Wrapper cliente do Joyride | ✓ VERIFIED | `"use client"`, guard `mounted`, `<Joyride>` renderizado de fato com `steps`/`run`/`onEvent` ligados, `useCallback` (WR-03 fix), `spotlight`/`--ring` (WR-01 fix) |
| `src/components/reiniciar-tour-button.tsx` | Botão de reinício | ✓ VERIFIED | `"use client"`, `limparTourVisto` + `reload()`, cópia travada "Rever tour do CRM" |
| `src/components/app-sidebar.tsx` | 5 alvos `data-tour` | ✓ VERIFIED | 5 `tourId` corretos, `data-tour={item.tourId}` emitido incondicionalmente, 7 itens restantes intactos |
| `src/app/layout.tsx` | Montagem de `<TourGuiado />` | ✓ VERIFIED | Import + `<TourGuiado />` como irmão de `<AppSidebar />`/`{children}`, dentro do `ThemeProvider` |
| `src/app/configuracoes/page.tsx` | Renderização do botão | ✓ VERIFIED | Import + `<ReiniciarTourButton />` como irmão de `<ConfiguracoesForm />` |
| `scripts/test-tour-persistence.cjs` | Harness de teste | ✓ VERIFIED | 11 asserções, todas passam (rodado nesta sessão) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `layout.tsx` | `tour-guiado.tsx` | `<TourGuiado />` | ✓ WIRED | Montado como irmão de `{children}`, dentro do `ThemeProvider` |
| `tour-guiado.tsx` | `react-joyride` | `<Joyride steps run onEvent options styles>` | ✓ WIRED | Renderizado de fato, não só importado |
| `tour-guiado.tsx` | `tour-steps.ts` | `TOUR_STEPS` | ✓ WIRED | Prop `steps` |
| `tour-guiado.tsx` | `tour-persistence.ts` | `deveGravarComoVisto`/`lerTourVisto`/`gravarTourVisto` | ✓ WIRED | Chamadas reais dentro do `useEffect`/`handleEvent` |
| `tour-steps.ts` | `app-sidebar.tsx` | seletor `[data-tour="nav-*"]` | ✓ WIRED | 5 slugs casam 1:1 |
| `reiniciar-tour-button.tsx` | `tour-persistence.ts` | `limparTourVisto` | ✓ WIRED | Import + chamada real no handler |
| `configuracoes/page.tsx` | `reiniciar-tour-button.tsx` | `<ReiniciarTourButton />` | ✓ WIRED | Import + render confirmados |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `react-joyride` é a única lib de tour instalada | `npm ls react-joyride` | `react-joyride@3.2.0` | ✓ PASS |
| Persistência pura funciona (11 asserções) | `node scripts/test-tour-persistence.cjs` | 11/11 `OK`, exit 0 | ✓ PASS |
| Projeto compila sem erro de tipo | `npx tsc --noEmit` | saída limpa | ✓ PASS |
| Lint sem erros novos | `npm run lint` | 0 erros, 4 warnings pré-existentes (arquivos não tocados pela fase) | ✓ PASS |
| Build completo (15 rotas) | `npm run build` | não re-executado nesta sessão (custo alto, host 4GB) — aceito verde por instrução explícita da tarefa, confirmado no `25-02-SUMMARY.md` | ? SKIP (aceito por instrução) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TUTORIAL-01 | 25-01, 25-02 | Tour na 1ª visita, 5 telas explicadas | ✓ SATISFIED (código) / pendente visual | `TOUR_STEPS` + `TourGuiado` + sidebar `data-tour` |
| TUTORIAL-02 | 25-01, 25-02 | Pular/fechar a qualquer passo | ✓ SATISFIED | `options.buttons` com `"skip"`, `deveGravarComoVisto` cobre `finished`+`skipped`, testado |
| TUTORIAL-03 | 25-02 | Reiniciar por ponto de acesso fixo | ✓ SATISFIED | `ReiniciarTourButton` em `/configuracoes` |
| TUTORIAL-04 | 25-01 | Só React Joyride, nenhuma lib concorrente | ✓ SATISFIED | `npm ls react-joyride` confirma única lib |
| TUTORIAL-05 | 25-01, 25-02 | Persiste mas reativável | ✓ SATISFIED | `gravarTourVisto`/`limparTourVisto` testados, `try/catch` (WR-02) |

Nenhum requisito órfão encontrado (todos os 5 TUTORIAL-* aparecem no `requirements:` de algum dos 2 planos).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/app-sidebar.tsx` / `src/lib/tour-steps.ts` | — | `tourId`/`data-tour` duplicados como strings soltas em 2 arquivos, sem constante compartilhada nem checagem de sincronismo (IN-01 do code review) | ℹ️ Info | Não bloqueia — lista pequena e estável (5 itens), mas é uma armadilha de manutenção futura se um dos lados for renomeado sem o outro. Não corrigido (aceito como out-of-scope pelo `25-REVIEW-FIX.md`, info-level). |
| `src/components/reiniciar-tour-button.tsx` | 4, 18 | `grep -c 'limparTourVisto'` retorna 2 (import + chamada), documentado no `25-02-SUMMARY.md` como discrepância conhecida e não-problemática da própria acceptance criteria do plano | ℹ️ Info | Não é um bug — é uma propriedade inerente de qualquer import nomeado + uso. Não afeta comportamento. |

Nenhum `TBD`/`FIXME`/`XXX` sem referência de issue encontrado nos arquivos da fase. Nenhum placeholder, nenhum handler vazio, nenhum retorno estático substituindo dado real.

### Human Verification Required

### 1. Tour abre sozinho na 1ª visita

**Test:** Limpar `tourVisto` no DevTools (Application → Local Storage) e recarregar `/`
**Expected:** O tour abre sozinho no passo 1 ("Follow-ups"), sem exigir clique numa bolinha (beacon), com o realce (anel `--ring`) sobre o item certo da sidebar
**Why human:** Joyride manipula DOM/portal real; sem navegador disponível nesta sessão de verificação, e o projeto não tem framework de teste de DOM/browser

### 2. Ordem e conteúdo dos 5 passos

**Test:** Avançar com "Próximo" pelos 5 passos
**Expected:** Ordem Follow-ups → Leads → Pipeline → Campanhas de nicho → Relatórios, último botão "Concluir"
**Why human:** Requer navegação real passo-a-passo; grep prova config, não runtime

### 3. Pular tour não reabre sozinho

**Test:** Clicar "Pular tour" no passo 2, recarregar
**Expected:** Tour fecha, não reaparece sozinho ao recarregar
**Why human:** Clique real + reload real; lógica pura já testada, mas efeito visual não

### 4. Reinício manual funciona

**Test:** Ir em `/configuracoes`, clicar "Rever tour do CRM"
**Expected:** Página recarrega, tour reinicia do passo 1
**Why human:** Clique real + reload real

### 5. Legibilidade em claro/escuro

**Test:** Repetir os testes 1-2 nos dois temas
**Expected:** Tooltip legível, cores da marca, overlay suave, sem cor quebrando contraste
**Why human:** Qualidade visual/contraste é inerentemente humana

### Gaps Summary

Nenhum gap bloqueante. Toda a superfície de código, wiring e testes automatizados da
Fase 25 está implementada e verificada de forma independente nesta sessão (não apenas
confiada dos SUMMARYs). Os 3 achados do code review anterior (WR-01/02/03) foram
confirmados corrigidos por leitura direta do código atual, não apenas do REVIEW-FIX.md.
O único item remanescente do code review (IN-01) é info-level e não bloqueia.

A fase fica em `human_needed` exclusivamente pela verificação visual/interativa real no
navegador, que está fora do escopo desta sessão de verificação (sem navegador
disponível no host) — consistente com o padrão já aceito nas Fases 22-24.

---

_Verified: 2026-09-12_
_Verifier: Claude (gsd-verifier)_
