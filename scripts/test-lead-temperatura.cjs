#!/usr/bin/env node
"use strict";

/**
 * Guarda code+data da classificação de temperatura de lead em 3 faixas
 * (quick task 260912-omq, TEMP-01/02/03).
 *
 * Exercita as funções PURAS de `src/lib/lead-temperatura.ts` (zero DOM) com
 * data-base FIXA (nunca `new Date()` real, para o harness não depender do
 * relógio da máquina).
 *
 * Cobre:
 *   - Fronteiras 0% / 40% / 50% (inclusiva morno) / 90% / 100% (inclusiva
 *     frio) / muito acima do limite (limite = 10 dias, etapa `contatado`)
 *   - As 3 exclusões que retornam `null`: etapa `fechado`, etapa `perdido`,
 *     `stageChangedAt` nulo
 *   - Bordas: `stageChangedAt` no futuro (N negativo) -> "quente"; limite = 1
 *     (faixa morna inexistente)
 *   - `buildLimitesPorEtapa`: `fechado`/`perdido` OMITIDOS do mapa resultante
 *   - `computeTemperaturaPorLead`: mapeia + omite os `null`
 *   - Loop de paridade N = 0..15 contra a fórmula booleana antiga do
 *     `esfriandoLeadIds` (`limite != null && stageChangedAt != null &&
 *     differenceInDays(agora, stageChangedAt) >= limite`), provando que
 *     `computeTemperatura(...) === "frio"` see somente see a fórmula antiga
 *     for verdadeira
 *
 * Rodar via: node scripts/test-lead-temperatura.cjs (ou npm run test:lead-temperatura)
 * Exit 0 = tudo passou. Exit 1 = alguma violação (mensagem descritiva + total).
 */

const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

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
  const { subDays, differenceInDays } = await import("date-fns");
  const m = await import("@/lib/lead-temperatura");
  const {
    LIMIAR_MORNO,
    buildLimitesPorEtapa,
    computeTemperatura,
    computeTemperaturaPorLead,
  } = m;

  /** Data-base FIXA — nunca o relógio real da máquina. */
  const AGORA = new Date(2026, 8, 12, 12, 0, 0);

  /** Fixture de lead: monta `{ id, stage, stageChangedAt }` a partir de dias parados. */
  function leadFixture({ id = 1, stage, diasParado }) {
    return {
      id,
      stage,
      stageChangedAt: diasParado == null ? null : subDays(AGORA, diasParado),
    };
  }

  check(LIMIAR_MORNO === 0.5, `LIMIAR_MORNO === 0.5 (got ${LIMIAR_MORNO})`);

  const LIMITES_CONTATADO_10 = { contatado: 10 };

  // --- Fronteiras (limite = 10, etapa contatado) ---
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 0 }), LIMITES_CONTATADO_10, AGORA) === "quente",
    `N=0 (0%) -> "quente"`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 4 }), LIMITES_CONTATADO_10, AGORA) === "quente",
    `N=4 (40%) -> "quente"`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 5 }), LIMITES_CONTATADO_10, AGORA) === "morno",
    `N=5 (50% exato, inclusivo) -> "morno"`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 9 }), LIMITES_CONTATADO_10, AGORA) === "morno",
    `N=9 (90%) -> "morno"`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 10 }), LIMITES_CONTATADO_10, AGORA) === "frio",
    `N=10 (100% exato, inclusivo) -> "frio"`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: 40 }), LIMITES_CONTATADO_10, AGORA) === "frio",
    `N=40 (muito acima) -> "frio"`
  );

  // --- Exclusões: retornam null, NUNCA uma string de temperatura ---
  check(
    computeTemperatura(leadFixture({ stage: "fechado", diasParado: 40 }), LIMITES_CONTATADO_10, AGORA) === null,
    `stage "fechado" -> null (ausente do mapa de limites)`
  );
  check(
    computeTemperatura(leadFixture({ stage: "perdido", diasParado: 40 }), LIMITES_CONTATADO_10, AGORA) === null,
    `stage "perdido" -> null (ausente do mapa de limites)`
  );
  check(
    computeTemperatura(leadFixture({ stage: "contatado", diasParado: null }), LIMITES_CONTATADO_10, AGORA) === null,
    `stageChangedAt null -> null (mesmo com limite configurado)`
  );
  check(
    computeTemperatura(leadFixture({ stage: "novo", diasParado: 40 }), LIMITES_CONTATADO_10, AGORA) === null,
    `limite ausente/undefined para a etapa -> null`
  );

  // --- Bordas ---
  check(
    computeTemperatura(
      { stage: "contatado", stageChangedAt: subDays(AGORA, -3) },
      LIMITES_CONTATADO_10,
      AGORA
    ) === "quente",
    `stageChangedAt no futuro (N negativo) -> "quente" (nunca quebra, nunca NaN)`
  );
  {
    const limiteUm = { contatado: 1 };
    check(
      computeTemperatura(leadFixture({ stage: "contatado", diasParado: 0 }), limiteUm, AGORA) === "quente",
      `limite=1, N=0 -> "quente"`
    );
    check(
      computeTemperatura(leadFixture({ stage: "contatado", diasParado: 1 }), limiteUm, AGORA) === "frio",
      `limite=1, N=1 -> "frio" (faixa morna inexistente nesse limite)`
    );
  }

  // --- buildLimitesPorEtapa: fechado/perdido OMITIDOS do mapa resultante ---
  {
    const limites = buildLimitesPorEtapa({
      diasParadoNovo: 999999,
      diasParadoContatado: 5,
      diasParadoNegociacao: 999999,
    });
    check(limites.novo === 999999, `buildLimitesPorEtapa: novo === 999999`);
    check(limites.contatado === 5, `buildLimitesPorEtapa: contatado === 5`);
    check(limites.negociacao === 999999, `buildLimitesPorEtapa: negociacao === 999999`);
    check(!("fechado" in limites), `buildLimitesPorEtapa: "fechado" OMITIDO do mapa`);
    check(!("perdido" in limites), `buildLimitesPorEtapa: "perdido" OMITIDO do mapa`);
  }

  // --- computeTemperaturaPorLead: mapeia + omite os null ---
  {
    const leads = [
      leadFixture({ id: 1, stage: "contatado", diasParado: 0 }), // quente
      leadFixture({ id: 2, stage: "contatado", diasParado: 5 }), // morno
      leadFixture({ id: 3, stage: "contatado", diasParado: 10 }), // frio
      leadFixture({ id: 4, stage: "fechado", diasParado: 40 }), // null -> omitido
      leadFixture({ id: 5, stage: "contatado", diasParado: null }), // null -> omitido
    ];
    const resultado = computeTemperaturaPorLead(leads, LIMITES_CONTATADO_10, AGORA);
    check(resultado.length === 3, `computeTemperaturaPorLead: omite os null (got length ${resultado.length})`);
    check(
      JSON.stringify(resultado) ===
        JSON.stringify([
          { leadId: 1, temperatura: "quente" },
          { leadId: 2, temperatura: "morno" },
          { leadId: 3, temperatura: "frio" },
        ]),
      `computeTemperaturaPorLead: shape e ordem exatos (got ${JSON.stringify(resultado)})`
    );
  }

  // --- Loop de paridade N=0..15 contra a fórmula booleana antiga (limite=10) ---
  {
    const limite = 10;
    let mismatches = 0;
    for (let n = 0; n <= 15; n++) {
      const stageChangedAt = subDays(AGORA, n);
      const esperado =
        limite != null &&
        stageChangedAt != null &&
        differenceInDays(AGORA, stageChangedAt) >= limite;
      const resultado =
        computeTemperatura({ stage: "contatado", stageChangedAt }, { contatado: limite }, AGORA) === "frio";
      if (resultado !== esperado) {
        mismatches++;
        console.error(`  paridade N=${n}: esperado=${esperado} got=${resultado}`);
      }
    }
    check(mismatches === 0, `paridade N=0..15: computeTemperatura === "frio" sse fórmula antiga verdadeira (${mismatches} mismatch(es))`);
  }

  if (failed > 0) {
    console.error(`\n[test-lead-temperatura] ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\n[test-lead-temperatura] OK: todas as asserções passaram.");
  process.exit(0);
})().catch((err) => {
  console.error("[test-lead-temperatura] ERRO:", err.stack || err);
  process.exit(1);
});
