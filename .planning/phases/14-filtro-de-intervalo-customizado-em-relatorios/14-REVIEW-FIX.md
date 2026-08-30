---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
fixed_at: 2026-08-30T22:30:00Z
review_path: .planning/phases/14-filtro-de-intervalo-customizado-em-relatorios/14-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Fase 14: Relatório de Correção da Revisão de Código

**Corrigido em:** 2026-08-30T22:30:00Z
**Revisão de origem:** `.planning/phases/14-filtro-de-intervalo-customizado-em-relatorios/14-REVIEW.md`
**Iteração:** 1

**Resumo:**
- Achados no escopo: 10 (CR-01, WR-01..05, IN-01..04 — escopo `all`)
- Corrigidos: 10
- Pulados: 0

**Validação após as correções:**
- `node scripts/test-relatorios-queries.cjs` → **exit 0**, 57 checagens, todas passaram (eram 38 antes da fase, 45 no fim da fase; +12 nesta rodada de correção).
- `npx tsc --noEmit` → **exit 0**, sem erros.
- `npm run build` (Next 16.2 / Turbopack, rodado no repositório principal após o merge) → **exit 0**, 13 rotas geradas, `/relatorios` como `ƒ` (server-rendered on demand) como esperado.

**Nota de método:** as correções foram aplicadas e commitadas num git worktree isolado
(`gsd-reviewfix/14-763`), validadas, e o branch `main` foi fast-forwardado para os 9
commits. O worktree e o branch temporário foram removidos ao final.

---

## Issues Corrigidos

### CR-01: `PeriodoSelector` perde o modo custom em navegação soft

**Arquivos modificados:** `src/components/periodo-selector.tsx`
**Commit:** `7408f7f`
**Status:** corrigido — requer verificação humana (comportamento de navegação no navegador, não coberto por teste automatizado)
**Correção aplicada:**
- O modo custom passou a ser **derivado** do prop `value` (fonte de verdade do
  servidor): `const emModoCustom = value === "custom" || customMode;`. O `||
  customMode` preserva o caso D-15 (escolheu "Intervalo personalizado" no
  dropdown mas ainda não preencheu as 2 datas → ainda não navegou).
- `emModoCustom` é usado tanto no `value` do `<Select>` quanto no gate de render
  dos 2 date pickers — em navegação soft (Voltar/Avançar entre 2 URLs de
  `/relatorios`) com `value === "custom"`, os pickers voltam a renderizar sem
  precisar reabrir o dropdown.
- Novo `useEffect` com deps `[value, from, to]` ressincroniza `dataInicio` /
  `dataFim` a partir dos props e reseta `customMode` para `value === "custom"`
  quando a URL muda. Sem navegação dentro do effect (T-14-07 preservado).

**Verificação humana sugerida:** no navegador, entrar em
`?period=custom&from=…&to=…`, trocar para "Últimos 30 dias", clicar Voltar →
confirmar que os 2 date pickers reaparecem preenchidos.

### WR-01: Clamp de `from` futuro deixava o fallback D-06 inalcançável

**Arquivos modificados:** `src/db/queries.ts`, `.planning/phases/14-filtro-de-intervalo-customizado-em-relatorios/14-01-PLAN.md`, `scripts/test-relatorios-queries.cjs`
**Commit:** `f45172d`
**Status:** corrigido
**Correção aplicada:**
- `src/db/queries.ts`: o clamp de data futura agora apara **só `to`**
  (`endOfDay(now)`); `from` fica exatamente como veio. Com isso um intervalo
  100% no futuro (ex: `from`/`to` ambos em 2027) tem `from` > `to` aparado → cai
  no gate `start > end` → fallback `30d` + `customInvalido: true` + faixa de
  aviso, em vez de virar "só hoje" silenciosamente. Doc-comment atualizado.
- `14-01-PLAN.md`: corrigidos o `must_have` (linha ~21) e a nota da Task 1.b
  (linha ~101) que mandavam aparar `from` — agora alinhados com D-06 do
  `14-CONTEXT.md`.
- `scripts/test-relatorios-queries.cjs`: novo caso `resolvePeriodoRelatorios(
  { period: "custom", from: "2027-01-01", to: "2027-06-01" })` → assere
  `preset === "30d"`, `customInvalido === true`, `range.end` igual ao do
  fallback `30d`.

### WR-02: Desmarcar um date picker navegava com a data antiga

**Arquivos modificados:** `src/components/periodo-selector.tsx`
**Commit:** `ffd1c0b`
**Status:** corrigido — requer verificação humana (interação de desmarcar dia no `<Calendar>`, não coberta por teste automatizado)
**Correção aplicada:**
- `handleInicioChange` / `handleFimChange` deixaram de fazer `date ?? dataInicio`
  (fallback para o estado antigo). Agora usam o valor novo diretamente: se
  `date` for `undefined` (usuário clicou de novo no dia marcado → `onSelect(
  undefined)`), o `if (date && dataFim)` / `if (dataInicio && date)` não passa e
  **não navega** — a URL antiga permanece e o picker fica coerente (vazio).

**Verificação humana sugerida:** no modo custom com as 2 datas preenchidas,
abrir um picker e clicar no dia já selecionado para desmarcá-lo → confirmar que
os relatórios NÃO mudam e o botão volta a "Selecionar".

### WR-03: Caminho custom→SQL sem teste de integração

**Arquivos modificados:** `scripts/test-relatorios-queries.cjs`
**Commit:** `f25c025`
**Status:** corrigido
**Correção aplicada:**
- Novo bloco na PARTE B: resolve `resolvePeriodoRelatorios({ period: "custom",
  from: <150d atrás>, to: <hoje> })` e passa `.range` para
  `getContagemPorOrigem` contra o SQLite temporário. A janela de 150d inclui o
  lead `L8` (criado há 100d, que o recorte 30d exclui) → `outbound.total === 9`
  vs `8`, provando que o intervalo arbitrário chega ao `gte`/`lte` do Drizzle.
- Caso adicional: `from`/`to` = payload SQLi montado por concatenação → fallback
  `30d`, e `getContagemPorOrigem(range do fallback)` roda sem lançar e devolve o
  recorte de 30 dias (`outbound === 8`).

### WR-04: `customMode` stale desincroniza o `<Select>` após fallback server-side

**Arquivos modificados:** `src/components/periodo-selector.tsx`
**Commit:** `7408f7f` (mesmo change de CR-01)
**Status:** corrigido — requer verificação humana (mesmo motivo de CR-01)
**Correção aplicada:**
- Resolvido pelo vetor (b) da revisão: o `useEffect` de ressincronização faz
  `setCustomMode(value === "custom")` quando a URL muda. Ao submeter um intervalo
  inválido, o servidor devolve `preset: "30d"` sem `from`/`to`; `value` volta a
  `"30d"`, `emModoCustom` fica `false`, o `<Select>` deixa de dizer "Intervalo
  personalizado" e a faixa "mostrando os últimos 30 dias" passa a ser coerente
  com o seletor.

**Verificação humana sugerida:** no modo custom, preencher fim antes do início →
confirmar que o seletor volta para "Últimos 30 dias" junto com a faixa de aviso.

### WR-05: Dois defaults de `now` independentes

**Arquivos modificados:** `scripts/test-relatorios-queries.cjs`
**Commit:** `2d63e99`
**Status:** corrigido
**Correção aplicada:**
- Nova asserção cruzada no harness (com `now` fixo injetado): no fallback de
  custom-inválido, `resultado.range.start` **e** `resultado.range.end` são
  idênticos aos de `resolvePeriodRange("30d", now)` — trava a "mesma referência
  de tempo" e faz falhar qualquer refactor futuro que introduza um segundo
  `new Date()`.

### IN-01: Cabeçalho do harness desatualizado

**Arquivos modificados:** `scripts/test-relatorios-queries.cjs`
**Commit:** `7a33620`
**Status:** corrigido
**Correção aplicada:**
- Doc-comment atualizado: menciona a Fase 14 / planos 14-01 e 14-02, adiciona
  `resolvePeriodoRelatorios` à lista da PARTE A e descreve que a PARTE B agora
  também é alimentada por um `range` custom.

### IN-02: Cast duplo `as unknown as` no prop `items`

**Arquivos modificados:** `src/components/periodo-selector.tsx`
**Commit:** `c22c6a9`
**Status:** corrigido
**Correção aplicada:**
- `items={OPCOES.map((o) => ({ value: o.value, label: o.label }))}` — remove o
  `as unknown as` e devolve um array mutável com o shape exato que o prop espera,
  mantendo a checagem de tipos.

### IN-03: `<Calendar>` não impedia datas futuras visualmente

**Arquivos modificados:** `src/components/periodo-selector.tsx`
**Commit:** `656ea08`
**Status:** corrigido
**Correção aplicada:**
- `disabled={{ after: hoje }}` nos 2 `<Calendar>` (`hoje = new Date()`). Dá
  feedback imediato e fecha, pelo lado do gesto, a classe de confusão de WR-01.
  O clamp server-side (D-06) continua sendo a barreira real.

### IN-04: Tipo de `searchParams` mais estreito do que o Next.js garante

**Arquivos modificados:** `src/app/relatorios/page.tsx`
**Commit:** `0109ea2`
**Status:** corrigido
**Correção aplicada:**
- `searchParams` re-tipado como `Promise<Record<string, string | string[] |
  undefined>>`.
- Novo helper `primeiro(valor)` (`Array.isArray(valor) ? valor[0] : valor`)
  normaliza `period` / `from` / `to` antes de `resolvePeriodoRelatorios`, então
  um `?period=custom&period=30d` repetido resolve para `custom` em vez de cair no
  fallback silencioso "tudo".

---

## Issues Pulados

Nenhum. Todos os 10 achados no escopo foram corrigidos.

---

_Corrigido: 2026-08-30T22:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteração: 1_
