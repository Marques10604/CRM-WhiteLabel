---
status: partial
phase: 09-timeline-de-intera-es
source: [09-VERIFICATION.md]
started: 2026-08-09T00:28:40Z
updated: 2026-08-09T00:28:40Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Registrar nota manual pela lista /leads
expected: Abre "Histórico de {nome}"; toast "Nota registrada."; a nota aparece no topo da lista com badge "Nota manual"
result: [pending]

### 2. Editar e excluir nota manual
expected: Toast "Nota atualizada." ao salvar; toast "Nota removida da timeline." e a entrada some da lista ao excluir
result: [pending]

### 3. Captura automática no clique de WhatsApp (todos os 3 tipos)
expected: Cada clique gera uma entrada nova com o badge do tipo escolhido e o texto editado integral; nenhuma dessas entradas tem ícones de editar/excluir
result: [pending]

### 4. Ponto de entrada no board /pipeline
expected: Abre a timeline do lead certo, sem arrastar o card e sem abrir o modal de edição; arrastar o card para outra coluna continua funcionando normalmente
result: [pending]

### 5. Ponto de entrada no modal de editar lead
expected: Rodapé mostra "Ver histórico" (ausente ao criar um lead novo); clicar abre a mesma timeline; as 3 seções e o campo de notas do formulário permanecem idênticos
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
