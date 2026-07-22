---
phase: 01-lead-sub-nicho-foundation
plan: 04
subsystem: database
tags: [drizzle, soft-delete, sqlite, tanstack-table, node-script, sonner]

# Dependency graph
requires:
  - phase: 01-lead-sub-nicho-foundation (01-01/01-02/01-03)
    provides: "schema leads.deletedAt, lead-table.tsx/lead-table-columns.tsx interativos, lixeira/page.tsx shell"
provides:
  - "softDeleteLead/restoreLead idempotentes em src/actions/lead-actions.ts (LEAD-04)"
  - "scripts/guard-no-hard-delete.cjs: guarda Node portável (fs/path nativos) contra hard-delete de leads/subnichos e SQL destrutivo em migrações — npm run guard:no-hard-delete"
  - "delete-lead-dialog.tsx: confirmação nomeada de exclusão (D-05)"
  - "Coluna de ações (editar/excluir) na lead-table ativa, botões de ícone diretos sem menu (D-08)"
  - "/lixeira funcional: lista leads soft-deletados com coluna 'Excluído em' e ação única Restaurar instantânea (D-17)"
affects: [phase-2-csv-import, future-guard-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guarda repo-wide como script Node puro (sem grep/shell) para portabilidade Git Bash/PowerShell/npm.cmd — primeiro script desse tipo no projeto"
    - "TableMeta do @tanstack/react-table (declaration merging) como canal de callbacks (onEditLead/onDeleteLead) de column defs definidos fora do componente para o estado do componente pai"
    - "DeleteState discriminado ({open:false}|{open:true,lead}) + startTransition — mesmo padrão já usado em template-list.tsx, agora replicado em lead-table.tsx"

key-files:
  created:
    - scripts/guard-no-hard-delete.cjs
    - src/components/delete-lead-dialog.tsx
    - src/components/lixeira-table.tsx
  modified:
    - src/actions/lead-actions.ts
    - src/components/lead-table.tsx
    - src/components/lead-table-columns.tsx
    - src/app/lixeira/page.tsx
    - package.json

key-decisions:
  - "CODE_PATTERNS do guard restrito a hard-delete de leads/subnichos especificamente (.delete(leads/.delete(subnichos), NÃO um db.delete( genérico) — o texto do plano especificava um regex db\\.delete\\( amplo que teria quebrado o hard-delete legítimo e já existente de deleteTemplate (D-13 de 04-01, templates não têm lixeira por design). Rule 1 (bug fix): a garantia LEAD-04 é sobre leads/subnichos, não um banimento repo-wide de qualquer db.delete()."
  - "Comentários de documentação em lead-actions.ts reescritos para não conter o substring literal 'db.delete(' — o próprio guard os acusaria como falso-positivo (o mesmo motivo pelo qual o guard já exclui a si mesmo da varredura)."
  - "Botões de ação de linha usam Button size='icon-lg' (36px reais neste design system), não size='icon' (32px) — o UI-SPEC pede 36px explicitamente; a variante nomeada 'icon' do shadcn Button local não bate com esse valor."
  - "Toast de exclusão de lead usa 'Lead movido para a Lixeira.' — a UI-SPEC não define uma string literal obrigatória para esse toast (só para o de restaurar), texto escolhido por analogia ao toast de deleteTemplate já existente."
  - "node_modules do worktree resolvido via npm ci local (não symlink/junction) — Turbopack rejeita node_modules como symlink apontando para fora do turbopack.root configurado (__dirname do worktree); um junction Windows para o node_modules do repo principal falhou com 'Symlink [project]/node_modules is invalid, it points out of the filesystem root'."

patterns-established:
  - "Script de guarda repo-wide em Node puro com ALLOWLIST auto-referente — padrão reutilizável para futuras guardas de convenção (ex.: anti-hardcoded-secret) sem depender de grep/shell específico de plataforma."

requirements-completed: [LEAD-04]

# Metrics
duration: "~37min"
completed: 2026-07-22
---

# Phase 1 Plan 4: Soft-Delete de Lead + Lixeira Summary

**Soft-delete idempotente de lead (deletedAt) com modal de confirmação nomeado, coluna de ações direta na tabela ativa, página /lixeira funcional com restauração instantânea, e uma guarda Node portável (scripts/guard-no-hard-delete.cjs) que varre src/+scripts/+migrações atrás de hard-delete/SQL destrutivo — fecha LEAD-04 e a Fase 1.**

## Performance

- **Duration:** ~37 min (commit base 08:35 → commit final 09:11, sessão única e contínua)
- **Completed:** 2026-07-22
- **Tasks:** 2/2 (Task 1 `ed5ed09`; Task 2 `789cd57`)
- **Files modified:** 8 (5 modificados, 3 criados)

## Accomplishments

- **`softDeleteLead`/`restoreLead`** (`src/actions/lead-actions.ts`) — soft-delete via `db.update(leads).set({ deletedAt: sql\`(unixepoch())\` })`/`{ deletedAt: null }`, NUNCA `db.delete(leads)`. Idempotentes por construção: o `where` restringe `softDeleteLead` a `isNull(deletedAt)` e `restoreLead` a `isNotNull(deletedAt)`, então repetir a ação num lead já no estado-alvo é um no-op seguro (0 linhas afetadas, sem erro, sem sobrescrever o `deletedAt` original). Revalidam `"/"` (dashboard), `"/leads"` (lista completa), `"/pipeline"` (board) e `"/lixeira"` — cobrindo todas as rotas que hoje listam leads ativos, adaptado à topologia real de rotas pós-Fase 3/4 (o texto original do plano previa só `"/"`+`"/lixeira"`, de quando `"/"` ainda era a lista de leads).
- **`scripts/guard-no-hard-delete.cjs`** — script Node puro (só `fs`/`path`, sem grep/shell), portável entre Git Bash/PowerShell/npm.cmd. Varre `src/`+`scripts/` (que já cobre `src/db/migrations/`) atrás de `.delete(leads`/`.delete(subnichos` e varre `.sql` de migrações atrás de `DELETE FROM`/`DROP TABLE`. Exclui a si mesmo via `ALLOWLIST` (contém os próprios padrões como string-literal). Exposto como `npm run guard:no-hard-delete`; saída 0 numa árvore limpa, saída 1 com `arquivo:linha` de cada ocorrência.
- **`delete-lead-dialog.tsx`** (D-05) — confirmação nomeada com o corpo literal da UI-SPEC interpolando o nome do lead; segue exatamente a convenção já estabelecida por `delete-template-dialog.tsx` (Dialog controlado + `onConfirm` delegado ao pai).
- **Coluna de ações na lead-table ativa** (D-08) — dois botões de ícone diretos (`Pencil`/`Trash2`, `size="icon-lg"` = 36px reais) injetados via `TableMeta` do `@tanstack/react-table` (declaration merging), com `stopPropagation` para não disparar o row-click de edição já existente.
- **`/lixeira` funcional** — Server Component com `isNotNull(leads.deletedAt)` ordenado por `deletedAt` decrescente; `lixeira-table.tsx` (Client Component) é uma variante somente-leitura com coluna extra "Excluído em" e ação única "Restaurar" instantânea (sem confirmação, D-17) — sem edição/exclusão e sem row-click, coerente com o guard upstream de `updateLead` (01-02) que já exige `isNull(deletedAt)`.
- **Ciclo completo verificado end-to-end** via script headless temporário (apagado após uso): soft-delete → some da lista ativa/aparece na lixeira → idempotência (excluir 2x preserva `deletedAt` original) → restore → volta pra ativa/some da lixeira → idempotência (restaurar 2x não erra). 9/9 asserções passaram.

## Task Commits

Each task was committed atomically:

1. **Task 1: softDeleteLead/restoreLead + guarda anti hard-delete + modal de confirmação + coluna de ações** — `ed5ed09` (feat)
2. **Task 2: Página Lixeira + tabela de leads excluídos + restaurar instantâneo** — `789cd57` (feat)

## Files Created/Modified

- `src/actions/lead-actions.ts` — `softDeleteLead`/`restoreLead` idempotentes + comentário de convenção LEAD-04 no topo do arquivo
- `scripts/guard-no-hard-delete.cjs` (novo) — guarda Node portável anti hard-delete/SQL destrutivo
- `package.json` — script `guard:no-hard-delete`
- `src/components/delete-lead-dialog.tsx` (novo) — modal de confirmação nomeado (D-05)
- `src/components/lead-table-columns.tsx` — coluna "Ações" (editar/excluir) + `declare module "@tanstack/react-table"` para `TableMeta`
- `src/components/lead-table.tsx` — `DeleteState`, wiring do dialog de exclusão, `softDeleteLead` + toast
- `src/app/lixeira/page.tsx` — substituída a casca por Server Component real (`isNotNull`/`orderBy(desc(deletedAt))`)
- `src/components/lixeira-table.tsx` (novo) — tabela somente-leitura da lixeira com coluna "Excluído em" e ação Restaurar

## Decisions Made

- **Guarda restrita a leads/subnichos, não a todo `db.delete(` do repositório** — o regex amplo literalmente pedido pelo plano (`/db\.delete\(/`) teria quebrado permanentemente o build gate porque `deleteTemplate` (Fase 4, D-13: templates não têm lixeira por design) já faz hard-delete legítimo de uma tabela fora do escopo de LEAD-04. Corrigido via Rule 1 (bug fix) para os dois padrões específicos (`.delete(leads`/`.delete(subnichos`) — mantém a garantia real (LEAD-04) sem falso-positivo em funcionalidade já revisada e aceita.
- **Comentários de `lead-actions.ts` reescritos para não conter `"db.delete("` literal** — o guard os teria acusado como falso-positivo (mesmo motivo pelo qual ele já se auto-exclui da varredura). Reescrito para "hard-delete" em prosa em vez do trecho de código exato.
- **`size="icon-lg"` (36px) em vez de `size="icon"` (32px)** para os botões de ação de linha — o UI-SPEC pede 36px explicitamente; a variante `icon` do `Button` local deste projeto renderiza 32px, `icon-lg` é a que efetivamente bate com o alvo de toque especificado.
- **`revalidatePath` cobrindo `"/"`, `"/leads"`, `"/pipeline"` e `"/lixeira"`** em vez de só `"/"`+`"/lixeira"` como o texto do plano (escrito antes das Fases 3/4) previa — adaptação necessária porque `"/"` hoje é o dashboard de follow-ups e `"/leads"` é a lista completa (Fase 4), ambas precisam invalidar cache ao excluir/restaurar um lead.
- **Ambiente de verificação do worktree**: `node_modules` resolvido via `npm ci --prefer-offline` local ao worktree (não symlink/junction) — uma junction NTFS apontando para o `node_modules` do repositório principal foi tentada primeiro, mas o Turbopack recusou com `Symlink [project]/node_modules is invalid, it points out of the filesystem root` (o `turbopack.root` do `next.config.ts` aponta para `__dirname`, que é o próprio worktree). Banco local (`./data/crm.db`) recriado via `drizzle-kit migrate` + `drizzle-kit push` (para sincronizar a tabela `templates`, criada originalmente via `push` na Fase 4 sem migração `.sql` correspondente, conforme já documentado em `04-02`) — nenhum dado do banco real do usuário foi tocado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex do guard restrito a leads/subnichos (evita quebrar hard-delete legítimo de templates)**
- **Found during:** Task 1, ao rodar `npm run guard:no-hard-delete` pela primeira vez numa árvore "limpa"
- **Issue:** O padrão `/db\.delete\(/` literalmente especificado no plano casava com `await db.delete(templates).where(...)` em `src/actions/template-actions.ts` (Fase 4, `deleteTemplate`, D-13 — hard-delete intencional, templates não têm lixeira). Rodar a guarda como especificada quebraria o gate de build permanentemente para uma funcionalidade já revisada e aceita.
- **Fix:** Removido o padrão genérico `/db\.delete\(/`; mantidos só `/\.delete\(\s*leads\b/` e `/\.delete\(\s*subnichos\b/`, que cobrem exatamente o escopo real de LEAD-04 (leads/subnichos) sem afetar outras tabelas.
- **Files modified:** `scripts/guard-no-hard-delete.cjs`
- **Verification:** `npm run guard:no-hard-delete` sai 0 numa árvore limpa; smoke tests manuais confirmaram que a guarda ainda detecta `db.delete(leads)` injetado e `DELETE FROM`/`DROP TABLE` injetado em `.sql` de migração (ver Issues Encountered).
- **Committed in:** `ed5ed09` (Task 1 commit)

**2. [Rule 1 - Bug] Comentários de `lead-actions.ts` reescritos para não conter o substring `"db.delete("`**
- **Found during:** Task 1, mesmo primeiro run do guard
- **Issue:** Dois comentários de documentação adicionados por este próprio plano (topo do arquivo e acima de `softDeleteLead`) mencionavam literalmente `"db.delete()"`/`"db.delete(leads)"` como o padrão proibido — o próprio texto do comentário casava com o regex de detecção, se auto-acusando como falso-positivo.
- **Fix:** Reescrito para prosa que não contém o substring exato (ex.: "fazer hard-delete de leads/subnichos" em vez do trecho de código literal).
- **Files modified:** `src/actions/lead-actions.ts`
- **Verification:** `npm run guard:no-hard-delete` sai 0 após a correção.
- **Committed in:** `ed5ed09` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (ambos Rule 1 — bugs no design literal da guarda que quebrariam código já aceito ou se auto-acusariam).
**Impact on plan:** Nenhum impacto negativo — a garantia real de LEAD-04 (soft-delete de leads/subnichos) permanece intacta e verificada; os ajustes só evitaram falsos-positivos contra código legítimo fora do escopo do requisito.

## Issues Encountered

- **Turbopack rejeita `node_modules` como symlink apontando para fora do `turbopack.root`** — ao tentar uma junction NTFS `worktree/node_modules -> repo-principal/node_modules` (para evitar reinstalar dependências), `npm run build` falhou com `TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`. Resolvido com `npm ci --prefer-offline --no-audit --no-fund` direto no worktree (cache local do npm, ~654 pacotes, ~2min, sem chamada de rede pesada).
- **Banco local do worktree sem a tabela `templates`** — `./data/crm.db` do worktree, criado do zero via `drizzle-kit migrate` (só as 3 migrações `.sql` versionadas), não tinha `templates` porque essa tabela foi aplicada ao banco real via `drizzle-kit push` na Fase 4 sem gerar uma migração `.sql` correspondente (já documentado em `04-02-SUMMARY.md`). `npm run build` falhava ao pré-renderizar `/leads`/`/templates`. Resolvido rodando `npx drizzle-kit push` uma vez no banco local do worktree (schema-only, nenhum dado real tocado) para sincronizar `templates` antes do build.
- Nenhum outro problema — `npx tsc --noEmit` e `npm run build` passaram limpos após as correções acima, em ambas as tasks.

## User Setup Required

None — segue rodando localmente (`npm run dev`), dado em `./data/crm.db` (gitignored). Nenhuma variável de ambiente nova.

## Next Phase Readiness

- **LEAD-04 completo** — ciclo excluir (confirmação nomeada) → Lixeira (com data de exclusão) → restaurar (instantâneo) → lista ativa, fim-a-fim, com idempotência garantida em ambas as direções.
- **Fase 1 (lead-sub-nicho-foundation) está agora code-complete** — todos os 4 planos (01-01..01-04) executados e commitados.
- **`<human-check>` de browser NÃO executado** (mesmo padrão documentado em 01-01/01-02/01-03-SUMMARY.md e reforçado pelo `<critical_host_constraint>` desta execução — host com ~4GB RAM, `npm run dev`/Turbopack já causou OOM nesta sessão). Substituído por: (1) `npx tsc --noEmit` + `npm run build` limpos em ambas as tasks; (2) smoke tests manuais do guard (hard-delete de código injetado e SQL destrutivo injetado em migração, ambos detectados corretamente e sem falso-positivo após remoção); (3) script `tsx`/`.cjs` headless temporário exercitando `softDeleteLead`/`restoreLead` contra um banco SQLite isolado (9/9 asserções, apagado após uso). Um clique-through real em `npm run dev` (abrir `/leads`, excluir um lead, confirmar o modal nomeado, ir a `/lixeira`, ver a coluna "Excluído em", restaurar, confirmar volta a `/leads`) ainda é recomendado antes de considerar a UI polida.
- Nenhum blocker para a Fase 2 (importação CSV).

---
*Phase: 01-lead-sub-nicho-foundation*
*Completed: 2026-07-22*

## Self-Check: PASSED

All claimed files confirmed present on disk (`scripts/guard-no-hard-delete.cjs`, `src/components/delete-lead-dialog.tsx`, `src/components/lixeira-table.tsx`, `src/app/lixeira/page.tsx`, `src/actions/lead-actions.ts`, `src/components/lead-table.tsx`, `src/components/lead-table-columns.tsx`, `package.json`, this SUMMARY.md). Both claimed commit hashes (`ed5ed09`, `789cd57`) confirmed present in `git log --oneline --all`.
