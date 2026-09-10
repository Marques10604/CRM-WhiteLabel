// Loader de teste: redireciona o bare specifier `server-only` para um módulo
// vazio (`server-only-stub.mjs`).
//
// Encadeado com `ts-alias-loader.mjs`. Qualquer especificador que não seja
// exatamente `server-only` é delegado intacto para o próximo loader da cadeia.
// Ver `server-only-stub.mjs` para o porquê.
import { pathToFileURL } from "node:url";
import path from "node:path";

const STUB_URL = pathToFileURL(
  path.join(import.meta.dirname, "server-only-stub.mjs")
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
