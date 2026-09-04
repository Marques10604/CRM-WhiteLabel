# Requirements: CRM de Leads

**Defined:** 2026-09-04
**Milestone:** v1.7 Exploração de Nicho
**Core Value:** Nunca mais perder um follow-up e enxergar o funil de vendas de relance — substituindo a planilha do Google Sheets.

## v1.7 Requirements

Dar ao CRM o objeto de 1ª classe que é o diferencial real do produto: a **campanha de exploração
de nicho**, com diagnóstico de IA anti-genérico, veredito registrado pelo usuário, e o loop de
resultado real fechando com o que o CRM já calcula em `/relatorios`. Zero WhatsApp, zero VPS,
zero infra nova — a parte de IA usa um modelo com busca na web (framework a decidir na fase).

Escopo definido em conversa (2026-09-04): 3 dúvidas do usuário sobre diferencial/Meta/fusão com o
Prospector respondidas em `.planning/DIRECAO-v1.7-2026-09-04.md`; 3 Briefings de Nicho testados
ao vivo (costureira, motoboy, estética) validaram que a estrutura discrimina de verdade (vereditos
diferentes por nicho) em vez de sair genérica; estrutura final refinada contra frameworks de
mercado 2026 (Build-Measure-Learn, market-entry scoring, problem tiers).

### CAMPANHA — Entidade de exploração de nicho

- [ ] **CAMPANHA-01**: O usuário cria uma campanha de exploração de nicho escolhendo um nicho da lista existente (`/nichos`), definindo a oferta (texto livre — o que pretende vender nesse nicho), a janela de tempo (padrão ~90 dias, editável) e a meta de conversão.
- [ ] **CAMPANHA-02**: A campanha tem um estado: explorando / veredito registrado / em escala / abandonada.
- [ ] **CAMPANHA-03**: Um lead pode ser vinculado a uma campanha (campo opcional), além do seu nicho geral — o painel da campanha agrega os leads *dela*, não todo o nicho no período.
- [ ] **CAMPANHA-04**: O usuário lista e navega as campanhas já criadas.

### DIAGNOSTICO — Diagnóstico de IA da campanha

- [ ] **DIAGNOSTICO-01**: O usuário gera, sob demanda (botão explícito), um diagnóstico de IA para a campanha — nunca automático ao criar, e sempre gerado do zero (nunca reusado de outra geração, mesmo do mesmo nicho).
- [ ] **DIAGNOSTICO-02**: O diagnóstico pesquisa a web e cita fontes (URLs); um diagnóstico sem nenhuma fonte citada é rejeitado pelo sistema.
- [ ] **DIAGNOSTICO-03**: O diagnóstico apresenta um índice de saturação numérico, baseado na contagem de concorrentes diretos encontrados na pesquisa.
- [ ] **DIAGNOSTICO-04**: O diagnóstico lista até 3 gatilhos de dor observáveis do nicho (não genéricos), com o mais forte destacado.
- [ ] **DIAGNOSTICO-05**: O diagnóstico lista de 2 a 3 objeções esperadas, cada uma com uma resposta sugerida.
- [ ] **DIAGNOSTICO-06**: O diagnóstico estima um ticket médio para a oferta, citando a base/fonte usada.
- [ ] **DIAGNOSTICO-07**: Cada achado do diagnóstico é marcado como "dado quantificável" (contagem, preço) ou "alegação de marketing do concorrente" (afirmação de landing page/blog de quem vende) — nunca misturados sem distinção visual.
- [ ] **DIAGNOSTICO-08**: O diagnóstico inclui um rascunho de 1ª mensagem/abordagem, editável pelo usuário — nunca enviado automaticamente (sem integração de disparo).
- [ ] **DIAGNOSTICO-09**: O diagnóstico termina com um veredito **sugerido** pela IA (aprofundar / mudar ângulo / abandonar) — não vinculante, é insumo pro veredito do usuário.
- [ ] **DIAGNOSTICO-10**: O usuário pode regenerar o diagnóstico da mesma campanha quando quiser — cada geração é uma chamada nova e visível (sem cache escondendo o custo).

### VEREDITO — Decisão do usuário

- [ ] **VEREDITO-01**: O usuário registra o veredito final da campanha (aprofundar / mudar ângulo / abandonar) manualmente, podendo divergir da sugestão da IA.
- [ ] **VEREDITO-02**: O veredito registrado grava a data da decisão.
- [ ] **VEREDITO-03**: Registrar o veredito não dispara nenhuma ação automática no sistema (não arquiva leads, não altera outros dados) — é memória de decisão pro usuário consultar depois.

### PAINEL — Loop de resultado real e Mapa de Nichos

- [ ] **PAINEL-01**: O painel da campanha mostra o resultado real agregado dos leads vinculados a ela (contagem, taxa de conversão, motivos de perda, ticket médio), reaproveitando as funções já existentes de `/relatorios`.
- [ ] **PAINEL-02**: Existe uma tela "Mapa de Nichos" listando todas as campanhas já criadas, com nicho, veredito sugerido pela IA, veredito final do usuário, e um resumo do resultado real.
- [ ] **PAINEL-03**: O Mapa de Nichos é filtrável/ordenável pelo menos por veredito e por nicho.

### TUTORIAL — Tour guiado do CRM

Adicionado em conversa (2026-09-04) — o usuário pediu um tutorial navegável, com opção de pular,
apresentando o que cada tela faz. Pesquisa confirmou **React Joyride** como a lib certa (340k
installs/semana, integra nativo com React 19, botão de pular já vem pronto — sem reinventar).

- [ ] **TUTORIAL-01**: Na primeira visita, o usuário vê um tour guiado apresentando as telas principais do CRM (dashboard, leads, pipeline, relatórios, campanhas de nicho) e o que cada uma faz.
- [ ] **TUTORIAL-02**: O tour pode ser pulado/fechado a qualquer passo, sem forçar o usuário a terminar.
- [ ] **TUTORIAL-03**: O usuário pode reiniciar o tour quando quiser (não só na 1ª visita) por um ponto de acesso fixo (ex: menu ou tela de configurações).
- [ ] **TUTORIAL-04**: A implementação usa React Joyride — nenhuma biblioteca de tour concorrente, nenhum servidor/SaaS externo de onboarding.
- [ ] **TUTORIAL-05**: O estado "já viu o tour" persiste (não reaparece sozinho a cada acesso) mas fica sempre disponível pra reativar manualmente (TUTORIAL-03).

## Future Requirements

Reconhecidos, não neste milestone.

### Handoff Prospector → CRM

- **HANDOFF-01**: Rota de entrada (API local) para o Prospector Inteligente AI cadastrar leads automaticamente.
- **HANDOFF-02**: Deduplicação de lead por telefone na entrada automática.
- **HANDOFF-03**: Handoff rico — o lead entra em "Contatado" já com as interações do Prospector na timeline.

*Gatilho: o Prospector existir + a decisão de VPS único. Segue como semente parada.*

### Mapa de nichos agregado entre usuários

- **NICHO-AGG-01**: Versão agregada e anonimizada do Mapa de Nichos entre múltiplos usuários (o fosso de verdade descrito em `ESTRATEGIA-DIFERENCIACAO.md`). Só faz sentido com tração — dezenas de workspaces × 90 dias de dados. v1.7 entrega só a versão **pessoal** (1 usuário).

### Backlog PME

Em `.planning/todos/pending/` — avaliar prioridade num milestone futuro: tags livres por lead, temperatura automática do lead, busca global, anexo simples por lead, campo de vendedor responsável, meta mensal com barra de progresso.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Disparo automático de WhatsApp (a partir do rascunho de mensagem) | É o Prospector — risco de LGPD/ban documentado em `PARECER-E-COORDENADAS-2026-09-04.md`. O rascunho fica editável, o envio é manual, fora do sistema. |
| Garimpo de empresas / scraping de leads novos | Fora de escopo — a campanha organiza leads que já entram pelo fluxo normal do CRM (manual ou import CSV). |
| Multi-tenant / múltiplos usuários no Mapa de Nichos | O v1.7 entrega a régua pessoal (1 usuário). Agregação entre usuários é `NICHO-AGG-01`, gatilho de tração. |
| Scraping estruturado de dados de concorrente (preço exato, contagem de reviews) | Precisão maior, mas exige infraestrutura de scraping — fora do "zero infra nova" deste milestone. |
| Geração automática de campanha de mensagens em série / follow-up automatizado do ângulo | Território do Prospector (Fase 7, Briefing de Nicho completo com sequência gerada). Aqui é só o diagnóstico + 1 rascunho. |
| Alterar a fundação legal/CNPJ ou parceria com a Meta | Decisão de negócio fora do escopo de código; o `DIRECAO-v1.7` documenta que isso não muda a exposição do disparo cold. |

## Traceability

Preenchida na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAMPANHA-01 | Phase 22 | Pending |
| CAMPANHA-02 | Phase 22 | Pending |
| CAMPANHA-03 | Phase 22 | Pending |
| CAMPANHA-04 | Phase 22 | Pending |
| DIAGNOSTICO-01 | Phase 23 | Pending |
| DIAGNOSTICO-02 | Phase 23 | Pending |
| DIAGNOSTICO-03 | Phase 23 | Pending |
| DIAGNOSTICO-04 | Phase 23 | Pending |
| DIAGNOSTICO-05 | Phase 23 | Pending |
| DIAGNOSTICO-06 | Phase 23 | Pending |
| DIAGNOSTICO-07 | Phase 23 | Pending |
| DIAGNOSTICO-08 | Phase 23 | Pending |
| DIAGNOSTICO-09 | Phase 23 | Pending |
| DIAGNOSTICO-10 | Phase 23 | Pending |
| VEREDITO-01 | Phase 24 | Pending |
| VEREDITO-02 | Phase 24 | Pending |
| VEREDITO-03 | Phase 24 | Pending |
| PAINEL-01 | Phase 24 | Pending |
| PAINEL-02 | Phase 24 | Pending |
| PAINEL-03 | Phase 24 | Pending |
| TUTORIAL-01 | Phase 25 | Pending |
| TUTORIAL-02 | Phase 25 | Pending |
| TUTORIAL-03 | Phase 25 | Pending |
| TUTORIAL-04 | Phase 25 | Pending |
| TUTORIAL-05 | Phase 25 | Pending |

**Coverage:**
- v1.7 requirements: 25 total
- Mapped to phases: 25 (Fases 22-25)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after roadmap creation (Fases 22-25)*
