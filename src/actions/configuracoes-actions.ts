"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { configuracoes } from "@/db/schema";
import { configuracoesServerSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

/**
 * Escreve a linha singleton `configuracoes` (CONFIG-01/CONFIG-02, SEQ-01,
 * T-07-01, T-07-02). `configuracoesServerSchema.safeParse` é a validação
 * AUTORITATIVA de D-03 (mínimo 1 dia por etapa) e de T-10-11 (array de
 * intervalos de reabordagem) — o `min={1}` do input HTML da UI (07-02) e a
 * checagem client de `sequenciaIntervalosSchema` (10-03) são só UX
 * antecipada e nunca substituem esta checagem.
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
  // SEQ-01/T-10-12: `Object.fromEntries(formData)` sozinho NÃO pode ler a
  // lista dinâmica de intervalos. `FormData` suporta nativamente várias
  // entradas com a mesma chave (`name="intervaloDias"` repetido em cada
  // linha do formulário), mas `Object.fromEntries` sobre esse iterável
  // mantém só o ÚLTIMO valor de cada chave repetida — salvar 3 intervalos
  // gravaria só o terceiro, silenciosamente e sem erro de validação. É
  // comportamento padrão de ECMAScript, não bug de biblioteca; as outras
  // Server Actions do projeto continuam usando o spread genérico porque
  // nenhuma delas tem campo repetido. `formData.getAll` é a única forma
  // correta de recuperar as N entradas.
  const raw = Object.fromEntries(formData);
  const intervalos = formData.getAll("intervaloDias");
  const parsed = configuracoesServerSchema.safeParse({
    ...raw,
    sequenciaIntervalosDias: intervalos,
  });
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
  // D-05: a data sugerida também aparece no dashboard de follow-ups e é
  // recalculada a partir dos intervalos — sem esta linha o dashboard
  // exibiria sugestões com a configuração antiga até revalidar por outro
  // caminho.
  revalidatePath("/");
  return { success: true };
}
