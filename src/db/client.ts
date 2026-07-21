import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_FILE_NAME ?? "./data/crm.db");
sqlite.pragma("journal_mode = WAL");
// SQLite não aplica FKs por padrão — sem isso, onDelete:"restrict" e o backstop
// de captura de SQLITE_CONSTRAINT_FOREIGNKEY em lead-actions.ts nunca disparam.
sqlite.pragma("foreign_keys = ON");
export const db = drizzle({ client: sqlite, schema });
