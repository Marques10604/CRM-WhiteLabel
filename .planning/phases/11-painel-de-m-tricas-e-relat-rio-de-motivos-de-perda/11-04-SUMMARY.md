---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
plan: 04
subsystem: database
tags: [drizzle, sql-group-by, funcao-pura, relatorios, period-range, taxa-conversao]

requires:
  - phase: 11-01
    provides: "tabela motivosPerda + FK leads.motivoPerdaId + índice leads_motivo_perda_id_idx"
  - phase: 11-03
    provides: "captura real de motivoPerdaId nas 2 superfícies (dado de PERDA-01 agora existe)"
provides:
  - "src/db/queries.ts: PeriodRange (type) + resolvePeriodRange + computeTaxaConversao + buildLinhasOrigem (3 funções puras, testáveis sem banco)"
  - "src/db/queries.ts: getContagemPorOrigem + getContagemPorSubnicho + getContagemPorMotivoPerda (3 agregações SQL GROUP BY)"
  - "Filtro de período: createdAt para origem/sub-nicho (D-09), stageChangedAt para motivos de perda (D-11) — par discriminante provado por teste"
  - "resolvePeriodRange aceita string | undefined e cai em 'tudo' para qualquer valor inválido/adulterado sem lançar (T-11-19/T-11-20)"
  - "Gate permanente npm run test:relatorios (scripts/test-relatorios-queries.cjs, 38 checagens)"
affects: [11-05]

tech-stack:
  added: []
  patterns:
    - "subDays de date-fns (primeiro uso no projeto) para presets de período; startOfDay já em uso"
    - "Agregação SQL: sum(case when stage = 'fechado' then 1 else 0 end) no mesmo passo do count(*), nunca 2 queries nem .reduce() em JS"
    - "orderBy(sql`count(*) desc`, asc(coluna)) para ordenar por agregado com desempate alfabético"
    - "Teste de integração de query: banco SQLite temporário em os.tmpdir() montado por DDL cru (colunas de leads que o snapshot drizzle-kit não tem), timestamps semeados em segundos epoch"

key-files:
  created:
    - scripts/test-relatorios-queries.cjs
  modified:
    - src/db/queries.ts
    - package.json

key-decisions:
  - "getContagemPorMotivoPerda retorna motivoPerdaId: number | null (o innerJoin garante não-nulo na prática, mas Drizzle não estreita o tipo em inner join) — tipagem explícita e honesta em vez de asserção"
  - "orderBy usa sql`count(*) desc` em vez de desc(sql`count(*)`) — evita importar desc só para isso; asc(nome) como desempate"
  - "buildLinhasOrigem é chamada pela página sobre o array cru de getContagemPorOrigem; o teste também exercita essa composição (resultado real → 2 linhas fixas)"
  - "Teste de integração monta o schema por DDL cru (não replay das migrations 0000+0001) — só as 3 tabelas e as colunas que as queries tocam, mais leve e autocontido; mesmo débito de snapshot já documentado em test-lead-actions.cjs"

requirements-completed: [METRICAS-01, METRICAS-02, PERDA-01]

duration: ~25min
completed: 2026-08-27
---

# Fase 11 Plano 04: Camada de Dados do Painel de Relatórios Summary

**As 6 funções que alimentam `/relatorios` em `src/db/queries.ts`: três puras (resolução do preset de período com fallback seguro, taxa de conversão sem NaN, montagem das 2 linhas fixas de origem) e três agregações SQL `GROUP BY` (contagem/fechados por origem e por sub-nicho filtrando `createdAt` conforme D-09; contagem de perdidos por motivo filtrando `stageChangedAt` conforme D-11), todas provadas por `npm run test:relatorios` (38 checagens, incluindo o par discriminante de D-11) antes de existir qualquer pixel da tela.**

## Performance

- **Duração:** ~25 min
- **Tasks:** 3
- **Arquivos:** 3 (1 criado, 2 modificados)

## Accomplishments

- **Funções puras (Task 1, `1193dea`):**
  - `type PeriodRange = { start: Date; end: Date }`.
  - `resolvePeriodRange(preset: string | undefined, now = new Date())` — `"90d"`/`"30d"` recuam `subDays(startOfDay(now), N)`; **qualquer outro valor** (`undefined`, `"tudo"`, string adulterada, payload de SQLi) cai silenciosamente em `{ start: new Date(0), end: now }`. Sem `throw`. Doc-comment registra as duas distinções obrigatórias (parâmetro `string | undefined` de propósito = mitigação T-11-19/T-11-20; default de primeiro acesso `"30d"` mora na UI, não aqui).
  - `computeTaxaConversao({ total, fechados })` — comparação explícita `total === 0` → `0` antes da divisão (Pitfall 3); doc-comment cita D-06 (denominador = total, nunca `fechados/(fechados+perdidos)`).
  - `buildLinhasOrigem(rows)` — SEMPRE 2 linhas fixas na ordem `inbound` ("Inbound") → `outbound` ("Outbound"), preenchendo 0 quando o `GROUP BY` omite a origem, `taxa` via `computeTaxaConversao`. Doc-comment cita 11-UI-SPEC.md linha 167.
  - `subDays` importado de `date-fns` (primeiro uso no projeto; mesmo pacote já instalado).
- **Agregações SQL (Task 2, `ac6acea`):**
  - `getContagemPorOrigem(range)` — `count(*)` + `sum(case when stage = 'fechado' ...)` no mesmo passo, `groupBy(origemTipo)`, `where` com `isNull(deletedAt)` + `gte/lte(createdAt, ...)` (D-09).
  - `getContagemPorSubnicho(range)` — `innerJoin(subnichos)`, `groupBy(subnichoId, subnichos.nome)`, mesmo filtro por `createdAt`, `orderBy` total DESC + nome ASC. Comentário-âncora citando D-12 ("A categorizar" é linha normal, sem filtro por nome). Sem filtro de `subnichos.deletedAt` (sub-nicho removido com leads históricos continua aparecendo).
  - `getContagemPorMotivoPerda(range)` — `innerJoin(motivosPerda)`, `where` com `eq(stage, "perdido")` + `gte/lte(stageChangedAt, ...)`, `orderBy` total DESC + nome ASC. **Comentário-âncora extenso citando D-11**: única das três que filtra por `stageChangedAt`; registra as 2 consequências deliberadas (leads perdidos com `stageChangedAt` nulo ficam de fora inclusive de "tudo"; `innerJoin` exclui perdidos sem `motivoPerdaId`).
  - Imports adicionados: `gte`, `lte` de `drizzle-orm`; `motivosPerda`, `subnichos` de `@/db/schema`.
- **Script de teste (Task 3, `dddbb36`):** `scripts/test-relatorios-queries.cjs`, registrado como `npm run test:relatorios`. 38 checagens:
  - PARTE A (sem banco): `computeTaxaConversao({0,0}) === 0` e não-NaN; `{4,1} → 0.25`; `{3,3} → 1`; `resolvePeriodRange` 30d/90d com `now` fixo injetado (start/end exatos); `"tudo"`/`undefined`/payload adulterado → start no epoch 0 sem lançar; `buildLinhasOrigem([])` e `buildLinhasOrigem([outbound])`.
  - PARTE B (banco SQLite temporário em `os.tmpdir()`, DDL cru): 14 leads de cenário. Cobre lead na Lixeira excluído das 3 contagens (T-11-21); recorte por `createdAt` (lead fora do período não conta); "A categorizar" como linha normal ordenada por total (D-12); sub-nicho e motivo soft-deletados com leads históricos ainda aparecem; **par discriminante D-11**: lead criado há 200d + perdido ontem APARECE no recorte de 30d; lead criado ontem + perdido há 200d NÃO aparece.

## Task Commits

1. **Task 1 — funções puras** — `1193dea` (feat)
2. **Task 2 — 3 agregações SQL GROUP BY** — `ac6acea` (feat)
3. **Task 3 — script test:relatorios** — `dddbb36` (test)

**Metadados do plano:** (este commit)

## Deviations from Plan

Nenhum desvio de comportamento. Duas divergências pontuais de implementação, ambas dentro da discrição do plano:

1. **`orderBy` usa `sql\`count(*) desc\`` em vez de `desc(sql\`count(*)\`)`** — o `desc` de `drizzle-orm` chegou a ser importado e foi removido (evita import só para isso; `eslint` acusaria `no-unused-vars`). Resultado SQL idêntico. Desempate `asc(nome)` mantido como o plano pede.
2. **`getContagemPorMotivoPerda` tipa o retorno como `motivoPerdaId: number | null`** — o `innerJoin` garante não-nulo na prática, mas o Drizzle não estreita o tipo da coluna da tabela-base em inner join (só em left join). Tipagem explícita e honesta em vez de asserção `!` ou cast. O consumidor (11-05) usa `nome`/`total`, não o id.

### Verificação do critério de mutação (Task 3)

O critério de aceitação pede provar que trocar `leads.stageChangedAt` por `leads.createdAt` em `getContagemPorMotivoPerda` faz `npm run test:relatorios` sair com código 1. Verificado por mutação transitória do arquivo real (`perl -pi` nas 2 linhas `gte/lte`), execução (`exit 1` — o par discriminante de D-11 acusou), e restauração imediata via `git checkout -- src/db/queries.ts` (`exit 0` de novo). O arquivo real ficou mutado por ~1s dentro de uma única sequência de comandos, nunca commitado. A instrução literal do plano pedia cópia em `os.tmpdir()`; optei pela mutação-e-revert do arquivo real porque `queries.ts` importa `@/db/client`/`@/db/schema`/`date-fns` por caminho relativo/alias que não resolvem de fora de `src/` — a cópia em `os.tmpdir()` não roda. Nenhum script de mutação permanente foi criado (o plano não pede um registrado em `package.json`).

## Issues Encountered

- `npx eslint scripts/test-relatorios-queries.cjs` acusa `@typescript-eslint/no-require-imports` (6×) — convenção pré-existente do projeto: nenhum script `.cjs` de `scripts/` é lintado (todos usam `require()`; `test-lead-actions.cjs`/`test-motivo-perda-actions.cjs` idênticos). Fora de escopo. O `<verify>` da Task 3 não roda eslint no script.

## Known Stubs

Nenhum. As 6 funções são totalmente ligadas ao schema real; o teste exercita as 3 agregações contra SQL de verdade num banco isolado. A tela `/relatorios` que consome estas funções é o plano 11-05.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. T-11-19 (DoS por `period` inválido) e T-11-20 (SQLi via `period`) mitigados por `resolvePeriodRange` aceitar `string | undefined` sem `throw` e converter para `Date` antes de virar parâmetro do Drizzle — caso de teste dedicado com payload adulterado. T-11-21 (agregação expondo Lixeira) mitigado por `isNull(leads.deletedAt)` nas 3 queries — caso de teste dedicado.

## Gates (exit codes)

| Gate | Exit |
|------|------|
| `npx tsc --noEmit` | 0 |
| `npx eslint src/db/queries.ts` | 0 |
| `npm run test:relatorios` | 0 (38 checagens) |
| `npm run test:compute-sequencia` (regressão — `queries.ts` foi tocado) | 0 |
| `npm run guard:no-hard-delete` | 0 |
| `npm run verify:schema` | 0 |

Teste de mutação D-11: `npm run test:relatorios` → exit 1 sob a mutação `stageChangedAt`→`createdAt`, exit 0 após revert.

`npm run build` não rodado (host 4GB RAM; `npx tsc --noEmit` isolado é o gate de tipos, precedente Fases 06–10).

## Next Phase Readiness

- **11-05** pode montar `src/app/relatorios/page.tsx` (Server Component) chamando `resolvePeriodRange(searchParams.period)` e as 3 agregações em `Promise.all`, e `buildLinhasOrigem` sobre o resultado de `getContagemPorOrigem`. Formatação de porcentagem (`Math.round(taxa * 100)%`) e renderização das tabelas são responsabilidade da página — as funções devolvem números crus.
- `PeriodoSelector` (11-05) implementa o default de primeiro acesso `"30d"` no cliente; `resolvePeriodRange` já cobre o fallback de valor inválido (`"tudo"`).

## Self-Check: PASSED

- `scripts/test-relatorios-queries.cjs` confirmado em disco; `src/db/queries.ts` contém `resolvePeriodRange`/`computeTaxaConversao`/`buildLinhasOrigem`/`getContagemPorOrigem`/`getContagemPorSubnicho`/`getContagemPorMotivoPerda`
- Commits `1193dea`, `ac6acea`, `dddbb36` confirmados em `git log`
- `npx tsc --noEmit` exit 0; `npm run test:relatorios` exit 0

---
*Phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda*
*Completed: 2026-08-27*
