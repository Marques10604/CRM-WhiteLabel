# Architecture Research — Integração v1.3 (Qualificação e Histórico de Leads)

**Domínio:** CRM solo (Next.js 16 App Router + Server Actions + Drizzle/better-sqlite3), integração de 6 features novas sobre schema existente
**Pesquisado em:** 2026-08-01
**Confiança:** HIGH — baseado em leitura direta do código-fonte atual (`src/db/schema.ts`, `src/actions/lead-actions.ts`, `src/db/queries.ts`, `src/lib/validations.ts`, `src/components/*`), não em busca externa. Este milestone é integração contra uma arquitetura já estabelecida, não adoção de tecnologia nova — não há lookup de biblioteca externa a fazer aqui.

> Este arquivo substitui a versão anterior (pesquisa do milestone v1.2, 2026-07-30, sobre auto-avanço/contador/configurações de dias-parado — já implementada e concluída). O conteúdo abaixo é específico do milestone v1.3 (6 features novas). O histórico da versão v1.2 continua disponível no histórico do Git deste arquivo.

## Estado Atual (o que já existe, relevante para as 6 features)

- `leads.origem` é **texto livre**, sem governança. Import de CSV grava `"Importação CSV"` como default (`src/lib/csv-import.ts:53`) para toda linha sem coluna mapeada — ou seja, **hoje praticamente 100% dos leads importados em lote têm o mesmo valor de origem**, e o campo é usado como variável de personalização em templates (`{origem}`, `src/lib/whatsapp.ts`). Ele não foi desenhado para ser filtrável/agrupável — foi desenhado para ser lido pelo lead na mensagem.
- Não existe rota de detalhe de lead (`/leads/[id]`). Toda edição de lead acontece num modal (`LeadFormDialog`), aberto a partir do dashboard, de `/leads` (tabela) ou do board `/pipeline` (cards).
- `registerWhatsAppContact` (`src/actions/lead-actions.ts`) é o único ponto de mutação que já reage a um envio de WhatsApp: incrementa `contactAttempts`, faz SELECT fresco (nunca confia em estado do cliente) e condicionalmente avança `novo → contatado`. É o ponto de extensão natural para timeline e sequência escalonada, não um lugar novo.
- `guard:no-hard-delete` (`scripts/guard-no-hard-delete.cjs`) é **escopado nominalmente** a `leads` e `subnichos` — não é uma regra genérica "nenhuma tabela pode ter DELETE". `templates` já tem hard-delete legítimo (D-13, fora do escopo da guarda). Isso importa para as tabelas novas: **nenhuma delas herda soft-delete automaticamente** — é uma decisão de design por tabela, não uma obrigação transversal.
- `configuracoes` é uma tabela singleton (`id` fixo = 1, sem `autoIncrement`) para settings globais editáveis via Server Action de upsert — é o precedente direto para "um valor de configuração administrável" (dias-parado por etapa). Sequência escalonada tem forma diferente (uma **lista ordenada**, não um valor escalar), então não é um upsert simples na mesma tabela — precisa de uma tabela própria (padrão mais parecido com `subnichos`/`templates` do que com `configuracoes`).
- `src/db/queries.ts` concentra leitura pura (`getActiveDashboardLeads`, `groupLeadsByUrgency`, `getConfiguracoes`); `src/actions/*.ts` concentra mutação via Server Action. Essa separação leitura/escrita já é a convenção do projeto e deve ser preservada para as 6 features.
- Nenhuma tabela hoje usa coluna JSON — todo dado estruturado é normalizado em colunas/tabelas próprias (`subnichos`, `templates`, enums via `text({enum:[...]})`). Isso é um sinal de convenção deliberada (reforçado pelo próprio STACK.md do projeto: "Drizzle's output is transparent and debuggable" é citado como razão de escolha do ORM) — features novas devem seguir o mesmo padrão relacional, não introduzir a primeira coluna JSON do projeto sem motivo forte.

---

## (a) Inbound × Outbound: coluna nova em `leads`, não derivação de `origem`

**Decisão: nova coluna `origemTipo` em `leads`, enum fechado, não uma tabela de mapeamento sobre `origem`.**

Por quê não derivar de `origem`:
1. `origem` hoje é dominado por um único valor de import em lote (`"Importação CSV"`) — não há sinal suficiente nele hoje para separar inbound/outbound de forma confiável nem retroativa.
2. `origem` é usado como variável de mensagem (`{origem}`) — precisa continuar livre para carregar detalhe específico ("Facebook Ads — Campanha X", "Indicação Dra. Fulana"), o que é informação complementar à classificação inbound/outbound, não substituta dela. Forçar `origem` a virar um enum quebraria a personalização de template existente.
3. Uma tabela de mapeamento (`origem` → tipo) exigiria manter uma lista de todo texto livre já digitado por trás de uma tabela de lookup, e continuaria falhando para toda `origem` nova digitada no futuro sem manutenção manual constante — trabalho maior que o problema que resolve.

Por quê coluna direta (enum) e não uma tabela governada estilo `subnichos`:
- `subnichos` é uma lista **aberta e crescente**, curada pelo admin (motivo de ser uma tabela própria com soft-delete). Inbound×Outbound é uma **dicotomia de negócio fechada** (2 valores, definidos pelo domínio, não pelo usuário) — o mesmo padrão já usado em `leads.canal` (`text("canal", { enum: ["instagram","whatsapp"] })`). Reaproveitar o padrão `canal` é mais consistente do que inventar uma segunda forma de "lista governada" para um caso que não precisa de extensibilidade.

**Shape recomendado:**
```ts
origemTipo: text("origem_tipo", { enum: ["inbound", "outbound"] })
  .notNull()
  .default("outbound"), // hoje 100% do fluxo real é prospecção fria/import em lote
```
Índice: `index("leads_origem_tipo_idx").on(table.origemTipo)` (mesmo padrão de `stage`/`subnichoId`).

**Pontos de integração necessários:**
- `leadSchema` (Zod) ganha `origemTipo: z.enum(["inbound","outbound"]).default("outbound")`.
- `LeadFormDialog`: campo select novo (Radio/Select) — outbound como default para não quebrar leads criados manualmente hoje.
- Wizard de importação CSV (`csv-column-mapper.tsx`, `csv-import-wizard.tsx`, `lib/csv-import.ts`): novo `CsvFieldKey` opcional `origemTipo`, com default `"outbound"` em `CSV_DEFAULTS` (hoje o cowork entrega leads de prospecção fria — quando o usuário plugar tráfego pago, provavelmente será outro fluxo de import ou mapeamento explícito de coluna, não o default atual).
- `registerWhatsAppContact`: é o ponto certo para, futuramente, ramificar comportamento por `origemTipo` (ex.: não auto-avançar `novo→contatado` da mesma forma para inbound). **Não é obrigatório mudar essa lógica na mesma fase que introduz a coluna** — a fase 1 pode se limitar a existir/ser filtrável; ramificação de automação real é natural em conjunto com a fase 3 (sequência escalonada), quando "tratamento diferente" ganha corpo concreto (intervalos diferentes por tipo).
- `pipeline-board.tsx` / dashboard: valor de "fila diferente" do todo original pode começar como um filtro/agrupamento visual (badge ou seção separada) sobre o board/dashboard existentes — não precisa de rota nova.

---

## (b) Timeline de interações: tabela própria com FK, não JSON

**Decisão: nova tabela `interacoes` (FK `leadId → leads.id`), não uma coluna JSON em `leads`.**

Razões:
- SQLite/Drizzle neste projeto não usa JSON em lugar nenhum — introduzir a primeira coluna JSON só para isso quebraria a legibilidade/consistência que motivou a escolha do Drizzle no STACK.md ("SQL-shaped queries...transparent and debuggable").
- Uma timeline precisa ser **ordenável, filtrável por tipo, contável** (ex.: "quantas interações até fechar", insumo direto do painel de métricas, item 4) — tudo isso é trivial com uma tabela indexada e doloroso/lento com um blob JSON que cresce sem limite dentro da própria linha de `leads` (também infla toda leitura de `leads`, mesmo quando a timeline não é necessária, ex. board/dashboard).
- Cada lead pode acumular dezenas de interações ao longo de meses — normalização evita reescrever o JSON inteiro a cada novo registro (single-writer local SQLite tolera bem inserts em tabela própria; reescrita de blob JSON cresce o custo de I/O a cada evento).

**Shape recomendado:**
```ts
export const interacoes = sqliteTable(
  "interacoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    tipo: text("tipo", {
      enum: ["mensagem_enviada", "nota", "mudanca_etapa", "ligacao", "outro"],
    }).notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }), // nullable — nota manual não tem canal
    corpo: text("corpo").notNull(), // texto livre: resumo da nota ou corpo do template enviado
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("interacoes_lead_id_idx").on(table.leadId),
    index("interacoes_created_at_idx").on(table.createdAt),
  ]
);
```

**`onDelete: "cascade"` é uma decisão deliberada e diferente do padrão de `subnichoId` (`onDelete: "restrict"`).** `subnichoId` usa `restrict` porque apagar um sub-nicho com leads vinculados seria uma perda de dado de negócio grave (por isso sub-nicho é soft-delete). Uma interação sem o lead que a originou não tem sentido de existir isoladamente — mas note que `leads` é soft-delete (`deletedAt`), nunca hard-delete, então o `cascade` só dispararia numa hipotética exclusão física da tabela `leads` que a guarda de LEAD-04 já proíbe. Na prática, `cascade` aqui é uma proteção de integridade referencial que nunca deveria disparar em uso normal — mas é a semântica correta caso a guarda um dia seja violada ou uma migração de dado precise limpar teste/seed.

**Soft-delete de interação? Não é necessário no v1.3.** Nenhum requisito pede editar/apagar uma interação já registrada — é um log de fato ocorrido (é assim que uma clínica trata o prontuário, referência usada no próprio todo). `guard:no-hard-delete` **não cobre `interacoes`** (é nominalmente escopado a `leads`/`subnichos` — ver Estado Atual acima), então se uma tela de "corrigir/apagar interação por engano" for pedida depois, hard-delete simples (mesmo precedente de `templates`, D-13) é aceitável sem violar convenção nenhuma. Não adicionar `deletedAt` especulativamente — YAGNI, mesma razão que evitou over-engineering em outras partes do projeto.

**Onde renderizar:** não existe hoje rota `/leads/[id]`. Duas opções:
1. **Recomendado para v1.3:** aba "Timeline" dentro do `LeadFormDialog` existente (Tabs: Detalhes | Timeline) — consistente com o padrão atual 100% modal-based, menor superfície nova.
2. Extrair para `/leads/[id]` como página de detalhe dedicada — mais escalável se a timeline crescer (paginação, filtro por tipo), mas é a primeira rota dinâmica de detalhe do projeto — avaliar só se o modal ficar visivelmente apertado depois que a timeline tiver uso real. Não antecipar essa complexidade agora.

**Autopreenchimento:** estender `registerWhatsAppContact` para inserir uma linha em `interacoes` (`tipo: "mensagem_enviada"`, `canal: "whatsapp"`, `corpo:` o texto do template renderizado) na mesma mutação que já incrementa `contactAttempts` — evita um segundo round-trip e mantém a garantia "nunca perde um envio real" (mesmo SELECT fresco / mesma transação lógica). Mudança de etapa (`updateLeadStage`) pode opcionalmente gerar `tipo: "mudanca_etapa"` — nice-to-have, não bloqueante.

---

## (c) Sequência de follow-up escalonada: computa sugestão sobre `followUpDate`, não precisa de scheduler próprio

**`followUpDate` continua sendo o único campo "próxima ação devida" que dashboard/pipeline/esfriando já leem — não é substituído nem duplicado.** A sequência escalonada não introduz agendamento real (o projeto decidiu deliberadamente contra envio automático — `wa.me` é sempre clique manual, ver Constraints do PROJECT.md); ela só **calcula uma data sugerida** que o admin confirma, exatamente como o resto do fluxo de WhatsApp já funciona.

**Duas peças novas:**

1. **Tabela `followUpSequenciaEtapas`** — lista ordenada e administrável de intervalos (mesma classe de problema que `subnichos`: lista aberta, curada pelo admin, precisa de tela própria — não cabe como colunas fixas em `configuracoes`, que é um valor escalar por etapa, não uma sequência de N passos):
```ts
export const followUpSequenciaEtapas = sqliteTable(
  "follow_up_sequencia_etapas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ordem: integer("ordem").notNull(), // 1, 2, 3... define a posição na sequência
    diasAposAnterior: integer("dias_apos_anterior").notNull(),
    templateTipoSugerido: text("template_tipo_sugerido", {
      enum: ["primeiro_contato", "follow_up", "prova_valor"],
    }), // nullable — sugestão de qual template abrir nesse passo
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("follow_up_sequencia_ordem_unique_idx").on(table.ordem)]
);
```
   Começa como sequência **global** (não por sub-nicho/`origemTipo`) — o próprio todo pede "intervalos crescentes configuráveis", sem mencionar segmentação. Se depois for necessário diferenciar por `origemTipo` (plausível, já que inbound/outbound têm ritmos diferentes por natureza), adicionar uma coluna `origemTipo` nullable nesta tabela é uma migração aditiva simples, não uma reescrita — motivo a mais para sequenciar esta feature **depois** da feature 1 (origemTipo já existe como conceito no schema quando essa extensão for cogitada).

2. **Coluna `sequenciaPosicao` em `leads`** (contador, mesmo padrão de `contactAttempts` — acumula, não é derivado):
```ts
sequenciaPosicao: integer("sequencia_posicao").notNull().default(0),
```
   Incrementada dentro de `registerWhatsAppContact` quando `tipo` é `"follow_up"` ou `"prova_valor"` (não em `"primeiro_contato"`, que é o passo 0/gatilho de entrada no pipeline). A ação passa a calcular e retornar `suggestedNextDate = hoje + followUpSequenciaEtapas[sequenciaPosicao].diasAposAnterior` no valor de retorno (mesmo padrão de `{ advanced: boolean }` hoje) — o cliente usa isso para **pré-preencher** (não gravar automaticamente) o campo `followUpDate` no próximo save do lead, ou oferecer um botão "usar data sugerida". Resetar `sequenciaPosicao` para 0 é uma decisão de produto em aberto (reset ao fechar/perder o lead é o caso óbvio; reset ao voltar para "novo" é discutível) — marcar como pergunta a resolver em `/gsd-discuss-phase` desta fase, não travar aqui.

**Templates de prova de valor:** `templates.tipo` já inclui `"prova_valor"` no enum (schema atual) — a tabela de templates já suporta esse tipo, então esta feature é majoritariamente sobre o cálculo de data + a tabela de etapas, não sobre schema de template novo.

---

## (d) Tarefa avulsa: tabela independente, generaliza o agrupamento por urgência já existente

**Nova tabela `tarefas`, sem FK para `leads`** (é exatamente o requisito — desamarrada de qualquer lead):
```ts
export const tarefas = sqliteTable(
  "tarefas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    descricao: text("descricao").notNull(),
    dataVencimento: integer("data_vencimento", { mode: "timestamp" }).notNull(),
    concluidaEm: integer("concluida_em", { mode: "timestamp" }), // nullable = pendente
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("tarefas_data_vencimento_idx").on(table.dataVencimento),
    index("tarefas_concluida_em_idx").on(table.concluidaEm),
  ]
);
```
`concluidaEm` (não `deletedAt`) porque a semântica é "feita", não "removida" — mais próxima do padrão `stageChangedAt`/timestamps de evento do projeto do que do padrão soft-delete de entidade recuperável. `guard:no-hard-delete` não cobre `tarefas`; uma ação de "excluir tarefa criada por engano" pode ser hard-delete simples sem violar nenhuma convenção (mesmo precedente de `templates`).

**Integração com o dashboard-by-urgência existente:** `groupLeadsByUrgency` (`src/db/queries.ts`) hoje é uma função pura, testável, específica de `Lead[]`, com a janela de datas (hoje / vencidos / próximos 7 dias, limite exclusivo `+8 dias`) como regra de negócio central. Duas tarefas de refactor viáveis:

- **Recomendado:** extrair a lógica de janela de datas para uma função genérica `groupByUrgency<T>(items: T[], getDueDate: (item: T) => Date, now?: Date)`, reaproveitada tanto para `leads` (`getDueDate = lead => lead.followUpDate`) quanto para `tarefas` (`getDueDate = tarefa => tarefa.dataVencimento`). Evita duas cópias divergentes da mesma regra de negócio (o "+8 dias exclusivo" documentado no comentário atual) — se a janela mudar um dia, muda num lugar só.
- `FollowupDashboard` ganha uma segunda fonte de dados (`tarefas` agrupadas pela mesma função) renderizada como seção própria dentro de cada bloco de urgência (Vencidos/Hoje/Próximos 7 dias) — cards de tarefa são visualmente mais simples que cards de lead (sem botão WhatsApp, sem badge de etapa, sem sub-nicho), então **não** tentar unificar lead+tarefa num componente de card único; manter dois tipos de card lado a lado dentro da mesma seção de urgência é mais simples e não força um formato genérico artificial.
- Página inicial (`/`) permanece o "resumo urgente" (igual já é para leads); se o volume de tarefas justificar, uma rota `/agenda` com CRUD completo (criar, editar, marcar concluída, ver histórico concluído) é o equivalente de `/leads` para tarefas — mesma dualidade dashboard-resumido vs. página-completa que já existe para leads. Pode nascer já nesta fase ou ficar para depois, dependendo do apetite do usuário por uma tela de gestão completa vs. só "criar rápido e ver no dashboard".

**Server Actions novas:** `src/actions/tarefa-actions.ts` — `createTarefa`, `updateTarefa`, `toggleTarefaConcluida`, `deleteTarefa` (hard-delete aceitável aqui, ver acima) — segue exatamente o formato `ActionState`/`useActionState` de `lead-actions.ts`.

---

## (e) Métricas e relatório de perda: leitura agregada pura, sem tabela derivada/materializada

**Nenhuma tabela nova de agregação é necessária.** Na escala deste projeto (CRM solo, alguns milhares de leads, um único processo local acessando um arquivo SQLite), `GROUP BY`/`COUNT`/`AVG` direto nas tabelas existentes é instantâneo — introduzir uma tabela materializada criaria um problema novo (quando revalidar? pode ficar stale?) sem ganho de performance real nenhum. Isso vai contra o princípio de "baixa manutenção" que já guiou a escolha de SQLite local no STACK.md do projeto.

**Dependência técnica real vs. dependência "de confiança do dado" (distinção que vale destacar para o roadmap):**
- **Painel de métricas por origem e sub-nicho (item 4)** tem uma dependência técnica **dura** do item 1: não existe `origemTipo` para agrupar sem a coluna existir e estar populada. Não tem dependência técnica dura do item 2 (timeline) — o painel descrito no todo (conversão por origem/sub-nicho) é inteiramente derivável de `leads.origemTipo` + `leads.subnichoId` + `leads.stage`, sem tocar `interacoes`. A dependência citada no todo é mais **de confiança do dado** (querer que `origemTipo` já esteja sendo preenchido de verdade há um tempo antes de confiar num gráfico) do que uma dependência de schema — vale manter a ordem sugerida pelo usuário mesmo assim, mas por essa razão de produto, não por bloqueio técnico.
- **Relatório de motivos de perda (item 5)** não tem dependência técnica de nada novo — `leads.motivoPerda` existe desde a Fase 3. Tecnicamente poderia ser construído a qualquer momento, até antes do item 1. A razão prática para sequenciá-lo junto do item 4 é de **reuso de infraestrutura de UI**, não de dado: as duas são páginas de leitura agregada, fazem sentido debaixo do mesmo item de navegação (`/relatorios`, com abas ou sub-rotas "Métricas" e "Motivos de Perda"), compartilhando o mesmo estilo de Server Component + função de query em `src/db/queries.ts`. Construir as duas no mesmo lote evita montar dois shells de página separados.

**Shape recomendado — tudo em `src/db/queries.ts` (leitura pura, sem Server Action):**
```ts
// exemplo de formato, não literal
export async function getMetricasPorOrigemESubnicho(): Promise<...> {
  return db
    .select({
      origemTipo: leads.origemTipo,
      subnichoId: leads.subnichoId,
      stage: leads.stage,
      total: count(),
    })
    .from(leads)
    .where(isNull(leads.deletedAt))
    .groupBy(leads.origemTipo, leads.subnichoId, leads.stage);
}

export async function getMotivoPerdaBreakdown(): Promise<...> {
  return db
    .select({ motivoPerda: leads.motivoPerda, total: count() })
    .from(leads)
    .where(and(isNull(leads.deletedAt), eq(leads.stage, "perdido")))
    .groupBy(leads.motivoPerda);
}
```
Índice novo recomendado: `index("leads_motivo_perda_idx").on(table.motivoPerda)` — segue o hábito já estabelecido no schema de indexar toda coluna usada em `WHERE`/`GROUP BY` (mesmo padrão de `stage`, `subnichoId`, `deletedAt`), mesmo que a um volume de milhares de linhas o ganho seja marginal — consistência de convenção mais do que necessidade de performance.

Quando `interacoes` (item 2) já existir, ela se torna insumo natural para métricas mais ricas depois (ex.: "número médio de interações até fechar"), mas isso é extensão futura, não requisito declarado nas 6 features — não construir antecipadamente.

---

## Ordem de construção recomendada

A ordem de prioridade do usuário (`.planning/PROJECT.md`, Active) já é 1→2→3→4→5→6. A análise de dependência técnica confirma essa ordem como razoável, com estas notas:

1. **Separação Inbound × Outbound** (`origemTipo` em `leads` + form + wizard de CSV) — fundação. Sem bloqueio técnico anterior. **Bloqueia tecnicamente o item 4** (painel precisa da coluna existir).
2. **Timeline de interações** (`interacoes` + hook em `registerWhatsAppContact`) — sem dependência técnica do item 1, mas toca a mesma superfície de código (`registerWhatsAppContact`, `LeadFormDialog`) — sequenciar logo depois de 1 reduz retrabalho/conflito em vez de reordenar por dependência pura. Pode, em teoria, trocar de posição com o item 1 sem quebrar nada.
3. **Sequência de follow-up escalonada** (`followUpSequenciaEtapas` + `leads.sequenciaPosicao`) — sem dependência dura de 1 ou 2, mas: (a) reaproveita o mesmo ponto de extensão em `registerWhatsAppContact` já mexido no item 2 — fazer os dois em sequência é mais barato; (b) se depois quiser diferenciar intervalo por `origemTipo`, ter o item 1 pronto primeiro evita uma segunda migração na tabela de etapas.
4. **Painel de métricas por origem e sub-nicho** — depende tecnicamente do item 1 (coluna precisa existir). Não depende tecnicamente do item 2, mas depende "de confiança do dado" dele por decisão de produto do usuário.
5. **Relatório de motivos de perda** — sem dependência técnica de nada (o campo já existe desde a Fase 3). Sequenciado junto do item 4 por reuso de infraestrutura de página/rota de relatório, não por bloqueio de dado.
6. **Agenda/tarefas soltas** (`tarefas`) — **totalmente desacoplada das outras 5** (tabela nova sem FK para `leads`, sem tocar schema de lead nenhum). É a única das 6 que poderia ser adiantada para qualquer posição sem risco técnico, caso o usuário queira um "quick win" isolado no meio do roadmap. Mantida por último aqui só por ser a prioridade de negócio mais baixa declarada pelo usuário, não por dependência.

## Padrões a seguir (reforço, não novidade)

- Toda mutação nova é Server Action em `src/actions/*.ts`, retorno `ActionState`, validação Zod em `src/lib/validations.ts` como autoridade server-side, `revalidatePath()` nas rotas afetadas.
- Toda leitura agregada/pura nova vai em `src/db/queries.ts`, nunca inline em Server Component nem embutida dentro de uma Server Action de mutação.
- Nenhuma automação nova deve confiar em estado vindo do cliente para decidir uma transição (mesmo padrão do SELECT fresco em `registerWhatsAppContact`/`updateLeadStage`).
- `deletedAt` nullable é o padrão de soft-delete **apenas** para entidades de negócio recuperáveis (leads, sub-nichos). Tabelas novas (`interacoes`, `tarefas`, `followUpSequenciaEtapas`) não herdam essa obrigação automaticamente — decidir por tabela, e não adicionar `deletedAt` especulativamente onde não há requisito de recuperação.
- Enums fechados (`text({enum:[...]})`) para dicotomias/conjuntos fixos de negócio (`canal`, `stage`, agora `origemTipo`); tabela própria com `id`/`nome` só para listas abertas curadas pelo admin (`subnichos`, e agora `followUpSequenciaEtapas` por ser uma sequência ordenada, não uma dicotomia).

## Anti-padrões a evitar nesta integração

### Transformar `origem` (texto livre) num enum
**O que pareceria natural:** já que o objetivo é "filtrar/agrupar por origem", forçar `origem` a virar `text({enum:[...]})`.
**Por que é errado aqui:** quebraria a variável de template `{origem}` (personalização de mensagem) e o valor de import em lote hoje é quase 100% homogêneo — não há taxonomia real ainda para travar em enum. Manter `origem` livre e adicionar `origemTipo` como campo de classificação separado resolve o requisito sem essa colisão.

### Guardar a timeline como JSON dentro de `leads`
**O que pareceria natural:** um campo `interacoesJson` evita uma tabela/migração nova.
**Por que é errado aqui:** é a primeira coluna JSON do projeto, quebra a filosofia "SQL-shaped/transparente" que motivou escolher Drizzle, e inviabiliza contagens/filtros baratos que o painel de métricas (item 4) e a própria timeline (filtrar por tipo) vão precisar.

### Tratar a sequência escalonada como agendamento real
**O que pareceria natural:** já que existe uma "sequência", parece pedir um job/cron que dispara o próximo contato sozinho.
**Por que é errado aqui:** contradiz uma decisão de escopo já tomada e documentada (`Out of Scope` no `PROJECT.md`) — este projeto nunca envia WhatsApp automaticamente, só sugere e o admin confirma via clique manual em `wa.me`. A "sequência" é puramente um cálculo de data sugerida, sem infraestrutura de scheduler.

## Integration Points (resumo por feature)

| Feature | Tabela nova | Coluna nova em `leads` | Server Action | Query nova | Componente/rota tocado |
|---|---|---|---|---|---|
| 1. Inbound × Outbound | — | `origemTipo` (enum) | `createLead`/`updateLead` (extend) | — | `LeadFormDialog`, wizard CSV (`csv-column-mapper.tsx`, `lib/csv-import.ts`) |
| 2. Timeline | `interacoes` | — | `registerWhatsAppContact` (extend, insert log), novo `src/actions/interacao-actions.ts` p/ nota manual | `getInteracoesByLead` | `LeadFormDialog` (aba Timeline) |
| 3. Sequência escalonada | `followUpSequenciaEtapas` | `sequenciaPosicao` (int) | `registerWhatsAppContact` (extend, incrementa + retorna data sugerida), novo `src/actions/followup-sequencia-actions.ts` (CRUD de etapas) | `getFollowUpSequenciaEtapas` | `/configuracoes` (nova seção) ou rota própria, `LeadFormDialog` (pré-preenchimento de `followUpDate`) |
| 4. Painel de métricas | — | (lê `origemTipo` do item 1) | — (read-only) | `getMetricasPorOrigemESubnicho` | rota nova `/relatorios` (ou `/metricas`) |
| 5. Relatório de perda | — | — (lê `motivoPerda` já existente) | — (read-only) | `getMotivoPerdaBreakdown` | mesma rota `/relatorios`, aba/seção separada |
| 6. Tarefas | `tarefas` | — | `src/actions/tarefa-actions.ts` (create/update/toggle/delete) | `getTarefasAtivas` + `groupByUrgency` genérico | `FollowupDashboard` (nova seção), opcionalmente `/agenda` |

## Sources

- Leitura direta do código-fonte do projeto (`src/db/schema.ts`, `src/db/queries.ts`, `src/actions/lead-actions.ts`, `src/lib/validations.ts`, `src/lib/csv-import.ts`, `src/lib/whatsapp.ts`, `src/components/followup-dashboard.tsx`, `src/components/whatsapp-send-button.tsx`, `src/components/app-sidebar.tsx`, `scripts/guard-no-hard-delete.cjs`, `src/types/index.ts`) — HIGH confidence, fonte primária.
- `.planning/PROJECT.md` (estado do milestone v1.3, decisões e constraints já validadas) — HIGH confidence.
- `.planning/todos/pending/2026-08-01-*.md` e `2026-07-21-sequencia-follow-up-escalonada.md` (requisitos originais dos 6 itens, "Solution: TBD") — HIGH confidence quanto ao problema declarado, este documento resolve o "TBD" com uma proposta concreta de integração.
- Nenhuma consulta a Context7/WebSearch foi necessária — este é um milestone de integração contra uma arquitetura interna já estabelecida (Next.js 16/Drizzle/SQLite já validados no STACK.md do projeto), não uma decisão de tecnologia nova.

---
*Architecture research for: CRM de Leads — Área da Saúde, milestone v1.3*
*Researched: 2026-08-01*
