---
phase: 08-origem-governada-separa-o-inbound-outbound
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, better-sqlite3, schema-migration, backfill]

# Dependency graph
requires: []
provides:
  - "Coluna física leads.origem_tipo em data/crm.db (TEXT NOT NULL DEFAULT 'outbound')"
  - "Coluna origemTipo no schema Drizzle (src/db/schema.ts), tipo inferido Lead/NewLead já a inclui"
  - "leadSchema.origemTipo obrigatório sem default (Zod) — contrato pronto para o formulário (08-02)"
  - "csvRowSchema.origemTipo com default('outbound') — contrato pronto para o import CSV (08-02)"
  - "scripts/backfill-origem-tipo.cjs — script de migração idempotente, reexecutável com segurança"
affects: [08-02, 08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALTER TABLE manual via better-sqlite3 (nunca drizzle-kit push/generate) para colunas NOT NULL em tabela populada"
    - "Backfill idempotente: guarda PRAGMA table_info para o DDL + UPDATE ... WHERE campo IS NULL para o dado"
    - "Backup pré-migração: wal_checkpoint(TRUNCATE) + fs.copyFileSync antes de qualquer escrita"
    - "Zod: campo obrigatório sem default em leadSchema, default aplicado só no .extend() de csvRowSchema"

key-files:
  created:
    - scripts/backfill-origem-tipo.cjs
  modified:
    - src/db/schema.ts
    - src/lib/validations.ts

key-decisions:
  - "origemTipo posicionado imediatamente após origem em ambos schema.ts e validations.ts (D-02, agrupamento semântico espelhado)"
  - "Default 'outbound' existe apenas na coluna Drizzle/física e no csvRowSchema — leadSchema fica sem default (D-04, formulário força escolha consciente)"
  - "Backfill uniforme: todos os 33 leads (incluindo os 5 soft-deletados com origem 'insta'/'Teste') recebem origemTipo='outbound', sem regra diferenciada por texto (decisão do usuário registrada em 08-INTENT-REVIEW.md)"

patterns-established:
  - "Script de migração .cjs dedicado e commitado (primeira vez no projeto — Fases 06-01/07-01 aplicaram ALTER TABLE inline, sem arquivo)"

requirements-completed: [ORIGEM-01, ORIGEM-02]

# Metrics
duration: 15min
completed: 2026-08-07
---

# Phase 8 Plan 1: Origem Governada — Fundação do Schema Summary

**Coluna `origem_tipo` (enum inbound/outbound) aplicada em produção via ALTER TABLE manual idempotente, com backfill uniforme dos 33 leads existentes e contratos Zod prontos para o formulário e o import CSV das próximas plans.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-07T11:31:05Z
- **Completed:** 2026-08-07T11:35:49Z
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 código + 1 script novo), mais `data/crm.db` (dado real, gitignored)

## Accomplishments
- `origemTipo` declarado no schema Drizzle (`text("origem_tipo", { enum: ["inbound","outbound"] }).notNull().default("outbound")`), posicionado logo após `origem`
- `leadSchema` exige `origemTipo` sem `.default()` (D-04); `csvRowSchema` sobrescreve com `.default("outbound")` (evita quebrar o import CSV, Pitfall 2 do 08-RESEARCH.md)
- `scripts/backfill-origem-tipo.cjs` criado, aprovado pelo guard anti-hard-delete, com backup automático e dupla guarda de idempotência (DDL + dado)
- Migração aplicada contra `data/crm.db` real: coluna física criada, 33/33 leads em `origem_tipo='outbound'`, 0 NULL, idempotência provada por segunda execução

## Task Commits

Each task was committed atomically:

1. **Task 1: Declarar origemTipo no schema Drizzle e nos schemas Zod** - `e7ab61c` (feat)
2. **Task 2: Criar scripts/backfill-origem-tipo.cjs** - `c221033` (feat)
3. **Task 3 [BLOCKING]: Executar a migração contra data/crm.db** - sem commit de código (só toca `data/crm.db`, gitignored por `data/*.db*`) — resultado verificado abaixo

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/db/schema.ts` - coluna `origemTipo` na tabela `leads`
- `src/lib/validations.ts` - `leadSchema.origemTipo` (obrigatório, sem default) e `csvRowSchema.origemTipo` (default "outbound")
- `scripts/backfill-origem-tipo.cjs` (novo) - migração + backfill idempotente com backup automático
- `data/crm.db` (real, gitignored) - coluna `origem_tipo` aplicada, 33 linhas em `outbound`
- `data/crm.db.backup-2026-08-07T11-34-46-270Z` (real, gitignored) - backup pré-migração, criado antes da primeira escrita
- `data/crm.db.backup-2026-08-07T11-35-00-655Z` (real, gitignored) - backup criado na segunda execução (prova de idempotência), sem alteração de dado

## Decisões Tomadas
- Backfill uniforme para todos os 33 leads (22 ativos + 11 soft-deletados, incluindo os 5 com `origem` "insta"/"Teste") recebem `origemTipo='outbound'`, sem regra diferenciada por texto — decisão do usuário já registrada em `08-INTENT-REVIEW.md`/`STATE.md` antes desta execução, apenas aplicada aqui
- Nenhum comando `drizzle-kit` foi executado em nenhum momento desta plan (confirmado por revisão manual de cada comando rodado)

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered
- Um processo do dev server do Next.js estava ativo na porta 3000 (PID 8144) antes da Task 3. Parado via `taskkill` conforme pré-condição obrigatória do plano (evitar conexão concorrente segurando o WAL durante o checkpoint), antes de qualquer escrita no banco.

## Evidência da Migração (Task 3)

**Nome exato do arquivo de backup pré-migração:** `data/crm.db.backup-2026-08-07T11-34-46-270Z`

**Saída literal da primeira execução:**
```
[backfill-origem-tipo] backup criado em C:\Users\Vencedor\Desktop\crm-leads\data\crm.db.backup-2026-08-07T11-34-46-270Z
[backfill-origem-tipo] coluna origem_tipo adicionada (DEFAULT 'outbound' já backfillou todas as linhas existentes)
[backfill-origem-tipo] UPDATE idempotente afetou 0 linha(s) (esperado: 0 se a coluna já existia)
[backfill-origem-tipo] OK: 33 linhas totais, 0 NULL, 33 outbound, 0 inbound
```

**Saída literal da segunda execução (prova de idempotência):**
```
[backfill-origem-tipo] backup criado em C:\Users\Vencedor\Desktop\crm-leads\data\crm.db.backup-2026-08-07T11-35-00-655Z
[backfill-origem-tipo] coluna origem_tipo já existe — pulando ALTER TABLE (idempotência)
[backfill-origem-tipo] UPDATE idempotente afetou 0 linha(s) (esperado: 0 se a coluna já existia)
[backfill-origem-tipo] OK: 33 linhas totais, 0 NULL, 33 outbound, 0 inbound
EXIT CODE: 0
```

**Contagens pós-migração, verificadas por query direta independente (não confiando só no log do script):**
```json
{
  "col": { "name": "origem_tipo", "type": "TEXT", "notnull": 1, "dflt_value": "'outbound'" },
  "nulls": 0,
  "total": 33,
  "out": 33,
  "activeCount": 22
}
```

**Confirmação explícita:** nenhum comando `drizzle-kit` (`push`, `generate` ou qualquer subcomando) foi executado em nenhum momento desta plan — a coluna foi aplicada exclusivamente via `ALTER TABLE` manual dentro de `scripts/backfill-origem-tipo.cjs`, chamado diretamente via `node`.

## Known Stubs

Nenhum. Esta plan não introduz nenhuma superfície de UI nova (o campo `origemTipo` só é exposto no formulário/import na plan 08-02) — não há dado renderizado vazio/placeholder para rastrear aqui.

## Threat Flags

Nenhuma superfície de segurança nova além da já mapeada no `<threat_model>` do próprio `08-01-PLAN.md` (T-08-01 a T-08-05, T-08-SC). Nenhum achado adicional durante a execução.

## Débito Técnico Conhecido (não resolvido nesta plan, fora de escopo)

- `scripts/test-lead-actions.cjs` já falha hoje **antes mesmo desta mudança** — seu bootstrap de banco temporário só aplica `src/db/migrations/0000_gifted_slapstick.sql`, sem `0001_grey_xavin.sql` (`motivo_perda`/`stage_changed_at`) nem os `ALTER TABLE` manuais de `contact_attempts`/`import_batch_id` das Fases 06-01/07-01. O script falha em `countLeads()` com `no such column: "motivo_perda"` antes de chegar a `makeFormData()`. Confirmado por leitura de `08-PATTERNS.md` (seção `scripts/test-lead-actions.cjs`, achado da pesquisa da Fase 8, verificado rodando o script em sessão anterior). Esta plan **não** toca esse arquivo — não estava em `files_modified` do `08-01-PLAN.md`, e o bootstrap quebrado é pré-existente e não-relacionado a `origemTipo` (Rule "scope boundary" do executor: só auto-corrigir o que a própria task causou). Fica registrado aqui para decisão explícita em uma plan futura (provavelmente 08-03, que trata do "harness de testes").

## Next Phase Readiness
- Contratos de `origemTipo` (Drizzle + Zod) prontos para consumo direto pela plan 08-02 (formulário `lead-form-dialog.tsx` + import CSV `csv-import.ts`/`import-actions.ts`)
- Coluna física em produção, 0 leads sem classificação — plan 08-02 pode assumir que todo lead já tem `origemTipo` preenchido
- Nenhum bloqueio identificado para 08-02/08-03
- Débito técnico pré-existente de `scripts/test-lead-actions.cjs` (ver seção acima) deve ser resolvido explicitamente antes ou durante 08-03

---
*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Completed: 2026-08-07*
