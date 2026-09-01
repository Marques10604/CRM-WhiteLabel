---
phase: 16
phase_name: "Correções de Code Review da Fase 15"
project: "CRM de Leads"
generated: "2026-09-01"
counts:
  decisions: 5
  lessons: 4
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 16 Learnings: Correções de Code Review da Fase 15

## Decisions

### Limite de "500 caracteres" do `interesse` passa a contar code points nos dois lados
Trocado `.max(500)` (code units UTF-16) por `.refine((v) => Array.from(v).length <= 500, ...)`
em `leadBaseSchema.interesse` — ponto único, herdado por `leadSchema` e `csvRowSchema`.

**Rationale:** O 16-01 introduziu corte por code point em `mapCsvRows` mas deixou o schema
contando code units (assimetria "aceita" como D-09). O code review (CR-01) mostrou que a
assimetria não era inócua: uma célula de CSV com ~250+ caracteres astrais gera um valor
truncado com >500 code units → `csvRowSchema.safeParse` falha → `bulkImportLeads` aborta o
lote inteiro. Alinhar por code point fecha o caminho e é mais correto para o formulário
manual também ("caracteres" = code points na cabeça do usuário).
**Source:** 16-REVIEW.md (CR-01), 16-REVIEW-FIX.md, 16-VERIFICATION.md

### Sinal de "foi truncado" mora em `mapCsvRows`, nunca re-derivado na view
`MappedCsvRow` ganhou `interesseTruncado: boolean` (`Array.from(original).length > 500`),
calculado por quem realmente corta. O badge da prévia dispara por `row.original.interesseTruncado`.

**Rationale:** O 16-02 tinha derivado o badge de `interesse?.length === 500` — falso negativo
para emoji (500 code points → `.length` 1000, badge some) e falso positivo para 500 chars
ASCII sem corte. Um booleano autoritativo da fonte elimina os dois.
**Source:** 16-REVIEW.md (WR-01), 16-REVIEW-FIX.md

### `migrate-interesse.cjs`: `hasColumn` antes do backup, backup só no ramo que escreve
Sequência: abrir 1 conexão → `PRAGMA table_info` → se `!hasColumn`: checkpoint WAL + close +
`copyFileSync` + reabre + `ALTER`; se `hasColumn`: nada (só verificação read-only).

**Rationale:** IN-03 — a pasta `data/` acumulava um backup por execução, inclusive nas
idempotentes. Backup só faz sentido quando o script vai de fato escrever.
**Source:** 16-02-PLAN.md, 16-02-SUMMARY.md

### Trim de campo opcional de texto livre mora DENTRO do `z.preprocess`
`const s = typeof v === "string" ? v.trim() : v` antes de mapear `"" | null | undefined → undefined`.
O `z.string().trim()` interno não converte `""` em `undefined`.

**Rationale:** WR-01/FIX-01 — `interesse` só-espaços gravava `''` em vez de `NULL`, violando
o contrato D-04 repetido ~4× no código.
**Source:** 16-01-PLAN.md, 16-01-SUMMARY.md

### `gsd-verifier` formal pulado; `VERIFICATION.md` autorada pelo orquestrador
Com os gates + code review + UAT já coletados, o orquestrador escreveu a `16-VERIFICATION.md`
em vez de spawnar o subagente.

**Rationale:** Host de 4GB — não gastar subagente re-derivando evidência já em mãos. Registrado
como deviation na própria `VERIFICATION.md`.
**Source:** 16-VERIFICATION.md

## Lessons

### "Assimetria aceita" num plano pode esconder um modo de falha real
O 16-01 documentou a assimetria code-point/code-unit como "D-09, aceita". O code review
mostrou que ela abortava o import inteiro num caso plausível. Lição: quando um plano "aceita"
uma inconsistência, verificar qual é a pior consequência concreta, não só se "parece inócuo".

**Context:** 16-01 fechou 4 achados limpo mas o fix do IN-02 (o de menor severidade) foi o
que introduziu o único blocker da fase.
**Source:** 16-REVIEW.md (CR-01)

### Corrigir um INFO pode criar um BLOCKER
IN-02 era "info" (`.slice(0,500)` pode partir surrogate pair — cosmético, raro). O fix
(`Array.from().slice()`) trocou "surrogate solto na posição 500" por "lote de CSV inteiro
abortado". O ganho de severidade não compensava sem alinhar o outro lado.

**Context:** Achados `info` de code review não são "de graça" — o fix tem que ser avaliado
com o mesmo rigor de um warning.
**Source:** 16-REVIEW.md, 16-01-SUMMARY.md

### `form_input` da automação de navegador não dispara `onChange` do react-hook-form
No UAT, preencher o formulário de lead via `form_input` setou o DOM mas o RHF não registrou —
todos os campos acusaram "obrigatório" no submit. O `computer type` (eventos de teclado
reais) funciona, mas é lento e o diálogo fechava.

**Context:** UAT de formulários RHF via extensão precisa de `type`, não `form_input`. Os
`<Select>` do Base UI (`type="button"`) precisam de clique + clique na opção por coordenada.
**Source:** 16-HUMAN-UAT.md

### Host de 4GB: `tsc --noEmit` e `next build` estouram o timeout de 2min do shell
Não é defeito — rodar com timeout estendido (`tsc` ~110s, `build` ~90s compile + 56s TS).
Fechar processos `node` órfãos antes do build ajuda. Consistente com a nota de 2026-08-29.

**Context:** Todo gate de tipagem/build desta fase precisou de timeout > 2min.
**Source:** 16-02-SUMMARY.md, 16-REVIEW-FIX.md

## Patterns

### Prévia de importação de CSV mostra TODA coluna mapeável + sinaliza truncamento na célula
Toda coluna que o wizard mapeia aparece na tabela de prévia com o valor exato que será
gravado (truncado inclusive), e quando o valor foi cortado a própria célula mostra um badge
amarelo (fora do sistema `RowFlags`/`StatusBadges` por linha).

**When to use:** Qualquer campo novo mapeável no wizard de CSV — o admin confirma vendo o
que vai gravar, não confiando que "deu certo".
**Source:** 16-02-SUMMARY.md, 16-HUMAN-UAT.md

### Script de migração `.cjs`: `PRAGMA table_info` antes de qualquer `fs.copyFileSync`
Checar se a mudança já foi aplicada ANTES de fazer backup; backup + DDL só no ramo que
escreve; verificação pós-migração roda nos dois ramos (na execução idempotente ela é a prova
de que está tudo certo). `ALTER` dentro de `try/catch`: "duplicate column name" → segue para
a verificação; outro erro → `fail()` citando o backup preservado.

**When to use:** Próximo `migrate-*.cjs` do projeto (os existentes ficam como dívida de
padrão, D-11 — não replicar retroativamente sem pedido).
**Source:** 16-02-PLAN.md, 16-REVIEW-FIX.md (WR-02)

### Fase de quitação de débito: rede de validação = SC do ROADMAP, não Nyquist
Nyquist/VALIDATION.md marcado N/A de propósito; a rede é o SC#5 (`tsc` + `build` +
`test:lead-actions`) rodado sobre a fase inteira como última task do último plano.

**When to use:** Fases code-only sem feature nova, onde escrever testes Nyquist formais seria
cerimônia sobre correções pontuais já cobertas por harness.
**Source:** 16-02-PLAN.md (notes)

## Surprises

### O achado de menor severidade (IN-02) gerou o único blocker da fase
4 dos 5 achados do 15-REVIEW fecharam limpo. O `info` sobre surrogate pair foi o que, ao ser
"corrigido", abriu o caminho de abort de lote que o code review da própria fase pegou.

**Impact:** +5 achados de code review + 1 rodada de fix (`16-REVIEW-FIX.md`, 5 commits) numa
fase que era pra ser "só fechar 5 achados".
**Source:** 16-REVIEW.md, 16-REVIEW-FIX.md

### O code review FORTALECEU 2 threats do security em vez de abrir threat novo
T-16-02 (limite consistente por code point, fecha o abort de lote) e T-16-08 (`try/catch` no
`ALTER`) ficaram mais fechados depois do fix do que estavam no plano. `threats_open: 0` sem
nenhum threat novo.

**Impact:** `/gsd-secure-phase` fechou por short-circuit (register autorado em plano,
mitigações verificadas nos diffs) — sem spawnar o `gsd-security-auditor`.
**Source:** 16-SECURITY.md
