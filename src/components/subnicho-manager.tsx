"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { createSubnicho, renameSubnicho } from "@/actions/subnicho-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Subnicho } from "@/types";

type ActionState =
  | { success: true }
  | { errors: { nome: string[] } }
  | undefined;

function SubnichoRow({ subnicho }: { subnicho: Subnicho }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    renameSubnicho,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Sub-nicho renomeado.");
      setIsEditing(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-[#F4F4F5]">
        <span className="text-sm">{subnicho.nome}</span>
        <button
          type="button"
          aria-label={`Renomear ${subnicho.nome}`}
          onClick={() => setIsEditing(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:text-[#0D9488]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-1 rounded-md px-3 py-2"
    >
      <input type="hidden" name="id" value={subnicho.id} />
      <div className="flex items-center gap-2">
        <Input
          name="nome"
          defaultValue={subnicho.nome}
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

export function SubnichoManager({ subnichos }: { subnichos: Subnicho[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createSubnicho,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Sub-nicho criado.");
      formRef.current?.reset();
      setIsAdding(false);
    }
  }, [state]);

  const fieldError =
    state && "errors" in state ? state.errors.nome?.[0] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-md border border-[#F4F4F5]">
        {subnichos.map((subnicho) => (
          <SubnichoRow key={subnicho.id} subnicho={subnicho} />
        ))}
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
              placeholder="Nome do sub-nicho"
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
