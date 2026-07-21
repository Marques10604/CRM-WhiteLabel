// Loader mínimo para os scripts .cjs/.mjs de verificação: resolve o alias
// "@/..." (definido em tsconfig.json) para "src/..." dentro deste repo, para
// que os scripts de teste possam importar diretamente os módulos .ts reais
// (sem duplicar lógica) usando o suporte nativo do Node 24 a TypeScript.
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(ROOT, "src", specifier.slice(2));
    for (const ext of EXTENSIONS) {
      const candidate = base + ext;
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
    return nextResolve(pathToFileURL(base).href, context);
  }

  // Relative imports between our own .ts modules (e.g. "./schema" from
  // src/db/client.ts) are written extension-less per TS convention, but
  // Node's ESM resolver requires an explicit extension for relative
  // specifiers — it does not probe ".ts"/".tsx" the way bundlers do. Resolve
  // extension-less relative specifiers ourselves against the importing
  // module's own directory before falling back to the default resolver.
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parentPath = context.parentURL ? new URL(context.parentURL) : null;
    if (parentPath && parentPath.protocol === "file:") {
      const parentDir = path.dirname(parentPath.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
      const base = path.join(parentDir, specifier);
      for (const ext of EXTENSIONS) {
        const candidate = base + ext;
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
  }

  // Pitfall: Next.js's package.json has no "exports" map, so bare subpath
  // specifiers like "next/cache" resolve as a literal relative path under
  // node_modules/next/ in Node's ESM resolver (no automatic ".js" probing,
  // unlike CJS require). The file that exists on disk is "cache.js". Retry
  // once with an explicit ".js" suffix before giving up, so scripts that
  // import our real "use server" action modules (which import from
  // "next/cache") can run outside the Next.js bundler.
  if (specifier.startsWith("next/") && !/\.(m|c)?js$/.test(specifier)) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (err?.code === "ERR_MODULE_NOT_FOUND") {
        return nextResolve(specifier + ".js", context);
      }
      throw err;
    }
  }

  return nextResolve(specifier, context);
}
