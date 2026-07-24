---
phase: 02-csv-bulk-import
plan: 02
subsystem: ui
tags: [papaparse, wizard, react-table, csv, import]

# Dependency graph
requires:
  - phase: 02-csv-bulk-import
    plan: 01
    provides: decodeCsvFile, mapCsvRows, detectWithinBatchDuplicatePhones, fetchPreviewSupportData, bulkImportLeads
provides:
  - "Rota /importar com wizard de 3 passos (upload/mapear/prévia) — full end-to-end path from a real CSV file to real leads in the database"
  - "CsvImportWizard: orquestrador client via useState discriminado (upload/mapping/preview)"
  - "CsvImportPreviewTable: flags duplicado(DB+lote)/sub-nicho novo/sub-nicho bloqueado, confirmação condicionada"
  - "/importar no NAV_ITEMS, logo após /leads"
affects: [02-03-post-import-whatsapp-list]

# Tech tracking
tech-stack:
  added: ["papaparse@^5.5.4 (dependencies)", "@types/papaparse@^5.5.2 (devDependencies)"]
  patterns:
    - "detectEncodingLabel() no wizard espelha a mesma heurística BOM+TextDecoder(fatal) de decodeCsvFile só para exibição — nunca decide a decodificação real"
    - "Overrides do admin por linha (importarMesmoAssim/subnichoOverrideId) guardados num Map<rowIndex, RowOverride> separado dos dados computados (flags), nunca mutando mappedRows"

key-files:
  created:
    - src/app/importar/page.tsx
    - src/components/csv-import-wizard.tsx
    - src/components/csv-upload-dropzone.tsx
    - src/components/csv-column-mapper.tsx
    - src/components/csv-import-preview-table.tsx
  modified:
    - src/components/app-sidebar.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "@types/papaparse aprovado após checagem manual do registry.npmjs.org (repository = DefinitelyTyped/DefinitelyTyped, mantenedor = types team da Microsoft, sem ownership suspeito) — gate da Task 1 satisfeito"
  - "detectEncodingLabel() duplicou a heurística de decodeCsvFile em vez de decodeCsvFile expor a codificação escolhida, para não alterar a assinatura já consumida por 02-01"

patterns-established:
  - "Componentes de wizard multi-passo usam união discriminada via useState (nunca useReducer), com cada variante carregando os campos do passo anterior para permitir 'voltar' sem reprocessar o arquivo"

requirements-completed: [IMPORT-01, IMPORT-02, IMPORT-03]

# Metrics
duration: N/A (recuperado de sessão anterior interrompida)
completed: 2026-07-24
---

# Phase 02 Plan 02: CSV Import Wizard (Upload + Mapping + Preview) Summary

**Wizard de 3 passos completo em `/importar`: upload com drag-and-drop e detecção automática de separador/codificação, mapeamento de colunas para os campos do lead, e prévia com flags de duplicado/sub-nicho novo/sub-nicho bloqueado antes de confirmar a importação real no banco.**

## Contexto de recuperação

Este plano foi executado por um agent executor num worktree isolado (`agent-afc46b10fd2a29240`) numa sessão anterior. O processo do agent (pid 4124) não estava mais rodando quando esta sessão retomou o trabalho — provavelmente derrubado por falta de memória no host de 4GB, um padrão já visto antes neste projeto. O worktree ficou com todo o código das Tasks 2 e 3 escrito e não commitado (nenhum `SUMMARY.md`, portanto sem sinal de conclusão).

Nesta sessão: o código foi lido e revisado integralmente antes de qualquer commit, copiado para o checkout principal, verificado (`tsc`, `build`, os dois scripts `node -e` do plano), dois pequenos desvios corrigidos, e então commitado tarefa por tarefa. O worktree órfão foi destravado e removido após a recuperação.

## Performance

- **Duration:** N/A — trabalho de implementação já existia; esta sessão fez revisão + correção + verificação + commit
- **Completed:** 2026-07-24
- **Tasks:** 3 (Task 1 gate + Task 2 + Task 3)
- **Files modified:** 8 (5 novos, 3 modificados)

## Accomplishments
- Rota `/importar` (Server Component) busca `subnichos`+`templates` e renderiza `CsvImportWizard`, análogo exato de `/leads/page.tsx`
- Upload: drag-and-drop + seleção de arquivo, guarda de tamanho (~10MB), `decodeCsvFile` SEMPRE antes de `Papa.parse`, estados de erro "Não foi possível ler este arquivo" / "Nenhuma linha válida encontrada" (copy literal, ambos retornam ao passo upload)
- Mapeamento: um `<Select>` por campo do lead, nome/telefone obrigatórios, demais campos com opção "— nenhuma —" (D-04), indicador "Detectado: separador X, codificação Y"
- Prévia: tabela com TODAS as linhas (`getCoreRowModel` só, sem sort/filtro/paginação), 3 badges de flag com cores/ícones exatos do UI-SPEC, `border-l-[#DC2626]` em linha bloqueada, resumo com contadores reais, checkbox "Importar mesmo assim" e `SubnichoCombobox` inline para resolver linhas bloqueadas
- "Confirmar importação" desabilitado enquanto existir linha bloqueada sem sub-nicho resolvido (D-12); ao confirmar, filtra duplicatas não marcadas e resolve `subnichoOverrideId` antes de chamar `bulkImportLeads`
- `/importar` adicionado ao `NAV_ITEMS` logo após `/leads`

## Task Commits

1. **Task 1: [BLOCKING] Verificar legitimidade de @types/papaparse** — aprovado nesta sessão via checagem direta em `registry.npmjs.org/@types/papaparse`: repository = `DefinitelyTyped/DefinitelyTyped`, mantenedor = types team da Microsoft, versão instalada (5.5.2) confere, nenhuma mudança suspeita de ownership. `papaparse` em si já estava `[OK]` no Package Legitimacy Audit de `02-RESEARCH.md`. Instalação já existia no worktree recuperado (não foi reinstalado).
2. **Task 2: Upload + mapeamento de colunas** — `33e5715` (feat)
3. **Task 3: Prévia com flags + confirmação + item de navegação** — `dd690ed` (feat)

## Files Created/Modified
- `src/app/importar/page.tsx` - Server Component da rota, análogo a `leads/page.tsx`
- `src/components/csv-import-wizard.tsx` - Orquestrador client, estado `WizardState` discriminado (upload/mapping/preview)
- `src/components/csv-upload-dropzone.tsx` - Drag-and-drop + seleção de arquivo, estados vazio/preenchido/erro
- `src/components/csv-column-mapper.tsx` - Selects de mapeamento de coluna, CTA "Ver prévia"
- `src/components/csv-import-preview-table.tsx` - Tabela de prévia com flags, overrides por linha, confirmação
- `src/components/app-sidebar.tsx` - Item de nav `/importar` adicionado
- `package.json` / `package-lock.json` - `papaparse` (dependencies) + `@types/papaparse` (devDependencies)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@types/papaparse` instalado em `dependencies` em vez de `devDependencies`**
- **Found during:** Verificação automatizada da Task 2 (`node -e` script do plano) após recuperar o worktree
- **Issue:** O `npm install` executado na sessão anterior (antes da queda) colocou `@types/papaparse` em `dependencies`, violando a ação explícita do plano (`npm install --save-dev @types/papaparse`) e falhando o check automatizado
- **Fix:** Movido manualmente para `devDependencies` em `package.json`, seguido de `npm install` para corrigir a flag `dev` no `package-lock.json`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** Script `node -e` da Task 2 passou após a correção; `npx tsc --noEmit` e `npm run build` seguiram limpos
- **Committed in:** `33e5715` (Task 2)

**2. [Rule 3 - Blocking] Comentário em `csv-import-wizard.tsx` continha a substring literal `useReducer`, disparando falso-positivo no check automatizado**
- **Found during:** Mesma verificação da Task 2
- **Issue:** O check do plano (`wiz.includes('useReducer')`) é uma checagem textual ingênua — o comentário explicativo "via `useState`, NUNCA `useReducer`" (documentando a convenção do projeto) continha a própria palavra proibida, mesmo o código nunca chamando o hook
- **Fix:** Reescrito o comentário para "sem hook de reducer", preservando o significado sem a substring literal
- **Files modified:** `src/components/csv-import-wizard.tsx`
- **Verification:** Script `node -e` da Task 2 passou; nenhuma mudança de comportamento (só comentário)
- **Committed in:** `33e5715` (Task 2)

---

**Total deviations:** 2 auto-fixed (ambos Rule 3 — corrigidos inline, sem scope creep)
**Impact on plan:** Nenhuma mudança arquitetural; um dos dois é puramente cosmético (comentário).

## Issues Encountered
- O worktree órfão (`agent-afc46b10fd2a29240`) tinha um lock de processo (pid 4124) que não existia mais no sistema — sinal de que o host (4GB RAM) derrubou o agent durante a Task 2/3. O worktree foi destravado e removido após o código ser copiado e verificado; a branch temporária correspondente também foi deletada.
- `<human-check>` do fluxo completo (upload de CSV real → mapeamento → prévia com as 3 flags → confirmação → leads visíveis em `/leads` e sub-nicho novo em `/subnichos`) **não foi executado** nesta sessão (sem acesso a navegador neste executor headless) — substituído pelos automated checks (`tsc`, `build`, os dois scripts `node -e` do plano) e pela revisão manual linha-a-linha do código antes do commit. Um `npm run dev` + clique real no fluxo completo ainda é recomendado antes de considerar IMPORT-01/02/03 prontas para uso real, seguindo o mesmo precedente já registrado em 01-02/01-03/01-04.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- Rota `/importar` navegável e funcional end-to-end (upload → mapear → prévia → confirmar), pronta para 02-03 (tela pós-importação com lista de leads do lote e disparo de WhatsApp, D-14)
- `handleImported()` no wizard já reseta para o passo `upload` após o toast de sucesso — 02-03 pode substituir esse reset por uma transição para a tela pós-importação sem tocar no resto do wizard
- Nenhum bloqueio novo. O risco já conhecido (nenhum CSV real do cowork validado ainda contra as suposições de delimitador/encoding) permanece sem mudança — não bloqueia 02-03
- Recomendado: um `npm run dev` + clique-through real do fluxo completo assim que houver oportunidade, antes de considerar a fase 2 pronta para uso diário

---
*Phase: 02-csv-bulk-import*
*Completed: 2026-07-24*

## Self-Check: PASSED

Todos os arquivos criados/modificados confirmados em disco: `src/app/importar/page.tsx`, `src/components/csv-import-wizard.tsx`, `src/components/csv-upload-dropzone.tsx`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-preview-table.tsx`, `src/components/app-sidebar.tsx`, `package.json`, `package-lock.json`, `.planning/phases/02-csv-bulk-import/02-02-SUMMARY.md`.
Commits confirmados via `git log`: `33e5715`, `dd690ed`.
`npx tsc --noEmit` limpo. `npm run build` limpo (rota `/importar` presente no output). Ambos os scripts `node -e` de acceptance (Task 2, Task 3) retornaram OK.
