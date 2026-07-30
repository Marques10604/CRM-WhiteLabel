# Itens fora de escopo encontrados durante a execução (05-01)

## `npm run lint` falha por regras pré-existentes (fora de escopo)

**Encontrado em:** Task 2, ao rodar o verify `npm run lint`.

**Descrição:** `npm run lint` (eslint sem escopo, varre o repositório inteiro
via `eslint.config.mjs` sem ignores para `scripts/**`/`.claude/**`) já falhava
ANTES desta plano, por dois motivos pré-existentes e não relacionados a
05-01:

1. **`.claude/get-shit-done/**`** — diretório da ferramenta GSD (untracked,
   presente localmente nesta sessão), cheio de `require()` CommonJS legítimo
   em arquivos `.cjs`, sem ignore no `eslint.config.mjs`. Não é código do
   projeto CRM.
2. **Regra `@typescript-eslint/no-require-imports` em `scripts/*.cjs` já
   existentes** — `scripts/guard-no-hard-delete.cjs` (o precedente que o
   05-01-PLAN.md explicitamente manda seguir como estilo) e outros scripts
   `.cjs` do projeto (`test-lead-actions.cjs`, `test-loader-smoke.cjs`,
   `test-money.cjs`, `test-phone.cjs`, `verify-pipeline-migration.cjs`,
   `verify-schema.cjs`) já falham essa mesma regra, pois `require()` é a
   forma nativa de importar em CommonJS (`.cjs`) e a config do projeto não
   tem override para esse tipo de arquivo.
3. **Regra `react-hooks/set-state-in-effect` e `react-hooks/refs`** — já
   documentado antes desta fase em
   `.planning/quick/260725-lai-adicionar-botao-de-remocao-soft-delete-d/deferred-items.md`,
   afeta `src/components/subnicho-manager.tsx`, `template-form-dialog.tsx`,
   `whatsapp-preview-dialog.tsx` e outros — nenhum tocado por 05-01.

**Ação tomada:** `scripts/verify-notas-concat.cjs` (criado nesta task) segue
o MESMO padrão `require("typescript")`/`require("node:fs")`/`require("node:path")`
do precedente `guard-no-hard-delete.cjs` — 3 ocorrências da mesma regra
pré-existente, nenhuma NOVA categoria de erro introduzida. `src/lib/csv-import.ts`
(o único arquivo de produção tocado por 05-01) foi verificado isoladamente
com `npx eslint src/lib/csv-import.ts` e está limpo (nenhuma saída, exit 0).

**Recomendação:** Numa limpeza dedicada (não parte de 05-01/05-02), adicionar
um override de `eslint.config.mjs` para `scripts/**/*.cjs` desabilitando
`@typescript-eslint/no-require-imports` (arquivos CommonJS legítimos) e/ou
um `globalIgnores` para `.claude/get-shit-done/**` (ferramenta externa, não
código do projeto).
