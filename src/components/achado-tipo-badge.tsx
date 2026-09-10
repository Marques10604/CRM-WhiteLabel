import { Hash, Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Diagnostico } from "@/lib/ai/diagnostico-schema";

export type AchadoTipo = Diagnostico["achados"][number]["tipo"];

/**
 * Tipo de um achado do diagnóstico por escala semântica `--status-*` (D-08 /
 * Fase 19) — a cor NÃO deriva da marca. Mesmo idioma de
 * `campanha-estado-badge.tsx`: rótulo, cor e ícone moram em mapas separados
 * (`TIPO_LABEL` / `TIPO_TOKEN` / `TIPO_ICON`) para não acoplar a lista de
 * tipos às classes utilitárias.
 *
 * DIAGNOSTICO-07 (modo de falha crítico #4): um `dado_quantificavel` e uma
 * `alegacao_marketing` NUNCA podem ter o mesmo peso visual. A distinção é em
 * 3 eixos — cor (info × warning), ícone (Hash × Megaphone) e, no
 * `DiagnosticoResultado`, o tratamento do texto da afirmação (pleno × itálico
 * recuado). Este componente cobre os 2 primeiros eixos.
 */
const TIPO_LABEL: Record<AchadoTipo, string> = {
  dado_quantificavel: "Dado quantificável",
  alegacao_marketing: "Alegação de concorrente",
};

const TIPO_TOKEN: Record<AchadoTipo, string> = {
  dado_quantificavel: "bg-status-info text-status-info-foreground",
  alegacao_marketing: "bg-status-warning text-status-warning-foreground",
};

const TIPO_ICON: Record<AchadoTipo, typeof Hash> = {
  dado_quantificavel: Hash,
  alegacao_marketing: Megaphone,
};

export function AchadoTipoBadge({ tipo }: { tipo: AchadoTipo }) {
  const Icon = TIPO_ICON[tipo];
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent shrink-0 gap-1", TIPO_TOKEN[tipo])}
    >
      <Icon aria-hidden="true" />
      {TIPO_LABEL[tipo]}
    </Badge>
  );
}
