---
status: complete
phase: 15-campo-interesse-servi-o-desejado-no-lead
source: [15-VERIFICATION.md, 15-01-SUMMARY.md, 15-02-SUMMARY.md]
started: 2026-08-31T00:00:00Z
updated: 2026-08-31T16:10:00Z
method: browser automation (extensão Chrome, DOM-level — janela não renderizava screenshot neste host 4GB; interações e leituras de estado via javascript_tool + verificação de verdade no data/crm.db)
---

## Current Test

[testing complete]

## Tests

### 1. Round-trip do campo "Interesse" no formulário
expected: Em `/leads` → "Novo lead" → preencher "Interesse" → salvar → reabrir o lead em edição: o valor digitado reaparece no campo.
result: pass
evidence: |
  Criado lead "Teste Interesse UAT" (id 44) com Interesse = "quer site institucional + tráfego pago".
  Campo é `<input id="interesse" name="interesse" type="text">` (linha única, NÃO textarea), visível,
  posicionado imediatamente após "Nicho" e antes de "Etapa" (D-01/D-02/D-07 confirmados).
  Toast "Lead salvo com sucesso.". `SELECT interesse FROM leads WHERE id=44` → valor exato.
  Reaberto via linha da lista → dialog "Editar lead" → campo #interesse exibe
  "quer site institucional + tráfego pago", visível.

### 2. Campo opcional não bloqueia submit
expected: Criar um lead com "Interesse" vazio conclui sem erro; editar um lead apagando o texto de "Interesse" e salvar conclui sem erro e o campo volta vazio.
result: pass
evidence: |
  (a) Editado lead id 44 apagando o texto de Interesse → salvou sem erro, dialog fechou,
      toast de sucesso. `SELECT interesse FROM leads WHERE id=44` → NULL.
  (b) Criado lead "Teste Interesse Vazio UAT" (id 45) com Interesse em branco → salvou sem
      erro de validação. `SELECT interesse FROM leads WHERE id=45` → NULL.

### 3. Limite de 500 caracteres na UI
expected: Digitar mais de 500 caracteres em "Interesse" e tentar salvar: submit bloqueado com a mensagem "O interesse deve ter no máximo 500 caracteres." abaixo do campo.
result: pass
evidence: |
  Preenchido Interesse com 501 caracteres num formulário com os demais campos válidos → submit.
  Dialog permaneceu aberto, nenhum toast de sucesso novo, mensagem
  "O interesse deve ter no máximo 500 caracteres." renderizada abaixo do campo (FieldError).
  Contagem de leads inalterada (39) — nenhum lead criado, submit efetivamente bloqueado.

### 4. Mapeamento e importação via CSV
expected: Em `/importar` → subir CSV com coluna livre (ex: "servico") → no passo de mapeamento "Interesse" aparece com opção "— nenhuma —" → mapear "servico" → "Interesse" → confirmar → o lead importado mostra o valor da coluna.
result: pass
evidence: |
  CSV `uat-interesse.csv` (3 linhas, coluna "servico"; linha 2 com 600 caracteres).
  Passo de mapeamento lista "Interesse" como campo opcional com "— nenhuma —" (truth #10 confirmado ao vivo).
  Mapeado servico → Interesse → "Ver prévia" (3 leads, 0 duplicados) → "Confirmar importação".
  Toast "3 leads importados com sucesso.". No banco:
   - Carlos (id 46): interesse = "quer loja virtual e catalogo online"
   - Mariana (id 47): length(interesse) = 500  (600 chars truncados em 500 — D-10 confirmado no fluxo real)
   - Pedro (id 48): interesse = "automacao de agendamento"
  Aberto "Carlos CSV UAT" na lista → dialog "Editar lead" → #interesse exibe o valor, visível.
  Observação: a tabela de prévia NÃO mostra a coluna "Interesse" (warning WR-02 já conhecido — não bloqueia; o valor importa correto).

### 5. Importação sem mapear "Interesse" (sem regressão)
expected: Repetir a importação sem mapear "Interesse": leads criados com `interesse` nulo, nenhuma regressão no fluxo de importação.
result: pass
evidence: |
  CSV `uat-sem-mapa.csv` (2 linhas, coluna "servico" presente mas NÃO mapeada).
  Mapeado só Nome + Telefone; Interesse deixado em "— nenhuma —".
  "Ver prévia" (2 leads) → "Confirmar importação" → toast "2 leads importados com sucesso.".
  No banco: Ana (id 49) e Bruno (id 50), ambos interesse = NULL. Fluxo idêntico ao anterior, sem erro.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Notas

- Verificação feita por automação de navegador em nível de DOM (a janela do Chrome não renderizava
  screenshots neste host de 4GB — o `next dev` com Turbopack + Chrome estoura a RAM). Cada asserção
  de comportamento foi cruzada com leitura direta de `data/crm.db` como fonte de verdade.
- Dados de teste (7 leads "*UAT*", ids 44-50) foram movidos para a Lixeira (soft-delete, `deleted_at`
  setado) — reversível; o usuário pode esvaziar a lixeira para esses itens quando quiser.
- Os 2 warnings do code review permanecem advisórios: WR-01 (interesse só-espaços grava `''`) não foi
  exercitado; WR-02 (prévia de importação não exibe a coluna interesse) foi observado ao vivo no Teste 4.
