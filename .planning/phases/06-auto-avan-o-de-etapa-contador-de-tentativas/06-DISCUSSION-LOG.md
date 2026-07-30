# Phase 6: Auto-avanço de Etapa + Contador de Tentativas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30 (iniciada) / 2026-07-31 (concluída — sessão retomada via checkpoint)
**Phase:** 06-auto-avanço-de-etapa-contador-de-tentativas
**Areas discussed:** O que conta como tentativa, Exibição do contador no card, Texto do toast de auto-avanço

---

## Todo pendente (cross-reference)

| Todo | Score | Decisão |
|------|-------|---------|
| `2026-07-21-sequencia-follow-up-escalonada.md` | 0.6 (keywords genéricas) | Não dobrado — mantido pendente, fora do escopo (agendamento de datas, não auto-avanço/contador) |

---

## O que conta como "tentativa"

| Pergunta | Opções | Selecionado |
|---|---|---|
| O que exatamente conta como 1 tentativa (WA-08)? | Só o clique final em "Abrir WhatsApp" / Já conta ao abrir o preview | **Só o clique final em "Abrir WhatsApp"** ✓ |
| Cliques múltiplos na mesma sessão do modal (trocando tipo de template) contam separado? | Sim, cada clique conta / Não, só a 1ª vez conta | **Sim, cada clique conta** ✓ |
| Conta quando o modal abre automaticamente (pós-criação de lead / pós-importação)? | Sim, sempre conta / Não, só cliques manuais | **Sim, sempre conta** ✓ |
| Contador acumula a vida toda do lead ou zera por etapa? | Acumula a vida toda / Zera a cada mudança de etapa | **Acumula a vida toda do lead** ✓ |

**Notas:** Nenhuma pergunta adicional após a 4ª — usuário confirmou estar pronto pra próxima área.

---

## Exibição do contador no card

| Pergunta | Opções | Selecionado |
|---|---|---|
| Formato visual do contador no `PipelineLeadCard`? | Ícone + número / Só número / Badge colorido | **Ícone + número** ✓ |
| Contador sempre visível ou só quando > 0? | Só quando > 0 / Sempre visível, mesmo com 0 | **Só quando > 0** ✓ |

**Notas:** Sessão pausada aqui em 2026-07-30 (usuário pediu para dormir e continuar no dia seguinte) — checkpoint salvo e retomado com sucesso em 2026-07-31, sem perda de decisões.

---

## Texto do toast de auto-avanço

| Pergunta | Opções | Selecionado |
|---|---|---|
| Texto do toast ao avançar Novo→Contatado automaticamente? | Genérico igual ao drag-and-drop ("Lead movido para Contatado.") / Personalizado com o nome do lead / Explicando que foi automático | **Personalizado com o nome do lead** ✓ |

**User's choice:** "{Nome} avançou para Contatado."
**Notes:** Escolhido em vez do padrão genérico já usado no drag-and-drop porque o auto-avanço pode acontecer em telas com múltiplos leads visíveis (dashboard, lista), onde o nome dá contexto que o board (visual, 1 card por vez) já dispensa.

---

## Claude's Discretion

- Mecanismo técnico exato de disparo da mutação de servidor no clique do link "Abrir WhatsApp" (hoje um `<a>` puro, sem nenhuma chamada de servidor).
- Nome/shape do novo campo de schema para o contador de tentativas e estratégia de migração (default 0 vs. nullable).
- Reuso/extensão de `updateLeadStage()` vs. nova função dedicada para a lógica combinada de auto-avanço + incremento.
- Detalhes exatos de CSS/spacing do ícone+número do contador.
- Interpretação de que o auto-avanço considera o tipo de template selecionado *no momento do clique* (não o `defaultTipo` de abertura do modal) — leitura direta do WA-06, não perguntada por ser inequívoca a partir do texto do requisito.

## Deferred Ideas

- Nenhuma nova ideia de escopo surgiu durante esta discussão.
- `2026-07-21-sequencia-follow-up-escalonada.md` — revisado (ver Todo pendente acima), permanece fora de escopo.
