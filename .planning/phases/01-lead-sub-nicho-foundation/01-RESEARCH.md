# Fase 1: Lead & Sub-nicho Foundation - Pesquisa

**Pesquisado em:** 2026-07-19
**Domínio:** Scaffolding greenfield de app Next.js 16 (App Router) full-stack com Drizzle ORM + SQLite local, formulários com Server Actions, e UI CRUD/tabela com shadcn/ui
**Confiança:** HIGH (stack, versões e padrões centrais verificados via npm registry + documentação oficial) / MEDIUM em alguns pontos de UX específicos do shadcn Base UI (mudança muito recente, julho de 2026)

<user_constraints>
## Restrições do Usuário (de CONTEXT.md)

### Decisões Travadas

**9 requisitos travados.** Ver `01-SPEC.md` para requisitos completos, limites e critérios de aceite. Os agentes downstream DEVEM ler `01-SPEC.md` antes de planejar ou implementar.

**Em escopo (de SPEC.md):**
- Modelo de dados de lead (schema Drizzle) e CRUD via Server Actions
- Formulário de lead (criar/editar) com os 9 campos, validação obrigatória completa
- Modelo de dados de sub-nicho, tela de gestão (criar + renomear apenas), bloqueio de duplicata exata case-insensitive
- Lista de leads ativos: visão em tabela, filtros single-select (sub-nicho, etapa), filtro por intervalo de datas (follow-up), ordenação de colunas, ordenação padrão por follow-up mais próximo
- Soft-delete com modal de confirmação
- Página Lixeira (trash) listando leads soft-deleted com ação de restaurar

**Fora de escopo (de SPEC.md):**
- Importação CSV e detecção de duplicata por telefone — Fase 2
- Board de pipeline / drag-and-drop / flag de "esfriando" — Fase 3
- Dashboard de follow-up, templates de WhatsApp, links wa.me — Fase 4
- Deletar/desativar/mesclar sub-nicho — v2 (LEAD-V2-01)
- Histórico de notas com timestamp por entrada — v2 (PIPE-V2-02); notas é um único campo sobrescrevível
- Detecção fuzzy/similaridade de duplicata de nome de sub-nicho — julgamento do admin apenas
- Multi-usuário, auth, app mobile, hospedagem em nuvem — fora de escopo por PROJECT.md

### Decisões de Implementação (D-01 a D-18)

**Formulário de lead**
- **D-01:** Formulário abre como modal/dialog sobre a lista (não uma página dedicada) — usado tanto para criar quanto para editar.
- **D-02:** Os 9 campos são agrupados em seções visuais dentro do mesmo modal (sem tabs/etapas): "Contato" (nome, telefone, canal, origem), "Negócio" (sub-nicho, etapa, valor), "Acompanhamento" (notas, follow-up).
- **D-03:** Campo de sub-nicho é um combobox pesquisável (não um select simples) — antecipa o crescimento da lista de sub-nichos ao longo do tempo.
- **D-04:** Fechar o modal com alterações não salvas mostra um aviso "Descartar alterações?" antes de descartar.
- **D-05:** Modal de confirmação de exclusão deve incluir o nome específico do lead na mensagem (ex.: "Tem certeza que deseja excluir [Nome]?"), não uma mensagem genérica.

**Lista de leads**
- **D-06:** Colunas visíveis por padrão na tabela: Nome, Sub-nicho, Etapa, Follow-up, Telefone. Valor, canal, origem e notas só ficam visíveis dentro do modal de edição.
- **D-07:** Clicar em uma linha abre o mesmo modal de edição usado na criação, pré-preenchido com os dados daquele lead.
- **D-08:** Ações em nível de linha (editar, excluir) são botões de ícone diretos na linha, não escondidos atrás de um menu "…".
- **D-09:** Etapa é exibida como um badge colorido na lista (ex.: cinza=Novo, azul=Contatado, amarelo=Negociação, verde/vermelho=Fechado/Perdido) — antecipa reuso pelo board da Fase 3.
- **D-10:** "Fechado/Perdido" permanece um único valor de etapa, exatamente como travado em SPEC.md/ROADMAP.md — não é dividido em dois estágios separados.
- **D-11:** Filtros (sub-nicho, etapa, intervalo de data de follow-up) ficam em uma toolbar fixa sempre visível acima da tabela, não um painel colapsável.
- **D-12:** Paginação é clássica (controles anterior/próximo), 25 leads por página — usando a paginação nativa do `@tanstack/react-table`.
- **D-13:** Estado vazio (sem leads ainda) mostra texto explicativo mais um botão de call-to-action "Novo lead", além do botão "Novo lead" sempre visível em outro lugar da tela.
- **D-14:** Rota raiz `/` mostra a lista de leads diretamente (com estado padrão de ordenação/filtro) — sem tela de boas-vindas separada. Isso se torna o futuro lar do dashboard de follow-up da Fase 4.

**Gestão de sub-nicho**
- **D-15:** Tela de gestão dedicada (não criação inline a partir do combobox do formulário de lead) — corresponde ao limite do SPEC.md (criar + renomear apenas, sem exclusão).
- **D-16:** Edição é inline dentro da lista — um ícone de lápis transforma o nome em um campo editável diretamente; "+ Adicionar" adiciona uma nova linha. Sem modal separado para CRUD de sub-nicho.

**Lixeira (trash)**
- **D-17:** Restaurar um lead da Lixeira é instantâneo (sem modal de confirmação) — restaurar é uma ação segura e não-destrutiva, diferente de excluir.

**Navegação**
- **D-18:** Sidebar de navegação fixa com links para Leads, Sub-nichos e Lixeira — não aninhado sob um menu de configurações. Estabelece a estrutura que a Fase 3 (board) e Fase 4 (dashboard) vão estender.

### A Critério de Claude

- Cores exatas dos badges por etapa, texto das notificações toast (sonner), ordem dos campos do formulário dentro de cada seção, e UI de estado de carregamento/envio são deixados para a implementação — sem preferência do fundador expressa além das decisões acima.

### Ideias Adiadas (FORA DE ESCOPO)

Nenhuma — a discussão permaneceu dentro do escopo da fase. Nenhuma sugestão de scope-creep surgiu durante esta sessão.
</user_constraints>

<phase_requirements>
## Requisitos da Fase

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|----------------------|
| LEAD-01 | Admin pode cadastrar/editar um lead com nome, telefone, canal de contato, origem, valor estimado, notas, data de follow-up e etapa | Ver `## Standard Stack`, `## Architecture Patterns` (Pattern 2: Server Action + Zod + react-hook-form) e `## Code Examples` (schema Drizzle da tabela `leads`, Server Action `createLead`/`updateLead`, formulário shadcn) |
| LEAD-02 | Admin pode cadastrar e renomear sub-nichos numa lista administrável (evita duplicatas como "Nutri" e "nutricionista") | Ver `## Code Examples` (índice único case-insensitive `lower(trim(nome))` no Drizzle + verificação redundante na Server Action) e Pitfall 1 |
| LEAD-03 | Cada lead pertence a exatamente um sub-nicho da lista administrável | Ver `## Code Examples` (foreign key `subnichoId` com `.references()` e `onDelete: 'restrict'`) |
| LEAD-04 | Exclusão de lead é soft-delete — nunca apaga de forma definitiva, pode ser recuperado | Ver `## Don't Hand-Roll` e `## Code Examples` (coluna `deletedAt` nullable timestamp, queries com `isNull`/`isNotNull`) |
| REMIND-02 | Admin pode ver lista de todos os leads, filtrável e ordenável por sub-nicho, etapa e data de follow-up | Ver `## Architecture Patterns` (recipe de data-table do shadcn com `@tanstack/react-table`) e índices recomendados em `## Code Examples` |
</phase_requirements>

## Summary

Este é um projeto greenfield: nenhum código de aplicação existe no repositório ainda, apenas os artefatos de planejamento (`.planning/`) e o `CLAUDE.md` com o stack já decidido. A Fase 1 precisa fazer o scaffold completo de um app Next.js 16 (App Router) + React 19 + TypeScript 5.9.x + Drizzle ORM 0.45.2 + better-sqlite3 12.11.1 + Tailwind CSS 4 + shadcn/ui, e entregar nele o primeiro corte vertical completo: schema de banco, Server Actions de CRUD, formulário modal, tabela filtrável/ordenável, soft-delete e Lixeira. Toda a decisão de stack já está travada em `CLAUDE.md` e `.planning/research/STACK.md` — esta pesquisa foca no "como", não no "o quê": ordem correta de scaffolding, armadilhas de compatibilidade de versão específicas dessa combinação exata em julho de 2026, o padrão de schema Drizzle para soft-delete + sub-nicho com dedupe case-insensitive, o padrão atual de Server Actions + `useActionState` + Zod + react-hook-form no Next.js 16, e a mudança recente e relevante do shadcn/ui para Base UI como padrão (o que afeta diretamente o combobox pesquisável exigido pela decisão D-03).

Dois achados desta pesquisa merecem atenção extra do planejador. Primeiro: `better-sqlite3` só ganhou binários pré-compilados para Node.js 24 (ABI N-API 137) a partir da versão `^12.0.0` — a versão travada no stack (12.11.1) já cobre isso, mas o ambiente de desenvolvimento roda Node v24.12.0, então instalar qualquer versão abaixo de 12.x forçaria uma compilação local via `node-gyp` (que falha silenciosamente no Windows sem Visual Studio Build Tools instalado). Segundo: o shadcn/ui mudou seu padrão de Radix UI para Base UI em julho de 2026 — isso inclui um componente `Combobox` nativo (não mais a receita antiga de compor `Popover` + `Command`), que é exatamente o padrão exigido pela decisão D-03 (sub-nicho como combobox pesquisável). O CLI ainda suporta Radix via flag, mas para um projeto novo em julho de 2026 o padrão do `shadcn init` já será Base UI.

**Recomendação primária:** Faça o scaffold com `create-next-app` → configure Drizzle + better-sqlite3 (schema com soft-delete e índice único case-insensitive para sub-nicho) → rode `drizzle-kit generate` + `drizzle-kit migrate` para ter migrações versionadas em git → inicialize shadcn/ui (aceitando o padrão Base UI) → construa a tela de leads como Server Component (query inicial) + Client Component (`@tanstack/react-table` para sort/filtro/paginação) + modal de formulário como Client Component usando Server Actions com `useActionState` + Zod + react-hook-form.

## Architectural Responsibility Map

| Capacidade | Camada Primária | Camada Secundária | Justificativa |
|------------|------------------|---------------------|----------------|
| Formulário de lead (UI, validação client-side, combobox de sub-nicho) | Browser/Client | Frontend Server (SSR) | Client Component com react-hook-form + shadcn Form; a validação client-side é UX imediata, mas a fonte de verdade é sempre revalidada no Server Action |
| CRUD de lead (criar/editar/soft-delete) | Frontend Server (SSR) — Server Actions | Database/Storage | Server Actions substituem a camada de API REST (decisão explícita do CLAUDE.md: "no separate API layer"); validam com Zod e chamam Drizzle diretamente, no mesmo processo |
| Gestão de sub-nicho (criar/renomear, dedupe case-insensitive) | Frontend Server (SSR) — Server Actions | Database/Storage | Mesma camada de Server Actions; a checagem de duplicata roda no server (fonte de verdade), reforçada por um índice único no banco |
| Listagem/filtragem/ordenação de leads | Frontend Server (SSR) — Server Component (query inicial) | Browser/Client (interatividade de filtros/paginação) | A query inicial (leads ativos, ordenados por follow-up) roda no Server Component; `@tanstack/react-table` roda client-side para sort/filtro/paginação sem round-trip ao servidor a cada interação |
| Persistência (`leads`, `subnichos`) | Database/Storage | — | SQLite via arquivo local (`better-sqlite3`), schema definido em TypeScript com Drizzle, migrações versionadas em git |
| Lixeira / restauração | Database/Storage | Frontend Server (SSR) | `deletedAt` como timestamp nullable; queries filtram por `isNull`/`isNotNull`; restaurar é um `UPDATE` simples via Server Action |
| Navegação (sidebar fixa) | Browser/Client | Frontend Server (SSR) | Layout compartilhado do App Router (`app/layout.tsx`); links de navegação client-side com `next/link` |

**Nota importante:** este projeto não tem uma camada "API/Backend" separada — as Server Actions do Next.js *são* a camada de backend, rodando no mesmo processo do servidor. Isso é uma decisão de arquitetura explícita e travada (CLAUDE.md: "no separate API layer"), não uma omissão. O planejador não deve criar route handlers (`app/api/*`) para o CRUD desta fase.

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que é padrão |
|---------|---------|---------|--------------|
| next | 16.2.10 | Framework full-stack (App Router, Server Components, Server Actions) | `[VERIFIED: npm registry]` — versão confirmada via `npm view next version` em 2026-07-19; já travada em CLAUDE.md |
| react / react-dom | 19.2.7 | Biblioteca de UI (peer obrigatório do Next 16) | `[VERIFIED: npm registry]` |
| typescript | 5.9.3 | Tipagem estática | `[VERIFIED: npm registry]` — nota importante: `npm view typescript version` retorna **7.0.2** como "latest" (GA em 2026-07-08), mas o CLAUDE.md trava explicitamente 5.9.x porque a TS 7.0 ainda não tem API programática estável nem suporte total de tooling (ESLint/language-service). Pinar exatamente `5.9.3` (última patch estável da série 5.9), **não** instalar `typescript@latest` |
| drizzle-orm | 0.45.2 | ORM/query builder type-safe sobre SQL puro | `[VERIFIED: npm registry]` |
| drizzle-kit | 0.31.10 | CLI de geração/aplicação de migrações | `[VERIFIED: npm registry]` — manter em lockstep com drizzle-orm |
| better-sqlite3 | 12.11.1 | Driver SQLite síncrono, nativo (bindings C++) | `[VERIFIED: npm registry]` — crítico: precisa ser `^12.0.0` ou superior para ter binário pré-compilado para Node.js 24 (ABI N-API 137); ver Pitfall 4 |
| @types/better-sqlite3 | 7.6.13 | Tipos TypeScript para better-sqlite3 | `[VERIFIED: npm registry]` |

### Supporting

| Biblioteca | Versão | Propósito | Quando usar |
|---------|---------|---------|-------------|
| zod | 4.4.3 | Validação de schema (Server Actions + formulários) | Validar todo input de Server Action; schema único reaproveitado entre client (react-hook-form) e server |
| react-hook-form | 7.82.0 | Estado do formulário de lead (9 campos) e do formulário de sub-nicho | Padrão para qualquer formulário não-trivial; minimiza re-renders |
| @hookform/resolvers | 5.4.0 | Ponte entre Zod e react-hook-form (`zodResolver`) | Instalar sempre a versão `latest` no momento do scaffold — há relatos de mismatch de tipos entre versões pontuais de `zod` v4.x e `@hookform/resolvers` (ver Pitfall 5); rodar `tsc --noEmit` logo após instalar para pegar isso cedo |
| @tanstack/react-table | 8.21.3 | Tabela headless para a lista de leads (sort, filtro, paginação) | Usado junto com o `<Table>` do shadcn/ui — ver recipe "data-table" em Architecture Patterns |
| shadcn (CLI) | 4.13.1 | Gera componentes de UI copiados para o repo (não é dependência de runtime) | `npx shadcn@latest init` + `npx shadcn@latest add <componente>` |
| lucide-react | 1.25.0 | Ícones (usados pelos componentes shadcn e pelos botões de ação de linha D-08) | Padrão acompanhando shadcn/ui |
| sonner | 2.0.7 | Toasts de feedback ("Lead salvo", "Sub-nicho renomeado") | Padrão recomendado pelo shadcn/ui atual |
| date-fns | 4.4.0 | Formatação e comparação de datas (ordenação por follow-up, filtro de intervalo) | Usar para o filtro de intervalo de follow-up (SPEC.md req. 7) e para exibição formatada em pt-BR |

### Alternatives Considered

| Em vez de | Poderia usar | Quando a alternativa faz sentido |
|------------|-----------|-----------|
| Server Actions (sem API separada) | Route Handlers (`app/api/*`) | Somente se um segundo cliente (ex.: app mobile) precisar consumir os mesmos dados — explicitamente fora de escopo aqui, per CLAUDE.md |
| Índice único `lower(trim(nome))` no schema (defesa em banco) | Checagem só na aplicação (Server Action) | Nunca sozinha — sem o índice, uma corrida de duas submissões simultâneas (improvável num app single-user, mas fácil de garantir) poderia criar duplicata; o índice é barato e elimina a classe de erro |
| `drizzle-kit generate` + `drizzle-kit migrate` (migrações versionadas) | `drizzle-kit push` (aplica diffs direto, sem arquivo de migração) | `push` é mais rápido para prototipagem descartável; como este é o app real (substituindo a planilha) e o CLAUDE.md valoriza explicitamente "migrations are just generated SQL files you can read and review", usar `generate`+`migrate` desde o início desta fase, não `push` |

**Installation:**
```bash
# Scaffold
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"

# Fixar TypeScript na série 5.9.x (não usar o "latest" que já é 7.0.2)
npm install -D typescript@5.9.3

# Camada de dados
npm install drizzle-orm@0.45.2 better-sqlite3@12.11.1
npm install -D drizzle-kit@0.31.10 @types/better-sqlite3@7.6.13

# Validação + formulário
npm install zod@4.4.3 react-hook-form@7.82.0 @hookform/resolvers

# UI (shadcn init interativo — aceitar Base UI quando perguntado, ver Pitfall 2)
npx shadcn@latest init
npm install @tanstack/react-table@8.21.3 lucide-react date-fns@4.4.0
npx shadcn@latest add table form dialog select combobox calendar badge button input textarea
npx shadcn@latest add sonner
```

**Version verification:** Todas as versões acima foram confirmadas ao vivo via `npm view <pkg> version` em 2026-07-19 (mesma data desta pesquisa) e batem com as versões já travadas em `CLAUDE.md`/`STACK.md`, com uma pequena divergência: `npm view tailwindcss version` retornou `4.3.3` no momento desta pesquisa, enquanto CLAUDE.md cita `4.4.3` — diferença mínima (patch/minor), não deve afetar a Fase 1; usar a versão que o `shadcn init` instalar automaticamente como peer dependency.

## Package Legitimacy Audit

`slopcheck` (v0.6.1) foi instalado com sucesso via `pip install slopcheck --break-system-packages` e executado contra os pacotes npm centrais desta fase com `slopcheck scan --pkg npm <nome> --json`.

| Pacote | Registro | Repositório fonte | slopcheck | Disposição |
|---------|----------|-------------|-----------|-------------|
| next | npm | github.com/vercel/next.js | OK | Aprovado |
| react | npm | github.com/facebook/react | OK | Aprovado |
| react-dom | npm | github.com/facebook/react | OK | Aprovado |
| typescript | npm | github.com/microsoft/TypeScript | OK | Aprovado |
| drizzle-orm | npm | github.com/drizzle-team/drizzle-orm | OK | Aprovado |
| drizzle-kit | npm | github.com/drizzle-team/drizzle-orm | OK | Aprovado |
| better-sqlite3 | npm | github.com/WiseLibs/better-sqlite3 | OK | Aprovado |
| zod | npm | github.com/colinhacks/zod | OK | Aprovado |
| react-hook-form | npm | github.com/react-hook-form/react-hook-form | OK | Aprovado |
| @hookform/resolvers | npm | github.com/react-hook-form/resolvers | OK | Aprovado |
| @tanstack/react-table | npm | github.com/TanStack/table | OK | Aprovado |
| tailwindcss | npm | github.com/tailwindlabs/tailwindcss | OK | Aprovado |
| shadcn | npm | github.com/shadcn-ui/ui | OK | Aprovado |
| lucide-react | npm | github.com/lucide-icons/lucide | OK | Aprovado |
| sonner | npm | (não verificado — scan interrompido por timeout) | não verificado | `[WARNING: slopcheck não completou verificação — pacote extremamente estabelecido e amplamente usado como padrão shadcn/ui; recomenda-se verificação manual rápida antes da instalação, mas risco considerado baixo]` |
| date-fns | npm | (não verificado — scan interrompido por timeout) | não verificado | `[WARNING: slopcheck não completou verificação — pacote extremamente estabelecido (>20M downloads/semana); recomenda-se verificação manual rápida antes da instalação, mas risco considerado baixo]` |

Adicionalmente, `npm view better-sqlite3 scripts.postinstall` foi checado: o script de postinstall é `prebuild-install || node-gyp rebuild --release` — este é o padrão esperado e documentado de qualquer pacote npm com binding nativo (baixa binário pré-compilado, ou compila localmente como fallback). Não é um sinal de risco.

**Pacotes removidos por veredito slopcheck [SLOP]:** nenhum
**Pacotes marcados como suspeitos [SUS]:** nenhum
**Pacotes não verificados por timeout (`sonner`, `date-fns`):** ambos são pacotes maduros e amplamente adotados (sonner é o toast recomendado oficialmente pelo shadcn/ui atual; date-fns tem downloads na casa de dezenas de milhões/semana) — risco residual considerado baixo, mas o planejador deve incluir uma checagem manual rápida (`npm view sonner`/`npm view date-fns` + conferir repositório no GitHub) antes de instalar, em vez de pular a verificação silenciosamente.

## Architecture Patterns

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client Components)                 │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────────┐ │
│  │ Sidebar Nav      │  │ Lead List Table    │  │ Lead Form Modal      │ │
│  │ (Leads/Sub-      │  │ (@tanstack/react-  │  │ (react-hook-form +   │ │
│  │  nichos/Lixeira) │  │  table: sort,      │  │  zodResolver,        │ │
│  │                  │  │  filter, paginate) │  │  Combobox sub-nicho) │ │
│  └────────┬─────────┘  └─────────┬──────────┘  └──────────┬──────────┘ │
└───────────┼──────────────────────┼────────────────────────┼───────────┘
            │ navega               │ dispara Server Actions   │ submit → useActionState
            ▼                      ▼                          ▼
┌───────────────────────────────────────────────────────────────────┐
│              SERVER (Server Components + Server Actions)             │
│  ┌────────────────────┐   ┌───────────────────────────────────────┐ │
│  │ Server Component     │   │ Server Actions ("use server")          │ │
│  │ (query inicial:      │   │ createLead / updateLead / softDelete   │ │
│  │  leads ativos,       │──▶│ Lead / restoreLead / createSubnicho /   │ │
│  │  ordenados por       │   │ renameSubnicho                          │ │
│  │  follow-up)          │   │ → valida com Zod → chama Drizzle        │ │
│  └──────────┬───────────┘   └───────────────────┬───────────────────┘ │
└─────────────┼───────────────────────────────────┼─────────────────────┘
              │                                    │
              ▼                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQLite via better-sqlite3)              │
│   ┌───────────────┐         ┌──────────────────┐                     │
│   │  leads         │────FK──▶│  subnichos         │                     │
│   │  deletedAt?    │         │  nome (unique      │                     │
│   │  followUpDate  │         │   case-insensitive)│                     │
│   │  stage         │         └──────────────────┘                     │
│   └───────────────┘                                                   │
└───────────────────────────────────────────────────────────────────┘
```

Fluxo do caso de uso principal (criar um lead): admin clica "Novo lead" → modal abre (Client Component) → preenche formulário com combobox de sub-nicho (dados de sub-nicho já carregados via Server Component pai) → submit dispara a Server Action `createLead` via `useActionState` → Server Action valida com Zod, insere via Drizzle, chama `revalidatePath('/')` → Server Component re-renderiza a lista com o novo lead → modal fecha e `sonner` mostra toast de sucesso.

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Layout raiz com Sidebar (D-18)
│   ├── page.tsx                 # Rota "/" = lista de leads ativos (D-14), Server Component
│   ├── subnichos/
│   │   └── page.tsx              # Tela de gestão de sub-nicho (D-15/D-16)
│   └── lixeira/
│       └── page.tsx              # Página Lixeira (leads soft-deleted)
├── db/
│   ├── schema.ts                 # Tabelas leads, subnichos
│   ├── client.ts                 # Instância do Drizzle (better-sqlite3)
│   └── migrations/               # Gerado por `drizzle-kit generate`
├── actions/
│   ├── lead-actions.ts           # createLead, updateLead, softDeleteLead, restoreLead
│   └── subnicho-actions.ts       # createSubnicho, renameSubnicho
├── components/
│   ├── ui/                       # Componentes shadcn (gerados pelo CLI, editáveis)
│   ├── lead-form-dialog.tsx      # Modal de criar/editar lead (D-01, D-02, D-04)
│   ├── lead-table.tsx            # Tabela com @tanstack/react-table (D-06 a D-13)
│   ├── subnicho-combobox.tsx     # Combobox pesquisável (D-03)
│   ├── delete-lead-dialog.tsx    # Confirmação de exclusão (D-05)
│   └── app-sidebar.tsx           # Navegação fixa (D-18)
├── lib/
│   ├── validations.ts             # Schemas Zod compartilhados (lead, subnicho)
│   └── utils.ts                   # cn() e afins (gerado pelo shadcn init)
└── types/
    └── index.ts                   # Tipos derivados do schema Drizzle (InferSelectModel)
```

### Structure Rationale

- **`db/` isolado de `actions/`:** o schema/migrações ficam separados da lógica de mutação; se o driver mudar (SQLite local → Turso/libSQL, mencionado como variante em `STACK.md`), só `db/client.ts` muda.
- **`actions/` como a única porta de entrada de escrita:** todo Client Component chama uma Server Action, nunca importa `db/client.ts` diretamente — mantém a validação Zod centralizada e evita duplicar regra de negócio (ex.: dedupe de sub-nicho) em múltiplos lugares.
- **`components/ui/` intocado pelo app:** convenção do shadcn/ui — os componentes copiados ali são a "biblioteca base"; composições específicas do domínio (como `subnicho-combobox.tsx`) vivem um nível acima, em `components/`.

### Pattern 1: Server Action + `useActionState` + Zod + react-hook-form para o formulário de lead

**O quê:** O modal de lead (D-01) é um Client Component. react-hook-form controla o estado local dos 9 campos com `zodResolver` para validação instantânea no client (feedback inline conforme SPEC.md req. 1). No submit, os dados vão para uma Server Action (`createLead`/`updateLead`) via `useActionState`, que roda a mesma validação Zod no servidor (nunca confiar só no client) antes de tocar o Drizzle.
**Quando usar:** Todo formulário desta fase (lead, sub-nicho).
**Trade-offs:** Duas validações (client + server) parecem redundância, mas são camadas diferentes: a do client é UX (erro inline imediato, sem round-trip); a do server é a fonte de verdade de segurança/integridade — nunca pular a segunda mesmo que a primeira já bloqueie o submit.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/forms (2026-06-23, verificado nesta pesquisa)
// lib/validations.ts
import { z } from "zod";

export const leadSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  telefone: z.string().trim().min(1, "Telefone é obrigatório"),
  canal: z.enum(["instagram", "whatsapp"]),
  origem: z.string().trim().min(1, "Origem é obrigatória"),
  valorEstimado: z.coerce.number().nonnegative(),
  notas: z.string().trim().min(1, "Notas são obrigatórias"),
  followUpDate: z.coerce.date(),
  subnichoId: z.coerce.number().int().positive("Selecione um sub-nicho"),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado_perdido"]),
});

// actions/lead-actions.ts
"use server";
import { leadSchema } from "@/lib/validations";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createLead(prevState: unknown, formData: FormData) {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  await db.insert(leads).values(parsed.data);
  revalidatePath("/");
  return { success: true };
}
```

```tsx
// components/lead-form-dialog.tsx
"use client";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@/lib/validations";
import { createLead } from "@/actions/lead-actions";

export function LeadFormDialog() {
  const [state, formAction, pending] = useActionState(createLead, undefined);
  const form = useForm({ resolver: zodResolver(leadSchema) });
  // form usado para validação/UX inline; formAction usado no <form action={formAction}>
  // (composição completa fica a critério da implementação — ver shadcn "React Hook Form" doc)
}
```

### Pattern 2: Índice único case-insensitive para dedupe de sub-nicho (LEAD-02, SPEC.md req. 3)

**O quê:** Em vez de confiar só numa checagem `SELECT ... WHERE lower(nome) = lower($1)` na Server Action (que sozinha não é atômica sob concorrência), o schema Drizzle declara um índice único sobre `lower(trim(nome))`. A Server Action ainda faz a checagem antes do insert para devolver uma mensagem de erro amigável e inline (SPEC.md req. 3 exige isso); o índice é a garantia de última linha no banco.
**Quando usar:** Sempre que houver um requisito de "duplicata exata, case-insensitive, ignorando espaços" — este é exatamente esse caso.

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/unique-case-insensitive-email (verificado nesta pesquisa)
// db/schema.ts
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const subnichos = sqliteTable(
  "subnichos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("subnicho_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
  ]
);

export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }).notNull(),
    origem: text("origem").notNull(),
    valorEstimado: integer("valor_estimado_centavos").notNull(), // armazenar em centavos, evita ponto flutuante
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado_perdido"] })
      .notNull()
      .default("novo"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo; setado = soft-deleted (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("leads_deleted_at_idx").on(table.deletedAt),
    index("leads_follow_up_date_idx").on(table.followUpDate),
    index("leads_stage_idx").on(table.stage),
    index("leads_subnicho_id_idx").on(table.subnichoId),
  ]
);
```

**Nota sobre `onDelete: "restrict"`:** como esta fase não permite excluir sub-nicho (LEAD-V2-01 é v2), o comportamento correto da FK é impedir a exclusão de um sub-nicho referenciado — mesmo que a UI desta fase já não ofereça essa ação, a constraint no banco documenta a regra de negócio e protege contra uma futura Server Action de exclusão de sub-nicho ser adicionada sem essa checagem.

**Nota sobre `valorEstimado`:** armazenar como inteiro em centavos (não `real`/float) evita os erros clássicos de ponto flutuante em valores monetários; formatar como R$ apenas na camada de exibição (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).

### Pattern 3: Filtro/ordenação/paginação client-side com `@tanstack/react-table` (recipe "data-table" do shadcn)

**O quê:** A lista de leads (REMIND-02, SPEC.md req. 7) usa `useReactTable` com `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel` e `getPaginationRowModel`. O Server Component pai já traz os leads ativos ordenados por `followUpDate ASC` (ordenação padrão, SPEC.md req. 7); a partir daí, sort de coluna, filtros de sub-nicho/etapa (single-select) e paginação (25/página, D-12) rodam inteiramente no client, sem round-trip ao servidor a cada clique. O filtro de intervalo de data de follow-up também roda client-side via `column.setFilterValue([inicio, fim])` com uma `filterFn` customizada.
**Quando usar:** Volume de dados desta escala (algumas centenas/poucos milhares de leads) — citado em `ARCHITECTURE.md` como o volume real esperado — cabe inteiro na memória do browser sem paginação server-side.
**Trade-offs:** Se o volume crescer para dezenas de milhares de leads, seria necessário migrar para paginação server-side (`getPaginationRowModel` manual + query com `LIMIT`/`OFFSET`) — não é o caso agora, mas vale documentar como ponto de atenção futuro (fora do escopo desta fase).

**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/data-table (verificado nesta pesquisa)
const table = useReactTable({
  data: leads,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  initialState: { pagination: { pageSize: 25 } }, // D-12
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  state: { sorting, columnFilters },
});
```

### Anti-Patterns to Avoid

- **Criar route handlers (`app/api/*`) para o CRUD de lead/sub-nicho:** decisão explícita e travada em CLAUDE.md — usar Server Actions. Só criar uma rota de API se/quando um segundo cliente real aparecer (não é o caso).
- **Validar só no client (react-hook-form/Zod) e confiar nisso:** a Server Action precisa revalidar com o mesmo schema Zod — o client pode ser contornado (DevTools, requisição direta).
- **Hardcodar a lista de sub-nichos como enum/constante:** o requisito LEAD-02/LEAD-03 exige que a lista seja administrável e crescente — precisa ser uma tabela, não um enum fixo (etapa/stage, por outro lado, é seguro como enum fixo de 4 valores, per D-10/SPEC.md req. 8).
- **Hard-delete de lead:** LEAD-04 exige soft-delete — nunca implementar um `DELETE FROM leads` de fato nesta fase.

## Don't Hand-Roll

| Problema | Não construa | Use em vez disso | Por quê |
|---------|-------------|--------------|-----|
| Validação de formulário (required, tipos, mensagens de erro inline) | Sistema de validação manual com `if`/`else` por campo | Zod schema + `zodResolver` do `@hookform/resolvers` | Zod já cobre coerção de tipo, mensagens customizadas e é reaproveitado idêntico no client e no Server Action — hand-rolling duplica lógica e diverge com o tempo |
| Estado de formulário multi-campo com validação em tempo real | `useState` por campo + handlers manuais | react-hook-form | Minimiza re-renders, já integra com o `<Form>` do shadcn/ui e com Zod via resolver |
| Dedupe case-insensitive de string no banco | Comparação em JS após buscar todos os registros (`rows.find(r => r.nome.toLowerCase() === ...)`) | Índice único SQL sobre `lower(trim(coluna))` (ver Pattern 2) | A comparação em JS não é atômica (corrida entre checagem e insert) e não escala; o índice único é garantido pelo próprio SQLite |
| Tabela com sort/filtro/paginação | Lógica manual de `Array.sort`/`Array.filter`/slice de página | `@tanstack/react-table` (headless) + `<Table>` do shadcn/ui | Biblioteca madura, testada, sem reinventar comparadores de data/string nem paginação |
| Combobox pesquisável (D-03) | `<select>` nativo + filtro manual de opções por texto digitado | Componente `Combobox` do shadcn/ui (Base UI) — ver Pitfall 2 | Acessibilidade (ARIA combobox pattern), navegação por teclado e abertura/fechamento já resolvidos |
| Migração de schema de banco | Editar o `.db` file manualmente ou escrever `ALTER TABLE` à mão | `drizzle-kit generate` + `drizzle-kit migrate` | Gera SQL revisável em PR e mantém histórico de schema em git — exatamente o motivo do Drizzle estar no stack, per CLAUDE.md |

**Key insight:** para esta fase, a maior tentação de "hand-roll" é a dedupe de sub-nicho e a validação de formulário — ambas parecem simples o suficiente para escrever à mão, mas ambas têm bibliotecas/padrões de banco que já resolvem os casos de borda (concorrência, coerção de tipo, acessibilidade) de forma mais barata do que debugar uma solução caseira depois.

## Common Pitfalls

### Pitfall 1: Checagem de duplicata de sub-nicho só na aplicação, sem índice no banco

**O que dá errado:** Se a Server Action só faz `SELECT` antes do `INSERT` sem um índice único de suporte, duas submissões quase simultâneas (ex.: duplo clique acidental no botão "+ Adicionar", D-16) podem passar pela checagem antes que o primeiro insert termine, criando dois sub-nichos com o mesmo nome (case-insensitive).
**Por que acontece:** É tentador tratar isso como "só um app single-user, não tem concorrência real" — mas duplo-clique/duplo-submit é uma race condition real mesmo com um único usuário.
**Como evitar:** Declarar o `uniqueIndex` sobre `lower(trim(nome))` no schema (Pattern 2) e capturar a exceção de constraint violation do SQLite na Server Action, convertendo para a mesma mensagem de erro inline amigável que a checagem prévia já mostraria.
**Sinais de alerta:** Dois sub-nichos com nomes idênticos exceto por caixa/espaço aparecendo na lista de gestão.

### Pitfall 2: Assumir a receita antiga (Popover + Command) para o combobox de sub-nicho

**O que dá errado:** Documentação e tutoriais anteriores a julho de 2026 sobre "shadcn combobox" descrevem uma receita composta manualmente a partir de `Popover` + `Command` (biblioteca `cmdk`). A partir de julho de 2026, o shadcn/ui passou a usar **Base UI** como padrão para projetos novos, e o Base UI já expõe um componente `Combobox` nativo (com subcomponentes `ComboboxInput`, `ComboboxContent`, `ComboboxItem` etc.) — instalável diretamente via `npx shadcn add combobox`, sem precisar compor manualmente.
**Por que acontece:** Treinamento e buscas na web ainda retornam majoritariamente a receita antiga, porque é a mais replicada historicamente; a mudança para Base UI é muito recente (changelog de julho de 2026).
**Como evitar:** Ao rodar `npx shadcn@latest init` num projeto novo nesta data, aceitar o padrão oferecido (Base UI) e usar `npx shadcn@latest add combobox` diretamente. Confirmar no `components.json` gerado qual biblioteca de primitivos foi escolhida antes de escrever qualquer composição manual de Popover+Command — isso evita trabalho duplicado.
**Sinais de alerta:** Erros de import "module not found: cmdk" ou tentativa de compor `Popover`+`Command` quando o `components.json` já indica Base UI.
**Confiança:** `[CITED: ui.shadcn.com/docs/changelog/2026-07-base-ui-default]` — MEDIUM confidence sobre o comportamento exato do CLI para projetos novos nesta data específica (a mudança é muito recente); o planejador deve tratar isso como algo a confirmar no momento do `shadcn init` real, não assumir cegamente.

### Pitfall 3: `drizzle.config.ts` com sintaxe antiga (`driver: 'better-sqlite'`) em vez da atual (`dialect: 'sqlite'`)

**O que dá errado:** Buscas na web e algumas páginas de documentação retornam a sintaxe de configuração antiga do drizzle-kit (`driver: 'better-sqlite'`), que não é mais o formato usado a partir da API atual de `defineConfig`. Usar a sintaxe errada faz `drizzle-kit generate`/`migrate`/`push` falhar ou se comportar de forma inesperada.
**Por que acontece:** O drizzle-kit passou por uma mudança de API de configuração (de `driver` genérico para `dialect` + `dbCredentials.url` explícito) e documentação/artigos antigos ainda circulam.
**Como evitar:** Usar exatamente o formato atual confirmado na documentação oficial:
```typescript
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new (verificado nesta pesquisa)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/crm.db",
  },
});
```
**Sinais de alerta:** `drizzle-kit generate` reclamando de campo desconhecido `driver`, ou não encontrando o arquivo do banco.
**Confiança:** `[CITED: orm.drizzle.team/docs/get-started/sqlite-new]` — HIGH confidence.

### Pitfall 4: `better-sqlite3` sem binário pré-compilado para Node.js 24, forçando compilação local no Windows

**O que dá errado:** Este ambiente de desenvolvimento roda Node.js v24.12.0 (confirmado via `node --version`). Versões de `better-sqlite3` anteriores a `12.0.0` não publicam binário pré-compilado para o ABI N-API 137 (Node 24) — o `postinstall` (`prebuild-install || node-gyp rebuild --release`) cai no fallback `node-gyp rebuild`, que exige toolchain de compilação C++ (Visual Studio Build Tools no Windows) e pode falhar silenciosamente ou travar o `npm install` por minutos.
**Por que acontece:** A versão travada no stack (`better-sqlite3@12.11.1`) já resolve isso — mas se alguém instalar sem pinar a versão (`npm install better-sqlite3` sem lockfile ainda) numa data futura em que o "latest" tenha mudado, ou se um ambiente diferente tiver Node < 24 vs. >= 24, o comportamento muda.
**Como evitar:** Instalar exatamente `better-sqlite3@12.11.1` (ou qualquer `^12.x` mais recente) como especificado no comando de instalação acima; após `npm install`, confirmar que não houve fallback para compilação local checando se o install terminou rápido (segundos, não minutos) e sem menção a "node-gyp" no log.
**Sinais de alerta:** `npm install` demorando muito mais que o normal, mensagens de erro sobre `node-gyp`, `MSBuild` ou "Visual Studio" no Windows.
**Confiança:** `[CITED: github.com/WiseLibs/better-sqlite3 issues #1384, #1382]` — HIGH confidence.

### Pitfall 5: Mismatch de tipos entre `zod` v4.x e `@hookform/resolvers` em versões pontuais específicas

**O que dá errado:** Zod v4 introduziu um sistema de "version branding" nos tipos internos; foram relatados casos onde `zodResolver()` de uma versão específica de `@hookform/resolvers` falha em type-check (não em runtime) contra uma versão pontual específica de `zod` (ex.: `zod@4.3.6` vs. resolver compilado contra `zod@4.0.x`). Isso não quebra a build em runtime necessariamente, mas quebra `tsc --noEmit`/CI de tipos.
**Por que acontece:** Zod v4 mudou o formato interno de erros (`.flatten()`/`.format()` deprecados em favor de `z.treeifyError()`/`z.flattenError()`) e o ecossistema de resolvers ainda está se ajustando ponto a ponto.
**Como evitar:** Instalar `@hookform/resolvers` sem pinar uma versão antiga (`npm install @hookform/resolvers` para pegar o `latest` compatível, atualmente `5.4.0`) junto com `zod@4.4.3`; rodar `npx tsc --noEmit` logo após o scaffold inicial do formulário de lead para pegar qualquer erro de tipo cedo, antes de construir o resto da UI em cima.
**Sinais de alerta:** Erro de TypeScript do tipo `Type 'Resolver<input<T>, any, output<T>>' is not assignable to type 'Resolver<output<T>, any, output<T>>'` ao usar `zodResolver(leadSchema)`.
**Confiança:** `[CITED: github.com/react-hook-form/resolvers issue #842, github.com/colinhacks/zod issue #4992]` — MEDIUM confidence (relatos de issues abertas, não uma incompatibilidade permanente documentada oficialmente).

### Pitfall 6: Ordenação/filtro por data quebrando por causa de fuso horário na comparação de `followUpDate`

**O que dá errado:** `followUpDate` é armazenado como `integer` com `mode: "timestamp"` no Drizzle (Unix epoch em segundos, UTC). Se o filtro de intervalo de datas (SPEC.md req. 7) for construído comparando strings de data local (`"2026-07-20"`) diretamente contra o timestamp UTC sem normalizar para o início/fim do dia no fuso do usuário, leads podem aparecer/desaparecer do filtro perto da meia-noite, ou a ordenação "mais próximo primeiro" pode inverter datas que deveriam ser iguais.
**Por que acontece:** `followUpDate` é uma data de negócio (não um instante exato) — tratá-la com precisão de timestamp completo introduz complexidade de fuso horário desnecessária para um campo que semanticamente é "um dia".
**Como evitar:** Ao construir o filtro de intervalo e ao formatar para exibição, normalizar com `date-fns` (`startOfDay`/`endOfDay`) no fuso local antes de comparar; ao salvar do formulário, normalizar a data escolhida no `<Calendar>` do shadcn para meia-noite local antes de converter para o timestamp armazenado.
**Sinais de alerta:** Um follow-up marcado para "hoje" aparecendo como "amanhã" ou "ontem" na lista, dependendo da hora do dia em que o admin olha a tela.
**Confiança:** `[ASSUMED]` — raciocínio de domínio aplicado (armadilha comum e bem documentada de datas-sem-hora vs. timestamps completos), não verificado contra um caso real desta aplicação.

## Code Examples

Ver exemplos completos e comentados em `## Architecture Patterns` (Pattern 1, 2 e 3) acima — schema Drizzle completo das tabelas `leads`/`subnichos`, Server Action de criação de lead com Zod, e configuração de `useReactTable` para a listagem.

### Drizzle client (conexão local)

```typescript
// Source: padrão oficial Drizzle + better-sqlite3 (orm.drizzle.team/docs/get-started/sqlite-new), verificado nesta pesquisa
// db/client.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_FILE_NAME ?? "./data/crm.db");
sqlite.pragma("journal_mode = WAL"); // recomendado para SQLite com concorrência leitura/escrita
export const db = drizzle({ client: sqlite, schema });
```

Adicionar `./data/*.db*` ao `.gitignore` (o arquivo de banco local não deve ir para o git; só as migrações em `db/migrations/` devem).

### Query de leads ativos, ordenados por follow-up mais próximo (SPEC.md req. 7)

```typescript
// Source: padrão Drizzle isNull + orderBy (drizzle-orm/sqlite-core), conhecimento consolidado do ORM
import { isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { leads } from "@/db/schema";

export async function listActiveLeads() {
  return db
    .select()
    .from(leads)
    .where(isNull(leads.deletedAt))
    .orderBy(asc(leads.followUpDate));
}
```

### Soft-delete e restore (LEAD-04)

```typescript
// actions/lead-actions.ts
"use server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function softDeleteLead(leadId: number) {
  await db.update(leads).set({ deletedAt: sql`(unixepoch())` }).where(eq(leads.id, leadId));
  revalidatePath("/");
  revalidatePath("/lixeira");
}

export async function restoreLead(leadId: number) {
  await db.update(leads).set({ deletedAt: null }).where(eq(leads.id, leadId));
  revalidatePath("/");
  revalidatePath("/lixeira");
}
```

## State of the Art

| Abordagem Antiga | Abordagem Atual | Quando mudou | Impacto |
|--------------|------------------|---------------|--------|
| shadcn/ui combobox composto manualmente de `Popover` + `Command` (`cmdk`) | Componente `Combobox` nativo do Base UI, instalável via `npx shadcn add combobox` | Julho de 2026 (`ui.shadcn.com/docs/changelog/2026-07-base-ui-default`) | Menos código manual para o combobox de sub-nicho (D-03); confirmar no `components.json` gerado qual biblioteca de primitivos o `init` escolheu |
| `useFormState` (React 18 / Next 13-14) | `useActionState` (importado de `react`, não `react-dom`) | Introduzido no React 19, que é peer obrigatório do Next.js 16 | Usar sempre `useActionState` de `react` — `useFormState` está deprecado |
| `drizzle.config.ts` com `driver: 'better-sqlite'` | `defineConfig({ dialect: 'sqlite', dbCredentials: { url } })` | Mudança de API do drizzle-kit já refletida na versão travada (0.31.10) | Usar a sintaxe atual (Pattern/Pitfall 3) — a antiga não funciona nesta versão |
| `.flatten()`/`.format()` do ZodError | `z.flattenError()`/`z.treeifyError()` (funções top-level) | Zod v4 | Ao formatar erros de validação de Server Action para o client, preferir `.flatten()` (ainda funciona mas deprecado) ou migrar para `z.flattenError(error)` |

**Deprecated/outdated:**
- `useFormState` (react-dom): substituído por `useActionState` (react) no React 19.
- Receita clássica de combobox via Popover+Command: ainda funciona (Radix continua suportado), mas não é mais o padrão de um `shadcn init` novo a partir de julho de 2026.

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|---------|---------------|
| A1 | Comportamento exato do `npx shadcn@latest init` para um projeto novo em 2026-07-19 (se realmente já oferece Base UI como padrão sem flag adicional) | Pitfall 2, State of the Art | Baixo-médio: se o CLI ainda pedir Radix por padrão, o combobox precisará da receita antiga (Popover+Command) em vez do componente nativo — mais código, mas o mesmo resultado funcional. Confirmar no momento real do `init` e ajustar o plano se necessário |
| A2 | Normalização de fuso horário necessária para `followUpDate` (Pitfall 6) não foi verificada contra um caso de teste real desta aplicação | Common Pitfalls (Pitfall 6) | Baixo: é um padrão de armadilha bem conhecido em qualquer app com filtro de data; se não tratado, o pior caso é um lead aparecer no filtro errado por algumas horas perto da virada do dia — fácil de corrigir depois, mas melhor prevenir na task de schema/formulário |

## Open Questions (RESOLVED)

1. **Confirmação exata da experiência do `shadcn init` para este projeto específico**
   - O que sabemos: em julho de 2026 o shadcn/ui mudou para Base UI como padrão para projetos novos (confirmado via changelog oficial).
   - O que não está claro: se o CLI pergunta interativamente ("Radix ou Base UI?") ou já aplica Base UI sem pergunta, e se isso afeta os nomes/props exatos dos componentes gerados (`Combobox`, `Calendar`, `Form`).
   - Recomendação: o planejador deve incluir uma task inicial de "rodar `shadcn init`, inspecionar `components.json` e `components/ui/` gerados, e confirmar quais componentes/props usar antes de escrever o combobox de sub-nicho" — não assumir a API exata sem essa checagem ao vivo.
   - **RESOLVED:** verificação ao vivo delegada à Task 2 do `01-01-PLAN.md`, com fallback determinístico (aceitar Base UI mesmo se Radix for oferecido) documentado no Pitfall 2 acima. Não bloqueia a fase — apenas exige a checagem no momento da execução.

## Environment Availability

| Dependência | Necessária para | Disponível | Versão | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime de todo o projeto (Next.js, drizzle-kit, npm scripts) | ✓ | v24.12.0 | — |
| npm | Gerenciador de pacotes | ✓ | 11.6.2 | — |
| Toolchain de compilação C++ (Visual Studio Build Tools) | Fallback de `better-sqlite3` caso o binário pré-compilado para Node 24 não seja encontrado | Não verificado nesta pesquisa | — | Não é necessário se `better-sqlite3@12.11.1` (versão travada) for instalado exatamente como especificado — essa versão já publica binário pré-compilado para Node 24 (ver Pitfall 4). Só vira bloqueante se alguém instalar uma versão diferente/mais antiga |
| Python 3 / pip | Usado nesta sessão de pesquisa apenas para rodar `slopcheck`; não é dependência do app em si | ✓ (python 3.14 via `python3`) | — | N/A — não faz parte do stack de execução do CRM |

**Dependências ausentes sem fallback:** nenhuma identificada — o stack inteiro roda com Node.js/npm, ambos já confirmados disponíveis no ambiente de destino.

**Dependências ausentes com fallback:** toolchain de compilação C++ (só necessária no caso extremo de fallback de `better-sqlite3`, evitável instalando a versão exata travada).

## Security Domain

### Applicable ASVS Categories

| Categoria ASVS | Aplica-se | Controle padrão |
|---------------|---------|-----------------|
| V2 Authentication | Não | Fora de escopo por decisão explícita do projeto (ferramenta single-user, sem contas) — per CLAUDE.md "What NOT to Use: Full auth system" |
| V3 Session Management | Não | Não há sessão de usuário nesta fase (app roda local, sem gate de acesso ainda — gate de senha é uma variante de deploy futura, não desta fase) |
| V4 Access Control | Não | Single-user, sem conceito de papéis/permissões — introduzir isso seria scope creep (ARCHITECTURE.md Pitfall 7) |
| V5 Input Validation | Sim | Zod em toda Server Action (Pattern 1) — nunca confiar apenas na validação client-side do react-hook-form |
| V6 Cryptography | Não aplicável nesta fase | Nenhum dado é criptografado nesta fase (SQLite local, sem senhas/segredos armazenados); revisar se/quando um gate de senha for adicionado em fase de deploy futura |

### Known Threat Patterns for Next.js + Drizzle + SQLite (Server Actions)

| Padrão | STRIDE | Mitigação padrão |
|---------|--------|---------------------|
| SQL injection via input não sanitizado concatenado em query | Tampering | Drizzle usa queries parametrizadas por padrão em todo o query builder (`db.select().where(eq(...))`) — nunca usar `sql.raw()` com input do usuário interpolado diretamente; os exemplos desta pesquisa (Pattern 2) usam `sql\`lower(trim(${table.nome}))\`` apenas com identificadores de coluna, nunca com valores de usuário não parametrizados |
| Mass assignment / campos extras no `FormData` sendo persistidos sem validação | Tampering | O schema Zod (`leadSchema.safeParse`) define exatamente os campos aceitos — campos extras no `FormData` (inclusive os `$ACTION_*` que o Next.js injeta automaticamente, mencionado na doc oficial) são ignorados porque o `parsed.data` só contém o que o schema declara |
| Exclusão permanente acidental de dado de negócio único (sem backup externo, já que substitui a planilha) | Repudiation / perda de dados | Soft-delete obrigatório (LEAD-04) — nunca implementar `DELETE FROM leads` real nesta fase; este é o próprio requisito, não apenas uma boa prática de segurança |
| Exposição de dado sensível de saúde (categorização por sub-nicho de saúde) em logs/erros | Information Disclosure | Não logar payloads completos de Server Action em produção; mensagens de erro do Zod devolvidas ao client devem ser apenas as de validação de campo, nunca stack traces ou dados de outros leads |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <pkg> version`, `npm view <pkg> scripts.postinstall`, `npm view <pkg> repository.url`), consultado ao vivo em 2026-07-19 — versões e scripts de todos os pacotes centrais listados em `## Standard Stack`
- [nextjs.org/docs/app/guides/forms](https://nextjs.org/docs/app/guides/forms) (versão da doc: 16.2.10, atualizado 2026-06-23) — padrão de Server Actions + `useActionState` + validação Zod
- [orm.drizzle.team/docs/get-started/sqlite-new](https://orm.drizzle.team/docs/get-started/sqlite-new) — sintaxe atual de `drizzle.config.ts` (`dialect: 'sqlite'`)
- [orm.drizzle.team/docs/guides/unique-case-insensitive-email](https://orm.drizzle.team/docs/guides/unique-case-insensitive-email) — padrão de índice único case-insensitive via `sql\`lower(...)\``
- [ui.shadcn.com/docs/changelog/2026-07-base-ui-default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) — mudança de padrão Radix → Base UI, componente Combobox nativo
- [ui.shadcn.com/docs/components/data-table](https://ui.shadcn.com/docs/components/data-table) — recipe de tabela com `@tanstack/react-table`
- slopcheck v0.6.1 (`pip install slopcheck`), execução ao vivo contra 14 dos 16 pacotes centrais via `slopcheck scan --pkg npm <nome> --json` — todos retornaram `OK`

### Secondary (MEDIUM confidence)
- [github.com/WiseLibs/better-sqlite3 issues #1384, #1382](https://github.com/WiseLibs/better-sqlite3/issues/1384) — necessidade de `better-sqlite3^12.0.0` para binário pré-compilado em Node 24
- [github.com/react-hook-form/resolvers issue #842](https://github.com/react-hook-form/resolvers/issues/842) e [github.com/colinhacks/zod issue #4992](https://github.com/colinhacks/zod/issues/4992) — relatos de mismatch de tipo entre versões pontuais de zod v4 e @hookform/resolvers
- WebSearch cross-referenciado: "Next.js Server Actions form validation Zod react-hook-form useActionState pattern 2026" — múltiplas fontes 2026 convergentes sobre o padrão atual

### Tertiary (LOW confidence)
- Raciocínio de domínio aplicado para Pitfall 6 (normalização de fuso horário em `followUpDate`) — não verificado contra um caso de teste real desta aplicação, sinalizado no Assumptions Log (A2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas as versões centrais confirmadas ao vivo via npm registry na mesma data desta pesquisa, e já correspondiam ao que estava travado em CLAUDE.md/STACK.md
- Architecture: HIGH — padrão de Server Actions + Drizzle + soft-delete + data-table é bem documentado nas fontes oficiais consultadas; o único ponto MEDIUM é o comportamento exato do `shadcn init` (Base UI vs. Radix) por ser uma mudança muito recente (Open Question 1)
- Pitfalls: MEDIUM-HIGH — pitfalls de versão (better-sqlite3/Node 24, zod/resolvers) vêm de issues reais no GitHub, não de documentação oficial declarando o bug como resolvido/aberto definitivamente; o planejador deve tratar a versão exata pinada como a mitigação, não uma garantia absoluta de zero atrito

**Research date:** 2026-07-19
**Valid until:** 2026-08-18 (30 dias — stack majoritariamente estável, mas o ecossistema shadcn/Base UI e zod/resolvers está em movimento rápido o suficiente para justificar revalidação em caso de gap temporal maior antes da execução)

---
*Fase: 01-lead-sub-nicho-foundation*
*Pesquisa realizada em: 2026-07-19*
