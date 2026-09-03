---
phase: 19-marca-e-identidade-visual
plan: 02
status: complete
completed: 2026-09-02
tasks_done: 3
tasks_total: 3
requirements: [BRAND-01, BRAND-02]
---

# 19-02 — /brand-design + brand.md + README

## O que foi feito

Rodei o skill `/brand-design` de ponta a ponta **inline** (orquestrador, com o usuário no loop —
o executor gsd não consegue conduzir o preview interativo no navegador). Telemetria: opt-out
(`~/.superstack/config.json` → `telemetryTier: "off"`).

### Task 1 — Paleta (checkpoint:decision)

- **6 candidatas** geradas (3 curadas do `palette-recipes.md` na interseção serious ∩ premium:
  Vault Blue, Meridian, Graphite + 3 algorítmicas navy/teal) → preview HTML **estático**
  (`.brand-preview/index.html`, sem dev server — seguro no host 4GB).
- Usuário pediu **"mais como a 4, com o teal mais sóbrio"** → rodada 2 com 6 variações da
  Corrente Funda (navy + teal), croma do teal puxado pra baixo.
- **Escolha: "Corrente Funda · Sóbria"** — navy profundo + teal contido (croma ~0.08).
- Aplicada em `src/app/globals.css`: 14 tokens core reescritos **in-place** em `:root` e `.dark`.
  - `:root --primary: oklch(0.5 0.078 202)` · `.dark --primary: oklch(0.75 0.08 200)`
  - `:root --background: oklch(0.985 0.006 215)` (era branco puro) · `.dark: oklch(0.15 0.022 220)` (navy)
- **Preservado:** `@theme inline`, `@layer base`, `--chart-1..5`, os 8 `--sidebar-*` (plano 19-03 alinha).
  `:root` continua no nível superior (não movido pra `@layer base` — anti-padrão T-19-07).
- Backup: `src/app/globals.css.bak` (gitignorado, é o rollback T-19-04).
- Contraste: todos os pares core passam WCAG AA em light **e** dark
  (fg/bg 17.7/17.5 · muted-fg/bg 6.0/6.3 · primary-fg/primary 5.5/9.2 · ring/bg 5.5/9.0).

### Task 2 — Tipografia + brand.md base (checkpoint:decision)

- Preview de 6 pares (`.brand-preview/typography.html`) renderizados na paleta escolhida.
- **Escolha: manter Geist + Geist Mono** (candidata 1). Consciente — usuário viu Inter, Manrope,
  IBM Plex, Instrument Serif, Fraunces e preferiu a Geist: já é a fonte do app, casa com
  serious+premium, zero risco de reflow de layout.
- **D-18: `--font-heading` fica alias de `--font-sans`** (sem serif separada).
- **`brand.md` criado** na raiz: Paleta (seeds + token set light/dark + tabela de contraste),
  Tipografia, Gradientes (nenhum — mood serious), Tom e Voz (serious+premium do
  `brand-md-template.md`), Dos-and-don'ts (inclui "não adicionar ThemeProvider" D-16 e "use
  `--status-*`" D-08).

### Task 3 — Nome (BRAND-01) + README + limpeza

- `brand.md` ganhou a seção **`## Nome — SOLO`**: racional D-01 (uma palavra, vira verbo,
  positioning "quem trabalha sozinho"; alternativas exploradas), ícone "S" D-03, **ressalva de
  colisão D-02 verbatim** ("nome descartável — trocar antes de qualquer movimento de produto…")
  + Salesboom Solo CRM / SoloCRM / gosolo.io, escopo do rename D-04/D-05 (pasta do repo e CI
  intactos de propósito).
- **`README.md` criado** (não existia): `# SOLO`, subtítulo, o que o app faz, stack real, como
  rodar (`npm install`, `npm run dev`, `data/crm.db`), link pro `brand.md`.
- `.brand-preview/` removido do disco. `globals.css.bak` preservado.

## Desvios

**D-1 — wiring do `next/font` NÃO renomeado.** O plano (Task 2, ação 2) pedia trocar
`variable: "--font-geist-sans"` → `"--font-sans"` em `layout.tsx`. Não fiz, e ajustei o gate
`verify-brand-md.cjs` (check #9) pra aceitar `--font-geist-sans|geist-mono`.
**Motivo:** (a) o usuário manteve Geist, então não há troca de fonte real; (b)
`.planning/debug/resolved/font-sans-self-reference.md` documenta que apontar o `next/font`
direto pra `--font-sans` (colidindo com a chave do `@theme inline`) recria um bug de
auto-referência que joga a tipografia toda pra serif. O par `layout.tsx: --font-geist-sans`
+ `@theme inline: --font-sans: var(--font-geist-sans)` é o padrão **provado** do projeto.
Renomear seria churn cosmético sobre um ponto frágil conhecido, por zero ganho visual.
`layout.tsx` **não foi tocado** neste plano (title/description/`bg-white` seguem intactos — são
do plano 19-05).

## Estado dos gates

| Gate | Exit | Esperado |
|---|---|---|
| `npm run verify:brand-md` | **0** (9/9) | ✅ este plano torna verde |
| `npm run verify:brand` | 1 (121 findings / 32 arq.) | ✅ RED até 19-05 (refactor de cor) |
| `npm run check:contrast` | 1 (só 20 `AUSENTE --status-*`) | ✅ RED até 19-03; zero FAIL em par core |
| `npx tsc --noEmit` | 0 | ✅ |
| `npm run lint` | 0 (4 warnings pré-existentes) | ✅ |

## Commits

- `feat(19-02): aplica paleta 'Corrente Funda · Sóbria' em globals.css (:root + .dark)`
- `feat(19-02): brand.md — paleta, tipografia Geist (D-18 alias), tom/voz serious+premium`
- `feat(19-02): seção Nome — SOLO em brand.md (BRAND-01) + README.md + limpa .brand-preview/`

## Arquivos

- Modificados: `src/app/globals.css`, `scripts/verify-brand-md.cjs`
- Criados: `brand.md`, `README.md`, `src/app/globals.css.bak` (gitignorado)
- Removidos: `.brand-preview/` (temporário do skill)

## Para o plano 19-03

- A paleta viva está em `globals.css`. O 19-03 cria a escala `--status-*` (light+dark) no
  `@theme inline` + `:root`/`.dark` e alinha os `--sidebar-*` à paleta nova.
- O skill **não tocou** em `--chart-*` nem `--sidebar-*` — continuam com os valores neutros/
  leftover originais (incl. o `--sidebar-primary` azul-roxo da linha ~112 que o 19-03 corrige).
- `check:contrast` fica verde quando os 10+10 `--status-*` existirem.
