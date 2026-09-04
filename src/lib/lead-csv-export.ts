import Papa from "papaparse";
import { format } from "date-fns";

import type { LeadRow } from "@/components/lead-table-columns";

/**
 * Serialização PURA de `LeadRow[]` para o texto de um arquivo CSV que o admin
 * abre no Excel / Google Sheets pt-BR (Fase 21, EXPORT-01/02/03).
 *
 * Zero DOM, zero React — o trigger de download do arquivo mora em
 * `lead-table-toolbar.tsx`, não aqui, para este módulo ficar 100% testável
 * pelo harness `.cjs` (`scripts/test-lead-csv-export.cjs`).
 *
 * Decisões: colunas legíveis por humano (D-21-06), nicho e motivo de perda
 * como NOME (D-21-02), datas `dd/MM/yyyy`, valor estimado em reais com vírgula
 * decimal, BOM UTF-8 + delimitador `;` para o locale pt-BR (D-21-05), guard de
 * CSV/formula injection (D-21-04). `Papa.unparse` já faz o quoting RFC4180 de
 * aspas / `;` / quebra de linha sozinho.
 */

/** Colunas exportadas, nesta ordem (D-21-06). */
export const LEAD_CSV_COLUMNS = [
  "Nome",
  "Telefone",
  "Canal",
  "Nicho",
  "Etapa",
  "Follow-up",
  "Origem",
  "Tipo de origem",
  "Interesse",
  "Valor estimado",
  "Motivo de perda",
  "Tentativas de contato",
  "Notas",
  "Criado em",
] as const;

/** Espelho de STAGE_LABEL de `etapa-badge.tsx` — não importável aqui (.tsx quebra o harness .cjs). */
const STAGE_LABEL: Record<LeadRow["stage"], string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const CANAL_LABEL: Record<LeadRow["canal"], string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

const ORIGEM_TIPO_LABEL: Record<LeadRow["origemTipo"], string> = {
  inbound: "Inbound",
  outbound: "Outbound",
};

/**
 * Guard de CSV / formula injection (D-21-04, OWASP): prefixa `'` em qualquer
 * célula cujo 1º caractere seja `=` `+` `-` `@` TAB ou CR — o Excel/Sheets
 * trata `'` como marcador de texto (fica oculto na planilha, visível em editor
 * de texto puro). Parte dos dados (nome, notas, interesse) vem de CSV de um
 * parceiro, não só do admin.
 */
export function sanitizeCsvCell(value: string): string {
  if (!value) return value;
  return "=+-@\t\r".includes(value[0]) ? "'" + value : value;
}

/** Centavos -> "R$ 1234,56" (vírgula decimal, sem separador de milhar). */
function brl(centavos: number): string {
  return "R$ " + (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Mapeia um `LeadRow` para um registro de colunas legíveis. Todos os valores
 * string passam por `sanitizeCsvCell`. As chaves são exatamente
 * `LEAD_CSV_COLUMNS`, na mesma ordem.
 */
export function leadRowToCsvRecord(row: LeadRow): Record<string, string> {
  const record: Record<string, string> = {
    Nome: row.nome,
    Telefone: row.telefone,
    Canal: CANAL_LABEL[row.canal],
    Nicho: row.nichoNome,
    Etapa: STAGE_LABEL[row.stage],
    "Follow-up": format(row.followUpDate, "dd/MM/yyyy"),
    Origem: row.origem,
    "Tipo de origem": ORIGEM_TIPO_LABEL[row.origemTipo],
    Interesse: row.interesse ?? "",
    "Valor estimado": brl(row.valorEstimado),
    "Motivo de perda": row.motivoPerdaNome,
    "Tentativas de contato": String(row.contactAttempts),
    Notas: row.notas,
    "Criado em": format(row.createdAt, "dd/MM/yyyy"),
  };

  for (const key of Object.keys(record)) {
    record[key] = sanitizeCsvCell(record[key]);
  }

  return record;
}

/**
 * Texto completo do CSV: BOM UTF-8 + `Papa.unparse` com delimitador `;`
 * (D-21-05). Com `rows` vazio devolve BOM + só a linha de cabeçalho (D-21-03).
 */
export function buildLeadsCsv(rows: LeadRow[]): string {
  return (
    "\uFEFF" +
    Papa.unparse(
      { fields: [...LEAD_CSV_COLUMNS], data: rows.map(leadRowToCsvRecord) },
      { delimiter: ";" }
    )
  );
}

/** Nome do arquivo `leads-AAAA-MM-DD.csv` (D-21-07). */
export function leadsCsvFilename(now: Date = new Date()): string {
  return `leads-${format(now, "yyyy-MM-dd")}.csv`;
}
