---
status: partial
phase: 07-configura-o-de-dias-parado-por-etapa
source: [07-VERIFICATION.md]
started: 2026-07-31T22:40:48Z
updated: 2026-07-31T22:40:48Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Pipeline pre-save parity (visual)
expected: Com a tabela `configuracoes` no estado padrão (Contatado=5, Novo/Negociação=999999, nenhum save do admin), abrir http://localhost:3000/pipeline e confirmar que nenhum card das colunas Novo e Negociação mostra o rótulo âmbar "Esfriando" — só cards de Contatado podem aparecer destacados. Comportamento visual idêntico ao pré-deploy.
result: [pending]

### 2. Config form pre-fill (visual)
expected: Abrir http://localhost:3000/configuracoes e confirmar que o campo Contatado aparece preenchido com 5 e Novo/Negociação aparecem preenchidos com 999999 no primeiro acesso.
result: [pending]

### 3. Validation error UI (interactive)
expected: Digitar 0 (ou um valor negativo) em qualquer campo de /configuracoes e clicar em salvar — mensagem "Mínimo de 1 dia." aparece abaixo do campo; nada é persistido no banco.
result: [pending]

### 4. Save success UX (interactive)
expected: Salvar valores válidos (ex.: 2/3/4) em /configuracoes — admin permanece na tela, os campos continuam mostrando os valores salvos, e aparece o toast "Configurações salvas.".
result: [pending]

### 5. Post-save pipeline highlight (visual)
expected: Após salvar novos limites (ex.: Novo=2, Negociação=2), abrir /pipeline e confirmar que cards das colunas Novo e Negociação agora exibem o badge "Esfriando" quando aplicável, respeitando os novos limites configurados.
result: [pending]

### 6. Sidebar active state (visual)
expected: Verificar que o item "Configurações" no sidebar fica com destaque teal (`bg-[#0D9488]/10`, texto `text-[#0D9488]`) quando a rota /configuracoes está ativa.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
