---
phase: 13
slug: rename-sub-nicho-nicho-reframe
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-30
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Registro construído em tempo de planejamento (`<threat_model>` nos 3 PLANs). Auditoria retroativa em 2026-08-30 verificou cada mitigação contra a implementação commitada (waves `0c80822` / `f30bd18` / `2733b10`) e contra o UAT de navegador (`13-UAT.md`, 8/8).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| identificador Drizzle (`nichos`) ↔ nome físico da tabela (`subnichos`) | Divergência DELIBERADA (D-01) — risco de alguém "consertar" achando que é bug | nenhum (metadata de schema) |
| `guard-no-hard-delete.cjs` → hard-delete de `nichos` | O CODE_PATTERN casa o nome do OBJETO Drizzle; renomear o objeto sem renomear o pattern deixa a tabela desprotegida | operação de delete |
| link interno `/subnichos` esquecido → navegação | Um `href` hardcoded não migrado quebraria a navegação | rota |
| `sed` em massa sobre ~30 arquivos | Risco de trocar `"subnichos"` (nome físico) por engano e quebrar o banco | string de identificador vs. string física |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-13-01 | Tampering | `schema.ts` — alguém renomeia a tabela física achando que a divergência é erro | mitigate | Doc-comment de 13 linhas acima de `export const nichos` (`schema.ts:7-18`) explicando a divergência lógico↔físico e por que NÃO renomear no banco. `npm run verify:schema` continua checando `subnichos`/`subnicho_nome_unique_idx` e falharia se a tabela física mudasse sem migração. | closed |
| T-13-02 | Denial of Service (perda de dado) | `guard-no-hard-delete.cjs` CODE_PATTERN desatualizado | mitigate | Wave 1 (mesmo commit `0c80822` que renomeia o objeto) trocou `/\.delete\(\s*subnichos\b/` → `/\.delete\(\s*nichos\b/`. `CODE_SQL_PATTERNS` (`DELETE FROM subnichos`, `DROP TABLE subnichos`) mantidos — nome físico. `npm run guard:no-hard-delete` exit 0. `nicho-actions.ts` só faz `db.update` (soft-delete), exposição real é defensiva. | closed |
| T-13-03 | Tampering | migração acidental de coluna disparada por `drizzle-kit generate` vendo o rename | mitigate | D-01: nenhum comando `drizzle-kit` executado em nenhuma das 3 ondas; `package.json` não tem script `drizzle-kit` (confirmado). `src/db/migrations/` NÃO foi tocado pela fase (`git diff --stat 17e3b03..b3885fb -- src/db/migrations/` vazio). O snapshot divergente (débito das Fases 4/6/7/8) não foi mexido. | closed |
| T-13-04 | Denial of Service | link `/subnichos` hardcoded esquecido na varredura | mitigate | Redirect 301 permanente em `next.config.ts` `redirects()` (`{ source: "/subnichos", destination: "/nichos", permanent: true }`) — rede de segurança. `grep -rn 'href="/subnichos"\|"/subnichos"' src/` → vazio. UAT Teste 2: `/subnichos` redireciona para `/nichos`. | closed |
| T-13-05 | Tampering | perda de comportamento do filtro de nicho na `lead-table` na migração | mitigate | O bloco de filtro foi só renomeado (`subnichoId` → `nichoId`), lógica idêntica (compara por id numérico — decisão da Fase 1). `npm run test:lead-actions` exit 0. UAT Teste 5: filtrar por "odonto" reduz a lista para 1 lead. | closed |
| T-13-06 | Tampering | `SEM_SUBNICHO_FALLBACK` renomeado mas valor `"A categorizar"` alterado | mitigate | Só o nome da const mudou (`SEM_NICHO_FALLBACK`); o valor `"A categorizar"` (fallback D-12 / seed) inalterado. `grep SEM_SUBNICHO_FALLBACK src/` → vazio. UAT Testes 3/6: "A categorizar" continua sendo um nicho normal, listado em `/nichos` e em `/relatorios`. | closed |
| T-13-07 | Tampering | `sed`/grep cego trocando `"subnichos"` (nome físico) por engano | mitigate | Tasks 2/3 EXPLÍCITAS sobre o que NÃO trocar (nomes físicos não têm forma camelCase nem hífen — `subnichos`/`subnicho_id` sobrevivem a `s/subnicho/nicho/g` só onde escrito como identificador). Gate de grep filtrado exclui só os nomes físicos + doc-comment. `npm run verify:schema` exit 0 (tabela física intacta). **Prova no nível do banco (UAT):** `SELECT id,nome,deleted_at FROM subnichos` — tabela `subnichos` existe, 3 nichos reais (nutricionista/odonto/A categorizar) com `deleted_at: null`, 37 leads mantêm a categorização. | closed |
| T-13-08 | Denial of Service | `npm run build` quebra por string órfã não-migrada | mitigate | `npm run build` rodado 2× (fim da Wave 2 e da Wave 3), exit 0 nas duas, rota `/nichos` gerada (sem `/subnichos`). 8 harnesses `.cjs` + `guard` + gate de grep COPY-01 (vazio) verdes. | closed |
| T-13-SC | Tampering | supply chain (npm) | accept | Rename puro — nenhuma dependência npm nova, nenhum comando de instalação. `git diff --stat 17e3b03..b3885fb -- package.json package-lock.json` → vazio. Package Legitimacy Gate não se aplica. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-13-01 | T-13-SC | A Fase 13 é rename + reframe de copy — nenhuma dependência npm nova, nenhum bloco de registry, nenhum comando de instalação. `package.json`/`package-lock.json` não foram tocados. | admin (ivonilsoninveste0021) | 2026-08-30 |
| AR-13-02 | (D-01, meta) | Os nomes FÍSICOS do banco (`subnichos`, `subnicho_id`, os 3 índices) permanecem com o prefixo `subnicho` de propósito. Aceito como cosmético invisível ao usuário — quem abrir o Drizzle Studio vê `subnichos`. Limpar o banco é uma migração trivial isolada, não uma fase. Doc-comment no `schema.ts` registra a decisão. | admin (ivonilsoninveste0021) | 2026-08-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-30 | 9 | 9 | 0 | Claude (secure-phase, verificação retroativa contra código commitado + UAT) |

Método: registro autorado em tempo de plano (`<threat_model>` nos 3 PLANs) — modo "verify mitigations exist". Cada mitigação `mitigate` conferida contra o arquivo/linha da implementação (waves `0c80822`/`f30bd18`/`2733b10`) e contra `13-UAT.md` (8/8 pass, incluindo a prova de D-01 no nível do banco). `accept` conferido contra `git diff` (package/migrations intocados) e o doc-comment do `schema.ts`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-30
