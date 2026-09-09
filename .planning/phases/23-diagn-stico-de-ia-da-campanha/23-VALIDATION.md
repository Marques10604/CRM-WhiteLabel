---
phase: 23
slug: diagn-stico-de-ia-da-campanha
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-05
updated: 2026-09-09
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node scripts sob medida (molde `scripts/test-*.cjs` do repo) — sem framework de teste externo |
| **Config file** | none — `ts-alias-loader.mjs` já existe no repo |
| **Quick run command** | `npm run test:diagnostico-estrutural` |
| **Full suite command** | `npm run lint && npx tsc --noEmit && npm run verify:schema && npm run test:diagnostico-estrutural` |
| **Estimated runtime** | ~30 segundos (nenhuma chamada de API — só fixtures) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:diagnostico-estrutural` (ou o gate do repo se a task não tocar IA)
- **After every plan wave:** Run the full suite command above
- **Before `/gsd-verify-work`:** Full suite green + `node scripts/eval-diagnostico.mjs --gold` rodado à mão (precisa de `ANTHROPIC_API_KEY`)
- **Max feedback latency:** 30 segundos (harness estrutural); a avaliação de qualidade real (`eval-diagnostico.mjs`) é on-demand e fora do CI

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T-23-01-1 | 23-01 | 1 | DIAGNOSTICO-02..09 | T-23-02, T-23-07 | Contrato Zod estrito; `urlSegura` allowlista esquema de URL; arquivo importa só `zod` | code | `npx tsc --noEmit` | ❌ Wave 1 cria | ⬜ pending |
| T-23-01-2 | 23-01 | 1 | DIAGNOSTICO-02..09 | T-23-06 | Fixtures com `_sources` simulado permitem cross-check offline | code | `node -e` (parse das 9 fixtures) | ❌ Wave 1 cria | ⬜ pending |
| T-23-01-3 | 23-01 | 1 | DIAGNOSTICO-02..09 | T-23-02, T-23-06, T-23-07 | Portões estruturais das dims 1/2/5/6/9 do AI-SPEC §5 | code | `npm run test:diagnostico-estrutural` | ❌ Wave 1 cria | ⬜ pending |
| T-23-02-1 | 23-02 | 2 | DIAGNOSTICO-01, 10 | T-23-12 | Tabela append-only, sem `deletedAt`, fora da ALLOWLIST de hard-delete | code | `npx tsc --noEmit && npm run guard:no-hard-delete` | ✅ gate existe | ⬜ pending |
| T-23-02-2 | 23-02 | 2 | DIAGNOSTICO-01, 10 | T-23-10 | Backup + contagem-testemunha + DDL idempotente guardada por `sqlite_master` | code | `npm run migrate:diagnosticos` (2x) | ❌ Wave 2 cria | ⬜ pending |
| T-23-02-3 | 23-02 | 2 | DIAGNOSTICO-01, 10 | T-23-11 | Conjunto ESTRITO de colunas + 3 índices; mutação provada por DROP em cópia | code | `npm run verify:schema` | ✅ estende | ⬜ pending |
| T-23-03-1 | 23-03 | 2 | (infra) | T-23-SC | Checkpoint humano bloqueante antes do `npm i`; versões pinadas exatas | code | `node -e` (versões pinadas) | ✅ package.json | ⬜ pending |
| T-23-03-2 | 23-03 | 2 | DIAGNOSTICO-03..09 | T-23-03 | System prompt manda tratar conteúdo web como dado, nunca instrução | code | `npx tsc --noEmit` | ❌ Wave 2 cria | ⬜ pending |
| T-23-03-3 | 23-03 | 2 | DIAGNOSTICO-02, 10 | T-23-01, T-23-04, T-23-06, T-23-08 | `server-only`; gate lê `res.sources`; `maxUses`/`maxOutputTokens`/`MAX_TENTATIVAS` como tetos; logs sem segredo | code | `npx tsc --noEmit && npm run lint && npm run test:diagnostico-estrutural` | ✅ harness | ⬜ pending |
| T-23-04-1 | 23-04 | 3 | DIAGNOSTICO-01, 02, 10 | T-23-05, T-23-07, T-23-08 | `safeParse` antes de query; guarda de campanha; insert de falha antes de retornar | code | `npx tsc --noEmit && npm run lint && npm run guard:no-hard-delete` | ✅ gates | ⬜ pending |
| T-23-04-2 | 23-04 | 3 | (setup) | T-23-01 | Chave só em `.env.local`, não rastreada pelo git | code | `node -e` (existe + não rastreada) | n/a | ⬜ pending |
| T-23-04-3 | 23-04 | 3 | DIAGNOSTICO-02, 10 | T-23-04, T-23-08 | Config do modelo medida, não assumida; `finishReason` diferente de `length` | code + human | `npx tsc --noEmit && npm run lint && npm run test:diagnostico-estrutural` | ✅ harness | ⬜ pending |
| T-23-05-1 | 23-05 | 4 | DIAGNOSTICO-07, 09 | T-23-03 | Distinção dado × marketing em cor + ícone + rótulo; só tokens `--status-*` | code | `npx tsc --noEmit && npm run lint && npm run verify:brand && npm run check:contrast` | ✅ gates | ⬜ pending |
| T-23-05-2 | 23-05 | 4 | DIAGNOSTICO-08 | T-23-15 | Zero caminhos de envio ou persistência do rascunho (grep de `wa.me`/`mailto:`/`@/actions/`) | code + human | `npx tsc --noEmit && npm run lint && npm run verify:brand` | ✅ gates | ⬜ pending |
| T-23-05-3 | 23-05 | 4 | DIAGNOSTICO-03..09 | T-23-02, T-23-03, T-23-14 | `urlSegura` antes de todo `href`; `rel="noopener noreferrer"`; itálico/muted na alegação | code + human | `npx tsc --noEmit && npm run lint && npm run verify:brand && npm run check:contrast` | ✅ gates | ⬜ pending |
| T-23-06-1 | 23-06 | 4 | DIAGNOSTICO-09 | — | Dataset versionado com veredito esperado dos 3 gold | code | `node -e` (composição 3/4/1) | ❌ Wave 4 cria | ⬜ pending |
| T-23-06-2 | 23-06 | 4 | DIAGNOSTICO-02, 04, 07, 09 | T-23-04, T-23-06, T-23-16 | Execução sequencial; sem entrada em `package.json`; sem import de `@/db/client` | code | `npm run lint && node -e` (não é script npm) | ❌ Wave 4 cria | ⬜ pending |
| T-23-06-3 | 23-06 | 4 | DIAGNOSTICO-02, 09 | T-23-06, T-23-16 | Discriminação dos 3 gold + spot-check humano de URLs | code + human | `node -e` (relatório existe em `test/reports`) | ❌ Wave 4 cria | ⬜ pending |
| T-23-07-1 | 23-07 | 5 | DIAGNOSTICO-01, 10 | T-23-01, T-23-04 | Sem auto-disparo em `useEffect`; client não importa `@/lib/ai/*`; botão disabled no pending | code | `npx tsc --noEmit && npm run lint && npm run verify:brand` | ✅ gates | ⬜ pending |
| T-23-07-2 | 23-07 | 5 | DIAGNOSTICO-02, 10 | T-23-07, T-23-12 | Re-validação do payload lido do DB; falha vira bloco de erro; histórico read-only | code | `npx tsc --noEmit && npm run lint && npm run verify:brand && npm run check:contrast` | ✅ gates | ⬜ pending |
| T-23-07-3 | 23-07 | 5 | DIAGNOSTICO-01, 02, 10 | T-23-13 | `maxDuration = 120`; `runtime` não declarado (Node obrigatório por `better-sqlite3`) | code + human | `npx tsc --noEmit && npm run lint && npm run build && npm run verify:schema && npm run test:diagnostico-estrutural` | ✅ gates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Continuidade de amostragem:** 21 de 21 tasks têm comando automatizado. Nenhuma sequência de 3
tasks sem verificação automatizada. As 2 tasks de checkpoint (T-23-03-1 legitimidade de pacote,
T-23-04-2 setup do usuário) também carregam asserção automatizada além da resposta humana.

---

## Wave 0 Requirements

Toda a infraestrutura de teste desta fase é criada no **plano 23-01 (Wave 1)**, que é a Wave 0
efetiva — nenhum plano posterior depende de sensor inexistente:

- [ ] `src/lib/ai/diagnostico-schema.ts` — contrato Zod + `filtrarFontes`/`assertTemFonte`/`urlSegura` (sem efeito colateral de import, Pitfall 10)
- [ ] `test/fixtures/diagnostico/*.json` — 9 fixtures (3 gold, 1 adversarial, 5 ruins) com `_sources` simulado
- [ ] `scripts/test-diagnostico-estrutural.cjs` — harness das dimensões 1/2/5/6/9 do 23-AI-SPEC §5
- [ ] `package.json` — scripts `test:diagnostico-estrutural` e `migrate:diagnosticos`

Extensões de gate existente (plano 23-02, Wave 2):

- [ ] `scripts/verify-schema.cjs` — `requiredTables`, `requiredIndexes` e bloco estrito `REQUIRED_DIAGNOSTICOS_COLUMNS`, com mutação provada

Eval on-demand (plano 23-06, Wave 4 — fora do CI):

- [ ] `test/nichos-referencia.json` + `scripts/eval-diagnostico.mjs` + primeiro relatório em `test/reports/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Geração de diagnóstico real ponta a ponta (busca web, fontes citadas, objeto válido) | DIAGNOSTICO-01..07, 09 | Precisa de `ANTHROPIC_API_KEY` + Web Search habilitada no Console Anthropic; custa dinheiro; 30-90s | `node scripts/eval-diagnostico.mjs --gold` — vereditos discriminados (costureira para `mudar_angulo`, motoboy para `aprofundar`, estética para `abandonar`) |
| Configuração real do Sonnet 5 (`effort`, `maxOutputTokens`, `temperature`) | (infra, Open Question 1) | Adaptive thinking sempre ligado; comportamento do provider `@4.0.49` não documentado por versão | `node scripts/spike-modelo-diagnostico.mjs` — conferir `finishReason` diferente de `length`, pelo menos 1 fonte, e as queries de busca capturadas |
| Fluxo React da seção em `/campanhas/[id]` (botão, pending, resultado, rejeição, histórico) | DIAGNOSTICO-01, 02, 10 | Fluxo React não verificável por grep; host de 4GB não roda navegador + sessão de agente | UAT humano: abrir campanha, gerar, ver resultado com tags dado/marketing distintas, regenerar, ver custo e histórico, recarregar e confirmar que nada dispara sozinho |
| Rascunho de 1ª mensagem editável e copiável, nunca enviado | DIAGNOSTICO-08 | Interação de `<Textarea>` + área de transferência | UAT humano: editar o rascunho, copiar, colar e confirmar que veio o texto EDITADO; confirmar ausência de botão de envio ou de salvar |
| Aparência em tema escuro de toda a seção | (brand.md) | Inspeção visual | UAT humano: ativar o tema escuro e reconferir badges, bloco de erro, links de fonte e o número-herói de saturação |
| Spot-check de sustentação das fontes citadas | DIAGNOSTICO-02 | Exige abrir a URL e ler a página | UAT humano: abrir 2 ou 3 URLs por diagnóstico revisado e confirmar que a página existe e sustenta a afirmação atribuída |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-09 (gsd-planner)
