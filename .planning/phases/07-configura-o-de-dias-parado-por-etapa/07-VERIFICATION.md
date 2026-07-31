---
phase: 07-configura-o-de-dias-parado-por-etapa
verified: 2026-07-31T23:45:00Z
status: human_needed
score: 10/10 must-haves verified (programmatically), 6 items pending human visual confirmation
overrides_applied: 0
human_verification:
  - test: "Com a tabela `configuracoes` no estado padrão (Contatado=5, Novo/Negociação=999999, nenhum save do admin), abrir http://localhost:3000/pipeline e confirmar visualmente que nenhum card das colunas Novo e Negociação mostra o rótulo âmbar 'Esfriando' — só cards de Contatado podem aparecer destacados."
    expected: "Nenhum badge 'Esfriando' em Novo/Negociação; comportamento visual idêntico ao pré-deploy."
    why_human: "Requer renderização de CSS/JS no navegador (cor âmbar, posicionamento do badge por coluna) — não verificável por curl/grep do HTML estático. Evidência automatizada de apoio: contagem textual de 'Esfriando' no HTML confirmada em 0 com os defaults atuais, e leads reais parados 6+ dias em Novo não aparecem na contagem."
  - test: "Abrir http://localhost:3000/configuracoes e confirmar visualmente que o campo Contatado aparece preenchido com 5 e Novo/Negociação aparecem preenchidos com 999999 no primeiro acesso."
    expected: "Campos numéricos pré-preenchidos com 999999 / 5 / 999999."
    why_human: "react-hook-form usa inputs não controlados — o valor só aparece após hidratação client-side (não visível em HTML bruto via curl). Evidência automatizada de apoio: o payload RSC servido para o Client Component confirma `config={diasParadoNovo:999999,diasParadoContatado:5,diasParadoNegociacao:999999}`, e o banco vivo tem exatamente esses valores na linha id=1."
  - test: "Digitar 0 (ou um valor negativo) em qualquer campo de /configuracoes e clicar em salvar."
    expected: "Mensagem 'Mínimo de 1 dia.' aparece abaixo do campo; nada é persistido no banco."
    why_human: "Requer interação de formulário no navegador para observar a renderização do `FieldError`. Evidência automatizada de apoio: `configuracoesSchema.safeParse` testado diretamente via script — 0, negativo e não-numérico são rejeitados com a mensagem exata 'Mínimo de 1 dia.'."
  - test: "Salvar valores válidos (ex.: 2/3/4) em /configuracoes."
    expected: "Admin permanece na tela, os campos continuam mostrando os valores salvos, e aparece o toast 'Configurações salvas.'."
    why_human: "Toast (sonner) e permanência de estado do formulário são comportamento client-side não observável via HTTP puro. Evidência automatizada de apoio: leitura de código confirma ausência de `form.reset()`/navegação e presença do toast de sucesso condicionado a `state.success`."
  - test: "Após salvar novos limites (ex.: Novo=2, Negociação=2), abrir /pipeline e confirmar visualmente que cards das colunas Novo e Negociação agora exibem o badge 'Esfriando' quando aplicável."
    expected: "Destaque 'Esfriando' aparece nas colunas Novo e Negociação, respeitando os novos limites configurados."
    why_human: "Confirmação visual de que o badge aparece na coluna/card correto. Evidência automatizada de apoio: teste ao vivo nesta verificação alterou `configuracoes` para 1/1/1 e a contagem textual de 'Esfriando' no HTML subiu de 0 para 22 (config restaurada aos defaults ao final do teste)."
  - test: "Verificar que o item 'Configurações' no sidebar fica com destaque teal quando a rota /configuracoes está ativa."
    expected: "Item ativo com fundo/tom teal (`bg-[#0D9488]/10`, texto `text-[#0D9488]`)."
    why_human: "Estado visual condicional (`isActive`) do sidebar requer navegação real no navegador. Evidência automatizada de apoio: leitura de código confirma que o item '/configuracoes' usa a mesma lógica `isActive`/classes teal que os demais itens do `NAV_ITEMS`, sem alteração especial."
---

# Phase 07: Configuração de Dias-Parado por Etapa — Verification Report

**Phase Goal:** Admin define e ajusta, sem depender de código, quantos dias um lead pode ficar parado em cada etapa do funil antes de ser destacado como "esfriando"
**Verified:** 2026-07-31T23:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin acessa `/configuracoes` com formulário de dias-parado, um campo numérico por etapa (Novo, Contatado, Negociação) | ✓ VERIFIED | `src/app/configuracoes/page.tsx` renders `<ConfiguracoesForm config={config}/>`; `configuracoes-form.tsx` has 3 `<Input>` fields (`diasParadoNovo`/`diasParadoContatado`/`diasParadoNegociacao`) with labels "Novo"/"Contatado"/"Negociação". `curl http://localhost:3000/configuracoes` → HTTP 200. Sidebar link present and routes correctly. |
| 2 | Ao salvar novos valores, o board do pipeline passa a destacar leads "esfriando" usando os novos limites, para as 3 etapas — não só Contatado | ✓ VERIFIED | `src/app/pipeline/page.tsx` builds `limitesPorEtapa` from `getConfiguracoes()` covering `novo`/`contatado`/`negociacao`. Live runtime test performed during this verification: with `configuracoes` set to 1/1/1, `GET /pipeline` HTML contained 22 "Esfriando" occurrences vs 0 with the current defaults (999999/5/999999) — config restored after the test. |
| 3 | No primeiro acesso, Contatado pré-preenchido com 5, Novo/Negociação nunca esfriam antes do primeiro save (D-04 parity) | ✓ VERIFIED | Live DB inspection: `SELECT * FROM configuracoes` → `{id:1, dias_parado_novo:999999, dias_parado_contatado:5, dias_parado_negociacao:999999}`. RSC flight payload served to `ConfiguracoesForm` confirms the same values passed as `config` prop. Live pipeline check: leads #17–31 sitting 6+ days in `novo` are NOT flagged "Esfriando" under current defaults (count=0), confirming parity with pre-deploy behavior (only `contatado` ever flagged). |
| 4 | `getConfiguracoes()` implements getOrCreate (select id=1 → insert default row if missing) | ✓ VERIFIED | `src/db/queries.ts:68-76` — `select().where(eq(configuracoes.id,1))`, falls back to `insert(configuracoes).values({id:1}).returning()`. No hardcoded day values in the function body (relies on schema defaults). |
| 5 | `configuracoes` table exists in the live `./data/crm.db`, not just in the TS schema | ✓ VERIFIED | `PRAGMA table_info(configuracoes)` on the live DB returns exactly the 5 expected columns with `dflt_value` 999999/5/999999/(unixepoch), matching D-04. |
| 6 | Saving 0, negative, or non-numeric values is rejected server-side and nothing is persisted | ✓ VERIFIED | Direct `configuracoesSchema.safeParse()` test (run during this verification): `0` → rejected with `"Mínimo de 1 dia."`; `-1` → rejected; `"abc"` → rejected; `2/3/4` → accepted. `saveConfiguracoes` returns early with `{errors}` before any DB write on validation failure (code read). |
| 7 | Saving valid values persists via upsert (independent of prior seeding) and invalidates `/configuracoes` and `/pipeline` caches | ✓ VERIFIED | `src/actions/configuracoes-actions.ts` — `.insert(configuracoes).values({id:1,...}).onConflictDoUpdate({target: configuracoes.id, ...})`, followed by `revalidatePath("/configuracoes")` and `revalidatePath("/pipeline")`. No `db.update(...)` present. |
| 8 | Sidebar shows "Configurações" item (gear icon) after "Lixeira", linking to `/configuracoes` | ✓ VERIFIED | `src/components/app-sidebar.tsx` — `NAV_ITEMS` array has `{href:"/configuracoes", label:"Configurações", icon:Settings}` as the last entry, after `/lixeira`; `Settings` imported from `lucide-react`. |
| 9 | Pipeline "esfriando" calculation generalized to a stage→limit map; hardcoded `"contatado"`/`5` literal removed | ✓ VERIFIED | `src/app/pipeline/page.tsx` — no `stage === "contatado"` or literal `>= 5` remains; `limitesPorEtapa` intentionally omits `fechado`/`perdido`. `pipeline-board.tsx`/`pipeline-lead-card.tsx` unchanged (`git diff --stat` confirms zero changes to those files across the phase's commit range). |
| 10 | `npx tsc --noEmit` clean; no new Drizzle migration files generated | ✓ VERIFIED | `npx tsc --noEmit` → no output/errors. `src/db/migrations/` still contains only the 3 pre-existing migration files (`0000_gifted_slapstick`, `0001_grey_xavin`, `0002_backfill-fechado-perdido-split`) — no `configuracoes` migration added, consistent with the plan's documented `drizzle-kit push` approach. |

**Score:** 10/10 truths programmatically verified. 6 additional items require human visual/interactive confirmation (see below) — these were explicitly deferred by the executor to end-of-phase human verification (`human_verify_mode: end-of-phase`), per the `<human-check>` block in `07-02-PLAN.md` Task 3.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | `configuracoes` singleton table, defaults 999999/5/999999 | ✓ VERIFIED | Present, applied to live DB, defaults match D-04 exactly. |
| `src/lib/validations.ts` | `configuracoesSchema`, min 1 day per field | ✓ VERIFIED | 3× `"Mínimo de 1 dia."`, `ConfiguracoesFormValues` exported. |
| `src/db/queries.ts` | `getConfiguracoes()` getOrCreate | ✓ VERIFIED | Implemented as specified, `Configuracoes` type exported. |
| `src/actions/configuracoes-actions.ts` | `saveConfiguracoes` Server Action | ✓ VERIFIED | Upsert + dual revalidatePath, no try/catch (project convention). |
| `src/components/configuracoes-form.tsx` | Client form, react-hook-form + useActionState + toast | ✓ VERIFIED | 154 lines, all 3 fields, toast success/error wired, no `form.reset()`. |
| `src/app/configuracoes/page.tsx` | Server Component reading `getConfiguracoes()` | ✓ VERIFIED | 13 lines, async Server Component, renders form. |
| `src/components/app-sidebar.tsx` | Nav item "Configurações" | ✓ VERIFIED | Added after Lixeira, `Settings` icon. |
| `src/app/pipeline/page.tsx` | Generalized `limitesPorEtapa` calculation | ✓ VERIFIED | 4th `Promise.all` element, 3-stage map, no hardcoded literals. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `configuracoes-actions.ts` | `validations.ts` | `configuracoesSchema.safeParse` | ✓ WIRED | Confirmed by direct schema test + code read. |
| `configuracoes-actions.ts` | `/pipeline` | `revalidatePath("/pipeline")` | ✓ WIRED | Present, confirmed by code read. |
| `db/queries.ts` | `configuracoes` table | select + insert getOrCreate | ✓ WIRED | Confirmed against live DB (row already seeded with correct values). |
| `configuracoes/page.tsx` | `db/queries.ts` | `await getConfiguracoes()` | ✓ WIRED | Confirmed via RSC payload inspection (config values flow to client component). |
| `configuracoes-form.tsx` | `configuracoes-actions.ts` | `useActionState(saveConfiguracoes, undefined)` | ✓ WIRED | Confirmed by code read. |
| `pipeline/page.tsx` | `db/queries.ts` | `getConfiguracoes()` inside existing `Promise.all` | ✓ WIRED | Confirmed by code read + live runtime test (config change → "Esfriando" count change). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `configuracoes-form.tsx` | `config` prop → `defaultValues` | `getConfiguracoes()` in `configuracoes/page.tsx` | Yes — live DB row `{999999,5,999999}` confirmed via RSC flight payload | ✓ FLOWING |
| `pipeline/page.tsx` | `esfriandoLeadIds` | `getConfiguracoes()` + real `leads` table query | Yes — live runtime test showed count changes from 0 → 22 when config mutated | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/configuracoes` responds and serves real config data | `curl http://localhost:3000/configuracoes` | HTTP 200; RSC payload contains `{diasParadoNovo:999999,diasParadoContatado:5,diasParadoNegociacao:999999}` | ✓ PASS |
| `/pipeline` responds | `curl http://localhost:3000/pipeline` | HTTP 200 | ✓ PASS |
| Pipeline reacts to config changes (all 3 stages) | Live DB mutation (config→1/1/1) + `fetch('/pipeline')`, then restore | "Esfriando" count: 0 (defaults) → 22 (limits=1); config restored to 999999/5/999999 afterward | ✓ PASS |
| Parity before any admin save (D-04) | Inspect real leads stuck 6+ days in `novo` under current (default) config | 0 "Esfriando" occurrences in `/pipeline` HTML despite leads #17–31 sitting 6+ days in `novo` | ✓ PASS |
| `configuracoesSchema` rejects invalid input | `npx tsx` script calling `configuracoesSchema.safeParse({...})` directly | `0`→rejected ("Mínimo de 1 dia."), `-1`→rejected, `"abc"`→rejected, `2/3/4`→accepted | ✓ PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | No errors | ✓ PASS |
| Lint clean on new component | `npx eslint src/components/configuracoes-form.tsx` | 0 errors, 1 unrelated pre-existing warning (unused eslint-disable for exhaustive-deps) | ✓ PASS |

### Probe Execution

No dedicated `scripts/*/tests/probe-*.sh` files exist for this phase and none were declared in PLAN/SUMMARY. SKIPPED (no formal probe scripts — the plan instead embeds `node -e` runtime verification scripts directly in each task's `<verify>` block, which were re-executed manually in this verification via equivalent live-runtime checks above).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| CONFIG-01 | 07-01, 07-02 | Admin acessa `/configuracoes` para definir dias parado por etapa | ✓ SATISFIED | Route, form, sidebar link, and Server Action all present and wired. |
| CONFIG-02 | 07-01, 07-02 | Config substitui o hardcode (5 dias, só Contatado) sem mudar comportamento no dia do deploy | ✓ SATISFIED | Hardcoded literal removed from `pipeline/page.tsx`; live DB defaults (999999/5/999999) confirmed to reproduce pre-deploy behavior exactly (0 flagged leads in Novo despite 6+ days stuck). |

No orphaned requirements — REQUIREMENTS.md maps exactly CONFIG-01 and CONFIG-02 to Phase 7, both declared in plan frontmatter and both satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/db/queries.ts` | 68-76 | `getConfiguracoes()` seeding path uses a plain `insert()` without `onConflictDoNothing()`/`onConflictDoUpdate()` (unlike the sibling `saveConfiguracoes()`, which explicitly uses upsert for the same reason) | ⚠️ WARNING (info, per 07-REVIEW.md WR-01) | Theoretical race: two concurrent first-ever calls to `getConfiguracoes()` (e.g. sidebar `<Link>` prefetch hitting both `/pipeline` and `/configuracoes` before the singleton row is ever seeded) could throw an unhandled `UNIQUE constraint failed`. Low real-world severity for this solo-admin, single-writer, local SQLite app (per project CLAUDE.md constraints and task framing) — no observed occurrence in this verification (the row was already seeded and stable across all live tests performed). Does not block any of the phase's observable truths or success criteria. Recommend applying the `onConflictDoNothing()` fix from `07-REVIEW.md` as low-cost hardening in a follow-up, but not gating this phase's goal achievement. |

No `TODO`/`FIXME`/`XXX`/`TBD`/`HACK`/`PLACEHOLDER` markers found in any of the phase's modified files. No empty/stub implementations found.

### Human Verification Required

See YAML frontmatter `human_verification` for the full structured list. Summary:

1. **Pipeline pre-save parity (visual)** — confirm no "Esfriando" badge in Novo/Negociação columns before any admin save.
2. **Config form pre-fill (visual)** — confirm Contatado shows 5, Novo/Negociação show 999999 on first load.
3. **Validation error UI (interactive)** — confirm "Mínimo de 1 dia." error message renders and blocks persistence when 0/negative is submitted.
4. **Save success UX (interactive)** — confirm toast "Configurações salvas." appears and form stays populated after a valid save.
5. **Post-save pipeline highlight (visual)** — confirm "Esfriando" badges appear in Novo/Negociação columns after saving new limits.
6. **Sidebar active state (visual)** — confirm the "Configurações" nav item shows teal highlight when active.

All 6 items were already explicitly flagged by the executor (07-02-SUMMARY.md, "Itens do `<human-check>` para verificação humana de fim de fase") as deferred to this end-of-phase verification step (`human_verify_mode: end-of-phase`), consistent with `07-02-PLAN.md` Task 3's `<human-check>` block. Strong automated/live-runtime corroborating evidence was gathered for all 6 during this verification (see "why_human" field of each item) — no contradicting evidence was found for any of them — but final confirmation requires actual browser interaction (CSS rendering, toast animation, focus/hover state) that cannot be captured via `curl`/static analysis alone.

### Gaps Summary

No blocking gaps found. All 10 must-have observable truths are verified against the live codebase and live database, including direct runtime evidence (not just static code reading) for the two highest-risk items: (a) the board actually reacts to configured limits across all 3 stages, and (b) pre-save behavior is byte-for-byte identical to the pre-deploy hardcoded rule (0 leads flagged in Novo/Negociação despite real leads stuck 6+ days there).

One non-blocking code-quality finding (WR-01, race condition in `getConfiguracoes()` seeding) was already surfaced by the phase's own code review with WARNING severity and is not classified as a blocker here for the same reasons: single-admin local app, no observed failure, and it does not affect any of the phase's observable truths.

Status is `human_needed` (not `passed`) solely because 6 visual/interactive checks — already anticipated and deferred by the plan itself — remain outstanding. This is the correct application of the escalation gate: automated evidence strongly supports all 6, but final sign-off requires a human to open the browser.

---

_Verified: 2026-07-31T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
