import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const subnichos = sqliteTable(
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
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado", "perdido"] })
      .notNull()
      .default("novo"),
    motivoPerda: text("motivo_perda"), // nullable, D-03 (preenchido opcionalmente ao mover para "perdido")
    stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default (Pitfall 2) — backfill via migração custom
    contactAttempts: integer("contact_attempts").notNull().default(0), // WA-08/D-04: acumula pela vida do lead, nunca zera ao mudar de etapa
    importBatchId: text("import_batch_id"), // nullable = lead criado manualmente (LEAD-05)
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("leads_deleted_at_idx").on(table.deletedAt),
    index("leads_follow_up_date_idx").on(table.followUpDate),
    index("leads_stage_idx").on(table.stage),
    index("leads_subnicho_id_idx").on(table.subnichoId),
    index("leads_import_batch_id_idx").on(table.importBatchId),
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
 */
export const configuracoes = sqliteTable("configuracoes", {
  id: integer("id").primaryKey(),
  diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
  diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
  diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
