"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, X } from "lucide-react";
import { toast } from "sonner";
import type { Table } from "@tanstack/react-table";

import { buildLeadsCsv, leadsCsvFilename } from "@/lib/lead-csv-export";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_OPTIONS, type Stage } from "@/components/etapa-badge";
import { DEFAULT_SORTING, type FollowUpDateRange, type LeadRow } from "@/components/lead-table-columns";
import type { Nicho } from "@/types";

const ALL_VALUE = "__all__";

/**
 * Único código DOM da Fase 21 (D-21-01) — mora aqui, não no módulo puro
 * `lead-csv-export.ts`. Materializa o texto do CSV num arquivo e dispara o
 * download client-side, sem Server Action nem rota de API.
 */
function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Anel de foco na cor accent (UI-SPEC Color, linha 83) aplicado aos controles da toolbar. */
const ACCENT_FOCUS_RING =
  "focus-visible:border-ring focus-visible:ring-ring/50";

type LeadTableToolbarProps = {
  table: Table<LeadRow>;
  nichos: Nicho[];
};

/**
 * Toolbar fixa de filtros (D-11) — sempre visível acima da tabela, nunca
 * colapsável. Três controles single-select/range que chamam
 * `column.setFilterValue` diretamente na instância da `table` recebida por
 * prop de `lead-table.tsx`. Trocar qualquer filtro reseta a paginação para a
 * primeira página (`table.setPageIndex(0)`, must_have do plano 01-03).
 */
export function LeadTableToolbar({ table, nichos }: LeadTableToolbarProps) {
  const [nichoValue, setNichoValue] = useState<string>(ALL_VALUE);
  const [stageValue, setStageValue] = useState<string>(ALL_VALUE);
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);
  const [startPopoverOpen, setStartPopoverOpen] = useState(false);
  const [endPopoverOpen, setEndPopoverOpen] = useState(false);

  function handleNichoChange(value: string | null) {
    const nextValue = value ?? ALL_VALUE;
    setNichoValue(nextValue);
    table
      .getColumn("nichoNome")
      ?.setFilterValue(nextValue === ALL_VALUE ? undefined : Number(nextValue));
    table.setPageIndex(0);
  }

  function handleStageChange(value: string | null) {
    const nextValue = value ?? ALL_VALUE;
    setStageValue(nextValue);
    table.getColumn("stage")?.setFilterValue(nextValue === ALL_VALUE ? undefined : nextValue);
    table.setPageIndex(0);
  }

  function applyDateRange(start: Date | undefined, end: Date | undefined) {
    const filterValue: FollowUpDateRange | undefined = start || end ? [start, end] : undefined;
    table.getColumn("followUpDate")?.setFilterValue(filterValue);
    table.setPageIndex(0);
  }

  function handleRangeStartChange(date: Date | undefined) {
    setRangeStart(date);
    applyDateRange(date, rangeEnd);
    setStartPopoverOpen(false);
  }

  function handleRangeEndChange(date: Date | undefined) {
    setRangeEnd(date);
    applyDateRange(rangeStart, date);
    setEndPopoverOpen(false);
  }

  function handleExport() {
    // getSortedRowModel() é subconjunto de getFilteredRowModel() — reflete os 3
    // filtros da toolbar (nicho/etapa/follow-up) E a ordenação ativa (EXPORT-02).
    const rows = table.getSortedRowModel().rows.map((row) => row.original);
    downloadCsv(leadsCsvFilename(), buildLeadsCsv(rows));
    toast.success(
      rows.length === 1 ? "1 lead exportado." : `${rows.length} leads exportados.`
    );
  }

  function handleClearFilters() {
    table.resetColumnFilters();
    setNichoValue(ALL_VALUE);
    setStageValue(ALL_VALUE);
    setRangeStart(undefined);
    setRangeEnd(undefined);
    table.setSorting(DEFAULT_SORTING);
    table.setPageIndex(0);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] leading-normal text-muted-foreground">Nicho</span>
        <Select value={nichoValue} onValueChange={handleNichoChange}>
          <SelectTrigger className={ACCENT_FOCUS_RING}>
            <SelectValue placeholder="Todos os nichos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos os nichos</SelectItem>
            {nichos
              .filter((nicho) => nicho.deletedAt === null)
              .map((nicho) => (
                <SelectItem key={nicho.id} value={String(nicho.id)}>
                  {nicho.nome}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] leading-normal text-muted-foreground">Etapa</span>
        <Select value={stageValue} onValueChange={handleStageChange}>
          <SelectTrigger className={ACCENT_FOCUS_RING}>
            <SelectValue placeholder="Todas as etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas as etapas</SelectItem>
            {STAGE_OPTIONS.map((option: { value: Stage; label: string }) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] leading-normal text-muted-foreground">
          Follow-up (início)
        </span>
        <Popover open={startPopoverOpen} onOpenChange={setStartPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={`justify-start gap-1.5 font-normal ${ACCENT_FOCUS_RING}`}
              />
            }
          >
            <CalendarIcon className="size-3.5" />
            {rangeStart ? format(rangeStart, "dd/MM/yyyy") : "Selecionar"}
          </PopoverTrigger>
          <PopoverContent>
            <Calendar mode="single" selected={rangeStart} onSelect={handleRangeStartChange} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] leading-normal text-muted-foreground">Follow-up (fim)</span>
        <Popover open={endPopoverOpen} onOpenChange={setEndPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={`justify-start gap-1.5 font-normal ${ACCENT_FOCUS_RING}`}
              />
            }
          >
            <CalendarIcon className="size-3.5" />
            {rangeEnd ? format(rangeEnd, "dd/MM/yyyy") : "Selecionar"}
          </PopoverTrigger>
          <PopoverContent>
            <Calendar mode="single" selected={rangeEnd} onSelect={handleRangeEndChange} />
          </PopoverContent>
        </Popover>
      </div>

      <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
        <Download className="size-3.5" />
        Exportar CSV
      </Button>

      <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
        <X className="size-3.5" />
        Limpar filtros
      </Button>
    </div>
  );
}
