"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EtapaBadge } from "@/components/etapa-badge";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { TarefaCard } from "@/components/tarefa-card";
import { TarefaFormDialog } from "@/components/tarefa-form-dialog";
import { WhatsAppSendButton } from "@/components/whatsapp-send-button";
import { WhatsAppPreviewDialog } from "@/components/whatsapp-preview-dialog";
import { normalizePhone } from "@/lib/phone";
import type { DashboardItem } from "@/db/queries";
import type { Lead, MotivoPerda, Nicho, Tarefa, Template } from "@/types";

type FollowupDashboardProps = {
  vencidos: DashboardItem[];
  hoje: DashboardItem[];
  proximos7Dias: DashboardItem[];
  nichos: Nicho[];
  motivosPerda: MotivoPerda[];
  templates: Template[];
  sugestaoPorLead: { leadId: number; data: Date }[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; lead: Lead };

type TarefaDialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; tarefa: Tarefa };

type PreviewState =
  | { open: false }
  | { open: true; lead: Lead; nichoNome: string };

type UrgencySection = {
  key: string;
  label: string;
  items: DashboardItem[];
  headerBg: string;
  headerText: string;
  dateClassName: string;
};

/**
 * Dashboard de follow-ups (REMIND-01 / TAREFA-02, D-01..D-08) — 3 seções por
 * urgência (Vencidos → Hoje → Próximos 7 dias), seção vazia é omitida
 * (D-02/copywriting). Cada seção intercala follow-ups de lead e tarefas
 * soltas pendentes ordenados por data (D-04) — a ordem já vem pronta de
 * `buildDashboardItems` no servidor, nunca reordenada aqui. Clicar num item
 * reabre o dialog de edição (`LeadFormDialog` ou `TarefaFormDialog`); "Novo
 * lead" / "Nova tarefa" abrem os mesmos dialogs em modo criação local.
 */
export function FollowupDashboard({
  vencidos,
  hoje,
  proximos7Dias,
  nichos,
  motivosPerda,
  templates,
  sugestaoPorLead,
}: FollowupDashboardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [tarefaDialogState, setTarefaDialogState] = useState<TarefaDialogState>({
    mode: "closed",
  });
  const [previewState, setPreviewState] = useState<PreviewState>({ open: false });

  const nichoNameById = useMemo(
    () => new Map(nichos.map((nicho) => [nicho.id, nicho.nome])),
    [nichos]
  );

  const sugestaoPorLeadId = useMemo(
    () => new Map(sugestaoPorLead.map((s) => [s.leadId, s.data])),
    [sugestaoPorLead]
  );

  const firstContactTemplate = useMemo(
    () => templates.find((template) => template.tipo === "primeiro_contato" && template.isDefault),
    [templates]
  );

  const totalCount = vencidos.length + hoje.length + proximos7Dias.length;

  const sections: UrgencySection[] = [
    {
      key: "vencidos",
      label: "Vencidos",
      items: vencidos,
      headerBg: "#FEE2E2",
      headerText: "#B91C1C",
      dateClassName: "text-[#B91C1C]",
    },
    {
      key: "hoje",
      label: "Hoje",
      items: hoje,
      headerBg: "#FEF3C7",
      headerText: "#B45309",
      dateClassName: "text-[#B45309]",
    },
    {
      key: "proximos7Dias",
      label: "Próximos 7 dias",
      items: proximos7Dias,
      headerBg: "#F4F4F5",
      headerText: "#3F3F46",
      dateClassName: "text-muted-foreground",
    },
  ];

  const dialogLead = dialogState.mode === "edit" ? dialogState.lead : undefined;
  const dialogTarefa =
    tarefaDialogState.mode === "edit" ? tarefaDialogState.tarefa : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          onClick={() => setDialogState({ mode: "create" })}
        >
          Novo lead
        </Button>
        <Button
          variant="outline"
          onClick={() => setTarefaDialogState({ mode: "create" })}
        >
          Nova tarefa
        </Button>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <h2 className="text-[20px] leading-tight font-semibold">Tudo em dia!</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nenhum follow-up ou tarefa pendente.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/leads" className={buttonVariants({ variant: "outline" })}>
              Ver todos os leads
            </Link>
            <Button
              variant="outline"
              onClick={() => setTarefaDialogState({ mode: "create" })}
            >
              Nova tarefa
            </Button>
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
            .filter((section) => section.items.length > 0)
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
                    · {section.items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 px-1 pb-1">
                  {section.items.map((item) => {
                    if (item.kind === "tarefa") {
                      return (
                        <TarefaCard
                          key={`tarefa-${item.tarefa.id}`}
                          tarefa={item.tarefa}
                          dateClassName={section.dateClassName}
                          onEdit={(tarefa) =>
                            setTarefaDialogState({ mode: "edit", tarefa })
                          }
                        />
                      );
                    }

                    const lead = item.lead;
                    const sugestao = sugestaoPorLeadId.get(lead.id);
                    return (
                    <div
                      key={`lead-${lead.id}`}
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
                            {nichoNameById.get(lead.nichoId) ?? "—"}
                          </span>
                          <span className={section.dateClassName}>
                            {format(lead.followUpDate, "dd/MM/yyyy")}
                          </span>
                          {sugestao ? (
                            <span
                              className="flex items-center gap-1 text-muted-foreground"
                              aria-label={`Próxima reabordagem sugerida em ${format(sugestao, "dd/MM/yyyy")}`}
                              title="Sugestão calculada a partir da última interação registrada. Não altera a data de follow-up real — o campo Follow-up continua sendo a fonte oficial."
                            >
                              <CalendarClock className="size-3.5" />
                              Sugestão: {format(sugestao, "dd/MM")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <EtapaBadge stage={lead.stage} />
                        {/* stopPropagation: o clique no botão não deve abrir a edição do item (D-05) */}
                        <div onClick={(event) => event.stopPropagation()}>
                          <WhatsAppSendButton
                            nome={lead.nome}
                            disabled={normalizePhone(lead.telefone) === null}
                            onClick={() =>
                              setPreviewState({
                                open: true,
                                lead,
                                nichoNome: nichoNameById.get(lead.nichoId) ?? "—",
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
        nichos={nichos}
        motivosPerda={motivosPerda}
        lead={dialogLead}
        templates={templates}
        firstContactTemplate={firstContactTemplate}
      />

      <TarefaFormDialog
        key={
          tarefaDialogState.mode === "edit"
            ? `tarefa-edit-${tarefaDialogState.tarefa.id}`
            : "tarefa-create"
        }
        open={tarefaDialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setTarefaDialogState({ mode: "closed" });
        }}
        tarefa={dialogTarefa}
      />

      <WhatsAppPreviewDialog
        open={previewState.open}
        onOpenChange={(open) => {
          if (!open) setPreviewState({ open: false });
        }}
        lead={previewState.open ? previewState.lead : undefined}
        nichoNome={previewState.open ? previewState.nichoNome : ""}
        templates={templates}
        defaultTipo="follow_up"
      />
    </div>
  );
}
