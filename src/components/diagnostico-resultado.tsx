import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

import { AchadoTipoBadge } from "@/components/achado-tipo-badge";
import { VereditoSugeridoChip } from "@/components/veredito-sugerido-chip";
import { RascunhoMensagem } from "@/app/campanhas/[id]/_components/rascunho-mensagem";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { urlSegura, type Diagnostico } from "@/lib/ai/diagnostico-schema";

/**
 * Render do objeto de diagnóstico JÁ validado (Server Component). Não faz query
 * nem valida — recebe tudo por prop.
 *
 * Regras materializadas aqui:
 *  - DIAGNOSTICO-07: `dado_quantificavel` × `alegacao_marketing` distinguidos em
 *    3 eixos — cor e ícone (via `AchadoTipoBadge`) MAIS o tratamento do texto da
 *    afirmação (pleno × `italic text-muted-foreground`).
 *  - D-23-06: as consultas REAIS executadas (`buscas`, persistidas em
 *    `diagnosticos.buscas`) aparecem, uma por linha, como texto puro em fonte
 *    monoespaçada — nunca links.
 *  - D-23-07: `aviso` é uma ressalva não-fatal de uma geração VÁLIDA — exibida
 *    como nota discreta, jamais como erro.
 *  - T-23-02: toda URL vinda do modelo passa por `urlSegura` antes de virar
 *    `href`; reprovada, vira texto inerte.
 *  - `--primary` é usado em exatamente 2 lugares: os links de fonte e a borda de
 *    acento do gatilho mais forte.
 */

type DiagnosticoResultadoProps = {
  diagnostico: Diagnostico;
  fontes: { url: string; title?: string }[];
  criadoEm: Date;
  inputTokens: number | null;
  outputTokens: number | null;
  buscas: string[] | null;
  aviso: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Link externo com allowlist de esquema (T-23-02). Se `urlSegura` reprova a URL
 * (ex.: `javascript:`), renderiza o texto SEM `href` — inerte. Único ponto do
 * arquivo com `href`.
 */
function LinkExterno({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  if (!urlSegura(url)) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-4 transition-colors hover:underline"
    >
      {children}
    </a>
  );
}

function BlocoTitulo({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

export function DiagnosticoResultado({
  diagnostico,
  fontes,
  criadoEm,
  inputTokens,
  outputTokens,
  buscas,
  aviso,
}: DiagnosticoResultadoProps) {
  const {
    indice_saturacao,
    gatilhos_dor,
    objecoes,
    ticket_medio,
    achados,
    veredito_sugerido,
  } = diagnostico;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Linha de metadados — o custo é sempre visível (DIAGNOSTICO-10) */}
      <p className="font-mono text-xs text-muted-foreground">
        gerado em {format(criadoEm, "dd/MM/yyyy HH:mm")} · {fontes.length} fontes
        · {inputTokens ?? "—"}+{outputTokens ?? "—"} tokens ·{" "}
        {buscas?.length ?? "—"} buscas
      </p>

      {/* 2. Consultas executadas (D-23-06) — texto puro, nunca links */}
      {buscas && buscas.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {buscas.map((query, i) => (
            <span
              key={i}
              className="font-mono text-xs text-muted-foreground"
            >
              buscando: {query}
            </span>
          ))}
        </div>
      ) : null}

      {/* 3. Ressalva não-fatal (D-23-07) — geração válida com observação */}
      {aviso ? (
        <p className="text-xs text-muted-foreground">Ressalva: {aviso}</p>
      ) : null}

      {/* 4. Saturação — único número-herói da seção, sem cor semântica */}
      <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
        <span className="text-xl font-mono font-semibold tabular-nums text-foreground">
          {indice_saturacao.concorrentes_diretos}
        </span>
        <span className="text-xs text-muted-foreground">
          Concorrentes diretos encontrados
        </span>
        <p className="text-sm">{indice_saturacao.leitura}</p>
      </div>

      {/* 5. Gatilhos de dor — o mais forte é a única borda de acento */}
      <div className="flex flex-col gap-3">
        <BlocoTitulo>Gatilhos de dor</BlocoTitulo>
        {gatilhos_dor.map((g, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-card p-4",
              g.mais_forte && "border-primary",
            )}
          >
            {g.mais_forte ? (
              <Badge
                variant="outline"
                className="border-transparent shrink-0 bg-status-neutral text-status-neutral-foreground"
              >
                Mais forte
              </Badge>
            ) : null}
            <p className="text-sm">{g.gatilho}</p>
            <LinkExterno url={g.observavel_em}>
              {dominio(g.observavel_em)}
              <ExternalLink aria-hidden="true" className="size-3" />
            </LinkExterno>
          </div>
        ))}
      </div>

      {/* 6. Objeções esperadas */}
      <div className="flex flex-col gap-3">
        <BlocoTitulo>Objeções esperadas</BlocoTitulo>
        {objecoes.map((o, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{o.objecao}</p>
            <p className="text-sm text-muted-foreground">
              Resposta sugerida: {o.resposta_sugerida}
            </p>
          </div>
        ))}
      </div>

      {/* 7. Ticket médio estimado */}
      <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
        <BlocoTitulo>Ticket médio estimado</BlocoTitulo>
        <span className="font-mono text-base tabular-nums">
          {brl.format(ticket_medio.valor_estimado_brl)}
        </span>
        <p className="text-sm text-muted-foreground">
          Base: {ticket_medio.base}
        </p>
        <LinkExterno url={ticket_medio.fonte_url}>
          {dominio(ticket_medio.fonte_url)}
          <ExternalLink aria-hidden="true" className="size-3" />
        </LinkExterno>
      </div>

      {/* 8. Achados — distinção dado × relato × alegação no 3º eixo (o texto,
             D-23-06): dado_quantificavel pleno, relato_qualitativo muted
             sem itálico (real, mas não é medição de mercado), alegacao_marketing
             itálico + muted (copy de venda, o mais de-enfatizado dos 3) */}
      <div className="flex flex-col gap-2">
        <BlocoTitulo>Achados</BlocoTitulo>
        {achados.map((a, i) => (
          <div key={i} className="flex flex-col gap-1">
            <AchadoTipoBadge tipo={a.tipo} />
            <p
              className={cn(
                "text-sm",
                a.tipo === "alegacao_marketing"
                  ? "italic text-muted-foreground"
                  : a.tipo === "relato_qualitativo"
                    ? "text-muted-foreground"
                    : "text-foreground",
              )}
            >
              {a.afirmacao}
            </p>
            <LinkExterno url={a.fonte_url}>
              {dominio(a.fonte_url)}
              <ExternalLink aria-hidden="true" className="size-3" />
            </LinkExterno>
          </div>
        ))}
      </div>

      {/* 9. Rascunho de 1ª mensagem */}
      <div className="flex flex-col gap-2">
        <BlocoTitulo>Rascunho de 1ª mensagem</BlocoTitulo>
        <RascunhoMensagem rascunho={diagnostico.rascunho_primeira_mensagem} />
      </div>

      {/* 10. Veredito — sempre rotulado como sugestão não vinculante */}
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
        <span className="text-xs text-muted-foreground">
          Sugestão da IA (não vinculante)
        </span>
        <VereditoSugeridoChip decisao={veredito_sugerido.decisao} />
        <p className="text-sm">{veredito_sugerido.justificativa}</p>
        <p className="text-xs text-muted-foreground">
          É insumo para a sua decisão. O veredito final é registrado por você.
        </p>
      </div>

      {/* 11. Fontes — todas as citações reais de res.sources */}
      <div className="flex flex-col gap-2">
        <BlocoTitulo>Fontes</BlocoTitulo>
        {fontes.map((f, i) => (
          <LinkExterno key={i} url={f.url}>
            {dominio(f.url)}
            <ExternalLink aria-hidden="true" className="size-3" />
          </LinkExterno>
        ))}
      </div>
    </div>
  );
}
