---
phase: 15-campo-interesse-servi-o-desejado-no-lead
reviewed: 2026-08-31T12:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - package.json
  - scripts/migrate-interesse.cjs
  - scripts/test-lead-actions.cjs
  - scripts/verify-schema.cjs
  - src/actions/import-actions.ts
  - src/actions/lead-actions.ts
  - src/components/csv-column-mapper.tsx
  - src/components/csv-import-preview-table.tsx
  - src/components/csv-import-wizard.tsx
  - src/components/lead-form-dialog.tsx
  - src/db/schema.ts
  - src/lib/csv-import.ts
  - src/lib/validations.ts
findings:
  critical: 0
  blocker: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Fase 15: Relatório de Code Review

**Revisado:** 2026-08-31
**Profundidade:** standard
**Arquivos revisados:** 13
**Status:** issues_found

## Resumo

A Fase 15 adiciona o campo opcional de texto livre `interesse` ("serviço desejado")
ao lead: coluna nullable em `leads`, propagação via `leadBaseSchema` para
`leadSchema` e `csvRowSchema`, `<Input>` no formulário, persistência nas Server
Actions (`createLead`/`updateLead`/`bulkImportLeads`) com o idioma `?? null`,
mapeamento no wizard de CSV com truncamento `.slice(0, 500)` antes da validação, e
migração manual idempotente `.cjs`.

Os quatro pontos de foco pedidos foram auditados:

- **truncate-before-validate:** correto. `mapCsvRows` faz `readMapped(...).trim().slice(0, 500)`
  antes de `csvRowSchema.safeParse`. Como o `.slice` conta code units UTF-16 e o
  `z.string().max(500)` também, os limites batem — a linha do wizard nunca reprova
  por tamanho. A defesa em profundidade no servidor (`csvRowSchema.max(500)`)
  ainda protege chamadas RPC diretas de `bulkImportLeads`.
- **idioma undefined→null:** correto para o caso comum (campo totalmente vazio),
  mas **falha para entrada só com espaços em branco no formulário manual** — ver
  WR-01.
- **mass-assignment nos caminhos `Object.fromEntries`:** seguro. `parsed.data` vem
  de `z.object` (comportamento padrão "strip"), então chaves forjadas em
  `FormData` (`id`, `deletedAt`, `contactAttempts`, `createdAt`...) são descartadas
  antes do `...parsed.data`. O override explícito `interesse: parsed.data.interesse ?? null`
  vem depois do spread e é load-bearing no `updateLead` (sem ele, limpar o campo
  na edição omitiria a coluna do UPDATE e deixaria o valor antigo preso).
  `bulkImportLeads` não usa spread — lista de campos explícita.
- **migração:** idempotente (guard via `PRAGMA table_info`), aditiva, sem backfill,
  com backup + checkpoint WAL + verificação pós-migração. Observações menores em IN-03.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Campo `interesse` só com espaços em branco é persistido como `""`, não `NULL` (viola D-04)

**Arquivo:** `src/lib/validations.ts:71-74` (consumido por `src/actions/lead-actions.ts:101` e `:179`)

**Issue:**
O `z.preprocess` de `interesse` testa `v === ""` **antes** de qualquer trim:

```ts
interesse: z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().trim().max(500, "...").optional()
),
```

Uma entrada só com espaço (`" "`, `"\t"`) não é igual a `""`, então passa direto
para o schema interno. Lá `z.string().trim()` transforma o valor em `""`, e
`.optional()` **não** converte string vazia em `undefined` — só aceita `undefined`.
Resultado: `parsed.data.interesse === ""`.

Na Server Action, `parsed.data.interesse ?? null` só captura `undefined`/`null`, não
`""`. Então `createLead`/`updateLead` gravam `interesse = ''` no banco.

Isso contradiz diretamente o contrato D-04, repetido ~4 vezes nos comentários do
código ("vazio grava NULL, nunca string vazia" — `schema.ts:92-95`,
`validations.ts:37-40`, `lead-actions.ts:98-101`, `lead-form-dialog.tsx:127-130`)
e é exatamente o buraco no "idioma undefined→null" que esta revisão deveria
verificar. O caminho do CSV não é afetado porque `mapCsvRows` já faz `.trim()`
antes, entregando `""` que o preprocess converte para `undefined`.

Impacto: baixo hoje (nenhuma query desta fase filtra por `interesse`), mas um
`WHERE interesse IS NOT NULL` futuro contaria esse lead incorretamente, e o
contrato explícito da fase fica quebrado. Nenhum teste cobre esse caso — o Caso 14
de `test-lead-actions.cjs` só exercita `interesse: ""` exato.

**Fix:** fazer o trim dentro do preprocess (idioma consistente com o que a coluna
promete):

```ts
interesse: z.preprocess(
  (v) => {
    const s = typeof v === "string" ? v.trim() : v;
    return s === "" || s === null || s === undefined ? undefined : s;
  },
  z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()
),
```

Adicionar um caso em `test-lead-actions.cjs`: `createLead({ interesse: "   " })` →
linha persistida com `interesse === null`.

### WR-02: Prévia de importação de CSV não mostra a coluna `interesse` mapeada

**Arquivo:** `src/components/csv-import-preview-table.tsx:110-180` (`previewColumns`)

**Issue:**
O wizard agora permite mapear uma coluna do CSV para `interesse`
(`csv-column-mapper.tsx:25`), o valor é lido, truncado silenciosamente em 500 chars
(`csv-import.ts:147`, D-10) e importado (`import-actions.ts:156`). Mas `previewColumns`
não inclui `interesse` — todas as outras colunas mapeáveis (`nome`, `telefone`,
`nichoNome`, `canal`, `origem`, `valorEstimado`, `notas`) aparecem na tabela de
prévia; `interesse` é a única que não.

Consequência: o admin confirma a importação sem nunca ver o que será gravado em
`interesse`. Se ele mapeou a coluna errada, não há como perceber no passo cujo
propósito explícito é "ver e decidir sobre cada linha antes de confirmar"
(docstring do componente, linha 194-200). O truncamento em 500 (D-10) também é
100% invisível — nenhum aviso na prévia como existe para telefone inválido /
duplicado / nicho novo.

**Fix:** adicionar uma coluna à `previewColumns`, no mesmo padrão de `notas`:

```ts
{
  accessorKey: "interesse",
  header: "Interesse",
  cell: ({ row }) => (
    <span className="block max-w-xs whitespace-pre-line">
      {row.original.interesse || "—"}
    </span>
  ),
},
```

Opcional: quando `row.original.interesse.length === 500`, exibir um badge/aviso de
"texto cortado em 500 caracteres" para tornar o D-10 observável.

## Info

### IN-01: Comentários desatualizados "7 campos fixos" em `csv-column-mapper.tsx`

**Arquivo:** `src/components/csv-column-mapper.tsx:64-66` e `:73-76`

**Issue:** `FIELD_CONFIGS` passou de 7 para 8 entradas (com `interesse`), mas os
comentários ainda dizem "nenhum dos 7 campos fixos". O código funciona (deriva
dinâmica de `Object.values(mapping)`), só o comentário mente.

**Fix:** trocar "7" por "8" nos dois comentários, ou remover o número ("os campos
fixos do mapping").

### IN-02: `.slice(0, 500)` pode partir um par surrogate / emoji na fronteira

**Arquivo:** `src/lib/csv-import.ts:147`

**Issue:** `readMapped(row, "interesse").slice(0, 500)` corta por code unit UTF-16.
Se o caractere nas posições 499/500 for um emoji (par surrogate) ou grafema
composto, o valor gravado termina com um surrogate solto / caractere quebrado.
Puramente cosmético e raríssimo em um campo "serviço desejado".

**Fix (opcional):** usar `Array.from(str).slice(0, 500).join("")` para cortar por
code point, ou aceitar a limitação (é texto livre de baixa consequência).

### IN-03: Migração acumula arquivos de backup e assume app parado

**Arquivo:** `scripts/migrate-interesse.cjs:34-46`

**Issue:** dois pontos menores:
1. Cada execução cria um `crm.db.backup-<timestamp>` novo, inclusive nas execuções
   idempotentes (coluna já existe) — sem limpeza, os backups acumulam no
   diretório `data/`.
2. Entre `dbForCheckpoint.close()` e `fs.copyFileSync`, se a app Next estiver
   rodando (WAL ativo), uma escrita concorrente pode entrar no `-wal` e não
   constar no backup do arquivo principal. O script não consegue impedir isso e
   depende da premissa operacional "rode com a app parada".

Ambos são consistentes com o padrão já usado pelos outros `scripts/migrate-*.cjs`
do projeto — não é regressão desta fase.

**Fix (opcional):** documentar no cabeçalho do script "pare a app antes de rodar";
opcionalmente pular a criação de backup quando `hasColumn === true` (nada a
migrar), ou gravar o backup em `data/backups/` com retenção.

---

_Revisado: 2026-08-31_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
