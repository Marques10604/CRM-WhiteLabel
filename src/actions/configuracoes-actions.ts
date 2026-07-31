"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { configuracoes } from "@/db/schema";
import { configuracoesSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Escreve a linha singleton `configuracoes` (CONFIG-01/CONFIG-02, T-07-01,
 * T-07-02). `configuracoesSchema.safeParse` é a validação AUTORITATIVA de
 * D-03 (mínimo 1 dia por etapa) — o `min={1}` do input HTML da UI (07-02) é
 * só UX antecipada e nunca substitui esta checagem.
 *
 * A escrita é um UPSERT (`insert` + `onConflictDoUpdate`), nunca um UPDATE
 * simples filtrado por id=1: se esta action for chamada antes de qualquer
 * `getConfiguracoes()` (linha singleton ainda não semeada), um UPDATE
 * afetaria 0 linhas e mesmo assim retornaria `{ success: true }` — o admin
 * veria "salvo" sem nada persistido. O upsert elimina essa dependência de
 * ordem entre leitura (semeadura) e escrita.
 *
 * `id: 1` é literal no código (singleton fixo), nunca vem do FormData.
 */
export async function saveConfiguracoes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = configuracoesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .insert(configuracoes)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: configuracoes.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/configuracoes");
  revalidatePath("/pipeline");
  return { success: true };
}
