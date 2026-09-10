---
phase: 23-diagn-stico-de-ia-da-campanha
plan: 05
subsystem: ui
tags: [react, server-component, client-component, badge, xss, anti-generico, diagnostico]

requires:
  - phase: 23-diagn-stico-de-ia-da-campanha
    provides: "type Diagnostico + urlSegura (23-01); tabela diagnosticos com coluna aviso (23-02)"
provides:
  - "AchadoTipoBadge (Server) — dado_quantificavel × alegacao_marketing em cor + ícone"
  - "VereditoSugeridoChip (Server) — aprofundar / mudar_angulo / abandonar"
  - "RascunhoMensagem (Client) — Textarea controlado + copiar, sem nenhum caminho de envio"
  - "DiagnosticoResultado (Server) — render dos 11 blocos do objeto validado, href sempre via urlSegura"
affects: [23-07 (DiagnosticoSecao consome DiagnosticoResultado + GerarDiagnosticoButton)]

tech-stack:
  added: []
  patterns:
    - "Badge no idioma LABEL/TOKEN/ICON de campanha-estado-badge — mapas Record separados"
    - "Client Component com Textarea controlado + valor vivo no state (idioma whatsapp-preview-dialog)"
    - "LinkExterno local: urlSegura antes de qualquer href; reprovado vira <span> inerte"
    - "Distinção semântica em 3 eixos (cor + ícone + tratamento do texto) para DIAGNOSTICO-07"

key-files:
  created:
    - src/components/achado-tipo-badge.tsx
    - src/components/veredito-sugerido-chip.tsx
    - src/app/campanhas/[id]/_components/rascunho-mensagem.tsx
    - src/components/diagnostico-resultado.tsx
  modified: []

key-decisions:
  - "23-05 executado FORA de subagente: o executor da fase caiu no limite de sessão (429) após criar os 2 badges (Task 1); o orquestrador verificou-os e commitou, depois fez Tasks 2-3 inline. Nenhuma chamada de API — plano é 100% componentes puros."
  - "Doc-comments dos 2 componentes evitam as strings literais 'wa.me' / 'mailto:' / 'buscando: {query}' porque as acceptance criteria fazem grep -c exato e falhariam por causa do comentário."
  - "border-primary aparece exatamente 1× (card do gatilho mais_forte) — única borda de acento da seção, conforme 23-UI-SPEC."

patterns-established:
  - "Toda URL autorada pelo LLM passa por urlSegura antes de virar href; um único href no arquivo, dentro de LinkExterno"
  - "alegacao_marketing renderiza em italic text-muted-foreground; dado_quantificavel em text-foreground pleno — nunca o mesmo peso"

requirements-completed: []
requirements-partial: [DIAGNOSTICO-03, DIAGNOSTICO-04, DIAGNOSTICO-05, DIAGNOSTICO-06, DIAGNOSTICO-07, DIAGNOSTICO-08, DIAGNOSTICO-09]

duration: 30min
completed: 2026-09-10
---

# Phase 23 Plan 05: Componentes de Apresentação do Diagnóstico Summary

**Os 4 componentes de tela do diagnóstico — 2 badges semânticos (Server), o rascunho editável sem caminho de envio (Client) e o `DiagnosticoResultado` que renderiza os 11 blocos do objeto validado com todo href passando pela allowlist `urlSegura`. Zero API, zero banco — componentes puros que recebem o objeto por prop.**

## Performance

- **Duration:** ~30 min (dividido: badges pelo executor antes do 429, rascunho + resultado inline pelo orquestrador)
- **Completed:** 2026-09-10
- **Tasks:** 3
- **Files created:** 4

## Accomplishments

- **`src/components/achado-tipo-badge.tsx`** (Server) — `AchadoTipoBadge` no idioma LABEL/TOKEN/ICON de `campanha-estado-badge.tsx`. `dado_quantificavel` → `Hash` + `bg-status-info`; `alegacao_marketing` → `Megaphone` + `bg-status-warning`. Sem `"use client"`, sem hex.
- **`src/components/veredito-sugerido-chip.tsx`** (Server) — `VereditoSugeridoChip`. `aprofundar` → `bg-status-success`; `mudar_angulo` → `bg-status-warning`; `abandonar` → `bg-status-danger`. O rótulo "Sugestão da IA (não vinculante)" fica no `DiagnosticoResultado`, não aqui.
- **`src/app/campanhas/[id]/_components/rascunho-mensagem.tsx`** (Client) — `RascunhoMensagem`. `Textarea` controlado (`value={texto}` no state, init da prop `rascunho`), botão `variant="outline"` "Copiar mensagem" → "Copiado" por 2s lendo o **state vivo** via `navigator.clipboard.writeText`, `clearTimeout` no unmount. Nota fixa VERBATIM do 23-UI-SPEC. **Zero** `wa.me` / `mailto:` / `@/actions/*` / botão "Salvar" — é a prova de DIAGNOSTICO-08.
- **`src/components/diagnostico-resultado.tsx`** (Server, 251 linhas) — os 11 blocos na ordem do 23-UI-SPEC §Layout: metadados (custo sempre visível), consultas executadas (`buscando: {q}`, D-23-06), ressalva (`Ressalva: `, D-23-07), saturação (único número-herói, `text-foreground` neutro), gatilhos (o `mais_forte` com `border-primary` + badge "Mais forte" `bg-status-neutral` — única borda de acento), objeções, ticket (BRL via `Intl.NumberFormat`), achados (distinção em 3 eixos: badge + `italic text-muted-foreground` na alegação), rascunho, veredito (rótulo "Sugestão da IA (não vinculante)" + caption), fontes. `LinkExterno` local aplica `urlSegura` antes do único `href` do arquivo; reprovado → `<span>` inerte. Todo `<a>` com `target="_blank" rel="noopener noreferrer"`.

## Task Commits

1. **Task 1: Badges semânticos (tipo de achado + veredito)** - `e3c5817` (feat) — commitado pelo orquestrador
2. **Task 2: Rascunho de 1ª mensagem editável/copiável/sem envio** - `fd140ba` (feat)
3. **Task 3: DiagnosticoResultado — render do objeto validado** - `aaa8747` (feat)

## Files Created

- `src/components/achado-tipo-badge.tsx` - Badge dado × alegação (cor + ícone)
- `src/components/veredito-sugerido-chip.tsx` - Chip do veredito sugerido
- `src/app/campanhas/[id]/_components/rascunho-mensagem.tsx` - Textarea + copiar, sem envio
- `src/components/diagnostico-resultado.tsx` - Render completo do diagnóstico (11 blocos)

## Decisions Made

- **Execução fora de subagente.** O executor da 23-05 bateu no limite de sessão do Claude Code (429, reset 13:50 BRT) logo depois de criar os 2 badges. Como o plano é 100% componentes puros (nenhuma chamada de API, nenhum banco), o orquestrador verificou os badges (tsc/lint/brand/contraste verdes), commitou-os como Task 1, e fez as Tasks 2-3 inline.
- **Doc-comments sem as strings de grep.** As acceptance criteria de Task 2 e Task 3 rodam `grep -c` exato para `wa.me` / `mailto:` / `@/actions/` (Task 2, tem que dar 0) e `buscando: ` (Task 3, tem que dar 1). Os comentários explicativos foram redigidos sem esses literais.
- **`border-primary` exatamente 1×.** Só no card do gatilho `mais_forte`. Os links de fonte usam `text-primary` (o outro uso reservado do acento). Nenhum outro elemento compete.

## Deviations from Plan

- **Nenhuma no código.** Todos os 4 componentes seguem o contrato `<interfaces>` e o 23-UI-SPEC. A única divergência de processo é a execução inline (acima), forçada pelo limite de sessão.

## Issues Encountered

- Limite de sessão (429) matou o executor no meio da Task 1. Recuperado sem perda: os 2 arquivos criados estavam íntegros e passaram nos gates.

## User Setup Required

Nenhum para este plano — componentes puros, sem API. O setup de `ANTHROPIC_API_KEY` + créditos segue pendente para o **23-04 Task 3** (spike) e o **23-06** (eval).

## Next Phase Readiness

- `DiagnosticoResultado` pronto para o `DiagnosticoSecao` do plano 23-07 consumir (props: `diagnostico`, `fontes`, `criadoEm`, `inputTokens`, `outputTokens`, `buscas`, `aviso`).
- `RascunhoMensagem` já é renderizado por dentro do `DiagnosticoResultado` (bloco 9) — 23-07 não o toca.
- Requisitos DIAGNOSTICO-03..09 ficam **parciais**: a camada visual existe, mas só viram observáveis quando 23-07 liga o botão + a query na página `/campanhas/[id]` e 23-04 Task 3 destrava a geração real.

## Self-Check: PASSED

- 4 arquivos conferidos em disco.
- Commits `e3c5817`, `fd140ba`, `aaa8747` presentes no histórico.
- Gates: `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (4 warnings pré-existentes em `lixeira-table.tsx`, fora de escopo); `npm run verify:brand` OK (101 arquivos); `npm run check:contrast` 30/30 OK; `npm run build` (Turbopack) exit 0, 14 rotas; `npm run test:diagnostico-estrutural` verde.
- Greps de aceitação: Task 2 → 0 caminhos de envio, `use client` na 1ª linha, `As edições não são salvas.` presente. Task 3 → 0 hex, 0 `use client`, `urlSegura` presente, `buscando: ` = 1, `Ressalva: ` = 1, `border-primary` = 1, `target="_blank"` = `rel="noopener noreferrer"` = 1, 0 `transition-all`, todos os literais de copy presentes.

---
*Phase: 23-diagn-stico-de-ia-da-campanha*
*Completed: 2026-09-10*
