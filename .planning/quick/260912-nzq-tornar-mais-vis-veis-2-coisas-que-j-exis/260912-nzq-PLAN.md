---
phase: quick-260912-nzq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/campanhas/page.tsx
  - src/components/campanha-list.tsx
  - src/components/lead-table.tsx
autonomous: true
requirements: [SURF-01, SURF-02]

must_haves:
  truths:
    - "Na lista /campanhas, uma campanha com diagnóstico de IA já gerado mostra o chip do veredito sugerido direto na linha, sem precisar abrir o detalhe"
    - "Na lista /campanhas, uma campanha com veredito final já registrado mostra o chip da decisão do usuário direto na linha"
    - "Uma campanha ainda sem nenhum veredito (explorando) não mostra chip nenhum nem placeholder quebrado — só o badge de estado, como hoje"
    - "Na tabela /leads, um lead com contactAttempts > 0 mostra o contador '{n}x' com ícone MessageCircle ao lado do botão de histórico, igual ao card do pipeline"
    - "Um lead com contactAttempts = 0 não mostra contador nenhum"
    - "Clicar na linha da campanha continua abrindo /campanhas/{id}; clicar nos botões da coluna Ações de /leads continua fazendo exatamente o que fazia antes"
  artifacts:
    - path: "src/app/campanhas/page.tsx"
      provides: "Carga do veredito sugerido pela IA junto da lista de campanhas (mesmo Promise.all)"
      contains: "getVereditoIAPorCampanha"
    - path: "src/components/campanha-list.tsx"
      provides: "Chips de veredito IA + final em cada linha da lista"
      contains: "VereditoSugeridoChip"
    - path: "src/components/lead-table.tsx"
      provides: "Contador de tentativas de contato na coluna Ações"
      contains: "contactAttempts"
  key_links:
    - from: "src/app/campanhas/page.tsx"
      to: "src/db/queries.ts (getVereditoIAPorCampanha)"
      via: "import + chamada sem argumento dentro do Promise.all existente"
      pattern: "getVereditoIAPorCampanha\\(\\)"
    - from: "src/components/campanha-list.tsx"
      to: "src/components/veredito-sugerido-chip.tsx"
      via: "import do componente já existente (zero visual novo)"
      pattern: "from \"@/components/veredito-sugerido-chip\""
    - from: "src/components/lead-table.tsx"
      to: "lead.contactAttempts"
      via: "render condicional > 0 dentro do wrapper de stopPropagation já existente"
      pattern: "lead\\.contactAttempts > 0"
---

<objective>
Tornar visíveis, nas LISTAS, dois dados que o CRM já tem e já calcula mas só mostra em telas de detalhe:

1. **Veredito na lista `/campanhas`** — hoje a linha da campanha mostra só o `CampanhaEstadoBadge`. O veredito sugerido pela IA (`getVereditoIAPorCampanha`, Fase 24) e o veredito final do operador (`campanhas.veredito_final`, Fase 24) só aparecem na página de detalhe (`VereditoSecao`) e no `/mapa-de-nichos`.
2. **Contador de tentativas na tabela `/leads`** — `lead.contactAttempts` já é renderizado no card do pipeline (`pipeline-lead-card.tsx`, D-05/D-06 da Fase 06-02) como `MessageCircle + {n}x` em cor neutra, mas a tabela de `/leads` mostra só o ícone de histórico, sem o número.

Purpose: eliminar cliques de navegação para informação que já existe — o operador vê o estado de decisão das campanhas e a intensidade de contato dos leads "de relance", que é o core value do produto.
Output: 3 arquivos alterados, zero arquivo novo, zero pacote novo, zero mudança de schema, zero mudança de comportamento de clique.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

@src/app/campanhas/page.tsx
@src/components/campanha-list.tsx
@src/components/lead-table.tsx

<interfaces>
<!-- Contratos já existentes no código. NÃO explorar a base atrás deles — estão aqui. -->

De `src/db/queries.ts` (Fase 24, plano 24-02) — REUSAR, não escrever query nova:
```typescript
// Sem argumento: devolve o mapa inteiro (uma consulta só, nunca 1 por campanha).
// Chave = campanhaId; valor = decisão da geração status='ok' MAIS RECENTE,
// revalidada por Zod (payload inválido simplesmente não entra no Map — D-24-08).
export async function getVereditoIAPorCampanha(
  campanhaId?: number
): Promise<Map<number, Diagnostico["veredito_sugerido"]["decisao"]>>;
```

De `src/components/veredito-sugerido-chip.tsx` (Fase 23-05) — REUSAR para os DOIS vereditos (D-24-05):
```typescript
export type VereditoDecisao = "aprofundar" | "mudar_angulo" | "abandonar";
export function VereditoSugeridoChip({ decisao }: { decisao: VereditoDecisao }): JSX.Element;
// Rótulos: Aprofundar / Mudar o ângulo / Abandonar
// Cores: escala semântica --status-* (success/warning/danger), light+dark já cobertos
```

De `src/types/index.ts` + `src/db/schema.ts` (Fase 24):
```typescript
export type Campanha = InferSelectModel<typeof campanhas>;
// inclui: vereditoFinal: "aprofundar" | "mudar_angulo" | "abandonar" | null
//         vereditoDecididoEm: Date | null
//         estado, nichoId, oferta, janelaInicio, janelaFim, ...
export type Lead = InferSelectModel<typeof leads>; // inclui contactAttempts: number
```

Precedente visual do contador (`src/components/pipeline-lead-card.tsx`, linhas 108-116) — ESPELHAR literalmente:
```tsx
{lead.contactAttempts > 0 ? (
  <span
    className="flex items-center gap-1"
    aria-label={`${lead.contactAttempts} tentativas de contato`}
  >
    <MessageCircle className="size-3.5" />
    {lead.contactAttempts}x
  </span>
) : null}
```
(o container pai do card é `text-[14px] leading-normal text-muted-foreground` — a cor neutra vem de lá, não do span)

Precedente de "veredito ausente" (`src/components/mapa-de-nichos-table.tsx`, linhas 262-282): chip quando existe, nada de chip quando não existe.
</interfaces>
</context>

<decisions>
- **D-01:** `page.tsx` passa o veredito da IA para `CampanhaList` como **objeto plano** (`Record<number, VereditoDecisao>` via `Object.fromEntries`), não como `Map`. `CampanhaList` é `"use client"` — objeto plano evita depender de serialização de `Map` na fronteira RSC.
- **D-02:** O veredito final NÃO precisa de prop nova — já vem dentro de `campanha.vereditoFinal` no array `campanhas` que `CampanhaList` já recebe.
- **D-03:** O `cell` da coluna `acoes` em `src/components/lead-table-columns.tsx` é **código morto de render** (verificado: `lead-table.tsx` não usa `flexRender`; o doc-comment do arquivo já declara isso desde a quick 260725-gzb). Este plano **NÃO** o altera — mexer lá não mudaria nada na tela e criaria divergência falsa.
- **D-04:** Sem `title`/tooltip novo inventado no chip — a desambiguação IA-vs-final é feita por um micro-rótulo textual (`IA` / `Final`) em `text-muted-foreground`, mesmo idioma de rótulo-fora-do-chip já usado pela `VereditoSecao`.
</decisions>

<tasks>

<task type="auto">
  <name>Task 1: Veredito (IA + final) na listagem /campanhas</name>
  <files>src/app/campanhas/page.tsx, src/components/campanha-list.tsx</files>
  <action>
Em `src/app/campanhas/page.tsx`: importar `getVereditoIAPorCampanha` de `@/db/queries` e adicioná-la como TERCEIRO item do `Promise.all` já existente (chamada SEM argumento — traz o mapa inteiro numa consulta só, mesmo idioma de `src/app/mapa-de-nichos/page.tsx`). NÃO criar query nova, NÃO chamar em loop por campanha, NÃO adicionar um segundo `await` sequencial. Converter o `Map` retornado em objeto plano com `Object.fromEntries(...)` (D-01) e passar para `<CampanhaList>` na prop nova `vereditoIAPorCampanha`. Manter a query de campanhas e a de nichos exatamente como estão.

Em `src/components/campanha-list.tsx`: adicionar ao `CampanhaListProps` a prop `vereditoIAPorCampanha: Record<number, VereditoDecisao>`; importar `VereditoSugeridoChip` e o tipo `VereditoDecisao` de `@/components/veredito-sugerido-chip` (D-04: reusar, não criar tratamento visual novo). Dentro do `.map` das campanhas, ler `const vereditoIA = vereditoIAPorCampanha[campanha.id]` e trocar o `<CampanhaEstadoBadge estado={campanha.estado} />` solto do lado direito do `<Link>` por um container `<div className="flex shrink-0 items-center gap-2">` contendo, nesta ordem: (1) o `CampanhaEstadoBadge` intacto; (2) se `vereditoIA` existir, um `<span className="flex items-center gap-1">` com um micro-rótulo `<span className="text-xs text-muted-foreground">IA</span>` seguido de `<VereditoSugeridoChip decisao={vereditoIA} />`; (3) se `campanha.vereditoFinal` existir (D-02), o mesmo par com micro-rótulo `Final` e `<VereditoSugeridoChip decisao={campanha.vereditoFinal} />`.

Quando não houver veredito nenhum, renderizar `null` para os dois blocos — nada de `—`, nada de chip vazio, nada de placeholder (a linha fica idêntica à de hoje). Não alterar o `href`, as classes do `<Link>`, o estado vazio, o botão "Nova campanha" nem o `CampanhaFormDialog`. Usar exclusivamente tokens existentes (`text-muted-foreground`, e as cores que o próprio chip já traz da escala `--status-*`) — zero cor literal, para não quebrar `verify:brand` nem o modo escuro.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run lint && npm run verify:brand && grep -v '^\s*[*/]' src/app/campanhas/page.tsx | grep -c 'getVereditoIAPorCampanha' && grep -v '^\s*[*/]' src/components/campanha-list.tsx | grep -c 'VereditoSugeridoChip'</automated>
  </verify>
  <done>`tsc --noEmit` limpo, `npm run lint` exit 0, `verify:brand` exit 0; `page.tsx` cita `getVereditoIAPorCampanha` (>= 2 ocorrências: import + chamada) e `campanha-list.tsx` cita `VereditoSugeridoChip` (>= 3: import + 2 usos). Uma campanha sem diagnóstico e sem veredito final renderiza a linha exatamente como antes.</done>
</task>

<task type="auto">
  <name>Task 2: Contador de tentativas de contato na tabela /leads</name>
  <files>src/components/lead-table.tsx</files>
  <action>
Em `src/components/lead-table.tsx`, dentro do `.map` das linhas, no `<div className={`flex items-center gap-1 ${COL.acoes}`}>` que já tem `onClick={(event) => event.stopPropagation()}` (o wrapper de ações), inserir o contador IMEDIATAMENTE ANTES do `<Button>` do ícone `History` — dentro do wrapper existente, nunca num wrapper irmão novo (precedente obrigatório da Fase 09-04, STATE.md).

Markup espelhando literalmente `pipeline-lead-card.tsx` (ver `<interfaces>`): render condicional `lead.contactAttempts > 0`, `<span className="flex items-center gap-1 text-[14px] leading-normal text-muted-foreground">` com `aria-label={`${lead.contactAttempts} tentativas de contato`}`, contendo `<MessageCircle className="size-3.5" />` e `{lead.contactAttempts}x`. A classe de cor entra no próprio span aqui (diferente do card, onde ela é herdada do container da meta-linha) — o resultado visual é o mesmo `text-muted-foreground`, que já tem par light/dark. `MessageCircle` JÁ está importado no arquivo (linha 14) — não duplicar o import.

Regras rígidas: (a) `contactAttempts === 0` renderiza `null` — nada de "0x"; (b) NÃO mexer em nenhum `onClick`, `aria-label` ou conteúdo dos 4 botões existentes (WhatsApp, History, Pencil, Trash2) — é surfacing visual, não interação nova; (c) NÃO alterar `COL.acoes` (`w-[300px]`) nem o cabeçalho da coluna; (d) NÃO tocar em `src/components/lead-table-columns.tsx` (D-03 — o `cell` de `acoes` de lá não é renderizado, `lead-table.tsx` não usa `flexRender`); (e) zero cor literal.
  </action>
  <verify>
    <automated>cd "C:/Users/Vencedor/Desktop/crm-leads" && npx tsc --noEmit && npm run lint && npm run verify:brand && grep -v '^\s*[*/]' src/components/lead-table.tsx | grep -c 'contactAttempts' && git diff --name-only | grep -c 'lead-table-columns.tsx' || true</automated>
  </verify>
  <done>`tsc --noEmit` limpo, `npm run lint` exit 0, `verify:brand` exit 0; `lead-table.tsx` cita `contactAttempts` (>= 3: guarda, aria-label e valor renderizado) e `lead-table-columns.tsx` NÃO aparece no `git diff --name-only` (contagem 0). Nenhum handler de botão da coluna Ações foi alterado (confirmar no `git diff` do arquivo: só linhas adicionadas no bloco do contador).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    (1) `/campanhas` agora mostra, em cada linha, o chip do veredito sugerido pela IA (rótulo "IA") e/ou o do veredito final registrado (rótulo "Final"), ao lado do badge de estado. (2) `/leads` agora mostra `{n}x` com ícone de balão ao lado do botão de histórico, para leads com tentativas de contato registradas.
  </what-built>
  <how-to-verify>
    1. `npm run dev` e abrir `http://localhost:3000/campanhas`.
    2. Conferir uma campanha SEM diagnóstico/veredito: a linha deve estar idêntica à de antes (só o badge de estado, sem "—" nem chip vazio).
    3. Conferir uma campanha COM diagnóstico gerado e/ou veredito registrado: os chips aparecem com os rótulos IA/Final, sem estourar a largura da linha.
    4. Clicar na linha: ainda navega para `/campanhas/{id}`.
    5. Abrir `http://localhost:3000/leads`: um lead com tentativas registradas mostra `{n}x` ao lado do ícone de histórico, com o MESMO visual do card em `/pipeline` (comparar as duas telas lado a lado); leads sem tentativas não mostram nada.
    6. Clicar nos botões WhatsApp / histórico / editar / excluir: comportamento inalterado, e clicar neles NÃO abre o modal de edição por baixo.
    7. Alternar para o modo ESCURO (toggle de tema) e repetir os passos 2, 3 e 5 — chips e contador legíveis, sem cor "apagada" ou invisível.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva o que ficou errado</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| DB → RSC → Client Component | `payload` de `diagnosticos` é dado gravado por LLM; já atravessa `diagnosticoSchema.safeParse` dentro de `getVereditoIAPorCampanha` (D-24-08) antes de virar uma das 3 decisões do enum |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-NZQ-01 | Tampering | payload de diagnóstico vindo do banco | mitigate | Reusar `getVereditoIAPorCampanha` (revalidação Zod já embutida) — proibido ler `diagnosticos.payload` direto na página/componente |
| T-NZQ-02 | Information disclosure | lista `/campanhas` | accept | App solo, sem multi-usuário; o dado exposto já é visível ao mesmo operador em `/campanhas/[id]` e `/mapa-de-nichos` |
| T-NZQ-SC | Tampering | supply chain | accept | Zero instalação de pacote nesta tarefa (sem npm install) — nada a auditar |
</threat_model>

<verification>
- `npx tsc --noEmit` limpo
- `npm run lint` exit 0
- `npm run verify:brand` exit 0 (nenhuma cor literal nova)
- `git diff --stat` toca EXATAMENTE 3 arquivos: `src/app/campanhas/page.tsx`, `src/components/campanha-list.tsx`, `src/components/lead-table.tsx`
- `npm run build` é opcional (host de 4GB RAM — se rodar e derrubar a máquina, documentar e seguir com tsc+lint, precedente 10-04)
</verification>

<success_criteria>
- Linha de `/campanhas` exibe chip(s) de veredito quando existem e nada quando não existem
- Contador `{n}x` em `/leads` visualmente idêntico ao do card de `/pipeline`, só quando `contactAttempts > 0`
- Nenhum handler de clique, rota ou query nova criada; nenhuma migração; nenhum pacote novo
- Light e dark mode corretos usando só tokens existentes
</success_criteria>

<output>
Criar `.planning/quick/260912-nzq-tornar-mais-vis-veis-2-coisas-que-j-exis/260912-nzq-SUMMARY.md` ao terminar
</output>
