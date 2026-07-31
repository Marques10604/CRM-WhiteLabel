# Phase 7: Configuração de Dias-Parado por Etapa - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin define e ajusta, sem depender de código, quantos dias um lead pode ficar parado em cada etapa do funil (Novo, Contatado, Negociação) antes de ser destacado como "esfriando". Isso generaliza o hardcode atual em `src/app/pipeline/page.tsx` (só `contatado`, 5 dias fixo) para as 3 etapas, cada uma com seu próprio limite configurável via uma nova tela `/configuracoes`.

</domain>

<decisions>
## Implementation Decisions

### Acesso à tela
- **D-01:** Novo item "Configurações" no sidebar (`src/components/app-sidebar.tsx`), com ícone de engrenagem (`Settings` do `lucide-react`), adicionado ao final do `NAV_ITEMS` array, depois de "Lixeira". Segue o mesmo padrão visual/estrutural dos 7 itens existentes (sem tratamento especial).

### Feedback ao salvar
- **D-02:** Ao salvar, o admin permanece na tela `/configuracoes` (sem redirecionamento) e vê um toast de confirmação (ex: "Configurações salvas") via `sonner`, consistente com o padrão de feedback já usado no projeto (templates, sub-nichos). Os campos continuam visíveis com os valores recém-salvos, permitindo ajuste imediato se necessário.

### Validação dos campos
- **D-03:** Cada campo numérico de dias-parado (Novo, Contatado, Negociação) tem mínimo de 1 dia — 0 ou negativo é bloqueado, pois destacaria leads como "esfriando" instantaneamente. Sem teto máximo artificial — o admin decide livremente até quantos dias faz sentido por etapa.
- **D-04:** No primeiro acesso à tela, antes de qualquer alteração do admin, o campo de Contatado já aparece pré-preenchido com 5 (valor atual hardcoded), e o comportamento de destaque "esfriando" no pipeline permanece idêntico ao estado pré-deploy desta fase até o admin salvar novos valores (Success Criteria #3 do ROADMAP.md).

### Claude's Discretion
- Mecanismo de armazenamento da configuração (nova tabela no schema Drizzle vs. outra abordagem) — decisão técnica do planner/researcher, não teve preferência de UX manifestada pelo usuário.
- Layout exato do formulário em `/configuracoes` (3 campos numéricos rotulados por etapa) — estrutura simples, sem necessidade de componentes visuais além dos já usados no projeto (inputs, labels, botão salvar).
- Se "Novo" e "Negociação" precisam de validação adicional além do mínimo de 1 (ex: mensagens de erro específicas) — seguir o padrão de validação já estabelecido em outros formulários do projeto (react-hook-form + Zod).

### Deferred Ideas Considered and Kept Deferred
- Todo pendente "Sequência de follow-up escalonada com templates de valor" (`.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`, match score 0.6) foi avaliado e **mantido fora de escopo** desta fase, confirmando a decisão já registrada em `PROJECT.md` (v1.3+). Não dobrado para Phase 7.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Lógica atual de "esfriando" (a ser generalizada)
- `src/app/pipeline/page.tsx` — implementação atual hardcoded: só etapa `contatado`, 5 dias fixo via `differenceInDays`, guard contra `stageChangedAt` nulo (comentário de cabeçalho documenta D-06/D-07 da Fase 3)

### Navegação
- `src/components/app-sidebar.tsx` — `NAV_ITEMS` array com os 7 itens atuais (padrão a seguir para o novo item "Configurações")

### Requisitos e roadmap
- `.planning/ROADMAP.md` §Phase 7 — Success Criteria completos, depende da Fase 3 (Sales Pipeline & Funnel View)
- `.planning/PROJECT.md` — seção "Active" do milestone v1.2, requisitos CONFIG-01/CONFIG-02

No external specs beyond the above — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sonner` (toast) — já usado no projeto para confirmações de salvamento (templates, sub-nichos); reutilizar para "Configurações salvas"
- Padrão de formulário com react-hook-form + Zod — já estabelecido em outros formulários (lead form, template editor)

### Established Patterns
- `NAV_ITEMS` em `app-sidebar.tsx` é um array `const` tipado com `href`, `label`, `icon` — adicionar uma nova entrada segue o mesmo formato, sem lógica condicional extra
- Cálculo server-side de "esfriando" acontece em `src/app/pipeline/page.tsx` (Server Component), não no client — a generalização deve manter esse padrão (buscar config no servidor, computar `esfriandoLeadIds` ali)

### Integration Points
- `src/app/pipeline/page.tsx` — ponto único de integração onde o cálculo hardcoded de "esfriando" precisa passar a ler a configuração por etapa em vez do literal `stage === "contatado"` + `>= 5`
- `src/components/app-sidebar.tsx` — ponto de integração para o novo item de navegação

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual específica trazida pelo usuário além das decisões acima — layout do formulário fica a critério do planner, seguindo os padrões já estabelecidos no projeto (inputs numéricos simples, um por etapa).

</specifics>

<deferred>
## Deferred Ideas

Nenhuma nova ideia de escopo surgiu durante esta discussão — o único item avaliado (sequência de follow-up escalonada) já estava formalmente adiado em `PROJECT.md` e foi confirmado como fora de escopo (ver Decisions acima).

### Reviewed Todos (not folded)
- **Sequência de follow-up escalonada com templates de valor** (`.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`) — avaliado nesta sessão (match score 0.6), mantido fora de escopo. Pertence a v1.3+, conforme já registrado em `PROJECT.md`.

</deferred>

---

*Phase: 07-configuração-de-dias-parado-por-etapa*
*Context gathered: 2026-07-31*
