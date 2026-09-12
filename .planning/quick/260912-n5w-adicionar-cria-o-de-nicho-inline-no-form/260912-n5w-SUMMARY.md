---
phase: quick-260912-n5w
plan: 01
subsystem: ui
tags: [react, server-actions, drizzle, base-ui-combobox, campanhas, nichos]

requires:
  - phase: 11-motivos-de-perda
    provides: "motivo-perda-combobox.tsx / motivo-perda-actions.ts como molde do primeiro combobox criável do projeto"
  - phase: 22-campanhas-de-exploracao-de-nicho
    provides: "tabela campanhas, campanha-form-dialog.tsx, NichoCombobox de leitura pura"
provides:
  - "createNicho/renameNicho/softDeleteNicho com shape homogêneo { success: true; id }"
  - "revalidateNichoRoutes() unificando a revalidação de rotas de nicho, incluindo /campanhas"
  - "NichoCombobox com criação-na-hora opt-in (prop allowCreate)"
  - "Criação de nicho de dentro do modal Nova campanha, sem passar por /nichos"
affects: [campanhas, nichos, leads]

tech-stack:
  added: []
  patterns:
    - "Combobox criável opt-in via prop allowCreate — mesmo idioma de motivo-perda-combobox.tsx, agora replicado para nicho"

key-files:
  created:
    - scripts/test-nicho-actions.cjs
  modified:
    - src/actions/nicho-actions.ts
    - src/actions/motivo-perda-actions.ts
    - src/components/nicho-manager.tsx
    - src/components/nicho-combobox.tsx
    - src/components/campanha-form-dialog.tsx
    - package.json

key-decisions:
  - "D-01: allowCreate é opt-in, default false — só campanha-form-dialog.tsx liga"
  - "D-02: zero pacote npm novo, zero primitivo shadcn novo"
  - "D-03: a criação passa obrigatoriamente por createNicho (nenhum caminho de escrita novo)"
  - "D-04: createNicho passa a devolver id; renameNicho/softDeleteNicho ecoam o id recebido"

patterns-established:
  - "Segunda ocorrência do padrão 'combobox criável' do projeto — precedente motivo-perda-combobox.tsx (11-03), agora nicho-combobox.tsx"

requirements-completed: [QUICK-260912-n5w]

duration: 20min
completed: 2026-09-12
---

# Phase quick-260912-n5w: Criação de nicho inline no form de campanha Summary

**Combobox de nicho ganhou criação-na-hora opt-in (prop `allowCreate`), ligada só no modal "Nova campanha", reusando 100% a Server Action `createNicho` já existente — mesmo idioma do primeiro combobox criável do projeto (`motivo-perda-combobox.tsx`, plano 11-03).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-12
- **Tasks:** 3/3 completos
- **Files modified:** 6 (1 criado, 5 modificados)

## Accomplishments

- `createNicho`/`renameNicho`/`softDeleteNicho` agora devolvem shape homogêneo `{ success: true; id }`, com `revalidateNichoRoutes()` unificando a revalidação (hoje inclui `/campanhas`, que faltava)
- `NichoCombobox` ganhou modalidade criável opt-in (`allowCreate`), preservando 100% o comportamento de leitura pura para os dois consumidores intocados
- Modal "Nova campanha" permite criar um nicho inexistente sem sair do fluxo — o nicho criado já vem selecionado
- Cobertura automatizada nova do CRUD de nicho (`scripts/test-nicho-actions.cjs`, 7 casos, espelho de `test-motivo-perda-actions.cjs`), lacuna que não existia antes desta tarefa

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: createNicho devolve id + revalida /campanhas (+ harness)** - `c2c562e` (feat)
2. **Task 2: NichoCombobox com criação-na-hora opt-in** - `8d0f8ae` (feat)
3. **Task 3: ligar allowCreate no modal de campanha + gates finais** - `6fd97c0` (feat)

**Plan metadata:** (commit final de docs feito pelo orquestrador, fora deste executor)

## Files Created/Modified

- `scripts/test-nicho-actions.cjs` - 7 casos de cobertura comportamental do CRUD de nicho (novo)
- `src/actions/nicho-actions.ts` - `ActionState` ampliado com `id`, `revalidateNichoRoutes()` extraído, `.returning()` no insert
- `src/actions/motivo-perda-actions.ts` - comentário de topo atualizado (divergência com `createNicho` deixou de existir)
- `src/components/nicho-manager.tsx` - `ActionState` local ampliado com `id: number` (nenhum consumo novo)
- `src/components/nicho-combobox.tsx` - porte do padrão de `motivo-perda-combobox.tsx`, prop `allowCreate` opt-in
- `src/components/campanha-form-dialog.tsx` - liga `allowCreate` no `NichoCombobox`, `FieldDescription` atualizado
- `package.json` - novo script `test:nicho-actions`

## Decisions Made

- **D-01 (travada no plano):** `allowCreate` opt-in, default `false` — só `campanha-form-dialog.tsx` liga. `csv-import-preview-table.tsx` já tem criação automática de nicho por nome no import em lote (caminho concorrente indesejado); `lead-form-dialog.tsx` está fora do pedido do usuário.
- **D-02 (travada no plano):** zero pacote npm novo, zero primitivo shadcn novo — tudo sai de `@/components/ui/combobox` + `lucide-react`.
- **D-03 (travada no plano):** a criação passa obrigatoriamente por `createNicho` — proibido `db.insert` direto no componente, proibido schema Zod paralelo.
- **D-04 (travada no plano):** `createNicho` passa a devolver `id`; `renameNicho`/`softDeleteNicho` ecoam o id recebido — shape homogêneo, réplica exata de `motivo-perda-actions.ts`.

## Deviations from Plan

None - plan executado exatamente como escrito.

## Issues Encountered

None.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Pending Human Verification

O plano inclui um `<human-check>` na Task 3 que não foi executado por este executor (sem acesso a navegador/UI neste ambiente). Passos pendentes para validação manual em `/campanhas`:

1. No botão de nova campanha, digitar um nome de nicho que não existe e conferir que aparece a linha `Criar "..."` em destaque (`text-primary`)
2. Pressionar Enter sobre ela e conferir que o campo passa a exibir o nicho recém-criado, com o modal ainda aberto
3. Salvar a campanha e conferir que ela lista com o nicho certo
4. Abrir `/nichos` e conferir que o nicho novo está lá
5. Repetir digitando o nome de um nicho que JÁ existe e conferir que a linha Criar NÃO aparece
6. Conferir nos temas claro e escuro

Todos os gates automatizados da Task 3 (`tsc`, `lint`, `verify:schema`, `guard:no-hard-delete`, `test:nicho-actions`, `test:motivo-perda-actions`, `build`) passaram — o pendente é só a passada visual humana.

## Next Phase Readiness

- Funcionalidade pronta para uso assim que a verificação visual humana acima for feita
- Nenhum bloqueio conhecido

---
*Phase: quick-260912-n5w*
*Completed: 2026-09-12*

## Self-Check: PASSED

Todos os arquivos criados/modificados citados foram confirmados em disco, e os 3 hashes de commit (`c2c562e`, `8d0f8ae`, `6fd97c0`) confirmados em `git log`.
