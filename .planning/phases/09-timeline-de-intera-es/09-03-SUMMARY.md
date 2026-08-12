---
phase: 09-timeline-de-intera-es
plan: 03
subsystem: ui
tags: [react, react-hook-form, zod, base-ui, dialog, timeline]

requires:
  - phase: 09-timeline-de-intera-es
    plan: 01
    provides: tabela `interacoes`, tipos, contratos Zod (notaManualTextoSchema/interacaoManualUpdateSchema), 4 Server Actions imperativas
  - phase: 09-timeline-de-intera-es
    plan: 02
    provides: captura automática do texto vivo no clique de "Abrir WhatsApp" (registerWhatsAppContact transacional)
provides:
  - "LeadTimelineDialog (src/components/lead-timeline-dialog.tsx): superfície dedicada da timeline (D-02) — lista cronológica decrescente, composer fixo de nota manual, edição inline e exclusão confirmada só para tipo=\"nota_manual\""
  - "DeleteNotaDialog (src/components/delete-nota-dialog.tsx): confirmação de exclusão de nota manual, espelha delete-lead-dialog.tsx"
affects: [09-04]

tech-stack:
  added: []
  patterns:
    - "Guarda contra respostas fora de ordem em busca imperativa: leadIdEmVooRef comparado após o await, resposta descartada se o id em voo mudou (corrida de lead trocado)"
    - "Edição inline (substituir corpo por Textarea+botões size=\"sm\") em vez de modal aninhado, para ação reversível sem confirmação"

key-files:
  created:
    - src/components/lead-timeline-dialog.tsx
    - src/components/delete-nota-dialog.tsx
  modified: []

key-decisions:
  - "eslint-disable-next-line documentado para 2 falsos-positivos já conhecidos do projeto (react-hooks/set-state-in-effect no reset do efeito [open, lead?.id]; react-hooks/refs em form.handleSubmit(onSubmit)) — mesmo padrão já aceito em whatsapp-preview-dialog.tsx/template-form-dialog.tsx/configuracoes-form.tsx (STATE.md, decisão 07-02), sem formRef próprio neste composer mas o mesmo mecanismo interno do react-hook-form aciona a regra"
  - "DeleteNotaDialog renderizado como irmão do <Dialog> da timeline (dentro de um Fragment no retorno do componente), não aninhado dentro do <Dialog>/<DialogContent> — segue literalmente a instrução do plano e o precedente de lead-table.tsx"
  - "onSubmit do composer usa useTransition (não useActionState) — as 4 Server Actions de interacao-actions.ts são chamadas imperativamente com argumentos posicionais, sem FormData/useActionState"

patterns-established:
  - "Estado de edição inline por id (editandoId/textoEdicao) e exclusão por id (notaParaExcluir) resetados no mesmo efeito [open, lead?.id] que já reseta a lista, mantendo uma única fonte de reset ao trocar de lead"

requirements-completed: [TIMELINE-01, TIMELINE-02]

duration: ~15min
completed: 2026-08-08
---

# Phase 09 Plan 03: Superfície da Timeline de Interações Summary

**LeadTimelineDialog exibe o histórico cronológico completo de um lead com composer de nota manual sempre visível, edição inline e exclusão confirmada restritas a notas manuais — eventos automáticos de WhatsApp permanecem imutáveis também na UI, reforçando (sem substituir) a guarda real que já existe no WHERE do servidor.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-08T23:30:00Z
- **Completed:** 2026-08-08T23:45:16Z
- **Tasks:** 3
- **Files modified:** 2 (2 criados, 0 modificados fora deste plano)

## Accomplishments
- Lista cronológica decrescente (mesma ordenação já garantida pelo servidor em 09-01) com ícone/badge/timestamp por entrada, texto integral preservando quebras de linha (`whitespace-pre-wrap`, sem `line-clamp`/`truncate`/`slice`), estado vazio explicativo com o composer continuando visível
- Composer fixo no topo (âncora visual primária do UI-SPEC) criando nota manual via `createInteracaoManual`, com feedback de toast e reset automático
- Edição inline e exclusão confirmada renderizadas SOMENTE para `tipo === "nota_manual"` — reforço visual de uma guarda que já é real no servidor (09-01), nunca a única barreira
- Guarda contra corrida de requisição (`leadIdEmVooRef`) descarta respostas cujo lead mudou durante o voo, e todo estado de edição/exclusão é resetado no mesmo efeito `[open, lead?.id]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Superfície da timeline — leitura cronológica, lista de entradas e estado vazio** - `617eee3` (feat)
2. **Task 2: Composer de nota manual fixo no topo da timeline** - `4ed2ec5` (feat)
3. **Task 3: Edição inline e exclusão confirmada de nota manual (assimetria D-06)** - `d70a431` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/components/lead-timeline-dialog.tsx` (novo) - `LeadTimelineDialog`: Dialog guardado por `{lead ? ... : null}` (WR-04), `recarregar()` com guarda de corrida, composer react-hook-form+Zod, lista com ícone/badge/timestamp, edição inline e exclusão restritas a `nota_manual`
- `src/components/delete-nota-dialog.tsx` (novo) - `DeleteNotaDialog`: confirmação destrutiva espelhando `delete-lead-dialog.tsx`, copy sem promessa de restauração (D-06/D-07)

## Decisions Made
- **eslint-disable documentado para 2 regras já conhecidas como falso-positivo no projeto:** `react-hooks/set-state-in-effect` (reset de `interacoes`/`carregando` no branch `!open || !lead` do efeito) e `react-hooks/refs` (`form.handleSubmit(onSubmit)`). Ambos seguem o precedente já aceito e documentado em `STATE.md` (decisão 07-02) para `whatsapp-preview-dialog.tsx`/`template-form-dialog.tsx`/`configuracoes-form.tsx` — sem essa supressão, `npx eslint` (exigido pela verificação do plano) falharia por um padrão que o próprio time já tratou como falso-positivo do React Compiler em todo o resto do app.
- **`DeleteNotaDialog` como irmão do `<Dialog>` da timeline:** o componente passou a retornar um `<>...</>` no nível raiz (antes retornava só `<Dialog>`), com `<DeleteNotaDialog />` fora de `<DialogContent>` — segue literalmente a instrução do plano e o precedente de `lead-table.tsx` (que monta `DeleteLeadDialog` ao lado dos demais dialogs no mesmo componente pai).

## Deviations from Plan

None - plan executado exatamente como escrito. Os dois `eslint-disable-next-line` acima não são desvio de escopo: são a aplicação do mesmo padrão já estabelecido no projeto (STATE.md, decisão 07-02) para o mesmo tipo de falso-positivo do React Compiler, necessário para satisfazer a própria verificação automatizada do plano (`npx eslint ... exit 0`).

## Issues Encountered

Nenhum bloqueio. Único ponto de atenção: o `eslint-disable-next-line react-hooks/set-state-in-effect` inicialmente colocado antes de um bloco de comentário `/* ... */` não suprimiu a linha certa (a diretiva `eslint-disable-next-line` só afeta a linha imediatamente seguinte) — corrigido movendo a explicação para um comentário de bloco separado e a diretiva para a linha imediatamente anterior a cada `setState`. Verificado com `npx eslint` limpo (exit 0, sem warnings de "unused eslint-disable directive").

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `LeadTimelineDialog`/`DeleteNotaDialog` prontos para os 3 pontos de entrada do plano 09-04 (`lead-table.tsx`, `pipeline-lead-card.tsx`, `lead-form-dialog.tsx`, D-03) — nenhum ponto de entrada foi ligado ainda, conforme escopo deste plano.
- Todos os 4 gates de verificação do plano rodaram sequencialmente com o dev server parado (host de 4GB RAM): `tsc --noEmit`, `eslint` (escopado aos 2 arquivos da fase), `test:interacao-actions`, `guard:no-hard-delete` — todos exit 0.
- `<human-check>` (clique real no navegador abrindo a timeline, criando/editando/excluindo uma nota) ainda NÃO foi executado — sem acesso a navegador nesta sessão, mesma ressalva de todo plano anterior deste projeto. Recomendado antes de considerar a Fase 9 pronta para uso diário, junto com a ligação dos pontos de entrada em 09-04.

## Self-Check: PASSED

Ambos os arquivos (`src/components/lead-timeline-dialog.tsx`, `src/components/delete-nota-dialog.tsx`) confirmados presentes em disco. Os 3 hashes de commit (`617eee3`, `4ed2ec5`, `d70a431`) confirmados presentes em `git log --oneline --all`.

---
*Phase: 09-timeline-de-intera-es*
*Completed: 2026-08-08*
