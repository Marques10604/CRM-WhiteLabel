# Fase 11: Painel de Métricas e Relatório de Motivos de Perda - Mapa de Padrões

**Mapeado:** 2026-08-27
**Arquivos analisados:** 24 (12 novos, 12 modificados)
**Análogos encontrados:** 22 / 24 com análogo forte no próprio repositório

> Esta fase é 100% replicação de precedente interno. Não há biblioteca externa
> nova. Para quase todo arquivo novo existe um gêmeo quase-idêntico já em
> produção. O risco real é **divergir** do padrão (texto livre em vez de FK,
> esquecer a 2ª superfície de captura, rodar `drizzle-kit push`).

---

## Classificação dos Arquivos

### Novos

| Arquivo novo | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|--------------|-------|----------------|----------------------|-----------|
| `src/actions/motivo-perda-actions.ts` | action (server) | CRUD + soft-delete | `src/actions/subnicho-actions.ts` | exata (1:1) |
| `src/components/motivo-perda-manager.tsx` | component (client) | CRUD inline | `src/components/subnicho-manager.tsx` | exata (1:1) |
| `src/components/delete-motivo-perda-dialog.tsx` | component (client) | request-response (confirm) | `src/components/delete-subnicho-dialog.tsx` | exata (1:1) |
| `src/components/motivo-perda-combobox.tsx` | component (client) | transform (select + create-on-the-fly) | `src/components/subnicho-combobox.tsx` | role-match (precisa de afordância "Criar") |
| `src/components/periodo-selector.tsx` | component (client) | event-driven (querystring) | `src/components/lead-table-toolbar.tsx` (`Select` + `ACCENT_FOCUS_RING`) | parcial (sem precedente de `searchParams`/`router.push`) |
| `src/app/motivos-perda/page.tsx` | route (Server Component) | request-response (leitura) | `src/app/subnichos/page.tsx` | exata (1:1) |
| `src/app/relatorios/page.tsx` | route (Server Component) | batch (agregação server-side) | `src/app/pipeline/page.tsx` | role-match |
| `scripts/migrate-motivos-perda.cjs` | migration | file-I/O + DDL | `scripts/migrate-sequencia-followup.cjs` + `scripts/backfill-origem-tipo.cjs` | exata (1:1) |
| `scripts/test-relatorios-queries.cjs` | test | unit + integration (`:memory:`) | `scripts/test-compute-sequencia-sugestao.cjs` | exata (1:1) |
| `scripts/test-motivo-perda-actions.cjs` | test | integration (banco temp isolado) | `scripts/test-lead-actions.cjs` | role-match |
| `scripts/verify-motivo-perda-obrigatorio.cjs` | test | static-source + `:memory:` truth-table | `scripts/verify-sequencia-posicao.cjs` | exata (1:1) |
| `scripts/verify-motivos-perda-schema.cjs` (ou estender `verify-schema.cjs`) | test | structural (`PRAGMA`) | `scripts/verify-schema.cjs` | exata (1:1) |

### Modificados

| Arquivo | Papel | Mudança | Padrão-fonte a copiar |
|---------|-------|---------|-----------------------|
| `src/db/schema.ts` | model | + tabela `motivosPerda`; + coluna `leads.motivoPerdaId` (FK) | bloco `subnichos` (linhas 4-16); FK `subnichoId` (linha 46) |
| `src/db/queries.ts` | model/query | + 3 agregações `GROUP BY` + 2 funções puras | `getUltimaInteracaoWhatsAppPorLead` (90-101), `computeSequenciaSugestao` (135-146), `groupLeadsByUrgency` (36-55) |
| `src/lib/validations.ts` | config (contratos Zod) | + `motivoPerdaSchema`; `motivoPerda`→`motivoPerdaId` condicional em `stageUpdateSchema`/`leadSchema` | `subnichoSchema` (6-8), `stageUpdateSchema` (72-76) |
| `src/actions/lead-actions.ts` | action | `updateLead`/`updateLeadStage` gravam `motivoPerdaId`; validação obrigatória (D-04) | idioma condicional-por-valor-alvo já presente (linhas 132, 145, 197, 203); `subnichoExists` (41-47) |
| `src/components/lead-form-dialog.tsx` | component | `<Textarea>` motivoPerda → `<MotivoPerdaCombobox>` no `Field` condicional | uso de `<SubnichoCombobox>` via `Controller` (linhas 322-333) |
| `src/components/motivo-perda-dialog.tsx` | component | `<Textarea>`/"Pular" → combobox obrigatório + "Cancelar" que reverte o drag | `delete-subnicho-dialog.tsx` (`showCloseButton={false}` + footer 2 botões) |
| `src/components/pipeline-board.tsx` | component | tipo do motivo `string \| undefined` → `number`; "Cancelar" reverte etapa otimista | fila `motivoQueueRef` / `resolveMotivoPerda` já presentes (75-171) |
| `src/components/app-sidebar.tsx` | config (nav) | + 2 entradas em `NAV_ITEMS` | array `NAV_ITEMS` (17-26) |
| `scripts/guard-no-hard-delete.cjs` | config (guard) | + `motivos_perda` em `CODE_PATTERNS` e `CODE_SQL_PATTERNS` | extensão feita para `interacoes` (linhas 53-71) |
| `scripts/verify-schema.cjs` | test | + checagem de presença `motivos_perda` / `leads.motivo_perda_id` | bloco de presença `sequencia_posicao` (linhas 82-94) |
| `package.json` | config | + `test:relatorios`, `test:motivo-perda-actions`, `verify:motivo-perda`, `verify:motivos-perda-schema` | bloco `scripts` (linhas 5-18) |
| `src/types/index.ts` | model | + `export type MotivoPerda = InferSelectModel<typeof motivosPerda>` | linhas 7-8 (`Subnicho`) |

---

## Atribuições de Padrão (por arquivo)

### `src/db/schema.ts` — tabela `motivosPerda` + FK (model)

**Análogo:** bloco `subnichos`, `src/db/schema.ts:4-16` — réplica direta.

```typescript
// COPIAR de subnichos (linhas 4-16), trocar nomes:
export const motivosPerda = sqliteTable(
  "motivos_perda",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("motivo_perda_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("motivos_perda_deleted_at_idx").on(table.deletedAt),
  ]
);
```

**FK em `leads`** — copiar o idioma de `subnichoId` (`src/db/schema.ts:46`), mas **nullable** (obrigatoriedade é condicional a `stage==="perdido"`, reforçada em Zod, não em constraint — precedente `stageChangedAt`, linha 51):

```typescript
// substitui: motivoPerda: text("motivo_perda")  (linha 50)
motivoPerdaId: integer("motivo_perda_id").references(() => motivosPerda.id, { onDelete: "restrict" }),
```

Adicionar `index("leads_motivo_perda_id_idx").on(table.motivoPerdaId)` ao array de índices de `leads` (linhas 59-65) — cobre o `GROUP BY motivoPerdaId` da Seção 3 do relatório, mesmo raciocínio de `leads_subnicho_id_idx`.

**`motivosPerda` deve ser declarada ANTES de `leads`** no arquivo (mesma ordem `subnichos` → `leads` hoje) — a referência de FK exige a tabela já definida.

---

### `src/actions/motivo-perda-actions.ts` — CRUD governado (action)

**Análogo:** `src/actions/subnicho-actions.ts` — réplica 1:1, trocar `subnichos`→`motivosPerda`, ajustar `revalidatePath`.

**Padrão de reativação-por-nome (D-03)** — `src/actions/subnicho-actions.ts:24-43`:

```typescript
const existing = await db
  .select()
  .from(motivosPerda)
  .where(sql`lower(trim(${motivosPerda.nome})) = lower(trim(${nome}))`);
if (existing.length > 0) {
  if (existing[0].deletedAt !== null) {
    await db.update(motivosPerda).set({ deletedAt: null, nome }).where(eq(motivosPerda.id, existing[0].id));
    revalidatePath("/motivos-perda");
    revalidatePath("/pipeline");
    revalidatePath("/leads");
    revalidatePath("/relatorios");
    return { success: true, id: existing[0].id }; // ver DIVERGÊNCIA abaixo
  }
  return { errors: { nome: ["Esse motivo já existe."] } };
}
try {
  await db.insert(motivosPerda).values({ nome });
} catch {
  return { errors: { nome: ["Esse motivo já existe."] } };
}
```

**DIVERGÊNCIA DELIBERADA do molde `createSubnicho`:** `createSubnicho` retorna só `{ success: true }` porque o `SubnichoCombobox` recebe a lista completa por prop e não precisa do id imediatamente. `createMotivoPerda` é chamado de dentro do combobox para **criar-e-já-selecionar** (D-03), então o `ActionState` precisa carregar o `id` inserido/reativado. Ampliar o tipo:

```typescript
type ActionState =
  | { success: true; id: number }
  | { errors: { nome: string[] } }
  | undefined;
// no INSERT: const [row] = await db.insert(motivosPerda).values({ nome }).returning({ id: motivosPerda.id });
```

**`softDeleteMotivoPerda`** — copiar `softDeleteSubnicho` (`src/actions/subnicho-actions.ts:65-83`) incluindo o `isNull(deletedAt)` no WHERE (idempotência) e o doc-comment sobre `onDelete: "restrict"` intacto.

**`renameMotivoPerda`** — copiar `renameSubnicho` (`src/actions/subnicho-actions.ts:85-118`) incluindo o check `existing.some((row) => row.id !== id)` e o try/catch rede-de-segurança do uniqueIndex.

**Validação Zod:** `motivoPerdaSchema` espelha `subnichoSchema` (`src/lib/validations.ts:6-8`):
```typescript
export const motivoPerdaSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});
```

---

### `src/components/motivo-perda-manager.tsx` — gestão inline (component)

**Análogo:** `src/components/subnicho-manager.tsx` — réplica 1:1. Copiar `SubnichoRow` + `SubnichoManager` inteiros, trocar:
- imports de actions → `motivo-perda-actions`
- `DeleteSubnichoDialog` → `DeleteMotivoPerdaDialog`
- tipo `Subnicho` → `MotivoPerda`
- textos de toast: `"Motivo de perda criado."` / `"...renomeado."` / `"...removido."` (11-UI-SPEC.md §Copywriting linhas 110-113)
- placeholder: `"Nome do motivo de perda"` (11-UI-SPEC.md linha 109)
- empty state: `"Nenhum motivo de perda cadastrado."` (11-UI-SPEC.md linha 108)

**Manter sem alteração:** o padrão `useActionState<ActionState, FormData>` (linha 21), o `useEffect` de sucesso→toast→reset (26-31), o `fieldError` derivado de `state.errors.nome?.[0]` (33-34), os alvos de toque `h-9 w-9` dos botões `Pencil`/`Trash2` (49-65), as classes `hover:bg-[#F4F4F5]` / `text-[#0D9488]` / `text-[#DC2626]`.

**Cuidado com o novo shape do `ActionState`:** `createMotivoPerda` agora retorna `{ success: true; id }` — o guard `"success" in state && state.success` (linha 27/120) continua funcionando, mas o `<MotivoPerdaManager>` não precisa do `id` (só o combobox precisa).

---

### `src/components/delete-motivo-perda-dialog.tsx` (component)

**Análogo:** `src/components/delete-subnicho-dialog.tsx` — réplica 1:1. Manter `<DialogContent showCloseButton={false}>`, footer com `Button variant="outline"` (Cancelar) + `Button variant="destructive"` (Remover).

**Copy** (11-UI-SPEC.md linha 114):
- Título: `"Remover motivo de perda"`
- Corpo: `` `Tem certeza que deseja remover ${nome}? Ele deixa de aparecer nas opções ao mover um lead para Perdido. Os leads já perdidos com esse motivo continuam intactos.` ``

---

### `src/components/motivo-perda-combobox.tsx` — combobox criável (component)

**Análogo estrutural:** `src/components/subnicho-combobox.tsx`. **Território novo:** primeiro combobox com afordância de criação do projeto.

**Copiar sem mudança** — o filtro anti-soft-delete (`src/components/subnicho-combobox.tsx:45-51`, causa-raiz documentada em `.planning/debug/resolved/subnicho-combobox-vazio.md`):

```typescript
const items = useMemo(
  () =>
    motivosPerda
      .filter((m) => m.deletedAt === null || m.id === value)
      .map((m) => ({ value: m.id, label: m.nome })),
  [motivosPerda, value]
);
```

**Copiar o shell** `Combobox`/`ComboboxInput`/`ComboboxContent`/`ComboboxEmpty`/`ComboboxList`/`ComboboxItem` (linhas 55-81) e o input nativo oculto via prop `name` (para o FormData de `lead-form-dialog.tsx`).

**Adicionar (novo):** quando a query digitada (case-insensitive/trim) não casa com nenhum `item.label`, renderizar como **última** entrada da lista um `<ComboboxItem>` de ação `Criar "{query}"` — ícone `<Plus className="size-4" />` (lucide, já usado em `configuracoes-form.tsx:7`), texto em `text-[#0D9488]`. Selecionar essa entrada:
1. chama `createMotivoPerda` (Server Action) dentro de `useTransition`/`startTransition`
2. desabilita o input enquanto `pending`
3. sucesso → `onValueChange(result.id)` (usa o `id` retornado — ver DIVERGÊNCIA na action) e fecha o popup
4. erro → mantém popup aberto, mensagem `text-sm text-[#DC2626]` (mesmo padrão de erro de `subnicho-manager.tsx:104-106`)

`ComboboxItem` do `ui/combobox.tsx` aceita `[&_svg]` (linha 143) — o ícone `Plus` renderiza inline sem CSS extra.

---

### `src/components/periodo-selector.tsx` — filtro por querystring (component)

**Análogo parcial:** `src/components/lead-table-toolbar.tsx` para o visual do `<Select>`. **Sem precedente** para `searchParams` / `router.push` (grep confirmou zero uso em `src/`).

**Copiar de `lead-table-toolbar.tsx`:**
- a constante `ACCENT_FOCUS_RING` (linhas 25-26): `"focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50"` — aplicar em `<SelectTrigger className={ACCENT_FOCUS_RING}>`
- o wrapper `<div className="flex flex-col gap-1.5">` com `<span className="text-[14px] leading-normal text-muted-foreground">` de rótulo (linhas 94-95) — mas o 11-UI-SPEC.md linha 160 pede `flex items-center gap-2` e rótulo `"Período:"`
- o idioma `Select` + `SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` (linhas 96-110)

**Novo (sem análogo — decisão do 11-RESEARCH.md §A3 + 11-UI-SPEC.md linhas 159-163):**
```typescript
"use client";
import { useRouter, useSearchParams } from "next/navigation";
// 3 opções → ?period=30d | 90d | tudo
// onChange: router.push(`?period=${value}`, { scroll: false })
```
- **Default primeiro acesso (sem `?period`):** `"30d"` (11-UI-SPEC.md linha 162)
- **Fallback valor inválido/adulterado:** cai em `"tudo"` silenciosamente, nunca erro 500 (11-UI-SPEC.md linha 163, 11-RESEARCH.md §Security) — a normalização mora numa função pura em `queries.ts` (`resolvePeriodRange`), não no componente.

---

### `src/app/motivos-perda/page.tsx` (route, Server Component)

**Análogo:** `src/app/subnichos/page.tsx` — réplica 1:1:

```typescript
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { motivosPerda } from "@/db/schema";
import { MotivoPerdaManager } from "@/components/motivo-perda-manager";

export default async function MotivosPerdaPage() {
  const items = await db
    .select()
    .from(motivosPerda)
    .where(isNull(motivosPerda.deletedAt))
    .orderBy(asc(motivosPerda.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Motivos de Perda</h1>
      <MotivoPerdaManager motivosPerda={items} />
    </div>
  );
}
```

---

### `src/app/relatorios/page.tsx` (route, Server Component, agregação)

**Análogo:** `src/app/pipeline/page.tsx` — mesmo idioma "Server Component busca + computa mapas server-side, passa props prontas para o client".

**Copiar de `pipeline/page.tsx`:**
- `Promise.all([...])` para as queries paralelas (linhas 31-42)
- o container `<div className="flex flex-col gap-6">` + `<h1 className="text-[28px] font-semibold leading-tight">` (linhas 76-77) — mas o 11-UI-SPEC.md linha 158 pede `h1` + `<PeriodoSelector>` na mesma linha via `flex items-center justify-between`
- o idioma de derivar dados na leitura de cada request, nunca persistir (doc-comment linhas 12-29)

**Novo:** ler `searchParams` (Next 16 App Router: `{ searchParams }: { searchParams: Promise<{ period?: string }> }`, `await searchParams`). Chamar `resolvePeriodRange(period)` (função pura de `queries.ts`), passar o range às 3 queries de agregação.

**Cada seção é um card:** copiar o container de `configuracoes-form.tsx:171` / `:232` — `rounded-lg border border-zinc-200 bg-white p-6`, com `<h2 className="text-[20px] font-semibold leading-tight">` e texto de ajuda `<p className="text-[14px] text-muted-foreground">` (linhas 233-239). Seções empilhadas em `flex flex-col gap-6` (11-UI-SPEC.md linha 164).

**Tabelas:** usar o primitivo `@/components/ui/table` (`Table`/`TableHeader`/`TableHead`/`TableBody`/`TableRow`/`TableCell`) — mesmo import de `src/components/lixeira-table.tsx:15-22`. Números em `text-foreground` neutro, taxa de conversão em `font-semibold` (ênfase por peso, NUNCA cor teal — 11-UI-SPEC.md linha 82).

---

### `src/db/queries.ts` — agregações + funções puras (model/query)

**Análogo 1 (agregação SQL `GROUP BY`):** `getUltimaInteracaoWhatsAppPorLead`, `src/db/queries.ts:90-101`.

```typescript
// getContagemPorOrigem(range) — GROUP BY leads.origemTipo, filtro leads.createdAt (D-09)
export async function getContagemPorOrigem(range: PeriodRange) {
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

- `getContagemPorSubnicho(range)` — `GROUP BY leads.subnichoId` + `innerJoin(subnichos, eq(...))` para `subnichos.nome`; "A categorizar" é linha normal (D-12), sem filtro especial. Filtro por `leads.createdAt`.
- `getContagemPorMotivoPerda(range)` — `GROUP BY leads.motivoPerdaId` + join `motivosPerda.nome`, `where` adiciona `eq(leads.stage, "perdido")` **e filtra por `leads.stageChangedAt`, NUNCA `leads.createdAt`** (D-11). Comentário-âncora obrigatório citando D-11 (mesmo estilo dos comentários extensos já em `queries.ts`).

**Imports a adicionar** em `queries.ts:1-2`: `gte`, `lte` de `drizzle-orm`; `subDays` de `date-fns` (novo no projeto, mesmo pacote já instalado — ver 11-RESEARCH.md); `subnichos`, `motivosPerda` no import de `@/db/schema` (linha 4).

**Análogo 2 (função pura testável):** `computeSequenciaSugestao` (`src/db/queries.ts:135-146`) e `groupLeadsByUrgency` (36-55) — sem I/O, `now` injetável para teste.

```typescript
export function computeTaxaConversao(row: { total: number; fechados: number }): number {
  if (row.total === 0) return 0; // Pitfall 3 — nunca NaN/Infinity
  return row.fechados / row.total; // D-06: denominador é o total, não só decididos
}

export function resolvePeriodRange(preset: string, now = new Date()): PeriodRange {
  if (preset === "90d") return { start: subDays(startOfDay(now), 90), end: now };
  if (preset === "30d") return { start: subDays(startOfDay(now), 30), end: now };
  return { start: new Date(0), end: now }; // "tudo" e QUALQUER valor inválido (fallback seguro)
}
```

`startOfDay` já é importado em `queries.ts:2`. Exportar `type PeriodRange = { start: Date; end: Date }`.

---

### `src/lib/validations.ts` — contratos Zod (config)

**Análogo:** `subnichoSchema` (linhas 6-8), `stageUpdateSchema` (72-76), `leadSchema.motivoPerda` (linha 44).

- **`motivoPerdaSchema`** — cópia literal de `subnichoSchema`.
- **`stageUpdateSchema`** (linhas 72-76): trocar `motivoPerda: z.string().trim().optional()` por `motivoPerdaId: z.coerce.number().int().positive().optional()`, e adicionar refinamento condicional (D-04):

```typescript
export const stageUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado", "perdido"]),
  motivoPerdaId: z.coerce.number().int().positive().optional(),
}).refine(
  (d) => d.stage !== "perdido" || d.motivoPerdaId != null,
  { path: ["motivoPerdaId"], message: "Selecione o motivo da perda." } // 11-UI-SPEC.md linha 120
);
```

- **`leadSchema.motivoPerda`** (linha 44): mesma troca para `motivoPerdaId` opcional + o mesmo `.refine` condicional no objeto. Cuidado: `leadSchema` é consumido por `react-hook-form` via `zodResolver` em `lead-form-dialog.tsx:113` — o campo precisa estar registrado no `defaultValues` (linha 133) como `motivoPerdaId: lead?.motivoPerdaId ?? undefined`.
- **`csvRowSchema`** (linhas 64-67) deriva de `leadSchema` via `.omit()` — verificar se precisa `.omit({ motivoPerdaId: true })` (CSV nunca traz motivo de perda; leads importados nascem fora de "perdido").

---

### `src/actions/lead-actions.ts` — captura de motivoPerdaId (action)

**Auto-análogo:** o idioma condicional-por-valor-alvo já existe 4x neste arquivo.

- `updateLead` linha 132: `motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null` → `motivoPerdaId: parsed.data.stage === "perdido" ? parsed.data.motivoPerdaId : null`
- `updateLeadStage` linha 197: mesma troca.
- `updateLeadStage` assinatura (linhas 169-173): `motivoPerda?: string` → `motivoPerdaId?: number`.
- **Novo:** checagem de existência real do id — copiar `subnichoExists` (linhas 41-47) como `motivoPerdaExists(id)` (SELECT indiferente a `deletedAt`, mesmo raciocínio: editar lead perdido cujo motivo foi removido não pode quebrar). Chamar quando `stage === "perdido"`.
- **Backstop de FK:** o `isForeignKeyViolation(err)` (linhas 22-29) e os try/catch já existentes em `createLead`/`updateLead` cobrem `motivo_perda_id` automaticamente assim que a FK com `onDelete: "restrict"` existir — só garantir que o catch trate `motivoPerdaId` além de `subnichoId`.
- A obrigatoriedade real (D-04) mora no `.refine` do Zod (server-side autoritativo) — o safeParse já retorna `{ errors }` antes de qualquer escrita (linhas 174-177).

---

### `src/components/lead-form-dialog.tsx` (component)

**Auto-análogo:** o próprio `<SubnichoCombobox>` via `Controller` (linhas 322-338).

Substituir o bloco `form.watch("stage") === "perdido"` (linhas 372-387): trocar `<Textarea id="motivoPerda">` por:

```tsx
<Controller
  control={form.control}
  name="motivoPerdaId"
  render={({ field }) => (
    <MotivoPerdaCombobox
      motivosPerda={motivosPerda}
      value={(field.value as number | null | undefined) ?? null}
      onValueChange={(id) => field.onChange(id)}
      invalid={!!errors.motivoPerdaId}
    />
  )}
/>
```

- `<FieldLabel>` continua `"Motivo da perda"`.
- `<FieldDescription>` muda de "Opcional — ..." para `"Por que esse lead foi perdido."` (11-UI-SPEC.md linha 119).
- O componente precisa receber `motivosPerda: MotivoPerda[]` por prop nova (vinda de `pipeline-board.tsx` / da página que renderiza o dialog) — espelhar como `subnichos` já é passado (prop `subnichos`, linha 48).
- `key` do dialog (`pipeline-board.tsx:220`) já força remount entre create/edit — o `defaultValues` novo (`motivoPerdaId`) é suficiente.

---

### `src/components/motivo-perda-dialog.tsx` (component) — PITFALL 1

**Auto-análogo + `delete-subnicho-dialog.tsx`** (modal não-dispensável).

Reescrever (11-UI-SPEC.md linhas 192-200):
- **Remover:** `<Textarea>`, botão "Pular", `(opcional)` da descrição, prop `onSkip`, estado `useState("")` de string.
- **Trocar** assinatura `onSave: (motivo: string) => void` → `onSave: (motivoPerdaId: number) => void`; estado local `useState<number | null>(null)`.
- **Adicionar:** `<MotivoPerdaCombobox>` (mesma prop `motivosPerda`), botão `<Button variant="outline">` "Cancelar" que chama um novo `onCancel` (reverte o drag).
- **Botão "Salvar motivo":** `disabled={motivoPerdaId == null}`.
- **`<DialogContent showCloseButton={false}>`** + `onOpenChange` interceptado (copiar de `delete-subnicho-dialog.tsx:33-34`) — sem "Cancelar"/"Salvar" explícito o modal não fecha, evitando drag órfão.
- Descrição: `` `Por que "${leadNome}" foi perdido?` `` (11-UI-SPEC.md linha 122).

---

### `src/components/pipeline-board.tsx` (component)

**Auto-análogo:** fila `motivoQueueRef` / `resolveMotivoPerda` (linhas 75-171) já resolve o caso multi-drag.

- Tipo do resolver (linha 83) e de `motivoPerda` em `handleDragEnd` (linha 133): `string | undefined` → `number` (sempre presente agora).
- `resolveMotivoPerda(motivo)` (linha 159): renomear param para `motivoPerdaId: number`.
- **Novo — "Cancelar" reverte o drag:** hoje `onOpenChange`/`onSkip` chamam `resolveMotivoPerda(undefined)` e o `updateLeadStage` roda mesmo assim (linha 149). Novo comportamento: um `onCancel` que remove o item da fila SEM chamar `updateLeadStage` e deixa o `useOptimistic` reverter sozinho (o estado base nunca mudou — mesmo mecanismo já descrito no doc-comment linhas 51-61). Passar `motivosPerda` (nova prop do board, vinda de `PipelinePage`) para `<MotivoPerdaDialog>` e `<LeadFormDialog>`.
- `PipelinePage` (`src/app/pipeline/page.tsx:31-42`) precisa buscar `db.select().from(motivosPerda)` no `Promise.all` e passar ao `<PipelineBoard>` — espelhar `allSubnichos` (linha 38).

---

### `src/components/app-sidebar.tsx` (config)

**Auto-análogo:** array `NAV_ITEMS` (linhas 17-26).

```typescript
import { ..., BarChart3, ListX } from "lucide-react"; // ambos confirmados no pacote (11-UI-SPEC.md linha 25)

const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },      // NOVO — após Pipeline
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/subnichos", label: "Sub-nichos", icon: Tag },
  { href: "/motivos-perda", label: "Motivos de Perda", icon: ListX }, // NOVO — após Sub-nichos
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;
```

Nenhuma outra mudança — o `.map` (linhas 48-69), o `isActive` via `pathname.startsWith` e as classes de estado ativo funcionam para os novos itens sem tocar.

> ⚠ `isActive` usa `pathname.startsWith(item.href)` (linha 50). `/motivos-perda` não colide com `/` nem com outra rota; `/relatorios` idem. OK.

---

## `scripts/` — migração e testes

### `scripts/migrate-motivos-perda.cjs` (migration)

**Análogo:** `scripts/migrate-sequencia-followup.cjs` + `scripts/backfill-origem-tipo.cjs` — seguir religiosamente.

Estrutura obrigatória (copiar bloco a bloco de `migrate-sequencia-followup.cjs`):
1. `DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db")` (linha 19) + `fail(msg)` (21-24)
2. **Backup com WAL checkpoint** ANTES de qualquer escrita (linhas 29-38) — `wal_checkpoint(TRUNCATE)` → `fs.copyFileSync`
3. `const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c`
4. **CREATE TABLE `motivos_perda`** idempotente via `SELECT name FROM sqlite_master WHERE type='table' AND name='motivos_perda'` (não `PRAGMA table_info`, que é pra coluna) — DDL cru:
   ```sql
   CREATE TABLE motivos_perda (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
   CREATE UNIQUE INDEX motivo_perda_nome_unique_idx ON motivos_perda (lower(trim(nome)));
   CREATE INDEX motivos_perda_deleted_at_idx ON motivos_perda (deleted_at);
   ```
5. **Seed D-02** (só se a tabela acabou de ser criada): `Preço`, `Sem retorno do lead`, `Concorrente`, `Sem verba/orçamento`, `Timing (não é prioridade agora)`, `Outro` — `INSERT` parametrizado em loop (mesmo idioma de `backfill-origem-tipo` UPDATE).
6. **ADD COLUMN `leads.motivo_perda_id`** idempotente via `PRAGMA table_info(leads)` + `.some((c) => c.name === "motivo_perda_id")` (copiar linhas 45-55 de `migrate-sequencia-followup.cjs`):
   ```
   ALTER TABLE `leads` ADD `motivo_perda_id` integer REFERENCES `motivos_perda`(`id`);
   ```
   (nullable, sem NOT NULL → sem exigência de DEFAULT físico; ver 11-RESEARCH.md Open Question 1)
7. `CREATE INDEX IF NOT EXISTS leads_motivo_perda_id_idx ON leads (motivo_perda_id);`
8. **Verificação pós-migração:** `beforeLeads === afterLeads` (linhas 73-76), e `SELECT count(*) FROM motivos_perda` === 6 quando recém-criada.
9. **Coluna antiga `leads.motivo_perda` (texto):** 11-RESEARCH.md Open Question 2 recomenda **deixar fisicamente** (menor risco), mas garantir zero referências em `src/` (grep `\.motivoPerda\b` sem `Id` → zero). Documentar no comentário do schema como "coluna morta".

**NÃO usar `drizzle-kit push`/`generate`** — 5 red-flags documentados (11-RESEARCH.md Pitfall 5).

### `scripts/test-relatorios-queries.cjs` (test)

**Análogo:** `scripts/test-compute-sequencia-sugestao.cjs` — mesmo bootstrap.

- `process.env.DB_FILE_NAME = ":memory:"` ANTES do `register("./ts-alias-loader.mjs", ...)` (linhas 28-33)
- harness `check(condition, message)` + contador `failed` (37-44)
- `const { computeTaxaConversao, resolvePeriodRange, getContagemPorOrigem, ... } = await import("@/db/queries")`
- Cobrir: `computeTaxaConversao({total:0,fechados:0}) === 0` (não NaN), `computeTaxaConversao({total:4,fechados:1}) === 0.25`, `resolvePeriodRange("30d")` / `("tudo")` / `("lixo")` → range esperado.
- Para as queries `GROUP BY`: como `computeSequenciaSugestao` não toca banco mas as queries de relatório tocam, usar o padrão de `test-lead-actions.cjs` (banco temp + aplicar `migrations/0000...` + `0001...` + `manualAlters` incluindo `motivo_perda_id`) OU um `:memory:` com schema montado à mão. Preferir o molde de `test-lead-actions.cjs:81-118` (reconstrói colunas via `manualAlters` porque o snapshot drizzle-kit está divergente).

### `scripts/test-motivo-perda-actions.cjs` (test)

**Análogo:** `scripts/test-lead-actions.cjs` — banco SQLite temp isolado em `os.tmpdir()` (linhas 77-89), `register` do ts-alias-loader (19), `staticCheckFkWiring`-style grep + testes de comportamento.

Cobrir: `createMotivoPerda` reativa nome soft-deletado (não bloqueia, não duplica); retorna `{ success: true, id }`; nome duplicado ativo → `{ errors: { nome: [...] } }`; `softDeleteMotivoPerda` idempotente; `renameMotivoPerda` rejeita colisão.

### `scripts/verify-motivo-perda-obrigatorio.cjs` (test)

**Análogo:** `scripts/verify-sequencia-posicao.cjs` Parte B (checagens estáticas no fonte real, linhas 169-202) — `fs.readFileSync` de `src/actions/lead-actions.ts`, fatiar por `indexOf("export async function ...")`, regex tolerante a espaçamento (`\s*`).

Cobrir: `updateLeadStage`/`updateLead` referenciam `motivoPerdaId` no idioma condicional-por-valor-alvo; `stageUpdateSchema` tem `.refine` com `path: ["motivoPerdaId"]`; `motivo-perda-dialog.tsx` NÃO contém mais `Textarea` nem `onSkip`/"Pular" (grep negativo — 11-RESEARCH.md Pitfall 1 warning sign).

### `scripts/guard-no-hard-delete.cjs` (config, MESMO COMMIT que cria a tabela)

**Análogo:** extensão feita para `interacoes` (linhas 53-71). Adicionar em `CODE_PATTERNS`:
```javascript
/\.delete\(\s*motivosPerda\b/,
```
e em `CODE_SQL_PATTERNS`:
```javascript
/\bDELETE\s+FROM\s+[`"']?motivos_perda\b/i,
/\bDROP\s+TABLE\s+[`"']?motivos_perda\b/i,
```
Atualizar o doc-comment (linhas 4-30) e a mensagem de `console.log` final para citar `motivos_perda`.

### `scripts/verify-schema.cjs` (test)

**Análogo:** bloco de presença `sequencia_posicao` (linhas 82-94) — checagem de PRESENÇA, não conjunto estrito (leads acumula colunas). Adicionar:
```javascript
if (!tableNames.has("motivos_perda")) fail("tabela ausente: motivos_perda (Fase 11, PERDA-01)");
if (tableNames.has("leads")) {
  const leadsColumns = new Set(db.prepare("PRAGMA table_info(leads)").all().map((c) => c.name));
  if (!leadsColumns.has("motivo_perda_id")) fail("coluna ausente: leads.motivo_perda_id (Fase 11)");
}
```
E `"motivo_perda_nome_unique_idx"` em `requiredIndexes` (linhas 30-34).

### `package.json` (config)

Adicionar em `scripts` (linhas 5-18), mesmo idioma `node scripts/*.cjs`:
```json
"verify:motivos-perda-schema": "node scripts/verify-motivos-perda-schema.cjs",
"verify:motivo-perda": "node scripts/verify-motivo-perda-obrigatorio.cjs",
"test:relatorios": "node scripts/test-relatorios-queries.cjs",
"test:motivo-perda-actions": "node scripts/test-motivo-perda-actions.cjs"
```

---

## Padrões Transversais (aplicar a todos os arquivos relevantes)

### Soft-delete + guard (LEAD-04)
**Fonte:** `src/actions/subnicho-actions.ts` + `scripts/guard-no-hard-delete.cjs`
**Aplicar a:** `motivo-perda-actions.ts` (só soft-delete via `deletedAt`), `guard-no-hard-delete.cjs` (escopo estendido NO MESMO COMMIT que cria a tabela).
O WHERE de todo soft-delete leva `isNull(deletedAt)` (idempotência) — `src/actions/subnicho-actions.ts:75`.

### Validação Zod autoritativa server-side
**Fonte:** `src/lib/validations.ts` + o padrão `safeParse` → `{ errors: parsed.error.flatten().fieldErrors }` no topo de toda action
**Aplicar a:** `motivo-perda-actions.ts` (linhas 18-21 de `subnicho-actions.ts`), `lead-actions.ts` (D-04 via `.refine`). O client (`react-hook-form`, `disabled` de botão) é só UX antecipada — nunca a autoridade.

### Migração manual via better-sqlite3 (nunca drizzle-kit push)
**Fonte:** `scripts/migrate-sequencia-followup.cjs`, `scripts/backfill-origem-tipo.cjs`
**Aplicar a:** `scripts/migrate-motivos-perda.cjs`. Sempre: backup WAL-checkpoint → guarda de idempotência (`sqlite_master` / `PRAGMA table_info`) → DDL cru → verificação de contagem antes/depois.

### Harness de teste `check(condition, message)` (sem jest/vitest)
**Fonte:** `scripts/test-compute-sequencia-sugestao.cjs`, `scripts/verify-sequencia-posicao.cjs`, `scripts/test-lead-actions.cjs`
**Aplicar a:** os 4 scripts de teste novos. `:memory:` ou banco temp em `os.tmpdir()`, `DB_FILE_NAME` setado ANTES do import, `register("./ts-alias-loader.mjs", ...)`, `process.exit(failed > 0 ? 1 : 0)`.
**Host 4GB RAM:** rodar os gates sequencialmente, nunca em paralelo; `npm run dev` parado durante `tsc --noEmit` (11-RESEARCH.md; MEMORY.md).

### Agregação em SQL, nunca reduzir em JS
**Fonte:** `src/db/queries.ts:90-101` (comentário explícito)
**Aplicar a:** `getContagemPorOrigem` / `PorSubnicho` / `PorMotivoPerda` — `.groupBy()` do Drizzle + `sql<number>\`count(*)\``, nunca `db.select().from(leads)` seguido de `.reduce()`.

### Combobox: filtro anti-soft-delete
**Fonte:** `src/components/subnicho-combobox.tsx:45-51` + `.planning/debug/resolved/subnicho-combobox-vazio.md`
**Aplicar a:** `motivo-perda-combobox.tsx` — `.filter((m) => m.deletedAt === null || m.id === value)`. Sem isso, editar um lead perdido cujo motivo foi removido mostra o campo vazio.

### Cor: accent teal reservado a ações, nunca a dados
**Fonte:** 11-UI-SPEC.md linha 82 + `10-UI-SPEC.md` linha 84 (precedente "Sugestão: dd/MM")
**Aplicar a:** `relatorios/page.tsx` (números em `text-foreground`, taxa de conversão destacada por `font-semibold`, NUNCA `text-[#0D9488]`). Única exceção: a linha `Criar "{query}"` do combobox (é ação, não dado).

### Container de card de seção
**Fonte:** `src/components/configuracoes-form.tsx:171` e `:232-240`
**Aplicar a:** cada seção de `relatorios/page.tsx` — `rounded-lg border border-zinc-200 bg-white p-6`, `<h2 className="text-[20px] font-semibold leading-tight">`, ajuda em `<p className="text-[14px] text-muted-foreground">`.

---

## Sem Análogo (planner usa RESEARCH.md/UI-SPEC.md)

| Arquivo | Papel | Fluxo | Motivo |
|---------|-------|-------|--------|
| `src/components/periodo-selector.tsx` (parte `searchParams`/`router.push`) | component | event-driven | Zero uso de `searchParams` / `useRouter().push` para filtro em `src/` hoje. Visual do `<Select>` tem análogo (`lead-table-toolbar.tsx`); a mecânica de querystring + default 30d + fallback "tudo" é nova — seguir 11-UI-SPEC.md linhas 159-163 e 11-RESEARCH.md §A3. |
| `src/components/motivo-perda-combobox.tsx` (afordância "Criar") | component | transform | `SubnichoCombobox` é seleção pura. A entrada de ação `Criar "{query}"` com `createMotivoPerda` inline + auto-seleção pelo `id` retornado é o primeiro "combobox criável" do projeto — seguir 11-UI-SPEC.md linhas 183-190 e 11-RESEARCH.md Pattern 2 (nota de shape). |

---

## Metadados

**Escopo da busca de análogos:** `src/db/`, `src/actions/`, `src/components/`, `src/app/`, `src/lib/`, `scripts/`, `.planning/debug/resolved/`
**Arquivos lidos integralmente:** schema.ts, subnicho-actions.ts, queries.ts, subnicho-manager.tsx, delete-subnicho-dialog.tsx, subnicho-combobox.tsx, subnichos/page.tsx, lead-actions.ts, validations.ts, motivo-perda-dialog.tsx, app-sidebar.tsx, pipeline/page.tsx, pipeline-board.tsx, lead-form-dialog.tsx, migrate-sequencia-followup.cjs, guard-no-hard-delete.cjs, verify-schema.cjs, test-compute-sequencia-sugestao.cjs, verify-sequencia-posicao.cjs, test-lead-actions.cjs, backfill-origem-tipo.cjs, configuracoes-form.tsx, lead-table-toolbar.tsx, ui/combobox.tsx, client.ts, types/index.ts, subnicho-combobox-vazio.md
**Data da extração:** 2026-08-27
