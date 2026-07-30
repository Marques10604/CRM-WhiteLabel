---
phase: 05-notas-enriquecidas-na-importa-o-csv
verified: 2026-07-30T00:00:00Z
status: human_needed
score: 14/15 must-haves verified (1 open quality warning documented, not truth-blocking)
overrides_applied: 0
human_verification:
  - test: "Percurso completo do wizard /importar com o CSV real do cowork (nome, score, telefone, sinal_dor, trecho_dor, observacao): passo 'Mapeie as colunas' mostra a seção 'Colunas extras para notas (opcional)' listando score/sinal_dor/trecho_dor/observacao; marcar score e trecho_dor fora de ordem mostra 'Serão concatenadas: score → trecho_dor'; 'Ver prévia' mostra a coluna Notas com 'score: N' e 'trecho_dor: ...' em linhas separadas, sem 'Importado via CSV.' misturado; 'Voltar ao mapeamento' preserva os checkboxes marcados; mapear Notas 1-pra-1 para observacao remove observacao da lista de checkboxes e a prévia mostra o texto de observacao sem rótulo na primeira linha; CSV simples (nome+telefone+observacao mapeada, nenhuma extra) importa sem interação nova; seção some quando todas as colunas do CSV estão mapeadas em campos fixos."
    expected: "Todos os 7 passos do <human-check> de 05-02-PLAN.md Task 2 passam exatamente como descrito (SC #1-4 do ROADMAP + D-03 + persistência do 'Voltar')."
    why_human: "Requer clique real no navegador (upload de arquivo, interação com Select/checkbox, navegação entre passos do wizard). Nenhuma sessão deste projeto teve acesso a browser até agora (mesmo caveat documentado em STATE.md para Fases 2 e 4) — o dev server está rodando em localhost:3000 pronto para este teste, mas o teste em si nunca foi executado."
  - test: "Reproduzir o cenário WR-01 do 05-REVIEW.md: no passo de mapeamento, marcar uma coluna extra (ex: score) como checkbox, depois mudar o Select de um campo fixo (ex: Origem) para apontar para essa MESMA coluna (score)."
    expected: "O resumo ao vivo 'Serão concatenadas: ...' deve parar de mostrar 'score' assim que ele vira um campo fixo — hoje, por código lido nesta verificação, o resumo continua mostrando 'score' porque `extraNotasColumns` não é filtrado por `mappedHeaders` antes de renderizar o texto (só o checkbox some da lista, o resumo textual não é corrigido)."
    why_human: "É um bug de UI confirmado por leitura estática de código (não uma incerteza), mas a confirmação visual final e a decisão de bloquear/aceitar como está cabem ao admin antes de considerar a fase pronta para uso diário com o CSV real (19 colunas, várias sobreposições possíveis entre Select e checkbox)."
gaps:
  - truth: "Resumo ao vivo 'Serão concatenadas: ...' sempre concorda com o texto final que buildNotasText vai gravar (Pitfall 4 do 05-RESEARCH.md: 'os dois precisam concordar')"
    status: partial
    reason: "src/components/csv-column-mapper.tsx linha 150 filtra a ORDEM pelo arquivo (headers.filter(...), D-08 correto) mas NÃO exclui headers que passaram a ser usados em um campo fixo depois de já estarem marcados como extra — extraNotasColumns não é limpo por handleFieldChange. buildNotasText (csv-import.ts) tem o filtro fixedHeaders/extraSet correto e produz o resultado FINAL certo (o dado salvo no lead está correto), mas o texto exibido ANTES de confirmar pode mentir sobre uma coluna que na verdade não vai ser concatenada — viola a garantia de 'para conferência' do SC #4 do ROADMAP nesse cenário específico. Documentado como WR-01 em 05-REVIEW.md, não corrigido no código atual (confirmado por leitura direta do arquivo nesta verificação)."
    artifacts:
      - path: "src/components/csv-column-mapper.tsx"
        issue: "Linha 148-152: `extraNotasColumns.length > 0` e `headers.filter((h) => extraNotasColumns.includes(h))` usam o array de estado bruto, sem excluir headers que hoje aparecem em `mappedHeaders` (calculado na linha 67 mas não reaproveitado no resumo)."
    missing:
      - "Derivar `visibleExtraColumns = extraNotasColumns.filter((h) => !mappedHeaders.has(h))` e usar essa variável tanto na condição de exibição quanto no `headers.filter(...)` do resumo (fix sugerido em 05-REVIEW.md WR-01, não aplicado)."
      - "Idealmente também limpar `extraNotasColumns` em `handleFieldChange` quando o valor escolhido já está marcado como extra, para não deixar estado órfão acumulando."
deferred: []
---

# Phase 5: Notas Enriquecidas na Importação CSV Verification Report

**Phase Goal:** Admin importa o CSV de prospecção do cowork (com colunas de inteligência score/sinal_dor/trecho_dor/observacao) sem perder o sinal de priorização — essas colunas passam a ser concatenadas automaticamente em um único campo de notas formatado e legível no lead importado, sem exigir nada extra quando o CSV é simples
**Verified:** 2026-07-30
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

#### 05-01 (Motor de concatenação) — 9/9 verified

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `mapCsvRows` produz `notas` concatenado com TODAS as colunas extras marcadas com valor, sem perder nenhuma (IMPORT-04) | ✓ VERIFIED | Harness `scripts/verify-notas-concat.cjs` cenário S3: `"texto livre\nscore: 4\nsinal_dor: dor_confirmada"` — re-executado nesta verificação (`node scripts/verify-notas-concat.cjs` → `OK: 10 cenarios de concatenacao de notas`) |
| 2 | Linha com "Notas" 1-pra-1 vazia mas extras preenchidas NUNCA contém "Importado via CSV." (Pitfall 1) | ✓ VERIFIED | Cenário S4 passa: resultado exato `"score: 4\nsinal_dor: dor_confirmada"`, sem o texto padrão. Código confirma fallback aplicado sobre `concatenatedNotas` (linha 122-123 de `csv-import.ts`), nunca sobre `readMapped(row,"notas")` — string não existe mais no arquivo. |
| 3 | CSV simples com só Notas 1-pra-1 produz o mesmo texto de hoje, sem rótulo/sufixo (IMPORT-05/D-11) | ✓ VERIFIED | Cenário S1: `"texto livre"` exato. |
| 4 | Linha sem conteúdo nenhum recebe `CSV_DEFAULTS.notas` (D-11/Pitfall 5) | ✓ VERIFIED | Cenários S2 e S7 passam. |
| 5 | Ordem das colunas = ordem do arquivo CSV, nunca ordem de clique (D-08) | ✓ VERIFIED | Cenário S5: extras passadas em ordem invertida produzem saída na ordem do arquivo. |
| 6 | Coluna já usada em campo fixo nunca é concatenada 2x como extra (Pitfall 4) | ✓ VERIFIED | Cenário S8: contagem de ocorrências = 1. |
| 7 | D-06: separador = `\n` simples, sem separador final | ✓ VERIFIED | `parts.join("\n")`, linha 96 de `csv-import.ts`; confirmado pelos textos exatos esperados em S3/S5. |
| 8 | D-07: célula vazia numa extra omite a linha inteira | ✓ VERIFIED | Cenário S6: sem "sinal_dor", sem "`: \n`", não termina com "`: `". |
| 9 | D-10: Notas 1-pra-1 primeiro sem rótulo + extras com rótulo na ordem do CSV | ✓ VERIFIED | Cenário S3. |

#### 05-02 (UI do wizard) — 5/6 verified, 1 partial

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 10 | Seção "Colunas extras para notas (opcional)" com checkbox por coluna não usada em campo fixo (SC #1) | ✓ VERIFIED | `src/components/csv-column-mapper.tsx` linhas 132-154: `unmappedHeaders.map(...)` renderiza `<input type="checkbox">` com label exato do header; texto da seção é literalmente `Colunas extras para notas (opcional)`. |
| 11 | Marcar/desmarcar checkbox atualiza ao vivo "Serão concatenadas: a → b → c" na ordem do arquivo (SC #4/D-08/D-09) | ⚠️ PARTIAL | Mecanismo correto para o caso descrito literalmente (marcar/desmarcar checkbox): `headers.filter((h) => extraNotasColumns.includes(h)).join(" → ")` deriva a ordem do arquivo, não da ordem de clique. **Mas** existe um cenário adjacente não coberto pela redação literal da truth — remapear um campo fixo (Select) para uma coluna JÁ marcada como extra — em que o resumo mostra uma coluna que NÃO será de fato concatenada (ver Gaps abaixo, WR-01 de `05-REVIEW.md`, confirmado nesta verificação por leitura direta do código atual). |
| 12 | Sem colunas não mapeadas → seção inteira não renderiza (D-03) | ✓ VERIFIED | `{unmappedHeaders.length > 0 && (...)}`, sem branch de "vazio". |
| 13 | Prévia mostra o texto concatenado final por linha (SC #2) | ✓ VERIFIED (código) / pendente confirmação visual | `csv-import-preview-table.tsx` inalterado (`accessorKey: "notas"`), e `mapCsvRows` já produz o texto correto (truths 1-9). Confirmação visual real no navegador não foi executada nesta fase (ver Human Verification). |
| 14 | Voltar ao mapeamento preserva colunas extras marcadas | ✓ VERIFIED | `handleBackToMapping` em `csv-import-wizard.tsx` lista explicitamente `extraNotasColumns: state.extraNotasColumns` (linha 270). |
| 15 | CSV simples continua importando sem interação nova; "Ver prévia" habilitado só por nome+telefone (SC #3/IMPORT-05) | ✓ VERIFIED | `canContinue = Boolean(mapping.nome && mapping.telefone)` inalterado (linha 57 de `csv-column-mapper.tsx`); colunas extras não entram nessa condição. |

**Score:** 14/15 truths fully verified, 1 partial (documented as gap, not a blocker to the core engine or happy-path UI).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/csv-import.ts` | `CsvExtraNotasColumns`, `buildNotasText`, `mapCsvRows` de 3 params, `CSV_DEFAULTS` | ✓ VERIFIED | Todos exportados, contrato exato conforme frontmatter do 05-01-PLAN.md. `readMapped(row, "notas")` não existe mais no arquivo (confirmado por leitura). |
| `scripts/verify-notas-concat.cjs` | Harness de 10 cenários via `typescript.transpileModule` contra o arquivo real | ✓ VERIFIED | Re-executado nesta verificação: `OK: 10 cenarios de concatenacao de notas`, exit 0. Usa `transpileModule` e lê `src/lib/csv-import.ts` real (não cópia). |
| `src/components/csv-column-mapper.tsx` | Seção de checkboxes + resumo ao vivo, controlada por props | ✓ VERIFIED (com o gap WR-01 documentado) | Contém texto exato, container, checkboxes nativos `accent-[#0D9488]`; `canContinue` intocado. |
| `src/components/csv-import-wizard.tsx` | `extraNotasColumns` no `WizardState`, handler, 3º argumento para `mapCsvRows` | ✓ VERIFIED | `EMPTY_EXTRA_NOTAS_COLUMNS`, `handleExtraNotasColumnsChange`, `mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns)` — todos presentes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `csv-import.ts` (`mapCsvRows`) | `csv-import.ts` (`buildNotasText`) | fallback `CSV_DEFAULTS.notas` sobre o resultado final | ✓ WIRED | Linha 122-123: `const concatenatedNotas = buildNotasText(...); const notas = concatenatedNotas \|\| CSV_DEFAULTS.notas;` |
| `verify-notas-concat.cjs` | `csv-import.ts` | lê e transpila o arquivo real | ✓ WIRED | `SOURCE_PATH` aponta para `src/lib/csv-import.ts`; falha explicitamente se a linha de import mudar (guard próprio). |
| `csv-import-wizard.tsx` | `csv-import.ts` (`mapCsvRows`) | 3º argumento `state.extraNotasColumns` | ✓ WIRED | Linha 249: `mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns)`. |
| `csv-import-wizard.tsx` | `csv-column-mapper.tsx` | props `extraNotasColumns`/`onExtraNotasColumnsChange` | ✓ WIRED | Linhas 318-319 do wizard; props destruturadas e usadas no mapper. |
| `csv-column-mapper.tsx` | ordem do arquivo CSV (`headers`) | resumo via `headers.filter(...)` | ⚠️ WIRED but incomplete | Ordem correta (D-08), mas não filtra por `mappedHeaders` — ver gap WR-01. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `csv-import-preview-table.tsx` (coluna Notas) | `row.notas` | `mapCsvRows` → `buildNotasText` (função pura, testada por 10 cenários reais) | Sim — string calculada a partir do CSV real do admin, não estática | ✓ FLOWING |
| `csv-column-mapper.tsx` (resumo ao vivo) | `extraNotasColumns` (prop controlada pelo wizard) | `state.extraNotasColumns`, atualizado por `handleToggleExtraColumn` | Sim, mas pode ficar desatualizado em relação a `mapping` (WR-01) | ⚠️ HOLLOW em cenário específico — dado real, mas pode divergir do resultado final salvo |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Engine de concatenação produz os 10 comportamentos esperados contra o código-fonte real | `node scripts/verify-notas-concat.cjs` | `OK: 10 cenarios de concatenacao de notas`, exit 0 | ✓ PASS |
| Tipos e assinaturas compilam sem erro em todo o projeto | `npx tsc --noEmit` | Saída vazia, exit 0 | ✓ PASS |
| Arquivos desta fase não introduzem erros de lint (apenas warnings pré-existentes documentados) | `npx eslint src/lib/csv-import.ts src/components/csv-column-mapper.tsx src/components/csv-import-wizard.tsx` | 0 errors, 2 warnings pré-existentes ("Unused eslint-disable directive", já presentes antes desta fase) | ✓ PASS |
| Escopo da fase contido nos 4 arquivos declarados | `git log` (commits 73c8431, e34b889, 4f84520) | Apenas `src/lib/csv-import.ts`, `scripts/verify-notas-concat.cjs`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-wizard.tsx` tocados | ✓ PASS |
| `npm run build` limpo (reservado ao 05-02, dev server precisa estar parado) | não re-executado nesta verificação | N/A | ? SKIP — dev server ativo em `localhost:3000` (host de 4GB, risco de OOM documentado em `STATE.md`/`CLAUDE.md` ao rodar build em paralelo); `tsc --noEmit` já cobre a superfície de erro de tipo que o build capturaria. SUMMARY.md 05-02 declara `npm run build` limpo com o dev server parado durante a execução original — não reverificado independentemente aqui por segurança do host. |

### Probe Execution

Não aplicável — esta fase não usa `scripts/*/tests/probe-*.sh`; o harness de verificação (`scripts/verify-notas-concat.cjs`) foi tratado acima em Behavioral Spot-Checks e re-executado com sucesso.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| IMPORT-04 | 05-01, 05-02 | Admin mapeia múltiplas colunas de origem para concatenação automática em notas, sem perder nenhuma coluna mapeada | ✓ SATISFIED | Motor provado por harness (S1-S10) + UI wired (checkboxes → wizard → `mapCsvRows`). `REQUIREMENTS.md` marca `[x]` e "Complete". |
| IMPORT-05 | 05-01, 05-02 | Mapeamento múltiplo é opcional e compatível com o mapeamento 1-pra-1 já existente | ✓ SATISFIED | S1/S2/S9 provam retrocompatibilidade; `canContinue` do mapper inalterado; `mapCsvRows` com 2 argumentos continua funcionando (default `[]`). |

Nenhum requisito órfão — `REQUIREMENTS.md` mapeia só IMPORT-04/IMPORT-05 para a Fase 5, e ambos aparecem no frontmatter de ambos os planos.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/csv-column-mapper.tsx` | 148-152 | Resumo ao vivo usa `extraNotasColumns` bruto (sem excluir headers já usados em campo fixo) — WR-01 de `05-REVIEW.md`, confirmado ainda presente nesta verificação | ⚠️ Warning | Pode exibir coluna que não será de fato concatenada quando o admin marca uma coluna extra e depois remapeia um Select fixo para o mesmo header. Não afeta o dado final salvo (protegido pelo filtro `fixedHeaders` em `csv-import.ts`), mas quebra a garantia "para conferência" do SC #4 nesse cenário específico. |
| `src/components/csv-import-wizard.tsx` | 132-134 | `fetchPreviewSupportData(...).then(...)` sem `.catch` — CR-01 de `05-REVIEW.md`, confirmado ainda presente | ℹ️ Info (pré-existente, fora do escopo desta fase) | Bug pré-existente desde a Fase 2/4 (commit `33e5715`), não introduzido por esta fase — confirmado via `git show` do estado do arquivo antes dos commits 05-01/05-02. Se a Server Action falhar, a prévia trava em "Carregando prévia..." sem saída. Relevante para a robustez do fluxo que sustenta SC #2/#4 (a prévia é onde o admin confere as notas concatenadas antes de confirmar), por isso registrado aqui a pedido explícito da revisão de código, mesmo não sendo um gap desta fase. |

### Human Verification Required

### 1. Percurso completo do wizard com o CSV real do cowork (7 passos do `<human-check>` de 05-02-PLAN.md)

**Test:** Abrir `http://localhost:3000/importar`, subir um CSV com colunas `nome, score, telefone, sinal_dor, trecho_dor, observacao`, mapear só Nome/Telefone, marcar `score` e `trecho_dor` fora de ordem, conferir o resumo ao vivo, avançar para a prévia, conferir a coluna Notas, voltar ao mapeamento e conferir persistência, mapear Notas 1-pra-1 para `observacao`, repetir com um CSV simples (sem colunas extras), e confirmar que a seção some quando tudo está mapeado.
**Expected:** Os 7 passos descritos na Task 2 do `05-02-PLAN.md` (SC #1-4 do ROADMAP + D-03 + persistência de "Voltar") passam exatamente como especificado.
**Why human:** Requer interação real de navegador (upload de arquivo, cliques em Select/checkbox, navegação entre passos). Nenhuma sessão deste projeto teve acesso a browser (mesmo caveat de STATE.md para Fases 2 e 4) — dev server já está rodando em `localhost:3000`, pronto para o teste.

### 2. Confirmar o impacto real do gap WR-01 (resumo ao vivo desatualizado)

**Test:** No passo de mapeamento, marcar uma coluna extra (ex: `score`) e, em seguida, mudar o Select de outro campo fixo (ex: "Origem") para apontar para essa mesma coluna `score`.
**Expected:** O checkbox de `score` deve sumir da lista (já verificado por código), e o texto "Serão concatenadas: ..." deveria parar de citar `score` — hoje, pela leitura do código, ele continua citando.
**Why human:** A leitura estática do código já confirma o bug (não é uma incerteza técnica), mas cabe ao admin decidir se esse edge case bloqueia a fase ou se é aceitável corrigir depois — é uma decisão de produto/prioridade, não uma verificação técnica adicional.

### Gaps Summary

O motor de concatenação (`buildNotasText`/`mapCsvRows`, plano 05-01) está completo, correto e provado por 10 cenários comportamentais rodando contra o código-fonte real — incluindo a regressão crítica do Pitfall 1, que está estruturalmente impossível de reintroduzir sem quebrar o cenário S4. `tsc --noEmit` está limpo em todo o projeto e o lint dos 4 arquivos desta fase não introduz nenhum erro novo.

A UI (plano 05-02) implementa corretamente 5 das 6 truths declaradas, incluindo os dois pontos mais sensíveis (ordem do resumo derivada de `headers.filter(...)`, nunca da ordem de clique — D-08; e `canContinue`/IMPORT-05 intocados). O único gap real e verificável por código é WR-01: o resumo ao vivo não reaplica o mesmo filtro de dedup que `buildNotasText` já aplica corretamente no motor, então pode "prometer" uma coluna que não será de fato concatenada em um cenário específico (coluna marcada como extra e depois também mapeada em um campo fixo). O dado final salvo no lead está protegido e correto — o problema é só o texto de conferência mostrado antes de confirmar, o que ainda assim conflita diretamente com a garantia de "para conferência" do SC #4 do ROADMAP.

Adicionalmente, o `<human-check>` de 7 passos que a própria Task 2 do 05-02-PLAN.md definiu como critério de aceite nunca foi executado nesta ou em nenhuma sessão anterior (sem acesso a navegador) — é o mesmo padrão já registrado em `STATE.md` para as Fases 2 e 4, não uma regressão desta fase. Enquanto isso não for confirmado por clique real, a fase está "verificada no código" mas não "confirmada em uso" pelo admin.

Por pedido explícito da tarefa de verificação, também está documentado aqui — mesmo sendo pré-existente e fora do escopo desta fase — o achado crítico CR-01 do code review (`fetchPreviewSupportData` sem `.catch`, que pode travar a prévia indefinidamente em caso de falha de rede/banco). Confirmado por `git show` que esse trecho já existia antes dos commits desta fase (desde o commit `33e5715`, Fase 2). Não é um gap de IMPORT-04/IMPORT-05, mas é um fator de risco relevante para a robustez do mesmo fluxo de prévia que sustenta SC #2/#4 — vale corrigir antes ou logo depois de considerar a Fase 5 pronta para uso diário com o CSV real do cowork.

---

_Verified: 2026-07-30_
_Verifier: Claude (gsd-verifier)_
