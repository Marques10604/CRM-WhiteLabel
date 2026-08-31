---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
reviewed: 2026-08-30T21:15:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/db/queries.ts
  - src/app/relatorios/page.tsx
  - src/components/periodo-selector.tsx
  - scripts/test-relatorios-queries.cjs
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Fase 14: Relatório de Revisão de Código (RE-REVISÃO)

**Revisado:** 2026-08-30T21:15:00Z
**Profundidade:** standard
**Arquivos revisados:** 4
**Status:** issues_found

## Resumo

Re-revisão adversarial da Fase 14 (filtro de intervalo customizado em `/relatorios`):
`resolvePeriodoRelatorios` + as 3 agregações em `src/db/queries.ts`, o server component
`src/app/relatorios/page.tsx`, o client component `src/components/periodo-selector.tsx` e o
harness `scripts/test-relatorios-queries.cjs`.

**Nota de escopo:** desde a revisão anterior (`14-REVIEW.md`, 19:30Z) os 4 arquivos de código
**não mudaram uma linha** — `git diff c4defa4..HEAD` só adiciona `14-HUMAN-UAT.md` e
`14-VERIFICATION.md`. Portanto todos os defeitos da revisão anterior continuam presentes e são
re-confirmados aqui contra o código atual. Nada foi corrigido; o `14-HUMAN-UAT.md` transformou
CR-01 e WR-01 em itens de "DECISÃO HUMANA" pendentes, não em correções.

Pontos fortes re-confirmados:

- **Nunca-lança (T-14-02):** todo caminho de `resolvePeriodoRelatorios` retorna um objeto concreto.
  `parseISO` de string ilegível devolve `Invalid Date` sem lançar; `startOfDay`/`endOfDay` propagam
  `Invalid Date` sem lançar; `isValid` intercepta; há `try/catch` de reforço. A guarda `ISO_DATE_RE`
  antes do `parseISO` está correta e o teste cobre `"2026-13-99"` e `"nao-e-data"`.
- **SQLi (T-14-01):** `from`/`to` viram `Date` antes de chegarem ao Drizzle; `gte`/`lte`
  parametrizam. Zero interpolação de string em SQL. As 3 agregações não mudaram de corpo (o
  `isNull(leads.deletedAt)` de T-11-21 continua nas 3; `getContagemPorMotivoPerda` continua filtrando
  por `stageChangedAt`, não `createdAt` — D-11 intacto).
- **Loop de navegação (T-14-07):** `navegarCustom`/`navegarPreset` só são chamados dentro de event
  handlers (`onSelect` do `Calendar`, `onValueChange` do `Select`). Zero `useEffect`, zero navegação
  no corpo do render.
- **`items` no `<Select>`:** ao contrário do que a revisão anterior sugeriu em IN-03, passar `items`
  ao `SelectPrimitive.Root` (base-ui) é **necessário e correto** aqui — é o que permite o trigger
  exibir "Intervalo personalizado" no primeiro paint de `/relatorios?period=custom` sem abrir o
  popup. Rebaixado para nota.

Defeitos reais (todos herdados, nada corrigido): a perda do modo custom em navegação client-side
(CR-01), a contradição entre o clamp de `from` implementado e a decisão D-06 (WR-01), a navegação
com data velha ao desmarcar um date picker (WR-02), e a ausência total de teste de integração no
caminho custom→SQL, que é o núcleo da fase (WR-03).

## Structural Findings (fallow)

Nenhum bloco `<structural_findings>` foi fornecido nesta revisão.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `PeriodoSelector` perde o modo custom em navegação soft — date pickers somem e não repovoam

**File:** `src/components/periodo-selector.tsx:72-78,140,155`
**Issue:**
`customMode`, `dataInicio` e `dataFim` são inicializados **uma única vez** pelos initializers de
`useState` (`value === "custom"`, `parseDataInicial(from/to)`). O componente permanece montado
quando só a querystring muda (navegação soft do Next: `router.push`, `<Link>`, botão Voltar/Avançar
entre duas URLs de `/relatorios`). Cenário concreto e plausível num CRM solo:

1. Usuário está em `?period=custom&from=…&to=…` (pickers visíveis, `customMode === true`).
2. Escolhe "Últimos 30 dias" no dropdown → `handleSelectChange("30d")` roda `setCustomMode(false)`
   + `navegarPreset("30d")`. URL vira `?period=30d`.
3. Clica **Voltar** no navegador → URL volta a `?period=custom&from=…&to=…`. O server component
   re-renderiza e passa `value="custom"`, `from`, `to`. O `PeriodoSelector` **continua montado**
   com `customMode === false`.
4. Render resultante: `<Select value={customMode ? "custom" : value}>` → `value` → `"custom"`, o
   trigger mostra **"Intervalo personalizado"**; mas o gate dos pickers é `{customMode ? (…) : null}`
   → `customMode` é `false` → **os 2 date pickers NÃO renderizam**. O usuário vê "Intervalo
   personalizado" selecionado mas não consegue ver nem editar as datas ativas sem reabrir o dropdown
   e re-selecionar "custom".

Isso viola diretamente o must_have do `14-02-PLAN.md` ("os 2 campos vêm pré-preenchidos com os
valores de `from`/`to` da querystring", D-16) no caminho de navegação soft. O `<human-check>` do
14-02 só testou **F5/refresh** (= remount, que re-roda os initializers e mascara o bug). É
recuperável, mas é uma quebra visível do controle principal da fase.

**Fix:**
Derivar o modo custom do prop `value` (fonte de verdade do servidor) em vez de state isolado, e
ressincronizar as datas quando os props mudam:

```tsx
// modo custom = decisão do servidor OU gesto local ainda não navegado (D-15)
const emModoCustom = value === "custom" || customMode;

// ressincroniza os pickers quando a URL (props) muda
useEffect(() => {
  setDataInicio(parseDataInicial(from));
  setDataFim(parseDataInicial(to));
}, [from, to]);
```

Usar `emModoCustom` tanto no `value` do `<Select>` quanto no gate de render dos pickers.
Alternativa mais barata: `key={`${value}|${from ?? ""}|${to ?? ""}`}` no `<PeriodoSelector>` dentro
de `page.tsx` para forçar remount a cada mudança de intervalo — porém isso descarta o `customMode`
local do caso "selecionou custom mas ainda não preencheu as 2 datas" (D-15); a abordagem
`emModoCustom` + `useEffect` preserva esse estado.

## Warnings

### WR-01: Clamp de `from` futuro deixa o fallback D-06 inalcançável — intervalo 100% no futuro vira "só hoje" sem faixa de aviso

**File:** `src/db/queries.ts:363-372`
**Issue:**
`14-CONTEXT.md` §D-06 traz um exemplo trabalhado explícito: *"Se depois de aparar o intervalo ficar
inconsistente (ex: `from` também no futuro, ficando depois do `to` aparado), aí sim cai no fallback
D-04."* Esse cenário exige que `from` **não** seja aparado — só `to`. Mas a linha 366
(`if (fromDate.getTime() > inicioHoje.getTime()) fromDate = inicioHoje;`) apara `from` também:

- `from=2027-01-01`, `to=2027-06-01` (usuário errou o ano nas duas datas), `now=2026-08-30`
- ambos aparados → `start = startOfDay(hoje)`, `end = endOfDay(hoje)`
- `start <= end` → **não** cai no fallback (linha 370)
- retorno: `preset: "custom"`, `customInvalido: false`, `range` = só o dia de hoje
- a página renderiza os 3 relatórios de **um único dia** sem nenhuma faixa de aviso, e os pickers
  ficam pré-preenchidos com "2027" (as strings `from`/`to` originais são ecoadas na linha 377-383) —
  o admin acha que está vendo a janela que pediu.

O `14-01-PLAN.md` linha 101 de fato manda aparar `from` — o código segue o plano, mas o plano
contradiz D-06 do CONTEXT. Precisa de decisão humana sobre qual artefato vale. Hoje a ramificação
"fallback D-04 para intervalo inteiro no futuro" está morta e não tem teste que a exercite.

**Fix:**
Alinhar com D-06 — aparar só `to`, deixar `from` como veio, e deixar o gate `start > end` (linha 370)
capturar o intervalo inconsistente:

```ts
// b. clamp de data futura (D-06) — SÓ `to` é aparado; `from` fica como veio,
//    para o gate `start > end` abaixo capturar "from no futuro".
const fimHoje = endOfDay(now);
if (toDate.getTime() > fimHoje.getTime()) toDate = fimHoje;
```

Se a intenção real for manter o clamp de `from`, atualizar D-06 no CONTEXT e adicionar um teste que
documente que intervalo-inteiro-no-futuro resolve para "hoje" sem faixa.

### WR-02: Desmarcar um date picker navega com a data antiga (desync UI × filtro aplicado)

**File:** `src/components/periodo-selector.tsx:117-133`
**Issue:**
`<Calendar mode="single">` sem `required` permite desmarcar o dia selecionado (clicar de novo no dia
já marcado), disparando `onSelect(undefined)`. Em `handleInicioChange(undefined)` com `dataInicio`
já setado:

```ts
const proxInicio = date ?? dataInicio;   // date = undefined → cai no valor ANTIGO
if (proxInicio && dataFim) {             // ANTIGO é truthy → passa
  navegarCustom(proxInicio, dataFim);    // navega com a data que o usuário acabou de limpar
}
```

`setDataInicio(undefined)` limpa a exibição (botão volta a "Selecionar"), mas a navegação usa o valor
stale. Resultado: o picker mostra vazio enquanto os relatórios refletem o intervalo antigo. O mesmo
vale para `handleFimChange`. O `14-02-SUMMARY` afirma que "não navega se o resultado for `undefined`"
— só verdadeiro quando o estado já era `undefined`; se havia uma data, navega com ela.

**Fix:**
Não fazer fallback para o estado antigo — usar o valor novo diretamente:

```ts
function handleInicioChange(date: Date | undefined) {
  setDataInicio(date);
  setInicioPopoverOpen(false);
  if (date && dataFim) navegarCustom(date, dataFim);
}
```

Se desmarcar deve **também** limpar a URL, tratar `!date` explicitamente
(`params.delete("from")` / voltar a `navegarPreset`), mas nunca navegar com o valor anterior.

### WR-03: O caminho custom→SQL (núcleo da Fase 14) não tem nenhum teste de integração

**File:** `scripts/test-relatorios-queries.cjs:179-280,366`
**Issue:**
As ~12 asserções novas exercitam `resolvePeriodoRelatorios` como função pura. A PARTE B (contra o
SQLite temporário) continua usando **só** `resolvePeriodRange("30d")` (linha 366). Nenhum teste
alimenta um `range` vindo de `resolvePeriodoRelatorios({ period: "custom", from, to })` para dentro
de `getContagemPorOrigem`/`getContagemPorNicho`/`getContagemPorMotivoPerda`. Como T-14-01 (SQLi) e o
valor da fase estão exatamente nessa fronteira (intervalo arbitrário → parâmetro do Drizzle), a
ausência de cobertura end-to-end deixa regressões silenciosas possíveis (ex.: alguém trocar
`gte`/`lte` por `sql` interpolado; o clamp passar `Invalid Date` adiante; a serialização
Date→segundos do Drizzle quebrar num bump de versão).

**Fix:**
Adicionar à PARTE B um cenário: resolver `resolvePeriodoRelatorios({ period: "custom", from, to },
now)`, passar `.range` para pelo menos uma das 3 agregações e checar a contagem esperada para leads
dentro/fora da janela custom (o dataset da PARTE B já tem leads em datas variadas — L8 há 100d, L10
há 200d). Incluir um caso com `from`/`to` = payload adulterado (montado por concatenação, como já se
faz nas linhas 157/269) provando que a query roda sem erro e devolve o fallback.

### WR-04: `customMode` stale desincroniza o `<Select>` após fallback server-side de intervalo inválido

**File:** `src/components/periodo-selector.tsx:140,155`
**Issue:**
Relacionado a CR-01, vetor distinto. Quando o usuário submete um intervalo inválido pelos pickers
(fim antes do início), o servidor devolve `preset: "30d"`, `customInvalido: true`, **sem** `from`/`to`.
O componente continua montado com `customMode === true` (setado no handler ao entrar no modo custom).
Render: `<Select value={customMode ? "custom" : value}>` → "custom" enquanto a página exibe a faixa
"mostrando os últimos 30 dias" e dados de 30 dias. O seletor diz "Intervalo personalizado", os dados
dizem 30d — exatamente a dessincronização que o threat model T-14-08 afirma mitigar. É recuperável
mas confuso.

**Fix:**
Decidir e tornar consistente entre `<Select>`, pickers e faixa: (a) manter o `<Select>` em "custom"
**e** os pickers visíveis com as datas rejeitadas para correção (coerente com a faixa de aviso), ou
(b) resetar o modo para acompanhar o `preset` do servidor quando `customInvalido` é `true`.
Documentar em D-16/D-17. A correção de CR-01 (`emModoCustom` derivado de `value`) resolve o vetor
(b) automaticamente.

### WR-05: Dois defaults de `now` independentes — fragilidade latente entre clamp e range de fallback

**File:** `src/db/queries.ts:263,316`
**Issue:**
`resolvePeriodoRelatorios(params, now = new Date())` repassa `now` a `resolvePeriodRange` em todos os
ramos — correto hoje. Porém `resolvePeriodRange` também tem `now = new Date()` como default próprio
(linha 263). Se um refactor futuro adicionar um ramo em `resolvePeriodoRelatorios` e esquecer de
repassar `now`, o código não quebra nem falha teste óbvio — usa silenciosamente dois "agoras"
ligeiramente diferentes no mesmo request (um para o clamp de `from`/`to`, outro para o `range` do
fallback), podendo produzir um `range` inconsistente exatamente em cima da meia-noite. Não é bug
hoje; é armadilha para o próximo editor.

**Fix:**
Baixo custo: adicionar uma asserção cruzada no harness (já há `now` fixo injetado) verificando que,
no fallback de custom-inválido, `resultado.range.end.getTime() === resolvePeriodRange("30d", now).end.getTime()`
— mesma referência de tempo.

## Info

### IN-01: Cabeçalho do harness desatualizado

**File:** `scripts/test-relatorios-queries.cjs:4-9`
**Issue:** O doc-comment ainda diz "Fase 11, plano 11-04" e lista a PARTE A como
"`computeTaxaConversao, resolvePeriodRange, buildLinhasOrigem`" — sem citar `resolvePeriodoRelatorios`,
que agora concentra ~12 das asserções.
**Fix:** Atualizar o cabeçalho para mencionar a Fase 14 e `resolvePeriodoRelatorios`.

### IN-02: Cast duplo `as unknown as` no prop `items` do `<Select>`

**File:** `src/components/periodo-selector.tsx:139`
**Issue:** `items={OPCOES as unknown as { value: string; label: string }[]}` desliga a checagem de
tipos por completo (`OPCOES` é `readonly`; o destino é mutável). O prop `items` em si é necessário
(ver Resumo) — o problema é só o cast.
**Fix:** `items={OPCOES.map((o) => ({ value: o.value, label: o.label }))}` — remove o `unknown` e
mantém a inferência.

### IN-03: `<Calendar>` não impede visualmente datas futuras

**File:** `src/components/periodo-selector.tsx:172-177,195-201`
**Issue:** Os 2 `<Calendar>` não passam `disabled={{ after: new Date() }}`. O usuário pode escolher
uma data futura no picker; a única proteção é o clamp server-side (D-06). Combinado com WR-01, um
intervalo inteiro no futuro escolhido pelo picker vira "só hoje" sem nenhum sinal visual.
**Fix:** Opcional (o clamp server-side é a barreira real), mas `disabled={{ after: hoje }}` nos 2
calendários daria feedback imediato e eliminaria a classe de confusão de WR-01 pelo lado do gesto.

### IN-04: Tipo de `searchParams` na página é mais estreito do que o Next.js garante

**File:** `src/app/relatorios/page.tsx:40`
**Issue:** `searchParams: Promise<{ period?: string; from?: string; to?: string }>`. No App Router do
Next, um param repetido na URL (`?period=custom&period=30d`) chega como `string[]`, não `string` — o
tipo declarado mente. Em runtime não quebra: `resolvePeriodoRelatorios` faz `period === "custom"`
(falha para array → cai no fallback silencioso "tudo") e `typeof from !== "string"` (array → fallback30),
então nada lança. Mas o tipo declarado esconde esse caminho e um `period=custom` repetido resolve
silenciosamente para "tudo" em vez de custom.
**Fix:** Tipar como `Record<string, string | string[] | undefined>` (ou o helper do Next) e, se
quiser previsibilidade, normalizar `Array.isArray(x) ? x[0] : x` antes de passar para
`resolvePeriodoRelatorios`.

---

_Revisado: 2026-08-30T21:15:00Z_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard (re-revisão — código idêntico à revisão de 19:30Z)_
