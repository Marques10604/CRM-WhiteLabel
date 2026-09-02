---
phase: 17-limpeza-de-lint-do-repo
plan: 01
subsystem: infra
tags: [eslint, tooling, react-compiler, react-hooks, commonjs, git-worktree]

# Dependency graph
requires:
  - phase: 08-origem-governada-separa-o-inbound-outbound
    provides: "deferred-items.md com o débito do lint global (457 erros pré-existentes) documentado"
provides:
  - "`npm run lint` da raiz do repo, sem args, volta a sair com exit code 0"
  - "`.claude/**` fora do escopo do ESLint via globalIgnores (não por deleção)"
  - "override escopado de `scripts/**/*.cjs` desligando `@typescript-eslint/no-require-imports`"
  - "worktree órfão `agent-ab2be3f82c3c9c30d` removido de `git worktree list` + branch órfã deletada"
  - "4 falsos-positivos `react-hooks/*` de `src/` com `eslint-disable-next-line` documentado"
  - "4 diretivas `eslint-disable react-hooks/exhaustive-deps` obsoletas removidas de `src/`"
affects: [close-phase-17, fase-18-auditoria-retroativa, fase-19-marca, qualquer fase futura que rode npm run lint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESLint flat config: bloco de override escopado por glob para idiomas CommonJS legítimos em vez de desligar regra globalmente"
    - "`.claude/**` no globalIgnores — ferramental de agente/GSD nunca entra no lint do produto"
    - "`eslint-disable-next-line react-hooks/*` de uma linha, comentado citando o falso-positivo do React Compiler + precedente do projeto (STATE.md 07-02 / 09-03 / 09-04)"

key-files:
  created:
    - .planning/phases/17-limpeza-de-lint-do-repo/17-01-SUMMARY.md
  modified:
    - eslint.config.mjs
    - src/components/nicho-manager.tsx
    - src/components/periodo-selector.tsx
    - src/components/template-form-dialog.tsx
    - src/components/configuracoes-form.tsx
    - src/components/csv-import-wizard.tsx
    - src/components/lixeira-table.tsx
    - .planning/phases/08-origem-governada-separa-o-inbound-outbound/deferred-items.md
    - .planning/PROJECT.md
    - .planning/STATE.md

key-decisions:
  - "Override de `scripts/**/*.cjs` desliga apenas `@typescript-eslint/no-require-imports` (não adiciona `no-unused-vars: warn` como o 17-CONTEXT.md D-03 esboçava — o rascunho não era mandatório e `no-unused-vars` já é warning por default; manter o diff mínimo)"
  - "Branch órfã `worktree-agent-ab2be3f82c3c9c30d` deletada (opcional por D-02) para deixar `git branch` limpo"
  - "`.claude/` fora do lint por config (D-01), nunca por deleção — não está trackeado no git"

patterns-established:
  - "Idioma CommonJS deliberado (`scripts/**/*.cjs`) isolado por override de glob, não por migração forçada para ESM (deferido)"

requirements-completed: [LINT-01]

# Metrics
duration: 20min
completed: 2026-09-01
---

# Phase 17 Plan 01: Limpeza de Lint do Repo Summary

**`npm run lint` da raiz volta a sair exit 0 — `.claude/**` no globalIgnores, override CommonJS de `scripts/**/*.cjs`, worktree órfão removido e 4 falsos-positivos `react-hooks` de `src/` suprimidos com comentário; zero código de runtime tocado.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-01
- **Completed:** 2026-09-01
- **Tasks:** 3
- **Files modified:** 10 (1 config, 6 componentes só-comentário, 3 docs)

## Accomplishments

- `eslint.config.mjs`: `.claude/**` adicionado ao `globalIgnores` (tira ~377 err + ~57 warn de ferramental fora do git, incluindo todos os `no-explicit-any` / `ban-ts-comment` / `no-empty-object-type` que vinham de um `.next/types/validator.ts` gerado dentro do worktree órfão) + bloco de override `files: ["scripts/**/*.cjs"]` com `@typescript-eslint/no-require-imports: "off"` (tira 76 err `no-require-imports`)
- Worktree órfão `.claude/worktrees/agent-ab2be3f82c3c9c30d` removido (`git worktree remove --force` + `git worktree prune`); branch `worktree-agent-ab2be3f82c3c9c30d` @ `dc9dc98` deletada
- 4 erros reais de `src/` (`react-hooks/set-state-in-effect` em nicho-manager.tsx x2 e periodo-selector.tsx x1; `react-hooks/refs` em template-form-dialog.tsx x1) suprimidos com `eslint-disable-next-line` de uma linha, cada um comentado citando o falso-positivo do React Compiler e o precedente do projeto
- 4 diretivas `eslint-disable react-hooks/exhaustive-deps` obsoletas removidas (configuracoes-form.tsx, csv-import-wizard.tsx x2, lixeira-table.tsx) — o ESLint 9 + eslint-config-next 16.2 não reportam mais a regra nesses pontos, então as diretivas viravam warning "Unused eslint-disable directive"
- Docs de débito atualizadas: `deferred-items.md` (Fase 8), `PROJECT.md` §Context e `STATE.md` não listam mais `npm run lint` global saindo 1 como débito aberto

## Task Commits

1. **Task 1: ignore de `.claude/**` + override de `scripts/**/*.cjs` + remoção do worktree órfão** - `3f2352d` (chore)
2. **Task 2: `eslint-disable` documentado nos 4 erros reais de `src/` + remoção das diretivas obsoletas** - `8680db3` (chore)
3. **Task 3: atualização das docs de débito + gate final `npm run lint`** - `1c73bfb` (docs)

**Plan metadata:** a seguir (docs: complete plan)

## Files Created/Modified

- `eslint.config.mjs` - `.claude/**` no globalIgnores + bloco de override escopado de `scripts/**/*.cjs` para `no-require-imports`
- `src/components/nicho-manager.tsx` - 2 `eslint-disable-next-line react-hooks/set-state-in-effect` comentados (um por efeito: NichoRow e NichoManager)
- `src/components/periodo-selector.tsx` - 1 `eslint-disable-next-line react-hooks/set-state-in-effect` no efeito de ressincronização com a URL
- `src/components/template-form-dialog.tsx` - bloco `/* eslint-disable-next-line react-hooks/refs -- ... */` entre `ref={formRef}` e `onSubmit`, no molde de configuracoes-form.tsx
- `src/components/configuracoes-form.tsx` - removida 1 diretiva `exhaustive-deps` obsoleta (efeito de toast do `state`)
- `src/components/csv-import-wizard.tsx` - removidas 2 diretivas `exhaustive-deps` obsoletas (efeito de preview support data + useMemo de previewRows)
- `src/components/lixeira-table.tsx` - removida 1 diretiva `exhaustive-deps` obsoleta (useMemo de columns)
- `.planning/phases/08-origem-governada-separa-o-inbound-outbound/deferred-items.md` - item do lint marcado RESOLVIDO na Fase 17, registro histórico preservado
- `.planning/PROJECT.md` - bullet "`npm run lint` global sai com exit 1" reescrito como resolvido na Fase 17
- `.planning/STATE.md` - cruft do worktree órfão e débito do lint anotados como resolvidos; menção histórica no bloco da Fase 15 marcada como "resolvido depois na Fase 17"

## Decisions Made

- **Override de `scripts/**/*.cjs` só desliga `no-require-imports`.** O rascunho do 17-CONTEXT.md §D-03 incluía também `"@typescript-eslint/no-unused-vars": "warn"`, mas (a) o texto era esboço não-mandatório ("Claude's Discretion" sobre o texto do override) e (b) `no-unused-vars` já roda como warning no preset, não como error — adicioná-lo não muda o exit code e só engorda o diff. Mantido o mínimo.
- **Branch órfã deletada.** D-02 marcava a deleção da branch como opcional; feita para deixar `git branch` limpo, já que o worktree saiu.
- **`--fix` do eslint não foi rodado.** Os 4 warnings restantes são todos `react-hooks/incompatible-library` (não auto-fixáveis de forma segura e explicitamente deferidos no 17-CONTEXT.md); não havia warning auto-fixável que valesse o risco.

## Deviations from Plan

None - plan executed exactly as written.

Nota sobre D-05/D-06: o diagnóstico do 17-CONTEXT.md previa "~8 warnings `no-unused-vars` em `src/`" (D-05) e "`ban-ts-comment` (4) + `no-empty-object-type` (3)" (D-06) possivelmente em `scripts/`. Na execução real, com o ignore de `.claude/**` aplicado, **nenhum** desses apareceu: os `no-unused-vars` e `ban-ts-comment`/`no-empty-object-type` estavam todos dentro de `.claude/**` (o `.next/types/validator.ts` do worktree órfão), resolvidos por D-01. `npx eslint src` terminou com 0 errors e 4 warnings (`incompatible-library`, deferidos). Nada a fazer para D-05/D-06 — o ignore já cobriu.

## Issues Encountered

- **`npx tsc --noEmit` estoura o timeout de 2 min do shell neste host 4GB** (comportamento conhecido, documentado nas notas do plano). Rodado com timeout estendido (10 min) — terminou em exit 0.

## Verification (SC#1..SC#5)

| Check | Resultado |
|-------|-----------|
| SC#1: `npm run lint` da raiz, **sem args** | **exit 0** (4 warnings `incompatible-library`, deferidos; 0 errors) |
| `npx tsc --noEmit` (não-regressão) | exit 0 |
| SC#2: `.claude/**` no `globalIgnores`, nenhum arquivo `.claude/` deletado | confirmado (`git status` sem deleções em `.claude/`) |
| SC#2: `git worktree list` sem `agent-ab2be3f82c3c9c30d` | confirmado (só `main` restou) |
| SC#3: `npx eslint scripts` | exit 0 (76 `no-require-imports` sumiram) |
| SC#3: `npx eslint src` | exit 0; `set-state-in-effect` x2 em nicho-manager, x1 em periodo-selector, `refs` x1 em template-form-dialog, cada um comentado |
| SC#3: `npx eslint src` "Unused eslint-disable directive" | 0 |
| SC#4: `git diff eslint.config.mjs` | +15 linhas, todo bloco novo comentado, nenhuma regra desligada globalmente |
| SC#4: `git diff -U0 src/components/` | só linhas de comentário `eslint-disable` adicionadas + 4 linhas de diretiva obsoleta removidas; nenhuma linha executável |
| SC#5: `grep -c "sai com exit 1" .planning/PROJECT.md` | 0 |
| SC#5: `grep -c "Fase 17" .../08-.../deferred-items.md` | 1 |
| SC#5: `grep -niE "npm run lint.*(sai\|sae\|segue).*1\|repo-inteiro sai 1" .planning/STATE.md` | nenhuma linha em tempo presente |
| `git status --porcelain` | só `M` nos 3 docs + `?? .claude/` (untracked pré-existente, não trackeado no git) |

## Threat Model Compliance

Todas as disposições do `<threat_model>` (T-17-01..04 + T-17-SC) respeitadas:

- **T-17-01/02 (mitigate):** provado — `npx eslint .` continuou reportando exatamente os 4 erros de `src/` DEPOIS do ignore de `.claude/**` e do override de `scripts/` (antes das supressões da Task 2). Nenhum erro real de `src/` foi mascarado por config global.
- **T-17-03 (accept):** supressões pontuais de uma linha, comentadas; `react-hooks/set-state-in-effect` e `react-hooks/refs` continuam ativos para todo o resto de `src/`.
- **T-17-04 (accept):** worktree removido com `--force`; conteúdo era reproduzível pelo git (branch de um commit da Fase 03, fora de `main`).
- **T-17-SC (accept):** zero dependência nova, nenhum `npm install`. Gate de legitimidade de pacote não se aplica.

Threat surface introduzida: nenhuma (fase config-only + comentários).

## Known Stubs

Nenhum. Fase de tooling/config — sem código de UI, sem fontes de dados.

## Next Phase Readiness

- **`npm run lint` volta a ser gate normal das próximas fases** (roda da raiz, sem args, exit 0).
- Pendências não-bloqueantes carregadas: 4 warnings `react-hooks/incompatible-library` (TanStack Table + RHF `watch()`) — deferidos no 17-CONTEXT.md, não afetam exit code. Migração dos `.cjs` de `scripts/` para ESM segue deferida.
- `/close-phase` da Fase 17 fará o refresh completo do STATE.md; aqui só foi removida a afirmação falsa sobre o lint.

## Self-Check: PASSED

- `eslint.config.mjs` FOUND, contém `.claude/**` e `scripts/**/*.cjs` + `no-require-imports` off
- `.planning/phases/17-limpeza-de-lint-do-repo/17-01-SUMMARY.md` FOUND
- Commit `3f2352d` FOUND (Task 1)
- Commit `8680db3` FOUND (Task 2)
- Commit `1c73bfb` FOUND (Task 3)
- `git worktree list` — `agent-ab2be3f82c3c9c30d` ausente

---
*Phase: 17-limpeza-de-lint-do-repo*
*Completed: 2026-09-01*
