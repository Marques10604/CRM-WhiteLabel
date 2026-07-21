import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types";

export type Stage = Lead["stage"];

/**
 * Paleta fixa de etapa (D-09). A partir da Fase 3 (D-01/D-05), "Fechado" e
 * "Perdido" são duas etapas distintas do enum `stage` — verde para Fechado
 * (ganho) e vermelho para Perdido, consistentes com a paleta já usada aqui.
 */
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo: { label: "Novo", bg: "#F4F4F5", text: "#3F3F46" },
  contatado: { label: "Contatado", bg: "#DBEAFE", text: "#1D4ED8" },
  negociacao: { label: "Negociação", bg: "#FEF3C7", text: "#B45309" },
  fechado: { label: "Fechado", bg: "#DCFCE7", text: "#15803D" },
  perdido: { label: "Perdido", bg: "#FEE2E2", text: "#B91C1C" },
};

/** Lista de etapas + label, reaproveitada pelo filtro de etapa da toolbar (01-03, D-11). */
export const STAGE_OPTIONS: { value: Stage; label: string }[] = (
  Object.keys(STAGE_CONFIG) as Stage[]
).map((value) => ({ value, label: STAGE_CONFIG[value].label }));

export function EtapaBadge({ stage }: { stage: Stage }) {
  const config = STAGE_CONFIG[stage];

  return (
    <Badge
      variant="outline"
      className="border-transparent"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </Badge>
  );
}
