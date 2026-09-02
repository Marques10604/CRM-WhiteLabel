---
status: complete
phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
source: [06-VERIFICATION.md, 06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-07-30T13:32:54Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 0
method: "code+data (Fase 18 / AUDIT-04, D-01 revisado — navegador bloqueado por hardware). Leitura de registerWhatsAppContact (lead-actions.ts) + whatsapp-preview-dialog.tsx + pipeline-lead-card.tsx + as 3 superfícies + harnesses verify-wa-contact-invariant (15/15) e test:interacao-actions + query no data/crm.db (leads reais que já avançaram)."
audit: "Fase 18 — AUDIT-04"
---

## Current Test

[completo — 11/11 cenários com resultado. 10 pass por code+data, 1 skipped (layout puramente visual).]

## Tests

### 1. Pipeline: lead "Novo" → "Enviar WhatsApp" → manter "1º contato" → "Abrir WhatsApp"
expected: Aba wa.me abre, modal fecha, toast "{Nome} avançou para Contatado." aparece, card migra para coluna Contatado com ícone+"1x"
result: pass
evidence: |
  (code+data) `registerWhatsAppContact` (`src/actions/lead-actions.ts:332-393`):
  `advanced = tipo === "primeiro_contato" && current.stage === "novo"`; dentro da
  `db.transaction`, `UPDATE leads SET contact_attempts = contact_attempts + 1` (incondicional)
  + `...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {})`, com
  `WHERE id = ? AND deletedAt IS NULL AND stage = 'novo'` (stageGuard) — `.returning()` vazio
  se o stage mudou concorrentemente → `advanced` corrigido para false. `revalidatePath("/",
  "/pipeline", "/leads")`.
  `whatsapp-preview-dialog.tsx:196-224` — `<a href={waHref} target="_blank" rel="noopener
  noreferrer" onClick>`: `onOpenChange(false)` (modal fecha) + fire-and-forget
  `registerWhatsAppContact(leadId, tipo, texto).then(r => r.advanced && toast.success(
  \`${nome} avançou para Contatado.\`))` — string literal confirmada.
  `pipeline-lead-card.tsx:108-116` renderiza `<MessageCircle/> {contactAttempts}x` quando `> 0`;
  o card muda de coluna porque `/pipeline` relista `db.select().from(leads)` após revalidação.
  Harness `verify-wa-contact-invariant.cjs` (exit 0): "tabela-verdade: 15/15 pares corretos
  (verdadeiro só em primeiro_contato+novo)".
  Data: `data/crm.db` — `clinicainovecambe` (id 18) e `jamilasilva.esteticamt` (id 19) estão
  em `stage='contatado'` com `contact_attempts = 1` — o avanço automático + contador já rodou
  em produção neste exato caminho.

### 2. Mesmo lead (agora Contatado): repetir clique com "1º contato"
expected: Nenhum toast de avanço, lead permanece em Contatado, contador vai para "2x"
result: pass
evidence: |
  (code+data) O gate é `current.stage === "novo"` — para `stage='contatado'`, `advanced = false`,
  o `UPDATE` não seta `stage`/`stageChangedAt` (bloco condicional vazio), só incrementa
  `contact_attempts`. `whatsapp-preview-dialog.tsx` só chama `toast.success` quando
  `result.advanced` — nenhum toast.
  Harness `verify-wa-contact-invariant.cjs`: "acumulação/gate: lead1 (novo->contatado, 3x,
  nunca re-avança)" — a simulação de re-clique confirma que o contador acumula sem re-avanço.

### 3. Lead em Negociação: clicar "Abrir WhatsApp" com "1º contato"
expected: Etapa inalterada (nunca regride), contador incrementa
result: pass
evidence: |
  (code+data) Mesmo gate `current.stage === "novo"` → `advanced = false` para
  `negociacao`/`fechado`/`perdido`; nunca há `SET stage` que reduza a etapa (o único destino
  possível de `advanced` é `"contatado"`, e só a partir de `"novo"`). Contador incrementa
  incondicionalmente.
  Harness `verify-wa-contact-invariant.cjs`: "15/15 pares corretos" cobre as 3 tipos × 5
  etapas — `primeiro_contato` × `negociacao` → não avança. "lead2 (negociacao intocada, 1x)".
  Data: `dentista_juliaxavier` (id 17) está em `stage='negociacao'` com `contact_attempts = 3`
  — avançou além de Contatado (manualmente) e nunca regrediu apesar de 3 contatos registrados.

### 4. Abrir modal e cancelar (botão Cancelar, Escape, clique fora)
expected: Contador e etapa inalterados, nenhum toast
result: pass
evidence: |
  (code+data) `registerWhatsAppContact` só é chamado no `onClick` do `<a href={waHref}>`
  ("Abrir WhatsApp"). O botão "Cancelar" é `onClick={() => onOpenChange(false)}` puro
  (`whatsapp-preview-dialog.tsx:182`); Esc / clique fora acionam `onOpenChange` do `<Dialog>`
  sem nenhum caminho de escrita. Nenhuma mutação sem clicar em "Abrir WhatsApp".

### 5. Dashboard ("/"): lead Novo aberto com "Follow-up", trocar para "1º contato" antes de enviar
expected: Avança com toast (tipo vivo do Select vale, não o defaultTipo)
result: pass
evidence: |
  (code+data) `whatsapp-preview-dialog.tsx:97-108` `handleTipoChange(nextTipo)` → `setTipo(nextTipo)`
  + recomputa `texto`. O `onClick` do `<a>` chama `registerWhatsAppContact(leadId, tipo, texto)`
  com a variável de STATE `tipo` (linha 206), nunca `defaultTipo`. Então trocar o Select para
  "1º contato" num lead Novo → `advanced = true` → toast. O dashboard abre o preview com
  `defaultTipo="follow_up"` (`followup-dashboard.tsx:304`), mas o valor vivo do Select prevalece.

### 6. Dashboard: lead Novo, manter "Follow-up", enviar
expected: Não avança, sem toast, contador incrementa
result: pass
evidence: |
  (code+data) `advanced = parsed.data.tipo === "primeiro_contato" && current.stage === "novo"`
  → `follow_up` → `false`, sem toast, sem `SET stage`. `contact_attempts + 1` incondicional.
  Bônus: `avancaSequencia = parsed.data.tipo === "follow_up"` (`lead-actions.ts:351`) →
  `SET sequencia_posicao = sequencia_posicao + 1` — só `follow_up` avança a cadência escalonada.

### 7. /leads: enviar "1º contato" num lead Novo (tela com vários leads visíveis)
expected: Toast com o nome correto do lead, etapa atualizada na tabela
result: pass
evidence: |
  (code+data) `lead-table.tsx:373-382` renderiza um único `<WhatsAppPreviewDialog>` controlado
  por `previewState` (`{ open, lead, nichoNome }`) — o lead da linha clicada. O `onClick` do
  `<a>` captura `const nome = lead.nome` ANTES de `onOpenChange(false)`
  (`whatsapp-preview-dialog.tsx:203-205`), então o toast `\`${nome} avançou para Contatado.\``
  usa o nome do lead certo, não de outro visível. `revalidatePath("/leads")` re-renderiza a
  tabela com a etapa nova.

### 8. Criar lead novo (auto-gatilho de 1º contato) e fechar sem enviar
expected: Contador em 0, nada extra no card
result: pass
evidence: |
  (code+data) `createLead` não toca `contactAttempts` — a coluna tem `DEFAULT 0 NOT NULL`
  (`schema.ts`, confirmado por `verify:schema`). O auto-gatilho (`lead-form-dialog.tsx:153`)
  só ABRE o `<WhatsAppPreviewDialog>`; fechar sem clicar "Abrir WhatsApp" → `firstContact.close()`,
  nenhuma chamada a `registerWhatsAppContact`. `pipeline-lead-card.tsx:108` só renderiza o
  indicador quando `contactAttempts > 0` → card limpo.

### 9. Importar CSV, em /importar/[batchId], clicar "Abrir WhatsApp" de um lead
expected: Aba abre; ao voltar a /pipeline, card mostra "1x" e lead está em Contatado
result: pass
evidence: |
  (code+data) `bulkImportLeads` cria os leads com `stage: "novo"` (`import-actions.ts:160`).
  `src/app/importar/[batchId]/page.tsx` → `PostImportLeadList` renderiza o MESMO
  `<WhatsAppPreviewDialog defaultTipo="primeiro_contato">` (02-03-SUMMARY: "reaproveitando 100%
  do mecanismo de WhatsApp da Fase 4"). Clicar "Abrir WhatsApp" com "1º contato" num lead Novo
  → `registerWhatsAppContact` → `advanced = true` → `stage='contatado'`, `contact_attempts = 1`
  → `revalidatePath("/pipeline")`. `06-VERIFICATION.md` truth 1 confirmou que o diálogo
  compartilhado cobre as 6 call sites (incl. `importar/[batchId]/page.tsx`).

### 10. Card com contador 0
expected: Nenhum ícone/número extra aparece (D-06)
result: pass
evidence: |
  (code+data) `pipeline-lead-card.tsx:108` — `{lead.contactAttempts > 0 ? (<span>...
  {lead.contactAttempts}x</span>) : null}` — condicional estrita `> 0`. Data: `data/crm.db`
  tem 20 leads ativos com `contact_attempts = 0` (só 17/18/19 têm > 0) — o caso "sem indicador"
  é o normal hoje.
  Nota: a ausência de pixels no card é confirmável 100% só em navegador; o condicional de
  render está verificado por código.

### 11. Card simultaneamente "Esfriando" e com contador > 0
expected: Os dois indicadores aparecem na mesma linha, sem quebra de layout, cores distintas (âmbar vs. neutro)
result: skipped
evidence: |
  Requer navegador; diferido. É um cenário PURAMENTE VISUAL (layout não quebra + cores
  distintas lado a lado). Reforço por código: `pipeline-lead-card.tsx:101-116` — os dois
  indicadores estão no mesmo container `flex flex-wrap items-center gap-x-2 gap-y-0.5`;
  "Esfriando" usa `text-[#B45309]` (âmbar) e o contador herda `text-muted-foreground`
  (neutro) — cores distintas por token. `flex-wrap` previne overflow horizontal. Mas
  "sem quebra de layout" só é observável renderizando o card com os dois estados ativos —
  cenário não reproduzível sem navegador nem dados que combinem esfriando + contador > 0 no
  banco real (T-18-01: não criar dados de teste).

## Summary

total: 11
passed: 10 (code+data)
issues: 0
pending: 0
skipped: 1 (cenário 11 — layout puramente visual)
blocked: 0

## Método de Verificação (Fase 18, D-01 revisado)

Navegador bloqueado por hardware (host 4GB). Verificação por code+data:

1. **Superfície:** `registerWhatsAppContact` (`src/actions/lead-actions.ts:332-393`),
   `whatsapp-preview-dialog.tsx`, `pipeline-lead-card.tsx`, e as 3 superfícies onde o botão
   aparece (`/`, `/leads`, `/importar/[batchId]`, + `/pipeline`).
2. **Harnesses (exit 0):** `verify-wa-contact-invariant.cjs` (tabela-verdade 15/15: avanço só
   em `primeiro_contato + novo`; acumulação do contador; nunca re-avança), `test:interacao-actions`
   (insert incondicional em `interacoes` por clique, imutabilidade).
3. **Query no `data/crm.db`:** leads 18/19 (`novo → contatado`, `1x`), lead 17 (`negociacao`,
   `3x`, nunca regrediu), 20 leads com `contact_attempts = 0` — o comportamento já rodou em
   produção nos 3 caminhos (avança / não avança / não regride).

### O que um pass de navegador ainda acrescentaria

- Renderização do toast sonner "{Nome} avançou para Contatado.".
- Migração visual do card entre colunas do board.
- Pixels do indicador `<MessageCircle/> 1x` no card e do layout esfriando + contador na mesma
  linha (cenário 11).

## Issues Encontradas

(nenhuma — auditoria code+data não encontrou defeito de runtime. O caveat WR-01 do
`06-REVIEW.md` — TOCTOU estreito no `WHERE` da escrita — foi FECHADO pela quick 260811-pb1,
que adicionou a reverificação de stage no `WHERE` atômico da transação; refletido em
`lead-actions.ts:354,362`.)

## Gaps

- Cenário 11: layout "esfriando + contador na mesma linha sem quebra" — skipped, requer navegador.
- Cenário 10: ausência de pixels no card com contador 0 — condicional de render verificado por código; pixel-perfect diferido.
- Nenhum gap bloqueia AUDIT-04.
