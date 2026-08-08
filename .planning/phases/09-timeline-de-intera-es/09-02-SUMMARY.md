---
phase: 09-timeline-de-intera-es
plan: 02
subsystem: api
tags: [drizzle, sqlite, transactions, server-actions, timeline]

requires:
  - phase: 09-timeline-de-intera-es
    plan: 01
    provides: tabela `interacoes` viva no banco, tipos, `whatsappContactSchema.texto` obrigatório, Server Actions de nota manual
provides:
  - registerWhatsAppContact transacional (contador + linha de timeline numa única escrita atômica)
  - Captura automática do texto vivo da mensagem em todo clique de "Abrir WhatsApp", para os 3 tipos de template
  - scripts/test-interacao-actions.cjs — guarda permanente dos invariantes de cobertura, atomicidade e imutabilidade da timeline
affects: [09-03, 09-04]

tech-stack:
  added: []
  patterns:
    - "db.transaction() envolvendo update+insert como escrita atômica única (mesmo precedente de applyDefaultTemplate)"
    - "Harness de invariante :memory: puro (sem ORM, sem import de código real) reproduzindo o idioma de escrita de produção, com asserções de runtime + grep estático tolerante a reformatação"

key-files:
  created:
    - scripts/test-interacao-actions.cjs
  modified:
    - src/actions/lead-actions.ts
    - src/components/whatsapp-preview-dialog.tsx
    - package.json

key-decisions:
  - "Insert em interacoes fica no nível incondicional da transação (irmão do update), nunca dentro do spread ternário de avanço — follow_up e prova_valor também geram linha de timeline, não só primeiro_contato (Pitfall 4)"
  - "Mensagem vazia na textarea agora falha whatsappContactSchema.safeParse e não grava tentativa nem interação — consequência deliberada de D-04 herdada de 09-01"

patterns-established:
  - "Toda escrita dupla (contador + evento) em Server Action passa a ser db.transaction(), nunca dois awaits sequenciais soltos"

requirements-completed: [TIMELINE-01]

duration: ~8min
completed: 2026-08-08
---

# Phase 09 Plan 02: Captura Automática da Timeline no Clique de WhatsApp Summary

**registerWhatsAppContact grava contador de tentativas e linha de `interacoes` numa única transação atômica para os 3 tipos de template, com o texto vivo da caixa de mensagem, e ganhou um harness `:memory:` de 20 asserções que reprova a remoção do insert transacional (mutação provada em runtime, exit 1 → exit 0 após reversão).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-08-08T23:19:00Z
- **Completed:** 2026-08-08T23:27:14Z
- **Tasks:** 2
- **Files modified:** 4 (3 modificados + 1 criado)

## Accomplishments
- Todo clique real em "Abrir WhatsApp" — qualquer template (primeiro_contato/follow_up/prova_valor), qualquer tela — agora grava uma linha em `interacoes` com o texto vivo da caixa de mensagem, junto com o incremento de `contactAttempts`, numa única transação (`db.transaction()`)
- Auto-avanço novo→contatado (WA-06/WA-07) preservado byte-idêntico — `advanced = parsed.data.tipo === "primeiro_contato" && current.stage === "novo"` intocado, provado por `verify-wa-contact-invariant.cjs` (tabela-verdade 15/15)
- Guarda permanente `npm run test:interacao-actions` (20 asserções) prova cobertura por tipo, atomicidade/rollback sob violação de FK, imutabilidade de eventos de WhatsApp (soft-delete e edição bloqueados no WHERE) e ordenação cronológica estável — e foi validada por teste de mutação real (removendo `tx.insert(interacoes)` o harness sai com exit 1; revertido antes do commit)

## Task Commits

Each task was committed atomically:

1. **Task 1: registerWhatsAppContact grava a interação na mesma transação e o preview passa o texto vivo** - `7c98073` (feat)
2. **Task 2: Harness permanente dos invariantes da timeline** - `652931f` (test)

**Plan metadata:** (este commit, a seguir)

## Files Created/Modified
- `src/actions/lead-actions.ts` - `registerWhatsAppContact` ganhou o parâmetro `texto`, `safeParse({ leadId, tipo, texto })`, e as duas escritas (update de `leads` + insert em `interacoes`) envolvidas em `db.transaction()`; insert incondicional, irmão do update, fora do spread `...(advanced ? {} : {})`
- `src/components/whatsapp-preview-dialog.tsx` - `onClick` do anchor passa `registerWhatsAppContact(leadId, tipo, texto)` em vez de `(leadId, tipo)`; comentário atualizado citando D-04
- `scripts/test-interacao-actions.cjs` (novo) - harness `:memory:` puro (better-sqlite3, sem ORM) com 20 asserções: cobertura por tipo (4), atomicidade+rollback (3), imutabilidade soft-delete (4), imutabilidade edição (2), ordenação cronológica (2), estáticas (5)
- `package.json` - novo script `test:interacao-actions`

## Decisions Made
- **Insert incondicional, fora do bloco de avanço (Pitfall 4):** `tx.insert(interacoes)` é uma instrução irmã do `tx.update(leads)`, nunca aninhada dentro de `...(advanced ? {} : {})` — garante que follow_up e prova_valor também virem linha de timeline, não só primeiro_contato. Provado tanto pela acceptance criteria estática da Task 1 quanto pela asserção 6 do harness da Task 2.
- **Mensagem vazia deixa de registrar tentativa (herdado de 09-01, D-04):** como `whatsappContactSchema.texto` já era obrigatório desde 09-01, a mudança de assinatura desta plan fecha a janela documentada no SUMMARY anterior — a partir deste commit, todo clique real volta a incrementar `contactAttempts`/avançar etapa normalmente (nenhuma regressão pendente).
- **Harness sem ORM/sem import de TS (diferente de `test-lead-actions.cjs`):** seguiu o precedente de `verify-wa-contact-invariant.cjs` (reprodução em miniatura do idioma de escrita, não exercício direto do código importado) — evita a complexidade de bootstrap de `ts-alias-loader.mjs`/migrations para uma tabela que não tem migração `.sql` versionada (criada via `drizzle-kit push` em 09-01).

## Deviations from Plan

None - plan executado exatamente como escrito. Nenhum Rule 1-4 acionado; nenhuma issue bloqueante encontrada.

## Issues Encountered

None. Único ponto de atenção não-bloqueante: a primeira tentativa de rodar o `node -e "..."` de verificação estática da Task 1 falhou por quebra de quoting do shell (aspas duplas aninhadas no comando inline) — não é um problema de código, apenas do comando de shell usado para rodar a verificação. Contornado escrevendo o mesmo script em um arquivo `.cjs` temporário no scratchpad e executando via `node <arquivo>`; o resultado (`OK captura automática`) é idêntico ao que o comando inline do PLAN.md produziria.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Metade automática de TIMELINE-01 completa: captura de timeline no clique de WhatsApp funciona sem nenhuma ação manual extra do admin, para os 3 tipos de template, em qualquer tela que use `WhatsAppPreviewDialog`.
- Nenhuma superfície de UI nova foi criada nesta plan (conforme `<success_criteria>` do PLAN.md) — a camada de dados (09-01) e a captura automática (09-02) estão prontas para 09-03/09-04 construírem a UI de leitura/edição da timeline (lista, nota manual) sobre esta base.
- Todos os 6 gates de verificação do plano rodaram sequencialmente com o dev server parado (host de 4GB RAM): `tsc --noEmit`, `verify-wa-contact-invariant.cjs`, `test:interacao-actions`, `test:lead-actions`, `guard:no-hard-delete`, `verify:schema` — todos exit 0.

## Self-Check: PASSED

Todos os 4 arquivos (src/actions/lead-actions.ts, src/components/whatsapp-preview-dialog.tsx, scripts/test-interacao-actions.cjs, package.json) confirmados presentes em disco. Ambos os hashes de commit (7c98073, 652931f) confirmados presentes em `git log --oneline --all`.

---
*Phase: 09-timeline-de-intera-es*
*Completed: 2026-08-08*
