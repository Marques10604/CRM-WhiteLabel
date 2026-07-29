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
import type { Subnicho } from "@/types";

type SubnichoItem = { value: number; label: string };

type SubnichoComboboxProps = {
  subnichos: Subnicho[];
  value: number | null;
  onValueChange: (subnichoId: number | null) => void;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Combobox pesquisável de sub-nicho (D-03). Renderiza um input de texto
 * filtrável sobre a lista administrável de sub-nichos e mantém um input
 * nativo oculto (`name`) para que o `subnichoId` selecionado seja enviado
 * junto do FormData do formulário de lead.
 */
export function SubnichoCombobox({
  subnichos,
  value,
  onValueChange,
  name = "subnichoId",
  disabled,
  invalid,
}: SubnichoComboboxProps) {
  // Sub-nichos removidos (soft-delete, quick task 260725-lai) somem da lista
  // de seleção, EXCETO quando já são o valor atualmente selecionado — sem essa
  // exceção, abrir o formulário de edição de um lead cujo sub-nicho foi
  // removido mostraria o campo vazio e forçaria trocar de sub-nicho. Esta
  // única mudança cobre as duas superfícies que consomem este componente
  // (lead-form-dialog.tsx e csv-import-preview-table.tsx).
  const items = useMemo<SubnichoItem[]>(
    () =>
      subnichos
        .filter((subnicho) => subnicho.deletedAt === null || subnicho.id === value)
        .map((subnicho) => ({ value: subnicho.id, label: subnicho.nome })),
    [subnichos, value]
  );

  const selectedItem = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item) =>
        onValueChange(item ? (item as SubnichoItem).value : null)
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder="Selecione um sub-nicho"
        aria-invalid={invalid}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum sub-nicho encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: SubnichoItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
