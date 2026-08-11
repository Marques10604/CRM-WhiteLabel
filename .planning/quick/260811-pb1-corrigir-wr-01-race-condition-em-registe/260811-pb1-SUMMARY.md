---
quick_id: 260811-pb1
status: complete
completed: 2026-08-11
commit: 73b43b2
---

# Quick Task 260811-pb1: Corrigir WR-01 — race condition em registerWhatsAppContact

**`registerWhatsAppContact` agora reverifica `stage === "novo"` dentro do próprio `WHERE` da escrita transacional (via `.returning()`), em vez de confiar só no `SELECT` pré-transação — se um `updateLeadStage` concorrente mudar o stage entre a leitura e a escrita, o auto-avanço é abortado (mas a interação/contagem ainda é gravada) e `advanced: false` é retornado ao caller.**

## Accomplishments

- Fechada a race condition TOCTOU documentada em `09-REVIEW.md` (WR-01): o gate de etapa "novo" agora é atômico com a escrita que ele autoriza, não só uma leitura anterior
- Docstring da função corrigido para descrever a guarda real (reverificação atômica), em vez de uma garantia que o código anterior não cumpria
- Nenhuma mudança de schema ou de UI necessária — o client já trata `advanced: false` sem exibir o toast de auto-avanço

## Files Modified

- `src/actions/lead-actions.ts` — `registerWhatsAppContact`: `stageGuard` no `WHERE` do update transacional, `.returning()` para detectar 0 linhas casadas, fallback de update sem stage quando a guarda barra o avanço, `advanced` recalculado antes do retorno

## Verification

```
npx tsc --noEmit                          → exit 0
npm run test:interacao-actions            → 20/20 OK
node scripts/verify-wa-contact-invariant.cjs → 15/15 OK
npm run guard:no-hard-delete              → OK
npm run test:lead-actions                 → todas as asserções OK
```

## Issues Encountered

Nenhum bloqueio. Não foi adicionado um teste automatizado específico para a corrida em si (simular duas escritas concorrentes de verdade não é trivial com better-sqlite3 síncrono de processo único) — a correção foi verificada por leitura de código + os 5 gates acima, todos em exit 0.

---
*Quick task: 260811-pb1*
*Completed: 2026-08-11*
