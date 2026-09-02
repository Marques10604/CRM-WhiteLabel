import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ferramental do GSD (get-shit-done) + worktrees de agentes — NÃO é código do
    // produto e NÃO está trackeado no git (`git ls-files .claude` => 0). Sem ignore,
    // o ESLint varre `.next/types/validator.ts` gerado dentro de worktrees órfãos e
    // dispara centenas de falsos erros (no-explicit-any, ban-ts-comment, etc.).
    ".claude/**",
  ]),
  {
    // Harnesses de teste/migração em Node puro (CommonJS, `.cjs`). `require()` é o
    // idioma deliberado e correto desses arquivos — não código de app, sem bundler.
    // Migrar para ESM é dívida de padrão separada (deferida no 17-CONTEXT.md).
    // Escopo estrito: só `scripts/**/*.cjs`, só a regra `no-require-imports`.
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
