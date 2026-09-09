# Phase 23: Diagnóstico de IA da Campanha - Research

**Researched:** 2026-09-05
**Domain:** Integração de IA (Vercel AI SDK + Claude web search) numa Server Action do Next 16 + nova tabela SQLite/Drizzle + harness estrutural anti-genérico
**Confidence:** HIGH nas partes de codebase (schema/migração/actions/harness); MEDIUM-HIGH na API do AI SDK (verificada em ai-sdk.dev 2026-09-05); MEDIUM no comportamento de "adaptive thinking" do Claude Sonnet 5 dentro do AI SDK

> **Sem CONTEXT.md** — o `/gsd-discuss-phase` foi pulado (STATE.md). O framework, o modelo, o modelo de custo, a estratégia de eval e o contrato de UI já estão travados em `23-AI-SPEC.md` e `23-UI-SPEC.md`. Esta pesquisa **não relitiga nada disso** — preenche as lacunas de fiação concreta neste codebase que os dois docs deixam para o planner.

---

## Summary

A Fase 23 adiciona **uma seção** a `src/app/campanhas/[id]/page.tsx` que, sob clique explícito, dispara uma Server Action → função pura `gerarDiagnostico()` → `generateText` do Vercel AI SDK com a web search tool nativa do Claude → objeto validado por Zod → gate "zero fontes rejeita" → 1 linha nova numa nova tabela `diagnosticos`. É a 1ª integração de IA de verdade do projeto, mas do ponto de vista de arquitetura de codebase é **três padrões já dominados pelo repo**: (1) migração `.cjs` manual idempotente contra `data/crm.db` (molde `migrate-campanhas.cjs`), (2) Server Action com `ActionState` + `safeParse`-antes-de-escrever + guarda de FK + `isForeignKeyViolation` backstop (molde `campanha-actions.ts`/`lead-actions.ts`), (3) harness `.cjs` que importa módulos TS via `ts-alias-loader.mjs` e roda `check()`/`process.exit()` (molde `test-tarefa-actions.cjs`).

A API do AI SDK que o `23-AI-SPEC` §3 pinou foi **verificada contra ai-sdk.dev em 2026-09-05 e está correta**: `output: Output.object({ schema })` em `generateText` (não `generateObject`, que não aceita `tools`), `stopWhen: isStepCount(n)`, `result.sources` como `{ sourceType: 'url', id, url, title? }`, `anthropic.tools.webSearch_20250305({ maxUses, allowedDomains, blockedDomains, userLocation })`, `NoObjectGeneratedError.isInstance(err)`. **Uma correção de modelo e duas de premissa** para o planner: (a) `claude-sonnet-5` é o ID **e** o alias corrente do Sonnet e **já é um snapshot pinado** — não existe forma datada `claude-sonnet-5-YYYYMMDD` para fixar; (b) o preço do Sonnet 5 é **US$2 / 1M input, US$10 / 1M output** (o AI-SPEC estimou US$3/US$15 — o custo por diagnóstico é um pouco menor que o previsto); (c) **Sonnet 5 tem "adaptive thinking" sempre ligado, `effort` default `high`** — isso infla tokens de saída (os tokens de raciocínio são cobrados como output e contam contra `maxOutputTokens`) e latência; a config do AI-SPEC (`temperature: 0.3`, `maxOutputTokens: 6000`, sem menção a `effort`) foi escrita para um Sonnet pré-thinking e **precisa ser revista** (ver Pitfall 9 e Open Question 1).

**Primary recommendation:** Planejar em 3 ondas — (Onda 0/Wave 0) migração `diagnosticos` + extensão de `verify-schema.cjs` + fixtures + `scripts/test-diagnostico-estrutural.cjs` esqueleto; (Onda 1) `src/lib/ai/*` (schema Zod, prompt, `gerarDiagnostico` pura com `import "server-only"`) + Server Action + harness estrutural verde sobre fixtures; (Onda 2) a seção de UI em `/campanhas/[id]` + `scripts/eval-diagnostico.mjs` on-demand. Rodar a migração de verdade contra `data/crm.db` (2x, idempotência) dentro da Onda 0, como as Fases 12/15/22.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Disparo do diagnóstico (clique → mutação) | API / Backend (Server Action) | Browser (Client Component com `useActionState`) | DIAGNOSTICO-01: só clique dispara; a chave da API e a chamada ao modelo **nunca** podem tocar o browser |
| Chamada ao modelo + web search + validação de schema | API / Backend (`src/lib/ai/gerar-diagnostico.ts`, `import "server-only"`) | Serviço externo (Anthropic executa a web search server-side) | `ANTHROPIC_API_KEY` server-only; a web search roda na infra da Anthropic, não na nossa |
| Gate "zero fontes → rejeita" (DIAGNOSTICO-02) | API / Backend (função pura, antes de persistir) | — | Guardrail online; lê `result.sources`, nunca as URLs que o modelo escreveu no corpo |
| Persistência (1 linha por geração, sem cache) | Database / Storage (nova tabela `diagnosticos`, SQLite local) | API / Backend (Server Action faz o insert) | DIAGNOSTICO-10: cada geração é linha nova; a tabela É o log de trace (AI-SPEC §7) |
| Renderização do diagnóstico + distinção dado×marketing + links de fonte | Frontend Server (Server Components: `DiagnosticoSecao`, `DiagnosticoResultado`, `AchadoTipoBadge`) | Browser (`RascunhoMensagem`, `GerarDiagnosticoButton` são Client) | O objeto validado é lido do DB e re-validado no server; só o textarea editável e o botão são client |
| Estado de "gerando…" + linhas de busca ao vivo | Browser (Client Component) | API / Backend (`onStepFinish` → progresso) | Duração indeterminada 30–90s; `useActionState` + `useTransition`, sem stream do objeto |
| Harness estrutural anti-genérico | Ferramenta de build (`scripts/*.cjs`, Node 24 + `ts-alias-loader.mjs`) | — | CI-able, sem navegador, sem chamada de API — molde `test-*-actions.cjs` |

---

<phase_requirements>
## Phase Requirements

| ID | Descrição (REQUIREMENTS.md) | Suporte da pesquisa |
|----|-----------------------------|---------------------|
| DIAGNOSTICO-01 | Geração sob demanda (botão), nunca automática, sempre do zero (sem reuso) | Server Action disparada só pelo `<GerarDiagnosticoButton>` (`useActionState`); **sem** `useEffect` de auto-trigger; **sem** checagem "já existe diagnóstico" antes de chamar a API (AI-SPEC §4 State Management). Harness: fixture prova que 2 chamadas = 2 linhas. |
| DIAGNOSTICO-02 | Pesquisa a web e cita fontes; zero-fontes é rejeitado | `result.sources.filter(s => s.sourceType === 'url')`; se `.length === 0` → `throw DiagnosticoSemFonteError` → Server Action grava `status: 'falhou'` + `erro`, devolve `{ success: false, erro }`. Verificado: `sources` shape em ai@7 é `{ sourceType: 'url', id, url, title? }` (ai-sdk.dev). Guardrail online — o único que bloqueia render. |
| DIAGNOSTICO-03 | Índice de saturação numérico (contagem de concorrentes) | `diagnosticoSchema.indice_saturacao.concorrentes_diretos: z.number().int().nonnegative()` (AI-SPEC §4b). Harness: asserção de tipo inteiro ≥ 0. |
| DIAGNOSTICO-04 | Até 3 gatilhos de dor observáveis, o mais forte destacado | `gatilhos_dor: z.array({...}).min(1).max(3)` + `.refine(exatamente 1 mais_forte)`. UI: card com `border-primary` + badge "Mais forte". Harness: refine violado = FAIL. |
| DIAGNOSTICO-05 | 2–3 objeções, cada uma com resposta sugerida | `objecoes: z.array(objecao).min(2).max(3)`. Harness: min/max. |
| DIAGNOSTICO-06 | Ticket médio estimado citando a base/fonte | `ticket_medio: { valor_estimado_brl: z.number().positive(), base: z.string(), fonte_url: z.string().url() }`. Harness: campo positivo + `fonte_url` presente + (cross-check) consta em `res.sources`. |
| DIAGNOSTICO-07 | Cada achado marcado "dado quantificável" vs "alegação de marketing" — nunca misturado sem distinção | `achado.tipo: z.enum(['dado_quantificavel','alegacao_marketing'])`, `achados: z.array().min(3)`. UI: `<AchadoTipoBadge>` — 3 eixos (cor `--status-info` vs `--status-warning` + ícone `Hash` vs `Megaphone` + texto pleno vs `italic text-muted-foreground`). Harness: toda linha tem `tipo` válido. |
| DIAGNOSTICO-08 | Rascunho de 1ª mensagem editável, nunca enviado | `rascunho_primeira_mensagem: z.string().min(40).max(1200)`. UI: `<Textarea defaultValue>` + "Copiar mensagem" (`navigator.clipboard`), sem botão "Salvar", sem integração de disparo. Edições não persistem. |
| DIAGNOSTICO-09 | Veredito **sugerido** (aprofundar / mudar ângulo / abandonar), não vinculante | `veredito_sugerido: { decisao: z.enum(['aprofundar','mudar_angulo','abandonar']), justificativa: z.string() }`. UI: `<VereditoSugeridoChip>` sempre rotulado "Sugestão da IA (não vinculante)". O veredito final é a Fase 24. |
| DIAGNOSTICO-10 | Regenerar quando quiser; cada geração é evento novo e visível, sem cache escondendo custo | Sem cache (nem exact-match, nem semântico, nem prompt caching). Linha de metadados sempre visível: `n fontes · inputTokens+outputTokens · n buscas · data`. Botão vira "Gerar novo diagnóstico" (`variant="outline"`) + caption de custo. Falhas também viram linha no histórico. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Diretiva | Impacto na Fase 23 |
|----------|--------------------|
| Ferramenta solo, **sem auth multi-usuário** | Nenhum gate de acesso na Server Action; app local. Não introduzir NextAuth/Clerk. |
| **Server Actions são o idioma de mutação** — não API routes | O disparo do diagnóstico é uma Server Action, não um route handler. (Confirmado pelo UI-SPEC.) |
| **Sem WhatsApp API / sem envio automático** | O `rascunho_primeira_mensagem` é gerado mas **nunca enviado** — cópia manual. Sem integração de disparo. |
| **SQLite fica** (não migrar p/ Postgres) — `better-sqlite3` local, `data/crm.db` | A tabela `diagnosticos` é SQLite local; `better-sqlite3` força **Node runtime** na rota (nunca `edge`). |
| Drizzle: schema em TS, migrações são SQL legível | Nova tabela via schema Drizzle + migração `.cjs` manual. |
| **GSD Workflow Enforcement** — nada de edição fora de comando GSD | Execução via `/gsd-execute-phase`. |
| Host de 4GB RAM — **evitar processos paralelos**; não roda navegador + agente juntos | O eval subjetivo (`eval-diagnostico.mjs`) roda **sozinho**; verificação de UI fica manual/diferida (precedente Fases 18/19/20/21). `next build` usa Turbopack e passa (débito quitado 2026-08-29). |
| Docs e explicações em **PT-BR** | Toda a prosa da fase, comentários de código de contrato, cópia de UI. |

**Não estabelecido em CLAUDE.md mas observado no codebase (tratar como convenção):**
- Timestamps são `integer({ mode: "timestamp" })` com default físico `(unixepoch())` — **nunca** ISO string (ver Open Question 2 — o AI-SPEC diverge disso).
- JSON em coluna: `text("col", { mode: "json" }).$type<T>()` — precedente `configuracoes.sequenciaIntervalosDias`.
- Server Actions vivem em `src/actions/*.ts` (o UI-SPEC pede `src/app/campanhas/[id]/actions.ts` co-locado — ver Open Question 3).
- `ActionState` do projeto = `{ success: true; <entidade>? } | { errors: Record<string, string[] | undefined> } | undefined`.
- O helper `isForeignKeyViolation` (6 linhas) é **duplicado** em cada arquivo de actions, não importado — precedente aceito.

---

## Standard Stack

### Core (novo nesta fase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | `7.0.93` (dist-tag `latest`, verif. npm 2026-09-05) | `generateText`, `Output.object`, `isStepCount`, `NoObjectGeneratedError` — camada fina de orquestração | Escolha travada no AI-SPEC §2. Linha 7.x é a atual; `ai-v5`/`ai-v6` são dist-tags mantidas em paralelo. Repo oficial `github.com/vercel/ai`, sem `postinstall`. |
| `@ai-sdk/anthropic` | `4.0.49` (dist-tag `latest`, verif. npm 2026-09-05) | provider Anthropic + `anthropic.tools.webSearch_20250305` | Par de `ai@7.x` (o provider publica `ai-v5`/`ai-v6` como tags separadas). Peer: `zod ^3.25.76 \|\| ^4.1.8` — satisfeito por `zod@4.4.3` já instalado. Sem `postinstall`. |

### Supporting (já no repo — reusar, não reinstalar)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.4.3` | `diagnosticoSchema` = contrato de saída; validação do input da action | Já é dep core (`src/lib/validations.ts`). O AI SDK converte o schema Zod → JSON schema → re-valida o retorno. |
| `date-fns` | `^4.4.0` | `format(criadoEm, "dd/MM/yyyy HH:mm")` na linha de metadados e no histórico | Já usado em `/campanhas/[id]/page.tsx`. |
| `better-sqlite3` | `^12.11.1` | driver do `data/crm.db` (migração + leitura do diagnóstico) | Já é o driver do projeto. **Força Node runtime.** |
| `drizzle-orm` | `^0.45.2` | tabela `diagnosticos` no schema + insert/select | Já é o ORM. `text(mode:"json").$type<>()` para `payload`/`fontes`/`buscas`. |
| `lucide-react` | `^1.25.0` | ícones `Hash`, `Megaphone`, `ExternalLink`, `Loader2` (UI-SPEC) | Já instalado. |
| shadcn/Base UI primitives | — | `button`, `badge`, `textarea`, `separator`, `sonner` | **Todos já em `src/components/ui/`** (confirmado: `button.tsx`, `badge.tsx`, `textarea.tsx`, `separator.tsx`, `sonner.tsx`). **Nenhum `npx shadcn add` nesta fase** (UI-SPEC §Registry Safety). |
| `server-only` | (embarcado no Next 16) | marca `src/lib/ai/gerar-diagnostico.ts` como não-importável por Client Component | Next.js provê o módulo; não precisa `npm i`. Já referenciado no AI-SPEC. |

### Alternatives Considered

Todas já descartadas no AI-SPEC §2 (SDK Anthropic puro, Claude Agent SDK, LangChain/LangGraph, n8n/SaaS). **Não reabrir.** O único fallback vivo: se o AI SDK bloquear acesso a algum parâmetro da web search tool, cair para `@anthropic-ai/sdk` direto — improvável, a superfície verificada cobre tudo que a fase precisa.

**Installation:**
```bash
npm i ai@7.0.93 @ai-sdk/anthropic@4.0.49
```
Pinar exato (sem `^`) segue o hábito do projeto de pinar `next`/`eslint-config-next`. `zod` já satisfaz o peer.

**Setup do usuário (autonomous: false — NÃO é passo de código):**
1. Criar `.env.local` na raiz: `ANTHROPIC_API_KEY=sk-ant-...` — o arquivo **não existe hoje** (confirmado: `Glob .env*` → nada). O `.gitignore` já cobre `.env*` (linha 34).
2. Habilitar a **"Web Search" tool nas configurações da ORGANIZAÇÃO** no Console da Anthropic (`platform.claude.com` / `console.anthropic.com`) — sem isso a chamada volta **HTTP 400**. Já registrado em STATE.md "Setup pendente do usuário".

Next 16 carrega `.env.local` automaticamente no server; `process.env.ANTHROPIC_API_KEY` fica disponível em Server Actions / módulos server. O provider `anthropic(...)` lê a env var sozinho (não precisa `createAnthropic` a menos que queira `baseURL`/`apiKey` custom).

### Version verification (executado 2026-09-05)
```
npm view ai version            → 7.0.93   (modified 2026-09-04)
npm view ai dist-tags          → latest: 7.0.93 · ai-v6: 6.0.277 · ai-v5: 5.0.253
npm view @ai-sdk/anthropic version → 4.0.49
npm view @ai-sdk/anthropic peerDependencies → { zod: '^3.25.76 || ^4.1.8' }
npm view ai repository.url      → github.com/vercel/ai
npm view ai scripts.postinstall → (vazio)
npm view @ai-sdk/anthropic scripts.postinstall → (vazio)
```

---

## Package Legitimacy Audit

> `slopcheck` **não pôde ser instalado** neste ambiente (`pip install slopcheck` → indisponível). Per protocolo, os dois pacotes ficam **`[ASSUMED]`** e o planner **deve** colocar um `checkpoint:human-verify` antes do `npm i`. Mitigante forte: são pacotes oficiais da Vercel, descobertos via docs oficiais (ai-sdk.dev) e Context7, com repo-fonte público, downloads na casa de dezenas de milhões/semana, e **zero script `postinstall`**.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `ai` | npm | anos (Vercel AI SDK, linha 7.x atual) | dezenas de M/semana | `github.com/vercel/ai` | indisponível → `[ASSUMED]` | Aprovado c/ checkpoint |
| `@ai-sdk/anthropic` | npm | anos (provider oficial no mesmo monorepo) | milhões/semana | `github.com/vercel/ai` (packages/anthropic) | indisponível → `[ASSUMED]` | Aprovado c/ checkpoint |

**Packages removidos por [SLOP]:** nenhum.
**Packages [SUS]:** nenhum.
**Ação do planner:** 1 task `checkpoint:human-verify` — "confirmar `ai` e `@ai-sdk/anthropic` em npmjs.com (repo = vercel/ai, sem postinstall) antes de instalar". Depois disso, `npm i ai@7.0.93 @ai-sdk/anthropic@4.0.49`.

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser: /campanhas/[id]]
  <GerarDiagnosticoButton> (Client, "use client")
     │  clique → useActionState → startTransition
     ▼
[Server Action]  src/actions/diagnostico-actions.ts (ou app/campanhas/[id]/actions.ts) — "use server"
     │  1. safeParse({ campanhaId })            ← Zod, ANTES de tudo
     │  2. campanhaExists(campanhaId)?           ← guarda de FK forjada (molde lead-actions)
     │  3. await gerarDiagnostico({ nicho, oferta, janelaDias, meta })
     │                                             │
     │                                             ▼
     │                              [src/lib/ai/gerar-diagnostico.ts]  import "server-only"
     │                              loop de até 2 tentativas:
     │                                generateText({
     │                                  model: anthropic('claude-sonnet-5'),
     │                                  system: SYSTEM_PROMPT (rubrica anti-genérico, fixa),
     │                                  prompt: dados da campanha,
     │                                  tools: { web_search: anthropic.tools.webSearch_20250305({maxUses:6}) },
     │                                  output: Output.object({ schema: diagnosticoSchema }),
     │                                  stopWhen: isStepCount(10),
     │                                  onStepFinish: capturar queries de busca,
     │                                })   ──────►  [Anthropic API]  ──────►  [Web Search executada server-side pela Anthropic]
     │                                                    │ devolve: output (obj), sources[], usage, finishReason
     │                                GATE: fontes = sources.filter(sourceType==='url')
     │                                      fontes.length === 0  → throw DiagnosticoSemFonteError
     │                                cross-check: fonte_url do objeto ∉ sources → strip
     │                              return { diagnostico, fontes, uso, buscas }
     │  4a. sucesso → INSERT diagnosticos (status:'ok', payload, fontes, buscas, tokens, criado_em)
     │  4b. falha   → INSERT diagnosticos (status:'falhou', erro)   ← NUNCA um resultado falso
     │  5. revalidatePath(`/campanhas/${id}`)
     ▼
   { success: true, diagnosticoId }  |  { success: false, erro }
     │
     ▼
[Server Component] DiagnosticoSecao → lê última linha de `diagnosticos` da campanha
     │  re-valida payload com diagnosticoSchema (fronteira de confiança do DB)
     ├─ status 'ok'      → <DiagnosticoResultado> (saturação, gatilhos, objeções, ticket, achados, rascunho, veredito, fontes)
     ├─ status 'falhou'  → bloco de erro (border-destructive)
     └─ nenhuma linha    → estado vazio + CTA
```

### Recommended Project Structure

```
src/
├── lib/
│   └── ai/
│       ├── diagnostico-schema.ts     # zod diagnosticoSchema + type Diagnostico + filtrarFontes()/assertTemFonte()
│       │                             #   ← ZERO import com efeito colateral (sem 'server-only', sem SDK, sem @/db/client)
│       │                             #   ← importável pelo harness .cjs via ts-alias-loader
│       ├── diagnostico-prompt.ts     # SYSTEM_PROMPT (const) + montarUserPrompt(campanha)
│       └── gerar-diagnostico.ts      # import "server-only";  função pura: generateText → valida → gate de fontes
│                                     #   ← NÃO faz DB. Recebe dados da campanha, devolve { diagnostico, fontes, uso, buscas }
├── actions/
│   └── diagnostico-actions.ts        # "use server" — gerarDiagnosticoAction: safeParse + campanhaExists + gerarDiagnostico + INSERT + revalidatePath
│                                     #   (OU src/app/campanhas/[id]/actions.ts — ver Open Question 3)
├── app/campanhas/[id]/
│   ├── page.tsx                      # + export const maxDuration = 120;  + <DiagnosticoSecao campanhaId={...} />
│   └── _components/
│       ├── gerar-diagnostico-button.tsx   # "use client" — useActionState, pending, linhas de busca ao vivo
│       └── rascunho-mensagem.tsx          # "use client" — Textarea + Copiar
├── components/
│   ├── diagnostico-secao.tsx         # Server — decide vazio/resultado/erro
│   ├── diagnostico-resultado.tsx     # Server — renderiza o objeto
│   ├── achado-tipo-badge.tsx         # Server — LABEL+TOKEN+ICON (molde campanha-estado-badge.tsx)
│   └── veredito-sugerido-chip.tsx    # Server
└── db/schema.ts                      # + export const diagnosticos = sqliteTable("diagnosticos", {...})

scripts/
├── migrate-diagnosticos.cjs          # molde EXATO de migrate-campanhas.cjs
├── test-diagnostico-estrutural.cjs   # molde de test-tarefa-actions.cjs — fixtures, sem API, CI-able
├── eval-diagnostico.mjs              # API real, on-demand, roda SOZINHO (host 4GB)
└── verify-schema.cjs                 # ESTENDER: + "diagnosticos" em requiredTables + REQUIRED_DIAGNOSTICOS_COLUMNS

test/
├── fixtures/diagnostico/             # payloads JSON bons e ruins, versionados
│   ├── ok-costureira.json
│   ├── bad-zero-mais-forte.json
│   ├── bad-dois-mais-forte.json
│   ├── bad-enum-veredito.json
│   ├── bad-achados-sem-tipo.json
│   └── ...
└── reports/                          # relatórios datados do eval-diagnostico.mjs (gitignored? — decisão do planner)
```

### Pattern 1: Migração `.cjs` manual idempotente (a nova tabela `diagnosticos`)

**What:** Cópia bloco-a-bloco de `scripts/migrate-campanhas.cjs`. NUNCA `drizzle-kit push`/`generate` (dois incidentes destrutivos documentados, Fases 06-01/07-01; snapshot do drizzle-kit divergente do banco desde a Fase 4).
**When to use:** Onda 0 da fase, rodada de verdade contra `data/crm.db`.
**Estrutura obrigatória (na ordem de `migrate-campanhas.cjs`):**
```js
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");
function fail(m) { console.error(`[migrate-diagnosticos] FALHOU: ${m}`); process.exit(1); }

// 1) BACKUP antes de qualquer escrita — wal_checkpoint(TRUNCATE) primeiro (client.ts roda em WAL)
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const dbCk = new Database(DB_PATH, { fileMustExist: true });
dbCk.pragma("wal_checkpoint(TRUNCATE)"); dbCk.close();
fs.copyFileSync(DB_PATH, backupPath);

const db = new Database(DB_PATH);
// 2) Testemunha de não-regressão — contagem de linhas de uma tabela existente
const beforeCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;

// 3) CREATE TABLE idempotente — guarda via sqlite_master
const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='diagnosticos'").get();
if (!exists) {
  db.exec(
    "CREATE TABLE diagnosticos (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "campanha_id INTEGER NOT NULL REFERENCES campanhas(id), " +
      "payload TEXT, " +              // JSON string do objeto validado (NULL quando status='falhou')
      "fontes TEXT, " +               // JSON array [{url,title}]
      "buscas TEXT, " +               // JSON array de queries (onStepFinish)
      "status TEXT NOT NULL, " +      // 'ok' | 'falhou'
      "erro TEXT, " +                 // nullable — mensagem quando status='falhou' (ou aviso de cross-check)
      "input_tokens INTEGER, " +
      "output_tokens INTEGER, " +
      "criado_em INTEGER NOT NULL DEFAULT (unixepoch())" +   // ← ver Open Question 2 (AI-SPEC diz ISO string)
      ");"
  );
  db.exec("CREATE INDEX diagnosticos_campanha_id_idx ON diagnosticos (campanha_id);");
  db.exec("CREATE INDEX diagnosticos_criado_em_idx ON diagnosticos (criado_em);");
  db.exec("CREATE INDEX diagnosticos_status_idx ON diagnosticos (status);");
}
// 4) VERIFICAÇÃO PÓS: contagem-testemunha inalterada; EXPECTED_COLUMNS conjunto estrito;
//    extraCols.length === 0; índices presentes; PRAGMA foreign_key_list(diagnosticos) tem FK campanha_id→campanhas
// 5) db.close(); process.exit(0);
```
- `package.json`: `"migrate:diagnosticos": "node scripts/migrate-diagnosticos.cjs"`.
- Schema Drizzle correspondente em `src/db/schema.ts` (declarar **depois** de `campanhas`):
```ts
export const diagnosticos = sqliteTable("diagnosticos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campanhaId: integer("campanha_id").notNull().references(() => campanhas.id, { onDelete: "restrict" }),
  payload: text("payload", { mode: "json" }).$type<Diagnostico>(),          // nullable — NULL se falhou
  fontes: text("fontes", { mode: "json" }).$type<{ url: string; title?: string }[]>(),
  buscas: text("buscas", { mode: "json" }).$type<string[]>(),
  status: text("status", { enum: ["ok", "falhou"] }).notNull(),
  erro: text("erro"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("diagnosticos_campanha_id_idx").on(table.campanhaId),
  index("diagnosticos_criado_em_idx").on(table.criadoEm),
  index("diagnosticos_status_idx").on(table.status),
]);
```
- `onDelete`: `"restrict"` (campanha nunca é hard-deletada — só soft-delete; mesmo raciocínio de `interacoes.leadId`). Um diagnóstico órfão nunca acontece.
- `diagnosticos` **não** entra na ALLOWLIST de `guard-no-hard-delete.cjs` (nunca há `DELETE FROM diagnosticos` — append-only, sem `deletedAt`). O harness **não** pode usar `DELETE FROM` para limpar estado (usar temp DB / ids únicos — precedente Fases 10-02/11/12).

### Pattern 2: Extensão de `verify-schema.cjs`

Adicionar, no molde EXATO dos blocos de `tarefas`/`campanhas` (conjunto ESTRITO — tabela nova não acumula colunas por fase):
```js
// requiredTables: + "diagnosticos"
// requiredIndexes: + "diagnosticos_campanha_id_idx", "diagnosticos_criado_em_idx", "diagnosticos_status_idx"
const REQUIRED_DIAGNOSTICOS_COLUMNS = [
  "id","campanha_id","payload","fontes","buscas","status","erro","input_tokens","output_tokens","criado_em",
];
// if (tableNames.has("diagnosticos")) { ...missing/extra check, fail() se divergir... }
// atualizar o console.log final
```
Mutação de teste obrigatória: o gate `verify:schema` deve **falhar** se a tabela/coluna não existir (precedente 12-01: "mutação provada").

### Pattern 3: Server Action (molde `campanha-actions.ts`)

```ts
"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { campanhas, diagnosticos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { gerarDiagnostico } from "@/lib/ai/gerar-diagnostico";
import { diagnosticoSchema } from "@/lib/ai/diagnostico-schema";

type DiagnosticoActionState =
  | { success: true; diagnosticoId: number }
  | { success: false; erro: string }
  | undefined;

function isForeignKeyViolation(err: unknown): boolean { /* 6 linhas, duplicar */ }

const inputSchema = z.object({ campanhaId: z.coerce.number().int().positive() });

export async function gerarDiagnosticoAction(
  _prev: DiagnosticoActionState,
  formData: FormData,
): Promise<DiagnosticoActionState> {
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));   // safeParse ANTES de tudo
  if (!parsed.success) return { success: false, erro: "Campanha inválida." };
  const { campanhaId } = parsed.data;

  const [campanha] = await db
    .select({ id: campanhas.id, oferta: campanhas.oferta, /* + nichoNome via join, metaConversao, janela */ })
    .from(campanhas).where(eq(campanhas.id, campanhaId));
  if (!campanha) return { success: false, erro: "Campanha não encontrada." };   // guarda de FK forjada

  try {
    const r = await gerarDiagnostico({ /* nicho, oferta, janelaDias, meta */ });
    const [row] = await db.insert(diagnosticos).values({
      campanhaId, payload: r.diagnostico, fontes: r.fontes, buscas: r.buscas,
      status: "ok", inputTokens: r.uso.inputTokens, outputTokens: r.uso.outputTokens,
    }).returning({ id: diagnosticos.id });
    revalidatePath(`/campanhas/${campanhaId}`);
    return { success: true, diagnosticoId: row.id };
  } catch (err) {
    if (isForeignKeyViolation(err)) return { success: false, erro: "Campanha não encontrada." };
    const erro = err instanceof Error ? err.message : "Falha desconhecida.";
    const [row] = await db.insert(diagnosticos).values({
      campanhaId, status: "falhou", erro,   // NUNCA um resultado falso
    }).returning({ id: diagnosticos.id });
    revalidatePath(`/campanhas/${campanhaId}`);
    return { success: false, erro };
  }
}
```
Notas:
- O input aqui **não** é um formulário com campos — é só `campanhaId` (hidden input ou `.bind()`). Por isso a action usa `{ success: false, erro: string }` (string operacional única) em vez do `{ errors: Record<...> }` do projeto, que é para erros de campo. **Divergência consciente de shape** — ver Open Question 3.
- Persistir a linha `status:'falhou'` ANTES de devolver o erro (DIAGNOSTICO-10: falha é evento visível).
- O `payload` vai como objeto JS — Drizzle serializa (`mode:"json"`). Ao **ler**, re-rodar `diagnosticoSchema.safeParse(row.payload)` (fronteira de confiança do DB, AI-SPEC §4).

### Pattern 4: Harness estrutural (molde `test-tarefa-actions.cjs`)

```js
"use strict";
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));
// NÃO precisa do next-cache-stub-loader se importar só o schema puro (sem "use server")

let failed = 0;
function check(cond, msg) { cond ? console.log(`OK ${msg}`) : (console.error(`FAIL ${msg}`), failed++); }

async function main() {
  const { diagnosticoSchema } = await import("@/lib/ai/diagnostico-schema");
  const fs = require("node:fs"), path = require("node:path");
  const dir = path.join(__dirname, "..", "test", "fixtures", "diagnostico");

  // fixtures "ok-*.json" DEVEM validar; "bad-*.json" DEVEM falhar
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const res = diagnosticoSchema.safeParse(data);
    if (f.startsWith("ok-")) check(res.success, `${f} valida`);
    else check(!res.success, `${f} é rejeitado`);
  }
  // + asserções finas: exatamente 1 mais_forte; achados.length>=3 todos com tipo válido;
  //   veredito ∈ enum; concorrentes_diretos inteiro>=0; gate filtrarFontes([]) → lança/[]
}
main().then(() => process.exit(failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
```
- `package.json`: `"test:diagnostico-estrutural": "node scripts/test-diagnostico-estrutural.cjs"`.
- **Crítico:** `@/lib/ai/diagnostico-schema` não pode importar `server-only`, o AI SDK, nem `@/db/client` — senão o harness quebra (`server-only` lança fora do bundler; `@/db/client` abre `./data/crm.db` de verdade). Manter schema + helpers de gate (`filtrarFontes`, `assertTemFonte`) num arquivo sem efeito colateral.
- `scripts/eval-diagnostico.mjs`: ESM, chama `register("./ts-alias-loader.mjs", ...)` no topo igual aos `.cjs`; importa **só** `@/lib/ai/gerar-diagnostico` (pura, sem DB) + `@/lib/ai/diagnostico-schema`; precisa `ANTHROPIC_API_KEY`; **fora do CI**; roda os 12 nichos-referência + LLM-judge hand-rolled (`generateText` a `claude-sonnet-5`, `temperature: 0`); gera relatório markdown datado em `test/reports/`.

### Anti-Patterns to Avoid

- **`generateObject` para "busca + objeto".** Não aceita `tools`. Sempre `generateText({ tools, output: Output.object(...) })`.
- **`streamObject`/`streamText` para o resultado.** Entrega objeto parcial — impossível aplicar o gate de fontes ou a validação Zod antes de fechar. Use `await generateText`. Stream só para progresso cosmético (que aqui vem de `onStepFinish`, não de stream).
- **Chamar `@/lib/ai/*` de Client Component.** Vaza `ANTHROPIC_API_KEY` no bundle. `import "server-only"` no topo de `gerar-diagnostico.ts`.
- **`runtime = 'edge'` na rota.** `better-sqlite3` + geração longa não cabem em edge. Não setar (o default é Node).
- **Renderizar `fonte_url` como `href` sem checar o esquema.** URL autorada pelo LLM → `href="javascript:..."` é XSS. Ver Security Domain.
- **Cache de qualquer forma** (exact-match, semântico, prompt caching do system prompt). DIAGNOSTICO-10 proíbe — a transparência de "cada botão = uma chamada paga" é requisito.
- **`drizzle-kit push`/`generate`.** Proibido no projeto.
- **`DELETE FROM` no harness** para limpar estado. Usar temp DB / ids únicos.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loop de tool-use (modelo pede busca → resultado → modelo continua) | Orquestrador manual de `tool_use`/`tool_result` | `generateText` + `stopWhen: isStepCount(10)` | O AI SDK roda o loop multi-step e para sozinho |
| Web search + citações | Chamar API de busca (Serper/Brave) + montar contexto + pedir URLs ao modelo | `anthropic.tools.webSearch_20250305` (executa na Anthropic, devolve `result.sources` reais) | Citações verificáveis são o ponto de DIAGNOSTICO-02; a tool nativa dá URLs que o modelo *de fato* consultou |
| Saída estruturada validada | `JSON.parse` do texto + checagem manual + retry | `output: Output.object({ schema })` (zod → json schema → re-valida com `safeParseAsync`) | Trunca/viola schema → `NoObjectGeneratedError` com `finishReason`/`cause` |
| Detectar objeto inválido | `try { JSON.parse } catch` | `NoObjectGeneratedError.isInstance(err)` + `err.finishReason`/`err.text`/`err.usage`/`err.cause` | Cobre truncamento (`finishReason: 'length'`) e violação de `.refine()` |
| Retry de transporte (429/5xx) | Loop de backoff | `maxRetries: 2` no `generateText` | Já embutido. (Falha de schema/zero-fontes = loop manual à parte, máx 2 tentativas) |
| Migração de schema SQLite | `drizzle-kit` | `scripts/migrate-diagnosticos.cjs` manual (molde `migrate-campanhas.cjs`) | Padrão travado do projeto — 2 incidentes destrutivos com drizzle-kit |
| Framework de teste | jest/vitest | `scripts/*.cjs` com `check()`/`process.exit()` + `ts-alias-loader.mjs` | Padrão do projeto; Node 24 importa TS nativo |
| Cross-check de URL citada | regex de URLs no texto | comparar `fonte_url` do objeto contra o `Set` de `result.sources[].url` | Guardrail FM2 do AI-SPEC §6 |

**Key insight:** Quase tudo que parece "trabalho de IA" aqui já é resolvido pela combinação `generateText` + `Output.object` + web search tool. O trabalho *novo* de verdade da fase é: (1) o **schema Zod** (é o contrato anti-genérico), (2) o **system prompt** (a rubrica), (3) o **gate de fontes** (5 linhas), (4) a **fiação no codebase** (migração, action, UI). Não construir infra de eval, nem orquestração, nem parsing.

---

## Runtime State Inventory

> A fase adiciona uma tabela e uma dependência de serviço externo. Não é rename/refactor, mas há estado de runtime a inventariar.

| Categoria | Itens | Ação necessária |
|-----------|-------|-----------------|
| **Stored data** | Nova tabela `diagnosticos` em `data/crm.db`. Nenhum dado existente é lido ou alterado pela geração (AI-SPEC: "Nenhum dado do CRM é alterado" — só INSERT em `diagnosticos`). A migração roda contra o banco real com 44+ leads / N campanhas — **contagem-testemunha antes/depois** (`campanhas` ou `leads`) prova não-regressão. | Migração `.cjs` rodada de verdade, 2x (idempotência), na Onda 0. Backup automático (`.backup-<ISO>`). |
| **Live service config** | **Anthropic Console (org):** a "Web Search" tool precisa estar habilitada nas configurações da **organização** — config que vive no Console, não no git. Sem ela: HTTP 400. | Passo de setup do usuário (`autonomous: false`) — já em STATE.md. O planner deve incluir um `checkpoint:human-verify` "web search habilitada no Console + `.env.local` criado" **antes** de qualquer task que chame a API (eval, UAT). |
| **OS-registered state** | Nenhum. Sem cron, sem Task Scheduler, sem pm2/systemd. O app roda `next dev`/`next start` à mão. | Nenhuma — verificado (projeto é local, sem serviços registrados). |
| **Secrets/env vars** | `ANTHROPIC_API_KEY` — **nova**, não existe hoje. Vai em `.env.local` (não versionado, `.gitignore` linha 34 cobre `.env*`). Lida server-only. Nenhum secret existente muda. Se o app um dia for pra VPS (STATE.md "Direção de infra"), a env var entra no ambiente do host. | Documentar no plano: usuário cria `.env.local`. Nenhuma rotação. Nunca logar a chave. |
| **Build artifacts / installed packages** | `node_modules` ganha `ai` + `@ai-sdk/anthropic` (+ deps transitivas). `package.json`/`package-lock.json` mudam. Nenhum egg-info/binário/imagem. `next build` (Turbopack) precisa re-rodar como gate. | `npm i` + commit do lock. `npm run build` no gate da fase (passa desde 2026-08-29). |

**Nada encontrado em OS-registered state:** confirmado — o projeto não registra nada no SO; execução é manual via npm scripts.

---

## Common Pitfalls

### Pitfall 1: `generateObject` não aceita `tools`
**O que dá errado:** começar pelo caminho "óbvio" (`generateObject` para saída estruturada) e descobrir tarde que não dá pra ligar a web search.
**Como evitar:** `generateText({ tools, output: Output.object({ schema }) })`. Confirmado nas docs atuais (ai-sdk.dev, 2026-09-05).
**Sinal de alerta:** código importando `generateObject` de `'ai'`.

### Pitfall 2: O passo do objeto conta como step
**O que dá errado:** `stopWhen: isStepCount(3)` + 3 buscas → o modelo gasta os 3 steps buscando e nunca emite o objeto → `NoObjectGeneratedError`.
**Como evitar:** `isStepCount(10)`. As docs dizem textualmente: *"generating the structured output counts as a step"*.
**Sinal de alerta:** `NoObjectGeneratedError` com `finishReason` não-`'length'` e `text` vazio.

### Pitfall 3: `result.sources` ≠ URLs que o modelo escreveu no objeto
**O que dá errado:** o modelo pode listar URLs dentro do objeto sem ter buscado (alucinação apesar da tool). O gate DIAGNOSTICO-02 lendo do objeto passaria lixo.
**Como evitar:** o gate lê `result.sources.filter(s => s.sourceType === 'url')`. Cross-check: cada `fonte_url` do objeto que não estiver em `sources` é **descartada** (FM2 do AI-SPEC §6); se isso zerar as fontes de um achado de peso, o achado cai.
**Sinal de alerta:** `fonte_url` no objeto com domínio que não aparece em nenhuma query de `onStepFinish`.

### Pitfall 4: Truncamento de saída estruturada
**O que dá errado:** objeto grande + `maxOutputTokens` apertado → JSON cortado → `NoObjectGeneratedError` com `finishReason: 'length'`.
**Como evitar:** `.max()` em todo array/string do schema (já no AI-SPEC §4b) **e** `maxOutputTokens` folgado. **Ver Pitfall 9** — com adaptive thinking do Sonnet 5, os tokens de raciocínio contam contra `maxOutputTokens`, então 6000 provavelmente é apertado demais.
**Sinal de alerta:** `err.finishReason === 'length'`; logar sempre.

### Pitfall 5: `.refine()` do Zod não vai pro modelo
**O que dá errado:** "exatamente 1 gatilho `mais_forte`" é um `.refine()` — não entra no JSON schema enviado ao Claude, mas **é** checado na validação do retorno → `NoObjectGeneratedError`.
**Como evitar:** usar `.refine()` como cinto de segurança **e repetir a regra em texto no system prompt**. No retry (2ª tentativa), reforçar: "a tentativa anterior falhou; marque exatamente um gatilho como mais_forte".

### Pitfall 6: Chamar o módulo de IA de Client Component
**O que dá errado:** `ANTHROPIC_API_KEY` no bundle do browser.
**Como evitar:** `import "server-only"` no topo de `gerar-diagnostico.ts`; a Server Action é a única porta de entrada. O `<GerarDiagnosticoButton>` só chama a action via `useActionState`, nunca a função direta.

### Pitfall 7: `better-sqlite3` e runtime
**O que dá errado:** algum ajuste futuro empurra a rota `/campanhas/[id]` para `runtime = 'edge'` → `better-sqlite3` não carrega, geração longa não cabe.
**Como evitar:** não declarar `runtime` (default Node). `export const maxDuration = 120;` em `page.tsx` (Next 16 App Router — funciona; local `next start`/`next dev` não tem limite; **Vercel Hobby tem teto de 60s** — se um dia deployar, baixar `maxUses` ou subir de plano). Também: **não esquecer `"use server"`** no arquivo de actions.

### Pitfall 8: Timeout de função / latência
**O que dá errado:** 5–6 buscas + adaptive thinking → 60–120s. UI parece travada; risco de o usuário fechar a aba.
**Como evitar:** `maxDuration = 120`. UI: `useActionState` + `useTransition` + linhas de busca ao vivo (`onStepFinish`) como prova de trabalho; caption "não feche a página". Considerar `effort: 'low'` para cortar latência (Pitfall 9).
**Sinal de alerta:** `usage`/duração persistidos em `diagnosticos` acima de p90 ~110s.

### Pitfall 9: Claude Sonnet 5 tem "adaptive thinking" sempre ligado (NOVO — o AI-SPEC não previu)
**O que dá errado:** o AI-SPEC §4 diz `temperature: 0.3`, `maxOutputTokens: 6000`, "NÃO usar extended thinking". Mas o **Sonnet 5** (verificado em platform.claude.com/docs, 2026-09-05): *"Thinking: Adaptive (always on)"*, *"Default effort: high"*, e *"Extended thinking … not accepted on later models"*. O modo manual de thinking foi removido, mas o adaptive **não desliga**. Os tokens de raciocínio (a) são cobrados como **output** (US$10/1M) e (b) **contam contra `maxOutputTokens`**. Com `maxOutputTokens: 6000` e effort `high`, o modelo pode gastar a cota inteira pensando e truncar o objeto (`finishReason: 'length'` → Pitfall 4).
**Como evitar (recomendação para o planner):**
- Subir `maxOutputTokens` para **~12000–16000** (Sonnet 5 suporta 128K de max output; 16K é barato e some com o risco de truncar).
- Setar `providerOptions: { anthropic: { effort: 'low' } }` (valores: `'low' | 'medium' | 'high' | 'xhigh' | 'max'`) — pesquisa factual estruturada não precisa de raciocínio profundo; `low` corta latência e tokens de output.
- `temperature: 0.3` provavelmente ainda vale (as docs do provider **não** documentam a antiga trava `temperature: 1` para modelos novos), mas confirmar no momento da implementação se o param é honrado com adaptive thinking.
**Sinal de alerta:** `outputTokens` muito acima do objeto renderizado (~3–5k) → tokens de thinking; latência > 90s; `finishReason: 'length'` recorrente.
**Confiança:** MEDIUM — a existência do `effort` e do adaptive thinking está confirmada nas docs; o comportamento exato dentro do `@ai-sdk/anthropic@4.0.49` (se `effort` é repassado, se `temperature` é honrado) precisa de teste rápido na Onda 1.

### Pitfall 10: `diagnosticoSchema` com import de efeito colateral quebra o harness
**O que dá errado:** se `diagnostico-schema.ts` importar (direta ou transitivamente) `server-only`, o AI SDK, ou `@/db/client`, o `scripts/test-diagnostico-estrutural.cjs` explode (`server-only` lança fora do bundler; `@/db/client` abre o `data/crm.db` real).
**Como evitar:** `diagnostico-schema.ts` = só `import { z } from "zod"` + os helpers de gate puros. A função `gerarDiagnostico` (que importa o SDK e `server-only`) fica num arquivo separado que o harness estrutural **não** importa.

### Pitfall 11: Re-validação na leitura do DB
**O que dá errado:** confiar no `payload` JSON do banco sem re-validar — um payload de um schema antigo (após mudança de schema) renderiza quebrado.
**Como evitar:** `diagnosticoSchema.safeParse(row.payload)` ao ler em `DiagnosticoSecao`; se falhar, tratar como a linha estivesse `status:'falhou'` (mostrar aviso, não crashar).

---

## Code Examples

### Geração (núcleo) — `src/lib/ai/gerar-diagnostico.ts`
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
//         https://ai-sdk.dev/providers/ai-sdk-providers/anthropic  (verificado 2026-09-05)
import "server-only";
import { generateText, Output, NoObjectGeneratedError, isStepCount } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { diagnosticoSchema } from "./diagnostico-schema";
import { SYSTEM_PROMPT, montarUserPrompt } from "./diagnostico-prompt";

const MAX_TENTATIVAS = 2;

export async function gerarDiagnostico(input: {
  nicho: string; oferta: string; janelaDias: number; meta: string;
}) {
  let ultimoErro: unknown;
  const buscas: string[] = [];

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const res = await generateText({
        model: anthropic("claude-sonnet-5"),          // ID = alias = snapshot pinado; NÃO existe forma datada
        temperature: 0.3,
        maxOutputTokens: 16000,                        // folga p/ tokens de adaptive thinking (Pitfall 9)
        maxRetries: 2,                                 // só transporte (429/5xx)
        providerOptions: { anthropic: { effort: "low" } },  // corta latência/custo; confirmar repasse na Onda 1
        system: SYSTEM_PROMPT,
        prompt: montarUserPrompt(input) + (tentativa > 1
          ? "\n\nA tentativa anterior falhou. Faça pelo menos 3 buscas reais, confirme cada URL, e marque exatamente um gatilho como mais_forte."
          : ""),
        tools: {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: 6,
            userLocation: { type: "approximate", country: "BR" },
          }),
        },
        output: Output.object({ schema: diagnosticoSchema }),
        stopWhen: isStepCount(10),                     // buscas + o passo do objeto contam
        onStepFinish: (step) => {
          for (const c of step.toolCalls) {
            if (c.toolName === "web_search" && c.input && typeof c.input === "object" && "query" in c.input) {
              buscas.push(String((c.input as { query: unknown }).query));
            }
          }
        },
      });

      const fontes = res.sources
        .filter((s) => s.sourceType === "url")
        .map((s) => ({ url: s.url, title: s.title }));
      if (fontes.length === 0) throw new DiagnosticoSemFonteError();

      return {
        diagnostico: res.output,          // já validado contra diagnosticoSchema
        fontes,
        uso: { inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens },
        buscas,
      };
    } catch (err) {
      ultimoErro = err;
      if (NoObjectGeneratedError.isInstance(err)) {
        console.error("[diagnostico] objeto inválido", {
          tentativa, finishReason: err.finishReason, causa: err.cause,
          texto: err.text?.slice(0, 500), uso: err.usage,
        });
        continue;
      }
      if (err instanceof DiagnosticoSemFonteError) {
        console.warn("[diagnostico] zero fontes", { tentativa });
        continue;
      }
      throw err; // erro de API que já esgotou maxRetries
    }
  }
  throw new DiagnosticoInvalidoError(`Falhou após ${MAX_TENTATIVAS} tentativas: ${String(ultimoErro)}`);
}

export class DiagnosticoSemFonteError extends Error {}
export class DiagnosticoInvalidoError extends Error {}
```

### Schema (contrato) — trecho de `src/lib/ai/diagnostico-schema.ts`
Ver AI-SPEC §4b para o schema completo (está correto e verificado — `z.object`, `z.enum`, `.min()/.max()`, `.refine()`). Adicionar os helpers de gate **puros** no mesmo arquivo:
```typescript
import { z } from "zod";
// ... diagnosticoSchema (do AI-SPEC §4b) ...
export type Diagnostico = z.infer<typeof diagnosticoSchema>;

export function filtrarFontes(
  sources: { sourceType: string; url?: string; title?: string }[],
): { url: string; title?: string }[] {
  return sources
    .filter((s) => s.sourceType === "url" && typeof s.url === "string")
    .map((s) => ({ url: s.url as string, title: s.title }));
}

// XSS: só http(s) vira href na UI (URL é autorada pelo LLM)
export function urlSegura(u: string): boolean {
  try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; }
  catch { return false; }
}
```

### Rota — `src/app/campanhas/[id]/page.tsx`
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration
export const maxDuration = 120; // segundos — a Server Action de diagnóstico leva 30–90s+
// ... resto da página existente + <DiagnosticoSecao campanhaId={campanhaId} /> como último filho do <div className="flex flex-col gap-6">
```

---

## State of the Art

| Antigo (mental model do template / treino) | Atual (verificado 2026-09-05) | Quando mudou | Impacto |
|--------------------------------------------|-------------------------------|--------------|---------|
| `ai@5.x`, `experimental_output`, `stepCountIs` | `ai@7.0.93`, `output: Output.object`, `stopWhen: isStepCount(n)` | linha 7.x (2026) | Usar os nomes novos; `ai-v5`/`ai-v6` são dist-tags legadas mantidas |
| Sonnet com thinking opcional (`thinking: {type:'enabled', budgetTokens}`), `temperature` livre | **Sonnet 5**: adaptive thinking **sempre on**, `effort: 'low'..'max'`, extended thinking "não aceito" | geração 4.6+ | Rever `maxOutputTokens` e `effort` (Pitfall 9) |
| `claude-sonnet-4-5-20250929` / snapshots datados | `claude-sonnet-5` — ID **e** alias, **já é snapshot pinado** (IDs sem data a partir do 4.6 são seu próprio snapshot) | geração 4.6+ | Não procurar forma datada; `anthropic('claude-sonnet-5')` é definitivo |
| Sonnet ~US$3 / US$15 por 1M tok | Sonnet 5 = **US$2 / US$10** por 1M tok | Sonnet 5 | Custo por diagnóstico ~US$0,15–0,25 (menor que a estimativa US$0,20–0,30 do AI-SPEC) |
| `generateObject` para saída estruturada | `generateObject` **não aceita `tools`** → `generateText` + `Output.object` | sempre foi assim, mas é contra-intuitivo | Pitfall 1 |

**Deprecated/outdated no contexto desta fase:**
- Extended thinking manual (`thinking.type: 'enabled'`) — não aceito no Sonnet 5.
- Qualquer referência a `claude-sonnet-4-6` no AI-SPEC §4 ("o pesquisador citou `claude-sonnet-4-6`") — a linha corrente é `claude-sonnet-5` (o AI-SPEC já corrigiu isso no corpo, mas o texto §4 ainda menciona a confusão).

---

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|-------|-----------------|
| A1 | `ai@7.0.93` e `@ai-sdk/anthropic@4.0.49` são legítimos (slopcheck não rodou) | Package Legitimacy | Baixo — pacotes oficiais Vercel, docs oficiais, sem postinstall; planner ainda gate com checkpoint |
| A2 | `providerOptions.anthropic.effort` é repassado pelo `@ai-sdk/anthropic@4.0.49` e reduz latência/tokens | Pitfall 9, Code Examples | Médio — se não for repassado, latência/custo ficam mais altos; mitigar com `maxOutputTokens` alto e aceitar 60–120s |
| A3 | `temperature: 0.3` ainda é honrado no Sonnet 5 com adaptive thinking | Pitfall 9 | Baixo — mesmo se ignorado, `temperature` alto só aumentaria variância; testar na Onda 1 |
| A4 | `criado_em` deve seguir a convenção do projeto (`integer` timestamp + `unixepoch()`), **não** ISO string como o AI-SPEC §4 diz | Pattern 1, Open Question 2 | Baixo/Médio — decisão do planner; ISO string funciona mas quebra a consistência e o `format()` do date-fns espera `Date`/número |
| A5 | A web search tool emite a query em `step.toolCalls[].input.query` (nome do campo) | Code Examples (`onStepFinish`) | Baixo — se o campo tiver outro nome, `buscas` fica vazio (DIAGNOSTICO-10 perde detalhe, não quebra); inspecionar `step.toolCalls` na Onda 1 |
| A6 | Preço Sonnet 5 US$2/US$10 por 1M (platform.claude.com/docs) e web search US$10/1000 (AI-SPEC, não re-verificado nesta sessão) | State of the Art, Cost | Baixo — volume solo (~5–20/mês) mantém o total < US$6/mês em qualquer cenário plausível |
| A7 | `maxDuration` export funciona em `page.tsx` no Next 16 App Router para cobrir uma Server Action longa | Pitfall 7, Code Examples | Médio — se `maxDuration` não cobrir Server Actions (só route handlers/páginas), local não importa (sem limite) mas um deploy Vercel cortaria em 15s/60s; confirmar nas docs do Next 16 no plano |
| A8 | Server Actions co-locadas vs `src/actions/` — ambas resolvem pelo `ts-alias-loader` e por Next 16 | Open Question 3 | Baixo — só organização |

---

## Open Questions (RESOLVED)

> Todas as 5 perguntas foram dispostas no planejamento da Fase 23 (planos 23-01 a 23-07).
> A disposição de cada uma está anotada no próprio item.

1. **`effort` / `maxOutputTokens` / `temperature` no Sonnet 5 via `@ai-sdk/anthropic@4.0.49`**
   - O que sabemos: adaptive thinking sempre on; `effort` existe (`low..max`); tokens de thinking = output e contam contra `maxOutputTokens`.
   - O que falta: se `providerOptions.anthropic.effort` é repassado nesta versão do provider; qual `maxOutputTokens` real evita truncamento; se `temperature` é honrado.
   - **Disposição: RESOLVIDA via spike em 23-04 Task 3** — a medição real fixa `maxOutputTokens`,
     `effort` e `temperature`, registrados como D-23-04 no SUMMARY de 23-04.
   - Recomendação: 1ª task da Onda 1 é um "spike" — uma chamada real de `gerarDiagnostico` com log completo de `usage`/`finishReason`/`steps`, ajustar `effort` e `maxOutputTokens` a partir do observado, documentar como decisão da fase.

2. **`criado_em`: ISO string (AI-SPEC §4) vs `integer` timestamp (convenção do projeto)**
   - O que sabemos: todo timestamp do schema é `integer({mode:"timestamp"})` + `unixepoch()`. O AI-SPEC §4 diz "`criadoEm` (ISO string, padrão do projeto)" — mas ISO string **não** é o padrão do projeto.
   - **Disposição: RESOLVIDA por D-23-01** (plano 23-02, Task 1) — `integer({ mode: "timestamp" })`
     com default `(unixepoch())`; o 23-AI-SPEC §4 está errado neste ponto.
   - Recomendação: usar `integer("criado_em", { mode: "timestamp" }).notNull().default(sql\`(unixepoch())\`)` (Pattern 1). Se o planner discordar, decidir explicitamente e documentar — não deixar o executor escolher.

3. **Localização do arquivo de Server Action + shape do `ActionState`**
   - O que sabemos: UI-SPEC pede `src/app/campanhas/[id]/actions.ts`; o projeto tem tudo em `src/actions/*.ts`. O `ActionState` do projeto usa `{ errors: Record<string,string[]> }` para erros de campo; o diagnóstico tem 0 campos e 1 erro operacional.
   - **Disposição: RESOLVIDA por D-23-02 e D-23-03** (plano 23-04, bloco `<interfaces>`) —
     arquivo em `src/actions/diagnostico-actions.ts`; retorno
     `{ success: true; diagnosticoId } | { success: false; erro } | undefined`.
   - Recomendação: `src/actions/diagnostico-actions.ts` (consistência com os `test-*-actions.cjs`), com return `{ success: true; diagnosticoId } | { success: false; erro: string } | undefined`. Aceitável seguir o UI-SPEC (co-locado) se o planner preferir — o harness resolve `@/app/...` igual.

4. **`eval-diagnostico.mjs` e o dataset de 12 nichos-referência**
   - O que sabemos: AI-SPEC §5 quer 3 gold (costureira→`mudar_angulo`, motoboy particular→`aprofundar`, estética→`abandonar`) + 4 difíceis + 1 adversarial + ~4 reais.
   - O que falta: os 3 gold + 4 difíceis podem virar **fixtures de payload esperado** (escritos à mão) antes da função existir; os reais dependem de campanhas do usuário.
   - **Disposição: RESOLVIDA pela estrutura de ondas** — fixtures estruturais na Onda 1 (plano 23-01,
     harness `test:diagnostico-estrutural`); `eval-diagnostico.mjs` e o dataset de nichos no plano 23-06.
   - Recomendação: Onda 0 cria as fixtures estruturais (bons/ruins) para o harness CI; o `eval-diagnostico.mjs` e o dataset de nichos ficam na Onda 2, com os 3 gold obrigatórios e os demais "conforme o usuário criar campanhas". Não bloquear a fase no dataset completo.

5. **Histórico de gerações anteriores na UI**
   - O que sabemos: UI-SPEC §6 quer disclosure "Ver gerações anteriores (n)" — lista compacta read-only, sem rota `/diagnosticos`.
   - **Disposição: RESOLVIDA no plano 23-07 Task 2** — query única de todas as linhas ordenadas por
     `criadoEm` desc, com a mais recente derivada em memória e o disclosure read-only
     "Ver gerações anteriores (n)".
   - Sem gap — só sinalizado para o planner incluir a query "todas as linhas de `diagnosticos` da campanha, ordenadas por `criado_em` desc" além da "última linha".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tudo (Server Actions, harness, migração) | ✓ | v24.12.0 | — |
| npm | instalar `ai`/`@ai-sdk/anthropic` | ✓ | 11.6.2 | — |
| `better-sqlite3` | `data/crm.db` | ✓ | 12.11.1 (instalado) | — |
| Node 24 native TS loader (`ts-alias-loader.mjs`) | harness `.cjs` importar `@/lib/ai/*.ts` | ✓ | embutido no Node 24 | — |
| `ANTHROPIC_API_KEY` (`.env.local`) | `gerarDiagnostico`, `eval-diagnostico.mjs`, UAT | ✗ | — | **Nenhum** — bloqueia geração real e o eval. Harness estrutural (fixtures) **não** precisa dela → CI segue verde. |
| Web Search tool habilitada no Console Anthropic (org) | a chamada de `generateText` com a tool | ✗ (não verificável por código) | — | **Nenhum** — HTTP 400 sem ela. |
| `slopcheck` (pip) | auditoria de pacote | ✗ | — | Marcar pacotes `[ASSUMED]` + `checkpoint:human-verify` (feito) |
| Navegador + agente juntos (host 4GB) | UAT visual da seção de UI | ✗ (limitação de hardware) | — | Verificação por code+data + UAT humano diferido (precedente Fases 18–21) |

**Missing dependencies com fallback:** `slopcheck` (→ checkpoint manual); navegador (→ UAT diferido).
**Missing dependencies sem fallback (o planner DEVE tratar com `checkpoint:human-verify` antes das tasks que chamam a API):**
- `ANTHROPIC_API_KEY` em `.env.local`.
- "Web Search" habilitada nas configs da organização no Console Anthropic.

Ambos já estão em STATE.md ("Setup pendente do usuário para a Fase 23"). **A fase pode ser planejada e as Ondas 0–1 (migração, schema, action, harness estrutural sobre fixtures) executadas sem eles**; só a geração real, o `eval-diagnostico.mjs` e o UAT ficam bloqueados até o setup.

---

## Validation Architecture

> Harness **estrutural anti-genérico** do `23-AI-SPEC` §5 — o que é automatizável sem navegador e sem chamada de API. `nyquist_validation: true` no config.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Harness `.cjs` sob medida (padrão do projeto — sem jest/vitest). Node 24 + `scripts/ts-alias-loader.mjs` para importar módulos TS. |
| Config file | nenhum — `check(cond, msg)` + contador `failed` + `process.exit(failed > 0 ? 1 : 0)`, embrulhado em `main().then().catch()` |
| Quick run command | `npm run test:diagnostico-estrutural` |
| Full suite command | `npm run lint && npm run verify:schema && npm run test:diagnostico-estrutural && npm run guard:no-hard-delete` (+ os outros `test:*` existentes no gate da fase) |
| Eval subjetivo (NÃO CI, custa dinheiro, roda sozinho) | `node scripts/eval-diagnostico.mjs` — precisa `ANTHROPIC_API_KEY` |

### Estrutura anti-genérico (AI-SPEC §5, dimensões automatizáveis 1/2/5/6/9)

`scripts/test-diagnostico-estrutural.cjs` roda **sobre fixtures JSON versionadas** (`test/fixtures/diagnostico/`), sem tocar o Claude, sem tocar `data/crm.db`:
- **Dim 1 — Conformidade estrutural:** `diagnosticoSchema.safeParse(fixture)` — `ok-*.json` valida; `bad-*.json` falha. Asserções finas: `indice_saturacao.concorrentes_diretos` inteiro ≥ 0; `gatilhos_dor` 1–3 com **exatamente 1** `mais_forte`; `objecoes` 2–3; `achados` ≥ 3, cada um com `tipo ∈ {dado_quantificavel, alegacao_marketing}`; `veredito_sugerido.decisao ∈ {aprofundar, mudar_angulo, abandonar}`; `rascunho_primeira_mensagem` 40–1200 chars.
- **Dim 2 — Fontes (parte de código):** `filtrarFontes([])` → `[]` e `assertTemFonte([])` lança; cross-check — toda `fonte_url` citada no objeto de uma fixture "ok" tem que constar na lista `sources` da fixture (fixture inclui um campo `_sources` simulado); `urlSegura()` rejeita `javascript:`/`data:`.
- **Dim 5 — Ticket (campo):** `ticket_medio.valor_estimado_brl > 0` e `fonte_url` presente + em `_sources`.
- **Dim 6 — dado × marketing (estrutura):** toda linha de `achados` tem `tipo` válido; a fixture "adversarial" tem ≥ 1 `alegacao_marketing` e ≥ 1 `dado_quantificavel` (mix presente).
- **Dim 9 — Custo/latência (limiares):** asserção sobre linhas simuladas — `buscas.length ≤ maxUses (6)`; `input+output tokens` dentro de faixa; `finishReason !== 'length'`. (Sobre dados reais roda no `eval`, não no CI.)

Dimensões **3/4/7/8 + 2 (sustentação) + 6 (correção da tag)** → `eval-diagnostico.mjs` (LLM-judge hand-rolled + spot-check do operador), **fora do CI**. O **teste-mestre** é a discriminação dos 3 gold (dim 7): dois nichos muito diferentes → mesmo veredito e texto quase igual = falha crítica.

### Phase Requirements → Test Map
| Req | Comportamento | Tipo | Comando automatizado | Existe? |
|-----|---------------|------|----------------------|---------|
| DIAGNOSTICO-01 | 2 gerações = 2 linhas, sem reuso | code (harness sobre `diagnosticos` em temp DB) | `test:diagnostico-estrutural` (caso "sem cache") | ❌ Wave 0 |
| DIAGNOSTICO-02 | zero fontes → rejeitado, não renderizado | code (`assertTemFonte`/`filtrarFontes`) + human (spot-check URLs no eval) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-03 | saturação = inteiro ≥ 0 | code (schema) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-04 | 1–3 gatilhos, exatamente 1 mais_forte | code (`.refine`) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-05 | 2–3 objeções com resposta | code (schema min/max) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-06 | ticket positivo + fonte | code (schema + cross-check) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-07 | todo achado tem tag; mix distinto | code (schema) + LLM-judge (tag correta) | `test:diagnostico-estrutural` + `eval-diagnostico.mjs` | ❌ Wave 0 |
| DIAGNOSTICO-08 | rascunho 40–1200 chars, editável, não persiste | code (schema) + human (UAT: editar+copiar) | `test:diagnostico-estrutural` | ❌ Wave 0 |
| DIAGNOSTICO-09 | veredito ∈ enum; discrimina nos 3 gold | code (enum) + human (gold-set) | `test:diagnostico-estrutural` + `eval-diagnostico.mjs` | ❌ Wave 0 |
| DIAGNOSTICO-10 | cada geração = linha nova + custo visível | code (schema/tabela) + human (UAT: linha de metadados) | `test:diagnostico-estrutural` + `verify:schema` | ❌ Wave 0 |
| (schema DB) | tabela `diagnosticos` com conjunto estrito de colunas | code | `npm run verify:schema` (estendido) | ❌ Wave 0 (estender) |

### Sampling Rate
- **Por task/commit:** `npm run test:diagnostico-estrutural` + `npm run verify:schema`.
- **Por merge de onda:** full suite (lint + verify:schema + todos os `test:*` + guard).
- **Gate da fase:** full suite verde + `npm run build` (Turbopack) + `node scripts/eval-diagnostico.mjs` rodado à mão nos 3 gold com relatório colado (regressão nos 3 gold **bloqueia**).

### Wave 0 Gaps
- [ ] `scripts/migrate-diagnosticos.cjs` — cria a tabela (molde `migrate-campanhas.cjs`); rodar de verdade 2x contra `data/crm.db`
- [ ] `scripts/verify-schema.cjs` — estender: `requiredTables` + `requiredIndexes` + `REQUIRED_DIAGNOSTICOS_COLUMNS` (bloco estrito) + mutação provada
- [ ] `src/db/schema.ts` — `export const diagnosticos` (após `campanhas`)
- [ ] `test/fixtures/diagnostico/*.json` — ≥ 6 fixtures: `ok-costureira`, `ok-motoboy`, `ok-estetica`, `bad-zero-mais-forte`, `bad-dois-mais-forte`, `bad-enum-veredito`, `bad-achados-sem-tipo`, `bad-truncado`, `adversarial-so-marketing`
- [ ] `scripts/test-diagnostico-estrutural.cjs` — harness (molde `test-tarefa-actions.cjs`); `package.json` script
- [ ] `scripts/eval-diagnostico.mjs` — Onda 2, API real, LLM-judge, relatório datado (não CI)
- [ ] `src/lib/ai/diagnostico-schema.ts` — schema (do AI-SPEC §4b) + `filtrarFontes`/`assertTemFonte`/`urlSegura` puros (sem efeito colateral de import)

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`. App **solo, local, sem auth** (CLAUDE.md) — as categorias de auth/sessão não se aplicam; o foco é **input não confiável vindo do LLM/web** e **manuseio da API key**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control nesta fase |
|---------------|---------|-----------------------------|
| V2 Authentication | não | ferramenta solo, sem contas (CLAUDE.md) |
| V3 Session Management | não | idem |
| V4 Access Control | não (parcial) | rota local; a Server Action só valida que a campanha existe (guarda de FK), não "quem" |
| V5 Input Validation & Sanitization | **sim** | (a) input da action: `z.coerce.number().int().positive()` no `campanhaId` **antes** de qualquer query; (b) **saída do LLM tratada como entrada não confiável** — `Output.object` re-valida contra `diagnosticoSchema`, e o `payload` é re-validado ao ler do DB; (c) **URLs autoradas pelo LLM**: `urlSegura(u)` (só `http:`/`https:`) antes de virar `href`; JSX auto-escapa o texto do diagnóstico |
| V6 Cryptography | não | sem cripto; sem hashing |
| V7 Error Handling & Logging | **sim** | logs `[diagnostico]` carregam `tentativa`/`finishReason`/`usage`/`cause` — **nunca** a `ANTHROPIC_API_KEY`; sem dado de lead no fluxo (a geração não lê a base de leads); erro ao usuário é a mensagem do campo `erro`, sem stack trace |
| V8 Data Protection | **sim** (leve) | `ANTHROPIC_API_KEY` só em `.env.local` (gitignored), lida server-only, nunca no bundle (`import "server-only"`); `diagnosticos` guarda só título+URL de citação pública, sem PII de terceiros (AI-SPEC §1b Regulatory) |
| V10 Malicious Code | **sim** | pacotes novos gated por `checkpoint:human-verify` (slopcheck indisponível); sem `postinstall` nos dois |
| V12 Files & Resources / SSRF | **sim** | a web search roda na **infra da Anthropic**, não na nossa — sem SSRF do nosso lado. **Não** fazer fetch server-side das URLs citadas (o "liveness check" do eval é on-demand/local, opcional). Links renderizados: `target="_blank" rel="noopener noreferrer"` |
| V13 API / Web Service | **sim** | Server Action (não endpoint público); `maxDuration` + `maxUses` + `maxOutputTokens` são os limites de recurso; sem rate-limit adicional (1 usuário, botão manual) |

### Known Threat Patterns for {Next 16 Server Action + LLM + web search + SQLite}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `ANTHROPIC_API_KEY` vaza pro bundle do browser | Information Disclosure | `import "server-only"` no módulo de IA; nunca importar `@/lib/ai/*` de Client Component; a única porta é a Server Action |
| URL autorada pelo LLM vira `href="javascript:..."` (XSS) | Tampering / Elevation | `urlSegura()` — allowlist de esquema (`http:`/`https:`) antes de qualquer `<a href>`; `z.string().url()` **não** basta (aceita outros esquemas) |
| Prompt injection via conteúdo de página de concorrente nos resultados de busca | Tampering | schema estrito limita a forma da saída; system prompt manda tratar conteúdo de página como dado, não instrução; tag `alegacao_marketing`; veredito nunca é vinculante e passa por revisão humana; stakes = custo de oportunidade, não ação automática (AI-SPEC §1b) |
| SQL injection no insert de `diagnosticos` | Tampering | Drizzle parametriza; nunca string-concat de SQL (padrão do projeto) |
| FK forjada — `campanhaId` inexistente no `formData` | Tampering | `campanhaExists`/select da campanha **antes** do insert + `isForeignKeyViolation` backstop (molde `lead-actions.ts`/`campanha-actions.ts`) |
| Custo descontrolado / DoS de carteira | Denial of Service | `maxUses: 6` + `maxOutputTokens` + `effort: 'low'` + sem cache mas **botão manual, 1 usuário**; `maxDuration: 120`; tokens/buscas persistidos e exibidos (DIAGNOSTICO-10) |
| Objeto malformado renderizado como diagnóstico válido | Tampering / Repudiation | `NoObjectGeneratedError` → `status: 'falhou'`, nunca render; re-validação na leitura do DB (Pitfall 11) |
| Fonte fabricada passando como verdadeira | Repudiation | gate lê `result.sources` (o que a tool retornou), não o que o modelo escreveu; cross-check derruba `fonte_url` ausente de `sources` (AI-SPEC §6 FM2) |
| Log com segredo | Information Disclosure | logar só `campanhaId`/`tentativa`/`finishReason`/`usage`/`cause`; revisar que nenhum `console.*` imprime `process.env` ou o objeto de request completo |

**`security_block_on: high`:** os itens acima são todos mitigáveis com controles padrão já no molde do projeto + 2 controles novos pequenos (`import "server-only"`, `urlSegura()`). Nenhum bloqueador de arquitetura. O planner deve criar tasks explícitas para: (1) `import "server-only"`, (2) `urlSegura()` em todo render de URL, (3) checkpoint de pacote, (4) checkpoint de setup da API key/Console.

---

## Sources

### Primary (HIGH confidence)
- **Codebase** (lido nesta sessão): `src/db/schema.ts`, `scripts/migrate-campanhas.cjs`, `scripts/verify-schema.cjs`, `src/actions/campanha-actions.ts`, `src/actions/lead-actions.ts` (linhas 1–90), `scripts/test-tarefa-actions.cjs`, `scripts/ts-alias-loader.mjs`, `src/app/campanhas/[id]/page.tsx`, `next.config.ts`, `src/db/client.ts`, `src/lib/validations.ts` (1–60), `package.json`, `.gitignore`, `.planning/config.json`
- **ai-sdk.dev/docs/ai-sdk-core/generating-structured-data** — `output: Output.object({ schema })` com `generateText` + `tools` + `isStepCount`; "generating structured output counts as a step" (verificado 2026-09-05)
- **ai-sdk.dev/providers/ai-sdk-providers/anthropic** — `anthropic.tools.webSearch_20250305({ maxUses, allowedDomains, blockedDomains, userLocation })`; `providerOptions.anthropic.thinking` / `effort: 'low'..'max'`; model ids incluindo `claude-sonnet-5` (verificado 2026-09-05)
- **ai-sdk.dev/docs/reference/ai-sdk-core/generate-text** — shape de `sources`: `{ sourceType: 'url', id, url, title?, providerMetadata? }` (verificado 2026-09-05)
- **ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-object-generated-error** — `NoObjectGeneratedError.isInstance(err)`; fields `text?`, `response`, `usage`, `finishReason`, `cause?` (verificado 2026-09-05)
- **platform.claude.com/docs/en/docs/about-claude/models/overview** — Claude Sonnet 5: API ID `claude-sonnet-5` (= alias, snapshot pinado), US$2/US$10 por 1M tok, adaptive thinking sempre on, default effort `high`, 1M context, 128K max output, knowledge cutoff Jan 2026 (verificado 2026-09-05)
- **npm registry** (`npm view`, 2026-09-05) — `ai@7.0.93` (mod. 2026-09-04), `@ai-sdk/anthropic@4.0.49`, peer `zod ^3.25.76 || ^4.1.8`, repo `github.com/vercel/ai`, sem `postinstall`
- **`23-AI-SPEC.md`** §1–7 e **`23-UI-SPEC.md`** — contratos travados (framework, modelo, custo, eval, UI)

### Secondary (MEDIUM confidence)
- Web search tool pricing US$10/1000 buscas — citado no AI-SPEC (`anthropic.com/news/web-search-api`), **não re-verificado nesta sessão**
- `maxDuration` em `page.tsx` cobrindo Server Action longa no Next 16 — comportamento assumido do App Router, planner confirma nas docs do Next no plano

### Tertiary (LOW confidence)
- Nome exato do campo da query em `step.toolCalls[].input` (`.query`?) — inferido; inspecionar na Onda 1
- Repasse de `providerOptions.anthropic.effort` pelo `@ai-sdk/anthropic@4.0.49` especificamente — docs confirmam a opção, não a versão do provider

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — 2 pacotes, versões verificadas no npm, API verificada em ai-sdk.dev na mesma data
- Architecture / codebase wiring: **HIGH** — todos os padrões (migração, action, harness) lidos direto nos arquivos-molde do repo
- Model behavior (Sonnet 5 adaptive thinking / effort / temperature dentro do AI SDK): **MEDIUM** — a existência das features está confirmada nas docs oficiais; o comportamento exato dentro do provider `@4.0.49` precisa de um spike na Onda 1
- Pitfalls: **HIGH** para os do AI-SPEC (verificados); **MEDIUM** para o Pitfall 9 (novo, derivado das specs do Sonnet 5)
- Security: **HIGH** — controles padrão do projeto + 2 pequenos novos, nenhum bloqueador

**Research date:** 2026-09-05
**Valid until:** ~2026-10-05 para o codebase; ~2026-09-20 para a API do AI SDK (linha 7.x em movimento — reconfirmar `Output`/`sources`/`webSearch_*` se o plano demorar) 
