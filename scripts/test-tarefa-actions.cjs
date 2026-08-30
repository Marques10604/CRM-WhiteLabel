// Cobertura comportamental das 4 Server Actions da agenda de tarefas soltas
// (Fase 12, plano 12-02, TAREFA-01 / TAREFA-02) — molde de
// `scripts/test-motivo-perda-actions.cjs`:
//
//   - banco SQLite TEMPORÁRIO e isolado em os.tmpdir() (NUNCA toca
//     ./data/crm.db), com `DB_FILE_NAME` setado ANTES de qualquer
//     `await import("@/...")` (src/db/client.ts abre e cacheia a conexão no
//     primeiro import);
//   - DDL cru IDÊNTICO ao de `scripts/migrate-tarefas.cjs` (mesmas 6 colunas,
//     mesmos 2 índices);
//   - `register("./ts-alias-loader.mjs", ...)` resolve o alias "@/";
//     `next-cache-stub-loader.mjs` troca `revalidatePath` por no-op para que
//     os casos possam observar o valor de retorno das actions;
//   - harness `check(condition, message)` com contador `failed` e
//     `process.exit(failed > 0 ? 1 : 0)`.
//
// Nenhum caso usa `DELETE FROM` para limpar estado entre cenários (o guard
// `guard-no-hard-delete.cjs` varre `scripts/` e este arquivo NÃO está na
// ALLOWLIST) — cada cenário usa descrições/ids únicos (precedente registrado
// em STATE.md para as Fases 10-02 e 11).
//
// Os 7 casos:
//   1. createTarefa com descrição + data ISO válidas → { success: true }, 1
//      linha nova, concluida_em NULL, campos batem com o enviado.
//   2. createTarefa com descrição "   " (só espaços) → errors.descricao, nada
//      gravado.
//   3. createTarefa sem `data` / com data não-parseável → errors.data, nada
//      gravado.
//   4. updateTarefa altera descrição e data de tarefa existente → persiste,
//      updated_at reescrito.
//   5. concluirTarefa(id) → concluida_em preenchido; 2ª chamada com sentinela
//      forçado NÃO sobrescreve (idempotência via isNull no WHERE).
//   6. concluirTarefa(id, { desfazer: true }) → concluida_em volta a NULL.
//   7. deleteTarefa(id) → a linha SOME do banco (hard-delete D-08);
//      deleteTarefa(0) → errors.id, nada removido.
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
    `crm-leads-test-tarefa-actions-${Date.now()}-${process.pid}.db`
  );
  process.env.DB_FILE_NAME = tmpDb;

  // DDL cru IDÊNTICO ao de scripts/migrate-tarefas.cjs.
  const setupDb = new Database(tmpDb);
  setupDb.exec(
    "CREATE TABLE tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT NOT NULL, data INTEGER NOT NULL, concluida_em INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()));"
  );
  setupDb.exec("CREATE INDEX tarefas_concluida_em_idx ON tarefas (concluida_em);");
  setupDb.exec("CREATE INDEX tarefas_data_idx ON tarefas (data);");
  setupDb.close();

  // Importado DEPOIS de DB_FILE_NAME estar setado.
  const { createTarefa, updateTarefa, concluirTarefa, deleteTarefa } = await import(
    "@/actions/tarefa-actions"
  );

  const raw = new Database(tmpDb);
  const rowById = (id) => raw.prepare("SELECT * FROM tarefas WHERE id = ?").get(id);
  const rowByDescricao = (d) =>
    raw.prepare("SELECT * FROM tarefas WHERE descricao = ?").get(d);
  const countAll = () => raw.prepare("SELECT count(*) AS c FROM tarefas").get().c;
  const toSeconds = (iso) => Math.floor(new Date(iso).getTime() / 1000);

  function fd(fields) {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  }

  // --- Caso 1: createTarefa válida -> { success: true }, 1 linha, concluida_em NULL ---
  {
    const before = countAll();
    const iso = new Date("2026-09-10T00:00:00.000Z").toISOString();
    const res = await createTarefa(
      undefined,
      fd({ descricao: "Ligar pro cowork", data: iso })
    );
    check(
      res && "success" in res && res.success === true,
      "Caso 1: createTarefa com descrição + data válidas devolve { success: true }"
    );
    check(
      res && "success" in res && res.tarefa && res.tarefa.concluidaEm === null,
      `Caso 1: a tarefa devolvida tem concluidaEm null (got ${JSON.stringify(res && res.tarefa)})`
    );
    check(
      countAll() === before + 1,
      `Caso 1: grava exatamente 1 linha (antes=${before}, depois=${countAll()})`
    );
    const row = rowByDescricao("Ligar pro cowork");
    check(
      row && row.concluida_em === null,
      `Caso 1: concluida_em NULL no banco (got ${row && row.concluida_em})`
    );
    check(
      row && row.descricao === "Ligar pro cowork",
      "Caso 1: descrição persistida bate com o enviado"
    );
    check(
      row && row.data === toSeconds(iso),
      `Caso 1: data persistida bate com o enviado (esperado ${toSeconds(iso)}, got ${row && row.data})`
    );
  }

  // --- Caso 2: descrição só-espaços -> errors.descricao, nada gravado ---
  {
    const before = countAll();
    const res = await createTarefa(
      undefined,
      fd({ descricao: "   ", data: new Date("2026-09-11T00:00:00.000Z").toISOString() })
    );
    check(
      res &&
        "errors" in res &&
        Array.isArray(res.errors.descricao) &&
        res.errors.descricao.length > 0,
      `Caso 2: descrição só-espaços devolve errors.descricao (got ${JSON.stringify(res)})`
    );
    check(countAll() === before, "Caso 2: nada gravado");
  }

  // --- Caso 3: data ausente / não-parseável -> errors.data, nada gravado ---
  {
    const before = countAll();
    const semData = await createTarefa(undefined, fd({ descricao: "Sem data" }));
    const dataInvalida = await createTarefa(
      undefined,
      fd({ descricao: "Data ruim", data: "nao-e-data" })
    );
    check(
      semData &&
        "errors" in semData &&
        Array.isArray(semData.errors.data) &&
        semData.errors.data.length > 0,
      `Caso 3: data ausente devolve errors.data (got ${JSON.stringify(semData)})`
    );
    check(
      dataInvalida &&
        "errors" in dataInvalida &&
        Array.isArray(dataInvalida.errors.data) &&
        dataInvalida.errors.data.length > 0,
      `Caso 3: data não-parseável devolve errors.data (got ${JSON.stringify(dataInvalida)})`
    );
    check(countAll() === before, "Caso 3: nada gravado");
  }

  // --- Caso 4: updateTarefa altera descrição + data, reescreve updated_at ---
  {
    const iso0 = new Date("2026-09-12T00:00:00.000Z").toISOString();
    const seed = await createTarefa(
      undefined,
      fd({ descricao: "Caso4 antiga", data: iso0 })
    );
    const id = seed.tarefa.id;
    // Força um sentinela baixo conhecido em updated_at para provar a reescrita.
    raw.prepare("UPDATE tarefas SET updated_at = 1 WHERE id = ?").run(id);

    const iso1 = new Date("2026-10-01T00:00:00.000Z").toISOString();
    const res = await updateTarefa(
      undefined,
      fd({ id: String(id), descricao: "Caso4 nova", data: iso1 })
    );
    check(
      res && "success" in res && res.success === true,
      "Caso 4: updateTarefa devolve { success: true }"
    );
    const depois = rowById(id);
    check(
      depois.descricao === "Caso4 nova",
      `Caso 4: descrição nova persiste (got "${depois.descricao}")`
    );
    check(
      depois.data === toSeconds(iso1),
      `Caso 4: data nova persiste (esperado ${toSeconds(iso1)}, got ${depois.data})`
    );
    check(
      depois.updated_at >= 1,
      `Caso 4: updated_at maior ou igual ao valor anterior (sentinela=1, got ${depois.updated_at})`
    );
    check(
      depois.updated_at > 1,
      `Caso 4: updated_at efetivamente reescrito com unixepoch() (got ${depois.updated_at})`
    );
  }

  // --- Caso 5: concluirTarefa(id) preenche concluida_em e é idempotente ---
  {
    const seed = await createTarefa(
      undefined,
      fd({ descricao: "Caso5 alvo", data: new Date("2026-09-13T00:00:00.000Z").toISOString() })
    );
    const id = seed.tarefa.id;

    const done = await concluirTarefa(id);
    check(
      done && "success" in done && done.success === true,
      "Caso 5: concluirTarefa(id) devolve { success: true }"
    );
    check(
      rowById(id).concluida_em !== null,
      `Caso 5: concluida_em preenchido após a 1ª chamada (got ${rowById(id).concluida_em})`
    );

    // Força um sentinel conhecido e prova que a 2ª chamada é no-op (o
    // isNull(concluidaEm) no WHERE não casa mais nenhuma linha).
    raw.prepare("UPDATE tarefas SET concluida_em = 111111 WHERE id = ?").run(id);
    await concluirTarefa(id);
    check(
      rowById(id).concluida_em === 111111,
      `Caso 5: 2ª chamada NÃO sobrescreve o carimbo original — idempotente via isNull no WHERE (got ${rowById(id).concluida_em})`
    );
  }

  // --- Caso 6: concluirTarefa(id, { desfazer: true }) volta concluida_em a NULL ---
  {
    const row = rowByDescricao("Caso5 alvo"); // concluida_em = 111111 do Caso 5
    check(
      row && row.concluida_em === 111111,
      "Caso 6 (pré-condição): 'Caso5 alvo' está concluída"
    );
    const res = await concluirTarefa(row.id, { desfazer: true });
    check(
      res && "success" in res && res.success === true,
      "Caso 6: concluirTarefa(id, { desfazer: true }) devolve { success: true }"
    );
    check(
      rowById(row.id).concluida_em === null,
      `Caso 6: concluida_em volta a NULL — a tarefa reaparece como pendente (got ${rowById(row.id).concluida_em})`
    );
  }

  // --- Caso 7: deleteTarefa(id) remove a linha DE FATO (hard-delete D-08) ---
  {
    const seed = await createTarefa(
      undefined,
      fd({ descricao: "Caso7 alvo", data: new Date("2026-09-14T00:00:00.000Z").toISOString() })
    );
    const id = seed.tarefa.id;

    const before = countAll();
    const res = await deleteTarefa(id);
    check(
      res && "success" in res && res.success === true,
      "Caso 7: deleteTarefa(id) devolve { success: true }"
    );
    check(
      countAll() === before - 1,
      `Caso 7: contagem decrementa em 1 (antes=${before}, depois=${countAll()})`
    );
    check(
      rowById(id) === undefined,
      "Caso 7: a linha SOME do banco (rowById devolve undefined) — prova do hard-delete de D-08"
    );

    // deleteTarefa(0) -> errors.id, nada removido
    const before0 = countAll();
    const invalido = await deleteTarefa(0);
    check(
      invalido &&
        "errors" in invalido &&
        Array.isArray(invalido.errors.id) &&
        invalido.errors.id.length > 0,
      `Caso 7: deleteTarefa(0) devolve errors.id (got ${JSON.stringify(invalido)})`
    );
    check(countAll() === before0, "Caso 7: deleteTarefa(0) não remove nada");
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
      console.error(`\n[test-tarefa-actions] ${failed} falha(s).`);
      process.exit(1);
    }
    console.log(
      "\n[test-tarefa-actions] OK: 7 casos, todas as asserções passaram."
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("[test-tarefa-actions] ERRO:", err.stack || err);
    process.exit(1);
  });
