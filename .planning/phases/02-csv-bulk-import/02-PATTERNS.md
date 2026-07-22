# Fase 2 — Mapa de Padrões (CSV Bulk Import)

**Gerado:** 2026-07-22
**Fonte:** `02-CONTEXT.md`, `02-RESEARCH.md`, `02-UI-SPEC.md` + leitura direta do código existente

Este documento mapeia cada arquivo a ser criado/modificado nesta fase para o padrão análogo mais próximo já existente no repositório, com trechos concretos de código para copiar/adaptar. Objetivo: a fase de implementação deve **reaproveitar**, não reinventar — todo arquivo abaixo tem um "arquivo-espelho" real já rodando em produção neste CRM.

---

## 1. Visão geral — arquivos desta fase x análogos existentes

| Arquivo novo/modificado | Papel | Análogo mais próximo | Reaproveita de |
|---|---|---|---|
| `src/db/schema.ts` (modificado) | Coluna aditiva `importBatchId` | `motivoPerda`/`stageChangedAt` (linhas 45-46) | Padrão de coluna nullable aditiva |
| `src/db/migrations/000X_*.sql` (gerado por `drizzle-kit push`/`generate`) | Migração aditiva | `0001_grey_xavin.sql` | `ALTER TABLE ... ADD` puro, sem `DELETE`/`DROP` |
| `src/lib/csv-encoding.ts` (novo) | Sniff de encoding (BOM + TextDecoder) | `src/lib/phone.ts` (módulo puro, sem dependência de DB/React) | Estilo de função pura, comentário de contrato no topo |
| `src/lib/csv-import.ts` (novo) | Tipos de linha mapeada + dedup client-side dentro do lote | `src/lib/whatsapp.ts` (módulo puro) | Estilo de módulo puro + doc-comment de contrato |
| `src/lib/validations.ts` (modificado — nova export) | Schema Zod de linha CSV mapeada | `leadSchema` (linhas 9-41) | Reaproveita `normalizePhone`/`parseBRLToCents` exatamente como `leadSchema` já faz |
| `src/actions/import-actions.ts` (novo) | `fetchPreviewSupportData()` + `bulkImportLeads()` Server Actions | `src/actions/lead-actions.ts` (`createLead`) + `src/actions/subnicho-actions.ts` (`createSubnicho`) | `"use server"`, `ActionState`, `safeParse`, `revalidatePath`, checagem case-insensitive-trim de sub-nicho |
| `src/app/importar/page.tsx` (novo) | Página wizard (server component, busca `subnichos`+`templates`) | `src/app/leads/page.tsx` | Fetch paralelo via `Promise.all`, passa dados para client component |
| `src/components/csv-import-wizard.tsx` (novo, orquestrador client) | Estado dos 3 passos (upload/mapear/prévia) + tela pós-importação | `src/components/lead-table.tsx` (padrão de `DialogState`/`useState` machine) | Discriminated union de estado, não `useReducer` |
| `src/components/csv-upload-dropzone.tsx` (novo) | Seleção/drag-and-drop de arquivo | Nenhum análogo direto de UI — segue convenções gerais de `Field`/`Button` do design system | `Button` variant="outline", ícone `Upload` lucide |
| `src/components/csv-column-mapper.tsx` (novo) | Mapeamento colunas CSV → campos do lead | `LeadFormDialog` (estrutura `Field`/`FieldLabel`/`Select`) | Mesmos primitivos `Field`/`Select` do formulário de lead |
| `src/components/csv-import-preview-table.tsx` (novo) | Tabela de prévia com flags (duplicado/novo sub-nicho/bloqueado) | `src/components/lead-table.tsx` + `src/components/lead-table-columns.tsx` (`@tanstack/react-table`, `ColumnDef`, `meta`) | `useReactTable({ getCoreRowModel: getCoreRowModel() })` sem sort/filtro/paginação (prévia não precisa) |
| `src/components/post-import-lead-list.tsx` (novo) | Lista pós-importação com botão "Enviar WhatsApp" por linha | `src/components/followup-dashboard.tsx` (padrão `PreviewState` + `WhatsAppSendButton` + `WhatsAppPreviewDialog` único) | Copiado quase verbatim, trocando `defaultTipo="follow_up"` por `"primeiro_contato"` |
| `src/components/app-sidebar.tsx` (modificado — 1 linha) | Novo item de nav "Importar" → `/importar` | `NAV_ITEMS` array (linhas 7-14) | Adicionar `{ href: "/importar", label: "Importar" }` após `/leads` |
| `src/actions/subnicho-actions.ts` (reaproveitado, não modificado) | Lógica de auto-criação de sub-nicho | — | Chamado (ou sua query espelhada) dentro da transaction de `bulkImportLeads` |
| `src/lib/phone.ts` (reaproveitado, não modificado) | `normalizePhone()` para dedup | — | Usado em `csv-import.ts` (dedup dentro do lote) e em `import-actions.ts` (dedup contra o banco) |

---

## 2. Schema aditivo — `src/db/schema.ts`

### Padrão a seguir (precedente exato: `motivoPerda`/`stageChangedAt`)

```typescript
// src/db/schema.ts — trecho atual (linhas 30-57)
export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }).notNull(),
    origem: text("origem").notNull(),
    valorEstimado: integer("valor_estimado_centavos").notNull(),
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: [...] }).notNull().default("novo"),
    motivoPerda: text("motivo_perda"), // nullable, D-03 (Fase 1)
    stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default
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

**Adição desta fase (LEAD-05), seguindo exatamente o mesmo formato nullable-sem-default de `motivoPerda`:**

```typescript
importBatchId: text("import_batch_id"), // nullable = lead criado manualmente (LEAD-05)
```

...e um novo índice na lista de `index(...)`:

```typescript
index("leads_import_batch_id_idx").on(table.importBatchId),
```

### Migração — precedente exato

`src/db/migrations/0001_grey_xavin.sql` (migração puramente aditiva, sem backfill):
```sql
ALTER TABLE `leads` ADD `motivo_perda` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `stage_changed_at` integer;
```

A migração desta fase deve seguir o mesmo formato (`ALTER TABLE leads ADD import_batch_id text;`), gerada via `drizzle-kit generate` (não escrita à mão) para manter `meta/_journal.json` e o snapshot consistentes — mesmo fluxo usado nas migrações `0000`-`0002` existentes. **Não** precisa de um `000X_backfill-*.sql` companheiro como `0002_backfill-fechado-perdido-split.sql` — diferente de `stageChangedAt` (que precisou de backfill para linhas pré-existentes), `importBatchId` é legitimamente `NULL` para todo lead já existente/criado manualmente, sem necessidade de preencher retroativamente.

**Guard `npm run guard:no-hard-delete`:** a migração desta fase não deve conter `DELETE FROM`/`DROP TABLE` — só `ALTER TABLE ... ADD`, que já passa no guard sem alteração no script (`scripts/guard-no-hard-delete.cjs` varre `src/db/migrations/*.sql` atrás desses padrões destrutivos, não bloqueia `ALTER TABLE ADD`).

---

## 3. `src/lib/csv-encoding.ts` (novo) — módulo puro

### Padrão a seguir (precedente de estilo: `src/lib/phone.ts`)

```typescript
// src/lib/phone.ts — estilo de referência: doc-comment de CONTRATO no topo,
// função pura exportada, sem I/O, sem dependência de React/DB.
/**
 * Contrato de telefone do CRM: normaliza qualquer formatação ... para
 * dígitos-only com DDI 55 (Brasil) ... Retorna null se o número não puder
 * ser normalizado para um comprimento válido.
 */
export function normalizePhone(input: string): string | null { ... }
```

O novo `csv-encoding.ts` deve seguir o mesmo formato: doc-comment de contrato + função pura `async function decodeCsvFile(file: File): Promise<string>` (ver implementação completa em `02-RESEARCH.md` Pattern 1 — BOM check, depois `TextDecoder("utf-8", {fatal:true})`, fallback `windows-1252`).

---

## 4. `src/lib/validations.ts` — nova export de schema CSV

### Padrão a seguir (precedente exato: `leadSchema`)

```typescript
// src/lib/validations.ts (linhas 9-41) — schema atual
export const leadSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  telefone: z.string().trim().min(1, "Telefone é obrigatório.").transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Use DDD + número (ex.: (11) 91234-5678)." });
      return z.NEVER;
    }
    return normalized;
  }),
  canal: z.enum(["instagram", "whatsapp"], { error: "Selecione um canal de contato." }),
  origem: z.string().trim().min(1, "Origem é obrigatória."),
  valorEstimado: z.preprocess((v) => parseBRLToCents(String(v ?? "")), z.number({ error: "Valor estimado é obrigatório." }).int().nonnegative()),
  notas: z.string().trim().min(1, "Notas são obrigatórias."),
  followUpDate: z.coerce.date(),
  subnichoId: z.coerce.number().int().positive("Selecione um sub-nicho."),
  stage: z.enum([...]).default("novo"),
  motivoPerda: z.string().trim().optional(),
});
```

**Reaproveitamento recomendado (não uma cópia paralela):** o schema de linha CSV confirmada (server-side, dentro de `bulkImportLeads`) deve reusar `leadSchema` diretamente ou derivar dele via `.extend()`/`.omit()` — nunca reimplementar a validação de telefone/valor/etc. Isso satisfaz diretamente o "Don't Hand-Roll" do RESEARCH.md ("reuse `normalizePhone()`" e a mesma regra Zod já usada por `createLead`). Exemplo de shape adicional (import-specific, apenas o batchId e o nome bruto de sub-nicho antes da resolução para id):

```typescript
// src/lib/validations.ts — nova export desta fase
export const csvRowSchema = leadSchema.omit({ subnichoId: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."), // D-12: bloqueia linha vazia
});
```

---

## 5. `src/actions/import-actions.ts` (novo)

### Padrão A — `ActionState` + `safeParse` (precedente: `createLead` em `src/actions/lead-actions.ts`)

```typescript
// src/actions/lead-actions.ts (linhas 1-20, 44-82) — padrão de Server Action
"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema } from "@/lib/validations";
import type { Lead } from "@/types";

type ActionState =
  | { success: true; lead?: Lead }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

export async function createLead(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // ... FK backstop, insert, revalidatePath("/"), revalidatePath("/leads"), revalidatePath("/pipeline")
}
```

`bulkImportLeads(rows: ConfirmedRow[])` desta fase **não** é ligada a `useActionState`/`FormData` (é chamada com um array já processado no client, não um `<form>`) — nesse aspecto o padrão mais próximo é `updateLeadStage` em `lead-actions.ts` (linhas 151-187), que já é uma Server Action de **argumentos posicionais**, não `(_prevState, formData)`:

```typescript
// src/actions/lead-actions.ts (linhas 151-187) — precedente de Server Action
// com argumentos posicionais (não useActionState), chamada direto do client:
export async function updateLeadStage(
  id: number,
  stage: Lead["stage"],
  motivoPerda?: string
): Promise<ActionState> {
  const parsed = stageUpdateSchema.safeParse({ id, stage, motivoPerda });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // ...
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { success: true };
}
```

`bulkImportLeads(rows, batchId?)` segue esse mesmo formato: função `async` exportada de `"use server"`, argumentos posicionais tipados, `safeParse` de cada linha, retorno `ActionState`-like.

### Padrão B — Dedup + auto-criação de sub-nicho case-insensitive-trim (precedente exato: `createSubnicho`)

```typescript
// src/actions/subnicho-actions.ts (linhas 14-42) — a MESMA query deve ser
// reaproveitada (não reimplementada) dentro da transaction de bulkImportLeads.
export async function createSubnicho(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = subnichoSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

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
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  revalidatePath("/subnichos");
  revalidatePath("/");
  return { success: true };
}
```

**Regra crítica (Pitfall 6 do RESEARCH.md):** `fetchPreviewSupportData()` (chamado durante a prévia, antes de confirmar) e `bulkImportLeads()` (chamado ao confirmar) devem usar **a mesma** query `lower(trim(${subnichos.nome})) = lower(trim(${nome}))` — extrair para um helper compartilhado dentro de `import-actions.ts` em vez de duplicar a string SQL em dois pontos, para que "o que será criado" (prévia) nunca divirja de "o que foi criado" (confirmação).

### Padrão C — Transaction + insert loop (não `.values([...allRows])`)

Ver `02-RESEARCH.md` seção "Code Examples" (`bulkImportLeads`, linhas 383-445) — já contém o pattern completo pronto para adaptar: `db.transaction((tx) => { ... })`, resolução de `subnichoIdByNome` via `Map`, loop `for (const row of rows)` com insert single-row (nunca multi-row `.values([...])`, ver Pitfall 3), depois `revalidatePath("/")`/`"/leads"`/`"/pipeline"` — **mesmo trio de `revalidatePath` já usado em `createLead`/`softDeleteLead`/`restoreLead`** em `lead-actions.ts`.

### Padrão D — Checagem de duplicado (contra banco) via `normalizePhone`

```typescript
// src/lib/phone.ts — reaproveitar exatamente, nunca reimplementar
export function normalizePhone(input: string): string | null { ... }
```

`fetchPreviewSupportData(phones: string[], subnichoNames: string[])` deve:
1. Normalizar `phones` com `normalizePhone()` antes de comparar (nunca comparar string crua — Pitfall 5 do RESEARCH.md).
2. Consultar `leads` ativos (`isNull(leads.deletedAt)`, mesmo padrão de `LeadsPage`) filtrando por `telefone IN (...)`.
3. Consultar `subnichos` com a mesma query case-insensitive-trim do Padrão B acima.

---

## 6. Rota `/importar` — `src/app/importar/page.tsx`

### Padrão a seguir (precedente exato: `src/app/leads/page.tsx`)

```typescript
// src/app/leads/page.tsx (arquivo completo, 31 linhas)
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, subnichos, templates } from "@/db/schema";
import { LeadTable } from "@/components/lead-table";

export default async function LeadsPage() {
  const [activeLeads, allSubnichos, allTemplates] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
    db.select().from(templates),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Leads</h1>
      <LeadTable leads={activeLeads} subnichos={allSubnichos} templates={allTemplates} />
    </div>
  );
}
```

`src/app/importar/page.tsx` segue o mesmo formato: server component `async`, busca `subnichos` + `templates` via `Promise.all` (não precisa buscar `leads` — o CSV é a fonte de dados do wizard), passa tudo para um client component orquestrador (`CsvImportWizard`). Título `<h1>` no mesmo padrão de classe (`text-[28px] font-semibold leading-tight`), conforme `02-UI-SPEC.md` ("Título da página `/importar`: 'Importar leads'").

**Tela pós-importação:** conforme Open Question 2 do RESEARCH.md e a recomendação de rota `/importar/[batchId]` — se implementada como rota dedicada, segue o mesmo padrão server-component acima, mas filtrando `leads` por `eq(leads.importBatchId, batchId)` + `isNull(leads.deletedAt)` (usa o índice `leads_import_batch_id_idx` da Seção 2).

---

## 7. Item de navegação — `src/components/app-sidebar.tsx`

### Padrão a seguir (modificação mínima, 1 linha)

```typescript
// src/components/app-sidebar.tsx (linhas 7-14) — array atual
const NAV_ITEMS = [
  { href: "/", label: "Follow-ups" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/templates", label: "Templates" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;
```

Conforme `02-UI-SPEC.md` ("inserido logo após 'Leads' em `NAV_ITEMS`"), a única mudança necessária é inserir `{ href: "/importar", label: "Importar" }` logo após o item `/leads` — o restante do componente (lógica de `isActive`, cor teal ativa) já funciona sem alteração para o novo item.

---

## 8. Tabela de prévia com flags — `src/components/csv-import-preview-table.tsx`

### Padrão A — `@tanstack/react-table` com `ColumnDef` + `meta` (precedente: `lead-table-columns.tsx` + `lead-table.tsx`)

```typescript
// src/components/lead-table-columns.tsx (linhas 17-23) — canal de callback
// via `meta`, necessário porque os column defs são um `const` fora do
// componente e não têm acesso direto ao estado local (dialogState etc.)
declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    onEditLead?: (lead: LeadRow) => void;
    onDeleteLead?: (lead: LeadRow) => void;
  }
}
```

```typescript
// src/components/lead-table.tsx (linhas 77-92) — setup mínimo do
// useReactTable; a prévia desta fase precisa só de getCoreRowModel (sem
// sort/filtro/paginação — o admin vê TODAS as linhas de uma vez, IMPORT-01)
const table = useReactTable({
  data,
  columns: leadTableColumns,
  getCoreRowModel: getCoreRowModel(),
  meta: {
    onEditLead: (lead) => setDialogState({ mode: "edit", lead }),
    onDeleteLead: (lead) => setDeleteState({ open: true, lead }),
  },
});
```

Para a prévia desta fase, `meta` deve expor callbacks equivalentes: `onToggleImportAnyway(rowId)` (D-05, checkbox "Importar mesmo assim") e `onAssignSubnicho(rowId, subnichoId)` (D-12, combobox inline em linha bloqueada) — mesmo canal `meta`, novo formato de dado.

### Padrão B — Badge de flag colorido (precedente exato: `EtapaBadge`)

```typescript
// src/components/etapa-badge.tsx (arquivo completo) — padrão de badge
// com paleta fixa por chave de enum, usando <Badge variant="outline"> +
// style inline de bg/text (não classe Tailwind, porque a cor é dinâmica
// por valor de dado)
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo: { label: "Novo", bg: "#F4F4F5", text: "#3F3F46" },
  contatado: { label: "Contatado", bg: "#DBEAFE", text: "#1D4ED8" },
  // ...
};

export function EtapaBadge({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge variant="outline" className="border-transparent" style={{ backgroundColor: config.bg, color: config.text }}>
      {config.label}
    </Badge>
  );
}
```

O novo componente de flag (ex. `csv-row-flag-badge.tsx`, ou inline dentro de `csv-import-preview-table.tsx` se for pequeno o bastante) segue exatamente este padrão, com as 3 cores já travadas em `02-UI-SPEC.md`:

| Flag | bg | text | Ícone lucide |
|---|---|---|---|
| Duplicado (D-05) | `#FEF3C7` | `#B45309` | `TriangleAlert` |
| Novo sub-nicho (D-10) | `#DBEAFE` | `#1D4ED8` | `Sparkles` |
| Sub-nicho obrigatório / bloqueado (D-12) | `#FEE2E2` | `#B91C1C` | `CircleAlert` |

A flag "bloqueado" (D-12) também aplica `border-l-4 border-l-[#DC2626]` na `<TableRow>` inteira (não só o badge) — ver `02-UI-SPEC.md` seção Color. Nenhuma das 3 flags usa a cor accent teal (`#0D9488`), que fica reservada só para botões de ação (mesma disciplina já registrada para `WhatsAppSendButton`).

### Padrão C — Combobox inline de sub-nicho em linha bloqueada (precedente exato: `SubnichoCombobox`)

```typescript
// src/components/subnicho-combobox.tsx (arquivo completo) — reaproveitar
// sem modificação, só contido a max-w-[220px] dentro da célula (02-UI-SPEC.md)
export function SubnichoCombobox({ subnichos, value, onValueChange, name = "subnichoId", disabled, invalid }: SubnichoComboboxProps) {
  // ...
}
```

Uso na célula da tabela de prévia (linha D-12 bloqueada):
```tsx
<div className="max-w-[220px]">
  <SubnichoCombobox
    subnichos={subnichos}
    value={row.subnichoId ?? null}
    onValueChange={(id) => onAssignSubnicho(row.id, id)}
  />
</div>
```

---

## 9. Tela pós-importação — `src/components/post-import-lead-list.tsx`

### Padrão a seguir (precedente exato, quase cópia verbatim: `followup-dashboard.tsx`)

```typescript
// src/components/followup-dashboard.tsx (linhas 1-30, 55-56, 182-198, 219-228)
// — este é o padrão EXATO que D-14 deve reaproveitar, trocando apenas
// defaultTipo="follow_up" por defaultTipo="primeiro_contato"
"use client";

import { useState } from "react";
import { WhatsAppSendButton } from "@/components/whatsapp-send-button";
import { WhatsAppPreviewDialog } from "@/components/whatsapp-preview-dialog";
import { normalizePhone } from "@/lib/phone";
import type { Lead, Template } from "@/types";

type PreviewState = { open: false } | { open: true; lead: Lead; subnichoNome: string };

export function PostImportLeadList({ leads, subnichoNameById, templates }: Props) {
  const [previewState, setPreviewState] = useState<PreviewState>({ open: false });

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <div key={lead.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4">
          <span className="text-[16px] leading-normal font-normal text-foreground">{lead.nome}</span>
          <WhatsAppSendButton
            nome={lead.nome}
            disabled={normalizePhone(lead.telefone) === null}
            onClick={() =>
              setPreviewState({ open: true, lead, subnichoNome: subnichoNameById.get(lead.subnichoId) ?? "—" })
            }
          />
        </div>
      ))}

      <WhatsAppPreviewDialog
        open={previewState.open}
        onOpenChange={(open) => { if (!open) setPreviewState({ open: false }); }}
        lead={previewState.open ? previewState.lead : undefined}
        subnichoNome={previewState.open ? previewState.subnichoNome : ""}
        templates={templates}
        defaultTipo="primeiro_contato"
      />
    </div>
  );
}
```

**Nenhuma mudança necessária em `WhatsAppPreviewDialog` (`src/components/whatsapp-preview-dialog.tsx`) nem em `WhatsAppSendButton` (`src/components/whatsapp-send-button.tsx`)** — ambos já aceitam exatamente os props que este reuso precisa (confirmado por leitura direta de ambos os arquivos). `defaultTipo="primeiro_contato"` é a única diferença semântica em relação ao dashboard de follow-ups.

**D-13 (não usar `useFirstContactTrigger` aqui):** o hook `src/hooks/use-first-contact-trigger.ts` existe especificamente para o auto-disparo em criação manual de lead único (usado em `lead-form-dialog.tsx`, linhas 97, 129-134, 414-424) — **não** deve ser usado no fluxo de importação em lote, porque `trigger()` só segura 1 alvo por vez e D-13 proíbe abrir modais em sequência para N leads. O padrão `useState<PreviewState>` inline de `followup-dashboard.tsx` é o correto aqui (1 dialog compartilhado, disparado por clique individual do admin, nunca automaticamente).

---

## 10. Convenções transversais confirmadas por leitura direta do código

- **Toda Server Action de mutação usa `"use server"` no topo do arquivo** (não por função) — ver `lead-actions.ts` linha 1, `subnicho-actions.ts` linha 1.
- **`revalidatePath` sempre em conjunto `"/"`, `"/leads"`, `"/pipeline"`** após qualquer mutação em `leads` (ver `createLead`, `softDeleteLead`, `restoreLead`, `updateLeadStage`) — `bulkImportLeads` deve replicar exatamente esse trio.
- **Toda tabela de dados usa `isNull(leads.deletedAt)`** ao consultar leads ativos (ver `LeadsPage`, `lead-actions.ts` em `updateLead`/`updateLeadStage`) — a query de duplicado em `fetchPreviewSupportData` deve filtrar da mesma forma (leads soft-deletados não contam como duplicado ativo).
- **Cores são sempre inline `style={{...}}` ou classe arbitrária Tailwind `bg-[#HEX]`**, nunca token de tema customizado — consistente em `EtapaBadge`, `followup-dashboard.tsx`, `whatsapp-send-button.tsx`.
- **Nenhum arquivo usa `useReducer`** — toda máquina de estado local usa `useState` com union type discriminado (`DialogState`, `PreviewState`, `DeleteState`) — o wizard de importação (upload/mapear/prévia/pós-importação) deve seguir o mesmo padrão, não introduzir `useReducer` como uma nova convenção.
- **Dinheiro é sempre `integer` centavos**, nunca float — `src/lib/money.ts` (`parseBRLToCents`/`formatCentsToBRL`) deve ser reaproveitado tal como é para a coluna "Valor estimado" mapeável do CSV, mesma forma que `leadSchema` já faz.
- **Nenhuma migração em `src/db/migrations/*.sql` pode conter `DELETE FROM`/`DROP TABLE`** (guard `npm run guard:no-hard-delete`, `scripts/guard-no-hard-delete.cjs`) — a migração aditiva desta fase (`ALTER TABLE leads ADD import_batch_id text`) já está em conformidade por natureza.

---

*Padrões mapeados: 2026-07-22*
