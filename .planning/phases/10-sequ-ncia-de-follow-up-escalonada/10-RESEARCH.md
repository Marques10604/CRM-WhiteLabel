# Phase 10: Sequência de Follow-up Escalonada - Research

**Researched:** 2026-08-12
**Domain:** Schema evolution (SQLite + Drizzle) e cálculo derivado "na leitura" num app Next.js Server Components existente — sem cron/scheduler, sem pacotes novos
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** A posição do lead na sequência avança **automaticamente** a cada clique em "Abrir WhatsApp" com template tipo `follow_up` — reaproveita o mesmo ponto de extensão onde `contactAttempts` já incrementa hoje (`registerWhatsAppContact`), sem ação manual extra do admin.
- **D-02:** A posição reseta para o início da sequência quando o admin arrasta o lead de volta para a etapa "Novo" no pipeline — o ciclo de reabordagem reinicia porque o lead "esfriou" e voltou ao início do funil. Não reseta ao fechar/perder o lead (fora do funil ativo, a posição simplesmente para de ser relevante — não precisa de reset explícito, ver D-10).
- **D-03:** A tela `/configuracoes` (singleton, já existente desde a Fase 7) ganha uma nova seção "Sequência de reabordagem" — não é criada uma rota/menu dedicado novo.
- **D-04:** Os intervalos são uma **lista dinâmica** (adicionar/remover linhas), não um número fixo de campos — mesmo espírito de "sem teto artificial" já usado na Fase 7 (D-03 daquela fase). Isso muda o formato de armazenamento: diferente das colunas fixas de `configuracoes` hoje, a sequência precisa de um shape que suporte N itens.
- **D-05:** A próxima data de reabordagem sugerida aparece nos mesmos dois lugares onde `followUpDate` já aparece hoje: dashboard de follow-ups e card do pipeline — consistência com o padrão existente, sem tela nova.
- **D-06:** É uma **sugestão separada e só informativa** — `followUpDate` continua sendo o campo real que o admin edita manualmente (como hoje). A data calculada pela sequência é exibida ao lado/junto, mas não sobrescreve `followUpDate` automaticamente. O admin decide se quer atualizar o campo real.
- **D-07:** Reaproveita o tipo `"prova_valor"` já existente em `templates.tipo` (`primeiro_contato`/`follow_up`/`prova_valor`) — o tipo já existe e o texto/propósito já fala em reforço de valor/prova social. Sem migração de enum, sem tipo redundante.
- **D-08:** Existe **uma única sequência global** de intervalos para todos os leads Outbound, independente do sub-nicho — mais simples, mesmo espírito singleton de `configuracoes` hoje. Sequência por sub-nicho fica fora de escopo.
- **D-09:** A próxima data é calculada a partir da **última interação registrada na timeline** (`interacoes`, Fase 9) — pega o `createdAt` da última entrada de WhatsApp do lead e soma o próximo intervalo da sequência. Não usa `followUpDate` como base.
- **D-10:** Quando o lead esgota todos os intervalos configurados (passa do último degrau), o sistema **para de sugerir data nova** — não repete o último intervalo indefinidamente. A ausência de sugestão sinaliza implicitamente que a automação acabou.

### Claude's Discretion

- Shape exato do armazenamento da lista de intervalos (nova tabela `sequencia_intervalos` com uma linha por degrau + `ordem`, vs. coluna JSON/texto serializado em `configuracoes`) — decisão técnica do planner/researcher; nenhuma preferência de UX manifestada, só o requisito de suportar N itens (D-04). **Resolvido nesta pesquisa: coluna JSON em `configuracoes`, ver Pattern 1.**
- Shape exato de `sequenciaPosicao` no lead (coluna inteira representando o índice do próximo degrau, vs. `sequenciaProximaData` calculada e persistida) — o cálculo é sempre "na leitura" (SEQ-02). **Resolvido nesta pesquisa: coluna inteira `sequenciaPosicao`, nunca a data persistida, ver Pattern 2.**
- Layout exato do badge/indicador da data sugerida no dashboard e no card do pipeline — **já resolvido e travado em `10-UI-SPEC.md`** (aprovado antes desta pesquisa), não é mais discricionário para o planner.
- Mecanismo de migração (ALTER TABLE manual via `better-sqlite3`, mesmo padrão já estabelecido nas Fases 06-01/07-01/08-01, vs. `drizzle-kit push` direto) — segue o precedente do projeto. **Resolvido nesta pesquisa: ALTER TABLE manual para ambas as colunas novas, ver Common Pitfalls 1-2.**
- Como o gate Inbound (ORIGEM-03) é implementado exatamente — **Resolvido nesta pesquisa: filtro único em `computeSequenciaSugestao` (`origemTipo === "outbound"`), nunca na escrita, ver Common Pitfalls 4.**

### Deferred Ideas (OUT OF SCOPE)

Nenhuma nova ideia de escopo surgiu na discussão desta fase — todas as áreas discutidas eram decisões de implementação dentro do domínio já delimitado por `ROADMAP.md`/`REQUIREMENTS.md` (SEQ-01/02/03, ORIGEM-03). Explicitamente fora de escopo desta fase (ver `10-CONTEXT.md` §Phase Boundary): envio automático real (continua manual via wa.me), sequência diferenciada por lead individual, cadência configurável por sub-nicho — "sequência por sub-nicho" foi avaliada e descartada em favor do escopo global (D-08).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEQ-01 | Admin configura uma sequência de intervalos crescentes (em dias) entre tentativas de reabordagem | Pattern 1 (coluna JSON `configuracoes.sequenciaIntervalosDias`) + Pitfall 3 (submissão correta de lista dinâmica via `FormData.getAll`) |
| SEQ-02 | O sistema sugere a próxima data de follow-up com base na posição do lead na sequência — cálculo feito na leitura, nunca um disparo automático agendado (sem cron/scheduler) | Pattern 2 (`sequenciaPosicao` + `computeSequenciaSugestao`, cálculo 100% na leitura, nada persistido além do índice) + Anti-Patterns ("Persistir a data calculada") |
| SEQ-03 | Templates de mensagem de reforço de valor/prova social ficam disponíveis para uso nessas reabordagens | Já implementado desde a Fase 4 (`templates.tipo = "prova_valor"`, já selecionável em `WhatsAppPreviewDialog`) — zero mudança de plumbing necessária, confirmado por leitura direta de `whatsapp-preview-dialog.tsx` |
| ORIGEM-03 | Leads classificados como Inbound não recebem sugestão automática da sequência de follow-up escalonada | Pattern 2 (gate `origemTipo === "outbound"` dentro de `computeSequenciaSugestao`) + Pitfall 4 (por que o gate pertence só ao cálculo, nunca à escrita de `sequenciaPosicao`) |
</phase_requirements>

## Summary

Esta fase não introduz nenhuma tecnologia nova — é 100% extensão de padrões já provados nas Fases 6-9 deste mesmo projeto (`registerWhatsAppContact`, `configuracoes` singleton, `interacoes`, cálculo "esfriando" no servidor). O trabalho real é de **modelagem de schema** (duas colunas novas: uma lista JSON em `configuracoes` e um índice inteiro em `leads`) e de uma **função pura de cálculo "na leitura"** que combina três fontes já existentes (`leads.origemTipo`, `leads.sequenciaPosicao`, última `interacoes` de WhatsApp) — nenhuma tabela de fila, nenhum job, nenhum cron.

O ponto de maior risco não é conceitual, é **operacional**: este projeto já bateu duas vezes (Fases 06-01 e 07-01, documentado em `STATE.md`) num bug real do `drizzle-kit push` que trata `DEFAULT 0`/colunas NOT NULL em tabela populada como gatilho de "data-loss statement", exigindo confirmação de TTY interativa que falha em sessões headless — e a Fase 08-01 estabeleceu o contra-padrão definitivo (ALTER TABLE manual via `better-sqlite3`, com backup + guarda de idempotência dupla). `leads.sequenciaPosicao` é **exatamente** esse caso (coluna inteira `NOT NULL DEFAULT 0` numa tabela com 30+ linhas reais) — recomendação: seguir `scripts/backfill-origem-tipo.cjs` como molde literal, nunca `drizzle-kit push`, para essa coluna.

Um segundo ponto não-óbvio: a lista dinâmica de intervalos (D-04) será submetida via `<form>` nativo + `FormData` bruto (mesmo idioma de `saveConfiguracoes`/`createLead` já em uso) — mas `Object.fromEntries(formData)`, usado hoje em TODA Server Action do projeto, **descarta silenciosamente** todos os valores de um campo repetido exceto o último. Isso quebra uma lista de N inputs com o mesmo `name`. A Server Action precisa buscar esse campo especificamente via `formData.getAll(...)`, não via o spread genérico já usado nas outras 6 Server Actions do projeto.

**Primary recommendation:** Armazenar a sequência como coluna JSON única em `configuracoes` (`text(..., {mode:"json"}).$type<number[]>()`), adicionar `leads.sequenciaPosicao` (integer, default 0) via ALTER TABLE manual (molde: `backfill-origem-tipo.cjs`), estender `registerWhatsAppContact`/`updateLeadStage`/`updateLead` com os mesmos idiomas condicionais já usados para `contactAttempts`/`motivoPerda`, e calcular a sugestão inteiramente no servidor (Server Component) a partir de uma query de agregação `MAX(created_at) GROUP BY lead_id` sobre `interacoes` — sem introduzir nenhuma tabela, biblioteca ou processo novo.

## Architectural Responsibility Map

Este projeto é um monólito Next.js App Router (Server Components + Server Actions), então os "tiers" clássicos colapsam em duas camadas reais: **Server** (Server Components/Server Actions, roda a cada request, tem acesso direto ao SQLite) e **Browser** (Client Components, só recebe props já computadas). Não há camada de API separada, CDN dinâmico ou serviço externo nesta fase.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Armazenar lista de intervalos configuráveis (SEQ-01) | Database (SQLite via `configuracoes`) | Server (Server Action `saveConfiguracoes`) | Mesmo padrão já estabelecido para `diasParadoNovo`/`Contatado`/`Negociação` — persistência singleton, escrita via upsert |
| Avançar posição na sequência ao clicar "Abrir WhatsApp" (D-01) | Server (`registerWhatsAppContact`, dentro da transação já existente) | Database (coluna `leads.sequenciaPosicao`) | Mutação de estado real, precisa do SELECT fresco/gate server-side já usado para `contactAttempts` (nunca confiar em estado do cliente) |
| Resetar posição ao voltar para "Novo" (D-02) | Server (`updateLeadStage`/`updateLead`) | Database | Mesmo write-path que já grava `stage`/`stageChangedAt`/`motivoPerda` — reset é mais um campo condicional no mesmo `.set()` |
| Calcular a próxima data sugerida (SEQ-02) | Server (Server Component, `pipeline/page.tsx` e `page.tsx`) | Database (leitura agregada de `interacoes` + `configuracoes`) | "Cálculo na leitura" é literal — mesmo padrão já usado para "esfriando" (`limitesPorEtapa` em `pipeline/page.tsx`), nunca no client, nunca persistido |
| Gate Inbound não recebe sugestão (ORIGEM-03) | Server (mesma função de cálculo acima) | — | Filtro de leitura, não de escrita — ver Pitfall "Onde aplicar o gate ORIGEM-03" abaixo |
| Exibir o indicador "Sugestão: dd/MM" (D-05/D-06) | Browser (Client Components `pipeline-lead-card.tsx`/`followup-dashboard.tsx`) | Server (prop já computada, nunca recalculada no client) | UI-SPEC já trava layout/copy — só recebe a data (ou `undefined`) como prop |
| Templates de reforço de valor disponíveis (SEQ-03) | Database (`templates.tipo = "prova_valor"`, já existe) | Browser (`WhatsAppPreviewDialog`, já lista o tipo no `<Select>`) | Zero mudança de plumbing — capability já implementada desde a Fase 4 |

## Standard Stack

Nenhuma biblioteca nova é necessária nesta fase. Todas as ferramentas abaixo já estão instaladas e em uso ativo no projeto (confirmado por leitura direta de `package.json`, não pesquisa externa).

### Core (reutilizadas, sem mudança de versão)
| Library | Version (installed) | Purpose nesta fase | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.2 `[VERIFIED: package.json local]` | Coluna JSON (`text(mode:"json")`) em `configuracoes`, coluna inteira em `leads`, query de agregação `MAX(...) GROUP BY` | Mesmo ORM já usado em todas as 9 fases anteriores; suporta `text(..., {mode:"json"})` nativamente desde antes desta versão (confirmado via docs oficiais, ver Sources) |
| `better-sqlite3` | 12.11.1 `[VERIFIED: package.json local]` | Execução da migração manual (ALTER TABLE) fora do Drizzle, mesmo padrão de `scripts/backfill-origem-tipo.cjs` | Já é a dependência de runtime do driver Drizzle — nenhuma dependência adicional para rodar um script de migração |
| `zod` | 4.4.3 `[VERIFIED: package.json local]` | Validação server-side autoritativa da lista de intervalos (`z.array(z.coerce.number().int().min(1)).min(1)`) | Mesmo padrão de `configuracoesSchema` já existente |
| `date-fns` | 4.4.0 `[VERIFIED: package.json local]` | `addDays` para somar o intervalo à última interação | Já usado em `queries.ts`/`pipeline/page.tsx` para o mesmo tipo de aritmética de data |
| `react-hook-form` + `@hookform/resolvers` | 7.82.0 / 5.4.0 `[VERIFIED: package.json local]` | Validação client-side antecipada dos campos fixos do form de `/configuracoes` (não da lista dinâmica, ver Pitfall) | Mesmo padrão de `ConfiguracoesForm` já existente |
| `lucide-react` | 1.25.0 `[VERIFIED: package.json local]` | Ícones `CalendarClock`/`Plus` já confirmados presentes no pacote instalado pelo `10-UI-SPEC.md` (verificado por `ui-researcher` contra os arquivos físicos em `node_modules`) | Já travado no contrato de UI aprovado |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Coluna JSON única em `configuracoes` para a lista de intervalos | Nova tabela `sequencia_intervalos` (1 linha por degrau + `ordem`) | Ver seção dedicada abaixo — descartada para esta fase, mas documentada como caminho de migração futura se a sequência deixar de ser global (fora de escopo, D-08) |
| `sequenciaPosicao` como índice inteiro persistido | `sequenciaProximaData` calculada e persistida em cada clique | Contradiz SEQ-02 literalmente ("cálculo feito na leitura, nunca um disparo automático agendado") — persistir a data já calculada reintroduziria o problema que a decisão de produto quis evitar (data ficaria desatualizada se o admin editasse os intervalos depois) |
| Query de agregação SQL (`MAX(created_at) GROUP BY lead_id`) | Buscar todas as `interacoes` e reduzir em JS (mesmo idioma de `groupLeadsByUrgency`) | Ver "Don't Hand-Roll" abaixo — a agregação SQL é a recomendação, não a alternativa |

**Installation:** Nenhuma. `npm install` não é necessário nesta fase.

## Package Legitimacy Audit

**Não aplicável.** Esta fase não instala nenhum pacote npm novo — todas as bibliotecas usadas (Drizzle, better-sqlite3, Zod, date-fns, react-hook-form, lucide-react) já estão em `package.json` e foram auditadas/instaladas em fases anteriores. `slopcheck`/`npm view` não foram executados porque não há candidato a verificar.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Clique "Abrir WhatsApp" (tipo=follow_up)                         │
│   whatsapp-preview-dialog.tsx  ──fire-and-forget──▶               │
└───────────────────────────────────┬───────────────────────────────┘
                                     ▼
                    registerWhatsAppContact(leadId, tipo, texto)
                    ┌─────────────────────────────────────────┐
                    │ db.transaction():                        │
                    │  1. SELECT fresco leads.stage             │
                    │  2. UPDATE leads SET                       │
                    │       contactAttempts + 1,                 │
                    │       sequenciaPosicao + 1  (NOVO,          │
                    │         só quando tipo === "follow_up")    │
                    │  3. INSERT interacoes (tipo, texto)         │
                    └─────────────────────────────────────────┘
                                     │ (persistido)
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Request de página (Server Component, GET /  ou  GET /pipeline)   │
│                                                                    │
│  getConfiguracoes()  ──▶ sequenciaIntervalosDias: number[]        │
│  getUltimaInteracaoWhatsAppPorLead()                               │
│         SELECT lead_id, MAX(created_at)                            │
│         FROM interacoes                                            │
│         WHERE tipo != 'nota_manual' AND deleted_at IS NULL          │
│         GROUP BY lead_id                     ──▶ Map<leadId, Date> │
│                                                                    │
│  computeSequenciaSugestao(lead, ultimaInteracao, intervalos)       │
│    1. lead.origemTipo === "outbound"?  (ORIGEM-03)  senão → null   │
│    2. existe ultimaInteracao?                        senão → null   │
│    3. intervalos[lead.sequenciaPosicao] existe?      senão → null   │
│         (D-10: sequência esgotada, sem repetir o último degrau)     │
│    4. return addDays(ultimaInteracao, intervalos[posicao])          │
│                                                                    │
│  ──▶ Map<leadId, Date | undefined> passado como prop               │
└───────────────────────────────────┬───────────────────────────────┘
                                     ▼
              pipeline-lead-card.tsx / followup-dashboard.tsx
              (Client Component, só renderiza — nenhum cálculo aqui)
              <CalendarClock/> "Sugestão: dd/MM"  (se Map tem entrada)
```

### Recommended Project Structure

Nenhuma pasta nova. Arquivos existentes ganham responsabilidades adicionais:

```
src/
├── db/
│   ├── schema.ts        # + configuracoes.sequenciaIntervalosDias, + leads.sequenciaPosicao
│   ├── queries.ts        # + getUltimaInteracaoWhatsAppPorLead(), + computeSequenciaSugestao() (pura, testável)
│   └── client.ts         # inalterado
├── lib/
│   └── validations.ts    # configuracoesSchema estendido com sequenciaIntervalosDias
├── actions/
│   ├── lead-actions.ts       # registerWhatsAppContact (+avanço), updateLeadStage/updateLead (+reset)
│   └── configuracoes-actions.ts  # saveConfiguracoes (+leitura via formData.getAll, ver Pitfall)
├── app/
│   ├── page.tsx           # + busca config/última-interação, computa Map de sugestões, passa como prop
│   ├── pipeline/page.tsx  # idem
│   └── configuracoes/page.tsx  # inalterado (form component é quem muda)
└── components/
    ├── configuracoes-form.tsx    # + seção "Sequência de reabordagem" (lista dinâmica, useState local)
    ├── pipeline-lead-card.tsx    # + indicador CalendarClock (já especificado em 10-UI-SPEC.md)
    └── followup-dashboard.tsx    # idem
scripts/
└── migrate-sequencia-followup.cjs  # NOVO — ALTER TABLE manual (leads.sequencia_posicao + configuracoes.sequencia_intervalos_dias), molde: backfill-origem-tipo.cjs
```

### Pattern 1: Coluna JSON tipada para lista dinâmica (SEQ-01)

**What:** Uma única coluna `text(..., {mode:"json"})` com `.$type<number[]>()`, em vez de uma tabela relacional com uma linha por item.

**When to use:** Quando (a) a lista pertence a um único registro singleton/pai (aqui: `configuracoes`, já singleton), (b) não há necessidade de consultar/filtrar itens individuais da lista fora do contexto do pai, e (c) o "espírito" do produto já trata a coisa-pai como uma unidade única (D-08: "uma única sequência global").

**Por que não a tabela `sequencia_intervalos` (a alternativa listada em `10-CONTEXT.md` §Claude's Discretion):**
- Uma tabela por-degrau exigiria FK para lugar nenhum específico (não é por-lead, não é por-sub-nicho — é global, singleton), uma coluna `ordem` gerenciada manualmente, e um CRUD completo (insert/update/delete/reordenar) só para preencher `configuracoes.id=1` de forma indireta.
- A UI-SPEC (`10-UI-SPEC.md` §Layout) já especifica que a lista inteira é editada como array local no client e enviada de uma vez só no "Salvar" — não há necessidade de granularidade linha-a-linha no banco, porque não há granularidade linha-a-linha na interação do usuário.
- O array continua "sem teto artificial" (D-04) exatamente como uma tabela permitiria — JSON não impõe limite de tamanho relevante para dezenas de intervalos.
- Fica consistente com o precedente do próprio projeto: `configuracoes` já é a "casa" de toda configuração singleton (D-03).

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/empty-array-default-value (Drizzle ORM docs oficiais)
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(),
  diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
  // NOVO (SEQ-01): lista de intervalos crescentes em dias, ex.: [4, 10, 20].
  // Default vazio ([]) — nenhuma sugestão é calculada até o admin configurar
  // pelo menos um intervalo (mesmo espírito conservador de Novo/Negociação
  // = 999999: nunca ativar automação nova sobre leads reais sem ação
  // explícita do admin no dia do deploy).
  sequenciaIntervalosDias: text("sequencia_intervalos_dias", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

### Pattern 2: Índice de posição persistido, cálculo de data nunca persistido (SEQ-02)

**What:** `leads.sequenciaPosicao` guarda só o ÍNDICE do próximo degrau (um inteiro, avançado a cada `follow_up`). A DATA em si nunca é escrita em lugar nenhum — é sempre `addDays(ultimaInteracaoWhatsApp, intervalos[sequenciaPosicao])`, recomputada a cada leitura de página.

**When to use:** Sempre que um requisito for explícito sobre "nunca disparo agendado" (SEQ-02) — persistir a posição (um fato imutável até o próximo evento real) é seguro; persistir a data derivada (que fica obsoleta se a config mudar) não é.

**Example:**
```typescript
// src/db/schema.ts — leads (coluna nova, ver Pitfall sobre ALTER TABLE manual)
sequenciaPosicao: integer("sequencia_posicao").notNull().default(0),
// posicionar logo após contactAttempts, mesmo agrupamento semântico já usado
// para origemTipo (posicionado após origem) e contactAttempts (após stageChangedAt)
```

```typescript
// src/db/queries.ts — cálculo puro, testável isoladamente (mesmo idioma de groupLeadsByUrgency)
import { addDays } from "date-fns";
import type { Lead } from "@/types";

export function computeSequenciaSugestao(
  lead: Pick<Lead, "origemTipo" | "sequenciaPosicao">,
  ultimaInteracaoWhatsApp: Date | undefined,
  intervalosDias: number[]
): Date | undefined {
  if (lead.origemTipo !== "outbound") return undefined; // ORIGEM-03
  if (!ultimaInteracaoWhatsApp) return undefined; // D-09: sem interação-base, sem sugestão
  const intervalo = intervalosDias[lead.sequenciaPosicao];
  if (intervalo === undefined) return undefined; // D-10: sequência esgotada
  return addDays(ultimaInteracaoWhatsApp, intervalo);
}
```

```typescript
// src/db/queries.ts — última interação de WhatsApp por lead, via agregação SQL
// (não busca-tudo-e-reduz — ver Don't Hand-Roll)
import { and, eq, ne, isNull, sql } from "drizzle-orm";
import { interacoes } from "@/db/schema";

export async function getUltimaInteracaoWhatsAppPorLead(): Promise<Map<number, Date>> {
  const rows = await db
    .select({
      leadId: interacoes.leadId,
      ultima: sql<number>`max(${interacoes.createdAt})`,
    })
    .from(interacoes)
    .where(and(ne(interacoes.tipo, "nota_manual"), isNull(interacoes.deletedAt)))
    .groupBy(interacoes.leadId);

  return new Map(rows.map((r) => [r.leadId, new Date(r.ultima * 1000)]));
}
```

### Pattern 3: Reaproveitar o idioma condicional já estabelecido para write-paths de `leads`

**What:** `motivoPerda` já é escrito de forma condicional-por-valor-alvo (não condicional-por-mudança) em `updateLead`/`updateLeadStage`: `motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null`. O reset de `sequenciaPosicao` (D-02) deve seguir **exatamente esse mesmo idioma**, não o idioma de `stageChangedAt` (que É condicional-por-mudança, `stageChanged ? {...} : {}`).

**Why:** Resetar incondicionalmente quando o destino é "novo" (independente de já estar em "novo" antes) é idempotente e mais simples — evita uma segunda variável de controle (`stageChanged`) só para este campo, e é seguro rodar 2x sem efeito colateral (`sequenciaPosicao` já em 0 continua em 0).

**Example:**
```typescript
// src/actions/lead-actions.ts — updateLeadStage (mesmo padrão em updateLead)
await db
  .update(leads)
  .set({
    stage: parsed.data.stage,
    motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
    // NOVO (D-02): mesmo idioma condicional-por-valor-alvo do motivoPerda acima,
    // não condicional-por-mudança (stageChanged) — resetar 2x é um no-op seguro.
    ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}),
    ...(stageChanged ? { stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, parsed.data.id), isNull(leads.deletedAt)));
```

```typescript
// src/actions/lead-actions.ts — registerWhatsAppContact, dentro de db.transaction()
// D-01: avanço só em tipo === "follow_up", incondicional a stage/advanced
// (variável independente do gate novo→contatado que já existe)
const avancaSequencia = parsed.data.tipo === "follow_up";

const updated = await tx
  .update(leads)
  .set({
    contactAttempts: sql`${leads.contactAttempts} + 1`,
    ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
    ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
  })
  .where(and(eq(leads.id, parsed.data.leadId), isNull(leads.deletedAt), ...stageGuard))
  .returning({ id: leads.id });

// mesmo spread de sequenciaPosicao precisa ser repetido no branch de fallback
// (linhas 270-273 do arquivo atual, ver Common Pitfalls)
```

### Anti-Patterns to Avoid
- **Capar `sequenciaPosicao` no momento da escrita:** não é necessário limitar o incremento ao tamanho da lista de intervalos. O `computeSequenciaSugestao` já trata `intervalos[posicao] === undefined` como "sem sugestão" (D-10) — capar no write-path adicionaria uma dependência de `registerWhatsAppContact` em `configuracoes` (leitura extra dentro da transação) só para reproduzir um comportamento que o read-path já dá de graça.
- **Persistir a data calculada:** contradiz SEQ-02 literalmente. Se um admin editar a lista de intervalos depois, uma data persistida ficaria "presa" no valor antigo — o requisito exige que a mudança de config se reflita imediatamente em todos os leads, o que só o cálculo-na-leitura garante.
- **Rodar `drizzle-kit push` para `leads.sequenciaPosicao`:** ver Common Pitfalls — risco real e já documentado neste projeto (2 incidentes prévios).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Última interação de WhatsApp por lead (D-09) | Buscar todas as linhas de `interacoes` (potencialmente milhares com o tempo) e reduzir em JavaScript para "primeira por leadId" | Query SQL de agregação (`SELECT lead_id, MAX(created_at) ... GROUP BY lead_id`), mesmo padrão já usado (implicitamente) por qualquer `COUNT`/agregação padrão do SQLite | SQLite já otimiza `GROUP BY`/`MAX` com os índices existentes (`interacoes_lead_id_idx`); buscar tudo e reduzir em JS escala linearmente com o histórico total da timeline, não com o número de leads ativos |
| Serialização da lista de intervalos | Formato customizado (string CSV `"4,10,20"`, ou uma tabela EAV genérica) | `text(col, {mode:"json"}).$type<number[]>()` do Drizzle | Serialização/parse (`JSON.stringify`/`JSON.parse`) e tipagem TypeScript ficam automáticos; nenhum parser customizado para debugar |
| Parsing de N inputs dinâmicos do formulário | Nomes indexados (`intervalo[0]`, `intervalo[1]`, ...) + reconstrução manual de array a partir das chaves do `FormData` | `name="intervaloDias"` idêntico em todas as linhas + `formData.getAll("intervaloDias")` no servidor | `FormData` já suporta nativamente múltiplos valores sob a mesma chave — reconstruir isso manualmente com nomes indexados é mais código para o mesmo resultado, e mais fácil de dessincronizar entre client/server |
| Aritmética de "somar N dias a uma data" | Manipulação manual de `Date` (`new Date(base.getTime() + dias * 86400000)`, sujeita a bugs de timezone/horário de verão) | `addDays()` do `date-fns`, já importado em `queries.ts` e `pipeline/page.tsx` para o mesmo propósito | Consistência com o resto do projeto — `differenceInDays`/`isBefore`/`addDays` já são o vocabulário de data estabelecido |

**Key insight:** Nenhum problema desta fase é novo o suficiente para justificar uma dependência nova ou uma abstração customizada — cada um já tem um precedente direto em código já escrito neste mesmo repositório (Fases 6-9) ou um recurso nativo do Drizzle/`date-fns`/`FormData` já em uso.

## Common Pitfalls

### Pitfall 1: `drizzle-kit push` em `leads.sequenciaPosicao` (risco real, já documentado 2x neste projeto)

**What goes wrong:** `npx drizzle-kit push` trata `ADD COLUMN ... NOT NULL DEFAULT 0` sobre uma tabela populada (`leads` tem 30+ linhas reais) como um "data-loss statement" e pede confirmação interativa via TTY — que falha em qualquer sessão headless (`Error: Interactive prompts require a TTY terminal`, ocorrido literalmente na Fase 06-01). Pior: o gate de segurança do `push` usa uma checagem `!column.default` que trata `0` como "sem default" (bug confirmado por leitura do código-fonte de `drizzle-kit` na Fase 06-01), então mesmo com `.default(0)` corretamente declarado no schema Drizzle, o `push` pode montar um `DELETE FROM leads` antes do `ADD COLUMN` se o prompt interativo for confirmado sem essa ciência.

**Why it happens:** `sequenciaPosicao` é uma coluna inteira `NOT NULL DEFAULT 0` sobre uma tabela `leads` já populada — é o padrão exato que já causou o incidente de `contactAttempts` (Fase 06-01) e o padrão geral de risco que motivou a Fase 08-01 a adotar ALTER TABLE manual para `origemTipo` (mesmo com default de string não-falsy) como política deliberada do projeto.

**How to avoid:** Aplicar via `better-sqlite3` direto, seguindo o molde de `scripts/backfill-origem-tipo.cjs`: (1) `wal_checkpoint(TRUNCATE)` + `fs.copyFileSync` para backup antes de qualquer escrita, (2) `PRAGMA table_info(leads)` para checar se a coluna já existe (guarda de idempotência do DDL), (3) `ALTER TABLE \`leads\` ADD \`sequencia_posicao\` integer DEFAULT 0 NOT NULL;` só se ausente, (4) verificação pós-migração (contagem de linhas antes/depois idêntica, 0 NULLs). Nunca `drizzle-kit push`/`generate` para esta coluna especificamente.

**Warning signs:** Qualquer prompt "Found data-loss statements" ou erro `Interactive prompts require a TTY terminal` durante a aplicação — abortar imediatamente sem confirmar, mesmo padrão de resposta já documentado em `06-01-SUMMARY.md`.

### Pitfall 2: `configuracoes.sequenciaIntervalosDias` — mesma cautela, risco menor mas presente

**What goes wrong:** Embora `configuracoes` tenha só 1 linha (singleton), ela **já está semeada** (populada) desde a Fase 7 — não é mais uma tabela vazia como estava quando `configuracoes` foi criada originalmente via `push` na 07-01. Adicionar uma coluna `NOT NULL` a essa tabela agora é tecnicamente o mesmo padrão de risco do Pitfall 1, só que com impacto muito menor (1 linha em vez de 30+).

**Why it happens:** O comportamento do `push` não distingue "tabela com 1 linha" de "tabela com 1000 linhas" — qualquer `ADD COLUMN NOT NULL` sobre tabela não-vazia dispara a mesma checagem de segurança.

**How to avoid:** Por consistência e simplicidade operacional, aplicar esta coluna no MESMO script de migração manual que aplica `leads.sequenciaPosicao` (`scripts/migrate-sequencia-followup.cjs`), com sua própria guarda de idempotência independente (`PRAGMA table_info(configuracoes)`). Um único script, um único backup, duas `ALTER TABLE` guardadas — mais simples de rodar/auditar que dois scripts separados para a mesma fase.

**Warning signs:** Mesmos sinais do Pitfall 1.

### Pitfall 3: `Object.fromEntries(formData)` descarta silenciosamente campos repetidos

**What goes wrong:** Toda Server Action deste projeto até agora (`createLead`, `updateLead`, `saveConfiguracoes`) usa `Object.fromEntries(formData)` para converter o `FormData` bruto num objeto antes do `safeParse`. Quando múltiplos `<input>` compartilham o mesmo `name` (necessário para a lista dinâmica de intervalos, D-04), `Object.fromEntries` mantém **apenas o último valor** de cada chave repetida — é o comportamento documentado do próprio `Object.fromEntries` sobre um iterável de pares `[key, value]`, não um bug do Drizzle/Zod. Se a `saveConfiguracoes` estendida continuar usando só `Object.fromEntries(formData)`, salvar uma sequência de 3 intervalos gravaria só o último valor digitado, silenciosamente, sem erro de validação.

**Why it happens:** `FormData` suporta nativamente múltiplos valores por chave (`formData.getAll(key)` retorna todos), mas `Object.fromEntries(formData.entries())` (o que `Object.fromEntries(formData)` faz implicitamente) é o idioma errado para esse caso — ele assume 1 valor por chave.

**How to avoid:** Na Server Action estendida, construir o objeto de entrada explicitamente:
```typescript
const raw = Object.fromEntries(formData); // continua correto para os 3 campos escalares
const intervalos = formData.getAll("intervaloDias"); // string[], 1 por linha da lista
const parsed = configuracoesSchema.safeParse({ ...raw, sequenciaIntervalosDias: intervalos });
```
`z.array(z.coerce.number().int().min(1))` no Zod já converte cada string do array para número.

**Warning signs:** Salvar 3 intervalos e só o terceiro persistir; ou salvar uma lista vazia e o campo desaparecer silenciosamente do objeto (nenhum campo `name="intervaloDias"` no DOM quando a lista está vazia — a Server Action recebe `formData.getAll("intervaloDias") === []`, que o Zod `.min(1, "Adicione ao menos um intervalo.")` já rejeita corretamente, então este caso específico já é coberto).

### Pitfall 4: Onde aplicar o gate Inbound (ORIGEM-03) — só no cálculo, nunca na escrita

**What goes wrong:** É tentador adicionar `if (lead.origemTipo === "inbound") return` também dentro de `registerWhatsAppContact` (bloquear o avanço de `sequenciaPosicao` para leads Inbound) — mas isso é redundante e adiciona uma leitura/condicional a mais numa função já densa (transação com gate de corrida, ver comentários existentes em `lead-actions.ts`).

**Why it happens:** O nome "gate Inbound" sugere um bloqueio de escrita, mas o requisito real (ORIGEM-03: "não recebem sugestão automática") é sobre o que é **exibido/calculado**, não sobre o que é **armazenado**. Um lead Inbound que, por algum motivo, recebe um clique de template `follow_up` (fluxo atípico, mas não impedido por nenhuma outra decisão) pode ter `sequenciaPosicao` incrementado sem problema — esse valor nunca é lido para exibição porque `computeSequenciaSugestao` já retorna `undefined` no primeiro `if` para qualquer lead não-outbound.

**How to avoid:** Implementar o gate uma única vez, dentro de `computeSequenciaSugestao` (ver Pattern 2) — o mesmo ponto único que a UI-SPEC já especifica como "Condição de exibição (gate completo, todas obrigatórias)". Não duplicar a checagem em `registerWhatsAppContact`.

**Warning signs:** Se o code review encontrar `origemTipo` sendo lido dentro da transação de `registerWhatsAppContact`, questionar se é realmente necessário — não é, pela lógica acima.

### Pitfall 5: Sequência esgotada não é erro, é ausência silenciosa (D-10)

**What goes wrong:** Um desenvolvedor lendo `intervalos[lead.sequenciaPosicao]` pela primeira vez pode instintivamente tratar `undefined` como bug/estado inválido e lançar exceção ou logar warning.

**Why it happens:** `sequenciaPosicao` pode legitimamente exceder `intervalos.length - 1` em dois cenários normais: (1) o lead esgotou todos os degraus configurados (D-10, comportamento esperado), (2) o admin reduziu o tamanho da lista depois que o lead já havia avançado além do novo tamanho (também esperado — sem erro, sem crash).

**How to avoid:** `computeSequenciaSugestao` trata `intervalos[posicao] === undefined` como retorno `undefined` (ausência de sugestão), não como erro — sem `console.error`/exceção. A UI-SPEC já reflete isso: "Ausência do indicador (fim da sequência, D-10): Nenhuma cópia — indicador simplesmente não é renderizado."

## Code Examples

Ver Pattern 1, 2 e 3 acima (todos com marcação `// Source:` onde aplicável) — não há operação comum adicional fora do que já foi coberto ali. O único trecho de código de terceiros usado literalmente é a sintaxe de default de array JSON do Drizzle (Pattern 1), cuja fonte é a documentação oficial linkada.

## State of the Art

| Old Approach (Fases 6-9 deste projeto) | Current Approach (Fase 10) | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Configuração de N campos fixos (`diasParadoNovo`/`Contatado`/`Negociação`) | Configuração de N itens dinâmicos (lista JSON) | Primeira vez neste projeto que uma config precisa de cardinalidade variável | Primeiro uso de `text(mode:"json")` no schema — precedente a ser reaproveitado se outra lista dinâmica surgir depois (ex.: tags livres, `.planning/todos/pending/...tags-livres...`) |
| `ALTER TABLE` manual sem script commitado (Fases 06-01/07-01, "aplicado inline") | Script `.cjs` dedicado e commitado (primeiro precedente: Fase 08-01, `backfill-origem-tipo.cjs`) | Fase 08-01 (2026-08-07) | Fase 10 deve seguir o padrão mais recente (script commitado), não o mais antigo (inline sem arquivo) — `08-01-SUMMARY.md` documenta essa evolução explicitamente |

**Deprecado/não usar nesta fase:** `drizzle-kit push`/`generate` para as duas colunas novas desta fase (`leads.sequenciaPosicao`, `configuracoes.sequenciaIntervalosDias`) — ver Common Pitfalls 1 e 2.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O valor semente (default) de `sequenciaIntervalosDias` deve ser `[]` (vazio, sem sugestão até o admin configurar) em vez do exemplo `[4, 10, 20]` citado no `10-CONTEXT.md` §Phase Boundary como mera ilustração | Pattern 1 | Baixo — se o usuário preferir o exemplo `[4,10,20]` como semente real, é uma troca de um único literal no `.default(sql\`'[]'\`)`, sem impacto arquitetural. Vale confirmar com o usuário antes de codar, já que `10-CONTEXT.md` não travou este valor explicitamente (ficou em "Claude's Discretion" junto com o shape) |
| A2 | O reset de `sequenciaPosicao` (D-02) deve se aplicar tanto a `updateLeadStage` (drag-and-drop) quanto a `updateLead` (edição manual via formulário) quando o destino é "novo" — não só ao drag-and-drop, apesar de D-02 mencionar literalmente "arrasta o lead de volta" | Pattern 3 | Médio — se o usuário quiser o reset SÓ via drag-and-drop (não via edição manual do dropdown de etapa), a implementação em `updateLead` precisa ser removida. A justificativa de produto (D-02: "o ciclo de reabordagem reinicia porque o lead esfriou e voltou ao início do funil") não distingue o mecanismo de mudança de etapa, só o destino — mas isso não foi perguntado explicitamente na discussão da fase |

**Nenhuma outra claim desta pesquisa é `[ASSUMED]`** — o restante é `[VERIFIED]` por leitura direta do código-fonte deste repositório ou `[CITED]` pela documentação oficial do Drizzle ORM (ver Sources).

## Open Questions

1. **Valor semente de `sequenciaIntervalosDias` (ver A1)**
   - What we know: D-04 exige suportar N itens sem teto; nenhum valor de semente foi travado em `10-CONTEXT.md`.
   - What's unclear: Se o admin espera ver `[4, 10, 20]` já preenchido na primeira visita a `/configuracoes`, ou se prefere começar vazio e configurar do zero.
   - Recommendation: Semente vazia (`[]`) por segurança/conservadorismo (mesmo raciocínio de Novo/Negociação=999999 na Fase 7) — mas o planner deve considerar perguntar ao usuário se o exemplo do `ROADMAP.md`/`10-CONTEXT.md` ([4,10,20]) é preferível como ponto de partida real.

2. **Reset em `updateLead` além de `updateLeadStage` (ver A2)**
   - What we know: D-02 descreve o cenário via drag-and-drop no board; ambas as funções escrevem `leads.stage`.
   - What's unclear: Se editar manualmente um lead (dropdown de etapa no formulário) e escolher "Novo" deveria também resetar a posição, ou só o gesto físico de arrastar no board conta como "voltou pro início".
   - Recommendation: Aplicar em ambas por consistência de write-path (mesmo argumento já usado para `motivoPerda`, que é resetado em ambas as funções sem distinção de mecanismo) — mas confirmar com o usuário se a leitura literal de D-02 for considerada vinculante pelo planner.

3. **Extensão de `scripts/verify-schema.cjs` para `leads`/`configuracoes`**
   - What we know: `verify-schema.cjs` hoje só valida colunas físicas estritas de `interacoes` (Fase 9) — `leads`/`configuracoes` só são checadas por existência de tabela, não por conjunto exato de colunas.
   - What's unclear: Se este gate deve ser estendido nesta fase (mesmo padrão que a Fase 9 estabeleceu para si mesma) ou se fica fora de escopo.
   - Recommendation: Opcional, não bloqueante — o `scripts/migrate-sequencia-followup.cjs` já deve ter sua própria verificação pós-migração (mesmo padrão de `backfill-origem-tipo.cjs`), que cobre o mesmo risco de forma mais direta.

## Security Domain

Config: `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` (`.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Não | Fora de escopo do projeto inteiro — ferramenta single-admin sem auth (`CLAUDE.md` Constraints) |
| V3 Session Management | Não | Idem |
| V4 Access Control | Não | Idem — não há múltiplos papéis/usuários nesta fase |
| V5 Input Validation | Sim | `configuracoesSchema` (Zod) — validação autoritativa server-side da lista de intervalos (`min(1)` por item, `min(1)` de tamanho de lista), mesmo padrão já usado para `diasParadoNovo`/`Contatado`/`Negociação` |
| V6 Cryptography | Não | Nenhum segredo/dado sensível novo nesta fase |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forjar chamada direta a `registerWhatsAppContact`/`saveConfiguracoes` via DevTools com payload malicioso (ex.: array de intervalos gigante, ou `leadId` de outro lead) | Tampering | Já mitigado pelo padrão existente do projeto: toda Server Action revalida no servidor via `safeParse` + SELECT fresco antes de escrever — nenhuma mudança de postura nesta fase, só extensão do schema Zod existente |
| SQL injection via `sql\`${leads.sequenciaPosicao} + 1\`` | Tampering | Já mitigado — Drizzle usa parâmetros preparados (`?`) para todo valor interpolado via template `sql\`...\`` quando o valor vem de uma coluna tipada, não de string concatenada bruta; nenhuma interpolação de string livre é introduzida nesta fase |
| Payload JSON malformado/excessivamente grande no campo `sequenciaIntervalosDias` (DoS leve, ou JSON inválido corrompendo a leitura de `configuracoes` para todas as páginas) | Tampering / Denial of Service (leve) | Zod valida a FORMA (array de inteiros positivos) antes de qualquer escrita — um payload que não é um array de números é rejeitado com erro 400-equivalente (`{errors: {...}}`) antes de tocar o banco; nenhum limite de tamanho explícito é necessário para uma lista de "intervalos em dias" de uso realista (dezenas, não milhares, de itens) |

## Environment Availability

**SKIPPED** — nenhuma dependência externa nova nesta fase. Todas as ferramentas necessárias (Node.js, `better-sqlite3`, `drizzle-kit`, SQLite via `data/crm.db`) já estão instaladas e verificadas em fases anteriores deste mesmo projeto (Fases 1-9, todas completas).

## Sources

### Primary (HIGH confidence)
- `C:\Users\Vencedor\Desktop\crm-leads\src\db\schema.ts` — schema completo atual (`leads`, `interacoes`, `configuracoes`, `templates`)
- `C:\Users\Vencedor\Desktop\crm-leads\src\db\queries.ts` — `getConfiguracoes`, `getActiveDashboardLeads`, `groupLeadsByUrgency`
- `C:\Users\Vencedor\Desktop\crm-leads\src\actions\lead-actions.ts` — `registerWhatsAppContact`, `updateLeadStage`, `updateLead` (código completo lido)
- `C:\Users\Vencedor\Desktop\crm-leads\src\actions\interacao-actions.ts` — `getInteracoesByLead` e padrão de guarda de imutabilidade
- `C:\Users\Vencedor\Desktop\crm-leads\src\actions\configuracoes-actions.ts` — `saveConfiguracoes` (padrão de upsert e `Object.fromEntries`)
- `C:\Users\Vencedor\Desktop\crm-leads\scripts\backfill-origem-tipo.cjs` — molde literal para o script de migração desta fase
- `C:\Users\Vencedor\Desktop\crm-leads\.planning\phases\06-auto-avan-o-de-etapa-contador-de-tentativas\06-01-SUMMARY.md` — incidente documentado do bug de `drizzle-kit push` com `DEFAULT 0`
- `C:\Users\Vencedor\Desktop\crm-leads\.planning\phases\07-configura-o-de-dias-parado-por-etapa\07-01-SUMMARY.md` — precedente de `configuracoes` como tabela nova (vazia) vs. já populada
- `C:\Users\Vencedor\Desktop\crm-leads\.planning\phases\08-origem-governada-separa-o-inbound-outbound\08-01-SUMMARY.md` — precedente de script de migração commitado com backup
- `C:\Users\Vencedor\Desktop\crm-leads\.planning\phases\09-timeline-de-intera-es\09-01-SUMMARY.md` — precedente de CREATE TABLE (tabela nova, vazia) seguro via `drizzle-kit push`
- [orm.drizzle.team/docs/guides/empty-array-default-value](https://orm.drizzle.team/docs/guides/empty-array-default-value) — sintaxe oficial de `text(mode:"json")` com default de array
- `package.json` do projeto — versões instaladas confirmadas de todas as dependências citadas

### Secondary (MEDIUM confidence)
- WebSearch "drizzle-orm sqlite-core text mode json column type" — corroborado pela busca acima nos docs oficiais (`orm.drizzle.team/docs/column-types/sqlite`)
- WebSearch "drizzle-kit push ADD COLUMN NOT NULL DEFAULT falsy bug" — corrobora (via issues públicas do GitHub `drizzle-team/drizzle-orm`) a categoria geral de bug já vivida por este projeto; os detalhes exatos vêm da experiência documentada em `06-01-SUMMARY.md`/`07-01-SUMMARY.md` (fonte primária)

### Tertiary (LOW confidence)
Nenhuma — todas as claims técnicas desta pesquisa foram verificadas contra código-fonte real deste repositório ou documentação oficial do Drizzle.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, todas as versões confirmadas por leitura direta de `package.json`
- Architecture: HIGH — cada padrão recomendado tem precedente direto e verbatim no código já escrito deste mesmo projeto (Fases 6-9)
- Pitfalls: HIGH — os 2 pitfalls de maior risco (Pitfalls 1-2) são incidentes reais já documentados em `SUMMARY.md`s deste projeto, não hipóteses; Pitfall 3 (`Object.fromEntries`) é comportamento de linguagem padrão (ECMAScript), não específico de biblioteca

**Research date:** 2026-08-12
**Valid until:** Sem prazo de validade relevante — nenhuma claim depende de versão de biblioteca externa que mude; toda a pesquisa é interna ao código deste repositório e a um único link de documentação oficial estável.
