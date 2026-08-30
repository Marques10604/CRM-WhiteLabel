"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { Nicho } from "@/types";

type NichoItem = { value: number; label: string };

type NichoComboboxProps = {
  nichos: Nicho[];
  value: number | null;
  onValueChange: (nichoId: number | null) => void;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Combobox pesquisável de nicho (D-03). Renderiza um input de texto
 * filtrável sobre a lista administrável de nichos e mantém um input
 * nativo oculto (`name`) para que o `nichoId` selecionado seja enviado
 * junto do FormData do formulário de lead.
 */
export function NichoCombobox({
  nichos,
  value,
  onValueChange,
  name = "nichoId",
  disabled,
  invalid,
}: NichoComboboxProps) {
  // Nichos removidos (soft-delete, quick task 260725-lai) somem da lista
  // de seleção, EXCETO quando já são o valor atualmente selecionado — sem essa
  // exceção, abrir o formulário de edição de um lead cujo nicho foi
  // removido mostraria o campo vazio e forçaria trocar de nicho. Esta
  // única mudança cobre as duas superfícies que consomem este componente
  // (lead-form-dialog.tsx e csv-import-preview-table.tsx).
  const items = useMemo<NichoItem[]>(
    () =>
      nichos
        .filter((nicho) => nicho.deletedAt === null || nicho.id === value)
        .map((nicho) => ({ value: nicho.id, label: nicho.nome })),
    [nichos, value]
  );

  const selectedItem = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item) =>
        onValueChange(item ? (item as NichoItem).value : null)
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder="Selecione um nicho"
        aria-invalid={invalid}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum nicho encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: NichoItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
