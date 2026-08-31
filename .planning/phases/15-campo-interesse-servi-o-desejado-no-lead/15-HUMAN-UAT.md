---
status: partial
phase: 15-campo-interesse-servi-o-desejado-no-lead
source: [15-VERIFICATION.md]
started: 2026-08-31T00:00:00Z
updated: 2026-08-31T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Round-trip do campo "Interesse" no formulário
expected: Em `/leads` → "Novo lead" → preencher "Interesse" → salvar → reabrir o lead em edição: o valor digitado reaparece no campo.
result: [pending]

### 2. Campo opcional não bloqueia submit
expected: Criar um lead com "Interesse" vazio conclui sem erro; editar um lead apagando o texto de "Interesse" e salvar conclui sem erro e o campo volta vazio.
result: [pending]

### 3. Limite de 500 caracteres na UI
expected: Digitar mais de 500 caracteres em "Interesse" e tentar salvar: submit bloqueado com a mensagem "O interesse deve ter no máximo 500 caracteres." abaixo do campo.
result: [pending]

### 4. Mapeamento e importação via CSV
expected: Em `/importar` → subir CSV com coluna livre (ex: "servico") → no passo de mapeamento "Interesse" aparece com opção "— nenhuma —" → mapear "servico" → "Interesse" → confirmar → o lead importado mostra o valor da coluna.
result: [pending]

### 5. Importação sem mapear "Interesse" (sem regressão)
expected: Repetir a importação do mesmo CSV sem mapear "Interesse": leads criados com `interesse` nulo, nenhuma regressão no fluxo de importação.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
