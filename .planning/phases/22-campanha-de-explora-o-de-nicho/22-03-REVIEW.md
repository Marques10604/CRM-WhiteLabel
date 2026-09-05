---
phase: 22-campanha-de-explora-o-de-nicho
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/lib/validations.ts
  - src/actions/lead-actions.ts
  - src/components/campanha-combobox.tsx
  - src/components/lead-form-dialog.tsx
  - src/components/lead-table.tsx
  - src/components/followup-dashboard.tsx
  - src/components/pipeline-board.tsx
  - src/app/leads/page.tsx
  - src/app/page.tsx
  - src/app/pipeline/page.tsx
  - scripts/test-lead-actions.cjs
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: resolved
resolved_by: b9a2c44
resolved_at: 2026-09-05
resolution: >
  WR-01 (updateLead revalida /leads), WR-02 (comentário do backstop de FK
  corrigido para onDelete:"set null" / backstop inalcançável para campanha),
  WR-03 (Caso 27 no harness: campanha soft-deletada continua salvável, T-22-12)
  — todos fechados no commit b9a2c44. Gate completo verde. IN-01/02/03 aceitos
  como débito menor (IN-02 = colisão do rótulo "Nenhuma campanha" com o
  placeholder; IN-01/03 = notas de manutenção do idioma de campo opcional).
---

# Fase 22 (plano 22-03): Relatório de Code Review

**Revisado:** 2026-09-05
**Profundidade:** standard
**Arquivos revisados:** 11
**Status:** issues_found

## Resumo

Escopo revisado: o gap closure de CAMPANHA-03 (vincular lead a uma campanha via
o formulário de edição), diff `64b462a..HEAD`. Cobre o campo opcional
`campanhaId` em `leadBaseSchema`, o `.omit()` em `csvRowSchema`, o guard
`campanhaExists()` em `createLead`/`updateLead`, o novo `<CampanhaCombobox>`, a
prop `campanhas` propagada pelos 5 arquivos de fiação e os casos 21-26 do
harness.

Avaliação geral: a implementação segue fielmente o idioma estabelecido
(`motivoPerdaId` / `interesse`). O caminho feliz (linkar / trocar / desvincular /
id forjado) está correto e coberto por testes de runtime reais. O `.omit()` em
`csvRowSchema` fecha o vetor de import (T-22-11) e o caso 26 detecta regressão de
shape. O override load-bearing `campanhaId: parsed.data.campanhaId ?? null` está
protegido por caso de runtime (24) + asserção estática.

Nenhum BLOCKER. Três WARNINGs: (1) `updateLead` não revalida `/leads` — a
superfície primária de edição do novo campo; (2) a justificativa do backstop de
FK está factualmente errada para campanha (`onDelete: "set null"`, não
`"restrict"`); (3) as duas comportamentos de soft-delete explicitamente
reivindicados (T-22-12 e a exceção `id === value` do combobox) não têm nenhuma
cobertura de teste.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `updateLead` não revalida `/leads` — o campo Campanha é editado justamente a partir de `/leads`

**Arquivo:** `src/actions/lead-actions.ts:270-272`
**Issue:** `updateLead` só chama `revalidatePath("/")` e
`revalidatePath("/pipeline")`. Falta `revalidatePath("/leads")` (compare com
`createLead`, linhas 161-163, que revalida as três). A superfície primária de
edição de lead — e a única onde o novo campo Campanha faz sentido ser mexido em
lote — é a tabela em `/leads` (`LeadTable` → `LeadFormDialog` modo edição →
`updateLead`). Depois de salvar, o `LeadFormDialog` faz `form.reset()` +
`onOpenChange(false)` sem `router.refresh()`, então depende inteiramente do
`revalidatePath`. Como `/leads` não é revalidado, o array `leads` do Server
Component fica stale: ao reabrir o mesmo lead, `defaultValues.campanhaId =
lead?.campanhaId ?? undefined` usa o valor pré-edição e o combobox mostra a
campanha antiga (ou vazio). Isso quebra o critério de aceite implícito "reabrir o
lead e ver a campanha ainda selecionada". É um gap pré-existente (vale para
`interesse`, `notas`, etc. da Fase 15), mas a Fase 22 coloca-o no caminho
crítico.
**Fix:**
```ts
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  return { success: true };
```

### WR-02: A justificativa do backstop de FK está errada para campanha (`onDelete: "set null"`, não `"restrict"`)

**Arquivo:** `src/actions/lead-actions.ts:144-159` (e comentário análogo em `258-260`)
**Issue:** O comentário do `catch` afirma: *"onDelete:"restrict" no schema faz o
SQLite lançar SQLITE_CONSTRAINT_FOREIGNKEY nesse caso [campanhaId apagado na
janela de corrida]"*. Isso é factualmente incorreto para campanha:
`src/db/schema.ts:177` declara `campanhaId: integer("campanha_id").references(()
=> campanhas.id, { onDelete: "set null" })`. Além disso, `campanhas` é
soft-delete-only (o guard `guard-no-hard-delete` e a convenção LEAD-04 impedem
hard-delete), e `campanhaExists()` ignora `deletedAt` de propósito — logo
`campanhaExists` sempre retorna `true` para qualquer campanha real e a FK do
INSERT nunca é violada por campanha. A janela de corrida check-then-write
descrita simplesmente não existe para campanha. Consequência real (ainda que
quase impossível de disparar): se um erro de FK de campanha ocorresse, o `catch`
retornaria `{ errors: { nichoId: ["Selecione um nicho."] } }` — erro de nicho num
nicho válido. Documentado como T-22-14 "imprecisão aceita", mas o comentário
descreve incorretamente um controle de segurança.
**Fix:** Corrigir o comentário para refletir que (a) `campanhaId` usa
`onDelete: "set null"`, (b) campanhas nunca são hard-deletadas, e (c) portanto o
backstop de FK para campanha é efetivamente inalcançável e `campanhaExists()` é a
única barreira relevante.

### WR-03: Zero cobertura de teste para os dois comportamentos de soft-delete reivindicados (T-22-12 e exceção `id === value`)

**Arquivo:** `scripts/test-lead-actions.cjs:155-168, 664-754`
**Issue:** O harness semeia apenas duas campanhas **ativas** (`campanhaAId`,
`campanhaBId`). Dois comportamentos explicitamente documentados como
intencionais não são exercitados por nenhum caso:
1. `campanhaExists()` ser indiferente a `deletedAt` (comentário em
   `lead-actions.ts:70-75`, threat T-22-12) — "editar e salvar um lead cuja
   campanha foi removida não pode passar a falhar". Nenhum caso soft-deleta uma
   campanha ligada a um lead e re-salva o lead.
2. O filtro do combobox `campanha.deletedAt === null || campanha.id === value`
   (`campanha-combobox.tsx:69`) — a exceção que mantém visível a campanha
   soft-deletada já vinculada. Nenhuma asserção sobre `campanhaItems`.
Ambos são regressões plausíveis (alguém "endurece" `campanhaExists` com
`isNull(deletedAt)` copiando o padrão errado) e nenhum teste as pegaria.
**Fix:** Adicionar caso: `UPDATE campanhas SET deleted_at = unixepoch() WHERE id
= campanhaBId`, depois `updateLead(makeFormData({ id: campanhaLeadId }))` sem
mexer em campanha → assert lead salva com sucesso e `campanha_id` preservado.
Opcionalmente uma asserção de unidade sobre o filtro do combobox.

## Info

### IN-01: Sem teste ponta-a-ponta de `bulkImportLeads` com `campanhaId` forjado na linha (T-22-11)

**Arquivo:** `scripts/test-lead-actions.cjs:744-754`
**Issue:** O caso 26 só valida `csvRowSchema.safeParse(makeImportRow())` numa
linha limpa e checa `!("campanhaId" in parsed.data)`. Isso pega regressão de
shape do schema, mas não prova o threat model completo: uma linha de import
contendo explicitamente `campanhaId` (ou `campanha_id`) deve resultar em lead
importado com `campanha_id` NULL. Na prática o vetor é inalcançável (não há
coluna de campanha no mapeamento do wizard e `.omit()` remove o campo), então
risco baixo.
**Fix:** `bulkImportLeads([makeImportRow({ campanhaId: String(campanhaAId) })])`
e assert que a linha persistida tem `campanha_id === null`.

### IN-02: Item-sentinela "Nenhuma campanha" some sob busca textual e duplica o placeholder

**Arquivo:** `src/components/campanha-combobox.tsx:78, 102`
**Issue:** O item `{ value: NONE_VALUE, label: "Nenhuma campanha" }` tem o mesmo
texto do `placeholder="Nenhuma campanha"` do `ComboboxInput`. Quando nada está
selecionado, o input mostra "Nenhuma campanha" e a primeira linha da lista também
— selecioná-la é um no-op visual. Além disso, o filtro textual embutido do
`Combobox` remove o sentinela quando o usuário digita um termo de busca que não
casa com "nenhuma campanha", então "desvincular" só é acessível com o campo de
busca limpo. Diferente do `MotivoPerdaCombobox`, cujo item de ação "Criar" tem
`label` igual à própria query e por isso nunca é filtrado. Impacto pequeno: o
caminho de desvincular via query vazia funciona.
**Fix (opcional):** Usar um label distinto para o sentinela (ex.: "— Nenhuma
campanha —" ou "Remover vínculo") e/ou um placeholder diferente ("Selecione uma
campanha").

### IN-03: `campanhaId` alarga `LeadFormValues` para `unknown` via `z.preprocess`

**Arquivo:** `src/lib/validations.ts:110-113`
**Issue:** Cópia verbatim do idioma de `motivoPerdaId`. Como `z.input` de
`z.preprocess` é `unknown`, `LeadFormValues["campanhaId"]` fica `unknown`,
forçando o cast `field.value as number | null | undefined` no
`lead-form-dialog.tsx:371`. Consistente com o código existente; anotado só para
manutenção — se o projeto algum dia trocar o idioma dos campos opcionais, os três
(`motivoPerdaId`, `interesse`, `campanhaId`) devem mudar juntos.
**Fix:** Nenhum imediato; considerar `z.union([z.literal(""),
z.coerce.number()...]).transform(...)` com `z.input` mais estreito num refactor
futuro dos campos opcionais.

---

## Resolução — 2026-09-05 (commit `b9a2c44`)

| Achado | Ação |
| --- | --- |
| **WR-01** | `updateLead` agora chama `revalidatePath("/leads")` além de `/` e `/pipeline` (`lead-actions.ts:272`). |
| **WR-02** | Comentário do `catch` de FK reescrito em `createLead` e `updateLead`: `campanhaId` usa `onDelete:"set null"`, campanhas nunca são hard-deletadas → backstop de FK para campanha é inalcançável, `campanhaExists()` é a única barreira. |
| **WR-03** | Caso 27 em `scripts/test-lead-actions.cjs`: soft-delete de uma campanha vinculada, depois `updateLead` re-enviando o mesmo `campanhaId` → assere que salva sem erro e preserva `campanha_id` + `nichoId` (T-22-12). |
| IN-01 | Aceito como débito — nota de manutenção (`z.preprocess` alarga `z.input` para `unknown`; os 3 campos opcionais devem mudar juntos num refactor futuro). |
| IN-02 | Aceito como débito menor — rótulo do sentinela "Nenhuma campanha" colide com o placeholder; desvincular via busca textual exige campo limpo. Impacto pequeno. |
| IN-03 | Igual a IN-01 (mesma raiz). |

Gate completo verde após o fix: `tsc` 0 · `lint` 0 · `build` 0 · `test:lead-actions` OK (1-27) · `verify:schema` 0 · `guard:no-hard-delete` 0.

---

_Revisado: 2026-09-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Profundidade: standard_
_Resolvido: 2026-09-05 (b9a2c44)_
