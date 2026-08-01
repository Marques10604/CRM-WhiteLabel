# Pitfalls Research

**Domain:** Adicionar 6 features (Inbound×Outbound, timeline de interações, sequência de follow-up escalonada, painel de métricas, relatório de motivos de perda, agenda/tarefas soltas) a um CRM solo Next.js 16 + Drizzle/SQLite já em produção real, sem cron/job runner, host de 4GB RAM, `drizzle-kit push` (não `generate`) contra um arquivo `.db` local com dados reais
**Researched:** 2026-08-01
**Confidence:** HIGH (achados verificados diretamente no código-fonte e nos dados reais do `data/crm.db` deste projeto — não é pesquisa genérica de CRM)

## Fatos do Código/Dados Que Mudam o Formato Deste Trabalho

Antes dos pitfalls: fatos coletados direto do repositório e do banco local que corrigem suposições implícitas no milestone e devem orientar como as fases são desenhadas.

1. **`origem` já tem dados reais inconsistentes.** Query direta em `data/crm.db` (`SELECT origem, COUNT(*) FROM leads GROUP BY origem`) retorna hoje: `"Importação CSV"` (28 linhas — default do wizard de import, `CSV_DEFAULTS.origem` em `src/lib/csv-import.ts:53`), `"Teste"` (3 linhas) e `"insta"` (2 linhas, digitado à mão, minúsculo). O campo é um `<Input>` de texto livre (`lead-form-dialog.tsx:247`) validado só por `z.string().trim().min(1)` (`validations.ts:29`) — não há governança nenhuma hoje. Qualquer plano de "virar enum" precisa lidar com essas 3 variantes reais, não com um schema limpo hipotético.
2. **`motivoPerda` tem o mesmo problema, adormecido.** É `text("motivo_perda")` nullable, preenchido opcionalmente ao mover lead para "Perdido" (D-03), sem nenhum controle de vocabulário — exatamente o mesmo padrão "free text sem governança" do `origem`, só que ninguém percebeu ainda porque não existe relatório que agregue por ele. Feature #5 (relatório de motivos de perda) vai expor esse problema no primeiro dia.
3. **O padrão "computa na leitura, nunca agenda" já existe e funciona.** O "esfriando" (Fase 6/7) não é um job, não é um trigger, não é um valor armazenado: `src/app/pipeline/page.tsx` lê `stageChangedAt` + `getConfiguracoes()` a cada request e calcula `differenceInDays(new Date(), lead.stageChangedAt) >= limite` na hora. Nada "dispara sozinho" — o cálculo só acontece quando alguém abre `/pipeline`. Esse é o único padrão de "automação" que este app já validou em produção, e a sequência escalonada (feature #3) deve copiá-lo, não inventar um scheduler novo.
4. **`contactAttempts` conta cliques de QUALQUER template, nunca zera.** Comentário no schema é explícito: "acumula pela vida do lead, nunca zera ao mudar de etapa" (WA-08/D-04). Não é um índice de "em qual tentativa da sequência de follow-up este lead está" — é um odômetro vitalício, incrementado em `lead-actions.ts:239` em todo clique de "Abrir WhatsApp", inclusive o primeiro contato.
5. **O guard automatizado anti-hard-delete só conhece `leads` e `subnichos`.** `scripts/guard-no-hard-delete.cjs` tem os padrões `CODE_PATTERNS`/`CODE_SQL_PATTERNS` hardcoded para essas duas tabelas (linhas 49 e 55-60), por decisão deliberada de escopo (comentário linha 45-48: "NÃO um bloqueio genérico"). A regra do projeto ("nunca hard-delete, toda entidade removível") é uma convenção documentada no `PROJECT.md`, mas o *enforcement automatizado* não se estende sozinho a tabelas novas — `interacoes` e `tarefas` (features #2 e #6) precisam ser adicionadas manualmente ao guard, ou ficam sem essa proteção apesar de a regra do projeto dizer que se aplica a elas.
6. **WAL mode e foreign keys já estão ligados** (`src/db/client.ts:6,9`) — a base técnica para consultas concorrentes leitura/escrita e integridade referencial já existe; não é algo a configurar do zero nestas features.

## Critical Pitfalls

### Pitfall 1: Retrofit de `origem` para enum sem plano de backfill explícito

**What goes wrong:**
Tentar transformar a coluna `origem` (ou adicionar uma nova coluna governada, ex. `origemTipo` enum `inbound`/`outbound`) direto via `drizzle-kit push`, assumindo que os dados existentes vão "simplesmente" se encaixar. Em SQLite, adicionar um `CHECK`/enum simulado numa tabela com linhas existentes força o Drizzle a reconstruir a tabela inteira (criar nova, copiar dados, apagar antiga, renomear). Se qualquer linha existente violar o novo `CHECK`, o passo de cópia falha e o `push` aborta no meio — e como o projeto já usa `push` (não `generate`), não existe um arquivo de migração versionado para revisar antes de rodar, nem uma migration anterior "limpa" para reverter para (o snapshot de migração já está divergente, per contexto do milestone).

**Why it happens:**
O schema atual (`src/db/schema.ts`) não tem nenhuma coluna de enum com dados pré-existentes desalinhados — `stage`, `canal`, `tipo` (templates) nasceram todos já como enum, sem retrofit. Este é o primeiro enum retrofit do projeto; não existe precedente local para copiar, e é fácil escrever a migração pensando só no schema-alvo, esquecendo que o `data/crm.db` já tem `"Importação CSV"`, `"Teste"` e `"insta"` — nenhuma das três é claramente "inbound" ou "outbound" sem uma regra de mapeamento explícita.

**How to avoid:**
1. Antes de tocar no schema, rodar a query de distinct values contra `data/crm.db` (feito nesta pesquisa: 3 valores, 33 linhas) e decidir explicitamente o mapeamento de cada um.
2. Não reaproveitar a coluna `origem` free-text para virar o enum. Adicionar uma coluna nova (`origemTipo` ou nome equivalente), nullable ou com `.default()` explícito, mantendo `origem` como está (rótulo livre continua útil para o cowork/CSV). Isso elimina o risco de `push` falhar por violação de `CHECK` em dado existente, porque a coluna nova nasce sem constraint quebrada — o enum se aplica só a valores novos.
3. Rodar um script de backfill explícito (não confiar em default silencioso) que classifica as 33 linhas atuais com uma regra documentada (ex.: tudo que veio de `importBatchId` não-nulo = outbound, porque é lead do cowork que o admin aborda por iniciativa própria; entradas manuais tipo "insta" ficam pendentes de revisão humana, não adivinhadas).
4. Como não há migration history confiável, testar o `push` primeiro contra uma cópia do arquivo (`copy data\crm.db data\crm.db.bak` no PowerShell) antes de rodar contra o banco que o admin usa de verdade.

**Warning signs:**
`drizzle-kit push` reportar um passo de "recreate table" para `leads` sem que isso tenha sido esperado; qualquer linha após a migração com `origemTipo` null quando a UI assume não-null; total de leads na Kanban divergindo do total antes da migração (sinal de que a reconstrução de tabela perdeu linhas).

**Phase to address:**
Feature #1 (Separação Inbound × Outbound).

---

### Pitfall 2: Derivar Inbound/Outbound fazendo parsing do texto livre existente em vez de um campo explícito

**What goes wrong:**
Uma tentação natural, dado que `origem` já existe, é "inferir" inbound/outbound automaticamente checando se a string contém `"insta"`, `"anúncio"`, `"tráfego"`, etc. Isso parece economizar uma migração, mas é frágil: quebra silenciosamente assim que o cowork mandar um CSV com uma coluna de origem escrita diferente, ou o admin digitar algo novo no formulário manual — e ninguém percebe, porque não há erro, só uma classificação errada (exatamente o "bug silencioso, sem erro, só oportunidade perdida" que o próprio problem statement da feature #1 descreve para o cenário sem separação nenhuma).

**Why it happens:**
`origem` já existe e "parece" carregar essa informação, então classificar por string matching parece um atalho razoável para não adicionar coluna nova. Mas o campo foi desenhado (e usado até hoje) como rótulo livre de exibição, não como fonte de verdade de uma decisão de comportamento do sistema.

**How to avoid:**
Inbound/Outbound deve ser um campo explícito, com um controle de UI explícito (dropdown/toggle no formulário, não inferido), e um default deliberado e documentado por ponto de entrada: import CSV do cowork = outbound por padrão (é lista que o admin aborda por iniciativa própria); criação manual = admin escolhe explicitamente, sem default "adivinhado" a partir do texto de `origem`. Nunca escrever um `if (origem.includes(...))` como lógica de negócio.

**Warning signs:**
Qualquer `.includes()`/regex sobre `leads.origem` em código de automação (auto-avanço, esfriando, sequência escalonada) — isso é sinal de que a classificação está sendo inferida em vez de lida de um campo governado.

**Phase to address:**
Feature #1 (Separação Inbound × Outbound).

---

### Pitfall 3: Relatório de motivos de perda sobre um campo que ainda é texto livre

**What goes wrong:**
`motivoPerda` é `text` nullable, preenchido à mão desde a Fase 3, sem nenhum controle de vocabulário — o mesmo problema do `origem`, só que ainda não descoberto porque nunca foi agregado. Construir o relatório da feature #5 direto em cima dele, agrupando por igualdade de string exata, vai produzir uma cauda longa de "motivos" quase-duplicados ("sem verba", "Sem orçamento", "não tinha dinheiro") em vez de categorias úteis — um relatório que parece pronto mas não serve para identificar padrão nenhum, o problema exato que a feature #5 existe para resolver.

**Why it happens:**
O campo foi implementado na Fase 3 como um campo de nota opcional, sem que houvesse (ainda) um consumidor que dependesse de agregação — só virou um problema quando outro item do backlog (o relatório) tenta consumi-lo de um jeito que o campo nunca foi desenhado para suportar.

**How to avoid:**
Antes de construir o relatório, decidir se `motivoPerda` vira um enum governado com opção "Outro" + texto livre complementar (mesmo padrão de retrofit do Pitfall 1 — nova coluna, backfill explícito das linhas antigas, sem tentar auto-classificar o texto livre já existente) ou, no mínimo, se o relatório normaliza (trim + lowercase) e agrupa "não especificado" separadamente das entradas reais. Não construir o relatório assumindo que a string já está limpa.

**Warning signs:**
Relatório com dezenas de linhas de contagem = 1; nenhuma categoria representando mais de ~20% dos leads perdidos (sinal de fragmentação, não de motivos genuinamente diversos).

**Phase to address:**
Feature #5 (Relatório de motivos de perda) — mas a decisão de governar ou não o campo deveria ser tomada antes, idealmente perto da feature #1 (mesma classe de problema).

---

### Pitfall 4: Tratar a "sequência de follow-up escalonada" como se fosse um scheduler ativo

**What goes wrong:**
O nome "sequência escalonada" convida a pensar em termos de "o sistema detecta automaticamente que não houve resposta e reagenda sozinho" — mas este é um app request-driven, sem cron, sem job runner, sem deploy público (decisão já tomada: só local, sem deploy). Nada roda a menos que uma página seja carregada ou o admin clique em algo. Se o design assumir que o "próximo follow-up" vai "avançar sozinho" com o tempo, ele nunca vai avançar — porque não existe processo nenhum rodando em background para perceber que o prazo passou.

**Why it happens:**
"Sequência escalonada" e "reagendar automaticamente" soam como comportamento passivo/temporal, quando na prática a única coisa que este app pode fazer é *recalcular*, no momento em que alguém olha a tela ou confirma uma ação, o que o próximo intervalo deveria ser — exatamente como o "esfriando" já funciona (Fato #3 acima). É fácil desenhar a feature nova sem notar que ela está pedindo implicitamente um comportamento que o app inteiro não tem em nenhum outro lugar.

**How to avoid:**
Copiar o padrão já validado do "esfriando": a data de próximo follow-up é sempre um campo armazenado e editável (`followUpDate`, já existe), e a "escalada" só decide *qual valor escrever nele* — calculado de forma síncrona dentro de uma Server Action, disparada por uma ação explícita do admin (ex.: botão "sem resposta, agendar próximo contato" na tela do lead), nunca por um timer. O painel de follow-up vencidos/hoje/próximos-7-dias que já existe (`groupLeadsByUrgency`) continua sendo o único mecanismo de "lembrete" — a feature nova decide a data, não decide *quando notificar* (isso já é resolvido pelo dashboard existente).

**Warning signs:**
Qualquer menção em spec/código a "detectar automaticamente falta de resposta", "disparar reagendamento no dia N", ou expectativa de que um badge mude de estado sem o admin ter aberto o app naquele dia.

**Phase to address:**
Feature #3 (Sequência de follow-up escalonada).

---

### Pitfall 5: Reaproveitar `contactAttempts` como índice da sequência escalonada

**What goes wrong:**
`contactAttempts` parece, à primeira vista, o campo natural para saber "em qual passo da sequência escalonada este lead está" (tentativa 1 → intervalo A, tentativa 2 → intervalo B...). Mas ele conta *todo* clique de "Abrir WhatsApp" na vida do lead — inclusive o primeiro contato, inclusive re-envios do mesmo template, inclusive cliques que nada têm a ver com a lógica de reabordagem por falta de resposta (Fato #4 acima). Usar esse número para indexar os intervalos da sequência faz um lead "pular" passos da escalada sempre que o admin reenviar qualquer mensagem por qualquer motivo, e nunca reflete de fato "quantas vezes tentei reabordar sem resposta".

**Why it happens:**
É o único contador que já existe no schema, e reaproveitar código/campo existente parece mais simples do que adicionar um novo — mas os dois contam coisas semanticamente diferentes (D-04 já documenta isso para o propósito original do campo, e essa nota não necessariamente é vista por quem projeta a feature nova).

**How to avoid:**
Introduzir um campo próprio para a sequência (ex.: `followUpSequenceStep`, incrementado *apenas* pela ação explícita "sem resposta, agendar próximo" descrita no Pitfall 4), independente de `contactAttempts`. Os dois contadores devem poder divergir livremente sem que isso seja um bug.

**Warning signs:**
Código novo lendo `lead.contactAttempts` para decidir o próximo intervalo de follow-up; um lead que recebeu 2 mensagens de "primeiro contato" reenviadas manualmente pulando direto para o 3º intervalo da sequência sem nunca ter ficado sem resposta de fato.

**Phase to address:**
Feature #3 (Sequência de follow-up escalonada).

---

### Pitfall 6: Guard automatizado anti-hard-delete não protege as tabelas novas por padrão

**What goes wrong:**
A regra do projeto ("nunca hard-delete, toda entidade removível usa soft-delete") é documentada como permanente no `PROJECT.md`, mas o enforcement automatizado (`npm run guard:no-hard-delete`) só varre por `.delete(leads...)` e `.delete(subnichos...)` — literal, hardcoded (`scripts/guard-no-hard-delete.cjs:49,55-60`). Uma tabela nova `interacoes` (feature #2) ou `tarefas` (feature #6) pode ganhar um botão "excluir" implementado com `db.delete(interacoes)...` ou `DELETE FROM tarefas` cru, e o guard passa verde mesmo assim — dando falsa sensação de que a convenção do projeto está sendo automaticamente protegida quando, na prática, ninguém está checando essas duas tabelas novas.

**Why it happens:**
O guard foi escopado deliberadamente só a `leads`/`subnichos` na Fase 1 (comentário explícito no próprio script: "não é um bloqueio genérico"), o que foi uma decisão correta *naquele momento* (outras tabelas, como `templates`, legitimamente têm hard-delete próprio, D-13). Mas isso significa que toda tabela nova que deveria seguir a política de soft-delete precisa de uma decisão explícita e de uma linha nova no guard — não acontece automaticamente.

**How to avoid:**
Ao desenhar `interacoes` e `tarefas`, decidir explicitamente (e documentar, tipo D-13) se cada uma segue soft-delete (`deletedAt`) ou tem hard-delete legítimo — e, se soft-delete, adicionar os padrões correspondentes (`/\.delete\(\s*interacoes\b/`, `/\.delete\(\s*tarefas\b/`, mais os equivalentes de SQL cru) em `CODE_PATTERNS`/`CODE_SQL_PATTERNS` no mesmo commit que cria a tabela — não depois.

**Warning signs:**
`npm run guard:no-hard-delete` passando (exit 0) mesmo depois de adicionar código de exclusão para `interacoes`/`tarefas` — isso não é sinal de que o código está correto, é sinal de que o guard ainda não sabe que essas tabelas existem.

**Phase to address:**
Feature #2 (Timeline de interações) e Feature #6 (Agenda/tarefas soltas) — cada uma no momento em que sua tabela é criada.

---

### Pitfall 7: Agregações de métricas via N+1 (loop por sub-nicho/origem) e/ou esquecendo o filtro `deletedAt`

**What goes wrong:**
Duas variantes do mesmo erro ao construir o painel de métricas (feature #4) e o relatório de motivos de perda (feature #5):
(1) Montar a matriz sub-nicho × origem × etapa iterando em JS — `for (subnicho of subnichos) { for (origem of origens) { query... } }` — em vez de uma única query `GROUP BY`. Cada query individual é barata neste volume (poucos milhares de leads), mas o padrão diverge do único precedente de agregação que o projeto já tem (o cálculo de "esfriando" processa uma única lista já carregada, em memória, não uma query por lead) e cresce em número de round-trips a cada sub-nicho/origem nova cadastrada.
(2) Esquecer de filtrar `isNull(leads.deletedAt)` na query de agregação. Toda query "de verdade" hoje no projeto filtra soft-deleted (`getActiveDashboardLeads`, os índices `leads_deleted_at_idx`) — mas é fácil escrever uma nova query de métrica direto contra `leads` sem lembrar desse filtro, porque, ao contrário do dashboard de follow-up, uma query de contagem/agregação não "quebra" visivelmente se incluir lixeira — ela só produz um número sutilmente errado (leads apagados contando como reais no relatório de perda ou no painel de origem), que o admin não tem como perceber sem conferir manualmente.

**Why it happens:**
Métricas agregadas são o primeiro caso no projeto em que várias entidades (sub-nichos × origens × etapas) precisam ser cruzadas de uma vez — não existe precedente local de `GROUP BY` para copiar, ao contrário do padrão de soft-delete, que é onipresente mas fácil de esquecer justamente por estar implícito em vez de forçado por tipo/constraint.

**How to avoid:**
Uma única query por seção do painel, usando `groupBy` do Drizzle (`db.select({ origemTipo: leads.origemTipo, count: count() }).from(leads).where(isNull(leads.deletedAt)).groupBy(leads.origemTipo)`), pivotada em JS/UI só depois de já ter os totais agregados pelo banco. Sempre incluir `isNull(leads.deletedAt)` explicitamente em toda query nova de métrica/relatório — não herdar por acidente de uma função existente que talvez não a tenha.

**Warning signs:**
Página de métricas com tempo de carregamento crescendo proporcionalmente ao número de sub-nichos cadastrados (sinal de N+1); total de leads no painel de métricas maior que o total visível em `/pipeline` ou `/leads` (sinal de estar contando leads na lixeira).

**Phase to address:**
Feature #4 (Painel de métricas) e Feature #5 (Relatório de motivos de perda).

---

## Technical Debt Patterns

Atalhos que parecem razoáveis mas criam problema depois.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hardcodar os intervalos da sequência escalonada (ex. `[4, 10, 20]`) direto no código em vez de configurável em `/configuracoes` | Entrega a feature #3 mais rápido, sem tela nova | Repete exatamente o erro que a Fase 7 já corrigiu (o "esfriando" hardcoded em 5 dias só na etapa Contatado) — o admin já pediu explicitamente "intervalos crescentes configuráveis" no todo original; hardcode aqui é reintroduzir a mesma dívida que acabou de ser paga | Só como spike descartável para validar o cálculo antes de desenhar a tela — nunca como entrega final |
| Gravar a nova interação e atualizar `contactAttempts`/`stage` em duas chamadas separadas (`db.insert` seguido de `db.update`) em vez de uma transação (`db.transaction`) | Menos código para escrever no primeiro corte | Se a segunda chamada falhar (ex. constraint, processo interrompido), a timeline registra uma interação que não bate com o estado real do lead — histórico mentiroso é pior que histórico ausente | Nunca, quando as duas escritas representam o mesmo evento de negócio (ex. "clique em WhatsApp" gerando tanto a interação quanto o incremento do contador) |
| Deixar `origemTipo`/classificação de motivo de perda como `null` permanente para os 33 leads já existentes, sem backfill explícito | Evita decidir a regra de mapeamento agora | Painel de métricas (#4) e relatório de perda (#5) nascem com uma fatia "não classificado" que nunca some sozinha, distorcendo os primeiros relatórios que o admin vai olhar | Aceitável só se o painel exibir "não classificado" como categoria visível e explícita — nunca se for silenciosamente excluído do total |

## Integration Gotchas

Não há integrações externas novas neste milestone (sem API paga de WhatsApp, sem deploy público) — a "integração" real é com as próprias ferramentas de banco/migração do projeto.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| `drizzle-kit push` contra `data/crm.db` (banco com dados reais, snapshot de migração já divergente) | Rodar `push` direto no arquivo que o admin usa para prospectar, sem cópia de segurança, assumindo que o diff vai ser exatamente o esperado | Copiar `data/crm.db` antes de qualquer `push` que altere `leads`/`origem`/`motivoPerda`; inspecionar o plano de alteração que o `push` mostra antes de confirmar, especialmente se ele mencionar "recreate table" |
| Link `wa.me` + fluxo de sequência escalonada | Assumir que "enviar a próxima mensagem da sequência" pode ser automatizado a partir do backend (contraria decisão já tomada: sem API paga, sempre clique manual) | A sequência escalonada só decide *quando sugerir* e *qual template sugerir* — o envio continua 100% manual via link `wa.me`, igual a hoje |

## Performance Traps

Padrões que funcionam na escala atual mas merecem atenção se o volume crescer.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Tabela `interacoes` sem índice em `leadId` (e em `(leadId, createdAt)` para ordenação da timeline) | Nenhum sintoma perceptível na escala atual (poucas dezenas de milhares de linhas é trivial para SQLite/WAL) — o risco é convenção, não performance real hoje | Seguir a convenção já estabelecida no schema (todo FK relevante tem índice: `leads_subnicho_id_idx`, `leads_import_batch_id_idx`) — custo zero de adicionar agora, evita ter que lembrar depois | Só viraria sintoma perceptível em dezenas/centenas de milhares de interações — muito acima da escala real deste projeto (CRM solo, poucos milhares de leads) |
| Server Components irmãos na mesma página de dashboard/métricas chamando a mesma função de query (ex. `getConfiguracoes()`) de forma independente | Múltiplos round-trips idênticos ao banco na mesma requisição, sem que apareça erro nenhum | Envolver funções de leitura compartilhadas com `React.cache()` (padrão nativo do App Router) quando o painel de métricas tiver múltiplas seções lendo os mesmos dados base | Só relevante quando o painel de métricas (#4) tiver várias seções/gráficos na mesma página — não é um problema hoje porque não existe essa página ainda |
| Adicionar camada de cache (`unstable_cache`, camada de agregação materializada) para o painel de métricas "por precaução" | Parece proativo/robusto | Complexidade e um novo caminho de invalidação de cache para manter, sem benefício real num app solo local com poucos milhares de linhas — SQLite com WAL já responde queries agregadas simples na casa de milissegundos nesta escala | Nunca vale a pena nesta escala — YAGNI explícito; revisitar só se o app deixar de ser single-admin |

## Security Mistakes

Problemas específicos do domínio, além do básico de segurança web (app é local/single-admin, sem auth por decisão — ver `CLAUDE.md`).

| Mistake | Risk | Prevention |
|---------|------|------------|
| Tabelas novas (`interacoes`, `tarefas`) ganharem exclusão hard-delete sem que o guard automatizado saiba disso (ver Pitfall 6) | Perda permanente e silenciosa de histórico de interação com lead de saúde — dado que o projeto trata como nunca-descartável por padrão | Adicionar as tabelas novas ao guard no mesmo commit que as cria, não depois; rodar `npm run guard:no-hard-delete` como parte da checklist de verificação de cada uma dessas duas features |
| Texto livre de `interacoes` (o que foi dito na conversa) acumulando informação sensível de saúde sem que isso seja uma decisão consciente | Nenhum vetor de exposição externo hoje (app local, sem deploy, sem auth por decisão) — mas se o backlog "Conectar landing page pública" ou export CSV (ambos fora deste milestone) avançarem no futuro, esse texto livre vira o primeiro dado sensível exposto | Não é ação necessária *neste* milestone — só uma nota para quando (se) a feature de export/deploy público for retomada, para não tratar `interacoes` como "só notas soltas sem sensibilidade" |

## UX Pitfalls

Erros de experiência específicos destas 6 features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Temperatura automática (quente/morno/frio, item de backlog PME relacionado, deriva de origem + tempo parado) reclassificando leads em massa e silenciosamente sempre que o admin edita `diasParadoContatado`/`diasParadoNovo`/`diasParadoNegociacao` em `/configuracoes` | Um print de tela feito hoje para Instagram (motivo comercial explícito do backlog) pode não bater com o que a tela mostra amanhã sem que o admin tenha tocado em nenhum lead — sensação de "número mentiu" | Se/quando a temperatura for construída, tratá-la como valor 100% derivado e recalculado na leitura (mesmo padrão do "esfriando"), nunca como coluna armazenada editável — e deixar visível, perto do badge, a regra que gerou aquela classificação (ex. tooltip "quente: outbound + contatado há 2 dias"), para a mudança nunca parecer arbitrária |
| Misturar campo derivado (temperatura, esfriando) com campo editável manualmente na mesma coluna do banco | Uma vez que o admin "corrige" manualmente um valor derivado, ele para de se atualizar sozinho e o admin esquece que aquele lead específico ficou "congelado" para sempre naquele estado | Nunca sobrepor: campos derivados nunca ganham um input de edição manual. Se o admin discorda da classificação automática, a correção é ajustar o sinal de entrada (ex. mudar a etapa, mudar `origemTipo`), não escrever por cima do resultado |
| Sequência escalonada sugerindo a próxima data mas exigindo que o admin digite a data manualmente de novo no formulário em vez de um botão de um clique que já aplica o valor calculado | Fricção reintroduzida exatamente onde a feature promete eliminar fricção (a mesma lógica de "nunca mais perder follow-up" que já motivou o projeto inteiro) | Botão "aplicar próxima data sugerida" que grava direto via Server Action, com a data ainda editável depois se o admin quiser ajustar — sugestão como padrão, nunca como obrigação |

## "Looks Done But Isn't" Checklist

- [ ] **Separação Inbound × Outbound:** Frequentemente falta conectar o campo novo às automações existentes — verificar que auto-avanço de etapa, cálculo de "esfriando" e a futura sequência escalonada de fato leem `origemTipo` e mudam de comportamento, não só que o campo existe e é exibido decorativamente na tela.
- [ ] **Separação Inbound × Outbound:** Frequentemente falta backfill dos 33 leads já existentes — verificar que não sobra nenhum lead com `origemTipo` null sem que isso seja uma categoria visível ("não classificado") em vez de invisível.
- [ ] **Timeline de interações:** Frequentemente falta a tabela nova no guard `guard:no-hard-delete` — verificar rodando o guard depois de implementar qualquer exclusão de interação.
- [ ] **Timeline de interações:** Frequentemente falta atomicidade entre gravar a interação e atualizar `contactAttempts`/`stage` no mesmo evento de clique de WhatsApp — verificar que ambas as escritas estão na mesma transação/query, não em duas chamadas separadas que podem divergir se uma falhar.
- [ ] **Sequência de follow-up escalonada:** Frequentemente parece "automática" na demonstração mas na verdade só recalcula quando o admin clica em algo — verificar explicitamente que não há expectativa (na spec, na UI, no texto ao admin) de que o sistema "vai lembrar sozinho" sem o app estar aberto.
- [ ] **Sequência de follow-up escalonada:** Frequentemente os intervalos ficam hardcoded "por enquanto" e nunca viram tela de configuração — verificar que existe alguma forma de o admin editar os intervalos sem mexer em código, replicando o padrão de `/configuracoes` já existente.
- [ ] **Painel de métricas por origem e sub-nicho:** Frequentemente soma leads da lixeira (soft-deleted) sem ninguém perceber — verificar que toda query do painel filtra `isNull(deletedAt)` e que o total do painel bate com o total visível em `/pipeline`.
- [ ] **Relatório de motivos de perda:** Frequentemente lista dezenas de "motivos" quase-idênticos por vir de texto livre não normalizado — verificar que a decisão de governar (ou normalizar) `motivoPerda` foi tomada antes de considerar o relatório pronto.
- [ ] **Agenda/tarefas soltas:** Frequentemente esquece se a tabela `tarefas` segue ou não a política de soft-delete do projeto (a regra diz "toda entidade removível", mas isso exige uma decisão explícita, não é automático) — verificar que existe uma decisão documentada (tipo D-XX) e, se for soft-delete, que o guard cobre a tabela nova.

## Recovery Strategies

Quando o pitfall acontece mesmo com prevenção, como recuperar.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| `drizzle-kit push` falhou/corrompeu dados ao adicionar enum em `leads` (Pitfall 1) | LOW (se houver backup) / HIGH (se não) | Restaurar `data/crm.db` a partir da cópia feita antes do `push` (`copy data\crm.db.bak data\crm.db`); reexecutar o `push` com a coluna nova nullable/com default em vez de reaproveitar `origem` diretamente |
| Guard não cobriu `interacoes`/`tarefas` e um hard-delete real já foi commitado e executado (Pitfall 6) | MEDIUM | Se soft-delete: adicionar `deletedAt` retroativamente e migrar o código de exclusão antes de mais dados serem perdidos; dados já hard-deletados antes da correção não são recuperáveis (sem backup) — comunicar isso ao admin explicitamente, não silenciar |
| Relatório de motivos de perda lançado já fragmentado por texto livre (Pitfall 3) | LOW | Não é preciso refazer o relatório — normalizar/agrupar os valores existentes com um script de mapeamento (trim+lowercase+dicionário de sinônimos) rodado uma vez sobre os dados atuais, e só depois decidir se vale a pena governar o campo para frente |
| `contactAttempts` foi usado por engano como índice de sequência escalonada e já está em produção (Pitfall 5) | MEDIUM | Introduzir o campo novo (`followUpSequenceStep`) começando do zero para todos os leads a partir da data da correção — não tentar reconstruir retroativamente "quantos follow-ups sem resposta" cada lead teve a partir de `contactAttempts`, porque essa informação nunca existiu de forma confiável nele |

## Pitfall-to-Phase Mapping

Como as fases do roadmap devem endereçar estes pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Retrofit de `origem` sem backfill (Pitfall 1) | Feature #1 (Inbound × Outbound) | Query de distinct values rodada e documentada antes do `push`; nenhuma linha com classificação null após a migração sem isso ser intencional e visível |
| Classificação por parsing de string livre (Pitfall 2) | Feature #1 | Busca por `.includes()`/regex sobre `leads.origem` em código de automação — deve retornar zero ocorrências |
| Relatório de perda sobre campo não-governado (Pitfall 3) | Feature #5 (mas decisão a tomar já na Feature #1, mesma classe de problema) | Distribuição do relatório revisada manualmente pelo admin antes de considerar a fase concluída — nenhuma categoria "estranhamente fragmentada" |
| Sequência tratada como scheduler ativo (Pitfall 4) | Feature #3 (Sequência de follow-up escalonada) | Nenhuma menção, em spec/UI/copy, a comportamento que dependa do app estar fechado/em background |
| `contactAttempts` reaproveitado como índice de sequência (Pitfall 5) | Feature #3 | Campo novo dedicado existe e é usado; `contactAttempts` não aparece em nenhuma lógica de cálculo de próximo intervalo |
| Guard não cobre tabelas novas (Pitfall 6) | Feature #2 (Timeline) e Feature #6 (Agenda/tarefas) | `npm run guard:no-hard-delete` atualizado no mesmo commit que cria cada tabela nova, com padrões cobrindo-a |
| Agregação N+1 / esquecer `deletedAt` (Pitfall 7) | Feature #4 (Painel de métricas) e Feature #5 (Relatório de perda) | Cada seção do painel/relatório corresponde a uma única query `GROUP BY`; total do painel bate com total ativo do `/pipeline` |

## Sources

- Leitura direta do código-fonte deste projeto: `src/db/schema.ts`, `src/db/queries.ts`, `src/db/client.ts`, `src/actions/lead-actions.ts`, `src/app/pipeline/page.tsx`, `src/lib/csv-import.ts`, `src/lib/validations.ts`, `src/components/lead-form-dialog.tsx`, `scripts/guard-no-hard-delete.cjs` — HIGH confidence, evidência primária.
- Query direta contra `data/crm.db` via `better-sqlite3` (`SELECT origem, COUNT(*) FROM leads GROUP BY origem`) — HIGH confidence, dado real do projeto, não hipotético.
- `.planning/PROJECT.md`, `.planning/todos/pending/2026-08-01-*.md`, `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — contexto do milestone e raciocínio de priorização já documentado pelo usuário.
- WebSearch: "SQLite ALTER TABLE add CHECK constraint enum column existing data drizzle-kit push" (GitHub issues drizzle-team/drizzle-orm #3713, #4131; orm.drizzle.team/docs) — confirma que Drizzle simula enum via `CHECK` + reconstrução de tabela em SQLite, e que há bugs/discussões abertas especificamente sobre alterar enums em tabelas existentes — MEDIUM-HIGH confidence.
- WebSearch: "better-sqlite3 WAL mode composite index performance thousands of rows single writer" (github.com/WiseLibs/better-sqlite3/docs/performance.md; phiresky's blog) — confirma que WAL + índice é adequado até escalas muito acima da deste projeto (100k+ SELECTs/s documentados) — HIGH confidence, corrobora que a escala atual não é um risco real de performance.
- WebSearch: "Next.js Server Actions cron-less scheduled reminders" — confirma que cron/background jobs não sobrevivem a ambientes request-driven/serverless sem infraestrutura externa dedicada, reforçando por que o padrão "computa na leitura" já usado neste projeto é a abordagem correta, não um atalho — MEDIUM confidence (nenhuma fonte cobre exatamente este padrão combinado com Server Actions, mas o princípio de "processo não persiste entre requisições" é bem estabelecido).
- WebSearch: "lead scoring hot warm cold automatic temperature flip-flopping UX" — confirma que sistemas de scoring automático em CRMs enfrentam o mesmo risco de reclassificação frequente/confusa quando o sinal de entrada muda, e que a prática recomendada é tornar a regra visível/transparente — MEDIUM confidence (fontes genéricas de CRM, não específicas deste stack).

---
*Pitfalls research for: Milestone v1.3 (Qualificação e Histórico de Leads) — CRM de Leads Área da Saúde*
*Researched: 2026-08-01*
