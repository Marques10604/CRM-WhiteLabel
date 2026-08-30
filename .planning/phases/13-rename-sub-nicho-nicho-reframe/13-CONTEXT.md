# Phase 13: Rename `sub-nicho → nicho` + reframe - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

O campo de categorização de lead deixa de se chamar "sub-nicho" e de pressupor "área da saúde". Passa a se chamar **`nicho`** em todo código e toda tela — lista plana, sem hierarquia — e toda a copy visível fica agnóstica de nicho.

**Escopo:** rename mecânico de identificadores (exports Drizzle, props, tipos, Zod, nomes de arquivo, rota, componentes, labels) + varredura de copy. **NÃO** é migração de dados (ver D-01), **NÃO** adiciona capacidade nova.

**Fora desta fase (outras fases do v1.4):**
- Filtro de intervalo de datas em `/relatorios` → Fase 14 (METRICAS-03)
- Campo "interesse / serviço desejado" no lead → Fase 15 (LEAD-06)

**Requisitos cobertos:** NICHO-01, NICHO-02, COPY-01
</domain>

<decisions>
## Implementation Decisions

### Migração do banco

- **D-01: Rename SÓ na camada de código/UI — o banco `data/crm.db` fica intocado.**
  A tabela física continua `subnichos`, a coluna FK continua `subnicho_id`, os 3 índices (`subnicho_nome_unique_idx`, `subnichos_deleted_at_idx`, `leads_subnicho_id_idx`) continuam com os nomes atuais. O Drizzle mapeia:
  ```ts
  export const nichos = sqliteTable("subnichos", { ... })   // objeto exportado = nichos
  nichoId: integer("subnicho_id").references(() => nichos.id)  // prop = nichoId, coluna física = subnicho_id
  ```
  **Motivo:** o nome físico é detalhe interno que o usuário nunca vê no app. Zero migração = zero risco pros 37 leads reais, e não esbarra no snapshot do `drizzle-kit` que já está divergente do banco desde as Fases 4/6/7/8. Nenhum backup de `data/crm.db` necessário nesta fase.
  **Custo aceito:** quem abrir o Drizzle Studio vê `subnichos`/`subnicho_id`. Um **doc-comment no `schema.ts`** deve explicar a divergência intencional entre nome lógico e físico (mesmo padrão dos doc-comments que o projeto já tem, ex: coluna morta `leads.motivoPerda`).
  **Não-objetivo:** limpar o banco também. Se um dia for desejado, é uma migração trivial isolada — mas não há motivo funcional.

### Rota antiga

- **D-02: `/subnichos` → redirect 301 permanente para `/nichos`** via `next.config.ts` `redirects()`:
  ```ts
  async redirects() {
    return [{ source: "/subnichos", destination: "/nichos", permanent: true }];
  }
  ```
  Permanente, zero manutenção, segura bookmark/memória muscular, e é rede de segurança se algum link hardcoded `/subnichos` escapar da varredura. O diretório `src/app/subnichos/` é movido para `src/app/nichos/`.

### Varredura de copy

- **D-03: Varredura AMPLA.** Não só os 3 pontos com "área da saúde"/"nutricionista" literais — varrer também: `<title>`s / metadata de página, estados vazios, textos de ajuda (`FieldDescription`), placeholders, e qualquer string com "sub-nicho"/"subnicho" visível ao usuário.
  - Pontos "saúde" confirmados no scout: `src/app/layout.tsx:19` (metadata `description`), `src/components/lead-form-dialog.tsx:339` (help text), `src/components/template-form-dialog.tsx:129` (placeholder).
- **D-04: Texto de ajuda do campo usa exemplo GENÉRICO.** O `FieldDescription` do campo de nicho no form de lead vira algo como **"Nicho do lead (ex: dentista, e-commerce de roupa, academia)."** — exemplo genérico reforça o despívo e ajuda usuário novo. Nada de "nutricionista/terapeuta".
- **D-05: Metadata do app** (`layout.tsx`) — `description` deixa de dizer "área da saúde". Sugestão: "CRM pessoal para organizar leads e o funil de vendas." (planner/executor ajusta o texto exato; a regra é: sem referência a nicho específico).
- **D-06: Valor "A categorizar"** (fallback de lead sem nicho, `SEM_SUBNICHO_FALLBACK` em `csv-import-preview-table.tsx:50`, e seed id 1) **fica como está** — já é agnóstico. Só o nome da const muda (`SEM_NICHO_FALLBACK`).

### Quebra em planos — 3 ondas sequenciais

- **D-07: Onda 1 — Camada de dados.**
  - `src/db/schema.ts`: `subnichos` export → `nichos` (mantendo `sqliteTable("subnichos", ...)`); `leads.subnichoId` → `nichoId` (mantendo `integer("subnicho_id")`); doc-comment explicando a divergência lógico↔físico. Nomes de índice no schema podem manter os identificadores atuais (são strings do banco).
  - `src/types/index.ts`, `src/lib/validations.ts` (8 occ — `subnichoId`/`subnichoNome`), `src/db/queries.ts` (16 occ — `getContagemPorSubnicho` → `getContagemPorNicho` etc.)
  - `src/lib/csv-import.ts`: `CsvFieldKey` `"subnichoNome"` → `"nichoNome"`; `subnichoNome` na row type → `nichoNome`
  - `src/actions/subnicho-actions.ts` → `src/actions/nicho-actions.ts` (30 occ — `createSubnicho`/`softDeleteSubnicho`/`renameSubnicho` → `*Nicho`)
  - **`scripts/guard-no-hard-delete.cjs`**: `CODE_PATTERNS` `/\.delete\(\s*subnichos\b/` → `/\.delete\(\s*nichos\b/` (o objeto Drizzle agora é `nichos` — senão a tabela renomeada fica desprotegida). `CODE_SQL_PATTERNS` (`DELETE FROM subnichos`, `DROP TABLE subnichos`) **ficam** — a tabela física continua `subnichos`. Comentários + string de OK atualizados pra "nicho" com nota da divergência.
  - `scripts/verify-schema.cjs`: **nenhuma mudança** — ele verifica o banco físico, que não muda (`requiredTables` inclui `"subnichos"`, `subnicho_nome_unique_idx` — corretos). Opcional: comentário notando a divergência.
- **D-08: Onda 2 — Superfícies de UI.**
  - `src/app/subnichos/` → `src/app/nichos/` + redirect no `next.config.ts` (D-02)
  - 4 componentes dedicados: `subnicho-combobox.tsx` → `nicho-combobox.tsx` (24 occ), `subnicho-manager.tsx` → `nicho-manager.tsx` (23), `delete-subnicho-dialog.tsx` → `delete-nicho-dialog.tsx` (10), e imports correspondentes
  - `src/components/app-sidebar.tsx`: item `{ href: "/subnichos", label: "Sub-nichos" }` → `{ href: "/nichos", label: "Nichos" }`
  - ~15 consumidores: `lead-form-dialog.tsx`, `lead-table.tsx`, `lead-table-columns.tsx`, `lead-table-toolbar.tsx`, `lead-actions.ts`, `import-actions.ts`, `csv-import-wizard.tsx`, `csv-import-preview-table.tsx`, `csv-column-mapper.tsx`, `followup-dashboard.tsx`, `pipeline-board.tsx`, `pipeline-lead-card.tsx`, `post-import-lead-list.tsx`, `whatsapp-preview-dialog.tsx`, `lixeira-table.tsx`, `motivo-perda-*` (referências cruzadas), `relatorios/page.tsx`, `leads/page.tsx`, `pipeline/page.tsx`, `lixeira/page.tsx`, `importar/**`, `hooks/use-first-contact-trigger.ts`, `lib/whatsapp.ts`
- **D-09: Onda 3 — Varredura de copy.**
  - Aplicar D-03/D-04/D-05: os 3 pontos "saúde" + varredura de `"sub-nicho"`/`"Sub-nicho"` visível + `<title>`s/metadata + estados vazios
  - **Gate de grep** ao fim: `grep -rniE "sub-?nicho|área da saúde|nutricionista|terapeuta" src/` não retorna nenhuma string de UI (comentários/identificadores já tratados nas ondas 1-2; se sobrar algo, é bug)
  - Harnesses `.cjs` que referenciam `subnicho` (`test-relatorios-queries.cjs`, `test-lead-actions.cjs`) — atualizar os nomes de função/import; os `INSERT INTO subnichos` **ficam** (banco físico)

### Claude's Discretion

- Nomes exatos de funções renomeadas (`getContagemPorSubnicho` → `getContagemPorNicho` vs `getContagemPorNichoLead` etc.) — seguir o padrão mais curto/consistente com o resto do arquivo.
- Texto exato da metadata do `layout.tsx` e dos `FieldDescription` — D-04/D-05 dão a regra, o executor escreve.
- Se `subnicho_nome_unique_idx` etc. devem ganhar um alias no schema Drizzle ou ficar com o nome-string atual — decisão de baixo impacto, seguir o que o `drizzle-orm` exige sem gerar migração.
- Ordem interna de tarefas dentro de cada onda.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` §"Phase 13: Rename `sub-nicho → nicho` + reframe" — goal, success criteria (5), plano-hint
- `.planning/REQUIREMENTS.md` — NICHO-01, NICHO-02, COPY-01 (descrições)
- `.planning/PROJECT.md` §"Current Milestone: v1.4" — meta do despívo, o que está fora de escopo

### Padrões do projeto relevantes
- `.planning/STATE.md` §"Accumulated Context" → Decisions — o débito do snapshot `drizzle-kit` divergente (Fases 4/6/7/8); o padrão de migração manual via `better-sqlite3` (NÃO usado nesta fase por D-01)
- `CLAUDE.md` §Constraints — nomenclatura de schema genérica é regra permanente (esta fase materializa isso pro campo de nicho)

Sem ADRs/specs externos — requisitos totalmente capturados nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Footprint do rename (scout 2026-08-30)
- **484 ocorrências de `subnicho`/`subNicho`/`sub-nicho` em 47 arquivos.**
- Núcleo: `src/db/schema.ts` (tabela `subnichos` L4-14, FK `leads.subnichoId` L77, índice `leads_subnicho_id_idx` L98), `src/actions/subnicho-actions.ts` (30), `src/components/subnicho-combobox.tsx` (24), `csv-import-wizard.tsx` (24), `csv-import-preview-table.tsx` (49), `subnicho-manager.tsx` (23), `lead-actions.ts` (19), `import-actions.ts` (35), `lead-table.tsx`/`lead-table-toolbar.tsx` (18/17).

### Reusable Assets / o que NÃO recriar
- A tabela `subnichos` tem `nome` (unique lower(trim)), `deletedAt` (soft-delete) — estrutura fica idêntica, só o nome do export Drizzle muda.
- `subnicho-actions.ts` só faz `db.update` (soft-delete via `deletedAt` + reativação por nome) — **nenhum `db.delete`**. O guard protege defensivamente.
- `SEM_SUBNICHO_FALLBACK = "A categorizar"` (`csv-import-preview-table.tsx:50`) — lead sem nicho no CSV cai nesse valor; comportamento e valor ficam, só o nome da const muda.

### Established Patterns
- Doc-comments explicando divergências intencionais no `schema.ts` (ex: coluna morta `leads.motivoPerda` fora do schema) — usar o mesmo estilo pro `subnichos` físico vs `nichos` lógico (D-01).
- `verify-schema.cjs` valida o **banco físico** (nomes reais) — não muda com rename só-de-código.
- `guard-no-hard-delete.cjs`: `CODE_PATTERNS` casam o **objeto Drizzle** (muda), `CODE_SQL_PATTERNS` casam a **string SQL do nome físico** (não muda).
- Migração de schema no projeto = manual `better-sqlite3` com backup — **não se aplica aqui** (D-01, sem migração).

### Integration Points
- FK `leads.subnicho_id → subnichos.id` (`onDelete: "restrict"`) — intocada fisicamente; no schema Drizzle vira `nichoId → nichos.id`.
- `/relatorios` (Fase 11) consome `getContagemPorSubnicho` — Fase 14 vai mexer nessa mesma tela; renomear a função aqui, Fase 14 usa o nome novo.
- Wizard de importação CSV (`CsvFieldKey "subnichoNome"`) — Fase 15 (campo "interesse") também mexe no `CsvFieldKey`; renomear aqui, Fase 15 adiciona a nova key.

</code_context>

<specifics>
## Specific Ideas

- Termo definitivo: **"nicho"** (não "segmento", não "categoria"). É a palavra que o usuário e o futuro Prospector já usam ("testar nicho", "nichos rotativos"). Decidido antes desta discussão, no planejamento do milestone v1.4.
- Lista **plana** — nada de nicho-pai / sub-nicho-filho. "dentista", "e-commerce de roupa", "academia", "automotivo" são todos irmãos.
- Exemplo de nicho pro texto de ajuda: `dentista, e-commerce de roupa, academia` (genérico, 3 nichos de setores bem diferentes).

</specifics>

<deferred>
## Deferred Ideas

- **Limpar os nomes físicos do banco** (`subnichos`/`subnicho_id` → `nichos`/`nicho_id`) — descartado por D-01; se um dia desejado, migração trivial isolada, não uma fase.
- **Entidade "campanha / janela de teste de nicho"** — decidido (nesta sessão) que mora no **Prospector**, não no CRM. Registrado como `CAMPANHA-01` (Future) no `REQUIREMENTS.md` e na PARTE III do `IDEIA.md` do Prospector.
- Filtro de intervalo de datas em `/relatorios` → Fase 14 (METRICAS-03).
- Campo "interesse / serviço desejado" no lead → Fase 15 (LEAD-06).

Nenhum todo pendente foi dobrado — os 2 matches do scanner (`sequencia-follow-up-escalonada`, `agenda-e-tarefas-soltas`) são de trabalho v1.3 já shipado, casaram por palavra-chave genérica ("lead", "form"), não têm relação com o rename.

</deferred>

---

*Phase: 13-rename-sub-nicho-nicho-reframe*
*Context gathered: 2026-08-30*
