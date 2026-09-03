# Phase 19: Marca e Identidade Visual - Research

**Researched:** 2026-09-02
**Domain:** Design tokens (shadcn/Tailwind v4 CSS-first), `next/font`, skill `/brand-design`, refactor de cor hardcoded → token semântico, rename de superfícies visíveis
**Confidence:** HIGH (workflow do skill e inventário de código lidos na fonte); MEDIUM (plano B de verificação visual sob restrição de 4GB; risco de regressão de métrica de fonte)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Nome = **"SOLO"** (uma palavra, puro). Alternativas exploradas e descartadas conscientemente.
- **D-02:** "SOLO" **colide** no espaço de CRM (Salesboom Solo CRM, SoloCRM/`solocrm.com`, Solo/`gosolo.io`). Domínios `solocrm.com` e `gosolo.io` tomados. `brand.md` DEVE registrar a colisão como ressalva explícita: *"nome descartável — trocar antes de qualquer movimento de produto, landing page ou venda"*. Aceitável agora por ser ferramenta interna de um único usuário.
- **D-03:** Ícone placeholder do sidebar (letra "I" em `app-sidebar.tsx:42`) passa a ser **"S"**.
- **D-04:** Renomear "CRM de Leads" / "CRM LEADS" → "SOLO" em: `layout.tsx` metadata (`title` linha 18 + `description` linha 19); `app-sidebar.tsx` header (linha 45) + ícone (linha 42); `package.json` campo `name`; README (se citar o nome antigo); qualquer outro texto **visível na UI** (planner faz grep amplo).
- **D-05:** **NÃO** renomear: pasta do repositório (`crm-leads`), caminhos de CI, imports internos, strings de caminho.
- **D-06:** Refactor **completo** — todas as ocorrências de cor hardcoded em `src/` migram para tokens shadcn.
- **D-07:** Motivo do refactor completo: `/brand-design` só reescreve as CSS variables; sem o refactor o resultado fica pela metade (botão novo + sidebar velha).
- **D-08:** **Cores de status do pipeline** (Novo, Contatado, Negociação, Fechado, Perdido) usam uma **escala dedicada `--status-*`**, definida à parte da paleta de marca, em light + dark. Planner inventaria onde vivem hoje e cria os tokens.
- **D-09:** Mood para `/brand-design`: `serious` + `premium`.
- **D-10:** Categoria: `tooling/dev`.
- **D-11:** Paleta: aberta a virada total (navy, grafite+accent, roxo, etc.); não precisa girar em torno do teal atual. Usuário escolhe no preview HTML.
- **D-12:** Referência de **feeling** (não de paleta): CRM do amigo (GS Info Sistemas) — dark navy + accent teal + status colors, "sem cara de vibecode". Sóbrio, profissional. A paleta pode pivotar livremente.
- **D-13:** Executar o loop de regeneração do `/brand-design` até o usuário aprovar uma paleta no navegador.
- **D-14:** Estado do dark mode: código morto. `next-themes` instalado mas só `sonner.tsx` o usa; sem `ThemeProvider`, sem toggle, `body` com `bg-white` cravado. 16 usos de `dark:` em `src/` (todos em `components/ui/*`).
- **D-15:** Esta fase: `/brand-design` escreve os tokens `.dark` corretamente e o refactor D-06 corrige `bg-white`/neutros cravados para tokens que respondem ao `.dark`. É limpeza de dívida, não feature.
- **D-16:** **SEM toggle de tema na UI.** Adicionar `ThemeProvider` + controle é feature nova → viola "Zero feature nova" do v1.5.
- **D-17:** "Dark mode sem regressão" (SC#5) = a verificação **força `.dark`** temporariamente (classe via devtools) e confere que os tokens `.dark` são internamente consistentes (contraste WCAG AA, legibilidade, nada quebrado). Não exige dark mode acessível pela UI.
- **D-18:** `/brand-design` escolhe o par tipográfico (heading + corpo) que casa com serious + premium, via `next/font`. Pode manter Geist ou trocar. O `@theme` já tem `--font-heading` apontando pra `--font-sans` — planner decide se separa.
- **D-19:** "Regressão visual" = **quebra real apenas**: layout quebrado, texto ilegível, contraste < WCAG AA, dark mode bugado (quando forçado), elemento sumido/cortado. **Mudança de cor NUNCA é regressão** — é o objetivo da fase. O verificador não aponta "a cor mudou" nem julga gosto/estética.

### Claude's Discretion

- Mapeamento exato de cada cor hardcoded → token específico (decidir caso a caso conforme a paleta que sair do `/brand-design`).
- Se `--font-heading` vira fonte separada da `--font-sans` ou continua alias.
- Formato e profundidade da seção tom/voz do `brand.md`.
- Ordem de execução interna (provável: `/brand-design` primeiro → refactor de tokens → rename → verificação).
- Se favicon / Open Graph precisam de ajuste (tratar como "cara de produto" se trivial, senão anotar).

### Deferred Ideas (OUT OF SCOPE)

- **Toggle de dark mode na UI** (`ThemeProvider` + controle) — feature nova, fase própria num milestone futuro. A base fica pronta nesta fase.
- **Trocar o nome "SOLO"** — quando virar produto (landing, venda, multi-tenant). Anotado em `brand.md`.
- **Favicon / Open Graph image** — se não for trivial, polimento futuro.
- Nenhuma tela nova, nenhuma feature nova, sem registro de marca / compra de domínio, sem renomear a pasta do repo ou caminhos de CI.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição (REQUIREMENTS.md) | Suporte da pesquisa |
|----|----------------------------|---------------------|
| **BRAND-01** | App tem nome de produto definido ("SOLO"); decisão e racional registrados em `brand.md` na raiz | O skill `/brand-design` NÃO escreve seção de nome/racional/colisão — só paleta/tipografia/tom-voz. Planner precisa de uma task explícita que adiciona a seção de nome + ressalva de colisão (D-02) ao `brand.md` que o skill gera. Ver "Don't Hand-Roll" e "Common Pitfalls". |
| **BRAND-02** | `/brand-design` rodado — ~6 paletas em preview HTML, uma escolhida e aplicada como shadcn CSS variables (light + dark) em `globals.css`, tipografia via `next/font` | Workflow completo do skill mapeado abaixo ("Architecture Patterns" → "Fluxo do `/brand-design`"). Previews são HTML **estático** (sem dev server) — seguro no host de 4GB. Aplicação = reescrever conteúdo de `:root` e `.dark` + backup `globals.css.bak`. |
| **BRAND-03** | `brand.md` escrito (paleta, tipografia, tom/voz); "CRM de Leads" renomeado no `layout.tsx`, `app-sidebar.tsx` e onde mais aparecer; nenhuma regressão visual (verificação no navegador) | Grep confirma só 2 ocorrências do nome antigo em `src/` + `package.json name`. README não existe. Refactor de ~180 ocorrências de cor hardcoded em ~30 arquivos é o grosso do trabalho. Verificação de não-regressão: ver "Validation Architecture". |
</phase_requirements>

## Summary

Esta fase tem três blocos de trabalho, encadeados: (1) **rodar `/brand-design`** — um skill guiado que faz entrevista de 4 perguntas (respostas já decididas em D-01/D-09/D-10/D-12), gera 6 paletas candidatas, mostra num preview HTML estático no navegador, roda um loop de regeneração até o usuário aprovar, e então reescreve os tokens shadcn de `src/app/globals.css` (`:root` + `.dark`) com backup, mais tipografia via `next/font` em `layout.tsx`, e escreve um `brand.md` na raiz. (2) **Refactor de cor para token** — o app hoje tem ~180 ocorrências de cor hardcoded (`bg-[#0D9488]`, `bg-[#F4F4F5]`, `text-zinc-*`, `bg-white`, e mapas inline `style={{backgroundColor:"#..."}}`) espalhadas por ~30 arquivos de `src/components` e `src/app`. Sem migrar tudo para tokens (`bg-primary`, `bg-muted`, `bg-card`, `text-muted-foreground`, `border`), a paleta nova aplica só nos botões `<Button>` default e nada mais. As cores de **status do pipeline** (novo/contatado/negociação/fechado/perdido e os estados de urgência do dashboard) NÃO viram tokens de marca — viram uma escala semântica dedicada `--status-*` (D-08). (3) **Rename + verificação** — trocar "CRM de Leads"/"CRM LEADS"→"SOLO" (2 lugares em `src/` + `package.json`), ícone "I"→"S", e conferir no navegador que nada quebrou de layout/contraste/dark (D-19: só quebra real conta).

O maior risco não é técnico de fundo — é **escopo e completude do refactor** (deixar um `#0D9488` pra trás quebra a coerência) e **regressão de métrica de fonte** se `/brand-design` trocar Geist por uma fonte com x-height/avanço diferente (pode reflowar cards, células de tabela, o header do sidebar). O segundo risco é operacional: o host de 4GB bloqueou o UAT no navegador na Fase 18. Os previews do `/brand-design` são HTML estático e abrem sem dev server (seguro), mas a verificação de não-regressão das telas reais do app precisa de `npm run dev` + browser. Plano B: sensores automáticos (build Turbopack + script de contraste WCAG + guard de grep "zero hex em `src/`") como baseline Nyquist, e um checklist visual humano opcional/não-bloqueante no molde "code+data" da Fase 18.

**Primary recommendation:** Executar em 4 ondas — (W1) `/brand-design` end-to-end + augmentar `brand.md` com a seção de nome/colisão (BRAND-01); (W2) criar a escala `--status-*` light+dark e migrar os mapas de cor de status (etapa-badge, followup-dashboard, csv-import-preview-table, pipeline-*); (W3) refactor completo das cores de marca/neutro para tokens shadcn + corrigir `bg-white` do `body`; (W4) rename "SOLO" + ícone "S" + sensores de verificação (build, contraste, grep-guard) + checklist visual D-19. Não introduzir `ThemeProvider` nem toggle (D-16). Nenhum pacote npm novo.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Definição de tokens de cor (light/dark) | CSS / Design System (`src/app/globals.css`) | — | Fonte única de verdade; `@theme inline` expõe como utilitários Tailwind. Nunca por-componente (D-06/D-07). |
| Escala de status do pipeline `--status-*` | CSS / Design System (`globals.css`) | Componentes de apresentação (consomem via classe utilitária) | Precisa ser distinguível e estável; independente da marca (D-08). |
| Carregamento de tipografia | Frontend Server (Next.js `layout.tsx` + `next/font/google`) | CSS (`@theme` mapeia `--font-*`) | `next/font` inlina no build — zero FOUT, zero runtime fetch. Nunca `<link>` manual. |
| Metadata / `<title>` / `<description>` | Frontend Server (`layout.tsx` `export const metadata`) | — | App Router: metadata é server-only. |
| Chrome de navegação (sidebar, header, ícone de marca) | Client Component (`app-sidebar.tsx`, `"use client"` por causa de `usePathname`) | CSS tokens | String da marca + ícone vivem aqui; devem consumir `--sidebar-*`. |
| `brand.md` (artefato de referência) | Repo root (doc) | — | Lido por sessões futuras e pelo skill `frontend-design-guidelines`. Não é código. |
| Preview de paleta/tipografia | Arquivo estático local (`.brand-preview/*.html`) | Navegador (só render) | Gerado pelo skill; NÃO faz parte do bundle; deve ser gitignorado e apagado. |
| Verificação de não-regressão visual | Fora do runtime (build + scripts `.cjs` + olho humano) | — | Sob restrição de 4GB, priorizar sensores sem browser. |

## Standard Stack

**Nenhum pacote novo é instalado nesta fase.** Tudo que a fase precisa já está no `package.json`.

### Core (já instalado — versões verificadas em `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.10 | `next/font/google` (tipografia self-hosted no build), App Router metadata | `next/font` é o mecanismo oficial; elimina FOUT/CLS. `[CITED: typography-pairings.md]` |
| `react` / `react-dom` | 19.2.7 | — | Peer do Next 16. |
| `tailwindcss` | ^4 (`@tailwindcss/postcss` ^4) | CSS-first: `@theme inline`, `@custom-variant dark`, utilitários derivados de CSS vars | v4 lê as CSS vars direto — **não há `tailwind.config.js`** e não deve ser criado. `[VERIFIED: codebase grep — nenhum tailwind.config.* existe]` |
| `next-themes` | ^0.4.6 | Já presente; usado só por `sonner.tsx` via `useTheme()` | **Não expandir o uso nesta fase (D-16).** Fica como está. |
| `shadcn` (CLI) | ^4.13.1 | Só se algum primitivo precisar ser re-gerado (improvável) | components.json style `base-nova` (Base UI). |
| `@base-ui/react` | ^1.6.0 | Primitivos dos componentes `ui/` | Contexto: shadcn deste projeto é Base UI, não Radix. |
| `lucide-react` | ^1.25.0 | Ícones (o "S" do sidebar é texto, não ícone) | — |
| `sonner` | ^2.0.7 | Toaster; já lê `--popover`/`--border`/`--radius` via CSS vars | Responde à paleta nova automaticamente. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/font/google` (Inter, JetBrains_Mono, IBM_Plex_Sans, Manrope, Geist, Instrument_Serif, DM_Sans, Fraunces, …) | — (parte do `next`) | Par tipográfico escolhido no preview do skill | O skill escreve os imports em `layout.tsx`. Todas as fontes candidatas são Google Fonts, gratuitas, servidas pelo build. `[CITED: typography-pairings.md]` |
| `tailwind-merge` (`cn()` em `@/lib/utils`) | ^3.6.0 | Compor classes condicionais no refactor | Padrão já estabelecido no projeto — manter. |

### Fonte da tipografia (candidatas do skill para `serious` + `premium`)

O skill mistura as duas linhas de mood (`typography-pairings.md` → "Mood → 6 candidates"):
- **serious:** A (Inter + JetBrains Mono), G (IBM Plex Sans + Plex Mono), B (Geist + Geist Mono), H (Manrope + JBM), C (Instrument Serif + Inter + JBM), D (DM Sans + DM Mono)
- **premium:** C (Instrument Serif + Inter + JBM), H (Manrope + JBM), A (Inter + JBM), F (Fraunces + Inter + IBM Plex Mono), G (Plex Sans + Plex Mono), B (Geist + Geist Mono)
- **Blend provável apresentado:** A, C, + união de {G, B, H, F, D} — ou seja Inter, Instrument Serif+Inter, IBM Plex Sans, Geist, Manrope, Fraunces+Inter.
- **Default seguro** se o usuário pular: Pair A — Inter + JetBrains Mono.
- **Pares com serif** (C, F) implicam decidir D-18: `--font-heading` pode apontar para o serif (`DialogTitle` usa `font-heading` — ver Pitfall 4).

### Fonte da paleta (candidatas curadas do skill)

`references/palette-recipes.md` **não tem categoria `tooling/dev`** — as 6 categorias são defi, infra/data, consumer/social, memecoin/playful, ai/tech, nft/creative. `tooling/dev` mapeia para **infra/data (devtools)**. `[CITED: palette-recipes.md — "Index by category"]`
- Candidatas curadas prováveis para `serious`+`premium` (interseção dos índices por mood): **Graphite** (grafite puro, "shipping software not vibes"), **Meridian** (navy azul, "measured, authoritative"), **Vault Blue** (navy profundo, "private bank"), **Quantum Lab** (roxo frio), **Cloud Slate** (slate premium), **Bone White** (light quente premium), **Amber Monitor** (dark quente), **Midnight Signal** (terminal azul).
- + 3 variantes algorítmicas (uma no mood, uma mais bold, uma mais soft).
- O usuário decide no preview (D-11/D-13). A pesquisa não prescreve qual — só documenta o range.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Escala `--status-*` dedicada (D-08) | Derivar status da paleta de marca | Rejeitado por D-08: status precisa de verde/vermelho/âmbar/azul mutuamente distinguíveis; derivar da marca quebra a leitura do funil. |
| Reescrever `:root`/`.dark` in-place | Deixar o skill embrulhar em `@layer base` | O skill oferece "adicionar `@layer base` se não existir" — **evitar**: mudaria a especificidade da cascata (regras em `@layer` perdem para regras não-layered). Instruir o executor a substituir só o conteúdo dos blocos existentes. |
| `next/font/google` | `<link rel="stylesheet" href="fonts.googleapis.com">` | Rejeitado: reintroduz FOUT/CLS e um fetch de runtime para terceiro (também questão de privacidade/ASVS V14). |
| Adicionar `ThemeProvider` para dark real | — | Proibido por D-16 (feature nova). |

**Installation:** N/A — nenhum pacote novo.

**Version verification:** Feito via leitura direta de `package.json` `[VERIFIED: codebase]`. `next@16.2.10`, `react@19.2.7`, `tailwindcss@^4`, `next-themes@^0.4.6`, `sonner@^2.0.7`, `lucide-react@^1.25.0`, `shadcn@^4.13.1`, `@base-ui/react@^1.6.0`.

## Package Legitimacy Audit

**Nenhum pacote externo é instalado nesta fase.** As fontes tipográficas vêm de `next/font/google`, que é parte do pacote `next` já instalado (os arquivos de fonte são baixados no build-time pelo próprio Next e self-hosted; nenhuma dependência nova no `package.json`).

| Package | Registry | Disposition |
|---------|----------|-------------|
| — | — | Nenhum pacote adicionado. Audit N/A. |

**Packages removed due to slopcheck [SLOP] verdict:** none (nenhum pacote avaliado)
**Packages flagged as suspicious [SUS]:** none

> Nota de supply-chain fora de pacote npm: o skill `/brand-design` roda um `curl` de telemetria (POST para um endpoint Convex) no "Preamble" e no fechamento, a menos que `~/.superstack/config.json` tenha `telemetryTier: "off"`. Não é vulnerabilidade do projeto, mas o planner deve prever que na primeira execução o skill pergunta sobre telemetria — recomendar **"No thanks"** para não emitir pings. Ver "Security Domain".

## Architecture Patterns

### System Architecture Diagram — fluxo da fase

```
                      ┌─────────────────────────────────────────────┐
   Onda 1             │  /brand-design  (skill guiado)              │
   ───────            │                                             │
   respostas D-01/    │  Passo 1: entrevista 4 Qs ──────────────┐   │
   D-09/D-10/D-12 ───▶│    nome="SOLO"+desc, cat=tooling/dev,   │   │
                      │    mood=serious+premium, ref=CRM amigo  │   │
                      │  Passo 2: gera 6 paletas (3 curadas     │   │
                      │    infra/data + 3 algorítmicas)         ▼   │
                      │  Passo 3: escreve .brand-preview/index.html │
   navegador ◀────────┤    (ESTÁTICO) + abre com `start` (Windows)  │
   usuário escolhe ──▶│  Passo 4: loop regen (sem limite) até pick  │
                      │  Passo 5: BACKUP globals.css→.bak, reescreve│
                      │    :root + .dark  (14 tokens core+--radius) │
                      │  Passo 6: .brand-preview/typography.html    │
   usuário escolhe ──▶│    (ESTÁTICO) → wire next/font em layout.tsx│
                      │  Passo 7: gradientes (serious/premium→skip) │
                      │  Passo 8: escreve brand.md (SEM seção nome) │
                      └───────────────────┬─────────────────────────┘
                                          │
   Onda 1b (task do planner)              ▼
   ─────────────────────────   augmenta brand.md: seção "Nome" +
                               racional D-01 + ressalva colisão D-02   ──▶ BRAND-01 ✓

   Onda 2                      globals.css:  + --status-{neutral,info,
   ──────                        warning,success,danger}(-foreground)
                                 em :root E .dark  +  @theme inline
                                 (--color-status-*)
                                        │
                                        ▼
                          migra mapas de cor de STATUS:
                          etapa-badge.tsx (style inline → classe)
                          followup-dashboard.tsx (headerBg/Text)
                          csv-import-preview-table.tsx (badges)
                          pipeline-lead-card / pipeline-column
                          lead-table.tsx (botão WhatsApp verde)

   Onda 3                  refactor ~180 ocorrências de cor de
   ──────                  MARCA/NEUTRO → tokens shadcn:
                           bg-[#0D9488] → (remover override; <Button>)
                           bg-[#F4F4F5] → bg-muted / bg-sidebar / bg-card
                           text-zinc-*  → text-muted-foreground / text-foreground
                           bg-white     → bg-card / bg-background
                           border-zinc-*→ border
                           ring-[#0D9488]→ ring-ring
                           layout.tsx <body bg-white> → remove          ──▶ BRAND-02 ✓
                           app-sidebar.tsx → bg-sidebar / sidebar-accent

   Onda 4                  rename: layout.tsx title/description "SOLO"
   ──────                  app-sidebar.tsx header "SOLO" + ícone "S"
                           package.json name "solo"
                           (README não existe — criar mínimo ou anotar)
                                        │
                                        ▼
                    VERIFICAÇÃO (sensores, sem browser prioritário):
                    ① npm run build (Turbopack) exit 0
                    ② scripts/check-contrast.cjs — WCAG AA em :root + .dark
                    ③ scripts/verify-no-hardcoded-colors.cjs — grep-guard
                    ④ checklist visual D-19 (humano, quando houver RAM;
                       não-bloqueante, molde code+data da Fase 18)       ──▶ BRAND-03 ✓
```

### Recommended token structure em `src/app/globals.css`

```
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));

@theme inline {
  /* mapa token→var (shadcn) — MANTER; adicionar as linhas --color-status-* */
  --color-status-neutral: var(--status-neutral);
  --color-status-neutral-foreground: var(--status-neutral-foreground);
  --color-status-info: var(--status-info);
  ... (info/warning/success/danger + -foreground)
  /* --font-sans / --font-mono / --font-heading — atualizar p/ as vars da fonte nova */
}

:root {
  /* 14 tokens core — REESCRITOS pelo /brand-design (Passo 5) */
  /* --sidebar-* e --chart-* — o skill NÃO toca; planner alinha/deriva (ver Pitfall 3) */
  /* --status-* — NOVOS, fixos, não-derivados da marca (D-08) */
}

.dark {
  /* espelho do :root — /brand-design reescreve os 14 core; planner adiciona --status-* e alinha --sidebar-* */
}

@layer base { * { @apply border-border ... } body { @apply bg-background text-foreground } html { @apply font-sans } }
```

### Pattern 1: mapa de status por classe utilitária (não `style` inline)

**What:** hoje `etapa-badge.tsx` e `followup-dashboard.tsx` usam `style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}`. Isso não responde a `.dark` e não usa token.
**When to use:** todos os pontos de cor de status.
**Example:**
```tsx
// Source: padrão shadcn + D-08 (não há URL — derivado das contrast-rules do skill)
const STAGE_TOKEN: Record<Stage, string> = {
  novo:       "bg-status-neutral text-status-neutral-foreground",
  contatado:  "bg-status-info text-status-info-foreground",
  negociacao: "bg-status-warning text-status-warning-foreground",
  fechado:    "bg-status-success text-status-success-foreground",
  perdido:    "bg-status-danger text-status-danger-foreground",
};
// <Badge variant="outline" className={cn("border-transparent", STAGE_TOKEN[stage])}>
```

### Pattern 2: botão primário — remover o override, deixar o `<Button>` default

**What:** ~16 ocorrências de `<Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90">`. O `<Button>` default variant já é `bg-primary text-primary-foreground`.
**When to use:** todo botão de ação primária.
**Example:**
```tsx
// ANTES: <Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90" onClick={...}>Novo lead</Button>
// DEPOIS: <Button onClick={...}>Novo lead</Button>
```

### Pattern 3: `next/font` — trocar par mantendo o `@theme inline`

```tsx
// layout.tsx — o /brand-design escreve algo como:
import { Inter, JetBrains_Mono } from "next/font/google";
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
// <html className={`${sans.variable} ${mono.variable} h-full antialiased`}>
```
```css
/* globals.css @theme inline — as 3 linhas de fonte precisam casar com as `variable:` acima */
--font-sans: var(--font-sans);      /* era var(--font-geist-sans) */
--font-mono: var(--font-mono);      /* era var(--font-geist-mono) */
--font-heading: var(--font-sans);   /* D-18: manter alias, OU var(--font-serif) se par com serif */
```

### Anti-Patterns to Avoid

- **Deixar um `#0D9488` / `#F4F4F5` / `text-zinc-*` pra trás.** Quebra a coerência (D-07). O grep-guard da verificação existe pra isso.
- **Derivar status da marca.** Viola D-08.
- **Mover `:root` para dentro de `@layer base`.** Muda a cascata.
- **Adicionar `ThemeProvider` / toggle.** D-16.
- **`transition: all`** ao refatorar — usar `transition-colors` (é o que o código já faz; não regredir).
- **Julgar "a cor ficou feia" na verificação.** D-19 proíbe.
- **Renomear a pasta do repo, imports, ou paths.** D-05.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Escolher paleta + derivar 14 tokens shadcn light+dark com contraste AA | Um seletor de cores caseiro / escolher hex na mão | Skill `/brand-design` (Passos 2–5) | Ele já tem 30 paletas curadas + geração OKLCH + auto-ajuste de contraste + preview visual + loop. |
| Preview de paleta/tipografia no navegador | Subir o dev server e testar cores manualmente | `.brand-preview/*.html` (estático) que o skill gera | HTML estático = sem dev server = seguro no host 4GB. |
| Carregar fontes | `<link>` para Google Fonts, `@font-face` manual | `next/font/google` (o skill escreve) | Self-host no build, zero CLS, sem fetch de terceiro. |
| Contraste WCAG das cores finais | Conferir "no olho" | `references/contrast-rules.md` (o skill roda) + um `check-contrast.cjs` de verificação | Fórmula de luminância; determinístico. |
| Escrever a estrutura do `brand.md` | Template caseiro | `references/brand-md-template.md` (o skill usa) | **MAS:** o template NÃO tem seção de nome/racional/colisão — o planner adiciona isso por cima (BRAND-01/D-02). |
| Backup do tema antes de aplicar | Esquecer | O skill faz `cp globals.css globals.css.bak` (Passo 5, non-negotiable #4) | — |

**Key insight:** o `/brand-design` resolve o problema difícil (paleta+contraste+preview+tipografia). O trabalho manual da fase é: (a) **completar o `brand.md`** com o que o skill não escreve (nome/colisão), (b) a **escala `--status-*`** que o skill não conhece, (c) o **refactor mecânico** de ~180 call-sites, (d) o **rename**, (e) os **sensores de verificação**.

## Runtime State Inventory

> Fase de refactor + rename. Grep encontra arquivos; não encontra estado de runtime. Auditoria explícita:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | **Nenhum.** A string "CRM de Leads"/"CRM LEADS" não é persistida no `data/crm.db` — é literal de código em `layout.tsx` e `app-sidebar.tsx`. `data/crm.db` guarda leads/nichos/templates/tarefas/interações/motivos — nenhuma coluna com o nome do produto. Verificado por leitura do schema (STATE.md decisões de schema Fases 1–15) e pelo grep (só 2 hits em `src/`, 0 em migrações/scripts). | Nenhuma migração de dados. Só edição de literais. |
| **Live service config** | **Nenhum.** Sem serviços externos (sem Vercel/Turso/Datadog/n8n — o app roda `next dev`/`next start` local contra SQLite). Deploy é futuro (DEPLOY-01, outro milestone). | Nenhuma. |
| **OS-registered state** | **Nenhum.** Sem Task Scheduler, sem pm2, sem systemd. O usuário roda `npm run dev` manualmente. | Nenhuma. |
| **Secrets/env vars** | **Nenhum.** Sem `.env` no projeto (solo, sem auth, sem API keys). `grep` por env: nada referencia a marca. O skill `/brand-design` lê `~/.superstack/config.json` (telemetria) — não é secret do projeto. | Nenhuma. |
| **Build artifacts** | (1) `package.json` `name: "crm-leads"` → mudar para `"solo"` altera o `name` no `package-lock.json` na próxima instalação (cosmético, pacote é `private`). (2) `.next/` cache fica **stale** depois de trocar a fonte e os tokens — o CSS gerado e o font manifest precisam ser reconstruídos. (3) `src/app/favicon.ico` é o default do Next (ainda o placeholder). (4) `.brand-preview/` é criado pelo skill — **não** é build artifact do app mas polui o repo. | (1) opcional, sem urgência. (2) **`rm -rf .next` antes do `npm run build` de verificação** — evita CSS/fonte fantasma. (3) decidir favicon (Claude's Discretion). (4) adicionar `.brand-preview/` e `*.css.bak` ao `.gitignore`; apagar `.brand-preview/` no fim. |

**Canonical question — depois que todo arquivo do repo é atualizado, o que ainda tem a string/paleta velha em cache?** Só o cache do Next (`.next/`) e o `package-lock.json`. Ambos regeneram. Nada de estado externo, nada de dado persistido.

## Common Pitfalls

### Pitfall 1: `brand.md` gerado pelo skill NÃO cobre BRAND-01
**What goes wrong:** o `references/brand-md-template.md` tem seções de Paleta, Tipografia, Gradientes, Tom/Voz, Dos-and-don'ts — **mas nenhuma seção de nome de produto, racional da escolha, ou ressalva de colisão.** Se o planner assumir que "rodar `/brand-design` = BRAND-01 pronto", BRAND-01 fica sem cumprir.
**Why it happens:** o skill é de design visual; nome de produto está fora do escopo dele.
**How to avoid:** task explícita na Onda 1 que adiciona ao `brand.md` (depois do skill escrever) uma seção tipo `## Nome — SOLO` com: racional D-01 (som curto, "abre o SOLO", positioning CRM solo), e a **ressalva de colisão D-02 verbatim** ("nome descartável — trocar antes de qualquer movimento de produto/landing/venda"; Salesboom Solo CRM, SoloCRM/`solocrm.com`, Solo/`gosolo.io`; domínios `solocrm.com`/`gosolo.io` tomados).
**Warning signs:** SC#1 do ROADMAP fala em "decisão e racional registrados em `brand.md`" — se o `brand.md` só tem paleta/fonte, não passou.

### Pitfall 2: regressão de métrica de fonte ao trocar Geist
**What goes wrong:** Geist tem x-height e largura de avanço específicos. Trocar por Inter/IBM Plex/Manrope/DM Sans muda a largura das strings → o header do sidebar (`text-[11px] uppercase tracking-[0.08em]`), nomes de lead truncados em cards (`truncate`), células de `@tanstack/react-table`, e badges podem reflowar, quebrar linha a mais, ou cortar.
**Why it happens:** muitos componentes usam tamanho de fonte fixo em px + `leading-normal` + larguras fixas (`w-[240px]` no sidebar, `min-w-[200px]` nas colunas do pipeline).
**How to avoid:** (a) `next/font` já tem `adjustFontFallback` ligado por default — mitiga CLS mas não o reflow real; (b) preferir um par cujo sans seja métricamente próximo de Geist (Inter, Manrope) se o usuário estiver indeciso; (c) o checklist visual D-19 deve incluir explicitamente: sidebar header em 1 linha, nome de lead truncando com reticências (não quebrando), 5 colunas do pipeline cabendo sem scroll horizontal (já foi quick-fix `5b52ffa`), badges de etapa em 1 linha.
**Warning signs:** `npm run build` passa (não detecta reflow) mas o layout "respira diferente".

### Pitfall 3: `/brand-design` não escreve `--sidebar-*` nem `--chart-*`
**What goes wrong:** o skill deriva 14 tokens core (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`). O `globals.css` deste projeto TEM também `--sidebar` (8 tokens) e `--chart-1..5`. Depois do skill, o `.dark --sidebar-primary` continua sendo o leftover azul-roxo do default shadcn (`oklch(0.488 0.243 264.376)`), e os `--sidebar-*` light continuam grayscale — descolados da paleta nova. Como a Onda 3 troca o sidebar de `bg-[#F4F4F5]` para `bg-sidebar`, esses tokens passam a importar.
**Why it happens:** `--sidebar`/`--chart` são extensões do shadcn que o skill não modela.
**How to avoid:** task na Onda 2/3 que, depois do skill, **alinha os `--sidebar-*`** à paleta: opção simples = aliasar (`--sidebar: var(--card)`, `--sidebar-foreground: var(--card-foreground)`, `--sidebar-primary: var(--primary)`, `--sidebar-accent: var(--accent)`, `--sidebar-border: var(--border)`, `--sidebar-ring: var(--ring)`) em `:root` e `.dark`; opção com mais carinho = derivar um sidebar levemente off-background. **Corrigir o `.dark --sidebar-primary` azul.** `--chart-*`: grep confirma que **não são usados em `src/`** (nenhum `chart-` fora de `globals.css`) — deixar como está OU aliasar rapidamente; baixa prioridade.
**Warning signs:** sidebar com cor "de outra paleta" no dark forçado.

### Pitfall 4: `font-heading` está em uso (D-18 não é só teórico)
**What goes wrong:** `src/components/ui/dialog.tsx:125` — o `DialogTitle` usa `className="font-heading ..."`. Hoje `--font-heading` aliasa `--font-sans` (via `@theme inline`). Se o skill escolher um par com serif (Instrument Serif — Pair C, ou Fraunces — Pair F) e o executor apontar `--font-heading` para o serif, **todos os títulos de dialog do app viram serif** (lead form, timeline, whatsapp preview, tarefa, motivo perda, delete confirmations). Pode ser desejado (premium) ou uma surpresa.
**Why it happens:** `--font-heading` é usado em 1 lugar central que se propaga.
**How to avoid:** decisão consciente D-18 documentada no plano: se par com serif, ou (a) manter `--font-heading: var(--font-sans)` e usar o serif só em H1 de página (mas o app quase não tem H1 de página — é um admin), ou (b) deixar os títulos de dialog em serif de propósito. Recomendação: **manter alias `--font-sans`** salvo se o usuário pedir serif explicitamente no preview — o app é denso, títulos de dialog em serif podem parecer deslocados.
**Warning signs:** títulos de modal em fonte diferente do resto.

### Pitfall 5: host de 4GB — verificação visual bloqueada (repetição da Fase 18)
**What goes wrong:** `npm run dev` + Chrome + sessão Claude → ~200MB livres, renderer congela (documentado em STATE.md, Fase 18). A verificação de não-regressão de SC#5 precisa ver as telas.
**Why it happens:** hardware.
**How to avoid:** os **previews do skill são HTML estático** (`.brand-preview/index.html`, `.brand-preview/typography.html`) abertos com `start` — NÃO precisam de dev server, são seguros. Para a verificação das telas reais: sensores automáticos primeiro (ver Validation Architecture), checklist visual humano como camada não-bloqueante (molde code+data da Fase 18: `18-VERIFICATION.md` foi promovido a `passed` sem browser). O planner deve declarar isso no plano para o verifier não travar esperando browser.
**Warning signs:** o plano exige "abrir cada rota no navegador" como gate bloqueante.

### Pitfall 6: `accent-[#0D9488]` em `<input type="checkbox">` nativo
**What goes wrong:** `csv-column-mapper.tsx:148` e `csv-import-preview-table.tsx:189` usam `accent-[#0D9488]` (a propriedade CSS `accent-color` do checkbox nativo). `accent-primary` em Tailwind v4 resolve para `accent-color: var(--color-primary)` — funciona. Mas se alguém escrever `accent-[var(--primary)]` sem o prefixo `--color-`, pode falhar.
**How to avoid:** usar `accent-primary` (o utilitário que o `@theme inline` já expõe via `--color-primary`).

### Pitfall 7: `README` não existe
**What goes wrong:** BRAND-03 e D-04 mencionam "README (se citar o nome antigo)". `ls README*` → não existe nenhum.
**How to avoid:** não é bloqueante. Opções: (a) criar um `README.md` mínimo ("# SOLO — CRM para quem trabalha sozinho" + como rodar), (b) anotar no plano "README não existe, nada a renomear". Recomendação: criar um README mínimo — é literalmente "cara de produto" e trivial.

## Code Examples

### Inventário de cor hardcoded (dado para o planner mapear)

`git grep` de `#[0-9a-fA-F]{3,6}` + `-\[#` + `(bg|text|border|ring|accent)-(zinc|slate|gray|neutral|white|black|amber|blue|green|red|emerald)` em `src/**/*.{ts,tsx}` → **~190 matches em 32 arquivos** (1 falso positivo: `csv-encoding.ts:14` é `#840` num comentário; `ui/dialog.tsx:34` é `bg-black/10` do overlay). Top ofensores: `followup-dashboard.tsx` (12), `template-list.tsx` (8), `lead-table.tsx` (8), `csv-import-preview-table.tsx` (8), `nicho-manager.tsx` (7), `motivo-perda-manager.tsx` (7), `app-sidebar.tsx` (6), `lead-timeline-dialog.tsx` (5), `etapa-badge.tsx` (5).

**Grupos de substituição (cor de MARCA / neutro):**

| Padrão atual | Ocorrências (aprox.) | Token de destino sugerido |
|---|---|---|
| `bg-[#0D9488] text-white hover:bg-[#0D9488]/90` (em `<Button>`) | ~16 | remover o override → `<Button>` default (`bg-primary text-primary-foreground`) |
| `bg-[#F4F4F5]` (superfície cinza-clara: form sections, toolbars, cards, colunas pipeline) | ~20 | `bg-muted` (superfícies internas) / `bg-sidebar` (só sidebar) / `bg-card` (cards elevados) |
| `text-[#0D9488]` / `hover:text-[#0D9488]` (texto/ícone accent) | ~15 | `text-primary` / `hover:text-primary` |
| `bg-[#0D9488]/10 text-[#0D9488]` (item ativo sidebar, avatar de lead) | ~3 | sidebar: `bg-sidebar-accent text-sidebar-accent-foreground`; avatar: `bg-primary/10 text-primary` |
| `text-zinc-400` / `text-zinc-500` / `text-zinc-700` | ~10 | `text-muted-foreground` (400/500) / `text-foreground` ou `text-sidebar-foreground` (700) |
| `border-zinc-200` / `border-zinc-300` | ~12 | `border` (usa `--border` via `@layer base * { border-border }`) ou `border-input` (campos) |
| `hover:bg-zinc-200/60` | ~1 (sidebar) | `hover:bg-sidebar-accent` |
| `bg-white` (cards, `<body>`) | ~10 | `bg-card` (cards); `layout.tsx:32` `<body>` → **remover** `bg-white` (o `@layer base` já dá `bg-background`) |
| `text-[#DC2626]` (ícone/texto de exclusão) | ~12 | `text-destructive` |
| `ring-[#0D9488]` / `focus-visible:ring-[#0D9488]/50` / `focus-visible:border-[#0D9488]` | ~8 | `ring-ring` / `focus-visible:ring-ring/50` / `focus-visible:border-ring` |
| `accent-[#0D9488]` (checkbox nativo) | 2 | `accent-primary` |
| `bg-[#E4E4E7]` (coluna pipeline `isOver`) | 2 | `bg-accent` |
| `style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}` (`template-list.tsx:52`) | 1 | className `bg-primary/10 text-primary` |
| `bg-black/10` (overlay do dialog, `ui/dialog.tsx:34`) | 1 | manter ou `bg-foreground/10` (opcional, baixa prioridade) |

**Cores de STATUS (D-08 → escala `--status-*`, NÃO marca):**

| Arquivo:linha | Uso | Cor atual (light) | Token de status |
|---|---|---|---|
| `etapa-badge.tsx:12` | etapa "Novo" | `#F4F4F5` / `#3F3F46` | `--status-neutral` / `-foreground` |
| `etapa-badge.tsx:13` | etapa "Contatado" | `#DBEAFE` / `#1D4ED8` | `--status-info` / `-foreground` |
| `etapa-badge.tsx:14` | etapa "Negociação" | `#FEF3C7` / `#B45309` | `--status-warning` / `-foreground` |
| `etapa-badge.tsx:15` | etapa "Fechado" | `#DCFCE7` / `#15803D` | `--status-success` / `-foreground` |
| `etapa-badge.tsx:16` | etapa "Perdido" | `#FEE2E2` / `#B91C1C` | `--status-danger` / `-foreground` |
| `followup-dashboard.tsx:96-99` | urgência "Vencidos" | `#FEE2E2` / `#B91C1C` + `text-[#B91C1C]` | `--status-danger` |
| `followup-dashboard.tsx:104-107` | urgência "Hoje" | `#FEF3C7` / `#B45309` + `text-[#B45309]` | `--status-warning` |
| `followup-dashboard.tsx:113-115` | urgência "Próximos 7 dias" | `#F4F4F5` / `#3F3F46` | `--status-neutral` (o `dateClassName` já é `text-muted-foreground`) |
| `csv-import-preview-table.tsx:70,156` | flag "duplicado" | `#FEF3C7` / `#B45309` | `--status-warning` |
| `csv-import-preview-table.tsx:80` | flag "nicho novo" | `#DBEAFE` / `#1D4ED8` | `--status-info` |
| `csv-import-preview-table.tsx:90` | flag neutra | `#E4E4E7` / `#3F3F46` | `--status-neutral` |
| `csv-import-preview-table.tsx:100` | flag "bloqueado" | `#FEE2E2` / `#B91C1C` | `--status-danger` |
| `pipeline-lead-card.tsx:63` | borda "esfriando" | `border-[#F59E0B]` | `border-status-warning` |
| `pipeline-lead-card.tsx:104` | label "Esfriando" | `text-[#B45309]` | `text-status-warning` (ou `-foreground`) |
| `lead-table.tsx:264` | botão WhatsApp (sólido verde) | `bg-[#22C55E] hover:bg-[#16A34A]` | `--status-success` (ou um `--whatsapp` dedicado — decisão do planner; verde de "enviar zap" ≈ success) |
| `whatsapp-preview-dialog.tsx:172,175` | erro "telefone inválido" | `text-[#B91C1C]` | `text-destructive` (é erro, não status de pipeline) |
| `relatorios/page.tsx:97` | faixa "intervalo inválido" | `border-amber-200 bg-amber-50 text-amber-900` | `--status-warning` (mantém semântica de aviso) |

**Escala `--status-*` recomendada** (fixa, 5 cores semânticas, light + dark; valores exatos = Claude's Discretion do executor, aproximar dos hex atuais em light e escurecer o `bg` / clarear o `fg` no dark, mantendo AA):

```css
:root {
  --status-neutral: oklch(0.97 0 0);        --status-neutral-foreground: oklch(0.37 0 0);
  --status-info: oklch(0.93 0.05 255);      --status-info-foreground: oklch(0.45 0.16 255);
  --status-warning: oklch(0.94 0.06 85);    --status-warning-foreground: oklch(0.48 0.11 65);
  --status-success: oklch(0.94 0.06 155);   --status-success-foreground: oklch(0.48 0.13 155);
  --status-danger: oklch(0.93 0.05 25);     --status-danger-foreground: oklch(0.48 0.19 25);
}
.dark {
  --status-neutral: oklch(0.27 0 0);        --status-neutral-foreground: oklch(0.87 0 0);
  --status-info: oklch(0.30 0.06 255);      --status-info-foreground: oklch(0.85 0.10 255);
  --status-warning: oklch(0.32 0.06 70);    --status-warning-foreground: oklch(0.87 0.10 85);
  --status-success: oklch(0.30 0.07 155);   --status-success-foreground: oklch(0.87 0.12 155);
  --status-danger: oklch(0.30 0.08 25);     --status-danger-foreground: oklch(0.87 0.12 25);
}
```
E registrar no `@theme inline`: `--color-status-neutral: var(--status-neutral);` etc. (10 linhas) para habilitar `bg-status-*` / `text-status-*` / `border-status-*`.

### Rename — superfícies conhecidas (grep confirmado)

```
src/app/layout.tsx:18      title: "CRM de Leads"                → "SOLO"
src/app/layout.tsx:19      description: "CRM pessoal para..."   → manter sentido, tirar/ajustar (opcional)
src/components/app-sidebar.tsx:42   texto do ícone "I"          → "S"
src/components/app-sidebar.tsx:45   "CRM LEADS"                 → "SOLO"
package.json:2             "name": "crm-leads"                 → "solo"
README.md                  não existe                          → criar mínimo OU anotar
src/app/favicon.ico        placeholder default do Next         → Claude's Discretion (icon.svg "S"?)
```
Grep de `"CRM de Leads"|"CRM LEADS"|"CRM Leads"` em `src/` retornou **exatamente esses 2**. Nenhum em `public/` (só svgs default do Next: file/globe/next/vercel/window). `layout.tsx` metadata não tem `openGraph` nem `metadataBase` hoje.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `tailwind.config.js` com `theme.extend.colors` mapeando `hsl(var(--x))` | Tailwind v4 CSS-first: `@theme inline` no CSS, sem arquivo de config | Tailwind v4 (2024→) | O skill sabe disso (`shadcn-integration.md` §"Tailwind config notes" — "v4 não precisa de mapeamento"). Não criar `tailwind.config.*`. |
| shadcn com CSS vars em HSL (`--background: 0 0% 100%`) | shadcn v4 em OKLCH (`--background: oklch(1 0 0)`) | shadcn v4 / 2024 | Este projeto já está em OKLCH (`globals.css` verificado). O skill gera OKLCH. Match. |
| `<link>` para Google Fonts | `next/font/google` (self-host no build) | Next 13+ | O skill usa `next/font`. Já é o padrão do projeto (Geist via `next/font/google`). |
| `react-beautiful-dnd`, Moment.js | `@dnd-kit`, `date-fns` | — | Já resolvido no projeto; não é escopo desta fase. |

**Deprecated/outdated:**
- Categoria `tooling/dev` do interview do skill **não tem entrada em `palette-recipes.md`** (que só cobre defi/infra/consumer/memecoin/ai/nft). O skill cai para infra/data. Não é bug — é o comportamento de fallback documentado.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O `/brand-design` reescreve só os 14 tokens core + `--radius` e NÃO toca `--sidebar-*`/`--chart-*` | Pitfall 3, Standard Stack | Se ele tocar sidebar também, a task de alinhamento vira no-op (inofensivo). Se tocar de forma errada, precisa correção. |
| A2 | Os previews `.brand-preview/*.html` são 100% estáticos e abrem sem dev server | Summary, Pitfall 5, Validation | Se precisarem de servidor, o passo de escolha de paleta esbarra no limite de 4GB — precisaria de plano B (gerar preview e o usuário abre offline). `[CITED: SKILL.md Passo 3 — "Write the filled template to .brand-preview/index.html ... open it"]` — alta confiança de que é estático. |
| A3 | Trocar Geist por outro sans causa reflow perceptível em pontos de largura fixa | Pitfall 2 | Se o par escolhido for métricamente próximo (ou Geist mantido), risco baixo. |
| A4 | Nenhuma cor "CRM de Leads" está persistida em `data/crm.db` | Runtime State Inventory | Muito baixo — schema conhecido, grep limpo. |
| A5 | `npm run build` (Turbopack) roda no host 4GB | Validation, Environment | `[VERIFIED: STATE.md + MEMORY — build passou limpo desde 2026-08-29]` |
| A6 | O skill pergunta sobre telemetria na 1ª execução e um `curl` de POST é emitido salvo opt-out | Package Legitimacy, Security | `[CITED: SKILL.md Preamble]` — comportamento confirmado no arquivo do skill. |
| A7 | `check-contrast.cjs` consegue parsear `oklch()` e estimar contraste sRGB "bom o suficiente" para gate | Validation Architecture | OKLCH L ≠ luminância sRGB exatamente (o próprio `contrast-rules.md` avisa). O script serve de rede de segurança, não de verdade absoluta — o skill já auto-ajusta AA. Risco: falso-negativo raro. |

## Open Questions (RESOLVED)

> Todas as quatro questões foram fechadas no planejamento da fase. Cada uma aponta para o plano
> que travou a decisão — nenhuma decisão em aberto entra na execução.

1. **Favicon / Open Graph (Claude's Discretion D-Discretion)**
   - What we know: `src/app/favicon.ico` é o placeholder do Next; sem `openGraph` no metadata; o ícone de marca da UI é a letra "S" em `<div>`, não um asset.
   - What's unclear: se vale gerar um `src/app/icon.svg` (ou `icon.tsx` com `ImageResponse`) com "S" na cor primária, e um OG image.
   - **RESOLVED:** favicon SIM — `src/app/icon.svg` com "S" sobre `--primary` (cópia literal da cor, registrada no `brand.md`), mais remoção do `favicon.ico` placeholder → **plano 19-06, Task 1**. Open Graph image e `metadataBase` **DIFERIDOS** (precisam de arte, o app não é público) → 19-CONTEXT §Deferred Ideas; o plano 19-05 Task 1 proíbe explicitamente adicionar `openGraph` ao metadata.

2. **`--font-heading` com par serif (D-18)**
   - What we know: `font-heading` é usado só em `DialogTitle` (`ui/dialog.tsx:125`).
   - What's unclear: se o usuário vai escolher um par com serif no preview e se quer títulos de dialog em serif.
   - **RESOLVED:** decidido no momento da escolha da tipografia — o `--font-heading` é materializado no `@theme inline` de `globals.css` → **plano 19-02, Task 2**. Default = `--font-heading: var(--font-sans)`; se o usuário escolher um par com serif e gostar no preview, apontar para o serif conscientemente. O plano 19-05 Task 3 proíbe alterar o `font-heading` do `DialogTitle` — a decisão vive no token, não no componente.

3. **`--status-*`: 5 cores semânticas vs. 5 tokens por-etapa**
   - What we know: as 5 etapas mapeiam 1:1 para 5 cores, e essas mesmas 5 cores reaparecem no dashboard de urgência e nas flags do CSV.
   - **RESOLVED:** **5 semânticas** (`neutral/info/warning/success/danger`), criadas em `:root` e `.dark` e reusadas por etapa E por urgência E por flag; `etapa-badge.tsx` mapeia etapa→token → **plano 19-03** (Task 1 cria os tokens, Task 2 consome em `etapa-badge`, Task 3 em `followup-dashboard`/`relatorios`). O `check-contrast.cjs` valida os 5 pares `status-*-foreground/status-*` em ambos os blocos.

4. **Botão WhatsApp verde (`#22C55E`) — `--status-success` ou token próprio?**
   - **RESOLVED:** reusar `--status-success` (verde de "enviado/ganho" é a mesma família); nenhum token `--whatsapp` é criado → **plano 19-04**, na migração de `whatsapp-send-button` / `whatsapp-preview-dialog`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | build, scripts `.cjs`, `next/font` | ✓ | (projeto já roda) | — |
| `next` / Turbopack build | gate de verificação `npm run build` | ✓ | 16.2.10 | — (já verificado no host 4GB) |
| Navegador (Chrome) para abrir `.brand-preview/*.html` | escolha de paleta/tipografia (Passos 3–6 do skill) | ✓ | — | HTML estático — abre sem dev server; seguro no host 4GB |
| `npm run dev` + Chrome + sessão Claude simultâneos | verificação visual das telas reais (SC#5) | ✗ (bloqueado) | — | **Sensores automáticos** (build + `check-contrast.cjs` + `verify-no-hardcoded-colors.cjs`) + checklist visual humano não-bloqueante (molde code+data da Fase 18) |
| `start` (Windows shell) para auto-abrir o preview | conveniência do skill | ✓ | — | se falhar, o skill imprime o path `file://` para abrir na mão |
| `~/.superstack/` (config de telemetria do skill) | Preamble do `/brand-design` | provavelmente ✗ (1ª vez) | — | o skill cria o dir e pergunta sobre telemetria; responder "No thanks" |
| `slopcheck` | audit de pacote | N/A | — | nenhum pacote instalado nesta fase |

**Missing dependencies with no fallback:** nenhuma que bloqueie.
**Missing dependencies with fallback:** verificação visual full-browser → sensores automáticos + checklist humano diferido (não bloqueia o fecho, precedente Fase 18).

## Validation Architecture

> `workflow.nyquist_validation: true` em `.planning/config.json` → seção obrigatória.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Nenhum framework de teste de UI.** O projeto usa harnesses `.cjs` artesanais (`node scripts/*.cjs`) para Server Actions/queries. Não há Jest/Vitest/Playwright. |
| Config file | none — scripts standalone via `package.json` `scripts` |
| Gates disponíveis | `npx tsc --noEmit` (sem script dedicado), `npm run build` (Turbopack), `npm run lint` (exit 0 desde Fase 17), `npm run guard:no-hard-delete`, `npm run verify:schema` |
| Quick run command | `npx tsc --noEmit && npm run lint` |
| Full suite command | `npm run build` (após `rm -rf .next`) + os `scripts/test:*` existentes (regressão geral, não específicos da fase) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | `brand.md` existe na raiz com seção de nome + racional + ressalva de colisão | file/grep | `test -f brand.md && grep -qi "colis\|descart\|SoloCRM" brand.md` | ❌ Wave 0 (`scripts/verify-brand-md.cjs`) |
| BRAND-02 | `:root` e `.dark` de `globals.css` têm paleta não-grayscale aplicada (chroma > 0 em pelo menos `--primary`) | grep | `scripts/verify-brand-md.cjs` checa `--primary:` em `:root` com C≠0 OU != valor default | ❌ Wave 0 |
| BRAND-02 | Tipografia via `next/font/google` ligada em `layout.tsx` (par escolhido, ou Geist mantido conscientemente) | grep | `grep -E "next/font/google" src/app/layout.tsx` + `grep -E "variable:\s*\"--font-(sans\|mono\|serif)\"" src/app/layout.tsx` | ❌ Wave 0 |
| BRAND-02 | `globals.css.bak` foi criado (backup do skill) | file | `test -f src/app/globals.css.bak` | ❌ Wave 0 |
| BRAND-02 | Tokens contrastam WCAG AA em light E dark (pares de `contrast-rules.md`) | script | `node scripts/check-contrast.cjs` (parseia `:root`+`.dark`, computa ratio, exige AA nos ~13 pares) | ❌ Wave 0 |
| BRAND-02/03 | Refactor completo — zero cor hardcoded em `src/` fora da allowlist | grep-guard | `node scripts/verify-no-hardcoded-colors.cjs` (falha se `#hex` ou `-\[#` ou `(bg\|text\|border\|ring)-(zinc\|slate\|gray\|neutral\|white\|black)` aparece em `src/**/*.{ts,tsx}`, exceto allowlist: `csv-encoding.ts` comentário, `ui/dialog.tsx` overlay se mantido) | ❌ Wave 0 |
| BRAND-03 | "CRM de Leads"/"CRM LEADS" ausente de `src/` e `package.json` | grep-guard | `! git grep -nE "CRM de Leads\|CRM LEADS\|CRM Leads" -- src/ package.json` | ❌ Wave 0 (dobra no script acima) |
| BRAND-03 | Ícone do sidebar é "S" | grep | `grep -A2 'aria-hidden="true"' src/components/app-sidebar.tsx \| grep -q '\bS\b'` | ❌ Wave 0 |
| BRAND-02/03 | App compila e todas as rotas geram | build | `rm -rf .next && npm run build` exit 0 (13+ páginas) | ✅ existe (`npm run build`) |
| BRAND-02/03 | Sem erro de tipo introduzido pelo refactor | typecheck | `npx tsc --noEmit` | ✅ |
| BRAND-03 | Nenhuma regressão visual real (D-19) nas 10 rotas + dialogs | manual/checklist | checklist humano no navegador **quando houver RAM** — NÃO bloqueante (precedente Fase 18) | ❌ Wave 0 (`19-HUMAN-UAT.md`) |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npm run lint`
- **Per wave merge:** `node scripts/check-contrast.cjs && node scripts/verify-no-hardcoded-colors.cjs && node scripts/verify-brand-md.cjs`
- **Phase gate:** `rm -rf .next && npm run build` verde + os 3 scripts novos verdes + `19-HUMAN-UAT.md` autorado (executado ao vivo se RAM permitir, senão `code+data`/diferido como na Fase 18) antes de `/gsd-verify-work`.

### Definição operacional de "regressão visual" (D-19) — para o `19-HUMAN-UAT.md`

Conta como regressão (bloqueia): layout quebrado (elementos sobrepostos, empurrados pra fora), texto ilegível, contraste < WCAG AA (medido, não achismo), dark mode bugado **quando `.dark` é forçado** (texto invisível, superfície branca cravada), elemento sumido/cortado/truncado errado, sidebar header quebrando em 2 linhas, colunas do pipeline com scroll horizontal, badge de etapa quebrando linha.
**NÃO conta** (nunca bloqueia): "a cor mudou", "não gostei da combinação", "o teal sumiu", "ficou escuro demais pro meu gosto", qualquer julgamento estético.

### Rotas a cobrir no checklist (NAV_ITEMS + dialogs)

`/` (follow-ups + tarefas), `/leads` (+ LeadFormDialog, LeadTimelineDialog, WhatsAppPreviewDialog, delete dialog), `/importar` (+ `/importar/[batchId]`, wizard: upload → column-mapper → preview-table → post-import list), `/pipeline` (+ drag entre colunas, MotivoPerdaDialog no drop pra "Perdido", pipeline-lead-card), `/relatorios` (+ faixa de intervalo inválido, PeriodoSelector), `/templates` (+ TemplateFormDialog), `/nichos` (+ NichoManager criável), `/motivos-perda` (+ MotivoPerdaManager, MotivoPerdaCombobox criável), `/lixeira` (LixeiraTable), `/configuracoes` (ConfiguracoesForm). Cada uma em light + com `.dark` forçado.

### Wave 0 Gaps

- [ ] `scripts/check-contrast.cjs` — parseia `:root` e `.dark` de `globals.css`, computa contraste (aprox. sRGB a partir de OKLCH), valida os ~13 pares de `contrast-rules.md` em light e dark. Cobre BRAND-02.
- [ ] `scripts/verify-no-hardcoded-colors.cjs` — grep-guard: falha se hex/`-[#`/escala-neutra-Tailwind aparece em `src/**/*.{ts,tsx}` fora da allowlist; também checa ausência de "CRM de Leads"/"CRM LEADS". Cobre BRAND-02 + BRAND-03. Adicionar aos `package.json` scripts como `verify:brand`.
- [ ] `scripts/verify-brand-md.cjs` — `brand.md` existe + tem seções Paleta, Tipografia, Tom/voz, **Nome/racional/colisão**; `globals.css.bak` existe; `layout.tsx` importa de `next/font/google`. Cobre BRAND-01.
- [ ] `19-HUMAN-UAT.md` — checklist das rotas acima com a definição D-19, para execução ao vivo (se RAM) ou registro `code+data`/diferido.
- [ ] `.gitignore` — adicionar `.brand-preview/` e `*.css.bak` (hoje só tem `/.next/`).
- Framework install: **nenhum** — tudo Node built-in.

## Security Domain

> `workflow.security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não | app solo sem auth (permanente, `PROJECT.md`) |
| V3 Session Management | não | — |
| V4 Access Control | não | — |
| V5 Input Validation | não | nenhuma entrada nova nesta fase (CSS vars, literais de string, `brand.md`) |
| V6 Cryptography | não | — |
| V14 Configuration / Supply Chain | **sim** | (1) fontes via `next/font/google` = self-hosted no build, **sem fetch de runtime para terceiro** e sem vazar `Referer`/IP do usuário para o Google — controle correto por construção. (2) Nenhum pacote npm novo. (3) O skill `/brand-design` emite telemetria via `curl` POST — responder "No thanks" (`telemetryTier: off`) para não emitir. (4) `globals.css.bak` como rollback de escrita corrompida. |
| V7 Error Handling / Logging | marginal | nenhuma mudança de logging |

### Known Threat Patterns for {Next.js 16 + Tailwind v4 + CSS tokens}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSS injection via valor de token não-confiável | Tampering | N/A — todos os valores de `globals.css` são literais escritos pelo skill/dev, nenhum vem de input do usuário |
| Fonte carregada de CDN de terceiro (vaza IP/UA, risco de MITM no CSS) | Information Disclosure | `next/font/google` self-hosta no build — não usar `<link>` (já é o padrão do projeto) |
| Telemetria do skill exfiltra metadados | Information Disclosure | opt-out (`~/.superstack/config.json` → `telemetryTier: off`); o payload documentado não inclui código nem paths, mas o default é ligado |
| `.brand-preview/` ou `globals.css.bak` commitados por engano | Information Disclosure (menor) | `.gitignore` + apagar `.brand-preview/` no fim (Passo 9 do skill) |
| Regressão que torna texto ilegível (falha de acessibilidade) | (Denial of usability) | `check-contrast.cjs` + checklist D-19 |
| `dangerouslySetInnerHTML` / `eval` introduzidos | — | não aplicável; a fase não adiciona nenhum |

`/gsd-secure-phase 19` deve fechar rápido: threat surface = CSS variables + strings de metadata + carregamento de fonte, sem lógica nova (consistente com o "Threat surface: baixa" do ROADMAP e o `ui_safety_gate`).

## Sources

### Primary (HIGH confidence)
- `~/.claude/skills/brand-design/SKILL.md` — workflow completo (9 passos), non-negotiables, prerequisites, regen loop
- `~/.claude/skills/brand-design/references/shadcn-integration.md` — 5 seeds → 14 tokens, template CSS, "como escrever no globals.css" (in-place, preservar resto)
- `~/.claude/skills/brand-design/references/contrast-rules.md` — pares WCAG AA a verificar, auto-ajuste, heurísticas OKLCH
- `~/.claude/skills/brand-design/references/typography-pairings.md` — 9 pares Google Fonts, mapa mood→6 candidatas, default Inter+JBM, integração `@theme` v4
- `~/.claude/skills/brand-design/references/brand-md-template.md` — template do `brand.md` (confirma ausência de seção de nome), mapa mood→tom/voz
- `~/.claude/skills/brand-design/references/palette-recipes.md` — 30 paletas por categoria×mood; confirma que `tooling/dev` cai em infra/data
- `~/.claude/skills/brand-design/references/html-preview.md` — preview estático, toggle light/dark via `data-theme` no `<html>`
- Codebase (`git grep`, leitura direta): `src/app/globals.css`, `src/app/layout.tsx`, `src/components/app-sidebar.tsx`, `src/components/etapa-badge.tsx`, `src/components/ui/sonner.tsx`, `src/components/followup-dashboard.tsx`, `src/components/pipeline-lead-card.tsx`, `package.json`, `next.config.ts`, `.gitignore`
- `.planning/config.json` — flags de workflow (nyquist, security, ui_phase)
- `.planning/STATE.md` — restrição de 4GB, método code+data da Fase 18, `npm run build` verde

### Secondary (MEDIUM confidence)
- `.planning/ANALISE-CRM-CONCORRENTE-E-GAPS.md` §3 — por que o CRM do amigo não parece vibecode (referência de feeling D-12)
- STATE.md quick tasks `5b52ffa`/`0a72800` — layout do pipeline (5 colunas, truncate do nome) já ajustado; alvo de não-regressão

### Tertiary (LOW confidence)
- Estimativa de risco de reflow por troca de fonte (A3) — baseado em conhecimento de métrica tipográfica, não medido neste ambiente
- Valores OKLCH sugeridos para `--status-*` — ponto de partida, o executor ajusta no contexto da paleta escolhida

## Metadata

**Confidence breakdown:**
- Workflow do `/brand-design`: HIGH — lido na fonte (SKILL.md + 5 references)
- Inventário de cor hardcoded: HIGH — `git grep` exaustivo, 190 matches / 32 arquivos catalogados
- Superfícies de rename: HIGH — grep confirmou 2 hits em `src/`; README inexistente confirmado
- Escala `--status-*`: MEDIUM — estrutura clara (5 semânticas), valores exatos a cargo do executor
- Risco de regressão de fonte: MEDIUM — real mas dependente do par escolhido
- Plano B de verificação sob 4GB: MEDIUM — sensores automáticos são sólidos; cobertura visual depende de janela de RAM ou aceitação code+data (precedente Fase 18)
- Security: HIGH — surface quase nula, sem pacote novo, sem input novo

**Research date:** 2026-09-02
**Valid until:** 2026-10-02 (estável — Tailwind v4 / shadcn OKLCH / `next/font` são maduros; o skill é local e versionado). Revalidar antes se `next` ou `tailwindcss` subir de major.
