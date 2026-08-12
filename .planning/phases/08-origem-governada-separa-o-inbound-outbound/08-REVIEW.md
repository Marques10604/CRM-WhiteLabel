---
phase: 08-origem-governada-separa-o-inbound-outbound
reviewed: 2026-08-07T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - scripts/backfill-origem-tipo.cjs
  - scripts/test-lead-actions.cjs
  - scripts/test-mutation-guard.cjs
  - scripts/verify-origem-tipo.cjs
  - src/actions/import-actions.ts
  - src/components/lead-form-dialog.tsx
  - src/db/schema.ts
  - src/lib/csv-import.ts
  - src/lib/validations.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-08-07
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Fase 8 adiciona a coluna `origemTipo` (`inbound`/`outbound`) em `leads`, um script de migração/backfill idempotente, um novo campo obrigatório no formulário manual (sem pré-seleção, D-04), fiação do default `"outbound"` no import CSV via `csvRowSchema.extend()`, e uma guarda permanente (`verify-origem-tipo.cjs`) mais um teste de mutação (`test-mutation-guard.cjs`).

Verificações direcionadas feitas nesta revisão, com resultado limpo:
- **SQL injection nos scripts `.cjs`**: todas as queries em `backfill-origem-tipo.cjs`, `verify-origem-tipo.cjs` e `test-lead-actions.cjs` usam strings literais estáticas ou `.prepare(...).run(param)` parametrizado (nunca concatenação de entrada externa em SQL). `subnichoLookupCondition` em `import-actions.ts` usa o `sql` tag do Drizzle (parametrizado), não interpolação de string crua. Nenhum ponto de injeção encontrado.
- **`test-mutation-guard.cjs` nunca escreve no arquivo real**: confirmado por leitura de código (a mutação ocorre só na cópia em `fs.mkdtempSync(os.tmpdir())`, `SOURCE` nunca é aberto para escrita) e por execução real do script (`node scripts/test-mutation-guard.cjs` → exit 0, seguido de `git status --porcelain src/actions/import-actions.ts` → sem diff).
- **Regressão do Zod no import CSV**: `csvRowSchema = leadSchema.omit({...}).extend({ ..., origemTipo: z.enum([...]).default("outbound") })` sobrescreve corretamente o campo obrigatório (sem default) herdado de `leadSchema`. `ConfirmedImportRow` (import-actions.ts) e o único chamador real (`csv-import-preview-table.tsx`) nunca populam `origemTipo`, então o default do Zod sempre é acionado — comportamento correto, sem regressão.

Os problemas abaixo são de manutenibilidade/cobertura de teste, não bugs funcionais comprovados na execução atual.

## Warnings

### WR-01: Constante `CSV_DEFAULTS.origemTipo` é morta e cria uma segunda fonte de verdade

**File:** `src/lib/csv-import.ts:59-65`
**Issue:** `CSV_DEFAULTS.origemTipo = "outbound"` foi adicionada ao objeto `CSV_DEFAULTS`, mas `MappedCsvRow` (linhas 32-42) não tem campo `origemTipo`, e `mapCsvRows` (linhas 108-147) nunca lê essa entrada — o comentário acima do objeto (linhas 51-58) admite isso explicitamente ("existe só para documentação/paridade visual"). O valor efetivamente aplicado vive isolado em `src/lib/validations.ts:62` (`csvRowSchema.origemTipo.default("outbound")`). Isso cria duas fontes de verdade para o mesmo valor de negócio: se o default precisar mudar no futuro, é fácil editar só `CSV_DEFAULTS.origemTipo` (o lugar "óbvio", ao lado de `canal`/`origem`/`notas`, que SÃO aplicados de fato) e deixar `validations.ts` intocado, produzindo uma divergência silenciosa entre a constante documentada e o comportamento real.
**Fix:** Ou remover a entrada `origemTipo` de `CSV_DEFAULTS` (o comentário em `validations.ts:55-58` já documenta a decisão sozinho), ou fazer `csvRowSchema` referenciar `CSV_DEFAULTS.origemTipo` como fonte única:
```ts
// validations.ts
import { CSV_DEFAULTS } from "@/lib/csv-import";
// ...
origemTipo: z.enum(["inbound", "outbound"]).default(CSV_DEFAULTS.origemTipo),
```

### WR-02: Checks estáticos de `verify-origem-tipo.cjs` são frágeis a reformatação

**File:** `scripts/verify-origem-tipo.cjs:51, 72`
**Issue:** As regex que extraem a "janela" de código a inspecionar dependem de contagens de caracteres e indentação exatas, por exemplo:
```js
const window = (schemaSrc.match(/origemTipo:\s*text\([\s\S]{0,220}?\)[\s\S]{0,80}?[,;]/) || [""])[0];
// ...
const leadWindow = (leadSchemaSrc.match(/origemTipo:[\s\S]*?(?=\n\s{2}\w+:|\n\}\);)/) || [""])[0];
```
Um `prettier --write` com largura de linha diferente, uma reindentação (2 vs 4 espaços) ou simplesmente adicionar mais texto ao comentário inline de `schema.ts:42` (que já tem ~400 caracteres) pode ultrapassar o limite `{0,220}`/`{0,80}` ou quebrar o padrão `\n\s{2}\w+:`, fazendo a guarda falhar (`exit 1`) mesmo com a fiação real intacta — um falso negativo que bloqueia trabalho legítimo sem indicar a causa real (o erro reportado seria "coluna origemTipo não declara text(...)", que é enganoso).
**Fix:** Preferir checagens estruturais mais tolerantes a formatação (ex.: `.includes('enum: ["inbound", "outbound"]')` combinado com checagem separada de `.notNull()`/`.default("outbound")` em todo o arquivo, sem depender de janelas de tamanho fixo), ou documentar explicitamente no cabeçalho do script que qualquer reformatação de `schema.ts`/`validations.ts` exige re-rodar `verify:origem-tipo` e ajustar as regex se necessário.

### WR-03: Nenhum teste de comportamento (runtime) cobre o default de `origemTipo` no import CSV

**File:** `scripts/verify-origem-tipo.cjs:104-117`, `scripts/test-lead-actions.cjs` (ausência)
**Issue:** O caminho manual (`createLead`) tem cobertura de comportamento real em `test-lead-actions.cjs` Caso 9/10 (origemTipo vazio bloqueia, origemTipo="inbound" persiste). O caminho de import CSV (`bulkImportLeads`/`csvRowSchema`) só é coberto pelo "Elo 5" de `verify-origem-tipo.cjs`, que é um `grep` estático em `import-actions.ts` procurando a string literal `"origemTipo: row.origemTipo,"` — não executa `bulkImportLeads` nem verifica que uma linha sem `origemTipo` é de fato persistida como `"outbound"` no banco. Uma regressão real (ex.: alguém troca `.default("outbound")` por `.optional()` em `csvRowSchema`, ou remove o `.extend()` mantendo a linha de insert intacta) passaria pelo Elo 5 sem ser detectada, pois a string `origemTipo: row.origemTipo,` continuaria existindo no código mesmo que o valor chegasse `undefined` e a validação falhasse silenciosamente de outra forma, ou pior, produzisse uma linha inconsistente.
**Fix:** Adicionar um caso de teste comportamental (mesmo padrão do Caso 9/10, banco temporário) que chame `bulkImportLeads` com uma `ConfirmedImportRow` sem `origemTipo` e assert que a linha inserida tem `origemTipo === "outbound"` no banco — análogo ao que já existe para o formulário manual.

## Info

### IN-01: Comentário inline de ~400 caracteres em uma única linha

**File:** `src/db/schema.ts:42`
**Issue:** O comentário que documenta o `.default("outbound")` da coluna `origemTipo` está em uma única linha muito longa, dificultando leitura em editores/diffs (`git diff` side-by-side quebra mal linhas desse tamanho) e sendo o principal fator de risco por trás de WR-02 (aumenta a chance de a janela de regex de `verify-origem-tipo.cjs` estourar o limite de caracteres se crescer mais).
**Fix:** Mover para um comentário de bloco `/* ... */` de múltiplas linhas acima do campo, no mesmo estilo já usado em outros campos do arquivo (ex.: `deletedAt`, `importBatchId`).

### IN-02: DDL do `ALTER TABLE ... origem_tipo` duplicada como string literal em dois arquivos

**File:** `scripts/backfill-origem-tipo.cjs:46`, `scripts/test-lead-actions.cjs:104`
**Issue:** A string `"ALTER TABLE \`leads\` ADD \`origem_tipo\` text DEFAULT 'outbound' NOT NULL;"` aparece idêntica nos dois arquivos. Isso é aceitável para harness de teste isolado, mas se o backfill real mudar a DDL (ex.: ajuste de tipo/collation), o `manualAlters` do teste pode divergir silenciosamente e passar a testar um schema diferente do que roda em produção.
**Fix:** Baixa prioridade — opcionalmente extrair a DDL para uma constante compartilhada (ex.: `scripts/migrations-ddl.cjs`) importada por ambos, seguindo o mesmo espírito de "fonte única" já aplicado em `subnichoLookupCondition`.

---

_Reviewed: 2026-08-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
