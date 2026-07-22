# Phase 2: CSV Bulk Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 2-csv-bulk-import
**Areas discussed:** Formato real do CSV do cowork, Duplicados por telefone (IMPORT-02), Sub-nicho desconhecido no CSV, Gatilho de 1º contato em lote (WA-04)

---

## Formato real do CSV do cowork

| Option | Description | Selected |
|--------|-------------|----------|
| Não tenho ainda — seguir por suposição | Construir com base em padrões típicos e validar depois com arquivo real | ✓ |
| Tenho uma amostra, vou descrever agora | Usar amostra concreta em vez de suposição | |

**User's choice:** Não tem amostra ainda; seguir por suposição.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detectar vírgula ou ponto-e-vírgula | PapaParse já suporta nativamente | (ver notas) |
| Assumir sempre ponto-e-vírgula | Mais simples, quebra com CSV de vírgula | |

**User's choice:** Auto-detectar.
**Notes:** O admin esclareceu que ele mesmo usa Google Sheets (não Excel) para planilhas, por ser gratuito. Google Sheets exporta CSV com vírgula+UTF-8 por padrão, diferente do Excel BR (ponto-e-vírgula). Esse detalhe reforça a necessidade de auto-detecção em vez de assumir um formato fixo.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detectar encoding | Evita corromper acentos | ✓ |
| Assumir sempre UTF-8 | Mais simples, risco de corrupção silenciosa | |

**User's choice:** Auto-detectar encoding.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Só nome+telefone garantidos, resto varia | Mapeamento trata demais campos como opcionais | ✓ |
| Cowork sempre manda formato fixo completo | Admin descreveria as colunas exatas | |

**User's choice:** Só nome+telefone garantidos.
**Notes:** Admin não lembra as colunas exatas que o cowork manda hoje, mas afirma que "o cowork manda o que eu pedir" — ou seja, o formato de colunas é sob demanda/flexível, não um template fixo estabelecido.

---

## Duplicados por telefone (IMPORT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Marcar a linha, admin decide por linha | Pular ou importar mesmo assim, por linha | ✓ |
| Pular automaticamente | Zero cliques, menos visibilidade | |
| Bloquear a importação inteira | Conservador, péssima UX em lote | |

**User's choice:** Marcar a linha, admin decide por linha.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Comparar normalizado | Reusa normalizePhone() existente | ✓ |
| Comparar texto exato | Mais simples, deixa passar duplicata disfarçada | |

**User's choice:** Comparar normalizado.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Comparar nos dois sentidos (banco + dentro do CSV) | Cobre reexportação acidental do mesmo lead | ✓ |
| Comparar só contra o banco | Mais simples, deixa passar duplicata intra-lote | |

**User's choice:** Comparar nos dois sentidos.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre cria lead novo separado | Simples e previsível pro v1 | ✓ |
| Atualiza o lead existente | Exige regra de merge campo a campo | |

**User's choice:** Sempre cria lead novo separado.
**Notes:** Nenhuma.

---

## Sub-nicho desconhecido no CSV

| Option | Description | Selected |
|--------|-------------|----------|
| Criar o sub-nicho automaticamente | Consistente com sub-nicho já ser lista extensível | ✓ |
| Bloquear a linha até mapeamento manual | Mais seguro contra quase-duplicatas, mais fricção | |
| Deixar sem sub-nicho | Inviável — subnichoId é NOT NULL (LEAD-03) | |

**User's choice:** Criar automaticamente.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar destacado na preview | Lista sub-nichos novos antes de confirmar | ✓ |
| Criar silenciosamente | Menos fricção, mais risco de quase-duplicata | |

**User's choice:** Mostrar destacado na preview.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Mesma regra da Fase 1, sem mudança | Sem detecção de similaridade | ✓ |
| Aviso brando visual pra nomes parecidos | Sinal visual simples, sem lógica de similaridade | |

**User's choice:** Mesma regra da Fase 1, sem mudança.
**Notes:** Nenhuma.

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear a linha, seleção manual na preview | subnichoId é obrigatório | ✓ |
| Pular a linha automaticamente | Lead nem entra no sistema | |

**User's choice:** Bloquear a linha, seleção manual na preview.
**Notes:** Nenhuma.

---

## Gatilho de 1º contato em lote (WA-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Não dispara automaticamente em lote | Reserva o auto-open pra criação manual (Fase 4 D-18/19) | ✓ |
| Dispara só quando lote = 1 lead | Comporta-se como criação manual nesse caso específico | |
| Pós-import mostra lista com botão por lead | Um clique por lead, sem abrir modal sozinho | |

**User's choice:** Não dispara automaticamente em lote (primeira pergunta) — depois, ao aprofundar o fluxo pós-import, o admin descreveu um cenário que combina elementos das opções 1 e 3.
**Notes:** O admin trouxe duas ideias extras que precisaram de esclarecimento porque conflitavam com restrições já travadas do projeto:
1. Mensagem de prospecção universal escrita por IA, pesquisando o nicho e personalizando por cliente — **conflita com decisão travada em PROJECT.md** ("IA fica como possível v2"). Não implementado nesta fase; registrado em Deferred Ideas do CONTEXT.md.
2. Envio "automático" da mensagem pra todos os leads importados — **inviável dentro da restrição de não usar API paga do WhatsApp** (só `wa.me` manual). Esclarecido com o admin, que confirmou a alternativa viável: tela pós-import com botão "Enviar WhatsApp" por lead (reusando o template padrão de 1º contato e o componente da Fase 4), clicado um a um pelo admin — capturado como D-14.

O admin confirmou explicitamente essa reformulação com "Sim, os dois" quando perguntado se essa era a interpretação correta E se a personalização por IA deveria ficar registrada como ideia futura (v2).

---

## Claude's Discretion

- Exact schema shape for import-batch tracking (LEAD-05): single `importBatchId` column vs. dedicated `import_batches` table.
- Exact route/page structure for upload → mapping → preview → post-import screen.
- Whether the post-import send screen (D-14) is a dedicated route or a filtered view of an existing page.
- Visual treatment of flagged rows (duplicate / new-sub-nicho / blocked-empty-subnicho) in the preview table.

## Deferred Ideas

- **Mensagens de prospecção personalizadas por IA** (pesquisando o nicho, adaptando por cliente) — explicitamente fora de escopo do v1 per PROJECT.md; o admin reafirmou interesse nisso para o futuro durante esta discussão. Candidato forte a v2.
- **Envio de WhatsApp verdadeiramente automático/em massa** — inviável sem WhatsApp Business API (fora de escopo do projeto). Equivalente viável capturado como D-14 (botão por lead, ainda clicado manualmente).
- `.planning/todos/pending/2026-07-21-sequencia-follow-up-escalonada.md` — revisado, não dobrado nesta fase (não é escopo de importação CSV; parcialmente já tratado na Fase 4).
