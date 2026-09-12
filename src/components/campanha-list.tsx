"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampanhaEstadoBadge } from "@/components/campanha-estado-badge";
import { CampanhaFormDialog } from "@/components/campanha-form-dialog";
import { VereditoSugeridoChip, type VereditoDecisao } from "@/components/veredito-sugerido-chip";
import type { Campanha, Nicho } from "@/types";

type CampanhaListProps = {
  campanhas: Campanha[];
  nichos: Nicho[];
  /** Veredito sugerido pela IA por campanha (Fase 24, `getVereditoIAPorCampanha`) — objeto plano, não `Map` (D-01). */
  vereditoIAPorCampanha: Record<number, VereditoDecisao>;
};

/**
 * Listagem de campanhas de exploração de nicho (CAMPANHA-01/04, Fase 22) +
 * botão "Nova campanha" + estado vazio com texto e CTA (nunca silêncio, mesmo
 * idioma visual do estado vazio de `lead-table.tsx`).
 *
 * Cada campanha é um Link para `/campanhas/{id}` — a página de detalhe é a
 * âncora que as Fases 23 (diagnóstico) e 24 (veredito/painel) vão enriquecer.
 */
export function CampanhaList({ campanhas, nichos, vereditoIAPorCampanha }: CampanhaListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const nichoNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const nicho of nichos) map.set(nicho.id, nicho.nome);
    return map;
  }, [nichos]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nova campanha
        </Button>
      </div>

      {campanhas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <h2 className="text-[20px] leading-tight font-semibold">
            Nenhuma campanha criada ainda
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crie sua primeira campanha para organizar a exploração de um nicho.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Nova campanha
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {campanhas.map((campanha) => {
            const vereditoIA = vereditoIAPorCampanha[campanha.id];
            return (
              <li key={campanha.id}>
                <Link
                  href={`/campanhas/${campanha.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {(nichoNameById.get(campanha.nichoId) ?? "—") + " — " + campanha.oferta}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(campanha.janelaInicio, "dd/MM/yyyy")} até{" "}
                      {format(campanha.janelaFim, "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CampanhaEstadoBadge estado={campanha.estado} />
                    {vereditoIA ? (
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">IA</span>
                        <VereditoSugeridoChip decisao={vereditoIA} />
                      </span>
                    ) : null}
                    {campanha.vereditoFinal ? (
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Final</span>
                        <VereditoSugeridoChip decisao={campanha.vereditoFinal} />
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <CampanhaFormDialog open={dialogOpen} onOpenChange={setDialogOpen} nichos={nichos} />
    </div>
  );
}
