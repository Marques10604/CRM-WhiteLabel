# Phase 25: Tour Guiado do CRM - Research

**Researched:** 2026-09-12
**Domain:** Onboarding guiado client-side (React Joyride) num app Next.js 16 App Router / React 19, sem novo schema
**Confidence:** MEDIUM-HIGH (achado crítico: a lib está numa reescrita major recente — ver `State of the Art`)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| TUTORIAL-01 | Na 1ª visita, usuário vê tour guiado apresentando dashboard, leads, pipeline, relatórios e campanhas de nicho, explicando o que cada tela faz | Pattern 1 (tour ancorado na sidebar, 5 passos com `content` descritivo por tela) + Code Examples (`TourGuiado`, `tour-steps.ts`) |
| TUTORIAL-02 | Tour pode ser pulado/fechado a qualquer passo, sem forçar conclusão | `options.buttons` incluindo `skip`/`close` (Pitfall 4) + `onEvent` gravando a flag em AMBOS os status `finished` e `skipped` (Code Examples, `handleEvent`) |
| TUTORIAL-03 | Usuário reinicia o tour quando quiser, por ponto de acesso fixo (menu/configurações) | Pattern arquitetural: `ReiniciarTourButton` em `/configuracoes` (tela já existente, Architecture Patterns > System Architecture Diagram) |
| TUTORIAL-04 | Implementação usa React Joyride — nenhuma lib concorrente, nenhum SaaS externo | Standard Stack + Package Legitimacy Audit (versão 3.2.0 verificada, único pacote de tour instalado) |
| TUTORIAL-05 | Estado "já viu o tour" persiste entre acessos, mas fica sempre disponível pra reativação manual | Persistência via `localStorage` (Summary, Alternatives Considered) espelhando o precedente de `next-themes`; Validation Architecture mapeia TUTORIAL-05 a um harness de função pura testável |
</phase_requirements>

## Summary

React Joyride (`react-joyride`, npm) é o pacote certo e já travado por `TUTORIAL-04`. A verificação ao vivo no registro do npm mostra a versão atual **3.2.0**, publicada em **2026-07-09** — só ~2 meses antes desta pesquisa. Isso importa mais do que uma versão normal: o próprio README do projeto anuncia que a v3 é uma **reescrita com breaking changes** (export nomeado em vez de default, `callback` virou `onEvent`, `run` agora nasce `false`, propriedades de tema migraram para um prop `options` separado, hook `useJoyride` substitui `getHelpers`). Grande parte do conhecimento "genérico" sobre Joyride circulando em blogs/StackOverflow (e no meu próprio treinamento) é da v2 e **não bate 1:1 com a v3** — todo trecho de API abaixo foi confirmado direto na doc oficial (`react-joyride.com/docs/*`) nesta sessão, mas o executor do plano deve reconferir contra `node_modules/react-joyride`'s tipos TypeScript ao instalar (prática já usual neste projeto, ver `Assumptions Log`).

O pacote é maduro fora da rescrita de API: publicado pela primeira vez em 2015, ~1M downloads/semana, licença MIT, mantido pelo mesmo autor (`gilbarbara`), sem `postinstall` suspeito. Peer deps declaram `react`/`react-dom`: `"16.8 - 19"` — compatível com React 19.2.7 do projeto. O README também afirma "SSR-safe: Works with Next.js" — mitigando o receio de `window is not defined`, mas a prática recomendada (guard de montagem client-side) já é o padrão estabelecido neste projeto (`next-themes`/`ThemeToggle`) e deve ser repetido por precaução e paridade de código.

A descoberta arquitetural mais importante desta pesquisa: a sidebar (`src/components/app-sidebar.tsx`) é renderizada **uma única vez no root layout**, fora de `{children}`, e fica visível em **todas as rotas simultaneamente** (Follow-ups, Leads, Pipeline, Campanhas, Mapa de Nichos, Relatórios, etc. são todos itens da mesma lista `NAV_ITEMS`). Isso significa que a forma **mais simples e robusta** de atender TUTORIAL-01 é um tour de 5 passos que aponta para os 5 itens de navegação da sidebar — **sem nenhuma navegação real entre páginas**, sem `router.push`, sem esperar RSC re-renderizar, sem risco de "target not found" por timing de rota. A forma "clássica" de tour multi-rota (usar o hook `before` do Joyride pra navegar e aguardar o alvo aparecer na página de destino) existe e é documentada oficialmente, mas é estritamente mais arriscada neste host (4GB RAM, sem browser+agente rodando junto para depurar timing) e deve ser tratada como opção secundária/enhancement, não a entrega mínima da fase.

**Recomendação primária:** montar um único componente cliente `TourGuiado` no root layout (irmão de `{children}`, como o `ThemeProvider`), guiando um Joyride de 5 passos que aponta para os `<Link>` da sidebar (`data-tour="nav-dashboard"` etc.), com `run` controlado por estado React inicializado a partir de `localStorage` (mesmo padrão de persistência client-only já em uso pelo `next-themes`), e um botão "Reiniciar tour" fixo em `/configuracoes` (tela que já existe) que zera a flag e reativa `run=true`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Renderização do tour (overlay, spotlight, tooltip) | Browser / Client | — | Joyride manipula DOM/portal, mede posição de elementos via Floating UI — só existe no cliente |
| Estado "já viu o tour" (persistência) | Browser / Client (localStorage) | — | Preferência de UI de um único admin/navegador, sem necessidade de sobreviver a troca de máquina/navegador — mesmo padrão já usado por `next-themes` neste projeto (não existe backend de sessão/conta) |
| Alvo dos passos (elementos da sidebar/página) | Frontend Server (SSR) via Server Components | Browser / Client | Os itens de nav e os títulos de página já são renderizados no servidor (Server Components); só precisam ganhar atributos `data-tour="..."` estáticos — não exige converter nada para Client Component |
| Ponto de acesso fixo para reiniciar (TUTORIAL-03) | Browser / Client | Frontend Server (`/configuracoes` já existe como página) | Botão client-side que só limpa `localStorage` + dispara `run=true`; a página `/configuracoes` em si é Server Component, o botão é um pequeno Client Component filho |
| API / Backend | — | — | Nenhuma — fase inteira é UI/lib cliente, zero Server Action nova, zero coluna nova |
| Database / Storage | — | — | Explicitamente fora de escopo (fase "sem acoplamento de dados/schema" por descrição) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-joyride` | `3.2.0` [VERIFIED: npm registry — `npm view react-joyride version`, 2026-09-12] | Tour guiado passo-a-passo com overlay/spotlight/tooltip | Mandatado por TUTORIAL-04; único player relevante da categoria em React, mantido desde 2015, ~1M downloads/semana |

### Supporting
Nenhuma biblioteca de apoio nova é necessária. O projeto já tem tudo que o tour precisa:
- `next-themes` (já instalado) — não usado diretamente pelo tour, mas é o precedente de padrão "preferência client-only via localStorage com guard de montagem" que a Fase 25 deve replicar para a flag "já viu o tour".
- Tokens OKLCH de `src/app/globals.css` (marca já definida na Fase 19) — usados para customizar `styles`/`options` do Joyride (cor primária, fundo do tooltip, cor do overlay) em vez dos defaults em preto/branco da lib.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Joyride | Shepherd.js, Intro.js, `driver.js`, react-joyride forks | Nenhuma é aceitável aqui — TUTORIAL-04 trava a lib explicitamente ("nenhuma biblioteca de tour concorrente"). Não pesquisado além disso. |
| localStorage para "já viu o tour" | Coluna nova em `configuracoes` (tabela singleton já existente, `src/db/schema.ts`) | Union viável, mas contradiz o espírito "zero acoplamento de dados/schema" da descrição da fase e obrigaria migração `.cjs` + Server Action + Zod para persistir uma preferência de UI pura — trabalho desproporcional ao problema, e sem benefício real numa ferramenta solo/single-browser (CLAUDE.md: "acesso via navegador no computador", sem multiusuário) |

**Installation:**
```bash
npm install react-joyride
```

**Version verification:** confirmada ao vivo via `npm view react-joyride version` (retornou `3.2.0`) e `npm view react-joyride time.created`/`time.modified` (primeira publicação 2015-09-04, última publicação da versão atual 2026-07-09). Downloads semanais via `https://api.npmjs.org/downloads/point/last-week/react-joyride` = ~1.002.744/semana em 2026-09-05..09-11.

## Package Legitimacy Audit

> `slopcheck` não pôde ser instalado nesta sessão — o host não tem `pip`/`pip3` disponível no PATH (`command -v pip` e `pip3` retornaram vazio). Seguindo o protocolo de degradação graciosa, o pacote abaixo é marcado `[ASSUMED]` mesmo com evidência forte de legitimidade, e o planner deve inserir um `checkpoint:human-verify` antes do `npm install`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `react-joyride` | npm | 10 anos (1ª publicação 2015-09-04) | ~1.002.744/semana (2026-09-05..11) | `github.com/gilbarbara/react-joyride` (confirmado via `npm view repository.url` e via `gh api repos/gilbarbara/react-joyride`) | não executado (pip ausente) — `[ASSUMED]` | Aprovado, mas com checkpoint humano antes do install (protocolo de degradação) |

**Packages removed due to slopcheck [SLOP] verdict:** nenhum (slopcheck não rodou)
**Packages flagged as suspicious [SUS]:** nenhum
**Verificação adicional feita manualmente (fallback ao slopcheck ausente):** licença MIT confirmada (`npm view react-joyride license`); `npm view react-joyride scripts.postinstall` retornou vazio (sem script de pós-instalação suspeito); `peerDependencies` = `{ react: "16.8 - 19", react-dom: "16.8 - 19" }`, compatível com `react@^19.2.7`/`react-dom@^19.2.7` já no `package.json`; nenhuma dependência transitiva com nome estranho (`@fastify/deepmerge`, `@floating-ui/react-dom`, `@gilbarbara/*`, `is-lite`, `react-innertext`, `scroll`, `scrollparent`, `use-sync-external-store` — todos pacotes conhecidos/estabelecidos).

## Architecture Patterns

### System Architecture Diagram

```
Root Layout (Server Component, src/app/layout.tsx)
│
├── ThemeProvider (Client, já existe)
│    ├── AppSidebar (Client, já existe — visível em TODAS as rotas)
│    │     └── <Link data-tour="nav-dashboard"> ... </Link>  (5 itens ganham data-tour)
│    │
│    ├── TourGuiado (Client, NOVO — irmão de {children}, monta 1x)
│    │     ├── lê localStorage("tourVisto") no mount (useEffect)
│    │     ├── decide `run` inicial (true só se 1ª visita)
│    │     ├── <Joyride steps={STEPS} run={run} onEvent={...} .../>
│    │     └── grava localStorage ao receber status finished/skipped
│    │
│    ├── {children}  ← page.tsx de cada rota (Server Component, inalterado
│    │                  exceto se optar por passos "on-page" — ver Pattern 2)
│    │
│    └── Toaster
│
└── ConfiguracoesPage (Server Component, já existe)
      └── ReiniciarTourButton (Client, NOVO — filho pequeno)
            └── onClick: localStorage.removeItem("tourVisto") + dispara
                 evento/contexto que seta run=true no TourGuiado
```

Fluxo do caso principal (1ª visita): usuário abre qualquer rota → `TourGuiado` monta → lê `localStorage` (vazio) → seta `run=true` → Joyride desenha overlay + spotlight sobre o 1º item da sidebar (`data-tour="nav-dashboard"`) com tooltip explicando a tela → usuário navega os 5 passos (Próximo/Voltar) ou fecha/pula a qualquer momento → `onEvent` recebe `status` `finished` ou `skipped` → grava `localStorage.setItem("tourVisto", "true")` → tour não reaparece sozinho.

Fluxo de reativação manual (TUTORIAL-03): usuário vai em `/configuracoes` → clica "Reiniciar tour guiado" → `localStorage` é limpo/flag setada para `false` → `run` volta a `true` (via um pequeno estado compartilhado — Pattern abaixo) → tour roda de novo, de qualquer rota em que o usuário esteja quando clicar (ou após navegar de volta para onde a sidebar esteja visível, o que é sempre, já que ela é global).

### Recommended Project Structure
```
src/
├── components/
│   ├── app-sidebar.tsx           # MODIFICADO: data-tour="nav-*" nos 5 <Link> relevantes
│   ├── tour-guiado.tsx           # NOVO — Client Component, monta o <Joyride>, dono do estado run
│   ├── theme-toggle.tsx          # referência de padrão (não tocado)
│   └── reiniciar-tour-button.tsx # NOVO — Client Component pequeno, usado em /configuracoes
├── hooks/
│   └── use-tour-guiado.ts        # NOVO (opcional) — encapsula leitura/escrita de localStorage +
│                                  # estado run, seguindo o precedente de use-first-contact-trigger.ts
├── lib/
│   └── tour-steps.ts             # NOVO — array `STEPS` puro (sem JSX pesado), testável sem DOM
└── app/
    ├── layout.tsx                # MODIFICADO: monta <TourGuiado /> irmão de {children}
    └── configuracoes/
        └── page.tsx              # MODIFICADO: renderiza <ReiniciarTourButton />
```

### Pattern 1: Tour ancorado na sidebar (RECOMENDADO — zero navegação)
**What:** todos os 5 passos do tour têm `target` apontando para um item da `AppSidebar` (ex.: `[data-tour="nav-dashboard"]`), nunca para conteúdo de página. Como a sidebar é montada 1x no root layout e persiste em toda navegação, os 5 alvos existem no DOM o tempo todo — o Joyride nunca precisa esperar uma rota carregar.
**When to use:** esta é a estratégia default para a Fase 25 — cobre TUTORIAL-01 (explica o que cada tela faz, via `content` do passo) com o menor risco técnico possível.
**Example:**
```tsx
// src/lib/tour-steps.ts — Fonte: react-joyride.com/docs/getting-started (v3, confirmado nesta sessão)
import type { Step } from "react-joyride";

export const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Follow-ups",
    content: "Aqui ficam os follow-ups vencidos, de hoje e dos próximos 7 dias — o painel que evita esquecer um lead.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-leads"]',
    title: "Leads",
    content: "A lista completa de leads, com filtros por nicho, etapa e origem.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-pipeline"]',
    title: "Pipeline",
    content: "O funil de vendas em quadro — arraste um lead entre as etapas conforme ele avança.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-campanhas"]',
    title: "Campanhas de nicho",
    content: "Organize a exploração de um nicho novo: oferta, janela de tempo, diagnóstico de IA e veredito final.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-relatorios"]',
    title: "Relatórios",
    content: "Métricas do funil: conversão, motivos de perda e origem dos leads no período.",
    placement: "right",
  },
];
```
```tsx
// src/components/app-sidebar.tsx — apenas ADICIONA data-tour aos itens já existentes
const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock, tourId: "nav-dashboard" },
  { href: "/leads", label: "Leads", icon: Users, tourId: "nav-leads" },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, tourId: "nav-pipeline" },
  { href: "/campanhas", label: "Campanhas", icon: Target, tourId: "nav-campanhas" },
  { href: "/mapa-de-nichos", label: "Mapa de Nichos", icon: MapIcon },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, tourId: "nav-relatorios" },
  // ...resto inalterado
] as const;
// no <Link>: data-tour={item.tourId}
```

### Pattern 2: Tour multi-rota com navegação real (ENHANCEMENT opcional, não recomendado como entrega mínima)
**What:** cada passo aponta para um elemento *dentro* da própria tela (ex.: o quadro Kanban em `/pipeline`, não o item da sidebar), usando o hook `before` do passo para chamar `router.push()` e aguardar o Joyride localizar o alvo na nova rota via `targetWaitTimeout`.
**When to use:** só se o usuário/planner explicitamente quiser destacar elementos de conteúdo (não apenas nav) — mais fiel visualmente, mas estritamente mais frágil: depende de quão rápido o Next.js re-renderiza o RSC da rota de destino, e o host de 4GB (sem browser+agente juntos, precedente Fases 18-20) dificulta depurar timing ao vivo.
**Example (documentado oficialmente, `react-joyride.com/docs/recipes`):**
```tsx
// Source: react-joyride.com/docs/recipes (v3) — CITADO, resumo de fetch nesta sessão
{
  target: '[data-tour="pipeline-board"]',
  content: "O funil de vendas em quadro.",
  before: async () => {
    router.push("/pipeline");
    await new Promise((resolve) => setTimeout(resolve, 300)); // dar tempo do RSC responder
  },
}
```
Se esta rota for escolhida, **aumentar `targetWaitTimeout`** (default 1000ms) para 5000-8000ms nos passos que cruzam navegação, dado que Next.js precisa buscar/renderizar o RSC payload da rota nova antes do elemento existir no DOM.

### Recommended: guard de montagem client-side (mesmo padrão de `next-themes`)
**What:** como `localStorage` só existe no navegador, o componente `TourGuiado` deve seguir o MESMO padrão já usado em `ThemeToggle` (`useEffect` + `mounted` state) para nunca tentar ler `localStorage` durante o SSR/1º render, evitando hydration mismatch — mesmo o README do Joyride v3 dizendo "SSR-safe".
**Example:**
```tsx
// Fonte: padrão já em produção em src/components/theme-toggle.tsx (Fase 20)
const [mounted, setMounted] = useState(false);
// eslint-disable-next-line react-hooks/set-state-in-effect  -- mesmo precedente aceito (STATE.md decisão 07-02)
useEffect(() => setMounted(true), []);
if (!mounted) return null; // Joyride não deve nem montar no SSR/1ª pintura
```

### Anti-Patterns to Avoid
- **Montar `<Joyride>` dentro de uma página específica (ex.: dentro de `page.tsx` de `/pipeline`):** isso desmonta o tour ao navegar para outra rota (mesmo com soft-navigation do App Router, se o componente não estiver no layout persistente). O tour DEVE morar no root layout, irmão de `{children}`, exatamente como `ThemeProvider`/`AppSidebar` já fazem.
- **Usar `window.location.href` para navegar entre passos (Pattern 2):** força reload de página completo, destruindo o estado do Joyride e reiniciando o tour do zero. Usar `router.push()` do `next/navigation` (soft navigation).
- **Confiar em código/exemplos "genéricos" de Joyride sem checar a versão instalada:** dado o salto de API v2→v3 (ver `State of the Art`), qualquer snippet de blog/StackOverflow que use `import Joyride from 'react-joyride'` (default export) ou `callback={handleCallback}` é v2 e vai falhar silenciosamente ou quebrar o build na v3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Overlay + spotlight + tooltip posicionado | Um sistema custom de `position: absolute` calculando coordenadas do elemento-alvo | `react-joyride` (`Joyride`/`useJoyride`) | Mandatado por TUTORIAL-04; reinventar cálculo de posição/scroll/foco é exatamente o tipo de problema que a lib resolve com Floating UI internamente |
| Trap de foco/acessibilidade do tooltip do tour | `tabIndex` manual + listener de teclado próprio | Recurso nativo do Joyride ("Focus trapping, keyboard navigation, and ARIA support" — README) | Reimplementar foco acessível corretamente é não-trivial e a lib já entrega isso pronto |

**Key insight:** o único código genuinamente novo desta fase é: (1) o array `STEPS` (dados, não lógica), (2) um wrapper client fino de `<Joyride>` com leitura/escrita de `localStorage`, e (3) atributos `data-tour` estáticos em elementos já existentes. Tudo que envolve cálculo geométrico, portal, acessibilidade e overlay é responsabilidade da lib.

## Common Pitfalls

### Pitfall 1: API v2 vs v3 — snippets incompatíveis
**What goes wrong:** copiar um exemplo antigo (`import Joyride from 'react-joyride'`, `callback={cb}`, `STATUS`/`ACTIONS` importados do jeito v2, `getHelpers`) contra a v3.2.0 instalada.
**Why it happens:** a v3 é uma reescrita recente (~2 meses antes desta pesquisa) e a maior parte do conteúdo indexado na web (blogs, respostas antigas) ainda documenta a v2.
**How to avoid:** usar sempre `import { Joyride } from 'react-joyride'` (nomeado), `onEvent` (não `callback`), e conferir o shape de `EventData` (`type`, `action`, `status`, `index`, `step`, `lifecycle`, `origin`, `controlled`, `scrolling`, `waiting`, `size`) direto no arquivo de tipos `.d.ts` publicado no pacote antes de codar a task.
**Warning signs:** erro de TypeScript "não existe exportação padrão" ou "propriedade `callback` não existe no tipo `JoyrideProps`".

### Pitfall 2: `run` nasce `false` por padrão na v3 (mudou da v2)
**What goes wrong:** montar `<Joyride steps={STEPS} />` sem `run={true}` explícito e o tour simplesmente nunca aparece, nem na 1ª visita.
**Why it happens:** breaking change documentado da v3 — v2 tinha `run` implícito/relacionado a outro fluxo; v3 exige `run` explícito controlado pelo app.
**How to avoid:** o componente `TourGuiado` deve controlar `run` via `useState` inicializado a partir da leitura de `localStorage` (só true na 1ª visita, ou quando o botão de reiniciar for clicado).

### Pitfall 3: `beaconTrigger: 'click'` (default) exige um clique extra antes do tooltip abrir
**What goes wrong:** por padrão, cada passo mostra primeiro um "beacon" (bolinha pulsante) que o usuário precisa clicar para abrir o tooltip real — isso pode ser confundido com "o tour não funciona" numa demo rápida, e adiciona fricção contrária ao espírito de "tour guiado fluido".
**Why it happens:** comportamento padrão documentado em `react-joyride.com/docs/props/options` (`beaconTrigger: 'click'`).
**How to avoid:** para um tour totalmente guiado (sem exigir que o usuário descubra que precisa clicar na bolinha), usar `disableBeacon: true` por passo (ou o equivalente global, se existir na v3 — VERIFICAR no `.d.ts` do pacote instalado, já que a doc consultada nesta sessão não confirmou 100% o nome exato do campo por-step) para que o tooltip abra direto ao chegar no passo.
**Warning signs:** UAT humano relata "cliquei em próximo/pular e nada aconteceu" — na real o beacon está esperando um clique adicional.

### Pitfall 4: `buttons` default NÃO inclui `'skip'` (só `back`, `close`, `primary`)
**What goes wrong:** o default de `options.buttons` é `["back", "close", "primary"]` — sem um botão "Pular" dedicado. Tecnicamente o botão `close` (X) já permite fechar/pular a qualquer momento (satisfazendo TUTORIAL-02 na prática), mas o texto do requisito ("pulado/fechado a qualquer passo") sugere que um rótulo explícito "Pular tour" é desejável para deixar claro ao usuário que não é obrigatório terminar.
**Why it happens:** mudança de v2 (que tinha `showSkipButton` como prop booleana simples) para v3 (`buttons` como array configurável).
**How to avoid:** setar `options.buttons` explicitamente incluindo `'skip'` (ex.: `['skip', 'back', 'close', 'primary']`, ordem a confirmar no `.d.ts`), e testar com `onEvent` que tanto a ação de `close` quanto a de `skip` gravam a mesma flag de "já viu" em `localStorage` — TUTORIAL-02 não deve ficar satisfeito só pelo botão `close`; precisa cobrir ambos os caminhos de saída antecipada.
**Warning signs:** code review encontra só um caminho (`status === 'finished'`) gravando a flag e esquece `status === 'skipped'` — o usuário fecha o tour e ele reaparece do zero na próxima visita, violando TUTORIAL-05.

### Pitfall 5: zIndex/stacking context com Base UI (Dialog/Popover/Select)
**What goes wrong:** os primitivos Base UI deste projeto (`dialog.tsx`, `popover.tsx`, `select.tsx`, `combobox.tsx`) usam `isolate z-50` — ou seja, criam um novo stacking context próprio. O Joyride v3 tem `zIndex` default 100 (maior que 50, então não deveria colidir na prática), mas se um passo futuro do tour precisar apontar para algo dentro de um Dialog aberto, o portal do Joyride pode ficar "preso" atrás do `isolate` do Dialog dependendo de onde ele for montado no DOM.
**Why it happens:** `isolate` cria um novo stacking context — z-index maior só "vence" dentro do mesmo contexto de empilhamento; se o portal do Joyride for filho de um elemento com `isolate`, o z-index efetivo dele é recalculado dentro daquele contexto, não no topo da árvore.
**How to avoid:** os 5 passos recomendados (Pattern 1) apontam só para itens da sidebar — nenhum deles está dentro de um Dialog/Popover, então este risco é teoricamente zero no escopo mínimo da fase. Se o escopo crescer para apontar elementos dentro de modais, usar o prop `portalElement` do Joyride (confirmado como prop de nível superior na doc) para forçar o portal a montar diretamente em `document.body`, fora de qualquer `isolate` de Dialog, e subir `options.zIndex` acima de qualquer z-index já usado no projeto (o maior conhecido hoje é `z-50`).
**Warning signs:** tooltip do tour aparece atrás de um modal aberto, ou clicável através dele.

### Pitfall 6: dark mode — cores default do Joyride são claras/fixas
**What goes wrong:** os defaults de `options` são `backgroundColor: '#ffffff'`, `textColor: '#000000'`, `primaryColor: '#000000'`, `overlayColor: '#00000080'` — nenhum reage ao `.dark` do `next-themes`. Sem customização, o tooltip fica branco/ilegível ou destoante no tema escuro (D-19 do projeto: paleta OKLCH com blocos `:root`/`.dark`).
**Why it happens:** o Joyride não lê CSS custom properties automaticamente — os campos de `options`/`styles` recebem cores literais (hex/rgb), não `var(--token)` (embora CSS custom properties funcionem em qualquer valor de cor CSS, incluindo os que o Joyride injeta via `style` inline — testar isso é o ponto de atenção, já que `style` inline aceita `var(--primary)` normalmente).
**How to avoid:** usar `useTheme()` (já disponível via `next-themes`, mesmo hook do `ThemeToggle`) dentro do `TourGuiado` para decidir se passa cores claras ou escuras para `options`/`styles`, OU (mais simples e alinhado ao token system já existente) passar `var(--primary)`, `var(--popover)`, `var(--popover-foreground)`, `var(--foreground)` como strings de cor — CSS custom properties funcionam em props de estilo inline React normalmente. Confirmar visualmente nos dois temas antes de fechar a fase (UAT humano, claro + escuro — mesmo padrão já exigido nas Fases 22-24).
**Warning signs:** tooltip ilegível ou com contraste ruim no tema escuro — pegar no mesmo UAT humano claro/escuro já praticado nas fases anteriores (STATE.md).

### Pitfall 7: conteúdo do passo (`content`) e XSS
**What goes wrong:** se o `content` de um passo for construído a partir de qualquer dado dinâmico (não é o caso do escopo desta fase — todo texto é estático em `tour-steps.ts`) e passado via `dangerouslySetInnerHTML` em vez de children React normais, abre superfície de XSS.
**Why it happens:** não é um risco real no escopo desta fase (conteúdo 100% estático, sem input do usuário), mas vale documentar como invariante a preservar.
**How to avoid:** manter todo `content`/`title` como string literal ou JSX simples nos arquivos-fonte, nunca interpolando texto vindo de banco/URL/formulário.
**Warning signs:** N/A no escopo atual — só relevante se uma fase futura tentar personalizar o tour com dados do usuário.

## Code Examples

### Componente `TourGuiado` (esqueleto completo)
```tsx
// Fonte: react-joyride.com/docs/getting-started + docs/events (v3, CITADO) combinado com o
// padrão de guard de montagem já em produção em src/components/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, type CallBackProps } from "react-joyride";
import { TOUR_STEPS } from "@/lib/tour-steps";

const STORAGE_KEY = "tourVisto";

export function TourGuiado() {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mesmo precedente aceito (STATE.md decisão 07-02)
  useEffect(() => {
    setMounted(true);
    const jaViu = window.localStorage.getItem(STORAGE_KEY);
    if (!jaViu) setRun(true);
  }, []);

  if (!mounted) return null;

  function handleEvent(data: CallBackProps) {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setRun(false);
    }
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        buttons: ["skip", "back", "close", "primary"],
        primaryColor: "var(--primary)",
        overlayColor: "color-mix(in oklch, var(--foreground) 40%, transparent)",
      }}
    />
  );
}
```
*(Nomes exatos de export — `Joyride`, `STATUS`, `CallBackProps` — e o shape de `options.buttons` devem ser reconferidos contra os tipos publicados no pacote 3.2.0 antes da implementação; ver `Assumptions Log` A2/A3.)*

### Botão de reiniciar (TUTORIAL-03)
```tsx
"use client";

const STORAGE_KEY = "tourVisto";

export function ReiniciarTourButton() {
  function handleClick() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.reload(); // opção simples: reload força TourGuiado a remontar com run=true
  }

  return (
    <button type="button" onClick={handleClick}>
      Reiniciar tour guiado
    </button>
  );
}
```
*(Um `reload()` completo é a opção mais simples e robusta para reiniciar — evita ter que sincronizar estado entre `ReiniciarTourButton`, que vive em `/configuracoes`, e `TourGuiado`, que vive no layout raiz, sem introduzir um Context novo só para isso. Se o planner preferir sem reload, a alternativa é um Context/estado global leve — avaliar custo/benefício na fase de planejamento.)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `react-joyride` v2: `import Joyride from 'react-joyride'`, prop `callback`, `getHelpers`, `showSkipButton`/`showProgress` como props booleanas soltas | `react-joyride` v3.2.0: `import { Joyride } from 'react-joyride'`, prop `onEvent`, hook `useJoyride`, tema/comportamento agrupados em `options`, botões configuráveis via `options.buttons` array | v3 lançada antes de 2026-07-09 (confirmado: versão atual publicada nessa data no npm) | Qualquer exemplo/tutorial pré-2026 na internet sobre Joyride é provavelmente v2 e não roda direto contra a v3 instalada — todo código deste RESEARCH.md já foi escrito mirando a API v3 |

**Deprecated/outdated:**
- `getHelpers` (v2): substituído por `useJoyride()` hook na v3.
- Props de tema soltas no nível raiz do componente (v2): migradas para o objeto `options` na v3.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `slopcheck` não pôde ser instalado (pip ausente no host) — pacote `react-joyride` fica `[ASSUMED]` mesmo com evidência forte de legitimidade (10 anos, ~1M downloads/semana, repo oficial confirmado) | Package Legitimacy Audit | Baixo — evidência independente já reúne registro npm + repositório GitHub oficial + licença MIT + ausência de postinstall; o `checkpoint:human-verify` do planner é a rede de segurança final |
| A2 | Os nomes exatos de export (`Joyride`, `STATUS`, `CallBackProps`, shape de `EventData`) foram reconstruídos a partir de resumos de fetch de `react-joyride.com/docs/*` (um modelo intermediário parafraseando a doc, não a doc crua) — podem ter pequenas imprecisões de nome de campo | Code Examples, Common Pitfalls (Pitfall 1) | Médio — se um nome de export estiver levemente errado, o build falha imediatamente com erro de TypeScript claro (falha rápida, não silenciosa); o executor deve abrir `node_modules/react-joyride/dist/index.d.ts` (ou equivalente) e confirmar antes de escrever a task real |
| A3 | O campo exato para desabilitar o "beacon" por passo (`disableBeacon` no nível do `Step`) não foi 100% confirmado nesta sessão — a doc de props/steps retornou 404 durante a pesquisa | Common Pitfalls (Pitfall 3) | Baixo-Médio — se o nome do campo estiver errado, o pior caso é o beacon aparecer (fricção de UX, não quebra funcional); fácil de corrigir em UAT humano |
| A4 | `content`/`title` de cada passo aceitam string simples E JSX (assumido por precedente de bibliotecas de tour similares e pela doc de getting-started, que mostra strings) — não testado se markdown/HTML inline é suportado nativamente | Code Examples | Baixo — mesmo se só strings simples forem suportadas, o conteúdo planejado (texto puro explicando cada tela) já é compatível |
| A5 | O contador de downloads da API `api.npmjs.org` (~1.002.744/semana) diverge do número citado em `REQUIREMENTS.md` ("340k installs/semana", de uma pesquisa anterior) — assumido que a diferença é só a métrica ter sido medida em momento/janela diferente, não um sinal de pacote diferente (nome bate 1:1, repo bate 1:1) | Summary, Package Legitimacy Audit | Baixo — ambos os números indicam adoção massiva; a diferença não muda a decisão |

## Open Questions

**Status: as 3 questões abaixo foram RESOLVIDAS durante o planejamento da Fase 25 (2026-09-12). Nenhuma continua aberta — ver o marcador inline em cada uma.**

1. **Nome exato do campo per-step para pular o beacon (`disableBeacon` vs outro nome na v3)** **(RESOLVED — adiado para a Task 2 do plano 25-01, que lê o `.d.ts` publicado em `node_modules/react-joyride` logo após o install e registra o nome real do campo como decisão D-25-XX no `25-01-SUMMARY.md`; o plano 25-02 consome esse SUMMARY sem reinvestigar.)**
   - What we know: a v2 usava `disableBeacon: true` no objeto do passo; a doc de `options` da v3 confirma `beaconTrigger`/`skipBeacon` a nível global, mas a página específica de `docs/props/steps` retornou 404 durante a pesquisa.
   - What's unclear: se o campo per-step se chama igual na v3 ou foi renomeado/removido em favor de só configuração global.
   - Recommendation: o executor do primeiro plano deve abrir os tipos TypeScript do pacote (`node_modules/react-joyride`) logo após `npm install`, antes de escrever `tour-steps.ts`, e confirmar o nome real do campo (ou usar só `options.beaconTrigger`/`skipBeacon` globalmente, o que já está 100% confirmado).

2. **Vale a pena tourar também `/mapa-de-nichos` (6º passo), já que também é conteúdo novo da Fase 24?** **(RESOLVED — fora de escopo. O tour tem 5 passos, exatamente os 5 critérios de sucesso literais do ROADMAP; `/mapa-de-nichos` NÃO ganha passo nesta fase, escopo travado na Task 2 do plano 25-02.)**
   - What we know: a descrição da fase e os critérios de sucesso citam "campanhas de nicho" (singular conceito) como a 5ª tela, o que mapeia mais diretamente para `/campanhas`. `/mapa-de-nichos` é uma tela irmã, também nova.
   - What's unclear: se o usuário considera isso parte do mesmo "conceito de campanha" (1 passo cobre as duas) ou quer um passo dedicado.
   - Recommendation: manter escopo mínimo de 5 passos (bate com os 5 critérios de sucesso ipsis litteris); se o usuário quiser, é trivial adicionar um 6º passo (`data-tour="nav-mapa-de-nichos"`) no mesmo padrão — decisão de escopo pro planner/discuss-phase, não um bloqueio técnico.

3. **Reiniciar via `window.location.reload()` é aceitável, ou o produto quer uma experiência sem reload de página inteira?** **(RESOLVED — aceito. `window.location.reload()` é a estratégia oficial da fase: ver Task 3 do `25-02-PLAN.md` e regra 4 do `25-UI-SPEC.md`. Nada de Context global só para sincronizar um booleano.)**
   - What we know: `reload()` é a implementação mais simples e sem necessidade de Context/estado compartilhado entre `/configuracoes` e o layout raiz.
   - What's unclear: se um reload completo (perda de scroll position, remonta toda a árvore) é uma UX aceitável para "reiniciar tour" — provavelmente sim, dado que é uma ação rara e intencional, mas vale confirmar em discuss-phase/plan.
   - Recommendation: aceitar `reload()` como solução padrão da fase; só investir em Context/estado global se o discuss-phase explicitamente pedir uma transição mais suave.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm install react-joyride` | ✓ | (já usado no projeto todo) | — |
| `pip`/`pip3` (para `slopcheck`) | Package Legitimacy Gate | ✗ | — | Verificação manual (registro npm + repo GitHub + licença + ausência de postinstall), pacote marcado `[ASSUMED]`, checkpoint humano antes do install |
| Navegador (UAT humano visual, claro+escuro) | Verificação final de contraste/dark-mode do tooltip do Joyride | Indisponível junto com sessão do agente (host 4GB RAM, precedente Fases 18-20) | — | UAT humano não-bloqueante, mesmo padrão já aceito nas Fases 22-24 |

**Missing dependencies with no fallback:**
- Nenhuma — todas as ausências acima já têm fallback documentado e aceito pelo precedente do projeto.

**Missing dependencies with fallback:**
- `pip`/`slopcheck` → verificação manual + checkpoint humano.
- Navegador simultâneo ao agente → UAT humano pós-fase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Harness Node `.cjs` customizado (sem Jest/Vitest/Playwright no projeto — confirmado: nenhum consta em `package.json` `devDependencies`), padrão já usado em `scripts/test-*.cjs` |
| Config file | nenhum framework formal — cada harness é um script standalone com `register("./ts-alias-loader.mjs", ...)` para importar TS direto sob Node (ver `scripts/test-lead-csv-export.cjs`) |
| Quick run command | `npx tsc --noEmit` + `npm run lint` |
| Full suite command | `npm run build` (gate de build completo, precedente já em uso desde a Fase 18/20) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| TUTORIAL-01 | Tour aparece na 1ª visita com 5 passos cobrindo as 5 telas | manual-only (UAT humano navegador) — Joyride manipula DOM/portal real, harness `.cjs` sem browser não consegue verificar renderização visual | — (sem comando automatizado viável no host atual) | ❌ Wave 0 (não aplicável — ver justificativa) |
| TUTORIAL-02 | Tour pode ser pulado/fechado a qualquer passo sem forçar conclusão | parcialmente automatizável: harness pode testar a FUNÇÃO PURA que decide "gravar tourVisto" a partir de um `status` simulado (`finished`/`skipped`), sem precisar do DOM real | `node scripts/test-tour-persistence.cjs` (NOVO, se a lógica for extraída para uma função pura, ex. `deveGravarTourVisto(status)`) | ❌ Wave 0 |
| TUTORIAL-03 | Ponto de acesso fixo (`/configuracoes`) reinicia o tour | manual-only (clique real + observar reaparecimento do tour) | — | ❌ Wave 0 |
| TUTORIAL-04 | Implementação usa React Joyride, nenhuma lib concorrente | estrutural — `grep`/`npm ls` confirmando só `react-joyride` como dependência de tour, sem outra lib de onboarding no `package.json` | `npm ls react-joyride` + revisão de `package.json` (code review) | ✅ (verificável sem harness novo) |
| TUTORIAL-05 | Estado "já viu" persiste entre acessos mas reativa manualmente | mesma função pura de TUTORIAL-02 testável isoladamente (dado `localStorage` mockado ou uma função que recebe/devolve o valor da flag, sem acessar `window` direto) | `node scripts/test-tour-persistence.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` + `npm run lint`
- **Per wave merge:** `npm run build` (host 4GB — rodar isolado, sem outros processos pesados em paralelo, precedente já documentado no projeto)
- **Phase gate:** UAT humano navegador (claro + escuro) como não-bloqueante, mesmo padrão das Fases 22-24; suite automatizada (tsc/lint/build + harness novo de persistência, se extraído) verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/test-tour-persistence.cjs` — cobre TUTORIAL-02/05 SE a lógica de "gravar/ler flag de já-visto" for extraída para uma função pura em `src/lib/` (ex.: `src/lib/tour-persistence.ts` com `deveGravarComoVisto(status: string): boolean` e `lerTourVisto()/gravarTourVisto()` isolados o suficiente para mockar `localStorage`)
- [ ] Nenhum framework de teste de DOM/browser precisa ser instalado — fora do orçamento desta fase e do host atual (4GB); UAT humano cobre a parte visual/interativa real do Joyride

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | não | Fase não toca autenticação (projeto não tem, por design — CLAUDE.md) |
| V3 Session Management | não | `localStorage` de preferência de UI não é um mecanismo de sessão |
| V4 Access Control | não | Nenhum dado novo, nenhuma rota nova protegida/desprotegida |
| V5 Input Validation | não (nenhum input novo) | Todo `content`/`title` do tour é string estática nos arquivos-fonte, sem interpolação de dado dinâmico/usuário — nenhum Zod novo necessário |
| V6 Cryptography | não | N/A |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| XSS via `content` do tour se um dia vier a ser dinâmico | Tampering/Information Disclosure | Manter `content`/`title` como string literal/JSX estático (nunca `dangerouslySetInnerHTML` com dado externo) — ver Pitfall 7 |
| `localStorage` como superfície de "toggle de feature" manipulável pelo próprio usuário (ex.: usuário edita `tourVisto` no DevTools) | Tampering | Sem risco real — pior caso é o tour reaparecer ou não aparecer indevidamente para o próprio usuário, que já tem acesso total ao navegador/máquina (ferramenta solo, sem multiusuário, CLAUDE.md) |

## Sources

### Primary (HIGH confidence)
- `npm view react-joyride version/time.created/time.modified/license/repository.url/scripts.postinstall/dependencies/peerDependencies` — executado ao vivo nesta sessão (2026-09-12), registro oficial do npm
- `https://api.npmjs.org/downloads/point/last-week/react-joyride` — contagem oficial de downloads, executado ao vivo
- `gh api repos/gilbarbara/react-joyride/contents/README.md` — README oficial do repositório, buscado ao vivo via API do GitHub

### Secondary (MEDIUM confidence)
- `react-joyride.com/docs/migration` (v2→v3) — CITADO, via WebFetch (resumo de um modelo intermediário sobre o conteúdo da doc oficial, não o texto cru)
- `react-joyride.com/docs/new-in-v3` — CITADO, idem
- `react-joyride.com/docs/getting-started` — CITADO, idem
- `react-joyride.com/docs/props` — CITADO, idem
- `react-joyride.com/docs/props/options` — CITADO, idem
- `react-joyride.com/docs/props/styles` — CITADO, idem
- `react-joyride.com/docs/events` — CITADO, idem
- `react-joyride.com/docs/recipes` (multi-rota) — CITADO, idem
- WebSearch "react-joyride multi page multi route tour Next.js" — cross-referenciado com o fetch direto da página de recipes

### Tertiary (LOW confidence)
- `react-joyride.com/docs/props/beacon` e `react-joyride.com/docs/props/steps` — tentativas de fetch retornaram HTTP 404 nesta sessão; o campo per-step `disableBeacon` da v3 NÃO foi confirmado diretamente (ver Assumptions Log A3, Open Question 1)

### Codebase (investigação direta, HIGH confidence)
- `src/components/app-sidebar.tsx` — estrutura da sidebar, `NAV_ITEMS`, montagem no layout raiz
- `src/components/theme-toggle.tsx` / `src/components/theme-provider.tsx` — padrão de guard de montagem client-side + persistência de preferência via `next-themes` (localStorage)
- `src/app/layout.tsx` — confirma que `ThemeProvider`/`AppSidebar` são montados 1x, irmãos de `{children}`, persistentes entre rotas
- `src/db/schema.ts` (tabela `configuracoes`) — confirma o padrão de singleton de config no banco e por que NÃO é o lugar certo pra "já viu o tour"
- `src/app/configuracoes/page.tsx` — ponto de acesso natural para o botão de reiniciar tour (TUTORIAL-03)
- `package.json` — confirma stack (Next 16.2.10, React 19.2.7, next-themes 0.4.6, ausência de Jest/Vitest/Playwright), ausência prévia de `react-joyride`
- `scripts/test-lead-csv-export.cjs` — padrão de harness `.cjs` sem browser para lógica pura client-side
- `src/app/page.tsx`, `src/app/leads/page.tsx`, `src/app/pipeline/page.tsx`, `src/app/relatorios/page.tsx`, `src/app/campanhas/page.tsx`, `src/app/mapa-de-nichos/page.tsx` — confirmam que as 5(-6) telas-alvo são Server Components, sem necessidade de conversão para Client Component para ganhar `data-tour`
- `.planning/REQUIREMENTS.md` (seção TUTORIAL) — confirma TUTORIAL-04 como restrição travada e cita a pesquisa anterior (340k installs/semana) que motivou a escolha da lib
- `.planning/ROADMAP.md` (Fase 25) — confirma dependência soft da Fase 24, zero acoplamento de schema

## Metadata

**Confidence breakdown:**
- Standard stack (react-joyride, versão, legitimidade): HIGH — verificado ao vivo via npm registry + GitHub oficial, mesmo sem `slopcheck` (fallback manual robusto)
- API exata da v3 (nomes de export, callback, options): MEDIUM — confirmada via doc oficial, mas via resumo de fetch (não o texto cru), e 2 páginas de doc retornaram 404 durante a pesquisa (ver Open Questions/Assumptions)
- Arquitetura recomendada (tour ancorado na sidebar, sem navegação): HIGH — decorre de investigação direta do código real do projeto (`app-sidebar.tsx`, `layout.tsx`), não de suposição
- Persistência via localStorage (vs. tabela `configuracoes`): HIGH — decisão fundamentada em precedente direto do próprio projeto (`next-themes`) e no texto do CLAUDE.md (ferramenta solo, sem multiusuário)
- Pitfalls de dark mode / z-index Base UI: MEDIUM — riscos identificados por análise de código real (`dialog.tsx`, `globals.css`) cruzada com defaults documentados da lib, mas não testados ao vivo num navegador nesta sessão

**Research date:** 2026-09-12
**Valid until:** 14 dias (30 seria o padrão para libs estáveis, mas `react-joyride` está a ~2 meses de uma reescrita major — tratar a API documentada aqui como mais perecível que o normal; reconfirmar contra os tipos do pacote instalado antes de codar, não só contra este documento)
