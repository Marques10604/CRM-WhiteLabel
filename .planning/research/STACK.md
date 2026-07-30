# Stack Research

**Domain:** Adição de 3 capacidades a um CRM Next.js/Drizzle/SQLite já em produção (solo, local-first) — auto-avanço de etapa por clique em WhatsApp, contador de tentativas de contato, e uma tela de configuração por etapa (milestone v1.2 "Follow-up Automático")
**Researched:** 2026-07-30
**Confidence:** HIGH

## Recommendation em uma frase

**Zero pacotes novos.** As três features do v1.2 (auto-avanço Novo→Contatado, `contactAttempts`, `/configuracoes` de dias-parado) são resolvidas inteiramente com o que já está instalado: um `onClick` de `<a>` já existente chamando uma Server Action, duas colunas/uma tabela novas no schema Drizzle já existente, e o mesmo trio shadcn/ui + react-hook-form + Zod já usado em todo formulário do app. Isso não é uma simplificação forçada — é o que a investigação do código atual mostra ser suficiente.

## Recommended Stack

### Core Technologies (já instaladas — nenhuma mudança)

| Technology | Version | Purpose nas 3 features novas | Por que é suficiente |
|------------|---------|-------------------------------|------------------------|
| Next.js Server Actions | 16.2.10 (já instalado) | Trigger de auto-avanço de etapa, incremento de `contactAttempts`, CRUD de `/configuracoes` | O clique que precisa ser "detectado" já é um `onClick` de React num `<a>` real em `whatsapp-preview-dialog.tsx` (linha 166-178). Chamar uma Server Action a partir desse `onClick` (fire-and-forget, sem `preventDefault`) é o padrão idiomático de Server Actions chamadas fora de `<form>` — não precisa de rota de API, fetch manual, nem beacon. |
| Drizzle ORM + drizzle-kit | 0.45.2 / 0.31.10 (já instalado) | Nova coluna `contactAttempts` em `leads`, nova tabela `stageSettings` (ou equivalente) para dias-parado por etapa | Mesmo padrão já usado para `stageChangedAt`: migração custom em `src/db/migrations` com backfill explícito (o schema.ts já documenta esse padrão no comentário da linha 48). Não há necessidade de KV genérico — 3-5 etapas com um inteiro cada é uma tabela relacional trivial, não um caso de uso para um "settings store" separado. |
| better-sqlite3 (SQLite local) | 12.11.1 (já instalado) | Persistência de ambas as mudanças de schema | Sem mudança de driver — tudo síncrono e local, como hoje. |
| react-hook-form + Zod + `@hookform/resolvers` | 7.82.0 / 4.4.3 / 5.4.0 (já instalado) | Formulário de `/configuracoes` (N campos numéricos, um por etapa) | Mesmo padrão do form de lead/template/sub-nicho já existente — não é um caso especial que justifique outra lib de formulário. |
| shadcn/ui (Base UI) | CLI 4.13.1 (já instalado) | Layout da nova página `/configuracoes`, badges de etapa, campos numéricos | Reutiliza `Field`/`Input`/`Button`/`Card` já presentes no repo; não precisa de novos componentes shadcn além dos já gerados (confirmar com `npx shadcn add` apenas se faltar algum primitivo específico, mas `input`/`field`/`button`/`card` já existem no projeto). |
| sonner | 2.0.7 (já instalado) | Toast "Etapa avançada para Contatado" / "Configurações salvas" | Já é o padrão de toast do app (spec do milestone pede explicitamente "toast de confirmação"). |
| date-fns | 4.4.0 (já instalado) | Cálculo de "dias parado" generalizado por etapa (substituindo `differenceInDays(...) >= 5` hardcoded) | Mesma função `differenceInDays` já usada em `src/app/pipeline/page.tsx`; só passa a comparar contra um valor vindo da nova tabela de configurações em vez da constante `5`. |

### Supporting Libraries

Nenhuma nova. As bibliotecas de suporte que a milestone poderia sugerir (state management, analytics, tracking de clique) são todas desnecessárias — ver "What NOT to Use" abaixo.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Drizzle Kit (`drizzle-kit generate` + migração manual de backfill) | Gerar e revisar a migração SQL para `contactAttempts` e a nova tabela de configurações | Seguir o mesmo padrão já registrado no projeto para `stageChangedAt` (coluna nullable sem default + migração custom de backfill), documentado no comentário de `src/db/schema.ts:48`. Não usar `db push` para essa mudança — o projeto já usa migrações versionadas em `src/db/migrations`. |
| `npm run guard:no-hard-delete` | Verificação existente | Não afeta a nova tabela de configurações diretamente (ela não é uma entidade "removível" no sentido do LEAD-04), mas rodar o guard depois da migração é boa prática de qualquer forma. |

## Installation

```bash
# Nenhuma instalação necessária.
# As três features usam exclusivamente pacotes já presentes em package.json.
```

## Integração com o código existente

### 1. Auto-avanço de etapa ao clicar em "Abrir WhatsApp"

O ponto de integração é literal, não hipotético: `src/components/whatsapp-preview-dialog.tsx` já renderiza

```tsx
<a
  href={waHref}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => onOpenChange(false)}
  ...
>
  <MessageCircle />
  Abrir WhatsApp
</a>
```

Esse `onClick` já dispara em todo clique real do usuário no link `wa.me`, em **todas as telas** que usam o modal (dashboard, pipeline, lista de leads, pós-importação) — porque `WhatsAppPreviewDialog` é o componente único e compartilhado (ver comentário do próprio arquivo: "compartilhado entre o dashboard... e o pipeline"). Isso resolve de saída o requisito "todas as telas" sem duplicar lógica.

**Padrão recomendado:** estender esse `onClick` para também chamar uma nova Server Action (ex.: `registerWhatsAppContact(leadId, tipo)` em `src/actions/lead-actions.ts`), sem `await` bloqueando a UI e sem `event.preventDefault()` — a navegação do `<a href>` para `wa.me` é uma navegação de browser nativa, independente da Promise da Server Action; não há corrida entre elas porque o clique de um link com `target="_blank"` não é cancelado por trabalho JS assíncrono não-bloqueante disparado no mesmo handler.

```tsx
onClick={() => {
  onOpenChange(false);
  void registerWhatsAppContact(lead.id, tipo); // fire-and-forget
}}
```

Dentro da Server Action, a lógica de "não regredir/re-avançar leads já além de Contatado" e "só conta tentativa, sempre" são dois efeitos deliberadamente separados:
- `contactAttempts` incrementa sempre (qualquer `tipo` de template, qualquer etapa) — um `UPDATE ... SET contact_attempts = contact_attempts + 1`.
- O avanço de etapa só roda quando `tipo === "primeiro_contato"` E a etapa atual é `"novo"` — mesmo padrão de guard condicional já usado em `updateLeadStage`/`updateLead` (comparar `current.stage` antes de escrever, exatamente como já é feito para decidir se `stageChangedAt` é tocado).

Não existe "sinal confiável de mensagem enviada" e a milestone não pede isso — pede "clique em Abrir WhatsApp", que é exatamente o que esse handler já observa. Não há necessidade de detectar foco de janela, `visibilitychange`, ou qualquer heurística de "o WhatsApp realmente abriu" — isso seria engenharia excedente para um requisito que já é "clique no botão", não "confirmação de entrega".

### 2. Contador `contactAttempts`

Nova coluna em `leads` (schema.ts):

```ts
contactAttempts: integer("contact_attempts").notNull().default(0),
```

Sem tabela separada de "eventos de contato" — a milestone pede um contador simples exibido no card, não um histórico auditável por tentativa (isso seria over-engineering para o requisito descrito; se um histórico granular vier a ser pedido depois, uma tabela `contact_events` pode ser adicionada então, sem migração retroativa quebrada, porque o contador em `leads` continua válido independentemente). Exibição no card: adicionar um `<span>` em `pipeline-lead-card.tsx` ao lado do já existente indicador de "Esfriando" — mesmo padrão visual (ícone lucide-react + texto), sem novo componente de UI.

### 3. Configuração de dias-parado por etapa (`/configuracoes`)

Nova tabela relacional, não um KV genérico:

```ts
export const stageSettings = sqliteTable("stage_settings", {
  stage: text("stage", { enum: ["novo", "contatado", "negociacao"] }).primaryKey(),
  diasParaEsfriar: integer("dias_para_esfriar").notNull(),
});
```

Justificativa de tabela dedicada em vez de KV genérico (`key TEXT, value TEXT`): o domínio é fechado e conhecido (3 etapas fixas: Novo/Contatado/Negociação — "Fechado"/"Perdido" não esfriam, são estados terminais), o valor é sempre um inteiro (dias), e uma PK textual por etapa dá integridade referencial e type-safety do Drizzle de graça (`stage` como enum, igual ao já usado em `leads.stage`). Um KV genérico (`settings(key, value)` com value como string livre) jogaria fora essa validação de tipo e exigiria parsing manual — solução mais genérica, porém pior, para um requisito que não é genérico.

Seed inicial: migração de backfill insere as 3 linhas com o valor hoje hardcoded (5 dias para "contatado"; escolher um valor razoável para "novo"/"negociacao" ou deixar o admin definir no primeiro acesso — decisão de produto, não de stack).

`src/app/pipeline/page.tsx` troca a constante `5` por uma leitura de `stageSettings` (uma query a mais no `Promise.all` já existente) e generaliza o filtro de `esfriandoLeadIds` para as 3 etapas em vez de só `"contatado"`.

A página `/configuracoes` em si: uma rota nova (`src/app/configuracoes/page.tsx`) com um form react-hook-form + Zod (mesmo padrão de `template-form-dialog.tsx`/`lead-form-dialog.tsx`), N campos numéricos (um por etapa), submetido a uma Server Action que faz upsert nas 3 linhas. Nenhum componente shadcn novo é necessário além do que já existe (`Input type="number"`, `Field`, `Button`).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `onClick` do `<a>` existente + Server Action fire-and-forget | `navigator.sendBeacon()` ou API Route dedicada para o "beacon" de clique | Só faria sentido se a milestone exigisse rastrear cliques mesmo quando o usuário fecha a aba imediatamente antes da Promise resolver — não é o caso aqui (é uma Server Action local rodando no mesmo processo Next.js, latência de milissegundos, sem risco real de perda em uso solo/local). `sendBeacon` resolve um problema de navegação cross-origin/unload que este app não tem. |
| Coluna `stage_settings(stage, dias_para_esfriar)` relacional | Tabela KV genérica `settings(key TEXT, value TEXT)` | Se a v1.3+ trouxer muitas outras configurações heterogêneas do app (não só "dias por etapa") e a soma delas justificar um único mecanismo de settings — nesse momento reavaliar; hoje seriam 3 linhas de um domínio fechado, não vale o parsing manual de tipos que um KV genérico exige. |
| `contactAttempts` como coluna inteira em `leads` | Tabela `contact_events(lead_id, tipo, created_at)` com contagem derivada | Se o produto pedir depois "ver histórico de quando cada tentativa aconteceu" (não só o total) — aí sim vale a tabela de eventos, com `contactAttempts` podendo inclusive continuar existindo como coluna desnormalizada para performance da leitura no card. Não implementar isso agora é evitar escopo que a milestone explicitamente não pediu. |
| Server Action chamada direto do `onClick` do `<a>` | `<form action={serverAction}>` envolvendo o link | O elemento é um link de navegação real (`href` + `target="_blank"`), não um formulário; envolver um `<a>` em `<form>` para usar a sintaxe `action=` de Server Actions é possível mas desnecessariamente indireto quando o `onClick` já existe e já faz outra coisa (`onOpenChange(false)`) no mesmo componente. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Qualquer state management library (Zustand, Redux, Jotai, Context global) | Nenhuma das 3 features introduz estado compartilhado entre componentes distantes que `useState` local + Server Actions + `revalidatePath` não resolvam — é exatamente o padrão que todo o resto do app já usa (`use-first-contact-trigger.ts` é a prova: um hook local simples, sem lib de estado). Adicionar uma lib de estado agora seria puramente especulativo. | `useState` local (já usado no dialog) + Server Actions + `revalidatePath("/pipeline")` (já é o padrão de toda mutação no repo) |
| SDK de analytics/click-tracking (PostHog, Mixpanel, Segment, GA) para contar cliques em WhatsApp | O requisito é um contador simples e local no card do pipeline (dado de negócio, não telemetria de produto) — puxar uma ferramenta de analytics externa para persistir um número que já mora no seu próprio banco SQLite seria over-engineering, custo desnecessário (a maioria tem free tier limitado) e um vazamento de dado de lead (nome, contato) para um serviço de terceiros sem necessidade, o que é especialmente sensível tratando-se de dados pessoais de leads de saúde. | Coluna `contactAttempts` no próprio `leads`, incrementada pela Server Action já descrita |
| `navigator.sendBeacon` / Service Worker para "garantir" que o clique é registrado mesmo com navegação | Resolve um problema (perda de request em unload de página) que não existe aqui: a Server Action roda no mesmo processo do Next.js local, sem cross-origin, sem beforeunload real (o link abre em nova aba/app, a aba do CRM continua viva) | `onClick` simples, fire-and-forget, como descrito acima |
| Nova tabela `settings` genérica tipo "key-value config store" | Domínio fechado (3 etapas fixas conhecidas em tempo de desenvolvimento) não precisa de um mecanismo de configuração arbitrário e schema-less; isso tira o type-safety que o Drizzle dá de graça com um enum | Tabela `stage_settings` tipada, como descrito acima |
| Rota de API (`route.ts`) para registrar o clique ou salvar configurações | Nenhum consumidor externo a esta UI existe (mesma razão documentada no `CLAUDE.md` do projeto para preferir Server Actions em vez de API — decisão já tomada para o app inteiro, não deve ser revertida numa milestone incremental) | Server Actions em `src/actions/lead-actions.ts` (contador/avanço) e um novo `src/actions/settings-actions.ts` (configurações) |
| Biblioteca de detecção de "app aberto"/deep-link status (ex.: bibliotecas que tentam detectar se o WhatsApp app abriu via `visibilitychange`/timeout) | A milestone e o `wa.me` explicitamente não prometem confirmação de envio — só "link foi clicado" (ver `<question>` do research: "não há sinal confiável de 'mensagem realmente enviada'"). Tentar simular essa confirmação é uma heurística frágil (falsos positivos/negativos entre desktop web WhatsApp, app mobile, diferentes navegadores) que a spec do produto não pede e que criaria falsa confiança no dado. | Contar o clique como o evento em si — é o que o CRM consegue observar de forma confiável, e é o que foi pedido. |

## Stack Patterns by Variant

**Se o app permanecer local-only (variante atual, `better-sqlite3` + arquivo local):**
- Migração de schema roda com `npx drizzle-kit generate` seguido de `npx drizzle-kit migrate` (ou execução manual do arquivo gerado), como já documentado no padrão existente do projeto para `stageChangedAt`.
- Nenhuma mudança de infraestrutura necessária para estas 3 features.

**Se e quando o app migrar para Turso/hosted (variante descrita no STACK.md do v1 original, ainda não adotada por decisão do usuário em 2026-07-29):**
- O mesmo schema Drizzle (`contactAttempts`, `stageSettings`) funciona sem alteração — só a string de conexão muda (`drizzle-orm/libsql` em vez de `drizzle-orm/better-sqlite3`), confirmando que essa decisão de stack não precisa ser revisitada agora.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| drizzle-orm@0.45.2 | drizzle-kit@0.31.10 (já em uso) | Nenhuma mudança de versão necessária para adicionar coluna/tabela nova — é uso normal do ORM já instalado, sem features novas do Drizzle sendo requisitadas. |
| next@16.2.10 (Server Actions) | react@19.2.7 | Chamar uma Server Action a partir de um `onClick` de elemento nativo (`<a>`), fora de um `<form>`, é um padrão suportado desde Server Actions estáveis (Next 14+) e continua válido em 16.2.10 — não é um uso experimental. |

## Sources

- Leitura direta do código-fonte do projeto (HIGH confidence, é a fonte de verdade sobre o que já existe):
  - `src/db/schema.ts` — schema atual de `leads`/`templates`/`subnichos`, padrão de coluna nullable + comentário de migração custom (`stageChangedAt`)
  - `src/actions/lead-actions.ts` — padrão de Server Action com guard "só grava se a etapa mudou" (`updateLead`, `updateLeadStage`), já reaproveitável para o guard de auto-avanço
  - `src/components/whatsapp-preview-dialog.tsx` — o `<a href={waHref}>` real com `onClick` já existente, ponto de integração exato para o auto-avanço e o contador
  - `src/components/whatsapp-send-button.tsx`, `src/components/pipeline-lead-card.tsx` — padrão de ícone + `onClick` prop-drilled, reutilizável para exibir `contactAttempts` no card
  - `src/app/pipeline/page.tsx` — cálculo hardcoded de "esfriando" (`stage === "contatado"` + `differenceInDays >= 5`) a ser generalizado
  - `package.json` — confirma todas as versões acima como já instaladas, nenhuma desatualizada para o uso proposto
- `.planning/PROJECT.md` — escopo exato da milestone v1.2 e requisitos textuais das 3 features
- Conhecimento geral de Server Actions do Next.js (invocação fora de `<form>`, semântica fire-and-forget de handlers assíncronos não-bloqueantes em `onClick`) — MEDIUM-HIGH confidence, comportamento estável e documentado da própria API de Server Actions desde sua introdução, não dependente de mudanças recentes de versão

---
*Stack research for: adição de auto-avanço de pipeline por clique em WhatsApp, contador de tentativas de contato, e tela de configuração de dias-parado por etapa*
*Researched: 2026-07-30*
