---
phase: 21
slug: exportar-csv-da-lista-de-leads
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-04
---

# Phase 21 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Contexto:** Fase pequena — botão "Exportar CSV" na toolbar de `/leads`. Geração de CSV
**100% client-side** a partir de dados que o admin já vê na tela; download via `Blob` +
`<a download>`. Zero rota nova, zero Server Action, zero dado sai do navegador, zero
dependência instalada, zero mudança de schema. Register construído em tempo de plano
(`21-01-PLAN.md` com `<threat_model>`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| dados da `LeadRow` (já no cliente) → texto CSV | Valores serializados para arquivo; parte (nome, notas, interesse) origina de CSV importado de um parceiro (cowork), não só do admin | PII de lead (telefone, nome, notas) |
| texto CSV → arquivo no disco do admin | `Blob` + `URL.createObjectURL` + `<a download>` clicado programaticamente | arquivo `.csv` |
| arquivo CSV → planilha (Excel / Google Sheets) | O app de planilha interpreta fórmulas em células que começam com `=` `+` `-` `@` | conteúdo das células |
| `papaparse` (dependência) ↔ árvore do app | Pacote de terceiros já presente (`^5.5.4`), usado hoje no import CSV | — |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-21-01 | Injection (CSV / formula injection) | `leadRowToCsvRecord` → célula aberta no Excel/Sheets | mitigate | `sanitizeCsvCell` (`lead-csv-export.ts`): `"=+-@\t\r".includes(value[0]) ? "'" + value : value`, aplicado a TODOS os valores string dentro de `leadRowToCsvRecord` (loop `for (const key of Object.keys(record))`). Harness `test:lead-csv-export` cobre as 6 formas + passthrough; teste de mutação 2 (neutralizar a função) faz o harness sair 1. | closed |
| T-21-02 | Injection (delimiter / quote breakout) | `buildLeadsCsv` → valor contendo `;`, `"` ou quebra de linha | mitigate | `Papa.unparse` faz quoting RFC4180 automático — não reimplementado. Harness asseria que um valor com `;` sai entre aspas (OK). | closed |
| T-21-03 | Information Disclosure | CSV com PII de lead (telefone, notas) gravado em arquivo claro | accept | O admin pediu a exportação (EXPORT-01); ferramenta solo local; os mesmos dados já estão renderizados na tabela na tela. **Sem canal de rede** — o arquivo nunca sai do navegador do admin. | closed (accepted) |
| T-21-04 | Denial of Service | lista muito grande → CSV gigante / travar o navegador | accept | PROJECT.md limita o universo a "alguns milhares de leads"; a tabela já renderiza todas essas linhas no cliente hoje. `Papa.unparse` de alguns milhares de linhas é sub-100ms. | closed (accepted) |
| T-21-05 | Tampering | `download` de arquivo com nome/conteúdo arbitrário | mitigate | Nome do arquivo derivado só de `format(new Date(), "yyyy-MM-dd")` — sem input do usuário (`leadsCsvFilename`). Conteúdo = só os dados da tabela. `URL.revokeObjectURL(url)` chamado após `anchor.click()` (`downloadCsv` L38 — verificado no código). | closed |
| T-21-SC | Tampering (supply chain) | npm/pip/cargo installs | mitigate | Nenhum pacote instalado. `Papa` e `date-fns` já na árvore. `git diff -- package-lock.json` = 0 linhas (verificado). Única mudança em `package.json`: +1 linha (`"test:lead-csv-export"`). Sem pacotes `[ASSUMED]`/`[SUS]`/`[SLOP]`. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-21-01 | T-21-03 | O admin pediu a exportação. Os dados já estão na tela e o arquivo nunca sai do navegador (sem rede). Um atacante com acesso local ao disco do admin já tem acesso ao `data/crm.db` inteiro. | Marques10604 (via `21-01-PLAN.md`, disposition `accept`) | 2026-09-04 |
| AR-21-02 | T-21-04 | Universo de "alguns milhares de leads" (PROJECT.md). A tabela já renderiza todos no cliente; `Papa.unparse` é sub-100ms nessa escala. | Marques10604 (via `21-01-PLAN.md`, disposition `accept`) | 2026-09-04 |

**Nota de trade-off (T-21-01):** `sanitizeCsvCell` prefixa `'` em telefone no formato `+55...` e
em notas começando com `-`/`@`/`=`. No Excel/Sheets o `'` fica **oculto** (marcador de texto —
comportamento desejado), mas **visível** se o CSV for aberto em editor de texto puro. É o
trade-off padrão OWASP; aceito no D-21-04. Documentado no `21-01-SUMMARY.md` para não virar
"bug" na UAT.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-04 | 6 | 6 | 0 | /gsd-secure-phase (orchestrator, register authored at plan time — mitigation verification mode) |

**Método:** short-circuit `threats_open: 0 AND register_authored_at_plan_time: true`. O
`21-01-PLAN.md` continha `<threat_model>` parseável (6 threats, severidade máxima baixa). Cada
mitigação verificada contra o repo: leitura de `sanitizeCsvCell`/`downloadCsv`/`buildLeadsCsv`
em `src/lib/lead-csv-export.ts` e `src/components/lead-table-toolbar.tsx`; `npm run
test:lead-csv-export` exit 0 com os 2 testes de mutação (BOM + `sanitizeCsvCell`);
`git diff -- package-lock.json` vazio; `grep` por `Blob`/`document`/`URL` no módulo puro (0).
4 threats `mitigate` verificados presentes; 2 `accept` registrados no Accepted Risks Log.
Nenhuma escalada.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-04
