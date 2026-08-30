# Phase 12: Agenda / Tarefas Soltas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 12-agenda-tarefas-soltas
**Areas discussed:** Estado de conclusão, Distinção visual no dashboard, Ponto de criação, Campos da tarefa, Interação, Exclusão

---

## Estado de conclusão

| Option | Description | Selected |
|--------|-------------|----------|
| Marca como concluída | Checkbox/botão 'Concluir'; sai do agrupamento de urgência mas fica no banco; coluna `concluida`/`concluidaEm` | ✓ |
| Concluir = excluir | Botão 'Feito' apaga a tarefa; zero histórico, zero coluna de estado | |
| Sem estado — só excluir | Fica no dashboard até excluir na mão; nenhum conceito de 'concluída' | |

**User's choice:** Marca como concluída

### Pós-conclusão

| Option | Description | Selected |
|--------|-------------|----------|
| Some do dashboard | Sai das 3 seções na hora; reabrir via tela separada (fora de escopo) | ✓ |
| Fica riscada no lugar | Continua na seção com texto riscado + checkbox marcado | |
| Vai pra seção 'Concluídas' | 4ª seção colapsável no fim do dashboard | |

**User's choice:** Some do dashboard
**Notes:** Sem tela "Concluídas" nesta fase. Consequência: marcar errado = recriar.

---

## Distinção visual no dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Card enxuto + ícone | Só descrição + data + ícone de tarefa; sem sub-nicho/EtapaBadge/WhatsApp | ✓ |
| Mesmo card + badge 'Tarefa' | Mesmo layout, badge 'Tarefa' no lugar da EtapaBadge | |
| Cor de fundo/borda diferente | Fundo colorido ou borda tracejada | |

**User's choice:** Card enxuto + ícone

### Ordem dentro da seção

| Option | Description | Selected |
|--------|-------------|----------|
| Intercalados por data | Tudo junto, ordenado pela data (mais urgente primeiro) | ✓ |
| Tarefas primeiro, depois leads | Bloco de tarefas no topo da seção | |
| Leads primeiro, depois tarefas | Follow-ups de lead no topo, tarefas embaixo | |

**User's choice:** Intercalados por data

---

## Ponto de criação

| Option | Description | Selected |
|--------|-------------|----------|
| Botão 'Nova tarefa' ao lado de 'Novo lead' | Dois botões no topo; 'Nova tarefa' outline/secundário | ✓ |
| Um botão 'Novo' com dropdown | Menu: 'Novo lead' / 'Nova tarefa' | |
| Botão só na seção de tarefas | '+ tarefa' discreto no rodapé | |

**User's choice:** Botão 'Nova tarefa' ao lado de 'Novo lead'

---

## Campos da tarefa

| Option | Description | Selected |
|--------|-------------|----------|
| Descrição + data | Um campo de texto (serve de título) + date picker | ✓ |
| Título + descrição + data | Título curto no card + descrição longa opcional + data | |
| Descrição + data + hora | Igual ao recomendado + hora (agrupamento continua por dia) | |

**User's choice:** Descrição + data

---

## Interação (clicar na tarefa)

| Option | Description | Selected |
|--------|-------------|----------|
| Abre dialog de edição | Dialog próprio: editar descrição/data, botões Excluir e Concluir; + checkbox 'concluir' no card | ✓ |
| Só ações inline no card | Card não clicável; ícones no card (concluir/editar/excluir); editar inline | |

**User's choice:** Abre dialog de edição

---

## Exclusão

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-delete | Apaga a linha de vez; `tarefas` entra no guard-no-hard-delete como exceção documentada | ✓ |
| Soft-delete (vai pra Lixeira) | Coluna `deletedAt`, aparece na Lixeira, pode restaurar | |

**User's choice:** Hard-delete

---

## Claude's Discretion

- Formato exato do `TarefaFormDialog` (react-hook-form + zodResolver; date picker = mesmo do lead-form-dialog).
- Nome e shape das Server Actions (seguir `motivo-perda-actions.ts`).
- `groupLeadsByUrgency` generalizada vs função irmã genérica `groupByUrgency<T extends { date: Date }>`.
- Ícone lucide exato pra tarefa.

## Deferred Ideas

- Tela/lista de tarefas concluídas (histórico, reabrir).
- Hora na tarefa.
- Vincular tarefa a lead opcionalmente.
- Recorrência / subtarefas / prioridade / notificações — fora de escopo por REQUIREMENTS.md.
