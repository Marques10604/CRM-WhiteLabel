---
phase: quick-260808-h5i
plan: 01
subsystem: ui
tags: [react-19, useActionState, startTransition, forms, react-hook-form]

requires: []
provides:
  - "formAction do useActionState agora chamado dentro de startTransition no formulario de lead (criacao/edicao)"
  - "estado pending do useActionState atualiza de forma confiavel durante o submit (botao Salvando...)"
affects: [lead-form-dialog, csv-import futuro se reusar o mesmo padrao de useActionState fora de transition]

tech-stack:
  added: []
  patterns:
    - "Chamadas de formAction (useActionState) sempre envolvidas em startTransition(() => { ... }), FormData montado ANTES da transition para preservar o snapshot sincrono do DOM"

key-files:
  created: []
  modified:
    - src/components/lead-form-dialog.tsx

key-decisions:
  - "startTransition (funcao standalone) usado em vez de useTransition (hook) para nao introduzir um segundo estado de pending redundante com o que useActionState ja devolve"
  - "FormData continua montado a partir de formRef.current (DOM bruto) ANTES de entrar na startTransition, preservando 100% o contrato de Phase 01 de nao reenviar valores ja parseados pelo react-hook-form"

patterns-established:
  - "Wrapper startTransition ao redor de chamadas de formAction vindas de useActionState, sempre que o disparo acontecer fora de um <form action={...}> nativo (ex.: onSubmit customizado com form.handleSubmit)"

requirements-completed: [QUICK-260808-h5i]

duration: ~10min
completed: 2026-08-08
---

# Quick Task 260808-h5i: Corrigir warning React 19 useActionState fora de transition — Summary

**`formAction` do `useActionState` em `lead-form-dialog.tsx` agora é chamado dentro de `startTransition`, eliminando o warning do React 19 e corrigindo o `pending` que não atualizava de forma confiável durante o submit.**

## Performance

- **Duração:** ~10 min (retomada de sessão interrompida por limite; gates já haviam sido rodados na sessão anterior, apenas o commit/SUMMARY faltavam)
- **Completado:** 2026-08-08
- **Tasks:** 1/1
- **Arquivos modificados:** 1

## Accomplishments

- `startTransition` importado de `"react"` em `src/components/lead-form-dialog.tsx`, mantendo ordem alfabética junto dos hooks já importados
- `onSubmit` monta o `FormData` a partir de `formRef.current` (leitura síncrona do DOM, snapshot idêntico ao de antes) e chama `formAction(formData)` dentro de `startTransition(() => { ... })`
- Nenhuma mudança no que é enviado ao servidor — continua sendo o `FormData` bruto do DOM, nunca os valores já parseados pelo `zodResolver`/react-hook-form (decisão da Phase 01 preservada)
- Efeito colateral positivo: `pending` (3º valor de `useActionState`) agora atualiza corretamente durante o submit, então o botão "Salvando..." e o `disabled={pending}` passam a funcionar como o código já pressupunha

## Task Commits

1. **Task 1: Envolver a chamada de formAction em startTransition** - `1b7dc04` (fix)

Não há commit de metadata separado neste SUMMARY — STATE.md/ROADMAP.md ficam para o orquestrador, conforme constraint desta execução.

## Files Created/Modified

- `src/components/lead-form-dialog.tsx` - import de `startTransition` (linha 3) e `onSubmit` (~linhas 172-183) reescrito para montar `FormData` antes e chamar `formAction` dentro de `startTransition`

## Decisions Made

- `startTransition` (função standalone) em vez de `useTransition` (hook) — evita um segundo estado de `pending` redundante, `useActionState` já devolve o que é necessário.
- `FormData` continua construído a partir de `formRef.current` ANTES de entrar em `startTransition`, garantindo que a leitura do DOM continue síncrona e capture exatamente o mesmo snapshot de antes da mudança.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / contexto pré-existente] Commit inclui um segundo fix já validado no mesmo arquivo, não commitado ainda**
- **Encontrado durante:** verificação do `git diff` antes do commit da Task 1
- **Contexto:** uma sessão de debug anterior (`.planning/debug/resolved/followup-invalid-date-input.md`, resolvida e verificada ao vivo no navegador nesta mesma data) já havia alterado `defaultValues.followUpDate` em `lead-form-dialog.tsx` (de `lead?.followUpDate` para `lead?.followUpDate ?? startOfDay(new Date())`) para corrigir o bug "Invalid input: expected date, received Date" no modo criação — mas essa mudança ficou não commitada no working tree.
- **Ação tomada:** como o PLAN.md desta tarefa (seção `<interfaces>`/baseline) já assume esse fix como parte do estado atual do arquivo e instrui explicitamente "NÃO tocar em `defaultValues`", e como ambas as mudanças vivem no mesmo arquivo sem sobreposição de linhas, optei por commitar o arquivo inteiro num único commit (`1b7dc04`), documentando as duas mudanças na mensagem de commit, em vez de tentar um staging parcial por hunk (`git add -p`) — risco desnecessário num host de 4GB sem terminal interativo confiável para essa operação.
- **Arquivo:** `src/components/lead-form-dialog.tsx`
- **Verificação:** os 4 gates automatizados (abaixo) cobrem o arquivo inteiro pós-fix, incluindo `npm run test:lead-actions`, que não testa esse campo de UI mas confirma que nenhum contrato de servidor quebrou.
- **Commitado em:** `1b7dc04` (mesmo commit da Task 1)
- **Pendência real:** `.planning/debug/resolved/followup-invalid-date-input.md` continua **untracked** (não commitado) — é um artefato de documentação de debug, fora do escopo "código apenas" desta tarefa. Fica para uma sessão futura (ou para o orquestrador) decidir se commita esse arquivo de doc separadamente.

---

**Total de desvios:** 1 auto-fixado (Rule 3, contextual — não é um bug introduzido por esta tarefa, é um fix pré-existente e já validado que compartilhava o mesmo arquivo)
**Impacto no plano:** Nenhum scope creep real — o conteúdo do fix extra já estava validado ao vivo antes desta sessão e o próprio PLAN.md já pressupunha sua presença no arquivo.

## Issues Encountered

Nenhum durante a execução técnica. A única complexidade foi decidir como lidar com o commit misto (ver Deviations acima).

## Verificação (gates automatizados)

Todos os 4 gates rodados em sequência, com `npm run dev` PARADO (confirmado via `tasklist` sem processos `node.exe` ativos antes de iniciar):

1. `npx tsc --noEmit` → **exit 0, nenhuma saída.** OK.
2. `npx eslint src/components/lead-form-dialog.tsx` → **exit 0 implícito, 0 errors, 1 warning** (`react-hooks/incompatible-library` em `form.watch("stage") === "perdido"`, linha 369 pós-fix — o mesmo warning pré-existente do baseline registrado no PLAN.md, apenas deslocado de linha pelas linhas adicionadas acima). Nenhum warning novo.
3. Check estático (`node -e '...'` do PLAN.md) → imprimiu `OK: startTransition importado de react e formAction envolvido em startTransition`, exit 0.
4. `npm run test:lead-actions` → **todas as ~34 asserções OK**, exit 0 (`[test-lead-actions] OK: todas as asserções passaram.`). Confirma que o contrato server-side de `createLead`/`updateLead`/`bulkImportLeads` não mudou.

`git diff src/components/lead-form-dialog.tsx` confirmado como tocando apenas: (a) a linha 3 do import, (b) o bloco `defaultValues.followUpDate` (fix pré-existente, ver Deviations), e (c) o corpo de `onSubmit` — nenhuma outra linha do arquivo alterada.

## Human-Check de Navegador — PENDENTE

**Este item NÃO foi verificado nesta sessão.** Sem acesso a navegador no ambiente de execução (headless), não foi possível:

1. Rodar `npm run dev`, abrir `http://localhost:3000/leads`
2. Abrir o DevTools → Console, limpar
3. Clicar "Novo lead", preencher os campos obrigatórios e clicar "Salvar"
4. Confirmar visualmente que o warning "An async function with useActionState was called outside of a transition" **não aparece mais** no console
5. Confirmar visualmente que o botão exibe "Salvando..." e fica desabilitado durante o submit
6. Remover o lead de teste (soft-delete) após a verificação

**Status: PENDENTE.** Recomendado antes de considerar este fix 100% validado em uso real — mesma ressalva recorrente de todo o projeto (nenhuma sessão até agora teve acesso a browser).

## Next Phase Readiness

- Fix pontual e isolado, sem impacto em nenhuma fase do roadmap v1.3. Não bloqueia planejamento da Phase 9 (Timeline de interações).
- Pendência carregada: commitar `.planning/debug/resolved/followup-invalid-date-input.md` (untracked) numa sessão futura, e rodar o human-check de navegador listado acima (idealmente na mesma sessão que abrir `npm run dev` para validar os pendentes de 08-02/08-03 já registrados em STATE.md).

---
*Quick task: 260808-h5i*
*Completado: 2026-08-08*

## Self-Check: PASSED

- FOUND: `src/components/lead-form-dialog.tsx`
- FOUND: `.planning/quick/260808-h5i-corrigir-warning-react-19-useactionstate/260808-h5i-SUMMARY.md`
- FOUND: commit `1b7dc04` em `git log --oneline --all`
