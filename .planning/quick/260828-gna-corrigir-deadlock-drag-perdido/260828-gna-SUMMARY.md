---
quick_id: 260828-gna
slug: corrigir-deadlock-drag-perdido
date: 2026-08-28
status: complete
relates_to: Fase 11 (11-HUMAN-UAT.md Teste 5)
commits: [fbf7abd, 967e735, 1dd794b]
---

# Quick 260828-gna — SUMMARY

## O bug (UAT da Fase 11, Teste 5)

Arrastar um card para "Perdido" no `/pipeline`: `setMotivoPerdaState({open:true})`
era chamado DENTRO de `startTransition(async () => { setOptimisticStage(...);
await new Promise(...) })`. No React 19 o update de abrir o modal ficava preso na
transição async suspensa que aguardava a Promise → deadlock: modal não renderiza
→ usuário não responde → Promise não resolve → transição não assenta → renderer
congela. Card encalhava em "Perdido" sem persistir nem reverter.

## As correções

### 1. `pipeline-board.tsx` — modal fora da transição async (`fbf7abd`)
- Nova `commitStageChange(leadId, stage, motivoPerdaId?)`: única `startTransition(async)`
  do componente, só aguarda `updateLeadStage` (server action que sempre resolve).
- `handleDragEnd`: guard `if (!lead) return` (id inválido) + `if (lead.stage === newStage) return`
  (soltou na própria coluna). Ramo `perdido`: **não move o card, não entra em transição** —
  só enfileira `{leadId, leadNome}` (dedupe por id) e abre o modal com update urgente.
  Ramo geral: `commitStageChange(leadId, newStage)`.
- `resolveMotivoPerda` ("Salvar motivo"): `shiftMotivoQueue()` + `commitStageChange(id, "perdido", motivoId)` —
  **aqui** o card move (otimista) e persiste. `cancelMotivoPerda` ("Cancelar"): só
  `shiftMotivoQueue()`. O card nunca moveu → nada a reverter.
- `advanceMotivoQueue`: abre o modal pro próximo pendente ou fecha.

### 2. `motivo-perda-dialog.tsx` — dismiss guard seletivo (`967e735`)
Com o modal do drag finalmente acessível, o teste ao vivo mostrou que ele nunca
fechava: o `onOpenChange` fazia `eventDetails.cancel()` INCONDICIONAL em todo
`!next`, inclusive na notificação de fechamento programático (`reason: "none"`),
dessincronizando o Base UI. Agora só cancela `reason` `"escape-key"` / `"outside-press"`.
Fechar de verdade vem de `onCancel`/`onSave` mudando o estado no pai.

### 3. `pipeline-board.tsx` — dedup da fila (`1dd794b`)
`shiftMotivoQueue()` remove o item da frente E qualquer duplicata do mesmo `leadId` —
insurance contra double-fire de `onDragEnd`.

## Por que corrige o deadlock

Não existe mais nenhum caminho onde uma transição aguarda algo que depende de um
render bloqueado por essa própria transição. A abertura do modal é um `setState`
urgente síncrono num event handler comum. Deadlock estruturalmente impossível.

Efeito colateral positivo: o card só entra em "Perdido" DEPOIS de "Salvar motivo"
(antes aparecia otimista já no drop, com risco de órfão). Mais seguro.

## Verificação

**Instrumentada (drag sintético + MutationObserver + inspeção de estado), no dev server:**
- ✅ `tsc --noEmit` limpo (3x, após cada commit).
- ✅ Drag para "Perdido" → o modal **"Mover para Perdido — Por que '{nome}' foi perdido?"**
  ABRE, com o nome correto do lead, sem botão X, sem freeze do renderer.
- ✅ O card **NÃO se move** ao soltar em "Perdido" (fica na etapa de origem;
  contagens das colunas inalteradas). Só moveria em "Salvar motivo".
- ✅ Após "Cancelar", o card continua na etapa de origem e o estado React volta
  a `{open:false}` (nome do modal vai a vazio).
- ✅ Bundle do cliente confirmado com o novo código.

**NÃO verificável nesta sessão (janela do Chrome estava `document.hidden` /
minimizada — congela animações CSS e quebra screenshots):**
- ⚠️ O **unmount visual** do modal após Cancelar/Salvar: o Base UI Dialog espera
  o fim da animação de saída pra desmontar; com a aba oculta a animação fica com
  `currentTime: 0` (não avança), então o popup fica montado. **Isso é artefato da
  janela oculta, não do código** — o estado React fecha corretamente. Com a janela
  visível a animação (0.1s) roda e o modal desmonta normal.
- ⚠️ Persistência do **"Salvar motivo"**: a interação com o `MotivoPerdaCombobox`
  (criável) por automação não selecionou a opção (Salvar ficou disabled). O
  combobox já foi provado funcionando pelo `/leads` no UAT anterior, e
  `resolveMotivoPerda → commitStageChange` usa o MESMO padrão do drag normal
  (que funciona) + o param `motivoPerdaId`.

**RECOMENDADO: 1 checagem manual com a janela do Chrome visível** — arrastar um
card para "Perdido", confirmar: modal abre → Cancelar fecha e o card volta →
arrastar de novo → escolher/criar motivo → "Salvar motivo" move o card e persiste,
tudo sem congelar.

## Arquivos

- `src/components/pipeline-board.tsx`
- `src/components/motivo-perda-dialog.tsx`
