---
phase: 12-agenda-tarefas-soltas
verified: 2026-08-30T01:15:00Z
status: passed
score: 3/3 success criteria verified (code + build + UAT)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
deferred: []
decision_coverage:
  honored: 8
  total: 8
  not_honored: []
---

# Phase 12 — Verification: Agenda / Tarefas Soltas

**Goal (ROADMAP):** Admin registra um compromisso ou lembrete que não está amarrado a nenhum lead e ainda assim recebe destaque de urgência igual aos follow-ups de lead.

**Verdict:** `passed` *(promovido — ver § Promoção de status)* — 3/3 success criteria verificados na camada de código, dados, build e teste automatizado. Fase é user-facing → itens de verificação humana existem; **cobertos pela UAT de navegador** (`12-UAT.md` `status: complete`, 14/15 pass, 0 issues, 1 skip aceito pelo humano no fechamento).

---

## Goal Achievement (Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| 1 | Admin cria tarefa avulsa com data + descrição, sem vincular a lead | ✓ VERIFIED | `tarefaSchema` (`validations.ts:229-232`) tem só `descricao` + `data`, zero campo de lead; `createTarefa` (`tarefa-actions.ts`) insere em `tarefas` (tabela sem FK — `schema.ts`, 12-01). UAT Testes 2/4: dialog "Nova tarefa" com exatamente 2 campos, criação → toast "Tarefa criada." + card no dashboard. |
| 2 | Tarefas no dashboard agrupadas por urgência, mesma régua dos follow-ups de lead | ✓ VERIFIED | `buildDashboardItems` (`queries.ts:113`) funde leads + tarefas e chama `groupByUrgency<T>` — a MESMA função pura que bucketiza follow-ups de lead (`groupLeadsByUrgency` virou wrapper). `test:group-by-urgency` prova identidade wrapper↔genérico. UAT Testes 4/5/8: tarefa de hoje→Hoje, de ontem→Vencidos, contagem "· N" soma os dois tipos (Vencidos 23→24). |
| 3 | Tarefas distinguíveis dos leads no mesmo agrupamento, sem tela/rota separada | ✓ VERIFIED | `TarefaCard` reusa VERBATIM o container do card de lead (`rounded-lg border border-zinc-200 bg-white p-4`); distinção por subtração (sem categoria/selo/WhatsApp/sugestão) + ícone `ListTodo` (D-03) — asserção de fonte no plano. `npm run build` lista as mesmas 13 rotas de antes da fase; menu lateral inalterado. UAT Testes 6/15. |

**Score: 3/3.**

---

## Artifact Verification

| Artifact | Exists | Substantive | Wired | Status |
|----------|--------|-------------|-------|--------|
| `src/db/schema.ts` (tabela `tarefas`) | ✓ | ✓ | ✓ (migração rodada, `verify:schema` exit 0) | ✓ VERIFIED |
| `src/lib/validations.ts` (`tarefaSchema`/`tarefaUpdateSchema`) | ✓ | ✓ | ✓ (consumido por actions + form) | ✓ VERIFIED |
| `src/types/index.ts` (`Tarefa`/`NewTarefa`) | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/actions/tarefa-actions.ts` (4 Server Actions) | ✓ | ✓ | ✓ (importado por form + card) | ✓ VERIFIED |
| `src/db/queries.ts` (`groupByUrgency`/`getTarefasPendentes`/`buildDashboardItems`) | ✓ | ✓ | ✓ (importado por `page.tsx`) | ✓ VERIFIED |
| `src/components/delete-tarefa-dialog.tsx` | ✓ | ✓ | ✓ (importado por form dialog) | ✓ VERIFIED |
| `src/components/tarefa-form-dialog.tsx` | ✓ | ✓ | ✓ (montado no dashboard) | ✓ VERIFIED |
| `src/components/tarefa-card.tsx` | ✓ | ✓ | ✓ (ramo `item.kind==="tarefa"` do dashboard) | ✓ VERIFIED |
| `src/components/followup-dashboard.tsx` | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `src/app/page.tsx` | ✓ | ✓ | ✓ | ✓ VERIFIED |
| `scripts/migrate-tarefas.cjs` | ✓ | ✓ | ✓ (`npm run migrate:tarefas`) | ✓ VERIFIED |
| `scripts/test-tarefa-actions.cjs` / `scripts/test-group-by-urgency.cjs` | ✓ | ✓ | ✓ (`npm run test:*`) | ✓ VERIFIED |

Nenhum órfão, stub ou arquivo faltando.

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `page.tsx` | `queries.ts` | `getTarefasPendentes` + `buildDashboardItems` no `Promise.all` | ✓ WIRED |
| `followup-dashboard.tsx` | `tarefa-card.tsx` | ramo `item.kind === "tarefa"` do `.map` da seção | ✓ WIRED |
| `followup-dashboard.tsx` | `tarefa-form-dialog.tsx` | estado `tarefaDialogState` (criação + edição), montado como irmão do `LeadFormDialog` | ✓ WIRED |
| `tarefa-form-dialog.tsx` | `tarefa-actions.ts` | `useActionState(isEditMode ? updateTarefa : createTarefa)` | ✓ WIRED |
| `tarefa-form-dialog.tsx` | `delete-tarefa-dialog.tsx` | botão "Excluir" do rodapé em modo edição | ✓ WIRED |
| `tarefa-card.tsx` | `tarefa-actions.ts` | `concluirTarefa` dentro de `startTransition` | ✓ WIRED |

Todas verificadas por `npm run build` exit 0 (imports resolvem, rota `/` gerada) + UAT ponta a ponta.

---

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TAREFA-01 (cria tarefa avulsa com data + descrição, sem vincular a lead) | ✓ SATISFIED | Success Criterion 1 + UAT Testes 2/3/4 |
| TAREFA-02 (tarefas no dashboard agrupadas por urgência, mesmo padrão dos leads) | ✓ SATISFIED | Success Criteria 2/3 + UAT Testes 4-8, 15 |

*REQUIREMENTS.md será promovido de `Pending` → `Done` pelo `/close-phase` após a ponte de verificação.*

---

## Behavioral Verification

| Check | Result | Detail |
|-------|--------|--------|
| `npx tsc --noEmit` | ✓ | exit 0 |
| `npx eslint` (10 arquivos da fase) | ✓ | exit 0 (1 `eslint-disable react-hooks/refs` documentado) |
| `npm run verify:schema` | ✓ | exit 0 — `tarefas` + conjunto estrito de colunas conferido |
| `npm run guard:no-hard-delete` | ✓ | exit 0 — ALLOWLIST escopada a `tarefa-actions.ts`, demais tabelas bloqueadas |
| `npm run test:tarefa-actions` | ✓ | exit 0 — 7 casos; Caso 7 prova hard-delete por ausência da linha |
| `npm run test:group-by-urgency` | ✓ | exit 0 — fronteiras + intercalação D-04 + regressão do wrapper |
| `npm run test:compute-sequencia` | ✓ | exit 0 — regressão da generalização de `groupByUrgency` |
| `npm run test:lead-actions` / `test:relatorios` | ✓ | exit 0 / exit 0 (38 checagens) — regressão geral |
| `npm run build` | ✓ | exit 0 — Next 16.2 Turbopack, 13 páginas, rota `/` |

---

## Anti-Pattern Scan

| Pattern | Resultado |
|---------|-----------|
| TBD / FIXME / XXX | nenhum |
| TODO / HACK | nenhum |
| placeholder / coming soon / will be here | 1 falso-positivo: atributo HTML `placeholder="Ex: Ligar pro cowork..."` no `<Input>` (esperado, não é stub) |
| `dangerouslySetInnerHTML` | nenhum (proibido em toda a fase — T-12-15/T-12-20) |
| empty returns / log-only | nenhum |

Zero blockers, zero warnings.

---

## Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| `test-tarefa-actions.cjs` | TAREFA-01/02 | 7 casos | 0 | não | Value + Behavioral (asserção de ausência de linha, valor sentinela) | ✓ SUFFICIENT |
| `test-group-by-urgency.cjs` | TAREFA-02 | fronteiras + D-04 + regressão | 0 | não | Value (ordem exata `[tarefa,tarefa,lead,lead]`) | ✓ SUFFICIENT |

- Disabled tests em requisitos: 0
- Padrões circulares: 0 (harnesses usam DDL crua em `:memory:`/`os.tmpdir()`, não replay do sistema)
- Asserções insuficientes: 0

---

## Decision Coverage (#2492 — non-blocking)

8/8 decisões do `12-CONTEXT.md` (D-01 a D-08) rastreadas nos artefatos entregues — tabela completa em `12-04-SUMMARY.md` §"Rastro D-01 a D-08" e `12-SECURITY.md`. Nenhuma decisão abandonada.

---

## Human Verification

Fase user-facing → itens de verificação humana existem. **Todos executados na UAT de navegador** (`12-UAT.md`, `status: complete`):

| Item | Resultado UAT |
|------|---------------|
| Botão "Nova tarefa" secundário no cabeçalho | ✓ pass (Teste 1) |
| Dialog de 2 campos, sem campos de lead | ✓ pass (Teste 2) |
| Validação "Descreva a tarefa." bloqueia submit | ✓ pass (Teste 3) |
| Criação em Hoje / Vencidos, cor de data = cor do lead | ✓ pass (Testes 4/5) |
| Distinção visual do card (ícone + subtração) | ✓ pass (Teste 6) |
| Intercalação lead+tarefa por data | ✓ pass (Teste 7) |
| Contagem "· N" somada | ✓ pass (Teste 8) |
| Hover/foco do ícone de concluir (Circle→CircleCheck teal) | ✓ pass (Teste 9) |
| Concluir pelo card + "Desfazer" | ✓ pass (Teste 10) |
| Editar pelo corpo, migrar de seção ao salvar data | ✓ pass (Testes 11/12) |
| Excluir: confirmação não-dispensável + hard-delete no banco | ✓ pass (Teste 13) |
| Nenhuma rota nova no menu | ✓ pass (Teste 15) |
| Estado vazio com 3 CTAs | ⊘ skipped (Teste 14 — exige banco sem os 23 leads reais; cópia + ramo verificados no código e no `npm run build`) |

**Resultado: 14/15 pass, 0 issues, 1 skipped documentado.**

---

## Gaps Summary

Nenhum gap. Nenhum plano de correção necessário.

**Item pulado (não é gap):** Teste 14 (estado vazio) — limitação de ambiente (não destruir 23 leads reais), não defeito de código. Comportamento verificado indiretamente por leitura de código + build. Não gera plano `--gaps`.

---

## Metadata

- Verificação conduzida inline (contexto completo da sessão de execução + UAT), sem subagente.
- Registro de ameaças: `12-SECURITY.md` — 23/23 closed, 0 open.
- Método: goal-backward contra os 3 Success Criteria do ROADMAP + must_haves dos 4 PLANs.

## Promoção de status (close-phase)

Status promovido de `human_needed` para `passed` em 2026-08-30.
Evidência: UAT humano via automação de navegador (Claude in Chrome) concluído — `12-UAT.md` em `complete`, 14/15 pass, 0 issues, 0 pending/blocked. Teste 14 (estado vazio) pulado — aceito explicitamente pelo humano no fechamento (comportamento NÃO verificado no navegador; cópia + ramo verificados no código e no `npm run build`).
