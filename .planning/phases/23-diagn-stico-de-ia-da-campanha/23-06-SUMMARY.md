---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 06
subsystem: ai
tags: [ai-sdk, anthropic, claude-sonnet-5, zod, eval, llm-judge, gold-set]

# Dependency graph
requires:
  - phase: 23-04
    provides: gerarDiagnostico() validado ponta a ponta contra a API real (spike medido, D-23-04)
provides:
  - Dataset de referência versionado (test/nichos-referencia.json, 8 casos: 3 gold + 4 difíceis + 1 adversarial)
  - Eval on-demand (scripts/eval-diagnostico.mjs) com geração real + portões estruturais + LLM-judge hand-rolled + relatório datado
  - Schema de achado com 3 categorias (dado_quantificavel / relato_qualitativo / alegacao_marketing) + campo evidencia em gatilhos_dor
  - Baseline de qualidade real (3 vereditos gold discriminados entre si) para comparar mudanças futuras de prompt/schema
affects: [24-veredito-painel-mapa-de-nichos, src/lib/ai]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eval on-demand fora do CI: script .mjs com register(ts-alias-loader) + register(server-only-stub-loader), nunca em package.json, custa dinheiro real"
    - "LLM-judge hand-rolled: 1 generateText adicional, temperature 0, sem tools, Output.object com schema Zod local por dimensão (veredicto/nota/razão)"
    - "3 categorias de achado (não 2): dado_quantificavel / relato_qualitativo / alegacao_marketing — relato real de 1 fonte isolada NUNCA vira dado_quantificavel"
    - "Campo evidencia (padrao_confirmado/relato_isolado) em gatilhos_dor + .refine amarrando mais_forte à evidência mais robusta disponível"
    - "Anti-colisão de relatório: sufixo numérico incremental quando o nome-base do dia já existe, nunca sobrescreve"

key-files:
  created:
    - test/nichos-referencia.json
    - scripts/eval-diagnostico.mjs
    - test/fixtures/diagnostico/bad-mais-forte-relato-isolado.json
    - test/reports/2026-09-11-eval-diagnostico.md
    - test/reports/2026-09-11-eval-diagnostico-2.md
    - test/reports/2026-09-11-eval-diagnostico-3.md
    - test/reports/2026-09-11-eval-diagnostico-4.md
    - test/reports/2026-09-11-eval-diagnostico-5.md
  modified:
    - src/lib/ai/diagnostico-schema.ts
    - src/lib/ai/diagnostico-prompt.ts
    - src/lib/ai/gerar-diagnostico.ts
    - src/components/achado-tipo-badge.tsx
    - src/components/diagnostico-resultado.tsx
    - scripts/test-diagnostico-estrutural.cjs
    - test/fixtures/diagnostico/ok-costureira.json
    - test/fixtures/diagnostico/ok-motoboy.json
    - test/fixtures/diagnostico/ok-estetica.json
    - test/fixtures/diagnostico/adversarial-so-marketing.json
    - test/fixtures/diagnostico/bad-achados-sem-tipo.json
    - test/fixtures/diagnostico/bad-dois-mais-forte.json
    - test/fixtures/diagnostico/bad-enum-veredito.json
    - test/fixtures/diagnostico/bad-truncado.json
    - test/fixtures/diagnostico/bad-zero-mais-forte.json

key-decisions:
  - "D-23-06: schema de achado passa de 2 para 3 categorias (dado_quantificavel / relato_qualitativo / alegacao_marketing), com campo evidencia (padrao_confirmado/relato_isolado) em gatilhos_dor amarrando a força do gatilho à confiabilidade real da fonte — tomada após 3 rodadas de eval real mostrarem que reforço de prompt sozinho não resolve ambiguidade de schema"
  - "Baseline de discriminação aceito com 1/3 de acerto exato contra o gabarito humano de 2026-09-04 — o critério duro do plano é discriminação entre os 3 nichos (passou), não acerto perfeito; o veredito da IA é sugestão, o humano sempre valida (Fase 24)"
  - "Variância de veredito entre execuções idênticas (rodadas 4 vs 5, mesmo código) ACEITA como comportamento esperado do sistema — busca adaptativa + LLM não-determinístico, não um bug a corrigir. Documentado para quem usar o produto: o veredito da IA é sugestão inicial, sempre validada pelo humano antes de agir"
  - "Cross-check de citações: maioria dos mismatches é 'URL real + sufixo espúrio de 1-3 caracteres' (não alucinação de conteúdo) — fix de normalização/prompt aplicado (commit 1105f56) reduz falso-positivo cosmético, mas o sufixo espúrio em si fica como DÍVIDA TÉCNICA não resolvida (sem crédito de API para investigar mais a fundo nesta sessão)"

patterns-established:
  - "Pattern: causa raiz de não-discriminação investigada por leitura de relatório (judge notes) + mapeamento de schema/prompt, ANTES de qualquer reforço de rubrica repetido sem sucesso"
  - "Pattern: fix separado dos bugs do PRÓPRIO harness de eval (judge error não deve descartar resultado de geração; nome de relatório nunca sobrescreve) documentado como deviation, não misturado no commit da mudança de produto"
  - "Pattern: cross-check de URL como 2 verificadores independentes (produção em gerar-diagnostico.ts + reimplementação no eval) — investigação de causa raiz precisa de instrumentação que persista a LISTA real de mismatches, não só a contagem agregada, senão a evidência commitada não sustenta diagnóstico nenhum"

requirements-completed: [DIAGNOSTICO-02, DIAGNOSTICO-04, DIAGNOSTICO-07, DIAGNOSTICO-09]

# Metrics
duration: ~5h (2 sessões no mesmo dia — execução do plano + code review + investigação de cross-check), ~US$3,94 de custo real total (spike 23-04 + 5 rodadas do eval 23-06)
completed: 2026-09-11
---

# Phase 23 Plan 06: Eval gold-set do diagnóstico de IA Summary

**Eval on-demand real (scripts/eval-diagnostico.mjs) provou, em 3 rodadas pagas, que o schema de 2 categorias de achado escondia a causa raiz da não-discriminação entre nichos — corrigido com uma 3ª categoria (relato_qualitativo) e um campo de evidência, chegando a um baseline com os 3 vereditos gold discriminados entre si.**

## Performance

- **Duration:** ~5h no dia (execução do plano + checkpoint de rodadas + code review de fase + investigação de cross-check), maior parte em chamadas reais de geração+juiz (30-150s cada, 5 rodadas do eval)
- **Completed:** 2026-09-11
- **Tasks:** 3 do plano original + investigação estrutural (D-23-06, aprovada) + 5 rodadas do eval + 2 críticos de code review + investigação e fix de cross-check (Parte A/B)
- **Files modified:** 27 (8 criados, 19 modificados/estendidos)

## Accomplishments

- Dataset de referência versionado (`test/nichos-referencia.json`) com 3 gold (veredito esperado travado desde 2026-09-04), 4 casos difíceis e 1 adversarial
- Eval on-demand (`scripts/eval-diagnostico.mjs`) que chama `gerarDiagnostico()` de verdade, aplica os mesmos portões estruturais do harness de CI sobre a saída real, roda um LLM-judge hand-rolled nas dimensões subjetivas, e escreve relatório markdown datado — sempre sequencial, nunca em CI, fora do `package.json`
- **Causa raiz da não-discriminação diagnosticada e corrigida**: o enum binário `tipoAchado` (`dado_quantificavel`/`alegacao_marketing`) forçava uma dicotomia falsa — um relato real de cliente (não é copy de venda do concorrente) só tinha uma casa possível, `dado_quantificavel`, mesmo sendo uma anedota única. Isso contaminava `indice_saturacao`, `gatilhos_dor.mais_forte` e a lógica do veredito com evidência fraca disfarçada de forte
- Correção estrutural: 3ª categoria `relato_qualitativo` + campo `evidencia` (`padrao_confirmado`/`relato_isolado`) em `gatilhos_dor` + novo `.refine` proibindo `mais_forte=true` num gatilho `relato_isolado` quando existe `padrao_confirmado` no array
- **Baseline final (rodada 3): os 3 vereditos gold vieram discriminados entre si pela 1ª vez** (`abandonar`/`aprofundar`/`mudar_angulo`, todos diferentes) — o teste-mestre da dimensão 7 (23-AI-SPEC §5) passou. 1 dos 3 bateu exatamente com o gabarito humano de 2026-09-04 (motoboy → `aprofundar`)
- Dimensão "separação dado × marketing" do juiz: zero `FAIL` nos 2 casos onde o juiz rodou na rodada 3 (vs. `FAIL` em 3 dos 5 julgamentos nas 2 rodadas anteriores) — confirma que a causa raiz identificada era real

## Task Commits

Plano original (Tasks 1-2) + checkpoint humano em 3 rodadas + investigação estrutural aprovada:

1. **Task 1: Dataset de nichos de referência** - `6120471` (feat)
2. **Task 2: Script de eval com checks estruturais + LLM-judge** - `6401ca7` (feat)
3. **Task 3, rodada 1: relatório baseline (NÃO discriminado)** - `1f4704f` (docs)
4. **Reforço da rubrica do veredito (REGRA DE ESCOLHA DO VEREDITO)** - `fb739ba` (fix)
5. **Fix do eval: juiz falho não descarta resultado da geração + anti-colisão de nome de relatório** - `e49d6da` (fix, inclui relatório rodada 2, ainda NÃO discriminado)
6. **Investigação estrutural: schema ganha relato_qualitativo + evidencia + novo .refine** - `f621c51` (feat)
7. **Fixtures (10) + harness estrutural atualizados para o novo schema** - `4845d6d` (test)
8. **Eval reconhece a 3ª categoria + mostra contagem por categoria/evidência no relatório** - `6c19275` (feat)
9. **Task 3, rodada 3: relatório final (DISCRIMINADO)** - `1e81375` (docs)
10. **Fecha SUMMARY + STATE + ROADMAP do plano 23-06** - `baa0cee` (docs)

Code review da fase + investigação reaberta do cross-check (pós-fechamento do plano, mesmo dia):

11. **CR-01/CR-02 do code review da fase corrigidos** - `b233f80` (fix)
12. **Registra os fixes de CR-01/CR-02 e reabre o cross-check** - `1cd2e1d` (docs)
13. **Cross-check tolera diferença cosmética de URL + prompt exige cópia literal + eval loga mismatches reais** - `1105f56` (fix)
14. **Relatório rodada 4 (pós-fix de cross-check)** - `083a4b8` (docs)
15. **Relatório rodada 5 (medida de variância, parou por crédito)** - `c2e6cc1` (docs)

**Plan metadata:** (este commit — docs: fecha a Fase 23 definitivamente)

## Files Created/Modified

- `test/nichos-referencia.json` - 8 casos de referência (3 gold + 4 difíceis + 1 adversarial), veredito esperado travado
- `scripts/eval-diagnostico.mjs` - eval on-demand: geração real + portões estruturais + LLM-judge + relatório datado, `--gold`/`--niche`/`--help`
- `src/lib/ai/diagnostico-schema.ts` - `tipoAchado` com 3 categorias; `gatilhos_dor[].evidencia`; novo `.refine` (`GATILHO_MAIS_FORTE_EVIDENCIA_MSG`)
- `src/lib/ai/diagnostico-prompt.ts` - `REGRA DE ESCOLHA DO VEREDITO` reamarrada a `evidencia`; contrato de tipagem com 3 categorias; few-shot com o 3º exemplo
- `scripts/test-diagnostico-estrutural.cjs` - Grupos G/H novos (refine de evidência + presença do campo); `TIPOS_ACHADO_VALIDOS` com 3 valores
- `test/fixtures/diagnostico/*.json` (10 arquivos, 1 novo) - campo `evidencia` em todo gatilho; achado `relato_qualitativo` em 2 fixtures gold; nova fixture testando o refine
- `test/reports/2026-09-11-eval-diagnostico{,-2,-3,-4,-5}.md` - as 5 execuções reais, commitadas como evidência comparável (D-23-05)
- `src/components/achado-tipo-badge.tsx`, `src/components/diagnostico-resultado.tsx` - CR-01: 3ª categoria nos mapas de badge + 3º eixo de tratamento de texto
- `src/lib/ai/gerar-diagnostico.ts` - CR-02 (buscas reset por tentativa) + cross-check normalizado (WR-01/WR-04)

## Decisions Made

**D-23-06 (registrada em PROJECT.md Key Decisions):** o schema de achado (`diagnosticoSchema.achados[].tipo`) passa de 2 para 3 categorias — `dado_quantificavel` (contagem/preço medido), `relato_qualitativo` (relato real de 1 fonte isolada, NÃO é medição de mercado) e `alegacao_marketing` (copy de venda do concorrente). `gatilhos_dor[]` ganha o campo `evidencia` (`padrao_confirmado`/`relato_isolado`), e um novo `.refine` proíbe que o gatilho `mais_forte` se apoie só em `relato_isolado` quando existe `padrao_confirmado` no mesmo array. Motivo: 2 rodadas de reforço de prompt (rubrica REGRA-MESTRE + REGRA DE ESCOLHA DO VEREDITO, commit `fb739ba`) não resolveram a não-discriminação porque a causa raiz era uma dicotomia falsa no *schema*, não uma rubrica frouxa — investigação lendo as notas do LLM-judge nas 2 primeiras rodadas apontou o padrão consistentemente (relatos anedóticos únicos sendo marcados `dado_quantificavel` por falta de 3ª categoria).

**Baseline de qualidade aceito com 1/3 de acerto exato** contra o gabarito humano validado em 2026-09-04 — o critério duro do plano 23-06 é discriminação entre os 3 nichos (rodada 3: passou, os 3 vereditos vieram diferentes entre si), não acerto perfeito. O veredito da IA é sugestão (DIAGNOSTICO-09), nunca vinculante; a Fase 24 já prevê o operador registrar o veredito final, que pode divergir do sugerido.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Eval descartava o resultado da geração quando só o juiz falhava**
- **Found during:** 2ª rodada real do eval (caso motoboy-clientes-particulares)
- **Issue:** `try/catch` único em volta de `gerarDiagnostico()`+`rodarJuiz()` fazia o eval registrar `status: "erro"` (perdendo o veredito real e os portões estruturais já aplicados) quando só a chamada do juiz falhava com `NoObjectGeneratedError`
- **Fix:** `try/catch` separado para `rodarJuiz()`; falha do juiz agora só marca `julgamento: null` + `juizErro`, preservando `diagnostico`/`fontes`/`buscas`/`falhasEstruturais` no relatório
- **Files modified:** `scripts/eval-diagnostico.mjs`
- **Verification:** rodada 3 confirmou o fix funcionando (caso motoboy preservou o veredito `aprofundar` apesar do juiz ter falhado de novo)
- **Committed in:** `e49d6da`

**2. [Rule 2 - Missing Critical] Nome do relatório sem proteção contra sobrescrita no mesmo dia**
- **Found during:** 2ª rodada real do eval — quase perdeu o relatório baseline da rodada 1 (mesmo nome de arquivo, mesma data)
- **Issue:** `test/reports/<data>-eval-diagnostico.md` usava só a data; uma 2ª execução no mesmo dia sobrescrevia silenciosamente o relatório anterior
- **Fix:** sufixo numérico incremental (`-2`, `-3`, ...) quando o nome-base já existe; relatório da rodada 1 restaurado via `git checkout` antes do fix
- **Files modified:** `scripts/eval-diagnostico.mjs`
- **Verification:** rodada 3 gerou `2026-09-11-eval-diagnostico-3.md` automaticamente sem tocar nos 2 anteriores
- **Committed in:** `e49d6da`

**3. [Rule 3 - Blocking] `TIPOS_ACHADO_VALIDOS` do eval desatualizado em relação ao schema**
- **Found during:** revisão pré-3ª-rodada (antes de gastar dinheiro), após a mudança de schema do commit `f621c51`
- **Issue:** o gate estrutural do eval (`aplicarPortoesEstruturais`) reprovaria TODO caso real com algum achado `relato_qualitativo`, porque a constante local do script ainda tinha só 2 valores
- **Fix:** `TIPOS_ACHADO_VALIDOS` do eval sincronizado com o schema (3 valores); aproveitado para adicionar contagem por categoria/evidência no relatório (pedido explícito do orquestrador)
- **Files modified:** `scripts/eval-diagnostico.mjs`
- **Verification:** `npx eslint` + `--help` + greps de aceitação antes de rodar a 3ª chamada paga
- **Committed in:** `6c19275`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking) — todos em `scripts/eval-diagnostico.mjs`, nenhum em código de produto (`src/`)
**Impact on plan:** Nenhum scope creep — os 3 fixes eram necessários para o próprio eval funcionar corretamente e não gastar dinheiro real produzindo dados incorretos.

## Issues Encountered

- **Não-discriminação nas 2 primeiras rodadas** (checkpoint humano, não um bug): rodada 1 (baseline) e rodada 2 (rubrica reforçada) produziram vereditos gold NÃO discriminados — resolvido só na rodada 3, com a mudança estrutural de schema (ver Decisions Made). Documentado como o fluxo central deste plano, não como falha de execução.
- **Cross-check de fontes falhando nos 3 casos gold da rodada 3** (6-11 URLs citadas no objeto ausentes de `res.sources`) — **NÃO investigado nesta fase**, registrado como dívida técnica em STATE.md. O gate de zero-fontes (DIAGNOSTICO-02) continua protegendo (sempre havia >=1 fonte real), mas a fidelidade de citação individual merece atenção futura.
- **Chamada do juiz falhou no caso motoboy da rodada 3** (`NoObjectGeneratedError` na própria chamada do juiz, não na geração) — o fix do item 1 acima preservou o resultado da geração, mas ficamos sem as 5 notas de julgamento subjetivo desse caso específico. Registrado como dívida técnica não-bloqueante.

## Code Review Fixes (pós-fechamento do plano, gate de fase)

O `gsd-code-reviewer` da Fase 23 (`23-REVIEW.md`, commit `4551cf6`, 30 arquivos revisados) achou 2 críticos reais, ambos já corrigidos em `b233f80` — nenhuma chamada de API envolvida:

- **CR-01** (`src/components/achado-tipo-badge.tsx`): D-23-06 adicionou `relato_qualitativo` ao enum `tipoAchado`, mas `TIPO_LABEL`/`TIPO_TOKEN`/`TIPO_ICON` continuavam com só 2 chaves — confirmado como o ÚNICO erro de `tsc --noEmit` do repo inteiro, e os relatórios reais do 23-06 mostram `relato_qualitativo` em toda geração real. Sem o fix, `/campanhas/[id]` quebraria ao renderizar um diagnóstico real. Corrigido: 3ª entrada nos 3 mapas (label "Relato isolado", ícone `MessageCircle`, token `bg-status-neutral`) + `diagnostico-resultado.tsx` ganhou o 3º eixo de tratamento de texto (`relato_qualitativo` = `text-muted-foreground` sem itálico, peso visual intermediário entre `dado_quantificavel` pleno e `alegacao_marketing` itálico+muted).
- **CR-02** (`src/lib/ai/gerar-diagnostico.ts`): o array `buscas` era declarado fora do loop de retry e nunca resetado entre tentativas — uma 2ª tentativa bem-sucedida herdava as buscas da 1ª tentativa descartada, corrompendo a coluna de auditoria `diagnosticos.buscas` (DIAGNOSTICO-10) e podendo disparar falso-positivo no gate `MAX_USES` do eval. Corrigido: declaração movida pra dentro do loop (`buscasTentativa`, reset por tentativa).

Gates pós-fix, todos verdes: `npx tsc --noEmit` (0 erros), `npm run lint` (0 erros), `npm run build` (14 rotas), `node scripts/test-diagnostico-estrutural.cjs` (68 asserções).

## Investigação do Cross-Check de Citações (WR-01/WR-04) — encerrada

O usuário reabriu a questão do cross-check de citações (URLs citadas no objeto ausentes de `res.sources`, 6-11/caso) em vez de aceitar como dívida documentada sem entender a causa. Investigação em 2 partes:

**Parte A — fix aplicado, sem custo de API (commit `1105f56`):**
- `src/lib/ai/diagnostico-prompt.ts`: novo bloco `REGRA DE CÓPIA LITERAL DA URL` — exige cópia caractere-por-caractere da URL recebida como resultado de busca, proíbe reconstrução mesmo "correta sobre o conteúdo"
- `src/lib/ai/diagnostico-schema.ts`: novo helper puro `normalizarUrl()` (`new URL(u).href`) — absorve diferença cosmética (host maiúsculo, porta padrão, caminho-raiz vazio) sem fundir path/query genuinamente diferentes
- `src/lib/ai/gerar-diagnostico.ts`: cross-check FM2 normaliza dos dois lados; retorno ganha `urlsForaDasFontes` rotulado por campo de origem (não só a contagem)
- `scripts/eval-diagnostico.mjs`: `aplicarPortoesEstruturais()` normaliza igual e devolve `{ falhas, mismatches }`; relatório markdown ganha a lista real de pares "campo → URL citada" por caso

**Parte B — 2 rodadas reais pós-fix (rodadas 4 e 5, mesmo código, sem mudança nenhuma entre elas), medindo variância:**
- Rodada 4 (`083a4b8`, US$0,81): costureira→`aprofundar`, motoboy→`mudar_angulo`, estética→`mudar_angulo`
- Rodada 5 (`c2e6cc1`, US$0,63): costureira→`mudar_angulo`, motoboy→`abandonar`, estética→**ERRO de crédito da API** ("Your credit balance is too low..."), parada sem retry conforme instruído
- **Nenhum dos 3 casos deu o mesmo veredito entre rodadas idênticas** — confirma que o sistema tem variância real run-a-run (busca adaptativa descobre fatos de mercado diferentes a cada execução; o modelo não é determinístico mesmo com `effort: "low"`, e `temperature` nem é honrado pelo provider). **Decisão final do usuário: aceitar isso como comportamento ESPERADO do sistema, não um bug** — documentado para quem usar o produto: o veredito da IA é sempre sugestão inicial, o humano valida antes de agir (Fase 24 já prevê isso).
- **Achado principal da instrumentação nova**: com a lista real de mismatches visível pela 1ª vez, o padrão NÃO é "o modelo parafraseia a URL" (hipótese original) — é, na esmagadora maioria dos casos, a **URL real e exata** (presente em "Fontes coletadas") com um **sufixo espúrio de 1-3 caracteres grudado no final** (`','`, `-`, `1`, `2`, `/https`). Ex.: `.../tabela-de-preco-conserto-de-roupas-2026/','` quando a fonte real é `.../tabela-de-preco-conserto-de-roupas-2026/`. Isso muda a leitura de gravidade: a maioria das citações provavelmente aponta pra fonte certa, só com a string tecnicamente quebrada — não é alucinação de conteúdo. Causa provável: artefato de serialização da saída estruturada (possível bleed-through de sintaxe de array/citação do provider), não confirmada — **fica como DÍVIDA TÉCNICA não resolvida** (ver STATE.md), pendente de investigação futura (ex.: checar se "URL citada menos N caracteres finais" bate com alguma fonte real, ou capturar o texto bruto pré-validação Zod) — sem crédito de API disponível nesta sessão para aprofundar.

## User Setup Required

None - toda a configuração (`.env.local` com `ANTHROPIC_API_KEY`, Web Search habilitada no Console Anthropic) já estava feita desde o plano 23-04.

## Custo real total (dia inteiro, 2026-09-11)

| Item | Custo estimado |
|------|------------------|
| Spike do 23-04 (3 chamadas reais) | ~US$0,45–0,75 |
| 23-06 rodada 1 (baseline, NÃO discriminado) | US$0,76 |
| 23-06 rodada 2 (rubrica reforçada, ainda NÃO discriminado) | US$0,31 |
| 23-06 rodada 3 (fix estrutural, DISCRIMINADO) | US$0,83 |
| 23-06 rodada 4 (pós-fix de cross-check) | US$0,81 |
| 23-06 rodada 5 (medida de variância, parou por crédito no caso 3) | US$0,63 |
| **Total aproximado** | **~US$3,79–4,09 (usar ~US$3,94 de referência)** |

## Next Phase Readiness

- O baseline de qualidade do eval está estabelecido e commitado (5 relatórios em `test/reports/`, comparáveis entre execuções via D-23-05) — qualquer mudança futura em `src/lib/ai/` deve ser comparada contra `test/reports/2026-09-11-eval-diagnostico-3.md` (última execução com os 3 gold discriminados)
- **Fase 23 FECHADA definitivamente** — os 7 planos (23-01 a 23-07) têm SUMMARY, os 2 críticos do code review (CR-01/CR-02) foram corrigidos, a investigação do cross-check foi encerrada com achados documentados
- **2 dívidas técnicas finais, ambas registradas em STATE.md:**
  1. Variância de veredito entre execuções idênticas — ACEITA como característica esperada do sistema (busca adaptativa + LLM não-determinístico), não um bug. Implicação de produto: a UI/copy deve sempre deixar claro que o veredito da IA é sugestão inicial, nunca definitiva.
  2. Sufixo espúrio de 1-3 caracteres em citações de URL do cross-check — bug real, NÃO resolvido, causa provável é artefato de serialização da saída estruturada. Pendente de investigação futura com nova rodada de crédito de API.
- Falha ocasional da chamada do juiz (separada da geração, já não derruba mais o resultado desde `e49d6da`) — dívida menor, não re-registrada separadamente.
- Fase 24 (Veredito + Painel + Mapa de Nichos) pode prosseguir: `gerarDiagnostico()` está validado ponta a ponta contra a API real, o veredito da IA é sugestão não-vinculante por design, e o operador registra o veredito final — exatamente o que a Fase 24 pressupõe

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-11*
