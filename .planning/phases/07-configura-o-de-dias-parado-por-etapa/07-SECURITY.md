---
phase: 07
slug: 07-configura-o-de-dias-parado-por-etapa
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-31
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| navegador → Server Action `saveConfiguracoes` (`src/actions/configuracoes-actions.ts`) | FormData chega de um endpoint HTTP interno e é totalmente não confiável — `<input type="number" min={1}>` do cliente pode ser burlado por devtools ou POST direto | 3 inteiros de configuração de negócio (dias parado por etapa) |
| aplicação → `./data/crm.db` | Toda escrita passa por Drizzle; nenhum SQL é montado por concatenação de string | linha singleton `configuracoes` |
| navegador → `/configuracoes` (Server Component) | Rota apenas de leitura; nenhum parâmetro de query/rota é consumido | leitura de `getConfiguracoes()` |
| formulário do cliente → validação client-side (`configuracoes-form.tsx`) | `min={1}` do `<Input type="number">` e `zodResolver` rodam no cliente e podem ser burlados — validação autoritativa mora no servidor (07-01) | mesmos 3 inteiros |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | Tampering | `saveConfiguracoes` (`src/actions/configuracoes-actions.ts`) | mitigate | `configuracoesSchema.safeParse(Object.fromEntries(formData))` roda antes de qualquer escrita; `configuracoesSchema` usa `z.coerce.number().int().min(1, "Mínimo de 1 dia.")` nos 3 campos (`src/lib/validations.ts:93-97`); falha retorna `{ errors }` sem tocar no banco (`configuracoes-actions.ts:32-35`) | closed |
| T-07-02 | Tampering | upsert de `configuracoes` | mitigate | `db.insert(configuracoes).values({ id: 1, ...parsed.data, ... }).onConflictDoUpdate({ target: configuracoes.id, set: {...} })` (`configuracoes-actions.ts:37-43`) — `id: 1` é literal no código, nenhum identificador vem do FormData; upsert (não `update` simples) elimina o caso de "sucesso" sem persistência quando a linha singleton não foi semeada | closed |
| T-07-03 | Tampering | `drizzle-kit push` (aplicação da tabela ao banco vivo) | mitigate | Verificado em runtime: `PRAGMA table_info(configuracoes)` mostra as 5 colunas esperadas com defaults corretos (999999/5/999999); `SELECT COUNT(*) FROM leads` = 33 e `subnichos` = 9, preservados; nenhum arquivo novo em `src/db/migrations/`. O único statement extra emitido pelo push (`DROP INDEX` + `CREATE UNIQUE INDEX` em `subnichos`, mesmo índice recriado) foi auditado e documentado como não-destrutivo no 07-01-SUMMARY.md (Deviation 2) — nenhuma linha de `leads`/`templates`/`subnichos` foi perdida ou alterada | closed |
| T-07-04 | Denial of Service | valor arbitrariamente grande em qualquer campo de dias | accept | Ver Accepted Risks Log — origem 07-01-PLAN.md `<threat_model>` | closed |
| T-07-05 | Elevation of Privilege | rota/action sem autenticação | accept | Ver Accepted Risks Log — origem 07-01-PLAN.md `<threat_model>` | closed |
| T-07-SC (07-01) | Tampering (supply chain) | `npm/pip/cargo installs` durante execução do plano 07-01 | mitigate | `git show --stat` dos commits `7528d87` e `1a21b66` confirma nenhuma alteração em `package.json`/`package-lock.json`; nenhum novo pacote instalado nesta wave | closed |
| T-07-06 | Tampering | validação client-side em `configuracoes-form.tsx` | mitigate | `onSubmit()` lê `formRef.current` e chama `formAction(new FormData(formRef.current))` (`configuracoes-form.tsx:65-68`) — FormData BRUTO do DOM enviado para `saveConfiguracoes`, cujo `safeParse` server-side (T-07-01) é a defesa real; `zodResolver`/`min={1}` client-side são só UX antecipada e não interceptam a submissão | closed |
| T-07-07 | Information Disclosure | rota `/configuracoes` | accept | Ver Accepted Risks Log — origem 07-02-PLAN.md `<threat_model>` | closed |
| T-07-08 | Tampering | `pipeline/page.tsx` lendo `config` | mitigate | Limites vêm exclusivamente de `getConfiguracoes()` dentro do `Promise.all` server-side (`pipeline/page.tsx:21-29`); `limitesPorEtapa` contém apenas as chaves `novo`/`contatado`/`negociacao` (`pipeline/page.tsx:32-39`) — `fechado`/`perdido` ausentes por construção, confirmado por leitura direta do objeto (nenhuma entrada para essas duas chaves) | closed |
| T-07-09 | Spoofing | — | accept | Ver Accepted Risks Log — origem 07-02-PLAN.md `<threat_model>` | closed |
| T-07-SC (07-02) | Tampering (supply chain) | `npm installs` / `npx shadcn add` durante execução do plano 07-02 | mitigate | `git show --stat` dos commits `7ef324f`, `6ea9564`, `171a518` confirma nenhuma alteração em `package.json`/`package-lock.json` e nenhum arquivo novo em `src/components/ui/` — nenhum componente shadcn novo instalado | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-04 | Sem teto máximo nos campos de dias por decisão explícita D-03; um inteiro enorme só significa que nenhum lead é marcado como esfriando — sem consumo de recurso, sem impacto em disponibilidade. Propriedade usada deliberadamente nos defaults 999999 de Novo/Negociação (D-04). Origem: 07-01-PLAN.md `<threat_model>` | 07-01-PLAN.md (autor do plano) | 2026-07-31 |
| AR-07-02 | T-07-05 | App single-admin local por decisão de escopo do projeto (CLAUDE.md: sem autenticação multi-usuário); `/configuracoes` tem exatamente a mesma exposição de `/pipeline`, `/leads` e demais rotas — esta fase não altera o modelo de acesso. Origem: 07-01-PLAN.md `<threat_model>` | 07-01-PLAN.md (autor do plano) | 2026-07-31 |
| AR-07-03 | T-07-07 | Rota `/configuracoes` expõe apenas 3 inteiros de configuração de negócio, sem PII, sem segredo; mesma exposição das demais rotas de um app local single-admin (CLAUDE.md). Origem: 07-02-PLAN.md `<threat_model>` | 07-02-PLAN.md (autor do plano) | 2026-07-31 |
| AR-07-04 | T-07-09 | Não aplicável: app local single-admin sem autenticação por decisão de escopo do projeto; esta fase não introduz nenhuma nova identidade nem sessão. Origem: 07-02-PLAN.md `<threat_model>` | 07-02-PLAN.md (autor do plano) | 2026-07-31 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-31 | 11 | 11 | 0 | gsd-security-auditor |

**Notes:**
- 11 threats total = T-07-01 through T-07-09 (9 unique IDs) + T-07-SC declared separately in each plan's `<threat_model>` (07-01 and 07-02), tracked as two distinct rows since each guards a different execution window's install surface.
- No `## Threat Flags` section found in either 07-01-SUMMARY.md or 07-02-SUMMARY.md — no unregistered attack surface reported by the executor.
- All `mitigate` dispositions verified against actual code (not just plan intent): grep + functional read of `src/actions/configuracoes-actions.ts`, `src/lib/validations.ts`, `src/db/schema.ts`, `src/db/queries.ts`, `src/app/pipeline/page.tsx`, `src/components/configuracoes-form.tsx`. Live database (`./data/crm.db`) inspected directly via `better-sqlite3` to confirm T-07-03 (table exists, correct defaults, `leads`=33/`subnichos`=9 preserved).
- All `accept` dispositions confirmed unchanged from PLAN.md and logged above with traceable origin.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-31
