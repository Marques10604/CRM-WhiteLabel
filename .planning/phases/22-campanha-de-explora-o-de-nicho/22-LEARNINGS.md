---
phase: 22
phase_name: "campanha-de-explora-o-de-nicho"
project: "CRM de Leads"
generated: "2026-09-05"
counts:
  decisions: 8
  lessons: 5
  patterns: 6
  surprises: 4
missing_artifacts:
  - "UAT.md"
---

# Phase 22 Learnings: campanha-de-explora-o-de-nicho

## Decisions

### `metaConversao` é texto livre, não numérico
O campo de meta da campanha aceita `"3 leads fechados"` e `"10% de resposta"` como formatos válidos — nunca é parseado como número.

**Rationale:** O usuário descreve a meta em linguagem natural; forçar um formato numérico engessaria a exploração de nicho sem ganho analítico nesta fase.
**Source:** 22-01-SUMMARY.md

### `estado` da campanha fica fora dos schemas Zod de criação/edição
`campanhaSchema` e `campanhaUpdateSchema` não têm o campo `estado` — a campanha sempre nasce `"explorando"` (default físico no DB); a transição de estado é escopo da Fase 24 (veredito).

**Rationale:** Evita expor uma máquina de estados incompleta na UI antes de a lógica de veredito existir.
**Source:** 22-01-SUMMARY.md, 22-02-SUMMARY.md

### Migração manual `.cjs` idempotente, nunca `drizzle-kit push/generate`
`scripts/migrate-campanhas.cjs` faz `CREATE TABLE campanhas` + `ALTER TABLE leads ADD campanha_id` via `better-sqlite3`, rodado 2× contra `data/crm.db` para confirmar idempotência, com backup e `wal_checkpoint(TRUNCATE)`.

**Rationale:** Padrão já estabelecido no projeto (D-01) — DDL bruto referencia a tabela física `subnichos` (não o nome lógico `nichos`), e o time controla exatamente o SQL aplicado sobre o banco de produção com 44 leads reais.
**Source:** 22-01-SUMMARY.md

### `CampanhaFormDialog` é criação-apenas (sem modo edição)
O dialog de campanha só cria; `updateCampanha` (entregue em 22-01) fica sem consumidor de UI até a Fase 24.

**Rationale:** CAMPANHA-01 só pede criar campanha; edição não é requisito da fase. Adicionar UI de edição agora seria código especulativo.
**Source:** 22-02-SUMMARY.md

### `campanhaId` no lead NÃO ganha `.refine` de obrigatoriedade
Diferente de `motivoPerdaId` (condicional a `stage=perdido`), o vínculo lead→campanha é opcional em qualquer etapa do funil.

**Rationale:** Um lead pode ser associado a uma campanha de exploração independentemente de onde está no pipeline.
**Source:** 22-03-SUMMARY.md

### `campanhaId` omitido de `csvRowSchema` via `.omit()`
O schema de linha de CSV do cowork remove explicitamente `campanhaId`.

**Rationale:** O CSV do parceiro nunca traz campanha; o `.omit()` fecha o vetor de ataque T-22-11 (injeção de FK forjada pelo import).
**Source:** 22-03-SUMMARY.md

### `campanhaExists()` é deliberadamente indiferente a `deletedAt`
O gate de FK em `createLead`/`updateLead` aceita campanha soft-deletada — mesmo precedente de `nichoExists`/`motivoPerdaExists`.

**Rationale:** Editar/salvar um lead cuja campanha foi removida não pode falhar sem o usuário ter mexido em nada (threat T-22-12).
**Source:** 22-03-SUMMARY.md, 22-03-REVIEW.md

### Prop `campanhas` deliberadamente obrigatória (sem `= []`)
`LeadFormDialog` recebe `campanhas` como prop obrigatória, sem default.

**Rationale:** O `tsc` passa a provar que as 3 telas que abrem o dialog (`/leads`, `/`, `/pipeline`) foram todas fiadas com a query real de Server Component — nenhuma fica com combobox vazio silenciosamente.
**Source:** 22-03-SUMMARY.md

---

## Lessons

### CAMPANHA-03 foi silenciosamente omitido dos 2 primeiros planos
Os planos 22-01 e 22-02 declararam `requirements: [CAMPANHA-01, CAMPANHA-02, CAMPANHA-04]` no frontmatter; CAMPANHA-03 (vínculo lead→campanha) nunca entrou em nenhum plano. O 22-01-PLAN citava um "plano 22-03" que não existia. A verificação inicial pegou isso como `gaps_found` (3/4).

**Context:** Sem CONTEXT.md, sem nota de adiamento no ROADMAP, sem reatribuição — REQUIREMENTS.md ainda mapeava CAMPANHA-03 → Phase 22 Pending. Foi execução incompleta da fase, não descope deliberado. Fechado pelo plano de gap 22-03.
**Source:** 22-VERIFICATION.md

### A UI de criação foi feita antes do requisito que ela habilita
`leads.campanhaId` (coluna) foi entregue em 22-01, mas a capacidade de o usuário *usar* essa coluna (campo no form de lead) só veio em 22-03. A "fundação de dados" sozinha não satisfaz um critério de sucesso que diz "pode vincular leads".

**Context:** O verificador do GSD checa a verdade observável ("o usuário consegue vincular"), não só a presença de artefatos. Coluna no schema ≠ funcionalidade entregue.
**Source:** 22-VERIFICATION.md

### `schema.ts` declara `onDelete` que o DB físico nunca recebe
`schema.ts` declara `onDelete: "restrict"` / `"set null"`, mas a DDL da migração emite `REFERENCES` sem cláusula `ON DELETE` → o SQLite real usa `NO ACTION`. `verify-schema.cjs` só assere presença da FK, nunca a ação de on-delete.

**Context:** Não quebra hoje (o app só faz soft-delete), mas os doc-comments que prometem "só desvincula" estão enganosos. Warning WR-01 do 22-REVIEW — segue aberto, não bloqueia.
**Source:** 22-REVIEW.md

### `updateLead` não revalidava `/leads` — a própria tela onde o campo é editado
`updateLead` só chamava `revalidatePath("/")` e `/pipeline`. Como o campo Campanha é editado a partir da tabela `/leads`, reabrir o lead mostrava o valor pré-edição. Gap pré-existente (valia para `interesse`, `notas` da Fase 15) que a Fase 22 colocou no caminho crítico.

**Context:** Corrigido no fix b9a2c44 (WR-01 do 22-03-REVIEW).
**Source:** 22-03-REVIEW.md

### `campanha-actions.ts` shipou sem harness de teste — único módulo de action do repo assim
`lead-actions`, `tarefa-actions`, `motivo-perda-actions`, `interacao-actions` têm todos `scripts/test-*.cjs`. `campanha-actions.ts` introduziu backstop de FK próprio, janela check-then-write, `.refine` de janela e soft-delete idempotente — nada disso é exercitado por teste.

**Context:** Warning WR-04 do 22-REVIEW, ainda aberto. O vínculo lead→campanha (22-03) foi coberto no harness de `lead-actions` (Casos 21-27), mas o CRUD de campanha em si não.
**Source:** 22-REVIEW.md

---

## Patterns

### `<entidade>BaseSchema` (objeto puro) + `.refine` + `.extend` para o update schema
`campanhaBaseSchema` é o objeto puro; `campanhaSchema` aplica `.refine` (janela fim > início); `campanhaUpdateSchema` deriva via `.extend` — nunca uma cópia paralela dos campos.

**When to use:** Sempre que uma entidade tiver schema de criação e de edição com campos quase iguais.
**Source:** 22-01-SUMMARY.md

### Server Action com `entidadeExists()` + `isForeignKeyViolation` como defesa em profundidade
Antes de qualquer escrita, valida Zod `safeParse`, checa se a FK-alvo existe (`campanhaExists`/`nichoExists`), e ainda mantém um `catch` de `SQLITE_CONSTRAINT_FOREIGNKEY` como backstop contra corrida.

**When to use:** Toda Server Action que insere/atualiza uma linha com FK forjável a partir de input do usuário.
**Source:** 22-01-SUMMARY.md, 22-03-SUMMARY.md

### Badge por enum: `LABEL` + `TOKEN` em mapas separados, server-safe
`CampanhaEstadoBadge` mapeia os 4 estados para `ESTADO_LABEL` (texto) e `ESTADO_TOKEN` (classe de cor da escala `--status-*` da Fase 19) em dois mapas distintos, `Badge variant=outline`, sem `"use client"`.

**When to use:** Qualquer badge de status derivado de um enum do banco. Molde: `etapa-badge.tsx`.
**Source:** 22-02-SUMMARY.md

### Combobox não-criável com item-sentinela para desvincular
`CampanhaCombobox` usa `NONE_VALUE = "__nenhuma__"` como primeira opção ("Nenhuma campanha") para materializar o desvincular; filtra `deletedAt === null || id === value` (campanha removida continua visível se já vinculada).

**When to use:** Campo de FK opcional que o usuário precisa poder limpar. Mesma mecânica do sentinela de `MotivoPerdaCombobox`.
**Source:** 22-03-SUMMARY.md

### Sub-componente parametrizado renderizado N× em vez de blocos inline duplicados
`JanelaField` (Popover+Calendar+input hidden ISO) é renderizado 2× no dialog, cada instância com seu próprio `useState` de Popover — em vez de dois `Controller` inline idênticos de ~35 linhas.

**When to use:** Dois ou mais campos estruturalmente idênticos no mesmo form (ex.: par de datas de janela). Cuidado: heurísticos de acceptance por `grep -c` podem contar tags de forma inesperada.
**Source:** 22-02-SUMMARY.md

### Rota de detalhe minimalista de propósito, como âncora para fases futuras
`/campanhas/[id]` entregou só nicho+oferta, estado, meta e janela — sabendo que as Fases 23 (diagnóstico de IA) e 24 (veredito/painel) vão *adicionar seções* na mesma página, sem retrabalho de layout.

**When to use:** Quando o roadmap já prevê que fases seguintes enriquecem a mesma tela. Guard de rota Next 16: `params` como `Promise`, guard de inteiro positivo + `notFound()` antes da query, `notFound()` também para linha soft-deletada.
**Source:** 22-02-SUMMARY.md

---

## Surprises

### Verificação passou de `gaps_found` (3/4) para `passed` (4/4) sem re-planejar a fase inteira
O gap único (CAMPANHA-03) foi fechado por um 3º plano de gap-closure (22-03) + um fix pontual (b9a2c44), e a re-verificação in-session promoveu o status.

**Impact:** A fase não precisou ser reaberta nem re-executada — só o pedaço faltante foi planejado e executado. O `close-phase` depois promoveu `human_needed`→`passed` a partir da UAT/verificação limpa.
**Source:** 22-VERIFICATION.md

### `grep -c "PopoverTrigger"` do acceptance deu 3, não 2
O heurístico do plano esperava 2 ocorrências (um por campo de data); com `JanelaField` extraído como sub-componente único, o grep contou import + abertura + fechamento da tag = 3. Divergência puramente cosmética — a intenção (2 date-pickers independentes) foi atendida e o `tsc --noEmit` passou limpo.

**Impact:** Nenhum no comportamento; serve de alerta de que acceptance por contagem de string é frágil a refactors legítimos.
**Source:** 22-02-SUMMARY.md

### Host de 4GB sem navegador bloqueou toda a UAT humana da fase
Nenhum dos fluxos de UI (criar campanha, navegar detalhe, guard de URL inválida, vincular lead nas 3 telas) pôde ser verificado ao vivo. Ficaram registrados como NÃO-BLOQUEANTES, precedente das Fases 18-21.

**Impact:** A fase fecha com verificação por código+dados (grep, PRAGMA contra `data/crm.db`, `test:lead-actions`, gate completo) mas com débito de UAT visual acumulando há 5 fases.
**Source:** 22-02-SUMMARY.md, 22-03-SUMMARY.md, 22-VERIFICATION.md

### Dois arquivos de REVIEW distintos, com ciclos de vida separados
`22-REVIEW.md` (4 warnings sobre `campanha-actions.ts`, ainda ABERTO) e `22-03-REVIEW.md` (3 warnings sobre o vínculo lead→campanha, FECHADO em b9a2c44) coexistem na mesma fase e não devem ser confundidos.

**Impact:** O débito herdado (WR-01..WR-04 do 22-REVIEW) segue para a Fase 24, que vai consumir `updateCampanha` e precisa fechar WR-02 (sucesso em update de zero linhas) e WR-03 (erros de campo descartados) antes de dar UI de edição.
**Source:** 22-VERIFICATION.md, 22-REVIEW.md, 22-03-REVIEW.md
