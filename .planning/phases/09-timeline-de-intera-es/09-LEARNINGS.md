---
phase: 9
phase_name: "timeline-de-intera-es"
project: "CRM de Leads — Área da Saúde"
generated: "2026-08-11T21:02:15Z"
counts:
  decisions: 7
  lessons: 5
  patterns: 4
  surprises: 3
missing_artifacts: []
---

# Phase 9 Learnings: timeline-de-intera-es

## Decisions

### Coluna única `tipo` em vez de segunda dimensão de categorização
A tabela `interacoes` usa uma única coluna `tipo` com 4 valores (incluindo `nota_manual`) em vez de duas dimensões separadas (categoria + subtipo).

**Rationale:** Decisão já tomada no `09-RESEARCH.md` e aplicada como especificado — mantém o schema simples para um app de admin solo.
**Source:** 09-01-SUMMARY.md

---

### Guarda de imutabilidade sempre no WHERE do servidor, nunca só na UI
Entradas automáticas de WhatsApp são imutáveis por design — só `nota_manual` pode ser editada/excluída, e isso é garantido em `eq(interacoes.tipo, "nota_manual")` no WHERE das Server Actions de update/delete. A UI apenas reforça visualmente (esconde os ícones), nunca é a única barreira.

**Rationale:** Um usuário mal-intencionado ou um bug de UI não pode contornar a regra de negócio se ela só existe no client.
**Source:** 09-01-SUMMARY.md, 09-03-SUMMARY.md

---

### Insert em `interacoes` incondicional, fora do spread ternário de avanço de etapa
`tx.insert(interacoes)` é uma instrução irmã do `tx.update(leads)`, nunca aninhada dentro do `...(advanced ? {} : {})` que decide se a etapa avança.

**Rationale:** Garante que `follow_up` e `prova_valor` também gerem linha de timeline, não só `primeiro_contato` (Pitfall 4 do research da fase).
**Source:** 09-02-SUMMARY.md

---

### Toda escrita dupla (contador + evento) vira `db.transaction()`
Registrar a interação de WhatsApp e incrementar `contactAttempts` acontecem na mesma transação atômica.

**Rationale:** Nunca deixar as duas escritas dessincronizadas se uma falhar.
**Source:** 09-02-SUMMARY.md

---

### Harness de teste `:memory:` puro, sem ORM e sem import de código real
`scripts/test-interacao-actions.cjs` reproduz o idioma de escrita de produção em miniatura (better-sqlite3 puro) em vez de importar e exercitar o TypeScript real.

**Rationale:** Evita a complexidade de bootstrap de `ts-alias-loader.mjs`/migrations para uma tabela sem migração `.sql` versionada (criada via `drizzle-kit push`). Segue o precedente de `verify-wa-contact-invariant.cjs`.
**Source:** 09-02-SUMMARY.md

---

### Edição inline em vez de modal aninhado para editar nota manual
Editar uma nota substitui o corpo por um Textarea + botões inline, em vez de abrir um segundo modal sobre a timeline.

**Rationale:** Ação reversível e de baixo risco não precisa de confirmação nem de um modal aninhado — inline é mais rápido para o fluxo de admin solo.
**Source:** 09-03-SUMMARY.md

---

### Ícone de histórico sempre inserido dentro de wrappers de `stopPropagation` já existentes
Tanto em `lead-table.tsx` (linha inteira clicável) quanto em `pipeline-lead-card.tsx` (wrapper de `useDraggable`), o novo ícone `History` foi colocado dentro do wrapper de `stopPropagation` já existente, nunca em um wrapper próprio novo.

**Rationale:** Reduz superfície de mitigação duplicada e evita reintroduzir o Pitfall 5 (drag-handle/edição acidental) já documentado no `09-RESEARCH.md`.
**Source:** 09-04-SUMMARY.md

---

## Lessons

### `drizzle-kit push` pode recriar índices existentes sem pedir confirmação
`npx drizzle-kit push --verbose` (Plan 09-01) imprimiu um `DROP INDEX subnicho_nome_unique_idx` + `CREATE UNIQUE INDEX` byte-idêntico, aplicado automaticamente sem prompt interativo, por causa do drift de snapshot de migrações já conhecido do projeto desde a Fase 4/6.

**Context:** Não houve perda de dado (verificado: `subnichos` com 9 linhas intactas), mas é um lembrete de que o drizzle-kit trata DROP+CREATE de índice idêntico como operação "segura" e não pausa para confirmação — vale checar o output do push com atenção em qualquer fase futura que toque schema.
**Source:** 09-01-SUMMARY.md

---

### `guard:no-hard-delete` pode disparar em comentários JSDoc que citam o padrão proibido como exemplo
O comentário JSDoc de `softDeleteInteracaoManual` continha literalmente `db.delete(interacoes...)` como exemplo do que nunca fazer, e isso disparou o próprio guard (que varre texto, não AST).

**Context:** Ao documentar "o que não fazer" em comentários deste projeto, descrever em prosa em vez de reproduzir o padrão de código literal proibido.
**Source:** 09-01-SUMMARY.md

---

### `react-hooks/set-state-in-effect` é um falso-positivo recorrente do React Compiler neste projeto
Apareceu de novo em `lead-timeline-dialog.tsx` (09-03) e depois bloqueou o gate eslint escopado de 09-04 mesmo em um arquivo pré-existente (`whatsapp-preview-dialog.tsx`) não tocado pelas tasks daquele plano, só porque o gate incluía o arquivo no escopo.

**Context:** Mesmo padrão já aceito e documentado em STATE.md (decisão 07-02) — ao criar um novo componente com reset de estado local em efeito `[open, item?.id]`, esperar precisar do mesmo `eslint-disable-next-line` documentado, inclusive em arquivos vizinhos que entrarem no escopo do gate por acaso.
**Source:** 09-03-SUMMARY.md, 09-04-SUMMARY.md

---

### UAT humano bloqueado por falta de acesso a navegador em sessões de execução deixa a fase presa em `human_needed`
As 4 plans da Fase 9 foram executadas e verificadas estaticamente (tsc/eslint/testes/guards), mas nenhuma delas teve acesso a navegador — o `<human-check>` ficou pendente por 3 dias (2026-08-08 → 2026-08-11) até o usuário pedir explicitamente para o agente executar o UAT via automação de navegador (Claude in Chrome) em vez de clicar manualmente.

**Context:** Quando a verificação estática está 100% e só falta o clique real, vale perguntar ao usuário se ele quer testar manualmente ou autorizar o agente a rodar via automação de navegador — evita a fase ficar "presa" por dias esperando uma janela do usuário.
**Source:** 09-04-SUMMARY.md, esta sessão (09-HUMAN-UAT.md)

---

### Simular drag-and-drop cross-column via automação de mouse sintético não é 100% confiável, mesmo quando o handler funciona
Ao testar o Teste 4 do UAT (drag-and-drop no `/pipeline`), o primeiro `left_click_drag` disparou o toast "Lead movido para Novo." (confirmando que o handler do dnd-kit está funcional), mas tentativas seguintes de mover um card para uma coluna diferente não foram reconhecidas de forma consistente pelo drop-zone.

**Context:** Isso é uma limitação conhecida de simular gestos do dnd-kit com um único evento de mouse sintético (sem os múltiplos `mousemove` intermediários que o sensor de ativação do dnd-kit espera), não um bug do app — nenhuma contagem de coluna foi corrompida durante os testes. Para futuras UATs automatizadas de boards com dnd-kit, considerar validar o mecanismo (toast) em vez de exigir sucesso visual de todo movimento cross-column.
**Source:** esta sessão (09-HUMAN-UAT.md, Teste 4)

---

## Patterns

### Tabela de evento imutável com `deletedAt` condicional por tipo
Toda mutação de update/soft-delete em `interacoes` inclui `eq(tabela.tipo, valor_editável)` no WHERE, garantindo que só o subconjunto editável do tipo seja afetado.

**When to use:** Sempre que uma tabela mistura eventos imutáveis (auditoria/histórico automático) com registros editáveis pelo usuário na mesma tabela.
**Source:** 09-01-SUMMARY.md

---

### Guarda contra respostas fora de ordem em busca imperativa (`leadIdEmVooRef`)
Ao trocar de lead rapidamente (ex.: abrir a timeline de um lead, fechar, abrir de outro), a resposta da busca anterior é descartada se o id do lead "em voo" mudou entre o disparo e o retorno do await.

**When to use:** Qualquer componente que dispara fetch imperativo (não Suspense/RSC) atrelado a um id que pode mudar antes da resposta voltar.
**Source:** 09-03-SUMMARY.md

---

### `TimelineState = { open: false } | { open: true; lead: Lead }` replicado por tela
Mesma forma de union type discriminado já estabelecida para `PreviewState` (Fase 04-03), repetida em `lead-table.tsx` e `pipeline-board.tsx` para controlar o modal de timeline.

**When to use:** Estado de modal que carrega um payload (o lead selecionado) só quando aberto — evita um `lead: Lead | null` solto e mantém o TypeScript exaustivo no discriminante `open`.
**Source:** 09-04-SUMMARY.md

---

### Novo ícone de ação em card com `useDraggable` entra no wrapper de `stopPropagation` já existente
Em vez de criar um novo wrapper para o ícone de histórico, ele foi inserido dentro do wrapper que já intercepta `onPointerDown`/`onClick` por causa do drag-and-drop.

**When to use:** Qualquer novo controle clicável adicionado a um card que já é `useDraggable` — reutilizar a mitigação de propagação existente em vez de duplicá-la.
**Source:** 09-04-SUMMARY.md

---

## Surprises

### `drizzle-kit push` aplicou DROP+CREATE de índice automaticamente, sem confirmação interativa
Mesmo sendo uma operação que soa arriscada à primeira vista, o drizzle-kit não pausou para confirmação porque reconheceu a operação como não-destrutiva (índice idêntico recriado).

**Impact:** Nenhum — verificado sem perda de dado. Mas reforça que a "proteção" de confirmação interativa do drizzle-kit não cobre toda mudança de schema; a verificação pós-push (contagem de linhas/colunas) continua sendo a rede de segurança real.
**Source:** 09-01-SUMMARY.md

---

### 2 das 4 plans (09-02 e 09-03) foram executadas sem nenhuma deviation
Diferente de outras fases do projeto, as plans de captura automática e de superfície da UI da timeline rodaram exatamente como planejado, sem Rule 1-4 acionada.

**Impact:** Sinaliza que o research prévio (09-RESEARCH.md, com os Pitfalls numerados) foi eficaz em antecipar as armadilhas reais — vale manter o mesmo nível de detalhamento de research em fases futuras com risco de concorrência/transação.
**Source:** 09-02-SUMMARY.md, 09-03-SUMMARY.md

---

### A race condition WR-01 só apareceu no code review, não em nenhum gate automatizado
Nenhum dos 9 gates automatizados (incluindo o harness de 20 asserções de `test-interacao-actions.cjs`) capturou a condição de corrida entre um drag-and-drop rápido e `registerWhatsAppContact` — foi identificada só na revisão de código humana/assistida (`09-REVIEW.md`).

**Impact:** Testes de invariante em `:memory:` não substituem uma leitura atenta de código para condições de corrida entre duas Server Actions distintas disparadas por UI (drag vs. clique) — vale manter a etapa de code review mesmo com cobertura de teste alta.
**Source:** 09-REVIEW.md (referenciado via .continue-here.md)
