"use server";

import { and, asc, desc, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campanhas, leads, nichos } from "@/db/schema";
import {
  LIMITE_POR_GRUPO,
  deveBuscar,
  deveBuscarPorTelefone,
  padraoContem,
  somenteDigitos,
} from "@/lib/busca-global";

/**
 * Busca global (Ctrl+K, quick task 260912-pzc, BUSCA-01..06) — Server Action
 * ÚNICA de leitura, consultando leads/campanhas/nichos ao mesmo tempo.
 *
 * T-PZC-01 (disposição: mitigate): o termo do usuário entra SEMPRE como valor
 * interpolado no template `sql` do Drizzle (que vira parâmetro bindado),
 * NUNCA por concatenação de string dentro do SQL. Todo `LIKE` que usa
 * `padraoContem` é obrigatoriamente acompanhado de `ESCAPE '\'` — sem isso, o
 * escape de curinga feito em `@/lib/busca-global` vira decoração inútil (um
 * `%`/`_` digitado pelo usuário voltaria a ser tratado como curinga de SQL).
 *
 * Limitação conhecida e ACEITA: `LIKE`/`lower()` do SQLite só são
 * case-insensitive para ASCII — "joão" e "JOÃO" não se encontram. Resolver
 * isso exigiria uma coluna normalizada ou extensão ICU, ou seja, mudança de
 * schema — vetada por D-08 deste plano.
 *
 * Nunca lança: é chamada a cada digitação, uma exceção estouraria a UI
 * inteira. Termo abaixo do gate mínimo devolve os três grupos vazios sem
 * tocar no banco.
 */
export type ResultadoBusca = {
  leads: { id: number; nome: string; telefone: string; stage: string }[];
  campanhas: { id: number; nichoNome: string; oferta: string }[];
  nichos: { id: number; nome: string }[];
};

const RESULTADO_VAZIO: ResultadoBusca = { leads: [], campanhas: [], nichos: [] };

export async function buscarGlobal(termo: string): Promise<ResultadoBusca> {
  if (!deveBuscar(termo)) {
    return RESULTADO_VAZIO;
  }

  const padrao = padraoContem(termo);
  const buscaPorTelefone = deveBuscarPorTelefone(termo);
  const digitos = buscaPorTelefone ? somenteDigitos(termo) : "";

  const [leadsResultado, campanhasResultado, nichosResultado] = await Promise.all([
    db
      .select({ id: leads.id, nome: leads.nome, telefone: leads.telefone, stage: leads.stage })
      .from(leads)
      .where(
        and(
          isNull(leads.deletedAt),
          or(
            sql`lower(${leads.nome}) LIKE ${padrao} ESCAPE '\\'`,
            buscaPorTelefone
              ? sql`replace(replace(replace(replace(replace(${leads.telefone}, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') LIKE ${`%${digitos}%`}`
              : undefined
          )
        )
      )
      .orderBy(asc(leads.nome))
      .limit(LIMITE_POR_GRUPO),
    db
      .select({ id: campanhas.id, nichoNome: nichos.nome, oferta: campanhas.oferta })
      .from(campanhas)
      .innerJoin(nichos, sql`${campanhas.nichoId} = ${nichos.id}`)
      .where(
        and(
          isNull(campanhas.deletedAt),
          or(
            sql`lower(${nichos.nome}) LIKE ${padrao} ESCAPE '\\'`,
            sql`lower(${campanhas.oferta}) LIKE ${padrao} ESCAPE '\\'`
          )
        )
      )
      .orderBy(desc(campanhas.createdAt))
      .limit(LIMITE_POR_GRUPO),
    db
      .select({ id: nichos.id, nome: nichos.nome })
      .from(nichos)
      .where(and(isNull(nichos.deletedAt), sql`lower(${nichos.nome}) LIKE ${padrao} ESCAPE '\\'`))
      .orderBy(asc(nichos.nome))
      .limit(LIMITE_POR_GRUPO),
  ]);

  return {
    leads: leadsResultado,
    campanhas: campanhasResultado,
    nichos: nichosResultado,
  };
}
