# Phase 16: Correções de Code Review da Fase 15 - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Fecha os 5 achados abertos do `15-REVIEW.md` (2 warnings + 3 info). Mudança
**code-only** sobre superfícies já shipadas (Fases 1, 2, 15): validação Zod do
campo `interesse`, tabela de prévia do wizard de importação CSV, truncamento
defensivo em `csv-import.ts`, comentários em `csv-column-mapper.tsx`, script de
migração `migrate-interesse.cjs`, e o harness de teste `test-lead-actions.cjs`.

**Zero feature funcional nova.** Nenhuma superfície de entrada nova, sem auth,
sem rede, sem schema destrutivo. Não renomear, não governar, não indexar o
campo `interesse` — continua texto livre nullable (LEAD-06 / D-04 da Fase 15).

Cobre FIX-01 (WR-01), FIX-02 (WR-02), FIX-03 (IN-01, IN-02, IN-03).

</domain>

<decisions>
## Implementation Decisions

### FIX-01 — `interesse` só-espaços grava NULL (WR-01)
- **D-01:** O trim acontece **dentro do `z.preprocess`** de `interesse` em
  `src/lib/validations.ts` (não na Server Action). O preprocess passa a fazer
  `const s = typeof v === "string" ? v.trim() : v` e então mapeia
  `s === "" || s == null → undefined`. Idioma consistente com o contrato D-04
  repetido ~4× no código. Segue o snippet do `15-REVIEW.md` §WR-01 como escrito.
- **D-02:** `test-lead-actions.cjs` ganha **dois** casos novos (não só o mínimo
  do ROADMAP SC#1):
  1. `createLead({ interesse: "   " })` → linha persistida com `interesse === null`
  2. `updateLead` limpando um `interesse` já existente com `"   "` → coluna vira `null`
  Motivo do 2º caso: o override `interesse: parsed.data.interesse ?? null` no
  `updateLead` é load-bearing (o review destacou que sem ele a coluna some do
  UPDATE e o valor antigo fica preso). O caso cobre esse caminho.
- **D-03:** Não expandir para whitespace exótico (tab/`\n`/` `) nem para
  caso de truncamento CSV no teste — fora do escopo mínimo desta correção.

### FIX-02 — prévia do CSV mostra `interesse` + torna D-10 observável (WR-02)
- **D-04:** `csv-import-preview-table.tsx` ganha uma coluna `interesse` em
  `previewColumns`, **no mesmo padrão da coluna `notas`** (accessorKey
  `"interesse"`, header `"Interesse"`, cell com `row.original.interesse || "—"`,
  `whitespace-pre-line`, `max-w-xs`).
- **D-05:** Quando `row.original.interesse?.length === 500`, a célula mostra um
  **badge / aviso visível** do tipo "cortado em 500 caracteres" (torna o
  truncamento D-10 observável antes do admin confirmar — atende ROADMAP SC#3
  pela via "aviso visível na prévia").
- **D-06:** O aviso fica **na própria célula**, NÃO integra ao sistema de flags
  amarelas por linha (duplicado / nicho novo / nicho bloqueado / telefone
  inválido). Mantém o diff pequeno e localizado.

### FIX-03 — achados info (IN-01, IN-02, IN-03)
- **D-07 (IN-01):** Em `src/components/csv-column-mapper.tsx`, trocar os
  comentários "7 campos fixos" / "nenhum dos 7 campos fixos" (linhas ~64-66 e
  ~73-76) por **"8"**. Só comentário — o código já deriva dinamicamente de
  `Object.values(mapping)`.
- **D-08 (IN-02):** Em `src/lib/csv-import.ts:147`, trocar
  `readMapped(row, "interesse").trim().slice(0, 500)` por corte **por code
  point**: `Array.from(...).slice(0, 500).join("")`. **Só neste arquivo.**
- **D-09 (IN-02):** NÃO alterar o `.max(500)` de `interesse` em
  `csvRowSchema` / `leadBaseSchema` (`validations.ts`) — continua contando code
  units UTF-16. Aceita-se a pequena assimetria: com o badge de D-05 + o corte
  por code point, ROADMAP SC#3 fica coberto com folga, e o risco de reintroduzir
  rejeição de linha por string de 500 code points > 500 code units não compensa
  a mudança de semântica do schema.
- **D-10 (IN-03):** `scripts/migrate-interesse.cjs`:
  1. Header do script documenta explicitamente **"pare a app Next antes de rodar"**
     (premissa operacional: WAL ativo pode não constar no backup).
  2. Quando `hasColumn === true` (coluna já existe, nada a migrar), o script
     **não cria** `crm.db.backup-<timestamp>` — evita acúmulo em execução
     idempotente.
- **D-11 (IN-03):** A correção do backup fica **só no `migrate-interesse.cjs`**.
  NÃO replicar para `migrate-motivos-perda.cjs` / `migrate-tarefas.cjs` / outros
  `migrate-*.cjs` nesta fase — é dívida de padrão do projeto, não regressão da
  Fase 15, e sai do escopo "achados da Fase 15". Ver Deferred Ideas.

### Claude's Discretion
- Texto exato da copy do badge de D-05 e do doc-comment de D-10 (mantendo o tom
  PT-BR e o padrão dos outros avisos da prévia).
- Posição exata da coluna `interesse` em `previewColumns` (sugestão: junto de
  `notas`, coerente com D-09/D-11 da Fase 15).
- Forma do badge (componente `<Badge>` do shadcn vs `<span>` estilizado) —
  seguir o que a prévia já usa para os outros avisos.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Achados a fechar (fonte primária — traz o código do fix)
- `.planning/phases/15-campo-interesse-servi-o-desejado-no-lead/15-REVIEW.md` —
  os 5 achados (WR-01, WR-02, IN-01, IN-02, IN-03) com arquivo, linha, diagnóstico
  e snippet de correção sugerido. Executor segue WR-01 e IN-01 **como escritos**;
  WR-02 / IN-02 / IN-03 seguem as decisões D-04..D-11 acima (que refinam as
  opções "opcional" do review).

### Contrato do campo `interesse` (Fase 15)
- `.planning/phases/15-campo-interesse-servi-o-desejado-no-lead/15-CONTEXT.md` —
  D-04 (vazio → NULL, nunca `''`), D-08..D-11 (idioma do CSV: `CsvFieldKey`,
  `mapCsvRows`, truncar antes de validar, sem `CSV_DEFAULTS`), D-06 (migração
  `.cjs` custom, nunca `drizzle-kit push`).
- `.planning/phases/15-campo-interesse-servi-o-desejado-no-lead/15-SPEC.md` —
  requisitos travados da Fase 15 (LEAD-06); contexto de por que o campo existe.
- `.planning/phases/15-campo-interesse-servi-o-desejado-no-lead/15-LEARNINGS.md` —
  lições da Fase 15 (incl. WR-01/IN-01 que ficaram em aberto).

### Requisitos e roadmap
- `.planning/REQUIREMENTS.md` §FIX-01, §FIX-02, §FIX-03 — texto dos requisitos.
- `.planning/ROADMAP.md` §"Phase 16" — Goal + 5 Success Criteria (SC#1..SC#5).
  SC#5 exige `tsc --noEmit`, `npm run build` e `test:lead-actions` em exit 0.

### Arquivos-alvo (todos existem, verificado 2026-09-01)
- `src/lib/validations.ts` — `z.preprocess` de `interesse` (WR-01 / D-01)
- `src/lib/csv-import.ts` (~linha 147) — `mapCsvRows`, corte 500 (IN-02 / D-08)
- `src/components/csv-import-preview-table.tsx` (`previewColumns`, ~110-180) — WR-02
- `src/components/csv-column-mapper.tsx` (~64-66, 73-76) — comentários (IN-01 / D-07)
- `scripts/migrate-interesse.cjs` (~34-46) — backup + doc (IN-03 / D-10)
- `scripts/test-lead-actions.cjs` — casos novos (FIX-01 / D-02)
- `src/actions/lead-actions.ts` (`:101`, `:179`) — consumidores do preprocess (contexto, não necessariamente editado)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Coluna `notas` em `previewColumns`** (`csv-import-preview-table.tsx`): molde
  exato para a nova coluna `interesse` (D-04).
- **Sistema de avisos da prévia** (flags de duplicado / nicho novo / telefone
  inválido): referência de estilo para o badge de D-05, mas o badge NÃO entra
  nesse sistema (D-06).
- **`test-lead-actions.cjs` Caso 14**: já exercita `interesse: ""` exato — os
  casos novos de D-02 são variações (`"   "` no create e no update).
- **`z.preprocess` de `motivoPerdaId`** (`validations.ts`): o preprocess de
  `interesse` foi derivado dele; a versão "com trim" de D-01 é o alvo.
- **Outros `scripts/migrate-*.cjs`**: mesmo padrão de backup + `PRAGMA table_info`
  guard; contexto para D-10/D-11.

### Established Patterns
- **D-04 da Fase 15** ("vazio grava NULL, nunca `''`"): o contrato que WR-01
  viola e esta fase reafirma. Repetido em `schema.ts:92-95`, `validations.ts:37-40`,
  `lead-actions.ts:98-101`, `lead-form-dialog.tsx:127-130`.
- **Truncar-antes-de-validar (D-10 da Fase 15)**: `mapCsvRows` trunca em 500
  **antes** do `csvRowSchema.safeParse` — célula gigante nunca reprova a linha.
  A defesa em profundidade server-side (`csvRowSchema.max(500)`) permanece.
- **Harness de teste**: `.cjs` custom rodado por `npm run test:lead-actions`,
  não Vitest/Jest. Novos casos seguem o formato dos existentes.

### Integration Points
- `validations.ts` preprocess → consumido por `createLead`/`updateLead` em
  `lead-actions.ts` e por `csvRowSchema` (caminho do CSV, que já pré-trima).
- `csv-import-preview-table.tsx` → recebe as linhas mapeadas de `mapCsvRows`;
  a coluna nova lê `row.original.interesse` (campo já existe em `MappedCsvRow`).

</code_context>

<specifics>
## Specific Ideas

- WR-01 e IN-01: seguir os snippets do `15-REVIEW.md` **literalmente** — o review
  já entregou o código pronto e revisado.
- Badge de D-05: no espírito de "texto cortado em 500 caracteres", tom PT-BR,
  visualmente alinhado com os outros avisos da tabela de prévia.

</specifics>

<deferred>
## Deferred Ideas

- **Padronizar o backup de todos os `scripts/migrate-*.cjs`** (mover para
  `data/backups/` com retenção, ou pular backup em execução idempotente em todos).
  É dívida de padrão do projeto, não achado da Fase 15. Candidato a uma quick
  task ou a uma fase de "higiene de scripts" futura. (Origem: discussão de IN-03 / D-11.)
- **Alinhar contagem de `.max(500)` do schema com corte por code point**
  (`Array.from(s).length <= 500` em `csvRowSchema`). Adiado em D-09 por risco/benefício;
  reconsiderar só se algum dia houver filtro/análise por `interesse` que dependa
  de semântica exata de comprimento.
- **Badge de truncamento no sistema de flags amarelas por linha** (em vez de na
  célula). Adiado em D-06; reconsiderar se a prévia ganhar mais campos truncáveis.

### Reviewed Todos (not folded)
Nenhum. Os matches de `todo.match-phase` (sequência de follow-up escalonada,
agenda/tarefas soltas) são falsos-positivos por keyword genérica — ambos já
shipados (Fases 10 e 12) e sem relação com correção de code review.

</deferred>

---

*Phase: 16-corre-es-de-code-review-da-fase-15*
*Context gathered: 2026-09-01*
