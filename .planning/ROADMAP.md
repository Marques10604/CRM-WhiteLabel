# Roadmap: CRM de Leads

## Milestones

- ✅ **v1.0 MVP** — Fases 1-4 (shipado 2026-07-29) — `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 Importação Inteligente** — Fase 5 (shipado 2026-07-30) — `.planning/milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Follow-up Automático** — Fases 6-7 (shipado 2026-08-01)
- ✅ **v1.3 Qualificação e Histórico de Leads** — Fases 8-12 (shipado 2026-08-30) — `.planning/milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 CRM Genérico Multi-Nicho (despivô)** — Fases 13-15 (shipado 2026-08-31) — `.planning/milestones/v1.4-ROADMAP.md`
- ✅ **v1.5 Quitação de Débito e Auditoria Retroativa** — Fases 16-19 (shipado 2026-09-03) — `.planning/milestones/v1.5-ROADMAP.md`
- ✅ **v1.6 Dark Mode + Exportar CSV** — Fases 20-21 (shipado 2026-09-04) — `.planning/milestones/v1.6-ROADMAP.md`
- 🚧 **v1.7 Exploração de Nicho** — Fases 22-25 (em andamento)

## Phases

<details>
<summary>✅ v1.0 MVP (Fases 1-4) — SHIPADO 2026-07-29</summary>

- [x] Fase 1: Lead & Sub-nicho Foundation (4/4 planos) — 2026-07-22
- [x] Fase 2: CSV Bulk Import (3/3 planos) — 2026-07-24
- [x] Fase 3: Sales Pipeline & Funnel View (4/4 planos) — 2026-07-21
- [x] Fase 4: Follow-up Dashboard & WhatsApp Outreach (4/4 planos) — 2026-07-22

Detalhes: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Importação Inteligente (Fase 5) — SHIPADO 2026-07-30</summary>

- [x] Fase 5: Notas Enriquecidas na Importação CSV (2/2 planos) — 2026-07-30

Detalhes: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Follow-up Automático (Fases 6-7) — SHIPADO 2026-08-01</summary>

- [x] Fase 6: Auto-avanço de Etapa + Contador de Tentativas (2/2 planos) — 2026-07-30
- [x] Fase 7: Configuração de Dias-Parado por Etapa (2/2 planos) — 2026-07-31

</details>

<details>
<summary>✅ v1.3 Qualificação e Histórico de Leads (Fases 8-12) — SHIPADO 2026-08-30</summary>

**Meta:** Qualificar leads por origem e dar visibilidade ao histórico de interação e ao resultado do funil.

- [x] Fase 8: Origem Governada + Separação Inbound × Outbound (3/3 planos) — 2026-08-07
- [x] Fase 9: Timeline de Interações (4/4 planos) — 2026-08-09
- [x] Fase 10: Sequência de Follow-up Escalonada (4/4 planos) — 2026-08-13
- [x] Fase 11: Painel de Métricas e Relatório de Motivos de Perda (5/5 planos) — 2026-08-29
- [x] Fase 12: Agenda / Tarefas Soltas (4/4 planos) — 2026-08-30

Detalhes completos: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 CRM Genérico Multi-Nicho — despivô (Fases 13-15) — SHIPADO 2026-08-31</summary>

**Meta:** Tirar o CRM da amarra "área da saúde" — o admin usa a mesma ferramenta pra leads de qualquer nicho, e o relatório responde "esse nicho converteu na janela que testei?". Rename + reframe + 2 adições pequenas, não rebuild.

- [x] Fase 13: Rename `sub-nicho → nicho` + reframe (3/3 planos) — 2026-08-30 — NICHO-01, NICHO-02, COPY-01 · UAT 8/8, security 9/9, verification passed
- [x] Fase 14: Filtro de intervalo customizado em `/relatorios` (2/2 planos) — 2026-08-30 — METRICAS-03 · UAT 11/11, code review 10/10, security 10/10 · PR #4
- [x] Fase 15: Campo "interesse / serviço desejado" no lead (2/2 planos) — 2026-08-31 — LEAD-06 · UAT 5/5, code review 0 critical, security 0 threats · PR #5

Detalhes completos: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Quitação de Débito e Auditoria Retroativa (Fases 16-19) — SHIPADO 2026-09-03</summary>

**Meta:** Levar o CRM a "auditado, polido, não mexo mais" — verificar no navegador o que nunca foi verificado, fechar os achados de code review em aberto, limpar o lint do repo e dar identidade visual ao produto. **Zero feature funcional nova.**

- [x] Fase 16: Correções de Code Review da Fase 15 (2/2 planos) — 2026-09-01 — FIX-01/02/03 · code review 1 blocker (CR-01) corrigido, security 0 threats, verification passed
- [x] Fase 17: Limpeza de Lint do Repo (1/1 plano) — 2026-09-02 — LINT-01 · `npm run lint` da raiz exit 0 (de 457 erros, ~98% ruído de ferramental), verification passed
- [x] Fase 18: Auditoria Retroativa no Navegador (6/6 planos) — 2026-09-02 — AUDIT-01..05 · método code+data (host 4GB bloqueou o navegador); 5 `VERIFICATION.md` passed, 0 issues de runtime
- [x] Fase 19: Marca e Identidade Visual (6/6 planos) — 2026-09-03 — BRAND-01/02/03 · nome "SOLO", paleta "Corrente Funda · Sóbria" (OKLCH light+dark), 33 arquivos cor→token, favicon próprio · code review 2 WR corrigidos, security 0 threats, verification passed 5/5 (code+data)

Detalhes completos: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Dark Mode + Exportar CSV (Fases 20-21) — SHIPADO 2026-09-04</summary>

**Meta:** Dois utilitários pequenos que faltavam — o admin escolhe claro/escuro e leva os leads pra fora do sistema em CSV. Nada estrutural, zero mudança de schema.

- [x] Fase 20: Tema / Dark Mode (1/1 plano) — 2026-09-04 — THEME-01..04 · `ThemeProvider` (next-themes) + toggle sol/lua no rodapé da sidebar, persiste, sem FOUC · security 0 threats, verification passed 5/5 (code+data)
- [x] Fase 21: Exportar CSV da Lista de Leads (1/1 plano) — 2026-09-04 — EXPORT-01..03 · botão na toolbar → `getSortedRowModel().rows`, módulo puro `lead-csv-export.ts` (BOM UTF-8 + `;` + guard de CSV injection), harness 38 asserções · plan-checker PASS, security 0 threats, verification passed 4/4 (code+data)

Detalhes completos: `.planning/milestones/v1.6-ROADMAP.md`

</details>

### 🚧 v1.7 Exploração de Nicho (Em andamento)

**Meta:** Dar ao CRM o objeto de 1ª classe que é o diferencial real do produto — a campanha de
exploração de nicho, com diagnóstico de IA anti-genérico, veredito registrado pelo usuário e o
loop de resultado real fechando com o que `/relatorios` já calcula. Zero WhatsApp, zero VPS, zero
infra nova. Direção completa em `.planning/DIRECAO-v1.7-2026-09-04.md` (Caminho A escolhido).

- [ ] **Phase 22: Campanha de Exploração de Nicho** - Entidade campanha (nicho + oferta + janela + meta), estado, vínculo opcional com lead, tela de listagem
- [ ] **Phase 23: Diagnóstico de IA da Campanha** - Diagnóstico sob demanda com busca na web, fontes citadas obrigatórias, saturação/gatilhos/objeções/ticket médio/rascunho/veredito sugerido
- [ ] **Phase 24: Veredito e Mapa de Nichos** - Usuário registra veredito final; painel da campanha reaproveita `/relatorios`; tela Mapa de Nichos
- [ ] **Phase 25: Tour Guiado do CRM** - React Joyride apresentando as telas principais, pulável, reiniciável, persistente

#### Phase 22: Campanha de Exploração de Nicho
**Goal**: O usuário organiza a exploração de um nicho como uma entidade própria do CRM — nicho + oferta + janela de tempo + meta — e pode vincular leads existentes a ela, além de listar/navegar todas as campanhas já criadas.
**Depends on**: Nada (usa `nichos`/`leads` já existentes)
**Requirements**: CAMPANHA-01, CAMPANHA-02, CAMPANHA-03, CAMPANHA-04
**Success Criteria** (what must be TRUE):
  1. Usuário cria uma campanha escolhendo um nicho da lista existente, definindo oferta (texto livre), janela de tempo (padrão ~90 dias, editável) e meta de conversão
  2. A campanha exibe um estado (explorando / veredito registrado / em escala / abandonada) visível na tela
  3. Ao editar um lead, o usuário pode vincular opcionalmente esse lead a uma campanha existente, sem perder o nicho geral do lead
  4. Usuário lista todas as campanhas já criadas e navega até o detalhe de qualquer uma delas
**Plans**: TBD
**UI hint**: yes

#### Phase 23: Diagnóstico de IA da Campanha
**Goal**: O usuário gera, sob demanda, um diagnóstico de IA anti-genérico para a campanha — com busca na web, fontes citadas, distinção clara entre dado quantificável e alegação de marketing, e um veredito sugerido que nunca é vinculante.
**Depends on**: Phase 22 (o diagnóstico se prende a uma campanha existente)
**Requirements**: DIAGNOSTICO-01, DIAGNOSTICO-02, DIAGNOSTICO-03, DIAGNOSTICO-04, DIAGNOSTICO-05, DIAGNOSTICO-06, DIAGNOSTICO-07, DIAGNOSTICO-08, DIAGNOSTICO-09, DIAGNOSTICO-10
**Success Criteria** (what must be TRUE):
  1. Usuário clica um botão explícito na tela da campanha e recebe um diagnóstico gerado do zero — nunca automático ao criar a campanha, nunca reaproveitado de outra geração (nem do mesmo nicho)
  2. O diagnóstico mostra índice de saturação numérico (contagem de concorrentes achados), até 3 gatilhos de dor (o mais forte destacado), 2-3 objeções com resposta sugerida, e ticket médio com a fonte usada
  3. Cada achado do diagnóstico aparece marcado visualmente como "dado quantificável" ou "alegação de marketing do concorrente" — nunca misturado sem distinção
  4. Um diagnóstico sem nenhuma fonte (URL) citada é rejeitado pelo sistema, e o usuário vê isso em vez de um resultado genérico
  5. O diagnóstico inclui um rascunho de 1ª mensagem editável (nunca enviado automaticamente) e termina com um veredito sugerido pela IA (aprofundar/mudar ângulo/abandonar); o usuário pode regenerar quando quiser, e cada geração aparece como um evento novo e visível, sem cache escondendo o custo
**Plans**: TBD
**UI hint**: yes
**Rationale (IA)**: `config.json` tem `workflow.ai_integration_phase: true` — esta fase precisa do tratamento de `/gsd-ai-integration-phase` ou `/gsd-plan-phase --ai` no planejamento: escolha de framework (Vercel AI SDK + Claude com tool de busca na web é o candidato natural) e uma estratégia de avaliação contra saída genérica/inútil, espelhando o padrão anti-genérico já validado na pesquisa do próprio Prospector (forçar especificidade, exigir fontes citadas, rejeitar saída sem fundamento). O host de 4GB não roda navegador + sessão do agente juntos — a avaliação de qualidade "é útil de verdade" continua sendo julgamento humano, mas os portões estruturais anti-genérico (tem fonte, tem índice numérico, rejeita sem fonte, etc.) devem ser automatizáveis por um harness que chama a função de diagnóstico diretamente e faz asserções estruturais, sem precisar de navegador.

#### Phase 24: Veredito e Mapa de Nichos
**Goal**: O usuário registra sua decisão final sobre a campanha (podendo divergir da IA) e vê o resultado real do nicho consolidado num painel e numa tela "Mapa de Nichos" que reúne todas as campanhas já exploradas.
**Depends on**: Phase 22 (entidade campanha); Phase 23 (o veredito do usuário se compara ao veredito sugerido pela IA, DIAGNOSTICO-09)
**Requirements**: VEREDITO-01, VEREDITO-02, VEREDITO-03, PAINEL-01, PAINEL-02, PAINEL-03
**Success Criteria** (what must be TRUE):
  1. Usuário registra o veredito final da campanha (aprofundar/mudar ângulo/abandonar) com a data da decisão, podendo divergir da sugestão da IA
  2. Registrar o veredito não altera nenhum outro dado do sistema (não arquiva leads, não dispara nada automático) — é só memória de decisão
  3. O painel da campanha mostra o resultado real agregado (contagem, conversão, motivos de perda, ticket médio) só dos leads vinculados a ela, reaproveitando as funções já existentes de `/relatorios`
  4. Usuário acessa a tela "Mapa de Nichos" listando todas as campanhas com nicho, veredito da IA, veredito final e resumo do resultado real, filtrável/ordenável por veredito e por nicho
**Plans**: TBD
**UI hint**: yes

#### Phase 25: Tour Guiado do CRM
**Goal**: Um usuário (na 1ª visita ou quando quiser) recebe um tour guiado apresentando as telas principais do CRM — incluindo as novas telas de campanha/nicho — podendo pular a qualquer passo e reiniciar depois.
**Depends on**: Phase 24 (para tourar as telas de campanha/Mapa de Nichos já prontas) — sem acoplamento de dados/schema, é pura UI/lib cliente
**Requirements**: TUTORIAL-01, TUTORIAL-02, TUTORIAL-03, TUTORIAL-04, TUTORIAL-05
**Success Criteria** (what must be TRUE):
  1. Na primeira visita, o usuário vê um tour guiado apresentando dashboard, leads, pipeline, relatórios e campanhas de nicho, explicando o que cada tela faz
  2. O tour pode ser pulado/fechado a qualquer passo, sem forçar o usuário a terminar
  3. O usuário reinicia o tour quando quiser (não só na 1ª visita) por um ponto de acesso fixo (menu ou configurações)
  4. O estado "já viu o tour" persiste entre acessos (não reaparece sozinho), mas continua sempre disponível pra reativação manual
**Plans**: TBD
**UI hint**: yes
**Nota**: TUTORIAL-04 (usar React Joyride, nenhuma lib concorrente nem SaaS externo) é uma restrição de implementação verificável em code review/plan-check, não um comportamento observável adicional — coberta pela escolha de biblioteca no plano, não por um 5º critério de sucesso.

## Progress

| Milestone | Fases | Planos | Status |
|-----------|-------|--------|--------|
| v1.0 MVP | 1-4 | 15 | ✅ 2026-07-29 |
| v1.1 Importação Inteligente | 5 | 2 | ✅ 2026-07-30 |
| v1.2 Follow-up Automático | 6-7 | 4 | ✅ 2026-08-01 |
| v1.3 Qualificação e Histórico | 8-12 | 20 | ✅ 2026-08-30 |
| v1.4 CRM Genérico Multi-Nicho | 13-15 | 7 | ✅ 2026-08-31 |
| v1.5 Quitação de Débito e Auditoria Retroativa | 16-19 | 15 | ✅ 2026-09-03 |
| v1.6 Dark Mode + Exportar CSV | 20-21 | 2 | ✅ 2026-09-04 |
| v1.7 Exploração de Nicho | 22-25 | TBD | 🚧 planejado |
