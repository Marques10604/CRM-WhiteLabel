---
phase: quick
plan: 260721-0cl
subsystem: ui
tags: [react, form, react-hook-form, shadcn, ui-copy]

requires:
  - phase: 01-lead-sub-nicho-foundation
    provides: lead-form-dialog.tsx com Field/FieldContent/FieldLabel/FieldError já em uso
provides:
  - Texto de ajuda (FieldDescription) abaixo do controle em cada campo do formulário de lead (exceto Nome)
affects: [lead-form-dialog]

tech-stack:
  added: []
  patterns:
    - "FieldDescription inserido entre o controle e o FieldError dentro de FieldContent, consistente em todos os campos"

key-files:
  created: []
  modified:
    - src/components/lead-form-dialog.tsx

key-decisions:
  - "Campo Nome propositalmente sem FieldDescription (autoexplicativo, pedido explícito do plano)"

patterns-established:
  - "Ordem canônica dentro de FieldContent: controle -> FieldDescription -> FieldError"

requirements-completed: [QUICK-260721-0cl]

duration: 15min
completed: 2026-07-21
---

# Quick Task 260721-0cl: Texto de ajuda nos campos do formulário de lead Summary

**Cada campo do modal de lead (exceto Nome) agora exibe uma linha de ajuda em pt-BR abaixo do controle, usando o componente `FieldDescription` já existente em `src/components/ui/field.tsx`.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-21T03:21:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `FieldDescription` importado de `@/components/ui/field` em `lead-form-dialog.tsx`
- 8 campos (Telefone, Canal, Origem, Sub-nicho, Etapa, Valor estimado, Notas, Follow-up) recebem uma linha de ajuda curta em pt-BR, posicionada entre o controle e o `<FieldError>`
- Canal, Origem e Valor estimado (os três obrigatórios pedidos explicitamente pelo admin) usam o copy exato acordado
- Campo Nome permanece sem ajuda, conforme instrução do plano (autoexplicativo)

## Task Commits

1. **Task 1: Importar FieldDescription e adicionar linha de ajuda em cada campo** - `689b168` (feat)

**Plan metadata:** (docs commit feito pelo orquestrador, fora deste SUMMARY)

## Files Created/Modified
- `src/components/lead-form-dialog.tsx` - Import de `FieldDescription` + 8 linhas de ajuda inseridas em cada `FieldContent` (exceto Nome)

## Decisions Made
- Nenhuma decisão fora do que já estava especificado no plano — copy e posicionamento seguiram exatamente o texto e a estrutura acordados.

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered
- `npx tsc --noEmit` OOM'ou na primeira tentativa (host com pouca memória livre no momento — Firefox e outros processos consumindo RAM, ~180MB livres de 4GB totais, mesma limitação documentada em execuções anteriores desta fase). Memória livre se recuperou (~535MB) após aguardar; segunda tentativa de `npx tsc --noEmit` rodou limpa, sem retry manual de código — não foi um bug do código, apenas contenção de memória do host.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `lead-form-dialog.tsx` está pronto; recomenda-se um `npm run dev` + abrir o modal "Novo lead" no navegador para conferir visualmente o texto de ajuda cinza-claro entre cada controle e a área de erro (nenhum acesso a navegador neste executor headless).
- Nenhum bloqueio para a próxima plan (01-04, soft-delete/lixeira).

---
*Phase: quick*
*Completed: 2026-07-21*

## Self-Check: PASSED
