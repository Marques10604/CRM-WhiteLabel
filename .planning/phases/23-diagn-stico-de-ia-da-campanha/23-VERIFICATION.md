---
phase: 23-diagn-stico-de-ia-da-campanha
verified: 2026-09-11T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
known_debt_accepted:
  - item: "Variância de veredito entre execuções idênticas do LLM"
    reason: "Comportamento esperado do sistema (busca adaptativa + LLM não-determinístico), não bug de produto. Já registrado em STATE.md como dívida técnica FINAL aceita pelo usuário."
  - item: "Sufixo espúrio de 1-3 caracteres em URLs do cross-check de citações"
    reason: "Bug real e documentado (STATE.md), investigação futura — não bloqueia porque o cross-check é advisory (WR-04), nunca bloqueia o render, e o gate hard de zero-fontes (DIAGNOSTICO-02) continua correto."
human_verification:
  - test: "Abrir uma campanha em /campanhas/[id] no navegador com nenhum diagnóstico ainda; clicar 'Gerar diagnóstico'; observar o estado pending (spinner, aviso de custo); aguardar 30-90s; ver o resultado renderizado (saturação, gatilhos, objeções, ticket, achados com badges de 3 tipos, rascunho editável, veredito, fontes clicáveis)"
    expected: "Nenhuma geração automática ao abrir a página; botão dispara a Server Action; UI mostra pending com Loader2 + texto 'Gerando diagnóstico…'; ao concluir, toast 'Diagnóstico gerado.', scroll até o h2, e os 9 blocos do resultado aparecem com hierarquia visual correta (número-herói da saturação, borda de acento só no gatilho mais forte, achados com 3 cores/ícones distintos, veredito num chip rotulado 'Sugestão da IA (não vinculante)')"
    why_human: "Fluxo React completo (useActionState, transições de estado, scrollIntoView, clipboard) não é verificável por grep; host de 4GB não roda navegador + sessão de agente juntos nesta sessão"
  - test: "Com um diagnóstico já existente, clicar 'Gerar novo diagnóstico'; depois expandir 'Ver gerações anteriores'"
    expected: "Botão primário vira 'outline' com o texto 'Gerar novo diagnóstico' + caption de custo; nova linha é criada em diagnosticos (histórico cresce); disclosure mostra a geração anterior com data/veredito/nº fontes"
    why_human: "Interação de disclosure + estado read-only só visível no navegador"
  - test: "Editar o texto no Textarea do rascunho de 1ª mensagem, clicar 'Copiar mensagem', colar em outro lugar"
    expected: "O texto colado é o EDITADO, não o original gerado pela IA; botão mostra 'Copiado' por 2s e volta; nenhuma chamada de rede/persistência acontece ao editar ou copiar"
    why_human: "Interação de Textarea controlado + Clipboard API"
  - test: "Repetir os 3 checks acima com o tema escuro (`.dark`) forçado"
    expected: "Badges de tipo de achado, chip de veredito, bloco de erro (border-destructive/50 bg-destructive/10) e links de fonte mantêm contraste e legibilidade adequados"
    why_human: "Inspeção visual de tokens OKLCH em dark mode"
  - test: "Provocar o estado de erro real (ex.: revogar temporariamente a Web Search tool no Console Anthropic, ou usar um nicho sem presença web) e observar o bloco de erro"
    expected: "Bloco `border-destructive/50 bg-destructive/10` com título 'Diagnóstico não gerado', motivo específico do campo `erro`, timestamp da tentativa, botão 'Tentar de novo'; toast de falha; NUNCA um resultado parcial/genérico renderizado"
    why_human: "Requer disparar uma falha real ponta a ponta pelo navegador; o gate DIAGNOSTICO-02 já foi validado por código (retorna `{ok:false}`) e pela API real (spike 23-04), mas a renderização do bloco de erro na tela não foi vista por um humano"
---

# Phase 23: Diagnóstico de IA da Campanha — Verification Report

**Phase Goal:** O usuário gera, sob demanda, um diagnóstico de IA estruturado e fundamentado em fontes web reais para uma campanha de exploração de nicho — saturação, gatilhos de dor, objeções, ticket médio, achados classificados (dado/relato/marketing), rascunho de mensagem e um veredito sugerido não vinculante — sem cache, sempre com custo visível, e rejeitando qualquer geração sem fonte real.

**Verified:** 2026-09-11T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (DIAGNOSTICO-01..10) | Status | Evidence |
|---|---|---|---|
| 1 | O usuário gera, sob demanda (botão explícito), um diagnóstico — nunca automático, sempre do zero | ✓ VERIFIED | `gerar-diagnostico-button.tsx`: único disparo é `onClick={handleGerar}`, nenhum `useEffect` de auto-trigger. `diagnostico-secao.tsx`: Server Component só faz `SELECT`, nunca chama `gerarDiagnostico`. Sem checagem "já existe" em `diagnostico-actions.ts` — toda invocação insere linha nova. |
| 2 | O diagnóstico pesquisa a web e cita fontes; sem nenhuma fonte é rejeitado | ✓ VERIFIED | `gerar-diagnostico.ts:162-165`: `filtrarFontes(res.sources)` (nunca URLs auto-declaradas) + `if (fontes.length === 0) throw new DiagnosticoSemFonteError()`. Retry reforçado até 2 tentativas (`REFORCO_RETRY`). `diagnostico-actions.ts:133-152`: catch grava `status:"falhou"` + `erro`, devolve `{success:false}` — nunca falso resultado. Harness Grupo D confirma `assertTemFonte([])` lança. Validado contra API real no spike 23-04. |
| 3 | Índice de saturação numérico = contagem de concorrentes diretos | ✓ VERIFIED | `diagnostico-schema.ts:86`: `concorrentes_diretos: z.number().int().nonnegative()`. Renderizado como número-herói mono em `diagnostico-resultado.tsx:130-139`, sem cor semântica (regra "contagem não é veredito" da AI-SPEC). Harness Grupo B confirma o tipo. |
| 4 | Até 3 gatilhos de dor observáveis, o mais forte destacado | ✓ VERIFIED | Schema: `.min(1).max(3)` + `.refine` exatamente 1 `mais_forte:true` (`GATILHO_MAIS_FORTE_MSG`) + 2º `.refine` de evidência (`GATILHO_MAIS_FORTE_EVIDENCIA_MSG`, D-23-06). UI: card do gatilho mais forte ganha `border-primary` + badge "Mais forte"; demais sem acento. Harness Grupo B/G/H cobrem ambos os refines. |
| 5 | 2-3 objeções, cada uma com resposta sugerida | ✓ VERIFIED | Schema: `objecoes: z.array(objecao).min(2).max(3)`, `objecao` exige `resposta_sugerida`. UI renderiza par objeção/"Resposta sugerida:" em `diagnostico-resultado.tsx:170-180`. |
| 6 | Ticket médio estimado com base/fonte citada | ✓ VERIFIED | Schema: `ticket_medio.valor_estimado_brl` positivo + `base` (10-400 chars) + `fonte_url`. UI renderiza valor em BRL formatado + "Base: …" + link de fonte. |
| 7 | Cada achado marcado dado quantificável / alegação de marketing (nunca mesmo peso visual) | ✓ VERIFIED | Schema evoluiu para 3 categorias (`dado_quantificavel` / `relato_qualitativo` / `alegacao_marketing`, D-23-06 — extensão documentada, não remoção da distinção exigida pelo requisito). `AchadoTipoBadge` distingue as 3 em cor+ícone (`Hash`/`MessageCircle`/`Megaphone`, tokens `--status-info`/`--status-neutral`/`--status-warning`); `diagnostico-resultado.tsx:206-214` aplica tratamento de texto adicional (pleno / muted / itálico+muted) — 3 eixos simultâneos, nunca mesmo peso. **CR-01 do 23-REVIEW.md (mapas do badge desatualizados para o 3º valor, causando erro de compilação e crash de render) foi corrigido** — confirmado por `npx tsc --noEmit` limpo nesta verificação. |
| 8 | Rascunho de 1ª mensagem editável, nunca enviado automaticamente | ✓ VERIFIED | `rascunho-mensagem.tsx`: `Textarea` controlado (`value={texto}`), botão "Copiar mensagem" lê o state vivo (edições incluídas), nenhuma Server Action de envio/persistência, nenhum import de `wa.me`/`mailto:`/actions de disparo. |
| 9 | Veredito sugerido (aprofundar/mudar ângulo/abandonar), não vinculante | ✓ VERIFIED | Schema: enum de 3 valores + `justificativa`. `VereditoSugeridoChip` + `diagnostico-resultado.tsx:233-242` sempre envolve o chip com "Sugestão da IA (não vinculante)" + caption "É insumo para a sua decisão. O veredito final é registrado por você." |
| 10 | Regeneração livre, sem cache, custo sempre visível | ✓ VERIFIED | `diagnostico-actions.ts`: nenhum `SELECT` de "já existe" antes de gerar. Linha de metadados sempre renderizada (`{n} fontes · {input}+{output} tokens · {n} buscas · data`) tanto no resultado quanto no histórico (`HistoricoDisclosure`). Botão vira "Gerar novo diagnóstico" + caption "Cada geração é uma chamada nova e paga." quando já existe diagnóstico. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/ai/diagnostico-schema.ts` | Contrato Zod anti-genérico (DIAGNOSTICO-02..09) | ✓ VERIFIED | 219 linhas; schema completo com 2 `.refine`; `filtrarFontes`/`assertTemFonte`/`urlSegura`/`normalizarUrl` exportados; só importa `zod` (restrição dura respeitada). |
| `src/lib/ai/diagnostico-prompt.ts` | `SYSTEM_PROMPT` fixo + `montarUserPrompt` | ✓ VERIFIED | Existe, consumido por `gerar-diagnostico.ts:36-40`. |
| `src/lib/ai/gerar-diagnostico.ts` | Núcleo `generateText` + `Output.object` + gate de fontes + retry | ✓ VERIFIED | `server-only`; loop de 2 tentativas com `buscasTentativa` resetado por iteração (CR-02 corrigido); gate DIAGNOSTICO-02; cross-check FM2 com `normalizarUrl` (WR-01/WR-04 mitigados, não eliminados — ver dívida conhecida). |
| `src/actions/diagnostico-actions.ts` | Server Action que persiste 1 linha por geração | ✓ VERIFIED | `safeParse` antes do DB; guarda de FK forjada; grava `status:"ok"`/`"falhou"` sempre; `revalidatePath`. |
| `src/db/schema.ts` (`diagnosticos`) | Tabela append-only, 3 índices | ✓ VERIFIED | Confirmado tanto no `schema.ts` quanto no `data/crm.db` real via PRAGMA (11 colunas, 3 índices, 0 linhas — esperado, nenhuma geração real via UI ainda). `verify:schema` cobre `REQUIRED_DIAGNOSTICOS_COLUMNS` com conjunto estrito. |
| `src/components/diagnostico-secao.tsx` | Server Component: decide vazio/resultado/erro + histórico | ✓ VERIFIED | 3 estados implementados + re-`safeParse` do payload lido do DB (Pitfall 11) + `HistoricoDisclosure`. |
| `src/components/diagnostico-resultado.tsx` | Render dos 9+ blocos do objeto validado | ✓ VERIFIED | Todos os blocos do UI-SPEC presentes na ordem especificada; `urlSegura` allowlist antes de todo `href`. |
| `src/components/achado-tipo-badge.tsx` | Badge dado/relato/marketing | ✓ VERIFIED (pós-fix) | 3 mapas cobrindo as 3 chaves do enum — `npx tsc --noEmit` limpo. |
| `src/components/veredito-sugerido-chip.tsx` | Chip do veredito | ✓ VERIFIED | 3 valores mapeados em `--status-*`. |
| `src/app/campanhas/[id]/_components/gerar-diagnostico-button.tsx` | Botão client com `useActionState` | ✓ VERIFIED | Estados pending/erro/sucesso via toast; nunca importa `@/lib/ai/*`. |
| `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx` | Textarea editável + copiar | ✓ VERIFIED | Ver truth #8. WR-02 (sem `try/catch` no `navigator.clipboard.writeText`) permanece aberto — warning não-bloqueante, não corrigido nesta rodada. |
| `src/app/campanhas/[id]/page.tsx` | Integração da seção + `maxDuration` | ✓ VERIFIED | `export const maxDuration = 120;` + `<DiagnosticoSecao campanhaId={campanhaId} />` como último filho do container. |
| `scripts/test-diagnostico-estrutural.cjs` + fixtures | Harness estrutural, sem chamada de API | ✓ VERIFIED | Executado nesta verificação: todas as asserções (Grupos A-H) passaram, incluindo os 2 refines novos. |
| `scripts/eval-diagnostico.mjs` + `test/nichos-referencia.json` | Eval on-demand contra os 12 casos-referência | ✓ VERIFIED (existe e roda) | 5 execuções reais registradas em `test/reports/`; discriminação alcançada na rodada 3, variância entre rodadas 4/5 é dívida aceita (ver frontmatter). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `gerar-diagnostico-button.tsx` | `diagnostico-actions.ts` | `useActionState(gerarDiagnosticoAction)` + `startTransition` | ✓ WIRED | |
| `diagnostico-actions.ts` | `gerar-diagnostico.ts` | `await gerarDiagnostico({...})` | ✓ WIRED | |
| `diagnostico-actions.ts` | `db.schema` (`diagnosticos`) | `db.insert(diagnosticos).values(...).returning()` (sucesso) + insert de falha (catch) | ✓ WIRED | Ambos os caminhos gravam linha. |
| `diagnostico-secao.tsx` | `db.schema` (`diagnosticos`) | `db.select().from(diagnosticos).where(eq(campanhaId)).orderBy(desc(criadoEm))` | ✓ WIRED | |
| `diagnostico-secao.tsx` | `diagnostico-resultado.tsx` | prop `diagnostico={parsed.data}` após `diagnosticoSchema.safeParse` | ✓ WIRED | Re-validação na fronteira do DB confirmada. |
| `diagnostico-resultado.tsx` | `achado-tipo-badge.tsx` / `veredito-sugerido-chip.tsx` / `rascunho-mensagem.tsx` | import + render direto | ✓ WIRED | |
| `campanhas/[id]/page.tsx` | `diagnostico-secao.tsx` | `<DiagnosticoSecao campanhaId={campanhaId} />` | ✓ WIRED | |
| `gerar-diagnostico.ts` | `res.sources` (AI SDK / Anthropic web search) | `filtrarFontes(res.sources)` | ✓ WIRED | Validado por spike real (23-04) e 5 rodadas do eval (23-06). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `diagnostico-secao.tsx` | `linhas` | `db.select().from(diagnosticos)` real (SQLite, não mock) | Sim — tabela real, 0 linhas hoje (nenhuma geração via UI ainda, esperado) | ✓ FLOWING |
| `diagnostico-resultado.tsx` | `diagnostico` (prop) | `diagnosticoSchema.safeParse(ultima.payload)` do banco | Sim, quando existir uma linha `status:"ok"` | ✓ FLOWING (estrutura provada; sem linha real no DB local para inspecionar visualmente) |
| `gerar-diagnostico.ts` | `fontes` / `diagnostico` | Chamada real `generateText` com `web_search` tool contra a API Anthropic | Sim — confirmado por 3 chamadas do spike 23-04 + 5 rodadas do eval 23-06, não por mock | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Harness estrutural (Grupos A-H, incluindo os 2 refines novos) | `npm run test:diagnostico-estrutural` | "OK: todas as asserções passaram." | ✓ PASS |
| Zero erros de tipo no repo (incl. CR-01) | `npx tsc --noEmit -p tsconfig.json` | Sem output (exit 0) | ✓ PASS |
| Tabela `diagnosticos` aplicada no DB real com o conjunto estrito de colunas | `PRAGMA table_info(diagnosticos)` via `better-sqlite3` | 11 colunas, 3 índices, 0 linhas | ✓ PASS |
| Gate de schema-drift cobre `diagnosticos` | `grep REQUIRED_DIAGNOSTICOS_COLUMNS scripts/verify-schema.cjs` | Bloco presente, listado no gate | ✓ PASS |

*(Os 5 gates do repo — `verify:schema`, as 10 suítes `test:*`, `guard:no-hard-delete`, `lint`, `build` — já rodaram fora desta sessão de verificação, per contexto fornecido pelo orquestrador, e são aceitos como verdes sem re-execução.)*

### Probe Execution

Nenhuma probe convencional (`scripts/*/tests/probe-*.sh`) neste projeto. `npm run test:diagnostico-estrutural` (declarado no `23-VALIDATION.md` como "Quick run command") foi executado acima com sucesso — tratado como o probe efetivo desta fase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DIAGNOSTICO-01 | 23-07, 23-04 | Geração sob demanda, nunca automática, nunca reusada | ✓ SATISFIED | Truth #1 |
| DIAGNOSTICO-02 | 23-01, 23-04 | Cita fontes; zero-fontes rejeitado | ✓ SATISFIED | Truth #2 |
| DIAGNOSTICO-03 | 23-01, 23-03 | Índice de saturação numérico | ✓ SATISFIED | Truth #3 |
| DIAGNOSTICO-04 | 23-01, 23-05 | Até 3 gatilhos, mais forte destacado | ✓ SATISFIED | Truth #4 |
| DIAGNOSTICO-05 | 23-01, 23-05 | 2-3 objeções com resposta sugerida | ✓ SATISFIED | Truth #5 |
| DIAGNOSTICO-06 | 23-01, 23-05 | Ticket médio com base/fonte | ✓ SATISFIED | Truth #6 |
| DIAGNOSTICO-07 | 23-01, 23-05, 23-06 | Achado marcado dado/marketing, nunca mesmo peso visual | ✓ SATISFIED | Truth #7 (CR-01 corrigido) |
| DIAGNOSTICO-08 | 23-05 | Rascunho editável, nunca enviado | ✓ SATISFIED | Truth #8 |
| DIAGNOSTICO-09 | 23-01, 23-05 | Veredito sugerido, não vinculante | ✓ SATISFIED | Truth #9 |
| DIAGNOSTICO-10 | 23-02, 23-04, 23-07 | Regeneração livre, sem cache, custo visível | ✓ SATISFIED | Truth #10 |

Nenhum requisito órfão: os 10 IDs do REQUIREMENTS.md mapeiam integralmente para os planos 23-01..23-07 e para as truths acima.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx` | 33-42 | `navigator.clipboard.writeText` sem `try/catch` (WR-02 do 23-REVIEW.md, não corrigido) | ⚠️ Warning | Falha silenciosa de cópia em contexto não-seguro/permissão negada; não bloqueia o fluxo feliz. |
| `src/lib/ai/diagnostico-schema.ts` / `src/lib/ai/gerar-diagnostico.ts` | 174-178 / 149-150 | `assertTemFonte`/`DIAGNOSTICO_SEM_FONTE_MSG` exportados como "o gate" mas nunca chamados em produção — lógica duplicada inline (WR-03, não corrigido) | ⚠️ Warning | Risco de drift entre as 2 cópias da mesma regra; comportamento atual correto (gate funciona via cópia inline). |
| `src/lib/ai/gerar-diagnostico.ts` | 154-171 | Cross-check FM2 é só `aviso` (advisory), nunca bloqueia/retenta mesmo com alta taxa de citação não-confirmada (WR-04, mitigado por `normalizarUrl` mas não eliminado) | ⚠️ Warning | Dívida conhecida e aceita pelo usuário (ver frontmatter `known_debt_accepted`) — não reportada como gap novo por instrução explícita do solicitante desta verificação. |
| `src/components/diagnostico-secao.tsx` / `src/components/veredito-sugerido-chip.tsx` | 30-34 / 16-20 | Rótulo do veredito duplicado em 2 mapas independentes (IN-01 do 23-REVIEW.md, não corrigido) | ℹ️ Info | Cosmético; risco de drift textual num 4º valor futuro. |
| `src/lib/ai/gerar-diagnostico.ts` | 213-220 | `err.cause` de `NoObjectGeneratedError` logado sem checar forma (IN-02, não corrigido) | ℹ️ Info | Log server-only; risco baixo. |

Nenhum marcador `TODO`/`FIXME`/`XXX`/`HACK` sem referência de follow-up encontrado nos arquivos revisados.

**Nota sobre os 2 críticos do 23-REVIEW.md:** ambos CR-01 (badge quebrado para `relato_qualitativo`) e CR-02 (telemetria de `buscas` vazando entre tentativas) foram **confirmados corrigidos** por leitura direta do código atual (`achado-tipo-badge.tsx` tem os 3 mapas completos; `gerar-diagnostico.ts` declara `buscasTentativa` dentro do loop) e por `npx tsc --noEmit` limpo, executado nesta verificação.

### Human Verification Required

Ver frontmatter `human_verification` — 5 itens de UAT visual em `/campanhas/[id]` (fluxo do botão claro+escuro, histórico, rascunho copiável, e o estado de erro real). Nenhum é bloqueante para o veredito estrutural desta verificação.

**Atualização 2026-09-11 (browser conectado, sem crédito de API no momento):** parte do UAT foi executada ao vivo no navegador contra o dev server local (campanha de teste `nutricionista — Diagnóstico de teste UAT (Fase 23)`, id 2, criada só para este teste):
- Estado vazio de `/campanhas/[id]` confirmado visualmente: nenhuma geração automática ao abrir a página, texto de aviso de custo/tempo ("Faz buscas reais e custa uma chamada de API — leva de 30 a 90 segundos") visível, botão "Gerar diagnóstico" renderizado — bate com a truth #1 e o UI-SPEC.
- Dark mode do mesmo estado vazio confirmado: título, badge "Explorando", card e botão mantêm contraste e legibilidade adequados.
- **Ainda pendente** (bloqueado por falta de crédito de API, não por bug): clicar "Gerar diagnóstico" e ver pending→resultado real (teste 1 completo), regenerar + histórico (teste 2), editar/copiar rascunho (teste 3), estado de erro real (teste 5). Retomar assim que houver crédito.

### Gaps Summary

Nenhum gap estrutural encontrado. Os 10 requisitos DIAGNOSTICO-01..10 e as truths derivadas do AI-SPEC/UI-SPEC estão implementados, tipados sem erro, cobertos por harness estrutural verde, e a persistência foi confirmada contra o banco real (`data/crm.db`, tabela `diagnosticos` aplicada com o conjunto estrito de colunas). Os 2 críticos do code review (CR-01, CR-02) foram corrigidos e a correção foi confirmada nesta verificação, não apenas aceita por citação do SUMMARY. As 4 dívidas de warning/info do `23-REVIEW.md` que seguem abertas (WR-02, WR-03, IN-01, IN-02) são não-bloqueantes e não impedem o goal da fase.

O único motivo do status não ser `passed` é a ausência de UAT humano visual — o fluxo React completo (`/campanhas/[id]`, botão → pending → resultado/erro → histórico, em claro e escuro) nunca foi visto rodando num navegador; toda a evidência de "funciona de ponta a ponta" vem de: (a) chamadas reais à API Anthropic fora do navegador (spike 23-04 + 5 rodadas do eval 23-06, que provam `gerarDiagnostico()` ponta a ponta), e (b) inspeção estática do código de render. Isso é esperado e documentado pelo próprio time do projeto (`23-VALIDATION.md` § Manual-Only Verifications) — não é uma omissão desta verificação.

Duas dívidas técnicas foram explicitamente aceitas pelo usuário antes desta verificação e não são reportadas como gaps novos: variância de veredito entre execuções idênticas do LLM (comportamento esperado) e o sufixo espúrio de 1-3 caracteres em URLs do cross-check (bug real, não-bloqueante, investigação futura).

---

_Verified: 2026-09-11T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
