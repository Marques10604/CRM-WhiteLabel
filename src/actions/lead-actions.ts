"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { leadSchema, stageUpdateSchema } from "@/lib/validations";
import type { Lead } from "@/types";

type ActionState =
  | { success: true; lead?: Lead }
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

  let inserted: Lead;
  try {
    // Stampa stageChangedAt na criação (WR-01): sem isso, um lead criado
    // diretamente em "contatado" (o form permite escolher a etapa inicial)
    // ficaria com stageChangedAt nulo para sempre, nunca podendo ser
    // sinalizado como "esfriando" até que sua etapa mudasse e voltasse via
    // updateLead/updateLeadStage.
    [inserted] = await db
      .insert(leads)
      .values({ ...parsed.data, stageChangedAt: new Date() })
      .returning();
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
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { success: true, lead: inserted };
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

  // Guard isNull(deletedAt): impede editar um lead soft-deletado via
  // chamada direta — leads na Lixeira só podem ser restaurados (01-04).
  // SELECT-then-compare (mesmo padrão de updateLeadStage): só grava
  // stageChangedAt quando a etapa submetida pelo dropdown do formulário
  // realmente difere da etapa armazenada — preserva o relógio de
  // "esfriando" em edições que não mexem na etapa (PIPE-03, gap #2).
  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  try {
    await db
      .update(leads)
      .set({
        ...parsed.data,
        ...(stageChanged ? { stageChangedAt: new Date() } : {}),
      })
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
  } catch (err) {
    // Mesmo backstop de FK do createLead.
    if (isForeignKeyViolation(err)) {
      return { errors: { subnichoId: ["Selecione um sub-nicho."] } };
    }
    throw err;
  }

  revalidatePath("/");
  revalidatePath("/pipeline");
  return { success: true };
}

/**
 * Mudança de etapa via drag-and-drop no board (03-03, PIPE-02). Chamada
 * diretamente do onDragEnd (função de argumentos posicionais, NÃO
 * (_prevState, formData) — não é ligada a useActionState). Só grava
 * stageChangedAt quando a etapa realmente muda (Pitfall 3 do RESEARCH.md),
 * preservando o relógio de "esfriando" em edições que não mudam a etapa.
 */
export async function updateLeadStage(
  id: number,
  stage: Lead["stage"],
  motivoPerda?: string
): Promise<ActionState> {
  const parsed = stageUpdateSchema.safeParse({ id, stage, motivoPerda });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
  if (!current) {
    return { errors: { id: ["Lead inválido."] } };
  }

  const stageChanged = current.stage !== parsed.data.stage;

  await db
    .update(leads)
    .set({
      stage: parsed.data.stage,
      ...(parsed.data.motivoPerda !== undefined
        ? { motivoPerda: parsed.data.motivoPerda }
        : {}),
      ...(stageChanged ? { stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));

  revalidatePath("/pipeline");
  revalidatePath("/");
  return { success: true };
}
