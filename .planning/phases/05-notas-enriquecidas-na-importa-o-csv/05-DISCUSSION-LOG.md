# Phase 5: Notas Enriquecidas na Importação CSV - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-29
**Phase:** 05-notas-enriquecidas-na-importa-o-csv
**Areas discussed:** Seleção de colunas múltiplas (UI), Formatação do texto concatenado, Ordem das colunas concatenadas, Convivência com o mapeamento 1-pra-1 de notas

---

## Seleção de colunas múltiplas (UI)

| Option | Description | Selected |
|--------|-------------|----------|
| Checkboxes numa lista separada | Nova seção abaixo do mapeamento 1-pra-1 existente | ✓ |
| Multi-select no próprio campo Notas | Trocar o Select existente por multi-select | |
| Detecção automática por nome de coluna | Reconhece score/sinal_dor/trecho_dor/observacao automaticamente | |

**User's choice:** Checkboxes numa lista separada.

| Option | Description | Selected |
|--------|-------------|----------|
| Todas as colunas ainda não mapeadas | Só colunas livres de qualquer campo fixo | ✓ |
| Todas as colunas do CSV, sem restrição | Mesmo já mapeadas em outro campo | |

**User's choice:** Todas as colunas ainda não mapeadas.

| Option | Description | Selected |
|--------|-------------|----------|
| Some da tela (não renderiza a seção) | Sem colunas disponíveis → some a seção | ✓ |
| Mostra mensagem de vazio | Sempre renderiza, com texto de vazio | |

**User's choice:** Some da tela.

| Option | Description | Selected |
|--------|-------------|----------|
| 'Colunas extras para notas (opcional)' | Título direto | ✓ |
| 'Adicionar às notas: score, sinal de dor...' | Título específico ao caso do cowork | |

**User's choice:** 'Colunas extras para notas (opcional)'.
**Notes:** Nenhuma ressalva adicional.

---

## Formatação do texto concatenado

| Option | Description | Selected |
|--------|-------------|----------|
| Com rótulo neutro: 'Score: 8' | Nome da coluna como rótulo, sem explicar escala | ✓ |
| Só os valores, sem rótulo | Valores concatenados sem indicar origem | |

**User's choice:** Com rótulo neutro — mas antes de decidir, o usuário fez uma pergunta de esclarecimento sobre o que o `score` representa.
**Notes:** O usuário explicou em detalhe a fórmula do score do `lead-hunter` (`lead_logic.py`, Camada 2): soma de 0-6 pontos (nota do Google 0-2pts, quantidade de reviews 0-3pts, ausência de site +1pt) — um proxy de visibilidade/volume, NÃO de dor real. `dor_confirmada` (texto de review mencionando demora/não resposta) pesa mais que score alto na recomendação final. Essa explicação foi confirmada pelo usuário e motivou o rótulo neutro (D-05) — evita sugerir "chance de fechar" no campo de notas.

| Option | Description | Selected |
|--------|-------------|----------|
| Quebra de linha | Cada coluna extra em linha própria | ✓ |
| Separador ' \| ' na mesma linha | Tudo numa linha só | |

**User's choice:** Quebra de linha.

| Option | Description | Selected |
|--------|-------------|----------|
| Omite a linha inteira daquela coluna | Célula vazia → sem linha no texto | ✓ |
| Mostra com marcador de vazio | 'Campo: (não informado)' | |

**User's choice:** Omite a linha inteira.

| Option | Description | Selected |
|--------|-------------|----------|
| Nome exato do cabeçalho do CSV | Sem tradução, funciona pra qualquer CSV | ✓ |
| Nome amigável fixo | Tabela de tradução pros 4 nomes do cowork | |

**User's choice:** Nome exato do cabeçalho do CSV.

---

## Ordem das colunas concatenadas

| Option | Description | Selected |
|--------|-------------|----------|
| Ordem que aparecem no arquivo CSV | Esquerda→direita, previsível | ✓ |
| Ordem em que o admin marcou os checkboxes | Controle manual via ordem de clique | |

**User's choice:** Ordem que aparecem no arquivo CSV.

| Option | Description | Selected |
|--------|-------------|----------|
| Ordem do CSV é suficiente, sem ajuste manual | Sem drag-and-drop | ✓ |
| Permite reordenar manualmente | Controle de arrastar/subir-descer | |

**User's choice:** Ordem do CSV é suficiente — mas na primeira formulação da pergunta, o usuário não entendeu e confundiu com o backlog item "auto-avançar etapa ao clicar em Abrir WhatsApp" (v1.2+, não relacionado). Reformulada com exemplo concreto do texto final de notas, aí sim respondida corretamente.

| Option | Description | Selected |
|--------|-------------|----------|
| Texto de resumo abaixo dos checkboxes | Feedback imediato no passo de mapeamento | ✓ |
| Só na tabela de prévia (coluna Notas) | Só confere ao avançar de tela | |

**User's choice:** Texto de resumo abaixo dos checkboxes.

---

## Convivência com o mapeamento 1-pra-1 de notas

| Option | Description | Selected |
|--------|-------------|----------|
| Concatena tudo junto (notas + extras) | Nada se perde | ✓ |
| Colunas extras substituem o campo Notas | Mapeamento 1-pra-1 ignorado se houver extras | |

**User's choice:** Concatena tudo junto.

| Option | Description | Selected |
|--------|-------------|----------|
| Sem rótulo, só o texto puro primeiro | Evita 'Notas: minha nota' redundante | ✓ |
| Com rótulo 'Notas: ...' também | Consistência visual total | |

**User's choice:** Sem rótulo, só o texto puro primeiro.
**Notes:** O comportamento para "nem Notas mapeada, nem extras marcadas" foi confirmado sem pergunta formal (única opção real: mantém `CSV_DEFAULTS.notas` atual, sem mudança — compatibilidade IMPORT-05).

---

## Claude's Discretion

- Nome/estrutura exata do novo tipo/estado para "colunas extras marcadas" em `src/lib/csv-import.ts`.
- Shape exato da função de concatenação (nova função vs. lógica inline em `mapCsvRows`).
- Layout/CSS exato do texto de resumo (D-09) — só a posição ("abaixo dos checkboxes") foi especificada.

## Deferred Ideas

Durante o fechamento, o usuário compartilhou `C:\Users\Vencedor\Desktop\Projetos\LEAD_HUNTER_SPEC_PARA_CRM.md` — spec técnica completa da skill `lead-hunter` (schema real de 19 colunas, muito além dos 4 exemplos de `REQUIREMENTS.md`). A seção 7 do doc ("sugestões, não implementadas") levantou ideias fora do escopo desta fase:

- Reaproveitar `link_whatsapp` do CSV em vez de reconstruir a partir do telefone.
- Badge visual para `whatsapp_provavel_fixo` (aviso de número provavelmente fixo).
- Sinalização de risco para `match_verificacao = divergente`.
- Deduplicação por `nome + endereco` em vez de/além de telefone (conflita com D-06/D-07 da Fase 2, precisa de discussão própria).
- Fila de priorização ordenada por `sinal_dor` → `score` (relacionado a `IMPORT-V2-01` já em `REQUIREMENTS.md`).

Nenhuma dessas foi decidida ou implementada nesta fase — todas ficam registradas em `05-CONTEXT.md` §Deferred Ideas para referência futura.
