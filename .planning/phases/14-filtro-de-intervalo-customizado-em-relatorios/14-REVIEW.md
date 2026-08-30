---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
reviewed: 2026-08-30T19:30:37Z
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

# Fase 14: Relatório de Revisão de Código

**Revisado:** 2026-08-30T19:30:37Z
**Profundidade:** standard
**Arquivos revisados:** 4
**Status:** issues_found

## Resumo

Revisão adversarial da Fase 14 (filtro de intervalo customizado em `/relatorios`): a função pura
`resolvePeriodoRelatorios`, o server component `/relatorios`, o client component `PeriodoSelector`
e o harness `.cjs`.

Pontos fortes confirmados:

- **Nunca-lança (T-14-02):** todos os caminhos de `resolvePeriodoRelatorios` retornam um objeto
  concreto. `parseISO` de string ilegível devolve `Invalid Date` (não lança), `startOfDay`/`endOfDay`
  propagam `Invalid Date` sem lançar, `isValid` intercepta, e há `try/catch` de reforço. A guarda de
  regex `ISO_DATE_RE` antes do `parseISO` está correta.
- **SQLi (T-14-01):** `from`/`to` viram `Date` antes de chegarem ao Drizzle; `gte`/`lte` parametrizam.
  Nenhuma interpolação de string em SQL. As 3 agregações não mudaram de corpo.
- **Loop de navegação (T-14-07):** `navegarCustom`/`navegarPreset` só são chamados dentro de event
  handlers (`onSelect` do `Calendar`, `onValueChange` do `Select`). Zero `useEffect`, zero navegação
  no corpo do render. Não há risco de loop.
- **Closure de "as 2 datas preenchidas":** `handleInicioChange`/`handleFimChange` computam o próximo
  valor local (`date ?? estadoAtual`) antes de checar — não dependem do `setState` já ter aplicado
  (mas ver WR-02 sobre o efeito colateral do fallback).

Porém há defeitos reais: uma contradição entre a lógica de clamp implementada e a decisão D-06
registrada no CONTEXT, a perda do modo custom em navegação client-side (back/forward), navegação com
data velha ao desmarcar um date picker, e uma lacuna de cobertura (o caminho custom→SQL, que é o
núcleo da fase, não tem nenhum teste de integração).

## Structural Findings (fallow)

Nenhum bloco `<structural_findings>` foi fornecido nesta revisão.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `PeriodoSelector` perde o modo custom em navegação client-side — pickers somem e datas não repovoam

**File:** `src/components/periodo-selector.tsx:72-78`
**Issue:**
`customMode`, `dataInicio` e `dataFim` são inicializados **só uma vez** pelos initializers de
`useState` (`value === "custom"`, `parseDataInicial(from/to)`). O componente NÃO remonta quando só
a querystring muda (navegação soft do Next). Cenários quebrados:

1. Usuário está em `/relatorios?period=custom&from=…&to=…` (pickers visíveis) → navega para `/leads`
   → clica **Voltar** no navegador de volta para a URL custom. O componente permanece montado com
   `customMode === false` (estava num preset antes, ou nunca foi setado). Resultado: o `<Select>`
   mostra "Intervalo personalizado" (porque `value === "custom"`), **mas os 2 date pickers não
   renderizam** (gate é `customMode ?`, não `value === "custom"`), e o usuário não consegue ver nem
   editar o intervalo ativo sem re-selecionar "custom" no dropdown.
2. Mesmo com o gate corrigido, `dataInicio`/`dataFim` continuariam com o valor do primeiro mount
   (possivelmente `undefined`, se a primeira renderização foi num preset), violando D-16
   ("os 2 campos vêm pré-preenchidos com os valores de `from`/`to` da querystring").

O `<human-check>` do 14-02 só testou **refresh** (`F5` = remount), que mascara o bug. Qualquer
transição client-side para uma URL `?period=custom` fica inconsistente.

**Fix:**
Derivar o modo custom do prop `value` (fonte de verdade do servidor), não de state isolado, e
ressincronizar as datas quando os props mudam:

```tsx
// modo custom = decisão do servidor OU gesto local ainda não navegado
const emModoCustom = value === "custom" || customMode;

// ressincroniza os pickers quando a URL (props) muda
useEffect(() => {
  setDataInicio(parseDataInicial(from));
  setDataFim(parseDataInicial(to));
}, [from, to]);
```

Usar `emModoCustom` tanto no `value` do `<Select>` (`emModoCustom ? "custom" : value`) quanto no
gate de render dos pickers. Alternativa mais simples: `key={`${value}|${from}|${to}`}` no
`<PeriodoSelector>` dentro de `page.tsx` para forçar remount a cada mudança de intervalo — só
cuidado que isso descarta o `customMode` local quando o usuário selecionou "custom" mas ainda não
preencheu as 2 datas (D-15). A abordagem com `emModoCustom` + `useEffect` preserva esse estado.

## Warnings

### WR-01: Clamp de `from` futuro torna o fallback D-06 inalcançável — intervalo 100% no futuro vira "só hoje" sem faixa de aviso

**File:** `src/db/queries.ts:366`
**Issue:**
`14-CONTEXT.md` §D-06 dá um exemplo trabalhado explícito: *"Se depois de aparar o intervalo ficar
inconsistente (ex: `from` também no futuro, ficando depois do `to` aparado), aí sim cai no fallback
D-04."* Esse cenário exige que `from` **não** seja aparado — só `to`. Mas a linha 366
(`if (fromDate.getTime() > inicioHoje.getTime()) fromDate = inicioHoje;`) apara `from` também, então:

- `from=2027-01-01`, `to=2027-06-01` (ex.: usuário errou o ano nas duas datas), `now=2026-08-30`
- ambos são aparados → `start = startOfDay(hoje)`, `end = endOfDay(hoje)`
- `start <= end` → **não** cai no fallback
- retorno: `preset: "custom"`, `customInvalido: false`, `range` = só o dia de hoje
- a página renderiza os relatórios de **um único dia** sem nenhuma faixa de aviso, e os pickers
  ficam pré-preenchidos com "2027" (`from`/`to` originais ecoados) — o admin acha que está vendo a
  janela que pediu.

O `14-01-PLAN.md` linha 101 de fato manda aparar `from` — ou seja, o código segue o plano, mas o
plano contradiz a decisão D-06 do CONTEXT. É preciso decisão humana sobre qual artefato vale.
A ramificação "fallback D-04 para intervalo inteiro no futuro" está, hoje, morta.

**Fix:**
Alinhar com D-06 — aparar só `to`, deixar `from` como veio, e deixar o gate `start > end` (linha 370)
capturar o intervalo inconsistente:

```ts
// b. clamp de data futura (D-06) — SÓ `to` é aparado; `from` fica como veio,
//    para o gate `start > end` abaixo capturar "from no futuro".
const fimHoje = endOfDay(now);
if (toDate.getTime() > fimHoje.getTime()) toDate = fimHoje;
```

Se a intenção real for manter o clamp de `from` (comportamento do plano), então atualizar D-06 no
CONTEXT e adicionar um teste que documente que intervalo-inteiro-no-futuro resolve para "hoje" sem
faixa.

### WR-02: Desmarcar um date picker navega com a data antiga (desync UI × filtro aplicado)

**File:** `src/components/periodo-selector.tsx:117-133`
**Issue:**
`Calendar mode="single"` sem `required` permite desmarcar o dia selecionado, disparando
`onSelect(undefined)`. Em `handleInicioChange(undefined)` com um `dataInicio` já setado:

```ts
const proxInicio = date ?? dataInicio;   // date = undefined → cai no valor ANTIGO
if (proxInicio && dataFim) {             // ANTIGO é truthy → passa
  navegarCustom(proxInicio, dataFim);    // navega com a data que o usuário acabou de limpar
}
```

`setDataInicio(undefined)` limpa a exibição (botão volta a "Selecionar"), mas a navegação usa o
valor stale. Resultado: o picker mostra vazio enquanto os relatórios refletem o intervalo antigo.
O `14-02-SUMMARY.md` linha 91 afirma *"não navega se o resultado for `undefined`"* — só verdade
quando `dataInicio` já era `undefined`; se havia uma data, navega com ela.

**Fix:**
Não fazer fallback para o estado antigo — usar o valor novo diretamente e só navegar quando ele
existir:

```ts
function handleInicioChange(date: Date | undefined) {
  setDataInicio(date);
  setInicioPopoverOpen(false);
  if (date && dataFim) navegarCustom(date, dataFim);
}
```

Se desmarcar deve **também** limpar a URL (voltar a estado sem `from`), tratar `!date` explicitamente
(ex.: `navegarPreset` ou `params.delete("from")`), mas nunca navegar com o valor anterior.

### WR-03: O caminho custom→SQL (núcleo da Fase 14) não tem nenhum teste de integração

**File:** `scripts/test-relatorios-queries.cjs:179-280`
**Issue:**
As 12 asserções novas exercitam `resolvePeriodoRelatorios` como função pura. A PARTE B (contra o
SQLite temporário) continua usando **só** `resolvePeriodRange("30d")` (linha 366). Nenhum teste
alimenta um `range` vindo de `resolvePeriodoRelatorios({ period: "custom", from, to })` para dentro
de `getContagemPorOrigem`/`getContagemPorNicho`/`getContagemPorMotivoPerda`. Como T-14-01 (SQLi) e o
próprio valor da fase estão exatamente nessa fronteira (intervalo arbitrário → parâmetro do Drizzle),
a ausência de cobertura end-to-end deixa regressões silenciosas possíveis (ex.: alguém trocar
`gte`/`lte` por `sql` interpolado, ou o clamp passar `Invalid Date` adiante).

**Fix:**
Adicionar à PARTE B um cenário: resolver `resolvePeriodoRelatorios({ period: "custom", from: "<data>",
to: "<data>" }, now)` e passar `.range` para pelo menos uma das 3 agregações, checando a contagem
esperada para leads dentro/fora da janela custom. Incluir um caso com `from`/`to` = payload
adulterado (montado por concatenação, como já feito nas linhas 157/269) para provar que a query
roda sem erro e retorna o fallback.

### WR-04: `customMode` stale também afeta a exibição do `<Select>` após fallback server-side

**File:** `src/components/periodo-selector.tsx:140`
**Issue:**
Relacionado a CR-01, mas vetor distinto. Quando o usuário submete um intervalo inválido pelos
pickers (ex.: fim antes do início), o servidor devolve `preset: "30d"`, `customInvalido: true`, sem
`from`/`to`. O componente continua montado com `customMode === true`, então o `<Select>` mostra
`customMode ? "custom" : value` = **"custom"** enquanto a página exibe a faixa "mostrando os últimos
30 dias" e dados de 30 dias. O seletor e o conteúdo discordam (o seletor diz custom, os dados dizem
30d). É recuperável (o usuário conserta as datas), mas é exatamente a dessincronização que T-14-08
diz mitigar.

**Fix:**
Decidir o comportamento desejado e torná-lo consistente entre `<Select>`, pickers e faixa: ou (a)
manter o `<Select>` em "custom" **e** manter os pickers visíveis com as datas rejeitadas para
correção (coerente com a faixa de aviso), ou (b) resetar `customMode` para acompanhar o `preset` do
servidor quando `customInvalido` volta true. Documentar a escolha em D-16/D-17. A correção de CR-01
(`emModoCustom` derivado de `value`) resolve metade disso.

### WR-05: Dois defaults de `now` independentes criam fragilidade latente entre clamp e fallback

**File:** `src/db/queries.ts:263,314-317`
**Issue:**
`resolvePeriodoRelatorios(params, now = new Date())` recebe `now` e o repassa a `resolvePeriodRange`
em todos os ramos — está correto hoje. Porém `resolvePeriodRange` também tem `now = new Date()` como
default próprio. Se um refactor futuro esquecer de repassar `now` em algum ramo novo de
`resolvePeriodoRelatorios`, o código não quebra nem falha teste óbvio — ele silenciosamente usa dois
"agoras" ligeiramente diferentes no mesmo request (um para o clamp, outro para o range de fallback),
o que pode produzir um `range` inconsistente em cima da meia-noite. Não é bug hoje; é fragilidade.

**Fix:**
Baixo custo: adicionar um teste que injeta `now` fixo e verifica que o `range.end` do fallback de
custom-inválido é exatamente `resolvePeriodRange("30d", now).end` (mesma referência de tempo). Já há
`now` fixo nos testes — só falta a asserção cruzada.

## Info

### IN-01: Cabeçalho do harness desatualizado

**File:** `scripts/test-relatorios-queries.cjs:4-9`
**Issue:** O doc-comment ainda diz "Fase 11, plano 11-04" e lista a PARTE A como
"`computeTaxaConversao, resolvePeriodRange, buildLinhasOrigem`" — sem mencionar
`resolvePeriodoRelatorios`, que agora concentra 12 das asserções.
**Fix:** Atualizar o cabeçalho para citar a Fase 14 e `resolvePeriodoRelatorios`.

### IN-02: Cast duplo `as unknown as` no prop `items` do `<Select>`

**File:** `src/components/periodo-selector.tsx:139`
**Issue:** `items={OPCOES as unknown as { value: string; label: string }[]}` desliga a checagem de
tipos por completo. `OPCOES` é `readonly`; o destino é mutável.
**Fix:** `items={OPCOES.map((o) => ({ value: o.value, label: o.label }))}` ou tipar `OPCOES` como
`{ value: string; label: string }[]` direto. Evita o `unknown`.

### IN-03: Inconsistência de padrão com `lead-table-toolbar.tsx` (prop `items`)

**File:** `src/components/periodo-selector.tsx:138-141`
**Issue:** `PeriodoSelector` passa `items` ao `<Select>`; `lead-table-toolbar.tsx` (mesmo primitivo,
citado como o padrão a copiar) não passa. Se `items` é necessário para o trigger exibir o label
correto quando o popup nunca foi aberto, então a toolbar tem um bug latente; se não é necessário,
`PeriodoSelector` tem código morto. Vale alinhar os dois.
**Fix:** Verificar o comportamento do `<SelectValue>` do base-ui sem `items` e padronizar.

### IN-04: Calendar não impede visualmente datas futuras

**File:** `src/components/periodo-selector.tsx:172-176,196-200`
**Issue:** Os 2 `<Calendar>` não passam `disabled={{ after: new Date() }}`. O usuário pode escolher
uma data futura no picker; a proteção é 100% server-side (clamp D-06). Combinado com WR-01, um
intervalo inteiro no futuro escolhido pelo picker vira "só hoje" sem sinal visual.
**Fix:** Opcional (o clamp server-side é a barreira real), mas `disabled={{ after: hoje }}` nos 2
calendários daria feedback imediato e eliminaria a classe de confusão de WR-01 pelo lado do gesto.

---

_Revisado: 2026-08-30T19:30:37Z_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
