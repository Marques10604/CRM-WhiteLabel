"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Rascunho de 1ª mensagem do diagnóstico (DIAGNOSTICO-08). `Textarea` controlado
 * com valor VIVO no state — o botão "Copiar mensagem" lê `texto`, nunca a prop
 * `rascunho` original, então as edições do usuário sempre chegam à área de
 * transferência (mesmo idioma de `whatsapp-preview-dialog.tsx`).
 *
 * Este componente PROVA o requisito: não há Server Action, não há persistência,
 * não há botão de enviar nem link de disparo de nenhum tipo. As edições vivem
 * só no state; o rascunho é copiado e usado à mão, fora do sistema.
 */
export function RascunhoMensagem({ rascunho }: { rascunho: string }) {
  const [texto, setTexto] = useState(rascunho);
  const [copiado, setCopiado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Limpa o timeout pendente se o componente desmontar antes dos 2s — evita
  // setState em componente desmontado.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopiar() {
    // Lê o state VIVO (`texto`), nunca a prop `rascunho` — o texto editado é o
    // que vai para a área de transferência.
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        className="min-h-32"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />
      <div>
        <Button type="button" variant="outline" onClick={handleCopiar}>
          {copiado ? "Copiado" : "Copiar mensagem"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Rascunho editável. Nunca enviado pelo sistema — copie e use à mão.{" "}
        As edições não são salvas.
      </p>
    </div>
  );
}
