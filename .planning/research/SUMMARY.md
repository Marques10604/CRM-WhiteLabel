# Project Research Summary

**Project:** CRM de Leads — Área da Saúde (milestone v1.3 "Qualificação e Histórico de Leads")
**Domain:** CRM solo (single-admin), integração de 6 features novas sobre app Next.js 16/Drizzle/SQLite já em produção
**Researched:** 2026-08-01
**Confidence:** HIGH (com uma divergência interna entre pesquisas que precisa de decisão explícita — ver Gaps)

## Executive Summary

Este milestone não é adoção de tecnologia nova — é integração de 6 features (governança de origem/Inbound×Outbound, timeline de interações, sequência de follow-up escalonada, painel de métricas, relatório de motivos de perda, agenda de tarefas soltas) sobre uma arquitetura já validada em produção (Next.js 16 + Server Actions + Drizzle + SQLite/WAL, um único admin, sem cron/scheduler, sem deploy público). A pesquisa de stack confirma que **quase nenhum pacote novo é necessário**: `Drizzle` já resolve `GROUP BY`/`COUNT` para as agregações, `react-hook-form` já tem `useFieldArray` para a sequência escalonada, e uma lib de gráfico (`recharts` via `shadcn add chart`) é opcional e adiável — tabela + barra de CSS já cobre o painel de métricas no volume deste projeto (alguns milhares de leads).

A recomendação central, confirmada por três das quatro pesquisas (Features, Architecture, Pitfalls) e pela leitura direta dos dados reais em `data/crm.db`, é: **nenhuma automação nova pode inferir comportamento a partir de texto livre** (`origem`, `motivoPerda` hoje têm valores reais sujos e inconsistentes — `"Importação CSV"`, `"Teste"`, `"insta"`), e **nenhuma feature pode assumir um processo rodando em background** — o único padrão de "automação" já validado neste app é "computa na leitura, nunca agenda" (o mesmo usado pelo badge "esfriando" da Fase 7), e a sequência de follow-up escalonada deve copiar esse padrão, não inventar um scheduler. O risco técnico mais concreto é o retrofit de `origem`/`motivoPerda` contra dados reais existentes via `drizzle-kit push` (sem migration history versionado) — requer backfill explícito e backup do `.db` antes de rodar.

**Divergência importante entre pesquisas** (ver Gaps): STACK.md e FEATURES.md recomendam substituir `leads.origem` por uma tabela governada `origens` (nome + tipo inbound/outbound, FK em `leads`); ARCHITECTURE.md e PITFALLS.md recomendam manter `origem` como texto livre (usado como variável `{origem}` em templates) e adicionar uma coluna nova `origemTipo` (enum fechado) em paralelo. Este é o ponto de maior risco de retrabalho do milestone e deve ser resolvido como primeira decisão da Fase 1, antes de qualquer schema change.

## Key Findings

### Recommended Stack

Stack já instalada é suficiente para as 6 features. Não há pacote novo obrigatório — cada feature é um novo padrão de schema (tabela ou coluna) + Server Action + query, reaproveitando Drizzle/Zod/RHF/date-fns/shadcn já em uso. A única dependência nova candidata é uma lib de gráfico, e a recomendação explícita é não instalá-la no MVP.

**Core technologies (já instaladas, sem mudança):**
- Drizzle ORM (`count()`, `.groupBy()`) — agregações do painel de métricas e relatório de motivos de perda, sem lib de "BI" separada
- react-hook-form (`useFieldArray`) — editor de N passos da sequência de follow-up escalonada
- Zod — validação de todos os novos formulários/Server Actions, mesmo padrão já usado
- date-fns — cálculo de "próximo follow-up sugerido" e destaque de tarefa vencida
- better-sqlite3 + WAL (já ativo) — suporta a nova tabela `interacoes` sem necessidade de mudança de engine ou configuração

**Opcional, adiável:** `recharts` via `npx shadcn add chart` (3.10.1) — só se o admin pedir explicitamente um gráfico de tendência temporal depois de usar o painel de métricas em tabela/barra por um tempo. Há ressalva de conflito de peer dependency com React 19 (via `react-is`) — confiança MÉDIA, confirmar no momento real da instalação.

### Expected Features

**Must have (table stakes, já ausentes e sentidas hoje):**
- Campo de origem governado (dropdown, não texto livre)
- Separação Inbound × Outbound
- Timeline de interações (activity log) por lead
- Relatório de motivo de perda (campo já existe, falta agregação)
- Follow-up/tarefa avulsa com data, mesmo sem vínculo a lead

**Should have (diferenciadores, atacam o Core Value "nunca perder follow-up"):**
- Sequência de follow-up escalonada com templates de prova social (cálculo assistido de próxima data, envio continua manual via `wa.me`)
- Painel de métricas por origem × sub-nicho (taxa de conversão) — depende tecnicamente do item de origem governada

**Defer (v1.4+):**
- Temperatura derivada (quente/morno/frio) — regra determinística sobre origem+tempo parado+tentativas, sem tabela nova; adiada não por complexidade técnica, mas para validar em uso real primeiro
- Override manual de temperatura — só se a regra derivada errar com frequência perceptível

**Anti-features confirmadas para não construir:** lead scoring por IA/ML, envio automático real de sequência (sem clique), atribuição/leaderboard por vendedor (não há time), sistema de tarefas completo (subtarefas/prioridade/recorrência), cadência configurável por lead individual, dashboard de BI completo.

### Architecture Approach

Toda feature nova segue a convenção já estabelecida: mutação = Server Action em `src/actions/*.ts` (retorno `ActionState`, validação Zod, `revalidatePath`); leitura agregada/pura = função em `src/db/queries.ts`, nunca inline. Nenhuma automação nova confia em estado do cliente (sempre SELECT fresco). `deletedAt` (soft-delete) é decisão explícita por tabela, não herança automática — tabelas novas (`interacoes`, `followUpSequenciaEtapas`, `tarefas`) não recebem `deletedAt` especulativamente.

**Major components (schema novo):**
1. `interacoes` (FK `leadId`, `onDelete: cascade`) — log imutável de eventos, índice composto `(leadId, createdAt)`, auto-populado a partir de `registerWhatsAppContact` já existente
2. `followUpSequenciaEtapas` (lista ordenada global) + coluna `sequenciaPosicao` em `leads` (contador dedicado, **não** reaproveita `contactAttempts`) — cálculo síncrono de data sugerida, sem scheduler
3. `tarefas` (tabela independente, sem FK) — generaliza `groupLeadsByUrgency` para uma função `groupByUrgency<T>` reutilizável por leads e tarefas
4. Queries de agregação puras (`getMetricasPorOrigemESubnicho`, `getMotivoPerdaBreakdown`) em `src/db/queries.ts`, sem tabela materializada — `GROUP BY` direto é instantâneo nesta escala

**Coluna/campo controverso:** `origemTipo` (enum) em `leads` vs. tabela `origens` governada — ver Gaps, decisão a tomar na Fase 1.

### Critical Pitfalls

1. **Retrofit de `origem`/`origemTipo` sem backfill explícito** — dados reais já existem (`"Importação CSV"`, `"Teste"`, `"insta"` — 33 leads). `drizzle-kit push` pode forçar reconstrução de tabela e falhar sem migration history versionado. Evitar: nunca reaproveitar `origem` livre para virar enum direto; adicionar coluna nova, rodar backfill explícito com regra documentada, testar `push` contra cópia do `.db` antes do banco real.
2. **Inferir Inbound/Outbound por parsing de string** (`.includes()` sobre `origem`) em vez de campo explícito — frágil e quebra silenciosamente a cada nova variação de texto. Sempre campo governado com controle de UI explícito.
3. **Tratar a sequência de follow-up escalonada como scheduler ativo** — este app não tem cron/job runner; nada "dispara sozinho". Copiar o padrão já validado do "esfriando" (compute-on-read, ação explícita do admin dispara o recálculo).
4. **Reaproveitar `contactAttempts` como índice da sequência** — esse contador é um odômetro vitalício que nunca zera e conta qualquer clique de WhatsApp, não é semanticamente "posição na sequência de reabordagem". Precisa de campo dedicado novo.
5. **Guard `no-hard-delete` não cobre tabelas novas automaticamente** — `interacoes` e `tarefas` precisam ser adicionadas manualmente ao `scripts/guard-no-hard-delete.cjs` no mesmo commit que as cria, ou a proteção do projeto contra hard-delete fica furada sem ninguém perceber (guard passa verde mesmo com `DELETE` real no código).

## Implications for Roadmap

Estrutura de fases já sugerida pelo próprio `PROJECT.md` (ordem 1→6) é confirmada como tecnicamente razoável pela pesquisa de arquitetura, com dependências reais mapeadas abaixo.

### Phase 1: Origem governada + Separação Inbound × Outbound
**Rationale:** Fundação técnica — bloqueia o painel de métricas (item 4) e reduz retrabalho em toda automação condicional futura. Nenhuma feature depende dela tecnicamente ao contrário (é a raiz da árvore de dependências).
**Delivers:** Campo de origem confiável e filtrável; classificação inbound/outbound explícita por lead.
**Addresses:** "Campo de origem governado" e "Separação Inbound × Outbound" (table stakes, FEATURES.md).
**Avoids:** Pitfall 1 (retrofit sem backfill) e Pitfall 2 (inferência por string) — exige decisão de schema explícita ANTES de tocar no banco (ver Gaps abaixo).

### Phase 2: Timeline de interações
**Rationale:** Sem dependência técnica dura da Fase 1, mas toca a mesma superfície de código (`registerWhatsAppContact`, `LeadFormDialog`) — sequenciar logo após reduz conflito de merge/retrabalho.
**Delivers:** Log de eventos por lead (`interacoes`), auto-populado no clique de WhatsApp já existente.
**Uses:** Tabela relacional nova (nunca JSON — primeira coluna JSON quebraria a filosofia "SQL-shaped" do Drizzle já documentada no STACK.md do projeto).
**Implements:** Índice composto `(leadId, createdAt)`; guard `no-hard-delete` atualizado no mesmo commit (Pitfall 6).

### Phase 3: Sequência de follow-up escalonada
**Rationale:** Sem dependência dura de 1 ou 2, mas reaproveita o mesmo ponto de extensão em `registerWhatsAppContact` já mexido na Fase 2 — mais barato fazer em sequência. Se depois precisar diferenciar intervalo por `origemTipo`, ter a Fase 1 pronta evita segunda migração.
**Delivers:** Tabela `followUpSequenciaEtapas` (intervalos configuráveis, não hardcoded) + campo `sequenciaPosicao` dedicado em `leads` + cálculo de data sugerida em `registerWhatsAppContact`.
**Addresses:** "Sequência de follow-up escalonada com templates de prova social" (diferenciador, FEATURES.md) — `templates.tipo` já inclui `"prova_valor"`, infraestrutura parcial pronta.
**Avoids:** Pitfall 3 (tratar como scheduler ativo) e Pitfall 4 (reaproveitar `contactAttempts`).

### Phase 4: Painel de métricas por origem e sub-nicho
**Rationale:** Depende tecnicamente da Fase 1 (precisa da coluna/campo de classificação existir e populado). Depende "de confiança do dado" (não tecnicamente) da Fase 2.
**Delivers:** Queries de agregação puras (`GROUP BY`) + página `/relatorios` com tabela/barras CSS, sem lib de gráfico no MVP.
**Uses:** `Drizzle count()`/`.groupBy()` já instalado; nenhuma tabela materializada.
**Avoids:** Pitfall 7 (N+1 por loop em vez de `GROUP BY` único; esquecer filtro `isNull(deletedAt)`).

### Phase 5: Relatório de motivos de perda
**Rationale:** Sem dependência técnica de nada novo (`motivoPerda` existe desde a Fase 3 do produto) — sequenciado junto da Fase 4 por reuso de infraestrutura de página/rota (`/relatorios`), não por bloqueio de dado.
**Delivers:** Agregação por `motivoPerda`, com decisão explícita de governança do campo (mesma classe de problema do `origem` — texto livre já fragmentado).
**Addresses:** "Relatório de motivo de perda" (table stakes, FEATURES.md).
**Avoids:** Pitfall 3 alternativo — relatório sobre campo ainda texto livre; decidir governar (enum + "Outro") ou pelo menos normalizar (`trim`+`lower`) antes de considerar a fase concluída.

### Phase 6: Agenda / tarefas soltas
**Rationale:** Totalmente desacoplada das outras 5 (tabela nova sem FK para `leads`) — poderia ser adiantada para qualquer posição sem risco técnico. Mantida por último por ser a prioridade de negócio mais baixa declarada, não por dependência.
**Delivers:** Tabela `tarefas` independente + generalização de `groupLeadsByUrgency` em `groupByUrgency<T>` reutilizável + nova seção no dashboard de follow-up.
**Addresses:** "Follow-up/tarefa com data e lembrete" (table stakes, FEATURES.md).
**Avoids:** Pitfall 6 (guard não cobrindo tabela nova) — mesmo cuidado da Fase 2.

### Phase Ordering Rationale

- Ordem 1→6 já definida no `PROJECT.md` é confirmada pela análise de dependência técnica em ARCHITECTURE.md: só a Fase 4 tem bloqueio técnico duro (da Fase 1); as demais são sequenciadas por reuso de código/infraestrutura, não por dependência de dado.
- Fases 2 e 3 compartilham o mesmo ponto de extensão (`registerWhatsAppContact`) — fazer em sequência evita duas rodadas de edição no mesmo arquivo.
- Fases 4 e 5 compartilham infraestrutura de página (`/relatorios`) — mesmo lote evita dois shells de página separados.
- Fase 6 é a única verdadeiramente independente e poderia ser um "quick win" isolado em qualquer ponto do roadmap, se o usuário preferir.
- Todas as fases que tocam texto livre existente (`origem` na Fase 1, `motivoPerda` na Fase 5) exigem backup do `data/crm.db` antes de qualquer `drizzle-kit push` que altere a tabela `leads`.

### Research Flags

Phases likely needing deeper research/discussão durante o planejamento:
- **Phase 1:** Precisa resolver a divergência de schema entre pesquisas (tabela `origens` governada vs. coluna `origemTipo` + `origem` mantido livre) antes de qualquer código — ver Gaps. Recomenda-se `/gsd-discuss-phase` nesta fase especificamente para essa decisão.
- **Phase 3:** Decisão de produto em aberto sobre quando resetar `sequenciaPosicao` (ao fechar/perder lead é óbvio; ao voltar para "novo" é discutível) — sinalizado por ARCHITECTURE.md como pergunta a resolver em discussão de fase, não travar em pesquisa.
- **Phase 5:** Decisão de governar (enum) ou apenas normalizar `motivoPerda` — mesma classe de problema da Fase 1, mas de menor risco técnico (campo nullable, sem uso em template).

Phases with standard patterns (skip research-phase):
- **Phase 2:** Padrão de tabela relacional com FK + índice composto já usado em todo o schema do projeto — bem documentado em ARCHITECTURE.md.
- **Phase 4:** `GROUP BY`/`count()` do Drizzle é uso padrão do query builder já instalado — sem incerteza técnica.
- **Phase 6:** Tabela independente sem FK, mesmo padrão de `configuracoes`/`templates` — trivial.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Baseado em leitura direta do código-fonte do projeto + npm registry ao vivo; nenhuma tecnologia nova sendo adotada, apenas uso estendido do que já está instalado |
| Features | MEDIUM-HIGH | Padrões de mercado de CRM bem estabelecidos e convergentes entre múltiplas fontes (WebSearch); nenhuma feature é exótica, a decisão real é dimensionamento para 1 usuário |
| Architecture | HIGH (com ressalva) | Leitura direta do código-fonte atual — mas ver Gaps: conflito interno com STACK.md sobre a abordagem de `origem`/Inbound×Outbound não foi resolvido, precisa de decisão explícita antes da Fase 1 |
| Pitfalls | HIGH | Achados verificados diretamente no código-fonte E nos dados reais de `data/crm.db` (não pesquisa genérica) — inclui query real confirmando os 3 valores sujos de `origem` |

**Overall confidence:** HIGH, condicionado à resolução do gap de schema abaixo antes do início da Fase 1.

### Gaps to Address

- **Conflito STACK/FEATURES vs. ARCHITECTURE/PITFALLS sobre modelagem de origem/Inbound×Outbound:** STACK.md e FEATURES.md recomendam uma tabela governada `origens` (nome + tipo inbound/outbound), substituindo `leads.origem` por uma FK (`origemId`). ARCHITECTURE.md e PITFALLS.md recomendam manter `leads.origem` como texto livre (preserva a variável de personalização `{origem}` em templates, já em uso) e adicionar uma coluna paralela `origemTipo` (enum fechado, dicotomia de negócio, não lista aberta). **Como tratar:** resolver explicitamente no início da Fase 1, antes de qualquer schema change — a leitura de ARCHITECTURE.md é mais recente e considera um ponto técnico concreto (personalização de template) que STACK.md/FEATURES.md não abordaram; recomenda-se usar essa decisão como ponto de partida da discussão de fase, mas validar com o usuário se a granularidade de origem específica (ex. "Instagram Ads" vs. apenas "inbound") é um requisito real antes de descartar a tabela `origens`.
- **Governança de `motivoPerda`:** ambas STACK.md e FEATURES.md sugerem promover para tabela governada "se o texto livre mostrar fragmentação real" — decisão adiável, mas deve ser tomada explicitamente na Fase 5, não assumida.
- **Compatibilidade `recharts` 3.x com React 19:** relatos de conflito de peer dependency via `react-is` (confiança MÉDIA-BAIXA, fontes de comunidade não oficiais) — só relevante se/quando o painel de métricas evoluir para gráfico visual; confirmar com instalação real, não travar decisão agora.
- **Reset de `sequenciaPosicao`:** comportamento em aberto (fechar/perder lead vs. voltar para "novo") — resolver em discussão de fase 3, não pesquisa adicional.
- **Decisão de soft-delete por tabela nova** (`interacoes`, `followUpSequenciaEtapas`, `tarefas`): ARCHITECTURE.md recomenda não adicionar `deletedAt` especulativamente (YAGNI); PITFALLS.md reforça que essa decisão precisa ser explícita e documentada (tipo D-XX) por tabela, com guard `no-hard-delete` atualizado no mesmo commit — tratar como checklist obrigatório em cada fase que cria tabela nova.

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte do projeto: `src/db/schema.ts`, `src/db/client.ts`, `src/db/queries.ts`, `src/actions/lead-actions.ts`, `src/lib/validations.ts`, `src/lib/csv-import.ts`, `src/lib/whatsapp.ts`, `src/components/*`, `scripts/guard-no-hard-delete.cjs`
- Query direta contra `data/crm.db` via `better-sqlite3` (`SELECT origem, COUNT(*) FROM leads GROUP BY origem`) — dado real, não hipotético
- `.planning/PROJECT.md` e `.planning/todos/pending/*.md` — requisitos e decisões já validadas pelo usuário
- npm registry (versões ao vivo) — HIGH confidence para todas as versões citadas no STACK.md
- [ui.shadcn.com/docs/components/chart](https://ui.shadcn.com/docs/components/chart) — confirma Recharts sob o `shadcn add chart`

### Secondary (MEDIUM confidence)
- WebSearch convergente sobre "Lead Source field deve ser dropdown, não texto livre" e "Loss Reason field controlled picklist" (nimble.com, default.com, onepagecrm.com, capsulecrm.com) — base da recomendação de governar `origem`/`motivoPerda`
- WebSearch sobre modelo de dados de Activity/Timeline em CRM (geeksforgeeks.org, mriacrm.com) — consenso amplo, não tendência recente
- WebSearch "solo founder CRM avoid automation/AI complexity" — base das anti-features recomendadas

### Tertiary (LOW confidence)
- Relatos de GitHub issues sobre conflito de peer dependency `recharts@3.x` + `react-is` + React 19 — não é changelog oficial, reconfirmar na instalação real se/quando adotado

---
*Research completed: 2026-08-01*
*Ready for roadmap: yes (condicionado à resolução do gap de schema da Fase 1 documentado acima)*
