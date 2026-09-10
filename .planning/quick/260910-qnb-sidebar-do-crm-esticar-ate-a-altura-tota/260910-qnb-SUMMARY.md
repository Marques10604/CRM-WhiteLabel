---
status: complete
quick_id: 260910-qnb
completed: 2026-09-10
---

# Quick 260910-qnb — Summary

**Sidebar do CRM agora vai de cima até o fim da janela sempre (sem o vão no rodapé que o usuário viu no screenshot), e a marca "SOLO" ganhou presença: logo 40px + nome 20px bold na cor do texto.**

## Feito

### Tarefa 1 — Sidebar altura total
- `src/app/layout.tsx`: `<body>` `min-h-full` → `min-h-dvh`.
- `src/components/app-sidebar.tsx`: `<aside>` de `flex h-full` → `sticky top-0 flex h-dvh ... overflow-y-auto`. O `h-dvh` fixa a altura exata da viewport (não depende mais só do flex-stretch, que falhava visualmente quando o `<main>` tinha conteúdo curto); `sticky top-0` mantém o menu no lugar enquanto o conteúdo rola; `overflow-y-auto` protege janelas muito baixas.

### Tarefa 2 — Marca com presença
- Logo "S": `h-7 w-7 rounded-md text-[13px]` → `size-10 rounded-lg text-base` (28px → 40px).
- "SOLO": `text-[11px] uppercase tracking-[0.08em] text-muted-foreground` → `text-xl font-bold text-sidebar-foreground` (11px cinza no canto → 20px bold na cor do texto).
- Bloco do header: `gap-2.5 px-[18px] pt-5 pb-[22px]` → `gap-3 px-4 pt-5 pb-6` (classes de escala).

## Commit

- `29d75ca` feat(quick-260910-qnb): sidebar altura total + marca SOLO com presença

## Gates

`npx tsc --noEmit` exit 0 · `npm run lint` exit 0 (4 warnings pré-existentes em `lixeira-table.tsx`) · `npm run verify:brand` OK (103 arquivos, `text-sidebar-foreground` é token) · `npm run check:contrast` 30/30 · `npm run build` (Turbopack) exit 0, 14 rotas.

## Desvios

Nenhum. Escopo restrito ao header do sidebar + `<body>` — nav items, label "PRINCIPAL", toggle de tema e a varredura geral de `text-[..px]` (backlog `review-uiux-05`) não foram tocados.

## Pendências não-bloqueantes

- UAT humano: confirmar no navegador que o verde do sidebar cobre de cima até embaixo em `/campanhas` (vazio) e `/leads` (longa), claro e escuro; conferir a marca "SOLO" nova.

## Self-Check: PASSED

- 2 arquivos modificados, conferidos em disco.
- Commit `29d75ca` presente.
- Gates todos verdes (acima).
