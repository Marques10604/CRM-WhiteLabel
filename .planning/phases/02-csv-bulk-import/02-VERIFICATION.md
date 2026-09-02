---
phase: 02-csv-bulk-import
verified: 2026-09-02
status: passed
score: 15/15 cenários de UAT verificados por code+data — 0 issues
overrides_applied: 0
method: code+data (Fase 18 / AUDIT-02, D-01 revisado — navegador bloqueado por hardware)
human_verification: []
---

# Phase 2: CSV Bulk Import — Verification Report

**Phase Goal:** O admin importa leads em lote a partir de um CSV do cowork parceiro — upload
com detecção automática de separador e codificação, mapeamento de colunas para os campos do
lead, prévia de todas as linhas com flags (duplicado / nicho novo / sem nicho / telefone
inválido) e decisão por linha, e uma importação transacional que cria/reativa nichos e leva o
admin a uma tela pós-importação por lote com envio de WhatsApp.

**Verified:** 2026-09-02 (auditoria retroativa — Fase 18, AUDIT-02)
**Status:** passed
**Re-verification:** Sim — a Fase 2 nunca teve `HUMAN-UAT.md` nem `VERIFICATION.md`. Os três
SUMMARYs (02-01/02-02/02-03) registram "nenhuma sessão headless teve acesso a navegador" e o
`02-CONTEXT.md` alertava que nenhum CSV real do cowork tinha sido validado contra as
suposições de delimitador/encoding. Este relatório fecha a lacuna.

## Método de Verificação

Navegador bloqueado por hardware (host de 4GB — ver `18-01-SUMMARY.md`). Verificação por
**code+data**:

1. **Leitura da superfície:** `csv-import-wizard.tsx` (orquestrador `WizardState`
   discriminado), `csv-column-mapper.tsx`, `csv-import-preview-table.tsx`,
   `csv-upload-dropzone.tsx`; módulos puros `src/lib/csv-encoding.ts` (`decodeCsvFile`) e
   `src/lib/csv-import.ts` (`mapCsvRows`, `buildNotasText`,
   `detectWithinBatchDuplicatePhones`, `CSV_DEFAULTS`); Server Actions
   `src/actions/import-actions.ts` (`fetchPreviewSupportData`, `bulkImportLeads`); schema
   `csvRowSchema` (`src/lib/validations.ts`); rota dinâmica `/importar/[batchId]`.
2. **Funções puras verificadas via node:**
   - `Papa.parse(..., { delimiter: "" })` auto-detecta `,` (→ "vírgula") e `;`
     (→ "ponto-e-vírgula").
   - `new TextDecoder("utf-8", { fatal: true })` **lança** num byte `0xE9` solto (o "é" de
     Windows-1252/latin-1) → o fallback `new TextDecoder("windows-1252")` recupera "José"
     corretamente; um "é" em UTF-8 legítimo **não** lança → rótulo "UTF-8".
3. **Harness `test:lead-actions`** (exit 0): `bulkImportLeads` é de fato **invocada** (Casos
   11/12 da quick 260807-uit WR-03 + casos de `interesse`) contra um banco SQLite temporário —
   insere linhas e lê de volta: `importBatchId` não-nulo compartilhado, `origemTipo` default
   `"outbound"`, `interesse` truncado/NULL corretos. **Isto fecha o gap WR-03 do
   `08-REVIEW.md`** ("`bulkImportLeads` nunca foi de fato invocada em nenhum teste"), que era
   anterior à quick 260807-uit.
4. **Query no `data/crm.db`:** 21 leads soft-deletados carregam `import_batch_id` não-nulo; o
   nicho id 12 "A categorizar" tem 21 leads — o caminho de import real (incl. o fallback de
   nicho) já rodou em produção.

### O que um pass de navegador ainda acrescentaria

- Drag-and-drop de um arquivo real no dropzone; o `<input type=file>`.
- Renderização visual das 4 badges de flag (cores/ícones exatos) e do banner de resumo.
- Um import real NOVO de ponta a ponta no `data/crm.db` com um CSV do cowork de produção —
  não executado aqui por regra da Fase 18 (só SELECT no banco real). Risco residual
  parcialmente mitigado: imports reais já ocorreram e revelaram/corrigiram os bugs
  `cbfb1bc`/`fc684c6`/`0fb70fd` (telefone com DDI estrangeiro, nicho ausente).

## Goal Achievement — Observable Truths

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Upload avança para o mapeamento e mostra separador + codificação detectados | ✓ VERIFIED (code+data) | `handleFileSelected` → `decodeCsvFile` + `Papa.parse(delimiter:"")` → `CsvColumnMapper` "Detectado: separador X, codificação Y"; node: `,`/`;` auto-detectados |
| 2 | Codificação Windows-1252 vs UTF-8 é distinguida corretamente | ✓ VERIFIED (code+data) | `decodeCsvFile` BOM → `TextDecoder(fatal)` → fallback `windows-1252`; node: `0xE9` solto lança, fallback recupera acento |
| 3 | Estados de erro de upload (grande demais / ilegível / sem linha válida) com copy literal | ✓ VERIFIED (code+data) | `MAX_FILE_SIZE_BYTES`, `ERROR_READ_FAILED`, `ERROR_NO_VALID_ROWS` (`csv-import-wizard.tsx:27-52`), disparados nos `catch` e nos guards de linha válida |
| 4 | Nome/Telefone obrigatórios; "Ver prévia" travado até ambos mapeados | ✓ VERIFIED (code+data) | `FIELD_CONFIGS` required; `canContinue = Boolean(mapping.nome && mapping.telefone)`; botão `disabled={!canContinue}` |
| 5 | Campos opcionais "— nenhuma —" + colunas extras concatenadas nas Notas na ordem do arquivo | ✓ VERIFIED (code+data) | `csv-column-mapper.tsx:68-84`; `buildNotasText` (`csv-import.ts:95-122`) ordem = `headers`, rótulo = header exato, fallback `CSV_DEFAULTS.notas` sobre o resultado final |
| 6 | Prévia lista TODAS as linhas com flag "Duplicado" (banco ativo + dentro do lote) + "Importar mesmo assim" | ✓ VERIFIED (code+data) | `fetchPreviewSupportData` (só `isNull(deletedAt)`), `detectWithinBatchDuplicatePhones`; `handleConfirm` pula duplicada sem override |
| 7 | Flag "Novo nicho" + banner "{n} nichos novos serão criados" | ✓ VERIFIED (code+data) | `unknownNichoNames` via lookup `lower(trim())`; badge azul; banner `csv-import-preview-table.tsx:329-333`; nicho reativado, não recriado |
| 8 | Flag "Sem nicho" + combobox inline + fallback "A categorizar" (não bloqueia) | ✓ VERIFIED (code+data) | `flags.nichoBloqueado = nichoNome.trim() === ""`; `SEM_NICHO_FALLBACK`; `handleConfirm` nunca pula por falta de nicho; data: nicho 12 tem 21 leads |
| 9 | Telefone inválido excluído do lote (não aborta), toast de aviso lista os pulados | ✓ VERIFIED (code+data) | `flags.telefoneInvalido = telefoneNormalizado === null`; `handleConfirm` `continue`; `toast.warning` |
| 10 | Coluna "Interesse" na prévia + badge "Cortado em 500 caracteres" por code point | ✓ VERIFIED (code+data + live Fase 16) | `csv-import-preview-table.tsx:133-164`; `mapCsvRows` corta por `Array.from`; `16-HUMAN-UAT.md` cenários 3/4/4b ao vivo |
| 11 | "Confirmar" → toast "{n} leads importados" → redirect `/importar/[batchId]` com WhatsApp por lead | ✓ VERIFIED (code+data) | `handleConfirm` → `bulkImportLeads` → `router.push`; `PostImportLeadList`; harness invoca `bulkImportLeads` e lê `importBatchId` de volta |
| 12 | `bulkImportLeads` é transacional: cria/reativa nichos + insert linha-a-linha + `import_batch_id` compartilhado + `stage: novo` | ✓ VERIFIED (code+data) | `import-actions.ts:87-176`; `db.transaction`; `randomUUID()` batchId; data: 21 leads históricos com `import_batch_id` não-nulo |
| 13 | "Voltar ao mapeamento" preserva `parsedRows`/`mapping` sem reprocessar | ✓ VERIFIED (code+data) | `handleBackToMapping` reusa campos carregados pela variante `preview` do `WizardState` |

**Score:** 13/13 verdades + 15/15 cenários de UAT verificados. 0 issues.

## Requirements Coverage

| Requisito | Descrição | Status | Evidência |
|-----------|-----------|--------|-----------|
| IMPORT-01 | Wizard de importação em lote a partir de CSV | ✓ SATISFIED | Rota `/importar` 3 passos, ponta a ponta até `/importar/[batchId]` |
| IMPORT-02 | Detecção de duplicata (banco + dentro do lote) na prévia | ✓ SATISFIED | `fetchPreviewSupportData` + `detectWithinBatchDuplicatePhones` + flags/override |
| IMPORT-03 | Detecção automática de separador e codificação | ✓ SATISFIED | `Papa.parse(delimiter:"")` + `decodeCsvFile`; verificado via node |
| LEAD-05 | `leads.importBatchId` para rastrear origem do lote | ✓ SATISFIED | Coluna nullable + índice; harness confirma batch id compartilhado; 21 leads históricos |

## Anti-Patterns Found

Nenhum. A auditoria code+data não encontrou defeito de runtime no wizard.

## Gaps Summary

Sem gaps bloqueantes. Diferido para uma futura sessão com navegador: a renderização visual
das badges/banner e um import real NOVO de ponta a ponta com um CSV de produção. O caminho de
`bulkImportLeads` agora tem cobertura comportamental real (harness), fechando o antigo gap
WR-03. Nada bloqueia AUDIT-02.

---

*Verified: 2026-09-02*
*Verifier: Claude (Fase 18 — auditoria retroativa, método code+data)*
