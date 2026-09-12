---
phase: quick-260912-omq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/lead-temperatura.ts
  - scripts/test-lead-temperatura.cjs
  - package.json
  - src/components/temperatura-indicator.tsx
  - src/app/pipeline/page.tsx
  - src/components/pipeline-board.tsx
  - src/components/pipeline-lead-card.tsx
  - src/app/leads/page.tsx
  - src/components/lead-table.tsx
autonomous: true
requirements: [TEMP-01, TEMP-02, TEMP-03]

must_haves:
  truths:
    - "Um lead parado em Novo/Contatado/Negociação há menos de 50% do limite de dias configurado para a etapa aparece como Quente (verde)"
    - "Um lead parado entre 50% e 99% do limite da etapa aparece como Morno (âmbar)"
    - "Um lead parado há 100% ou mais do limite da etapa aparece como Frio (vermelho) — exatamente o mesmo conjunto que hoje é marcado como 'Esfriando' no pipeline"
    - "Um lead em Fechado ou Perdido não mostra indicador nenhum (nem quente, nem vazio quebrado)"
    - "Um lead com stageChangedAt nulo não mostra indicador nenhum"
    - "O MESMO lead mostra a MESMA temperatura em /leads e em /pipeline, porque as duas telas chamam a mesma função pura"
    - "Clicar na linha de /leads, clicar no card do pipeline, arrastar um card entre colunas e os botões de WhatsApp/histórico/editar/excluir continuam se comportando exatamente como antes"
    - "Nenhuma coluna nova no banco: a temperatura é derivada em tempo de leitura de leads.stageChangedAt + configuracoes.diasParado*"
  artifacts:
    - path: "src/lib/lead-temperatura.ts"
      provides: "Classificação pura de temperatura em 3 faixas + construção do mapa de limites por etapa"
      exports: ["Temperatura", "LimitesPorEtapa", "buildLimitesPorEtapa", "computeTemperatura", "computeTemperaturaPorLead"]
      min_lines: 60
    - path: "scripts/test-lead-temperatura.cjs"
      provides: "Harness .cjs das funções puras (fronteiras 0/49%/50%/99%/100%, etapas terminais, stageChangedAt nulo, paridade com o esfriando antigo)"
      contains: "computeTemperatura"
      min_lines: 80
    - path: "src/components/temperatura-indicator.tsx"
      provides: "Indicador visual único (ícone + cor por token --status-*) reusado por /leads e /pipeline"
      exports: ["TemperaturaIndicator"]
    - path: "src/app/leads/page.tsx"
      provides: "Cálculo server-side da temperatura de cada lead da lista"
      contains: "computeTemperaturaPorLead"
    - path: "src/app/pipeline/page.tsx"
      provides: "Cálculo server-side da temperatura substituindo o esfriandoLeadIds inline"
      contains: "computeTemperaturaPorLead"
  key_links:
    - from: "src/app/leads/page.tsx"
      to: "src/lib/lead-temperatura.ts"
      via: "import + buildLimitesPorEtapa(config) + computeTemperaturaPorLead(activeLeads, limites)"
      pattern: "computeTemperaturaPorLead\\("
    - from: "src/app/pipeline/page.tsx"
      to: "src/lib/lead-temperatura.ts"
      via: "import + buildLimitesPorEtapa(config) + computeTemperaturaPorLead(activeLeads, limites)"
      pattern: "computeTemperaturaPorLead\\("
    - from: "src/components/lead-table.tsx"
      to: "src/components/temperatura-indicator.tsx"
      via: "import + render ao lado do <EtapaBadge> na célula de etapa"
      pattern: "<TemperaturaIndicator"
    - from: "src/components/pipeline-lead-card.tsx"
      to: "src/components/temperatura-indicator.tsx"
      via: "import + render na linha de metadados do card, no lugar do antigo bloco isEsfriando"
      pattern: "<TemperaturaIndicator"
    - from: "package.json"
      to: "scripts/test-lead-temperatura.cjs"
      via: "npm script test:lead-temperatura"
      pattern: "test:lead-temperatura"
---

<objective>
Transformar o sinal booleano de "esfriando" — que hoje só existe no `/pipeline` — num indicador de temperatura de 3 faixas (Quente / Morno / Frio) e levá-lo também para a lista `/leads`.

Purpose: hoje o admin só enxerga que um lead esfriou quando ele JÁ passou do limite, e só se estiver olhando o board. Com 3 faixas ele vê o lead esquentando/esfriando ANTES de estourar o prazo, e vê isso nas duas telas onde trabalha.
Output: um módulo puro `src/lib/lead-temperatura.ts` (coberto por harness `.cjs`), um componente visual único `TemperaturaIndicator`, e as duas telas consumindo a mesma função — sem coluna nova no banco, sem dependência nova, sem mudança de comportamento.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

Fontes que o executor vai tocar ou espelhar:
@src/app/pipeline/page.tsx
@src/components/pipeline-board.tsx
@src/components/pipeline-lead-card.tsx
@src/app/leads/page.tsx
@src/components/lead-table.tsx
@src/components/etapa-badge.tsx
@src/lib/lead-csv-export.ts
@scripts/test-lead-csv-export.cjs

<interfaces>
<!-- Contratos já existentes no código. Use direto, NÃO saia explorando o repo. -->

De `src/types/index.ts`:
```typescript
export type Lead = InferSelectModel<typeof leads>;
// campos relevantes: id: number; stage: "novo"|"contatado"|"negociacao"|"fechado"|"perdido";
//                    stageChangedAt: Date | null; nichoId: number; ...
```

De `src/db/schema.ts` (tabela `configuracoes`, linha singleton id=1):
```typescript
diasParadoNovo: integer("dias_parado_novo").notNull().default(999999),
diasParadoContatado: integer("dias_parado_contatado").notNull().default(5),
diasParadoNegociacao: integer("dias_parado_negociacao").notNull().default(999999),
// leads.stageChangedAt: integer("stage_changed_at", { mode: "timestamp" })  -> NULLABLE, sem default
```

De `src/db/queries.ts`:
```typescript
export async function getConfiguracoes(): Promise<Configuracoes>; // semeia a linha id=1 se faltar
```

De `src/components/etapa-badge.tsx`:
```typescript
export type Stage = Lead["stage"];
export const STAGE_OPTIONS: { value: Stage; label: string }[];
export function EtapaBadge({ stage }: { stage: Stage }): JSX.Element;
```

Lógica boolean ATUAL, em `src/app/pipeline/page.tsx` (é ela que vira a função pura):
```typescript
const limitesPorEtapa: Partial<Record<Stage, number>> = {
  novo: config.diasParadoNovo,
  contatado: config.diasParadoContatado,
  negociacao: config.diasParadoNegociacao,
  // fechado/perdido ficam de fora do mapa DE PROPÓSITO -> limitesPorEtapa[stage] === undefined
};
const esfriandoLeadIds = activeLeads
  .filter((lead) =>
    limitesPorEtapa[lead.stage] != null &&
    lead.stageChangedAt != null &&
    differenceInDays(new Date(), lead.stageChangedAt) >= limitesPorEtapa[lead.stage]!
  )
  .map((lead) => lead.id);
```

Tokens semânticos disponíveis (`src/app/globals.css`, Fase 19 — definidos em `:root` E em `.dark`):
`--status-neutral`, `--status-info`, `--status-warning`, `--status-success`, `--status-danger`,
cada um com seu par `-foreground`. Em Tailwind: `bg-status-warning`, `text-status-warning-foreground`, etc.
NÃO existe token de cor fora dessa escala — `npm run verify:brand` falha com qualquer hex/escala Tailwind nomeada.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Função pura de temperatura em 3 faixas + harness .cjs</name>
  <files>src/lib/lead-temperatura.ts, scripts/test-lead-temperatura.cjs, package.json</files>
  <behavior>
    Fronteiras com `limite = 10` dias (etapa `contatado`), `stageChangedAt` = hoje - N dias:
    - N = 0  -> "quente"   (0% do limite)
    - N = 4  -> "quente"   (40%)
    - N = 5  -> "morno"    (50% exato — fronteira INCLUSIVA em morno)
    - N = 9  -> "morno"    (90%)
    - N = 10 -> "frio"     (100% exato — fronteira INCLUSIVA em frio, paridade com o `>=` do esfriando de hoje)
    - N = 40 -> "frio"
    Exclusões (retornam `null`, NUNCA uma string de temperatura):
    - stage `fechado` -> null (ausente do mapa de limites)
    - stage `perdido` -> null (ausente do mapa de limites)
    - limite ausente/`undefined` para a etapa -> null
    - `stageChangedAt === null` -> null (mesmo que a etapa tenha limite)
    Bordas:
    - `stageChangedAt` no futuro (N negativo) -> "quente" (nunca quebra, nunca NaN)
    - `limite = 1`, N = 0 -> "quente"; N = 1 -> "frio" (faixa morna inexistente nesse limite, aceitável)
    Paridade com o booleano antigo: para qualquer entrada, `computeTemperatura(...) === "frio"` se e somente se
    a expressão `limite != null && stageChangedAt != null && differenceInDays(agora, stageChangedAt) >= limite`
    for verdadeira. O harness prova isso comparando as duas fórmulas num varredura de N = 0..15 com limite 10.
    `computeTemperaturaPorLead([...], limites, agora)` devolve UMA entrada por lead COM temperatura, omitindo
    os `null` (mesmo idioma do `sugestaoPorLead` já existente em pipeline/page.tsx).
  </behavior>
  <action>
Criar `src/lib/lead-temperatura.ts` — módulo PURO (zero DOM, zero React, zero import de `@/db`, zero `.tsx`; só `date-fns`), no mesmo molde de `src/lib/lead-csv-export.ts`, com doc-comment em PT-BR explicando que a temperatura é derivada em tempo de leitura e NUNCA persistida.

Exportar:
- `export type Temperatura = "quente" | "morno" | "frio";`
- `export type LimitesPorEtapa = Partial<Record<Stage, number>>;` — declarar o tipo `Stage` localmente como união literal (`"novo" | "contatado" | "negociacao" | "fechado" | "perdido"`) OU importar `type Stage` de `@/components/etapa-badge`; prefira a união literal local com um comentário "espelho de `Lead['stage']`", pelo mesmo motivo já documentado em `lead-csv-export.ts` (importar de um `.tsx` quebra o harness `.cjs`).
- `export const LIMIAR_MORNO = 0.5;` — a fração do limite a partir da qual o lead deixa de ser quente. Constante nomeada e exportada (o harness asserta em cima dela, e ela documenta o único número mágico do módulo).
- `export function buildLimitesPorEtapa(config: { diasParadoNovo: number; diasParadoContatado: number; diasParadoNegociacao: number }): LimitesPorEtapa` — devolve `{ novo, contatado, negociacao }` e OMITE `fechado`/`perdido` do objeto. Copiar o comentário do `pipeline/page.tsx` explicando que a ausência no mapa (e não um `if` extra) é o que exclui as etapas terminais.
- `export function computeTemperatura(lead: { stage: Stage; stageChangedAt: Date | null }, limites: LimitesPorEtapa, agora: Date = new Date()): Temperatura | null` — ordem exata das guardas: (1) `const limite = limites[lead.stage]; if (limite == null) return null;` (2) `if (lead.stageChangedAt == null) return null;` (3) `const dias = differenceInDays(agora, lead.stageChangedAt);` (4) `if (dias >= limite) return "frio";` (5) `if (dias >= limite * LIMIAR_MORNO) return "morno";` (6) `return "quente";`. Note no comentário que o passo (4) é LITERALMENTE a condição do `esfriandoLeadIds` de hoje — é isso que garante que a faixa "frio" nunca divirja do comportamento anterior.
- `export function computeTemperaturaPorLead<T extends { id: number; stage: Stage; stageChangedAt: Date | null }>(leads: T[], limites: LimitesPorEtapa, agora: Date = new Date()): { leadId: number; temperatura: Temperatura }[]` — `map` + `filter` dos `null`, espelhando o idioma do `sugestaoPorLead` já existente. Genérico em `T` para aceitar tanto `Lead` quanto `LeadRow` sem cast.

NÃO adicionar rótulo, ícone, cor ou qualquer coisa de UI neste arquivo — isso mora na Task 2.

Criar `scripts/test-lead-temperatura.cjs` copiando a estrutura EXATA de `scripts/test-lead-csv-export.cjs`: shebang, `"use strict"`, `register("./ts-alias-loader.mjs", pathToFileURL(__dirname + "/"))`, contador `failed`, helper `check(condition, message)` que loga `OK`/`FAIL`, IIFE async com `await import("@/lib/lead-temperatura")`, doc-comment de cabeçalho em PT-BR listando o que cobre, e o bloco final de exit 0/1 + `.catch`. Fixture `leadFixture({ stage, diasParado })` que monta `{ id, stage, stageChangedAt }` usando uma data-base FIXA (ex.: `const AGORA = new Date(2026, 8, 12, 12, 0, 0);` e `stageChangedAt = subDays(AGORA, diasParado)` via `date-fns`) e passando `AGORA` explicitamente para as funções — nunca `new Date()` real, para o harness não ficar dependente do relógio. Cobrir TODOS os casos do bloco `<behavior>` acima, incluindo o loop de paridade N = 0..15 contra a fórmula booleana antiga escrita à mão dentro do próprio teste.

Registrar em `package.json` o script `"test:lead-temperatura": "node scripts/test-lead-temperatura.cjs"`, inserido junto dos outros `test:*` (antes de `test:tour-persistence`, mantendo o agrupamento).
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run test:lead-temperatura && node -e "const s=require('./package.json').scripts; process.exit(s['test:lead-temperatura']?0:1)"</automated>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && grep -v '^ \*' src/lib/lead-temperatura.ts | grep -c 'from "@/db' | grep -qx 0 && echo "OK: modulo puro, sem import de banco"</automated>
  </verify>
  <done>`npm run test:lead-temperatura` sai 0 com todas as asserções OK. Teste de MUTAÇÃO obrigatório: trocar temporariamente `dias >= limite` por `dias > limite` em `computeTemperatura` e confirmar que o harness FALHA (exit 1) no caso N = 10 e no loop de paridade; reverter em seguida. O módulo não importa nada de `@/db`, `react` ou `.tsx`.</done>
</task>

<task type="auto">
  <name>Task 2: Componente TemperaturaIndicator + upgrade do /pipeline (boolean -> 3 faixas)</name>
  <files>src/components/temperatura-indicator.tsx, src/app/pipeline/page.tsx, src/components/pipeline-board.tsx, src/components/pipeline-lead-card.tsx</files>
  <action>
**a) `src/components/temperatura-indicator.tsx`** (novo, componente de apresentação puro, sem `"use client"` — ele não usa hook nenhum; segue o molde de `etapa-badge.tsx`):
- Props: `{ temperatura: Temperatura; compact?: boolean }`. Importar `type { Temperatura }` de `@/lib/lead-temperatura`.
- Dois `Record<Temperatura, ...>` separados (mesmo idioma `STAGE_LABEL` + `STAGE_TOKEN` de `etapa-badge.tsx`, que separa rótulo de cor de propósito):
  - `TEMPERATURA_LABEL`: `quente: "Quente"`, `morno: "Morno"`, `frio: "Frio"`.
  - `TEMPERATURA_TOKEN`: `quente: "text-status-success-foreground"`, `morno: "text-status-warning-foreground"`, `frio: "text-status-danger-foreground"`. SOMENTE tokens `--status-*` — zero hex, zero escala Tailwind nomeada (`npm run verify:brand` reprova).
- `TEMPERATURA_ICON`: `quente: Flame`, `morno: Thermometer`, `frio: Snowflake` (todos de `lucide-react`, já instalado).
- Render: `<span>` com `className={cn("flex items-center gap-1", TEMPERATURA_TOKEN[temperatura])}`, ícone `className="size-3.5 shrink-0"`. Quando `compact`, renderiza SÓ o ícone e põe o rótulo em `aria-label={\`Lead ${TEMPERATURA_LABEL[temperatura].toLowerCase()}\`}` + `title` com uma frase curta ("Quente — pouco tempo parado nesta etapa" / "Morno — se aproximando do limite de dias da etapa" / "Frio — passou do limite de dias da etapa"). Quando não-compact, renderiza ícone + rótulo textual em `text-[14px] leading-normal` e mantém o mesmo `title`. Tratamento discreto: sem fundo, sem borda, sem badge — só ícone + cor, como pede o brief.
- Doc-comment em PT-BR: fonte única de verdade visual das 3 faixas, consumida por `/leads` e `/pipeline`; a classificação em si mora em `@/lib/lead-temperatura`, este arquivo só pinta.

**b) `src/app/pipeline/page.tsx`**: apagar o bloco inline `limitesPorEtapa` + `esfriandoLeadIds` e o import de `differenceInDays` (se ficar sem uso). No lugar: `const temperaturaPorLead = computeTemperaturaPorLead(activeLeads, buildLimitesPorEtapa(config));` importando de `@/lib/lead-temperatura`. Passar `temperaturaPorLead={temperaturaPorLead}` ao `<PipelineBoard>` no lugar de `esfriandoLeadIds`. Atualizar o doc-comment do arquivo: o conjunto booleano "esfriando" virou classificação de 3 faixas, a regra de exclusão de `fechado`/`perdido` e de `stageChangedAt` nulo agora mora em `buildLimitesPorEtapa`/`computeTemperatura` (fonte única), e a faixa "frio" é exatamente o antigo "esfriando".

**c) `src/components/pipeline-board.tsx`**: trocar a prop `esfriandoLeadIds: number[]` por `temperaturaPorLead: { leadId: number; temperatura: Temperatura }[]` (importar `type { Temperatura }` de `@/lib/lead-temperatura`); trocar `esfriandoSet` por `const temperaturaPorLeadId = useMemo(() => new Map(temperaturaPorLead.map((t) => [t.leadId, t.temperatura])), [temperaturaPorLead]);` (mesmo idioma do `sugestaoPorLeadId` logo abaixo); no render do card, trocar `isEsfriando={esfriandoSet.has(lead.id)}` por `temperatura={temperaturaPorLeadId.get(lead.id)}`. NÃO mexer em `useOptimistic`, sensores, `commitStageChange`, fila de motivo de perda ou qualquer handler — o mapa continua chaveado por `leadId` e calculado no servidor, exatamente como o `esfriandoSet` de hoje (a mesma janela de valor obsoleto entre o drop otimista e o `revalidatePath` já existia antes; não é regressão nova e não deve ser "consertada" aqui).

**d) `src/components/pipeline-lead-card.tsx`**: trocar a prop `isEsfriando: boolean` por `temperatura?: Temperatura`. Borda: `temperatura === "frio" ? "border-2 border-status-danger-foreground" : "border"` (a borda de 2px continua existindo só no caso que hoje é "Esfriando"; a família muda de warning para danger para casar com o ícone/cor da faixa fria — mudança deliberada e consistente com `TEMPERATURA_TOKEN`). Na linha de metadados, substituir o bloco `{isEsfriando ? (<span ...><Clock/> Esfriando</span>) : null}` por `{temperatura ? <TemperaturaIndicator temperatura={temperatura} /> : null}` (versão não-compact, com rótulo — há espaço no card). Remover o import de `Clock` se ficar sem uso. Atualizar o doc-comment do componente. NÃO tocar em `useDraggable`, nos `stopPropagation` dos botões, no `onClick`/`onKeyDown` do card nem no `WhatsAppSendButton`.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit</automated>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run verify:brand</automated>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && grep -rn "esfriandoLeadIds\|isEsfriando" src/ | grep -v '^\s*//' | wc -l | grep -qx 0 && echo "OK: prop booleana antiga eliminada de src/"</automated>
  </verify>
  <done>`npx tsc --noEmit` limpo, `npm run verify:brand` exit 0, nenhuma ocorrência de `esfriandoLeadIds`/`isEsfriando` restante em `src/`, e `src/app/pipeline/page.tsx` contém `computeTemperaturaPorLead(`. `npm run lint` continua exit 0.</done>
</task>

<task type="auto">
  <name>Task 3: Indicador na lista /leads (mesma função, versão compacta)</name>
  <files>src/app/leads/page.tsx, src/components/lead-table.tsx</files>
  <action>
**a) `src/app/leads/page.tsx`**: adicionar `getConfiguracoes()` ao `Promise.all` existente (importar de `@/db/queries`, mesmo padrão do `pipeline/page.tsx`) e, depois do await, computar `const temperaturaPorLead = computeTemperaturaPorLead(activeLeads, buildLimitesPorEtapa(config));`. Passar `temperaturaPorLead={temperaturaPorLead}` ao `<LeadTable>`. Estender o doc-comment do arquivo em PT-BR: a temperatura é calculada NO SERVIDOR (mesma função e mesma configuração do `/pipeline`, então as duas telas não podem divergir) e propositalmente no servidor para não haver mismatch de hidratação por causa do relógio do cliente.

**b) `src/components/lead-table.tsx`**: adicionar a prop `temperaturaPorLead: { leadId: number; temperatura: Temperatura }[]` ao `LeadTableProps` (import `type { Temperatura }` de `@/lib/lead-temperatura`); montar `const temperaturaPorLeadId = useMemo(() => new Map(temperaturaPorLead.map((t) => [t.leadId, t.temperatura])), [temperaturaPorLead]);` junto dos outros `useMemo` de mapa (`nichoNameById`, `motivoPerdaNomeById`) — NÃO colocar dentro do `data`/`useMemo` de linhas nem dentro dos column defs. No corpo da linha, a célula de etapa passa de `<div className={COL.etapa}><EtapaBadge stage={lead.stage} /></div>` para `<div className={\`flex items-center gap-1.5 ${COL.etapa}\`}><EtapaBadge stage={lead.stage} />{temperaturaPorLeadId.get(lead.id) ? <TemperaturaIndicator temperatura={temperaturaPorLeadId.get(lead.id)!} compact /> : null}</div>` — versão COMPACT (só ícone + `title`/`aria-label`), para não estourar a largura da coluna. Nada muda no cabeçalho: o indicador vive dentro da coluna "Etapa" que já existe, então `COL`, `SORTABLE_HEADERS`, `leadTableColumns`, sort, filtro e paginação ficam INTOCADOS. Não mexer no `onClick`/`onKeyDown` da linha nem nos wrappers de `stopPropagation` da coluna de ações.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run lint</automated>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npm run verify:brand && npm run verify:schema && npm run guard:no-hard-delete</automated>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && grep -c "TemperaturaIndicator" src/components/lead-table.tsx && grep -c "computeTemperaturaPorLead" src/app/leads/page.tsx</automated>
  </verify>
  <done>`npx tsc --noEmit` e `npm run lint` limpos; `verify:brand`, `verify:schema` e `guard:no-hard-delete` exit 0 (prova de que nenhuma coluna foi adicionada ao banco); `lead-table.tsx` referencia `TemperaturaIndicator` e `leads/page.tsx` referencia `computeTemperaturaPorLead`; `npm run test:lead-temperatura` continua exit 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| banco -> Server Component (`/leads`, `/pipeline`) | `leads.stageChangedAt` e `configuracoes.diasParado*` são lidos e usados em aritmética de data; nenhum input novo de usuário atravessa fronteira nesta tarefa |
| Server Component -> Client Component | `temperaturaPorLead` é serializado como prop (array de `{ leadId: number; temperatura: string literal }`) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-omq-01 | Tampering | `computeTemperatura` com `limite` inválido (0, negativo ou não-numérico vindo de um banco editado à mão via Drizzle Studio) | mitigate | Guarda `limite == null` já barra ausente; `limite = 0` cai em `dias >= 0` -> sempre "frio" (degradação visual inócua, sem crash). A obrigatoriedade `min(1)` continua no `configuracoesServerSchema` (`src/lib/validations.ts`), fora do escopo desta tarefa |
| T-omq-02 | Denial of Service | `differenceInDays` sobre `stageChangedAt` nulo/inválido | mitigate | Guarda explícita `stageChangedAt == null` ANTES do cálculo (passo 2 da ordem obrigatória da Task 1); harness cobre o caso |
| T-omq-03 | Information Disclosure | Indicador exposto em tela | accept | Zero PII nova: a temperatura é derivada de dados que o admin já vê (etapa + datas); app solo, sem multi-usuário |
| T-omq-04 | Elevation of Privilege | Nenhuma Server Action nova, nenhuma mutação | accept | A tarefa é 100% leitura + apresentação; `guard:no-hard-delete` e `verify:schema` rodam como gate na Task 3 provando ausência de mudança de dados/schema |
| T-omq-SC | Tampering | instalação de pacote npm | accept | Zero dependência nova (`date-fns`, `lucide-react` já instalados e pinados) — nenhum `npm install` acontece neste plano |
</threat_model>

<verification>
Gates automáticos (todos devem sair 0 ao final):

```
npm run test:lead-temperatura
npx tsc --noEmit
npm run lint
npm run verify:brand
npm run verify:schema
npm run guard:no-hard-delete
```

Regressão dos harnesses vizinhos que tocam os mesmos arquivos/idiomas:

```
npm run test:lead-csv-export
npm run test:compute-sequencia
```

`npm run build` é opcional e NÃO-BLOQUEANTE neste host de 4GB (precedente registrado em STATE.md, Fases 18/19/20) — rodar apenas se a máquina estiver ociosa.

<human-check>
UAT visual (não-bloqueante, `human_verify_mode: end-of-phase`), com `npm run dev`:
1. `/configuracoes`: definir "Contatado" = 10 dias e salvar.
2. `/pipeline`: um lead parado há 2 dias em Contatado mostra chama verde "Quente"; um parado há 6 dias mostra termômetro âmbar "Morno"; um parado há 12+ dias mostra floco vermelho "Frio" + borda vermelha de 2px (era "Esfriando" âmbar antes).
3. `/leads`: o MESMO lead mostra o mesmo ícone/cor (versão só-ícone) ao lado do badge de etapa; passar o mouse mostra o `title` explicativo.
4. Leads em Fechado/Perdido: nenhum ícone de temperatura, em NENHUMA das duas telas.
5. Arrastar um card entre colunas do pipeline continua funcionando; clicar numa linha de `/leads` continua abrindo o modal de edição.
6. Repetir os passos 2–3 no tema ESCURO (toggle do sidebar) — os 3 tokens `--status-*` têm par `.dark` definido.
</human-check>
</verification>

<success_criteria>
- [ ] `src/lib/lead-temperatura.ts` existe, é puro (sem React/DOM/`@/db`) e exporta `Temperatura`, `LIMIAR_MORNO`, `buildLimitesPorEtapa`, `computeTemperatura`, `computeTemperaturaPorLead`
- [ ] `scripts/test-lead-temperatura.cjs` cobre as fronteiras 0 / 49% / 50% / 99% / 100% / muito acima, as 3 exclusões (`fechado`, `perdido`, `stageChangedAt` nulo) e o loop de paridade com a fórmula booleana antiga — e falha sob mutação
- [ ] `npm run test:lead-temperatura` registrado no `package.json` e saindo 0
- [ ] `/pipeline` e `/leads` chamam a MESMA `computeTemperaturaPorLead` com o MESMO `buildLimitesPorEtapa(config)` — zero cálculo de temperatura duplicado em `src/`
- [ ] `TemperaturaIndicator` é o único lugar do repo que decide ícone/cor/rótulo de temperatura
- [ ] Zero coluna nova, zero migração, zero dependência nova, zero Server Action nova
- [ ] `verify:brand` exit 0 (nenhuma cor nova fora da escala `--status-*`)
- [ ] Handlers de clique, drag-and-drop e mudança de etapa inalterados (diff só adiciona render + troca de prop)
</success_criteria>

<output>
Criar `.planning/quick/260912-omq-adicionar-indicador-de-temperatura-autom/260912-omq-SUMMARY.md` ao terminar.
</output>
