---
intent_review: needs_decision
revisores_efetivos: [codex]
codex_model_evidencia: "model: gpt-5.6-terra"
agy_model_evidencia: null
ciclos_completos: 1
achados_confirmados: 6
achados_descartados: 5
pausas_de_negocio: 2
---

# Fase 8 — Revisão Adversarial de Intenção (Ciclo 1)

## Status dos revisores

- **Codex** (`gpt-5.6-sol` falhou — erro 400 "model not supported when using Codex with a ChatGPT account", não transitório de rollout; re-rodado com `gpt-5.6-terra` conforme fallback documentado em `intent.md` — sucesso, evidência de modelo capturada via `head -8` do stderr: `model: gpt-5.6-terra`). Parecer completo em `respostas-codex.md` (scratchpad da sessão).
- **Antigravity (agy)** — **FALHOU**: `stdout` vazio (rc=0, mas critério de falha é stdout vazio, não o exit code). Causa registrada em `ciclo-agy.err`: *"jetski: no output produced — a tool required the 'command' permission that headless mode cannot prompt for, so it was auto-denied."* O agente custom `revisor-gsd` (blindagem anti-soft-deny documentada no `intent.md`) **não está instalado** neste host (`~/.gemini/config/agents/revisor-gsd/agent.md` não existe) — rodou na rota legada (agente default), que tentou usar uma tool de shell/comando e foi negada em modo headless, exatamente o modo de falha que `revisor-gsd` existe para blindar. Não usado `--dangerously-skip-permissions` (proibido por regra explícita). Sem retry — falha de infraestrutura do ambiente, não do plano.
- **Regra de falha parcial aplicada:** 1 de 2 revisores completou um ciclo válido → prossegue com Codex-only, degradação registrada em `sinos` (não é `blocked_path`, pois pelo menos um revisor rodou de verdade).

## Livro-razão — achados do Codex (Ciclo 1), veredito da verificação e destino

| # | Alegação do Codex | Verificação (Read/Grep no código) | Destino | Ação tomada |
|---|---|---|---|---|
| 1 | Backfill 100% "outbound" é suposição de negócio não verificável só pelo banco — 5 dos 33 leads têm `origem` "Teste"/"insta" (todos já soft-deletados, 0 ativos), não necessariamente do lote CSV do cowork | Confirmado por query direta: `origem="insta"` (2 linhas) e `origem="Teste"` (3 linhas), 100% com `deleted_at` preenchido. Nenhuma evidência no banco de como esses 5 leads foram captados — "insta" é compatível tanto com "nota manual de que o contato foi via Instagram" (possivelmente Inbound) quanto com um teste do próprio admin | **Mexe em critério de aceite (Requirement 3)** | `<business_pause>` — Pergunta 1 abaixo |
| 2 | Default fixo "outbound" no import CSV é regra de negócio nova, pode classificar errado um lead quente se o wizard for reusado para outra fonte no futuro (ex.: export de tráfego pago) | Confirmado: `mapCsvRows`/`import-actions.ts` não distinguem fonte do CSV — qualquer arquivo que passe pelo wizard hoje receberia `outbound` sem exceção | **Mexe em critério de aceite (Requirement 2, comportamento contínuo)** | `<business_pause>` — Pergunta 2 abaixo |
| 3 | `text(..., {enum:[...]}).notNull()` do Drizzle não cria `CHECK` no SQLite — "enum fechado" só vale na camada de aplicação | Confirmado por leitura de `src/db/migrations/0000_gifted_slapstick.sql:5-9` — `canal`/`stage` já são `text NOT NULL` puro, sem `CHECK`, mesmo padrão que `origemTipo` seguiria | **Correção factual** | Aplicada em `08-SPEC.md` §Constraints — clarificado que o enum fechado é garantido por Zod/aplicação, mesmo precedente de `canal`/`stage`, não regressão nova |
| 4 | Mecanismo exato de migração (ALTER TABLE vs. drizzle-kit push) ainda em aberto, mas define contrato físico do campo (ex.: se ficar com `DEFAULT 'outbound'` na coluna, futuros inserts sem o campo herdam isso silenciosamente) | Já era `Claude's Discretion` explícito em `08-CONTEXT.md` antes desta revisão — Codex não trouxe fato novo, só reforçou a importância | Já coberto (sem novo achado) | Nenhuma mudança — mantido como decisão técnica do planner, com a ressalva do Codex sobre `DEFAULT` físico anotada para o researcher/planner considerar |
| 5 | Acceptance criteria original não cobria: verificação de schema real pós-migração (DDL/`PRAGMA table_info`), nem idempotência do script de backfill (rodar 2x não deve reclassificar linha já corrigida manualmente) | Confirmado por leitura do `08-SPEC.md` original — nenhum item de aceite cobria idempotência | **Tradeoff de risco/implementação** | Aplicada em `08-SPEC.md` §Constraints/§Acceptance Criteria — novo item de idempotência do script de backfill |
| 6 | Leads soft-deletados não podem ser editados via `updateLead` — Boundaries do SPEC dizia "reclassificação individual via formulário já cobre o caso real", o que é falso para os 11 leads soft-deletados sem passo de restauração primeiro | Confirmado em `src/actions/lead-actions.ts` — `updateLead` filtra `isNull(leads.deletedAt)` no `WHERE`; edição de lead soft-deletado não tem efeito sem restaurar antes (fluxo já existente da Lixeira, 01-04) | **Correção factual** | Aplicada em `08-SPEC.md` §Boundaries — wording corrigido, deixando claro que vale só para leads ativos, sem novo gap introduzido por esta fase |
| 7 | `leadSchema` é compartilhado entre formulário e `csvRowSchema`; `scripts/test-lead-actions.cjs` faz chamadas diretas a `createLead`/`updateLead` e quebra se `origemTipo` virar obrigatório sem atualização | Confirmado: `scripts/test-lead-actions.cjs` existe; `leadSchema` (`src/lib/validations.ts`) é base compartilhada | **Transparência/implementação** | Nota adicionada em `08-CONTEXT.md` §code_context — planner precisa atualizar o script no mesmo commit |
| 8 | Dependência dura de Phase 10/11 nesta fase justifica mais rigor | Já documentado em `08-SPEC.md`/`ROADMAP.md`/`REQUIREMENTS.md` antes desta revisão | Duplicado (sem achado novo) | Descartado — nenhuma ação, já coberto |
| 9 | Ausência de badge visual reduz auditabilidade operacional do backfill | Já era decisão consciente `D-05` em `08-CONTEXT.md`, com justificativa YAGNI explícita; o próprio Codex classificou como não-bloqueador, severidade baixa-média | Risco aceito conscientemente, já documentado | Descartado — mantida a decisão original, sem mudança |
| 10 | Assimetria "manual escolhe, import/backfill defaulta" só é coerente sob a premissa de que todo CSV é prospecção fria | Mesma raiz do achado #1/#2 | Mesclado com Pergunta 1/2 | Coberto pelas mesmas perguntas de negócio abaixo |
| 11 | Decisão de não dobrar os 11 outros todos (score ≥ 0.4) parece correta, não é violação que exija pausa | Confirmado — Codex concorda com o julgamento já registrado em `08-CONTEXT.md`/`08-DISCUSSION-LOG.md` | Validação (sem achado novo) | Descartado — nenhuma ação, julgamento confirmado por revisor independente |
| 12 | Exclusão de granularidade de origem (ex. "Instagram Ads") é vinculante no `REQUIREMENTS.md`, mas nunca teve confirmação humana fresca — decisão foi tomada em fase de requirements anterior, não nesta sessão | Confirmado que a decisão já estava em `REQUIREMENTS.md` Out of Scope antes desta sessão (fase de requirements/roadmap, sessão anterior) — não é uma decisão desta discussão | Já travado por artefato anterior, fora da alçada desta revisão reabrir | Descartado — não reaberto; nota mantida em `08-SPEC.md`/`08-CONTEXT.md` já registrando que é decisão herdada, não desta fase |

**Fontes convergentes:** nenhum achado teve confirmação cruzada Codex+agy nesta rodada (agy falhou antes de produzir parecer) — todos os achados acima têm fonte única (`codex`).

## Perguntas pendentes (decisão do usuário)

### Pergunta 1 — Valor do backfill para os 5 leads soft-deletados "Teste"/"insta"

**Alegação do revisor:** classificar os 33 leads existentes como 100% "outbound" no backfill é uma leitura de negócio, não um fato do banco — em particular, os 2 leads com `origem = "insta"` podem ter sido classificados assim porque vieram de contato via Instagram (potencialmente Inbound), não necessariamente do lote CSV do cowork.

**O que a verificação confirmou:** os 5 leads (`"Teste"` ×3, `"insta"` ×2) estão **todos soft-deletados** (0 ativos) — não aparecem em nenhuma tela hoje, e o próprio SPEC.md já não exigia edição em massa deles. Não há metadado adicional no banco (sem campo de nota/timestamp de criação detalhado consultado) que prove a origem real desses 5 registros além do texto livre.

**Opções:**
- **Backfill uniforme: todos os 33 leads (incluindo os 5 "Teste"/"insta") recebem `origemTipo = "outbound"`** — mais simples, consistente com a leitura original do SPEC.md; risco: se algum dos 2 "insta" for de fato um contato Inbound histórico, a Phase 10/11 vai tratá-lo (e a nenhuma automação real hoje, já que estão soft-deletados) como outbound incorretamente — mas por estarem na Lixeira, o impacto prático em produção é zero até serem restaurados.
- **Backfill diferenciado: "Importação CSV" → outbound; "Teste" → outbound (dado de teste, não lead real); "insta" → inbound** (assumindo que "insta" nota contato via Instagram) — mais correto semanticamente se a suposição estiver certa, mas exige uma regra de mapeamento extra no script de backfill (`origem` → `origemTipo` por correspondência de texto, o que o próprio SPEC.md original queria evitar como precedente — "nenhuma automação nova pode inferir por parsing de string", Pitfall 2 do `research/SUMMARY.md`) e a suposição sobre "insta" pode estar errada de qualquer forma.

**Recomendação:** Backfill uniforme (todos → outbound), pelo motivo que o próprio Codex concorda ser mitigante: os 5 leads em questão já estão soft-deletados (zero impacto em automação ativa hoje), e diferenciar o backfill por parsing de texto do campo `origem` reintroduziria exatamente o Pitfall 2 que este projeto decidiu evitar (inferência frágil por string). Se o admin quiser reclassificar algum desses 5 no futuro, o caminho já existe: restaurar via Lixeira → editar `origemTipo` manualmente no formulário (achado #6 acima).

**Reversível:** sim — é um `UPDATE` em 5 linhas soft-deletadas; corrigir depois (via restaurar+editar, ou um segundo `UPDATE` direto) não quebra nada em produção porque nenhum lead ativo é afetado por esta escolha.

### Pergunta 2 — Default do import CSV daqui pra frente: sempre "outbound", ou existe hoje algum caso de CSV vindo de fonte "quente"?

**Alegação do revisor:** hardcodar `origemTipo = "outbound"` para todo lead importado via `/importar` embute a suposição "todo CSV = prospecção fria" como regra permanente do wizard — se o admin um dia importar um CSV de outra fonte (ex.: export de formulário de tráfego pago), esses leads seriam classificados incorretamente como frios sem o admin perceber.

**O que a verificação confirmou:** hoje o único uso real do wizard `/importar` é o lote do cowork parceiro (`CSV_DEFAULTS.origem = "Importação CSV"`, `CLAUDE.md`: "recebidos em lote via CSV de um cowork parceiro") — não há, no código ou nos planos documentados, nenhuma outra fonte de CSV prevista para v1.3.

**Opções:**
- **Manter o default fixo "outbound" para todo import CSV, sem exceção** — simples, sem novo passo de UI no wizard (mantém Requirement 2 do SPEC como está); assume que o wizard continua sendo, na prática, o canal exclusivo do lote de prospecção fria do cowork.
- **Adicionar um seletor único por lote no wizard** ("Este lote é Inbound ou Outbound?", aplicado a todas as linhas do arquivo) — mais correto se o admin um dia importar CSV de fonte diferente, mas é um passo de UI novo que o SPEC.md atual explicitamente não pedia, e o `ROADMAP.md`/`REQUIREMENTS.md` desta fase não mencionam essa necessidade.

**Recomendação:** manter o default fixo "outbound" — não há indício real (código, roadmap ou histórico do projeto) de que o wizard vá receber outra fonte de CSV neste milestone; adicionar um seletor de lote agora seria construir para um caso hipotético não pedido (indo contra o próprio princípio do projeto de "nenhuma automação nova pode inferir/assumir além do que os requisitos pedem"). Se o admin efetivamente começar tráfego pago com exportação em CSV, isso é retrabalho pequeno e localizado (um select a mais no wizard) para tratar quando o caso real aparecer.

**Reversível:** sim — é uma linha de código (`CSV_DEFAULTS`/`mapCsvRows`); trocar o default fixo por um seletor de lote depois é uma mudança pequena e isolada, sem impacto em dado já importado.

---

*Fase: 08-origem-governada-separa-o-inbound-outbound*
*Revisão gerada: 2026-08-01 (Ciclo 1, needs_decision)*
