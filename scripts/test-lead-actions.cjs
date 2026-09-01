// Verifica src/actions/lead-actions.ts (Task 1 do plano 01-02): createLead/
// updateLead com leadSchema, pré-checagem de nichoId no banco, e o backstop
// de captura de violação de FK (SQLITE_CONSTRAINT_FOREIGNKEY), exercitado nas
// DUAS partes exigidas pelo plano:
//   (a) contrato do banco — db.insert(leads) DIRETO com nichoId inexistente
//       lança err.code === "SQLITE_CONSTRAINT_FOREIGNKEY"
//   (b) fiação do código — grep estático confirma que o try/catch de
//       createLead/updateLead envolve o próprio insert/update e testa esse
//       mesmo err.code
//
// Roda contra um banco SQLite TEMPORÁRIO e isolado (não toca ./data/crm.db).
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

// --- (b) Fiação do código: grep estático em lead-actions.ts (não depende de import) ---
function staticCheckFkWiring() {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "actions", "lead-actions.ts"), "utf8");

  check(
    /function isForeignKeyViolation/.test(source) &&
      /SQLITE_CONSTRAINT_FOREIGNKEY/.test(source),
    "lead-actions.ts define isForeignKeyViolation() testando err.code === \"SQLITE_CONSTRAINT_FOREIGNKEY\""
  );

  const createIdx = source.indexOf("export async function createLead");
  const updateIdx = source.indexOf("export async function updateLead");
  check(createIdx !== -1 && updateIdx !== -1 && createIdx < updateIdx, "createLead e updateLead estão ambos exportados de lead-actions.ts");

  const createBody = source.slice(createIdx, updateIdx);
  const updateBody = source.slice(updateIdx);

  for (const [name, body, dbCallLabel, dbCallPattern] of [
    ["createLead", createBody, "db.insert(leads)", /db\s*\.\s*insert\s*\(\s*leads\s*\)/],
    ["updateLead", updateBody, "db.update(leads)", /db\s*\.\s*update\s*\(\s*leads\s*\)/],
  ]) {
    const tryStart = body.indexOf("try {");
    const revalidateStart = body.indexOf("revalidatePath(");
    check(tryStart !== -1 && revalidateStart !== -1 && tryStart < revalidateStart, `${name}: possui um bloco try{...} antes de revalidatePath("/")`);

    const tryCatchRegion = tryStart !== -1 && revalidateStart !== -1 ? body.slice(tryStart, revalidateStart) : "";

    check(dbCallPattern.test(tryCatchRegion), `${name}: o try{} envolve diretamente ${dbCallLabel}`);
    check(/catch\s*\(err\)/.test(tryCatchRegion), `${name}: possui catch (err) logo após o ${dbCallLabel}`);

    const isForeignKeyCallIdx = tryCatchRegion.indexOf("isForeignKeyViolation(err)");
    const throwErrIdx = tryCatchRegion.indexOf("throw err");
    check(
      isForeignKeyCallIdx !== -1 && throwErrIdx !== -1 && isForeignKeyCallIdx < throwErrIdx,
      `${name}: o catch chama isForeignKeyViolation(err) antes de re-lançar erros não-FK (throw err)`
    );

    check(
      tryCatchRegion.includes('nichoId: ["Selecione um nicho."]'),
      `${name}: o catch de violação de FK retorna { errors: { nichoId: ["Selecione um nicho."] } }`
    );
  }
}

// --- Comportamento em runtime contra um banco SQLite temporário isolado ---
async function runBehaviorTests() {
  const tmpDb = path.join(os.tmpdir(), `crm-leads-test-lead-actions-${Date.now()}.db`);
  process.env.DB_FILE_NAME = tmpDb;

  const migrationsDir = path.join(__dirname, "..", "src", "db", "migrations");
  const migration0000 = fs
    .readFileSync(path.join(migrationsDir, "0000_gifted_slapstick.sql"), "utf8")
    .replace(/--> statement-breakpoint/g, "");
  const migration0001 = fs
    .readFileSync(path.join(migrationsDir, "0001_grey_xavin.sql"), "utf8")
    .replace(/--> statement-breakpoint/g, "");

  const setupDb = new Database(tmpDb);
  setupDb.pragma("foreign_keys = ON");
  setupDb.exec(migration0000);
  setupDb.exec(migration0001);

  // O snapshot de migrações do drizzle-kit está divergente do banco real desde
  // as Fases 04-02/06-01/07-01 (débito pré-existente documentado em STATE.md):
  // estas colunas foram aplicadas via ALTER TABLE manual direto em data/crm.db,
  // sem nunca virar arquivo .sql. O banco temporário deste harness precisa
  // reconstruir essas colunas manualmente para espelhar src/db/schema.ts —
  // sem isso, countLeads() (que faz db.select().from(leads), listando TODAS as
  // colunas do schema) explode com "no such column" antes de qualquer asserção.
  const manualAlters = [
    "ALTER TABLE `leads` ADD `import_batch_id` text;",
    "ALTER TABLE `leads` ADD `contact_attempts` integer DEFAULT 0 NOT NULL;",
    "ALTER TABLE `leads` ADD `origem_tipo` text DEFAULT 'outbound' NOT NULL;",
    "ALTER TABLE `subnichos` ADD `deleted_at` integer;",
    "ALTER TABLE `leads` ADD `sequencia_posicao` integer DEFAULT 0 NOT NULL;",
    // Fase 11 (plano 11-01): tabela `motivos_perda` + FK `leads.motivo_perda_id`
    // aplicadas via scripts/migrate-motivos-perda.cjs no banco real, nunca como
    // arquivo .sql — mesmo débito de snapshot documentado acima. Sem isto,
    // countLeads() (db.select().from(leads) lista TODAS as colunas do schema)
    // explode com "no such column: motivo_perda_id".
    "CREATE TABLE IF NOT EXISTS motivos_perda (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));",
    "ALTER TABLE `leads` ADD `motivo_perda_id` integer REFERENCES `motivos_perda`(`id`);",
    // Fase 15 (plano 15-01): coluna nullable `leads.interesse` aplicada via
    // scripts/migrate-interesse.cjs no banco real, nunca como arquivo .sql —
    // mesmo débito de snapshot documentado acima. Sem isto, countLeads()
    // (db.select().from(leads) lista TODAS as colunas do schema) explode com
    // "no such column: interesse".
    "ALTER TABLE `leads` ADD `interesse` text;",
  ];
  for (const ddl of manualAlters) {
    try {
      setupDb.exec(ddl);
    } catch (err) {
      if (typeof err?.message === "string" && err.message.includes("duplicate column name")) {
        // Coluna já existe (ex.: virou arquivo de migração real no futuro) — tolerado.
      } else {
        throw err;
      }
    }
  }

  const nichoInsert = setupDb.prepare("INSERT INTO subnichos (nome) VALUES (?)").run("Nutricionista");
  const nichoId = Number(nichoInsert.lastInsertRowid);
  setupDb.close();

  // Importados DEPOIS de DB_FILE_NAME estar setado, para que src/db/client.ts
  // abra a conexão no banco temporário (o módulo é cacheado no primeiro import).
  const { createLead, updateLead } = await import("@/actions/lead-actions");
  const { bulkImportLeads } = await import("@/actions/import-actions");
  const { csvRowSchema, leadSchema } = await import("@/lib/validations");
  const { mapCsvRows } = await import("@/lib/csv-import");
  const { db } = await import("@/db/client");
  const { leads } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  function makeFormData(overrides = {}) {
    const fd = new FormData();
    const base = {
      nome: "Joao Silva",
      telefone: "(11) 91234-5678",
      canal: "whatsapp",
      origem: "Instagram Ads",
      origemTipo: "outbound",
      valorEstimado: "1.234,56",
      notas: "Lead quente, pediu retorno.",
      followUpDate: "2026-08-01",
      nichoId: String(nichoId),
      ...overrides,
    };
    for (const [key, value] of Object.entries(base)) {
      fd.set(key, value);
    }
    return fd;
  }

  async function countLeads() {
    return (await db.select().from(leads)).length;
  }

  // Next.js's revalidatePath() lança "static generation store missing" quando
  // chamado fora de uma request real do Next — mas isso acontece DEPOIS que a
  // escrita no banco já foi confirmada (ver 01-01-SUMMARY.md, mesma pitfall).
  // Tolerar esse throw específico aqui e verificar o efeito real via leitura
  // do banco, em vez de depender do valor de retorno da action nesses casos.
  async function callToleratingRevalidate(fn, formData) {
    try {
      return { threw: false, result: await fn(undefined, formData) };
    } catch (err) {
      if (typeof err?.message === "string" && /revalidatePath|static generation store/i.test(err.message)) {
        return { threw: true, err };
      }
      throw err;
    }
  }

  // Caso 1: createLead com os 9 campos válidos -> insere 1 linha.
  {
    const before = await countLeads();
    const outcome = await callToleratingRevalidate(createLead, makeFormData());
    const after = await countLeads();
    check(after === before + 1, `createLead válido: insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (!outcome.threw) {
      check(outcome.result?.success === true, "createLead válido: retorna { success: true } quando revalidatePath não lança");
    } else {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(row?.telefone === "5511912345678", `createLead válido: telefone normalizado para "5511912345678" (got ${row?.telefone})`);
    check(row?.valorEstimado === 123456, `createLead válido: valorEstimado === 123456 centavos (got ${row?.valorEstimado})`);
  }

  // Caso 2: nome vazio -> erro, não insere.
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ nome: "" }));
    const after = await countLeads();
    check(after === before, "createLead com nome vazio: NÃO insere");
    check(
      Array.isArray(result?.errors?.nome) && result.errors.nome.includes("Nome é obrigatório."),
      `createLead com nome vazio: errors.nome inclui "Nome é obrigatório." (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 3: telefone inválido -> erro, não insere.
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ telefone: "1234" }));
    const after = await countLeads();
    check(after === before, "createLead com telefone inválido: NÃO insere");
    check(
      Array.isArray(result?.errors?.telefone) && result.errors.telefone.length > 0,
      `createLead com telefone inválido: errors.telefone presente (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 4: valor vazio -> erro "Valor estimado é obrigatório.", não insere.
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ valorEstimado: "" }));
    const after = await countLeads();
    check(after === before, "createLead com valor vazio: NÃO insere");
    check(
      Array.isArray(result?.errors?.valorEstimado) &&
        result.errors.valorEstimado.includes("Valor estimado é obrigatório."),
      `createLead com valor vazio: errors.valorEstimado inclui "Valor estimado é obrigatório." (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 5: valor "abc1" (caractere inválido embutido) -> mesmo erro, não insere.
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ valorEstimado: "abc1" }));
    const after = await countLeads();
    check(after === before, 'createLead com valor "abc1": NÃO insere');
    check(
      Array.isArray(result?.errors?.valorEstimado) &&
        result.errors.valorEstimado.includes("Valor estimado é obrigatório."),
      `createLead com valor "abc1": errors.valorEstimado inclui "Valor estimado é obrigatório." (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 6: nichoId inexistente (pré-checagem via SELECT) -> erro, não insere.
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ nichoId: "999999" }));
    const after = await countLeads();
    check(after === before, "createLead com nichoId inexistente: NÃO insere");
    check(
      Array.isArray(result?.errors?.nichoId) &&
        result.errors.nichoId.includes("Selecione um nicho."),
      `createLead com nichoId inexistente: errors.nichoId inclui "Selecione um nicho." (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 7: updateLead com id válido -> atualiza a linha existente (não cria nova).
  {
    const inserted = await db
      .insert(leads)
      .values({
        nome: "Original",
        telefone: "5511911111111",
        canal: "instagram",
        origem: "CSV",
        valorEstimado: 1000,
        notas: "nota original",
        followUpDate: new Date("2026-01-01"),
        nichoId,
        stage: "novo",
      })
      .returning({ id: leads.id });
    const id = inserted[0].id;

    const before = await countLeads();
    const outcome = await callToleratingRevalidate(updateLead, makeFormData({ nome: "Atualizado", id: String(id) }));
    const after = await countLeads();
    check(after === before, `updateLead com id válido: NÃO cria nova linha (antes=${before}, depois=${after})`);
    if (!outcome.threw) {
      check(outcome.result?.success === true, "updateLead com id válido: retorna { success: true } quando revalidatePath não lança");
    } else {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).where(eq(leads.id, id));
    check(row?.nome === "Atualizado", `updateLead com id válido: linha existente foi atualizada (got nome=${row?.nome})`);
  }

  // Caso 8 (backstop de FK, parte a — CONTRATO DO BANCO): db.insert(leads)
  // DIRETO (bypassando createLead) com nichoId inexistente deve lançar
  // err.code === "SQLITE_CONSTRAINT_FOREIGNKEY". Prova que onDelete:"restrict"
  // está ativo e a violação é observável em runtime — NÃO exercita o
  // try/catch de createLead, só o contrato de FK do driver.
  {
    let thrownErr = null;
    try {
      await db.insert(leads).values({
        nome: "Bypass FK",
        telefone: "5511922222222",
        canal: "instagram",
        origem: "CSV",
        valorEstimado: 500,
        notas: "teste de backstop de FK",
        followUpDate: new Date("2026-01-01"),
        nichoId: 999999,
        stage: "novo",
      });
    } catch (err) {
      thrownErr = err;
    }
    check(thrownErr !== null, "db.insert(leads) DIRETO com nichoId inexistente: lança um erro");
    check(
      thrownErr?.code === "SQLITE_CONSTRAINT_FOREIGNKEY",
      `db.insert(leads) DIRETO com nichoId inexistente: err.code === "SQLITE_CONSTRAINT_FOREIGNKEY" (got ${thrownErr?.code})`
    );
  }

  // Caso 9 (ORIGEM-01/02): createLead com origemTipo vazio -> erro, não
  // insere. Prova automatizada do critério de aceite "submeter o formulário
  // de criação sem selecionar origemTipo bloqueia o submit com erro de
  // validação visível" (08-SPEC.md Requirement 1).
  {
    const before = await countLeads();
    const result = await createLead(undefined, makeFormData({ origemTipo: "" }));
    const after = await countLeads();
    check(after === before, "createLead com origemTipo vazio: NÃO insere");
    check(
      Array.isArray(result?.errors?.origemTipo) &&
        result.errors.origemTipo.includes("Selecione o tipo de origem."),
      `createLead com origemTipo vazio: errors.origemTipo inclui "Selecione o tipo de origem." (got ${JSON.stringify(result?.errors)})`
    );
  }

  // Caso 10 (ORIGEM-01/02): createLead com origemTipo="inbound" -> insere 1
  // linha e persiste o valor escolhido. Prova automatizada do critério de
  // aceite "criar um lead com origemTipo selecionado persiste o valor".
  {
    const before = await countLeads();
    const outcome = await callToleratingRevalidate(createLead, makeFormData({ origemTipo: "inbound" }));
    const after = await countLeads();
    check(after === before + 1, `createLead com origemTipo="inbound": insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (!outcome.threw) {
      check(outcome.result?.success === true, 'createLead com origemTipo="inbound": retorna { success: true } quando revalidatePath não lança');
    } else {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(row?.origemTipo === "inbound", `createLead com origemTipo="inbound": linha persistida com origemTipo === "inbound" (got ${row?.origemTipo})`);
  }

  // makeImportRow: formato ConfirmedImportRow (o que csv-import-preview-table.tsx
  // monta de verdade). Deliberadamente SEM a chave origemTipo — o CSV do
  // cowork nunca traz essa coluna e o wizard nunca coleta essa escolha
  // (WR-03, 08-REVIEW.md). "Nutricionista" já foi semeado no bootstrap acima.
  function makeImportRow(overrides = {}) {
    return {
      nome: "Importado CSV",
      telefone: "(11) 98888-7777",
      canal: "whatsapp",
      origem: "Importação CSV",
      valorEstimado: "0",
      notas: "Importado via CSV.",
      nichoNome: "Nutricionista",
      ...overrides,
    };
  }

  // Caso 11 (WR-03): prova que o default de origemTipo vem do ZOD
  // (csvRowSchema), não do DEFAULT físico da coluna SQLite. Precisa ser
  // separado do Caso 12: se alguém trocar `.default(...)` por `.optional()`
  // em csvRowSchema, `row.origemTipo` chega undefined, o Drizzle OMITE a
  // coluna do INSERT e o `.default('outbound')` do schema Drizzle preenche
  // 'outbound' mesmo assim — a linha persistida continuaria correta e essa
  // regressão passaria despercebida só olhando o banco. Só a asserção sobre
  // a saída do safeParse detecta essa troca.
  {
    const parsed = csvRowSchema.safeParse(makeImportRow());
    check(parsed.success === true, "csvRowSchema.safeParse(linha sem origemTipo): success === true");
    check(
      parsed.success && parsed.data.origemTipo === "outbound",
      `csvRowSchema.safeParse(linha sem origemTipo): data.origemTipo === "outbound" (got ${parsed.success ? parsed.data.origemTipo : "n/a"})`
    );
  }

  // Caso 12 (WR-03): prova de ponta a ponta — bulkImportLeads real, linha sem
  // origemTipo, persistência lida de volta do banco temporário.
  {
    const before = await countLeads();
    let result;
    try {
      result = await bulkImportLeads([makeImportRow()]);
    } catch (err) {
      if (typeof err?.message === "string" && /revalidatePath|static generation store/i.test(err.message)) {
        result = undefined;
        console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
      } else {
        throw err;
      }
    }
    const after = await countLeads();
    check(after === before + 1, `bulkImportLeads(linha sem origemTipo): insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (result !== undefined) {
      check(result?.success === true && result?.count === 1, `bulkImportLeads(linha sem origemTipo): retorna { success: true, count: 1 } (got ${JSON.stringify(result)})`);
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(row?.origemTipo === "outbound", `bulkImportLeads(linha sem origemTipo): linha persistida com origemTipo === "outbound" (got ${row?.origemTipo})`);
    check(row?.importBatchId !== null && row?.importBatchId !== undefined, `bulkImportLeads(linha sem origemTipo): linha persistida com importBatchId não-nulo (got ${row?.importBatchId})`);
  }

  // Caso 13 (LEAD-06, Fase 15): createLead com interesse preenchido -> insere
  // 1 linha e persiste o valor. Prova o critério "criar um lead com o campo
  // Interesse preenchido salva o valor".
  let interesseLeadId;
  {
    const before = await countLeads();
    const outcome = await callToleratingRevalidate(
      createLead,
      makeFormData({ interesse: "quer site institucional + automação de WhatsApp" })
    );
    const after = await countLeads();
    check(after === before + 1, `createLead com interesse: insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    interesseLeadId = row?.id;
    check(
      row?.interesse === "quer site institucional + automação de WhatsApp",
      `createLead com interesse: linha persistida com o valor (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 14 (LEAD-06, D-04): updateLead do mesmo lead com interesse vazio ->
  // interesse = NULL no banco. Prova "editar apagando o texto -> NULL".
  {
    const outcome = await callToleratingRevalidate(
      updateLead,
      makeFormData({ id: String(interesseLeadId), interesse: "" })
    );
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).where(eq(leads.id, interesseLeadId));
    check(row?.interesse === null, `updateLead com interesse vazio: interesse volta a NULL (got ${JSON.stringify(row?.interesse)})`);
  }

  // Caso 14a (FIX-01 / WR-01, D-02): createLead com interesse SÓ espaços em
  // branco ("   ") -> ainda cria o lead, mas interesse grava NULL, nunca "".
  // Sem o trim dentro do z.preprocess (D-01), "   " escaparia do `v === ""` e
  // chegaria ao banco como string vazia.
  {
    const before = await countLeads();
    const outcome = await callToleratingRevalidate(
      createLead,
      makeFormData({ interesse: "   " })
    );
    const after = await countLeads();
    check(after === before + 1, `createLead com interesse só espaços: ainda insere exatamente 1 linha (antes=${before}, depois=${after})`);
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(
      row?.interesse === null,
      `createLead com interesse só espaços: campo grava NULL, nunca "" (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 14b (FIX-01 / WR-01, D-02): updateLead limpando um interesse JÁ
  // existente enviando só espaços em branco ("   ") -> coluna vira NULL.
  // Cobre o override load-bearing `interesse: parsed.data.interesse ?? null`
  // do updateLead (sem o trim de D-01, "   " chegaria como "" e o `?? null`
  // não pegaria, deixando o valor antigo preso na coluna).
  {
    const before = await countLeads();
    const outcomeCreate = await callToleratingRevalidate(
      createLead,
      makeFormData({ interesse: "quer consultoria de tráfego pago" })
    );
    if (outcomeCreate.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [created] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(
      created?.interesse === "quer consultoria de tráfego pago",
      `updateLead (setup): lead criado com interesse não-nulo (got ${JSON.stringify(created?.interesse)})`
    );
    const outcome = await callToleratingRevalidate(
      updateLead,
      makeFormData({ id: String(created?.id), interesse: "   " })
    );
    if (outcome.threw) {
      console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
    }
    const [row] = await db.select().from(leads).where(eq(leads.id, created?.id));
    check(
      row?.interesse === null,
      `updateLead limpando com só espaços: interesse vira NULL (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 15 (LEAD-06, D-05): interesse acima de 500 chars reprova o
  // leadSchema (caminho do formulário manual) com a mensagem PT-BR.
  {
    const parsed = leadSchema.safeParse(
      Object.fromEntries(makeFormData({ interesse: "x".repeat(501) }))
    );
    check(parsed.success === false, "leadSchema.safeParse com interesse de 501 chars: success === false");
    const msgs = parsed.success ? [] : parsed.error.flatten().fieldErrors.interesse ?? [];
    check(
      msgs.some((m) => m.includes("500")),
      `leadSchema.safeParse com interesse de 501 chars: mensagem contém "500" (got ${JSON.stringify(msgs)})`
    );
  }

  // Caso 16 (LEAD-06): csvRowSchema continua resolvendo uma linha SEM
  // interesse — o campo opcional flui, não quebra imports sem a coluna.
  {
    const parsed = csvRowSchema.safeParse(makeImportRow());
    check(parsed.success === true, "csvRowSchema.safeParse(linha sem interesse): success === true");
  }

  // Caso 17 (LEAD-06, Fase 15-02): bulkImportLeads com interesse mapeado ->
  // o valor chega ao lead importado. Prova a metade "CSV" de LEAD-06.
  {
    const before = await countLeads();
    try {
      await bulkImportLeads([makeImportRow({ interesse: "quer site institucional" })]);
    } catch (err) {
      if (typeof err?.message === "string" && /revalidatePath|static generation store/i.test(err.message)) {
        console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
      } else {
        throw err;
      }
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(
      row?.interesse === "quer site institucional",
      `bulkImportLeads(interesse mapeado): linha persistida com o valor (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 18 (LEAD-06, D-11): bulkImportLeads sem mapear interesse -> interesse
  // NULL no lead importado, nenhuma regressão no fluxo antigo.
  {
    const before = await countLeads();
    try {
      await bulkImportLeads([makeImportRow()]);
    } catch (err) {
      if (typeof err?.message === "string" && /revalidatePath|static generation store/i.test(err.message)) {
        console.log("  (revalidatePath lançou fora do contexto Next, como esperado — verificado via leitura do banco)");
      } else {
        throw err;
      }
    }
    const [row] = await db.select().from(leads).orderBy(leads.id).limit(1).offset(before);
    check(
      row?.interesse === null,
      `bulkImportLeads(sem interesse): linha persistida com interesse NULL (got ${JSON.stringify(row?.interesse)})`
    );
  }

  // Caso 19 (LEAD-06, D-10): célula de interesse gigante no CSV -> mapCsvRows
  // trunca em 500 ANTES da validação, a linha nunca reprova.
  {
    const mapping = {
      nome: null,
      telefone: null,
      nichoNome: null,
      canal: null,
      origem: null,
      valorEstimado: null,
      notas: null,
      interesse: "Interesse",
    };
    const result = mapCsvRows([{ Interesse: "z".repeat(600) }], mapping);
    check(
      result[0]?.interesse.length === 500,
      `mapCsvRows(célula de 600 chars): result[0].interesse truncado em 500 (got ${result[0]?.interesse.length})`
    );
  }

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* best-effort cleanup; better-sqlite3 pode manter o handle aberto neste processo */
  }
  try {
    fs.unlinkSync(tmpDb + "-shm");
  } catch {}
  try {
    fs.unlinkSync(tmpDb + "-wal");
  } catch {}
}

(async () => {
  staticCheckFkWiring();
  await runBehaviorTests();

  if (failed > 0) {
    console.error(`\n[test-lead-actions] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-lead-actions] OK: todas as asserções passaram.");
})().catch((err) => {
  console.error("[test-lead-actions] ERRO:", err.stack || err);
  process.exit(1);
});
