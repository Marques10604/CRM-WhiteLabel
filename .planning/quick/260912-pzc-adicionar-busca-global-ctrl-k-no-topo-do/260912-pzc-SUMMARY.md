---
phase: quick-260912-pzc
plan: 01
subsystem: ui
tags: [cmdk, command-palette, drizzle, sqlite, next-server-actions, react, tanstack-table]

requires: []
provides:
  - "Busca global (paleta de comandos) aberta por Ctrl+K/Cmd+K ou por gatilho na sidebar"
  - "Server Action buscarGlobal(termo) com 3 consultas soft-delete-aware (leads/campanhas/nichos)"
  - "Deep-link /leads?busca=<nome> semeando o filtro da coluna nome da LeadTable"
affects: [leads, campanhas, nichos, app-sidebar]

tech-stack:
  added: ["cmdk@1.1.1"]
  patterns:
    - "Primitivo ui/command.tsx adaptado do registro shadcn base-nova para os aliases reais do projeto (@/lib/utils, @/components/ui/dialog, @/components/ui/input-group)"
    - "Debounce manual via setTimeout/clearTimeout em useEffect, sem biblioteca (D-04)"
    - "Módulo puro (src/lib/busca-global.ts) + harness .cjs, mesmo molde de src/lib/lead-csv-export.ts"

key-files:
  created:
    - src/components/ui/command.tsx
    - src/lib/busca-global.ts
    - scripts/test-busca-global.cjs
    - src/actions/busca-actions.ts
    - src/components/busca-global.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/leads/page.tsx
    - src/components/lead-table.tsx
    - src/components/app-sidebar.tsx

key-decisions:
  - "Task 1 (portão de legitimidade do pacote cmdk) já foi aprovada explicitamente pelo usuário na conversa principal antes desta execução — confirmado por leitura direta de package.json/node_modules antes de iniciar a Task 2, sem reabrir o checkpoint"
  - "D-PZC-01: DialogHeader sr-only movido para DENTRO do DialogContent (o registro original coloca como irmão, pensado para o Dialog do Radix; o Base UI deste projeto não portaliza irmãos do Popup)"
  - "D-PZC-02: dica de atalho no gatilho da sidebar é estática 'Ctrl K' (o atalho Cmd+K continua funcionando no Mac, só a dica visual não detecta o SO)"
  - "CommandDialog do registro NÃO embrulha os filhos num <Command> — confirmado no arquivo real gerado; o componente cliente (Task 4) renderiza <Command shouldFilter={false}> explicitamente"

patterns-established:
  - "Módulo puro + harness .cjs para lógica de normalização/escape testável sem DOM/banco"
  - "IconPlaceholder do registro shadcn sempre trocado por ícone real de lucide-react (SearchIcon/CheckIcon), nunca deixado sem substituto"

requirements-completed: [BUSCA-01, BUSCA-02, BUSCA-03, BUSCA-04, BUSCA-05, BUSCA-06]

duration: 45min
completed: 2026-09-12
---

# Quick Task 260912-pzc: Busca Global (Ctrl+K) Summary

**Paleta de comandos cmdk aberta por Ctrl+K/Cmd+K ou gatilho na sidebar, buscando leads/campanhas/nichos via Server Action única com LIKE escapado, soft-delete-aware, e deep-link `/leads?busca=` que fecha a ponta da navegação de lead.**

## Performance

- **Duration:** ~45 min (Tasks 2-4; Task 1 já fechada em sessão anterior)
- **Tasks:** 3 (Task 1 já concluída antes desta execução)
- **Files modified/created:** 10

## Portão da Task 1 (pré-condição desta execução)

A Task 1 (`checkpoint:human-verify`, gate="blocking-human", portão de legitimidade do pacote `cmdk`) **já havia sido aprovada explicitamente pelo usuário na conversa principal** antes desta sessão de execução. Confirmado por verificação direta antes de iniciar a Task 2:
- `package.json`: linha `"cmdk": "1.1.1"` (pin exato, sem `^`/`~`)
- `node_modules/cmdk/package.json`: `"version": "1.1.1"`
- `npm ls cmdk` → `cmdk@1.1.1`, sem `UNMET`/`invalid`

Esta execução não reabriu o checkpoint — começou direto pela Task 2, conforme instrução recebida.

## Accomplishments
- `cmdk@1.1.1` pinado e instalado; `ui/command.tsx` criado a partir do registro `base-nova`, adaptado aos aliases reais do projeto
- Módulo puro `src/lib/busca-global.ts` (normalização, gate de tamanho mínimo, escape de curinga LIKE, extração de dígitos) coberto por 19 asserções em `scripts/test-busca-global.cjs`, com prova de mutação
- Server Action `buscarGlobal(termo)` consultando leads/campanhas/nichos num único `Promise.all`, soft-delete-aware, limitada a 5 por grupo, nunca lança
- `/leads?busca=<nome>` fecha o DESVIO-2: selecionar um lead na busca cai numa lista já filtrada, não numa tabela paginada vazia de contexto
- Componente cliente `BuscaGlobal` (atalho global + gatilho na sidebar + diálogo), montado dentro de `AppSidebar` sem tocar `layout.tsx`

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 2: Instalar cmdk, criar ui/command.tsx e módulo puro de busca + harness** - `2721959` (feat)
2. **Task 3: Server Action buscarGlobal + destino real da seleção de lead** - `bc58cde` (feat)
3. **Task 4: Componente cliente da busca (atalho + diálogo + gatilho na sidebar)** - `fde6043` (feat)

_Nota: nenhum commit de plano/metadados incluído aqui — o orquestrador cuida do commit de docs separadamente (SUMMARY.md/STATE.md não commitados por este executor, per constraint)._

## Files Created/Modified
- `src/components/ui/command.tsx` - Primitivo Command (shadcn base-nova) adaptado: `cn` de `@/lib/utils`, dialog/input-group dos aliases reais, `IconPlaceholder` trocado por `SearchIcon`/`CheckIcon` do lucide-react, header sr-only movido para dentro do `DialogContent` (D-PZC-01)
- `src/lib/busca-global.ts` - Módulo puro: `TAMANHO_MINIMO_BUSCA`, `LIMITE_POR_GRUPO`, `normalizarTermo`, `deveBuscar`, `escaparLike`, `padraoContem`, `somenteDigitos`, `deveBuscarPorTelefone`
- `scripts/test-busca-global.cjs` - Harness Node puro, 19 asserções, sem DOM/banco
- `src/actions/busca-actions.ts` - `buscarGlobal(termo)`: 3 consultas (`leads` por nome+telefone, `campanhas` por nicho+oferta, `nichos` por nome), todas com `isNull(deletedAt)` + `LIKE ... ESCAPE '\'`
- `src/components/busca-global.tsx` - Componente cliente: listener `keydown` global, debounce manual, `CommandDialog`/`Command shouldFilter={false}`, 3 grupos condicionais, navegação
- `src/components/app-sidebar.tsx` - Monta `<BuscaGlobal />` entre a marca e a `<nav>` (ajuste de `pb-6`→`pb-4` na marca para acomodar o gatilho); D-09 preservado (verify:sidebar OK)
- `src/app/leads/page.tsx` - Recebe `searchParams`, normaliza `busca` via helper `primeiro()` (mesmo idioma de `/relatorios`), repassa `buscaInicial`
- `src/components/lead-table.tsx` - Prop opcional `buscaInicial?: string` semeando o `columnFilters` inicial da coluna `nome`
- `package.json`/`package-lock.json` - Pin `cmdk@1.1.1` + script `test:busca-global`

## Decisions Made

- **D-PZC-01** (registrada no plano, aplicada): `<DialogHeader className="sr-only">` movido para DENTRO de `<DialogContent>` como primeiro filho, porque o Base UI deste projeto não portaliza um irmão do `Dialog.Popup` junto com ele — diferente do Dialog do Radix que o registro original do shadcn assume.
- **D-PZC-02** (registrada no plano, aplicada): a dica `<kbd>` do gatilho mostra sempre "Ctrl K" (texto estático). O atalho `Cmd+K` continua funcionando no Mac via `event.metaKey` — só a dica visual não detecta o SO, decisão aceita por não valer o custo de um guard de montagem client-only num CRM que roda em desktop Windows.
- **Resposta à pergunta da Task 2** (confirmada no arquivo real gerado): o `CommandDialog` do registro `base-nova` **NÃO embrulha os filhos num `<Command>`** — ele só renderiza `<DialogContent>{children}</DialogContent>`. Por isso `busca-global.tsx` renderiza `<Command shouldFilter={false}>` explicitamente dentro do `CommandDialog`.

## Prova de mutação (Task 2, `escaparLike`)

Ordem original (`\` → `%` → `_`): `npm run test:busca-global` → exit 0, 19 `OK`.

Ordem invertida temporariamente (`%` → `\` → `_`, aplicada e revertida na mesma ação, nunca deixada em disco): `npm run test:busca-global` → exit 1, 3 `FAIL` (as 3 asserções que dependem da ordem correta do escape: `escaparLike("100%")`, `escaparLike("%\_")`, `padraoContem("50%")`).

Restaurado à ordem original em seguida: exit 0 novamente, 19 `OK`. Prova de que o harness realmente detecta a regressão de ordem de escape (T-PZC-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npx shadcn add command` tentou sobrescrever `button.tsx` e instalou o pacote `cn` indesejado**
- **Found during:** Task 2, Parte B (tentativa da CLI antes do caminho manual)
- **Issue:** A CLI do shadcn, ao instalar as dependências registradas do item `command` (que lista `cn` e `cmdk`), instalou o pacote `cn` no `package.json`/`package-lock.json` e parou num prompt interativo "The file button.tsx already exists. Would you like to overwrite?" — risco real de sobrescrever um componente já customizado do projeto sem confirmação.
- **Fix:** Abortado o fluxo interativo (nenhum arquivo foi sobrescrito, confirmado por `ls`/`git status`), removido o pacote `cn` com `npm uninstall cn` (operação de remoção, não instalação de pacote novo — fora do escopo do portão de legitimidade), e seguido o caminho manual descrito no próprio plano como fallback: baixar `https://ui.shadcn.com/r/styles/base-nova/command.json` e escrever `ui/command.tsx` à mão com as 4 adaptações de import exigidas.
- **Files modified:** `package.json`, `package-lock.json` (revertidos ao estado com só `cmdk`, sem `cn`)
- **Verification:** `git diff package.json` mostrou só a linha `"cmdk": "1.1.1"` a mais em relação ao HEAD anterior; `button.tsx` permaneceu intocado
- **Committed in:** `2721959` (Task 2 commit — o `package.json` final já reflete o estado limpo, sem `cn`)

**2. [Rule 1 - Bug] Comentário JSDoc quebrava o próprio grep de pureza do módulo**
- **Found during:** Task 2, verificação das acceptance criteria
- **Issue:** O cabeçalho JSDoc de `src/lib/busca-global.ts` mencionava a palavra "drizzle" em prosa ("Zero DOM, zero React, zero drizzle..."), o que fazia `grep -c 'window\.\|document\.\|drizzle' src/lib/busca-global.ts` retornar 1 em vez do 0 exigido pela acceptance criteria (falso positivo — o comentário não é código, mas o grep literal não distingue).
- **Fix:** Reescrita a frase para "zero ORM" em vez de "zero drizzle", preservando o mesmo significado sem colidir com o grep.
- **Files modified:** `src/lib/busca-global.ts`
- **Verification:** `grep -c 'window\.\|document\.\|drizzle' src/lib/busca-global.ts` → 0
- **Committed in:** `2721959` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking/cadeia-de-suprimentos, 1 bug de auto-verificação)
**Impact on plan:** Nenhum scope creep. O desvio 1 evitou um risco real (sobrescrita silenciosa de `button.tsx` + pacote extra não revisado); o desvio 2 é cosmético (comentário), sem efeito em runtime.

## TDD Gate Compliance

A Task 2 tinha `tdd="true"` com um bloco `<behavior>` de 15 comportamentos esperados. O fluxo executado **não seguiu a disciplina RED→GREEN** de commits separados: o módulo puro (`src/lib/busca-global.ts`) e o harness (`scripts/test-busca-global.cjs`) foram escritos e verificados juntos (harness passando de primeira, sem uma fase de teste-falhando-antes-da-implementação com commit próprio) e commitados num único commit `feat` (`2721959`).

- Não existe commit `test(quick-260912-pzc): ...` isolado antes do `feat`.
- A prova de mutação (seção acima) cumpre o ESPÍRITO da garantia TDD — confirma que o harness detecta regressão real —, mas não substitui o gate RED formal de "escrever o teste primeiro e vê-lo falhar contra código ainda inexistente".
- **Aviso registrado, não bloqueante:** módulo e harness estão corretos e cobertos (19 asserções, mutação provada), mas o histórico de commits desta task não reflete a sequência RED/GREEN exigida pelo template de execução.

## Known Stubs

Nenhum stub encontrado. `buscarGlobal` está totalmente wireado (sem dados mockados), `BuscaGlobal` consome resultado real da Server Action, e `/leads?busca=` semeia o filtro real da `LeadTable`.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As 4 fronteiras de confiança documentadas (registro npm → node_modules, campo de busca → Server Action → SQLite, URL `?busca=` → filtro de tabela, banco → DOM do diálogo) cobrem integralmente o que foi implementado.

## Issues Encountered

- Tentativa de subir um segundo dev server (porta 3971) para smoke-test em runtime falhou porque já havia um `next dev` rodando na porta 3000 (PID pré-existente, fora desta sessão). Resolvido usando o servidor já ativo na porta 3000 para o smoke-test via `curl` — o Turbopack já recompilou via HMR e confirmou `GET /leads` e `GET /leads?busca=...` retornando 200, sem overlay de erro, e o gatilho "Buscar..." renderizado em `/`.
- O roteiro humano completo do `<human-check>` da Task 4 (percorrer Ctrl+K/Cmd+K, digitação, seleção de resultado, claro/escuro, em várias telas) **não foi executado por este executor** — exige interação real de navegador (clique, digitação, troca de tema) que não está disponível nesta sessão autônoma. Task 4 é `type="auto"`, não `checkpoint:human-verify`, então a execução não parou para isso; mas o roteiro completo do passo 10 da seção `<verification>` do plano fica como **UAT humano pendente**, mesmo padrão já registrado em STATE.md para builds/UI anteriores (ex.: Fase 10-04, Fase 23 UAT).
- Acceptance criteria de `app-sidebar.tsx` esperava `grep -c 'data-tour=' src/components/app-sidebar.tsx` == 1, mas o arquivo (pré-existente, não alterado por esta task nesse trecho) já tinha um comentário de doc-string na linha 27 mencionando `[data-tour="nav-*"]`, totalizando 2 ocorrências. Confirmado por `git diff` que este comentário já existia antes de qualquer edição desta execução — não é uma regressão introduzida aqui. O gate mecânico real (`npm run verify:sidebar`) é a fonte de verdade e passou: "5 tourIds cruzados com tour-steps.ts, 12 hrefs íntegros, 4 grupos presentes, rodapé/marca preservados".

## User Setup Required

None - nenhuma configuração de serviço externo necessária. `cmdk` é dependência local, sem chave de API nem variável de ambiente.

## Human Verification — Concluída

Orquestrador conectou o navegador (Claude in Chrome) contra `npm run dev` real e executou o roteiro humano pendente:

1. **Diálogo abre e fecha corretamente:** clique no gatilho da sidebar e `Escape` verificados via inspeção direta do DOM (`role="dialog"`, atributo `data-open` do Base UI) — confirmado que o Portal monta/desmonta como esperado (D-PZC-01 funciona).
2. **Atalho de teclado Ctrl+K:** a tentativa inicial via ferramenta de automação (tecla sintética) não abriu o diálogo — investigado disparando um `KeyboardEvent` real (`ctrlKey:true, key:'k'`) direto na página, que abriu o diálogo e confirmou `defaultPrevented:true`. Conclusão: o listener `window.addEventListener("keydown", ...)` de `busca-global.tsx` está correto; a falha inicial foi um artefato da ferramenta de automação (provável interceptação do atalho pelo próprio Chrome antes de chegar à página), consistente com a instabilidade de CDP já registrada nesta sessão — **não é um bug do app**.
3. **BUG REAL encontrado e corrigido:** digitar 2+ caracteres (`"nu"`) na busca derrubava a Server Action com `SqliteError: ESCAPE expression must be a single character` (`POST / 500`, visível no log do `next dev` e na página de erro do Next). Causa raiz: em `sql\`... LIKE ${padrao} ESCAPE '\'\`` (dentro de `src/actions/busca-actions.ts`), o backslash era consumido pela própria sintaxe de escape do template literal do JavaScript — `` `ESCAPE '\'` `` avalia em runtime para a string `"ESCAPE ''"` (vazia), não `"ESCAPE '\'"` (um caractere), confirmado isolando o teste em Node puro. Corrigido para `ESCAPE '\\'` (backslash duplo no source) nas 4 cláusulas `LIKE` (leads.nome, nichos.nome×2, campanhas.oferta) — commit `8099ad8`.
4. **Busca funcionando após a correção:** reload da página, Ctrl+K real + digitação de `"nu"` retornou resultados reais (`Campanhas: "nutricionista / Diagnóstico de teste UAT..."`, `Nichos: "nutricionista"`), sem erro de servidor. Log do `next dev` confirmou `POST / 200` para `buscarGlobal("nu")`.
5. **Gate de tamanho mínimo:** digitar 1 caractere (`"a"`) mostrou corretamente "Digite ao menos 2 caracteres para buscar." sem tocar o servidor.
6. **Não testado nesta passada:** clique num resultado navegando para `/leads?busca=`/`/campanhas/{id}` (comportamento de `fecharEIrPara`, código simples e já revisado, risco baixo); tema claro (só tema escuro testado, mesmo padrão de risco baixo já aceito nas quick tasks anteriores desta sessão, já que os componentes reusam tokens `--status-*`/`--popover-*` cobertos por `verify:brand`).

Nenhum dado real afetado — a busca usa apenas dados já existentes (campanha/nicho de teste "nutricionista"), nenhuma escrita no banco.

## Next Phase Readiness

Gates automatizados todos verdes: `npm ls cmdk`, `npm run test:busca-global` (19 OK), `npx tsc --noEmit`, `npm run lint` (0 erros, 4 warnings pré-existentes não relacionados), `npm run verify:brand`, `npm run verify:sidebar`, `npm run verify:schema`, `npm run guard:no-hard-delete`, `npm run build` (15 rotas, `/leads` agora dinâmica por `searchParams`).

Roteiro humano de UAT concluído (item 3 acima corrigiu o único bug real encontrado nesta sessão). Pendente não bloqueante: tema claro e clique de navegação em resultado (baixo risco, ver item 6 acima).

## Self-Check: PASSED

Todos os 9 arquivos-chave verificados como presentes em disco (`FOUND`) e todos os 3 hashes de commit (`2721959`, `bc58cde`, `fde6043`) confirmados em `git log --oneline --all`.

---
*Quick task: 260912-pzc*
*Completed: 2026-09-12*
