"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createNicho, renameNicho, softDeleteNicho } from "@/actions/nicho-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteNichoDialog } from "@/components/delete-nicho-dialog";
import type { Nicho } from "@/types";

type ActionState =
  | { success: true }
  | { errors: { nome: string[] } }
  | undefined;

function NichoRow({ nicho }: { nicho: Nicho }) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    renameNicho,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Nicho renomeado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- falso-positivo conhecido do React Compiler: fechar o form ao concluir a Server Action é reação a evento assíncrono, não render derivado. Mesmo padrão aceito no projeto (STATE.md decisões 07-02 / 09-03 / 09-04).
      setIsEditing(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  function handleDeleteConfirm() {
    startTransition(async () => {
      await softDeleteNicho(nicho.id);
      toast.success("Nicho removido.");
      setConfirmOpen(false);
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted">
        <span className="text-sm">{nicho.nome}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Renomear ${nicho.nome}`}
            onClick={() => setIsEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Remover ${nicho.nome}`}
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <DeleteNichoDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          nichoNome={nicho.nome}
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
      <input type="hidden" name="id" value={nicho.id} />
      <div className="flex items-center gap-2">
        <Input
          name="nome"
          defaultValue={nicho.nome}
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
        <span className="text-sm text-destructive">{fieldError}</span>
      ) : null}
    </form>
  );
}

export function NichoManager({ nichos }: { nichos: Nicho[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createNicho,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Nicho criado.");
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- falso-positivo conhecido do React Compiler: fechar o form ao concluir a Server Action é reação a evento assíncrono, não render derivado. Mesmo padrão aceito no projeto (STATE.md decisões 07-02 / 09-03 / 09-04).
      setIsAdding(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-md border">
        {nichos.length === 0 ? (
          <span className="px-3 py-2 text-sm text-muted-foreground">
            Nenhum nicho cadastrado.
          </span>
        ) : (
          nichos.map((nicho) => (
            <NichoRow key={nicho.id} nicho={nicho} />
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
              placeholder="Nome do nicho"
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
            <span className="text-sm text-destructive">{fieldError}</span>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-fit items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-primary hover:underline"
        >
          + Adicionar
        </button>
      )}
    </div>
  );
}
