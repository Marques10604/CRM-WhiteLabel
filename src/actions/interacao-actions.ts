"use server";

/**
 * Server Actions da timeline de interações (TIMELINE-01/02). Convenção
 * LEAD-04 estendida a `interacoes` na Fase 9: exclusão é sempre soft-delete
 * (deletedAt) — nunca hard-delete. Verificar com `npm run guard:no-hard-delete`.
 *
 * Assimetria deliberada (D-06/D-07): um evento automático de WhatsApp
 * (tipo != "nota_manual") é IMUTÁVEL — nunca editável, nunca soft-deletável.
 * Só uma "nota_manual" pode ser editada ou soft-deletada. Essa guarda vive no
 * WHERE das duas mutações abaixo, no servidor — nunca só na UI, porque toda
 * Server Action é um endpoint HTTP interno forjável via DevTools (T-09-01).
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { interacoes, leads } from "@/db/schema";
import { interacaoManualSchema, interacaoManualUpdateSchema } from "@/lib/validations";
import type { Interacao } from "@/types";

type InteracaoActionState = { success: true } | { errors: Record<string, string[] | undefined> };

function revalidateTimelineSurfaces(): void {
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
}

/**
 * Leitura cronológica da timeline de um lead (TIMELINE-01) — só linhas ativas
 * (deletedAt nulo), mais recentes primeiro. O segundo critério de ordenação
 * `desc(interacoes.id)` é obrigatório: `created_at` tem resolução de 1
 * segundo (`unixepoch()`), então dois eventos no mesmo segundo teriam ordem
 * indefinida sem o desempate por id.
 */
export async function getInteracoesByLead(leadId: number): Promise<Interacao[]> {
  if (!Number.isInteger(leadId) || leadId <= 0) {
    return [];
  }

  return db
    .select()
    .from(interacoes)
    .where(and(eq(interacoes.leadId, leadId), isNull(interacoes.deletedAt)))
    .orderBy(desc(interacoes.createdAt), desc(interacoes.id));
}

/**
 * Cria uma nota manual (TIMELINE-01). SELECT fresco de `leads` guardado por
 * isNull(deletedAt) confirma que o lead existe e está ativo antes do insert
 * (T-09-05) — backstop adicional à FK onDelete:"restrict" do schema.
 */
export async function createInteracaoManual(
  leadId: number,
  texto: string
): Promise<InteracaoActionState> {
  const parsed = interacaoManualSchema.safeParse({ leadId, texto });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt)));
  if (!lead) {
    return { errors: { leadId: ["Lead inválido."] } };
  }

  await db.insert(interacoes).values({
    leadId: parsed.data.leadId,
    tipo: "nota_manual",
    texto: parsed.data.texto,
  });

  revalidateTimelineSurfaces();
  return { success: true };
}

/**
 * Edita uma nota manual (TIMELINE-02). `eq(interacoes.tipo, "nota_manual")`
 * é obrigatório e load-bearing (T-09-01): sem ela, uma chamada direta com o
 * id de um evento de WhatsApp (replay via DevTools) reescreveria um registro
 * imutável. Nenhuma linha afetada é no-op silencioso — devolve
 * `{ success: true }`, mesmo idioma idempotente de softDeleteLead/restoreLead.
 */
export async function updateInteracaoManual(
  id: number,
  texto: string
): Promise<InteracaoActionState> {
  const parsed = interacaoManualUpdateSchema.safeParse({ id, texto });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(interacoes)
    .set({ texto: parsed.data.texto, updatedAt: new Date() })
    .where(
      and(
        eq(interacoes.id, parsed.data.id),
        eq(interacoes.tipo, "nota_manual"),
        isNull(interacoes.deletedAt)
      )
    );

  revalidateTimelineSurfaces();
  return { success: true };
}

/**
 * Soft-delete de nota manual (TIMELINE-02, LEAD-04 estendida). NUNCA um hard
 * delete direto na tabela — a guarda `guard:no-hard-delete` reprova. Mesma
 * tripla de cláusulas de `updateInteracaoManual`: eventos de WhatsApp nunca
 * são afetados, mesmo com id forjado.
 */
export async function softDeleteInteracaoManual(id: number): Promise<InteracaoActionState> {
  await db
    .update(interacoes)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(eq(interacoes.id, id), eq(interacoes.tipo, "nota_manual"), isNull(interacoes.deletedAt)));

  revalidateTimelineSurfaces();
  return { success: true };
}
