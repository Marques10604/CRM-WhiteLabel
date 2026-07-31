# Phase 7: Configuração de Dias-Parado por Etapa - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-31
**Phase:** 07-configuração-de-dias-parado-por-etapa
**Areas discussed:** Todo pendente (fold check), Acesso à tela, Feedback ao salvar, Validação dos campos

---

## Todo pendente (fold check)

| Option | Description | Selected |
|--------|-------------|----------|
| Manter adiada | Segue fora de escopo da Phase 7; fica registrada em Deferred Ideas do CONTEXT.md | ✓ |
| Dobrar pra Phase 7 | Expande o escopo desta fase pra incluir a sequência escalonada de follow-up | |

**User's choice:** Manter adiada
**Notes:** Confirma decisão já registrada em `PROJECT.md` — "Sequência de follow-up escalonada com templates de valor" fica para v1.3+.

---

## Acesso à tela

| Option | Description | Selected |
|--------|-------------|----------|
| Novo item no sidebar | Adiciona "Configurações" com ícone de engrenagem (Settings do lucide-react) ao final do menu, depois de Lixeira | ✓ |
| Só URL direta | Sem item no sidebar — acesso digitando /configuracoes na barra de endereço | |

**User's choice:** Novo item no sidebar
**Notes:** Consistente com os outros 7 itens fixos já existentes em `app-sidebar.tsx`.

---

## Feedback ao salvar

| Option | Description | Selected |
|--------|-------------|----------|
| Fica na tela + toast de confirmação | Mostra "Configurações salvas" e os campos continuam visíveis com os novos valores | ✓ |
| Redireciona pro /pipeline | Salva e já leva de volta ao board, pra ver o destaque "esfriando" aplicado na hora | |

**User's choice:** Fica na tela + toast de confirmação
**Notes:** Permite ajuste imediato se necessário, sem perder contexto da tela de configuração.

---

## Validação dos campos

| Option | Description | Selected |
|--------|-------------|----------|
| Mínimo 1, sem máximo fixo | Bloqueia 0 ou negativo; sem teto artificial, admin decide até quantos dias faz sentido | ✓ |
| Faixa fixa (ex: 1 a 30 dias) | Mesmo mínimo de 1, mas trava um teto pra evitar valores absurdos | |

**User's choice:** Mínimo 1, sem máximo fixo
**Notes:** Nenhuma.

---

## Claude's Discretion

- Mecanismo de armazenamento da configuração (schema Drizzle) — decisão técnica sem preferência de UX manifestada.
- Layout exato do formulário em `/configuracoes` — segue padrões já estabelecidos no projeto.
- Validação adicional além do mínimo de 1 para "Novo" e "Negociação" — segue padrão react-hook-form + Zod já usado.

## Deferred Ideas

- Nenhuma nova ideia de escopo surgiu nesta discussão. O único item avaliado (sequência de follow-up escalonada) já estava formalmente adiado em `PROJECT.md` e foi reconfirmado como fora de escopo.
