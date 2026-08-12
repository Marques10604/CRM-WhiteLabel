---
quick_id: 260811-ro5
status: complete
completed: 2026-08-11
commit: 5798a58
---

# Quick Task 260811-ro5: Corrigir IN-01 — guard de in-flight no botão de excluir nota manual

**`handleConfirmarExclusao` agora usa uma flag `excluindo` (mesmo padrão de `salvandoEdicaoId`), desabilitando o botão "Excluir" de `DeleteNotaDialog" (texto "Excluindo...") enquanto `softDeleteInteracaoManual` está em voo — um duplo-clique rápido não dispara mais a Server Action duas vezes em concorrência.**

## Accomplishments

- Fechado o gap de consistência apontado em `09-REVIEW.md` (IN-01): a exclusão de nota agora segue o mesmo padrão de pending já usado por criar (`useTransition`) e editar (`salvandoEdicaoId`) no mesmo arquivo
- `excluindo` resetado no mesmo `useEffect [open, lead?.id]` que já reseta os demais estados de edição/exclusão ao trocar de lead (mesma fonte única de reset já estabelecida em 09-03)
- Botão "Cancelar" do dialog também desabilitado durante o pending (evita fechar o dialog no meio da requisição)

## Files Modified

- `src/components/lead-timeline-dialog.tsx` — estado `excluindo`, `handleConfirmarExclusao` com try/finally, reset no efeito de troca de lead, prop `pending` passada ao `DeleteNotaDialog`
- `src/components/delete-nota-dialog.tsx` — nova prop opcional `pending?: boolean`; botões "Cancelar"/"Excluir" desabilitados e texto "Excluindo..." quando `pending`

## Verification

```
npx tsc --noEmit                                                              → exit 0
npx eslint src/components/lead-timeline-dialog.tsx src/components/delete-nota-dialog.tsx → exit 0
npm run test:interacao-actions                                                → 20/20 OK
```

## Issues Encountered

Nenhum bloqueio.

---
*Quick task: 260811-ro5*
*Completed: 2026-08-11*
