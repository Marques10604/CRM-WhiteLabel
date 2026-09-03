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
import { createMotivoPerda } from "@/actions/motivo-perda-actions";
import type { MotivoPerda } from "@/types";

type MotivoPerdaItem = { value: number | string; label: string };

/** Sentinela do item de ação "Criar" — nunca colide com um id real (inteiro). */
const CREATE_VALUE = "__criar__";

type MotivoPerdaComboboxProps = {
  motivosPerda: MotivoPerda[];
  value: number | null;
  onValueChange: (motivoPerdaId: number | null) => void;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Combobox pesquisável de motivo de perda COM criação-na-hora (D-03) — o
 * primeiro "combobox criável" do projeto. Shell copiado de
 * `nicho-combobox.tsx` (mesmos primitivos, mesmo input nativo oculto via
 * `name` que alimenta o FormData de `lead-form-dialog.tsx`, e o MESMO filtro
 * anti-soft-delete `deletedAt === null || id === value` — sem a exceção
 * `id === value`, editar um lead perdido cujo motivo foi removido mostraria o
 * campo vazio, causa-raiz documentada em
 * `.planning/debug/resolved/nicho-combobox-vazio.md`).
 *
 * A novidade: quando o texto digitado (trim + case-insensitive) não casa com
 * nenhum motivo existente, a última linha da lista vira uma AÇÃO
 * `Criar "{query}"` (ícone `Plus` + texto accent teal — a única linha do
 * combobox que é ação, não dado, exceção explícita à regra "accent nunca em
 * conteúdo de dados" do 11-UI-SPEC.md). Selecioná-la chama `createMotivoPerda`
 * DIRETAMENTE (não via `useActionState`, que só exporia o resultado no render
 * seguinte) dentro de um `useTransition` e usa o `id` devolvido para já
 * selecionar o motivo recém-criado/reativado.
 */
export function MotivoPerdaCombobox({
  motivosPerda,
  value,
  onValueChange,
  name = "motivoPerdaId",
  disabled,
  invalid,
}: MotivoPerdaComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseItems = useMemo<MotivoPerdaItem[]>(
    () =>
      motivosPerda
        .filter((m) => m.deletedAt === null || m.id === value)
        .map((m) => ({ value: m.id, label: m.nome })),
    [motivosPerda, value]
  );

  // A entrada de criação entra na própria lista `items` (não em `filteredItems`)
  // só quando há texto e ele não casa exatamente com um motivo existente — o
  // filtro textual embutido do Combobox então a mantém visível, já que o label
  // dela é a própria query. Sem `useMemo` manual: o React Compiler já memoiza
  // este derivado, e listar `query.trim()` como dep dispara o falso-positivo
  // `react-hooks/preserve-manual-memoization`.
  const trimmedQuery = query.trim();
  const hasExactMatch = baseItems.some(
    (item) => item.label.trim().toLowerCase() === trimmedQuery.toLowerCase()
  );
  const items: MotivoPerdaItem[] =
    trimmedQuery === "" || hasExactMatch
      ? baseItems
      : [...baseItems, { value: CREATE_VALUE, label: query }];

  const selectedItem = baseItems.find((item) => item.value === value) ?? null;

  function handleCreate(nome: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", nome);
      const result = await createMotivoPerda(undefined, formData);
      if (result && "success" in result) {
        setCreateError(null);
        setQuery("");
        setOpen(false);
        onValueChange(result.id);
      } else {
        setCreateError(
          (result && "errors" in result && result.errors.nome[0]) ||
            "Não foi possível criar o motivo."
        );
        setOpen(true);
      }
    });
  }

  return (
    <Combobox
      items={items}
      value={selectedItem}
      open={open}
      onOpenChange={(next: boolean) => {
        // Enquanto a criação roda, o Combobox tenta fechar sozinho ao
        // "selecionar" a linha Criar — segurar aberto até o resultado.
        if (!next && isPending) return;
        setOpen(next);
        if (!next) setCreateError(null);
      }}
      onInputValueChange={(next: string) => setQuery(next)}
      onValueChange={(item) => {
        const picked = item as MotivoPerdaItem | null;
        if (!picked) {
          onValueChange(null);
          return;
        }
        if (picked.value === CREATE_VALUE) {
          handleCreate(picked.label);
          return;
        }
        onValueChange(picked.value as number);
        setOpen(false);
      }}
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder="Selecione ou digite um motivo..."
        aria-invalid={invalid}
        disabled={disabled || isPending}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum motivo encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(item: MotivoPerdaItem) =>
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
        {createError ? (
          <p className="px-3 pb-2 text-sm text-destructive">{createError}</p>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
}
