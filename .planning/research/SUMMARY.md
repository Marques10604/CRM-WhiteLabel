# Project Research Summary

**Project:** CRM de Leads — Área da Saúde
**Domain:** Milestone v1.2 "Follow-up Automático" — automação incremental de um CRM solo Next.js/Drizzle/SQLite já em produção (auto-avanço de etapa por clique em WhatsApp, contador de tentativas, configuração de dias-parado por etapa)
**Researched:** 2026-07-30
**Confidence:** HIGH

> Esta é uma síntese de pesquisa de milestone incremental, não de projeto novo. Os 4 arquivos de pesquisa (STACK/FEATURES/ARCHITECTURE/PITFALLS) foram lidos diretamente do código-fonte já existente (src/), não de um domínio genérico. Esta versão supersede o SUMMARY.md de 2026-07-19 (pesquisa do projeto original v1.0), preservado no histórico do git.

## Executive Summary

O milestone v1.2 adiciona três capacidades pequenas e interligadas a um CRM solo que já está em produção real: auto-avanço de etapa Novo→Contatado ao clicar em "Abrir WhatsApp" com o template de primeiro contato, um contador de tentativas de contato por lead, e uma tela /configuracoes para generalizar o "esfriando" hoje hardcoded (5 dias, só etapa Contatado) para as 3 primeiras etapas do funil. A pesquisa em stack, arquitetura e features convergem no mesmo veredito: zero pacotes novos, zero componentes novos de infraestrutura — tudo é resolvido com o que já está instalado (Next.js Server Actions, Drizzle/SQLite, react-hook-form + Zod, shadcn/ui, sonner), estendendo dois arquivos existentes (whatsapp-preview-dialog.tsx, pipeline/page.tsx) e criando uma pequena tabela relacional tipada (pipeline_stage_settings) em vez de um KV genérico.

A pesquisa de arquitetura identificou um fato crítico sobre o código real que muda a forma do trabalho: existe apenas UM elemento de link wa.me em todo o app — vive dentro de WhatsAppPreviewDialog (whatsapp-preview-dialog.tsx:165-178) — mesmo havendo 5 pontos de montagem do diálogo (pipeline, dashboard, lista de leads, pós-importação, auto-trigger de criação). Isso é uma vantagem (a lógica nova vive num único arquivo, não duplicada 4x) mas também o maior risco: instrumentar o botão errado (o "Enviar WhatsApp" da superfície, que só abre o diálogo, versus o "Abrir WhatsApp" real dentro dele) é o pitfall nº1 e o mais fácil de cometer, dado que os nomes dos botões nas telas convidam a essa confusão.

Os riscos principais não são de stack nem de escopo de features — a pesquisa de features confirma que o escopo das 3 features já está corretamente cortado (auto-avanço unidirecional só novo→contatado, sem "dar baixa" em confirmação de entrega do WhatsApp, sem escalonamento de cor/notificações) — mas sim de implementação correta de um ponto de integração compartilhado e sensível a race condition: gate no estado vivo (tipo) e não em props obsoletas (defaultTipo), re-checagem server-side atômica do estágio atual (nunca confiar no lead.stage client-side), uma única Server Action/transação (não duas chamadas separadas), e uma tabela de configurações que já nasce populada com os valores hardcoded atuais (para não desligar silenciosamente o sinal "esfriando" no dia do deploy). Nenhum desses riscos é de infraestrutura ou performance — a escala é irrelevante aqui (admin único, SQLite, poucos milhares de leads).

## Key Findings

### Recommended Stack

Nenhuma biblioteca nova é necessária. As três features usam exclusivamente pacotes já presentes em package.json, aplicados em pontos de integração literais e já existentes no código.

**Tecnologias envolvidas (todas já instaladas):**
- Next.js Server Actions (16.2.10) — nova Server Action registerWhatsAppContact chamada fire-and-forget a partir do onClick já existente do link de WhatsApp, sem preventDefault() nem rota de API nova
- Drizzle ORM + drizzle-kit (0.45.2/0.31.10) — 2 colunas novas em leads (contact_attempts, last_contacted_at) + 1 tabela nova tipada (pipeline_stage_settings, PK por etapa) via migração custom, seguindo o padrão já documentado no schema para stageChangedAt
- react-hook-form + Zod (7.82.0/4.4.x) — formulário de /configuracoes (3 campos numéricos), mesmo padrão de todo form existente no app
- shadcn/ui + sonner — reuso direto de Input/Field/Button/Card e do padrão de toast já usado em outras confirmações

**Explicitamente descartado (over-engineering para o escopo):** lib de state management (Zustand/Redux/Context global — useState local + revalidatePath já resolve), SDK de analytics/click-tracking para contar cliques de WhatsApp, navigator.sendBeacon/Service Worker, tabela settings genérica tipo key-value/JSON blob, rota de API dedicada, e qualquer biblioteca de "detecção de app aberto" para tentar confirmar entrega da mensagem.

### Expected Features

**Must have (escopo já definido em PROJECT.md, confirmado como table-stakes por CRMs comerciais — Pipedrive "Rotting", Zoho "Idle Deal Alert"):**
- Auto-avanço Novo→Contatado só no clique com template primeiro_contato, em todas as telas, unidirecional (nunca regride/re-avança leads além de Contatado), com toast de confirmação
- Contador contactAttempts — incrementa em qualquer clique de "Abrir WhatsApp" (qualquer template, qualquer etapa), badge simples no card do pipeline
- /configuracoes com 3 campos numéricos (dias-parado por etapa: Novo/Contatado/Negociação), substituindo o literal hardcoded 5 hoje restrito só a Contatado

**Should have:** nenhuma diferenciação é objetivo deste milestone — o próprio PROJECT.md o define como "alcançar a baseline" de CRM, não superá-la. A única diferenciação legítima de uma ferramenta solo é fazer as 3 coisas sem a cerimônia de configuração (rule builder, workflow engine) que Pipedrive/HubSpot/Zoho exigem para equipes.

**Defer/Anti-features identificados (evitar mesmo que pareçam extensão natural):** auto-avanço em qualquer clique (não só primeiro_contato), tratar clique no wa.me como confirmação de mensagem enviada, contador com escalonamento de cor/lógica de "desistir", thresholds por sub-nicho, notificações/e-mail sobre lead esfriando, auto-avanço em etapas além de Contatado — todos já corretamente fora do escopo v1.2 segundo PROJECT.md.

### Architecture Approach

As 3 features se anexam a um app Next.js já estruturado por convenção (actions/*-actions.ts por domínio, app/<rota>/page.tsx + form cliente, db/schema.ts como fonte única de verdade). O ponto de integração único e compartilhado para as Features 1+2 é WhatsAppPreviewDialog — as 5 superfícies que abrem o diálogo (pipeline board, dashboard de follow-up, lista de leads, lista pós-importação, auto-trigger de criação) nunca renderizam o link wa.me diretamente, só chamam setPreviewState. A Feature 3 (/configuracoes) é uma fatia vertical totalmente independente, sem arquivos ou migração compartilhados com as Features 1+2.

**Componentes principais:**
1. WhatsAppPreviewDialog (modificar) — ganha o onClick que chama a nova Server Action de forma fire-and-forget, usando o estado vivo tipo (não a prop defaultTipo)
2. registerWhatsAppContact (nova Server Action, em lead-actions.ts) — uma única transação: incrementa contador sempre + avança etapa condicionalmente, com re-SELECT server-side do estágio atual imediatamente antes do UPDATE
3. pipeline_stage_settings (nova tabela, 1 linha por etapa, PK tipada) + settings-actions.ts + configuracoes/page.tsx + stage-settings-form.tsx — fatia isolada, migração auto-seedada com os valores hardcoded atuais (evita desligar o sinal "esfriando" no deploy)
4. pipeline/page.tsx (modificar) — troca o literal stage==="contatado" && dias>=5 por uma leitura de pipeline_stage_settings, generalizada para as 3 etapas

### Critical Pitfalls

1. Instrumentar o botão errado — os botões de superfície ("Enviar WhatsApp") só abrem o diálogo, não enviam nada; a lógica nova deve viver exclusivamente no onClick do link real dentro de WhatsAppPreviewDialog, nunca nos 4 chamadores nem no auto-trigger de criação de lead.
2. preventDefault() + await + window.open() — quebra o link nativo e aciona bloqueador de pop-up silenciosamente; manter a navegação síncrona do link intacta e disparar a Server Action como efeito não-bloqueante no mesmo handler.
3. Gate na prop defaultTipo em vez do estado vivo tipo — o admin pode trocar o tipo de template antes de enviar; o gate de auto-avanço deve ler o estado tipo no momento do clique, nunca a prop de abertura do diálogo.
4. Confiar no lead.stage client-side para o gate — o prop pode estar obsoleto (drag-and-drop pode ter movido o lead nos segundos entre abrir o diálogo e clicar enviar); a checagem "está em Novo?" deve ser um SELECT fresco dentro da própria Server Action, imediatamente antes do UPDATE condicional.
5. Tabela de configurações sem seed — se pipeline_stage_settings nascer vazia (seed só ao primeiro salvamento do admin), a leitura retorna undefined e o sinal "esfriando" desliga silenciosamente para toda uma etapa, sem erro visível; a migração deve inserir as 3 linhas com os valores hardcoded atuais no mesmo arquivo que cria a tabela.

## Implications for Roadmap

Com base na pesquisa combinada, a estrutura de fases sugerida (a numerar como Fase 6+ na sequência já em .planning/ROADMAP.md, que está em Fase 5 completa):

### Fase 6: Auto-avanço de Etapa + Contador de Tentativas
**Rationale:** ARCHITECTURE.md e PITFALLS.md concordam que estas duas features são "arquiteturalmente inseparáveis" — mesma migração (contact_attempts, last_contacted_at em leads), mesma Server Action nova (registerWhatsAppContact), mesma edição de onClick em whatsapp-preview-dialog.tsx, mesma mudança de exibição em pipeline-lead-card.tsx. Dividir em duas fases significaria tocar exatamente as mesmas linhas duas vezes, sem ganho de isolamento.
**Delivers:** Migração com contact_attempts INTEGER NOT NULL DEFAULT 0 + last_contacted_at INTEGER (sem backfill necessário, ao contrário do precedente stageChangedAt); nova Server Action transacional registerWhatsAppContact(leadId, tipo) com re-SELECT server-side; onClick do link real estendido (fire-and-forget, sem preventDefault); badge de contador no card do pipeline; toast de confirmação no avanço.
**Addresses:** As duas primeiras features Active de PROJECT.md (auto-avanço, contador).
**Avoids:** Pitfalls 1-7 (botão errado, popup-blocker, gate na prop errada, gate client-side obsoleto, race com drag-and-drop, duas Server Actions separadas, contagem indevida no auto-trigger de criação) — todos mapeados para esta mesma fase em PITFALLS.md.

### Fase 7: Configuração de Dias-Parado por Etapa (/configuracoes)
**Rationale:** Totalmente independente da Fase 6 — sem arquivos, migração ou Server Action compartilhados, pode ser construída antes, depois ou em paralelo sem risco de merge. Sugerida como segunda por ser menor urgência (tela de configuração vs. o caminho central "nunca mais esquecer um follow-up") e porque revisar o diff de esfriandoLeadIds fica mais limpo depois que as mudanças de schema/action da Fase 6 já estiverem mescladas.
**Delivers:** Nova tabela pipeline_stage_settings (1 linha por etapa, migração auto-seedada com o valor 5 atual, preservando o comportamento de dia-um); nova rota /configuracoes com formulário react-hook-form + Zod (validação .int().min(1), rejeitando 0/negativo); nova Server Action updateStageSettings; pipeline/page.tsx generalizado para ler as 3 etapas em vez do literal hardcoded.
**Uses:** Drizzle (tabela tipada, não JSON blob), react-hook-form + Zod, shadcn/ui — mesmo padrão de todo form existente.
**Implements:** Pattern 3 de ARCHITECTURE.md (tabela tipada por chave em vez de settings genérico em JSON) e evita Anti-Pattern 3.
**Avoids:** Pitfalls 8-9 (tabela sem seed desliga o sinal silenciosamente; threshold 0 inflama o board inteiro instantaneamente).

### Phase Ordering Rationale

- A Fase 6 vem primeiro porque valida a superfície mais arriscada e mais compartilhada do app (os 5 pontos de montagem do diálogo de WhatsApp), e porque PROJECT.md já registra um débito conhecido de UAT de WhatsApp nunca confirmado no navegador na Fase 4 — testar esse caminho de novo, agora com mutação de estado, é prioridade.
- A Fase 7 é isolada de propósito — ARCHITECTURE.md confirma zero sobreposição de arquivos/migração com a Fase 6, então a ordem entre elas é uma escolha de prioridade de produto, não uma dependência técnica.
- Nenhuma fase adicional é necessária para este milestone: as 3 features do Active de PROJECT.md mapeiam exatamente para essas 2 fases, sem items órfãos.
- Um item de risco aceito e não resolvido nesta rodada (Pitfall 5 — corrida entre o drag-and-drop otimista do pipeline board e o auto-avanço disparado pelo clique de WhatsApp) deve ser documentado explicitamente no CONTEXT/plan da Fase 6, ao lado da já conhecida "race condition de Perdido em sequência" registrada em STATE.md — não deve ser resolvido silenciosamente nem ignorado silenciosamente.

### Research Flags

Fases que provavelmente não precisam de pesquisa adicional durante o planejamento (--research-phase):
- Fase 6: Padrões bem documentados e verificados diretamente no código-fonte (idioma SELECT-then-conditional-write já usado em updateLeadStage/updateLead; ponto de integração único já identificado com número de linha exato). PITFALLS.md já mapeia pitfall→fase→verificação em detalhe suficiente para virar critério de sucesso do plano.
- Fase 7: Padrão de tabela tipada + form react-hook-form/Zod é uma repetição direta de convenções já em uso 3+ vezes no repo (subnicho-actions.ts, template-actions.ts).

Nenhuma fase deste milestone foi sinalizada como precisando de pesquisa mais profunda — a pesquisa de arquitetura e pitfalls já leu o código real linha a linha, o que é o nível de detalhe que normalmente um --research-phase produziria.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Nenhuma versão nova a verificar — confirmação direta de que os pacotes já instalados (package.json) bastam, sem inferência externa |
| Features | MEDIUM | Escopo e sizing são julgamento específico do projeto, ancorado no código existente (HIGH); os padrões de CRM comercial equivalentes (Pipedrive Rotting, Zoho Idle Deal Alert) vêm de doc oficial (HIGH) e buscas convergentes (MEDIUM) |
| Architecture | HIGH | Todos os achados verificados lendo o código-fonte real listado nas fontes, não inferidos da descrição do milestone |
| Pitfalls | HIGH | Todos os 9 pitfalls verificados diretamente contra o código do projeto (whatsapp-preview-dialog.tsx, pipeline-board.tsx, lead-actions.ts, schema.ts, pipeline/page.tsx), não conselho genérico de web-dev |

**Overall confidence:** HIGH

### Gaps to Address

- Race entre drag-and-drop otimista e auto-avanço via WhatsApp (Pitfall 5): não é um gap de pesquisa, é uma limitação aceita e documentada — deve ser registrada explicitamente no CONTEXT da Fase 6 (não silenciosamente ignorada), ao lado do item já existente "race condition de Perdido em sequência" em STATE.md.
- Restrição sync/async da transação better-sqlite3: a Server Action combinada (contador + avanço) deve usar db.transaction(fn) com callback síncrono no driver local atual (better-sqlite3); se o projeto migrar para Turso/@libsql/client no futuro (caminho já documentado no STACK.md original), esse trecho precisa reauditoria — não é um bloqueio agora, só um lembrete a registrar no código (comentário) para o futuro.
- Valor-piso do threshold de /configuracoes: PITFALLS.md sugere .min(1) mas nota que mesmo 1 tem um caso de borda perceptível ("criado de manhã, marcado como parado à noite") — decisão de UX final (qual piso exato e a cópia de texto ao redor) fica para o plano da Fase 7, não é uma lacuna de pesquisa técnica.

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte do projeto (src/db/schema.ts, src/actions/lead-actions.ts, src/components/whatsapp-preview-dialog.tsx, src/components/pipeline-board.tsx, src/app/pipeline/page.tsx, src/hooks/use-first-contact-trigger.ts, src/components/lead-form-dialog.tsx, src/app/importar/[batchId]/page.tsx, src/db/migrations/0002_backfill-fechado-perdido-split.sql) — base de todas as 4 pesquisas
- .planning/PROJECT.md — escopo textual exato do milestone v1.2 e requisitos Active
- .planning/STATE.md — item deferred "race condition de Perdido em sequência", usado como precedente de enquadramento para o Pitfall 5
- support.pipedrive.com — The Rotting Feature — doc oficial, confirma padrão comercial equivalente à Feature 3

### Secondary (MEDIUM confidence)
- WebSearch convergente sobre "deal rotting"/"stale deal" configurável por etapa (Zoho Idle Deal Alert, Freshworks staling age)
- WebSearch sobre auto-avanço de etapa por atividade em CRMs comerciais (sempre via regra explícita configurada, nunca implícito)
- WebSearch sobre contadores de tentativa em ferramentas de cadência de vendas (Outreach, Salesloft, Apollo)

### Tertiary (LOW confidence)
- WebSearch sobre "false positive" de automação de CRM ao marcar contato por clique — resultados adjacentes (phishing/simulação), não um precedente específico de WhatsApp, mas o princípio (clique != entrega confirmada) é bem estabelecido e usado para justificar a decisão de anti-feature já validada em PROJECT.md

---
*Research completed: 2026-07-30*
*Ready for roadmap: yes*
