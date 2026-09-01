# Phase 16: Correções de Code Review da Fase 15 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 16-corre-es-de-code-review-da-fase-15
**Areas discussed:** Prévia do interesse no CSV (WR-02), Corte por code point (IN-02), Script de migração idempotente (IN-03), Cobertura do novo teste (FIX-01)

---

## Prévia do interesse no CSV (WR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Coluna + badge na célula | Coluna "Interesse" (padrão `notas`) + badge "cortado em 500" quando `length === 500`; não mexe no sistema de flags | ✓ |
| Só a coluna | Só a coluna na tabela; corte em 500 só observável se o admin notar o valor truncado | |
| Coluna + flag amarela na linha | Integra o corte em 500 ao sistema de avisos existente (duplicado / nicho novo / telefone inválido) | |

**User's choice:** Coluna + badge na célula (recomendada)
**Notes:** Torna D-10 observável direto na linha, atendendo ROADMAP SC#3 pela via "aviso visível na prévia", sem tocar o sistema de flags por linha.

---

## Corte por code point (IN-02 / SC#3)

| Option | Description | Selected |
|--------|-------------|----------|
| Array.from só no csv-import.ts | `Array.from(s).slice(0,500).join("")` só em `csv-import.ts:147`; `validations.ts .max(500)` fica UTF-16 | ✓ |
| Array.from + alinhar o `.max(500)` do schema | Corta por code point E muda `csvRowSchema.interesse` para contar code points | |
| Aceitar a limitação | Não mexe no slice; o badge da Q1 satisfaz o "e/ou" de SC#3 | |

**User's choice:** Array.from só no csv-import.ts (recomendada)
**Notes:** Baixo risco. Combinado com o badge, SC#3 fica coberto com folga. O `.max(500)` do schema não muda para não arriscar reintroduzir rejeição de linha (D-09).

---

## Script de migração idempotente (IN-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Doc-comment + pular backup se coluna existe | Header documenta "pare a app"; sem backup quando `hasColumn === true`; só no `migrate-interesse.cjs` | ✓ |
| Doc-comment + backup sempre em `data/backups/` com retenção | Mantém backup em toda execução mas move para `data/backups/` com retenção de N | |
| Isso + aplicar aos outros `migrate-*.cjs` | Replica a correção nos demais scripts de migração | |

**User's choice:** Doc-comment + pular backup se coluna existe (recomendada)
**Notes:** Escopo restrito ao `migrate-interesse.cjs` (achado da Fase 15). Padronizar todos os `migrate-*.cjs` foi anotado como deferred idea.

---

## Cobertura do novo teste (FIX-01)

| Option | Description | Selected |
|--------|-------------|----------|
| createLead + updateLead com whitespace | `createLead({interesse:"   "})` → null E `updateLead` limpando com `"   "` → null | ✓ |
| Só o caso mínimo | Só `createLead({interesse:"   "})` → `interesse === null` (literal do ROADMAP SC#1) | |
| Cobertura ampla | + whitespace variado (tab, `\n`, ` `) + caso de truncamento na importação CSV | |

**User's choice:** createLead + updateLead com whitespace (recomendada)
**Notes:** O caso de `updateLead` cobre o override `?? null` load-bearing que o review destacou. Whitespace exótico e caso de truncamento CSV ficaram de fora do escopo mínimo.

---

## Claude's Discretion

- Texto exato da copy do badge (D-05) e do doc-comment do script de migração (D-10).
- Posição exata da coluna `interesse` em `previewColumns` (sugestão: junto de `notas`).
- Forma do badge (`<Badge>` shadcn vs `<span>` estilizado) — seguir o padrão da prévia.

## Deferred Ideas

- Padronizar o backup de todos os `scripts/migrate-*.cjs` (mover para `data/backups/` com retenção, ou pular backup em execução idempotente). Dívida de padrão do projeto, não achado da Fase 15.
- Alinhar contagem de `.max(500)` do schema com corte por code point (`Array.from(s).length <= 500`). Adiado por risco/benefício.
- Badge de truncamento no sistema de flags amarelas por linha (em vez de na célula). Reconsiderar se a prévia ganhar mais campos truncáveis.
