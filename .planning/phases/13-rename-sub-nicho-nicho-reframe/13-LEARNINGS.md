---
phase: 13
phase_name: "Rename sub-nicho → nicho + reframe"
project: "CRM de Leads"
generated: "2026-08-30"
counts:
  decisions: 6
  lessons: 4
  patterns: 4
  surprises: 3
missing_artifacts: []
---

# Phase 13 Learnings: Rename sub-nicho → nicho + reframe

## Decisions

### Rename só na camada de código, banco físico intocado (D-01)
O export Drizzle passou a ser `nichos = sqliteTable("subnichos", ...)` e a prop da FK `nichoId: integer("subnicho_id")` — o identificador JS/lógico virou `nicho`, mas a tabela física, a coluna e os 3 índices continuam com o prefixo `subnicho`. Nenhuma migração, nenhum backup, nenhum comando `drizzle-kit`.

**Rationale:** Zero risco de perda de dado (os 37 leads mantêm `subnicho_id`), e evita esbarrar no snapshot divergente do drizzle-kit (débito pré-existente das Fases 4/6/7/8). Um doc-comment de 13 linhas no `schema.ts` registra a divergência pra ninguém "consertar" achando que é bug.
**Source:** 13-01-SUMMARY.md, 13-CONTEXT.md

### `git mv` para renomear arquivos de action/componente/rota
`subnicho-actions.ts` → `nicho-actions.ts`, `src/app/subnichos/` → `src/app/nichos/`, e os 3 componentes `subnicho-*` → `nicho-*` via `git mv` (não delete+create).

**Rationale:** Preserva o histórico de blame; `git status` mostra `R` em vez de `D`+`A`.
**Source:** 13-01-SUMMARY.md, 13-02-SUMMARY.md

### Redirect 301 em `next.config.ts` como rede de segurança do rename de rota (D-02)
`async redirects()` retornando `{ source: "/subnichos", destination: "/nichos", permanent: true }`.

**Rationale:** Qualquer `href="/subnichos"` hardcoded que escapasse da varredura ainda funciona; um bookmark antigo do admin não quebra.
**Source:** 13-02-SUMMARY.md

### Guard `guard-no-hard-delete.cjs` com assimetria deliberada CODE vs CODE_SQL
`CODE_PATTERNS` casa o nome do OBJETO Drizzle → mudou de `.delete(subnichos)` para `.delete(nichos)` no mesmo commit que renomeou o objeto. `CODE_SQL_PATTERNS` (`DELETE FROM subnichos`, `DROP TABLE subnichos`) casa o nome FÍSICO da tabela → ficou intocado.

**Rationale:** Renomear o objeto Drizzle sem atualizar o CODE_PATTERN deixaria a tabela renomeada desprotegida contra hard-delete. Os patterns de SQL cru têm que continuar apontando pro nome físico real.
**Source:** 13-01-SUMMARY.md, 13-SECURITY.md (T-13-02)

### Varredura de copy ampla + exemplo genérico multi-setor (D-03/D-04/D-05)
Texto de ajuda do campo virou "Nicho do lead (ex: dentista, e-commerce de roupa, academia)" — 3 setores propositalmente distantes. `layout.tsx` `description` → "CRM pessoal para organizar leads e o funil de vendas" (sem "área da saúde").

**Rationale:** O exemplo genérico com setores muito diferentes comunica "qualquer nicho" melhor do que uma lista curta que ainda parece uma categoria fixa.
**Source:** 13-03-SUMMARY.md

### `SEM_SUBNICHO_FALLBACK` → `SEM_NICHO_FALLBACK`, valor `"A categorizar"` mantido (D-06)
Só o nome da constante mudou; o valor literal `"A categorizar"` (fallback de import + seed) ficou igual.

**Rationale:** É um valor de dado real já gravado em leads e no banco — mudá-lo criaria um segundo "nicho sem nome" órfão.
**Source:** 13-03-SUMMARY.md, 13-SECURITY.md (T-13-06)

---

## Lessons

### Harnesses `.cjs` quebram silenciosamente num rename de identificador
O primeiro `npm run test:lead-actions` após o `sed` em massa falhou com `NOT NULL constraint failed: leads.subnicho_id` e `getContagemPorSubnicho is not a function` — os `.cjs` ainda usavam os nomes antigos de função JS, mas o SQL de setup (`INSERT INTO subnichos`) tinha que continuar com o nome físico.

**Context:** A correção exige distinguir, dentro do mesmo arquivo, o identificador JS (migra) do nome físico do banco em string SQL (não migra). Um `sed` cego erra os dois lados.
**Source:** 13-02-SUMMARY.md

### `.next/types/validator.ts` fica com cache de rota velha
Após mover `src/app/subnichos/` → `src/app/nichos/`, o build acusava `src/app/subnichos/page.js` inexistente. `rm -rf .next` antes do `npm run build` regenera os tipos de rota.

**Context:** O Turbopack não invalida os route types gerados quando um diretório de rota é movido por `git mv`.
**Source:** 13-02-SUMMARY.md

### `npx tsc --noEmit` isolado dá timeout de 2min neste host (4GB)
Toda a verificação de tipos da fase foi feita pelo passo "Running TypeScript" do `npm run build` (que roda igual e sai exit 0), não por um `tsc` avulso.

**Context:** Padrão já observado desde a Fase 10; confirmado de novo aqui. O `build` é o gate de tipos real neste projeto.
**Source:** 13-01-SUMMARY.md, 13-02-SUMMARY.md

### A copy dos componentes dedicados viaja junto com a reescrita deles
O plano separava "migrar identificador" (Onda 2) de "limpar copy" (Onda 3), mas ao reescrever `nicho-manager.tsx`/`nicho-combobox.tsx`/`delete-nicho-dialog.tsx` a copy (toasts, placeholders, estado vazio, corpo do dialog) saiu limpa no mesmo commit — separar seria artificial. A Onda 3 sobrou só com 3 pontos "área da saúde" em arquivos que não eram dedicados a nicho.

**Context:** Quando um plano de rename toca um arquivo inteiro, a fronteira "código agora / copy depois" não se sustenta pra aquele arquivo.
**Source:** 13-02-SUMMARY.md, 13-03-SUMMARY.md

---

## Patterns

### Rename lógico sem migração via `sqliteTable("nomeFisico")`
Drizzle desacopla o identificador exportado do nome físico: `export const nichos = sqliteTable("subnichos", ...)` e `integer("subnicho_id")` mantêm o banco intocado enquanto o código todo fala o vocabulário novo.

**When to use:** Renomear um conceito de domínio em toda a base de código quando o custo/risco de uma migração de banco (backup, snapshot drift, downtime) não se justifica. Sempre acompanhar de um doc-comment explicando a divergência.
**Source:** 13-01-SUMMARY.md

### `sed` em massa sobre lista de arquivos derivada do `tsc`
A Onda 1 renomeia os símbolos-fonte e deixa o `tsc` quebrar; a lista de arquivos com erro vira o roteiro exato do `sed` da Onda 2. Os nomes físicos do banco (`subnichos`, `subnicho_id`) não têm forma camelCase nem hífen, então sobrevivem a `s/subnicho/nicho/g` onde escritos como identificador.

**When to use:** Rename mecânico de um termo que aparece em dezenas de arquivos, quando o compilador consegue enumerar os consumidores. Rodar os harnesses e o gate de grep logo depois pra pegar o que o `sed` acertou demais.
**Source:** 13-01-SUMMARY.md, 13-02-SUMMARY.md

### Gate de grep como prova de requisito de copy
`grep -rniE "sub-?nicho|área da saúde|nutricionista|terapeuta" src/` filtrado só pelos nomes físicos de banco + o doc-comment do schema → saída vazia = COPY-01 satisfeito.

**When to use:** Qualquer requisito do tipo "nenhuma tela menciona X" — vira um comando reproduzível que entra na suíte de verificação e serve de regressão futura.
**Source:** 13-03-SUMMARY.md

### Registro de ameaças autorado em tempo de plano → secure-phase em modo "verify"
Os 3 PLANs carregaram `<threat_model>` STRIDE; o `/gsd-secure-phase` rodou em modo "verificar que as mitigações existem" contra o código commitado + o UAT, fechando 9/9 sem re-derivar o modelo.

**When to use:** Fases com superfície de risco previsível (rename, refactor, migração) — escrever o threat model no plano evita um passo de análise do zero no fim.
**Source:** 13-SECURITY.md

---

## Surprises

### O modelo de dados já era 100% agnóstico de nicho
A avaliação técnica confirmou que só 4 coisas eram "de saúde": a moldura do `PROJECT.md`, o nome do campo `sub-nicho`, a copy da UI e os seeds. Pipeline, origem, follow-up, motivo de perda, templates — tudo já genérico. O "despivô" foi rename + copy, não rebuild.

**Impact:** A Fase 13 coube em 3 ondas / 3 commits de código / ~45min, não numa reengenharia de schema.
**Source:** 13-CONTEXT.md, project_crm_despivo_saude_generico (memória)

### Zero issues em toda a execução e no UAT
3 ondas, 8 harnesses, 2 builds, gate de grep, 8/8 testes de navegador — nenhum bug de comportamento introduzido. A única anotação do UAT (gatilho do filtro de nicho mostra id em vez do nome) é cosmética e pré-existente da Fase 1.

**Impact:** Fase fechou sem gap-closure. Confirma que rename mecânico bem roteirizado é baixo-risco.
**Source:** 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-UAT.md

### Primeira navegação a `/subnichos` após subir o dev server caiu em `/` em vez de `/nichos`
O redirect do `next.config.ts` não estava "quente" no primeiro hit pós-boot; navegações seguintes redirecionaram certo pra `/nichos`.

**Impact:** Nenhum pro usuário real (não reinicia o server a cada acesso), mas anotado no UAT pra não confundir num teste futuro.
**Source:** 13-UAT.md
