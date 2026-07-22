"use client";

import { useState } from "react";
import type { Lead, Template } from "@/types";

type Target = { lead: Lead; subnichoNome: string };

/**
 * Hook compartilhado (D-18, WA-04) para abrir o preview de 1º contato após
 * criar um lead. Sem acoplamento a `LeadFormDialog` nem à importação CSV —
 * apenas estado reutilizável: qualquer superfície de criação pode chamar
 * `trigger(lead, subnichoNome)` e renderizar `WhatsAppPreviewDialog` com
 * `open`/`lead`/`subnichoNome` retornados aqui. A futura importação CSV
 * (Fase 2) poderá chamar o mesmo `trigger` por lead importado sem reescrita.
 */
export function useFirstContactTrigger(defaultTemplate: Template | undefined) {
  const [target, setTarget] = useState<Target | null>(null);

  return {
    open: target !== null,
    template: defaultTemplate,
    lead: target?.lead,
    subnichoNome: target?.subnichoNome,
    trigger: (lead: Lead, subnichoNome: string) => setTarget({ lead, subnichoNome }),
    close: () => setTarget(null),
  };
}
