---
created: 2026-08-01T18:48:32.927Z
title: "Campo de vendedor responsável no banco (só a coluna, sem UI ainda)"
area: database
priority: "NOVAS IDEIAS PME — avaliar prioridade, não urgente (varredura 2026-08-01)"
files:
  - src/db/schema.ts
---

## Problem

Não existe hoje um campo indicando qual vendedor/admin é responsável por um
lead. Como o CRM é single-admin hoje, não há UI urgente pra isso — mas
adicionar a coluna agora custa poucos minutos; adicionar depois, com dados
de produção reais, custa migração e risco de quebrar coisa existente.

## Solution

**Diferente dos outros itens desta lista: a recomendação explícita da
varredura é fazer só a coluna no schema agora (nullable, sem UI, sem uso),
não esperar virar fase própria.** Mesmo princípio de "não cravar nicho no
schema" — mexer estrutura de dados é sempre mais barato antes de ter dado
real dentro.

Quando pegar esse todo: adicionar coluna `vendedor` (ou nome similar
genérico) nullable em `leads`, sem nenhuma tela/formulário exibindo ou
editando o campo ainda.
