"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type WhatsAppSendButtonProps = {
  nome: string;
  disabled?: boolean;
  onClick: () => void;
};

/**
 * Botão inline "Enviar WhatsApp" (D-14/D-16/WA-05) — ícone-apenas, alvo de
 * toque 36px (`size="icon-lg"`), compartilhado entre o dashboard de
 * follow-ups e os cards do pipeline. NÃO decide a validade do telefone —
 * recebe `disabled` já computado pelo pai via `normalizePhone`; quando
 * desabilitado, expõe o motivo via `title` nativo (D-17).
 */
export function WhatsAppSendButton({ nome, disabled, onClick }: WhatsAppSendButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={`Enviar WhatsApp para ${nome}`}
      disabled={disabled}
      title={disabled ? "Telefone inválido — edite o lead" : undefined}
      onClick={onClick}
    >
      <MessageCircle className="text-[#0D9488]" />
    </Button>
  );
}
