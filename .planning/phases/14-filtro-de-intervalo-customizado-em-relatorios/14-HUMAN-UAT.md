---
status: complete
phase: 14-filtro-de-intervalo-customizado-em-relatorios
source: [14-VERIFICATION.md, 14-REVIEW.md, 14-REVIEW-FIX.md]
started: 2026-08-30T20:30:00Z
updated: 2026-08-30T23:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. 4ª opção no Select de período
expected: Abrir `/relatorios` e o `<Select>` de período mostra 4 opções — "Últimos 30 dias", "Últimos 90 dias", "Tudo", "Intervalo personalizado".
result: pass

### 2. Toggle dos date pickers
expected: Escolher "Intervalo personalizado" revela 2 campos de data rotulados "Início" e "Fim" ao lado do Select; escolher 30d/90d/tudo esconde os 2 campos.
result: pass

### 3. Recálculo com as 2 datas
expected: No modo custom, escolher início E fim válidos (ex: 01/06 a 30/08) → URL vira `?period=custom&from=2026-06-01&to=2026-08-30` sem scroll ao topo; as 3 seções (origem, nicho, motivos de perda) recalculam para o intervalo.
result: pass

### 4. Só uma data preenchida
expected: No modo custom, escolher só a data de início (fim vazia) → nada recalcula, a URL não muda para `period=custom` ainda (D-15).
result: pass

### 5. Intervalo sobrevive a refresh
expected: Carregar `/relatorios?period=custom&from=2026-06-01&to=2026-08-30` e dar F5 → o Select mostra "Intervalo personalizado" e os 2 campos vêm pré-preenchidos com 01/06/2026 e 30/08/2026 (D-16).
result: pass

### 6. Voltar a um preset remove from/to
expected: Estando num intervalo custom, escolher "Últimos 30 dias" → `from` e `to` somem da querystring; dados voltam para 30 dias (D-03).
result: pass
nota: verificado no navegador — URL virou `?period=30d`, pickers sumiram, dados recalcularam (23→1 outbound).

### 7. Fim antes do início → faixa de aviso
expected: No modo custom, informar data de fim ANTES da data de início → a página exibe a faixa âmbar "Intervalo inválido — mostrando os últimos 30 dias." e mostra dados de 30 dias (SC3 / D-07).
result: pass
nota: verificado via HTTP — `?period=custom&from=2026-08-30&to=2026-06-01` renderiza a faixa âmbar (amber-50/200/900) e dados de 30 dias.

### 8. Data futura no Fim → clamp para hoje
expected: No modo custom, informar fim = 01/01/2099 (início válido no passado) → o relatório trata o fim como "até hoje", SEM faixa de erro, dados até hoje (D-06).
result: pass
nota: verificado via HTTP — `?period=custom&from=2026-06-01&to=2099-01-01` renderiza SEM faixa de aviso.

### 9. WR-01 corrigido — as duas datas no futuro caem no fallback
expected: No modo custom, informar início E fim ambos no futuro (ex: 01/01/2027 a 01/06/2027) → a página exibe a faixa âmbar "Intervalo inválido — mostrando os últimos 30 dias." e mostra dados de 30 dias. (Antes do fix resolvia para "só hoje" sem faixa; agora alinhado a D-06 — clamp apara só o `to`, o gate `start > end` captura o `from` futuro.)
result: pass
nota: verificado via HTTP — `?period=custom&from=2027-01-01&to=2027-06-01` renderiza a faixa âmbar + 30 dias. Fix WR-01 confirmado.

### 10. CR-01 corrigido — navegação soft (voltar/avançar)
expected: Estando em `/relatorios?period=custom&from=2026-06-01&to=2026-08-30`, trocar para preset "Últimos 30 dias", depois clicar VOLTAR no navegador → o Select mostra "Intervalo personalizado" E os 2 date pickers renderizam pré-preenchidos com 01/06/2026 e 30/08/2026 (sem precisar de F5). Clicar AVANÇAR volta para o preset 30d limpo.
result: pass
nota: verificado no navegador — após VOLTAR, Select = "Intervalo personalizado", os 2 pickers renderizaram pré-preenchidos (01/06/2026, 30/08/2026), dados = intervalo custom (23 outbound). AVANÇAR voltou para `?period=30d` limpo. Fix CR-01 confirmado.

### 11. WR-02 corrigido — desmarcar um date picker não navega com data velha
expected: No modo custom com início E fim já preenchidos (relatório recalculado), abrir o calendário do "Início" e clicar de novo no dia já selecionado para desmarcá-lo → o botão volta a "Selecionar", e o relatório NÃO navega/recalcula com a data antiga (só recalcula de novo quando você escolher uma data válida).
result: pass
nota: verificado no navegador — ao desmarcar 01/06 no calendário do Início, o botão voltou a "Selecionar" e a URL permaneceu `?period=custom&from=2026-06-01&to=2026-08-30` (não navegou com a data velha). Fix WR-02 confirmado.

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Observações (não-bloqueantes)

- O calendário do "Início" abre no mês corrente (agosto/2026) em vez de pular para o mês
  da data selecionada (junho/2026). A data selecionada está correta ao navegar até o mês.
  Polimento de UX menor — não estava na revisão, não bloqueia o fechamento.

## Gaps

[nenhum]
