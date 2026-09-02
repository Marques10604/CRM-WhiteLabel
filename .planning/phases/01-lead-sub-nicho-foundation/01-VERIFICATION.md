---
phase: 01-lead-sub-nicho-foundation
verified: 2026-09-02
status: passed
score: 20/20 cenários de UAT verificados (19 code+data, 1 ao vivo) — 0 issues
overrides_applied: 0
method: code+data (Fase 18 / AUDIT-01, D-01 revisado — navegador bloqueado por hardware)
human_verification: []
---

# Phase 1: Lead & Sub-nicho Foundation — Verification Report

**Phase Goal:** Admin gerencia leads (criar, editar, listar, filtrar, ordenar, soft-delete,
restaurar) e uma taxonomia extensível de nicho pela UI, sobre um banco real — substituindo o
Google Sheets como camada de dados base.

**Verified:** 2026-09-02 (auditoria retroativa — Fase 18, AUDIT-01)
**Status:** passed
**Re-verification:** Sim — a Fase 1 nunca teve `/gsd-verify-work` formal (nenhum
`VERIFICATION.md` até aqui; os SUMMARYs de 01-02/01-03/01-04 registravam "clique real
recomendado antes de uso real"). Este relatório fecha essa lacuna.

## Método de Verificação

O UAT ao vivo no navegador foi **bloqueado por hardware** (host de 4GB não roda `npm run dev`
com Turbopack + Chrome + a sessão Claude ao mesmo tempo — RAM livre caiu a ~200 MB e o
renderer do Chrome congelou; ver `18-01-SUMMARY.md`). Por decisão do usuário (2026-09-02), a
verificação foi feita por **code+data**, e não por clique real:

1. **Leitura da superfície** de cada cenário — componente React + Server Action + schema Zod
   (`src/lib/validations.ts`) + schema Drizzle (`src/db/schema.ts`).
2. **Query direta** no `data/crm.db` de produção (só SELECT) para os invariantes de dados
   (ordenação por follow-up, distribuição por nicho, soft-deletes existentes, colação
   case-insensitive do dedupe, invariante "1 linha por nome de nicho", telefone/valor
   normalizados).
3. **Harnesses automatizados** re-executados no baseline, todos exit 0:
   `test:lead-actions` (createLead/updateLead/parsing/soft-delete/bulkImport),
   `test:money` (18 asserções — `parseBRLToCents`/`formatCentsToBRL`),
   `test:phone` (6 asserções — `normalizePhone`),
   `verify:schema`, `guard:no-hard-delete`.

O cenário 4 ("Descartar alterações?") foi verificado **ao vivo** no plano 18-01, antes do
bloqueio de hardware, e permanece com evidência de navegador.

### O que um pass de navegador ainda acrescentaria

- Renderização visual: indicador de seta no cabeçalho ordenável (cenário 14), rodapé
  "Página 1 de N" com N > 1 (cenário 20), toasts sonner, anel de foco teal, badges de etapa.
- Fluxo de clique completo end-to-end: abrir modal → preencher os campos → Salvar → toast →
  linha aparece/atualiza na lista.
- Hidratação do react-hook-form nos `defaultValues` do modo edição.

Nenhum desses pontos tem indício de estar quebrado por inspeção — o código replica padrões já
em produção há 5+ fases, e os fluxos de servidor são todos cobertos por harness.

## Goal Achievement — Observable Truths

| # | Verdade (01-SPEC Acceptance Criteria) | Status | Evidência |
|---|--------------------------------------|--------|-----------|
| 1 | Form cria lead só com todos os campos obrigatórios; vazio bloqueia com erro inline, nada persiste | ✓ VERIFIED (code+data) | `leadBaseSchema` min(1) por campo; `createLead` retorna `{errors}` sem tocar o banco; `test:lead-actions` "origemTipo vazio"; live na Fase 16 (form em branco → todos "é obrigatório") |
| 2 | Tela de nicho suporta criar + renomear, sem controle de delete original | ✓ VERIFIED (code+data) | `NichoManager` "+ Adicionar" / `NichoRow` lápis; `createNicho`/`renameNicho`; botão de remoção veio depois (quick 260725-lai) |
| 3 | Nicho com nome duplicado case-insensitive é rejeitado | ✓ VERIFIED (code+data) | `nicho-actions.ts:24-43` `lower(trim())` match → "Esse nicho já existe."; query: `lower(trim('  Nutricionista '))=lower(trim('nutricionista'))` → 1 |
| 4 | Campo nicho do lead só aceita valor da lista (single-select, sem texto livre) | ✓ VERIFIED (code+data) | `NichoCombobox` → `onValueChange(id \| null)`; `leadBaseSchema.nichoId = z.coerce.number().int().positive()`; `createLead` chama `nichoExists()` antes do insert |
| 5 | Excluir lead exige confirmação em modal antes de sair da lista ativa | ✓ VERIFIED (code+data) | `DeleteLeadDialog` + `handleDeleteConfirm` → `softDeleteLead`; "Cancelar" não chama action; 21 leads soft-deletados em `data/crm.db` |
| 6 | Página Lixeira lista soft-deleted e restaura | ✓ VERIFIED (code+data) | `src/app/lixeira/page.tsx` `isNotNull(deletedAt)`; `restoreLead` (`isNotNull` guard, sem confirmação, D-17) |
| 7 | Lista filtra por nicho / etapa / intervalo de follow-up, isolados ou combinados | ✓ VERIFIED (code+data) | 3 controles na toolbar → `column.setFilterValue`; `filterFn` por id/igualdade/intervalo inclusivo; `getFilteredRowModel` aplica AND |
| 8 | Sem filtros, lista ordena por follow-up mais próximo primeiro | ✓ VERIFIED (code+data) | `DEFAULT_SORTING = [{id:"followUpDate",desc:false}]`; query: topo real = `dentista_juliaxavier` 2026-07-25 |
| 9 | Lead novo default etapa "Novo"; nenhum board/kanban nesta fase | ✓ VERIFIED (code+data) | `leadBaseSchema.stage.default("novo")`; `schema.ts` `stage text DEFAULT 'novo' NOT NULL`; board só chegou na Fase 3 |
| 10 | Criação manual nunca bloqueia/avisa telefone duplicado | ✓ VERIFIED (code+data) | `createLead` não tem nenhum lookup por telefone; dedup só no import CSV (`fetchPreviewSupportData`, Fase 2) |

**Score:** 10/10 acceptance criteria + 20/20 cenários de UAT verificados. 0 issues.

## Contrato de valor / soft-delete (spot-checks)

| Comportamento | Comando | Resultado |
|---------------|---------|-----------|
| `parseBRLToCents`/`formatCentsToBRL` corretos | `node scripts/test-money.cjs` | exit 0, 18 asserções (incl. `"1.234,56" → 123456`) |
| `normalizePhone` prefixa DDI 55, rejeita lixo | `node scripts/test-phone.cjs` | exit 0, 6 asserções |
| createLead/updateLead/soft-delete end-to-end | `npm run -s test:lead-actions` | exit 0 |
| Nenhum hard-delete em `leads`/`nichos` | `npm run guard:no-hard-delete` | exit 0 |
| Schema físico do `data/crm.db` íntegro | `npm run verify:schema` | exit 0 |
| Invariante "1 linha por nome de nicho" | query `GROUP BY lower(trim(nome)) HAVING COUNT(*) > 1` | `[]` (mesmo com 7 nichos soft-deletados) |

## Anti-Patterns Found

Nenhum. A auditoria code+data não encontrou nenhum defeito de runtime nas superfícies da
Fase 1.

## Gaps Summary

Sem gaps bloqueantes. Dois pontos puramente visuais ficam diferidos para uma futura sessão
com navegador (indicador de seta de ordenação — cenário 14; rodapé multi-página com N > 1 —
cenário 20), ambos com o mecanismo subjacente verificado por código. Nenhum bloqueia
AUDIT-01.

---

*Verified: 2026-09-02*
*Verifier: Claude (Fase 18 — auditoria retroativa, método code+data)*
