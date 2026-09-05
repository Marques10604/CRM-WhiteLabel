import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Campanha } from "@/types";

export type CampanhaEstado = Campanha["estado"];

/**
 * Estado da campanha de exploração de nicho (CAMPANHA-02, Fase 22) por escala
 * semântica `--status-*` (D-08 / Fase 19) — a cor NÃO deriva da marca. Mesmo
 * idioma de `etapa-badge.tsx`: rótulo e cor moram em mapas separados
 * (`ESTADO_LABEL` / `ESTADO_TOKEN`) para não acoplar a lista de estados à
 * classe utilitária de cor.
 *
 * `estado` nasce sempre `"explorando"`; a transição para os outros 3 valores
 * é escopo da Fase 24 (VEREDITO) — este componente só exibe.
 */
const ESTADO_LABEL: Record<CampanhaEstado, string> = {
  explorando: "Explorando",
  veredito_registrado: "Veredito registrado",
  em_escala: "Em escala",
  abandonada: "Abandonada",
};

const ESTADO_TOKEN: Record<CampanhaEstado, string> = {
  explorando: "bg-status-info text-status-info-foreground",
  veredito_registrado: "bg-status-warning text-status-warning-foreground",
  em_escala: "bg-status-success text-status-success-foreground",
  abandonada: "bg-status-danger text-status-danger-foreground",
};

export function CampanhaEstadoBadge({ estado }: { estado: CampanhaEstado }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent shrink-0", ESTADO_TOKEN[estado])}
    >
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}
