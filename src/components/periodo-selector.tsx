"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

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

/**
 * Seletor de período da tela /relatorios (D-08/D-10 + D-13..D-17).
 *
 * DIVISÃO DE RESPONSABILIDADE: este componente é SÓ o gesto. Recebe `value`
 * já normalizado pela página (`src/app/relatorios/page.tsx`) e — no modo
 * "Intervalo personalizado" — `from`/`to` (strings `yyyy-MM-dd` já validadas
 * no servidor, só presentes quando o custom é válido). Traduz a escolha do
 * admin numa navegação por querystring (`?period=<preset>` ou
 * `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`).
 *
 * Ele agora gerencia o modo custom (mostrar/esconder os 2 date pickers) e as
 * 2 datas locais, MAS continua SEM resolver o range, SEM decidir o default de
 * primeiro acesso (`30d`, mora na página) e SEM decidir o fallback de valor
 * adulterado/inválido (`tudo` / `customInvalido`, mora no servidor, D-17). O
 * componente só navega.
 *
 * SEGURANÇA (T-14-07): `navegarCustom` só é invocado dentro dos event
 * handlers do `onSelect` do `<Calendar>` (`handleInicioChange` /
 * `handleFimChange`) e do `onValueChange` do `<Select>` — NUNCA num
 * `useEffect` nem no corpo do render. Re-render por mudança de `searchParams`
 * não re-dispara navegação, então não há risco de loop.
 */

/** Anel de foco na cor accent (11-UI-SPEC.md §Color linha 82) — mesmo literal de `lead-table-toolbar.tsx`. */
const ACCENT_FOCUS_RING =
  "focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50";

const OPCOES = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "tudo", label: "Tudo" },
  { value: "custom", label: "Intervalo personalizado" },
] as const;

/** `from`/`to` já vêm validados do servidor; a guarda é só defesa extra contra Invalid Date. */
function parseDataInicial(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const data = parseISO(iso);
  return isValid(data) ? data : undefined;
}

export function PeriodoSelector({
  value,
  from,
  to,
}: {
  value: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customMode, setCustomMode] = useState(value === "custom");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(() =>
    parseDataInicial(from),
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(() =>
    parseDataInicial(to),
  );
  const [inicioPopoverOpen, setInicioPopoverOpen] = useState(false);
  const [fimPopoverOpen, setFimPopoverOpen] = useState(false);

  /** Volta para um preset (30d/90d/tudo) — copia todos os params e REMOVE from/to (D-03). */
  function navegarPreset(next: string) {
    const params = new URLSearchParams(searchParams);
    params.set("period", next);
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  /** Navega para o intervalo custom — datas na URL sempre em ISO `yyyy-MM-dd` (D-02). */
  function navegarCustom(inicio: Date, fim: Date) {
    const params = new URLSearchParams(searchParams);
    params.set("period", "custom");
    params.set("from", format(inicio, "yyyy-MM-dd"));
    params.set("to", format(fim, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function handleSelectChange(next: string | null) {
    if (next == null) return;
    if (next === "custom") {
      // Só revela os 2 campos; navega apenas se as 2 datas já existirem (D-15).
      setCustomMode(true);
      if (dataInicio && dataFim) {
        navegarCustom(dataInicio, dataFim);
      }
      return;
    }
    setCustomMode(false);
    navegarPreset(next);
  }

  // Cuidado com o closure: computa o próximo valor dos DOIS locais e navega só
  // quando ambos estão preenchidos — mesmo idioma de `applyDateRange` em
  // `lead-table-toolbar.tsx`.
  function handleInicioChange(date: Date | undefined) {
    setDataInicio(date);
    setInicioPopoverOpen(false);
    const proxInicio = date ?? dataInicio;
    if (proxInicio && dataFim) {
      navegarCustom(proxInicio, dataFim);
    }
  }

  function handleFimChange(date: Date | undefined) {
    setDataFim(date);
    setFimPopoverOpen(false);
    const proxFim = date ?? dataFim;
    if (dataInicio && proxFim) {
      navegarCustom(dataInicio, proxFim);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[14px] text-muted-foreground">Período:</span>
      <Select
        items={OPCOES as unknown as { value: string; label: string }[]}
        value={customMode ? "custom" : value}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className={ACCENT_FOCUS_RING}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPCOES.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {customMode ? (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] text-muted-foreground">Início</span>
            <Popover open={inicioPopoverOpen} onOpenChange={setInicioPopoverOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={`justify-start gap-1.5 font-normal ${ACCENT_FOCUS_RING}`}
                  />
                }
              >
                <CalendarIcon className="size-3.5" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={handleInicioChange}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[14px] text-muted-foreground">Fim</span>
            <Popover open={fimPopoverOpen} onOpenChange={setFimPopoverOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={`justify-start gap-1.5 font-normal ${ACCENT_FOCUS_RING}`}
                  />
                }
              >
                <CalendarIcon className="size-3.5" />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={handleFimChange}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      ) : null}
    </div>
  );
}
