---
phase: 25
slug: tour-guiado-do-crm
status: draft
shadcn_initialized: true
preset: base-nova
created: 2026-09-12
---

# Phase 25 — Contrato de Design de UI

> Contrato visual e de interação do **Tour Guiado do CRM**. Gerado pelo gsd-ui-researcher, verificado pelo gsd-ui-checker.
>
> Toda a prosa deste documento está em **português (Brasil)** — regra dura do projeto.
> Sem `CONTEXT.md` — o usuário pulou o `/gsd-discuss-phase` para esta fase (ROADMAP.md já trazia
> meta + 4 critérios de sucesso totalmente especificados). Nenhuma pergunta de contrato ficou em
> aberto: tudo abaixo vem de `brand.md` (LOCKED), `25-RESEARCH.md` ou de código já em produção.

---

## Contexto herdado (não re-perguntado)

| Fonte | Decisões já tomadas que este contrato herda |
|-------|---------------------------------------------|
| `brand.md` (LOCKED, v1.5) | Paleta OKLCH light+dark, tipografia Geist + Geist Mono, escala de tipografia recomendada, tom de voz (direto, factual, sem hype, sem "!", sem emoji), grade de 4px, `transition-colors` (nunca `transition: all`). **Fonte de verdade — cores/tipografia não são re-escolhidas aqui.** |
| `25-RESEARCH.md` | React Joyride 3.2.0 (API v3, `onEvent`/`options`, não `callback`/props soltas), arquitetura recomendada "tour ancorado na sidebar" (5 passos, zero navegação real), guard de montagem client-side (padrão `theme-toggle.tsx`), persistência via `localStorage` (chave sugerida `tourVisto`), `ReiniciarTourButton` em `/configuracoes`, Pitfalls 3/4/6 (beacon exige clique extra, `buttons` default sem `skip`, cores default do Joyride não reagem a `.dark`). |
| `25-VALIDATION.md` | Nomenclatura já fixada nos testes manuais: botão "Pular" no passo, botão "Rever tour do CRM" em `/configuracoes`, harness `scripts/test-tour-persistence.cjs` cobrindo `deveGravarComoVisto(status)`. |
| `ROADMAP.md` §Phase 25 | 4 critérios de sucesso (TUTORIAL-01..05); as 5 telas do tour são, na ordem: Follow-ups (dashboard), Leads, Pipeline, Campanhas de nicho, Relatórios. |
| Código existente | `app-sidebar.tsx` (`NAV_ITEMS`, montada 1x no root layout, visível em toda rota), `theme-toggle.tsx` (guard `mounted` + `useEffect`, botão de rodapé da sidebar), `popover.tsx`/`dialog.tsx` (idioma de superfície: `rounded-lg`/`rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10`, overlay `bg-foreground/10`), `configuracoes/page.tsx` (H1 `text-[28px] font-semibold leading-tight`, container `flex flex-col gap-6`). |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (CLI já inicializado — `components.json` presente) |
| Preset | `base-nova` (`style: "base-nova"`, `baseColor: neutral`, `cssVariables: true`) |
| Component library | Base UI (`@base-ui/react`) — resolvido pelo preset `base-nova` |
| Icon library | `lucide-react` |
| Font | Geist (sans/display) + Geist Mono (números) — via `next/font`, variáveis `--font-sans`/`--font-mono` |
| Lib de tour (não-shadcn) | `react-joyride@3.2.0` — pacote npm puro (mandatado por TUTORIAL-04), **não** é item de registry shadcn; entra via `npm install`, com checkpoint humano de legitimidade (`25-RESEARCH.md` Package Legitimacy Audit — `[ASSUMED]` sem `slopcheck`, `pip` ausente no host) |
| Registries de terceiros | **nenhum** (`registries: {}` em `components.json`) |

**Primitivos shadcn já no repo que esta fase pode reusar:** `button` (para o `ReiniciarTourButton` em `/configuracoes`). **Nenhum primitivo shadcn novo é necessário** — o overlay/spotlight/tooltip do tour em si é renderizado pelo próprio `react-joyride` (`options`/`styles`, não um `<Dialog>`/`<Popover>` do projeto), reskinado com os tokens abaixo para casar visualmente com o resto do app.

**Componentes novos a criar nesta fase (código do projeto, não registry):**

| Componente | Tipo | Responsabilidade |
|-----------|------|-------------------|
| `TourGuiado` | Client (`"use client"`) | Monta `<Joyride>` no root layout, irmão de `{children}`; dono do estado `run`; guard `mounted`; lê/grava `localStorage` via `src/lib/tour-persistence.ts`. |
| `ReiniciarTourButton` | Client (`"use client"`) | Botão em `/configuracoes` que zera a flag "já visto" e reativa o tour (TUTORIAL-03). Usa o primitivo `Button` do shadcn (`variant="outline"`). |
| `src/lib/tour-steps.ts` | dado puro | Array `TOUR_STEPS` (título + conteúdo dos 5 passos), sem lógica, testável sem DOM. |
| `src/lib/tour-persistence.ts` | função pura | `deveGravarComoVisto(status)`, `lerTourVisto()`/`gravarTourVisto()` — isolados o suficiente pra mockar `localStorage` (Wave 0, `25-VALIDATION.md`). |

---

## Spacing Scale

Grade de 4px (Tailwind default, mantida pela `brand.md` — "Mantenha a grade de espaçamento de 4px").

| Token | Value | Uso nesta fase |
|-------|-------|-----------------|
| xs | 4px (`gap-1`) | Ícone↔texto dentro do contador de passo ("Passo 2 de 5") |
| sm | 8px (`gap-2`) | Espaço entre os botões do tooltip (Voltar / Pular / Próximo) |
| md | 16px (`p-4`) | Padding interno do tooltip do tour (mesma medida de `dialog.tsx`/`popover.tsx`) |
| lg | 24px | Não usado nesta fase (tooltip é compacto, sem seções internas) |
| 2xl | 48px | Não usado nesta fase |
| 3xl | 64px | Não usado nesta fase |

**Exceções:** nenhuma. O tour não introduz nenhum espaçamento fora da grade de 4px — o próprio Joyride aceita `spotlightPadding` (recomendado: `4`, para o realce em volta do item da sidebar sem colar no texto) e `tooltip.padding` implícito no `p-4` do estilo customizado.

---

## Typography

Escala **travada pela `brand.md`** (§"Escala de tipografia"). Geist em todos os papéis. Máximo de **3 tamanhos** e **2 pesos** usados nesta fase (dentro do teto do template).

| Papel | Classe | Peso | Line height | Uso nesta fase |
|-------|--------|------|-------------|-----------------|
| Título do passo | `text-base font-semibold` | 600 (semibold) | 1.5 | Título de cada um dos 5 passos ("Follow-ups", "Leads", "Pipeline", "Campanhas de nicho", "Relatórios") |
| Corpo do passo | `text-sm` | 400 (regular) | 1.5 | Texto explicativo de cada passo |
| Contador / caption | `text-xs text-muted-foreground` | 400 (regular) | 1.4 | "Passo {n} de 5"; caption sob o botão "Rever tour do CRM" em `/configuracoes` |

**Pesos declarados:** apenas 2 — 400 (corpo/caption) e 600 (título do passo). Nenhum itálico, nenhum peso 500 nesta fase.

---

## Color

Split 60/30/10 sobre os tokens shadcn da `brand.md` (Corrente Funda · Sóbria). **Nunca hardcode hex** — sempre `var(--token)` (o Joyride aceita CSS custom properties como string de cor em `options`/`styles`, confirmado em `25-RESEARCH.md` Pitfall 6). **Nenhuma cor do Joyride fica no default da lib** (`#ffffff`/`#000000`/`#00000080`) — todas são substituídas pelos tokens abaixo.

| Papel | Token | Hex (light / dark) | Uso |
|-------|-------|---------------------|-----|
| Dominante (60%) | `--foreground` (via overlay translúcido) | `#0A1619` / `#E9F4F7` a 10% | Overlay que escurece o resto da tela durante o tour — `color-mix(in oklch, var(--foreground) 10%, transparent)`, mesma intensidade do `bg-foreground/10` já usado em `dialog.tsx` (não os 40% sugeridos como rascunho no RESEARCH — 10% mantém paridade visual com o overlay de Dialog já em produção) |
| Secundária (30%) | `--popover` / `--popover-foreground` | `#FFFFFF` / `#0A1619` · `#233238`(~) / `#E9F4F7` | Fundo e texto do tooltip do tour (`options.arrowColor`, `options.backgroundColor`, `options.textColor`) |
| Acento (10%) | `--primary` | `#197076` / `#6CBEC2` | Ver lista reservada abaixo |
| Destrutiva | — | N/A | Não aplicável — nenhuma ação destrutiva nesta fase (ver Copywriting Contract) |

**Acento (`--primary`) reservado exclusivamente para:**
1. O botão **"Próximo"** / **"Concluir"** (botão primário do tooltip — `options.primaryColor`).
2. O anel de destaque (spotlight) em volta do item da sidebar sob foco (`spotlightPadding`/`options.spotlightShadow` custom com `var(--ring)`, mesmo token usado pelo `focus-visible` do resto do app).

Os botões "Voltar" e "Pular tour" usam texto `text-muted-foreground` sobre fundo transparente (idioma equivalente a `variant="ghost"`) — **acento não é para todo botão do tooltip**, só para a ação de avanço.

**Estados do Joyride mapeados para tokens (sem cor semântica `--status-*` nesta fase — o tour não representa dado de negócio, é puro onboarding):**

| Elemento Joyride | Token | Prop (a confirmar contra `.d.ts` instalado — `25-RESEARCH.md` Assumption A2) |
|-------------------|-------|-------------------------------------------------------------------------------|
| Overlay | `color-mix(in oklch, var(--foreground) 10%, transparent)` | `options.overlayColor` |
| Fundo do tooltip | `var(--popover)` | `options.backgroundColor` / `options.arrowColor` |
| Texto do tooltip | `var(--popover-foreground)` | `options.textColor` |
| Botão primário (Próximo/Concluir) | `bg-primary` `text-primary-foreground` | `options.primaryColor` (cor) + `styles`/CSS override de `rounded-md text-sm font-medium` |
| Botões secundários (Voltar/Pular) | `text-muted-foreground`, sem fundo | override de estilo, sem token de cor de fundo |
| Borda/raio do tooltip | `rounded-lg` (`--radius-lg`, mesmo raio de `popover.tsx`) | `options.borderRadius` (px equivalente, ex. `10`) |
| Sombra do tooltip | equivalente a `shadow-md ring-1 ring-foreground/10` (`popover.tsx`) | `options.arrowColor`/CSS custom (Joyride não tem prop de `ring`; aproximar com `box-shadow` customizado se o campo existir, senão aceitar a sombra default do Joyride — não é um requisito bloqueante) |

---

## Copywriting Contract

Voz da `brand.md`: direto, factual, frase curta, **sem "!", sem emoji, sem hype**.

| Elemento | Cópia |
|----------|-------|
| Botão "Próximo" | **Próximo** |
| Botão "Próximo" (último passo) | **Concluir** |
| Botão "Voltar" | **Voltar** |
| Botão "Pular" | **Pular tour** |
| Contador de passo | `Passo {n} de 5` |
| Passo 1 — título | **Follow-ups** |
| Passo 1 — corpo | Aqui ficam os follow-ups vencidos, de hoje e dos próximos 7 dias — o painel que evita esquecer um lead. |
| Passo 2 — título | **Leads** |
| Passo 2 — corpo | A lista completa de leads, com filtros por nicho, etapa e origem. |
| Passo 3 — título | **Pipeline** |
| Passo 3 — corpo | O funil de vendas em quadro — arraste um lead entre as etapas conforme ele avança. |
| Passo 4 — título | **Campanhas de nicho** |
| Passo 4 — corpo | Organize a exploração de um nicho novo: oferta, janela de tempo, diagnóstico de IA e veredito final. |
| Passo 5 — título | **Relatórios** |
| Passo 5 — corpo | Métricas do funil: conversão, motivos de perda e origem dos leads no período. |
| Botão de reinício (em `/configuracoes`) | **Rever tour do CRM** |
| Caption sob o botão de reinício | Reapresenta as 5 telas principais do CRM. Você pode pular a qualquer momento. |
| Empty state | **N/A** — não há estado vazio nesta fase; o tour não depende de dado nenhum, são sempre os mesmos 5 passos estáticos definidos em `tour-steps.ts`. |
| Error state | **N/A** — não há chamada de rede nem estado de falha; os 5 alvos do tour são itens fixos da sidebar (`data-tour="nav-*"`), sempre presentes no DOM em qualquer rota (Pattern 1, `25-RESEARCH.md`) — não existe "target not found" no escopo mínimo da fase. |
| Destrutiva | **N/A** — pular/fechar o tour não apaga nem altera nenhum dado; é só a flag `tourVisto` em `localStorage`. Por isso **não há modal de confirmação** ao clicar "Pular tour" (TUTORIAL-02 exige justamente que nada force a conclusão). |

---

## Layout e Estrutura

```
Root Layout (Server Component, src/app/layout.tsx)
├── ThemeProvider (Client, já existe)
│    ├── AppSidebar (Client, já existe)
│    │     └── 5 <Link data-tour="nav-{slug}"> — Follow-ups/Leads/Pipeline/Campanhas/Relatórios
│    ├── TourGuiado (Client, NOVO — irmão de {children})
│    │     └── <Joyride steps={TOUR_STEPS} run={run} onEvent={...} options={{...tokens acima}} />
│    ├── {children}
│    └── Toaster

/configuracoes/page.tsx (Server Component, já existe)
└── <ConfiguracoesForm /> (já existe)
    └── <ReiniciarTourButton /> (Client, NOVO — Button variant="outline" + caption text-xs muted)
```

Cada passo aponta para um `<Link data-tour="nav-*">` já existente na sidebar — **nenhuma navegação real** entre passos (Pattern 1 do `25-RESEARCH.md`: zero `router.push`, zero espera de RSC). `placement: "right"` em todos os 5 passos (a sidebar fica à esquerda; o tooltip abre para a direita, sem colidir com a borda da tela).

---

## Estados e Interação (contrato)

| # | Regra | Detalhe de implementação |
|---|-------|---------------------------|
| 1 | **1ª visita dispara sozinho** (TUTORIAL-01) | `TourGuiado` lê `localStorage` no `useEffect` de montagem; se a flag não existe, `run` nasce `true`. Guard `mounted` idêntico a `theme-toggle.tsx` — nunca ler `localStorage` durante SSR. |
| 2 | **Sem beacon de clique extra** (Pitfall 3) | `disableBeacon: true` em cada passo (ou equivalente global `options.beaconTrigger`/`skipBeacon` se o campo per-step não existir na v3 — confirmar contra o `.d.ts` instalado antes de codar, `25-RESEARCH.md` Open Question 1). O tooltip deve abrir direto ao chegar em cada passo, sem exigir um clique numa "bolinha". |
| 3 | **Pular/fechar a qualquer passo, sem forçar conclusão** (TUTORIAL-02) | `options.buttons` inclui explicitamente `"skip"` (default da v3 não inclui). `onEvent` grava a flag `tourVisto` tanto em `status === "finished"` quanto em `status === "skipped"` — **os dois caminhos**, não só um (Pitfall 4: esquecer `skipped` reabre o tour do zero na próxima visita, violando TUTORIAL-05). |
| 4 | **Reinício manual sempre disponível** (TUTORIAL-03) | `ReiniciarTourButton` em `/configuracoes` limpa a flag e reativa `run=true` (via `window.location.reload()` — opção simples aceita pelo `25-RESEARCH.md`, evita Context/estado global só para isso). |
| 5 | **Persistência sem reaparecer sozinho** (TUTORIAL-05) | Fonte única da verdade: `localStorage["tourVisto"]`. Nunca gravada em `configuracoes` (tabela do banco) — preferência de UI client-only, mesmo padrão de `next-themes` (não é dado de negócio, não precisa sobreviver a troca de navegador/máquina numa ferramenta solo). |
| 6 | **Foco/acessibilidade** | Delegado ao Joyride nativamente (README: "Focus trapping, keyboard navigation, and ARIA support") — não reimplementar. |
| 7 | **Dark mode** | Todos os tokens de cor do tour usam `var(--token)`, nunca hex/rgb literal — testar com `.dark` forçado antes de considerar a fase pronta (mesma regra de `brand.md`, mesmo UAT humano claro+escuro já praticado nas Fases 22-24). |
| 8 | **z-index / stacking context** | Escopo mínimo (5 passos, todos na sidebar, nenhum dentro de `Dialog`/`Popover`) não colide com o `isolate z-50` dos primitivos Base UI (Pitfall 5, `25-RESEARCH.md`). Não usar `portalElement` customizado nesta fase — só necessário se um passo futuro apontar para dentro de um modal. |
| 9 | **Transições** | Só as transições nativas do Joyride (fade/scale do tooltip); nenhuma transição customizada nova, nunca `transition: all`. |
| 10 | **XSS / conteúdo estático** | `title`/`content` de cada passo são strings literais em `tour-steps.ts`, nunca interpoladas de dado dinâmico/banco (Pitfall 7) — nenhum `dangerouslySetInnerHTML`. |

---

## Registry Safety

| Registry | Blocks usados | Safety Gate |
|----------|----------------|--------------|
| shadcn oficial | `button` (já no repo, reusado por `ReiniciarTourButton`) | não requerido |
| terceiros (shadcn registry) | **nenhum** | não aplicável — `registries: {}` em `components.json` |
| npm (fora do registry shadcn) | `react-joyride@3.2.0` | **não é um bloco shadcn** — é uma dependência de código (`npm install`). Legitimidade avaliada em `25-RESEARCH.md` (Package Legitimacy Audit: 10 anos, ~1M downloads/semana, repo oficial `gilbarbara/react-joyride`, licença MIT, sem `postinstall`, `[ASSUMED]` porque `slopcheck`/`pip` indisponível no host) — **checkpoint humano obrigatório antes do `npm install`**, conforme já sinalizado no plano de execução. |

Nenhum `npx shadcn add` de registry externo nesta fase. Os componentes novos (`TourGuiado`, `ReiniciarTourButton`, `tour-steps.ts`, `tour-persistence.ts`) são código do projeto sob `src/components/` e `src/lib/`, não itens de registry.

---

## Checker Sign-Off

- [ ] Dimensão 1 Copywriting: PASS
- [ ] Dimensão 2 Visuais: PASS
- [ ] Dimensão 3 Color: PASS
- [ ] Dimensão 4 Typography: PASS
- [ ] Dimensão 5 Spacing: PASS
- [ ] Dimensão 6 Registry Safety: PASS

**Approval:** pending
