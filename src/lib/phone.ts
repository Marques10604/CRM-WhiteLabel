/**
 * Contrato de telefone do CRM: normaliza qualquer formatação (parênteses, hífen,
 * espaços, "+") para dígitos-only com DDI 55 (Brasil), pronto para uso em
 * wa.me (Fase 4). Retorna null se o número não puder ser normalizado para um
 * comprimento válido (12 dígitos = 55 + DDD + fixo 8 dígitos; 13 dígitos =
 * 55 + DDD + móvel 9 dígitos).
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let result: string;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    // Já tem DDI 55, não duplicar.
    result = digits;
  } else if (digits.length === 10 || digits.length === 11) {
    // Fixo (DDD 2 + 8) ou móvel (DDD 2 + 9) sem DDI: prefixar 55.
    result = "55" + digits;
  } else {
    return null;
  }

  if (result.length === 12 || result.length === 13) return result;
  return null;
}
