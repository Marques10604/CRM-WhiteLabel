---
status: complete
phase: 08-origem-governada-separa-o-inbound-outbound
source: [08-VERIFICATION.md, 08-SPEC.md, 08-01-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-08-07T23:59:00Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 0
method: "code+data (Fase 18 / AUDIT-05, D-01 revisado — navegador bloqueado por hardware). Leitura de lead-form-dialog.tsx + validations.ts + csv-import.ts + import-actions.ts + harnesses verify:origem-tipo, test:lead-actions (Casos 9/10 + bulkImportLeads sem origemTipo — fecha o WR-03) + query no data/crm.db."
audit: "Fase 18 — AUDIT-05"
---

## Current Test

[completo — 4/4 cenários pass por code+data. O gap WR-03 (bulkImportLeads sem prova comportamental) está fechado pelo harness.]

## Tests

### 1. Abrir "Novo lead" e observar o campo "Tipo de origem"
expected: Campo aparece logo abaixo de "Origem", com placeholder "Selecione o tipo de origem" (nada pré-selecionado) e exatamente duas opções no select: Inbound e Outbound
result: pass
evidence: |
  (code+data) `src/components/lead-form-dialog.tsx` — o `<Field data-invalid={!!errors.origemTipo}>`
  (linha 285-321) está imediatamente APÓS o `<Field>` de `origem` (linha 274-283), dentro da
  seção "Contato" (D-02). `ORIGEM_TIPO_OPTIONS = [{ value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" }]` (linha 65-68) — exatamente 2 opções.
  `<SelectValue placeholder="Selecione o tipo de origem" />` (linha 303). `defaultValues.origemTipo
  = lead?.origemTipo` SEM fallback (linha 123) → no modo criação (`lead` undefined) o valor é
  `undefined` e o placeholder aparece — mesmo mecanismo já em produção para `canal` (linha 122).
  Nota: a posição EXATA no layout renderizado é confirmável 100% só em navegador; a ordem de
  source e o conteúdo do select estão verificados por código.

### 2. Preencher o formulário de criação de lead e clicar em Salvar sem escolher "Tipo de origem"
expected: O salvamento é bloqueado e a mensagem "Selecione o tipo de origem." aparece visualmente abaixo do campo
result: pass
evidence: |
  (code+data) `src/lib/validations.ts:67-69` — `origemTipo: z.enum(["inbound", "outbound"],
  { error: "Selecione o tipo de origem." })` **SEM `.default()`** (comentário na linha 69:
  "D-04 exige que o formulário manual nunca pré-selecione um valor"). `createLead`
  (`lead-actions.ts:69-72`) retorna `{ errors: parsed.error.flatten().fieldErrors }` sem
  tocar o banco quando `!parsed.success`. `lead-form-dialog.tsx:319` renderiza
  `<FieldError errors={[errors.origemTipo]} />` (mesmo componente/padrão dos outros campos
  obrigatórios, cuja renderização foi confirmada AO VIVO no UAT da Fase 16 — form em branco →
  todos os obrigatórios mostraram "... é obrigatório").
  Harness `test:lead-actions` (exit 0): "createLead com origemTipo vazio: errors.origemTipo
  inclui 'Selecione o tipo de origem.' (got {"origemTipo":["Selecione o tipo de origem."]})".

### 3. Abrir o modal de EDIÇÃO de qualquer lead pré-existente (backfillado pela plan 08-01) e observar o controle "Tipo de origem"
expected: O select já vem com "Outbound" selecionado
result: pass
evidence: |
  (code+data) `lead-form-dialog.tsx:123` — `defaultValues.origemTipo = lead?.origemTipo`; no
  modo edição `lead.origemTipo` vem preenchido. `<Controller name="origemTipo">` +
  `<Select value={(field.value as string | undefined) ?? null}>` (linha 288-296) — mesmo
  mecanismo de hidratação que `canal` (em produção e funcional desde a Fase 1).
  Data: `data/crm.db` — `verify:origem-tipo` (exit 0): "distribuição no banco real: inbound=2,
  outbound=42". Todas as 44 linhas de `leads` têm `origem_tipo` NOT NULL (backfill uniforme
  confirmado em `08-01-SUMMARY.md` — 33 linhas na época, hoje 44). A coluna física tem
  `DEFAULT 'outbound'` (`schema.ts` → `CREATE TABLE leads ... origem_tipo text DEFAULT 'outbound'
  NOT NULL`). Um lead pré-existente qualquer abre com "outbound".

### 4. Importar um CSV de teste (2-3 linhas) via /importar e consultar `data/crm.db` filtrando pelo `import_batch_id` do lote
expected: Todas as linhas do lote têm `origem_tipo = 'outbound'`
result: pass
evidence: |
  (code+data) `src/lib/validations.ts:130-135` — `csvRowSchema` faz
  `.extend({ origemTipo: z.enum(["inbound", "outbound"]).default(CSV_DEFAULTS.origemTipo) })`;
  `CSV_DEFAULTS.origemTipo = "outbound"` (`src/lib/csv-import.ts:80`) é a FONTE ÚNICA (WR-01
  da Fase 8 — `csvRowSchema` importa `CSV_DEFAULTS`, sem literal duplicado). O wizard NUNCA
  coleta essa escolha — não é campo mapeável. `bulkImportLeads` (`import-actions.ts:150-155`):
  `tx.insert(leads).values({ ..., origemTipo: row.origemTipo, ... })` — `row.origemTipo` já
  resolvido para `"outbound"` pelo `.default()` do schema.
  Harness `test:lead-actions` (exit 0) — **fecha o gap WR-03 do `08-REVIEW.md`**
  ("`bulkImportLeads` nunca foi de fato invocada"): agora É invocada contra um banco temporário:
  - "csvRowSchema.safeParse(linha sem origemTipo): success === true"
  - "csvRowSchema.safeParse(linha sem origemTipo): data.origemTipo === 'outbound'"
  - "bulkImportLeads(linha sem origemTipo): insere exatamente 1 linha (antes=3, depois=4)"
  - "bulkImportLeads(linha sem origemTipo): linha persistida com origemTipo === 'outbound'"
  - "bulkImportLeads(linha sem origemTipo): linha persistida com importBatchId não-nulo"
  `verify:origem-tipo` (exit 0): checa os 5 elos estruturais (schema.ts, validations.ts x2,
  lead-form-dialog.tsx, import-actions.ts) + 3 invariantes de banco real.
  Nota: um import real NOVO no `data/crm.db` não foi executado (regra da Fase 18: só SELECT no
  banco real). A prova comportamental agora existe via harness (banco temporário) — é
  exatamente o teste que o `08-REVIEW.md` WR-03 pedia.

## Summary

total: 4
passed: 4 (code+data)
issues: 0
pending: 0
skipped: 0
blocked: 0

## Método de Verificação (Fase 18, D-01 revisado)

Navegador bloqueado por hardware (host 4GB). Verificação por code+data:

1. **Superfície:** `src/components/lead-form-dialog.tsx` (campo `origemTipo` + posição +
   placeholder + opções + hidratação de edição), `src/lib/validations.ts`
   (`leadBaseSchema.origemTipo` sem default; `csvRowSchema` com `.default(CSV_DEFAULTS.origemTipo)`),
   `src/lib/csv-import.ts` (`CSV_DEFAULTS.origemTipo`), `src/actions/import-actions.ts`
   (`bulkImportLeads` insere `row.origemTipo`).
2. **Harnesses (exit 0):** `verify:origem-tipo` (5 elos + 3 invariantes de banco real:
   inbound=2, outbound=42, 0 NULL), `test:lead-actions` (Casos 9/10 — obrigatoriedade +
   persistência no form; + 3 asserções de `bulkImportLeads` sem `origemTipo`, que **fecham o
   gap comportamental WR-03**), `test:mutation-guard` (guarda prova por mutação em cópia
   temporária, sem tocar o arquivo real).
3. **Query no `data/crm.db`:** 44/44 leads com `origem_tipo` NOT NULL; coluna física
   `DEFAULT 'outbound'`.

### O que um pass de navegador ainda acrescentaria

- Posição EXATA do campo no DOM renderizado (abaixo de "Origem").
- O `<FieldError>` "Selecione o tipo de origem." visível na tela ao submeter sem escolher
  (o bloqueio server-side está provado; o padrão de render do `<FieldError>` foi confirmado
  ao vivo na Fase 16 para os outros campos obrigatórios).
- O `<Select>` da edição mostrando "Outbound" hidratado pelo react-hook-form.

## Issues Encontradas

(nenhuma — auditoria code+data não encontrou defeito. O único gap real da fase, o WR-03 do
`08-REVIEW.md` — "`bulkImportLeads` nunca foi de fato invocada em nenhum teste" —, foi
FECHADO: a quick 260807-uit adicionou os Casos 11/12 a `test-lead-actions.cjs` e as asserções
de `bulkImportLeads(linha sem origemTipo)` invocam a função de fato contra um banco temporário.)

## Gaps

- Import real NOVO no `data/crm.db` não executado (regra Fase 18: só SELECT) — coberto por
  harness (banco temporário).
- Renderização visual do campo/erro diferida para navegador.
- Nenhum gap bloqueia AUDIT-05.
