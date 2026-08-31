---
phase: 15-campo-interesse-servi-o-desejado-no-lead
verified: 2026-08-31T00:00:00Z
status: human_needed
score: 13/13 must-haves verificados na camada de código/dados
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
human_verification:
  - test: "Em /leads, abrir 'Novo lead', preencher 'Interesse', salvar; reabrir o lead em edição."
    expected: "O valor digitado em 'Interesse' reaparece no campo ao reabrir o dialog de edição."
    why_human: "Renderização visual do dialog e ciclo salvar/reabrir — não verificável por grep."
  - test: "Criar um lead deixando 'Interesse' vazio; depois editar um lead apagando o texto de 'Interesse' e salvar."
    expected: "Ambos os submits concluem sem erro de validação; o campo volta vazio após apagar."
    why_human: "Comportamento do submit no navegador (react-hook-form + zodResolver)."
  - test: "Digitar mais de 500 caracteres em 'Interesse' no formulário e tentar salvar."
    expected: "Submit bloqueado com a mensagem 'O interesse deve ter no máximo 500 caracteres.' abaixo do campo."
    why_human: "Exibição do FieldError na UI."
  - test: "Em /importar, subir um CSV com uma coluna livre (ex: 'servico'); no passo de mapeamento, mapear 'servico' -> 'Interesse'; confirmar a importação; abrir um lead importado."
    expected: "'Interesse' aparece na lista de mapeamento com opção '— nenhuma —'; o lead importado mostra o valor da coluna."
    why_human: "Fluxo completo do wizard de CSV no navegador (a prévia não exibe a coluna interesse — ver WR-02)."
  - test: "Repetir a importação do mesmo CSV sem mapear 'Interesse'."
    expected: "Leads criados com interesse nulo, nenhuma regressão no fluxo de importação."
    why_human: "Verificação end-to-end do wizard."
---

# Fase 15: Campo "interesse / serviço desejado" no lead — Relatório de Verificação

**Meta da fase:** O admin registra o que cada lead quer (qual serviço ou automação), pra saber com quem está falando antes de abordar — opcional, sem atrito no cadastro.
**Verificado:** 2026-08-31
**Status:** human_needed
**Re-verificação:** Não — verificação inicial

## Goal Achievement

A meta está alcançada na camada de código e dados. O campo `interesse` existe como
coluna TEXT nullable no banco real, propaga por `leadBaseSchema` para `leadSchema` e
`csvRowSchema`, está renderizado e registrado no `lead-form-dialog.tsx`, é persistido
com o idioma `?? null` em `createLead`/`updateLead`/`bulkImportLeads`, e é mapeável no
wizard de CSV com truncamento em 500 antes da validação. Todas as asserções
automatizadas de `interesse` passam (10/10 no harness `test:lead-actions`).

Restam apenas os human-checks de navegador, deliberadamente diferidos para o fim da
fase (`human_verify_mode: end-of-phase`) — por isso o status é `human_needed`, não
`passed` nem `gaps_found`.

### Observable Truths

| # | Truth | Status | Evidência |
| --- | --- | --- | --- |
| 1 | Formulário de lead tem campo opcional "Interesse" (texto livre) que salva e persiste (ROADMAP SC1) | ✓ VERIFIED | `lead-form-dialog.tsx:349-363` `<Input id="interesse" {...form.register("interesse")}>`; `lead-actions.ts:101` `interesse: parsed.data.interesse ?? null` no `.values` de `createLead`; harness: `OK createLead com interesse: linha persistida com o valor` |
| 2 | O campo aparece na tela de detalhe/edição com o valor salvo (ROADMAP SC2) | ✓ VERIFIED | `lead-form-dialog.tsx:130` `defaultValues.interesse = lead?.interesse ?? ""`; o dialog é a única tela de criar+editar (confirmado no 15-SPEC) |
| 3 | Criar/editar lead sem preencher funciona — nunca bloqueia submit (ROADMAP SC3) | ✓ VERIFIED | `validations.ts:71-74` `z.preprocess("" \| null \| undefined -> undefined)` + `.optional()`; harness: `OK csvRowSchema.safeParse(linha sem interesse): success === true`, `OK createLead válido` continua passando |
| 4 | Wizard de CSV permite mapear coluna para "Interesse" e o valor entra no lead importado (ROADMAP SC4) | ✓ VERIFIED | `csv-column-mapper.tsx:25` `{ key: "interesse", label: "Interesse", required: false }`; `csv-import.ts:147` `readMapped(row, "interesse").slice(0, 500)`; `import-actions.ts:156` `interesse: row.interesse ?? null`; harness: `OK bulkImportLeads(interesse mapeado): linha persistida com o valor` |
| 5 | Criar lead com Interesse preenchido salva e reaparece ao reabrir (15-01) | ✓ VERIFIED | idem #1 + #2; harness confirma persistência |
| 6 | Criar/editar com Interesse vazio conclui sem erro de validação (15-01) | ✓ VERIFIED | idem #3; harness: `OK updateLead com interesse vazio: interesse volta a NULL` |
| 7 | Interesse > 500 caracteres rejeitado com mensagem PT-BR (15-01) | ✓ VERIFIED | `validations.ts:73` `.max(500, "O interesse deve ter no máximo 500 caracteres.")`; harness: `OK leadSchema.safeParse com interesse de 501 chars: success === false` e `mensagem contém "500"` |
| 8 | Leads pré-migração abrem e editam sem erro, com interesse nulo (15-01) | ✓ VERIFIED | banco real: 37 leads, todos `interesse IS NULL`; coluna nullable sem default; `defaultValues` trata `null` via `?? ""` |
| 9 | Tabela `leads` tem coluna `interesse` TEXT nullable no banco real (`data/crm.db`) (15-01) | ✓ VERIFIED | `PRAGMA table_info(leads)` → `{cid:20, name:"interesse", type:"TEXT", notnull:0, dflt_value:null}`; `npm run verify:schema` exit 0 |
| 10 | Passo de mapeamento lista Interesse como opcional com "— nenhuma —" (15-02) | ✓ VERIFIED | `csv-column-mapper.tsx:100-107` — `required:false` gera `items` com `{ value: NONE_VALUE, label: "— nenhuma —" }` na frente |
| 11 | Importar CSV com coluna mapeada para Interesse cria leads com o valor (15-02) | ✓ VERIFIED | harness: `OK bulkImportLeads(interesse mapeado): linha persistida com o valor (got "quer site institucional")` |
| 12 | Importar CSV sem mapear Interesse funciona como antes, com interesse nulo (15-02) | ✓ VERIFIED | harness: `OK bulkImportLeads(sem interesse): linha persistida com interesse NULL (got null)` |
| 13 | Célula de Interesse > 500 chars no CSV não reprova a linha — importa truncada em 500 (15-02) | ✓ VERIFIED | `csv-import.ts:147` `.slice(0, 500)` antes de `csvRowSchema.safeParse`; harness: `OK mapCsvRows(célula de 600 chars): result[0].interesse truncado em 500 (got 500)` |

**Score:** 13/13 truths verificados na camada de código/dados

### Required Artifacts

| Artefato | Esperado | Status | Detalhes |
| --- | --- | --- | --- |
| `src/db/schema.ts` | coluna `interesse` nullable sem default sem índice | ✓ VERIFIED | linha 101 `interesse: text("interesse")`; sem `.notNull(`/`.default(`; ausente da lista de índices |
| `src/lib/validations.ts` | `interesse` opcional (preprocess vazio->undefined, trim, max 500) em `leadBaseSchema` | ✓ VERIFIED | linhas 71-74; fora do `.omit()` de `csvRowSchema` (linha 117) — propaga p/ `leadSchema` e `csvRowSchema` |
| `scripts/migrate-interesse.cjs` | migração aditiva idempotente com backup | ✓ VERIFIED | `npm run migrate:interesse` registrado no `package.json`; 2 backups datados `crm.db.backup-2026-08-31T14-00-*` em `data/`; coluna presente no banco real |
| `src/components/lead-form-dialog.tsx` | `<Input>` linha única "Interesse" abaixo do Nicho | ✓ VERIFIED | linhas 349-363, dentro da seção "Negócio", `<Input>` (não `<Textarea>`), `form.register("interesse")` |
| `src/actions/lead-actions.ts` | persistência `interesse: parsed.data.interesse ?? null` em create + update | ✓ VERIFIED | linhas 101 e 179 (2 ocorrências) |
| `src/lib/csv-import.ts` | `interesse` em `CsvFieldKey` + `MappedCsvRow`; `.slice(0, 500)` em `mapCsvRows` | ✓ VERIFIED | linhas 21, 48, 147, 159 |
| `src/components/csv-column-mapper.tsx` | entrada `{ key: "interesse", required: false }` em `FIELD_CONFIGS` | ✓ VERIFIED | linha 25 |
| `src/components/csv-import-wizard.tsx` | `interesse: null` em `EMPTY_MAPPING` | ✓ VERIFIED | linha 38 |
| `src/actions/import-actions.ts` | `interesse` em `ConfirmedImportRow` + insert de `bulkImportLeads` | ✓ VERIFIED | linhas 77 e 156 |
| `src/components/csv-import-preview-table.tsx` | `interesse` no `ConfirmedImportRow` montado em `handleConfirm` | ✓ VERIFIED | linha 266 `interesse: r.interesse` (mas coluna não é exibida na prévia — ver WR-02) |
| `scripts/verify-schema.cjs` | gate de presença de `leads.interesse` | ✓ VERIFIED | `npm run verify:schema` reporta `colunas '...'/'interesse' presentes` |
| `scripts/test-lead-actions.cjs` | cobertura automatizada de `interesse` (form + CSV) | ✓ VERIFIED | 10 asserções `OK` de `interesse`; harness exit 0 |

### Key Link Verification

| De | Para | Via | Status | Detalhes |
| --- | --- | --- | --- | --- |
| `lead-form-dialog.tsx` | `lead-actions.ts` | `form.register("interesse")` -> `new FormData` -> `leadSchema.safeParse` -> insert/update | ✓ WIRED | `onSubmit` monta `FormData` do DOM bruto; `<Input name="interesse">` entra sozinho; harness confirma persistência end-to-end |
| `validations.ts` | `csvRowSchema` | `interesse` FORA do `.omit({ nichoId, followUpDate, motivoPerdaId })` | ✓ WIRED | linha 117; harness: `csvRowSchema.safeParse(linha sem interesse): success === true` |
| `migrate-interesse.cjs` | `data/crm.db` | `ALTER TABLE leads ADD interesse text` sob guarda `PRAGMA table_info` | ✓ WIRED | coluna TEXT notnull=0 no banco real; verify:schema exit 0 |
| `csv-column-mapper.tsx` | `csv-import.ts` | `FIELD_CONFIGS` -> `mapping.interesse` -> `readMapped(row, "interesse")` | ✓ WIRED | `handleFieldChange` -> estado `mapping` -> `mapCsvRows` |
| `csv-import.ts` | `import-actions.ts` | `MappedCsvRow.interesse` -> `ConfirmedImportRow` -> `bulkImportLeads` insert | ✓ WIRED | `preview-table.tsx:266` monta `interesse: r.interesse`; `import-actions.ts:156` insere `interesse: row.interesse ?? null` |

### Data-Flow Trace (Level 4)

| Artefato | Variável | Fonte | Dados reais fluem | Status |
| --- | --- | --- | --- | --- |
| `lead-form-dialog.tsx` (edição) | `defaultValues.interesse` | prop `lead?.interesse` (vem de query do banco) | Sim — coluna real, harness confirma round-trip salvar/ler | ✓ FLOWING |
| `bulkImportLeads` | `row.interesse` | `mapCsvRows` -> `MappedCsvRow` -> `ConfirmedImportRow` | Sim — harness confirma valor mapeado chega ao `SELECT interesse` | ✓ FLOWING |

### Behavioral Spot-Checks

| Comportamento | Comando | Resultado | Status |
| --- | --- | --- | --- |
| Coluna `interesse` no banco real | `PRAGMA table_info(leads)` via better-sqlite3 | `type:TEXT, notnull:0, dflt_value:null` | ✓ PASS |
| Contagem de leads intacta pós-migração | `SELECT count(*) FROM leads` | 37 leads, todos `interesse IS NULL` (sem backfill, D-06) | ✓ PASS |
| Gate de schema | `npm run verify:schema` | exit 0 — `interesse` presente | ✓ PASS |
| Harness de lead/CSV | `npm run test:lead-actions` | exit 0 — todas as asserções passaram, 10 de `interesse` | ✓ PASS |
| Type-check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Build de produção | `npm run build` | OOM no host (4GB RAM sob pressão) — não reproduzível aqui | ? SKIP (ambiental) |

**Nota sobre `npm run build`:** o build abortou com `JavaScript heap out of memory` neste
ambiente por falta de RAM livre no host (padrão documentado para esta máquina de 4GB —
ver `MEMORY.md`). Não é falha de código: `npx tsc --noEmit` (a metade de type-check do
build) passou exit 0, os dois SUMMARYs registram `npm run build — exit 0` (44s / 33.8s),
e o code review de 13 arquivos não encontrou blockers. Não conta como gap.

### Probe Execution

Nenhuma probe `scripts/*/tests/probe-*.sh` declarada ou convencional para esta fase.
Os gates de verificação são os harnesses `.cjs` (executados acima).

### Requirements Coverage

| Requisito | Plano de origem | Descrição | Status | Evidência |
| --- | --- | --- | --- | --- |
| LEAD-06 | 15-01, 15-02 | Campo opcional "interesse" (texto livre) editável no formulário de lead e mapeável como coluna no wizard de importação CSV | ✓ SATISFEITO (camada de código/dados) | Metade "formulário + banco": truths #1-3, #5-9. Metade "CSV": truths #4, #10-13. `REQUIREMENTS.md` já marca LEAD-06 como Complete e mapeia para Phase 15. |

Nenhum requisito órfão — `REQUIREMENTS.md` mapeia apenas LEAD-06 para a Fase 15, e os
dois planos declaram `requirements: [LEAD-06]`.

### Anti-Patterns Found

| Arquivo | Linha | Padrão | Severidade | Impacto |
| --- | --- | --- | --- | --- |
| — | — | Nenhum `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` nos arquivos `.ts`/`.tsx` da fase | ℹ️ Info | Nenhum |
| `src/lib/validations.ts` | 71-74 | `interesse` só-espaços persiste `''` em vez de `NULL` (preprocess testa `=== ""` antes do trim) — WR-01 do code review | ⚠️ Warning | Baixo — nenhuma query desta fase filtra por `interesse`; contrato D-04 quebrado para o caso de borda "só espaços". Sem cobertura de teste para esse caso. |
| `src/components/csv-import-preview-table.tsx` | 110-140 | `previewColumns` não inclui `interesse` — WR-02 do code review | ⚠️ Warning | Médio-baixo — o admin confirma a importação sem ver o que será gravado em `interesse` nem o truncamento em 500. O valor ainda é importado corretamente (não é gap de meta). |

### Human Verification Required

Diferidos para o fim da fase (`human_verify_mode: end-of-phase`). Camada de código/dados
limpa — estes são os únicos itens pendentes.

#### 1. Round-trip do campo no formulário

**Test:** Em `/leads`, abrir "Novo lead", preencher "Interesse", salvar. Reabrir o lead em edição.
**Expected:** O valor digitado reaparece no campo "Interesse".
**Why human:** Renderização visual do dialog e ciclo salvar/reabrir.

#### 2. Campo opcional não bloqueia submit

**Test:** Criar um lead com "Interesse" vazio. Depois editar um lead apagando o texto de "Interesse" e salvar.
**Expected:** Ambos os submits concluem sem erro; o campo volta vazio após apagar.
**Why human:** Comportamento do submit no navegador (react-hook-form + zodResolver).

#### 3. Limite de 500 caracteres na UI

**Test:** Digitar mais de 500 caracteres em "Interesse" e tentar salvar.
**Expected:** Submit bloqueado com a mensagem "O interesse deve ter no máximo 500 caracteres.".
**Why human:** Exibição do `FieldError` na UI.

#### 4. Mapeamento e importação via CSV

**Test:** Em `/importar`, subir um CSV com uma coluna livre (ex: "servico"); mapear "servico" → "Interesse"; confirmar; abrir um lead importado.
**Expected:** "Interesse" aparece na lista de mapeamento com opção "— nenhuma —"; o lead importado mostra o valor.
**Why human:** Fluxo completo do wizard no navegador (a prévia não exibe a coluna `interesse` — WR-02).

#### 5. Importação sem mapear (sem regressão)

**Test:** Repetir a importação do mesmo CSV sem mapear "Interesse".
**Expected:** Leads criados com `interesse` nulo, nenhuma regressão no fluxo.
**Why human:** Verificação end-to-end do wizard.

### Gaps Summary

Nenhum gap bloqueante. Todos os 13 observable truths estão verificados na camada de
código e dados, com evidência de execução (harness `test:lead-actions` exit 0,
`verify:schema` exit 0, `tsc --noEmit` exit 0, inspeção direta do `data/crm.db`).

O requisito LEAD-06 está satisfeito nas duas metades (formulário + CSV).

Dois warnings do code review (WR-01 interesse só-espaços grava `''`; WR-02 prévia de
importação não mostra a coluna `interesse`) são advisórios — não impedem a meta da fase
e ficam como candidatos a quick task. O gate de drift de schema (`drizzle-kit push` não
rodado) é um falso positivo conhecido deste projeto (migração destrutiva por D-06;
migração aplicada via `scripts/migrate-interesse.cjs` e confirmada por `verify:schema`).

O `npm run build` não pôde ser reproduzido aqui por OOM do host (4GB sob pressão), mas
`tsc` passou e os dois executores registraram build exit 0.

Status `human_needed`: restam 5 human-checks de navegador, deliberadamente diferidos
para o fim da fase.

---

_Verificado: 2026-08-31_
_Verificador: Claude (gsd-verifier)_
