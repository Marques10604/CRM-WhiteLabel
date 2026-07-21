import type { Column, ColumnDef, SortingState } from "@tanstack/react-table";
import { format, endOfDay, startOfDay } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EtapaBadge } from "@/components/etapa-badge";
import type { Lead } from "@/types";

/** Lead com o nome do sub-nicho já resolvido (join client-side em lead-table.tsx). */
export type LeadRow = Lead & { subnichoNome: string };

/** Intervalo [início, fim] usado pelo filtro de follow-up (01-03, D-11). */
export type FollowUpDateRange = [Date | undefined, Date | undefined];

/**
 * Sort default (sem interação): follow-up mais próximo primeiro
 * (D-12/must_haves). Compartilhado entre `lead-table.tsx` (estado inicial) e
 * `lead-table-toolbar.tsx` (restaurado pelo botão "Limpar filtros").
 */
export const DEFAULT_SORTING: SortingState = [{ id: "followUpDate", desc: false }];

/**
 * Cabeçalho de coluna clicável que alterna a direção do sort (asc/desc) via
 * `column.getToggleSortingHandler()` — padrão recomendado do TanStack Table.
 */
function SortableColumnHeader<TData>({
  column,
  label,
}: {
  column: Column<TData, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1 text-[14px] leading-normal font-normal text-foreground select-none"
    >
      {label}
      <Icon className={sorted ? "size-3.5" : "size-3.5 text-muted-foreground"} />
    </button>
  );
}

/**
 * Colunas padrão D-06 (Nome, Sub-nicho, Etapa, Follow-up, Telefone) — valor,
 * canal, origem e notas ficam só no modal de edição, não na lista base.
 *
 * Sort (01-03): Nome, Sub-nicho, Etapa e Follow-up são ordenáveis pelo
 * cabeçalho; Telefone não participa do sort.
 *
 * Filtro (01-03, D-11): Sub-nicho filtra por `subnichoId` (comparação por id,
 * não por texto, para não depender de unicidade de nome exibido); Etapa
 * filtra por igualdade de `stage`; Follow-up usa `filterFn` de intervalo
 * inclusivo nas duas pontas, normalizando com `startOfDay`/`endOfDay`
 * (Pitfall 6 — evita bug de fuso na virada do dia). `followUpDate` é sempre
 * presente na Fase 1 (ver Nota de resolução em 01-03-PLAN.md).
 */
export const leadTableColumns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: "nome",
    header: ({ column }) => <SortableColumnHeader column={column} label="Nome" />,
    enableSorting: true,
  },
  {
    accessorKey: "subnichoNome",
    header: ({ column }) => <SortableColumnHeader column={column} label="Sub-nicho" />,
    enableSorting: true,
    filterFn: (row, _columnId, filterValue: number | undefined) => {
      if (filterValue === undefined) return true;
      return row.original.subnichoId === filterValue;
    },
  },
  {
    accessorKey: "stage",
    header: ({ column }) => <SortableColumnHeader column={column} label="Etapa" />,
    enableSorting: true,
    cell: ({ row }) => <EtapaBadge stage={row.original.stage} />,
    filterFn: (row, columnId, filterValue: string | undefined) => {
      if (!filterValue) return true;
      return row.getValue(columnId) === filterValue;
    },
  },
  {
    accessorKey: "followUpDate",
    header: ({ column }) => <SortableColumnHeader column={column} label="Follow-up" />,
    enableSorting: true,
    sortUndefined: "last", // defensivo/forward-looking (Fase 2/CSV) — todo lead tem data na Fase 1
    cell: ({ row }) => format(row.original.followUpDate, "dd/MM/yyyy"),
    filterFn: (row, columnId, filterValue: FollowUpDateRange | undefined) => {
      const [start, end] = filterValue ?? [undefined, undefined];
      if (!start && !end) return true;

      const value = row.getValue<Date>(columnId);
      const passesStart = !start || value.getTime() >= startOfDay(start).getTime();
      const passesEnd = !end || value.getTime() <= endOfDay(end).getTime();
      return passesStart && passesEnd;
    },
  },
  {
    accessorKey: "telefone",
    header: "Telefone",
    enableSorting: false,
  },
];
