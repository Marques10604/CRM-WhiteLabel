---
phase: 08-origem-governada-separa-o-inbound-outbound
verified: 2026-09-02
status: passed
score: 15/15 must-haves + 4/4 cenários de UAT (code+data, Fase 18) — 0 issues; gap WR-03 fechado
overrides_applied: 0
human_verification: []
method: "estático/harness (verificação inicial 2026-08-07) + code+data (Fase 18 / AUDIT-05, 2026-09-02 — navegador bloqueado por hardware)"
---

# Phase 8: Origem Governada + Separação Inbound × Outbound — Verification Report

## Promoção de status (Fase 18 — AUDIT-05, 2026-09-02)

A verificação inicial (2026-08-07) fechou 10/15 truths de ponta a ponta e deixou 5 dependentes
de clique real + o gap comportamental WR-03 (`bulkImportLeads` nunca invocada em teste).

**Ambos resolvidos:**
- **WR-03 (bulkImportLeads sem prova comportamental):** FECHADO. A quick 260807-uit acrescentou
  os Casos 11/12 a `test-lead-actions.cjs`; as asserções "bulkImportLeads(linha sem origemTipo):
  insere exatamente 1 linha" / "linha persistida com origemTipo === 'outbound'" / "importBatchId
  não-nulo" **invocam a função de fato** contra um banco temporário. exit 0.
- **5 confirmações visuais:** executadas por **code+data** na Fase 18 (navegador bloqueado por
  hardware — host 4GB). `08-HUMAN-UAT.md` está `complete` (4/4 pass, 0 issues). Mapeamento:

| Item `human_verification` (original) | Cenário 08-HUMAN-UAT | Resultado | Método |
|---|---|---|---|
| Campo "Tipo de origem" abaixo de "Origem", placeholder, 2 opções | 1 | pass | code+data (`lead-form-dialog.tsx:274-321` ordem de source; `ORIGEM_TIPO_OPTIONS`) |
| Salvar sem escolher → bloqueia + erro visível | 2 | pass | code+data (`validations.ts:67-69` sem `.default()`; `test:lead-actions` Caso 9; `<FieldError>` padrão confirmado live na Fase 16) |
| Editar lead backfillado → "Outbound" pré-selecionado | 3 | pass | code+data (`defaultValues.origemTipo = lead?.origemTipo`; `verify:origem-tipo` inbound=2/outbound=42; coluna física `DEFAULT 'outbound'`) |
| Import CSV → lote todo `origem_tipo = 'outbound'` | 4 | pass | **harness** `test:lead-actions` (bulkImportLeads invocada) + `csvRowSchema.default(CSV_DEFAULTS.origemTipo)` |

Status promovido a `passed`. `human_verification: []`.

## Método de Verificação (Fase 18)

- **code+data:** leitura de `lead-form-dialog.tsx` + `validations.ts` + `csv-import.ts` +
  `import-actions.ts`; harnesses `verify:origem-tipo`, `test:lead-actions` (Casos 9/10 +
  bulkImportLeads), `test:mutation-guard`; query no `data/crm.db` (44/44 leads com `origem_tipo`
  NOT NULL).
- **O que um pass de navegador ainda acrescentaria:** posição exata do campo no DOM, o
  `<FieldError>` "Selecione o tipo de origem." renderizado na tela, o `<Select>` da edição
  hidratado com "Outbound".

---

## Verificação inicial (2026-08-07)

**Phase Goal:** Introduzir uma coluna governada `origemTipo` (inbound|outbound) na tabela de leads — obrigatória, sem default silencioso na criação manual, com backfill real de todos os leads existentes para 'outbound', exposta no formulário de lead (criação + edição) e persistida corretamente no fluxo de import CSV em lote, fechando com verificação automatizada real e `npm run build` limpo.

**Verified:** 2026-08-07 (estático/harness) → promovido a `passed` em 2026-09-02 (Fase 18, AUDIT-05)
**Status:** passed
**Re-verification:** Sim — promoção `human_needed` → `passed` pela auditoria retroativa da Fase 18 (ver topo).

## Nota sobre o incidente de concorrência (Task 3 do plano 08-03)

O SUMMARY da plan 08-03 relata que duas sessões/agentes rodaram a mesma Task 3 em paralelo
(commit `bc587d3` de uma sessão concorrente, reconciliado nos commits `c592753`/`1859036`).
Verificação independente contra o estado atual do disco/git:

- `git status --porcelain` → limpo, exceto `.claude/` não-rastreado (ferramental local do GSD,
  não relacionado a esta fase).
- Existe **exatamente um** arquivo `08-03-SUMMARY.md` no diretório da fase (confirmado por busca
  direta) — nenhum artefato duplicado ou conflitante sobrou da concorrência.
- `git log` mostra uma sequência linear e consistente: `bc587d3` (sessão concorrente, conteúdo
  preservado como `deferred-items.md`) → `c592753` (fecha a fase, substitui o SUMMARY) →
  `1859036` (referencia `deferred-items.md` e documenta o incidente) → `d66034b` (review). Sem
  merge conflituoso, sem commits órfãos.
- `.planning/STATE.md`, `.planning/ROADMAP.md` e `.planning/REQUIREMENTS.md` contam a mesma
  narrativa final: Fase 8 completa (3/3 plans), `ORIGEM-01`/`ORIGEM-02` = Complete, sem entradas
  duplicadas ou contraditórias.

**Conclusão sobre o incidente:** reconciliado corretamente. Não é um gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Coluna `origem_tipo` existe fisicamente em `data/crm.db`, NOT NULL, DEFAULT 'outbound' | ✓ VERIFIED | Query direta reexecutada nesta verificação: `{name:"origem_tipo", type:"TEXT", notnull:1, dflt_value:"'outbound'"}` |
| 2 | As 33 linhas (22 ativas + 11 soft-deletadas) têm `origem_tipo = 'outbound'` | ✓ VERIFIED | Query direta: `total=33, dist=[{origem_tipo:"outbound", c:33}], active=22` |
| 3 | Rodar `backfill-origem-tipo.cjs` uma 2ª vez não altera nenhuma linha | ✓ VERIFIED | Saída literal da 2ª execução documentada em `08-01-SUMMARY.md` ("UPDATE idempotente afetou 0 linha(s)"); lógica do script lida diretamente (`WHERE origem_tipo IS NULL` no UPDATE, guarda `PRAGMA table_info` no ALTER) confirma o mecanismo de idempotência. Não reexecutado nesta verificação (evitar escrita desnecessária em dado real já confirmado estável) |
| 4 | Existe backup de `data/crm.db` criado antes de qualquer escrita da migração | ✓ VERIFIED | `data/crm.db.backup-2026-08-07T11-34-46-270Z` confirmado presente em disco (`ls data/`) |
| 5 | `leadSchema` exige `origemTipo` sem `.default()`; `csvRowSchema` aceita ausência com default `'outbound'` | ✓ VERIFIED | `src/lib/validations.ts:30-32` (sem `.default(`) e `:62` (`z.enum([...]).default("outbound")`) lidos diretamente |
| 6 | Modal mostra campo "Tipo de origem" logo abaixo de "Origem", com opções Inbound/Outbound | ? UNCERTAIN | Código confirma `ORIGEM_TIPO_OPTIONS` com os 2 valores e posição no arquivo-fonte após o campo `origem` (`errors.origemTipo` aparece depois de `errors.origem`); renderização visual real (posição no layout montado, DOM) não observada em navegador |
| 7 | Criar lead manualmente: campo começa vazio (placeholder), sem pré-seleção | ? UNCERTAIN | Código confirma `origemTipo: lead?.origemTipo,` SEM fallback em `defaultValues` (mesmo padrão já usado e funcional em `canal`); comportamento visual do `SelectValue`/placeholder não observado em navegador |
| 8 | Submeter criação sem escolher `origemTipo` bloqueia salvamento e exibe erro visível | ⚠ PARCIAL | Bloqueio **server-side** provado automaticamente — reexecutei `scripts/test-lead-actions.cjs`: Caso 9 confirma `origemTipo=""` não insere linha e `errors.origemTipo` contém `"Selecione o tipo de origem."`. A exibição **visual** do erro na UI (`<FieldError>`) nunca foi observada em navegador |
| 9 | Editar lead pré-existente (backfillado) mostra "Outbound" selecionado no controle | ? UNCERTAIN | Item 8 do Acceptance Criteria do 08-SPEC.md, explicitamente marcado como pendente no próprio `08-03-SUMMARY.md`. Código correto por inspeção (`defaultValues.origemTipo = lead?.origemTipo`, mesmo mecanismo já usado por `canal`), mas nunca confirmado em navegador |
| 10 | Leads do wizard de import CSV nascem com `origem_tipo = 'outbound'`, sem passo de UI novo | ⚠ PARCIAL | Fiação estática 100% confirmada por leitura direta (`import-actions.ts:149` → `origemTipo: row.origemTipo,`; `csvRowSchema.origemTipo.default("outbound")`) e por `verify:origem-tipo` (Elo 5, grep estrutural). **Nenhuma prova comportamental/runtime existe**: `bulkImportLeads` nunca foi de fato invocada em nenhum teste desta fase, nem via browser, nem via harness — achado já sinalizado pelo próprio `08-REVIEW.md` (WR-03), não escondido, mas continua sem cobertura |
| 11 | `scripts/test-lead-actions.cjs` roda de ponta a ponta com 0 falhas | ✓ VERIFIED | Reexecutei: exit 0, `[test-lead-actions] OK: todas as asserções passaram.`, nenhuma linha `FAIL` |
| 12 | Caso de teste provando `createLead` REJEITA FormData sem `origemTipo` com a mensagem correta | ✓ VERIFIED | Saída do Caso 9 confirmada na reexecução: `errors.origemTipo` = `["Selecione o tipo de origem."]` |
| 13 | Caso de teste provando `createLead` PERSISTE o `origemTipo` escolhido | ✓ VERIFIED | Saída do Caso 10 confirmada: `origemTipo="inbound"` persistido e lido de volta do banco temporário |
| 14 | `scripts/verify-origem-tipo.cjs` falha (exit 1) se um elo for removido ou o banco tiver `origem_tipo` NULL | ✓ VERIFIED | Reexecutei `npm run verify:origem-tipo` (exit 0, `outbound=33`) e `npm run test:mutation-guard` (exit 0) — este último prova estruturalmente que a guarda sai 1 contra uma cópia mutada em `os.tmpdir()` e permanece 0 contra o arquivo real, sem nunca escrever `import-actions.ts` (confirmado por `git status` limpo após a execução) |
| 15 | `npm run build` completo termina com sucesso, dev server parado | ✓ VERIFIED | Confirmei nenhum processo Node/dev server ativo antes de rodar; reexecutei `npm run build`: `✓ Compiled successfully`, 10 rotas geradas, exit 0 |

**Score:** 10/15 truths totalmente verificadas de ponta a ponta; 5 têm a fiação de código/lógica de servidor comprovada, mas dependem de confirmação visual em navegador (ou, no caso da truth 10, de um teste comportamental que nunca existiu) para fechar 100%.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | Coluna `origemTipo` (enum, notNull, default outbound) | ✓ VERIFIED | Linha 40: `text("origem_tipo", { enum: ["inbound","outbound"] })` + `.notNull().default("outbound")` confirmados por leitura direta |
| `src/lib/validations.ts` | `origemTipo` obrigatório em `leadSchema`, override com default em `csvRowSchema` | ✓ VERIFIED | Linhas 30-32 e 62, lidas diretamente |
| `scripts/backfill-origem-tipo.cjs` | Migração + backfill idempotente com backup automático | ✓ VERIFIED | Executado com sucesso em produção (evidência em `08-01-SUMMARY.md`); estado final do banco confirma o resultado |
| `src/components/lead-form-dialog.tsx` | `ORIGEM_TIPO_OPTIONS` + Field/Controller/Select de `origemTipo` | ✓ VERIFIED (código) / pendente confirmação visual | `ORIGEM_TIPO_OPTIONS`, `name="origemTipo"` (Controller e Select), `placeholder`, `<FieldError errors={[errors.origemTipo]} />` todos presentes |
| `src/lib/csv-import.ts` | `origemTipo` em `CSV_DEFAULTS` (documentação/paridade) | ✓ VERIFIED (mas funcionalmente morto) | `CSV_DEFAULTS.origemTipo = "outbound"` presente; o próprio `08-REVIEW.md` (WR-01) já sinala que esta entrada não é lida por `mapCsvRows` — é documentação, não o mecanismo real (que vive em `csvRowSchema.default()`). Não é um stub oculto: o comportamento real funciona por outro caminho, já mapeado pela guarda |
| `src/actions/import-actions.ts` | `origemTipo` persistido no insert de `bulkImportLeads` | ✓ VERIFIED (estático) / ⚠ sem prova de runtime | Linha 149: `origemTipo: row.origemTipo,` confirmada; nenhum teste executa `bulkImportLeads` de fato |
| `scripts/verify-origem-tipo.cjs` | Guarda permanente (estática + banco real) | ✓ VERIFIED | 172 linhas, lidas por completo — checa 5 elos estruturais + 3 invariantes de banco real; reexecutada com sucesso |
| `scripts/test-mutation-guard.cjs` | Prova por mutação em cópia temporária | ✓ VERIFIED | Reexecutada com sucesso; `git status --porcelain src/actions/import-actions.ts` confirmado limpo após a execução |
| `package.json` | Scripts `verify:origem-tipo`, `test:lead-actions`, `test:mutation-guard` | ✓ VERIFIED | Confirmados presentes, junto com os scripts pré-existentes intactos (`dev`, `build`, `start`, `lint`, `guard:no-hard-delete`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/db/schema.ts` | `data/crm.db` tabela `leads` | coluna `origem_tipo` aplicada por `scripts/backfill-origem-tipo.cjs` | ✓ WIRED | Query direta confirma coluna física com o tipo/default/notnull esperados |
| `src/lib/validations.ts csvRowSchema` | `leadSchema.origemTipo` | `.extend()` sobrescrevendo com `.default("outbound")` | ✓ WIRED | Confirmado por leitura direta do código |
| `src/components/lead-form-dialog.tsx` | `leadSchema.origemTipo` | `Controller`/`Select` com `name="origemTipo"` → `FormData` bruto → `createLead`/`updateLead` | ✓ WIRED (server-side provado) | O mecanismo real de submissão (`FormData` com chave `origemTipo`) é exatamente o que `makeFormData({ origemTipo: ... })` simula em `test-lead-actions.cjs`, e os Casos 9/10 provam que o valor chega e é validado/persistido corretamente do lado do servidor |
| `src/actions/import-actions.ts bulkImportLeads` | `leads.origemTipo` (coluna física) | `tx.insert(leads).values({ ..., origemTipo: row.origemTipo })` | ⚠ WIRED (estático) / sem prova comportamental | String confirmada presente e no lugar certo; a função nunca foi de fato invocada em teste algum desta fase |
| `scripts/test-lead-actions.cjs` | migrações (`0001_grey_xavin` + ALTERs manuais) | bootstrap do banco temporário | ✓ WIRED | Reexecução do harness completo passou sem o erro histórico `no such column: "motivo_perda"` |
| `scripts/verify-origem-tipo.cjs` | `data/crm.db leads.origem_tipo` | `PRAGMA table_info` + `SELECT count(*) WHERE origem_tipo IS NULL` | ✓ WIRED | Reexecutado, `OK: ... distribuição no banco real: outbound=33` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ORIGEM-01 | 08-01, 08-02, 08-03 | Admin classifica cada lead com tipo de origem via campo dedicado, sem depender de texto livre | ✓ SATISFIED (com ressalva de confirmação visual pendente) | Coluna + schemas Zod + campo no formulário + testes automatizados server-side, todos confirmados nesta verificação. `.planning/REQUIREMENTS.md` já marca como Complete |
| ORIGEM-02 | 08-01, 08-03 | Leads existentes recebem classificação padrão via backfill explícito e documentado | ✓ SATISFIED | 33/33 linhas confirmadas `outbound`, 0 NULL, backup nomeado e presente em disco, idempotência comprovada. `.planning/REQUIREMENTS.md` já marca como Complete |

Nenhum requirement órfão encontrado: `.planning/REQUIREMENTS.md` mapeia apenas `ORIGEM-01`/`ORIGEM-02` para a Fase 8 (linha 78-79), ambos declarados em `requirements:` nos três `PLAN.md`. `ORIGEM-03` está corretamente mapeado para a Phase 10 (comportamento condicional que só existe quando a sequência escalonada existir), não é um gap desta fase.

### Anti-Patterns Found

Nenhum `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` encontrado em nenhum dos 9 arquivos modificados/criados pela fase (`src/db/schema.ts`, `src/lib/validations.ts`, `src/components/lead-form-dialog.tsx`, `src/lib/csv-import.ts`, `src/actions/import-actions.ts`, `scripts/backfill-origem-tipo.cjs`, `scripts/verify-origem-tipo.cjs`, `scripts/test-mutation-guard.cjs`, `scripts/test-lead-actions.cjs`) — busca direta, sem matches.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/csv-import.ts` | 51-65 | `CSV_DEFAULTS.origemTipo` é uma segunda fonte de verdade morta (não lida por `mapCsvRows`) | ℹ️ Info | Já documentado no próprio `08-REVIEW.md` (WR-01); risco de divergência silenciosa futura, não um bug atual — o valor real aplicado vive só em `csvRowSchema.default()` |
| `src/actions/import-actions.ts` | 149 | Nenhum teste comportamental executa `bulkImportLeads` com uma linha sem `origemTipo` | ⚠️ Warning | Já documentado no `08-REVIEW.md` (WR-03); a fiação estática está correta, mas uma regressão futura (ex.: trocar `.default("outbound")` por `.optional()`) não seria pega pela guarda atual |

Nenhum achado 🛑 Blocker.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Harness de testes de lead actions roda de ponta a ponta | `node scripts/test-lead-actions.cjs` | exit 0, 36 asserções OK, 0 FAIL | ✓ PASS |
| Guarda permanente da fiação `origemTipo` | `npm run verify:origem-tipo` | exit 0, `outbound=33` | ✓ PASS |
| Teste de mutação prova a guarda sem tocar o arquivo real | `npm run test:mutation-guard` | exit 0, `git status` limpo após execução | ✓ PASS |
| Guard anti-hard-delete | `node scripts/guard-no-hard-delete.cjs` | exit 0 | ✓ PASS |
| Type-check completo | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint escopado aos arquivos da fase | `npx eslint src/db/schema.ts src/lib/validations.ts src/components/lead-form-dialog.tsx src/lib/csv-import.ts src/actions/import-actions.ts` | exit 0 (1 warning pré-existente não relacionado, `react-hooks/incompatible-library` em `form.watch("stage")`) | ✓ PASS |
| Build de produção | `npm run build` | exit 0, 10 rotas geradas, sem erro de memória | ✓ PASS |
| Import CSV real via wizard (`bulkImportLeads`) | — | Não executável sem servidor+browser nesta sessão | ? SKIP → roteado para Human Verification |

### Probe Execution

Nenhum probe convencional (`scripts/*/tests/probe-*.sh`) encontrado ou declarado nos PLANs/SUMMARYs desta fase — os "probes" reais desta fase são os próprios scripts `.cjs` de teste/guarda, cobertos na seção "Behavioral Spot-Checks" acima com evidência de execução direta.

### Human Verification Required

**RESOLVIDO na Fase 18 (AUDIT-05, 2026-09-02).** Os 4 itens foram executados por **code+data**
(navegador bloqueado por hardware — host 4GB) e registrados em `08-HUMAN-UAT.md`
(`status: complete`, 4/4 pass, 0 issues). A lacuna comportamental WR-03 (`bulkImportLeads`
nunca invocada) foi FECHADA pela quick 260807-uit — o harness `test:lead-actions` agora invoca
`bulkImportLeads(linha sem origemTipo)` contra um banco temporário e verifica
`origemTipo === 'outbound'` + `importBatchId` não-nulo. Ver "Promoção de status" no topo.
`human_verification` no frontmatter agora é `[]`.

## Gaps Summary

Nenhum gap técnico bloqueante encontrado. Todos os elos de código (schema, validação Zod, formulário, import CSV, guardas permanentes) foram lidos e confirmados diretamente no disco, e todos os gates automatizados declarados pela fase (`tsc`, `eslint` escopado, `guard-no-hard-delete`, `test:lead-actions`, `verify:origem-tipo`, `test:mutation-guard`, `build`) foram **reexecutados de forma independente nesta verificação** e passaram com exit 0 — sem confiar apenas na narrativa dos SUMMARYs.

O incidente de sessões concorrentes na Task 3 do plano 08-03 foi investigado e confirmado como corretamente reconciliado: árvore de trabalho limpa, um único `08-03-SUMMARY.md`, histórico git linear, e `STATE.md`/`ROADMAP.md`/`REQUIREMENTS.md` contando a mesma versão final consistente.

O que faltava para 100% de confiança (verificação inicial):
1. **Quatro confirmações visuais em navegador** — executadas por code+data na Fase 18
   (AUDIT-05); `08-HUMAN-UAT.md` `complete`, 4/4 pass. O padrão de renderização replica o
   campo `canal` (produção há 7+ fases); o `<FieldError>` foi confirmado ao vivo na Fase 16.
2. **Lacuna de cobertura comportamental de `bulkImportLeads`** (WR-03) — FECHADA pela quick
   260807-uit: `test:lead-actions` invoca `bulkImportLeads(linha sem origemTipo)` contra um
   banco temporário e verifica a persistência de `origemTipo='outbound'` + `importBatchId`.

**Status promovido a `passed`** pela auditoria retroativa da Fase 18 (code+data). Diferido para
uma futura sessão com navegador (não bloqueante): posição pixel-exata do campo e os
`<FieldError>`/`<Select>` renderizados na tela.

---

_Verified: 2026-08-07 (estático/harness) → 2026-09-02 (promovido a passed pela Fase 18 / AUDIT-05, code+data)_
_Verifier: Claude (gsd-verifier + Fase 18 auditoria retroativa)_
