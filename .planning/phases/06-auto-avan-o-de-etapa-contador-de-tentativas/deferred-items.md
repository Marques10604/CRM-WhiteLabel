# Itens deferidos — Fase 06

## `npm run lint` com erros pré-existentes, fora do escopo do plano 06-01

Ao rodar `npm run lint` na verificação da Task 2 do plano 06-01, o comando reportou 402 erros/74 warnings — **nenhum deles em `src/actions/lead-actions.ts`, `src/lib/validations.ts` ou `src/db/schema.ts`** (os 3 arquivos tocados por este plano). Os erros existentes vêm de:

- `.claude/get-shit-done/bin/*.cjs` — regra `@typescript-eslint/no-require-imports` na ferramenta interna do GSD, não código do produto.
- `.claude/worktrees/agent-ab2be3f82c3c9c30d/` — worktree órfão já sinalizado como "candidato a limpeza" em `STATE.md` (sessão 02-02 recovery), contém uma cópia antiga e não mesclada de `src/`.
- Vários componentes existentes do produto (`lead-form-dialog.tsx`, `lead-table.tsx`, `subnicho-manager.tsx`, `csv-import-preview-table.tsx`, `csv-import-wizard.tsx`, `lixeira-table.tsx`, `template-form-dialog.tsx`, `whatsapp-preview-dialog.tsx`) — principalmente `react-hooks/set-state-in-effect` e regras relacionadas, pré-existentes a este plano (nenhum desses arquivos foi modificado pelas Tasks 1/2 do 06-01).

Por Scope Boundary do executor: não corrigido aqui (fora do escopo direto das mudanças desta task). `whatsapp-preview-dialog.tsx` será tocado no plano **06-02** — se o executor daquele plano decidir consertar o `set-state-in-effect` ali por estar mexendo no mesmo arquivo, é uma decisão local dele, não uma obrigação herdada deste registro.

`npx tsc --noEmit`, `npm run guard:no-hard-delete` e todos os greps de aceitação específicos das Tasks 1/2 do 06-01 passaram limpos.
