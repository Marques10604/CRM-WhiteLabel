---
phase: 22-campanha-de-explora-o-de-nicho
verified: 2026-09-05T13:54:57Z
re_verified: 2026-09-05T15:10:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification_note: >
  Re-verificação após o plano 22-03 (gap closure de CAMPANHA-03) + o fix
  b9a2c44 (WR-01/02/03 do 22-03-REVIEW). O truth #3 agora passa: campo
  "Campanha" em lead-form-dialog.tsx (seção Negócio, após Nicho), `campanhaId`
  em leadBaseSchema, persistido em createLead/updateLead sob gate
  `campanhaExists` (FK forjada rejeitada), `nichoId` nunca afetado — provado
  por `npm run test:lead-actions` Casos 21-27. Gate completo verde (tsc, lint,
  build, test:lead-actions, verify:schema, guard:no-hard-delete). Os 3 checks
  de UAT humano abaixo permanecem NÃO-BLOQUEANTES (host 4GB sem navegador).
gaps_resolved:
  - truth: "Ao editar um lead, o usuário pode vincular opcionalmente esse lead a uma campanha existente, sem perder o nicho geral do lead (SC3 / CAMPANHA-03)"
    resolved_by: "22-03-PLAN (commits 0c879de, 746c988, 3f850fe) + fix b9a2c44"
    status: verified
gaps:
  - truth: "Ao editar um lead, o usuário pode vincular opcionalmente esse lead a uma campanha existente, sem perder o nicho geral do lead (SC3 / CAMPANHA-03)"
    status: resolved_2026-09-05
    reason: >
      Apenas a fundação de dados foi entregue. A coluna `leads.campanha_id` existe no
      schema.ts e está aplicada em data/crm.db (FK presente), mas NÃO existe nenhuma
      forma de o usuário vincular um lead a uma campanha: `lead-form-dialog.tsx` não
      tem campo de campanha, `lead-actions.ts` não referencia `campanha`, e o schema
      Zod do lead (`leadBaseSchema`) não tem `campanhaId`. Os dois planos executados
      (22-01, 22-02) declaram `requirements: [CAMPANHA-01, CAMPANHA-02, CAMPANHA-04]` —
      CAMPANHA-03 foi silenciosamente omitido. O objetivo do 22-01-PLAN cita um plano
      "22-03 (vínculo lead→campanha)" que nunca foi criado nem executado. Não há
      CONTEXT.md, nota de adiamento no ROADMAP, nem reatribuição para fase posterior:
      REQUIREMENTS.md ainda mapeia CAMPANHA-03 → Phase 22, status Pending. Nenhuma fase
      23/24/25 recebe CAMPANHA-03 (a Phase 24 PAINEL-01 *consome* o vínculo mas não o
      cria — depende dele já existir).
    artifacts:
      - path: "src/components/lead-form-dialog.tsx"
        issue: "Zero referência a campanha — nenhum campo/combobox para selecionar campanha ao editar um lead"
      - path: "src/actions/lead-actions.ts"
        issue: "createLead/updateLead não leem nem gravam `campanhaId`"
      - path: "src/lib/validations.ts"
        issue: "leadBaseSchema não tem o campo `campanhaId` (opcional)"
    missing:
      - "Campo opcional 'Campanha' no lead-form-dialog.tsx (combobox das campanhas ativas, permitindo 'nenhuma')"
      - "Persistência de `campanhaId` em updateLead/createLead (lead-actions.ts) preservando `nichoId` intacto"
      - "`campanhaId` opcional (nullable) em leadBaseSchema / lead Zod schema"
      - "Query das campanhas ativas para popular o combobox (na página de leads ou no dialog)"
      - "Atualizar REQUIREMENTS.md traceability e o checkbox de CAMPANHA-03 quando implementado"
deferred: []
human_verification:
  - test: "Abrir /campanhas no navegador, clicar 'Nova campanha', escolher um nicho, preencher oferta + meta, ajustar as datas da janela e salvar"
    expected: "Toast 'Campanha criada.', dialog fecha, a nova campanha aparece na lista com o badge 'Explorando'"
    why_human: "Fluxo de UI React (dialog + useActionState + Popover/Calendar) não verificável por grep; host 4GB não permite navegador nesta sessão"
  - test: "Na lista de /campanhas, clicar em uma campanha e conferir a página de detalhe"
    expected: "/campanhas/[id] abre mostrando nicho + oferta no título, badge de estado, 'Meta de conversão' e 'Janela de tempo'"
    why_human: "Navegação e render de rota dinâmica Next; precisa de browser"
  - test: "Acessar /campanhas/abc e /campanhas/99999 diretamente pela URL"
    expected: "Ambas retornam 404 (notFound)"
    why_human: "Comportamento de runtime do notFound() do Next"
---

# Phase 22: Campanha de Exploração de Nicho — Verification Report

**Phase Goal:** O usuário organiza a exploração de um nicho como uma entidade própria do CRM — nicho + oferta + janela de tempo + meta — e pode vincular leads existentes a ela, além de listar/navegar todas as campanhas já criadas.
**Verified:** 2026-09-05T13:54:57Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Usuário cria uma campanha escolhendo um nicho da lista existente, definindo oferta (texto livre), janela de tempo (padrão ~90 dias, editável) e meta de conversão | ✓ VERIFIED | `campanha-form-dialog.tsx`: `NichoCombobox` (nicho), `Textarea` (oferta), `Input` (metaConversao), 2× `JanelaField` Popover+Calendar; defaults `startOfDay(new Date())` e `startOfDay(addDays(new Date(), 90))` (linhas 146-147). Wired: `useActionState(createCampanha)` → `campanhaSchema.safeParse` → `db.insert(campanhas).returning()` (`campanha-actions.ts:59-82`). Tabela `campanhas` com 10 colunas aplicada em `data/crm.db`. `tsc --noEmit` exit 0. Fluxo vivo pendente de UAT humano. |
| 2 | A campanha exibe um estado (explorando / veredito registrado / em escala / abandonada) visível na tela | ✓ VERIFIED | `campanha-estado-badge.tsx`: `ESTADO_LABEL` + `ESTADO_TOKEN` para os 4 estados. Renderizado em `campanha-list.tsx:74` (lista) e `campanhas/[id]/page.tsx:49` (detalhe). Coluna `estado TEXT NOT NULL DEFAULT 'explorando'` confirmada no DB; enum no `schema.ts`. |
| 3 | Ao editar um lead, o usuário pode vincular opcionalmente esse lead a uma campanha existente, sem perder o nicho geral do lead | ✓ VERIFIED (re-verif. 2026-09-05) | Fechado pelo plano 22-03 + fix `b9a2c44`. `leadBaseSchema` tem `campanhaId` opcional (`z.preprocess` vazio→undefined), omitido em `csvRowSchema` (T-22-11). `createLead`/`updateLead` gravam `campanhaId: parsed.data.campanhaId ?? null` sob gate `campanhaExists()` — FK forjada rejeitada com "Selecione uma campanha válida." antes de qualquer escrita (T-22-10). `nichoId` asserido intacto em todos os casos. Campo "Campanha" em `lead-form-dialog.tsx` (seção Negócio, após Nicho) + `CampanhaCombobox` (com "Nenhuma campanha" pra desvincular), fiado nas 3 telas (`/leads`, `/`, `/pipeline`) via prop obrigatória. `updateLead` revalida `/leads` (WR-01). Casos 21-27 de `test:lead-actions` verdes, incl. Caso 27 (campanha soft-deletada continua salvável, T-22-12). Fluxo React vivo pendente de UAT humano (não-bloqueante). |
| 4 | Usuário lista todas as campanhas já criadas e navega até o detalhe de qualquer uma delas | ✓ VERIFIED | `/campanhas/page.tsx` → `CampanhaList` (query `isNull(deletedAt)` ordenada por `createdAt` desc) → `<Link href={`/campanhas/${campanha.id}`}>` por item (`campanha-list.tsx:62`). `/campanhas/[id]/page.tsx` renderiza detalhe (guard de inteiro positivo + `notFound()` + `notFound()` para soft-deletada). `app-sidebar.tsx:26` tem `{ href: "/campanhas", label: "Campanhas", icon: Target }`. Estado vazio com CTA presente. `npm run build` passou (nota da task). |

**Score:** 4/4 truths verified (era 3/4 na verificação inicial; truth #3 fechado pelo plano 22-03 + fix `b9a2c44` — ver `re_verification_note` no frontmatter)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/db/schema.ts` | tabela `campanhas` + coluna `leads.campanhaId` | ✓ VERIFIED | `export const campanhas = sqliteTable("campanhas"` (linha 108), 10 colunas, 3 índices; `campanhaId: integer("campanha_id").references(() => campanhas.id, { onDelete: "set null" })` (linha 177) + `leads_campanha_id_idx` |
| `scripts/migrate-campanhas.cjs` | migração manual idempotente rodada contra data/crm.db | ✓ VERIFIED | 174 linhas; `data/crm.db` contém `campanhas` (10 colunas), 4 índices, FK `nicho_id→subnichos`, FK `leads.campanha_id→campanhas`; `leads` count = 44 (intacto) |
| `src/actions/campanha-actions.ts` | createCampanha / updateCampanha / softDeleteCampanha | ✓ VERIFIED (com ressalvas) | 3 exports presentes; `safeParse` antes de qualquer escrita (linhas 59, 89); `nichoExists` + `isForeignKeyViolation` backstop. `updateCampanha`/`softDeleteCampanha` sem consumidor de UI (IN-01). |
| `src/lib/validations.ts` | campanhaSchema / campanhaUpdateSchema | ✓ VERIFIED | `campanhaBaseSchema` (linha 288) + `.refine` de janela; `campanhaSchema` (296), `campanhaUpdateSchema` (303) deriva via `.extend`; `CampanhaFormValues` |
| `src/types/index.ts` | tipos Campanha / NewCampanha | ✓ VERIFIED | linhas 22-23 via `InferSelectModel`/`InferInsertModel` |
| `src/components/campanha-form-dialog.tsx` | dialog de criação (nicho/oferta/meta/janela) | ✓ VERIFIED | 306 linhas; `useActionState(createCampanha)` + `zodResolver(campanhaSchema)`; 2 date pickers via `JanelaField` |
| `src/components/campanha-list.tsx` | listagem + 'Nova campanha' + estado vazio | ✓ VERIFIED | 84 linhas; estado vazio "Nenhuma campanha criada ainda" + CTA; lista de `Link` |
| `src/components/campanha-estado-badge.tsx` | badge visual dos 4 estados | ✓ VERIFIED | `ESTADO_LABEL` presente; 4 estados em label + token |
| `src/app/campanhas/page.tsx` | rota /campanhas | ✓ VERIFIED | server component, query + `CampanhaList` |
| `src/app/campanhas/[id]/page.tsx` | rota de detalhe /campanhas/[id] | ✓ VERIFIED | `params: Promise<{ id: string }>`, guard + `notFound()`, `leftJoin` com nichos |
| `src/components/app-sidebar.tsx` | item 'Campanhas' na sidebar | ✓ VERIFIED | `NAV_ITEMS` entry `/campanhas` com ícone `Target`, entre Pipeline e Relatórios |
| Lead-linking UI (CAMPANHA-03) | campo de campanha ao editar lead | ✗ MISSING | Não existe em nenhum arquivo — ver truth #3 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `campanha-form-dialog.tsx` | `campanha-actions.ts` (createCampanha) | `useActionState(createCampanha, undefined)` + `formAction` em `startTransition` | ✓ WIRED | linhas 31, 133-136, 185-187 |
| `campanha-actions.ts` | `schema.ts` (campanhas) | `db.insert(campanhas).values(...).returning()` / `db.update(campanhas)` | ✓ WIRED | linhas 70, 100-103, 123-126 |
| `campanha-list.tsx` | `campanhas/[id]/page.tsx` | `<Link href={`/campanhas/${campanha.id}`}>` | ✓ WIRED | `campanha-list.tsx:62` |
| `app-sidebar.tsx` | `campanhas/page.tsx` | `NAV_ITEMS` entry `href: "/campanhas"` | ✓ WIRED | `app-sidebar.tsx:26` |
| `migrate-campanhas.cjs` | `data/crm.db` | `CREATE TABLE campanhas` + `ALTER TABLE leads ADD campanha_id` | ✓ WIRED | Confirmado por PRAGMA contra o DB real |
| `lead-form-dialog.tsx` | `campanha-actions.ts` / `campanhas` | campo de vínculo → updateLead | ✗ NOT_WIRED | Não existe nenhuma conexão lead→campanha na camada de UI/ação (CAMPANHA-03) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `campanhas/page.tsx` → `CampanhaList` | `campanhasAtivas` | `db.select().from(campanhas).where(isNull(deletedAt))` | Sim (query real; 0 linhas hoje porque nenhuma campanha criada ainda — esperado) | ✓ FLOWING |
| `campanhas/[id]/page.tsx` | `row` | `db.select(...).from(campanhas).leftJoin(nichos)` | Sim (query real parametrizada por id) | ✓ FLOWING |
| `campanha-form-dialog.tsx` | `nichos` (prop) | `db.select().from(nichos)` em `campanhas/page.tsx` → `CampanhaList` → dialog | Sim | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Tabela `campanhas` existe no DB real com as 10 colunas | `node -e` PRAGMA table_info(campanhas) | `id,nicho_id,oferta,meta_conversao,janela_inicio,janela_fim,estado,deleted_at,created_at,updated_at` | ✓ PASS |
| `leads.campanha_id` aplicada + FK | `node -e` PRAGMA table_info/foreign_key_list(leads) | coluna presente; FK `campanha_id → campanhas` | ✓ PASS |
| `leads` intactos após migração | `SELECT count(*) FROM leads` | 44 (bate com o SUMMARY) | ✓ PASS |
| Gate de schema cobre `campanhas` | `npm run verify:schema` | exit 0, menciona `campanhas`/`campanha_id` + conjunto estrito de colunas | ✓ PASS |
| Type check | `npx tsc --noEmit` | exit 0 | ✓ PASS |

### Probe Execution

Nenhuma probe convencional (`scripts/*/tests/probe-*.sh`) neste projeto; fase não declara probes. `npm run verify:schema` (o gate declarado no plano) executado acima — exit 0.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| CAMPANHA-01 | 22-01, 22-02 | Cria campanha (nicho + oferta + janela ~90d editável + meta) | ✓ SATISFIED | Truth #1 |
| CAMPANHA-02 | 22-01, 22-02 | Campanha tem estado (4 valores) visível | ✓ SATISFIED | Truth #2 |
| CAMPANHA-03 | 22-03 (gap closure) | Lead vinculável a uma campanha (campo opcional) além do nicho geral | ✓ SATISFIED | Truth #3 (re-verificado 2026-09-05). `REQUIREMENTS.md` → Complete |
| CAMPANHA-04 | 22-01, 22-02 | Lista e navega campanhas criadas | ✓ SATISFIED | Truth #4 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `scripts/migrate-campanhas.cjs` / `schema.ts` | 177 / DDL | `schema.ts` declara `onDelete: "restrict"`/`"set null"`; DDL real emite `REFERENCES` sem cláusula `ON DELETE` → DB usa `NO ACTION` (confirmado por PRAGMA) | ⚠️ Warning (WR-01) | Comportamento não quebra hoje (só soft-deletes no app); hard-delete via Drizzle Studio seria rejeitado em vez de anular `leads.campanha_id`. Doc-comments enganosos. |
| `src/actions/campanha-actions.ts` | 99-114 | `updateCampanha` retorna `{ success: true }` mesmo com zero linhas afetadas (id inexistente/soft-deleted) | ⚠️ Warning (WR-02) | Sem consumidor de UI nesta fase; risco latente para a Fase 24 |
| `src/components/campanha-form-dialog.tsx` | 156-158 | `state.errors` do server descartados — só toast genérico, `form.setError` nunca chamado | ⚠️ Warning (WR-03) | Baixa alcançabilidade hoje (só nicho hard-deleted dispara); padrão errado propaga para a Fase 24 |
| `src/actions/campanha-actions.ts` | arquivo todo | Sem `scripts/test-campanha-actions.cjs` — único módulo de action do repo sem harness | ⚠️ Warning (WR-04) | Refine de janela, backstop de FK e soft-delete idempotente não exercitados por teste |
| `src/actions/campanha-actions.ts` | 85-130 | `updateCampanha`/`softDeleteCampanha` exportados mas não importados por nenhum componente | ℹ️ Info (IN-01) | Código especulativo; aceitável se a Fase 24 consumir |
| `src/components/campanha-estado-badge.tsx` | 31-40 | Sem fallback para `estado` fora do enum (`ESTADO_LABEL[estado]` → undefined) | ℹ️ Info (IN-06) | Badge vazio se valor inválido escrito direto no DB |
| `src/components/campanha-list.tsx` | 38-56 | Botão "Nova campanha" duplicado no estado vazio (top-bar + CTA) | ℹ️ Info (IN-07) | Cosmético |

Nenhum marcador de dívida (`TODO`/`FIXME`/`XXX`/`HACK`) nos arquivos da fase.

### Human Verification Required

Itens de UI que não são verificáveis por inspeção de código (host 4GB sem browser nesta sessão). **Não bloqueiam** — o status já é `gaps_found` pela falha de CAMPANHA-03; estes são checagens complementares para quando a UI de vínculo for implementada e a fase re-verificada.

#### 1. Criação de campanha pela UI
**Test:** Abrir `/campanhas`, clicar "Nova campanha", escolher nicho, preencher oferta + meta, ajustar janela, salvar.
**Expected:** Toast "Campanha criada.", dialog fecha, campanha aparece na lista com badge "Explorando".
**Why human:** Fluxo React (dialog + `useActionState` + Popover/Calendar) não verificável por grep.

#### 2. Listagem e navegação
**Test:** Na lista, clicar numa campanha; conferir `/campanhas/[id]`.
**Expected:** Detalhe abre com nicho + oferta no título, badge de estado, "Meta de conversão" e "Janela de tempo".
**Why human:** Navegação de rota dinâmica Next precisa de browser.

#### 3. Guard de URL inválida
**Test:** Acessar `/campanhas/abc` e `/campanhas/99999`.
**Expected:** Ambas retornam 404.
**Why human:** Comportamento de runtime do `notFound()`.

### Gaps Summary

A fundação da entidade **campanha** está sólida e realmente entregue: a tabela `campanhas`
(nicho + oferta + janela + meta + estado) está viva em `data/crm.db` com todos os índices e FKs,
os tipos/Zod/Server Actions existem e estão tipados, e a UI de criação + listagem + detalhe +
navegação na sidebar está wired de ponta a ponta (3 dos 4 critérios de sucesso do ROADMAP
verificados por código + dados).

O gap único e bloqueante é o **critério de sucesso #3 / CAMPANHA-03**: o objetivo da fase diz
explicitamente "**e pode vincular leads existentes a ela**", mas essa capacidade não existe.
Só a coluna `leads.campanha_id` foi criada (no schema e no banco) — não há campo no
`lead-form-dialog.tsx`, `lead-actions.ts` não grava `campanhaId`, e o schema Zod do lead não
tem o campo. Os dois planos executados (22-01, 22-02) declararam apenas
`[CAMPANHA-01, CAMPANHA-02, CAMPANHA-04]` no frontmatter; o próprio 22-01-PLAN referencia um
plano "**22-03 (vínculo lead→campanha)**" que nunca foi criado nem executado. Não há CONTEXT.md,
nota de adiamento no ROADMAP, nem reatribuição: REQUIREMENTS.md ainda marca CAMPANHA-03 como
Pending sob Phase 22, e nenhuma fase posterior (23/24/25) a absorve — ao contrário, a Phase 24
(PAINEL-01) *depende* desse vínculo já existir para agregar "os leads *dela*".

Conclusão: execução incompleta da fase (falta o 3º plano), não um descope deliberado. Recomendação:
planejar e executar o vínculo lead→campanha (`/gsd-plan-phase 22 --gaps`) antes de fechar a fase.

Achados secundários (não bloqueiam, herdados do 22-REVIEW): divergência `onDelete` schema vs DDL
real (WR-01), `updateCampanha` reporta sucesso em update de zero linhas (WR-02), dialog descarta
erros de campo do server (WR-03), ausência de harness de teste para `campanha-actions.ts` (WR-04).

#### Possível override (se for decisão do sócio)

Se o usuário decidir que o vínculo lead→campanha deve ser feito na **Phase 24** junto com o
PAINEL (que o consome), adicione ao frontmatter deste VERIFICATION.md e re-rode a verificação:

```yaml
overrides:
  - must_have: "Ao editar um lead, o usuário pode vincular opcionalmente esse lead a uma campanha existente, sem perder o nicho geral do lead"
    reason: "Vínculo lead→campanha (CAMPANHA-03) movido para a Phase 24, junto do PAINEL-01 que o consome — coluna de dados já entregue na Phase 22"
    accepted_by: "<seu nome>"
    accepted_at: "<timestamp ISO>"
```
Isso exige também atualizar a Traceability em REQUIREMENTS.md (CAMPANHA-03 → Phase 24) e o
ROADMAP (mover o critério #3 / requisito da Phase 22 para a Phase 24).

---

## Re-Verification — 2026-09-05 (após 22-03 + fix WR-01/02/03)

**Status: `gaps_found` → `passed` (4/4).**

O único gap bloqueante (truth #3 / CAMPANHA-03) foi fechado:

| Evidência | Verificado |
| --- | --- |
| `campanhaId` opcional em `leadBaseSchema` (`src/lib/validations.ts`), omitido em `csvRowSchema` (`.omit`) | ✓ grep + Caso 26 |
| `campanhaExists()` + gate de FK forjada antes de qualquer escrita em `createLead`/`updateLead` (`src/actions/lead-actions.ts`) | ✓ Caso 25 (rejeita `999999` com msg exata) |
| `campanhaId: parsed.data.campanhaId ?? null` — persiste e materializa o desvincular | ✓ Casos 21/23/24 |
| `nichoId` nunca afetado por operação de campanha | ✓ asserido em todos os Casos 21-27 |
| Campo "Campanha" em `lead-form-dialog.tsx` + `CampanhaCombobox` fiado nas 3 telas (prop obrigatória força `tsc`) | ✓ grep + `tsc --noEmit` exit 0 |
| `updateLead` revalida `/leads` (WR-01 do 22-03-REVIEW) | ✓ grep `lead-actions.ts:272` |
| Comentário do backstop de FK corrigido para `onDelete:"set null"` (WR-02) | ✓ grep |
| Campanha soft-deletada continua salvável ao re-salvar o lead (WR-03 / T-22-12) | ✓ Caso 27 (novo) |

**Gate completo:** `tsc --noEmit` 0 · `lint` 0 (4 warnings pré-existentes de TanStack Table) · `build` 0 (14 rotas) · `test:lead-actions` OK (Casos 1-27) · `verify:schema` 0 · `guard:no-hard-delete` 0.

**UAT humano ainda pendente (NÃO-BLOQUEANTE — host 4GB sem navegador):** os 3 checks de UI da seção "Human Verification Required" acima + os 3 checks do `22-03-SUMMARY.md` (abrir/salvar/reabrir lead com campanha nas telas `/leads`, `/pipeline`, `/`).

**Débito herdado do `22-REVIEW.md` (WR-01..WR-04, sobre `campanha-actions.ts`) — continua aberto, não bloqueia a fase.** É um conjunto de warnings diferente do `22-03-REVIEW.md` (já fechado).

---

_Verified: 2026-09-05T13:54:57Z_
_Re-verified: 2026-09-05_
_Verifier: Claude (gsd-verifier / in-session code+data re-verification)_
