---
phase: 12
phase_name: "Agenda / Tarefas Soltas"
project: "CRM de Leads — Área da Saúde"
generated: "2026-08-30"
counts:
  decisions: 7
  lessons: 5
  patterns: 4
  surprises: 4
missing_artifacts: []
---

# Phase 12 Learnings: Agenda / Tarefas Soltas

## Decisions

### Tabela `tarefas` totalmente desacoplada — sem FK, sem `deletedAt`
`tarefas` não tem foreign key para `leads` nem coluna de soft-delete. `concluida_em` é nullable e sem default físico (NULL = pendente).

**Rationale:** O valor da fase é justamente a tarefa que NÃO está amarrada a lead nenhum; uma FK contradiria o requisito. Sem Lixeira nem histórico de concluídas (D-01/D-02), soft-delete seria peso morto — tarefa é descartável por natureza.
**Source:** 12-01-SUMMARY.md, 12-CONTEXT.md (D-01/D-08)

### `tarefas` é a 1ª (e única) entrada na ALLOWLIST do `guard-no-hard-delete.cjs`
`deleteTarefa` faz `db.delete(tarefas)` real — o único hard-delete legítimo do `src/`. O guard isenta o path `src/actions/tarefa-actions.ts` mas mantém intactos os padrões que bloqueiam `.delete(leads/subnichos/interacoes/motivosPerda)` — inclusive dentro desse mesmo arquivo.

**Rationale:** Espelho invertido de LEAD-04: as Fases 9/11 ESTENDERAM o bloqueio; a Fase 12 abre uma exceção cirúrgica escopada a um path exato, nunca a diretório ou padrão.
**Source:** 12-01-SUMMARY.md, 12-SECURITY.md (T-12-03/T-12-10)

### `groupByUrgency<T>` genérico com `groupLeadsByUrgency` preservado como wrapper de 1 linha
A régua de urgência (Vencidos/Hoje/Próximos 7 dias) virou `groupByUrgency<T>(items, getDate, now?)`; `groupLeadsByUrgency` passou a delegar a ela sem mudar assinatura pública nem o tipo `LeadsByUrgency`.

**Rationale:** Generalização sem quebra de call-site — tarefas e follow-ups precisam da MESMA régua (Success Criterion 2), mas os consumidores existentes de `groupLeadsByUrgency` não podem regredir.
**Source:** 12-02-SUMMARY.md

### `buildDashboardItems` mora em `queries.ts` e é função pura
A fusão lead+tarefa → `DashboardItem[]` bucketizado, com cada bucket ordenado por data ascendente, é uma função pura em `queries.ts` (não em `page.tsx`).

**Rationale:** É a ordenação por data de cada bucket que materializa D-04 (intercalação); mantê-la pura a torna testável (`test:group-by-urgency`) e não vaza SQL para a página (mesmo motivo de `getActiveDashboardLeads`).
**Source:** 12-02-SUMMARY.md, 12-04-SUMMARY.md

### `updateTarefa` NÃO filtra `isNull(concluidaEm)` no WHERE; `concluirTarefa` é idempotente por ele
O único guard de `updateTarefa` é o id — o dialog de edição pode editar uma tarefa já concluída (D-07). Já `concluirTarefa` usa `isNull(concluidaEm)` no WHERE (não sobrescreve o carimbo original) e o caminho `desfazer` usa `isNotNull`.

**Rationale:** Editar ≠ concluir. A idempotência pertence só à conclusão/reabertura (espelho de `softDeleteMotivoPerda`).
**Source:** 12-02-SUMMARY.md

### Controle rápido de "concluir" é `Button variant="ghost" size="icon-lg"`, não `<Checkbox>`
D-07 pede "checkbox de concluir no card"; materializado como botão-ícone ghost de 36px com troca `Circle`→`CircleCheck` teal via `group-hover:` / `group-focus-visible:`.

**Rationale:** Não existe primitivo `checkbox` em `src/components/ui/` e `npx shadcn add checkbox` já falhou por memória neste host (precedente: `popover.tsx` escrito à mão). O "padrão" citado por D-07 (`WhatsAppSendButton`) já é um Button ghost com `stopPropagation` — não um checkbox.
**Source:** 12-UI-SPEC.md, 12-03-SUMMARY.md

### `DiscardChangesDialog` mantido no `TarefaFormDialog` mesmo com só 2 campos
O 12-UI-SPEC permitia omitir a guarda de alterações não salvas num form de 2 campos; foi mantida via `form.formState.isDirty`.

**Rationale:** ~15 linhas de custo para paridade 1:1 com `lead-form-dialog.tsx` — vale mais que a economia.
**Source:** 12-03-SUMMARY.md

---

## Lessons

### `npx eslint` sai com exit 0 mesmo reportando `react-hooks/refs` como error neste host
O `eslint` imprimiu o erro `Cannot access refs during render` em `tarefa-form-dialog.tsx` mas retornou exit 0. O gate real do plano é "sem output", não "exit != 0".

**Context:** Falso-positivo conhecido do React Compiler no par `onSubmit={form.handleSubmit(onSubmit)}` + `formRef.current`, já suprimido em `configuracoes-form.tsx` / `lead-timeline-dialog.tsx`. Ao verificar lint escopado, checar a AUSÊNCIA de linhas de erro, não só o exit code.
**Source:** 12-03-SUMMARY.md

### `z.coerce.date()` no schema faz `TarefaFormValues` (via `z.input`) tipar `data` como incerto
`TarefaFormValues = z.input<typeof tarefaSchema>` — o input de `z.coerce.date()` não é `Date`. O `Controller` precisou de `field.value as Date | undefined` e o `defaultValues.data` de um `Date` real (`startOfDay(new Date())`).

**Context:** Sem o `Date` real no default, o `zodResolver` barra o submit em silêncio (o `Calendar` só destaca "hoje", não é seleção). Mesmo Pitfall já documentado em `lead-form-dialog.tsx` para `followUpDate`.
**Source:** 12-03-SUMMARY.md, validations.ts

### A acceptance criteria por `grep` pode conflitar com "não duplicar strings"
O plano 12-03 sugeria extrair o toast de conclusão + "Desfazer" para um helper compartilhado, MAS a acceptance da Task 2 exigia a string literal `Desfazer` DENTRO de `tarefa-card.tsx` por grep. Um helper importado quebraria o gate.

**Context:** Resultado: 3 strings (`Tarefa concluída.` / `Desfazer` / `Tarefa reaberta.`) repetidas entre `tarefa-card.tsx` e `tarefa-form-dialog.tsx`. Quando um plano tem tanto uma instrução de DRY quanto um gate de grep de conteúdo, o gate vence — vale registrar o desvio no SUMMARY.
**Source:** 12-03-SUMMARY.md

### Comentários de código disparam asserções de fonte que proíbem tokens
A asserção "card de tarefa não pode conter `EtapaBadge`/`WhatsAppSendButton`/`Sugestão`" falhou porque o doc-comment do `TarefaCard` mencionava esses nomes ao explicar o que o card NÃO tem.

**Context:** Ao escrever comentários em arquivos cobertos por gates de grep de ausência, evitar citar os próprios tokens proibidos — descrever por perífrase ("sem selo de etapa" em vez de "sem `EtapaBadge`").
**Source:** 12-03-SUMMARY.md (execução)

### O estado vazio do dashboard não é testável no navegador sem um banco dedicado
`totalCount === 0` agora conta tarefas + leads; com 23 leads reais em follow-up, o ramo do estado vazio nunca renderiza. UAT Teste 14 ficou `skipped`.

**Context:** Verificação indireta (leitura de código + `npm run build`) foi suficiente porque a mudança foi 1 string + 1 botão num ramo pré-existente. Para fases futuras que mexam em ramos condicionais dependentes de estado do banco, considerar um `data/crm.test.db` semeado vazio.
**Source:** 12-UAT.md

---

## Patterns

### Generalização de função pura: `fn<T>(items, getDate, now?)` + wrapper delegando o seletor
Extrair a lógica genérica parametrizada pelo seletor de campo (`getDate`) e reescrever a função original como wrapper de uma linha. Assinatura pública e tipos nomeados ficam intactos; call-sites não mudam.

**When to use:** Quando um segundo tipo de dado precisa da mesma lógica de agrupamento/ordenação/filtro que já existe para outro tipo, e não se pode regredir os consumidores atuais.
**Source:** 12-02-SUMMARY.md

### Botão-ícone de ação binária com feedback de estado por `group-hover` / `group-focus-visible`
Dois ícones empilhados no mesmo `<Button className="group">`, alternados por `group-hover:hidden`/`group-focus-visible:hidden` no ícone de repouso e `group-hover:block`/`group-focus-visible:block` no ícone de ação. Sem `useState` de hover; foco por teclado produz o mesmo efeito visual do mouse.

**When to use:** Alternativa ao `<Checkbox>` quando o primitivo não está instalado (ou o registry falha por memória) e a ação é binária + reversível.
**Source:** 12-03-SUMMARY.md, 12-UI-SPEC.md

### `.map` de lista heterogênea ramificando por união discriminada, com o ramo legado movido byte-a-byte
Trocar `items: Lead[]` por `items: DashboardItem[]` (união `{ kind: "lead" } | { kind: "tarefa" }`) e ramificar o `.map` por `item.kind`. O ramo do tipo pré-existente é MOVIDO sem alteração de conteúdo/classe (só `lead` → `item.lead` e `key` prefixada por tipo).

**When to use:** Integrar um segundo tipo de card numa lista que hoje só renderiza um tipo, sem regredir o comportamento do card existente. Gate de acceptance verifica que os adereços do card legado (`EtapaBadge` etc.) continuam presentes.
**Source:** 12-04-SUMMARY.md

### `key` de lista prefixada por tipo quando ids de tabelas diferentes coabitam
`key={`lead-${id}`}` / `key={`tarefa-${id}`}` — ids de `leads` e `tarefas` são sequências independentes e podem colidir dentro da mesma seção.

**When to use:** Qualquer lista React que intercala itens de tabelas com PKs autoincrement independentes.
**Source:** 12-04-SUMMARY.md

---

## Surprises

### O plano 12-03 foi retomado de uma interrupção com a Task 1 no working tree sem commit
A sessão começou com `delete-tarefa-dialog.tsx` + `tarefa-form-dialog.tsx` já escritos mas sem commit, sem `tsc`/`eslint` rodados, e a Task 2 (`tarefa-card.tsx`) nem começada. Sem agente/worktree interrompido, sem `HANDOFF.json`, sem `.continue-here`.

**Impact:** O `safe_resume_gate` (nenhum commit `12-03` no histórico) confirmou que era seguro continuar sem risco de trabalho duplicado. A retomada só precisou: verificar Task 1, adicionar o `eslint-disable`, commitar, fazer Task 2. ~20 min. Reforça o valor de commits atômicos por task — a interrupção não custou nada além da re-verificação.
**Source:** 12-03-SUMMARY.md, STATE.md §Session Continuity

### `isToday` do date-fns compara com o relógio REAL, não com o `now` injetado
`groupByUrgency` recebe um `now?` injetável para testes, mas usa `isToday(d)` internamente, que ignora o `now` e olha `new Date()`. O bucket "hoje" não é 100% determinístico para um `now` histórico.

**Impact:** O harness `test:group-by-urgency` teve que usar `new Date()` real só no caso do bucket "hoje" e `now` fixo nos demais. Quirk herdado de `groupLeadsByUrgency`, não introduzido pela fase — mas só ficou visível ao escrever a 1ª cobertura automatizada da régua.
**Source:** 12-02-SUMMARY.md

### `npm run build` (Turbopack) continua rápido mesmo com a fase inteira — 47s compile + 28.5s TS
Host de 4GB RAM; o `next build` do Next 16.2 usa Turbopack e a fase "Running TypeScript" (que dava OOM com webpack) passou em 28.5s. 13 páginas geradas, exit 0, sem fechar processos antes.

**Impact:** Confirma que o débito "build nunca rodou" das Fases 06-11 está quitado de vez — `npm run build` é gate normal e barato agora.
**Source:** 12-04-SUMMARY.md, STATE.md §Blockers

### A extensão do Claude no Chrome teve instabilidades de screenshot durante a UAT
Screenshots intermitentemente davam timeout ("CDP Page.captureScreenshot timed out") ou `viewport 0x0`; um tab foi fechado sozinho no meio. Mesmo sintoma já registrado na Fase 11 (quick task 260828-gna).

**Impact:** Contornado com `read_page` / `get_page_text` / `zoom` e reloads/navegação fresca. Nenhum resultado funcional afetado — 14/15 testes verificados. Para UATs futuras via navegador: não depender só de `screenshot`; `read_page`/`find` são mais resilientes para asserções estruturais.
**Source:** 12-UAT.md §Notas da execução

---
*Extração conduzida inline com o contexto completo da sessão de execução + UAT.*
