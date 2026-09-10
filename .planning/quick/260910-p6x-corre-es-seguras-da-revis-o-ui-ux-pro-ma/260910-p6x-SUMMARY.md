---
quick_id: 260910-p6x
slug: corre-es-seguras-da-revis-o-ui-ux-pro-ma
status: complete
completed: 2026-09-10
tasks_completed: 3
files_modified:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/relatorios/page.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/campanha-form-dialog.tsx
  - src/components/csv-import-wizard.tsx
commits:
  - 8e9f39e
  - 4f242c7
  - 53ff179
---

# Quick 260910-p6x: Correções seguras da revisão ui-ux-pro-max — Resumo

Aplicados os 6 itens isolados de acessibilidade e polimento da revisão
ui-ux-pro-max, todos aditivos ou puramente de `className`, sem nenhuma mudança
de lógica de interação, handler, query ou estado testado.

## O que foi feito

### Task 1 — Acessibilidade global (commit `8e9f39e`)

- **`src/app/globals.css`**: bloco `@media (prefers-reduced-motion: reduce)`
  adicionado no fim do arquivo, fora de qualquer `@layer` e fora de
  `:root`/`.dark`. Zera `animation-duration`, `animation-iteration-count`,
  `transition-duration` e `scroll-behavior` (todos com `!important`) para
  `*, *::before, *::after`. Posicionamento deliberado: fora de `@layer` para
  vencer os utilitários do Tailwind v4; fora de `:root`/`.dark` para não
  quebrar o parser de chaves balanceadas de `scripts/check-contrast.cjs`.
- **`src/app/layout.tsx`**: skip-link `<a href="#conteudo">Pular para o
  conteúdo</a>` como primeiro filho do `<body>`, antes do `<ThemeProvider>`.
  `sr-only` por padrão, visível no foco via `focus:not-sr-only` +
  posicionamento absoluto (o `<body>` é `flex`, então o estado visível precisa
  sair do fluxo). `<main>` ganhou `id="conteudo"` e `tabIndex={-1}` como alvo,
  com o `className` original intacto.
- `src/components/app-sidebar.tsx` confirmado intocado (já vem depois do
  skip-link na ordem do DOM).

### Task 2 — Polimento de dados e forms (commit `4f242c7`)

- **`src/app/relatorios/page.tsx`**: colunas numéricas das 3 tabelas alinhadas
  à direita com `font-mono tabular-nums` (10 ocorrências: 3 `<TableHead>` +
  3 `<TableCell>` na seção 1, 1+1 na seção 2, 1+1 na seção 3). O
  `font-semibold` da célula de taxa de conversão foi preservado
  (`text-right font-mono tabular-nums font-semibold text-foreground`). Colunas
  de rótulo, estado vazio, faixa de aviso, títulos e `PeriodoSelector`
  intocados. Nenhum `text-[..px]` alterado.
- **`src/components/lead-form-dialog.tsx`** e
  **`src/components/campanha-form-dialog.tsx`**: `mode: "onBlur"` adicionado ao
  objeto do `useForm`, logo abaixo do `resolver: zodResolver(...)`. Uma linha
  por arquivo. Não afrouxa o `zodResolver` nem a validação de servidor — só
  antecipa o feedback client-side para o blur do campo. Os outros 4 `useForm`
  do projeto ficaram fora de escopo.

### Task 3 — Wizard de import CSV (commit `53ff179`)

- **`src/components/csv-import-wizard.tsx`**:
  - `import { cn } from "@/lib/utils";` adicionado.
  - Constante de módulo `IMPORT_STEPS` (`as const`) com os 3 passos
    (`Upload`, `Mapeamento`, `Prévia`).
  - Sub-componente local `ImportStepper({ current })`:
    `<nav aria-label="Progresso da importação">` com `<p>Passo {current} de 3</p>`
    e um `<ol>` de 3 `<li>`, cada um com `aria-current={ativo ? "step" :
    undefined}`, marcador circular (`h-6 w-6 rounded-full border`) e rótulo.
    Estado ativo `border-primary bg-primary text-primary-foreground`; inativo
    `border-border text-muted-foreground`. Só tokens.
  - Os 4 returns de tela envolvidos em `<div className="flex flex-col gap-6">`
    com `<ImportStepper current={1|2|3} />` acima do filho, sem nenhuma
    restrição de largura/altura no wrapper. Props dos 3 filhos inalteradas.
  - O skeleton substitui a frase solta `Carregando prévia...` por
    `<div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">`
    com `<span className="sr-only">Carregando prévia...</span>` (preserva o
    anúncio para leitor de tela), uma barra de cabeçalho
    (`h-10 rounded bg-muted animate-pulse`) e 5 barras de linha
    (`h-12 rounded bg-muted/60 animate-pulse`) via `.map` sobre `[0,1,2,3,4]`.
  - `WizardState`, `useEffect`/`useMemo`, todos os handlers e o `toast.error`
    do catch (CR-01) intocados.
  - O `animate-pulse` não tem guarda própria — é neutralizado pelo
    `@media (prefers-reduced-motion)` global da Task 1 (dependência declarada
    no plano; por isso a ordem sequencial).

## Desvios do plano

Nenhum. Plano executado exatamente como escrito.

## Portões de verificação

| Portão | Resultado |
|--------|-----------|
| `npx tsc --noEmit` | limpo |
| `npm run lint` | exit 0 (4 warnings pré-existentes de `react-hooks/incompatible-library`, 0 erros) |
| `npm run verify:brand` | exit 0 (103 arquivos, nenhuma cor hardcoded) |
| `npm run check:contrast` | exit 0 (30 pares OK — parser de `:root`/`.dark` íntegro após edição do CSS) |
| `npm run verify:theme` | exit 0 |
| `npm run test:relatorios` | exit 0 (57 checagens) |
| `npm run build` | exit 0 (14 rotas, Turbopack) |
| Portão item 1 (regex reduced-motion) | OK |
| Portão item 2 (skip-link + ordem no DOM) | OK |
| Portão item 3 (`tabular-nums` = 10, semibold presente) | OK |
| Portão item 4 (`mode: "onBlur"` nos 2 forms) | OK |
| Portões itens 5+6 (`ImportStepper` x4, `aria-current`, `animate-pulse`, frase removida) | OK |

## Critérios de sucesso

- [x] Os 6 itens aplicados nos 6 arquivos de `files_modified`
- [x] `pipeline-board.tsx` e `followup-dashboard.tsx` intocados (não aparecem no
      `git diff --name-only HEAD~3..HEAD`)
- [x] Nenhum `text-[..px]` novo ou removido
- [x] Todos os portões verdes
- [x] Zero dependência nova em `package.json`
- [x] 3 commits atômicos direto na `main`

## Verificação humana diferida (não bloqueante)

`npm run dev` → `/importar`: conferir "Passo 1 de 3" no dropzone, "Passo 2 de 3"
no mapeamento, "Passo 3 de 3" no skeleton e na tabela de prévia; conferir nos
temas claro e escuro. Também: com "reduzir movimento" ligado no SO, conferir que
nenhuma animação roda; Tab a partir do topo revela o skip-link.

## Self-Check: PASSED

- Arquivos modificados: os 6 confirmados no `git diff --name-only HEAD~3..HEAD`
- Commits: `8e9f39e`, `4f242c7`, `53ff179` confirmados no `git log`
