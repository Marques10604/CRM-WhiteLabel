# Phase 6: Auto-avanço de Etapa + Contador de Tentativas - Pattern Map

**Mapped:** 2026-07-31
**Files analyzed:** 6 (1 novo: migração; 5 modificados)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema.ts` (modificar — coluna `contactAttempts`) | model | CRUD | mesma tabela `leads`, coluna `motivoPerda`/`stageChangedAt` (linhas 47-48) | exact (mesmo arquivo, mesmo padrão de coluna aditiva) |
| `src/db/migrations/000X_*.sql` (novo) | migration | batch | `src/db/migrations/0001_grey_xavin.sql` | exact (ALTER TABLE ADD, coluna nullable/simples) |
| `src/lib/validations.ts` (modificar — novo schema) | utility | request-response | `stageUpdateSchema` (linhas 60-64) | exact (mesmo arquivo, mesmo formato de schema minimalista para action posicional) |
| `src/actions/lead-actions.ts` (modificar — nova função `registerWhatsAppContact`) | service | CRUD | `updateLeadStage` (linhas 156-192) | exact (mesmo arquivo, mesmo idioma SELECT-then-conditional-UPDATE) |
| `src/components/whatsapp-preview-dialog.tsx` (modificar — `onClick` do `<a href={waHref}>`) | component | event-driven | próprio arquivo, `onClick` existente (linha 170) | exact (extensão do handler já existente, mesmo arquivo) |
| `src/components/pipeline-lead-card.tsx` (modificar — indicador do contador) | component | request-response | indicador condicional "Esfriando" no próprio arquivo (linhas 84-88) | exact (mesmo arquivo, mesmo padrão de indicador condicional) |

Nota: todos os arquivos desta fase já existem e são modificados incrementalmente — não há componente/serviço estruturalmente novo. Os "analogs" mais fortes estão, portanto, no próprio código adjacente dentro do mesmo arquivo, confirmado por `06-RESEARCH.md` (0 pacotes novos, 0 pastas novas).

## Pattern Assignments

### `src/actions/lead-actions.ts` — nova função `registerWhatsAppContact` (service, CRUD)

**Analog:** `updateLeadStage` (mesmo arquivo, linhas 156-192), complementado pelo idioma de `updateLead` (linhas 89-147).

**Imports pattern** (linhas 1-15, já presentes — nenhum import novo necessário):
```typescript
"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema } from "@/lib/validations";
import type { Lead } from "@/types";
```
`sql`, `and`, `eq`, `isNull` já importados na linha 10 — a nova função só precisa importar o novo schema de validação (`whatsappContactSchema`, a ser adicionado em `validations.ts`) junto de `leadSchema, stageUpdateSchema`.

**Core CRUD pattern — SELECT-then-conditional-write atômico** (analog: `updateLeadStage`, linhas 156-192):
```typescript
export async function updateLeadStage(
  id: number,
  stage: Lead["stage"],
  motivoPerda?: string
): Promise<ActionState> {
  const parsed = stageUpdateSchema.safeParse({ id, stage, motivoPerda });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  await db
    .update(leads)
    .set({
      stage: parsed.data.stage,
      motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
      ...(stageChanged ? { stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));

  revalidatePath("/pipeline");
  revalidatePath("/");
  return { success: true };
}
```
`registerWhatsAppContact(leadId, tipo)` segue exatamente esta forma: `safeParse` no topo → `SELECT` fresco com `isNull(deletedAt)` → computar condição derivada (`advanced` em vez de `stageChanged`) → um único `db.update(...).set({...spread condicional...}).where(...)` → `revalidatePath` nas 3 rotas → `return`. Diferença: o incremento do contador usa expressão SQL atômica em vez de valor calculado em JS — ver bloco "Incremento atômico" abaixo.

**Incremento atômico (não há analog local — `sql` já é usado assim em `softDeleteLead`, linha 205)**:
```typescript
// softDeleteLead usa sql`` para computar um valor no próprio UPDATE:
.set({ deletedAt: sql`(unixepoch())` })

// mesmo idioma para o contador (RESEARCH.md Pattern 2):
.set({
  contactAttempts: sql`${leads.contactAttempts} + 1`,
  ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
})
```

**Error handling pattern:** Não há `try/catch` em `updateLeadStage` (não há FK nem constraint em jogo nessa escrita) — só o guard `if (!current) return { errors: ... }`. `registerWhatsAppContact` deve seguir o mesmo formato leve: se `current` for `undefined` (lead soft-deletado entre render e clique), retornar silenciosamente `{ advanced: false }` (fire-and-forget — nunca lançar, ver Pitfall 1/6 do RESEARCH.md).

**Validation pattern** (analog: `stageUpdateSchema`, `src/lib/validations.ts` linhas 60-64):
```typescript
/** Contrato enxuto para a mudança de etapa via drag-and-drop (03-03, updateLeadStage). */
export const stageUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado", "perdido"]),
  motivoPerda: z.string().trim().optional(),
});
```
Novo schema a adicionar ao lado deste, mesmo estilo (`z.coerce.number().int().positive()` para o id, `z.enum([...])` reusando os mesmos 3 valores de `templateSchema.tipo`, linha 67-69):
```typescript
export const whatsappContactSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]),
});
```

---

### `src/components/whatsapp-preview-dialog.tsx` — extensão do `onClick` do `<a href={waHref}>` (component, event-driven)

**Analog:** o próprio `onClick` existente no mesmo arquivo (linha 170).

**Estado atual (linhas 165-178) a modificar:**
```tsx
{waHref ? (
  <a
    href={waHref}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => onOpenChange(false)}
    className={cn(
      buttonVariants(),
      "gap-1.5 bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
    )}
  >
    <MessageCircle />
    Abrir WhatsApp
  </a>
) : (
  <Button type="button" disabled className="gap-1.5 bg-[#0D9488] text-white">
    <MessageCircle />
    Abrir WhatsApp
  </Button>
)}
```

**Core event-driven pattern a aplicar** (fire-and-forget, sem `preventDefault`/`await` — RESEARCH.md Pattern 1, Pitfall 2):
```tsx
onClick={() => {
  onOpenChange(false); // inalterado — nunca bloqueia
  if (lead) {
    registerWhatsAppContact(lead.id, tipo)
      .then((result) => {
        if (result.advanced) {
          toast.success(`${lead.nome} avançou para Contatado.`); // D-07, texto travado
        }
      })
      .catch(() => {
        // Silencioso por design — nunca surface erro sobre uma aba já aberta.
      });
  }
}}
```
Crítico: usar o estado vivo `tipo` (`useState`, linha 68), nunca a prop `defaultTipo` — ver Pitfall 3 do RESEARCH.md, já resolvido/confirmado.

**Imports a adicionar** (padrão de import de toast já usado em `pipeline-board.tsx`):
```tsx
import { toast } from "sonner";
import { registerWhatsAppContact } from "@/actions/lead-actions";
```

**Toast pattern (analog: `pipeline-board.tsx` linha 141, mas com texto diferente por D-07):**
```typescript
// pipeline-board.tsx:141 — padrão genérico existente (NÃO copiar o texto, só o mecanismo toast.success):
toast.success(`Lead movido para ${label}.`);

// Nesta fase, D-07 exige personalização com nome do lead:
toast.success(`${lead.nome} avançou para Contatado.`);
```

---

### `src/components/pipeline-lead-card.tsx` — indicador do contador (component, request-response)

**Analog:** indicador condicional "Esfriando" no mesmo arquivo (linhas 82-89).

**Core pattern (imports + JSX condicional):**
```tsx
import { Clock } from "lucide-react"; // já existe — adicionar MessageCircle ao lado
// ...
<div className="flex items-center gap-1 text-[14px] leading-normal text-muted-foreground">
  <span>{format(lead.followUpDate, "dd/MM/yyyy")}</span>
  {isEsfriando ? (
    <span className="flex items-center gap-1 text-[#B45309]">
      <Clock className="size-3.5" /> Esfriando
    </span>
  ) : null}
</div>
```
Extensão (D-05/D-06 — só renderiza quando `contactAttempts > 0`, mesmo `<span className="flex items-center gap-1">` do padrão "Esfriando"):
```tsx
{lead.contactAttempts > 0 ? (
  <span className="flex items-center gap-1">
    <MessageCircle className="size-3.5" /> {lead.contactAttempts}x
  </span>
) : null}
```
Nenhuma prop nova precisa ser adicionada a `PipelineLeadCardProps` — `lead: Lead` já é recebido inteiro (linha 12) e `Lead = InferSelectModel<typeof leads>` capta a coluna nova automaticamente assim que existir no schema.

---

### `src/db/schema.ts` — nova coluna `contactAttempts` (model, CRUD)

**Analog:** colunas irmãs na mesma tabela `leads` (linhas 47-48, especialmente `motivoPerda` como padrão de coluna aditiva simples).

```typescript
// dentro de sqliteTable("leads", {...}), ao lado das colunas existentes:
motivoPerda: text("motivo_perda"), // nullable, D-03
stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default, backfill custom

// nova coluna (RESEARCH.md Code Examples) — padrão MAIS PRÓXIMO é
// `isDefault` em `templates` (linha 25: notNull + default), não
// `motivoPerda`/`stageChangedAt` (nullable):
contactAttempts: integer("contact_attempts").notNull().default(0),
```

---

### `src/db/migrations/000X_*.sql` — migração aditiva (migration, batch)

**Analog:** `src/db/migrations/0001_grey_xavin.sql` (migração aditiva de 2 colunas nullable, gerada por `drizzle-kit generate`).

```sql
ALTER TABLE `leads` ADD `motivo_perda` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `stage_changed_at` integer;
```

Padrão a seguir para a nova coluna (gerar via `npx drizzle-kit generate`, nunca escrever `.sql` manualmente — convenção travada do projeto, `generate`+`migrate`, nunca `push`):
```sql
ALTER TABLE `leads` ADD `contact_attempts` integer DEFAULT 0 NOT NULL;
```
Diferente de `0001_grey_xavin.sql` (colunas nullable sem `DEFAULT`), esta migração inclui `DEFAULT 0 NOT NULL` — sem necessidade de migração de backfill custom como em `0002_backfill-fechado-perdido-split.sql`, porque `DEFAULT 0` já é o valor correto para toda linha pré-existente.

---

## Shared Patterns

### SELECT-then-conditional-write (invariante de servidor, nunca confiar em estado client)
**Source:** `src/actions/lead-actions.ts` — `updateLeadStage` (linhas 166-174) e `updateLead` (linhas 113-121)
**Apply to:** `registerWhatsAppContact` — o gate de auto-avanço (`current.stage === "novo"`) precisa ser lido de um `SELECT` fresco no servidor, imediatamente antes do `UPDATE`, nunca da prop `lead.stage` recebida pelo componente client.
```typescript
const [current] = await db
  .select({ stage: leads.stage })
  .from(leads)
  .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
if (!current) {
  return { errors: { id: ["Lead inválido."] } }; // ou { advanced: false } no caso fire-and-forget
}
```

### Soft-delete filter em toda query de leads
**Source:** presente em toda função de `lead-actions.ts` (`and(eq(leads.id, id), isNull(leads.deletedAt))`)
**Apply to:** `registerWhatsAppContact` deve manter o mesmo filtro no `SELECT` e no `UPDATE`, para que um lead soft-deletado nunca seja mutado por esta rota.

### `revalidatePath` nas 3 rotas que exibem leads
**Source:** `updateLeadStage` (linhas 189-190), `createLead` (linhas 83-85), `softDeleteLead` (linhas 208-211)
**Apply to:** `registerWhatsAppContact` — `revalidatePath("/")`, `revalidatePath("/pipeline")`, `revalidatePath("/leads")` (todas as telas onde o botão de WhatsApp aparece: dashboard, pipeline, lista).

### Validação Zod de todo input de Server Action
**Source:** `src/lib/validations.ts` — `stageUpdateSchema` (linhas 60-64), consumido em `updateLeadStage` (linha 161)
**Apply to:** `registerWhatsAppContact` — novo `whatsappContactSchema` (`leadId`/`tipo`), `.safeParse()` no topo da função, retorno silencioso (`{ advanced: false }`) em caso de falha (Pitfall 8 do RESEARCH.md — achado desta fase, não presente no exemplo original de `ARCHITECTURE.md`).

### Toast via `sonner`, disparado a partir do retorno de uma Server Action
**Source:** `src/components/pipeline-board.tsx` (linhas 135-141) — `const result = await updateLeadStage(...)` seguido de `toast.success`/`toast.error`
**Apply to:** `whatsapp-preview-dialog.tsx` — mesmo mecanismo `toast.success`, mas via `.then()` fire-and-forget (não `await` bloqueante, já que a navegação não pode esperar — ver Pitfall 2) e com texto personalizado (D-07) em vez do texto genérico de `pipeline-board.tsx`.

### Indicador condicional no card do pipeline (ícone + texto, só quando relevante)
**Source:** `src/components/pipeline-lead-card.tsx` (linhas 84-88) — padrão "Esfriando" (`isEsfriando ? <span>...</span> : null`)
**Apply to:** novo indicador de `contactAttempts` (D-05/D-06) — mesmo `<span className="flex items-center gap-1">`, mesmo `size-3.5` no ícone, mesma condição de "só renderiza quando relevante" (`> 0` em vez de um boolean derivado).

### Migração aditiva via `drizzle-kit generate` + `migrate` (nunca `push`)
**Source:** `src/db/migrations/0001_grey_xavin.sql`
**Apply to:** nova migração de `contactAttempts` — gerar com `npx drizzle-kit generate`, aplicar com `npx drizzle-kit migrate`. Não repetir a exceção histórica de `templates` (aplicada via `push` sem `.sql` versionado, já documentada como débito conhecido).

## No Analog Found

Nenhum arquivo desta fase carece de analog — todos os 6 arquivos são modificações incrementais em arquivos já existentes, com o padrão a seguir presente no próprio arquivo (ou em um arquivo irmão direto na mesma pasta). Zero pacotes novos, zero componentes/serviços estruturalmente novos (confirmado por `06-RESEARCH.md`, seção "Package Legitimacy Audit": não aplicável).

## Metadata

**Analog search scope:** `src/actions/lead-actions.ts`, `src/components/whatsapp-preview-dialog.tsx`, `src/components/pipeline-lead-card.tsx`, `src/components/pipeline-board.tsx`, `src/db/schema.ts`, `src/db/migrations/*.sql`, `src/lib/validations.ts`, `src/hooks/use-first-contact-trigger.ts`
**Files scanned:** 9 arquivos lidos diretamente nesta sessão (mesmo conjunto já verificado linha a linha por `06-RESEARCH.md`)
**Pattern extraction date:** 2026-07-31
