import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types";

type Stage = Lead["stage"];

/**
 * Paleta fixa de etapa (D-09). "Fechado/Perdido" é tratado como um único
 * valor de estado terminal (schema Drizzle `stage` enum) — usa uma cor
 * neutra escura (slate) em vez de verde/vermelho, já que não há dado no
 * banco para diferenciar ganho de perda (ver nota de resolução UI-SPEC).
 */
const STAGE_CONFIG: Record<Stage, { label: string; bg: string; text: string }> = {
  novo: { label: "Novo", bg: "#F4F4F5", text: "#3F3F46" },
  contatado: { label: "Contatado", bg: "#DBEAFE", text: "#1D4ED8" },
  negociacao: { label: "Negociação", bg: "#FEF3C7", text: "#B45309" },
  fechado_perdido: { label: "Fechado/Perdido", bg: "#E2E8F0", text: "#1E293B" },
};

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
