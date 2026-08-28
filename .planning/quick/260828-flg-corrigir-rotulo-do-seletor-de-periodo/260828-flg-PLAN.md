---
quick_id: 260828-flg
slug: corrigir-rotulo-do-seletor-de-periodo
created: 2026-08-28
status: complete
---

# Quick 260828-flg: Corrigir rótulo do seletor de período

## Problema

Em `/relatorios`, o gatilho fechado do `PeriodoSelector` exibia o token cru
(`30d` / `90d` / `tudo`) em vez do rótulo humano (`Últimos 30 dias` /
`Últimos 90 dias` / `Tudo`). Detectado no UAT da Fase 11 (itens 1, 3 e 4 do
`11-HUMAN-UAT.md`).

## Causa

`src/components/periodo-selector.tsx` renderizava `<SelectValue />` sem passar
a prop `items` para o `<Select>` (Root do Base UI). Sem `items`, o
`Select.Value` do Base UI não resolve o rótulo e cai no `value` cru. Todos os
outros selects do projeto (`canal`, `origemTipo`, `stage` em
`lead-form-dialog.tsx`) já passam `items={... as { value; label }[]}`.

## Task 1 — adicionar `items` ao Select do PeriodoSelector

- files: `src/components/periodo-selector.tsx`
- action: passar `items={OPCOES as unknown as { value: string; label: string }[]}`
  ao `<Select>`, seguindo o idioma já estabelecido no projeto. `OPCOES` já tem
  a forma `{ value, label }`.
- verify: `npx tsc --noEmit` limpo; SSR de `/relatorios`, `?period=90d`,
  `?period=tudo` e `?period=xyz` renderiza o rótulo humano no gatilho.
- done: gatilho mostra "Últimos 30 dias" / "Últimos 90 dias" / "Tudo".
