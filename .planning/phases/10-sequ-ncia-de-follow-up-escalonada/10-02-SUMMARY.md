---
phase: 10-sequ-ncia-de-follow-up-escalonada
plan: 02
subsystem: database
tags: [drizzle, sqlite, server-actions, regression-guard]

# Dependency graph
requires:
  - phase: 10-sequ-ncia-de-follow-up-escalonada (plano 01)
    provides: "leads.sequenciaPosicao (coluna viva em data/crm.db), computeSequenciaSugestao (consumidor futuro do valor que este plano mantém vivo)"
provides:
  - "Avanço condicional de leads.sequenciaPosicao em registerWhatsAppContact — +1 por clique real de template follow_up, nos dois branches da transação (principal e fallback de corrida)"
  - "Reset de leads.sequenciaPosicao para 0 em updateLeadStage e updateLead ao voltar para stage='novo' (drag no board ou edição manual)"
  - "scripts/verify-sequencia-posicao.cjs (npm run verify:sequencia) — guarda de regressão permanente, provada por mutação"
affects: [10-03-configuracoes-ui, 10-04-indicador-visual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "avancaSequencia como variável independente de advanced dentro de registerWhatsAppContact — duas regras diferentes que só coincidem no mesmo clique nunca compartilham a mesma condição"
    - "Reset condicional-por-valor-alvo (parsed.data.stage === 'novo') em vez de condicional-por-mudança (stageChanged), mesmo idioma já usado por motivoPerda"
    - "Guarda de regressão :memory: com ids únicos por cenário (freshLead) em vez de DELETE FROM entre iterações — evita falso-positivo no guard-no-hard-delete.cjs"

key-files:
  created:
    - scripts/verify-sequencia-posicao.cjs
  modified:
    - src/actions/lead-actions.ts
    - package.json

key-decisions:
  - "D-01/D-02/D-12 implementados exatamente como documentado no 10-01-SUMMARY.md: avanço só em follow_up, reset só ao voltar para novo, reset vale para updateLeadStage E updateLead"

patterns-established:
  - "Scripts de guarda .cjs que testam SQL de leads em :memory: devem usar ids únicos por cenário, nunca DELETE FROM leads — mesmo em teste, o texto da query (e até comentários citando-a) trafega pelo guard-no-hard-delete.cjs, que faz match de linha e não distingue produção de teste"

requirements-completed: [SEQ-02]

# Metrics
duration: ~10min
completed: 2026-08-12
---

# Phase 10 Plan 02: Avanço e Reset de Sequência de Follow-up Summary

**`leads.sequenciaPosicao` passa a andar sozinho: +1 por clique real de template `follow_up` (nos dois branches da transação existente de `registerWhatsAppContact`) e reset para 0 ao voltar para "novo" em `updateLeadStage`/`updateLead`, com guarda de regressão permanente provada por mutação.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-08-12T17:01:42Z (aprox., conforme STATE.md ao início da sessão)
- **Completed:** 2026-08-12T17:10:06Z
- **Tasks:** 3/3 completas
- **Files modified:** 3 (2 modificados, 1 criado)

## Accomplishments
- `registerWhatsAppContact` avança `sequenciaPosicao` em exatamente 1 por clique de `follow_up`, repetido nos dois branches da transação (principal e fallback de corrida) — nenhuma tentativa de follow-up é perdida sob corrida com drag concorrente
- `updateLeadStage` e `updateLead` resetam `sequenciaPosicao` para 0 sempre que o destino da mudança é `stage === "novo"`, tanto por drag no board quanto por edição manual do formulário; qualquer outro destino preserva a posição
- Nenhuma leitura de `origemTipo` foi introduzida em nenhum write-path — o gate Inbound (ORIGEM-03) continua vivendo exclusivamente em `computeSequenciaSugestao`
- Guarda de regressão permanente (`npm run verify:sequencia`) cobre a tabela-verdade comportamental completa (15 pares tipo×etapa) e checagens estruturais tolerantes a reformatação no fonte real, provada por mutação numa cópia temporária sem nunca tocar o arquivo-fonte de produção

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Avanço da posição em registerWhatsAppContact (D-01), nos dois branches da transação** - `f7e519f` (feat)
2. **Task 2: Reset da posição ao voltar para a etapa "novo" (D-02/D-12), em updateLeadStage e updateLead** - `17af120` (feat)
3. **Task 3: Guarda de regressão permanente do avanço e do reset** - `1ba13b8` (test)

_Nenhuma task foi TDD; este plano não usa o fluxo RED/GREEN/REFACTOR._

## Files Created/Modified
- `src/actions/lead-actions.ts` - `registerWhatsAppContact` ganha `const avancaSequencia = parsed.data.tipo === "follow_up"` e o spread `...(avancaSequencia ? { sequenciaPosicao: sql\`${leads.sequenciaPosicao} + 1\` } : {})` nos dois `.set()` da transação; `updateLead` e `updateLeadStage` ganham `...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {})` entre `motivoPerda` e `stageChangedAt`
- `scripts/verify-sequencia-posicao.cjs` (novo) - Parte A (tabela-verdade comportamental em `:memory:`) + Parte B (checagens estruturais tolerantes a espaçamento no fonte real)
- `package.json` - entrada `"verify:sequencia": "node scripts/verify-sequencia-posicao.cjs"` adicionada ao lado de `verify:origem-tipo`

## Pontos de escrita alterados (trecho final de cada `.set()`, conforme exigido pelo `<output>` do plano)

**`registerWhatsAppContact` — branch principal:**
```typescript
.set({
  contactAttempts: sql`${leads.contactAttempts} + 1`,
  ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
  ...(advanced ? { stage: "contatado", stageChangedAt: new Date() } : {}),
})
```

**`registerWhatsAppContact` — branch de fallback de corrida:**
```typescript
.set({
  contactAttempts: sql`${leads.contactAttempts} + 1`,
  ...(avancaSequencia ? { sequenciaPosicao: sql`${leads.sequenciaPosicao} + 1` } : {}),
})
```

**`updateLead`:**
```typescript
.set({
  ...parsed.data,
  motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
  ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}),
  ...(stageChanged ? { stageChangedAt: new Date() } : {}),
})
```

**`updateLeadStage`:**
```typescript
.set({
  stage: parsed.data.stage,
  motivoPerda: parsed.data.stage === "perdido" ? parsed.data.motivoPerda : null,
  ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {}),
  ...(stageChanged ? { stageChangedAt: new Date() } : {}),
})
```

## Saída de `npm run verify:sequencia`

```
OK tabela-verdade 15 pares: sequencia_posicao incrementa em exatamente 5/15 (follow_up, qualquer etapa) — encontrado 5
OK tabela-verdade 15 pares: sequencia_posicao intacta nos outros 10/15 (primeiro_contato/prova_valor) — encontrado 10
OK 3 cliques follow_up seguidos: sequencia_posicao acumula para 3 (got 3)
OK applyStage(novo) após 3 cliques: reseta sequencia_posicao para 0 (got 0)
OK applyStage(contatado): preserva sequencia_posicao=3 (got 3)
OK applyStage(negociacao): preserva sequencia_posicao=3 (got 3)
OK applyStage(fechado): preserva sequencia_posicao=3 (got 3)
OK applyStage(perdido): preserva sequencia_posicao=3 (got 3)
OK applyStage(novo) sobre posição já 0: idempotente, continua 0 (got 0)
OK as três funções (updateLead, updateLeadStage, registerWhatsAppContact) foram encontradas no fonte
OK registerWhatsAppContact: 2 ocorrências do incremento sequenciaPosicao (branch principal + fallback de corrida) — encontrado 2
OK registerWhatsAppContact: NÃO contém a string origemTipo (Pitfall 4 — gate Inbound é de leitura, nunca de escrita)
OK updateLead: contém o spread de reset ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {})
OK updateLeadStage: contém o spread de reset ...(parsed.data.stage === "novo" ? { sequenciaPosicao: 0 } : {})
OK updateLead: reset NÃO amarrado a stageChanged (idioma condicional-por-mudança é o errado aqui)
OK updateLeadStage: reset NÃO amarrado a stageChanged (idioma condicional-por-mudança é o errado aqui)
OK registerWhatsAppContact: reset NÃO amarrado a stageChanged

[verify-sequencia-posicao] OK: todas as asserções passaram.
```

## Resultado do teste de mutação da Parte B

Procedimento (mesmo adotado na Fase 08-03 para `verify-origem-tipo.cjs`): copiado `src/actions/lead-actions.ts` para um arquivo temporário em `os.tmpdir()`, removido o incremento de `sequenciaPosicao` do branch de fallback de corrida na cópia (deixando o branch principal intacto — simula "esquecer de repetir no fallback", o bug real que a guarda precisa detectar), e rodada só a checagem estrutural da Parte B apontada para a cópia mutada:

```
FAIL registerWhatsAppContact: 2 ocorrências do incremento sequenciaPosicao — encontrado 1

failed count = 1
MUTATION TEST PASSED (guarda corretamente reprovou a mutação, exit != 0 esperado)
EXIT CODE: 1
```

`git status --short src/actions/lead-actions.ts` confirmado vazio (sem diff) imediatamente após o teste — o arquivo-fonte real nunca foi tocado; a mutação e a cópia temporária foram removidas em seguida (`fs.unlinkSync`).

## Decisions Made

Nenhuma decisão nova de produto — D-01/D-02/D-12 já estavam travadas no `10-01-SUMMARY.md` e neste plano só foram implementadas literalmente. Uma decisão técnica local surgiu durante a Task 3 (ver Deviations abaixo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `scripts/verify-sequencia-posicao.cjs` inicial disparava falso-positivo em `guard:no-hard-delete`**
- **Found during:** Task 3, ao rodar a `<verification>` completa do plano (passo 6, `npm run guard:no-hard-delete`)
- **Issue:** A primeira versão do harness de teste usava `db.exec("DELETE FROM leads;")` entre iterações de cenário (limpar+reinserir a mesma linha `id=1`) para simplificar o teste. `scripts/guard-no-hard-delete.cjs` faz match de linha por regex em `src/` + `scripts/` procurando `DELETE FROM leads` como SQL destrutivo cru — não distingue teste de produção, então acusou (corretamente, pelo próprio desenho da regra) o script novo. Uma segunda tentativa de reescrever só o comentário explicativo, mantendo a frase entre aspas `"DELETE FROM leads"`, ainda disparou o guard, porque ele também faz match em comentários (é regex sobre texto de linha, não AST).
- **Fix:** Reescrito o harness da Parte A para usar `freshLead(stage, sequenciaPosicao)` — cada cenário insere uma linha com `id` novo e único (contador `nextId` incremental) em vez de deletar/reinserir a mesma linha. Nenhum `DELETE FROM leads` (nem como SQL executado, nem como string dentro de comentário) permanece no arquivo.
- **Files modified:** `scripts/verify-sequencia-posicao.cjs`
- **Verification:** `npm run guard:no-hard-delete` volta a passar (exit 0) e `npm run verify:sequencia` continua passando com as mesmas 17 asserções OK
- **Committed in:** `1ba13b8` (Task 3 commit — nunca chegou a ser commitado quebrado, o fix aconteceu antes do commit)

---

**Total deviations:** 1 auto-fixado (Rule 1 — bug de desenho do próprio harness de teste, descoberto pela verificação completa do plano antes do commit)
**Impact on plan:** Nenhum impacto de escopo — o fix é estritamente interno ao arquivo de teste novo desta task, não toca `src/actions/lead-actions.ts` nem altera nenhuma asserção documentada no plano.

## Issues Encountered

O `node -e "..."` de verificação embutido no plano (Task 3, passo de checagem de `data/crm.db` vs `:memory:`) também acusou um falso-positivo na primeira versão do doc-comment do script, que citava literalmente `data/crm.db` como exemplo do que NÃO usar — reescrito para "banco de produção em disco" sem a substring literal. Mesma classe de lição já registrada no `10-01-SUMMARY.md` para escaping de regex: regex simples sobre texto de arquivo não distingue código de comentário/prosa.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- `leads.sequenciaPosicao` agora é um valor vivo e correto em todo write-path de produção — o plano 10-03 (UI de `/configuracoes` para editar os intervalos) e o 10-04 (indicador visual) podem consumir `computeSequenciaSugestao` sabendo que o índice que ele lê reflete o histórico real de reabordagens do lead, não mais um valor congelado em 0
- Nenhum arquivo de UI foi tocado neste plano, conforme o `<success_criteria>` do `10-02-PLAN.md`
- Sem bloqueios conhecidos para os próximos planos da fase

---
*Phase: 10-sequ-ncia-de-follow-up-escalonada*
*Completed: 2026-08-12*

## Self-Check: PASSED

Os 4 arquivos citados neste SUMMARY (`src/actions/lead-actions.ts`, `scripts/verify-sequencia-posicao.cjs`, `package.json`, este próprio `10-02-SUMMARY.md`) confirmados presentes em disco. Os 3 commits das tasks (`f7e519f`, `17af120`, `1ba13b8`) e o commit do próprio SUMMARY (`d9e170e`) confirmados em `git log --oneline --all`.
