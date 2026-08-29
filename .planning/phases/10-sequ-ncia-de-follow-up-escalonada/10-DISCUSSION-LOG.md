# Phase 10: Sequência de Follow-up Escalonada - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 10-sequência-de-follow-up-escalonada
**Areas discussed:** Avanço e reset da posição, Configuração da sequência, Onde a data sugerida aparece, Templates de reforço de valor (SEQ-03), Escopo (global vs. sub-nicho), Base de cálculo, Fim da sequência

---

## Avanço e reset da posição

| Option | Description | Selected |
|--------|-------------|----------|
| Automático no clique de WhatsApp | Cada clique em "Abrir WhatsApp" tipo follow_up avança a posição — reaproveita registerWhatsAppContact | ✓ |
| Ação manual separada | Botão dedicado "Marcar reabordado" | |
| Você decide | Critério do planner | |

**User's choice:** Automático no clique de WhatsApp
**Notes:** Recomendado por reaproveitar o mesmo ponto de extensão que já incrementa contactAttempts.

| Option | Description | Selected |
|--------|-------------|----------|
| Ao voltar pra "Novo" | Sequência reinicia do zero ao arrastar o lead de volta pra Novo | ✓ |
| Ao fechar/perder o lead | Reseta ao sair do funil ativo | |
| Nunca reseta automaticamente | Posição fica congelada | |
| Reseta em ambos os casos | Volta pra Novo OU fecha/perde | |

**User's choice:** Ao voltar pra "Novo"
**Notes:** Resolve a decisão de produto que ficava em aberto desde `STATE.md` §Blockers/Concerns (sinalizada na Fase 9).

---

## Configuração da sequência

| Option | Description | Selected |
|--------|-------------|----------|
| Reaproveitar /configuracoes | Mesma tela singleton da Fase 7 | ✓ |
| Tela nova dedicada | Rota própria (ex. /sequencia) | |

**User's choice:** Reaproveitar /configuracoes

| Option | Description | Selected |
|--------|-------------|----------|
| Lista dinâmica (adicionar/remover) | Admin adiciona quantos intervalos quiser | ✓ |
| Número fixo de campos | Ex.: sempre 3 campos | |

**User's choice:** Lista dinâmica (adicionar/remover)
**Notes:** Mesmo espírito de "sem teto artificial" da Fase 7 (D-03 daquela fase).

---

## Onde a data sugerida aparece

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard de follow-ups + card do pipeline | Mesmos lugares onde followUpDate já aparece | ✓ |
| Só no dashboard de follow-ups | Menos superfície | |
| Você decide | Critério do planner | |

**User's choice:** Dashboard de follow-ups + card do pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Sugestão separada, só informativa | followUpDate continua sendo o campo real editável; sugestão é exibida ao lado | ✓ |
| Substitui/preenche followUpDate automaticamente | Ao avançar na sequência, followUpDate é sobrescrito | |

**User's choice:** Sugestão separada, só informativa

---

## Templates de reforço de valor (SEQ-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Reaproveitar "prova_valor" existente | Tipo já existe em templates.tipo, sem migração | ✓ |
| Tipo novo dedicado (ex.: "reabordagem") | Novo valor no enum, exige migração | |

**User's choice:** Reaproveitar "prova_valor" existente

---

## Escopo (global vs. sub-nicho)

| Option | Description | Selected |
|--------|-------------|----------|
| Uma sequência global | Mesmos intervalos pra todo mundo | ✓ |
| Sequência por sub-nicho | Cada sub-nicho tem sua própria sequência | |

**User's choice:** Uma sequência global

---

## Base de cálculo

| Option | Description | Selected |
|--------|-------------|----------|
| Data da última interação registrada | Usa a timeline da Fase 9 (interacoes) | ✓ |
| Data do followUpDate atual | Soma o intervalo em cima do followUpDate salvo | |

**User's choice:** Data da última interação registrada

---

## Fim da sequência

| Option | Description | Selected |
|--------|-------------|----------|
| Para de sugerir data nova | Sistema simplesmente não sugere mais após o último degrau | ✓ |
| Repete o último intervalo indefinidamente | Continua sugerindo no mesmo intervalo pra sempre | |

**User's choice:** Para de sugerir data nova

---

## Claude's Discretion

- Shape exato do armazenamento da lista de intervalos (nova tabela vs. coluna JSON/serializada)
- Shape exato de `sequenciaPosicao` no lead
- Layout exato do badge/indicador visual da data sugerida
- Mecanismo de migração (ALTER TABLE manual vs. drizzle-kit push)
- Implementação exata do gate Inbound (ORIGEM-03) — requisito travado pelo ROADMAP, não uma área de discussão aberta

## Deferred Ideas

Nenhuma nova ideia de escopo surgiu — "sequência por sub-nicho" foi avaliada e descartada explicitamente (ver Escopo acima), não fica pendente para depois.
