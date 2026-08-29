# Phase 11: Painel de Métricas e Relatório de Motivos de Perda - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Uma nova tela `/relatorios` de leitura única onde o admin vê, sem cruzar dados manualmente:
1. Contagem e taxa de conversão de leads por tipo de origem (Inbound/Outbound) — METRICAS-01
2. Contagem de leads por sub-nicho — METRICAS-02
3. Contagem de leads perdidos por motivo de perda — PERDA-01

Inclui, como pré-requisito para PERDA-01 não fragmentar o relatório, a governança do campo `motivoPerda` (hoje texto livre sem nenhum registro real) — vira uma lista extensível, seguindo o mesmo padrão já usado por sub-nichos.

**Fora do escopo desta fase:** dashboard de BI com gráficos avançados/drill-down (REQUIREMENTS.md — só tabela/números); qualquer automação ou ação a partir dos números (a tela é só leitura).

</domain>

<decisions>
## Implementation Decisions

### Governança de motivoPerda
- **D-01:** `motivoPerda` vira uma lista governada extensível — mesmo padrão de `subnichos` (tabela própria, soft-delete reversível, sem hard-delete). Não é normalização leve sobre texto livre nem um enum fixo no schema.
- **D-02:** A lista vem com valores padrão pré-cadastrados desde a migração (não há nenhum lead perdido real hoje para derivar a lista): **Preço, Sem retorno do lead, Concorrente, Sem verba/orçamento, Timing (não é prioridade agora), Outro**. O admin pode editar/adicionar/remover livremente depois — esses são só o ponto de partida.
- **D-03:** Novo motivo pode ser criado na hora, ao mover um lead para "Perdido" — mesmo comportamento de `createSubnicho` (nome novo digitado vira registro novo automaticamente, sem tela separada obrigatória para cadastrar antes de usar).
- **D-04:** O campo Motivo da perda passa a ser **obrigatório** ao mover um lead para "Perdido" (muda o comportamento atual — D-03 da Fase 3 tinha o campo opcional). Sem isso, o relatório teria uma fatia grande de "sem motivo" e perderia utilidade.
- **D-05:** Existe uma tela de gestão dedicada `/motivos-perda`, espelhando `/subnichos` — permite renomear/remover motivos depois de criados, mesmo fluxo de soft-delete reversível já usado em sub-nichos.

### Definição de "taxa de conversão" (METRICAS-01)
- **D-06:** Taxa de conversão por origem = `fechados ÷ total de leads daquela origem` (inclui leads ainda em aberto no denominador — mostra o funil completo, não só os já decididos). Não é `fechados ÷ (fechados + perdidos)`.
- **D-07:** A taxa de conversão **respeita o filtro de período** selecionado (D-08 abaixo), mesmo sabendo que isso pode subestimar a taxa perto do "agora" (lead recém-criado ainda não teve tempo de fechar). Consistência com o resto da tela pesou mais que evitar esse efeito — é um comportamento esperado, não um bug.

### Filtro de período
- **D-08:** A tela tem filtro de período (decisão ativa do usuário, contra a recomendação inicial de "sem filtro por enquanto" dado o volume atual pequeno — 23 leads reais).
- **D-09:** O filtro do painel geral (origem + sub-nicho + taxa de conversão) é baseado em `leads.createdAt` (quando o lead entrou no funil), não em `stageChangedAt`.
- **D-10:** Presets do seletor: **Últimos 30 dias / Últimos 90 dias / Tudo**. Não é "mês atual / mês anterior".
- **D-11:** **Exceção:** a seção de Motivos de Perda filtra por `stageChangedAt` (quando o lead foi movido para "Perdido"), não por `createdAt` — "motivos de perda dos últimos 30 dias" precisa significar leads perdidos nesse período, não leads criados nesse período que por acaso foram perdidos depois. As demais seções (origem, sub-nicho, conversão) usam `createdAt` uniformemente (D-09).

### Sub-nicho "A categorizar" no agrupamento
- **D-12:** No agrupamento por sub-nicho (METRICAS-02), "A categorizar" aparece como um grupo normal na tabela/lista, misturado com os sub-nichos reais de negócio — não é escondido nem destacado à parte. Dá visibilidade real do backlog de categorização pendente (hoje 21 dos 23 leads reais estão nesse estado).

### Claude's Discretion
- Shape exato da nova tabela `motivos_perda` (colunas, índices) — mesmo padrão estrutural de `subnichos` (`src/db/schema.ts`), decisão técnica do planner.
- Layout visual exato da tela `/relatorios` (cards lado a lado vs. seções empilhadas, tipografia, cores) — "UI hint: yes" no ROADMAP.md indica que isso deve passar por `/gsd-ui-phase` separadamente; este CONTEXT.md fixa as decisões de DADO/lógica, não pixel-level.
- Se o seletor de período usa querystring (`?period=30d`) ou estado client-side puro — decisão técnica do planner, sem preferência de produto manifestada.
- Exato texto/copy dos rótulos na tela (ex: "Taxa de conversão" vs "% convertido") — segue o mesmo tom direto já usado em `/configuracoes` e `/pipeline`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Governança de listas extensíveis (padrão a replicar para motivos-perda)
- `src/db/schema.ts` — tabela `subnichos` (shape de referência: `id`, `nome`, `deletedAt`, sem hard-delete)
- `src/actions/subnicho-actions.ts` — `createSubnicho` (branch de reativação por nome duplicado soft-deletado — mesmo mecanismo a replicar para motivos de perda)
- `src/app/subnichos/subnicho-manager.tsx`, `src/app/subnichos/delete-subnicho-dialog.tsx` — UI de gestão de referência para a nova tela `/motivos-perda`
- `src/components/subnicho-combobox.tsx` — combobox de referência (⚠ ver Nota de Bug abaixo)

### Requisitos e rastreabilidade
- `.planning/REQUIREMENTS.md` §Painel de Métricas / §Relatório de Motivos de Perda — METRICAS-01, METRICAS-02, PERDA-01, nota sobre governança de `motivoPerda` adiada explicitamente para esta fase
- `.planning/ROADMAP.md` §Phase 11 — Success Criteria, `Depends on: Phase 8` (origemTipo já populado)
- `.planning/PROJECT.md` §Constraints — nomenclatura de schema genérica (nunca termos específicos de saúde), §Out of Scope — dashboard de BI completo fora de escopo

### Bug conhecido (não bloqueante, mas relevante se `/motivos-perda` reusar o padrão do combobox)
- `.planning/debug/resolved/subnicho-combobox-vazio.md` — causa raiz era dado (sub-nichos soft-deletados), não bug de componente; mas documenta a mecânica de filtro `deletedAt === null || id === value` que qualquer combobox de motivos de perda também vai precisar (evitar reintroduzir o mesmo tipo de confusão)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Padrão de tabela extensível com soft-delete (`subnichos`) — replicar integralmente para `motivos_perda`, incluindo o guard `npm run guard:no-hard-delete` que já cobre `subnichos`
- `computeSequenciaSugestao` em `src/db/queries.ts` (Fase 10) — exemplo de função pura de agregação/leitura testável isoladamente; os cálculos de métricas desta fase (contagem, conversão) devem seguir o mesmo espírito: cálculo no servidor, sem I/O desnecessário, testável via `scripts/test-*.cjs`
- `getUltimaInteracaoWhatsAppPorLead` em `src/db/queries.ts` — exemplo de agregação SQL (`GROUP BY leadId`) em vez de reduzir em JS; mesmo princípio se aplica às contagens por origem/sub-nicho/motivo desta fase

### Established Patterns
- Sem framework de teste (jest/vitest/pytest) — convenção do projeto é scripts `node scripts/*.cjs` registrados como `npm run test:*`/`verify:*`, harness `check(condition, message)` (ver Fase 10, `scripts/verify-sequencia-posicao.cjs`, `scripts/test-compute-sequencia-sugestao.cjs`)
- Migração manual de schema via `better-sqlite3` direto (não `drizzle-kit push` cru) — padrão estabelecido desde as Fases 06-01/07-01/08-01/10-01 para colunas/tabelas novas com regra de dado real
- Host de 4GB RAM — comandos de verificação sempre sequenciais, nunca em paralelo, `npm run dev` parado durante gates estáticos

### Integration Points
- `src/db/schema.ts` — nova tabela `motivos_perda` (mesmo shape de `subnichos`); `leads.motivoPerda` muda de `text` livre para FK (ou continua texto mas validado contra a lista — decisão técnica do planner)
- `src/actions/lead-actions.ts` — `updateLeadStage`/`updateLead`, onde o motivo é capturado ao mover para "Perdido", precisa do novo campo obrigatório (D-04) e do mecanismo de criação-na-hora (D-03)
- Nova rota `src/app/relatorios/page.tsx` (Server Component, cálculo server-side) + nova rota `src/app/motivos-perda/` (gestão, espelhando `/subnichos`)
- `src/components/app-sidebar.tsx` — `NAV_ITEMS` precisa de duas entradas novas: "Relatórios" e "Motivos de Perda" (não existem hoje; sidebar atual só tem Follow-ups/Leads/Importar/Pipeline/Templates/Sub-nichos/Lixeira/Configurações)

</code_context>

<specifics>
## Specific Ideas

- Lista inicial de motivos de perda definida nesta discussão (D-02): Preço, Sem retorno do lead, Concorrente, Sem verba/orçamento, Timing (não é prioridade agora), Outro — usar exatamente esses rótulos como seed inicial.
- Dados reais atuais (2026-08-13, para dimensionar a fase): 23 leads, todos Outbound, nenhum Fechado/Perdido ainda, 21 ainda como "A categorizar". O relatório vai nascer com números pequenos/zerados em algumas seções — isso é esperado, não um bug a "corrigir" mostrando dado fake.

</specifics>

<deferred>
## Deferred Ideas

- Taxa de conversão por sub-nicho (hoje METRICAS-02 pede só contagem, não taxa) — considerado durante a discussão da área "Taxa de conversão", mas o usuário optou por não expandir o escopo agora. Pode virar um requisito de fase futura se fizer falta na prática.

### Reviewed Todos (not folded)
None — discussão não cruzou com outros todos pendentes fora do escopo já mapeado em REQUIREMENTS.md.

</deferred>

---

*Phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda*
*Context gathered: 2026-08-13*
