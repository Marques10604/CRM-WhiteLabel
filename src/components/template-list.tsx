"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteTemplate, setDefaultTemplate } from "@/actions/template-actions";
import { TemplateFormDialog } from "@/components/template-form-dialog";
import { DeleteTemplateDialog } from "@/components/delete-template-dialog";
import type { Template } from "@/types";

type TemplateListProps = {
  templates: Template[];
};

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; template: Template };

type DeleteState = { open: false } | { open: true; template: Template };

const TIPO_SECTIONS: { key: Template["tipo"]; label: string }[] = [
  { key: "primeiro_contato", label: "1º contato" },
  { key: "follow_up", label: "Follow-up" },
  { key: "prova_valor", label: "Prova de valor" },
];

function TemplateRow({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  pending,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted">
      <div className="flex items-center gap-2">
        <span className="text-sm">{template.nome}</span>
        {template.isDefault ? (
          <Badge
            variant="outline"
            className="border-transparent gap-1 bg-primary/10 text-primary"
          >
            <Check className="h-3 w-3" />
            Padrão
          </Badge>
        ) : (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={pending}
            className="text-sm text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
          >
            Tornar padrão
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Editar ${template.nome}`}
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Excluir ${template.nome}`}
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Lista de templates de WhatsApp agrupada por tipo (WA-01, D-09/D-11/D-12/D-13).
 * Edição/criação em modal (não inline, ao contrário de nicho-manager),
 * mesma convenção de lead-table.tsx via DialogState discriminado.
 */
export function TemplateList({ templates }: TemplateListProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [isPending, startTransition] = useTransition();

  const dialogTemplate = dialogState.mode === "edit" ? dialogState.template : undefined;

  function handleSetDefault(template: Template) {
    startTransition(async () => {
      const result = await setDefaultTemplate(template.id, template.tipo);
      if (result && "errors" in result) {
        toast.error("Não foi possível salvar o template. Tente novamente.");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleteState.open) return;
    const { template } = deleteState;
    startTransition(async () => {
      const result = await deleteTemplate(template.id);
      if (result && "errors" in result) {
        toast.error("Não foi possível excluir o template. Tente novamente.");
      } else {
        toast.success("Template excluído.");
      }
      setDeleteState({ open: false });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => setDialogState({ mode: "create" })}>
          Novo template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum template cadastrado ainda.</p>
          <Button onClick={() => setDialogState({ mode: "create" })}>
            Novo template
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {TIPO_SECTIONS.map((section) => {
            const items = templates.filter((template) => template.tipo === section.key);
            if (items.length === 0) return null;

            return (
              <div key={section.key} className="flex flex-col gap-1">
                <h2 className="text-[20px] leading-tight font-semibold">{section.label}</h2>
                <div className="flex flex-col gap-1 rounded-md border">
                  {items.map((template) => (
                    <TemplateRow
                      key={template.id}
                      template={template}
                      pending={isPending}
                      onEdit={() => setDialogState({ mode: "edit", template })}
                      onDelete={() => setDeleteState({ open: true, template })}
                      onSetDefault={() => handleSetDefault(template)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TemplateFormDialog
        open={dialogState.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialogState({ mode: "closed" });
        }}
        template={dialogTemplate}
      />

      <DeleteTemplateDialog
        open={deleteState.open}
        onOpenChange={(open) => {
          if (!open) setDeleteState({ open: false });
        }}
        templateNome={deleteState.open ? deleteState.template.nome : ""}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
