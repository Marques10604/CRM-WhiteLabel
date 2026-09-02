---
phase: 17-limpeza-de-lint-do-repo
verified: 2026-09-01T00:00:00Z
status: passed
score: 5/5 success criteria verificados (todos CLI-assertivos — fase sem superfície de usuário)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
---

# Fase 17: Limpeza de Lint do Repo — Relatório de Verificação

**Meta da fase:** `npm run lint` rodado da raiz, sem escopo de arquivos, sai com código `0` —
a dívida dos 457 erros pré-existentes acumulada desde a Fase 8 está quitada, sem esconder
erro real de `src/`.
**Verificado:** 2026-09-01
**Status:** passed
**Re-verificação:** Não — verificação inicial

## Goal Achievement

Meta alcançada e verificada por CLI (o orquestrador re-rodou todos os gates de forma
independente após o executor). Esta fase **não tem superfície de usuário** — nenhuma
mudança de código de runtime, só `eslint.config.mjs` + comentários `eslint-disable` +
docs. Todos os 5 Success Criteria são assertivos por comando; não há human-check aplicável.

## Success Criteria

| # | Critério | Status | Evidência (re-verificada pelo orquestrador) |
|---|----------|--------|---------------------------------------------|
| SC-1 | `npm run lint` da raiz, sem args, exit 0 | ✅ pass | `npm run lint` → `✖ 4 problems (0 errors, 4 warnings)`, exit code **0**. Os 4 warnings são `react-hooks/incompatible-library` (TanStack Table) — deferidos no `17-CONTEXT.md`, não afetam o exit code |
| SC-2 | `.claude/get-shit-done` + worktree órfão fora do ESLint pela config (ignore), não por deleção; worktree removido | ✅ pass | `git diff eslint.config.mjs`: `".claude/**"` adicionado ao `globalIgnores`, comentado. `git status` sem deleções em `.claude/`. `git worktree list` → só `main` (órfão `agent-ab2be3f82c3c9c30d` + branch removidos) |
| SC-3 | `scripts/**/*.cjs` passa via override documentado de `no-require-imports`; falsos-positivos `react-hooks/*` de `src/` com `eslint-disable` comentado, um por ocorrência | ✅ pass | `eslint.config.mjs`: bloco `files: ["scripts/**/*.cjs"]` com `"@typescript-eslint/no-require-imports": "off"` + comentário de 4 linhas. `npx eslint scripts` exit 0. `npx eslint src` exit 0. 4 `eslint-disable-next-line` (2 em `nicho-manager.tsx`, 1 em `periodo-selector.tsx`, 1 em `template-form-dialog.tsx`), cada um com comentário citando o falso-positivo do React Compiler + STATE.md 07-02/09-03/09-04 |
| SC-4 | Nenhuma regra desligada globalmente que mascare erro real de `src/`; diff da config pequeno/comentado; diff de `src/` só de comentário | ✅ pass | `git diff eslint.config.mjs` = +17 linhas, 2 blocos, ambos comentados; `no-require-imports` desligado APENAS para `scripts/**/*.cjs`. `git diff src/` = 100% comentário: 4 diretivas `exhaustive-deps` obsoletas removidas + 4 `eslint-disable` documentados adicionados; zero linha executável (verificado com `git diff` filtrado) |
| SC-5 | `deferred-items.md` (Fase 8) e `PROJECT.md` §Context não listam mais `npm run lint` global saindo 1 como débito aberto | ✅ pass | `grep -c "sai com exit 1" .planning/PROJECT.md` → 0. `deferred-items.md` da Fase 8 marca o item resolvido na Fase 17. `STATE.md` atualizado |

## Gates (re-verificados)

| Gate | Exit code |
|------|-----------|
| `npm run lint` (raiz, sem args) | 0 (0 errors, 4 warnings deferidos) |
| `npx tsc --noEmit` | 0 (garantia de não-regressão — mudanças são comentários) |
| `npx eslint scripts` | 0 |
| `npx eslint src` | 0 |
| `git worktree list` | só `main` |

`npm run build` NÃO é gate desta fase (só config de lint + comentários — nenhuma linha
executável muda). Decisão registrada em `17-01-PLAN.md` §notes.

## Deviations

- `gsd-verifier` formal não spawnado — `VERIFICATION.md` autorada pelo orquestrador com os
  5 gates re-rodados de forma independente após o executor. Fase config-only, host de 4GB,
  decisão de não gastar subagente (mesmo padrão da Fase 16).
- Diagnóstico previa D-05 (~8 warnings `no-unused-vars` em `src/`) e D-06 (`ban-ts-comment`/
  `no-empty-object-type` em `scripts/`) — na prática estavam **todos** dentro de
  `.claude/**` (o `.next/types/` do worktree órfão), já resolvidos por D-01. Nada a fazer.

## Diff da fase

10 arquivos modificados, 1 criado (`17-01-SUMMARY.md`), 0 removidos. Nenhuma dependência
nova, nenhuma mudança de schema, nenhuma linha de código de runtime.
