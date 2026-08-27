"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { motivosPerda } from "@/db/schema";
import { motivoPerdaSchema } from "@/lib/validations";

/**
 * CRUD governado de motivos de perda (D-01/D-05, PERDA-01) — réplica 1:1 de
 * `src/actions/subnicho-actions.ts` (mesma tabela `id`/`nome`/`deletedAt`,
 * mesmo par de índices, mesma reativação-por-nome).
 *
 * DIVERGÊNCIA DELIBERADA do molde `createSubnicho`: aqui o `ActionState` de
 * sucesso carrega `id`. `createSubnicho` devolve só `{ success: true }` porque
 * o `SubnichoCombobox` recebe a lista pronta por prop; `createMotivoPerda` é
 * chamado de DENTRO do combobox criável (D-03, plano 11-03) para
 * criar-e-já-selecionar, então precisa do id inserido/reativado. As três
 * funções devolvem o mesmo shape homogêneo (`renameMotivoPerda` e
 * `softDeleteMotivoPerda` ecoam o id recebido).
 */
type ActionState =
  | { success: true; id: number }
  | { errors: { nome: string[] } }
  | undefined;

/**
 * `/relatorios` ainda não existe no plano 11-02 — `revalidatePath` de rota
 * inexistente é no-op seguro no Next, e evita voltar aqui no plano 11-05.
 */
function revalidateMotivoPerdaRoutes() {
  revalidatePath("/motivos-perda");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath("/relatorios");
}

export async function createMotivoPerda(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = motivoPerdaSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

  const existing = await db
    .select()
    .from(motivosPerda)
    .where(sql`lower(trim(${motivosPerda.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0) {
    // O uniqueIndex de nome é global (inclui removidos) — se a linha
    // encontrada estiver soft-deletada, recriar não deveria ser um beco sem
    // saída ("já existe"), e sim reativar o registro existente (regravando
    // o nome com a grafia recém-digitada, D-03).
    if (existing[0].deletedAt !== null) {
      await db
        .update(motivosPerda)
        .set({ deletedAt: null, nome })
        .where(eq(motivosPerda.id, existing[0].id));
      revalidateMotivoPerdaRoutes();
      return { success: true, id: existing[0].id };
    }
    return { errors: { nome: ["Esse motivo já existe."] } };
  }

  let insertedId: number;
  try {
    const [row] = await db
      .insert(motivosPerda)
      .values({ nome })
      .returning({ id: motivosPerda.id });
    insertedId = row.id;
  } catch {
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse motivo já existe."] } };
  }

  revalidateMotivoPerdaRoutes();
  return { success: true, id: insertedId };
}

/**
 * Soft-delete (LEAD-04): nunca hard-delete de motivos de perda (npm run
 * guard:no-hard-delete cobre remoções destrutivas dessa tabela). Leads já
 * perdidos continuam apontando para o id removido de propósito — o FK
 * `onDelete: "restrict"` em `leads.motivoPerdaId` permanece intocado, e o
 * relatório de motivos de perda (plano 11-05) agrega pelo id, então o
 * histórico de leads perdidos com motivo removido segue contabilizado.
 */
export async function softDeleteMotivoPerda(
  motivoPerdaId: number
): Promise<ActionState> {
  if (!Number.isInteger(motivoPerdaId) || motivoPerdaId <= 0) {
    return { errors: { nome: ["Motivo de perda inválido."] } };
  }

  // isNull(deletedAt) no where torna a ação idempotente: remover duas vezes
  // é no-op, não sobrescreve o deletedAt original.
  await db
    .update(motivosPerda)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(motivosPerda.id, motivoPerdaId), isNull(motivosPerda.deletedAt)));

  revalidateMotivoPerdaRoutes();
  return { success: true, id: motivoPerdaId };
}

export async function renameMotivoPerda(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = motivoPerdaSchema.safeParse({ nome: formData.get("nome") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as { nome: string[] } };
  }
  const { nome } = parsed.data;

  if (!Number.isInteger(id) || id <= 0) {
    return { errors: { nome: ["Esse motivo já existe."] } };
  }

  const existing = await db
    .select()
    .from(motivosPerda)
    .where(sql`lower(trim(${motivosPerda.nome})) = lower(trim(${nome}))`);
  if (existing.length > 0 && existing.some((row) => row.id !== id)) {
    return { errors: { nome: ["Esse motivo já existe."] } };
  }

  try {
    await db.update(motivosPerda).set({ nome }).where(eq(motivosPerda.id, id));
  } catch {
    // rede de segurança: violação do uniqueIndex (race de duplo-clique)
    return { errors: { nome: ["Esse motivo já existe."] } };
  }

  revalidateMotivoPerdaRoutes();
  return { success: true, id };
}
