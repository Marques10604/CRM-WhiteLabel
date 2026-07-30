---
status: partial
phase: 05-notas-enriquecidas-na-importa-o-csv
source: [05-VERIFICATION.md]
started: 2026-07-30T00:54:00Z
updated: 2026-07-30T01:40:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Percurso completo do wizard com o CSV real do cowork (7 passos)
expected: Abrir `http://localhost:3000/importar`, subir um CSV com colunas `nome, score, telefone, sinal_dor, trecho_dor, observacao`, mapear só Nome/Telefone, marcar `score` e `trecho_dor` fora de ordem, conferir o resumo ao vivo "Serão concatenadas: score → trecho_dor", avançar para a prévia e conferir a coluna Notas (com "score: N" e "trecho_dor: ..." em linhas separadas, sem "Importado via CSV." misturado), voltar ao mapeamento e conferir que os checkboxes continuam marcados, mapear Notas 1-pra-1 para `observacao` e conferir que ele some da lista de checkboxes, repetir com um CSV simples (nome+telefone+observacao, sem extras) e confirmar que importa sem interação nova, e confirmar que a seção some quando todas as colunas do CSV estão mapeadas em campos fixos.
result: PASSOU (parcial) — testado com gsd-browser nesta sessão contra o dev server real: upload, mapeamento de Nome/Telefone, seção de colunas extras, resumo ao vivo fora-de-ordem ("score → trecho_dor", ordem do arquivo), prévia com Notas em linhas separadas sem "Importado via CSV." misturado, e persistência do "Voltar" — todos confirmados. NÃO testado ainda: mapear Notas 1-pra-1 removendo da lista, CSV simples sem extras, seção sumindo por completo quando tudo mapeado. Ver `05-VERIFICATION.md` Addendum 2 para detalhes e screenshots.

### 2. Confirmar visualmente a correção do WR-01 (commit c64d568)
expected: No passo de mapeamento, marcar uma coluna extra (ex: `score`) e depois mudar o Select de outro campo fixo (ex: "Origem") para apontar para essa mesma coluna `score`. O checkbox de `score` deve sumir da lista E o texto "Serão concatenadas: ..." deve parar de citar `score` no mesmo instante.
result: PASSOU — confirmado com gsd-browser nesta sessão: checkbox some E resumo atualiza para "Serão concatenadas: trecho_dor" no mesmo instante, sem defasagem.

### 3. Notas em linhas separadas na prévia (achado novo, não estava na lista original)
expected: A coluna Notas na tabela de prévia deve mostrar cada coluna extra concatenada em sua própria linha visual, não tudo corrido num texto só.
result: FALHOU → CORRIGIDO — encontrado durante o teste real do item 1: o `<td>` padrão (`whitespace-nowrap`) colapsava as quebras de linha reais que `buildNotasText` já produzia corretamente. Corrigido em `src/components/csv-import-preview-table.tsx` (commit `5dcfba6`, `whitespace-pre-line` no cell renderer da coluna Notas). Confirmado por screenshot antes/depois.

## Summary

total: 3
passed: 2
issues: 0 (1 encontrado e corrigido na mesma sessão)
pending: 1 (item 1 parcial — 3 sub-cenários específicos ainda não clicados)
skipped: 0
blocked: 0

## Gaps
