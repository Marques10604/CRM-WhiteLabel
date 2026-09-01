# Phase 17: Limpeza de Lint do Repo - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning
**Source:** Investigação de lint feita na sessão de fechamento da Fase 16 (dados abaixo são reais, `npx eslint .` rodado em 2026-09-01)

<domain>
## Phase Boundary

**Entrega:** `npm run lint` (script = `eslint`, sem args, roda da raiz recursivamente) sai com exit `0`.

**Dentro:** `eslint.config.mjs`, `eslint-disable` pontuais em `src/`, remoção do worktree órfão, atualização de docs (`deferred-items.md`, `PROJECT.md`).

**Fora:** qualquer refactor de código de runtime, desligar regra globalmente de forma que mascare erro real em `src/`, mexer nos `.cjs` de `scripts/` além de config (o código deles está certo — é CommonJS).
</domain>

<decisions>
## Implementation Decisions

### Diagnóstico (dados reais, `npx eslint .` 2026-09-01)
- **532 problemas: 457 errors + 75 warnings, 101 arquivos com erro.**
- Por regra: **422 `@typescript-eslint/no-require-imports`** (92% dos errors), 22 `@typescript-eslint/no-explicit-any`, 5 `react-hooks/set-state-in-effect`, 4 `@typescript-eslint/ban-ts-comment`, 3 `@typescript-eslint/no-empty-object-type`, 1 `react-hooks/refs`. Warnings: 60 `no-unused-vars`, 9 parse, 6 `react-hooks/incompatible-library`.
- Por diretório: `.claude/get-shit-done` **329 err**, `.claude/worktrees/agent-ab2be3f82c3c9c30d` **47 err** (inclui um `.next/types/validator.ts` gerado — origem dos 22 `no-explicit-any`), `.claude/hooks` 1 err, `scripts/*.cjs` ~80 err, **`src/` apenas 4 err + 8 warn**.
- `.claude/` **não está trackeado no git** (`git ls-files .claude` → 0). É ferramental do GSD instalado + worktree órfão.

### D-01: `.claude/**` fora do escopo do ESLint pela config (não por deleção)
Adicionar `.claude/**` ao `globalIgnores([...])` em `eslint.config.mjs`. O array atual já sobrescreve os ignores default do `eslint-config-next` (re-adiciona `.next/**`, `out/**`, `build/**`, `next-env.d.ts`) mas esqueceu `.claude/`. Mata ~377 err + ~57 warn de ferramental que não é código do app. SC#2.

### D-02: Remover o worktree órfão `agent-ab2be3f82c3c9c30d`
`git worktree remove .claude/worktrees/agent-ab2be3f82c3c9c30d --force` + `git worktree prune`. Branch `worktree-agent-ab2be3f82c3c9c30d` @ `dc9dc98` (commit da Fase 03). O ignore de D-01 já cobriria, mas o worktree é cruft real de execução antiga — limpar é o certo. SC#2.

### D-03: `scripts/**/*.cjs` — override documentado de `no-require-imports`
Bloco de override em `eslint.config.mjs`:
```
{ files: ["scripts/**/*.cjs"],
  rules: { "@typescript-eslint/no-require-imports": "off",   // harnesses CommonJS: require() é correto
           "@typescript-eslint/no-unused-vars": "warn" } }
```
`require()` é a forma certa nesses arquivos (testes/migrações Node puro, `.cjs`). Mata ~80 err. Comentário no bloco explicando o porquê. SC#3.

### D-04: Os 4 erros reais em `src/` — `eslint-disable-next-line` documentado
Todos são falsos-positivos já conhecidos do React Compiler, o projeto **já aceita esse padrão** com disable comentado noutros arquivos (STATE.md decisões 07-02 / 09-03 / 09-04):
- `src/components/nicho-manager.tsx:29` e `:123` — `react-hooks/set-state-in-effect`
- `src/components/periodo-selector.tsx:102` — `react-hooks/set-state-in-effect` (reset de `customMode`/datas quando a prop `value` muda — mesmo idioma já suprimido em `lead-timeline-dialog.tsx`/`whatsapp-preview-dialog.tsx`)
- `src/components/template-form-dialog.tsx:117` — `react-hooks/refs` (`onSubmit={form.handleSubmit(onSubmit)}` + `formRef` — caso idêntico ao já suprimido, STATE.md 07-02)
Cada disable com comentário curto citando o motivo (falso-positivo do React Compiler, padrão aceito no projeto). SC#3/SC#4.

### D-05: Warnings de `src/` (`no-unused-vars`, ~8)
Deletar as variáveis/imports não usados em `src/`. Se algum for intencional (ex: destructuring parcial), prefixar com `_`. NÃO desativar a regra. `npm run lint` sai 0 mesmo com warnings (warning ≠ error) — mas limpar os de `src/` é higiene barata e está no espírito do SC#4.

### D-06: `ban-ts-comment` (4) e `no-empty-object-type` (3)
Estão em `scripts/` ou `.claude/` (não apareceram no filtro `src/`). Se em `.claude/` → resolvidos por D-01. Se em `scripts/*.cjs` → cobertos ou adicionar ao override de D-03. Confirmar na execução; não inventar supressão para arquivo que o ignore já cobre.

### D-07: Atualizar docs de débito
- `deferred-items.md` (procurar o item "`npm run lint` global sai 1" / "457 erros pré-existentes") → remover/marcar resolvido.
- `PROJECT.md` seção Context / "débito conhecido" → remover a menção a lint global saindo 1.
- STATE.md §Blockers/Concerns e §Accumulated Context têm menções ("`npm run lint` repo-inteiro sai 1 (457 erros pré-existentes, documentado desde Fase 8)") — atualizar.
SC#5.

### Claude's Discretion
- Ordem exata dos blocos no `eslint.config.mjs` (ignore antes ou depois dos spreads do next).
- Texto exato dos comentários de `eslint-disable` e do override.
- Se cria 1 ou 2 planos (provável 1 — a fase é pequena e sequencial, host 4GB).
- Se roda `--fix` do eslint para os 9 warnings auto-fixáveis antes das supressões manuais.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Config de lint
- `eslint.config.mjs` — a config atual (18 linhas, flat config, `defineConfig` + `globalIgnores`)
- `package.json` §scripts — `"lint": "eslint"` (sem args)

### Arquivos com erro real em `src/`
- `src/components/nicho-manager.tsx` (linhas ~29, ~123)
- `src/components/periodo-selector.tsx` (linha ~102)
- `src/components/template-form-dialog.tsx` (linha ~117)

### Precedente de supressão já aceita no projeto
- `src/components/whatsapp-preview-dialog.tsx`, `src/components/lead-timeline-dialog.tsx`, `src/components/template-form-dialog.tsx`, `src/components/configuracoes-form.tsx` — já têm `eslint-disable-next-line react-hooks/*` comentado (STATE.md decisões 07-02, 09-03, 09-04)

### Débito a quitar
- `.planning/phases/*/deferred-items.md` — item do lint
- `.planning/PROJECT.md` — seção Context
- `.planning/STATE.md` — §Blockers/Concerns
</canonical_refs>

<specifics>
## Specific Ideas

- O worktree órfão: `git worktree list` mostra `C:/Users/Vencedor/Desktop/crm-leads/.claude/worktrees/agent-ab2be3f82c3c9c30d  dc9dc98 [worktree-agent-ab2be3f82c3c9c30d]`.
- Verificação final tem que ser `npm run lint` **da raiz sem args** (não `npx eslint src`), exit 0 — é literalmente o SC#1.
- `eslint .` hoje sai exit 0 no shell por causa do pipe, mas `npm run lint` sem pipe sai 1 — confirmar o exit real no plano.
</specifics>

<deferred>
## Deferred Ideas

- Migrar os `.cjs` de `scripts/` para ESM (`import`) — fora de escopo, é dívida de padrão separada, D-03 resolve por override.
- Resolver os `react-hooks/incompatible-library` warnings (6) — são warnings, não bloqueiam o exit 0; deixar como estão.
- Ligar `eslint` no CI — fora de escopo (não há CI configurado neste projeto solo).
</deferred>

---

*Phase: 17-limpeza-de-lint-do-repo*
*Context gathered: 2026-09-01 (investigação inline na sessão de fechamento da Fase 16)*
