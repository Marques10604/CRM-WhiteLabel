---
phase: 18-auditoria-retroativa-no-navegador
plan: 03
subsystem: verification
tags: [uat, audit, code-data, fase-2, csv-import]
status: complete

requires:
  - phase: 18-auditoria-retroativa-no-navegador
    plan: 02
    provides: "01-HUMAN-UAT.md complete + 01-VERIFICATION.md passed"
provides:
  - "02-HUMAN-UAT.md autorado do zero — 15 cenários (upload/detecção, mapeamento, prévia com 4 flags, import real, voltar-ao-mapeamento), todos pass code+data"
  - "02-VERIFICATION.md criado com status: passed"
  - "gap WR-03 do 08-REVIEW (bulkImportLeads sem cobertura comportamental) documentado como fechado"
affects: [18-06]

key-files:
  created:
    - .planning/phases/02-csv-bulk-import/02-HUMAN-UAT.md
    - .planning/phases/02-csv-bulk-import/02-VERIFICATION.md

key-decisions:
  - "D-01 revisado: code+data. Funções puras (PapaParse delimiter auto-detect, TextDecoder fatal + fallback windows-1252) verificadas via node script; bulkImportLeads verificada pelo harness test:lead-actions (invoca a função contra banco temporário)"
  - "Cenário 14 (import real): NÃO executado no data/crm.db (regra Fase 18 — só SELECT no banco real). Coberto por harness (banco temporário) + 21 leads históricos com import_batch_id não-nulo"
  - "Labels reais das flags da prévia confirmados no código: 'Duplicado' / 'Novo nicho' / 'Sem nicho' / 'Telefone inválido — não será importado' (o CONTEXT falava 'Nicho novo / Nicho bloqueado')"

requirements-completed: [AUDIT-02]

duration: incluído na sessão de auditoria da Fase 18
completed: 2026-09-02
---

# Phase 18 Plan 03: Fase 2 — CSV Bulk Import autorada + auditada (code+data)

**`02-HUMAN-UAT.md` criado do zero (15 cenários) e verificado por code+data.
`02-VERIFICATION.md` criado com `status: passed`. O caminho `bulkImportLeads`, que o
`08-REVIEW.md` (WR-03) apontava como "nunca invocado em teste", tem cobertura comportamental
real via `test:lead-actions`.**

## Accomplishments

- **`02-HUMAN-UAT.md` autorado** — formato de `16-HUMAN-UAT.md`, 15 cenários:
  - Upload + detecção (1-6): separador `,`/`;` auto-detectado (`Papa.parse(delimiter:"")`,
    verificado via node); `TextDecoder("utf-8",{fatal:true})` lança em `0xE9` solto → fallback
    `windows-1252` recupera "José"; estados de erro com copy literal (`MAX_FILE_SIZE_BYTES`,
    `ERROR_READ_FAILED`, `ERROR_NO_VALID_ROWS`).
  - Mapeamento (7-8): Nome/Telefone obrigatórios sem "— nenhuma —"; `canContinue`; colunas
    extras para notas na ordem do arquivo (`buildNotasText`).
  - Prévia com flags (9-13): "Duplicado" (banco ativo + dentro do lote) + "Importar mesmo
    assim"; "Novo nicho" + banner; "Sem nicho" + combobox inline + fallback "A categorizar";
    "Telefone inválido — não será importado" (excluído do lote, não aborta); coluna "Interesse"
    + badge de truncamento (já verificado live na Fase 16).
  - Import real (14): `bulkImportLeads` transacional, `randomUUID()` batchId, `stage: novo`,
    redirect `/importar/[batchId]`.
  - Voltar ao mapeamento (15): preserva `parsedRows`/`mapping`.
- **`02-VERIFICATION.md` criado** — `status: passed`, 13/13 truths, cobertura de
  IMPORT-01/02/03 + LEAD-05, seção `## Método de Verificação`.

## Issues Encontradas

Nenhuma. A auditoria code+data do wizard de importação (upload → mapear → prévia → confirmar →
pós-importação) não encontrou defeito de runtime. Fica diferido para uma futura sessão com
navegador: um import real NOVO de ponta a ponta no `data/crm.db` com um CSV do cowork de
produção (validaria as suposições de delimitador/encoding contra um arquivo real — risco
carregado desde `02-CONTEXT.md`; parcialmente mitigado por imports reais que já ocorreram e
revelaram/corrigiram `cbfb1bc`/`fc684c6`/`0fb70fd`).

**Nota positiva:** o antigo gap WR-03 do `08-REVIEW.md` ("`bulkImportLeads` nunca foi de fato
invocada em nenhum teste") está FECHADO — a quick 260807-uit adicionou Casos 11/12 a
`test-lead-actions.cjs` que invocam a função contra um banco temporário. Registrado em
`02-VERIFICATION.md` e `08-VERIFICATION.md`.

## Next Phase Readiness

- AUDIT-02 fechado. Plano 18-04 (Fase 4) pode prosseguir.

---
*Phase: 18-auditoria-retroativa-no-navegador — Plan 03*
*Completed: 2026-09-02 (code+data)*
