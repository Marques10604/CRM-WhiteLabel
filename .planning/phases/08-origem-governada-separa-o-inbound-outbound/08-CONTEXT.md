# Phase 8: Origem Governada + Separação Inbound × Outbound - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Todo lead — novo ou já existente — passa a ter uma classificação de origem confiável e machine-readable (`origemTipo`: Inbound ou Outbound) via campo dedicado, sem que nenhuma automação futura precise interpretar o texto livre de `origem`. Cobre: nova coluna no schema, campo obrigatório no formulário de criação/edição de lead, default automático no fluxo de import CSV, e backfill único dos 33 leads já existentes (22 ativos + 11 soft-deletados, 100% com `origem = "Importação CSV"/"Teste"/"insta"` hoje, confirmados por query direta).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**3 requirements are locked.** See `08-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `08-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Coluna `leads.origemTipo` (enum `"inbound" | "outbound"`, `NOT NULL`) no schema Drizzle
- Campo obrigatório correspondente no formulário de lead (criação + edição)
- Validação Zod do campo em `createLead`/`updateLead`
- Default automático `"outbound"` no fluxo de import CSV (sem passo de UI novo)
- Backfill único de todas as linhas existentes (ativas e soft-deletadas) para `"outbound"`, com backup do `.db` antes da migração
- Visibilidade do valor de `origemTipo` em pelo menos uma tela de consulta do lead (modal de edição, mesmo padrão de `origem`/`canal`)

**Out of scope (from SPEC.md):**
- Gate condicional que impede a sequência de follow-up escalonada de sugerir data para lead Inbound (ORIGEM-03) — Phase 10
- Substituir `leads.origem` por uma tabela `origens` governada com FK — decisão já descartada, não reaberta
- Granularidade de origem além do binário Inbound/Outbound (ex.: "Instagram Ads")
- Governança/normalização de `motivoPerda` — Phase 11
- UI de reclassificação em lote (bulk edit) de `origemTipo`
- Porta de entrada local para IA cadastrar leads (LEAD-05) — backlog v1.2, não relacionado
- Qualquer mudança em `canal` ou no comportamento de templates/`{origem}`

</spec_lock>

<decisions>
## Implementation Decisions

Todas as decisões abaixo foram tomadas em modo `--auto` (sem usuário interativo nesta sessão) — escolhido sempre o padrão já estabelecido no código existente, com o raciocínio registrado para auditoria.

### Rótulos exibidos no select de `origemTipo`
- **D-01 `[auto]`:** Os dois valores aparecem no select como **"Inbound"** e **"Outbound"** (sem tradução para PT-BR) — mesmos termos já usados em `PROJECT.md` (linha 8: "Separação Inbound × Outbound"), `REQUIREMENTS.md` e no todo original (`2026-08-01-separa-o-inbound-x-outbound.md`). Traduzir agora ("Entrada"/"Saída" ou similar) introduziria um segundo vocabulário para o mesmo conceito sem necessidade — o usuário já usa os termos em inglês espontaneamente na própria definição do requisito.

### Posição e padrão técnico do campo no formulário
- **D-02 `[auto]`:** O campo `origemTipo` entra logo **depois** do campo `origem` existente (`lead-form-dialog.tsx:244-253`), dentro do mesmo grupo visual da primeira seção do formulário (nome/telefone/canal/origem) — agrupamento semântico natural ("de onde veio" + "que tipo de origem").
- **D-03 `[auto]`:** Implementação segue **exatamente** o padrão já usado pelo campo `canal` (mesmo componente `Controller` + `Select`/`SelectTrigger`/`SelectContent`, `lead-form-dialog.tsx:211-242`) — um array `const ORIGEM_TIPO_OPTIONS = [{value, label}, ...] as const` no mesmo estilo de `CANAL_OPTIONS` (linha 55-58), não um componente novo.
- **D-04 `[auto]`:** O select **não vem pré-selecionado** com nenhum valor ao criar um lead manualmente — usa placeholder ("Selecione a origem" ou similar), mesmo padrão do `canal` (placeholder "Selecione o canal", linha 225). Pré-selecionar um valor por padrão (ex: sempre "Outbound") esvaziaria o propósito da governança para leads criados manualmente daqui pra frente — o admin precisa escolher conscientemente. Isso é diferente do backfill/import CSV (Requirement 2/3 do SPEC), que legitimamente default para "outbound" porque a origem real (lote do cowork) já é conhecida e uniforme.

### Indicação visual adicional (fora do modal)
- **D-05 `[auto]`:** Nenhum badge/indicador visual de `origemTipo` é adicionado ao card do pipeline ou à lista de leads nesta fase — SPEC.md exige apenas "visível em pelo menos uma tela de consulta" e o modal de edição já satisfaz isso (mesmo padrão de `origem`/`canal`, que também só aparecem no modal, não na lista base — comentário em `lead-table-columns.tsx:65`). Adicionar um badge visual (mesmo padrão do "Esfriando") é decisão melhor tomada quando o dado tiver uso real (Phase 10 gate condicional, Phase 11 painel de métricas) — mesma lógica YAGNI já aplicada em decisões anteriores do projeto (`07-CONTEXT.md` D-03, sem teto artificial; `PITFALLS`/`SUMMARY.md`, sem lib de gráfico no MVP).

### Claude's Discretion
- Mecanismo exato da migração (ALTER TABLE manual via `better-sqlite3` script vs. tentar `drizzle-kit push` contra cópia de teste primeiro) — já constrangido pelo SPEC.md (Constraints), mas a escolha final entre as duas variantes técnicas fica com o researcher/planner, seguindo o precedente das Fases 06-01/07-01.
- Nome exato da variável/arquivo que guarda `ORIGEM_TIPO_OPTIONS` e se a validação Zod usa `z.enum(["inbound", "outbound"])` inline ou um tipo compartilhado — implementação, não decisão de produto.
- Se o backfill roda como script standalone (`scripts/*.cjs`, mesmo padrão de outras migrações manuais do projeto) ou inline na migração SQL — técnico, sem preferência de UX manifestada.

### Folded Todos
- **Separação Inbound x Outbound** (`.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md`, score 0.6, `resolves_phase: 8` no próprio frontmatter) — dobrado integralmente: é o todo que esta fase resolve. Seu conteúdo ("Solution TBD — campo de origem/tipo no lead, comportamento condicional de automações") já está refletido no SPEC.md (Requirement 1) e nestas decisões; a parte de "comportamento condicional de automações" (auto-avanço, esfriando, sequência) fica explicitamente fora de escopo aqui — pertence à Phase 10 (ORIGEM-03), como o próprio `REQUIREMENTS.md` Traceability já registra.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e spec locked
- `.planning/phases/08-origem-governada-separa-o-inbound-outbound/08-SPEC.md` — **leitura obrigatória antes de planejar.** 3 requisitos travados, boundaries, constraints, acceptance criteria.
- `.planning/ROADMAP.md` §Phase 8 — goal, success criteria, depende de nada novo (estende `leads` já em produção)
- `.planning/REQUIREMENTS.md` — ORIGEM-01, ORIGEM-02 (ORIGEM-03 mapeado para Phase 10), Traceability, Out of Scope
- `.planning/todos/pending/2026-08-01-separa-o-inbound-x-outbound.md` — todo original dobrado nesta fase (ver Folded Todos acima)

### Pesquisa e dados reais
- `.planning/research/SUMMARY.md` — decisão de schema (`origemTipo` coluna nova vs. tabela `origens`, já resolvida a favor da coluna), Pitfall 1 (retrofit sem backfill), Pitfall 2 (nunca inferir por parsing de string)
- Query direta em `data/crm.db` (nesta sessão): 22 leads ativos, 100% com `origem = "Importação CSV"`; 11 leads soft-deletados adicionais (`"Importação CSV"` ×6, `"Teste"` ×3, `"insta"` ×2) — base numérica exata do backfill (Requirement 3 do SPEC)

### Precedente de migração em dado real (mesmo risco técnico)
- `.planning/STATE.md` §Accumulated Context/Decisions — `[Phase 06-01]`: `drizzle-kit push` não pode adicionar coluna `NOT NULL` com default 0 (bug trata como ausente, prepara `DELETE FROM` antes do `ADD COLUMN`); ALTER TABLE aplicado direto via `better-sqlite3`. `[Phase ?]`: defaults assimétricos por decisão deliberada em `configuracoes` — mesmo cuidado de "não popular com valor que distorce dado real existente" se aplica aqui.
- `.planning/STATE.md` §Blockers/Concerns: "Phase 8: backup de `data/crm.db` antes de qualquer `drizzle-kit push` que altere a tabela `leads`"

No external specs/ADRs beyond the above — requisitos totalmente capturados no SPEC.md e nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CANAL_OPTIONS` (`src/components/lead-form-dialog.tsx:55-58`) — array `{value, label} as const`, padrão direto a copiar para `ORIGEM_TIPO_OPTIONS`.
- `Controller` + `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` (`lead-form-dialog.tsx:211-242`, campo `canal`) — padrão exato de select controlado por react-hook-form já em uso; `origemTipo` deve seguir a mesma estrutura, inclusive `aria-invalid`, `FieldError`, `FieldDescription`.
- `CSV_DEFAULTS` (`src/lib/csv-import.ts:53`, hoje só `origem: "Importação CSV"`) — local natural para acrescentar o default `origemTipo: "outbound"` do Requirement 2 do SPEC.

### Established Patterns
- Zod schema em `src/lib/validations.ts` valida cada campo do lead individualmente (`origem: z.string().trim().min(1, ...)` linha 29) — `origemTipo` precisa de entrada equivalente com `z.enum(["inbound", "outbound"])`.
- `leads` schema (`src/db/schema.ts:32-62`) já usa `text(..., { enum: [...] }).notNull()` para `canal` (linha 38) e `stage` (linha 44-46) — mesmo padrão Drizzle a seguir para `origemTipo`, sem introduzir uma abordagem nova de enum.
- Migração manual via `better-sqlite3` (não `drizzle-kit push` direto) já é o padrão estabelecido nas Fases 06-01/07-01 para colunas `NOT NULL`/com regra de backfill não-trivial — repetir aqui.
- `mapCsvRows()` (`src/lib/csv-import.ts`) é o único ponto de criação de lead que não passa pelo formulário — precisa do próprio default, não herda a obrigatoriedade do form.

### Integration Points
- `src/db/schema.ts` — nova coluna `origemTipo` na tabela `leads` (mesma seção de `canal`/`stage`).
- `src/lib/validations.ts` — novo campo no schema Zod do formulário de lead.
- `src/components/lead-form-dialog.tsx` — novo `Field`/`Controller` logo após o campo `origem` (D-02).
- `src/actions/lead-actions.ts` — `createLead`/`updateLead` já recebem e persistem os campos validados; `origemTipo` viaja pelo mesmo caminho, sem lógica condicional nova.
- `src/lib/csv-import.ts` (`CSV_DEFAULTS`, `mapCsvRows`) e `src/actions/import-actions.ts` — default `"outbound"` aplicado no import em lote (Requirement 2 do SPEC).
- Script/migração standalone (local a definir pelo planner) para o backfill único das 33 linhas existentes — não é uma Server Action, roda uma vez fora do fluxo normal da aplicação.

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência visual específica trazida pelo usuário nesta sessão (discussão automática, sem usuário interativo) além das decisões acima, todas ancoradas em padrões já existentes no código (`canal`/`CANAL_OPTIONS`) e na definição de negócio já registrada em `PROJECT.md`/no todo original (Inbound = tráfego pago/quente, Outbound = prospecção fria/admin inicia contato).

</specifics>

<deferred>
## Deferred Ideas

Nenhuma nova ideia de escopo surgiu nesta sessão — todas as áreas discutidas eram decisões de implementação dentro do domínio já travado pelo SPEC.md.

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` (score 0.6) — sequência de follow-up escalonada com templates de valor; pertence à Phase 10 (`REQUIREMENTS.md` Traceability, SEQ-01/02/03).
- `.planning/todos/pending/2026-08-01-agenda-e-tarefas-soltas.md` (score 0.6) — agenda/tarefas soltas; Phase 12.
- `.planning/todos/pending/2026-08-01-anexo-simples-por-lead.md` (score 0.6) — anexo por lead; backlog PME, fora do roadmap v1.3 (`REQUIREMENTS.md` v2).
- `.planning/todos/pending/2026-08-01-busca-global.md` (score 0.6) — busca global; backlog PME, fora do roadmap v1.3.
- `.planning/todos/pending/2026-08-01-campo-de-vendedor-respons-vel-no-banco.md` (score 0.6) — campo de vendedor no banco; backlog PME, fora do roadmap v1.3.
- `.planning/todos/pending/2026-08-01-meta-mensal-com-barra-de-progresso.md` (score 0.6) — meta mensal; backlog PME, fora do roadmap v1.3.
- `.planning/todos/pending/2026-08-01-painel-de-m-tricas-por-origem-e-sub-nicho.md` (score 0.6) — painel de métricas por origem/sub-nicho; Phase 11 (depende tecnicamente desta fase, mas a implementação do painel em si é Phase 11).
- `.planning/todos/pending/2026-08-01-relat-rio-de-motivos-de-perda.md` (score 0.6) — relatório de motivos de perda; Phase 11.
- `.planning/todos/pending/2026-08-01-tags-livres-por-lead.md` (score 0.6) — tags livres por lead; backlog PME, fora do roadmap v1.3.
- `.planning/todos/pending/2026-08-01-temperatura-autom-tica-do-lead.md` (score 0.6) — temperatura automática (quente/morno/frio); v2/v1.4 explicitamente adiado (`REQUIREMENTS.md` TEMP-01), depende de `origemTipo` já em produção, mas não é construída aqui.
- `.planning/todos/pending/2026-08-01-timeline-de-intera-es-por-lead.md` (score 0.6) — timeline de interações; Phase 9.
- `.planning/todos/pending/2026-08-01-exportar-dados-em-csv.md` (score 0.4) — exportar CSV; backlog PME, fora do roadmap v1.3.

Todos os 11 itens acima bateram no matcher de todos por sobreposição genérica de palavras-chave ("lead", "phase", "schema", "campo", "admin") com score ≥ 0.4 — a regra padrão de `--auto` seria dobrar automaticamente todos com score ≥ 0.4, mas isso contradiria diretamente as Boundaries já travadas em `08-SPEC.md` (que excluem explicitamente `motivoPerda`, painel de métricas, timeline, sequência, tarefas — todos mapeados para outras fases em `REQUIREMENTS.md` Traceability). Julgamento aplicado aqui: só o item cujo próprio frontmatter declara `resolves_phase: 8` foi dobrado; os demais são, na prática, as Fases 9-12 e o backlog v1.4/PME inteiro — dobrá-los criaria scope creep severo contra um SPEC.md já revisado e commitado. Este desvio da regra literal do `auto.md` (fold all ≥ 0.4) fica registrado aqui para a revisão adversarial de intenção (Etapa 0-B) auditar.

</deferred>

---

*Phase: 08-origem-governada-separa-o-inbound-outbound*
*Context gathered: 2026-08-01*
