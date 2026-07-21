import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { leads, subnichos } from "@/db/schema";

export type Lead = InferSelectModel<typeof leads>;
export type NewLead = InferInsertModel<typeof leads>;

export type Subnicho = InferSelectModel<typeof subnichos>;
export type NewSubnicho = InferInsertModel<typeof subnichos>;
