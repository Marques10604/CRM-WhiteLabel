---
status: partial
phase: 01-lead-sub-nicho-foundation
source: [01-SPEC.md, 01-02-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-09-02T00:00:00Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 20
method: "browser automation (extensão Claude no Chrome) contra dev server localhost:3000 + data/crm.db real"
audit: "Fase 18 — AUDIT-01 (auditoria retroativa; Fase 1 nunca teve /gsd-verify-work formal)"
---

## Current Test

[nenhum executado ainda — 01-HUMAN-UAT.md autorado no plano 18-01 Task 1; CRUD executado em 18-01 Tasks 2-3; lista/toolbar/paginação em 18-02]

## Tests

### CRUD de lead

### 1. Criar lead com os 9 campos preenchidos
expected: Em `/leads` → "Novo lead" → preencher nome, telefone, canal, origem, tipo de origem, valor estimado, notas, follow-up, nicho, etapa → "Salvar": o modal fecha, toast de sucesso, e a linha aparece em `/leads`. (01-SPEC AC#1)
result: [pending]

### 2. Campo obrigatório vazio bloqueia o submit
expected: "Novo lead" → deixar um campo obrigatório vazio (ex: Nome) e "Salvar": erro inline no campo ("... é obrigatório"), o modal permanece aberto, nada persiste no banco. (01-SPEC AC#1)
result: [pending]

### 3. Editar lead pela linha da lista
expected: Clicar no botão "Editar" de uma linha → modal "Editar lead" reabre pré-preenchido com os valores atuais; alterar um campo e "Salvar" → a linha na lista reflete a mudança. (01-02-SUMMARY)
result: [pending]

### 4. Fechar o modal com alteração não salva → aviso de descarte
expected: Abrir "Editar lead", alterar um campo, tentar fechar (X / Esc / clique fora) → aparece confirmação "Descartar alterações?" com "Continuar editando" e "Descartar". "Continuar editando" mantém o modal; "Descartar" fecha sem salvar. (01-02-SUMMARY, D-04)
result: [pending]

### 5. Contrato valor/telefone (parsing)
expected: Criar lead digitando "1.234,56" em Valor estimado e "(11) 91234-5678" em Telefone → no `data/crm.db` o lead grava `valor_estimado = 123456` (centavos) e `telefone` normalizado (só dígitos, com DDI 55). Verificar por query direta. (01-02-SUMMARY — parseBRLToCents + normalizePhone)
result: [pending]

### 6. Soft-delete de lead com confirmação
expected: Botão "Excluir" numa linha → modal de confirmação nomeando o lead → "Confirmar": some de `/leads`, aparece em `/lixeira` com coluna "Excluído em". "Cancelar" no modal deixa o lead na lista ativa. (01-SPEC AC#5, 01-04-SUMMARY)
result: [pending]

### 7. Restaurar da Lixeira
expected: Em `/lixeira` → botão "Restaurar" num lead soft-deletado → volta para `/leads`, some da Lixeira. Ação instantânea, sem modal de confirmação. (01-SPEC AC#6, 01-04-SUMMARY)
result: [pending]

### CRUD de nicho + dedupe

### 8. Criar nicho novo
expected: Em `/nichos` → criar um nicho com nome novo → aparece na lista de `/nichos` e fica selecionável no combobox de nicho do form "Novo lead". (01-SPEC AC#2)
result: [pending]

### 9. Dedupe case-insensitive rejeitado
expected: Criar um nicho cujo nome bate (ignorando caixa e espaços nas pontas) com um já existente → rejeitado com erro inline. Capturar a mensagem literal. (01-SPEC AC#3)
result: [pending]

### 10. Near-duplicate permitido
expected: Criar "UAT18 Nic" quando "UAT18 Nicho" já existe → aceito (grafias diferentes não são bloqueadas — só match exato case/space-insensitive). (01-SPEC AC#3)
result: [pending]

### 11. Renomear nicho inline
expected: Ícone de lápis numa linha de `/nichos` → editar o nome inline → "Salvar" → o nome atualiza na lista. Sem controle de delete/deactivate visível originalmente (soft-delete veio na quick 260725-lai). (01-SPEC AC#2, 01-04-SUMMARY)
result: [pending]

### 12. Soft-delete de nicho + reativação por nome
expected: Remover (soft-delete) um nicho de teste → some das superfícies de seleção (combobox do form "Novo lead" + filtro de nicho da toolbar de `/leads`), mas continua no banco. Recriar um nicho com exatamente o mesmo nome → reativa o registro existente (não cria linha duplicada — verificar por query que só há 1 linha com esse nome). (quick 260725-lai, 01-04-SUMMARY)
result: [pending]

### Lista / toolbar / paginação (executados no plano 18-02)

### 13. Ordenação default por follow-up
expected: `/leads` sem nenhum filtro → a primeira linha é o lead com follow-up mais próximo (ascendente). (01-SPEC AC#8)
result: [pending]

### 14. Ordenação por cabeçalho de coluna
expected: Clicar no cabeçalho "Nome" / "Nicho" / "Etapa" / "Follow-up" alterna asc↔desc a cada clique. Clicar em "Telefone" não ordena (coluna sem sort). (01-SPEC, 01-01-SUMMARY)
result: [pending]

### 15. Filtro por nicho (single-select)
expected: Toolbar → selecionar um nicho → a lista mostra só leads daquele nicho. (01-SPEC AC#7)
result: [pending]

### 16. Filtro por etapa (single-select)
expected: Toolbar → selecionar uma etapa → a lista mostra só leads naquela etapa. (01-SPEC AC#7)
result: [pending]

### 17. Filtro por intervalo de follow-up
expected: Toolbar → definir data de início e fim → a lista mostra só leads com follow-up dentro do intervalo, inclusivo nas duas pontas. (01-SPEC AC#7)
result: [pending]

### 18. Filtros combinados (AND)
expected: Nicho + etapa selecionados ao mesmo tempo → a lista mostra a interseção (só leads que batem os dois). (01-SPEC AC#7)
result: [pending]

### 19. "Limpar filtros"
expected: Com filtros aplicados → botão "Limpar filtros" → todos os leads voltam e a ordenação volta ao default (follow-up asc). (01-SPEC, 01-01-SUMMARY)
result: [pending]

### 20. Paginação
expected: Com >25 leads ativos → rodapé "Página 1 de N"; "Anterior" desabilitado na página 1, "Próximo" desabilitado na última; trocar um filtro volta para a página 1. (01-01-SUMMARY)
result: [pending]

## Summary

- Total: 20
- Passed: 0
- Issues: 0
- Pending: 20
- Skipped: 0
- Blocked: 0

## Issues Encontradas

(nenhuma ainda)

## Gaps

(preencher ao fim — cenários skipped/blocked e o porquê)
