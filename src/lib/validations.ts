import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { CSV_DEFAULTS } from "@/lib/csv-import";

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
  origemTipo: z.enum(["inbound", "outbound"], {
    error: "Selecione o tipo de origem.",
  }), // SEM .default() — D-04 exige que o formulário manual nunca pré-selecione um valor, forçando escolha consciente do admin
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
 * `origemTipo` recebe `.default(CSV_DEFAULTS.origemTipo)` aqui (e só aqui,
 * único ponto de APLICAÇÃO do default) porque o CSV do cowork não tem passo
 * de UI para essa escolha — a origem real do lote é conhecida e uniforme. O
 * VALOR em si vem de `CSV_DEFAULTS.origemTipo` (`src/lib/csv-import.ts`),
 * fonte única compartilhada com os demais defaults do import CSV (WR-01);
 * em `leadSchema` o campo fica sem default (D-04), já que o formulário
 * manual precisa forçar uma escolha consciente do admin.
 */
export const csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
  origemTipo: z.enum(["inbound", "outbound"]).default(CSV_DEFAULTS.origemTipo),
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

/**
 * Contrato de saveConfiguracoes (CONFIG-01/CONFIG-02, T-07-01) — validação
 * AUTORITATIVA server-side de D-03 (mínimo 1 dia por etapa, sem teto
 * máximo). O `min={1}` do input HTML da UI (07-02) é só UX antecipada e
 * nunca substitui este safeParse.
 */
export const configuracoesSchema = z.object({
  diasParadoNovo: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoContatado: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
  diasParadoNegociacao: z.coerce.number().int().min(1, "Mínimo de 1 dia."),
});

export type ConfiguracoesFormValues = z.input<typeof configuracoesSchema>;
