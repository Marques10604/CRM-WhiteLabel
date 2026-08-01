# Fase 8 — Decisões tomadas pela orquestração

## 2026-08-01 — Etapa 0-B (revisão de intenção), pergunta q2-csv-default-permanente

**Pergunta:** O wizard de importação CSV deveria ganhar um seletor por lote ("Este lote é Inbound ou Outbound?") em vez de manter o default fixo `origemTipo="outbound"` para todo import CSV?

**Opções consideradas:**
- Manter default fixo "outbound" para todo import CSV, sem exceção
- Adicionar seletor único por lote no wizard

**Escolha:** Manter default fixo "outbound" — nenhuma outra fonte de CSV está prevista em ROADMAP.md/REQUIREMENTS.md para v1.3 (o único uso real é o lote do cowork parceiro, sempre prospecção fria). Construir um seletor de UI agora seria escopo especulativo além do que o SPEC/Requirement 2 pedem.

**Por quê:** Mantém o escopo restrito ao que foi pedido; segue o princípio já documentado no projeto (CLAUDE.md) de não construir "for future-proofing" sem caso real. Troca é retrabalho pequeno e isolado (CSV_DEFAULTS/mapCsvRows) se/quando um caso real de CSV inbound aparecer.

**Como desfazer:** Se no futuro surgir uma fonte de CSV inbound real, adicionar o seletor é uma mudança isolada, sem impacto em dado já importado.
