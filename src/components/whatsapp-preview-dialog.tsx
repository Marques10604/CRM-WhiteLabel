"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/phone";
import { buildWaLink, renderTemplate } from "@/lib/whatsapp";
import type { Lead, Template } from "@/types";

type WhatsAppPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | undefined;
  subnichoNome: string;
  templates: Template[];
  defaultTipo: Template["tipo"];
  /** Subtítulo customizável (ex: auto-gatilho de 1º contato, D-19). Fallback: "Mensagem para {nome}". */
  subtitulo?: string;
};

const TIPO_OPTIONS = [
  { value: "primeiro_contato", label: "1º contato" },
  { value: "follow_up", label: "Follow-up" },
  { value: "prova_valor", label: "Prova de valor" },
] as const;

/** Template usado ao (re)computar o texto: o `isDefault` do tipo, senão o primeiro daquele tipo. */
function pickTemplate(templates: Template[], tipo: Template["tipo"]): Template | undefined {
  const ofType = templates.filter((template) => template.tipo === tipo);
  return ofType.find((template) => template.isDefault) ?? ofType[0];
}

/**
 * Modal de preview editável de mensagem WhatsApp (D-15, WA-03) — compartilhado
 * entre o dashboard (`defaultTipo="follow_up"`) e o pipeline
 * (`defaultTipo="primeiro_contato"`). CRÍTICO (Pitfall 4, RESEARCH.md): o
 * `href` de "Abrir WhatsApp" é recomputado a cada render a partir do valor
 * VIVO de `texto` (state da textarea), nunca memoizado do texto original —
 * edições do admin sempre chegam ao link antes de abrir o WhatsApp.
 */
export function WhatsAppPreviewDialog({
  open,
  onOpenChange,
  lead,
  subnichoNome,
  templates,
  defaultTipo,
  subtitulo,
}: WhatsAppPreviewDialogProps) {
  const [tipo, setTipo] = useState<Template["tipo"]>(defaultTipo);
  const [texto, setTexto] = useState("");

  // Reinicializa tipo/texto sempre que o modal abre para um lead novo —
  // um único WhatsAppPreviewDialog é reutilizado (controlado por
  // PreviewState), não remontado por item, então o reset precisa ser
  // explícito aqui em vez de depender de useState(initialValue).
  useEffect(() => {
    if (!open || !lead) return;
    const template = pickTemplate(templates, defaultTipo);
    setTipo(defaultTipo);
    setTexto(
      renderTemplate(template?.corpo ?? "", {
        nome: lead.nome,
        subnicho: subnichoNome,
        origem: lead.origem,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  function handleTipoChange(nextTipo: Template["tipo"]) {
    setTipo(nextTipo);
    if (!lead) return;
    const template = pickTemplate(templates, nextTipo);
    setTexto(
      renderTemplate(template?.corpo ?? "", {
        nome: lead.nome,
        subnicho: subnichoNome,
        origem: lead.origem,
      })
    );
  }

  if (!lead) return null;

  const tel = normalizePhone(lead.telefone);
  const waHref = tel ? buildWaLink(tel, texto) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pré-visualizar mensagem</DialogTitle>
          <DialogDescription>{subtitulo ?? `Mensagem para ${lead.nome}`}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="whatsapp-tipo">Tipo de mensagem</FieldLabel>
            <FieldContent>
              <Select
                items={TIPO_OPTIONS as unknown as { value: string; label: string }[]}
                value={tipo}
                onValueChange={(value) => handleTipoChange(value as Template["tipo"])}
              >
                <SelectTrigger id="whatsapp-tipo" className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="whatsapp-texto">Mensagem</FieldLabel>
            <FieldContent>
              <Textarea
                id="whatsapp-texto"
                className="min-h-32"
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
              />
            </FieldContent>
          </Field>

          {!tel ? (
            <p className="text-sm text-[#B91C1C]">Telefone inválido — edite o lead.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpenChange(false)}
              className={cn(
                buttonVariants(),
                "gap-1.5 bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
              )}
            >
              <MessageCircle />
              Abrir WhatsApp
            </a>
          ) : (
            <Button type="button" disabled className="gap-1.5 bg-[#0D9488] text-white">
              <MessageCircle />
              Abrir WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
