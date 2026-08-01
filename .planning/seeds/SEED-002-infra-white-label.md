---
id: SEED-002
status: dormant
planted: 2026-08-01
planted_during: v1.2 Follow-up Automático (fechado, transição pra próximo milestone)
trigger_when: só depois do primeiro cliente pagante — e mesmo assim, como decisão de "outro produto", não como fase do CRM atual
scope: large
---

# SEED-002: Infra white label (login/autenticação, multi-tenant, feature flags por nicho, nomenclatura dinâmica, theming, cobrança recorrente, agentes de IA por empresa)

## Why This Matters

Esta é a parte mais importante de toda a análise da varredura de ideias
externa (2026-08-01, `C:\Users\Vencedor\Desktop\Ideias.txt`), por isso
merece destaque: **multi-tenant, login, cobrança recorrente e white label
são decisões de arquitetura, não de feature.** Uma feature se adiciona e
convive com o resto. Arquitetura multi-tenant muda como todo dado é
gravado e lido — cada query do sistema passa a precisar saber "de qual
empresa é esse dado".

Fazer isso cedo demais, antes de saber que tipo de empresa vai usar (mesmo
nicho de saúde do usuário, ou nicho totalmente diferente tipo clínica/
oficina), significa construir uma estrutura genérica chutando o que vai
precisar — e normalmente chuta errado, porque cada nicho tem sua própria
lógica de "o que é um lead" (pra clínica é paciente, pra oficina é ordem
de serviço).

**Ordem interna rígida quando (e se) este seed for ativado** — não pode
ser embaralhada, cada etapa depende da anterior:
1. Login/autenticação — alicerce; sem ele não existe "separação de quem vê o quê"
2. Multi-tenant — só faz sentido depois que existe conceito de "usuário logado pertence a uma empresa"
3. Feature flags por nicho — pressupõe que já dá pra saber quem é a empresa X
4. Nomenclatura dinâmica ("Lead" → "Paciente") — só faz sentido dentro de um módulo já ativado pro nicho certo
5. Theming (visual, logo, cor) — cosmético, só entra depois que a estrutura de dados já aguenta múltiplas empresas
6. Cobrança recorrente — só faz sentido quando o produto já é vendável de verdade pra múltiplas empresas isoladas
7. Agentes de IA por empresa — topo da pirâmide, precisa saber "de qual empresa, com qual contexto, falando de qual nicho"

**A única exceção que vale fazer AGORA, fora deste seed:** evitar cravar
termos específicos do nicho de saúde direto no schema do banco (nomes de
campo genéricos em vez de nomes do nicho atual) — custa literalmente zero
esforço hoje, mas evita reescrita de banco inteira se um dia isso virar
white label. Registrado como convenção permanente em `PROJECT.md`
Constraints, não como item deste seed.

## When to Surface

**Trigger:** só depois do primeiro cliente pagante — e mesmo assim, tratar
como decisão de iniciar **outro produto** (multi-tenant/SaaS), não como
uma fase do CRM pessoal atual. Este seed é propositalmente de baixa
prioridade e alto custo de adiantamento.

Este seed vai surgir durante `/gsd-new-milestone` quando o escopo do novo
milestone mencionar multi-usuário, SaaS, clientes múltiplos, ou white
label.

## Scope Estimate

**Large** — múltiplas fases, possivelmente um projeto/repositório separado
do CRM atual (ver `CLAUDE.md`: "Building a REST API layer 'for
future-proofing'" e "Full auth system... for a single admin" já estão
listados como explicit non-requirements do projeto atual).

## Breadcrumbs

Nenhum arquivo de código relacionado (funcionalidade não existe e não deve
ser antecipada). Relacionado a `CLAUDE.md` seção "What NOT to Use" (auth
completo pra single admin listado como over-engineering) e ao `PROJECT.md`
"Out of Scope" (múltiplos usuários/equipe).

## Notes

Ver também SEED-001 (roadmap pós-cliente pagante) — mesmo gatilho geral,
mas escopo de produto completamente diferente. SEED-001 é sobre features
dentro do CRM pessoal atual; este seed é sobre transformar o projeto num
produto multi-tenant vendável — uma decisão de negócio muito maior, não
uma extensão natural do CRM de hoje.
