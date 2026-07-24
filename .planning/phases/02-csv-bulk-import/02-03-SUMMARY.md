---
phase: 02-csv-bulk-import
plan: 03
subsystem: ui
tags: [whatsapp, dynamic-route, post-import]

# Dependency graph
requires:
  - phase: 02-csv-bulk-import
    plan: 02
    provides: CsvImportWizard, CsvImportPreviewTable, bulkImportLeads success branch
  - phase: 04-follow-up-dashboard-whatsapp-outreach
    provides: WhatsAppSendButton, WhatsAppPreviewDialog, followup-dashboard.tsx PreviewState pattern
provides:
  - "Rota /importar/[batchId]: tela pós-importação dedicada por lote, reaproveitando 100% do mecanismo de WhatsApp da Fase 4"
  - "Wizard redireciona (router.push) para /importar/[batchId] após uma confirmação bem-sucedida, em vez de resetar para o passo de upload"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Primeiro uso de useRouter/router.push (next/navigation) no projeto — navegação client-side após uma Server Action bem-sucedida"

key-files:
  created:
    - "src/app/importar/[batchId]/page.tsx"
    - src/components/post-import-lead-list.tsx
  modified:
    - src/components/csv-import-wizard.tsx
    - src/components/csv-import-preview-table.tsx

key-decisions:
  - "onImported mudou de (count: number) => void para (batchId: string) => void — o plano assumia que o handler de confirmação vivia em csv-import-wizard.tsx, mas 02-02 (executado por um agent diferente) colocou handleConfirm/bulkImportLeads em csv-import-preview-table.tsx; adaptado passando batchId pelo callback em vez de mover a lógica de confirmação entre arquivos"
  - "PostImportLeadList não usa useFirstContactTrigger (D-13) — cópia do padrão PreviewState de followup-dashboard.tsx, um único WhatsAppPreviewDialog compartilhado, nunca auto-disparo em sequência para N leads"

patterns-established:
  - "Server Component de rota dinâmica assíncrona (params: Promise<{ batchId: string }>) seguindo o padrão App Router do Next.js 16"

requirements-completed: [LEAD-05]

# Metrics
duration: ~35min
completed: 2026-07-24
---

# Phase 02 Plan 03: Post-Import WhatsApp List Summary

**Fecha o loop D-13/D-14 da Fase 2: confirmar uma importação leva o admin direto a `/importar/[batchId]`, uma tela dedicada por lote com o botão "Enviar WhatsApp" já reaproveitado da Fase 4 em cada lead — nenhum auto-disparo em sequência, sempre clique-por-clique.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-24
- **Tasks:** 2
- **Files modified:** 4 (2 novos, 2 modificados)

## Accomplishments
- `src/app/importar/[batchId]/page.tsx`: Server Component com rota dinâmica assíncrona, filtra `eq(leads.importBatchId, batchId) AND isNull(deletedAt)`, estado defensivo de lote vazio
- `src/components/post-import-lead-list.tsx`: cópia do padrão `PreviewState` de `followup-dashboard.tsx`, `defaultTipo="primeiro_contato"`, sem alterar `WhatsAppSendButton`/`WhatsAppPreviewDialog`
- Wizard agora navega (`router.push`) para o lote recém-criado em vez de resetar para o passo de upload (comportamento interino de 02-02)

## Task Commits

1. **Task 1: Rota /importar/[batchId] + lista pós-importação** — `87a01fb` (feat)
2. **Task 2: Wizard redireciona para a tela pós-importação após confirmar** — `5e19fbf` (feat)

## Files Created/Modified
- `src/app/importar/[batchId]/page.tsx` - Rota dinâmica, query por importBatchId, estado vazio defensivo
- `src/components/post-import-lead-list.tsx` - Lista com envio de WhatsApp por lead
- `src/components/csv-import-wizard.tsx` - `useRouter`, `handleImported(batchId)` faz `router.push`
- `src/components/csv-import-preview-table.tsx` - `onImported` agora recebe `batchId` (era `count`)

## Decisions Made
- Ver `key-decisions` no frontmatter — desvio principal foi adaptar o callback `onImported` para carregar `batchId`, já que a lógica de confirmação real vive no componente filho (`csv-import-preview-table.tsx`), não no wizard como o plano assumia.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Handler de confirmação não vive em csv-import-wizard.tsx como o plano assumia**
- **Found during:** Task 2, ao localizar onde adicionar `router.push`
- **Issue:** O `<interfaces>` do plano mostrava um branch de sucesso `{ success: true, batchId, count }` dentro de `csv-import-wizard.tsx`, mas 02-02 (executado por um agent diferente, depois recuperado nesta mesma sessão) implementou `handleConfirm`/`bulkImportLeads` dentro de `csv-import-preview-table.tsx`, expondo só `onImported: (count: number) => void` para o pai
- **Fix:** Mudado o tipo/chamada de `onImported` para carregar `batchId` em vez de `count` (o toast de sucesso já usa `result.count` diretamente no filho, então nada se perde); `handleImported` no wizard passou a receber `batchId` e chamar `router.push`
- **Files modified:** `src/components/csv-import-preview-table.tsx`, `src/components/csv-import-wizard.tsx`
- **Verification:** `npx tsc --noEmit` e `npm run build` limpos; script de aceite da Task 2 (`useRouter` + `router.push(\`/importar/${batchId}\`)` presentes em `csv-import-wizard.tsx`) passou
- **Committed in:** `5e19fbf` (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 3 — corrigido inline, sem scope creep)
**Impact on plan:** Nenhuma mudança arquitetural; o redirect acontece no mesmo lugar conceitual (branch de sucesso de `bulkImportLeads`), só que o `router.push` em si roda no componente pai via callback.

## Issues Encountered
- `<human-check>` do fluxo fim-a-fim (subir CSV → mapear → prévia → confirmar → redirect automático → enviar WhatsApp → "Ver todos os leads") **não foi executado** nesta sessão — sem acesso a navegador neste executor headless, mesmo padrão de toda fase anterior deste projeto. Substituído por `tsc`+`build`+scripts de aceite automatizados e revisão manual do código. Recomendado antes de considerar a Fase 2 pronta para uso diário.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- Fase 2 (CSV Bulk Import) está com os 3 planos completos: motor de import (02-01), wizard de upload/mapeamento/prévia (02-02), tela pós-importação com WhatsApp (02-03)
- IMPORT-01, IMPORT-02, IMPORT-03 e LEAD-05 satisfeitos do ponto de vista do admin, ponta a ponta
- Risco conhecido sem mudança: nenhum CSV real do cowork foi validado ainda contra as suposições de delimitador/encoding (D-01) — não bloqueia o encerramento da fase, mas vale revisitar assim que houver um arquivo real
- Recomendado antes de considerar a fase pronta para uso diário: um `npm run dev` + clique-through real do fluxo completo (nenhuma sessão headless deste projeto teve acesso a navegador)

---
*Phase: 02-csv-bulk-import*
*Completed: 2026-07-24*

## Self-Check: PASSED

Todos os arquivos criados/modificados confirmados em disco: `src/app/importar/[batchId]/page.tsx`, `src/components/post-import-lead-list.tsx`, `src/components/csv-import-wizard.tsx`, `src/components/csv-import-preview-table.tsx`, `.planning/phases/02-csv-bulk-import/02-03-SUMMARY.md`.
Commits confirmados via `git log`: `87a01fb`, `5e19fbf`.
`npx tsc --noEmit` limpo. `npm run build` limpo (rota `/importar/[batchId]` presente no output como dinâmica). Ambos os scripts de acceptance (Task 1, Task 2) retornaram OK.
