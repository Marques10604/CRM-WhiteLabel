---
phase: 01-lead-sub-nicho-foundation
plan: 02
subsystem: lead-crud-ui
tags: [nextjs, react, react-hook-form, zod, tanstack-table, base-ui, server-actions, date-fns]

# Dependency graph
requires: [01-01]
provides:
  - "Contratos de dados: dinheiro em centavos (parseBRLToCents/formatCentsToBRL, round-half-up, pré-validação estrita) e telefone dígitos-only DDI 55 (normalizePhone)"
  - "leadSchema (Zod) validando client (zodResolver) e server (safeParse) com as mesmas mensagens pt-BR"
  - "createLead/updateLead Server Actions com pré-checagem de subnichoId + backstop de FK (SQLITE_CONSTRAINT_FOREIGNKEY) + guard de soft-delete no update"
  - "Modal de lead completo (criar/editar) com 3 seções, combobox de sub-nicho, aviso de descarte de alterações, badge de etapa reutilizável"
  - "Rota / funcional: lista de leads ativos ordenada por follow-up mais próximo, com criar/editar via modal e estado vazio com CTA"
affects: [01-03-lead-list-filters, 01-04-soft-delete-lixeira, phase-3-pipeline-board]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FormData bruto do DOM no submit (não os dados já transformados pelo resolver do react-hook-form) — evita dupla-conversão de centavos, já que parseBRLToCents não é idempotente sobre seu próprio output"
    - "Controller do react-hook-form para componentes Base UI não-nativos (Select, Combobox, Calendar), combinado com o `name` prop desses componentes para o hidden input real que vai no FormData"
    - "key={mode-lead.id} no LeadFormDialog para forçar remount ao trocar entre criar/editar leads diferentes, resetando defaultValues do react-hook-form"
    - "Dialog Base UI: onOpenChange(open, eventDetails) + eventDetails.cancel() para interceptar fechamento com alterações não salvas (D-04) sem lib extra de confirmação"
    - "Join client-side leads->subnichos via Map em lead-table.tsx (LeadRow = Lead & { subnichoNome })"

key-files:
  created:
    - src/components/lead-form-dialog.tsx
    - src/components/discard-changes-dialog.tsx
    - src/components/etapa-badge.tsx
    - src/components/lead-table.tsx
    - src/components/lead-table-columns.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "Submissão do formulário usa FormData(formRef.current) — o DOM bruto, com o valor/telefone ainda como o usuário digitou — nunca os dados já parseados pelo zodResolver do react-hook-form. Isso evita reenviar '123456' (já em centavos) para o server, que o reinterpretaria como R$ 123.456,00 via parseBRLToCents (parseBRLToCents não é idempotente sobre seu próprio output em centavos)."
  - "Etapa 'Fechado/Perdido' usa cor slate neutra (#E2E8F0/#1E293B), não verde/vermelho — decisão já travada em 01-UI-SPEC.md linha 101 (schema tem um único valor de stage para os dois resultados, colorir diferente seria enganoso)."
  - "'Novo lead' e os elementos de acento usam className bg-[#0D9488] explícito (tailwind-merge via cn() sobrepõe o bg-primary padrão do Button) — o tema Tailwind base (oklch cinza) não foi customizado para a cor accent do projeto nesta fase."
  - "Nenhum componente Popover foi adicionado ao registry shadcn (não estava em ui/ nem no UI-SPEC); o Calendar do follow-up é renderizado inline dentro da seção 'Acompanhamento', não num popover flutuante."

patterns-established:
  - "Toda mutação de lead passa por: react-hook-form (zodResolver) para UX/feedback inline -> handleSubmit intercepta só para gate de validação -> FormData bruto do DOM -> useActionState(createLead|updateLead) -> Server Action revalida com o mesmo leadSchema (fonte de verdade)."
  - "Dialog Base UI controlado (open/onOpenChange) em vez de Trigger não-controlado, sempre que o fechamento precisa ser interceptável (discard-changes-dialog)."

requirements-completed: [LEAD-01, LEAD-03]

# Metrics
duration: "~45min (Task 2 início até Task 3 commit; Task 1 já estava commitado por verificação direta do orquestrador antes desta sessão)"
completed: 2026-07-21
---

# Phase 1 Plan 2: Lead Form & Base List Summary

**Modal de lead com 9 campos em 3 seções (react-hook-form + Zod + Server Actions), badge de etapa e aviso de descarte, servindo a rota `/` com a lista de leads ativos ordenada por follow-up — LEAD-01 e LEAD-03 utilizáveis fim-a-fim.**

## Performance

- **Duration:** ~45 min de execução ativa (Task 2 → Task 3). Task 1 (money/phone utils, leadSchema, Server Actions, combobox) foi verificado e commitado diretamente pelo orquestrador antes desta sessão, após 2 execuções anteriores do subagente terem atingido o limite mensal de gasto no meio da Task 1.
- **Completed:** 2026-07-21
- **Tasks:** 3/3 (Task 1 pré-commitado `6093d39`; Task 2 `b2806b0`; Task 3 `c71fd7d`)
- **Files modified nesta sessão:** 5 criados + 1 modificado (Task 2 + Task 3)

## Accomplishments

- **Modal de lead completo** (`lead-form-dialog.tsx`): 9 campos agrupados em 3 seções visuais sem tabs ("Contato", "Negócio", "Acompanhamento" — D-01/D-02), usando `react-hook-form` + `zodResolver(leadSchema)` para validação/feedback inline e `useActionState(createLead|updateLead)` (nunca `useFormState`, deprecado) para a submissão real.
- **Contrato de valor protegido de dupla-conversão**: o submit monta o `FormData` a partir do DOM bruto do `<form>` (o texto pt-BR que o usuário digitou, ex. "1.234,56"), não dos dados já transformados pelo `zodResolver`. Isso é necessário porque `parseBRLToCents` NÃO é idempotente sobre seu próprio output — reenviar o número já em centavos faria o server multiplicar por 100 de novo.
- **Contrato de follow-up**: seleção no `<Calendar>` é normalizada com `startOfDay` (date-fns, fuso local) antes de virar o valor do hidden input `followUpDate` (ISO string) — evita o lead "pular" de dia perto da virada (Pitfall 6).
- **Combobox/Select via Controller**: `SubnichoCombobox` (Task 1), `<Select>` de canal e de etapa, e o `<Calendar>` de follow-up são todos componentes Base UI não-nativos, então usam `Controller` do react-hook-form para o estado controlado — cada um também expõe seu próprio hidden input nativo (via prop `name`) para que o valor real vá no `FormData`.
- **`discard-changes-dialog.tsx`** (D-04): intercepta o fechamento do modal via `Dialog`'s `onOpenChange(open, eventDetails)` + `eventDetails.cancel()` quando `form.formState.isDirty === true`, mostrando "Descartar alterações?" com os botões "Continuar editando"/"Descartar" (copy literal).
- **`etapa-badge.tsx`** (D-09): badge reutilizável com a paleta fixa da UI-SPEC — Novo cinza, Contatado azul, Negociação âmbar, Fechado/Perdido slate neutro (não verde/vermelho, decisão já travada por causa do enum de stage único no schema).
- **Rota `/` funcional** (D-14): `src/app/page.tsx` virou um Server Component real que busca leads ativos (`isNull(deletedAt)`, `orderBy(asc(followUpDate))`) e todos os sub-nichos, passando ambos para `<LeadTable>`.
- **`lead-table.tsx`**: tabela `@tanstack/react-table` (`getCoreRowModel` apenas nesta fase — sort/filtro entram no 01-03) com as 5 colunas D-06 (Nome, Sub-nicho, Etapa via `<EtapaBadge>`, Follow-up formatado `dd/MM/yyyy`, Telefone). Botão "Novo lead" sempre visível + estado vazio com CTA duplicado (D-13). Clicar numa linha reabre o mesmo `<LeadFormDialog>` pré-preenchido (D-07), usando `key={mode-lead.id}` para forçar reset do formulário ao trocar de lead.
- **Verificação end-to-end contra o SQLite real**: um script `tsx` temporário (não commitado, apagado após uso) chamou `createLead` diretamente contra `./data/crm.db`, confirmando: lista vazia antes → 2 leads criados → ordenação por follow-up mais próximo primeiro → valor "R$ 500"→50000 centavos e "1.234,56"→123456 centavos → telefone "(11) 91234-5678"→"5511912345678" e "11 3123-4567"→"551131234567" → join client-side lead→sub-nicho resolve o nome certo → cleanup deixou a tabela `leads` vazia de novo.

## Task Commits

1. **Task 1: money/phone utils + leadSchema + Server Actions de lead + sub-nicho combobox** — `6093d39` (feat) — commitado pelo orquestrador antes desta sessão, verificado diretamente (`tsc`, `test-money.cjs`/`test-phone.cjs`/`test-lead-actions.cjs`, greps) após 2 subagentes anteriores atingirem o limite mensal de gasto no meio da task.
2. **Task 2: Modal de lead (3 seções) + discard-changes-dialog + etapa-badge** — `b2806b0` (feat)
3. **Task 3: Rota / com lista base de leads (Server Component + LeadTable + empty state)** — `c71fd7d` (feat)

## Files Created/Modified

- `src/components/lead-form-dialog.tsx` — modal criar/editar (Client Component), 9 campos/3 seções, RHF+Zod+useActionState
- `src/components/discard-changes-dialog.tsx` — aviso de descarte (D-04)
- `src/components/etapa-badge.tsx` — badge de etapa reutilizável (D-09)
- `src/components/lead-table.tsx` — tabela de leads ativos (Client Component), gerencia o estado do modal criar/editar
- `src/components/lead-table-columns.tsx` — definição das 5 colunas @tanstack (D-06)
- `src/app/page.tsx` — Server Component da rota `/` (D-14), query de leads ativos + sub-nichos

(Task 1, já commitado: `src/lib/money.ts`, `src/lib/phone.ts`, `src/lib/validations.ts` (leadSchema), `src/actions/lead-actions.ts`, `src/components/subnicho-combobox.tsx`, `scripts/test-money.cjs`, `scripts/test-phone.cjs`, `scripts/test-lead-actions.cjs`.)

## Decisions Made

- **FormData bruto do DOM no submit, nunca os dados já transformados pelo resolver.** `parseBRLToCents` não é idempotente sobre centavos — reenviar o número já convertido faria o server reinterpretar "123456" como R$ 123.456,00. O `onSubmit` do RHF só serve de *gate* de validação; a submissão real lê `new FormData(formRef.current)`.
- **Cor accent aplicada via `className` explícito (`bg-[#0D9488]`)**, não via customização do tema Tailwind — segue o padrão já estabelecido em `app-sidebar.tsx`/`subnicho-manager.tsx` no plano 01-01 (arbitrary value classes hex, não tokens de tema).
- **Sem componente Popover**: o `<Calendar>` de follow-up é renderizado inline na seção "Acompanhamento" (não existe `popover.tsx` no registry shadcn instalado nesta fase, e o UI-SPEC não exige um popover).
- **`Fechado/Perdido` = cor slate neutra**, decisão já travada em `01-UI-SPEC.md` (não reaberta aqui).

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de Rule 1-4 durante Task 2/Task 3 — o plano foi executado como escrito, sem bugs a corrigir, sem funcionalidade crítica faltando e sem mudança arquitetural necessária.

### Substituições do `<human-check>` (não é um desvio de Rule 1-4 — é o padrão já estabelecido em 01-01-SUMMARY.md Deviação #5)

**Task 2 e Task 3 — `<human-check>` requer `npm run dev` + clique no browser, indisponível para este executor headless.**
- **Substituto:** `npx tsc --noEmit` + `npm run build` (ambos passam limpos) cobrem a Task 2 inteira (o `<human-check>` da Task 2 não tinha um `<automated-fallback>` explícito, então usei o mesmo par tsc+build do `<automated>` já presente no `<verify>` da própria task). Para a Task 3, adicionalmente rodei um script `tsx` temporário chamando `createLead` diretamente contra o `./data/crm.db` real (ver Accomplishments acima) para confirmar o fluxo criar→listar→ordenar→exibir de ponta a ponta, já que o `<human-check>` pedia justamente esse fluxo visual. O script foi apagado após a verificação; nenhum dado de teste ficou no banco.
- **Recomendação:** um clique-through real em `npm run dev` (abrir `/`, criar um lead pelo modal com valor/telefone formatados, editar clicando na linha, fechar com alterações para ver o aviso de descarte) ainda é recomendado antes de considerar a UI polida — nenhuma verificação automatizada aqui testou o *rendering* real do modal/tabela no browser, só a lógica de dados por trás deles (tsc/build garantem que compila e tipa certo; o script tsx garante que a cadeia Server Action → DB está correta).

---

**Total deviations:** 0 auto-fixed (Rule 1-4). 2 human-check substitutions (mesmo padrão do plano 01-01), documentadas acima.
**Impact on plan:** Nenhum — plano executado exatamente como escrito nas Tasks 2 e 3.

## Issues Encountered

Nenhum. `npx tsc --noEmit` e `npm run build` passaram limpos na primeira tentativa para ambas as tasks.

## User Setup Required

Nenhum — segue rodando localmente (`npm run dev`), dado em `./data/crm.db` (gitignored).

## Next Phase Readiness

- **Ready:** Corte vertical de lead completo — criar, editar, listar (ordenado por follow-up), validação client+server, contratos de valor/telefone protegidos, badge de etapa pronto para reuso no board da Fase 3. Plano 01-03 pode adicionar sort/filtro/paginação sobre `lead-table.tsx` (`getSortedRowModel`/`getFilteredRowModel`/`getPaginationRowModel` — a base `getCoreRowModel` já está no lugar certo). Plano 01-04 pode adicionar a coluna de ações (editar/excluir) em `lead-table-columns.tsx` e a Lixeira reaproveitando `EtapaBadge`/`LeadFormDialog`.
- **Recomendado antes de considerar a UI polida:** um clique-through real em `npm run dev` (ver seção de Deviations acima) — nenhuma execução deste plano teve acesso a browser.
- Nenhum blocker para o plano 01-03.

---
*Phase: 01-lead-sub-nicho-foundation*
*Completed: 2026-07-21*

## Self-Check: PASSED

All 7 claimed files confirmed present on disk (`src/components/lead-form-dialog.tsx`, `src/components/discard-changes-dialog.tsx`, `src/components/etapa-badge.tsx`, `src/components/lead-table.tsx`, `src/components/lead-table-columns.tsx`, `src/app/page.tsx`, this SUMMARY.md). All 3 claimed commit hashes (`6093d39`, `b2806b0`, `c71fd7d`) confirmed present in `git log --oneline --all`.
