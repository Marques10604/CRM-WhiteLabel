"use server";

/**
 * Convenção LEAD-04: nenhum código em src/ ou scripts/ pode fazer hard-delete
 * de leads/nichos e nenhuma migração pode conter DELETE FROM/DROP TABLE —
 * exclusão é sempre soft-delete (deletedAt). Não aplicável diretamente aqui
 * (este arquivo só insere), mas mantido documentado por convenção do projeto.
 */

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, nichos } from "@/db/schema";
import { csvRowSchema, type CsvRowValues } from "@/lib/validations";

/**
 * Condição de lookup de nicho reaproveitada em AMBOS os pontos abaixo
 * (Pitfall 6 do RESEARCH.md) — a mesma condição case-insensitive-trim usada
 * por createNicho (src/actions/nicho-actions.ts), para que "o que será
 * criado" (prévia) nunca divirja de "o que foi criado" (confirmação).
 */
function nichoLookupCondition(nomeTrimado: string) {
  return sql`lower(trim(${nichos.nome})) = lower(trim(${nomeTrimado}))`;
}

export type PreviewSupportData = {
  duplicatePhones: string[];
  unknownNichoNames: string[];
};

export async function fetchPreviewSupportData(
  normalizedPhones: string[],
  nichoNamesTrimmed: string[]
): Promise<PreviewSupportData> {
  const uniquePhones = Array.from(new Set(normalizedPhones));
  const uniqueNichoNames = Array.from(new Set(nichoNamesTrimmed));

  let duplicatePhones: string[] = [];
  if (uniquePhones.length > 0) {
    // D-05/D-07 metade 2: só leads ATIVOS contam como duplicata.
    const rows = await db
      .select({ telefone: leads.telefone })
      .from(leads)
      .where(and(isNull(leads.deletedAt), inArray(leads.telefone, uniquePhones)));
    duplicatePhones = rows.map((r) => r.telefone);
  }

  const unknownNichoNames: string[] = [];
  for (const nome of uniqueNichoNames) {
    // Um nome que existe só como removido (deletedAt != null) NÃO entra em
    // unknownNichoNames: ele não será criado, e sim reativado em
    // bulkImportLeads abaixo — o comportamento atual (não listar) já cobre
    // isso, pois existing.length > 0 independente de deletedAt.
    const existing = await db
      .select({ id: nichos.id })
      .from(nichos)
      .where(nichoLookupCondition(nome));
    if (existing.length === 0) {
      unknownNichoNames.push(nome);
    }
  }

  return { duplicatePhones, unknownNichoNames };
}

export type ConfirmedImportRow = {
  nome: string;
  telefone: string;
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: string;
  notas: string;
  nichoNome: string;
};

export type BulkImportResult =
  | { success: true; batchId: string; count: number }
  | { success: false; message: string };

export async function bulkImportLeads(rows: ConfirmedImportRow[]): Promise<BulkImportResult> {
  if (rows.length === 0) {
    return { success: false, message: "Nenhuma linha para importar." };
  }

  // Defesa em profundidade (ASVS V5) — nunca confiar só na prévia
  // client-side, mesmo padrão de createLead. Se qualquer linha falhar,
  // aborta tudo (nenhum insert parcial).
  const validatedRows: CsvRowValues[] = [];
  for (const [index, row] of rows.entries()) {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const campo = firstIssue?.path?.[0] !== undefined ? String(firstIssue.path[0]) : "campo desconhecido";
      return {
        success: false,
        message: `Linha ${index + 1} (${row.nome || "sem nome"}): ${firstIssue?.message ?? "valor inválido"} [${campo}]`,
      };
    }
    validatedRows.push(parsed.data);
  }

  const batchId = randomUUID();

  const insertedCount = db.transaction((tx) => {
    // Resolve/cria nichos primeiro (D-09), mesma regra case-insensitive-
    // trim de createNicho. Map evita criar o mesmo nicho duas vezes
    // no mesmo lote (T-02-03).
    const nichoIdByNome = new Map<string, number>();
    for (const row of validatedRows) {
      const chave = row.nichoNome.trim().toLowerCase();
      if (nichoIdByNome.has(chave)) continue;

      const existing = tx
        .select({ id: nichos.id, deletedAt: nichos.deletedAt })
        .from(nichos)
        .where(nichoLookupCondition(row.nichoNome))
        .all()[0];

      if (existing) {
        // O nome vindo do CSV é sinal claro de que o nicho voltou a ser
        // usado — reativa em vez de deixar o lead preso a um nicho
        // invisível (removido) na lista de seleção.
        if (existing.deletedAt !== null) {
          tx.update(nichos).set({ deletedAt: null }).where(eq(nichos.id, existing.id)).run();
        }
        nichoIdByNome.set(chave, existing.id);
      } else {
        const [created] = tx
          .insert(nichos)
          .values({ nome: row.nichoNome.trim() })
          .returning()
          .all();
        nichoIdByNome.set(chave, created.id);
      }
    }

    // Loop de insert linha-a-linha (Pitfall 3) — nunca um único
    // .values([...todasAsLinhas]), evita SQLITE_ERROR: too many SQL variables.
    let count = 0;
    for (const row of validatedRows) {
      const chave = row.nichoNome.trim().toLowerCase();
      tx.insert(leads)
        .values({
          nome: row.nome,
          telefone: row.telefone,
          canal: row.canal,
          origem: row.origem,
          origemTipo: row.origemTipo,
          valorEstimado: row.valorEstimado,
          notas: row.notas,
          nichoId: nichoIdByNome.get(chave)!,
          stage: "novo",
          stageChangedAt: new Date(),
          followUpDate: new Date(),
          importBatchId: batchId,
        })
        .run();
      count += 1;
    }
    return count;
  });

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");

  return { success: true, batchId, count: insertedCount };
}
