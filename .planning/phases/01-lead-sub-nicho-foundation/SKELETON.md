# Walking Skeleton — CRM de Leads (Área da Saúde)

**Phase:** 1
**Generated:** 2026-07-19

## Capability Proven End-to-End

O admin abre o app no navegador, navega até a tela "Sub-nichos" pela sidebar fixa, cria um sub-nicho (ex.: "Nutricionista") num formulário, e o novo sub-nicho é persistido no SQLite e re-renderizado na lista — exercitando o stack inteiro (Client Component → Server Action → Zod → Drizzle → SQLite → revalidatePath → Server Component → toast sonner).

Esta é a menor capacidade útil que prova o stack completo: uma escrita real no banco, uma leitura real do banco, e uma interação de UI real conectada à camada de dados (Server Actions). Sub-nicho foi escolhido como o primeiro corte porque a tabela `leads` referencia `subnichos` por FK — sub-nichos precisam existir antes de qualquer lead poder ser criado.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.10 (App Router, Server Components, Server Actions) | Travado em `CLAUDE.md`/`01-RESEARCH.md`. Server Actions substituem a camada de API REST — sem `app/api/*` para o CRUD desta app (decisão explícita travada). |
| Linguagem | TypeScript 5.9.3 (pinado, NÃO `latest`) | `npm view typescript version` retorna 7.0.2, mas TS 7.0 ainda não tem API programática estável nem tooling completo — pinar 5.9.3 (`01-RESEARCH.md` Standard Stack). |
| Data layer | Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 sobre SQLite via better-sqlite3 12.11.1 | Schema em TypeScript, migrações SQL revisáveis em git. `better-sqlite3@12.x` é obrigatório para binário pré-compilado no Node 24 (ABI N-API 137) — evita fallback de compilação `node-gyp` no Windows (Pitfall 4). |
| Banco (arquivo) | SQLite local em `./data/crm.db` (WAL) | Uso solo, local, low-volume. Arquivo único, backup = copiar o arquivo. `./data/*.db*` fica no `.gitignore`; só `src/db/migrations/` é versionado. |
| Migrações | `drizzle-kit generate` + `drizzle-kit migrate` (versionadas) | `CLAUDE.md`/`01-RESEARCH.md` valorizam "migrations are just generated SQL files you can read and review" — usar generate+migrate desde o início, não `push` descartável. |
| Auth | Nenhuma (ferramenta single-user) | Fora de escopo explícito por `PROJECT.md`/`CLAUDE.md`. Sem contas, sessões ou gate de acesso nesta fase. |
| Validação | Zod 4.4.3 (client via `zodResolver` + server via `safeParse`) | Schema único reaproveitado no client (UX inline) e no Server Action (fonte de verdade). Nunca confiar só no client. |
| UI | shadcn/ui (CLI 4.13.1, estilo "New York", Base UI) + Tailwind v4 + lucide-react + sonner | Componentes copiados para o repo (editáveis). Base UI é o padrão do shadcn a partir de julho/2026 e já expõe `Combobox` nativo (D-03) — confirmar no `components.json` gerado (Pitfall 2). |
| Tabela de dados | `@tanstack/react-table` 8.21.3 (headless) + `<Table>` do shadcn | Sort/filtro/paginação client-side; volume cabe na memória do browser (poucos milhares de leads). |
| Directory layout | `src/app` (rotas), `src/db` (schema/client/migrations), `src/actions` (Server Actions — única porta de escrita), `src/components` (composições) + `src/components/ui` (primitivos shadcn), `src/lib` (validations/utils), `src/types` | `db/` isolado de `actions/`; Client Components nunca importam `db/client.ts` direto — sempre via `src/actions/`. |
| Deployment | Execução local full-stack via `npm run dev` (ou `npm run build && npm start`) | `PROJECT.md`: sem hospedagem em nuvem no v1. Comando de run local exercita o stack completo. |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js 16 App Router, ESLint, Tailwind v4, TypeScript 5.9.3, shadcn/ui) — Plan 01-01, Task 2
- [x] Routing — sidebar fixa (D-18) com rotas `/`, `/subnichos`, `/lixeira`; `/subnichos` real neste skeleton — Plan 01-01, Tasks 2 e 4
- [x] Database — schema `leads` + `subnichos`, migração aplicada a `./data/crm.db`; leitura real (listar sub-nichos) E escrita real (criar sub-nicho) — Plan 01-01, Tasks 3 e 4
- [x] UI — formulário "+ Adicionar" sub-nicho conectado à Server Action `createSubnicho`, com re-render e toast — Plan 01-01, Task 4
- [x] Deployment — `npm run dev` roda o stack completo localmente (documentado no README gerado pelo scaffold)

## Out of Scope (Deferred to Later Slices)

- Formulário de lead com os 9 campos, combobox de sub-nicho, criar/editar lead — Plan 01-02
- Lista de leads filtrável/ordenável/paginada — Plan 01-03
- Soft-delete de lead com modal de confirmação + página Lixeira/restaurar — Plan 01-04
- Renomear sub-nicho: incluído neste skeleton (Plan 01-01) por ser trivial sobre o mesmo componente; criar é o corte que prova o stack
- Importação CSV, board de pipeline, dashboard de follow-up, WhatsApp — Fases 2/3/4 (fora desta fase)
- Deletar/desativar/mesclar sub-nicho — v2 (LEAD-V2-01)
- Multi-usuário, auth, app mobile, hospedagem em nuvem — fora de escopo por `PROJECT.md`

## Subsequent Slice Plan

Cada fase posterior adiciona um corte vertical sobre este skeleton sem alterar suas decisões arquiteturais:

- **Fase 1 (restante):** formulário de lead (01-02) → lista filtrável (01-03) → soft-delete + Lixeira (01-04)
- **Fase 2:** importação CSV em lote (upload → mapeamento → preview → confirmar) sobre o mesmo schema `leads` (+ coluna de batch)
- **Fase 3:** board de pipeline com drag-and-drop reusando o enum `stage` e o `<EtapaBadge>` desta fase
- **Fase 4:** dashboard de follow-up (na rota `/`, sobre a query de leads ativos por `followUpDate`) + templates de WhatsApp com links `wa.me`
