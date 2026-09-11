import "server-only";

/**
 * Núcleo de geração do Diagnóstico de IA da Campanha (Fase 23).
 *
 * `gerarDiagnostico()` é uma função PURA e DB-free: recebe os dados da campanha,
 * faz uma chamada única ao modelo com a tool de busca web, valida o retorno
 * contra `diagnosticoSchema` (via `Output.object`) e aplica o gate de zero
 * fontes lendo as citações REAIS da tool (`res.sources`) — nunca as URLs que o
 * modelo escreveu dentro do objeto. Quem persiste é a Server Action (plano
 * 23-04); o eval (plano 23-06) chama esta função direto, sem banco.
 *
 * O marcador de módulo servidor na primeira linha impede que este arquivo seja
 * importado por um Client Component (a chave de API vazaria para o bundle do
 * browser — mitigação T-23-01).
 *
 * REGRA DE LOG (mitigação T-23-08): nenhum `console.*` deste arquivo imprime o
 * ambiente, a chave de API nem o objeto de requisição completo — só a allowlist
 * de campos (`tentativa`, `finishReason`, `cause`, prefixo de `text`, `usage`).
 */

import {
  generateText,
  Output,
  NoObjectGeneratedError,
  isStepCount,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import {
  diagnosticoSchema,
  filtrarFontes,
  type Diagnostico,
} from "./diagnostico-schema";
import {
  SYSTEM_PROMPT,
  montarUserPrompt,
  type CampanhaInput,
} from "./diagnostico-prompt";

/** Tentativas totais (retry manual de schema/zero-fontes, separado de `maxRetries`). */
const MAX_TENTATIVAS = 2;

/** Instrução extra concatenada ao user prompt a partir da 2ª tentativa. */
const REFORCO_RETRY =
  "\n\nA tentativa anterior falhou. Faça pelo menos 3 buscas reais, confirme cada URL, e marque exatamente um gatilho como mais_forte.";

/** Lançado quando a geração não produziu nenhuma fonte real da web (DIAGNOSTICO-02). */
export class DiagnosticoSemFonteError extends Error {
  constructor(mensagem = "Diagnóstico sem nenhuma fonte da web — rejeitado.") {
    super(mensagem);
    this.name = "DiagnosticoSemFonteError";
  }
}

/** Lançado quando todas as tentativas falharam em produzir um objeto válido. */
export class DiagnosticoInvalidoError extends Error {
  constructor(
    mensagem = "O diagnóstico não pôde ser gerado num formato válido.",
  ) {
    super(mensagem);
    this.name = "DiagnosticoInvalidoError";
  }
}

type GerarDiagnosticoResultado = {
  diagnostico: Diagnostico;
  fontes: { url: string; title?: string }[];
  uso: { inputTokens: number; outputTokens: number };
  buscas: string[];
  avisoCrossCheck: string | null;
};

type GerarDiagnosticoOpcoes = {
  /** Só para o spike (23-04) e o eval (23-06); a Server Action não passa isto. */
  onTelemetria?: (dados: unknown) => void;
};

export async function gerarDiagnostico(
  input: CampanhaInput,
  opcoes?: GerarDiagnosticoOpcoes,
): Promise<GerarDiagnosticoResultado> {
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    // Reset por tentativa (fix CR-02, 23-REVIEW.md): se ficasse fora do loop,
    // uma 2ª tentativa bem-sucedida carregaria junto as buscas da 1ª
    // tentativa descartada, corrompendo a coluna de auditoria
    // diagnosticos.buscas (DIAGNOSTICO-10) e podendo disparar falso-positivo
    // no gate MAX_USES do eval (scripts/eval-diagnostico.mjs).
    const buscasTentativa: string[] = [];
    try {
      const res = await generateText({
        // ID = alias = snapshot pinado; NÃO existe forma datada claude-sonnet-5-YYYYMMDD.
        model: anthropic("claude-sonnet-5"),
        // SEM `temperature`: medido no spike do plano 23-04 (D-23-04) — o
        // provider ignora o parâmetro no claude-sonnet-5 e emite um warning
        // ("temperature is not supported ... and will be ignored"). Assumption
        // A3 do 23-RESEARCH.md FALHOU; deixar o parâmetro aqui era ruído morto.
        // Folga deliberada para os tokens de adaptive thinking do Sonnet 5, que
        // contam contra este teto (Pitfall 9). Medido em 3 chamadas reais do
        // spike do 23-04: outputTokens entre 2698 e 5279 de 16000,
        // finishReason sempre "stop" — teto mantido com folga confirmada
        // (D-23-04), nenhuma chamada chegou perto do limite.
        maxOutputTokens: 16000,
        // Cobre só erro de transporte 429/5xx, NÃO falha de schema.
        maxRetries: 2,
        // Corta latência e tokens de raciocínio; repasse confirmado no spike
        // 23-04 (chega como `output_config.effort` no corpo real da request;
        // sem warning/rejeição do provider — assumption A2 confirmada).
        providerOptions: { anthropic: { effort: "low" } },
        system: SYSTEM_PROMPT,
        prompt: montarUserPrompt(input) + (tentativa > 1 ? REFORCO_RETRY : ""),
        tools: {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: 6, // teto de custo (mitigação T-23-04)
            userLocation: { type: "approximate", country: "BR" },
          }),
        },
        // Saída estruturada via `Output.object` DENTRO de `generateText` — a
        // função dedicada de objeto não aceita `tools` (Pitfall 1 do RESEARCH).
        output: Output.object({ schema: diagnosticoSchema }),
        // O passo que emite o objeto conta como step (Pitfall 2).
        stopWhen: isStepCount(10),
        onStepFinish: (step) => {
          for (const chamada of step.toolCalls) {
            // Programação defensiva: se o campo da query não for `input.query`,
            // o array fica vazio e nada quebra (DIAGNOSTICO-10 perde detalhe).
            if (
              chamada.toolName === "web_search" &&
              chamada.input &&
              typeof chamada.input === "object" &&
              "query" in chamada.input
            ) {
              buscasTentativa.push(
                String((chamada.input as { query: unknown }).query),
              );
            }
          }
        },
      });

      if (opcoes?.onTelemetria) {
        opcoes.onTelemetria({
          finishReason: res.finishReason,
          usage: res.usage,
          steps: res.steps.length,
          toolCallsBrutos: res.steps[0]?.toolCalls ?? [],
        });
      }

      // 1. GATE DIAGNOSTICO-02 — lê as citações reais da tool (res.sources),
      //    nunca as URLs escritas pelo modelo no objeto (Pitfall 3, T-23-06).
      const fontes = filtrarFontes(res.sources);
      if (fontes.length === 0) throw new DiagnosticoSemFonteError();

      const diagnostico = res.output as Diagnostico;

      // 2. Cross-check FM2 — conta URLs citadas no objeto ausentes das fontes
      //    reais. Não bloqueia (já resta >= 1 fonte real pelo gate acima); a
      //    Server Action grava o aviso em `diagnosticos.aviso` (D-23-07).
      const urlsReais = new Set(fontes.map((f) => f.url));
      const urlsCitadas: string[] = [
        ...diagnostico.achados.map((a) => a.fonte_url),
        diagnostico.ticket_medio.fonte_url,
        ...diagnostico.gatilhos_dor.map((g) => g.observavel_em),
        ...diagnostico.indice_saturacao.fontes,
      ];
      const foraDasFontes = urlsCitadas.filter(
        (u) => !urlsReais.has(u),
      ).length;
      const avisoCrossCheck =
        foraDasFontes > 0
          ? `${foraDasFontes} URL(s) citada(s) no diagnóstico não constam nas fontes reais da busca.`
          : null;

      // 3.
      return {
        diagnostico,
        fontes,
        uso: {
          inputTokens: res.usage.inputTokens ?? 0,
          outputTokens: res.usage.outputTokens ?? 0,
        },
        buscas: buscasTentativa,
        avisoCrossCheck,
      };
    } catch (err) {
      ultimoErro = err;
      if (NoObjectGeneratedError.isInstance(err)) {
        console.error("[diagnostico] objeto inválido", {
          tentativa,
          finishReason: err.finishReason,
          cause: err.cause,
          text: err.text?.slice(0, 500),
          usage: err.usage,
        });
        continue;
      }
      if (err instanceof DiagnosticoSemFonteError) {
        console.warn("[diagnostico] zero fontes", { tentativa });
        continue;
      }
      // Erro de API que já esgotou maxRetries — sobe.
      throw err;
    }
  }

  throw new DiagnosticoInvalidoError(
    `Falhou após ${MAX_TENTATIVAS} tentativas: ${String(ultimoErro)}`,
  );
}
