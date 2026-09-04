---
phase: 20
slug: tema-dark-mode
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-04
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Contexto:** Fase minúscula — liga o dark mode (`ThemeProvider` do `next-themes` + toggle sol/lua
no rodapé da sidebar + guarda `verify:theme`). Superfície de segurança mínima: um `className` no
`<html>`, uma chave `localStorage` cosmética, o script inline pré-paint do `next-themes` (pacote
já presente). Zero rota nova, zero dado sensível, zero dependência instalada, zero mudança de schema.
Register construído em tempo de plano (`20-01-PLAN.md` com `<threat_model>`) → auditoria = verificação
de mitigação.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `localStorage` ↔ app client | `next-themes` lê/escreve a chave `theme`; o valor pode ser adulterado pelo próprio usuário via devtools | `"system"` / `"light"` / `"dark"` (enum, sem PII) |
| script inline do `next-themes` ↔ `<head>` | `next-themes` injeta um `<script>` inline que aplica a classe de tema antes do paint | className (`.dark` ou nada) |
| `next-themes` (dependência) ↔ árvore do app | Pacote de terceiros já presente (`^0.4.6`), hoje também consumido por `src/components/ui/sonner.tsx` | — |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-20-01 | Tampering | valor `theme` adulterado no `localStorage` | mitigate | `theme-toggle.tsx` L44 só chama `setTheme("light")` / `setTheme("dark")` (literais); `next-themes` normaliza contra o conjunto fixo `system`/`light`/`dark` e ignora valor arbitrário. `attribute="class"` (`layout.tsx` L37) seta só um className — sem `innerHTML`, sem `eval` (grep confirma: 0 ocorrências de `innerHTML`/`dangerouslySetInnerHTML`/`eval(`/`new Function` nos 3 arquivos). | closed |
| T-20-02 | Tampering (supply chain) | script inline injetado por `next-themes` no `<head>` | accept | Pacote já na árvore desde antes desta fase (`sonner.tsx` importa `useTheme`). Esta fase NÃO instala nada; `git diff -- package-lock.json` = 0 linhas (verificado). Risco idêntico ao estado pré-fase. | closed (accepted) |
| T-20-03 | Information Disclosure | preferência de tema visível em `localStorage` | accept | Dado puramente cosmético (`light`/`dark`/`system`), zero PII, sem valor para atacante. | closed (accepted) |
| T-20-04 | Spoofing / XSS via className | `attribute="class"` escreve string no DOM do `<html>` | mitigate | A string vem do enum fixo do `next-themes`, nunca de input livre; React escapa `className`. `theme-provider.tsx` é um passthrough puro (`{...props}{children}`), sem manipulação de string. | closed |
| T-20-05 | Denial of usability | flash / layout shift no carregamento degradando UX | mitigate | `suppressHydrationWarning` no `<html>` (`layout.tsx` L34) + `disableTransitionOnChange` (L41) + script pré-paint do `next-themes` + guard `mounted` no `theme-toggle.tsx` com placeholder que reserva a altura final (spacer `h-[18px] w-[18px]` + `<span className="opacity-0">Tema claro</span>`). Coberto por THEME-04 e pelo gate `verify:theme` (teste de mutação: remover `suppressHydrationWarning` → `verify:theme` exit 1). | closed |
| T-20-SC | Tampering | npm/pip/cargo installs | accept | Nenhum pacote instalado nesta fase. `npm install` não roda. `next-themes ^0.4.6` já estava em `package.json`. Única mudança em `package.json`: +1 linha (`"verify:theme": "node scripts/verify-theme.cjs"`). `package-lock.json` intacto. Sem pacotes `[ASSUMED]`/`[SUS]`/`[SLOP]`. | closed (accepted) |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-20-01 | T-20-02 | O script inline do `next-themes` é do próprio pacote, já presente e já executado (via `sonner`). Nada novo é introduzido. | Marques10604 (via `20-01-PLAN.md`, disposition `accept`) | 2026-09-04 |
| AR-20-02 | T-20-03 | Preferência de tema é cosmética, sem PII. Um atacante que lê o `localStorage` do usuário já tem acesso local total. | Marques10604 (via `20-01-PLAN.md`, disposition `accept`) | 2026-09-04 |
| AR-20-03 | T-20-SC | Nenhuma dependência instalada. Qualquer `npm install` futuro nesta linha exige checkpoint humano bloqueante. | Marques10604 (via `20-01-PLAN.md`, disposition `accept`) | 2026-09-04 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-04 | 6 | 6 | 0 | /gsd-secure-phase (orchestrator, register authored at plan time — mitigation verification mode) |

**Método:** short-circuit `threats_open: 0 AND register_authored_at_plan_time: true`. O `20-01-PLAN.md`
continha `<threat_model>` parseável (6 threats, severidade máxima baixa). Cada mitigação foi verificada
contra o estado do repo: `grep` por `innerHTML`/`eval`/`dangerouslySetInnerHTML` nos 3 arquivos de tema
(0), `grep` por `setTheme(` (só literais `light`/`dark`), `attribute="class"` presente em `layout.tsx`,
`git diff -- package-lock.json` vazio, `verify:theme` exit 0 com teste de mutação. 3 threats `mitigate`
verificados presentes; 3 `accept` registrados no Accepted Risks Log. Nenhuma escalada.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-04
