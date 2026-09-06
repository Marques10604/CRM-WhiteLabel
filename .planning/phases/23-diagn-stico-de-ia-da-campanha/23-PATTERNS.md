# Phase 23: Diagnóstico de IA da Campanha - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 20 (13 novos + 7 modificados/estendidos; conta os 6 componentes de UI + os 3 módulos `src/lib/ai/` como itens)
**Analogs found:** 17 / 20 com analog forte no repo; 3 sem analog direto (primeira integração de IA)

> Toda a prosa em PT-BR (regra dura do projeto). Este doc é consumido pelo `gsd-planner` — cada seção "Pattern Assignments" aponta arquivo-molde + linhas para o executor copiar, não parafrasear.

---

## File Classification

| Novo/Modificado | Papel | Fluxo de dados | Analog mais próximo | Qualidade do match |
|-----------------|-------|----------------|---------------------|--------------------|
| `src/lib/ai/diagnostico-schema.ts` | model / validation (contrato Zod + helpers puros) | transform | `src/lib/validations.ts` | role-match (idioma Zod; sem `.refine`+enum combinados no repo hoje) |
| `src/lib/ai/diagnostico-prompt.ts` | config / constants | transform | `src/lib/whatsapp.ts` (`renderTemplate`) | partial (string builder; conteúdo é novo) |
| `src/lib/ai/gerar-diagnostico.ts` | service (chamada a API externa + validação + gate) | request-response (single-shot + tool loop) | — (nenhuma dep de IA no repo) | **no analog** — usar `23-RESEARCH.md` §Code Examples |
| `src/actions/diagnostico-actions.ts` (ou `src/app/campanhas/[id]/actions.ts`) | controller (Server Action) | request-response / CRUD (INSERT append-only) | `src/actions/campanha-actions.ts` | **exact** |
| `scripts/migrate-diagnosticos.cjs` | migration | batch / file-I/O (DDL idempotente) | `scripts/migrate-campanhas.cjs` + `scripts/migrate-tarefas.cjs` | **exact** |
| `scripts/test-diagnostico-estrutural.cjs` | test (harness estrutural) | batch (asserções sobre fixtures) | `scripts/test-tarefa-actions.cjs` (bootstrap) | role-match (bootstrap exact; alvo é schema-sobre-fixtures, não actions) |
| `scripts/eval-diagnostico.mjs` | test / eval (API real, LLM-judge, on-demand) | request-response | `scripts/test-tarefa-actions.cjs` + `scripts/ts-alias-loader.mjs` (só o bootstrap) | **no analog** para o corpo (judge) — bootstrap é role-match |
| `test/fixtures/diagnostico/*.json` | test fixtures | — | — (não há `test/fixtures/` hoje) | **no analog** — forma vem de `diagnosticoSchema` (AI-SPEC §4b) |
| `src/components/diagnostico-secao.tsx` (Server) | component (decide vazio/resultado/erro) | request-response (query no DB) | `src/app/campanhas/[id]/page.tsx` + `src/components/campanha-list.tsx` (estado vazio) | role-match |
| `src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx` (Client) | component | event-driven (`useActionState`) | `src/components/campanha-form-dialog.tsx` + `src/components/lixeira-table.tsx` | role-match (sem react-hook-form aqui) |
| `src/components/diagnostico-resultado.tsx` (Server) | component (render do objeto) | transform | `src/app/campanhas/[id]/page.tsx` (`<dl>` em `rounded-lg border bg-card p-4`) | role-match |
| `src/components/achado-tipo-badge.tsx` (Server) | component (badge `LABEL`/`TOKEN`/`ICON`) | transform | `src/components/campanha-estado-badge.tsx` / `src/components/etapa-badge.tsx` | **exact** |
| `src/components/veredito-sugerido-chip.tsx` (Server) | component (chip) | transform | `src/components/campanha-estado-badge.tsx` | **exact** |
| `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx` (Client) | component (textarea editável + copiar) | event-driven | `src/components/whatsapp-preview-dialog.tsx` (textarea com valor vivo) | role-match (clipboard é novo) |
| `src/db/schema.ts` (mod) | model (tabela Drizzle) | — | tabela `campanhas` (linhas 108-133) + `configuracoes.sequenciaIntervalosDias` (linhas 308-311, `mode:"json"`) | **exact** |
| `src/app/campanhas/[id]/page.tsx` (mod) | route (Server Component) | request-response | ele mesmo (append de seção — já previsto no doc-comment linhas 9-13) | **exact** (self) |
| `scripts/verify-schema.cjs` (mod) | config / test-gate | batch | bloco `REQUIRED_CAMPANHAS_COLUMNS` (linhas 114-148) | **exact** |
| `package.json` (mod) | config | — | entradas `migrate:campanhas` / `test:tarefa-actions` (linhas 13, 27) | **exact** |

---

## Pattern Assignments

### `src/actions/diagnostico-actions.ts` (controller / Server Action)

**Analog:** `src/actions/campanha-actions.ts` (todo o arquivo — 131 linhas)

**Cabeçalho + imports** (`campanha-actions.ts:1-23`):
```ts
"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { campanhas, nichos } from "@/db/schema";
import { campanhaSchema, campanhaUpdateSchema } from "@/lib/validations";
import type { Campanha } from "@/types";
```
→ Para o diagnóstico: trocar imports por `{ campanhas, diagnosticos }`, `{ gerarDiagnostico, DiagnosticoSemFonteError } from "@/lib/ai/gerar-diagnostico"`, `{ diagnosticoSchema } from "@/lib/ai/diagnostico-schema"`.

**Helper `isForeignKeyViolation`** — copiar VERBATIM (`campanha-actions.ts:30-37`), NÃO importar (o projeto duplica esse helper em cada arquivo de actions — precedente aceito, RESEARCH §Project Constraints):
```ts
function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  );
}
```

**`safeParse` ANTES de qualquer acesso ao banco** (`campanha-actions.ts:59-62`):
```ts
const parsed = campanhaSchema.safeParse(Object.fromEntries(formData));
if (!parsed.success) {
  return { errors: parsed.error.flatten().fieldErrors };
}
```
→ Diagnóstico: input é só `campanhaId`. Usar o mesmo idioma de coerção de `src/lib/validations.ts:110-113`: `z.coerce.number().int().positive()`. **Divergência de shape consciente** (RESEARCH Open Question 3): a action de diagnóstico retorna `{ success: true; diagnosticoId: number } | { success: false; erro: string } | undefined` (erro operacional único), NÃO o `{ errors: Record<string,string[]> }` do projeto (que é para erros de campo — o diagnóstico não tem campos).

**Guarda de FK forjada — SELECT da entidade antes do write** (`campanha-actions.ts:45-48` é o `nichoExists`; `campanha-actions.ts:64-66` o uso):
```ts
async function nichoExists(nichoId: number): Promise<boolean> {
  const existing = await db.select({ id: nichos.id }).from(nichos).where(eq(nichos.id, nichoId));
  return existing.length > 0;
}
// ...
if (!(await nichoExists(parsed.data.nichoId))) {
  return { errors: { nichoId: ["Selecione um nicho."] } };
}
```
→ Diagnóstico: `SELECT` da campanha (id + `oferta` + `metaConversao` + `janelaInicio`/`janelaFim` + `nichoId`, com `leftJoin(nichos)` para o `nicho.nome` — molde `campanhas/[id]/page.tsx:31-35`). Se `!campanha` ou `campanha.deletedAt` → `{ success: false, erro: "Campanha não encontrada." }`.

**Backstop de FK no catch do insert** (`campanha-actions.ts:69-79`):
```ts
try {
  [inserted] = await db.insert(campanhas).values(parsed.data).returning();
} catch (err) {
  if (isForeignKeyViolation(err)) {
    return { errors: { nichoId: ["Selecione um nicho."] } };
  }
  throw err;
}
```

**`revalidatePath` helper** (`campanha-actions.ts:50-53`):
```ts
function revalidateCampanhaRoutes(id?: number) {
  revalidatePath("/campanhas");
  if (id) revalidatePath(`/campanhas/${id}`);
}
```
→ Diagnóstico: `revalidatePath(`/campanhas/${campanhaId}`)` após INSERT, **tanto no sucesso quanto na falha** (a linha `status:'falhou'` é evento visível — DIAGNOSTICO-10).

**Fluxo específico do diagnóstico (NÃO no analog — vem de `23-RESEARCH.md` §Architecture Patterns Pattern 3, linhas 317-366):**
```ts
try {
  const r = await gerarDiagnostico({ nicho, oferta, janelaDias, meta });
  const [row] = await db.insert(diagnosticos).values({
    campanhaId, payload: r.diagnostico, fontes: r.fontes, buscas: r.buscas,
    status: "ok", inputTokens: r.uso.inputTokens, outputTokens: r.uso.outputTokens,
  }).returning({ id: diagnosticos.id });
  revalidatePath(`/campanhas/${campanhaId}`);
  return { success: true, diagnosticoId: row.id };
} catch (err) {
  if (isForeignKeyViolation(err)) return { success: false, erro: "Campanha não encontrada." };
  const erro = err instanceof Error ? err.message : "Falha desconhecida.";
  // GRAVA a linha 'falhou' ANTES de retornar — nunca um resultado falso (DIAGNOSTICO-02)
  await db.insert(diagnosticos).values({ campanhaId, status: "falhou", erro });
  revalidatePath(`/campanhas/${campanhaId}`);
  return { success: false, erro };
}
```
`payload` vai como objeto JS — Drizzle serializa (`mode:"json"`). Ao LER de volta, re-rodar `diagnosticoSchema.safeParse(row.payload)` (fronteira de confiança do DB — Pitfall 11).

**Localização do arquivo** (RESEARCH Open Question 3, para o planner decidir explicitamente): o projeto tem tudo em `src/actions/*.ts` e os `test-*-actions.cjs` importam de lá; o UI-SPEC pediu `src/app/campanhas/[id]/actions.ts` co-locado. Recomendação da pesquisa: `src/actions/diagnostico-actions.ts`. O `ts-alias-loader.mjs` resolve `@/app/...` e `@/actions/...` igual — decisão de organização, não técnica.

---

### `scripts/migrate-diagnosticos.cjs` (migration)

**Analog:** `scripts/migrate-campanhas.cjs` (175 linhas) — cópia BLOCO-A-BLOCO. Também `scripts/migrate-tarefas.cjs` para o caso "tabela nova, sem ALTER em `leads`" (mais próximo: `diagnosticos` não adiciona coluna a `leads`).

**NUNCA `drizzle-kit push`/`generate`** — dois incidentes destrutivos documentados (Fases 06-01/07-01); snapshot do drizzle-kit divergente desde a Fase 4 (`migrate-campanhas.cjs:5-9`, `schema.ts:100-103`).

**Bloco 1 — `"use strict"` + resolução de `DB_PATH`** (`migrate-campanhas.cjs:16-27`):
```js
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");
function fail(message) {
  console.error(`[migrate-diagnosticos] FALHOU: ${message}`);
  process.exit(1);
}
```

**Bloco 2 — BACKUP com `wal_checkpoint(TRUNCATE)` ANTES de qualquer escrita** (`migrate-campanhas.cjs:29-41`) — copiar VERBATIM, trocando só o prefixo do log. `src/db/client.ts` roda em `journal_mode=WAL`, então checkpoint antes da `copyFileSync`.

**Bloco 3 — contagem-testemunha de não-regressão** (`migrate-campanhas.cjs:45-47`):
```js
const beforeCampanhas = db.prepare("SELECT count(*) AS c FROM campanhas").get().c;
```
→ Usar `campanhas` (ou `leads`) como testemunha — a migração de `diagnosticos` não pode tocar nenhuma linha existente.

**Bloco 4 — `CREATE TABLE` idempotente com guarda via `sqlite_master`** (`migrate-campanhas.cjs:49-75`). DDL bruto proposto (RESEARCH Pattern 1, linhas 253-273):
```js
const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='diagnosticos'").get();
if (!exists) {
  db.exec(
    "CREATE TABLE diagnosticos (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "campanha_id INTEGER NOT NULL REFERENCES campanhas(id), " +
      "payload TEXT, " +           // JSON do objeto validado; NULL quando status='falhou'
      "fontes TEXT, " +            // JSON [{url,title}]
      "buscas TEXT, " +            // JSON string[] (queries de onStepFinish)
      "status TEXT NOT NULL, " +   // 'ok' | 'falhou'
      "erro TEXT, " +              // nullable
      "input_tokens INTEGER, " +
      "output_tokens INTEGER, " +
      "criado_em INTEGER NOT NULL DEFAULT (unixepoch())" +
      ");"
  );
  db.exec("CREATE INDEX diagnosticos_campanha_id_idx ON diagnosticos (campanha_id);");
  db.exec("CREATE INDEX diagnosticos_criado_em_idx ON diagnosticos (criado_em);");
  db.exec("CREATE INDEX diagnosticos_status_idx ON diagnosticos (status);");
}
```
**Decisão travada (RESEARCH Open Question 2 / A4):** `criado_em` é `INTEGER ... DEFAULT (unixepoch())`, **NÃO** ISO string. O AI-SPEC §4 diz "ISO string, padrão do projeto" mas isso está errado — todo timestamp do `schema.ts` é `integer({ mode: "timestamp" })` + `unixepoch()` (ver `campanhas.createdAt` em `schema.ts:125`, `tarefas` em `schema.ts:260`).

**Bloco 5 — VERIFICAÇÃO PÓS-MIGRAÇÃO** (`migrate-campanhas.cjs:103-171`): contagem-testemunha inalterada; `EXPECTED_COLUMNS` como conjunto estrito + `extraCols.length === 0`; os 3 índices presentes via `sqlite_master`; `PRAGMA foreign_key_list(diagnosticos)` contém FK `campanha_id → campanhas`. `db.close(); process.exit(0)`.

**Schema Drizzle correspondente** — ver seção `src/db/schema.ts` abaixo. `onDelete: "restrict"` na FK (RESEARCH linha 298 — campanha nunca é hard-deletada; mesmo raciocínio de `interacoes.leadId` em `schema.ts:216`).

**`diagnosticos` NÃO entra na ALLOWLIST de `guard-no-hard-delete.cjs`** (append-only, sem `deletedAt`, nunca há `DELETE FROM diagnosticos`). O harness não pode usar `DELETE FROM` para limpar estado (RESEARCH linha 299) — usar temp DB / ids únicos.

**Rodar de verdade 2x contra `data/crm.db`** dentro da Onda 0 (idempotência), como Fases 12/15/22.

---

### `src/db/schema.ts` (modificado — nova tabela `diagnosticos`)

**Analog:** tabela `campanhas` (`schema.ts:108-133`) para a estrutura geral + `configuracoes.sequenciaIntervalosDias` (`schema.ts:308-311`) para as colunas JSON.

**Idioma de coluna JSON** (`schema.ts:308-311`):
```ts
sequenciaIntervalosDias: text("sequencia_intervalos_dias", { mode: "json" })
  .$type<number[]>()
  .notNull()
  .default(sql`'[4,10,20]'`),
```

**Idioma de FK + índices** (`schema.ts:112-133`):
```ts
nichoId: integer("nicho_id").notNull().references(() => nichos.id, { onDelete: "restrict" }),
// ...
(table) => [
  index("campanhas_nicho_id_idx").on(table.nichoId),
  index("campanhas_deleted_at_idx").on(table.deletedAt),
  index("campanhas_estado_idx").on(table.estado),
]
```

**Tabela `diagnosticos` a acrescentar** (declarar DEPOIS de `campanhas`, ANTES de `leads` não é obrigatório — não há FK de `leads` para `diagnosticos`; mas declarar logo após `campanhas` por proximidade) — RESEARCH linhas 281-296:
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
**Cuidado com o import de tipo:** `.$type<Diagnostico>()` importa de `@/lib/ai/diagnostico-schema`. Confirmar que esse import é type-only (`import type`) para não puxar efeito colateral para o `schema.ts` (que é importado por tudo). O `diagnostico-schema.ts` já é sem efeito colateral por design (Pitfall 10), então mesmo um import de valor seria seguro — mas `import type` é o correto.

**Doc-comment obrigatório** no estilo dos vizinhos (`schema.ts:76-107` para `campanhas`): explicar append-only, sem `deletedAt`, migração só via `.cjs`, `onDelete: "restrict"`.

---

### `scripts/verify-schema.cjs` (modificado — bloco `REQUIRED_DIAGNOSTICOS_COLUMNS`)

**Analog:** bloco `REQUIRED_CAMPANHAS_COLUMNS` (`verify-schema.cjs:114-148`) — molde EXATO.

**3 edições:**

1. `requiredTables` (`verify-schema.cjs:29`): acrescentar `"diagnosticos"`.
2. `requiredIndexes` (`verify-schema.cjs:30-40`): acrescentar `"diagnosticos_campanha_id_idx"`, `"diagnosticos_criado_em_idx"`, `"diagnosticos_status_idx"`.
3. Novo bloco (copiar `verify-schema.cjs:114-148`, trocar `campanhas`→`diagnosticos`):
```js
const REQUIRED_DIAGNOSTICOS_COLUMNS = [
  "id", "campanha_id", "payload", "fontes", "buscas",
  "status", "erro", "input_tokens", "output_tokens", "criado_em",
];

if (tableNames.has("diagnosticos")) {
  const diagnosticosColumns = db.prepare("PRAGMA table_info(diagnosticos)").all().map((c) => c.name);
  const columnSet = new Set(diagnosticosColumns);
  const requiredSet = new Set(REQUIRED_DIAGNOSTICOS_COLUMNS);
  const missingColumns = REQUIRED_DIAGNOSTICOS_COLUMNS.filter((c) => !columnSet.has(c));
  const extraColumns = diagnosticosColumns.filter((c) => !requiredSet.has(c));
  if (missingColumns.length > 0 || extraColumns.length > 0) {
    fail(`colunas de 'diagnosticos' divergentes — faltando: [${missingColumns.join(", ")}], extras: [${extraColumns.join(", ")}]`);
  }
}
```
4. Atualizar o `console.log` final (`verify-schema.cjs:180-183`).

**Mutação provada obrigatória** (precedente 12-01, RESEARCH linha 313): o gate `verify:schema` DEVE falhar se a tabela/coluna não existir — provar rodando antes da migração (falha) e depois (passa).

---

### `src/lib/ai/diagnostico-schema.ts` (model / contrato Zod + helpers puros)

**Analog:** `src/lib/validations.ts` para o idioma Zod do projeto. Match parcial — o repo não combina `.refine()` + `z.enum` + arrays `.min/.max` num schema tão grande hoje.

**Idioma Zod do projeto** (`validations.ts:100-113`, `307-327`):
```ts
nichoId: z.coerce.number().int().positive("Selecione um nicho."),
oferta: z.string().trim().min(1, "Descreva a oferta."),
// ...
export const campanhaSchema = campanhaBaseSchema.refine(
  (d) => d.janelaFim > d.janelaInicio,
  { path: ["janelaFim"], message: CAMPANHA_JANELA_INVALIDA_MSG }
);
export type CampanhaFormValues = z.input<typeof campanhaSchema>;
```
→ Convenções a herdar: mensagens de erro literais em PT-BR; `export type X = z.infer<...>` logo abaixo do schema; constantes de mensagem compartilhadas em `const NOME_MSG = "..."` (ex: `validations.ts:116-117`, `291-295`).

**Corpo do schema:** copiar VERBATIM de `23-AI-SPEC.md` §4b (linhas 286-338) — já está verificado e correto (`z.object`, `z.enum(['dado_quantificavel','alegacao_marketing'])`, `.min(1).max(3)`, `.refine((d) => d.gatilhos_dor.filter((g) => g.mais_forte).length === 1, ...)`).

**Helpers de gate puros** — copiar de `23-RESEARCH.md` linhas 600-612:
```ts
export function filtrarFontes(sources: { sourceType: string; url?: string; title?: string }[]): { url: string; title?: string }[] {
  return sources
    .filter((s) => s.sourceType === "url" && typeof s.url === "string")
    .map((s) => ({ url: s.url as string, title: s.title }));
}
export function urlSegura(u: string): boolean {
  try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; }
  catch { return false; }
}
// + assertTemFonte(fontes): lança se fontes.length === 0
```

**RESTRIÇÃO DURA (Pitfall 10, RESEARCH linhas 500-502 / 754):** este arquivo só pode `import { z } from "zod"`. ZERO `import "server-only"`, ZERO `import ... from "ai"` / `@ai-sdk/anthropic`, ZERO `import { db } from "@/db/client"` (direto ou transitivo). Senão `scripts/test-diagnostico-estrutural.cjs` explode (`server-only` lança fora do bundler; `@/db/client` abre `data/crm.db` real). A função `gerarDiagnostico` (que importa o SDK + `server-only`) fica em arquivo separado.

---

### `src/lib/ai/diagnostico-prompt.ts` (config / constants)

**Analog:** `src/lib/whatsapp.ts` (`renderTemplate` — string builder puro). Match fraco — o conteúdo (rubrica anti-genérico) é 100% novo, vem de `23-AI-SPEC.md` §1b (tabela de rubrica) + §4b "Prompt Engineering Discipline" (linhas 384-389).

**Forma:**
```ts
export const SYSTEM_PROMPT = `...`;  // fixo, versionado no repo — papel + rubrica anti-genérico + contrato dado_quantificavel vs alegacao_marketing + "nunca invente URL" + "responda só com o objeto" + 1 few-shot inline (achado bom vs ruim) + regra "exatamente 1 gatilho mais_forte" repetida em texto (o .refine não vai pro modelo — Pitfall 5)
export function montarUserPrompt(input: { nicho: string; oferta: string; janelaDias: number; meta: string }): string { ... }
```
Sem efeito colateral de import aqui também (só strings) — mas o harness estrutural não precisa importar este arquivo.

---

### `src/lib/ai/gerar-diagnostico.ts` (service — SEM ANALOG no repo)

**Nenhum analog** — primeira dependência de IA do projeto. Usar `23-RESEARCH.md` §Code Examples (linhas 513-591) VERBATIM como ponto de partida — já é código verificado contra ai-sdk.dev em 2026-09-05.

**Pontos travados:**
- `import "server-only";` na 1ª linha (Pitfall 6 — vaza `ANTHROPIC_API_KEY` senão).
- `import { generateText, Output, NoObjectGeneratedError, isStepCount } from "ai";` + `import { anthropic } from "@ai-sdk/anthropic";`
- `generateText({ ..., output: Output.object({ schema: diagnosticoSchema }) })` — NÃO `generateObject` (não aceita `tools` — Pitfall 1).
- `model: anthropic("claude-sonnet-5")` — ID = alias = snapshot pinado, não existe forma datada (RESEARCH State of the Art).
- `stopWhen: isStepCount(10)` (folga — o passo do objeto conta como step — Pitfall 2).
- `tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 6, userLocation: { type: "approximate", country: "BR" } }) }`.
- Gate DIAGNOSTICO-02: `const fontes = filtrarFontes(res.sources); if (fontes.length === 0) throw new DiagnosticoSemFonteError();` — lê `res.sources`, NUNCA as URLs que o modelo escreveu no objeto (Pitfall 3).
- Loop manual de `MAX_TENTATIVAS = 2` (só schema-fail e zero-fontes; `maxRetries: 2` cobre só transporte).
- `onStepFinish` acumula as queries em `buscas: string[]` (DIAGNOSTICO-10).
- Retorna `{ diagnostico: res.output, fontes, uso: { inputTokens, outputTokens }, buscas }`. DB-free — a Server Action persiste.
- `export class DiagnosticoSemFonteError extends Error {}` + `DiagnosticoInvalidoError`.

**Open Question 1 (RESEARCH linhas 657-660) — spike obrigatório na Onda 1:** `maxOutputTokens` (o AI-SPEC diz 6000, a pesquisa recomenda 12000-16000 por causa do adaptive thinking do Sonnet 5), `providerOptions: { anthropic: { effort: "low" } }`, se `temperature: 0.3` é honrado. Primeira task da Onda 1 = 1 chamada real com log completo de `usage`/`finishReason`/`steps`, ajustar e documentar como decisão da fase.

---

### `src/components/achado-tipo-badge.tsx` + `src/components/veredito-sugerido-chip.tsx` (Server components — badge)

**Analog:** `src/components/campanha-estado-badge.tsx` (41 linhas) — molde EXATO. Também `src/components/etapa-badge.tsx`.

**Idioma completo** (`campanha-estado-badge.tsx:1-40`):
```ts
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Campanha } from "@/types";

const ESTADO_LABEL: Record<CampanhaEstado, string> = {
  explorando: "Explorando",
  // ...
};
const ESTADO_TOKEN: Record<CampanhaEstado, string> = {
  explorando: "bg-status-info text-status-info-foreground",
  // ...
};

export function CampanhaEstadoBadge({ estado }: { estado: CampanhaEstado }) {
  return (
    <Badge variant="outline" className={cn("border-transparent shrink-0", ESTADO_TOKEN[estado])}>
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}
```

**`AchadoTipoBadge`** — mapas de `23-UI-SPEC.md` §Color (linhas 121-124). Precisa de um 3º mapa `ICON` (`Hash` / `Megaphone` de `lucide-react`) — o analog não tem ícone, mas é a mesma técnica de `Record<K, ...>`:
```ts
const TIPO_LABEL = { dado_quantificavel: "Dado quantificável", alegacao_marketing: "Alegação de concorrente" };
const TIPO_TOKEN = { dado_quantificavel: "bg-status-info text-status-info-foreground", alegacao_marketing: "bg-status-warning text-status-warning-foreground" };
const TIPO_ICON = { dado_quantificavel: Hash, alegacao_marketing: Megaphone };
```
Tipo da chave vem do enum do schema: `Diagnostico["achados"][number]["tipo"]` (mesmo idioma `export type CampanhaEstado = Campanha["estado"]` em `campanha-estado-badge.tsx:5`).

**`VereditoSugeridoChip`** — mapas de `23-UI-SPEC.md` (linhas 128-132): `aprofundar`/`mudar_angulo`/`abandonar` → `bg-status-success`/`bg-status-warning`/`bg-status-danger`. Sempre dentro de um bloco rotulado "Sugestão da IA (não vinculante)" (copy VERBATIM de `23-UI-SPEC.md` linha 170).

---

### `src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx` (Client component)

**Analog primário:** `src/components/campanha-form-dialog.tsx` para `useActionState` + `startTransition` + toast sonner + `useEffect` reagindo a `state`. **Analog secundário:** `src/components/lixeira-table.tsx:46,63-69` para `useTransition` com pending inline por-item.

**`useActionState` + tipo de estado** (`campanha-form-dialog.tsx:41-44,133-136`):
```ts
type ActionState =
  | { success: true; campanha?: Campanha }
  | { errors: Record<string, string[] | undefined> }
  | undefined;

const [state, formAction, pending] = useActionState<ActionState, FormData>(createCampanha, undefined);
```
→ Diagnóstico: `type DiagnosticoActionState = { success: true; diagnosticoId: number } | { success: false; erro: string } | undefined;`

**Submit dentro de `startTransition` (React 19 exige)** (`campanha-form-dialog.tsx:180-188`):
```ts
function onSubmit() {
  if (!formRef.current) return;
  const formData = new FormData(formRef.current);
  startTransition(() => {
    formAction(formData);
  });
}
```
→ Diagnóstico: o "form" é só um `<input type="hidden" name="campanhaId">` + o botão; ou `formAction.bind(null, campanhaId)`. Sem react-hook-form (não há campos editáveis).

**`useEffect` reagindo ao resultado + toast** (`campanha-form-dialog.tsx:151-160`):
```ts
useEffect(() => {
  if (state && "success" in state && state.success) {
    toast.success("Campanha criada.");
    // ...
  } else if (state && "errors" in state) {
    toast.error("Não foi possível criar a campanha. Tente novamente.");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [state]);
```
→ Diagnóstico: toast "Diagnóstico gerado." no sucesso / "A geração falhou. Veja o motivo abaixo." na falha (copy VERBATIM de `23-UI-SPEC.md` linhas 156-157). No sucesso, `scrollIntoView` / mover foco para o `<h2>` "Diagnóstico de IA" (UI-SPEC estado 9).

**Botão disabled + label de pending** (`campanha-form-dialog.tsx:290-292`):
```tsx
<Button type="submit" disabled={pending}>
  {pending ? "Salvando..." : "Salvar"}
</Button>
```
→ Diagnóstico: `{pending ? "Gerando diagnóstico…" : (jaExiste ? "Gerar novo diagnóstico" : "Gerar diagnóstico")}` + `<Loader2 className="animate-spin" />` quando pending. Variante: `default` (primário `bg-primary`) quando NÃO há diagnóstico; `variant="outline"` quando há (UI-SPEC §Color, estado 2).

**Linhas de busca ao vivo:** `onStepFinish` no server empurra as queries; o client as recebe via um mecanismo de progresso (state local) e renderiza `font-mono text-xs text-muted-foreground`, prefixo "buscando: " (UI-SPEC estado 3). Sem `<Progress>` — não há primitivo e a duração é indeterminada.

---

### `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx` (Client component — textarea + copiar)

**Analog:** `src/components/whatsapp-preview-dialog.tsx` para o textarea de valor VIVO (`whatsapp-preview-dialog.tsx:70-71,162-167`):
```tsx
const [texto, setTexto] = useState("");
// ...
<Textarea id="whatsapp-texto" className="min-h-32" value={texto} onChange={(event) => setTexto(event.target.value)} />
```
CRÍTICO (mesmo idioma do analog, `whatsapp-preview-dialog.tsx:118-124`): o botão "Copiar mensagem" copia o valor **vivo** do state, nunca o `rascunho_primeira_mensagem` original memoizado.

**Sem analog para o clipboard** (grep: nenhum `navigator.clipboard` em `src/`). Padrão novo mínimo:
```tsx
const [copiado, setCopiado] = useState(false);
async function copiar() {
  await navigator.clipboard.writeText(texto);
  setCopiado(true);
  setTimeout(() => setCopiado(false), 2000);
}
// <Button variant="outline" onClick={copiar}>{copiado ? "Copiado" : "Copiar mensagem"}</Button>
```
`<Textarea>` com `defaultValue={rascunho}` (não controlado) OU `value`+`onChange` (controlado, como o analog). Nota fixa abaixo: "Rascunho editável. Nunca enviado pelo sistema — copie e use à mão. As edições não são salvas." (VERBATIM, UI-SPEC linha 168). Sem botão "Salvar".

---

### `src/components/diagnostico-secao.tsx` + `src/components/diagnostico-resultado.tsx` (Server components)

**Analog:** `src/app/campanhas/[id]/page.tsx` (67 linhas) para a query no DB + guarda + layout `<dl>`.

**Query + guarda** (`campanhas/[id]/page.tsx:31-41`):
```ts
const [row] = await db
  .select({ campanha: campanhas, nichoNome: nichos.nome })
  .from(campanhas)
  .leftJoin(nichos, eq(campanhas.nichoId, nichos.id))
  .where(eq(campanhas.id, campanhaId));
if (!row || row.campanha.deletedAt) {
  notFound();
}
```
→ `DiagnosticoSecao`: recebe `campanhaId` como prop, faz DUAS queries em `diagnosticos` (RESEARCH Open Question 5): (1) última linha `ORDER BY criado_em DESC LIMIT 1`; (2) todas as linhas da campanha `ORDER BY criado_em DESC` para o disclosure "Ver gerações anteriores (n)". Re-valida `diagnosticoSchema.safeParse(row.payload)` antes de renderizar (Pitfall 11); se falhar, tratar como `status:'falhou'`.

**Decisão vazio / resultado / erro:** idioma do ternário de `src/components/campanha-list.tsx:44-79` (empty-state vs lista). Estado vazio: `rounded-lg border border-dashed py-16 text-center` + `<h2>` + `<p className="max-w-sm text-sm text-muted-foreground">` + `<Button>` (VERBATIM de `campanha-list.tsx:44-56`).

**Layout dos blocos de resultado** (`campanhas/[id]/page.tsx:52-64`):
```tsx
<dl className="flex flex-col gap-3 rounded-lg border bg-card p-4">
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-muted-foreground">Meta de conversão</dt>
    <dd className="text-sm">{campanha.metaConversao}</dd>
  </div>
</dl>
```
→ `DiagnosticoResultado`: cada bloco (Saturação, Gatilhos, Objeções, Ticket, Achados, Rascunho, Veredito, Fontes) é um `rounded-lg border bg-card p-4`. Número-herói do índice de saturação: `text-xl font-mono tabular-nums font-semibold` (UI-SPEC §Typography). Links de fonte: `text-primary underline-offset-4 hover:underline` + `<ExternalLink>` + `target="_blank" rel="noopener noreferrer"` (idioma de `whatsapp-preview-dialog.tsx:198-200`). **Aplicar `urlSegura(url)` antes de renderizar qualquer `href`** (XSS — URL autorada pelo LLM; `z.string().url()` não basta — RESEARCH Security linha 782).

**Estado de erro:** `rounded-lg border border-destructive/50 bg-destructive/10 p-4` (UI-SPEC estado 4). Só tokens, nunca hex (regra `brand.md`; gate `verify:brand`).

**Seção anexada em `campanhas/[id]/page.tsx`:** `<DiagnosticoSecao campanhaId={campanhaId} />` como último filho do `<div className="flex flex-col gap-6">` (linha 44), depois do `<dl>`. Acrescentar `export const maxDuration = 120;` no topo da page (RESEARCH linha 618; Pitfall 7).

---

### `scripts/test-diagnostico-estrutural.cjs` (test harness)

**Analog:** `scripts/test-tarefa-actions.cjs` (319 linhas) para o bootstrap + `check()`/`process.exit`. Também `scripts/ts-alias-loader.mjs` (registro do loader).

**Bootstrap** (`test-tarefa-actions.cjs:36-59`):
```js
"use strict";
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;
function check(condition, message) {
  if (condition) { console.log(`OK ${message}`); }
  else { console.error(`FAIL ${message}`); failed++; }
}
```
**Diferença crítica:** este harness importa SÓ `@/lib/ai/diagnostico-schema` (schema puro) — **NÃO precisa** do `next-cache-stub-loader.mjs` (só necessário quando se importa um módulo `"use server"`, ver `test-tarefa-actions.cjs:44-48`). Também **não** seta `DB_FILE_NAME` nem cria temp DB — não toca banco nenhum (roda sobre fixtures JSON).

**Corpo** (RESEARCH Pattern 4, linhas 385-400): `for` sobre `test/fixtures/diagnostico/*.json` — `ok-*.json` DEVE `diagnosticoSchema.safeParse(...).success === true`; `bad-*.json` DEVE falhar. Asserções finas (RESEARCH §Validation linhas 719-723): exatamente 1 `mais_forte`; `achados.length >= 3` todos com `tipo` válido; `veredito ∈ enum`; `concorrentes_diretos` inteiro ≥ 0; `filtrarFontes([]) → []`; `assertTemFonte([])` lança; `urlSegura("javascript:...")` → false; cross-check `fonte_url` do objeto contra `_sources` da fixture.

**Encerramento** (`test-tarefa-actions.cjs:304-318`): `main().then(() => process.exit(failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); })`.

---

### `scripts/eval-diagnostico.mjs` (eval on-demand — SEM ANALOG para o corpo)

**Analog só do bootstrap:** `scripts/ts-alias-loader.mjs` register (igual aos `.cjs`, mas em `.mjs`). O corpo (chamada real à API + LLM-judge hand-rolled) não tem molde no repo.

- ESM; `register("./ts-alias-loader.mjs", pathToFileURL(...))` no topo.
- Importa `@/lib/ai/gerar-diagnostico` (pura, sem DB) + `@/lib/ai/diagnostico-schema`.
- Precisa `ANTHROPIC_API_KEY` — **fora do CI**, roda SOZINHO (host 4GB — RESEARCH linha 440).
- Roda os 3 nichos-gold (costureira→`mudar_angulo`, motoboy particular→`aprofundar`, estética→`abandonar`) + 9 casos (AI-SPEC §5 Reference Dataset, linhas 471-481).
- LLM-judge: 1 `generateText` a `claude-sonnet-5`, `temperature: 0`, rubrica das dims 3/4/6/7/8 no prompt; devolve PASS/FAIL + nota 1-5 + razão por dimensão.
- Relatório markdown datado em `test/reports/` (decisão do planner: gitignore ou não).
- `package.json`: NÃO adicionar script npm para este (não é CI) — invocado como `node scripts/eval-diagnostico.mjs`.

---

### `test/fixtures/diagnostico/*.json` (fixtures — SEM ANALOG)

Não há `test/fixtures/` no repo hoje. A forma de cada fixture = `diagnosticoSchema` (AI-SPEC §4b) + um campo extra `_sources: [{ sourceType, url, title }]` simulando `res.sources` para o cross-check. Lista mínima (RESEARCH linha 751): `ok-costureira`, `ok-motoboy`, `ok-estetica`, `bad-zero-mais-forte`, `bad-dois-mais-forte`, `bad-enum-veredito`, `bad-achados-sem-tipo`, `bad-truncado`, `adversarial-so-marketing`. Escrever à mão na Onda 0 (antes de a função existir) — os 3 gold viram também os `veredito esperado` do eval.

---

### `package.json` (modificado — scripts)

**Analog:** entradas existentes (`package.json:11-30`):
```json
"migrate:campanhas": "node scripts/migrate-campanhas.cjs",
"verify:schema": "node scripts/verify-schema.cjs",
"test:tarefa-actions": "node scripts/test-tarefa-actions.cjs",
```
**Acrescentar 2** (AI-SPEC linha 457, RESEARCH linha 752):
```json
"migrate:diagnosticos": "node scripts/migrate-diagnosticos.cjs",
"test:diagnostico-estrutural": "node scripts/test-diagnostico-estrutural.cjs"
```
`eval-diagnostico.mjs` NÃO ganha script (não é CI).

---

## Shared Patterns

### Guarda de FK forjada (`*Exists()` + `isForeignKeyViolation` backstop)
**Fonte:** `src/actions/campanha-actions.ts:30-48,64-79`
**Aplicar a:** `src/actions/diagnostico-actions.ts`
Padrão em 2 camadas: (1) `SELECT` da entidade referenciada ANTES do write (`nichoExists` → aqui, SELECT da campanha); (2) `try/catch` no insert com `if (isForeignKeyViolation(err)) return <erro amigável>; throw err;` para a janela de corrida check-then-write. O helper `isForeignKeyViolation` (6 linhas, checa `err.code === "SQLITE_CONSTRAINT_FOREIGNKEY"`) é **duplicado**, nunca importado (precedente aceito).

### `safeParse` ANTES de qualquer acesso ao banco
**Fonte:** `src/actions/campanha-actions.ts:59-62`; `src/lib/validations.ts` (todos os schemas de action)
**Aplicar a:** `src/actions/diagnostico-actions.ts` (valida `campanhaId` com `z.coerce.number().int().positive()`), `src/lib/ai/gerar-diagnostico.ts` (o `Output.object` re-valida a saída do LLM), `src/components/diagnostico-secao.tsx` (re-valida `payload` lido do DB — Pitfall 11).
Toda Server Action é um endpoint HTTP interno — valida em runtime mesmo com o TS do client garantindo a forma (`validations.ts:174-178`).

### Migração `.cjs` manual idempotente (NUNCA drizzle-kit)
**Fonte:** `scripts/migrate-campanhas.cjs` (todo) — backup c/ `wal_checkpoint(TRUNCATE)` → contagem-testemunha → `CREATE TABLE` guardado por `sqlite_master` → verificação pós (conjunto estrito de colunas + índices + `PRAGMA foreign_key_list`) → `process.exit(0)`.
**Aplicar a:** `scripts/migrate-diagnosticos.cjs`. Rodar de verdade 2x contra `data/crm.db` na Onda 0.

### Timestamps: `integer({ mode: "timestamp" })` + `default(sql`(unixepoch())`)`
**Fonte:** `src/db/schema.ts:125-126` (`campanhas`), `:260-261` (`tarefas`), `:221` (`interacoes`)
**Aplicar a:** `diagnosticos.criadoEm`. **Sobrepõe o AI-SPEC §4** que diz "ISO string" — isso está errado (RESEARCH A4). `date-fns format()` na UI espera `Date`/número, não ISO string.

### Coluna JSON: `text(col, { mode: "json" }).$type<T>()`
**Fonte:** `src/db/schema.ts:308-311` (`configuracoes.sequenciaIntervalosDias`)
**Aplicar a:** `diagnosticos.payload` / `.fontes` / `.buscas`. Drizzle serializa/desserializa; re-validar `payload` com Zod ao ler (fronteira de confiança do DB).

### Badge `LABEL` / `TOKEN` (+ `ICON`) em `Record<K, string>` separados
**Fonte:** `src/components/campanha-estado-badge.tsx:17-40`, `src/components/etapa-badge.tsx:17-44`
**Aplicar a:** `achado-tipo-badge.tsx`, `veredito-sugerido-chip.tsx`. Mapas separados para não acoplar a lista de valores à classe de cor. `<Badge variant="outline" className={cn("border-transparent", TOKEN[k])}>`. Cor SEMPRE `bg-status-*` / `text-status-*-foreground` (escala semântica D-08/Fase 19), nunca token de marca, nunca hex.

### `useActionState` + `startTransition` + toast sonner + `useEffect([state])`
**Fonte:** `src/components/campanha-form-dialog.tsx:133-160,180-188`
**Aplicar a:** `gerar-diagnostico-button.tsx`. `formAction` sempre dentro de `startTransition` (React 19). `useEffect` com `[state]` + `// eslint-disable-next-line react-hooks/exhaustive-deps` reage ao resultado (toast + foco).

### Textarea de valor vivo + link recomputado do state
**Fonte:** `src/components/whatsapp-preview-dialog.tsx:70-71,118-124,162-167`
**Aplicar a:** `rascunho-mensagem.tsx`. O "Copiar" lê o state vivo do textarea, nunca o valor original.

### Links externos
**Fonte:** `src/components/whatsapp-preview-dialog.tsx:196-201`
**Aplicar a:** todo link de fonte em `diagnostico-resultado.tsx`. `target="_blank" rel="noopener noreferrer"`. **+ novo:** `urlSegura(url)` (allowlist `http:`/`https:`) antes de montar o `href` — URL vem do LLM.

### Estado vazio nunca-silêncio (borda tracejada + título + p muted + CTA)
**Fonte:** `src/components/campanha-list.tsx:44-56`
**Aplicar a:** `diagnostico-secao.tsx` (estado sem diagnóstico). `flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center`.

### Bloco de gate estrito em `verify-schema.cjs` (conjunto exato de colunas)
**Fonte:** `scripts/verify-schema.cjs:114-148` (`REQUIRED_CAMPANHAS_COLUMNS`)
**Aplicar a:** bloco `REQUIRED_DIAGNOSTICOS_COLUMNS` — missing + extra, `fail()` se divergir. Conjunto estrito é seguro (tabela nova não acumula colunas por fase). Mutação provada obrigatória.

### Harness `.cjs`: `register(ts-alias-loader)` + `check()` + `process.exit(failed>0?1:0)`
**Fonte:** `scripts/test-tarefa-actions.cjs:36-59,304-318`; `scripts/ts-alias-loader.mjs`
**Aplicar a:** `test-diagnostico-estrutural.cjs` (sem temp DB, sem cache-stub — só importa o schema puro), `eval-diagnostico.mjs` (ESM, mesmo register).

---

## No Analog Found

| Arquivo | Papel | Fluxo | Motivo | O que o planner usa no lugar |
|---------|-------|-------|--------|------------------------------|
| `src/lib/ai/gerar-diagnostico.ts` | service | request-response | Primeira dep de IA do projeto — nenhum `generateText`/AI SDK no repo | `23-RESEARCH.md` §Code Examples (linhas 513-591, código verificado) + `23-AI-SPEC.md` §3-4 |
| `scripts/eval-diagnostico.mjs` (corpo) | eval | request-response | LLM-judge hand-rolled + chamada real à API — sem precedente | `23-AI-SPEC.md` §5 (Eval Tooling, Reference Dataset) + `23-RESEARCH.md` §Validation Architecture. Bootstrap: `ts-alias-loader.mjs` |
| `test/fixtures/diagnostico/*.json` | fixtures | — | Não existe `test/fixtures/` no repo | Forma = `diagnosticoSchema` (AI-SPEC §4b) + campo `_sources` simulado |
| `src/lib/ai/diagnostico-prompt.ts` (conteúdo) | config | transform | O string-builder tem molde fraco (`src/lib/whatsapp.ts`), mas a rubrica anti-genérico é conteúdo 100% novo | `23-AI-SPEC.md` §1b (tabela de rubrica) + §4b "Prompt Engineering Discipline" |
| Clipboard (`navigator.clipboard.writeText`) em `rascunho-mensagem.tsx` | interação | event-driven | Nenhum `navigator.clipboard` em `src/` hoje | Padrão mínimo de 6 linhas acima (state `copiado` + `setTimeout` 2s) |
| Linhas de busca ao vivo (`onStepFinish` → UI de progresso) | interação | streaming (cosmético) | Nenhum stream/progresso incremental no repo | `23-UI-SPEC.md` estado 3 + `23-RESEARCH.md` (onStepFinish → state local → linhas `font-mono text-xs`) |

---

## Metadata

**Analog search scope:** `src/actions/`, `src/components/`, `src/app/campanhas/`, `src/db/`, `src/lib/`, `scripts/`
**Files scanned:** ~28 (13 lidos por inteiro: `migrate-campanhas.cjs`, `migrate-tarefas.cjs`, `verify-schema.cjs`, `campanha-actions.ts`, `schema.ts`, `campanha-estado-badge.tsx`, `etapa-badge.tsx`, `campanha-form-dialog.tsx`, `campanha-list.tsx`, `campanhas/[id]/page.tsx`, `test-tarefa-actions.cjs`, `ts-alias-loader.mjs`, `configuracoes-form.tsx`, `whatsapp-preview-dialog.tsx`, `whatsapp-send-button.tsx`, `delete-tarefa-dialog.tsx`; + greps em `validations.ts`, `queries.ts`, `lixeira-table.tsx`)
**Pattern extraction date:** 2026-09-05
**Docs consumidos:** `23-AI-SPEC.md` (558 linhas), `23-UI-SPEC.md` (261 linhas), `23-RESEARCH.md` (828 linhas)
