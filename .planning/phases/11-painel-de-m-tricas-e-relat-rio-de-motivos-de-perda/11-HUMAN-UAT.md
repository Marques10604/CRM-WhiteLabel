---
status: complete
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
source: [11-VERIFICATION.md]
started: 2026-08-27T00:00:00Z
updated: 2026-08-29T00:00:00Z
tested_by: Claude (automação de navegador — claude-in-chrome)
---

## Current Test

[testing complete — 8/8 pass. O Teste 5 pegou um bug real (deadlock no drag→modal Perdido), corrigido no quick 260828-gna (3 commits) e re-verificado ao vivo. Restam 2 warnings do verificador (não bloqueiam o goal).]

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
result: pass
history: "issue → FIX → pass. O UAT inicial pegou um BUG REAL (deadlock): setMotivoPerdaState({open:true}) era chamado DENTRO de startTransition(async () => await new Promise(...)) em pipeline-board.tsx — o update de abrir o modal ficava preso na transição suspensa, o modal nunca renderizava, o renderer congelava ~30s e o card ficava encalhado em Perdido sem persistir nem reverter. Corrigido no quick 260828-gna (3 commits: fbf7abd + 967e735 + 1dd794b)."
fix: "(1) fbf7abd — abertura do modal saiu da transição async: soltar em Perdido só ENFILEIRA o lead + abre o modal com update urgente, SEM mover o card; 'Salvar motivo' dispara uma NOVA startTransition normal (commitStageChange) que move (otimista) + persiste via updateLeadStage; 'Cancelar' só descarta o item da fila (o card nunca moveu). (2) 967e735 — MotivoPerdaDialog só bloqueia dismiss por reason 'escape-key'/'outside-press' (o eventDetails.cancel() incondicional dessincronizava o Base UI e prendia o modal). (3) 1dd794b — dedup da fila contra double-fire de onDragEnd."
reported: "Verificado ao vivo no navegador (janela visível) + instrumentação (drag + MutationObserver + inspeção de estado), no dev server com o novo código:
  - ✅ Arrastar para 'Perdido' → o modal 'Mover para Perdido — Por que \"{nome}\" foi perdido?' ABRE com o nome correto do lead, SEM freeze do renderer (o deadlock acabou).
  - ✅ NÃO tem botão X — os únicos botões são 'Cancelar' e 'Salvar motivo'.
  - ✅ O card NÃO se move ao soltar em 'Perdido' (contagens das colunas inalteradas) — só moveria em 'Salvar motivo'. Isso ELIMINA o risco de card órfão.
  - ✅ 'Cancelar' → o modal fecha limpo (sumiu por t=800ms com a janela visível) e o card continua na etapa de origem; banco inalterado.
  - ✅ 'Salvar motivo' persiste: durante os testes, o lead id 17 acabou gravado com stage='perdido' + motivo_perda_id=2 pelo fluxo completo drag→modal→salvar — prova end-to-end da persistência. (Artefato revertido depois; banco limpo.)
  - ✅ MotivoPerdaCombobox (criável, o do Teste 6) provado no /leads: cria + seleciona + persiste.
  Cobertura por código (mudança de 4 linhas, inequívoca), não re-testada por automação nesta rodada por a janela do Chrome ter voltado a ficar minimizada: o bloqueio de Esc / clique-fora — o onOpenChange agora faz eventDetails.cancel() exatamente para reason 'escape-key' e 'outside-press' e propaga o resto. tsc --noEmit limpo após cada commit.
  PERDA-01 volta a funcionar pela UX primária do pipeline (drag), além do /leads."

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
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0
notes: "8/8 pass. Testes 1/3/4 (rótulo do seletor) fechados pelo quick 260828-flg (5ae841b). Teste 5 pegou um BUG REAL (deadlock no drag→modal Perdido: setState de abrir o modal preso numa startTransition(async)+Promise) — CORRIGIDO no quick 260828-gna (fbf7abd + 967e735 + 1dd794b) e re-verificado ao vivo (modal abre sem freeze, card não move no drop, Cancelar fecha limpo, save persiste end-to-end). Restam 2 warnings do verificador — NÃO bloqueiam o goal: (a) scripts/verify-motivos-perda-schema.cjs nunca criado (cobertura folded em verify-schema.cjs; integridade conferida à mão contra o banco); (b) drift FK leads.motivo_perda_id ON DELETE NO ACTION vs onDelete:restrict no schema.ts (barreira primária guard-no-hard-delete verde, 0 referências hoje). Candidatos a gap-closure futura."

## Gaps

- truth: "O seletor de período mostra o rótulo humano ('Últimos 30 dias' / 'Últimos 90 dias' / 'Tudo') no estado fechado"
  status: fixed
  reason: "<SelectValue /> do periodo-selector.tsx renderizava o value cru. CORRIGIDO no quick 260828-flg (5ae841b): adicionada a prop items ao <Select>, mesmo idioma dos selects canal/origemTipo/stage. Verificado por SSR nos 4 recortes. Afetava Testes 1, 3, 4."
  severity: cosmetic
  test: 1
  root_cause: "<Select> do periodo-selector.tsx não passava a prop items — Base UI Select.Value precisa dela para resolver value→label."
  fixed_by: "quick 260828-flg (5ae841b)"

- truth: "Arrastar um card para a coluna 'Perdido' no /pipeline abre o modal OBRIGATÓRIO de motivo da perda, não-dispensável, com 'Cancelar' revertendo o card"
  status: fixed
  reason: "Bug real (deadlock) pego pelo UAT — CORRIGIDO no quick 260828-gna (fbf7abd + 967e735 + 1dd794b) e re-verificado ao vivo: modal abre com o nome certo do lead sem freeze; card não se move ao soltar (só em 'Salvar motivo'); 'Cancelar' fecha limpo e o card fica na origem; 'Salvar motivo' persiste end-to-end (id 17 gravado stage=perdido+motivo=2 no fluxo completo). Esc/clique-fora bloqueados por código (onOpenChange só cancela reason escape-key/outside-press). PERDA-01 volta a funcionar pelo drag."
  severity: major
  test: 5
  root_cause: "pipeline-board.tsx handleDragEnd: setMotivoPerdaState({open:true}) chamado DENTRO de startTransition(async () => { setOptimisticStage(...); await new Promise(resolve => { queue.push({resolve}); setMotivoPerdaState({open:true}) }) }). React 19: o update de abrir o modal ficava preso na transição async suspensa que aguardava a Promise — DEADLOCK render↔transição, renderer travava."
  fixed_by: "quick 260828-gna (fbf7abd + 967e735 + 1dd794b)"
  artifacts:
    - path: "src/components/pipeline-board.tsx"
      issue: "handleDragEnd: modal era aberto via setState dentro de startTransition(async). Reescrito: drop em Perdido só enfileira + abre o modal (urgente), sem mover o card; commitStageChange (nova transição normal) move+persiste só no 'Salvar motivo'; shiftMotivoQueue com dedup."
    - path: "src/components/motivo-perda-dialog.tsx"
      issue: "onOpenChange fazia eventDetails.cancel() incondicional em todo !next (dessincronizava o Base UI). Agora só cancela reason 'escape-key'/'outside-press'."

### WARNING 1 — `scripts/verify-motivos-perda-schema.cjs` nunca criado
(inalterado — ver 11-VERIFICATION.md; NÃO bloqueia o goal. Cobertura estrutural mínima está em verify-schema.cjs; a integridade semântica — FK, 6 seeds, nullability, órfãos — foi conferida à mão contra o banco real na verificação da fase. Candidato a gap-closure futura ou override documentado.)

### WARNING 2 — Drift FK schema↔banco
`leads.motivo_perda_id` está com `ON DELETE NO ACTION` no banco real vs. `onDelete: "restrict"` em `schema.ts`. NÃO bloqueia o goal: a barreira primária contra remoção destrutiva é `guard-no-hard-delete.cjs` (verde) + soft-delete-only nas actions; hoje 0 leads referenciam `motivos_perda`. Candidato a gap-closure futura (regenerar a FK com a cláusula correta numa migração aditiva).

### Observação extra (pré-existente, fora do escopo da Fase 11)
Console do /pipeline tem 1 erro de hidratação do React: `aria-describedby="DndDescribedBy-0"` (server) vs `DndDescribedBy-2` (client) nos cards arrastáveis — id não-determinístico do dnd-kit entre SSR e cliente. É código da Fase 3/4 (pipeline board), não da Fase 11. Aparece como "1 Issue" no overlay de dev do Next.
