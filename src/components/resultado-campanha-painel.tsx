import {
  computeTaxaConversao,
  getContagemPorMotivoPerda,
  getResultadoPorCampanha,
  resolvePeriodRange,
} from "@/db/queries";
import { formatarTaxaConversao } from "@/lib/utils";
import { formatCentsToBRL } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Painel de "Resultado real" da campanha (PAINEL-01, Fase 24, plano 24-03).
 * Server Component: agrega SÓ os leads vinculados a esta campanha, sem
 * recorte de período (D-24-07 — o vínculo já é um gesto explícito do
 * operador, diferente do filtro temporal de `/relatorios`).
 *
 * Reaproveita as funções de `@/db/queries` criadas no plano 24-02 — nenhuma
 * query SQL escrita diretamente aqui.
 */
export async function ResultadoCampanhaPainel({
  campanhaId,
}: {
  campanhaId: number;
}) {
  const [resultadoPorCampanha, contagemMotivoPerda] = await Promise.all([
    getResultadoPorCampanha(campanhaId),
    getContagemPorMotivoPerda(resolvePeriodRange(undefined), campanhaId),
  ]);

  // Campanha sem lead vinculado não aparece no Map — fallback explícito.
  const resultado = resultadoPorCampanha.get(campanhaId) ?? {
    total: 0,
    fechados: 0,
    perdidos: 0,
    ticketMedioCentavos: null,
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 id="resultado-campanha-titulo" className="text-[20px] font-semibold leading-tight">
          Resultado real
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Considera só os leads vinculados a esta campanha, sem recorte de período.
        </p>
      </div>

      {resultado.total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
          <h3 className="text-base font-semibold">Nenhum lead vinculado ainda</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Para aparecer aqui, edite um lead e escolha esta campanha no campo
            &quot;Campanha&quot;.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Leads vinculados</span>
              <span className="font-mono text-lg tabular-nums text-foreground">
                {resultado.total}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Fechados</span>
              <span className="font-mono text-lg tabular-nums text-foreground">
                {resultado.fechados}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Taxa de conversão</span>
              <span className="font-mono text-lg tabular-nums text-foreground">
                {formatarTaxaConversao(computeTaxaConversao(resultado))}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Ticket médio</span>
              {resultado.ticketMedioCentavos !== null ? (
                <span className="font-mono text-lg tabular-nums text-foreground">
                  {formatCentsToBRL(resultado.ticketMedioCentavos)}
                </span>
              ) : (
                <div className="flex flex-col">
                  <span className="font-mono text-lg tabular-nums text-foreground">—</span>
                  <span className="text-xs text-muted-foreground">
                    nenhum lead fechado ainda
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] text-muted-foreground">
              Esta lista considera a data em que o lead foi movido para Perdido — leads
              perdidos antes de o CRM passar a registrar essa data não aparecem aqui, então a
              contagem pode ser menor que o número de perdidos acima.
            </p>
            {contagemMotivoPerda.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">
                Nenhum lead perdido com motivo registrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo da perda</TableHead>
                    <TableHead className="text-right font-mono tabular-nums">
                      Leads perdidos
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contagemMotivoPerda.map((linha) => (
                    <TableRow key={linha.motivoPerdaId ?? linha.nome}>
                      <TableCell className="text-foreground">{linha.nome}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-foreground">
                        {linha.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
