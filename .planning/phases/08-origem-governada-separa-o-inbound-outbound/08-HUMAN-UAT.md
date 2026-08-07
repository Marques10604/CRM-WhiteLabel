---
status: partial
phase: 08-origem-governada-separa-o-inbound-outbound
source: [08-VERIFICATION.md]
started: 2026-08-07T23:59:00Z
updated: 2026-08-07T23:59:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Abrir "Novo lead" e observar o campo "Tipo de origem"
expected: Campo aparece logo abaixo de "Origem", com placeholder "Selecione o tipo de origem" (nada pré-selecionado) e exatamente duas opções no select: Inbound e Outbound
result: [pending]

### 2. Preencher o formulário de criação de lead e clicar em Salvar sem escolher "Tipo de origem"
expected: O salvamento é bloqueado e a mensagem "Selecione o tipo de origem." aparece visualmente abaixo do campo
result: [pending]

### 3. Abrir o modal de EDIÇÃO de qualquer lead pré-existente (backfillado pela plan 08-01) e observar o controle "Tipo de origem"
expected: O select já vem com "Outbound" selecionado
result: [pending]

### 4. Importar um CSV de teste (2-3 linhas) via /importar e consultar `data/crm.db` filtrando pelo `import_batch_id` do lote
expected: Todas as linhas do lote têm `origem_tipo = 'outbound'`
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
