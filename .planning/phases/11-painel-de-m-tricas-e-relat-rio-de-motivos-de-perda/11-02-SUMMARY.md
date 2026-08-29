---
phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda
plan: 02
subsystem: ui
tags: [server-actions, drizzle, soft-delete, zod, next-app-router, crud-governado]

requires:
  - phase: 11-01
    provides: "tabela motivosPerda + FK leads.motivoPerdaId + motivoPerdaSchema + tipo MotivoPerda + guard estendido"
provides:
  - "Server Actions createMotivoPerda / renameMotivoPerda / softDeleteMotivoPerda (src/actions/motivo-perda-actions.ts)"
  - "createMotivoPerda devolve { success: true; id } — pré-requisito de D-03 (combobox criável do plano 11-03)"
  - "Tela de gestão /motivos-perda (réplica visual 1:1 de /subnichos)"
  - "Item 'Motivos de Perda' (ícone ListX) no menu lateral, após 'Sub-nichos'"
  - "Harness scripts/test-motivo-perda-actions.cjs (7 casos) + stub de next/cache para os harnesses"
affects: [11-03, 11-05]

tech-stack:
  added: []
  patterns:
    - "Combobox criável precisa que a action de criação devolva o id — ActionState de sucesso ampliado ({ success: true; id })"
    - "Stub no-op de next/cache (scripts/test-support/) para harnesses observarem o retorno de Server Actions fora do runtime do Next"

key-files:
  created:
    - src/actions/motivo-perda-actions.ts
    - src/components/motivo-perda-manager.tsx
    - src/components/delete-motivo-perda-dialog.tsx
    - src/app/motivos-perda/page.tsx
    - scripts/test-motivo-perda-actions.cjs
    - scripts/test-support/next-cache-stub.mjs
    - scripts/test-support/next-cache-stub-loader.mjs
  modified:
    - src/components/app-sidebar.tsx
    - package.json

key-decisions:
  - "createMotivoPerda/renameMotivoPerda/softDeleteMotivoPerda devolvem o mesmo shape homogêneo { success: true; id } — rename e softDelete ecoam o id recebido para manter o tipo uniforme"
  - "revalidatePath centralizado num helper revalidateMotivoPerdaRoutes() com as 4 rotas (/motivos-perda, /pipeline, /leads, /relatorios); /relatorios ainda não existe mas revalidatePath de rota inexistente é no-op seguro (evita voltar aqui no 11-05)"
  - "Harnesses de teste ganham um stub de next/cache (eslint/tsc não afetados) para poder asserir o valor de retorno das actions; o molde test-lead-actions.cjs apenas tolerava o throw de revalidatePath e verificava via banco"
  - "eslint-disable react-hooks/set-state-in-effect documentado nos 2 efeitos sucesso→toast→reset do manager (mesmo falso-positivo do React Compiler já aceito em 07-02/09-04)"

patterns-established:
  - "CRUD governado de lista extensível: réplica 1:1 de subnicho-actions/subnicho-manager/delete-subnicho-dialog trocando tabela + copy"
  - "Reativação-por-nome de registro soft-deletado (regrava a grafia recém-digitada, devolve o id da linha existente)"

requirements-completed: [PERDA-01]

duration: 30min
completed: 2026-08-27
---

# Fase 11 Plano 02: Governança da lista de motivos de perda Summary

**CRUD governado de motivos de perda (soft-delete + reativação-por-nome) com tela dedicada `/motivos-perda` espelhando `/subnichos` e item novo no menu lateral; `createMotivoPerda` já devolve o `id` exigido pelo combobox criável de D-03.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-27T21:52:00Z (aprox.)
- **Completed:** 2026-08-27T22:22:00Z
- **Tasks:** 2
- **Files modified:** 9 (7 criados, 2 modificados)

## Accomplishments

- `src/actions/motivo-perda-actions.ts`: réplica 1:1 de `subnicho-actions.ts` com `ActionState` ampliado — sucesso carrega `id` (inserido, reativado, ou ecoado por rename/softDelete). SELECT case-insensitive por `lower(trim(nome))`, reativação de nome soft-deletado regravando a grafia, mensagem literal `"Esse motivo já existe."`, try/catch de rede de segurança do uniqueIndex, `isNull(deletedAt)` no WHERE do soft-delete (idempotência), guarda `Number.isInteger(id) && id > 0`.
- `scripts/test-motivo-perda-actions.cjs`: 7 casos comportamentais em banco SQLite temporário isolado (`os.tmpdir()`), todos verdes — inclui reativação (mesmo id, contagem inalterada), soft-delete idempotente (sentinel preservado na 2ª chamada), colisão de rename, validação de nome vazio.
- Tela `/motivos-perda` (Server Component) + `MotivoPerdaManager` + `DeleteMotivoPerdaDialog` — cópia visual 1:1 de `/subnichos`, copy verbatim do 11-UI-SPEC.md.
- Item "Motivos de Perda" (ícone `ListX`, confirmado em `node_modules/lucide-react`) em `NAV_ITEMS`, imediatamente após "Sub-nichos". `/relatorios` NÃO adicionado (é do plano 11-05).

## Task Commits

1. **Task 1: Server Actions de motivo de perda + harness de teste** - `bd3f2d0` (feat)
2. **Task 2: Tela /motivos-perda (manager + diálogo de remoção) e entrada no menu lateral** - `b88bbdb` (feat)

**Plan metadata:** (este commit)

## Files Created/Modified

- `src/actions/motivo-perda-actions.ts` - 3 Server Actions de CRUD governado com soft-delete e reativação-por-nome
- `src/components/motivo-perda-manager.tsx` - gestão inline da lista (criar/renomear/remover), réplica de `subnicho-manager.tsx`
- `src/components/delete-motivo-perda-dialog.tsx` - confirmação destrutiva não-dispensável (`showCloseButton={false}`)
- `src/app/motivos-perda/page.tsx` - rota Server Component, `db.select()` filtrando `isNull(motivosPerda.deletedAt)`, `orderBy(asc(nome))`
- `scripts/test-motivo-perda-actions.cjs` - 7 casos comportamentais em banco temp isolado
- `scripts/test-support/next-cache-stub.mjs` - stub no-op de `next/cache`
- `scripts/test-support/next-cache-stub-loader.mjs` - loader que redireciona `next/cache` para o stub (encadeado com `ts-alias-loader.mjs`)
- `src/components/app-sidebar.tsx` - import `ListX` + entrada `/motivos-perda` em `NAV_ITEMS`
- `package.json` - script `test:motivo-perda-actions`

## Decisions Made

- **Shape homogêneo do `ActionState`:** as três actions devolvem `{ success: true; id }`. `rename`/`softDelete` ecoam o id recebido para o tipo ficar uniforme — só o combobox de 11-03 vai consumir o `id`; o `MotivoPerdaManager` ignora esse campo (o guard `"success" in state && state.success` continua válido).
- **`revalidatePath` num helper:** `revalidateMotivoPerdaRoutes()` chama as 4 rotas (`/motivos-perda`, `/pipeline`, `/leads`, `/relatorios`). `/relatorios` ainda não existe — `revalidatePath` de rota inexistente é no-op seguro no Next e evita reabrir este arquivo no plano 11-05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stub de `next/cache` para os harnesses de teste**
- **Found during:** Task 1 (harness de teste)
- **Issue:** `revalidatePath` lança `Invariant: static generation store missing` fora do runtime do Next. O molde `test-lead-actions.cjs` apenas tolera o throw e verifica o efeito via banco — mas o critério de aceite deste plano exige asserir o **valor de retorno** `{ success: true; id }` (pré-requisito de D-03), impossível quando a action lança antes de retornar.
- **Fix:** `scripts/test-support/next-cache-stub.mjs` (no-op de `revalidatePath`) + `next-cache-stub-loader.mjs` (loader que redireciona só `next/cache`, encadeado com `ts-alias-loader.mjs`, delega todo o resto). Não toca código de produção nem os gates `tsc`/`eslint`.
- **Files modified:** scripts/test-support/next-cache-stub.mjs, scripts/test-support/next-cache-stub-loader.mjs
- **Verification:** `npm run test:motivo-perda-actions` — 7/7 casos verdes, `id` retornado asserido em Casos 1/3/4/5
- **Committed in:** `bd3f2d0` (Task 1)

**2. [Rule 3 - Blocking] `eslint-disable react-hooks/set-state-in-effect` nos 2 efeitos do manager**
- **Found during:** Task 2 (gate `npx eslint` escopado)
- **Issue:** `eslint-config-next` 16.2.10 sinaliza como erro `setIsEditing(false)` / `setIsAdding(false)` dentro do `useEffect` de sucesso→toast→reset — o mesmo padrão do `subnicho-manager.tsx` mandatado como análogo 1:1 (que nunca foi lintado em isolamento). Sem isso o gate escopado da Task 2 não fecha.
- **Fix:** `// eslint-disable-next-line react-hooks/set-state-in-effect` com comentário de justificativa, mesmo falso-positivo do React Compiler já aceito no projeto (STATE.md decisões 07-02 e 09-04, aplicado em `whatsapp-preview-dialog.tsx`/`lead-timeline-dialog.tsx`).
- **Files modified:** src/components/motivo-perda-manager.tsx
- **Verification:** `npx eslint` escopado aos 4 arquivos da Task 2 — exit 0
- **Committed in:** `b88bbdb` (Task 2)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Ambos são infraestrutura de gate (teste + lint), nenhum toca comportamento de produção. Sem scope creep.

## Issues Encountered

- Nenhum além dos desvios acima. Reactivação-por-nome, idempotência de soft-delete e colisão de rename funcionaram na primeira execução do harness.

## Known Stubs

- `scripts/test-support/next-cache-stub.mjs` é um stub **de teste** deliberado (no-op de `next/cache`), nunca importado por código de produção. Não é um stub de funcionalidade.

## User Setup Required

None - nenhuma configuração de serviço externo.

## Next Phase Readiness

- **11-03** pode construir o `MotivoPerdaCombobox` criável consumindo `createMotivoPerda` (devolve `{ success: true; id }`) e trocar `leads.motivoPerda` (texto) por `leads.motivoPerdaId` (FK) nas superfícies de captura.
- **11-05** pode ler `/relatorios` — o `revalidatePath("/relatorios")` já está disparado por todas as mutações de motivo.
- **Pendente (gate de fim de fase, `human_verify_mode: end-of-phase`):** os 8 passos de `<human-check>` da Task 2 (navegador) — não executados nesta sessão (headless). `npm run build` não rodado (host 4GB RAM, instável; `npx tsc --noEmit` isolado passou limpo — precedente Fases 06–10).

## Self-Check: PASSED

- 7/7 arquivos criados confirmados em disco
- Commits `bd3f2d0` e `b88bbdb` confirmados em `git log`
- Gates: `npx tsc --noEmit` exit 0, `npm run test:motivo-perda-actions` 7/7 verdes, `npm run guard:no-hard-delete` OK, `npm run verify:schema` OK, `npx eslint` (4 arquivos da Task 2) exit 0

---
*Phase: 11-painel-de-m-tricas-e-relat-rio-de-motivos-de-perda*
*Completed: 2026-08-27*
