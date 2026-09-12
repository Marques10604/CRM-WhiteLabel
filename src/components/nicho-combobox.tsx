"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { createNicho } from "@/actions/nicho-actions";
import type { Nicho } from "@/types";

type NichoItem = { value: number | string; label: string };

/** Sentinela do item de ação "Criar" — nunca colide com um id real (inteiro). */
const CREATE_VALUE = "__criar__";

type NichoComboboxProps = {
  nichos: Nicho[];
  value: number | null;
  onValueChange: (nichoId: number | null) => void;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Liga a criação-na-hora (D-01, quick 260912-n5w) — opt-in, default
   * `false`. Só `campanha-form-dialog.tsx` liga; `lead-form-dialog.tsx` e
   * `csv-import-preview-table.tsx` continuam com o comportamento de leitura
   * pura de sempre (sem query/open controlados, sem linha de ação).
   */
  allowCreate?: boolean;
};

/**
 * Combobox pesquisável de nicho (D-03), com DUAS modalidades:
 *
 * 1. Leitura pura (default, `allowCreate=false`): input de texto filtrável
 *    sobre a lista administrável de nichos, mantendo um input nativo oculto
 *    (`name`) para que o `nichoId` selecionado seja enviado junto do
 *    FormData do formulário (lead ou preview de CSV). Comportamento idêntico
 *    ao de antes da quick 260912-n5w.
 * 2. Criável (`allowCreate=true`): digitar um nome que não existe faz
 *    aparecer uma linha de ação `Criar "..."` que chama `createNicho`
 *    diretamente e já seleciona o nicho recém-criado/reativado — precedente
 *    é `motivo-perda-combobox.tsx` (plano 11-03, "o primeiro combobox
 *    criável do projeto"), portado aqui linha a linha.
 */
export function NichoCombobox({
  nichos,
  value,
  onValueChange,
  name = "nichoId",
  disabled,
  invalid,
  allowCreate = false,
}: NichoComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Nichos removidos (soft-delete, quick task 260725-lai) somem da lista
  // de seleção, EXCETO quando já são o valor atualmente selecionado — sem essa
  // exceção, abrir o formulário de edição de um lead cujo nicho foi
  // removido mostraria o campo vazio e forçaria trocar de nicho.
  const baseItems = useMemo<NichoItem[]>(
    () =>
      nichos
        .filter((nicho) => nicho.deletedAt === null || nicho.id === value)
        .map((nicho) => ({ value: nicho.id, label: nicho.nome })),
    [nichos, value]
  );

  // A entrada de criação entra na própria lista `items` (não em uma lista
  // filtrada à parte) só quando `allowCreate` está ligado, há texto, e ele
  // não casa exatamente (trim + lowercase) com um nicho existente — o filtro
  // textual embutido do Combobox então a mantém visível, já que o label dela
  // é a própria query. Sem `useMemo` manual: o React Compiler já memoiza este
  // derivado, e listar `query.trim()` como dep dispara o falso-positivo
  // `react-hooks/preserve-manual-memoization`.
  const trimmedQuery = query.trim();
  const hasExactMatch = baseItems.some(
    (item) => item.label.trim().toLowerCase() === trimmedQuery.toLowerCase()
  );
  const items: NichoItem[] =
    !allowCreate || trimmedQuery === "" || hasExactMatch
      ? baseItems
      : [...baseItems, { value: CREATE_VALUE, label: query }];

  const selectedItem = baseItems.find((item) => item.value === value) ?? null;

  function handleCreate(nome: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", nome);
      const result = await createNicho(undefined, formData);
      if (result && "success" in result) {
        setCreateError(null);
        setQuery("");
        setOpen(false);
        onValueChange(result.id);
      } else {
        setCreateError(
          (result && "errors" in result && result.errors.nome[0]) ||
            "Não foi possível criar o nicho."
        );
        setOpen(true);
      }
    });
  }

  return (
    <Combobox
      items={items}
      value={selectedItem}
      open={allowCreate ? open : undefined}
      onOpenChange={
        allowCreate
          ? (next: boolean) => {
              // Enquanto a criação roda, o Combobox tenta fechar sozinho ao
              // "selecionar" a linha Criar — segurar aberto até o resultado.
              if (!next && isPending) return;
              setOpen(next);
              if (!next) setCreateError(null);
            }
          : undefined
      }
      onInputValueChange={allowCreate ? (next: string) => setQuery(next) : undefined}
      onValueChange={(item) => {
        const picked = item as NichoItem | null;
        if (!picked) {
          onValueChange(null);
          return;
        }
        if (picked.value === CREATE_VALUE) {
          handleCreate(picked.label);
          return;
        }
        onValueChange(picked.value as number);
        if (allowCreate) setOpen(false);
      }}
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={allowCreate ? "Selecione ou digite um nicho..." : "Selecione um nicho"}
        aria-invalid={invalid}
        disabled={disabled || isPending}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum nicho encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: NichoItem) =>
            item.value === CREATE_VALUE ? (
              <ComboboxItem key={CREATE_VALUE} value={item}>
                <Plus className="size-4 text-primary" />
                <span className="text-primary">{`Criar "${item.label}"`}</span>
              </ComboboxItem>
            ) : (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )
          }
        </ComboboxList>
        {allowCreate && createError ? (
          <p className="px-3 pb-2 text-sm text-destructive">{createError}</p>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}
