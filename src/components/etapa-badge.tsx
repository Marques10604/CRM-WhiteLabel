import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

export type Stage = Lead["stage"];

/**
 * Etapa do pipeline por escala semântica `--status-*` (D-08 / Fase 19) — a cor
 * NÃO deriva da marca. A partir da Fase 3 (D-01/D-05), "Fechado" e "Perdido"
 * são duas etapas distintas do enum `stage`: verde (success) para Fechado
 * (ganho) e vermelho (danger) para Perdido.
 *
 * Rótulo e cor moram em mapas separados para não acoplar o export
 * `STAGE_OPTIONS` (consumido pelo filtro de etapa da toolbar, 01-03/D-11) à
 * classe utilitária de cor.
 */
const STAGE_LABEL: Record<Stage, string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STAGE_TOKEN: Record<Stage, string> = {
  novo: "bg-status-neutral text-status-neutral-foreground",
  contatado: "bg-status-info text-status-info-foreground",
  negociacao: "bg-status-warning text-status-warning-foreground",
  fechado: "bg-status-success text-status-success-foreground",
  perdido: "bg-status-danger text-status-danger-foreground",
};

/** Lista de etapas + label, reaproveitada pelo filtro de etapa da toolbar (01-03, D-11). */
export const STAGE_OPTIONS: { value: Stage; label: string }[] = (
  Object.keys(STAGE_LABEL) as Stage[]
).map((value) => ({ value, label: STAGE_LABEL[value] }));

export function EtapaBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STAGE_TOKEN[stage])}>
      {STAGE_LABEL[stage]}
    </Badge>
  );
}
