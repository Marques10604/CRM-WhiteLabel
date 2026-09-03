---
phase: 19
slug: marca-e-identidade-visual
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-03
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Contexto:** Fase de marca/identidade visual — refactor mecânico cor→token, nova
paleta OKLCH em `globals.css`, rename "CRM de Leads"→"SOLO", `icon.svg` novo, 3
scripts `.cjs` de gate. Zero superfície de dados nova, zero dependência instalada.
Register construído em tempo de plano (6/6 PLAN.md com `<threat_model>`) →
auditoria = verificação de mitigação, sem varredura retroativa.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| skill `/brand-design` → repositório | O skill escreve `globals.css`, `layout.tsx`, `brand.md`, `.brand-preview/` e faz backup `.bak` | Design system em produção (arquivos-fonte) |
| skill `/brand-design` → internet | Preamble emite `curl` POST de telemetria a endpoint Convex, salvo opt-out | Metadados de uso do skill |
| repositório → git remoto | Artefatos temporários (`.brand-preview/`, `*.css.bak`, `.next/`) não podem cruzar no commit | Nenhum (bloqueio de vazamento) |
| `globals.css` → todo o app | Fonte única de verdade de cor; valor errado degrada legibilidade de todas as telas | Tokens de cor (sem PII) |
| dados do lead → classe CSS | Mapas `stage → token` / `urgência → token` indexados por valor do banco | `stage` (união tipada), estados derivados (`isEsfriando`, `isOver`) |
| `src/app/icon.svg` → navegador | SVG servido como asset estático; pode carregar `<script>`/ref externa se malformado | Nenhum (asset estático) |
| `package.json` → tooling/npm | Edição programática do manifesto; JSON corrompido quebra o ferramental | Campo `name`, bloco `scripts` |
| `layout.tsx` metadata → HTML servido | `title`/`description` são literais no bundle, sem input do usuário | Texto de marketing (sem PII) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-19-01 | Information Disclosure | Telemetria do skill `/brand-design` (curl POST) | mitigate | Opt-out antes do Passo 1 — `~/.superstack/config.json` = `{"telemetryTier":"off"}` (verificado em disco). Nenhum ping emitido | closed |
| T-19-02 | Information Disclosure | `.brand-preview/*.html`, `globals.css.bak`, `.next/` | mitigate | `/.brand-preview/` e `*.css.bak` no `.gitignore` (plano 19-01). `git check-ignore` confirma os 3 caminhos ignorados; `git status --porcelain` sem esses paths | closed |
| T-19-03 | Information Disclosure | Carregamento de tipografia | mitigate | Exclusivamente `next/font/google` (self-host no build, zero fetch de runtime). `grep` por `fonts.googleapis.com`/`fonts.gstatic` em `layout.tsx`+`globals.css` → 0 | closed |
| T-19-04 | Tampering | Escrita do skill sobre `src/app/globals.css` | mitigate | `cp globals.css globals.css.bak` antes da escrita (rollback); `tsc --noEmit` + `check:contrast` como detecção. `.bak` gitignorado | closed |
| T-19-05 | Denial of usability | Tokens de cor `:root`/`.dark` (paleta + escala `--status-*` + `--sidebar-*`) | mitigate | `check-contrast.cjs` — conversão OKLCH→sRGB real + luminância WCAG; 30/30 pares AA em light **e** dark, exit 0. Token ausente = falha explícita | closed |
| T-19-06 | Tampering | `package.json` (edição programática de `scripts` e `name`) | mitigate | `JSON.parse` limpo (verificado via `require`); os 3 npm scripts do 19-01 (`verify:brand`, `verify:brand-md`, `check:contrast`) presentes; diff mínimo | closed |
| T-19-07 | Tampering | Mover `:root`/`.dark` para dentro de `@layer base` | mitigate | `@layer base` aparece 1× em `globals.css`; `:root` permanece no nível superior (linha 61). Cascata de especificidade preservada | closed |
| T-19-08 | Tampering | `STAGE_TOKEN[stage]` / `headerClass` indexados por valor do banco | mitigate | `Record<Stage, string>` fechado com literais constantes (`etapa-badge.tsx:25`); `Stage` é união tipada, `tsc --noEmit` exit 0 prova exaustividade. Nenhuma classe montada por concatenação de dado | closed |
| T-19-09 | Denial of usability | `.dark --sidebar-primary` com leftover azul-roxo do default shadcn | mitigate | Os 8 `--sidebar-*` aliasados aos tokens core nos dois blocos; `grep -c 'oklch(0.488 0.243 264.376)'` em `globals.css` = 0 | closed |
| T-19-10 | Tampering | Refactor mecânico em 14+13 arquivos com lógica sensível (transação de WhatsApp, `startTransition`, `stopPropagation`, `waHref`, supressões de lint) | mitigate | `git diff` só com linhas de `className` (code review 19-REVIEW: "nenhuma quebra de lógica/props/handlers/ordem de render"); `verify:brand` 83 arquivos exit 0; `tsc` exit 0 | closed |
| T-19-11 | Tampering | Rename das superfícies visíveis (`layout.tsx`, `app-sidebar.tsx`, `package.json`) | mitigate | Escopo travado por D-05: pasta do repo, imports, paths e CI não renomeados. Nenhuma string do produto persistida em `data/crm.db` (19-RESEARCH §Runtime State Inventory) — sem migração de dado | closed |
| T-19-12 | Information Disclosure | `metadata.description` exposta publicamente no HTML | accept | Texto de marketing sem PII; app solo, local, não indexado. `openGraph`/`metadataBase` deliberadamente não adicionados | closed (accepted) |
| T-19-13 | Tampering / Elevation | `src/app/icon.svg` | mitigate | `grep -Ei "<script\|<foreignObject\|href=\"http\|xlink:href"` → 0. Só `<rect>` + `<text>`, cores hex literais. `favicon.ico` placeholder removido | closed |
| T-19-14 | Repudiation | Registro de verificação (`19-HUMAN-UAT.md`, `19-VERIFICATION.md`) sem evidência | mitigate | 19-06 exigiu números reais (13 rotas do build, 30 checagens de contraste, 83 arquivos varridos, 26/26 cenários) e evidência substituta nomeada em todo cenário `deferred` (método code+data, host 4GB) | closed |
| T-19-15 | Tampering | `brand.md` (edição da nota do favicon por append) | mitigate | Edição por append, nunca reescrita de seção; `verify:brand-md` 9/9 exit 0 | closed |
| T-19-SC | Tampering | npm/pip/cargo installs | accept | Nenhum pacote instalado em toda a Fase 19 (19-RESEARCH §Package Legitimacy Audit: "Audit N/A"). Fontes vêm de `next/font/google`, parte do `next` já instalado. `package.json` `dependencies`/`devDependencies` inalterados | closed (accepted) |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-12 | `metadata.description` é texto de marketing sem PII. O app é solo, roda local e não é indexado; adicionar `openGraph`/`metadataBase` seria expor mais superfície sem benefício. | Marques10604 (via plano 19-05, disposition `accept`) | 2026-09-03 |
| AR-19-02 | T-19-SC | Nenhuma dependência instalada na fase inteira. Toda a Fase 19 é CSS + classes utilitárias + 3 scripts `node:fs`/`node:path`. Qualquer `npm install` futuro nesta linha exige checkpoint humano bloqueante. | Marques10604 (via planos 19-01..19-06, disposition `accept`) | 2026-09-03 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-03 | 16 | 16 | 0 | /gsd-secure-phase (orchestrator, register authored at plan time — mitigation verification mode) |

**Método:** short-circuit `threats_open: 0 AND register_authored_at_plan_time: true`.
Os 6 PLAN.md continham `<threat_model>` parseável; cada mitigação foi verificada
contra o estado do repo (`git check-ignore`, `grep`, `npm run check:contrast`,
`npx tsc --noEmit`, `require('./package.json')`, leitura de `icon.svg`/`globals.css`).
14 threats `mitigate` → mitigação presente e verificada; 2 `accept` → registradas
no Accepted Risks Log. Nenhuma escalada de gap de implementação.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-03
