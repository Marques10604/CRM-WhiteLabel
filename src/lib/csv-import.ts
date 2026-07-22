/**
 * Contrato de mapeamento/dedup de CSV do CRM (IMPORT-02 metade 1, D-04, D-06,
 * D-07 metade 1): tipos de coluna mapeável, defaults concretos para colunas
 * opcionais não mapeadas/em branco, e detecção de telefone duplicado DENTRO
 * do mesmo lote (a outra metade — duplicado contra o banco — vive em
 * src/actions/import-actions.ts). `telefone`/`valorEstimado` permanecem como
 * STRING crua do CSV (mesmo texto da célula); apenas `telefoneNormalizado` é
 * calculado aqui, só para flag/dedup client-side — nunca é o que se envia ao
 * servidor.
 */
import { normalizePhone } from "@/lib/phone";

export type CsvFieldKey =
  | "nome"
  | "telefone"
  | "subnichoNome"
  | "canal"
  | "origem"
  | "valorEstimado"
  | "notas";

/** Valor = nome do header do CSV mapeado para esse campo; null = não mapeado. */
export type CsvColumnMapping = Record<CsvFieldKey, string | null>;

/** Saída crua do Papa.parse({ header: true }). */
export type ParsedCsvRow = Record<string, string>;

export type MappedCsvRow = {
  rowIndex: number;
  nome: string;
  telefone: string;
  telefoneNormalizado: string | null;
  subnichoNome: string;
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: string;
  notas: string;
};

/**
 * Valores concretos de default (decisão desta fase) usados SOMENTE quando a
 * coluna opcional correspondente não foi mapeada ou a célula está em
 * branco/todo-espaço após trim. `nome`/`telefone`/`subnichoNome` NUNCA
 * recebem default (D-04: nome+telefone são obrigatórios; subnichoNome em
 * branco é bloqueado por D-12, não preenchido silenciosamente).
 */
export const CSV_DEFAULTS = {
  canal: "whatsapp",
  origem: "Importação CSV",
  notas: "Importado via CSV.",
  valorEstimado: "0",
} as const;

export function mapCsvRows(rows: ParsedCsvRow[], mapping: CsvColumnMapping): MappedCsvRow[] {
  function readMapped(row: ParsedCsvRow, field: CsvFieldKey): string {
    const header = mapping[field];
    if (header === null || !(header in row)) return "";
    return (row[header] ?? "").trim();
  }

  return rows.map((row, rowIndex) => {
    const nome = readMapped(row, "nome");
    const telefone = readMapped(row, "telefone");
    const subnichoNome = readMapped(row, "subnichoNome");

    const canal = (readMapped(row, "canal") || CSV_DEFAULTS.canal) as "instagram" | "whatsapp";
    const origem = readMapped(row, "origem") || CSV_DEFAULTS.origem;
    const notas = readMapped(row, "notas") || CSV_DEFAULTS.notas;
    const valorEstimado = readMapped(row, "valorEstimado") || CSV_DEFAULTS.valorEstimado;

    return {
      rowIndex,
      nome,
      telefone,
      telefoneNormalizado: normalizePhone(telefone),
      subnichoNome,
      canal,
      origem,
      valorEstimado,
      notas,
    };
  });
}

/**
 * Agrupa por telefoneNormalizado (ignora null) e devolve o conjunto de
 * rowIndex de TODAS as linhas que compartilham um telefoneNormalizado com
 * pelo menos outra linha do lote (D-07 metade 1) — normalizar ANTES de
 * comparar, nunca comparar a string crua (Pitfall 5 do RESEARCH.md).
 */
export function detectWithinBatchDuplicatePhones(rows: MappedCsvRow[]): Set<number> {
  const rowIndexesByPhone = new Map<string, number[]>();
  for (const row of rows) {
    if (row.telefoneNormalizado === null) continue;
    const existing = rowIndexesByPhone.get(row.telefoneNormalizado);
    if (existing) {
      existing.push(row.rowIndex);
    } else {
      rowIndexesByPhone.set(row.telefoneNormalizado, [row.rowIndex]);
    }
  }

  const duplicateRowIndexes = new Set<number>();
  for (const rowIndexes of rowIndexesByPhone.values()) {
    if (rowIndexes.length > 1) {
      for (const rowIndex of rowIndexes) duplicateRowIndexes.add(rowIndex);
    }
  }
  return duplicateRowIndexes;
}
