import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";

export const subnichoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});

export const leadSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  telefone: z
    .string()
    .trim()
    .min(1, "Telefone é obrigatório.")
    .transform((v, ctx) => {
      const normalized = normalizePhone(v);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Telefone inválido. Use DDD + número (ex.: (11) 91234-5678).",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  canal: z.enum(["instagram", "whatsapp"], {
    error: "Selecione um canal de contato.",
  }),
  origem: z.string().trim().min(1, "Origem é obrigatória."),
  valorEstimado: z.preprocess(
    (v) => parseBRLToCents(String(v ?? "")),
    z.number({ error: "Valor estimado é obrigatório." }).int().nonnegative()
  ),
  notas: z.string().trim().min(1, "Notas são obrigatórias."),
  followUpDate: z.coerce.date(),
  subnichoId: z.coerce.number().int().positive("Selecione um sub-nicho."),
  stage: z
    .enum(["novo", "contatado", "negociacao", "fechado", "perdido"])
    .default("novo"),
  motivoPerda: z.string().trim().optional(),
});

export type LeadFormValues = z.input<typeof leadSchema>;

/**
 * Schema de linha de CSV confirmada (IMPORT-01/02, D-12), derivado de
 * leadSchema — nunca uma cópia paralela de campo a campo. `subnichoId` é
 * omitido porque a linha de CSV carrega o NOME do sub-nicho, resolvido para
 * id só dentro da transação de bulkImportLeads. `followUpDate` é omitido
 * porque nenhuma coluna de follow-up é coletada do CSV — o servidor grava
 * followUpDate = new Date() (momento da importação) diretamente no insert.
 */
export const csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
});

export type CsvRowValues = z.infer<typeof csvRowSchema>;

/** Contrato enxuto para a mudança de etapa via drag-and-drop (03-03, updateLeadStage). */
export const stageUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  stage: z.enum(["novo", "contatado", "negociacao", "fechado", "perdido"]),
  motivoPerda: z.string().trim().optional(),
});

/**
 * Contrato de registerWhatsAppContact (WA-06/07/08) — toda Server Action é
 * um endpoint HTTP interno, valida em runtime mesmo com o TypeScript do
 * client já garantindo a forma (Pitfall 8 do RESEARCH).
 */
export const whatsappContactSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]),
});

export const templateSchema = z.object({
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"], {
    error: "Selecione um tipo.",
  }),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  corpo: z.string().trim().min(1, "Mensagem é obrigatória."),
  isDefault: z.coerce.boolean().default(false),
});

export type TemplateFormValues = z.input<typeof templateSchema>;
