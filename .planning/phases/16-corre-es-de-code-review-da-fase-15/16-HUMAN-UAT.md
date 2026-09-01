---
status: partial
phase: 16-corre-es-de-code-review-da-fase-15
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-REVIEW.md, 16-REVIEW-FIX.md]
started: 2026-09-01T00:00:00Z
updated: 2026-09-01T00:00:00Z
method: browser automation (extensão Claude no Chrome contra dev server localhost:3000 + data/crm.db real; screenshots intermitentes por pressão de RAM no host 4GB, leituras via read_page/get_page_text). Sessão interrompida por limite de uso (janela 5h) durante o cenário 1 — os cenários de CSV (o coração da fase) foram concluídos antes.
---

## Current Test

[cenários 3, 4 e o edge case do CR-01 concluídos e aprovados ao vivo; cenários 1, 2, 5 parcialmente cobertos — ver abaixo]

## Tests

### 1. Round-trip do campo "Interesse" no formulário de lead
expected: Em `/leads` → "Novo lead" → preencher "Interesse" → salvar → reabrir em edição: o valor reaparece.
result: not_run (bloqueio de ferramenta, não defeito)
evidence: |
  O campo "Interesse" existe no formulário, na posição correta (após "Nicho", antes de "Etapa"),
  como `<input>` de linha única com placeholder "Ex: quer site, automação de WhatsApp, tráfego pago..."
  e texto de ajuda "O que esse lead quer — serviço ou ajuda que ele procura. Opcional."
  (confirmado via read_page). O `form_input` da automação não dispara o onChange do react-hook-form
  neste formulário e o diálogo fechou antes de completar o create→reabrir→editar→limpar.
  Cobertura equivalente: `test-lead-actions.cjs` Casos 14a (createLead grava NULL p/ só-espaços),
  14b (updateLead limpando → NULL) e 20 (emoji ponta-a-ponta) — todos exit 0.

### 2. Campo opcional "Interesse" não bloqueia o submit
expected: Submeter o formulário com "Interesse" vazio / só espaços não gera erro de validação nesse campo.
result: pass
evidence: |
  "Novo lead" → clicar "Salvar" com o formulário em branco: TODOS os campos obrigatórios
  (Nome, Telefone, Canal, Origem, Tipo de origem, Valor estimado, Notas) exibiram alerta
  "... é obrigatório". O campo "Interesse" NÃO exibiu alerta nenhum — vazio é aceito.
  (WR-01 da Fase 16 garante que só-espaços grava NULL; coberto pelos Casos 14a/14b/20 do harness.)

### 3. Coluna "Interesse" na prévia da importação de CSV (WR-02 / FIX-02)
expected: `/importar` → subir CSV com coluna livre → mapear para "Interesse" → na prévia existe a coluna "Interesse" com o valor de cada linha; linha sem valor mostra "—".
result: pass
evidence: |
  CSV `uat-fase16-interesse.csv` (5 linhas; coluna `servico_desejado`). Mapeamento: nome→Nome,
  telefone→Telefone, nicho→Nicho, servico_desejado→Interesse. "Ver prévia".
  A tabela de prévia mostra a coluna "Interesse" entre "Notas" e "Status", com:
   - Ana ("quer site institucional + gestão de tráfego pago") → valor exato exibido
   - Bruno (célula vazia no CSV) → "—"
   - Carla / Diego / Elis → valores exibidos (ver cenário 4)
  Banner "5 leads no arquivo · 0 duplicados · 4 nichos novos · 0 sem nicho · 0 telefone inválido".

### 4. Badge de truncamento em 500 na célula da prévia (D-05 / D-06)
expected: Uma célula com mais de 500 code points mostra o valor cortado E um badge amarelo "Cortado em 500 caracteres" na própria célula.
result: pass
evidence: |
  - Carla: `servico_desejado` = 600 "x" (ASCII). Prévia: valor truncado + badge amarelo
    "⚠ Cortado em 500 caracteres" logo abaixo, na célula. ✓
  - Elis: `servico_desejado` = 600 "🔥" (emoji, caractere astral). Prévia: valor truncado
    por code point + badge amarelo "Cortado em 500 caracteres". ✓ (WR-01 da Fase 16: badge
    dispara por `interesseTruncado` de `mapCsvRows`, não por `String.length` — funciona com
    caractere astral).

### 4b. Edge case CR-01 — célula `interesse` cheia de emoji NÃO aborta o lote
expected: Uma célula com ~350 caracteres astrais (700 code units, ≤ 500 code points) importa
  normalmente — não é truncada, não mostra badge, e NÃO reprova o `csvRowSchema` a ponto de
  abortar a importação inteira.
result: pass
evidence: |
  Diego: `servico_desejado` = 350 "😀" (350 code points = 700 code units UTF-16).
  Prévia: valor exibido POR INTEIRO, SEM badge de truncamento, linha aceita.
  Banner confirma "5 leads no arquivo" e "0 telefone inválido" — nenhuma linha rejeitada,
  o lote NÃO foi abortado. Com o código pré-CR-01 (`.max(500)` em code units) esta linha
  faria `safeParse` falhar e `bulkImportLeads` retornaria `{ success: false }` para o lote
  inteiro. O fix `3bec2f6` (`.refine(Array.from(v).length <= 500)`) elimina esse caminho —
  confirmado ao vivo.

### 5. Importação sem mapear "Interesse" (sem regressão)
expected: Repetir sem mapear "Interesse": leads criados com `interesse` NULL, nenhuma regressão.
result: not_run (sessão interrompida por limite de uso)
evidence: |
  Não executado ao vivo. Caminho de código idêntico ao da célula vazia do cenário 3
  (Bruno → "—" na prévia; unmapped e vazio produzem ambos `""` em `mapCsvRows`, que vira
  `?? null` no insert de `bulkImportLeads`). Coberto pelo caso automatizado
  "bulkImportLeads(sem interesse): linha persistida com interesse NULL" (`test-lead-actions.cjs`, exit 0).

## Notas

- A importação NÃO foi confirmada ("Confirmar importação" não clicado) de propósito — evita
  poluir o `data/crm.db` real com 5 leads de teste + 4 nichos novos. A prévia é a entrega
  visível da Fase 16 e foi 100% verificada.
- Screenshots do host 4GB falharam de forma intermitente (renderer sob pressão de RAM);
  as verificações que valem foram feitas via `get_page_text` (conteúdo textual completo da
  tabela de prévia, incluindo os badges).
- Sessão atingiu o limite de uso (janela 5h) durante o cenário 1. Os cenários que exercem
  a UI NOVA da fase (3, 4, 4b) foram concluídos antes e passaram.

## Veredito

Os 3 achados que a Fase 16 tornou visíveis na UI (coluna Interesse na prévia, badge de
truncamento, edge case do CR-01 com emoji) estão **verificados ao vivo e aprovados**. Os
cenários de formulário (1, 2, 5) estão cobertos por testes automatizados (`test-lead-actions.cjs`
Casos 14a/14b/19/20, todos exit 0) e o cenário 2 foi confirmado ao vivo. Recomendação:
tratar como UAT suficiente para fechar a fase — a rede de validação real (SC#5) já está verde
e o code review + fix fecharam o débito.
