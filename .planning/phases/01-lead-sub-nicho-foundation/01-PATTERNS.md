# Fase 1: Lead & Sub-nicho Foundation - Mapa de Padrões

**Mapeado em:** 2026-07-19
**Arquivos analisados:** 23
**Analogs encontrados:** 0 / 23 (repositório greenfield — sem código de aplicação pré-existente)

## Nota Metodológica

Este repositório é **greenfield**: não existe `package.json`, `src/`, nem qualquer arquivo de aplicação além dos artefatos de planejamento (`.planning/`) e `CLAUDE.md`. Não há, portanto, analogs reais no código a copiar. Em vez disso, este mapa usa `01-RESEARCH.md` como fonte canônica de padrões — ele já contém exemplos de código concretos e verificados (schema Drizzle, Server Actions, configuração do `@tanstack/react-table`, etc.) que servem como o "analog" de referência para cada arquivo a ser criado. Onde `01-RESEARCH.md` não cobre um arquivo com um trecho de código literal (ex.: componentes de UI puramente de composição, como o sidebar ou o badge de etapa), isso está sinalizado explicitamente na seção `## No Analog Found`, com a referência ao contrato de UI/copy (`01-UI-SPEC.md`) e às decisões (`01-CONTEXT.md`) que devem orientar a implementação.

Todos os trechos de código abaixo foram extraídos literalmente de `01-RESEARCH.md` (mesmo diretório de fase), com número de linha indicado.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `drizzle.config.ts` | config | n/a (setup) | `01-RESEARCH.md` Pitfall 3 (linhas 452-463) | exact — trecho literal fornecido |
| `src/db/schema.ts` | model | CRUD | `01-RESEARCH.md` Pattern 2 (linhas 339-380) | exact — trecho literal fornecido |
| `src/db/client.ts` | config | n/a (conexão) | `01-RESEARCH.md` "Drizzle client" (linhas 500-507) | exact — trecho literal fornecido |
| `src/db/migrations/*.sql` | migration | batch | gerado por `drizzle-kit generate` — não editado à mão | n/a (artefato gerado) |
| `src/lib/validations.ts` | utility (validação) | transform | `01-RESEARCH.md` Pattern 1 (linhas 281-293) | exact — trecho literal fornecido |
| `src/actions/lead-actions.ts` | service (Server Action) | CRUD | `01-RESEARCH.md` Pattern 1 (linhas 296-311) + soft-delete/restore (linhas 531-549) | exact — trecho literal fornecido |
| `src/actions/subnicho-actions.ts` | service (Server Action) | CRUD | `01-RESEARCH.md` Pattern 2 (dedupe, linhas 330-352) — sem exemplo de Server Action completo | role-match |
| `src/types/index.ts` | utility (tipos) | transform | inferido do schema (`InferSelectModel`) — sem trecho literal em RESEARCH.md | role-match |
| `src/app/layout.tsx` | component (layout raiz) | request-response | `01-RESEARCH.md` estrutura de projeto (linhas 236-263), D-18 | role-match |
| `src/app/page.tsx` | route/component (Server Component) | request-response | `01-RESEARCH.md` query "leads ativos" (linhas 519-526) | exact — trecho literal fornecido |
| `src/app/subnichos/page.tsx` | route/component | request-response | sem exemplo literal — D-15/D-16 | no analog |
| `src/app/lixeira/page.tsx` | route/component | request-response | `01-RESEARCH.md` padrão `isNull`/`isNotNull` (linhas 78, 519-526, adaptado) | role-match |
| `src/components/app-sidebar.tsx` | component (navegação) | request-response | D-18, sem trecho literal | no analog |
| `src/components/lead-form-dialog.tsx` | component (form modal) | request-response | `01-RESEARCH.md` Pattern 1 (linhas 313-328) | exact — trecho literal fornecido |
| `src/components/discard-changes-dialog.tsx` | component (dialog de confirmação) | event-driven | D-04, `01-UI-SPEC.md` copy contract (linha 122) | no analog (copy disponível) |
| `src/components/delete-lead-dialog.tsx` | component (dialog de confirmação) | event-driven | D-05, `01-UI-SPEC.md` copy contract (linha 121) | no analog (copy disponível) |
| `src/components/subnicho-combobox.tsx` | component (combobox) | request-response | `01-RESEARCH.md` Pitfall 2 (linhas 438-444), Don't Hand-Roll (linha 424) | role-match (sem trecho de código, só orientação) |
| `src/components/subnicho-manager.tsx` | component (lista com edição inline) | CRUD | D-15/D-16, sem trecho literal | no analog |
| `src/components/etapa-badge.tsx` | component (badge de exibição) | transform | D-09, `01-UI-SPEC.md` paleta de cores (linhas 92-101) | no analog (spec visual disponível) |
| `src/components/lead-table.tsx` | component (data table) | CRUD (client-side sort/filter/paginate) | `01-RESEARCH.md` Pattern 3 (linhas 392-407) | exact — trecho literal fornecido |
| `src/components/lead-table-columns.tsx` | component (definição de colunas) | transform | `01-RESEARCH.md` Pattern 3 + D-06/D-08/D-09 | role-match |
| `src/components/lixeira-table.tsx` | component (data table variante) | CRUD | `01-RESEARCH.md` Pattern 3 + restore action (linhas 544-548) | role-match |
| `src/components/ui/*` (gerados pelo shadcn CLI) | component (primitivos) | n/a | gerado por `npx shadcn add ...` — não editado à mão inicialmente | n/a (artefato gerado) |

## Pattern Assignments

### `drizzle.config.ts` (config)

**Analog:** `01-RESEARCH.md` Pitfall 3, linhas 452-463

**Padrão a copiar (sintaxe atual do drizzle-kit — NÃO usar `driver: 'better-sqlite'`):**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/crm.db",
  },
});
```

**Atenção:** este é o Pitfall 3 documentado — usar a API `dialect`/`dbCredentials.url`, não `driver`.

---

### `src/db/schema.ts` (model, CRUD)

**Analog:** `01-RESEARCH.md` Pattern 2, linhas 339-380

**Padrão de tabela `subnichos` com índice único case-insensitive:**
```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const subnichos = sqliteTable(
  "subnichos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("subnicho_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
  ]
);
```

**Padrão de tabela `leads` com FK, enum, soft-delete e índices:**
```typescript
export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }).notNull(),
    origem: text("origem").notNull(),
    valorEstimado: integer("valor_estimado_centavos").notNull(), // centavos, evita ponto flutuante
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado_perdido"] })
      .notNull()
      .default("novo"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("leads_deleted_at_idx").on(table.deletedAt),
    index("leads_follow_up_date_idx").on(table.followUpDate),
    index("leads_stage_idx").on(table.stage),
    index("leads_subnicho_id_idx").on(table.subnichoId),
  ]
);
```

**Regras de negócio embutidas no schema:**
- `onDelete: "restrict"` protege contra exclusão de sub-nicho referenciado (mesmo sem UI de delete nesta fase — ver `01-RESEARCH.md` linha 382).
- `valorEstimado` em centavos (inteiro), nunca `real`/float, para evitar erro de ponto flutuante em valores monetários — formatar como R$ só na exibição.

---

### `src/db/client.ts` (config)

**Analog:** `01-RESEARCH.md` "Drizzle client", linhas 500-507

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_FILE_NAME ?? "./data/crm.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle({ client: sqlite, schema });
```

Adicionar `./data/*.db*` ao `.gitignore` (o arquivo de banco não vai para o git; só `src/db/migrations/` deve ser versionado).

---

### `src/lib/validations.ts` (utility, transform)

**Analog:** `01-RESEARCH.md` Pattern 1, linhas 281-293

```typescript
import { z } from "zod";

export const leadSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  telefone: z.string().trim().min(1, "Telefone é obrigatório"),
  canal: z.enum(["instagram", "whatsapp"]),
  origem: z.string().trim().min(1, "Origem é obrigatória"),
  valorEstimado: z.coerce.number().nonnegative(),
  notas: z.string().trim().min(1, "Notas são obrigatórias"),
  followUpDate: z.coerce.date(),
  subnichoId: z.coerce.number().int().positive("Selecione um sub-nicho"),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado_perdido"]),
});
```

**Estender com:** um `subnichoSchema` análogo para nome de sub-nicho (`z.string().trim().min(1, "Nome é obrigatório.")`) — não há trecho literal em RESEARCH.md, seguir o mesmo estilo (mensagens em pt-BR, exatamente as strings definidas no `01-UI-SPEC.md` Copywriting Contract, linha 113: "Nome é obrigatório.", "Telefone é obrigatório.", "Notas são obrigatórias.", "Selecione um sub-nicho.").

**Atenção (Pitfall 5, linhas 475-481):** instalar `@hookform/resolvers` sem pinar versão antiga; rodar `npx tsc --noEmit` logo após montar o primeiro formulário para pegar mismatch de tipos entre `zod@4.4.3` e `zodResolver` cedo.

---

### `src/actions/lead-actions.ts` (service, CRUD)

**Analog:** `01-RESEARCH.md` Pattern 1 (linhas 296-311) + soft-delete/restore (linhas 531-549)

**Create pattern:**
```typescript
"use server";
import { leadSchema } from "@/lib/validations";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createLead(prevState: unknown, formData: FormData) {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  await db.insert(leads).values(parsed.data);
  revalidatePath("/");
  return { success: true };
}
```

**Soft-delete e restore pattern (LEAD-04, D-05/D-17):**
```typescript
"use server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function softDeleteLead(leadId: number) {
  await db.update(leads).set({ deletedAt: sql`(unixepoch())` }).where(eq(leads.id, leadId));
  revalidatePath("/");
  revalidatePath("/lixeira");
}

export async function restoreLead(leadId: number) {
  await db.update(leads).set({ deletedAt: null }).where(eq(leads.id, leadId));
  revalidatePath("/");
  revalidatePath("/lixeira");
}
```

**`updateLead`:** segue o mesmo formato de `createLead`, mas com `db.update(leads).set(parsed.data).where(eq(leads.id, leadId))` e `revalidatePath("/")` — não há trecho literal em RESEARCH.md para `updateLead`, mas é uma variação direta do padrão `createLead`/`softDeleteLead` acima (mesma estrutura: `safeParse` → early return em erro → mutação Drizzle → `revalidatePath`).

**Nunca implementar `db.delete(leads)...` (hard-delete) nesta fase** — Anti-Pattern explícito em `01-RESEARCH.md` linha 414.

---

### `src/actions/subnicho-actions.ts` (service, CRUD)

**Analog:** `01-RESEARCH.md` Pattern 2 (linhas 330-352, dedupe) — sem exemplo de Server Action completo em RESEARCH.md, compor a partir do padrão de `lead-actions.ts` acima + captura de constraint violation.

**Padrão a seguir (Pitfall 1, linhas 431-437):**
- Fazer `SELECT` prévio para checagem amigável (mensagem inline "Esse sub-nicho já existe." — `01-UI-SPEC.md` linha 116) **e** confiar no `uniqueIndex` do schema como garantia final.
- Capturar a exceção de violação de constraint do SQLite no `catch` e converter para a mesma mensagem de erro de campo, cobrindo a race condition de duplo-clique em "+ Adicionar" (D-16).

```typescript
"use server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createSubnicho(prevState: unknown, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { errors: { nome: ["Nome é obrigatório."] } };

  const existing = await db
    .select()
    .from(subnichos)
    .where(sql`lower(trim(${subnichos.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0) {
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  try {
    await db.insert(subnichos).values({ nome });
  } catch {
    // fallback de última linha: constraint violation do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }
  revalidatePath("/subnichos");
  return { success: true };
}
```

`renameSubnicho` segue a mesma estrutura, trocando `insert` por `update(subnichos).set({ nome }).where(eq(subnichos.id, id))`.

---

### `src/app/page.tsx` (route/component, request-response)

**Analog:** `01-RESEARCH.md` query "leads ativos", linhas 519-526

```typescript
import { isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { leads } from "@/db/schema";

export async function listActiveLeads() {
  return db
    .select()
    .from(leads)
    .where(isNull(leads.deletedAt))
    .orderBy(asc(leads.followUpDate));
}
```

Rota raiz `/` (D-14) — Server Component que chama esta query e passa o resultado para `<LeadTable>` (Client Component). Sem tela de boas-vindas separada.

---

### `src/app/lixeira/page.tsx` (route/component, request-response)

**Analog:** variação direta da query acima, trocando `isNull` por `isNotNull(leads.deletedAt)` (padrão citado em `01-RESEARCH.md` linha 78 e Architectural Responsibility Map linha 99). Sem trecho literal para a variante `isNotNull`, mas é a mesma forma de query com o operador invertido.

---

### `src/components/lead-form-dialog.tsx` (component, request-response)

**Analog:** `01-RESEARCH.md` Pattern 1, linhas 313-328

```tsx
"use client";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@/lib/validations";
import { createLead } from "@/actions/lead-actions";

export function LeadFormDialog() {
  const [state, formAction, pending] = useActionState(createLead, undefined);
  const form = useForm({ resolver: zodResolver(leadSchema) });
  // form usado para validação/UX inline; formAction usado no <form action={formAction}>
}
```

**Decisões a aplicar na composição (não cobertas por código literal em RESEARCH.md):**
- D-01/D-02: dialog do shadcn com 3 seções visuais ("Contato", "Negócio", "Acompanhamento"), sem tabs — usar `Heading` 20px/600 para os títulos de seção (`01-UI-SPEC.md` Typography, linha 63).
- D-03: campo `subnichoId` renderizado via `<SubnichoCombobox>` (ver componente dedicado abaixo).
- D-04: fechar o dialog com `form.formState.isDirty === true` deve abrir `<DiscardChangesDialog>` em vez de fechar direto.
- `useActionState` é o padrão atual (React 19) — **nunca usar `useFormState`**, deprecado (`01-RESEARCH.md` State of the Art, linha 556).

---

### `src/components/lead-table.tsx` (component, CRUD client-side)

**Analog:** `01-RESEARCH.md` Pattern 3, linhas 392-407

```typescript
const table = useReactTable({
  data: leads,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: { pagination: { pageSize: 25 } }, // D-12
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  state: { sorting, columnFilters },
});
```

**Decisões a aplicar:**
- D-06: colunas visíveis por padrão = Nome, Sub-nicho, Etapa, Follow-up, Telefone (valor/canal/origem/notas só no modal).
- D-07: `onRowClick` abre `<LeadFormDialog>` pré-preenchido.
- D-08: coluna de ações com botões de ícone diretos (editar/excluir), alvo de toque 36px (`01-UI-SPEC.md` Spacing exceptions, linha 46).
- D-09: coluna Etapa renderiza `<EtapaBadge>`.
- D-11: filtros (sub-nicho, etapa, intervalo de follow-up) em toolbar fixa acima da tabela, usando `column.setFilterValue`.
- Filtro de intervalo de data usa `filterFn` customizada — ver Pitfall 6 (linhas 483-489) sobre normalizar com `date-fns` `startOfDay`/`endOfDay` antes de comparar, para evitar bug de fuso horário na virada do dia.
- D-13: estado vazio usa copy exata de `01-UI-SPEC.md` linhas 111-112 ("Nenhum lead cadastrado ainda" / "Comece adicionando seu primeiro lead...").

`src/components/lixeira-table.tsx` reaproveita a mesma configuração de `useReactTable`, mas com dado filtrado por `isNotNull(deletedAt)` e ação de linha = `restoreLead` (sem confirmação, D-17) em vez de editar/excluir.

---

### `src/components/subnicho-combobox.tsx` (component, request-response)

**Sem trecho de código literal em RESEARCH.md** — referência é orientação, não código:

- Pitfall 2 (linhas 438-444): a partir de julho de 2026 o `shadcn init` usa Base UI como padrão, que já expõe um componente `Combobox` nativo (`ComboboxInput`, `ComboboxContent`, `ComboboxItem`) instalável via `npx shadcn add combobox` — **não** compor manualmente `Popover` + `Command`/`cmdk` (receita antiga).
- Don't Hand-Roll (linha 424): usar o componente `Combobox` do shadcn em vez de `<select>` nativo + filtro manual.
- Ação recomendada antes de implementar: rodar `npx shadcn@latest init`, inspecionar `components.json` gerado para confirmar Base UI vs. Radix, e só então escrever a composição (Open Question 1 de RESEARCH.md, linha 573).

---

## Shared Patterns

### Validação: Zod no client E no server (nunca só client)
**Fonte:** `01-RESEARCH.md` Pattern 1 (linhas 271-275) e Anti-Patterns (linha 412)
**Aplica a:** `lead-form-dialog.tsx`, `subnicho-manager.tsx`, `lead-actions.ts`, `subnicho-actions.ts`
```typescript
// client: zodResolver(leadSchema) via react-hook-form — feedback inline imediato
// server: leadSchema.safeParse(...) dentro da Server Action — fonte de verdade, nunca pulável
```

### Server Actions como única porta de escrita (sem `app/api/*`)
**Fonte:** `01-RESEARCH.md` Structure Rationale (linha 268) e Anti-Patterns (linha 411)
**Aplica a:** todos os Client Components que mutam dado — sempre chamam uma função de `src/actions/`, nunca importam `src/db/client.ts` diretamente.

### `revalidatePath` após toda mutação
**Fonte:** `01-RESEARCH.md` linhas 309, 541-542, 547-548
**Aplica a:** `createLead`, `updateLead`, `softDeleteLead`, `restoreLead` chamam `revalidatePath("/")` (+ `revalidatePath("/lixeira")` quando a mutação afeta soft-delete/restore); `createSubnicho`/`renameSubnicho` chamam `revalidatePath("/subnichos")` e também `revalidatePath("/")` (o combobox de sub-nicho do formulário de lead depende dessa lista).

### Soft-delete via `deletedAt` nullable — nunca `DELETE FROM`
**Fonte:** `01-RESEARCH.md` linhas 369, 414, 538-548; Security Domain linha 609 (LEAD-04 é requisito, não só boa prática)
**Aplica a:** `lead-actions.ts` (`softDeleteLead`/`restoreLead`), queries de `page.tsx` (`isNull`) e `lixeira/page.tsx` (`isNotNull`).

### Índice único case-insensitive + checagem amigável em camadas
**Fonte:** `01-RESEARCH.md` Pattern 2 (linhas 330-352) e Pitfall 1 (linhas 431-437)
**Aplica a:** `db/schema.ts` (`uniqueIndex` sobre `lower(trim(nome))`) + `subnicho-actions.ts` (`SELECT` prévio para mensagem inline + `catch` de constraint violation como rede de segurança contra duplo-clique).

### Toasts e copy — usar exatamente as strings do contrato de UI
**Fonte:** `01-UI-SPEC.md` Copywriting Contract (linhas 105-123)
**Aplica a:** todas as Server Actions/Client Components que disparam `sonner` — usar literalmente "Lead salvo com sucesso.", "Sub-nicho criado.", "Sub-nicho renomeado.", "Lead restaurado com sucesso.", "Não foi possível salvar o lead. Tente novamente.", "Não foi possível carregar os leads. Recarregue a página." — não parafrasear.

### Normalização de fuso horário para `followUpDate`
**Fonte:** `01-RESEARCH.md` Pitfall 6 (linhas 483-489)
**Aplica a:** `lead-form-dialog.tsx` (normalizar a data do `<Calendar>` para meia-noite local antes de submeter), `lead-table.tsx` (filtro de intervalo de data via `date-fns` `startOfDay`/`endOfDay` antes de comparar).

### Dinheiro em centavos, nunca float
**Fonte:** `01-RESEARCH.md` linhas 362, 384
**Aplica a:** `db/schema.ts` (`valorEstimado` como `integer` em centavos), `validations.ts` (`z.coerce.number().nonnegative()` recebido em reais e convertido para centavos antes do insert, ou já recebido em centavos do form — decisão de implementação), exibição formatada com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

## No Analog Found

Arquivos sem trecho de código literal em `01-RESEARCH.md` — o planejador/executor deve seguir as decisões (`01-CONTEXT.md`) e o contrato visual/copy (`01-UI-SPEC.md`) listados, compondo com os primitivos shadcn/ui padrão:

| Arquivo | Role | Data Flow | Referência a seguir |
|---|---|---|---|
| `src/app/subnichos/page.tsx` | route/component | request-response | D-15/D-16 (`01-CONTEXT.md`); Server Component simples que busca `subnichos` e renderiza `<SubnichoManager>` |
| `src/components/app-sidebar.tsx` | component | request-response | D-18 (`01-CONTEXT.md`); largura fixa 240px, cor de fundo `#F4F4F5`, indicador de link ativo em `#0D9488` (`01-UI-SPEC.md` linhas 47, 75, 82) |
| `src/components/discard-changes-dialog.tsx` | component | event-driven | D-04; copy exata em `01-UI-SPEC.md` linha 122 |
| `src/components/delete-lead-dialog.tsx` | component | event-driven | D-05; copy exata (com interpolação de `{nome}`) em `01-UI-SPEC.md` linha 121 |
| `src/components/subnicho-manager.tsx` | component | CRUD | D-15/D-16; edição inline via ícone de lápis, "+ Adicionar" para nova linha, sem modal |
| `src/components/etapa-badge.tsx` | component | transform | D-09; paleta fixa de 4 cores em `01-UI-SPEC.md` linhas 92-101 (Novo=cinza, Contatado=azul, Negociação=âmbar, Fechado/Perdido=slate — nota: não usar verde/vermelho, ver justificativa na linha 101 do UI-SPEC) |
| `src/types/index.ts` | utility | transform | Derivar via `InferSelectModel`/`InferInsertModel` do Drizzle a partir de `db/schema.ts` — padrão idiomático do Drizzle, não exemplificado literalmente em RESEARCH.md |
| `src/components/ui/*` | component (primitivos) | n/a | Gerados por `npx shadcn@latest add table form dialog select combobox calendar badge button input textarea sonner` (`01-RESEARCH.md` linhas 156-158) — não escrever à mão |

## Metadata

**Escopo de busca de analogs:** repositório inteiro (`C:\Users\Vencedor\Desktop\crm-leads`) — confirmado greenfield via `ls` (só `.claude/`, `.git/`, `.planning/`, `CLAUDE.md` existem; sem `package.json`/`src/`).
**Arquivos varridos:** 0 arquivos de aplicação (nenhum existe); 2 documentos de planejamento lidos na íntegra (`01-CONTEXT.md`, `01-RESEARCH.md`) + `01-SPEC.md` e `01-UI-SPEC.md` como contexto complementar.
**Fonte de padrões:** `01-RESEARCH.md` (`## Architecture Patterns`, `## Code Examples`) — todo trecho de código citado acima é extração literal, não paráfrase.
**Data de extração:** 2026-07-19

---
*Fase: 01-lead-sub-nicho-foundation*
*Pattern mapping gerado em: 2026-07-19*
