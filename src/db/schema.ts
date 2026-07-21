import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const subnichos = sqliteTable(
  "subnichos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("subnicho_nome_unique_idx").on(sql`lower(trim(${table.nome}))`),
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
    valorEstimado: integer("valor_estimado_centavos").notNull(), // centavos, evita ponto flutuante
    notas: text("notas").notNull(),
    followUpDate: integer("follow_up_date", { mode: "timestamp" }).notNull(),
    subnichoId: integer("subnicho_id").notNull().references(() => subnichos.id, { onDelete: "restrict" }),
    stage: text("stage", { enum: ["novo", "contatado", "negociacao", "fechado_perdido"] })
      .notNull()
      .default("novo"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // nullable = ativo (LEAD-04)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index("leads_deleted_at_idx").on(table.deletedAt),
    index("leads_follow_up_date_idx").on(table.followUpDate),
    index("leads_stage_idx").on(table.stage),
    index("leads_subnicho_id_idx").on(table.subnichoId),
  ]
);
