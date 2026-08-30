"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
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
import { registerWhatsAppContact } from "@/actions/lead-actions";
import type { Lead, Template } from "@/types";

type WhatsAppPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | undefined;
  nichoNome: string;
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
  nichoNome,
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
    /* Mesmo falso-positivo pré-existente já documentado no projeto (STATE.md
       decisão 07-02, aplicado em lead-timeline-dialog.tsx/09-03): sincroniza
       `tipo`/`texto` com a prop `open`/`lead` ao abrir para um lead novo —
       não é estado derivável sem efeito (depende de `templates`/`nichoNome`
       vindos de fora e de `pickTemplate`/`renderTemplate`). */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTipo(defaultTipo);
    setTexto(
      renderTemplate(template?.corpo ?? "", {
        nome: lead.nome,
        nicho: nichoNome,
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
        nicho: nichoNome,
        origem: lead.origem,
      })
    );
  }

  // WR-04: manter o `<Dialog>` sempre montado (guardar só o conteúdo) em
  // vez de `if (!lead) return null` — retornar null aqui desmontava a
  // árvore inteira do Radix Dialog assim que `lead` ficava undefined
  // (chamadores limpam `open` e `lead` na mesma atualização de estado ao
  // fechar), arrancando o modal antes de ele rodar a própria animação de
  // fechamento — diferente de todo outro dialog do app.
  const tel = lead ? normalizePhone(lead.telefone) : undefined;
  // WA-VAZIO: registerWhatsAppContact exige texto não-vazio (D-04) e falha
  // SILENCIOSAMENTE (sem exceção) quando a caixa está vazia — sem template
  // padrão cadastrado para o tipo, a textarea some vazia e, sem este gate,
  // o link abria o WhatsApp mesmo assim, sem gravar tentativa/interação e
  // sem avisar o admin. `mensagemVazia` bloqueia isso no client, mesmo
  // padrão do aviso de telefone inválido logo abaixo.
  const mensagemVazia = texto.trim().length === 0;
  const waHref = lead && tel && !mensagemVazia ? buildWaLink(tel, texto) : undefined;

  return (
    <Dialog open={open && !!lead} onOpenChange={onOpenChange}>
      <DialogContent>
        {lead ? (
          <>
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
              {tel && mensagemVazia ? (
                <p className="text-sm text-[#B91C1C]">
                  Mensagem vazia — escreva algo antes de abrir o WhatsApp.
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {/* WA-06/WA-08: registra a tentativa de contato (e o possível
                  auto-avanço Novo→Contatado) de forma fire-and-forget — a
                  aba do wa.me já abre pelo `href` nativo do anchor, sem
                  interceptar a navegação nem esperar a resposta do servidor
                  (Pitfall 2). O gate de avanço é decidido inteiramente no
                  servidor a partir de um SELECT fresco; o cliente só envia
                  o tipo vivo do Select e exibe o toast se o retorno indicar
                  avanço. TIMELINE-01/D-04: o texto integral da caixa de
                  mensagem (capturado ANTES de onOpenChange(false) limpar o
                  state) é o que fica registrado na timeline — exatamente o
                  que foi enviado, edições incluídas. */}
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    onOpenChange(false);
                    if (!lead) return;
                    const leadId = lead.id;
                    const nome = lead.nome;
                    registerWhatsAppContact(leadId, tipo, texto)
                      .then((result) => {
                        if (result.advanced) {
                          toast.success(`${nome} avançou para Contatado.`);
                        }
                      })
                      .catch(() => {
                        // Silencioso por design: a aba do WhatsApp já abriu,
                        // exibir erro sobre ela confundiria o admin.
                      });
                  }}
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
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
