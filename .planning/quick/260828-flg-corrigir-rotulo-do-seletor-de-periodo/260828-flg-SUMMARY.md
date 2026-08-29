---
quick_id: 260828-flg
slug: corrigir-rotulo-do-seletor-de-periodo
date: 2026-08-28
status: complete
---

# Quick 260828-flg — SUMMARY

## O que foi feito

`src/components/periodo-selector.tsx`: adicionada a prop
`items={OPCOES as unknown as { value: string; label: string }[]}` ao `<Select>`.
Mesmo idioma dos selects de `canal` / `origemTipo` / `stage` em
`lead-form-dialog.tsx`. Nenhuma outra mudança — `OPCOES`, `handleChange`,
`{ scroll: false }` e o anel de foco accent ficam intactos.

## Verificação

- `npx tsc --noEmit` — exit 0 (limpo).
- SSR contra o dev server (curl), grep de texto direto no gatilho:
  - `/relatorios` → "Últimos 30 dias"
  - `/relatorios?period=90d` → "Últimos 90 dias"
  - `/relatorios?period=tudo` → "Tudo"
  - `/relatorios?period=xyz` (inválido) → "Tudo"
  - Zero ocorrências de `>30d<` / `>90d<` / `>tudo<` no HTML.
- Clique real no dropdown não re-testado nesta rodada (extensão de navegador
  caiu); a lista de opções já tinha sido confirmada correta no UAT.

## Impacto no UAT da Fase 11

Fecha os 3 itens `issue` do `11-HUMAN-UAT.md` (Testes 1, 3, 4 — todos eram o
mesmo bug do rótulo). Restam: Teste 5 (drag → modal Perdido) pendente de 1
verificação humana, e os 2 warnings do verificador (schema script + FK).

## Arquivos

- `src/components/periodo-selector.tsx` (+4 −1)
