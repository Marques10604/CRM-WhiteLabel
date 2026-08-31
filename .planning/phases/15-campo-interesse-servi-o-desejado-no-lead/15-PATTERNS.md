# Fase 15: Campo "interesse / serviço desejado" no lead — Mapa de Padrões

**Mapeado:** 2026-08-31
**Arquivos analisados:** 7 alvos + 5 adjacentes de integração
**Análogos encontrados:** 12 / 12 (todos com precedente direto no código)

> Consumido pelo `gsd-planner`. Cada seção aponta o arquivo análogo e os
> trechos exatos (com número de linha) a copiar. Nada aqui é abstrato.

---

## Classificação de Arquivos

### Arquivos-alvo (do CONTEXT.md + SPEC.md)

| Arquivo a modificar/criar | Papel | Fluxo de dados | Análogo mais próximo | Qualidade |
|---------------------------|-------|----------------|----------------------|-----------|
| `src/db/schema.ts` | model / schema Drizzle | transform (DDL) | `leads.motivoPerdaId` (schema.ts:98) — coluna nullable adicionada por fase; `leads.notas` (schema.ts:88) | exato (col opcional) |
| `src/lib/validations.ts` | validation / contract | request-response | `motivoPerdaId` preprocess (validations.ts:67-70); `origem` (validations.ts:53) | exato |
| `src/components/lead-form-dialog.tsx` | component (client form) | request-response | campo **"Origem"** `<Input>` (lead-form-dialog.tsx:270-279) + `defaultValues.origem` (:122) | exato |
| `src/actions/lead-actions.ts` | action (server action = endpoint interno) | CRUD | `createLead` (:65-123) + `updateLead` (:125-210); idioma null-coalescing de `motivoPerdaId` (:101, :178-179) | exato |
| `src/lib/csv-import.ts` | utility (puro) | transform | `notas`/`origem` em `CsvFieldKey` (:13-20), `MappedCsvRow` (:32-42), `readMapped` (:121-136) | exato |
| `src/components/csv-column-mapper.tsx` | component / config estático | request-response | entrada `{ key: "notas", label: "Notas", required: false }` em `FIELD_CONFIGS` (:24) | exato |
| `scripts/migrate-interesse.cjs` (NOVO) | migration | batch | `scripts/backfill-origem-tipo.cjs` (DDL `ALTER TABLE leads ADD` single-col) + estrutura de `scripts/migrate-motivos-perda.cjs` (backup/idempotência/verificação) | exato (composição de 2) |

### Arquivos adjacentes (integração CSV — NÃO listados no CONTEXT mas o TS quebra sem eles)

| Arquivo | Papel | Por quê |
|---------|-------|---------|
| `src/components/csv-import-wizard.tsx` | component | `EMPTY_MAPPING` (:30-38) é um objeto-literal concreto tipado `CsvColumnMapping` — ganha uma chave `interesse: null` ou `tsc` acusa propriedade faltante |
| `src/actions/import-actions.ts` | action | `ConfirmedImportRow` (:67-75) e o `.values({...})` de `bulkImportLeads` (:143-157) precisam carregar `interesse` até o insert |
| `src/components/csv-import-preview-table.tsx` | component | `confirmedRows.push({...})` (:259-267) monta o `ConfirmedImportRow` — adicionar `interesse: r.interesse` |
| `scripts/verify-schema.cjs` | verificação | bloco de presença de coluna em `leads` (:117-125) — adicionar gate `leadsColumns.has("interesse")` (mesmo idioma de `motivo_perda_id`) |
| `scripts/test-lead-actions.cjs` | teste | harness `test:lead-actions` — casos novos de persistência/limpeza de `interesse` (molde: Casos 9-11 de `origemTipo`, :319-408) |

---

## Atribuição de Padrões (arquivo a arquivo)

### `src/db/schema.ts` (model, DDL)

**Análogo:** `leads.motivoPerdaId` (schema.ts:98) — coluna **nullable adicionada numa fase posterior**, sem constraint de obrigatoriedade no banco.

**Padrão de declaração de coluna nullable** (schema.ts:88, :98-99):
```ts
notas: text("notas").notNull(),
// ...
motivoPerdaId: integer("motivo_perda_id").references(() => motivosPerda.id, { onDelete: "restrict" }), // NULLABLE de propósito: [...] obrigatoriedade condicional mora no Zod/Server Action, nunca em constraint de banco
stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default (Pitfall 2)
```

**A copiar (D-07):** dentro do objeto de `leads` (schema.ts:78-106), logo após `nichoId` (:90) ou junto de `notas` (:88):
```ts
interesse: text("interesse"), // nullable — texto livre "serviço desejado" (LEAD-06). Sem .notNull(), sem .default(): coluna aditiva; leads pré-migração ficam NULL. Sem índice — não há filtro/busca por interesse (fora de escopo Fase 15).
```

**Padrão de doc-comment** (schema.ts:45-61, :151-172): toda coluna/tabela nova
ganha um bloco `/** ... */` explicando a decisão. Aqui: por que nullable, por
que sem default, por que sem índice, e a referência D-06/D-07.

**NÃO tocar:** `nichos`/`motivosPerda` doc-comments proíbem `drizzle-kit push`/`generate` (schema.ts:53-57, :168-171) — vale para esta coluna também. O tipo `Lead` (`src/types/index.ts:4`, `InferSelectModel<typeof leads>`) ganha `interesse: string | null` automaticamente — nenhuma edição em `types/`.

---

### `src/lib/validations.ts` (validation contract)

**Análogo:** `motivoPerdaId` (validations.ts:67-70) — único campo opcional do `leadBaseSchema` hoje, com `z.preprocess` que normaliza `""`/`null`/`undefined` → `undefined`.

**Padrão de preprocess "vazio → undefined"** (validations.ts:67-70):
```ts
motivoPerdaId: z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
),
```

**Padrão de campo de texto trimado** (validations.ts:53):
```ts
origem: z.string().trim().min(1, "Origem é obrigatória."),
```

**A copiar (D-04/D-05):** adicionar ao objeto `leadBaseSchema` (validations.ts:33-71), perto de `notas` (:61):
```ts
interesse: z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()
),
```

**Propagação automática (verificada):**
- `leadSchema` = `leadBaseSchema.refine(...)` (validations.ts:76-79) → herda `interesse`.
- `csvRowSchema` = `leadBaseSchema.omit({ nichoId, followUpDate, motivoPerdaId }).extend({...})` (validations.ts:103-108) → herda `interesse` (NÃO está na lista de `.omit()`, então flui). Confirmar que o planner não adicione `interesse` ao `.omit()`.
- `LeadFormValues` / `CsvRowValues` (types inferidos, :81/:110) atualizam sozinhos.

**Comentário obrigatório:** o doc-comment de `leadBaseSchema` (validations.ts:18-32) descreve os campos opcionais — estender mencionando `interesse` (mesma justificativa: input do form emite `""` quando vazio; D-04 = vazio grava NULL).

---

### `src/components/lead-form-dialog.tsx` (client form component)

**Análogo:** campo **"Origem"** (lead-form-dialog.tsx:270-279) — `<Input>` de linha única, `form.register`, `FieldDescription`, `FieldError`. É o molde EXATO (D-02).

**Padrão de campo `<Input>` simples** (lead-form-dialog.tsx:270-279):
```tsx
<Field data-invalid={!!errors.origem}>
  <FieldLabel htmlFor="origem">Origem</FieldLabel>
  <FieldContent>
    <Input id="origem" aria-invalid={!!errors.origem} {...form.register("origem")} />
    <FieldDescription>
      De onde esse lead veio — ex: indicação, anúncio, evento, parceria com o cowork.
    </FieldDescription>
    <FieldError errors={[errors.origem]} />
  </FieldContent>
</Field>
```

**Padrão de `defaultValues`** (lead-form-dialog.tsx:119, :122, :126):
```tsx
origem: lead?.origem ?? "",
notas: lead?.notas ?? "",
```

**A copiar (D-01/D-03):**
1. Em `defaultValues` (lead-form-dialog.tsx:118-138), junto de `nichoId` (:135):
   ```tsx
   interesse: lead?.interesse ?? "",
   ```
2. Novo `<Field>` **logo abaixo do campo Nicho** (após lead-form-dialog.tsx:343, o `</Field>` do bloco `nichoId`), dentro da seção "Negócio" (`<div>` que começa em :320):
   ```tsx
   <Field data-invalid={!!errors.interesse}>
     <FieldLabel htmlFor="interesse">Interesse</FieldLabel>
     <FieldContent>
       <Input
         id="interesse"
         placeholder="Ex: quer site, automação de WhatsApp..."
         aria-invalid={!!errors.interesse}
         {...form.register("interesse")}
       />
       <FieldDescription>O que esse lead quer — serviço ou ajuda que ele procura.</FieldDescription>
       <FieldError errors={[errors.interesse]} />
     </FieldContent>
   </Field>
   ```

**Mecânica já garantida (não mexer):** `onSubmit` (lead-form-dialog.tsx:179-191) monta `FormData` do DOM bruto — um `<Input name="interesse">` (o `form.register` seta `name`) entra automaticamente no `FormData` que vai pra Server Action. Sem `Controller` (é `<Input>` puro, igual "Origem"/"Nome").

---

### `src/actions/lead-actions.ts` (server action, CRUD)

**Análogo:** `createLead` (:65-123) e `updateLead` (:125-210). O spread `...parsed.data` já leva `interesse` pro insert/update — mas o idioma do projeto é ser **explícito** para campos com normalização vazio↔null.

**Padrão de parse + spread no insert** (lead-actions.ts:69, :94-104):
```ts
const parsed = leadSchema.safeParse(Object.fromEntries(formData));
if (!parsed.success) {
  return { errors: parsed.error.flatten().fieldErrors };
}
// ...
[inserted] = await db
  .insert(leads)
  .values({
    ...parsed.data,
    motivoPerdaId:
      parsed.data.stage === "perdido" ? parsed.data.motivoPerdaId ?? null : null,
    stageChangedAt: new Date(),
  })
  .returning();
```

**Padrão de "undefined → null explícito"** (lead-actions.ts:101, :178-179) — `motivoPerdaId` mostra como forçar `null` quando o Zod entrega `undefined`.

**A copiar (D-04, Discretion #4):**
- `createLead` — no `.values({...})` (lead-actions.ts:96-103), após o spread:
  ```ts
  interesse: parsed.data.interesse ?? null,
  ```
- `updateLead` — no `.set({...})` (lead-actions.ts:171-194), após o spread:
  ```ts
  interesse: parsed.data.interesse ?? null,
  ```
  Isso cobre "editar apagando o texto → `interesse = NULL`": o `<Input>` vazio → `FormData` com `""` → preprocess do Zod → `undefined` → `?? null`.

**NÃO precisa:** gate de existência (tipo `nichoExists`/`motivoPerdaExists`, :41-63) — `interesse` é texto livre, sem FK. Sem try/catch novo — não há constraint que possa falhar.

**`bulkImportLeads`** (import-actions.ts:143-157) NÃO usa spread — lista campo a campo. Adicionar `interesse: row.interesse ?? null,` no `.values({...})` (após `notas: row.notas,` :150). E `csvRowSchema` truncar já aconteceu no `mapCsvRows` (ver abaixo), mas o `.max(500)` do schema ainda roda no `csvRowSchema.safeParse` de `bulkImportLeads` (:91) — como `mapCsvRows` já corta em 500, nunca reprova (D-10).

---

### `src/lib/csv-import.ts` (utility puro, transform)

**Análogo:** `notas` — presente em `CsvFieldKey` (:20), `CsvColumnMapping` (deriva, :23), `MappedCsvRow` (:42), e lido via `readMapped` em `mapCsvRows` (:134-135).

**Padrão do tipo `CsvFieldKey`** (csv-import.ts:13-20):
```ts
export type CsvFieldKey =
  | "nome"
  | "telefone"
  | "nichoNome"
  | "canal"
  | "origem"
  | "valorEstimado"
  | "notas";
```

**Padrão `MappedCsvRow`** (csv-import.ts:32-42): campo `string` (nunca `string | null` — default aplicado no map).

**Padrão de leitura + fallback em `mapCsvRows`** (csv-import.ts:121-148):
```ts
function readMapped(row: ParsedCsvRow, field: CsvFieldKey): string {
  const header = mapping[field];
  if (header === null || !(header in row)) return "";
  return (row[header] ?? "").trim();
}
// ...
const origem = readMapped(row, "origem") || CSV_DEFAULTS.origem;
// ...
return { rowIndex, nome, telefone, telefoneNormalizado, nichoNome, canal, origem, valorEstimado, notas };
```

**A copiar (D-08/D-10/D-11):**
1. `CsvFieldKey` (:20) — adicionar `| "interesse";` no fim.
2. `MappedCsvRow` (:42) — adicionar `interesse: string;` após `notas: string;`.
3. `mapCsvRows` (:127-148) — dentro do `.map`, calcular e devolver com **truncamento antes da validação** (D-10):
   ```ts
   const interesse = readMapped(row, "interesse").slice(0, 500);
   ```
   e no objeto de retorno (:138-148): `interesse,`.
4. **NÃO** adicionar entrada em `CSV_DEFAULTS` (:62-68) — D-11: vazio/não-mapeado = string vazia → vira `null` na Server Action. **NÃO** tocar `buildNotasText` (:82-109) nem `extraNotasColumns` — `interesse` é campo próprio.

---

### `src/components/csv-column-mapper.tsx` (config estático)

**Análogo:** entrada `notas` em `FIELD_CONFIGS` (csv-column-mapper.tsx:24).

**Padrão** (csv-column-mapper.tsx:14-25):
```ts
type FieldConfig = { key: CsvFieldKey; label: string; required: boolean };

const FIELD_CONFIGS: FieldConfig[] = [
  { key: "nome", label: "Nome *", required: true },
  { key: "telefone", label: "Telefone *", required: true },
  { key: "nichoNome", label: "Nicho", required: false },
  { key: "canal", label: "Canal", required: false },
  { key: "origem", label: "Origem", required: false },
  { key: "valorEstimado", label: "Valor estimado", required: false },
  { key: "notas", label: "Notas", required: false },
];
```

**A copiar (D-09):** adicionar após a linha de `notas` (:24):
```ts
{ key: "interesse", label: "Interesse", required: false },
```

**Mecânica já garantida (não mexer):** o `.map(FIELD_CONFIGS)` (:99-132) renderiza o `<Select>` com opção `"— nenhuma —"` (`NONE_VALUE`, :28) automaticamente para todo campo `required: false` (:100-106). Nenhuma outra mudança no componente.

---

### `scripts/migrate-interesse.cjs` (NOVO — migration, batch)

**Análogo primário (DDL):** `scripts/backfill-origem-tipo.cjs` — único script que faz `ALTER TABLE leads ADD <coluna única>` (não cria tabela).
**Análogo estrutural:** `scripts/migrate-motivos-perda.cjs` (backup + WAL checkpoint + idempotência + verificação pós-migração) e `scripts/migrate-tarefas.cjs` (bloco de verificação de colunas).

**Padrão de cabeçalho + backup + checkpoint WAL** (backfill-origem-tipo.cjs:7-33 / migrate-motivos-perda.cjs:17-54):
```js
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

function fail(message) {
  console.error(`[migrate-interesse] FALHOU: ${message}`);
  process.exit(1);
}

// 1) BACKUP ANTES DE QUALQUER ESCRITA — checkpoint do WAL primeiro
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}
console.log(`[migrate-interesse] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
```

**Padrão de ADD COLUMN idempotente via `PRAGMA table_info`** (backfill-origem-tipo.cjs:38-52) — MAS **sem `DEFAULT` e sem `NOT NULL`** (D-06: coluna nullable dispensa a exigência de DEFAULT do SQLite):
```js
const hasColumn = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "interesse");

if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `interesse` text;"); // sem DEFAULT, sem NOT NULL — nullable, leads antigos ficam NULL (D-06)
  console.log("[migrate-interesse] coluna leads.interesse adicionada (nullable, sem default)");
} else {
  console.log("[migrate-interesse] coluna interesse já existe — pulando ALTER TABLE (idempotência)");
}
```

**NÃO copiar de `backfill-origem-tipo.cjs`:** o `UPDATE leads SET ... WHERE ... IS NULL` (:57) — D-06/SPEC "não toca dado existente"; não há backfill, leads antigos ficam `NULL` de propósito.

**Padrão de verificação pós-migração** (migrate-motivos-perda.cjs:109-128 / migrate-tarefas.cjs:66-99):
```js
const afterLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;
if (beforeLeads !== afterLeads) {
  fail(`contagem de linhas de leads mudou: antes=${beforeLeads} depois=${afterLeads}`);
}
const cols = db.prepare("PRAGMA table_info(leads)").all();
const interesseCol = cols.find((c) => c.name === "interesse");
if (!interesseCol) fail("coluna leads.interesse ausente após a migração");
if (interesseCol.type.toUpperCase() !== "TEXT") fail(`leads.interesse tipo inesperado: ${interesseCol.type}`);
if (interesseCol.notnull !== 0) fail("leads.interesse deveria ser nullable (notnull=0)");
db.prepare("SELECT interesse FROM leads LIMIT 1").get(); // Acceptance req.1: SELECT roda sem erro
console.log(`[migrate-interesse] OK: ${afterLeads} leads intactos, coluna interesse TEXT nullable presente`);
db.close();
process.exit(0);
```

**Registrar no `package.json`** (Discretion #3): adicionar em `scripts` (package.json:11, junto de `migrate:tarefas`):
```json
"migrate:interesse": "node scripts/migrate-interesse.cjs",
```

---

## Padrões Compartilhados (transversais)

### Doc-comment de decisão em toda mudança de schema/contrato
**Fonte:** `src/db/schema.ts:45-61`, `src/lib/validations.ts:18-32`, `scripts/migrate-motivos-perda.cjs:1-16`
**Aplicar a:** `schema.ts`, `validations.ts`, `migrate-interesse.cjs`
Todo campo/coluna/script novo carrega um bloco de comentário explicando *por que* (nullable, sem default, sem índice) e citando a decisão (D-04/D-06/D-07). É convenção forte e consistente do projeto.

### Proibição de `drizzle-kit push`/`generate`
**Fonte:** `src/db/schema.ts:53-57`, `scripts/migrate-motivos-perda.cjs:6-10`, `scripts/backfill-origem-tipo.cjs:2-6`
**Aplicar a:** toda a fase — migração é sempre script `.cjs` manual via `better-sqlite3`, com backup + checkpoint WAL + idempotência via `PRAGMA table_info` + verificação de contagem de linhas antes/depois.

### Server Action valida com Zod em runtime (defesa em profundidade)
**Fonte:** `src/lib/validations.ts:128-132`, `src/actions/lead-actions.ts:69-72`, `src/actions/import-actions.ts:86-101`
**Aplicar a:** `lead-actions.ts`, `import-actions.ts` — nunca confiar no `zodResolver` do cliente; `safeParse` autoritativo server-side. `interesse` já herda isso via `leadSchema`/`csvRowSchema`.

### Idioma "undefined do Zod → null explícito no banco"
**Fonte:** `src/actions/lead-actions.ts:101, :178-179` (`motivoPerdaId ?? null`)
**Aplicar a:** `lead-actions.ts` (create + update), `import-actions.ts` (`bulkImportLeads`) — `interesse: parsed.data.interesse ?? null` / `row.interesse ?? null`.

### Campo CSV mapeável: 4 pontos de toque + objeto-literal EMPTY_MAPPING
**Fonte:** Fase 5 (`05-PATTERNS.md`), `src/lib/csv-import.ts:13-42`, `src/components/csv-column-mapper.tsx:17-25`, `src/components/csv-import-wizard.tsx:30-38`
**Aplicar a:** `csv-import.ts` (`CsvFieldKey` + `MappedCsvRow` + `mapCsvRows`), `csv-column-mapper.tsx` (`FIELD_CONFIGS`), `csv-import-wizard.tsx` (`EMPTY_MAPPING` ganha `interesse: null` — **`CsvColumnMapping` é `Record<CsvFieldKey, ...>` mas o literal `EMPTY_MAPPING` é escrito à mão**, então `tsc` exige a chave), `import-actions.ts` (`ConfirmedImportRow` + insert), `csv-import-preview-table.tsx` (`confirmedRows.push`).

### Gate de schema em `verify-schema.cjs` para colunas de `leads`
**Fonte:** `scripts/verify-schema.cjs:117-125` (checagem de PRESENÇA, não conjunto estrito — `leads` acumula colunas por fase)
**Aplicar a:** `verify-schema.cjs` — adicionar `if (!leadsColumns.has("interesse")) fail("coluna ausente: leads.interesse (Fase 15, LEAD-06)");` no bloco existente. Opcional mas coerente com `motivo_perda_id`/`sequencia_posicao`.

### Harness de teste `.cjs` por Server Action
**Fonte:** `scripts/test-lead-actions.cjs` (Casos 9-11 de `origemTipo`, :319-408) — banco temporário, `makeFormData`, `check(...)`, leitura de volta do banco
**Aplicar a:** `test-lead-actions.cjs` — casos novos: (a) `createLead` com `interesse` preenchido → `SELECT interesse` retorna o valor; (b) `updateLead` apagando → `NULL`; (c) `leadSchema.parse` com `"x".repeat(501)` → erro com a msg PT-BR; (d) `csvRowSchema` sem `interesse` → passa.

---

## Sem Análogo

Nenhum. Todos os 12 pontos de mudança têm precedente direto e recente
(`motivoPerdaId` da Fase 11 para o campo opcional; Fase 5/8 para o CSV;
`backfill-origem-tipo`/`migrate-tarefas` para a migração aditiva).

---

## Metadata

**Escopo da busca de análogos:** `src/db/`, `src/lib/`, `src/components/`, `src/actions/`, `scripts/`, `src/types/`
**Arquivos lidos integralmente:** schema.ts, validations.ts, csv-import.ts, lead-form-dialog.tsx, csv-column-mapper.tsx, lead-actions.ts, import-actions.ts, csv-import-wizard.tsx, migrate-motivos-perda.cjs, migrate-tarefas.cjs, backfill-origem-tipo.cjs, verify-schema.cjs, package.json
**Data da extração:** 2026-08-31
