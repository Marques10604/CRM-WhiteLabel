# Phase 8: Origem Governada + Separação Inbound × Outbound — Specification

**Created:** 2026-08-01
**Ambiguity score:** 0.17 (gate: ≤ 0.20)
**Requirements:** 3 locked

## Goal

Todo lead — novo ou já existente — passa a ter uma classificação de origem confiável e machine-readable (`origemTipo`: Inbound ou Outbound) via campo dedicado, sem que nenhuma automação futura precise interpretar o texto livre de `origem`.

## Background

`leads.origem` é hoje uma coluna `text NOT NULL` de preenchimento livre (formulário: input de texto; import CSV: mapeado ou default `"Importação CSV"`). Query direta contra `data/crm.db` nesta sessão confirma: **100% dos 22 leads ativos têm `origem = "Importação CSV"`** (11 leads adicionais soft-deletados têm `"Importação CSV"` (6), `"Teste"` (3) ou `"insta"` (2) — total 33 linhas na tabela). Nenhum campo/coluna de classificação Inbound/Outbound existe hoje em lugar nenhum do schema ou da UI.

Por definição do próprio projeto (`PROJECT.md` linha 8, `.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md`): **Inbound** = lead que já chegou "quente" por iniciativa própria (tráfego pago, anúncio, formulário — a pessoa procurou o admin); **Outbound** = prospecção fria iniciada pelo admin. O usuário ainda não roda tráfego pago (é um plano futuro mencionado, não realidade atual) — hoje todo lead do banco vem do lote CSV do cowork parceiro, ou seja, é uma lista de prospecção fria que o admin aborda por iniciativa própria. Isso torna Outbound o valor correto e não-ambíguo para o backfill de 100% dos leads existentes.

A decisão de schema (coluna nova `origemTipo`, mantendo `origem` livre intacto — não uma tabela `origens` governada separada) já foi tomada e registrada em `REQUIREMENTS.md` → Out of Scope: *"Tabela `origens` governada substituindo `leads.origem` — descartada em favor da coluna `origemTipo` mais simples — `origem` livre continua em uso como variável `{origem}` nos templates de WhatsApp."* Esta fase não reabre essa decisão.

Dois caminhos de criação de lead existem hoje e ambos precisam de um valor de `origemTipo` no momento em que a coluna se tornar `NOT NULL`: (1) `lead-form-dialog.tsx` → `createLead`/`updateLead` (`src/actions/lead-actions.ts`), formulário manual; (2) `csv-import-wizard.tsx` → `mapCsvRows` (`src/lib/csv-import.ts`) → `import-actions.ts`, import em lote. O caminho (2) não passa pelo formulário — precisa de sua própria regra de default, não apenas depender do form.

## Requirements

1. **Campo `origemTipo` no schema e no formulário de lead**: Nova coluna `leads.origemTipo` (enum fechado `"inbound" | "outbound"`, `NOT NULL`) existe no schema, e o formulário de lead (criação e edição, `lead-form-dialog.tsx`) expõe um campo dedicado e obrigatório para escolhê-la — independente do campo de texto livre `origem`, que permanece inalterado.
   - Current: `leads` não tem nenhuma coluna de classificação Inbound/Outbound; o formulário só tem o input de texto livre `origem` (`Field` em `lead-form-dialog.tsx:244-252`, validado só com `.min(1)` em `validations.ts:29`).
   - Target: Coluna `origem_tipo` existe em `leads`, `NOT NULL`, restrita a `"inbound"`/`"outbound"`. O formulário de lead ganha um select/dropdown obrigatório para `origemTipo`, no mesmo local onde `origem`/`canal` já aparecem (modal de edição — ver `lead-table-columns.tsx:65`, que documenta que esses campos ficam só no modal, não na lista base). Zod exige o valor em `createLead`/`updateLead`.
   - Acceptance: Tentar submeter o formulário de criação de lead sem selecionar `origemTipo` bloqueia o submit com erro de validação visível. Criar ou editar um lead com `origemTipo` selecionado persiste o valor — confirmável por query direta em `leads.origem_tipo` para o `id` do lead salvo. Abrir o modal de edição de qualquer lead (novo ou pré-existente/backfillado) mostra o valor atual de `origemTipo` no controle.

2. **Default de `origemTipo` no import CSV em lote**: Leads criados via wizard de import CSV recebem `origemTipo = "outbound"` automaticamente, sem exigir que o admin mapeie/escolha esse valor linha a linha.
   - Current: `mapCsvRows` (`src/lib/csv-import.ts`) não tem conceito de `origemTipo` — só mapeia/defaulta `origem` (`CSV_DEFAULTS.origem = "Importação CSV"`, linha 53).
   - Target: `mapCsvRows`/`import-actions.ts` atribuem `origemTipo: "outbound"` a toda linha importada, sem novo passo de UI no wizard (o lote do cowork parceiro é, por definição do negócio, prospecção fria — ver Background).
   - Acceptance: Importar um lote de teste via `/importar` produz leads cujo `origem_tipo` é `"outbound"` na tabela `leads`, confirmável por query direta após o import.

3. **Backfill explícito dos leads existentes (ORIGEM-02)**: Toda linha já existente em `leads` (ativa ou soft-deletada) recebe `origemTipo = "outbound"` numa migração/script único, documentado, executado uma vez ao aplicar a mudança de schema.
   - Current: As 33 linhas existentes em `leads` (22 ativas + 11 soft-deletadas) não têm nenhum valor de classificação — a coluna não existe ainda.
   - Target: Após a migração, todas as 33 linhas têm `origem_tipo = "outbound"` (100% dos dados reais hoje vêm do lote CSV do cowork — nenhuma exceção conhecida a tratar diferente). `data/crm.db` é copiado/backupeado antes de qualquer `drizzle-kit push`/`ALTER TABLE` que toque `leads` (mesmo padrão de risco documentado em `STATE.md` Blockers e já seguido nas Fases 06/07, onde `drizzle-kit push` teve bug conhecido tratando coluna nova com `NOT NULL`/default como caso especial e exigiu `ALTER TABLE` manual via `better-sqlite3`).
   - Acceptance: `SELECT COUNT(*) FROM leads WHERE origem_tipo IS NULL` retorna `0` após a migração. Query direta confirma as 33 linhas (ativas e soft-deletadas) com `origem_tipo = 'outbound'`. Um arquivo de backup do `.db` pré-migração existe e é referenciado no commit/SUMMARY da fase.

## Boundaries

**In scope:**
- Coluna `leads.origemTipo` (enum `"inbound" | "outbound"`, `NOT NULL`) no schema Drizzle
- Campo obrigatório correspondente no formulário de lead (criação + edição)
- Validação Zod do campo em `createLead`/`updateLead`
- Default automático `"outbound"` no fluxo de import CSV (sem passo de UI novo)
- Backfill único de todas as linhas existentes (ativas e soft-deletadas) para `"outbound"`, com backup do `.db` antes da migração
- Visibilidade do valor de `origemTipo` em pelo menos uma tela de consulta do lead (modal de edição, mesmo padrão de `origem`/`canal`)

**Out of scope:**
- Gate condicional que impede a sequência de follow-up escalonada de sugerir data para lead Inbound (ORIGEM-03) — mapeado para Phase 10, porque o comportamento observável só existe quando a própria sequência escalonada existir (`REQUIREMENTS.md` Traceability)
- Substituir `leads.origem` por uma tabela `origens` governada com FK — decisão já tomada e descartada (`REQUIREMENTS.md` Out of Scope), não reaberta nesta fase
- Granularidade de origem além do binário Inbound/Outbound (ex.: "Instagram Ads" vs. "Inbound" genérico) — a decisão de schema já fixou um enum fechado de 2 valores; qualquer granularidade futura é feature nova, não desta fase
- Governança/normalização de `motivoPerda` — mesma classe de problema do `origem`, mas explicitamente adiada para decisão na Phase 11 (`REQUIREMENTS.md` Out of Scope)
- UI de reclassificação em lote (bulk edit) de `origemTipo` para leads já backfillados — reclassificação individual via o formulário de edição (Requirement 1) cobre o caso de uso real **para leads ativos**; nenhuma automação depende de correção em massa. **Correção factual (revisão adversarial, ciclo 1):** `updateLead` (`src/actions/lead-actions.ts`) filtra por `isNull(leads.deletedAt)` no `WHERE` — um lead soft-deletado não pode ser editado diretamente. Para os 11 leads soft-deletados do backfill, corrigir `origemTipo` exige primeiro restaurá-lo (fluxo já existente da Lixeira, 01-04) e só então editar — não é um gap novo desta fase, é o mesmo comportamento que já vale para qualquer campo de um lead soft-deletado hoje.
- Porta de entrada local para IA cadastrar leads (LEAD-05) — item de backlog v1.2 não relacionado a esta fase, sem dependência técnica
- Qualquer mudança em `canal` ou no comportamento de templates/`{origem}` — `origem` (texto livre) permanece exatamente como está, incluindo seu uso como variável de template

## Constraints

- `data/crm.db` deve ser copiado (backup) antes de qualquer `drizzle-kit push` ou `ALTER TABLE` manual que altere a tabela `leads` — dado real de produção, sem migration history versionado (débito técnico pré-existente confirmado em `STATE.md`).
- `drizzle-kit push` tem bug conhecido neste projeto (confirmado na Fase 06-01) ao adicionar coluna `NOT NULL` com valor não-trivial: pode gerar `DELETE FROM`/rebuild de tabela em vez de `ALTER TABLE ADD COLUMN`. A migração desta fase precisa ser verificada contra uma cópia do `.db` antes de tocar o banco real, ou aplicada via `ALTER TABLE` direto (mesmo padrão já usado nas Fases 06/07).
- O enum `origemTipo` deve ser fechado (`"inbound" | "outbound"`, sem valor "outro"/nulo permitido) **na camada de aplicação** (Zod + tipo TypeScript do Drizzle) — nenhuma automação futura (Phase 10) pode lidar com um terceiro estado ambíguo vindo do formulário/import CSV. **Correção factual (revisão adversarial, ciclo 1):** `text(..., { enum: [...] }).notNull()` do Drizzle é só uma anotação TypeScript — a migração SQL gerada é `text NOT NULL` puro, sem `CHECK` constraint (confirmado em `src/db/migrations/0000_gifted_slapstick.sql:5-9` para `canal`; mesmo padrão já vale para `stage`). `origemTipo` segue exatamente esse precedente já estabelecido no projeto — o enum fechado é garantido pela Server Action (Zod) em todo caminho de escrita da aplicação, não por um `CHECK` no banco. Um `INSERT` SQL direto fora da aplicação (fora de escopo desta fase) não é bloqueado pelo schema físico — mesma exposição que `canal`/`stage` já têm hoje, não uma regressão introduzida aqui.
- Nenhuma mudança nesta fase pode alterar o comportamento do campo `origem` livre (usado como `{origem}` em templates de WhatsApp) — `origemTipo` é estritamente aditivo.
- Script de backfill deve ser idempotente (rodar 2x não deve produzir erro nem sobrescrever um `origemTipo` já corrigido manualmente por um `UPDATE ... WHERE origem_tipo IS NULL`, nunca um `UPDATE` incondicional em toda a tabela) — item adicionado após revisão adversarial (ciclo 1, achado #5: acceptance criteria original não cobria reprodutibilidade/idempotência do script).

## Acceptance Criteria

- [ ] Schema Drizzle tem `leads.origemTipo` (enum `"inbound" | "outbound"`, `NOT NULL`)
- [ ] Formulário de lead (criação e edição) tem campo obrigatório para `origemTipo`, validado via Zod
- [ ] Submeter o formulário de criação sem `origemTipo` bloqueia o submit com erro visível
- [ ] Import CSV em lote atribui `origemTipo` a toda linha importada, sem passo de UI adicional no wizard (valor exato — sempre `"outbound"` ou condicionado à origem do lote — depende da decisão do usuário registrada em `08-INTENT-REVIEW.md`)
- [ ] `SELECT COUNT(*) FROM leads WHERE origem_tipo IS NULL` retorna 0 após o backfill
- [ ] As 33 linhas existentes (22 ativas + 11 soft-deletadas) têm `origem_tipo` preenchido após o backfill, confirmado por query direta — valor exato por linha (se uniformemente `"outbound"` ou diferenciado para as linhas `origem IN ("Teste","insta")`) depende da decisão do usuário registrada em `08-INTENT-REVIEW.md`
- [ ] Existe backup de `data/crm.db` datado de antes da migração, referenciado no commit/SUMMARY da fase
- [ ] Abrir o modal de edição de um lead pré-existente ativo (backfillado) mostra o `origemTipo` correto no controle do formulário
- [ ] Rodar o script de backfill uma segunda vez não altera nenhuma linha já classificada (idempotência verificada)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Meta e critério de sucesso já explícitos em ROADMAP.md §Phase 8 |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Out of scope já documentado em REQUIREMENTS.md (tabela `origens`, ORIGEM-03, motivoPerda) |
| Constraint Clarity | 0.78  | 0.65 | ✓      | Backup/push confirmados via STATE.md Blockers + precedente real das Fases 06/07 |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | Valores reais de `data/crm.db` consultados nesta sessão tornam os checks concretos (contagens exatas) |
| **Ambiguity**      | 0.17  | ≤0.20| ✓      | Gate atingido no assessment inicial — entrevista pulada |

## Interview Log

[auto] Ambiguidade inicial (Step 3), calculada após scouting profundo do codebase e query direta em `data/crm.db`, já atingiu o gate (0.17 ≤ 0.20, todos os mínimos batidos) — entrevista Socrática pulada, SPEC.md derivado diretamente da pesquisa. Decisões automáticas tomadas nesse scouting (registradas aqui para a revisão adversarial de intenção, Etapa 0-B):

| Fonte | Decisão `[auto]` | Evidência |
|-------|-------------------|-----------|
| Requirement 2 (novo, não estava explícito em nenhum artefato) | Import CSV precisa de default próprio de `origemTipo`, não coberto pelo formulário — decidido `"outbound"` fixo, sem passo de UI novo | `src/lib/csv-import.ts` não passa pelo `lead-form-dialog.tsx`; sem esse requisito, `origemTipo NOT NULL` quebraria o fluxo de import existente |
| Requirement 3 (backfill) | Valor de backfill = `"outbound"` para 100% das linhas, sem exceção/caso especial | Query direta confirmou 22/22 leads ativos com `origem = "Importação CSV"`; definição de Inbound/Outbound em `PROJECT.md`/todo original confirma que lote CSV do cowork = prospecção fria = Outbound; usuário ainda não roda tráfego pago |
| Boundaries | Granularidade de origem além do binário (ex. "Instagram Ads") fica fora de escopo | `REQUIREMENTS.md` Out of Scope já descartou a tabela `origens` governada, que era o veículo natural para granularidade — enum fechado de 2 valores é a decisão vigente |
| Constraints | Risco de `drizzle-kit push` com coluna `NOT NULL` é tratado como constraint conhecida, não pesquisa nova | Mesmo bug já documentado e contornado nas Fases 06-01/07-01 (`STATE.md` Decisions) |

---

*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Spec created: 2026-08-01*
*Next step: /gsd-discuss-phase 8 — decisões de implementação (nome exato do select, ordem de valores no enum Drizzle, se ALTER TABLE manual ou drizzle-kit push, etc.)*
