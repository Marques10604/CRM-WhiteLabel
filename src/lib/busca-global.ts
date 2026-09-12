/**
 * Módulo PURO da busca global (Ctrl+K), quick task 260912-pzc, BUSCA-03/BUSCA-04.
 *
 * Zero DOM, zero React, zero ORM, zero nome de tabela — só normalização de
 * texto. É essa pureza que permite ao harness `.cjs`
 * (`scripts/test-busca-global.cjs`) rodar sob Node puro, sem banco e sem DOM
 * (host de 4GB, sem framework de teste no projeto).
 *
 * T-PZC-01 (disposição: mitigate): `escaparLike` existe para que `%` e `_`
 * digitados pelo usuário sejam tratados como TEXTO LITERAL dentro de um
 * `LIKE`, nunca como curinga de SQL que varreria a tabela inteira. Quem
 * consome `padraoContem` (a Server Action `buscarGlobal`) é obrigado a
 * acompanhar todo `LIKE` de uma cláusula `ESCAPE '\'` — sem isso, o escape
 * feito aqui vira decoração inútil.
 */

/** Tamanho mínimo do termo (normalizado) para a busca ser disparada. */
export const TAMANHO_MINIMO_BUSCA = 2;

/** Quantidade máxima de resultados por grupo (Leads / Campanhas / Nichos). */
export const LIMITE_POR_GRUPO = 5;

/** `trim()` + colapsa espaços internos repetidos em um só. */
export function normalizarTermo(bruto: string): string {
  return bruto.trim().replace(/\s+/g, " ");
}

/** Verdadeiro quando o termo normalizado atinge o tamanho mínimo de busca. */
export function deveBuscar(bruto: string): boolean {
  return normalizarTermo(bruto).length >= TAMANHO_MINIMO_BUSCA;
}

/**
 * Escapa `\`, `%` e `_` com contrabarra para uso dentro de um `LIKE ...
 * ESCAPE '\'`.
 *
 * ORDEM IMPORTA: a contrabarra é escapada PRIMEIRO. Se `%`/`_` fossem
 * escapados antes, a contrabarra recém-inserida por esse escape seria
 * re-escapada no passo seguinte e o padrão viraria lixo.
 */
export function escaparLike(termo: string): string {
  return termo.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Padrão pronto para `LIKE`: normaliza, minusculiza, escapa curingas
 * digitados pelo usuário e envelopa em `%...%` (os únicos `%` que são
 * curinga de verdade).
 */
export function padraoContem(termo: string): string {
  return `%${escaparLike(normalizarTermo(termo).toLowerCase())}%`;
}

/** Extrai somente os dígitos de uma string (ex.: telefone formatado). */
export function somenteDigitos(bruto: string): string {
  return bruto.replace(/\D/g, "");
}

/** Verdadeiro quando os dígitos extraídos do termo atingem o tamanho mínimo. */
export function deveBuscarPorTelefone(bruto: string): boolean {
  return somenteDigitos(bruto).length >= TAMANHO_MINIMO_BUSCA;
}
