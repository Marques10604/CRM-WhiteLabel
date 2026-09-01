---
phase: 16-corre-es-de-code-review-da-fase-15
fixed_at: 2026-09-01T00:00:00Z
review_path: .planning/phases/16-corre-es-de-code-review-da-fase-15/16-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Fase 16: Relatório de Correção de Code Review

**Corrigido em:** 2026-09-01
**Review de origem:** .planning/phases/16-corre-es-de-code-review-da-fase-15/16-REVIEW.md
**Iteração:** 1

**Resumo:**
- Achados em escopo: 5 (CR-01, WR-01, WR-02, IN-01, IN-02 — `fix_scope: all`)
- Corrigidos: 5
- Ignorados: 0

## Issues Corrigidos

### CR-01: Correção do IN-02 aborta o import de CSV inteiro para células de `interesse` com caracteres astrais

**Arquivos modificados:** `src/lib/validations.ts`, `scripts/test-lead-actions.cjs`
**Commit:** 3bec2f6
**Fix aplicado:** Em `leadBaseSchema.interesse` (ponto único — `leadSchema` e
`csvRowSchema` herdam), o `.max(500, ...)` de string (contava code UNITS) foi
trocado por `.refine((v) => Array.from(v).length <= 500, "O interesse deve ter no
máximo 500 caracteres.")` — valida por CODE POINT, batendo com o truncamento por
code point de `mapCsvRows` e com o badge da prévia. Um valor truncado em 500 code
points (até ~1000 code units com emoji) agora passa no `csvRowSchema.safeParse`
de `bulkImportLeads` e o lote não é mais abortado. Comentário do `leadBaseSchema`
e comentário D-08/D-09 em `csv-import.ts` atualizados (não falam mais em "code
units" server-side). Adicionado o **Caso 20** em `test-lead-actions.cjs`:
`mapCsvRows([{ Interesse: "😀".repeat(600) }])` → trunca em 500 code points (1000
code units), `interesseTruncado === true`, e `csvRowSchema.safeParse` da célula
truncada retorna `success === true`.
**Verificação:** requer conferência humana da lógica (regra de negócio: limite de
500 "caracteres" = code points nos dois lados). Todos os gates automatizados
passaram, incluindo o novo caso de teste ponta-a-ponta com emoji.

### WR-01: Aviso "Cortado em 500 caracteres" da prévia é derivado de `String.length` e é não-confiável

**Arquivos modificados:** `src/lib/csv-import.ts`, `src/components/csv-import-preview-table.tsx`
**Commit:** 8da0358
**Fix aplicado:** `MappedCsvRow` ganhou o campo `interesseTruncado: boolean`.
`mapCsvRows` agora calcula `Array.from(original)` uma vez, deriva
`interesse = chars.slice(0, 500).join("")` e
`interesseTruncado = chars.length > 500` (comparação por code point, feita por
quem realmente corta). Na célula de `csv-import-preview-table.tsx`, a guarda
`row.original.interesse?.length === 500` virou `row.original.interesseTruncado` —
elimina o falso-negativo com caracteres astrais (500 emoji tinham `.length` 1000)
e o falso-positivo em células de exatamente 500 chars sem truncamento.
`handleConfirm` monta `ConfirmedImportRow` campo a campo (`interesse: r.interesse`),
então `interesseTruncado` NÃO vai para o insert — é só sinal de UI. `previewRows`
faz `{ ...row, flags }`, então o campo novo propaga automaticamente para
`PreviewRow`.
**Verificação:** `npx tsc --noEmit` exit 0; re-leitura confirmou o campo no tipo,
na função e na célula.

### WR-02: `ALTER TABLE` sem try/catch em `migrate-interesse.cjs` deixa backup órfão e pula a verificação em caso de falha

**Arquivos modificados:** `scripts/migrate-interesse.cjs`
**Commit:** eb389bc
**Fix aplicado:** O `db.exec("ALTER TABLE \`leads\` ADD \`interesse\` text;")` do
ramo `!hasColumn` foi envolvido em `try/catch`. Se `err.message` contém
`"duplicate column name"` (corrida entre o check `hasColumn` e o `ALTER`), loga e
segue para o bloco "4) VERIFICAÇÃO PÓS-MIGRAÇÃO"; qualquer outro erro chama
`fail(...)` com mensagem explícita de que o backup foi preservado em
`${backupPath}` para restauração manual. `backupPath` é `const` do mesmo bloco
`if (!hasColumn)`, então está em escopo no `catch`.
**Verificação:** `node -c` exit 0; `npm run migrate:interesse` rodou idempotente
(coluna já existe), exit 0, nenhum backup novo criado.

### IN-01: Comentário desatualizado em `ConfirmedImportRow.interesse`

**Arquivos modificados:** `src/actions/import-actions.ts`
**Commit:** 23ad692
**Fix aplicado:** O JSDoc de `ConfirmedImportRow.interesse` afirmava "Já truncado
em 500 por `mapCsvRows` (D-10), então o `.max(500)` de `csvRowSchema` nunca
reprova." — factualmente incorreto após o IN-02. Reescrito para: "Já truncado em
500 CODE POINTS por `mapCsvRows` (D-10); o `csvRowSchema` valida o mesmo limite
também por code point (`.refine(Array.from(v).length <= 500)`, CR-01 da Fase 16),
então o valor truncado nunca reprova o lote."
**Verificação:** `npx tsc --noEmit` exit 0 (mudança só de comentário).

### IN-02: `migrate-interesse.cjs` reabre o banco sem `fileMustExist`

**Arquivos modificados:** `scripts/migrate-interesse.cjs`
**Commit:** 9db5dd2
**Fix aplicado:** `db = new Database(DB_PATH);` (linha do reopen pós-backup) virou
`db = new Database(DB_PATH, { fileMustExist: true });`, consistente com a linha 47.
Comentário adicionado explicando o risco (banco vazio criado em silêncio se
`DB_PATH` sumisse entre `close()` e reopen, mascarando a causa real na
verificação seguinte).
**Verificação:** `node -c` exit 0; `npm run migrate:interesse` exit 0.

## Issues Ignorados

Nenhum.

## Gates executados (host de 4GB, em SÉRIE)

| Gate | Comando | Exit code |
|------|---------|-----------|
| Tipagem | `npx tsc --noEmit` (via `node_modules/.bin/tsc`) | 0 |
| Testes de lead/import | `npm run test:lead-actions` | 0 |
| Schema do banco | `npm run verify:schema` | 0 |
| Guard hard-delete | `npm run guard:no-hard-delete` | 0 |
| Migração idempotente | `npm run migrate:interesse` | 0 (idempotente, 0 backups novos) |

Notas:
- `npm run test:lead-actions` roda todas as asserções incluindo o novo **Caso 20**
  (emoji ponta-a-ponta): `OK csvRowSchema.safeParse(emoji truncado por mapCsvRows):
  success === true`.
- Gates rodados dentro de um worktree isolado; `node_modules` e `data/` foram
  ligados por junction ao repositório principal só para execução dos gates
  (removidos antes de desmontar o worktree). `verify:schema` e `migrate:interesse`
  são read-only/idempotentes contra o `data/crm.db` real (44 leads intactos).
- `npm run build` não foi executado (estoura o timeout deste host e não estava na
  lista de gates); `npx tsc --noEmit` cobre a checagem de tipos.

---

_Corrigido: 2026-09-01_
_Fixer: Claude (gsd-code-fixer)_
_Iteração: 1_
