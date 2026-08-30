/**
 * Contrato de mensagem WhatsApp do CRM (Fase 4, WA-02/WA-03): substituição de
 * variáveis de template ({nome}/{nicho}/{origem}) e construção do link
 * wa.me a partir de um telefone JÁ normalizado (ver `src/lib/phone.ts`).
 * Módulo puro — nenhuma limpeza/validação de telefone acontece aqui; o
 * chamador SEMPRE passa o resultado de `normalizePhone()`.
 */

export type TemplateVars = {
  nome: string;
  nicho: string;
  origem: string;
};

/**
 * Substitui todas as ocorrências de {nome}/{nicho}/{origem} no corpo do
 * template pelos valores do lead. Placeholder ausente no corpo é ignorado
 * (nenhum erro); ocorrência repetida do mesmo placeholder é substituída em
 * todas as posições via `replaceAll`.
 */
export function renderTemplate(corpo: string, vars: TemplateVars): string {
  return corpo
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{nicho}", vars.nicho)
    .replaceAll("{origem}", vars.origem);
}

/**
 * Constrói o link `wa.me` com a mensagem codificada. `telefoneNormalizado`
 * DEVE vir de `normalizePhone()` (dígitos-only, DDI 55) — nunca construir a
 * partir de texto livre não-normalizado.
 */
export function buildWaLink(telefoneNormalizado: string, message: string): string {
  return `https://wa.me/${telefoneNormalizado}?text=${encodeURIComponent(message)}`;
}
