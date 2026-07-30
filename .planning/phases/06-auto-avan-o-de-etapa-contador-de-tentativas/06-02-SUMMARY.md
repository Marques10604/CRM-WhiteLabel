---
phase: 06-auto-avan-o-de-etapa-contador-de-tentativas
plan: 02
subsystem: ui
tags: [react, server-actions, sonner, whatsapp, pipeline]

requires:
  - phase: 06-01
    provides: "registerWhatsAppContact(leadId, tipo) => { advanced: boolean } em src/actions/lead-actions.ts; leads.contactAttempts (NOT NULL DEFAULT 0)"
provides:
  - "Disparo fire-and-forget de registerWhatsAppContact no onClick real de 'Abrir WhatsApp' em whatsapp-preview-dialog.tsx, cobrindo as 5 telas que reusam esse dialog (dashboard, pipeline, lista de leads, pós-importação, auto-gatilho de 1º contato)"
  - "Toast personalizado '{Nome} avançou para Contatado.' quando o servidor retorna advanced=true (D-07/WA-06)"
  - "Indicador MessageCircle + '{n}x' no card do pipeline, cor neutra, visível só quando contactAttempts > 0 (D-05/D-06/WA-08)"
affects: []

tech-stack:
  added: []
  patterns:
    - "Mutação de servidor fire-and-forget no onClick de um <a href> real, sem preventDefault/await/window.open — a navegação nativa nunca é interceptada, o resultado só alimenta um toast opcional depois"
    - "Indicador condicional no card do pipeline espelhando exatamente o padrão já estabelecido pelo badge 'Esfriando' (mesmo <div> de metadados, mesmo size-3.5, cor herdada do pai)"

key-files:
  created: []
  modified:
    - src/components/whatsapp-preview-dialog.tsx
    - src/components/pipeline-lead-card.tsx

key-decisions:
  - "Comentário de bloco acima do anchor evita os literais 'preventDefault'/'window.open' para não colidir com o gate de grep da própria task (que não filtra comentários nesse check específico) — reescrito para citar o comportamento sem repetir os tokens proibidos"
  - "Dev server local (porta 3000) foi parado antes de 'npm run build' e reiniciado em background logo depois, preservando a convenção do host de 4GB (build e dev server nunca simultâneos) sem deixar o servidor do usuário fora do ar ao final da execução"

requirements-completed: [WA-06, WA-08]

duration: ~20min
completed: 2026-07-30
---

# Phase 6 Plan 2: Ligação da camada de servidor à UI (auto-avanço + contador) Summary

**onClick do anchor "Abrir WhatsApp" dispara `registerWhatsAppContact` fire-and-forget com toast de auto-avanço; card do pipeline exibe `MessageCircle` + "{n}x" neutro quando o contador é maior que 0.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-30T12:54:05Z
- **Completed:** 2026-07-30T13:05:18Z
- **Tasks:** 2 completadas
- **Files modified:** 2

## Accomplishments

- O único anchor `wa.me` real do app (`whatsapp-preview-dialog.tsx`, compartilhado por dashboard, pipeline, lista de leads, pós-importação e o auto-gatilho de 1º contato) agora dispara `registerWhatsAppContact(leadId, tipo)` no clique real em "Abrir WhatsApp", usando o estado vivo `tipo` do Select (nunca `defaultTipo`) — cobrindo WA-06/WA-08 em todas as 5 telas sem tocar nenhum dos 5 chamadores.
- Toast "{Nome} avançou para Contatado." (D-07) aparece somente quando o servidor confirma `advanced: true`; falha de rede/servidor é silenciosa (`.catch(() => {})`), nunca gera erro sobre uma aba do WhatsApp que já abriu.
- Card do pipeline exibe `MessageCircle` + "{n}x" em `text-muted-foreground` (cor neutra, herdada do `<div>` pai — nunca âmbar/teal), na mesma linha de metadados do indicador "Esfriando", só quando `contactAttempts > 0` (D-05/D-06).

## Task Commits

1. **Task 1: Disparo fire-and-forget da mutação + toast de auto-avanço no anchor do dialog** - `0421b1a` (feat)
2. **Task 2: Indicador do contador de tentativas no card do pipeline** - `a3e6045` (feat)

## Files Created/Modified

- `src/components/whatsapp-preview-dialog.tsx` - `onClick` do `<a href={waHref}>` chama `registerWhatsAppContact(leadId, tipo)` fire-and-forget (imports novos: `toast` de `sonner`, `registerWhatsAppContact` de `@/actions/lead-actions`); `.then()` dispara o toast de auto-avanço; `.catch(() => {})` silencioso; `href`/`target`/`rel`/`className` do anchor intocados
- `src/components/pipeline-lead-card.tsx` - import `MessageCircle` adicionado a `lucide-react`; novo `<span>` condicional (`lead.contactAttempts > 0`) na linha de metadados, ao lado do indicador "Esfriando" existente

## Decisions Made

- Comentário de bloco acima do anchor foi redigido para descrever o comportamento fire-and-forget sem repetir os literais `preventDefault`/`window.open` — a primeira redação continha esses tokens dentro de crases explicativas e disparava falsamente o gate de verificação da própria task (que checa a ausência desses padrões no arquivo inteiro, sem excluir comentários). Reescrito mantendo o mesmo significado (Pitfall 2 do RESEARCH), sem os literais.
- Servidor de dev (porta 3000, processo anterior à sessão) foi parado antes de `npm run build` e reiniciado em background (`nohup npm run dev &`) logo após o build terminar — segue a instrução de verificação da fase ("dev server parado antes do build — host de 4GB") sem deixar o ambiente do usuário fora do ar ao término da execução.

## Deviations from Plan

None - plano executado exatamente como escrito. O único ajuste foi de redação de comentário (não de comportamento/código), descrito acima em Decisions Made.

## Issues Encountered

- `npm run lint` no arquivo `whatsapp-preview-dialog.tsx` reporta 1 erro pré-existente (`react-hooks/set-state-in-effect`, linha do `useEffect` de reset de `tipo`/`texto`) — confirmado via `git stash`/lint/`git stash pop` que o erro já existia **antes** desta plano tocar o arquivo (linha 78 antes, linha 80 depois, mesmo erro, nenhuma linha nova envolvida). Já documentado em `06-01-SUMMARY.md` como débito pré-existente vindo de fases anteriores. Fora de escopo por Scope Boundary do executor — não corrigido aqui. `npx eslint` no arquivo `pipeline-lead-card.tsx` (Task 2) não reportou nenhum erro.

## User Setup Required

None - nenhuma configuração de serviço externo necessária.

## Verificação Automatizada

- `npx tsc --noEmit` — limpo (após Task 1 e após Task 2)
- `npm run lint` (escopado aos 2 arquivos via `npx eslint`) — 1 erro pré-existente não relacionado a esta fase (ver Issues Encountered); nenhum erro novo introduzido
- `node scripts/verify-wa-contact-invariant.cjs` — `OK` nas 3 asserções (tabela-verdade 15/15, acumulação/gate)
- Todos os gates de `grep` das Tasks 1 e 2 (contagens exatas de `registerWhatsAppContact(leadId, tipo)`, `defaultTipo`, `rel="noopener noreferrer"`, ausência de `preventDefault`/`window.open`/`await registerWhatsAppContact`, texto do toast, `.catch(`, `contactAttempts`, `MessageCircle`, `size-3.5`, `text-[#B45309]`) — todos com os valores esperados
- `npm run build` — completou sem erro, rodado com o dev server parado (host de 4GB); dev server reiniciado em background logo depois

## Verificação Manual (`<human-check>` da fase) — NÃO EXECUTADA

**Nenhum dos 11 cenários de `<human-check>` da fase foi clicado no navegador nesta sessão** — este agente não tem acesso a navegador, mesma limitação documentada em todo `SUMMARY.md` anterior do projeto (Fases 1, 2, 4, e agora 6). Pendente antes de considerar a Fase 6 pronta para uso real:

1. Pipeline → lead "Novo" → "1º contato" → "Abrir WhatsApp" → esperado: aba abre, toast de avanço, card migra pra Contatado com "1x"
2. Mesmo lead (Contatado) → repetir "1º contato" → esperado: sem toast, etapa mantida, contador "2x"
3. Lead em Negociação → "1º contato" → esperado: etapa inalterada, contador incrementa
4. Abrir e cancelar (botão/Escape/clique fora) → esperado: contador e etapa inalterados, sem toast
5. Dashboard: lead Novo aberto com "Follow-up", trocar para "1º contato" antes de enviar → esperado: avança com toast
6. Dashboard: lead Novo, manter "Follow-up", enviar → esperado: não avança, sem toast, contador incrementa
7. `/leads`: enviar "1º contato" → esperado: toast com nome correto, etapa atualizada na tabela
8. Criar lead novo (auto-gatilho de 1º contato) e fechar sem enviar → esperado: contador em 0
9. Importar CSV, `/importar/[batchId]`, "Abrir WhatsApp" → esperado: aba abre, card do pipeline mostra "1x" e Contatado
10. Card com contador 0 → esperado: nenhum ícone/número extra (D-06)
11. Card "Esfriando" + contador > 0 simultâneos → esperado: ambos na mesma linha, sem quebra de layout, cores distintas (âmbar vs. neutro)

Recomendação: rodar este click-through real antes de tratar a Fase 6 (WA-06/WA-07/WA-08) como validada em produção — mesmo débito histórico já registrado em `STATE.md` para as Fases 1/2/4.

## Next Phase Readiness

- WA-06 e WA-08 têm código completo e verificado automaticamente (tsc/lint/build/invariante). WA-07 (nunca regride/re-avança) já foi coberto pelo gate server-side do plano 06-01 e reconfirmado pelo script de invariante nesta sessão.
- Nenhum bloqueador técnico para a Fase 7 (Configuração de dias-parado por etapa) — independente desta fase, sem arquivos/migração compartilhados.
- Débito acumulado: a Fase 6 inteira (06-01 + 06-02) segue sem nenhum click-through real de navegador — ver lista acima.

---
*Phase: 06-auto-avan-o-de-etapa-contador-de-tentativas*
*Completed: 2026-07-30*

## Self-Check: PASSED

Arquivos confirmados presentes em disco: `src/components/whatsapp-preview-dialog.tsx`, `src/components/pipeline-lead-card.tsx`, `06-02-SUMMARY.md`. Todos os 3 hashes de commit (`0421b1a`, `a3e6045`, `84b67a8`) confirmados presentes em `git log --oneline --all`.
