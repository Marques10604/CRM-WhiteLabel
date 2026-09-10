---
status: complete
quick_id: 260910-qnb
---

# Quick 260910-qnb: Sidebar altura total + marca SOLO com presença

## Contexto

Feedback do usuário (com screenshot, 2026-09-10): (1) o painel do sidebar do CRM
não chega até o fim da janela — fica um vão no rodapé à esquerda quando o
conteúdo da página é curto (ex.: `/campanhas` vazio), dando sensação de "cortado";
(2) a marca "SOLO" está pequena e discreta demais (selo cinza 11px no canto) — o
usuário quer mais presença. Escolha do usuário via AskUserQuestion: header
"Logo grande + nome forte".

## Tarefa 1 — Sidebar sempre com altura total (sem vão)

**Arquivos:** `src/app/layout.tsx`, `src/components/app-sidebar.tsx`

- `layout.tsx`: `<body>` `min-h-full` → `min-h-dvh`.
- `app-sidebar.tsx`: o `<aside>` deixa de depender só do flex-stretch. Passa a
  `sticky top-0 h-dvh` + `overflow-y-auto` (guarda pra janelas muito baixas).
  `h-dvh` garante altura exata da viewport sempre; `sticky top-0` mantém o menu
  fixo enquanto o `<main>` rola. Elimina o vão independente do tamanho do
  conteúdo da página.

**Verify:** `npx tsc --noEmit`, `npm run lint`, `npm run build`. UAT humano:
abrir `/campanhas` (vazio) e uma página longa (`/leads`), confirmar que o verde
do sidebar vai de cima até embaixo em ambas, claro e escuro.

## Tarefa 2 — Header da marca com presença

**Arquivo:** `src/components/app-sidebar.tsx` (só o bloco do header, primeiras
~10 linhas do `return`)

- Logo "S": `h-7 w-7 rounded-md text-[13px]` → `size-10 rounded-lg text-base`
  (40px, mantém `bg-primary text-primary-foreground`).
- Nome "SOLO": `text-[11px] font-bold uppercase tracking-[0.08em]
  text-muted-foreground` → `text-xl font-bold text-sidebar-foreground` (20px,
  cor do texto, sem uppercase redundante nem tracking largo).
- Espaçamento do bloco em classes de escala: `gap-2.5 px-[18px] pt-5 pb-[22px]`
  → `gap-3 px-4 pt-5 pb-6`.

**Verify:** `npx tsc --noEmit`, `npm run lint`, `npm run verify:brand` (só
tokens, zero hex — `text-sidebar-foreground` é token), `npm run check:contrast`,
`npm run build`.

## Fora de escopo

Varredura geral de `text-[..px]` (backlog `review-uiux-05`). O toggle de tema no
rodapé, os itens de nav e o label "PRINCIPAL" ficam como estão.
