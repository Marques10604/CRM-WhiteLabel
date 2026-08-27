import { Suspense } from "react";

import {
  buildLinhasOrigem,
  getContagemPorMotivoPerda,
  getContagemPorOrigem,
  getContagemPorSubnicho,
  resolvePeriodRange,
} from "@/db/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodoSelector } from "@/components/periodo-selector";

/**
 * Rota `/relatorios` (METRICAS-01, METRICAS-02, PERDA-01) — superfície ÚNICA
 * de leitura, sem nenhuma ação/CTA (11-UI-SPEC.md linha 90). Server Component
 * que resolve o preset de período, busca as três agregações num só
 * `Promise.all` e renderiza as três seções empilhadas.
 *
 * A diferença de base de data entre as seções (createdAt para origem/sub-nicho
 * conforme D-09, stageChangedAt para motivos de perda conforme D-11) está
 * encapsulada dentro das funções de `queries.ts` — a página passa o MESMO
 * `range` para as três e não replica essa lógica.
 */

const PRESETS_VALIDOS = new Set(["30d", "90d", "tudo"]);

/** Taxa já vem crua (0..1) de `computeTaxaConversao`; a página formata. `0%` quando total=0, nunca `NaN%`. */
function formatarTaxa(taxa: number): string {
  return `${Math.round(taxa * 100)}%`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  // NORMALIZAÇÃO DO PRESET — duas políticas DISTINTAS de propósito
  // (11-UI-SPEC.md linhas 162-163):
  //   • `period` AUSENTE da URL  → "30d"  — default de primeiro acesso, o
  //     preset mais útil no dia a dia (primeiro da lista de D-10).
  //   • `period` PRESENTE mas fora de {30d,90d,tudo} → "tudo" — fallback
  //     seguro de valor adulterado na URL: nunca erro 500, nunca tela
  //     quebrada (T-11-24).
  // O preset normalizado alimenta TANTO `resolvePeriodRange` QUANTO a prop
  // `value` do <PeriodoSelector>, para o gatilho do Select nunca exibir um
  // valor que a página não usou. `resolvePeriodRange` tem o próprio fallback
  // interno como segunda barreira.
  const presetNormalizado =
    period === undefined ? "30d" : PRESETS_VALIDOS.has(period) ? period : "tudo";

  const range = resolvePeriodRange(presetNormalizado);

  const [contagemOrigem, contagemSubnicho, contagemMotivoPerda] = await Promise.all([
    getContagemPorOrigem(range),
    getContagemPorSubnicho(range),
    getContagemPorMotivoPerda(range),
  ]);

  const linhasOrigem = buildLinhasOrigem(contagemOrigem);
  const origemVazia = linhasOrigem.every((linha) => linha.total === 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-tight">Relatórios</h1>
        <Suspense fallback={null}>
          <PeriodoSelector value={presetNormalizado} />
        </Suspense>
      </div>

      {/* Seção 1 — Leads por origem (METRICAS-01) */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-[20px] font-semibold leading-tight">Leads por origem</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Total de leads</TableHead>
              <TableHead>Fechados</TableHead>
              <TableHead>Taxa de conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {origemVazia ? (
              <TableRow>
                <TableCell colSpan={4} className="text-[14px] text-muted-foreground">
                  Nenhum lead neste período.
                </TableCell>
              </TableRow>
            ) : (
              // Inbound e Outbound SEMPRE presentes, mesmo com total 0
              // (`buildLinhasOrigem` garante as 2 linhas fixas, Inbound antes).
              linhasOrigem.map((linha) => (
                <TableRow key={linha.origemTipo}>
                  <TableCell className="text-foreground">{linha.label}</TableCell>
                  <TableCell className="text-foreground">{linha.total}</TableCell>
                  <TableCell className="text-foreground">{linha.fechados}</TableCell>
                  {/* Ênfase por PESO, nunca por cor (11-UI-SPEC.md linha 82). */}
                  <TableCell className="font-semibold text-foreground">
                    {formatarTaxa(linha.taxa)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {/* Seção 2 — Leads por sub-nicho (METRICAS-02) */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-[20px] font-semibold leading-tight">Leads por sub-nicho</h2>
        {contagemSubnicho.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Nenhum lead neste período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-nicho</TableHead>
                <TableHead>Total de leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* D-12: "A categorizar" é uma linha normal — sem estilo, posição
                  nem filtro especial. A ordenação (total desc, nome asc) já vem
                  pronta da query. */}
              {contagemSubnicho.map((linha) => (
                <TableRow key={linha.subnichoId}>
                  <TableCell className="text-foreground">{linha.nome}</TableCell>
                  <TableCell className="text-foreground">{linha.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Seção 3 — Motivos de perda (PERDA-01) */}
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-semibold leading-tight">Motivos de perda</h2>
          {/* Texto de ajuda OBRIGATÓRIO (D-11) — sempre visível, nunca tooltip. */}
          <p className="text-[14px] text-muted-foreground">
            Esta seção considera a data em que o lead foi movido para Perdido, não a data de criação — pode incluir leads criados fora do período selecionado acima.
          </p>
        </div>
        {contagemMotivoPerda.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">
            Nenhum lead perdido neste período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo da perda</TableHead>
                <TableHead>Leads perdidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contagemMotivoPerda.map((linha) => (
                <TableRow key={linha.motivoPerdaId ?? linha.nome}>
                  <TableCell className="text-foreground">{linha.nome}</TableCell>
                  <TableCell className="text-foreground">{linha.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
