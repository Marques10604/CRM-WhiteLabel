# Phase 7: Configuração de Dias-Parado por Etapa - Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema.ts` (+ tabela `configuracoes`) | model | CRUD | `src/db/schema.ts` (tabelas `subnichos`/`templates`, mesmo arquivo) | exact |
| `src/db/queries.ts` (+ `getConfiguracoes()`) | service | CRUD (read, getOrCreate) | `src/db/queries.ts` (`getActiveDashboardLeads`, mesmo arquivo) | role-match |
| `src/lib/validations.ts` (+ `configuracoesSchema`) | utility | request-response (validation) | `src/lib/validations.ts` (`templateSchema`, mesmo arquivo) | exact |
| `src/actions/configuracoes-actions.ts` (novo) | service (Server Action) | request-response | `src/actions/template-actions.ts` (`updateTemplate`) | exact |
| `src/app/configuracoes/page.tsx` (novo) | route (Server Component) | request-response (SSR read) | `src/app/subnichos/page.tsx` | exact |
| `src/components/configuracoes-form.tsx` (novo) | component (form) | request-response | `src/components/template-form-dialog.tsx` (form/submit mechanics) + `src/app/subnichos/page.tsx`/`subnicho-manager.tsx` (no-dialog card layout) | role-match |
| `src/components/app-sidebar.tsx` (+ item `NAV_ITEMS`) | component (nav) | request-response | `src/components/app-sidebar.tsx` (mesmo arquivo, 7 itens existentes) | exact |
| `src/app/pipeline/page.tsx` (generalização do cálculo "esfriando") | route (Server Component) | request-response (SSR read + compute) | `src/app/pipeline/page.tsx` (mesmo arquivo, lógica hardcoded atual) | exact |

## Pattern Assignments

### `src/db/schema.ts` (model, CRUD) — adicionar tabela `configuracoes`

**Analog:** tabelas `subnichos`/`templates` no mesmo arquivo (`src/db/schema.ts` lines 4-30)

**Imports pattern** (lines 1-2, já presentes no topo do arquivo — nenhum import novo necessário):
```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
```

**Core pattern — forma de tabela tipada com defaults** (lines 18-30, `templates`):
```typescript
export const templates = sqliteTable(
  "templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo", { enum: [...] }).notNull(),
    nome: text("nome").notNull(),
    corpo: text("corpo").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("templates_tipo_idx").on(table.tipo)]
);
```

**Apply to `configuracoes`:** mesma forma, mas `id` fixo (sem `autoIncrement`) porque é singleton — ver `Pattern 1` do RESEARCH.md (linhas 190-203), já verificado contra o código real:
```typescript
export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(), // sempre 1 — não autoIncrement (singleton)
  // D-04: só Contatado nasce com 5 (paridade com o hardcode pré-fase);
  // Novo/Negociação nascem com 999999 (≈ nunca esfria) porque o código
  // pré-deploy NUNCA flagava essas duas etapas.
  diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```
Nenhum `CHECK` constraint (nenhuma tabela existente usa; convenção do projeto é garantir invariantes em nível de aplicação — ver `applyDefaultTemplate` em `template-actions.ts` lines 23-31).

---

### `src/db/queries.ts` (service, CRUD read/getOrCreate)

**Analog:** `getActiveDashboardLeads` (`src/db/queries.ts` lines 1-20)

**Imports pattern** (lines 1-5):
```typescript
import { and, asc, isNull, notInArray } from "drizzle-orm";
import { addDays, isBefore, isToday, startOfDay } from "date-fns";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import type { Lead } from "@/types";
```
Para `getConfiguracoes()`, trocar por: `eq` de `drizzle-orm`, `db` de `@/db/client`, `configuracoes` de `@/db/schema`.

**Core pattern — query simples, tipo derivado, comentário justificando design** (lines 7-20):
```typescript
/**
 * Leads ativos para o dashboard de follow-ups (D-04) — exclui soft-deleted
 * (`isNull(leads.deletedAt)`) E etapas terminais (`fechado`/`perdido`).
 * Centralizado aqui (em vez de inline em `src/app/page.tsx`) para evitar que
 * o escopo "ativo" divirja entre o dashboard e futuras queries...
 */
export async function getActiveDashboardLeads(): Promise<Lead[]> {
  return db
    .select()
    .from(leads)
    .where(and(isNull(leads.deletedAt), notInArray(leads.stage, ["fechado", "perdido"])))
    .orderBy(asc(leads.followUpDate));
}
```

**Apply to `getConfiguracoes()`:** seguir o mesmo estilo de comentário de justificativa + tipo exportado (`Configuracoes = typeof configuracoes.$inferSelect`), com getOrCreate idempotente (RESEARCH.md Pattern 2, lines 209-234) — a semeadura vive aqui e não em SQL de migração (Pitfall 2 do RESEARCH.md).

---

### `src/lib/validations.ts` (utility, validation)

**Analog:** `templateSchema` (`src/lib/validations.ts` lines 76-85)

**Core pattern — schema Zod simples com mensagens em PT-BR** (lines 76-85):
```typescript
export const templateSchema = z.object({
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"], {
    error: "Selecione um tipo.",
  }),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  corpo: z.string().trim().min(1, "Mensagem é obrigatória."),
  isDefault: z.coerce.boolean().default(false),
});
export type TemplateFormValues = z.input<typeof templateSchema>;
```

**Apply to `configuracoesSchema`** (mesmo padrão `z.input<>` para o tipo de form values; mensagem "Mínimo de 1 dia." travada pelo `07-UI-SPEC.md`):
```typescript
export const configuracoesSchema = z.object({
  diasParadoNovo: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoContatado: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoNegociacao: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
});
export type ConfiguracoesFormValues = z.input<typeof configuracoesSchema>;
```
Nota: não usar `z.preprocess` (padrão de `valorEstimado`, que faz parsing BRL) nem `.transform` — os 3 campos são inteiros simples, `z.coerce.number().int().min(1)` já cobre o Pitfall 3 do RESEARCH.md (zero/negativo silencioso).

---

### `src/actions/configuracoes-actions.ts` (service/Server Action, request-response)

**Analog:** `updateTemplate` (`src/actions/template-actions.ts` lines 59-85)

**Imports pattern** (lines 1-8):
```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { templateSchema } from "@/lib/validations";
import type { Template } from "@/types";
```

**ActionState type pattern** (lines 10-13, repetido em todo `*-actions.ts`):
```typescript
type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;
```

**Core CRUD pattern — parse, mutate, revalidate, return** (lines 59-85, `updateTemplate`):
```typescript
export async function updateTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Template inválido."] } };
  }

  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { isDefault, ...rest } = parsed.data;

  await db.update(templates).set({ ...rest, isDefault }).where(eq(templates.id, id));

  if (isDefault) {
    await applyDefaultTemplate(id, parsed.data.tipo);
  }

  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}
```

**Apply to `saveConfiguracoes`:** sem `id` no FormData (singleton fixo `id=1`, sem lookup); `revalidatePath("/configuracoes")` + `revalidatePath("/pipeline")` (Pitfall 4 do RESEARCH.md — omitir a 2ª revalidação deixa o board com limites obsoletos até refresh manual):
```typescript
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { configuracoes } from "@/db/schema";
import { configuracoesSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

export async function saveConfiguracoes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = configuracoesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.update(configuracoes).set(parsed.data).where(eq(configuracoes.id, 1));

  revalidatePath("/configuracoes");
  revalidatePath("/pipeline");
  return { success: true };
}
```

**Error handling pattern:** nenhum `try/catch` explícito em nenhuma Server Action do projeto — erros de validação são retornados como `{ errors }` via `safeParse`; erros inesperados de DB propagam para o error boundary do Next.js (nenhum wrapper customizado a introduzir).

---

### `src/app/configuracoes/page.tsx` (route, Server Component, request-response)

**Analog:** `src/app/subnichos/page.tsx` (arquivo inteiro, 22 linhas)

**Full pattern** (lines 1-21):
```typescript
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { SubnichoManager } from "@/components/subnicho-manager";

export default async function SubnichosPage() {
  const items = await db
    .select()
    .from(subnichos)
    .where(isNull(subnichos.deletedAt))
    .orderBy(asc(subnichos.nome));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Sub-nichos</h1>
      <SubnichoManager subnichos={items} />
    </div>
  );
}
```

**Apply to `configuracoes/page.tsx`:** trocar a query direta por `await getConfiguracoes()` (de `@/db/queries`), `<div className="flex flex-col gap-6">` (não `gap-4` — 07-UI-SPEC.md linha 103 exige `gap-6`, mesmo padrão de `/pipeline`/`/templates`), título `"Configurações"`, renderizar `<ConfiguracoesForm config={config} />`. Server Component `async`, sem `"use client"`.

---

### `src/components/configuracoes-form.tsx` (component, request-response)

**Analog primário (mecânica de submissão):** `TemplateFormDialog` (`src/components/template-form-dialog.tsx`, ver imports/hooks lines 1-34, `useActionState` lines 67-71, `useEffect` de toast lines 83-92, `onSubmit`/`formRef` lines 101-104)

**Imports pattern** (lines 1-23, adaptado — sem Dialog):
```typescript
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveConfiguracoes } from "@/actions/configuracoes-actions";
import { configuracoesSchema, type ConfiguracoesFormValues } from "@/lib/validations";
import type { Configuracoes } from "@/db/queries";
```

**useActionState + toast feedback pattern** (lines 49-92, adaptado — sem `onOpenChange`, sem `form.reset()` pois D-02 exige que os campos continuem visíveis com valores salvos):
```typescript
type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

export function ConfiguracoesForm({ config }: { config: Configuracoes }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveConfiguracoes,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ConfiguracoesFormValues>({
    resolver: zodResolver(configuracoesSchema),
    defaultValues: {
      diasParadoNovo: config.diasParadoNovo,
      diasParadoContatado: config.diasParadoContatado,
      diasParadoNegociacao: config.diasParadoNegociacao,
    },
  });

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Configurações salvas.");
      // D-02: NÃO chamar form.reset() nem navegar — campos permanecem
      // visíveis com os valores recém-salvos.
    } else if (state && "errors" in state) {
      toast.error("Não foi possível salvar as configurações. Tente novamente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onSubmit() {
    if (!formRef.current) return;
    formAction(new FormData(formRef.current));
  }

  const errors = form.formState.errors;
  // ...campos abaixo seguem o padrão Field/FieldLabel/FieldContent/FieldError
  // de TemplateFormDialog lines 124-135, sem Select/Textarea (só Input number)
}
```

**Field pattern per input** (`TemplateFormDialog` lines 124-135, adaptado para `type="number"`):
```typescript
<Field data-invalid={!!errors.diasParadoNovo}>
  <FieldLabel htmlFor="diasParadoNovo">Novo</FieldLabel>
  <FieldContent>
    <Input
      id="diasParadoNovo"
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      aria-invalid={!!errors.diasParadoNovo}
      {...form.register("diasParadoNovo")}
    />
    <FieldDescription>
      Dias parado nesta etapa antes de o lead ser destacado como esfriando.
    </FieldDescription>
    <FieldError errors={[errors.diasParadoNovo]} />
  </FieldContent>
</Field>
```

**Analog secundário (layout de card sem Dialog, botão de salvar alinhado):** `src/app/subnichos/page.tsx` + `src/components/subnicho-manager.tsx` — nenhum `<Dialog>`, formulário inline dentro de um wrapper de card (`07-UI-SPEC.md` linha 105: `<div className="rounded-lg border border-zinc-200 bg-white p-6 max-w-md">`), botão de submit com classe teal (`TemplateFormDialog` line 192-198: `className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"`, texto `pending ? "Salvando..." : "Salvar configurações"`).

---

### `src/components/app-sidebar.tsx` (component/nav, request-response)

**Analog:** mesmo arquivo, `NAV_ITEMS` array (`src/components/app-sidebar.tsx` lines 16-24)

**Core pattern — array const tipado, um item por linha** (lines 6-24):
```typescript
import {
  Clock,
  Users,
  Upload,
  Kanban,
  MessageSquare,
  Tag,
  Trash2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/subnichos", label: "Sub-nichos", icon: Tag },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
] as const;
```

**Apply (D-01):** adicionar `Settings` ao import de `lucide-react` e um item ao final do array:
```typescript
import { /* ...existentes, */ Settings } from "lucide-react";

const NAV_ITEMS = [
  // ...7 itens existentes,
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;
```
Nenhuma outra mudança no componente — `isActive`/`Link`/classes já são genéricos e cobrem o novo item automaticamente (lines 46-67).

---

### `src/app/pipeline/page.tsx` (route, request-response, generalização)

**Analog:** o próprio arquivo, versão atual hardcoded (lines 1-47)

**Current state (a ser substituído)** (lines 27-34):
```typescript
const esfriandoLeadIds = activeLeads
  .filter(
    (lead) =>
      lead.stage === "contatado" &&
      lead.stageChangedAt != null &&
      differenceInDays(new Date(), lead.stageChangedAt) >= 5
  )
  .map((lead) => lead.id);
```

**Apply (Pattern 3 do RESEARCH.md, lines 236-260):**
```typescript
import { asc, isNull } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "@/db/client";
import { leads, subnichos, templates } from "@/db/schema";
import { getConfiguracoes } from "@/db/queries";
import { PipelineBoard } from "@/components/pipeline-board";

export default async function PipelinePage() {
  const [activeLeads, allSubnichos, allTemplates, config] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.followUpDate)),
    db.select().from(subnichos),
    db.select().from(templates),
    getConfiguracoes(),
  ]);

  const limitesPorEtapa: Partial<Record<typeof activeLeads[number]["stage"], number>> = {
    novo: config.diasParadoNovo,
    contatado: config.diasParadoContatado,
    negociacao: config.diasParadoNegociacao,
    // fechado/perdido intencionalmente ausentes: nunca "esfriam"
  };

  const esfriandoLeadIds = activeLeads
    .filter((lead) => {
      const limite = limitesPorEtapa[lead.stage];
      return (
        limite != null &&
        lead.stageChangedAt != null &&
        differenceInDays(new Date(), lead.stageChangedAt) >= limite
      );
    })
    .map((lead) => lead.id);

  // ...resto do JSX idêntico (nenhuma mudança em PipelineBoard/PipelineLeadCard)
}
```
**Preservar:** o comentário de cabeçalho do arquivo (lines 7-15) deve ser atualizado para refletir a generalização (D-06/D-07 da Fase 3 continuam sendo a origem do guard de `stageChangedAt` nulo, mas o "5 dias fixo, só contatado" não é mais verdade). Guard contra `stageChangedAt` nulo é preservado exatamente como está (Pitfall documentado no header original).

---

## Shared Patterns

### Server Action ActionState + revalidatePath
**Source:** `src/actions/template-actions.ts` lines 10-13 e cada handler (`revalidatePath` sempre no fim, antes do `return { success: true }`)
**Apply to:** `src/actions/configuracoes-actions.ts`
```typescript
type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;
// ...
revalidatePath("/configuracoes");
revalidatePath("/pipeline");
return { success: true };
```

### Formulário react-hook-form + Zod + useActionState (submissão via FormData bruto do DOM)
**Source:** `src/components/template-form-dialog.tsx` lines 67-104
**Apply to:** `src/components/configuracoes-form.tsx`
```typescript
const [state, formAction, pending] = useActionState<ActionState, FormData>(saveConfiguracoes, undefined);
const formRef = useRef<HTMLFormElement>(null);
const form = useForm<ConfiguracoesFormValues>({ resolver: zodResolver(configuracoesSchema), defaultValues: {...} });
function onSubmit() {
  if (!formRef.current) return;
  formAction(new FormData(formRef.current));
}
// <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)}>
```
Validação client-side (`zodResolver`) é só feedback antecipado; a validação autoritativa é sempre o `safeParse` na Server Action (nunca confiar só no client — mesmo padrão em todos os 2 formulários existentes do projeto).

### Toast de feedback (sonner)
**Source:** `src/components/template-form-dialog.tsx` lines 83-92
**Apply to:** `src/components/configuracoes-form.tsx`
```typescript
useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("Configurações salvas.");
  } else if (state && "errors" in state) {
    toast.error("Não foi possível salvar as configurações. Tente novamente.");
  }
}, [state]);
```

### Field/FieldLabel/FieldContent/FieldDescription/FieldError (shadcn primitivos, já instalados)
**Source:** `src/components/ui/field.tsx` (arquivo inteiro, 239 linhas — nenhuma mudança necessária, só consumo)
**Apply to:** `src/components/configuracoes-form.tsx`, um bloco `<Field>` por campo numérico, conforme `TemplateFormDialog` lines 124-135.

### Cor de accent teal para CTA primário
**Source:** `src/components/template-form-dialog.tsx` lines 192-198 (`bg-[#0D9488] text-white hover:bg-[#0D9488]/90`), `src/components/app-sidebar.tsx` line 59 (`bg-[#0D9488]/10 text-[#0D9488]` para item ativo)
**Apply to:** botão "Salvar configurações" em `configuracoes-form.tsx`; item "Configurações" ativo em `app-sidebar.tsx` (automático, nenhuma mudança de classe necessária — herda do padrão genérico já existente).

## No Analog Found

Nenhum arquivo desta fase ficou sem analog — todos os 8 arquivos (2 novos, 6 modificados) têm correspondência direta e forte em padrões já estabelecidos no próprio repositório (nenhuma tecnologia nova entra no stack, conforme `07-RESEARCH.md`).

## Metadata

**Analog search scope:** `src/db/`, `src/lib/validations.ts`, `src/actions/`, `src/app/`, `src/components/` (incl. `src/components/ui/`)
**Files scanned:** `src/db/schema.ts`, `src/db/queries.ts`, `src/db/client.ts`, `src/lib/validations.ts`, `src/actions/template-actions.ts`, `src/components/template-form-dialog.tsx`, `src/components/subnicho-manager.tsx`, `src/app/subnichos/page.tsx`, `src/app/pipeline/page.tsx`, `src/components/app-sidebar.tsx`, `src/components/ui/field.tsx`
**Pattern extraction date:** 2026-07-31
