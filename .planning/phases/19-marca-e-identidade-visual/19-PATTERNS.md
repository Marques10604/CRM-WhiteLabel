# Fase 19: Marca e Identidade Visual - Mapa de Padrões

**Mapeado:** 2026-09-02
**Arquivos analisados:** ~40 (7 novos + ~33 modificados)
**Analogs encontrados:** 33 / 34 com match (só `brand.md` não tem analog no repo)

> Idioma dos artefatos: PT-BR. Granularidade do projeto: `coarse` → o planner agrupa em ~4 ondas
> (W1 `/brand-design` + `brand.md`; W2 escala `--status-*`; W3 refactor cor→token; W4 rename + sensores).

---

## Classificação de Arquivos

### Novos

| Arquivo | Papel | Fluxo de dados | Analog mais próximo | Qualidade do match |
|---------|-------|----------------|---------------------|--------------------|
| `scripts/verify-no-hardcoded-colors.cjs` | utility / grep-guard | file-I/O (varre `src/`, exit code) | `scripts/guard-no-hard-delete.cjs` | exato |
| `scripts/verify-brand-md.cjs` | utility / verify-gate | file-I/O (lê arquivos, assert presença) | `scripts/verify-motivo-perda-obrigatorio.cjs` (PARTE B) + `guard-no-hard-delete.cjs` | exato |
| `scripts/check-contrast.cjs` | utility / test | transform (parse CSS → calcula ratio) | `scripts/verify-schema.cjs` (standalone, sem loader TS) + `test-group-by-urgency.cjs` (contador `check()`) | role-match (lógica de cor é nova) |
| `brand.md` (raiz) | doc de referência | — | **sem analog** — gerado pelo skill `/brand-design` (`references/brand-md-template.md`) + augment manual (seção Nome/colisão) | nenhum |
| `README.md` (raiz) | doc | — | **sem analog no repo** (`ls README*` na raiz = vazio; só `.claude/` e `node_modules/`) | nenhum |
| `src/app/icon.svg` (favicon "S" — opcional, Claude's Discretion) | asset / config | — | `public/*.svg` (svgs default do Next) — estrutura, não conteúdo | fraco |
| `.planning/phases/19-.../19-HUMAN-UAT.md` | doc / checklist | — | `.planning/phases/18-.../18-VERIFICATION.md` (método code+data, promovido a `passed` sem browser) | role-match |

### Modificados

| Arquivo | Papel | Fluxo de dados | Analog / auto-analog | Match |
|---------|-------|----------------|----------------------|-------|
| `src/app/globals.css` | design system / tokens CSS | config | auto (estrutura preservada; `/brand-design` reescreve valores) | exato |
| `src/app/layout.tsx` | layout raiz (Server Component) | request-response / metadata | auto (padrão `next/font/google` já presente) | exato |
| `src/components/app-sidebar.tsx` | chrome de navegação (Client, `usePathname`) | event-driven (nav) | auto + `NAV_ITEMS` + `cn()` | exato |
| `src/components/etapa-badge.tsx` | componente de apresentação | transform (map `stage` → cor) | auto (`STAGE_CONFIG` vira `STAGE_TOKEN`) | exato |
| `src/components/followup-dashboard.tsx` | componente (Client) | transform (map urgência → cor) | `etapa-badge.tsx` (mesmo idioma de map) | exato |
| `src/components/csv-import-preview-table.tsx` | componente (tabela) | transform (map flag → cor) | `etapa-badge.tsx` | exato |
| `src/components/pipeline-lead-card.tsx` | componente (Client, dnd) | transform (bool `isEsfriando` → cor) | `etapa-badge.tsx` | role-match |
| `src/components/pipeline-column.tsx` | componente (Client, dnd) | condicional inline (`isOver` → cor) | auto | exato |
| `src/components/lead-table.tsx` | componente (tabela) | condicional inline | auto | exato |
| `src/components/template-list.tsx` + ~21 outros (ver inventário) | componentes | cor de marca/neutro hardcoded | `app-sidebar.tsx` refatorado (grupos de substituição) | role-match |
| `package.json` | config | — | auto (campo `name` + bloco `scripts`) | exato |
| `.gitignore` | config | — | auto | exato |

---

## Atribuição de Padrões

### ONDA 1 — `/brand-design` + `brand.md`

#### `src/app/globals.css` (design system, tokens)

**Analog:** auto — a estrutura já existe e **deve ser preservada**; o `/brand-design` reescreve
só os **valores** dos 14 tokens core + `--radius` dentro de `:root` e `.dark` (Passo 5 do skill,
com backup `globals.css.bak`).

**Estrutura atual a preservar** (`globals.css:1-49`):
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  /* ...mapa completo token→var shadcn... */
  --font-sans: var(--font-geist-sans);   /* linha 10 — ATUALIZAR p/ var(--font-sans) da fonte nova */
  --font-mono: var(--font-geist-mono);   /* linha 11 — idem */
  --font-heading: var(--font-sans);      /* linha 12 — D-18: manter alias OU var(--font-serif) */
  /* --radius-sm..4xl derivados de --radius (linhas 42-48) — NÃO tocar */
}
```

**`:root` — 14 core reescritos pelo skill** (`globals.css:51-84`). O skill toca:
`--background --foreground --card(-foreground) --popover(-foreground) --primary(-foreground)
--secondary(-foreground) --muted(-foreground) --accent(-foreground) --destructive --border --input
--ring --radius`. O skill **NÃO toca** `--chart-1..5` (linhas 70-74) nem `--sidebar-*` (linhas 76-83).

**`.dark` — espelho** (`globals.css:86-118`). Bug a corrigir junto (Pitfall 3):
```css
--sidebar-primary: oklch(0.488 0.243 264.376);  /* linha 112 — leftover azul-roxo do default shadcn */
```

**Onde os `--status-*` novos entram (D-08):** adicionar no `@theme inline` (depois da linha 41,
junto do bloco `--color-*`) as 10 linhas:
```css
  --color-status-neutral: var(--status-neutral);
  --color-status-neutral-foreground: var(--status-neutral-foreground);
  --color-status-info: var(--status-info);
  --color-status-info-foreground: var(--status-info-foreground);
  --color-status-warning: var(--status-warning);
  --color-status-warning-foreground: var(--status-warning-foreground);
  --color-status-success: var(--status-success);
  --color-status-success-foreground: var(--status-success-foreground);
  --color-status-danger: var(--status-danger);
  --color-status-danger-foreground: var(--status-danger-foreground);
```
e os pares de valor em `:root` e `.dark` (valores OKLCH sugeridos: 19-RESEARCH.md §"Code Examples"
linhas 410-425 — ponto de partida, executor ajusta mantendo AA).

**Alinhar `--sidebar-*` à paleta** (Pitfall 3, Onda 2/3): opção simples = aliasar em `:root` E `.dark`:
```css
  --sidebar: var(--card);
  --sidebar-foreground: var(--card-foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
```

**Anti-padrão:** NÃO mover `:root` para dentro de `@layer base` (muda a cascata — RESEARCH linha 124/288).
O `@layer base` no fim do arquivo (`globals.css:120-130`) já dá `body { @apply bg-background text-foreground }`
e `html { @apply font-sans }` — é por isso que `bg-white` do `<body>` em `layout.tsx` pode simplesmente **sair**.

---

#### `src/app/layout.tsx` (layout raiz, metadata + fontes)

**Analog:** auto — o padrão `next/font/google` já está montado, é só trocar o par.

**Padrão atual completo** (`layout.tsx:1-39`):
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";           // linha 2 — trocar par
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",                                 // linha 8 — renomear var p/ --font-sans
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",                                 // linha 13 — renomear p/ --font-mono
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM de Leads",                                         // linha 18 — → "SOLO"
  description: "CRM pessoal para organizar leads e o funil de vendas.",  // linha 19 — manter sentido
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>  {/* linha 30 */}
      <body className="min-h-full flex bg-white">                {/* linha 32 — remover bg-white */}
        <AppSidebar />
        <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
```

**Padrão-alvo** (o `/brand-design` escreve algo assim — RESEARCH Pattern 3, linhas 270-282):
```tsx
import { Inter, JetBrains_Mono } from "next/font/google";  // par escolhido no preview
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
// <html className={`${sans.variable} ${mono.variable} h-full antialiased`}>
// <body className="min-h-full flex">   ← sem bg-white
```
As `variable:` aqui **têm que casar** com as 3 linhas `--font-*` do `@theme inline` em `globals.css`.
Sem `openGraph` nem `metadataBase` hoje — não adicionar (deferido).

---

#### `brand.md` (raiz — NOVO, SEM ANALOG)

**Sem analog no codebase.** Fonte da estrutura: `~/.claude/skills/brand-design/references/brand-md-template.md`
(o skill escreve Paleta / Tipografia / Gradientes / Tom-Voz / Dos-and-don'ts).

**Augment manual obrigatório (BRAND-01 / Pitfall 1)** — task explícita DEPOIS do skill escrever:
adicionar seção `## Nome — SOLO` com:
- Racional D-01: som curto, uma palavra, vira verbo ("abre o SOLO"), positioning = CRM pra quem
  trabalha sozinho (sem equipe / fila / SLA).
- Ressalva de colisão D-02 **verbatim**: *"nome descartável — trocar antes de qualquer movimento
  de produto, landing page ou venda"*. Citar: Salesboom Solo CRM, SoloCRM (`solocrm.com`),
  Solo (`gosolo.io`). Domínios `solocrm.com` e `gosolo.io` tomados.

**Verificação:** `scripts/verify-brand-md.cjs` checa presença das 4 seções + termos de colisão
(`grep -qi "colis\|descart\|SoloCRM"`).

---

#### `README.md` (raiz — NOVO, SEM ANALOG)

`ls README*` na raiz = não existe (Pitfall 7). Recomendação: criar mínimo —
`# SOLO — CRM para quem trabalha sozinho` + stack + como rodar (`npm run dev`, SQLite local em `data/crm.db`).
É "cara de produto" e trivial. Alternativa aceitável: anotar "não existe, nada a renomear".

---

### ONDA 2 — Escala `--status-*` + migração das cores de status

**Regra transversal (D-08):** status NÃO deriva da marca. 5 tokens semânticos
(`neutral / info / warning / success / danger`) + `-foreground`, reusados por **etapa** E **urgência**
E **flag de CSV**. Mapa por classe utilitária, **nunca `style` inline** (RESEARCH Pattern 1).

#### `src/components/etapa-badge.tsx` (transform: stage → cor) — ARQUIVO-PADRÃO desta onda

**Estado atual** (`etapa-badge.tsx:11-35`):
```tsx
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo:       { label: "Novo",       bg: "#F4F4F5", text: "#3F3F46" },
  contatado:  { label: "Contatado",  bg: "#DBEAFE", text: "#1D4ED8" },
  negociacao: { label: "Negociação", bg: "#FEF3C7", text: "#B45309" },
  fechado:    { label: "Fechado",    bg: "#DCFCE7", text: "#15803D" },
  perdido:    { label: "Perdido",    bg: "#FEE2E2", text: "#B91C1C" },
};
// STAGE_OPTIONS é derivado de Object.keys(STAGE_CONFIG) — PRESERVAR esse export (usado na toolbar)
export function EtapaBadge({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge variant="outline" className="border-transparent"
      style={{ backgroundColor: config.bg, color: config.text }}>   {/* ← style inline sai */}
      {config.label}
    </Badge>
  );
}
```

**Alvo** — separar label de cor pra não quebrar `STAGE_OPTIONS`:
```tsx
const STAGE_LABEL: Record<Stage, string> = {
  novo: "Novo", contatado: "Contatado", negociacao: "Negociação",
  fechado: "Fechado", perdido: "Perdido",
};
const STAGE_TOKEN: Record<Stage, string> = {
  novo:       "bg-status-neutral text-status-neutral-foreground",
  contatado:  "bg-status-info text-status-info-foreground",
  negociacao: "bg-status-warning text-status-warning-foreground",
  fechado:    "bg-status-success text-status-success-foreground",
  perdido:    "bg-status-danger text-status-danger-foreground",
};
export const STAGE_OPTIONS = (Object.keys(STAGE_LABEL) as Stage[])
  .map((value) => ({ value, label: STAGE_LABEL[value] }));
// <Badge variant="outline" className={cn("border-transparent", STAGE_TOKEN[stage])}>
```

#### `src/components/followup-dashboard.tsx` (transform: urgência → cor)

**Estado atual** — `UrgencySection` carrega `headerBg`/`headerText` como hex (`followup-dashboard.tsx:42-49`,
`92-117`), aplicados via `style={{ backgroundColor: section.headerBg }}` (linhas 175, 179, 185).
Mapa de 3 seções:
```tsx
{ key: "vencidos",      headerBg: "#FEE2E2", headerText: "#B91C1C", dateClassName: "text-[#B91C1C]" },
{ key: "hoje",          headerBg: "#FEF3C7", headerText: "#B45309", dateClassName: "text-[#B45309]" },
{ key: "proximos7Dias", headerBg: "#F4F4F5", headerText: "#3F3F46", dateClassName: "text-muted-foreground" },
```
Também: `bg-[#F4F4F5]` no wrapper da seção (linha 171), `bg-[#0D9488] text-white hover:bg-[#0D9488]/90`
nos 2 botões "Novo lead" (linhas 127, 157), `border-zinc-200 bg-white ... focus-visible:ring-[#0D9488]`
no card de lead (linha 219).

**Alvo:** trocar `headerBg`/`headerText` por um campo `headerClass` (ex.: `"bg-status-danger text-status-danger-foreground"`),
`dateClassName` → `text-status-danger` / `text-status-warning` / `text-muted-foreground`, remover os `style={{}}`.
Botões "Novo lead" → `<Button>` puro (ver Onda 3 Pattern 2).

#### `src/components/csv-import-preview-table.tsx` (transform: flag → cor)

**Estado atual** (`csv-import-preview-table.tsx:63-108`, `147-159`) — `StatusBadges` com 4 badges em `style` inline:
```tsx
style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}   // Duplicado    → status-warning
style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}   // Novo nicho   → status-info
style={{ backgroundColor: "#E4E4E7", color: "#3F3F46" }}   // Sem nicho    → status-neutral
style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}   // Tel inválido → status-danger
// linha ~156: badge "Cortado em 500 caracteres" → status-warning
```
+ `accent-[#0D9488]` no checkbox nativo (linha ~189) → `accent-primary` (Pitfall 6). Mesmo refactor: `className={cn("border-transparent", "bg-status-warning text-status-warning-foreground")}`.

#### `src/components/pipeline-lead-card.tsx` (bool → cor)

`pipeline-lead-card.tsx:61-65` — `focus-visible:ring-[#0D9488]`, `border-2 border-[#F59E0B]` (isEsfriando),
`border border-zinc-200`, `bg-white`; linha 104 `text-[#B45309]` no label "Esfriando".
Alvo: `ring-ring`, `border-status-warning`, `border` (neutro), `bg-card`, `text-status-warning`.

#### `src/components/pipeline-column.tsx` (condicional `isOver`)

`pipeline-column.tsx:30-35` — `bg-[#F4F4F5]` (col) + `bg-[#E4E4E7]` (isOver), e `bg-[#F4F4F5]` no header sticky (linha 35).
Alvo: `bg-muted` + `isOver ? "bg-accent"`. **Manter** `transition-colors` (já presente — não regredir p/ `transition-all`).

#### `src/components/lead-table.tsx:264` (botão WhatsApp verde)

```tsx
className="gap-1.5 bg-[#22C55E] font-semibold text-white shadow-sm hover:bg-[#16A34A]"
```
→ `bg-status-success text-status-success-foreground` (verde de "enviar zap" ≈ success — Open Question 4).
Decisão do planner: reusar `--status-success` OU criar `--whatsapp` dedicado. Default recomendado: `--status-success`.

#### Também nesta onda (status/semântico, não marca):
- `src/components/whatsapp-preview-dialog.tsx:172,175` — `text-[#B91C1C]` erro "telefone inválido" → `text-destructive` (é erro, não pipeline).
- `src/app/relatorios/page.tsx:97` — `border-amber-200 bg-amber-50 text-amber-900` faixa "intervalo inválido" → `bg-status-warning` / `text-status-warning-foreground` (mantém semântica de aviso).

---

### ONDA 3 — Refactor cor de marca/neutro → token shadcn

**Inventário confirmado por grep:** 115 ocorrências em 32 arquivos
(`src\lib\csv-encoding.ts:1` é falso-positivo = `#840` em comentário; `src\components\ui\dialog.tsx:1` = `bg-black/10` do overlay, allowlist opcional).
Top ofensores: `followup-dashboard.tsx` (12), `csv-import-preview-table.tsx` (8), `lead-table.tsx` (8),
`template-list.tsx` (8), `nicho-manager.tsx` (7), `motivo-perda-manager.tsx` (7), `app-sidebar.tsx` (6),
`lead-timeline-dialog.tsx` (5), `etapa-badge.tsx` (5), `relatorios/page.tsx` (4), `configuracoes-form.tsx` (4),
`csv-column-mapper.tsx` (4), `csv-upload-dropzone.tsx` (4), `whatsapp-preview-dialog.tsx` (4).

Lista completa dos 32: `app-sidebar, layout, relatorios/page, whatsapp-send-button, whatsapp-preview-dialog,
lead-table-toolbar, lead-table-columns, lead-form-dialog, csv-upload-dropzone, followup-dashboard,
csv-import-preview-table, etapa-badge, configuracoes-form, csv-column-mapper, tarefa-card, post-import-lead-list,
motivo-perda-manager, template-list, pipeline-lead-card, ui/dialog, pipeline-column, template-form-dialog,
lead-timeline-dialog, pipeline-board, tarefa-form-dialog, lead-table, periodo-selector, lixeira-table,
motivo-perda-combobox, nicho-manager, motivo-perda-dialog, lib/csv-encoding`.

#### `src/components/app-sidebar.tsx` — ARQUIVO-PADRÃO desta onda (maior nó, 6 ocorrências)

**Estado atual** (`app-sidebar.tsx:36-67`):
```tsx
<aside className="flex h-full w-[240px] shrink-0 flex-col bg-[#F4F4F5]">        {/* → bg-sidebar */}
  <div ...>
    <div className="... rounded-md bg-[#0D9488] text-[13px] font-bold text-white" aria-hidden="true">
      I                                                                          {/* linha 42 → "S" (D-03) */}
    </div>
    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">
      CRM LEADS                                                                  {/* linha 45 → "SOLO" (D-04) */}
    </span>
  </div>
  <p className="... text-[10px] ... text-zinc-400">Principal</p>                 {/* → text-muted-foreground */}
  <nav ...>
    className={cn(
      "flex items-center gap-3 rounded-lg px-[14px] py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-[#0D9488]/10 font-semibold text-[#0D9488]"                         {/* → bg-sidebar-accent text-sidebar-accent-foreground */}
        : "text-zinc-700 hover:bg-zinc-200/60 hover:text-[#0D9488]"              {/* → text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground */}
    )}
```
Ícone de marca: `bg-[#0D9488] text-white` → `bg-primary text-primary-foreground`.
**Preservar:** `NAV_ITEMS`, `usePathname`, `cn()`, larguras fixas (`w-[240px]`, `text-[11px]`), `transition-colors`.
Rename ("I"→"S", "CRM LEADS"→"SOLO") pode ser feito aqui na Onda 3 OU adiada pra Onda 4 — ver ordem no plano.

#### Grupos de substituição mecânica (RESEARCH linhas 367-384 — usar como tabela de-para)

| Padrão atual | ~Ocorrências | Token destino |
|---|---|---|
| `bg-[#0D9488] text-white hover:bg-[#0D9488]/90` em `<Button>` | ~16 | remover override → `<Button>` default (`bg-primary text-primary-foreground hover:bg-primary/80`, ver `ui/button.tsx:11`) |
| `bg-[#F4F4F5]` | ~20 | `bg-muted` (superfície interna) / `bg-sidebar` (só sidebar) / `bg-card` (card elevado) |
| `text-[#0D9488]` / `hover:text-[#0D9488]` | ~15 | `text-primary` / `hover:text-primary` |
| `bg-[#0D9488]/10 text-[#0D9488]` | ~3 | sidebar: `bg-sidebar-accent text-sidebar-accent-foreground`; avatar: `bg-primary/10 text-primary` |
| `text-zinc-400` / `-500` / `-700` | ~10 | `text-muted-foreground` (400/500) / `text-foreground` ou `text-sidebar-foreground` (700) |
| `border-zinc-200` / `-300` | ~12 | `border` (via `@layer base * { border-border }`) ou `border-input` (campos) |
| `hover:bg-zinc-200/60` | ~1 | `hover:bg-sidebar-accent` |
| `bg-white` (cards / `<body>`) | ~10 | `bg-card` (cards); `layout.tsx:32` `<body>` → **remover** |
| `text-[#DC2626]` (exclusão) | ~12 | `text-destructive` |
| `ring-[#0D9488]` / `focus-visible:ring-[#0D9488]/50` / `focus-visible:border-[#0D9488]` | ~8 | `ring-ring` / `focus-visible:ring-ring/50` / `focus-visible:border-ring` |
| `accent-[#0D9488]` (checkbox) | 2 | `accent-primary` |
| `bg-[#E4E4E7]` (pipeline `isOver`) | 2 | `bg-accent` |
| `style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0D9488" }}` (`template-list.tsx:52`) | 1 | `className="bg-primary/10 text-primary"` |

**`template-list.tsx` excerpt** (`:45`, `:52`, `:62`) mostra os 3 idiomas juntos:
```tsx
<div className="... hover:bg-[#F4F4F5]">                                    {/* → hover:bg-muted */}
  <Badge ... style={{ backgroundColor: "rgba(13, 148, 136, 0.1)", color: "#0D9488" }}>  {/* → className bg-primary/10 text-primary */}
  <button className="text-sm text-muted-foreground hover:text-[#0D9488] hover:underline ...">  {/* → hover:text-primary */}
```

**Anti-padrões (RESEARCH linhas 284-292):** não deixar nenhum `#hex`/`-[#`/`zinc-*` pra trás
(o grep-guard falha); não usar `transition-all` (manter `transition-colors`); `<Button>` default
já é primário — não recriar com classe.

---

### ONDA 4 — Rename + sensores de verificação

#### Rename (grep confirmou exatamente estas superfícies — RESEARCH linhas 430-439)

```
src/app/layout.tsx:18       title: "CRM de Leads"    → "SOLO"
src/app/layout.tsx:19       description               → manter sentido (opcional ajuste)
src/components/app-sidebar.tsx:42   "I"               → "S"
src/components/app-sidebar.tsx:45   "CRM LEADS"        → "SOLO"
package.json:2              "name": "crm-leads"       → "solo"
README.md                   (criar mínimo — Pitfall 7)
src/app/favicon.ico         placeholder Next → opcional src/app/icon.svg "S" sobre --primary
```
**NÃO renomear (D-05):** pasta do repo, paths de CI, imports, strings de caminho.
Nenhuma dessas strings está persistida em `data/crm.db` (RESEARCH "Runtime State Inventory").

#### `package.json` — 2 edições

```jsonc
"name": "crm-leads",   // linha 2 → "solo"
"scripts": {
  // ... adicionar (molde: linhas 10-16, prefixo "verify:"/"test:"):
  "verify:brand": "node scripts/verify-no-hardcoded-colors.cjs",
  "check:contrast": "node scripts/check-contrast.cjs",
  "verify:brand-md": "node scripts/verify-brand-md.cjs"
}
```

#### `.gitignore` — append (hoje: RESEARCH confirma, arquivo tem 44 linhas, seções comentadas)

Estado atual relevante (`.gitignore:16-18`, `:43-45`):
```
# next.js
/.next/
/out/
...
# sqlite database (local data, not versioned — só src/db/migrations/ é versionado)
/data/*.db*
/data/*.db-*
```
Adicionar bloco novo:
```
# brand-design skill artifacts
/.brand-preview/
*.css.bak
```

---

## Scripts `.cjs` novos — padrão detalhado

**Padrão comum do projeto** (verificado em `guard-no-hard-delete.cjs`, `verify-schema.cjs`,
`verify-motivo-perda-obrigatorio.cjs`, `test-group-by-urgency.cjs`):

1. **Shebang + strict:** `#!/usr/bin/env node` então `"use strict";` (linhas 1-2).
2. **Docblock JSDoc extenso em PT-BR** explicando o quê/porquê/exit codes — obrigatório neste repo
   (todos os scripts têm 20-45 linhas de comentário no topo).
3. **Só módulos nativos** para os que varrem arquivos: `require("node:fs")`, `require("node:path")`.
   `verify-schema.cjs` usa `require("better-sqlite3")` — só quando precisa do banco (não é o caso aqui).
4. **`const ROOT = path.join(__dirname, "..")`** e helper `toRelative(abs)`.
5. **Contador de falhas + reporter:**
   - estilo guard (`guard-no-hard-delete.cjs:104-131`): `const findings = []`, push `{file, line, text}`,
     no fim `console.error` por item + resumo + `process.exit(1)`.
   - estilo harness (`test-group-by-urgency.cjs:40-49`): `let failed = 0; function check(cond, msg) { cond ? console.log("OK "+msg) : (console.error("FAIL "+msg), failed++) }`.
6. **`walk(dir)` recursivo** com `fs.readdirSync(dir, { withFileTypes: true })`, pula
   `IGNORED_DIR_NAMES = new Set(["node_modules", ".next", "dist"])` e entradas que começam com `.`
   (`guard-no-hard-delete.cjs:134-167`).
7. **`ALLOWLIST`** de caminhos relativos (`path.join("scripts", "...")`) nunca reportados
   (`guard-no-hard-delete.cjs:61-69`) — o próprio script entra na allowlist se contém os padrões como string.
8. **Exit explícito:** `process.exit(0)` no sucesso com mensagem `console.log("OK: ...")`,
   `process.exit(1)` na falha. Wrapper `.catch(err => { console.error(...); process.exit(1) })` nos async.
9. **Registro em `package.json`** no bloco `scripts` com prefixo `verify:` (guards/gates) ou `test:` (harnesses).
   `npm run guard:no-hard-delete` é o precedente exato.
10. **NÃO precisa** do `ts-alias-loader.mjs` nem do `next-cache-stub` — esses scripts só leem
    `.css`/`.tsx` como texto (regex), não importam módulos do `src/`. (O stub `scripts/test-support/next-cache-stub.mjs`
    e `ts-alias-loader.mjs` só entram quando o harness precisa `import("@/...")` de uma Server Action.)

### `scripts/verify-no-hardcoded-colors.cjs`  → analog EXATO: `guard-no-hard-delete.cjs`

Copiar a espinha inteira. Trocar:
- `SCAN_ROOTS = ["src"]`, `CODE_EXTENSIONS = new Set([".ts", ".tsx"])`.
- `CODE_PATTERNS` = regex de cor:
  ```js
  /#[0-9a-fA-F]{3,8}\b/,
  /-\[#[0-9a-fA-F]{3,8}\]/,
  /\b(bg|text|border|ring|from|via|to|accent|fill|stroke|shadow|outline|divide|ring-offset)-(zinc|slate|gray|neutral|stone|white|black)(-\d{2,3})?\b/,
  /"CRM de Leads"|CRM LEADS|"CRM Leads"/,   // dobra o grep-guard de rename (BRAND-03)
  ```
- `ALLOWLIST` = `[path.join("scripts","verify-no-hardcoded-colors.cjs"), path.join("src","lib","csv-encoding.ts")]`
  (+ `src/components/ui/dialog.tsx` SE decidir manter `bg-black/10` do overlay — decisão do planner).
- Mensagem final: `[verify-brand] FALHOU: N ocorrência(s) de cor hardcoded / nome antigo em src/`.

### `scripts/verify-brand-md.cjs`  → analog: `verify-motivo-perda-obrigatorio.cjs` PARTE B + `check()`

Sem async, sem loader. Padrão `fs.readFileSync` + asserts:
```js
const ROOT = path.join(__dirname, "..");
let failed = 0;
function check(cond, msg) { cond ? console.log("OK " + msg) : (console.error("FAIL " + msg), failed++); }

const brand = fs.readFileSync(path.join(ROOT, "brand.md"), "utf8");
check(/##\s+.*paleta/i.test(brand),      "brand.md tem seção Paleta");
check(/##\s+.*tipografia/i.test(brand),  "brand.md tem seção Tipografia");
check(/tom|voz/i.test(brand),            "brand.md tem seção Tom/Voz");
check(/##\s+nome|SOLO/i.test(brand) && /colis|descart|SoloCRM/i.test(brand),
      "brand.md tem seção Nome + ressalva de colisão (BRAND-01/D-02)");
check(fs.existsSync(path.join(ROOT, "src/app/globals.css.bak")), "globals.css.bak (backup do skill) existe");
const layout = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
check(/next\/font\/google/.test(layout), "layout.tsx importa de next/font/google");
check(/variable:\s*["']--font-(sans|mono|serif)["']/.test(layout), "layout.tsx usa variable: --font-*");
// exit
```

### `scripts/check-contrast.cjs`  → analog: `verify-schema.cjs` (standalone) + `check()` counter

Estrutura de `verify-schema.cjs` (sem loader, `fail(msg)` → `process.exit(1)`), lógica nova:
1. `fs.readFileSync("src/app/globals.css")`, regex extrai blocos `:root { ... }` e `.dark { ... }`.
2. Parse de `--token: oklch(L C H)` / `oklch(L C H / A)` por regex.
3. Converte OKLCH→sRGB (aproximação — o próprio `contrast-rules.md` avisa que L≠luminância; é rede de
   segurança, não verdade absoluta — Assumption A7), calcula ratio WCAG.
4. Valida os ~13 pares de `~/.claude/skills/brand-design/references/contrast-rules.md`
   (`foreground/background`, `primary-foreground/primary`, `muted-foreground/muted`,
   `card-foreground/card`, `popover-foreground/popover`, `destructive/background`,
   + os 5 `status-*-foreground / status-*` em light E dark).
5. `fail()` se algum par < 4.5 (texto normal) / 3.0 (UI). Exit 0 se todos passam.

---

## Padrões Compartilhados

### Composição de classe condicional — `cn()`
**Fonte:** `@/lib/utils` (`import { cn } from "@/lib/utils"`), `tailwind-merge` ^3.6.0.
**Aplicar a:** todo componente do refactor. Já é universal no repo — `app-sidebar.tsx:62`,
`pipeline-lead-card.tsx:61`, `pipeline-column.tsx:30`, `etapa-badge.tsx` (a adicionar).
Idioma: `className={cn("classes-base", condicao ? "classe-a" : "classe-b")}`.

### Botão de ação primária
**Fonte:** `src/components/ui/button.tsx:11` — `default: "bg-primary text-primary-foreground hover:bg-primary/80"`.
**Aplicar a:** as ~16 ocorrências de `<Button className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90">`.
Ação: **deletar o `className` de cor**, deixar `<Button>` puro. `variant`/`size` extras permanecem.

### Badge de status
**Fonte:** `src/components/ui/badge.tsx` + padrão `<Badge variant="outline" className={cn("border-transparent", TOKEN)}>`.
**Aplicar a:** `etapa-badge.tsx`, `csv-import-preview-table.tsx` (`StatusBadges`), qualquer badge com `style` inline.
Tabela de tokens: `STAGE_TOKEN` / `--status-*` (Onda 2).

### Cores de token — fonte única
**Fonte:** `src/app/globals.css` `@theme inline` + `:root` + `.dark`.
**Aplicar a:** tudo. Nunca cor por-componente (D-06/D-07). `@layer base * { @apply border-border }`
(`globals.css:121-123`) significa que `border` sozinho já usa `--border` — não escrever `border-[color]`.

### Verificação (sensores sem browser — precedente Fase 18)
**Fonte:** `.planning/phases/18-.../18-VERIFICATION.md` (método code+data, `passed` sem browser ao vivo).
**Aplicar a:** `19-HUMAN-UAT.md` — checklist das 10 rotas do `NAV_ITEMS` (`app-sidebar.tsx:19-30`) +
dialogs, em light + `.dark` forçado. Não-bloqueante se RAM não permitir (host 4GB, MEMORY).
Gate real = `rm -rf .next && npm run build` verde + os 3 scripts `.cjs` verdes.

### Harness `.cjs` — bootstrap
**Fonte:** `scripts/guard-no-hard-delete.cjs` (fs walk + findings + exit) e
`scripts/test-group-by-urgency.cjs:33-49` (`register` loader + `check()` counter).
**Aplicar a:** os 3 scripts novos (detalhe na seção acima). Registrar em `package.json` `scripts`.

---

## Sem Analog

| Arquivo | Papel | Fluxo | Motivo | O que usar no lugar |
|---------|-------|-------|--------|---------------------|
| `brand.md` (raiz) | doc de marca | — | Não existe artefato equivalente no repo | Template do skill `~/.claude/skills/brand-design/references/brand-md-template.md` + augment manual (seção Nome/colisão — Pitfall 1) |
| `README.md` (raiz) | doc | — | `ls README*` na raiz = vazio | Estrutura mínima livre: título "SOLO" + stack + `npm run dev` |
| `src/app/icon.svg` (favicon "S", opcional) | asset | — | Sem favicon customizado no projeto (só o `favicon.ico` default do Next) | `<svg>` manual: letra "S" centralizada sobre `--primary`. Ou `icon.tsx` com `ImageResponse`. Baixa prioridade (Open Question 1) |
| Lógica OKLCH→contraste em `check-contrast.cjs` | utility | transform | Nenhum script do repo faz matemática de cor | `~/.claude/skills/brand-design/references/contrast-rules.md` (fórmula + pares). Estrutura do script = `verify-schema.cjs` |

---

## Metadados

**Escopo de busca de analog:** `scripts/*.cjs` (24 arquivos), `scripts/test-support/`, `src/app/`,
`src/components/` (32 arquivos com cor hardcoded), `src/components/ui/` (button, badge, dialog),
`package.json`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`.
**Arquivos escaneados:** ~50.
**Grep de inventário:** `#hex | -[# | (bg|text|border|ring|accent|...)-(zinc|slate|gray|neutral|white|black|amber|blue|green|red|...)` → 115 matches / 32 arquivos em `src/`.
**Data da extração:** 2026-09-02.
