"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMotivoPerda,
  renameMotivoPerda,
  softDeleteMotivoPerda,
} from "@/actions/motivo-perda-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteMotivoPerdaDialog } from "@/components/delete-motivo-perda-dialog";
import type { MotivoPerda } from "@/types";

/**
 * Gestão inline da lista de motivos de perda (Fase 11, PERDA-01, D-01/D-05) —
 * réplica 1:1 de nicho-manager.tsx. O `ActionState` carrega `id` no sucesso
 * (shape ampliado exigido pelo combobox criável de D-03), mas este manager NÃO
 * usa esse campo — o guard `"success" in state && state.success` continua válido.
 */
type ActionState =
  | { success: true; id: number }
  | { errors: { nome: string[] } }
  | undefined;

function MotivoPerdaRow({ motivoPerda }: { motivoPerda: MotivoPerda }) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    renameMotivoPerda,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Motivo de perda renomeado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fechar o modo de edição só faz sentido depois que a Server Action confirmou; mesmo falso-positivo do React Compiler já aceito no projeto (STATE.md decisões 07-02/09-04)
      setIsEditing(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  function handleDeleteConfirm() {
    startTransition(async () => {
      await softDeleteMotivoPerda(motivoPerda.id);
      toast.success("Motivo de perda removido.");
      setConfirmOpen(false);
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-[#F4F4F5]">
        <span className="text-sm">{motivoPerda.nome}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Renomear ${motivoPerda.nome}`}
            onClick={() => setIsEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:text-[#0D9488]"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Remover ${motivoPerda.nome}`}
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:text-[#DC2626]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <DeleteMotivoPerdaDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          motivoPerdaNome={motivoPerda.nome}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-1 rounded-md px-3 py-2"
    >
      <input type="hidden" name="id" value={motivoPerda.id} />
      <div className="flex items-center gap-2">
        <Input
          name="nome"
          defaultValue={motivoPerda.nome}
          autoFocus
          disabled={pending}
          aria-invalid={Boolean(fieldError)}
        />
        <Button type="submit" size="sm" disabled={pending}>
          Salvar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setIsEditing(false)}
        >
          Cancelar
        </Button>
      </div>
      {fieldError ? (
        <span className="text-sm text-[#DC2626]">{fieldError}</span>
      ) : null}
    </form>
  );
}

export function MotivoPerdaManager({
  motivosPerda,
}: {
  motivosPerda: MotivoPerda[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createMotivoPerda,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Motivo de perda criado.");
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fechar o formulário de criação só faz sentido depois que a Server Action confirmou; mesmo falso-positivo do React Compiler já aceito no projeto (STATE.md decisões 07-02/09-04)
      setIsAdding(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-md border border-[#F4F4F5]">
        {motivosPerda.length === 0 ? (
          <span className="px-3 py-2 text-sm text-muted-foreground">
            Nenhum motivo de perda cadastrado.
          </span>
        ) : (
          motivosPerda.map((motivoPerda) => (
            <MotivoPerdaRow key={motivoPerda.id} motivoPerda={motivoPerda} />
          ))
        )}
      </div>

      {isAdding ? (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-1 rounded-md px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Input
              name="nome"
              placeholder="Nome do motivo de perda"
              autoFocus
              disabled={pending}
              aria-invalid={Boolean(fieldError)}
            />
            <Button type="submit" size="sm" disabled={pending}>
              Adicionar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setIsAdding(false)}
            >
              Cancelar
            </Button>
          </div>
          {fieldError ? (
            <span className="text-sm text-[#DC2626]">{fieldError}</span>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-fit items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-[#0D9488] hover:underline"
        >
          + Adicionar
        </button>
      )}
    </div>
  );
}
