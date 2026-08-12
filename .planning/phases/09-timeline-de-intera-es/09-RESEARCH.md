# Phase 9: Timeline de Interações - Research

**Researched:** 2026-08-08
**Domain:** Server Actions + Drizzle/SQLite append-only event log, surfaced as a dedicated modal timeline in an existing Next.js 16 CRM
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** O campo `notas` (texto livre, seção "Acompanhamento" do modal de editar lead) continua existindo exatamente como está hoje — nenhuma migração de conteúdo, nenhuma remoção. É a "anotação geral" do lead. A timeline é um registro separado e cronológico: cada nota manual nova que o admin digitar na timeline vira uma entrada datada ali, sem tocar em `notas`.
- **D-02:** A timeline vive numa superfície própria (modal/tela dedicada) — não é uma seção a mais dentro do modal de editar lead já existente (Contato/Negócio/Acompanhamento). Motivo: espaço vertical para uma lista potencialmente longa de eventos, sem competir com os campos de edição.
- **D-03:** Acesso duplo: (a) um ícone dedicado (ex.: relógio/histórico) ao lado do lápis de editar e do botão "WhatsApp" tanto na lista `/leads` quanto no card do pipeline; (b) um botão "Ver histórico" dentro do modal de editar lead. Ambos abrem a mesma superfície de timeline para o mesmo lead.
- **D-04:** Ao clicar "Abrir WhatsApp", o evento registrado na timeline inclui metadado (tipo de template + data/hora) E o texto completo que estava na caixa de mensagem no momento do clique — não só metadado, não um resumo/trecho truncado. O texto já está disponível no componente nesse ponto exato do clique (state `texto` em `whatsapp-preview-dialog.tsx`), então não exige nova plumbing de dados, só passar esse valor adiante para a nova mutação de registro.
- **D-05:** Sem truncamento — mensagens de WhatsApp já são curtas por natureza (templates), não há risco de peso desproporcional no banco.
- **D-06:** Assimetria deliberada por tipo de evento. Eventos automáticos de WhatsApp são imutáveis — nunca editados nem apagados, são fato do sistema (o clique aconteceu, esse foi o texto enviado), preservando o valor de auditoria/histórico fiel da timeline. Notas manuais digitadas pelo admin podem ser editadas e removidas (soft-delete) — são o registro subjetivo do admin, e erro de digitação/arrependimento é esperado. Esta é uma recomendação de Claude que o usuário aceitou explicitamente ("oque voce acha melhor" → confirmado).
- **D-07:** O soft-delete de nota manual segue o mesmo padrão já estabelecido no projeto (`deletedAt`, mesmo mecanismo de `leads`/`subnichos`) — não um mecanismo novo.

### Claude's Discretion

- Nome exato da tabela nova (`interacoes` é o nome já usado em `STATE.md` §Blockers/Concerns e no todo original — manter, salvo motivo técnico forte para mudar) e shape exato das colunas (tipo de evento como enum vs. texto livre, nome do FK para `leads.id`).
- Se a captura do evento de WhatsApp é uma escrita síncrona dentro de `registerWhatsAppContact` (mesma transação/chamada) ou uma segunda mutação separada disparada em paralelo — arquitetura, não especificado pelo admin. Ambas cumprem o requisito; a Fase 6 já estabeleceu `registerWhatsAppContact` como função dedicada (não extensão de `updateLeadStage`), então a captura de interação provavelmente pertence ali dentro, mas o planner decide.
- Layout exato da timeline (cards empilhados, lista simples, agrupamento por dia) — sem referência visual específica trazida pelo usuário.
- Se a nota manual tem campo de "tipo" (ex.: ligação, reunião, observação) além do texto livre, ou é só texto — TIMELINE-01 fala em "tipo/resumo" mas o usuário não especificou categorias de nota manual nesta discussão; planner/researcher decide o mínimo necessário para satisfazer o requisito sem introduzir complexidade não pedida.

### Deferred Ideas (OUT OF SCOPE)

Nenhuma nova ideia de escopo surgiu nesta sessão de discussão — todas as áreas discutidas eram decisões de implementação dentro do domínio já delimitado por `ROADMAP.md`/`REQUIREMENTS.md` (TIMELINE-01/02). Todos os todos revisados que bateram no matcher por sobreposição de palavras-chave pertencem a outras fases do roadmap v1.3 ou ao backlog PME/v2 (ver `09-CONTEXT.md` §Deferred para a lista completa) — nenhum foi dobrado nesta fase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TIMELINE-01 | Cada evento de contato com um lead (clique de WhatsApp, nota manual) é registrado numa linha do tempo, com data e tipo/resumo | Tabela `interacoes` (Standard Stack/Code Examples) com coluna `tipo` (4 valores) + `texto` + `createdAt`; captura automática via `registerWhatsAppContact` estendido (Pattern 1/3); captura manual via nova Server Action `createInteracaoManual` (Don't Hand-Roll, Pattern 2). |
| TIMELINE-02 | Admin visualiza o histórico completo de interações de um lead, em ordem cronológica, na tela/modal do lead | Novo componente `lead-timeline-dialog.tsx` (Architecture Patterns, System Architecture Diagram) alimentado por nova Server Action de leitura `getInteracoesByLead`, acessível pelos 3 pontos de entrada definidos em D-03 (lead-table.tsx, pipeline-lead-card.tsx, lead-form-dialog.tsx). |
</phase_requirements>

## Summary

Esta fase é aditiva e de baixo risco arquitetural: nenhuma tecnologia nova entra no projeto. Tudo que TIMELINE-01/02 pedem é resolvido com o stack já instalado — Drizzle ORM (nova tabela `interacoes`), Zod (validação server-side), Server Actions (`"use server"`, mesmo idioma de `registerWhatsAppContact`/`softDeleteLead`), react-hook-form (formulário de nota manual, mesmo padrão de `template-form-dialog.tsx`), e lucide-react (ícone `History`, já presente no pacote instalado — confirmado em `node_modules/lucide-react/dist/esm/icons/history.mjs`).

O ponto de maior atenção não é "qual biblioteca usar", é arquitetural: (1) o ponto de captura automática (`registerWhatsAppContact`) precisa gravar duas coisas atomicamente — o incremento de `contactAttempts` que já existe, e a nova linha de `interacoes` — usando `db.transaction()`, que já tem precedente real no código (`applyDefaultTemplate` em `template-actions.ts`); (2) a tabela nova precisa ser criada via `npx drizzle-kit push` (não a rota de `ALTER TABLE` manual via `better-sqlite3`) porque o landmine documentado nas Fases 06-01/07-01/08-01 é especificamente sobre `ADD COLUMN` com `DEFAULT` em tabela **já populada** — `CREATE TABLE` de uma tabela nova e vazia é exatamente o que `drizzle-kit push` já fez com sucesso para `templates` na Fase 04-02 (mesmo padrão, git não versiona o diff porque `data/crm.db` é gitignorado — verificação é feita direto no banco vivo, não por `git diff`); e (3) `scripts/guard-no-hard-delete.cjs` precisa ganhar `interacoes` nos seus padrões hardcoded de busca, no mesmo commit que cria a tabela — sem isso, um hard-delete acidental na tabela nova passaria pela guarda sem ser detectado.

**Primary recommendation:** Uma única tabela `interacoes` com coluna `tipo` reaproveitando o vocabulário de `templates.tipo` (`primeiro_contato` | `follow_up` | `prova_valor`) mais um quarto valor `nota_manual`; imutabilidade dos 3 primeiros tipos garantida por WHERE-clause no servidor (nunca só escondendo botões na UI); captura automática dentro de `registerWhatsAppContact` via `db.transaction()`; superfície de timeline como um novo `<Dialog>` dedicado (não há `Sheet`/`Drawer` no projeto — `Dialog` maior é o precedente correto), aberto a partir de 3 pontos de entrada que compartilham o mesmo componente.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Captura automática do evento de WhatsApp (registro na tabela) | API/Backend (Server Action `registerWhatsAppContact`) | Database (SQLite/Drizzle) | O clique já dispara essa Server Action hoje (WA-08); só ganha um `insert` a mais na mesma transação — nunca lógica no client. |
| Passagem do texto vivo da mensagem no momento do clique | Browser/Client (`whatsapp-preview-dialog.tsx`, state `texto`) | — | O texto só existe como state de componente nesse instante exato; precisa virar argumento da chamada à Server Action, não pode ser recalculado no servidor. |
| CRUD de nota manual (criar/editar/soft-delete) | API/Backend (novas Server Actions) | Database | Mesmo padrão de toda mutação do projeto: Zod parse → guarda condicional → `db.update`/`db.insert` → `revalidatePath`. |
| Leitura da timeline completa de um lead | API/Backend (nova função `"use server"` de leitura, chamada imperativamente do client) | Database | A superfície é um `Dialog` de componente client (não uma rota/página), então não há Server Component fazendo o fetch antecipado — precisa de uma função `"use server"` chamada em `useEffect`/`startTransition` ao abrir o dialog, mesmo idioma imperativo já usado por `registerWhatsAppContact`/`softDeleteLead` sendo chamadas fora de `useActionState`. |
| Renderização cronológica da lista (ordenação, agrupamento visual) | Browser/Client | — | Puro UI, sem lógica de negócio — a query já retorna ordenado por `createdAt`. |
| Persistência/imutabilidade dos eventos de WhatsApp | Database (constraint via WHERE-clause nas mutações, não CHECK constraint — nenhuma tabela do projeto usa CHECK) | API/Backend | Nenhuma rota de update/delete pode aceitar `id` de uma linha com `tipo != 'nota_manual'` — a guarda vive no `WHERE` da query, mesmo idioma de `isNull(leads.deletedAt)`. |
| Guarda anti-hard-delete da tabela nova | Dev tooling (`scripts/guard-no-hard-delete.cjs`, roda fora do app em runtime) | — | Escaneamento estático de código-fonte, não parte do runtime da aplicação — mas precisa cobrir `interacoes` desde o commit que a cria. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 (já instalado) | Schema da tabela `interacoes`, queries de leitura/escrita, `db.transaction()` | Mesma ferramenta usada em toda a tabela `leads`/`subnichos`/`templates`/`configuracoes` — nenhuma razão para divergir. [VERIFIED: package.json do projeto] |
| drizzle-kit | 0.31.10 (já instalado) | `npx drizzle-kit push` para criar a tabela `interacoes` | Mesmo comando usado para criar `templates` na Fase 04-02 (precedente direto de "tabela nova via push", não "coluna nova em tabela populada" — este último é o landmine documentado, não este caso). [VERIFIED: STATE.md linha 98, `.planning/STATE.md` — "'templates' table applied via drizzle-kit push produces no git-trackable diff"] |
| zod | 4.4.3 (já instalado) | Novo schema `interacaoManualSchema` (nota manual) + extensão de `whatsappContactSchema` com o campo `texto` | Toda Server Action do projeto valida com Zod no servidor, nunca confia só na validação de forma do client. [VERIFIED: src/lib/validations.ts] |
| react-hook-form + @hookform/resolvers | 7.82.0 / 5.4.0 (já instalado) | Formulário de nota manual (criar/editar) | Mesmo padrão de `template-form-dialog.tsx` (formulário de 2-3 campos), mesmo para forms pequenos o projeto não usa `<form>` cru sem RHF. [VERIFIED: src/components/template-form-dialog.tsx] |
| lucide-react | 1.25.0 (já instalado) | Ícone `History` para os pontos de entrada da timeline | Ícone confirmado presente no pacote instalado (`node_modules/lucide-react/dist/esm/icons/history.mjs`). [VERIFIED: filesystem check nesta sessão] |

### Supporting
Nenhuma biblioteca de "timeline UI" (ex: `react-vertical-timeline-component`) é necessária ou recomendada — ver Anti-Patterns.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Dialog` maior como superfície dedicada | `Sheet`/`Drawer` lateral | Nenhum primitivo `sheet.tsx`/`drawer.tsx` existe hoje em `src/components/ui/` (só `dialog.tsx`) — adicionar um novo primitivo shadcn/Base UI só para esta fase é escopo extra não pedido pelo D-02 (que só exige "superfície própria", não uma lateral). `Dialog` com `max-w` maior resolve sem nova dependência. |
| Coluna única `tipo` (enum de 4 valores) | Duas colunas (`categoria`: whatsapp/nota + `templateTipo` nullable) | Duas colunas são mais "corretas" normativamente, mas o projeto favorece o mínimo necessário (ver STATE.md, princípio YAGNI recorrente) — uma coluna única já resolve "tipo/resumo" do TIMELINE-01 sem introduzir uma segunda dimensão nunca pedida pelo usuário. |

**Installation:**
```bash
# Nenhum pacote novo — todas as libs já estão em package.json
```

**Version verification:** Nenhum pacote novo introduzido nesta fase — não há versão a verificar contra o registry. Todas as libs referenciadas acima já constam em `package.json` do projeto e foram confirmadas por leitura direta do arquivo (não de treinamento).

## Package Legitimacy Audit

Não aplicável — esta fase não instala nenhum pacote externo novo. A funcionalidade completa (schema, Server Actions, formulário, dialog) é construída inteiramente com dependências já presentes em `package.json` (`drizzle-orm`, `drizzle-kit`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `better-sqlite3`). O `slopcheck`/registry-verification gate do protocolo de pesquisa não se aplica quando não há `npm install` novo.

**Packages removed due to slopcheck [SLOP] verdict:** none (nenhum pacote novo avaliado)
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[Clique "Abrir WhatsApp"]                    [Botão "Nova nota" na timeline]
  whatsapp-preview-dialog.tsx                  lead-timeline-dialog.tsx (novo)
  (state `texto` vivo da textarea)             (form: react-hook-form + Zod)
        |                                             |
        | registerWhatsAppContact(leadId,             | createInteracaoManual(leadId, texto)
        |   tipo, texto)  [EXTENDIDO nesta fase]       |   [NOVO]
        v                                             v
  ============ src/actions/lead-actions.ts | interacao-actions.ts ============
  db.transaction(async (tx) => {
    tx.update(leads).set({ contactAttempts: +1, ...avanço condicional })
    tx.insert(interacoes).values({ leadId, tipo, texto })     <- WhatsApp
  })                                          tx/db.insert(interacoes)
                                               .values({ leadId, tipo: "nota_manual", texto }) <- manual
        |                                             |
        v                                             v
  ===================== SQLite (data/crm.db), tabela `interacoes` =====================
  id | lead_id (FK->leads.id) | tipo | texto | created_at | updated_at | deleted_at

        ^
        | getInteracoesByLead(leadId)  [NOVA Server Action de leitura]
        | chamada em useEffect/startTransition ao abrir o dialog (client component,
        | não há Server Component fazendo fetch antecipado aqui)
        |
  [lead-timeline-dialog.tsx] <---- aberto por 3 pontos de entrada:
     (a) ícone History em lead-table.tsx (linha da lista)
     (b) ícone History em pipeline-lead-card.tsx (card do board)
     (c) botão "Ver histórico" dentro de lead-form-dialog.tsx (modal de editar)
  renderiza lista ordenada por created_at:
     - linhas tipo != "nota_manual": SEM botões de editar/apagar (imutável, D-06)
     - linhas tipo == "nota_manual": COM Pencil/Trash2 -> updateInteracaoManual /
       softDeleteInteracaoManual [NOVAS Server Actions, guardadas por
       WHERE tipo = 'nota_manual' no servidor, nunca só escondidas na UI]
```

### Recommended Project Structure
```
src/
├── db/
│   └── schema.ts              # + export const interacoes (nova tabela)
├── actions/
│   ├── lead-actions.ts        # registerWhatsAppContact ganha param `texto` + db.transaction()
│   └── interacao-actions.ts   # NOVO: createInteracaoManual, updateInteracaoManual,
│                               #        softDeleteInteracaoManual, getInteracoesByLead
├── lib/
│   └── validations.ts         # + interacaoManualSchema; whatsappContactSchema ganha `texto`
├── components/
│   ├── lead-timeline-dialog.tsx   # NOVO: superfície dedicada (D-02)
│   ├── lead-table.tsx              # + ícone History na linha (aciona o dialog acima)
│   ├── pipeline-lead-card.tsx      # + ícone History no card (mesmo stopPropagation de WhatsAppSendButton)
│   └── lead-form-dialog.tsx        # + botão "Ver histórico" (só em modo edição)
└── scripts/
    └── guard-no-hard-delete.cjs    # CODE_PATTERNS/CODE_SQL_PATTERNS ganham `interacoes`
```

### Pattern 1: Transação atômica na captura automática
**What:** `registerWhatsAppContact` grava o incremento de `contactAttempts` (+ avanço condicional de etapa) E o `insert` em `interacoes` dentro de um único `db.transaction()`.
**When to use:** Sempre que uma ação do usuário precisa resultar em mais de um `write` que devem ou os dois acontecerem, ou nenhum.
**Example:**
```typescript
// Source: padrão real já existente em src/actions/template-actions.ts (applyDefaultTemplate)
async function applyDefaultTemplate(id: number, tipo: Template["tipo"]) {
  await db.transaction(async (tx) => {
    await tx.update(templates).set({ isDefault: false })
      .where(and(eq(templates.tipo, tipo), eq(templates.isDefault, true)));
    await tx.update(templates).set({ isDefault: true }).where(eq(templates.id, id));
  });
}
// Comentário do próprio arquivo justifica o `await` em toda call site:
// "drizzle-orm/better-sqlite3 transactions happen to run synchronously, but
// drizzle-orm/libsql (hosted/Turso) é assíncrono" — aplicar a mesma disciplina
// em registerWhatsAppContact garante portabilidade se o projeto migrar para Turso.
```

### Pattern 2: Guarda de imutabilidade no WHERE, nunca só na UI
**What:** `updateInteracaoManual`/`softDeleteInteracaoManual` incluem `eq(interacoes.tipo, "nota_manual")` no `where`, além do `id` — igual ao `isNull(leads.deletedAt)` que já protege `updateLead` contra editar um lead na lixeira.
**When to use:** Sempre que uma subclasse de linhas de uma tabela tem regras de mutabilidade diferentes das demais.
**Example:**
```typescript
// Baseado no padrão real de softDeleteLead (src/actions/lead-actions.ts:258-266)
export async function softDeleteInteracaoManual(id: number): Promise<ActionState> {
  await db
    .update(interacoes)
    .set({ deletedAt: sql`(unixepoch())` })
    .where(and(
      eq(interacoes.id, id),
      eq(interacoes.tipo, "nota_manual"), // NUNCA aceita apagar linha de WhatsApp
      isNull(interacoes.deletedAt)
    ));
  revalidatePath("/"); // + rotas relevantes
  return { success: true };
}
```

### Pattern 3: Criação de tabela nova via `drizzle-kit push`
**What:** `npx drizzle-kit push` para `CREATE TABLE interacoes`, verificado depois com uma query direta via `better-sqlite3` contra `data/crm.db` (não por `git diff`, já que o arquivo é gitignorado).
**When to use:** Toda vez que uma tabela **inteiramente nova** (nunca populada) precisa ser criada — diferente de `ADD COLUMN ... DEFAULT` numa tabela já populada, que é o cenário perigoso documentado nas Fases 06-01/07-01/08-01.
**Example:**
```bash
# Mesmo fluxo usado para criar `templates` na Fase 04-02 (STATE.md linha 98)
npx drizzle-kit push
node -e "const Database = require('better-sqlite3'); const db = new Database('./data/crm.db'); \
  console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='interacoes'\").get());"
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Soft-delete de nota manual | Novo mecanismo de "arquivamento" ou flag booleana | `deletedAt` (mesmo padrão de `leads`/`subnichos`) | D-07 já trava isso explicitamente — reaproveitar é decisão do usuário, não do planner. |
| Validação de formulário de nota manual | `<form>` cru com checagem manual de string vazia no client | `interacaoManualSchema` (Zod) + `zodResolver` | Consistência com toda outra mutação do projeto — nenhum form do projeto hoje pula essa camada. |
| Ordenação/agrupamento cronológico | Lógica de data customizada (comparações manuais de timestamp) | `date-fns` (`format`, `compareAsc`/`compareDesc` se necessário) já instalado | Já é a lib de datas do projeto (usada em `pipeline-lead-card.tsx`, `db/queries.ts`) — nenhuma razão para reescrever comparação de datas à mão. |

**Key insight:** Esta fase não introduz nenhum problema "deceptivamente complexo" que justifique uma lib nova — é modelagem de dados + Server Actions + um Dialog a mais, tudo dentro do vocabulário que o projeto já fala.

## Common Pitfalls

### Pitfall 1: Guard `guard-no-hard-delete.cjs` não atualizado no mesmo commit
**What goes wrong:** A tabela `interacoes` é criada, mas o guard continua escaneando só `leads`/`subnichos` (os `CODE_PATTERNS`/`CODE_SQL_PATTERNS` são hardcoded por nome de tabela, não genéricos) — um `.delete(interacoes...)` ou `DELETE FROM interacoes` futuro passaria pela guarda sem ser detectado.
**Why it happens:** O guard foi desenhado deliberadamente escopado a LEAD-04 (só `leads`/`subnichos`), então não "aprende" tabelas novas sozinho.
**How to avoid:** No mesmo commit que adiciona `export const interacoes` em `schema.ts`, adicionar `/\.delete\(\s*interacoes\b/` a `CODE_PATTERNS` e `/\bDELETE\s+FROM\s+[\`"']?interacoes\b/i`, `/\bDROP\s+TABLE\s+[\`"']?interacoes\b/i` a `CODE_SQL_PATTERNS` em `scripts/guard-no-hard-delete.cjs`. Já sinalizado em `STATE.md` §Blockers como pendência conhecida desta fase.
**Warning signs:** `npm run guard:no-hard-delete` passa "verde" mesmo depois de introduzir a tabela nova, antes do guard ser atualizado — falso positivo de segurança.

### Pitfall 2: Imutabilidade de evento WhatsApp garantida só na UI
**What goes wrong:** Esconder os botões Pencil/Trash2 apenas quando `tipo !== "nota_manual"` no componente React, mas as Server Actions `updateInteracaoManual`/`softDeleteInteracaoManual` aceitam qualquer `id` sem checar o `tipo` da linha no `WHERE`.
**Why it happens:** É tentador tratar "imutável" como puramente uma regra de apresentação, já que a UI de fato nunca oferece o botão para o admin.
**How to avoid:** Toda mutação de `interacoes` que não seja o `insert` original inclui `eq(interacoes.tipo, "nota_manual")` no `WHERE`, mesma disciplina de `isNull(leads.deletedAt)` já usada em `updateLead`/`updateLeadStage`/`registerWhatsAppContact`.
**Warning signs:** Um teste (`node scripts/test-*.cjs`, novo ou existente) que tenta `softDeleteInteracaoManual(idDeUmaLinhaWhatsApp)` e a linha some — deveria ser um no-op silencioso, igual ao padrão idempotente de `softDeleteLead`/`restoreLead`.

### Pitfall 3: Transação não-atômica na captura automática
**What goes wrong:** `registerWhatsAppContact` faz dois `await db.update(...)`/`db.insert(...)` sequenciais fora de `db.transaction()` — se o segundo falhar (raro, mas possível: erro de I/O, disco cheio), `contactAttempts` incrementa mas nenhuma linha de `interacoes` é criada, quebrando silenciosamente a garantia "sem exigir nenhuma ação manual extra" do critério de sucesso #1.
**Why it happens:** O código atual de `registerWhatsAppContact` já faz um único `db.update` (sem transação, porque é uma escrita só) — adicionar o `insert` de `interacoes` "ao lado" sem envolver os dois em `db.transaction()` é o caminho de menor resistência.
**How to avoid:** Envolver as duas escritas em `db.transaction(async (tx) => {...})`, mesmo padrão de `applyDefaultTemplate` em `template-actions.ts` (Pattern 1 acima).
**Warning signs:** Nenhum teste cobre o cenário de falha parcial — adicionar ao menos uma verificação de que a mesma chamada gera as duas escritas juntas (ex.: contagem de linhas em `interacoes` bate com `contactAttempts` após N cliques).

### Pitfall 4: Interação registrada só em `primeiro_contato`
**What goes wrong:** `registerWhatsAppContact` hoje incrementa `contactAttempts` incondicionalmente para qualquer `tipo` (`primeiro_contato`, `follow_up`, `prova_valor`), mas o avanço de etapa é condicional (só `primeiro_contato` + etapa `novo`). É fácil, ao adicionar o `insert` de `interacoes`, colocá-lo acidentalmente dentro do bloco condicional do avanço em vez de no fluxo incondicional — resultando em só cliques de "1º contato" virando timeline, quebrando o critério de sucesso #1 ("qualquer template, em qualquer tela").
**Why it happens:** O código-fonte tem um `if (advanced)` visualmente próximo ao ponto de inserção natural.
**How to avoid:** O `insert` em `interacoes` acontece no mesmo nível do incremento incondicional de `contactAttempts`, fora do `...(advanced ? {...} : {})`.
**Warning signs:** Testar follow_up/prova_valor manualmente (ou via script) e ver que não aparece na timeline.

### Pitfall 5: Ícone novo em `pipeline-lead-card.tsx` sem `stopPropagation`
**What goes wrong:** O card inteiro é `useDraggable` (dnd-kit) e tem `onClick` próprio para abrir o modal de edição — um ícone `History` adicionado sem o mesmo tratamento de `WhatsAppSendButton` (`onPointerDown`+`onClick` com `stopPropagation` nos dois) vira acidentalmente um drag-handle ou dispara a edição do lead em vez de abrir a timeline.
**Why it happens:** É o mesmo pitfall documentado no código-fonte para o botão de WhatsApp (`pipeline-lead-card.tsx` linha 66-71) — fácil de esquecer ao copiar o padrão para um segundo botão.
**How to avoid:** Envolver o novo ícone no mesmo wrapper `<div onPointerDown={stop} onClick={stop}>` já usado pelo botão de WhatsApp.
**Warning signs:** Clicar no ícone History arrasta o card, ou abre o modal de edição em vez da timeline.

### Pitfall 6: `drizzle-kit push` tratado como "sempre perigoso"
**What goes wrong:** Aplicar a rota de `ALTER TABLE` manual via `better-sqlite3` (como em `backfill-origem-tipo.cjs`) para criar a tabela `interacoes` inteira, por generalizar demais a lição das Fases 06-01/07-01/08-01 — trabalho extra desnecessário e mais uma superfície pra errar (escrever DDL `CREATE TABLE` à mão em vez de deixar o drizzle-kit gerar).
**Why it happens:** O histórico recente do projeto tem 3 fases seguidas documentando "não confie no drizzle-kit push" — mas o motivo real é específico a `ADD COLUMN ... NOT NULL DEFAULT` em tabela **populada** (bug de falsy-check do drizzle-kit, ver STATE.md linha 112), não a `CREATE TABLE` de uma tabela nova.
**How to avoid:** Usar `npx drizzle-kit push` normalmente para a tabela `interacoes` (ela nasce vazia — não há dado real em risco), igual ao precedente de `templates` na Fase 04-02. Verificar o resultado com uma query direta no banco vivo, já que o diff não aparece no git (banco gitignorado).
**Warning signs:** Nenhum — este é um pitfall de "precaução excessiva", não um bug real; sinalizado para o planner não perder tempo reescrevendo DDL à mão sem necessidade.

### Pitfall 7: Verificação em paralelo com `npm run dev` no host de 4GB
**What goes wrong:** Rodar `npx tsc --noEmit`, `npm run build`, `npm run guard:no-hard-delete`, e um novo script de teste (`test:interacao-actions` ou equivalente) enquanto o dev server está ativo já causou crash neste host antes (ver STATE.md, sessão 2026-07-29: "o worker do Next crashou por falta de memória").
**Why it happens:** Host de 4GB RAM, múltiplos processos Node simultâneos.
**How to avoid:** Rodar cada comando de verificação sequencialmente, com o dev server **parado**. Já é uma constraint conhecida do projeto (memória do usuário: `feedback_4gb_ram_avoid_parallel`).
**Warning signs:** Build trava/crasha sem mensagem de erro clara.

## Code Examples

### Extensão de `whatsappContactSchema` (validations.ts)
```typescript
// Baseado em src/lib/validations.ts:83-86
export const whatsappContactSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]),
  texto: z.string().trim().min(1, "Mensagem vazia."), // NOVO — D-04/D-05, sem .max() (sem truncamento por decisão)
});
```

### Schema Drizzle da tabela `interacoes`
```typescript
// Segue o mesmo formato de src/db/schema.ts (subnichos/templates)
export const interacoes = sqliteTable(
  "interacoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
    // Reaproveita o vocabulário de templates.tipo + "nota_manual" — uma única
    // coluna resolve "tipo/resumo" do TIMELINE-01 sem introduzir uma segunda
    // dimensão (categoria vs. tipo de template) não pedida pelo usuário.
    tipo: text("tipo", {
      enum: ["primeiro_contato", "follow_up", "prova_valor", "nota_manual"],
    }).notNull(),
    texto: text("texto").notNull(), // D-04/D-05: texto completo, sem truncamento
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }), // só tocado ao editar nota_manual
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable — só usado em tipo="nota_manual" (D-06)
  },
  (table) => [
    index("interacoes_lead_id_idx").on(table.leadId),
    index("interacoes_deleted_at_idx").on(table.deletedAt),
  ]
);
```

## State of the Art

Não aplicável nesta fase — não há mudança de "estado da arte" de biblioteca/framework a documentar, todas as ferramentas já são as versões correntes do projeto (research de stack já feito em `.planning/STACK.md`, datado 2026-07-19, ainda válido).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Coluna única `tipo` (4 valores, reaproveitando `templates.tipo` + `nota_manual`) é suficiente para "tipo/resumo" do TIMELINE-01, sem categoria adicional de nota manual (ligação/reunião/observação) | Standard Stack, Code Examples | Baixo — CONTEXT.md já deixa essa decisão explicitamente a critério do planner ("planner/researcher decide o mínimo necessário"); se o admin pedir categorias de nota depois, é uma migração aditiva simples (nova coluna nullable), não retrabalho. |
| A2 | A ordenação padrão da timeline é "mais recente primeiro" (convenção comum de feeds de atividade) | Architecture Patterns | Baixo — CONTEXT.md não especifica direção, só "ordem cronológica"; trivial de inverter no `orderBy` se o admin preferir mais antigo primeiro. |
| A3 | Nota manual soft-deletada desaparece completamente da timeline (mesmo filtro `isNull(deletedAt)` de leads/subnichos), sem uma "lixeira de notas" equivalente à `/lixeira` de leads | Architecture Patterns, Don't Hand-Roll | Médio — se o admin esperar poder recuperar uma nota apagada por engano (mesma UX de leads), falta uma superfície de restauração; D-06/D-07 só travam o *mecanismo* (soft-delete via `deletedAt`), não uma UI de recuperação — nenhuma menção a isso em CONTEXT.md, então tratado como fora de escopo até o admin pedir. |
| A4 | O ícone `History` do lucide-react é a escolha visual correta para os pontos de entrada (D-03) | Standard Stack | Baixo — puramente estético, `Clock` (já usado para "Esfriando") é uma alternativa igualmente válida; qualquer um comunica "histórico/tempo". |

## Open Questions

1. **Onde exatamente o botão "Ver histórico" entra em `lead-form-dialog.tsx`?**
   - What we know: D-03(b) exige um botão dentro do modal de editar lead; o modal tem `DialogHeader`/3 seções/`DialogFooter`.
   - What's unclear: Se fica no header (ao lado do título), como uma 4ª "seção", ou no footer ao lado de Cancelar/Salvar.
   - Recommendation: Footer, como um botão `variant="outline"` adicional antes de "Cancelar" — mantém as 3 seções existentes intocadas (D-01 exige que "Acompanhamento"/`notas` continue exatamente como está) e não compete visualmente com o formulário. Só visível em modo edição (`isEditMode`), já que criar-e-já-ver-histórico não faz sentido (lead ainda não existe).

2. **A timeline pagina ou carrega tudo de uma vez?**
   - What we know: Volume esperado é baixo (CRM solo, "alguns milhares de leads" no total do projeto, não milhares de interações por lead individual).
   - What's unclear: Nenhum teto foi definido.
   - Recommendation: Carregar tudo de uma vez (sem paginação) para o MVP desta fase — reavaliar só se um lead específico acumular centenas de interações na prática, o que é improvável dado o padrão de uso (poucos cliques de WhatsApp + notas ocasionais por lead).

## Environment Availability

Seção omitida — esta fase não introduz nenhuma dependência externa nova (nenhum serviço, CLI, ou runtime além do que o projeto já usa: Node.js, better-sqlite3, drizzle-kit, todos já confirmados funcionais pelas fases anteriores).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Não | Projeto é single-admin, sem autenticação (constraint explícita de `CLAUDE.md`/`PROJECT.md`) — fora de escopo desta fase e de todo o projeto v1. |
| V3 Session Management | Não | Mesma razão acima. |
| V4 Access Control | Não | Nenhum controle de acesso diferenciado — único usuário, tudo acessível. |
| V5 Input Validation | Sim | Zod (`interacaoManualSchema`, `whatsappContactSchema` estendido) — validação server-side autoritativa em toda Server Action nova, mesmo padrão de `leadSchema`/`templateSchema`. |
| V6 Cryptography | Não | Nenhum dado sensível/segredo introduzido por esta fase (texto de mensagem de WhatsApp e notas não são credenciais). |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via `texto` (mensagem de WhatsApp ou nota manual renderizada na timeline) | Tampering/Elevation of Privilege | React escapa automaticamente conteúdo em JSX (`{texto}` como children de texto) — a mitigação é simplesmente **nunca** usar `dangerouslySetInnerHTML` para renderizar `interacoes.texto`. Nenhum componente do projeto usa `dangerouslySetInnerHTML` hoje — manter essa invariante. |
| SQL Injection via `texto`/`tipo` em queries de `interacoes` | Tampering | Drizzle ORM parametriza todas as queries — nunca construir SQL via concatenação/template string para os novos Server Actions, mesmo padrão já seguido em 100% do código existente (`db.insert`/`db.update`/`db.select` do query builder, nunca `sql.raw` com input de usuário). |
| Bypass de imutabilidade via chamada direta à Server Action (ex.: DevTools/replay de request) | Tampering | Coberto pelo Pattern 2 (WHERE-clause `eq(interacoes.tipo, "nota_manual")` em toda mutação que não seja o insert original de evento automático) — nunca confiar que a UI escondeu o botão. |

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte do projeto: `src/db/schema.ts`, `src/actions/lead-actions.ts`, `src/actions/template-actions.ts`, `src/lib/validations.ts`, `src/components/whatsapp-preview-dialog.tsx`, `src/components/lead-table.tsx`, `src/components/pipeline-lead-card.tsx`, `src/components/lead-form-dialog.tsx`, `src/components/delete-lead-dialog.tsx`, `src/components/template-form-dialog.tsx`, `src/db/queries.ts`, `src/db/client.ts`, `scripts/guard-no-hard-delete.cjs`, `scripts/backfill-origem-tipo.cjs`, `scripts/verify-wa-contact-invariant.cjs`, `scripts/verify-schema.cjs`, `scripts/test-lead-actions.cjs`, `package.json`
- `.planning/STATE.md` — histórico de decisões técnicas reais (db.transaction em `applyDefaultTemplate`, precedente de `drizzle-kit push` para tabela `templates`, landmine de `ADD COLUMN DEFAULT` em tabela populada, constraint de host 4GB)
- `.planning/phases/09-timeline-de-intera-es/09-CONTEXT.md` — decisões já travadas (D-01 a D-07)
- `.planning/REQUIREMENTS.md` — TIMELINE-01/02
- Filesystem check nesta sessão: `node_modules/lucide-react/dist/esm/icons/history.mjs` confirma disponibilidade do ícone `History` na versão instalada.

### Secondary (MEDIUM confidence)
Nenhuma — toda a pesquisa desta fase foi resolvida por leitura direta do código-fonte e histórico do projeto (fonte primária), sem necessidade de WebSearch/Context7, já que nenhuma tecnologia nova entra no stack.

### Tertiary (LOW confidence)
Nenhuma.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhum pacote novo, tudo verificado por leitura direta de `package.json` e do código real.
- Architecture: HIGH — padrões (transação, WHERE-guard, Server Action imperativa) todos têm precedente real e citável no próprio código do projeto, não são hipóteses.
- Pitfalls: HIGH — 6 dos 7 pitfalls derivam de bugs/decisões já documentados no histórico real do projeto (STATE.md), não de especulação genérica sobre a tecnologia.

**Research date:** 2026-08-08
**Valid until:** Sem prazo de validade relevante — pesquisa baseada no código-fonte atual do projeto, não em documentação externa que possa ficar desatualizada. Revalidar apenas se o schema/actions mudarem antes do planejamento rodar.

## Project Constraints (from CLAUDE.md)

- Sem autenticação multi-usuário (single-admin) — reforça V2/V4 = "Não" na Security Domain acima.
- Sem app mobile nativo, acesso só via navegador desktop — sem impacto direto nesta fase (timeline é só mais uma superfície web).
- Sem integração com API oficial do WhatsApp — esta fase não envia nada, só registra o clique que já abre `wa.me`; nenhuma mudança nesse contrato.
- Drizzle ORM (não Prisma), SQLite via `better-sqlite3` — schema/queries da tabela `interacoes` seguem exatamente esse par, sem introduzir ORM/driver alternativo.
- Zod para validação de Server Actions — `interacaoManualSchema`/`whatsappContactSchema` estendido seguem esse padrão.
- react-hook-form + `@hookform/resolvers` para formulários — formulário de nota manual segue esse padrão, não um `<form>` sem RHF.
- Nunca hard-delete (`deletedAt` é o padrão de soft-delete do projeto) — D-06/D-07 já aplicam isso a notas manuais; guard `scripts/guard-no-hard-delete.cjs` precisa cobrir a tabela nova.
