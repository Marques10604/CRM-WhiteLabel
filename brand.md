# Brand — SOLO

CRM pra quem trabalha sozinho: organiza leads, pipeline e follow-ups sem equipe, sem fila, sem SLA.

_Gerado pelo skill `brand-design` em 2026-09-02 (fase 19). Atualize re-rodando o skill._

## Nome — SOLO

### Racional (D-01)

**SOLO.** Uma palavra, som curto, vira verbo no uso diário ("abre o SOLO"). Positioning: um CRM
para quem toca a operação **sozinho** — sem equipe de vendas, sem fila de atendimento, sem SLA.
Não é um helpdesk multi-usuário nem um CRM de time; é a ferramenta de uma pessoa que aborda
leads pelo Instagram e WhatsApp e não pode mais perder um follow-up.

O usuário explorou alternativas antes de travar: SoloFlow, SoloFunil, SoloPipe, SoloCue, e nomes
PT-BR distintos como Relance e Farol. Decidiu conscientemente por **SOLO puro** — conhecendo a
fraqueza do nome e o trade-off — para não gastar mais rodadas de naming agora.

### Ícone (D-03)

A letra **"S"** sobre `--primary`, aplicada no selo do header da barra lateral (antes era um "I"
placeholder).

**Favicon (fase 19, plano 19-06):** `src/app/icon.svg` — retângulo `rx=7` na cor primária com o
"S" em `primary-foreground`, servido pela convenção de arquivo `icon.svg` do App Router (gera o
`<link rel="icon">` no `<head>`). O placeholder `src/app/favicon.ico` do Next foi removido. O SVG
é estático e **carrega uma cópia literal** dos valores de `--primary` (`#197076`) e
`--primary-foreground` (`#fbfefe`) — um arquivo servido como asset estático não enxerga as CSS
variables do app. **Trocar a paleta exige atualizar `src/app/icon.svg` à mão.** O SVG não contém
`<script>`, `<foreignObject>` nem qualquer referência externa — só formas e texto.

### Ressalva de colisão (D-02)

**Nome descartável — trocar antes de qualquer movimento de produto, landing page ou venda.**

"SOLO" colide forte no espaço de CRM:

- **Salesboom Solo CRM** — mesma categoria, CRM.
- **SoloCRM** (`solocrm.com`) — CRM offline "para solopreneurs / freelancers", posicionamento
  quase idêntico ao nosso.
- **Solo / `gosolo.io`** — plataforma home-service com módulo de CRM.

Os domínios `solocrm.com` e `gosolo.io` estão tomados. O trade-off é **aceitável agora** porque
SOLO é ferramenta interna de um único usuário, sem superfície pública. No momento em que existir
landing page, cobrança ou multi-tenant, o nome **precisa mudar** — o espaço "Relance" e "Farol"
estava limpo nas buscas e são candidatos.

### Escopo do rename (D-04 / D-05)

Renomeado para **SOLO** em: `layout.tsx` (`<title>` + `description`), header + ícone da barra
lateral (`app-sidebar.tsx`), `package.json` `name`, e este `brand.md` + `README.md`.

**NÃO** renomeado, de propósito: a pasta do repositório continua `crm-leads`; caminhos de CI,
imports internos e strings de path ficam intactos — renomear quebraria infra sem ganho visível.

## Paleta — Corrente Funda · Sóbria

**Vibe:** navy profundo + teal contido · sóbrio, profissional, "sem cara de vibecode"
**Category:** tooling/dev (o skill caiu para `infra/data (devtools)` — fallback esperado)
**Mood:** serious + premium
**Referência de sensação:** o CRM dark-navy-e-teal de um parceiro (GS Info Sistemas) — referência
de *feeling* (sóbrio, não-amador), não de paleta.

### Seeds

| Role | Light OKLCH | Light Hex | Dark OKLCH | Dark Hex |
|---|---|---|---|---|
| bg-base | `oklch(0.985 0.006 215)` | `#F6FBFD` | `oklch(0.15 0.022 220)` | `#020D12` |
| bg-elevated | `oklch(1 0 0)` | `#FFFFFF` | `oklch(0.2 0.026 220)` | `#07191E` |
| primary | `oklch(0.5 0.078 202)` | `#197076` | `oklch(0.75 0.08 200)` | `#6CBEC2` |
| primary-soft | `oklch(0.69 0.06 202)` | `#6EA7AB` | `oklch(0.86 0.055 200)` | `#A7DDDF` |
| fg-base | `oklch(0.19 0.018 215)` | `#0A1619` | `oklch(0.96 0.012 215)` | `#E9F4F7` |

### shadcn tokens (aplicados em `src/app/globals.css`)

O conjunto completo foi escrito em `:root` (modo claro) e `.dark` (modo escuro) em
`src/app/globals.css`. Backup em `src/app/globals.css.bak` (gitignorado). Os tokens `--chart-*`
e `--sidebar-*` **não** foram tocados aqui — são alinhados no plano 19-03.

**Modo claro (`:root`):**

```css
--background: oklch(0.985 0.006 215);
--foreground: oklch(0.19 0.018 215);
--card: oklch(1 0 215);
--card-foreground: oklch(0.19 0.018 215);
--popover: oklch(1 0 215);
--popover-foreground: oklch(0.19 0.018 215);
--primary: oklch(0.5 0.078 202);
--primary-foreground: oklch(0.985 0 202);
--secondary: oklch(0.95 0.01 215);
--secondary-foreground: oklch(0.19 0.018 215);
--muted: oklch(0.957 0.006 215);
--muted-foreground: oklch(0.49 0.018 215);
--accent: oklch(0.935 0.012 202);
--accent-foreground: oklch(0.19 0.018 215);
--destructive: oklch(0.55 0.22 25);
--border: oklch(0.905 0.006 215);
--input: oklch(0.965 0.006 215);
--ring: oklch(0.5 0.078 202);
```

**Modo escuro (`.dark`):**

```css
--background: oklch(0.15 0.022 220);
--foreground: oklch(0.96 0.012 215);
--card: oklch(0.2 0.026 220);
--card-foreground: oklch(0.96 0.012 215);
--popover: oklch(0.22 0.026 220);
--popover-foreground: oklch(0.96 0.012 215);
--primary: oklch(0.75 0.08 200);
--primary-foreground: oklch(0.14 0 200);
--secondary: oklch(0.24 0.036 220);
--secondary-foreground: oklch(0.96 0.012 215);
--muted: oklch(0.22 0.026 220);
--muted-foreground: oklch(0.66 0.012 215);
--accent: oklch(0.26 0.036 200);
--accent-foreground: oklch(0.96 0.012 215);
--destructive: oklch(0.65 0.22 25);
--border: oklch(0.28 0.026 220);
--input: oklch(0.2 0.026 220);
--ring: oklch(0.75 0.048 200);
```

### Contrast check

Todos os pares shadcn verificados contra WCAG AA (`scripts/check-contrast.cjs`):

| Par | Light | Dark |
|---|---|---|
| foreground / background | 17.66:1 ✓ | 17.53:1 ✓ |
| muted-foreground / background | 5.96:1 ✓ | 6.34:1 ✓ |
| primary-foreground / primary | 5.54:1 ✓ | 9.24:1 ✓ |
| ring / background | 5.55:1 ✓ | 8.99:1 ✓ |

### Cores de status do pipeline

As cores de etapa (Novo, Contatado, Negociação, Fechado, Perdido) **não** derivam desta paleta.
Elas vivem numa escala semântica dedicada `--status-*` (neutral / info / warning / success /
danger), criada no plano 19-03, porque o funil precisa de cores mutuamente distinguíveis —
derivá-las da marca quebraria a leitura das etapas (D-08).

## Tipografia — Geist + Geist Mono

- **Display + corpo:** Geist
- **Mono (números, telefones, código):** Geist Mono

Mantida conscientemente (D-18) — o usuário revisou 6 pares (Inter, Manrope, IBM Plex Sans,
Instrument Serif, Fraunces) renderizados na paleta nova e escolheu manter a Geist: já é a fonte
do app, casa com serious + premium, e evita qualquer risco de reflow de layout por diferença de
métrica.

Ligada via `next/font/google` em `src/app/layout.tsx`. Variáveis CSS: `--font-sans`
(→ `--font-geist-sans`), `--font-mono` (→ `--font-geist-mono`).

**`--font-heading` fica alias de `--font-sans`** (D-18) — não há fonte serif separada. A ponte
`@theme inline` (`--font-sans: var(--font-geist-sans)`) é mantida de propósito: apontar a
variável do `next/font` diretamente para `--font-sans` recria um bug de auto-referência já
resolvido (`.planning/debug/resolved/font-sans-self-reference.md`).

### Escala de tipografia (recomendada)

| Papel | Classe | Uso |
|---|---|---|
| Display | `text-5xl font-semibold tracking-tight` | Hero, um por página |
| H1 (página) | `text-3xl font-semibold tracking-tight` | Título de página |
| H2 (seção) | `text-xl font-semibold` | Quebras de seção |
| H3 (subseção) | `text-base font-medium` | Títulos de card |
| Corpo | `text-sm` | Texto de UI padrão |
| Leitura | `text-base leading-7` | Conteúdo longo |
| Small / caption | `text-xs text-muted-foreground` | Meta, timestamps |
| Mono | `font-mono tabular-nums` | Números, telefones, código |

## Gradients (não usados)

O mood é serious + premium — gradientes brigariam com a intenção. Nenhum foi gerado.

## Tom e Voz

### Palavras a usar

Direto, específico, orientado a número, factual. Prefira verbos a adjetivos, substantivos a
metáforas. Ao descrever uma ação, diga o que ela faz, não o que ela "parece". Confiante e
contido — "cadastrado", "movido para Negociação", "follow-up em 3 dias", não "poderoso",
"incrível", "sem esforço". Frases curtas. Espaço em branco é bem-vindo.

### Palavras a evitar

Palavras de hype (revolucionário, turbine, desbloqueie, sem fricção), emoji na UI, ponto de
exclamação, promessa exagerada. "Simplesmente" e "só" (descrevem o esforço, não o resultado).
"Luxo", "exclusivo", "premium" na cópia — usá-las deixa menos premium, não mais.

### Exemplo de voz

> Ana Paula está parada há 6 dias em Negociação. Follow-up vence hoje. Abrir WhatsApp com o
> template de retomada.

## Usage dos and don'ts

**Do:**

- Use as CSS variables do shadcn (`bg-background`, `text-foreground`, `bg-primary`,
  `text-muted-foreground`, `border-border`, `bg-sidebar`) em todo lugar. Nunca hardcode hex.
- Cores de etapa/urgência: use os tokens `--status-*` (`bg-status-success`,
  `text-status-danger-foreground`, …), nunca `bg-green-500` nem hex.
- Mantenha a grade de espaçamento de 4px (`gap-2`, `p-4`, `px-6`).
- Use `font-mono tabular-nums` para qualquer número que atualiza no lugar (contadores, valores).
- Teste cada componente em claro **e** com `.dark` forçado antes de considerar pronto.

**Don't:**

- Hardcode cor (`#0D9488`, `bg-[#...]`, `text-zinc-500`, `bg-white`) em arquivo de componente.
- `transition: all` — sempre especifique `transition-colors`, `transition-transform`, etc.
- Adicionar `ThemeProvider` / `next-themes` / toggle de tema — o bloco `.dark` existe e é
  consistente, mas dark mode **não** é acessível pela UI nesta versão (D-16, feature adiada).
- Sobrescrever token shadcn por-componente — se uma cor está errada, corrija em `globals.css`.

## Como o resto da toolchain usa este arquivo

- `frontend-design-guidelines` lê este arquivo no topo do workflow e usa paleta + tipografia ao
  gerar qualquer componente novo.
- Se re-tematizar, faça backup deste arquivo primeiro (`cp brand.md brand.md.bak`).
- Um PR que adiciona componente deve casar visualmente com esta paleta — revisores referenciam
  este arquivo.

---

_Última atualização: 2026-09-02 via skill `brand-design`. Paleta: Corrente Funda · Sóbria ·
Tipografia: Geist + Geist Mono · Gradientes: nenhum._
