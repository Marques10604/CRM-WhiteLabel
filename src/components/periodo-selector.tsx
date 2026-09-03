"use client";

import { useEffect, useState } from "react";
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
  "focus-visible:border-ring focus-visible:ring-ring/50";

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

  // Feedback imediato no picker: datas futuras ficam desabilitadas (IN-03). O
  // clamp server-side (D-06) continua sendo a barreira real; isto só evita a
  // classe de confusão de "escolhi 2027 e o relatório mostrou outra coisa".
  const hoje = new Date();

  // Fonte de verdade do modo custom: a decisão do SERVIDOR (`value === "custom"`,
  // só verdadeiro quando o intervalo foi validado) OU um gesto local ainda não
  // navegado (D-15: escolheu "Intervalo personalizado" mas ainda não preencheu
  // as 2 datas). Derivar em vez de espelhar em state evita o flash de "pickers
  // somem" em navegação soft (Voltar/Avançar entre 2 URLs de /relatorios), que
  // mantém o componente montado (CR-01).
  const emModoCustom = value === "custom" || customMode;

  // Ressincroniza os pickers e o gesto local sempre que a URL (props) muda —
  // navegação soft do Next: `router.push`, `<Link>`, botão Voltar/Avançar. Sem
  // isso os date pickers exibem datas velhas após a navegação (CR-01) e o modo
  // custom "gruda" mesmo quando o servidor fez fallback para 30d por intervalo
  // inválido (WR-04): `value` volta a "30d", `emModoCustom` acompanha e a faixa
  // de aviso fica coerente com o seletor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- falso-positivo conhecido do React Compiler: ressincronizar os pickers com as props da URL após navegação soft do Next é o caso legítimo de sincronizar estado React com um sistema externo (o router). Mesmo padrão aceito no projeto (STATE.md decisões 07-02 / 09-03 / 09-04).
    setCustomMode(value === "custom");
    setDataInicio(parseDataInicial(from));
    setDataFim(parseDataInicial(to));
  }, [value, from, to]);

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

  // Navega só quando as DUAS datas estão preenchidas. Usa o valor NOVO
  // diretamente — nunca faz fallback para o estado anterior: desmarcar um dia
  // no `<Calendar>` (clicar de novo no dia já marcado) dispara
  // `onSelect(undefined)`, e navegar com a data que o usuário acabou de limpar
  // deixava o picker vazio enquanto os relatórios seguiam no intervalo antigo
  // (WR-02). Se um dos campos ficar vazio, não navega — a URL antiga permanece.
  function handleInicioChange(date: Date | undefined) {
    setDataInicio(date);
    setInicioPopoverOpen(false);
    if (date && dataFim) {
      navegarCustom(date, dataFim);
    }
  }

  function handleFimChange(date: Date | undefined) {
    setDataFim(date);
    setFimPopoverOpen(false);
    if (dataInicio && date) {
      navegarCustom(dataInicio, date);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[14px] text-muted-foreground">Período:</span>
      <Select
        items={OPCOES.map((o) => ({ value: o.value, label: o.label }))}
        value={emModoCustom ? "custom" : value}
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

      {emModoCustom ? (
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
                  disabled={{ after: hoje }}
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
                  disabled={{ after: hoje }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      ) : null}
    </div>
  );
}
