---
phase: 16
slug: corre-es-de-code-review-da-fase-15
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-01
---

# Phase 16 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
>
> Fase de quitação de débito — fecha os 5 achados do `15-REVIEW.md`. Zero feature
> funcional nova, zero dependência nova, zero migração de schema destrutiva.
> Threat register autorado em tempo de plano (`16-01-PLAN.md` + `16-02-PLAN.md`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| navegador do admin → Server Action (`createLead`/`updateLead`) | `FormData` não confiável atravessa aqui; `leadBaseSchema` (Zod `z.object` + strip) é o portão | campos de lead editáveis pelo admin (texto livre, datas, enums) |
| arquivo CSV do parceiro (cowork) → `mapCsvRows` → `csvRowSchema` → `bulkImportLeads` | conteúdo de terceiro atravessa aqui; truncar-antes-de-validar é a defesa | linhas de CSV: nome, telefone, nicho, notas, `interesse` (texto livre) |
| arquivo CSV do parceiro → prévia renderizada no navegador do admin | conteúdo de terceiro é exibido na tabela de prévia; React escapa por padrão | mesmo conteúdo de CSV, pré-insert |
| script `.cjs` local (`migrate-interesse.cjs`) → `data/crm.db` | integridade do banco real (PII de leads) atravessa aqui; backup datado é a rede de segurança | schema DDL (`ALTER TABLE ADD COLUMN`) + verificação read-only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-16-01 | Tampering | `z.preprocess` de `interesse` (`src/lib/validations.ts`) | mitigate | Trim novo só normaliza a borda vazia (`" "` → `undefined` → `null`). `z.object` (strip) e o limite de comprimento ficam intactos — mass-assignment via `FormData` forjado (`id`, `deletedAt`, `createdAt`) segue descartado. Provado pelos Casos 14a/14b de `test-lead-actions.cjs`. | closed |
| T-16-02 | Tampering | corte de `interesse` do CSV em `mapCsvRows` (`src/lib/csv-import.ts`) | mitigate | Corte por code point (`Array.from(...).slice(0,500)`) elimina o surrogate solto na fronteira 499/500. Defesa em profundidade server-side em `csvRowSchema` **reforçada pelo CR-01 da Fase 16**: passou de `.max(500)` (code units) para `.refine(Array.from(v).length <= 500)` (code points) — limite consistente nos dois lados, sem o caminho de abort de lote que o code review pegou. | closed |
| T-16-03 | Denial of Service | `Array.from` sobre célula CSV gigante em `mapCsvRows` | accept | `Array.from` materializa um array de code points antes do `.slice`. Aceito: import local, single-admin; o arquivo inteiro já está em memória via PapaParse antes de `mapCsvRows`; sem amplificação remota. | closed (risco aceito) |
| T-16-04 | Repudiation | harness `scripts/test-lead-actions.cjs` | accept | Harness de desenvolvimento contra `:memory:`/banco de teste local; sem superfície de produção. | closed (risco aceito) |
| T-16-05 | Information Disclosure | coluna `Interesse` em `previewColumns` (`csv-import-preview-table.tsx`) | accept | O dado exibido é o próprio CSV que o admin acabou de subir, na sessão dele, em ferramenta solo sem multi-usuário. Nenhum dado de outro contexto entra na célula. | closed (risco aceito) |
| T-16-06 | Tampering | render do valor de CSV na célula da prévia | mitigate | Renderizado como texto via JSX (`{row.original.interesse || "—"}`), escape automático do React. Sem `dangerouslySetInnerHTML` na célula nova (verificado no diff de `bb4b36a`). Badge de truncamento também é texto JSX estático. | closed |
| T-16-07 | Denial of Service | célula gigante renderizada na prévia | mitigate | `mapCsvRows` entrega `interesse` cortado em 500 code points antes da prévia; `max-w-xs` + `whitespace-pre-line` na `<span>` contêm o layout. | closed |
| T-16-08 | Tampering / integridade de dados | pular `fs.copyFileSync` em `migrate-interesse.cjs` (D-10) | mitigate | Backup só é pulado no ramo `hasColumn === true`, que não executa DDL nem escrita (só `PRAGMA`/`SELECT`). O ramo que escreve (`ALTER TABLE`) mantém checkpoint WAL + `copyFileSync` + `try/catch` com `fail()` — o `try/catch` no próprio `ALTER` foi **adicionado pelo WR-02 da Fase 16** (`eb389bc`): "duplicate column name" segue para a verificação, outro erro chama `fail()` citando o backup preservado. Os 13 backups históricos em `data/` não são apagados. | closed |
| T-16-09 | Repudiation | premissa operacional "app parada" durante a migração | mitigate | Documentada explicitamente no header do script (bloco `PREMISSA OPERACIONAL (IN-03)`, commit `dded053`). O script não impede escrita concorrente no `-wal`; mitigação é documental + o ramo idempotente (o único que roda hoje) não escreve nada. | closed |
| T-16-SC | Tampering | instalações npm/pip/cargo | accept | N/A nesta fase — zero dependência nova, nenhum `npm install` em nenhuma task (nem no plano nem no fix de code review). O gate de legitimidade de pacote não se aplica. | closed (risco aceito) |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-16-01 | T-16-03 | Custo de memória de `Array.from` sobre célula CSV grande é aceitável: import local single-admin, arquivo já em memória via PapaParse, sem amplificação remota. | admin (ferramenta solo) | 2026-09-01 |
| AR-16-02 | T-16-04 | Harness de teste roda só em ambiente local; sem superfície de produção. | admin (ferramenta solo) | 2026-09-01 |
| AR-16-03 | T-16-05 | Prévia exibe o CSV que o próprio admin acabou de subir, na sessão dele; ferramenta sem multi-usuário. | admin (ferramenta solo) | 2026-09-01 |
| AR-16-04 | T-16-SC | Zero dependência nova na fase (plano + fix de code review). | admin (ferramenta solo) | 2026-09-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-01 | 10 | 10 | 0 | Claude (secure-phase, short-circuit: register autorado em tempo de plano, mitigações verificadas nos diffs) |

Notas do audit:
- Register construído a partir dos blocos `<threat_model>` de `16-01-PLAN.md` (T-16-01..04, T-16-SC) e `16-02-PLAN.md` (T-16-05..09, T-16-SC) — `register_authored_at_plan_time: true`.
- O code review da fase (`16-REVIEW.md` → `16-REVIEW-FIX.md`) **fortaleceu** T-16-02 (limite de `interesse` consistente por code point nos dois lados, fecha o caminho de abort de lote) e T-16-08 (`try/catch` no `ALTER TABLE`). Nenhum achado do code review abriu threat novo.
- Mitigações verificadas por leitura dos diffs `cc3d44c`, `17acb77`, `bb4b36a`, `dded053`, `8da0358`, `3bec2f6`, `eb389bc` e do estado atual de `validations.ts` / `csv-import.ts` / `csv-import-preview-table.tsx` / `migrate-interesse.cjs`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-01
