"use server";

/**
 * Convenção LEAD-04: nenhum código em src/ ou scripts/ pode fazer hard-delete
 * de leads/subnichos e nenhuma migração pode conter DELETE FROM/DROP TABLE —
 * exclusão é sempre soft-delete (deletedAt). Não aplicável diretamente aqui
 * (este arquivo só insere), mas mantido documentado por convenção do projeto.
 */

import { randomUUID } from "node:crypto";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { leads, subnichos } from "@/db/schema";
import { csvRowSchema, type CsvRowValues } from "@/lib/validations";

/**
 * Condição de lookup de sub-nicho reaproveitada em AMBOS os pontos abaixo
 * (Pitfall 6 do RESEARCH.md) — a mesma condição case-insensitive-trim usada
 * por createSubnicho (src/actions/subnicho-actions.ts), para que "o que será
 * criado" (prévia) nunca divirja de "o que foi criado" (confirmação).
 */
function subnichoLookupCondition(nomeTrimado: string) {
  return sql`lower(trim(${subnichos.nome})) = lower(trim(${nomeTrimado}))`;
}

export type PreviewSupportData = {
  duplicatePhones: string[];
  unknownSubnichoNames: string[];
};

export async function fetchPreviewSupportData(
  normalizedPhones: string[],
  subnichoNamesTrimmed: string[]
): Promise<PreviewSupportData> {
  const uniquePhones = Array.from(new Set(normalizedPhones));
  const uniqueSubnichoNames = Array.from(new Set(subnichoNamesTrimmed));

  let duplicatePhones: string[] = [];
  if (uniquePhones.length > 0) {
    // D-05/D-07 metade 2: só leads ATIVOS contam como duplicata.
    const rows = await db
      .select({ telefone: leads.telefone })
      .from(leads)
      .where(and(isNull(leads.deletedAt), inArray(leads.telefone, uniquePhones)));
    duplicatePhones = rows.map((r) => r.telefone);
  }

  const unknownSubnichoNames: string[] = [];
  for (const nome of uniqueSubnichoNames) {
    const existing = await db
      .select({ id: subnichos.id })
      .from(subnichos)
      .where(subnichoLookupCondition(nome));
    if (existing.length === 0) {
      unknownSubnichoNames.push(nome);
    }
  }

  return { duplicatePhones, unknownSubnichoNames };
}

export type ConfirmedImportRow = {
  nome: string;
  telefone: string;
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: string;
  notas: string;
  subnichoNome: string;
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
  for (const row of rows) {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      return { success: false, message: "Não foi possível importar os leads. Tente novamente." };
    }
    validatedRows.push(parsed.data);
  }

  const batchId = randomUUID();

  const insertedCount = db.transaction((tx) => {
    // Resolve/cria sub-nichos primeiro (D-09), mesma regra case-insensitive-
    // trim de createSubnicho. Map evita criar o mesmo sub-nicho duas vezes
    // no mesmo lote (T-02-03).
    const subnichoIdByNome = new Map<string, number>();
    for (const row of validatedRows) {
      const chave = row.subnichoNome.trim().toLowerCase();
      if (subnichoIdByNome.has(chave)) continue;

      const existing = tx
        .select({ id: subnichos.id })
        .from(subnichos)
        .where(subnichoLookupCondition(row.subnichoNome))
        .all()[0];

      if (existing) {
        subnichoIdByNome.set(chave, existing.id);
      } else {
        const [created] = tx
          .insert(subnichos)
          .values({ nome: row.subnichoNome.trim() })
          .returning()
          .all();
        subnichoIdByNome.set(chave, created.id);
      }
    }

    // Loop de insert linha-a-linha (Pitfall 3) — nunca um único
    // .values([...todasAsLinhas]), evita SQLITE_ERROR: too many SQL variables.
    let count = 0;
    for (const row of validatedRows) {
      const chave = row.subnichoNome.trim().toLowerCase();
      tx.insert(leads)
        .values({
          nome: row.nome,
          telefone: row.telefone,
          canal: row.canal,
          origem: row.origem,
          valorEstimado: row.valorEstimado,
          notas: row.notas,
          subnichoId: subnichoIdByNome.get(chave)!,
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
