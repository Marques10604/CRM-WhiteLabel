---
phase: 14
slug: filtro-de-intervalo-customizado-em-relatorios
status: verified
threats_open: 0
asvs_level: 2
created: 2026-08-30
---

# Fase 14 — Segurança

> Contrato de segurança da fase: registro de ameaças, riscos aceitos e trilha de auditoria.
> Filtro de intervalo de datas customizado em `/relatorios` (`?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`).

---

## Fronteiras de Confiança

| Fronteira | Descrição | Dado que atravessa |
|-----------|-----------|--------------------|
| `searchParams` (`period` / `from` / `to`) → `/relatorios` | Valor 100% controlado pelo cliente / URL — pode ser `undefined`, string adulterada, payload de SQLi, data absurda, param repetido (`string[]`) | string → `Date` |
| `Date` resolvido → parâmetro do Drizzle (`gte` / `lte` nas 3 agregações) | O range vira `?` parametrizado, nunca interpolado em SQL | timestamp |
| `PeriodoSelector` (client) → querystring | O componente monta `?period=custom&from=&to=` a partir de `Date`s escolhidos no `<Calendar>` | `Date` → string `yyyy-MM-dd` |

---

## Registro de Ameaças

| Threat ID | Categoria | Componente | Disposição | Mitigação (verificada no código) | Status |
|-----------|-----------|-----------|------------|----------------------------------|--------|
| T-14-01 | Tampering (SQLi) | `from`/`to` da querystring | mitigate | `src/db/queries.ts:286` `ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/`; guarda de formato + presença em `queries.ts:340-347`; `parseISO` + `isValid` em `queries.ts:354-362`; o `Date` resolvido vira parâmetro `?` do Drizzle em `gte(leads.createdAt, range.start)` / `lte(...)` (`queries.ts:471-477`, `508-512`, `557-560`) — nunca string interpolada. Caso inválido → `fallback30` (`queries.ts:333-337`). | closed |
| T-14-02 | Denial of Service | valor inválido/absurdo gera 500 | mitigate | `resolvePeriodoRelatorios` (`queries.ts:315-394`) é função pura, sem I/O; `try/catch` em torno do parse (`queries.ts:354-359`) + guardas de regex/`isValid`; TODOS os caminhos retornam um `PeriodoRelatoriosResolvido` concreto (returns em `323`, `328`, `346`, `358`, `361`, `382-388`, `393`). Cobertura "não lança" em `scripts/test-relatorios-queries.cjs:255-269` e `294-306`. | closed |
| T-14-03 | Denial of Service | intervalo gigante gera scan pesado | accept | Ver Log de Riscos Aceitos (R-14-01). | closed |
| T-14-04 | Information Disclosure | leads soft-deleted (Lixeira) vazam no range custom | mitigate | As 3 agregações NÃO foram modificadas pela fase (confirmado por `git diff` — só os commits `51807fa` e `f45172d` tocaram `queries.ts`, nenhum alterou as funções de agregação). `isNull(leads.deletedAt)` permanece no `where` de cada uma: `queries.ts:473` (origem), `509` (nicho), `557` (motivo de perda). | closed |
| T-14-05 | Tampering | Seção 3 (motivos de perda) passa a filtrar por `createdAt` em vez de `stageChangedAt` | mitigate | `getContagemPorMotivoPerda` intacta — `gte(leads.stageChangedAt, range.start)` / `lte(leads.stageChangedAt, range.end)` em `queries.ts:558-559`, `eq(leads.stage, "perdido")` em `queries.ts:556`. O `range` custom flui igual ao preset. Discriminante D-11 coberto em `scripts/test-relatorios-queries.cjs:442-475` (PARTE B). | closed |
| T-14-06 | Tampering | usuário edita `from`/`to` na URL para formato inválido, contornando os date pickers | mitigate | O cliente não é a barreira: `PeriodoSelector` só monta URLs bem-formadas via `format(inicio, "yyyy-MM-dd")` / `format(fim, "yyyy-MM-dd")` (`src/components/periodo-selector.tsx:120-121`). A validação real é server-side (T-14-01, `queries.ts:340-362`) → qualquer URL adulterada cai em `30d` + faixa de aviso. | closed |
| T-14-07 | Denial of Service | navegação em loop (`router.push` re-dispara `navegarCustom`) | mitigate | `navegarCustom` só é invocado em event handlers: `handleSelectChange` (`periodo-selector.tsx:131`), `handleInicioChange` (`:149`), `handleFimChange` (`:157`); `navegarPreset` em `handleSelectChange` (`:136`). O único `useEffect` (`periodo-selector.tsx:101-105`) faz apenas `setCustomMode`/`setDataInicio`/`setDataFim` — nenhuma navegação. Nenhum `router.push` no corpo do render. | closed |
| T-14-08 | Tampering | modo custom mostra dados de um preset (dessincronização `customMode` vs `value`) | mitigate | O `<Select>` exibe `emModoCustom ? "custom" : value` (`periodo-selector.tsx:166`), com `emModoCustom = value === "custom" || customMode` (`:93`) — `value` (fonte de verdade do servidor) domina. O `useEffect` de ressync (`:101-105`, deps `[value, from, to]`) faz `setCustomMode(value === "custom")` a cada mudança de URL, então após fallback server-side (intervalo inválido → `preset: "30d"`) o seletor volta a "Últimos 30 dias" junto com a faixa de aviso (correções CR-01 / WR-04). | closed |
| T-14-SC-01 | Tampering | supply chain (camada de servidor) | accept | Ver Log de Riscos Aceitos (R-14-02). | closed |
| T-14-SC-02 | Tampering | supply chain (camada de UI) | accept | Ver Log de Riscos Aceitos (R-14-03). | closed |

*Status: open · closed*
*Disposição: mitigate (implementação exigida) · accept (risco documentado) · transfer (terceiro)*

---

## Log de Riscos Aceitos

| Risco ID | Ref. Ameaça | Justificativa | Aceito Por | Data |
|----------|-------------|---------------|------------|------|
| R-14-01 | T-14-03 | Um intervalo custom gigante (`from` no ano 1, `to` clampado para hoje) vira um `BETWEEN` de 2 timestamps sobre a tabela `leads` já indexada (`leads_stage_idx`, `leads_subnicho_id_idx`, `leads_motivo_perda_id_idx`). É exatamente a mesma forma do preset `"tudo"` (`start: new Date(0)`) que já existe e é aceito desde a Fase 11. CRM solo, base de dezenas a poucas centenas de leads. Sem mitigação nova. | admin (usuário único) | 2026-08-30 |
| R-14-02 | T-14-SC-01 | Zero dependência nova na camada de servidor — `resolvePeriodoRelatorios` usa `endOfDay` / `isValid` / `parseISO` de `date-fns` (v4.4.0), lib já presente e já importada em `src/db/queries.ts`. `git diff v1.3..HEAD -- package.json` vazio (nenhuma adição). | admin (usuário único) | 2026-08-30 |
| R-14-03 | T-14-SC-02 | Zero dependência nova na camada de UI — `Popover` / `Calendar` / `Button` são primitivos shadcn já copiados no repo (`src/components/ui/`); `date-fns` / `lucide-react` já usados no projeto. `git diff v1.3..HEAD -- package.json` vazio. | admin (usuário único) | 2026-08-30 |

*Riscos aceitos não reaparecem em auditorias futuras.*

---

## Flags Não Registradas

Nenhuma. Os dois SUMMARYs da fase (`14-01-SUMMARY.md` §"Threat surface scan", `14-02-SUMMARY.md` §"Threat surface scan") declaram explicitamente "Nenhuma superfície nova fora do `<threat_model>` do plano". O único vetor novo (`from`/`to` da querystring) já está mapeado em T-14-01/T-14-02. `package.json` inalterado desde `v1.3` (nenhuma dependência nova). Nenhuma Server Action nova, nenhuma migração, nenhum toque em schema.

---

## Trilha de Auditoria de Segurança

| Data da Auditoria | Total de Ameaças | Fechadas | Abertas | Executada Por |
|-------------------|------------------|----------|---------|---------------|
| 2026-08-30 | 10 | 10 | 0 | gsd-security-auditor (Claude) |

---

## Aprovação

- [x] Todas as ameaças têm disposição (mitigate / accept / transfer)
- [x] Riscos aceitos documentados no Log de Riscos Aceitos
- [x] `threats_open: 0` confirmado
- [x] `status: verified` no frontmatter

**Aprovação:** verified 2026-08-30
