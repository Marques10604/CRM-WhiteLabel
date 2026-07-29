"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
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
    // O uniqueIndex de nome é global (inclui removidos) — se a linha
    // encontrada estiver soft-deletada, recriar não deveria ser um beco sem
    // saída ("já existe"), e sim reativar o registro existente (regravando
    // o nome com a grafia recém-digitada).
    if (existing[0].deletedAt !== null) {
      await db.update(subnichos).set({ deletedAt: null, nome }).where(eq(subnichos.id, existing[0].id));
      revalidatePath("/subnichos");
      revalidatePath("/");
      revalidatePath("/leads");
      revalidatePath("/pipeline");
      revalidatePath("/importar");
      return { success: true };
    }
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

/**
 * Soft-delete (LEAD-04): nunca hard-delete de subnichos (npm run
 * guard:no-hard-delete cobre remoções destrutivas dessa tabela). Leads
 * existentes continuam apontando para o id removido de propósito — o FK
 * `onDelete: "restrict"` em `leads.subnichoId` permanece intocado, e
 * `subnichoExists` (lead-actions.ts) propositalmente não filtra
 * `deletedAt`, então editar/salvar leads antigos não quebra.
 */
export async function softDeleteSubnicho(subnichoId: number): Promise<ActionState> {
  if (!Number.isInteger(subnichoId) || subnichoId <= 0) {
    return { errors: { nome: ["Sub-nicho inválido."] } };
  }

  // isNull(deletedAt) no where torna a ação idempotente: remover duas vezes
  // é no-op, não sobrescreve o deletedAt original.
  await db
    .update(subnichos)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(subnichos.id, subnichoId), isNull(subnichos.deletedAt)));

  revalidatePath("/subnichos");
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/importar");
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
