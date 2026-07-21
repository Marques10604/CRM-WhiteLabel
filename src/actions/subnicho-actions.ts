"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { subnichos } from "@/db/schema";
import { subnichoSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: { nome: string[] } }
  | undefined;

export async function createSubnicho(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  revalidatePath("/subnichos");
  revalidatePath("/");
  return { success: true };
}

export async function renameSubnicho(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = subnichoSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  const existing = await db
    .select()
    .from(subnichos)
    .where(sql`lower(trim(${subnichos.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0 && existing.some((row) => row.id !== id)) {
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  try {
    await db.update(subnichos).set({ nome }).where(eq(subnichos.id, id));
  } catch {
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse sub-nicho já existe."] } };
  }

  revalidatePath("/subnichos");
  revalidatePath("/");
  return { success: true };
}
