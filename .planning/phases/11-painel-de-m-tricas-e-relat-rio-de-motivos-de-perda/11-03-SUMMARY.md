---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
plan: 03
subsystem: ui
tags: [zod, server-actions, drizzle, dnd-kit, combobox-criavel, use-optimistic, next-app-router]

requires:
  - phase: 11-01
    provides: "tabela motivosPerda + FK leads.motivoPerdaId + motivoPerdaSchema + tipo MotivoPerda"
  - phase: 11-02
    provides: "createMotivoPerda devolve { success: true; id } — pré-requisito de D-03"
provides:
  - "MotivoPerdaCombobox — combobox pesquisável com criação-na-hora (src/components/motivo-perda-combobox.tsx), primeiro 'combobox criável' do projeto"
  - "D-04 autoritativo no servidor: .refine condicional (stage perdido => motivoPerdaId) em leadSchema e stageUpdateSchema, mensagem verbatim 'Selecione o motivo da perda.'"
  - "motivoPerdaExists() + backstop de FK em createLead/updateLead/updateLeadStage"
  - "As 2 superfícies reais de captura migradas de texto livre para lista governada: formulário de edição do lead e modal de drag no board"
  - "Modal de drag obrigatório com 'Cancelar' que reverte o drag (useOptimistic) sem chamar o servidor"
  - "Gate permanente npm run verify:motivo-perda (scripts/verify-motivo-perda-obrigatorio.cjs)"
  - "Coluna morta leads.motivoPerda (texto) removida da declaração Drizzle"
affects: [11-05]

tech-stack:
  added: []
  patterns:
    - "Combobox criável: item de ação 'Criar \"{query}\"' entra na própria lista `items` (condicionalmente), createMotivoPerda chamado direto dentro de useTransition, seleção pelo id retornado"
    - "z.preprocess normaliza '' / null → undefined em FK opcional cujo input nativo oculto emite string vazia"
    - "Modal não-dispensável: onOpenChange interceptado com eventDetails.cancel() (idioma de lead-form-dialog.tsx) — clique fora/Esc não resolvem o drag"

key-files:
  created:
    - src/components/motivo-perda-combobox.tsx
    - scripts/verify-motivo-perda-obrigatorio.cjs
  modified:
    - src/lib/validations.ts
    - src/db/schema.ts
    - src/actions/lead-actions.ts
    - src/components/lead-form-dialog.tsx
    - src/components/lead-table.tsx
    - src/app/leads/page.tsx
    - src/components/followup-dashboard.tsx
    - src/app/page.tsx
    - src/components/motivo-perda-dialog.tsx
    - src/components/pipeline-board.tsx
    - src/app/pipeline/page.tsx
    - scripts/test-lead-actions.cjs
    - package.json

key-decisions:
  - "leadBaseSchema (objeto não-refinado) extraído para csvRowSchema poder usar .omit(); leadSchema = leadBaseSchema + .refine condicional D-04"
  - "motivoPerdaId em leadSchema usa z.preprocess('' → undefined) — o input oculto do combobox emite '' quando nada é selecionado, e z.coerce.number() transformaria isso em 0 com mensagem genérica"
  - "motivoPerdaExists também em updateLeadStage (o plano só citava createLead/updateLead) — updateLeadStage não tem try/catch de FK, a checagem pré-escrita é a única mitigação de T-11-13 nesse caminho"
  - "prop motivosPerda threadada por TODAS as 4 superfícies do LeadFormDialog (pipeline, /leads, dashboard /), não só a do pipeline — prop obrigatória, tsc exige"

requirements-completed: [PERDA-01]

duration: ~45min
completed: 2026-08-27
---

# Fase 11 Plano 03: Motivo de Perda Governado e Obrigatório nas 2 Superfícies Summary

**Troca da captura de motivo de perda de texto livre opcional para seleção obrigatória de uma lista governada (D-03 + D-04), nas duas superfícies reais — formulário de edição do lead e modal de drag no board — com a obrigatoriedade reforçada de forma autoritativa no servidor via `.refine` condicional do Zod, e a coluna morta `leads.motivoPerda` (texto) fora do schema Drizzle.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3
- **Files:** 15 (2 criados, 13 modificados)

## Accomplishments

- **`MotivoPerdaCombobox`** (`src/components/motivo-perda-combobox.tsx`, ~160 linhas): shell copiado de `subnicho-combobox.tsx`, MESMO filtro anti-soft-delete `deletedAt === null || id === value`, input nativo oculto via `name="motivoPerdaId"`. Novidade: quando o texto digitado (trim + case-insensitive) não casa com nenhum motivo, a última linha da lista vira a ação `Criar "{query}"` (ícone `Plus` + texto `text-[#0D9488]`); selecioná-la chama `createMotivoPerda` DIRETO dentro de `useTransition`, e no sucesso usa o `id` devolvido para já selecionar o motivo. Erro mantém o popup aberto com mensagem `text-sm text-[#DC2626]`. Sem `useActionState` (precisa do retorno síncrono da promessa).
- **Contratos Zod (D-04):** `leadBaseSchema` (objeto puro) + `leadSchema = leadBaseSchema.refine(stage !== "perdido" || motivoPerdaId != null, { path: ["motivoPerdaId"], message: "Selecione o motivo da perda." })`. Mesmo `.refine` em `stageUpdateSchema`. `csvRowSchema` passa a derivar de `leadBaseSchema` com `motivoPerdaId` omitido (CSV nunca traz motivo). `motivoPerda: z.string()` eliminado dos dois lugares.
- **Servidor autoritativo:** `motivoPerdaExists(id)` (cópia de `subnichoExists`, indiferente a `deletedAt`); gate em `createLead`/`updateLead`/`updateLeadStage` quando `stage === "perdido"`; backstop `isForeignKeyViolation` estendido a `motivo_perda_id`; `updateLeadStage(id, stage, motivoPerdaId?: number)`. Idioma condicional-por-VALOR-ALVO grava `null` sempre que o destino não é "perdido" (tirar um lead de Perdido limpa o motivo).
- **`schema.ts`:** coluna `motivoPerda: text("motivo_perda")` removida da declaração Drizzle (coluna física preservada no banco — reversibilidade).
- **Formulário de lead:** `<Textarea id="motivoPerda">` → `<MotivoPerdaCombobox>` dentro de `<Controller name="motivoPerdaId">`, ajuda VERBATIM `Por que esse lead foi perdido.`, `<FieldError>` lê `errors.motivoPerdaId`. Prop `motivosPerda` nova threadada pelas 4 superfícies do `LeadFormDialog` (pipeline, `/leads`, dashboard `/`).
- **Modal de drag:** reescrito — combobox obrigatório, botão `Cancelar` (`variant="outline"`) que reverte o drag, sem "Pular", `showCloseButton={false}` + `onOpenChange` interceptado com `eventDetails.cancel()` (clique fora / Esc não fecham nem resolvem). `pipeline-board.tsx`: resolver da fila tipado `number | null` (`null` = cancelado); `cancelMotivoPerda()` resolve com `null` e `handleDragEnd` RETORNA antes de `updateLeadStage` — o estado base nunca muda e o `useOptimistic` reverte o card sozinho. Sem toast de sucesso nesse caminho.
- **Gate permanente** `npm run verify:motivo-perda`: PARTE A (Zod puro — as 3 asserções × 2 schemas + caso de string vazia + mensagem verbatim) e PARTE B (fonte real — idioma condicional-por-valor-alvo em updateLead/updateLeadStage, presença de `motivoPerdaExists`, grep negativo de `Textarea`/`onSkip`/`Pular` no modal e de `.motivoPerda` em todo `src/`).

## Task Commits

1. **Task 1: MotivoPerdaCombobox** — `975ebc7` (feat)
2. **Task 2: contratos Zod + servidor + form de lead** — `fc2ef31` (feat)
3. **Task 3: modal de drag obrigatório + Cancelar reverte + gate D-04** — `74c0f13` (feat)

**Plan metadata:** (este commit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `scripts/test-lead-actions.cjs` já estava vermelho após 11-01**
- **Found during:** Task 3 (gate `npm run test:lead-actions`)
- **Issue:** O plano 11-01 adicionou `motivoPerdaId` ao `schema.ts` mas nunca atualizou o `manualAlters` do harness — o banco temporário não tinha `motivos_perda` nem `leads.motivo_perda_id`, e `countLeads()` (`db.select().from(leads)`, lista TODAS as colunas do schema) explodia com `no such column: motivo_perda_id` **antes** deste plano.
- **Fix:** `CREATE TABLE IF NOT EXISTS motivos_perda (...)` + `ALTER TABLE leads ADD motivo_perda_id integer REFERENCES motivos_perda(id)` no `manualAlters` (mesmo idioma dos demais ALTERs, tolerante a "duplicate column name").
- **Files modified:** scripts/test-lead-actions.cjs
- **Commit:** `74c0f13`

**2. [Rule 3 - Blocking / Rule 2] prop `motivosPerda` threadada por 3 superfícies fora da lista do plano**
- **Found during:** Task 2/3
- **Issue:** `LeadFormDialog` é renderizado em 4 lugares (`pipeline-board`, `lead-table` + `/leads`, `followup-dashboard` + `/`). O plano só citava a superfície do pipeline. Com `motivosPerda` obrigatória, `npx tsc --noEmit` falharia no fim da Task 3. Rule 2 também: a human-check passo 8 exige abrir um lead perdido pelo formulário de `/leads` e ver o combobox com o motivo selecionado.
- **Fix:** `lead-table.tsx` / `followup-dashboard.tsx` ganham a prop e repassam; `/leads/page.tsx` e `/page.tsx` (dashboard) ganham `db.select().from(motivosPerda)` no `Promise.all` (sem filtro de `deletedAt`, espelhando o array de sub-nichos).
- **Files modified:** src/components/lead-table.tsx, src/app/leads/page.tsx, src/components/followup-dashboard.tsx, src/app/page.tsx
- **Commit:** `fc2ef31`

**3. [Rule 2 - Threat mitigation T-11-13] `motivoPerdaExists` também em `updateLeadStage`**
- **Found during:** Task 2
- **Issue:** O texto do plano só citava `createLead`/`updateLead` para a checagem de existência. Mas `updateLeadStage` não tem try/catch de FK — um `motivoPerdaId` forjado apontando para um id inexistente bateria na FK `onDelete: "restrict"` e derrubaria a Server Action com erro não tratado (500). O threat register (T-11-13) tem disposição `mitigate` e cita explicitamente `updateLeadStage(id, "perdido")`.
- **Fix:** gate `motivoPerdaExists` ANTES da escrita em `updateLeadStage` quando `stage === "perdido"`.
- **Files modified:** src/actions/lead-actions.ts
- **Commit:** `fc2ef31`

**4. [Rule 2] `z.preprocess` em `leadSchema.motivoPerdaId`**
- **Found during:** Task 2
- **Issue:** O input nativo oculto do `<MotivoPerdaCombobox>` emite string vazia `""` quando nada está selecionado. Sem tratamento, `z.coerce.number()` transforma `""` em `0`, `.positive()` reprova com a mensagem genérica do Zod — não a copy de D-04 exigida pelas must-haves.
- **Fix:** `z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional())` — `""`/`null` viram `undefined`, o `.refine` então dispara a mensagem verbatim de D-04. Coberto pela PARTE A do gate (`leadSchema: motivoPerdaId "" cai na mesma mensagem de D-04`).
- **Files modified:** src/lib/validations.ts
- **Commit:** `fc2ef31`

**5. [Rule 1] `createLead` também zera `motivoPerdaId` quando `stage !== "perdido"`**
- **Found during:** Task 2
- **Issue:** O plano citava a atribuição condicional só nas linhas de `updateLead`/`updateLeadStage`. `createLead` fazia `.values({ ...parsed.data })` cru — um `motivoPerdaId` forjado com `stage: "novo"` seria persistido.
- **Fix:** mesma atribuição condicional-por-valor-alvo após o spread no insert de `createLead`.
- **Files modified:** src/actions/lead-actions.ts
- **Commit:** `fc2ef31`

---

**Total deviations:** 5 auto-fixed (2 blocking, 3 correctness/segurança). Nenhuma mudança arquitetural. Sem scope creep — os 4 arquivos extras da deviation 2 são threading de prop, não lógica nova.

## Issues Encountered

- `react-hooks/preserve-manual-memoization` (React Compiler) reclamou de `query.trim()` listado como dep de `useMemo` no combobox — resolvido inlinando o derivado (o React Compiler já memoiza), sem `eslint-disable`. Mesma classe de falso-positivo já registrada em STATE.md, mas aqui deu pra evitar a supressão.

## Known Stubs

Nenhum. `MotivoPerdaCombobox` é totalmente ligado (`motivosPerda` vem de `db.select()` real em todas as páginas; `createMotivoPerda` é a Server Action real de 11-02).

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. T-11-12 (bypass de D-04) mitigado pelo `.refine` server-side (gate PARTE A prova); T-11-13 (FK forjada) mitigado por `motivoPerdaExists` + backstop `isForeignKeyViolation` nos 3 pontos de escrita; T-11-16 (drag órfão) mitigado pelo modal não-dispensável + fila `motivoQueueRef` que sempre resolve exatamente uma promessa.

## Gates (exit codes)

| Gate | Exit |
|------|------|
| `npx tsc --noEmit` | 0 |
| `npx eslint` (motivo-perda-combobox / motivo-perda-dialog / pipeline-board / lead-form-dialog / validations / lead-actions / pipeline page) | 0 (1 warning pré-existente `react-hooks/incompatible-library` em `form.watch`/`useReactTable`, fora de escopo) |
| `npm run verify:motivo-perda` | 0 (21 asserções) |
| `npm run test:lead-actions` | 0 |
| `npm run test:motivo-perda-actions` | 0 |
| `npm run test:interacao-actions` | 0 |
| `npm run verify:sequencia` | 0 |
| `npm run verify:origem-tipo` | 0 |
| `npm run guard:no-hard-delete` | 0 |
| `npm run verify:schema` | 0 |

Teste de mutação do gate: reintroduzir `onSkip` numa cópia de `motivo-perda-dialog.tsx` faz a PARTE B acusar (verificado em scratch, sem tocar o arquivo real).

## Human-check (end-of-phase)

Os 10 passos do `<human-check>` da Task 3 (navegador: modal sem "Pular"/X, Cancelar reverte o card, criação-na-hora em teal, campo no formulário de `/leads`, multi-drag um por vez) **não executados** — sessão headless, `human_verify_mode: end-of-phase`. `npm run build` não rodado (host 4GB RAM; `npx tsc --noEmit` isolado limpo — precedente Fases 06–10).

## Next Phase Readiness

- **11-04 / 11-05** podem agregar `leads.motivoPerdaId` (`GROUP BY` + join `motivosPerda.nome`) — a captura de dado real de PERDA-01 agora existe nas duas superfícies. `revalidatePath("/relatorios")` já é disparado por todas as mutações de motivo (11-02) e de lead.

## Self-Check: PASSED

- `src/components/motivo-perda-combobox.tsx` e `scripts/verify-motivo-perda-obrigatorio.cjs` confirmados em disco
- Commits `975ebc7`, `fc2ef31`, `74c0f13` confirmados em `git log`
- `npx tsc --noEmit` exit 0; `npm run verify:motivo-perda` exit 0

---
*Phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda*
*Completed: 2026-08-27*
