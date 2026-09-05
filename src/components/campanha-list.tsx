"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampanhaEstadoBadge } from "@/components/campanha-estado-badge";
import { CampanhaFormDialog } from "@/components/campanha-form-dialog";
import type { Campanha, Nicho } from "@/types";

type CampanhaListProps = {
  campanhas: Campanha[];
  nichos: Nicho[];
};

/**
 * Listagem de campanhas de exploração de nicho (CAMPANHA-01/04, Fase 22) +
 * botão "Nova campanha" + estado vazio com texto e CTA (nunca silêncio, mesmo
 * idioma visual do estado vazio de `lead-table.tsx`).
 *
 * Cada campanha é um Link para `/campanhas/{id}` — a página de detalhe é a
 * âncora que as Fases 23 (diagnóstico) e 24 (veredito/painel) vão enriquecer.
 */
export function CampanhaList({ campanhas, nichos }: CampanhaListProps) {
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
          {campanhas.map((campanha) => (
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
                <CampanhaEstadoBadge estado={campanha.estado} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CampanhaFormDialog open={dialogOpen} onOpenChange={setDialogOpen} nichos={nichos} />
    </div>
  );
}
