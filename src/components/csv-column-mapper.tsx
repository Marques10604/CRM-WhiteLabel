"use client";

import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CsvColumnMapping, CsvExtraNotasColumns, CsvFieldKey } from "@/lib/csv-import";

type FieldConfig = { key: CsvFieldKey; label: string; required: boolean };

/** Rótulos exatos do UI-SPEC (mesmo vocabulário do formulário de lead, Fase 1). */
const FIELD_CONFIGS: FieldConfig[] = [
  { key: "nome", label: "Nome *", required: true },
  { key: "telefone", label: "Telefone *", required: true },
  { key: "nichoNome", label: "Nicho", required: false },
  { key: "canal", label: "Canal", required: false },
  { key: "origem", label: "Origem", required: false },
  { key: "valorEstimado", label: "Valor estimado", required: false },
  { key: "notas", label: "Notas", required: false },
  { key: "interesse", label: "Interesse", required: false },
];

/** Sentinela de "não mapeado" (D-04) — mapeia para `null` no onValueChange. */
const NONE_VALUE = "__nenhuma__";

type CsvColumnMapperProps = {
  headers: string[];
  mapping: CsvColumnMapping;
  onMappingChange: (mapping: CsvColumnMapping) => void;
  detectedDelimiter: string;
  detectedEncoding: "UTF-8" | "Windows-1252";
  onContinue: () => void;
  extraNotasColumns: CsvExtraNotasColumns;
  onExtraNotasColumnsChange: (columns: CsvExtraNotasColumns) => void;
};

/**
 * Passo 2 do wizard (IMPORT-01/03, D-04) — mapeia colunas do CSV para os
 * campos do lead. Nome/Telefone obrigatórios (sem opção "nenhuma"); os
 * demais campos oferecem "— nenhuma —" (D-04, campo opcional não mapeado).
 */
export function CsvColumnMapper({
  headers,
  mapping,
  onMappingChange,
  detectedDelimiter,
  detectedEncoding,
  onContinue,
  extraNotasColumns,
  onExtraNotasColumnsChange,
}: CsvColumnMapperProps) {
  const delimiterLabel = detectedDelimiter === ";" ? "ponto-e-vírgula" : "vírgula";
  const canContinue = Boolean(mapping.nome && mapping.telefone);

  function handleFieldChange(key: CsvFieldKey, value: string) {
    onMappingChange({ ...mapping, [key]: value === NONE_VALUE ? null : value });
  }

  // D-01/D-02/D-04: colunas ainda não usadas em nenhum dos 8 campos fixos —
  // recalculado a cada render (sem useMemo/cache) para que um Select que
  // passe a apontar pra uma coluna já marcada faça o checkbox dela sumir na
  // hora (Pitfall 4).
  const mappedHeaders = new Set(Object.values(mapping).filter((v): v is string => v !== null));
  const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h));
  // WR-01 (05-REVIEW.md): uma coluna marcada como extra pode depois ser
  // remapeada para um campo fixo via Select — sem este filtro, o resumo
  // "Serão concatenadas" continuaria citando essa coluna mesmo ela não
  // sendo mais concatenada de fato (buildNotasText já a exclui via
  // fixedHeaders). Deriva a lista visível a partir de mappedHeaders para
  // que o resumo nunca prometa uma coluna que não vai ser concatenada.
  const visibleExtraColumns = extraNotasColumns.filter((h) => !mappedHeaders.has(h));

  function handleToggleExtraColumn(header: string) {
    if (extraNotasColumns.includes(header)) {
      onExtraNotasColumnsChange(extraNotasColumns.filter((h) => h !== header));
    } else {
      onExtraNotasColumnsChange([...extraNotasColumns, header]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] leading-tight font-semibold">Mapeie as colunas</h2>
        <p className="text-sm text-muted-foreground">
          Nome e telefone são obrigatórios. Os demais campos são opcionais — deixe em branco
          se o arquivo não tiver essa coluna.
        </p>
        <p className="text-sm text-muted-foreground">
          Detectado: separador {delimiterLabel}, codificação {detectedEncoding}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">
        {FIELD_CONFIGS.map((config) => {
          const items = config.required
            ? headers.map((header) => ({ value: header, label: header }))
            : [
                { value: NONE_VALUE, label: "— nenhuma —" },
                ...headers.map((header) => ({ value: header, label: header })),
              ];
          const currentValue = mapping[config.key] ?? (config.required ? null : NONE_VALUE);

          return (
            <Field key={config.key}>
              <FieldLabel htmlFor={`map-${config.key}`}>{config.label}</FieldLabel>
              <FieldContent>
                <Select
                  name={`map-${config.key}`}
                  items={items}
                  value={currentValue}
                  onValueChange={(value) => handleFieldChange(config.key, value as string)}
                >
                  <SelectTrigger id={`map-${config.key}`} className="w-full">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          );
        })}
      </div>

      {/* D-01/D-02/D-03/D-04/D-08/D-09: seção opcional de colunas extras para
          notas — só renderiza quando sobra alguma coluna não mapeada (D-03,
          sem mensagem de vazio); resumo ao vivo deriva a ordem de `headers`
          (ordem do arquivo CSV), nunca da ordem de clique (D-08). */}
      {unmappedHeaders.length > 0 && (
        <div className="flex flex-col gap-4 rounded-lg bg-[#F4F4F5] p-6">
          <p className="text-sm font-semibold">Colunas extras para notas (opcional)</p>
          <div className="flex flex-col gap-2">
            {unmappedHeaders.map((header) => (
              <label key={header} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-[#0D9488]"
                  checked={extraNotasColumns.includes(header)}
                  onChange={() => handleToggleExtraColumn(header)}
                />
                {header}
              </label>
            ))}
          </div>
          {visibleExtraColumns.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Serão concatenadas: {headers.filter((h) => visibleExtraColumns.includes(h)).join(" → ")}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Ver prévia
        </Button>
      </div>
    </div>
  );
}
