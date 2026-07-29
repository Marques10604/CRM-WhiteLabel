# Itens fora de escopo encontrados durante a execução (260725-lai)

## `npm run lint` falha por regra pré-existente `react-compiler` (fora de escopo)

**Encontrado em:** Task 2, ao rodar o verify `npm run lint`.

**Descrição:** A regra ESLint "Calling setState synchronously within an effect can
trigger cascading renders" (plugin `react-compiler`) já falha em pelo menos 8
arquivos do projeto ANTES desta quick task, incluindo dois blocos de
`useEffect` em `src/components/subnicho-manager.tsx` que **não foram tocados**
por este plano (`setIsEditing(false)` no handler de sucesso de
`renameSubnicho`, `setIsAdding(false)` no handler de sucesso de
`createSubnicho` — código pré-existente, só os números de linha mudaram por
causa das inserções deste plano).

Outros arquivos com o mesmo padrão pré-existente, confirmando que é um
problema de todo o projeto e não desta task: `src/components/lead-form-dialog.tsx:312`,
`src/components/lead-table.tsx:124`, `src/components/lixeira-table.tsx:116`,
`src/components/template-form-dialog.tsx:117`, `src/components/whatsapp-preview-dialog.tsx:78`,
`src/components/csv-import-preview-table.tsx:202`.

**Ação tomada:** Nenhuma. Confirmado por leitura que o código NOVO adicionado
por este plano (`src/components/delete-subnicho-dialog.tsx`, o botão de
lixeira e `handleDeleteConfirm` via `startTransition` em
`subnicho-manager.tsx`) não introduz nenhuma ocorrência nova dessa regra —
`handleDeleteConfirm` não roda dentro de `useEffect`. Regra "Scope
Boundary" do executor: pré-existente, fora do escopo direto das mudanças
desta task, não corrigido aqui.

**Recomendação:** Endereçar em uma limpeza dedicada (não quick task), trocando
os `setState` síncronos dentro de `useEffect` por `startTransition` ou
reestruturando os handlers, nos 6+ arquivos afetados.
