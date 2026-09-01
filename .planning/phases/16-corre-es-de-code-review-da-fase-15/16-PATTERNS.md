# Fase 16: Correções de Code Review da Fase 15 - Mapa de Padrões

**Mapeado:** 2026-09-01
**Arquivos analisados:** 6 (todos modificação, zero criação)
**Analogias encontradas:** 6 / 6 (todas com molde interno no próprio repo)

> Fase code-only. Cada alvo já tem snippet no `15-REVIEW.md` e/ou decisão
> (D-01..D-11) no `16-CONTEXT.md`. Este documento anexa a cada alvo o bloco
> **exato de "antes"** (código vivo hoje) e a **analogia de "molde"** (o padrão
> vizinho a copiar), para o planner entregar ao executor alvos concretos.

---

## Classificação dos Arquivos

| Arquivo modificado | Papel | Fluxo de dados | Analogia mais próxima | Qualidade do match |
|--------------------|-------|----------------|-----------------------|--------------------|
| `src/lib/validations.ts` | schema / validação (Zod) | transform (preprocess request→domínio) | `z.preprocess` de `motivoPerdaId` no mesmo arquivo (linhas 80-83) | exato (mesmo papel, mesmo fluxo, mesmo arquivo) |
| `src/lib/csv-import.ts` | utility (mapeamento CSV) | transform / batch | linhas vizinhas do próprio `mapCsvRows` (`canal`, `origem`, `valorEstimado`) + o próprio `interesse` na linha 147 | exato (o bloco a mudar é o próprio) |
| `src/components/csv-import-preview-table.tsx` | component (tabela React, `@tanstack/react-table`) | request-response (render de dados já mapeados) | coluna `notas` em `previewColumns` (linhas 121-132) + `StatusBadges` / `<Badge>` do shadcn (linhas 63-108) | exato (D-04 manda copiar `notas`) |
| `src/components/csv-column-mapper.tsx` | component (form de mapeamento) | comentário apenas | os próprios comentários das linhas 64 e 73-76 | exato (troca só de texto) |
| `scripts/migrate-interesse.cjs` | script de migração (`.cjs`, `better-sqlite3`) | file-I/O / DDL | `scripts/migrate-motivos-perda.cjs` (bloco de backup, linhas 40-52) + o próprio guard `hasColumn` (linhas 56-66) | role-match (mesmo padrão de projeto; D-11 restringe a mudança a este arquivo) |
| `scripts/test-lead-actions.cjs` | test harness (`.cjs` custom, `npm run test:lead-actions`) | request-response (exercita Server Actions) | Caso 13 + Caso 14 (linhas 418-453) | exato (D-02 = variações de `"   "` sobre Casos 13/14) |

**Sem analogia:** nenhum. Todos os 6 alvos têm molde vivo no repositório.

---

## Atribuições de Padrão

### `src/lib/validations.ts` — WR-01 / D-01

**Papel:** schema Zod · **Fluxo:** transform no `z.preprocess`

**Bloco EXATO a mudar** (`src/lib/validations.ts:71-74`, dentro de `leadBaseSchema`):

```ts
  interesse: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()
  ),
```

**Alvo "depois"** (verbatim do `15-REVIEW.md` §WR-01, confirmado por D-01):

```ts
  interesse: z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.trim() : v;
      return s === "" || s === null || s === undefined ? undefined : s;
    },
    z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()
  ),
```

**Analogia / molde** (`src/lib/validations.ts:80-83`, `motivoPerdaId` — o preprocess
do qual `interesse` foi derivado):

```ts
  motivoPerdaId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
```

Nota: `motivoPerdaId` **não** ganha trim (é numérico). A divergência é intencional —
só `interesse` precisa do trim porque é o único `preprocess` de string livre.

**Restrições da decisão:**
- D-09: **NÃO** mexer no `.max(500)` — continua contando code units UTF-16.
- O comentário de bloco em `validations.ts:33-40` descreve o contrato "vazio → undefined";
  não precisa reescrever, mas se tocar, manter coerência com o novo trim.
- `csvRowSchema` (linha 116) deriva de `leadBaseSchema` via `.omit()` → herda a mudança
  automaticamente. O caminho CSV já pré-trima em `mapCsvRows`, então o comportamento lá
  não muda.

**Consumidores (contexto, não editar):** `src/actions/lead-actions.ts:101` e `:179`
já fazem `interesse: parsed.data.interesse ?? null` — com o trim no preprocess, o
`"   "` agora vira `undefined` antes de chegar nesse `?? null`.

---

### `src/lib/csv-import.ts` — IN-02 / D-08

**Papel:** utility de mapeamento · **Fluxo:** transform (truncar-antes-de-validar)

**Bloco EXATO a mudar** (`src/lib/csv-import.ts:147`, dentro de `mapCsvRows`):

```ts
    const interesse = readMapped(row, "interesse").slice(0, 500);
```

**Alvo "depois"** (corte por code point — D-08):

```ts
    const interesse = Array.from(readMapped(row, "interesse")).slice(0, 500).join("");
```

**Contexto do bloco** (linhas 144-147, o comentário D-10 logo acima permanece válido):

```ts
    // D-10: trunca em 500 ANTES de qualquer validação — uma célula gigante do
    // CSV do cowork nunca reprova a linha, o lead importa com o interesse
    // cortado. Sem fallback de CSV_DEFAULTS (D-11): vazio/não-mapeado = "".
    const interesse = readMapped(row, "interesse").slice(0, 500);
```

**Analogia / molde** (linhas vizinhas do mesmo `mapCsvRows`, mostram o idioma
`readMapped(...) || DEFAULT` — aqui NÃO se aplica default, D-11):

```ts
    const canal = (readMapped(row, "canal") || CSV_DEFAULTS.canal) as "instagram" | "whatsapp";
    const origem = readMapped(row, "origem") || CSV_DEFAULTS.origem;
    const valorEstimado = readMapped(row, "valorEstimado") || CSV_DEFAULTS.valorEstimado;
```

**Restrições da decisão:**
- D-08: mudança **só neste arquivo**. NÃO alterar `csvRowSchema.max(500)` (D-09).
- Assimetria aceita: schema conta UTF-16 code units, `mapCsvRows` agora corta por code
  point. O `15-REVIEW.md` §truncate-before-validate confirma que o servidor
  (`csvRowSchema.max(500)`) continua sendo defesa em profundidade para RPC direto.
- `MappedCsvRow.interesse` (tipo, linhas 43-49) continua `string` — sem mudança de tipo.
- Caso 19 do `test-lead-actions.cjs` (linha 516-532) valida `result[0].interesse.length === 500`
  com célula de 600 chars ASCII — continua passando (`Array.from` de ASCII = 1 char por posição).

---

### `src/components/csv-import-preview-table.tsx` — WR-02 / D-04 / D-05 / D-06

**Papel:** component (coluna de `@tanstack/react-table`) · **Fluxo:** render

**Molde EXATO a copiar** — coluna `notas` em `previewColumns` (`csv-import-preview-table.tsx:121-132`):

```ts
  {
    accessorKey: "notas",
    header: "Notas",
    // buildNotasText (05-01) separa colunas extras com \n real, mas o <td>
    // padrão do design system usa whitespace-nowrap (table.tsx) — sem este
    // wrapper, a concatenação vira um único texto corrido na prévia,
    // contrariando a garantia "em linhas separadas" do SC #2/#4 do ROADMAP.
    // Achado em teste real de navegador (gsd-browser) após a Fase 5.
    cell: ({ row }) => (
      <span className="block max-w-xs whitespace-pre-line">{row.original.notas}</span>
    ),
  },
```

**Alvo "depois"** — nova coluna `interesse`, mesmo padrão + badge de truncamento
(D-04: `accessorKey "interesse"`, header `"Interesse"`, `row.original.interesse || "—"`,
`whitespace-pre-line`, `max-w-xs`; D-05: badge quando `length === 500`; D-06: badge
na célula, fora do sistema `RowFlags`). Posição sugerida: logo após `notas` (D-09 da
Fase 15, discrição do CONTEXT). Copy do badge = discrição do Claude, tom PT-BR tipo
"cortado em 500 caracteres".

**Molde do badge** — `StatusBadges` / `<Badge>` do shadcn (`csv-import-preview-table.tsx:63-105`),
padrão visual dos avisos amarelos da prévia:

```tsx
import { Badge } from "@/components/ui/badge";
import { CircleAlert, Sparkles, TriangleAlert } from "lucide-react"; // já importados no topo

<Badge
  variant="outline"
  className="w-fit gap-1 border-transparent"
  style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}  // amarelo = mesmo do "Duplicado"
>
  <TriangleAlert className="size-3" />
  Duplicado
</Badge>
```

Para o badge de truncamento, D-05 pede um aviso "cortado em 500 caracteres". Reusar
o mesmo esquema `#FEF3C7`/`#B45309` + ícone `TriangleAlert` (ou `CircleAlert`) mantém
coerência. **NÃO** adicionar ao `RowFlags` (linhas 31-37) nem ao `StatusBadges` — o
badge mora dentro do `cell` da coluna `interesse` (D-06), tipo:

```tsx
cell: ({ row }) => (
  <div className="flex flex-col gap-1">
    <span className="block max-w-xs whitespace-pre-line">
      {row.original.interesse || "—"}
    </span>
    {row.original.interesse?.length === 500 && (
      <Badge variant="outline" className="w-fit gap-1 border-transparent"
        style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
        <TriangleAlert className="size-3" />
        Cortado em 500 caracteres
      </Badge>
    )}
  </div>
),
```

(estrutura ilustrativa — copy exata é discrição do executor)

**Restrições da decisão:**
- `row.original.interesse` já existe em `PreviewRow` (= `MappedCsvRow & { flags }`),
  campo `interesse: string` (nunca `null` nesse caminho — `""` quando não mapeado).
  Por isso `row.original.interesse || "—"` é seguro; o `?.length` é defensivo mas o
  campo nunca é undefined.
- Não tocar `handleConfirm` (linha 266 já passa `interesse: r.interesse`).
- Não tocar o resumo textual (linhas 291-315) — D-06 mantém o diff pequeno.
- A tabela renderiza colunas genéricas (linhas 331-342) — adicionar a coluna ao array
  `previewColumns` é suficiente, sem mudança no corpo do componente.

---

### `src/components/csv-column-mapper.tsx` — IN-01 / D-07

**Papel:** component · **Fluxo:** comentário apenas (zero mudança de lógica)

**Bloco EXATO a mudar** (`csv-column-mapper.tsx:64-66`):

```ts
  // D-01/D-02/D-04: colunas ainda não usadas em nenhum dos 7 campos fixos —
  // recalculado a cada render (sem useMemo/cache) para que um Select que
  // passe a apontar pra uma coluna já marcada faça o checkbox dela sumir na
```

→ trocar "7 campos fixos" por "8 campos fixos".

**Segundo bloco** (`csv-column-mapper.tsx:73-76`):

```ts
  // WR-01 (05-REVIEW.md): uma coluna marcada como extra pode depois ser
  // remapeada para um campo fixo via Select — sem este filtro, o resumo
  // "Serão concatenadas" continuaria citando essa coluna mesmo ela não
  // sendo mais concatenada de fato (buildNotasText já a exclui via
```

Este segundo trecho **não menciona "7"** no bloco lido (linhas 73-76). O
`15-REVIEW.md` §IN-01 cita "linhas 64-66 e :73-76" e o texto "nenhum dos 7 campos
fixos". O executor deve **procurar toda ocorrência literal de "7 campos fixos" /
"dos 7 campos" / "nenhum dos 7"** no arquivo e trocar por "8" (D-07). `FIELD_CONFIGS`
(linhas 17-26) já tem 8 entradas — o código deriva de `Object.values(mapping)`
dinamicamente, então é só o comentário que mente.

**Analogia:** não há molde externo — é edição de texto pontual. Manter o mesmo estilo
de comentário (prefixo `// D-0x:` / `// WR-0x:`) já usado no arquivo.

---

### `scripts/migrate-interesse.cjs` — IN-03 / D-10 / D-11

**Papel:** script de migração `.cjs` · **Fluxo:** file-I/O + DDL

**Mudança 1 — doc header** (`migrate-interesse.cjs:1-20`, bloco de comentário do topo):
adicionar uma linha explícita **"pare a app Next antes de rodar"** (premissa: WAL ativo
pode não constar no backup). Texto exato = discrição do Claude, tom PT-BR, alinhado ao
estilo do header atual (linhas com `//` e referências a D-06/D-07). Sugestão de ponto
de inserção: logo após a linha 11 (que já fala do molde de backup + checkpoint WAL),
ou perto do `[BLOCKING]` na linha 18.

**Mudança 2 — pular backup quando `hasColumn === true`** (D-10 item 2).

**Bloco EXATO a mudar** (`migrate-interesse.cjs:34-66`):

```js
// 1) BACKUP ANTES DE QUALQUER ESCRITA — checkpoint do WAL primeiro (o
//    src/db/client.ts roda em journal_mode=WAL), senão a cópia do arquivo
//    principal pode não conter escritas ainda pendentes no -wal.
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

// 2) Contagem de referência ANTES de qualquer escrita.
const beforeLeads = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 3) ADD COLUMN idempotente — guarda via PRAGMA table_info (coluna, não
//    tabela). SEM DEFAULT, SEM NOT NULL: coluna nullable, leads antigos ficam
//    NULL (D-06). SQLite lança "duplicate column name" se o ALTER rodar 2x.
const hasColumn = db
  .prepare("PRAGMA table_info(leads)")
  .all()
  .some((c) => c.name === "interesse");

if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `interesse` text;");
  console.log("[migrate-interesse] coluna leads.interesse adicionada (nullable, sem default)");
} else {
  console.log("[migrate-interesse] coluna interesse já existe — pulando ALTER TABLE (idempotência)");
}
```

**Problema:** o `hasColumn` é checado na etapa 3, **depois** do backup (etapa 1). Para
pular o backup quando a coluna já existe, o executor precisa **mover a checagem
`hasColumn` (abrir o DB, `PRAGMA table_info`) para antes do bloco de backup**, e
envolver o backup em `if (!hasColumn) { ...backup... }`. Sequência-alvo:

1. Abrir DB, checar `hasColumn` via `PRAGMA table_info(leads)`.
2. `if (hasColumn)` → log "coluna já existe, nada a migrar, backup não criado" e
   seguir direto para a verificação pós-migração (ou `process.exit(0)` após a
   verificação leve). **Sem** `fs.copyFileSync`.
3. `if (!hasColumn)` → backup (checkpoint WAL + copyFileSync) → `ALTER TABLE` → verificação.

Cuidar para não abrir o mesmo arquivo SQLite em duas conexões simultâneas sem fechar
(o script hoje usa `dbForCheckpoint` e depois `db`). Reaproveitar uma única conexão
para o `PRAGMA` inicial e fechá-la antes do `wal_checkpoint`, ou fazer o checkpoint na
mesma conexão.

**Analogia / molde** (`scripts/migrate-motivos-perda.cjs:40-52`) — mesmo bloco de
backup, idêntico byte a byte exceto o prefixo de log `[migrate-motivos-perda]`:

```js
// 1) BACKUP ANTES DE QUALQUER ESCRITA — checkpoint do WAL primeiro (o
//    src/db/client.ts roda em journal_mode=WAL), senão a cópia do arquivo
//    principal pode não conter escritas ainda pendentes no -wal.
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
try {
  const dbForCheckpoint = new Database(DB_PATH, { fileMustExist: true });
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
  fs.copyFileSync(DB_PATH, backupPath);
} catch (err) {
  fail(`não foi possível criar o backup de ${DB_PATH}: ${err.message}`);
}
console.log(`[migrate-motivos-perda] backup criado em ${backupPath}`);
```

**Restrições da decisão:**
- D-11: a correção fica **SÓ em `migrate-interesse.cjs`**. NÃO replicar para
  `migrate-motivos-perda.cjs`, `migrate-tarefas.cjs`, `migrate-sequencia-followup.cjs`
  (dívida de padrão do projeto → Deferred Ideas do CONTEXT).
- Preservar toda a verificação pós-migração (linhas 68-88): contagem de linhas, tipo
  TEXT, `notnull === 0`, `SELECT interesse ... LIMIT 1`. Quando `hasColumn === true`,
  essas verificações ainda devem rodar (idempotência = confirmar que está tudo certo),
  só o `fs.copyFileSync` é pulado.

---

### `scripts/test-lead-actions.cjs` — FIX-01 / D-02

**Papel:** test harness `.cjs` custom · **Fluxo:** exercita Server Actions

**Molde EXATO a copiar** — Caso 13 + Caso 14 (`test-lead-actions.cjs:418-453`):

```js
  // Caso 13 (LEAD-06, Fase 15): createLead com interesse preenchido -> insere
  // 1 linha e persiste o valor. Prova o critério "criar um lead com o campo
  // Interesse preenchido salva o valor".
  let interesseLeadId;
  {
    const before = await countLeads();
    const outcome = await callToleratingRevalidate(
      createLead,
      makeFormData({ interesse: "quer site institucional + automação de WhatsApp" })
    );
    const after = await countLeads();
    check(after === before + 1, `createLead com interesse: insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    interesseLeadId = row?.id;
    check(
      row?.interesse === "quer site institucional + automação de WhatsApp",
      `createLead com interesse: linha persistida com o valor (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 14 (LEAD-06, D-04): updateLead do mesmo lead com interesse vazio ->
  // interesse = NULL no banco. Prova "editar apagando o texto -> NULL".
  {
    const outcome = await callToleratingRevalidate(
      updateLead,
      makeFormData({ id: String(interesseLeadId), interesse: "" })
    );
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).where(eq(leads.id, interesseLeadId));
    check(row?.interesse === null, `updateLead com interesse vazio: interesse volta a NULL (got ${JSON.stringify(row?.interesse)})`);
  }
```

**Alvo "depois"** — dois casos novos (D-02), inseridos logo após o Caso 14 (renumerar
os casos seguintes 15→17, 16→18, ... OU nomeá-los "Caso 14a / 14b" — discrição do
executor; o harness só imprime a string do `check`, não valida numeração):

1. **`createLead({ interesse: "   " })` → linha persistida com `interesse === null`.**
   Copiar a estrutura do Caso 13 (`before = countLeads()`, `callToleratingRevalidate`,
   ler `db.select().from(leads).orderBy(leads.id).limit(1).offset(before)`), mas
   `makeFormData({ interesse: "   " })` e o `check` final = `row?.interesse === null`.
   Também vale checar `after === before + 1` (só-espaços ainda cria o lead, só o
   campo vira NULL).

2. **`updateLead` limpando um `interesse` existente com `"   "` → coluna vira `null`.**
   Precisa primeiro de um lead COM `interesse` não-nulo. Reusar o `interesseLeadId`
   do Caso 13 **não serve** (o Caso 14 já o zerou). Opções: (a) criar um lead novo
   com `interesse` preenchido no início do bloco, guardar o id, então `updateLead`
   com `makeFormData({ id, interesse: "   " })`; (b) ordenar os casos para rodar o
   novo update ANTES do Caso 14. Caminho (a) é mais robusto. `check` final:
   `row?.interesse === null`. Este caso cobre o `interesse: parsed.data.interesse ?? null`
   load-bearing do `updateLead` (`lead-actions.ts:179`) — sem o trim no preprocess
   (D-01), `"   "` chegaria como `""` e o `?? null` não pegaria.

**Helpers disponíveis** (já definidos no arquivo):
- `makeFormData(overrides = {})` (linha 147) — base tem `nome`, `telefone`, `canal`,
  `origem`, `origemTipo`, `valorEstimado`, `notas`, `followUpDate`, `nichoId`.
- `countLeads()` (linha 167).
- `callToleratingRevalidate(fn, formData)` (linha 176) — tolera o throw de
  `revalidatePath` fora do contexto Next; verificar efeito via leitura do banco.
- `check(condition, message)` (linha 23) — incrementa `failed`.
- `db`, `leads`, `eq` já em escopo.

**Restrições da decisão:**
- D-03: **NÃO** adicionar casos de whitespace exótico (`\t`, `\n`) nem de truncamento
  CSV. Só os dois casos de `"   "` (create + update).
- SC#5 do ROADMAP: `npm run test:lead-actions` precisa sair com exit 0 — os dois casos
  novos devem **passar** contra o código já corrigido (D-01). Ordem de execução:
  garantir que o novo teste roda depois da correção de `validations.ts` estar aplicada.
- Harness é `.cjs` custom, não Vitest/Jest. Seguir o formato bloco `{ ... }` + `check`.

---

## Padrões Compartilhados

### Idioma "vazio grava NULL, nunca string vazia" (D-04 da Fase 15)

**Fonte do contrato:** repetido em `schema.ts:92-95`, `validations.ts:33-40`,
`lead-actions.ts:98-101` e `:177-179`, `lead-form-dialog.tsx:127-130`.

**Aplica a:** WR-01 (a correção do preprocess) e aos 2 casos de teste de D-02.

**Mecânica em 3 camadas:**
1. `z.preprocess` em `validations.ts` normaliza entrada de string → `undefined` quando
   vazia/só-espaço (a correção desta fase adiciona o `.trim()` que faltava).
2. Server Action (`createLead`/`updateLead`) materializa `undefined → null` explícito:
   `interesse: parsed.data.interesse ?? null` (depois do spread `...parsed.data`,
   load-bearing no update).
3. Coluna `leads.interesse` é `text` nullable (migração aditiva, sem default).

### Idioma "truncar-antes-de-validar" (D-10 da Fase 15)

**Fonte:** `csv-import.ts:144-147` (`mapCsvRows`) trunca em 500 **antes** do
`csvRowSchema.safeParse` — célula gigante do CSV nunca reprova a linha.

**Aplica a:** IN-02 (troca `.slice` por corte code-point-safe) e ao badge de D-05
(que torna esse truncamento silencioso **observável** na prévia).

**Defesa em profundidade:** `csvRowSchema.max(500)` (server-side) permanece para
chamadas RPC diretas de `bulkImportLeads`. D-09 mantém essa contagem em UTF-16 code
units mesmo após IN-02 mudar `mapCsvRows` para code points — assimetria aceita.

### Padrão de badge / aviso visual da prévia de import

**Fonte:** `csv-import-preview-table.tsx:63-108` (`StatusBadges` + `<Badge>` do shadcn).

**Esquema:** `<Badge variant="outline" className="w-fit gap-1 border-transparent">` +
`style={{ backgroundColor, color }}` + ícone `lucide-react` `size-3`. Cores fixas por
tipo (amarelo `#FEF3C7`/`#B45309` = duplicado; azul = nicho novo; cinza = sem nicho;
vermelho = telefone inválido).

**Aplica a:** badge de truncamento de D-05 — reusar o esquema amarelo + `TriangleAlert`,
mas **na célula da coluna `interesse`** (D-06), NÃO no `StatusBadges` / `RowFlags`.

### Padrão de script de migração `.cjs`

**Fonte:** `scripts/migrate-motivos-perda.cjs`, `migrate-tarefas.cjs`,
`migrate-sequencia-followup.cjs`, `migrate-interesse.cjs` — todos compartilham:
header doc extenso → `"use strict"` → `DB_PATH` de `process.env.DB_FILE_NAME` →
`fail(msg)` helper → backup (checkpoint WAL + `copyFileSync`) → contagem de referência
→ DDL idempotente com guard `PRAGMA table_info` → verificação pós-migração →
`db.close()` + `process.exit(0)`.

**Aplica a:** D-10 — mas a mudança (pular backup em execução idempotente + doc "pare a
app") fica **restrita a `migrate-interesse.cjs`** (D-11). Os outros scripts são dívida
de padrão do projeto, deferida.

---

## Sem Analogia Encontrada

Nenhum. Todos os 6 alvos têm molde vivo no repositório (na maioria, no próprio arquivo
ou num arquivo irmão direto). Fase de limpeza pura — o `15-REVIEW.md` já entregou os
snippets de WR-01 e WR-02, e as decisões D-01..D-11 refinam o resto.

---

## Metadados

**Escopo da busca de analogias:** `src/lib/`, `src/components/`, `src/actions/`,
`scripts/`
**Arquivos lidos:** `src/lib/validations.ts`, `src/lib/csv-import.ts`,
`src/components/csv-import-preview-table.tsx`, `src/components/csv-column-mapper.tsx`
(topo), `scripts/migrate-interesse.cjs`, `scripts/migrate-motivos-perda.cjs` (bloco de
backup), `scripts/test-lead-actions.cjs` (header + Casos 13-19 + helpers),
`src/actions/lead-actions.ts` (trechos de `interesse`)
**Skills de projeto:** nenhuma (`.claude/skills/` não existe)
**Data da extração:** 2026-09-01
