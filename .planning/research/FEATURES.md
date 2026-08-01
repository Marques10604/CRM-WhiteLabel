# Feature Research

**Domain:** CRM pessoal solo — qualificação de leads e histórico de funil (saúde, single-admin)
**Researched:** 2026-08-01
**Confidence:** MEDIUM-HIGH (padrões de mercado bem estabelecidos e convergentes entre fontes; nenhuma feature deste milestone é exótica — todas são componentes-padrão de CRM, a decisão real é dimensionamento para 1 usuário, não "se existe")

> Este arquivo cobre o milestone v1.3 (Qualificação e Histórico de Leads): separação Inbound×Outbound, timeline de interações, sequência de follow-up escalonada, painel de métricas por origem/sub-nicho, relatório de motivos de perda, agenda/tarefas soltas — mais duas perguntas de avaliação levantadas pelo usuário (temperatura automática, governança de `origem`). Substitui o `FEATURES.md` de v1.2 (2026-07-30), que cobria auto-avanço de etapa/contador de tentativas/dias-parado — esses itens estão shipados e validados, ver `.planning/PROJECT.md` "Validated".

## Feature Landscape

### Table Stakes (Users Expect These)

Em qualquer CRM — mesmo solo — estas são o "objeto padrão" que falta hoje neste projeto e cuja ausência já é sentida (ver `PROJECT.md` Active).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Campo de origem do lead governado (dropdown, não texto livre) | Todo CRM tem um "Lead Source" — e fontes de best-practice são unânimes que esse campo deve ser lista controlada, não texto livre, justamente para permitir filtro/roteamento confiável (mesma razão dada para `motivoPerda` abaixo) | LOW | `origem` já existe como `text` livre em `leads.origem` — a mudança é de tipo de input, reaproveitando o padrão já validado em `subnichos` (Fase 1: tabela extensível com soft-delete), não um enum hardcoded |
| Separação Inbound × Outbound | Toda literatura de CRM trata isso como distinção básica de "lead source" (de onde veio: alguém veio até você vs. você foi atrás) — é o primeiro campo que qualquer guia de CRM lista como obrigatório | LOW-MEDIUM | Ver seção "Perguntas de Avaliação" abaixo — a recomendação é modelar como atributo do valor de `origem` governado, não como campo separado no lead |
| Timeline de interações (activity log) por lead | "Activity records" (chamada, nota, mensagem, reunião) ligados ao contato/deal são um dos 4 objetos padrão que "todo CRM" tem (Contacts, Companies, Deals, Activities) — sua ausência é a queixa mais comum em ferramentas de planilha | MEDIUM | Ver "Minimal Data Model" abaixo. Zero-esforço adicional se auto-populado pelo clique de WhatsApp já existente (Fase 6) |
| Relatório de motivo de perda | "Win/Loss dashboards" com contagem por motivo são padrão em qualquer CRM com etapa de "perdido" — o campo já existe (`motivoPerda`, Fase 3), só falta a agregação | LOW | Quick win técnico — é literalmente um `GROUP BY motivoPerda`. Mas ver nota de qualidade de dado abaixo: hoje `motivoPerda` é texto livre nullable, o que degrada a qualidade do relatório do mesmo jeito que `origem` livre degradaria o painel de métricas |
| Follow-up/tarefa com data e lembrete (mesmo sem vínculo a lead) | Qualquer ferramenta de produtividade pessoal (e todo CRM com módulo de "Tasks") tem isto — a atividade do tipo "task" com due date e owner é um subtipo padrão de Activity, podendo ou não estar ligada a um registro | LOW | Simplesmente uma tabela `tarefas` paralela a `leads`, sem necessidade de recorrência/prioridade/atribuição (é uso solo) |

### Differentiators (Competitive Advantage)

Não são esperados por padrão em CRM genérico de mercado — mas atacam diretamente o Core Value deste projeto ("nunca mais perder um follow-up") e por isso valem o investimento aqui.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sequência de follow-up escalonada com templates de prova social | Cadências de vendas em CRMs de mercado costumam ser automação de disparo real (email sequences); aqui o valor é o **cálculo do próximo `followUpDate` sugerido** com intervalos crescentes (+4, +10...) — continua sendo clique manual (sem envio automático, decisão já tomada no projeto), então é mais "assistente de cadência" que "sales sequence" de SaaS grande | MEDIUM-HIGH | `templates.tipo` já inclui `"prova_valor"` no enum (Fase 4) — infraestrutura de template parcialmente pronta, falta só a lógica de intervalo e o vínculo ao lead/timeline |
| Painel de métricas por origem × sub-nicho (taxa de conversão) | CRMs de entrada (free tier Pipedrive/HubSpot) frequentemente escondem relatórios de conversão por segmento atrás de planos pagos — ter isso nativo, mesmo simples, é o que substitui de fato a "visão de relance" que a planilha não dava | MEDIUM | Depende arquiteturalmente de #1 (origem confiável) e #2 (timeline/contagem confiável) — confirma a ordem já definida no roadmap (item 4 depois de 1 e 2) |
| Temperatura derivada (quente/morno/frio) computada, não digitada | Ver "Perguntas de Avaliação" — vira diferenciador de baixo custo *depois* que #1 e #2 já existem, porque não pede nenhuma coleta de dado nova (é um cálculo em cima do que já existe) | LOW (se adiado para depois de #1+#2) / MEDIUM (se feito agora, exigiria construir #1+#2 primeiro mesmo assim) | Ver resposta detalhada abaixo — não é table stakes deste milestone, mas é "quase de graça" logo depois dele |

### Anti-Features (Commonly Requested, Often Problematic)

Coisas que CRMs de mercado (voltados a times de vendas) têm e que seriam overengineering aqui — pesquisa de "melhor CRM para founder solo" é unânime: "forget AI lead scoring, forget workflow automation, forget custom objects... adicione isso quando contratar o primeiro vendedor."

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Lead scoring com IA/ML para temperatura | Parece mais "inteligente" e moderno que uma regra fixa | Sem volume de dado de treino (poucas centenas/milhares de leads, um único admin rotulando "fechado/perdido") um modelo de ML não tem sinal suficiente pra superar uma regra simples — é complexidade sem ganho mensurável, e ainda fica opaco (dificulta debug por um agente de IA mantendo o código, indo contra a filosofia Drizzle-sobre-Prisma já adotada no projeto) | Temperatura **derivada por regra determinística** (origem + tempo parado + tentativas de contato) — auditável, explicável, e reaproveita dado que já existe |
| Envio automático de sequência de follow-up (disparo real, sem clique) | "Se já calculamos o próximo follow-up, por que não mandar sozinho?" | Já está fora de escopo do projeto (`CLAUDE.md`/`PROJECT.md`: sem API paga do WhatsApp, admin sempre confirma e envia manualmente) — reintroduzir isso quebraria uma decisão de arquitetura já tomada e traria custo/burocracia de conta Business API | Sequência calcula e sugere a data + template pronto; envio continua sendo clique manual em link `wa.me`, igual ao fluxo de primeiro contato já existente |
| Atribuição de motivo de perda / conversão por vendedor (leaderboard) | Padrão em CRM de time (relatórios "por rep") | Não existe time — é um admin único; um leaderboard de 1 pessoa não gera insight, só complexidade de schema (campo de vendedor responsável já está deliberadamente no backlog de baixa prioridade, "só coluna no banco, sem UI") | Métricas agregadas só por origem/sub-nicho (dimensões que realmente variam neste projeto), não por pessoa |
| Sistema de tarefas completo (subtarefas, prioridade, recorrência, atribuição, kanban de tarefas) | "Já que estamos fazendo tarefas, por que não fazer direito?" | Escopo do pedido original é "tarefa avulsa não amarrada a nenhum lead" — uma lista simples com título+data resolve 100% do caso de uso relatado (`"ligar pro fornecedor"`); um sistema de projeto/tarefas completo é uma categoria de produto diferente (tipo Todoist/Asana) que não serve ao Core Value do CRM | Tabela `tarefas` plana: título, data, concluída (boolean), sem hierarquia |
| Cadência de follow-up configurável por lead individual | Parece dar mais controle | Editar intervalo lead-a-lead é fricção que o admin (usuário solo) não vai manter — o próprio padrão já existente no projeto (`configuracoes` singleton com dias-parado por etapa, Fase 7) resolve isso a nível global/por-etapa, não por registro | Sequência de intervalos configurável **globalmente** (ou no máximo por tipo inbound/outbound), reaproveitando o padrão de configuração singleton já shipado |
| Dashboard de BI completo (gráficos interativos, drill-down, exportação avançada) | Parece "profissional" | Com centenas/poucos milhares de leads e um único usuário olhando o painel, uma tabela agrupada + contagem/porcentagem já entrega 100% do valor decisório; uma stack de BI é manutenção sem retorno | Tabelas agrupadas (`GROUP BY origem`, `GROUP BY subnicho`) com taxa de conversão calculada em SQL/JS simples, exibidas como cards/tabela — mesmo padrão visual já usado no dashboard de follow-up (Fase 4) |

## Perguntas de Avaliação (Evaluation Questions)

### 1. "Temperatura automática" deve ser core deste milestone ou fica separada/baixa prioridade?

**Resposta: fica fora do escopo core do milestone v1.3 (a decisão já tomada no `PROJECT.md` está certa), mas deve subir de prioridade no backlog — de "ideia PME, não urgente" para "próximo passo natural logo após a Fase 1+2 deste milestone".**

Justificativa:
- A pesquisa de mercado confirma dois padrões concorrentes de "temperatura"/lead scoring: (a) score numérico automatizado atualizado por evento/decaimento de tempo (típico de CRM de marketing automation com volume alto de leads e múltiplos sinais de engajamento — abertura de email, visita a página de preço etc.); e (b) rótulo manual simples aplicado pelo vendedor. **Nenhum dos dois padrões de mercado, sozinho, é o certo aqui** — este projeto não tem os sinais de engajamento digital que alimentam (a), e um rótulo 100% manual (b) é só mais um campo pra esquecer de preencher, replicando o problema original da planilha.
- O padrão certo para este projeto é uma **terceira via, já sinalizada corretamente no próprio todo do usuário**: temperatura como **campo derivado/computado** (não digitado, não armazenado como fonte-de-verdade), calculado a partir de três sinais que **este milestone já está construindo**: origem (inbound = tende a quente por padrão), tempo parado na etapa atual (o mesmo dado que já alimenta o badge "esfriando" da Fase 7), e contador de tentativas de contato sem avanço de etapa (já existe desde a Fase 6). Ou seja: depois que os itens 1 e 2 deste milestone existirem, "temperatura" deixa de ser uma feature nova — vira uma função de leitura sobre dado que já existe, sem nenhuma tabela nova.
- A pesquisa de "CRM para founder solo" é explícita em desencorajar scoring automatizado sofisticado neste estágio ("forget AI lead scoring... adicione quando contratar o primeiro vendedor") — reforça manter a versão **regra simples determinística**, nunca ML.
- Resposta à pergunta "manual, derivado, ou ambos?": na prática de mercado (HubSpot, Pipedrive) o padrão dominante é **híbrido** — um valor computado como default, com override manual disponível para o vendedor corrigir casos que a regra erra. Para a escala deste projeto (1 admin, poucas centenas de leads), recomenda-se **começar só com o valor derivado, sem override manual** — override é UI extra para um problema que ainda não apareceu; adicionar depois é trivial (mais uma coluna nullable que, se preenchida, sobrepõe o cálculo) caso o admin reporte que a regra erra com frequência.
- Motivo comercial citado pelo próprio usuário (fica bonito num print pra Instagram) é legítimo mas não muda a arquitetura — reforça que é baixa prioridade técnica/alta prioridade de marketing, ou seja, cabe bem como "polish" pós-milestone, não como bloqueador dele.

**Recomendação prática:** manter fora da Fase 1-6 deste milestone (como já está no `PROJECT.md`), mas registrar como candidato natural a "v1.4 rápida" (não backlog indefinido) assim que os itens 1 (origem governada + inbound/outbound) e 2 (timeline/tempo-parado) estiverem entregues — é um item de complexidade LOW nesse ponto, não MEDIUM.

### 2. `origem` e sub-nicho devem virar lista governada (dropdown) em vez de texto livre?

**Sub-nicho:** já está resolvido — `subnichos` já é uma tabela extensível com soft-delete desde a Fase 1 (`subnichoId` é FK, não texto). Nenhuma mudança necessária; é o padrão de referência a copiar para os outros campos.

**Origem: SIM, deve virar lista governada — e a pesquisa confirma isso com uma analogia direta.** Duas fontes de evidência convergem:
1. Best-practice geral de CRM: "Lead Source field deve ser um dropdown controlado, não texto livre" é citado de forma consistente em fontes de implementação de CRM — exatamente pela mesma razão dada pelo usuário (roteamento e agrupamento confiável).
2. A mesma regra aparece de forma quase idêntica para o campo de motivo de perda ("Loss Reason field should be a controlled picklist on the opportunity object, not a free-text field, to ensure consistent and analyzable data") — o que sinaliza que **`motivoPerda` (item 5 deste milestone) tem exatamente o mesmo problema que `origem`**, hoje ambos são `text` livre no schema (`leads.origem` e `leads.motivoPerda`), e por isso o relatório de motivo de perda (item 5) vai sofrer da mesma fragilidade ("Anúncio" vs "anúncio" vs "Ads") se não for endereçado junto.

**Padrão recomendado para `origem` — reaproveitar a tabela `subnichos` como molde, não inventar um enum hardcoded:**

Criar uma tabela `origens` (nome no plural, mesmo padrão de `subnichos`) com:
- `id`, `nome` (texto, único case-insensitive — mesmo índice de `subnichos`)
- `tipo` (`enum: "inbound" | "outbound"`) — **este é o ponto-chave que resolve a pergunta 1 da separação Inbound×Outbound ao mesmo tempo**: o inbound/outbound não precisa ser um campo novo em `leads`. Ele é um atributo do valor de origem, classificado **uma vez pelo admin** ao cadastrar/editar a origem (ex.: "Anúncio Instagram" → inbound; "Prospecção fria LinkedIn" → outbound), não repetido lead a lead.
- `deletedAt` (soft-delete, mesmo padrão)

Isso é preferível a adicionar um campo `tipoLead: inbound|outbound` separado em `leads` porque:
- Evita **dado duplicado que pode dessincronizar** (um lead poderia teoricamente ter `origem = "Anúncio"` e `tipoLead = "outbound"` por erro de digitação/seleção, uma inconsistência que uma FK única elimina por construção)
- É **zero digitação extra por lead** — o admin já escolhe a origem no CSV import/form hoje; com essa mudança, o inbound/outbound "vem de graça" junto, sem novo campo pra preencher em cada lead
- Reaproveita 100% o padrão de governança já validado e testado em produção (Fase 1: extensível, soft-delete, admin pode cadastrar livremente) — não é um padrão novo a aprender/manter, é o mesmo código já existente aplicado a uma segunda entidade
- Resolve diretamente o requisito do usuário de "o admin tagueia a origem manualmente no import/criação do lead, sem integração com plataforma de anúncio" — o admin só escolhe "de onde veio" de uma lista já classificada, exatamente como já faz hoje com sub-nicho

**Migração de dado existente:** leads já importados têm `origem` como texto livre — a migração precisa de um passo de "de-duplicação assistida" (agrupar valores parecidos, ex. "instagram" e "Instagram Ads", em uma origem governada), não um mapeamento 1:1 automático. Isso é trabalho real de fase (não uma migração trivial de schema) e deve ser considerado na estimativa de complexidade do item 1 do roadmap.

**Recomendação estendida (fora da pergunta original, mas mesma lógica):** considerar aplicar o mesmo padrão a `motivoPerda` como parte do item 5 (relatório de motivos de perda) — hoje é texto livre nullable; sem virar lista governada (mesmo que pequena e curada pelo admin, ex. "Preço", "Sem resposta", "Escolheu concorrente", "Timing"), o relatório de agregação vai fragmentar contagens por variação de digitação, esvaziando o valor do próprio relatório que o item 5 promete entregar.

## Minimal Data Model — Timeline de Interações

Modelo mínimo mas sólido, seguindo o padrão de mercado (Activity object ligado ao Contact/Deal) e o padrão já validado no projeto (tabela simples, sem over-normalização):

```
interacoes
  id            integer PK
  leadId        integer FK -> leads.id (required, ON DELETE CASCADE ou RESTRICT — seguir padrão do projeto)
  tipo          enum: "whatsapp_enviado" | "instagram" | "ligacao" | "nota" | "mudanca_etapa"
  automatico    boolean (default false) — true quando a linha foi criada pelo sistema
                (ex.: clique em "Abrir WhatsApp"), false quando digitada manualmente pelo admin
  resumo        text (nullable) — o que foi dito/aconteceu; para linhas automáticas pode ser
                preenchido com o nome/preview do template usado
  createdAt     timestamp, default now()
```

Pontos de design:
- **Não substitui `contactAttempts`** (contador na própria `leads`, Fase 6) — a timeline é um log complementar de eventos, o contador continua sendo a soma rápida usada no card do pipeline. Ambos são escritos no mesmo ponto de código (o handler de "Abrir WhatsApp"), evitando duplicar lógica de trigger.
- **Auto-população de custo zero:** o mesmo clique que já incrementa `contactAttempts` (Fase 6) pode inserir uma linha `tipo: "whatsapp_enviado", automatico: true` — nenhuma tela nova precisa existir para o caso de uso mais comum (o admin nem percebe que está "preenchendo" a timeline).
- **Mudança de etapa como entrada de timeline (opcional, mas de baixo custo):** o campo `stageChangedAt` já existe em `leads` (Fase 3) — logar `tipo: "mudanca_etapa"` no mesmo código que já escreve `stageChangedAt` dá uma timeline completa (contato + progresso de funil) num único componente de UI, em vez de duas fontes separadas.
- **Sem edição/exclusão de linhas antigas** — segue o princípio de log de eventos imutável (mesma filosofia de nunca fazer hard-delete já adotada no projeto para leads/sub-nichos). Erro de digitação em uma nota vira uma nova entrada de correção, não uma edição in-place.

## Feature Dependencies

```
[Origem governada (tabela `origens`, tipo inbound/outbound)]
    └──requires──> [padrão de governança já existente em `subnichos` (Fase 1)]

[Separação Inbound × Outbound]
    └──requires──> [Origem governada]
    └──enables──> [automação condicional (auto-avanço, "esfriando", sequência escalonada)
                    aplicar regras diferentes por tipo de origem]

[Timeline de interações]
    └──enhances──> [contador de tentativas de contato existente (Fase 6)]
    └──enhances──> [mudança de etapa (stageChangedAt existente, Fase 3) — pode virar
                    entrada automática na timeline]

[Sequência de follow-up escalonada]
    └──requires──> [Timeline de interações (para saber "sem resposta desde quando")]
    └──requires──> [templates.tipo "prova_valor" já existente (Fase 4)]
    └──enhances──> [Separação Inbound × Outbound (intervalos podem/devem diferir por tipo)]

[Painel de métricas por origem e sub-nicho]
    └──requires──> [Origem governada]
    └──requires──> [Timeline de interações ou, no mínimo, contador de tentativas confiável]

[Relatório de motivos de perda]
    └──requires──> [motivoPerda como lista governada (recomendado, não obrigatório
                    tecnicamente — funciona com texto livre, mas com qualidade inferior)]

[Temperatura derivada (quente/morno/frio)]
    └──requires──> [Origem governada + tipo inbound/outbound]
    └──requires──> [Tempo parado por etapa (já existe, Fase 7 — `configuracoes`/`stageChangedAt`)]
    └──requires──> [Contador de tentativas de contato (já existe, Fase 6)]
    └──conflicts com──> [Lead scoring por IA/ML — anti-feature, ver seção acima]

[Agenda/tarefas soltas]
    (nenhuma dependência dos itens acima — pode ser feita em paralelo/qualquer ordem)
```

### Dependency Notes

- **Separação Inbound×Outbound requires Origem governada:** sem lista controlada, não há como classificar "tipo" de forma confiável nem roteamento condicional sem risco de string mismatch (`"instagram"` vs `"Instagram"` vs `"insta"`).
- **Timeline enhances contador de tentativas e mudança de etapa:** ambos os dados já existem no schema (`contactAttempts`, `stageChangedAt`) — a timeline não precisa recriar esse dado, só precisa de uma tabela de eventos que os capture no momento em que acontecem (log de eventos, não substituição dos contadores/campos atuais).
- **Painel de métricas requires Timeline + Origem governada:** confirma a ordem já definida no roadmap do projeto (item 4 depois de 1 e 2) — métrica sobre dado sujo (`origem` livre) ou incompleto (sem histórico de interação) produz números que não sustentam decisão real.
- **Temperatura derivada requires os mesmos dados de #1 e #2, mas não requer nenhuma tabela nova própria** — por isso a resposta da Pergunta 1 é "baixa prioridade agora, custo quase zero depois".
- **Agenda/tarefas soltas não conflita nem depende de nada:** é a única feature deste milestone verdadeiramente independente — pode ser adiada para o fim (como já está no roadmap) sem custo de oportunidade técnico, só priorização de valor percebido.

## MVP Definition

### Launch With (v1.3 — este milestone, ordem já definida no `PROJECT.md`)

- [ ] Origem governada (tabela `origens` com `tipo: inbound|outbound`) — pré-requisito técnico do item 1, mesmo não estando listado como item separado no `PROJECT.md`; sem isso o item 1 vira "meia-solução" (campo novo desalinhado do `origem` existente)
- [ ] Separação Inbound × Outbound (comportamento condicional de automação) — muda comportamento do sistema antes de qualquer coisa que dependa de dado de origem confiável
- [ ] Timeline de interações por lead — histórico real, não só contador; auto-populável a custo baixo a partir do clique de WhatsApp já existente
- [ ] Sequência de follow-up escalonada + templates de prova social — resolve pendência antiga (2026-07-21), mas continua 100% manual no disparo (sem violar a decisão de não usar API paga)
- [ ] Painel de métricas por origem e sub-nicho — só depois que 1 e 2 estiverem entregando dado confiável
- [ ] Relatório de motivos de perda — quick win técnico, considerar de-duplicar/governar `motivoPerda` junto para não repetir o problema de `origem`
- [ ] Agenda/tarefas soltas — independente, pode entrar em qualquer ponto do milestone sem risco

### Add After Validation (v1.4 — gatilho: milestone atual concluído e em uso real)

- [ ] Temperatura derivada (quente/morno/frio) — trigger: itens 1 e 2 deste milestone já em produção real (não teórico) por pelo menos algumas semanas de uso, pra confirmar que a regra determinística bate com a percepção real do admin sobre quais leads são "quentes"
- [ ] Override manual de temperatura — trigger: só se o admin reportar que a regra derivada erra com frequência perceptível

### Future Consideration (v2+ — fora deste milestone e do próximo)

- [ ] Lead scoring por IA/ML — defer indefinidamente: não há volume/sinal de dado que justifique, e contraria a filosofia do projeto de manter tudo auditável/debugável por um agente de IA mantendo o código
- [ ] Disparo automático real de sequência de follow-up (sem clique) — defer até (se algum dia) o projeto reconsiderar a decisão de não usar WhatsApp Business API — está marcado como "Out of Scope" no `PROJECT.md`, não é uma questão de prioridade e sim de decisão de arquitetura já tomada

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Origem governada (`origens` + tipo) | HIGH | LOW | P1 |
| Separação Inbound × Outbound (automação condicional) | HIGH | MEDIUM | P1 |
| Timeline de interações por lead | HIGH | MEDIUM | P1 |
| Sequência de follow-up escalonada | MEDIUM-HIGH | MEDIUM-HIGH | P1 |
| Painel de métricas por origem/sub-nicho | MEDIUM | MEDIUM | P1 |
| Relatório de motivos de perda | MEDIUM | LOW | P1 |
| Governar `motivoPerda` (lista curada) | MEDIUM | LOW | P1 (empacotar junto do relatório) |
| Agenda/tarefas soltas | MEDIUM | LOW | P1 (baixo custo, pode entrar em qualquer ordem) |
| Temperatura derivada | MEDIUM | LOW (depois de P1s acima) | P2 |
| Override manual de temperatura | LOW | LOW | P3 |
| Lead scoring por IA/ML | LOW (para este porte) | HIGH | P3 (não recomendado) |

**Priority key:**
- P1: Este milestone (v1.3)
- P2: Logo em seguida (v1.4), custo baixo por reaproveitar dado do P1
- P3: Futuro distante / não recomendado neste porte de projeto

## Competitor Feature Analysis

CRMs de mercado usados como referência de padrão (não como concorrentes diretos — este é um projeto interno, não um produto para revenda; a análise serve só para calibrar "o que é table stakes de fato" vs. "o que é feature de time grande").

| Feature | HubSpot/Pipedrive (CRM de time) | Planilha Google Sheets (ferramenta atual) | Nossa Abordagem |
|---------|----------------------------------|--------------------------------------------|------------------|
| Lead source | Dropdown obrigatório, alimenta relatório de ROI de campanha (frequentemente integrado a Ads/Analytics) | Coluna de texto livre, sem padronização | Dropdown governado (`origens`), sem integração de plataforma de anúncio — classificação 100% manual pelo admin no import/criação, como pedido |
| Activity timeline | Log automático rico (emails, chamadas VoIP, reuniões de calendário) via integrações | Não existe — cada linha é o estado atual, sem histórico | Timeline simples: entradas manuais + auto-log no clique de WhatsApp (sem integrações de telefonia/calendário, fora de escopo) |
| Lead scoring | Modelo automatizado com decaimento por tempo, multi-sinal (comportamento web, engajamento de email) | Não existe | Regra determinística simples (origem + tempo parado + tentativas), sem ML, sem sinais de engajamento digital que este projeto não coleta |
| Loss reason reporting | Dashboard com win-rate, motivo por segmento, por rep | Não existe | Tabela agrupada simples por motivo (lista curada), sem dimensão de "rep" (não há time) |
| Follow-up cadence | Sequências de email/task totalmente automatizadas, multi-touch, multi-canal | Não existe — reagendar é manual e esquecido com frequência (dor central do projeto) | Cálculo assistido do próximo follow-up sugerido + template pronto, disparo continua manual via `wa.me` |
| Standalone tasks | Módulo de "Tasks" completo, com atribuição/prioridade/recorrência (times) | Não existe | Lista plana título+data, sem atribuição (usuário único) |

## Sources

- WebSearch: "CRM lead source inbound outbound field enum best practice small business" — [nimble.com](https://www.nimble.com/blog/best-lead-capturing-crms-for-small-businesses/), [default.com](https://www.default.com/post/crm-best-practices), [quo.com](https://www.quo.com/blog/inbound-lead-management/), [oktopost.com](https://www.oktopost.com/blog/inbound-vs-outbound-leads/) — MEDIUM confidence (múltiplas fontes convergentes sobre "lead source field" como padrão básico, nenhuma fonte única de autoridade máxima)
- WebSearch: "CRM activity timeline data model interaction log schema design" — [geeksforgeeks.org](https://www.geeksforgeeks.org/dbms/how-to-design-a-relational-database-for-customer-relationship-management-crm/), [lowcode.agency](https://www.lowcode.agency/blog/custom-crm-objects-data-modeling), [dragonflydb.io](https://www.dragonflydb.io/databases/schema/crm), [mriacrm.com](https://mriacrm.com/crm-data-model-explained-contacts-companies-deals-and-beyond/) — MEDIUM-HIGH confidence (modelo "Contacts/Companies/Deals/Activities" é consenso amplo e estável em design de CRM, não é tendência recente)
- WebSearch: "lead scoring temperature hot warm cold manual vs automatic CRM small business" — [teamgate.com](https://www.teamgate.com/blog/score-leads-crm-step-by-step-guide/), [tomba.io](https://tomba.io/blog/cold-warm-hot-leads), [nimble.com](https://www.nimble.com/blog/crm-best-practices-for-lead-scoring-qualification/) — MEDIUM confidence (faixas numéricas variam por fonte, mas o padrão "score → faixa quente/morno/frio" e a distinção manual-vs-automático são consistentes)
- WebSearch: "escalating follow-up cadence sequence CRM days interval sales solo" — [instantly.ai](https://instantly.ai/blog/sales-follow-up-cadence-playbook/), [marketbetter.ai](https://marketbetter.ai/blog/2026/02/22/sales-cadence-examples/), [pipedrive.com](https://www.pipedrive.com/en/blog/sales-cadence) — MEDIUM confidence (intervalos variam por fonte/segmento; usado aqui só para confirmar o padrão geral de "intervalos crescentes configuráveis", não para copiar números exatos)
- WebSearch: "CRM lost reason report loss reason analysis small business dashboard" — [onepagecrm.com](https://www.onepagecrm.com/blog/reason-lost-deal/), [nethunt.com](https://nethunt.com/blog/reasons-for-lost-sales-opportunities/), [capsulecrm.com](https://capsulecrm.com/blog/lost-reasons/) — MEDIUM-HIGH confidence (a recomendação "picklist controlado, não texto livre" aparece de forma consistente e é a base direta da resposta à Pergunta de Avaliação 2)
- WebSearch: "solo founder CRM overkill features avoid automation complexity single user" — [getcoherence.io](https://getcoherence.io/blog/solo-founder-crm-comparison-guide-2026), [pipedrive.com](https://www.pipedrive.com/en/blog/best-crm-for-solopreneurs), [fluidcrm.io](https://fluidcrm.io/blog/crm-for-solo-founders/) — MEDIUM confidence (guias de "melhor CRM para founder solo" de 2026, convergem na recomendação de simplicidade e adiar automação/IA)
- Leitura direta do código do projeto: `src/db/schema.ts` (schema atual de `leads`, `subnichos`, `templates`, `configuracoes`) e `.planning/todos/pending/*.md` (raciocínio original do usuário por trás de cada item) — HIGH confidence (fonte primária, não inferência)

---
*Feature research for: CRM pessoal de leads — área da saúde (milestone v1.3)*
*Researched: 2026-08-01*
