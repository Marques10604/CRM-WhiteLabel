# Fase 8 — Decisões tomadas pela orquestração

## 2026-08-01 — Etapa 0-B (revisão de intenção), pergunta q2-csv-default-permanente

**Pergunta:** O wizard de importação CSV deveria ganhar um seletor por lote ("Este lote é Inbound ou Outbound?") em vez de manter o default fixo `origemTipo="outbound"` para todo import CSV?

**Opções consideradas:**
- Manter default fixo "outbound" para todo import CSV, sem exceção
- Adicionar seletor único por lote no wizard

**Escolha:** Manter default fixo "outbound" — nenhuma outra fonte de CSV está prevista em ROADMAP.md/REQUIREMENTS.md para v1.3 (o único uso real é o lote do cowork parceiro, sempre prospecção fria). Construir um seletor de UI agora seria escopo especulativo além do que o SPEC/Requirement 2 pedem.

**Por quê:** Mantém o escopo restrito ao que foi pedido; segue o princípio já documentado no projeto (CLAUDE.md) de não construir "for future-proofing" sem caso real. Troca é retrabalho pequeno e isolado (CSV_DEFAULTS/mapCsvRows) se/quando um caso real de CSV inbound aparecer.

**Como desfazer:** Se no futuro surgir uma fonte de CSV inbound real, adicionar o seletor é uma mudança isolada, sem impacto em dado já importado.

## 2026-08-06 10:03 — Etapa 2.3 (planejamento), gate de UI-SPEC do gsd-plan-phase

**Pergunta:** o ROADMAP.md marca a Fase 8 com "UI hint: yes" (novo campo `origemTipo` no formulário de lead) e `workflow.ui_safety_gate: true` está ligado no projeto; sem `08-UI-SPEC.md` na phase_dir, o `gsd-plan-phase` parou antes de despachar research/planner perguntando se deveria gerar o design contract formal (`/gsd-ui-phase 8`) ou pular (`--skip-ui`) e planejar direto.

**Opções consideradas:**
- Pular UI-SPEC (`--skip-ui`) e planejar direto
- Rodar `/gsd-ui-phase 8` primeiro (caminho padrão do workflow para fases com indicador de UI)

**Escolha:** Pular UI-SPEC (`--skip-ui`).

**Por quê:** o `08-CONTEXT.md` já funciona como um design contract de facto para este campo único — decisões D-01 a D-05, todas ancoradas ao padrão exato do componente `CANAL_OPTIONS`/Controller+Select já usado por `canal` em `lead-form-dialog.tsx` (mesma posição, mesmos rótulos "Inbound"/"Outbound", sem pré-seleção, sem badge novo), já revisadas pela revisão adversarial de intenção (Etapa 0-B, achado #9 sobre ausência de badge, descartado como não-bloqueador). Não há ambiguidade visual/interação restante que um UI-SPEC.md formal resolveria — gerar um agora tenderia a redigitar as mesmas 5 decisões já commitadas. Também consistente com a própria invocação desta rodada da `/go-and-do 8` (sem a flag `--ui`), que já assumia não precisar do contrato de design formal.

**Como desfazer:** rodar `/gsd-ui-phase 8` a qualquer momento depois é possível e não desfaz nada; se um UI-SPEC.md gerado depois divergir do que foi planejado, o replan fica isolado a este campo.
