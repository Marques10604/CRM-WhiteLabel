---
phase: 14-filtro-de-intervalo-customizado-em-relatorios
verified: 2026-08-30T20:15:00Z
status: human_needed
score: 4/4 critérios de sucesso do ROADMAP verificados no código (19/19 truths de plano verificáveis por código)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
human_verification:
  - test: "Abrir /relatorios e abrir o <Select> de período"
    expected: "4 opções: Últimos 30 dias, Últimos 90 dias, Tudo, Intervalo personalizado"
    why_human: "Renderização visual do dropdown — grep confirma OPCOES tem a 4ª entrada, mas só o navegador confirma que aparece corretamente"
  - test: "Escolher 'Intervalo personalizado'; depois voltar a um preset"
    expected: "Ao escolher custom aparecem 2 date pickers rotulados 'Início' e 'Fim' ao lado do Select; ao escolher 30d/90d/tudo os 2 campos somem"
    why_human: "Toggle condicional de UI dependente de estado do cliente"
  - test: "No modo custom, escolher data de início E data de fim válidas (ex: 01/06 a 30/08)"
    expected: "URL vira ?period=custom&from=2026-06-01&to=2026-08-30 sem scroll ao topo; as 3 seções (origem, nicho, motivos de perda) recalculam para o intervalo"
    why_human: "Navegação client-side + recomputação server-side + comportamento de scroll"
  - test: "No modo custom, escolher só a data de início (deixar fim vazia)"
    expected: "Nada recalcula, a URL não muda para period=custom ainda"
    why_human: "Comportamento condicional de gesto (D-15)"
  - test: "Carregar /relatorios?period=custom&from=2026-06-01&to=2026-08-30 e dar refresh (F5)"
    expected: "O Select mostra 'Intervalo personalizado' e os 2 campos vêm pré-preenchidos com 01/06/2026 e 30/08/2026"
    why_human: "Hidratação de estado a partir da querystring no mount (D-16 / SC4)"
  - test: "Estando num intervalo custom, escolher 'Últimos 30 dias'"
    expected: "from e to somem da querystring; dados voltam para 30 dias"
    why_human: "params.delete client-side + recomputação (D-03)"
  - test: "No modo custom, informar data de fim ANTES da data de início"
    expected: "A página exibe a faixa âmbar 'Intervalo inválido — mostrando os últimos 30 dias.' e mostra dados de 30 dias"
    why_human: "Fallback server-side + faixa de aviso server-rendered (SC3 / D-07)"
  - test: "No modo custom, informar uma data no FUTURO no campo Fim (ex: fim = 01/01/2099, início válido no passado)"
    expected: "O relatório trata o fim como 'até hoje' (clamp D-06), SEM faixa de erro, dados até a data de hoje"
    why_human: "Clamp de data futura server-side — comportamento visível só no navegador"
  - test: "DECISÃO HUMANA (WR-01): informar AS DUAS datas no futuro (ex: início 01/01/2027, fim 01/06/2027)"
    expected: "Definir o comportamento correto. Hoje: resolve para 'só o dia de hoje', preset custom, SEM faixa de aviso, pickers exibindo '2027'. O 14-CONTEXT §D-06 diz que intervalo inteiro no futuro deveria cair no fallback 30d + faixa; o 14-01-PLAN linha 101 manda aparar 'from' também (o que o código faz). Plano e contexto se contradizem — decidir qual vale e alinhar."
    why_human: "Contradição entre artefatos de planejamento; requer decisão de produto sobre o edge case"
  - test: "DECISÃO HUMANA (CR-01): estando em ?period=custom&from&to, trocar para preset '30d', depois clicar VOLTAR no navegador"
    expected: "Verificar se os 2 date pickers reaparecem preenchidos. Hoje: o Select mostra 'Intervalo personalizado' (deriva de value) mas os pickers NÃO renderizam (gate é customMode local, inicializado só no 1º mount) — o admin não vê/edita o intervalo ativo sem reabrir o dropdown. Refresh (F5) funciona; navegação soft (voltar/avançar) não."
    why_human: "Bug de staleness de estado client-side em navegação soft do Next — decidir se bloqueia o fechamento da fase ou vira débito"
---

# Phase 14: Filtro de intervalo customizado em `/relatorios` — Relatório de Verificação

**Phase Goal:** O admin avalia a performance de um nicho (ou origem, ou motivo de perda) em qualquer janela de tempo que ele escolher, informando data de início e data de fim — o produto não impõe duração de janela.
**Verified:** 2026-08-30T20:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths — Critérios de Sucesso do ROADMAP

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| SC1 | Além dos presets 30d/90d/tudo, o admin pode escolher "intervalo personalizado" e informar data de início e fim | ✓ VERIFIED (código) — confirmação visual pendente | `periodo-selector.tsx:46-51` OPCOES tem 4ª entrada `{ value: "custom", label: "Intervalo personalizado" }`; `:155-205` 2 blocos `Popover`+`Calendar mode="single"` renderizam quando `customMode` |
| SC2 | As três seções (origem, nicho, motivos de perda) recalculam para o intervalo informado | ✓ VERIFIED (código) — confirmação visual pendente | `page.tsx:53-63` uma chamada a `resolvePeriodoRelatorios` → `range` passado igual para `getContagemPorOrigem/Nicho/MotivoPerda` no `Promise.all`; `git diff 35c50a0..HEAD` confirma que as 3 agregações NÃO mudaram de corpo; `periodo-selector.tsx:92-98` `navegarCustom` → `?period=custom&from&to` (`router.push`, `scroll:false`) |
| SC3 | Intervalo inválido (fim antes do início, campo vazio, data no futuro) não quebra a tela — fallback claro com aviso | ✓ VERIFIED (código) com ressalva WR-01 | `queries.ts:314-388` `resolvePeriodoRelatorios` nunca lança (regex `ISO_DATE_RE` + `parseISO`+`isValid` + `try/catch`); fallback `30d` + `customInvalido:true`; `page.tsx:82-86` faixa âmbar server-rendered "Intervalo inválido — mostrando os últimos 30 dias."; `test:relatorios` 50/50 cobre to<from, sem to, ilegível, impossível. **Ressalva:** intervalo 100% no futuro NÃO cai no fallback (WR-01) |
| SC4 | O intervalo selecionado sobrevive a um refresh da página (querystring, `scroll: false`) | ✓ VERIFIED (código) com ressalva CR-01 | `page.tsx:37-57` server component lê `period/from/to` de `searchParams` a cada request; `periodo-selector.tsx:72-78` `useState` inicializa `customMode`/`dataInicio`/`dataFim` de `value`/`from`/`to`. **Ressalva:** funciona em refresh (F5 = remount); navegação soft (voltar/avançar) fica com estado stale (CR-01) |

**Score:** 4/4 critérios do ROADMAP verificados no nível de código. 8 itens de checagem visual/interação + 2 decisões humanas pendentes.

### Truths dos PLAN frontmatter (14-01 + 14-02)

| # | Truth (resumo) | Status | Evidence |
| --- | --- | --- | --- |
| 01-1 | Função pura `resolvePeriodoRelatorios({period,from,to}, now)` → `{preset,range,customInvalido,from?,to?}`, nunca lança | ✓ VERIFIED | `queries.ts:314-388`; `test:relatorios` casos "não lança" passam |
| 01-2 | `period` ausente → `30d`, `customInvalido:false` | ✓ VERIFIED | `queries.ts:321-323`; teste linha 184-188 |
| 01-3 | `period` fora do set → `tudo`, `customInvalido:false` | ✓ VERIFIED | `queries.ts:386-388`; teste linha 271-278 |
| 01-4 | `custom` + datas válidas → `custom`, `range=[startOfDay(from),endOfDay(to)]`, `customInvalido:false` | ✓ VERIFIED | `queries.ts:377-383`; teste linha 197-210 |
| 01-5 | `custom` + to<from / uma data / ausente / formato inválido → `30d`, `customInvalido:true` | ✓ VERIFIED | `queries.ts:338-346, 369-372`; testes linha 213-250 |
| 01-6 | `custom` + data futura aparada pra hoje; se `start>end` pós-clamp → `30d` + `customInvalido:true` | ⚠️ PARCIAL | `queries.ts:363-372` apara `from` E `to`; para intervalo 100% no futuro o gate `start>end` fica inalcançável → contradiz 14-CONTEXT §D-06 (WR-01). Clamp de só `to` funciona (teste linha 253-261) |
| 01-7 | `/relatorios` resolve tudo pela função nova e passa o MESMO `range` para as 3 agregações (agregações intactas) | ✓ VERIFIED | `page.tsx:53-63`; `git diff` confirma agregações sem mudança |
| 01-8 | `customInvalido:true` → faixa de aviso server-rendered; `false` → nada | ✓ VERIFIED | `page.tsx:82-86` render condicional |
| 01-9 | `?period=custom&from&to` na URL recalcula as 3 seções e sobrevive a refresh | ✓ VERIFIED (código) | server component + querystring; confirmação visual pendente |
| 01-10 | `npm run build` exit 0; `npm run test:relatorios` exit 0 com casos novos | ✓ VERIFIED | `test:relatorios` executado ao vivo: 50/50; `tsc --noEmit` exit 0 ao vivo; build exit 0 por ambos executores |
| 02-1 | `<Select>` tem 4ª opção "Intervalo personalizado" (`value="custom"`) | ✓ VERIFIED | `periodo-selector.tsx:50` |
| 02-2 | Escolher custom → 2 campos de data; presets → escondidos | ✓ VERIFIED (código) | `periodo-selector.tsx:155` gate `customMode ?` |
| 02-3 | Cada campo = `Popover`+`Calendar mode="single"` + `Button variant="outline"` + ícone + `dd/MM/yyyy` + `ACCENT_FOCUS_RING` | ✓ VERIFIED | `periodo-selector.tsx:159-202` |
| 02-4 | 2 campos preenchidos → navega auto p/ `?period=custom&from&to`; 1 campo → não navega | ✓ VERIFIED (código) com ressalva WR-02 | `periodo-selector.tsx:117-133`; desmarcar um picker navega com data stale (WR-02) |
| 02-5 | Escolher preset a partir do custom → `?period=<preset>` e REMOVE `from`/`to` | ✓ VERIFIED | `periodo-selector.tsx:83-89` `navegarPreset` com `params.delete` |
| 02-6 | `?period=custom&from&to` na URL → Select mostra "Intervalo personalizado" e campos pré-preenchidos | ✓ VERIFIED em refresh; ⚠️ soft-nav (CR-01) | `periodo-selector.tsx:72-78` initializers; CR-01: não repovoa em navegação soft |
| 02-7 | Página passa `from`/`to` como props + `value={preset}` | ✓ VERIFIED | `page.tsx:73` `<PeriodoSelector value={preset} from={from} to={to} />` |
| 02-8 | `PeriodoSelector` NÃO chama `resolvePeriodRange`/decide default/fallback (D-17) | ✓ VERIFIED | grep exato de `resolvePeriodRange`/`resolvePeriodoRelatorios` no arquivo = vazio; sem `useEffect` de navegação |
| 02-9 | `npm run build` exit 0; `npx tsc --noEmit` exit 0 | ✓ VERIFIED | `tsc --noEmit` exit 0 ao vivo; build exit 0 por executores |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/queries.ts` | Função pura de resolução preset OU custom → `PeriodRange` + flag | ✓ VERIFIED | `type PeriodoRelatoriosResolvido`, `const ISO_DATE_RE`, `resolvePeriodoRelatorios` (linhas 277-388); import `date-fns` ganhou `endOfDay`/`isValid`/`parseISO`; 3 agregações intactas |
| `src/app/relatorios/page.tsx` | Lê period+from+to, resolve, faixa condicional, alimenta 3 queries | ✓ VERIFIED | `searchParams: Promise<{period?;from?;to?}>`, 1 chamada a `resolvePeriodoRelatorios`, faixa âmbar, `<PeriodoSelector value={preset} from={from} to={to} />` |
| `src/components/periodo-selector.tsx` | Seletor com 4ª opção + 2 date pickers condicionais + navegação auto | ✓ VERIFIED | Reescrito: props `from?`/`to?`, `OPCOES` 4 entradas, estado `customMode`/`dataInicio`/`dataFim`, `navegarPreset`/`navegarCustom`/handlers, 2 blocos `Popover`+`Calendar` |
| `scripts/test-relatorios-queries.cjs` | Cobertura da resolução custom (válido, inválido, clamp, não-lança) | ✓ VERIFIED | +12 asserções na PARTE A com `now` fixo `2026-08-30T12:00:00Z` (linhas 179-278); 50/50 no total. **Lacuna:** PARTE B não exercita `range` custom→SQL (WR-03) |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `page.tsx` | `queries.ts` | `resolvePeriodoRelatorios({ period, from, to })` de searchParams | ✓ WIRED | `page.tsx:53-57` |
| `page.tsx` | `queries.ts` | `range` resolvido → `getContagemPorOrigem/Nicho/MotivoPerda` | ✓ WIRED | `page.tsx:59-63` `Promise.all` |
| `page.tsx` | `periodo-selector.tsx` | `<PeriodoSelector value={preset} from={from} to={to} />` | ✓ WIRED | `page.tsx:73` |
| `periodo-selector.tsx` | `/relatorios?period=custom` | `router.push` com `period=custom&from&to` quando 2 datas | ✓ WIRED | `periodo-selector.tsx:92-98` `navegarCustom` |
| `periodo-selector.tsx` | `ui/calendar.tsx` | `import { Calendar }` + `<Calendar mode="single">` | ✓ WIRED | `periodo-selector.tsx:9, 172-176, 196-200` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `page.tsx` (3 seções) | `contagemOrigem`/`contagemNicho`/`contagemMotivoPerda` | `getContagemPor*(range)` — queries Drizzle SQL `GROUP BY` sobre `leads` com `gte`/`lte` no `range.start`/`range.end` | ✓ FLOWING | Queries reais confirmadas no `test:relatorios` PARTE B (contra SQLite temporário); `range` custom tem a MESMA forma `{start,end}` que o preset já testado |
| `periodo-selector.tsx` pickers | `dataInicio`/`dataFim` | `parseDataInicial(from/to)` das props (strings validadas do servidor) | ✓ FLOWING em refresh / ⚠️ stale em soft-nav (CR-01) | Initializers de `useState` só rodam no 1º mount |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Harness de relatórios (funções puras + 3 agregações SQL) | `npm run test:relatorios` | `OK: 50 checagens, todas passaram` (exit 0) | ✓ PASS |
| Type-check do projeto inteiro | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Casos "não lança" de `resolvePeriodoRelatorios` | incluídos no harness (from ilegível, payload SQLi) | `check(!threw, ...)` OK | ✓ PASS |
| Renderização visual `/relatorios` (4ª opção, pickers, faixa, refresh) | requer navegador | — | ? SKIP → verificação humana |

### Probe Execution

Nenhum probe declarado nos planos. Fase não-migração, sem `scripts/*/tests/probe-*.sh`. N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| METRICAS-03 | 14-01-PLAN, 14-02-PLAN | Em `/relatorios`, o admin pode informar um intervalo de datas customizado (início e fim) além dos presets 30d/90d/tudo, e as 3 seções respeitam esse intervalo | ✓ SATISFIED (código) — confirmação visual pendente | Função de resolução + página + seletor + cobertura; `REQUIREMENTS.md:22,62` marca `[x]` / `Complete`. Nenhum requisito órfão mapeado à Fase 14 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | Nenhum marcador de débito (`TODO`/`FIXME`/`XXX`/`TBD`) nos arquivos modificados | ℹ️ Info | `queries.ts:526` contém a palavra "TODOS" (português, "todos os períodos") — não é marcador |
| `periodo-selector.tsx` | 139 | `items={OPCOES as unknown as {...}[]}` — cast duplo desliga type-check do prop | ⚠️ Warning (IN-02) | Cosmético; `tsc` passa; risco baixo |

### Human Verification Required

Ver o bloco `human_verification` no frontmatter — 10 itens:

1. **4ª opção no Select** — abrir o dropdown de período e confirmar "Intervalo personalizado".
2. **Toggle dos pickers** — custom revela 2 campos "Início"/"Fim"; presets escondem.
3. **Recálculo com 2 datas** — preencher início e fim → URL `?period=custom&from&to`, 3 seções recalculam, sem scroll ao topo.
4. **Só 1 data** — não recalcula ainda.
5. **Sobrevive a refresh** — `?period=custom&from&to` + F5 → Select em "Intervalo personalizado", campos preenchidos.
6. **Voltar a preset** — `from`/`to` somem da URL, dados voltam pra 30d.
7. **Fim antes do início** — faixa âmbar "Intervalo inválido — mostrando os últimos 30 dias." + dados de 30d.
8. **Data futura no Fim** — tratado como "até hoje", sem faixa de erro.
9. **DECISÃO HUMANA (WR-01)** — intervalo 100% no futuro: hoje resolve para "só hoje" sem faixa; contradiz 14-CONTEXT §D-06 (que pede fallback 30d + faixa). O 14-01-PLAN linha 101 manda aparar `from` também. Decidir qual artefato vale e alinhar código/plano/contexto.
10. **DECISÃO HUMANA (CR-01)** — custom → preset → botão Voltar do navegador: os pickers não reaparecem (gate é `customMode` local, só inicializado no 1º mount). Refresh funciona; navegação soft não. Decidir se bloqueia o fechamento ou vira débito.

### Gaps Summary

Nenhum gap bloqueante. A meta da fase — o admin filtrar os relatórios por uma janela de datas arbitrária — está implementada ponta a ponta e verificada no nível de código: função pura de resolução (nunca lança, 50/50 no harness, `tsc` limpo), página alimentando as 3 agregações com o `range` resolvido (agregações comprovadamente intactas via `git diff`), seletor com a 4ª opção e os 2 date pickers, faixa de aviso server-rendered, tudo via querystring (sobrevive a refresh).

Pendências que exigem humano:

- **8 checagens visuais/de interação** deferidas pelo 14-02-PLAN para `/gsd-verify-work 14` com navegador — não verificáveis por grep (renderização de dropdown, toggle condicional, navegação client-side, hidratação de estado, faixa de aviso).
- **WR-01 (decisão de produto):** contradição real entre `14-01-PLAN` (apara `from` e `to`) e `14-CONTEXT §D-06` (intervalo inteiro no futuro deveria cair no fallback 30d + faixa). Hoje o código segue o plano e o ramo de fallback para "tudo no futuro" é código morto. Edge case degenerado (janela futura para performance histórica), não quebra a tela, mas o admin vê "só hoje" achando que vê a janela pedida.
- **CR-01 (staleness de estado client-side):** `customMode`/`dataInicio`/`dataFim` só são inicializados no 1º mount. Em navegação soft do Next (voltar/avançar) para uma URL `?period=custom`, o Select mostra "Intervalo personalizado" mas os pickers não renderizam e as datas não repovoam. Refresh (F5) mascara o bug. Recuperável reabrindo o dropdown. Correção sugerida na review: derivar o modo de `value` + `useEffect([from,to])` para ressincronizar.
- **WR-02 / WR-04 (menores):** desmarcar um picker navega com a data antiga; após fallback server-side o Select ainda mostra "custom" enquanto os dados são de 30d (a faixa de aviso mitiga a confusão).
- **WR-03 (cobertura):** o caminho `range` custom → SQL das 3 agregações não tem teste de integração (só função pura + agregações com preset). Risco baixo (forma de `range` idêntica), mas a fronteira T-14-01 fica sem cobertura end-to-end.

Recomendação: rodar `/gsd-verify-work 14` no navegador para os 8 itens visuais e levar WR-01 e CR-01 para decisão do admin antes de `/close-phase 14`.

---

_Verified: 2026-08-30T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
