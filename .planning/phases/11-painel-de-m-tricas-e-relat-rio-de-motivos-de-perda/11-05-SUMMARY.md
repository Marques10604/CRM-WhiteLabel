---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
plan: 05
subsystem: ui
tags: [next-app-router, search-params, server-component, relatorios, querystring, select]

requires:
  - phase: 11-02
    provides: "item 'Motivos de Perda' no menu lateral (padrão de NAV_ITEMS); revalidatePath('/relatorios') já disparado por mutações de motivo"
  - phase: 11-04
    provides: "src/db/queries.ts — resolvePeriodRange, computeTaxaConversao, buildLinhasOrigem + 3 agregações SQL GROUP BY"
provides:
  - "src/components/periodo-selector.tsx — seletor de período client por querystring (?period=30d/90d/tudo), { scroll: false }"
  - "src/app/relatorios/page.tsx — rota Server Component com as 3 seções empilhadas (origem+conversão, sub-nicho, motivos de perda)"
  - "src/components/app-sidebar.tsx — item 'Relatórios' (ícone BarChart3) entre Pipeline e Templates"
  - "Fase 11 com suíte de 11 gates automatizados + tsc verdes; human-check de fim de fase pendente (sessão headless)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Primeiro uso de searchParams no projeto: página Server Component recebe { searchParams: Promise<{ period?: string }> } e faz await (contrato App Router Next 16)"
    - "Primeiro uso de useRouter().push + useSearchParams para filtro por querystring; cópia via new URLSearchParams(searchParams), sobrescreve só a chave alvo"
    - "Normalização de preset na página: ausente -> default de UX (30d); presente-mas-inválido -> fallback seguro (tudo); política distinta documentada em comentário-âncora"
    - "<PeriodoSelector> envolvido em <Suspense> (useSearchParams) mesmo em rota dinâmica — defensivo contra de-opt de renderização"

key-files:
  created:
    - src/components/periodo-selector.tsx
    - src/app/relatorios/page.tsx
  modified:
    - src/components/app-sidebar.tsx

key-decisions:
  - "PeriodoSelector recebe value já normalizado pela página e NÃO decide default nem fallback nem chama resolvePeriodRange — é só o gesto de navegação (divisão servidor/cliente documentada no topo do arquivo)"
  - "Gate 'npm run verify:motivos-perda-schema' listado no PLAN.md não existe como script: a Onda 1 (11-01) decidiu ESTENDER scripts/verify-schema.cjs em vez de criar um script separado. Cobertura (tabela motivos_perda + coluna leads.motivo_perda_id + índice motivo_perda_nome_unique_idx) está dentro de 'npm run verify:schema', que passou. Nenhum script novo foi inventado nesta onda."
  - "npm run build não executado — diretriz explícita do executor sequencial (host 4GB RAM, precedente Fases 06-10); npx tsc --noEmit isolado é o gate de tipos"
  - "Suspense boundary em volta do PeriodoSelector: barato, evita qualquer aviso de useSearchParams sem boundary; a rota já é dinâmica por await searchParams"

requirements-completed: [METRICAS-01, METRICAS-02, PERDA-01]

duration: ~20min
completed: 2026-08-27
---

# Fase 11 Plano 05: Tela /relatorios e Fechamento da Fase Summary

**A superfície visível da fase: `/relatorios` (Server Component) empilha as três seções — Leads por origem + taxa de conversão (METRICAS-01), Leads por sub-nicho com "A categorizar" como linha normal (METRICAS-02, D-12), e Motivos de perda com o texto de ajuda de D-11 sempre visível (PERDA-01) — dirigida por um seletor de período por querystring (`?period=30d/90d/tudo`) que faz `router.push` sem rolar a página; item "Relatórios" no menu lateral entre Pipeline e Templates; fase fechada com 11 gates automatizados + `tsc` verdes.**

## Performance

- **Duração:** ~20 min
- **Tasks:** 3
- **Arquivos:** 3 (2 criados, 1 modificado)

## Accomplishments

- **Task 1 — `PeriodoSelector` (`8097aca`, feat):** `src/components/periodo-selector.tsx` (`"use client"`), prop `value: string` já normalizada pela página. `<div className="flex items-center gap-2">` + rótulo `Período:` (`text-[14px] text-muted-foreground`) + `<Select>` com o idioma de `lead-table-toolbar.tsx`. `ACCENT_FOCUS_RING` redeclarado localmente (mesmo literal `focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/50`, sem módulo compartilhado para 2 ocorrências). Três opções VERBATIM (D-10): `30d`→`Últimos 30 dias`, `90d`→`Últimos 90 dias`, `tudo`→`Tudo`. `onValueChange` monta `new URLSearchParams(searchParams)`, sobrescreve só `period`, navega com `useRouter().push(\`?${...}\`, { scroll: false })`. Comentário no topo registra a divisão de responsabilidade: o componente NÃO decide default/fallback e NÃO chama `resolvePeriodRange`. Sem `resolvePeriodRange` e sem default hardcoded no arquivo.
- **Task 2 — rota `/relatorios` + menu (`403642c`, feat):** `src/app/relatorios/page.tsx` como Server Component async recebendo `{ searchParams }: { searchParams: Promise<{ period?: string }> }` com `await searchParams`.
  - **Normalização do preset com comentário-âncora obrigatório:** `period === undefined` → `"30d"` (default de primeiro acesso); `period` presente fora de `{30d,90d,tudo}` → `"tudo"` (fallback seguro, nunca 500 — T-11-24). O preset normalizado alimenta `resolvePeriodRange` E a prop `value` do `<PeriodoSelector>`.
  - As 3 agregações num único `Promise.all` (`getContagemPorOrigem`, `getContagemPorSubnicho`, `getContagemPorMotivoPerda`), o mesmo `range` para as três — a diferença `createdAt`/`stageChangedAt` está encapsulada nas funções do 11-04.
  - **Layout (11-UI-SPEC.md §Layout, vinculante):** container `flex flex-col gap-6`; cabeçalho `flex items-center justify-between` com `h1` "Relatórios" (`text-[28px] font-semibold leading-tight`) e o `<PeriodoSelector>` na MESMA linha; 3 seções sempre empilhadas, cada uma `section` com `rounded-lg border border-zinc-200 bg-white p-6`, `h2` `text-[20px] font-semibold leading-tight`, `gap-4` até a tabela; tabelas com os primitivos de `@/components/ui/table`.
  - **Seção 1:** colunas `Origem`/`Total de leads`/`Fechados`/`Taxa de conversão`; linhas de `buildLinhasOrigem(...)` — SEMPRE `Inbound` antes de `Outbound`, mesmo com total 0; taxa `Math.round(taxa*100)%`, `0%` quando total 0 (nunca `NaN%`); célula de taxa em `font-semibold` (ênfase por peso, nunca por cor); ambas as origens com total 0 → `Nenhum lead neste período.` numa linha `colSpan={4}`.
  - **Seção 2:** colunas `Sub-nicho`/`Total de leads`; linhas já ordenadas pela query; nenhum tratamento especial para "A categorizar" (D-12, literal); lista vazia → `Nenhum lead neste período.` em `text-[14px] text-muted-foreground` no lugar da tabela.
  - **Seção 3:** `h2` `Motivos de perda`; texto de ajuda de D-11 VERBATIM sempre visível abaixo do título (numa única linha física do fonte, para sobreviver a grep); colunas `Motivo da perda`/`Leads perdidos`; lista vazia → `Nenhum lead perdido neste período.`
  - **Regra de cor:** números em `text-foreground`, rótulos secundários em `text-muted-foreground`; a página NÃO contém a string `#0D9488` (verificado).
  - **`app-sidebar.tsx`:** import de `BarChart3` de `lucide-react`; entrada `{ href: "/relatorios", label: "Relatórios", icon: BarChart3 }` imediatamente após `/pipeline`. Ordem final: Follow-ups, Leads, Importar, Pipeline, Relatórios, Templates, Sub-nichos, Motivos de Perda, Lixeira, Configurações. Nenhuma outra mudança.
- **Task 3 — suíte de gates da fase:** 11 gates automatizados + `tsc`, todos exit 0 (tabela abaixo). Human-check de 12 passos registrado como pendência de fim de fase (sessão headless, sem navegador).

## Task Commits

1. **Task 1 — PeriodoSelector** — `8097aca` (feat)
2. **Task 2 — tela /relatorios + item no menu** — `403642c` (feat)
3. **Task 3 — gates + SUMMARY** — (este commit de docs)

## Deviations from Plan

### Auto-fixed / esclarecimentos

**1. [Rule 3 - Blocking] Gate `npm run verify:motivos-perda-schema` não existe**
- **Encontrado em:** Task 3 (execução da suíte de 12 gates)
- **Issue:** O PLAN.md lista `npm run verify:motivos-perda-schema` como gate #3. Esse script (`scripts/verify-motivos-perda-schema.cjs`) nunca foi criado — a Onda 1 (11-01-SUMMARY, STATE.md) decidiu **estender `scripts/verify-schema.cjs`** em vez de criar um script dedicado.
- **Fix:** Nenhum script novo inventado (seria fora de escopo e contra a decisão da Onda 1). A cobertura equivalente — presença da tabela `motivos_perda`, da coluna `leads.motivo_perda_id` e do índice `motivo_perda_nome_unique_idx` — está dentro de `npm run verify:schema` (gate #2), que rodou e passou (exit 0). Os 11 gates restantes foram executados normalmente.
- **Arquivos modificados:** nenhum.
- **Commit:** n/a.

**2. [Diretriz do executor] `npm run build` não executado**
- **Motivo:** Instrução explícita do executor sequencial (host 4GB RAM — precedente Fases 06-10 e Fase 10-04, que registrou 3 tentativas de `next build` mortas por OOM na fase "Running TypeScript"). `npx tsc --noEmit` isolado passou limpo e é o gate de tipos.
- **Classificação:** pendência de infraestrutura, não defeito de código.

**3. [Discrição do plano] `<Suspense>` em volta do `<PeriodoSelector>`**
- `useSearchParams` num Client Component pede boundary de Suspense. A rota já é dinâmica (`await searchParams`), então não há risco real de de-opt, mas o wrapper `<Suspense fallback={null}>` é barato e elimina qualquer aviso. Documentado com comentário.

**Total:** 0 desvios de comportamento. 3 esclarecimentos, nenhum toca lógica de produto.

## Gates (exit codes)

| # | Gate | Exit |
|---|------|------|
| 1 | `npm run guard:no-hard-delete` | 0 |
| 2 | `npm run verify:schema` | 0 |
| 3 | `npm run verify:motivos-perda-schema` | N/A — script inexistente; cobertura dentro do gate #2 (decisão 11-01) |
| 4 | `npm run verify:origem-tipo` | 0 |
| 5 | `npm run verify:sequencia` | 0 |
| 6 | `npm run verify:motivo-perda` | 0 |
| 7 | `npm run test:lead-actions` | 0 |
| 8 | `npm run test:interacao-actions` | 0 |
| 9 | `npm run test:motivo-perda-actions` | 0 (7 casos) |
| 10 | `npm run test:compute-sequencia` | 0 |
| 11 | `npm run test:relatorios` | 0 (38 checagens) |
| 12 | `npx tsc --noEmit` | 0 |
| — | `npx eslint` (periodo-selector.tsx, relatorios/page.tsx, app-sidebar.tsx) | 0 |
| — | `npm run build` | não executado (diretriz executor sequencial, host 4GB RAM — pendência de infraestrutura, não defeito) |

## Human-check (fim de fase — PENDENTE)

`workflow.human_verify_mode: end-of-phase` e sessão headless (sem navegador) — os 12 passos do `<human-check>` da Task 3 NÃO foram executados. Mesmo caveat recorrente do projeto (Fases 01-10). Passos a validar no navegador antes de `/gsd-verify-work`:

1. `npm run dev` + abrir `http://localhost:3000/relatorios`
2. "Relatórios" no menu entre "Pipeline" e "Templates", em teal quando ativo
3. Sem `?period`, o seletor mostra "Últimos 30 dias"
4. As 3 seções empilhadas, cada uma em card branco com borda
5. Seção "Leads por origem": DUAS linhas (Inbound + Outbound) mesmo com Inbound zerado; taxa "0%" (nunca "NaN%")
6. Seção "Leads por sub-nicho": "A categorizar" como linha normal, ordenada por total decrescente
7. Seção "Motivos de perda": texto de ajuda visível citando a data de movimentação para Perdido
8. Trocar para "Últimos 90 dias" → URL `?period=90d`, números atualizam, página não rola ao topo
9. Trocar para "Tudo" → URL `?period=tudo`, números atualizam
10. `http://localhost:3000/relatorios?period=xyz` digitado na barra → carrega normal (sem 500), recorte "Tudo"
11. Mover um lead para "Perdido" com motivo "Preço" no /pipeline → voltar a /relatorios "Tudo" → linha "Preço" com contagem 1 na Seção 3
12. Nenhum número/rótulo das tabelas em teal — só item ativo do menu e anel de foco do seletor

**Nota:** o par discriminante de D-11 (passo 11) e o fallback de valor inválido (passo 10) já têm cobertura automatizada em `npm run test:relatorios` (38 checagens, plano 11-04).

## Requisitos da fase

| Requisito | Artefato que satisfaz |
|-----------|-----------------------|
| METRICAS-01 (contagem + taxa de conversão por origem) | `src/app/relatorios/page.tsx` Seção 1 (`buildLinhasOrigem` + `getContagemPorOrigem`, taxa `font-semibold`) |
| METRICAS-02 (contagem por sub-nicho) | `src/app/relatorios/page.tsx` Seção 2 (`getContagemPorSubnicho`, "A categorizar" linha normal — D-12) |
| PERDA-01 (contagem de perdidos por motivo) | `src/app/relatorios/page.tsx` Seção 3 (`getContagemPorMotivoPerda`, texto de ajuda D-11) + tela `/motivos-perda` (11-02) + captura obrigatória (11-03) + camada de dados (11-04) |

## Known Stubs

Nenhum. As três seções renderizam dados reais das 6 funções de `queries.ts` (11-04), provadas por `npm run test:relatorios`. Com os dados reais de hoje (37 leads no banco, `inbound=1`/`outbound=36`, nenhum perdido) a Seção 3 nasce vazia mostrando "Nenhum lead perdido neste período." — comportamento esperado (11-CONTEXT.md §Specific Ideas), não stub.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. T-11-24 (DoS por `?period=` adulterado) mitigado em dupla barreira: normalização na página (`PRESETS_VALIDOS` → fallback `"tudo"`) + fallback interno de `resolvePeriodRange`. T-11-25 (XSS via nome de sub-nicho/motivo) — React escapa por padrão, zero `dangerouslySetInnerHTML`. T-11-27 (ação destrutiva a partir do relatório) — página é somente-leitura, nenhum import de `@/actions/` em `relatorios/page.tsx` (verificado).

## Self-Check: PASSED

- `src/components/periodo-selector.tsx` e `src/app/relatorios/page.tsx` confirmados em disco; `src/components/app-sidebar.tsx` contém `/relatorios` + `BarChart3` na posição correta
- Commits `8097aca` e `403642c` confirmados em `git log`
- `npx tsc --noEmit` exit 0; 11 gates automatizados exit 0; `npx eslint` escopado exit 0

---
*Phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda*
*Completed: 2026-08-27*
