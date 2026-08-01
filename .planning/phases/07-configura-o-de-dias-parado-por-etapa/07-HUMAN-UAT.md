---
status: done
phase: 07-configura-o-de-dias-parado-por-etapa
source: [07-VERIFICATION.md]
started: 2026-07-31T22:40:48Z
updated: 2026-08-01T16:31:12Z
---

## Current Test

[concluído — 5 passed, 1 issue]

## Tests

### 1. Pipeline pre-save parity (visual)
expected: Com a tabela `configuracoes` no estado padrão (Contatado=5, Novo/Negociação=999999, nenhum save do admin), abrir http://localhost:3000/pipeline e confirmar que nenhum card das colunas Novo e Negociação mostra o rótulo âmbar "Esfriando" — só cards de Contatado podem aparecer destacados. Comportamento visual idêntico ao pré-deploy.
result: PASSED — 22 cards em Novo (todos de 25/07/2026) verificados visualmente do topo ao fim da coluna, nenhum badge "Esfriando"; Contatado e Negociação vazios (0 leads). Testado via browser real em 2026-08-01.

### 2. Config form pre-fill (visual)
expected: Abrir http://localhost:3000/configuracoes e confirmar que o campo Contatado aparece preenchido com 5 e Novo/Negociação aparecem preenchidos com 999999 no primeiro acesso.
result: PASSED — campos carregados com Novo=999999, Contatado=5, Negociação=999999 no primeiro acesso. Testado via browser real em 2026-08-01.

### 3. Validation error UI (interactive)
expected: Digitar 0 (ou um valor negativo) em qualquer campo de /configuracoes e clicar em salvar — mensagem "Mínimo de 1 dia." aparece abaixo do campo; nada é persistido no banco.
result: ISSUE — parcialmente correto. Confirmado que nada é persistido (nenhuma requisição de rede disparada ao clicar Salvar com 0 no campo Novo). MAS a mensagem customizada "Mínimo de 1 dia." nunca aparece: o `<input type="number" min={1}>` tem validação HTML5 nativa e o `<form>` não tem `noValidate`, então o navegador intercepta o submit ANTES do react-hook-form/zodResolver rodar — foca o campo nativamente e mostra sua própria mensagem do browser ("O valor deve ser maior ou igual a 1."), nunca o texto do Zod. Reproduzido de forma consistente (3 tentativas via clique real + verificação de `validationMessage`/`document.activeElement` via JS). Fix sugerido: adicionar `noValidate` no `<form>` de configuracoes-form.tsx para o Zod assumir a validação client-side como documentado em 07-SECURITY.md (T-07-06). Testado via browser real em 2026-08-01. Fix aplicado no quick task 260801-ij4 (noValidate na tag de form de configuracoes-form.tsx) — aguardando reteste humano no navegador para virar PASSED.

### 4. Save success UX (interactive)
expected: Salvar valores válidos (ex.: 2/3/4) em /configuracoes — admin permanece na tela, os campos continuam mostrando os valores salvos, e aparece o toast "Configurações salvas.".
result: PASSED — salvou Novo=2, Contatado=3, Negociação=4; permaneceu em /configuracoes com campos mostrando 2/3/4 e toast "Configurações salvas." visível. Testado via browser real em 2026-08-01.

### 5. Post-save pipeline highlight (visual)
expected: Após salvar novos limites (ex.: Novo=2, Negociação=2), abrir /pipeline e confirmar que cards das colunas Novo e Negociação agora exibem o badge "Esfriando" quando aplicável, respeitando os novos limites configurados.
result: PASSED (parcial, coluna Negociação vazia no banco atual) — após salvar Novo=2, os 22 cards da coluna Novo passaram a exibir o badge âmbar "Esfriando" (leads de 25/07/2026, 7 dias parado >= limite de 2). Negociação está com 0 leads no banco, então não há card para observar visualmente ali, mas usa o mesmo mecanismo `limitesPorEtapa` (07-02) já verificado em runtime pelo 07-VERIFICATION.md. Testado via browser real em 2026-08-01.

### 6. Sidebar active state (visual)
expected: Verificar que o item "Configurações" no sidebar fica com destaque teal (`bg-[#0D9488]/10`, texto `text-[#0D9488]`) quando a rota /configuracoes está ativa.
result: PASSED — confirmado via zoom na screenshot: fundo e texto/ícone em teal quando /configuracoes está ativa. Testado via browser real em 2026-08-01.

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- **Item 3 (Validation error UI)**: mensagem customizada Zod "Mínimo de 1 dia." nunca é exibida porque a validação HTML5 nativa (`min={1}` sem `noValidate` no `<form>`) intercepta o submit antes do react-hook-form rodar. Comportamento de segurança (nada persiste) está correto; só a UX da mensagem diverge do especificado. Fix sugerido: `<form noValidate ...>` em `configuracoes-form.tsx`. Status: fix aplicado (quick 260801-ij4), reteste pendente.
