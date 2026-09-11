---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 04
subsystem: ai
tags: [server-action, vercel-ai-sdk, anthropic, claude-sonnet-5, spike, zod, drizzle]

requires:
  - phase: 23-diagn-stico-de-ia-da-campanha
    plan: 02
    provides: "tabela diagnosticos (11 colunas, erro/aviso separados)"
  - phase: 23-diagn-stico-de-ia-da-campanha
    plan: 03
    provides: "gerarDiagnostico() server-only/DB-free, avisoCrossCheck, providerOptions.effort"
provides:
  - "Server Action gerarDiagnosticoAction: valida campanhaId, guarda de campanha (FK forjada), chama gerarDiagnostico, persiste sucesso E falha, revalida /campanhas/[id]"
  - "scripts/spike-modelo-diagnostico.mjs: instrumento de re-medição da config real do modelo (fora do package.json)"
  - "D-23-04: temperature removido (inerte), effort:'low' mantido (confirmado), maxOutputTokens:16000 mantido (folga confirmada), limites de tamanho do schema recalibrados por medição real"
affects: [23-06 (eval gold-set — herda o SYSTEM_PROMPT com limites de tamanho e o schema recalibrado), 23-07 (botão de UI já consome esta Server Action)]

tech-stack:
  added: []
  patterns:
    - "Server Action grava linha de sucesso (aviso) e de falha (erro) em diagnosticos, sempre revalida a rota nos dois caminhos"
    - "avisoCrossCheck na coluna aviso, nunca na coluna erro (D-23-07)"
    - "Limite de tamanho de campo de texto livre gerado por LLM é fixado por medição real (spike pago), nunca por estimativa — e reforçado no PROMPT (causa raiz), com o teto do Zod como rede de segurança, não como alvo"

key-files:
  created:
    - src/actions/diagnostico-actions.ts
  modified:
    - src/lib/ai/gerar-diagnostico.ts
    - src/lib/ai/diagnostico-schema.ts
    - src/lib/ai/diagnostico-prompt.ts

key-decisions:
  - "D-23-04: temperature REMOVIDO de gerar-diagnostico.ts — o provider @ai-sdk/anthropic@4.0.49 emite warning 'temperature is not supported ... and will be ignored' no claude-sonnet-5 (assumption A3 do 23-RESEARCH.md FALHOU)"
  - "D-23-04: effort:'low' MANTIDO — repassado sem erro/warning pelo provider (assumption A2 confirmada)"
  - "D-23-04: maxOutputTokens:16000 MANTIDO — outputTokens medido entre 2698 e 5279 em 3 chamadas reais, finishReason sempre 'stop', nenhuma chamada perto do teto"
  - "D-23-04: extração de buscas via toolCalls[].input.query funcionou de primeira (assumption A5 não era um problema real; 4 buscas específicas do nicho capturadas na chamada bem-sucedida)"
  - "D-23-04 (bug descoberto, Rule 1): indice_saturacao.leitura (max 300) e veredito_sugerido.justificativa (max 800) eram estimativas do 23-01 sem chamada real — o Sonnet 5 escreveu 396 a 1150+ caracteres nesses campos, derrubando as 2 primeiras chamadas reais. Corrigido na causa raiz (SYSTEM_PROMPT agora pede explicitamente até 480/850 caracteres) com os tetos do schema alargados para 750/1400 como rede de segurança"
  - "gerarDiagnosticoAction devolve { success:false, erro } sem stack trace nem process.env (T-23-08); avisoCrossCheck só grava em diagnosticos.aviso"

requirements-completed: [DIAGNOSTICO-01, DIAGNOSTICO-02, DIAGNOSTICO-10]

duration: ~45min (sessão retomada — só Task 3; Task 1 já estava feita)
completed: 2026-09-11
---

# Phase 23 Plan 04: Server Action + Medição Real do Modelo Summary

**Server Action `gerarDiagnosticoAction` (valida/gera/persiste/revalida) ligada a uma primeira geração real e validada contra o Claude Sonnet 5 — 3 chamadas pagas até descobrir e corrigir um schema calibrado por estimativa, não por medição.**

## Performance

- **Duration:** ~45min nesta sessão (retomada — Task 1 já estava commitada de uma sessão anterior)
- **Started:** 2026-09-11 (retomada, bloqueio de saldo já resolvido pelo usuário)
- **Completed:** 2026-09-11T13:13:54Z
- **Tasks:** 3 (1 auto, 1 checkpoint:human-action, 1 auto) — todas concluídas
- **Files modified:** 4 (1 criado nesta sessão anterior — `diagnostico-actions.ts` — e 3 ajustados nesta sessão: `gerar-diagnostico.ts`, `diagnostico-schema.ts`, `diagnostico-prompt.ts`)

## Accomplishments

- **Task 1 — Server Action `gerarDiagnosticoAction`** (já commitada em `f578ade`, sessão anterior): valida `campanhaId` via Zod antes de qualquer query, confirma a campanha (leftJoin `nichos`, checa `deletedAt`), chama `gerarDiagnostico()`, grava linha de sucesso com `aviso` OU linha de falha com `erro` (nunca as duas), e revalida `/campanhas/[id]` nos dois caminhos. Sem cache — cada clique é uma chamada nova (DIAGNOSTICO-10).
- **Task 2 — setup do usuário** (checkpoint, já confirmado em sessão anterior): `.env.local` com `ANTHROPIC_API_KEY` workspace-scoped e Web Search habilitada na organização.
- **Task 3 — spike medido contra a API real, 3 chamadas pagas:**
  1. **1ª chamada:** o saldo da Anthropic já estava resolvido (sem erro 400/402). A chamada real REVELOU que `temperature: 0.3` é ignorado pelo provider no `claude-sonnet-5` (warning explícito do AI SDK) — confirma assumption A3 como falha, já suspeitada pela inspeção do request body numa sessão anterior. Mas a chamada FALHOU: `indice_saturacao.leitura` (limite 300) e `veredito_sugerido.justificativa` (limite 800) do schema do plano 23-01 eram estimativas nunca testadas contra o modelo real — o Sonnet 5 escreveu 396–1021 caracteres nesses dois campos nas 2 tentativas internas do retry, e ambas falharam a validação Zod (`NoObjectGeneratedError`).
  2. **2ª chamada:** alarguei os tetos do schema para 550/1100 baseado nos números medidos na 1ª chamada. FALHOU de novo — o modelo é naturalmente variável entre chamadas (1021 → 1150+ na justificativa da 1ª tentativa desta rodada; 436 → 490+ na leitura da 2ª tentativa). Perseguir um teto fixo por trás do comportamento observado é um alvo móvel e cada tentativa é uma chamada paga.
  3. **Correção de causa raiz:** o problema real é que o modelo não sabia do limite de caracteres. Adicionei uma seção explícita "LIMITES DE TAMANHO" ao `SYSTEM_PROMPT` (`diagnostico-prompt.ts`) pedindo até 480 caracteres em `leitura` e até 850 em `justificativa`, e alarguei os tetos do Zod (`diagnostico-schema.ts`) para 750/1400 como rede de segurança generosa — não como alvo.
  4. **3ª chamada:** passou de primeira, `exit 0`. `finishReason: "stop"`, `outputTokens: 2717`, `steps: 1`, `buscas capturadas: 4` (queries específicas em PT-BR do nicho "costureira sob medida" — nenhuma genérica), `fontes coletadas: 28` (prova de Web Search habilitada), `avisoCrossCheck` não-nulo (10 URLs citadas no objeto ausentes das fontes reais — funcionando como ressalva não-fatal esperada, D-23-07), `veredito_sugerido.decisao: "mudar_angulo"`.
- Comentários em `gerar-diagnostico.ts` atualizados com os números medidos das 3 chamadas (não só da última), documentando D-23-04 no próprio código, não só no SUMMARY.

## Task Commits

1. **Task 1: Server Action `gerarDiagnosticoAction`** — `f578ade` (feat, sessão anterior)
2. **Task 2: [SETUP] chave de API + Web Search** — confirmado em sessão anterior, sem commit de código (mudança fora do repo)
3. **Task 3 (parcial, script escrito sem rodar com sucesso): spike + stub loader** — `aa3556b` (chore, sessão anterior)
4. **Task 3 (conclusão): spike medido, temperature removido, schema/prompt recalibrados** — `9674494` (fix)

**Plan metadata:** `<próximo commit>` (docs: completa o plano 23-04)

## Files Created/Modified

- `src/actions/diagnostico-actions.ts` — Server Action (criado na sessão anterior, Task 1)
- `scripts/spike-modelo-diagnostico.mjs` — instrumento de medição (criado na sessão anterior, Task 3 parcial; sem alteração de conteúdo nesta sessão — só reexecutado 3x)
- `src/lib/ai/gerar-diagnostico.ts` — remove `temperature`; comentários atualizados com os números medidos das 3 chamadas reais (D-23-04)
- `src/lib/ai/diagnostico-schema.ts` — `indice_saturacao.leitura` 300→750, `veredito_sugerido.justificativa` 800→1400 (rede de segurança, D-23-04)
- `src/lib/ai/diagnostico-prompt.ts` — `SYSTEM_PROMPT` ganha bloco "LIMITES DE TAMANHO" explícito (480/850 caracteres) — causa raiz do estouro de schema

## Decisions Made

Ver `key-decisions` no frontmatter — resumo: **D-23-04** fixa `temperature` (removido), `effort: "low"` (mantido), `maxOutputTokens: 16000` (mantido) a partir de 3 medições reais, e registra a descoberta/correção do bug de schema calibrado por estimativa (limites de `leitura`/`justificativa` agora medidos e reforçados no prompt, não só no schema).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema com limites de tamanho de texto calibrados por estimativa, não por medição, bloqueando toda geração real**
- **Found during:** Task 3, 1ª chamada real ao spike
- **Issue:** `diagnosticoSchema` (plano 23-01) definia `indice_saturacao.leitura` com `max(300)` e `veredito_sugerido.justificativa` com `max(800)` — nunca testados contra uma saída real do Sonnet 5. A 1ª e a 2ª chamadas pagas ao spike falharam a validação Zod (`NoObjectGeneratedError`) porque o modelo escreveu entre 396 e 1150+ caracteres nesses dois campos, variando naturalmente entre chamadas.
- **Fix:** duas camadas de correção. (a) Causa raiz: `SYSTEM_PROMPT` ganhou um bloco explícito "LIMITES DE TAMANHO" pedindo até 480/850 caracteres nesses dois campos — o modelo não sabia que havia um teto. (b) Rede de segurança: os tetos do Zod foram alargados para 750/1400 (generosos, não o alvo) para tolerar variação natural entre chamadas sem virar um novo ponto de falha.
- **Files modified:** `src/lib/ai/diagnostico-prompt.ts`, `src/lib/ai/diagnostico-schema.ts`
- **Verification:** 3ª chamada real ao spike passou de primeira (`exit 0`), `finishReason: "stop"`, 28 fontes coletadas, 4 buscas específicas do nicho. `npm run test:diagnostico-estrutural` (61 asserções, inclusive os 3 fixtures `ok-*` e os 4 `bad-*`) continua verde — os novos tetos não afrouxam nenhuma regra estrutural (`min`, enum, `.refine` do `mais_forte`).
- **Committed in:** `9674494`

**2. [Rule 1 - Bug] `temperature: 0.3` inerte no provider, confirmado por warning explícito**
- **Found during:** Task 3, 1ª chamada real
- **Issue:** o AI SDK emitiu `Warning (anthropic.messages / claude-sonnet-5): The feature "temperature" is not supported. temperature is not supported by claude-sonnet-5 and will be ignored`. Assumption A3 do 23-RESEARCH.md (MEDIUM confidence) confirmada como falha por evidência direta, não só por inspeção do request body.
- **Fix:** linha removida de `gerar-diagnostico.ts`, com comentário explicando o porquê (evita que um executor futuro a reintroduza).
- **Files modified:** `src/lib/ai/gerar-diagnostico.ts`
- **Verification:** 3ª chamada do spike não emitiu mais o warning de `temperature`.
- **Committed in:** `9674494`

---

**Total deviations:** 2 auto-fixed (ambos Rule 1 — bugs descobertos só por medição real, não visíveis em código estático)
**Impact on plan:** Essenciais para o objetivo central do plano ("uma geração real ponta a ponta produziu objeto validado"). Sem esses dois fixes, o spike nunca teria saído do loop de falha — não é scope creep, é a própria Task 3 sendo cumprida.

## Issues Encountered

- Custo real do spike: 3 chamadas pagas (não 1 como estimado no plano, ~US$0,15–0,25 cada) porque as 2 primeiras revelaram o bug de schema descrito acima. Custo total estimado desta sessão: ~US$0,45–0,75. Documentado aqui para transparência de custo (mitigação T-23-04 do plano, que já previa esse tipo de auditoria).
- `npm run lint` reporta 4 warnings pré-existentes (`react-hooks/incompatible-library` em `csv-import-preview-table.tsx`, `lead-form-dialog.tsx`, `lead-table.tsx`, `lixeira-table.tsx`) — nenhum arquivo tocado por este plano, fora de escopo, mesmo padrão já aceito em summaries anteriores da fase.

## User Setup Required

Nenhum passo novo. O setup da Task 2 (`.env.local` + Web Search na organização) já estava confirmado antes desta sessão; a única pendência era o saldo da conta Anthropic, que o usuário resolveu antes de retomar.

## Next Phase Readiness

- `gerarDiagnostico()` está com a configuração final medida (D-23-04): pronta para o eval gold-set do plano 23-06, que reusa exatamente este `SYSTEM_PROMPT` e este `diagnosticoSchema`.
- O botão de UI do plano 23-07 (já commitado) consome `gerarDiagnosticoAction` sem nenhuma mudança de contrato — `DiagnosticoActionState` permanece exatamente como especificado no bloco `<interfaces>` do plano.
- Nenhum bloqueio remanescente para 23-06, exceto o mesmo requisito de crédito Anthropic (cada rodada do gold-set faz chamadas reais).

## Self-Check: PASSED

- `src/actions/diagnostico-actions.ts` presente em disco — conferido.
- `scripts/spike-modelo-diagnostico.mjs` presente em disco, ausente de `package.json` scripts — conferido.
- `src/lib/ai/gerar-diagnostico.ts` sem a string `temperature:` — conferido.
- `src/lib/ai/diagnostico-schema.ts` com `max(750)` e `max(1400)` nos dois campos corrigidos — conferido.
- Commits `f578ade`, `aa3556b`, `9674494` presentes em `git log` — conferido.
- `npx tsc --noEmit`, `npm run lint`, `npm run guard:no-hard-delete`, `npm run verify:schema`, `npm run test:diagnostico-estrutural` — todos exit 0, conferido nesta sessão.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-11*
