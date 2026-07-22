---
phase: 01-lead-sub-nicho-foundation
reviewed: 2026-07-22T12:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - scripts/guard-no-hard-delete.cjs
  - scripts/verify-schema.cjs
  - src/actions/lead-actions.ts
  - src/actions/subnicho-actions.ts
  - src/app/layout.tsx
  - src/app/lixeira/page.tsx
  - src/app/page.tsx
  - src/app/subnichos/page.tsx
  - src/components/app-sidebar.tsx
  - src/components/delete-lead-dialog.tsx
  - src/components/discard-changes-dialog.tsx
  - src/components/etapa-badge.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table-columns.tsx
  - src/components/lead-table-toolbar.tsx
  - src/components/lead-table.tsx
  - src/components/lixeira-table.tsx
  - src/components/subnicho-manager.tsx
  - src/components/ui/popover.tsx
  - src/db/client.ts
  - src/db/migrations/0000_gifted_slapstick.sql
  - src/db/schema.ts
  - src/lib/validations.ts
  - src/types/index.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Fase 1: Relatório de Code Review

**Revisado em:** 2026-07-22
**Profundidade:** standard
**Arquivos revisados:** 23
**Status:** issues_found

## Resumo

Revisão cobre toda a Fase 1 (planos 01 a 04): CRUD de lead/sub-nicho, tabela de leads com filtros/ordenação/paginação, e o trabalho mais recente do plano 01-04 (soft-delete + Lixeira: `softDeleteLead`/`restoreLead`, o guard `guard-no-hard-delete.cjs`, `delete-lead-dialog.tsx`, `lixeira-table.tsx`, `lixeira/page.tsx` e a coluna de ações em `lead-table-columns.tsx`/`lead-table.tsx`).

A lógica de domínio (soft-delete idempotente, guarda `isNull(deletedAt)` em updates, backstop de FK, dedupe case-insensitive de sub-nicho) está bem construída e comentada. O achado mais sério da revisão é no próprio mecanismo de proteção do LEAD-04 (`guard-no-hard-delete.cjs`): ele tem um ponto cego real que permite um `DELETE FROM leads` via SQL cru dentro de um arquivo `.ts` passar despercebido — justamente o cenário que a guarda existe para impedir. Também há alguns pontos de tratamento de erro ausente no client (soft-delete/restore) que podem deixar a UI travada silenciosamente em caso de falha de rede/DB, e uma mensagem de erro trocada em `renameSubnicho`.

## Critical Issues

### CR-01: `guard-no-hard-delete.cjs` não enxerga `DELETE FROM`/`DROP TABLE` embutido em código `.ts`/`.js` — só em migrações `.sql`

**File:** `scripts/guard-no-hard-delete.cjs:106-110`
**Issue:** O guard tem dois conjuntos de padrões — `CODE_PATTERNS` (`.delete(leads`, `.delete(subnichos`) e `SQL_PATTERNS` (`DELETE FROM`, `DROP TABLE`) — mas `SQL_PATTERNS` só é aplicado a arquivos `.sql` dentro de `src/db/migrations/` (`isSqlMigration`). Qualquer arquivo `.ts`/`.js` em `src/` ou `scripts/` que rode SQL cru via `sql` tag do Drizzle (uso legítimo e comum, ex.: `db.run(sql\`DELETE FROM leads WHERE id = ${id}\`)` ou até `DROP TABLE leads`) passa 100% despercebido pela guarda, porque não contém `.delete(leads` nem `.delete(subnichos` (só é checado contra `CODE_PATTERNS`) e não é um arquivo `.sql` de migração (então nunca é checado contra `SQL_PATTERNS`). Isso é exatamente o cenário que o LEAD-04 (soft-delete obrigatório, "nunca mais perder um lead") existe para impedir — hoje o único código-fonte que caça hard-delete literalmente não cobre a forma mais fácil de escrever um (SQL cru em vez do query-builder `.delete()`).
**Fix:**
```js
// Aplica SQL_PATTERNS também a arquivos de código, não só a migrações .sql —
// SQL cru via `sql\`...\`` do Drizzle é tão hard-delete quanto `.delete(leads)`.
if (CODE_EXTENSIONS.has(ext)) {
  scanFile(entryAbsPath, relPath, [...CODE_PATTERNS, ...SQL_PATTERNS]);
} else if (isSqlMigration) {
  scanFile(entryAbsPath, relPath, SQL_PATTERNS);
}
```

## Warnings

### WR-01: `renameSubnicho` devolve mensagem de erro errada quando o `id` é inválido

**File:** `src/actions/subnicho-actions.ts:55-57`
**Issue:** Quando `id` não é um inteiro positivo (campo `id` ausente/forjado no FormData), a action retorna `{ errors: { nome: ["Esse sub-nicho já existe."] } }` — a mesma mensagem usada para nome duplicado. O usuário veria "Esse sub-nicho já existe" quando o problema real é um id inválido, o que é enganoso para depurar/entender o que deu errado.
**Fix:**
```ts
if (!Number.isInteger(id) || id <= 0) {
  return { errors: { nome: ["Sub-nicho inválido."] } };
}
```

### WR-02: Padrões de detecção do guard são somente linha-única e casam texto literal — fácil de escapar por reformatação

**File:** `scripts/guard-no-hard-delete.cjs:45,69-76`
**Issue:** `CODE_PATTERNS` exige que `.delete(` e o nome da tabela apareçam na MESMA linha (`scanFile` testa `pattern.test(lineText)` linha a linha). Um `db.delete(\n  leads\n)` formatado em múltiplas linhas (saída comum de Prettier para chamadas longas) não bate com `/\.delete\(\s*leads\b/` porque `leads` fica em outra linha. Da mesma forma, um import com alias (`import { leads as l } from "@/db/schema"` seguido de `.delete(l)`) nunca aparece na allowlist de padrões, pois o regex depende do nome literal `leads`/`subnichos`. Isso reduz o guard a uma proteção "só contra a forma mais óbvia e não-reformatada" de hard-delete.
**Fix:** Normalizar espaços em branco (incluindo quebras de linha) antes de casar o padrão contra o conteúdo inteiro do arquivo, em vez de linha a linha:
```js
const flattened = content.replace(/\s+/g, " ");
for (const pattern of patterns) {
  if (pattern.test(flattened)) {
    findings.push({ file: relPath, line: "?", text: "match multi-linha — ver arquivo" });
  }
}
```
(Uma solução mais robusta seria parsing via AST, mas a normalização de espaços já fecha o caso mais provável.)

### WR-03: `handleDeleteConfirm` não trata falha de `softDeleteLead` — dialog e estado ficam presos silenciosamente

**File:** `src/components/lead-table.tsx:96-104`
**Issue:** Se `softDeleteLead` lançar (erro de conexão/DB), a `Promise` rejeita dentro do callback assíncrono passado a `startTransition`; `toast.success(...)` e `setDeleteState({ open: false })` nunca executam. O resultado é uma rejeição de promise não tratada e o modal de confirmação de exclusão permanece aberto (ou em estado indefinido) sem nenhum feedback de erro ao usuário — ele não sabe que a exclusão falhou.
**Fix:**
```ts
startTransition(async () => {
  try {
    await softDeleteLead(lead.id);
    toast.success("Lead movido para a Lixeira.");
  } catch {
    toast.error("Não foi possível excluir o lead. Tente novamente.");
  } finally {
    setDeleteState({ open: false });
  }
});
```

### WR-04: `handleRestore` não trata falha de `restoreLead` — botão de restaurar fica desabilitado para sempre naquela linha

**File:** `src/components/lixeira-table.tsx:63-70`
**Issue:** Mesmo padrão do WR-03: `setRestoringId(lead.id)` é setado antes da chamada, mas só é resetado para `null` na linha após o `await restoreLead(...)`. Se `restoreLead` lançar, `setRestoringId(null)` nunca roda — o botão de restaurar daquele lead específico (`disabled={isPending && restoringId === row.original.id}`) fica desabilitado permanentemente até um refresh manual da página, sem nenhum toast de erro explicando o que aconteceu.
**Fix:**
```ts
function handleRestore(lead: LixeiraRow) {
  setRestoringId(lead.id);
  startTransition(async () => {
    try {
      await restoreLead(lead.id);
      toast.success("Lead restaurado com sucesso.");
    } catch {
      toast.error("Não foi possível restaurar o lead. Tente novamente.");
    } finally {
      setRestoringId(null);
    }
  });
}
```

### WR-05: `verify-schema.cjs` está desatualizado em relação ao schema atual (não valida as colunas/índice do plano 01-04)

**File:** `scripts/verify-schema.cjs:29-30`
**Issue:** O comentário do arquivo (linhas 1-4) descreve este script como o gate obrigatório de sync de schema da Fase 1. Porém `requiredTables`/`requiredIndexes` só verificam o schema original de `01-01` (`leads`, `subnichos`, `subnicho_nome_unique_idx`). Colunas adicionadas depois (`motivo_perda`, `stage_changed_at` em `0001_grey_xavin.sql`, e principalmente `deleted_at`/`leads_deleted_at_idx`, essenciais para o soft-delete do 01-04) não são checadas. Um banco `crm.db` desatualizado (sem essas colunas/índice) passaria neste gate mesmo estando quebrado para os recursos mais recentes (Lixeira).
**Fix:**
```js
const requiredIndexes = ["subnicho_nome_unique_idx", "leads_deleted_at_idx"];
// e, idealmente, checar colunas via PRAGMA table_info('leads') incluindo
// deleted_at, motivo_perda, stage_changed_at.
```

## Info

### IN-01: `LeadRow` e `LixeiraRow` são tipos duplicados

**File:** `src/components/lead-table-columns.tsx:9`, `src/components/lixeira-table.tsx:32`
**Issue:** Ambos são definidos de forma idêntica como `Lead & { subnichoNome: string }` em arquivos diferentes, em vez de um único tipo compartilhado.
**Fix:** Exportar `LeadRow` de `lead-table-columns.tsx` e reaproveitar em `lixeira-table.tsx` (ex.: `import type { LeadRow } from "@/components/lead-table-columns"`), ou extrair para `src/types/index.ts`.

### IN-02: Campos de texto livre sem limite máximo de tamanho

**File:** `src/lib/validations.ts:6,10,29,34,40`
**Issue:** `subnichoSchema.nome`, `leadSchema.nome`, `origem`, `notas` e `motivoPerda` só validam `.trim().min(1, ...)`, sem `.max(...)`. Nada impede um valor absurdamente grande ser inserido (colagem acidental de um texto enorme, por exemplo), inflando o banco sem necessidade.
**Fix:** Adicionar limites razoáveis, ex.: `z.string().trim().min(1, "...").max(200, "Máximo de 200 caracteres.")` para campos curtos e `.max(5000, ...)` para `notas`.

### IN-03: Casts `as unknown as` para contornar a tipagem do `Select` genérico

**File:** `src/components/lead-form-dialog.tsx:220,290`
**Issue:** `CANAL_OPTIONS as unknown as { value: string; label: string }[]` e `STAGE_OPTIONS as unknown as { value: string; label: string }[]` são "escape hatches" de tipagem — se o componente `Select` mudar sua assinatura de `items`, o compilador não vai pegar uma incompatibilidade aqui.
**Fix:** Tipar `Select` como genérico (`Select<T extends string>`) ou tipar `CANAL_OPTIONS`/`STAGE_OPTIONS` já como `{ value: string; label: string }[]` na declaração, evitando o cast duplo.

### IN-04: `LeadFormDialog` é um componente monolítico grande (~350 linhas de JSX)

**File:** `src/components/lead-form-dialog.tsx:82-427`
**Issue:** As três seções do formulário ("Contato", "Negócio", "Acompanhamento") estão todas inline no mesmo componente, dificultando leitura e manutenção futura.
**Fix:** Extrair cada seção em um subcomponente (`LeadContatoFields`, `LeadNegocioFields`, `LeadAcompanhamentoFields`) recebendo `form` (do react-hook-form) por prop.

---

_Reviewed: 2026-07-22T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
