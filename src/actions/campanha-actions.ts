"use server";

/**
 * Server Actions de CRUD da campanha de exploração de nicho (CAMPANHA-01/02/04,
 * Fase 22). Molde EXATO de `lead-actions.ts`/`tarefa-actions.ts`: `ActionState`
 * homogêneo, `safeParse` ANTES de qualquer acesso ao banco, checagem de FK
 * forjada (`campanhaExists`... aqui `nichoExists`) ANTES do insert/update com
 * `isForeignKeyViolation` como backstop da janela de corrida check-then-write.
 *
 * `softDeleteCampanha` segue o mesmo idioma de `softDeleteNicho`/
 * `softDeleteMotivoPerda` — soft-delete real (nunca `.delete()`), idempotente
 * via `isNull(deletedAt)` no WHERE. NÃO checa leads vinculados antes de
 * remover: `onDelete: "set null"` só age em hard-delete real (nunca disparado
 * aqui), e leads antigos apontando para uma campanha removida é o mesmo
 * comportamento já aceito para `nichos`/`motivosPerda`.
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { campanhas, nichos } from "@/db/schema";
import { campanhaSchema, campanhaUpdateSchema } from "@/lib/validations";
import type { Campanha } from "@/types";

type ActionState =
  | { success: true; campanha?: Campanha }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  );
}

/**
 * Checagem de existência real do nichoId no banco (T-22-01) — cópia
 * linha-a-linha de `nichoExists` em `lead-actions.ts`. Propositalmente
 * indiferente a `deletedAt`: editar uma campanha cujo nicho foi removido
 * (soft-delete) não pode quebrar.
 */
async function nichoExists(nichoId: number): Promise<boolean> {
  const existing = await db.select({ id: nichos.id }).from(nichos).where(eq(nichos.id, nichoId));
  return existing.length > 0;
}

function revalidateCampanhaRoutes(id?: number) {
  revalidatePath("/campanhas");
  if (id) revalidatePath(`/campanhas/${id}`);
}

export async function createCampanha(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = campanhaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await nichoExists(parsed.data.nichoId))) {
    return { errors: { nichoId: ["Selecione um nicho."] } };
  }

  let inserted: Campanha;
  try {
    [inserted] = await db.insert(campanhas).values(parsed.data).returning();
  } catch (err) {
    // Backstop de FK: nicho apagado ENTRE a pré-checagem acima e este insert
    // (janela de corrida check-then-write) — onDelete:"restrict" no schema
    // faz o SQLite lançar SQLITE_CONSTRAINT_FOREIGNKEY nesse caso.
    if (isForeignKeyViolation(err)) {
      return { errors: { nichoId: ["Selecione um nicho."] } };
    }
    throw err;
  }

  revalidateCampanhaRoutes();
  return { success: true, campanha: inserted };
}

export async function updateCampanha(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = campanhaUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await nichoExists(parsed.data.nichoId))) {
    return { errors: { nichoId: ["Selecione um nicho."] } };
  }

  const { id, ...rest } = parsed.data;
  try {
    await db
      .update(campanhas)
      .set({ ...rest, updatedAt: sql`(unixepoch())` })
      .where(and(eq(campanhas.id, id), isNull(campanhas.deletedAt)));
  } catch (err) {
    // Mesmo backstop de FK do createCampanha.
    if (isForeignKeyViolation(err)) {
      return { errors: { nichoId: ["Selecione um nicho."] } };
    }
    throw err;
  }

  revalidateCampanhaRoutes(id);
  return { success: true };
}

export async function softDeleteCampanha(campanhaId: number): Promise<ActionState> {
  if (!Number.isInteger(campanhaId) || campanhaId <= 0) {
    return { errors: { id: ["Campanha inválida."] } };
  }

  // isNull(deletedAt) no where torna a ação idempotente: remover duas vezes
  // é no-op, não sobrescreve o deletedAt original.
  await db
    .update(campanhas)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(campanhas.id, campanhaId), isNull(campanhas.deletedAt)));

  revalidateCampanhaRoutes();
  return { success: true };
}
