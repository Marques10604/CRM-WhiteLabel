import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { leads, subnichos, templates, interacoes, motivosPerda, tarefas } from "@/db/schema";

export type Lead = InferSelectModel<typeof leads>;
export type NewLead = InferInsertModel<typeof leads>;

export type Subnicho = InferSelectModel<typeof subnichos>;
export type NewSubnicho = InferInsertModel<typeof subnichos>;

export type MotivoPerda = InferSelectModel<typeof motivosPerda>;
export type NewMotivoPerda = InferInsertModel<typeof motivosPerda>;

export type Template = InferSelectModel<typeof templates>;
export type NewTemplate = InferInsertModel<typeof templates>;

export type Interacao = InferSelectModel<typeof interacoes>;
export type NewInteracao = InferInsertModel<typeof interacoes>;

export type Tarefa = InferSelectModel<typeof tarefas>;
export type NewTarefa = InferInsertModel<typeof tarefas>;
