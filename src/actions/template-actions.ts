"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { templateSchema } from "@/lib/validations";
import type { Template } from "@/types";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Garante "um padrão por tipo" (D-12): desmarca atomicamente o padrão atual
 * do tipo (se houver) e marca o novo `id` — transação síncrona do
 * better-sqlite3, nunca confiar na UI para esse invariante.
 */
function applyDefaultTemplate(id: number, tipo: Template["tipo"]) {
  db.transaction((tx) => {
    tx.update(templates)
      .set({ isDefault: false })
      .where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true)))
      .run();
    tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id)).run();
  });
}

export async function createTemplate(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { isDefault, ...rest } = parsed.data;

  const [inserted] = await db
    .insert(templates)
    .values({ ...rest, isDefault })
    .returning({ id: templates.id });

  if (isDefault) {
    applyDefaultTemplate(inserted.id, parsed.data.tipo);
  }

  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}

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
    applyDefaultTemplate(id, parsed.data.tipo);
  }

  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}

export async function deleteTemplate(id: number): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Template inválido."] } };
  }

  // Hard delete (D-13) — templates não têm lixeira/soft-delete.
  await db.delete(templates).where(eq(templates.id, id));

  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}

export async function setDefaultTemplate(
  id: number,
  tipo: Template["tipo"]
): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { id: ["Template inválido."] } };
  }

  applyDefaultTemplate(id, tipo);

  revalidatePath("/templates");
  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}
