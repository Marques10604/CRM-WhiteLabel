"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { nichos } from "@/db/schema";
import { nichoSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: { nome: string[] } }
  | undefined;

export async function createNicho(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = nichoSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

  const existing = await db
    .select()
    .from(nichos)
    .where(sql`lower(trim(${nichos.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0) {
    // O uniqueIndex de nome é global (inclui removidos) — se a linha
    // encontrada estiver soft-deletada, recriar não deveria ser um beco sem
    // saída ("já existe"), e sim reativar o registro existente (regravando
    // o nome com a grafia recém-digitada).
    if (existing[0].deletedAt !== null) {
      await db.update(nichos).set({ deletedAt: null, nome }).where(eq(nichos.id, existing[0].id));
      revalidatePath("/nichos");
      revalidatePath("/");
      revalidatePath("/leads");
      revalidatePath("/pipeline");
      revalidatePath("/importar");
      return { success: true };
    }
    return { errors: { nome: ["Esse nicho já existe."] } };
  }

  try {
    await db.insert(nichos).values({ nome });
  } catch {
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse nicho já existe."] } };
  }

  revalidatePath("/nichos");
  revalidatePath("/");
  return { success: true };
}

/**
 * Soft-delete (LEAD-04): nunca hard-delete de nichos (npm run
 * guard:no-hard-delete cobre remoções destrutivas dessa tabela). Leads
 * existentes continuam apontando para o id removido de propósito — o FK
 * `onDelete: "restrict"` em `leads.nichoId` permanece intocado, e
 * `nichoExists` (lead-actions.ts) propositalmente não filtra
 * `deletedAt`, então editar/salvar leads antigos não quebra.
 */
export async function softDeleteNicho(nichoId: number): Promise<ActionState> {
  if (!Number.isInteger(nichoId) || nichoId <= 0) {
    return { errors: { nome: ["Nicho inválido."] } };
  }

  // isNull(deletedAt) no where torna a ação idempotente: remover duas vezes
  // é no-op, não sobrescreve o deletedAt original.
  await db
    .update(nichos)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(nichos.id, nichoId), isNull(nichos.deletedAt)));

  revalidatePath("/nichos");
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/importar");
  return { success: true };
}

export async function renameNicho(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = nichoSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { nome: ["Esse nicho já existe."] } };
  }

  const existing = await db
    .select()
    .from(nichos)
    .where(sql`lower(trim(${nichos.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0 && existing.some((row) => row.id !== id)) {
    return { errors: { nome: ["Esse nicho já existe."] } };
  }

  try {
    await db.update(nichos).set({ nome }).where(eq(nichos.id, id));
  } catch {
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse nicho já existe."] } };
  }

  revalidatePath("/nichos");
  revalidatePath("/");
  return { success: true };
}
