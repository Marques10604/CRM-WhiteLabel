# Phase 15: Campo "interesse / serviço desejado" no lead - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Adicionar um campo de texto livre **opcional** `interesse` ao lead — preenchível no
formulário de criar/editar lead e mapeável como coluna no wizard de importação CSV.
Nunca obrigatório, nunca bloqueia submit. Cobre o requisito LEAD-06 e fecha a
milestone v1.4.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**5 requirements are locked.** See `15-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `15-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Coluna `interesse` text nullable em `leads` (schema + migração aditiva)
- `interesse` em `leadBaseSchema` (opcional, trim, `.max(500)`), propagando para `csvRowSchema` e `leadSchema`
- `<Input>` de linha única "Interesse" no `lead-form-dialog.tsx` (criar + editar)
- Persistência de `interesse` nas Server Actions de criar e editar lead
- `"interesse"` como `CsvFieldKey` opcional no wizard, exibido no `csv-column-mapper.tsx`
- Comportamento correto com `interesse` ausente/vazio em todos os caminhos (form, CSV, leads pré-migração)

**Out of scope (from SPEC.md):**
- Lista governada / autocomplete para `interesse` (LEAD-06 diz "texto livre"; governança é futuro do Prospector)
- Coluna `interesse` na tabela de leads (`/leads`), no card do pipeline, ou na timeline
- Filtrar / ordenar / buscar leads por `interesse`
- Backfill de leads existentes (coluna aditiva nullable)
- Fundir `interesse` na feature "coluna extra pra notas" do CSV
- API de handoff do Prospector / renomear para `servicoDesejado`

</spec_lock>

<decisions>
## Implementation Decisions

### Campo no formulário de lead
- **D-01:** O `<Input>` "Interesse" fica **logo abaixo do campo Nicho** no `lead-form-dialog.tsx` — coerente com o objetivo do SPEC ("saber com quem tá falando antes de abordar"). Label exato: `"Interesse"`. Placeholder no espírito de `"Ex: quer site, automação de WhatsApp..."` (o executor pode ajustar o texto mantendo o tom).
- **D-02:** É um `<Input>` de linha única (padrão do campo "Origem"), NÃO um `<Textarea>` (o campo "Notas" continua sendo o único `<Textarea>`). Sem `FieldError` bloqueante além do limite de 500 chars.
- **D-03:** Valor default do form ao editar: `lead?.interesse ?? ""` (mesmo idioma de `origem`/`notas` no `defaultValues`).

### Normalização vazio ↔ null
- **D-04:** Campo vazio grava **`NULL`** no banco (não string vazia). No Zod: `interesse` opcional com `z.preprocess` enxuto que mapeia `""` / `null` / `undefined` → `undefined` (versão simplificada do preprocess de `motivoPerdaId`), depois `z.string().trim().max(500, "<msg PT-BR>").optional()`. A Server Action grava `undefined` como `null`.
- **D-05:** Mensagem de erro do limite (form): PT-BR, algo como `"O interesse deve ter no máximo 500 caracteres."` (executor calibra a copy).

### Migração
- **D-06:** Migração via **script `.cjs` custom** em `scripts/` (padrão dos `migrate-motivos-perda.cjs` / `migrate-tarefas.cjs`), NUNCA `drizzle-kit push` — o doc-comment de `schema.ts` proíbe explicitamente para as tabelas do projeto. SQL: `ALTER TABLE leads ADD COLUMN interesse text` **sem `DEFAULT`** (coluna nullable dispensa a exigência de default do SQLite que forçou `origemTipo`/`sequenciaPosicao`). A migração é aditiva e reversível; não toca dado existente (leads antigos ficam com `interesse = NULL`).
- **D-07:** A declaração Drizzle em `schema.ts`: `interesse: text("interesse")` (nullable), posicionada junto dos campos de texto do lead (perto de `notas` ou logo após `nichoId`). Sem índice — não há filtro/busca por `interesse` (fora de escopo).

### CSV — campo mapeável
- **D-08:** `"interesse"` entra em `CsvFieldKey` (`src/lib/csv-import.ts:13`) — `CsvColumnMapping` (que é `Record<CsvFieldKey, string | null>`) auto-estende. `MappedCsvRow` ganha `interesse: string`.
- **D-09:** `FIELD_CONFIGS` em `csv-column-mapper.tsx` ganha `{ key: "interesse", label: "Interesse", required: false }` — posicionado após `notas` na lista. Oferece "— nenhuma —" (campo opcional não mapeado, padrão D-04 da Fase 5).
- **D-10:** `mapCsvRows` lê o campo com `readMapped(row, "interesse")` e **trunca em 500 chars ANTES da validação**: `readMapped(row, "interesse").slice(0, 500)`. Consequência: uma célula gigante nunca reprova a linha — o lead importa com o `interesse` cortado em 500. O `.max(500)` do `leadBaseSchema` só dispara no caminho do formulário manual.
- **D-11:** `interesse` **não tem** entrada em `CSV_DEFAULTS` — vazio/não-mapeado = `null`, sem fallback. NÃO participa de `buildNotasText` / `extraNotasColumns` (é campo próprio, não coluna extra de notas).

### Claude's Discretion
- Texto exato do placeholder do input e da mensagem de erro de 500 chars (manter PT-BR e o tom do projeto).
- Posição precisa da coluna `interesse` na declaração de `schema.ts` (junto dos campos de texto do lead).
- Nome do arquivo do script de migração (`scripts/migrate-interesse.cjs` ou similar, seguindo o padrão dos existentes).
- Se a Server Action de update precisa de tratamento especial pra "limpar o campo" (passar `null` explícito) — decisão de implementação, contanto que editar apagando o texto resulte em `interesse = NULL`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos travados
- `.planning/phases/15-campo-interesse-servi-o-desejado-no-lead/15-SPEC.md` — 5 requisitos, boundaries e acceptance criteria. Ler ANTES de planejar.

### Requisito de produto
- `.planning/REQUIREMENTS.md` §LEAD-06 — "Cada lead tem um campo opcional 'interesse' (o que o lead quer / serviço desejado, texto livre), editável no formulário de lead e mapeável como coluna no wizard de importação CSV"
- `.planning/ROADMAP.md` §"Phase 15" — goal + 4 Success Criteria

### Contexto externo (não bloqueante, informativo)
- `C:/Users/Vencedor/Desktop/Prospector Inteligente AI/IDEIA.md` §9 — o Prospector no futuro quer um campo `servicoDesejado` no handoff; a Fase 15 entrega o campo como **texto livre** (LEAD-06), governança fica pra outra fase se o Prospector precisar. NÃO renomear nem governar nesta fase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/validations.ts` — `leadBaseSchema` (objeto não-refinado, tem `.omit()`), `leadSchema` (= base + `.refine`), `csvRowSchema` (= `leadBaseSchema.omit().extend()`). Adicionar `interesse` opcional ao `leadBaseSchema` propaga para os 3 automaticamente. Precedente de `z.preprocess` para normalizar `""`→`undefined`: o campo `motivoPerdaId`.
- `src/components/lead-form-dialog.tsx` — form de criar/editar lead (react-hook-form + zodResolver). Campo "Origem" (`<Input>` linha única, linhas ~270-277) é o molde exato pro campo "Interesse". `defaultValues` em ~122-126.
- `src/lib/csv-import.ts` — `CsvFieldKey` (linha 13), `CsvColumnMapping`, `MappedCsvRow`, `mapCsvRows` + `readMapped` (helper que retorna `""` quando não mapeado, já faz `.trim()`), `CSV_DEFAULTS`.
- `src/components/csv-column-mapper.tsx` — `FIELD_CONFIGS` (lista de campos mapeáveis, linha ~17), `NONE_VALUE` sentinela de "não mapeado".
- `scripts/migrate-motivos-perda.cjs`, `scripts/migrate-tarefas.cjs` — molde de script de migração custom (o `package.json` tem `migrate:tarefas`; adicionar um script análogo).
- `src/db/schema.ts` — tabela `leads` (linha 76); doc-comments explicam a restrição de `DEFAULT` do SQLite (`origemTipo`, `sequenciaPosicao`) e a proibição de `drizzle-kit push`.

### Established Patterns
- **Campo opcional no lead:** `motivoPerdaId` é o precedente — nullable no banco, opcional no Zod com `z.preprocess`, obrigatoriedade condicional só quando aplicável (aqui: nunca obrigatório).
- **Migração aditiva:** `ALTER TABLE ... ADD COLUMN` via script `.cjs`, registrado no `package.json` como `migrate:<algo>`, rodado manualmente. Nunca `drizzle-kit push`.
- **CSV field mapeável:** novo valor em `CsvFieldKey` → `FIELD_CONFIGS` ganha a entrada → `mapCsvRows` lê via `readMapped`. Campo opcional oferece "— nenhuma —".
- **Server Action = endpoint HTTP interno:** valida com Zod em runtime mesmo com o TS do cliente garantindo a forma.

### Integration Points
- `leadBaseSchema` (validations.ts) → form (`lead-form-dialog.tsx`) + CSV (`csvRowSchema`) + Server Actions (`lead-actions.ts`)
- `schema.ts` `leads` → todas as queries de lead (nenhuma precisa mudar — `interesse` é só leitura/escrita direta)
- `mapCsvRows` → `csvRowSchema.parse` no preview do wizard → Server Action de import

</code_context>

<specifics>
## Specific Ideas

- O usuário viu o CRM de um amigo (helpdesk "GS Info Sistemas") e o `/atalho` no campo de mensagem — isso é ideia deferida, NÃO faz parte da Fase 15 (ver `.planning/ANALISE-CRM-CONCORRENTE-E-GAPS.md`).
- Placeholder do campo deve dar exemplos do mundo do usuário: "quer site", "automação de WhatsApp" — serviços que ele mesmo poderia vender.

</specifics>

<deferred>
## Deferred Ideas

- **`interesse` na tabela de leads / card do pipeline / timeline** — o SPEC deixou fora; se um dia quiser ver o interesse sem abrir o lead, é fase própria.
- **Filtro/busca por `interesse`** — fora de escopo; fase própria se virar necessidade.
- **Lista governada de "serviço desejado"** (padrão nicho/motivo de perda) — só se o Prospector precisar padronizar o handoff; é o 4º uso do padrão de lista governada, merece fase própria.
- **`/atalho` no campo de mensagem** (visto no CRM do amigo) — melhoria de UX de outra área.
- **Visão mobile/responsiva do CRM** — o gap nº 1 pra operação solo do usuário (ver ANALISE-CRM-CONCORRENTE-E-GAPS.md), mas é milestone própria.

</deferred>

---

*Phase: 15-campo-interesse-servi-o-desejado-no-lead*
*Context gathered: 2026-08-31*
