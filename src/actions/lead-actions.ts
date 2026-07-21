"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
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
 * Checagem de existência real do subnichoId no banco — cobre sub-nicho
 * apagado/id forjado que passaria pela validação de forma (inteiro positivo)
 * do Zod, mas não existe de fato.
 */
async function subnichoExists(subnichoId: number): Promise<boolean> {
  const existing = await db
    .select({ id: subnichos.id })
    .from(subnichos)
    .where(eq(subnichos.id, subnichoId));
  return existing.length > 0;
}

export async function createLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await subnichoExists(parsed.data.subnichoId))) {
    return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
  }

  try {
    await db.insert(leads).values(parsed.data);
  } catch (err) {
    // Backstop de FK: sub-nicho apagado ENTRE a pré-checagem acima e este
    // insert (janela de corrida check-then-write). onDelete:"restrict" no
    // schema faz o SQLite lançar SQLITE_CONSTRAINT_FOREIGNKEY nesse caso.
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!(await subnichoExists(parsed.data.subnichoId))) {
    return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
  }

  try {
    // Guard isNull(deletedAt): impede editar um lead soft-deletado via
    // chamada direta — leads na Lixeira só podem ser restaurados (01-04).
    await db
      .update(leads)
      .set(parsed.data)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
  } catch (err) {
    // Mesmo backstop de FK do createLead.
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  return { success: true };
}
