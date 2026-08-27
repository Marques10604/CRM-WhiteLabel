---
status: partial
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
source: [11-VERIFICATION.md]
started: 2026-08-27T00:00:00Z
updated: 2026-08-27T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Render de /relatorios sem ?period
expected: 3 seções empilhadas em cards brancos com borda; seletor mostra "Últimos 30 dias"; h1 "Relatórios" e seletor na mesma linha
result: [pending]

### 2. Seção "Leads por origem" com dados reais (23 outbound ativos, 0 inbound)
expected: DUAS linhas sempre presentes (Inbound com 0 e Outbound); coluna Taxa de conversão mostra "0%" quando total 0, NUNCA "NaN%"; ênfase da taxa por peso da fonte, não por cor
result: [pending]

### 3. Trocar o seletor de período para "Últimos 90 dias" e depois "Tudo"
expected: URL vira ?period=90d / ?period=tudo; os números das 3 seções atualizam de forma consistente; a página NÃO rola ao topo (scroll: false)
result: [pending]

### 4. Acessar /relatorios?period=xyz (preset inválido)
expected: Página carrega normalmente (sem 500), recorte "Tudo" aplicado, seletor mostra "Tudo"
result: [pending]

### 5. No /pipeline, arrastar um lead para a coluna "Perdido"
expected: Modal "Mover para Perdido" abre; NÃO tem botão X nem "Pular"; clicar fora / Esc não fecham; "Cancelar" reverte o card à etapa anterior sem persistir; escolher/criar um motivo e "Salvar motivo" persiste
result: [pending]

### 6. No combobox de motivo de perda, digitar um nome novo e selecionar 'Criar "..."'
expected: Linha de ação em teal com ícone +; ao selecionar, cria o motivo e já o deixa selecionado; erro mantém o popup aberto
result: [pending]

### 7. Após mover um lead para "Perdido" com motivo "Preço", voltar a /relatorios (Tudo)
expected: Seção 3 "Motivos de perda" mostra a linha "Preço" com contagem 1 (hoje a seção nasce vazia: "Nenhum lead perdido neste período.")
result: [pending]

### 8. Menu lateral
expected: Item "Relatórios" (ícone BarChart3) entre "Pipeline" e "Templates"; item "Motivos de Perda" (ícone ListX) após "Sub-nichos"; ambos ficam teal quando ativos
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

### WARNING 1 — `scripts/verify-motivos-perda-schema.cjs` nunca criado
Declarado em 11-01-PLAN must_haves, Task 3 acceptance e 11-VALIDATION.md. A cobertura foi "folded" em `verify-schema.cjs`, que só checa presença de tabela/índice/coluna — não FK, colunas exatas, 6 seeds, nullability nem órfãos. O verificador conferiu esses fatos manualmente contra o banco real e todos passam; falta apenas a detecção automática de regressão. Candidato a gap-closure ou override documentado.

### WARNING 2 — Drift FK schema↔banco
`leads.motivo_perda_id` está com `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` em `schema.ts` (a DDL da migração omitiu `ON DELETE RESTRICT`). Segunda barreira anti-remoção-destrutiva inativa; a primária (`guard-no-hard-delete`) está verde e hoje há 0 referências. Candidato a gap-closure (regenerar a FK com a cláusula correta).
