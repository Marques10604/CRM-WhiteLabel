"use server";

/**
 * DIVERGÊNCIA DE POLÍTICA (D-08, Fase 12) — espelho INVERTIDO da convenção
 * LEAD-04 documentada no cabeçalho de `src/actions/lead-actions.ts`: enquanto
 * lead/subnicho/interação/motivo de perda são SEMPRE soft-delete, a exclusão
 * de tarefa é HARD-DELETE. `tarefas` é descartável por natureza (lembrete
 * cumprido ou cancelado), NÃO tem coluna `deletedAt` e NÃO tem Lixeira.
 *
 * Este arquivo é a ÚNICA entrada da `ALLOWLIST` de
 * `scripts/guard-no-hard-delete.cjs` — a única superfície de todo o projeto
 * onde `db.delete(...)` / `DELETE FROM` é permitido. `tarefas` de propósito
 * NÃO aparece em `CODE_PATTERNS`/`CODE_SQL_PATTERNS` do guard, então um
 * `db.delete(leads)` acidental aqui dentro continua sendo bloqueado.
 *
 * As 4 Server Actions compartilham o mesmo `ActionState` homogêneo
 * (compatível com `useActionState`): `createTarefa`/`updateTarefa` recebem
 * `(prevState, formData)`; `concluirTarefa`/`deleteTarefa` recebem `id`
 * posicional (fire-and-forget). Toda mutação bem-sucedida chama
 * `revalidateTarefaRoutes()` — a tarefa só aparece no dashboard raiz `/`.
 *
 * Segurança: todo input de formulário passa por `tarefaSchema` /
 * `tarefaUpdateSchema` via `safeParse` ANTES de qualquer acesso ao banco
 * (T-12-07); ids posicionais passam pelo guard inteiro
 * `Number.isInteger(id) && id > 0` (T-12-08); todas as condições usam os
 * helpers parametrizados do Drizzle (`eq`/`and`/`isNull`/`isNotNull`) —
 * nenhum `sql` template interpola dado de usuário (T-12-09).
 */

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { tarefas } from "@/db/schema";
import { tarefaSchema, tarefaUpdateSchema } from "@/lib/validations";
import type { Tarefa } from "@/types";

type ActionState =
  | { success: true; tarefa?: Tarefa }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * A tarefa só aparece no dashboard raiz `/` (D-02/D-04) — molde de
 * `revalidateMotivoPerdaRoutes`, mas com uma única rota.
 */
function revalidateTarefaRoutes() {
  revalidatePath("/");
}

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

export async function updateTarefa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = tarefaUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // O dialog de edição (D-07) pode editar uma tarefa JÁ concluída (D-02),
  // então o único guard no WHERE é o id — nunca `isNull(concluidaEm)`.
  const { id, ...rest } = parsed.data;
  await db
    .update(tarefas)
    .set({ ...rest, updatedAt: sql`(unixepoch())` })
    .where(eq(tarefas.id, id));

  revalidateTarefaRoutes();
  return { success: true };
}

export async function concluirTarefa(
  id: number,
  opts?: { desfazer?: boolean }
): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Tarefa inválida."] } };
  }

  if (opts?.desfazer === true) {
    // Reabre a tarefa (ação "Desfazer" do toast) — `isNotNull` no WHERE
    // torna a operação idempotente no sentido reverso.
    await db
      .update(tarefas)
      .set({ concluidaEm: null })
      .where(and(eq(tarefas.id, id), isNotNull(tarefas.concluidaEm)));
  } else {
    // `isNull(concluidaEm)` no WHERE garante idempotência: a 2ª chamada é
    // no-op e NÃO sobrescreve o carimbo original (mesmo idioma de
    // `softDeleteMotivoPerda`).
    await db
      .update(tarefas)
      .set({ concluidaEm: sql`(unixepoch())` })
      .where(and(eq(tarefas.id, id), isNull(tarefas.concluidaEm)));
  }

  revalidateTarefaRoutes();
  return { success: true };
}

export async function deleteTarefa(id: number): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Tarefa inválida."] } };
  }

  // D-08: hard-delete real. Esta é a ÚNICA linha `db.delete(...)` legítima
  // de todo o `src/` — só passa no `npm run guard:no-hard-delete` porque
  // este arquivo está na ALLOWLIST do guard.
  await db.delete(tarefas).where(eq(tarefas.id, id));

  revalidateTarefaRoutes();
  return { success: true };
}
