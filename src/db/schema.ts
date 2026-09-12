import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

import type { Diagnostico } from "@/lib/ai/diagnostico-schema";

/**
 * Lista governada extensível de nichos de lead (NICHO-01/NICHO-02).
 *
 * DIVERGÊNCIA DELIBERADA nome-lógico ↔ nome-físico (Fase 13, D-01):
 * o export chama `nichos` e a prop da FK do lead chama `nichoId`, mas a
 * tabela FÍSICA continua `"subnichos"`, a coluna FÍSICA continua
 * `"subnicho_id"`, e os índices continuam com o prefixo `subnicho`. O rename
 * `sub-nicho → nicho` do despívo (v1.4) acontece SÓ na camada de código/UI —
 * renomear no banco não traz benefício funcional (o usuário nunca vê o nome
 * físico) e esbarraria no snapshot divergente do drizzle-kit (débito das
 * Fases 4/6/7/8). Se um dia o banco precisar ficar limpo, é uma migração
 * trivial isolada, não uma fase.
 */
export const nichos = sqliteTable(
  "subnichos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("subnicho_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("subnichos_deleted_at_idx").on(table.deletedAt),
  ]
);

export const templates = sqliteTable(
  "templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tipo: text("tipo", { enum: ["primeiro_contato", "follow_up", "prova_valor"] }).notNull(),
    nome: text("nome").notNull(),
    corpo: text("corpo").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("templates_tipo_idx").on(table.tipo)]
);

/**
 * Lista governada extensível de motivos de perda (D-01/D-02, PERDA-01) —
 * SEGUNDA ocorrência do mesmo padrão de `nichos` no projeto (réplica
 * estrutural exata: `id` / `nome` / `deletedAt` nullable = ativo / `createdAt`
 * com default `unixepoch()`, mesmo par de índices). Substitui o texto livre
 * antigo `leads.motivoPerda` por uma FK governada.
 *
 * Os 6 valores-semente de D-02 (`Preço`, `Sem retorno do lead`, `Concorrente`,
 * `Sem verba/orçamento`, `Timing (não é prioridade agora)`, `Outro`) vivem em
 * `scripts/migrate-motivos-perda.cjs`, NUNCA em `drizzle-kit push` — mesmo
 * raciocínio já documentado para a semeadura de `configuracoes`:
 * `drizzle-kit push` nunca executa INSERT, e o snapshot do drizzle-kit está
 * divergente do banco real desde a Fase 4.
 *
 * Deve ser declarada ANTES de `leads` — a FK `leads.motivoPerdaId` exige a
 * tabela já definida (mesma ordem `nichos` → `leads` de hoje).
 */
export const motivosPerda = sqliteTable(
  "motivos_perda",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("motivo_perda_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
    index("motivos_perda_deleted_at_idx").on(table.deletedAt),
  ]
);

/**
 * Campanha de exploração de nicho (CAMPANHA-01/02/04, Fase 22 — v1.7). Objeto
 * de 1ª classe: nicho + oferta (o que pretende vender) + janela de tempo
 * (~90 dias) + meta de conversão + estado. Leads podem se vincular a uma
 * campanha (via `leads.campanhaId` abaixo), além do nicho geral já existente.
 *
 * `nichoId` usa `onDelete: "restrict"` (diferente de `leads.nichoId`, também
 * `restrict`) — não deixa apagar um nicho com campanha ativa, mesmo raciocínio
 * de integridade referencial já usado no projeto inteiro.
 *
 * `metaConversao` é texto livre (não numérico) de propósito — "3 leads
 * fechados" e "10% de resposta" são ambos formatos válidos que o usuário pode
 * querer registrar; normalizar para número perderia expressividade sem
 * ganho real para um usuário solo.
 *
 * `estado` (CAMPANHA-02) nasce sempre `"explorando"` (default físico). A
 * Fase 24 implementa APENAS a transição `explorando` → `veredito_registrado`
 * (via `registrarVeredito`, VEREDITO-01/D-24-01) — `em_escala` e `abandonada`
 * permanecem declarados no enum abaixo, mas INALCANÇÁVEIS por código nesta
 * fase, adiados explicitamente para uma fase futura.
 *
 * `deletedAt` segue o padrão default do projeto (soft-delete, LEAD-04) —
 * `campanhas` NÃO entra na ALLOWLIST de `guard-no-hard-delete.cjs`.
 *
 * `vereditoFinal`/`vereditoDecididoEm` (VEREDITO-01/VEREDITO-02, Fase 24,
 * D-24-01/D-24-02) — decisão do OPERADOR sobre a campanha (pode divergir do
 * `veredito_sugerido.decisao` da IA em `src/lib/ai/diagnostico-schema.ts`,
 * mesmos 3 valores/mesma ordem, propositalmente comparáveis). As duas colunas
 * são ADITIVAS e NULLABLE, SEM `.default()`: a maioria das campanhas nunca
 * recebeu veredito, e NULL nas duas é o estado normal delas.
 * `vereditoDecididoEm` é gravado pelo SERVIDOR (`sql\`(unixepoch())\``) no
 * momento do registro, nunca escolhido pelo cliente (D-24-02) — re-registrar
 * sobrescreve as duas colunas, não há histórico de vereditos do operador
 * (histórico é papel de `diagnosticos`, não desta tabela). SEM índice: o
 * filtro por veredito do Mapa de Nichos (plano 24-04) é client-side, não há
 * `WHERE` por `veredito_final` em lugar nenhum.
 *
 * Migração SEMPRE via `scripts/migrate-campanhas.cjs` (+ `migrate-veredito.cjs`
 * para as 2 colunas acima) manual, NUNCA `drizzle-kit push`/`generate` —
 * mesmo precedente de `motivosPerda`/`tarefas` (dois incidentes destrutivos
 * documentados nas Fases 06-01/07-01).
 *
 * Deve ser declarada ANTES de `leads` — a FK `leads.campanhaId` exige a
 * tabela já definida (mesma ordem `motivosPerda` → `leads` de hoje).
 */
export const campanhas = sqliteTable(
  "campanhas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nichoId: integer("nicho_id")
      .notNull()
      .references(() => nichos.id, { onDelete: "restrict" }),
    oferta: text("oferta").notNull(),
    metaConversao: text("meta_conversao").notNull(),
    janelaInicio: integer("janela_inicio", { mode: "timestamp" }).notNull(),
    janelaFim: integer("janela_fim", { mode: "timestamp" }).notNull(),
    estado: text("estado", {
      enum: ["explorando", "veredito_registrado", "em_escala", "abandonada"],
    })
      .notNull()
      .default("explorando"),
    // VEREDITO-01/VEREDITO-02 (Fase 24, D-24-01/D-24-02) — ver doc-comment
    // acima. NULLABLE, SEM default: campanha sem veredito registrado tem as
    // duas NULL.
    vereditoFinal: text("veredito_final", {
      enum: ["aprofundar", "mudar_angulo", "abandonar"],
    }),
    vereditoDecididoEm: integer("veredito_decidido_em", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("campanhas_nicho_id_idx").on(table.nichoId),
    index("campanhas_deleted_at_idx").on(table.deletedAt),
    index("campanhas_estado_idx").on(table.estado),
  ]
);

/**
 * Diagnóstico de IA da campanha (DIAGNOSTICO-01/10, Fase 23 — v1.7). Cada
 * clique no botão "Gerar diagnóstico" grava UMA linha nova aqui — tabela
 * APPEND-ONLY, 1 linha por geração. NÃO há cache nem checagem "já existe
 * diagnóstico pra essa campanha" (DIAGNOSTICO-10): regenerar é sempre uma
 * chamada de API nova e sempre uma linha nova, com `input_tokens` /
 * `output_tokens` / `buscas` gravados pra manter o custo visível na UI.
 *
 * SEM coluna de soft-delete e SEM remoção física de linha — nenhuma geração
 * (nem uma que falhou) pode ser apagada, o que sustenta DIAGNOSTICO-10 (o
 * custo sempre visível) e o valor de trilha de auditoria da tabela. Por isso
 * `diagnosticos` NÃO entra na ALLOWLIST de `scripts/guard-no-hard-delete.cjs`:
 * não existe superfície autorizada a remover linha daqui.
 *
 * `campanhaId` usa `onDelete: "restrict"` — campanha nunca é hard-deletada
 * (só soft-delete via `campanhas.deletedAt`), mesmo raciocínio de integridade
 * referencial de `interacoes.leadId`.
 *
 * `payload` (o objeto validado por `diagnosticoSchema`) é NULLABLE: fica NULL
 * quando `status` é `"falhou"` — uma falha é evento visível e persistido,
 * NUNCA um resultado parcial gravado como se fosse válido (DIAGNOSTICO-02).
 * Ao LER de volta, o `payload` é re-validado com o mesmo `diagnosticoSchema`
 * (fronteira de confiança do banco).
 *
 * `erro` × `aviso` são colunas SEPARADAS com semânticas que nunca se cruzam
 * (D-23-07):
 *  - `erro` é preenchida SOMENTE quando `status` é `"falhou"` — a mensagem da
 *    falha fatal; nesse caso `payload` é NULL.
 *  - `aviso` é preenchida SOMENTE quando `status` é `"ok"` — uma ressalva
 *    NÃO-FATAL de uma geração que passou (hoje, o `avisoCrossCheck` de
 *    `gerarDiagnostico()`: URLs citadas dentro do objeto que não constam em
 *    `res.sources`).
 * Reusar `erro` pros dois casos tornaria impossível distinguir por SQL
 * "falhou" de "passou com ressalva" e faria o bloco de erro da UI (plano
 * 23-07) disparar em cima de uma geração válida.
 *
 * `criadoEm` é `integer({ mode: "timestamp" })` com default `(unixepoch())`
 * (D-23-01), NÃO ISO string — todo timestamp do projeto usa esse idioma (ver
 * `campanhas.createdAt`, `tarefas.data`) e o `format()` do date-fns na UI
 * espera `Date`/número. O 23-AI-SPEC §4 diz "ISO string" e está errado.
 *
 * Migração SEMPRE via `scripts/migrate-diagnosticos.cjs` manual, NUNCA
 * `drizzle-kit push`/`generate` — mesmo precedente de `campanhas`/`tarefas`
 * (dois incidentes destrutivos documentados nas Fases 06-01/07-01, snapshot do
 * drizzle-kit divergente do banco real desde a Fase 4).
 *
 * Declarada logo após `campanhas` por proximidade da FK (não há FK de `leads`
 * para `diagnosticos`, então a ordem antes de `leads` não é obrigatória).
 */
export const diagnosticos = sqliteTable(
  "diagnosticos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    campanhaId: integer("campanha_id")
      .notNull()
      .references(() => campanhas.id, { onDelete: "restrict" }),
    payload: text("payload", { mode: "json" }).$type<Diagnostico>(), // NULL quando status = "falhou" (D-23-07)
    fontes: text("fontes", { mode: "json" }).$type<{ url: string; title?: string }[]>(),
    buscas: text("buscas", { mode: "json" }).$type<string[]>(),
    status: text("status", { enum: ["ok", "falhou"] }).notNull(),
    erro: text("erro"), // preenchida SOMENTE quando status = "falhou" — falha fatal, payload NULL (D-23-07)
    aviso: text("aviso"), // preenchida SOMENTE quando status = "ok" — ressalva não-fatal de geração válida (D-23-07)
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    criadoEm: integer("criado_em", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("diagnosticos_campanha_id_idx").on(table.campanhaId),
    index("diagnosticos_criado_em_idx").on(table.criadoEm),
    index("diagnosticos_status_idx").on(table.status),
  ]
);

export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    canal: text("canal", { enum: ["instagram", "whatsapp"] }).notNull(),
    origem: text("origem").notNull(),
    origemTipo: text("origem_tipo", { enum: ["inbound", "outbound"] })
      .notNull()
      .default("outbound"), // espelha o DEFAULT físico OBRIGATÓRIO exigido pelo SQLite no ALTER TABLE ADD COLUMN NOT NULL sobre tabela não-vazia (restrição do SQLite, não escolha de produto) — nunca acionado pelos fluxos da aplicação, porque o Zod sempre entrega o campo preenchido
    valorEstimado: integer("valor_estimado_centavos").notNull(), // centavos, evita ponto flutuante
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    nichoId: integer("subnicho_id").notNull().references(() => nichos.id, { onDelete: "restrict" }), // coluna FÍSICA `subnicho_id` — ver doc-comment de `nichos` (D-01)
    /**
     * Texto livre "serviço desejado" do lead (LEAD-06, Fase 15). NULLABLE de
     * propósito: campo OPCIONAL no formulário e no CSV — vazio grava NULL
     * (D-04), nunca string vazia. SEM `.default()`: coluna aditiva; leads
     * criados antes da migração `scripts/migrate-interesse.cjs` ficam com
     * `interesse = NULL` e a migração NÃO faz backfill (D-06). SEM índice:
     * não há filtro/ordenação/busca por `interesse` nesta fase (fora de
     * escopo — D-07). Migração SEMPRE via script `.cjs` manual, NUNCA
     * `drizzle-kit push`/`generate` (mesmo precedente de `motivoPerdaId`).
     */
    interesse: text("interesse"),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado", "perdido"] })
      .notNull()
      .default("novo"),
    // COLUNA FÍSICA MORTA `motivo_perda` (text): texto livre legado da Fase 3.
    // Removida da declaração Drizzle no plano 11-03 (zero leituras/escritas em
    // `src/`), mas NUNCA dropada do banco — reversibilidade (11-RESEARCH.md
    // Open Question 2). Substituída pela FK governada `motivoPerdaId` abaixo.
    motivoPerdaId: integer("motivo_perda_id").references(() => motivosPerda.id, { onDelete: "restrict" }), // NULLABLE de propósito: D-04 exige o motivo só quando `stage === "perdido"`; obrigatoriedade condicional mora no Zod/Server Action, nunca em constraint de banco (precedente `stageChangedAt`; nenhuma tabela do projeto usa CHECK constraint)
    /**
     * Vínculo opcional a uma campanha de exploração de nicho (CAMPANHA-03,
     * Fase 22). NULLABLE, SEM default: um lead pode existir sem nunca ter
     * sido vinculado a nenhuma campanha (a esmagadora maioria dos leads hoje).
     * `onDelete: "set null"` — se a campanha for removida (soft-delete não
     * dispara isso; só hard-delete real, que não acontece), o lead não trava,
     * só desvincula.
     */
    campanhaId: integer("campanha_id").references(() => campanhas.id, { onDelete: "set null" }),
    stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default (Pitfall 2) — backfill via migração custom
    contactAttempts: integer("contact_attempts").notNull().default(0), // WA-08/D-04: acumula pela vida do lead, nunca zera ao mudar de etapa
    sequenciaPosicao: integer("sequencia_posicao").notNull().default(0), // SEQ-02/D-01/D-02/D-12: índice (0-based) do PRÓXIMO degrau da sequência de follow-up escalonada. Avança em registerWhatsAppContact quando o template usado é "follow_up" (D-01). Reseta para 0 quando o destino da mudança de etapa é "novo", tanto via updateLeadStage quanto via updateLead (D-02/D-12 — o reset vale pelo DESTINO, não pelo mecanismo do gesto). Nunca é capado/travado no write-path — "sequência esgotada" (posição além do último intervalo configurado) é tratado só na leitura, por computeSequenciaSugestao (D-10), nunca aqui. O DEFAULT 0 físico é exigido pelo SQLite no ALTER TABLE ADD COLUMN NOT NULL sobre tabela já populada (mesma restrição documentada em origemTipo acima).
    importBatchId: text("import_batch_id"), // nullable = lead criado manualmente (LEAD-05)
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("leads_deleted_at_idx").on(table.deletedAt),
    index("leads_follow_up_date_idx").on(table.followUpDate),
    index("leads_stage_idx").on(table.stage),
    index("leads_subnicho_id_idx").on(table.nichoId),
    index("leads_motivo_perda_id_idx").on(table.motivoPerdaId), // cobre o GROUP BY motivoPerdaId da Seção 3 do relatório (mesmo raciocínio de leads_subnicho_id_idx)
    index("leads_import_batch_id_idx").on(table.importBatchId),
    index("leads_campanha_id_idx").on(table.campanhaId),
  ]
);

/**
 * Timeline de interações por lead (TIMELINE-01/02). Coluna única `tipo`
 * reaproveita o vocabulário de `templates.tipo` mais um 4º valor
 * `nota_manual` (decisão de coluna única do 09-RESEARCH.md §Alternatives
 * Considered) — atende "tipo/resumo" sem uma segunda dimensão não pedida.
 *
 * `updatedAt` é NULLABLE e SEM default (diferente de `templates.updatedAt`,
 * que é notNull): só é preenchido quando uma nota manual é editada — eventos
 * automáticos de WhatsApp nunca têm updatedAt.
 *
 * `deletedAt` é NULLABLE e só é escrito para `tipo="nota_manual"` (D-06/D-07)
 * — eventos automáticos de WhatsApp são imutáveis por decisão de produto, a
 * guarda vive no WHERE das Server Actions (src/actions/interacao-actions.ts),
 * nunca só na UI.
 */
export const interacoes = sqliteTable(
  "interacoes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
    tipo: text("tipo", {
      enum: ["primeiro_contato", "follow_up", "prova_valor", "nota_manual"],
    }).notNull(),
    texto: text("texto").notNull(), // D-04/D-05: texto integral, sem truncamento e sem .max()
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }), // nullable, sem default — só em edição de nota manual
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable, só para tipo="nota_manual" (D-06/D-07)
  },
  (table) => [
    index("interacoes_lead_id_idx").on(table.leadId),
    index("interacoes_deleted_at_idx").on(table.deletedAt),
  ]
);

/**
 * Agenda de tarefas soltas (TAREFA-01/02, Fase 12) — tabela DESACOPLADA de
 * `leads` por design: TAREFA-01 pede registrar um compromisso/lembrete que
 * NÃO está amarrado a nenhum lead ("ligar pro cowork sobre o CSV de agosto").
 * Por isso: SEM FK, SEM `references(...)`.
 *
 * `concluidaEm` NULL = pendente (D-01). É o filtro que alimenta as 3 seções
 * de urgência do dashboard (`WHERE concluida_em IS NULL`, D-02) — mesmo idioma
 * "timestamp nullable, sem default" de `interacoes.updatedAt` e
 * `leads.stageChangedAt`. Tarefa concluída some do dashboard na hora.
 *
 * Exclusão de tarefa é HARD-DELETE por D-08 (tarefa é descartável por
 * natureza — lembrete cumprido ou cancelado): NÃO existe `deletedAt`, NÃO há
 * Lixeira. `src/actions/tarefa-actions.ts` é a ÚNICA exceção documentada em
 * `scripts/guard-no-hard-delete.cjs` (ALLOWLIST), a única superfície do
 * projeto onde `DELETE FROM` / `.delete()` é permitido.
 *
 * A migração vive em `scripts/migrate-tarefas.cjs` (manual, idempotente, via
 * better-sqlite3) — NUNCA `drizzle-kit push`/`generate`: o snapshot do
 * drizzle-kit está divergente do banco real desde a Fase 4 (dois incidentes
 * destrutivos, Fases 06-01/07-01).
 */
export const tarefas = sqliteTable(
  "tarefas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    descricao: text("descricao").notNull(), // serve de título (D-06)
    data: integer("data", { mode: "timestamp" }).notNull(), // só o dia, sem hora (D-06)
    concluidaEm: integer("concluida_em", { mode: "timestamp" }), // nullable, SEM default — NULL = pendente (D-01)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("tarefas_concluida_em_idx").on(table.concluidaEm),
    index("tarefas_data_idx").on(table.data),
  ]
);

/**
 * Tabela singleton (CONFIG-01/CONFIG-02) — sempre uma única linha, `id` fixo
 * = 1, nunca autoIncrement. A invariante "uma linha" é garantida em código
 * de aplicação (getConfiguracoes/saveConfiguracoes), mesmo precedente de
 * `applyDefaultTemplate` — nenhuma tabela do projeto usa CHECK constraint.
 *
 * Defaults NÃO simétricos por decisão deliberada (D-04): o código pré-fase
 * (`src/app/pipeline/page.tsx`) só flagava `stage === "contatado"` com >= 5
 * dias como "esfriando" — Novo e Negociação nunca foram destacados, por mais
 * tempo que ficassem parados. `dias_parado_contatado` nasce com 5 (paridade
 * exata com o hardcode pré-fase). `dias_parado_novo`/`dias_parado_negociacao`
 * nascem com 999999 (≈ nunca esfria) para que essas etapas continuem sem
 * destaque até o admin salvar valores reais em `/configuracoes` — semear com
 * um número baixo destacaria leads reais já existentes no dia do deploy.
 *
 * A semeadura da linha `id=1` acontece em `getConfiguracoes()`
 * (`src/db/queries.ts`), não em SQL de migração — `drizzle-kit push` nunca
 * executa INSERT.
 *
 * `sequenciaIntervalosDias` (SEQ-01) é a primeira coluna deste schema em
 * `text(mode:"json")` — o array inteiro é lido/escrito como unidade única via
 * `$type<number[]>()`, sem tabela auxiliar `sequencia_intervalos`, porque a
 * sequência é global/singleton (D-08): editada e salva de uma vez em
 * `/configuracoes`, nunca consultada degrau-a-degrau via SQL. A semente é
 * `[4,10,20]`, não `[]` (D-11, decisão do planner do plano 10-01): com
 * semente vazia, a primeira visita a `/configuracoes` teria a lista de
 * intervalos vazia, e `sequenciaIntervalosSchema.min(1)` bloquearia o
 * salvamento de TODOS os campos do formulário (inclusive os 3 campos de
 * dias-parado já existentes desde a Fase 7) até o admin adicionar um
 * intervalo manualmente — uma regressão silenciosa numa funcionalidade já
 * entregue. `[4,10,20]` é só o valor inicial editável, puramente informativo
 * (D-06: nunca sobrescreve `followUpDate`, nunca dispara envio), então
 * semear valores reais aqui não tem efeito colateral destrutivo.
 */
export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(),
  diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
  sequenciaIntervalosDias: text("sequencia_intervalos_dias", { mode: "json" })
    .$type<number[]>()
    .notNull()
    .default(sql`'[4,10,20]'`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
