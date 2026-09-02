---
phase: 17
phase_name: "Limpeza de Lint do Repo"
project: "CRM de Leads"
generated: "2026-09-01"
counts:
  decisions: 4
  lessons: 3
  patterns: 3
  surprises: 2
missing_artifacts: []
---

# Phase 17 Learnings: Limpeza de Lint do Repo

## Decisions

### `.claude/**` no `globalIgnores` do ESLint — ferramental de agente nunca entra no lint do produto
Adicionado `".claude/**"` ao array de `globalIgnores` em `eslint.config.mjs`, com comentário.

**Rationale:** Dos 457 erros, ~377 vinham de `.claude/get-shit-done` (GSD instalado) + de um
worktree órfão de agente com um `.next/` buildado dentro. `.claude/` nem está trackeado no
git. O config atual já sobrescrevia os ignores default do `eslint-config-next` e tinha
esquecido `.claude/`.
**Source:** 17-CONTEXT.md (D-01), 17-01-SUMMARY.md

### Override escopado por glob para CommonJS legítimo, não desligar regra globalmente
Bloco `{ files: ["scripts/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } }`.

**Rationale:** 76 dos erros restantes eram `no-require-imports` em harnesses de teste/migração
Node puro (`.cjs`) — `require()` é o idioma correto ali. Escopo estrito (um glob, uma regra)
mantém `no-require-imports` ativo para todo `src/**`.
**Source:** 17-CONTEXT.md (D-03), 17-01-SUMMARY.md

### `eslint-disable-next-line` por ocorrência, comentado, nunca por arquivo/global
4 falsos-positivos do React Compiler em `src/` (`set-state-in-effect` ×3, `refs` ×1), cada
um com `eslint-disable-next-line` de uma linha citando o motivo + o precedente do projeto.

**Rationale:** SC#4 exige que nenhuma regra seja desligada de forma que mascare erro real.
Supressão por linha é auditável; a regra continua ativa para o resto do arquivo. Padrão já
aceito no projeto (STATE.md decisões 07-02 / 09-03 / 09-04).
**Source:** 17-CONTEXT.md (D-04), 17-01-PLAN.md

### `npm run build` não é gate desta fase; `tsc --noEmit` é a garantia de não-regressão
Nenhuma linha de código executável muda (config + comentários). `tsc --noEmit` a custo baixo
cobre a ausência de regressão de tipos.

**Rationale:** `npm run build` estoura o timeout do host de 4GB e não agrega nada quando o
diff é 100% comentário + config de tooling.
**Source:** 17-01-PLAN.md §notes, 17-VERIFICATION.md

## Lessons

### O "número grande" de erros de lint pode ser quase todo ruído de ferramental
457 erros → ~4 reais no código do produto. Antes de triar erro por erro, agrupar por
diretório e por regra revela onde o esforço real está (`npx eslint . -f json` + script de
agregação).

**Context:** O ROADMAP tinha chutado "457 erros pré-existentes acumulados desde a Fase 8"
como se fosse débito de código; a investigação mostrou que 98% era `.claude/` + um worktree
órfão + CommonJS legítimo.
**Source:** 17-CONTEXT.md (diagnóstico), 17-01-SUMMARY.md (desvios)

### `globalIgnores` do `eslint-config-next` é all-or-nothing — ao customizar, você reimplementa os defaults
O config já tinha caído nessa armadilha (re-listou `.next/**`, `out/**`, `build/**`,
`next-env.d.ts` mas esqueceu `.claude/`). Qualquer novo ignore tem que entrar nesse mesmo
array, não num `.eslintignore` separado (flat config não usa mais).

**Context:** A causa raiz de `.claude/` ser varrido era exatamente essa omissão.
**Source:** eslint.config.mjs, 17-CONTEXT.md (D-01)

### Diretivas `eslint-disable` viram lixo quando a regra alvo para de disparar
4 `// eslint-disable-next-line react-hooks/exhaustive-deps` viraram "Unused eslint-disable
directive" (warning) quando o ESLint 9 / eslint-config-next 16.2 mudou o comportamento da
regra. Higiene: remover as obsoletas junto, distinguindo das que ainda são usadas (o ESLint
diz qual é qual).

**Context:** D-05 do CONTEXT previa `no-unused-vars` em `src/`; a realidade eram essas
diretivas obsoletas (os `no-unused-vars` já tinham sido limpos antes).
**Source:** 17-01-SUMMARY.md, 17-01-PLAN.md (Task 2)

## Patterns

### Triagem de lint em massa: agrupar por (diretório × regra) antes de decidir
`npx eslint . -f json` → script que conta por `ruleId` e por segmento de path de 2 níveis.
Revela "ignore isso inteiro" vs "override de regra" vs "supressão pontual real".

**When to use:** Qualquer dívida de lint > ~30 erros, ou config de lint herdada que nunca
saiu 0.
**Source:** 17-CONTEXT.md, sessão de investigação da Fase 16

### `git worktree list` + `git worktree remove --force` para limpar cruft de agente
Worktrees órfãos de execuções antigas de agente (branch `worktree-agent-*` fora do `main`)
acumulam `.next/` buildado e poluem qualquer varredura recursiva. `--force` descarta o
working tree sujo; `git worktree prune` limpa os metadados.

**When to use:** Quando `git worktree list` mostra worktrees `worktree-agent-*` que não
correspondem a trabalho ativo.
**Source:** 17-CONTEXT.md (D-02), 17-01-SUMMARY.md

### Fase de quitação de débito config-only: VERIFICATION `passed` direto, sem UAT
Quando a fase não tem superfície de usuário (config de tooling, comentários), todos os SC
são assertivos por comando. `VERIFICATION.md` nasce `passed` (não `human_needed`), o
orquestrador re-roda os gates de forma independente, e `close-phase` passa sem UAT.

**When to use:** Fases sem código de runtime e sem UI — lint, CI, config de build, docs.
**Source:** 17-VERIFICATION.md, close-phase Sub-rotina V

## Surprises

### D-05 e D-06 do plano eram fantasmas — estavam todos dentro de `.claude/**`
O planner previa ~8 warnings `no-unused-vars` + 7 `ban-ts-comment`/`no-empty-object-type`
em `src/`/`scripts/`. Na execução: zero. Todos vinham do `.next/types/validator.ts` gerado
dentro do worktree órfão, já resolvidos por D-01.

**Impact:** Task 2 encolheu (só os 4 erros reais + 4 diretivas obsoletas). Nada a fazer para
D-05/D-06. Zero retrabalho — o plano tolerava a divergência.
**Source:** 17-01-SUMMARY.md (desvios)

### `npm run lint` saía exit 0 no shell com pipe, exit 1 sem pipe
Durante a investigação, `npx eslint . 2>&1 | tail` mostrava "457 errors" mas `echo $?` dava
0 (o `tail` era o último comando do pipe). `npm run lint` sozinho dava exit 1. O SC#1 é
explicitamente "sem args, exit code 0" — medir o exit certo importou.

**Impact:** A verificação final sempre roda `npm run lint` puro, nunca por trás de um pipe.
**Source:** 17-CONTEXT.md §Specific Ideas, 17-01-PLAN.md (Task 3)
