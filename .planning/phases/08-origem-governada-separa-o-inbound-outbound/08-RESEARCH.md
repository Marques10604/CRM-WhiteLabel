# Phase 8: Origem Governada + Separação Inbound × Outbound - Research

**Researched:** 2026-08-06
**Domain:** Migração aditiva de coluna `NOT NULL` em SQLite via `better-sqlite3` (sem `drizzle-kit push`), backfill idempotente de dado real, extensão de contrato Zod compartilhado (formulário + import CSV)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rótulos exibidos no select de `origemTipo`**
- **D-01 `[auto]`:** Os dois valores aparecem no select como **"Inbound"** e **"Outbound"** (sem tradução para PT-BR) — mesmos termos já usados em `PROJECT.md`, `REQUIREMENTS.md` e no todo original.

**Posição e padrão técnico do campo no formulário**
- **D-02 `[auto]`:** O campo `origemTipo` entra logo **depois** do campo `origem` existente (`lead-form-dialog.tsx:244-253`), dentro do mesmo grupo visual "Contato".
- **D-03 `[auto]`:** Implementação segue **exatamente** o padrão já usado pelo campo `canal` (mesmo `Controller` + `Select`/`SelectTrigger`/`SelectContent`, `lead-form-dialog.tsx:211-242`) — array `const ORIGEM_TIPO_OPTIONS = [{value, label}, ...] as const` no mesmo estilo de `CANAL_OPTIONS`, não um componente novo.
- **D-04 `[auto]`:** O select **não vem pré-selecionado** ao criar um lead manualmente — usa placeholder, mesmo padrão de `canal`. Isso é diferente do backfill/import CSV (Requirement 2/3), que legitimamente defaultam para "outbound".

**Indicação visual adicional (fora do modal)**
- **D-05 `[auto]`:** Nenhum badge/indicador visual de `origemTipo` é adicionado ao card do pipeline ou à lista de leads nesta fase — a visibilidade exigida pelo SPEC já é satisfeita pelo modal de edição (mesmo padrão de `origem`/`canal`, que também só aparecem no modal, `lead-table-columns.tsx:65`).

### Claude's Discretion
- Mecanismo exato da migração (ALTER TABLE manual via `better-sqlite3` vs. tentar `drizzle-kit push` contra cópia de teste primeiro) — **resolvido nesta pesquisa, ver Pattern 1 abaixo**: ALTER TABLE manual é a única opção tecnicamente viável e segura dado o precedente real do projeto.
- Nome exato da variável/arquivo que guarda `ORIGEM_TIPO_OPTIONS` e se a validação Zod usa `z.enum(["inbound", "outbound"])` inline ou um tipo compartilhado — **resolvido nesta pesquisa, ver Code Examples**.
- Se o backfill roda como script standalone (`scripts/*.cjs`) ou inline na migração SQL — **resolvido nesta pesquisa**: script standalone `.cjs`, mesmo padrão de `verify-wa-contact-invariant.cjs`/`verify-pipeline-migration.cjs`.

### Deferred Ideas (OUT OF SCOPE)
- Nenhuma nova ideia de escopo surgiu na sessão de discussão — todas as áreas discutidas eram decisões de implementação dentro do domínio já travado pelo SPEC.md.
- Gate condicional Inbound × sequência de follow-up (ORIGEM-03) — Phase 10.
- Tabela `origens` governada com FK — decisão já descartada, não reaberta.
- Granularidade de origem além do binário — fora de escopo.
- Badge visual de `origemTipo` em qualquer superfície fora do modal — decisão consciente D-05, YAGNI.
- UI de reclassificação em lote (bulk edit) — fora de escopo.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| ORIGEM-01 | Admin classifica cada lead com um tipo de origem (Inbound ou Outbound) via campo dedicado (`origemTipo`, enum fechado) — sem depender do texto livre existente em `origem` | Pattern 2 (schema Drizzle + Zod), Pattern 3 (campo no formulário, espelha `canal`), Code Examples 1-2 |
| ORIGEM-02 | Leads existentes recebem uma classificação padrão via backfill explícito e documentado, ao aplicar a mudança de schema | Pattern 1 (migração ALTER TABLE + backfill idempotente), Pitfall 1 (bug do `drizzle-kit push`), Code Example 3 |
</phase_requirements>

## Summary

Esta fase não introduz nenhuma tecnologia nova ao stack — 100% recombinação de padrões já estabelecidos no próprio repositório (`stage`/`canal` como enum Drizzle `text(...).notNull()`, `contactAttempts`/`configuracoes` como precedente de migração aditiva `NOT NULL` em tabela com dado real, `csvRowSchema` derivado de `leadSchema` via `.omit()/.extend()`). A pesquisa focou em quatro perguntas técnicas concretas, todas respondidas por leitura direta do código e por um fato de SQLite verificável sem ambiguidade: (1) qual é a única forma segura de aplicar `ALTER TABLE leads ADD origem_tipo ... NOT NULL` numa tabela com 33 linhas reais, (2) se o `DEFAULT 'outbound'` físico é opcional ou obrigatório, (3) como desenhar um script de backfill idempotente dado que a coluna já nasce preenchida pelo próprio `ALTER TABLE`, e (4) como a superfície compartilhada `leadSchema`/`csvRowSchema` precisa mudar sem quebrar o import CSV nem `scripts/test-lead-actions.cjs`.

**Achado mais importante:** a pergunta "manter `DEFAULT 'outbound'` na coluna ou remover depois do backfill?" (Codex achado #4 do `08-INTENT-REVIEW.md`) **não é uma decisão de produto — é uma restrição física do SQLite**. A regra documentada do SQLite é: `ALTER TABLE ... ADD COLUMN` com `NOT NULL` só é permitido em tabela **não vazia** se a coluna tiver um `DEFAULT` constante diferente de `NULL`; e o SQLite não tem `ALTER COLUMN` para remover esse `DEFAULT` depois — a única forma de removê-lo seria reconstruir a tabela inteira (procedimento de 12 passos, nunca usado neste projeto, e arriscado dado que `leads` tem uma FK de `subnichos` apontando para ela). Logo, `origem_tipo TEXT NOT NULL DEFAULT 'outbound'` fica **permanentemente** assim no banco físico — exatamente a mesma postura já aceita e documentada em `08-SPEC.md` §Constraints para `canal`/`stage` (enum garantido só na camada de aplicação, nunca por `CHECK`). Não é uma regressão nova desta fase.

Esse mesmo fato do SQLite também resolve a pergunta sobre o mecanismo de backfill: como o `DEFAULT` já preenche retroativamente todas as linhas existentes no momento do `ALTER TABLE` (mesmo comportamento observado e verificado na Fase 06-01 para `contact_attempts DEFAULT 0` — "33/33 leads em 0" imediatamente após o `ALTER`, sem nenhum `UPDATE` adicional), o "script de backfill" desta fase é, na prática, o próprio `ALTER TABLE` — mas ele precisa ser embrulhado num script idempotente (guarda via `PRAGMA table_info` + `UPDATE ... WHERE origem_tipo IS NULL` como belt-and-suspenders) para satisfazer literalmente a Constraint de idempotência do `08-SPEC.md` e para nunca sobrescrever uma linha já reclassificada manualmente.

**Primary recommendation:** Backup de `data/crm.db` (checkpoint do WAL + cópia de arquivo) → um único script `.cjs` que (a) verifica via `PRAGMA table_info(leads)` se a coluna já existe (idempotência), (b) se não existir, aplica `ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;` direto via `better-sqlite3` (nunca `drizzle-kit push`), (c) sempre roda `UPDATE leads SET origem_tipo = 'outbound' WHERE origem_tipo IS NULL;` como guarda idempotente explícita, e (d) verifica `SELECT COUNT(*) FROM leads WHERE origem_tipo IS NULL` = 0 e a contagem total de linhas inalterada. Em paralelo: `origemTipo` vira coluna Drizzle (`text("origem_tipo", {enum:["inbound","outbound"]}).notNull().default("outbound")`, espelhando a DDL real) e campo **obrigatório sem default** em `leadSchema` (Zod) — a ausência de `.default()` no Zod é o que garante D-04 (nunca pré-selecionado no formulário manual), enquanto o `.default("outbound")` do Drizzle é só um espelho fiel do schema físico, nunca acionado pelos fluxos da aplicação porque o Zod sempre entrega o campo preenchido. `csvRowSchema` ganha um `.extend({ origemTipo: z.enum([...]).default("outbound") })` para que o import CSV nunca precise desse campo vindo do cliente.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Classificação manual de `origemTipo` (criar/editar lead) | Browser/Client (form) | API/Backend (validação autoritativa) | `lead-form-dialog.tsx` coleta a escolha; `leadSchema.safeParse` em `createLead`/`updateLead` é a fonte de verdade — mesmo padrão de `canal` |
| Default automático de `origemTipo` no import CSV | API/Backend | — | Injetado dentro de `bulkImportLeads`/`csvRowSchema` (server), nunca no client — sem novo passo de UI no wizard (decisão já travada) |
| Backfill dos 33 leads existentes | Database/Storage | — | Migração one-shot direta no SQLite (`data/crm.db`), fora do ciclo de request da aplicação, script `.cjs` standalone |
| Persistência/leitura de `origem_tipo` | Database/Storage | API/Backend | Coluna física `leads.origem_tipo`, lida via `InferSelectModel<typeof leads>` (tipo `Lead`) — nenhuma camada nova |
| Visibilidade do valor no modal de edição | Browser/Client | — | `lead-form-dialog.tsx`, mesmo padrão de exibição de `origem`/`canal` (D-05: só no modal, sem badge) |

## Standard Stack

### Core
Nenhuma dependência nova. Todas as libs abaixo já estão instaladas e em uso ativo neste repositório (confirmado via `package.json`, 2026-08-06):

| Library | Version instalada | Purpose nesta fase | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 `[VERIFIED: package.json local, já em uso]` | Definição da coluna `origemTipo` em `src/db/schema.ts` | Já é o ORM do projeto — nenhuma dependência nova |
| better-sqlite3 | 12.11.1 `[VERIFIED: package.json local, já em uso]` | Aplicação direta do `ALTER TABLE` e do backfill via script `.cjs` (bypassando `drizzle-kit push`) | Mesmo mecanismo usado nas Fases 06-01/07-01 para migrações aditivas em tabela com dado real |
| zod | 4.4.3 `[VERIFIED: package.json local, já em uso]` | Campo `origemTipo` em `leadSchema`/`csvRowSchema` | Mesmo padrão de `canal`/`stage` em `src/lib/validations.ts` |
| drizzle-kit | 0.31.10 `[VERIFIED: package.json local, já em uso]` | **NÃO usado para aplicar esta coluna** — mantido só como referência de qual DDL o projeto normalmente geraria | Ver Pitfall 1 — `push` é desaconselhado para esta migração específica |

### Supporting
Nenhuma biblioteca de suporte nova é necessária. Os primitivos de UI (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Controller`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`) já existem em `src/components/ui/` e já são usados exatamente no padrão que `origemTipo` precisa replicar (`canal`, `lead-form-dialog.tsx:211-242`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ALTER TABLE manual via `better-sqlite3` | `npx drizzle-kit push` | `push` já demonstrou, duas vezes neste projeto (Fases 06-01 e 07-01), comportamento não confiável em ambiente não-interativo com o banco real: em 06-01 o gate de segurança do `push` tratou um `DEFAULT` falsy (`0`) como "sem default" e ameaçou rodar `DELETE FROM leads` antes do `ADD COLUMN`; em 07-01 o `push` aplicou mudanças extras não previstas (drift de índice) sem pausa de confirmação real. Mesmo que `'outbound'` (string truthy) provavelmente não acione o bug específico de `0` falsy, o padrão do projeto — e a própria Constraint já travada em `08-SPEC.md` — é evitar `push` em qualquer `ALTER TABLE` sobre `leads` e aplicar a DDL manualmente |
| Coluna `origem_tipo` com `DEFAULT` físico permanente | Adicionar nullable, backfillar, depois forçar `NOT NULL` sem default | Tecnicamente impossível em SQLite sem reconstrução completa da tabela (SQLite não tem `ALTER COLUMN`) — nunca uma alternativa real, só uma leitura equivocada do problema |
| `csvRowSchema.extend({ origemTipo: z.enum([...]).default("outbound") })` | Injetar `origemTipo: "outbound"` manualmente em cada `row` dentro de `bulkImportLeads` antes do `safeParse` | Ambas funcionam; a extensão do schema é mais idiomática ao padrão já documentado de `csvRowSchema` (comentário explica por que cada campo diverge de `leadSchema`) e evita mutar objetos antes da validação |

## Package Legitimacy Audit

Não aplicável — nenhum pacote novo é instalado nesta fase. Todas as dependências usadas (`drizzle-orm`, `better-sqlite3`, `zod`) já estão em `package.json` e em uso ativo no repositório.

## Architecture Patterns

### System Architecture Diagram

```
[Admin no navegador]
        │
        ├─► Formulário de lead (lead-form-dialog.tsx)
        │      Select "origemTipo" (Controller + Select, D-01..D-04)
        │      SEM valor pré-selecionado (placeholder)
        │            │
        │            ▼
        │      FormData bruto ──► createLead / updateLead (Server Action)
        │                              │
        │                              ▼
        │                       leadSchema.safeParse
        │                       (origemTipo: z.enum([...]) OBRIGATÓRIO, sem .default())
        │                              │
        │                              ▼
        │                       db.insert/update(leads) ──► leads.origem_tipo (SQLite)
        │
        ├─► Wizard de import CSV (csv-import-wizard.tsx → csv-import-preview-table.tsx)
        │      NENHUM campo novo de UI (decisão travada)
        │            │
        │            ▼
        │      ConfirmedImportRow[] (sem origemTipo) ──► bulkImportLeads (Server Action)
        │                              │
        │                              ▼
        │                       csvRowSchema.safeParse
        │                       (origemTipo herda .default("outbound") — nunca falha por ausência)
        │                              │
        │                              ▼
        │                       tx.insert(leads).values({ ..., origemTipo: row.origemTipo })
        │
        └─► [uma vez, fora do ciclo de request] scripts/backfill-origem-tipo.cjs
               1. backup data/crm.db (checkpoint WAL + cópia)
               2. PRAGMA table_info(leads) → coluna já existe?
                    não → ALTER TABLE leads ADD origem_tipo TEXT DEFAULT 'outbound' NOT NULL
                    sim → pula (idempotência)
               3. UPDATE leads SET origem_tipo='outbound' WHERE origem_tipo IS NULL (guarda idempotente)
               4. verifica: 0 linhas NULL, 33 linhas totais, nenhuma linha "inbound" sobrescrita
```

### Recommended Project Structure
Nenhuma pasta nova — só extensão de arquivos já existentes:
```
src/
├── db/
│   └── schema.ts          # + coluna origemTipo em leads
├── lib/
│   ├── validations.ts     # + origemTipo em leadSchema; csvRowSchema ganha .extend com default
│   └── csv-import.ts      # + CSV_DEFAULTS.origemTipo (constante, documentação/import)
├── actions/
│   ├── lead-actions.ts    # nenhuma mudança de lógica — origemTipo viaja com parsed.data
│   └── import-actions.ts  # bulkImportLeads: nenhuma mudança de lógica além do insert explícito
└── components/
    └── lead-form-dialog.tsx  # + Field/Controller/Select origemTipo, ORIGEM_TIPO_OPTIONS
scripts/
├── backfill-origem-tipo.cjs        # migração + backfill idempotente (novo)
└── verify-origem-tipo-backfill.cjs # guarda pós-migração, opcional (pode ser mesclado no script acima)
```

### Pattern 1: Migração ALTER TABLE direta com DEFAULT obrigatório (não `drizzle-kit push`)
**What:** Adicionar `origem_tipo` como coluna `TEXT NOT NULL DEFAULT 'outbound'` via `ALTER TABLE` executado diretamente por `better-sqlite3`, nunca por `drizzle-kit push`/`generate`.
**When to use:** Toda vez que uma coluna `NOT NULL` precisa ser adicionada a uma tabela SQLite já populada neste projeto (mesmo padrão de `contact_attempts` na Fase 06-01).
**Por que o `DEFAULT` é obrigatório e permanente (fato de SQLite, não escolha de design):** a regra documentada do SQLite ("ALTER TABLE ADD COLUMN" restrictions) é: se a tabela não está vazia, uma coluna nova só pode ter `NOT NULL` se também tiver um `DEFAULT` constante ≠ `NULL`. `leads` tem 33 linhas — `ALTER TABLE leads ADD origem_tipo TEXT NOT NULL;` (sem `DEFAULT`) falha com erro do próprio SQLite. E como o SQLite não suporta `ALTER TABLE ... ALTER COLUMN` (só `ADD COLUMN`/`DROP COLUMN`/`RENAME`), não existe operação nativa para remover esse `DEFAULT` depois sem reconstruir a tabela inteira — o que nunca foi feito neste projeto e seria arriscado dado que `subnichos` tem uma FK apontando para `leads`... na verdade o inverso: `leads.subnicho_id` referencia `subnichos.id` com `onDelete: "restrict"`, então reconstruir `leads` exigiria recriar essa FK corretamente — risco desnecessário para esta fase.
**Example (DDL exata a aplicar):**
```sql
-- Source: mesma forma que o conversor real do drizzle-kit geraria
-- (confirmado no precedente 06-01-SUMMARY.md, "ALTER TABLE `leads` ADD `contact_attempts` integer DEFAULT 0 NOT NULL;")
ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;
```
Essa única instrução, por si só, já preenche `origem_tipo = 'outbound'` em todas as 33 linhas existentes (ativas e soft-deletadas) — comportamento do SQLite ao adicionar coluna `NOT NULL DEFAULT`, verificado empiricamente na Fase 06-01 (`select count(*) from leads` = 33, `nulos=0`, `naozero=0` imediatamente após o `ALTER`, sem nenhum `UPDATE` adicional).

### Pattern 2: Script de backfill idempotente (satisfaz a Constraint do SPEC.md literalmente)
**What:** Embrulhar o `ALTER TABLE` acima num script `.cjs` que pode ser rodado 2x sem erro e sem jamais sobrescrever uma linha já reclassificada manualmente.
**When to use:** Este script específico, uma vez, ao aplicar a mudança de schema desta fase.
**Example:**
```javascript
// scripts/backfill-origem-tipo.cjs
// Source: mesmo padrão de scripts/verify-pipeline-migration.cjs (leitura de PRAGMA
// table_info) + scripts/verify-wa-contact-invariant.cjs (guarda .cjs standalone)
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_FILE_NAME ?? path.join(__dirname, "..", "data", "crm.db");

// 1) Backup ANTES de tocar o banco (Constraint do SPEC.md) — checkpoint do WAL
//    primeiro (client.ts roda em journal_mode=WAL), senão a cópia do arquivo
//    principal pode não conter escritas recentes ainda no -wal.
const backupPath = `${DB_PATH}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
{
  const dbForCheckpoint = new Database(DB_PATH);
  dbForCheckpoint.pragma("wal_checkpoint(TRUNCATE)");
  dbForCheckpoint.close();
}
fs.copyFileSync(DB_PATH, backupPath);
console.log(`[backfill-origem-tipo] backup criado em ${backupPath}`);

const db = new Database(DB_PATH);

const before = db.prepare("SELECT count(*) AS c FROM leads").get().c;

// 2) Idempotência do ADD COLUMN: SQLite lança "duplicate column name" se
//    rodado 2x — checagem via PRAGMA table_info evita esse erro.
const hasColumn = db.prepare("PRAGMA table_info(leads)").all().some((c) => c.name === "origem_tipo");
if (!hasColumn) {
  db.exec("ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;");
  console.log("[backfill-origem-tipo] coluna origem_tipo adicionada (DEFAULT 'outbound' já backfillou todas as linhas existentes)");
} else {
  console.log("[backfill-origem-tipo] coluna origem_tipo já existe — pulando ALTER TABLE (idempotência)");
}

// 3) Guarda idempotente explícita — satisfaz a Constraint do SPEC.md
//    literalmente ("UPDATE ... WHERE origem_tipo IS NULL, nunca incondicional").
//    Na prática deve afetar 0 linhas (o DEFAULT já preencheu tudo), mas o
//    filtro garante que uma linha já reclassificada manualmente (ex.: admin
//    trocou para "inbound" via updateLead) NUNCA é tocada por um re-run.
const result = db.prepare("UPDATE leads SET origem_tipo = 'outbound' WHERE origem_tipo IS NULL").run();
console.log(`[backfill-origem-tipo] UPDATE idempotente afetou ${result.changes} linha(s) (esperado: 0 se a coluna já existia)`);

const after = db.prepare("SELECT count(*) AS c FROM leads").get().c;
const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo IS NULL").get().c;
const outboundCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo = 'outbound'").get().c;

if (before !== after) throw new Error(`contagem de linhas mudou: antes=${before} depois=${after}`);
if (nullCount !== 0) throw new Error(`${nullCount} linha(s) com origem_tipo NULL após o backfill`);

console.log(`[backfill-origem-tipo] OK: ${after} linhas totais, 0 NULL, ${outboundCount} com origem_tipo='outbound'`);
db.close();
```
**Rodar 2x:** primeira execução aplica o `ALTER TABLE` (backfill automático via `DEFAULT`) + `UPDATE` (0 linhas afetadas, já preenchido). Segunda execução: `hasColumn` é `true`, pula o `ALTER`; `UPDATE ... WHERE origem_tipo IS NULL` continua afetando 0 linhas (nenhuma ficou NULL) — nenhum erro, nenhuma sobrescrita, satisfaz a Constraint de idempotência do `08-SPEC.md` literalmente.

### Pattern 3: Campo de formulário espelhando `canal` (D-01 a D-04)
**What:** `origemTipo` no formulário segue exatamente a forma de `canal` — `Controller` + `Select`, array de opções `as const`, sem valor pré-selecionado.
**Example:**
```typescript
// Source: lead-form-dialog.tsx:55-58 (CANAL_OPTIONS, padrão a replicar)
const ORIGEM_TIPO_OPTIONS = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const;

// Posição: dentro do bloco "Contato", logo após o Field de `origem` (D-02)
<Field data-invalid={!!errors.origemTipo}>
  <FieldLabel htmlFor="origemTipo">Tipo de origem</FieldLabel>
  <FieldContent>
    <Controller
      control={form.control}
      name="origemTipo"
      render={({ field }) => (
        <Select
          name="origemTipo"
          items={ORIGEM_TIPO_OPTIONS as unknown as { value: string; label: string }[]}
          value={(field.value as string | undefined) ?? null}
          onValueChange={(value) => field.onChange(value)}
        >
          <SelectTrigger id="origemTipo" aria-invalid={!!errors.origemTipo} className="w-full">
            <SelectValue placeholder="Selecione o tipo de origem" />
          </SelectTrigger>
          <SelectContent>
            {ORIGEM_TIPO_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
    <FieldError errors={[errors.origemTipo]} />
  </FieldContent>
</Field>
```
Nos `defaultValues` do `useForm`, seguir o mesmo padrão de `canal` (`canal: lead?.canal`, sem fallback): `origemTipo: lead?.origemTipo` — `undefined` na criação (D-04, placeholder vazio), valor real na edição.

### Anti-Patterns to Avoid
- **Usar `drizzle-kit push` para este `ALTER TABLE`:** já demonstrou comportamento não confiável neste projeto duas vezes (Fases 06-01, 07-01) em ambiente não-interativo — evitar mesmo que a string `'outbound'` provavelmente não acione o bug específico de default falsy.
- **Tentar remover o `DEFAULT 'outbound'` da coluna depois do backfill:** tecnicamente impossível sem reconstruir a tabela inteira em SQLite — não é uma tarefa a colocar no plano.
- **Fazer o `UPDATE` de backfill incondicional (`UPDATE leads SET origem_tipo = 'outbound'` sem `WHERE`):** violaria a Constraint de idempotência explícita do SPEC.md — mesmo rodando só uma vez, o padrão correto é sempre `WHERE origem_tipo IS NULL`.
- **Adicionar `.default("outbound")` em `leadSchema.origemTipo` (nível Zod):** quebraria D-04 (o formulário manual precisa ficar sem seleção até o admin escolher conscientemente) — o default só pertence à camada Drizzle (mirror do schema físico) e ao `csvRowSchema` estendido (import CSV).

## Don't Hand-Roll

Não aplicável nesta fase — nenhum problema desta fase (enum fechado, migração aditiva, backfill) tem uma biblioteca de terceiros correspondente; tudo é padrão de linguagem/SQL já resolvido pelo próprio Drizzle/Zod/SQLite, seguindo os mesmos idiomas já usados no projeto.

## Runtime State Inventory

> Esta fase é uma migração de schema com backfill de dado real de produção (`data/crm.db`) — inventário abaixo por precaução, mesmo não sendo um rename/refactor de string.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `data/crm.db` — única fonte de verdade, 33 linhas em `leads` (22 ativas + 11 soft-deletadas), local (não há réplica/serviço externo) | Backfill idempotente via `scripts/backfill-origem-tipo.cjs` (Pattern 2); backup de arquivo antes de qualquer escrita |
| Live service config | Nenhum serviço externo depende do schema de `leads` — não há n8n, Datadog, Tailscale, Cloudflare Tunnel neste projeto | Nenhuma ação |
| OS-registered state | Nenhum — a aplicação roda via `npm run dev`/`npm start` local, sem Task Scheduler/pm2/systemd registrado para este processo | Nenhuma ação |
| Secrets/env vars | `DB_FILE_NAME` (opcional, usado só por scripts de teste para apontar para banco temporário) — não referencia `origem_tipo` por nome, nenhuma mudança necessária | Nenhuma ação |
| Build artifacts / pacotes instalados | Nenhum artefato compilado depende do nome da coluna — `Lead`/`NewLead` são tipos inferidos (`InferSelectModel`/`InferInsertModel`), atualizam automaticamente ao editar `schema.ts`, sem `npm run build` gerando artefato desatualizado a limpar | Nenhuma ação, além de `npx tsc --noEmit` para confirmar a inferência |

**Nota:** `src/db/migrations/meta/0002_snapshot.json` já está divergente do banco real desde as Fases 04-02/06-01/07-01 (débito técnico pré-existente, documentado em `STATE.md`). Esta fase **não** reconcilia esse snapshot — segue o mesmo precedente de não rodar `drizzle-kit generate` e não criar um novo arquivo `.sql` de migração, documentando a aplicação direta no SUMMARY (mesmo padrão das 3 fases anteriores).

## Common Pitfalls

### Pitfall 1: `drizzle-kit push` mal interpreta colunas `NOT NULL` com default em ambiente não-interativo
**What goes wrong:** Na Fase 06-01, `push` tratou `DEFAULT 0` (falsy em JS) como "sem default" e ameaçou rodar `DELETE FROM leads` antes do `ADD COLUMN` — só não apagou os 33 leads reais porque o executor abortou ao ver o prompt interativo de confirmação (que falhou por falta de TTY). Na Fase 07-01, `push --verbose` aplicou mudanças (incluindo um `DROP INDEX`/`CREATE UNIQUE INDEX` não previsto) sem nenhuma pausa real para revisão, mesmo em modo "interativo".
**Why it happens:** O gate de segurança do `drizzle-kit push` (checagem `!statement.column.default`) tem um bug de falsy-check para valores numéricos, e o ambiente deste projeto (shell não-interativo, host de 4GB) não suporta a pausa de confirmação que o `push` espera antes de aplicar DDL potencialmente destrutivo.
**How to avoid:** Aplicar a DDL diretamente via `better-sqlite3` (Pattern 1/2), usando o texto SQL exato que o conversor real do `drizzle-kit` geraria — nunca `push`/`generate` para este `ALTER TABLE`.
**Warning signs:** Qualquer mensagem do `drizzle-kit` mencionando "data-loss statement", "without default value" para uma coluna que claramente tem `.default(...)` no schema TypeScript, ou qualquer prompt que trave esperando TTY.

### Pitfall 2: Esquecer que `csvRowSchema` herda `origemTipo` de `leadSchema`
**What goes wrong:** Se `origemTipo` virar obrigatório em `leadSchema` sem que `csvRowSchema` receba um `.default("outbound")` explícito (ou sem que `bulkImportLeads` injete o valor antes de validar), **toda** linha de importação CSV passa a falhar `csvRowSchema.safeParse` por campo ausente — o import inteiro (`/importar`) para de funcionar, não é um caso-limite raro.
**Why it happens:** `csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true })` — qualquer campo novo obrigatório em `leadSchema` que não seja explicitamente omitido/sobrescrito propaga automaticamente para `csvRowSchema`.
**How to avoid:** `csvRowSchema.extend({ origemTipo: z.enum(["inbound", "outbound"]).default("outbound"), subnichoNome: ... })` — a extensão sobrescreve o campo herdado com uma versão que tem default, então o wizard nunca precisa enviar `origemTipo` no `ConfirmedImportRow`.
**Warning signs:** Erro genérico "Linha N (...): ... [origemTipo]" no toast de erro do wizard depois desta fase, se o passo acima for esquecido.

### Pitfall 3: `bulkImportLeads` monta o objeto de insert com lista explícita de campos
**What goes wrong:** `tx.insert(leads).values({ nome, telefone, canal, origem, valorEstimado, notas, subnichoId, stage, stageChangedAt, followUpDate, importBatchId })` em `import-actions.ts` **não** usa spread de `row` — é uma lista de campos explícita. Adicionar `origemTipo` só ao `csvRowSchema`/`ConfirmedImportRow` sem também adicionar `origemTipo: row.origemTipo` (ou `validatedRows[i].origemTipo`) a essa lista explícita faz a validação passar mas o valor nunca chegar ao banco (silenciosamente ausente do insert — SQLite aplicaria o `DEFAULT 'outbound'` da coluna mesmo assim, mascarando o bug até um lead precisar ser `inbound` via CSV no futuro).
**Why it happens:** O padrão de insert explícito (não spread) é deliberado neste arquivo (evita vazar campos não esperados), mas exige que cada campo novo seja adicionado manualmente em dois lugares: o schema Zod E o objeto `.values({...})`.
**How to avoid:** Adicionar `origemTipo: row.origemTipo` (nome do campo dentro do loop de `validatedRows`) na lista de `.values({...})` de `bulkImportLeads`, na mesma ordem lógica dos demais campos.
**Warning signs:** `npx tsc --noEmit` não pega isso sozinho (o campo é opcional-com-default no tipo de insert do Drizzle) — só um teste funcional real do import (ou uma asserção explícita de `origem_tipo` no banco pós-import) detecta a ausência.

### Pitfall 4: `scripts/test-lead-actions.cjs` — `makeFormData()` precisa do campo novo, os `db.insert(leads).values({...})` diretos não precisam
**What goes wrong:** O helper `makeFormData()` (linha ~99-116) monta o `FormData` que passa por `leadSchema.safeParse` dentro de `createLead`/`updateLead` — sem `origemTipo` no objeto `base`, todo caso de teste que espera sucesso (Caso 1, Caso 7) passa a falhar por validação, quebrando o script inteiro.
**Why it happens:** `origemTipo` se torna obrigatório em `leadSchema` sem default — qualquer FormData que não o inclua é rejeitado.
**How to avoid:** Adicionar `origemTipo: "outbound"` ao objeto `base` de `makeFormData()`. **Os dois `db.insert(leads).values({...})` diretos do script (linhas ~219-231 e ~256-266) NÃO precisam de mudança** — eles bypassam `leadSchema` inteiramente (inserção direta via Drizzle) e o `DEFAULT 'outbound'` físico da coluna cobre a ausência do campo automaticamente, sem erro.
**Warning signs:** `[test-lead-actions] N falha(s)` nos casos que esperam `after === before + 1` logo após esta fase ser mesclada, se `makeFormData()` não for atualizado no mesmo commit (mesmo achado #7 do `08-INTENT-REVIEW.md`).

## Code Examples

### 1. Coluna Drizzle (src/db/schema.ts)
```typescript
// Source: mesmo padrão de `canal`/`stage` (linhas 38, 44-46 do arquivo atual)
// Posicionar logo após `origem` (agrupamento semântico, D-02 espelhado no schema)
export const leads = sqliteTable(
  "leads",
  {
    // ... nome, telefone, canal ...
    origem: text("origem").notNull(),
    origemTipo: text("origem_tipo", { enum: ["inbound", "outbound"] })
      .notNull()
      .default("outbound"), // espelha o DEFAULT físico obrigatório do ALTER TABLE (Pattern 1) — nunca acionado pelos fluxos da app, que sempre entregam o campo via Zod
    // ... valorEstimado, notas, ...
  },
  (table) => [/* índices inalterados */]
);
```

### 2. Validação Zod (src/lib/validations.ts)
```typescript
// Source: mesmo padrão de `canal` (linha 26-28 do arquivo atual)
export const leadSchema = z.object({
  // ... nome, telefone ...
  canal: z.enum(["instagram", "whatsapp"], { error: "Selecione um canal de contato." }),
  origem: z.string().trim().min(1, "Origem é obrigatória."),
  origemTipo: z.enum(["inbound", "outbound"], {
    error: "Selecione o tipo de origem.",
  }), // SEM .default() — D-04 exige que o formulário manual nunca pré-selecione
  // ... valorEstimado, notas, ...
});

// csvRowSchema: sobrescreve origemTipo herdado de leadSchema com um default —
// o wizard de import CSV nunca precisa enviar esse campo (Requirement 2 do SPEC).
export const csvRowSchema = leadSchema
  .omit({ subnichoId: true, followUpDate: true })
  .extend({
    subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
    origemTipo: z.enum(["inbound", "outbound"]).default("outbound"),
  });
```

### 3. Migração + backfill (scripts/backfill-origem-tipo.cjs)
Ver Pattern 2 acima — script completo, idempotente, com backup automático.

### 4. Injeção do default no import CSV (src/lib/csv-import.ts + src/actions/import-actions.ts)
```typescript
// csv-import.ts — CSV_DEFAULTS ganha uma entrada de documentação/import,
// mesmo sem ser consumida por mapCsvRows (origemTipo não é um CsvFieldKey
// mapeável — é fixo, nunca vem de coluna do arquivo, Requirement 2 do SPEC).
export const CSV_DEFAULTS = {
  canal: "whatsapp",
  origem: "Importação CSV",
  notas: "Importado via CSV.",
  valorEstimado: "0",
  origemTipo: "outbound",
} as const;
```
```typescript
// import-actions.ts — nenhuma mudança de lógica necessária se csvRowSchema
// já tiver .default("outbound") (ver Code Example 2): ConfirmedImportRow
// continua sem origemTipo, csvRowSchema.safeParse(row) preenche sozinho.
// Único ponto que precisa de edição: a lista explícita de campos do insert.
tx.insert(leads)
  .values({
    nome: row.nome,
    telefone: row.telefone,
    canal: row.canal,
    origem: row.origem,
    origemTipo: row.origemTipo, // <- adicionar (Pitfall 3)
    valorEstimado: row.valorEstimado,
    notas: row.notas,
    subnichoId: subnichoIdByNome.get(chave)!,
    stage: "novo",
    stageChangedAt: new Date(),
    followUpDate: new Date(),
    importBatchId: batchId,
  })
  .run();
```

### 5. Verificação pós-migração via PRAGMA (padrão já usado no projeto)
```javascript
// Source: mesmo padrão de scripts/verify-pipeline-migration.cjs
const columns = db.prepare("PRAGMA table_info(leads)").all().map((c) => c.name);
if (!columns.includes("origem_tipo")) throw new Error("coluna origem_tipo ausente");

const nullCount = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo IS NULL").get().c;
if (nullCount !== 0) throw new Error(`${nullCount} lead(s) com origem_tipo NULL`);

const total = db.prepare("SELECT count(*) AS c FROM leads").get().c; // esperado: 33
const outbound = db.prepare("SELECT count(*) AS c FROM leads WHERE origem_tipo = 'outbound'").get().c; // esperado: 33 (backfill uniforme)
```

## State of the Art

Não aplicável — nenhuma mudança de ecossistema/versão relevante para esta fase. `drizzle-orm`/`drizzle-kit`/`better-sqlite3`/`zod` continuam nas mesmas versões já em uso no projeto (`package.json`, confirmado 2026-08-06).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O texto exato `ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;` é o que o conversor real do `drizzle-kit` geraria para esta coluna (extrapolado do precedente `contact_attempts integer DEFAULT 0 NOT NULL` documentado em `06-01-SUMMARY.md`, não verificado lendo o código-fonte do `drizzle-kit` nesta sessão) | Pattern 1, Code Example 1 | Baixo — mesmo se a formatação exata divergir (ex. ordem `NOT NULL DEFAULT` vs `DEFAULT NOT NULL`, aspas de identificador), o efeito semântico é idêntico; o planner pode confirmar rodando `npx drizzle-kit generate --dry-run`-equivalente ou inspecionando `node_modules/drizzle-kit/bin.cjs` como o executor da 06-01 fez |
| A2 | `'outbound'` (string truthy) não aciona o mesmo bug de falsy-check do `drizzle-kit push` que afetou `DEFAULT 0` na Fase 06-01 — não testado nesta sessão, só inferido da natureza do bug (`!statement.column.default`) | Alternatives Considered, Pitfall 1 | Baixo — a recomendação desta pesquisa é NÃO usar `push` de qualquer forma, então esta assunção é só uma nota lateral, não uma dependência do plano |

**Se esta tabela parecer vazia de riscos altos:** os dois itens acima são de baixo risco porque a recomendação final (ALTER TABLE manual) não depende de nenhum deles estar certo — são notas de contexto, não pré-condições do plano.

## Open Questions (RESOLVED)

1. **O script de backfill deve ser mesclado num único arquivo (`scripts/backfill-origem-tipo.cjs`, migração + verificação) ou dividido em dois (`backfill-*.cjs` + `verify-*.cjs`, espelhando o par `verify-wa-contact-invariant.cjs`/nenhum script de aplicação separado da Fase 6)?**
   - What we know: a Fase 06-01 aplicou a coluna via `node -e` inline (não um script `.cjs` dedicado) e só criou um script `.cjs` para a guarda de invariante de negócio (não para a migração em si). A Fase 07-01 também aplicou via `push` inline, sem script dedicado.
   - What's unclear: se o padrão de "script `.cjs` dedicado à migração" (não só à verificação) é preferível aqui, já que o backfill desta fase tem uma exigência explícita de idempotência que os precedentes não tinham.
   - Recommendation: um único script mesclado (proposto em Pattern 2) é mais simples de auditar/re-rodar do que dois arquivos — decisão de baixo risco, fica a critério do planner.
   - **RESOLVED (planejamento da Fase 8):** adotada a recomendação — arquivo único mesclado `scripts/backfill-origem-tipo.cjs` (migração + verificação + idempotência), planejado na Task 2 do `08-01-PLAN.md`. Nenhuma questão aberta remanescente nesta pesquisa.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `data/crm.db` (arquivo SQLite real) | Toda a fase — migração e backfill tocam este arquivo | ✓ | 33 linhas confirmadas em `leads` (sessão de pesquisa, 2026-08-06) | — |
| `better-sqlite3` (Node, já instalado) | Script de backfill, scripts de verificação | ✓ | 12.11.1 (`package.json`) | — |
| `drizzle-kit` CLI | Não usado para aplicar a coluna nesta fase (ver Pitfall 1) — só referência | ✓ (instalado, mas deliberadamente não usado para o `ALTER TABLE`) | 0.31.10 | ALTER TABLE manual via `better-sqlite3` (já é o plano recomendado) |

**Missing dependencies com fallback:** nenhuma — tudo já está instalado e disponível localmente.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não | Fora de escopo do projeto (single-admin, sem auth) |
| V3 Session Management | não | Idem |
| V4 Access Control | não | Idem |
| V5 Input Validation | sim | `leadSchema`/`csvRowSchema` (Zod) valida `origemTipo` como enum fechado de 2 valores em toda Server Action de escrita (`createLead`, `updateLead`, `bulkImportLeads`) — nenhum terceiro estado (`"outro"`, string livre) pode chegar ao banco pela camada de aplicação |
| V6 Cryptography | não | Não aplicável — nenhum dado sensível novo (`origemTipo` não é PII) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Perda de dados durante `ALTER TABLE` em produção sem migration history versionado | Tampering / Denial of Service (perda de dados) | Backup de `data/crm.db` (checkpoint WAL + cópia de arquivo) ANTES de qualquer escrita — mesmo padrão exigido pela Constraint do `08-SPEC.md` e já usado como gate BLOCKING nas Fases 06-01/07-01 |
| `INSERT` SQL cru fora da aplicação inserindo um `origem_tipo` fora do enum (ex.: script ad-hoc futuro) | Tampering | Aceito conscientemente — mesma exposição que `canal`/`stage` já têm hoje (nenhum `CHECK` constraint no SQLite, enum garantido só pelo Zod); não é uma regressão desta fase, já documentado em `08-SPEC.md` §Constraints |
| Script de backfill rodado 2x sobrescrevendo uma correção manual (`origemTipo` trocado para `inbound` via `updateLead` entre as duas execuções) | Tampering | `UPDATE ... WHERE origem_tipo IS NULL` (nunca incondicional) — uma linha já reclassificada nunca tem `origem_tipo IS NULL`, então nunca é tocada por um re-run (Pattern 2) |

## Sources

### Primary (HIGH confidence — leitura direta do código/dados reais deste repositório)
- `src/db/schema.ts` — forma exata de `canal`/`stage` como enum Drizzle, precedente direto para `origemTipo`
- `src/lib/validations.ts` — `leadSchema`/`csvRowSchema`, confirmação de que `csvRowSchema` deriva de `leadSchema` via `.omit()`
- `src/actions/lead-actions.ts`, `src/actions/import-actions.ts` — fluxo completo de `createLead`/`updateLead`/`bulkImportLeads`, incluindo o insert explícito de campos (Pitfall 3)
- `src/components/lead-form-dialog.tsx` — padrão exato do campo `canal` a replicar (D-03)
- `scripts/test-lead-actions.cjs` — confirmação do achado #7 do `08-INTENT-REVIEW.md` (quais linhas exatas precisam de `origemTipo`)
- `.planning/phases/06-auto-avan-o-de-etapa-contador-de-tentativas/06-01-PLAN.md` + `06-01-SUMMARY.md` — precedente real e verificado do bug do `drizzle-kit push` com `DEFAULT` falsy, e da aplicação de `ALTER TABLE` direta via `better-sqlite3`
- `.planning/phases/07-configura-o-de-dias-parado-por-etapa/07-01-SUMMARY.md` — segundo precedente de comportamento não confiável do `push` em ambiente não-interativo
- `src/db/migrations/0001_grey_xavin.sql` — exemplo real de `ALTER TABLE` gerado pelo próprio drizzle-kit para colunas nullable (`motivo_perda`, `stage_changed_at`)
- `.gitignore` — confirmação de que `data/*.db*` (incluindo qualquer arquivo de backup nomeado `crm.db.backup-*`) já é ignorado por git, nenhuma configuração nova necessária
- `package.json` — versões reais instaladas (`drizzle-orm@0.45.2`, `better-sqlite3@12.11.1`, `zod@4.4.3`, `drizzle-kit@0.31.10`), confirmando nenhuma dependência nova
- `.planning/config.json` — `workflow.nyquist_validation: false` (seção de validação omitida), `workflow.security_enforcement: true` (seção de segurança incluída)

### Secondary (MEDIUM confidence)
- Nenhuma — toda a pesquisa desta fase foi resolvível por leitura direta do código/dados reais deste repositório, sem necessidade de fontes externas (nenhuma tecnologia nova, nenhuma API externa).

### Tertiary (LOW confidence)
- Nenhuma.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, tudo já instalado e em uso
- Architecture: HIGH — todos os padrões (schema, Zod, formulário) verificados por leitura direta do código real
- Migração/backfill: HIGH — mecanismo (ALTER TABLE + DEFAULT obrigatório) é uma regra documentada e bem conhecida do SQLite, cruzada com dois precedentes reais e verificados neste mesmo repositório (Fases 06-01, 07-01)
- Pitfalls: HIGH — todos os 4 pitfalls são achados concretos de leitura de código (não hipóteses), incluindo os dois já levantados pela revisão adversarial de intenção (`08-INTENT-REVIEW.md` achados #5 e #7)

**Research date:** 2026-08-06
**Valid until:** Estável — sem dependência de versão externa que mude rapidamente; revalidar só se `package.json` for atualizado (`drizzle-orm`/`drizzle-kit`/`better-sqlite3`) antes do plano ser executado.
