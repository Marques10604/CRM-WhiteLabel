---
status: partial
phase: 14-filtro-de-intervalo-customizado-em-relatorios
source: [14-VERIFICATION.md, 14-REVIEW.md]
started: 2026-08-30T20:30:00Z
updated: 2026-08-30T20:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 4ª opção no Select de período
expected: Abrir `/relatorios` e o `<Select>` de período mostra 4 opções — "Últimos 30 dias", "Últimos 90 dias", "Tudo", "Intervalo personalizado".
result: [pending]

### 2. Toggle dos date pickers
expected: Escolher "Intervalo personalizado" revela 2 campos de data rotulados "Início" e "Fim" ao lado do Select; escolher 30d/90d/tudo esconde os 2 campos.
result: [pending]

### 3. Recálculo com as 2 datas
expected: No modo custom, escolher início E fim válidos (ex: 01/06 a 30/08) → URL vira `?period=custom&from=2026-06-01&to=2026-08-30` sem scroll ao topo; as 3 seções (origem, nicho, motivos de perda) recalculam para o intervalo.
result: [pending]

### 4. Só uma data preenchida
expected: No modo custom, escolher só a data de início (fim vazia) → nada recalcula, a URL não muda para `period=custom` ainda (D-15).
result: [pending]

### 5. Intervalo sobrevive a refresh
expected: Carregar `/relatorios?period=custom&from=2026-06-01&to=2026-08-30` e dar F5 → o Select mostra "Intervalo personalizado" e os 2 campos vêm pré-preenchidos com 01/06/2026 e 30/08/2026 (D-16).
result: [pending]

### 6. Voltar a um preset remove from/to
expected: Estando num intervalo custom, escolher "Últimos 30 dias" → `from` e `to` somem da querystring; dados voltam para 30 dias (D-03).
result: [pending]

### 7. Fim antes do início → faixa de aviso
expected: No modo custom, informar data de fim ANTES da data de início → a página exibe a faixa âmbar "Intervalo inválido — mostrando os últimos 30 dias." e mostra dados de 30 dias (SC3 / D-07).
result: [pending]

### 8. Data futura no Fim → clamp para hoje
expected: No modo custom, informar fim = 01/01/2099 (início válido no passado) → o relatório trata o fim como "até hoje", SEM faixa de erro, dados até hoje (D-06).
result: [pending]

### 9. DECISÃO HUMANA (WR-01) — as duas datas no futuro
expected: Informar início E fim ambos no futuro (ex: 01/01/2027 a 01/06/2027). Comportamento atual: resolve para "só o dia de hoje", preset custom, SEM faixa de aviso. `14-CONTEXT §D-06` diz que intervalo inteiro no futuro deveria cair no fallback 30d + faixa; `14-01-PLAN` linha 101 manda aparar `from` também (o que o código faz). **Plano e contexto se contradizem — decidir qual vale e alinhar o código.**
result: [pending]

### 10. DECISÃO HUMANA (CR-01) — navegação soft (voltar/avançar)
expected: Estando em `?period=custom&from&to`, trocar para preset "30d", depois clicar VOLTAR no navegador. Comportamento atual: o Select mostra "Intervalo personalizado" (deriva de `value`) mas os 2 date pickers NÃO renderizam (o gate `customMode` local só inicializa no 1º mount). Refresh (F5) funciona; navegação soft não. **Decidir se bloqueia o fechamento da fase (fix agora) ou vira débito registrado.**
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
