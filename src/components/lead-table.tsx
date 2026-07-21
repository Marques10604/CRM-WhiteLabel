"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { leadTableColumns, type LeadRow } from "@/components/lead-table-columns";
import type { Lead, Subnicho } from "@/types";

type LeadTableProps = {
  leads: Lead[];
  subnichos: Subnicho[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

/**
 * Tabela de leads ativos (D-06) — sort/filtro/paginação entram no plano
 * 01-03 (só `getCoreRowModel` nesta fase). Clicar numa linha reabre o mesmo
 * `<LeadFormDialog>` pré-preenchido (D-07). Estado vazio com CTA (D-13).
 */
export function LeadTable({ leads, subnichos }: LeadTableProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  const data = useMemo<LeadRow[]>(
    () =>
      leads.map((lead) => ({
        ...lead,
        subnichoNome: subnichoNameById.get(lead.subnichoId) ?? "—",
      })),
    [leads, subnichoNameById]
  );

  const table = useReactTable({
    data,
    columns: leadTableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          onClick={() => setDialogState({ mode: "create" })}
        >
          Novo lead
        </Button>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <h2 className="text-[20px] leading-tight font-semibold">
            Nenhum lead cadastrado ainda
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Comece adicionando seu primeiro lead para organizar seu funil de vendas.
          </p>
          <Button
            className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
            onClick={() => setDialogState({ mode: "create" })}
          >
            Novo lead
          </Button>
        </div>
      ) : (
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
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setDialogState({ mode: "edit", lead: row.original })}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LeadFormDialog
        key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        subnichos={subnichos}
        lead={dialogLead}
      />
    </div>
  );
}
