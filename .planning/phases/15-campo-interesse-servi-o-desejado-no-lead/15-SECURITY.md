---
phase: 15
slug: campo-interesse-servi-o-desejado-no-lead
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-31
---

# Phase 15 — Security

> Contrato de segurança da fase: registro de ameaças, riscos aceitos e trilha de auditoria.
> Fase 15 adiciona uma coluna de texto livre nullable `interesse` à tabela `leads`,
> expõe o campo no formulário de criar/editar lead e o torna mapeável no wizard de importação CSV.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| navegador (formulário de lead) → Server Action `createLead` / `updateLead` | input não confiável cruza aqui via `FormData` | texto livre `interesse` (PII de negócio: o que o lead quer) |
| arquivo CSV do cowork → parse client-side (PapaParse) → Server Action `bulkImportLeads` | conteúdo de arquivo de terceiro (parceiro) cruza aqui; a coluna mapeada para `interesse` é texto arbitrário | célula de CSV mapeada para `interesse` |
| `scripts/migrate-interesse.cjs` → arquivo `data/crm.db` | DDL sobre banco de produção real (dados de leads reais) | `ALTER TABLE leads ADD interesse` |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-15-01 | Tampering (Stored XSS via texto livre) | `interesse` renderizado no `<Input>` do form de edição | mitigate | React escapa por padrão; valor sempre via `form.register("interesse")` num `<Input>` controlado (`src/components/lead-form-dialog.tsx:349-363`); zero `dangerouslySetInnerHTML` em `src/` (grep — nenhum arquivo); `.trim().max(500)` em `src/lib/validations.ts:71-74` | closed |
| T-15-02 | Denial of Service (payload gigante no campo) | campo `interesse` do form → `createLead` / `updateLead` | mitigate | `z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.")` em `leadBaseSchema` (`src/lib/validations.ts:71-74`), propaga para `leadSchema`; rejeitado no servidor via `leadSchema.safeParse` antes de qualquer insert/update (`src/actions/lead-actions.ts:69`, `:138`) | closed |
| T-15-03 | Tampering (mass assignment / chave forjada no FormData) | `Object.fromEntries(formData)` em `createLead` / `updateLead` | mitigate | `leadSchema.safeParse` é allowlist — objeto Zod descarta chaves não declaradas (`src/actions/lead-actions.ts:69`, `:138`); o `.values`/`.set` espalha `...parsed.data` (já validado), nunca `formData` cru, e grava `interesse: parsed.data.interesse ?? null` explicitamente (`src/actions/lead-actions.ts:101`, `:179`) | closed |
| T-15-04 | Tampering (SQL injection no DDL ou no valor) | `scripts/migrate-interesse.cjs` + queries Drizzle de lead | mitigate | DDL é string literal estática sem interpolação: `db.exec("ALTER TABLE \`leads\` ADD \`interesse\` text;")` (`scripts/migrate-interesse.cjs:62`); Drizzle parametriza todo valor de `interesse` no insert/update (`src/actions/lead-actions.ts:101`, `:179`) | closed |
| T-15-05 | Denial of Service (migração corrompe/perde dados) | `ALTER TABLE` sobre `data/crm.db` real | mitigate | backup com `wal_checkpoint(TRUNCATE)` + `fs.copyFileSync` ANTES de abrir o banco para escrita (`scripts/migrate-interesse.cjs:37-46`, antes do `new Database` de escrita em `:48` e do `ALTER` em `:62`); contagem de linhas antes/depois com `fail()` (`:51`, `:69-72`); idempotência via `PRAGMA table_info(leads)` (`:56-61`); verificação pós-migração de tipo TEXT + `notnull===0` (`:74-81`). Verificado em runtime: `data/crm.db` tem `interesse` TEXT `notnull=0`; backups `crm.db.backup-2026-08-31T14-00-*` presentes em `data/` | closed |
| T-15-06 | Information disclosure (PII do lead) | coluna `interesse` | accept | ver Accepted Risks Log (RISK-15-01) | closed |
| T-15-07 | Denial of Service (célula gigante no CSV) | coluna mapeada para `interesse` em `mapCsvRows` | mitigate | `readMapped(row, "interesse").slice(0, 500)` ANTES de qualquer validação (`src/lib/csv-import.ts:147`) — a linha nunca reprova, o valor entra truncado em 500; coberto pelo Caso 19 de `scripts/test-lead-actions.cjs:516-533` | closed |
| T-15-08 | Tampering (Stored XSS via célula de CSV) | `interesse` importado, renderizado no `<Input>` do form de edição | mitigate | mesma defesa de T-15-01 (React escapa; `<Input>` controlado; sem `dangerouslySetInnerHTML`); `csvRowSchema` herda `.trim().max(500)` do `leadBaseSchema` — `interesse` fica FORA do `.omit()` (`src/lib/validations.ts:116-121`) | closed |
| T-15-09 | Tampering (campo extra em `ConfirmedImportRow` vindo do client) | `bulkImportLeads(rows)` | mitigate | `csvRowSchema.safeParse` por linha antes de qualquer insert — aborta o lote inteiro se qualquer linha falhar (`src/actions/import-actions.ts:93-105`); insert campo-a-campo a partir de `validatedRows` (`parsed.data`) com `interesse: row.interesse ?? null` explícito, nunca spread cru (`src/actions/import-actions.ts:145-163`) | closed |
| T-15-10 | Tampering (SQL injection via valor de `interesse` do CSV) | `tx.insert(leads).values(...)` | mitigate | Drizzle parametriza todo valor; `tx.insert(leads).values({ ..., interesse: row.interesse ?? null })` (`src/actions/import-actions.ts:147-163`); nenhum SQL construído por concatenação | closed |
| T-15-SC | Tampering (supply chain) | instalações npm | accept | ver Accepted Risks Log (RISK-15-02) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| RISK-15-01 | T-15-06 | A coluna `interesse` guarda PII de negócio (o que o lead quer). O CRM é ferramenta solo de um único admin, sem autenticação multi-usuário, por constraint explícita do `CLAUDE.md`/PROJECT.md ("ferramenta solo, sem necessidade de autenticação multi-usuário"). A Fase 15 não cria nenhuma rota, endpoint ou API nova — `interesse` só aparece no `lead-form-dialog.tsx` já existente (verificado: nenhum route handler novo no diff da fase). O gate de acesso à app hospedada (se houver) é responsabilidade da milestone de deploy, não desta fase. Risco residual: exposição se o dispositivo/host do admin for comprometido — aceito, mesmo perfil de todos os demais campos de lead. | Marques10604 (via /gsd-secure-phase) | 2026-08-31 |
| RISK-15-02 | T-15-SC | Zero dependências novas nesta fase. `git diff` de `package.json` na fase mostra uma única linha adicionada no bloco `scripts` (`"migrate:interesse": "node scripts/migrate-interesse.cjs"`) — nenhuma mudança em `dependencies`/`devDependencies`. Ambos os SUMMARY declaram `tech-stack.added: []`. `## Package Legitimacy Audit` não requerido (nenhum install). | Marques10604 (via /gsd-secure-phase) | 2026-08-31 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-31 | 11 | 11 | 0 | gsd-security-auditor (Claude Sonnet 5) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-31

---

## Notas de Verificação

- **Threat Flags dos SUMMARY:** `15-01-SUMMARY.md` não tem seção `## Threat Flags`. `15-02-SUMMARY.md` tem `## Threat Flags` declarando explicitamente "Nenhuma superfície nova além da já registrada no `<threat_model>` do plano (T-15-07..10)". Nenhum `unregistered_flag`.
- **Cobertura de todos os entry points de `interesse`:**
  - Form manual: `createLead` (`lead-actions.ts:69`, `:101`) e `updateLead` (`:138`, `:179`) — ambos com `safeParse` + gravação null-explícita.
  - CSV: `mapCsvRows` trunca (`csv-import.ts:147`) → `csv-import-preview-table.tsx:266` monta `ConfirmedImportRow` → `bulkImportLeads` revalida por linha (`import-actions.ts:95`) + insere parametrizado (`:156`).
  - Migração: `scripts/migrate-interesse.cjs` (backup + idempotência + verificação); gate de presença em `scripts/verify-schema.cjs:125-126`.
- **XSS:** grep `dangerouslySetInnerHTML` em `src/` → nenhum arquivo. `interesse` fora de escopo para render em `/leads`, card do pipeline e timeline (SPEC out-of-scope), então o único ponto de exibição é o `<Input>` controlado do form de edição.
- Implementation files não foram modificados por esta auditoria.
