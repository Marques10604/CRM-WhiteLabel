---
phase: 10-sequ-ncia-de-follow-up-escalonada
plan: 01
subsystem: database
tags: [drizzle, sqlite, zod, migration, better-sqlite3]

# Dependency graph
requires:
  - phase: 08-origem-governada-separa-o-inbound-outbound
    provides: "leads.origemTipo (coluna já viva no banco), usada como gate ORIGEM-03 em computeSequenciaSugestao"
  - phase: 09-timeline-de-intera-es
    provides: "tabela interacoes com tipo/createdAt/deletedAt, agregada por getUltimaInteracaoWhatsAppPorLead"
provides:
  - "Coluna leads.sequencia_posicao (integer, default 0) viva em data/crm.db"
  - "Coluna configuracoes.sequencia_intervalos_dias (json, default [4,10,20]) viva em data/crm.db"
  - "sequenciaIntervalosSchema e configuracoesServerSchema exportados de src/lib/validations.ts"
  - "getUltimaInteracaoWhatsAppPorLead() e computeSequenciaSugestao() exportados de src/db/queries.ts"
  - "scripts/migrate-sequencia-followup.cjs (commitado, idempotente) e gate permanente em verify-schema.cjs"
affects: [10-02-avanco-e-reset-de-sequencia, 10-03-configuracoes-ui, 10-04-indicador-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coluna text(mode:'json') + $type<T>() para lista global/singleton (sequenciaIntervalosDias), em vez de tabela auxiliar"
    - "Migração manual via better-sqlite3 commitada (nunca drizzle-kit push/generate) para ALTER TABLE sobre tabela populada"
    - "Função pura de cálculo (computeSequenciaSugestao) com múltiplos gates ordenados, sempre retornando undefined em vez de lançar exceção"

key-files:
  created:
    - scripts/migrate-sequencia-followup.cjs
  modified:
    - src/db/schema.ts
    - src/lib/validations.ts
    - scripts/test-lead-actions.cjs
    - scripts/verify-schema.cjs
    - src/db/queries.ts

key-decisions:
  - "D-11: semente de configuracoes.sequenciaIntervalosDias é [4,10,20], não [] — lista vazia bloquearia o salvamento dos 3 campos de dias-parado já existentes por causa da validação min(1) do 10-UI-SPEC.md"
  - "D-12: reset de sequenciaPosicao para 0 ao voltar para stage='novo' vale tanto para updateLeadStage quanto para updateLead (implementado no plano 10-02, esta decisão só documentada e refletida no comentário do schema aqui)"
  - "computeSequenciaSugestao ganhou um 4º gate (stage terminal) além dos 3 esboçados em 10-RESEARCH.md — reforço exigido pelo 10-UI-SPEC.md, não divergência acidental"

patterns-established:
  - "Migração manual DDL: backup com wal_checkpoint(TRUNCATE) → guarda de idempotência por PRAGMA table_info → ALTER TABLE → verificação pós-migração (contagem de linhas, 0 NULL, JSON válido) → fail()/exit(1)"
  - "verify-schema.cjs: gate de PRESENÇA (não conjunto estrito) para colunas de tabelas que acumulam colunas a cada fase (leads, configuracoes)"

requirements-completed: [SEQ-01, SEQ-02, ORIGEM-03]

# Metrics
duration: ~10min
completed: 2026-08-12
---

# Phase 10 Plan 01: Fundação de Dados da Sequência de Follow-up Escalonada Summary

**Duas colunas novas (leads.sequencia_posicao, configuracoes.sequencia_intervalos_dias) aplicadas ao vivo em data/crm.db via migração manual idempotente, mais os contratos Zod e a função pura computeSequenciaSugestao com os 4 gates comportamentalmente comprovados.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-12T16:49:09Z (aprox., conforme STATE.md ao início da sessão)
- **Completed:** 2026-08-12T16:56:33Z
- **Tasks:** 3/3 completas
- **Files modified:** 6 (5 modificados, 1 criado)

## Accomplishments
- `leads.sequencia_posicao` e `configuracoes.sequencia_intervalos_dias` aplicadas em produção (`data/crm.db`) sem perder nenhuma das 37 linhas de `leads`, com backup prévio em disco
- `sequenciaIntervalosSchema`/`configuracoesServerSchema` exportados em `validations.ts` sem alterar o contrato existente do formulário (`configuracoesSchema`/`ConfiguracoesFormValues` intocados)
- `getUltimaInteracaoWhatsAppPorLead` (agregação SQL) e `computeSequenciaSugestao` (função pura, 4 gates) prontos para consumo nos planos 10-02/10-03/10-04

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Colunas Drizzle novas, contratos Zod derivados e bootstrap do harness de leads** - `4fd1efa` (feat)
2. **Task 2: [BLOCKING] Migração manual das duas colunas no banco vivo + gate permanente de schema** - `3efac4e` (feat)
3. **Task 3: Camada de leitura — última interação por lead e cálculo puro da data sugerida** - `9fadfa4` (feat)

_Nenhuma task foi TDD; este plano não usa o fluxo RED/GREEN/REFACTOR._

## Files Created/Modified
- `src/db/schema.ts` - `leads.sequenciaPosicao` (integer, default 0) e `configuracoes.sequenciaIntervalosDias` (json, default `[4,10,20]`), com doc-comments citando D-01/D-02/D-10/D-11/D-12
- `src/lib/validations.ts` - `sequenciaIntervalosSchema` e `configuracoesServerSchema` (derivado por `.extend`), sem tocar `configuracoesSchema`
- `scripts/test-lead-actions.cjs` - `manualAlters` ganha a 5ª entrada (`sequencia_posicao`) para o harness de banco temporário continuar reconstruindo o schema real
- `scripts/migrate-sequencia-followup.cjs` (novo) - migração manual idempotente, molde de `backfill-origem-tipo.cjs`
- `scripts/verify-schema.cjs` - gate permanente de presença das duas colunas novas
- `src/db/queries.ts` - `getUltimaInteracaoWhatsAppPorLead` (agregação) e `computeSequenciaSugestao` (função pura, 4 gates)

## Migração no banco vivo (Task 2 — detalhes exigidos pelo output do plano)

- **Backup criado em:** `C:\Users\Vencedor\Desktop\crm-leads\data\crm.db.backup-2026-08-12T16-53-20-299Z` (antes da primeira escrita)
- **`leads`:** 37 linhas antes → 37 linhas depois (nenhuma perdida); 18 colunas → 19 colunas (`sequencia_posicao` adicionada, `notnull=1`, `dflt_value=0`)
- **`configuracoes`:** 5 colunas → 6 colunas (`sequencia_intervalos_dias` adicionada, `notnull=1`, `dflt_value='[4,10,20]'`)
- **Valor efetivo de `sequencia_intervalos_dias` na linha `id=1`:** `[4,10,20]`
- **Idempotência comprovada:** segunda execução de `node scripts/migrate-sequencia-followup.cjs` terminou com exit 0, logando "já existe — pulando (idempotência)" para as duas colunas, sem alterar contagens
- **`drizzle-kit push`/`generate`:** NÃO executado em nenhum momento desta task — apenas `ALTER TABLE` manual via `better-sqlite3`, seguindo o precedente de `backfill-origem-tipo.cjs` (Fase 8) e evitando o bug de "data-loss statement"/prompt de TTY já sofrido nas Fases 06-01/07-01
- **`npm run verify:schema`:** exit 0, mensagem final cita `sequencia_posicao` e `sequencia_intervalos_dias`

## Comprovação comportamental dos 4 gates de `computeSequenciaSugestao` (Task 3)

Rodado com `intervalosDias = [4,10,20]`:

1. Lead `inbound` (posição 0, stage `contatado`) com interação registrada → `undefined` (gate ORIGEM-03)
2. Lead `outbound` em stage `perdido` (posição 0) com interação registrada → `undefined` (gate etapa terminal)
3. Lead `outbound` em stage `novo` (posição 0) sem nenhuma interação → `undefined` (gate D-09)
4. Lead `outbound` em stage `novo`, posição 3 (fora de `[4,10,20]`, índice 3 inexistente), com interação → `undefined` (gate D-10)
5. Lead `outbound` em stage `contatado`, posição 0, última interação em `2026-08-01` → `2026-08-05T00:00:00.000Z` (`addDays(2026-08-01, 4)`)

Todos os 5 resultados batem exatamente com o esperado pelos critérios de aceite do plano.

## Decisions Made

- **D-11** (resolve Open Question 1 do `10-RESEARCH.md`) — o valor semente de `sequenciaIntervalosDias` é `[4,10,20]`, não `[]`. Motivo técnico decisivo: `10-UI-SPEC.md` §Copywriting trava a validação de lista vazia como erro bloqueante ("Adicione ao menos um intervalo."). Com semente `[]`, a primeira visita a `/configuracoes` deixaria o admin incapaz de salvar até os 3 campos de dias-parado já existentes (regressão numa funcionalidade já entregue). `[4,10,20]` é puramente informativo (D-06) e não dispara efeito colateral destrutivo.
- **D-12** (resolve Open Question 2 do `10-RESEARCH.md`) — o reset de `sequenciaPosicao` vale para `updateLeadStage` E `updateLead`. `motivoPerda` já é tratado assim hoje nas duas funções, sem distinção de mecanismo; o reset acompanha o mesmo padrão. Implementação real do reset fica para o plano 10-02 — este plano só documenta a decisão no comentário de `schema.ts`.
- `computeSequenciaSugestao` recebeu um 4º gate (`stage` terminal) além dos 3 esboçados na assinatura de `10-RESEARCH.md` §Pattern 2 — reforço exigido pelo `10-UI-SPEC.md` ("nunca mostrado para leads fechados/perdidos"), registrado explicitamente como amplitude deliberada, não divergência acidental.

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

Nenhum. A verificação inline do plano (`node -e "..."`) para a Task 1 falhou uma vez por escaping de `\$` dentro de aspas duplas do Bash tool (não um bug no código) — resolvido escrevendo a mesma checagem como arquivo `.js` temporário no scratchpad e confirmado com `grep` direto no arquivo-fonte que `.$type<number[]>()` está presente byte-a-byte.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- As duas colunas estão vivas em produção; os planos 10-02 (avanço/reset de `sequenciaPosicao` em `lead-actions.ts`), 10-03 (UI de `/configuracoes` para editar os intervalos) e 10-04 (indicador visual no pipeline/dashboard) podem consumir `computeSequenciaSugestao`/`getUltimaInteracaoWhatsAppPorLead`/`configuracoesServerSchema` diretamente, sem trabalho de fundação pendente.
- Nenhum arquivo de UI e nenhuma Server Action foram tocados neste plano, conforme o `<success_criteria>` do `10-01-PLAN.md`.
- Sem bloqueios conhecidos para os próximos planos da fase.

---
*Phase: 10-sequ-ncia-de-follow-up-escalonada*
*Completed: 2026-08-12*
