---
phase: 10-sequ-ncia-de-follow-up-escalonada
plan: 03
subsystem: ui
tags: [server-actions, formdata, zod, react-hook-form, shadcn]

# Dependency graph
requires:
  - phase: 10-sequ-ncia-de-follow-up-escalonada (plano 01)
    provides: "configuracoes.sequenciaIntervalosDias (coluna viva), sequenciaIntervalosSchema e configuracoesServerSchema exportados de src/lib/validations.ts"
provides:
  - "saveConfiguracoes lendo a lista dinâmica de intervalos via formData.getAll(\"intervaloDias\"), validada por configuracoesServerSchema"
  - "Seção 'Sequência de reabordagem' em /configuracoes: lista dinâmica adicionar/remover/renumerar, dentro do mesmo <form> e mesmo botão 'Salvar configurações'"
affects: [10-04-indicador-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "formData.getAll(name) para ler N entradas repetidas do mesmo <form> nativo (Object.fromEntries sozinho descarta todas menos a última)"
    - "Lista dinâmica de formulário como useState local com id estável por linha (contador em useRef, nunca o índice), fora do react-hook-form, com validação client própria rodada dentro de onSubmit antes de formAction"

key-files:
  modified:
    - src/actions/configuracoes-actions.ts
    - src/components/configuracoes-form.tsx

key-decisions:
  - "Ids de linha da lista dinâmica: linhas iniciais (carregadas de config) usam o índice como id (seguro, roda uma única vez no lazy initializer do useState); linhas adicionadas depois usam um contador em useRef semeado com o tamanho inicial — ler ref.current dentro do inicializador do useState dispara o falso-positivo react-hooks/refs do React Compiler, então o contador só é lido/escrito dentro de event handlers"
  - "Erro de validação da lista dinâmica é uma única string (não array por índice) — suficiente para as duas mensagens do contrato (\"Adicione ao menos um intervalo.\"/\"Mínimo de 1 dia.\"), opção explicitamente permitida pelo plano"

requirements-completed: [SEQ-01]

# Metrics
duration: ~12min
completed: 2026-08-12
---

# Phase 10 Plan 03: UI de Configuração da Sequência de Follow-up Escalonada Summary

**Server Action lendo N intervalos repetidos via `formData.getAll` (não mais `Object.fromEntries`) e nova seção "Sequência de reabordagem" em `/configuracoes` com lista dinâmica adicionar/remover/renumerar, salva pelo mesmo botão dos 3 campos de dias-parado da Fase 7.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-12T17:14:49Z (aprox., conforme STATE.md ao início da sessão)
- **Completed:** 2026-08-12T17:25:23Z
- **Tasks:** 2/2 completas
- **Files modified:** 2

## Accomplishments
- `saveConfiguracoes` corrigido para nunca mais perder intervalos repetidos: `formData.getAll("intervaloDias")` + `configuracoesServerSchema.safeParse` como validação autoritativa, com comprovação comportamental de 3 casos (3 valores, lista vazia, valor 0)
- Seção "Sequência de reabordagem" implementada em `/configuracoes` seguindo o `10-UI-SPEC.md` literalmente: copy, cores, espaçamento e tipografia sem variações
- Lista dinâmica funcional (estado local `useState`, sem `useFieldArray`) com renumeração automática dos rótulos, estado vazio tratado e foco movendo para a nova linha ao clicar "Adicionar intervalo"
- Os 3 campos de dias-parado da Fase 7 continuam intocados no mesmo `<form>`/mesmo botão "Salvar configurações"

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: saveConfiguracoes lendo a lista repetida do FormData e revalidando o dashboard** - `810432b` (feat)
2. **Task 2: Seção "Sequência de reabordagem" com lista dinâmica no formulário de configurações** - `9a10bbd` (feat)

_Nenhuma task foi TDD; este plano não usa o fluxo RED/GREEN/REFACTOR._

## Files Created/Modified
- `src/actions/configuracoes-actions.ts` - `saveConfiguracoes` troca `configuracoesSchema` por `configuracoesServerSchema`; monta `{ ...Object.fromEntries(formData), sequenciaIntervalosDias: formData.getAll("intervaloDias") }` antes do `safeParse`; upsert/`revalidatePath("/configuracoes")`/`revalidatePath("/pipeline")` intocados; `revalidatePath("/")` acrescentado (D-05, sugestão também aparece no dashboard)
- `src/components/configuracoes-form.tsx` - `<form>` passa a envolver dois cards (dias-parado + sequência de reabordagem) em vez de um só; novo estado local `IntervaloRow[]` (id + valor) para a lista dinâmica; `handleAdicionarIntervalo`/`handleRemoverIntervalo`/`handleAlterarIntervalo`; validação client via `sequenciaIntervalosSchema.safeParse` dentro de `onSubmit`, antes de `formAction`; ícones `Plus`/`Trash2` (lucide-react, já no pacote)

## Comprovação comportamental do `safeParse` da Task 1 (rodada com `tsx`, mesmo schema real de `src/lib/validations.ts`)

```
Caso 1 (3 intervalos): [4,10,20]
Caso 2 (lista vazia): ["Adicione ao menos um intervalo."]
Caso 3 (valor 0): ["Mínimo de 1 dia."]
```

Os 3 resultados batem exatamente com os critérios de aceite do plano: um `FormData` com três entradas `intervaloDias` produz `[4,10,20]` (prova de que `formData.getAll` funciona e não descarta valores repetidos), a lista vazia é barrada com a mensagem literal do `10-UI-SPEC.md`, e o valor `0` é barrado com "Mínimo de 1 dia.".

## `<human-check>` (verificação manual em navegador, 8 passos do plano)

**Não executado nesta sessão — sem acesso a navegador.** Este é um agente headless sem ferramenta de automação de navegador disponível no toolset desta sessão (mesma limitação já documentada em praticamente todos os `SUMMARY.md` anteriores do projeto, ex.: `02-02`, `02-03`, `04-01` a `04-04`). Por causa do host de 4GB RAM (`PROJECT.md` Key Decisions), o `npm run dev` não foi iniciado nesta sessão só para ficar ocioso sem um consumidor real (navegador) capaz de exercitar os 8 passos.

Os 3 gates estáticos do `<verification>` do plano foram executados com sucesso, sequencialmente, sem o dev server ativo:
1. `npx tsc --noEmit` — exit 0, sem saída
2. `npx eslint src/components/configuracoes-form.tsx src/actions/configuracoes-actions.ts` — exit 0 (1 warning pré-existente e não relacionado, ver Deviations)
3. `npm run verify:schema` — exit 0, confirma `sequencia_posicao`/`sequencia_intervalos_dias` presentes em `data/crm.db`

**Recomendado antes de considerar SEQ-01 pronto para uso real:** rodar os 8 passos do `<human-check>` do `10-03-PLAN.md` em uma sessão com acesso a navegador (`npm run dev` + `http://localhost:3000/configuracoes`), especialmente o passo 4 (recarregar após salvar 4 intervalos — é o passo que prova de fato, na UI renderizada, que `formData.getAll` funcionou; a Task 1 já tem prova comportamental equivalente via `tsx` fora do navegador, mas não substitui o clique real).

## Decisions Made

- Ids de linha da lista dinâmica: linhas iniciais usam o índice do array como id (seguro porque o inicializador do `useState` roda uma única vez); linhas adicionadas depois usam um contador em `useRef` semeado com o tamanho inicial da lista. Ler `ref.current` dentro do próprio inicializador do `useState` dispara o falso-positivo `react-hooks/refs` do React Compiler (confirmado ao rodar `npx eslint` — ver Deviations), então o contador só é lido/escrito dentro de event handlers (`handleAdicionarIntervalo`), nunca durante o render.
- Erro de validação da lista dinâmica é representado como uma única `string | null` (não um array de erros por índice) — suficiente para as duas mensagens exatas do `10-UI-SPEC.md` ("Adicione ao menos um intervalo."/"Mínimo de 1 dia."), opção explicitamente permitida pelo texto do plano ("ou um array de erros por índice, se preferir granularidade por linha").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falso-positivo `react-hooks/refs` ao ler o contador de ids dentro do inicializador do `useState`**
- **Found during:** Task 2, primeira rodada de `npx eslint`
- **Issue:** A primeira versão do componente chamava a função `novoRowId()` (que lê/escreve `rowIdCounter.current`) dentro da função lazy-init passada a `useState`. O React Compiler (`react-hooks/refs`) trata isso como "acessar ref durante o render", mesmo o inicializador rodando uma única vez — erro de lint bloqueante (`npx eslint` saía com exit 1).
- **Fix:** As linhas iniciais passaram a usar o índice do array como id (seguro para o carregamento único de `config.sequenciaIntervalosDias`); `rowIdCounter` foi semeado com `config.sequenciaIntervalosDias.length` e só é incrementado/lido dentro de `handleAdicionarIntervalo` (event handler), nunca no inicializador do `useState`.
- **Files modified:** `src/components/configuracoes-form.tsx`
- **Verification:** `npx eslint src/components/configuracoes-form.tsx` passou a sair com exit 0 (só o warning pré-existente e não relacionado permaneceu).
- **Committed in:** `9a10bbd` (Task 2 commit — o código já nasceu corrigido no único commit da task, sem commit de correção separado)

**2. [Rule 1 - Bug] Copy literal do `10-UI-SPEC.md` quebrada em duas linhas no JSX**
- **Found during:** Task 2, verificação inline `node -e "..."` do plano
- **Issue:** O texto de ajuda da seção ("Intervalos crescentes, em dias...") foi escrito em duas linhas de JSX por legibilidade do código-fonte; a checagem de string literal do plano (`s.includes(...)`) falhou porque o arquivo em disco contém uma quebra de linha onde o contrato exige um único espaço.
- **Fix:** Texto reescrito em uma única linha de JSX, idêntico byte-a-byte ao `10-UI-SPEC.md` §Copywriting Contract.
- **Files modified:** `src/components/configuracoes-form.tsx`
- **Verification:** Checagem inline do plano (`node -e "..."`) passou a reportar `OK formulario 10-03 T2`.
- **Committed in:** `9a10bbd` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 correções de bug, Rule 1 — ambas descobertas e corrigidas durante a própria Task 2, antes do commit)
**Impact on plan:** Nenhum impacto de escopo — as duas correções mantêm exatamente o comportamento e a cópia exigidos pelo plano, só ajustando a forma como o código-fonte os expressa.

## Issues Encountered

Nenhum além das 2 correções já documentadas em Deviations. `npx tsc --noEmit` ficou limpo durante toda a execução (nenhuma iteração de erro de tipo).

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- `saveConfiguracoes` e a seção "Sequência de reabordagem" estão prontos para uso; falta apenas o `<human-check>` de navegador (ver seção acima) antes de considerar SEQ-01 validado end-to-end pelo admin real.
- O plano 10-04 (indicador visual `CalendarClock`/"Sugestão: dd/MM" no dashboard e no pipeline) pode consumir `config.sequenciaIntervalosDias` diretamente, já persistido corretamente por este plano — nenhum trabalho de fundação pendente.
- Nenhum arquivo de schema, action de lead ou componente de exibição de leads foi tocado neste plano, conforme o `<success_criteria>` do `10-03-PLAN.md`.
- Sem bloqueios conhecidos para o plano 10-04.

---
*Phase: 10-sequ-ncia-de-follow-up-escalonada*
*Completed: 2026-08-12*

## Self-Check: PASSED

Os 3 arquivos citados neste SUMMARY (`src/actions/configuracoes-actions.ts`, `src/components/configuracoes-form.tsx`, este próprio SUMMARY.md) confirmados presentes em disco. Os 2 commits das tasks (`810432b`, `9a10bbd`) e o commit deste SUMMARY (`c2ced01`) confirmados em `git log --oneline --all`.
