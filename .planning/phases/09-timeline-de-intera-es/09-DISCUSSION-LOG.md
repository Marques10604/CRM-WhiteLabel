# Phase 9: Timeline de Interações - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-08
**Phase:** 9-Timeline de Interações
**Areas discussed:** Relação com o campo Notas, Onde a timeline aparece, Conteúdo do evento automático de WhatsApp, Exclusão/edição de uma entrada da timeline

---

## Relação com o campo Notas

| Option | Description | Selected |
|--------|-------------|----------|
| Notas vira anotação geral, timeline é o histórico | Campo Notas continua como está; timeline é registro separado e cronológico | ✓ |
| Notas é aposentado, timeline vira a única forma de anotar | Campo Notas desaparece, tudo migra para a timeline | |
| Convivem sem relação — timeline só cobre WhatsApp | Notas continua; timeline não cobre nota manual nesta fase | |

**User's choice:** Notas vira anotação geral, timeline é o histórico
**Notes:** Nenhuma migração de conteúdo existente necessária — os dois campos coexistem com papéis distintos.

---

## Onde a timeline aparece

| Option | Description | Selected |
|--------|-------------|----------|
| Nova seção dentro do modal existente | Seção "Histórico" abaixo de Acompanhamento, no modal de editar lead | |
| Modal/tela dedicada de histórico | Componente próprio, mais espaço vertical, passo extra de navegação | ✓ |

**User's choice:** Modal/tela dedicada de histórico

**Follow-up — Como o admin abre essa tela/modal?**

| Option | Description | Selected |
|--------|-------------|----------|
| Botão dentro do modal de editar lead | Só visível depois de já estar editando o lead | |
| Ícone direto na linha da lista/card do pipeline | Acesso rápido, sem abrir o modal de edição primeiro | |
| Os dois | Ícone nas listas/cards E botão dentro do modal de edição | ✓ |

**User's choice:** Os dois
**Notes:** Ícone dedicado ao lado do lápis de editar e do botão WhatsApp em `/leads` e no card do pipeline, mais um botão "Ver histórico" dentro do modal de edição.

---

## Conteúdo do evento automático de WhatsApp

| Option | Description | Selected |
|--------|-------------|----------|
| Só metadado (tipo + data/hora) | Sem guardar conteúdo da mensagem | |
| Metadado + trecho da mensagem enviada | Inclui o texto que estava na caixa no momento do clique | ✓ |

**User's choice:** Metadado + trecho da mensagem enviada

**Follow-up — Texto completo ou truncado?**

| Option | Description | Selected |
|--------|-------------|----------|
| Texto completo | Sem truncamento | ✓ |
| Trecho limitado (ex: 200 caracteres) | Corta após um limite | |

**User's choice:** Texto completo
**Notes:** Mensagens de WhatsApp já são curtas por natureza (templates), sem risco de peso desproporcional no banco.

---

## Exclusão/edição de uma entrada da timeline

| Option | Description | Selected |
|--------|-------------|----------|
| Append-only, sem editar/apagar | Timeline imutável, erro vira outra entrada corrigindo | |
| Soft-delete apenas (sem editar) | Pode remover, não pode corrigir o texto | |
| Editar e apagar (soft-delete) | Mais flexível, só faz sentido para notas manuais | ✓ |

**User's choice:** Editar e apagar (soft-delete)

**Follow-up — Confirmação: a mutabilidade vale só para notas manuais, eventos de WhatsApp ficam imutáveis?**

O usuário pediu explicitamente a recomendação de Claude ("oque voce acha melhor") em vez de escolher entre as opções apresentadas. Claude recomendou manter a assimetria: eventos automáticos de WhatsApp imutáveis (fato do sistema, valor de auditoria), notas manuais editáveis/removíveis (registro subjetivo do admin, correção esperada). O usuário não contestou a recomendação — decisão travada como proposta.

**Notes:** Soft-delete de nota manual segue o padrão já usado em `leads`/`subnichos` (`deletedAt`), precisa entrar em `scripts/guard-no-hard-delete.cjs` no mesmo commit que cria a tabela nova.

---

## Claude's Discretion

- Nome exato da tabela nova (`interacoes` sugerido por `STATE.md`/todo original) e shape das colunas
- Se a captura do evento de WhatsApp é síncrona dentro de `registerWhatsAppContact` ou uma mutação separada
- Layout visual exato da timeline (sem referência específica trazida pelo usuário)
- Se nota manual tem campo de "tipo" categorizado ou só texto livre

## Deferred Ideas

Nenhuma nova ideia de escopo surgiu — discussão ficou inteiramente dentro do domínio já delimitado por `ROADMAP.md`/`REQUIREMENTS.md` (TIMELINE-01/02). Ver `09-CONTEXT.md` §Deferred para a lista completa de todos revisados e não dobrados (ruído de keyword-matching genérico, mesmo padrão já visto em `08-CONTEXT.md`).
