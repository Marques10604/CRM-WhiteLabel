# Phase 9: Timeline de Interações - Context

**Gathered:** 2026-08-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Cada evento de contato com um lead — clique em "Abrir WhatsApp" (qualquer template, qualquer tela) e nota manual digitada pelo admin — vira um registro datado numa linha do tempo consultável, em vez de só um contador sem detalhe (`contactAttempts`, já existente desde a Fase 6). Cobre: nova tabela de interações, captura automática no ponto onde o WhatsApp já é registrado hoje (`registerWhatsAppContact`), formulário de nota manual, e uma superfície própria (modal/tela dedicada) para visualizar o histórico completo em ordem cronológica. Não cobre: mudar o campo `notas` existente do lead, nem qualquer automação de reabordagem (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Relação com o campo "Notas" existente
- **D-01:** O campo `notas` (texto livre, seção "Acompanhamento" do modal de editar lead) **continua existindo exatamente como está hoje** — nenhuma migração de conteúdo, nenhuma remoção. É a "anotação geral" do lead. A timeline é um registro **separado e cronológico**: cada nota manual nova que o admin digitar na timeline vira uma entrada datada ali, sem tocar em `notas`.

### Onde a timeline aparece
- **D-02:** A timeline vive numa **superfície própria (modal/tela dedicada)** — não é uma seção a mais dentro do modal de editar lead já existente (Contato/Negócio/Acompanhamento). Motivo: espaço vertical para uma lista potencialmente longa de eventos, sem competir com os campos de edição.
- **D-03:** Acesso **duplo**: (a) um ícone dedicado (ex.: relógio/histórico) ao lado do lápis de editar e do botão "WhatsApp" tanto na lista `/leads` quanto no card do pipeline; (b) um botão "Ver histórico" dentro do modal de editar lead. Ambos abrem a mesma superfície de timeline para o mesmo lead.

### Conteúdo do evento automático de WhatsApp
- **D-04:** Ao clicar "Abrir WhatsApp", o evento registrado na timeline inclui **metadado (tipo de template + data/hora) E o texto completo** que estava na caixa de mensagem no momento do clique — não só metadado, não um resumo/trecho truncado. O texto já está disponível no componente nesse ponto exato do clique (state `texto` em `whatsapp-preview-dialog.tsx`), então não exige nova plumbing de dados, só passar esse valor adiante para a nova mutação de registro.
- **D-05:** Sem truncamento — mensagens de WhatsApp já são curtas por natureza (templates), não há risco de peso desproporcional no banco.

### Exclusão/edição de uma entrada da timeline
- **D-06:** **Assimetria deliberada por tipo de evento.** Eventos automáticos de WhatsApp são **imutáveis** — nunca editados nem apagados, são fato do sistema (o clique aconteceu, esse foi o texto enviado), preservando o valor de auditoria/histórico fiel da timeline. Notas manuais digitadas pelo admin **podem ser editadas e removidas (soft-delete)** — são o registro subjetivo do admin, e erro de digitação/arrependimento é esperado. Esta é uma recomendação de Claude que o usuário aceitou explicitamente ("oque voce acha melhor" → confirmado).
- **D-07:** O soft-delete de nota manual segue o **mesmo padrão já estabelecido no projeto** (`deletedAt`, mesmo mecanismo de `leads`/`subnichos`) — não um mecanismo novo.

### Claude's Discretion
- Nome exato da tabela nova (`interacoes` é o nome já usado em `STATE.md` §Blockers/Concerns e no todo original — manter, salvo motivo técnico forte para mudar) e shape exato das colunas (tipo de evento como enum vs. texto livre, nome do FK para `leads.id`).
- Se a captura do evento de WhatsApp é uma escrita síncrona dentro de `registerWhatsAppContact` (mesma transação/chamada) ou uma segunda mutação separada disparada em paralelo — arquitetura, não especificado pelo admin. Ambas cumprem o requisito; a Fase 6 já estabeleceu `registerWhatsAppContact` como função dedicada (não extensão de `updateLeadStage`), então a captura de interação provavelmente pertence ali dentro, mas o planner decide.
- Layout exato da timeline (cards empilhados, lista simples, agrupamento por dia) — sem referência visual específica trazida pelo usuário.
- Se a nota manual tem campo de "tipo" (ex.: ligação, reunião, observação) além do texto livre, ou é só texto — TIMELINE-01 fala em "tipo/resumo" mas o usuário não especificou categorias de nota manual nesta discussão; planner/researcher decide o mínimo necessário para satisfazer o requisito sem introduzir complexidade não pedida.

### Folded Todos
- **Timeline de interações por lead** (`.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md`, score 0.6, `resolves_phase: 9` no próprio frontmatter) — dobrado integralmente: é o todo que esta fase resolve. A "Solution TBD" original ("tabela de interações: lead_id, tipo, data, texto/resumo, alimentada manualmente ou semi-automaticamente a cada clique de WhatsApp, exibida como linha do tempo") está diretamente refletida nas decisões D-01 a D-07 acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e roadmap
- `.planning/ROADMAP.md` §Phase 9 — goal, success criteria (3 itens), sem dependência técnica dura de Phase 8
- `.planning/REQUIREMENTS.md` — TIMELINE-01, TIMELINE-02, Traceability
- `.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md` — todo original dobrado nesta fase (ver Folded Todos acima)

### Débito/constraint já sinalizado para esta fase
- `.planning/STATE.md` §Blockers/Concerns — "Phase 9/Phase 12: `interacoes` e `tarefas` precisam entrar em `scripts/guard-no-hard-delete.cjs` no mesmo commit que as cria, com decisão explícita de soft-delete... documentada como D-XX no momento da fase" — **esta decisão já foi tomada acima (D-06/D-07): soft-delete apenas para notas manuais, eventos de WhatsApp imutáveis.** O guard precisa ser estendido para cobrir a tabela nova (ver `<code_context>` abaixo — hoje ele só escaneia `leads`/`subnichos` por design, LEAD-04 escopo).
- `.planning/STATE.md` §Key Decisions — "Nunca hard-delete — soft-delete (`deletedAt`) é o padrão do projeto para toda entidade removível" — D-07 segue essa regra permanente.

No external specs/ADRs beyond the above — requisitos totalmente capturados em `REQUIREMENTS.md` e nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `registerWhatsAppContact(leadId, tipo)` (`src/actions/lead-actions.ts:217-248`) — já é o ponto único onde todo clique real em "Abrir WhatsApp" é registrado (incrementa `contactAttempts`, decide auto-avanço de etapa via SELECT fresco). Candidato natural para também inserir a linha de interação (D-04), na mesma função ou logo depois dela.
- `whatsapp-preview-dialog.tsx:180-195` — `onClick` do link `<a href={waHref}>` já chama `registerWhatsAppContact(leadId, tipo)` de forma fire-and-forget; o state `texto` (linhas ~150-154) contém o texto vivo da mensagem nesse exato ponto — precisa ser passado como argumento novo para capturar D-04.
- `softDeleteLead()` (`src/actions/lead-actions.ts:258-266`) — padrão de soft-delete via `deletedAt: sql\`(unixepoch())\`` com `where` restrito a linhas ainda ativas (idempotente) — modelo direto para o soft-delete de nota manual (D-07).
- `scripts/guard-no-hard-delete.cjs` — guarda permanente anti hard-delete, hoje escaneia especificamente `leads`/`subnichos` (comentário de cabeçalho declara esse escopo como LEAD-04). Precisa ganhar a tabela nova (`interacoes` ou nome escolhido) no mesmo commit que a cria — não é extensão automática, o padrão de busca é hardcoded por nome de tabela.

### Established Patterns
- Toda mutação de servidor no projeto segue: Zod parse → SELECT fresco quando há gate condicional → `db.update`/`db.insert` → `revalidatePath` nas rotas afetadas (padrão de `registerWhatsAppContact`, `updateLeadStage`, `softDeleteLead`).
- Indicador condicional em card/lista só aparece quando há dado relevante (contador de tentativas só aparece se > 0, "Esfriando" só quando aplicável) — mesmo espírito provavelmente se aplica ao ícone de histórico (D-03), a confirmar no planning se o ícone aparece sempre ou só quando há pelo menos 1 evento.
- Migração manual via `better-sqlite3` (não `drizzle-kit push` direto) é o padrão estabelecido desde as Fases 06-01/07-01/08-01 para colunas/tabelas novas com regra de dado real — a tabela `interacoes` provavelmente segue o mesmo caminho.

### Integration Points
- `src/db/schema.ts` — nova tabela `interacoes` (ou nome escolhido pelo planner), com FK para `leads.id`, coluna de tipo de evento, texto, `createdAt`, e `deletedAt` nullable (só relevante para entradas manuais, D-06).
- `src/actions/lead-actions.ts` — `registerWhatsAppContact` ganha a responsabilidade de também inserir a interação automática (ou uma função irmã dedicada); nova(s) Server Action(s) para criar/editar/soft-deletar nota manual.
- `src/components/whatsapp-preview-dialog.tsx` — precisa passar o texto vivo da mensagem (`texto`) para a mutação de registro, hoje só passa `leadId`/`tipo`.
- Novo componente de timeline (nome a definir pelo planner) — superfície dedicada (D-02), com os dois pontos de entrada (D-03): ícone em `lead-table.tsx`/`pipeline-lead-card.tsx`, e botão dentro de `lead-form-dialog.tsx`.
- `scripts/guard-no-hard-delete.cjs` — estender o escopo de escaneamento para a tabela nova, no mesmo commit que a cria.

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual específica trazida pelo usuário para o layout da timeline em si — todas as decisões desta sessão foram sobre modelo de dados, localização/acesso, e política de mutabilidade, não aparência. Planner segue os padrões visuais já estabelecidos no projeto (mesmo espírito do "Esfriando"/contador de tentativas: ícone + texto discreto quando relevante).

</specifics>

<deferred>
## Deferred Ideas

Nenhuma nova ideia de escopo surgiu nesta sessão — todas as áreas discutidas eram decisões de implementação dentro do domínio já delimitado por `ROADMAP.md`/`REQUIREMENTS.md` (TIMELINE-01/02).

### Reviewed Todos (not folded)
Os itens abaixo bateram no matcher de todos por sobreposição genérica de palavras-chave ("lead", "phase", "admin", "uma", "tbd") com score 0.4-0.6, mesmo padrão de ruído já documentado em `08-CONTEXT.md`. Nenhum foi dobrado — pertencem a outras fases do roadmap v1.3 ou ao backlog PME/v2, já mapeados em `REQUIREMENTS.md` Traceability:

- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — Phase 10 (SEQ-01/02/03)
- `.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md` — Phase 12 (TAREFA-01/02)
- `.planning/todos/pending/2026-08-01-anexo-simples-por-lead.md` — backlog PME, fora do roadmap v1.3
- `.planning/todos/pending/2026-08-01-busca-global.md` — backlog PME, fora do roadmap v1.3
- `.planning/todos/pending/2026-08-01-campo-de-vendedor-respons-vel-no-banco.md` — backlog PME, fora do roadmap v1.3
- `.planning/todos/pending/2026-08-01-meta-mensal-com-barra-de-progresso.md` — backlog PME, fora do roadmap v1.3
- `.planning/todos/pending/2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho.md` — Phase 11 (METRICAS-01/02)
- `.planning/todos/pending/2026-08-01-relat-rio-de-motivos-de-perda.md` — Phase 11 (PERDA-01)
- `.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md` — já resolvido na Phase 8 (dobrado lá)
- `.planning/todos/pending/2026-08-01-tags-livres-por-lead.md` — backlog PME, fora do roadmap v1.3
- `.planning/todos/pending/2026-08-01-temperatura-autom-tica-do-lead.md` — v2/v1.4 (TEMP-01), adiado explicitamente
- `.planning/todos/pending/2026-08-01-exportar-dados-em-csv.md` — backlog PME, fora do roadmap v1.3

</deferred>

---

*Phase: 09-timeline-de-interações*
*Context gathered: 2026-08-08*
