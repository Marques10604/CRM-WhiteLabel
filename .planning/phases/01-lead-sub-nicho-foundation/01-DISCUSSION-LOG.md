# Phase 1: Lead & Sub-nicho Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 01-lead-sub-nicho-foundation
**Areas discussed:** Layout do formulário de lead, Colunas da lista de leads, Navegação — Sub-nichos e Lixeira, Etapa sem o board, Gerenciamento de sub-nichos, Estado vazio da lista, Texto de confirmação de exclusão, Local dos filtros, Select de sub-nicho, Fechar sem salvar, Paginação, Tela inicial, Ações por linha

---

## Layout do formulário de lead

| Option | Description | Selected |
|--------|-------------|----------|
| Modal/dialog sobre a lista | Abre por cima da lista sem sair da tela | ✓ |
| Página própria (/leads/novo) | Navega para URL dedicada | |

**User's choice:** Modal/dialog sobre a lista
**Notes:** Recomendado, escolhido para uso repetitivo rápido.

| Option | Description | Selected |
|--------|-------------|----------|
| Seções agrupadas | Campos agrupados em Contato/Negócio/Acompanhamento | ✓ |
| Lista única sem agrupamento | Sequência simples de campos | |

**User's choice:** Seções agrupadas

---

## Colunas da lista de leads

| Option | Description | Selected |
|--------|-------------|----------|
| Nome, Sub-nicho, Etapa, Follow-up, Telefone | 5 colunas essenciais | ✓ |
| Nome, Sub-nicho, Etapa, Follow-up, Valor | Prioriza valor sobre telefone | |

**User's choice:** Nome, Sub-nicho, Etapa, Follow-up, Telefone

| Option | Description | Selected |
|--------|-------------|----------|
| Abre o modal de edição | Mesmo modal do cadastro, pré-preenchido | ✓ |
| Expande a linha inline | Linha se expande na própria tabela | |

**User's choice:** Abre o modal de edição

---

## Navegação — Sub-nichos e Lixeira

| Option | Description | Selected |
|--------|-------------|----------|
| Menu lateral fixo | Sidebar com Leads, Sub-nichos, Lixeira sempre visíveis | ✓ |
| Dentro de "Configurações" | Agrupado em menu secundário | |

**User's choice:** Menu lateral fixo

| Option | Description | Selected |
|--------|-------------|----------|
| Instantânea | Botão restaurar executa na hora | ✓ |
| Pede confirmação | Mesmo modal usado para excluir | |

**User's choice:** Instantânea (para restaurar da Lixeira)

---

## Etapa sem o board (Fase 3 ainda não existe)

| Option | Description | Selected |
|--------|-------------|----------|
| Badge colorido | Cor por etapa, reaproveitável no board da Fase 3 | ✓ |
| Texto simples | Sem cor ou destaque | |

**User's choice:** Badge colorido

| Option | Description | Selected |
|--------|-------------|----------|
| Uma etapa só, como no roadmap | Fechado/Perdido continua único valor | ✓ |
| Separar em duas etapas | Mudaria o que está travado no SPEC.md | |

**User's choice:** Uma etapa só, como no roadmap

---

## Gerenciamento de sub-nichos

| Option | Description | Selected |
|--------|-------------|----------|
| Edição inline na lista | Lápis vira texto editável, "+ Adicionar" na lista | ✓ |
| Modal para criar/editar | Diálogo separado só com campo nome | |

**User's choice:** Edição inline na lista

---

## Estado vazio da lista

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem + botão "Novo lead" | CTA explicativo | ✓ |
| Só tabela vazia | Sem mensagem especial | |

**User's choice:** Mensagem + botão "Novo lead"

---

## Texto de confirmação de exclusão

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mostra o nome | "Tem certeza que deseja excluir [Nome]?" | ✓ |
| Não, mensagem genérica | Sem citar o nome | |

**User's choice:** Sim, mostra o nome

---

## Local dos filtros

| Option | Description | Selected |
|--------|-------------|----------|
| Barra fixa acima da tabela | 3 filtros sempre visíveis | ✓ |
| Painel que abre/fecha | Botão "Filtros" abre painel | |

**User's choice:** Barra fixa acima da tabela

---

## Select de sub-nicho no formulário

| Option | Description | Selected |
|--------|-------------|----------|
| Lista com busca | Combobox, prepara para lista maior | ✓ |
| Lista suspensa simples | Select padrão sem busca | |

**User's choice:** Lista com busca

---

## Fechar modal sem salvar

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, avisa | Aviso "Descartar alterações?" | ✓ |
| Não, fecha direto | Descarta sem aviso | |

**User's choice:** Sim, avisa

---

## Paginação

| Option | Description | Selected |
|--------|-------------|----------|
| Paginação clássica, 25 por página | Controles de próxima/anterior, via @tanstack/react-table | ✓ |
| Scroll infinito | Carrega mais ao rolar | |
| Lista completa sem paginação | Todos os leads de uma vez | |

**User's choice:** Paginação clássica, 25 por página

---

## Tela inicial (rota "/")

| Option | Description | Selected |
|--------|-------------|----------|
| Lista de leads direto | Sem tela intermediária | ✓ |
| Tela de boas-vindas simples | Links para Leads/Sub-nichos | |

**User's choice:** Lista de leads direto

---

## Ações por linha (editar/excluir)

| Option | Description | Selected |
|--------|-------------|----------|
| Ícones diretos na linha | Um clique | ✓ |
| Menu "…" (três pontinhos) | Ações escondidas | |

**User's choice:** Ícones diretos na linha

---

## Claude's Discretion

- Cores exatas de cada badge de etapa
- Texto/wording exato das notificações toast (sonner)
- Ordem dos campos dentro de cada seção do formulário
- Estados visuais de loading/submitting

## Deferred Ideas

None — discussion stayed within phase scope.
