---
phase: 01-lead-sub-nicho-foundation
audit_type: threat-model-verification
asvs_level: 1
block_on: high
threats_total: 14
threats_closed: 14
threats_open: 0
audited_plans: [01-01, 01-02, 01-03, 01-04]
---

# Security Audit — Fase 1: Lead & Sub-nicho Foundation

Auditoria de verificação de mitigação de ameaças (não é um scan aberto de vulnerabilidades). Cada ameaça abaixo foi extraída literalmente dos blocos `<threat_model>` dos 4 PLAN.md da Fase 1 e verificada contra o código implementado — evidência de código, não de intenção/documentação.

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-01-01 | Tampering | mitigate | CLOSED | `src/actions/subnicho-actions.ts:18,49` — `subnichoSchema.safeParse({ nome: formData.get("nome") })` em `createSubnicho`/`renameSubnicho`; `parsed.data` só contém `nome` |
| T-01-02 | Tampering | mitigate | CLOSED | `src/db/schema.ts:12` — `uniqueIndex("subnicho_nome_unique_idx").on(sql\`lower(trim(${table.nome}))\`)`; migração `0000_gifted_slapstick.sql:28` confirma o índice no banco; `subnicho-actions.ts:32-37,67-72` — try/catch em volta do insert/update retornando "Esse sub-nicho já existe." |
| T-01-03 | Tampering | mitigate | CLOSED | `subnicho-actions.ts:27,62` — único uso de `sql` no repo é o template parametrizado `sql\`lower(trim(${subnichos.nome})) = lower(trim(${nome}))\`` (drizzle interpola valores como parâmetros bind, não concatenação); grep por `sql.raw` em `src/` não encontra nenhuma ocorrência |
| T-01-04 | Information Disclosure | mitigate | CLOSED | `lead-actions.ts`/`subnicho-actions.ts` — todos os `catch` retornam `{ errors: { campo: [...] } }` com mensagem fixa em pt-BR; nunca `err.message`/`err.stack`/payload cru é repassado ao client |
| T-01-05 | Tampering | mitigate | CLOSED | `lead-actions.ts:48,93` — `leadSchema.safeParse(Object.fromEntries(formData))`; `updateLead:130` — `where(and(eq(leads.id, id), isNull(leads.deletedAt)))` |
| T-01-06 | Tampering | mitigate | CLOSED | `lead-actions.ts:48,93` — `leadSchema.safeParse` roda sempre no server, independente de qualquer validação client-side em `lead-form-dialog.tsx` |
| T-01-07 | Tampering | mitigate | CLOSED | `lead-actions.ts:36-42` (`subnichoExists`, SELECT de existência) + `22-29,68-76,131-137` (`isForeignKeyViolation` capturando `SQLITE_CONSTRAINT_FOREIGNKEY` em volta do insert/update); `src/db/client.ts:9` — `pragma("foreign_keys = ON")` (sem isso o backstop nunca dispararia) |
| T-01-08 | Information Disclosure | mitigate | CLOSED | `lead-actions.ts:50,95` — `error.flatten().fieldErrors`; catch de FK (`:73,134`) retorna a mesma mensagem genérica de campo, nunca o erro cru do driver |
| T-01-09 | Tampering | mitigate | CLOSED | `src/components/lead-table-columns.tsx:2,106-113` — `filterFn` de `followUpDate` usa `startOfDay(start)`/`endOfDay(end)` (date-fns) antes de comparar timestamps, inclusivo nas duas pontas |
| T-01-10 | Information Disclosure | accept | CLOSED | Ver "Accepted Risks Log" abaixo — entrada registrada nesta auditoria |
| T-01-11 | Repudiation / Perda de dados | mitigate | CLOSED | Mitigação primária (soft-delete) já confirmada; lacuna do backstop (guarda) corrigida — ver "Resolved Findings" abaixo |
| T-01-12 | Tampering | mitigate | CLOSED | `lead-actions.ts:197-208,215-226` — `softDeleteLead`/`restoreLead` usam `leadId` só em `where(eq(leads.id, leadId))`; único campo escrito é `deletedAt` |
| T-01-13 | Tampering | mitigate | CLOSED | `src/app/leads/page.tsx:18` — `isNull(leads.deletedAt)`; `src/app/lixeira/page.tsx:17` — `isNotNull(leads.deletedAt)`; `lead-actions.ts:201,219` — `where(and(eq(id,leadId), isNull/isNotNull(deletedAt)))` garante idempotência |
| T-01-14 | Tampering / Qualidade de dado | mitigate | CLOSED | `src/lib/phone.ts:8-24` — `normalizePhone` rejeita comprimentos inválidos, retorna `null`; `src/lib/money.ts:12,18` — `STRICT_BRL_PATTERN` rejeita caractere inválido antes de qualquer strip (`"abc1"` → `NaN`, nunca `1`) |
| T-01-SC | Tampering | mitigate/accept | CLOSED | `01-01-SUMMARY.md` linhas 82,109-111 — checkpoint humano bloqueante (Task 1) aprovado antes do install de `sonner@2.0.7`/`date-fns@4.4.0`; demais pacotes centrais auditados por slopcheck; planos 02-04 não instalaram pacotes novos no escopo da Fase 1 |

## Resolved Findings

### T-01-11 — Guarda anti hard-delete tinha lacuna de cobertura para SQL raw (CORRIGIDO)

**Status:** CLOSED. Corrigido em `ab91648` (commit posterior a esta auditoria): `guard-no-hard-delete.cjs` ganhou `CODE_SQL_PATTERNS` — um segundo conjunto de regex (`DELETE FROM leads/subnichos`, `DROP TABLE leads/subnichos`, case-insensitive, tolerante a aspas/backtick) aplicado a todo arquivo `.ts/.tsx/.js/.cjs/.mjs` de `src/`+`scripts/`, além do `CODE_PATTERNS` original (sintaxe do query builder Drizzle). Verificado com smoke test manual: uma linha `db.run(sql\`DELETE FROM leads WHERE id = 1\`)` injetada temporariamente em `scripts/__guard-smoke-test.cjs` fez o guard sair 1 nomeando arquivo:linha; removida a linha, o guard voltou a sair 0. `npx tsc --noEmit` e `npm run guard:no-hard-delete` (árvore limpa) confirmados passando após a correção.

**Achado original (para histórico):**

**Disposição declarada:** mitigate — "Soft-delete obrigatório: `db.update` de `deletedAt`, NUNCA `db.delete(leads)`; reforçado por guarda `scripts/guard-no-hard-delete.cjs` varrendo `src/+scripts/+migrações`" (01-04-PLAN.md threat_model), com a garantia explícita no 01-04-SUMMARY.md de "pegando hard-deletes ou SQL destrutivo introduzidos em qualquer script/utilitário/componente/migração futura".

**Mitigação primária — CONFIRMADA presente:** `src/actions/lead-actions.ts` não contém nenhuma chamada `db.delete(leads)`/`db.delete(subnichos)` — `softDeleteLead`/`restoreLead` usam exclusivamente `db.update(leads).set({ deletedAt: ... })`. Grep repo-wide por `db\.delete\(` confirma a única ocorrência do repositório é `template-actions.ts:93` (`db.delete(templates)`, tabela fora do escopo de LEAD-04, ver 01-04-SUMMARY.md "Decisions Made"). Esta parte do mitigation plan está CLOSED.

**Backstop declarado — gap real, verificado independentemente por leitura direta do script (não apenas a nota do code-review):**

`scripts/guard-no-hard-delete.cjs` aplica dois conjuntos de regex de forma mutuamente exclusiva por extensão de arquivo:

```
CODE_PATTERNS = [/\.delete\(\s*leads\b/, /\.delete\(\s*subnichos\b/]   // linha 45
SQL_PATTERNS  = [/\bDELETE\s+FROM\b/i, /\bDROP\s+TABLE\b/i]            // linha 47
```

- Para arquivos de código (`.ts`/`.tsx`/`.js`/`.cjs`/`.mjs`) em `src/`+`scripts/`, **só `CODE_PATTERNS` é aplicado** (`scanFile(entryAbsPath, relPath, CODE_PATTERNS)`, linha 107).
- `SQL_PATTERNS` **só é aplicado quando `isSqlMigration === true`** (linha 104: `ext === ".sql" && relPath.startsWith(SQL_MIGRATIONS_DIR + path.sep)`) — ou seja, exclusivamente para arquivos `.sql` dentro de `src/db/migrations/`.

**Consequência:** um hard-delete escrito como SQL cru dentro de um arquivo `.ts`/`.js` — por exemplo `db.run(sql\`DELETE FROM leads WHERE ...\`)` ou `sqlite.exec("DELETE FROM leads")` em qualquer arquivo de `src/` ou `scripts/` — **não casa com nenhum padrão de `CODE_PATTERNS`** (que só reconhece a sintaxe do query builder Drizzle `.delete(leads`/`.delete(subnichos`) **e nunca é comparado contra `SQL_PATTERNS`** (que só roda em `.sql` de migração). O guard sairia 0 (limpo) mesmo com esse hard-delete presente no código-fonte.

Isso não é uma vulnerabilidade ativa hoje — confirmei por grep (`db\.delete\(|sql\.raw|\.run\(sql|DELETE FROM|DROP TABLE` em `src/` e `scripts/`) que nenhum caminho de SQL raw destrutivo existe atualmente no código. Mas o mitigation plan declarado promete uma guarda permanente contra a **reintrodução futura** de hard-delete "em qualquer script/utilitário/componente" — e essa promessa é falsa para o vetor SQL raw. A garantia real hoje depende inteiramente de nenhum executor futuro escrever `db.run(sql\`DELETE FROM leads\`)` em vez de `db.delete(leads)` — o que o guard não impede.

**Arquivos verificados:** `scripts/guard-no-hard-delete.cjs` (linhas 29-47, 79-112), `src/actions/lead-actions.ts` (sem violação atual), `src/actions/template-actions.ts:93` (hard-delete legítimo de outra tabela, fora de escopo).

**Ação recomendada:** estender `CODE_PATTERNS` (ou adicionar um terceiro conjunto de regex aplicado também a arquivos de código, não só a `.sql`) para reconhecer `DELETE\s+FROM\s+leads`/`DELETE\s+FROM\s+subnichos`/`DROP\s+TABLE\s+leads`/`DROP\s+TABLE\s+subnichos` dentro de template strings `sql\`...\`` ou chamadas `.exec(`/`.run(` em qualquer arquivo `.ts`/`.js`/`.cjs`/`.mjs` de `src/`+`scripts/` — não só em `.sql` de `src/db/migrations/`. Alternativa: documentar explicitamente em `SECURITY.md` (accepted risk) que a guarda cobre apenas a sintaxe do query builder Drizzle e SQL raw destrutivo em migrações versionadas, não SQL raw arbitrário em código-fonte, se a equipe decidir aceitar esse risco residual em vez de corrigir o script.

## Accepted Risks Log

| Threat ID | Risk | Justificativa aceita | Registrado em |
|-----------|------|----------------------|----------------|
| T-01-10 | Toda a lista de leads ativos (incl. dado de saúde/PII do sub-nicho) é carregada no client para filtro/sort/paginação client-side | App single-user local (`CLAUDE.md` — "CRM pessoal para um único usuário"), sem outro usuário da mesma instância de quem esconder o dado; nenhum boundary de confiança novo é cruzado além do próprio admin acessando seu próprio navegador | Esta auditoria (01-03-PLAN.md linha 161, disposição já `accept` no plano original) |

## Unregistered Flags

Nenhum. As 4 SUMMARY.md da Fase 1 (01-01 a 01-04) não contêm seção `## Threat Flags` — nenhuma superfície de ataque nova foi sinalizada pelos executores durante a implementação, além do que já constava no threat register de cada PLAN.md.

## Scope Note

Esta auditoria cobre exclusivamente o threat register autorado em tempo de plano dos 4 planos da Fase 1 (`01-01` a `01-04`). O código-fonte hoje já contém trabalho de fases posteriores (dashboard de follow-up em `/`, board de pipeline, templates de WhatsApp, dependências `@dnd-kit`/`next-themes`/`react-day-picker`) — essas adições pertencem a threat models de fases futuras e não foram auditadas aqui; sua presença não altera a disposição de nenhuma ameaça da Fase 1.

## Security Audit 2026-07-22

| Metric | Count |
|--------|-------|
| Threats found | 14 |
| Closed | 14 |
| Open | 0 |

T-01-11 foi encontrada aberta na auditoria inicial (achado independente também sinalizado pelo code review, CR-01) e fechada no mesmo ciclo via correção do `guard-no-hard-delete.cjs` (commit `ab91648`), verificada por smoke test manual antes desta atualização.
