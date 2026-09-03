import { Suspense } from "react";

import {
  buildLinhasOrigem,
  getContagemPorMotivoPerda,
  getContagemPorOrigem,
  getContagemPorNicho,
  resolvePeriodoRelatorios,
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
 * A diferença de base de data entre as seções (createdAt para origem/nicho
 * conforme D-09, stageChangedAt para motivos de perda conforme D-11) está
 * encapsulada dentro das funções de `queries.ts` — a página passa o MESMO
 * `range` para as três e não replica essa lógica.
 */

/** Taxa já vem crua (0..1) de `computeTaxaConversao`; a página formata. `0%` quando total=0, nunca `NaN%`. */
function formatarTaxa(taxa: number): string {
  return `${Math.round(taxa * 100)}%`;
}

/**
 * No App Router um param repetido na URL (`?period=custom&period=30d`) chega
 * como `string[]`, não `string` — o tipo do Next reflete isso. Normalizamos
 * para o primeiro valor antes de passar para `resolvePeriodoRelatorios` (IN-04):
 * assim `?period=custom` repetido resolve para `custom`, não cai no fallback
 * silencioso "tudo" por comparação contra um array.
 */
function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = primeiro(params.period);
  const fromParam = primeiro(params.from);
  const toParam = primeiro(params.to);

  // NORMALIZAÇÃO DO PERÍODO — delegada INTEIRAMENTE a `resolvePeriodoRelatorios`
  // (função pura de `queries.ts`, nunca lança). Ela cobre as 3 políticas:
  //   • `period` AUSENTE → "30d" (default de primeiro acesso, 11-UI-SPEC.md).
  //   • `period` = preset clássico ("30d"/"90d"/"tudo") → passa direto.
  //   • `period` = "custom" + `from`/`to` → intervalo arbitrário (D-01..D-06);
  //     datas inválidas caem no fallback "30d" com `customInvalido: true`.
  //   • `period` adulterado → fallback SILENCIOSO "tudo" (T-11-24), sem faixa.
  // `preset` alimenta o `value` do <PeriodoSelector>; `range` alimenta as 3
  // agregações; `customInvalido` decide a faixa de aviso server-rendered (D-07).
  const { preset, range, customInvalido, from, to } = resolvePeriodoRelatorios({
    period,
    from: fromParam,
    to: toParam,
  });

  const [contagemOrigem, contagemNicho, contagemMotivoPerda] = await Promise.all([
    getContagemPorOrigem(range),
    getContagemPorNicho(range),
    getContagemPorMotivoPerda(range),
  ]);

  const linhasOrigem = buildLinhasOrigem(contagemOrigem);
  const origemVazia = linhasOrigem.every((linha) => linha.total === 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-tight">Relatórios</h1>
        <Suspense fallback={null}>
          <PeriodoSelector value={preset} from={from} to={to} />
        </Suspense>
      </div>

      {/* Faixa de aviso server-rendered (D-07) — só quando o intervalo custom
          foi REJEITADO (fim antes do início, data faltando/ilegível). Some
          sozinha no próximo período válido; sem JS, sem toast, sem client
          component. Âmbar discreto: é um aviso transitório, não um dado do
          relatório — não conflita com "ênfase por peso" das tabelas. */}
      {customInvalido ? (
        <p className="rounded-md border border-status-warning bg-status-warning px-4 py-2 text-[14px] text-status-warning-foreground">
          Intervalo inválido — mostrando os últimos 30 dias.
        </p>
      ) : null}

      {/* Seção 1 — Leads por origem (METRICAS-01) */}
      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
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

      {/* Seção 2 — Leads por nicho (METRICAS-02) */}
      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <h2 className="text-[20px] font-semibold leading-tight">Leads por nicho</h2>
        {contagemNicho.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Nenhum lead neste período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nicho</TableHead>
                <TableHead>Total de leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* D-12: "A categorizar" é uma linha normal — sem estilo, posição
                  nem filtro especial. A ordenação (total desc, nome asc) já vem
                  pronta da query. */}
              {contagemNicho.map((linha) => (
                <TableRow key={linha.nichoId}>
                  <TableCell className="text-foreground">{linha.nome}</TableCell>
                  <TableCell className="text-foreground">{linha.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Seção 3 — Motivos de perda (PERDA-01) */}
      <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
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
