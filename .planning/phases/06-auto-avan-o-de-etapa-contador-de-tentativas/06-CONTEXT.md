# Phase 6: Auto-avanço de Etapa + Contador de Tentativas - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Ao contatar um lead pelo WhatsApp (clique em "Abrir WhatsApp", em qualquer tela onde o botão aparece — dashboard, pipeline, lista de leads, pós-importação), o sistema passa a acompanhar automaticamente duas coisas sem o admin precisar atualizar nada manualmente: (1) o avanço de etapa Novo→Contatado quando o template usado é "1º contato", e (2) um contador de tentativas de contato por lead, incrementado a cada clique real em "Abrir WhatsApp", visível no card do pipeline. Esta fase não cobre configuração de dias-parado por etapa (Phase 7) nem mudanças no conteúdo/gestão dos templates.

</domain>

<decisions>
## Implementation Decisions

### O que conta como "tentativa de contato" (WA-08)
- **D-01:** Só o clique final no link "Abrir WhatsApp" dentro do modal de preview (`WhatsAppPreviewDialog`) conta como tentativa — abrir o modal (pelo `WhatsAppSendButton` no card) e cancelar sem enviar **não** conta.
- **D-02:** Cada clique em "Abrir WhatsApp" conta separado, mesmo múltiplos cliques na mesma sessão do modal (ex: trocar de tipo de template e clicar de novo) — cada abertura de aba é uma tentativa real.
- **D-03:** O clique também conta quando o modal foi aberto automaticamente (gatilho de 1º contato pós-criação de lead, D-18/D-19 da Fase 4; e na tela pós-importação de CSV, `/importar/[batchId]`) — mesmo componente reusado em todas as telas, sem exceção de como o modal foi aberto.
- **D-04:** O contador acumula pela vida toda do lead, através de todas as etapas do funil (Novo→Contatado→Negociação→Fechado/Perdido) — nunca zera ao mudar de etapa. Reflete esforço total investido no lead.

### Exibição do contador no card (WA-08)
- **D-05:** Formato visual: ícone (ex: `MessageCircle`, mesmo ícone já usado no botão de WhatsApp) + número (ex: "3x") — discreto, consistente com o padrão visual já usado pro badge "Esfriando" (ícone `Clock` + texto) em `pipeline-lead-card.tsx`.
- **D-06:** Só aparece quando o contador for > 0 — lead ainda sem nenhum clique em WhatsApp não mostra nada extra no card, mesmo padrão do "Esfriando" (só aparece quando relevante), mantém o card limpo pra leads novos.

### Texto do toast de auto-avanço (WA-06)
- **D-07:** Toast personalizado com o nome do lead, ex: **"{Nome} avançou para Contatado."** — diferente do toast genérico já usado no drag-and-drop manual (`"Lead movido para {etapa}."` em `pipeline-board.tsx`), pois o auto-avanço pode acontecer em telas com múltiplos leads visíveis (dashboard, lista) onde o admin precisa saber qual lead mudou, não só no board onde o contexto já é visual.

### Claude's Discretion
- **Mecanismo técnico de disparo da mutação de servidor.** Hoje o botão "Abrir WhatsApp" dentro de `WhatsAppPreviewDialog` é um `<a href={waHref}>` puro (linhas 165-178) — nenhuma Server Action é chamada nesse clique atualmente. Implementar uma nova mutação de servidor (nome/shape a definir, ex: `registerWhatsAppClick(leadId, tipo)`) que roda no `onClick` do link, em paralelo à navegação (o link abre em nova aba via `target="_blank"`, então não precisa bloquear a navegação esperando a resposta do servidor).
- Nome/shape exato do novo campo de schema para o contador (`contactAttempts` ou similar) e se a migração usa um valor default 0 ou nullable com fallback — implementação, não decisão de produto.
- Reuso ou extensão de `updateLeadStage()` (`src/actions/lead-actions.ts`) vs. nova função dedicada para a lógica combinada de auto-avanço + incremento de contador — arquitetura, não especificado pelo admin.
- Exato texto/cor/spacing do ícone+número do contador (D-05) além do padrão geral já descrito — CSS/layout não especificado pelo admin.
- Se o auto-avanço dispara mesmo quando o modal foi aberto com `defaultTipo` diferente de "1º contato" mas o admin trocou manualmente pro tipo "1º contato" antes de clicar em Abrir WhatsApp — a leitura literal do WA-06 ("com o template de primeiro contato") indica que sim (o tipo no momento do clique é o que importa, não o tipo default do contexto de abertura), consistente com D-15 da Fase 4 (seletor de tipo trocável antes de enviar). Não foi perguntado ao admin por ser uma leitura direta do requisito, mas o researcher/planner deve confirmar essa interpretação.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e escopo
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria (SC #1-4), depende de Phase 4
- `.planning/REQUIREMENTS.md` — WA-06, WA-07, WA-08

### Fases anteriores relacionadas (WhatsApp / pipeline)
- `.planning/phases/04-follow-up-dashboard-whatsapp-outreach/04-CONTEXT.md` — D-14/D-15/D-16/D-17 (botão inline "Enviar WhatsApp", preview modal editável, seletor de tipo trocável, wa.me construído via `normalizePhone`), D-18/D-19/D-20/D-21 (gatilho automático de 1º contato pós-criação de lead — mesmo ponto de integração que esta fase reusa para D-03)
- `.planning/phases/03-sales-pipeline-funnel-view/03-CONTEXT.md` — D-06/D-07/D-08 (critério de "esfriando": borda + ícone+texto no card, mesmo padrão visual que D-05/D-06 desta fase seguem para o contador), `stageChangedAt` (campo já existente reusado pelo auto-avanço)

### Código existente (ver também `<code_context>` abaixo)
- `src/components/whatsapp-preview-dialog.tsx` — único ponto real do app que renderiza o link wa.me (`waHref`, linhas 165-178); é aqui que a nova mutação de servidor precisa ser disparada no `onClick`
- `src/actions/lead-actions.ts` — `updateLeadStage()` (linhas 156-192) já implementa o padrão de re-leitura do stage atual no servidor antes de aplicar mudança (satisfaz SC#4/race condition de drag-and-drop) — modelo a seguir ou reusar
- `src/components/pipeline-lead-card.tsx` — card onde o contador (D-05/D-06) será exibido, ao lado do badge "Esfriando" já existente
- `src/db/schema.ts` — `leads.stage`/`leads.stageChangedAt` já existentes (linhas 44-48); novo campo de contador de tentativas ainda não existe, precisa de migração
- `src/hooks/use-first-contact-trigger.ts` — hook do gatilho de 1º contato pós-criação (D-18 da Fase 4), ponto de integração relevante para D-03

No external specs/ADRs beyond the above — requisitos totalmente capturados nas decisões acima e em `.planning/REQUIREMENTS.md` (WA-06, WA-07, WA-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `updateLeadStage(id, stage, motivoPerda?)` (`src/actions/lead-actions.ts:156`) — já re-lê o stage atual no servidor (`current.stage !== parsed.data.stage`) antes de aplicar, seta `stageChangedAt` quando muda, revalida `/pipeline` e `/`. Modelo direto para a checagem "nunca regride/re-avança" (WA-07) e a re-leitura sempre no servidor (SC#4).
- `WhatsAppPreviewDialog` (`src/components/whatsapp-preview-dialog.tsx`) — único componente que renderiza o `waHref` real; compartilhado entre dashboard, pipeline, lista de leads e pós-importação (ponto de integração único mencionado no ROADMAP).
- `PipelineLeadCard` (`src/components/pipeline-lead-card.tsx`) — já tem o padrão de indicador condicional (`isEsfriando` → borda + ícone `Clock` + texto), extensível para o novo indicador de tentativas (D-05/D-06).
- `useFirstContactTrigger` (`src/hooks/use-first-contact-trigger.ts`) — hook compartilhado e desacoplado, precedente de como conectar um novo comportamento (contador/auto-avanço) sem hard-coupling a uma única tela.

### Established Patterns
- Server Actions com Zod + `ActionState` de retorno + `revalidatePath` em toda rota que exibe o dado afetado (lição da Fase 3 gap-closure) — a nova mutação de clique deve seguir o mesmo padrão.
- Soft-delete (`isNull(deletedAt)`) — toda query de leads já filtra por isso, a nova mutação deve manter o filtro.
- Indicador visual condicional no card (ícone + texto, só quando relevante) — já estabelecido pelo "Esfriando", D-05/D-06 seguem o mesmo padrão para o contador.
- Toast via `sonner` (`toast.success(...)`) já usado em todo o app — `pipeline-board.tsx:141` é o precedente mais próximo (`"Lead movido para ${label}."`), mas D-07 decide um texto diferente (personalizado com nome) para este caso específico.

### Integration Points
- `WhatsAppPreviewDialog`'s "Abrir WhatsApp" `<a>` (linhas 165-178) — ponto único onde a nova mutação de servidor precisa ser disparada no `onClick`, antes hoje só fecha o dialog (`onOpenChange(false)`).
- `src/db/schema.ts` — novo campo de contador de tentativas precisa ser adicionado à tabela `leads` (migração aditiva, mesmo padrão da Fase 3 para `motivoPerda`).
- `pipeline-lead-card.tsx` — precisa receber o novo campo do contador via prop `lead` (já reusa o objeto `Lead` inteiro) e renderizar condicionalmente (D-06).

</code_context>

<specifics>
## Specific Ideas

- Toast de auto-avanço deve ser personalizado com o nome do lead (D-07) — diferente do padrão genérico já usado no drag-and-drop, porque o clique em WhatsApp pode acontecer em telas com múltiplos leads visíveis (dashboard, lista), onde o admin precisa de contexto de qual lead mudou.
- O ícone+número do contador deve seguir visualmente o mesmo espírito do badge "Esfriando" já existente — não é uma novidade estética, é uma extensão do padrão já validado no card do pipeline.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma nova ideia de escopo surgiu durante esta discussão — ficou dentro do domínio da fase.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — "Sequência de follow-up escalonada com templates de valor." Bateu por keywords genéricas ("follow", "lead", "admin", score 0.6), mas é sobre agendamento automático de datas de follow-up (não sobre auto-avanço de etapa nem contador de tentativas). Já revisado 2x antes (Fase 4: parte de "prova de valor" foi dobrada; Fase 5: revisado, não dobrado). Revisado novamente aqui, mantido pendente — fora do escopo desta fase.

</deferred>

---

*Phase: 06-auto-avanço-de-etapa-contador-de-tentativas*
*Context gathered: 2026-07-31*
