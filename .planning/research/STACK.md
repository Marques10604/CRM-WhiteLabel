# Stack Research

**Domain:** 6 features novas sobre um CRM Next.js/Drizzle/SQLite já em produção (solo, local-first) — milestone v1.3 "Qualificação e Histórico de Leads": separação Inbound×Outbound, timeline de interações, sequência de follow-up escalonada, painel de métricas por origem/sub-nicho, relatório de motivos de perda, agenda/tarefas soltas
**Researched:** 2026-08-01
**Confidence:** HIGH

## Recommendation em uma frase

**Quase zero pacotes novos.** As 6 features do v1.3 são, em sua maioria, **novos padrões de dados reaproveitando o que já está instalado** (o padrão `subnichos` — tabela extensível com soft-delete — se repete para origens e para os passos da sequência de follow-up; `Drizzle` já sabe fazer `GROUP BY`/`COUNT` sem lib extra). O único candidato a dependência genuinamente nova é uma lib de gráficos para o painel de métricas — e a recomendação é **não instalar nada no MVP** (tabelas + barras em CSS puro, via shadcn `Table`/`Badge`, respondem a "quantos leads por origem/sub-nicho" perfeitamente bem para 1 usuário) e só considerar Recharts (via `shadcn add chart`) depois, se o admin pedir explicitamente um gráfico de tendência ao longo do tempo.

## Recommended Stack

### Core Technologies (já instaladas — nenhuma mudança)

| Technology | Version | Purpose nas 6 features novas | Por que é suficiente |
|------------|---------|-------------------------------|------------------------|
| Drizzle ORM (`sql`, `count`, `.groupBy()`) | 0.45.2 (já instalado) | Todas as agregações do painel de métricas e do relatório de motivos de perda | Drizzle expõe `count()` e `.groupBy()` nativamente sobre o query builder — não é preciso uma lib de "analytics" ou "BI" separada para somar/agrupar linhas de uma tabela SQLite. Isso ainda não existe em `src/db/queries.ts` (primeira vez que o projeto agrega dados), mas é o mesmo builder já usado para tudo, sem API nova a aprender. |
| react-hook-form (`useFieldArray`) | 7.82.0 (já instalado) | Editor da sequência de follow-up escalonada (N intervalos configuráveis) | `useFieldArray` já faz parte da mesma versão instalada — é o hook padrão do RHF para listas dinâmicas de campos (adicionar/remover um "passo" da sequência), não requer pacote adicional. |
| Zod | 4.4.0 (já instalado) | Validação da lista de intervalos (`z.array(z.number().int().positive())`), do formulário de tarefa solta, do formulário de origem | Mesmo padrão de validação já usado em todo Server Action do projeto. |
| date-fns | 4.4.0 (já instalado) | Cálculo de "próximo follow-up sugerido" (data atual + intervalo[N] dias), destaque de tarefa vencida na agenda | Mesma função `differenceInDays`/`addDays` já usada no dashboard e no cálculo de "esfriando" por etapa (Fase 7). |
| better-sqlite3 + WAL | 12.11.1 (já instalado, `journal_mode = WAL` já ativo em `src/db/client.ts:6`) | Escrita/leitura da nova tabela `interacoes` (timeline) | Ver seção dedicada abaixo — a escala do projeto (milhares de leads, dezenas de interações cada) está muitas ordens de grandeza abaixo do que justificaria trocar de engine ou adicionar tooling de time-series. |

### Supporting Libraries (novas — avaliar caso a caso)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Nenhuma obrigatória para os itens 1, 2, 3, 5 e 6.** | — | — | Ver "Padrões de dados novos" abaixo — são todos schema + Server Actions + UI reaproveitando shadcn/RHF/Zod já instalados. |
| `recharts` (via `npx shadcn add chart`, **não instalar recharts direto**) | 3.10.1 (mais recente confirmada em npm, ago/2026) | Item 4 (painel de métricas) **somente se** o admin quiser gráfico de linha/barra visual além de tabela/números | Opcional e adiável. Ver "Painel de métricas: o que de fato precisa" abaixo — recomendação é começar sem essa lib. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Drizzle Kit (`drizzle-kit generate` + migração manual de backfill) | Gerar as migrações das novas tabelas (`origens`, `interacoes`, `tarefas`, passos da sequência) e da migração de dados de `leads.origem` (texto livre) → `leads.origem_id` (FK) | Mesmo padrão já documentado no projeto para colunas nullable sem default (comentário em `src/db/schema.ts:48`) — migração custom com backfill explícito, não `db push`. A migração de `origem` é a mais delicada: exige popular `origens` com os valores distintos já usados nos leads existentes antes de trocar o tipo da coluna (ver detalhe abaixo). |
| `npm run guard:no-hard-delete` | Guard já existente no projeto | Rodar depois de criar `origens` e `tarefas` — ambas são "entidades removíveis" no sentido do padrão LEAD-04 (soft-delete via `deletedAt`), então devem seguir a mesma regra que `subnichos`. |

## Padrões de dados novos (reaproveitando o stack existente, sem pacote novo)

Isto é o núcleo da resposta — cada um dos 6 itens do milestone é resolvido por um **novo padrão de schema/query**, não por uma nova dependência.

### 1. Inbound × Outbound → nova tabela `origens` (mesmo padrão de `subnichos`)

A pergunta do milestone pede para avaliar se `leads.origem` (hoje `text("origem").notNull()`, texto livre) precisa virar campo governado. **Resposta: sim.** Motivo concreto, não hipotético: os itens 1 e 4 dependem de **filtrar e agregar por origem de forma confiável** (automação condicional por inbound/outbound, e depois `GROUP BY origem` no painel de métricas). Texto livre quebra os dois — "Instagram Ads", "instagram ads", "Anúncio Instagram" viram 3 grupos diferentes num `GROUP BY`, e nenhuma automação consegue decidir "isso é inbound" de forma confiável em cima de string arbitrária.

O projeto já tem exatamente esse problema resolvido para sub-nichos (`subnichos`: tabela própria, soft-delete, índice único em `lower(trim(nome))`). Recomendação: repetir o padrão.

```typescript
export const origens = sqliteTable(
  "origens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(), // ex: "Instagram Ads", "Indicação", "Prospecção fria"
    tipo: text("tipo", { enum: ["inbound", "outbound"] }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("origem_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("origens_deleted_at_idx").on(table.deletedAt),
    index("origens_tipo_idx").on(table.tipo),
  ]
);
```

`leads.origem` (texto livre) vira `leads.origemId` (FK, `onDelete: "restrict"`, mesmo padrão de `subnichoId`). **Isso é uma migração de dados, não só de schema**: antes de trocar o tipo da coluna, rodar uma migração custom que (a) extrai os valores distintos hoje em `leads.origem`, (b) insere cada um em `origens` com um `tipo` — provavelmente o admin precisa classificar manualmente cada valor distinto existente uma única vez (uma tela de "resolver origens pendentes" ou uma migração de dados assistida), já que "inbound vs outbound" não é dedutível do texto sem revisão humana. Dado o volume do projeto (milhares de leads, mas provavelmente dezenas de valores *distintos* de origem, não milhares), isso é um trabalho de minutos, não um problema de escala.

### 2. Timeline de interações → nova tabela `interacoes`

```typescript
export const interacoes = sqliteTable(
  "interacoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
    tipo: text("tipo", { enum: ["whatsapp", "instagram", "ligacao", "nota", "sistema"] }).notNull(),
    texto: text("texto").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("interacoes_lead_id_created_at_idx").on(table.leadId, table.createdAt),
  ]
);
```

O índice composto `(leadId, createdAt)` é o único cuidado real de performance aqui, e cobre a única query que a timeline realmente faz: "todas as interações de um lead, ordenadas por data". Sem esse índice, cada abertura da tela de um lead faria um table scan sobre `interacoes` inteira; com ele, é um seek direto — SQLite resolve isso em microssegundos em qualquer escala plausível para este projeto.

### 3. Sequência de follow-up escalonada → nova tabela relacional, não JSON

Achado relevante ao ler `schema.ts`: **a tabela `templates` já tem `tipo` com o valor `"prova_valor"`** (`text("tipo", { enum: ["primeiro_contato", "follow_up", "prova_valor"] })`, linha 22). Ou seja, o pedido do todo ("templates de reforço de valor/prova social" para a sequência escalonada) já tem infraestrutura parcial pronta desde a Fase 4 — falta só a tabela que liga um "passo" da sequência a um template existente.

Por isso a recomendação é uma tabela relacional (`sequencia_passos`), **não** uma coluna JSON solta com um array de dias: um JSON `[4, 10, 20]` não tem onde pendurar "qual template usar em cada passo", e reinventaria em JSON algo que já existe como tabela relacional (`templates`).

```typescript
export const sequenciaPassos = sqliteTable(
  "sequencia_passos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ordem: integer("ordem").notNull(), // 1, 2, 3...
    diasAposAnterior: integer("dias_apos_anterior").notNull(), // +4, +10...
    templateId: integer("template_id").references(() => templates.id, { onDelete: "restrict" }), // nullable = sem template sugerido
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("sequencia_passos_ordem_unique_idx").on(table.ordem)]
);
```

Isso continua sendo global (uma sequência única para o CRM, não por sub-nicho) até haver sinal real de que sub-nichos diferentes precisam de cadências diferentes — ponto em aberto, ver Gaps.

### 4. Painel de métricas: o que de fato precisa

A pergunta central do milestone. Resposta direta: **sim, SQL de agregação simples + tabela/números é suficiente — não é preciso lib de gráfico para o MVP.**

- **Camada de dados:** Drizzle já resolve isso sem lib nova — `db.select({ origem: origens.nome, total: count() }).from(leads).innerJoin(origens, ...).groupBy(origens.nome)` é o padrão idiomático (`count` e `groupBy` são parte do core do query builder desde muito antes da versão 0.45.2 instalada, não é uma feature nova sendo introduzida na dependência).
- **Camada visual (MVP, recomendado):** shadcn `Table` (já no projeto) para as tabelas de "leads por origem", "taxa de conversão por sub-nicho"; para uma visualização proporcional simples, uma barra horizontal feita com uma `<div>` cujo `width` é `%` calculado no server (sem lib — é CSS, o mesmo tipo de coisa que o board Kanban já faz com contagem por coluna). Isso cobre 100% do que "painel de métricas por origem e sub-nicho" pede: contagens, proporções, taxa de conversão.
- **Camada visual (upgrade opcional, não MVP):** se depois de usar o painel por um tempo o admin sentir falta de um gráfico de tendência (ex: "leads por semana ao longo do tempo" — isso não é uma barra proporcional simples, é uma série temporal), aí sim vale `npx shadcn add chart`, que instala `recharts` (3.10.1, confirmado no npm em ago/2026) como dependência real e gera componentes já com o tema do shadcn. **Ressalva de compatibilidade:** há relatos de conflito de peer dependency entre Recharts 3.x e React 19 por causa do pacote `react-is` (Recharts declara uma faixa de peer dep que o npm resolve de forma conservadora) — solução conhecida é adicionar um `overrides` (ou `resolutions`, no Yarn) fixando `react-is` na mesma versão do React instalado (`19.2.7`) no `package.json`, ou instalar com `--legacy-peer-deps`. Confiança MÉDIA nesse detalhe (relato de comunidade, não documentação oficial do Recharts) — vale confirmar com `npm install` real no momento de adotar, não antes.

**Por que não uma lib de BI/dashboard pronta** (Metabase, Tremor como pacote de UI completo, Observable Plot, Nivo, visx): todas essas são ferramentas dimensionadas para múltiplos usuários, dashboards compartilhados, ou datasets que justificam uma camada de visualização própria. Aqui é 1 admin, olhando os próprios números, num app que já roda local. Overhead de aprendizado + bundle (Tremor ~200KB, Nivo 500KB+) sem ganho real sobre "tabela + barra de CSS" para o volume de dados deste CRM.

### 5. Relatório de motivos de perda: já dá pra fazer hoje, sem schema novo

`leads.motivoPerda` já existe (Fase 3), nullable, texto livre. A query é um `GROUP BY` simples sobre leads com `stage = 'perdido'`. Mesma ressalva do item 1 se aplica: texto livre fragmenta o agrupamento (`"sem orçamento"` vs `"Sem orçamento"` vs `"não tinha orçamento"` viram grupos separados). Recomendação pragmática, **sem migração de schema**: normalizar no `GROUP BY` com `sql`lower(trim(${leads.motivoPerda}))`` — mesmo truque já usado no índice único de `subnichos` (linha 13 do schema atual) — resolve variação de capitalização/espaço sem exigir que `motivoPerda` vire uma tabela governada. Se, depois de ver o relatório rodando, o admin perceber que o mesmo motivo aparece com redações muito diferentes (não só case/espaço), aí sim considerar promover para uma tabela `motivos_perda` (mesmo padrão de `origens`) — mas isso é um passo adiável, não um bloqueador do MVP do relatório.

### 6. Agenda/tarefas soltas → nova tabela `tarefas`

```typescript
export const tarefas = sqliteTable(
  "tarefas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    descricao: text("descricao").notNull(),
    data: integer("data", { mode: "timestamp" }).notNull(),
    concluida: integer("concluida", { mode: "boolean" }).notNull().default(false),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("tarefas_data_idx").on(table.data),
    index("tarefas_deleted_at_idx").on(table.deletedAt),
  ]
);
```

Independente de `leads` (sem FK), exibida junto do dashboard de follow-ups usando o mesmo `date-fns` + mesmo padrão visual de "vencido/próximo" já validado na Fase 4/7. Nenhuma lib nova.

## SQLite e a tabela `interacoes` na escala deste projeto

Pergunta direta do milestone: a timeline de interações é uma tabela que só cresce (nunca se some interações antigas). Vale a pena se preocupar com isso agora?

**Não, não nesta escala.** O projeto trabalha com "alguns milhares de leads". Mesmo num cenário generoso de 30-50 interações por lead ao longo da vida do CRM, isso é algo entre `50.000` e `250.000` linhas em `interacoes` — trivial para SQLite, que rotineiramente lida com dezenas de milhões de linhas num único arquivo antes de qualquer degradação perceptível, desde que as queries usem índice (ver índice composto acima). Não há necessidade de:
- Particionamento ou tabela separada por período (arquivar "interações antigas") — isso é uma técnica para datasets ordens de grandeza maiores, ou para bancos multi-tenant onde o volume por tenant não é previsível. Aqui o teto é conhecido e pequeno.
- Trocar de engine (Postgres, ou um banco de time-series como InfluxDB/Timescale) — não há problema de escrita concorrente (single admin, single processo Next.js local) nem volume que justifique.
- Mudar configuração de `better-sqlite3` — `journal_mode = WAL` já está ativo (`src/db/client.ts:6`), que é exatamente a configuração recomendada para o padrão de acesso deste projeto (poucas escritas, leituras mais frequentes, um único processo). Nenhuma pragma nova é necessária para a tabela `interacoes`.

O único cuidado real é o índice composto `(leadId, createdAt)` já mostrado acima — sem ele, a tela de um lead individual ficaria lenta *a partir de dezenas de milhares de linhas*; com ele, seek instantâneo em qualquer volume razoável para este projeto.

## Installation

```bash
# Nada obrigatório para os itens 1, 2, 3, 5, 6 — são schema (Drizzle) + Server Actions + UI
# reaproveitando pacotes já instalados (drizzle-orm, drizzle-kit, zod, react-hook-form,
# date-fns, shadcn/ui, sonner).

# Opcional, só se/quando o painel de métricas (item 4) precisar de gráfico visual
# além de tabela/números:
npx shadcn@latest add chart
# instala recharts@3.10.x como dependência real do projeto — ver ressalva de
# peer dependency com React 19 na seção "Painel de métricas" acima antes de rodar.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Tabela `origens` (padrão `subnichos`: extensível + `tipo` governado + soft-delete) | Enum fixo direto na coluna `leads.origemTipo` (`text(..., {enum:["inbound","outbound"]})`) sem tabela nova | Só se o admin não precisar de granularidade além de inbound/outbound (ex: nunca quiser ver "quantos leads vieram de Instagram Ads especificamente"). O todo original já lista exemplos de origem específica ("tráfego pago", "prospecção fria") como algo que o admin quer distinguir, então a tabela extensível é a escolha certa aqui — o enum fixo sozinho perderia informação que já existe hoje no campo livre. |
| Tabela relacional `sequencia_passos` (com FK opcional pra `templates`) | Coluna JSON (`text(col, {mode:"json"})`) com array de inteiros `[4, 10, 20]` | Se a sequência NUNCA precisar de template por passo (só os intervalos de dias, sem "reforço de valor" associado) — mas o todo pede explicitamente templates de prova social por reabordagem, então JSON sem relação a `templates` obrigaria uma segunda estrutura de qualquer forma. |
| Tabela + barras CSS (zero lib) para o MVP do painel de métricas | `recharts` via `shadcn add chart` desde o início | Se o admin já sabe, de antemão, que quer visualizar tendência temporal (ex: "leads captados por semana", não só contagem/proporção atual) — nesse caso vale pular direto para Recharts em vez de construir um "gráfico de linha" caseiro em CSS, que não compensa reinventar. |
| Recharts (via componente shadcn) | Chart.js / `react-chartjs-2` | Se preferir um gráfico canvas-based mais leve em cenários de muitos pontos de dados — irrelevante aqui (poucas dezenas de categorias/origens/sub-nichos), mas Chart.js não tem integração pronta com o tema shadcn como Recharts tem via `shadcn add chart`. |
| Recharts | Tremor / Nivo | Nunca para este projeto — Tremor (~200KB) e Nivo (500KB+) empacotam um sistema de design próprio que duplica o que shadcn/ui já resolve; overkill para 1 usuário local. |
| `sql`lower(trim(...))`` na query do relatório de motivos de perda (sem schema novo) | Tabela `motivos_perda` governada (mesmo padrão de `origens`) desde já | Se, depois de rodar o relatório algumas semanas, o texto livre mostrar fragmentação real de significado (não só capitalização) — promover para tabela então, não antecipar. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Ferramenta de BI/dashboard hospedada ou self-host (Metabase, Grafana, Retool) | Resolve um problema de dashboard compartilhado/multi-fonte que este projeto não tem — 1 admin, 1 banco SQLite local, métricas simples de contagem/agrupamento. Adicionar um segundo serviço rodando (host com 4GB de RAM, ver `feedback_4gb_ram_avoid_parallel`) para isso é puro overhead operacional. | `db.select().groupBy()` do Drizzle + tabela/barra na própria UI Next.js já existente. |
| Banco de time-series dedicado (InfluxDB, TimescaleDB) para a tabela `interacoes` | Resolve um problema de volume/cardinalidade de escrita que não existe aqui (dezenas de eventos por dia, não por segundo); trocaria SQLite local por um serviço adicional para um ganho de performance que este projeto nunca vai sentir. | Tabela relacional `interacoes` no mesmo `crm.db`, com índice composto `(leadId, createdAt)`. |
| Coluna JSON solta para armazenar a sequência de follow-up | Perde a capacidade de referenciar `templates` por passo (FK), e perde `NOT NULL`/tipo/índice — o SQL relacional já resolve isso de forma mais verificável, e é o mesmo padrão usado no resto do schema do projeto (nenhuma outra tabela usa JSON hoje). | Tabela `sequencia_passos` (ver acima). |
| Instalar `recharts` direto (sem passar pelo `shadcn add chart`) | Perderia o tema/paleta consistente com o resto do app (shadcn) e a integração pronta com `ChartContainer`/tooltip/legenda que o CLI gera — teria que recriar manualmente o que o componente do shadcn já entrega. | `npx shadcn add chart` (mesmo pacote `recharts` por baixo, mas com o wrapper certo). |
| Adicionar gráfico de qualquer tipo antes de ter dado confiável de origem/timeline | O próprio todo do item 4 já registra essa dependência ("painel de métrica antes de ter dado de qualidade é só um gráfico bonito sem significado") — vale como princípio de sequenciamento de stack também: não vale a pena decidir a lib de gráfico antes dos itens 1 e 2 estarem entregando dado limpo pra agregar. | Fazer 1 (origens) e 2 (interações) primeiro; decidir a necessidade real de gráfico só ao chegar no item 4. |

## Stack Patterns by Variant

**Se a sequência de follow-up (item 3) precisar variar por sub-nicho no futuro** (hoje o todo descreve uma sequência única/global):
- Adicionar `subnichoId` nullable em `sequenciaPassos` (`null` = regra padrão global, preenchido = override por sub-nicho) em vez de duplicar a tabela inteira.
- Porque: mesma lógica de "exceção sobre a regra padrão" já usada em `configuracoes` (dias-parado por etapa é uma linha singleton hoje, mas o padrão de "override específico" é direto de estender sem redesenhar).

**Se o volume de leads crescer 10-100x além do "alguns milhares" atual** (fora do horizonte deste milestone, mas vale registrar o gatilho):
- Reavaliar `interacoes` para paginação obrigatória na timeline (hoje: lista completa por lead, ok porque um único lead nunca terá milhares de interações mesmo em escala) e considerar `VACUUM`/`ANALYZE` periódicos.
- Ainda não migrar de SQLite — o gatilho de troca de engine already documentado no `STACK.md` anterior do projeto é ">1 escritor concorrente", não volume de linhas.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `drizzle-orm@0.45.2` | `count()` / `.groupBy()` no query builder | Recursos estáveis do core do Drizzle, não uma feature nova sendo adotada — mesma versão já instalada no projeto resolve as agregações dos itens 4 e 5 sem bump de versão. |
| `recharts@3.10.1` (se adotado) | `react@19.2.7` | Relatos de comunidade (GitHub issues, não documentação oficial do Recharts) apontam conflito de peer dependency por causa de `react-is` — mitigar com `overrides` no `package.json` fixando `react-is` em `19.2.7`, ou `npm install --legacy-peer-deps`. Confiança MÉDIA — confirmar no momento real da instalação. |
| `react-hook-form@7.82.0` | `useFieldArray` | Já parte da API pública da versão instalada — nenhuma mudança de versão necessária para o editor de sequência escalonada. |

## Sources

- Leitura direta de `src/db/schema.ts`, `src/db/client.ts`, `src/db/queries.ts` do projeto — HIGH confidence (código-fonte real, não inferência)
- `.planning/todos/pending/2026-08-01-*.md` e `2026-07-21-sequencia-follow-up-escalonada.md` — HIGH confidence (requisitos e raciocínio já registrados pelo usuário)
- WebSearch "shadcn/ui chart component recharts npm version 2026" — confirma que o componente `chart` do shadcn usa Recharts por baixo, instalável via `npx shadcn add chart` — MEDIUM confidence (WebSearch, cross-referenciado com `ui.shadcn.com`)
- WebFetch `https://ui.shadcn.com/docs/components/chart` — confirma "We use Recharts under the hood" e comando de instalação — HIGH confidence (documentação oficial)
- WebSearch "recharts npm latest version bundle size 2026" — Recharts 3.10.1, ~136KB gzip — MEDIUM confidence (Bundlephobia + npm, não Context7)
- WebSearch "recharts 3.10 peer dependencies react 19 compatibility" — conflito de peer dep com `react-is` em React 19, mitigável com override — LOW-MEDIUM confidence (relatos de GitHub issues de terceiros, não changelog oficial do Recharts; vale reconfirmar na instalação real)
- WebSearch "SQLite indexing interaction log table timestamp lead_id best practice" — confirma padrão de índice composto `(entidade_id, timestamp)` para tabelas de log/timeline — MEDIUM confidence (múltiplas fontes convergentes sobre prática já bem estabelecida, não específica de versão)
- Context7 não disponível neste ambiente (sem `mcp__context7__*` nas ferramentas concedidas); fallback CLI (`npx ctx7`) não foi necessário pois as bibliotecas relevantes (Drizzle, RHF, date-fns) já estavam validadas na pesquisa da milestone anterior e não mudaram de versão

---
*Stack research for: 6 features do milestone v1.3 (Qualificação e Histórico de Leads) sobre CRM Next.js/Drizzle/SQLite existente*
*Researched: 2026-08-01*
