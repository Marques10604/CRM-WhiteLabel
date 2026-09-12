---
phase: quick-260912-pzc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - src/components/ui/command.tsx
  - src/lib/busca-global.ts
  - scripts/test-busca-global.cjs
  - src/actions/busca-actions.ts
  - src/app/leads/page.tsx
  - src/components/lead-table.tsx
  - src/components/busca-global.tsx
  - src/components/app-sidebar.tsx
autonomous: false
requirements: [BUSCA-01, BUSCA-02, BUSCA-03, BUSCA-04, BUSCA-05, BUSCA-06]
user_setup: []

must_haves:
  truths:
    - "Apertar Ctrl+K (ou Cmd+K) em qualquer tela do app abre um diálogo de busca com o campo já focado, e o navegador NÃO executa o atalho nativo dele"
    - "Existe um gatilho clicável e visível no topo da sidebar, logo abaixo da marca SOLO, escrito 'Buscar...' com a dica do atalho — clicar abre exatamente o mesmo diálogo"
    - "Digitar pelo menos 2 caracteres traz resultados agrupados em até 3 seções rotuladas: Leads, Campanhas e Nichos"
    - "Um lead é encontrado tanto pelo nome quanto pelo telefone, e o telefone é encontrado mesmo se o usuário digitar só os dígitos de um número gravado formatado como (11) 98765-4321"
    - "Lead, campanha ou nicho removido (soft-delete) NUNCA aparece nos resultados"
    - "Selecionar um lead navega para /leads já filtrado por aquele nome; selecionar uma campanha navega para /campanhas/{id}; selecionar um nicho navega para /nichos"
    - "Cada grupo mostra no máximo 5 resultados"
    - "Digitar um termo sem nenhum resultado mostra uma mensagem de vazio, não uma lista quebrada nem um erro"
    - "O diálogo é legível em tema claro E escuro, sem nenhuma cor hardcoded (verify:brand sai 0)"
    - "Os 5 atributos data-tour e os 4 grupos rotulados da sidebar continuam exatamente como estavam (verify:sidebar sai 0)"
    - "Zero coluna, zero tabela e zero migração: a busca só lê o que já existe"
  artifacts:
    - path: "src/lib/busca-global.ts"
      provides: "Módulo puro: normalização do termo, gate de tamanho mínimo, escape de curinga LIKE e extração de dígitos do telefone"
      exports: ["TAMANHO_MINIMO_BUSCA", "LIMITE_POR_GRUPO", "normalizarTermo", "deveBuscar", "escaparLike", "padraoContem", "somenteDigitos", "deveBuscarPorTelefone"]
      min_lines: 50
    - path: "scripts/test-busca-global.cjs"
      provides: "Harness Node puro das funções do módulo de busca (sem DOM, sem banco)"
      contains: "escaparLike"
      min_lines: 60
    - path: "src/components/ui/command.tsx"
      provides: "Primitivo Command do shadcn/ui (preset base-nova, sobre cmdk) adaptado aos aliases do projeto"
      exports: ["Command", "CommandDialog", "CommandInput", "CommandList", "CommandEmpty", "CommandGroup", "CommandItem", "CommandSeparator", "CommandShortcut"]
      min_lines: 120
    - path: "src/actions/busca-actions.ts"
      provides: "Server Action única buscarGlobal(termo) com as 3 consultas soft-delete-aware"
      exports: ["buscarGlobal", "ResultadoBusca"]
      min_lines: 80
    - path: "src/components/busca-global.tsx"
      provides: "Componente cliente: gatilho da sidebar + listener global Ctrl/Cmd+K + diálogo cmdk + navegação"
      exports: ["BuscaGlobal"]
      min_lines: 100
    - path: "src/components/app-sidebar.tsx"
      provides: "Ponto de montagem único do <BuscaGlobal /> (abaixo da marca, acima do rótulo PRINCIPAL)"
      contains: "BuscaGlobal"
    - path: "src/app/leads/page.tsx"
      provides: "Leitura do searchParam `busca` e repasse como filtro inicial da tabela"
      contains: "searchParams"
  key_links:
    - from: "src/components/busca-global.tsx"
      to: "src/actions/busca-actions.ts"
      via: "chamada da Server Action dentro de startTransition, com debounce manual"
      pattern: "buscarGlobal"
    - from: "src/actions/busca-actions.ts"
      to: "src/lib/busca-global.ts"
      via: "import das funções puras de gate/escape"
      pattern: "@/lib/busca-global"
    - from: "src/components/app-sidebar.tsx"
      to: "src/components/busca-global.tsx"
      via: "render do <BuscaGlobal /> no topo da aside"
      pattern: "<BuscaGlobal"
    - from: "src/components/busca-global.tsx"
      to: "src/app/leads/page.tsx"
      via: "router.push com o query param `busca`"
      pattern: "/leads\\?busca="
    - from: "src/app/leads/page.tsx"
      to: "src/components/lead-table.tsx"
      via: "prop buscaInicial semeando o columnFilter da coluna nome"
      pattern: "buscaInicial"
---

<objective>
Adicionar busca global ao CRM: um diálogo estilo paleta de comandos, aberto por **Ctrl+K / Cmd+K de qualquer tela** ou por um gatilho clicável no topo da sidebar, que busca em três lugares ao mesmo tempo — **leads** (nome e telefone), **campanhas** (nome do nicho e oferta) e **nichos** (nome) — mostra os resultados agrupados por tipo e leva direto para a tela certa.

Purpose: hoje, achar um lead específico exige ir em `/leads` e caçar na tabela paginada de 25 linhas por vez (a toolbar filtra por nicho, etapa e data — **não por nome nem por telefone**). Quando o WhatsApp toca e o nome aparece na tela, o admin precisa do lead em 2 segundos, não de 4 cliques. Esta é a lacuna de navegação mais barata de fechar do CRM inteiro.

Output: `cmdk` instalado (com portão humano de legitimidade), o primitivo `ui/command.tsx`, um módulo puro coberto por harness, uma Server Action de busca, o componente cliente da busca montado na sidebar, e o deep-link `/leads?busca=` que faz a seleção de lead cair numa lista já filtrada. Zero mudança de schema.
</objective>

<execution_context>
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Vencedor/Desktop/crm-leads/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/phases/25-tour-guiado-do-crm/25-01-PLAN.md
@src/components/app-sidebar.tsx
@src/components/ui/dialog.tsx
@src/components/ui/input-group.tsx
@src/actions/nicho-actions.ts
@src/lib/busca-global.ts
@src/lib/lead-csv-export.ts
@scripts/test-lead-csv-export.cjs
@package.json
</context>

<decisoes_travadas>
Decisões vindas do usuário/orquestrador. NÃO re-litigar nenhuma delas.

- **D-01** — O usuário JÁ aprovou instalar `cmdk` (~15kb, dependência oficial do item `command` do shadcn/ui), depois de ser confrontado com o tradeoff "zero pacote novo". A escolha do pacote está fechada. O que continua obrigatório é o **portão de legitimidade de cadeia de suprimentos** (Task 1), espelhando o precedente do `react-joyride` no `25-01-PLAN.md` — aprovar o pacote não é o mesmo que dispensar a checagem de que o pacote é o pacote.
- **D-02** — Escopo da busca: **leads** por `nome` e `telefone`; **campanhas** pelo nome do nicho e pelo texto da `oferta`; **nichos** por `nome`. Nos três casos, soft-deletados ficam de fora (`isNull(deletedAt)`).
- **D-03** — Resultados agrupados em 3 seções (Leads / Campanhas / Nichos), até ~5 por grupo, cada item navegando para a tela certa.
- **D-04** — Uma única Server Action `buscarGlobal(termo)`. Sem biblioteca de debounce, sem biblioteca de query-string. Debounce manual com `setTimeout`/`clearTimeout` dentro de `useEffect`.
- **D-05** — Atalho global Ctrl+K (Windows/Linux) **e** Cmd+K (Mac), com `event.preventDefault()` para não deixar o navegador executar o atalho nativo dele.
- **D-06** — Gatilho visível e clicável perto do topo da sidebar, com texto "Buscar..." e dica do atalho, reusando tokens de texto/cor que a sidebar já usa.
- **D-07** — Claro e escuro, só com tokens existentes. Nenhuma cor hardcoded (`verify:brand` tem que sair 0).
- **D-08** — Zero mudança de schema, zero tabela nova, zero migração. Busca é 100% leitura.
- **D-09** — Os `data-tour="nav-*"` e os 4 grupos rotulados da sidebar (Fase 25 + quick 260912-nmw) sobrevivem INTACTOS. Só se ADICIONA um elemento; nada é reestruturado.
</decisoes_travadas>

<desvios_deliberados>
Dois pontos onde este plano se afasta da sugestão que veio junto do pedido. Os dois são **aditivos** (entregam mais, não menos) e estão aqui explicitados para o revisor poder vetar antes da execução.

**DESVIO-1 — Ponto de montagem: dentro de `AppSidebar`, não como irmão em `layout.tsx`.**
A sugestão original era montar o componente de busca em `src/app/layout.tsx`, irmão de `<AppSidebar />` e `<TourGuiado />`. Mas o requisito D-06 exige um gatilho DENTRO da sidebar que abre o MESMO diálogo do atalho de teclado. Com o diálogo no layout e o botão na sidebar, o estado `open` teria que ser compartilhado entre dois componentes irmãos — exigindo um Context novo (ou um store) só para isso.
`AppSidebar` já é `"use client"` e já é montado **exatamente uma vez**, no layout raiz, em todas as rotas. Montar `<BuscaGlobal />` dentro dela mantém gatilho + listener + diálogo num único componente, com zero provider novo, e o listener continua sendo global (`window.addEventListener`). `layout.tsx` fica **intocado**.

**DESVIO-2 — Selecionar um lead leva a `/leads?busca=<nome>`, não a lugar nenhum.**
Confirmado por leitura das rotas reais: **não existe** `/leads/{id}` (as rotas são `/leads`, `/pipeline`, `/campanhas`, `/campanhas/[id]`, `/nichos`, `/mapa-de-nichos`, `/relatorios`, `/templates`, `/importar`, `/importar/[batchId]`, `/motivos-perda`, `/configuracoes`, `/lixeira`, `/`). E a toolbar de `/leads` filtra por nicho, etapa e intervalo de follow-up — **não tem filtro por nome**.
"Navegar para `/leads` e não fazer mais nada" devolveria o usuário para a mesma tabela paginada de onde ele queria escapar — resultado inútil. Por isso este plano fecha a ponta: `/leads` passa a aceitar `?busca=`, e a `LeadTable` semeia o filtro da coluna `nome` com esse valor. Custo real: ~10 linhas em 2 arquivos, aproveitando o `columnFilters` que a tabela **já** tem e o `filterFn` default `includesString` da coluna `nome`. Sem isso, BUSCA-05 ficaria entregue pela metade para o grupo mais importante dos três.
</desvios_deliberados>

<interfaces>
Contratos que este plano cria, na ordem em que são consumidos. O executor NÃO precisa explorar o codebase para descobri-los.

**`src/lib/busca-global.ts`** (Task 2 — módulo puro, sem DOM, sem banco, sem React):
- `TAMANHO_MINIMO_BUSCA: number` — vale `2`
- `LIMITE_POR_GRUPO: number` — vale `5`
- `normalizarTermo(bruto: string): string` — `trim()` + colapsa espaços internos repetidos em um só
- `deveBuscar(bruto: string): boolean` — `normalizarTermo(bruto).length >= TAMANHO_MINIMO_BUSCA`
- `escaparLike(termo: string): string` — escapa `\`, `%` e `_` com contrabarra (a contrabarra PRIMEIRO, senão as escapadas depois são re-escapadas)
- `padraoContem(termo: string): string` — `` `%${escaparLike(normalizarTermo(termo).toLowerCase())}%` ``
- `somenteDigitos(bruto: string): string` — `bruto.replace(/\D/g, "")`
- `deveBuscarPorTelefone(bruto: string): boolean` — `somenteDigitos(bruto).length >= TAMANHO_MINIMO_BUSCA`

**`src/actions/busca-actions.ts`** (Task 3):
- `export type ResultadoBusca = { leads: { id: number; nome: string; telefone: string; stage: string }[]; campanhas: { id: number; nichoNome: string; oferta: string }[]; nichos: { id: number; nome: string }[] }`
- `export async function buscarGlobal(termo: string): Promise<ResultadoBusca>` — termo curto/vazio devolve os três arrays vazios, nunca `throw`

**`src/components/lead-table.tsx`** (Task 3) — prop nova, opcional, retrocompatível:
- `buscaInicial?: string` — quando presente, semeia `columnFilters` com `[{ id: "nome", value: buscaInicial }]`

**`src/components/busca-global.tsx`** (Task 4):
- `export function BuscaGlobal(): JSX.Element` — sem props. Renderiza o botão-gatilho E o diálogo; registra o listener global.

**Primitivo `src/components/ui/command.tsx`** (Task 2) — exporta `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`.
</interfaces>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 1: Portão humano de legitimidade do pacote cmdk</name>
  <read_first>
    - .planning/phases/25-tour-guiado-do-crm/25-01-PLAN.md (Task 1 — molde EXATO deste portão: mesma estrutura, mesma coleta de evidência, mesma regra de não-auto-aprovação)
    - package.json (confirmar que `cmdk` ainda não está na árvore e que nenhum pacote `@radix-ui/*` existe hoje)
  </read_first>
  <files>nenhum arquivo é modificado nesta task (portão de aprovação, somente leitura)</files>
  <action>NÃO instalar nada ainda. Rodar a coleta automatizada de evidência (`npm view cmdk ...`), apresentar ao humano junto com o resumo abaixo, e PARAR aguardando aprovação explícita. Este portão NÃO é auto-aprovável por `mode: yolo` nem por `workflow.auto_advance` — é portão de cadeia de suprimentos, mesma disciplina do `react-joyride` no plano 25-01 (o `slopcheck` não roda neste host, sem `pip` no PATH, então todo pacote novo entra como `[ASSUMED]` e exige confirmação humana). Sem a palavra de aprovação, nenhuma task seguinte roda.</action>
  <what-built>
    Nada ainda — este passo vem ANTES do `npm install`. O usuário já decidiu QUE quer o `cmdk` (D-01); o que falta é confirmar que o pacote publicado é o pacote legítimo.

    Evidência já levantada no planejamento (2026-09-12, reconfirme o que quiser):
    - Pacote: `cmdk`, versão alvo **1.1.1** (é a `latest`; 39 versões publicadas)
    - Primeira publicação em **2020-10-08**; última modificação do registro em 2025-08-27 (~6 anos de histórico)
    - **30.168.057 downloads/semana** (API oficial do npm, janela 2026-09-05..11)
    - Repositório: `github.com/pacocoursey/cmdk`; mantenedores no npm: `paco`, `dipnpm`
    - Licença **MIT**; `scripts.postinstall` **vazio** (sem script de pós-instalação)
    - `peerDependencies`: react `^18 || ^19`, react-dom `^18 || ^19` — compatível com o react 19.2.7 do projeto
    - É a dependência declarada do PRÓPRIO item `command` do registro shadcn/ui no preset deste projeto: `https://ui.shadcn.com/r/styles/base-nova/command.json` lista `"dependencies": ["cn", "cmdk"]`

    **Ponto que o humano PRECISA saber antes de aprovar (não é bloqueio, é transparência):**
    `cmdk@1.1.1` traz 4 dependências transitivas do **Radix UI**: `@radix-ui/react-id`, `@radix-ui/react-dialog`, `@radix-ui/react-primitive`, `@radix-ui/react-compose-refs`. Este projeto é **Base UI** (`components.json` → `style: "base-nova"`) e hoje **não tem nenhum Radix** na árvore. Aprovar o `cmdk` significa aceitar o Radix como dependência transitiva. Elas são pacotes de primeira linha do ecossistema (mesma org que o shadcn/ui original), não código obscuro — mas é uma família nova entrando na árvore, e o `CommandDialog` que vamos usar renderiza sobre o **nosso** `ui/dialog.tsx` (Base UI), não sobre o dialog do Radix; o Radix entra só como peso de `node_modules`.
  </what-built>
  <how-to-verify>
    1. Abrir https://www.npmjs.com/package/cmdk e confirmar: nome exato `cmdk` (sem letra trocada / sem sufixo tipo `cmdk-js`), versão mais recente `1.1.1`, licença MIT, link de repositório apontando para `github.com/pacocoursey/cmdk`.
    2. Confirmar na página do npm que os downloads semanais estão na casa das DEZENAS DE MILHÕES (não centenas/milhares — sinal clássico de pacote-imitação recém-publicado).
    3. Abrir https://github.com/pacocoursey/cmdk e confirmar que o repositório existe, tem histórico longo e é do autor `pacocoursey`.
    4. Decidir conscientemente sobre as 4 dependências transitivas do Radix descritas acima.
  </how-to-verify>
  <acceptance_criteria>
    - O humano respondeu explicitamente aprovando ou reprovando o `npm install cmdk@1.1.1`.
    - Se reprovado: a execução PARA aqui e o motivo é registrado no SUMMARY. Nenhuma task seguinte roda — não existe plano B de pacote neste escopo (o item `command` do shadcn/ui no preset `base-nova` é, por construção, cmdk).
  </acceptance_criteria>
  <verify>
    <automated>npm view cmdk version license repository.url scripts.postinstall peerDependencies dependencies</automated>
    <human-check>Resposta humana explícita de aprovação registrada antes da Task 2 rodar.</human-check>
  </verify>
  <done>Aprovação humana (ou recusa) registrada no SUMMARY. Só com aprovação a Task 2 executa.</done>
  <resume-signal>Digite "aprovado" para liberar o `npm install cmdk@1.1.1`, ou descreva o problema encontrado.</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Instalar cmdk, criar o primitivo ui/command.tsx e o módulo puro de busca + harness</name>
  <files>package.json, package-lock.json, src/components/ui/command.tsx, src/lib/busca-global.ts, scripts/test-busca-global.cjs</files>
  <read_first>
    - src/components/ui/dialog.tsx (exports reais: `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle` — é sobre eles que o `CommandDialog` monta)
    - src/components/ui/input-group.tsx (exports reais: `InputGroup`, `InputGroupAddon`, ... — o `CommandInput` do registro usa os dois primeiros)
    - src/lib/lead-csv-export.ts (linhas 1-19: molde do cabeçalho JSDoc explicando POR QUE o módulo é puro)
    - scripts/test-lead-csv-export.cjs (o esqueleto do harness: `register("./ts-alias-loader.mjs", ...)`, helper `check()`, import dinâmico, códigos de saída)
    - package.json (bloco `scripts`, convenção `test:*`)
  </read_first>
  <behavior>
    Comportamento do módulo puro `src/lib/busca-global.ts`, a ser coberto pelo harness ANTES de qualquer UI existir:
    - `TAMANHO_MINIMO_BUSCA === 2` e `LIMITE_POR_GRUPO === 5`
    - `normalizarTermo("  ana   maria  ") === "ana maria"` (trim + colapso de espaços internos)
    - `deveBuscar("")`, `deveBuscar("a")` e `deveBuscar("   a   ")` → `false`
    - `deveBuscar("an")` e `deveBuscar(" ana ")` → `true`
    - `escaparLike("ana") === "ana"` (termo comum passa intacto)
    - `escaparLike("100%") === "100\\%"` e `escaparLike("a_b") === "a\\_b"`
    - `escaparLike("c\\d") === "c\\\\d"` (a contrabarra é escapada)
    - `escaparLike("%\\_")` produz exatamente `"\\%\\\\\\_"` — prova de que a contrabarra é tratada PRIMEIRO e as escapadas seguintes não são re-escapadas
    - `padraoContem("Ana") === "%ana%"` (minúsculo + envelopado em `%`)
    - `padraoContem("50%") === "%50\\%%"` (o `%` DIGITADO pelo usuário vira literal; só os `%` de envelope são curinga)
    - `somenteDigitos("(11) 98765-4321") === "11987654321"` e `somenteDigitos("ana") === ""`
    - `deveBuscarPorTelefone("ana") === false`; `deveBuscarPorTelefone("11") === true`; `deveBuscarPorTelefone("(1)") === false`
  </behavior>
  <action>
    **Parte A — instalar o pacote.** Rodar `npm install cmdk@1.1.1` (versão exata aprovada na Task 1). Não usar `@latest`, não usar range `^`: pinar `1.1.1` no `package.json`, mesmo idioma dos pins exatos já usados neste projeto para `react-joyride@3.2.0`, `ai@7.0.93` e `@ai-sdk/anthropic@4.0.49`.

    **Parte B — criar `src/components/ui/command.tsx`.** Tentar primeiro `npx shadcn add command` (o projeto tem `shadcn@^4.13.1` como devDependency). Se a CLI falhar por falta de memória — precedente REAL deste host, documentado no STATE.md para `npx shadcn add popover` na Fase 01 —, cair para o caminho manual, que é determinístico: baixar `https://ui.shadcn.com/r/styles/base-nova/command.json` (JSON com o campo `files[0].content`, verificado no planejamento, HTTP 200) e escrever o conteúdo à mão em `src/components/ui/command.tsx`, aplicando estas 4 adaptações obrigatórias de import (o conteúdo do registro usa caminhos internos do site do shadcn que NÃO existem aqui):
    1. `import { cn } from "cn"` → `import { cn } from "@/lib/utils"`
    2. `@/registry/base-nova/ui/dialog` → `@/components/ui/dialog`
    3. `@/registry/base-nova/ui/input-group` → `@/components/ui/input-group`
    4. O componente `IconPlaceholder` (importado de `@/app/(create)/components/icon-placeholder`, que só existe no site do shadcn) → substituir pelo ícone `SearchIcon` de `lucide-react`, preservando as classes `size-4 shrink-0 opacity-50` que estavam nele. Remover o import do `IconPlaceholder`.

    **Desvio deliberado e obrigatório dentro do primitivo:** o `CommandDialog` do registro renderiza o `<DialogHeader className="sr-only">` (com `DialogTitle`/`DialogDescription`) como IRMÃO do `<DialogContent>`, não como filho. Isso é escrito para o Dialog do Radix. Com o Base UI deste projeto, o `DialogContent` é um `Dialog.Popup` dentro de um `Portal` — um filho de `Dialog.Root` que fica FORA do popup não é portalizado junto e o `aria-labelledby` do popup não resolve. **Mover o `<DialogHeader className="sr-only">` para DENTRO do `<DialogContent>`, como primeiro filho**, antes de `{children}`. Registrar isso como decisão D-PZC-01 no SUMMARY.

    Depois de escrever o arquivo, ABRIR o resultado e anotar no SUMMARY a resposta a UMA pergunta que a Task 4 depende: **o `CommandDialog` embrulha os filhos num `<Command>` por dentro, ou o consumidor precisa renderizar o `<Command>` explicitamente?** (No conteúdo do registro consultado em 2026-09-12 ele NÃO embrulha — só renderiza `<DialogContent>{children}</DialogContent>` —, então o consumidor é quem põe o `<Command>`. Confirmar contra o arquivo real gerado, não contra esta nota.)

    **Parte C — módulo puro `src/lib/busca-global.ts`** com as 8 exportações do bloco `<interfaces>`, com as assinaturas exatas ali descritas. Ponto central de desenho: este módulo NÃO importa drizzle, NÃO importa React, NÃO toca `window` e NÃO conhece nome de tabela — é só normalização de texto. É isso que permite ao harness `.cjs` rodar sob Node puro, sem banco e sem DOM (host de 4GB, sem framework de teste no projeto).
    A ordem dentro de `escaparLike` é a parte que quebra silenciosamente se for escrita no impulso: escapar `\` PRIMEIRO, depois `%` e `_`. Se `%` for escapado antes, a contrabarra recém-inserida é escapada de novo no passo seguinte e o padrão vira lixo. Deixar isso explícito num comentário de uma linha em cima do código.
    Cabeçalho JSDoc no molde de `src/lib/lead-csv-export.ts`: explicar que o módulo é puro, citar BUSCA-03/BUSCA-04 e o harness que o cobre, e registrar a disposição da ameaça T-PZC-01 (o escape de curinga existe para que `%` digitado pelo usuário seja tratado como texto literal, nunca como curinga que varreria a tabela inteira).

    **Parte D — harness `scripts/test-busca-global.cjs`** copiando o esqueleto de `scripts/test-lead-csv-export.cjs` (shebang, `"use strict"`, `register("./ts-alias-loader.mjs", ...)`, helper `check()`, import dinâmico de `@/lib/busca-global`, saída 1 em falha e 0 em sucesso). Asserções: no mínimo as 15 do bloco `<behavior>` acima. Registrar `"test:busca-global": "node scripts/test-busca-global.cjs"` no bloco `scripts` do `package.json`, junto dos outros `test:*`.

    **Prova de mutação** (mesma disciplina das Fases 8/12/19/25): depois do harness passar, inverter temporariamente a ORDEM dos escapes em `escaparLike` (fazer `%` antes de `\`) e confirmar que o harness FALHA; restaurar em seguida e confirmar que volta a passar. Registrar as duas saídas no SUMMARY. Mutar sempre o arquivo real e restaurar na MESMA ação — nunca deixar o arquivo mutado em disco ao terminar.
  </action>
  <acceptance_criteria>
    - `npm ls cmdk` mostra `cmdk@1.1.1` sem `UNMET`/`invalid`.
    - `grep -c '"cmdk": "1.1.1"' package.json` retorna 1 (pin exato, sem `^` nem `~`).
    - `grep -c 'registry/base-nova\|from "cn"\|IconPlaceholder' src/components/ui/command.tsx` retorna 0 — nenhum caminho interno do site do shadcn sobreviveu.
    - `grep -c 'from "cmdk"' src/components/ui/command.tsx` retorna 1.
    - `grep -v '^ \*' src/components/ui/command.tsx | grep -c 'export' ` ≥ 1 e o bloco `export {` lista os 9 nomes do bloco `<artifacts>`.
    - `npm run test:busca-global` sai 0 e imprime ao menos 15 linhas começando com `OK `.
    - `grep -c 'window\.\|document\.\|drizzle' src/lib/busca-global.ts` retorna 0 — módulo puro de verdade.
    - `npx tsc --noEmit` sai 0 e `npm run lint` sai 0.
    - `npm run verify:brand` sai 0 — o `command.tsx` do registro usa só tokens (`bg-popover`, `text-foreground`, `border-input/30`, ...); se alguma classe de escala nomeada/neutra vier junto, ela é trocada por token AQUI, não depois.
    - Prova de mutação registrada no SUMMARY: com a ordem dos escapes invertida o harness sai 1; restaurado, sai 0.
    - SUMMARY responde: o `CommandDialog` embrulha os filhos num `<Command>` ou não.
  </acceptance_criteria>
  <verify>
    <automated>npm ls cmdk && npm run test:busca-global && npx tsc --noEmit && npm run lint && npm run verify:brand</automated>
  </verify>
  <done>`cmdk@1.1.1` pinado e instalado; `ui/command.tsx` existe adaptado aos aliases do projeto e compilando; `src/lib/busca-global.ts` existe com as 8 exportações puras cobertas por 15+ asserções automatizadas e mutação provada.</done>
</task>

<task type="auto">
  <name>Task 3: Server Action buscarGlobal + destino real da seleção de lead (/leads?busca=)</name>
  <files>src/actions/busca-actions.ts, src/app/leads/page.tsx, src/components/lead-table.tsx</files>
  <read_first>
    - src/actions/nicho-actions.ts (linhas 1-8 e 43-47: convenção de `"use server"`, imports do drizzle, uso de `sql` template e de `isNull(deletedAt)`)
    - src/db/schema.ts (linhas 19-31 `nichos`, 123-155 `campanhas`, 230-290 `leads` — nomes reais das colunas; atenção: a tabela física de nicho é `"subnichos"` e a FK do lead é a coluna física `subnicho_id`, mas no código são `nichos` / `leads.nichoId`)
    - src/app/relatorios/page.tsx (linhas 30-50: idioma REAL deste projeto para `searchParams: Promise<...>` + helper `primeiro()` que normaliza `string | string[] | undefined`)
    - src/app/leads/page.tsx (a página inteira — 60 linhas)
    - src/components/lead-table.tsx (linhas 108-175: onde `columnFilters` nasce e onde a `table` é montada)
    - src/components/lead-table-columns.tsx (a coluna `nome` é um `accessorKey` SEM `filterFn` próprio — cai no filtro default `includesString`, que é "contém, sem diferenciar maiúscula"; é exatamente o que precisamos, não adicionar `filterFn` nenhum)
  </read_first>
  <action>
    **Parte A — `src/actions/busca-actions.ts`**, arquivo novo com `"use server"` no topo, exportando o tipo `ResultadoBusca` e a função `buscarGlobal` com as assinaturas EXATAS do bloco `<interfaces>`.

    Primeira linha do corpo é o portão: se `!deveBuscar(termo)`, devolver `{ leads: [], campanhas: [], nichos: [] }` imediatamente, sem tocar no banco. Nunca `throw` — esta ação é chamada a cada digitação e uma exceção estouraria a UI inteira.

    As três consultas rodam num único `Promise.all`, cada uma com `.limit(LIMITE_POR_GRUPO)` e cada uma com `isNull(<tabela>.deletedAt)` no `and(...)` (D-02 — soft-deletado nunca aparece):

    1. **Leads** — `or()` de duas condições: (a) nome contendo o termo, via `sql` template comparando `lower(leads.nome)` com o `padraoContem(termo)` usando `LIKE ... ESCAPE '\'`; (b) telefone, SOMENTE quando `deveBuscarPorTelefone(termo)` for verdadeiro — comparando o telefone com a formatação removida em SQL (encadeamento de `replace()` do SQLite tirando `(`, `)`, `-`, espaço e `+`) contra `%<somenteDigitos(termo)>%`. Quando `deveBuscarPorTelefone` é falso, passar `undefined` como segundo operando do `or()` — o `and`/`or` do Drizzle descarta operandos `undefined`, então não é preciso montar o array condicionalmente. Selecionar só `id`, `nome`, `telefone`, `stage`. Ordenar por `asc(leads.nome)`.
    2. **Campanhas** — `innerJoin` com `nichos` em `campanhas.nichoId`, `or()` entre nome do nicho contendo o termo e `campanhas.oferta` contendo o termo (mesmo idioma `lower(...) LIKE ... ESCAPE '\'`). Selecionar `campanhas.id`, `nichos.nome` como `nichoNome`, `campanhas.oferta`. Ordenar por `desc(campanhas.createdAt)`. Filtrar `isNull(campanhas.deletedAt)`.
    3. **Nichos** — nome contendo o termo, `isNull(nichos.deletedAt)`, selecionar `id` e `nome`, ordenar por `asc(nichos.nome)`.

    **Invariante de segurança inegociável (T-PZC-01):** o termo do usuário entra SEMPRE como valor interpolado no template `sql` do Drizzle (que vira parâmetro bindado), NUNCA por concatenação de string dentro do SQL. Deixar isso escrito no JSDoc do módulo. O `ESCAPE '\'` acompanha obrigatoriamente todo `LIKE` que usa `padraoContem`, senão o escape do módulo puro vira decoração inútil.

    Documentar no JSDoc a limitação conhecida e ACEITA: `LIKE`/`lower()` do SQLite são case-insensitive apenas para ASCII — "joão" e "JOÃO" não se encontram. Não resolver aqui (exigiria coluna normalizada ou extensão ICU, ou seja, mudança de schema, vetada por D-08). Nenhuma chamada a `revalidatePath` nesta ação: ela não muda nada.

    **Parte B — `/leads?busca=`** (DESVIO-2 do bloco `<desvios_deliberados>`). Em `src/app/leads/page.tsx`: receber `searchParams: Promise<Record<string, string | string[] | undefined>>` na assinatura da página, `await` nele, e normalizar o param `busca` com o mesmo helper `primeiro()` que `/relatorios` usa (copiar a função local; não criar módulo compartilhado para 3 linhas). Repassar o valor como `buscaInicial` para `<LeadTable>`. Sem `busca` na URL, nada muda em absolutamente nada do comportamento atual.

    **Parte C — `src/components/lead-table.tsx`:** adicionar a prop opcional `buscaInicial?: string` ao `LeadTableProps` (documentada com uma linha explicando que vem do deep-link da busca global) e usá-la como valor INICIAL do `useState` de `columnFilters`: `buscaInicial ? [{ id: "nome", value: buscaInicial }] : []`. É valor inicial, não estado controlado — o usuário pode limpar/trocar o filtro normalmente depois. NÃO adicionar `filterFn` na coluna `nome` (o default `includesString` já faz "contém, case-insensitive") e NÃO mexer em mais nada da tabela.
  </action>
  <acceptance_criteria>
    - `grep -c 'isNull' src/actions/busca-actions.ts` retorna ao menos 3 — as três consultas filtram soft-delete.
    - `grep -c "ESCAPE" src/actions/busca-actions.ts` retorna ao menos 3 — todo `LIKE` de termo tem cláusula de escape.
    - `grep -c 'padraoContem\|deveBuscar\|somenteDigitos\|LIMITE_POR_GRUPO' src/actions/busca-actions.ts` ≥ 4 — a ação consome o módulo puro em vez de reimplementar a normalização.
    - `grep -v '^ \*' src/actions/busca-actions.ts | grep -c 'revalidatePath'` retorna 0 — ação de leitura pura.
    - `grep -c 'limit(' src/actions/busca-actions.ts` retorna 3 — os três grupos são limitados.
    - `grep -c 'buscaInicial' src/app/leads/page.tsx` ≥ 1 e `grep -c 'buscaInicial' src/components/lead-table.tsx` ≥ 2.
    - `npx tsc --noEmit` sai 0 e `npm run lint` sai 0.
    - `npm run guard:no-hard-delete` sai 0 (o arquivo novo não introduz `DELETE FROM`/`.delete()`).
    - `npm run verify:schema` sai 0 — prova mecânica de D-08: nenhuma coluna/tabela mudou.
    - Verificação manual em runtime, com o dev server já rodando: abrir `/leads?busca=<um pedaço de nome que existe no banco>` e confirmar que a tabela vem já filtrada; abrir `/leads` sem param e confirmar que a lista completa aparece como antes.
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit && npm run lint && npm run verify:schema && npm run guard:no-hard-delete</automated>
  </verify>
  <done>`buscarGlobal` existe, consome o módulo puro, filtra soft-deletados nos 3 grupos, limita a 5 por grupo e nunca lança; `/leads` aceita `?busca=` e a `LeadTable` nasce filtrada por ele sem regressão no caminho sem param.</done>
</task>

<task type="auto">
  <name>Task 4: Componente cliente da busca (atalho Ctrl/Cmd+K + diálogo + gatilho na sidebar)</name>
  <files>src/components/busca-global.tsx, src/components/app-sidebar.tsx</files>
  <read_first>
    - src/components/ui/command.tsx (o arquivo REAL gerado na Task 2 — confirmar se `CommandDialog` embrulha os filhos num `<Command>` ou não, e quais props ele repassa)
    - src/components/tour-guiado.tsx (molde do componente cliente montado uma vez: guard de montagem com `useEffect`, `eslint-disable-next-line react-hooks/set-state-in-effect` documentado — mesmo falso-positivo do React Compiler já aceito no projeto, STATE.md decisão 07-02)
    - src/components/nicho-combobox.tsx (linhas 60-105: idioma REAL de chamar Server Action de dentro de componente cliente — `useTransition` + `startTransition(async () => { const result = await acao(...) })`)
    - src/components/app-sidebar.tsx (linhas 95-115: a `<aside>`, o bloco da marca e o começo da `<nav>` — o ponto de inserção é ENTRE os dois)
    - src/app/globals.css (linhas 13-20 e 100-107: os tokens `--color-sidebar-*` disponíveis, definidos em `:root` E em `.dark`)
  </read_first>
  <action>
    **Parte A — `src/components/busca-global.tsx`**, componente cliente novo (`"use client"`), exportando `BuscaGlobal` sem props. Ele é dono de TRÊS coisas: o botão-gatilho, o listener global de teclado e o diálogo.

    Estado: `open` (booleano), `termo` (string) e `resultado` (`ResultadoBusca`, inicializado com os três arrays vazios), mais `useTransition` para o pendente.

    **Atalho (D-05):** um `useEffect` sem dependências registrando `window.addEventListener("keydown", handler)` e removendo no cleanup. O handler abre o diálogo quando `event.key` for `"k"` (comparar em minúsculo — com Shift o `key` vem `"K"`) E (`event.ctrlKey` OU `event.metaKey`), chamando `event.preventDefault()` ANTES de mexer no estado (senão o Chrome/Firefox no Windows rouba o atalho para a barra de busca/bookmark). Fazer o atalho alternar (`setOpen((v) => !v)`) para que a segunda batida feche. Confirmado por grep no planejamento: **não existe nenhum outro `addEventListener` em `src/`** — zero risco de conflito com listener existente.

    **Debounce manual (D-04):** um `useEffect` dependente de `termo`. Se `!deveBuscar(termo)`, zerar o resultado e sair sem agendar nada. Caso contrário, agendar um `setTimeout` de ~200ms que chama `startTransition(async () => { setResultado(await buscarGlobal(termo)) })`; o cleanup do efeito faz `clearTimeout`. Sem biblioteca. Se o React Compiler reclamar de `react-hooks/set-state-in-effect`, suprimir com `eslint-disable-next-line` acompanhado de comentário explicando o motivo — mesmo padrão já aceito em `tour-guiado.tsx`, `theme-toggle.tsx` e `lead-timeline-dialog.tsx`.

    **Diálogo:** `<CommandDialog open={open} onOpenChange={(aberto) => setOpen(aberto)}>` com, por dentro, um `<Command shouldFilter={false}>` (se a Task 2 confirmou que o `CommandDialog` não embrulha) contendo `<CommandInput>` (controlado por `value={termo}` / `onValueChange={setTermo}`, `placeholder="Buscar leads, campanhas e nichos..."`) e um `<CommandList>`. **`shouldFilter={false}` é obrigatório** — o `cmdk` filtra a lista por conta própria por padrão, e como a filtragem já aconteceu no servidor, deixar o filtro interno ligado faria resultados válidos sumirem da tela.

    Dentro do `<CommandList>`: um `<CommandEmpty>` com mensagem própria e três `<CommandGroup heading="Leads" | "Campanhas" | "Nichos">`, cada um renderizado SOMENTE se o array correspondente tiver itens (grupo vazio não deve virar um cabeçalho órfão). Cada `<CommandItem>` precisa de um `value` único — usar `` `lead-${id}` ``, `` `campanha-${id}` ``, `` `nicho-${id}` `` — e um `onSelect` que fecha o diálogo, limpa o termo e chama `router.push` (`useRouter` de `next/navigation`) para:
    - lead → `` `/leads?busca=${encodeURIComponent(lead.nome)}` `` (destino criado na Task 3)
    - campanha → `` `/campanhas/${campanha.id}` ``
    - nicho → `/nichos`
    Conteúdo de cada item: lead mostra o nome em destaque e o telefone em `text-muted-foreground`; campanha mostra o nome do nicho e a oferta truncada; nicho mostra só o nome. Enquanto `isPending` e o termo for buscável, mostrar um texto discreto de "Buscando..." — nunca deixar a lista parecer "sem resultado" durante a ida ao servidor.

    **Parte B — o botão-gatilho (D-06)**, renderizado pelo MESMO componente, acima do diálogo: um `<button type="button">` de largura total que chama `setOpen(true)`, com o ícone `Search` do `lucide-react` (tamanho `h-[18px] w-[18px] shrink-0`, igual aos ícones de nav da sidebar), o texto "Buscar..." e um `<kbd>` com a dica do atalho. **Só tokens existentes** (`text-muted-foreground`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `border-sidebar-border`, `ring-ring`, ...) — os `--color-sidebar-*` estão definidos em `:root` e em `.dark`, então claro/escuro sai de graça (D-07). Reusar o mesmo arredondamento e o mesmo `px-[14px] py-2.5` dos links de nav para o gatilho não destoar. `aria-label` explícito no botão ("Abrir busca global").
    O texto do `<kbd>` é **estático**, "Ctrl K" — detectar Mac exigiria ler `navigator` só no cliente e um guard de montagem para não quebrar hidratação, o que não paga o ganho num CRM que roda em navegador de desktop Windows (CLAUDE.md). O atalho Cmd+K continua FUNCIONANDO no Mac (D-05), só não é o que a dica exibe. Registrar como decisão D-PZC-02 no SUMMARY.

    **Parte C — montar em `src/components/app-sidebar.tsx`** (DESVIO-1): importar `BuscaGlobal` e renderizar `<div className="px-[14px] pb-1"><BuscaGlobal /></div>` ENTRE o bloco da marca (`<div className="flex items-center gap-3 px-4 pt-5 pb-6">…</div>`) e a `<nav>`. Se necessário, reduzir o `pb-6` da marca para acomodar o gatilho sem espremer o primeiro rótulo de grupo — é o ÚNICO ajuste permitido no markup existente.
    **D-09 é inegociável:** não tocar em `NAV_GROUPS`, não tocar nos `tourId`, não tocar nos `data-tour`, não renomear grupo nenhum, não mover item nenhum. `npm run verify:sidebar` é o sensor mecânico disso e precisa continuar saindo 0.
  </action>
  <acceptance_criteria>
    - `grep -c 'addEventListener("keydown"' src/components/busca-global.tsx` retorna 1 e `grep -c 'removeEventListener' src/components/busca-global.tsx` retorna 1 (listener removido no cleanup).
    - `grep -c 'preventDefault' src/components/busca-global.tsx` ≥ 1 e `grep -c 'metaKey' src/components/busca-global.tsx` ≥ 1 (Cmd+K do Mac coberto).
    - `grep -c 'shouldFilter={false}' src/components/busca-global.tsx` retorna 1 — o filtro interno do cmdk está desligado.
    - `grep -c 'setTimeout\|clearTimeout' src/components/busca-global.tsx` ≥ 2 — debounce manual, sem biblioteca.
    - `grep -c 'heading="Leads"\|heading="Campanhas"\|heading="Nichos"' src/components/busca-global.tsx` retorna 3.
    - `grep -c '/leads?busca=\|/campanhas/\|"/nichos"' src/components/busca-global.tsx` ≥ 3 — os três destinos de navegação existem.
    - `grep -c '<BuscaGlobal' src/components/app-sidebar.tsx` retorna 1.
    - `grep -c 'data-tour=' src/components/app-sidebar.tsx` retorna 1 e `grep -c 'tourId:' src/components/app-sidebar.tsx` retorna 5 — os alvos do tour sobreviveram (D-09).
    - `npm run verify:sidebar` sai 0 — os 12 hrefs, os 4 grupos e os 5 seletores do tour continuam intactos.
    - `npm run verify:brand` sai 0 — zero cor hardcoded no componente novo.
    - `npx tsc --noEmit` sai 0 e `npm run lint` sai 0.
    - `npm run build` sai 0 (rodar isolado — host de 4GB, precedente das Fases 18-20).
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit && npm run lint && npm run verify:brand && npm run verify:sidebar</automated>
    <human-check>
      Com `npm run dev` rodando, em tema CLARO e depois em tema ESCURO:
      1. Em `/` apertar Ctrl+K → o diálogo abre com o campo focado e o navegador NÃO abre a barra de busca/bookmark dele.
      2. Apertar Esc → fecha. Clicar no gatilho "Buscar..." da sidebar → abre o mesmo diálogo.
      3. Digitar 1 letra → nada é buscado (gate de 2 caracteres). Digitar 2+ letras de um lead real → ele aparece sob o grupo "Leads".
      4. Digitar os dígitos de um telefone gravado formatado (ex.: `11987` para `(11) 98765-4321`) → o lead aparece.
      5. Digitar o nome de um nicho que tem campanha → aparecem os grupos "Campanhas" e "Nichos".
      6. Selecionar um lead → cai em `/leads` já filtrado por aquele nome. Selecionar uma campanha → cai em `/campanhas/{id}`. Selecionar um nicho → cai em `/nichos`.
      7. Digitar um termo sem resultado (ex.: `zzzzz`) → mensagem de vazio, sem erro no console.
      8. Repetir os passos 1, 3 e 6 a partir de `/pipeline` e `/relatorios` — o atalho tem que funcionar de qualquer tela.
      9. Conferir que a sidebar continua com os 4 grupos rotulados e os 12 itens na mesma ordem de antes.
    </human-check>
  </verify>
  <done>Ctrl+K/Cmd+K abre a busca de qualquer tela; o gatilho da sidebar abre o mesmo diálogo; os 3 grupos aparecem com até 5 itens e navegam para o destino certo; claro e escuro ok; `verify:sidebar` e `verify:brand` verdes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| registro npm → node_modules | `cmdk` + 4 dependências transitivas do Radix entram na árvore de build a partir de um registro público — única superfície de confiança realmente nova |
| campo de busca (cliente) → Server Action → SQLite | Texto arbitrário do usuário atravessa a fronteira de rede e vira predicado `LIKE` em três consultas |
| URL (`/leads?busca=`) → filtro da tabela | Valor controlável pelo usuário na barra de endereços vira valor de filtro de coluna do TanStack Table |
| banco → DOM do diálogo | Nome e telefone de lead (PII) passam a ser renderizados numa superfície nova |

Fora de escopo: nenhuma rota de API nova, nenhuma coluna/tabela nova, nenhuma escrita no banco — `buscarGlobal` é estritamente leitura.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-PZC-SC | Tampering | `npm install cmdk` (cadeia de suprimentos) | mitigate | `slopcheck` indisponível neste host (sem `pip`) → pacote entra como `[ASSUMED]`; Task 1 é `checkpoint:human-verify` BLOQUEANTE e não auto-aprovável (ignora `mode: yolo`/`auto_advance`), com verificação manual em npmjs.com + GitHub e ciência explícita das 4 transitivas do Radix; versão pinada exata `1.1.1`, mesmo idioma dos pins de `react-joyride`/`ai`/`@ai-sdk/anthropic` |
| T-PZC-01 | Tampering (injeção de SQL / de curinga) | `src/actions/busca-actions.ts` | mitigate | O termo entra SEMPRE como valor interpolado no template `sql` do Drizzle (parâmetro bindado), NUNCA por concatenação de string. Além disso `escaparLike` neutraliza `%`, `_` e `\` digitados, com `ESCAPE '\'` obrigatório em todo `LIKE` — sem isso, um `%` digitado viraria curinga e um `_` casaria qualquer caractere. Coberto por asserção de harness (`padraoContem("50%") === "%50\\%%"`) e por `grep -c ESCAPE` ≥ 3 nas acceptance criteria da Task 3 |
| T-PZC-02 | Denial of Service | `buscarGlobal` chamada a cada digitação | mitigate | Três camadas: gate de tamanho mínimo (termo < 2 caracteres nem chega no banco), debounce manual de ~200ms no cliente, e `LIMIT 5` por grupo. As três consultas batem em colunas de tabelas pequenas (CRM solo, milhares de linhas) e o `escaparLike` impede que um `%` solto force varredura ampla |
| T-PZC-03 | Information Disclosure | resultados (nome + telefone de lead) no DOM | accept | Ferramenta solo, sem multiusuário e sem autenticação por design (CLAUDE.md). Os mesmos campos já são exibidos em `/leads` e `/pipeline` para o mesmo e único usuário; nenhum dado novo é exposto e nada sai do app (sem telemetria, sem rede externa). Risco aceito |
| T-PZC-04 | Tampering | `?busca=` na URL → `columnFilters` da `LeadTable` | mitigate | O valor é usado exclusivamente como string de comparação do `filterFn` default (`includesString`) de uma coluna, nunca como HTML, nunca como seletor de DOM, nunca em `dangerouslySetInnerHTML`. React escapa a renderização. Valor ausente/array é normalizado pelo helper `primeiro()` antes de ser usado, mesmo idioma já provado em `/relatorios` (IN-04) |
</threat_model>

<verification>
Antes de declarar o plano completo, com o host livre de outros processos pesados (4GB de RAM — precedente das Fases 18-20, rodar o build isolado):

1. `npm ls cmdk` → `cmdk@1.1.1`, sem `UNMET`/`invalid`
2. `npm run test:busca-global` → sai 0, ≥15 asserções `OK`
3. `npx tsc --noEmit` → sai 0
4. `npm run lint` → sai 0
5. `npm run verify:brand` → sai 0
6. `npm run verify:sidebar` → sai 0
7. `npm run verify:schema` → sai 0 (prova mecânica de D-08: zero mudança de schema)
8. `npm run guard:no-hard-delete` → sai 0
9. `npm run build` → sai 0 (rodar sozinho)
10. Roteiro humano do `<human-check>` da Task 4 percorrido em claro E escuro
11. SUMMARY contém: prova de mutação do harness, a resposta sobre o embrulho `<Command>` do `CommandDialog`, e as decisões D-PZC-01 (header sr-only movido para dentro do `DialogContent`) e D-PZC-02 (dica de atalho estática "Ctrl K")
</verification>

<success_criteria>
- Ctrl+K e Cmd+K abrem a busca de QUALQUER tela, com `preventDefault` impedindo o atalho nativo do navegador, e sem conflitar com nenhum outro listener (não existe outro em `src/`)
- Um gatilho "Buscar..." com dica de atalho existe no topo da sidebar e abre o MESMO diálogo — sem Context novo, sem provider novo, sem `layout.tsx` modificado
- A busca encontra lead por nome E por telefone (inclusive digitando só os dígitos de um número gravado formatado), campanha por nicho e por oferta, e nicho por nome
- Soft-deletados nunca aparecem, em nenhum dos três grupos
- Resultados vêm agrupados em até 3 seções rotuladas, no máximo 5 por grupo, e cada item leva ao destino real: `/leads?busca=<nome>`, `/campanhas/{id}`, `/nichos`
- `%` e `_` digitados pelo usuário são tratados como texto literal, não como curinga de SQL — provado por harness automatizado
- Claro e escuro funcionam só com tokens existentes; `verify:brand` sai 0
- `data-tour` e a estrutura de 4 grupos/12 itens da sidebar sobrevivem intactos; `verify:sidebar` sai 0
- Zero coluna, zero tabela, zero migração; `verify:schema` sai 0
- Gates verdes: `test:busca-global`, `tsc --noEmit`, `lint`, `verify:brand`, `verify:sidebar`, `verify:schema`, `guard:no-hard-delete`, `build`
</success_criteria>

<output>
Create `.planning/quick/260912-pzc-adicionar-busca-global-ctrl-k-no-topo-do/260912-pzc-SUMMARY.md` when done
</output>
