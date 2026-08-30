---
phase: 12-agenda-tarefas-soltas
plan: 04
subsystem: ui
tags: [dashboard, server-component, discriminated-union, integration, gates]

requires:
  - phase: 12-agenda-tarefas-soltas (plano 02)
    provides: "`getTarefasPendentes()`, `buildDashboardItems()`, tipos `DashboardItem`/`DashboardItemsByUrgency`"
  - phase: 12-agenda-tarefas-soltas (plano 03)
    provides: "`TarefaFormDialog`, `TarefaCard`, `DeleteTarefaDialog`"
  - phase: 04-follow-up-dashboard-whatsapp-outreach
    provides: "`followup-dashboard.tsx` + `src/app/page.tsx` — a tela `/` estendida aqui"
provides:
  - "Dashboard `/` renderiza follow-ups de lead e tarefas pendentes INTERCALADOS por data nas 3 seções de urgência (TAREFA-02, D-04)"
  - "Botão 'Nova tarefa' (`variant=outline`, D-05) no cabeçalho e no estado vazio"
  - "Contagem `· N` da seção soma tarefas + follow-ups"
affects: []

tech-stack:
  added: []
  patterns:
    - "`.map` de seção ramifica por união discriminada `item.kind` — card de lead movido byte-a-byte, card de tarefa é o ramo novo; ordem vem pronta do servidor"
    - "2 dialogs de criação/edição independentes montados como irmãos (`DialogState` de lead + `TarefaDialogState` de tarefa), nunca compartilhando estado"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/followup-dashboard.tsx

key-decisions:
  - "`page.tsx` troca `groupLeadsByUrgency` por `buildDashboardItems(activeLeads, tarefasPendentes)` SÓ neste call-site — a função pura continua exportada para regressão e futuros consumidores"
  - "`key` dos cards prefixada por tipo (`lead-${id}` / `tarefa-${id}`) — ids de lead e de tarefa podem colidir dentro da mesma seção"
  - "Estado vazio conta tarefas: `totalCount` agora soma os 3 buckets de `DashboardItem[]`, então o estado vazio só aparece quando não há NEM follow-up NEM tarefa"

patterns-established: []

requirements-completed: [TAREFA-01, TAREFA-02]

duration: ~15min
completed: 2026-08-29
---

# Phase 12 Plan 04: Integração da Agenda no Dashboard Summary

**A tela `/` passa a ler tarefas pendentes (`getTarefasPendentes`) e montar 3 listas unificadas de `DashboardItem` (`buildDashboardItems`), e o `FollowupDashboard` renderiza cards de lead e de tarefa intercalados por data dentro de cada seção de urgência, com o botão "Nova tarefa" (secundário, `variant=outline`) no cabeçalho e no estado vazio. Fecha TAREFA-01 e TAREFA-02. Suíte completa de gates automatizados verde, incluindo `npm run build` (Turbopack, exit 0). UAT humano de navegador (17 itens) PENDENTE.**

## Accomplishments

- **`src/app/page.tsx`**: `getTarefasPendentes()` adicionado ao `Promise.all`; `buildDashboardItems(activeLeads, tarefasPendentes)` substitui `groupLeadsByUrgency(activeLeads)` neste call-site; import trocado (`groupLeadsByUrgency` → `buildDashboardItems` + `getTarefasPendentes`). Zero SQL inline — a leitura mora em `queries.ts`. O cálculo de `sugestaoPorLead` continua sobre `activeLeads`, inalterado.
- **`src/components/followup-dashboard.tsx`** (7 mudanças aplicadas):
  1. Props `vencidos/hoje/proximos7Dias` e `UrgencySection.items` passam de `Lead[]` para `DashboardItem[]`; `import type { DashboardItem } from "@/db/queries"` e `Tarefa` de `@/types`.
  2. Estado `tarefaDialogState` — união discriminada (`closed` | `create` | `edit` com `tarefa`), independente do `DialogState` de lead.
  3. `sections[]` campo `leads` → `items`; `totalCount`, filtro de seção vazia e contagem `· N` usam `section.items.length` — a contagem soma tarefas + follow-ups automaticamente.
  4. `.map` da seção ramifica por `item.kind`: ramo `"tarefa"` renderiza `<TarefaCard tarefa={item.tarefa} dateClassName={section.dateClassName} onEdit={...} />`; ramo `"lead"` é o bloco existente movido **sem alteração de conteúdo/classe**, só `lead` → `item.lead` e `key` prefixada (`lead-${id}`). Ordem preservada do servidor — não reordenada, não separada em blocos (D-04).
  5. Cabeçalho: `<div className="flex items-center gap-2">` com "Novo lead" (teal, intocado) + "Nova tarefa" novo (`variant="outline"`, secundário — D-05, sem accent teal).
  6. Estado vazio: body "Nenhum follow-up pendente." → "Nenhum follow-up ou tarefa pendente." (verbatim); CTAs na ordem "Ver todos os leads" · "Nova tarefa" (`variant="outline"`) · "Novo lead" (teal, por último).
  7. `<TarefaFormDialog>` montado como irmão de `<LeadFormDialog>`, `key` distinta criar/editar (`tarefa-create` / `tarefa-edit-${id}`) para remount limpo.
  - Card de lead sem regressão: `EtapaBadge`, `WhatsAppSendButton`, `Sugestão:`, `stopPropagation` todos presentes.

## Task Commits

1. **Task 1: unificar lead+tarefa no dashboard** — `42efb8d` (feat)
2. **Task 2: suíte de gates + UAT** — _(este commit de docs; nenhum arquivo de produção alterado — todos os gates passaram sem correção)_

## Gates (comando → exit code)

Rodados em SEQUÊNCIA, host 4GB, dev server parado:

| # | Comando | Exit | Nota |
|---|---------|------|------|
| 1 | `npx tsc --noEmit` | 0 | |
| 2 | `npx eslint` (10 arquivos da fase) | 0 | 1 `eslint-disable react-hooks/refs` documentado em `tarefa-form-dialog.tsx` |
| 3 | `npm run verify:schema` | 0 | saída menciona `tarefas`, conjunto estrito de colunas conferido |
| 4 | `npm run guard:no-hard-delete` | 0 | `tarefas` fora do escopo por D-08, `db.delete` só permitido em `tarefa-actions.ts` |
| 5 | `npm run test:tarefa-actions` | 0 | 7 casos; Caso 7 prova hard-delete (linha some, `rowById` undefined) |
| 6 | `npm run test:group-by-urgency` | 0 | fronteiras + intercalação D-04 + regressão do wrapper |
| 7 | `npm run test:compute-sequencia` | 0 | regressão da generalização de `groupByUrgency` |
| 8 | `npm run test:lead-actions` | 0 | regressão geral |
| 8 | `npm run test:relatorios` | 0 | 38 checagens |
| 9 | `npm run build` | 0 | Next 16.2.10 Turbopack, "Compiled successfully in 47s", "Finished TypeScript in 28.5s", 13 páginas, rota `/` listada (`○ /`) |

## Evidência dos 3 Success Criteria (ROADMAP.md — Phase 12)

1. **Criação de tarefa avulsa sem vínculo a lead** — `TarefaFormDialog` (12-03) tem exatamente 2 campos (`descricao` + `data`), `tarefaSchema` sem nenhum campo de lead, `createTarefa` (12-02) insere na tabela `tarefas` totalmente desacoplada (sem FK — 12-01). Botão "Nova tarefa" no cabeçalho do dashboard abre esse dialog em modo criação.
2. **Tarefas nas 3 seções de urgência pela mesma régua** — `buildDashboardItems` (12-02) funde leads + tarefas e chama `groupByUrgency<T>` — a MESMA função pura que bucketiza os follow-ups de lead (`groupLeadsByUrgency` virou wrapper de 1 linha dela). `test:group-by-urgency` prova que o wrapper devolve idêntico ao genérico.
3. **Distinção visual dentro do mesmo agrupamento, sem tela/rota separada** — `TarefaCard` reusa VERBATIM o container do card de lead (`rounded-lg border border-zinc-200 bg-white p-4`); a distinção é por subtração (sem categoria/selo/WhatsApp/sugestão) + ícone `ListTodo` (D-03). Nenhuma rota nova: `next build` lista as mesmas 13 rotas de antes da fase — a agenda vive em `/`.

## Rastro D-01 a D-08

| Decisão | Onde vive | Prova |
|---------|-----------|-------|
| D-01 (concluída = `concluida_em` timestamp, NULL = pendente) | `schema.ts` coluna nullable sem default (12-01); `concluirTarefa` seta `sql\`(unixepoch())\`` (12-02) | `verify:schema` conjunto estrito; `test:tarefa-actions` Caso 5 idempotência |
| D-02 (concluir/excluir some do dashboard na hora) | `getTarefasPendentes` filtra `isNull(concluidaEm)` (12-02); `revalidatePath("/")` em toda mutação | `test:tarefa-actions`; build gera `/` |
| D-03 (card de tarefa distinguível por subtração + ícone) | `TarefaCard` (12-03) | asserção de fonte: `EtapaBadge`/`WhatsAppSendButton`/`subnicho`/`Sugestão` ausentes |
| D-04 (lead + tarefa intercalados por data, nunca blocos) | `buildDashboardItems` ordena cada bucket por `date` ASC (12-02); `.map` do dashboard não reordena (12-04) | `test:group-by-urgency`: `proximos7Dias = [tarefa,tarefa,lead,lead]` |
| D-05 ("Nova tarefa" secundário, sem accent) | cabeçalho + estado vazio do dashboard, `variant="outline"` (12-04) | grep `Nova tarefa` presente; sem `bg-[#0D9488]` no botão |
| D-06 (2 campos só, descrição serve de título) | `tarefaSchema` (`descricao` + `data`); `<Input>` linha única (12-03) | asserção: sem `Textarea` |
| D-07 (clicar no card = editar; ação rápida de concluir no card) | `TarefaCard` `onClick` → `onEdit`; botão-ícone dentro de wrapper `stopPropagation` (12-03) | asserção: `stopPropagation`, `role="button"` |
| D-08 (hard-delete real, confirmação não-dispensável) | `deleteTarefa` = única `db.delete` do `src/`; `DeleteTarefaDialog` `showCloseButton={false}` (12-02/12-03) | `guard:no-hard-delete` ALLOWLIST; `test:tarefa-actions` Caso 7 |

## Deviations from Plan

Nenhum desvio de comportamento. Task 2 não precisou de correção pontual — todos os 9 gates passaram na primeira execução.

## Issues Encountered

- Nenhum. (Warning pré-existente `MODULE_TYPELESS_PACKAGE_JSON` nos harnesses `.ts` executados via `node` — cosmético, não afeta exit code, já presente antes da fase.)

## User Setup Required

Nenhum.

## UAT Humano (17 itens) — PENDENTE

O bloco `<human-check>` do plano (17 passos no navegador com `npm run dev`) NÃO foi executado nesta sessão. Requer `/gsd-verify-work 12` numa sessão com acesso a navegador. Cobre: botão "Nova tarefa" visível, dialog de 2 campos, validação "Descreva a tarefa.", criação em "Hoje"/"Vencidos" com cor de data igual à do lead, distinção visual do card, intercalação por data, contagem somada, hover/foco do ícone de concluir, some-na-hora + "Desfazer", editar pelo corpo, migração de seção ao mudar data, exclusão com confirmação não-dispensável + prova de hard-delete no banco, estado vazio com 3 CTAs, ausência de rota nova no menu.

## Next Phase Readiness

- **TAREFA-01 / TAREFA-02** marcados `requirements-completed` — a camada de código/dados/UI está completa e com gates verdes.
- Falta só: (1) `/gsd-verify-work 12` (UAT de navegador, 17 itens), (2) verificação do gsd-verifier, (3) `/close-phase 12` (extract-learnings → PR). Fecha o milestone v1.3.

## Self-Check: PASSED

- `src/app/page.tsx` — contém `getTarefasPendentes` + `buildDashboardItems`, sem `groupLeadsByUrgency`
- `src/components/followup-dashboard.tsx` — contém `TarefaCard`, `TarefaFormDialog`, `DashboardItem`, `section.items`, `Nova tarefa`, `Nenhum follow-up ou tarefa pendente.`; sem `section.leads`
- Commit `42efb8d` — FOUND
- `npm run build` exit 0, rota `/` gerada

---
*Phase: 12-agenda-tarefas-soltas*
*Completed: 2026-08-29*
