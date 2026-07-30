---
status: partial
phase: 05-notas-enriquecidas-na-importa-o-csv
source: [05-VERIFICATION.md]
started: 2026-07-30T00:54:00Z
updated: 2026-07-30T00:54:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Percurso completo do wizard com o CSV real do cowork (7 passos)
expected: Abrir `http://localhost:3000/importar`, subir um CSV com colunas `nome, score, telefone, sinal_dor, trecho_dor, observacao`, mapear só Nome/Telefone, marcar `score` e `trecho_dor` fora de ordem, conferir o resumo ao vivo "Serão concatenadas: score → trecho_dor", avançar para a prévia e conferir a coluna Notas (com "score: N" e "trecho_dor: ..." em linhas separadas, sem "Importado via CSV." misturado), voltar ao mapeamento e conferir que os checkboxes continuam marcados, mapear Notas 1-pra-1 para `observacao` e conferir que ele some da lista de checkboxes, repetir com um CSV simples (nome+telefone+observacao, sem extras) e confirmar que importa sem interação nova, e confirmar que a seção some quando todas as colunas do CSV estão mapeadas em campos fixos.
result: [pending]

### 2. Confirmar visualmente a correção do WR-01 (commit c64d568)
expected: No passo de mapeamento, marcar uma coluna extra (ex: `score`) e depois mudar o Select de outro campo fixo (ex: "Origem") para apontar para essa mesma coluna `score`. O checkbox de `score` deve sumir da lista E o texto "Serão concatenadas: ..." deve parar de citar `score` no mesmo instante — fix já aplicado e verificado estaticamente (tsc/eslint/build/harness), falta só confirmação visual.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
