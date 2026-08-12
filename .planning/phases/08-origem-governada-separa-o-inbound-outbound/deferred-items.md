# Deferred Items — Fase 8

Descobertos durante a execução da Task 3 do plano 08-03 (gates finais), fora de escopo
(Scope Boundary do executor: só auto-corrigir o que a própria task causou).

## `npx eslint` — 413 problemas (413 erros + 75 avisos) pré-existentes, não relacionados a `origemTipo`

**Descoberto em:** 2026-08-07, Task 3 do plano 08-03 (`npx eslint` rodado sem escopo, cobrindo o
repositório inteiro).

**Confirmado como débito PRÉ-EXISTENTE, não introduzido pelas Tasks 1-3 desta fase:**

1. **`.claude/get-shit-done/bin/**` e `.claude/hooks/lib/git-cmd.js`** — dezenas de arquivos de
   ferramentas internas do GSD (não fazem parte da aplicação CRM), todos com
   `@typescript-eslint/no-require-imports` (import `require()` estilo CommonJS). Nenhum desses
   arquivos foi tocado por qualquer plan da Fase 8.
2. **`.claude/worktrees/agent-ab2be3f82c3c9c30d/**`** — worktree órfão já sinalizado em
   `STATE.md` ("02-02 recovery" — "flagged as cleanup candidate only"), com uma cópia desatualizada
   de `lead-form-dialog.tsx`/`lead-table.tsx`/`subnicho-manager.tsx`/`template-form-dialog.tsx` e
   scripts `.cjs` antigos. Não é código ativo do projeto.
3. **`scripts/*.cjs` pré-existentes** (não criados por esta fase): `backfill-origem-tipo.cjs`
   (08-01), `guard-no-hard-delete.cjs`, `test-loader-smoke.cjs`, `test-money.cjs`, `test-phone.cjs`,
   `verify-notas-concat.cjs`, `verify-pipeline-migration.cjs`, `verify-schema.cjs`,
   `verify-wa-contact-invariant.cjs` — todos usam `require()` (idioma CommonJS estabelecido do
   projeto, referenciado como "idioma exato de guarda" no próprio `08-03-PLAN.md` Task 2
   `read_first`). Os 3 scripts NOVOS desta fase (`verify-origem-tipo.cjs`, `test-mutation-guard.cjs`,
   e as mudanças em `test-lead-actions.cjs`) seguem o MESMO idioma pré-existente e por isso também
   disparam a mesma regra — consistência com o padrão do projeto, não um erro novo introduzido.
4. **`src/components/*.tsx` não tocados por esta fase** (`subnicho-manager.tsx`,
   `template-form-dialog.tsx`, `whatsapp-preview-dialog.tsx`, `lead-table.tsx`,
   `csv-import-wizard.tsx`, `csv-import-preview-table.tsx`, `lixeira-table.tsx`) — erros
   `react-hooks/set-state-in-effect`, `react-hooks/refs`, avisos `react-hooks/incompatible-library`.
   Nenhum arquivo da Fase 8 (`lead-form-dialog.tsx`, `csv-import.ts`, `import-actions.ts`) contribui
   com um erro NOVO — o único achado em `lead-form-dialog.tsx` é um AVISO pré-existente
   (`react-hooks/incompatible-library` em `form.watch("stage")`, relacionado a `motivoPerda`,
   funcionalidade de Fase 3/6, não de Fase 8).

**Causa raiz:** `eslint.config.mjs` (não modificado desde 2026-07-20, antes da Fase 8) não tem
`ignores` para `.claude/**` nem para `scripts/*.cjs` — herda só os ignores padrão do
`eslint-config-next` (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`). A regra
`@typescript-eslint/no-require-imports` do preset TypeScript do Next.js se aplica a QUALQUER
arquivo `.ts`/`.js`/`.cjs` no repositório, incluindo scripts CommonJS que são idioma deliberado do
projeto (não há `parserOptions`/`overrides` isentando `scripts/**`).

**Por que não foi corrigido nesta task:** (a) escopo — `files_modified` da Task 3 é "nenhum arquivo
modificado — apenas execução de gates"; a task explicitamente proíbe alteração de código; (b) o
volume (413 problemas em dezenas de arquivos, a maioria fora de `src/`) caracteriza correção de
configuração de projeto (possivelmente um `ignores`/`overrides` no `eslint.config.mjs`), não um bug
pontual — decisão arquitetural sobre a governança de lint do repositório, fora do escopo de
`origemTipo`.

**Recomendação:** próxima fase ou quick task dedicada a: (1) adicionar `ignores: [".claude/**"]` ao
`eslint.config.mjs` (ferramental interno do GSD não é código do produto); (2) decidir se
`scripts/*.cjs` ganha um `overrides` com `sourceType: "commonjs"` (o que desativaria
`no-require-imports` corretamente para esse idioma já estabelecido) ou se o projeto migra os scripts
para ESM; (3) remover o worktree órfão `.claude/worktrees/agent-ab2be3f82c3c9c30d` (já recomendado
em `STATE.md`).

**Status:** pendente, não relacionado a ORIGEM-01/02. Não bloqueia o fechamento da Fase 8 — nenhum
critério de aceite do `08-SPEC.md` depende de `npx eslint` passar globalmente.
