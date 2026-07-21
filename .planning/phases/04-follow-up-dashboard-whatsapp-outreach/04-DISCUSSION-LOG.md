# Phase 4: Follow-up Dashboard & WhatsApp Outreach - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 4-follow-up-dashboard-whatsapp-outreach
**Areas discussed:** Dashboard vs lista atual, Sistema de templates, Botão de enviar inline + preview, Gatilho de 1º contato sem Fase 2 pronta

---

## Pré-discussão: Todo pendente

| Option | Description | Selected |
|--------|-------------|----------|
| Só templates de prova de valor | Inclui templates com placeholder de prova social na Fase 4; cadência escalonada fica para depois | ✓ |
| Dobrar tudo agora | Traz cadência escalonada configurável para dentro do planejamento da Fase 4 | |
| Adiar tudo | Deixa o todo inteiro pendente | |

**User's choice:** Só templates de prova de valor
**Notes:** A lógica de sugestão automática de cadência (+4/+10 dias) é mais complexa que o escopo atual da Fase 4 — deferida.

---

## Dashboard vs lista atual

| Option | Description | Selected |
|--------|-------------|----------|
| Substituir a lista em '/' | Painel de follow-ups vira a tela inicial; lista completa muda para /leads | ✓ |
| Ficar acima da lista atual | Bloco de destaque no topo de '/', tabela completa continua embaixo | |
| Nova aba/rota separada | Painel em rota própria, '/' continua como lista completa | |

**User's choice:** Substituir a lista em '/'

| Option | Description | Selected |
|--------|-------------|----------|
| Vencidos / Hoje / Próximos 7 dias | 3 seções por urgência | ✓ |
| Só uma lista única ordenada | Sem seções | |
| Vencidos vs Próximos (2 seções) | Mais simples | |

**User's choice:** Vencidos / Hoje / Próximos 7 dias

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem positiva + atalho | "Tudo em dia!" com CTA | ✓ |
| Mensagem simples, sem CTA | Só texto informativo | |

**User's choice:** Mensagem positiva + atalho

| Option | Description | Selected |
|--------|-------------|----------|
| /leads | Nome claro, consistente com /pipeline e /subnichos | ✓ |
| /todos-leads | Mais explícito em português | |

**User's choice:** /leads

| Option | Description | Selected |
|--------|-------------|----------|
| Só leads ativos, exclui Fechado/Perdido | Mesmo padrão isNull(deletedAt) + etapa terminal | ✓ |
| Todos os leads, sem exceção | Sem filtro | |

**User's choice:** Só leads ativos, exclui Fechado/Perdido

| Option | Description | Selected |
|--------|-------------|----------|
| Abre o modal de edição do lead | Mesmo padrão da lista/board | ✓ |
| Vai direto pro wa.me com o template | Pula edição | |

**User's choice:** Abre o modal de edição do lead

| Option | Description | Selected |
|--------|-------------|----------|
| "Follow-ups" (home) + "Leads" novo item | Renomeia item existente, adiciona novo | ✓ |
| Manter só "Leads" apontando pra '/' | Sem renomear | |

**User's choice:** "Follow-ups" (home) + "Leads" novo item

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar tudo, sem limite | CRM pessoal de poucos leads | ✓ |
| Limitar e linkar pra /leads | Paginação com "ver todos" | |

**User's choice:** Mostrar tudo, sem limite

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mostrar o badge de etapa | Reaproveita EtapaBadge | ✓ |
| Não, só nome/sub-nicho/data | Mais limpo | |

**User's choice:** Sim, mostrar o badge de etapa

**Notes:** Área explorada em profundidade (4 rodadas de perguntas) — decisão estrutural importante de mover a lista atual para uma nova rota.

---

## Sistema de templates

| Option | Description | Selected |
|--------|-------------|----------|
| 3 tipos: 1º contato, follow-up, prova de valor | Cobre roadmap + todo dobrado | ✓ |
| Lista livre sem categorias fixas | Sem categorização | |
| Só 2 tipos: 1º contato e follow-up | Escopo mínimo do roadmap | |

**User's choice:** 3 tipos: 1º contato, follow-up, prova de valor

| Option | Description | Selected |
|--------|-------------|----------|
| {nome} + {subnicho} | Caso de uso principal | |
| {nome} + {subnicho} + {origem} | Adiciona origem | ✓ |
| Só {nome} | Mínimo do roadmap | |

**User's choice:** {nome} + {subnicho} + {origem}

| Option | Description | Selected |
|--------|-------------|----------|
| Nova página /templates | Rota dedicada, CRUD | ✓ |
| Dentro de um modal/dialog | Sem rota própria | |

**User's choice:** Nova página /templates

| Option | Description | Selected |
|--------|-------------|----------|
| Admin marca 1 como padrão por tipo | Sistema usa automaticamente, trocável | ✓ |
| Sempre pede pra escolher | Sem automação | |
| Usa sempre o mais recente criado | Sem marcação explícita | |

**User's choice:** Admin marca 1 como padrão por tipo

| Option | Description | Selected |
|--------|-------------|----------|
| Exclusão direta, sem histórico | Sem soft-delete | ✓ |
| Soft-delete como os leads | Padrão lixeira | |

**User's choice:** Exclusão direta, sem histórico

---

## Botão de enviar inline + preview

| Option | Description | Selected |
|--------|-------------|----------|
| Painel de follow-ups + card do pipeline | Cobre WA-05 literalmente | ✓ |
| Só dentro do modal de edição | Mais simples, foge do WA-05 | |

**User's choice:** Painel de follow-ups + card do pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Abre preview da mensagem antes | WA-03, evita erro | ✓ |
| Vai direto pro wa.me, sem preview | Mais rápido | |

**User's choice:** Abre preview da mensagem antes

| Option | Description | Selected |
|--------|-------------|----------|
| Pode editar livremente antes de enviar | Textarea editável | ✓ |
| Só visualiza, não edita | Read-only | |

**User's choice:** Pode editar livremente antes de enviar

| Option | Description | Selected |
|--------|-------------|----------|
| Preview mostra um seletor de tipo | Dropdown pra trocar tipo | ✓ |
| Botão único, sempre usa o mesmo tipo por contexto | Fixo por local | |

**User's choice:** Preview mostra um seletor de tipo

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre aparece, independente do canal | Canal não é exclusivo | ✓ |
| Só aparece se canal=WhatsApp | Respeita canal estritamente | |

**User's choice:** Sempre aparece, independente do canal

| Option | Description | Selected |
|--------|-------------|----------|
| Botão desabilitado com aviso | Tooltip explicando telefone inválido | ✓ |
| Botão oculto nesse caso | Sem mensagem | |

**User's choice:** Botão desabilitado com aviso

---

## Gatilho de 1º contato sem Fase 2 pronta

| Option | Description | Selected |
|--------|-------------|----------|
| Disparar também ao criar lead manualmente | Entrega valor já, reutilizável quando Fase 2 existir | ✓ |
| Adiar o gatilho inteiro pra quando a Fase 2 existir | Só fluxo manual por enquanto | |

**User's choice:** Disparar também ao criar lead manualmente

| Option | Description | Selected |
|--------|-------------|----------|
| Preview do WhatsApp já abre automaticamente | Modal aparece pronto pra confirmar | ✓ |
| Toast/notificação com botão | Não interrompe o admin | |

**User's choice:** Preview do WhatsApp já abre automaticamente

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, lead fica salvo de qualquer forma | Preview é só sugestão | ✓ |
| Pergunta confirmação antes de descartar | Avisa antes de fechar | |

**User's choice:** Sim, lead fica salvo de qualquer forma

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, sempre dispara | Simples e previsível | ✓ |
| Só dispara se o admin marcar uma opção | Checkbox configurável | |

**User's choice:** Sim, sempre dispara

---

## Claude's Discretion

- Exact reuse mechanism connecting the manual-creation trigger to a future Phase-2 import-triggered flow — should be a shared/reusable function, not hard-coupled to manual creation only.
- wa.me URL encoding technical details (accents, emoji, line breaks).
- Visual styling specifics beyond existing UI-SPEC conventions from Phases 1 and 3.

## Deferred Ideas

- Escalating follow-up cadence (auto-scheduling next follow-up date at +4/+10 day intervals) — from `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md`, explicitly deferred to a future phase; only its template-with-value-proof aspect was folded into Phase 4.
- Phase 2 (CSV Bulk Import) itself remains unbuilt — Phase 4's import-triggered outreach (WA-04) is satisfied via the manual-creation trigger for now, expected to be reused when Phase 2 ships.
