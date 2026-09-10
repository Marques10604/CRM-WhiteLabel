---
created: 2026-09-10T14:30:00.000Z
title: "Ângulo de oferta recomendado no diagnóstico de IA"
area: diagnostico
priority: "Ideia do usuário durante a Fase 23 — fase futura, não urgente"
files:
  - src/lib/ai/diagnostico-prompt.ts
  - src/lib/ai/diagnostico-schema.ts
  - src/components/diagnostico-resultado.tsx
---

## Problem

O diagnóstico de IA da Fase 23 analisa a **viabilidade** de um nicho
(saturação, ticket médio, gatilhos de dor, objeções) e sugere um veredito
(aprofundar / mudar ângulo / abandonar). Ele NÃO diz, de forma direta, **qual
serviço/oferta o usuário deveria vender pra aquele nicho** — o "ângulo de
ataque" fica implícito nos gatilhos de dor e no rascunho de 1ª mensagem, mas
não é um bloco próprio.

O usuário (durante a Fase 23) gostou da ideia de a IA **recomendar um ângulo de
oferta concreto**: pesquisar a web, achar um problema pequeno e específico do
cliente daquele nicho que *parece grande pra ele*, e propor uma oferta que
resolve exatamente esse problema — em vez de o usuário ter que deduzir o ângulo
sozinho a partir das dores listadas.

## Solution

TBD. Dois caminhos possíveis:

1. **Ajuste no `SYSTEM_PROMPT`** (`src/lib/ai/diagnostico-prompt.ts`) + novo bloco
   no `diagnosticoSchema` (ex.: `angulo_oferta_recomendado: { descricao, problema_alvo,
   fonte_url }`) + render no `DiagnosticoResultado`. Menor esforço, entra como
   evolução do diagnóstico existente. Cuidado: a regra anti-genérico tem que valer
   aqui também — o ângulo recomendado NÃO pode ser genérico ("faça marketing de
   conteúdo"), tem que sair de uma dor observada com fonte.

2. **Feature própria numa fase futura** (24+) — se o usuário quiser algo mais rico
   (comparar 2-3 ângulos, estimar esforço/retorno de cada um).

Relaciona com: a estratégia do "mapa de nichos" (v1.7 / Fase 24) e com
`project_ai_integration_future_direction` (IA como copiloto de decisão, não só
gerador de texto). Reavaliar prioridade quando a Fase 23 fechar.
