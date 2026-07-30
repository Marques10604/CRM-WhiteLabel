# Phase 5: Notas Enriquecidas na Importação CSV - Research

**Researched:** 2026-07-29
**Domain:** Extensão pequena e aditiva de um wizard de import CSV já existente (React state design + função pura de formatação de string) — sem novas bibliotecas, rotas ou integrações externas.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Seleção de colunas múltiplas (UI)
- **D-01:** Nova seção de checkboxes, separada do mapeamento 1-pra-1 existente, abaixo dele no mesmo passo "Mapeie as colunas" — não transforma o `Select` atual do campo "Notas" em multi-select, não usa detecção automática por nome de coluna.
- **D-02:** A lista de checkboxes mostra **todas as colunas do CSV ainda não mapeadas** em nenhum campo fixo (nome, telefone, sub-nicho, canal, origem, valor, notas) — funciona para qualquer CSV, não só o do cowork. Uma coluna já usada em um campo fixo não aparece duplicada na lista de checkboxes.
- **D-03:** Se não sobrar nenhuma coluna não mapeada, a seção inteira não é renderizada (sem mensagem de "vazio").
- **D-04:** Rótulo da seção: **"Colunas extras para notas (opcional)"**.

#### Formatação do texto concatenado
- **D-05:** Cada coluna extra marcada aparece com **rótulo neutro** = nome exato do cabeçalho do CSV (ex: `Score: 4`, `sinal_dor: dor_confirmada`) — sem tabela de tradução para nomes amigáveis, sem explicar a escala do score no rótulo (evita sugerir "chance de fechar" quando na verdade é proxy de visibilidade — ver Specific Ideas).
- **D-06:** Separador entre colunas = **quebra de linha** (uma coluna extra por linha dentro do campo notas).
- **D-07:** Célula vazia numa coluna extra para uma linha específica → **omite a linha inteira** daquela coluna no texto final (nunca mostra "Campo: " vazio ou "(não informado)").
- **D-08:** Ordem das colunas no texto final = **ordem em que aparecem no arquivo CSV** (esquerda→direita), não a ordem em que o admin marcou os checkboxes. Sem controle de reordenar manualmente (drag-and-drop ou subir/descer) — mantém o passo de mapeamento simples.
- **D-09 (SC #4 do roadmap):** O wizard mostra ao admin, **no próprio passo de mapeamento**, um texto de resumo abaixo dos checkboxes indicando quais colunas serão concatenadas e em que ordem (ex: "Serão concatenadas: score → sinal_dor → trecho_dor"), atualizado ao vivo conforme marca/desmarca — não espera o admin avançar até a prévia para conferir.

#### Convivência com o mapeamento 1-pra-1 de notas existente
- **D-10:** Se o admin mapear a coluna "Notas" (1-pra-1) **E** marcar colunas extras, o resultado é a **concatenação de tudo**: o valor da coluna "Notas" mapeada entra primeiro (sem rótulo — é o próprio campo notas, `Notas: ...` seria redundante), seguido pelas colunas extras com rótulo, na ordem do CSV (D-08). Nada se perde — cumpre IMPORT-04 ("sem perder nenhuma coluna mapeada").
- **D-11:** Se o admin não mapear "Notas" 1-pra-1 nem marcar colunas extras, o comportamento não muda: usa o default já existente (`CSV_DEFAULTS.notas = "Importado via CSV."`), garantindo compatibilidade total com CSVs simples (IMPORT-05).

### Claude's Discretion
- Nome/estrutura exata do novo tipo/estado que representa "colunas extras marcadas" no `CsvColumnMapping` ou tipo irmão em `src/lib/csv-import.ts` — não especificado pelo admin além do comportamento (D-01 a D-11).
- Exact shape da função de concatenação (nova função em `csv-import.ts` vs. lógica inline em `mapCsvRows`) — implementação, não decisão de produto.
- Onde exatamente entra a UI de resumo (D-09) — texto simples abaixo dos checkboxes, formatação exata — CSS/layout não especificado pelo admin além de "abaixo dos checkboxes".

### Deferred Ideas (OUT OF SCOPE)
Vieram à tona ao ler `LEAD_HUNTER_SPEC_PARA_CRM.md` (seção 7, "sugestões, não implementadas"), mas são novas capacidades fora do escopo de IMPORT-04/05 — não fazem parte desta fase:

- **Reaproveitar `link_whatsapp` do CSV** (já vem pronto do lead-hunter, com prioridade a link direto sobre `wa.me` gerado por telefone) em vez de sempre reconstruir o link a partir do telefone — otimização futura do fluxo de WhatsApp (Fase 4), não desta fase de notas.
- **Badge visual para `whatsapp_provavel_fixo`** (aviso de número provavelmente fixo) — candidato a fase futura de UI/pipeline, não notas.
- **Sinalização de risco para `match_verificacao = divergente`** (dado enriquecido pode estar errado) — candidato a fase futura, relacionado a `IMPORT-V2-01` (campo de prioridade/score dedicado) já registrado em `REQUIREMENTS.md`.
- **Deduplicação por `nome + endereco`** em vez de/além de telefone — conflita/complementa a lógica de dedup por telefone já implementada na Fase 2. Precisa de discussão própria, não decidido aqui.
- **Fila de priorização ordenada por `sinal_dor` → `score`** — relacionado a `IMPORT-V2-01` em `REQUIREMENTS.md` (v2, campo de prioridade/score dedicado visível na lista/pipeline, não só texto em notas).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPORT-04 | Admin pode mapear múltiplas colunas de origem do CSV (ex: `score`, `sinal_dor`, `trecho_dor`, `observacao`) para serem concatenadas automaticamente em um único campo de notas formatado e legível no lead importado, sem perder nenhuma coluna mapeada | Pattern 1 (estado `extraNotasColumns` irmão de `mapping`), Pattern 2 (`buildNotasText`, D-05 a D-09 implementados linha a linha), Pattern 3 (checkboxes de colunas não mapeadas, D-02/D-03/D-04), Pitfall 2/3 (garantem ordem correta = D-08), Pitfall 4 (evita perda/duplicação de coluna entre campo fixo e extra) |
| IMPORT-05 | O mapeamento de colunas múltiplas para notas é opcional e compatível com o mapeamento 1-pra-1 já existente — CSVs simples continuam funcionando exatamente como hoje | Pattern 2 (fallback `\|\| CSV_DEFAULTS.notas` aplicado sobre o resultado final concatenado, não sobre o valor bruto), Pitfall 1 (risco central identificado: ordem de operações do fallback) e Pitfall 5 (caso de borda "tudo vazio" apesar de colunas marcadas) — ambos existem justamente para proteger IMPORT-05 |

</phase_requirements>

## Summary

Esta fase estende três arquivos já shipados da Fase 2 (`src/lib/csv-import.ts`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-wizard.tsx`) para permitir que o admin marque colunas extras do CSV (via checkboxes) a serem concatenadas ao campo `notas` do lead. Não há decisão de biblioteca a pesquisar: todo o trabalho é (1) desenhar a forma exata do novo estado `extraColumns` ao lado de `CsvColumnMapping`, (2) escrever uma função pura de formatação/concatenação testável isoladamente, e (3) adicionar uma seção de checkboxes HTML nativos (não um componente shadcn — o projeto já usa `<input type="checkbox">` cru em dois lugares, nenhum registro `checkbox.tsx` existe em `src/components/ui/`).

O ponto de maior risco não é técnico-arquitetural, é de **ordem de operações dentro de `mapCsvRows`**: o fallback para `CSV_DEFAULTS.notas` hoje é aplicado sobre o valor bruto da coluna "Notas" (`readMapped(row, "notas") || CSV_DEFAULTS.notas`, linha 68 de `csv-import.ts`). Se a nova lógica for implementada ingenuamente — aplicar o fallback ANTES de concatenar com as colunas extras — o texto padrão "Importado via CSV." vai aparecer misturado com colunas extras reais, violando D-11 (fallback só quando NADA foi mapeado/marcado). O fallback deve ser aplicado sobre o **resultado final concatenado**, não sobre o valor bruto da coluna "Notas" isoladamente.

**Primary recommendation:** Adicionar `extraNotasColumns: string[]` (nomes de header do CSV, não índices) como campo irmão de `mapping` em todo lugar que `mapping` hoje viaja (`WizardState.mapping` nos passos `mapping`/`preview`, default vazio `[]`, setter próprio, `handleBackToMapping`). Extrair uma função pura `buildNotasText(row, mapping, extraColumns, csvHeaderOrder)` em `csv-import.ts`, chamada de dentro de `mapCsvRows` — nunca em `csv-import-preview-table.tsx`, preservando o invariante "componente só renderiza". Reutilizar a seção de checkboxes existente (`csv-import-preview-table.tsx` linhas 144-149) como precedente de estilo — `<input type="checkbox" className="size-4 accent-[#0D9488]" />` — em vez de instalar `shadcn add checkbox`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seleção de colunas extras (checkboxes) | Browser / Client | — | Estado local do wizard (`useState`), igual ao `mapping` existente — não precisa de servidor até a confirmação. |
| Cálculo do texto concatenado de notas | Browser / Client | — | Função pura em `src/lib/csv-import.ts`, chamada client-side dentro de `mapCsvRows` (mesmo padrão do campo `notas` 1-pra-1 hoje) — o resultado já vai pronto (string única) para o servidor, que só valida/persiste. |
| Resumo ao vivo "serão concatenadas: X → Y" (D-09) | Browser / Client | — | Deriva do mesmo estado local (`extraNotasColumns` + `csvHeaders`), sem round-trip. |
| Validação/persistência do campo `notas` final | API / Backend (Server Action) | Database / Storage | `bulkImportLeads` (`src/actions/import-actions.ts`) já valida `notas` via `csvRowSchema` (`z.string().trim().min(1)`) e insere como está — nenhuma mudança de contrato necessária, o texto concatenado chega como uma string comum igual ao fluxo 1-pra-1 atual. |

## Standard Stack

Não aplicável — esta fase não introduz nenhuma biblioteca nova. Todas as dependências necessárias (React, TypeScript) já estão instaladas e em uso nos arquivos-alvo.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Checkbox HTML nativo (`<input type="checkbox">`) | `npx shadcn add checkbox` (componente Base UI) | Rejeitado nesta fase: (a) nenhum precedente de `Checkbox` primitivo existe no projeto — os 2 usos atuais de checkbox (`csv-import-preview-table.tsx` "Importar mesmo assim", `template-form-dialog.tsx` "Marcar como padrão") já usam `<input type="checkbox">` cru com `accent-[#0D9488]`/`h-4 w-4`; (b) uma tentativa anterior de `npx shadcn add popover` **falhou por falta de memória** neste host de 4GB (registrado em `STATE.md`: "npx shadcn add popover falhou por falta de memoria neste host; popover.tsx foi escrito a mao") — reintroduzir o mesmo risco para uma lista simples de checkboxes não vale o custo. Seguir o padrão já estabelecido é mais seguro e mais rápido. |

## Package Legitimacy Audit

Não aplicável — nenhum pacote novo é instalado nesta fase.

**Packages removed due to slopcheck [SLOP] verdict:** nenhum (nenhum pacote pesquisado)
**Packages flagged as suspicious [SUS]:** nenhum

## Architecture Patterns

### System Architecture Diagram

```
[CSV file, já parseado em ParsedCsvRow[]]
        │
        ▼
[CsvColumnMapper — passo "mapping"]
   ├─ Selects 1-pra-1 existentes (nome, telefone, subnicho, canal, origem, valor, notas)
   └─ NOVO: seção de checkboxes "Colunas extras para notas (opcional)"
        │  lista = headers do CSV MENOS os já usados em algum Select fixo
        │  (recalculada a cada render, deriva de `mapping` + `headers`)
        ▼
   estado do wizard: { mapping: CsvColumnMapping, extraNotasColumns: string[] }
        │  (sobrevive a "Voltar ao mapeamento", igual `mapping` hoje)
        │
        ▼ [admin clica "Ver prévia" → handleContinueToPreview]
[mapCsvRows(parsedRows, mapping, extraNotasColumns) — src/lib/csv-import.ts]
   ├─ readMapped() para os 7 campos fixos (inalterado)
   └─ NOVO: buildNotasText(row, mapping, extraNotasColumns, csvHeaderOrder)
        │  1. valor bruto da coluna "Notas" mapeada (trim, sem rótulo) — pode ser ""
        │  2. + cada coluna extra marcada, na ORDEM DO CSV (não ordem de clique),
        │     formatada "HeaderExato: valor", pulando linhas com célula vazia
        │  3. junta os pedaços não-vazios com "\n"
        │  4. SE resultado final == "" → usa CSV_DEFAULTS.notas (fallback D-11)
        ▼
   MappedCsvRow[] (campo `notas` já é a string final, pronta)
        │
        ▼
[CsvImportPreviewTable — só renderiza `row.notas` na coluna "Notas", nunca recalcula]
        │
        ▼ [admin confirma]
[bulkImportLeads — src/actions/import-actions.ts]
   csvRowSchema.safeParse(row) → notas: z.string().trim().min(1) → INSERT
   (nenhuma mudança de contrato: `notas` chega como string comum, igual hoje)
```

### Recommended Project Structure

Nenhuma pasta nova. Mudanças ficam nos 3 arquivos já identificados pelo CONTEXT.md:

```
src/
├── lib/
│   └── csv-import.ts              # + CsvExtraNotasColumns (tipo), + buildNotasText(), mapCsvRows() atualizado
├── components/
│   ├── csv-column-mapper.tsx      # + seção de checkboxes + resumo ao vivo (D-09)
│   ├── csv-import-wizard.tsx      # + extraNotasColumns no WizardState (mapping e preview), + setter
│   └── csv-import-preview-table.tsx  # SEM MUDANÇA (já renderiza row.notas)
```

### Pattern 1: Estado irmão de `mapping`, não um campo dentro de `CsvColumnMapping`

**What:** `CsvColumnMapping` é hoje `Record<CsvFieldKey, string | null>` — um mapa 1-pra-1 fechado sobre os 7 `CsvFieldKey` conhecidos (`nome`, `telefone`, `subnichoNome`, `canal`, `origem`, `valorEstimado`, `notas`). Colunas extras marcadas não são um campo fixo — são um **conjunto variável de nomes de coluna do CSV**, então não cabem no mesmo `Record` sem forçar uma chave sintética artificial. A melhor forma é um tipo irmão exportado de `csv-import.ts`:

```typescript
// src/lib/csv-import.ts — ao lado de CsvColumnMapping
/** Nomes de header do CSV marcados como "coluna extra para notas" (D-01/D-02).
 * Vazio por padrão — nenhuma mudança de comportamento sem ação do admin (D-11). */
export type CsvExtraNotasColumns = string[];
```

**When to use:** Sempre que o admin interage com o passo de mapeamento — este array viaja junto com `mapping` em todo o `WizardState`, com o mesmo ciclo de vida (criado vazio no upload, mutável no passo `mapping`, congelado/lido no passo `preview`, restaurado integralmente em "Voltar ao mapeamento").

**Example:**
```typescript
// src/components/csv-import-wizard.tsx
const EMPTY_MAPPING: CsvColumnMapping = { /* ...existente... */ };
const EMPTY_EXTRA_NOTAS_COLUMNS: CsvExtraNotasColumns = [];

type WizardState =
  | { step: "upload"; fileName?: string; error?: CsvUploadError }
  | {
      step: "mapping";
      fileName: string;
      parsedRows: ParsedCsvRow[];
      detectedDelimiter: string;
      detectedEncoding: "UTF-8" | "Windows-1252";
      mapping: CsvColumnMapping;
      extraNotasColumns: CsvExtraNotasColumns; // NOVO
    }
  | {
      step: "preview";
      // ...mesmos campos + extraNotasColumns (NOVO)
      mappedRows: MappedCsvRow[];
    };

function handleExtraNotasColumnsChange(columns: CsvExtraNotasColumns) {
  if (state.step !== "mapping") return;
  setState({ ...state, extraNotasColumns: columns });
}

function handleContinueToPreview() {
  if (state.step !== "mapping") return;
  const rows = mapCsvRows(state.parsedRows, state.mapping, state.extraNotasColumns); // assinatura estendida
  // ...resto igual
}

function handleBackToMapping() {
  if (state.step !== "preview") return;
  setState({
    step: "mapping",
    // ...
    mapping: state.mapping,
    extraNotasColumns: state.extraNotasColumns, // sobrevive igual a `mapping`
  });
}
```

### Pattern 2: Função pura de concatenação, chamada de dentro de `mapCsvRows`

**What:** Adicionar `buildNotasText()` como função pura interna (não exportada, a menos que testes unitários precisem importá-la diretamente — se sim, exportar) dentro de `csv-import.ts`, chamada por `mapCsvRows` no lugar da linha atual `const notas = readMapped(row, "notas") || CSV_DEFAULTS.notas;`.

**When to use:** Toda vez que `mapCsvRows` monta uma `MappedCsvRow` — preserva o invariante já documentado no comentário de `csv-import-preview-table.tsx` ("este componente só renderiza, nunca recalcula").

**Example:**
```typescript
// src/lib/csv-import.ts

/**
 * Concatena a coluna "Notas" mapeada (1-pra-1, sem rótulo) com as colunas
 * extras marcadas (D-10), na ORDEM DO ARQUIVO CSV — não na ordem de clique
 * do admin (D-08). Célula vazia numa coluna extra omite a linha inteira
 * daquela coluna (D-07). Retorna "" se não houver nada (fallback D-11 é
 * aplicado pelo chamador, mapCsvRows, sobre o RESULTADO final desta função —
 * nunca sobre o valor bruto da coluna "Notas" isolada, ver Pitfall 1).
 */
function buildNotasText(
  row: ParsedCsvRow,
  mapping: CsvColumnMapping,
  extraColumns: CsvExtraNotasColumns,
  csvHeaderOrder: string[]
): string {
  const parts: string[] = [];

  // 1) Notas 1-pra-1 mapeada, sem rótulo (D-10) — vai primeiro.
  const notasHeader = mapping.notas;
  if (notasHeader !== null && notasHeader in row) {
    const value = (row[notasHeader] ?? "").trim();
    if (value !== "") parts.push(value);
  }

  // 2) Colunas extras, na ordem do CSV (D-08) — não na ordem de `extraColumns`.
  //    Exclui qualquer header já usado em algum campo fixo (Pitfall 4) para
  //    evitar concatenação duplicada.
  const fixedHeaders = new Set(Object.values(mapping).filter((v): v is string => v !== null));
  const extraSet = new Set(extraColumns.filter((h) => !fixedHeaders.has(h)));
  for (const header of csvHeaderOrder) {
    if (!extraSet.has(header)) continue;
    const value = (row[header] ?? "").trim();
    if (value === "") continue; // D-07: omite a linha inteira, nunca "Campo: "
    parts.push(`${header}: ${value}`); // D-05: rótulo neutro = header exato
  }

  return parts.join("\n"); // D-06
}

export function mapCsvRows(
  rows: ParsedCsvRow[],
  mapping: CsvColumnMapping,
  extraNotasColumns: CsvExtraNotasColumns = []
): MappedCsvRow[] {
  // csvHeaderOrder: MESMA fonte que já alimenta CsvColumnMapper hoje
  // (Object.keys(state.parsedRows[0] ?? {})) — derivada aqui a partir do
  // próprio parâmetro `rows`, nunca recalculada por uma segunda função
  // (Pitfall 3).
  const csvHeaderOrder = Object.keys(rows[0] ?? {});

  function readMapped(row: ParsedCsvRow, field: CsvFieldKey): string { /* inalterado */ }

  return rows.map((row, rowIndex) => {
    // ...nome, telefone, subnichoNome, canal, origem, valorEstimado inalterados...

    // ANTES: const notas = readMapped(row, "notas") || CSV_DEFAULTS.notas;
    const concatenatedNotas = buildNotasText(row, mapping, extraNotasColumns, csvHeaderOrder);
    const notas = concatenatedNotas || CSV_DEFAULTS.notas; // fallback SOBRE o resultado final (D-11)

    return { rowIndex, nome, telefone, telefoneNormalizado: normalizePhone(telefone), subnichoNome, canal, origem, valorEstimado, notas };
  });
}
```

**Nota de assinatura:** `extraNotasColumns` como 3º parâmetro com default `= []` mantém `mapCsvRows` retrocompatível caso algum outro chamador (não identificado nesta pesquisa, mas por segurança) invoque com apenas 2 argumentos.

### Pattern 3: Cálculo de "colunas ainda não mapeadas" (D-02)

**What:** A lista de checkboxes precisa mostrar `headers.filter(h => !Object.values(mapping).includes(h))`. Isso já é barato (7 campos fixos, no máximo ~19 headers no CSV real do cowork) e pode ser recalculado a cada render sem `useMemo` — não há necessidade de memoização prematura para esse volume.

**Example:**
```typescript
// src/components/csv-column-mapper.tsx
const mappedHeaders = new Set(Object.values(mapping).filter((v): v is string => v !== null));
const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h));
```

**D-03 (seção some se `unmappedHeaders.length === 0`):**
```tsx
{unmappedHeaders.length > 0 && (
  <div className="flex flex-col gap-3 rounded-lg bg-[#F4F4F5] p-6">
    <p className="text-sm font-medium">Colunas extras para notas (opcional)</p>
    {unmappedHeaders.map((header) => (
      <label key={header} className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="size-4 accent-[#0D9488]"
          checked={extraNotasColumns.includes(header)}
          onChange={() => handleToggleExtraColumn(header)}
        />
        {header}
      </label>
    ))}
    {extraNotasColumns.length > 0 && (
      <p className="text-sm text-muted-foreground">
        Serão concatenadas: {headers.filter((h) => extraNotasColumns.includes(h)).join(" → ")}
      </p>
    )}
  </div>
)}
```

O resumo (D-09) filtra `headers` (ordem do arquivo) pelo conjunto marcado — a MESMA lógica de ordenação que `buildNotasText` usa — para garantir que o resumo nunca minta sobre a ordem real do resultado final.

### Anti-Patterns to Avoid

- **Fazer fallback para `CSV_DEFAULTS.notas` sobre o valor bruto de `mapping.notas` antes de concatenar:** quebra D-11/D-10 — texto padrão apareceria misturado com colunas extras reais quando a coluna "Notas" 1-pra-1 está vazia mas há extras marcados. Ver Pitfall 1 abaixo.
- **Ordenar colunas extras pela ordem de `extraNotasColumns` (ordem de clique do admin) em vez da ordem do CSV:** viola D-08 explicitamente. `extraNotasColumns` é um `string[]` que só registra QUAIS colunas foram marcadas, nunca em que ordem — a ordem de exibição/concatenação vem sempre de `csvHeaderOrder` filtrado.
- **Recalcular o texto concatenado dentro de `csv-import-preview-table.tsx`:** quebra o invariante já documentado no comentário do componente ("este componente só renderiza, nunca recalcula") — toda a lógica de formatação pertence a `csv-import.ts`.
- **Instalar `npx shadcn add checkbox`:** desnecessário (padrão já existe no código) e replica o risco de OOM já registrado com `popover` neste host de 4GB.

## Don't Hand-Roll

Não aplicável — esta fase não resolve nenhum problema "deceptively complex" que já tenha solução de biblioteca padrão (não é parsing de data, não é normalização de telefone, não é criptografia). É concatenação de string com regras de formatação específicas do produto — a implementação direta (função pura, ~25 linhas) é o padrão correto, não um hand-roll de algo que devesse vir de uma lib.

## Common Pitfalls

### Pitfall 1: Fallback aplicado no lugar errado (ordem de operações)

**What goes wrong:** Se a implementação mantiver a linha atual `const notas = readMapped(row, "notas") || CSV_DEFAULTS.notas;` e SEPARADAMENTE concatenar as colunas extras depois (ex: `notas + "\n" + extrasText`), uma linha com "Notas" 1-pra-1 vazia mas colunas extras preenchidas vai produzir `"Importado via CSV.\nscore: 4\nsinal_dor: ..."` — o texto padrão aparece junto com dados reais, o que viola D-11 (fallback só quando NADA foi mapeado OU marcado) e confunde o admin (por que "Importado via CSV." aparece se ele mapeou colunas de verdade?).

**Why it happens:** É a extensão "óbvia" mais simples de escrever por cima do código existente — manter a linha antiga intacta e só "grudar" a lógica nova do lado.

**How to avoid:** Calcular o texto concatenado completo primeiro (`buildNotasText`, incluindo a coluna "Notas" 1-pra-1 sem rótulo como primeiro pedaço — D-10), e SÓ DEPOIS aplicar `|| CSV_DEFAULTS.notas` sobre o resultado final. Ver Pattern 2 acima para o código exato.

**Warning signs:** Qualquer teste manual em que uma linha tenha "Notas" vazia + colunas extras marcadas mostra "Importado via CSV." no meio do texto — sinal de que o fallback foi aplicado cedo demais.

### Pitfall 2: Ordem do CSV vs. ordem de clique do admin

**What goes wrong:** Se `extraNotasColumns` for tratado como uma lista ORDENADA (ex: `push` a cada clique, sem reordenar depois) e usado diretamente para determinar a ordem de concatenação, o resultado depende da ORDEM EM QUE O ADMIN CLICOU nos checkboxes, não da ordem das colunas no arquivo — viola D-08 diretamente.

**Why it happens:** É o comportamento "natural" de um array que só recebe `.push()`/toggle sem lógica extra — parece funcionar em testes manuais simples (admin clica em ordem visual = ordem do CSV, porque a lista de checkboxes já é renderizada na ordem do CSV) mas quebra silenciosamente se o admin desmarcar e remarcar em ordem diferente, ou se a implementação usar `Set` (sem ordem garantida) para armazenar o estado.

**How to avoid:** `extraNotasColumns` guarda só QUAIS colunas estão marcadas (é um "conjunto", mesmo que representado como `string[]` para simplicidade de `useState`/serialização). A ORDEM de concatenação é sempre recalculada filtrando `csvHeaderOrder` (a ordem real do arquivo, já disponível via `Object.keys(parsedRows[0])`) pelo conjunto marcado — nunca lida diretamente do array de estado. Aplicar essa mesma regra tanto em `buildNotasText` (Pattern 2) quanto no resumo ao vivo do wizard (D-09) — os dois precisam concordar.

### Pitfall 3: Fonte de `csvHeaderOrder` duplicada/divergente

**What goes wrong:** O wizard já calcula `Object.keys(state.parsedRows[0] ?? {})` em `csv-import-wizard.tsx` (linha 299, passado para `CsvColumnMapper`). Se `mapCsvRows`/`buildNotasText` recalcularem essa mesma lista de forma independente a partir de `rows[0]` (dentro de `csv-import.ts`), e alguma linha do CSV tiver colunas em ordem/quantidade diferente da primeira linha (CSV malformado, célula extra), as duas listas podem divergir — o resumo do wizard (D-09, calculado a partir de `state.parsedRows[0]`) mostraria uma ordem, e o texto final salvo (calculado a partir de `rows[0]` dentro de `mapCsvRows`) poderia mostrar outra, quebrando a promessa de D-09 ("mostra... em que ordem" deve bater com o resultado real).

**Why it happens:** Papa.parse com `header: true` normalmente produz objetos com as mesmas chaves em todas as linhas, mas CSVs reais do cowork (scraping) já mostraram, na Fase 2, colunas ausentes/linhas malformadas (ver histórico de `cbfb1bc`/`fc684c6`/`0fb70fd` em STATE.md — sub-nicho ausente, telefone com DDI estrangeiro já causaram bugs reais neste fluxo).

**How to avoid:** Usar UMA ÚNICA fonte de `csvHeaderOrder` — a mais segura é derivar sempre de `Object.keys(rows[0] ?? {})` dentro do próprio `csv-import.ts` (já é o que `mapCsvRows` teria acesso via seu parâmetro `rows`), e fazer o wizard/`CsvColumnMapper` usar a MESMA fonte (`Object.keys(state.parsedRows[0] ?? {})`, que já é o padrão hoje) — não introduzir uma segunda função de cálculo de headers. Não passar `csvHeaderOrder` como parâmetro adicional de fora para dentro de `mapCsvRows`; deixá-la calculada internamente a partir de `rows[0]`, exatamente como já acontece hoje para os headers usados por `CsvColumnMapper`.

### Pitfall 4: Reatividade entre checkboxes e Selects fixos (coluna usada em dois lugares)

**What goes wrong:** D-02 exige que uma coluna já usada em um campo fixo (ex: "Notas" 1-pra-1 aponta para o header `observacao`) NÃO apareça duplicada na lista de checkboxes. Se o admin: (a) marca `observacao` como coluna extra, depois (b) muda o Select do campo "Notas" para apontar TAMBÉM para `observacao` — o checkbox de `observacao` precisa desaparecer da lista (agora está "usada" em um campo fixo). Se ficar um valor órfão dentro de `extraNotasColumns` (marcado antes de virar campo fixo), `buildNotasText` não pode concatenar a mesma coluna DUAS VEZES (uma como notas 1-pra-1, outra como extra).

**Why it happens:** Só é um risco real SE `unmappedHeaders` (Pattern 3) for calculado uma vez e cacheado em vez de recalculado a cada render a partir do `mapping` atual — nesse caso ficaria "preso" no estado antigo. Ou se `buildNotasText` confiar apenas em "essa coluna estava na lista de checkboxes visível no momento em que foi marcada" em vez de revalidar contra o `mapping` atual a cada chamada.

**How to avoid:** Calcular `unmappedHeaders` (e, por extensão, "quais checkboxes mostrar") DIRETAMENTE a cada render a partir de `mapping` + `headers`, sem `useMemo`/cache (volume pequeno, ver Pattern 3) — garante que a lista sempre reflita o estado atual dos 7 Selects fixos. Adicionalmente, dentro de `buildNotasText`, filtrar `extraColumns` removendo qualquer valor que apareça em `Object.values(mapping)` (não só `mapping.notas` — evita, por exemplo, que a mesma coluna usada como "Origem" também apareça duplicada em notas) ANTES do laço de concatenação — já incluído no código de exemplo do Pattern 2 (`fixedHeaders`/`extraSet`). Isso torna o array de estado tolerante a valores órfãos sem precisar de lógica de "limpeza" ativa toda vez que um Select muda.

### Pitfall 5: Validação server-side de `notas` (`min(1)`) e o caso "tudo vazio"

**What goes wrong:** `csvRowSchema` (`src/lib/validations.ts`, linha 34) exige `notas: z.string().trim().min(1)`. Se `buildNotasText` retornar `""` (nem "Notas" 1-pra-1 nem extras têm valor para aquela linha específica, mesmo que o admin tenha marcado colunas extras globalmente) e o fallback `|| CSV_DEFAULTS.notas` NÃO for aplicado corretamente (ver Pitfall 1), a linha falharia na validação server-side com uma mensagem confusa tipo "Linha N: Notas são obrigatórias [notas]" — uma regressão de UX que hoje não existe (hoje o fallback sempre garante não-vazio).

**Why it happens:** É fácil esquecer que o fallback precisa cobrir não só "CSV simples sem nenhuma coluna extra marcada" (o caso principal de D-11) mas também "CSV com colunas extras marcadas GLOBALMENTE, mas uma linha específica tem todas essas células vazias" (célula vazia é omitida por D-07, então uma linha pode legitimamente terminar com string vazia mesmo com colunas marcadas).

**How to avoid:** Aplicar `|| CSV_DEFAULTS.notas` sempre sobre o resultado FINAL por linha (depois do `.join("\n")`), nunca sobre um valor intermediário — já coberto pelo Pattern 2, mas vale testar explicitamente esse caso de borda (linha com célula vazia em TODAS as colunas mapeadas/marcadas) na prévia antes de considerar a fase pronta.

## Code Examples

Ver Pattern 1 (estado no wizard), Pattern 2 (`buildNotasText`/`mapCsvRows`) e Pattern 3 (`unmappedHeaders`/checkboxes) acima — os três já contêm código adaptado diretamente da estrutura real dos arquivos lidos nesta pesquisa (`src/lib/csv-import.ts`, `src/components/csv-column-mapper.tsx`, `src/components/csv-import-wizard.tsx`), não pseudocódigo genérico.

## State of the Art

Não aplicável — não há "abordagem antiga vs. nova" de mercado aqui, é uma decisão de produto interna (D-01 a D-11 do CONTEXT.md) implementada com as mesmas ferramentas (React state, TypeScript) já em uso no restante do wizard.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Nenhum outro arquivo do projeto além dos 4 identificados no CONTEXT.md chama `mapCsvRows()` ou lê `CsvColumnMapping` diretamente (verificado via grep textual nos arquivos lidos, não uma varredura exaustiva de todo `src/`) | Pattern 2 (assinatura estendida de `mapCsvRows`) | Baixo — a assinatura estendida usa parâmetro opcional com default `[]`, então mesmo um chamador não identificado continuaria funcionando sem quebra; risco só afetaria "aproveitamento" da funcionalidade nova em superfícies não descobertas, não uma quebra. |
| A2 | Papa.parse (`header: true`) preserva a ordem das colunas do arquivo em `Object.keys()` de cada linha (base para D-08) | Pitfall 2/3, Pattern 2/3 | Médio se falso — a ordem de concatenação dependeria da ordem de inserção das chaves no objeto JS, que Papa.parse já usa como base para os headers hoje (comportamento padrão de `header: true`, já em uso desde a Fase 2 para os 7 campos fixos sem relato de problema) — comportamento consistente e já validado empiricamente pelo uso atual do wizard, mas não foi lido o código-fonte de PapaParse nesta sessão de pesquisa. |

**Se esta tabela estiver vazia:** não está — A1 e A2 acima precisam de atenção do planner, mas nenhuma é bloqueante (ambas têm mitigação de baixo risco já embutida no design recomendado).

## Open Questions

1. **Nome exato do tipo/campo `extraNotasColumns` (Claude's Discretion no CONTEXT.md)**
   - What we know: CONTEXT.md deixa explicitamente como "Claude's Discretion" o nome/estrutura exata — só o comportamento (D-01 a D-11) é travado.
   - What's unclear: se o planner prefere `extraNotasColumns: string[]` (nome usado nesta pesquisa) ou outro nome (`notasExtraColumns`, `extraColumnsForNotas`, etc.) — puramente estético, sem impacto funcional.
   - Recommendation: manter `extraNotasColumns` (ou equivalente) como `string[]` simples (não `Set<string>`, para compatibilidade direta com `useState`/serialização JSON caso o wizard precise persistir estado no futuro) — decisão de nomenclatura do planner, sem necessidade de validação adicional.

2. **Checkbox "select all" / "desmarcar todas" nas colunas extras**
   - What we know: D-01 a D-04 especificam apenas checkboxes individuais, sem menção a um controle de "marcar todas".
   - What's unclear: se o CSV real do cowork (19 colunas) deixar ~5+ colunas "extras" não mapeadas por padrão (as 4 de inteligência + outras não usadas em campos fixos, ex: `tipo_url`, `link_whatsapp`, `endereco`, `website`, `instagram`, `nome_decisor`, etc. — muitas colunas do schema real de 19 não têm campo fixo correspondente), marcar uma por uma pode ser repetitivo toda vez que o admin importa um novo lote.
   - Recommendation: fora de escopo desta fase (não pedido, não travado por D-01 a D-11) — mas o planner pode considerar registrar como ideia de fase futura (v1.2+) se quiser, sem construir agora. Não incluir na Fase 5 sem confirmação do admin.

## Environment Availability

Não aplicável — esta fase não depende de nenhuma ferramenta/serviço externo além do que já roda no projeto (Next.js dev server, já confirmado rodando em `localhost:3000` per STATE.md). Nenhuma nova dependência de ambiente introduzida.

## Validation Architecture

Seção omitida — `workflow.nyquist_validation` está explicitamente `false` em `.planning/config.json`.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`) — seção incluída.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Não | Ferramenta solo, sem autenticação (fora de escopo do projeto inteiro, per `CLAUDE.md`/`PROJECT.md`) — nada muda nesta fase. |
| V3 Session Management | Não | Idem acima. |
| V4 Access Control | Não | Idem acima — single admin, sem múltiplos papéis. |
| V5 Input Validation | Sim | Já coberto pelo `csvRowSchema` existente (`z.string().trim().min(1)` para `notas`) em `src/lib/validations.ts` — o texto concatenado passa pelo MESMO ponto de validação server-side que o texto de notas 1-pra-1 já passa hoje, sem novo caminho de dado não validado. Nenhum código novo de validação é necessário além de garantir que `buildNotasText` nunca retorne uma string vazia sem o fallback aplicado (Pitfall 5). |
| V6 Cryptography | Não | Nenhum dado sensível/segredo envolvido — texto de notas de CRM, mesmo nível de sensibilidade dos outros campos de lead já tratados. |

### Known Threat Patterns for Next.js/React + Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via conteúdo de célula CSV injetado em `notas` (ex: célula contendo `<script>`) | Tampering / Information Disclosure | Já mitigado estruturalmente: React escapa automaticamente todo texto renderizado via JSX (`{r.notas}` em `csv-import-preview-table.tsx`, e o mesmo padrão em qualquer tela futura que exiba `lead.notas`) — nenhum uso de `dangerouslySetInnerHTML` identificado nos arquivos lidos. A concatenação nova (`buildNotasText`) só produz string (`header: value\n...`), sem HTML — o mesmo nível de risco (zero, dado o escaping automático do React) que já existe hoje para o campo `notas` 1-pra-1. Nenhuma mitigação NOVA necessária, apenas não introduzir `dangerouslySetInnerHTML` ao construir a UI de resumo (D-09) ou a lista de checkboxes. |
| Header do CSV usado como rótulo sem sanitização (ex: header malicioso com caracteres de controle) | Tampering | Baixo risco: o CSV é fornecido pelo próprio admin (fonte confiável, mesmo trust boundary já aceito pela Fase 2 para nomes de header usados nos Selects de mapeamento) — headers já são exibidos crus como opções de `<SelectItem>` hoje sem sanitização adicional; usar o mesmo header como rótulo dentro do texto de notas (D-05) não introduz uma superfície de ataque nova além da que já existe. |

## Sources

### Primary (HIGH confidence)
- Leitura direta do código-fonte real do projeto (não documentação externa — esta fase estende um sistema já implementado, não uma biblioteca de terceiros):
  - `src/lib/csv-import.ts` (tipos `CsvFieldKey`/`CsvColumnMapping`/`MappedCsvRow`, `CSV_DEFAULTS`, `mapCsvRows`, `detectWithinBatchDuplicatePhones`)
  - `src/components/csv-column-mapper.tsx` (`FIELD_CONFIGS`, padrão de `Select` por campo)
  - `src/components/csv-import-wizard.tsx` (`WizardState`, `EMPTY_MAPPING`, `handleMappingChange`, `handleContinueToPreview`, `handleBackToMapping`)
  - `src/components/csv-import-preview-table.tsx` (invariante "só renderiza", checkbox HTML nativo existente em "Importar mesmo assim")
  - `src/components/ui/select.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/field.tsx` (confirmação: nenhum `checkbox.tsx` registrado, padrão Base UI usado nos primitivos que existem)
  - `src/lib/validations.ts` (`csvRowSchema`, `notas: z.string().trim().min(1)`)
  - `src/actions/import-actions.ts` (`bulkImportLeads`, confirma que `notas` chega como string comum sem transformação adicional server-side)
  - `src/components/template-form-dialog.tsx` (segundo precedente de checkbox HTML nativo no projeto)

### Secondary (MEDIUM confidence)
- `.planning/phases/05-notas-enriquecidas-na-importa-o-csv/05-CONTEXT.md` (D-01 a D-11, decisões travadas pelo admin via `/gsd-discuss-phase`)
- `.planning/STATE.md` (histórico de `npx shadcn add popover` falhando por OOM neste host — usado para justificar a recomendação de checkbox HTML nativo em vez de `shadcn add checkbox`)
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (IMPORT-04/IMPORT-05, success criteria da fase)

### Tertiary (LOW confidence)
- Nenhuma — esta pesquisa não usou WebSearch/Context7 (não aplicável: nenhuma biblioteca externa nova, nenhuma documentação de terceiros necessária).

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — nenhuma biblioteca nova
- Architecture: HIGH — baseado em leitura direta de 100% dos arquivos-alvo desta fase, não inferência
- Pitfalls: HIGH — Pitfall 1/5 derivados de leitura direta do código atual de `mapCsvRows`/`csvRowSchema` (não hipotéticos); Pitfall 2/3/4 derivados da combinação de D-08 (ordem do CSV) com a estrutura de estado proposta

**Research date:** 2026-07-29
**Valid until:** Válido enquanto `src/lib/csv-import.ts`/`src/components/csv-column-mapper.tsx`/`src/components/csv-import-wizard.tsx`/`src/components/csv-import-preview-table.tsx` não sofrerem refatoração estrutural — sem prazo de expiração por "staleness" de ecossistema (não há biblioteca externa cuja versão possa mudar). Recomenda-se revalidar apenas se algum desses 4 arquivos for alterado por outra fase antes desta ser planejada/executada.
