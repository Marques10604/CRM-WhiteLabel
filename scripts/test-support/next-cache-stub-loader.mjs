// Loader de teste: redireciona `next/cache` para `next-cache-stub.mjs`.
//
// Encadeado com `ts-alias-loader.mjs` (que resolve o alias "@/"). Registrar
// DEPOIS do ts-alias-loader para que este execute primeiro; qualquer
// especificador que não seja exatamente "next/cache" é delegado intacto para
// o próximo loader da cadeia.
import { pathToFileURL } from "node:url";
import path from "node:path";

const STUB_URL = pathToFileURL(
  path.join(import.meta.dirname, "next-cache-stub.mjs")
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") {
    return { url: STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
