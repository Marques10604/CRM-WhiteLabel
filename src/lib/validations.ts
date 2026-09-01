import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { CSV_DEFAULTS } from "@/lib/csv-import";

export const nichoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});

/**
 * Contrato de CRUD de motivo de perda (D-01/D-02/D-03, PERDA-01) — espelho
 * exato de `nichoSchema`.
 */
export const motivoPerdaSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
});

/**
 * D-04 (PERDA-01): `motivoPerdaId` substitui o texto livre `motivoPerda`. É a
 * FK governada (`leads.motivoPerdaId` -> `motivos_perda.id`), condicionalmente
 * OBRIGATÓRIA quando `stage === "perdido"` — a obrigatoriedade mora no
 * `.refine` de `leadSchema`/`stageUpdateSchema` (server-side autoritativo),
 * nunca só no `disabled` do botão ou no `zodResolver` do cliente.
 *
 * `leadBaseSchema` é o objeto não-refinado — só objeto puro tem `.omit()`,
 * usado por `csvRowSchema`. `leadSchema` é `leadBaseSchema` + `.refine`.
 *
 * O `z.preprocess` em `motivoPerdaId` normaliza `""`/`null` para `undefined`:
 * o input nativo oculto do `<MotivoPerdaCombobox>` emite string vazia quando
 * nada está selecionado, e sem isso `z.coerce.number()` transformaria `""` em
 * `0` e a mensagem de erro seria a genérica do Zod, não a copy de D-04.
 *
 * `interesse` (Fase 15, LEAD-06) é o SEGUNDO campo opcional do
 * `leadBaseSchema` — texto livre "serviço desejado", mesmo `z.preprocess`
 * "vazio -> undefined", NUNCA obrigatório. O `<Input>` do form emite `""`
 * quando vazio (D-04 = vazio grava NULL, a Server Action materializa
 * `undefined -> null`). Fica FORA do `.omit()` de `csvRowSchema`, então
 * propaga automaticamente para o form (`leadSchema`) e o import CSV
 * (`csvRowSchema`). O `.max(500)` só morde no caminho do formulário manual —
 * o import CSV trunca em 500 antes de validar (D-05/D-10).
 */
const leadBaseSchema = z.object({
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
  interesse: z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.trim() : v;
      return s === "" || s === null || s === undefined ? undefined : s;
    },
    z.string().trim().max(500, "O interesse deve ter no máximo 500 caracteres.").optional()
  ),
  followUpDate: z.coerce.date(),
  nichoId: z.coerce.number().int().positive("Selecione um nicho."),
  stage: z
    .enum(["novo", "contatado", "negociacao", "fechado", "perdido"])
    .default("novo"),
  motivoPerdaId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
});

/** Mensagem VERBATIM de D-04 (11-UI-SPEC.md linha 120) — reutilizada em leadSchema e stageUpdateSchema. */
const MOTIVO_PERDA_OBRIGATORIO_MSG = "Selecione o motivo da perda.";

export const leadSchema = leadBaseSchema.refine(
  (d) => d.stage !== "perdido" || d.motivoPerdaId != null,
  { path: ["motivoPerdaId"], message: MOTIVO_PERDA_OBRIGATORIO_MSG }
);

export type LeadFormValues = z.input<typeof leadSchema>;

/**
 * Schema de linha de CSV confirmada (IMPORT-01/02, D-12), derivado de
 * leadSchema — nunca uma cópia paralela de campo a campo. `nichoId` é
 * omitido porque a linha de CSV carrega o NOME do nicho, resolvido para
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
 *
 * Deriva de `leadBaseSchema` (não de `leadSchema`): `.omit()` só existe em
 * objeto não-refinado. `motivoPerdaId` é omitido porque o CSV nunca traz
 * motivo de perda — leads importados nascem sempre em "novo", nunca em
 * "perdido" (D-04).
 */
export const csvRowSchema = leadBaseSchema
  .omit({ nichoId: true, followUpDate: true, motivoPerdaId: true })
  .extend({
    nichoNome: z.string().trim().min(1, "Nicho é obrigatório."),
    origemTipo: z.enum(["inbound", "outbound"]).default(CSV_DEFAULTS.origemTipo),
  });

export type CsvRowValues = z.infer<typeof csvRowSchema>;

/**
 * Contrato enxuto para a mudança de etapa via drag-and-drop (03-03,
 * updateLeadStage). D-04: `motivoPerdaId` condicionalmente obrigatório quando
 * o destino é "perdido" — mesmo `.refine` de `leadSchema`.
 */
export const stageUpdateSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    stage: z.enum(["novo", "contatado", "negociacao", "fechado", "perdido"]),
    motivoPerdaId: z.coerce.number().int().positive().optional(),
  })
  .refine((d) => d.stage !== "perdido" || d.motivoPerdaId != null, {
    path: ["motivoPerdaId"],
    message: MOTIVO_PERDA_OBRIGATORIO_MSG,
  });

/**
 * Contrato de registerWhatsAppContact (WA-06/07/08) — toda Server Action é
 * um endpoint HTTP interno, valida em runtime mesmo com o TypeScript do
 * client já garantindo a forma (Pitfall 8 do RESEARCH).
 */
/**
 * `texto` obrigatório (D-04/D-05, TIMELINE-01/02): um clique em "Abrir
 * WhatsApp" com a caixa de mensagem vazia deixa de registrar
 * tentativa/interação — consequência deliberada, mensagem vazia não é
 * contato real. Coerente com o comportamento pré-existente de "entrada
 * inválida ⇒ { advanced: false }, sem escrita" de registerWhatsAppContact.
 */
export const whatsappContactSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  tipo: z.enum(["primeiro_contato", "follow_up", "prova_valor"]),
  texto: z.string().trim().min(1, "Mensagem vazia."),
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
 * Contratos de nota manual da timeline de interações (TIMELINE-01/02),
 * derivados em camada (mesmo idioma DRY de csvRowSchema derivando de
 * leadSchema) a partir de notaManualTextoSchema — nunca cópias paralelas.
 */
export const notaManualTextoSchema = z.object({
  texto: z.string().trim().min(1, "Nota não pode ficar vazia."),
});

export const interacaoManualSchema = notaManualTextoSchema.extend({
  leadId: z.coerce.number().int().positive(),
});

export const interacaoManualUpdateSchema = notaManualTextoSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type NotaManualFormValues = z.input<typeof notaManualTextoSchema>;

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

/**
 * Contratos da sequência de follow-up escalonada (SEQ-01). `configuracoesSchema`
 * acima continua sendo o contrato do FORMULÁRIO (só os 3 campos escalares de
 * dias-parado, validados no cliente pelo `zodResolver`) — não ganhou um campo
 * de array porque `configuracoes-form.tsx` usa os dois exports acima hoje via
 * `zodResolver`, e acrescentar um campo obrigatório que o react-hook-form não
 * registra faria `form.handleSubmit` reprovar o submit inteiro para sempre.
 *
 * `sequenciaIntervalosSchema` é exportado isoladamente (não só embutido em
 * `configuracoesServerSchema`) porque o formulário precisa validar a lista
 * dinâmica de intervalos no cliente (plano 10-03) com exatamente as mesmas
 * regras do servidor, sem duplicar as mensagens de erro. As duas mensagens
 * abaixo são literais do `10-UI-SPEC.md` §Copywriting Contract.
 *
 * `configuracoesServerSchema` é o contrato AUTORITATIVO do servidor,
 * consumido por `saveConfiguracoes` — mesmo idioma de derivação em camada já
 * usado por `interacaoManualSchema` acima (`.extend` sobre um schema base,
 * nunca uma cópia paralela de campos).
 */
export const sequenciaIntervalosSchema = z
  .array(z.coerce.number().int().min(1, "Mínimo de 1 dia."))
  .min(1, "Adicione ao menos um intervalo.");

export const configuracoesServerSchema = configuracoesSchema.extend({
  sequenciaIntervalosDias: sequenciaIntervalosSchema,
});

/**
 * Contrato da agenda de tarefas soltas (TAREFA-01, Fase 12) — espelho de
 * `motivoPerdaSchema`/`nichoSchema`. Só 2 campos (D-06): `descricao` (serve
 * de título — sem título separado) e `data` (só o dia — sem hora, o
 * agrupamento de urgência do dashboard é por dia).
 *
 * `data` usa `z.coerce.date()` (não `z.date()`) porque o valor chega como
 * string ISO do `<input type="hidden">` do date-picker — mesmo idioma de
 * `leadBaseSchema.followUpDate`.
 *
 * Mensagens de erro VERBATIM do 12-UI-SPEC.md §Copywriting Contract.
 */
export const tarefaSchema = z.object({
  descricao: z.string().trim().min(1, "Descreva a tarefa."),
  data: z.coerce.date({ error: "Escolha uma data." }),
});

/**
 * `.extend` sobre o schema base (nunca cópia paralela de campos — mesma regra
 * DRY de `interacaoManualSchema`). Consumido por `updateTarefa`.
 */
export const tarefaUpdateSchema = tarefaSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type TarefaFormValues = z.input<typeof tarefaSchema>;
