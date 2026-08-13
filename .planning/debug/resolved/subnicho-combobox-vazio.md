---
status: resolved
trigger: "Achado durante UAT da Fase 10: combobox 'Sub-nicho' no formulário 'Novo lead' não carrega nenhuma opção."
created: 2026-08-13T13:20:00Z
updated: 2026-08-13T14:05:00Z
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

hypothesis: CONFIRMADA (ver Resolution) — não é bug de código. Todos os 9 registros da tabela `subnichos` no banco real (`data/crm.db`) estão soft-deletados (`deleted_at` preenchido), então o filtro `subnicho.deletedAt === null || subnicho.id === value` em `subnicho-combobox.tsx` corretamente esvazia a lista — não há nenhum sub-nicho ATIVO para mostrar. `/subnichos` (SubnichoManager) também está vazio agora, confirmando de forma independente que o problema é estado de dados, não o componente Combobox.
test: Aplicado — reativar (deletedAt = NULL) os sub-nichos reais usados no dia-a-dia (nutricionista id=4, odonto id=5, "A categorizar" id=12), replicando exatamente o caminho de reativação que `createSubnicho` já implementa (re-digitar o mesmo nome reativa o registro soft-deletado).
expecting: Após reativar, `/subnichos` deve listar os 3 registros e o combobox "Sub-nicho" no formulário "Novo lead" deve mostrar as opções e permitir criar lead.
next_action: RESOLVIDO — verificado via automação de navegador (Chrome), não pelo usuário diretamente: /pipeline -> "Novo lead" -> campo "Sub-nicho" mostra nutricionista/odonto/A categorizar, e a busca por texto ("nutri") filtra corretamente para "nutricionista". Sessão arquivada.
reasoning_checkpoint:
  hypothesis: "O combobox mostra 'Nenhum sub-nicho encontrado' porque TODOS os sub-nichos do banco estão soft-deletados (deleted_at preenchido) — zero sub-nichos ativos existem, não porque o componente Combobox (base-ui) ou o filtro em subnicho-combobox.tsx tenham defeito."
  confirming_evidence:
    - "Query direta em data/crm.db: `SELECT id, nome, deleted_at FROM subnichos` retorna 9 linhas, e as 9 têm deleted_at != NULL (timestamps entre 2026-08-01 e 2026-08-11)."
    - "Leitura completa de subnicho-combobox.tsx: o useMemo filtra `subnicho.deletedAt === null || subnicho.id === value`; em modo de criação `value` é null, então nenhuma linha passa no filtro — comportamento correto e intencional (comentário no próprio código documenta essa exceção)."
    - "Leitura completa da lib base-ui Combobox (AriaCombobox.js): quando `filterQuery === ''` (campo vazio, sem digitar nada) TODOS os itens de `items` são retornados sem filtro adicional — ou seja, se `items` tivesse conteúdo, apareceria mesmo sem digitar. `items` vem vazio porque o array já chega vazio do useMemo."
    - "src/app/subnichos/page.tsx faz `where(isNull(subnichos.deletedAt))` e alimenta SubnichoManager — página independente do formulário de lead, mesma fonte de dados, mesmo resultado vazio esperado. Confirma que o problema não é exclusivo do componente Combobox."
  falsification_test: "Se, após rodar `UPDATE subnichos SET deleted_at = NULL WHERE id IN (4,5,12)`, o combobox continuar vazio (ou /subnichos continuar vazio), a hipótese estaria refutada e o bug estaria de fato no componente/plumbing."
  fix_rationale: "Não há defeito de código a corrigir — o filtro e o componente Combobox funcionam como projetado. O 'fix' é restaurar o estado de dados (reativar sub-nichos reais soft-deletados por engano durante testes manuais anteriores), usando o mesmo mecanismo de reativação que createSubnicho já implementa (retomar `deletedAt = NULL` no registro existente), não um hard-delete/insert novo."
  blind_spots: "Não investiguei COMO/QUANDO cada sub-nicho foi soft-deletado (não há log de auditoria) — inferi por agrupamento de timestamps (8 deleções em ~30s em 2026-08-01, provavelmente teste manual do fluxo de exclusão em lote; 'nutricionista' isolado em 2026-08-11, provavelmente exclusão acidental durante UAT da Fase 10). Não adicionei nenhuma salvaguarda de produto (ex: impedir excluir o último sub-nicho ativo) — é uma sugestão de melhoria futura, fora do escopo mínimo deste bug."
tdd_checkpoint: null

## Symptoms
<!-- Written during gathering, then immutable -->

expected: Ao clicar no campo "Sub-nicho" no formulário "Novo lead" (ou "Editar lead"), a lista de sub-nichos cadastrados (ex.: nutricionista, odonto, "A categorizar", etc. — confirmados existentes na tabela `subnichos` do banco real) deveria aparecer para seleção, com busca por texto funcionando.
actual: O dropdown abre mas mostra sempre "Nenhum sub-nicho encontrado.", mesmo sem digitar nada e mesmo digitando um termo que corresponde a um sub-nicho existente (testado com a letra "a", que deveria bater com "nutricionista", "A categorizar", etc.). Isso bloqueia a criação de leads novos pela UI, já que Sub-nicho é campo obrigatório no formulário ("Selecione um sub-nicho").
errors: Nenhum erro visível no console do navegador relacionado a isso (apenas um warning de hydration mismatch pré-existente e não relacionado). Nenhuma chamada de rede falhando observada.
reproduction: Abrir /pipeline ou / -> clicar "Novo lead" -> preencher campos -> clicar no campo "Sub-nicho" -> dropdown mostra "Nenhum sub-nicho encontrado." mesmo com sub-nichos cadastrados no banco (`SELECT * FROM subnichos` retorna 9+ linhas, incluindo "nutricionista", "odonto", "A categorizar").
started: Desconhecido — só percebido agora durante a UAT manual da Fase 10 (2026-08-13); não é uma regressão desta fase (Sub-nicho é campo de fases anteriores, 01/02).

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- timestamp: 2026-08-13T13:15:00Z
  checked: "SELECT id, nome FROM subnichos" no banco real (data/crm.db)
  found: "9 sub-nichos cadastrados, incluindo nutricionista (id 4), odonto (id 5), A categorizar (id 12)"
  implication: "O problema não é ausência de dados no banco — a lista existe e tem conteúdo pesquisável (contém a letra 'a')."

- timestamp: 2026-08-13T13:35:00Z
  checked: "src/components/subnicho-combobox.tsx (leitura completa) e src/components/ui/combobox.tsx (wrapper de @base-ui/react Combobox, leitura completa)"
  found: "O componente filtra `subnichos.filter(s => s.deletedAt === null || s.id === value)` antes de montar a lista `items` passada ao Combobox. O wrapper ui/combobox.tsx usa a API padrão de @base-ui/react (items + ComboboxList com render-prop), sem customização de filtro — o filtro textual é o default da lib (baseado no label do item, funciona OOB para objetos {value,label})."
  implication: "Hipótese revisada: se `items` chegar vazio ao Combobox root, a lista aparece vazia mesmo sem digitar nada (comportamento correto da lib, não bug). Precisa verificar se `subnichos` prop (fonte) tem alguma linha com deletedAt === null."

- timestamp: 2026-08-13T13:40:00Z
  checked: "node_modules/@base-ui/react/combobox/root/AriaCombobox.js — lógica de filteredItems e shouldBypassFiltering"
  found: "Quando o campo de busca está vazio (`filterQuery === ''`), a lib retorna TODOS os itens de `items` sem aplicar filtro nenhum (linha ~242-249). Ou seja: com o dropdown recém-aberto e nada digitado, qualquer item presente em `items` apareceria."
  implication: "Se o dropdown mostra vazio mesmo sem digitar, o array `items` (calculado em subnicho-combobox.tsx a partir da prop `subnichos`) já chega vazio — não é bug de filtro/busca da lib base-ui, é o array de entrada que está vazio."

- timestamp: 2026-08-13T13:45:00Z
  checked: "node -e query direta em data/crm.db: SELECT id, nome, deleted_at, typeof(deleted_at) FROM subnichos"
  found: "As 9 linhas TODAS têm deleted_at preenchido (nenhuma é NULL): nutricionista (id4) deletado em 2026-08-11T20:39:10Z; odonto (id5) em 2026-08-01T20:24:25Z; 'A categorizar' (id12) e mais 6 registros de teste ('Teste Import...', 'Novo Sub...') deletados em sequência rápida entre 2026-08-01T20:13:55Z e 2026-08-01T20:14:18Z (~23s de intervalo total, 8 exclusões)."
  implication: "ROOT CAUSE CONFIRMADA: zero sub-nichos ATIVOS existem no banco local agora. O filtro `deletedAt === null` em subnicho-combobox.tsx corretamente exclui as 9 linhas (nenhuma tem deletedAt null e nenhuma é a `value` atual, que é null em modo criação) — resultado: `items` vazio, dropdown mostra 'Nenhum sub-nicho encontrado.' mesmo sem digitar. Não é bug de UI/lib."

- timestamp: 2026-08-13T13:47:00Z
  checked: "src/app/subnichos/page.tsx (query server-side com where(isNull(subnichos.deletedAt)))"
  found: "Página /subnichos (gerenciador de sub-nichos, independente do formulário de lead) usa a MESMA condição deletedAt IS NULL e, com o estado atual do banco, também renderizaria 'Nenhum sub-nicho cadastrado.' — confirma de forma independente que o problema é o estado de dados (zero ativos), não algo específico do componente Combobox usado no formulário."
  implication: "Confirma a causa raiz via segunda superfície independente que consome os mesmos dados de forma diferente (query direta filtrada no server, sem Combobox nenhum) e chega ao mesmo resultado vazio."

- timestamp: 2026-08-13T13:50:00Z
  checked: "src/actions/subnicho-actions.ts — createSubnicho (branch de reativação, linhas 28-42)"
  found: "createSubnicho já implementa reativação: se o nome digitado bate (case-insensitive/trim) com um sub-nicho soft-deletado existente, ele faz UPDATE deletedAt=null nesse registro em vez de criar um novo ou bloquear com 'já existe'. Esse é o mecanismo de recuperação já construído no app para exatamente este cenário."
  implication: "O 'fix' correto é reativar os sub-nichos reais (nutricionista, odonto, A categorizar) usando este mesmo caminho — não é necessário nem desejável mudar código do Combobox, que está funcionando como projetado."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: >
  Não é bug de código. Todos os 9 sub-nichos cadastrados no banco local (data/crm.db)
  estavam soft-deletados (deleted_at preenchido) — incluindo os 3 usados de verdade
  (nutricionista id=4, odonto id=5, "A categorizar" id=12), aparentemente excluídos por
  engano durante testes manuais anteriores (8 exclusões em ~23s em 2026-08-01, provável
  teste do fluxo de exclusão em lote da Fase 01/04; "nutricionista" excluído isoladamente
  em 2026-08-11, provável engano durante a UAT da Fase 10). O filtro em
  subnicho-combobox.tsx (`deletedAt === null || id === value`) e a lib base-ui Combobox
  funcionam exatamente como projetado: com zero linhas ativas e nenhum valor selecionado,
  a lista de itens fica vazia e o dropdown mostra "Nenhum sub-nicho encontrado.", mesmo
  sem digitar nada. A página /subnichos (SubnichoManager), que usa a mesma condição
  `isNull(deletedAt)` no server, também estava vazia no mesmo momento — confirmação
  independente de que a causa é estado de dados, não o componente Combobox.
fix: >
  Reativação de dados (não código): UPDATE subnichos SET deleted_at = NULL WHERE id IN
  (4, 5, 12) — reativa nutricionista, odonto e "A categorizar", replicando exatamente o
  que o próprio `createSubnicho` (src/actions/subnicho-actions.ts, branch de reativação
  por nome duplicado soft-deletado) já faz quando o admin recadastra um nome já existente
  removido. Os demais 6 registros ("Teste Import ...", "Novo Sub ...", artefatos de teste
  de importação CSV) permanecem soft-deletados de propósito — reativá-los poluiria o
  combobox com lixo de teste.
verification: >
  Confirmado no navegador real (via automação Chrome, 2026-08-13T14:05:00Z): /pipeline ->
  "Novo lead" -> campo "Sub-nicho" agora lista nutricionista, odonto e "A categorizar";
  digitar "nutri" filtra corretamente para "nutricionista". Fix de dados confirmado
  funcionando end-to-end.
files_changed: []
