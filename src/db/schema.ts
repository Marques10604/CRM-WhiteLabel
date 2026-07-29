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
    valorEstimado: integer("valor_estimado_centavos").notNull(), // centavos, evita ponto flutuante
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado", "perdido"] })
      .notNull()
      .default("novo"),
    motivoPerda: text("motivo_perda"), // nullable, D-03 (preenchido opcionalmente ao mover para "perdido")
    stageChangedAt: integer("stage_changed_at", { mode: "timestamp" }), // nullable, sem default (Pitfall 2) — backfill via migração custom
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
