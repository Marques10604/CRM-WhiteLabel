/**
 * Contrato monetário do CRM: dinheiro é sempre armazenado como integer centavos
 * (nunca float), formatado como R$ apenas na camada de exibição.
 *
 * parseBRLToCents faz PRÉ-VALIDAÇÃO ESTRITA antes de qualquer strip de caractere:
 * se a string contiver qualquer coisa fora de "R$", espaço, dígito, "." ou ",",
 * ela é rejeitada como NaN — nunca reduzida silenciosamente a um número parcial
 * (ex.: "abc1" -> NaN, nunca "1").
 */

// Prefixo opcional "R$", espaços, dígitos, "." (milhar) e "," (decimal) — nada mais.
const STRICT_BRL_PATTERN = /^\s*(R\$)?\s*[\d.,]+\s*$/;

export function parseBRLToCents(input: string): number {
  const s = input.trim();
  if (s === "") return NaN;

  if (!STRICT_BRL_PATTERN.test(s)) return NaN;

  // Remove prefixo "R$" e todos os espaços.
  let cleaned = s.replace(/R\$/g, "").replace(/\s/g, "");
  // Remove todos os "." (separador de milhar pt-BR).
  cleaned = cleaned.replace(/\./g, "");
  // Troca "," (separador decimal pt-BR) por "." (decimal JS).
  cleaned = cleaned.replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return NaN;

  const [intPartRaw, fracPartRaw] = cleaned.split(".");
  const intPart = intPartRaw === "" ? "0" : intPartRaw;

  if (fracPartRaw === undefined) {
    // Sem separador decimal: inteiro sem decimal = reais inteiros.
    return parseInt(intPart, 10) * 100;
  }

  // Padright a fração para 3 dígitos para decidir round-half-up no centavo.
  const fracPadded = (fracPartRaw + "000").slice(0, 3);
  const hundredths = parseInt(fracPadded.slice(0, 2), 10);
  const thirdDigit = parseInt(fracPadded[2], 10);
  const roundUp = thirdDigit >= 5 ? 1 : 0;

  return parseInt(intPart, 10) * 100 + hundredths + roundUp;
}

export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
