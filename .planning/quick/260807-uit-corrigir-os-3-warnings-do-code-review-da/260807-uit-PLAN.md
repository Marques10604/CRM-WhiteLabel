---
phase: quick-260807-uit
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/verify-origem-tipo.cjs
  - src/lib/validations.ts
  - src/lib/csv-import.ts
  - scripts/test-lead-actions.cjs
autonomous: true
requirements: [ORIGEM-01, ORIGEM-02]

must_haves:
  truths:
    - "WR-02: `npm run verify:origem-tipo` continua saindo 0 e nenhuma checagem estática depende mais de janela de tamanho fixo (`{0,N}`) nem de indentação de 2 espaços — reformatar `schema.ts`/`validations.ts` (prettier, quebra de linha, comentário maior) não produz mais falso negativo"
    - "WR-02: `npm run test:mutation-guard` continua saindo 0 — a guarda ainda FALHA (exit 1) quando o elo de `import-actions.ts` é removido na cópia temporária"
    - "WR-01: existe UMA única fonte de verdade para o default de `origemTipo` no import CSV — `CSV_DEFAULTS.origemTipo` em `src/lib/csv-import.ts`, consumido diretamente por `csvRowSchema` em `src/lib/validations.ts`"
    - "WR-01: mudar `CSV_DEFAULTS.origemTipo` passa a mudar o comportamento real do import (não existe mais constante morta que possa divergir silenciosamente do valor aplicado)"
    - "WR-03: existe um caso de teste que chama `bulkImportLeads` de verdade, com uma linha SEM `origemTipo`, e assere por leitura do banco temporário que a linha persistida tem `origemTipo === \"outbound\"`"
    - "WR-03: existe um caso de teste que prova que o default vem do Zod (`csvRowSchema`), não do DEFAULT físico do SQLite — uma troca de `.default(...)` por `.optional()` é detectada"
    - "`npx tsc --noEmit`, `node scripts/test-lead-actions.cjs`, `npm run verify:origem-tipo`, `npm run test:mutation-guard` e `npm run build` todos saem 0 ao final"
  artifacts:
    - path: "scripts/verify-origem-tipo.cjs"
      provides: "Guarda dos 5 elos com checagens estruturais tolerantes a reformatação (sem janelas de contagem de caracteres)"
      contains: "declarationSlice"
    - path: "src/lib/validations.ts"
      provides: "csvRowSchema.origemTipo derivando o default de CSV_DEFAULTS (fonte única)"
      contains: "CSV_DEFAULTS.origemTipo"
    - path: "src/lib/csv-import.ts"
      provides: "CSV_DEFAULTS.origemTipo como fonte única real (comentário atualizado, não mais 'só documentação')"
      contains: "origemTipo"
    - path: "scripts/test-lead-actions.cjs"
      provides: "Cobertura comportamental do caminho de import CSV (csvRowSchema + bulkImportLeads)"
      contains: "bulkImportLeads"
  key_links:
    - from: "src/lib/validations.ts (csvRowSchema.origemTipo)"
      to: "src/lib/csv-import.ts (CSV_DEFAULTS.origemTipo)"
      via: "import + .default(CSV_DEFAULTS.origemTipo)"
      pattern: "\\.default\\(CSV_DEFAULTS\\.origemTipo\\)"
    - from: "scripts/test-lead-actions.cjs"
      to: "src/actions/import-actions.ts (bulkImportLeads)"
      via: "import dinâmico após DB_FILE_NAME apontar para o banco temporário"
      pattern: "bulkImportLeads"
    - from: "scripts/verify-origem-tipo.cjs (Elo 3)"
      to: "csvRowSchema.origemTipo.default(...)"
      via: "regex tolerante que aceita tanto o literal \"outbound\" quanto CSV_DEFAULTS.origemTipo"
      pattern: "CSV_DEFAULTS\\.origemTipo"
---

<objective>
Fechar os 3 warnings do code review da Fase 8 (`08-REVIEW.md`), sem tocar em nada fora do escopo deles:

- **WR-01** — `CSV_DEFAULTS.origemTipo` é constante morta (segunda fonte de verdade). Fazer `csvRowSchema` consumi-la, tornando-a a fonte única real.
- **WR-02** — as checagens estáticas de `scripts/verify-origem-tipo.cjs` usam janelas de regex limitadas por contagem de caracteres (`{0,220}`/`{0,80}`) e indentação exata (`\n\s{2}\w+:`); qualquer reformatação produz falso negativo com mensagem de erro enganosa. Substituir por checagens estruturais tolerantes a formatação.
- **WR-03** — o caminho de import CSV só tem cobertura por grep estático (Elo 5). Adicionar teste de comportamento real que chama `bulkImportLeads` e assere a persistência do default.

Purpose: os 3 são problemas de manutenibilidade/cobertura, não bugs em produção — mas os dois primeiros são armadilhas para quem mexer nisso nas Fases 10/11 (que dependem de `origemTipo`), e o terceiro é o único que impede uma regressão real de passar despercebida.

Output: 4 arquivos alterados, todos os gates automatizados verdes, nenhuma mudança de comportamento observável para o usuário do CRM.

**ORDEM DAS TASKS É OBRIGATÓRIA.** Task 1 (WR-02) vem ANTES da Task 2 (WR-01) porque a guarda de hoje exige o literal `.default("outbound")` em `csvRowSchema` (`verify-origem-tipo.cjs:83`). Se a Task 2 rodasse primeiro, `npm run verify:origem-tipo` quebraria imediatamente. A Task 1 já deixa a checagem preparada para aceitar as duas formas.

**Fora de escopo (NÃO fazer):** IN-01 (comentário longo de `schema.ts:42`) e IN-02 (DDL duplicada entre `backfill-origem-tipo.cjs` e `test-lead-actions.cjs`) são `info`, não `warning` — não entram nesta tarefa. Nenhuma refatoração além das 3 correções.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/08-origem-governada-separa-o-inbound-outbound/08-REVIEW.md
@scripts/verify-origem-tipo.cjs
@scripts/test-mutation-guard.cjs
@scripts/test-lead-actions.cjs
@src/lib/validations.ts
@src/lib/csv-import.ts
@src/actions/import-actions.ts

**Restrição de ambiente (host de 4GB, precedente de 2 crashes por OOM registrado em `STATE.md`):** rodar os gates SEMPRE em sequência, um comando por vez, com `npm run dev` comprovadamente parado. Nunca disparar build/test em paralelo.

<interfaces>
<!-- Contratos já existentes no código. O executor NÃO precisa explorar o codebase. -->

`src/db/schema.ts` (linhas 40-42) — declaração real da coluna, como está hoje:
```ts
origemTipo: text("origem_tipo", { enum: ["inbound", "outbound"] })
  .notNull()
  .default("outbound"), // comentário inline de ~400 caracteres (IN-01, fora de escopo)
```

`src/lib/validations.ts` (linhas 30-32 e 60-63) — como está hoje:
```ts
// dentro de leadSchema (SEM .default — D-04):
origemTipo: z.enum(["inbound", "outbound"], { error: "Selecione o tipo de origem." }),

// csvRowSchema:
export const csvRowSchema = leadSchema.omit({ subnichoId: true, followUpDate: true }).extend({
  subnichoNome: z.string().trim().min(1, "Sub-nicho é obrigatório."),
  origemTipo: z.enum(["inbound", "outbound"]).default("outbound"),
});
```

`src/lib/csv-import.ts` (linhas 59-65) — como está hoje:
```ts
export const CSV_DEFAULTS = {
  canal: "whatsapp",
  origem: "Importação CSV",
  notas: "Importado via CSV.",
  valorEstimado: "0",
  origemTipo: "outbound",
} as const;
```
Por causa do `as const`, `CSV_DEFAULTS.origemTipo` tem tipo literal `"outbound"` — atribuível ao `.default()` de `z.enum(["inbound", "outbound"])` sem cast. `csv-import.ts` importa apenas `@/lib/phone`; `validations.ts` importar `@/lib/csv-import` NÃO cria ciclo.

`ConfirmedImportRow` (`src/actions/import-actions.ts:67-75`) — o tipo que o único chamador real monta; note que NÃO tem `origemTipo`:
```ts
export type ConfirmedImportRow = {
  nome: string; telefone: string;
  canal: "instagram" | "whatsapp";
  origem: string; valorEstimado: string; notas: string; subnichoNome: string;
};
```

`bulkImportLeads(rows: ConfirmedImportRow[]): Promise<BulkImportResult>` — valida cada linha com `csvRowSchema.safeParse`, insere dentro de `db.transaction(...)` (o commit acontece ANTES de `revalidatePath("/")`), e só então chama `revalidatePath` 3x. Fora de uma request do Next, `revalidatePath` lança "static generation store missing" — mas a escrita já está confirmada, então a asserção deve ser feita por leitura do banco, exatamente como o helper `callToleratingRevalidate` já faz para `createLead`/`updateLead`.

Armadilha crítica para o teste da WR-03: se alguém trocar `.default("outbound")` por `.optional()` em `csvRowSchema`, `row.origemTipo` chega `undefined`, o Drizzle OMITE a coluna do INSERT, e o `.default("outbound")` do próprio schema Drizzle preenche `'outbound'` mesmo assim. Ou seja, **assertar só a linha persistida NÃO detecta essa regressão**. Por isso a Task 3 exige DOIS casos: um sobre `csvRowSchema.safeParse` (prova que o default vem do Zod) e um sobre `bulkImportLeads` (prova a persistência ponta a ponta).

`scripts/test-mutation-guard.cjs` remove linhas cujo `line.trim() === "origemTipo: row.origemTipo,"` de uma CÓPIA temporária e espera `verify:origem-tipo` sair 1. Qualquer reescrita da guarda na Task 1 precisa manter essa propriedade. **NÃO alterar `scripts/test-mutation-guard.cjs`.**

Scripts npm disponíveis: `dev`, `build`, `start`, `lint`, `guard:no-hard-delete`, `verify:origem-tipo`, `test:lead-actions`, `test:mutation-guard`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 (WR-02): Trocar as janelas de regex por contagem de caracteres em verify-origem-tipo.cjs por checagens estruturais</name>
  <files>scripts/verify-origem-tipo.cjs</files>
  <read_first>
    - `scripts/verify-origem-tipo.cjs` (arquivo inteiro — em especial `stripComments`/`readStripped` linhas 30-41, e os blocos Elo 1 (49-61), Elo 2/3 (63-88), Elo 4 (90-102), Elo 5 (104-117))
    - `scripts/test-mutation-guard.cjs` (arquivo inteiro — a propriedade que a reescrita NÃO pode quebrar)
    - `src/db/schema.ts` linhas 32-57, `src/lib/validations.ts` linhas 9-63, `src/components/lead-form-dialog.tsx` (as strings exatas que as checagens leem)
  </read_first>
  <action>
    Reescrever APENAS a metade estática do script (blocos Elo 1 a Elo 5). A metade de banco real (linhas 127-166), o helper `fail()`, `DB_PATH`, `IMPORT_ACTIONS_PATH`, o acumulador `staticFailures`/`checkStatic` e a linha final de OK permanecem exatamente como estão.

    1. Manter `stripComments()` como está. Adicionar DOIS helpers novos logo abaixo dele:

       - `dense(filePath)`: lê o arquivo, aplica `stripComments`, e então remove TODO espaço em branco
         (`.replace(/\s+/g, "")`). O resultado é uma forma canônica imune a indentação, largura de linha,
         quebra de linha e tamanho de comentário — é isso que elimina a fragilidade da WR-02 na raiz.
         Substitui o uso atual de `readStripped()` nas checagens estáticas (pode manter `readStripped`
         se algum ponto ainda precisar, mas não deixar função morta: se ninguém mais usar, remover).

       - `declarationSlice(denseSource, startToken)`: recorta a declaração de um campo SEM limite de
         tamanho. Implementação: acha `denseSource.indexOf(startToken)`; se `-1`, retorna `""`; senão
         pega `rest = denseSource.slice(idx + startToken.length)` e corta `rest` na primeira ocorrência
         de `/,\w+:/` (início do próximo campo irmão do objeto), retornando `startToken + rest_cortado`.
         Retornar o slice inteiro quando não houver campo seguinte. Este recorte é ilimitado em
         caracteres — é o substituto direto de `[\s\S]{0,220}` / `[\s\S]{0,80}` / `(?=\n\s{2}\w+:|\n\}\);)`.
         Comentar no código por que `/,\w+:/` é seguro aqui: objetos aninhados na forma densa aparecem
         como `,{enum:` / `,{error:` (vírgula seguida de `{`, não de `\w`), então não terminam o recorte
         por engano.

    2. Elo 1 (`src/db/schema.ts`) — usar `declarationSlice(dense(SCHEMA_PATH), "origemTipo:")` e manter
       as TRÊS mensagens de falha atuais, agora sobre o slice denso:
       - declara `text("origem_tipo",{enum:["inbound","outbound"]})` — regex sobre o slice denso,
         com `["']` para aspas, SEM nenhum quantificador de contagem
       - contém `.notNull()`
       - contém `.default("outbound")` (aceitar aspas simples ou duplas)

    3. Elo 2 (leadSchema, D-04) — manter o corte por `indexOf("export const csvRowSchema")`, mas sobre a
       forma DENSA (o token densificado é `exportconstcsvRowSchema`). Sobre a metade anterior a esse
       índice, usar `declarationSlice(..., "origemTipo:")` e manter as duas asserções atuais:
       - é `z.enum(["inbound","outbound"]` (regex sobre o slice denso, sem quantificador de contagem)
       - o slice NÃO é vazio E NÃO contém `.default(` — mesma mensagem de hoje sobre D-04

    4. Elo 3 (csvRowSchema) — sobre a metade densa a partir de `exportconstcsvRowSchema`, assertar que
       `origemTipo` é `z.enum(["inbound","outbound"])` encadeado com um `.default(...)` que aceita
       QUALQUER UMA das duas formas: o literal `"outbound"`/`'outbound'` OU a referência
       `CSV_DEFAULTS.origemTipo`. Isso é pré-requisito da Task 2 — sem esta tolerância a Task 2 quebra
       a guarda. Mensagem de falha atualizada para citar as duas formas aceitas.

    5. Elo 4 (`lead-form-dialog.tsx`) — sobre a forma densa: `ORIGEM_TIPO_OPTIONS=[` por `.includes()`
       (elimina o `[\s\S]{0,200}?` atual), mais as duas checagens de `value:"inbound"` / `value:"outbound"`
       e `name="origemTipo"` (aceitando aspas simples ou duplas). Mensagens de falha inalteradas.

    6. Elo 5 (`import-actions.ts`) — sobre a forma densa do arquivo apontado por `IMPORT_ACTIONS_PATH`
       (manter o try/catch de leitura e o override de env var exatamente como estão):
       `.includes("origemTipo:row.origemTipo,")`. Mensagem de falha inalterada. Esta forma continua
       falhando quando `test-mutation-guard.cjs` remove a linha da cópia — verificar isso rodando o
       teste de mutação, não por inspeção.

    7. Atualizar o comentário de cabeçalho do script (linhas 1-6) acrescentando um parágrafo curto
       explicando a INVARIANTE nova: todas as checagens estáticas rodam sobre uma forma canônica
       (comentários removidos + todo espaço em branco removido), justamente para que reformatação
       (prettier, mudança de indentação, quebra de linha, crescimento de comentário) nunca produza
       falso negativo — e que nenhuma checagem pode voltar a usar quantificador de contagem de
       caracteres (`{0,N}`) sobre código-fonte.

    NÃO alterar: a metade de banco real, `scripts/test-mutation-guard.cjs`, `package.json`, nem
    qualquer arquivo em `src/`. Todas as mensagens em PT-BR, mesmo estilo das existentes.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run verify:origem-tipo && npm run test:mutation-guard && node -e "const s=require('node:fs').readFileSync('scripts/verify-origem-tipo.cjs','utf8').split(/\r?\n/).filter(l=>!/^\s*\/\//.test(l)).join('\n');const c={semJanelaFixa:!/\{0,\d+\}/.test(s),semIndent2:!/\\n\\s\{2\}/.test(s),dense:/function dense/.test(s),declSlice:/function declarationSlice/.test(s),aceitaCsvDefaults:/CSV_DEFAULTS\.origemTipo/.test(s)};console.log(c);if(Object.values(c).some(v=>!v))process.exit(1);console.log('OK: guarda tolerante a reformatacao');"</automated>
  </verify>
  <acceptance_criteria>
    - `npm run verify:origem-tipo` exit 0, imprimindo a mesma linha `[verify-origem-tipo] OK: 5 elos ... distribuição no banco real: ...`
    - `npm run test:mutation-guard` exit 0 — a guarda AINDA falha (exit 1) contra a cópia mutada
    - Nenhuma linha de código (ignorando comentários) de `scripts/verify-origem-tipo.cjs` contém `{0,` seguido de dígitos, nem o padrão de indentação fixa `\n\s{2}`
    - O script define `function dense(...)` e `function declarationSlice(...)`
    - A checagem do Elo 3 aceita tanto `.default("outbound")` quanto `.default(CSV_DEFAULTS.origemTipo)`
    - `scripts/test-mutation-guard.cjs`, `package.json` e todos os arquivos de `src/` permanecem sem diff (`git status --porcelain` mostra apenas `scripts/verify-origem-tipo.cjs`)
  </acceptance_criteria>
  <done>A guarda dos 5 elos passa e falha pelos motivos certos, sem depender de contagem de caracteres nem de indentação — e já aceita a forma que a Task 2 vai introduzir.</done>
</task>

<task type="auto">
  <name>Task 2 (WR-01): Fazer csvRowSchema consumir CSV_DEFAULTS.origemTipo como fonte única</name>
  <files>src/lib/validations.ts, src/lib/csv-import.ts</files>
  <read_first>
    - `src/lib/validations.ts` (linhas 1-65 — os imports do topo e o bloco de comentário 48-63)
    - `src/lib/csv-import.ts` (linhas 1-65 — o import de `@/lib/phone` e o bloco de comentário 44-65)
    - `08-REVIEW.md` seção WR-01 (o snippet de correção sugerido, que é exatamente o que se implementa aqui)
  </read_first>
  <action>
    1. Em `src/lib/validations.ts`, adicionar ao topo (junto dos imports existentes de `@/lib/money` e
       `@/lib/phone`): `import { CSV_DEFAULTS } from "@/lib/csv-import";`.

    2. Trocar, dentro do `.extend({...})` de `csvRowSchema`:
       `origemTipo: z.enum(["inbound", "outbound"]).default("outbound"),`
       por
       `origemTipo: z.enum(["inbound", "outbound"]).default(CSV_DEFAULTS.origemTipo),`
       Nenhuma outra mudança em `csvRowSchema`. `leadSchema.origemTipo` continua SEM `.default()` (D-04) —
       não tocar nele.

    3. Atualizar o bloco de comentário de `csvRowSchema` (`validations.ts` linhas 48-59): a frase atual
       diz que `origemTipo` recebe `.default("outbound")` "aqui (e só aqui)". Reescrever para dizer que o
       VALOR vem de `CSV_DEFAULTS.origemTipo` (`src/lib/csv-import.ts`), fonte única compartilhada com os
       demais defaults do import CSV, e que este é o único ponto de APLICAÇÃO do default. Manter a
       justificativa de D-04 (por que `leadSchema` não tem default).

    4. Atualizar o bloco de comentário de `CSV_DEFAULTS` em `src/lib/csv-import.ts` (linhas 51-58): hoje
       ele afirma que a entrada `origemTipo` "existe só para documentação/paridade visual" e que "o ponto
       de aplicação real é o `.default(\"outbound\")` do `csvRowSchema`". Isso deixa de ser verdade — a
       entrada passa a ser a FONTE ÚNICA consumida por `csvRowSchema`. Reescrever preservando o que
       continua verdadeiro: `origemTipo` não é um `CsvFieldKey` mapeável, nunca vem de coluna do arquivo,
       nunca é escolhido pelo admin no wizard, e o ponto de aplicação continua sendo o `.default()` do
       `csvRowSchema` (não `mapCsvRows`) — mas agora lendo esta constante.

    NÃO adicionar `origemTipo` a `MappedCsvRow`, a `CsvFieldKey`, nem a `mapCsvRows`. NÃO mexer no wizard
    nem em nenhum componente. Comentários em PT-BR.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run verify:origem-tipo && node scripts/test-lead-actions.cjs && node -e "const fs=require('node:fs');const v=fs.readFileSync('src/lib/validations.ts','utf8');const i=fs.readFileSync('src/lib/csv-import.ts','utf8');const c={importa:/import\s*\{\s*CSV_DEFAULTS\s*\}\s*from\s*[\x22']@\/lib\/csv-import[\x22'];/.test(v),usaFonteUnica:/\.default\(CSV_DEFAULTS\.origemTipo\)/.test(v),semLiteralNoCsvSchema:!/origemTipo:\s*z\.enum\(\[[^\]]*\]\)\.default\([\x22']outbound[\x22']\)/.test(v),leadSemDefault:/origemTipo:\s*z\.enum\(\[\s*[\x22']inbound[\x22']\s*,\s*[\x22']outbound[\x22']\s*\]\s*,\s*\{/.test(v),constantePresente:/origemTipo:\s*[\x22']outbound[\x22'],/.test(i)};console.log(c);if(Object.values(c).some(x=>!x))process.exit(1);console.log('OK: fonte unica de origemTipo');"</automated>
  </verify>
  <acceptance_criteria>
    - `npx tsc --noEmit` exit 0 (o tipo literal `"outbound"` de `CSV_DEFAULTS.origemTipo` é aceito pelo `.default()` do enum sem cast)
    - `src/lib/validations.ts` importa `CSV_DEFAULTS` de `@/lib/csv-import` e usa `.default(CSV_DEFAULTS.origemTipo)`
    - O literal `.default("outbound")` NÃO existe mais em `csvRowSchema`
    - `leadSchema.origemTipo` continua sem `.default(` (D-04 intacta)
    - `CSV_DEFAULTS.origemTipo` continua existindo em `src/lib/csv-import.ts`, agora documentado como fonte única (não mais como constante "só para documentação")
    - `npm run verify:origem-tipo` exit 0 (a tolerância adicionada na Task 1 cobre a nova forma)
    - `node scripts/test-lead-actions.cjs` exit 0, sem nenhuma linha `FAIL` (prova que o novo import não criou ciclo em runtime)
  </acceptance_criteria>
  <done>Existe um único lugar no repositório onde o default de `origemTipo` do import CSV está escrito; mudá-lo muda o comportamento real.</done>
</task>

<task type="auto">
  <name>Task 3 (WR-03): Cobertura comportamental do import CSV em test-lead-actions.cjs</name>
  <files>scripts/test-lead-actions.cjs</files>
  <read_first>
    - `scripts/test-lead-actions.cjs` (arquivo inteiro — em especial o bloco de imports dinâmicos linhas 123-128, o helper `callToleratingRevalidate` linhas 159-168, e os Casos 9/10 linhas 309-340 como molde exato)
    - `src/actions/import-actions.ts` (assinatura e corpo de `bulkImportLeads`, tipo `ConfirmedImportRow`)
    - `src/lib/validations.ts` (após a Task 2 — `csvRowSchema` já consumindo `CSV_DEFAULTS`)
  </read_first>
  <action>
    Adicionar DOIS casos novos ao final de `runBehaviorTests()`, logo após o Caso 10 e ANTES do bloco de
    cleanup (`fs.unlinkSync(tmpDb)`), seguindo o mesmo estilo de comentário numerado e mensagens PT-BR.

    1. Estender o bloco de imports dinâmicos existente (linhas ~123-128, DEPOIS de `process.env.DB_FILE_NAME`
       estar setado — a ordem importa, `@/db/client` cacheia a conexão no primeiro import) com:
       `const { bulkImportLeads } = await import("@/actions/import-actions");` e
       `const { csvRowSchema } = await import("@/lib/validations");`.

    2. Definir um helper local `makeImportRow(overrides = {})` que devolve um objeto no formato
       `ConfirmedImportRow` — e que, por construção, NÃO inclui a chave `origemTipo` (é exatamente o que o
       chamador real, `csv-import-preview-table.tsx`, monta):
       `{ nome: "Importado CSV", telefone: "(11) 98888-7777", canal: "whatsapp", origem: "Importação CSV",
       valorEstimado: "0", notas: "Importado via CSV.", subnichoNome: "Nutricionista", ...overrides }`.
       O sub-nicho "Nutricionista" já é semeado no bootstrap do banco temporário — `bulkImportLeads`
       vai reaproveitar o id existente pelo lookup case-insensitive, sem criar duplicata.

    3. CASO 11 — prova que o default vem do ZOD, não do SQLite. Chamar
       `csvRowSchema.safeParse(makeImportRow())` diretamente e assertar:
       (a) `parsed.success === true`;
       (b) `parsed.data.origemTipo === "outbound"`.
       Comentar no código POR QUE este caso existe separado do Caso 12: se alguém trocar `.default(...)`
       por `.optional()` em `csvRowSchema`, o valor chega `undefined`, o Drizzle omite a coluna do INSERT
       e o `.default("outbound")` do schema Drizzle preenche mesmo assim — a linha persistida continuaria
       correta e a regressão passaria batida. Só a asserção sobre a saída do `safeParse` detecta isso.

    4. CASO 12 — prova de ponta a ponta. Chamar `bulkImportLeads([makeImportRow()])` de verdade e assertar
       por LEITURA DO BANCO temporário:
       (a) a contagem de leads aumentou em exatamente 1;
       (b) a linha nova (mesmo idioma dos casos existentes: `db.select().from(leads).orderBy(leads.id).limit(1).offset(before)`)
           tem `origemTipo === "outbound"`;
       (c) a linha nova tem `importBatchId` não-nulo (confirma que veio pelo caminho de import, não por outro insert).
       `bulkImportLeads` chama `revalidatePath` DEPOIS do commit da transação e isso lança fora do contexto
       do Next — envolver a chamada num try/catch que engole SOMENTE erros cuja mensagem casa
       `/revalidatePath|static generation store/i` (mesma regra já usada por `callToleratingRevalidate`) e
       re-lança qualquer outro. Se a chamada NÃO lançar, assertar também que o retorno tem
       `success === true` e `count === 1` (espelhando como os Casos 1/10 tratam esse mesmo cenário).

    NÃO alterar nenhum caso existente (1 a 10), nem o bootstrap, nem `makeFormData`, nem os dois
    `db.insert(leads)` diretos. NÃO tocar em `package.json` nem em `scripts/verify-origem-tipo.cjs`.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && node scripts/test-lead-actions.cjs && node -e "const s=require('node:fs').readFileSync('scripts/test-lead-actions.cjs','utf8');const c={importaBulk:/import\([\x22']@\/actions\/import-actions[\x22']\)/.test(s),importaSchema:/import\([\x22']@\/lib\/validations[\x22']\)/.test(s),helper:/makeImportRow/.test(s),chamaSafeParse:/csvRowSchema\.safeParse\(/.test(s),chamaBulk:/bulkImportLeads\(\[/.test(s),asserteOutbound:(s.match(/origemTipo\s*===\s*[\x22']outbound[\x22']/g)||[]).length>=2,batch:/importBatchId/.test(s),semOrigemTipoNaRow:!/makeImportRow[\s\S]{0,400}origemTipo:/.test(s)};console.log(c);if(Object.values(c).some(v=>!v))process.exit(1);console.log('OK: cobertura comportamental do import CSV');"</automated>
  </verify>
  <acceptance_criteria>
    - `node scripts/test-lead-actions.cjs` exit 0 e imprime `[test-lead-actions] OK: todas as asserções passaram.`, sem nenhuma linha começando com `FAIL`
    - A saída do script contém as asserções novas de Caso 11 e Caso 12 identificáveis por mensagem em PT-BR
    - Existe um caso que chama `csvRowSchema.safeParse(...)` com uma linha SEM `origemTipo` e assere `parsed.data.origemTipo === "outbound"`
    - Existe um caso que chama `bulkImportLeads([...])` com uma linha SEM `origemTipo` e assere, por leitura do banco temporário, `origemTipo === "outbound"` e `importBatchId` não-nulo
    - O objeto devolvido por `makeImportRow()` não tem a chave `origemTipo`
    - Casos 1 a 10, bootstrap, `makeFormData` e os dois `db.insert(leads)` diretos permanecem sem alteração de comportamento
    - `git status --porcelain` mostra apenas `scripts/test-lead-actions.cjs` como alterado por esta task
  </acceptance_criteria>
  <done>O caminho de import CSV tem prova de comportamento real (não só grep estático), e a regressão específica descrita na WR-03 (`.default` → `.optional`) é detectada.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Script de teste → banco SQLite temporário em `os.tmpdir()` | Escrita em disco fora do projeto; nunca deve tocar `data/crm.db` |
| Guarda de verificação → `data/crm.db` | Leitura de dado real de produção (leads = PII) |
| CSV do cowork → `bulkImportLeads` | Entrada externa não confiável, validada por `csvRowSchema` antes de qualquer insert |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-QT-01 | Tampering | Caso 12 novo em `test-lead-actions.cjs` escrevendo em `data/crm.db` por engano | mitigate | O caso é adicionado DENTRO de `runBehaviorTests()`, depois de `process.env.DB_FILE_NAME` já apontar para `os.tmpdir()` e antes do cleanup; `bulkImportLeads` é importado no MESMO bloco de imports dinâmicos já existente, nunca no topo do arquivo (o módulo `@/db/client` cacheia a conexão no primeiro import) |
| T-QT-02 | Tampering | Reescrita da guarda (Task 1) enfraquecendo a detecção de remoção de elo | mitigate | `npm run test:mutation-guard` é gate obrigatório da Task 1 — prova por execução, não por inspeção, que a guarda ainda sai 1 com o elo removido |
| T-QT-03 | Tampering | Task 2 quebrando o import CSV em produção (default deixa de ser aplicado) | mitigate | Caso 11 da Task 3 assere diretamente a saída de `csvRowSchema.safeParse`, e `npm run verify:origem-tipo` (Elo 3) exige a presença do `.default(...)` numa das duas formas aceitas |
| T-QT-04 | Information Disclosure | Novos logs de teste vazando PII de lead | mitigate | As asserções novas imprimem apenas o valor de `origemTipo` (`"outbound"`) e contagens; o telefone usado é literal fictício do próprio teste, contra banco temporário |
| T-QT-05 | Denial of Service (ambiente) | `npm run build` concorrente com `npm run dev` neste host de 4GB | mitigate | Gates rodam em sequência, um por vez, com dev server parado (precedente de 2 crashes por OOM em `STATE.md`) |
| T-QT-SC | Tampering | Instalação de pacotes npm | accept | Nenhum pacote novo é instalado; `package.json` não é alterado por nenhuma task |
</threat_model>

<verification>
Rodar em SEQUÊNCIA, um comando por vez, com `npm run dev` parado (host de 4GB):

1. `npx tsc --noEmit` — exit 0
2. `node scripts/guard-no-hard-delete.cjs` — exit 0
3. `npm run verify:origem-tipo` — exit 0, com a linha de distribuição de `origem_tipo` no banco real
4. `npm run test:mutation-guard` — exit 0 (a guarda reescrita ainda falha com o elo removido)
5. `node scripts/test-lead-actions.cjs` — exit 0, zero linhas `FAIL`, incluindo os Casos 11 e 12 novos
6. `npm run build` — exit 0. Se falhar por OOM/worker do Next morto (e não por erro de compilação real), registrar como limitação de ambiente no SUMMARY e tentar uma única vez de novo com o dev server comprovadamente parado
7. `git status --porcelain` — apenas os 4 arquivos de `files_modified` alterados
</verification>

<success_criteria>
- WR-01 fechado: `csvRowSchema.origemTipo` consome `CSV_DEFAULTS.origemTipo`; não existe mais um literal `"outbound"` duplicado entre `csv-import.ts` e `validations.ts`; os comentários dos dois arquivos refletem a nova realidade
- WR-02 fechado: nenhuma checagem estática de `verify-origem-tipo.cjs` usa quantificador de contagem de caracteres nem indentação fixa; a guarda passa, o teste de mutação continua provando que ela falha quando deve, e o cabeçalho documenta a invariante
- WR-03 fechado: `bulkImportLeads` é exercitado de verdade contra banco temporário, com asserção de persistência de `origemTipo === "outbound"`, mais uma asserção sobre `csvRowSchema.safeParse` que detecta a regressão `.default` → `.optional` que a asserção de banco sozinha não pegaria
- Nenhuma mudança de comportamento observável no CRM (mesmos defaults, mesma validação, mesma UI)
- IN-01 e IN-02 permanecem intocados (fora de escopo desta tarefa)
- Todos os gates da seção `<verification>` verdes
</success_criteria>

<output>
Criar `.planning/quick/260807-uit-corrigir-os-3-warnings-do-code-review-da/260807-uit-SUMMARY.md` ao concluir.
Registrar obrigatoriamente: (a) uma tabela WR-01/WR-02/WR-03 → arquivo alterado → evidência (comando + resultado);
(b) a saída de `npm run test:mutation-guard` depois da reescrita da guarda (prova de que a Task 1 não a enfraqueceu);
(c) a saída dos Casos 11 e 12 novos de `test-lead-actions.cjs`;
(d) nota explícita de que IN-01 e IN-02 do `08-REVIEW.md` foram deliberadamente deixados de fora.
Documento em PT-BR.
</output>

