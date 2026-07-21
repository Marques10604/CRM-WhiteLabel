import { z } from "zod";

export const subnichoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});
