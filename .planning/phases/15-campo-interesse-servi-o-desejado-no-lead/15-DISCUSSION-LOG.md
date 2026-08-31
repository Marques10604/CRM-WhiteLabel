# Phase 15: Campo "interesse / serviço desejado" no lead - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-31
**Phase:** 15-campo-interesse-servi-o-desejado-no-lead
**Areas discussed:** Campo no formulário, CSV overflow

---

## Campo no formulário de lead (posição + label)

| Option | Description | Selected |
|--------|-------------|----------|
| Logo abaixo do Nicho, label "Interesse" | Topo, perto de nicho — coerente com "saber com quem tá falando antes de abordar". Label curto, placeholder "Ex: quer site, automação de WhatsApp...". | ✓ |
| Junto de Notas, no fim do form | Perto do outro campo de texto livre. Menos destaque. | |
| Logo abaixo de Origem/Tipo de origem | Agrupa com contexto de "de onde veio". Label "Interesse / serviço desejado". | |

**User's choice:** Logo abaixo do Nicho, label "Interesse"
**Notes:** —

---

## CSV — célula "Interesse" com mais de 500 caracteres

| Option | Description | Selected |
|--------|-------------|----------|
| Importa o lead, corta o interesse em 500 | Lead entra normalmente, campo fica com os primeiros 500 chars. Célula gigante nunca bloqueia lead válido. | ✓ |
| Importa o lead, descarta o interesse | Lead entra, interesse fica vazio. Não salva texto pela metade. | |
| Rejeita a linha | Linha vira erro de validação no preview, igual telefone inválido. Força arrumar o CSV. | |

**User's choice:** Importa o lead, corta o interesse em 500
**Notes:** Implementação: `readMapped(...).slice(0, 500)` antes da validação; `.max(500)` do Zod só atua no caminho do form.

---

## Claude's Discretion

- Normalização vazio → `NULL` (decidido por convenção do projeto — precedente `motivoPerdaId`)
- Migração via script `.cjs` custom, `ALTER TABLE ADD COLUMN interesse text` sem default (convenção do `schema.ts`, `drizzle-kit push` proibido)
- Texto exato do placeholder e da mensagem de erro de 500 chars (PT-BR, tom do projeto)
- Posição da coluna em `schema.ts` e nome do arquivo de migração

## Deferred Ideas

- `interesse` na tabela de leads / card do pipeline / timeline — fase própria
- Filtro/busca por `interesse` — fase própria
- Lista governada de "serviço desejado" — só se o Prospector precisar; 4º uso do padrão, fase própria
- `/atalho` no campo de mensagem (visto no CRM do amigo) — outra área
- Visão mobile/responsiva do CRM — gap nº 1 solo, mas milestone própria
