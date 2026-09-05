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
import type { Campanha, Nicho } from "@/types";

/**
 * O `value` de um item pode ser número (id de campanha real) OU string (o
 * sentinela `NONE_VALUE`) — mesma forma do `MotivoPerdaItem`. O sentinela
 * nunca colide com um id real porque ids são inteiros.
 */
type CampanhaItem = { value: number | string; label: string };

/** Sentinela da opção "Nenhuma campanha" (desvincular) — nunca colide com um id real. */
const NONE_VALUE = "__nenhuma__";

type CampanhaComboboxProps = {
  campanhas: Campanha[];
  /** Só para compor o rótulo "nicho — oferta" de cada campanha. */
  nichos: Nicho[];
  value: number | null;
  onValueChange: (campanhaId: number | null) => void;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Combobox pesquisável de campanha (CAMPANHA-03, Fase 22) — SEM criação-na-hora
 * (criar campanha continua sendo só em `/campanhas`). Shell modelado em
 * `nicho-combobox.tsx` (mesmos primitivos, mesmo input nativo oculto via `name`
 * que alimenta o FormData de `lead-form-dialog.tsx`).
 *
 * O filtro anti-soft-delete (campanha ativa OU já selecionada no lead) É a
 * "query das campanhas ativas" exigida pelo gap: sem a exceção do id já
 * selecionado, abrir o formulário de um lead cuja campanha foi removida
 * (soft-delete) mostraria o campo vazio e forçaria trocar de campanha (mesma
 * causa-raiz documentada para o nicho/motivo-perda).
 *
 * O item-sentinela "Nenhuma campanha" vem PRIMEIRO na lista e materializa a
 * opção de desvincular exigida pelo gap. Com `value` nulo o input fica vazio e
 * mostra o placeholder.
 */
export function CampanhaCombobox({
  campanhas,
  nichos,
  value,
  onValueChange,
  name = "campanhaId",
  disabled,
  invalid,
}: CampanhaComboboxProps) {
  const nichoNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const nicho of nichos) map.set(nicho.id, nicho.nome);
    return map;
  }, [nichos]);

  const campanhaItems = useMemo<CampanhaItem[]>(
    () =>
      campanhas
        .filter((campanha) => campanha.deletedAt === null || campanha.id === value)
        .map((campanha) => ({
          value: campanha.id,
          label: (nichoNameById.get(campanha.nichoId) ?? "—") + " — " + campanha.oferta,
        })),
    [campanhas, nichoNameById, value]
  );

  const items = useMemo<CampanhaItem[]>(
    () => [{ value: NONE_VALUE, label: "Nenhuma campanha" }, ...campanhaItems],
    [campanhaItems]
  );

  // O selectedItem é procurado SÓ entre os itens de campanha (nunca casa com o
  // sentinela, que é string) — com `value` nulo, o input fica vazio.
  const selectedItem = campanhaItems.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item) => {
        const picked = item as CampanhaItem | null;
        if (!picked || picked.value === NONE_VALUE) {
          onValueChange(null);
          return;
        }
        onValueChange(Number(picked.value));
      }}
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder="Nenhuma campanha"
        aria-invalid={invalid}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma campanha encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(item: CampanhaItem) => (
            <ComboboxItem key={String(item.value)} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
