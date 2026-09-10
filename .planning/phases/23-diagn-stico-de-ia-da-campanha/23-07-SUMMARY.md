---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 07
subsystem: ui
tags: [react, server-component, client-component, useActionState, diagnostico, campanha]

requires:
  - phase: 23-diagn-stico-de-ia-da-campanha
    provides: "gerarDiagnosticoAction (23-04 Task 1); DiagnosticoResultado (23-05); tabela diagnosticos (23-02)"
provides:
  - "GerarDiagnosticoButton (Client) — useActionState, pending, toast, zero disparo automático"
  - "DiagnosticoSecao (Server) — query das gerações, decisão vazio/resultado/erro, histórico read-only"
  - "/campanhas/[id] com maxDuration=120 + a seção de diagnóstico como último bloco"
affects: [24 (Veredito consome a mesma página); nenhum outro plano da fase 23]

tech-stack:
  added: []
  patterns:
    - "useActionState + FormData de 1 campo dentro de startTransition (idioma campanha-form-dialog)"
    - "Server Component decide estado por status + safeParse; aviso nunca entra na condicional (D-23-07)"
    - "Histórico via <details>/<summary> nativo — nenhum primitivo accordion adicionado"
    - "re-validação do payload lido do banco com diagnosticoSchema.safeParse (Pitfall 11)"

key-files:
  created:
    - src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx
    - src/components/diagnostico-secao.tsx
  modified:
    - src/app/campanhas/[id]/page.tsx

key-decisions:
  - "23-07 executado FORA de subagente (limite de sessão 429 do Claude Code). O plano é 100% UI + leitura de banco — nenhuma chamada de API — então o orquestrador fez as 3 tasks inline, mesmo padrão de 23-05."
  - "23-07 rodado ANTES do 23-04 Task 3 (spike) estar completo. Justificativa: 23-07 não toca `gerar-diagnostico.ts` (o único arquivo que o spike ajusta) e não faz chamada de API. A ordem de dependência do ROADMAP existe para o UAT, não para o build."
  - "eslint-disable-next-line de exhaustive-deps removido do useEffect do botão — o react-hooks plugin não reclamou (diferente do analog campanha-form-dialog); manter a directive gerava warning de 'unused directive'."

patterns-established:
  - "Botão de ação cara: pending desabilita + spinner + aviso de custo em caption; nunca auto-dispara"
  - "Seção de resultado de IA: último diagnóstico por extenso, anteriores num <details> read-only, falhas incluídas"

requirements-completed: []
requirements-partial: [DIAGNOSTICO-01, DIAGNOSTICO-02, DIAGNOSTICO-10]

duration: 25min
completed: 2026-09-10
---

# Phase 23 Plan 07: Seção de Diagnóstico na Página da Campanha Summary

**A seção "Diagnóstico de IA" em `/campanhas/[id]` — botão explícito de geração (client, `useActionState`, pending com aviso de custo, toast), os 3 estados (vazio / resultado / erro) decididos por `status` + `safeParse`, e o histórico read-only de todas as gerações. `maxDuration = 120` na rota. Sem rota nova, sem tocar o layout da Fase 22.**

## Performance

- **Duration:** ~25 min (inline, orquestrador)
- **Completed:** 2026-09-10
- **Tasks:** 3
- **Files:** 2 criados + 1 estendido

## Accomplishments

- **`src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx`** (Client) — `useActionState(gerarDiagnosticoAction, undefined)`, envio de `FormData` de 1 campo (`campanhaId`) dentro de `startTransition`. Rótulos: "Gerar diagnóstico" (acento, sem diagnóstico) / "Gerar novo diagnóstico" (`variant="outline"`) / "Gerando diagnóstico…" (disabled + `Loader2 animate-spin`) / prop `rotulo` sobrescreve ("Tentar de novo"). Bloco de pending `bg-muted` com "Isto faz buscas na web e custa uma chamada de API. Não feche a página." Caption de custo quando já existe diagnóstico. `useEffect([state])` → `toast.success("Diagnóstico gerado.")` + `scrollIntoView` no `#diagnostico-secao-titulo`, ou `toast.error(...)`. **Nenhum `useEffect` dispara a action** (DIAGNOSTICO-01). Importa só a Server Action, nunca `@/lib/ai/*` (T-23-01).
- **`src/components/diagnostico-secao.tsx`** (Server, async) — 1 `SELECT` em `diagnosticos` por `campanhaId` ordenado por `criadoEm` desc. `ultima = linhas[0]`, `anteriores = linhas.slice(1)`. `diagnosticoSchema.safeParse(ultima.payload)` quando `status === "ok"` (Pitfall 11). Decisão de estado olha **só** `status` + `parsed.success` — `aviso` nunca aparece numa condicional (D-23-07). Estados: VAZIO (borda tracejada + copy VERBATIM + CTA), RESULTADO (`<DiagnosticoResultado>` com `buscas` + `aviso`), ERRO (`border-destructive/50 bg-destructive/10`, motivo de `erro`, data, "Tentar de novo"). Histórico: `<details>` com "Ver gerações anteriores ({n})" → lista `font-mono text-xs` read-only, falhas incluídas.
- **`src/app/campanhas/[id]/page.tsx`** — `export const maxDuration = 120` (com comentário; `runtime` NÃO declarado — Node default exigido por `better-sqlite3`, Pitfall 7). `<DiagnosticoSecao campanhaId={campanhaId} />` como último filho do `flex flex-col gap-6`. Diff: **9 inserções, 0 remoções** — `<h1>`, badge, `<dl>` e `notFound()` intactos.

## Task Commits

1. **Task 1: Botão client de geração** - `1288755` (feat)
2. **Task 2: DiagnosticoSecao — estado e histórico** - `d96db06` (feat)
3. **Task 3: Anexar a seção + maxDuration** - `14dc4fe` (feat)

## Files Created/Modified

- `src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx` - Botão + pending + toast (Client)
- `src/components/diagnostico-secao.tsx` - Query + decisão de estado + histórico (Server)
- `src/app/campanhas/[id]/page.tsx` - `maxDuration` + `<DiagnosticoSecao>` no fim (+9 linhas)

## Decisions Made

- **Execução inline, fora de subagente.** O limite de sessão do Claude Code (429, reset 13:50 BRT) bloqueia executores. Como o plano é 100% UI + leitura de banco (nenhuma chamada de API), o orquestrador fez as 3 tasks inline — mesmo padrão adotado na 23-05.
- **23-07 antes do 23-04 Task 3.** O spike (23-04 Task 3) está bloqueado em saldo Anthropic. 23-07 foi feito antes porque não toca `gerar-diagnostico.ts` (o único arquivo que o spike ajusta) nem faz chamada de API — a ordem do ROADMAP existe para o UAT, não para o build.
- **`eslint-disable` de `exhaustive-deps` removido.** O react-hooks plugin não reclamou do `useEffect([state])` do botão (diferente do analog); manter a directive gerava warning de "unused directive".

## Deviations from Plan

- **Ordem de execução** (acima) — 23-07 antes de 23-04 Task 3. Sem impacto no código: arquivos disjuntos.
- Nenhuma divergência de conteúdo dos componentes em relação ao 23-UI-SPEC / `<interfaces>`.

## Issues Encountered

- Limite de sessão (429) impede spawn de executores desde ~13:30 BRT. Contornado com execução inline.

## User Setup Required

**Nenhum para o build/lint deste plano.** Mas o **UAT da fase** (gerar um diagnóstico de verdade em `/campanhas/[id]`) e o **23-04 Task 3** (spike) continuam bloqueados em **saldo de créditos na Anthropic** — Console → Plans & Billing, workspace `wrkspc_01DV6kbx2RESjCE4BLEobsTv`, ~US$5.

## Next Phase Readiness

- **Código da Fase 23 completo** exceto: 23-04 Task 3 (spike / D-23-04), 23-06 (eval gold-set) — ambos precisam de créditos.
- Ao adicionar créditos: `/gsd-execute-phase 23` retoma no 23-04, roda o spike, depois 23-06, e então a fase vai à verificação (`gsd-verifier`).
- UAT humano pendente: fluxo completo do botão em `/campanhas/[id]` (vazio → gerar → pending → resultado → regenerar → histórico), claro e escuro.

## Self-Check: PASSED

- 2 arquivos criados + `page.tsx` estendido, conferidos em disco.
- Commits `1288755`, `d96db06`, `14dc4fe` presentes.
- Gates: `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (4 warnings pré-existentes em `lixeira-table.tsx`, fora de escopo); `npm run build` (Turbopack) exit 0, 14 rotas; `npm run verify:schema` OK; `npm run guard:no-hard-delete` OK; `npm run check:contrast` 30/30; `npm run test:diagnostico-estrutural` verde.
- Greps de aceitação: Task 1 → 7 literais de copy presentes, `startTransition` ≥1, `buscando: ` = 0, `@/lib/ai/gerar-diagnostico` = 0, `"use client"` na 1ª linha. Task 2 → `safeParse` = 1, `id="diagnostico-secao-titulo"` = 1, `use client` = 0, hex = 0, `accordion` = 0, 5 literais presentes. Task 3 → `maxDuration = 120` = 1, `runtime` = 0, `DiagnosticoSecao` = 2, diff só-adição.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-10*
