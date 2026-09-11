/**
 * Contrato anti-genérico do Diagnóstico de IA da Campanha (Fase 23).
 *
 * Este arquivo materializa em asserções Zod as regras dos requisitos
 * DIAGNOSTICO-02..09 — é o CONTRATO DE SAÍDA do LLM. O AI SDK converte
 * `diagnosticoSchema` em JSON schema, injeta como formato de resposta e
 * re-valida o retorno; qualquer objeto fora da forma vira `NoObjectGeneratedError`.
 *
 * Mapa bloco -> requisito:
 *  - `indice_saturacao`            -> DIAGNOSTICO-03 (contagem numérica de concorrentes)
 *  - `gatilhos_dor`               -> DIAGNOSTICO-04 (até 3, exatamente 1 "mais forte")
 *  - `objecoes`                   -> DIAGNOSTICO-05 (2 a 3, com resposta sugerida)
 *  - `ticket_medio`              -> DIAGNOSTICO-06 (valor + base + fonte)
 *  - `achados`                    -> DIAGNOSTICO-07 (>= 3, cada um dado/relato/marketing)
 *  - `rascunho_primeira_mensagem` -> DIAGNOSTICO-08 (texto editável)
 *  - `veredito_sugerido`         -> DIAGNOSTICO-09 (sugestão, nunca vinculante)
 *
 * AJUSTE ESTRUTURAL (plano 23-06, investigação da não-discriminação dos 3 gold):
 * o juiz do eval apontou, nas 2 primeiras execuções reais, que relatos anedóticos
 * únicos e reais (1 reclamação no Reclame Aqui, 1 post no GetNinjas) estavam sendo
 * marcados "dado_quantificavel" por falta de uma 3ª categoria — o enum binário
 * original (dado_quantificavel / alegacao_marketing) força essa dicotomia falsa,
 * porque um relato real claramente não é "alegacao_marketing" (não é copy de venda
 * do concorrente), então o modelo empurrava tudo que sobrava para
 * "dado_quantificavel". `tipoAchado` ganha "relato_qualitativo" (item 3), e
 * `gatilhos_dor` ganha o campo `evidencia` para que a força do gatilho dependa de
 * uma categoria de evidência formal, não de julgamento livre do modelo.
 *
 * RESTRIÇÃO DURA DE IMPORTS (Pitfall 10 do 23-RESEARCH.md): este arquivo só
 * pode importar zod. É proibido — direta ou transitivamente — o marcador de
 * módulo-servidor, o pacote do AI SDK, o provider Anthropic, o cliente de banco
 * Drizzle, o schema Drizzle ou qualquer componente React. O harness
 * scripts/test-diagnostico-estrutural.cjs importa este módulo FORA do bundler
 * do Next: o marcador de módulo-servidor lançaria, o cliente de banco abriria o
 * data/crm.db real. A chamada ao SDK vive em src/lib/ai/gerar-diagnostico.ts.
 */
import { z } from "zod";

/**
 * Mensagem literal do `.refine` de `diagnosticoSchema`. Extraída para constante
 * nomeada (idioma de `CAMPANHA_JANELA_INVALIDA_MSG` em `src/lib/validations.ts`)
 * para que o harness possa asserir a regra sem duplicar a string.
 */
export const GATILHO_MAIS_FORTE_MSG =
  "Exatamente um gatilho deve ser marcado como mais_forte";

/**
 * Mensagem do 2º `.refine` de `diagnosticoSchema` — o gatilho `mais_forte` não
 * pode se apoiar só num relato isolado quando existe, no mesmo array, algum
 * gatilho com evidência de padrão confirmado (mais de uma fonte/instância do
 * mesmo problema). Extraída para constante pelo mesmo motivo de
 * `GATILHO_MAIS_FORTE_MSG` — o harness precisa asserir a regra sem duplicar a
 * string.
 */
export const GATILHO_MAIS_FORTE_EVIDENCIA_MSG =
  "O gatilho mais_forte não pode ter evidencia relato_isolado quando existe algum gatilho com evidencia padrao_confirmado no array";

/** Mensagem do gate de fontes (DIAGNOSTICO-02) — ver `assertTemFonte`. */
export const DIAGNOSTICO_SEM_FONTE_MSG =
  "Diagnóstico sem nenhuma fonte da web — rejeitado.";

// DIAGNOSTICO-07 — 3 categorias (não mais 2): "dado_quantificavel" é reservada a
// contagem/preço MEDIDO; "relato_qualitativo" é um relato real de 1 fonte
// identificável (reclamação, review, post) que NÃO é uma medição de mercado;
// "alegacao_marketing" é copy de venda do próprio concorrente sobre si mesmo.
const tipoAchado = z.enum([
  "dado_quantificavel",
  "relato_qualitativo",
  "alegacao_marketing",
]);

const achado = z.object({
  afirmacao: z.string().min(10).max(400),
  tipo: tipoAchado,
  fonte_url: z.string().url(), // toda afirmação carrega a URL que a sustenta
});

const objecao = z.object({
  objecao: z.string().min(5).max(300),
  resposta_sugerida: z.string().min(10).max(600),
});

export const diagnosticoSchema = z
  .object({
    indice_saturacao: z.object({
      concorrentes_diretos: z.number().int().nonnegative(), // DIAGNOSTICO-03: contagem real
      // max 750 (D-23-04): 300 era estimativa do 23-01, sem chamada real.
      // O spike mediu 396-490+ caracteres em chamadas reais sucessivas
      // (variação normal entre chamadas). O prompt agora pede explicitamente
      // até 480 caracteres (diagnostico-prompt.ts); este teto é a REDE DE
      // SEGURANÇA do schema, com folga sobre o alvo do prompt — não o alvo em si.
      leitura: z.string().min(10).max(750),
      fontes: z.array(z.string().url()).min(1),
    }),
    gatilhos_dor: z
      .array(
        z.object({
          gatilho: z.string().min(10).max(300),
          observavel_em: z.string().url(),
          // "padrao_confirmado": mais de uma fonte/instância independente mostra
          // o mesmo problema (ex.: várias reclamações do mesmo tipo, ou um dado
          // quantificável sustentando a dor). "relato_isolado": só 1 fonte, 1
          // ocorrência — pode ser real, mas não é um padrão de mercado.
          evidencia: z.enum(["padrao_confirmado", "relato_isolado"]),
          mais_forte: z.boolean(),
        }),
      )
      .min(1)
      .max(3), // DIAGNOSTICO-04: até 3, o mais forte destacado
    objecoes: z.array(objecao).min(2).max(3), // DIAGNOSTICO-05
    ticket_medio: z.object({
      valor_estimado_brl: z.number().positive(),
      base: z.string().min(10).max(400), // DIAGNOSTICO-06: a base/fonte usada
      fonte_url: z.string().url(),
    }),
    achados: z.array(achado).min(3), // pool de achados marcados dado/marketing
    rascunho_primeira_mensagem: z.string().min(40).max(1200), // DIAGNOSTICO-08, editável
    veredito_sugerido: z.object({
      decisao: z.enum(["aprofundar", "mudar_angulo", "abandonar"]), // DIAGNOSTICO-09
      // max 1400 (D-23-04): 800 era estimativa do 23-01. O spike mediu
      // 796-1150+ caracteres em chamadas reais sucessivas (variação normal).
      // O prompt agora pede explicitamente até 850 caracteres
      // (diagnostico-prompt.ts); este teto é a REDE DE SEGURANÇA do schema,
      // com folga sobre o alvo do prompt — não o alvo em si.
      justificativa: z.string().min(20).max(1400),
    }),
  })
  // Os `.refine` NÃO vão no JSON schema enviado ao modelo, mas o SDK os checa no
  // retorno -> `NoObjectGeneratedError` se violados. As regras também são
  // repetidas em texto no prompt (Pitfall 7 do 23-RESEARCH.md).
  .refine(
    (d) => d.gatilhos_dor.filter((g) => g.mais_forte).length === 1,
    { message: GATILHO_MAIS_FORTE_MSG },
  )
  // Ajuste estrutural (plano 23-06): o gatilho mais_forte não pode se apoiar só
  // num relato_isolado quando existe, no mesmo array, algum gatilho com
  // evidencia padrao_confirmado — a força tem que vir da evidência mais robusta
  // disponível, nunca de julgamento livre do modelo sobre "o que parece mais
  // forte". Se NENHUM gatilho do array tem padrao_confirmado, um relato_isolado
  // pode ser o mais_forte (é a melhor evidência disponível).
  .refine(
    (d) => {
      const temPadraoConfirmado = d.gatilhos_dor.some(
        (g) => g.evidencia === "padrao_confirmado",
      );
      if (!temPadraoConfirmado) return true;
      const maisForte = d.gatilhos_dor.find((g) => g.mais_forte);
      return maisForte ? maisForte.evidencia !== "relato_isolado" : true;
    },
    { message: GATILHO_MAIS_FORTE_EVIDENCIA_MSG },
  );

export type Diagnostico = z.infer<typeof diagnosticoSchema>;

/**
 * Filtra o array `result.sources` do AI SDK para só as citações de URL reais.
 * O gate DIAGNOSTICO-02 lê DAQUI, nunca das URLs que o modelo escreveu dentro
 * do objeto (Pitfall 4 do 23-RESEARCH.md — o modelo pode alucinar URLs mesmo
 * com a tool de busca ligada).
 */
export function filtrarFontes(
  sources: { sourceType: string; url?: string; title?: string }[],
): { url: string; title?: string }[] {
  return sources
    .filter((s) => s.sourceType === "url" && typeof s.url === "string")
    .map((s) => ({ url: s.url as string, title: s.title }));
}

/**
 * Gate de fontes (DIAGNOSTICO-02): lança `Error` quando o diagnóstico não tem
 * nenhuma fonte da web. Um resultado sem fundamento é falha crítica — a UI
 * mostra o erro, nunca um resultado.
 */
export function assertTemFonte(fontes: { url: string; title?: string }[]): void {
  if (fontes.length === 0) {
    throw new Error(DIAGNOSTICO_SEM_FONTE_MSG);
  }
}

/**
 * Allowlist de esquema de URL para XSS (controle T-23-02). As URLs do
 * diagnóstico são autoradas pelo LLM e viram `href` na UI (plano 23-05).
 * `z.string().url()` do Zod NÃO basta: ele aceita `javascript:` e `data:`.
 * Este helper só devolve `true` para `http:` e `https:`.
 */
export function urlSegura(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:";
  } catch {
    return false;
  }
}
