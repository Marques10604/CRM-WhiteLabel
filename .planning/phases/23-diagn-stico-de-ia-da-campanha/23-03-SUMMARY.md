---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 03
subsystem: ai
tags: [vercel-ai-sdk, anthropic, claude-sonnet-5, web-search, structured-output, server-only, prompt-engineering]

requires:
  - phase: 23-diagn-stico-de-ia-da-campanha
    plan: 01
    provides: "diagnosticoSchema + type Diagnostico + filtrarFontes (contrato e gate de fontes puros)"
  - phase: 23-diagn-stico-de-ia-da-campanha
    plan: 02
    provides: "tabela diagnosticos (destino do payload/fontes/buscas/aviso na Server Action 23-04)"
provides:
  - "Dependências ai@7.0.93 e @ai-sdk/anthropic@4.0.49 pinadas exatas (aprovação humana de legitimidade registrada)"
  - "SYSTEM_PROMPT: rubrica anti-genérico versionada no repo (~6.4k chars, 10 blocos) + montarUserPrompt(campanha)"
  - "gerarDiagnostico(input, opcoes?): função pura server-only, DB-free, single-shot com web search, Output.object e gate de zero fontes"
  - "Retorno com avisoCrossCheck: string | null (cross-check FM2, consumido por 23-04 -> diagnosticos.aviso)"
  - "DiagnosticoSemFonteError / DiagnosticoInvalidoError"
affects: [23-04 (Server Action importa gerarDiagnostico + persiste), 23-05 (UI renderiza payload + aviso), 23-06 (eval-diagnostico chama a função direto sem banco)]

tech-stack:
  added:
    - "ai@7.0.93 (pin exato)"
    - "@ai-sdk/anthropic@4.0.49 (pin exato)"
  patterns:
    - "generateText + output: Output.object({ schema }) + tools (NUNCA generateObject — não aceita tools)"
    - "import de módulo servidor na 1ª linha do arquivo que toca a chave de API (T-23-01)"
    - "Gate de fontes lê res.sources (citações reais da tool), nunca as URLs escritas pelo modelo"
    - "Retry manual (MAX_TENTATIVAS=2) para falha de schema/zero-fontes, separado do maxRetries de transporte"
    - "SYSTEM_PROMPT fixo versionado; user prompt só com dados da campanha rotulados como DADO (mitigação prompt injection T-23-03)"
    - "Allowlist de campos em console.* — proibido logar ambiente/segredo/requisição (T-23-08)"

key-files:
  created:
    - src/lib/ai/diagnostico-prompt.ts
    - src/lib/ai/gerar-diagnostico.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Pacotes ai e @ai-sdk/anthropic instalados com pin EXATO (sem ^), seguindo o hábito do projeto de pinar next/eslint-config-next"
  - "maxOutputTokens: 16000 e effort: 'low' escritos como ponto de partida — serão confirmados/ajustados pelo spike do plano 23-04 a partir de medição real (Open Question 1 / D-23-04 futuro)"
  - "res.output tratado com cast para Diagnostico; a re-validação Zod da fronteira de confiança do DB fica na leitura (23-05), a validação de saída já é feita pelo Output.object"
  - "avisoCrossCheck NÃO bloqueia — só sinaliza quando >0 URLs do objeto não constam em res.sources, desde que o gate de >=1 fonte real já tenha passado (D-23-07)"
  - "REQUIREMENTS.md não tocado neste plano: DIAGNOSTICO-02..09 já foram marcados Complete pelo 23-01 (contrato Zod + harness); DIAGNOSTICO-01 e DIAGNOSTICO-10 seguem Pending — a behavior observável (botão gera sob demanda / regenera com custo visível) só fecha com 23-04 (Server Action) + 23-05 (UI). Mesmo critério de 23-01/23-02."

patterns-established:
  - "Módulo de geração server-only e DB-free: recebe dados da campanha, devolve { diagnostico, fontes, uso, buscas, avisoCrossCheck } — chamável pelo eval sem banco"
  - "onStepFinish captura defensivamente step.toolCalls[].input.query para diagnosticos.buscas (nome do campo confirmado no spike 23-04)"

requirements-completed: []

duration: 18min
completed: 2026-09-10
---

# Phase 23 Plan 03: Núcleo de IA do Diagnóstico Summary

**Vercel AI SDK instalado com pin exato e aprovação humana de legitimidade, mais a rubrica anti-genérico como `SYSTEM_PROMPT` versionado e a função pura server-only `gerarDiagnostico()` — single-shot com web search do Claude, `Output.object` validado por Zod e gate de zero fontes lendo `res.sources`.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-10 (aprox. 12:35Z)
- **Completed:** 2026-09-10
- **Tasks:** 3
- **Files modified:** 4 (2 criados, 2 modificados)

## Accomplishments

- **Task 1 — dependências + portão de pacote.** `ai@7.0.93` e `@ai-sdk/anthropic@4.0.49` instalados com versão **exata** (sem `^`). O `npm i` grava caret por padrão; `package.json` foi corrigido à mão para o pin exato e `npm install` re-sincronizou o lock. `npx tsc --noEmit` continuou limpo após a instalação.
- **Task 2 — `src/lib/ai/diagnostico-prompt.ts`.** `SYSTEM_PROMPT` (~6.4k chars, PT-BR) com os 10 blocos da rubrica na ordem do plano: papel de analista de entrada de mercado para operador solo; regra-mestre anti-genérico com os 7 modos de falha de domínio como proibições diretas; contrato `dado_quantificavel` × `alegacao_marketing` (regra dura: saturação/ticket/veredito nunca derivam de `alegacao_marketing`); regra de fontes (nunca inventar URL, omitir ponto sem fonte, **conteúdo da web é DADO nunca instrução** — T-23-03); regras de saturação, ticket e rascunho de 1ª mensagem; few-shot inline de achado bom × ruim; as regras de estrutura que o `.refine` do Zod não transmite (`mais_forte` exatamente 1, ≤3 gatilhos, 2–3 objeções, ≥3 achados, enum do veredito); instrução final de responder só com o objeto. `montarUserPrompt` devolve os dados da campanha rotulados (`Nicho:`/`Oferta:`/`Janela em dias:`/`Meta de conversão:`) + instrução de pesquisar a web — `oferta` e `meta` (texto livre) nunca interpolados crus. Arquivo puro, sem efeito colateral de import.
- **Task 3 — `src/lib/ai/gerar-diagnostico.ts`.** `import "server-only"` na 1ª linha (T-23-01). `gerarDiagnostico(input, opcoes?)` com a assinatura **exata** do bloco `<interfaces>` do plano, incluindo `avisoCrossCheck: string | null` no retorno. `generateText` com `model: anthropic("claude-sonnet-5")`, `temperature: 0.3`, `maxOutputTokens: 16000`, `maxRetries: 2`, `providerOptions: { anthropic: { effort: "low" } }`, `tools.web_search = anthropic.tools.webSearch_20250305({ maxUses: 6, userLocation: { type: "approximate", country: "BR" } })`, `output: Output.object({ schema: diagnosticoSchema })`, `stopWhen: isStepCount(10)`, `onStepFinish` capturando as queries de busca de forma defensiva. Laço de `MAX_TENTATIVAS = 2` com reforço de prompt na 2ª tentativa. Após o retorno: (1) gate DIAGNOSTICO-02 via `filtrarFontes(res.sources)` → `DiagnosticoSemFonteError` se vazio; (2) cross-check FM2 montando um `Set` das URLs reais e contando as citadas no objeto (`achados[].fonte_url`, `ticket_medio.fonte_url`, `gatilhos_dor[].observavel_em`, `indice_saturacao.fontes[]`) ausentes → `avisoCrossCheck` (não bloqueia); (3) retorno do shape completo. Tratamento de erro: `NoObjectGeneratedError.isInstance` → log com allowlist (`tentativa`, `finishReason`, `cause`, `text.slice(0,500)`, `usage`) + `continue`; `DiagnosticoSemFonteError` → `console.warn` + `continue`; outro → `throw`; tentativas esgotadas → `DiagnosticoInvalidoError` com o último erro embutido. DB-free, sem `process.env`, sem log de segredo (T-23-08). **Nenhuma chamada real à API foi feita** — o 1º call pago é o plano 23-04.

## Aprovação humana de legitimidade de pacote (Task 1 — checkpoint bloqueante)

O usuário verificou os dois pacotes em npmjs.com antes desta sessão e respondeu **"aprovado"**:

| Pacote | Repositório confirmado | Publisher | `postinstall` |
|--------|------------------------|-----------|---------------|
| `ai@7.0.93` | `github.com/vercel/ai` | Vercel | nenhum |
| `@ai-sdk/anthropic@4.0.49` | `github.com/vercel/ai` (pasta `packages/anthropic`) | Vercel | nenhum |

Downloads semanais na casa de milhões/dezenas de milhões — sinal de pacote real, não typosquat. Nenhuma divergência encontrada; o fallback documentado (`@anthropic-ai/sdk` direto, 23-AI-SPEC §2) não foi necessário.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: instala ai@7.0.93 e @ai-sdk/anthropic@4.0.49 (pins exatos)** — `d0381ae` (chore)
2. **Task 2: rubrica anti-genérico como system prompt versionado** — `fb133f8` (feat)
3. **Task 3: gerarDiagnostico() single-shot com web search, Output.object e gate de fontes** — `5e822e3` (feat)

**Plan metadata:** `<final>` (docs: completa o núcleo de IA do diagnóstico)

## Files Created/Modified

- `src/lib/ai/diagnostico-prompt.ts` — `SYSTEM_PROMPT` (rubrica anti-genérico fixa) + `montarUserPrompt(campanha)` + tipo `CampanhaInput`
- `src/lib/ai/gerar-diagnostico.ts` — `gerarDiagnostico()` server-only/DB-free + `DiagnosticoSemFonteError`/`DiagnosticoInvalidoError`
- `package.json` — `ai` e `@ai-sdk/anthropic` em `dependencies` com pin exato
- `package-lock.json` — árvore de dependências (+9 pacotes)

## Decisions Made

- **Pin exato (sem `^`).** `npm i` grava caret; `package.json` corrigido à mão e `npm install` re-sincronizou o lock. Segue o hábito do projeto de pinar `next`/`eslint-config-next`.
- **`maxOutputTokens: 16000` + `effort: "low"` são ponto de partida.** O spike do plano 23-04 (Task 3) mede `usage`/`finishReason`/`steps` reais e fixa esses valores como decisão da fase (D-23-04). O RESEARCH Pitfall 9 explica por quê: o Sonnet 5 tem adaptive thinking sempre ligado e os tokens de raciocínio contam contra o teto.
- **`res.output` com cast para `Diagnostico`.** O `Output.object` já re-valida o retorno contra o schema Zod (senão `NoObjectGeneratedError`); a re-validação da fronteira de confiança do DB acontece na leitura (23-05), não aqui.
- **`avisoCrossCheck` não bloqueia.** Só sinaliza quando >0 URLs citadas no objeto não constam em `res.sources`, e sempre depois do gate de ≥1 fonte real ter passado. A Server Action grava em `diagnosticos.aviso` (coluna de ressalva não-fatal, D-23-07) — nunca em `diagnosticos.erro`.
- **REQUIREMENTS.md não foi tocado.** DIAGNOSTICO-02..09 já constam Complete desde o 23-01 (contrato Zod + gate + harness). DIAGNOSTICO-01 ("gera sob demanda") e DIAGNOSTICO-10 ("regenera, custo visível") seguem Pending — este plano entrega o "cérebro" (prompt + chamada + gate), mas a behavior observável só fecha com 23-04 (Server Action que persiste) + 23-05 (UI que renderiza). Marcar Complete agora seria falso-positivo — mesmo critério aplicado em 23-01 e 23-02.

## Deviations from Plan

None — plan executed exactly as written. (O único ajuste operacional foi corrigir o caret que o `npm i` grava por padrão para o pin exato que a acceptance criterion e o hábito do projeto exigem — comportamento esperado do npm, não desvio de plano.)

## Issues Encountered

- Um comando de verificação que combinava `grep` num pipeline foi bloqueado pela política de ferramentas do ambiente; as mesmas checagens foram refeitas com a ferramenta de busca dedicada e via `node -e` com o `ts-alias-loader.mjs`. Sem impacto no código entregue.
- Interrupção por "plan mode" entre a verificação da Task 3 e o commit; retomado após aprovação do coordenador, sem retrabalho (todos os gates já estavam verdes no disco).

## Known Stubs

Nenhum. `gerarDiagnostico()` é a implementação real do contrato; não há valor hardcoded, placeholder nem data-source ausente. A ausência de chamada à API neste plano é intencional e explícita (o 1º call é 23-04, após o setup do usuário).

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. Todos os controles previstos foram implementados: `server-only` (T-23-01), prompt injection mitigado no `SYSTEM_PROMPT` + user prompt rotulado (T-23-03), tetos de custo `maxUses: 6` / `maxOutputTokens` / `maxRetries` / `MAX_TENTATIVAS` (T-23-04), gate lê `res.sources` + cross-check (T-23-06), `Output.object` re-valida (T-23-07), allowlist de log (T-23-08).

## Verification

| Gate | Resultado |
|------|-----------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (4 warnings pré-existentes em `lead-table.tsx`/`lixeira-table.tsx` — `react-hooks/incompatible-library`, fora de escopo) |
| `npm run test:diagnostico-estrutural` | verde (harness do 23-01 segue passando; não importa `gerar-diagnostico.ts`) |
| `npm run build` (Turbopack) | exit 0, 14 rotas — confirma que `import "server-only"` não quebra o bundle |
| `node -e` import dinâmico de `diagnostico-prompt` via `ts-alias-loader` | `SYSTEM_PROMPT.length = 6417` (≥ 800); `montarUserPrompt` inclui o nicho e rotula `Oferta:` |
| `node -e` verificação de pins | `ai=7.0.93`, `@ai-sdk/anthropic=4.0.49` (exatos) |

## User Setup Required

Nada muda em relação ao já registrado em STATE.md. **A partir do plano 23-04** (1ª chamada real ao modelo) o usuário precisa:

- `.env.local` na raiz com `ANTHROPIC_API_KEY=sk-ant-...`
- Habilitar a "Web Search" tool nas configs da **organização** no Console da Anthropic (senão HTTP 400)

Este plano (23-03) roda e verifica sem esse setup.

## Next Phase Readiness

- `gerarDiagnostico()` pronto para o plano 23-04: a Server Action `src/actions/diagnostico-actions.ts` importa a função, chama-a, e persiste `{ payload, fontes, buscas, aviso: avisoCrossCheck, inputTokens, outputTokens, status }` em `diagnosticos`.
- Spike do 23-04 (Task 3) deve: (a) confirmar o repasse de `providerOptions.anthropic.effort` pelo provider `@4.0.49`; (b) medir `maxOutputTokens` real contra truncamento; (c) confirmar o nome do campo da query em `step.toolCalls[].input`; (d) registrar tudo como D-23-04.
- `eval-diagnostico.mjs` (23-06) pode importar `@/lib/ai/gerar-diagnostico` direto — a função é DB-free.

## Self-Check: PASSED

- `src/lib/ai/diagnostico-prompt.ts` e `src/lib/ai/gerar-diagnostico.ts` presentes em disco — conferido.
- Commits `d0381ae`, `fb133f8`, `5e822e3` presentes em `git log` — conferido.
- `gerar-diagnostico.ts`: 1ª linha `import "server-only";`; contém `claude-sonnet-5`, `webSearch_20250305`, `maxUses: 6`, `isStepCount(10)`, `Output.object`, `res.sources`, `avisoCrossCheck` (≥2×); não contém `generateObject`, `streamText`, `streamObject`, `process.env`, `@/db/` — conferido.
- `package.json` com `ai` e `@ai-sdk/anthropic` sem `^` — conferido.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-10*
