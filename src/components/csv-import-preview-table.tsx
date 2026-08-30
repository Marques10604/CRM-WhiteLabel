"use client";

import { useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CircleAlert, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NichoCombobox } from "@/components/nicho-combobox";
import { bulkImportLeads, type ConfirmedImportRow } from "@/actions/import-actions";
import type { MappedCsvRow } from "@/lib/csv-import";
import type { Nicho } from "@/types";

/** Flags por linha (D-05/D-10/D-12), computadas no wizard a partir de
 * `fetchPreviewSupportData` (contra o banco) + `detectWithinBatchDuplicatePhones`
 * (dentro do lote) — este componente só renderiza, nunca recalcula. */
export type RowFlags = {
  duplicadoDb: boolean;
  duplicadoLote: boolean;
  nichoNovo: boolean;
  nichoBloqueado: boolean;
  telefoneInvalido: boolean;
};

/** Override do admin por linha (D-05: skip por padrão; D-12: sem nicho por padrão). */
export type RowOverride = { importarMesmoAssim: boolean; nichoOverrideId: number | null };

type PreviewRow = MappedCsvRow & { flags: RowFlags };

/** Nome do nicho usado quando o arquivo não traz essa coluna (ou vem em
 * branco) e o admin não escolhe nada no combobox inline — deixa de ser um
 * bloqueio de importação (era D-12) e vira um valor padrão editável depois,
 * a pedido do admin: a fonte de leads (scraping de Instagram) não tem como
 * saber o nicho, então ele prefere categorizar depois, olhando o perfil
 * ou conversando com o lead. */
const SEM_NICHO_FALLBACK = "A categorizar";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    overrides?: Map<number, RowOverride>;
    onToggleImportAnyway?: (rowIndex: number) => void;
    onAssignNicho?: (rowIndex: number, nichoId: number | null) => void;
    nichos?: Nicho[];
  }
}

/** 3 flags visuais travadas em 02-UI-SPEC.md (Color) — nunca a cor accent teal. */
function StatusBadges({ flags }: { flags: RowFlags }) {
  return (
    <div className="flex flex-col gap-1">
      {(flags.duplicadoDb || flags.duplicadoLote) && (
        <Badge
          variant="outline"
          className="w-fit gap-1 border-transparent"
          style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
        >
          <TriangleAlert className="size-3" />
          Duplicado
        </Badge>
      )}
      {flags.nichoNovo && (
        <Badge
          variant="outline"
          className="w-fit gap-1 border-transparent"
          style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}
        >
          <Sparkles className="size-3" />
          Novo nicho
        </Badge>
      )}
      {flags.nichoBloqueado && (
        <Badge
          variant="outline"
          className="w-fit gap-1 border-transparent"
          style={{ backgroundColor: "#E4E4E7", color: "#3F3F46" }}
        >
          <CircleAlert className="size-3" />
          Sem nicho
        </Badge>
      )}
      {flags.telefoneInvalido && (
        <Badge
          variant="outline"
          className="w-fit gap-1 border-transparent"
          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
        >
          <CircleAlert className="size-3" />
          Telefone inválido — não será importado
        </Badge>
      )}
    </div>
  );
}

const previewColumns: ColumnDef<PreviewRow>[] = [
  { accessorKey: "nome", header: "Nome" },
  { accessorKey: "telefone", header: "Telefone" },
  {
    accessorKey: "nichoNome",
    header: "Nicho",
    cell: ({ row }) => row.original.nichoNome || "—",
  },
  { accessorKey: "canal", header: "Canal" },
  { accessorKey: "origem", header: "Origem" },
  { accessorKey: "valorEstimado", header: "Valor estimado" },
  {
    accessorKey: "notas",
    header: "Notas",
    // buildNotasText (05-01) separa colunas extras com \n real, mas o <td>
    // padrão do design system usa whitespace-nowrap (table.tsx) — sem este
    // wrapper, a concatenação vira um único texto corrido na prévia,
    // contrariando a garantia "em linhas separadas" do SC #2/#4 do ROADMAP.
    // Achado em teste real de navegador (gsd-browser) após a Fase 5.
    cell: ({ row }) => (
      <span className="block max-w-xs whitespace-pre-line">{row.original.notas}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadges flags={row.original.flags} />,
  },
  {
    id: "acao",
    header: "Ação",
    // D-05/D-12: checkbox "Importar mesmo assim" (duplicado) + NichoCombobox
    // inline (bloqueado) — canal `meta`, mesmo padrão de lead-table-columns.tsx.
    cell: ({ row, table }) => {
      const r = row.original;
      const override = table.options.meta?.overrides?.get(r.rowIndex) ?? {
        importarMesmoAssim: false,
        nichoOverrideId: null,
      };
      const isDuplicate = r.flags.duplicadoDb || r.flags.duplicadoLote;

      return (
        <div className="flex flex-col gap-2">
          {isDuplicate && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 accent-[#0D9488]"
                checked={override.importarMesmoAssim}
                onChange={() => table.options.meta?.onToggleImportAnyway?.(r.rowIndex)}
              />
              Importar mesmo assim
            </label>
          )}
          {r.flags.nichoBloqueado && (
            <div className="flex max-w-[220px] flex-col gap-1">
              <NichoCombobox
                nichos={table.options.meta?.nichos ?? []}
                value={override.nichoOverrideId}
                onValueChange={(id) => table.options.meta?.onAssignNicho?.(r.rowIndex, id)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional — sem escolha, vira &quot;{SEM_NICHO_FALLBACK}&quot;.
              </p>
            </div>
          )}
        </div>
      );
    },
  },
];

type CsvImportPreviewTableProps = {
  rows: PreviewRow[];
  nichos: Nicho[];
  overrides: Map<number, RowOverride>;
  onToggleImportAnyway: (rowIndex: number) => void;
  onAssignNicho: (rowIndex: number, nichoId: number | null) => void;
  unknownNichoNames: string[];
  onImported: (batchId: string) => void;
  onBack: () => void;
};

/**
 * Passo 3 do wizard (IMPORT-01/02, D-05/D-09/D-10) — tabela de prévia com
 * TODAS as linhas do arquivo (só `getCoreRowModel`, sem sort/filtro/
 * paginação: o admin precisa ver e decidir sobre cada linha antes de
 * confirmar). Nicho deixou de bloquear a confirmação (revisão de D-12):
 * linha sem nicho no arquivo importa com o fallback SEM_NICHO_FALLBACK
 * a menos que o admin escolha um no combobox inline.
 */
export function CsvImportPreviewTable({
  rows,
  nichos,
  overrides,
  onToggleImportAnyway,
  onAssignNicho,
  unknownNichoNames,
  onImported,
  onBack,
}: CsvImportPreviewTableProps) {
  const [isPending, startTransition] = useTransition();

  const table = useReactTable({
    data: rows,
    columns: previewColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      overrides,
      onToggleImportAnyway,
      onAssignNicho,
      nichos,
    },
  });

  const duplicateCount = rows.filter((r) => r.flags.duplicadoDb || r.flags.duplicadoLote).length;
  const blockedCount = rows.filter((r) => r.flags.nichoBloqueado).length;
  const novoCount = unknownNichoNames.length;
  const invalidPhoneRows = rows.filter((r) => r.flags.telefoneInvalido);

  function handleConfirm() {
    const confirmedRows: ConfirmedImportRow[] = [];

    for (const r of rows) {
      // Telefone que não normaliza nunca pode virar lead (mesma regra do
      // cadastro manual) — exclui do lote em vez de abortar a importação
      // inteira; o admin corrige o telefone e adiciona esse lead depois.
      if (r.flags.telefoneInvalido) continue;

      const override = overrides.get(r.rowIndex) ?? {
        importarMesmoAssim: false,
        nichoOverrideId: null,
      };
      const isDuplicate = r.flags.duplicadoDb || r.flags.duplicadoLote;
      // D-05: linha duplicada só entra se o admin marcou "Importar mesmo assim".
      if (isDuplicate && !override.importarMesmoAssim) continue;

      let nichoNome = r.nichoNome.trim();
      if (r.flags.nichoBloqueado) {
        // Nicho deixou de ser obrigatório na importação: se o admin
        // escolheu um no combobox inline, usa esse; senão cai no fallback
        // "A categorizar" (nunca pula a linha por falta de nicho).
        const resolved =
          override.nichoOverrideId !== null
            ? nichos.find((s) => s.id === override.nichoOverrideId)
            : undefined;
        nichoNome = resolved ? resolved.nome : SEM_NICHO_FALLBACK;
      }

      confirmedRows.push({
        nome: r.nome,
        telefone: r.telefone,
        canal: r.canal,
        origem: r.origem,
        valorEstimado: r.valorEstimado,
        notas: r.notas,
        nichoNome,
      });
    }

    startTransition(async () => {
      const result = await bulkImportLeads(confirmedRows);
      if (result.success) {
        toast.success(`${result.count} leads importados com sucesso.`);
        if (invalidPhoneRows.length > 0) {
          toast.warning(
            `${invalidPhoneRows.length} pulados por telefone inválido: ${invalidPhoneRows
              .map((r) => r.nome || "(sem nome)")
              .join(", ")}. Corrija e adicione manualmente depois.`
          );
        }
        onImported(result.batchId);
      } else {
        toast.error(result.message || "Não foi possível importar os leads. Tente novamente.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-[#F4F4F5] p-4">
        <h2 className="text-[20px] leading-tight font-semibold">Revise antes de importar</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} leads no arquivo · {duplicateCount} duplicados · {novoCount} nichos
          novos · {blockedCount} sem nicho · {invalidPhoneRows.length} telefone inválido
        </p>
        {novoCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {novoCount} nichos novos serão criados: {unknownNichoNames.join(", ")}
          </p>
        )}
        {invalidPhoneRows.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {invalidPhoneRows.length} leads com telefone inválido NÃO serão importados:{" "}
            {invalidPhoneRows.map((r) => r.nome || "(sem nome)").join(", ")} — corrija o telefone e
            adicione depois manualmente.
          </p>
        )}
        {blockedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {blockedCount} leads sem nicho no arquivo serão importados como &quot;
            {SEM_NICHO_FALLBACK}&quot; — edite depois, um por um ou aos poucos.
          </p>
        )}
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
          Voltar ao mapeamento
        </Button>
        <Button
          type="button"
          className="bg-[#0D9488] text-white hover:bg-[#0D9488]/90"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? "Importando..." : "Confirmar importação"}
        </Button>
      </div>
    </div>
  );
}
