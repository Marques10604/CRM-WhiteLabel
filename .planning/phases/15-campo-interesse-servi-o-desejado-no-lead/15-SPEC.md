# Phase 15: Campo "interesse / serviço desejado" no lead — Specification

**Created:** 2026-08-31
**Ambiguity score:** 0.13 (gate: ≤ 0.20)
**Requirements:** 5 locked

## Goal

Cada lead ganha um campo opcional `interesse` (texto livre, uma linha, até 500 caracteres) que o admin preenche no formulário de lead e pode mapear de uma coluna no wizard de importação CSV — nunca obrigatório, nunca bloqueia o submit.

## Background

Estado atual do código (reconhecimento em 2026-08-31):

- A tabela `leads` (`src/db/schema.ts:76`) **não tem** coluna `interesse`. Colunas atuais: `nome, telefone, canal, origem, origemTipo, valorEstimado, notas, followUpDate, nichoId, stage, motivoPerdaId, stageChangedAt, contactAttempts, sequenciaPosicao, importBatchId, deletedAt, createdAt, updatedAt`.
- `leadBaseSchema` / `leadSchema` (`src/lib/validations.ts`) — Zod. **Sem** `interesse`. `notas` e `origem` são `.min(1)` (obrigatórios); nenhum campo de texto tem `.max()` hoje.
- `lead-form-dialog.tsx` é o único lugar de **criar E editar** lead — **não existe tela de detalhe separada**. "Tela de detalhe/edição" do critério do ROADMAP = este dialog.
- `csvRowSchema` (`src/lib/validations.ts:103`) deriva de `leadBaseSchema` via `.omit().extend()`. `CsvFieldKey` (`src/lib/csv-import.ts:13`) = `nome | telefone | nichoNome | canal | origem | valorEstimado | notas` — **sem** `interesse`. `csv-column-mapper.tsx` renderiza a UI de mapeamento a partir desse tipo.
- A tabela de leads (`/leads`, `lead-table-columns.tsx`) mostra: nome, nicho, etapa, follow-up, telefone, ações. `notas` **não** aparece na tabela.
- Existe a feature "coluna extra pra notas" no CSV (`CsvExtraNotasColumns`) — `interesse` **não** se mistura com ela, é campo próprio.

Gap: a coluna, o campo no Zod, o input no form, a persistência nas Server Actions e a opção no wizard CSV — nada disso existe.

## Requirements

1. **Coluna `interesse` no schema**: `leads` ganha uma coluna de texto nullable.
   - Current: não existe coluna `interesse` em `leads`
   - Target: `interesse: text("interesse")` (nullable) declarada em `src/db/schema.ts` e presente no banco via migração aditiva
   - Acceptance: `PRAGMA table_info(leads)` lista a coluna `interesse` do tipo TEXT, nullable; `SELECT interesse FROM leads` roda sem erro

2. **Campo `interesse` no Zod (`leadBaseSchema`)**: opcional, texto trimado, máximo 500 caracteres.
   - Current: `leadBaseSchema` não tem `interesse`
   - Target: `interesse: z.string().trim().max(500, "...").optional()` (ou equivalente que normalize `""`/`undefined`) em `leadBaseSchema`, fluindo automaticamente para `csvRowSchema` e `leadSchema`
   - Acceptance: `leadSchema.parse({...sem interesse})` passa; `leadSchema.parse({ interesse: "x".repeat(501), ... })` falha com mensagem de limite; `leadSchema.parse({ interesse: "", ... })` passa e resulta em valor vazio/nulo consistente

3. **Input `interesse` no formulário de lead**: campo de linha única no `lead-form-dialog.tsx`, opcional, nunca bloqueia o submit.
   - Current: o form não renderiza nenhum campo de interesse
   - Target: um `<Input>` de linha única rotulado "Interesse" no dialog de criar/editar lead; pré-preenchido com o valor salvo ao editar; salvar sem preencher funciona normalmente
   - Acceptance: criar lead com "Interesse" preenchido → reabrir o dialog de edição mostra o valor; criar/editar lead com "Interesse" vazio → submit conclui sem erro de validação

4. **Persistência nas Server Actions de lead**: `createLead` e `updateLead` gravam e atualizam `interesse`.
   - Current: as actions de lead não conhecem `interesse`
   - Target: a Server Action de criar lead persiste `interesse`; a de editar atualiza (inclusive limpar → volta a nulo/vazio)
   - Acceptance: criar via form com valor → `SELECT interesse` retorna o valor; editar apagando o campo → `SELECT interesse` retorna NULL ou string vazia (consistente com a normalização do req. 2)

5. **`interesse` como campo mapeável no wizard de importação CSV**: novo `CsvFieldKey` opcional, aparece no column-mapper, valor importado entra no lead.
   - Current: `CsvFieldKey` não inclui `interesse`; o mapper não oferece essa opção
   - Target: `"interesse"` adicionado a `CsvFieldKey`; o `csv-column-mapper.tsx` lista "Interesse" como campo **opcional** (não `required`); a linha importada com essa coluna mapeada cria o lead com `interesse` preenchido; sem mapear, o import funciona igual a antes
   - Acceptance: importar CSV com uma coluna mapeada para "Interesse" → os leads criados têm `interesse` populado; importar o mesmo CSV sem mapear "Interesse" → leads criados com `interesse` nulo/vazio e nenhuma regressão no fluxo

## Boundaries

**In scope:**
- Coluna `interesse` text nullable em `leads` (schema + migração aditiva)
- `interesse` em `leadBaseSchema` (opcional, trim, `.max(500)`), propagando para `csvRowSchema` e `leadSchema`
- `<Input>` de linha única "Interesse" no `lead-form-dialog.tsx` (criar + editar)
- Persistência de `interesse` nas Server Actions de criar e editar lead
- `"interesse"` como `CsvFieldKey` opcional no wizard, exibido no `csv-column-mapper.tsx`
- Comportamento correto com `interesse` ausente/vazio em todos os caminhos (form, CSV, leads pré-migração)

**Out of scope:**
- Lista governada / autocomplete para `interesse` — LEAD-06 diz "texto livre"; governança de "serviço desejado" (padrão nicho/motivo de perda) é preocupação futura do Prospector, não desta fase
- Coluna `interesse` na tabela de leads (`/leads`) — não pedido no requisito; mantém a tabela enxuta (mesmo tratamento de `notas`)
- `interesse` no card do pipeline (`/pipeline`) ou no dialog de timeline — não pedido
- Filtrar / ordenar / buscar leads por `interesse` — não pedido
- Backfill de leads existentes — coluna aditiva nullable; leads antigos ficam com `interesse` nulo
- Fundir `interesse` na feature "coluna extra pra notas" do CSV — `interesse` é campo próprio de primeira classe
- API de handoff do Prospector / renomear o campo para `servicoDesejado` — outro projeto / outra fase

## Constraints

- Coluna **aditiva e nullable** — `ALTER TABLE leads ADD COLUMN interesse text` sem `DEFAULT` (nullable dispensa a exigência de DEFAULT do SQLite que forçou `origemTipo` e `sequenciaPosicao` a terem default). A migração **não** pode dropar nem reescrever dados existentes.
- O mecanismo exato da migração (script `.cjs` custom vs `drizzle-kit`) é decisão do `discuss-phase` — mas tem que ser aditiva e reversível.
- `interesse` limitado a **500 caracteres** (`z.string().max(500)`).
- **Nenhum campo existente** muda de obrigatório para opcional ou vice-versa.
- `csvRowSchema` deriva de `leadBaseSchema` — `interesse` opcional tem que fluir sem quebrar imports de CSV que não trazem a coluna.
- Convenções do projeto: PT-BR nas mensagens e labels; sem `drizzle-kit push` sobre as tabelas de lista governada (não afeta esta coluna, mas vale a regra geral).

## Acceptance Criteria

- [ ] `leads` tem coluna `interesse` TEXT nullable (schema Drizzle + banco)
- [ ] Criar lead com "Interesse" preenchido salva o valor; reabrir o dialog de edição exibe o valor salvo
- [ ] Criar/editar lead com "Interesse" vazio conclui sem erro — validação não bloqueia o submit
- [ ] "Interesse" acima de 500 caracteres é rejeitado com mensagem clara em PT-BR
- [ ] Leads criados antes da migração abrem e editam sem erro (`interesse` nulo/vazio)
- [ ] O column-mapper do wizard de CSV lista "Interesse" como campo **opcional** (não obrigatório)
- [ ] Importar CSV com uma coluna mapeada para "Interesse" cria leads com esse valor preenchido
- [ ] Importar CSV **sem** mapear "Interesse" funciona exatamente como antes (nenhuma regressão)
- [ ] `npm run build`, `npx tsc --noEmit` e os harnesses de teste de lead/CSV passam

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                        |
|--------------------|-------|------|--------|-------------------------------------------------------------|
| Goal Clarity       | 0.92  | 0.75 | ✓      | Campo opcional, texto livre, linha única, ≤500 chars, form + CSV |
| Boundary Clarity   | 0.88  | 0.70 | ✓      | Só no form; fora: tabela, pipeline, timeline, filtro, governança |
| Constraint Clarity | 0.78  | 0.65 | ✓      | Coluna aditiva nullable sem default; mecanismo de migração no discuss-phase |
| Acceptance Criteria| 0.85  | 0.70 | ✓      | 9 checagens pass/fail                                       |
| **Ambiguity**      | 0.13  | ≤0.20| ✓      |                                                            |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

## Interview Log

| Round | Perspective       | Question summary                                  | Decision locked                                             |
|-------|-------------------|--------------------------------------------------|------------------------------------------------------------|
| 0     | (scout)           | O que existe hoje?                               | Sem coluna/Zod/form/CSV para interesse; sem tela de detalhe (o form dialog é criar+editar) |
| 1     | Researcher/Simplifier | Governado ou texto livre?                     | Texto livre puro — LEAD-06 diz "texto livre"; governança fica pro futuro do Prospector, se precisar |
| 1     | Boundary Keeper   | Onde `interesse` aparece além do form?           | Só no form de criar/editar. Fora: tabela de leads, card do pipeline, timeline, filtro/busca |
| 1     | Boundary Keeper   | Formato do input?                                | `<Input>` de linha única (não `<Textarea>`); "serviço desejado" costuma ser curto |
| 1     | Failure Analyst   | Limite de tamanho?                               | 500 caracteres (`z.string().max(500)`) — generoso mas não permite colar texto gigante |

---

*Phase: 15-campo-interesse-servi-o-desejado-no-lead*
*Spec created: 2026-08-31*
*Next step: /gsd:discuss-phase 15 — decisões de implementação (mecanismo de migração, posição do campo no form, normalização vazio↔null)*
