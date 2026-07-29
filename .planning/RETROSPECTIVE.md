# Project Retrospective

*Documento vivo, atualizado após cada milestone. As lições alimentam o planejamento seguinte.*

## Milestone: v1.0 — MVP

**Shipado:** 2026-07-29
**Fases:** 4 | **Planos:** 15 | **Sessões:** múltiplas, entre 2026-07-19 e 2026-07-29 (10 dias)

### O que foi construído
- Fundação de leads + sub-nichos: CRUD completo, lista filtrável/ordenável/paginada, soft-delete recuperável (Fase 1)
- Importação de CSV em lote do cowork: detecção automática de separador/codificação pt-BR, mapeamento de colunas, prévia com flags de duplicado, tela pós-importação por lote (Fase 2)
- Funil de vendas Kanban: 5 etapas, drag-and-drop, destaque de leads "esfriando" (Fase 3)
- Dashboard de follow-ups por urgência como tela inicial + templates de WhatsApp com envio via link `wa.me` e auto-sugestão no primeiro contato (Fase 4)

### O que funcionou bem
- Padrão de soft-delete (`deletedAt` nullable + guard automatizado `npm run guard:no-hard-delete`) aplicado de forma consistente em leads (Fase 1) e depois reaproveitado sem retrabalho em sub-nichos (quick task 260725-lai)
- Corrigir bugs reais descobertos em uso ao vivo (telefone com DDI estrangeiro, sub-nicho ausente no CSV real) direto no código, sem o pipeline completo de planner/executor, quando a mudança era pequena e bem entendida — resolveu bloqueios reais de prospecção rapidamente
- Recuperar trabalho de worktrees órfãos/interrompidos (processo morto por OOM) revisando linha a linha antes de mesclar, em vez de descartar o progresso

### O que foi ineficiente
- Host de desenvolvimento com 4GB de RAM causou múltiplos crashes por falta de memória (build + dev server simultâneos, executores isolados em worktree) — custou tempo real de sessão recuperando trabalho interrompido pelo menos duas vezes (recuperação 02-02, quick task 260725-lai)
- O `<human-check>` de clique real no navegador foi pulado em praticamente todo plano das 4 fases por falta de acesso a browser no executor headless — só a Fase 3 chegou a ter verificação formal (`03-VERIFICATION.md`, `passed`, verificável só por código). Fases 1 e 2 nunca tiveram `/gsd-verify-work` rodado; a Fase 4 fechou com 7 cenários de UAT ainda pendentes. Esse débito se acumulou fase a fase em vez de ser resolvido cedo.
- Uma mesma classe de falso-positivo (checkers baseados em grep ingênuo) apareceu pelo menos 3 vezes neste milestone: o Decision Coverage Gate (forma `(D-05)` vs. `D-05:` com dois-pontos), o `guard:no-hard-delete` (comentário citando a string proibida como texto), e a auditoria de fechamento de milestone (`audit-open` sinalizando quick tasks como incompletos por falta de um campo `status:` que quick tasks normais nunca preenchem)

### Padrões estabelecidos
- Soft-delete via coluna `deletedAt` nullable + guard de script, aplicado a toda entidade removível — nunca hard-delete
- Execução sempre sequencial (nunca paralela/background) neste host específico, por causa da RAM limitada — inclui desligar `workflow.use_worktrees`
- Ao esconder registros removidos, filtrar só nas superfícies de SELEÇÃO (combobox, dropdown de filtro), nunca nas queries de listagem/exibição que resolvem o mapa id→nome de registros já existentes

### Lições principais
1. Em hosts com pouca memória, desligar o isolamento de worktree (`workflow.use_worktrees: false`) proativamente, em vez de descobrir o OOM na marra
2. Quando um checker baseado em grep (guard, decision coverage, audit-open) sinaliza um problema, verificar manualmente antes de confiar — falsos positivos de correspondência ingênua de string já se repetiram várias vezes neste projeto
3. Dados do mundo real (um CSV de verdade do cowork, uma sessão de prospecção ao vivo) revelam casos extremos (telefone com DDI estrangeiro, coluna de sub-nicho ausente) que nenhum planejamento antecipa sozinho — vale manter um caminho rápido pra fixes pontuais e bem entendidos sem abandonar a disciplina de planejamento para mudanças maiores
4. A verificação via navegador (`<human-check>`/UAT) foi adiada em quase todo plano por falta de acesso a browser no ambiente de execução — esse débito precisa de uma resolução deliberada (browser real, `/gsd-verify-work` dedicado) antes que cresça mais do que dá pra recuperar manualmente depois

### Observações de custo
- Mix de modelo: não medido diretamente nesta sessão (sem telemetria de tokens coletada ao longo do milestone)
- Sessões: múltiplas, ao longo de 10 dias corridos (2026-07-19 → 2026-07-29)
- Notável: os 3 fixes pontuais de CSV import (telefone/sub-nicho) foram feitos deliberadamente fora do pipeline completo (sem gsd-planner/gsd-executor) para economizar tokens em mudanças pequenas já bem compreendidas — trade-off consciente entre rigor e velocidade

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessões | Fases | Mudança-chave |
|-----------|---------|-------|----------------|
| v1.0 | múltiplas (10 dias) | 4 | Primeiro milestone — estabeleceu soft-delete, execução sequencial (host 4GB) e o padrão de filtro só-em-seleção |

### Cumulative Quality

| Milestone | Testes | Cobertura | Zero-Dep Additions |
|-----------|--------|-----------|---------------------|
| v1.0 | 0 (sem suíte automatizada formal) | — | 0 pacotes novos além do scaffold inicial |

### Top Lessons (Verified Across Milestones)

1. Em host de 4GB, execução sequencial e worktrees desligados evitam OOM — confirmado repetidamente no v1.0
2. Checkers baseados em grep ingênuo geram falsos positivos com frequência neste projeto — sempre verificar manualmente antes de agir sobre o alerta
