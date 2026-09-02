---
status: complete
phase: 02-csv-bulk-import
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-UI-SPEC.md, 18-CONTEXT.md §AUDIT-02]
started: 2026-09-02T00:00:00Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 0
method: "code+data (Fase 18, D-01 revisado — navegador bloqueado por hardware). Leitura da superfície (wizard + módulos puros csv-encoding/csv-import + Server Actions) + harness test:lead-actions (bulkImportLeads, Casos 11/12/interesse) + verificação das funções puras (PapaParse delimiter, TextDecoder fatal) via node + query no data/crm.db."
audit: "Fase 18 — AUDIT-02 (Fase 2 nunca teve HUMAN-UAT nem VERIFICATION; nenhuma sessão headless teve navegador; nenhum CSV real do cowork validado contra as suposições de delimitador/encoding)"
---

## Current Test

[completo — 15/15 cenários com resultado, todos por code+data]

## Tests

### Upload + detecção de separador/codificação

### 1. Upload de CSV válido (vírgula, UTF-8) avança para o mapeamento
expected: Em `/importar` → arrastar/selecionar um `.csv` separado por vírgula em UTF-8 → o wizard vai para o passo "Mapeie as colunas" e mostra "Detectado: separador vírgula, codificação UTF-8".
result: pass
evidence: |
  (code+data) `csv-import-wizard.tsx:191-243` `handleFileSelected`: guarda de tamanho →
  `Promise.all([decodeCsvFile(file), detectEncodingLabel(file)])` → `Papa.parse(decoded,
  { header: true, skipEmptyLines: true, delimiter: "" /* auto */, transformHeader: h=>h.trim() })`
  → `setState({ step: "mapping", parsedRows, detectedDelimiter: result.meta.delimiter, detectedEncoding })`.
  `CsvColumnMapper` (`csv-column-mapper.tsx:57,94-96`): `delimiterLabel = detectedDelimiter === ";"
  ? "ponto-e-vírgula" : "vírgula"`; renderiza "Detectado: separador {delimiterLabel}, codificação {detectedEncoding}".
  Verificação por node: `Papa.parse("nome,telefone\nAna,11991234567\n", {delimiter:""})` →
  `meta.delimiter === ","`, 1 linha. `decodeCsvFile` de UTF-8 válido passa pelo
  `TextDecoder("utf-8",{fatal:true})` sem lançar → rótulo "UTF-8".

### 2. Detecção de separador ponto-e-vírgula (export Excel pt-BR)
expected: CSV separado por `;` → "Detectado: separador ponto-e-vírgula" e as colunas são reconhecidas corretamente.
result: pass
evidence: |
  (code+data) `Papa.parse` com `delimiter: ""` auto-detecta. Verificação por node:
  `Papa.parse("nome;telefone\nBia;11991234567\n", {delimiter:""})` → `meta.delimiter === ";"`,
  `meta.fields === ["nome","telefone"]`. O wizard passa `result.meta.delimiter` direto para
  `detectedDelimiter`; `csv-column-mapper.tsx:57` mapeia `";" → "ponto-e-vírgula"`.

### 3. Detecção de codificação Windows-1252 (acentos de export Excel)
expected: CSV com acentos salvos em Windows-1252 (Excel pt-BR) → "codificação Windows-1252" e os acentos aparecem corretos na prévia (não como caracteres quebrados).
result: pass
evidence: |
  (code+data) `decodeCsvFile` (`src/lib/csv-encoding.ts:9-30`): (1) checa BOM UTF-8; (2)
  `new TextDecoder("utf-8", { fatal: true }).decode(buffer)` — lança em qualquer byte que não
  seja UTF-8 válido; (3) no `catch`, `new TextDecoder("windows-1252").decode(buffer)`.
  `detectEncodingLabel` (`csv-import-wizard.tsx:95-105`) replica a mesma heurística só para o rótulo.
  Verificação por node: buffer com `0xE9` solto ("é" latin-1) → `TextDecoder("utf-8",{fatal:true})`
  LANÇA (`utf8ok === false`) → `TextDecoder("windows-1252")` devolve `"nome\nJosé\n"` (acento
  correto). UTF-8 legítimo de "José" NÃO lança → rótulo "UTF-8".

### 4. Arquivo grande demais (> ~10 MB)
expected: Selecionar um arquivo maior que ~10 MB → erro "Não foi possível ler este arquivo" com corpo sobre dividir em lotes menores, permanecendo no passo de upload.
result: pass
evidence: |
  (code+data) `csv-import-wizard.tsx:27-28,192-202` — `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`;
  `if (file.size > MAX_FILE_SIZE_BYTES) setState({ step: "upload", error: { heading: "Não foi
  possível ler este arquivo", body: "Este arquivo é grande demais para importar de uma vez.
  Divida em lotes menores e tente novamente." } })` — retorna sem parsear. `CsvUploadDropzone`
  renderiza `error.heading`/`error.body` e mantém `step: "upload"`.

### 5. Arquivo ilegível / não é CSV
expected: Selecionar um arquivo que não parseia → erro "Não foi possível ler este arquivo" / "Verifique se é um arquivo .csv exportado do Google Sheets ou Excel", no passo de upload.
result: pass
evidence: |
  (code+data) `csv-import-wizard.tsx:44-47` `ERROR_READ_FAILED = { heading: "Não foi possível
  ler este arquivo", body: "Verifique se é um arquivo .csv exportado do Google Sheets ou Excel
  e tente novamente." }`. Disparado em 3 pontos: `catch` do `decodeCsvFile`/`detectEncodingLabel`
  (linha 209), `catch` do `Papa.parse` (linha 222-224).

### 6. Nenhuma linha válida (sem nome/telefone)
expected: CSV lido mas sem nenhuma linha com nome E telefone preenchidos → erro "Nenhuma linha válida encontrada" / "nenhuma linha tem nome e telefone preenchidos", volta ao upload.
result: pass
evidence: |
  (code+data) `ERROR_NO_VALID_ROWS` (`csv-import-wizard.tsx:49-52`). Disparado quando
  `result.data.length === 0` (linha 227-230) e, no passo mapeamento, quando
  `handleContinueToPreview` computa `mapCsvRows` e `!rows.some(r => r.nome !== "" && r.telefone !== "")`
  (linha 262-267) → `setState({ step: "upload", error: ERROR_NO_VALID_ROWS })`.

### Mapeamento de colunas

### 7. Nome e Telefone obrigatórios; "Ver prévia" travado até os dois mapeados
expected: No passo "Mapeie as colunas": os selects de Nome e Telefone não têm opção "— nenhuma —"; o botão "Ver prévia" fica desabilitado enquanto Nome ou Telefone não estiverem mapeados.
result: pass
evidence: |
  (code+data) `csv-column-mapper.tsx:17-26` `FIELD_CONFIGS` — `nome`/`telefone` `required: true`,
  os outros 6 `required: false`. `items` (linha 101-106): campo obrigatório = só os headers;
  campo opcional = `[{ value: "__nenhuma__", label: "— nenhuma —" }, ...headers]`.
  `canContinue = Boolean(mapping.nome && mapping.telefone)` (linha 58); botão "Ver prévia"
  `disabled={!canContinue}` (linha 168).

### 8. Campos opcionais "— nenhuma —" + colunas extras para notas
expected: Campos opcionais podem ficar em "— nenhuma —" (não mapeados). Colunas do arquivo que sobram aparecem como checkboxes "Colunas extras para notas"; marcar uma concatena o valor dela nas Notas, na ordem do arquivo.
result: pass
evidence: |
  (code+data) `csv-column-mapper.tsx:68-84` — `unmappedHeaders` (colunas não usadas em nenhum
  dos 8 campos fixos) viram checkboxes; `visibleExtraColumns` alimenta o resumo "Serão
  concatenadas: A → B" na ORDEM de `headers` (ordem do arquivo, nunca ordem de clique, D-08).
  `buildNotasText` (`src/lib/csv-import.ts:95-122`): Notas 1-pra-1 sem rótulo primeiro, depois
  colunas extras com rótulo = header exato, `\n` como separador; célula vazia omite a linha
  inteira. Fallback `CSV_DEFAULTS.notas = "Importado via CSV."` aplicado sobre o resultado
  FINAL (`mapCsvRows:148`). Coberto pelo `test:lead-actions` (bulkImportLeads grava `notas`).

### Prévia com flags

### 9. Flag "Duplicado" + checkbox "Importar mesmo assim"
expected: Linha cujo telefone já existe como lead ATIVO no banco (ou repetido dentro do próprio lote) → badge amarelo "Duplicado"; a linha só entra na importação se o admin marcar "Importar mesmo assim".
result: pass
evidence: |
  (code+data) DB: `fetchPreviewSupportData` (`src/actions/import-actions.ts:32-65`) —
  `SELECT telefone FROM leads WHERE deletedAt IS NULL AND telefone IN (<normalizados>)`
  (só leads ATIVOS contam, D-05/D-07). Lote: `detectWithinBatchDuplicatePhones`
  (`csv-import.ts:186-205`) agrupa por `telefoneNormalizado` e marca as que aparecem 2+ vezes.
  `csv-import-wizard.tsx:170-189` compõe `flags.duplicadoDb`/`duplicadoLote`.
  `csv-import-preview-table.tsx:63-75` `StatusBadges`: badge `#FEF3C7`/`#B45309` "Duplicado"
  com ícone `TriangleAlert` quando `duplicadoDb || duplicadoLote`. `handleConfirm` (linha 262-301):
  `if (isDuplicate && !override.importarMesmoAssim) continue` — pula a linha; o checkbox
  "Importar mesmo assim" (linha 185-195) alterna `override.importarMesmoAssim`.

### 10. Flag "Novo nicho" + banner de criação
expected: Linha cujo nicho não existe no banco → badge azul "Novo nicho"; o resumo mostra "{n} nichos novos serão criados: {nomes}".
result: pass
evidence: |
  (code+data) `fetchPreviewSupportData` (`import-actions.ts:49-62`) — para cada nome de nicho
  trimado, `SELECT id FROM nichos WHERE lower(trim(nome)) = lower(trim(<nome>))`; se
  `existing.length === 0` entra em `unknownNichoNames`. Nome que existe só como soft-deletado
  NÃO entra (será reativado, não criado). `flags.nichoNovo = nichoNome !== "" &&
  unknownNichoNamesSet.has(nichoNome.trim())` (`csv-import-wizard.tsx:177-178`).
  Badge `#DBEAFE`/`#1D4ED8` "Novo nicho" (`csv-import-preview-table.tsx:76-85`). Banner
  "{novoCount} nichos novos serão criados: {unknownNichoNames.join(', ')}" (linha 329-333).
  `bulkImportLeads` cria/reativa o nicho dentro da transação (`import-actions.ts:113-142`).

### 11. Flag "Sem nicho" + combobox inline + fallback "A categorizar"
expected: Linha com a coluna de nicho vazia (ou não mapeada) → badge cinza "Sem nicho"; um combobox de nicho inline permite escolher um; sem escolha, a linha importa com o nicho "A categorizar" (não bloqueia a importação).
result: pass
evidence: |
  (code+data) `flags.nichoBloqueado = row.nichoNome.trim() === ""` (`csv-import-wizard.tsx:179`).
  Badge `#E4E4E7`/`#3F3F46` "Sem nicho" (`csv-import-preview-table.tsx:86-95`). Combobox inline
  `<NichoCombobox>` na coluna "Ação" (linha 196-206) com texto "Opcional — sem escolha, vira
  'A categorizar'". `handleConfirm` (linha 279-289): se `nichoBloqueado`, usa o
  `nichoOverrideId` escolhido, senão `SEM_NICHO_FALLBACK = "A categorizar"` — NUNCA pula a
  linha por falta de nicho (revisão de D-12). Data: `data/crm.db` tem o nicho id 12
  "A categorizar" com 21 leads (o fallback já rodou em produção).

### 12. Telefone inválido → excluído do lote, não aborta a importação
expected: Linha cujo telefone não normaliza (DDI estrangeiro, texto) → badge vermelho "Telefone inválido — não será importado"; a linha é excluída da confirmação; um toast de aviso lista os pulados; o resto do lote importa normalmente.
result: pass
evidence: |
  (code+data) `flags.telefoneInvalido = row.telefoneNormalizado === null`
  (`csv-import-wizard.tsx:185`; `normalizePhone` retorna `null` p/ comprimento inválido).
  Badge `#FEE2E2`/`#B91C1C` "Telefone inválido — não será importado"
  (`csv-import-preview-table.tsx:96-105`). `handleConfirm` (linha 268-269): `if
  (r.flags.telefoneInvalido) continue` — exclui a linha; toast.warning listando os nomes
  pulados (linha 307-313). Sem esse tratamento o `csvRowSchema.safeParse` de `bulkImportLeads`
  abortaria o lote inteiro (contexto histórico: bugs `cbfb1bc`/`fc684c6` do CSV real do cowork).

### 13. Coluna "Interesse" na prévia + badge de truncamento em 500
expected: Mapear uma coluna livre para "Interesse" → a prévia mostra a coluna "Interesse" com o valor de cada linha; célula com > 500 code points mostra o valor cortado + badge amarelo "Cortado em 500 caracteres".
result: pass
evidence: |
  (code+data) `csv-import-preview-table.tsx:133-164` — coluna "Interesse" (molde da coluna
  "Notas"): valor cru com `whitespace-pre-line` + `max-w-xs`, "—" quando vazio; badge
  `#FEF3C7`/`#B45309` "Cortado em 500 caracteres" quando `row.original.interesseTruncado`.
  `mapCsvRows` (`csv-import.ts:160-162`): corta por CODE POINT (`Array.from(...).slice(0,500)`)
  e seta `interesseTruncado = interesseChars.length > 500`. Já verificado AO VIVO no UAT da
  Fase 16 (`16-HUMAN-UAT.md` cenários 3/4/4b — coluna presente, badge com ASCII e emoji astral,
  350 emoji não abortam o lote). Harness `test:lead-actions`: "mapCsvRows(600 emoji): interesse
  truncado em 500 code points", "interesseTruncado === true", "bulkImportLeads(interesse
  mapeado): linha persistida com o valor".

### Import real

### 14. Import real mínimo → redirect /importar/[batchId] + import_batch_id compartilhado
expected: "Confirmar importação" com 1-2 linhas válidas → toast "{n} leads importados com sucesso." → redireciona para `/importar/[batchId]` com um botão "Enviar WhatsApp" por lead → no `data/crm.db` as linhas do lote têm o MESMO `import_batch_id` e `stage = 'novo'`.
result: pass
evidence: |
  (code+data) `csv-import-preview-table.tsx:303-318` `handleConfirm` → `bulkImportLeads(confirmedRows)`
  → no sucesso `toast.success("{count} leads importados com sucesso.")` + `onImported(result.batchId)`
  → `csv-import-wizard.tsx:305-309` `router.push("/importar/" + batchId)`.
  `bulkImportLeads` (`src/actions/import-actions.ts:87-176`): valida cada linha com
  `csvRowSchema` (aborta tudo se qualquer uma falhar), `batchId = randomUUID()`, `db.transaction`
  resolve/cria nichos + loop de insert linha-a-linha (nunca `.values([...todas])`, evita
  "too many SQL variables") com `importBatchId: batchId`, `stage: "novo"`,
  `stageChangedAt: new Date()`, `followUpDate: new Date()`.
  `src/app/importar/[batchId]/page.tsx` filtra `eq(importBatchId, batchId) AND isNull(deletedAt)`
  → `PostImportLeadList` (padrão `PreviewState` de `followup-dashboard`, um `WhatsAppPreviewDialog`
  compartilhado, sem auto-disparo em sequência).
  Harness `test:lead-actions` (Casos 11/12, quick 260807-uit WR-03): "bulkImportLeads(linha
  sem origemTipo): insere exatamente 1 linha (antes=3, depois=4)", "linha persistida com
  origemTipo === 'outbound'", "importBatchId não-nulo (got d6d94d7d-...)" — `bulkImportLeads` É
  invocada de fato contra um banco temporário e o resultado lido de volta. exit 0.
  Data: `data/crm.db` tem 21 leads soft-deletados com `import_batch_id` não-nulo — imports
  reais já rodaram em produção e compartilharam batch id.
  Nota: um import real NOVO no `data/crm.db` foi deliberadamente NÃO executado nesta auditoria
  (regra da Fase 18: só SELECT no banco real, não criar dados de teste). A cobertura vem do
  harness (que insere+lê num banco temporário) + do estado histórico do banco real.

### 15. "Voltar ao mapeamento" preserva o arquivo já parseado
expected: Da prévia, "Voltar ao mapeamento" → volta ao passo 2 com `parsedRows` e o mapping preservados (não re-processa nem pede o arquivo de novo).
result: pass
evidence: |
  (code+data) `csv-import-wizard.tsx:274-285` `handleBackToMapping`: `setState({ step: "mapping",
  fileName, parsedRows, detectedDelimiter, detectedEncoding, mapping, extraNotasColumns })` —
  reusa todos os campos que a variante `preview` do `WizardState` carrega do passo anterior
  (comentário em `csv-import-wizard.tsx:54-60`: "cada variante carrega os campos do passo
  anterior para permitir 'voltar' sem reprocessar o arquivo"). O botão está em
  `csv-import-preview-table.tsx:377-379`.

## Summary

- Total: 15
- Passed: 15 (todos por code+data)
- Issues: 0
- Pending: 0
- Skipped: 0
- Blocked: 0

## Método de Verificação (Fase 18, D-01 revisado)

Navegador bloqueado por hardware (host 4GB). Verificação por code+data:

1. **Superfície:** wizard (`csv-import-wizard.tsx` + `csv-column-mapper.tsx` +
   `csv-import-preview-table.tsx` + `csv-upload-dropzone.tsx`), módulos puros
   (`src/lib/csv-encoding.ts`, `src/lib/csv-import.ts`), Server Actions
   (`src/actions/import-actions.ts`), rota `/importar/[batchId]`.
2. **Funções puras verificadas via node:** `Papa.parse` auto-detecta `,` e `;`;
   `TextDecoder("utf-8",{fatal:true})` lança em `0xE9` solto (latin-1) e o fallback
   `windows-1252` recupera o acento; UTF-8 legítimo não lança.
3. **Harness `test:lead-actions`:** `bulkImportLeads` é de fato invocada (Casos 11/12 +
   interesse) contra um banco temporário — insere e lê de volta. exit 0. (Fecha o gap WR-03
   do `08-REVIEW.md`, que era anterior à quick 260807-uit.)
4. **Query no `data/crm.db`:** 21 leads soft-deletados com `import_batch_id` não-nulo, nicho
   "A categorizar" (id 12) com 21 leads — o caminho de import real já rodou em produção.

### O que um pass de navegador ainda acrescentaria

- Drag-and-drop de arquivo real no dropzone e o `<input type=file>`.
- Renderização visual das 4 badges de flag (cores/ícones) e do banner de resumo.
- Um import real NOVO de ponta a ponta no `data/crm.db` com um CSV do cowork real (validaria
  as suposições de delimitador/encoding contra um arquivo de produção — risco carregado desde
  `02-CONTEXT.md`; parcialmente mitigado pelo fato de que imports reais já ocorreram e
  revelaram/corrigiram os bugs `cbfb1bc`/`fc684c6`/`0fb70fd`).

## Issues Encontradas

(nenhuma — auditoria code+data não encontrou defeito de runtime no wizard de importação)

## Gaps

- Cenário 14: import real NOVO no `data/crm.db` não executado (regra Fase 18: só SELECT no
  banco real). Coberto por harness (banco temporário) + estado histórico do banco de produção.
- Renderização visual das badges/banner diferida para navegador.
- Nenhum gap bloqueia AUDIT-02.
