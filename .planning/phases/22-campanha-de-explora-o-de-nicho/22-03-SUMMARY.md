---
phase: 22-campanha-de-explora-o-de-nicho
plan: 03
subsystem: ui
tags: [zod, server-actions, react-hook-form, combobox, drizzle, base-ui]

# Dependency graph
requires:
  - phase: 22-campanha-de-explora-o-de-nicho
    provides: "tabela `campanhas` + coluna `leads.campanhaId` (22-01); UI de listagem/criação de campanha (22-02)"
  - phase: 11-metricas-e-motivos-perda
    provides: "idioma de campo opcional (z.preprocess vazio->undefined + `?? null` na Server Action) + molde nichoExists/motivoPerdaExists + combobox não-criável"
  - phase: 15-despivo-generico
    provides: "precedente `interesse` — 2º campo opcional de leadBaseSchema"
provides:
  - "campo opcional `campanhaId` em leadBaseSchema (FK nullable), OMITIDO em csvRowSchema"
  - "persistência de campanhaId em createLead/updateLead com gate `campanhaExists` (FK forjada) e override load-bearing de desvincular"
  - "src/components/campanha-combobox.tsx — combobox de campanhas ativas + opção 'Nenhuma campanha'"
  - "campo 'Campanha' no lead-form-dialog.tsx (seção Negócio, após Nicho), fiado nas 3 telas que abrem o dialog"
  - "CAMPANHA-03 marcado Complete em REQUIREMENTS.md"
affects: ["24 (PAINEL-01 agrega os leads vinculados a uma campanha — depende deste campo existir)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3º campo opcional de leadBaseSchema (campanhaId) seguindo o idioma z.preprocess vazio->undefined + override `?? null` na Server Action — sem `.refine` de obrigatoriedade (não condicional por stage, ao contrário de motivoPerdaId)"
    - "combobox não-criável com item-sentinela 'Nenhuma campanha' (NONE_VALUE = \"__nenhuma__\") para desvincular, mesma mecânica do item-sentinela de MotivoPerdaCombobox"
    - "prop `campanhas` DELIBERADAMENTE obrigatória (sem `= []`) — tsc prova que as 3 telas foram fiadas"

key-files:
  created:
    - src/components/campanha-combobox.tsx
  modified:
    - src/lib/validations.ts
    - src/actions/lead-actions.ts
    - scripts/test-lead-actions.cjs
    - src/components/lead-form-dialog.tsx
    - src/components/lead-table.tsx
    - src/components/followup-dashboard.tsx
    - src/components/pipeline-board.tsx
    - src/app/leads/page.tsx
    - src/app/page.tsx
    - src/app/pipeline/page.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "campanhaId NÃO ganha `.refine` de obrigatoriedade — vínculo opcional em qualquer etapa do funil, diferente de motivoPerdaId (condicional a stage=perdido)"
  - "campanhaId OMITIDO de csvRowSchema (`.omit`) — o CSV do cowork nunca traz campanha; fecha o vetor T-22-11 de injeção de FK pelo import"
  - "campanhaExists() PROPOSITALMENTE indiferente a deletedAt (mesmo precedente de nichoExists/motivoPerdaExists) — editar/salvar um lead cuja campanha foi soft-deletada não pode falhar sem o usuário mexer em nada"
  - "combobox filtra `deletedAt === null || id === value` — campanha removida continua visível se já vinculada ao lead editado"
  - "sem revalidatePath('/campanhas') nas actions de lead — nada em /campanhas lê leads nesta fase (evita código sem consumidor, IN-01 do 22-REVIEW)"

patterns-established:
  - "campanha-combobox.tsx: combobox de campanha reutilizável — rótulo 'nicho — oferta' via nichoNameById (mesmo idioma de campanha-list.tsx)"

requirements-completed: [CAMPANHA-03]

# Metrics
duration: 15min
completed: 2026-09-05
---

# Phase 22 Plan 03: Vínculo Lead → Campanha Summary

**Campo opcional "Campanha" no formulário de lead (combobox de campanhas ativas + "Nenhuma campanha") fiado nas 3 telas que abrem o dialog, com `campanhaId` persistido em createLead/updateLead sob gate de FK forjada e `nichoId` nunca afetado — fecha o único gap bloqueante da Fase 22 (SC3 / CAMPANHA-03).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05T14:16:19Z
- **Completed:** 2026-09-05T14:31:11Z
- **Tasks:** 3/3
- **Files modified:** 11 (1 criado)

## Accomplishments
- `campanhaId` opcional (FK nullable) em `leadBaseSchema`, omitido em `csvRowSchema` (T-22-11); `campanhaExists()` + gate antes de qualquer escrita em `createLead`/`updateLead` (T-22-10); override load-bearing `campanhaId: parsed.data.campanhaId ?? null` que materializa o desvincular
- `CampanhaCombobox` novo — campanhas ativas (`deletedAt === null || id === value`) + item-sentinela "Nenhuma campanha"; rótulo "nicho — oferta"
- Campo "Campanha" na seção "Negócio" do `lead-form-dialog.tsx`, logo após "Nicho" (SC3: vincular à campanha SEM perder o nicho geral), renderizado sempre (criar e editar)
- Prop `campanhas` obrigatória threadada por Server Component query (`db.select().from(campanhas)`, sem fetch client-side) nas 3 telas: `/leads` (LeadTable), `/` (FollowupDashboard), `/pipeline` (PipelineBoard)
- 6 novos casos automatizados no harness (`test:lead-actions` Casos 21-26): set / trocar A→B / limpar para NULL / id forjado rejeitado / `nichoId` intacto em todos / csvRowSchema sem campanha; + 2 asserções estáticas de fiação da persistência
- CAMPANHA-03 → `[x]` no checklist e `Complete` na Traceability de `REQUIREMENTS.md`

## Task Commits

Each task was committed atomically:

1. **Task 1: Contrato Zod + persistência de campanhaId nas Server Actions + harness** - `0c879de` (feat)
2. **Task 2: Combobox de campanha + campo no formulário de lead + fiação das 3 telas** - `746c988` (feat)
3. **Task 3: Fechar rastreabilidade de CAMPANHA-03 e rodar o gate completo** - `3f850fe` (docs)

_Task 1 tinha `tdd="true"` mas o harness `scripts/test-lead-actions.cjs` já existe — os novos casos foram adicionados e verificados no mesmo commit (mesmo padrão dos Casos 13/14 de `interesse`), sem ciclo RED/GREEN separado._

## Files Created/Modified
- `src/lib/validations.ts` - campo `campanhaId` (z.preprocess vazio->undefined) em `leadBaseSchema`; `campanhaId: true` no `.omit()` de `csvRowSchema`
- `src/actions/lead-actions.ts` - import `campanhas`; helper `campanhaExists()`; gate de FK forjada + `campanhaId: parsed.data.campanhaId ?? null` em `createLead` e `updateLead`
- `scripts/test-lead-actions.cjs` - seed de 2 campanhas no bootstrap; Casos 21-26; 2 asserções estáticas em `staticCheckFkWiring`
- `src/components/campanha-combobox.tsx` - **novo** — combobox não-criável de campanha com opção de desvincular
- `src/components/lead-form-dialog.tsx` - prop `campanhas` obrigatória; `defaultValues.campanhaId`; Field "Campanha" após "Nicho"
- `src/components/lead-table.tsx` / `followup-dashboard.tsx` / `pipeline-board.tsx` - prop `campanhas` no tipo + repassada ao `LeadFormDialog`
- `src/app/leads/page.tsx` / `page.tsx` / `pipeline/page.tsx` - `db.select().from(campanhas)` no Promise.all + prop threadada
- `.planning/REQUIREMENTS.md` - CAMPANHA-03 marcado concluído

## Decisions Made
Nenhuma decisão nova fora do que o plano já especificava — execução seguiu o contrato `<interfaces>`/`<action>` literalmente (moldes de `motivoPerdaId`/`interesse` em validations.ts e lead-actions.ts, `nicho-combobox.tsx`/`motivo-perda-combobox.tsx` para o combobox).

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

None. Todos os 6 gates verdes na primeira execução após cada tarefa.

## Verification Results (gate completo do repositório)

| Comando | Resultado |
|---------|-----------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (4 warnings pré-existentes `react-hooks/incompatible-library` em lead-table/lixeira-table — TanStack Table, fora de escopo) |
| `npm run build` | exit 0 (14 rotas, Turbopack, TypeScript em 83s) |
| `npm run test:lead-actions` | exit 0 — Casos 21-26 OK, `nichoId` intacto asserido em todos os casos de campanha |
| `npm run verify:schema` | exit 0 (`campanhas`/`campanha_id` íntegros; nenhuma mudança de schema neste plano) |
| `npm run guard:no-hard-delete` | exit 0 |

## Pendente de UAT humano (NÃO-BLOQUEANTE — host 4GB sem navegador nesta sessão)

Os 3 checks de UI do bloco `<verification>` do plano, para o verificador da fase não marcar como não-verificado o que só browser cobre:

- **a.** `/leads` → clicar numa linha → seção "Negócio" mostra "Campanha" logo abaixo de "Nicho"; escolher uma campanha e salvar → toast "Lead salvo com sucesso.", dialog fecha; reabrir o mesmo lead mostra a campanha escolhida e o nicho original inalterado.
- **b.** Reabrir o mesmo lead → escolher "Nenhuma campanha" e salvar → reabrir mostra o campo de campanha vazio e o nicho ainda inalterado.
- **c.** Abrir o dialog de lead pelo `/pipeline` e pelo dashboard `/` (Follow-ups) → o campo "Campanha" aparece nas duas telas com a mesma lista de campanhas.

## Known Stubs

Nenhum. O `CampanhaCombobox` renderiza a partir da prop `campanhas` alimentada por query real de Server Component; nenhum valor vazio hardcoded, nenhum placeholder de dado.

## Next Phase Readiness
- O vínculo lead→campanha existe de ponta a ponta (contrato Zod → Server Action → coluna `leads.campanha_id`) — a Fase 24 (PAINEL-01) já tem de onde tirar "os leads *dela*".
- Nenhum bloqueio conhecido. Achados secundários WR-01..WR-04 do `22-REVIEW.md` continuam fora de escopo (herdados, não bloqueiam).

---
*Phase: 22-campanha-de-explora-o-de-nicho*
*Completed: 2026-09-05*

## Self-Check: PASSED

Arquivo criado (`campanha-combobox.tsx`) e SUMMARY confirmados em disco; os 3 hashes de commit (0c879de, 746c988, 3f850fe) confirmados no git log.
