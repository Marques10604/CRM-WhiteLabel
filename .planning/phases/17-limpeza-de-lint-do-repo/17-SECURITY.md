---
phase: 17
slug: limpeza-de-lint-do-repo
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-01
---

# Phase 17 — Security

> Per-phase security contract. Fase config-only de tooling (ESLint) + comentários
> `eslint-disable` + docs. **Zero código de runtime tocado, zero superfície de entrada,
> zero dependência nova.** Threat register autorado em tempo de plano (`17-01-PLAN.md`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| (nenhuma) | Fase config-only / tooling. Nenhuma superfície de entrada, sem auth, sem rede, sem schema, sem código de runtime. O único "efeito" é o ESLint deixar de varrer `.claude/**` e `scripts/**/*.cjs` para a regra `no-require-imports`. | — |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-17-01 | Tampering | `globalIgnores([".claude/**"])` em `eslint.config.mjs` | mitigate | `.claude/**` não é código do produto (não trackeado no git — `git ls-files .claude` → 0); ignorá-lo não pode mascarar erro de `src/`. Provado: `npx eslint .` continuou reportando os 4 erros reais de `src/` ANTES das supressões da Task 2 (acceptance da Task 1) | closed |
| T-17-02 | Tampering | Override `files: ["scripts/**/*.cjs"]` desligando `no-require-imports` | mitigate | Escopo do override = glob `scripts/**/*.cjs` + regra `no-require-imports` apenas; `src/**` e qualquer `.ts`/`.tsx` intocados. `require()` é o idioma CommonJS correto desses harnesses. Provado: `npx eslint src` exit 0 sem o override alterar nada em `src/` | closed |
| T-17-03 | Tampering | `eslint-disable-next-line` nos 4 erros de `src/` | accept | Supressões pontuais por linha, cada uma comentada; não desligam a regra para o arquivo nem globalmente. Mesmo padrão de falso-positivo do React Compiler já auditado e aceito no projeto (STATE.md 07-02 / 09-03 / 09-04). `react-hooks/*` seguem ativos para todo o resto de `src/` | closed (risco aceito) |
| T-17-04 | Repudiation | `git worktree remove --force` do worktree órfão | accept | Worktree = cruft de execução antiga (branch `worktree-agent-ab2be3f82c3c9c30d` @ `dc9dc98`, um commit da Fase 03, fora do `main`). Conteúdo reproduzível pelo git; `--force` descartou só `.next/` gerado. Sem impacto em código ativo | closed (risco aceito) |
| T-17-SC | Tampering | instalações npm/pip/cargo | accept | N/A — zero dependência nova, nenhum `npm install` em nenhuma task. O gate de legitimidade de pacote não se aplica | closed (risco aceito) |

*Status: open · closed*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-03 | `eslint-disable-next-line` por linha comentado nos 4 falsos-positivos do React Compiler — padrão já aceito no projeto (STATE.md 07-02/09-03/09-04). | admin (ferramenta solo) | 2026-09-01 |
| AR-17-02 | T-17-04 | Remoção do worktree órfão — cruft de execução, conteúdo reproduzível pelo git. | admin (ferramenta solo) | 2026-09-01 |
| AR-17-03 | T-17-SC | Zero dependência nova na fase. | admin (ferramenta solo) | 2026-09-01 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-01 | 5 | 5 | 0 | Claude (secure-phase inline, short-circuit: register autorado em plano, mitigações verificadas nos diffs + gates) |

Notas:
- Register construído do bloco `<threat_model>` de `17-01-PLAN.md` (`register_authored_at_plan_time: true`).
- Fase config-only: nenhuma linha de código de runtime tocada. As "mitigações" T-17-01/02 são provadas pelos próprios acceptance criteria do plano (o ESLint continua reportando os erros reais de `src/` até serem suprimidos um a um, comentados).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-01
