---
status: complete
phase: 16-corre-es-de-code-review-da-fase-15
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-REVIEW.md, 16-REVIEW-FIX.md]
started: 2026-09-01T00:00:00Z
updated: 2026-09-01T00:00:00Z
issues: 0
pending: 0
method: browser automation (extensão Claude no Chrome contra dev server localhost:3000 + data/crm.db real; screenshots intermitentes por pressão de RAM no host 4GB, leituras via read_page/get_page_text). Cenários de CSV (a UI nova da fase) concluídos ao vivo; cenários de formulário (1, 5) aceitos pelo humano como cobertos por teste automatizado + UAT ao vivo da Fase 15.
---

## Current Test

[testing complete — 4 cenários aprovados ao vivo, 2 aceitos como cobertos por automação]

## Tests

### 1. Round-trip do campo "Interesse" no formulário de lead
expected: Em `/leads` → "Novo lead" → preencher "Interesse" → salvar → reabrir em edição: o valor reaparece.
result: skipped
evidence: |
  Não re-executado ao vivo nesta fase. O campo "Interesse" existe no formulário na posição
  correta (após "Nicho", antes de "Etapa"), como `<input>` de linha única com placeholder e
  texto de ajuda corretos (confirmado via read_page). O `form_input` da automação não dispara
  o onChange do react-hook-form neste formulário.
  Cobertura: (a) a Fase 15 verificou este exato round-trip AO VIVO (15-HUMAN-UAT.md cenário 1,
  `result: pass`, lead id 44) — a Fase 16 só mudou ONDE o trim roda dentro do preprocess, não
  o fluxo salvar/reabrir; (b) `test-lead-actions.cjs` Casos 14a (createLead → NULL p/ só-espaços),
  14b (updateLead limpando → NULL), 20 (emoji ponta-a-ponta) — todos exit 0.

### 2. Campo opcional "Interesse" não bloqueia o submit
expected: Submeter o formulário com "Interesse" vazio / só espaços não gera erro de validação nesse campo.
result: pass
evidence: |
  "Novo lead" → "Salvar" com o formulário em branco: TODOS os campos obrigatórios exibiram
  "... é obrigatório". O campo "Interesse" NÃO exibiu alerta nenhum — vazio é aceito.
  (WR-01 da Fase 16 garante que só-espaços grava NULL; Casos 14a/14b/20 do harness.)

### 3. Coluna "Interesse" na prévia da importação de CSV (WR-02 / FIX-02)
expected: `/importar` → CSV com coluna livre → mapear para "Interesse" → na prévia existe a coluna "Interesse" com o valor de cada linha; linha sem valor mostra "—".
result: pass
evidence: |
  CSV `uat-fase16-interesse.csv` (5 linhas; coluna `servico_desejado`). Mapeamento
  nome/telefone/nicho/servico_desejado→Interesse → "Ver prévia".
  A tabela de prévia mostra a coluna "Interesse" entre "Notas" e "Status":
   - Ana ("quer site institucional + gestão de tráfego pago") → valor exato exibido
   - Bruno (célula vazia no CSV) → "—"
  Banner "5 leads no arquivo · 0 duplicados · 4 nichos novos · 0 sem nicho · 0 telefone inválido".

### 4. Badge de truncamento em 500 na célula da prévia (D-05 / D-06)
expected: Célula com mais de 500 code points mostra o valor cortado E um badge amarelo "Cortado em 500 caracteres" na própria célula.
result: pass
evidence: |
  - Carla: 600 "x" (ASCII) → valor truncado + badge amarelo "⚠ Cortado em 500 caracteres" na célula. ✓
  - Elis: 600 "🔥" (emoji astral) → valor truncado por code point + badge "Cortado em 500 caracteres". ✓
    (WR-01: badge dispara por `interesseTruncado` de `mapCsvRows`, não por `String.length` — funciona com astral).

### 4b. Edge case CR-01 — célula `interesse` cheia de emoji NÃO aborta o lote
expected: Célula com ~350 caracteres astrais (700 code units, ≤ 500 code points) importa normalmente —
  não truncada, sem badge, e sem reprovar o `csvRowSchema` a ponto de abortar a importação inteira.
result: pass
evidence: |
  Diego: 350 "😀" (350 code points = 700 code units UTF-16). Prévia: valor exibido POR INTEIRO,
  SEM badge, linha aceita. Banner confirma "5 leads no arquivo" / "0 telefone inválido" — nenhuma
  linha rejeitada, lote NÃO abortado. Com o código pré-CR-01 (`.max(500)` em code units) esta linha
  faria `safeParse` falhar → `bulkImportLeads` retornaria `{ success: false }` p/ o lote inteiro.
  Fix `3bec2f6` (`.refine(Array.from(v).length <= 500)`) elimina o caminho — confirmado ao vivo.

### 5. Importação sem mapear "Interesse" (sem regressão)
expected: Repetir sem mapear "Interesse": leads criados com `interesse` NULL, nenhuma regressão.
result: skipped
evidence: |
  Não executado ao vivo (sessão atingiu limite de uso da janela 5h). Caminho de código idêntico
  ao da célula vazia do cenário 3 (Bruno → "—"; unmapped e vazio produzem ambos `""` em
  `mapCsvRows` → `?? null` no insert). Coberto pelo caso automatizado
  "bulkImportLeads(sem interesse): linha persistida com interesse NULL" (`test-lead-actions.cjs`, exit 0).

## Notas

- A importação NÃO foi confirmada de propósito — evita poluir o `data/crm.db` real com 5 leads
  de teste + 4 nichos. A prévia é a entrega visível da Fase 16 e foi 100% verificada.
- Cenários 1 e 5 marcados `skipped` — aceitos pelo humano no fechamento como cobertos por
  teste automatizado (Casos 14a/14b/20 + `bulkImportLeads` sem interesse) e, no caso do
  round-trip, pelo UAT ao vivo da Fase 15 (mesmo campo, mudança de código mínima).

## Veredito

Os 3 achados que a Fase 16 tornou visíveis na UI (coluna Interesse na prévia, badge de
truncamento, edge case do CR-01 com emoji) estão verificados ao vivo e aprovados. Os cenários
de formulário (1, 5) estão cobertos por automação e aceitos pelo humano. UAT suficiente para
fechar — a rede de validação real (SC#5) está verde e o code review + fix quitaram o débito.
