---
status: complete
phase: 01-lead-sub-nicho-foundation
source: [01-SPEC.md, 01-02-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-09-02T00:00:00Z
updated: 2026-09-02T00:00:00Z
issues: 0
pending: 0
method: "code+data (D-01 revisado da Fase 18) — leitura da superfície (componente + Server Action + schema Zod/Drizzle) + query direta no data/crm.db + harnesses npm run test:*/verify:*. Navegador bloqueado por hardware (host 4GB não roda dev server + Chrome + sessão). Cenário 4 verificado ao vivo antes do bloqueio."
audit: "Fase 18 — AUDIT-01 (auditoria retroativa; Fase 1 nunca teve /gsd-verify-work formal)"
---

## Current Test

[completo — 20/20 cenários com resultado. 19 por code+data (Fase 18, D-01 revisado), cenário 4 ao vivo.]

## Tests

### CRUD de lead

### 1. Criar lead com os 9 campos preenchidos
expected: Em `/leads` → "Novo lead" → preencher nome, telefone, canal, origem, tipo de origem, valor estimado, notas, follow-up, nicho, etapa → "Salvar": o modal fecha, toast de sucesso, e a linha aparece em `/leads`. (01-SPEC AC#1)
result: pass
evidence: |
  (code+data) O `<form>` de `lead-form-dialog.tsx:207-211` submete o FormData BRUTO do DOM
  (`onSubmit`, linha 183-195) para `createLead`. `createLead` (`src/actions/lead-actions.ts:65-127`)
  faz `leadSchema.safeParse(Object.fromEntries(formData))`, checa `nichoExists`, e
  `db.insert(leads).values({...}).returning()` → `revalidatePath("/"/"/leads"/"/pipeline")`.
  No sucesso, `lead-form-dialog.tsx:146-149` dispara `toast.success("Lead salvo com sucesso.")`,
  `form.reset()` e `onOpenChange(false)` (modal fecha). A nova linha aparece porque
  `/leads` (`src/app/leads/page.tsx`) relista `isNull(deletedAt)` a cada request revalidado.
  Harness `test:lead-actions` — "createLead com origemTipo='inbound': insere exatamente 1 linha
  (antes=2, depois=3)" + "linha persistida com origemTipo === 'inbound'". exit 0.
  Nota: o form hoje tem 11 campos (os 9 do SPEC + `tipo de origem` da Fase 8 + `interesse`
  opcional da Fase 15); todos os obrigatórios exercidos pelo harness.

### 2. Campo obrigatório vazio bloqueia o submit
expected: "Novo lead" → deixar um campo obrigatório vazio (ex: Nome) e "Salvar": erro inline no campo ("... é obrigatório"), o modal permanece aberto, nada persiste no banco. (01-SPEC AC#1)
result: pass
evidence: |
  (code+data) `leadBaseSchema` (`src/lib/validations.ts:46-98`) tem `.min(1, "Nome é obrigatório.")`,
  `"Telefone é obrigatório."`, `"Origem é obrigatória."`, `"Notas são obrigatórias."`,
  `"Selecione um canal de contato."`, `"Selecione o tipo de origem."`, `"Selecione um nicho."`.
  `createLead` retorna `{ errors: parsed.error.flatten().fieldErrors }` sem tocar o banco quando
  `!parsed.success`. `lead-form-dialog.tsx` renderiza `<FieldError errors={[errors.nome]} />`
  por campo e `toast.error("Não foi possível salvar o lead...")` (linha 159-161); o modal não
  chama `onOpenChange(false)` no ramo de erro, então permanece aberto.
  Harness `test:lead-actions` — "createLead com origemTipo vazio: errors.origemTipo inclui
  'Selecione o tipo de origem.'". Confirmado AO VIVO no UAT da Fase 16 (`16-HUMAN-UAT.md`
  cenário 2): "Salvar" com o formulário em branco → TODOS os campos obrigatórios exibiram
  "... é obrigatório", modal permaneceu aberto.

### 3. Editar lead pela linha da lista
expected: Clicar no botão "Editar" de uma linha → modal "Editar lead" reabre pré-preenchido com os valores atuais; alterar um campo e "Salvar" → a linha na lista reflete a mudança. (01-02-SUMMARY)
result: pass
evidence: |
  (code+data) `lead-table.tsx:220` — `onClick={() => setDialogState({ mode: "edit", lead })}`
  na linha (e botão lápis, linha 296-304). `LeadFormDialog` recebe `lead` → `isEditMode = Boolean(lead)`
  → `defaultValues` hidratados de `lead?.*` (linha 118-142), título "Editar lead" (linha 204).
  `useActionState(updateLead)` no modo edição. `updateLead` (`lead-actions.ts:129-217`) faz
  `leadSchema.safeParse`, `SELECT` do stage atual (guard `isNull(deletedAt)`), e
  `db.update(leads).set({...}).where(eq(id) AND isNull(deletedAt))` + `revalidatePath`.
  A linha reflete porque `/leads` relista após revalidação.
  Harness `test:lead-actions` — "updateLead com interesse vazio: interesse volta a NULL",
  "updateLead limpando com só espaços: interesse vira NULL", "updateLead (setup): lead criado...".

### 4. Fechar o modal com alteração não salva → aviso de descarte
expected: Abrir "Editar lead", alterar um campo, tentar fechar (X / Esc / clique fora) → aparece confirmação "Descartar alterações?" com "Continuar editando" e "Descartar". "Continuar editando" mantém o modal; "Descartar" fecha sem salvar. (01-02-SUMMARY, D-04)
result: pass
evidence: |
  Em "Novo lead", após selecionar Canal / Tipo de origem / Nicho (form ficou dirty), clique
  em "Cancelar" → apareceu um segundo `[role=dialog]` com heading "Descartar alterações?" e
  texto "Você tem alterações não salvas que serão perdidas." + botões "Continuar editando" e
  "Descartar" (capturado via `javascript_tool` lendo `[role=dialog]`). "Descartar" fechou o
  form sem persistir (0 dialogs, nenhum lead novo em /leads).
  Nota: gatilho de dirtiness observado foi mudança de combobox (o preenchimento de texto não
  funcionou pela extensão — ver §Blocker de ferramenta abaixo).
  (verificado AO VIVO no plano 18-01, antes do bloqueio de hardware — mantido como live.)
  Reforço code: `lead-form-dialog.tsx:165-181` — `closeWithDiscardGuard` chama
  `eventDetails?.cancel()` + `setShowDiscardDialog(true)` quando `form.formState.isDirty`;
  `DiscardChangesDialog` com `onDiscard={handleDiscard}` (`form.reset()` + `onOpenChange(false)`).

### 5. Contrato valor/telefone (parsing)
expected: Criar lead digitando "1.234,56" em Valor estimado e "(11) 91234-5678" em Telefone → no `data/crm.db` o lead grava `valor_estimado = 123456` (centavos) e `telefone` normalizado (só dígitos, com DDI 55). Verificar por query direta. (01-02-SUMMARY — parseBRLToCents + normalizePhone)
result: pass
evidence: |
  (code+data) `leadBaseSchema.valorEstimado` (`validations.ts:70-73`) = `z.preprocess((v) =>
  parseBRLToCents(String(v ?? "")), z.number().int().nonnegative())` — o valor bruto pt-BR
  do DOM é convertido no servidor, nunca no client (`lead-form-dialog.tsx:183-195` comenta
  exatamente isso). `leadBaseSchema.telefone` tem `.transform((v) => normalizePhone(v))` que
  retorna `z.NEVER` + issue "Telefone inválido..." se não normalizar.
  Harness `test:money` (`node scripts/test-money.cjs`) — 18 asserções, incl.
  `parseBRLToCents("1.234,56") === 123456` e `formatCentsToBRL(123456) === "R$ 1.234,56"`. exit 0.
  Harness `test:phone` — 6 asserções, incl. `normalizePhone` prefixa DDI 55 e rejeita lixo. exit 0.
  Query no `data/crm.db`: todos os 23 leads ativos têm `telefone` só-dígitos iniciando em "55"
  (ex: `5519993074829` = 13 dígitos = 55 + DDD 19 + móvel 9) e `valor_estimado_centavos` INTEGER.

### 6. Soft-delete de lead com confirmação
expected: Botão "Excluir" numa linha → modal de confirmação nomeando o lead → "Confirmar": some de `/leads`, aparece em `/lixeira` com coluna "Excluído em". "Cancelar" no modal deixa o lead na lista ativa. (01-SPEC AC#5, 01-04-SUMMARY)
result: pass
evidence: |
  (code+data) `lead-table.tsx:305-316` botão lixeira → `setDeleteState({ open: true, lead })`;
  `DeleteLeadDialog` recebe `leadNome` e `onConfirm={handleDeleteConfirm}` →
  `softDeleteLead(lead.id)` + `toast.success("Lead movido para a Lixeira.")` (linha 150-158).
  `softDeleteLead` (`lead-actions.ts:403-414`) faz `db.update(leads).set({ deletedAt:
  sql(unixepoch()) }).where(eq(id) AND isNull(deletedAt))` (idempotente) + `revalidatePath`
  de `/`, `/leads`, `/pipeline`, `/lixeira`. `src/app/lixeira/page.tsx` lista `isNotNull(deletedAt)`.
  "Cancelar" só fecha o dialog (nenhuma chamada de action).
  Data: `data/crm.db` tem 21 leads com `deleted_at IS NOT NULL` (uso real do admin) e 23 ativos
  — o mecanismo já rodou em produção. `npm run guard:no-hard-delete` exit 0 (nenhum
  `db.delete()` em `leads`).

### 7. Restaurar da Lixeira
expected: Em `/lixeira` → botão "Restaurar" num lead soft-deletado → volta para `/leads`, some da Lixeira. Ação instantânea, sem modal de confirmação. (01-SPEC AC#6, 01-04-SUMMARY)
result: pass
evidence: |
  (code+data) `restoreLead` (`lead-actions.ts:421-432`) = `db.update(leads).set({ deletedAt:
  null }).where(eq(id) AND isNotNull(deletedAt))` (idempotente, só age em linhas na lixeira) +
  `revalidatePath` das 4 rotas. `src/components/lixeira-table.tsx` chama `restoreLead`
  diretamente do `onClick` do botão "Restaurar" dentro de `startTransition`, sem
  `<DeleteLeadDialog>`/confirmação (contraste explícito com o cenário 6 — ação não-destrutiva,
  D-17). Após revalidação, `/lixeira` (filtro `isNotNull(deletedAt)`) deixa de listar a linha
  e `/leads` (`isNull(deletedAt)`) volta a listá-la.

### CRUD de nicho + dedupe

### 8. Criar nicho novo
expected: Em `/nichos` → criar um nicho com nome novo → aparece na lista de `/nichos` e fica selecionável no combobox de nicho do form "Novo lead". (01-SPEC AC#2)
result: pass
evidence: |
  (code+data) `src/app/nichos/page.tsx` → `<NichoManager nichos={...} />`. `NichoManager`
  ("+ Adicionar" → `<form action={formAction}>` com `createNicho`) — no sucesso
  `toast.success("Nicho criado.")` + `formRef.current?.reset()` (linha 120-127).
  `createNicho` (`src/actions/nicho-actions.ts:14-55`): `nichoSchema.safeParse` (`.trim().min(1)`),
  checa duplicata case-insensitive, `db.insert(nichos).values({ nome })`, `revalidatePath("/nichos")`.
  O novo nicho fica selecionável porque `NichoCombobox` (`nicho-combobox.tsx:45-51`) mapeia
  `nichos.filter(deletedAt === null)` para `items` — a página `/leads` passa `db.select().from(nichos)`
  fresco a cada request. Data: `data/crm.db` tem nichos ativos (id 4 nutricionista, 5 odonto,
  12 "A categorizar").

### 9. Dedupe case-insensitive rejeitado
expected: Criar um nicho cujo nome bate (ignorando caixa e espaços nas pontas) com um já existente → rejeitado com erro inline. Capturar a mensagem literal. (01-SPEC AC#3)
result: pass
evidence: |
  (code+data) `createNicho` (`nicho-actions.ts:24-43`): `SELECT ... WHERE lower(trim(nichos.nome))
  = lower(trim(<nome>))`; se `existing.length > 0` e `existing[0].deletedAt === null` →
  `return { errors: { nome: ["Esse nicho já existe."] } }`. `NichoManager` renderiza
  `<span className="text-sm text-[#DC2626]">{fieldError}</span>` (linha 129-131 / 173-175).
  Mensagem literal: **"Esse nicho já existe."**
  Query de prova no `data/crm.db`:
  `SELECT lower(trim('  Nutricionista ')) = lower(trim('nutricionista'))` → `1` (match, seria
  rejeitado). Há ainda a rede de segurança `catch { return { errors: { nome: [...] } } }` para
  race de duplo-clique contra o uniqueIndex de nome.

### 10. Near-duplicate permitido
expected: Criar "UAT18 Nic" quando "UAT18 Nicho" já existe → aceito (grafias diferentes não são bloqueadas — só match exato case/space-insensitive). (01-SPEC AC#3)
result: pass
evidence: |
  (code+data) O `WHERE` de dedupe é igualdade estrita de `lower(trim(nome))` — não há
  `LIKE`/similaridade/fuzzy em `nico-actions.ts`. Grafias diferentes não colidem.
  Query de prova: `SELECT lower(trim('Nutri')) = lower(trim('nutricionista'))` → `0` (sem match)
  → `existing.length === 0` → o fluxo segue para `db.insert(nichos)`.
  01-SPEC Requirement 3 é explícito: "Near-duplicates with different spelling ... are NOT
  blocked or flagged — admin judgment only".

### 11. Renomear nicho inline
expected: Ícone de lápis numa linha de `/nichos` → editar o nome inline → "Salvar" → o nome atualiza na lista. Sem controle de delete/deactivate visível originalmente (soft-delete veio na quick 260725-lai). (01-SPEC AC#2, 01-04-SUMMARY)
result: pass
evidence: |
  (code+data) `NichoRow` (`nicho-manager.tsx:17-110`): botão lápis (`aria-label="Renomear {nome}"`)
  → `setIsEditing(true)` → `<form action={formAction}>` com `renameNicho` + `<input hidden name="id">`
  + `<Input name="nome" defaultValue={nicho.nome}>`. No sucesso `toast.success("Nicho renomeado.")`
  + `setIsEditing(false)` (linha 26-32). `renameNicho` (`nicho-actions.ts:85-118`):
  `nichoSchema.safeParse`, checa colisão com OUTRO id (`existing.some(row => row.id !== id)`
  → "Esse nicho já existe."), `db.update(nichos).set({ nome }).where(eq(id))`, `revalidatePath("/nichos")`.
  A lista atualiza via revalidação. Botão de remoção (lixeira) está presente hoje (quick 260725-lai),
  fora do escopo original do Requirement 2 — coberto no cenário 12.

### 12. Soft-delete de nicho + reativação por nome
expected: Remover (soft-delete) um nicho de teste → some das superfícies de seleção (combobox do form "Novo lead" + filtro de nicho da toolbar de `/leads`), mas continua no banco. Recriar um nicho com exatamente o mesmo nome → reativa o registro existente (não cria linha duplicada — verificar por query que só há 1 linha com esse nome). (quick 260725-lai, 01-04-SUMMARY)
result: pass
evidence: |
  (code+data) `softDeleteNicho` (`nicho-actions.ts:65-83`): `db.update(nichos).set({ deletedAt:
  sql(unixepoch()) }).where(eq(id) AND isNull(deletedAt))` (idempotente) + `revalidatePath`.
  Some das superfícies de seleção: `NichoCombobox` filtra `deletedAt === null || nicho.id === value`
  (`nicho-combobox.tsx:48`) e a toolbar filtra `nicho.deletedAt === null`
  (`lead-table-toolbar.tsx:103`). NÃO some das queries de listagem de leads (mapa id→nome
  preservado — decisão do STATE.md quick 260725-lai).
  Reativação por nome: `createNicho` (`nicho-actions.ts:33-40`) — se `existing[0].deletedAt !== null`
  → `db.update(nichos).set({ deletedAt: null, nome }).where(eq(existing[0].id))` (regrava a grafia,
  NÃO insere). `bulkImportLeads` tem o mesmo comportamento (`import-actions.ts:126-133`).
  Query de prova no `data/crm.db`:
  `SELECT nome, COUNT(*) FROM subnichos GROUP BY lower(trim(nome)) HAVING COUNT(*) > 1` → `[]`
  (nenhum nome duplicado, mesmo com 7 nichos soft-deletados em disco: ids 6-11 e 13
  "E-Commerce De Roupa"). O invariante "1 linha por nome" é mantido.

### Lista / toolbar / paginação (executados no plano 18-02)

### 13. Ordenação default por follow-up
expected: `/leads` sem nenhum filtro → a primeira linha é o lead com follow-up mais próximo (ascendente). (01-SPEC AC#8)
result: pass
evidence: |
  (code+data) `DEFAULT_SORTING = [{ id: "followUpDate", desc: false }]`
  (`lead-table-columns.tsx:34`), usado como `useState` inicial em `lead-table.tsx:107` e
  restaurado por "Limpar filtros". A query base `getActiveDashboardLeads`/`/leads/page.tsx`
  também ordena `asc(leads.followUpDate)`.
  Query no `data/crm.db`: `SELECT nome, follow_up_date FROM leads WHERE deleted_at IS NULL
  ORDER BY follow_up_date ASC LIMIT 1` → `dentista_juliaxavier` (2026-07-25) — é o topo esperado.

### 14. Ordenação por cabeçalho de coluna
expected: Clicar no cabeçalho "Nome" / "Nicho" / "Etapa" / "Follow-up" alterna asc↔desc a cada clique. Clicar em "Telefone" não ordena (coluna sem sort). (01-SPEC, 01-01-SUMMARY)
result: pass
evidence: |
  (code+data) `leadTableColumns` (`lead-table-columns.tsx:86-131`): `nome`, `nichoNome`,
  `stage`, `followUpDate` têm `enableSorting: true`; `telefone` tem `enableSorting: false`;
  `acoes` `enableSorting: false`. `SortableColumnHeader` (linha 42-62) usa
  `column.getToggleSortingHandler()` (alternância asc↔desc↔none é comportamento nativo do
  `@tanstack/react-table` com `getSortedRowModel` ligado — `lead-table.tsx:134`). O cabeçalho
  manual de `lead-table.tsx:192-199` renderiza `<SortableColumnHeader>` só para os 4 ids
  ordenáveis; "Telefone" é um `<span>` estático (linha 200-202).
  Nota: o indicador visual de seta (ArrowUp/ArrowDown/ArrowUpDown) é renderização — só
  confirmável em navegador; o mecanismo de sort está verificado por código.

### 15. Filtro por nicho (single-select)
expected: Toolbar → selecionar um nicho → a lista mostra só leads daquele nicho. (01-SPEC AC#7)
result: pass
evidence: |
  (code+data) `lead-table-toolbar.tsx:48-55` — `handleNichoChange` → `table.getColumn("nichoNome")
  .setFilterValue(Number(nextValue))` + `table.setPageIndex(0)`. O `filterFn` da coluna
  `nichoNome` (`lead-table-columns.tsx:96-99`) compara `row.original.nichoId === filterValue`
  (por id numérico, não por texto exibido — decisão do STATE.md 01). `<Select>` single-select
  com opção "Todos os nichos" (`ALL_VALUE` → `undefined` → filtro limpo).

### 16. Filtro por etapa (single-select)
expected: Toolbar → selecionar uma etapa → a lista mostra só leads naquela etapa. (01-SPEC AC#7)
result: pass
evidence: |
  (code+data) `handleStageChange` (`lead-table-toolbar.tsx:57-62`) → `table.getColumn("stage")
  .setFilterValue(nextValue)` + `setPageIndex(0)`. `filterFn` de `stage`
  (`lead-table-columns.tsx:106-109`): `row.getValue(columnId) === filterValue`. Opções vêm de
  `STAGE_OPTIONS` (`etapa-badge.tsx`), single-select com "Todas as etapas".

### 17. Filtro por intervalo de follow-up
expected: Toolbar → definir data de início e fim → a lista mostra só leads com follow-up dentro do intervalo, inclusivo nas duas pontas. (01-SPEC AC#7)
result: pass
evidence: |
  (code+data) `lead-table-toolbar.tsx:64-80` — dois `<Popover><Calendar>` (início/fim) →
  `applyDateRange(start, end)` → `table.getColumn("followUpDate").setFilterValue([start, end])`.
  `filterFn` (`lead-table-columns.tsx:117-125`):
  `passesStart = !start || value.getTime() >= startOfDay(start).getTime()` e
  `passesEnd = !end || value.getTime() <= endOfDay(end).getTime()` — inclusivo nas duas pontas,
  normalizado com `startOfDay`/`endOfDay` para não bugar na virada de fuso (Pitfall 6).

### 18. Filtros combinados (AND)
expected: Nicho + etapa selecionados ao mesmo tempo → a lista mostra a interseção (só leads que batem os dois). (01-SPEC AC#7)
result: pass
evidence: |
  (code+data) Os 3 filtros escrevem em `columnFilters` (state único de `lead-table.tsx:108`,
  `onColumnFiltersChange: setColumnFilters`). O `getFilteredRowModel` do `@tanstack/react-table`
  aplica TODOS os `filterFn` de colunas com filtro ativo de forma conjuntiva (AND) — uma linha
  só passa se cada `filterFn` retornar `true`. Nenhum código do projeto sobrescreve esse
  comportamento (não há `globalFilterFn` custom nem `filterFromLeafRows`).

### 19. "Limpar filtros"
expected: Com filtros aplicados → botão "Limpar filtros" → todos os leads voltam e a ordenação volta ao default (follow-up asc). (01-SPEC, 01-01-SUMMARY)
result: pass
evidence: |
  (code+data) `handleClearFilters` (`lead-table-toolbar.tsx:82-90`):
  `table.resetColumnFilters()` + reset dos 4 `useState` locais (nicho/etapa/rangeStart/rangeEnd)
  + `table.setSorting(DEFAULT_SORTING)` + `table.setPageIndex(0)`. Restaura exatamente o estado
  inicial: sem filtro, sort follow-up asc, página 1.

### 20. Paginação
expected: Com >25 leads ativos → rodapé "Página 1 de N"; "Anterior" desabilitado na página 1, "Próximo" desabilitado na última; trocar um filtro volta para a página 1. (01-01-SUMMARY)
result: pass
evidence: |
  (code+data) `lead-table.tsx:137` — `initialState: { pagination: { pageSize: 25 } }` (D-12),
  `getPaginationRowModel()` ligado (linha 136). Rodapé (linha 324-347): "Página
  {pageIndex + 1} de {Math.max(getPageCount(), 1)}"; "Anterior" `disabled={!table.getCanPreviousPage()}`,
  "Próximo" `disabled={!table.getCanNextPage()}`. Toda troca de filtro chama `table.setPageIndex(0)`
  (toolbar, cenários 15-17) — volta para a página 1.
  Data: `data/crm.db` tem 23 leads ativos → 1 página; ambos os botões renderizam `disabled`,
  rodapé "Página 1 de 1". A renderização de N > 1 páginas exigiria criar >2 leads de teste no
  banco real (T-18-01) — mecanismo de paginação verificado por código; o visual multi-página
  fica diferido para quando houver navegador (não bloqueia AUDIT-01).

## Summary

- Total: 20
- Passed: 20 (cenário 4 ao vivo; 19 por code+data)
- Issues: 0
- Pending: 0
- Skipped: 0
- Blocked: 0

## Método de Verificação (Fase 18, D-01 revisado)

O UAT no navegador foi bloqueado por hardware (host 4GB não roda `npm run dev` Turbopack +
Chrome + a sessão Claude — RAM livre caiu a ~200 MB, renderer congelou). Decisão do usuário
(2026-09-02): verificar cada cenário por **code+data**:

1. Leitura da superfície: componente React + Server Action + schema Zod (`validations.ts`) +
   schema Drizzle (`db/schema.ts`).
2. Query direta no `data/crm.db` real (só SELECT) para os invariantes de dados.
3. Harnesses automatizados: `test:lead-actions`, `test:money`, `test:phone`,
   `verify:schema`, `guard:no-hard-delete` — todos exit 0 no baseline.

O que um pass de navegador ainda acrescentaria: confirmação da renderização visual (indicador
de seta no cabeçalho ordenável — cenário 14; rodapé "Página 1 de N" com N > 1 — cenário 20;
toasts sonner; anel de foco teal; badges de etapa), do fluxo de clique completo (abrir modal →
preencher → salvar → toast → linha na lista) e da hidratação do react-hook-form nos
`defaultValues` de edição. Nenhum desses pontos tem indício de estar quebrado por inspeção — o
código replica padrões já em produção há 5+ fases.

## Blocker de ferramenta (2026-09-02, sessão 1)

A extensão Claude no Chrome **não consegue preencher os campos de texto deste formulário**:
- `form_input` → não dispara o `onChange` do react-hook-form (já sabido da Fase 16).
- `computer` action `type` (após `left_click` no campo) → **também não escreve nada**.
- Os `<Select>` do Base UI (Canal, Tipo de origem) via `computer left_click` na opção → **não seleciona**.
- O que FUNCIONA: navegação, `read_page`/`get_page_text`, o combobox de Nicho, botões, e
  `javascript_tool` com o setter nativo de `HTMLInputElement.prototype.value` — mas o renderer
  congela sob pressão de RAM (host 4GB).

## Issues Encontradas

(nenhuma — o bloqueio acima é de ferramenta/infra de teste, não do app; nenhum defeito de
runtime encontrado na auditoria code+data)

## Gaps

- Cenário 14: indicador visual de seta de ordenação no cabeçalho — diferido para navegador (mecanismo de sort verificado por código).
- Cenário 20: rodapé "Página 1 de N" com N > 1 — não reproduzível sem criar leads de teste no `data/crm.db` real; mecanismo de paginação verificado por código + estado atual (1 página, botões desabilitados).
- Nenhum gap bloqueia AUDIT-01.
