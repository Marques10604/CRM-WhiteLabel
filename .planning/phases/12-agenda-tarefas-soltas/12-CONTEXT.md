# Phase 12: Agenda / Tarefas Soltas - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

O admin registra um compromisso ou lembrete que **NÃO está amarrado a nenhum lead** (ex: "ligar pro cowork sobre o CSV de agosto", "preparar material de apresentação") e ainda assim recebe destaque de urgência **junto** dos follow-ups de lead — no mesmo dashboard (`/`), sem tela/rota separada.

Tabela `tarefas` **totalmente desacoplada** de `leads` (sem FK). Requisitos: TAREFA-01 (criar tarefa com data + descrição, sem vínculo a lead), TAREFA-02 (aparecem no dashboard de follow-up agrupadas por urgência, mesmo padrão dos follow-ups de lead).

**FORA DE ESCOPO** (REQUIREMENTS.md é explícito — "Sistema de tarefas completo é overkill de PM tool pra 1 usuário"): subtarefas, prioridade, recorrência, notificações/lembretes push, vincular tarefa a lead.

</domain>

<decisions>
## Implementation Decisions

### Estado de conclusão
- **D-01:** "Concluir" **marca a tarefa como concluída** (não deleta). Precisa de coluna de estado — `concluidaEm` (timestamp nullable) recomendado (guarda quando foi feita; `NULL` = pendente).
- **D-02:** Tarefa concluída **some do dashboard** na hora — a query que alimenta as 3 seções de urgência filtra `concluidaEm IS NULL`. **Não há tela/lista de "Concluídas"** nesta fase (deferido). Consequência aceita: marcar errado = recriar a tarefa (sem "desmarcar" pela UI do dashboard, já que ela sumiu). O dialog de edição (D-07) ainda permite desmarcar enquanto a tarefa está aberta ali.

### Distinção visual no dashboard
- **D-03:** Card de tarefa é **enxuto**: só `descrição` + `data` + um ícone de tarefa à esquerda (ex: `ListTodo` / `CheckSquare` do lucide). **SEM** sub-nicho, **SEM** `EtapaBadge`, **SEM** botão de WhatsApp (nada disso se aplica a tarefa). A ausência desses elementos + o ícone já diferencia à primeira vista do card de lead.
- **D-04:** Dentro de cada seção de urgência (Vencidos / Hoje / Próximos 7 dias), tarefas e follow-ups de lead aparecem **intercalados, ordenados por data** (mais urgente primeiro) — não em blocos separados. A ordem cronológica real do dia prevalece sobre a separação lead/tarefa.

### Ponto de criação
- **D-05:** Botão **"Nova tarefa"** (estilo `outline` / secundário) **ao lado de "Novo lead"** (teal / primário) no topo do dashboard. Abre um dialog próprio de tarefa. Também disponível no estado vazio ("Tudo em dia!") junto dos outros CTAs.

### Campos da tarefa
- **D-06:** Campos = **`descrição` (texto) + `data`**. A descrição serve de título (ex: "Ligar pro cowork sobre o CSV de agosto"). **Sem** título separado, **sem** hora (só data — o agrupamento de urgência é por dia). Espelha o mínimo do REQUIREMENTS.

### Interação e exclusão
- **D-07:** Clicar num card de tarefa no dashboard **abre um dialog de edição** (`TarefaFormDialog`, mesmo idioma de `lead-form-dialog.tsx`): editar `descrição` / `data`, botões "Excluir" e "Concluir". **+** um checkbox "concluir" direto no card (ação rápida, `stopPropagation` para não abrir o dialog — mesmo padrão do botão de WhatsApp no card de lead).
- **D-08:** Exclusão de tarefa é **hard-delete** (apaga a linha de vez) — tarefa é descartável por natureza (lembrete cumprido ou cancelado). **Sem `deletedAt`, sem Lixeira.** `tarefas` entra em `scripts/guard-no-hard-delete.cjs` como **exceção documentada** — a única tabela do projeto onde `DELETE FROM` é permitido (comentário explícito no guard citando esta decisão).

### Claude's Discretion
- Formato exato do `TarefaFormDialog` (react-hook-form + zodResolver como os outros forms; date picker = mesmo componente de calendário do `lead-form-dialog.tsx`).
- Nome das Server Actions (`createTarefa` / `updateTarefa` / `concluirTarefa` / `deleteTarefa`) e shape do `ActionState` — seguir o precedente de `motivo-perda-actions.ts`.
- Se `groupLeadsByUrgency` é generalizada para aceitar tarefas ou se nasce uma função irmã genérica `groupByUrgency<T extends { date: Date }>` — decisão do planner/executor, contanto que continue pura e com `now` injetável e testada.
- Ícone lucide exato para a tarefa (confirmar existência em `node_modules/lucide-react`).

### Folded Todos
- **Agenda/tarefas soltas (não amarradas a um lead)** — `.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md`. Problema original: "todo lembrete do CRM é o campo `followUpDate` de um lead específico; não existe jeito de criar uma tarefa solta". `resolves_phase: 12` já no frontmatter do todo. Esta fase resolve exatamente isso — o todo pode ir para `completed/` no fechamento.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos da fase
- `.planning/ROADMAP.md` § "Phase 12: Agenda / Tarefas Soltas" — goal + os 3 Success Criteria (o critério #3 exige distinção visual DENTRO do mesmo agrupamento, sem tela separada)
- `.planning/REQUIREMENTS.md` — TAREFA-01, TAREFA-02 + a tabela "not doing" (linha "Sistema de tarefas completo... é overkill")
- `.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md` — o todo de alto valor que originou esta fase

### Padrão do dashboard de follow-up (a superfície que a fase estende)
- `.planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-CONTEXT.md` — decisões D-01/D-02 (3 seções por urgência, seção vazia omitida), D-03 (criação local sem navegar), D-05 (clicar no item abre dialog de edição)
- `src/components/followup-dashboard.tsx` — a estrutura `sections[]` (`key/label/leads/headerBg/headerText/dateClassName`) que precisa passar a aceitar tarefas
- `src/app/page.tsx` — o Server Component que busca (`getActiveDashboardLeads` + `groupLeadsByUrgency`) e passa pro `FollowupDashboard`
- `src/db/queries.ts` § `groupLeadsByUrgency` — função pura, `now` injetável, buckets Vencidos/Hoje/Próximos-7-dias via `date-fns` (`isBefore` / `isToday` / `addDays(today, 8)`)

### Padrões de infra a copiar
- `src/db/schema.ts` — declaração de tabela nova (ver `motivosPerda` / `subnichos`); `tarefas` NÃO tem FK e NÃO tem `deletedAt`
- `scripts/migrate-motivos-perda.cjs` — molde de migração manual [BLOCKING] via `better-sqlite3` (backup + guarda de idempotência + `CREATE TABLE` + verificação), NUNCA `drizzle-kit`
- `src/actions/motivo-perda-actions.ts` — molde de Server Actions de CRUD (shape homogêneo do `ActionState`, `revalidatePath` num helper)
- `src/components/lead-form-dialog.tsx` — molde de form dialog (react-hook-form + zodResolver, date picker, `noValidate`) para o `TarefaFormDialog`
- `src/components/delete-motivo-perda-dialog.tsx` — molde de confirmação de exclusão não-dispensável
- `scripts/guard-no-hard-delete.cjs` — precisa ganhar `tarefas` no MESMO commit que cria a tabela, como EXCEÇÃO (permite `DELETE FROM tarefas`), com comentário citando D-08
- `src/lib/validations.ts` — `tarefaSchema` (descricao `.min(1)`, data `z.coerce.date()`) espelhando `subnichoSchema` / `motivoPerdaSchema`

### STATE
- `.planning/STATE.md` § Blockers/Concerns — a nota de Phase 9/12: "`interacoes` e `tarefas` precisam entrar em `scripts/guard-no-hard-delete.cjs` no mesmo commit que as cria, com decisão explícita de soft-delete... documentada como D-XX" → resolvido por D-08

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `groupLeadsByUrgency(leads, now?)` (`src/db/queries.ts`) — pura, `now` injetável, testada. Base pra bucketizar tarefas pela mesma régua de urgência (Vencidos / Hoje / Próximos 7 dias = `< today` / `isToday` / `< addDays(today, 8)`).
- `FollowupDashboard` (`src/components/followup-dashboard.tsx`) — o `sections[]` array com header colorido por urgência; o loop `section.leads.map(...)` renderiza cada card. Vai virar `section.items` (união lead|tarefa) ordenada por data.
- `src/app/page.tsx` — o `Promise.all` de queries do dashboard; adiciona `db.select().from(tarefas).where(isNull(tarefas.concluidaEm))` e passa pro componente.
- Padrão de card clicável (`role="button"` + `onClick` + `onKeyDown` Enter/Space) já em `followup-dashboard.tsx` e `pipeline-lead-card.tsx`.
- `stopPropagation` no wrapper de um botão de ação dentro de card clicável (o botão de WhatsApp faz isso) — mesmo idioma pro checkbox "concluir" da tarefa.

### Established Patterns
- CRUD governado de lista extensível = réplica de `subnicho-actions.ts` / `subnicho-manager.tsx` — mas tarefa NÃO é lista governada (não tem "gestão" numa tela `/tarefas`), é mais próxima do fluxo de lead: cria no dialog, edita no dialog, aparece no dashboard.
- Migração de schema = `better-sqlite3` manual, nunca `drizzle-kit push` (snapshot do drizzle-kit diverge do banco real desde a Fase 4).
- `npm run build` volta a ser gate normal desde 2026-08-29 (Next 16.2 usa Turbopack no build — passou limpo no host de 4GB).
- Gates `.cjs` do projeto não são lintados (usam `require()`); harnesses montam banco temp em `os.tmpdir()` por DDL cru.

### Integration Points
- **`src/db/schema.ts`** — nova tabela `tarefas` (`id`, `descricao` text notNull, `data` timestamp notNull, `concluidaEm` timestamp nullable, `createdAt`, `updatedAt`). Índice em `data` e/ou `concluidaEm` (cobre o filtro do dashboard).
- **`src/app/page.tsx`** — junta tarefas pendentes ao dashboard.
- **`src/components/followup-dashboard.tsx`** — renderiza card de tarefa enxuto intercalado; botão "Nova tarefa"; `TarefaFormDialog`.
- **`scripts/guard-no-hard-delete.cjs`** — exceção pra `tarefas`.
- **`src/lib/validations.ts`** — `tarefaSchema`.
- **`src/actions/tarefa-actions.ts`** (novo) — `createTarefa` / `updateTarefa` / `concluirTarefa` / `deleteTarefa`, `revalidatePath("/")`.

</code_context>

<specifics>
## Specific Ideas

- Exemplos de tarefa dados pelo usuário/ROADMAP: "ligar pro cowork", "preparar material", "ligar pro fornecedor", "preparar proposta genérica".
- A distinção visual vem da **subtração** (card enxuto sem os adereços de lead) + 1 ícone — não de cor chamativa nem badge. Manter o dashboard calmo.

</specifics>

<deferred>
## Deferred Ideas

- **Tela/lista de tarefas concluídas** (ver histórico do que já foi feito, reabrir uma concluída) — futuro. Por ora, concluída some e pronto.
- **Hora na tarefa** (não só data) — futuro, se surgir a necessidade de "reunião 14h".
- **Vincular tarefa a um lead opcionalmente** — mudaria a natureza "desacoplada" da tabela; fase própria se um dia fizer sentido.
- **Recorrência / subtarefas / prioridade / notificações push** — explicitamente fora de escopo por REQUIREMENTS.md ("overkill de PM tool pra 1 usuário").

### Reviewed Todos (not folded)
None — o único todo relevante (`2026-08-01-agenda-e-tarefas-soltas.md`) foi folded.

</deferred>

---

*Phase: 12-agenda-tarefas-soltas*
*Context gathered: 2026-08-29*
