// Cobertura comportamental do CRUD governado de nicho (Fase 22, NICHO-01/02,
// quick 260912-n5w D-04) — espelho de `scripts/test-motivo-perda-actions.cjs`:
// banco SQLite TEMPORÁRIO e isolado em os.tmpdir() (nunca toca ./data/crm.db),
// `DB_FILE_NAME` setado ANTES de qualquer `await import("@/...")`,
// `register("./ts-alias-loader.mjs", ...)` para resolver o alias "@/", harness
// `check(condition, message)` com contador `failed` e
// `process.exit(failed > 0 ? 1 : 0)`.
//
// `next-cache-stub-loader.mjs` troca `revalidatePath` por no-op para que os 7
// casos possam observar o valor de retorno das actions (o shape ampliado
// `{ success: true, id }` é o pré-requisito de D-04, consumido pelo
// `nicho-combobox.tsx` criável).
//
// Nenhum caso usa `DELETE FROM` para limpar estado entre cenários (o guard
// varre `scripts/`) — cada cenário usa nomes/ids únicos (mesmo precedente
// registrado em STATE.md para a Fase 10-02 / test-motivo-perda-actions.cjs).
"use strict";

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

// Ordem importa: o stub-loader é registrado por último para executar primeiro
// e curto-circuitar "next/cache" antes do ts-alias-loader.
register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"));
register("./test-support/next-cache-stub-loader.mjs", pathToFileURL(__dirname + "/"));

let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failed++;
  }
}

async function main() {
  const tmpDb = path.join(
    os.tmpdir(),
    `crm-leads-test-nicho-actions-${Date.now()}-${process.pid}.db`
  );
  process.env.DB_FILE_NAME = tmpDb;

  // DDL cru da tabela FÍSICA `subnichos` (o export lógico é `nichos`, ver
  // divergência deliberada nome-lógico ↔ nome-físico em src/db/schema.ts, D-01
  // da Fase 13).
  const setupDb = new Database(tmpDb);
  setupDb.pragma("foreign_keys = ON");
  setupDb.exec(
    "CREATE TABLE subnichos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, deleted_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));"
  );
  setupDb.exec(
    "CREATE UNIQUE INDEX subnicho_nome_unique_idx ON subnichos (lower(trim(nome)));"
  );
  setupDb.exec(
    "CREATE INDEX subnichos_deleted_at_idx ON subnichos (deleted_at);"
  );
  setupDb.close();

  // Importado DEPOIS de DB_FILE_NAME estar setado — src/db/client.ts abre a
  // conexão no primeiro import e a cacheia.
  const { createNicho, renameNicho, softDeleteNicho } =
    await import("@/actions/nicho-actions");

  const raw = new Database(tmpDb);
  const rowByName = (nome) =>
    raw
      .prepare(
        "SELECT * FROM subnichos WHERE lower(trim(nome)) = lower(trim(?))"
      )
      .get(nome);
  const rowById = (id) =>
    raw.prepare("SELECT * FROM subnichos WHERE id = ?").get(id);
  const countAll = () =>
    raw.prepare("SELECT count(*) AS c FROM subnichos").get().c;
  const snapshot = () =>
    JSON.stringify(
      raw
        .prepare("SELECT id, nome, deleted_at FROM subnichos ORDER BY id")
        .all()
    );

  function fd(fields) {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  }

  // --- Caso 1: nome novo -> { success: true, id } + grava exatamente 1 linha ---
  {
    const before = countAll();
    const res = await createNicho(undefined, fd({ nome: "Nutricionista" }));
    check(
      res && "success" in res && res.success === true,
      "Caso 1: createNicho com nome novo devolve { success: true, ... }"
    );
    check(
      res && "success" in res && Number.isInteger(res.id) && res.id > 0,
      `Caso 1: id retornado é inteiro positivo (got ${JSON.stringify(res)})`
    );
    check(
      countAll() === before + 1,
      `Caso 1: grava exatamente 1 linha (antes=${before}, depois=${countAll()})`
    );
    const row = rowByName("Nutricionista");
    check(
      row && res && "success" in res && res.id === row.id,
      "Caso 1: o id retornado é o da linha efetivamente gravada"
    );
  }

  // --- Caso 2: nome já ativo (variando caixa e espaços) -> erro, sem 2a linha ---
  {
    const before = countAll();
    const res = await createNicho(
      undefined,
      fd({ nome: "  nUTRICIONISTA  " })
    );
    check(
      res &&
        "errors" in res &&
        Array.isArray(res.errors.nome) &&
        res.errors.nome[0] === "Esse nicho já existe.",
      `Caso 2: nome ativo (case/space-insensitive) devolve { errors: { nome: ["Esse nicho já existe."] } } (got ${JSON.stringify(res)})`
    );
    check(countAll() === before, "Caso 2: NÃO grava segunda linha");
  }

  // --- Caso 3: softDeleteNicho preenche deleted_at e é idempotente ---
  {
    const seed = await createNicho(undefined, fd({ nome: "Caso3 alvo" }));
    const id = seed.id;

    const del = await softDeleteNicho(id);
    check(
      del && "success" in del && del.success === true && del.id === id,
      "Caso 3: softDeleteNicho devolve { success: true, id } com o id recebido"
    );
    const afterFirst = rowById(id);
    check(
      afterFirst.deleted_at !== null,
      `Caso 3: deleted_at preenchido após a 1a remoção (got ${afterFirst.deleted_at})`
    );

    // Força um sentinel conhecido e prova que a 2a chamada é no-op (o
    // isNull(deletedAt) no WHERE não casa mais nenhuma linha).
    raw.prepare("UPDATE subnichos SET deleted_at = 111111 WHERE id = ?").run(id);
    await softDeleteNicho(id);
    const afterSecond = rowById(id);
    check(
      afterSecond.deleted_at === 111111,
      `Caso 3: 2a chamada não altera o deleted_at existente — idempotente (got ${afterSecond.deleted_at})`
    );
  }

  // --- Caso 4: recriar nome soft-deletado REATIVA (mesmo id, contagem estável) ---
  {
    const deletedRow = rowByName("Caso3 alvo");
    check(
      deletedRow && deletedRow.deleted_at !== null,
      "Caso 4 (pré-condição): 'Caso3 alvo' está soft-deletado"
    );
    const before = countAll();
    const res = await createNicho(undefined, fd({ nome: "caso3 ALVO" }));
    check(
      res && "success" in res && res.success === true,
      "Caso 4: recriar nome soft-deletado devolve success (reativação, não bloqueio)"
    );
    check(
      res && "success" in res && res.id === deletedRow.id,
      `Caso 4: devolve o MESMO id da linha original (esperado ${deletedRow.id}, got ${res && res.id})`
    );
    check(
      countAll() === before,
      `Caso 4: contagem total inalterada — não duplica (antes=${before}, depois=${countAll()})`
    );
    const reactivated = rowById(deletedRow.id);
    check(reactivated.deleted_at === null, "Caso 4: deleted_at volta a ser nulo");
    check(
      reactivated.nome === "caso3 ALVO",
      `Caso 4: regrava a grafia recém-digitada (got "${reactivated.nome}")`
    );
  }

  // --- Caso 5: renameNicho para um nome livre persiste ---
  {
    const seed = await createNicho(undefined, fd({ nome: "Caso5 antigo" }));
    const res = await renameNicho(
      undefined,
      fd({ id: String(seed.id), nome: "Caso5 novo" })
    );
    check(
      res && "success" in res && res.success === true && res.id === seed.id,
      "Caso 5: renameNicho para nome livre devolve { success: true, id }"
    );
    check(
      rowById(seed.id).nome === "Caso5 novo",
      `Caso 5: novo nome persiste (got "${rowById(seed.id).nome}")`
    );
  }

  // --- Caso 6: renameNicho para nome já usado por OUTRA linha -> erro ---
  {
    const a = await createNicho(undefined, fd({ nome: "Caso6 A" }));
    const b = await createNicho(undefined, fd({ nome: "Caso6 B" }));
    const before = snapshot();
    const res = await renameNicho(
      undefined,
      fd({ id: String(b.id), nome: "  caso6 a  " })
    );
    check(
      res &&
        "errors" in res &&
        res.errors.nome[0] === "Esse nicho já existe.",
      `Caso 6: rename colidindo com OUTRA linha devolve erro (got ${JSON.stringify(res)})`
    );
    check(snapshot() === before, "Caso 6: banco inalterado após a colisão");
    check(a && b, "Caso 6 (sanity): as duas linhas foram criadas");
  }

  // --- Caso 7: nome vazio / só espaços -> erro de validação, nada gravado ---
  {
    const before = countAll();
    const vazio = await createNicho(undefined, fd({ nome: "" }));
    const espacos = await createNicho(undefined, fd({ nome: "    " }));
    check(
      vazio &&
        "errors" in vazio &&
        Array.isArray(vazio.errors.nome) &&
        vazio.errors.nome.length > 0,
      `Caso 7: nome vazio devolve erro de validação (got ${JSON.stringify(vazio)})`
    );
    check(
      espacos &&
        "errors" in espacos &&
        Array.isArray(espacos.errors.nome) &&
        espacos.errors.nome.length > 0,
      `Caso 7: nome só com espaços devolve erro de validação (got ${JSON.stringify(espacos)})`
    );
    check(countAll() === before, "Caso 7: nada gravado");
  }

  raw.close();

  for (const suffix of ["", "-shm", "-wal"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* best-effort */
    }
  }
}

main()
  .then(() => {
    if (failed > 0) {
      console.error(`\n[test-nicho-actions] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log(
      "\n[test-nicho-actions] OK: 7 casos, todas as asserções passaram."
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("[test-nicho-actions] ERRO:", err.stack || err);
    process.exit(1);
  });
