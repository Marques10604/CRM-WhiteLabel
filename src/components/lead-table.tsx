"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";

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
import { LeadTableToolbar } from "@/components/lead-table-toolbar";
import { DEFAULT_SORTING, leadTableColumns, type LeadRow } from "@/components/lead-table-columns";
import type { Lead, Subnicho, Template } from "@/types";

type LeadTableProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  templates: Template[];
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
export function LeadTable({ leads, subnichos, templates }: LeadTableProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  const firstContactTemplate = useMemo(
    () => templates.find((template) => template.tipo === "primeiro_contato" && template.isDefault),
    [templates]
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
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } }, // D-12
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
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
        <>
          <LeadTableToolbar table={table} subnichos={subnichos} />

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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={leadTableColumns.length}
                    className="py-8 text-center text-[14px] text-muted-foreground"
                  >
                    Nenhum lead encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
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
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-[14px] leading-normal text-muted-foreground">
            <span>
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Próximo
              </Button>
            </div>
          </div>
        </>
      )}

      <LeadFormDialog
        key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        subnichos={subnichos}
        lead={dialogLead}
        templates={templates}
        firstContactTemplate={firstContactTemplate}
      />
    </div>
  );
}
