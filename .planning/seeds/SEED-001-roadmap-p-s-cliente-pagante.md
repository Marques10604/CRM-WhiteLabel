---
id: SEED-001
status: dormant
planted: 2026-08-01
planted_during: v1.2 Follow-up Automático (fechado, transição pra próximo milestone)
trigger_when: quando houver o primeiro cliente pagante usando o CRM (não o admin sozinho)
scope: medium
---

# SEED-001: Geração de proposta/orçamento a partir do lead, catálogo de produtos + histórico de pedidos por cliente, e pós-venda (renovação, NPS, chamados)

## Why This Matters

Construir "geração de proposta automática", "catálogo de produtos" ou
funcionalidades de pós-venda agora é apostar que o primeiro cliente vai
precisar exatamente disso, do jeito que foi imaginado hoje. Na prática, o
primeiro cliente real quase sempre pede algo um pouco diferente do
previsto — e aí o trabalho antecipado vira retrabalho.

A skill de proposta comercial que o usuário já tem funciona fora do
sistema (via conversa/documento) e já resolve o problema imediato sem
acoplar no código do CRM. Só vale trazer pra dentro do sistema quando um
cliente pagante pedir isso especificamente — aí se constrói pro caso real,
não pro caso imaginado.

Origem: sessão de varredura de ideias externa, 2026-08-01
(`C:\Users\Vencedor\Desktop\Ideias.txt`), bloco "ROADMAP FUTURO".

## When to Surface

**Trigger:** quando houver o primeiro cliente pagante usando o CRM (não só
o admin/usuário original)

Este seed vai surgir durante `/gsd-new-milestone` quando o escopo do novo
milestone mencionar clientes pagantes, monetização, ou expansão pra
terceiros.

## Scope Estimate

**Medium** — provavelmente vira 1-2 fases próprias quando chegar a hora
(proposta/orçamento é uma fase; catálogo+pedidos e pós-venda podem ser
outra, dependendo do que o cliente real pedir).

## Breadcrumbs

Nenhum arquivo de código relacionado ainda (funcionalidade não existe).
Relacionado a `.planning/PROJECT.md` seção "Out of Scope" (mensagem
gerada por IA — considerada e adiada pro v2) e à skill de proposta
comercial externa mencionada pelo usuário (fora do repositório do CRM).

## Notes

Ver também SEED-002 (infra white label) — mesmo gatilho geral ("cliente
pagante"), mas escopo de produto completamente diferente (este seed é
sobre *features dentro do CRM atual*; SEED-002 é sobre *transformar o CRM
num produto multi-tenant*). Não confundir os dois ao decidir prioridade.
