---
phase: 09-timeline-de-intera-es
plan: 04
subsystem: ui
tags: [react, lucide-react, tanstack-table, dnd-kit, dialog, timeline]

requires:
  - phase: 09-timeline-de-intera-es
    plan: 03
    provides: "LeadTimelineDialog/DeleteNotaDialog — superfície dedicada da timeline (D-02), sem pontos de entrada ligados"
provides:
  - "3 pontos de entrada de D-03 ligados à mesma LeadTimelineDialog: ícone History em cada linha de /leads, ícone History no card de /pipeline (dentro do wrapper de stopPropagation), botão 'Ver histórico' no rodapé do modal de editar lead (só em modo edição)"
  - "Bateria completa dos 9 gates automatizados da Fase 9 executada sequencialmente (host de 4GB), incluindo npm run build, todos exit 0"
affects: []

tech-stack:
  added: []
  patterns:
    - "TimelineState = { open: false } | { open: true; lead: Lead } replicado em lead-table.tsx e pipeline-board.tsx, mesma forma de PreviewState já estabelecida (04-03)"
    - "Ponto de entrada de ícone em card com useDraggable: novo controle inserido DENTRO do wrapper de stopPropagation já existente (não um wrapper próprio), evitando duplicar a mitigação do Pitfall 5"

key-files:
  created: []
  modified:
    - src/components/lead-table.tsx
    - src/components/lead-table-columns.tsx
    - src/components/pipeline-lead-card.tsx
    - src/components/pipeline-board.tsx
    - src/components/lead-form-dialog.tsx
    - src/components/whatsapp-preview-dialog.tsx

key-decisions:
  - "eslint-disable-next-line react-hooks/set-state-in-effect adicionado em whatsapp-preview-dialog.tsx (setTipo(defaultTipo) dentro do efeito de reset) — arquivo pré-existente não tocado pelas Tasks 1/2 deste plano, mas o gate eslint escopado da própria Task 3 do plano o inclui explicitamente e reportava erro bloqueante (não apenas warning); mesmo padrão já aceito no projeto (STATE.md decisão 07-02), já aplicado em lead-timeline-dialog.tsx (09-03) para o mesmo falso-positivo do React Compiler"

patterns-established:
  - "Ordem final dos controles de ação por linha/card em D-03: WhatsApp, Histórico, Editar, Excluir — ícone History sempre em cor neutra (nunca teal), nunca entre o accent reservado do botão de WhatsApp"

requirements-completed: [TIMELINE-02]

duration: ~15min
completed: 2026-08-09
---

# Phase 09 Plan 04: Pontos de Entrada da Timeline + Fechamento da Fase Summary

**Ícone History ligado nos 3 pontos de entrada exigidos por D-03 (lista `/leads`, card `/pipeline`, rodapé do modal de editar lead) abrindo a mesma `LeadTimelineDialog` já construída em 09-03, com os 9 gates automatizados da Fase 9 rodados sequencialmente (inclusive `npm run build`) em exit 0.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-08T23:51:01Z
- **Completed:** 2026-08-09T00:03:09Z
- **Tasks:** 3
- **Files modified:** 6 (5 previstas no plano + 1 fix de gate em whatsapp-preview-dialog.tsx)

## Accomplishments
- `/leads`: ícone `History` entre "WhatsApp" e "Editar" em cada linha, com `stopPropagation` antes de abrir a timeline (a linha inteira é clicável para edição); `COL.acoes` ampliada de `w-[260px]` para `w-[300px]` para caber o 4º controle; `TableMeta.onViewTimeline` registrada e espelhada no column def (fonte de verdade de sort/filtro, mesmo padrão pré-existente de `onEditLead`/`onDeleteLead`)
- `/pipeline`: ícone `History` inserido dentro do wrapper `onPointerDown`/`onClick` de `stopPropagation` já existente no card (ao lado do `WhatsAppSendButton`), sem criar um segundo wrapper — preserva a mitigação do Pitfall 5 (drag-handle/edição acidental) documentada no `09-RESEARCH.md`
- Modal de editar lead: botão "Ver histórico" no rodapé, antes de "Cancelar", `variant="outline"`, condicionado a `isEditMode && lead` (nunca aparece na criação); `LeadTimelineDialog` montado fora do `<form>`, como irmão de `DiscardChangesDialog`/`WhatsAppPreviewDialog` — as 3 seções (Contato/Negócio/Acompanhamento) e o campo `notas` ficaram intocados, confirmado por `git diff` linha a linha (D-01)
- Bateria completa de 9 gates da Fase 9 rodada sequencialmente, dev server parado, sem paralelismo (host de 4GB) — ver tabela abaixo

## Task Commits

Each task was committed atomically:

1. **Task 1: Ponto de entrada na lista /leads** - `0430467` (feat)
2. **Task 2: Pontos de entrada no board do pipeline e no modal de editar lead** - `7f3b392` (feat)
3. **Fix de gate descoberto durante a Task 3** - `2d84751` (fix)
3. **Task 3: Gates finais sequenciais da Fase 9** - sem novo arquivo de produção (execução de verificação, ver tabela de gates abaixo)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/components/lead-table.tsx` - Importa `History`/`LeadTimelineDialog`; `TimelineState`; botão de histórico na linha; `COL.acoes` ampliada; `LeadTimelineDialog` montado; `onViewTimeline` na `meta` do `useReactTable`
- `src/components/lead-table-columns.tsx` - `TableMeta.onViewTimeline?`; botão `History` no `cell` da coluna `acoes`, antes de `Pencil`
- `src/components/pipeline-lead-card.tsx` - Prop `onViewHistory: () => void`; botão `History` dentro do wrapper de `stopPropagation` já existente, ao lado do `WhatsAppSendButton`
- `src/components/pipeline-board.tsx` - Importa `LeadTimelineDialog`; `TimelineState`; `onViewHistory` repassado a todo `PipelineLeadCard`; `LeadTimelineDialog` montado
- `src/components/lead-form-dialog.tsx` - Importa `History`/`LeadTimelineDialog`; `timelineOpen`; botão "Ver histórico" no `DialogFooter` (só `isEditMode`); `LeadTimelineDialog` montado fora do `<form>`
- `src/components/whatsapp-preview-dialog.tsx` - `eslint-disable-next-line react-hooks/set-state-in-effect` documentado sobre `setTipo(defaultTipo)` no efeito de reset (fix de gate, ver Deviations)

## Decisions Made
- **Ícone `History` sempre inserido DENTRO de wrappers de `stopPropagation` já existentes, nunca em um novo wrapper irmão** — tanto em `lead-table.tsx` (a linha inteira já tem `onClick` de edição) quanto em `pipeline-lead-card.tsx` (o wrapper de `WhatsAppSendButton` já intercepta `onPointerDown`/`onClick` por causa do `useDraggable`). Reduz superfície de mitigação duplicada e segue literalmente o padrão apontado nas interfaces do plano.
- **`eslint-disable-next-line react-hooks/set-state-in-effect` em `whatsapp-preview-dialog.tsx`** (ver Deviations abaixo) — mesmo padrão já aceito no projeto (STATE.md decisão 07-02), necessário para o gate eslint escopado da própria Task 3 do plano passar em exit 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Suprimido falso-positivo eslint `react-hooks/set-state-in-effect` em `whatsapp-preview-dialog.tsx`**
- **Found during:** Task 3 (gate 2 — `npx eslint` escopado aos arquivos da Fase 9)
- **Issue:** O gate eslint definido pelo próprio plano (Task 3, comando 2) inclui `whatsapp-preview-dialog.tsx` no escopo — arquivo pré-existente, não tocado pelas Tasks 1/2 deste plano. `npx eslint` reportou 1 **erro** bloqueante (não apenas warning) na linha `setTipo(defaultTipo);` dentro do efeito de reset (`react-hooks/set-state-in-effect`), impedindo exit 0 do gate.
- **Fix:** Adicionado `// eslint-disable-next-line react-hooks/set-state-in-effect` com comentário de bloco explicando o motivo, seguindo exatamente o mesmo padrão já documentado e aceito no projeto (STATE.md decisão 07-02) e já aplicado ao mesmo tipo de falso-positivo em `lead-timeline-dialog.tsx` (09-03) para o mesmo cenário: sincronizar estado local com props `open`/`lead` ao trocar de item, não é estado derivável sem efeito.
- **Files modified:** `src/components/whatsapp-preview-dialog.tsx`
- **Verification:** `npx eslint` (mesmo comando escopado do gate) voltou a exit 0, restando apenas 2 warnings pré-existentes de `react-hooks/incompatible-library` (não bloqueantes, já presentes antes desta fase)
- **Committed in:** `2d84751`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessário para o gate 2 (eslint escopado) do próprio Task 3 do plano passar em exit 0. Nenhum comportamento visível mudou — apenas suprime um falso-positivo do React Compiler já tratado como tal em todo o resto do projeto. Sem scope creep.

## Issues Encountered

Nenhum bloqueio além do item documentado acima em Deviations. Os 9 gates rodaram sequencialmente, um de cada vez, sem `&`, com o dev server do CRM parado (verificado via `Get-CimInstance Win32_Process` antes do gate 9 — os únicos processos `node.exe` ativos pertenciam a um projeto não relacionado, "Operações Inteligentes - Landing Page", não ao CRM).

### Tabela de gates (Task 3)

| # | Gate | Comando | Exit code |
|---|------|---------|-----------|
| 1 | TypeScript | `npx tsc --noEmit` | 0 |
| 2 | ESLint (escopado à Fase 9) | `npx eslint <12 arquivos da fase>` | 0 (após fix acima; 2 warnings pré-existentes de `react-hooks/incompatible-library`, não bloqueantes) |
| 3 | Guarda de hard-delete | `npm run guard:no-hard-delete` | 0 |
| 4 | Verificação de schema | `npm run verify:schema` | 0 |
| 5 | Teste de `interacao-actions` | `npm run test:interacao-actions` | 0 (20/20 asserções) |
| 6 | Teste de `lead-actions` | `npm run test:lead-actions` | 0 (todas as asserções, incluindo casos de `origemTipo`) |
| 7 | Invariante de contato WhatsApp | `node scripts/verify-wa-contact-invariant.cjs` | 0 (15/15 pares da tabela-verdade) |
| 8 | Verificação de `origemTipo` | `npm run verify:origem-tipo` | 0 (5 elos íntegros) |
| 9 | Build de produção | `npm run build` | 0 (Turbopack, 11 rotas geradas, sem erro de tipo/lint bloqueante) |

### Estado do banco vivo ao final

- `SELECT COUNT(*) FROM interacoes` → **0** (nenhum clique real de WhatsApp/nota manual foi dado nesta sessão — sem acesso a navegador, ver `<human-check>` abaixo)
- `SELECT COUNT(*) FROM leads` → **37**, idêntico ao valor registrado em `09-01-SUMMARY.md` (37 linhas / 18 colunas, confirmado após o `drizzle-kit push` daquele plano) — nenhuma perda de dado ao longo da Fase 9

### Roteiro de checagem humana (`<human-check>` da Task 3)

**NÃO executado nesta sessão — sem acesso a navegador**, mesma ressalva já registrada em todo plano anterior deste projeto (`STATE.md` §Deferred Items). Os 6 passos do roteiro (abrir histórico por `/leads`, criar/editar/excluir nota manual, abrir "WhatsApp" e conferir entrada com texto editado íntegro, repetir para "Follow-up"/"Prova de valor", ícone de histórico no card do `/pipeline` sem interferir no drag, botão "Ver histórico" no rodapé do modal só em modo edição) seguem pendentes de clique real antes de considerar a Fase 9 pronta para uso diário. Recomendado como próximo passo antes de iniciar prospecção real com a timeline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TIMELINE-01 e TIMELINE-02 (Fase 9 completa) estão implementados de ponta a ponta e verificáveis por código/gates automatizados; falta apenas o `<human-check>` de navegador real (ver acima) para fechar o débito herdado de todo o projeto.
- Nenhum ponto de entrada pendente: os 3 exigidos por D-03 estão ligados à mesma instância de `LeadTimelineDialog` por tela, sem regressão de drag-and-drop (`pipeline-board.tsx`) nem do formulário de lead (`lead-form-dialog.tsx`, D-01 preservado byte a byte fora do rodapé).
- `whatsapp-preview-dialog.tsx` teve um fix de eslint fora do escopo original das Tasks 1/2, documentado em Deviations — não introduz comportamento novo, apenas destrava o gate 2 da própria Task 3.

## Self-Check: PASSED

Os 5 arquivos previstos no plano (`lead-table.tsx`, `lead-table-columns.tsx`, `pipeline-lead-card.tsx`, `pipeline-board.tsx`, `lead-form-dialog.tsx`) e o arquivo do fix de gate (`whatsapp-preview-dialog.tsx`) confirmados presentes em disco. Os 3 hashes de commit (`0430467`, `7f3b392`, `2d84751`) confirmados presentes em `git log --oneline --all`.

---
*Phase: 09-timeline-de-intera-es*
*Completed: 2026-08-09*
