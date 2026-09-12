import { format } from "date-fns";

import { getVereditoIAPorCampanha } from "@/db/queries";
import { VereditoSugeridoChip } from "@/components/veredito-sugerido-chip";
import { VereditoForm } from "@/app/campanhas/[id]/_components/veredito-form";
import type { VereditoFinal } from "@/lib/validations";

/**
 * Seção "Veredito" da página de detalhe da campanha (VEREDITO-01/02, Fase 24,
 * plano 24-03). Server Component: busca a sugestão da IA (geração `status=ok`
 * mais recente, plano 24-02) e renderiza lado a lado com a decisão JÁ
 * registrada do operador, seguida do formulário de registro.
 *
 * D-24-05: reusa `VereditoSugeridoChip` para os DOIS vereditos — o que
 * distingue "Sugestão da IA (não vinculante)" de "Sua decisão" é o rótulo do
 * container, não um componente novo.
 *
 * A divergência entre os dois vereditos é tratada como NORMAL (dívida técnica
 * nº 1 da Fase 23, STATE.md: a sugestão de IA varia entre execuções idênticas
 * por causa de busca adaptativa + LLM não-determinístico) — sem ícone de
 * alerta, sem cor de erro.
 */
export async function VereditoSecao({
  campanhaId,
  vereditoFinal,
  vereditoDecididoEm,
}: {
  campanhaId: number;
  vereditoFinal: VereditoFinal | null;
  vereditoDecididoEm: Date | null;
}) {
  const vereditoIAPorCampanha = await getVereditoIAPorCampanha(campanhaId);
  const vereditoIA = vereditoIAPorCampanha.get(campanhaId);

  const divergem =
    !!vereditoIA && !!vereditoFinal && vereditoIA !== vereditoFinal;

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-6">
      <h2 id="veredito-secao-titulo" className="text-[20px] font-semibold leading-tight">
        Veredito
      </h2>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sugestão da IA (não vinculante)</span>
          {vereditoIA ? (
            <VereditoSugeridoChip decisao={vereditoIA} />
          ) : (
            <span className="text-sm text-muted-foreground">Nenhum diagnóstico gerado ainda.</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sua decisão</span>
          {vereditoFinal && vereditoDecididoEm ? (
            <div className="flex items-center gap-2">
              <VereditoSugeridoChip decisao={vereditoFinal} />
              <span className="text-sm text-muted-foreground">
                registrada em {format(vereditoDecididoEm, "dd/MM/yyyy")}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Nenhum veredito registrado ainda.</span>
          )}
        </div>
      </div>

      {divergem ? (
        <p className="text-[14px] text-muted-foreground">
          Divergir da sugestão é esperado: ela vem de uma única execução de busca e pode variar
          entre gerações — quem decide é o operador.
        </p>
      ) : null}

      <VereditoForm campanhaId={campanhaId} vereditoAtual={vereditoFinal} />
    </section>
  );
}
