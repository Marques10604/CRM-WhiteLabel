---
phase: 15
phase_name: "campo-interesse-servi-o-desejado-no-lead"
project: "CRM de Leads"
generated: "2026-08-31"
counts:
  decisions: 6
  lessons: 4
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 15 Learnings: campo-interesse-servi-o-desejado-no-lead

## Decisions

### Coluna `interesse` nullable dispensa `DEFAULT` no `ALTER TABLE`
A migração aditiva de `leads.interesse` foi feita com `ALTER TABLE leads ADD interesse text`, sem `DEFAULT` e sem `NOT NULL`.

**Rationale:** O SQLite só exige `DEFAULT` físico quando a coluna nova é `NOT NULL` — foi o que forçou `origem_tipo`/`sequencia_posicao` em fases anteriores. Coluna nullable não tem essa restrição, então o script fica mais simples (D-06).
**Source:** 15-01-SUMMARY.md

### Posição do campo: logo após `nichoId` / abaixo do campo Nicho
`interesse` foi declarado imediatamente após `nichoId` no `schema.ts` e renderizado imediatamente abaixo do campo Nicho (seção "Negócio") no `lead-form-dialog.tsx`.

**Rationale:** Segue D-01/D-07 literalmente — agrupa o campo com os demais dados de negócio do lead, onde o admin espera encontrá-lo.
**Source:** 15-01-SUMMARY.md

### Input de linha única, nunca `<Textarea>`
O campo usa `<Input id="interesse" type="text">`, não um `<Textarea>`.

**Rationale:** "Interesse / serviço desejado" é uma frase curta, não um bloco de notas — o projeto já tem o campo Notas para texto longo. Decisão de contrato de UI confirmada no UAT (D-02).
**Source:** 15-01-SUMMARY.md, 15-HUMAN-UAT.md

### Truncamento de célula gigante em `mapCsvRows`, não no Zod
`readMapped(row, "interesse").slice(0, 500)` roda **antes** de `csvRowSchema.safeParse` no caminho do CSV. O `.max(500)` do Zod só morde no formulário manual.

**Rationale:** Um CSV do cowork parceiro com uma célula de 5.000 caracteres não pode reprovar a linha inteira e abortar o lote — o lead importa com o valor cortado em 500. Erro visível de validação fica reservado para o input manual, onde o admin pode corrigir na hora (D-10).
**Source:** 15-02-SUMMARY.md, 15-HUMAN-UAT.md (Teste 4: linha de 600 chars → `length(interesse) = 500`)

### `interesse` fora de `CSV_DEFAULTS` e de `buildNotasText`
O campo não entra em `CSV_DEFAULTS` nem participa da montagem do texto de notas enriquecidas.

**Rationale:** É campo próprio da tabela `leads`, não uma "coluna extra" que vira nota. Coluna não-mapeada ou célula vazia resulta em `""`, que a Server Action materializa como `NULL` (D-11).
**Source:** 15-02-SUMMARY.md

### `LEAD-06` só promovido a Done no fim da fase (não no plano 15-01)
O plano 15-01 entregou a metade "formulário" do requisito e deixou `LEAD-06` sem marcar; o plano 15-02 entregou a metade "wizard de CSV" e marcou `requirements-completed: [LEAD-06]`.

**Rationale:** O requisito exige as duas metades ("campo no lead" + "mapeável no wizard de importação CSV"). Promover no meio deixaria o ROADMAP mentindo sobre cobertura.
**Source:** 15-01-SUMMARY.md, 15-02-SUMMARY.md

---

## Lessons

### Campo opcional nullable já tinha precedente pronto (`motivoPerdaId`)
O idioma completo — `nullable` no banco + `z.preprocess` vazio→`undefined` no Zod + `undefined`→`null` explícito na Server Action — foi copiado de `motivoPerdaId` (Fase 11), 2ª ocorrência do padrão.

**Context:** Reusar o precedente exato eliminou toda a categoria de bug de "campo opcional que grava string vazia em vez de NULL". Vale procurar o precedente antes de projetar do zero.
**Source:** 15-01-SUMMARY.md

### Campo CSV mapeável tem 6 pontos de toque fixos
Adicionar um campo mapeável no wizard toca sempre os mesmos 6 lugares: `CsvFieldKey`, `MappedCsvRow`, `mapCsvRows`, `FIELD_CONFIGS`, `EMPTY_MAPPING`, `ConfirmedImportRow`+insert — mais a preview-table. `tsc` obriga cada um (o `EMPTY_MAPPING` é literal escrito à mão).

**Context:** 3ª ocorrência do padrão (após notas e origem). A lista de 6 pontos é confiável o suficiente para virar checklist.
**Source:** 15-02-SUMMARY.md

### O lint global do repo está vermelho desde a Fase 8 — não é regressão desta fase
`npm run lint` sai com exit 1 (457 erros pré-existentes: `no-require-imports` nos `.cjs`, worktree órfão, falsos-positivos de `react-hooks`). Documentado em `deferred-items.md`.

**Context:** Cada fase precisa rodar o lint **com escopo nos arquivos tocados** para ter sinal real (Fase 15: 0 erros nos `.ts`/`.tsx`). Confiar no lint global bloquearia toda fase por dívida antiga.
**Source:** 15-01-SUMMARY.md, 15-02-SUMMARY.md

### UAT de navegador possível sem screenshot num host de 4GB
`next dev` (Turbopack) + Chrome estoura a RAM deste host, então a janela não renderiza screenshots. A UAT foi feita em nível de DOM (`javascript_tool`) com cada asserção cruzada contra leitura direta de `data/crm.db`.

**Context:** Verdade no banco > pixel na tela. O padrão de "interação via DOM + verificação no SQLite" é a forma viável de UAT visual aqui e produziu 5/5 pass com evidência forte.
**Source:** 15-HUMAN-UAT.md

---

## Patterns

### Campo de texto livre opcional no lead
`nullable` no schema Drizzle (sem default, sem índice) + `z.preprocess` vazio→`undefined` no `leadBaseSchema` + gravação `?? null` explícita na Server Action + gate de presença em `verify-schema.cjs`.

**When to use:** Qualquer novo campo opcional de texto livre na tabela `leads` (próximo candidato: "serviço desejado" vindo do handoff Prospector→CRM).
**Source:** 15-01-SUMMARY.md

### Defesa contra célula gigante de CSV
`.slice(0, N)` no `mapCsvRows` **antes** do `safeParse` — a linha importa truncada em vez de reprovar o lote; o `.max(N)` do Zod fica só para o input manual.

**When to use:** Qualquer campo de texto que aceita conteúdo de CSV de terceiro onde o volume não pode abortar a importação em lote.
**Source:** 15-02-SUMMARY.md

### Checklist dos 6 pontos de toque de um campo CSV mapeável
`CsvFieldKey` → `MappedCsvRow` → `mapCsvRows` (via `readMapped`) → `FIELD_CONFIGS` (`required:false`) → `EMPTY_MAPPING` (literal) → `ConfirmedImportRow` + insert campo-a-campo em `bulkImportLeads` → mais a `csv-import-preview-table.tsx`.

**When to use:** Toda vez que um novo campo precisa ser mapeável no wizard de importação CSV.
**Source:** 15-02-SUMMARY.md

---

## Surprises

### Nenhum desvio de plano nas duas waves
Ambos os planos (15-01, 15-02) foram executados exatamente como escritos — "None - plano executado exatamente como escrito" nos dois SUMMARYs.

**Impact:** Fase pequena e bem escopada (35min + 20min). O trabalho de planejamento pagou: zero retrabalho de execução.
**Source:** 15-01-SUMMARY.md, 15-02-SUMMARY.md

### A tabela de prévia do import não mostra a coluna `interesse` (WR-02)
Observado ao vivo na UAT: o valor de `interesse` importa correto para o banco, mas não aparece na tabela de prévia antes de confirmar. Warning advisório do code review, não bloqueia.

**Impact:** Baixo — o dado chega certo; só a conferência visual pré-confirmação fica incompleta. Candidato a quick task futura.
**Source:** 15-REVIEW.md, 15-HUMAN-UAT.md
