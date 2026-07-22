/**
 * Contrato de encoding do CRM (IMPORT-03, D-03): detecta automaticamente se um
 * arquivo CSV enviado pelo admin está em UTF-8 (com ou sem BOM — típico de
 * exportação do Google Sheets) ou windows-1252 (típico de exportação do Excel
 * pt-BR), e devolve o texto já decodificado, pronto para o PapaParse. O
 * PapaParse NÃO detecta encoding sozinho (só delimitador) — esse sniff
 * precisa rodar ANTES de qualquer Papa.parse().
 */
export async function decodeCsvFile(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  // 1. BOM UTF-8 (EF BB BF) — sinal de 100% de confiança quando presente.
  // TextDecoder("utf-8") remove o BOM automaticamente (evita o quirk do
  // PapaParse #840 no primeiro header quando o BOM não é removido antes).
  const hasUtf8Bom =
    buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
  if (hasUtf8Bom) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  // 2. Prova estrita de validade UTF-8: {fatal:true} lança em qualquer
  //    sequência de bytes que não seja UTF-8 válido (ex.: 0xE9 solto de "é"
  //    em windows-1252/latin-1).
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // 3. Fallback: encoding comum de exportação do Excel pt-BR.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
