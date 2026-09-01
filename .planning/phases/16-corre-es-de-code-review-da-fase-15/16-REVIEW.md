---
phase: 16-corre-es-de-code-review-da-fase-15
reviewed: 2026-09-01T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/validations.ts
  - src/lib/csv-import.ts
  - src/components/csv-column-mapper.tsx
  - src/components/csv-import-preview-table.tsx
  - scripts/migrate-interesse.cjs
  - scripts/test-lead-actions.cjs
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Fase 16: Relatório de Code Review

**Revisado:** 2026-09-01
**Profundidade:** standard
**Arquivos revisados:** 6
**Status:** issues_found

## Resumo

A Fase 16 fecha 4 dos 5 achados da Fase 15 de forma limpa:

- **WR-01** (`interesse` só-espaços gravava `''`): FECHADO. O `z.preprocess` agora
  faz `v.trim()` antes de comparar com `""`, e os casos 14a/14b do
  `test-lead-actions.cjs` provam `create` e `update` gravando `NULL`.
- **IN-01** (comentário "7 campos fixos"): FECHADO. Único comentário do tipo,
  atualizado para "8 campos fixos", batendo com `FIELD_CONFIGS` (8 entradas).
- **IN-03** (backup acumulado a cada execução): FECHADO para o caminho feliz — a
  execução idempotente (coluna já existe) não escreve nada e não cria backup.
- **WR-02** (coluna `interesse` ausente da prévia): PARCIALMENTE FECHADO. A coluna
  foi adicionada, mas o aviso de truncamento é derivado de `String.length` e
  falha justamente no cenário que o **IN-02** passou a tratar (ver WR-01 abaixo).
- **IN-02** (`.slice(0,500)` partia surrogate pair): a troca para
  `Array.from(...).slice(0,500).join("")` corrige o corte, mas **introduz uma
  regressão** — o valor truncado pode passar de 500 code units e reprovar o
  `csvRowSchema` server-side, abortando o lote inteiro (ver CR-01).

Concern principal: a correção de um INFO (IN-02) criou um caminho em que o import
de CSV inteiro é abortado, violando uma invariante documentada (D-10).

## Critical Issues

### CR-01: Correção do IN-02 aborta o import de CSV inteiro para células de `interesse` com caracteres astrais

**File:** `src/lib/csv-import.ts:150` (+ `src/actions/import-actions.ts:93-105`, `src/lib/validations.ts:76`)

**Issue:**
`mapCsvRows` agora trunca `interesse` por **code point**:
`Array.from(readMapped(row, "interesse")).slice(0, 500).join("")`. Para texto com
caracteres fora do BMP (emoji, extensões CJK, símbolos matemáticos), 500 code
points equivalem a até 1000 UTF-16 code units.

`bulkImportLeads` valida **toda** linha com `csvRowSchema` antes de inserir
(`import-actions.ts:95`), e `csvRowSchema.interesse` herda
`z.string().trim().max(500, ...)` de `leadBaseSchema` — e `.max()` de string no
Zod conta **code units**. Uma célula com ~250+ caracteres astrais gera um valor
truncado de >500 code units, `parsed.success === false`, e `bulkImportLeads`
retorna `{ success: false }` **abortando o lote inteiro** (`import-actions.ts:96-103`,
comentário "Se qualquer linha falhar, aborta tudo").

Isso quebra a invariante D-10 ("uma célula gigante do CSV nunca reprova a linha")
que o próprio IN-02 estava refinando. Antes da correção, `.slice(0, 500)`
garantia ≤500 code units e esse caminho era impossível. O comentário em
`import-actions.ts:75-77` ("Já truncado em 500 por `mapCsvRows` (D-10), então o
`.max(500)` de `csvRowSchema` nunca reprova") ficou **factualmente incorreto**.

O `test-lead-actions.cjs` não pega isso: o caso 19 usa `"z".repeat(600)` (ASCII),
e nenhum caso exercita caractere astral ponta-a-ponta via `bulkImportLeads`.

**Fix:**
Tornar o limite de comprimento consistente por code point nos dois lados. Opção
mais limpa — validar por code point no schema (bate com o truncamento e com o
badge da prévia):

```ts
interesse: z.preprocess(
  (v) => {
    const s = typeof v === "string" ? v.trim() : v;
    return s === "" || s === null || s === undefined ? undefined : s;
  },
  z
    .string()
    .trim()
    .refine((v) => Array.from(v).length <= 500, "O interesse deve ter no máximo 500 caracteres.")
    .optional()
),
```

Alternativa (mantendo `.max(500)` em code units): em `mapCsvRows`, truncar por
code point E garantir o teto de code units:

```ts
let interesse = Array.from(readMapped(row, "interesse")).slice(0, 500).join("");
if (interesse.length > 500) {
  // reduz mais alguns code points até caber em 500 code units
  interesse = Array.from(interesse).slice(0, 250).join("");
}
```

Também corrigir o comentário de `ConfirmedImportRow.interesse` em
`import-actions.ts:75-77`. Adicionar um caso de teste com emoji ponta-a-ponta.

## Warnings

### WR-01: Aviso "Cortado em 500 caracteres" da prévia é derivado de `String.length` e é não-confiável

**File:** `src/components/csv-import-preview-table.tsx:147`

**Issue:**
O badge é renderizado por `row.original.interesse?.length === 500`. Dois defeitos:

1. **Falso negativo (caracteres astrais):** depois do corte por code point do
   IN-02, um valor truncado de 500 emoji tem `.length === 1000`, então `=== 500`
   é `false` e o badge **nunca aparece** — exatamente o caso que o IN-02 se
   propôs a tratar. O admin confirma o import sem ver que o texto foi cortado,
   anulando o objetivo do WR-02.
2. **Falso positivo:** uma célula que tem exatamente 500 caracteres (ASCII, sem
   truncamento) dispara o badge, informando ao admin que houve corte quando não
   houve.

Causa raiz: o sinal de "foi truncado" é re-derivado por comprimento de string na
view em vez de ser reportado por `mapCsvRows`, que é quem realmente trunca.

**Fix:**
`mapCsvRows` compara o comprimento antes/depois (em code points) e expõe um
booleano em `MappedCsvRow`:

```ts
const original = readMapped(row, "interesse");
const chars = Array.from(original);
const interesse = chars.slice(0, 500).join("");
const interesseTruncado = chars.length > 500;
// ...retornar interesseTruncado no objeto
```

E na célula: `{row.original.interesseTruncado && ( <Badge>...</Badge> )}`.

### WR-02: `ALTER TABLE` sem try/catch em `migrate-interesse.cjs` deixa backup órfão e pula a verificação em caso de falha

**File:** `scripts/migrate-interesse.cjs:72-74`

**Issue:**
No ramo `!hasColumn`, `db.exec("ALTER TABLE \`leads\` ADD \`interesse\` text;")`
está fora de qualquer try/catch. Se o `ALTER` lançar (execução concorrente que
adicionou a coluna entre o check `hasColumn` e o `ALTER` → "duplicate column
name"; ou banco travado pela app Next no ar, cenário que o próprio cabeçalho
admite não conseguir impedir), o script morre com exceção não tratada **depois**
que um arquivo de backup novo já foi escrito — reintroduzindo o sintoma "a pasta
`data/` acumula um backup por execução" que o IN-03 tentou eliminar, só que no
caminho de falha. Além disso, o bloco "4) VERIFICAÇÃO PÓS-MIGRAÇÃO" nunca roda,
então um estado parcial/inconsistente não é reportado pelo canal `fail()` do
script.

**Fix:**
Envolver o `ALTER` em try/catch:

```js
db = new Database(DB_PATH);
try {
  db.exec("ALTER TABLE `leads` ADD `interesse` text;");
} catch (err) {
  if (String(err.message).includes("duplicate column name")) {
    console.log("[migrate-interesse] coluna já existe (corrida) — seguindo para verificação");
  } else {
    fail(`ALTER TABLE falhou: ${err.message} (backup preservado em ${backupPath})`);
  }
}
```

## Info

### IN-01: Comentário desatualizado em `ConfirmedImportRow.interesse`

**File:** `src/actions/import-actions.ts:75-77`

**Issue:** O JSDoc afirma "Já truncado em 500 por `mapCsvRows` (D-10), então o
`.max(500)` de `csvRowSchema` nunca reprova." Após a mudança do IN-02 isso é
falso para texto com caracteres astrais (ver CR-01).

**Fix:** Atualizar o comentário junto com a correção do CR-01, deixando explícito
que o limite é por code point (ou por code unit, conforme a escolha da correção)
nos dois lados.

### IN-02: `migrate-interesse.cjs` reabre o banco sem `fileMustExist`

**File:** `scripts/migrate-interesse.cjs:72`

**Issue:** `db = new Database(DB_PATH);` — inconsistente com a linha 47
(`{ fileMustExist: true }`). Inofensivo hoje (o arquivo acabou de ser copiado),
mas se `DB_PATH` sumisse entre o `close()` e o reopen, `better-sqlite3` criaria
um banco vazio silenciosamente; a verificação seguinte (`SELECT count(*) FROM
leads`) então lançaria "no such table" — falha barulhenta, mas mascarando a
causa real.

**Fix:** `db = new Database(DB_PATH, { fileMustExist: true });`

---

_Revisado: 2026-09-01_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
