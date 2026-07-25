"use client";

import { useMemo, useState, useTransition } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { DeleteLeadDialog } from "@/components/delete-lead-dialog";
import { LeadTableToolbar } from "@/components/lead-table-toolbar";
import {
  DEFAULT_SORTING,
  SortableColumnHeader,
  leadTableColumns,
  type LeadRow,
} from "@/components/lead-table-columns";
import { EtapaBadge } from "@/components/etapa-badge";
import { softDeleteLead } from "@/actions/lead-actions";
import type { Lead, Subnicho, Template } from "@/types";

/**
 * Iniciais do avatar circular da linha (sketch 002-C): até 2 primeiras
 * palavras do nome, primeira letra de cada, maiúsculas. "?" se vazio.
 */
function getInitials(nome: string): string {
  const initials = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "?";
}

/**
 * Larguras de coluna compartilhadas entre o cabeçalho manual e o corpo das
 * linhas (sketch 002-C) — evita desalinhamento entre as duas camadas de
 * markup, já que a lista não é mais renderizada via header groups do
 * TanStack Table (sketch 002-C, camada de renderização customizada).
 */
const COL = {
  nome: "flex-[2] min-w-0",
  subnicho: "flex-1 min-w-0",
  etapa: "flex-1 min-w-0",
  followup: "flex-1 min-w-0",
  telefone: "flex-1 min-w-0",
  acoes: "w-[210px] shrink-0 justify-end",
} as const;

const SORTABLE_HEADERS: { id: "nome" | "subnichoNome" | "stage" | "followUpDate"; label: string; className: string }[] = [
  { id: "nome", label: "Nome", className: COL.nome },
  { id: "subnichoNome", label: "Sub-nicho", className: COL.subnicho },
  { id: "stage", label: "Etapa", className: COL.etapa },
  { id: "followUpDate", label: "Follow-up", className: COL.followup },
];

type LeadTableProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  templates: Template[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

/** Estado do modal de confirmação de exclusão (D-05). */
type DeleteState = { open: false } | { open: true; lead: LeadRow };

/**
 * Tabela de leads ativos (D-06) — sort/filtro/paginação entram no plano
 * 01-03 (só `getCoreRowModel` nesta fase). Clicar numa linha reabre o mesmo
 * `<LeadFormDialog>` pré-preenchido (D-07). Estado vazio com CTA (D-13).
 */
export function LeadTable({ leads, subnichos, templates }: LeadTableProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [, startTransition] = useTransition();

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
    meta: {
      onEditLead: (lead) => setDialogState({ mode: "edit", lead }),
      onDeleteLead: (lead) => setDeleteState({ open: true, lead }),
    },
  });

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;

  function handleDeleteConfirm() {
    if (!deleteState.open) return;
    const { lead } = deleteState;
    startTransition(async () => {
      await softDeleteLead(lead.id);
      toast.success("Lead movido para a Lixeira.");
      setDeleteState({ open: false });
    });
  }

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

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="flex items-center gap-3.5 border-b bg-[#F4F4F5] px-4 py-3">
              {SORTABLE_HEADERS.map(({ id, label, className }) => {
                const column = table.getColumn(id);
                return (
                  <div key={id} className={className}>
                    {column ? <SortableColumnHeader column={column} label={label} /> : null}
                  </div>
                );
              })}
              <span className={`${COL.telefone} text-[14px] leading-normal font-normal text-foreground`}>
                Telefone
              </span>
              <span className={`${COL.acoes} flex text-[14px] leading-normal font-normal text-foreground`}>
                Ações
              </span>
            </div>

            {table.getRowModel().rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[14px] text-muted-foreground">
                Nenhum lead encontrado com os filtros aplicados.
              </div>
            ) : (
              table.getRowModel().rows.map((row) => {
                const lead = row.original;
                return (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDialogState({ mode: "edit", lead })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDialogState({ mode: "edit", lead });
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3.5 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                  >
                    <div className={`flex items-center gap-2.5 ${COL.nome}`}>
                      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#0D9488]/10 text-[11px] font-bold text-[#0D9488]">
                        {getInitials(lead.nome)}
                      </div>
                      <span className="truncate text-[14px] font-semibold text-foreground">
                        {lead.nome}
                      </span>
                    </div>

                    <span className={`truncate text-[14px] text-muted-foreground ${COL.subnicho}`}>
                      {lead.subnichoNome}
                    </span>

                    <div className={COL.etapa}>
                      <EtapaBadge stage={lead.stage} />
                    </div>

                    <div
                      className={`flex items-center gap-1.5 text-[14px] text-muted-foreground ${COL.followup}`}
                    >
                      <Calendar className="size-3.5 shrink-0" />
                      {format(lead.followUpDate, "dd/MM/yyyy")}
                    </div>

                    <span className={`truncate text-[14px] text-muted-foreground ${COL.telefone}`}>
                      {lead.telefone}
                    </span>

                    <div
                      className={`flex items-center gap-1 ${COL.acoes}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Editar ${lead.nome}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDialogState({ mode: "edit", lead });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Excluir ${lead.nome}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteState({ open: true, lead });
                        }}
                      >
                        <Trash2 className="size-4 text-[#DC2626]" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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

      <DeleteLeadDialog
        open={deleteState.open}
        onOpenChange={(open) => {
          if (!open) setDeleteState({ open: false });
        }}
        leadNome={deleteState.open ? deleteState.lead.nome : ""}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
