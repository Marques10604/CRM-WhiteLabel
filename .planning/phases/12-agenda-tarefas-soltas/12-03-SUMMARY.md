---
phase: 12-agenda-tarefas-soltas
plan: 03
subsystem: ui
tags: [react-hook-form, zod-resolver, dialog, calendar, sonner, hard-delete, accessibility]

requires:
  - phase: 12-agenda-tarefas-soltas (plano 02)
    provides: "4 Server Actions (`createTarefa`/`updateTarefa`/`concluirTarefa`/`deleteTarefa`), `ActionState` homogêneo, `tarefaSchema`/`TarefaFormValues`, tipo `Tarefa`"
  - phase: 04-follow-up-dashboard-whatsapp-outreach
    provides: "molde do card clicável do dashboard (`followup-dashboard.tsx`) e do botão-ícone ghost 36px (`whatsapp-send-button.tsx`)"
  - phase: 11-painel-de-metricas
    provides: "molde do dialog de exclusão (`delete-motivo-perda-dialog.tsx`)"
provides:
  - "`src/components/delete-tarefa-dialog.tsx` — confirmação não-dispensável (`showCloseButton={false}`) antes do hard-delete (D-08)"
  - "`src/components/tarefa-form-dialog.tsx` — `TarefaFormDialog({ open, onOpenChange, tarefa? })`, criar/editar com 2 campos (descricao + data), rodapé Excluir/Cancelar/Concluir/Salvar em modo edição"
  - "`src/components/tarefa-card.tsx` — `TarefaCard({ tarefa, dateClassName, onEdit })`, card enxuto (D-03) com botão-ícone de concluir (D-07)"
affects: [12-04]

tech-stack:
  added: []
  patterns:
    - "Controle rápido 'concluir' materializado como `Button variant=ghost size=icon-lg` com troca de ícone `Circle`→`CircleCheck` por `group-hover:`/`group-focus-visible:` (sem primitivo checkbox, sem estado useState)"
    - "Card de tarefa reusa VERBATIM o container do card de lead — distinção só por subtração + ícone (D-03)"

key-files:
  created:
    - src/components/delete-tarefa-dialog.tsx
    - src/components/tarefa-form-dialog.tsx
    - src/components/tarefa-card.tsx
  modified: []

key-decisions:
  - "Estado hover/foco do ícone de concluir: dois ícones empilhados alternados por `group-hover:hidden`/`group-focus-visible:hidden` no `Circle` e `group-hover:block`/`group-focus-visible:block` no `CircleCheck` — foco por teclado produz o mesmo efeito visual do mouse, sem `useState` de hover"
  - "`DiscardChangesDialog` MANTIDO no `TarefaFormDialog` (via `form.formState.isDirty` no `closeWithDiscardGuard`) — o 12-UI-SPEC permite omitir num form de 2 campos, mas manter custa ~15 linhas e preserva paridade 1:1 com `lead-form-dialog.tsx`"
  - "Toast de conclusão + ação 'Desfazer' duplicado (não extraído para helper compartilhado): a acceptance criteria da Task 2 exige a string literal `Desfazer` DENTRO de `tarefa-card.tsx` por grep — extrair para um módulo comum quebraria esse gate. Custo: 3 strings repetidas entre `tarefa-card.tsx` e `tarefa-form-dialog.tsx`"
  - "`eslint-disable-next-line react-hooks/refs` documentado em `tarefa-form-dialog.tsx` no par `onSubmit={form.handleSubmit(onSubmit)}` — mesmo falso-positivo do React Compiler já aceito em `configuracoes-form.tsx`/`lead-timeline-dialog.tsx` (STATE.md, decisões 07-02/09-03)"

patterns-established:
  - "Botão-ícone de ação binária com feedback de estado por `group-hover`/`group-focus-visible` (alternativa ao `<Checkbox>` quando o primitivo não está instalado)"

requirements-completed: []

duration: ~20min
completed: 2026-08-29
---

# Phase 12 Plan 03: Componentes de UI da Tarefa (isolados do dashboard) Summary

**Os 3 componentes de UI da tarefa — `DeleteTarefaDialog` (confirmação não-dispensável antes do hard-delete, D-08), `TarefaFormDialog` (criar/editar com só descrição + data, D-06) e `TarefaCard` (card enxuto distinguível do card de lead por subtração + ícone `ListTodo`, D-03, com botão-ícone rápido de concluir que não abre o dialog, D-07) — construídos com primitivos já instalados, sem nenhuma dependência npm nova nem bloco do registry shadcn. Nenhum ainda montado no dashboard: a integração é o plano 12-04.**

## Contexto da retomada

Este plano estava **interrompido** no início da sessão: a Task 1 tinha gravado `delete-tarefa-dialog.tsx` e `tarefa-form-dialog.tsx` no working tree (sem commit, sem `tsc`/eslint rodados) e a Task 2 (`tarefa-card.tsx`) não tinha começado. Retomada via `/gsd-resume-work` → `/gsd-execute-phase 12`. Nenhum agente/worktree interrompido, sem `HANDOFF.json`, sem `.continue-here` da Fase 12. `safe_resume_gate`: nenhum commit `12-03` existia — sem risco de trabalho duplicado.

## Accomplishments

- **`src/components/delete-tarefa-dialog.tsx`** — cópia estrutural de `delete-motivo-perda-dialog.tsx`. `<DialogContent showCloseButton={false}>` (não-dispensável pelo X, D-08). Título "Excluir tarefa", descrição com aviso verbatim "Essa ação não pode ser desfeita.", rodapé "Cancelar" (`variant="outline"`) + "Excluir" (`variant="destructive"`). Doc-comment registra a DIVERGÊNCIA de política: aqui confirmar dispara hard-delete real (linha some do banco), oposto do soft-delete de sub-nicho/motivo-de-perda.
- **`src/components/tarefa-form-dialog.tsx`** — casca de `lead-form-dialog.tsx` podada para 2 campos. `isEditMode = Boolean(tarefa)`; `useActionState(isEditMode ? updateTarefa : createTarefa)`. `useForm` com `defaultValues.data = tarefa?.data ?? startOfDay(new Date())` (Pitfall documentado: sem o `Date` real o `zodResolver` barra o submit em silêncio). `onSubmit` monta `new FormData(formRef.current)` do DOM bruto e chama `formAction` dentro de `startTransition` (React 19). `<form noValidate>` (regressão 260801-ij4). Campo Descrição = `<Input>` de linha única (D-06, o `truncate` do card assume single-line). Campo Data = `<Controller>` + `<Calendar mode="single">` + `<input type="hidden" name="data">` com `startOfDay` (Pitfall de fuso). Rodapé modo criar: Cancelar + Salvar (teal `#0D9488`, "Salvando..." enquanto `pending`). Rodapé modo editar: Excluir (`variant="destructive"`, `sm:mr-auto`, abre `DeleteTarefaDialog`) · Cancelar · Concluir (`variant="outline"` + `<CircleCheck className="size-4" />`) · Salvar. `useEffect` de toast pós-submit ("Tarefa criada."/"Tarefa salva."/erro). `DiscardChangesDialog` mantido.
- **`src/components/tarefa-card.tsx`** — `"use client"`, exporta `TarefaCard({ tarefa, dateClassName, onEdit })`. Container copiado VERBATIM do card de lead (`followup-dashboard.tsx` L179): `flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 focus-visible:...ring-[#0D9488]`, com `role="button"`, `tabIndex={0}`, `onClick`/`onKeyDown` (Enter/Space + `preventDefault`) → `onEdit(tarefa)`. Cluster esquerdo: `<ListTodo className="size-4 shrink-0 text-muted-foreground">` + descrição (`min-w-0 truncate` + `title`) + data (`cn("text-[14px] leading-normal", dateClassName)`, `format(tarefa.data, "dd/MM/yyyy")`). **Só a data** — nenhum adereço de lead. Cluster direito: `<div onClick={stopPropagation} onKeyDown={stopPropagation}>` envolvendo só o `<Button variant="ghost" size="icon-lg" className="group">` de concluir, com `Circle`/`CircleCheck` alternados por `group-hover:`/`group-focus-visible:`. Clique → `concluirTarefa(id)` em `startTransition` + `toast.success("Tarefa concluída.", { action: { label: "Desfazer", ... } })`.

## Task Commits

1. **Task 1: `DeleteTarefaDialog` + `TarefaFormDialog`** — `3211dcf` (feat) — inclui o `eslint-disable react-hooks/refs` documentado
2. **Task 2: `TarefaCard`** — `9528807` (feat)

**Plan metadata:** _(este commit)_

## Verificação

Gates rodados em SEQUÊNCIA (host 4GB, dev server parado), exit 0:

1. `npx tsc --noEmit` → **exit 0**
2. `npx eslint src/components/tarefa-form-dialog.tsx src/components/delete-tarefa-dialog.tsx` → **exit 0** (após adicionar o `eslint-disable` documentado no par `form.handleSubmit`)
3. `npx eslint src/components/tarefa-card.tsx` → **exit 0**
4. Cópia verbatim (16 strings do 12-UI-SPEC §Copywriting nos 2 dialogs) → **OK**
5. Contratos estruturais de `tarefa-form-dialog.tsx` (`zodResolver(tarefaSchema)`, `useActionState`, `startTransition`, `noValidate`, `startOfDay`, `type="hidden"`, `DeleteTarefaDialog`, `concluirTarefa`, `deleteTarefa`, `desfazer`; sem `Textarea`) → **OK**
6. Ausência de adereços de lead em `tarefa-card.tsx` (`EtapaBadge`, `WhatsAppSendButton`, `subnicho`, `normalizePhone`, `CalendarClock`, `Sugestão` ausentes) → **OK**
7. Contratos de `tarefa-card.tsx` (`ListTodo`, `Circle`, `CircleCheck`, `stopPropagation`, `role="button"`, `tabIndex={0}`, `concluirTarefa`, `startTransition`, `Concluir tarefa`, `Desfazer`, `size="icon-lg"`, `truncate`) → **OK**
8. Container do card == classes do card de lead (`rounded-lg border border-zinc-200 bg-white p-4`) → **OK**
9. `git status --porcelain package.json package-lock.json src/components/ui` → **vazio** (nenhuma dependência nova, nenhum bloco do registry)

## Decisions Made

Ver frontmatter `key-decisions`. Resumo das áreas de "discretion" do plano:
- **Hover/foco do ícone de concluir:** dois ícones empilhados + `group-hover:`/`group-focus-visible:` (não `useState`).
- **`DiscardChangesDialog`:** mantido (não omitido).
- **`eslint-disable`:** 1 ocorrência documentada (`react-hooks/refs` no `form.handleSubmit`), padrão já aceito no projeto.

## Deviations from Plan

- **Toast de conclusão NÃO extraído para helper compartilhado.** O plano sugeria ("Se o toast e o Desfazer forem centralizados... extraí-lo... não duplicar as strings"), mas a acceptance criteria da Task 2 exige a string literal `Desfazer` dentro de `tarefa-card.tsx` via grep — um helper importado quebraria o gate. Optei pelo gate explícito; as 3 strings (`Tarefa concluída.`/`Desfazer`/`Tarefa reaberta.`) ficam repetidas entre `tarefa-card.tsx` e `tarefa-form-dialog.tsx`. Baixo risco (cópia fixa, sem lógica).

## Issues Encountered

- `npx eslint` reportou `react-hooks/refs` em `tarefa-form-dialog.tsx:174` (o par `onSubmit={form.handleSubmit(onSubmit)}` + `formRef.current`) — falso-positivo do React Compiler idêntico ao já suprimido em `configuracoes-form.tsx`/`lead-timeline-dialog.tsx`. Resolvido com `eslint-disable-next-line` documentado, sem alterar comportamento. (Curiosidade: o `eslint` sai com código 0 mesmo reportando o erro neste host — a asserção de "sem output" é o gate real.)

## User Setup Required

Nenhum.

## Next Phase Readiness

- **12-04** desbloqueado: `TarefaFormDialog`, `TarefaCard` e `DeleteTarefaDialog` prontos com as props exatas que o plano 12-04 declara em `<interfaces>`. Falta montar tudo no dashboard (`followup-dashboard.tsx` + `page.tsx`), somar tarefas às 3 seções de urgência via `buildDashboardItems`, e rodar a suíte completa de gates + UAT humano.
- **TAREFA-01 / TAREFA-02 permanecem `Pending`** — o comportamento observável só existe após 12-04. `requirements-completed: []` de propósito.
- Nenhum blocker.

## Self-Check: PASSED

- `src/components/delete-tarefa-dialog.tsx` — FOUND
- `src/components/tarefa-form-dialog.tsx` — FOUND
- `src/components/tarefa-card.tsx` — FOUND
- Commit `3211dcf` — FOUND
- Commit `9528807` — FOUND
- `tsc --noEmit` exit 0, `eslint` escopado sem output nos 3 arquivos

---
*Phase: 12-agenda-tarefas-soltas*
*Completed: 2026-08-29*
