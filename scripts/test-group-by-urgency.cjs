#!/usr/bin/env node
"use strict";

/**
 * Guarda de regressão para a régua de urgência de `src/db/queries.ts`
 * (Fase 12, plano 12-02, TAREFA-02 / D-04). Cobre trabalho NOVO: apesar do
 * `12-CONTEXT.md` afirmar que `groupLeadsByUrgency` "está testada", NÃO havia
 * nenhum teste dessa função no repositório antes desta fase.
 *
 * As funções são PURAS (sem I/O) mas moram em `src/db/queries.ts`, que
 * importa `@/db/client` no nível de módulo. `DB_FILE_NAME=":memory:"` ANTES
 * do `register` evita abrir/tocar `data/crm.db` só por causa desse import.
 *
 * `now` é injetado FIXO em todas as chamadas para determinismo. Exceção
 * inevitável: `isToday` de date-fns compara com o relógio REAL (não com o
 * `now` injetado) — o único caso que exercita o bucket "hoje" usa a data real
 * de hoje de propósito.
 *
 * Cobre:
 *   groupByUrgency  — fronteiras today-1 (vencidos), today c/ hora ≠ 00:00
 *                     (hoje), today+7 (proximos7Dias), today+8 (nenhum),
 *                     lista vazia (3 buckets vazios).
 *   buildDashboardItems — lista mista lead+tarefa com datas embaralhadas: cada
 *                     item no bucket certo pelo seu próprio campo de data,
 *                     cada bucket ordenado por date ASC, e uma tarefa com data
 *                     anterior aparece ANTES de um lead (asserção direta de D-04).
 *   groupLeadsByUrgency — regressão: wrapper devolve exatamente o mesmo que
 *                     groupByUrgency(leads, l => l.followUpDate, now).
 *
 * Rodar via: node scripts/test-group-by-urgency.cjs (ou npm run test:group-by-urgency)
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

process.env.DB_FILE_NAME = ":memory:";

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

(async () => {
  const { groupByUrgency, groupLeadsByUrgency, buildDashboardItems } = await import(
    "@/db/queries"
  );
  const { addDays, addHours, startOfDay, subDays } = await import("date-fns");

  const NOW = new Date("2026-08-15T12:00:00.000Z");
  const today = startOfDay(NOW);

  // --- groupByUrgency: fronteiras de data ---
  {
    const vencido = { d: subDays(NOW, 1) }; // today - 1
    const t7 = { d: addHours(addDays(today, 7), 5) }; // today + 7 (borda inferior de addDays(today, 8))
    const t8 = { d: addHours(addDays(today, 8), 1) }; // today + 8 -> nenhum bucket
    const res = groupByUrgency([vencido, t7, t8], (x) => x.d, NOW);

    check(
      res.vencidos.includes(vencido) && res.vencidos.length === 1,
      `groupByUrgency: item em today-1 cai em vencidos (got ${JSON.stringify(res.vencidos.map((x) => x.d))})`
    );
    check(
      res.proximos7Dias.includes(t7) && res.proximos7Dias.length === 1,
      "groupByUrgency: item em today+7 cai em proximos7Dias (limite addDays(today, 8) exclusivo)"
    );
    check(
      !res.vencidos.includes(t8) &&
        !res.hoje.includes(t8) &&
        !res.proximos7Dias.includes(t8),
      "groupByUrgency: item em today+8 não cai em NENHUM bucket"
    );
  }

  // --- groupByUrgency: bucket "hoje" (exercita isToday, hora != meia-noite) ---
  {
    const realToday = new Date();
    const meioDiaHoje = { d: addHours(startOfDay(realToday), 8) }; // hoje, 08:00
    const res = groupByUrgency([meioDiaHoje], (x) => x.d, realToday);
    check(
      res.hoje.includes(meioDiaHoje),
      `groupByUrgency: item de hoje com hora 08:00 cai em "hoje" via isToday (got ${JSON.stringify(res)})`
    );
  }

  // --- groupByUrgency: lista vazia -> 3 buckets vazios ---
  {
    const res = groupByUrgency([], (x) => x.d, NOW);
    check(
      res.vencidos.length === 0 &&
        res.hoje.length === 0 &&
        res.proximos7Dias.length === 0,
      "groupByUrgency: lista vazia devolve os 3 buckets vazios"
    );
  }

  // --- buildDashboardItems: intercalação por data (D-04) ---
  {
    const leadA = { id: "A", followUpDate: addHours(addDays(today, 3), 10) };
    const leadB = { id: "B", followUpDate: addDays(today, 5) };
    const tarefaX = { id: "X", data: addHours(addDays(today, 1), 9) }; // antes do leadA
    const tarefaY = { id: "Y", data: addDays(today, 2) };
    const leadC = { id: "C", followUpDate: subDays(NOW, 2) }; // vencido
    const tarefaZ = { id: "Z", data: subDays(NOW, 1) }; // vencido, depois do leadC

    // ordem de entrada embaralhada de propósito
    const res = buildDashboardItems(
      [leadB, leadA, leadC],
      [tarefaZ, tarefaX, tarefaY],
      NOW
    );

    const proxKinds = res.proximos7Dias.map((i) => i.kind);
    const proxIds = res.proximos7Dias.map((i) =>
      i.kind === "lead" ? i.lead.id : i.tarefa.id
    );
    check(
      JSON.stringify(proxIds) === JSON.stringify(["X", "Y", "A", "B"]),
      `buildDashboardItems: proximos7Dias ordenado por date ASC = [X,Y,A,B] (got ${JSON.stringify(proxIds)})`
    );
    check(
      JSON.stringify(proxKinds) === JSON.stringify(["tarefa", "tarefa", "lead", "lead"]),
      `buildDashboardItems: D-04 — tarefa (day+1) aparece ANTES do lead (day+3), kinds intercalados (got ${JSON.stringify(proxKinds)})`
    );

    const vencIds = res.vencidos.map((i) =>
      i.kind === "lead" ? i.lead.id : i.tarefa.id
    );
    check(
      JSON.stringify(vencIds) === JSON.stringify(["C", "Z"]),
      `buildDashboardItems: vencidos também intercalados e ordenados por date ASC = [C,Z] (got ${JSON.stringify(vencIds)})`
    );
    check(
      res.hoje.length === 0,
      "buildDashboardItems: bucket hoje vazio para este conjunto (nenhum item na data real de hoje)"
    );
  }

  // --- regressão: groupLeadsByUrgency === groupByUrgency(leads, l => followUpDate) ---
  {
    const leads = [
      { id: 1, followUpDate: subDays(NOW, 3) }, // vencido
      { id: 2, followUpDate: addDays(today, 4) }, // proximos7Dias
      { id: 3, followUpDate: addDays(today, 20) }, // nenhum bucket
    ];
    const viaWrapper = groupLeadsByUrgency(leads, NOW);
    const viaGenerica = groupByUrgency(leads, (l) => l.followUpDate, NOW);

    check(
      viaWrapper.vencidos.length === 1 && viaWrapper.vencidos[0].id === 1,
      "groupLeadsByUrgency: lead vencido no bucket vencidos (comportamento pré-generalização preservado)"
    );
    check(
      viaWrapper.proximos7Dias.length === 1 && viaWrapper.proximos7Dias[0].id === 2,
      "groupLeadsByUrgency: lead em today+4 no bucket proximos7Dias"
    );
    check(
      viaWrapper.hoje.length === 0 &&
        !viaWrapper.vencidos.some((l) => l.id === 3) &&
        !viaWrapper.proximos7Dias.some((l) => l.id === 3),
      "groupLeadsByUrgency: lead em today+20 não aparece em nenhum bucket"
    );
    check(
      JSON.stringify(viaWrapper) === JSON.stringify(viaGenerica),
      "groupLeadsByUrgency: wrapper devolve EXATAMENTE o mesmo que groupByUrgency direto"
    );
  }

  if (failed > 0) {
    console.error(`\n[test-group-by-urgency] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-group-by-urgency] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-group-by-urgency] ERRO:", err.stack || err);
  process.exit(1);
});
