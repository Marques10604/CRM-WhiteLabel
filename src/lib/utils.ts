import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma taxa de conversão crua (0..1, vinda de `computeTaxaConversao`)
 * como porcentagem inteira arredondada — compartilhado entre `/relatorios`,
 * o painel da campanha (plano 24-03) e o Mapa de Nichos (plano 24-04), para
 * as três superfícies não divergirem em 3 cópias do mesmo arredondamento.
 *
 * `total === 0` já vira `0` em `computeTaxaConversao` antes de chegar aqui —
 * esta função, portanto, nunca produz `NaN%`.
 */
export function formatarTaxaConversao(taxa: number): string {
  return `${Math.round(taxa * 100)}%`
}
