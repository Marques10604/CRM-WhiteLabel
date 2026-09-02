---
phase: 18
phase_name: "Auditoria Retroativa no Navegador"
project: "CRM de Leads"
generated: "2026-09-02"
counts:
  decisions: 4
  lessons: 5
  patterns: 3
  surprises: 3
missing_artifacts: []
---

# Phase 18 Learnings: Auditoria Retroativa no Navegador

## Decisions

### Pivô de UAT-ao-vivo para verificação code+data (forçado por hardware)
O método planejado (clique real via extensão Chrome) foi abandonado depois que o host de 4GB
provou não comportar `npm run dev` + Chrome + a sessão Claude. Substituído por: leitura da
superfície (componente + Server Action + schema) + query só-SELECT no `data/crm.db` +
harnesses `test:*`/`verify:*`.

**Rationale:** RAM livre caiu a ~200 MB; screenshots e depois `javascript_tool` davam timeout;
matar o dev server só recuperou pra 430 MB. Não era ajustável pela técnica de preenchimento.
**Source:** 18-01-SUMMARY.md, 18-CONTEXT.md §D-01 revisado, decisão do usuário 2026-09-02

### Cenário só provável visualmente → `skipped`, não `pass` forçado
Fase 6 cenário 11 ("esfriando" + contador na mesma linha — layout) marcado `skipped` com
motivo "requer navegador; diferido". Os outros 10 da Fase 6 e todos os demais tinham prova
por código/dado.

**Rationale:** honestidade do artefato — `pass` só quando há evidência real (file:line +
query/teste). Renderização pura fica registrada no §Gaps de cada `HUMAN-UAT.md`.
**Source:** 06-HUMAN-UAT.md, 18-VERIFICATION.md §Método

### VERIFICATION.md promovido a `passed` com seção `## Método de Verificação` explícita
Cada `NN-VERIFICATION.md` (01/02 criados, 04/06/08 promovidos) diz no corpo que a prova foi
code+data, não navegador, e lista o que um pass de navegador ainda acrescentaria.

**Rationale:** o gate `human_needed` existe porque falta o clique real; promover sem esconder
que continua faltando. Decisão do usuário para uma ferramenta solo com código shipado + testado.
**Source:** 01/02/04/06/08-VERIFICATION.md

### Auditoria em 1 subagente, não 6 planos executados
Os 6 `18-0N-PLAN.md` foram escritos para o navegador. Em vez de fake-executá-los, um único
subagente de auditoria code+data produziu todos os artefatos (5 HUMAN-UAT + 5 VERIFICATION +
limpeza do STATE + 6 SUMMARY), commitando cada entregável.

**Rationale:** trabalho read-heavy, não browser — cabe num subagente de contexto fresco;
6 subagentes de execução seriam desperdício num host de 4GB.
**Source:** orquestração da Fase 18

## Lessons

### Host de 4GB não comporta dev server + navegador de verdade + sessão Claude
Medição concreta: `Win32_OperatingSystem.FreePhysicalMemory` = 204 MB de 4007 rodando os três.
Chrome swapado (WS de 5-18 MB). Qualquer fase que dependa de UAT no navegador está bloqueada
nesse host.

**Context:** Fase 18 inteira dependia disso. Ficou registrado no STATE §"COMEÇA AQUI" como
aviso permanente para as próximas fases (19 provavelmente também precisa de browser).
**Source:** 18-01-SUMMARY.md §Diagnóstico do host

### A extensão Chrome não preenche inputs de react-hook-form
`form_input` (já sabido) E `computer type` (novo) escrevem `""` — confirmado lendo `el.value`
via `javascript_tool`. `<Select>` do Base UI por clique também não seleciona. SÓ funciona
`javascript_tool` com `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`
+ `dispatchEvent('input'/'change')`. Combobox custom (com input escondido) funciona por clique.

**Context:** bloqueou os cenários de form da Fase 18 mesmo antes do problema de RAM. Feedback
enviado ao time do Claude Code.
**Source:** 18-01-SUMMARY.md §Diagnóstico da ferramenta

### "Autorar o UAT" e "executar o UAT" são fases de esforço bem diferentes
Fases 1 e 2 não tinham `HUMAN-UAT.md` — autorar 20 + 15 cenários derivando de SPEC/SUMMARYs
foi metade do trabalho. Fases 4/6/8 já tinham os cenários escritos (`status: partial`), só
faltava executar. O ROADMAP já tinha antecipado isso na divisão de ondas.

**Context:** 18-01/02 (autoria) vs 18-04/05/06 (só execução).
**Source:** 18-CONTEXT.md §D-02, ROADMAP Fase 18

### Código shipado + coberto por harness raramente revela bug numa auditoria retroativa
0 issues de runtime nas 5 fases. Os únicos "achados" eram gaps de code review já fechados
por quick tasks antigas (WR-03/08, WR-01/06). A auditoria valeu mais como fechamento formal
de débito de `VERIFICATION.md` do que como caça a bug.

**Context:** expectativa era "issue não-trivial → quick task" (SC#4); saiu zero.
**Source:** 18-VERIFICATION.md SC-4, os 5 SUMMARYs §Issues Encontradas

### `close-phase` Sub-rotina V precisa de um `NN-VERIFICATION.md` no dir da fase
Fase 18 é meta-verificação — sua "verificação" são os 5 `VERIFICATION.md` de outras fases.
Precisou de um `18-VERIFICATION.md` próprio (goal-backward contra os 5 SC da Fase 18) para o
`close-phase` não parar em "a fase 18 não foi verificada".

**Context:** mesmo padrão que pode reaparecer em fases de auditoria/limpeza futuras.
**Source:** close-phase workflow Sub-rotina V, 18-VERIFICATION.md

## Patterns

### Auditoria code+data de comportamento shipado: fonte + SELECT + harness
Para cada cenário: (1) achar o componente + Server Action + schema que implementam a regra;
(2) citar `arquivo:linha` da lógica; (3) rodar o harness que já cobre o caminho; (4) query
só-SELECT no banco real para o invariante de dados. Marca `(code+data)` vs `(live)`.

**When to use:** verificação retroativa quando o navegador não está disponível, ou como
camada base antes de um UAT de clique.
**Source:** os 5 `HUMAN-UAT.md` da Fase 18

### `HUMAN-UAT.md` com sufixo de método por cenário
Cada `result: pass` carrega `(code+data)` ou `(live)` no `evidence:`. O `## Método` do
frontmatter e o `## Método de Verificação` do `VERIFICATION.md` amarram o todo.

**When to use:** sempre que uma verificação mistura métodos (parte ao vivo, parte por proxy).
**Source:** 01-HUMAN-UAT.md, 18-VERIFICATION.md

### `VERIFICATION.md` de fase de auditoria = goal-backward contra os SC da própria fase de auditoria
Não é sobre "o código faz X" (isso está nos 5 sub-VERIFICATION); é "a auditoria entregou os
5 VERIFICATION passed + limpou o STATE + registrou os achados".

**When to use:** fases cujo deliverable são outros artefatos de planejamento.
**Source:** 18-VERIFICATION.md

## Surprises

### O pivô para code+data FORTALECEU o threat model em vez de enfraquecer
T-18-01/02 mitigavam o risco de sujar o `data/crm.db` com dados de teste do UAT ao vivo.
Verificação só-SELECT eliminou o caminho de escrita inteiro — `threats_open: 0` sem nenhuma
mitigação nova a implementar.

**Impact:** `/gsd-secure-phase` fechou por short-circuit; banco real com 23 leads ativos intactos.
**Source:** 18-SECURITY.md

### A tentativa de UAT ao vivo ainda rendeu 1 cenário verificado (o 4 da Fase 1)
Antes do renderer congelar de vez, deixei o form dirty e cliquei "Cancelar" → o dialog
"Descartar alterações?" apareceu com os dois botões. Único cenário `(live)` da fase.

**Impact:** o guard de discard-changes (D-04 da Fase 1) tem prova de navegador real; os
outros 54 cenários são code+data.
**Source:** 01-HUMAN-UAT.md cenário 4, 18-01-SUMMARY.md

### Navegar pela extensão precisou de ~6 tentativas antes de "pegar"
Sob pressão de RAM, `navigate` reportava sucesso mas a aba voltava para `chrome://newtab/`.
Só um `navigate` standalone (sem `tabId`) acabou funcionando — abriu 2 abas duplicadas.

**Impact:** ~10 min só pra conseguir uma aba estável em `/leads`. Registrado como parte do
diagnóstico de que o host não aguenta.
**Source:** 18-01-SUMMARY.md
