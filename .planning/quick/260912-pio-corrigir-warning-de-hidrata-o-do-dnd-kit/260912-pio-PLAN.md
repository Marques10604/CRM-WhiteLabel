---
phase: quick-260912-pio
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/pipeline-board.tsx
autonomous: true
requirements: [HYDR-01]

must_haves:
  truths:
    - "O elemento <DndContext> de /pipeline recebe um id estável e literal, idêntico no render do servidor e no do cliente"
    - "O console do navegador não acusa mais o warning de hidratação de aria-describedby (DndDescribedBy-N) ao abrir /pipeline"
    - "Arrastar um card entre colunas continua persistindo a etapa exatamente como antes (incluindo o modal obrigatório de motivo ao soltar em Perdido)"
    - "Nenhum handler, sensor, estado otimista ou fila de motivo-perda foi alterado"
  artifacts:
    - path: "src/components/pipeline-board.tsx"
      provides: "DndContext com id estável, eliminando o contador incremental de useUniqueId como fonte de divergência SSR/cliente"
      contains: "id=\"pipeline-board\""
  key_links:
    - from: "src/components/pipeline-board.tsx"
      to: "@dnd-kit/core (DndContext)"
      via: "prop id literal no elemento raiz do board"
      pattern: "<DndContext[^>]*id=\"pipeline-board\""
---

<objective>
Corrigir o warning de hidratação do React em `/pipeline` causado pelo `@dnd-kit/core`.

**Causa raiz (já diagnosticada, não re-investigar):** `src/components/pipeline-board.tsx` linha 220 renderiza `<DndContext sensors={sensors} onDragEnd={handleDragEnd}>` sem a prop `id`. Sem `id`, o `DndContext` gera internamente o `aria-describedby` do seu nó de acessibilidade (`DndDescribedBy-N`) através do hook `useUniqueId`, que incrementa um contador de módulo. Esse contador pode estar num valor diferente no render do servidor (SSR) e no render de hidratação do cliente, então o atributo `aria-describedby` do markup do servidor difere do markup do cliente e o React emite o warning de hidratação. Passar um `id` estático é o fix documentado pelo próprio dnd-kit para essa classe de divergência: os ids gerados passam a ser derivados deterministicamente desse id em vez do contador.

Purpose: remover ruído de console que hoje mascara warnings reais de hidratação em futuras mudanças da tela mais usada do CRM (o funil).
Output: 1 arquivo alterado, 1 prop adicionada, zero arquivo novo, zero pacote novo, zero mudança de schema, zero mudança de comportamento.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

@src/components/pipeline-board.tsx

<interfaces>
<!-- Estado ATUAL do código relevante (linha 220 de src/components/pipeline-board.tsx). -->
<!-- Não explorar a base atrás disso — está tudo aqui. -->

Elemento a alterar (única alteração do plano):

  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>

Elementos que NÃO mudam (referência, para não serem tocados por engano):
- `sensors` = `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))` (linhas 103-105) — a constraint de 8px que impede o drag de engolir o clique-para-editar (Pitfall 4 da Fase 03) fica intacta.
- `handleDragEnd(event: DragEndEvent)` (linhas 155-177) — inclui o desvio obrigatório para `newStage === "perdido"` que enfileira o lead e abre o `MotivoPerdaDialog` SEM mover o card (correção do deadlock do quick 260828-gna). Intocado.
- `useOptimistic` / `commitStageChange` / `motivoQueueRef` / `advanceMotivoQueue` / `shiftMotivoQueue` — intocados.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: id estável no DndContext de /pipeline</name>
  <files>src/components/pipeline-board.tsx</files>
  <action>
Em `src/components/pipeline-board.tsx`, no elemento `<DndContext>` da linha 220, adicionar a prop `id="pipeline-board"` — uma string literal, escrita à mão no JSX.

Forma final exata do elemento de abertura:

  &lt;DndContext id="pipeline-board" sensors={sensors} onDragEnd={handleDragEnd}&gt;

Regras rígidas (esta é uma mudança de UMA prop, nada além disso):
(a) O valor DEVE ser uma string literal constante. NÃO usar `useId()`, `crypto.randomUUID()`, `Math.random()`, `Date.now()`, contador em `useRef`, nem qualquer valor derivado de props/estado — qualquer coisa não-literal reintroduz exatamente a divergência SSR/cliente que estamos corrigindo (o `useId` do React seria estável, mas é indireção desnecessária aqui e some do grep de verificação).
(b) NÃO alterar, reordenar ou remover `sensors` e `onDragEnd`. NÃO adicionar outras props ao `DndContext` (nada de `collisionDetection`, `accessibility`, `modifiers`, `onDragStart`, `autoScroll`) — esta tarefa não redesenha o drag-and-drop.
(c) NÃO tocar em `handleDragEnd`, `commitStageChange`, `useOptimistic`, `motivoQueueRef`, nos sensores, nem em nenhum dos 4 diálogos (`LeadFormDialog`, `MotivoPerdaDialog`, `WhatsAppPreviewDialog`, `LeadTimelineDialog`).
(d) NÃO adicionar `id` aos `PipelineColumn`/`PipelineLeadCard` nem alterar `useDroppable`/`useDraggable` desses componentes — o `DndContext` raiz é o único ponto do fix; os ids de coluna (`option.value`) e de card (`lead.id`) já são determinísticos e derivados de dados, não de contador.
(e) NÃO alterar `src/app/pipeline/page.tsx` nem qualquer outro arquivo.
(f) Zero classe/cor nova — não há mudança visual alguma.

Atualizar o doc-comment do componente (bloco `/** ... */` das linhas 55-74) acrescentando uma frase curta ao final explicando o porquê do `id`: que ele é obrigatório e literal para estabilizar o `aria-describedby` gerado pelo dnd-kit entre SSR e hidratação, e que trocá-lo por um valor gerado em runtime reintroduz o warning. Não reescrever o resto do comentário (o histórico do deadlock do modal de "Perdido" é contexto valioso e fica como está).
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run lint && npm run build && grep -v '^\s*[*/]' src/components/pipeline-board.tsx | grep -c 'id="pipeline-board"' && grep -v '^\s*[*/]' src/components/pipeline-board.tsx | grep -c 'onDragEnd={handleDragEnd}' && git diff --name-only | grep -vc 'src/components/pipeline-board.tsx' || true</automated>
  </verify>
  <done>
`npx tsc --noEmit` limpo; `npm run lint` exit 0; `npm run build` conclui com sucesso (mesma contagem de rotas de antes). O grep filtrado de comentários encontra `id="pipeline-board"` no JSX (contagem >= 1) e `onDragEnd={handleDragEnd}` continua presente (contagem 1, prova de que o handler não foi mexido). O `git diff --name-only` não lista nenhum arquivo além de `src/components/pipeline-board.tsx` (contagem 0 na terceira checagem). O diff do arquivo mostra apenas a prop adicionada na linha do `DndContext` + a frase nova no doc-comment — nenhuma linha de lógica alterada.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (nenhuma nova) | A mudança é uma prop de acessibilidade num componente cliente já existente. Não introduz entrada de usuário, não cruza rede, não toca DB, não altera Server Action. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-pio-01 | Tampering | `src/components/pipeline-board.tsx` (`DndContext`) | accept | Valor literal hardcoded no JSX, sem origem externa — nenhum vetor de injeção. O `id` só alimenta a geração de ids de DOM/ARIA do dnd-kit. |
| T-pio-SC | Tampering | npm/pip/cargo installs | accept | **Zero instalação de pacote nesta tarefa** — `@dnd-kit/core` já está no `package.json` desde a Fase 03 e nenhuma versão muda. Gate de legitimidade não se aplica. |
</threat_model>

<verification>
Automatizado (bloqueante, roda inteiro no gate da Task 1):
1. `npx tsc --noEmit` — exit 0.
2. `npm run lint` — exit 0.
3. `npm run build` — sucesso (o build com Turbopack passa desde 2026-08-29; qualquer quebra aqui é regressão desta mudança).
4. `grep` filtrado de comentários confirma `id="pipeline-board"` presente e `onDragEnd={handleDragEnd}` preservado.
5. `git diff --name-only` confirma que só `src/components/pipeline-board.tsx` foi tocado.

<human-check blocking="false">
**Confirmação final do warning — exige navegador, não automatizável nestes gates.**

Warnings de hidratação do React só aparecem no console do NAVEGADOR, no render inicial da página, em modo de desenvolvimento. Nem `tsc`, nem `lint`, nem `npm run build` conseguem observá-los — por isso os gates automatizados acima provam "a prop está lá e nada quebrou", mas não provam "o warning sumiu". Segue o precedente do projeto para verificação dependente de navegador (Fases 9/10/11): passada humana, não-bloqueante para o fechamento da tarefa.

Quando quiser confirmar:
1. `npm run dev` e abrir `http://localhost:3000/pipeline`.
2. Abrir o console do DevTools (F12) e recarregar a página com o console limpo.
3. Esperado: nenhum warning contendo `aria-describedby`, `DndDescribedBy` ou "hydrated but some attributes of the server rendered HTML didn't match".
4. Arrastar um card de "Novo" para "Contatado": o card move, o toast "Lead movido para Contatado." aparece e a etapa persiste após um F5.
5. Arrastar um card para "Perdido": o modal obrigatório de motivo abre, o card NÃO se move antes de salvar; "Salvar motivo" move e persiste; "Cancelar" não move nada.
6. Clicar (sem arrastar) num card: ainda abre o modal de edição — a constraint de 8px do PointerSensor continua valendo.

Se algum warning de hidratação persistir em `/pipeline`, ele tem OUTRA causa (não é mais o contador do dnd-kit) — abrir tarefa nova com o texto exato do warning, não estender esta.
</human-check>
</verification>

<success_criteria>
- `src/components/pipeline-board.tsx` é o único arquivo alterado.
- `<DndContext>` carrega `id="pipeline-board"` como string literal.
- `npx tsc --noEmit`, `npm run lint` e `npm run build` todos verdes.
- `sensors`, `onDragEnd`, `useOptimistic`, a fila de motivo-perda e os 4 diálogos permanecem byte-idênticos no diff.
- Zero mudança visual e zero mudança de comportamento de drag-and-drop.
</success_criteria>

<output>
Criar `.planning/quick/260912-pio-corrigir-warning-de-hidrata-o-do-dnd-kit/260912-pio-SUMMARY.md` ao concluir.
</output>
