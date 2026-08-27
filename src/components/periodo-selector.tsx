"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Seletor de período da tela /relatorios (D-08/D-10).
 *
 * DIVISÃO DE RESPONSABILIDADE: este componente é SÓ o gesto. Recebe `value`
 * já normalizado pela página (`src/app/relatorios/page.tsx`) e traduz a
 * escolha do admin numa navegação por querystring (`?period=`). Ele NÃO
 * decide o default de primeiro acesso (`30d`, mora na página) nem o fallback
 * de valor adulterado (`tudo`, mora em `resolvePeriodRange` no servidor), e
 * nunca chama `resolvePeriodRange`. O gatilho só reflete o que a página
 * mandou.
 */

/** Anel de foco na cor accent (11-UI-SPEC.md §Color linha 82) — mesmo literal de `lead-table-toolbar.tsx`. */
const ACCENT_FOCUS_RING =
  "focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50";

const OPCOES = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "tudo", label: "Tudo" },
] as const;

export function PeriodoSelector({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(next: string | null) {
    if (next == null) return;
    // Copia TODOS os parâmetros existentes e sobrescreve só `period` — nunca
    // montar a URL por concatenação manual.
    const params = new URLSearchParams(searchParams);
    params.set("period", next);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[14px] text-muted-foreground">Período:</span>
      <Select value={value} onValueChange={handleChange}>
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
    </div>
  );
}
