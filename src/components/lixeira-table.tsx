"use client";

import { useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EtapaBadge } from "@/components/etapa-badge";
import { restoreLead } from "@/actions/lead-actions";
import type { Lead, Nicho } from "@/types";

type LixeiraTableProps = {
  leads: Lead[];
  nichos: Nicho[];
};

type LixeiraRow = Lead & { nichoNome: string };

/**
 * Tabela de leads excluídos (D-17) — variante somente-leitura da lead-table
 * ativa: colunas de leitura Nome/Nicho/Etapa/Follow-up/Telefone + uma
 * coluna extra "Excluído em" (deletedAt formatado). Diferenças
 * DELIBERADAS em relação à tabela ativa: (1) a ÚNICA ação é "Restaurar",
 * instantânea e sem confirmação (D-17 — restaurar é seguro/não-destrutivo);
 * (2) NÃO há edição/exclusão aqui e NÃO há row-click de edição — clicar numa
 * linha é no-op, coerente com `updateLead` já exigir `isNull(deletedAt)`
 * (01-02): um lead na lixeira não tem caminho de edição nem no client nem
 * na action.
 */
export function LixeiraTable({ leads, nichos }: LixeiraTableProps) {
  const [isPending, startTransition] = useTransition();
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const nichoNameById = useMemo(
    () => new Map(nichos.map((nicho) => [nicho.id, nicho.nome])),
    [nichos]
  );

  const data = useMemo<LixeiraRow[]>(
    () =>
      leads.map((lead) => ({
        ...lead,
        nichoNome: nichoNameById.get(lead.nichoId) ?? "—",
      })),
    [leads, nichoNameById]
  );

  function handleRestore(lead: LixeiraRow) {
    setRestoringId(lead.id);
    startTransition(async () => {
      await restoreLead(lead.id);
      toast.success("Lead restaurado com sucesso.");
      setRestoringId(null);
    });
  }

  const columns = useMemo<ColumnDef<LixeiraRow>[]>(
    () => [
      { accessorKey: "nome", header: "Nome" },
      { accessorKey: "nichoNome", header: "Nicho" },
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
      { accessorKey: "telefone", header: "Telefone" },
      {
        accessorKey: "deletedAt",
        header: "Excluído em",
        cell: ({ row }) =>
          row.original.deletedAt
            ? format(row.original.deletedAt, "dd/MM/yyyy HH:mm")
            : "—",
      },
      {
        id: "acoes",
        header: "Ações",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={`Restaurar ${row.original.nome}`}
            disabled={isPending && restoringId === row.original.id}
            onClick={() => handleRestore(row.original)}
          >
            <RotateCcw className="size-4 text-[#0D9488]" />
          </Button>
        ),
      },
    ],
    [isPending, restoringId]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (leads.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Nenhum lead na lixeira.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
