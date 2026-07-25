# Sketch Manifest

## Design Direction

Clean/minimal, profissional — inspirado no CRM "Filllo Design" (referência do usuário): sidebar clara fixa, muito espaço em branco, tipografia discreta, sombras quase imperceptíveis, cantos arredondados moderados. Cor de destaque única (azul indigo) para elementos de marca/navegação; o verde do WhatsApp é reservado exclusivamente para a ação de disparo de WhatsApp — a ação nº1 do dia a dia do admin na tela de Leads — para que ela salte aos olhos sem competir com o accent principal.

## Reference Points

- Screenshot enviado pelo usuário: CRM "Filllo Design" (Lead Pipeline em kanban, sidebar clara, cards com avatar, badges de contagem por etapa, botão azul "Create lead", busca com atalho ⌘1).
- Estado atual do próprio app (screenshot de `localhost:3000/leads`): sidebar fixa já existe (decisão herdada do scaffold 01-01), tabela de leads com colunas Nome/Sub-nicho/Etapa/Follow-up/Telefone/Ações.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | sidebar-clean | Como a sidebar clean/minimal deve ficar (ícones só / compacta / espaçada estilo Filllo)? | C (espaçada, estilo Filllo) | [layout, navigation, sidebar] |
| 002 | leads-list-format | Tabela restilizada vs. cards estilo Filllo para a lista de Leads? | null | [layout, leads, table, cards] |
