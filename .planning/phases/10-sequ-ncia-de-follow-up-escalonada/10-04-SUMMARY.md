---
phase: 10-sequ-ncia-de-follow-up-escalonada
plan: 04
subsystem: ui
tags: [server-components, date-fns, lucide-react, indicator]

# Dependency graph
requires:
  - phase: 10-sequ-ncia-de-follow-up-escalonada (plano 01)
    provides: "computeSequenciaSugestao, getUltimaInteracaoWhatsAppPorLead, getConfiguracoes (Configuracoes.sequenciaIntervalosDias)"
  - phase: 10-sequ-ncia-de-follow-up-escalonada (plano 02)
    provides: "leads.sequenciaPosicao vivo e correto em todo write-path (avanço/reset)"
  - phase: 10-sequ-ncia-de-follow-up-escalonada (plano 03)
    provides: "configuracoes.sequenciaIntervalosDias editável via /configuracoes"
provides:
  - "sugestaoPorLead ({ leadId, data }[]) calculado no servidor em / e /pipeline, cruzando a fronteira RSC como array (nunca Map)"
  - "Indicador visual 'CalendarClock + Sugestão: dd/MM' em pipeline-lead-card.tsx e followup-dashboard.tsx, neutro (text-muted-foreground), com aria-label e title explicando que não altera followUpDate"
  - "Fechamento da Fase 10: 9/10 gates automatizados verdes; gate de build bloqueado por limite de RAM do host (não é defeito de código — tsc --noEmit isolado passou limpo 2x)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sugestaoPorLeadId = useMemo(() => new Map(sugestaoPorLead.map(...)), [sugestaoPorLead]) — mesmo idioma exato de esfriandoSet, repetido nos dois componentes cliente"
    - "Prop serializável (array de { leadId, data }) cruzando a fronteira Server Component -> Client Component, nunca um Map cru — mesmo idioma já usado por esfriandoLeadIds"

key-files:
  modified:
    - src/app/page.tsx
    - src/app/pipeline/page.tsx
    - src/components/pipeline-board.tsx
    - src/components/pipeline-lead-card.tsx
    - src/components/followup-dashboard.tsx

key-decisions:
  - "Gate de build (npm run build) documentado como pendência de infraestrutura (host 4GB RAM), não como defeito de código — npx tsc --noEmit isolado passou limpo em 2 execuções separadas antes e depois das 3 tentativas de build"

requirements-completed: [SEQ-02, SEQ-03, ORIGEM-03]

# Metrics
duration: ~55min (incluindo 3 tentativas de npm run build)
completed: 2026-08-13
---

# Phase 10 Plan 04: Indicador Visual da Sequência de Follow-up + Fechamento da Fase Summary

**Sugestão de próxima reabordagem ("Sugestão: dd/MM", ícone `CalendarClock`, cor neutra) calculada inteiramente no servidor e exibida no card do pipeline e na linha do dashboard — fecha SEQ-02/ORIGEM-03/SEQ-03 e a Fase 10, com 9/10 gates automatizados verdes; `npm run build` bloqueado por limite de RAM do host (não código).**

## Performance

- **Duration:** ~55 min (incluindo 3 tentativas de `npm run build`, todas por limite de memória do host)
- **Completed:** 2026-08-13
- **Tasks:** 3/3 completas (Task 3 sem alteração funcional — fechamento de fase)
- **Files modified:** 5

## Accomplishments

- `src/app/page.tsx` e `src/app/pipeline/page.tsx` passam a chamar `getConfiguracoes()` e `getUltimaInteracaoWhatsAppPorLead()` dentro do `Promise.all` já existente (I/O paralelo preservado, uma única chamada por arquivo) e montam `sugestaoPorLead` (`{ leadId, data }[]`) via `computeSequenciaSugestao`, descartando `undefined`
- `pipeline/page.tsx` não filtra `fechado`/`perdido` ao montar a lista-base — o gate de etapa terminal já mora em `computeSequenciaSugestao` (10-01), evitando duas fontes de verdade
- `pipeline-board.tsx` deriva `sugestaoPorLeadId` via `useMemo(() => new Map(...))`, mesmo idioma exato de `esfriandoSet`, e repassa `sugestao={...}` para cada `PipelineLeadCard`
- `pipeline-lead-card.tsx` e `followup-dashboard.tsx` renderizam o indicador `CalendarClock` + "Sugestão: dd/MM" como último filho da linha de metadados, neutro (`text-muted-foreground`, nunca teal `#0D9488` nem âmbar `#B45309`/`#F59E0B`), com `aria-label` de data completa e `title` explicando que não altera `followUpDate`
- Nenhum dos três componentes cliente calcula data — `addDays`/`sequenciaPosicao`/`sequenciaIntervalosDias` ausentes dos três, confirmado por checagem automatizada
- SEQ-03 confirmado como já entregue (Fase 4), sem mudança de código nesta fase — ver seção dedicada abaixo

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Cálculo server-side das sugestões nas duas rotas** - `05c59f6` (feat)
2. **Task 2: Indicador "Sugestão: dd/MM" no card do pipeline e na linha do dashboard** - `2ec129a` (feat)
3. **Task 3: Gates finais da fase e verificação ponta a ponta** - sem alteração de código (fechamento), este próprio SUMMARY é o artefato da task

_Nenhuma task foi TDD; este plano não usa o fluxo RED/GREEN/REFACTOR._

## Files Created/Modified

- `src/app/page.tsx` - `Promise.all` ganha `getConfiguracoes()`/`getUltimaInteracaoWhatsAppPorLead()`; monta e passa `sugestaoPorLead` para `<FollowupDashboard />`
- `src/app/pipeline/page.tsx` - `Promise.all` ganha `getUltimaInteracaoWhatsAppPorLead()` (`getConfiguracoes()` já existia); monta e passa `sugestaoPorLead` para `<PipelineBoard />`; base do map (`activeLeads`) NÃO filtra etapas terminais
- `src/components/pipeline-board.tsx` - `sugestaoPorLead` na prop, `sugestaoPorLeadId` via `useMemo`/`Map`, repassado como `sugestao={...}` para `PipelineLeadCard`
- `src/components/pipeline-lead-card.tsx` - `sugestao?: Date` na prop, import de `CalendarClock`, indicador como último filho da linha de metadados
- `src/components/followup-dashboard.tsx` - `sugestaoPorLead` na prop, `Map` via `useMemo`, mesmo indicador inserido após `followUpDate` na linha de metadados de cada lead

## Saída dos 10 gates da `<verification>` do plano

Executados um de cada vez, sequencialmente, com `npm run dev` PARADO (host de 4GB RAM):

1. **`npx tsc --noEmit`** — exit 0, sem saída
2. **`npx eslint` (escopo restrito da Task 3)** — exit 0; 1 warning pré-existente e não relacionado em `configuracoes-form.tsx` (`Unused eslint-disable directive`, já documentado no `10-03-SUMMARY.md`), nenhum problema novo
3. **`npm run verify:schema`** — exit 0: `sequencia_posicao`/`sequencia_intervalos_dias` presentes em `data/crm.db`
4. **`npm run verify:sequencia`** — exit 0, 17 asserções OK
5. **`npm run verify:origem-tipo`** — exit 0: 5 elos íntegros, distribuição real `inbound=1, outbound=36`
6. **`npm run guard:no-hard-delete`** — exit 0
7. **`node scripts/verify-wa-contact-invariant.cjs`** — exit 0, 15/15 tabela-verdade
8. **`npm run test:lead-actions`** — exit 0, todas as asserções (incluindo casos de `origemTipo`/CSV bulk import)
9. **`npm run test:interacao-actions`** — exit 0, todas as asserções (atomicidade, imutabilidade, ordenação)
10. **`npm run build`** — **FALHOU nas 3 tentativas**, ver seção "Gate de build" abaixo

Todos os 9 primeiros gates terminaram com exit 0. O `npx eslint` no escopo listado não introduziu nenhum problema novo em relação ao estado anterior à fase (o único warning é pré-existente, de `10-03`).

## Gate de build (`npm run build`) — pendência de infraestrutura, não de código

`npm run build` foi executado **3 vezes**, sempre com `npm run dev` comprovadamente parado (nenhum processo `node.exe` ativo, confirmado via `tasklist` antes de cada tentativa):

1. **Tentativa 1** (padrão): Turbopack compilou com sucesso ("Compiled successfully in 103s"), depois falhou durante a fase "Running TypeScript" com `FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory` (exit 134).
2. **Tentativa 2** (`NODE_OPTIONS="--max-old-space-size=3072"`, tentativa de mitigação): falhou ainda mais cedo, durante a própria compilação Turbopack, com um panic ao tentar spawnar um subprocesso Node para processar `globals.css` (`exit code: 0xc0000142`) — aumentar o heap do processo pai deixou menos RAM livre para o SO spawnar o subprocesso filho, piorando o sintoma em vez de resolver.
3. **Tentativa 3** (padrão novamente, host confirmado livre de processos concorrentes): Turbopack compilou com sucesso de novo ("Compiled successfully in 111s"), falhou de novo na fase "Running TypeScript" com `FATAL ERROR: Zone Allocation failed - process out of memory` (exit 134).

**Por que isto não é tratado como bug de código (Rule 1/3) nem revertido:** `npx tsc --noEmit` — o mesmo type-checker, rodando isolado sem a sobrecarga do bundler Turbopack já carregado em memória — passou com exit 0 e zero erros em duas execuções distintas (Task 1 e no início dos gates da Task 3), cobrindo exatamente os mesmos arquivos que `next build` tentaria checar. As 3 falhas são consistentes com o padrão já documentado em `STATE.md`/`PROJECT.md` (Key Decisions: "Host de desenvolvimento com 4GB de RAM... builds/dev-server simultâneos já causaram OOM") — aqui a falha ocorreu mesmo com o dev server parado, o que indica que o próprio `next build` (Turbopack + verificação de tipos + geração de bundles de produção em simultâneo) já excede a RAM disponível neste host específico, independente de qualquer mudança de código desta fase. Aplicado o limite de 3 tentativas de auto-fix (incluindo a tentativa de mitigação via `NODE_OPTIONS`); nenhuma tentativa adicional foi feita.

**Impacto:** nenhum. O código está correto (tipos limpos, lint limpo, todos os testes/guards de comportamento passam). `npm run build` é o único dos 10 gates sem confirmação de exit 0 nesta sessão — recomenda-se rodar `npm run build` numa máquina com mais RAM disponível (ou fechar aplicativos concorrentes no host atual) antes de publicar/fazer deploy desta fase, mas isso não bloqueia o uso local via `npm run dev`, que não passa pela fase de build de produção.

## Evidência de SEQ-03 (verificado, não reimplementado)

SEQ-03 ("templates de reforço de valor/prova social disponíveis para reabordagem") já foi entregue na **Fase 4** — confirmado por leitura nesta fase, sem nenhuma mudança de código:

- `src/db/schema.ts` linha 22: `tipo: text("tipo", { enum: ["primeiro_contato", "follow_up", "prova_valor"] }).notNull()` (tabela `templates`)
- `src/db/schema.ts` linha 89: `enum: ["primeiro_contato", "follow_up", "prova_valor", "nota_manual"]` (tabela `interacoes`)
- `src/components/whatsapp-preview-dialog.tsx` linha 44: `{ value: "prova_valor", label: "Prova de valor" }` — presente no `<Select>` de tipo de template, disponível para qualquer lead, sem gate de sequência

## Rastreabilidade dos 4 Success Criteria do ROADMAP (Phase 10)

| # | Critério | Artefato | Evidência |
|---|----------|----------|-----------|
| SC#1 | Sequência configurável entregue | `src/components/configuracoes-form.tsx` (seção "Sequência de reabordagem", plano 10-03) | `npm run verify:schema` confirma `sequencia_intervalos_dias` vivo em `data/crm.db`; comprovação comportamental do `safeParse` documentada em `10-03-SUMMARY.md` (3 casos). Passo 1 do `<human-check>`: **PENDENTE** (sem navegador nesta sessão) |
| SC#2 | Lead Outbound com posição registrada mostra a data sugerida nas duas superfícies, calculada na leitura | `src/components/pipeline-lead-card.tsx`, `src/components/followup-dashboard.tsx` (indicador `CalendarClock`) | Checagem estrutural automatizada desta task (`OK indicador 10-04 T2`); `computeSequenciaSugestao` comprovado por 5 casos comportamentais em `10-01-SUMMARY.md`. Passos 2/3/6 do `<human-check>`: **PENDENTES** (sem navegador nesta sessão) |
| SC#3 | Lead Inbound nunca recebe sugestão (bloqueante) | `src/db/queries.ts` `computeSequenciaSugestao` gate (a): `origemTipo !== "outbound"` | Caso 1 comportamental em `10-01-SUMMARY.md` (lead inbound com interação registrada → `undefined`); `T-10-15` do threat register desta fase marca o gate como único ponto de mitigação. Passo 4 do `<human-check>` (bloqueante): **PENDENTE** (sem navegador nesta sessão) |
| SC#4 | Templates de prova de valor disponíveis para reabordagem | `src/db/schema.ts` (enum `templates.tipo`), `src/components/whatsapp-preview-dialog.tsx` (`<Select>`) | Checagem automatizada desta task (`OK gates 10-04 T3`) confirma `"prova_valor"` presente nos dois arquivos; SEQ-03 documentado como entregue na Fase 4 (ver seção acima). Passo 7 do `<human-check>`: **PENDENTE** (sem navegador nesta sessão) |

`followUpDate` continua sendo o único campo editável e nunca é sobrescrito pela sugestão — nenhum write-path desta fase (nem de fases anteriores) escreve em `followUpDate` a partir de `computeSequenciaSugestao`; a função é pura e só é chamada em contexto de leitura (`src/app/page.tsx`, `src/app/pipeline/page.tsx`). Passo 9 do `<human-check>`: **PENDENTE** (sem navegador nesta sessão).

## `<human-check>` (10 passos do plano) — NÃO EXECUTADO nesta sessão

**Nenhum dos 10 passos foi executado.** Mesma limitação já documentada em praticamente todos os `SUMMARY.md` anteriores do projeto (`02-02`, `02-03`, `04-01` a `04-04`, `10-03`): este é um agente headless sem ferramenta de automação de navegador disponível no toolset desta sessão. Por causa do host de 4GB RAM, `npm run dev` não foi iniciado só para ficar ocioso sem um consumidor real (navegador) capaz de exercitar os 10 passos — e, como documentado acima, o próprio `npm run build` já saturou a RAM disponível nesta sessão, reforçando a prudência de não rodar `npm run dev` simultaneamente sem necessidade.

Status item a item, todos **pendência de UAT**:

1. `/configuracoes` confirma sequência salva (4, 10, 20) — PENDENTE
2. `/pipeline`, lead Outbound com clique de WhatsApp: "Sugestão: dd/MM" visível, cor neutra, após follow-up e contador — PENDENTE
3. `/` (dashboard): mesmo lead mostra o mesmo indicador — PENDENTE
4. Lead Inbound: nenhum indicador em nenhuma tela (bloqueante, ORIGEM-03) — PENDENTE
5. Lead Outbound sem interação de WhatsApp: nenhum indicador (D-09) — PENDENTE
6. Sequência de cliques Follow-up até esgotar os 3 degraus, indicador some após o 3º (D-10) — PENDENTE
7. Template Prova de valor disponível e não altera a sugestão (SEQ-03) — PENDENTE
8. Drag de volta para "Novo": indicador reaparece no 1º degrau (D-02, reset) — PENDENTE
9. Edição manual de `followUpDate`: sugestão não muda, não é sobrescrita (D-06) — PENDENTE
10. Mover para Fechado/Perdido: indicador some (etapa terminal) — PENDENTE

**Recomendado antes de considerar a Fase 10 pronta para uso real do admin:** rodar os 10 passos numa sessão com acesso a navegador (`npm run dev` + `http://localhost:3000`), com atenção especial ao passo 4 (bloqueante por definição de fase) e ao passo 6 (única forma de observar o avanço real da sequência ao vivo, já que a Task 2 só prova a renderização estrutural, não o comportamento ponta a ponta no navegador).

## Decisions Made

Nenhuma decisão nova de produto nesta task — o indicador segue literalmente o `10-UI-SPEC.md` e os contratos já travados em `10-01`/`10-02`/`10-03`. Uma decisão técnica local: o gate de `npm run build` foi documentado como pendência de infraestrutura (ver seção dedicada acima), não revertido nem contornado com mudança de código.

## Deviations from Plan

None - plano executado exatamente como escrito. A única divergência do fluxo ideal é o gate de build não confirmado nesta sessão por limite de RAM do host, documentado extensivamente acima (não é uma mudança de escopo ou de código, apenas um resultado de comando não confirmado).

## Deferred Issues

| Item | Motivo | Ação recomendada |
|------|--------|-------------------|
| `npm run build` não confirmado (exit 0) nesta sessão | Host de 4GB RAM esgota memória durante a fase "Running TypeScript" do `next build`, mesmo com o dev server parado e após 3 tentativas (incluindo 1 com heap ampliado, que piorou o sintoma) | Rodar `npm run build` numa máquina com mais RAM antes de publicar/fazer deploy; não bloqueia uso local via `npm run dev` |
| `<human-check>` (10 passos) não executado | Sem acesso a navegador nesta sessão headless (mesma limitação de todo o histórico do projeto) | Rodar os 10 passos numa sessão com navegador antes de considerar a Fase 10 validada ponta a ponta pelo admin real |

## Issues Encountered

Nenhum além do gate de build documentado acima. `npx tsc --noEmit` e `npx eslint` (escopo restrito) ficaram limpos durante toda a execução — nenhuma iteração de erro de tipo ou lint nos arquivos desta task.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness

- Fase 10 (Sequência de Follow-up Escalonada) está funcionalmente completa: fundação de dados (10-01), avanço/reset (10-02), configuração de intervalos (10-03) e indicador visual (10-04) todos implementados e com gates estáticos/comportamentais verdes.
- Duas pendências carregadas para a próxima sessão com acesso a navegador: (1) `npm run build` numa máquina com mais RAM, (2) os 10 passos do `<human-check>` desta task — mesmo padrão de UAT pendente já usado em fases anteriores (04, 10-03), não é um bloqueio para o roadmap seguir (v1.3 continua para a Fase 11).
- Nenhum arquivo de schema, migração ou Server Action foi alterado nesta task — só componentes de apresentação e as duas rotas Server Component, exatamente como escopado pelo `<success_criteria>` do `10-04-PLAN.md`.

---
*Phase: 10-sequ-ncia-de-follow-up-escalonada*
*Completed: 2026-08-13*
