"use client";

import { useMemo, useState } from "react";
import { WhatsAppSendButton } from "@/components/whatsapp-send-button";
import { WhatsAppPreviewDialog } from "@/components/whatsapp-preview-dialog";
import { normalizePhone } from "@/lib/phone";
import type { Lead, Subnicho, Template } from "@/types";

type PostImportLeadListProps = {
  leads: Lead[];
  subnichos: Subnicho[];
  templates: Template[];
};

type PreviewState = { open: false } | { open: true; lead: Lead; subnichoNome: string };

/**
 * Lista pós-importação (LEAD-05, D-13/D-14) — mesmo padrão `PreviewState`
 * de `followup-dashboard.tsx`, trocando só `defaultTipo` para
 * "primeiro_contato". Cada envio é um clique manual do admin; nenhum
 * auto-disparo em sequência para o lote (D-13).
 */
export function PostImportLeadList({ leads, subnichos, templates }: PostImportLeadListProps) {
  const [previewState, setPreviewState] = useState<PreviewState>({ open: false });

  const subnichoNameById = useMemo(
    () => new Map(subnichos.map((subnicho) => [subnicho.id, subnicho.nome])),
    [subnichos]
  );

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[16px] leading-normal font-normal text-foreground">{lead.nome}</span>
            <span className="text-sm text-muted-foreground">
              {subnichoNameById.get(lead.subnichoId) ?? "—"}
            </span>
          </div>
          <WhatsAppSendButton
            nome={lead.nome}
            disabled={normalizePhone(lead.telefone) === null}
            onClick={() =>
              setPreviewState({
                open: true,
                lead,
                subnichoNome: subnichoNameById.get(lead.subnichoId) ?? "—",
              })
            }
          />
        </div>
      ))}

      <WhatsAppPreviewDialog
        open={previewState.open}
        onOpenChange={(open) => {
          if (!open) setPreviewState({ open: false });
        }}
        lead={previewState.open ? previewState.lead : undefined}
        subnichoNome={previewState.open ? previewState.subnichoNome : ""}
        templates={templates}
        defaultTipo="primeiro_contato"
      />
    </div>
  );
}
