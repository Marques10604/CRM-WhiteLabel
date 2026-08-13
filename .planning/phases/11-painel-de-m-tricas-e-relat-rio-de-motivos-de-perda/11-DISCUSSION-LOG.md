# Phase 11: Painel de Métricas e Relatório de Motivos de Perda - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-13
**Phase:** 11-painel-de-metricas-e-relatorio-de-motivos-de-perda
**Areas discussed:** Governança de motivoPerda, Definição de "taxa de conversão", Filtro de período, Sub-nicho "A categorizar"

---

## Governança de motivoPerda

| Option | Description | Selected |
|--------|-------------|----------|
| Lista governada | Nova tabela extensível, igual sub-nichos — admin escolhe de uma lista em vez de digitar livre | ✓ |
| Normalização leve | Mantém texto livre; relatório só aplica trim/lowercase ao agrupar | |
| Híbrido | Dropdown com motivos comuns + campo "Outro" livre | |

**User's choice:** Lista governada.

Follow-up: lista vem com valores padrão pré-cadastrados (sim); cadastro de motivo novo acontece na hora, ao mover pra "Perdido" (mesmo padrão de sub-nicho); campo passa a ser obrigatório (antes era opcional, D-03 da Fase 3); lista inicial proposta (Preço, Sem retorno do lead, Concorrente, Sem verba/orçamento, Timing, Outro) aceita como está; existe tela de gestão dedicada `/motivos-perda` espelhando `/subnichos`.

**Notes:** Nenhum lead perdido real existe hoje na base (0 registros), então a lista inicial não pôde ser derivada de dado real — é um ponto de partida editável.

---

## Definição de "taxa de conversão"

| Option | Description | Selected |
|--------|-------------|----------|
| Fechados ÷ total de leads | Inclui leads ainda em aberto no denominador — funil completo | ✓ |
| Fechados ÷ (Fechados + Perdidos) | Só considera leads já decididos, ignora quem ainda está em andamento | |

**User's choice:** Fechados ÷ total de leads.

Follow-up: usuário confirmou que essa métrica deve respeitar o filtro de período mesmo sabendo que isso pode subestimar a taxa perto do "agora" (lead recém-criado ainda não teve tempo de fechar).

**Notes:** Foi oferecida a opção de expandir taxa de conversão também pro agrupamento por sub-nicho (METRICAS-02 hoje só pede contagem) — usuário optou por não expandir agora (ver Deferred Ideas).

---

## Filtro de período

| Option | Description | Selected |
|--------|-------------|----------|
| Sem filtro por enquanto | Sempre mostra tudo desde o início — recomendado dado o volume pequeno atual | |
| Já com filtro de período | Seletor de período desde já | ✓ |

**User's choice:** Já com filtro de período (contra a recomendação inicial).

Follow-up: filtro baseado em `createdAt` (não `stageChangedAt`); presets Últimos 30 / 90 dias / Tudo (não mês atual/anterior); seção de Motivos de Perda é exceção — filtra por `stageChangedAt` em vez de `createdAt`, porque "período" nesse contexto significa quando o lead foi perdido, não quando entrou no funil.

**Notes:** Base real hoje é pequena (23 leads, nenhum fechado/perdido) — usuário decidiu adiantar o filtro mesmo assim, avaliando que evita retrabalho quando o volume crescer.

---

## Sub-nicho "A categorizar"

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar como grupo próprio | Aparece como fatia normal da tabela, junto com sub-nichos reais | ✓ |
| Destacar separado do resto | Linha/alerta à parte, fora da tabela de sub-nichos | |

**User's choice:** Mostrar como grupo próprio.

**Notes:** 21 dos 23 leads reais hoje estão nesse estado — decisão dá visibilidade ao backlog de categorização pendente em vez de escondê-lo.

---

## Claude's Discretion

- Shape exato da tabela `motivos_perda` no schema (colunas, índices)
- Layout visual pixel-level da tela `/relatorios` (fica para `/gsd-ui-phase`)
- Mecanismo de estado do filtro de período (querystring vs client-state)
- Copy exato dos rótulos na tela

## Deferred Ideas

- Taxa de conversão por sub-nicho (não só contagem) — considerado, não incluído no escopo desta fase; pode virar requisito futuro se fizer falta na prática.
