# Phase 6: Auto-avanço de Etapa + Contador de Tentativas - Research

**Researched:** 2026-07-31
**Domain:** Instrumentação de um `onClick` de mutação de servidor num link `<a href="wa.me/...">` já existente, num CRM Next.js 16 (App Router, Server Actions) + Drizzle + SQLite já em produção
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**O que conta como "tentativa de contato" (WA-08)**
- **D-01:** Só o clique final no link "Abrir WhatsApp" dentro do modal de preview (`WhatsAppPreviewDialog`) conta como tentativa — abrir o modal (pelo `WhatsAppSendButton` no card) e cancelar sem enviar **não** conta.
- **D-02:** Cada clique em "Abrir WhatsApp" conta separado, mesmo múltiplos cliques na mesma sessão do modal (ex: trocar de tipo de template e clicar de novo) — cada abertura de aba é uma tentativa real.
- **D-03:** O clique também conta quando o modal foi aberto automaticamente (gatilho de 1º contato pós-criação de lead, D-18/D-19 da Fase 4; e na tela pós-importação de CSV, `/importar/[batchId]`) — mesmo componente reusado em todas as telas, sem exceção de como o modal foi aberto.
- **D-04:** O contador acumula pela vida toda do lead, através de todas as etapas do funil (Novo→Contatado→Negociação→Fechado/Perdido) — nunca zera ao mudar de etapa. Reflete esforço total investido no lead.

**Exibição do contador no card (WA-08)**
- **D-05:** Formato visual: ícone (ex: `MessageCircle`, mesmo ícone já usado no botão de WhatsApp) + número (ex: "3x") — discreto, consistente com o padrão visual já usado pro badge "Esfriando" (ícone `Clock` + texto) em `pipeline-lead-card.tsx`.
- **D-06:** Só aparece quando o contador for > 0 — lead ainda sem nenhum clique em WhatsApp não mostra nada extra no card, mesmo padrão do "Esfriando" (só aparece quando relevante), mantém o card limpo pra leads novos.

**Texto do toast de auto-avanço (WA-06)**
- **D-07:** Toast personalizado com o nome do lead, ex: **"{Nome} avançou para Contatado."** — diferente do toast genérico já usado no drag-and-drop manual (`"Lead movido para {etapa}."` em `pipeline-board.tsx`), pois o auto-avanço pode acontecer em telas com múltiplos leads visíveis (dashboard, lista) onde o admin precisa saber qual lead mudou, não só no board onde o contexto já é visual.

### Claude's Discretion
- **Mecanismo técnico de disparo da mutação de servidor.** Hoje o botão "Abrir WhatsApp" dentro de `WhatsAppPreviewDialog` é um `<a href={waHref}>` puro (linhas 165-178) — nenhuma Server Action é chamada nesse clique atualmente. Implementar uma nova mutação de servidor (nome/shape a definir, ex: `registerWhatsAppClick(leadId, tipo)`) que roda no `onClick` do link, em paralelo à navegação (o link abre em nova aba via `target="_blank"`, então não precisa bloquear a navegação esperando a resposta do servidor).
- Nome/shape exato do novo campo de schema para o contador (`contactAttempts` ou similar) e se a migração usa um valor default 0 ou nullable com fallback — implementação, não decisão de produto.
- Reuso ou extensão de `updateLeadStage()` (`src/actions/lead-actions.ts`) vs. nova função dedicada para a lógica combinada de auto-avanço + incremento de contador — arquitetura, não especificado pelo admin.
- Exato texto/cor/spacing do ícone+número do contador (D-05) além do padrão geral já descrito — CSS/layout não especificado pelo admin.
- Se o auto-avanço dispara mesmo quando o modal foi aberto com `defaultTipo` diferente de "1º contato" mas o admin trocou manualmente pro tipo "1º contato" antes de clicar em Abrir WhatsApp — a leitura literal do WA-06 ("com o template de primeiro contato") indica que sim (o tipo no momento do clique é o que importa, não o tipo default do contexto de abertura), consistente com D-15 da Fase 4 (seletor de tipo trocável antes de enviar). **Research confirma esta leitura como correta — ver Pitfall 3 abaixo — e resolve a questão definitivamente: usar o estado vivo `tipo`, nunca a prop `defaultTipo`.**

### Deferred Ideas (OUT OF SCOPE)
Nenhuma nova ideia de escopo surgiu durante a discussão desta fase — ficou dentro do domínio da fase.

Itens explicitamente fora de escopo (de `.planning/REQUIREMENTS.md`):
- Auto-avanço em qualquer clique de template (não só primeiro_contato)
- Tratar clique no link wa.me como confirmação de mensagem enviada
- Escalonamento visual/lógico do contador de tentativas (cores, "desistir automaticamente")
- Thresholds de dias-parado por sub-nicho
- Notificações/e-mail sobre lead esfriando
- Auto-avanço além da etapa Contatado (Negociação→Fechado, etc.)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WA-06 | Ao clicar em "Abrir WhatsApp" com o template de primeiro contato, um lead na etapa "Novo" avança automaticamente para "Contatado", com toast de confirmação — vale em todas as telas onde o botão de WhatsApp aparece | Pattern 1 (choke point único em `WhatsAppPreviewDialog`) + Pattern 2 (`registerWhatsAppContact`, gate `tipo === "primeiro_contato" && current.stage === "novo"`) + D-07 (texto do toast) |
| WA-07 | O auto-avanço nunca regride nem re-avança um lead que já passou de "Contatado" — só dispara a partir da etapa "Novo" | Pitfall 4 (checagem sempre server-side via SELECT fresco, nunca `lead.stage` do prop client) + Pattern 2 (condição `current.stage === "novo"` lida no momento da escrita) |
| WA-08 | Todo clique em "Abrir WhatsApp" (qualquer template, em qualquer etapa do lead) incrementa um contador de tentativas de contato por lead, visível no card do pipeline | Pattern 2 (incremento atômico `sql\`${leads.contactAttempts} + 1\`` incondicional) + D-01/D-02/D-03/D-04 (o que conta) + D-05/D-06 (exibição no `PipelineLeadCard`) |

</phase_requirements>

## Summary

Esta fase é uma modificação cirúrgica de um único arquivo de componente (`src/components/whatsapp-preview-dialog.tsx`) mais uma nova Server Action e uma migração de schema aditiva — não uma feature nova de arquitetura. A pesquisa em nível de milestone (`.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `FEATURES.md`), já feita e verificada contra o código real deste projeto em 2026-07-30, cobre exatamente o escopo de WA-06/WA-07/WA-08 e foi validada nesta sessão linha a linha contra os arquivos-fonte atuais (`whatsapp-preview-dialog.tsx`, `lead-actions.ts`, `pipeline-lead-card.tsx`, `schema.ts`, os 4 componentes que abrem o dialog, e o hook `use-first-contact-trigger.ts`) — nenhuma divergência encontrada entre a pesquisa de milestone e o estado atual do código.

O fato mais importante descoberto na pesquisa de milestone (confirmado de novo agora): existe **um único lugar em todo o app** onde o link `wa.me` real é renderizado e clicado — o `<a href={waHref}>` dentro de `WhatsAppPreviewDialog` (linhas 165-178). Os 5 pontos de montagem (`pipeline-board.tsx`, `followup-dashboard.tsx`, `lead-table.tsx`, `post-import-lead-list.tsx`, e o auto-gatilho dentro de `lead-form-dialog.tsx` via `useFirstContactTrigger`) só abrem o modal — nenhum deles renderiza o link diretamente. Isso significa que toda a lógica nova (contador + auto-avanço) vive em um único arquivo, nunca duplicada nos 5 chamadores.

Zero pacotes novos são necessários — Next.js Server Actions, Drizzle ORM, `sonner` e `lucide-react` já instalados resolvem 100% do escopo. A única mutação de servidor nova é `registerWhatsAppContact(leadId, tipo)`, que reusa o idioma SELECT-then-conditional-write já estabelecido em `updateLeadStage`/`updateLead`, faz um único `UPDATE` atômico (incremento do contador sempre + avanço de etapa condicional), e é chamada de forma fire-and-forget (sem `preventDefault`, sem `await` antes da navegação) no mesmo `onClick` que já fecha o dialog hoje.

**Primary recommendation:** Adicionar `contactAttempts` (integer, `NOT NULL DEFAULT 0`) à tabela `leads` via migração aditiva (`drizzle-kit generate` + `migrate`, padrão já estabelecido no projeto); criar `registerWhatsAppContact(leadId, tipo)` em `src/actions/lead-actions.ts` ao lado de `updateLeadStage`; disparar essa Server Action de forma fire-and-forget dentro do `onClick` já existente do `<a href={waHref}>` em `whatsapp-preview-dialog.tsx`, gatilhando o toast (D-07) via `.then()`; exibir o contador em `pipeline-lead-card.tsx` seguindo exatamente o padrão condicional já usado pelo badge "Esfriando".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detecção do clique "Abrir WhatsApp" real (vs. apenas abrir o modal) | Browser / Client | — | Evento de UI puro (`onClick` num `<a>`); só o React Client Component sabe o momento exato do clique de commit |
| Navegação para `wa.me` (abrir nova aba) | Browser / Client | — | Comportamento nativo do `<a target="_blank">`, não precisa (e não deve) ser interceptado com `preventDefault` |
| Gate de auto-avanço (é "novo" + tipo é "primeiro_contato"?) | API / Backend | — | Regra de negócio com invariante crítico ("nunca regride/re-avança") — deve ler estado fresco do banco, nunca confiar em prop client-side (Pitfall 4) |
| Incremento do contador de tentativas | API / Backend | Database / Storage | Escrita atômica (`SET contact_attempts = contact_attempts + 1`) — nunca read-modify-write em JS, que introduziria race condition sob cliques rápidos |
| Persistência de `contactAttempts`/etapa | Database / Storage | — | Coluna nova na tabela `leads` já existente, sem tabela nova |
| Exibição do contador no card do pipeline | Browser / Client | — | Renderização condicional pura a partir da prop `lead` já recebida (nenhum novo fetch) |
| Toast de confirmação de auto-avanço | Browser / Client | API / Backend (retorno da Server Action) | Client dispara o toast a partir do resultado (`{ advanced: boolean }`) retornado pela Server Action, após a navegação já ter ocorrido |

## Standard Stack

### Core

Nenhum pacote novo. Toda a implementação usa o stack já instalado.

| Library | Version | Purpose nesta fase | Why Standard |
|---------|---------|---------------------|----------------|
| Next.js Server Actions | 16.2.10 [VERIFIED: local install — `package.json`] | Nova mutação `registerWhatsAppContact`, chamada diretamente (não via `<form>`) a partir de um `onClick` | Já é o padrão do projeto para toda mutação (`updateLeadStage` já é chamada assim, de dentro de `handleDragEnd`) — nenhuma rota de API nova necessária |
| Drizzle ORM + drizzle-kit | 0.45.2 / 0.31.10 [VERIFIED: local install — `npx drizzle-kit --version` confirma `drizzle-kit: v0.31.10`, `drizzle-orm: v0.45.2`, batendo com `package.json`] | Nova coluna `contactAttempts` em `leads`; escrita atômica via `sql\`${leads.contactAttempts} + 1\`` | `sql` já está importado em `lead-actions.ts` (linha 10) — zero import novo necessário |
| better-sqlite3 | 12.11.1 [VERIFIED: local install — `package.json`] | Driver local, transação síncrona se a escrita for envolvida em `db.transaction()` | Sem mudança de driver |
| sonner | 2.0.7 [VERIFIED: local install — `package.json`] | Toast de confirmação do auto-avanço (D-07) | Já é o padrão de toast do app; precedente direto em `pipeline-board.tsx:141` |
| lucide-react | 1.25.0 [VERIFIED: local install — `package.json`] | Ícone `MessageCircle` para o contador no card (D-05), reusando o ícone já usado no botão de WhatsApp | Mesmo ícone já usado em `whatsapp-send-button.tsx` e `whatsapp-preview-dialog.tsx` |

### Supporting

Nenhuma nova. Zod já usado em todo Server Action do projeto (`stageUpdateSchema` é o precedente direto para validar `leadId`/`tipo` na nova action — ver Common Pitfalls/Security Domain abaixo).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Uma única Server Action combinada (`registerWhatsAppContact`) | Duas Server Actions separadas (`incrementContactAttempts` + `updateLeadStage` reusada) | Rejeitado — falha parcial deixa contador incrementado sem avanço de etapa ou vice-versa, sem UI de retry/confirmação para recuperar (Pitfall 6 abaixo) |
| Reusar/estender `updateLeadStage(id, stage, motivoPerda)` para o auto-avanço | Nova função dedicada `registerWhatsAppContact` | Rejeitado reusar — `updateLeadStage` recebe etapa-alvo explícita do chamador (drag-and-drop) e tem semântica de `motivoPerda` amarrada a movimentos arbitrários; o auto-avanço é unidirecional e estritamente condicional (`novo→contatado` apenas), a guarda pertence ao servidor, não ao chamador |
| Contador como coluna simples `INTEGER NOT NULL DEFAULT 0` | Tabela separada de histórico de tentativas (1 linha por clique) | Fora de escopo — WA-08 pede só um número visível no card, não histórico auditável; anti-feature explícito em `FEATURES.md`/REQUIREMENTS.md Out of Scope ("escalonamento... cores... desistir automaticamente") |

**Installation:**
```bash
# Nenhuma instalação necessária — zero pacotes novos.
```

**Version verification:** confirmada via `npx drizzle-kit --version` executado nesta sessão contra o ambiente real do projeto (não apenas lido do `package.json`) — ver tabela acima.

## Package Legitimacy Audit

**Não aplicável a esta fase.** Nenhum pacote externo novo é instalado — toda a implementação usa dependências já presentes em `package.json` (confirmado acima). O gate de legitimidade de pacotes (slopcheck/registry) não precisa rodar.

## Architecture Patterns

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│  5 pontos de montagem que abrem WhatsAppPreviewDialog (inalterados)         │
│  pipeline-board.tsx · followup-dashboard.tsx · lead-table.tsx ·             │
│  post-import-lead-list.tsx · lead-form-dialog.tsx (via useFirstContactTrigger)│
│  — todos só chamam setPreviewState({ open:true, lead, subnichoNome })       │
└───────────────────────────┬───────────────────────────────────────────────┘
                             │ abre (não conta como tentativa — D-01)
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  WhatsAppPreviewDialog (src/components/whatsapp-preview-dialog.tsx)         │
│  estado vivo: tipo (Select), texto (Textarea)                               │
│                                                                               │
│  admin clica "Abrir WhatsApp" → <a href={waHref} target="_blank">           │
│     ├──(síncrono, nativo)──► nova aba abre wa.me imediatamente              │
│     └──(fire-and-forget, sem preventDefault/await)──►                       │
│           registerWhatsAppContact(lead.id, tipo)  [Server Action]           │
└───────────────────────────┬───────────────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  registerWhatsAppContact (src/actions/lead-actions.ts, NOVA)                │
│  1. SELECT stage FROM leads WHERE id=? AND deletedAt IS NULL (fresco!)      │
│  2. advanced = tipo==="primeiro_contato" && current.stage==="novo"          │
│  3. UPDATE leads SET contact_attempts = contact_attempts+1  (sempre)        │
│              , stage='contatado', stage_changed_at=now       (se advanced)  │
│  4. revalidatePath("/", "/pipeline", "/leads")                              │
│  5. return { advanced }                                                     │
└───────────────────────────┬───────────────────────────────────────────────┘
                             │ .then((result) => ...)
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Client: se result.advanced → toast.success("{Nome} avançou para Contatado.")│
│  (D-07) — dispara DEPOIS da aba já ter aberto, nunca bloqueia               │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  Caminho SEPARADO, não tocado por esta fase                                 │
│  pipeline-board.tsx onDragEnd → updateLeadStage(id, stage, motivoPerda)     │
│  (useOptimistic + startTransition) — semântica diferente, ver Pitfall 5     │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PipelineLeadCard — exibição (D-05/D-06)                                    │
│  lead.contactAttempts > 0 → <MessageCircle size-3.5/> {n}x, ao lado do      │
│  indicador "Esfriando" já existente, mesma linha de metadados do card       │
└───────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (delta apenas)

```
src/
├── db/
│   └── schema.ts                       # MODIFICAR: adicionar coluna contactAttempts em `leads`
│   └── migrations/000X_*.sql           # NOVO: migração aditiva (drizzle-kit generate)
├── actions/
│   └── lead-actions.ts                 # MODIFICAR: adicionar registerWhatsAppContact()
├── lib/
│   └── validations.ts                  # MODIFICAR: adicionar schema de validação p/ leadId+tipo
├── components/
│   ├── whatsapp-preview-dialog.tsx     # MODIFICAR: onClick do <a href={waHref}> (ÚNICO lugar de lógica nova de UI)
│   └── pipeline-lead-card.tsx          # MODIFICAR: renderizar contador condicional (D-05/D-06)
```

Nenhuma pasta nova. `registerWhatsAppContact` fica em `lead-actions.ts` — mesma tabela (`leads`), mesmo arquivo que já tem `updateLeadStage`/`updateLead`/`createLead`.

### Pattern 1: Single shared "send" choke point instead of per-surface wiring

**What:** Os 5 pontos de montagem só chamam `setPreviewState({ open: true, lead, subnichoNome })` — nenhum deles renderiza `<a href="wa.me/...">` diretamente. Esse anchor existe em exatamente um lugar: o footer de `WhatsAppPreviewDialog` (`whatsapp-preview-dialog.tsx:165-178`).

**When to use:** Sempre que N superfícies convergem para 1 componente de modal/dialog compartilhado para a ação de "commit" — colocar efeitos colaterais de commit (chamadas de Server Action, contadores) no componente que possui o elemento de UI de commit, nunca nos N chamadores que só abrem o modal.

**Example:**
```tsx
// src/components/whatsapp-preview-dialog.tsx
import { toast } from "sonner";
import { registerWhatsAppContact } from "@/actions/lead-actions";

// ...substituir o onClick existente do <a href={waHref}>:
<a
  href={waHref}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => {
    onOpenChange(false); // inalterado — fecha o dialog imediatamente, nunca bloqueia
    if (lead) {
      // Fire-and-forget: sem `await`, sem `preventDefault()`. A navegação
      // nativa do <a target="_blank"> prossegue de forma síncrona,
      // independente desta promise.
      registerWhatsAppContact(lead.id, tipo)
        .then((result) => {
          if (result.advanced) {
            toast.success(`${lead.nome} avançou para Contatado.`); // D-07, texto travado
          }
        })
        .catch(() => {
          // Silencioso por design: uma falha na escrita de contador/avanço
          // nunca deve exibir erro sobre uma aba do WhatsApp que já abriu.
        });
    }
  }}
  className={cn(buttonVariants(), "gap-1.5 bg-[#0D9488] text-white hover:bg-[#0D9488]/90")}
>
  <MessageCircle />
  Abrir WhatsApp
</a>
```
Crítico: `tipo` é o **estado vivo do Select** (`const [tipo, setTipo] = useState<Template["tipo"]>(defaultTipo)`), nunca a prop `defaultTipo` — ver Pitfall 3.

*Fonte: `.planning/research/ARCHITECTURE.md` Pattern 1 (pesquisa de milestone 2026-07-30), verificada linha a linha contra `whatsapp-preview-dialog.tsx` real nesta sessão — nenhuma divergência.*

### Pattern 2: Uma Server Action combinada, não duas, e não uma bifurcação de `updateLeadStage`

**What:** `registerWhatsAppContact(leadId, tipo)` faz o incremento do contador E o avanço condicional de etapa num único `UPDATE` (uma query, um round-trip de rede a partir do clique).

**Example:**
```ts
// src/actions/lead-actions.ts — novo export, mesmo arquivo de updateLeadStage/updateLead
export async function registerWhatsAppContact(
  leadId: number,
  tipo: Template["tipo"]
): Promise<{ advanced: boolean }> {
  // Mesmo idioma SELECT-then-conditional-write já usado por updateLead
  // (linha ~113) e updateLeadStage (linha ~166) — a etapa atual decide se
  // a escrita também avança o pipeline.
  const [current] = await db
    .select({ stage: leads.stage })
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  if (!current) {
    // Lead soft-deletado/removido entre o render e o clique — corrida rara,
    // nunca surface um erro aqui (fire-and-forget, ver Pattern 1).
    return { advanced: false };
  }

  const advanced = tipo === "primeiro_contato" && current.stage === "novo";

  await db
    .update(leads)
    .set({
      contactAttempts: sql`${leads.contactAttempts} + 1`, // incremento atômico, nunca read-then-write
      ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
    })
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)));

  revalidatePath("/");
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  return { advanced };
}
```

**Why NOT reuse/estender `updateLeadStage`:** `updateLeadStage(id, stage, motivoPerda)` recebe uma etapa-alvo **explícita** do chamador (coluna de destino do drag-and-drop) e possui semântica de `motivoPerda` amarrada a movimentos arbitrários de-qualquer-etapa-para-qualquer-etapa. A transição do clique de WhatsApp é diferente em natureza: é um avanço estritamente unidirecional `novo → contatado` que **nunca deve disparar para outras etapas** (WA-07 — "nunca regride nem re-avança um lead que já passou de Contatado"). Forçar isso na assinatura de `updateLeadStage` significaria um condicional calculado pelo chamador duplicado no call site de qualquer forma — a guarda pertence ao servidor.

*Fonte: `.planning/research/ARCHITECTURE.md` Pattern 2, verificada contra `lead-actions.ts` real nesta sessão — `sql` já importado (linha 10), `and`/`eq`/`isNull` já importados, `db.transaction()` NÃO é necessário aqui (um único `UPDATE` já é atômico no SQLite; a leitura prévia é só para decidir o valor de `advanced`, não precisa de transação explícita porque não há segunda escrita dependente — diferente do que Pitfall 6 abaixo assumia ao sugerir uma transação).*

### Anti-Patterns to Avoid

- **Wiring per-surface (5 call sites) em vez do choke point único:** Adicionar um callback `onSend` em `WhatsAppSendButton` e fazer cada um dos 5 chamadores disparar `registerWhatsAppContact` antes/depois de abrir o dialog. Errado porque abrir o dialog não é enviar — contaria toda criação/importação de lead como uma tentativa de contato fantasma (o auto-gatilho de `lead-form-dialog.tsx` abre o dialog programaticamente após todo `createLead`).
- **`preventDefault()` + `await` + `window.open()` para "garantir que a mutação terminou antes de abrir":** Quebra silenciosamente — `window.open()` chamado depois de um `await` sai da pilha de chamada síncrona do gesto do usuário e é bloqueado como popup pela maioria dos navegadores. Manter o `<a href>` real intocado, sem `preventDefault`.
- **Duas Server Actions separadas (contador + avanço) chamadas em sequência do client:** Falha parcial deixa o lead com contador incrementado mas sem avanço de etapa (ou vice-versa), sem UI de retry para recuperar — sempre um único `UPDATE`.
- **Gate de auto-avanço lido do prop `lead.stage` ou da prop `defaultTipo` do dialog:** Ambos podem estar obsoletos no momento do clique (lead arrastado no board segundos antes; admin trocou o tipo manualmente) — sempre ler `tipo` do estado vivo do Select e `stage` de um `SELECT` fresco no servidor.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Incremento de contador sob cliques concorrentes/rápidos | Ler o valor atual em JS, somar 1, escrever de volta (read-modify-write) | Expressão SQL atômica `sql\`${leads.contactAttempts} + 1\`` dentro do `UPDATE` | Read-modify-write em JS tem uma janela de corrida entre o SELECT e o UPDATE — dois cliques rápidos no mesmo lead podem perder um incremento. A expressão SQL delega a atomicidade ao próprio SQLite. |
| Confirmação de que a mensagem foi realmente enviada no WhatsApp | Qualquer heurística client-side (ex: detectar foco de volta na aba, timers) para inferir "enviado" | Nada — o clique no link é o único sinal que o app pode observar, e é isso que WA-08 pede (uma "tentativa", não uma confirmação de envio). Explicitamente fora de escopo por REQUIREMENTS.md ("Tratar clique no link wa.me como confirmação de mensagem enviada") | Não há integração com WhatsApp Business API neste projeto (constraint de CLAUDE.md) — qualquer heurística de "enviado de verdade" seria frágil e enganosa |

**Key insight:** Esta fase não introduz nenhum problema novo de engenharia — é 100% reuso de idiomas já estabelecidos no próprio código (`SELECT`-then-conditional-`UPDATE`, `revalidatePath` nas 3 rotas que exibem leads, indicador condicional no card). O único "novo" é o padrão fire-and-forget de uma Server Action chamada de um `onClick` de `<a>` sem bloquear a navegação — e mesmo esse padrão já tem precedente direto no próprio `onClick={() => onOpenChange(false)}` que já existe hoje no mesmo elemento.

## Common Pitfalls

> As 7 primeiras pitfalls abaixo vêm de `.planning/research/PITFALLS.md` (pesquisa de milestone 2026-07-30), re-verificadas nesta sessão contra o código-fonte atual — nenhuma divergência encontrada. A pitfall 8 é um achado adicional desta sessão de pesquisa de fase.

### Pitfall 1: Instrumentar o handler de clique errado (botão de superfície vs. anchor de commit do dialog)
**What goes wrong:** Cada superfície tem seu próprio `onClick` que só abre o dialog (`onSendWhatsApp` em `pipeline-board.tsx`, o botão-ícone via `WhatsAppSendButton` em `followup-dashboard.tsx`/`post-import-lead-list.tsx`, o botão nomeado em `lead-table.tsx`). É natural, ao ler "incrementar a cada clique no botão de WhatsApp", instrumentar esses 4 `onClick`s. Errado — clicar neles só abre a textarea editável, nenhuma mensagem foi enviada, nenhuma aba abriu, o admin ainda pode trocar o tipo ou cancelar.
**How to avoid:** Adicionar a mutação exclusivamente dentro do `<a href={waHref} onClick={...}>` já existente em `whatsapp-preview-dialog.tsx` (linhas 165-178), nunca nos 4 chamadores.
**Warning signs:** Contador incrementa no instante em que o dialog abre (antes do admin ver o texto da mensagem); um lead avança para "Contatado" no instante em que o gatilho automático de `lead-form-dialog.tsx` abre o dialog na criação, mesmo se o admin clicar Cancelar imediatamente.

### Pitfall 2: `preventDefault()` + `await`-antes-de-`window.open()` quebra o anchor e dispara bloqueador de popup
**What goes wrong:** O elemento atual já é um `<a href={waHref} target="_blank">` real — `waHref` já é computado sincronamente a cada render a partir do `texto` vivo (doc comment do próprio componente, linhas 56-57). É tentador fazer `onClick={async (e) => { e.preventDefault(); await mutation(); window.open(waHref) }}` para "confirmar que a mutação terminou antes de enviar". Isso quebra silenciosamente: `window.open()` fora da pilha de chamada síncrona do clique (há um `await` no meio) é tratado como popup não-iniciado-pelo-usuário e bloqueado por navegadores — o admin clica e nada acontece, sem nenhum erro visível no app hoje.
**How to avoid:** Manter o `<a href>` real, sem `preventDefault()`. Disparar a Server Action como efeito colateral não-bloqueante no mesmo `onClick`, deixando a navegação nativa do anchor prosseguir por seu próprio caminho síncrono (o dialog já fecha via `onOpenChange(false)` no mesmo handler sem bloquear navegação — seguir esse precedente já existente).
**Warning signs:** "Abrir WhatsApp" silenciosamente não faz nada em alguns cliques mas funciona em outros (sintoma clássico de bloqueador de popup); funciona com devtools/throttling desligado mas falha sob rede lenta.

### Pitfall 3: Gatear no tipo errado — prop `defaultTipo` vs. estado vivo `tipo`
**What goes wrong:** `WhatsAppPreviewDialog` recebe uma prop `defaultTipo` do chamador (`"primeiro_contato"` de pipeline/lead-table/post-import, `"follow_up"` do dashboard) mas o admin pode trocar o tipo real via o `<Select>` "Tipo de mensagem" antes de clicar enviar — `tipo` é um `useState` separado, reinicializado a partir de `defaultTipo` só na abertura (linhas 68, 75-87). Gatear o auto-avanço na prop `defaultTipo` em vez do estado vivo `tipo` produz dois comportamentos errados: (a) um lead aberto do dashboard (`defaultTipo="follow_up"`) onde o admin troca manualmente para "1º contato" e envia NÃO avançaria, mesmo a spec sendo agnóstica de superfície ("todas as telas onde o botão aparece"); (b) um lead aberto do pipeline (`defaultTipo="primeiro_contato"`) onde o admin troca para "Follow-up" antes de enviar avançaria incorretamente.
**How to avoid:** Gatear exclusivamente no estado vivo `tipo` do dialog, lido no momento do clique (`tipo === "primeiro_contato"`), nunca na prop `defaultTipo`. **Isto resolve definitivamente a questão em aberto do CONTEXT.md** ("tipo no momento do clique é o que importa, não o tipo default do contexto de abertura").
**Warning signs:** Lead contatado com mensagem "1º contato" pelo dashboard não avança; lead contatado com mensagem "Follow-up" pelo pipeline avança mesmo assim.

### Pitfall 4: O gate de auto-avanço precisa ser re-checado no servidor, atomicamente, imediatamente antes da escrita — nunca confiar no `lead.stage` do client
**What goes wrong:** O dialog recebe `lead: Lead` como prop, capturada no momento em que `setPreviewState({ lead, ... })` rodou no chamador pai. Se a checagem do gate ("só avança quando atualmente em Novo") for feita client-side contra essa prop (`lead.stage === "novo"`), pode estar obsoleta: o lead pode ter sido arrastado para outra coluna (via drag-and-drop otimista do board) nos segundos entre o dialog abrir e o admin clicar enviar.
**How to avoid:** Fazer a checagem "este lead está atualmente em Novo" dentro da nova Server Action, via um `SELECT stage FROM leads WHERE id = ? AND deletedAt IS NULL` fresco imediatamente antes do `UPDATE` condicional — reusar exatamente o formato SELECT-then-compare já estabelecido em `updateLeadStage`. Este é o mecanismo que satisfaz SC#4 do ROADMAP diretamente.
**Warning signs:** Um lead arrastado para Negociação segundos antes do admin enviar uma mensagem "1º contato" enfileirada é silenciosamente rebaixado, ou uma regressão/re-avanço que a milestone explicitamente proíbe escapa sob timing de corrida.

### Pitfall 5: Corrida entre a nova mutação disparada por WhatsApp e o caminho existente de drag-and-drop otimista (risco aceito, documentar explicitamente)
**What goes wrong:** `PipelineBoard` já tem uma corrida documentada e ainda aberta no UAT deferido do projeto ("race condition de 'Perdido' em sequência"). Adicionar um segundo caminho independente que pode chamar uma Server Action de mutação de etapa para o mesmo lead (o auto-avanço do dialog de WhatsApp, que NÃO está integrado a `useOptimistic`/`startTransition` em `pipeline-board.tsx`) cria uma segunda corrida estruturalmente similar: se o admin arrasta um card para uma nova coluna e, na mesma janela, também clica enviar no dialog de WhatsApp daquele card (ou vice-versa), dois `SELECT`-then-`UPDATE` independentes competem pela mesma linha sem lock algum.
**How to avoid:** Não tentar lock cross-componente (desproporcional para uma ferramenta solo de uma aba por vez). Em vez disso, conter o raio de impacto: a nova ação de auto-avanço já é uma transição de coluna única, estreita e condicional (`novo → contatado` apenas, gateada pela Pitfall 4), então o pior caso de uma escrita perdida é "um lead que deveria mostrar Contatado ainda mostra Novo" — recuperável reabrindo e reenviando, ou via o dropdown manual de etapa existente — nunca sobrescrevendo um estado `Negociação`/`Perdido`/`Fechado` que o admin definiu manualmente.
**How to document:** Marcar como limitação conhecida/aceita explicitamente no plano da fase (não deixar silenciosamente de fora) — mesma postura da já existente corrida não resolvida "Perdido em sequência" registrada em `STATE.md`.

### Pitfall 6: Incremento de contador e avanço de etapa como duas chamadas separadas de Server Action — falha parcial deixa estado inconsistente
**What goes wrong:** Se o mesmo clique disparar duas chamadas `"use server"` independentes (`incrementContactAttempts(leadId)` e `updateLeadStage(leadId, "contatado")`), uma falha da segunda chamada depois da primeira ter sucesso (ou vice-versa) deixa o lead com contador incrementado mas sem mudança de etapa, ou etapa avançada com uma tentativa não-contada — e como o clique sempre abre uma aba `wa.me` real independente do resultado do servidor (Pitfall 2), o admin não tem nenhuma pista visual de que algo falhou no servidor.
**How to avoid:** Implementar uma única Server Action nova (`registerWhatsAppContact(leadId, tipo)`) que, num único `UPDATE`, sempre incrementa o contador de tentativas e condicionalmente (re-checando a etapa atual server-side per Pitfall 4) avança a etapa — um round trip, uma escrita atômica, um resultado de sucesso/falha. **Nota de implementação desta sessão:** um único `UPDATE` no SQLite já é atômico por si só; `db.transaction()` explícita só seria necessária se houvesse uma SEGUNDA escrita dependente do resultado da primeira dentro da mesma ação — não é o caso aqui (é um único `db.update(leads).set({...}).where(...)`), então a ressalva de `better-sqlite3` exigir callback de transação síncrono (vs. `@libsql/client`/Turso assíncrono) só se aplica **se** um `db.transaction()` explícito for adicionado por algum motivo futuro.
**Warning signs:** Contagem de tentativas de contato de um lead é maior que o número de vezes que sua etapa realmente reflete contato.

### Pitfall 7: Contador conta a mais/a menos ao redor do dialog de auto-abertura de 1º contato existente
**What goes wrong:** `useFirstContactTrigger` (`lead-form-dialog.tsx`) já abre automaticamente `WhatsAppPreviewDialog` logo após um lead ser criado manualmente — mas apenas *abrir* o dialog não é uma tentativa de contato. Duas implementações erradas são fáceis de escolher: (a) incrementar dentro de `useFirstContactTrigger.trigger()` ou onde `setPreviewState`/`firstContact.trigger()` é chamado — isso conta toda auto-abertura e toda reabertura manual como "tentativa" mesmo que o admin feche sem enviar; (b) incrementar só quando o dialog é fechado por qualquer caminho (tratando "dialog foi mostrado" como "tentativa feita").
**How to avoid:** O incremento do contador vive exclusivamente dentro do mesmo `onClick` no anchor "Abrir WhatsApp" que o avanço de etapa (Pitfall 1/6) — nunca em `useFirstContactTrigger`, nunca em nenhum handler de `setPreviewState`/`onOpenChange`. Fechar o dialog auto-aberto (ou aberto manualmente) via Cancelar/Escape/clique-fora deve deixar o contador intocado.
**Warning signs:** Leads recém-importados ou recém-criados que o admin nunca de fato mensagem mostram `contactAttempts: 1` no card do pipeline.

### Pitfall 8 (achado desta sessão): Validação server-side ausente na nova Server Action — `leadId`/`tipo` chegam sem passar por Zod
**What goes wrong:** O exemplo de código de `ARCHITECTURE.md` (Pattern 2, milestone-level) tipa `leadId: number` e `tipo: Template["tipo"]` nos parâmetros da função, mas não valida nada em runtime — diferente do padrão já estabelecido no restante de `lead-actions.ts`, onde `createLead`/`updateLead` usam `leadSchema.safeParse(...)` e `updateLeadStage` usa `stageUpdateSchema.safeParse(...)`. Como toda Server Action do Next.js é exposta como um endpoint HTTP interno (chamável por qualquer requisição que conheça o action ID, não só pelo TypeScript do client), pular a validação Zod aqui é uma inconsistência com CLAUDE.md ("validar/sanitizar TODOS os inputs de Server Action") e com o próprio padrão do arquivo.
**How to avoid:** Adicionar um schema mínimo em `src/lib/validations.ts` mirando `stageUpdateSchema` (ex: `whatsappContactSchema = z.object({ leadId: z.coerce.number().int().positive(), tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]) })`) e chamar `.safeParse({ leadId, tipo })` no topo de `registerWhatsAppContact`, retornando `{ advanced: false }` silenciosamente em caso de falha de parse (mantendo o contrato fire-and-forget/silencioso da Pattern 1 — nunca lançar erro visível sobre uma aba já aberta).
**Warning signs:** Nenhum sintoma visível em uso normal (o TypeScript do client já impede valores inválidos) — o risco é teórico/defensivo, não um bug reproduzível pela UI normal, mas é o tipo de gap que passa despercebido em code review se não for verificado explicitamente.

## Code Examples

### Migração de schema (aditiva, sem backfill)

```ts
// src/db/schema.ts — dentro da tabela `leads`, ao lado das colunas existentes
contactAttempts: integer("contact_attempts").notNull().default(0),
```

Diferente de `stageChangedAt` (nullable, sem default, exigiu migração de backfill custom — comentário na linha 48 do schema atual), `contactAttempts` não precisa de backfill: `DEFAULT 0` é o valor semanticamente correto para toda linha pré-existente (nenhum lead antigo teve cliques de WhatsApp rastreados, então 0 é honesto). Gerar com:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```
Convenção travada do projeto (`CLAUDE.md`/`01-RESEARCH.md`): `generate`+`migrate`, nunca `push`, para que a migração fique versionada e revisável em `src/db/migrations/`. (Nota: a tabela `templates` foi uma exceção histórica aplicada via `push` sem gerar `.sql` — já documentado como débito conhecido em `04-02-SUMMARY.md`; não repetir esse padrão aqui.)

### Exibição do contador no card (D-05/D-06)

```tsx
// src/components/pipeline-lead-card.tsx — mesma linha de metadados do "Esfriando"
import { Clock, MessageCircle } from "lucide-react";
// ...
<div className="flex items-center gap-1 text-[14px] leading-normal text-muted-foreground">
  <span>{format(lead.followUpDate, "dd/MM/yyyy")}</span>
  {isEsfriando ? (
    <span className="flex items-center gap-1 text-[#B45309]">
      <Clock className="size-3.5" /> Esfriando
    </span>
  ) : null}
  {lead.contactAttempts > 0 ? (
    <span className="flex items-center gap-1">
      <MessageCircle className="size-3.5" /> {lead.contactAttempts}x
    </span>
  ) : null}
</div>
```
Segue exatamente o padrão condicional já estabelecido pelo indicador "Esfriando" (D-06: só renderiza quando > 0). `lead.contactAttempts` já flui automaticamente via a prop `lead: Lead` existente — nenhuma prop nova precisa ser adicionada a `PipelineLeadCard`, porque `Lead = InferSelectModel<typeof leads>` capta a coluna nova assim que ela existir no schema.

## State of the Art

Não aplicável de forma significativa — esta fase é 100% trabalho incremental sobre um stack já atual (Next.js 16.2.10, React 19.2.7, Drizzle 0.45.2, todos já a versão mais recente estável confirmada em pesquisa de milestone de 2026-07-30). Nenhuma prática obsoleta está sendo substituída; nenhuma nova prática "moderna" está sendo introduzida além do que o projeto já usa.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `db.transaction()` explícito NÃO é necessário para `registerWhatsAppContact` porque há apenas um `UPDATE` (atômico por si só no SQLite) — contradiz a recomendação original de `PITFALLS.md` (Pitfall 6) de envolver a escrita numa transação | Common Pitfalls (Pitfall 6), Code Examples | Baixo — se o planner discordar e preferir a transação explícita por defesa em profundidade (ex: se um segundo `UPDATE` for adicionado depois), a única mudança é envolver o bloco `await db.update(...)` num `db.transaction((tx) => {...})` síncrono (sem `await` interno, per driver `better-sqlite3`) — não afeta a lógica de negócio |
| A2 | Um `db.transaction()` do `better-sqlite3` neste projeto, se usado, deve ter callback síncrono (sem `await` interno) | Common Pitfalls (Pitfall 6) | Médio se o planner adicionar uma transação com `await` dentro por engano — comportamento documentado do driver `better-sqlite3` do Drizzle, mas não re-verificado contra a doc oficial do Drizzle nesta sessão (herdado de `PITFALLS.md`/`STACK.md` de milestone, marcado lá como MEDIUM-HIGH confidence, não HIGH) |
| A3 | Não adicionar a coluna `lastContactedAt` sugerida por `ARCHITECTURE.md` de milestone, por não estar em nenhuma decisão travada do CONTEXT.md desta fase (WA-06/07/08 não pedem "último contato", só o contador) | Standard Stack, Architecture Patterns | Baixo — coluna puramente aditiva; se o planner decidir incluí-la mesmo assim (ex: para uma feature futura), é uma linha extra na mesma migração sem custo adicional. Ver Open Questions abaixo. |

**Nenhuma claim tagueada `[ASSUMED]` de fonte externa (não-verificada) nesta pesquisa** — toda a base técnica vem de leitura direta do código-fonte deste projeto (`whatsapp-preview-dialog.tsx`, `lead-actions.ts`, `pipeline-lead-card.tsx`, `schema.ts`, `queries.ts`, `types/index.ts`, os 4 componentes chamadores, `use-first-contact-trigger.ts`) e de pesquisa de milestone anterior (`ARCHITECTURE.md`/`STACK.md`/`PITFALLS.md`/`FEATURES.md`) já feita com o mesmo nível de rigor (fontes primárias = leitura de código, não busca web) e re-verificada linha a linha nesta sessão. Nenhum pacote novo foi pesquisado (nenhum é necessário), então nenhuma claim de "existência de pacote" precisa de tag de proveniência.

## Open Questions

1. **Incluir `lastContactedAt` (timestamp do último contato) além de `contactAttempts`?**
   - What we know: `ARCHITECTURE.md` de milestone sugere adicionar essa coluna também (útil para uma futura ordenação "contatado há mais tempo" ou feature de follow-up escalonado, ver todo pendente `2026-07-21-sequencia-follow-up-escalonada.md`).
   - What's unclear: Nenhuma decisão do CONTEXT.md desta fase pede esse campo — WA-06/07/08 só pedem o contador e o auto-avanço.
   - Recommendation: Deixar para o planner decidir; se incluído, é aditivo e de custo zero na mesma migração (`lastContactedAt: integer("last_contacted_at", { mode: "timestamp" })`, nullable, sem default — mesmo padrão de `stageChangedAt`). Se não incluído agora, adicionar depois é uma migração adicional trivial sem quebra.

2. **`db.transaction()` explícito ou `UPDATE` único direto?**
   - What we know: Um único `db.update(leads).set({...}).where(...)` já é atômico no SQLite — não há necessidade funcional de uma transação Drizzle explícita para este caso específico (só uma escrita).
   - What's unclear: `PITFALLS.md` de milestone recomenda a transação por precaução/consistência de padrão; esta pesquisa de fase diverge dessa recomendação por não ver a necessidade técnica concreta.
   - Recommendation: Planner escolhe; ambas as abordagens satisfazem WA-06/07/08 e Pitfall 4/6. Se optar por transação, lembrar da restrição de callback síncrono do driver `better-sqlite3` (Pitfall 6/Assumption A2).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | Não | Fora de escopo do projeto inteiro — ferramenta solo sem auth (constraint travada em `CLAUDE.md`) |
| V3 Session Management | Não | Idem |
| V4 Access Control | Não | Idem — nenhum novo boundary de acesso introduzido por esta fase |
| V5 Input Validation | Sim | Zod (`z.object({ leadId: z.coerce.number().int().positive(), tipo: z.enum([...]) })`) validando os parâmetros de `registerWhatsAppContact` no servidor — ver Pitfall 8 (achado desta sessão: o exemplo de milestone não incluía essa validação, mas o padrão do projeto exige) |
| V6 Cryptography | Não | Nenhum dado sensível novo introduzido; nenhuma criptografia envolvida |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Tabnabbing via `target="_blank"` no anchor `wa.me` | Tampering (do window de origem via `window.opener`) | `rel="noopener noreferrer"` já presente no anchor existente (`whatsapp-preview-dialog.tsx:169`) — esta fase não toca esse atributo, só adiciona lógica ao `onClick` já existente. Verificar que a modificação do `onClick` não remova acidentalmente `rel="noopener noreferrer"` do JSX. |
| Chamada direta de Server Action com parâmetros não validados (`leadId`/`tipo` arbitrários vindos de uma requisição forjada ao endpoint interno do Next.js) | Tampering / Elevation of Privilege (leitura/escrita em lead arbitrário por ID) | Validar com Zod no início de `registerWhatsAppContact` (Pitfall 8); manter o filtro `isNull(leads.deletedAt)` no `WHERE` (já parte do padrão de `updateLeadStage`) para que um lead soft-deletado nunca seja reativado/mutado por esta rota |
| Incremento de contador sem limite superior (spam de cliques) | Denial of Service (trivial, sem impacto real) | Não é uma preocupação real neste projeto — single-admin, sem rate-limit necessário; nenhuma ação de mitigação recomendada (fora de escopo, escala não é uma preocupação real per `CLAUDE.md`/`ARCHITECTURE.md` de milestone) |

## Sources

### Primary (HIGH confidence — leitura direta de código desta sessão)
- `src/components/whatsapp-preview-dialog.tsx` — anchor único, estado vivo `tipo`/`texto`, `onClick` existente a estender
- `src/actions/lead-actions.ts` — idioma SELECT-then-conditional-write de `updateLeadStage`/`updateLead`, imports já disponíveis (`sql`, `and`, `eq`, `isNull`)
- `src/components/pipeline-lead-card.tsx` — padrão de indicador condicional ("Esfriando") a espelhar para o contador
- `src/db/schema.ts` — schema atual de `leads`, precedente de `stageChangedAt` (nullable, sem default, backfill custom) vs. o que `contactAttempts` precisa (default 0, sem backfill)
- `src/db/queries.ts`, `src/types/index.ts` — confirma que `Lead` é inferido automaticamente de `schema.ts` (nenhuma mudança manual de tipo necessária)
- `src/hooks/use-first-contact-trigger.ts`, `src/components/lead-form-dialog.tsx`, `src/app/importar/[batchId]/page.tsx`, `src/components/post-import-lead-list.tsx`, `src/components/pipeline-board.tsx`, `src/components/followup-dashboard.tsx`, `src/components/lead-table.tsx` — confirma os 5 pontos de montagem, todos só abrindo o dialog, nunca renderizando o anchor diretamente
- `src/db/migrations/0001_grey_xavin.sql`, `0002_backfill-fechado-perdido-split.sql` — precedentes reais de migração aditiva e migração de backfill custom neste projeto
- `drizzle.config.ts`, `npx drizzle-kit --version` (executado nesta sessão) — confirma `drizzle-kit: v0.31.10`, `drizzle-orm: v0.45.2`, batendo com `package.json`
- `package.json` — confirma zero pacotes novos necessários

### Secondary (pesquisa de milestone anterior, verificada contra o código real nesta sessão)
- `.planning/research/ARCHITECTURE.md` — Patterns 1/2, diagrama de sistema, anti-patterns, ordem de build sugerida (Fase A = Features 1+2, exatamente o escopo desta fase)
- `.planning/research/PITFALLS.md` — 7 pitfalls críticas diretamente aplicáveis (1–7 nesta pesquisa), checklist "Looks Done But Isn't"
- `.planning/research/STACK.md` — confirma zero pacotes novos necessários, mesma conclusão desta pesquisa
- `.planning/research/FEATURES.md` — dependência de schema (`leads.contactAttempts` como nova coluna necessária)

### Tertiary
- Nenhuma fonte web foi consultada nesta pesquisa — o domínio é 100% interno ao código já existente deste projeto, sem necessidade de pesquisa de ecossistema externo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero pacotes novos, todas as versões confirmadas via comando local nesta sessão
- Architecture: HIGH — padrão de choke-point único confirmado por leitura direta de todos os 5 chamadores + o componente compartilhado; nenhuma divergência entre a pesquisa de milestone e o código atual
- Pitfalls: HIGH — 7 de 8 pitfalls vêm de pesquisa de milestone já verificada contra código real; a 8ª (validação Zod ausente) é um achado desta sessão, também verificado contra o padrão real do arquivo (`stageUpdateSchema` existe e é usado exatamente dessa forma em `updateLeadStage`)

**Research date:** 2026-07-31
**Valid until:** Estável — não há dependência de versão de pacote nem de API externa que mude nesta janela; válida até o código-fonte referenciado (`whatsapp-preview-dialog.tsx`, `lead-actions.ts`, `pipeline-lead-card.tsx`, `schema.ts`) ser modificado por outra fase antes desta ser executada.
