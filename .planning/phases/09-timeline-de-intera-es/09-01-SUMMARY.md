---
phase: 09-timeline-de-intera-es
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, server-actions, soft-delete]

requires:
  - phase: 08-origem-governada-separa-o-inbound-outbound
    provides: convenção de guarda anti hard-delete (LEAD-04) e padrão de push seguro contra data/crm.db
provides:
  - Tabela `interacoes` viva em data/crm.db (7 colunas, FK restrict para leads, 2 índices)
  - Tipos `Interacao`/`NewInteracao` inferidos do Drizzle
  - Contratos Zod: notaManualTextoSchema, interacaoManualSchema, interacaoManualUpdateSchema; whatsappContactSchema.texto obrigatório
  - guard-no-hard-delete.cjs e verify-schema.cjs estendidos para cobrir `interacoes`
  - 4 Server Actions: getInteracoesByLead, createInteracaoManual, updateInteracaoManual, softDeleteInteracaoManual
affects: [09-02, 09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "Guarda de imutabilidade no WHERE do servidor (eq(interacoes.tipo, \"nota_manual\")), nunca só na UI"
    - "Ordenação cronológica com desempate por id (desc(createdAt), desc(id)) para colunas timestamp com resolução de 1s"

key-files:
  created:
    - src/actions/interacao-actions.ts
  modified:
    - src/db/schema.ts
    - src/types/index.ts
    - src/lib/validations.ts
    - scripts/guard-no-hard-delete.cjs
    - scripts/verify-schema.cjs
    - package.json

key-decisions:
  - "Coluna única `tipo` (4 valores, incluindo nota_manual) em vez de uma segunda dimensão de categorização — decisão já tomada no 09-RESEARCH.md, aplicada como especificado"
  - "whatsappContactSchema ganhou `texto` obrigatório nesta plan (09-01), mas o único call site (registerWhatsAppContact em lead-actions.ts) só passa a enviar `texto` na Plan 09-02 — janela intencional entre as duas plans em que o parse de whatsappContactSchema falharia se chamado sem texto (nenhum call site quebra HOJE porque 09-01 não tocou lead-actions.ts/whatsapp-preview-dialog.tsx)"
  - "drizzle-kit push recriou subnicho_nome_unique_idx (DROP+CREATE idêntico) por drift de snapshot já documentado em STATE.md — verificado sem perda de dados (subnichos com 9 linhas intactas, mesmo índice reaplicado)"

patterns-established:
  - "Tabela de evento imutável com deletedAt condicional por tipo: WHERE sempre inclui eq(tabela.tipo, valor_editável) nas mutações de update/soft-delete"

requirements-completed: [TIMELINE-01, TIMELINE-02]

duration: 10min
completed: 2026-08-08
---

# Phase 09 Plan 01: Camada de Dados da Timeline de Interações Summary

**Tabela `interacoes` (Drizzle + Zod + guarda anti hard-delete estendida) aplicada no banco vivo via drizzle-kit push, com 4 Server Actions de CRUD de nota manual e leitura cronológica, imutabilidade de eventos de WhatsApp garantida no WHERE do servidor.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-08T23:03:12Z
- **Completed:** 2026-08-08T23:12:16Z
- **Tasks:** 3
- **Files modified:** 7 (6 modificados + 1 criado)

## Accomplishments
- Tabela `interacoes` criada no schema Drizzle e aplicada de fato em `data/crm.db` (não só nos tipos TypeScript), com backup prévio confirmado
- Guarda `guard:no-hard-delete` estendida para `interacoes` no MESMO commit que cria a tabela — sem essa cobertura, um hard-delete futuro passaria despercebido (débito sinalizado em STATE.md §Blockers/Concerns, agora fechado)
- Gate `verify:schema` (novo script npm) agora valida colunas físicas de `interacoes` via `PRAGMA table_info`, não só a existência da tabela
- 4 Server Actions com guarda de imutabilidade (`eq(interacoes.tipo, "nota_manual")`) aplicada no WHERE do servidor, não só na UI futura

## Task Commits

Each task was committed atomically:

1. **Task 1: Contratos da tabela interacoes (schema + tipos + Zod) e extensão da guarda anti hard-delete** - `7631e19` (feat)
2. **Task 2: Aplicar a tabela no banco vivo via drizzle-kit push e estender o gate de schema** - `6e65683` (feat)
3. **Task 3: Server Actions de interações com guarda de imutabilidade no WHERE** - `ec502ae` (feat)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/db/schema.ts` - tabela `interacoes` (id, leadId FK restrict, tipo enum 4 valores, texto, createdAt, updatedAt nullable, deletedAt nullable) + 2 índices
- `src/types/index.ts` - tipos `Interacao`/`NewInteracao` inferidos do Drizzle
- `src/lib/validations.ts` - `notaManualTextoSchema`, `interacaoManualSchema`, `interacaoManualUpdateSchema`, `NotaManualFormValues`; `texto` obrigatório em `whatsappContactSchema`
- `scripts/guard-no-hard-delete.cjs` - 3 padrões novos cobrindo `interacoes` (1 em CODE_PATTERNS, 2 em CODE_SQL_PATTERNS)
- `scripts/verify-schema.cjs` - `interacoes` em `requiredTables`, 2 índices novos em `requiredIndexes`, checagem estrita de colunas físicas via `PRAGMA table_info`
- `package.json` - novo script `verify:schema`
- `src/actions/interacao-actions.ts` (novo) - `getInteracoesByLead`, `createInteracaoManual`, `updateInteracaoManual`, `softDeleteInteracaoManual`

## Decisions Made
- **whatsappContactSchema.texto obrigatório desde já (09-01), call site ainda não atualizado (fica para 09-02):** documentado no `09-02-PLAN.md` como Task 1 daquela plan — o único chamador de `registerWhatsAppContact` (`whatsapp-preview-dialog.tsx`) continua passando só `(leadId, tipo)` até 09-02 acrescentar `texto` à assinatura e ao call site. Entre a conclusão de 09-01 e a execução de 09-02, um clique real em "Abrir WhatsApp" pararia de incrementar `contactAttempts`/avançar etapa (a validação de `whatsappContactSchema` falharia por `texto` ausente). Isso é uma consequência já prevista e descrita no próprio `09-01-PLAN.md` (linha 127) e não constitui um bug desta plan — mas é importante executar 09-02 antes de considerar a Fase 9 utilizável em produção, ou reverter/pausar antes disso se o usuário precisar usar o botão de WhatsApp nesse intervalo.
- **Drift cosmético do índice `subnicho_nome_unique_idx` durante o push:** ver Deviations abaixo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido regex de auto-teste do próprio guard triggerado por comentário JSDoc**
- **Found during:** Task 3 (criação de `interacao-actions.ts`)
- **Issue:** O comentário JSDoc de `softDeleteInteracaoManual` continha literalmente o texto `` db.delete(interacoes...) `` como exemplo do que NUNCA fazer — isso disparou o próprio `guard:no-hard-delete` (que varre por `.delete(interacoes` em qualquer linha de código, incluindo comentários), fazendo a guarda falhar mesmo sem nenhum hard-delete real.
- **Fix:** Reescrito o comentário para descrever a proibição sem reproduzir o padrão literal (`"NUNCA um hard delete direto na tabela"` em vez do trecho de código).
- **Files modified:** src/actions/interacao-actions.ts
- **Verification:** `npm run guard:no-hard-delete` voltou a exit 0
- **Committed in:** ec502ae (Task 3 commit)

### Notable non-deviation: recreate cosmético de índice durante `drizzle-kit push`

Não é uma deviation de código (nenhum arquivo do repositório foi alterado por isso), mas precisa constar aqui porque toca dado de produção: `npx drizzle-kit push --verbose` (Task 2) imprimiu, além do `CREATE TABLE interacoes` esperado, um `DROP INDEX subnicho_nome_unique_idx` seguido de `CREATE UNIQUE INDEX subnicho_nome_unique_idx ON subnichos (...)` — byte-idêntico ao índice já existente. Isso decorre do drift de snapshot de migrações já documentado em `STATE.md` §Blockers/Concerns ("o snapshot de migrações deste projeto está divergente do banco real desde a Fase 4/6"): o drizzle-kit não reconhece o índice existente como igual ao do schema e propõe recriá-lo. Como CREATE TABLE/CREATE INDEX/DROP+CREATE INDEX (mesma definição) não são operações de perda de dado, o drizzle-kit aplicou tudo automaticamente sem pedir confirmação interativa — não houve oportunidade de abortar antes da aplicação. Verificado imediatamente após: `subnichos` com 9 linhas intactas, os 2 índices de `subnichos` presentes e funcionais, `leads` com 37 linhas / 18 colunas idênticas ao snapshot anterior ao push. Nenhuma perda de dado ocorreu; nenhum arquivo de migração foi commitado (drizzle-kit push não gera SQL versionado, mesmo padrão já registrado em decisões da Fase 04-02/06-01/07-01/08-01).

---

**Total deviations:** 1 auto-fixed (1 bug de guarda por auto-referência em comentário) + 1 evento de produção documentado (recreate cosmético de índice, sem perda de dado)
**Impact on plan:** Nenhum impacto no escopo. Nenhuma linha de dado real perdida ou alterada indevidamente.

## Issues Encountered
None além do já documentado acima.

## Live Database State (before/after `drizzle-kit push`)

| Métrica | Antes | Depois |
|---|---|---|
| `leads` linhas | 37 | 37 |
| `leads` colunas | 18 | 18 |
| `subnichos` linhas | (não medido antes; verificado depois) | 9 |
| `interacoes` (tabela) | ausente | presente, 7 colunas, FK restrict → leads, 2 índices |
| Backup | `data/crm.db.bak-fase09` (73728 bytes, gitignorado, criado antes do push) | mantido em disco |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Camada de dados completa: `interacoes` viva no banco, tipos, contratos Zod, guarda anti hard-delete e gate de schema cobrindo a tabela nova.
- **Bloqueio operacional temporário para 09-02:** `whatsappContactSchema.texto` já é obrigatório, mas `registerWhatsAppContact`/`whatsapp-preview-dialog.tsx` ainda não passam `texto` — 09-02 precisa ser executada antes de qualquer uso real do botão "Abrir WhatsApp" em produção (ver Decisions Made acima).
- Nenhum arquivo de UI foi tocado nesta plan (conforme `<success_criteria>` do PLAN.md) — 09-02/09-03/09-04 seguem livres para construir a UI da timeline sobre esta camada de dados.

---
*Phase: 09-timeline-de-intera-es*
*Completed: 2026-08-08*
