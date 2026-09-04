---
phase: 21
phase_name: "exportar-csv-da-lista-de-leads"
project: "CRM de Leads"
generated: "2026-09-04"
counts:
  decisions: 6
  lessons: 4
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 21 Learnings: exportar-csv-da-lista-de-leads

## Decisions

### Exportação 100% client-side
O botão lê `table.getSortedRowModel().rows`, mapeia `row.original` para um objeto de colunas legíveis, gera o texto com `Papa.unparse` e dispara download via `Blob` + `<a download>`.

**Rationale:** Os dados já estão na tabela (`@tanstack/react-table`). Zero Server Action, zero rota de API, zero ida ao banco. O CRM continua "100% Server Actions" — nenhuma API route nova.
**Source:** 21-01-PLAN.md (D-21-01)

### `getSortedRowModel().rows` = todas as filtradas, não a página visível
O corpo da tabela renderiza `getRowModel().rows` (paginado, 25/página), mas o export usa `getSortedRowModel().rows` (todas as filtradas + ordenadas, pré-paginação).

**Rationale:** Ninguém quer exportar só a página 1 de 4. "Linhas visíveis" no requisito = "linhas que passam nos filtros ativos". O toast "N leads exportados" enquadra a contagem.
**Source:** 21-01-PLAN.md (D-21-01), plan-checker Concern 1

### Motivo de perda como NOME via `motivoPerdaNome` no `LeadRow`
`LeadRow` ganhou `motivoPerdaNome` computado no `data` useMemo de `lead-table.tsx` (mesmo padrão exato do `nichoNome` já existente).

**Rationale:** Menos superfície de mudança que threadar `motivosPerda` até a toolbar; o valor fica disponível em `row.original` para qualquer consumidor futuro. `""` (não `"—"`) quando ausente — a maioria dos leads não tem motivo e o CSV não deve poluir.
**Source:** 21-01-PLAN.md (D-21-02)

### CSV injection mitigado (não só aceito)
`sanitizeCsvCell` prefixa `'` em qualquer célula cujo 1º char seja `=` `+` `-` `@` TAB ou CR.

**Rationale:** Parte dos dados (nome, notas, interesse) vem de CSV de um parceiro (cowork) — não é 100% do próprio admin. Custo da mitigação é trivial. Trade-off: o `'` fica visível em editor de texto puro (oculto no Excel/Sheets).
**Source:** 21-01-PLAN.md (D-21-04)

### Encoding pt-BR: BOM UTF-8 + delimitador `;`
`buildLeadsCsv` = `"﻿" + Papa.unparse(..., { delimiter: ";" })`.

**Rationale:** É o que o Excel em locale pt-BR espera (lá `,` é separador decimal). Mesmo idioma dos dois lados do `src/lib/csv-encoding.ts` do import — aqui só o lado de escrita.
**Source:** 21-01-PLAN.md (D-21-05)

### Módulo puro DOM-free + único código DOM na toolbar
`src/lib/lead-csv-export.ts` = funções puras (zero `Blob`/`document`/`URL`); o `downloadCsv` (Blob + `<a>`) mora em `lead-table-toolbar.tsx`.

**Rationale:** O módulo puro é 100% testável pelo harness `.cjs` que roda em Node sem DOM.
**Source:** 21-01-PLAN.md (D-21-01), 21-01-SUMMARY.md

---

## Lessons

### `import Papa from "papaparse"` (UMD) funcionou de primeira sob o `ts-alias-loader.mjs`
O plan-checker marcou como o único ponto não exercitado por precedente (`.cjs` anteriores usam `better-sqlite3`/`date-fns`/`drizzle-orm`, não UMD com `export default` implícito).

**Context:** Node 24 + strip-types + o loader resolveram o interop CJS→ESM sem nenhum ajuste no harness. Mesmo pacote/versão do `csv-import-wizard.tsx`. O risco "info" do plan-checker não se materializou.
**Source:** 21-01-SUMMARY.md §Concerns

### Tornar um campo do `LeadRow` obrigatório não quebrou nada
Task 1 mudou `LeadRow = Lead & { nichoNome: string }` → `& { motivoPerdaNome: string }` (obrigatório).

**Context:** O único lugar que **constrói** um `LeadRow` literal é o `data` useMemo de `lead-table.tsx`. Todos os outros (handlers, `TableMeta`, `DeleteState`) só **recebem** `row.original` já tipado. Nenhuma fixture de teste constrói `LeadRow`. `tsc` limpo. Vale mapear os construtores de um tipo antes de assumir que mexer nele é caro.
**Source:** plan-checker ponto 2, 21-01-SUMMARY.md

### Caractere U+FEFF literal no fonte não sobrevive a edição byte-a-byte
O BOM teve que ser escrito como o escape `"﻿"`, não o caractere literal.

**Context:** Ferramentas de edição de código tratam o U+FEFF literal de forma inconsistente. `"﻿"` é inequívoco. Harness cobre `csv.charCodeAt(0) === 0xFEFF`.
**Source:** 21-01-SUMMARY.md §Desvios

### `tdd="true"` legítimo quando o `<behavior>` lista os casos observáveis
Diferente do C1 da Fase 20 (rótulo `tdd` sem red-first), aqui o plan-checker confirmou: `<behavior>`/`<action>` dizem "harness ANTES da implementação", os 2 testes de mutação verificam comportamento, e os commits saíram `test(...)` (RED) → `feat(...)` (GREEN) na ordem.

**Context:** O rótulo `tdd` só vale se o teste for red-first E as asserções verificarem comportamento, não presença de string.
**Source:** plan-checker ponto 3, commits `c568ef2`/`b4195ae`

---

## Patterns

### Export de tabela client-side = módulo puro + trigger DOM separado
`lib/*-export.ts` (funções puras: `build*Csv`, `*RowToCsvRecord`, `sanitize*`, `*Filename`) + `downloadCsv(filename, text)` no componente que tem o botão. O módulo puro é testável por harness `.cjs`; o DOM fica isolado.

**When to use:** Qualquer "exportar X para arquivo" numa UI. A pureza é o que torna o teste code+data possível sem navegador.
**Source:** src/lib/lead-csv-export.ts, src/components/lead-table-toolbar.tsx

### `getSortedRowModel().rows` para "exportar o que está filtrado"
No `@tanstack/react-table` v8, `getSortedRowModel().rows` = core → filtered → sorted, **pré-paginação**. É o modelo certo para "exporte tudo que passa nos filtros, na ordem atual" — `getRowModel()` (paginado) só daria a página visível.

**When to use:** Qualquer ação em massa sobre "as linhas filtradas" (export, seleção em lote, contagem).
**Source:** src/components/lead-table-toolbar.tsx `handleExport`

### Nome de entidade relacionada no `LeadRow` via Map no `data` useMemo
Para exibir/exportar `nichoNome` / `motivoPerdaNome` sem re-buscar: `new Map(entidades.map(e => [e.id, e.nome]))` num useMemo + `.get(lead.fkId) ?? fallback` no `data` useMemo. A prop da entidade vem **sem** filtro de `deletedAt` (pra resolver o nome de um FK apontando para uma linha soft-deletada).

**When to use:** Qualquer coluna derivada de FK numa tabela client-side. 2ª ocorrência (após `nichoNome`) — vira padrão.
**Source:** src/components/lead-table.tsx

---

## Surprises

### A fase inteira executou em ~17 min, sem rate-limit
3 tasks, 6 arquivos, harness com 38 asserções + 2 testes de mutação, portão code+data completo.

**Impact:** Nenhum. `PapaParse` + `date-fns` já instalados + o padrão de export puro + harness `.cjs` já provado = trabalho previsível. Contraste com a Fase 20, onde o executor bateu no limite de sessão (mas já tinha commitado tudo).
**Source:** 21-01-SUMMARY.md §Performance

### O plan-checker verificou o pipeline do TanStack lendo a doc, não o código
Confirmou que `getSortedRowModel` é downstream do `getFilteredRowModel` (`core → filtered → sorted → paginated`) — o que valida EXPORT-02 sem precisar rodar o app.

**Impact:** Reforça que verificação code+data funciona para lógica de biblioteca bem documentada; o que fica pro navegador é só a confirmação ocular (o arquivo baixa? abre no Excel?).
**Source:** plan-checker ponto 1
