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
  | "nichoNome"
  | "canal"
  | "origem"
  | "valorEstimado"
  | "notas"
  | "interesse";

/** Valor = nome do header do CSV mapeado para esse campo; null = não mapeado. */
export type CsvColumnMapping = Record<CsvFieldKey, string | null>;

/** Nomes de header do CSV marcados como "coluna extra para notas" (D-01/D-02).
 * Vazio por padrão — nenhuma mudança de comportamento sem ação do admin (D-11). */
export type CsvExtraNotasColumns = string[];

/** Saída crua do Papa.parse({ header: true }). */
export type ParsedCsvRow = Record<string, string>;

export type MappedCsvRow = {
  rowIndex: number;
  nome: string;
  telefone: string;
  telefoneNormalizado: string | null;
  nichoNome: string;
  canal: "instagram" | "whatsapp";
  origem: string;
  valorEstimado: string;
  notas: string;
  /** Texto livre "serviço desejado" (LEAD-06). Truncado em 500 CODE POINTS em
   * `mapCsvRows` ANTES da validação (D-10) — célula gigante do CSV nunca
   * reprova a linha, o lead importa com o valor cortado. `""` quando a
   * coluna não foi mapeada ou está em branco (D-11: sem entrada em
   * CSV_DEFAULTS — vira NULL na Server Action). */
  interesse: string;
  /** `true` quando o valor bruto de `interesse` tinha mais de 500 code points
   * e `mapCsvRows` cortou (WR-01 da Fase 16). Sinal AUTORITATIVO de "foi
   * truncado" para o badge da prévia — a view nunca re-deriva isso de
   * `String.length` (falha com caracteres astrais e dá falso-positivo em
   * células de exatamente 500 chars). NÃO vai para o insert. */
  interesseTruncado: boolean;
};

/**
 * Valores concretos de default (decisão desta fase) usados SOMENTE quando a
 * coluna opcional correspondente não foi mapeada ou a célula está em
 * branco/todo-espaço após trim. `nome`/`telefone`/`nichoNome` NUNCA
 * recebem default (D-04: nome+telefone são obrigatórios; nichoNome em
 * branco é bloqueado por D-12, não preenchido silenciosamente).
 *
 * `origemTipo` é um caso à parte: é um default FIXO e permanente (Requirement
 * 2 do 08-SPEC.md), nunca vem de coluna do CSV e nunca é escolhido pelo admin
 * no wizard — não é um campo mapeável de coluna do arquivo. Desde a correção
 * WR-01 (code review da Fase 8), esta entrada é a FONTE ÚNICA real: o
 * `csvRowSchema` em `src/lib/validations.ts` importa `CSV_DEFAULTS` e usa
 * `.default(CSV_DEFAULTS.origemTipo)`, então mudar o valor aqui muda o
 * comportamento real do import — não existe mais um literal duplicado. O
 * ponto de APLICAÇÃO continua sendo o `.default()` do `csvRowSchema` (não
 * `mapCsvRows`), que preenche o valor quando a linha confirmada não traz
 * esse dado (o wizard nunca coleta essa escolha).
 */
export const CSV_DEFAULTS = {
  canal: "whatsapp",
  origem: "Importação CSV",
  notas: "Importado via CSV.",
  valorEstimado: "0",
  origemTipo: "outbound",
} as const;

/**
 * Concatena a coluna "Notas" mapeada 1-pra-1 (sem rótulo — D-10) com as
 * colunas extras marcadas (rótulo neutro = header exato, D-05), separadas por
 * quebra de linha simples (D-06), na ORDEM DO ARQUIVO CSV (`csvHeaderOrder`),
 * nunca na ordem em que o admin marcou os checkboxes (D-08). Célula vazia
 * numa coluna extra omite a linha inteira daquela coluna, nunca "header: "
 * vazio (D-07). Uma coluna já usada em QUALQUER campo fixo do mapping nunca é
 * concatenada de novo como extra (Pitfall 4). Retorna "" quando não há nada —
 * retorno válido e esperado; o fallback `CSV_DEFAULTS.notas` (D-11) é
 * responsabilidade de `mapCsvRows`, aplicado sobre o RESULTADO FINAL desta
 * função, nunca sobre o valor bruto da coluna "Notas" isolada (Pitfall 1).
 */
export function buildNotasText(
  row: ParsedCsvRow,
  mapping: CsvColumnMapping,
  extraColumns: CsvExtraNotasColumns,
  csvHeaderOrder: string[]
): string {
  const parts: string[] = [];

  // 1) Notas 1-pra-1 mapeada, sem rótulo (D-10) — vai primeiro.
  const notasHeader = mapping.notas;
  if (notasHeader !== null && notasHeader in row) {
    const value = (row[notasHeader] ?? "").trim();
    if (value !== "") parts.push(value);
  }

  // 2) Colunas extras, na ordem do CSV (D-08) — nunca na ordem de `extraColumns`.
  //    Exclui qualquer header já usado em algum campo fixo (Pitfall 4).
  const fixedHeaders = new Set(Object.values(mapping).filter((v): v is string => v !== null));
  const extraSet = new Set(extraColumns.filter((h) => !fixedHeaders.has(h)));
  for (const header of csvHeaderOrder) {
    if (!extraSet.has(header)) continue;
    const value = (row[header] ?? "").trim();
    if (value === "") continue; // D-07: omite a linha inteira, nunca "header: " vazio
    parts.push(`${header}: ${value}`); // D-05: rótulo neutro = header exato do CSV
  }

  return parts.join("\n"); // D-06: quebra de linha simples, sem separador final
}

export function mapCsvRows(
  rows: ParsedCsvRow[],
  mapping: CsvColumnMapping,
  extraNotasColumns: CsvExtraNotasColumns = []
): MappedCsvRow[] {
  // Fonte ÚNICA de ordem de colunas (Pitfall 3) — mesma derivação usada pelo
  // wizard para os headers (Object.keys(parsedRows[0] ?? {})), calculada aqui
  // a partir do próprio parâmetro `rows`, nunca recebida de fora.
  const csvHeaderOrder = Object.keys(rows[0] ?? {});

  function readMapped(row: ParsedCsvRow, field: CsvFieldKey): string {
    const header = mapping[field];
    if (header === null || !(header in row)) return "";
    return (row[header] ?? "").trim();
  }

  return rows.map((row, rowIndex) => {
    const nome = readMapped(row, "nome");
    const telefone = readMapped(row, "telefone");
    const nichoNome = readMapped(row, "nichoNome");

    const canal = (readMapped(row, "canal") || CSV_DEFAULTS.canal) as "instagram" | "whatsapp";
    const origem = readMapped(row, "origem") || CSV_DEFAULTS.origem;
    const concatenatedNotas = buildNotasText(row, mapping, extraNotasColumns, csvHeaderOrder);
    const notas = concatenatedNotas || CSV_DEFAULTS.notas; // fallback D-11 sobre o resultado FINAL
    const valorEstimado = readMapped(row, "valorEstimado") || CSV_DEFAULTS.valorEstimado;
    // D-10: trunca em 500 ANTES de qualquer validação — uma célula gigante do
    // CSV do cowork nunca reprova a linha, o lead importa com o interesse
    // cortado. Sem fallback de CSV_DEFAULTS (D-11): vazio/não-mapeado = "".
    // D-08 (16-01): corte por CODE POINT (Array.from) — nunca parte um par
    // surrogate / emoji na fronteira 499/500. A defesa em profundidade
    // server-side (`csvRowSchema`, CR-01 da Fase 16) valida o MESMO limite por
    // code point (`.refine(Array.from(v).length <= 500)`), então um valor
    // truncado aqui nunca reprova o lote — mesmo cheio de caracteres astrais.
    // WR-01 (16): `interesseTruncado` é calculado AQUI (quem realmente corta),
    // comparando o nº de code points antes/depois — nunca re-derivado na view.
    const interesseChars = Array.from(readMapped(row, "interesse"));
    const interesse = interesseChars.slice(0, 500).join("");
    const interesseTruncado = interesseChars.length > 500;

    return {
      rowIndex,
      nome,
      telefone,
      telefoneNormalizado: normalizePhone(telefone),
      nichoNome,
      canal,
      origem,
      valorEstimado,
      notas,
      interesse,
      interesseTruncado,
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
