"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampanhaEstadoBadge } from "@/components/campanha-estado-badge";
import { VereditoSugeridoChip, type VereditoDecisao } from "@/components/veredito-sugerido-chip";
import { formatarTaxaConversao } from "@/lib/utils";
import { formatCentsToBRL } from "@/lib/money";
import type { Campanha } from "@/types";

/**
 * Contrato do Mapa de Nichos (PAINEL-02/PAINEL-03, Fase 24 plano 04) — o
 * `page.tsx` (Server Component) monta este shape a partir de
 * `getResultadoPorCampanha()`/`getVereditoIAPorCampanha()` (plano 24-02) e
 * repassa como prop. Nenhum campo aqui é lido direto do banco por este
 * arquivo — ele é 100% client (D-24-06).
 */
export type MapaLinha = {
  campanhaId: number;
  nichoNome: string;
  oferta: string;
  estado: Campanha["estado"];
  vereditoIA: VereditoDecisao | null;
  vereditoFinal: VereditoDecisao | null;
  vereditoDecididoEm: Date | null;
  total: number;
  fechados: number;
  taxa: number;
  ticketMedioCentavos: number | null;
};

type FiltroVeredito = "todos" | VereditoDecisao | "sem_veredito";
type OrdenarPor = "nicho" | "veredito" | "leads" | "taxa";

const TODOS_VALUE = "todos";

const FILTRO_VEREDITO_LABEL: Record<FiltroVeredito, string> = {
  todos: "Todos",
  aprofundar: "Aprofundar",
  mudar_angulo: "Mudar o ângulo",
  abandonar: "Abandonar",
  sem_veredito: "Sem veredito",
};

const ORDENAR_POR_LABEL: Record<OrdenarPor, string> = {
  nicho: "Nicho",
  veredito: "Veredito",
  leads: "Leads",
  taxa: "Conversão",
};

// Ordem fixa da coluna de veredito (D-24-11 documenta a mesma régua para o
// filtro): aprofundar -> mudar_angulo -> abandonar -> sem veredito. Não é
// ordem alfabética — é a régua de prioridade de decisão do operador.
const VEREDITO_PESO: Record<"aprofundar" | "mudar_angulo" | "abandonar" | "sem_veredito", number> = {
  aprofundar: 0,
  mudar_angulo: 1,
  abandonar: 2,
  sem_veredito: 3,
};

function vereditoPeso(veredito: VereditoDecisao | null): number {
  return VEREDITO_PESO[veredito ?? "sem_veredito"];
}

type MapaDeNichosTableProps = {
  linhas: MapaLinha[];
};

export function MapaDeNichosTable({ linhas }: MapaDeNichosTableProps) {
  const [filtroVeredito, setFiltroVeredito] = useState<FiltroVeredito>(TODOS_VALUE);
  const [filtroNicho, setFiltroNicho] = useState<string>(TODOS_VALUE);
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("nicho");

  // Opções de nicho DERIVADAS das próprias linhas (nunca lista hardcoded) —
  // nomes únicos, ordem alfabética pt-BR.
  const opcoesNicho = useMemo(() => {
    const nomes = new Set<string>();
    for (const linha of linhas) nomes.add(linha.nichoNome);
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [linhas]);

  const linhasVisiveis = useMemo(() => {
    const filtradas = linhas.filter((linha) => {
      const passaVeredito =
        filtroVeredito === TODOS_VALUE
          ? true
          : filtroVeredito === "sem_veredito"
            ? linha.vereditoFinal === null
            : linha.vereditoFinal === filtroVeredito;
      const passaNicho = filtroNicho === TODOS_VALUE ? true : linha.nichoNome === filtroNicho;
      return passaVeredito && passaNicho;
    });

    // Ordena sobre uma CÓPIA — a prop `linhas` nunca é mutada in-place.
    const ordenadas = [...filtradas];
    switch (ordenarPor) {
      case "nicho":
        ordenadas.sort((a, b) => {
          const cmp = a.nichoNome.localeCompare(b.nichoNome, "pt-BR");
          return cmp !== 0 ? cmp : a.oferta.localeCompare(b.oferta, "pt-BR");
        });
        break;
      case "veredito":
        ordenadas.sort((a, b) => {
          const cmp = vereditoPeso(a.vereditoFinal) - vereditoPeso(b.vereditoFinal);
          return cmp !== 0 ? cmp : a.nichoNome.localeCompare(b.nichoNome, "pt-BR");
        });
        break;
      case "leads":
        ordenadas.sort((a, b) => {
          const cmp = b.total - a.total;
          return cmp !== 0 ? cmp : a.nichoNome.localeCompare(b.nichoNome, "pt-BR");
        });
        break;
      case "taxa":
        ordenadas.sort((a, b) => {
          const cmp = b.taxa - a.taxa;
          return cmp !== 0 ? cmp : b.total - a.total;
        });
        break;
    }
    return ordenadas;
  }, [linhas, filtroVeredito, filtroNicho, ordenarPor]);

  if (linhas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
        <h2 className="text-[20px] leading-tight font-semibold">
          Nenhuma campanha criada ainda
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Crie uma campanha de exploração de nicho para começar a preencher o mapa.
        </p>
        <Link href="/campanhas" className="inline-flex">
          <Button>
            <Plus className="size-4" />
            Ir para Campanhas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] leading-normal text-muted-foreground">Veredito</span>
          <Select
            value={filtroVeredito}
            onValueChange={(value) => setFiltroVeredito((value as FiltroVeredito) ?? TODOS_VALUE)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTRO_VEREDITO_LABEL) as FiltroVeredito[]).map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {FILTRO_VEREDITO_LABEL[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] leading-normal text-muted-foreground">Nicho</span>
          <Select value={filtroNicho} onValueChange={(value) => setFiltroNicho(value ?? TODOS_VALUE)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_VALUE}>Todos</SelectItem>
              {opcoesNicho.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] leading-normal text-muted-foreground">Ordenar por</span>
          <Select
            value={ordenarPor}
            onValueChange={(value) => setOrdenarPor((value as OrdenarPor) ?? "nicho")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORDENAR_POR_LABEL) as OrdenarPor[]).map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {ORDENAR_POR_LABEL[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="ml-auto self-center text-[14px] text-muted-foreground">
          {linhasVisiveis.length} de {linhas.length} campanhas
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nicho</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Veredito da IA</TableHead>
            <TableHead>Veredito final</TableHead>
            <TableHead className="text-right font-mono tabular-nums">Leads</TableHead>
            <TableHead className="text-right font-mono tabular-nums">Fechados</TableHead>
            <TableHead className="text-right font-mono tabular-nums">Conversão</TableHead>
            <TableHead className="text-right font-mono tabular-nums">Ticket médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhasVisiveis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-[14px] text-muted-foreground">
                Nenhuma campanha com esses filtros.
              </TableCell>
            </TableRow>
          ) : (
            linhasVisiveis.map((linha) => (
              <TableRow key={linha.campanhaId}>
                <TableCell>
                  <Link
                    href={`/campanhas/${linha.campanhaId}`}
                    className="flex flex-col gap-0.5 hover:underline"
                  >
                    <span className="text-foreground">{linha.nichoNome}</span>
                    <span className="text-xs text-muted-foreground">{linha.oferta}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <CampanhaEstadoBadge estado={linha.estado} />
                </TableCell>
                <TableCell>
                  {linha.vereditoIA ? (
                    <VereditoSugeridoChip decisao={linha.vereditoIA} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {linha.vereditoFinal ? (
                    <div className="flex flex-col gap-0.5">
                      <VereditoSugeridoChip decisao={linha.vereditoFinal} />
                      {linha.vereditoDecididoEm ? (
                        <span className="text-xs text-muted-foreground">
                          {format(linha.vereditoDecididoEm, "dd/MM/yyyy")}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {linha.total}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {linha.fechados}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold text-foreground">
                  {formatarTaxaConversao(linha.taxa)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {linha.ticketMedioCentavos === null
                    ? "—"
                    : formatCentsToBRL(linha.ticketMedioCentavos)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
