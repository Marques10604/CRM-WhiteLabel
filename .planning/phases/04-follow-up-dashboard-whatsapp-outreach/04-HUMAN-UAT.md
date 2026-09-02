---
status: complete
phase: 04-follow-up-dashboard-whatsapp-outreach
source: [04-VERIFICATION.md, 04-REVIEW-FIX.md]
started: 2026-07-22T03:41:08Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 0
method: "code+data (Fase 18 / AUDIT-03, D-01 revisado — navegador bloqueado por hardware). Leitura da superfície (page.tsx + queries.ts + followup-dashboard/whatsapp-preview-dialog/whatsapp-send-button/pipeline-board/pipeline-lead-card/motivo-perda-dialog/template-*) + harnesses test:group-by-urgency, test:lead-actions, verify:motivo-perda + query no data/crm.db. CR-02 (drag-to-Perdido) tem confirmação AO VIVO herdada da quick 260828-gna."
audit: "Fase 18 — AUDIT-03"
---

## Current Test

[completo — 7/7 cenários com resultado, por code+data; CR-02 com reforço live da quick 260828-gna]

## Tests

### 1. Dashboard renderiza corretamente
expected: 3 seções por urgência (Vencidos vermelho, Hoje âmbar, Próximos 7 dias cinza), item clicável abre modal de edição, estado "Tudo em dia!" quando vazio, "Novo lead" abre LeadFormDialog em modo criação sem navegar para /leads.
result: pass
evidence: |
  (code+data) `src/app/page.tsx` — `Promise.all` busca leads ativos + tarefas + templates +
  config → `buildDashboardItems(activeLeads, tarefasPendentes)` (função pura, `src/db/queries.ts:113-136`)
  → `<FollowupDashboard vencidos hoje proximos7Dias .../>`.
  `followup-dashboard.tsx:92-117` — 3 seções: Vencidos `headerBg #FEE2E2`/`text #B91C1C`,
  Hoje `#FEF3C7`/`#B45309`, Próximos 7 dias `#F4F4F5`/`#3F3F46`. Seção vazia é OMITIDA
  (`sections.filter(section => section.items.length > 0)`, linha 166-167).
  Item de lead: `<div role="button" onClick={() => setDialogState({ mode: "edit", lead })}>`
  (linha 208-212). Estado vazio (`totalCount === 0`, linha 140-163): "Tudo em dia!" + "Nenhum
  follow-up ou tarefa pendente." + botões. "Novo lead" (linha 126-131) → `setDialogState({ mode:
  "create" })` → `<LeadFormDialog>` local, sem `<Link>`/navegação.
  Harness `test:group-by-urgency` (exit 0): régua de urgência (vencidos/hoje/proximos7Dias),
  `buildDashboardItems` intercala lead+tarefa por data ASC.
  Data: `data/crm.db` tem 23 leads ativos → o estado "Tudo em dia!" não é observável hoje;
  lógica do estado vazio verificada por código.

### 2. CRUD completo de templates com "um padrão por tipo"
expected: criar template de cada tipo com variáveis, marcar padrão, criar segundo do mesmo tipo e marcar padrão (primeiro perde badge), editar, excluir com confirmação.
result: pass
evidence: |
  (code+data) `templateSchema` (`src/lib/validations.ts:173-180`): `tipo` enum, `nome`/`corpo`
  `.min(1)`, `isDefault` coerced boolean. `template-form-dialog.tsx` — `FieldDescription`
  cita `{nome} {nicho} {origem}`; submete FormData bruto → `createTemplate`/`updateTemplate`.
  "Um padrão por tipo" (D-12): `applyDefaultTemplate` (`src/actions/template-actions.ts:23-31`)
  numa `db.transaction` async/awaited em TODOS os call sites (WR-03): `UPDATE ... SET isDefault
  = false WHERE tipo = <t> AND isDefault = true` e depois `SET isDefault = true WHERE id = <id>`
  — desmarca o padrão anterior atomicamente. `deleteTemplate` = hard delete (D-13) com
  `DeleteTemplateDialog` de confirmação.
  Data: `data/crm.db` tem exatamente 3 templates, um `is_default = 1` por tipo distinto
  (`primeiro_contato` / `follow_up` / `prova_valor`) — o invariante se mantém em produção.

### 3. Botão WhatsApp + preview no dashboard e pipeline
expected: preview abre com mensagem preenchida, textarea editável atualiza link ao vivo, telefone inválido desabilita botão com tooltip, botão no pipeline não colide com drag-and-drop nem edição do card.
result: pass
evidence: |
  (code+data) `WhatsAppSendButton` (`whatsapp-send-button.tsx`): `disabled` já computado pelo
  pai via `normalizePhone(lead.telefone) === null`; `title="Telefone inválido — edite o lead"`
  quando desabilitado (D-17). Renderizado em `followup-dashboard.tsx:248` e
  `pipeline-lead-card.tsx:91`.
  `WhatsAppPreviewDialog` (`whatsapp-preview-dialog.tsx`): `useEffect` (linha 77-95) preenche
  `texto` via `renderTemplate(pickTemplate(templates, defaultTipo).corpo, { nome, nicho, origem })`
  ao abrir. CRÍTICO (Pitfall 4): `waHref = lead && tel && !mensagemVazia ? buildWaLink(tel, texto)
  : undefined` é RECOMPUTADO a cada render a partir do state VIVO `texto` (linha 124) — a
  `<Textarea>` `onChange={e => setTexto(e.target.value)}`. `<a href={waHref} target="_blank"
  rel="noopener noreferrer">`.
  Pipeline sem colisão: `pipeline-lead-card.tsx:76-80` — wrapper dos botões com
  `onPointerDown={e => e.stopPropagation()}` E `onClick={e => e.stopPropagation()}` (o
  `useDraggable` listeners e o `onClick` de edição do card exigem interceptação separada);
  `PointerSensor` com `activationConstraint: { distance: 8 }` (`pipeline-board.tsx:99-101`)
  separa drag de clique.
  Harness `test:lead-actions` cobre `registerWhatsAppContact`/wa.me lib indiretamente;
  `04-VERIFICATION.md` truth 15 confirmou o teste de encode (acentos/emoji/`\n`→`%0A`).

### 4. Auto-gatilho de 1º contato (WA-04) nas 3 superfícies
expected: criar lead em /, /leads e /pipeline abre automaticamente o preview de 1º contato com subtítulo mandatório; fechar sem enviar não desfaz criação; editar lead existente NÃO dispara.
result: pass
evidence: |
  (code+data) `lead-form-dialog.tsx:145-163` — `useEffect([state])`: no sucesso,
  `toast.success` + `form.reset()` + `onOpenChange(false)` e, **só se `!isEditMode && state.lead`**,
  `firstContact.trigger(state.lead, nichoNameById.get(state.lead.nichoId) ?? "—")`.
  `createLead` retorna `{ success: true, lead: inserted }` via `.returning()` (`lead-actions.ts:126`);
  `updateLead` retorna só `{ success: true }` (nunca `lead`) — dupla garantia de que a edição
  não dispara.
  Subtítulo mandatório (`lead-form-dialog.tsx:523`): literal `Sugestão: enviar mensagem de
  primeiro contato para ${firstContact.lead?.nome ?? ""}.`, passado como `subtitulo` ao
  `<WhatsAppPreviewDialog defaultTipo="primeiro_contato">`.
  As 3 superfícies renderizam `<LeadFormDialog>` com `firstContactTemplate`:
  `lead-table.tsx:351-362` (/leads), `followup-dashboard.tsx:270-281` (/), `pipeline-board.tsx:251-262`
  (/pipeline).
  Fechar sem enviar não desfaz: o lead já foi persistido por `createLead` ANTES de
  `firstContact.trigger()` ser chamado; `firstContact.close()` só limpa state local (D-20).
  `04-VERIFICATION.md` truths 17-21 confirmaram isto no nível de código.

### 5. (CR-01) Boundary de 7 dias
expected: lead com follow-up exatamente hoje+7 aparece em "Próximos 7 dias", não desaparece.
result: pass
evidence: |
  (code+data) `groupByUrgency` (`src/db/queries.ts:41-65`): `in7Days = addDays(today, 8)`
  (limite superior EXCLUSIVO); `else if (isBefore(d, in7Days)) proximos7Dias.push(item)` —
  um item em `today + 7` satisfaz `isBefore(today+7, today+8)` → entra em "Próximos 7 dias".
  Harness `test:group-by-urgency` (exit 0), asserções literais:
  - "groupByUrgency: item em today+7 cai em proximos7Dias (limite addDays(today, 8) exclusivo)"
  - "groupByUrgency: item em today+8 não cai em NENHUM bucket"
  Este cenário está 100% provado por harness — o fix `addDays(today, 8)` (04-REVIEW-FIX CR-01)
  está verificado, não só "code-level".

### 6. (CR-02) Race condition no drag-to-Perdido
expected: arrastar dois leads para "Perdido" em sequência rápida não perde nenhuma transição de etapa após refresh.
result: pass
evidence: |
  (code+data + live herdado) `pipeline-board.tsx:91,148-170` — `motivoQueueRef` é uma FILA
  FIFO. Soltar um card em "Perdido" NÃO move o card e NÃO entra numa transição async: só
  `motivoQueueRef.current.push({ leadId, leadNome })` (com dedupe: `if
  (!motivoQueueRef.current.some(q => q.leadId === leadId))`) + `setMotivoPerdaState({ open: true,
  leadNome: head })`. Um segundo drop enfileira atrás. `resolveMotivoPerda` ("Salvar motivo",
  linha 191-197): `shiftMotivoQueue()` (tira da frente + remove duplicatas do mesmo lead) →
  `commitStageChange(leadId, "perdido", motivoPerdaId)` (transição normal, otimista +
  `updateLeadStage`) → `advanceMotivoQueue()` abre o modal para o próximo pendente.
  "Cancelar" (`cancelMotivoPerda`): só `shiftMotivoQueue()` + `advanceMotivoQueue()` — o card
  nunca moveu, nada a reverter.
  Confirmado AO VIVO na quick task 260828-gna (janela visível): "modal abre sem freeze, card
  não move no drop, Cancelar fecha limpo" — o deadlock de `setMotivoPerdaState` dentro de
  `startTransition(async → await)` foi eliminado. A fila processa os dois leads em sequência.

### 7. (WR-01/WR-02) stageChangedAt e motivoPerda
expected: lead criado direto em "Contatado" fica elegível para "esfriando"; reativar lead antes "Perdido" limpa motivoPerda.
result: pass
evidence: |
  (code+data) WR-01: `createLead` (`lead-actions.ts:94-107`) grava `stageChangedAt: new Date()`
  no insert — um lead criado direto em "contatado" tem o relógio de "esfriando" armado desde a
  criação (sem isso ficaria `NULL` para sempre até a etapa mudar e voltar).
  WR-02: `updateLead` (linha 185-186), `updateLeadStage` (linha 264-265) e o form usam o idioma
  condicional-por-VALOR-ALVO: `motivoPerdaId: parsed.data.stage === "perdido" ?
  parsed.data.motivoPerdaId ?? null : null` — QUALQUER destino diferente de "perdido" (drag ou
  edição de formulário) força `motivoPerdaId` de volta a `null`. O `<MotivoPerdaCombobox>` só é
  renderizado no form quando `form.watch("stage") === "perdido"` (`lead-form-dialog.tsx:396`).
  Harness `verify:motivo-perda` (exit 0) — guarda D-04 (motivo obrigatório em "perdido")
  íntegra. `data/crm.db`: 0 leads em `stage = 'perdido'` hoje (todos os perdidos foram
  reabordados ou limpos) e nenhum lead não-perdido com `motivo_perda_id` preenchido.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Método de Verificação (Fase 18, D-01 revisado)

Navegador bloqueado por hardware (host 4GB). Verificação por code+data:

1. **Superfície:** `src/app/page.tsx`, `src/db/queries.ts` (`getActiveDashboardLeads`,
   `groupByUrgency`, `buildDashboardItems`), `followup-dashboard.tsx`,
   `whatsapp-preview-dialog.tsx`, `whatsapp-send-button.tsx`, `pipeline-board.tsx`,
   `pipeline-lead-card.tsx`, `motivo-perda-dialog.tsx`, `template-form-dialog.tsx`,
   `template-actions.ts`, `lead-actions.ts` (`createLead`/`updateLead`/`updateLeadStage`).
2. **Harnesses (exit 0):** `test:group-by-urgency` (régua de urgência + boundary CR-01
   provado literalmente), `test:lead-actions`, `verify:motivo-perda`.
3. **Query no `data/crm.db`:** 3 templates com um padrão por tipo; 0 leads perdidos; leads
   com `contact_attempts` e `stage_changed_at` consistentes.
4. **CR-02 (drag-to-Perdido):** confirmação AO VIVO herdada da quick 260828-gna.

### O que um pass de navegador ainda acrescentaria

- Renderização visual: cores das 3 seções de urgência, estado vazio "Tudo em dia!" (não
  observável hoje — 23 leads ativos), badge "Padrão" nos templates, toasts sonner.
- Fluxo de clique: criar lead → preview de 1º contato auto-abre com o subtítulo → fechar sem
  enviar → lead permanece.
- Disambiguação pointer real (drag vs. clique) no botão de WhatsApp do card do pipeline.
- Animação de fechamento do `WhatsAppPreviewDialog` (WR-04).

## Issues Encontradas

(nenhuma — auditoria code+data não encontrou defeito de runtime. Os 6 achados de
`04-REVIEW.md` já estavam confirmados como corrigidos por `04-VERIFICATION.md`; CR-01 e CR-02
agora têm prova adicional — harness e quick 260828-gna live, respectivamente.)

## Gaps

- Estado vazio do dashboard não observável (23 leads ativos) — lógica verificada por código.
- Renderização visual (cores, badges, toasts, animações) diferida para navegador.
- Nenhum gap bloqueia AUDIT-03.
