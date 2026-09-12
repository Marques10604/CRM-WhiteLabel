---
phase: quick-260912-nzq
plan: 01
subsystem: ui
tags: [react, next.js, campanhas, leads, veredito-ia, contador-tentativas]

requires:
  - phase: 24-veredito-e-mapa-de-nichos
    provides: "getVereditoIAPorCampanha (Fase 24-02), campanhas.veredito_final (Fase 24-01), VereditoSugeridoChip (Fase 23-05)"
  - phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
    provides: "lead.contactAttempts + precedente visual em pipeline-lead-card.tsx"
provides:
  - "Chips de veredito (IA + final) direto na linha de /campanhas, sem abrir o detalhe"
  - "Contador '{n}x' de tentativas de contato direto na tabela /leads, mesmo visual do card do pipeline"
affects: [campanhas, leads, mapa-de-nichos]

tech-stack:
  added: []
  patterns:
    - "Surfacing de dado já calculado em tela de detalhe para a lista, reusando componentes/queries existentes sem criar novo estado visual"

key-files:
  created: []
  modified:
    - src/app/campanhas/page.tsx
    - src/components/campanha-list.tsx
    - src/components/lead-table.tsx

key-decisions:
  - "Veredito IA passado como objeto plano (Object.fromEntries do Map) para CampanhaList, evitando serialização de Map na fronteira RSC->Client Component (D-01 do plano)"
  - "Veredito final não precisou de prop nova — já vinha em campanha.vereditoFinal (D-02 do plano)"
  - "lead-table-columns.tsx NÃO foi tocado — seu cell da coluna 'acoes' é código morto de render (D-03 do plano, já documentado desde a quick 260725-gzb)"

patterns-established:
  - "Micro-rótulo textual (IA / Final) em text-muted-foreground para desambiguar dois chips do mesmo componente, sem inventar tooltip novo (D-04)"

requirements-completed: [SURF-01, SURF-02]

duration: 20min
completed: 2026-09-12
---

# Quick Task 260912-nzq: Tornar mais visíveis 2 coisas que já existiam Summary

**Chips de veredito (IA + final) na lista `/campanhas` e contador `{n}x` de tentativas de contato na tabela `/leads`, ambos reusando componentes/queries já existentes sem criar dado novo.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 automáticas concluídas + 1 checkpoint de verificação visual (pendente, ver seção abaixo)
- **Files modified:** 3

## Accomplishments

- `/campanhas` agora mostra, em cada linha, o chip do veredito sugerido pela IA (rótulo "IA") quando existe diagnóstico gerado, e/ou o chip do veredito final registrado pelo operador (rótulo "Final") quando existe — sem precisar clicar para abrir o detalhe da campanha.
- `/leads` agora mostra o contador `{n}x` com ícone `MessageCircle`, ao lado do botão de histórico, para leads com `contactAttempts > 0` — visual idêntico ao já usado no card do pipeline desde a Fase 06.
- Zero query nova, zero componente novo, zero migração, zero pacote novo — 100% reuso de infraestrutura das Fases 06, 23 e 24.

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Veredito (IA + final) na listagem /campanhas** - `cc535f2` (feat)
2. **Task 2: Contador de tentativas de contato na tabela /leads** - `3e516c4` (feat)

**Plan metadata:** commit separado feito pelo orquestrador (não por este executor, por instrução explícita).

## Files Created/Modified

- `src/app/campanhas/page.tsx` - Adiciona `getVereditoIAPorCampanha()` como terceiro item do `Promise.all` já existente; converte o `Map` retornado em objeto plano via `Object.fromEntries` e passa como prop `vereditoIAPorCampanha` para `CampanhaList`
- `src/components/campanha-list.tsx` - Recebe a nova prop `vereditoIAPorCampanha: Record<number, VereditoDecisao>`; renderiza `VereditoSugeridoChip` (reusado de `veredito-sugerido-chip.tsx`, Fase 23-05) com micro-rótulo "IA" quando há diagnóstico, e com micro-rótulo "Final" quando `campanha.vereditoFinal` existe; ambos ao lado do `CampanhaEstadoBadge` já existente, dentro de um `<div className="flex shrink-0 items-center gap-2">`
- `src/components/lead-table.tsx` - Insere `<span>` com `MessageCircle` + `{lead.contactAttempts}x` imediatamente antes do botão de histórico (`History`), dentro do wrapper `onClick={stopPropagation}` já existente, condicionado a `contactAttempts > 0`; markup espelha literalmente `pipeline-lead-card.tsx`

## Decisions Made

- **D-01 (do plano):** objeto plano em vez de `Map` na fronteira RSC → Client Component, para não depender de serialização de `Map` pelo Next.js.
- **D-02 (do plano):** nenhuma prop nova para o veredito final — já chegava dentro do array `campanhas` que `CampanhaList` já recebia.
- **D-03 (do plano):** `lead-table-columns.tsx` intencionalmente intocado — seu `cell` da coluna `acoes` é código morto de render (a tabela real usa markup manual, não `flexRender`), confirmado pelo `git diff --name-only` não listar esse arquivo.
- **D-04 (do plano):** desambiguação IA-vs-Final feita por micro-rótulo textual em `text-muted-foreground`, sem tooltip/`title` novo.

## Deviations from Plan

None - plan executado exatamente como escrito. Ambas as tasks automáticas passaram na verificação (`tsc --noEmit`, `npm run lint`, `npm run verify:brand`) sem necessidade de ajuste.

## Issues Encountered

Nenhum. Único ponto de atenção durante a execução: o texto da Task 2 pedia para inserir o contador "imediatamente antes do `<Button>` do ícone `History`" — a primeira tentativa inseriu antes do botão WhatsApp (o primeiro botão do wrapper); corrigido antes do commit para respeitar a posição exata pedida no plano (entre o botão WhatsApp e o botão de histórico).

## User Setup Required

None - nenhuma configuração de serviço externo.

## Human Verification — Concluída (parcial, modo escuro)

O orquestrador conectou o navegador (Claude in Chrome) nesta sessão e verificou ao vivo contra `npm run dev`:

1. `/campanhas` sem diagnóstico/veredito (estado real da campanha de teste): linha idêntica à de antes, só o badge "Explorando" — ✅ confirmado.
2. Setado temporariamente `veredito_final = 'aprofundar'` na campanha de teste (id 2) via script direto no banco só para o teste visual: chips "Final" + "Aprofundar" (verde) aparecem ao lado do badge de estado, sem estourar a largura da linha — ✅ confirmado. Valor revertido para `NULL` logo em seguida.
3. Clique na linha continua navegando para `/campanhas/{id}` — não testado explicitamente nesta passada (comportamento não tocado pelo plano, risco baixo).
4. `/leads` com um lead restaurado temporariamente da Lixeira (id 17, `contactAttempts=3`): contador "3x" com ícone de balão aparece ao lado do ícone de histórico, mesmo padrão visual do card do pipeline — ✅ confirmado. Lead devolvido para a Lixeira (`deletedAt` restaurado) logo em seguida.
5. Tema escuro: ambos os itens acima já foram verificados com o tema escuro ativo (padrão desta sessão) — cores legíveis, sem contraste quebrado.
6. **Tema claro: NÃO verificado** — a extensão do navegador ficou sem resposta (3 timeouts consecutivos de `Page.captureScreenshot`) logo após alternar para o tema claro, antes de capturar a evidência. Não é um problema de memória (700MB livres no momento) — parece instabilidade pontual da extensão/CDP.
7. Botões WhatsApp/histórico/editar/excluir: não re-testados nesta passada (nenhuma mudança de handler nesta quick task, risco baixo).

**Nenhum dado real do usuário foi afetado** — as duas alterações usadas para o teste visual (veredito da campanha de teste, restauração do lead 17) foram revertidas via script imediatamente após a captura de evidência, confirmado por leitura de volta do banco.

## Next Phase Readiness

- `/campanhas` e `/leads` confirmados funcionando corretamente no tema escuro. Tema claro fica como verificação pendente não-bloqueante (baixo risco — os componentes reusados, `VereditoSugeridoChip` e o padrão de contador, já são usados em outras telas que passam por `verify:brand`, então já são tema-aware por construção).
- Nenhum bloqueio conhecido para as próximas quick tasks da fila (temperatura de lead, busca global).

---
*Phase: quick-260912-nzq*
*Completed: 2026-09-12*

## Self-Check: PASSED

Arquivos modificados confirmados em disco (`src/app/campanhas/page.tsx`, `src/components/campanha-list.tsx`, `src/components/lead-table.tsx`); os 2 hashes de commit (`cc535f2`, `3e516c4`) confirmados no `git log`.
