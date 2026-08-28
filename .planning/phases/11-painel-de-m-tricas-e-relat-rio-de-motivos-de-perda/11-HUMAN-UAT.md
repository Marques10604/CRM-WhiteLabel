---
status: partial
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
source: [11-VERIFICATION.md]
started: 2026-08-27T00:00:00Z
updated: 2026-08-28T00:00:00Z
tested_by: Claude (automação de navegador — claude-in-chrome)
---

## Current Test

[testing complete — 6 pass, 1 bug confirmado (Teste 5: drag → modal Perdido) que precisa de gap-closure antes de fechar a Fase 11]

## Tests

### 1. Render de /relatorios sem ?period
expected: 3 seções empilhadas em cards brancos com borda; seletor mostra "Últimos 30 dias"; h1 "Relatórios" e seletor na mesma linha
result: pass
reported: "Layout OK. Bug do rótulo do seletor (mostrava `30d` cru) CORRIGIDO no quick 260828-flg — agora mostra 'Últimos 30 dias'. Verificado por SSR."
severity: cosmetic
fixed_by: quick 260828-flg (5ae841b)

### 2. Seção "Leads por origem" com dados reais
expected: DUAS linhas sempre presentes (Inbound com 0 e Outbound); coluna Taxa de conversão mostra "0%" quando total 0, NUNCA "NaN%"; ênfase da taxa por peso da fonte, não por cor
result: pass
reported: "Inbound (0) e Outbound (23 no recorte 'tudo') sempre presentes; Taxa mostra '0%', nunca 'NaN%'. Recorte 30d mostrou Outbound=1."

### 3. Trocar o seletor de período para "Últimos 90 dias" e depois "Tudo"
expected: URL vira ?period=90d / ?period=tudo; os números das 3 seções atualizam de forma consistente; a página NÃO rola ao topo (scroll: false)
result: pass
reported: "URL vira ?period=90d e ?period=tudo corretamente; os números das 3 seções atualizam de forma consistente (Outbound 1→23, sub-nichos idem); navegação não rola ao topo. Rótulo do seletor (mostrava `90d`/`tudo` cru) CORRIGIDO no quick 260828-flg."
severity: cosmetic
fixed_by: quick 260828-flg (5ae841b)

### 4. Acessar /relatorios?period=xyz (preset inválido)
expected: Página carrega normalmente (sem 500), recorte "Tudo" aplicado, seletor mostra "Tudo"
result: pass
reported: "Carrega sem 500; recorte 'Tudo' aplicado (23 outbound). Seletor mostra 'Tudo' após o fix do quick 260828-flg (SSR verificado: ?period=xyz → gatilho 'Tudo')."
severity: cosmetic
fixed_by: quick 260828-flg (5ae841b)

### 5. No /pipeline, arrastar um lead para a coluna "Perdido"
expected: Modal "Mover para Perdido" abre; NÃO tem botão X nem "Pular"; clicar fora / Esc não fecham; "Cancelar" reverte o card à etapa anterior sem persistir; escolher/criar um motivo e "Salvar motivo" persiste
result: issue
severity: major
reported: "BUG CONFIRMADO. Reproduzido com drag REAL (left_click_drag do agente = eventos de ponteiro reais do SO) + MutationObserver instalado observando todo o body por dialog/modal/toast. Ao arrastar um card (dentista_juliaxavier) para 'Perdido':
  1. O card se move para 'Perdido' de forma otimista.
  2. O RENDERER DO CHROME CONGELA por ~30s (CDP screenshot deu timeout 'renderer may be frozen or unresponsive'), depois se recupera.
  3. O modal 'Mover para Perdido' NUNCA é adicionado ao DOM — o MutationObserver não registrou NENHUMA adição de dialog/modal/toast. Nenhum erro no console.
  4. Nada persiste (banco: id 17 e id 18 seguem 'negociacao', 0 perdidos). O card fica ENCALHADO visualmente em 'Perdido' — sem modal, sem 'Cancelar', sem 'Salvar', sem reversão — só reload volta ao normal.
Confirma a hipótese de deadlock: com o modal preso, a transição async nunca assenta e o renderer trava. O contraexemplo anterior (lead persistido em perdido+motivo durante testes cegos) foi artefato de left_click_drag cego acertando o formulário de /leads, NÃO o modal do pipeline.
Artefatos de teste revertidos; banco limpo (contatado 1, negociacao 3, novo 19)."
root_cause: "pipeline-board.tsx handleDragEnd: quando newStage==='perdido', setMotivoPerdaState({open:true}) é chamado DENTRO de startTransition(async () => { setOptimisticStage(...); await new Promise(resolve => { ...; setMotivoPerdaState({open:true}) }) }). No React 19 esse setState de abrir o modal fica preso na transição async suspensa que aguarda a Promise do modal — DEADLOCK: o modal não renderiza (update preso na transição) → o usuário não responde → a Promise não resolve → a transição não assenta → renderer trava. O caminho /leads funciona porque usa render condicional SÍNCRONO (stage==='perdido' mostra o combobox no próprio form), sem transição+promise."
impact: "PERDA-01 (motivo de perda governado) NÃO funciona pela UX primária do pipeline (drag). Só funciona pelo formulário de /leads. Além disso: risco de o admin achar que 'perdeu' um lead (card em Perdido) quando na verdade nada foi salvo, e a aba trava por ~30s."
fix_direction: "Tirar setMotivoPerdaState({open:true}) de dentro do startTransition async. Padrão: guardar o drag pendente em useState (urgente), abrir o modal com update urgente, e só disparar setOptimisticStage + updateLeadStage numa NOVA transição quando o usuário clicar 'Salvar motivo'. 'Cancelar' apenas fecha o modal (o card nunca chegou a mover). Requer trocar o useOptimistic por um overlay de estado gerenciado à mão para o card pendente, OU mover o card só no save."

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
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 0
notes: "Testes 1/3/4 (rótulo do seletor) fechados pelo quick 260828-flg. Teste 5 (drag → modal Perdido) = BUG CONFIRMADO por automação (drag real + MutationObserver): modal nunca abre, renderer congela ~30s, card encalha em Perdido, nada persiste. Deadlock startTransition(async)+Promise em pipeline-board.tsx. Fecha PERDA-01 só pelo /leads. Precisa de gap-closure antes de fechar a fase."

## Gaps

- truth: "O seletor de período mostra o rótulo humano ('Últimos 30 dias' / 'Últimos 90 dias' / 'Tudo') no estado fechado"
  status: fixed
  reason: "<SelectValue /> do periodo-selector.tsx renderizava o value cru. CORRIGIDO no quick 260828-flg (5ae841b): adicionada a prop items ao <Select>, mesmo idioma dos selects canal/origemTipo/stage. Verificado por SSR nos 4 recortes. Afetava Testes 1, 3, 4."
  severity: cosmetic
  test: 1
  root_cause: "<Select> do periodo-selector.tsx não passava a prop items — Base UI Select.Value precisa dela para resolver value→label."
  fixed_by: "quick 260828-flg (5ae841b)"

- truth: "Arrastar um card para a coluna 'Perdido' no /pipeline abre o modal OBRIGATÓRIO de motivo da perda, não-dispensável, com 'Cancelar' revertendo o card"
  status: failed
  reason: "BUG CONFIRMADO via drag real (left_click_drag = eventos de ponteiro do SO) + MutationObserver. Card move para Perdido de forma otimista; renderer do Chrome CONGELA ~30s; modal 'Mover para Perdido' NUNCA é adicionado ao DOM (observer não pegou nada); console limpo; nada persiste (banco intacto); card encalha em Perdido até reload — sem Cancelar/Salvar/reversão."
  severity: major
  test: 5
  root_cause: "pipeline-board.tsx handleDragEnd: setMotivoPerdaState({open:true}) chamado DENTRO de startTransition(async () => { setOptimisticStage(...); await new Promise(resolve => { queue.push({resolve}); setMotivoPerdaState({open:true}) }) }). React 19: o update de abrir o modal fica preso na transição async suspensa que aguarda a Promise — DEADLOCK render↔transição, renderer trava. O caminho /leads funciona por usar render condicional síncrono."
  artifacts:
    - path: "src/components/pipeline-board.tsx"
      issue: "handleDragEnd: modal aberto via setState dentro de startTransition(async). FIX: tirar o setMotivoPerdaState do bloco async; guardar o drag pendente em useState urgente, abrir o modal com update urgente, disparar setOptimisticStage+updateLeadStage numa NOVA transição só no 'Salvar motivo'. 'Cancelar' só fecha (card nunca moveu). Trocar useOptimistic por overlay de estado manual para o card pendente OU mover o card só no save."
  missing:
    - "Gap-closure em pipeline-board.tsx (reestruturar o fluxo drag→Perdido→modal fora da transição async)"
    - "Re-teste: arrastar card → Perdido; modal abre, não fecha por Esc/clique-fora, Cancelar reverte, Salvar persiste, sem freeze"

### WARNING 1 — `scripts/verify-motivos-perda-schema.cjs` nunca criado
(inalterado — ver 11-VERIFICATION.md; candidato a gap-closure ou override documentado)

### WARNING 2 — Drift FK schema↔banco
`leads.motivo_perda_id` está com `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` em `schema.ts`. (inalterado — candidato a gap-closure)

### Observação extra (pré-existente, fora do escopo da Fase 11)
Console do /pipeline tem 1 erro de hidratação do React: `aria-describedby="DndDescribedBy-0"` (server) vs `DndDescribedBy-2` (client) nos cards arrastáveis — id não-determinístico do dnd-kit entre SSR e cliente. É código da Fase 3/4 (pipeline board), não da Fase 11. Aparece como "1 Issue" no overlay de dev do Next.
