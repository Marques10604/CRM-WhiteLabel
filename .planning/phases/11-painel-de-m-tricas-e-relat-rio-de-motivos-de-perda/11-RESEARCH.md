# Phase 11: Painel de Métricas e Relatório de Motivos de Perda - Research

**Researched:** 2026-08-14
**Domain:** Server-side aggregation reporting (Next.js Server Components) + governed extensible list CRUD (Drizzle/SQLite), dentro de um projeto Next.js 16 + Drizzle + better-sqlite3 já maduro (10 fases anteriores)
**Confidence:** HIGH

## Summary

Esta fase não introduz nenhuma tecnologia nova ao stack — é 100% composição de padrões já existentes e provados no próprio código-fonte deste repositório. Há dois blocos de trabalho:

1. **Governança de `motivos_perda`** — réplica estrutural exata do padrão `subnichos` (tabela com soft-delete via `deletedAt`, unique index case-insensitive, reativação-por-nome-duplicado em `createSubnicho`, tela `/subnichos` com `SubnichoManager`/`DeleteSubnichoDialog`/combobox filtrando `deletedAt === null || id === value`). Todos os arquivos de referência foram lidos linha a linha nesta pesquisa (ver Sources). A única decisão técnica real do planner é o *shape* da FK em `leads` — este documento recomenda uma coluna nova `motivoPerdaId` (nullable, `references(() => motivosPerda.id, { onDelete: "restrict" })`), substituindo a coluna `motivo_perda` (texto livre) atual, em vez de continuar como texto validado contra a lista.

2. **Relatórios agregados** — três agregações SQL (`GROUP BY origemTipo`, `GROUP BY subnichoId`, `GROUP BY motivoPerdaId` com filtro `stage='perdido'`) seguindo o estilo já estabelecido em `getUltimaInteracaoWhatsAppPorLead` (SQL `GROUP BY` via Drizzle, nunca reduzir em JS), com o cálculo de taxa de conversão em uma função pura testável isoladamente, no espírito de `computeSequenciaSugestao`. O filtro de período (`createdAt` para a maior parte da tela, `stageChangedAt` só para a seção de motivos de perda, conforme D-09/D-11) é território genuinamente novo neste projeto — não existe nenhum precedente de filtro de período nem de leitura de `searchParams` em nenhuma página existente (grep confirmou zero ocorrências de `searchParams` em `src/`).

Há também uma integração descoberta durante esta pesquisa que **não estava explicitamente listada no CONTEXT.md**: `src/components/motivo-perda-dialog.tsx` é uma segunda superfície (além de `lead-form-dialog.tsx`) onde `motivoPerda` é capturado hoje — o modal que aparece ao arrastar um card para a coluna "Perdido" no board do pipeline. Hoje ele é **opcional/não-bloqueante** ("Pular" vs "Salvar motivo", texto livre via `<Textarea>`). D-04 (campo obrigatório) e D-03 (criação na hora) tornam essa segunda superfície tão crítica de atualizar quanto `lead-form-dialog.tsx` — ambas precisam trocar de textarea livre para o novo combobox de motivos de perda, e o fluxo "Pular" deixa de fazer sentido (não é mais possível pular um campo obrigatório).

**Primary recommendation:** Réplique a tripla schema→actions→UI de `subnichos` para `motivos_perda` (nova tabela, migração manual via `better-sqlite3` idempotente com backup, `MotivoPerdaCombobox` análogo a `SubnichoCombobox`), troque `leads.motivoPerda` (texto) por `leads.motivoPerdaId` (FK nullable), atualize as DUAS superfícies de captura (`lead-form-dialog.tsx` E `motivo-perda-dialog.tsx`) para usar o combobox com criação-na-hora, e implemente as três agregações do painel de relatórios como funções puras testáveis alimentadas por queries `GROUP BY` em `src/db/queries.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Governança de `motivos_perda` (CRUD, soft-delete) | API/Backend (Server Actions) | Database (SQLite) | Mesmo padrão de `subnicho-actions.ts` — mutação sempre via Server Action, nunca client-side direto ao banco |
| Tela `/motivos-perda` (gestão) | Frontend Server (Server Component) | Browser/Client (formulários inline) | Espelha `/subnichos`: página Server Component busca dados, `MotivoPerdaManager` client component gerencia edição inline |
| Captura de `motivoPerda` ao mover para "Perdido" (2 superfícies) | Browser/Client (combobox + dialog) | API/Backend (validação Zod obrigatória) | `lead-form-dialog.tsx` e `motivo-perda-dialog.tsx` são componentes client; a obrigatoriedade (D-04) é reforçada no servidor via Zod, nunca só no cliente |
| Agregações de métricas (contagem/conversão por origem/sub-nicho/motivo) | API/Backend (Server Component + queries.ts) | Database (SQL `GROUP BY`) | Cálculo 100% server-side na leitura, sem I/O em excesso — mesmo espírito de `computeSequenciaSugestao`/`getUltimaInteracaoWhatsAppPorLead` |
| Tela `/relatorios` (renderização) | Frontend Server (Server Component) | Browser/Client (seletor de período interativo) | Página busca+agrega no servidor; só o filtro de período precisa de interatividade client-side |
| Filtro de período (presets 30d/90d/tudo) | Browser/Client (seletor) | Frontend Server (leitura de `searchParams`) | Decisão do planner (CONTEXT.md Claude's Discretion): querystring vs. estado client — ambos mantêm o cálculo real no servidor |
| Persistência de `leads.motivoPerdaId` | Database (SQLite FK) | — | Coluna nova, `onDelete: "restrict"` mirando o padrão já usado por `subnichoId` |

## Project Constraints (from CLAUDE.md)

- **Next.js Server Actions, não API routes novas** — toda mutação desta fase (CRUD de motivos-perda, atualização de `motivoPerdaId` em leads) deve ser Server Action `"use server"`, seguindo o padrão de `subnicho-actions.ts`/`lead-actions.ts`. Nenhuma rota `/api/*` nova é necessária ou permitida sem justificativa forte.
- **Drizzle ORM + better-sqlite3** — schema em `src/db/schema.ts`, queries via `drizzle-orm/sqlite-core` ou SQL cru via `sql` template do Drizzle (nunca `better-sqlite3` cru fora de scripts `.cjs` de migração/teste).
- **Zod para validação de Server Action input** — `motivosPerdaSchema` deve espelhar `subnichoSchema` (`z.object({ nome: z.string().trim().min(1, ...) })`).
- **Sem framework de teste** — usar `node scripts/*.cjs` com harness `check(condition, message)`, registrados em `package.json` como `npm run test:*`/`verify:*`.
- **Migração manual via `better-sqlite3` direto** — nunca `drizzle-kit push`/`generate` cru para alterar tabelas com dado real (Pitfall documentado desde as Fases 06/07: `drizzle-kit push` já causou "data-loss statement"/prompt TTY e bugs de DEFAULT falsy-check duas vezes neste repositório).
- **`npm run guard:no-hard-delete`** — qualquer tabela nova com soft-delete (`motivos_perda`) deve ser adicionada ao escopo do guard (`CODE_PATTERNS`/`CODE_SQL_PATTERNS` em `scripts/guard-no-hard-delete.cjs`), mesmo padrão já estendido para `interacoes` na Fase 9.
- **Host de 4GB RAM** — comandos de verificação sempre sequenciais, nunca em paralelo; `npm run dev` parado durante gates estáticos (`tsc --noEmit`, `npm run build`).
- **Nomenclatura de schema genérica** (PROJECT.md) — nunca termos específicos de saúde nas colunas/tabelas (já respeitado: `motivos_perda`, `subnichos`, etc. são genéricos).
- **Sem auth/multi-usuário** — `/relatorios` e `/motivos-perda` não recebem nenhum gate de autenticação (ferramenta solo-admin, uso local).
- **`shadcn/ui` copiado como código, não dependência** — qualquer primitivo de UI novo (ex.: `Card`, `Tabs`, se o `/gsd-ui-phase` decidir usá-los) deve ser adicionado a `src/components/ui/` via CLI ou escrito à mão seguindo o padrão Base UI já usado em `combobox.tsx`/`dialog.tsx`/`popover.tsx`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| METRICAS-01 | Admin visualiza contagem/taxa de conversão de leads agrupados por tipo de origem (Inbound/Outbound) | Padrão de agregação `GROUP BY origemTipo` (estilo `getUltimaInteracaoWhatsAppPorLead`); função pura `computeConversaoPorOrigem` testável isoladamente (estilo `computeSequenciaSugestao`); filtro por `createdAt` (D-09) |
| METRICAS-02 | Admin visualiza contagem de leads agrupados por sub-nicho | `GROUP BY subnichoId` com join em `subnichos.nome`; "A categorizar" já é uma linha normal da tabela `subnichos` (confirmado via grep em `csv-import-preview-table.tsx`), não precisa de tratamento especial (D-12) |
| PERDA-01 | Admin visualiza contagem de leads perdidos agrupada por motivo de perda, campo governado | Réplica completa do padrão `subnichos` para nova tabela `motivos_perda`; FK `leads.motivoPerdaId`; `GROUP BY motivoPerdaId WHERE stage='perdido'`, filtrado por `stageChangedAt` (D-11) |
</phase_requirements>

## Standard Stack

### Core (já instalado — nenhuma dependência nova)
| Library | Version (confirmada em package.json) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.2 | Query builder + schema para `motivos_perda`, agregações `GROUP BY` | Já é o ORM único do projeto; `sql` template para `GROUP BY`/`COUNT`/agregações, mesmo estilo de `getUltimaInteracaoWhatsAppPorLead` |
| better-sqlite3 | ^12.11.1 | Driver SQLite + scripts de migração manual (`.cjs`) | Mesma engine usada em todas as migrações anteriores (06-01 a 10-01) |
| date-fns | ^4.4.0 | Cálculo de presets de período (30d/90d), comparação de datas | Já em uso em `queries.ts`/`pipeline/page.tsx` (`addDays`, `isBefore`, `differenceInDays`, `startOfDay`); `subDays` (não usada ainda no projeto, mas parte do mesmo pacote já instalado) é o par natural para "últimos N dias" |
| zod | ^4.4.3 | Validação de Server Actions (`motivosPerdaSchema`, `motivoPerdaId` obrigatório em `stageUpdateSchema`/`leadSchema`) | Já é o validador único do projeto |
| react-hook-form | ^7.82.0 | Nenhum formulário novo complexo é estritamente necessário (a tela de gestão usa `useActionState` puro, como `SubnichoManager`), mas o form de lead (`lead-form-dialog.tsx`) já usa RHF e vai ganhar o combobox de motivo | Reuso do padrão existente, sem nova biblioteca |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@base-ui/react` (via `src/components/ui/combobox.tsx`) | ^1.6.0 | Combobox pesquisável para seleção/criação de motivo de perda (`MotivoPerdaCombobox`) | Reuso direto do wrapper já existente — nenhum código novo de Combobox, só um componente-filho análogo a `SubnichoCombobox` |
| `@tanstack/react-table` | ^8.21.3 | Opcional — se `/gsd-ui-phase` decidir tabela com sort/filter para os agrupamentos | Provavelmente overkill para 2-6 linhas de agregação; tabelas HTML simples (`src/components/ui/table.tsx`) já cobrem o caso, decisão de UI a confirmar na fase de UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `leads.motivoPerdaId` (FK integer, nullable) | Manter `leads.motivoPerda` como texto, validado em runtime contra a lista de nomes ativos | Mais simples de migrar (nenhuma mudança de tipo de coluna), mas quebra a garantia de integridade referencial que `subnichoId` já tem hoje — reintroduz exatamente o "fragmenta o relatório" que D-01 pede para eliminar (renomear um motivo não atualiza retroativamente o texto gravado nos leads já perdidos). **Não recomendado.** |
| `GROUP BY` via SQL (Drizzle `sql` template) | Buscar todos os leads e reduzir agrupamento em JavaScript | Com 23 leads reais hoje isso funcionaria sem problema de performance, mas contradiz o padrão já estabelecido explicitamente em `getUltimaInteracaoWhatsAppPorLead` (comentário no código: "agregação em SQL, não 'buscar tudo e reduzir em JS'") — manter consistência de estilo entre queries do mesmo arquivo |
| Filtro de período via querystring (`?period=30d`) | Estado client-side puro (`useState`) sem persistir na URL | Querystring sobrevive a refresh/compartilhamento de link e é o padrão mais comum em Server Components Next.js para filtros que afetam a query do servidor; decisão explicitamente deixada a critério do planner no CONTEXT.md, mas esta pesquisa recomenda querystring por ser mais idiomático a Server Components (o `searchParams` já chega tipado na página) |

**Installation:**
```bash
# Nenhum pacote novo — todas as dependências já estão em package.json
```

**Version verification:** Não aplicável — nenhuma nova dependência é instalada nesta fase. Todas as versões acima foram lidas diretamente de `package.json` do repositório (fonte primária, não npm registry) em 2026-08-14.

## Package Legitimacy Audit

Não aplicável — esta fase não instala nenhum pacote externo novo. Todos os componentes (governança de lista, agregação, combobox, migração manual) são compostos a partir de dependências já presentes em `package.json` e padrões de código já existentes no repositório. Nenhuma linha do `## Standard Stack` acima requer `npm install`.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Client Components)                                         │
│                                                                        │
│  /relatorios: <PeriodoSelector/> (30d|90d|tudo)                       │
│       │  onChange → router.push(`?period=${preset}`)                  │
│       ▼                                                                │
│  /motivos-perda: <MotivoPerdaManager/> (criar/renomear/remover)       │
│  lead-form-dialog.tsx + motivo-perda-dialog.tsx:                      │
│       <MotivoPerdaCombobox/> (seleciona OU digita nome novo)          │
└──────────────────────┬─────────────────────────────────────────────┘
                        │ Server Action (createMotivoPerda /
                        │ softDeleteMotivoPerda / renameMotivoPerda /
                        │ updateLeadStage / updateLead)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js Server (Server Components + Server Actions)                  │
│                                                                        │
│  GET /relatorios?period=30d (Server Component)                        │
│     │                                                                  │
│     ├─► resolvePeriodRange(searchParams.period) [pure fn]             │
│     │        │                                                         │
│     │        ▼                                                         │
│     ├─► getContagemPorOrigem(range)         ──┐                       │
│     ├─► getContagemPorSubnicho(range)          │  SQL GROUP BY         │
│     ├─► getContagemPorMotivoPerda(rangeStage)──┘  (src/db/queries.ts) │
│     │                                                                  │
│     └─► computeTaxaConversao(rows) [pure fn, testável isolado]        │
│                                                                        │
│  Server Action createMotivoPerda(nome):                               │
│     SELECT nome já existe (case-insensitive)?                         │
│       existe + deletedAt≠null → reativa (UPDATE deletedAt=NULL)        │
│       existe + deletedAt=null → erro "já existe"                      │
│       não existe → INSERT                                             │
└──────────────────────┬─────────────────────────────────────────────┘
                        │ Drizzle ORM (drizzle-orm/better-sqlite3)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SQLite (data/crm.db)                                                 │
│                                                                        │
│  motivos_perda (id, nome, deleted_at, created_at)  ← nova tabela       │
│  leads.motivo_perda_id  → FK motivos_perda.id, nullable, restrict      │
│         (substitui leads.motivo_perda texto livre)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── db/
│   ├── schema.ts              # + tabela motivosPerda; leads ganha motivoPerdaId (FK)
│   └── queries.ts             # + getContagemPorOrigem, getContagemPorSubnicho,
│                               #   getContagemPorMotivoPerda, computeTaxaConversao,
│                               #   resolvePeriodRange (todas puras/testáveis onde possível)
├── actions/
│   ├── motivo-perda-actions.ts  # createMotivoPerda/renameMotivoPerda/softDeleteMotivoPerda
│   │                             # (réplica 1:1 de subnicho-actions.ts)
│   └── lead-actions.ts          # motivoPerda vira motivoPerdaId obrigatório em stageUpdateSchema
├── app/
│   ├── relatorios/
│   │   └── page.tsx           # Server Component: lê searchParams.period, chama queries, renderiza
│   └── motivos-perda/
│       └── page.tsx           # Server Component: espelha src/app/subnichos/page.tsx
├── components/
│   ├── motivo-perda-manager.tsx     # réplica de subnicho-manager.tsx
│   ├── delete-motivo-perda-dialog.tsx # réplica de delete-subnicho-dialog.tsx
│   ├── motivo-perda-combobox.tsx    # réplica de subnicho-combobox.tsx
│   ├── periodo-selector.tsx         # NOVO — sem precedente direto no projeto
│   ├── lead-form-dialog.tsx         # motivoPerda (Textarea) → motivoPerdaId (Combobox)
│   ├── motivo-perda-dialog.tsx      # motivo (Textarea, opcional) → motivoPerdaId (Combobox, obrigatório, sem "Pular")
│   └── app-sidebar.tsx              # + 2 entradas em NAV_ITEMS
└── lib/
    └── validations.ts         # + motivoPerdaSchema (mirror subnichoSchema);
                                #   stageUpdateSchema.motivoPerda vira motivoPerdaId
                                #   obrigatório-condicional (stage==="perdido")
```

### Pattern 1: Tabela governada com soft-delete + reativação-por-nome (réplica de `subnichos`)
**What:** Nova tabela `motivos_perda` idêntica em shape a `subnichos` — `id`, `nome`, `deletedAt` nullable, `createdAt`, unique index case-insensitive em `lower(trim(nome))`.
**When to use:** Toda vez que o produto pede uma "lista extensível governada pelo admin" (D-01) — já é a segunda ocorrência deste padrão no projeto (a primeira foi `subnichos`).
**Example:**
```typescript
// Fonte: src/db/schema.ts (subnichos, linhas 4-16) — réplica direta
export const motivosPerda = sqliteTable(
  "motivos_perda",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("motivo_perda_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("motivos_perda_deleted_at_idx").on(table.deletedAt),
  ]
);
```

### Pattern 2: Reativação-por-nome-duplicado em `createX` (réplica de `createSubnicho`)
**What:** Ao criar um item com nome que já existe (case-insensitive/trim) mas está soft-deletado, reativa (`deletedAt = null`) em vez de bloquear ou duplicar.
**When to use:** Todo Server Action de criação sobre uma tabela com `deletedAt` + unique index — é o que viabiliza D-03 (criação na hora, sem tela de cadastro obrigatória antes).
**Example:**
```typescript
// Fonte: src/actions/subnicho-actions.ts, linhas 24-43 — mesmo mecanismo,
// trocar subnichos → motivosPerda e revalidatePath para as rotas certas.
const existing = await db
  .select()
  .from(motivosPerda)
  .where(sql`lower(trim(${motivosPerda.nome})) = lower(trim(${nome}))`);
if (existing.length > 0) {
  if (existing[0].deletedAt !== null) {
    await db.update(motivosPerda).set({ deletedAt: null, nome }).where(eq(motivosPerda.id, existing[0].id));
    revalidatePath("/motivos-perda");
    revalidatePath("/pipeline"); // onde o motivo é capturado
    revalidatePath("/leads");
    revalidatePath("/relatorios");
    return { success: true, id: existing[0].id };
  }
  return { errors: { nome: ["Esse motivo já existe."] } };
}
```
**Nota de shape:** diferente de `createSubnicho` (que só retorna `{ success: true }` porque o combobox de sub-nicho já recebe a lista completa via prop de servidor e não precisa do id recém-criado imediatamente), o `createMotivoPerda` usado dentro de `motivo-perda-dialog.tsx`/`lead-form-dialog.tsx` para criação-na-hora (D-03) provavelmente PRECISA devolver o `id` inserido/reativado no `ActionState`, para que o combobox possa selecioná-lo imediatamente sem exigir um segundo carregamento da lista. Isso é uma divergência deliberada do molde de `subnichos` (que não tem esse requisito de UX de "criar e já selecionar no mesmo formulário"), decisão técnica do planner.

### Pattern 3: Agregação SQL `GROUP BY` (estilo `getUltimaInteracaoWhatsAppPorLead`)
**What:** Contagens/agrupamentos calculados via SQL `GROUP BY`, não reduzidos em JS após buscar todas as linhas.
**When to use:** METRICAS-01, METRICAS-02, PERDA-01 — todas as três agregações do painel.
**Example:**
```typescript
// Fonte: src/db/queries.ts, getUltimaInteracaoWhatsAppPorLead (linhas 90-101) — mesmo estilo
export async function getContagemPorOrigem(range: PeriodRange): Promise<
  { origemTipo: Lead["origemTipo"]; total: number; fechados: number }[]
> {
  return db
    .select({
      origemTipo: leads.origemTipo,
      total: sql<number>`count(*)`,
      fechados: sql<number>`sum(case when ${leads.stage} = 'fechado' then 1 else 0 end)`,
    })
    .from(leads)
    .where(and(isNull(leads.deletedAt), gte(leads.createdAt, range.start), lte(leads.createdAt, range.end)))
    .groupBy(leads.origemTipo);
}
```

### Pattern 4: Função pura testável para cálculo derivado (estilo `computeSequenciaSugestao`)
**What:** Toda lógica de cálculo que não é I/O (taxa de conversão, resolução de preset de período) vive numa função pura, sem `db.select`, testável isoladamente via script `.cjs`.
**When to use:** `computeTaxaConversao` (D-06: `fechados / total`, incluindo leads em aberto no denominador) e `resolvePeriodRange` (D-10: presets 30d/90d/tudo → `{ start, end }`).
**Example:**
```typescript
// Fonte: estilo direto de src/db/queries.ts, computeSequenciaSugestao (linhas 135-146)
export function computeTaxaConversao(row: { total: number; fechados: number }): number {
  if (row.total === 0) return 0; // sem leads no período — 0%, não NaN/Infinity
  return row.fechados / row.total; // D-06: denominador é TODO o total, não só decididos
}

export function resolvePeriodRange(preset: "30d" | "90d" | "tudo", now = new Date()): PeriodRange {
  if (preset === "tudo") return { start: new Date(0), end: now };
  const days = preset === "30d" ? 30 : 90;
  return { start: subDays(startOfDay(now), days), end: now };
}
```

### Anti-Patterns to Avoid
- **Reduzir em JS após `SELECT *`:** buscar todos os leads e agrupar com `.reduce()`/`Map` no Server Component contradiz o estilo já estabelecido em `getUltimaInteracaoWhatsAppPorLead` — use `GROUP BY` em SQL.
- **`leads.motivoPerda` como texto validado contra a lista em runtime:** não resolve o problema real (renomear/mesclar um motivo não propaga para leads já gravados) — use FK.
- **Esquecer a segunda superfície de captura:** atualizar só `lead-form-dialog.tsx` e deixar `motivo-perda-dialog.tsx` (o modal de drag-and-drop) com textarea livre e opcional — quebra D-04 silenciosamente para o fluxo mais comum de mover um lead para "Perdido" (drag no board, não edição do formulário).
- **`drizzle-kit push`/`generate` cru contra `leads`:** dois precedentes documentados de comportamento destrutivo neste repositório (Fases 06-01, 07-01) — sempre migração manual via `better-sqlite3` com backup.
- **Filtro de período aplicado só no client (após buscar tudo):** com o volume de dados baixo hoje (23 leads) isso "funcionaria", mas contradiz D-07 (a taxa de conversão respeita o filtro) exigindo que o cálculo do servidor já receba os dados filtrados, não filtre depois de agregar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combobox pesquisável com criação inline | Um `<select>` custom ou dropdown feito à mão | `src/components/ui/combobox.tsx` (wrapper `@base-ui/react`) já usado por `SubnichoCombobox` | Já resolve acessibilidade, filtro por texto, teclado; só falta o componente-filho `MotivoPerdaCombobox` análogo |
| Soft-delete + reativação | Lógica de "verificar se existe, se sim decidir o que fazer" escrita do zero | Copiar `createSubnicho`/`softDeleteSubnicho`/`renameSubnicho` linha por linha, trocando a tabela | Já cobre a race condition de duplo-clique (try/catch no INSERT) e a idempotência do soft-delete (`isNull(deletedAt)` no WHERE) |
| Cálculo de intervalo de datas por preset | Lógica de data manual (`new Date(Date.now() - 30*24*60*60*1000)`) | `date-fns` `subDays`/`startOfDay` (já instalado, já em uso no projeto) | Evita bugs de fuso horário/horário de verão que aritmética manual de milissegundos introduz |
| Migração de schema com dado real | `drizzle-kit push`/`generate` direto | Script `.cjs` manual (`backup → PRAGMA table_info guard → ALTER TABLE → verificação pós-migração`), molde de `scripts/migrate-sequencia-followup.cjs` | Dois incidentes documentados neste repositório de `drizzle-kit push` causando "data-loss statement"/comportamento inesperado sobre tabelas com dado real |

**Key insight:** Esta fase é, em essência, um exercício de "encontrar o precedente certo no próprio repositório e replicá-lo fielmente" — não há nenhum problema nesta fase que exija pesquisa de biblioteca externa ou padrão de mercado. O risco real está em desviar do padrão já estabelecido (ex.: usar texto em vez de FK, esquecer uma das duas superfícies de captura de motivo, rodar `drizzle-kit push` em vez de migração manual).

## Common Pitfalls

### Pitfall 1: Atualizar só uma das duas superfícies de captura de `motivoPerda`
**What goes wrong:** `lead-form-dialog.tsx` (edição manual, campo aparece quando `stage === "perdido"`) é atualizado para usar o combobox obrigatório, mas `motivo-perda-dialog.tsx` (modal de drag-and-drop no pipeline board) continua com `<Textarea>` livre e botão "Pular" — a maioria dos leads move para "Perdido" via drag no board, não via formulário de edição, então D-04 fica quebrada no caminho mais comum.
**Why it happens:** CONTEXT.md menciona só `updateLeadStage`/`updateLead` em `lead-actions.ts` como integration point — não lista explicitamente o componente de UI `motivo-perda-dialog.tsx`, que é onde o `motivoPerda` de fato chega no `updateLeadStage` via drag.
**How to avoid:** Task explícito no plano para reescrever `motivo-perda-dialog.tsx`: trocar `<Textarea>` por `<MotivoPerdaCombobox>`, remover o botão "Pular" (ou trocá-lo por comportamento que force seleção antes de confirmar), e garantir que `onSave` só dispara com um `motivoPerdaId` válido.
**Warning signs:** Buscar por `Textarea` dentro de `motivo-perda-dialog.tsx` no code review — se ainda existir, a superfície não foi migrada.

### Pitfall 2: FK `leads.motivoPerdaId` sem migração de dado (coluna nova + coluna antiga convivendo)
**What goes wrong:** Adicionar `motivoPerdaId` sem remover/aposentar `motivoPerda` (texto) deixa duas fontes de verdade — código antigo continua lendo/escrevendo o texto, relatório novo lê o FK, e os dois divergem silenciosamente.
**Why it happens:** SQLite não tem `ALTER TABLE ... RENAME COLUMN ... TYPE` direto para trocar texto por FK; a tentação é "adicionar a nova, deixar a antiga órfã para não mexer em mais lugares".
**How to avoid:** Como não há nenhum lead perdido real hoje (0 de 23 leads em `stage='perdido'`, confirmado em CONTEXT.md §Specific Ideas), a migração não precisa converter dado — pode dropar `motivo_perda` (texto) na mesma migração que adiciona `motivo_perda_id`, OU manter a coluna antiga fisicamente mas remover toda referência a ela em `src/` (decisão do planner; ambas são seguras aqui justamente pela ausência de dado real a perder). Se optar por manter a coluna antiga fisicamente (mais simples de reverter), documentar explicitamente como "coluna morta, não lida em nenhum lugar de `src/`" no comentário do schema, para não confundir uma fase futura.
**Warning signs:** `grep -rn "\.motivoPerda\b" src/` (sem o `Id`) após a migração deve retornar zero ocorrências em código de produção (fora de comentários históricos).

### Pitfall 3: Taxa de conversão com denominador zero
**What goes wrong:** Um grupo de origem/sub-nicho sem nenhum lead no período filtrado (`total === 0`) produz `NaN` ou `Infinity` se a divisão não tiver guarda, quebrando a renderização ou mostrando "NaN%" na tela.
**Why it happens:** Com os dados reais de hoje (23 leads, todos Outbound, 21 "A categorizar"), a maioria dos grupos de sub-nicho terá `total = 0` nesta fase — é o cenário normal, não uma borda rara.
**How to avoid:** `computeTaxaConversao` (Pattern 4 acima) retorna `0` explicitamente quando `total === 0`, nunca `fechados/total` sem guarda.
**Warning signs:** Teste unitário explícito para `{ total: 0, fechados: 0 }` → `0` (não `NaN`).

### Pitfall 4: Filtro de "Motivos de Perda" usando `createdAt` em vez de `stageChangedAt`
**What goes wrong:** Copiar o filtro de período das outras duas seções (que usam `createdAt`, D-09) para a seção de motivos de perda sem aplicar a exceção D-11 — "motivos de perda dos últimos 30 dias" passaria a significar "leads CRIADOS nos últimos 30 dias que, a qualquer momento, foram perdidos" em vez de "leads PERDIDOS nos últimos 30 dias".
**Why it happens:** As três seções da mesma tela compartilham a mesma UI de seletor de período — é natural (e errado aqui) implementar um único filtro genérico reusado pelas três queries.
**How to avoid:** A query de motivos de perda usa `gte(leads.stageChangedAt, range.start)` explicitamente, nunca `leads.createdAt` — documentar isso com um comentário âncora no código (mesmo estilo dos comentários extensos já presentes em `queries.ts`), citando D-11 explicitamente.
**Warning signs:** Grep por `stageChangedAt` dentro da função de contagem por motivo — se ausente, a exceção não foi implementada.

### Pitfall 5: `drizzle-kit push`/`generate` sobre `leads`/`motivos_perda` com dado real
**What goes wrong:** Rodar `drizzle-kit push` para aplicar a nova coluna `motivo_perda_id`/tabela `motivos_perda` pode disparar prompt interativo de "data-loss statement" (bloqueante em modo headless) ou, pior, executar um `DELETE`+recriação de tabela por trás dos panos (já ocorrido nas Fases 06-01/07-01 deste mesmo repositório).
**Why it happens:** `drizzle-kit`'s snapshot de migrações já está divergente do banco real desde a Fase 4/6 (débito técnico documentado em STATE.md) — qualquer `push`/`generate` novo herda essa divergência.
**How to avoid:** Migração manual via `better-sqlite3`, seguindo religiosamente o molde de `scripts/migrate-sequencia-followup.cjs`/`scripts/backfill-origem-tipo.cjs`: checkpoint WAL → backup do arquivo `.db` → guarda de idempotência via `PRAGMA table_info` → `ALTER TABLE`/`CREATE TABLE` cru → verificação pós-migração (contagem de linhas antes/depois, zero NULLs inesperados).
**Warning signs:** Qualquer menção a `npx drizzle-kit push` ou `drizzle-kit generate` no plano de execução desta fase deve ser tratada como red flag e substituída por script manual.

## Code Examples

### Migração manual da nova tabela + coluna FK (molde exato)
```javascript
// scripts/migrate-motivos-perda.cjs — seguir religiosamente o molde de
// scripts/migrate-sequencia-followup.cjs (backup WAL-checkpoint + guarda de
// idempotência via PRAGMA table_info + verificação pós-migração)
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");
function fail(message) {
  console.error(`[migrate-motivos-perda] FALHOU: ${message}`);
  process.exit(1);
}

// 1) backup (checkpoint WAL primeiro — client.ts roda em journal_mode=WAL)
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}

const db = new Database(DB_PATH);
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) CREATE TABLE motivos_perda (idempotente via sqlite_master)
const hasTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='motivos_perda'")
  .get();
if (!hasTable) {
  db.exec(`
    CREATE TABLE motivos_perda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX motivo_perda_nome_unique_idx ON motivos_perda (lower(trim(nome)));
    CREATE INDEX motivos_perda_deleted_at_idx ON motivos_perda (deleted_at);
  `);
  // Seed D-02: valores padrão pré-cadastrados (nenhum lead perdido real hoje)
  const insert = db.prepare("INSERT INTO motivos_perda (nome) VALUES (?)");
  for (const nome of ["Preço", "Sem retorno do lead", "Concorrente", "Sem verba/orçamento", "Timing (não é prioridade agora)", "Outro"]) {
    insert.run(nome);
  }
}

// 3) ADD COLUMN leads.motivo_perda_id (idempotente via PRAGMA table_info)
const hasColumn = db.prepare("PRAGMA table_info(leads)").all().some((c) => c.name === "motivo_perda_id");
if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `motivo_perda_id` integer REFERENCES `motivos_perda`(`id`);");
}

// 4) verificação pós-migração (contagem intacta, zero corrupção)
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) fail(`contagem de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);

console.log(`[migrate-motivos-perda] OK: tabela motivos_perda criada/verificada, leads.motivo_perda_id presente, ${afterLeads} leads intactos`);
db.close();
process.exit(0);
```

### Combobox de motivo de perda (réplica de `SubnichoCombobox`)
```typescript
// src/components/motivo-perda-combobox.tsx — mesmo shape de subnicho-combobox.tsx,
// incluindo a exceção deletedAt===null || id===value (Nota de Bug do CONTEXT.md)
const items = useMemo(
  () =>
    motivosPerda
      .filter((m) => m.deletedAt === null || m.id === value)
      .map((m) => ({ value: m.id, label: m.nome })),
  [motivosPerda, value]
);
```

## State of the Art

Não aplicável — nenhuma mudança de "estado da arte" externa afeta esta fase. Todos os padrões usados já são internos ao repositório e datam das Fases 1-10 deste mesmo projeto (2026-07 a 2026-08).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `leads.motivoPerdaId` (FK integer nullable) é a melhor forma de substituir `leads.motivoPerda` (texto), em vez de manter texto validado | Standard Stack §Alternatives Considered, Architecture Patterns | Se o planner preferir manter texto por simplicidade de migração, a garantia de integridade referencial (renomear motivo propaga automaticamente) se perde — decisão técnica explicitamente delegada ao planner pelo CONTEXT.md ("Shape exato da nova tabela... decisão técnica do planner"), então este é um ASSUMED de recomendação, não um fato verificado |
| A2 | `motivo-perda-dialog.tsx` precisa ser reescrito na mesma fase (não estava no CONTEXT.md `code_context`) | Architecture Patterns, Common Pitfalls #1 | Se o plano ignorar esse arquivo, D-04 (campo obrigatório) fica quebrada no fluxo mais comum de perder um lead (drag no board) — risco alto, mas a descoberta veio de leitura direta do código (`pipeline-board.tsx` → `motivo-perda-dialog.tsx`), não de suposição não verificada |
| A3 | Filtro de período via querystring (`?period=30d`) é preferível a estado client-side puro | Standard Stack §Alternatives Considered | CONTEXT.md deixa essa decisão explicitamente a critério do planner ("sem preferência de produto manifestada") — a recomendação aqui é só uma sugestão técnica, não uma decisão travada |

**Nenhuma claim de compliance/segurança/retenção de dado foi feita nesta pesquisa** — todos os itens acima são de arquitetura interna, não de política de produto.

## Open Questions

1. **`leads.motivoPerdaId` deve ser NOT NULL ou nullable?**
   - What we know: D-04 exige que o campo seja obrigatório *ao mover para "Perdido"* — não que todo lead sempre tenha um motivo (leads em outras etapas nunca tiveram esse campo preenchido).
   - What's unclear: se o planner prefere nullable (validação condicional só no Zod, mesma abordagem de `subnichoId` que é NOT NULL só porque É sempre obrigatório) ou se há alguma vantagem em CHECK constraint condicional (SQLite suporta `CHECK`, mas o projeto não usa CHECK constraints em nenhuma tabela hoje — ver comentário em `configuracoes` no schema.ts: "nenhuma tabela do projeto usa CHECK constraint").
   - Recommendation: `nullable`, seguindo o precedente de `stageChangedAt` (nullable, preenchido condicionalmente) em vez de `subnichoId` (sempre obrigatório) — a obrigatoriedade condicional (só quando `stage==="perdido"`) já é o padrão estabelecido para `motivoPerda` hoje e deve continuar sendo aplicada em Zod/Server Action, não em constraint de banco.

2. **A coluna antiga `leads.motivo_perda` (texto) deve ser fisicamente removida (`ALTER TABLE ... DROP COLUMN`) ou só aposentada em código?**
   - What we know: SQLite (versão bundled em better-sqlite3 12.x) suporta `ALTER TABLE ... DROP COLUMN` desde 3.35.0 (2021) — tecnicamente viável. Não há dado real a perder (0 leads perdidos hoje).
   - What's unclear: se `npm run guard:no-hard-delete` trataria um `DROP COLUMN` como problema (ele só varre por `DELETE FROM`/`DROP TABLE`, não `DROP COLUMN` — não deveria disparar falso-positivo, mas não foi testado nesta pesquisa).
   - Recommendation: manter a coluna antiga fisicamente por simplicidade/reversibilidade (menor risco de migração), mas garantir zero referências a ela em `src/` — o planner deve decidir se vale o "lixo" de schema por segurança extra.

## Environment Availability

Não aplicável — esta fase não depende de nenhuma ferramenta/serviço externo além do que já roda localmente (Node.js, better-sqlite3, o próprio `data/crm.db`). Nenhum novo runtime, CLI ou serviço é necessário.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Nenhum framework de teste (jest/vitest) — convenção do projeto: scripts `node scripts/*.cjs` com harness `check(condition, message)` |
| Config file | Nenhum — cada script é standalone, registrado em `package.json` `scripts` |
| Quick run command | `node scripts/test-relatorios-queries.cjs` (a criar — testa `computeTaxaConversao`/`resolvePeriodRange` puras) |
| Full suite command | `npm run guard:no-hard-delete && npm run verify:schema && npm run test:lead-actions && npm run test:compute-sequencia && node scripts/test-relatorios-queries.cjs && node scripts/verify-motivos-perda-schema.cjs` (sequencial — host 4GB RAM, nunca `&&` paralelo) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| METRICAS-01 | `computeTaxaConversao({total,fechados})` retorna `fechados/total`, e `0` quando `total=0` | unit (função pura, `:memory:` não necessário) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 |
| METRICAS-01 | `getContagemPorOrigem(range)` agrupa corretamente via SQL `GROUP BY origem_tipo`, respeitando `deletedAt`/período | integration (`:memory:` com schema real) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 |
| METRICAS-02 | `getContagemPorSubnicho(range)` inclui "A categorizar" como grupo normal (D-12), sem tratamento especial | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 |
| PERDA-01 | `getContagemPorMotivoPerda(range)` filtra por `stageChangedAt` (D-11), não `createdAt` | integration (`:memory:`) | `node scripts/test-relatorios-queries.cjs` | ❌ Wave 0 |
| PERDA-01 (governança) | `createMotivoPerda` reativa nome soft-deletado em vez de bloquear/duplicar (mesmo comportamento de `createSubnicho`) | integration (`:memory:`) — mirror de padrão de teste ainda não existente para `subnicho-actions.ts`, mas replicável do próprio código da action | `node scripts/test-motivo-perda-actions.cjs` | ❌ Wave 0 |
| PERDA-01 (governança) | `motivos_perda` nunca sofre hard-delete (extensão do guard existente) | static/structural | `npm run guard:no-hard-delete` | ✅ (guard existe, precisa só de extensão de escopo — ver Wave 0) |
| D-04 | `updateLeadStage`/`updateLead` rejeitam `stage==="perdido"` sem `motivoPerdaId` | structural/behavioral (estilo `verify-sequencia-posicao.cjs` Parte B) | `node scripts/verify-motivo-perda-obrigatorio.cjs` | ❌ Wave 0 |
| Schema | Tabela `motivos_perda` + coluna `leads.motivo_perda_id` presentes no banco real após migração | structural (`PRAGMA table_info`) | `npm run verify:schema` (estender) | ✅ (script existe, precisa de extensão) |

### Sampling Rate
- **Per task commit:** rodar o script `.cjs` relevante à mudança (ex.: `node scripts/test-relatorios-queries.cjs` após tocar em `queries.ts`)
- **Per wave merge:** full suite sequencial listada acima
- **Phase gate:** full suite verde + `npx tsc --noEmit` limpo antes de `/gsd-verify-work` (mesmo padrão das Fases 06-10; `npm run build` completo é conhecidamente instável neste host de 4GB RAM — ver STATE.md "Fase 10 (10-04)")

### Wave 0 Gaps
- [ ] `scripts/test-relatorios-queries.cjs` — cobre `computeTaxaConversao`, `resolvePeriodRange`, e as 3 queries `GROUP BY` (via `:memory:` com schema real, mesmo padrão de `test-compute-sequencia-sugestao.cjs` usando `DB_FILE_NAME=":memory:"` + `ts-alias-loader.mjs`)
- [ ] `scripts/test-motivo-perda-actions.cjs` — cobre `createMotivoPerda`/`renameMotivoPerda`/`softDeleteMotivoPerda`, mirror de um teste ainda inexistente para `subnicho-actions.ts` (não há precedente `.cjs` de teste dedicado para as actions de sub-nicho hoje — só o guard estrutural cobre soft-delete indiretamente)
- [ ] `scripts/verify-motivo-perda-obrigatorio.cjs` — cobre D-04 (obrigatoriedade condicional), mirror de `verify-sequencia-posicao.cjs` Parte B (checagens estruturais no fonte real de `lead-actions.ts`)
- [ ] `scripts/verify-motivos-perda-schema.cjs` ou extensão de `scripts/verify-schema.cjs` — tabela `motivos_perda` + coluna `leads.motivo_perda_id` presentes
- [ ] Extensão de `scripts/guard-no-hard-delete.cjs` — adicionar `motivos_perda` a `CODE_PATTERNS`/`CODE_SQL_PATTERNS` (mesmo padrão da extensão feita para `interacoes` na Fase 9)
- [ ] `scripts/migrate-motivos-perda.cjs` — script de migração em si (ver Code Examples acima)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Não | Fora de escopo do projeto (ferramenta solo-admin local, sem auth — decisão explícita em CLAUDE.md "What NOT to Use") |
| V3 Session Management | Não | Idem |
| V4 Access Control | Não | Idem — única "role" é o próprio admin local |
| V5 Input Validation | Sim | Zod (`motivoPerdaSchema`, `stageUpdateSchema` estendido) — mesmo padrão já usado em todo o projeto |
| V6 Cryptography | Não | Nenhum dado sensível novo (nomes de motivos de perda não são PII/segredo) |

### Known Threat Patterns for esta fase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `nome` de motivo de perda digitado livremente | Tampering | Drizzle ORM com queries parametrizadas (`sql` template já escapa valores via placeholders do better-sqlite3) — mesmo padrão já usado em `subnicho-actions.ts`, nenhuma concatenação de string crua |
| XSS via nome de motivo/sub-nicho renderizado na tela de relatórios | Tampering/Information Disclosure | React escapa por padrão (`{motivo.nome}` em JSX nunca é `dangerouslySetInnerHTML`) — nenhuma mitigação adicional necessária, mas manter essa disciplina no code review |
| Enumeração de `id` de lead/motivo via URL manipulável em `/relatorios?period=...` | Information Disclosure | Não aplicável — não há autenticação de qualquer forma nesta ferramenta local; `searchParams.period` só aceita 3 valores enumerados (`30d`/`90d`/`tudo`), qualquer outro valor deve cair num default seguro (`"tudo"`), nunca lançar erro 500 |

## Sources

### Primary (HIGH confidence — leitura direta do código-fonte deste repositório)
- `src/db/schema.ts` — shape de `subnichos`, `leads`, `configuracoes` (padrão de tabela governada, comentários de decisão)
- `src/actions/subnicho-actions.ts` — `createSubnicho`/`softDeleteSubnicho`/`renameSubnicho` (padrão completo a replicar)
- `src/components/subnicho-manager.tsx`, `src/components/delete-subnicho-dialog.tsx`, `src/components/subnicho-combobox.tsx` — UI de referência
- `src/app/subnichos/page.tsx` — página Server Component de referência
- `src/db/queries.ts` — `computeSequenciaSugestao` (função pura testável), `getUltimaInteracaoWhatsAppPorLead` (SQL `GROUP BY`)
- `src/actions/lead-actions.ts` — `updateLead`/`updateLeadStage` (captura atual de `motivoPerda`, idioma condicional-por-valor-alvo)
- `src/components/lead-form-dialog.tsx`, `src/components/motivo-perda-dialog.tsx`, `src/components/pipeline-board.tsx` — as DUAS superfícies reais de captura de `motivoPerda` hoje
- `src/lib/validations.ts` — `subnichoSchema`, `stageUpdateSchema`, `leadSchema` (padrão de contrato Zod)
- `src/components/app-sidebar.tsx` — `NAV_ITEMS` (padrão de adição de rota ao menu)
- `scripts/migrate-sequencia-followup.cjs`, `scripts/backfill-origem-tipo.cjs` — molde exato de migração manual (backup WAL-checkpoint + guarda idempotência + verificação pós-migração)
- `scripts/guard-no-hard-delete.cjs`, `scripts/verify-schema.cjs`, `scripts/verify-sequencia-posicao.cjs`, `scripts/test-compute-sequencia-sugestao.cjs` — padrão de harness `check()` e escopo dos guards
- `package.json` — versões reais instaladas, scripts `test:*`/`verify:*` registrados
- `.planning/debug/resolved/subnicho-combobox-vazio.md` — mecânica do filtro `deletedAt===null || id===value` e sua justificativa
- `.planning/config.json` — `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`

### Secondary (MEDIUM confidence)
- Nenhuma — nenhuma fonte externa (WebSearch/Context7) foi necessária para esta pesquisa, dado que 100% do domínio já está resolvido por precedente interno.

### Tertiary (LOW confidence)
- Nenhuma.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, todas as versões lidas diretamente de `package.json`
- Architecture: HIGH — todos os padrões replicados de código real já em produção neste mesmo repositório, lido linha a linha
- Pitfalls: HIGH — Pitfall 1 (segunda superfície de captura) é uma descoberta verificada por leitura direta de `pipeline-board.tsx`→`motivo-perda-dialog.tsx`, não suposição

**Research date:** 2026-08-14
**Valid until:** Válido enquanto o repositório não mudar de stack (Next.js/Drizzle/better-sqlite3) — sem prazo de expiração de 30/7 dias aplicável, já que nenhuma claim depende de versão de biblioteca externa sujeita a mudança rápida.
