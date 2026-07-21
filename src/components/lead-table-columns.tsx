import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { EtapaBadge } from "@/components/etapa-badge";
import type { Lead } from "@/types";

/** Lead com o nome do sub-nicho já resolvido (join client-side em lead-table.tsx). */
export type LeadRow = Lead & { subnichoNome: string };

/**
 * Colunas padrão D-06 (Nome, Sub-nicho, Etapa, Follow-up, Telefone) — valor,
 * canal, origem e notas ficam só no modal de edição, não na lista base.
 */
export const leadTableColumns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "subnichoNome",
    header: "Sub-nicho",
  },
  {
    accessorKey: "stage",
    header: "Etapa",
    cell: ({ row }) => <EtapaBadge stage={row.original.stage} />,
  },
  {
    accessorKey: "followUpDate",
    header: "Follow-up",
    cell: ({ row }) => format(row.original.followUpDate, "dd/MM/yyyy"),
  },
  {
    accessorKey: "telefone",
    header: "Telefone",
  },
];
