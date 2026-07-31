# Phase 7: Configuração de Dias-Parado por Etapa - Research

**Researched:** 2026-07-31
**Domain:** Nova tabela de configuração single-row (Drizzle/SQLite), generalização de cálculo server-side, formulário Server Action com Zod (Next.js App Router)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Acesso à tela**
- **D-01:** Novo item "Configurações" no sidebar (`src/components/app-sidebar.tsx`), com ícone de engrenagem (`Settings` do `lucide-react`), adicionado ao final do `NAV_ITEMS` array, depois de "Lixeira". Segue o mesmo padrão visual/estrutural dos 7 itens existentes (sem tratamento especial).

**Feedback ao salvar**
- **D-02:** Ao salvar, o admin permanece na tela `/configuracoes` (sem redirecionamento) e vê um toast de confirmação (ex: "Configurações salvas") via `sonner`, consistente com o padrão de feedback já usado no projeto (templates, sub-nichos). Os campos continuam visíveis com os valores recém-salvos, permitindo ajuste imediato se necessário.

**Validação dos campos**
- **D-03:** Cada campo numérico de dias-parado (Novo, Contatado, Negociação) tem mínimo de 1 dia — 0 ou negativo é bloqueado, pois destacaria leads como "esfriando" instantaneamente. Sem teto máximo artificial — o admin decide livremente até quantos dias faz sentido por etapa.
- **D-04:** No primeiro acesso à tela, antes de qualquer alteração do admin, o campo de Contatado já aparece pré-preenchido com 5 (valor atual hardcoded), e o comportamento de destaque "esfriando" no pipeline permanece idêntico ao estado pré-deploy desta fase até o admin salvar novos valores (Success Criteria #3 do ROADMAP.md).

### Claude's Discretion
- Mecanismo de armazenamento da configuração (nova tabela no schema Drizzle vs. outra abordagem) — decisão técnica do planner/researcher, não teve preferência de UX manifestada pelo usuário.
- Layout exato do formulário em `/configuracoes` (3 campos numéricos rotulados por etapa) — estrutura simples, sem necessidade de componentes visuais além dos já usados no projeto (inputs, labels, botão salvar). **Já resolvido pelo `07-UI-SPEC.md` aprovado** — ver seção Copywriting/Layout desse documento, vinculante para o planner.
- Se "Novo" e "Negociação" precisam de validação adicional além do mínimo de 1 (ex: mensagens de erro específicas) — seguir o padrão de validação já estabelecido em outros formulários do projeto (react-hook-form + Zod).

### Deferred Ideas (OUT OF SCOPE)
- Todo pendente "Sequência de follow-up escalonada com templates de valor" (`.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`, match score 0.6) foi avaliado e **mantido fora de escopo** desta fase, confirmando a decisão já registrada em `PROJECT.md` (v1.3+). Não dobrado para Phase 7.
- Thresholds de dias-parado por sub-nicho — fora do escopo (`REQUIREMENTS.md` §Out of Scope): configuração é só por etapa do pipeline, não por sub-nicho.
- Notificações/e-mail sobre lead esfriando — fora do escopo (`REQUIREMENTS.md` §Out of Scope): o destaque visual no pipeline já é o mecanismo de aviso.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| CONFIG-01 | Admin acessa uma tela `/configuracoes` para definir quantos dias um lead pode ficar parado em cada etapa (Novo, Contatado, Negociação) antes de ser destacado como "esfriando" | Pattern 1 (tabela `configuracoes`), Pattern 2 (`getConfiguracoes()`), Code Examples (Zod schema + Server Action), `Recommended Project Structure` (rota `src/app/configuracoes/page.tsx` + `configuracoes-form.tsx`) |
| CONFIG-02 | A configuração substitui o valor hardcoded atual (5 dias, só etapa Contatado) sem mudar o comportamento no dia do deploy — o valor de Contatado nasce pré-preenchido com 5 | Pattern 2 (`getOrCreate` semeia `diasParadoContatado=5` no primeiro acesso), Pattern 3 (generalização do filtro em `pipeline/page.tsx` sem regressão de comportamento), Pitfall 2 (por que a semeadura não pode depender de SQL de migração) |
</phase_requirements>

## Summary

Esta fase não introduz nenhuma tecnologia nova ao stack — é 100% recombinação de padrões já estabelecidos no próprio código do projeto: uma nova tabela Drizzle (seguindo a forma de `subnichos`/`templates`), um formulário `react-hook-form` + Zod + `useActionState` (seguindo `TemplateFormDialog`), e uma generalização pontual de um cálculo já existente em `src/app/pipeline/page.tsx`. A pesquisa focou em três perguntas técnicas específicas, todas verificadas diretamente no código e no banco vivo deste repositório (não em fontes externas): (1) qual forma de tabela usar para a configuração, (2) como aplicar a migração dado o estado real do banco, e (3) como generalizar o cálculo de "esfriando" sem tocar componentes de UI já prontos.

A descoberta mais importante desta pesquisa é uma **divergência real e verificada entre o histórico de migrações versionadas (`src/db/migrations`) e o banco `./data/crm.db` de fato** — três objetos (`templates`, `leads.import_batch_id`, `leads.contact_attempts`) existem no banco vivo mas nunca foram capturados em nenhuma migração `.sql`, porque foram aplicados via `drizzle-kit push` em fases anteriores (04-02, 06-01) sem nunca reconciliar o snapshot. Isso significa que `npx drizzle-kit generate` (a convenção "travada" do projeto) **vai falhar** para esta fase se usado ingenuamente — ele tentaria recriar os 3 objetos já existentes e o `migrate` subsequente quebraria com `duplicate column name`. O precedente já estabelecido na Fase 6 (mesmo problema, mesma causa) é usar `npx drizzle-kit push` para a nova tabela, que diffa contra o banco real em vez do snapshot desatualizado, e documentar a reconciliação do snapshot como débito técnico separado — não resolvê-la nesta fase.

**Primary recommendation:** Criar uma tabela `configuracoes` de linha única (singleton, `id` fixo = 1) com 3 colunas `integer NOT NULL` tipadas (`dias_parado_novo`, `dias_parado_contatado`, `dias_parado_negociacao`), aplicada via `npx drizzle-kit push` (não `generate`, pelo motivo acima). A semeadura da linha padrão (Contatado=5, conforme D-04) acontece de forma preguiçosa/idempotente dentro de uma função `getConfiguracoes()` em `src/db/queries.ts` — não via SQL de migração — porque `push` não executa `INSERT`s de dados. `src/app/pipeline/page.tsx` passa a ler essa config e construir um mapa etapa→limite, generalizando o filtro hardcoded atual sem tocar em nenhum componente de UI (o board/card já tratam "esfriando" como um `Set<number>` de ids agnóstico de etapa).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Leitura da config no carregamento de `/configuracoes` (pré-preenchimento) | Frontend Server (SSR) | Database/Storage | `page.tsx` é um Server Component `async` que já faz `db.select()` direto, mesmo padrão de `/subnichos` e `/pipeline` — não há camada de API intermediária neste app |
| Persistência da configuração ("Salvar") | API/Backend | Database/Storage | Server Action (`saveConfiguracoes`), mesmo padrão de `createTemplate`/`updateTemplate` — é o único ponto de escrita, autoritativo |
| Validação (mínimo 1 dia) | API/Backend | Browser/Client | Zod no server é autoritativo (Pitfall já documentado no projeto: nunca confiar só no client); `react-hook-form` + `zodResolver` no client é só feedback antecipado, mesmo padrão de `templateSchema` |
| Cálculo de leads "esfriando" (3 etapas) | Frontend Server (SSR) | Database/Storage | Continua em `pipeline/page.tsx` (Server Component), exatamente onde já está hoje — só o filtro hardcoded vira leitura de config |
| Destaque visual "Esfriando" no card | Browser/Client | — | Já implementado em `PipelineLeadCard` como booleano `isEsfriando`; **nenhuma mudança necessária aqui** — o componente já é agnóstico de etapa |
| Navegação para `/configuracoes` | Browser/Client | — | `AppSidebar` (`"use client"`), `NAV_ITEMS` array + Next.js `<Link>` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 `[VERIFIED: npm registry, já em uso neste repo]` | Define a nova tabela `configuracoes` | Já é o ORM do projeto (`src/db/schema.ts`); nenhuma dependência nova |
| drizzle-kit | 0.31.10 `[VERIFIED: npm registry, CLI confirmado local via \`npx drizzle-kit --version\`]` | Aplicar o schema novo ao `./data/crm.db` via `push` | Idem — já instalado e funcional neste host |
| zod | 4.4.3 `[VERIFIED: npm registry, já em uso neste repo]` | Schema de validação do formulário (`configuracoesSchema`) | Mesmo padrão de `templateSchema`/`leadSchema` em `src/lib/validations.ts` |
| react-hook-form | 7.82.0 (já em `package.json`) | Form state + validação client-side antecipada | Mesmo padrão de `TemplateFormDialog` |
| sonner | 2.0.7 (já em `package.json`) | Toast "Configurações salvas." (D-02) | Já é o padrão de toast do projeto |
| date-fns | 4.4.0 (já em `package.json`) | `differenceInDays` no cálculo generalizado de "esfriando" | Já usado exatamente para isso em `pipeline/page.tsx` |

Nenhuma versão nova precisa ser instalada — todas as libs acima já estão em `package.json` e em uso ativo no código.

### Supporting
Nenhuma biblioteca de suporte nova é necessária. Os primitivos de UI (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Input`, `Button`) já existem em `src/components/ui/` (confirmado por leitura direta) e são suficientes conforme o `07-UI-SPEC.md`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tabela singleton com 3 colunas tipadas (`dias_parado_novo/contatado/negociacao`) | Tabela key-value genérica (`chave text PK`, `valor integer`) | Mais "extensível" para futuras configurações, mas quebra a convenção de colunas tipadas já usada em todo `schema.ts` (`contactAttempts`, `isDefault`, etc.) e exige parsing/typing manual por chave no código de leitura — complexidade sem benefício real para 3 campos fixos e conhecidos |
| Tabela singleton com 3 colunas tipadas | Coluna JSON única (`limites_dias_parado text` serializado) | Perde tipagem estática e validação de coluna do SQLite; contradiz a filosofia do projeto (CLAUDE.md: "Drizzle... schema is defined in plain TypeScript... transparent and debuggable") de preferir Drizzle justamente por evitar blobs opacos |
| `npx drizzle-kit push` para aplicar a tabela | `npx drizzle-kit generate` + `migrate` (convenção nominal do projeto) | **Bloqueado nesta fase** — ver Pitfall 1. `generate` tentaria recriar `templates`/`import_batch_id`/`contact_attempts` (já existentes no banco real, mas ausentes do snapshot 0002) e `migrate` falharia com `duplicate column name`. Mesmo diagnóstico e mesma decisão já tomados na Fase 6 (`06-01-PLAN.md`) |
| Semeadura da linha padrão via `getOrCreate` idempotente em `queries.ts` | Semeadura via `INSERT` dentro de uma migração `.sql` | `push` não executa `INSERT`s de dados (só diffa DDL de schema) — uma migração de seed não rodaria de fato pelo caminho escolhido acima. Um `getOrCreate` no código de leitura funciona independente da ferramenta de aplicação de schema e cobre o caso "banco novo/produção" automaticamente |

**Installation:**
```bash
# Nenhuma instalação nova. Apenas aplicar o schema:
npx drizzle-kit push
```

**Version verification:** `npm view drizzle-orm version` → `0.45.2`; `npm view drizzle-kit version` → `0.31.10`; `npm view zod version` → `4.4.3`. Todas idênticas às já fixadas em `package.json` (`^0.45.2`, `^0.31.10`, `^4.4.3`) — confirmadas ao vivo neste host em 2026-07-31, sem drift de versão a resolver.

## Package Legitimacy Audit

Nenhum pacote novo é instalado nesta fase — todas as dependências usadas (drizzle-orm, drizzle-kit, zod, react-hook-form, sonner, date-fns, lucide-react) já estão em `package.json` e em uso ativo no código do projeto. O gate de legitimidade de pacotes (slopcheck/registry) não se aplica; nenhuma tabela de auditoria é necessária.

**Packages removed due to slopcheck [SLOP] verdict:** nenhum (nenhum pacote novo avaliado).
**Packages flagged as suspicious [SUS]:** nenhum.

## Architecture Patterns

### System Architecture Diagram

```
Admin (browser)
   │
   ├─ GET /configuracoes ─────────────────────────────────────────┐
   │                                                               ▼
   │                                          src/app/configuracoes/page.tsx
   │                                          (Server Component, async)
   │                                                │
   │                                                ▼
   │                                      getConfiguracoes()  (src/db/queries.ts)
   │                                                │
   │                                    SELECT * FROM configuracoes LIMIT 1
   │                                                │
   │                             linha existe? ──NÃO──▶ INSERT linha padrão (id=1,
   │                                    │                novo=5, contatado=5,     │
   │                                   SIM              negociacao=5) ────────────┘
   │                                    │                        │
   │                                    ▼                        ▼
   │                          retorna { diasParadoNovo, diasParadoContatado, diasParadoNegociacao }
   │                                                │
   │                                                ▼
   │                              <ConfiguracoesForm config={...} />  (Client Component)
   │                              react-hook-form + zodResolver (validação antecipada)
   │
   ├─ submit "Salvar configurações" (FormData bruto do DOM) ───────┐
   │                                                                ▼
   │                                         saveConfiguracoes(_prevState, formData)
   │                                         (Server Action, "use server")
   │                                                │
   │                                    configuracoesSchema.safeParse(...)
   │                                    (Zod: min(1) por campo — autoritativo)
   │                                                │
   │                                     válido? ──NÃO──▶ { errors } ──▶ FieldError no form
   │                                       │
   │                                      SIM
   │                                       ▼
   │                        UPDATE configuracoes SET ... WHERE id = 1
   │                                       │
   │                          revalidatePath("/configuracoes")
   │                          revalidatePath("/pipeline")
   │                                       │
   │                                       ▼
   │                        { success: true } ──▶ toast.success("Configurações salvas.")
   │
   └─ GET /pipeline ────────────────────────────────────────────────┐
                                                                     ▼
                                              src/app/pipeline/page.tsx (Server Component)
                                                        │
                                     Promise.all([ leads, subnichos, templates, getConfiguracoes() ])
                                                        │
                                     limitesPorEtapa = { novo, contatado, negociacao } (map)
                                                        │
                             para cada lead ativo: limite = limitesPorEtapa[lead.stage]
                             se limite existe E stageChangedAt != null E
                             differenceInDays(hoje, stageChangedAt) >= limite ──▶ esfriandoLeadIds.push(id)
                                                        │
                                                        ▼
                                        <PipelineBoard esfriandoLeadIds={...} />
                                        (NENHUMA mudança de componente — já consome
                                         um Set<number> agnóstico de etapa)
```

### Recommended Project Structure
```
src/
├── app/
│   └── configuracoes/
│       └── page.tsx              # NOVO — Server Component, lê getConfiguracoes(), renderiza o form
├── components/
│   └── configuracoes-form.tsx    # NOVO — "use client", react-hook-form + useActionState (padrão TemplateFormDialog, sem Dialog)
├── actions/
│   └── configuracoes-actions.ts  # NOVO — saveConfiguracoes(_prevState, formData)
├── db/
│   ├── schema.ts                 # EDITADO — + tabela `configuracoes`
│   └── queries.ts                # EDITADO — + getConfiguracoes() (getOrCreate idempotente)
├── lib/
│   └── validations.ts            # EDITADO — + configuracoesSchema
└── components/
    └── app-sidebar.tsx           # EDITADO — + item "Configurações" em NAV_ITEMS (D-01)
```

### Pattern 1: Tabela singleton de configuração (Drizzle/SQLite)
**What:** Uma tabela com exatamente uma linha, `id` fixo (não autoincrement), usada como "config global" de um app single-tenant.
**When to use:** Quando existe exatamente um conjunto de valores de configuração para todo o sistema (não por usuário, não por entidade) — como aqui, um único admin.
**Example:**
```typescript
// src/db/schema.ts — segue a mesma forma de `subnichos`/`templates`
// (colunas tipadas, sem CHECK constraint — o projeto não usa CHECK em
// nenhuma tabela existente; a invariante "uma única linha" é garantida
// pelo código de aplicação, não pelo schema, mesmo padrão de
// applyDefaultTemplate() em template-actions.ts para "um default por tipo")
export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(), // sempre 1 — não autoIncrement
  diasParadoNovo: integer("dias_parado_novo").notNull().default(5),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(5),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

### Pattern 2: `getOrCreate` idempotente para a linha singleton
**What:** Uma função de leitura que semeia a linha padrão na primeira chamada, em vez de depender de uma migração de dados.
**When to use:** Sempre que a aplicação do schema usa `drizzle-kit push` (que não roda `INSERT`s) — necessário aqui pelo Pitfall 1 abaixo.
**Example:**
```typescript
// src/db/queries.ts
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { configuracoes } from "@/db/schema";

export type Configuracoes = typeof configuracoes.$inferSelect;

/**
 * Satisfaz CONFIG-02/D-04: no primeiro acesso, antes de qualquer ação do
 * admin, a linha singleton (id=1) ainda não existe — é semeada aqui com os
 * mesmos padrões default do schema (Contatado=5, paridade com o hardcode
 * pré-fase). getOrCreate em vez de seed via migração porque `drizzle-kit
 * push` (Pitfall 1) não executa INSERTs de dados.
 */
export async function getConfiguracoes(): Promise<Configuracoes> {
  const [existing] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (existing) return existing;

  const [created] = await db
    .insert(configuracoes)
    .values({ id: 1 }) // demais colunas usam os defaults do schema (5/5/5)
    .returning();
  return created;
}
```

### Pattern 3: Generalização do cálculo "esfriando" (mapa etapa→limite)
**What:** Trocar o literal `stage === "contatado" && ... >= 5` por uma tabela de lookup construída a partir da config.
**When to use:** Exatamente o caso desta fase — `src/app/pipeline/page.tsx`.
**Example:**
```typescript
// src/app/pipeline/page.tsx — substitui o filtro atual (linhas 27-34 hoje)
const limitesPorEtapa: Partial<Record<Lead["stage"], number>> = {
  novo: config.diasParadoNovo,
  contatado: config.diasParadoContatado,
  negociacao: config.diasParadoNegociacao,
  // fechado/perdido intencionalmente ausentes: nunca "esfriam" (mesmo
  // comportamento implícito de hoje, que só checava "contatado")
};

const esfriandoLeadIds = activeLeads
  .filter((lead) => {
    const limite = limitesPorEtapa[lead.stage];
    return (
      limite != null &&
      lead.stageChangedAt != null &&
      differenceInDays(new Date(), lead.stageChangedAt) >= limite
    );
  })
  .map((lead) => lead.id);
```

### Anti-Patterns to Avoid
- **Recalcular "esfriando" no client:** O projeto já centraliza esse cálculo no Server Component (`pipeline/page.tsx`) por design (comentário de cabeçalho do arquivo cita D-06/D-07 da Fase 3). Não mover a lógica para `PipelineBoard`/`PipelineLeadCard` — eles devem continuar recebendo só o `Set<number>` já calculado.
- **Adicionar `CHECK (id = 1)` ao schema Drizzle:** Tecnicamente possível (`check()` está disponível em `drizzle-orm/sqlite-core` 0.45.2, confirmado via inspeção do pacote), mas nenhuma tabela existente no projeto usa CHECK constraints — a invariante "uma linha" já tem precedente resolvido em nível de aplicação (`applyDefaultTemplate` em `template-actions.ts` usa transação, não constraint). Seguir o padrão já estabelecido evita introduzir um mecanismo novo para um problema que o código já sabe resolver.
- **Rodar `npx drizzle-kit generate` para esta mudança:** Ver Pitfall 1 — vai capturar objetos já existentes no banco real e quebrar o `migrate`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Validação de formulário + submissão via Server Action | Handler `onSubmit` manual com `fetch`/`useState` de erro | `react-hook-form` + `zodResolver` + `useActionState`, exatamente como `TemplateFormDialog` | É o padrão já estabelecido no projeto para os 2 outros formulários (template, sub-nicho); divergir aqui criaria uma terceira convenção sem necessidade |
| Cálculo de "dias parados" | Matemática de data manual (`(Date.now() - x) / 86400000`) | `differenceInDays` do `date-fns`, já usado em `pipeline/page.tsx` | Já resolvido no código atual; `date-fns` evita os footguns de fuso-horário de cálculo manual |
| Garantir que a tabela de config tenha só 1 linha | Lógica de trava distribuída, lock de arquivo, etc. | `getOrCreate` idempotente + `UPDATE ... WHERE id = 1` fixo | App single-admin, single-processo (`better-sqlite3` é um único arquivo local) — não há concorrência real a proteger; complexidade de lock seria over-engineering |

**Key insight:** Todo o "novo" desta fase é composição de padrões já provados no repositório — a única decisão genuinamente nova é a forma da tabela de configuração, e mesmo essa segue a convenção de colunas tipadas já usada em `templates`/`leads`.

## Common Pitfalls

### Pitfall 1: `drizzle-kit generate` vai falhar por drift já existente entre snapshot e banco real
**What goes wrong:** Rodar `npx drizzle-kit generate` (a convenção nominalmente "travada" do projeto) para adicionar a tabela `configuracoes` vai gerar uma migração que tenta recriar `CREATE TABLE templates`, `ALTER TABLE leads ADD import_batch_id` e `ALTER TABLE subnichos ADD deleted_at` — objetos que **já existem** no `./data/crm.db` real, mas nunca foram capturados em nenhum arquivo de migração `.sql`. Rodar `npx drizzle-kit migrate` na sequência falha com `duplicate column name: import_batch_id` (SQLite não suporta `ADD COLUMN IF NOT EXISTS`).
**Why it happens:** As Fases 04-02 (tabela `templates`) e um quick task (`260725-lai`, `subnichos.deleted_at`) aplicaram mudanças via `npx drizzle-kit push` diretamente, sem nunca rodar `generate` depois — o snapshot `src/db/migrations/meta/0002_snapshot.json` nunca foi atualizado para refletir essas mudanças. `[VERIFIED: consulta direta ao \`./data/crm.db\` nesta sessão via better-sqlite3 — tabela \`__drizzle_migrations\` tem exatamente 3 linhas (0000/0001/0002), mas \`sqlite_master\` mostra a tabela \`templates\` presente e \`PRAGMA table_info(leads)\` mostra \`import_batch_id\`/\`contact_attempts\` presentes]`. O mesmo diagnóstico e a mesma decisão de contorno já foram documentados na Fase 6 (`06-01-PLAN.md`, seção "DESVIO da convenção generate + migrate").
**How to avoid:** Usar `npx drizzle-kit push` para aplicar a nova tabela `configuracoes` (diffa contra o banco real, não contra o snapshot desatualizado — emite só o `CREATE TABLE configuracoes`). Não rodar `generate` nesta fase. Registrar a reconciliação do snapshot como débito técnico pré-existente no SUMMARY.md da fase (não é escopo de CONFIG-01/CONFIG-02, e já está documentado como débito conhecido desde a Fase 6).
**Warning signs:** Se `drizzle-kit generate` for executado por engano e o `.sql` gerado contiver `CREATE TABLE templates` ou qualquer `ALTER TABLE` em colunas que já existem (`import_batch_id`, `contact_attempts`, `deleted_at` de subnichos) — não aplicar essa migração, descartar o arquivo e usar `push` em vez disso.

### Pitfall 2: `push` não semeia dados — a linha padrão precisa de lógica de aplicação
**What goes wrong:** `drizzle-kit push` só sincroniza DDL (estrutura de tabela); ele nunca executa um `INSERT`. Se a semeadura da linha `id=1` (Contatado=5) for planejada como parte da migração, ela simplesmente não vai rodar, e o formulário quebra no primeiro acesso (nenhuma linha para ler) ou fica sem o pré-preenchimento exigido por D-04.
**Why it happens:** Confusão natural com o padrão do `0002_backfill-fechado-perdido-split.sql`, que É uma migração de dados — mas essa foi aplicada via `drizzle-kit migrate` (fluxo `generate` + `migrate`), não via `push`. Os dois fluxos não são intercambiáveis para dados.
**How to avoid:** Implementar a semeadura como parte do código de leitura (`getConfiguracoes()` com `getOrCreate`, Pattern 2 acima), não como SQL de migração. Isso também tem a vantagem de funcionar em qualquer banco (dev, produção Turso futura) independentemente de qual ferramenta aplicou o schema.
**Warning signs:** Página `/configuracoes` retornando erro ou campos vazios/`undefined` no primeiro acesso após o deploy desta fase.

### Pitfall 3: Zero ou negativo como "esfriando instantâneo" silencioso
**What goes wrong:** Se a validação Zod não bloquear `0`/negativo (D-03 exige mínimo 1), um admin digitando `0` por engano faria **todo lead daquela etapa** aparecer como "esfriando" imediatamente após qualquer mudança de etapa — comportamento surpreendente e potencialmente confuso.
**Why it happens:** `z.coerce.number()` sozinho aceita qualquer número, incluindo `0` e negativos; é preciso `.int().min(1, "Mínimo de 1 dia.")` explícito, e o input HTML precisa de `min={1}` como reforço visual (não substituto da validação server-side).
**How to avoid:** `configuracoesSchema` com `z.coerce.number().int().min(1, "Mínimo de 1 dia.")` para os 3 campos — mesma mensagem de erro definida no `07-UI-SPEC.md`. Validação autoritativa sempre no server (Zod na Server Action), o `min={1}` do `<Input type="number">` é só UX antecipada.
**Warning signs:** Teste manual: salvar com `0` em qualquer campo deve mostrar o erro "Mínimo de 1 dia." e não persistir no banco.

### Pitfall 4: Esquecer `revalidatePath("/pipeline")` após salvar
**What goes wrong:** Se a Server Action `saveConfiguracoes` só revalidar `/configuracoes`, o board em `/pipeline` (aberto em outra aba, ou navegado depois via cache do Next.js) continuaria mostrando o destaque "esfriando" com os limites antigos até um refresh manual/hard reload.
**Why it happens:** Next.js App Router cacheia Server Components; sem `revalidatePath` explícito no path afetado, o cache não invalida.
**How to avoid:** Seguir o mesmo padrão de `template-actions.ts` (que revalida `/templates`, `/`, `/pipeline` nos 3 handlers) — `saveConfiguracoes` deve chamar `revalidatePath("/configuracoes")` e `revalidatePath("/pipeline")` (o board é o único consumidor visual da config).
**Warning signs:** Salvar novos valores e o board de `/pipeline` continuar destacando os leads com o limite antigo até um F5 manual.

## Runtime State Inventory

> Fase não é rename/refactor/migração — é adição pura (nova tabela, nova rota, generalização de um filtro). Seção omitida por não se aplicar (nenhum dado existente muda de nome/formato; `leads.stage`/`leads.stageChangedAt` continuam exatamente como estão).

## Code Examples

### Zod schema do formulário
```typescript
// src/lib/validations.ts — adicionar ao lado de templateSchema/subnichoSchema
export const configuracoesSchema = z.object({
  diasParadoNovo: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoContatado: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoNegociacao: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
});
export type ConfiguracoesFormValues = z.input<typeof configuracoesSchema>;
```

### Server Action (padrão idêntico a updateTemplate)
```typescript
// src/actions/configuracoes-actions.ts
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { configuracoes } from "@/db/schema";
import { configuracoesSchema } from "@/lib/validations";

type ActionState =
  | { success: true }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

export async function saveConfiguracoes(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = configuracoesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.update(configuracoes).set(parsed.data).where(eq(configuracoes.id, 1));

  revalidatePath("/configuracoes");
  revalidatePath("/pipeline");
  return { success: true };
}
```
Fonte: composição direta de `src/actions/template-actions.ts` (padrão `_prevState`/`ActionState`/`revalidatePath`) e `src/lib/validations.ts` (padrão de schema Zod do projeto) — ambos lidos diretamente neste repositório nesta sessão.

## State of the Art

Não aplicável — nenhuma tecnologia externa mudou de versão ou de recomendação relevante para esta fase. Toda a superfície técnica já está fixada pelo stack existente do projeto (`package.json`), verificado ao vivo nesta sessão.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Valor padrão de `diasParadoNovo`/`diasParadoNegociacao` = 5 (mesmo valor de Contatado) | Standard Stack / Pattern 1 | Baixo — D-04 só trava o valor de Contatado; se o admin preferir outro padrão para Novo/Negociação, é só editar o `.default()` no schema antes do primeiro `push`, sem impacto em dados já salvos (a linha só é semeada uma vez). O `07-UI-SPEC.md` já sugere esse mesmo valor ("sugestão de UI: mesmo valor 5 para os três") como não-vinculante |

**Nenhuma outra claim desta pesquisa é `[ASSUMED]`** — todas as decisões técnicas (forma da tabela, ferramenta de aplicação de schema, ponto de generalização do cálculo) foram verificadas por leitura direta do código-fonte e consulta direta ao banco `./data/crm.db` deste repositório nesta sessão, não por conhecimento de treinamento ou busca externa.

## Open Questions

1. **Nome exato dos campos do `FormData`**
   - O que sabemos: `07-UI-SPEC.md` já sugere `diasParadoNovo`/`diasParadoContatado`/`diasParadoNegociacao` como exemplo, mas deixa a decisão final a critério do planner/executor.
   - O que é incerto: nenhuma ambiguidade real — a pesquisa recomenda usar exatamente esses nomes (consistência com os nomes de coluna em camelCase do Drizzle, mesmo padrão de `contactAttempts`/`isDefault`).
   - Recommendation: planner fixa `diasParadoNovo`/`diasParadoContatado`/`diasParadoNegociacao` como nomes definitivos de campo (schema Zod + `name` dos inputs), sem reabrir a decisão.

2. **Reconciliação do snapshot de migrações (débito da Fase 6)**
   - O que sabemos: o drift entre `src/db/migrations` e `./data/crm.db` já existe há 2 fases e foi conscientemente adiado em ambas.
   - O que é incerto: quando (ou se) vale a pena reconciliar com uma migração `--custom` que apenas documenta o estado real, sem alterar dados.
   - Recommendation: não resolver nesta fase (fora do escopo de CONFIG-01/CONFIG-02); apenas registrar no SUMMARY.md desta fase como débito técnico acumulado, mesmo tratamento dado na Fase 6.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `drizzle-kit` CLI (via `npx`) | Aplicar a nova tabela `configuracoes` ao banco | ✓ | 0.31.10 (confirmado via `npx drizzle-kit --version`) | — |
| `./data/crm.db` (SQLite local) | Toda a fase | ✓ | arquivo presente, WAL mode, 3 migrações registradas (`__drizzle_migrations`), tabelas `leads`/`subnichos`/`templates` confirmadas | — |

Nenhuma dependência externa (rede, serviço, API de terceiros) é necessária — fase inteiramente local, consistente com o modelo "SQLite local file" documentado em `CLAUDE.md`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | não | App single-admin sem autenticação, decisão de escopo explícita do projeto (`CLAUDE.md`: "sem necessidade de autenticação multi-usuário"); não introduzido nem afetado por esta fase |
| V3 Session Management | não | Idem — não há sessão nesta aplicação |
| V4 Access Control | não | Rota `/configuracoes` não tem controle de acesso diferenciado — mesma exposição de todas as outras rotas do app (`/pipeline`, `/leads`, etc.), consistente com o modelo de app local/single-user |
| V5 Input Validation | sim | Zod (`configuracoesSchema`), validação server-side autoritativa nos 3 campos numéricos (`.int().min(1)`) — mesmo padrão já usado em `templateSchema`/`leadSchema` |
| V6 Cryptography | não | Nenhum dado sensível/segredo manipulado nesta fase (só inteiros de configuração de negócio) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Injeção de valor não-numérico via FormData manipulado (bypass do `<input type="number">` client) | Tampering | Zod `z.coerce.number().int().min(1)` no server rejeita qualquer valor não coercível a inteiro válido ≥ 1 — a mesma defesa que já protege `leadSchema`/`templateSchema` contra manipulação de FormData bruto |
| SQL injection via valores de configuração | Tampering | Não aplicável — Drizzle ORM sempre usa queries parametrizadas (`db.update(...).set(...)`), nunca concatenação de string SQL, mesmo padrão de todo o resto do código |

## Sources

### Primary (HIGH confidence — leitura/execução direta neste repositório, nesta sessão)
- `src/db/schema.ts` — forma das tabelas `subnichos`/`templates`/`leads` (convenção de colunas tipadas, índices, defaults)
- `src/app/pipeline/page.tsx` — implementação atual hardcoded do cálculo "esfriando"
- `src/components/pipeline-board.tsx` + `src/components/pipeline-lead-card.tsx` — confirma que o destaque "esfriando" já é agnóstico de etapa (consome `Set<number>`)
- `src/components/template-form-dialog.tsx` + `src/actions/template-actions.ts` — padrão de formulário Server Action + `react-hook-form` + Zod a ser replicado
- `src/components/subnicho-manager.tsx` — padrão alternativo mais simples (`action={formAction}` direto, sem `react-hook-form` client-side) — considerado, mas o `07-UI-SPEC.md` já especifica o padrão `TemplateFormDialog` (react-hook-form + `useActionState` + FormData bruto)
- `src/components/ui/field.tsx`, `src/components/ui/input.tsx` — confirma API exata dos primitivos exigidos pelo `07-UI-SPEC.md`
- `src/db/migrations/meta/0002_snapshot.json` + `./data/crm.db` (consulta direta via `better-sqlite3` nesta sessão) — confirma o drift documentado no Pitfall 1
- `.planning/phases/06-auto-avan-o-de-etapa-contador-de-tentativas/06-01-PLAN.md` — precedente idêntico do mesmo problema de drift, mesma decisão (`push` em vez de `generate`)
- `package.json`, `npm view drizzle-orm/drizzle-kit/zod version`, `npx drizzle-kit --version` — versões confirmadas ao vivo neste host

### Secondary (MEDIUM confidence)
Nenhuma — toda a pesquisa desta fase foi resolvível por leitura/execução direta do próprio repositório, sem necessidade de fontes externas (nenhuma tecnologia nova entra no stack).

### Tertiary (LOW confidence)
Nenhuma.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma lib nova, todas as versões confirmadas ao vivo neste host
- Architecture: HIGH — padrões extraídos por leitura direta do código-fonte existente, não inferidos
- Pitfalls: HIGH — o Pitfall 1 (o mais crítico) foi verificado por consulta SQL direta ao banco real, não é hipótese

**Research date:** 2026-07-31
**Valid until:** Válido enquanto `src/db/migrations/meta/0002_snapshot.json` continuar sendo o snapshot mais recente e o drift documentado não for reconciliado — reavaliar o Pitfall 1 se uma fase futura rodar `drizzle-kit generate` com sucesso (o que indicaria reconciliação já feita).
