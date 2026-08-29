# Phase 10: Sequência de Follow-up Escalonada - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Reabordagem fria de um lead Outbound passa a seguir um roteiro configurável de intervalos crescentes (ex.: [4, 10, 20] dias), com a próxima data sugerida calculada sempre na leitura (nunca por disparo/agendamento — sem cron/scheduler) a partir da última interação real registrada na timeline (Fase 9). Templates de mensagem de reforço de valor/prova social ficam disponíveis para essas reabordagens. Um lead classificado como Inbound (Fase 8) nunca recebe essa sugestão automática — a automação de reabordagem fria não roda sobre lead que já chegou "quente" (ORIGEM-03). Não cobre: envio automático real (continua manual via wa.me), sequência diferenciada por lead individual, cadência configurável por sub-nicho.

</domain>

<decisions>
## Implementation Decisions

### Avanço da posição na sequência
- **D-01:** A posição do lead na sequência avança **automaticamente** a cada clique em "Abrir WhatsApp" com template tipo `follow_up` — reaproveita o mesmo ponto de extensão onde `contactAttempts` já incrementa hoje (`registerWhatsAppContact`), sem ação manual extra do admin.

### Reset da posição na sequência
- **D-02:** A posição reseta para o início da sequência quando o admin arrasta o lead de volta para a etapa "Novo" no pipeline — o ciclo de reabordagem reinicia porque o lead "esfriou" e voltou ao início do funil. Esta era a decisão de produto sinalizada como em aberto em `STATE.md` §Blockers/Concerns desde a Fase 9; fica resolvida aqui.
- Não reseta ao fechar/perder o lead (fora do funil ativo, a posição simplesmente para de ser relevante — não precisa de reset explícito, ver D-10).

### Onde a sequência é configurada
- **D-03:** A tela `/configuracoes` (singleton, já existente desde a Fase 7) ganha uma nova seção "Sequência de reabordagem" — não é criada uma rota/menu dedicado novo.
- **D-04:** Os intervalos são uma **lista dinâmica** (adicionar/remover linhas), não um número fixo de campos — mesmo espírito de "sem teto artificial" já usado na Fase 7 (D-03 daquela fase). Isso muda o formato de armazenamento: diferente das colunas fixas de `configuracoes` hoje (`diasParadoNovo`/`diasParadoContatado`/`diasParadoNegociacao`), a sequência precisa de um shape que suporte N itens — decisão de schema exata fica com o planner (ver Claude's Discretion).

### Onde a data sugerida aparece
- **D-05:** A próxima data de reabordagem sugerida aparece nos mesmos dois lugares onde `followUpDate` já aparece hoje: dashboard de follow-ups e card do pipeline — consistência com o padrão existente, sem tela nova.
- **D-06:** É uma **sugestão separada e só informativa** — `followUpDate` continua sendo o campo real que o admin edita manualmente (como hoje). A data calculada pela sequência é exibida ao lado/junto, mas não sobrescreve `followUpDate` automaticamente. O admin decide se quer atualizar o campo real.

### Templates de reforço de valor (SEQ-03)
- **D-07:** Reaproveita o tipo `"prova_valor"` já existente em `templates.tipo` (`primeiro_contato`/`follow_up`/`prova_valor`) — o tipo já existe e o texto/propósito já fala em reforço de valor/prova social. Sem migração de enum, sem tipo redundante.

### Escopo da sequência
- **D-08:** Existe **uma única sequência global** de intervalos para todos os leads Outbound, independente do sub-nicho — mais simples, mesmo espírito singleton de `configuracoes` hoje. Sequência por sub-nicho fica fora de escopo (era uma das ideias TBD no todo original, descartada aqui em favor da opção mais simples).

### Base de cálculo da data sugerida
- **D-09:** A próxima data é calculada a partir da **última interação registrada na timeline** (`interacoes`, Fase 9) — pega o `createdAt` da última entrada de WhatsApp do lead e soma o próximo intervalo da sequência. Não usa `followUpDate` como base (esse campo pode ter sido editado manualmente e não refletir o último contato real).

### Fim da sequência
- **D-10:** Quando o lead esgota todos os intervalos configurados (passa do último degrau), o sistema **para de sugerir data nova** — não repete o último intervalo indefinidamente. A ausência de sugestão sinaliza implicitamente que a automação acabou; cabe ao admin decidir o próximo passo manualmente.

### Claude's Discretion
- Shape exato do armazenamento da lista de intervalos (nova tabela `sequencia_intervalos` com uma linha por degrau + `ordem`, vs. coluna JSON/texto serializado em `configuracoes`) — decisão técnica do planner/researcher; nenhuma preferência de UX manifestada, só o requisito de suportar N itens (D-04).
- Shape exato de `sequenciaPosicao` no lead (coluna inteira representando o índice do próximo degrau, vs. `sequenciaProximaData` calculada e persistida) — o cálculo é sempre "na leitura" (SEQ-02), então a persistência mínima necessária fica a critério do planner.
- Layout exato do badge/indicador da data sugerida no dashboard e no card do pipeline (mesmo espírito visual do "Esfriando"/contador de tentativas — ícone + texto discreto quando relevante) — sem referência visual específica trazida pelo usuário.
- Mecanismo de migração (ALTER TABLE manual via `better-sqlite3`, mesmo padrão já estabelecido nas Fases 06-01/07-01/08-01, vs. `drizzle-kit push` direto) — segue o precedente do projeto, mas a escolha final é técnica.
- Como o gate Inbound (ORIGEM-03, Success Criteria #3 do ROADMAP) é implementado exatamente — provavelmente um filtro simples em `origemTipo === "outbound"` no ponto de cálculo da sugestão, já que é um requisito travado (não uma área discutida aqui, mas precisa ser respeitado).

### Folded Todos
- **Sequência de follow-up escalonada com templates de valor** (`.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`, `resolves_phase: 10` no próprio frontmatter) — dobrado integralmente: é o todo que esta fase resolve. As "ideias TBD" originais (sequência associada ao lead vs. ao sub-nicho; sugestão/lembrete manual, nunca disparo automático; templates reaproveitando o sistema já existente) estão todas refletidas nas decisões D-01 a D-09 acima — a opção "associada ao sub-nicho" foi avaliada e descartada explicitamente (D-08).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e roadmap
- `.planning/ROADMAP.md` §Phase 10 — goal, success criteria (4 itens, incluindo o gate Inbound/ORIGEM-03), depende de Phase 8 (`origemTipo` populado)
- `.planning/REQUIREMENTS.md` — SEQ-01, SEQ-02, SEQ-03, ORIGEM-03 (mapeado como requisito desta fase), Traceability
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — todo original dobrado nesta fase (ver Folded Todos acima)

### Débito/decisão já sinalizada para esta fase
- `.planning/STATE.md` §Blockers/Concerns — "Phase 10: reset de `sequenciaPosicao` ... é decisão de produto em aberto — resolver em `/gsd-discuss-phase` da própria Phase 10" — **resolvida acima em D-02.**

### Base técnica das fases anteriores (dependências diretas)
- `src/db/schema.ts` (tabela `leads`, coluna `origemTipo`, Fase 8) — gate Inbound/Outbound (ORIGEM-03) filtra por este campo
- `src/db/schema.ts` (tabela `interacoes`, Fase 9) — fonte de verdade da "última interação real" usada em D-09
- `src/actions/lead-actions.ts` (`registerWhatsAppContact`) — ponto de extensão para D-01 (avanço automático de posição)
- `src/db/schema.ts` (tabela `configuracoes`, Fase 7) — precedente de tela singleton reaproveitada em D-03

No external specs/ADRs beyond the above — requisitos totalmente capturados em `REQUIREMENTS.md` e nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `configuracoes` (`src/db/schema.ts:120-126`) — tabela singleton (`id` fixo = 1), padrão de leitura/escrita via `getConfiguracoes()`/`saveConfiguracoes()` (`src/db/queries.ts`) — modelo direto para onde a seção "Sequência de reabordagem" entra na mesma tela (D-03), embora o shape de armazenamento precise mudar para suportar lista dinâmica (D-04, ver Claude's Discretion).
- `templates` (`src/db/schema.ts:18-30`) — `tipo` enum já inclui `"prova_valor"`, reaproveitado integralmente por D-07, sem migração.
- `registerWhatsAppContact` (`src/actions/lead-actions.ts:229-269`, já com o fix de WR-01 de 2026-08-11) — ponto único onde todo clique real em "Abrir WhatsApp" é processado (incrementa `contactAttempts`, decide auto-avanço de etapa, grava interação na timeline desde a Fase 9). Candidato natural para também avançar `sequenciaPosicao` quando `tipo === "follow_up"` (D-01), na mesma transação já existente.
- `interacoes` (`src/db/schema.ts:82-99`, Fase 9) — `getInteracoesByLead`/query direta por `leadId` ordenada por `createdAt DESC` já existe (`src/actions/interacao-actions.ts`) — base direta para "pegar a última interação de WhatsApp do lead" (D-09).
- `src/app/pipeline/page.tsx` — já calcula "Esfriando" no servidor a partir de `configuracoes` + `stageChangedAt`; mesmo padrão de "buscar config + computar no servidor" se aplica ao cálculo da data sugerida da sequência.

### Established Patterns
- Configuração singleton sempre semeada em `getConfiguracoes()` (código de aplicação), nunca via INSERT de migração SQL — mesmo padrão provavelmente vale para a nova seção de sequência.
- Cálculo condicional (badge "Esfriando", contador de tentativas) sempre no servidor (Server Component), nunca no client — a "próxima data sugerida" (D-05) deve seguir o mesmo caminho.
- Toda mutação de servidor segue: Zod parse → SELECT fresco quando há gate condicional → `db.update`/`db.insert` → `revalidatePath` — extensão de `registerWhatsAppContact` para D-01 deve manter esse formato, dentro da mesma `db.transaction()` já existente (Fase 9).
- Migração manual via `better-sqlite3` (não `drizzle-kit push` direto) é o padrão estabelecido desde as Fases 06-01/07-01/08-01 para colunas/tabelas novas com regra de dado real.

### Integration Points
- `src/db/schema.ts` — nova(s) coluna(s)/tabela(s) para a lista de intervalos configuráveis (D-04) e para `sequenciaPosicao` no lead (shape exato: Claude's Discretion).
- `src/actions/lead-actions.ts` — `registerWhatsAppContact` ganha a responsabilidade de avançar `sequenciaPosicao` quando `tipo === "follow_up"` (D-01), respeitando o reset ao voltar pra "Novo" (D-02, provavelmente em `updateLeadStage`).
- `src/app/configuracoes/page.tsx` (ou equivalente) — nova seção "Sequência de reabordagem" com lista dinâmica de intervalos (D-03/D-04).
- Dashboard de follow-ups e `src/app/pipeline/page.tsx` — cálculo e exibição da data sugerida (D-05/D-06/D-09/D-10), com o gate Inbound (ORIGEM-03) filtrando por `origemTipo`.
- `src/components/whatsapp-preview-dialog.tsx` / templates — nenhuma mudança de plumbing necessária para D-07 (tipo já existe e já é selecionável).

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual específica trazida pelo usuário para o layout do badge/indicador da data sugerida — todas as decisões desta sessão foram sobre modelo de dados, gatilho/reset de posição, escopo e localização, seguindo o mesmo espírito visual já estabelecido no projeto (ícone + texto discreto quando relevante, mesmo padrão do "Esfriando"/contador de tentativas).

</specifics>

<deferred>
## Deferred Ideas

Nenhuma nova ideia de escopo surgiu nesta sessão — todas as áreas discutidas eram decisões de implementação dentro do domínio já delimitado por `ROADMAP.md`/`REQUIREMENTS.md` (SEQ-01/02/03, ORIGEM-03). A ideia de "sequência por sub-nicho" foi avaliada explicitamente e descartada em favor do escopo global (D-08), não fica pendente para depois.

### Reviewed Todos (not folded)
Nenhum outro todo bateu no matcher desta fase além do já dobrado acima.

</deferred>

---

*Phase: 10-sequência-de-follow-up-escalonada*
*Context gathered: 2026-08-11*
