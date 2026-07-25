---
phase: quick-260725-gzb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/lead-table.tsx
  - src/components/lead-table-columns.tsx
autonomous: false
requirements: [SKETCH-002-C, SKETCH-003-C]

must_haves:
  truths:
    - "A lista de leads em /leads aparece como linhas densas dentro de um container arredondado com borda, sem grade de tabela tradicional (nenhum <table>/<tr>/<td> na página)"
    - "Cada linha mostra um círculo de iniciais do nome à esquerda do nome do lead"
    - "Cada linha mostra um botão verde nomeado 'WhatsApp' sempre visível na coluna Ações, ao lado dos botões de editar e excluir"
    - "Clicar no botão 'WhatsApp' abre o WhatsAppPreviewDialog com o lead e o sub-nicho corretos, e NÃO abre o modal de edição por baixo"
    - "O botão 'WhatsApp' fica desabilitado quando normalizePhone(lead.telefone) retorna null"
    - "Clicar em qualquer outro ponto da linha continua abrindo o modal de edição do lead"
    - "Ordenar por Nome/Sub-nicho/Etapa/Follow-up pelo cabeçalho continua funcionando, com o mesmo ícone de seta de antes"
    - "Os filtros da toolbar (sub-nicho, etapa, intervalo de follow-up) e 'Limpar filtros' continuam funcionando e resetando para a página 1"
    - "A paginação Anterior/Próximo continua funcionando com 25 leads por página"
    - "O estado vazio ('Nenhum lead cadastrado ainda') e o estado de filtro sem resultados continuam aparecendo"
  artifacts:
    - path: "src/components/lead-table.tsx"
      provides: "Renderização híbrida em <div> flex + fluxo de envio de WhatsApp (PreviewState + WhatsAppPreviewDialog)"
      contains: "WhatsAppPreviewDialog"
    - path: "src/components/lead-table-columns.tsx"
      provides: "Column defs preservados como fonte de verdade de sort/filtro + SortableColumnHeader exportado"
      contains: "export function SortableColumnHeader"
  key_links:
    - from: "src/components/lead-table.tsx"
      to: "table.getColumn(...) + SortableColumnHeader"
      via: "cabeçalho manual em flex chamando column.getToggleSortingHandler()"
      pattern: "SortableColumnHeader"
    - from: "src/components/lead-table.tsx"
      to: "WhatsAppPreviewDialog"
      via: "PreviewState + botão verde na linha"
      pattern: "setPreviewState"
    - from: "src/components/lead-table.tsx"
      to: "useReactTable (core/sorted/filtered/pagination row models)"
      via: "camada de estado intocada, só a camada de renderização muda"
      pattern: "getPaginationRowModel"
---

<objective>
Portar para a tela real de Leads as duas decisões de design já validadas e commitadas nos sketches:

- **Sketch 002, variante C (vencedora):** formato híbrido — linhas densas em `<div>` flex dentro de um container arredondado com borda, sem grade de tabela tradicional, com avatar de iniciais no nome.
- **Sketch 003, variante C (vencedora):** botão de WhatsApp verde **nomeado** ("WhatsApp" + ícone), sempre visível em cada linha.

Purpose: a ação nº1 do admin é disparar WhatsApp direto da lista de leads — hoje isso simplesmente **não existe** em `/leads` (só existe no dashboard de follow-ups, no pipeline e na tela pós-importação). Além de portar o visual aprovado, este plano adiciona o atalho de WhatsApp à tela onde ele mais falta, antes do uso real de segunda-feira (2026-07-27).

Output: `src/components/lead-table.tsx` e `src/components/lead-table-columns.tsx` atualizados. Nenhum arquivo novo, nenhuma dependência nova.

**Risco principal (explicitamente vigiado na Task 4):** a camada de renderização está sendo trocada enquanto a camada de estado do TanStack Table (`useReactTable`, sort, filtro, paginação) deve permanecer **idêntica**. Regressão silenciosa de sort/filtro/paginação é o modo de falha mais provável deste plano.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Arquivos que serão modificados:
@src/components/lead-table.tsx
@src/components/lead-table-columns.tsx

Referências (LER, NÃO MODIFICAR):
@src/components/followup-dashboard.tsx
@src/components/lead-table-toolbar.tsx
@src/components/whatsapp-send-button.tsx
@src/components/etapa-badge.tsx
@src/lib/phone.ts

Sketches vencedores (referência visual):
@.planning/sketches/002-leads-list-format/README.md
@.planning/sketches/003-whatsapp-affordance/README.md

<interfaces>
<!-- Contratos já existentes no codebase. Use direto, sem explorar o repositório. -->

De `src/types/index.ts`:
- `Lead`, `Subnicho`, `Template` (tipos inferidos do Drizzle schema).

De `src/components/lead-table-columns.tsx`:
- `export type LeadRow = Lead & { subnichoNome: string }`
- `export type FollowUpDateRange = [Date | undefined, Date | undefined]`
- `export const DEFAULT_SORTING: SortingState = [{ id: "followUpDate", desc: false }]`
- `export const leadTableColumns: ColumnDef<LeadRow>[]` — ids das colunas: `nome`, `subnichoNome`, `stage`, `followUpDate`, `telefone`, `acoes`
- `SortableColumnHeader({ column, label })` — hoje é **local (não exportado)**; a Task 1 exporta.

De `src/components/etapa-badge.tsx`:
- `EtapaBadge({ stage }: { stage: Stage })`

De `src/lib/phone.ts`:
- `normalizePhone(input: string): string | null`

De `src/components/whatsapp-preview-dialog.tsx` (props):
- `open: boolean`, `onOpenChange: (open: boolean) => void`, `lead: Lead | undefined`, `subnichoNome: string`, `templates: Template[]`, `defaultTipo: Template["tipo"]`, `subtitulo?: string`

De `src/components/ui/button.tsx` — tamanhos disponíveis:
- `default` (h-8), `sm` (h-7), `lg` (h-9), `icon` (size-8), `icon-lg` (size-9)
- Os botões Pencil/Trash2 de hoje usam `variant="ghost" size="icon-lg"` (36px de alvo de toque, D-08) — **manter exatamente isso**.
</interfaces>

<design_tokens>
Tokens dos sketches (`.planning/sketches/themes/default.css`) já mapeados para as classes Tailwind arbitrárias que este projeto usa (mesmo padrão do `app-sidebar.tsx`, quick task 260725-219):

| Token do sketch | Valor | Classe no app |
|---|---|---|
| `--color-primary` (teal, accent do app) | `#0D9488` | `text-[#0D9488]` |
| `--color-primary-soft` (fundo do avatar) | teal suave | `bg-[#0D9488]/10` |
| `--color-surface-sunken` (hover de linha, fundo do header) | `#F4F4F5` | `bg-[#F4F4F5]` |
| `--color-whatsapp` (verde da marca) | `#22C55E` | `bg-[#22C55E]` |
| `--color-whatsapp-hover` | `#16A34A` | `hover:bg-[#16A34A]` |
| `--radius-lg` (container) | — | `rounded-lg` |

O teal continua sendo o accent do app; o verde do WhatsApp é **intencionalmente diferente** (cor de marca, per sketch 003).
</design_tokens>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Exportar SortableColumnHeader e blindar os column defs</name>
  <files>src/components/lead-table-columns.tsx</files>
  <action>
Alteração mínima e cirúrgica neste arquivo. Duas mudanças, nada além disso:

1. Adicionar a palavra-chave `export` à declaração de `SortableColumnHeader` (hoje é `function SortableColumnHeader<TData>({ column, label })`, passa a ser exportada) para que `lead-table.tsx` possa renderizar o cabeçalho manualmente reusando exatamente o mesmo componente, sem duplicar a lógica de ícone asc/desc/neutro.

2. Adicionar ao JSDoc de `leadTableColumns` uma nota curta explicando que, a partir desta quick task, o corpo da lista é renderizado por markup customizado em `lead-table.tsx` (linhas em `<div>` flex, sketch 002-C) e que os campos `header`/`cell` dos column defs **não são mais renderizados** — os column defs permanecem como a **fonte de verdade de sort/filtro** (`accessorKey`, `filterFn`, `enableSorting`, `sortUndefined`), consumida por `lead-table-toolbar.tsx` (`table.getColumn(...).setFilterValue`) e pelo `useReactTable`.

PROIBIDO nesta task (contrato de não-regressão, decisão 6 do usuário):
- NÃO alterar, reordenar ou remover nenhum `accessorKey`, `filterFn`, `enableSorting` ou `sortUndefined`.
- NÃO alterar `DEFAULT_SORTING`.
- NÃO remover o bloco `declare module "@tanstack/react-table"` com `TableMeta` — `lead-table.tsx` continua passando `meta` no `useReactTable` e o augment é necessário para o typecheck.
- Os campos `header`/`cell` ficam onde estão (código morto sancionado pelo usuário) — removê-los obrigaria a mexer nos imports e aumentaria o diff sem ganho.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && node -e "const s=require('fs').readFileSync('src/components/lead-table-columns.tsx','utf8');const req=['export function SortableColumnHeader','export const DEFAULT_SORTING','accessorKey: \"nome\"','accessorKey: \"subnichoNome\"','accessorKey: \"stage\"','accessorKey: \"followUpDate\"','accessorKey: \"telefone\"','sortUndefined: \"last\"','declare module \"@tanstack/react-table\"'];const miss=req.filter(t=>!s.includes(t));const filterFns=(s.match(/filterFn:/g)||[]).length;if(miss.length){console.error('FALTANDO: '+miss.join(' | '));process.exit(1)}if(filterFns!==3){console.error('filterFn count = '+filterFns+', esperado 3');process.exit(1)}console.log('column defs intactos + SortableColumnHeader exportado')"</automated>
  </verify>
  <done>`SortableColumnHeader` é exportado, `npx tsc --noEmit` limpo, e o script confirma que os 5 `accessorKey`, os 3 `filterFn`, `sortUndefined`, `DEFAULT_SORTING` e o augment de `TableMeta` continuam presentes.</done>
</task>

<task type="auto">
  <name>Task 2: Trocar a tabela shadcn por linhas híbridas em flex (sketch 002-C)</name>
  <files>src/components/lead-table.tsx</files>
  <action>
Substituir **apenas a camada de renderização** da lista por markup híbrido. A camada de estado do TanStack Table fica byte-a-byte igual.

**INTOCÁVEL nesta task (verificado por script na Task 4):** o bloco `useReactTable({...})` inteiro — `data`, `columns: leadTableColumns`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `initialState: { pagination: { pageSize: 25 } }`, `onSortingChange: setSorting`, `onColumnFiltersChange: setColumnFilters`, `state: { sorting, columnFilters }`, `meta`. Os `useState` de `sorting`/`columnFilters`/`dialogState`/`deleteState`, os `useMemo` (`subnichoNameById`, `firstContactTemplate`, `data`) e `handleDeleteConfirm` também ficam como estão.

**Também intocável:** o botão "Novo lead" do topo, o card de estado vazio ("Nenhum lead cadastrado ainda"), `<LeadTableToolbar>`, o rodapé de paginação Anterior/Próximo, `<LeadFormDialog>` e `<DeleteLeadDialog>`.

Mudanças:

1. **Imports:** remover o import de `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` de `@/components/ui/table` e remover `flexRender` do import de `@tanstack/react-table`. Adicionar: `Calendar`, `Pencil`, `Trash2` de `lucide-react`; `SortableColumnHeader` de `@/components/lead-table-columns`; `format` de `date-fns`; `EtapaBadge` de `@/components/etapa-badge`.

2. **Helper local `getInitials(nome: string): string`** (fora do componente, acima dele): divide o nome por espaços em branco, descarta pedaços vazios, pega os 2 primeiros pedaços, tira a primeira letra de cada, junta e passa para maiúsculas. Se o resultado for vazio, retorna `"?"`. Documentar em uma linha de comentário.

3. **Constante local de larguras de coluna** (fora do componente), para o cabeçalho e o corpo compartilharem exatamente as mesmas classes de flex e nunca desalinharem: nome = `flex-[2] min-w-0`, sub-nicho / etapa / follow-up / telefone = `flex-1 min-w-0`, ações = `w-[210px] shrink-0 justify-end`. Definir como um objeto `const COL` com essas 6 chaves e referenciá-lo nos dois lugares.

4. **Container:** um `<div className="overflow-hidden rounded-lg border bg-white shadow-sm">` substituindo `<Table>`.

5. **Linha de cabeçalho manual** (primeiro filho do container), `flex items-center gap-3.5 border-b bg-[#F4F4F5] px-4 py-3`:
   - Nome, Sub-nicho, Etapa, Follow-up: renderizar `<SortableColumnHeader column={...} label="..." />` obtendo a coluna via `table.getColumn("nome")`, `table.getColumn("subnichoNome")`, `table.getColumn("stage")`, `table.getColumn("followUpDate")`. `getColumn` retorna `Column | undefined` — renderizar condicionalmente (`{col && <SortableColumnHeader ... />}`) para satisfazer o typecheck. Preferir um array local `[{ id, label, className }]` mapeado, em vez de 4 blocos copiados.
   - Telefone: `<span>` simples com as classes de texto do cabeçalho (não ordenável, decisão 2).
   - Ações: `<span>` simples "Ações", alinhado à direita via `COL.acoes`.
   - NÃO usar `table.getHeaderGroups()` nem `flexRender`.

6. **Corpo:** iterar `table.getRowModel().rows`. Se `rows.length === 0`, renderizar dentro do container `<div className="px-4 py-8 text-center text-[14px] text-muted-foreground">Nenhum lead encontrado com os filtros aplicados.</div>` (mesma cópia de hoje, palavra por palavra). Caso contrário, para cada `row`, renderizar `const lead = row.original` como uma linha:
   - Wrapper: `key={row.id}`, `role="button"`, `tabIndex={0}`, `onClick={() => setDialogState({ mode: "edit", lead })}`, `onKeyDown` tratando Enter e Espaço com `preventDefault()` (mesmo padrão de `followup-dashboard.tsx`), classes `flex cursor-pointer items-center gap-3.5 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]`.
   - **Nome** (`COL.nome`): `div` flex com `items-center gap-2.5` contendo o círculo de iniciais — `<div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#0D9488]/10 text-[11px] font-bold text-[#0D9488]">{getInitials(lead.nome)}</div>` — seguido do nome em `<span className="truncate text-[14px] font-semibold text-foreground">`.
   - **Sub-nicho** (`COL.subnicho`): `<span className="truncate text-[14px] text-muted-foreground">{lead.subnichoNome}</span>`.
   - **Etapa** (`COL.etapa`): `<EtapaBadge stage={lead.stage} />` sem alterar `etapa-badge.tsx`.
   - **Follow-up** (`COL.followup`): flex `items-center gap-1.5 text-[14px] text-muted-foreground` com `<Calendar className="size-3.5 shrink-0" />` + `{format(lead.followUpDate, "dd/MM/yyyy")}`.
   - **Telefone** (`COL.telefone`): `<span className="truncate text-[14px] text-muted-foreground">{lead.telefone}</span>`.
   - **Ações** (`COL.acoes`): um `<div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>` contendo os botões Pencil e Trash2 movidos do `cell` de `lead-table-columns.tsx` para cá, **sem mudar aparência nem comportamento**: `variant="ghost" size="icon-lg"`, `aria-label={\`Editar ${lead.nome}\`}` / `aria-label={\`Excluir ${lead.nome}\`}`, ícone `Pencil className="size-4"` / `Trash2 className="size-4 text-[#DC2626]"`. Handlers: `setDialogState({ mode: "edit", lead })` e `setDeleteState({ open: true, lead })`. Manter `event.stopPropagation()` também nos `onClick` de cada botão (defesa em profundidade, mesmo padrão de hoje) — sem isso, clicar em excluir também abriria o modal de edição por baixo. O botão de WhatsApp entra neste mesmo bloco na Task 3.

Nenhum `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` ou `<td>` pode sobrar no arquivo.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && node -e "const s=require('fs').readFileSync('src/components/lead-table.tsx','utf8');const banned=['@/components/ui/table','flexRender','getHeaderGroups','<TableRow','<TableCell'];const found=banned.filter(t=>s.includes(t));const req=['getInitials','SortableColumnHeader','EtapaBadge','Calendar','Nenhum lead encontrado com os filtros aplicados','Nenhum lead cadastrado ainda','bg-[#0D9488]/10'];const miss=req.filter(t=>!s.includes(t));if(found.length){console.error('AINDA PRESENTE (deveria ter sido removido): '+found.join(' | '));process.exit(1)}if(miss.length){console.error('FALTANDO: '+miss.join(' | '));process.exit(1)}console.log('render layer trocada com sucesso')"</automated>
  </verify>
  <done>`npx tsc --noEmit` limpo; nenhum resquício de `@/components/ui/table`/`flexRender`/`getHeaderGroups` no arquivo; avatar de iniciais, `EtapaBadge`, ícone `Calendar` e as duas mensagens de estado vazio presentes.</done>
</task>

<task type="auto">
  <name>Task 3: Adicionar o botão verde "WhatsApp" + fluxo de preview (sketch 003-C)</name>
  <files>src/components/lead-table.tsx</files>
  <action>
Adicionar à tela de Leads o fluxo de envio de WhatsApp, copiando **exatamente** o padrão que já funciona em `src/components/followup-dashboard.tsx` (não inventar variação nova). Esta é uma funcionalidade NET-NEW em `/leads`.

1. **Imports:** `MessageCircle` de `lucide-react`; `WhatsAppPreviewDialog` de `@/components/whatsapp-preview-dialog`; `normalizePhone` de `@/lib/phone`.
   NÃO importar nem reusar `WhatsAppSendButton` — aquele componente é só-ícone e é compartilhado com o dashboard/pipeline/pós-importação, que estão fora de escopo. Aqui o botão é nomeado e local (decisão 4 do usuário).

2. **Estado:** declarar o mesmo union do dashboard, `type PreviewState = { open: false } | { open: true; lead: Lead; subnichoNome: string }`, e `const [previewState, setPreviewState] = useState<PreviewState>({ open: false })`.

3. **Botão na coluna Ações**, como **primeiro** filho do wrapper de ações criado na Task 2 (antes de Pencil/Trash2, per sketch 003-C — a ação nº1 vem primeiro na leitura esquerda→direita):
   - `<Button type="button" size="lg" className="gap-1.5 bg-[#22C55E] font-semibold text-white shadow-sm hover:bg-[#16A34A]">` com `<MessageCircle className="size-4" />` e o texto literal `WhatsApp` — largura automática, NUNCA quadrado/só-ícone.
   - `aria-label={\`Enviar WhatsApp para ${lead.nome}\`}`.
   - `disabled={normalizePhone(lead.telefone) === null}` e `title={... ? "Telefone inválido — edite o lead" : undefined}` (mesma cópia de `whatsapp-send-button.tsx`, para consistência entre telas).
   - `onClick`: `event.stopPropagation()` e depois `setPreviewState({ open: true, lead, subnichoNome: lead.subnichoNome })`. O `subnichoNome` já vem resolvido em `LeadRow` pelo `useMemo` de `data` (join client-side com `subnichoNameById`) — reusar isso, não recalcular. Como o wrapper de ações já tem `stopPropagation` no `onClick` (Task 2), o `stopPropagation` no botão é defesa em profundidade, igual aos botões de editar/excluir.
   - `lead` é `LeadRow`, que é `Lead & { subnichoNome: string }` — atribuível a `Lead`, então nenhum cast é necessário no `PreviewState`.

4. **Diálogo:** renderizar `<WhatsAppPreviewDialog>` como **último** elemento do componente, depois de `<DeleteLeadDialog>`, com exatamente as props do dashboard, exceto o tipo padrão: `open={previewState.open}`, `onOpenChange={(open) => { if (!open) setPreviewState({ open: false }); }}`, `lead={previewState.open ? previewState.lead : undefined}`, `subnichoNome={previewState.open ? previewState.subnichoNome : ""}`, `templates={templates}`, `defaultTipo="primeiro_contato"`.
   `templates` já é prop de `LeadTable` hoje (usada por `firstContactTemplate`) — reusar, **não** adicionar prop nova nem alterar a assinatura de `LeadTableProps` (isso quebraria os call sites, que estão fora de escopo).

5. Nenhum outro arquivo pode ser tocado. Se o layout ficar apertado, ajustar apenas a largura de `COL.acoes` em `lead-table.tsx`.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run build && node -e "const s=require('fs').readFileSync('src/components/lead-table.tsx','utf8');const req=['WhatsAppPreviewDialog','PreviewState','setPreviewState','normalizePhone(lead.telefone) === null','bg-[#22C55E]','MessageCircle','defaultTipo=\"primeiro_contato\"'];const miss=req.filter(t=>!s.includes(t));if(s.includes('WhatsAppSendButton')){console.error('WhatsAppSendButton nao deve ser usado aqui (decisao 4)');process.exit(1)}if(miss.length){console.error('FALTANDO: '+miss.join(' | '));process.exit(1)}console.log('fluxo de WhatsApp cabeado')"</automated>
  </verify>
  <done>`npx tsc --noEmit` e `npm run build` limpos; botão verde nomeado presente com `disabled` derivado de `normalizePhone`; `WhatsAppPreviewDialog` renderizado com `defaultTipo="primeiro_contato"`; `WhatsAppSendButton` NÃO usado.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Guard de nao-regressao + verificacao visual no navegador</name>
  <action>Rodar o guard automatizado da camada de estado (comando em <what-built>) e, se passar, apresentar ao usuario o checklist de 11 itens de <how-to-verify>. Nao concluir o plano sem o sinal de retomada do usuario.</action>
  <what-built>
Lista de Leads (`/leads`) reconstruída no formato híbrido do sketch 002-C (linhas densas em `<div>` flex dentro de um container arredondado, avatar de iniciais teal, ícone de calendário no follow-up) e com o botão verde nomeado "WhatsApp" do sketch 003-C em cada linha, abrindo o mesmo modal de preview de mensagem já usado no dashboard.

Antes de pedir sua verificação, o executor roda automaticamente o guard de não-regressão da camada de estado (decisão 7), que falha o plano se qualquer wiring de sort/filtro/paginação tiver sido alterado:

`cd "C:/Users/Vencedor/Desktop/crm-leads" && node -e "const s=require('fs').readFileSync('src/components/lead-table.tsx','utf8').split('\n').filter(l=>{const t=l.trim();return !t.startsWith('//')&&!t.startsWith('*')&&!t.startsWith('/*')}).join('\n');const req=['getCoreRowModel: getCoreRowModel()','getSortedRowModel: getSortedRowModel()','getFilteredRowModel: getFilteredRowModel()','getPaginationRowModel: getPaginationRowModel()','onSortingChange: setSorting','onColumnFiltersChange: setColumnFilters','state: { sorting, columnFilters }','pageSize: 25','columns: leadTableColumns','initialState:','<LeadTableToolbar','table.previousPage()','table.nextPage()'];const miss=req.filter(t=>!s.includes(t));if(miss.length){console.error('REGRESSAO NA CAMADA DE ESTADO — wiring ausente: '+miss.join(' | '));process.exit(1)}console.log('camada de estado (sort/filtro/paginacao) intacta')"`

Mais `npx tsc --noEmit` e `npm run build` limpos.
  </what-built>
  <how-to-verify>
Rode `npm run dev` e abra http://localhost:3000/leads (lembre: o servidor de dev fica parado entre sessões nesta máquina).

1. **Formato híbrido:** a lista aparece como linhas densas dentro de uma "caixa" arredondada com borda, sem linhas verticais de grade de tabela. Passar o mouse numa linha destaca a linha inteira (cinza claro).
2. **Avatar de iniciais:** cada linha tem um círculo teal-claro à esquerda do nome, com 1 ou 2 letras maiúsculas (ex.: "hion" → "H").
3. **Botão WhatsApp:** cada linha tem um botão verde com o texto "WhatsApp" e um ícone, sempre visível (sem precisar passar o mouse), à direita, antes dos ícones de lápis e lixeira.
4. **Abrir WhatsApp:** clique no botão verde → abre o modal de preview de mensagem com o nome do lead e o sub-nicho corretos, e o modal de **edição do lead NÃO** abre por baixo. Feche o modal.
5. **Telefone inválido:** se houver algum lead com telefone incompleto, o botão verde fica acinzentado/desabilitado e mostra "Telefone inválido — edite o lead" ao passar o mouse. (Se nenhum lead atual tiver telefone inválido, pode pular este item.)
6. **Clique na linha:** clicar em qualquer outro ponto da linha (nome, etapa, data) abre o modal de edição do lead, como antes. Feche.
7. **Editar/Excluir:** o lápis abre o modal de edição; a lixeira abre a confirmação de exclusão — nenhum dos dois abre dois modais empilhados.
8. **Ordenação (o risco nº1):** clique em "Nome" no cabeçalho → a lista reordena e a seta muda; clique de novo → inverte. Repita em "Sub-nicho", "Etapa" e "Follow-up". "Telefone" NÃO deve ser clicável.
9. **Filtros:** use o filtro de Sub-nicho e o de Etapa na toolbar; escolha um intervalo de Follow-up (início/fim). A lista filtra e volta para a página 1. Clique em "Limpar filtros" → tudo volta, ordenado por follow-up mais próximo primeiro.
10. **Sem resultados:** aplique um filtro que não bata com nenhum lead → aparece "Nenhum lead encontrado com os filtros aplicados." dentro da caixa.
11. **Paginação:** se houver mais de 25 leads, teste Anterior/Próximo. Com poucos leads, confira só que o rodapé mostra "Página 1 de 1" e os dois botões estão desabilitados.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva o que ficou errado (item numerado + o que você viu)</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dados do lead (DB) → texto de mensagem WhatsApp → URL `wa.me` | Nome/telefone vindos do CSV do cowork chegam ao link externo |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-gzb-01 | Tampering | Construção do link `wa.me` | transfer | Nenhuma mudança aqui — a construção do link e o `encodeURIComponent` continuam 100% dentro de `whatsapp-preview-dialog.tsx`/`lib/whatsapp.ts`, que este plano não toca |
| T-gzb-02 | Information Disclosure | Renderização do nome/telefone do lead | accept | Ferramenta solo, dados renderizados como texto JSX (escape automático do React), sem `dangerouslySetInnerHTML` |
| T-gzb-03 | Denial of Service (funcional) | Camada de estado do TanStack Table | mitigate | Guard automatizado na Task 4 falha o plano se qualquer wiring de sort/filtro/paginação sumir; checklist humano itens 8-11 confirma em navegador |
| T-gzb-SC | Tampering | Instalações npm/pip/cargo | mitigate | Não aplicável — este plano proíbe explicitamente dependências novas; nenhum comando de install é executado |
</threat_model>

<verification>
1. `npx tsc --noEmit` limpo (rodado nas Tasks 1, 2 e 3).
2. `npm run build` limpo (rodado na Task 3).
3. Guard de não-regressão da camada de estado (Task 4) passa.
4. `git diff --name-only` lista **apenas** `src/components/lead-table.tsx` e `src/components/lead-table-columns.tsx`.
5. Checklist humano de 11 itens aprovado no navegador.
</verification>

<success_criteria>
- `/leads` renderiza no formato híbrido do sketch 002-C, sem nenhum elemento `<table>`/`<tr>`/`<td>`.
- Todo lead tem avatar de iniciais e um botão verde nomeado "WhatsApp" sempre visível.
- O botão de WhatsApp abre o `WhatsAppPreviewDialog` correto sem disparar o modal de edição.
- Sort, filtro e paginação continuam idênticos ao comportamento de antes (guard automatizado + verificação humana).
- Somente `lead-table.tsx` e `lead-table-columns.tsx` foram modificados; nenhuma dependência nova.
</success_criteria>

<output>
Ao terminar, criar `.planning/quick/260725-gzb-implementar-na-tela-real-de-leads-lead-t/260725-gzb-SUMMARY.md` e atualizar a tabela "Quick Tasks Completed" em `.planning/STATE.md`.
</output>
</content>
</invoke>
