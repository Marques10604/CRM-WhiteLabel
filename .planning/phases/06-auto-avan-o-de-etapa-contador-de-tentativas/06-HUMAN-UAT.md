---
status: partial
phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
source: [06-VERIFICATION.md]
started: 2026-07-30T13:32:54Z
updated: 2026-07-30T13:32:54Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Pipeline: lead "Novo" → "Enviar WhatsApp" → manter "1º contato" → "Abrir WhatsApp"
expected: Aba wa.me abre, modal fecha, toast "{Nome} avançou para Contatado." aparece, card migra para coluna Contatado com ícone+"1x"
result: [pending]

### 2. Mesmo lead (agora Contatado): repetir clique com "1º contato"
expected: Nenhum toast de avanço, lead permanece em Contatado, contador vai para "2x"
result: [pending]

### 3. Lead em Negociação: clicar "Abrir WhatsApp" com "1º contato"
expected: Etapa inalterada (nunca regride), contador incrementa
result: [pending]

### 4. Abrir modal e cancelar (botão Cancelar, Escape, clique fora)
expected: Contador e etapa inalterados, nenhum toast
result: [pending]

### 5. Dashboard ("/"): lead Novo aberto com "Follow-up", trocar para "1º contato" antes de enviar
expected: Avança com toast (tipo vivo do Select vale, não o defaultTipo)
result: [pending]

### 6. Dashboard: lead Novo, manter "Follow-up", enviar
expected: Não avança, sem toast, contador incrementa
result: [pending]

### 7. /leads: enviar "1º contato" num lead Novo (tela com vários leads visíveis)
expected: Toast com o nome correto do lead, etapa atualizada na tabela
result: [pending]

### 8. Criar lead novo (auto-gatilho de 1º contato) e fechar sem enviar
expected: Contador em 0, nada extra no card
result: [pending]

### 9. Importar CSV, em /importar/[batchId], clicar "Abrir WhatsApp" de um lead
expected: Aba abre; ao voltar a /pipeline, card mostra "1x" e lead está em Contatado
result: [pending]

### 10. Card com contador 0
expected: Nenhum ícone/número extra aparece (D-06)
result: [pending]

### 11. Card simultaneamente "Esfriando" e com contador > 0
expected: Os dois indicadores aparecem na mesma linha, sem quebra de layout, cores distintas (âmbar vs. neutro)
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0
blocked: 0

## Gaps
