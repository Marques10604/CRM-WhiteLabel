# Phase 13: Rename `sub-nicho → nicho` + reframe - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 13-rename-sub-nicho-nicho-reframe
**Areas discussed:** Migração do banco, Rota antiga `/subnichos`, Profundidade da varredura de copy, Quebra em planos (ondas)

---

## Migração do banco

| Option | Description | Selected |
|--------|-------------|----------|
| Só código/UI | Drizzle mapeia `nichoId: integer("subnicho_id")` e `nichos = sqliteTable("subnichos")`. Zero migração, zero risco pros 37 leads, não esbarra no snapshot divergente do drizzle-kit. Custo: Drizzle Studio mostra `subnichos`. | ✓ |
| Rename completo (banco também) | `ALTER TABLE ... RENAME` + `RENAME COLUMN` + recriar índices + regenerar snapshot. Banco 100% limpo. Migração manual, backup obrigatório, mais superfície de risco. | |

**User's choice:** deferiu a decisão ("qual você acha melhor") → Claude escolheu **Só código/UI**.
**Notes:** O nome físico é detalhe interno que o usuário nunca vê. Zero migração pesa mais que a limpeza cosmética do arquivo .db. Doc-comment no `schema.ts` explica a divergência lógico↔físico (padrão já existente no projeto). D-01.

---

## Rota antiga `/subnichos`

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect 301 permanente | 3 linhas no `next.config.ts`. Segura bookmark, rede de segurança pra links hardcoded que escaparem da varredura. | ✓ |
| Simplesmente some (404) | Menos código; ferramenta solo local, re-navegar é 2s. | |

**User's choice:** deferiu ("analise pra mim também qual a melhor") → Claude escolheu **redirect 301**.
**Notes:** Custo de 3 linhas vs. bookmark quebrado + insurance contra link perdido na varredura. `next.redirects()` é feature de primeira classe. D-02.

---

## Profundidade da varredura de copy

| Option | Description | Selected |
|--------|-------------|----------|
| Ampla + exemplo genérico | Varre `<title>`s, estados vazios, textos de ajuda, metadata, placeholders. Texto de ajuda vira "Nicho do lead (ex: dentista, e-commerce de roupa, academia)". | ✓ |
| Só os 3 pontos "saúde" + "nicho" seco | Troca só onde tem "área da saúde"/"nutricionista" literal. Sem exemplo. | |

**User's choice:** **Ampla + exemplo genérico**.
**Notes:** É uma fase de "reframe" — metade do ponto é COPY-01. Exemplo genérico com 3 nichos de setores diferentes reforça o despívo e ajuda usuário novo. D-03/D-04/D-05.

---

## Quebra em planos (ondas)

| Option | Description | Selected |
|--------|-------------|----------|
| 3 ondas | (1) dados: schema + tipos + Zod + queries + actions + guard → (2) UI: rota + 4 componentes + ~15 consumidores → (3) copy + metadata + gate de grep. | ✓ |
| 1 plano único | Atômico num commit, mas 47 arquivos num diff só é difícil de revisar/reverter. | |
| 2 ondas | (1) dados+UI → (2) copy. Onda 1 fica grande. | |

**User's choice:** deferiu ("qual você acha melhor, não importa se demorar deixando claro pra você") → Claude escolheu **3 ondas**.
**Notes:** 47 arquivos. 3 ondas sequenciais (2 importa do que 1 renomeia; 3 é só texto), cada uma revisável isoladamente. D-07/D-08/D-09.

## Claude's Discretion

- Nomes exatos de funções renomeadas.
- Texto exato da metadata do `layout.tsx` e dos `FieldDescription` (D-04/D-05 dão a regra).
- Alias de nome de índice no schema Drizzle vs. string atual (baixo impacto, sem gerar migração).
- Ordem interna de tarefas dentro de cada onda.

## Deferred Ideas

- Limpar os nomes físicos do banco (`subnichos` → `nichos`) — descartado (D-01).
- Entidade "campanha / janela de teste de nicho" — decidido que mora no Prospector (`CAMPANHA-01` Future no `REQUIREMENTS.md`, PARTE III do `IDEIA.md` do Prospector).
- Filtro de intervalo de datas em `/relatorios` → Fase 14.
- Campo "interesse / serviço desejado" → Fase 15.
