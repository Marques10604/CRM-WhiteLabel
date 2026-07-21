# Phase 3: Sales Pipeline & Funnel View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 3-sales-pipeline-funnel-view
**Areas discussed:** Etapas do board (Fechado/Perdido), Critério de esfriando, Conteúdo do card no board, Contagem por etapa, Clicar no card, Filtros no board, Onde o board vive, Coluna vazia / scroll

---

## Etapas do board (Fechado/Perdido)

| Option | Description | Selected |
|--------|-------------|----------|
| Separar agora | Board com 5 colunas, migra os leads existentes | ✓ |
| Manter combinado por enquanto | Board com 4 colunas como já planejado | |
| Você decide | Discricionário | |

**User's choice:** Separar agora — board com 5 colunas (Novo, Contatado, Negociação, Fechado, Perdido). Reverte D-10 de `01-CONTEXT.md`.
**Notes:** Query ao vivo no banco confirmou apenas 2 leads em `fechado_perdido` — risco de migração baixo.

| Option | Description | Selected |
|--------|-------------|----------|
| Fechado | Os 2 leads existentes migram para Fechado por padrão | ✓ |
| Perdido | Os 2 leads existentes migram para Perdido por padrão | |
| Você decide | Discricionário | |

**User's choice:** Fechado (admin reajusta manualmente os que forem perda).

| Option | Description | Selected |
|--------|-------------|----------|
| Sem motivo | Só move o card, sem campo extra | |
| Pedir motivo ao mover | Modal/campo pequeno pedindo motivo ao mover pra Perdido | ✓ |
| Você decide | Discricionário | |

**User's choice:** Pedir motivo ao mover.

| Option | Description | Selected |
|--------|-------------|----------|
| Campo dedicado | Novo campo `motivoPerda` no schema | ✓ |
| Anexar ao Notas | Sem mudança de schema, concatena ao campo Notas | |

**User's choice:** Campo dedicado (`motivoPerda`, texto, nullable).

| Option | Description | Selected |
|--------|-------------|----------|
| Opcional | Modal aparece mas não bloqueia confirmação | ✓ |
| Obrigatório | Não deixa mover sem preencher | |

**User's choice:** Opcional.

---

## Critério de "esfriando"

| Option | Description | Selected |
|--------|-------------|----------|
| Última mudança de etapa | Timestamp de entrada na etapa, mais simples | ✓ |
| Última edição do lead | Qualquer alteração, incluindo notas | |
| Você decide | Discricionário | |

**User's choice:** Última mudança de etapa.

| Option | Description | Selected |
|--------|-------------|----------|
| 5 dias | Prazo curto, sem alarme falso demais | ✓ |
| 7 dias | Uma semana parado | |
| 3 dias | Mais sensível | |
| Você decide | Discricionário | |

**User's choice:** 5 dias.

---

## Conteúdo do card no board

| Option | Description | Selected |
|--------|-------------|----------|
| Nome + sub-nicho + follow-up | O essencial, sem poluir o card | ✓ |
| Tudo | Nome, sub-nicho, valor, follow-up, canal | |
| Só nome | Minimalista | |
| Você decide | Discricionário | |

**User's choice:** Nome + sub-nicho + follow-up.

| Option | Description | Selected |
|--------|-------------|----------|
| Borda/destaque colorido | Chama atenção sem precisar ler texto | ✓ |
| Ícone + texto pequeno | Ícone de alerta com texto tipo "5 dias parado" | |
| Você decide | Discricionário | |

**User's choice:** Borda/destaque colorido.

---

## Contagem por etapa

| Option | Description | Selected |
|--------|-------------|----------|
| Só quantidade | Mantém escopo v1 travado no REQUIREMENTS.md | ✓ |
| Quantidade + soma de valor | Adianta PIPE-V2-01 | |
| Você decide | Discricionário | |

**User's choice:** Só quantidade.

---

## Clicar no card

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, abre o modal | Reaproveita lead-form-dialog.tsx, consistente com D-07 | ✓ |
| Não abre nada | Só drag-and-drop muda etapa | |

**User's choice:** Sim, abre o modal.

---

## Filtros no board

| Option | Description | Selected |
|--------|-------------|----------|
| Sem filtro por enquanto | Board sempre mostra tudo agrupado por etapa | ✓ |
| Reaproveitar filtro de sub-nicho | Só o filtro de sub-nicho | |
| Todos os filtros da lista | Sub-nicho + follow-up range | |

**User's choice:** Sem filtro por enquanto.

---

## Onde o board vive

| Option | Description | Selected |
|--------|-------------|----------|
| Rota própria | Ex: /pipeline, item próprio na sidebar | ✓ |
| Toggle na mesma tela | Botão "Lista / Board" na tela de leads | |

**User's choice:** Rota própria.

---

## Coluna vazia / scroll

| Option | Description | Selected |
|--------|-------------|----------|
| Texto discreto | "Nenhum lead nessa etapa", sem CTA | ✓ |
| Coluna vazia, sem texto | Só cabeçalho com contagem 0 | |

**User's choice:** Texto discreto.

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll horizontal | Colunas mantêm largura mínima, tela rola | ✓ |
| Colunas encolhem | Todas visíveis, encolhendo largura | |

**User's choice:** Scroll horizontal.

---

## Claude's Discretion

- Exact column widths/spacing and column ordering beyond the fixed 5-stage sequence
- Precise shade of the "esfriando" highlight color
- `motivoPerda` modal's exact copy/wording
- Card micro-layout (icon choices, spacing)

## Deferred Ideas

- Soma de valor por etapa (roll-up) — stays `PIPE-V2-01`, not pulled into this phase
- Filtros no board (sub-nicho/follow-up) — explicitly deferred, board stays unfiltered for v1
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — reviewed, matched by keyword search, but belongs to Phase 4 — not folded into this phase
