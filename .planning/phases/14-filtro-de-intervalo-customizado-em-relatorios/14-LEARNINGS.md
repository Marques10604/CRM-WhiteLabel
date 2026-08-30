---
phase: 14
phase_name: "filtro-de-intervalo-customizado-em-relatorios"
project: "CRM de Leads"
generated: "2026-08-30"
counts:
  decisions: 6
  lessons: 5
  patterns: 5
  surprises: 4
missing_artifacts: []
---

# Phase 14 Learnings: filtro-de-intervalo-customizado-em-relatorios

## Decisions

### Função irmã, não extensão de `resolvePeriodRange`
`resolvePeriodoRelatorios({ period?, from?, to? }, now?)` foi criada como função separada em `src/db/queries.ts`, logo abaixo de `resolvePeriodRange` — que ficou intacta e é reusada internamente para os presets clássicos e para todos os caminhos de fallback.

**Rationale:** Mantém a superfície da Fase 11 (`resolvePeriodRange`, os 3 agregadores SQL, o `PeriodoSelector` base) estável e isola o comportamento novo. Menos risco de regressão no que já estava verificado.
**Source:** 14-01-SUMMARY.md

### `customInvalido: true` vs `false` — dois tipos de "não deu certo"
O retorno distingue: usuário pediu `custom` e errou as datas → `customInvalido: true` → faixa de aviso âmbar. Valor de `period` adulterado (payload, string fora do set) → fallback silencioso para `tudo`, `customInvalido: false`, sem faixa.

**Rationale:** O admin que digitou datas erradas merece feedback; um payload adulterado na URL não é um erro do usuário e não deve poluir a tela com aviso.
**Source:** 14-01-SUMMARY.md

### Cliente é "só o gesto" — servidor decide tudo (D-17)
`PeriodoSelector` virou um client component maior (gerencia `customMode` + 2 datas locais + popovers), mas continua **sem** chamar `resolvePeriodRange`, **sem** decidir o default (`30d`) e **sem** decidir o fallback. Toda resolução mora no servidor (`page.tsx` → `resolvePeriodoRelatorios`).

**Rationale:** Uma única fonte de verdade para a lógica de período. O componente monta URLs bem-formadas e navega; a página normaliza `searchParams` → `{ preset, range, customInvalido, from, to }` e passa tudo pronto.
**Source:** 14-02-SUMMARY.md, 14-CONTEXT.md §D-17

### `from`/`to` do retorno são as strings originais, não clampadas
Quando `preset === "custom"` e válido, a função ecoa as strings `from`/`to` como vieram (não o `Date` clampado).

**Rationale:** O `PeriodoSelector` usa esses valores para pré-preencher os 2 date pickers (D-16). Se a data foi clampada (ex: fim no futuro → hoje), o próximo submit do picker corrige — melhor mostrar o que o usuário digitou do que "consertar" silenciosamente o campo.
**Source:** 14-01-SUMMARY.md

### WR-01 (contradição PLAN × CONTEXT) resolvida a favor do CONTEXT
`14-01-PLAN` linha 101 mandava aparar `from` **e** `to` no clamp de data futura; `14-CONTEXT §D-06` diz explicitamente "aparado para hoje (`endOfDay(hoje)` para `to`, **mantendo `from` como veio**)". No fechamento, o código foi alinhado ao CONTEXT: clamp só de `to`, deixando o gate `start > end` capturar o intervalo 100% no futuro e cair no fallback 30d + faixa.

**Rationale:** O CONTEXT é o registro de decisão de produto; o PLAN foi a instância que divergiu. Alinhar ao CONTEXT reativa o ramo de fallback "janela inteira no futuro" que estava como código morto.
**Source:** 14-REVIEW-FIX.md, 14-CONTEXT.md §D-06, 14-REVIEW.md WR-01

### CR-01 resolvido derivando o modo de `value` + `useEffect` de ressync
`emModoCustom = value === "custom" || customMode` (não só o state local) + `useEffect` com deps `[value, from, to]` que ressincroniza `dataInicio`/`dataFim`. Preferido sobre a alternativa `key={...}` (remount forçado), que descartaria o gesto local D-15 (usuário selecionou "custom" mas ainda não preencheu as 2 datas).

**Rationale:** Preserva o estado transitório de D-15 e ao mesmo tempo faz a UI seguir a fonte de verdade do servidor em navegação soft.
**Source:** 14-REVIEW.md CR-01, 14-REVIEW-FIX.md

---

## Lessons

### `useState` initializer só roda no 1º mount — navegação soft do Next deixa estado stale
`customMode`/`dataInicio`/`dataFim` inicializados dos props só uma vez. Em navegação soft (botão Voltar/Avançar) para uma URL `?period=custom`, o componente não remonta: o `<Select>` mostra "Intervalo personalizado" mas os pickers não renderizam e as datas não repovoam. F5 (remount) mascara completamente o bug.

**Context:** O `<human-check>` do 14-02 só testava refresh (F5), que passa. Qualquer transição client-side ficava inconsistente. Só o code review adversarial pegou.
**Source:** 14-REVIEW.md CR-01

### Contradição entre PLAN e CONTEXT passou pela execução e pela verificação
O executor seguiu o `14-01-PLAN` linha 101 (aparar `from` e `to`) sem cruzar com `14-CONTEXT §D-06` (manter `from`). A `14-VERIFICATION.md` marcou como "⚠️ PARCIAL" mas não bloqueou. Só o code review classificou como defeito real que precisa de decisão.

**Context:** Quando PLAN e CONTEXT divergem num edge case, o executor tende a confiar no PLAN (mais próximo). Vale um cruzamento explícito PLAN↔CONTEXT nos pontos de decisão numerados.
**Source:** 14-REVIEW.md WR-01, 14-VERIFICATION.md truth 01-6

### `Calendar mode="single"` sem `required` permite desmarcar → navegação com data velha
Clicar de novo no dia já selecionado dispara `onSelect(undefined)`. O idioma `const prox = date ?? estadoAtual` (copiado de `lead-table-toolbar.tsx`) cai no valor **antigo** e navega com ele, enquanto a UI mostra o campo vazio.

**Context:** O padrão `?? estadoAtual` existe para o caso "setState não atualizou no mesmo tick", mas não previu o caso "usuário desmarcou de propósito". Fix: usar o valor novo direto e só navegar quando ele existir.
**Source:** 14-REVIEW.md WR-02

### Cobertura de função pura ≠ cobertura end-to-end
As 12 asserções novas exercitavam `resolvePeriodoRelatorios` isolada. A PARTE B do harness (contra SQLite temporário) continuava usando só `resolvePeriodRange("30d")` — o caminho `range` custom → parâmetro do Drizzle nas 3 agregações (núcleo do valor da fase E fronteira do SQLi T-14-01) ficou sem nenhum teste de integração até o fix.

**Context:** "Cobri a função nova" deu falsa sensação de segurança. A fronteira que importa era a de saída da função para dentro do SQL.
**Source:** 14-REVIEW.md WR-03, 14-VERIFICATION.md

### Verificação por grep exato força reescrita de doc-comments
A verificação D-17 do plano é um `grep` exato exigindo o arquivo `periodo-selector.tsx` **vazio** dos termos `resolvePeriodRange`/`resolvePeriodoRelatorios`. O doc-comment herdado da Fase 11 citava esses nomes; teve que ser reescrito para "sem resolver o range".

**Context:** Verificações por string literal pegam menções em comentários, não só em código. Ou o comentário evita o termo, ou a verificação precisa ser AST-aware.
**Source:** 14-02-SUMMARY.md
---

## Patterns

### Resolução de searchParams não-confiável → tipo concreto + flag, nunca lança
Guarda de data crua: regex `^\d{4}-\d{2}-\d{2}$` (`ISO_DATE_RE`) + `parseISO` + `isValid` + `try/catch` de reforço, **antes** de virar `Date`/parâmetro do Drizzle. Todo caminho retorna um objeto concreto (`{ preset, range, customInvalido, from?, to? }`); nenhum caminho lança.

**When to use:** Qualquer valor vindo de `searchParams`/URL/CSV do parceiro que alimenta uma query. Extensão do idioma já usado em `resolvePeriodRange` para `period`.
**Source:** 14-01-SUMMARY.md, 14-VERIFICATION.md truth 01-1

### Navegação só dentro de event handlers, nunca em effect/render
`navegarCustom`/`navegarPreset` (que fazem `router.push`) são chamados **apenas** dentro de `onSelect`/`onValueChange`. Zero `useEffect` de navegação, zero navegação no corpo do render.

**When to use:** Sempre que um componente navega em resposta a input. Re-render por mudança de `searchParams` não re-dispara navegação → sem risco de loop (T-14-07).
**Source:** 14-02-SUMMARY.md

### Estado de UI = fonte de verdade do servidor `||` gesto local, com `useEffect` de ressync
`emModoCustom = value === "custom" || customMode`; `useEffect([value, from, to])` repovoa o estado local quando os props mudam. O `||` cobre o gesto transitório (usuário escolheu custom mas ainda não navegou); o `useEffect` cobre navegação soft.

**When to use:** Client component cujo estado deriva de props que mudam sem remount (querystring, navegação soft do App Router).
**Source:** 14-REVIEW-FIX.md, 14-REVIEW.md CR-01

### Verificação humana persistida como script de UAT
Quando a `VERIFICATION.md` fica `human_needed`, o bloco `human_verification` no frontmatter (test / expected / why_human por item) vira diretamente o roteiro do `/gsd-verify-work` — os itens são commitados como `*-HUMAN-UAT.md` para sobreviver a reset de contexto.

**When to use:** Toda fase com componente visual/de interação onde grep não fecha os critérios.
**Source:** 14-VERIFICATION.md, commit `7c5920f`

### Clamp em vez de rejeitar, deixando o gate de consistência pegar o caso degenerado (D-06)
Data futura no fim → aparada para `endOfDay(hoje)`, intervalo segue válido. `from` fica como veio. Só se `start > end` **após** o clamp é que cai no fallback. Um único ponto de decisão (`start > end`) cobre "fim antes do início" e "janela inteira no futuro".

**When to use:** Validação de intervalos onde um dos limites pode ser "consertado" sem ambiguidade e o outro não.
**Source:** 14-CONTEXT.md §D-06, 14-REVIEW-FIX.md

---

## Surprises

### Score 4/4 no código, mas verificação `human_needed` com 10 itens pendentes
Os 4 critérios de sucesso do ROADMAP (e 19/19 truths de plano) eram 100% verificáveis por código. Mesmo assim a fase parou em `human_needed`: 8 checagens visuais/de interação + 2 decisões de produto (WR-01, CR-01).

**Impact:** "Verificado no código" e "fase pronta para fechar" são coisas diferentes numa fase de UI. O gate humano é real mesmo com score cheio.
**Source:** 14-VERIFICATION.md

### O code review re-rodado achou o código idêntico à 1ª revisão
Entre a primeira `14-REVIEW.md` e a re-revisão, os 4 arquivos de código não mudaram — o workflow anterior tinha só convertido CR-01/WR-01 em itens de "decisão humana" sem corrigir nada. A re-revisão re-confirmou os 10 achados.

**Impact:** Marcar um achado como "decisão humana" não é o mesmo que resolvê-lo; ele fica aberto até alguém decidir e alguém corrigir.
**Source:** 14-REVIEW.md (re-revisão)

### Fase de ~35 min gerou 10 achados de code review (1 crítico)
2 planos, 0 deviations, 5 arquivos, execução rápida e limpa — e ainda assim 1 crítico + 5 warnings + 4 info, quase todos em edge cases de data e de navegação client-side.

**Impact:** A densidade de armadilhas em UI de data/período é alta mesmo num recurso que parece "só um date picker a mais". Tamanho da fase não prevê superfície de bug.
**Source:** 14-REVIEW.md

### A base de teste da PARTE B nunca foi trocada para o caminho custom
`resolvePeriodRange("30d")` continuou sendo a única entrada da PARTE B do harness durante toda a execução e a verificação. A lacuna (WR-03) só foi fechada no fix, com um cenário de janela custom de 150 dias + payload adulterado alimentando um dos agregadores.

**Impact:** Um harness "50/50 verde" pode não tocar a fronteira mais importante da fase. Vale checar *o que* os testes exercitam, não só o placar.
**Source:** 14-VERIFICATION.md, 14-REVIEW-FIX.md
