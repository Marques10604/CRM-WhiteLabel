"use client";

import { useRef, useState } from "react";
import { FileWarning, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CsvUploadError = { heading: string; body: string };

type CsvUploadDropzoneProps = {
  /** Chamado com o arquivo assim que selecionado/solto — decode/parse acontece no wizard. */
  onFileSelected: (file: File) => void;
  /** Nome do último arquivo processado, para exibir "Trocar arquivo" (D-04 do UI-SPEC). */
  fileName?: string | null;
  /** Reseta o estado do wizard para o passo de upload (botão "Trocar arquivo"/"Tentar novamente"). */
  onReset?: () => void;
  /** Estado de erro (arquivo ilegível / zero linhas válidas) — copy literal do UI-SPEC. */
  error?: CsvUploadError | null;
};

/**
 * Dropzone de upload de CSV (IMPORT-01/03) — arraste/solte ou clique para
 * selecionar; `min-h-48` (02-UI-SPEC.md). Não faz nenhum parsing aqui: só
 * repassa o `File` bruto via `onFileSelected` para o wizard, que roda
 * `decodeCsvFile` (D-03) antes de qualquer `Papa.parse`.
 */
export function CsvUploadDropzone({
  onFileSelected,
  fileName,
  onReset,
  error,
}: CsvUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  function handleZoneClick() {
    if (!fileName && !error) inputRef.current?.click();
  }

  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-[#F4F4F5] p-8 text-center transition-colors",
        isDragOver ? "border-[#0D9488] bg-[#0D9488]/5" : "border-zinc-300"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        handleFiles(event.dataTransfer.files);
      }}
      onClick={handleZoneClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {error ? (
        <>
          <FileWarning className="size-8 text-[#DC2626]" />
          <h2 className="text-[20px] leading-tight font-semibold">{error.heading}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{error.body}</p>
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onReset?.();
              inputRef.current?.click();
            }}
          >
            Tentar novamente
          </Button>
        </>
      ) : fileName ? (
        <>
          <Upload className="size-8 text-[#0D9488]" />
          <p className="text-[16px] leading-normal font-normal text-foreground">{fileName}</p>
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onReset?.();
            }}
          >
            Trocar arquivo
          </Button>
        </>
      ) : (
        <>
          <Upload className="size-8 text-muted-foreground" />
          <h2 className="text-[20px] leading-tight font-semibold">
            Arraste o CSV aqui ou clique para selecionar
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Aceita arquivos .csv. Detectamos automaticamente o separador (vírgula ou
            ponto-e-vírgula) e a codificação do arquivo.
          </p>
        </>
      )}
    </div>
  );
}
