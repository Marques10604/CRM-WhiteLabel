# Phase 8: Origem Governada + Separação Inbound × Outbound - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 08-origem-governada-separa-o-inbound-outbound
**Areas discussed:** Rótulos do select de origemTipo, Posição e padrão técnico do campo no formulário, Valor pré-selecionado (default) do select, Indicação visual adicional fora do modal

**Mode:** `--auto` — sem usuário interativo nesta sessão. Claude selecionou a opção recomendada para cada área, com base em padrões já existentes no código e na definição de negócio já registrada em `PROJECT.md`/`REQUIREMENTS.md`. SPEC.md (`08-SPEC.md`) já travava o "o quê/por quê" — esta discussão cobriu só "como".

---

## Rótulos do select de origemTipo

| Option | Description | Selected |
|--------|-------------|----------|
| "Inbound" / "Outbound" (inglês, sem tradução) | Mesmos termos já usados em PROJECT.md/REQUIREMENTS.md/todo original | ✓ |
| "Entrada" / "Saída" (tradução PT-BR) | Introduziria um segundo vocabulário para o mesmo conceito | |

**Escolha:** "Inbound" / "Outbound"
**Notas:** O usuário já usa esses termos em inglês espontaneamente na própria definição do requisito (`PROJECT.md` linha 8) — manter consistência de vocabulário evita ambiguidade futura.

---

## Posição e padrão técnico do campo no formulário

| Option | Description | Selected |
|--------|-------------|----------|
| Logo após `origem`, mesmo padrão Controller+Select de `canal` | Reaproveita `CANAL_OPTIONS`/estrutura já validada, agrupamento semântico natural | ✓ |
| Nova seção separada no formulário | Sem precedente, adiciona complexidade visual não pedida | |

**Escolha:** Logo após `origem` (linhas 244-253 de `lead-form-dialog.tsx`), mesmo padrão de `canal` (linhas 211-242)
**Notas:** `CANAL_OPTIONS` (`{value, label} as const`) é o precedente direto a copiar para `ORIGEM_TIPO_OPTIONS`.

---

## Valor pré-selecionado (default) do select na criação manual

| Option | Description | Selected |
|--------|-------------|----------|
| Nenhum valor pré-selecionado, placeholder força escolha | Mesmo padrão de `canal` ("Selecione o canal"); preserva o propósito de governança | ✓ |
| Pré-selecionar "Outbound" por padrão | Esvaziaria a governança para leads futuros criados manualmente | |

**Escolha:** Nenhum valor pré-selecionado (placeholder)
**Notas:** Backfill e import CSV legitimamente default para "outbound" (origem real conhecida e uniforme) — mas a criação manual de um lead novo precisa de escolha consciente do admin, é justamente o requisito que esta fase resolve.

---

## Indicação visual adicional (badge) fora do modal de edição

| Option | Description | Selected |
|--------|-------------|----------|
| Nenhum badge nesta fase — modal já satisfaz SPEC.md | YAGNI, mesmo padrão de outras decisões do projeto (sem gráfico no MVP, sem teto artificial) | ✓ |
| Badge no card do pipeline (mesmo padrão do "Esfriando") | Adiciona visibilidade extra não exigida pelo SPEC.md nesta fase | |

**Escolha:** Nenhum badge nesta fase
**Notas:** SPEC.md exige apenas "visível em pelo menos uma tela de consulta" — modal cobre. Badge fica para quando o dado tiver uso real (Phase 10/11).

---

## Claude's Discretion

- Mecanismo exato da migração (ALTER TABLE manual vs. tentar `drizzle-kit push` contra cópia de teste) — fica com researcher/planner, seguindo precedente das Fases 06-01/07-01.
- Nome exato da variável/arquivo de `ORIGEM_TIPO_OPTIONS` e shape exato da validação Zod.
- Se o backfill roda como script standalone ou inline na migração SQL.

## Deferred Ideas

Nenhuma nova ideia de escopo surgiu nesta sessão. 11 todos pendentes do backlog bateram no matcher automático (score ≥ 0.4) mas foram revisados e **não dobrados** por serem, na prática, as Fases 9-12 e o backlog v1.4/PME inteiro — dobrá-los contradiria as Boundaries já travadas em `08-SPEC.md`. Apenas o todo `2026-08-01-separa-o-inbound-x-outbound.md` (que declara `resolves_phase: 8` no próprio frontmatter) foi dobrado. Lista completa dos 11 não-dobrados e a justificativa de cada um estão em `08-CONTEXT.md` §Deferred → Reviewed Todos.
