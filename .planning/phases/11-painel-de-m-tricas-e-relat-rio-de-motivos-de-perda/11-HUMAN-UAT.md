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
blocked_by: needs-human-confirmation
reported: "SUSPEITA DE BUG REAL, mas não 100% confirmável por automação. Em ~6 tentativas de drag para 'Perdido' (eventos de ponteiro sintéticos + left_click_drag real do agente), o padrão dominante: o card se move para 'Perdido' de forma otimista MAS o modal 'Mover para Perdido' NUNCA aparece (polling de 0 a 2000ms). Sem modal → sem persistência (banco intacto) e sem forma de reverter pela UI: o card fica ENCALHADO em 'Perdido' até dar reload. Console limpo (nenhum erro/warning de transição durante o drag). CONTRAPONTO: durante os testes, um lead (dra.marcellavalladares, id 21) ACABOU persistido em perdido+motivo=2 — o que só é possível se o modal tiver aberto e 'Salvar motivo' tiver sido clicado em ALGUM momento (provável artefato de um left_click_drag cego meu acertando o modal). Artefatos de teste revertidos (ids 17→negociacao, 21→novo). NÃO foi possível dar veredito definitivo pela automação — dnd-kit + eventos sintéticos são notoriamente não-confiáveis. PRECISA de 1 drag manual humano."
severity: major
suspected_root_cause: "pipeline-board.tsx: setMotivoPerdaState({open:true}) é chamado DENTRO de startTransition(async () => { ... await new Promise(...) }). Hipótese: no React 19 esse setState fica preso na mesma transição async suspensa que aguarda a Promise do modal — deadlock: o modal não renderiza porque o update está preso na transição, e a transição não assenta porque espera o modal. O caminho /leads funciona porque usa render condicional síncrono (stage==='perdido' mostra o combobox), sem transição+promise."

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
notes: "Testes 1/3/4 (rótulo do seletor) fechados pelo quick 260828-flg. Teste 5 (drag → modal) = issue com suspeita de bug real (deadlock startTransition+Promise); precisa de 1 drag manual humano para veredito final."

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
  reason: "Automação (sintética + left_click_drag real) reproduziu ~6x: card vai para Perdido de forma otimista, modal 'Mover para Perdido' NUNCA aparece (polling 0–2000ms), sem persistência, card encalhado até reload. Console limpo. 1 contraexemplo circunstancial (lead persistido em perdido+motivo durante os testes) sugere que o modal PODE abrir num drag real bem-formado. Veredito definitivo depende de 1 drag manual humano."
  severity: major
  test: 5
  suspected_root_cause: "pipeline-board.tsx handleDragEnd: setMotivoPerdaState({open:true}) chamado DENTRO de startTransition(async () => { ... await new Promise(...) }). Hipótese React 19: o setState fica preso na transição async suspensa que aguarda a Promise do modal — deadlock render↔transição. O caminho /leads funciona por usar render condicional síncrono."
  artifacts:
    - path: "src/components/pipeline-board.tsx"
      issue: "modal aberto via setState dentro de startTransition(async). Se confirmado: mover o open para fora da transição (update urgente) ou reestruturar o padrão pending-drag."
  missing:
    - "1 verificação humana: arrastar card → Perdido; confirmar modal abre, não fecha por Esc/clique-fora, Cancelar reverte, Salvar persiste"
    - "Se confirmado: gap-closure em pipeline-board.tsx"

### WARNING 1 — `scripts/verify-motivos-perda-schema.cjs` nunca criado
(inalterado — ver 11-VERIFICATION.md; candidato a gap-closure ou override documentado)

### WARNING 2 — Drift FK schema↔banco
`leads.motivo_perda_id` está com `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` em `schema.ts`. (inalterado — candidato a gap-closure)

### Observação extra (pré-existente, fora do escopo da Fase 11)
Console do /pipeline tem 1 erro de hidratação do React: `aria-describedby="DndDescribedBy-0"` (server) vs `DndDescribedBy-2` (client) nos cards arrastáveis — id não-determinístico do dnd-kit entre SSR e cliente. É código da Fase 3/4 (pipeline board), não da Fase 11. Aparece como "1 Issue" no overlay de dev do Next.
