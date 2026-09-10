"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { decodeCsvFile } from "@/lib/csv-encoding";
import {
  detectWithinBatchDuplicatePhones,
  mapCsvRows,
  type CsvColumnMapping,
  type CsvExtraNotasColumns,
  type MappedCsvRow,
  type ParsedCsvRow,
} from "@/lib/csv-import";
import { fetchPreviewSupportData, type PreviewSupportData } from "@/actions/import-actions";
import { CsvUploadDropzone, type CsvUploadError } from "@/components/csv-upload-dropzone";
import { CsvColumnMapper } from "@/components/csv-column-mapper";
import {
  CsvImportPreviewTable,
  type RowFlags,
  type RowOverride,
} from "@/components/csv-import-preview-table";
import type { Nicho, Template } from "@/types";

/** ~10MB — guarda leve de tamanho de arquivo (T-02-05, RESEARCH.md V12). */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const EMPTY_MAPPING: CsvColumnMapping = {
  nome: null,
  telefone: null,
  nichoNome: null,
  canal: null,
  origem: null,
  valorEstimado: null,
  notas: null,
  interesse: null,
};

/** D-11: cada upload novo começa sem nenhuma coluna extra marcada. */
const EMPTY_EXTRA_NOTAS_COLUMNS: CsvExtraNotasColumns = [];

const ERROR_READ_FAILED: CsvUploadError = {
  heading: "Não foi possível ler este arquivo",
  body: "Verifique se é um arquivo .csv exportado do Google Sheets ou Excel e tente novamente.",
};

const ERROR_NO_VALID_ROWS: CsvUploadError = {
  heading: "Nenhuma linha válida encontrada",
  body: "O arquivo foi lido, mas nenhuma linha tem nome e telefone preenchidos. Confira o arquivo e tente novamente.",
};

/**
 * Estado dos 3 passos do wizard (upload/mapear/prévia) — união discriminada
 * via `useState`, sem hook de reducer (convenção do projeto, 02-PATTERNS.md
 * seção 10). `mapping`/`preview` carregam os campos do passo anterior para
 * que "Voltar ao mapeamento" (Task 3) preserve `parsedRows`/`mapping` sem
 * precisar reprocessar o arquivo.
 */
type WizardState =
  | { step: "upload"; fileName?: string; error?: CsvUploadError }
  | {
      step: "mapping";
      fileName: string;
      parsedRows: ParsedCsvRow[];
      detectedDelimiter: string;
      detectedEncoding: "UTF-8" | "Windows-1252";
      mapping: CsvColumnMapping;
      extraNotasColumns: CsvExtraNotasColumns;
    }
  | {
      step: "preview";
      fileName: string;
      parsedRows: ParsedCsvRow[];
      detectedDelimiter: string;
      detectedEncoding: "UTF-8" | "Windows-1252";
      mapping: CsvColumnMapping;
      extraNotasColumns: CsvExtraNotasColumns;
      mappedRows: MappedCsvRow[];
    };

type CsvImportWizardProps = {
  nichos: Nicho[];
  templates: Template[];
};

/**
 * Sniff de codificação SOMENTE para exibição (IMPORT-03, "Detectado: ...").
 * Espelha exatamente a mesma heurística de `decodeCsvFile` (BOM + TextDecoder
 * fatal) sobre o mesmo buffer, para que o rótulo mostrado nunca divirja da
 * decodificação real usada pelo parse — `decodeCsvFile` (02-01) não expõe
 * qual branch escolheu, então este helper local reaplica a mesma lógica.
 */
async function detectEncodingLabel(file: File): Promise<"UTF-8" | "Windows-1252"> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const hasUtf8Bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  if (hasUtf8Bom) return "UTF-8";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return "UTF-8";
  } catch {
    return "Windows-1252";
  }
}

const DEFAULT_OVERRIDE: RowOverride = { importarMesmoAssim: false, nichoOverrideId: null };

/** Os 3 passos do wizard, na ordem em que o admin os percorre. */
const IMPORT_STEPS = [
  { numero: 1, rotulo: "Upload" },
  { numero: 2, rotulo: "Mapeamento" },
  { numero: 3, rotulo: "Prévia" },
] as const;

/**
 * Indicador de progresso "Passo N de 3" acima de cada tela do wizard.
 * Sub-componente local (só um consumidor, pequeno demais para arquivo/registry).
 * O `animate-pulse` do skeleton e as transições são neutralizados pelo bloco
 * global `@media (prefers-reduced-motion)` — sem guarda própria aqui.
 */
function ImportStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progresso da importação" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">Passo {current} de 3</p>
      <ol className="flex items-center gap-3">
        {IMPORT_STEPS.map((step) => {
          const ativo = step.numero === current;
          return (
            <li
              key={step.numero}
              aria-current={ativo ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                  ativo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {step.numero}
              </span>
              <span
                className={cn(
                  "text-sm",
                  ativo ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.rotulo}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// `templates` é recebido para a futura tela pós-importação (D-14, plano
// 02-03) — ainda não usado nesta wave, mantido na assinatura para que a
// rota `/importar/page.tsx` já passe o dado certo sem retrabalho depois.
export function CsvImportWizard({ nichos, templates }: CsvImportWizardProps) {
  void templates;
  const router = useRouter();
  const [state, setState] = useState<WizardState>({ step: "upload" });
  const [previewSupportData, setPreviewSupportData] = useState<PreviewSupportData | null>(null);
  const [overrides, setOverrides] = useState<Map<number, RowOverride>>(new Map());

  const mappedRows = state.step === "preview" ? state.mappedRows : null;

  // Busca dados de apoio (duplicados no banco + nichos desconhecidos)
  // assim que o admin chega na prévia — chaveado em `mappedRows` (Task 3).
  useEffect(() => {
    if (!mappedRows) return;

    let cancelled = false;
    const normalizedPhones = mappedRows
      .map((row) => row.telefoneNormalizado)
      .filter((phone): phone is string => phone !== null);
    const nichoNamesTrimmed = mappedRows
      .map((row) => row.nichoNome.trim())
      .filter((nome) => nome !== "");

    fetchPreviewSupportData(normalizedPhones, nichoNamesTrimmed)
      .then((data) => {
        if (!cancelled) setPreviewSupportData(data);
      })
      .catch(() => {
        // CR-01 (05-REVIEW.md): sem isso, uma falha aqui (rede/banco) deixava
        // previewSupportData null pra sempre e a prévia travava em "Carregando
        // prévia..." sem saída. Cai pra "sem duplicatas/nichos novos
        // conhecidos" — o admin ainda revisa a prévia, só perde os avisos de
        // duplicata/nicho novo até tentar de novo.
        if (cancelled) return;
        toast.error(
          "Não foi possível carregar os avisos de duplicata/nicho novo. A prévia segue sem esses avisos — volte ao mapeamento e tente de novo se precisar deles."
        );
        setPreviewSupportData({ duplicatePhones: [], unknownNichoNames: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [mappedRows]);

  const duplicateRowIndexesInBatch = useMemo(
    () => (mappedRows ? detectWithinBatchDuplicatePhones(mappedRows) : new Set<number>()),
    [mappedRows]
  );

  const duplicatePhonesSet = useMemo(
    () => new Set(previewSupportData?.duplicatePhones ?? []),
    [previewSupportData]
  );
  const unknownNichoNamesSet = useMemo(
    () => new Set(previewSupportData?.unknownNichoNames ?? []),
    [previewSupportData]
  );

  const previewRows = useMemo(() => {
    if (!mappedRows || !previewSupportData) return null;

    return mappedRows.map((row) => {
      const flags: RowFlags = {
        duplicadoDb: row.telefoneNormalizado !== null && duplicatePhonesSet.has(row.telefoneNormalizado),
        duplicadoLote: duplicateRowIndexesInBatch.has(row.rowIndex),
        nichoNovo:
          row.nichoNome.trim() !== "" && unknownNichoNamesSet.has(row.nichoNome.trim()),
        nichoBloqueado: row.nichoNome.trim() === "",
        // Telefone que não normaliza (ex: DDI estrangeiro, link opaco de
        // WhatsApp Business) não pode virar lead válido — em vez de abortar
        // o lote inteiro na validação do servidor (comportamento antigo),
        // a linha é excluída da confirmação e reportada pro admin corrigir
        // depois (à mão, editando a origem ou criando o lead manualmente).
        telefoneInvalido: row.telefoneNormalizado === null,
      };
      return { ...row, flags };
    });
  }, [mappedRows, previewSupportData, duplicatePhonesSet, unknownNichoNamesSet, duplicateRowIndexesInBatch]);

  async function handleFileSelected(file: File) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setState({
        step: "upload",
        fileName: file.name,
        error: {
          heading: "Não foi possível ler este arquivo",
          body: "Este arquivo é grande demais para importar de uma vez. Divida em lotes menores e tente novamente.",
        },
      });
      return;
    }

    let decoded: string;
    let detectedEncoding: "UTF-8" | "Windows-1252";
    try {
      // decodeCsvFile SEMPRE antes de Papa.parse (D-03, Pitfall 1/2 do RESEARCH.md).
      [decoded, detectedEncoding] = await Promise.all([decodeCsvFile(file), detectEncodingLabel(file)]);
    } catch {
      setState({ step: "upload", fileName: file.name, error: ERROR_READ_FAILED });
      return;
    }

    let result: Papa.ParseResult<ParsedCsvRow>;
    try {
      result = Papa.parse<ParsedCsvRow>(decoded, {
        header: true,
        skipEmptyLines: true,
        delimiter: "", // auto-detect (D-02)
        transformHeader: (h) => h.trim(),
      });
    } catch {
      setState({ step: "upload", fileName: file.name, error: ERROR_READ_FAILED });
      return;
    }

    if (!result.data || result.data.length === 0) {
      setState({ step: "upload", fileName: file.name, error: ERROR_NO_VALID_ROWS });
      return;
    }

    setPreviewSupportData(null);
    setOverrides(new Map());
    setState({
      step: "mapping",
      fileName: file.name,
      parsedRows: result.data,
      detectedDelimiter: result.meta.delimiter,
      detectedEncoding,
      mapping: { ...EMPTY_MAPPING },
      extraNotasColumns: [...EMPTY_EXTRA_NOTAS_COLUMNS],
    });
  }

  function handleReset() {
    setState({ step: "upload" });
  }

  function handleMappingChange(mapping: CsvColumnMapping) {
    if (state.step !== "mapping") return;
    setState({ ...state, mapping });
  }

  function handleExtraNotasColumnsChange(extraNotasColumns: CsvExtraNotasColumns) {
    if (state.step !== "mapping") return;
    setState({ ...state, extraNotasColumns });
  }

  function handleContinueToPreview() {
    if (state.step !== "mapping") return;

    const rows = mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns);
    const hasAnyValidRow = rows.some((row) => row.nome !== "" && row.telefone !== "");
    if (!hasAnyValidRow) {
      setState({ step: "upload", error: ERROR_NO_VALID_ROWS });
      return;
    }

    setPreviewSupportData(null);
    setOverrides(new Map());
    setState({ ...state, step: "preview", mappedRows: rows });
  }

  function handleBackToMapping() {
    if (state.step !== "preview") return;
    setState({
      step: "mapping",
      fileName: state.fileName,
      parsedRows: state.parsedRows,
      detectedDelimiter: state.detectedDelimiter,
      detectedEncoding: state.detectedEncoding,
      mapping: state.mapping,
      extraNotasColumns: state.extraNotasColumns,
    });
  }

  function handleToggleImportAnyway(rowIndex: number) {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(rowIndex) ?? DEFAULT_OVERRIDE;
      next.set(rowIndex, { ...current, importarMesmoAssim: !current.importarMesmoAssim });
      return next;
    });
  }

  function handleAssignNicho(rowIndex: number, nichoId: number | null) {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(rowIndex) ?? DEFAULT_OVERRIDE;
      next.set(rowIndex, { ...current, nichoOverrideId: nichoId });
      return next;
    });
  }

  function handleImported(batchId: string) {
    // D-13/D-14: leva o admin direto para a tela pós-importação do lote,
    // onde cada lead tem seu próprio botão de envio de WhatsApp.
    router.push(`/importar/${batchId}`);
  }

  if (state.step === "upload") {
    return (
      <div className="flex flex-col gap-6">
        <ImportStepper current={1} />
        <CsvUploadDropzone
          onFileSelected={handleFileSelected}
          fileName={state.fileName}
          error={state.error}
          onReset={handleReset}
        />
      </div>
    );
  }

  if (state.step === "mapping") {
    return (
      <div className="flex flex-col gap-6">
        <ImportStepper current={2} />
        <CsvColumnMapper
          headers={Object.keys(state.parsedRows[0] ?? {})}
          mapping={state.mapping}
          onMappingChange={handleMappingChange}
          detectedDelimiter={state.detectedDelimiter}
          detectedEncoding={state.detectedEncoding}
          onContinue={handleContinueToPreview}
          extraNotasColumns={state.extraNotasColumns}
          onExtraNotasColumnsChange={handleExtraNotasColumnsChange}
        />
      </div>
    );
  }

  if (!previewRows) {
    return (
      <div className="flex flex-col gap-6">
        <ImportStepper current={3} />
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Carregando prévia...</span>
          <div className="h-10 rounded bg-muted animate-pulse" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ImportStepper current={3} />
      <CsvImportPreviewTable
        rows={previewRows}
        nichos={nichos}
        overrides={overrides}
        onToggleImportAnyway={handleToggleImportAnyway}
        onAssignNicho={handleAssignNicho}
        unknownNichoNames={previewSupportData?.unknownNichoNames ?? []}
        onImported={handleImported}
        onBack={handleBackToMapping}
      />
    </div>
  );
}
