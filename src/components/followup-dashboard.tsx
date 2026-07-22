"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { EtapaBadge } from "@/components/etapa-badge";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import type { Lead, Subnicho } from "@/types";

type FollowupDashboardProps = {
  vencidos: Lead[];
  hoje: Lead[];
  proximos7Dias: Lead[];
  subnichos: Subnicho[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

type UrgencySection = {
  key: string;
  label: string;
  leads: Lead[];
  headerBg: string;
  headerText: string;
  dateClassName: string;
};

/**
 * Dashboard de follow-ups (REMIND-01, D-01/D-02/D-03) — 3 seções por
 * urgência (Vencidos → Hoje → Próximos 7 dias), seção vazia é omitida
 * (D-02/copywriting). Clicar num item reabre `LeadFormDialog` em modo
 * edição (D-05); "Novo lead" abre o mesmo diálogo em modo criação local,
 * sem navegar para `/leads` (D-03) — esta superfície de criação é
 * reutilizada pelo auto-gatilho WA-04 do 04-04.
 */
export function FollowupDashboard({
  vencidos,
  hoje,
  proximos7Dias,
  subnichos,
}: FollowupDashboardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  const totalCount = vencidos.length + hoje.length + proximos7Dias.length;

  const sections: UrgencySection[] = [
    {
      key: "vencidos",
      label: "Vencidos",
      leads: vencidos,
      headerBg: "#FEE2E2",
      headerText: "#B91C1C",
      dateClassName: "text-[#B91C1C]",
    },
    {
      key: "hoje",
      label: "Hoje",
      leads: hoje,
      headerBg: "#FEF3C7",
      headerText: "#B45309",
      dateClassName: "text-[#B45309]",
    },
    {
      key: "proximos7Dias",
      label: "Próximos 7 dias",
      leads: proximos7Dias,
      headerBg: "#F4F4F5",
      headerText: "#3F3F46",
      dateClassName: "text-muted-foreground",
    },
  ];

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          onClick={() => setDialogState({ mode: "create" })}
        >
          Novo lead
        </Button>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <h2 className="text-[20px] leading-tight font-semibold">Tudo em dia!</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nenhum follow-up pendente.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/leads" className={buttonVariants({ variant: "outline" })}>
              Ver todos os leads
            </Link>
            <Button
              className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
              onClick={() => setDialogState({ mode: "create" })}
            >
              Novo lead
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections
            .filter((section) => section.leads.length > 0)
            .map((section) => (
              <div
                key={section.key}
                className="flex flex-col gap-2 rounded-lg bg-[#F4F4F5] p-2"
              >
                <div
                  className="flex items-baseline gap-2 rounded-md px-2 py-2"
                  style={{ backgroundColor: section.headerBg }}
                >
                  <h2
                    className="text-[20px] leading-tight font-semibold"
                    style={{ color: section.headerText }}
                  >
                    {section.label}
                  </h2>
                  <span
                    className="text-[14px] leading-normal"
                    style={{ color: section.headerText }}
                  >
                    · {section.leads.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 px-1 pb-1">
                  {section.leads.map((lead) => (
                    <div
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDialogState({ mode: "edit", lead })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDialogState({ mode: "edit", lead });
                        }
                      }}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[16px] leading-normal font-normal text-foreground">
                          {lead.nome}
                        </span>
                        <div className="flex items-center gap-2 text-[14px] leading-normal">
                          <span className="text-muted-foreground">
                            {subnichoNameById.get(lead.subnichoId) ?? "—"}
                          </span>
                          <span className={section.dateClassName}>
                            {format(lead.followUpDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                      <EtapaBadge stage={lead.stage} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <LeadFormDialog
        key={dialogState.mode === "edit" ? `edit-${dialogState.lead.id}` : "create"}
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        subnichos={subnichos}
        lead={dialogLead}
      />
    </div>
  );
}
