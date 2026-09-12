import { Flame, Snowflake, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Temperatura } from "@/lib/lead-temperatura";

/**
 * Fonte única de verdade VISUAL das 3 faixas de temperatura de lead (quick
 * task 260912-omq) — consumida IGUALMENTE por `/leads` e `/pipeline`. A
 * classificação em si (quem é quente/morno/frio) mora em
 * `@/lib/lead-temperatura`; este arquivo só pinta.
 *
 * Mesmo idioma de `STAGE_LABEL` + `STAGE_TOKEN` de `etapa-badge.tsx`: rótulo
 * e cor separados de propósito.
 */

const TEMPERATURA_LABEL: Record<Temperatura, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

/** Somente tokens `--status-*` — zero hex, zero escala Tailwind nomeada (`npm run verify:brand` reprova qualquer outra cor). */
const TEMPERATURA_TOKEN: Record<Temperatura, string> = {
  quente: "text-status-success-foreground",
  morno: "text-status-warning-foreground",
  frio: "text-status-danger-foreground",
};

const TEMPERATURA_ICON: Record<Temperatura, typeof Flame> = {
  quente: Flame,
  morno: Thermometer,
  frio: Snowflake,
};

const TEMPERATURA_DESCRICAO: Record<Temperatura, string> = {
  quente: "Quente — pouco tempo parado nesta etapa",
  morno: "Morno — se aproximando do limite de dias da etapa",
  frio: "Frio — passou do limite de dias da etapa",
};

type TemperaturaIndicatorProps = {
  temperatura: Temperatura;
  /** Quando true, renderiza só o ícone (rótulo vira aria-label/title) — para colunas estreitas. */
  compact?: boolean;
};

export function TemperaturaIndicator({ temperatura, compact }: TemperaturaIndicatorProps) {
  const Icon = TEMPERATURA_ICON[temperatura];
  const titulo = TEMPERATURA_DESCRICAO[temperatura];

  if (compact) {
    return (
      <span
        className={cn("flex items-center gap-1", TEMPERATURA_TOKEN[temperatura])}
        aria-label={`Lead ${TEMPERATURA_LABEL[temperatura].toLowerCase()}`}
        title={titulo}
      >
        <Icon className="size-3.5 shrink-0" />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1", TEMPERATURA_TOKEN[temperatura])} title={titulo}>
      <Icon className="size-3.5 shrink-0" />
      <span className="text-[14px] leading-normal">{TEMPERATURA_LABEL[temperatura]}</span>
    </span>
  );
}
