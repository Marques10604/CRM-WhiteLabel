---
status: partial
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
source: [11-VERIFICATION.md]
started: 2026-08-27T00:00:00Z
updated: 2026-08-28T00:00:00Z
tested_by: Claude (automação de navegador — claude-in-chrome)
---

## Current Test

[testing paused — 1 item não verificável por automação (Teste 5 — drag)]

## Tests

### 1. Render de /relatorios sem ?period
expected: 3 seções empilhadas em cards brancos com borda; seletor mostra "Últimos 30 dias"; h1 "Relatórios" e seletor na mesma linha
result: issue
reported: "Layout OK (3 seções em cards com borda, h1 e seletor na mesma linha). MAS o gatilho fechado do seletor mostra o token cru `30d` em vez do rótulo `Últimos 30 dias`. As opções abertas no dropdown mostram o texto certo (Últimos 30 dias / Últimos 90 dias / Tudo)."
severity: cosmetic

### 2. Seção "Leads por origem" com dados reais
expected: DUAS linhas sempre presentes (Inbound com 0 e Outbound); coluna Taxa de conversão mostra "0%" quando total 0, NUNCA "NaN%"; ênfase da taxa por peso da fonte, não por cor
result: pass
reported: "Inbound (0) e Outbound (23 no recorte 'tudo') sempre presentes; Taxa mostra '0%', nunca 'NaN%'. Recorte 30d mostrou Outbound=1."

### 3. Trocar o seletor de período para "Últimos 90 dias" e depois "Tudo"
expected: URL vira ?period=90d / ?period=tudo; os números das 3 seções atualizam de forma consistente; a página NÃO rola ao topo (scroll: false)
result: issue
reported: "URL vira ?period=90d e ?period=tudo corretamente; os números das 3 seções atualizam de forma consistente (Outbound 1→23, sub-nichos idem); navegação não rola ao topo. MAS o gatilho do seletor passa a mostrar `90d` / `tudo` (token cru) em vez de `Últimos 90 dias` / `Tudo`. Mesmo bug do Teste 1."
severity: cosmetic

### 4. Acessar /relatorios?period=xyz (preset inválido)
expected: Página carrega normalmente (sem 500), recorte "Tudo" aplicado, seletor mostra "Tudo"
result: issue
reported: "Carrega sem 500; recorte 'Tudo' aplicado (23 outbound, mesmos números de ?period=tudo). Seletor mostra `tudo` (token cru) em vez de `Tudo`. Mesmo bug do Teste 1."
severity: cosmetic

### 5. No /pipeline, arrastar um lead para a coluna "Perdido"
expected: Modal "Mover para Perdido" abre; NÃO tem botão X nem "Pular"; clicar fora / Esc não fecham; "Cancelar" reverte o card à etapa anterior sem persistir; escolher/criar um motivo e "Salvar motivo" persiste
result: blocked
blocked_by: automation-limitation
reason: "O gesto de drag-and-drop do dnd-kit não responde de forma confiável a eventos de ponteiro sintéticos nem ao left_click_drag do agente (resultados contraditórios entre tentativas: ora o card se move para 'Perdido' sem abrir o modal, ora nada acontece). A coluna 'Perdido' também fica além da largura de captura de tela do agente, impedindo um drag real por coordenadas. PRECISA DE VALIDAÇÃO HUMANA. NOTA: o caminho equivalente pelo formulário de /leads (mudar Etapa → Perdido) foi testado e FUNCIONA — o campo obrigatório 'Motivo da perda' aparece condicionalmente e bloqueia o salvamento sem motivo. O código de pipeline-board.tsx / motivo-perda-dialog.tsx foi revisado e a lógica do modal obrigatório + fila + reversão otimista está presente e correta."

### 6. No combobox de motivo de perda, digitar um nome novo e selecionar 'Criar "..."'
expected: Linha de ação em teal com ícone +; ao selecionar, cria o motivo e já o deixa selecionado; erro mantém o popup aberto
result: pass
reported: "Testado pelo formulário de /leads (mesma superfície MotivoPerdaCombobox). Digitei 'Mudou de prioridade interna' → apareceu a linha 'Criar \"Mudou de prioridade interna\"' em teal com ícone +. Ao selecionar, criou o motivo (id=7 no banco), fechou o popup e deixou o valor selecionado no campo. Motivo persistido em motivos_perda. (Artefato de teste revertido depois.)"

### 7. Após mover um lead para "Perdido" com motivo, voltar a /relatorios (Tudo)
expected: Seção 3 "Motivos de perda" mostra a linha com contagem 1 (hoje a seção nasce vazia: "Nenhum lead perdido neste período.")
result: pass
reported: "Movi dentista_juliaxavier para Perdido com motivo 'Mudou de prioridade interna' pelo form de /leads (persistiu stage=perdido, motivo_perda_id=7, stage_changed_at atualizado). Em /relatorios?period=tudo a Seção 3 passou a mostrar a linha 'Mudou de prioridade interna' com 'Leads perdidos: 1'. End-to-end captura → agregação → render confirmado. (Revertido depois: lead voltou para negociacao, motivo id=7 removido.)"

### 8. Menu lateral
expected: Item "Relatórios" (ícone BarChart3) entre "Pipeline" e "Templates"; item "Motivos de Perda" (ícone ListX) após "Sub-nichos"; ambos ficam teal quando ativos
result: pass
reported: "Ordem confirmada: Follow-ups, Leads, Importar, Pipeline, Relatórios, Templates, Sub-nichos, Motivos de Perda, Lixeira, Configurações. 'Relatórios' fica com fundo teal suave quando ativo (visto em /relatorios). 'Motivos de Perda' logo após 'Sub-nichos'."

## Summary

total: 8
passed: 4
issues: 3
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "O seletor de período mostra o rótulo humano ('Últimos 30 dias' / 'Últimos 90 dias' / 'Tudo') no estado fechado"
  status: failed
  reason: "User reported (via automação): o <SelectValue /> do periodo-selector.tsx renderiza o value cru (30d / 90d / tudo) em vez do label do SelectItem correspondente. As opções abertas mostram o texto certo; só o gatilho fechado está errado. Afeta os Testes 1, 3 e 4."
  severity: cosmetic
  test: 1
  root_cause: "provável: <SelectValue /> em src/components/periodo-selector.tsx (Base UI Select) precisa de render prop / mapa value→label, ou o Select precisa da prop `items`. As OPCOES têm os labels certos (linhas 29-33) mas não chegam ao trigger."
  artifacts:
    - path: "src/components/periodo-selector.tsx"
      issue: "<SelectValue /> sem tradução value→label (linha 53)"
  missing:
    - "Fazer o SelectValue exibir OPCOES.find(o => o.value === value)?.label"

- truth: "Arrastar um card para a coluna 'Perdido' no /pipeline abre o modal OBRIGATÓRIO de motivo da perda, não-dispensável, com 'Cancelar' revertendo o card"
  status: blocked
  reason: "Não verificável por automação de navegador (dnd-kit não responde a eventos sintéticos de forma confiável; coluna Perdido fora da área de captura). Caminho equivalente por /leads (Etapa → Perdido) verificado e funcionando. Código revisado e correto. PRECISA de 1 drag real feito por humano."
  severity: major
  test: 5
  artifacts:
    - path: "src/components/pipeline-board.tsx"
      issue: "não testado ao vivo — lógica presente e revisada (handleDragEnd + fila motivoQueueRef + reversão via useOptimistic)"
    - path: "src/components/motivo-perda-dialog.tsx"
      issue: "não testado ao vivo — showCloseButton={false} + onOpenChange interceptado presente"
  missing:
    - "1 verificação humana: arrastar card → Perdido; confirmar modal abre, não fecha por Esc/clique-fora, Cancelar reverte, Salvar persiste"

### WARNING 1 — `scripts/verify-motivos-perda-schema.cjs` nunca criado
(inalterado — ver 11-VERIFICATION.md; candidato a gap-closure ou override documentado)

### WARNING 2 — Drift FK schema↔banco
`leads.motivo_perda_id` está com `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` em `schema.ts`. (inalterado — candidato a gap-closure)

### Observação extra (pré-existente, fora do escopo da Fase 11)
Console do /pipeline tem 1 erro de hidratação do React: `aria-describedby="DndDescribedBy-0"` (server) vs `DndDescribedBy-2` (client) nos cards arrastáveis — id não-determinístico do dnd-kit entre SSR e cliente. É código da Fase 3/4 (pipeline board), não da Fase 11. Aparece como "1 Issue" no overlay de dev do Next.
