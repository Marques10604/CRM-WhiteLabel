---
phase: quick-260725-lai
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - src/actions/subnicho-actions.ts
  - src/actions/import-actions.ts
  - src/components/delete-subnicho-dialog.tsx
  - src/components/subnicho-manager.tsx
  - src/app/subnichos/page.tsx
  - src/components/subnicho-combobox.tsx
  - src/components/lead-table-toolbar.tsx
autonomous: false
requirements: [SUBNICHO-DEL-01, LEAD-04]

must_haves:
  truths:
    - "Cada linha do gerenciador em /subnichos tem um botão de remover (ícone de lixeira) ao lado do botão de renomear"
    - "Clicar em remover abre um diálogo de confirmação; cancelar não altera nada no banco"
    - "Confirmar a remoção faz o sub-nicho desaparecer da lista de /subnichos imediatamente (sem recarregar a página na mão)"
    - "O sub-nicho removido não aparece mais no combobox de sub-nicho ao criar um lead novo, nem no mapeamento da prévia de importação de CSV"
    - "O sub-nicho removido não aparece mais no dropdown de filtro 'Sub-nicho' da toolbar de /leads"
    - "Leads já cadastrados que apontam para o sub-nicho removido continuam aparecendo em /leads, /pipeline e no dashboard, com o NOME do sub-nicho ainda visível (não vira vazio nem 'undefined')"
    - "Editar e salvar um lead cujo sub-nicho foi removido continua funcionando, sem forçar a troca do sub-nicho e sem erro 'Selecione um sub-nicho'"
    - "Nenhuma linha é apagada de verdade: a remoção só grava deleted_at na tabela subnichos (npm run guard:no-hard-delete continua passando)"
    - "Criar novamente um sub-nicho com o mesmo nome de um removido reativa o registro existente em vez de retornar 'Esse sub-nicho já existe.'"
  artifacts:
    - path: "src/db/schema.ts"
      provides: "Coluna deletedAt (nullable timestamp) + índice em subnichos, mesmo padrão de leads (LEAD-04)"
      contains: "deleted_at"
    - path: "src/actions/subnicho-actions.ts"
      provides: "softDeleteSubnicho (soft-delete idempotente) + reativação em createSubnicho"
      contains: "export async function softDeleteSubnicho"
    - path: "src/components/delete-subnicho-dialog.tsx"
      provides: "Diálogo de confirmação de remoção, espelhando delete-lead-dialog.tsx"
      contains: "DeleteSubnichoDialog"
    - path: "src/components/subnicho-manager.tsx"
      provides: "Botão de remover por linha + estado do diálogo + toast"
      contains: "DeleteSubnichoDialog"
    - path: "src/components/subnicho-combobox.tsx"
      provides: "Filtragem de sub-nichos removidos em TODA superfície de seleção (form de lead + prévia de CSV)"
      contains: "deletedAt === null"
    - path: "src/components/lead-table-toolbar.tsx"
      provides: "Dropdown de filtro de sub-nicho só com sub-nichos ativos"
      contains: "deletedAt === null"
  key_links:
    - from: "src/components/subnicho-manager.tsx"
      to: "softDeleteSubnicho (src/actions/subnicho-actions.ts)"
      via: "onConfirm do DeleteSubnichoDialog dentro de startTransition"
      pattern: "softDeleteSubnicho\\("
    - from: "src/app/subnichos/page.tsx"
      to: "subnichos.deletedAt"
      via: "where isNull(subnichos.deletedAt) na query da página"
      pattern: "isNull\\(subnichos\\.deletedAt\\)"
    - from: "src/components/subnicho-combobox.tsx"
      to: "lead-form-dialog.tsx + csv-import-preview-table.tsx"
      via: "filtro central no useMemo de items (ambos os consumidores herdam)"
      pattern: "deletedAt === null"
    - from: "src/actions/lead-actions.ts (subnichoExists)"
      to: "subnichos (sem filtro de deletedAt)"
      via: "checagem de existência propositalmente indiferente ao soft-delete, para não quebrar edição de leads antigos"
      pattern: "eq\\(subnichos\\.id, subnichoId\\)"
---

<objective>
Adicionar remoção de sub-nicho na tela `/subnichos`, implementada como **soft-delete** (nova coluna `deletedAt` na tabela `subnichos`), seguindo exatamente a convenção LEAD-04 já em vigor para leads: nada é apagado de verdade, `npm run guard:no-hard-delete` continua sendo a garantia.

Purpose: hoje a lista de sub-nichos só cresce — um sub-nicho criado por engano (ou vindo de um CSV com typo) fica para sempre poluindo o combobox de criar lead e o filtro de `/leads`. Antes do uso real de segunda-feira (2026-07-27) e da importação do CSV do cowork (que **cria sub-nichos automaticamente a partir dos nomes do arquivo**), é preciso poder limpar essa lista.

Output: coluna `deleted_at` em `subnichos` (aplicada via `drizzle-kit push`), ação `softDeleteSubnicho`, componente `delete-subnicho-dialog.tsx`, e filtragem de removidos nas três superfícies de seleção (gerenciador, combobox, filtro da toolbar). Nenhuma dependência nova.

**Risco principal (vigiado na Task 3):** o array de `subnichos` que as páginas passam para os componentes serve a DOIS propósitos ao mesmo tempo — (a) opções de seleção e (b) mapa `subnichoId -> nome` para exibir o sub-nicho de cada lead. Filtrar `deletedAt` na query das páginas de leads/pipeline/dashboard quebraria (b): leads de um sub-nicho removido perderiam o nome exibido. Por isso a decisão deste plano é **filtrar apenas nas superfícies de seleção** (combobox e dropdown de filtro), mantendo as queries dessas páginas buscando TODOS os sub-nichos.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

Arquivos-fonte que definem os padrões a espelhar:
@src/actions/lead-actions.ts
@src/components/delete-lead-dialog.tsx
@src/db/schema.ts
@src/actions/subnicho-actions.ts
@src/components/subnicho-manager.tsx
@src/components/subnicho-combobox.tsx
@src/app/subnichos/page.tsx
@src/components/lead-table-toolbar.tsx
@src/actions/import-actions.ts
@scripts/guard-no-hard-delete.cjs

<interfaces>
Contratos já existentes no projeto que o executor deve usar sem re-descobrir.

Padrão de soft-delete (src/actions/lead-actions.ts, linhas 197-208) — assinatura POSICIONAL, não ligada a useActionState:
  export async function softDeleteLead(leadId: number): Promise<ActionState>
  corpo: db.update(leads).set({ deletedAt: sql`(unixepoch())` })
         .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
         + revalidatePath(...) por rota afetada, retorna { success: true }

ActionState de src/actions/subnicho-actions.ts (já existe no arquivo, reaproveitar):
  type ActionState = { success: true } | { errors: { nome: string[] } } | undefined

Tipo Subnicho (src/types/index.ts) é InferSelectModel<typeof subnichos> — ao adicionar
deletedAt ao schema, o campo `deletedAt: Date | null` aparece automaticamente no tipo
em toda a base, sem edição manual em src/types.

Contrato do diálogo de confirmação já usado para leads (src/components/delete-lead-dialog.tsx):
  props: { open: boolean; onOpenChange: (open: boolean) => void; leadNome: string; onConfirm: () => void }
  estrutura: Dialog > DialogContent showCloseButton={false} > DialogHeader (DialogTitle +
  DialogDescription) > DialogFooter (Button variant="outline" Cancelar + Button
  variant="destructive" ação)

Consumidores de SubnichoCombobox (herdam qualquer filtro feito lá dentro):
  src/components/lead-form-dialog.tsx:266
  src/components/csv-import-preview-table.tsx:136

Páginas que buscam subnichos hoje (todas sem filtro): src/app/subnichos/page.tsx:7,
src/app/page.tsx:17, src/app/leads/page.tsx:20, src/app/pipeline/page.tsx:23,
src/app/lixeira/page.tsx:19, src/app/importar/page.tsx:13,
src/app/importar/[batchId]/page.tsx:28
</interfaces>
</context>

<constraints_de_ambiente>
- Host com 4GB de RAM: rodar os comandos de verificação **um por vez**, nunca em paralelo, nunca em background. Não abrir um segundo `npm run dev`.
- O servidor de dev já está RODANDO em http://localhost:3000 (PID 1496, sobrevive entre sessões) — usar esse, não reiniciar.
- Migração: seguir a decisão do Phase 04-02 — aplicar via `npx drizzle-kit push` contra `./data/crm.db` (arquivo gitignored), **sem** `drizzle-kit generate`. Push não escreve arquivo `.sql`, portanto esta mudança de schema não produz diff versionável em `src/db/migrations/` — a verificação é feita consultando o banco vivo.
- Tudo em PT-BR: textos de UI, toasts, comentários de código e o SUMMARY.
</constraints_de_ambiente>

<tasks>

<task type="auto">
  <name>Task 1: Coluna deletedAt em subnichos + ação softDeleteSubnicho + reativação por nome</name>
  <files>src/db/schema.ts, src/actions/subnicho-actions.ts, src/actions/import-actions.ts</files>
  <action>
Camada de dados e servidor da remoção. Quatro mudanças:

1. `src/db/schema.ts` — na definição de `subnichos`, adicionar a coluna `deletedAt: integer("deleted_at", { mode: "timestamp" })` (nullable, sem default, com o comentário `// nullable = ativo (LEAD-04)`, idêntico em forma ao campo já presente em `leads`), e no callback de índices da tabela adicionar `index("subnichos_deleted_at_idx").on(table.deletedAt)` ao lado do `uniqueIndex("subnicho_nome_unique_idx")` já existente. Importar `index` de `drizzle-orm/sqlite-core` já está feito no topo do arquivo. NÃO alterar o `uniqueIndex` de nome: ele continua global (inclui removidos), e a reativação do item 3 é justamente a consequência disso.

2. Aplicar no banco: `npx drizzle-kit push`. São statements não-destrutivos (ALTER TABLE ADD COLUMN + CREATE INDEX); se o comando ficar preso em prompt interativo, reexecutar com `npx drizzle-kit push --force`. Não rodar `drizzle-kit generate` (decisão 04-02: nenhum arquivo de migração para esta mudança).

3. `src/actions/subnicho-actions.ts` — adicionar `softDeleteSubnicho(subnichoId: number): Promise<ActionState>` espelhando `softDeleteLead`: valida `Number.isInteger(subnichoId) && subnichoId > 0` (retornando `{ errors: { nome: ["Sub-nicho inválido."] } }` se não), grava `{ deletedAt: sql`(unixepoch())` }` com `.where(and(eq(subnichos.id, subnichoId), isNull(subnichos.deletedAt)))` — o guard `isNull` torna a ação idempotente (remover duas vezes é no-op, não sobrescreve o `deletedAt` original) —, então `revalidatePath` para `"/subnichos"`, `"/"`, `"/leads"`, `"/pipeline"` e `"/importar"` (toda rota que oferece seleção de sub-nicho) e retorna `{ success: true }`. Importar `and` e `isNull` de `drizzle-orm`. Adicionar acima da função um comentário PT-BR explicando: nunca hard-delete (LEAD-04, `guard:no-hard-delete` cobre `.delete(subnichos`), leads existentes continuam apontando para o id removido de propósito, e `onDelete: "restrict"` do FK em `leads.subnichoId` permanece intocado.

Ainda no mesmo arquivo, em `createSubnicho`: a busca de duplicata por `lower(trim(nome))` hoje ignora `deletedAt`, então recriar um nome removido devolveria "Esse sub-nicho já existe." — um beco sem saída. Passar a selecionar também `deletedAt` na query de duplicata e, quando a linha encontrada estiver removida (`existing[0].deletedAt !== null`), **reativar**: `db.update(subnichos).set({ deletedAt: null, nome })` em `eq(subnichos.id, existing[0].id)` (regrava o nome para respeitar a grafia recém-digitada), revalidar as mesmas rotas e retornar `{ success: true }`. Só manter o erro "Esse sub-nicho já existe." quando a linha encontrada estiver ativa. Comentar o porquê.

4. `src/actions/import-actions.ts` — dentro da transação de `bulkImportLeads`, o loop que resolve sub-nichos por nome (`subnichoLookupCondition`) reusaria silenciosamente o id de um sub-nicho removido, criando leads presos a um sub-nicho invisível. Passar a selecionar também `deletedAt` nesse `tx.select`, e quando a linha existente estiver removida, reativá-la (`tx.update(subnichos).set({ deletedAt: null }).where(eq(subnichos.id, existing.id)).run()`) antes de registrar o id no `subnichoIdByNome` — o CSV trazendo o nome é sinal claro de que o sub-nicho voltou a ser usado. Mesmo tratamento em `fetchPreviewSupportData`: um nome que existe só como removido NÃO deve entrar em `unknownSubnichoNames` (ele não vai ser criado, vai ser reativado) — manter o comportamento atual (não listar), portanto ali nada muda; apenas confirmar por leitura e comentar a intenção.

NÃO alterar `subnichoExists` em `src/actions/lead-actions.ts`: ela precisa continuar indiferente ao `deletedAt`, senão editar/salvar um lead cujo sub-nicho foi removido passaria a falhar com "Selecione um sub-nicho." Adicionar uma frase no comentário existente dessa função registrando essa decisão.
  </action>
  <verify>
    <automated>node -e "const D=require('better-sqlite3')('./data/crm.db');const c=D.prepare('PRAGMA table_info(subnichos)').all().map(x=>x.name);const i=D.prepare(\"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='subnichos'\").all().map(x=>x.name);if(!c.includes('deleted_at')){console.error('FALHOU: coluna deleted_at ausente em subnichos:',c.join(','));process.exit(1)}if(!i.includes('subnichos_deleted_at_idx')){console.error('FALHOU: indice subnichos_deleted_at_idx ausente:',i.join(','));process.exit(1)}console.log('OK colunas:',c.join(','))"</automated>
    <automated>node -e "const fs=require('fs');const s=fs.readFileSync('src/actions/subnicho-actions.ts','utf8');const linhas=s.split(/\r?\n/).filter(l=>!l.trim().startsWith('*')&&!l.trim().startsWith('//'));const corpo=linhas.join('\n');const req=[['export async function softDeleteSubnicho',/export async function softDeleteSubnicho/],['isNull(subnichos.deletedAt) no where',/isNull\(subnichos\.deletedAt\)/],['reativacao deletedAt: null',/deletedAt: null/]];let f=0;for(const [nome,re] of req){if(!re.test(corpo)){console.error('FALHOU: falta',nome);f++}}if(/\.delete\(\s*subnichos/.test(corpo)){console.error('FALHOU: hard-delete de subnichos encontrado');f++}process.exit(f?1:0)"</automated>
    <automated>npm run guard:no-hard-delete</automated>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>Tabela `subnichos` no banco vivo tem `deleted_at` + índice `subnichos_deleted_at_idx`; `softDeleteSubnicho` existe, é idempotente via `isNull` e nunca chama `.delete(subnichos`; recriar/importar um nome removido reativa a linha; `tsc --noEmit`, lint do guard e o guard anti hard-delete passam.</done>
</task>

<task type="auto">
  <name>Task 2: Diálogo de confirmação + botão de remover em cada linha de /subnichos</name>
  <files>src/components/delete-subnicho-dialog.tsx, src/components/subnicho-manager.tsx, src/app/subnichos/page.tsx</files>
  <action>
UI da remoção, seguindo a convenção de confirmação já estabelecida no projeto (diálogo dedicado com os primitivos `Dialog` — **não** usar `window.confirm`, que não é usado em lugar nenhum desta base).

1. Criar `src/components/delete-subnicho-dialog.tsx` como cópia estrutural de `delete-lead-dialog.tsx` (`"use client"`, mesmos imports de `Dialog*` e `Button`, `DialogContent showCloseButton={false}`, footer com `Button variant="outline"` Cancelar + `Button variant="destructive"`). Props: `{ open, onOpenChange, subnichoNome, onConfirm }`. Título: `Remover sub-nicho`. Descrição interpolando o nome: `Tem certeza que deseja remover ${subnichoNome}? Ele deixa de aparecer nas opções de novos leads e nos filtros. Os leads já cadastrados nesse sub-nicho continuam intactos.` Rótulo do botão destrutivo: `Remover`. Comentário de topo no mesmo estilo do arquivo espelhado, citando LEAD-04/soft-delete.

2. `src/components/subnicho-manager.tsx`, dentro de `SubnichoRow` (modo de leitura, o bloco `if (!isEditing)`): importar `Trash2` de `lucide-react`, `useTransition` de `react`, `softDeleteSubnicho` da action e `DeleteSubnichoDialog`. Adicionar ao lado do botão de `Pencil` um segundo botão-ícone com a mesma estrutura de classes (`flex h-9 w-9 items-center justify-center rounded-md text-zinc-500`) mas `hover:text-[#DC2626]`, `aria-label={`Remover ${subnicho.nome}`}`, `disabled` enquanto a transição está pendente, e `onClick` que só abre o diálogo (estado local `confirmOpen`). Renderizar `DeleteSubnichoDialog` nesse mesmo bloco. O `onConfirm` chama `startTransition(async () => { await softDeleteSubnicho(subnicho.id); toast.success("Sub-nicho removido."); setConfirmOpen(false); })` — mesmo padrão de `handleDeleteConfirm` em `lead-table.tsx` (linhas 143-151). Não mexer no fluxo de renomear.

3. `src/components/subnicho-manager.tsx`, em `SubnichoManager`: como agora é possível remover todos, o container da lista pode ficar vazio. Quando `subnichos.length === 0`, renderizar no lugar das linhas um texto `Nenhum sub-nicho cadastrado.` com as classes `px-3 py-2 text-sm text-muted-foreground`, mantendo o botão `+ Adicionar` sempre visível abaixo.

4. `src/app/subnichos/page.tsx`: a query passa a filtrar `.where(isNull(subnichos.deletedAt))` antes do `orderBy` (importar `isNull` de `drizzle-orm`) — esta página existe só para gerenciar/selecionar, então aqui o filtro é no nível da query mesmo.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const d=fs.readFileSync('src/components/delete-subnicho-dialog.tsx','utf8');const m=fs.readFileSync('src/components/subnicho-manager.tsx','utf8');const p=fs.readFileSync('src/app/subnichos/page.tsx','utf8');const req=[['dialog exporta DeleteSubnichoDialog',/export function DeleteSubnichoDialog/,d],['dialog usa variant destructive',/variant=\"destructive\"/,d],['manager importa o dialog',/DeleteSubnichoDialog/,m],['manager chama softDeleteSubnicho',/softDeleteSubnicho\(/,m],['manager usa Trash2',/Trash2/,m],['manager usa startTransition',/startTransition\(/,m],['manager tem estado vazio',/Nenhum sub-nicho cadastrado/,m],['page filtra deletedAt',/isNull\(subnichos\.deletedAt\)/,p]];let f=0;for(const [nome,re,src] of req){if(!re.test(src)){console.error('FALHOU: falta',nome);f++}}if(/window\.confirm/.test(m)){console.error('FALHOU: window.confirm usado em vez do dialog do projeto');f++}process.exit(f?1:0)"</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run lint</automated>
  </verify>
  <done>`/subnichos` mostra um botão de lixeira por linha que abre um diálogo de confirmação; confirmar chama `softDeleteSubnicho` e exibe o toast "Sub-nicho removido."; a lista da página só traz sub-nichos com `deleted_at IS NULL` e mostra estado vazio quando não há nenhum; `tsc` e `lint` limpos.</done>
</task>

<task type="auto">
  <name>Task 3: Esconder sub-nichos removidos das superfícies de seleção (combobox + filtro) sem quebrar leads antigos</name>
  <files>src/components/subnicho-combobox.tsx, src/components/lead-table-toolbar.tsx</files>
  <action>
Ponto crítico do plano: filtrar os removidos **só** onde o usuário SELECIONA um sub-nicho, nunca onde o array serve de mapa `id -> nome` para exibição.

1. `src/components/subnicho-combobox.tsx` — no `useMemo` de `items`, filtrar antes do `map`: manter o sub-nicho quando `subnicho.deletedAt === null` **ou** quando `subnicho.id === value` (o valor atualmente selecionado permanece na lista mesmo se removido). Adicionar `value` ao array de dependências do `useMemo`. Sem essa segunda condição, abrir o formulário de edição de um lead cujo sub-nicho foi removido mostraria o campo vazio e obrigaria a trocar de sub-nicho — exatamente o "quebrar leads existentes" que este plano precisa evitar. Comentar isso em PT-BR acima do filtro. Esta única mudança cobre AS DUAS superfícies de seleção (`lead-form-dialog.tsx` e `csv-import-preview-table.tsx`), que consomem este componente.

2. `src/components/lead-table-toolbar.tsx` — no `.map` que gera os `SelectItem` do filtro "Sub-nicho" (por volta da linha 102), filtrar para `subnicho.deletedAt === null`. O `SelectItem` "Todos os sub-nichos" e o resto do comportamento de filtro (que compara por `subnichoId` numérico, decisão do Phase 01) ficam intactos.

3. Confirmar por leitura (e registrar no SUMMARY) que as queries de `src/app/page.tsx`, `src/app/leads/page.tsx`, `src/app/pipeline/page.tsx`, `src/app/lixeira/page.tsx`, `src/app/importar/page.tsx` e `src/app/importar/[batchId]/page.tsx` **continuam sem** filtro de `deletedAt` — é isso que mantém o nome do sub-nicho resolvendo nos mapas `subnichoNameById` de `lead-table.tsx`, `pipeline-board.tsx`, `followup-dashboard.tsx`, `lixeira-table.tsx` e `post-import-lead-list.tsx` para leads de sub-nicho removido. Adicionar um comentário de uma linha em `src/app/leads/page.tsx` explicando essa intenção, para que uma futura "limpeza" não introduza o filtro por engano.

4. Rodar `npm run build` (uma vez, sem paralelismo) e depois o smoke test manual descrito no `<human-check>`.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const c=fs.readFileSync('src/components/subnicho-combobox.tsx','utf8');const t=fs.readFileSync('src/components/lead-table-toolbar.tsx','utf8');let f=0;if(!/deletedAt === null/.test(c)){console.error('FALHOU: combobox nao filtra deletedAt');f++}if(!/id === value/.test(c)){console.error('FALHOU: combobox nao preserva o valor selecionado removido');f++}if(!/deletedAt === null/.test(t)){console.error('FALHOU: toolbar nao filtra deletedAt');f++}const pages=['src/app/page.tsx','src/app/leads/page.tsx','src/app/pipeline/page.tsx','src/app/lixeira/page.tsx'];for(const p of pages){const s=fs.readFileSync(p,'utf8').split(/\r?\n/).filter(l=>!l.trim().startsWith('//')).join('\n');if(/isNull\(subnichos\.deletedAt\)/.test(s)){console.error('FALHOU:',p,'nao deve filtrar subnichos por deletedAt (quebra o mapa id->nome)');f++}}process.exit(f?1:0)"</automated>
    <automated>npm run build</automated>
    <human-check>
Smoke test em http://localhost:3000 (servidor já rodando):
1. `/subnichos`: criar um sub-nicho descartável (ex.: "teste-remover"). Ele aparece na lista.
2. Clicar na lixeira dessa linha -> o diálogo "Remover sub-nicho" abre citando o nome. Clicar em "Cancelar" -> nada muda, o sub-nicho continua na lista.
3. Clicar na lixeira de novo -> "Remover" -> toast "Sub-nicho removido." e a linha desaparece sem recarregar a página.
4. `/leads` -> "Novo lead" -> abrir o combobox de sub-nicho: "teste-remover" NÃO aparece; os outros aparecem.
5. `/leads` -> dropdown de filtro "Sub-nicho": "teste-remover" NÃO aparece.
6. Remover o sub-nicho do lead de teste real existente ("hion", nutricionista): remover "nutricionista" em `/subnichos`, voltar em `/leads` e confirmar que a linha do "hion" continua listada com o texto "nutricionista" visível na coluna de sub-nicho (não vazio/undefined), que `/pipeline` e o dashboard `/` também mostram o nome, e que abrir a edição desse lead e salvar sem trocar nada funciona (toast de sucesso, sem erro "Selecione um sub-nicho").
7. `/subnichos`: criar de novo "nutricionista" -> deve dar sucesso (reativação), NÃO o erro "Esse sub-nicho já existe.". Confirmar que ele volta a aparecer no combobox de novo lead.
8. Remover também "teste-remover" da base de teste (já está removido) e deixar a lista final só com os sub-nichos reais.
    </human-check>
  </verify>
  <done>Sub-nichos removidos não aparecem no combobox de lead nem no filtro da toolbar, mas continuam resolvendo nome para leads antigos em todas as telas; editar um lead de sub-nicho removido salva sem erro; `npm run build` limpo; checklist do `<human-check>` aprovado pelo usuário.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| navegador -> Server Action | `softDeleteSubnicho` é um endpoint invocável: o id chega do cliente e não é validado por Zod (a action existente só valida `nome`) |
| aplicação -> SQLite local | Nova coluna + novo índice aplicados por `drizzle-kit push` direto no arquivo `data/crm.db` em uso pelo dev server |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-lai-01 | Tampering | `softDeleteSubnicho` (id arbitrário do cliente) | mitigate | Validar `Number.isInteger(subnichoId) && subnichoId > 0` antes do update; where restrito a `isNull(deletedAt)` (idempotente); operação é 100% reversível (`deletedAt = null`), nenhuma linha ou lead é destruído |
| T-lai-02 | Denial of Service (integridade de dados) | `leads.subnichoId` -> `subnichos.id` | mitigate | Sem cascade e sem hard-delete: FK `onDelete: "restrict"` fica intocado, leads continuam válidos; `subnichoExists` em `lead-actions.ts` propositalmente NÃO filtra `deletedAt`, então editar leads antigos não passa a falhar |
| T-lai-03 | Repudiation | remoção sem trilha | accept | Ferramenta solo, single-user, sem auditoria em nenhuma outra ação do projeto; `deleted_at` já registra o instante da remoção |
| T-lai-04 | Elevation of Privilege / bypass de convenção | `guard:no-hard-delete` | mitigate | Nenhum `.delete(subnichos` introduzido; `drizzle-kit push` não gera arquivo `.sql`, então nenhuma migração nova entra no escopo `DELETE FROM`/`DROP TABLE` do guard; guard rodado como gate na Task 1 |
| T-lai-SC | Tampering | npm/pip/cargo installs | mitigate | **Nenhum pacote novo é instalado neste plano** (`lucide-react`, `sonner`, `drizzle-orm`, `drizzle-kit` já estão em `package.json`) — Package Legitimacy Gate não se aplica |
</threat_model>

<verification>
Gates finais, rodados em sequência (nunca em paralelo — host de 4GB):

1. `node -e` do PRAGMA: `subnichos` tem `deleted_at` e `subnichos_deleted_at_idx`.
2. `npm run guard:no-hard-delete` -> exit 0.
3. `npx tsc --noEmit` -> sem erros.
4. `npm run lint` -> sem erros.
5. `npm run build` -> sucesso.
6. Nenhuma das páginas de listagem de leads (`/`, `/leads`, `/pipeline`, `/lixeira`) filtra `subnichos` por `deletedAt` (checado pelo `node -e` da Task 3).
7. `<human-check>` da Task 3 aprovado pelo usuário no navegador.
</verification>

<success_criteria>
- Existe um botão de remover por linha em `/subnichos`, com diálogo de confirmação no padrão `DeleteLeadDialog` (sem `window.confirm`).
- A remoção grava `deleted_at` e nada mais: zero linhas apagadas, `guard:no-hard-delete` passando.
- Sub-nichos removidos desaparecem do gerenciador, do combobox de criar/editar lead, do mapeamento da prévia de CSV e do filtro de `/leads`.
- Leads que apontam para um sub-nicho removido continuam listados, com o nome do sub-nicho visível, e continuam editáveis/salváveis.
- Recriar (ou importar) um nome removido reativa o registro em vez de dar erro de duplicata.
- `tsc --noEmit`, `lint` e `build` limpos.
</success_criteria>

<output>
Criar `.planning/quick/260725-lai-adicionar-botao-de-remocao-soft-delete-d/260725-lai-SUMMARY.md` ao terminar (em PT-BR), registrando obrigatoriamente:
- que a coluna foi aplicada via `drizzle-kit push` e por isso NÃO há diff em `src/db/migrations/` (mesma nota da decisão 04-02), com a saída do PRAGMA como evidência;
- a decisão "filtrar só nas superfícies de seleção, nunca nas queries de listagem de leads" e o motivo (mapa `id -> nome`);
- a decisão de reativar por nome em `createSubnicho`/`bulkImportLeads` em vez de erro de duplicata;
- a decisão de manter `subnichoExists` indiferente a `deletedAt`;
- resultado item-a-item do `<human-check>`.
</output>
