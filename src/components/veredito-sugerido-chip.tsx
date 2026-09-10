import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Diagnostico } from "@/lib/ai/diagnostico-schema";

export type VereditoDecisao = Diagnostico["veredito_sugerido"]["decisao"];

/**
 * Chip da decisão sugerida pela IA por escala semântica `--status-*` (D-08 /
 * Fase 19) — a cor NÃO deriva da marca. Mesmo idioma de
 * `campanha-estado-badge.tsx`: rótulo e cor em mapas separados.
 *
 * DIAGNOSTICO-09: o veredito é SEMPRE uma sugestão não vinculante. O rótulo
 * "Sugestão da IA (não vinculante)" que envolve o chip é responsabilidade do
 * `DiagnosticoResultado`, não deste componente — aqui é só o `<Badge>`.
 */
const VEREDITO_LABEL: Record<VereditoDecisao, string> = {
  aprofundar: "Aprofundar",
  mudar_angulo: "Mudar o ângulo",
  abandonar: "Abandonar",
};

const VEREDITO_TOKEN: Record<VereditoDecisao, string> = {
  aprofundar: "bg-status-success text-status-success-foreground",
  mudar_angulo: "bg-status-warning text-status-warning-foreground",
  abandonar: "bg-status-danger text-status-danger-foreground",
};

export function VereditoSugeridoChip({
  decisao,
}: {
  decisao: VereditoDecisao;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent shrink-0", VEREDITO_TOKEN[decisao])}
    >
      {VEREDITO_LABEL[decisao]}
    </Badge>
  );
}
