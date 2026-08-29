---
phase: 11
phase_name: "painel-de-m-tricas-e-relat-rio-de-motivos-de-perda"
project: "CRM de Leads — Área da Saúde"
generated: "2026-08-29"
counts:
  decisions: 8
  lessons: 6
  patterns: 9
  surprises: 5
missing_artifacts: []
---

# Phase 11 Learnings: painel-de-m-tricas-e-relat-rio-de-motivos-de-perda

## Decisions

### Motivo de perda = lista governada (tabela `motivos_perda` + FK), não enum nem texto livre
Substituiu a coluna de texto livre `leads.motivo_perda` da Fase 3 por uma FK `leads.motivoPerdaId` → `motivos_perda(id)`, com CRUD governado (soft-delete + reativação-por-nome) e 6 motivos-semente (D-01/D-02).

**Rationale:** PERDA-01 pedia um campo "governado o suficiente pra não fragmentar em variações de texto livre". Enum seria rígido (o admin não pode adicionar motivos); texto livre fragmenta o relatório. Réplica 1:1 do padrão `subnichos` já validado no projeto.
**Source:** 11-01-SUMMARY.md, 11-02-SUMMARY.md

### Coluna física `leads.motivo_perda` (texto legado) preservada no banco, removida só da declaração Drizzle
A coluna some de `schema.ts` (zero leituras/escritas em `src/`) mas nunca é dropada do banco.

**Rationale:** reversibilidade (11-RESEARCH Open Question 2) — mesmo idioma da migração sem `drizzle-kit` do projeto.
**Source:** 11-01-SUMMARY.md, 11-03-SUMMARY.md

### `ActionState` de sucesso ampliado para carregar `id`, shape homogêneo nas 3 actions
`createMotivoPerda` / `renameMotivoPerda` / `softDeleteMotivoPerda` devolvem `{ success: true; id }`; rename/softDelete ecoam o id recebido.

**Rationale:** o combobox criável (D-03) precisa do id do motivo recém-criado para já selecioná-lo. Shape uniforme evita união de variantes.
**Source:** 11-02-SUMMARY.md, 11-03-SUMMARY.md

### D-04 (motivo obrigatório quando perdido) autoritativo no servidor via `.refine` condicional
`.refine((d) => d.stage !== "perdido" || d.motivoPerdaId != null)` em `leadSchema` **e** `stageUpdateSchema`, mensagem verbatim. `leadBaseSchema` (objeto puro) extraído para `csvRowSchema` poder usar `.omit()`. `motivoPerdaExists()` como backstop em `createLead`/`updateLead`/`updateLeadStage`.

**Rationale:** toda Server Action é endpoint HTTP interno (Pitfall 8) — a obrigatoriedade não pode morar só no `disabled` do botão ou no `zodResolver` do cliente.
**Source:** 11-03-SUMMARY.md

### `motivoPerdaExists()` também em `updateLeadStage` (o plano só citava create/update)
**Rationale:** `updateLeadStage` não tem try/catch de violação de FK — um `motivoPerdaId` forjado bateria na FK `onDelete: "restrict"` e derrubaria a action com 500. Checagem pré-escrita é a única mitigação de T-11-13 nesse caminho.
**Source:** 11-03-SUMMARY.md

### Filtro de período discriminante: `createdAt` para origem/sub-nicho (D-09), `stageChangedAt` para motivos de perda (D-11)
"Quantos leads perdemos por motivo NESTE período" conta pela data em que o lead virou perdido, não pela criação.

**Rationale:** um lead criado há 200 dias e perdido ontem tem que aparecer no recorte de 30 dias; um lead criado ontem e perdido há 200 dias, não. Par discriminante provado por teste dedicado.
**Source:** 11-04-SUMMARY.md

### `resolvePeriodRange` aceita `string | undefined` e cai em "tudo" para qualquer valor inválido, sem `throw`
Preset ausente/adulterado/payload de SQLi → `{ start: new Date(0), end: now }` silenciosamente.

**Rationale:** mitigação T-11-19 (DoS por `period` inválido) / T-11-20 (SQLi via `period`) — converte para `Date` antes de virar parâmetro do Drizzle. Dupla barreira com a normalização de preset na página (`ausente → 30d`, `inválido → tudo`).
**Source:** 11-04-SUMMARY.md, 11-05-SUMMARY.md

### POST-UAT: o modal de "Perdido" no drag NÃO é aberto de dentro de uma transição async (quick 260828-gna)
Reescrito `pipeline-board.tsx handleDragEnd`: soltar em "Perdido" só enfileira o lead + abre o modal com update **urgente**, sem mover o card; `commitStageChange` (nova `startTransition` normal) move (otimista) + persiste só quando o usuário clica "Salvar motivo"; "Cancelar" só descarta o item da fila. `MotivoPerdaDialog` só bloqueia dismiss por reason `escape-key`/`outside-press` (o `eventDetails.cancel()` incondicional dessincronizava o Base UI).

**Rationale:** o padrão original (abrir o modal via `setState` dentro de `startTransition(async () => await new Promise(...))`) causava deadlock no React 19 — ver Surprises.
**Source:** 11-HUMAN-UAT.md (Teste 5)

---

## Lessons

### `startTransition(async () => { setState(open); await new Promise(nãoResolveAtéOModal) })` = deadlock no React 19
O update de abrir o modal fica preso na transição suspensa; o modal nunca renderiza; o usuário não responde; a Promise não resolve; a transição não assenta; o renderer congela ~30s. O card fica encalhado na coluna de destino sem persistir nem reverter.

**Context:** o plano 11-03 desenhou exatamente esse padrão ("card move otimista + a mesma transição fica pendente aguardando o modal") e o 11-03-SUMMARY afirmou que "a fila `motivoQueueRef` sempre resolve exatamente uma promessa" mitigava T-11-16. Nenhum gate de código (21 asserts de `verify:motivo-perda`, `tsc`) pegou. Só o UAT com navegador pegou.
**Source:** 11-HUMAN-UAT.md vs 11-03-SUMMARY.md

### `eventDetails.cancel()` incondicional num `onOpenChange` de dialog controlado prende o modal
Quando o pai também dirige o `open` (prop controlada), cancelar TODO `!next` dessincroniza o Base UI — o modal fica montado com `data-closed` mas visível. Só cancele os reasons de dismiss-por-gesto.

**Context:** descoberto ao testar o "Cancelar" do modal de Perdido depois do fix do deadlock — o modal não fechava.
**Source:** 11-HUMAN-UAT.md

### Mudança aditiva de schema quebra harnesses que montam o banco por DDL manual
11-01 adicionou `motivoPerdaId` ao `schema.ts` mas não atualizou o `manualAlters` de `test-lead-actions.cjs` — `db.select().from(leads)` (lista todas as colunas do schema) passou a explodir com `no such column: motivo_perda_id`, deixando o harness vermelho ANTES do plano 11-03. Atualizar os `manualAlters` no MESMO plano que muda o schema.
**Source:** 11-03-SUMMARY.md

### `LeadFormDialog` é renderizado em 4 lugares (pipeline, /leads, dashboard /, modal drag)
Uma prop nova obrigatória (`motivosPerda`) tem que ser threadada por todas as 4 superfícies, senão `tsc` falha no fim do plano. O plano 11-03 só citava a do pipeline.
**Source:** 11-03-SUMMARY.md

### `revalidatePath` lança fora do runtime do Next
Harnesses que querem asserir o valor de RETORNO de uma Server Action (não só o efeito no banco) precisam de um stub no-op de `next/cache` via loader encadeado — o molde antigo (`test-lead-actions.cjs`) só tolerava o `throw` e verificava via banco.
**Source:** 11-02-SUMMARY.md

### Automação de navegador para dnd-kit + modais precisa de janela visível
dnd-kit não responde de forma confiável a eventos de ponteiro sintéticos (resultados contraditórios; às vezes entra em autoscroll spin). E a janela do Chrome minimizada (`document.hidden`) congela animações CSS → o Base UI Dialog nunca desmonta após fechar. O combobox criável de Base UI também é difícil de dirigir por automação (o `/leads` provou o fluxo, o drag→modal→combobox→salvar não).
**Source:** 11-HUMAN-UAT.md

---

## Patterns

### CRUD governado de lista extensível = réplica 1:1
Copiar `subnicho-actions.ts` / `subnicho-manager.tsx` / `delete-subnicho-dialog.tsx` trocando só a tabela + a copy.

**When to use:** qualquer lista que o admin gerencia (motivos de perda; no futuro, "serviço desejado", tags livres).
**Source:** 11-02-SUMMARY.md

### Reativação-por-nome de registro soft-deletado
Ao criar um nome que colide com uma linha `deletedAt != null`, regrava a grafia recém-digitada e devolve o id da linha existente — em vez de erro de colisão.

**When to use:** listas governadas com soft-delete onde o admin pode "re-adicionar" um item removido.
**Source:** 11-02-SUMMARY.md

### Combobox criável
O item de ação `Criar "{query}"` entra condicionalmente na própria lista `items` (última linha, ícone `Plus` + cor accent) quando o texto digitado não casa; selecionar chama a create-action DIRETO dentro de `useTransition` (não `useActionState` — precisa do retorno síncrono da Promise); no sucesso usa o `id` retornado pra já selecionar. Erro mantém o popup aberto.

**When to use:** qualquer campo de seleção de uma lista governada onde criar-na-hora agiliza o preenchimento.
**Source:** 11-03-SUMMARY.md

### `z.preprocess('' | null → undefined)` em FK opcional
O input nativo oculto de um combobox emite string vazia quando nada está selecionado; sem o preprocess, `z.coerce.number()` vira `0` e a mensagem de erro é a genérica do Zod, não a copy do domínio.

**When to use:** FK opcional cujo controle emite `""` no lugar de ausência.
**Source:** 11-03-SUMMARY.md

### Agregação SQL num passo só
`count(*)` + `sum(case when stage = 'fechado' then 1 else 0 end)` no mesmo SELECT + `groupBy` — nunca 2 queries nem `.reduce()` em JS. `orderBy(sql\`count(*) desc\`, asc(nome))` para ordenar por agregado com desempate alfabético.

**When to use:** qualquer relatório de contagem/soma por categoria.
**Source:** 11-04-SUMMARY.md

### Funções puras testadas antes do primeiro pixel
`resolvePeriodRange` / `computeTaxaConversao` / `buildLinhasOrigem` provadas por `npm run test:relatorios` PARTE A (sem banco) antes de a tela existir. `buildLinhasOrigem` sempre produz N linhas fixas (2: Inbound→Outbound), preenchendo 0 onde o `GROUP BY` omite a origem — a UI nunca precisa tratar ausência.

**When to use:** lógica de transformação/formatação de dados de relatório.
**Source:** 11-04-SUMMARY.md

### Teste de integração de query = banco SQLite temp em `os.tmpdir()` montado por DDL cru
Só as tabelas/colunas que as queries tocam — não replay das migrations (o snapshot do drizzle-kit diverge do banco real desde a Fase 4). Timestamps em segundos epoch. Mutação-e-revert do arquivo real (`perl -pi` + `git checkout --`) para provar que um gate acusa a regressão que deve acusar.

**When to use:** provar comportamento de uma query Drizzle sem subir o app inteiro.
**Source:** 11-04-SUMMARY.md

### Divisão servidor/cliente no filtro por querystring
A página (server) decide o default (`ausente → 30d`) e o fallback (`inválido → tudo`) e passa `value` já normalizado; o componente client só faz `router.push('?...', { scroll: false })` com `new URLSearchParams(searchParams)` sobrescrevendo só a chave alvo. O client NÃO chama a função de resolução de range.

**When to use:** qualquer filtro de listagem/relatório dirigido por URL.
**Source:** 11-05-SUMMARY.md

### `<Select>` do Base UI: passar `items` ao Root + modal aberto de `onDragEnd` é update urgente
(a) `<Select items={OPCOES as { value; label }[]}>` para o `<SelectValue />` resolver value→label no gatilho fechado — sem isso ele mostra o token cru. (b) Abrir um modal de dentro de um callback do dnd-kit (`onDragEnd`): `setState` **urgente** (fora de qualquer transição); a ação persistente vai numa NOVA `startTransition` só quando o usuário confirma no modal.

**When to use:** (a) qualquer `<Select>` controlado do Base UI; (b) qualquer fluxo "drag → modal de confirmação → persiste".
**Source:** 11-HUMAN-UAT.md (quick 260828-flg + 260828-gna)

---

## Surprises

### O padrão anti-órfão do plano 11-03 (T-11-16) era ele mesmo um deadlock
O 11-03-SUMMARY afirmou explicitamente que "o modal não-dispensável + a fila `motivoQueueRef` que sempre resolve exatamente uma promessa" mitigava T-11-16 (drag órfão). Na prática o modal **nunca abria** — a Promise que o resolveria estava presa na transição async que o bloqueava.

**Impact:** PERDA-01 não funcionou pela UX primária (drag no /pipeline) até o quick 260828-gna, pós-UAT. Só funcionava pelo formulário de `/leads`. Nenhum dos 12 gates automatizados detectou.
**Source:** 11-HUMAN-UAT.md vs 11-03-SUMMARY.md

### O verificador achou 2 promessas que o executor "folded" silenciosamente
(a) `scripts/verify-motivos-perda-schema.cjs` — prometido em 3 lugares (11-01 must_haves, Task 3 acceptance, 11-VALIDATION) — nunca criado; a cobertura "dobrada" em `verify-schema.cjs` NÃO checa FK, colunas exatas, 6 seeds, nullability nem órfãos. (b) Drift FK: `leads.motivo_perda_id` gravada `ON DELETE NO ACTION` no banco real vs `onDelete: "restrict"` no `schema.ts` — a DDL da migração 11-01 omitiu `ON DELETE RESTRICT`.

**Impact:** nenhum bloqueia o goal (verificado à mão contra o banco; `guard-no-hard-delete` verde; 0 referências hoje), mas ambos são débito de "a promessa não bate com a entrega". Candidatos a gap-closure.
**Source:** 11-VERIFICATION.md

### `npm run build` não rodou em nenhum dos 5 planos
Host de 4GB RAM esgota memória na fase "Running TypeScript" do `next build` (3 tentativas mortas por OOM já na Fase 10-04). `npx tsc --noEmit` isolado é o único gate de tipos há 6 fases (06–11).

**Impact:** débito de infraestrutura acumulado — rodar `next build` numa máquina com mais RAM antes de qualquer deploy.
**Source:** os 5 SUMMARYs

### 11-01 foi interrompido por limite de sessão (429) com as tasks commitadas mas sem SUMMARY
O executor morreu no reset de quota; as 3 tasks já estavam commitadas mas faltava o SUMMARY e a marcação no ROADMAP — o orquestrador teve que escrever o SUMMARY depois pela evidência do `git log`.

**Impact:** confirmou o valor do commit-por-task — quando a sessão morre, o trabalho está salvo e recuperável.
**Source:** 11-01-SUMMARY.md

### Primeira fase do projeto com UAT de navegador de verdade — e foi ela que pegou o bug
As Fases 01–10 registram todas "sem navegador nesta sessão, human-check recomendado". A Fase 11 foi a primeira com UAT executado (automação claude-in-chrome), e foi exatamente esse UAT que pegou o deadlock do drag que 10 fases de gates de código nunca pegariam.

**Impact:** o UAT com navegador não é opcional para features de UI interativa — é a única camada que pega esse tipo de bug.
**Source:** 11-HUMAN-UAT.md
