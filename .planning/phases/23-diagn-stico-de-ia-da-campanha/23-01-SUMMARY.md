---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 01
subsystem: testing
tags: [zod, ai, structured-output, fixtures, harness, anti-generico, xss]

requires:
  - phase: 22-campanha-de-explora-o-de-nicho
    provides: tabela campanhas + rota /campanhas/[id] (contexto para a seção de diagnóstico)
provides:
  - "diagnosticoSchema (contrato Zod de saída do LLM) + type Diagnostico"
  - "Helpers de gate puros: filtrarFontes, assertTemFonte (DIAGNOSTICO-02), urlSegura (XSS T-23-02)"
  - "9 fixtures JSON de referência (3 gold + 1 adversarial + 5 ruins) com _sources simulado"
  - "Harness estrutural scripts/test-diagnostico-estrutural.cjs (61 asserções, sem API, sem banco)"
  - "Scripts npm test:diagnostico-estrutural e migrate:diagnosticos"
affects: [23-02 (schema.ts .$type<Diagnostico>()), 23-03 (gerar-diagnostico contra o contrato), 23-05 (UI consome type + urlSegura no href), eval-diagnostico]

tech-stack:
  added: []
  patterns:
    - "Contrato Zod anti-genérico com .refine + enums + arrays min/max como schema único grande"
    - "Módulo de contrato sem efeito colateral de import (só zod) — importável por harness .cjs fora do bundler"
    - "Harness .cjs sobre fixtures JSON versionadas, sem temp DB nem next-cache-stub"
    - "Fixture = objeto do schema + campo extra _sources simulando result.sources do AI SDK"

key-files:
  created:
    - src/lib/ai/diagnostico-schema.ts
    - test/fixtures/diagnostico/ok-costureira.json
    - test/fixtures/diagnostico/ok-motoboy.json
    - test/fixtures/diagnostico/ok-estetica.json
    - test/fixtures/diagnostico/adversarial-so-marketing.json
    - test/fixtures/diagnostico/bad-zero-mais-forte.json
    - test/fixtures/diagnostico/bad-dois-mais-forte.json
    - test/fixtures/diagnostico/bad-enum-veredito.json
    - test/fixtures/diagnostico/bad-achados-sem-tipo.json
    - test/fixtures/diagnostico/bad-truncado.json
    - scripts/test-diagnostico-estrutural.cjs
  modified:
    - package.json

key-decisions:
  - "Mensagem do .refine extraída para constante exportada GATILHO_MAIS_FORTE_MSG (+ DIAGNOSTICO_SEM_FONTE_MSG) — idioma de CAMPANHA_JANELA_INVALIDA_MSG"
  - "Doc-comment do schema evita as strings literais server-only / @ai-sdk / @/db/ para não falhar o grep de guarda da própria acceptance criterion"
  - "Fixture adversarial com 3 achados alegacao_marketing + 2 dado_quantificavel (grep -c >= 2 folgado)"

patterns-established:
  - "Gate de fontes lê result.sources (via filtrarFontes), nunca as URLs escritas pelo modelo dentro do objeto"
  - "urlSegura (allowlist http/https) é obrigatório antes de qualquer href autorado pelo LLM — z.string().url() aceita javascript:"

requirements-completed: [DIAGNOSTICO-02, DIAGNOSTICO-03, DIAGNOSTICO-04, DIAGNOSTICO-05, DIAGNOSTICO-06, DIAGNOSTICO-07, DIAGNOSTICO-08, DIAGNOSTICO-09]

duration: 25min
completed: 2026-09-10
---

# Phase 23 Plan 01: Contrato do Diagnóstico de IA Summary

**Schema Zod anti-genérico (DIAGNOSTICO-03..09) + helpers de gate puros + 9 fixtures de referência + harness estrutural de 61 asserções que prova o contrato sem chamar o Claude e sem tocar o banco.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-10T12:04:00Z (aprox.)
- **Completed:** 2026-09-10
- **Tasks:** 3
- **Files modified:** 12 (11 criados + package.json)

## Accomplishments

- `src/lib/ai/diagnostico-schema.ts`: `diagnosticoSchema` com as 7 chaves de topo (`indice_saturacao`, `gatilhos_dor`, `objecoes`, `ticket_medio`, `achados`, `rascunho_primeira_mensagem`, `veredito_sugerido`), `.refine` de exatamente 1 gatilho `mais_forte`, `export type Diagnostico`, e os 3 helpers puros (`filtrarFontes`, `assertTemFonte`, `urlSegura`). Importa **só** `zod` — sem SDK de IA, sem `server-only`, sem banco.
- 9 fixtures em `test/fixtures/diagnostico/`: 3 gold com vereditos discriminados (costureira→`mudar_angulo`, motoboy→`aprofundar`, estética→`abandonar`), 1 adversarial (só-marketing, valida no schema), 5 ruins (uma violação-alvo cada). Todas com `_sources` simulado e cross-check de URLs completo nos casos que validam.
- `scripts/test-diagnostico-estrutural.cjs`: 61 asserções `OK`, 0 `FAIL`, exit 0, roda em < 5s sem `ANTHROPIC_API_KEY` e sem tocar `data/crm.db`. Cobre as dimensões 1/2/5/6/9 do 23-AI-SPEC §5. Prova de mutação executada: reclassificar `bad-dois-mais-forte.json` como `ok-` → exit 1 (desfeito).
- `package.json`: `test:diagnostico-estrutural` e `migrate:diagnosticos` (alvo do 23-02, entrada nasce aqui para o `package.json` ser tocado por um único plano por onda).

## Task Commits

1. **Task 1: Contrato Zod do diagnóstico + helpers de gate puros** - `f524cab` (feat)
2. **Task 2: Fixtures de referência do diagnóstico** - `d90db3d` (test)
3. **Task 3: Harness estrutural anti-genérico + scripts npm** - `9e82bb7` (test)

## Files Created/Modified

- `src/lib/ai/diagnostico-schema.ts` - Contrato de saída do LLM + helpers de gate (fontes, XSS)
- `test/fixtures/diagnostico/*.json` - 9 fixtures de referência (3 gold, 1 adversarial, 5 ruins)
- `scripts/test-diagnostico-estrutural.cjs` - Harness estrutural sobre as fixtures
- `package.json` - Scripts `test:diagnostico-estrutural` e `migrate:diagnosticos`

## Decisions Made

- **Constantes de mensagem exportadas.** `GATILHO_MAIS_FORTE_MSG` e `DIAGNOSTICO_SEM_FONTE_MSG` no topo do módulo (idioma de `CAMPANHA_JANELA_INVALIDA_MSG` em `src/lib/validations.ts`), disponíveis para o harness sem duplicar string.
- **Doc-comment sem tokens de guarda.** A acceptance criterion da Task 1 roda `grep -E "server-only|@ai-sdk|from \"ai\"|@/db/"` e falha em QUALQUER linha, inclusive comentário. O doc-comment da restrição de imports foi redigido sem as strings literais (ex.: "o marcador de módulo-servidor", "o cliente de banco Drizzle").
- **`z.string().url()` mantido** conforme o corpo VERBATIM do 23-AI-SPEC §4b (Zod 4.4.3 ainda expõe o método; `tsc` e `lint` limpos). O helper `urlSegura` é o controle real de XSS — documentado no comentário que `z.string().url()` aceita `javascript:`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- A acceptance criterion da Task 1 para o teste de import dinâmico (`node -e "...register('./scripts/ts-alias-loader.mjs', ...pathToFileURL('./scripts/'))..."`) tem o caminho do loader errado (resolve para `scripts/scripts/`). Verificado com o caminho correto (`'./ts-alias-loader.mjs'` relativo a `./scripts/`) — o import dinâmico do schema funciona. Não é defeito do código entregue.

## User Setup Required

None para este plano — o harness estrutural roda sem `ANTHROPIC_API_KEY` e sem Web Search habilitada. Esse setup só é necessário a partir da Onda 3 (geração real / `eval-diagnostico.mjs`).

## Next Phase Readiness

- `type Diagnostico` exportado e pronto para `.$type<Diagnostico>()` no plano 23-02 (`src/db/schema.ts`).
- `diagnosticoSchema` é o contrato que 23-03 (`gerar-diagnostico.ts`) implementa via `Output.object({ schema })`.
- `urlSegura` / `filtrarFontes` / `assertTemFonte` prontos para 23-03 (gate) e 23-05 (href seguro na UI).
- Harness (sensor Nyquist) verde e no lugar antes da lógica que ele mede.

## Self-Check: PASSED

- Arquivos criados conferidos em disco (schema, harness, fixtures, SUMMARY): todos presentes.
- 9 fixtures em `test/fixtures/diagnostico/`.
- Commits `f524cab`, `d90db3d`, `9e82bb7` presentes no histórico.
- Gates: `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (4 warnings pré-existentes em `lixeira-table.tsx`, fora de escopo); `npm run test:diagnostico-estrutural` verde (61 OK, 0 FAIL); prova de mutação → exit 1.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-10*
