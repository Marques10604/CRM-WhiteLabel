# Fase 12: Agenda / Tarefas Soltas — Mapa de Padrões

**Mapeado:** 2026-08-29
**Arquivos analisados:** 16 (7 criar, 9 modificar)
**Análogos encontrados:** 16 / 16 (14 exatos, 2 role-match)

> Todos os análogos abaixo já existem no repositório e foram lidos na íntegra.
> O planner/executor deve **copiar a estrutura** desses arquivos, trocando só
> o substantivo (`lead`/`motivoPerda` → `tarefa`) e os campos.

---

## Classificação dos Arquivos

| Arquivo novo/modificado | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|-------------------------|-------|----------------|----------------------|-----------|
| `src/db/schema.ts` (MOD) | model / schema | — | `motivosPerda` / `interacoes` (mesmo arquivo, L49-61 / L119-136) | exato |
| `scripts/migrate-tarefas.cjs` (NEW) | migration | batch DDL | `scripts/migrate-motivos-perda.cjs` | exato |
| `scripts/guard-no-hard-delete.cjs` (MOD) | config / guard | — | ele mesmo (Fase 9 e 11 já estenderam o escopo) | exato |
| `src/lib/validations.ts` (MOD) | validation | — | `motivoPerdaSchema` / `subnichoSchema` (L6-16) + `interacaoManualSchema` (L162-172) | exato |
| `src/actions/tarefa-actions.ts` (NEW) | service / Server Actions | CRUD | `src/actions/motivo-perda-actions.ts` (create/rename/softDelete) + `src/actions/lead-actions.ts` (`updateLead` SELECT-then-write, `softDeleteLead`) | exato |
| `src/components/tarefa-form-dialog.tsx` (NEW) | component | request-response | `src/components/lead-form-dialog.tsx` | exato |
| `src/components/delete-tarefa-dialog.tsx` (NEW) | component | request-response | `src/components/delete-motivo-perda-dialog.tsx` | exato |
| `src/components/tarefa-card.tsx` (NEW) | component | event-driven (quick action) | bloco do card de lead em `followup-dashboard.tsx` L165-222 + `WhatsAppSendButton` + `pipeline-lead-card.tsx` L67-73 (truncate) | role-match (composto) |
| `src/components/followup-dashboard.tsx` (MOD) | component | — | ele mesmo | exato |
| `src/app/page.tsx` (MOD) | route / server component | CRUD read | ele mesmo | exato |
| `src/db/queries.ts` (MOD) | service / pure fn | transform | `groupLeadsByUrgency` (L36-55) — generalizar ou irmã genérica | exato |
| `src/types/index.ts` (MOD) | model | — | linhas `Lead`/`MotivoPerda` (L4-11) | exato |
| `scripts/verify-schema.cjs` (MOD) | config / gate | — | ele mesmo (blocos de `interacoes` L47-75 e `leads` L83-91) | exato |
| `package.json` (MOD) | config | — | scripts `verify:motivo-perda`, `test:motivo-perda-actions` | exato |
| `scripts/test-tarefa-actions.cjs` (NEW) | test | — | `scripts/test-motivo-perda-actions.cjs` | exato |
| `scripts/test-group-by-urgency.cjs` (NEW) | test | — | `scripts/test-compute-sequencia-sugestao.cjs` | role-match (ver §Sem Análogo) |

---

## Atribuição de Padrões por Arquivo

### `src/db/schema.ts` (MOD — nova tabela `tarefas`)

**Análogo:** `motivosPerda` (L49-61) para o esqueleto de declaração; `interacoes` (L119-136) para o par `createdAt` notNull + `updatedAt`; `leads.stageChangedAt` (L86) para o idioma "timestamp nullable, sem default".

**Imports já presentes no topo do arquivo (L1-2) — nada novo:**
```typescript
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
```

**Padrão de declaração a copiar (molde `motivosPerda`, L49-61):**
```typescript
export const motivosPerda = sqliteTable(
  "motivos_perda",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("motivo_perda_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("motivos_perda_deleted_at_idx").on(table.deletedAt),
  ]
);
```

**Forma-alvo de `tarefas`** (D-06, §Integration Points do CONTEXT):
- `id` integer PK autoIncrement
- `descricao` text **notNull** (é o "título", D-06)
- `data` integer `{ mode: "timestamp" }` **notNull** (só dia, sem hora)
- `concluidaEm` integer `{ mode: "timestamp" }` **nullable, SEM default** — idioma idêntico a `interacoes.updatedAt` (L129) e `leads.stageChangedAt` (L86): `NULL` = pendente (D-01)
- `createdAt` integer timestamp notNull default `sql\`(unixepoch())\``
- `updatedAt` integer timestamp notNull default `sql\`(unixepoch())\`` (molde `templates.updatedAt` L27, notNull — não o nullable de `interacoes`)
- **SEM `deletedAt`** (D-08 — hard-delete), **SEM FK** (tabela desacoplada de `leads`)
- Índice recomendado: `index("tarefas_concluida_em_idx").on(table.concluidaEm)` e/ou `.on(table.data)` — cobre `WHERE concluida_em IS NULL` do dashboard
- **SEM `uniqueIndex`** — descrição de tarefa não é única (diferente de `nome` em `motivosPerda`)

**Ordem no arquivo:** como não tem FK, pode ser declarada em qualquer posição; colocar junto de `interacoes` (depois de `leads`) por afinidade de domínio.

---

### `scripts/migrate-tarefas.cjs` (NEW)

**Análogo:** `scripts/migrate-motivos-perda.cjs` (cópia quase 1:1, removendo o SEED e o `ALTER TABLE`).

**REGRA DURA do projeto (comentário-âncora de `migrate-motivos-perda.cjs` L1-16 e `migrate-sequencia-followup.cjs` L1-12):** nunca `drizzle-kit push`/`generate`. O snapshot do drizzle-kit está divergente do banco real desde a Fase 4. Dois incidentes destrutivos documentados (Fases 06-01 e 07-01). DDL sempre à mão via `better-sqlite3`.

**Blocos a copiar de `migrate-motivos-perda.cjs`, na ordem:**

1. **Cabeçalho `"use strict"` + requires + `DB_PATH`** (L17-23):
```javascript
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");
```

2. **`fail(message)` helper** (L35-38).

3. **Backup ANTES de qualquer escrita — com `wal_checkpoint(TRUNCATE)` primeiro** (L40-52) — copiar verbatim, trocando o prefixo do log:
```javascript
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}
```

4. **Contagem de referência antes** (L56-57) — usar `leads` como testemunha de "não mexi em nada": `const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;`

5. **CREATE TABLE idempotente com guarda via `sqlite_master`** (L59-75) — trocar o DDL:
```javascript
const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tarefas'")
  .get();
if (!tableExists) {
  db.exec(
    "CREATE TABLE tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, data INTEGER NOT NULL, concluida_em INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));"
  );
  db.exec("CREATE INDEX tarefas_concluida_em_idx ON tarefas (concluida_em);");
  db.exec("CREATE INDEX tarefas_data_idx ON tarefas (data);");
  console.log("[migrate-tarefas] tabela tarefas criada (+ 2 índices)");
} else {
  console.log("[migrate-tarefas] tabela tarefas já existe — pulando CREATE (idempotência)");
}
```
> **Pular** o bloco 4 (SEED) e o bloco 5 (ALTER TABLE) de `migrate-motivos-perda.cjs` — `tarefas` nasce vazia e sem FK.

6. **Verificação pós-migração** (L109-128) — adaptar:
```javascript
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
const tarefasTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tarefas'").get();
if (!tarefasTable) fail("tabela tarefas ausente após a migração");
const cols = db.prepare("PRAGMA table_info(tarefas)").all().map((c) => c.name);
for (const expected of ["id", "descricao", "data", "concluida_em", "created_at", "updated_at"]) {
  if (!cols.includes(expected)) fail(`coluna tarefas.${expected} ausente`);
}
db.close();
process.exit(0);
```

**Também:** adicionar `"migrate:tarefas": "node scripts/migrate-tarefas.cjs"` em `package.json` scripts (paridade com os `verify:*`). Não há script `migrate:*` hoje — as migrações anteriores foram rodadas ad-hoc via `node scripts/...`; seguir o que o planner preferir, mas registrar no SUMMARY que a migração é [BLOCKING] antes de qualquer uso da tela.

---

### `scripts/guard-no-hard-delete.cjs` (MOD — `tarefas` como EXCEÇÃO documentada)

**Análogo:** o próprio arquivo. Fase 9 estendeu o escopo a `interacoes`, Fase 11 a `motivos_perda` — mas esses foram **adições ao bloqueio**. Aqui é o **oposto**: `tarefas` é a primeira tabela **explicitamente permitida** a fazer `DELETE FROM` (D-08).

**Mecanismo existente (L47):** já há uma `ALLOWLIST` de caminhos:
```javascript
const ALLOWLIST = [path.join("scripts", "guard-no-hard-delete.cjs")];
```

**Duas mudanças necessárias:**

1. **Adicionar `src/actions/tarefa-actions.ts` à `ALLOWLIST`** (L47) — é o único arquivo que fará `db.delete(tarefas)` / `DELETE FROM tarefas` legitimamente. Comentário explícito citando D-08:
```javascript
const ALLOWLIST = [
  path.join("scripts", "guard-no-hard-delete.cjs"),
  // D-08 (Fase 12): `tarefas` é descartável por natureza (lembrete cumprido
  // ou cancelado) — hard-delete é intencional, SEM deletedAt, SEM Lixeira.
  // Única tabela do projeto onde `DELETE FROM` / `.delete()` é permitido.
  path.join("src", "actions", "tarefa-actions.ts"),
];
```

2. **NÃO** adicionar padrões `/\.delete\(\s*tarefas\b/` a `CODE_PATTERNS` (L55-60) nem a `CODE_SQL_PATTERNS` (L67-76) — a ausência é deliberada. Atualizar o doc-comment do topo (L11-31) e a linha final de sucesso (L159-161) para mencionar que `tarefas` está **fora** do escopo protegido, por D-08.

3. Atualizar o comentário de convenção em `src/actions/lead-actions.ts` L3-8 **não** é necessário (fala só de leads/subnichos); mas o novo `tarefa-actions.ts` deve ter seu próprio comentário-cabeçalho dizendo o inverso ("hard-delete é a política desta tabela, D-08").

---

### `src/lib/validations.ts` (MOD — `tarefaSchema`)

**Análogo:** `motivoPerdaSchema` (L14-16) e `subnichoSchema` (L6-8) para o formato do objeto; `leadBaseSchema.followUpDate` (L62) para `z.coerce.date()`; `interacaoManualSchema` (L166-168) e `stageUpdateSchema` (L117-126) para os schemas derivados com `id`.

**Import já presente (L1):** `import { z } from "zod";`

**Padrão a copiar** (molde `motivoPerdaSchema` + `followUpDate`):
```typescript
export const tarefaSchema = z.object({
  descricao: z.string().trim().min(1, "Descreva a tarefa."),
  data: z.coerce.date({ error: "Escolha uma data." }),
});

export type TarefaFormValues = z.input<typeof tarefaSchema>;
```
> Mensagens VERBATIM do `12-UI-SPEC.md` §Copywriting Contract (L109, L112).
> `z.coerce.date()` (não `z.date()`) porque o campo chega como string ISO do
> `<input type="hidden">` — idioma idêntico a `leadBaseSchema.followUpDate` (L62).

**Schemas derivados para as Server Actions** (molde `interacaoManualUpdateSchema` L170-172):
```typescript
export const tarefaUpdateSchema = tarefaSchema.extend({
  id: z.coerce.number().int().positive(),
});
```
> `.extend` sobre o schema base, **nunca** cópia paralela de campos — regra
> DRY explícita nos doc-comments de `csvRowSchema` (L83-102) e
> `interacaoManualSchema` (L157-161).

Para `concluirTarefa` / `deleteTarefa` (só recebem id + flag), seguir o
precedente de `updateLeadStage` (validação inline `Number.isInteger(id) && id > 0`,
`lead-actions.ts` L129-131) — não precisa de schema Zod dedicado.

---

### `src/actions/tarefa-actions.ts` (NEW — `createTarefa` / `updateTarefa` / `concluirTarefa` / `deleteTarefa`)

**Análogo principal:** `src/actions/motivo-perda-actions.ts` (estrutura geral, `ActionState`, helper de `revalidatePath`).
**Análogos secundários:** `src/actions/lead-actions.ts` — `createLead` (L65-123, monta `FormData` → `safeParse` → insert `.returning()`), `updateLead` (L125-210, SELECT-then-write com guard), `softDeleteLead` (L396-407, idioma de exclusão idempotente).

**Bloco de imports a copiar** (`motivo-perda-actions.ts` L1-7, trocando a tabela/schema):
```typescript
"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { tarefas } from "@/db/schema";
import { tarefaSchema, tarefaUpdateSchema } from "@/lib/validations";
```

**Cabeçalho doc-comment** — declarar a divergência de política (espelha o
comentário de `motivo-perda-actions.ts` L9-21, mas invertido): "Exclusão de
tarefa é **hard-delete** (D-08) — `tarefas` é a exceção documentada em
`scripts/guard-no-hard-delete.cjs`; este arquivo está na ALLOWLIST do guard."

**Shape homogêneo de `ActionState`** (molde `lead-form-dialog.tsx` L78-81 /
`lead-actions.ts` L17-20 — o form novo vai consumir `useActionState`, então
seguir o shape que devolve a entidade):
```typescript
type ActionState =
  | { success: true; tarefa?: Tarefa }
  | { errors: Record<string, string[] | undefined> }
  | undefined;
```

**Helper de revalidação** (molde `revalidateMotivoPerdaRoutes` L31-36) — a
tarefa só aparece no dashboard `/`:
```typescript
function revalidateTarefaRoutes() {
  revalidatePath("/");
}
```

**`createTarefa(_prevState, formData)`** — molde `createLead` L65-123 (sem os
gates de FK, que não existem aqui):
```typescript
export async function createTarefa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = tarefaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const [inserted] = await db.insert(tarefas).values(parsed.data).returning();
  revalidateTarefaRoutes();
  return { success: true, tarefa: inserted };
}
```

**`updateTarefa(_prevState, formData)`** — molde `updateLead` L125-210
(SELECT-then-write com guard de existência; aqui o guard é `isNull(concluidaEm)`?
NÃO — o dialog de edição pode editar uma tarefa concluída também, D-02/D-07;
guardar só contra id inexistente):
```typescript
export async function updateTarefa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = tarefaUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { id, ...rest } = parsed.data;
  await db
    .update(tarefas)
    .set({ ...rest, updatedAt: sql`(unixepoch())` })
    .where(eq(tarefas.id, id));
  revalidateTarefaRoutes();
  return { success: true };
}
```
> Adicionar `sql` ao import se usar `updatedAt: sql\`(unixepoch())\`` — mesmo
> idioma de `softDeleteMotivoPerda` L103.

**`concluirTarefa(id, opts?)`** — função de **argumentos posicionais** (não
`(_prevState, formData)`), molde `updateLeadStage` L219-272 e
`registerWhatsAppContact` L325 (fire-and-forget). Suporta o "Desfazer" do toast
(`12-UI-SPEC.md` L117):
```typescript
export async function concluirTarefa(
  id: number,
  opts?: { desfazer?: boolean }
): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Tarefa inválida."] } };
  }
  await db
    .update(tarefas)
    .set({ concluidaEm: opts?.desfazer ? null : sql`(unixepoch())` })
    .where(eq(tarefas.id, id));
  revalidateTarefaRoutes();
  return { success: true };
}
```
> Idempotência: seguir o idioma de `softDeleteMotivoPerda` L99-104 — o `.where`
> pode adicionar `isNull(tarefas.concluidaEm)` no caminho de conclusão para não
> sobrescrever `concluidaEm` original numa dupla-chamada; no caminho `desfazer`
> usar `isNotNull`. Decisão do executor.

**`deleteTarefa(id)`** — **HARD-DELETE** (D-08), molde estrutural de
`softDeleteLead` L396-407 mas com `db.delete()` real:
```typescript
export async function deleteTarefa(id: number): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Tarefa inválida."] } };
  }
  await db.delete(tarefas).where(eq(tarefas.id, id));
  revalidateTarefaRoutes();
  return { success: true };
}
```
> Esta é a **única** linha `db.delete(...)` legítima do `src/` inteiro. Só passa
> no `guard:no-hard-delete` porque o arquivo entra na ALLOWLIST (ver §guard acima).

---

### `src/components/tarefa-form-dialog.tsx` (NEW)

**Análogo:** `src/components/lead-form-dialog.tsx` — cópia da casca, removendo 2
das 3 seções (a tarefa tem só 2 campos, sem `bg-[#F4F4F5] p-6`, `12-UI-SPEC.md` L192).

**Bloco de imports a copiar** (`lead-form-dialog.tsx` L1-44, podando o que não usa):
```typescript
"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { startOfDay } from "date-fns";
import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DiscardChangesDialog } from "@/components/discard-changes-dialog";
import { DeleteTarefaDialog } from "@/components/delete-tarefa-dialog";
import { createTarefa, updateTarefa, concluirTarefa, deleteTarefa } from "@/actions/tarefa-actions";
import { tarefaSchema, type TarefaFormValues } from "@/lib/validations";
import type { Tarefa } from "@/types";
```

**Padrão `useActionState` + modo criar/editar** (`lead-form-dialog.tsx` L101-105):
```typescript
const isEditMode = Boolean(tarefa);
const [state, formAction, pending] = useActionState<ActionState, FormData>(
  isEditMode ? updateTarefa : createTarefa,
  undefined
);
```

**`useForm` com `defaultValues`** (L116-139) — atenção ao **default de `data` no modo criação**:
```typescript
const form = useForm<TarefaFormValues>({
  resolver: zodResolver(tarefaSchema),
  defaultValues: {
    descricao: tarefa?.descricao ?? "",
    // Modo criação precisa de Date real, não undefined — mesmo Pitfall
    // documentado em lead-form-dialog.tsx L127-134 (o Calendar só destaca
    // "hoje" visualmente, não é seleção; sem isto o zodResolver barra o submit).
    data: tarefa?.data ?? startOfDay(new Date()),
  },
});
```

**`useEffect` de toast pós-submit** (L141-159) — copy do `12-UI-SPEC.md` L115-116:
`toast.success("Tarefa criada.")` / `toast.success("Tarefa salva.")` no sucesso;
`toast.error("Não foi possível salvar a tarefa. Tente novamente.")` no erro.

**`onSubmit` com `FormData` bruto do DOM + `startTransition`** — copiar VERBATIM de `lead-form-dialog.tsx` L179-191:
```typescript
function onSubmit() {
  if (!formRef.current) return;
  const formData = new FormData(formRef.current);
  startTransition(() => { formAction(formData); });
}
```

**Guarda de descarte** `closeWithDiscardGuard` / `handleDiscard` — copiar L161-177
(o `12-UI-SPEC.md` L196 permite omitir para 2 campos; decisão do executor).

**Campo Descrição** — molde `Field` de "Nome" (`lead-form-dialog.tsx` L215-221),
`<Input>` de linha única (D-06):
```tsx
<Field data-invalid={!!errors.descricao}>
  <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
  <FieldContent>
    <Input id="descricao" placeholder="Ex: Ligar pro cowork sobre o CSV de agosto"
      aria-invalid={!!errors.descricao} {...form.register("descricao")} />
    <FieldDescription>O que precisa ser feito. Serve de título da tarefa.</FieldDescription>
    <FieldError errors={[errors.descricao]} />
  </FieldContent>
</Field>
```

**Campo Data** — copiar VERBATIM o `Controller` + `Calendar` + `<input type="hidden">`
de `lead-form-dialog.tsx` L427-457 (campo `followUpDate`), incluindo a
normalização `startOfDay`:
```tsx
<Controller
  control={form.control}
  name="data"
  render={({ field }) => {
    const selected = field.value as Date | undefined;
    return (
      <>
        <Calendar mode="single" selected={selected}
          onSelect={(date) => field.onChange(date ? startOfDay(date) : undefined)} />
        <input type="hidden" name="data" value={selected ? selected.toISOString() : ""} readOnly />
      </>
    );
  }}
/>
```

**`<form>` wrapper** (L203-207): `<form ref={formRef} onSubmit={form.handleSubmit(onSubmit)}
className="flex flex-col gap-6" noValidate>` + `{isEditMode && tarefa ? <input type="hidden"
name="id" value={tarefa.id} readOnly /> : null}` (L208-210).

**`DialogContent className="max-w-lg"`** (L198) e **`DialogFooter`** (L460):
- Modo criar: "Cancelar" (`variant="outline"`) · "Salvar" (`type="submit"`, `bg-[#0D9488]`, "Salvando..." quando pending) — molde L472-482.
- Modo editar: "Excluir" (`variant="destructive"`, `type="button"`, abre `DeleteTarefaDialog`, posicionado à esquerda — mesmo lugar do "Ver histórico" em L461-471) · "Cancelar" · "Concluir" (`variant="outline"`, ícone `<CircleCheck className="size-4" />` + texto, chama `concluirTarefa(tarefa.id)` dentro de `startTransition`, fecha, toast "Tarefa concluída." com ação "Desfazer") · "Salvar".

---

### `src/components/delete-tarefa-dialog.tsx` (NEW)

**Análogo:** `src/components/delete-motivo-perda-dialog.tsx` — cópia 1:1, trocando só o substantivo e a copy.

**Arquivo inteiro a copiar** (`delete-motivo-perda-dialog.tsx` L1-53), com estas trocas:
- Props: `motivoPerdaNome` → `descricao` (mais `open`, `onOpenChange`, `onConfirm` iguais).
- `<DialogContent showCloseButton={false}>` — mantém (não-dispensável, D-08).
- `DialogTitle`: `"Excluir tarefa"` (`12-UI-SPEC.md` L123).
- `DialogDescription`: `` `Tem certeza que deseja excluir a tarefa "${descricao}"? Essa ação não pode ser desfeita.` `` (L124).
- `DialogFooter`: "Cancelar" (`variant="outline"`, `onClick={() => onOpenChange(false)}`) · "Excluir" (`variant="destructive"`, `onClick={onConfirm}`) — L42-49, trocar "Remover" → "Excluir" (L125).

`onConfirm` no pai (dialog de edição) chama `deleteTarefa(id)`, fecha os dois
dialogs, toast "Tarefa excluída."

---

### `src/components/tarefa-card.tsx` (NEW — card enxuto, D-03)

**Análogos (composto):**
- Casca clicável + `role="button"` + `onKeyDown` Enter/Space: bloco do card de lead em `followup-dashboard.tsx` L168-180.
- Wrapper `stopPropagation` do botão de ação: `followup-dashboard.tsx` L206-219 (WhatsApp) e `pipeline-lead-card.tsx` L74-96.
- `<span>` truncate com `title`: `pipeline-lead-card.tsx` L68-73.
- Botão-ícone ghost 36px: `src/components/whatsapp-send-button.tsx` (arquivo inteiro).

**Container — copiar as classes VERBATIM de `followup-dashboard.tsx` L179:**
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => onEdit(tarefa)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(tarefa); } }}
  className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
>
```

**Cluster esquerdo** (`12-UI-SPEC.md` L164-168) — `ListTodo` + stack descrição/data:
```tsx
<div className="flex items-center gap-2 min-w-0">
  <ListTodo className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  <div className="flex flex-col gap-1 min-w-0">
    <span className="min-w-0 truncate text-[16px] leading-normal font-normal text-foreground" title={tarefa.descricao}>
      {tarefa.descricao}
    </span>
    <span className={cn("text-[14px] leading-normal", dateClassName)}>
      {format(tarefa.data, "dd/MM/yyyy")}
    </span>
  </div>
</div>
```
> `dateClassName` vem por prop, repassado de `section.dateClassName` (o dashboard
> já tem esse campo em `UrgencySection`, `followup-dashboard.tsx` L34-41). **Só a
> data** — sem sub-nicho, sem `EtapaBadge`, sem "Sugestão:" (D-03).
> `import { cn } from "@/lib/utils"` (idioma de `pipeline-lead-card.tsx` L6).

**Cluster direito — botão-ícone "concluir"** (`12-UI-SPEC.md` L172-177), molde
`WhatsAppSendButton` + wrapper `stopPropagation` de `followup-dashboard.tsx` L207:
```tsx
<div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
  <Button type="button" variant="ghost" size="icon-lg"
    aria-label={`Concluir tarefa: ${tarefa.descricao}`} title="Concluir tarefa"
    onClick={() => startTransition(() => { concluirTarefa(tarefa.id); onConcluir(tarefa); })}>
    {/* repouso: <Circle className="text-muted-foreground" /> ; hover/focus: <CircleCheck className="text-[#0D9488]" /> */}
  </Button>
</div>
```
> `size="icon-lg"` = 36px, confirmado em `src/components/ui/button.tsx` L33.
> Estado hover/foco: dois ícones com `group`/`group-hover:`/`group-focus-visible:`
> OU `useState` de hover — contrato em `12-UI-SPEC.md` L176.
> `concluirTarefa` é fire-and-forget dentro de `startTransition` — mesmo idioma de
> `registerWhatsAppContact` no anchor de WhatsApp (`lead-actions.ts` L325 + doc L281-286).
> O toast "Tarefa concluída." + ação "Desfazer" fica no pai (`onConcluir`) ou aqui — decisão do executor.

**Ícones lucide confirmados presentes** (`12-UI-SPEC.md` L28): `ListTodo`, `Circle`, `CircleCheck`.

---

### `src/components/followup-dashboard.tsx` (MOD)

**Análogo:** o próprio arquivo.

**Mudanças (todas mapeadas no `12-UI-SPEC.md` §Layout):**

1. **`UrgencySection` type (L34-41):** trocar `leads: Lead[]` por `items: DashboardItem[]`, onde
```typescript
type DashboardItem =
  | { kind: "lead"; date: Date; lead: Lead }
  | { kind: "tarefa"; date: Date; tarefa: Tarefa };
```
Props (L15-23): trocar `vencidos/hoje/proximos7Dias: Lead[]` por `DashboardItem[]` (ou receber já as 3 listas unificadas do server).

2. **`sections[]` array (L80-105):** `leads: vencidos` → `items: vencidos` etc.; `section.leads.length` (L78, L141, L161) → `section.items.length`.

3. **`.map` (L165-223):** `section.items.map((item) => item.kind === "lead" ? <cardDeLeadExistente> : <TarefaCard tarefa={item.tarefa} dateClassName={section.dateClassName} onEdit={...} onConcluir={...} />)`. O bloco do card de lead (L168-221) é extraído sem alteração para o ramo `"lead"`.

4. **Cabeçalho (L111-118):** o `<div className="flex items-center justify-between">` vira um cluster `<div className="flex items-center gap-2">` com "Novo lead" (`bg-[#0D9488]`, L112-117 inalterado) **+** "Nova tarefa" (`<Button variant="outline">`, abre `TarefaFormDialog` modo criação — novo estado local `tarefaDialogState`, molde do `dialogState` L25-28/L60).

5. **Estado vazio (L120-137):** `totalCount` (L78) passa a somar tarefas; body "Nenhum follow-up pendente." → **"Nenhum follow-up ou tarefa pendente."** (`12-UI-SPEC.md` L102); cluster de CTAs (L126-136) ganha o 3º botão "Nova tarefa" (`variant="outline"`) na ordem: "Ver todos os leads" · "Nova tarefa" · "Novo lead".

6. **Render do `<TarefaFormDialog>`** ao lado do `<LeadFormDialog>` (L230-241) — mesmo padrão `key`/`open`/`onOpenChange`.

7. **Imports novos:** `TarefaFormDialog`, `TarefaCard` (ou inline), `Tarefa` de `@/types`, `ListTodo` se o card for inline.

---

### `src/app/page.tsx` (MOD)

**Análogo:** o próprio arquivo.

**Mudanças:**

1. **Import:** adicionar `tarefas` a `@/db/schema` (L2) e a nova fn de agrupamento a `@/db/queries` (L3-9).

2. **`Promise.all` (L25-39):** adicionar
```typescript
db.select().from(tarefas).where(isNull(tarefas.concluidaEm)).orderBy(asc(tarefas.data)),
```
> `isNull` / `asc` já são o vocabulário Drizzle usado em `queries.ts` L1;
> importar de `drizzle-orm` aqui (hoje `page.tsx` não importa nada de drizzle —
> adicionar `import { isNull, asc } from "drizzle-orm";`). Alternativa preferível:
> encapsular numa fn `getTarefasPendentes()` em `queries.ts` (molde
> `getActiveDashboardLeads` L14-20) para não vazar SQL para a página.

3. **Bucketização (L41):** hoje `const { vencidos, hoje, proximos7Dias } = groupLeadsByUrgency(activeLeads);`. Passar a agrupar **também** as tarefas pela mesma régua e fundir+ordenar por data (ver `queries.ts` abaixo). Resultado: 3 listas de `DashboardItem` ordenadas por `date` asc.

4. **Props do `<FollowupDashboard>` (L57-65):** passar as 3 listas unificadas.

---

### `src/db/queries.ts` (MOD — generalizar/irmã de `groupLeadsByUrgency`)

**Análogo:** `groupLeadsByUrgency` (L36-55) — a função a generalizar; `computeSequenciaSugestao` (L135-146) e `resolvePeriodRange` (L182-186) como exemplos do idioma "função pura, `now`/`new Date()` injetável, sem I/O".

**Imports já presentes (L1-2):** `addDays, isBefore, isToday, startOfDay` de `date-fns` já importados.

**Padrão atual a preservar** (L36-55) — buckets `< today` / `isToday` / `< addDays(today, 8)`:
```typescript
export function groupLeadsByUrgency(activeLeads: Lead[], now?: Date): LeadsByUrgency {
  const today = startOfDay(now ?? new Date());
  const in7Days = addDays(today, 8);
  const vencidos: Lead[] = []; const hoje: Lead[] = []; const proximos7Dias: Lead[] = [];
  for (const lead of activeLeads) {
    if (isBefore(lead.followUpDate, today)) vencidos.push(lead);
    else if (isToday(lead.followUpDate)) hoje.push(lead);
    else if (isBefore(lead.followUpDate, in7Days)) proximos7Dias.push(lead);
  }
  return { vencidos, hoje, proximos7Dias };
}
```

**Direção recomendada (decisão final do planner, `12-CONTEXT.md` §Claude's Discretion):**
função genérica irmã que recebe um seletor de data, mantendo `groupLeadsByUrgency`
como wrapper fino para não quebrar os call-sites atuais:
```typescript
export function groupByUrgency<T>(items: T[], getDate: (item: T) => Date, now?: Date): {
  vencidos: T[]; hoje: T[]; proximos7Dias: T[];
} {
  const today = startOfDay(now ?? new Date());
  const in7Days = addDays(today, 8);
  const vencidos: T[] = []; const hoje: T[] = []; const proximos7Dias: T[] = [];
  for (const item of items) {
    const d = getDate(item);
    if (isBefore(d, today)) vencidos.push(item);
    else if (isToday(d)) hoje.push(item);
    else if (isBefore(d, in7Days)) proximos7Dias.push(item);
  }
  return { vencidos, hoje, proximos7Dias };
}
// wrapper preservado:
export function groupLeadsByUrgency(activeLeads: Lead[], now?: Date): LeadsByUrgency {
  return groupByUrgency(activeLeads, (l) => l.followUpDate, now);
}
```
> Manter `now`/`now?` injetável — é o que torna o teste possível (ver abaixo).
> A fusão lead+tarefa por data e a construção dos `DashboardItem[]` pode morar
> em `page.tsx` ou numa fn dedicada aqui; se morar aqui, mantê-la pura também.

Opcional: `getTarefasPendentes()` (molde `getActiveDashboardLeads` L14-20):
```typescript
export async function getTarefasPendentes(): Promise<Tarefa[]> {
  return db.select().from(tarefas).where(isNull(tarefas.concluidaEm)).orderBy(asc(tarefas.data));
}
```

---

### `src/types/index.ts` (MOD)

**Análogo:** L4-11 (linhas de `Lead` / `MotivoPerda`).
```typescript
export type Tarefa = InferSelectModel<typeof tarefas>;
export type NewTarefa = InferInsertModel<typeof tarefas>;
```
Adicionar `tarefas` ao import de `@/db/schema` (L2).

---

### `scripts/verify-schema.cjs` (MOD)

**Análogo:** o próprio arquivo — bloco de `interacoes` (L47-75, conjunto estrito
de colunas) e bloco de `leads` (L83-91, checagem de presença).

**Mudanças:**
1. `requiredTables` (L29): adicionar `"tarefas"`.
2. `requiredIndexes` (L30-35): adicionar `"tarefas_concluida_em_idx"` (e `"tarefas_data_idx"` se criado).
3. Novo bloco de conjunto **estrito** de colunas para `tarefas` (molde L47-75 de `interacoes`), colunas esperadas: `id`, `descricao`, `data`, `concluida_em`, `created_at`, `updated_at` — nem a mais nem a menos (tabela nova, sem histórico de acúmulo, então conjunto estrito é seguro, diferente de `leads`).
4. Atualizar a linha de sucesso (L101-104).

---

### `package.json` (MOD)

**Análogo:** entradas `verify:motivo-perda`, `test:motivo-perda-actions`, `test:compute-sequencia`.

Adicionar:
```json
"migrate:tarefas": "node scripts/migrate-tarefas.cjs",
"test:tarefa-actions": "node scripts/test-tarefa-actions.cjs",
"test:group-by-urgency": "node scripts/test-group-by-urgency.cjs"
```

---

### `scripts/test-tarefa-actions.cjs` (NEW)

**Análogo:** `scripts/test-motivo-perda-actions.cjs` — cópia da casca inteira (L1-271).

**Blocos a copiar VERBATIM:**
- Cabeçalho `"use strict"` + os dois `register(...)` na ordem invertida (stub-loader por último para executar primeiro), L16-28.
- `check(condition, message)` + contador `failed`, L30-39.
- `tmpDb` em `os.tmpdir()` + `process.env.DB_FILE_NAME = tmpDb` **antes** de qualquer `await import("@/...")`, L42-46.
- Setup do DDL cru **idêntico ao de `migrate-tarefas.cjs`** (L48-60) — `CREATE TABLE tarefas (...)` + os 2 índices.
- `await import("@/actions/tarefa-actions")` **depois** do `DB_FILE_NAME`, L62-65.
- Helpers `raw`/`rowById`/`countAll`/`snapshot`/`fd(fields)`, L67-89.
- Cleanup dos arquivos `tmpDb` + `-shm` + `-wal` no fim, L245-253.
- Bloco `main().then(...).catch(...)` com `process.exit`, L256-270.

**`next-cache-stub-loader.mjs`** (`scripts/test-support/`) troca `revalidatePath`
por no-op — já existe, reutilizar (L11-12 do doc-comment do análogo).

**Casos a cobrir** (adaptar os 7 casos do análogo):
1. `createTarefa` com descrição+data válidas → `{ success: true, tarefa }`, grava 1 linha, `concluida_em` NULL.
2. `createTarefa` descrição vazia / só espaços → `{ errors: { descricao: [...] } }`, nada gravado (molde Caso 7).
3. `createTarefa` data ausente/inválida → erro de validação.
4. `updateTarefa` altera descrição e data → persiste, `updated_at` muda.
5. `concluirTarefa(id)` → `concluida_em` preenchido; idempotente (2ª chamada não sobrescreve — molde Caso 3 com sentinel `111111`).
6. `concluirTarefa(id, { desfazer: true })` → `concluida_em` volta a NULL.
7. `deleteTarefa(id)` → **linha some de fato** (`countAll()` decrementa, `rowById` retorna undefined) — o teste que prova o hard-delete de D-08.

> **Não usar `DELETE FROM` para limpar estado entre cenários** (o guard varre
> `scripts/`, e este arquivo NÃO está na allowlist) — usar ids/descrições únicos
> por cenário (precedente registrado em STATE.md p/ Fases 10-02 e 11).

---

### `scripts/test-group-by-urgency.cjs` (NEW)

**Análogo:** `scripts/test-compute-sequencia-sugestao.cjs` — o único teste de
função pura do projeto (ver §Sem Análogo Exato abaixo).

**Blocos a copiar VERBATIM:**
- `"use strict"` + `register("./ts-alias-loader.mjs", ...)` + `process.env.DB_FILE_NAME = ":memory:"` **antes** do register (L28-33). Isto é obrigatório porque `queries.ts` importa `@/db/client` no nível de módulo — o `:memory:` evita tocar `data/crm.db` mesmo sem rodar query nenhuma.
- `check(condition, message)` + `failed`, L37-44.
- `sameDate(a, b)` helper, L46-48.
- IIFE `(async () => { ... })().catch(...)` com `process.exit`, L50 / L205-208.

**Casos a cobrir** (a régua é `< today` / `isToday` / `< addDays(today, 8)`):
- `now` fixo injetado (ex: `new Date("2026-08-15T12:00:00Z")`) — provar que a fn é determinística.
- Item com data `today - 1` → `vencidos`.
- Item com data = `today` (qualquer hora) → `hoje` (testar `isToday` com hora != meia-noite).
- Item com data `today + 7` (o 7º dia futuro) → `proximos7Dias` (borda inferior de `addDays(today, 8)`, exatamente o caso citado no doc-comment L36-39 de `queries.ts`).
- Item com data `today + 8` → **nenhum bucket**.
- Lista mista lead+tarefa → cada um cai no bucket certo pelo seu `getDate`.
- Lista vazia → `{ vencidos: [], hoje: [], proximos7Dias: [] }`.

---

## Padrões Compartilhados (aplicar a vários arquivos)

### Migração de schema — SEMPRE `.cjs` manual via better-sqlite3
**Fonte:** `scripts/migrate-motivos-perda.cjs`, `scripts/migrate-sequencia-followup.cjs`
**Aplica a:** `scripts/migrate-tarefas.cjs`
**Regra:** NUNCA `drizzle-kit push`/`generate` (snapshot divergente desde a Fase 4;
2 incidentes destrutivos, Fases 06-01/07-01). Sempre: backup com
`wal_checkpoint(TRUNCATE)` → contagem de referência → DDL guardado por
idempotência (`sqlite_master` p/ tabela, `PRAGMA table_info` p/ coluna) →
verificação pós-migração → `process.exit(0)`.

### Server Actions — shape homogêneo de `ActionState` + helper de revalidação
**Fonte:** `src/actions/motivo-perda-actions.ts` L22-36, `src/actions/lead-actions.ts` L17-20
**Aplica a:** `src/actions/tarefa-actions.ts`
```typescript
type ActionState = { success: true; tarefa?: Tarefa } | { errors: Record<string, string[] | undefined> } | undefined;
```
- `(_prevState, formData)` para as actions ligadas a `useActionState` (create/update).
- Argumentos posicionais para as fire-and-forget (`concluir`/`delete`), molde `updateLeadStage` / `softDeleteLead`.
- `safeParse(Object.fromEntries(formData))` → `return { errors: parsed.error.flatten().fieldErrors }`.
- `revalidatePath("/")` num helper nomeado, chamado após cada mutação bem-sucedida.

### Form dialog — `FormData` bruto do DOM + `startTransition`
**Fonte:** `src/components/lead-form-dialog.tsx` L179-191
**Aplica a:** `src/components/tarefa-form-dialog.tsx`
O client NUNCA reenvia dados já transformados pelo resolver — monta
`new FormData(formRef.current)` do `<form>` e envolve `formAction` em
`startTransition` (React 19 exige, senão "called outside of a transition").

### Date picker — `Calendar` + hidden input + `startOfDay`
**Fonte:** `src/components/lead-form-dialog.tsx` L427-457
**Aplica a:** `src/components/tarefa-form-dialog.tsx` (campo `data`)
`onSelect={(date) => field.onChange(date ? startOfDay(date) : undefined)}` +
`<input type="hidden" name="data" value={selected ? selected.toISOString() : ""} readOnly />`.
Normalização `startOfDay` = Pitfall de fuso (o item "pula" de dia perto da virada).
Default `startOfDay(new Date())` no modo criação (senão o zodResolver barra o submit).

### Card clicável + botão de ação com `stopPropagation`
**Fonte:** `src/components/followup-dashboard.tsx` L168-180 (casca) + L206-219 (wrapper stopPropagation);
`src/components/whatsapp-send-button.tsx` (botão-ícone ghost 36px)
**Aplica a:** `src/components/tarefa-card.tsx`
`role="button"` + `tabIndex={0}` + `onClick` + `onKeyDown` (Enter/Space com
`preventDefault`). O botão de ação rápida vai dentro de
`<div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>`
para não disparar a edição. `<Button variant="ghost" size="icon-lg">` = 36px
(`ui/button.tsx` L33).

### `<span>` truncate com tooltip nativo
**Fonte:** `src/components/pipeline-lead-card.tsx` L68-73
**Aplica a:** `src/components/tarefa-card.tsx` (descrição)
`className="min-w-0 truncate ..."` + `title={tarefa.descricao}` — o `<Input>` de
linha única do form garante que a descrição é sempre single-line.

### Teste de comportamento de Server Actions — banco temp em `os.tmpdir()`
**Fonte:** `scripts/test-motivo-perda-actions.cjs`, `scripts/test-lead-actions.cjs`
**Aplica a:** `scripts/test-tarefa-actions.cjs`
`DB_FILE_NAME` setado ANTES de `await import("@/...")`; DDL cru idêntico ao da
migração; `register` do `ts-alias-loader` + `next-cache-stub-loader`; `check()`
harness; sem `DELETE FROM` para limpar estado; cleanup de `-shm`/`-wal`.

### Teste de função pura — `DB_FILE_NAME=":memory:"` + `ts-alias-loader`
**Fonte:** `scripts/test-compute-sequencia-sugestao.cjs`
**Aplica a:** `scripts/test-group-by-urgency.cjs`
`queries.ts` importa `@/db/client` no topo — `:memory:` antes do `register` evita
abrir o banco de produção. `now` injetável = o que torna o teste determinístico.

### Guard de hard-delete — `tarefas` é EXCEÇÃO (não extensão)
**Fonte:** `scripts/guard-no-hard-delete.cjs` L47 (`ALLOWLIST`)
**Aplica a:** `scripts/guard-no-hard-delete.cjs` (MOD) + `src/actions/tarefa-actions.ts`
D-08: `src/actions/tarefa-actions.ts` entra na `ALLOWLIST` com comentário citando
D-08. NÃO adicionar padrões `tarefas` a `CODE_PATTERNS`/`CODE_SQL_PATTERNS`.
Fase 9 (`interacoes`) e Fase 11 (`motivos_perda`) foram o oposto — adições ao
bloqueio; esta é a primeira permissão.

---

## Sem Análogo Exato

| Arquivo | Papel | Motivo | O que usar |
|---------|-------|--------|------------|
| `scripts/test-group-by-urgency.cjs` | test (função pura) | **Não existe teste para `groupLeadsByUrgency` no repositório** (confirmado: grep em `scripts/` só acha `test-compute-sequencia-sugestao.cjs` e `test-relatorios-queries.cjs`). `groupLeadsByUrgency` é pura e testável mas nunca ganhou cobertura. | `scripts/test-compute-sequencia-sugestao.cjs` é o molde estrutural exato (mesma técnica `:memory:` + `ts-alias-loader` + `check()` para uma fn pura de `queries.ts`). O `12-CONTEXT.md` §code_context afirma "testada" — está **incorreto**; o planner deve tratar o teste como **novo trabalho** desta fase, não como algo a estender. |
| `src/components/tarefa-card.tsx` | component | Não há card de item "não-lead" no projeto. Todo card existente (dashboard, pipeline, lixeira) é de lead, com sub-nicho/badge/WhatsApp. | Composição de 3 análogos parciais (casca de `followup-dashboard.tsx` L168-180, botão de `whatsapp-send-button.tsx`, truncate de `pipeline-lead-card.tsx`) — todos listados em §Pattern Assignments acima. Nenhum padrão do RESEARCH necessário. |

Nenhum arquivo desta fase precisa recorrer a padrões externos / do RESEARCH —
todos os 16 têm análogo real no código (2 deles compostos/parciais).

---

## Metadata

**Escopo da busca de análogos:** `src/db/`, `src/actions/`, `src/components/`,
`src/lib/`, `src/app/`, `src/types/`, `scripts/`, `scripts/test-support/`,
`src/components/ui/`
**Arquivos lidos na íntegra:** `src/db/schema.ts`, `src/db/queries.ts`,
`src/app/page.tsx`, `src/lib/validations.ts`, `src/actions/motivo-perda-actions.ts`,
`src/actions/subnicho-actions.ts`, `src/actions/lead-actions.ts`,
`src/components/followup-dashboard.tsx`, `src/components/lead-form-dialog.tsx`,
`src/components/pipeline-lead-card.tsx`, `src/components/whatsapp-send-button.tsx`,
`src/components/delete-motivo-perda-dialog.tsx`, `src/components/ui/button.tsx`,
`src/types/index.ts`, `scripts/migrate-motivos-perda.cjs`,
`scripts/migrate-sequencia-followup.cjs`, `scripts/guard-no-hard-delete.cjs`,
`scripts/verify-schema.cjs`, `scripts/test-motivo-perda-actions.cjs`,
`scripts/test-compute-sequencia-sugestao.cjs`
**Data da extração:** 2026-08-29
